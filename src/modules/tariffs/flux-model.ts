// ============================================================
// Standard Octopus Flux Revenue Model — Pure TypeScript
//
// Key differences from IOF:
// - YOU control the battery (no Kraken)
// - No mandated reserve — use 100% (we keep 5% for safety)
// - Different import/export rates (not parity)
// - Peak export = peak import at 30.68p
// - Can double-cycle if battery empties during peak
//
// Strategy:
// 1. Off-peak (02:00-05:00): charge at 17.90p
// 2. Daytime: solar powers house, surplus to battery
// 3. Peak (16:00-19:00): discharge at 30.68p export + house at 30.68p saved
// 4. Post-peak: if battery emptied during peak, solar/remaining charge
//    powers house overnight (avoiding 26.80p day-rate import)
// 5. Double-cycle: if battery empties by ~17:30, charge from solar
//    in remaining daylight and discharge to house overnight
// ============================================================

export const FLUX_RATES = {
  offPeakImp: 17.90, offPeakExp: 5.12,   // 02:00-05:00
  dayImp: 26.80,     dayExp: 10.54,       // 05:00-16:00 + 19:00-02:00
  peakImp: 30.68,    peakExp: 30.68,      // 16:00-19:00
} as const;

const SOLAR_PER_25KWP = [0, 21.8, 36.2, 58.1, 78.8, 90.7, 97.5, 90.7, 76.2, 63.8, 39.9, 22.5, 14.5];
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface FluxModelConfig {
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

export interface FluxDayResult {
  doy: number; date: string; dow: string; month: number;
  batBefore02: number;
  offpeakCharged: number; offpeakCost: number;
  solarIn: number;
  bat1600: number;
  peakExported: number; peakExpRev: number;
  peakSelfUseVal: number;
  batAfterPeak: number;
  // Double cycle: post-peak solar recharge + evening self-use
  postPeakSolarIn: number;
  eveSelfUseVal: number;
  nightSelfUseVal: number;
  evCost: number;
  topupCost: number;
  net: number;
  endKwh: number; endSoc: number;
}

export interface FluxMonthResult {
  month: number; label: string; days: number;
  offpeakCost: number; topupCost: number;
  peakExpRev: number; peakSelfUse: number;
  eveSelfUse: number; nightSelfUse: number;
  evCost: number; solarIn: number;
  net: number; dailyAvg: number;
}

export interface FluxModelResult {
  days: FluxDayResult[];
  monthly: FluxMonthResult[];
  annual: {
    net: number; netGbp: number;
    peakExport: number; peakSelfUse: number;
    eveSelfUse: number; nightSelfUse: number;
    offpeakCharge: number; topup: number; ev: number;
    avgDailyPence: number; avgDailyGbp: number;
    summerDailyGbp: number; winterDailyGbp: number;
  };
  payback: { months: number; years: number };
  system: {
    totalCapKwh: number; totalInverterKw: number;
    exportLimitKw: number; maxPeakExportKwh: number;
    usableKwh: number;
  };
}

function solarPerSlot(slot: number, month: number, solarKwp: number): number {
  const daily = (SOLAR_PER_25KWP[month] ?? 0) * (solarKwp / 25);
  if (daily <= 0) return 0;
  const dist = Math.abs(slot - 26);
  if (dist > 10) return 0;
  const raw = Math.exp(-0.5 * Math.pow(dist / 5, 2));
  let totalRaw = 0;
  for (let i = 16; i <= 36; i++) { const d = Math.abs(i - 26); if (d <= 10) totalRaw += Math.exp(-0.5 * Math.pow(d / 5, 2)); }
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

function getBand(slot: number): 'offpeak' | 'peak' | 'day' {
  if (slot >= 4 && slot < 10) return 'offpeak';
  if (slot >= 32 && slot < 38) return 'peak';
  return 'day';
}

function getMonth(doy: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let m = 1; m <= 12; m++) { if (doy <= cum[m]!) return m; }
  return 12;
}

function getDate(doy: number): string {
  return new Date(2025, 0, doy).toISOString().slice(0, 10);
}

export function runFluxModel(config: FluxModelConfig): FluxModelResult {
  const {
    batteryCapKwh: CAP, inverterKw, exportLimitKw, solarKwp,
    efficiency: EFF, houseKwhPerDay, hasHeatPump, evCount, evKwhPerDay,
  } = config;

  const FLOOR = CAP * 0.05; // 5% — YOUR battery, YOUR rules
  const USABLE = CAP - FLOOR;
  const PEAK_SLOTS = 6;
  const DISCHARGE_SLOT = Math.min(inverterKw, exportLimitKw) * 0.5;
  const MAX_PEAK = PEAK_SLOTS * DISCHARGE_SLOT;
  const EV_DAILY = evCount * evKwhPerDay;

  const days: FluxDayResult[] = [];
  const monthlyAccum: Record<number, {
    offpk: number; topup: number; pExp: number; pSu: number;
    eSu: number; nSu: number; ev: number; sol: number; net: number; d: number;
  }> = {};
  for (let m = 1; m <= 12; m++) monthlyAccum[m] = { offpk: 0, topup: 0, pExp: 0, pSu: 0, eSu: 0, nSu: 0, ev: 0, sol: 0, net: 0, d: 0 };

  let batKwh = CAP; // Start full

  for (let doy = 1; doy <= 365; doy++) {
    const month = getMonth(doy);
    const date = getDate(doy);
    const dow = DOW_NAMES[new Date(2025, 0, doy).getDay()]!;

    let dayOffpkCost = 0, dayTopupCost = 0, dayPeakExpRev = 0, dayPeakSuVal = 0;
    let dayEveSuVal = 0, dayNightSuVal = 0, daySolIn = 0, dayPostPeakSol = 0;

    // Predict solar surplus
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
        dayNightSuVal += dem * FLUX_RATES.dayImp; // saves 26.80p
      }
    }
    const batBefore02 = Math.round(batKwh);

    // ── 02:00-05:00: off-peak charge to CAP minus predicted solar ──
    const offpeakTarget = Math.max(FLOOR, CAP - predictedSurplus);
    let offpeakCharged = 0;
    for (let s = 4; s < 10; s++) {
      const headroom = offpeakTarget - batKwh;
      if (headroom > 0) {
        const maxSlot = inverterKw * 0.5 * EFF;
        const stored = Math.min(maxSlot, headroom);
        dayOffpkCost += (stored / EFF) * FLUX_RATES.offPeakImp;
        batKwh += stored;
        offpeakCharged += stored;
      }
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      if (batKwh > FLOOR + dem) {
        batKwh -= dem;
        dayNightSuVal += dem * FLUX_RATES.offPeakImp; // saves 17.90p during off-peak
      }
    }

    // EV charges off-peak
    const evCost = EV_DAILY * FLUX_RATES.offPeakImp;

    // ── 05:00-16:00: solar powers house, surplus to battery ──
    for (let s = 10; s < 32; s++) {
      const sol = solarPerSlot(s, month, solarKwp);
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);

      // Solar → house first
      let solRemain = sol, houseRemain = dem;
      if (solRemain > 0 && houseRemain > 0) {
        const s2h = Math.min(solRemain, houseRemain);
        solRemain -= s2h;
        houseRemain -= s2h;
        dayEveSuVal += s2h * FLUX_RATES.dayImp; // saves 26.80p
      }
      // Solar → battery
      if (solRemain > 0) {
        const toStore = Math.min(solRemain, CAP - batKwh);
        batKwh += toStore;
        daySolIn += toStore;
      }
      // House → battery
      if (houseRemain > 0 && batKwh > FLOOR + houseRemain) {
        batKwh -= houseRemain;
        dayEveSuVal += houseRemain * FLUX_RATES.dayImp;
      }
    }

    // ── 15:00 top-up at day rate — ONLY if profitable to export at peak ──
    // Day charge cost: 26.80/0.93 = 28.82p/kWh stored
    // Peak export: 30.68p → spread = 1.86p minus 1.2p cycle cost = 0.66p margin
    // Marginal — only do it if we need to fill for self-use during peak
    let topupKwh = 0;
    const dayChargeCostPerKwh = FLUX_RATES.dayImp / EFF;
    const dayTopupSpread = FLUX_RATES.peakExp - dayChargeCostPerKwh;
    if (batKwh < CAP - 1 && dayTopupSpread > 1.0) {
      // Only top up enough for peak export + house peak, not full battery
      const peakNeed = MAX_PEAK + 15; // export + house during peak ~15kWh
      const topupNeeded = Math.max(0, peakNeed + FLOOR - batKwh);
      topupKwh = Math.min(topupNeeded, CAP - batKwh);
      dayTopupCost += (topupKwh / EFF) * FLUX_RATES.dayImp;
      batKwh += topupKwh;
    }

    const bat1600 = Math.round(batKwh);

    // ── 16:00-19:00: PEAK discharge at 30.68p ──
    let peakExported = 0, peakSelfUseKwh = 0;
    for (let s = 32; s < 38; s++) {
      const avail = batKwh - FLOOR;
      if (avail <= 0) break;

      // House at peak rate
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      const hKwh = Math.min(dem, avail);
      dayPeakSuVal += hKwh * FLUX_RATES.peakImp;
      peakSelfUseKwh += hKwh;
      batKwh -= hKwh;

      // Export at peak rate (30.68p — same as import!)
      const remainAvail = batKwh - FLOOR;
      const expKwh = Math.min(DISCHARGE_SLOT, remainAvail);
      dayPeakExpRev += expKwh * FLUX_RATES.peakExp;
      peakExported += expKwh;
      batKwh -= expKwh;
    }

    const batAfterPeak = Math.round(batKwh);

    // ── 19:00-00:00: evening + night, house on battery ──
    // Post-peak: any remaining solar (late afternoon in summer) recharges
    let postPeakSolIn = 0;
    for (let s = 38; s < 48; s++) {
      // Late solar (summer evenings, slots 38-36 ≈ 19:00-19:30 might have some)
      const sol = solarPerSlot(s, month, solarKwp);
      if (sol > 0) {
        const toStore = Math.min(sol, CAP - batKwh);
        batKwh += toStore;
        postPeakSolIn += toStore;
      }

      // House from battery
      const dem = housePerSlot(s, month, houseKwhPerDay, hasHeatPump);
      if (batKwh > FLOOR + dem) {
        batKwh -= dem;
        dayEveSuVal += dem * FLUX_RATES.dayImp; // saves 26.80p evening rate
      }
    }

    const netPence = dayPeakExpRev + dayPeakSuVal + dayEveSuVal + dayNightSuVal
      - dayOffpkCost - dayTopupCost - evCost;

    days.push({
      doy, date, dow, month,
      batBefore02,
      offpeakCharged: Math.round(offpeakCharged), offpeakCost: Math.round(dayOffpkCost),
      solarIn: Math.round(daySolIn * 10) / 10,
      bat1600,
      peakExported: Math.round(peakExported), peakExpRev: Math.round(dayPeakExpRev),
      peakSelfUseVal: Math.round(dayPeakSuVal),
      batAfterPeak,
      postPeakSolarIn: Math.round(postPeakSolIn * 10) / 10,
      eveSelfUseVal: Math.round(dayEveSuVal),
      nightSelfUseVal: Math.round(dayNightSuVal),
      evCost: Math.round(evCost),
      topupCost: Math.round(dayTopupCost),
      net: Math.round(netPence),
      endKwh: Math.round(batKwh),
      endSoc: Math.round(batKwh / CAP * 100),
    });

    const ma = monthlyAccum[month]!;
    ma.offpk += dayOffpkCost;
    ma.topup += dayTopupCost;
    ma.pExp += dayPeakExpRev;
    ma.pSu += dayPeakSuVal;
    ma.eSu += dayEveSuVal;
    ma.nSu += dayNightSuVal;
    ma.ev += evCost;
    ma.sol += daySolIn + postPeakSolIn;
    ma.net += netPence;
    ma.d++;
  }

  // Monthly
  const monthly: FluxMonthResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const ma = monthlyAccum[m]!;
    if (ma.d === 0) continue;
    monthly.push({
      month: m, label: MONTH_NAMES[m]!, days: ma.d,
      offpeakCost: Math.round(ma.offpk), topupCost: Math.round(ma.topup),
      peakExpRev: Math.round(ma.pExp), peakSelfUse: Math.round(ma.pSu),
      eveSelfUse: Math.round(ma.eSu), nightSelfUse: Math.round(ma.nSu),
      evCost: Math.round(ma.ev), solarIn: Math.round(ma.sol),
      net: Math.round(ma.net), dailyAvg: ma.d > 0 ? Math.round(ma.net / ma.d) : 0,
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

  const junMonth = monthly.find(m => m.month === 6);
  const decMonth = monthly.find(m => m.month === 12);

  return {
    days, monthly,
    annual: {
      net: Math.round(aNet), netGbp: Math.round(aNet / 100),
      peakExport: Math.round(aPExp), peakSelfUse: Math.round(aPSu),
      eveSelfUse: Math.round(aESu), nightSelfUse: Math.round(aNSu),
      offpeakCharge: Math.round(aOffpk), topup: Math.round(aTopup), ev: Math.round(aEv),
      avgDailyPence: Math.round(aNet / 365), avgDailyGbp: Math.round(aNet / 365) / 100,
      summerDailyGbp: junMonth ? Math.round(junMonth.dailyAvg) / 100 : 0,
      winterDailyGbp: decMonth ? Math.round(decMonth.dailyAvg) / 100 : 0,
    },
    payback: { months: 0, years: 0 },
    system: {
      totalCapKwh: CAP, totalInverterKw: inverterKw,
      exportLimitKw, maxPeakExportKwh: MAX_PEAK, usableKwh: USABLE,
    },
  };
}
