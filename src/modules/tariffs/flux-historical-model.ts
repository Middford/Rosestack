// ============================================================
// Historical Flux Revenue Model — Database-driven
//
// Runs against actual Octopus Flux band rates from the DB.
// NOT a synthetic model — uses real quarterly-changing rates.
//
// The flux_rates table has 4 bands per day:
//   Off-peak (02:00-05:00 UK): cheapest import, lowest export
//   Day      (05:00-16:00 + 19:00-02:00 UK): mid-tier
//   Peak     (16:00-19:00 UK): highest — this is where arbitrage happens
//   Evening  (19:00-02:00 UK): same as day rate
//
// Strategy: identical to the fixed Flux model but with actual rates
// that change over time (quarterly updates from Octopus).
// ============================================================

// --- Solar model (same calibration as Agile/IOF — Lancashire 900 kWh/kWp/yr) ---
const SOLAR_PER_25KWP = [0, 21.8, 36.2, 58.1, 78.8, 90.7, 97.5, 90.7, 76.2, 63.8, 39.9, 22.5, 14.5];

function solarPerSlot(slot: number, month: number, solarKwp: number): number {
  const daily = (SOLAR_PER_25KWP[month] ?? 0) * (solarKwp / 25);
  if (daily <= 0) return 0;
  const dist = Math.abs(slot - 26);
  if (dist > 10) return 0;
  const raw = Math.exp(-0.5 * Math.pow(dist / 5, 2));
  let totalRaw = 0;
  for (let i = 16; i <= 36; i++) {
    const d = Math.abs(i - 26);
    if (d <= 10) totalRaw += Math.exp(-0.5 * Math.pow(d / 5, 2));
  }
  return Math.min(raw * daily / totalRaw, solarKwp * 0.85 * 0.5);
}

function housePerSlot(slot: number, month: number, baseDaily: number, hasHeatPump: boolean): number {
  const basePerSlot = baseDaily / 48;
  let profile: number;
  if (slot < 12) profile = 0.6;
  else if (slot < 18) profile = 2.0;
  else if (slot < 32) profile = 1.0;
  else if (slot < 42) profile = 2.5;
  else profile = 1.0;
  const avgProfile = (12 * 0.6 + 6 * 2.0 + 14 * 1.0 + 10 * 2.5 + 6 * 1.0) / 48;
  let demand = basePerSlot * (profile / avgProfile);
  if (hasHeatPump) {
    const hpAdd = [0, 0.8, 0.8, 0.5, 0.3, 0.1, 0, 0, 0.1, 0.3, 0.5, 0.8, 0.8][month] ?? 0;
    if (slot >= 12 && slot < 18) demand += hpAdd;
    else if (slot >= 32 && slot < 40) demand += hpAdd;
    else demand += hpAdd * 0.3;
  }
  return demand;
}

// --- Types ---

export interface FluxHistoricalConfig {
  batteryCapKwh: number;
  inverterKw: number;
  exportLimitKw: number;
  solarKwp: number;
  efficiency: number;
  houseKwhPerDay: number;
  hasHeatPump: boolean;
  evCount: number;
  evKwhPerDay: number;
}

/** Band rates for a single day from the DB */
export interface FluxDayRates {
  date: string;          // YYYY-MM-DD (UK local)
  month: number;         // 1-12
  offPeakImp: number;    // pence/kWh inc VAT
  offPeakExp: number;
  dayImp: number;
  dayExp: number;
  peakImp: number;
  peakExp: number;
}

export interface FluxHistoricalDayResult {
  date: string;
  dow: string;
  month: number;
  // Rates used this day
  offPeakImp: number;
  dayImp: number;
  peakImp: number;
  offPeakExp: number;
  dayExp: number;
  peakExp: number;
  spread: number;         // peakExp - offPeakImp
  // Dispatch results
  offpeakCharged: number;
  offpeakCost: number;
  solarIn: number;
  topupCost: number;
  peakExported: number;
  peakExpRev: number;
  peakSelfUseVal: number;
  eveSelfUseVal: number;
  nightSelfUseVal: number;
  evCost: number;
  net: number;
  endKwh: number;
  endSoc: number;
}

export interface FluxHistoricalMonthResult {
  month: number;
  label: string;
  days: number;
  offpeakCost: number;
  topupCost: number;
  peakExpRev: number;
  peakSelfUse: number;
  eveSelfUse: number;
  nightSelfUse: number;
  evCost: number;
  solarIn: number;
  net: number;
  dailyAvg: number;
  avgSpread: number;
  avgPeakExp: number;
}

export interface FluxHistoricalResult {
  days: FluxHistoricalDayResult[];
  monthly: FluxHistoricalMonthResult[];
  annual: {
    net: number;
    netGbp: number;
    peakExport: number;
    peakSelfUse: number;
    eveSelfUse: number;
    nightSelfUse: number;
    offpeakCharge: number;
    topup: number;
    ev: number;
    avgDailyPence: number;
    avgDailyGbp: number;
    avgSpread: number;
    totalDays: number;
  };
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getBand(slot: number): 'offpeak' | 'peak' | 'day' {
  if (slot >= 4 && slot < 10) return 'offpeak';  // 02:00-05:00
  if (slot >= 32 && slot < 38) return 'peak';      // 16:00-19:00
  return 'day';                                      // everything else
}

function getImportRate(slot: number, rates: FluxDayRates): number {
  const band = getBand(slot);
  if (band === 'offpeak') return rates.offPeakImp;
  if (band === 'peak') return rates.peakImp;
  return rates.dayImp;
}

function getExportRate(slot: number, rates: FluxDayRates): number {
  const band = getBand(slot);
  if (band === 'offpeak') return rates.offPeakExp;
  if (band === 'peak') return rates.peakExp;
  return rates.dayExp;
}

export function runFluxHistoricalModel(
  config: FluxHistoricalConfig,
  dailyRates: FluxDayRates[],
): FluxHistoricalResult {
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

  const FLOOR = CAP * 0.05; // 5% — your battery, your rules
  const PEAK_SLOTS = 6;
  const DISCHARGE_SLOT = Math.min(inverterKw, exportLimitKw) * 0.5;
  const EV_DAILY = evCount * evKwhPerDay;

  let batKwh = CAP; // start full
  const days: FluxHistoricalDayResult[] = [];

  for (const dayRates of dailyRates) {
    const { date, month } = dayRates;
    const dow = DOW_NAMES[new Date(date + 'T12:00:00Z').getDay()]!;

    let dayOffpkCost = 0, dayTopupCost = 0, dayPeakExpRev = 0, dayPeakSuVal = 0;
    let dayEveSuVal = 0, dayNightSuVal = 0, daySolIn = 0;

    // Predict solar surplus for smart charging
    let predictedSurplus = 0;
    for (let ps = 10; ps < 32; ps++) {
      const pSol = solarPerSlot(ps, month, solarKwp);
      const pDem = housePerSlot(ps, month, houseKwhPerDay, hasHeatPump);
      if (pSol > pDem) predictedSurplus += (pSol - pDem);
    }

    // ── 00:00-02:00: house on battery (day rate band) ──
    for (let s = 0; s < 4; s++) {
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      if (batKwh > FLOOR + dem) {
        batKwh -= dem;
        dayNightSuVal += dem * dayRates.dayImp; // saves day-rate import
      }
    }

    // ── 02:00-05:00: off-peak charge ──
    const offpeakTarget = Math.max(FLOOR, CAP - predictedSurplus);
    let offpeakCharged = 0;
    for (let s = 4; s < 10; s++) {
      const headroom = offpeakTarget - batKwh;
      if (headroom > 0) {
        const maxSlot = inverterKw * 0.5 * EFF;
        const stored = Math.min(maxSlot, headroom);
        dayOffpkCost += (stored / EFF) * dayRates.offPeakImp;
        batKwh += stored;
        offpeakCharged += stored;
      }
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      if (batKwh > FLOOR + dem) {
        batKwh -= dem;
        dayNightSuVal += dem * dayRates.offPeakImp;
      }
    }

    // EV charges at off-peak
    const evCost = EV_DAILY * dayRates.offPeakImp;

    // ── 05:00-16:00: solar → house → battery ──
    for (let s = 10; s < 32; s++) {
      const sol = solarPerSlot(s, month, solarKwp);
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);

      let solRemain = sol, houseRemain = dem;
      if (solRemain > 0 && houseRemain > 0) {
        const s2h = Math.min(solRemain, houseRemain);
        solRemain -= s2h;
        houseRemain -= s2h;
        dayEveSuVal += s2h * dayRates.dayImp;
      }
      if (solRemain > 0) {
        const toStore = Math.min(solRemain, CAP - batKwh);
        batKwh += toStore;
        daySolIn += toStore;
      }
      if (houseRemain > 0 && batKwh > FLOOR + houseRemain) {
        batKwh -= houseRemain;
        dayEveSuVal += houseRemain * dayRates.dayImp;
      }
    }

    // ── 15:00 top-up — only if day-rate charge at peak export is profitable ──
    const dayChargeCostPerKwh = dayRates.dayImp / EFF;
    const dayTopupSpread = dayRates.peakExp - dayChargeCostPerKwh;
    let topupKwh = 0;
    if (batKwh < CAP - 1 && dayTopupSpread > 1.0) {
      const peakNeed = PEAK_SLOTS * DISCHARGE_SLOT + 15;
      const topupNeeded = Math.max(0, peakNeed + FLOOR - batKwh);
      topupKwh = Math.min(topupNeeded, CAP - batKwh);
      dayTopupCost += (topupKwh / EFF) * dayRates.dayImp;
      batKwh += topupKwh;
    }

    // ── 16:00-19:00: PEAK discharge ──
    let peakExported = 0;
    for (let s = 32; s < 38; s++) {
      const avail = batKwh - FLOOR;
      if (avail <= 0) break;

      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      const hKwh = Math.min(dem, avail);
      dayPeakSuVal += hKwh * dayRates.peakImp;
      batKwh -= hKwh;

      const remainAvail = batKwh - FLOOR;
      const expKwh = Math.min(DISCHARGE_SLOT, remainAvail);
      dayPeakExpRev += expKwh * dayRates.peakExp;
      peakExported += expKwh;
      batKwh -= expKwh;
    }

    // ── 19:00-00:00: evening on battery ──
    for (let s = 38; s < 48; s++) {
      const sol = solarPerSlot(s, month, solarKwp);
      if (sol > 0) {
        const toStore = Math.min(sol, CAP - batKwh);
        batKwh += toStore;
      }
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      if (batKwh > FLOOR + dem) {
        batKwh -= dem;
        dayEveSuVal += dem * dayRates.dayImp;
      }
    }

    const netPence = dayPeakExpRev + dayPeakSuVal + dayEveSuVal + dayNightSuVal
      - dayOffpkCost - dayTopupCost - evCost;
    const spread = dayRates.peakExp - dayRates.offPeakImp;

    days.push({
      date, dow, month,
      offPeakImp: dayRates.offPeakImp,
      dayImp: dayRates.dayImp,
      peakImp: dayRates.peakImp,
      offPeakExp: dayRates.offPeakExp,
      dayExp: dayRates.dayExp,
      peakExp: dayRates.peakExp,
      spread: Math.round(spread * 100) / 100,
      offpeakCharged: Math.round(offpeakCharged),
      offpeakCost: Math.round(dayOffpkCost),
      solarIn: Math.round(daySolIn * 10) / 10,
      topupCost: Math.round(dayTopupCost),
      peakExported: Math.round(peakExported),
      peakExpRev: Math.round(dayPeakExpRev),
      peakSelfUseVal: Math.round(dayPeakSuVal),
      eveSelfUseVal: Math.round(dayEveSuVal),
      nightSelfUseVal: Math.round(dayNightSuVal),
      evCost: Math.round(evCost),
      net: Math.round(netPence),
      endKwh: Math.round(batKwh),
      endSoc: Math.round(batKwh / CAP * 100),
    });
  }

  // ── Monthly aggregation ──
  const monthlyAccum: Record<number, {
    offpk: number; topup: number; pExp: number; pSu: number;
    eSu: number; nSu: number; ev: number; sol: number; net: number; d: number;
    spreads: number; peakExps: number;
  }> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyAccum[m] = { offpk: 0, topup: 0, pExp: 0, pSu: 0, eSu: 0, nSu: 0, ev: 0, sol: 0, net: 0, d: 0, spreads: 0, peakExps: 0 };
  }

  for (const d of days) {
    const ma = monthlyAccum[d.month]!;
    ma.offpk += d.offpeakCost;
    ma.topup += d.topupCost;
    ma.pExp += d.peakExpRev;
    ma.pSu += d.peakSelfUseVal;
    ma.eSu += d.eveSelfUseVal;
    ma.nSu += d.nightSelfUseVal;
    ma.ev += d.evCost;
    ma.sol += d.solarIn;
    ma.net += d.net;
    ma.d++;
    ma.spreads += d.spread;
    ma.peakExps += d.peakExp;
  }

  const monthly: FluxHistoricalMonthResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const ma = monthlyAccum[m]!;
    if (ma.d === 0) continue;
    monthly.push({
      month: m,
      label: MONTH_NAMES[m]!,
      days: ma.d,
      offpeakCost: Math.round(ma.offpk),
      topupCost: Math.round(ma.topup),
      peakExpRev: Math.round(ma.pExp),
      peakSelfUse: Math.round(ma.pSu),
      eveSelfUse: Math.round(ma.eSu),
      nightSelfUse: Math.round(ma.nSu),
      evCost: Math.round(ma.ev),
      solarIn: Math.round(ma.sol),
      net: Math.round(ma.net),
      dailyAvg: Math.round(ma.net / ma.d),
      avgSpread: Math.round(ma.spreads / ma.d * 100) / 100,
      avgPeakExp: Math.round(ma.peakExps / ma.d * 100) / 100,
    });
  }

  // Annual
  const aNet = days.reduce((s, d) => s + d.net, 0);
  const aPExp = days.reduce((s, d) => s + d.peakExpRev, 0);
  const aPSu = days.reduce((s, d) => s + d.peakSelfUseVal, 0);
  const aESu = days.reduce((s, d) => s + d.eveSelfUseVal, 0);
  const aNSu = days.reduce((s, d) => s + d.nightSelfUseVal, 0);
  const aOffpk = days.reduce((s, d) => s + d.offpeakCost, 0);
  const aTopup = days.reduce((s, d) => s + d.topupCost, 0);
  const aEv = days.reduce((s, d) => s + d.evCost, 0);
  const aSpread = days.reduce((s, d) => s + d.spread, 0);

  return {
    days,
    monthly,
    annual: {
      net: Math.round(aNet),
      netGbp: Math.round(aNet / 100),
      peakExport: Math.round(aPExp),
      peakSelfUse: Math.round(aPSu),
      eveSelfUse: Math.round(aESu),
      nightSelfUse: Math.round(aNSu),
      offpeakCharge: Math.round(aOffpk),
      topup: Math.round(aTopup),
      ev: Math.round(aEv),
      avgDailyPence: days.length > 0 ? Math.round(aNet / days.length) : 0,
      avgDailyGbp: days.length > 0 ? Math.round(aNet / days.length) / 100 : 0,
      avgSpread: days.length > 0 ? Math.round(aSpread / days.length * 100) / 100 : 0,
      totalDays: days.length,
    },
  };
}
