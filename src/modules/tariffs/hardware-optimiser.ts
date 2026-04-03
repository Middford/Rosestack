// ============================================================
// Hardware Optimiser
//
// Grid-searches across system configurations (battery stacks,
// inverter count, solar kWp) to find the combination that
// maximises 10-year NPV for a given phase type.
//
// For each configuration, runs a backtest against historical
// data, then projects forward with trend analysis and degradation.
// ============================================================

import { runBacktest, type BacktestResult } from '@/modules/tariffs/backtest-engine';
import {
  generateConfigGrid,
  configToParams,
  calculateCapex,
  FOGSTAR_STACK,
  type SystemConfig,
  type CapexBreakdown,
} from '@/modules/tariffs/system-presets';

// --- Types ---

export interface OptimiserOptions {
  phaseType: 'single' | 'three';
  maxStacks?: number;
  solarSteps?: number[];
  /** Discount rate for NPV calculation (default 0.08 = 8%) */
  discountRate?: number;
  /** Annual energy inflation rate (default 0.05 = 5%) */
  energyInflation?: number;
  /** Years to project (default 10 = ESA term) */
  years?: number;
  /** Backtest date range */
  fromDate?: string;
  toDate?: string;
  onProgress?: (completed: number, total: number) => void;
}

export interface OptimiserResult {
  configs: RankedConfig[];
  bestConfig: RankedConfig;
  /** Stack count where adding one more has marginal NPV < cost */
  diminishingReturnsAtStack: number;
  /** Optimal switching calendar from the best config */
  switchingCalendar: Record<number, string>;
  /** Total configs evaluated */
  totalEvaluated: number;
}

export interface RankedConfig {
  config: SystemConfig;
  capex: CapexBreakdown;
  /** Average daily revenue from backtest (pence) */
  backtestAvgDailyPence: number;
  /** Projected Year 1 annual revenue (GBP) */
  year1RevenueGbp: number;
  /** 10-year NPV at discount rate (GBP) */
  npv10yr: number;
  /** Payback period in months */
  paybackMonths: number;
  /** Internal Rate of Return */
  irr: number;
  /** Monthly comparison: which tariff wins per month */
  monthlyBestTariff: Record<number, string>;
  /** Annual revenue under optimal monthly switching */
  optimalSwitchingRevenueGbp: number;
}

// --- Constants ---

/** Annual costs per home (GBP) */
const ANNUAL_COSTS = {
  homeownerPayment: 1200, // £100/month
  maintenanceBase: 200,   // Base maintenance
  maintenancePerKwh: 0.5, // Per kWh of capacity
  insurance: 0.008,       // 0.8% of hardware value
  compliance: 300,        // G99, MCS, monitoring
} as const;

// --- Core Function ---

/**
 * Run the hardware optimiser across a configuration grid.
 * Returns configs ranked by 10-year NPV.
 */
export async function findOptimalConfig(
  options: OptimiserOptions,
): Promise<OptimiserResult> {
  const {
    phaseType,
    maxStacks,
    solarSteps,
    discountRate = 0.08,
    energyInflation = 0.05,
    years = 10,
    fromDate,
    toDate,
    onProgress,
  } = options;

  const configs = generateConfigGrid(phaseType, { maxStacks, solarSteps });
  const ranked: RankedConfig[] = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i]!;
    const params = configToParams(config);
    const capex = calculateCapex(config);

    // Run backtest for this config
    const backtest = await runBacktest({
      params,
      config,
      fromDate,
      toDate,
      includeIof: true,
      name: `Optimiser: ${config.stacks}S ${config.inverterCount}I ${config.solarKwp}kWp`,
    });

    // Calculate optimal monthly switching revenue
    const { monthlyBest, switchingRevenuePence } = calculateOptimalSwitching(backtest);

    // Project forward with NPV
    const projection = projectRevenue({
      backtestAvgDailyPence: backtest.agile.avgDailyRevenuePence,
      optimalSwitchingDailyPence: switchingRevenuePence / 365,
      capexGbp: capex.totalGbp,
      capacityKwh: params.totalCapacityKwh,
      hardwareValueGbp: capex.batteryGbp + capex.inverterGbp,
      discountRate,
      energyInflation,
      years,
    });

    ranked.push({
      config,
      capex,
      backtestAvgDailyPence: backtest.agile.avgDailyRevenuePence,
      year1RevenueGbp: projection.year1RevenueGbp,
      npv10yr: projection.npv,
      paybackMonths: projection.paybackMonths,
      irr: projection.irr,
      monthlyBestTariff: monthlyBest,
      optimalSwitchingRevenueGbp: Math.round(switchingRevenuePence / 100),
    });

    onProgress?.(i + 1, configs.length);
  }

  // Sort by NPV descending
  ranked.sort((a, b) => b.npv10yr - a.npv10yr);

  // Find diminishing returns threshold
  const diminishingReturnsAtStack = findDiminishingReturns(ranked);

  // Best config's switching calendar
  const bestConfig = ranked[0]!;
  const switchingCalendar = bestConfig.monthlyBestTariff;

  return {
    configs: ranked,
    bestConfig,
    diminishingReturnsAtStack,
    switchingCalendar,
    totalEvaluated: configs.length,
  };
}

// --- Revenue Projection ---

interface ProjectionInput {
  backtestAvgDailyPence: number;
  optimalSwitchingDailyPence: number;
  capexGbp: number;
  capacityKwh: number;
  hardwareValueGbp: number;
  discountRate: number;
  energyInflation: number;
  years: number;
}

interface ProjectionOutput {
  year1RevenueGbp: number;
  npv: number;
  paybackMonths: number;
  irr: number;
  yearlyNetCashFlow: number[];
}

function projectRevenue(input: ProjectionInput): ProjectionOutput {
  const {
    optimalSwitchingDailyPence,
    capexGbp,
    capacityKwh,
    hardwareValueGbp,
    discountRate,
    energyInflation,
    years,
  } = input;

  const yearlyNetCashFlow: number[] = [];
  let cumulativeCash = -capexGbp;
  let paybackMonths = years * 12; // default to end if never reached

  for (let year = 1; year <= years; year++) {
    // Revenue grows with energy inflation, degrades with battery
    const degradationFactor = Math.max(0.5, 1 - FOGSTAR_STACK.degradationRate * year);
    const inflationFactor = Math.pow(1 + energyInflation, year - 1);
    const annualRevenuePence = optimalSwitchingDailyPence * 365 * degradationFactor * inflationFactor;
    const annualRevenueGbp = annualRevenuePence / 100;

    // Annual costs
    const annualCosts = ANNUAL_COSTS.homeownerPayment
      + ANNUAL_COSTS.maintenanceBase
      + (capacityKwh * ANNUAL_COSTS.maintenancePerKwh)
      + (hardwareValueGbp * ANNUAL_COSTS.insurance)
      + ANNUAL_COSTS.compliance;

    const netCashFlow = annualRevenueGbp - annualCosts;
    yearlyNetCashFlow.push(netCashFlow);

    cumulativeCash += netCashFlow;
    if (cumulativeCash >= 0 && paybackMonths === years * 12) {
      // Interpolate to find the month within this year
      const prevCumulative = cumulativeCash - netCashFlow;
      const monthsInYear = netCashFlow > 0
        ? Math.ceil((-prevCumulative / netCashFlow) * 12)
        : 12;
      paybackMonths = (year - 1) * 12 + Math.min(monthsInYear, 12);
    }
  }

  // NPV calculation
  let npv = -capexGbp;
  for (let year = 1; year <= years; year++) {
    npv += yearlyNetCashFlow[year - 1]! / Math.pow(1 + discountRate, year);
  }

  // IRR via Newton's method
  const irr = calculateIrr([-capexGbp, ...yearlyNetCashFlow]);

  const year1RevenueGbp = Math.round((optimalSwitchingDailyPence * 365) / 100);

  return {
    year1RevenueGbp,
    npv: Math.round(npv),
    paybackMonths,
    irr: Math.round(irr * 1000) / 1000,
    yearlyNetCashFlow,
  };
}

// --- Optimal Monthly Switching ---

function calculateOptimalSwitching(
  backtest: BacktestResult,
): { monthlyBest: Record<number, string>; switchingRevenuePence: number } {
  const monthlyBest: Record<number, string> = {};
  let totalSwitchingRevenue = 0;

  for (const m of backtest.monthly) {
    const agileDaily = m.agileAvgDailyPence;
    const iofDaily = m.iofAvgDailyPence ?? 0;
    const best = iofDaily > agileDaily ? 'iof' : 'agile';
    const bestRevenue = Math.max(agileDaily, iofDaily);

    monthlyBest[m.month] = best;
    // Approximate days per month
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m.month]!;
    totalSwitchingRevenue += bestRevenue * daysInMonth;
  }

  return { monthlyBest, switchingRevenuePence: totalSwitchingRevenue };
}

// --- Diminishing Returns ---

function findDiminishingReturns(ranked: RankedConfig[]): number {
  // Group by stack count (ignoring inverter/solar variation)
  const byStack = new Map<number, number>();

  for (const r of ranked) {
    const stacks = r.config.stacks;
    const currentBest = byStack.get(stacks);
    if (currentBest === undefined || r.npv10yr > currentBest) {
      byStack.set(stacks, r.npv10yr);
    }
  }

  const stackCounts = [...byStack.keys()].sort((a, b) => a - b);
  for (let i = 1; i < stackCounts.length; i++) {
    const prevNpv = byStack.get(stackCounts[i - 1]!)!;
    const currNpv = byStack.get(stackCounts[i]!)!;
    const marginalNpv = currNpv - prevNpv;

    // Marginal NPV of adding one more stack should exceed the stack cost
    if (marginalNpv < FOGSTAR_STACK.priceGbp) {
      return stackCounts[i - 1]!;
    }
  }

  return stackCounts[stackCounts.length - 1] ?? 1;
}

// --- IRR Calculation (Newton's method) ---

function calculateIrr(cashFlows: number[], guess = 0.1, maxIter = 100, tol = 1e-6): number {
  let rate = guess;

  for (let iter = 0; iter < maxIter; iter++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const cf = cashFlows[t]!;
      npv += cf / Math.pow(1 + rate, t);
      dnpv -= (t * cf) / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(npv) < tol) return rate;
    if (dnpv === 0) return rate;

    rate = rate - npv / dnpv;
  }

  return rate;
}
