// ============================================================
// Agile Revenue Model — Historical backtest with patient trader
//
// Runs against actual Agile half-hourly rates from the DB.
// NOT a synthetic model — uses real data for every day.
//
// Patient trader rules:
// 1. Don't cycle unless spread exceeds degradation cost
// 2. Always charge on negative pricing (you're being paid)
// 3. Self-consume before grid export (import rate > export rate)
// 4. Hold charge through dead days — sit idle if no profitable trade
// 5. Carry SOC across days continuously
// 6. Charge EVs on cheapest available slots
// ============================================================

// --- Solar model (same as IOF, calibrated for Lancashire 900 kWh/kWp/yr) ---
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

export interface AgileModelConfig {
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

export interface AgileSlotRate {
  slot: number;
  importRate: number;
  exportRate: number;
}

export interface AgileDayData {
  date: string;
  month: number;
  rates: AgileSlotRate[]; // 48 slots
}

export interface AgileDayResult {
  date: string;
  dow: string;
  month: number;
  chargeCost: number;       // pence (negative = earned from neg pricing)
  exportRev: number;        // pence
  selfUseVal: number;       // pence (house at import rate)
  eveVal: number;           // pence (evening self-use)
  evCost: number;           // pence
  negChargeEarned: number;  // pence (paid to charge)
  net: number;              // pence
  chargeKwh: number;
  dischargeKwh: number;
  exportKwh: number;
  selfUseKwh: number;
  solarIn: number;
  negSlots: number;
  cheapestImport: number;
  peakImport: number;
  peakExport: number;
  endKwh: number;
  endSoc: number;
  action: string;           // 'traded' | 'held' | 'partial' | 'neg-only'
}

export interface AgileMonthResult {
  month: number;
  label: string;
  days: number;
  chargeCost: number;
  exportRev: number;
  selfUse: number;
  evCost: number;
  negEarned: number;
  solarIn: number;
  net: number;
  dailyAvg: number;
  tradedDays: number;
  heldDays: number;
  negDays: number;
}

export interface AgileModelResult {
  days: AgileDayResult[];
  monthly: AgileMonthResult[];
  annual: {
    net: number;
    netGbp: number;
    export: number;
    selfUse: number;
    chargeCost: number;
    evCost: number;
    negEarned: number;
    avgDailyPence: number;
    avgDailyGbp: number;
    tradedDays: number;
    heldDays: number;
    negDays: number;
    totalDays: number;
  };
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Patient Trader Dispatch ---

export function runAgileModel(
  config: AgileModelConfig,
  dailyData: AgileDayData[],
): AgileModelResult {
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

  const FLOOR = CAP * 0.05;  // 5% reserve (Agile — no Kraken mandate)
  const MAX_CHARGE_SLOT = inverterKw * 0.5 * EFF;
  const MAX_DISCHARGE_SLOT = Math.min(inverterKw, exportLimitKw) * 0.5;
  const EV_DAILY = evCount * evKwhPerDay;

  // Cycle degradation cost: battery replacement cost / total cycle energy
  // At £93/kWh and 8000 cycles: £93 / 8000 = 1.16p/kWh stored, or ~0.6p/kWh discharged after efficiency
  const CYCLE_COST_PER_KWH = 1.2; // pence per kWh discharged — hurdle rate

  let batKwh = FLOOR; // start empty
  const days: AgileDayResult[] = [];

  for (let di = 0; di < dailyData.length; di++) {
    const day = dailyData[di]!;
    const { date, month, rates } = day;
    const dow = DOW_NAMES[new Date(date + 'T12:00:00Z').getDay()]!;
    const nextDay = di < dailyData.length - 1 ? dailyData[di + 1] : undefined;

    // Build import/export arrays
    const impRates = new Array(48).fill(20);
    const expRates = new Array(48).fill(10);
    for (const r of rates) {
      if (r.slot >= 0 && r.slot < 48) {
        impRates[r.slot] = r.importRate;
        expRates[r.slot] = r.exportRate;
      }
    }

    const cheapestImport = Math.min(...impRates);
    const peakImport = Math.max(...impRates);
    const peakExport = Math.max(...expRates);
    const negSlots = impRates.filter((r: number) => r <= 0).length;

    // Solar for today
    const solar = new Array(48).fill(0).map((_: number, i: number) => solarPerSlot(i, month, solarKwp));

    // ── PATIENT TRADER DECISION ──
    // Calculate best possible spread for today
    const sortedImports = [...impRates].sort((a: number, b: number) => a - b);
    const sortedExports = [...expRates].sort((a: number, b: number) => b - a);
    const bestChargeRate = sortedImports[0]!;
    const bestExportRate = sortedExports[0]!;
    const bestSpread = bestExportRate - (bestChargeRate / EFF);

    // Check tomorrow's spread for hold decision
    let tomorrowSpread = 0;
    if (nextDay) {
      const tImp = nextDay.rates.map(r => r.importRate);
      const tExp = nextDay.rates.map(r => r.exportRate);
      if (tImp.length > 0 && tExp.length > 0) {
        tomorrowSpread = Math.max(...tExp) - (Math.min(...tImp) / EFF);
      }
    }

    // Decision: trade, hold, or negative-only
    let strategy: 'trade' | 'hold' | 'neg-only';
    if (negSlots > 0) {
      // Always charge on negative pricing
      strategy = bestSpread > CYCLE_COST_PER_KWH ? 'trade' : 'neg-only';
    } else if (bestSpread > CYCLE_COST_PER_KWH * 2) {
      // Good spread — trade
      strategy = 'trade';
    } else if (tomorrowSpread > bestSpread * 1.3 && batKwh > FLOOR + 50) {
      // Tomorrow looks better and we have charge — hold
      strategy = 'hold';
    } else if (bestSpread > CYCLE_COST_PER_KWH) {
      // Marginal but profitable — trade
      strategy = 'trade';
    } else {
      // Dead day — hold charge or idle
      strategy = 'hold';
    }

    // ── SLOT-BY-SLOT SIMULATION ──
    let dayChargeCost = 0;
    let dayExportRev = 0;
    let daySelfUseVal = 0;
    let dayEveVal = 0;
    let dayNegEarned = 0;
    let dayChargeKwh = 0;
    let dayDischargeKwh = 0;
    let dayExportKwh = 0;
    let daySelfUseKwh = 0;
    let daySolIn = 0;
    let dayEvCost = 0;

    // Determine which slots to charge and discharge
    const actions = new Array<string>(48).fill('idle');

    // ALWAYS charge on negative pricing — free money regardless of strategy
    for (let i = 0; i < 48; i++) {
      if (impRates[i] <= 0) actions[i] = 'charge-neg';
    }

    if (strategy === 'trade') {
      // PAIRED APPROACH: match each charge slot with a discharge slot
      // Only execute pairs where the SPECIFIC pair is profitable

      // Candidate charge slots: sorted cheapest first (excluding already-assigned neg slots)
      const chargeCandidates = impRates
        .map((r: number, i: number) => ({ i, r }))
        .filter((s: { i: number; r: number }) => actions[s.i] === 'idle' && s.r < 20)
        .sort((a: { r: number }, b: { r: number }) => a.r - b.r);

      // Candidate discharge slots: sorted most expensive first
      const dischargeCandidates = expRates
        .map((r: number, i: number) => ({ i, r }))
        .filter((s: { i: number; r: number }) => actions[s.i] === 'idle')
        .sort((a: { r: number }, b: { r: number }) => b.r - a.r);

      // Pair them 1:1, only if each pair is individually profitable
      const usedCharge = new Set<number>();
      const usedDischarge = new Set<number>();

      for (const dis of dischargeCandidates) {
        // Find the cheapest unused charge slot that occurs BEFORE this discharge slot
        const bestCharge = chargeCandidates.find(
          (c: { i: number; r: number }) => !usedCharge.has(c.i) && c.i < dis.i
        );
        if (!bestCharge) continue;

        // Check if THIS SPECIFIC PAIR is profitable
        const effectiveChargeCost = bestCharge.r / EFF;
        const spread = dis.r - effectiveChargeCost - CYCLE_COST_PER_KWH;

        if (spread > 0) {
          actions[bestCharge.i] = 'charge';
          actions[dis.i] = 'discharge';
          usedCharge.add(bestCharge.i);
          usedDischarge.add(dis.i);
        }
      }
    }

    // Self-use is now handled in the slot execution loop — house ALWAYS
    // runs off solar first, then battery, regardless of import rate.

    // ── Execute slot by slot ──
    for (let i = 0; i < 48; i++) {
      const impR = impRates[i] as number;
      const expR = expRates[i] as number;
      const solKwh = solar[i] as number;

      // 1. Solar powers the house FIRST (no battery round-trip loss)
      const houseDem = housePerSlot(i, month, houseKwhPerDay, hasHeatPump);
      let solarRemaining = solKwh;
      let houseRemaining = houseDem;

      if (solarRemaining > 0 && houseRemaining > 0) {
        const solarToHouse = Math.min(solarRemaining, houseRemaining);
        solarRemaining -= solarToHouse;
        houseRemaining -= solarToHouse;
        // Solar powering house saves import rate (no efficiency loss)
        daySelfUseVal += solarToHouse * impR;
        daySelfUseKwh += solarToHouse;
      }

      // 2. Remaining solar → battery (if room)
      if (solarRemaining > 0) {
        const toStore = Math.min(solarRemaining, CAP - batKwh);
        batKwh += toStore;
        daySolIn += toStore;
        solarRemaining -= toStore;
      }

      // 3. Remaining solar (battery full) → export to grid
      if (solarRemaining > 0.01) {
        const solarExpKwh = Math.min(solarRemaining, MAX_DISCHARGE_SLOT);
        dayExportRev += solarExpKwh * expR;
        dayExportKwh += solarExpKwh;
      }

      // 4. Remaining house demand → battery (always, not just >25p)
      if (houseRemaining > 0 && batKwh > FLOOR + houseRemaining) {
        batKwh -= houseRemaining;
        daySelfUseVal += houseRemaining * impR; // saved at import rate
        daySelfUseKwh += houseRemaining;
        houseRemaining = 0;
      }
      // If battery can't cover remaining house demand, house draws from grid (not our cost)

      if (actions[i] === 'charge-neg' || actions[i] === 'charge') {
        const headroom = CAP - batKwh;
        if (headroom > 0) {
          const stored = Math.min(MAX_CHARGE_SLOT, headroom);
          const grid = stored / EFF;
          const cost = grid * impR;
          dayChargeCost += cost;
          if (impR <= 0) dayNegEarned += Math.abs(cost);
          batKwh += stored;
          dayChargeKwh += stored;
        }
      } else if (actions[i] === 'discharge') {
        const avail = batKwh - FLOOR;
        if (avail > 0) {
          const expKwh = Math.min(MAX_DISCHARGE_SLOT, avail);
          dayExportRev += expKwh * expR;
          dayExportKwh += expKwh;
          dayDischargeKwh += expKwh;
          batKwh -= expKwh;
        }
      }
      // 'self-use' and 'hold' and 'idle' — house already handled above
    }

    // EV charging at cheapest slot of the day
    if (EV_DAILY > 0) {
      dayEvCost = EV_DAILY * Math.max(0, cheapestImport); // free if negative
      if (cheapestImport <= 0) dayNegEarned += EV_DAILY * Math.abs(cheapestImport);
    }

    const net = dayExportRev + daySelfUseVal + dayNegEarned - dayChargeCost - dayEvCost;

    let actionLabel: string;
    if (strategy === 'trade' && dayExportKwh > 10) actionLabel = 'traded';
    else if (strategy === 'neg-only') actionLabel = 'neg-only';
    else if (strategy === 'hold') actionLabel = 'held';
    else actionLabel = 'partial';

    days.push({
      date, dow, month,
      chargeCost: Math.round(dayChargeCost),
      exportRev: Math.round(dayExportRev),
      selfUseVal: Math.round(daySelfUseVal),
      eveVal: 0, // included in selfUseVal for Agile
      evCost: Math.round(dayEvCost),
      negChargeEarned: Math.round(dayNegEarned),
      net: Math.round(net),
      chargeKwh: Math.round(dayChargeKwh),
      dischargeKwh: Math.round(dayDischargeKwh),
      exportKwh: Math.round(dayExportKwh),
      selfUseKwh: Math.round(daySelfUseKwh * 10) / 10,
      solarIn: Math.round(daySolIn * 10) / 10,
      negSlots,
      cheapestImport: Math.round(cheapestImport * 100) / 100,
      peakImport: Math.round(peakImport * 100) / 100,
      peakExport: Math.round(peakExport * 100) / 100,
      endKwh: Math.round(batKwh),
      endSoc: Math.round(batKwh / CAP * 100),
      action: actionLabel,
    });
  }

  // ── Monthly aggregation ──
  const monthlyAccum: Record<number, {
    chg: number; exp: number; su: number; ev: number; neg: number; sol: number; net: number;
    d: number; traded: number; held: number; negDays: number;
  }> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyAccum[m] = { chg: 0, exp: 0, su: 0, ev: 0, neg: 0, sol: 0, net: 0, d: 0, traded: 0, held: 0, negDays: 0 };
  }

  for (const d of days) {
    const ma = monthlyAccum[d.month]!;
    ma.chg += d.chargeCost;
    ma.exp += d.exportRev;
    ma.su += d.selfUseVal;
    ma.ev += d.evCost;
    ma.neg += d.negChargeEarned;
    ma.sol += d.solarIn;
    ma.net += d.net;
    ma.d++;
    if (d.action === 'traded') ma.traded++;
    if (d.action === 'held') ma.held++;
    if (d.negSlots > 0) ma.negDays++;
  }

  const monthly: AgileMonthResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const ma = monthlyAccum[m]!;
    if (ma.d === 0) continue;
    monthly.push({
      month: m,
      label: MONTH_NAMES[m]!,
      days: ma.d,
      chargeCost: Math.round(ma.chg),
      exportRev: Math.round(ma.exp),
      selfUse: Math.round(ma.su),
      evCost: Math.round(ma.ev),
      negEarned: Math.round(ma.neg),
      solarIn: Math.round(ma.sol),
      net: Math.round(ma.net),
      dailyAvg: Math.round(ma.net / ma.d),
      tradedDays: ma.traded,
      heldDays: ma.held,
      negDays: ma.negDays,
    });
  }

  // Annual
  const aNet = days.reduce((s, d) => s + d.net, 0);
  const aExp = days.reduce((s, d) => s + d.exportRev, 0);
  const aSu = days.reduce((s, d) => s + d.selfUseVal, 0);
  const aChg = days.reduce((s, d) => s + d.chargeCost, 0);
  const aEv = days.reduce((s, d) => s + d.evCost, 0);
  const aNeg = days.reduce((s, d) => s + d.negChargeEarned, 0);

  return {
    days,
    monthly,
    annual: {
      net: Math.round(aNet),
      netGbp: Math.round(aNet / 100),
      export: Math.round(aExp),
      selfUse: Math.round(aSu),
      chargeCost: Math.round(aChg),
      evCost: Math.round(aEv),
      negEarned: Math.round(aNeg),
      avgDailyPence: days.length > 0 ? Math.round(aNet / days.length) : 0,
      avgDailyGbp: days.length > 0 ? Math.round(aNet / days.length) / 100 : 0,
      tradedDays: days.filter(d => d.action === 'traded').length,
      heldDays: days.filter(d => d.action === 'held').length,
      negDays: days.filter(d => d.negSlots > 0).length,
      totalDays: days.length,
    },
  };
}
