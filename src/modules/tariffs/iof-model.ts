// ============================================================
// IOF Revenue Model — Pure TypeScript, runs client-side
//
// Simulates 365 days of Intelligent Octopus Flux operation.
// Strategy: always arrive at 16:00 fully charged.
// Off-peak charge reduced by predicted solar surplus.
// Day-rate top-up if needed. Full peak export. House on battery 24/7.
// ============================================================

// --- IOF Rates (import = export at every band) ---
export const IOF_RATES = {
  offPeak: 16.40, // 02:00-05:00
  day: 27.33,     // 05:00-16:00 + 19:00-02:00
  peak: 38.26,    // 16:00-19:00
} as const;

// --- Solar daily kWh for 25kWp, calibrated to 900 kWh/kWp/yr for Lancashire ---
// Scale linearly for other kWp sizes: actual = SOLAR_PER_25KWP[month] * (kWp / 25)
const SOLAR_PER_25KWP = [0, 21.8, 36.2, 58.1, 78.8, 90.7, 97.5, 90.7, 76.2, 63.8, 39.9, 22.5, 14.5];

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Types ---

export interface IofModelConfig {
  batteryCapKwh: number;
  inverterKw: number;
  exportLimitKw: number;
  solarKwp: number;
  efficiency: number;       // 0-1, e.g. 0.93
  houseKwhPerDay: number;   // default 24
  hasHeatPump: boolean;
  evCount: number;          // 0-2
  evKwhPerDay: number;      // per EV, default 15
}

export interface IofDayResult {
  doy: number;
  date: string;
  dow: string;
  month: number;
  batBefore02: number;
  offpeakCharged: number;
  offpeakCost: number;     // pence
  topupKwh: number;
  topupCost: number;       // pence
  solarIn: number;         // kWh into battery
  bat1600: number;         // kWh at start of peak
  exported: number;        // kWh
  exportRev: number;       // pence
  selfUseVal: number;      // pence (peak self-use)
  eveSaved: number;        // pence (evening self-use)
  evCost: number;          // pence
  net: number;             // pence
  endKwh: number;
  endSoc: number;          // %
}

export interface IofMonthResult {
  month: number;
  label: string;
  days: number;
  offpeakCost: number;     // pence
  topupCost: number;
  exportRev: number;
  selfUse: number;         // peak + evening
  evCost: number;
  solarIn: number;         // kWh total
  net: number;             // pence
  dailyAvg: number;        // pence
}

export interface IofModelResult {
  days: IofDayResult[];
  monthly: IofMonthResult[];
  annual: {
    net: number;           // pence
    netGbp: number;
    export: number;
    selfUse: number;
    offpeakCharge: number;
    topup: number;
    ev: number;
    avgDailyPence: number;
    avgDailyGbp: number;
    summerDailyGbp: number; // June avg
    winterDailyGbp: number; // Dec avg
  };
  payback: {
    months: number;
    years: number;
  };
  system: {
    totalCapKwh: number;
    totalInverterKw: number;
    effectiveChargeKw: number;
    exportLimitKw: number;
    maxPeakExportKwh: number;  // per day
    dischargeFloorKwh: number;
    usableKwh: number;
  };
}

// --- Solar per-slot model ---

function solarPerSlot(slot: number, month: number, solarKwp: number): number {
  const dailyFor25 = SOLAR_PER_25KWP[month] ?? 0;
  const daily = dailyFor25 * (solarKwp / 25);
  if (daily <= 0) return 0;
  const dist = Math.abs(slot - 26); // peak at 13:00
  if (dist > 10) return 0;
  const raw = Math.exp(-0.5 * Math.pow(dist / 5, 2));
  let totalRaw = 0;
  for (let i = 16; i <= 36; i++) {
    const d = Math.abs(i - 26);
    if (d <= 10) totalRaw += Math.exp(-0.5 * Math.pow(d / 5, 2));
  }
  return Math.min(raw * daily / totalRaw, solarKwp * 0.85 * 0.5);
}

// --- House demand per slot ---

function housePerSlot(slot: number, month: number, baseDaily: number, hasHeatPump: boolean): number {
  // Scale base demand to match target daily total
  const basePerSlot = baseDaily / 48;
  // Time-of-day profile multiplier
  let profile: number;
  if (slot < 12) profile = 0.6;       // night 00:00-06:00
  else if (slot < 18) profile = 2.0;  // morning 06:00-09:00
  else if (slot < 32) profile = 1.0;  // day 09:00-16:00
  else if (slot < 42) profile = 2.5;  // peak 16:00-21:00
  else profile = 1.0;                 // evening 21:00-00:00

  // Normalise profile so daily total matches baseDaily
  const avgProfile = (12 * 0.6 + 6 * 2.0 + 14 * 1.0 + 10 * 2.5 + 6 * 1.0) / 48;
  let demand = basePerSlot * (profile / avgProfile);

  // Heat pump seasonal addition
  if (hasHeatPump) {
    const hpAdd = [0, 0.8, 0.8, 0.5, 0.3, 0.1, 0, 0, 0.1, 0.3, 0.5, 0.8, 0.8][month] ?? 0;
    if (slot >= 12 && slot < 18) demand += hpAdd;       // morning HP
    else if (slot >= 32 && slot < 40) demand += hpAdd;   // evening HP
    else demand += hpAdd * 0.3;                          // background HP
  }

  return demand;
}

// --- Day-of-year helpers ---

function getMonth(doy: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let m = 1; m <= 12; m++) {
    if (doy <= cum[m]!) return m;
  }
  return 12;
}

function getDate(doy: number): string {
  return new Date(2025, 0, doy).toISOString().slice(0, 10);
}

// --- Main Model ---

export function runIofModel(config: IofModelConfig): IofModelResult {
  const {
    batteryCapKwh: CAP,
    inverterKw,
    exportLimitKw,
    solarKwp,
    efficiency: EFF,
    houseKwhPerDay,
    hasHeatPump,
    evCount,
    evKwhPerDay,
  } = config;

  const FLOOR = CAP * 0.20; // IOF 20% discharge reserve
  const PEAK_SLOTS = 6;     // 16:00-19:00
  const DISCHARGE_SLOT = Math.min(inverterKw, exportLimitKw) * 0.5;
  const MAX_PEAK = PEAK_SLOTS * DISCHARGE_SLOT;
  const EV_DAILY_KWH = evCount * evKwhPerDay;

  const days: IofDayResult[] = [];
  const monthlyAccum: Record<number, { offpk: number; topup: number; exp: number; su: number; ev: number; sol: number; net: number; d: number }> = {};
  for (let m = 1; m <= 12; m++) monthlyAccum[m] = { offpk: 0, topup: 0, exp: 0, su: 0, ev: 0, sol: 0, net: 0, d: 0 };

  // Start fully charged
  let batKwh = CAP;

  for (let doy = 1; doy <= 365; doy++) {
    const month = getMonth(doy);
    const date = getDate(doy);
    const dow = DOW_NAMES[new Date(2025, 0, doy).getDay()]!;

    let dayOffpkCost = 0;
    let dayTopupCost = 0;
    let dayExpRev = 0;
    let daySuVal = 0;
    let dayEveSaved = 0;
    let daySolIn = 0;

    // Predict solar surplus for today
    let predictedSurplus = 0;
    for (let ps = 10; ps < 38; ps++) {
      const pSol = solarPerSlot(ps, month, solarKwp);
      const pDem = housePerSlot(ps, month, houseKwhPerDay, hasHeatPump);
      if (pSol > pDem) predictedSurplus += (pSol - pDem);
    }

    // 00:00-02:00: house on battery
    for (let s = 0; s < 4; s++) {
      batKwh = Math.max(FLOOR, batKwh - housePerSlot(s, month, houseKwhPerDay, hasHeatPump));
    }
    const batBefore02 = Math.round(batKwh);

    // 02:00-05:00: off-peak charge (target: CAP minus predicted solar)
    const offpeakTarget = Math.max(FLOOR, CAP - predictedSurplus);
    let offpeakCharged = 0;
    for (let s = 4; s < 10; s++) {
      const headroom = offpeakTarget - batKwh;
      if (headroom > 0) {
        const maxSlot = inverterKw * 0.5 * EFF;
        const stored = Math.min(maxSlot, headroom);
        dayOffpkCost += (stored / EFF) * IOF_RATES.offPeak;
        batKwh += stored;
        offpeakCharged += stored;
      }
      batKwh = Math.max(FLOOR, batKwh - housePerSlot(s, month, houseKwhPerDay, hasHeatPump));
    }

    // EV cost (charges at off-peak)
    const evCost = EV_DAILY_KWH * IOF_RATES.offPeak;

    // 05:00-16:00: solar powers house, surplus to battery
    for (let s = 10; s < 32; s++) {
      const sol = solarPerSlot(s, month, solarKwp);
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      const net = sol - dem;
      if (net > 0) {
        const toStore = Math.min(net, CAP - batKwh);
        batKwh += toStore;
        daySolIn += toStore;
      } else {
        batKwh = Math.max(FLOOR, batKwh + net);
      }
    }

    // 15:00 top-up at day rate to reach 600kWh
    let topupKwh = 0;
    if (batKwh < CAP - 1) {
      topupKwh = CAP - batKwh;
      dayTopupCost += (topupKwh / EFF) * IOF_RATES.day;
      batKwh = CAP;
    }

    const bat1600 = Math.round(batKwh);

    // 16:00-19:00: peak discharge
    let totalExported = 0;
    let totalSelfUse = 0;
    for (let s = 32; s < 38; s++) {
      const avail = batKwh - FLOOR;
      if (avail <= 0) break;
      const houseDem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      const hKwh = Math.min(houseDem, avail);
      daySuVal += hKwh * IOF_RATES.peak;
      totalSelfUse += hKwh;
      batKwh -= hKwh;
      const remainAvail = batKwh - FLOOR;
      const expKwh = Math.min(DISCHARGE_SLOT, remainAvail);
      dayExpRev += expKwh * IOF_RATES.peak;
      totalExported += expKwh;
      batKwh -= expKwh;
    }

    // 19:00-00:00: evening, house on battery
    for (let s = 38; s < 48; s++) {
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      if (batKwh > FLOOR + dem) {
        batKwh -= dem;
        dayEveSaved += dem * IOF_RATES.day;
      }
    }

    const netPence = dayExpRev + daySuVal + dayEveSaved - dayOffpkCost - dayTopupCost - evCost;

    days.push({
      doy, date, dow, month,
      batBefore02,
      offpeakCharged: Math.round(offpeakCharged),
      offpeakCost: Math.round(dayOffpkCost),
      topupKwh: Math.round(topupKwh),
      topupCost: Math.round(dayTopupCost),
      solarIn: Math.round(daySolIn * 10) / 10,
      bat1600,
      exported: Math.round(totalExported),
      exportRev: Math.round(dayExpRev),
      selfUseVal: Math.round(daySuVal),
      eveSaved: Math.round(dayEveSaved),
      evCost: Math.round(evCost),
      net: Math.round(netPence),
      endKwh: Math.round(batKwh),
      endSoc: Math.round(batKwh / CAP * 100),
    });

    const ma = monthlyAccum[month]!;
    ma.offpk += dayOffpkCost;
    ma.topup += dayTopupCost;
    ma.exp += dayExpRev;
    ma.su += daySuVal + dayEveSaved;
    ma.ev += evCost;
    ma.sol += daySolIn;
    ma.net += netPence;
    ma.d++;
  }

  // Monthly results
  const monthly: IofMonthResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const ma = monthlyAccum[m]!;
    monthly.push({
      month: m,
      label: MONTH_NAMES[m]!,
      days: ma.d,
      offpeakCost: Math.round(ma.offpk),
      topupCost: Math.round(ma.topup),
      exportRev: Math.round(ma.exp),
      selfUse: Math.round(ma.su),
      evCost: Math.round(ma.ev),
      solarIn: Math.round(ma.sol),
      net: Math.round(ma.net),
      dailyAvg: ma.d > 0 ? Math.round(ma.net / ma.d) : 0,
    });
  }

  // Annual
  const aNet = days.reduce((s, d) => s + d.net, 0);
  const aExp = days.reduce((s, d) => s + d.exportRev, 0);
  const aSu = days.reduce((s, d) => s + d.selfUseVal + d.eveSaved, 0);
  const aOffpk = days.reduce((s, d) => s + d.offpeakCost, 0);
  const aTopup = days.reduce((s, d) => s + d.topupCost, 0);
  const aEv = days.reduce((s, d) => s + d.evCost, 0);

  const junMonth = monthly.find(m => m.month === 6);
  const decMonth = monthly.find(m => m.month === 12);

  return {
    days,
    monthly,
    annual: {
      net: Math.round(aNet),
      netGbp: Math.round(aNet / 100),
      export: Math.round(aExp),
      selfUse: Math.round(aSu),
      offpeakCharge: Math.round(aOffpk),
      topup: Math.round(aTopup),
      ev: Math.round(aEv),
      avgDailyPence: Math.round(aNet / 365),
      avgDailyGbp: Math.round(aNet / 365) / 100,
      summerDailyGbp: junMonth ? Math.round(junMonth.dailyAvg) / 100 : 0,
      winterDailyGbp: decMonth ? Math.round(decMonth.dailyAvg) / 100 : 0,
    },
    payback: {
      months: 0, // Calculated by caller with CAPEX
      years: 0,
    },
    system: {
      totalCapKwh: CAP,
      totalInverterKw: inverterKw,
      effectiveChargeKw: Math.min(inverterKw, CAP), // simplified
      exportLimitKw,
      maxPeakExportKwh: MAX_PEAK,
      dischargeFloorKwh: FLOOR,
      usableKwh: CAP - FLOOR,
    },
  };
}
