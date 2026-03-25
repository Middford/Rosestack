// ============================================================
// Finance Module — Data Service
// Pulls hardware costs from Agent 1 and tariff rates from Agent 2
// ============================================================

import type { BatterySystem, Tariff, ScenarioAssumptions, ThreeScenarioProjection, ThreeScenarioSummary } from '@/shared/types';
import {
  calculateAllScenarios,
  summariseScenarios,
  formatGbp,
  formatPaybackRange,
  getDscrStatus,
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
} from '@/shared/utils/scenarios';
import { batteries, inverters } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs/data';
import type { TariffWithMeta } from '@/modules/tariffs/data';

// --- Pre-built system configs from hardware data ---

export interface SystemOption {
  id: string;
  label: string;
  system: BatterySystem;
}

function buildSystem(
  batteryId: string,
  modules: number,
  inverterId: string,
  solarKwp?: number,
): BatterySystem | null {
  const bat = batteries.find(b => b.id === batteryId);
  const inv = inverters.find(i => i.id === inverterId);
  if (!bat || !inv) return null;

  return {
    id: `${batteryId}-${modules}m-${inverterId}`,
    homeId: 'model',
    inverterModel: `${inv.manufacturer} ${inv.model}`,
    batteryModules: modules,
    totalCapacityKwh: bat.capacityPerModuleKwh * modules,
    batteryChemistry: bat.chemistry,
    solarPvKwp: solarKwp,
    installCost: bat.wholesalePriceGbp * modules + inv.priceGbp,
    annualMaintenanceCost: 150,
    warrantyYears: bat.warrantyYears,
    degradationRatePercent: bat.degradationRatePercent,
    maxChargeRateKw: Math.min(bat.chargeRateKw * modules, inv.maxOutputKw),
    maxDischargeRateKw: Math.min(bat.dischargeRateKw * modules, inv.maxOutputKw),
    roundTripEfficiency: bat.roundTripEfficiency / 100,
  };
}

export const SYSTEM_OPTIONS: SystemOption[] = [
  buildSystem('bat-sigenergy', 1, 'inv-sigenergy-m1', 5),
  buildSystem('bat-sigenergy', 2, 'inv-sigenergy-m1', 5),
  buildSystem('bat-givenergy', 1, 'inv-givenergy', 4),
  buildSystem('bat-givenergy', 2, 'inv-givenergy', 4),
  buildSystem('bat-byd-hvs', 2, 'inv-fronius', 5),
  buildSystem('bat-byd-hvs', 3, 'inv-fronius', 5),
  buildSystem('bat-huawei-luna', 1, 'inv-huawei', 5),
  buildSystem('bat-huawei-luna', 2, 'inv-huawei', 5),
  buildSystem('bat-fox-ess', 1, 'inv-fox-ess', 4),
]
  .filter((s): s is BatterySystem => s !== null)
  .map(sys => ({
    id: sys.id,
    label: `${sys.inverterModel} + ${sys.totalCapacityKwh}kWh (${sys.batteryChemistry})`,
    system: sys,
  }));

export const TARIFF_OPTIONS: TariffWithMeta[] = ALL_TARIFFS;

// --- Per-Home P&L Model ---

export interface PerHomePnl {
  system: BatterySystem;
  tariff: Tariff;
  projection: ThreeScenarioProjection;
  summary: ThreeScenarioSummary;
  capitalCost: number;
  installCost: number;
  totalCapex: number;
  paybackRange: string;
  trafficLight: 'green' | 'amber' | 'red';
  twentyYearProjection: ThreeScenarioProjection;
  twentyYearSummary: ThreeScenarioSummary;
  irr20Year: { best: number; likely: number; worst: number };
  npvAtRates: { rate: number; best: number; likely: number; worst: number }[];
}

export function calculatePerHomePnl(
  system: BatterySystem,
  tariff: Tariff,
  overrides?: {
    best?: Partial<ScenarioAssumptions>;
    likely?: Partial<ScenarioAssumptions>;
    worst?: Partial<ScenarioAssumptions>;
  },
): PerHomePnl {
  const projection = calculateAllScenarios(system, tariff, overrides, 10);
  const summary = summariseScenarios(projection, system);

  const twentyYearProjection = calculateAllScenarios(system, tariff, overrides, 20);
  const twentyYearSummary = summariseScenarios(twentyYearProjection, system);

  const capitalCost = system.installCost;
  const installCost = system.installCost * 0.15;
  const totalCapex = capitalCost + installCost;

  // NPV at various discount rates
  const npvAtRates = [0.05, 0.08, 0.10, 0.12, 0.15].map(rate => {
    const calcNpv = (projections: typeof projection.best) => {
      const cfs = [-totalCapex, ...projections.map(p => p.netRevenue)];
      return cfs.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
    };
    return {
      rate: rate * 100,
      best: Math.round(calcNpv(twentyYearProjection.best) * 100) / 100,
      likely: Math.round(calcNpv(twentyYearProjection.likely) * 100) / 100,
      worst: Math.round(calcNpv(twentyYearProjection.worst) * 100) / 100,
    };
  });

  // Calculate 20yr IRR
  const calcIrr = (projections: typeof projection.best) => {
    const cfs = [-totalCapex, ...projections.map(p => p.netRevenue)];
    let rate = 0.1;
    for (let i = 0; i < 100; i++) {
      let npv = 0, dnpv = 0;
      for (let t = 0; t < cfs.length; t++) {
        const d = Math.pow(1 + rate, t);
        npv += cfs[t] / d;
        if (t > 0) dnpv -= (t * cfs[t]) / Math.pow(1 + rate, t + 1);
      }
      if (Math.abs(npv) < 0.01 || dnpv === 0) break;
      rate = rate - npv / dnpv;
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }
    return Math.round(rate * 10000) / 100;
  };

  const profitability = getDscrStatus(summary);

  return {
    system,
    tariff,
    projection,
    summary,
    capitalCost,
    installCost,
    totalCapex,
    paybackRange: formatPaybackRange(summary),
    trafficLight: profitability,
    twentyYearProjection,
    twentyYearSummary,
    irr20Year: {
      best: calcIrr(twentyYearProjection.best),
      likely: calcIrr(twentyYearProjection.likely),
      worst: calcIrr(twentyYearProjection.worst),
    },
    npvAtRates,
  };
}

// --- Portfolio Model ---

export interface PortfolioYear {
  year: number;
  newHomes: number;
  totalHomes: number;
  cumulativeCapex: number;
  annualRevenue: { best: number; likely: number; worst: number };
  annualCosts: number;
  netCashFlow: { best: number; likely: number; worst: number };
  cumulativeCashFlow: { best: number; likely: number; worst: number };
  debtService: number;
  dscr: { best: number; likely: number; worst: number };
  loanBalance: number;
}

export interface PortfolioModelResult {
  years: PortfolioYear[];
  totalHomesDeployed: number;
  totalCapex: number;
  cashFlowPositiveYear: { best: number; likely: number; worst: number };
  portfolioIrr: { best: number; likely: number; worst: number };
}

export function calculatePortfolioModel(
  perHomePnl: PerHomePnl,
  targetHomes: number,
  deploymentYears: number,
  loanInterestRate: number = 6,
  loanTermYears: number = 10,
  ltv: number = 70,
): PortfolioModelResult {
  const homesPerYear = Math.ceil(targetHomes / deploymentYears);
  const costPerHome = perHomePnl.totalCapex;
  const loanAmount = costPerHome * (ltv / 100);
  const annualPayment = (loanAmount * (loanInterestRate / 100)) /
    (1 - Math.pow(1 + loanInterestRate / 100, -loanTermYears));

  const maintenancePerHome = 150;
  const insurancePerHome = 500;
  const homeownerPaymentPerHome = 1200;

  const years: PortfolioYear[] = [];
  let cumulativeCapex = 0;
  let cumulativeBest = 0, cumulativeLikely = 0, cumulativeWorst = 0;
  let totalHomes = 0;
  let totalLoanBalance = 0;

  for (let y = 1; y <= Math.max(deploymentYears + 5, 10); y++) {
    const newHomes = y <= deploymentYears ? homesPerYear : 0;
    totalHomes += newHomes;
    const yearCapex = newHomes * costPerHome;
    cumulativeCapex += yearCapex;
    totalLoanBalance += newHomes * loanAmount;

    // Revenue scales with active homes
    const getYearRevenue = (scenario: 'best' | 'likely' | 'worst') => {
      const yearIdx = Math.min(y - 1, 9);
      const proj = perHomePnl.projection[scenario][yearIdx];
      return proj ? proj.grossRevenue * totalHomes : 0;
    };

    const revBest = getYearRevenue('best');
    const revLikely = getYearRevenue('likely');
    const revWorst = getYearRevenue('worst');

    const annualCosts = totalHomes * (homeownerPaymentPerHome + maintenancePerHome + insurancePerHome);
    const debtService = totalHomes * annualPayment;
    const yearDebtRepayment = debtService * (1 - loanInterestRate / 100);
    totalLoanBalance = Math.max(0, totalLoanBalance - yearDebtRepayment);

    const netBest = revBest - annualCosts;
    const netLikely = revLikely - annualCosts;
    const netWorst = revWorst - annualCosts;

    cumulativeBest += netBest;
    cumulativeLikely += netLikely;
    cumulativeWorst += netWorst;

    years.push({
      year: y,
      newHomes,
      totalHomes,
      cumulativeCapex,
      annualRevenue: { best: Math.round(revBest), likely: Math.round(revLikely), worst: Math.round(revWorst) },
      annualCosts: Math.round(annualCosts),
      netCashFlow: { best: Math.round(netBest), likely: Math.round(netLikely), worst: Math.round(netWorst) },
      cumulativeCashFlow: { best: Math.round(cumulativeBest), likely: Math.round(cumulativeLikely), worst: Math.round(cumulativeWorst) },
      debtService: Math.round(debtService),
      dscr: {
        best: debtService > 0 ? Math.round((netBest / debtService) * 100) / 100 : 0,
        likely: debtService > 0 ? Math.round((netLikely / debtService) * 100) / 100 : 0,
        worst: debtService > 0 ? Math.round((netWorst / debtService) * 100) / 100 : 0,
      },
      loanBalance: Math.round(totalLoanBalance),
    });
  }

  const findCfPositive = (scenario: 'best' | 'likely' | 'worst') => {
    const yr = years.find(y => y.cumulativeCashFlow[scenario] > 0);
    return yr ? yr.year : 999;
  };

  return {
    years,
    totalHomesDeployed: totalHomes,
    totalCapex: cumulativeCapex,
    cashFlowPositiveYear: {
      best: findCfPositive('best'),
      likely: findCfPositive('likely'),
      worst: findCfPositive('worst'),
    },
    portfolioIrr: perHomePnl.irr20Year,
  };
}

// --- Sensitivity Analysis ---

export interface SensitivityPoint {
  variable: string;
  change: number;
  label: string;
  paybackMonths: { best: number; likely: number; worst: number };
  tenYearNpv: { best: number; likely: number; worst: number };
  annualRevenue: { best: number; likely: number; worst: number };
}

export function calculateSensitivity(
  system: BatterySystem,
  tariff: Tariff,
): SensitivityPoint[] {
  const points: SensitivityPoint[] = [];

  const variables: {
    key: string;
    field: keyof ScenarioAssumptions;
    changes: { value: number; label: string }[];
  }[] = [
    {
      key: 'Energy Price',
      field: 'energyInflationPercent',
      changes: [
        { value: -5, label: '-5%' },
        { value: -10, label: '-10%' },
        { value: 5, label: '+5%' },
        { value: 10, label: '+10%' },
      ],
    },
    {
      key: 'Degradation',
      field: 'batteryDegradationPercent',
      changes: [
        { value: 1, label: '1%/yr' },
        { value: 2, label: '2%/yr' },
        { value: 3, label: '3%/yr' },
      ],
    },
    {
      key: 'Tariff Rates',
      field: 'iofSpreadChangePercent',
      changes: [
        { value: -10, label: '-10%' },
        { value: -20, label: '-20%' },
        { value: 10, label: '+10%' },
      ],
    },
    {
      key: 'Install Cost',
      field: 'installCostChangePercent',
      changes: [
        { value: -10, label: '-10%' },
        { value: 10, label: '+10%' },
        { value: 20, label: '+20%' },
      ],
    },
    {
      key: 'Interest Rate',
      field: 'interestRateSpreadPercent',
      changes: [
        { value: 1, label: '1%' },
        { value: 2.5, label: '2.5%' },
        { value: 4, label: '4%' },
        { value: 6, label: '6%' },
      ],
    },
    {
      key: 'Saving Sessions',
      field: 'savingSessionsPerYear',
      changes: [
        { value: 10, label: '10/yr' },
        { value: 25, label: '25/yr' },
        { value: 40, label: '40/yr' },
      ],
    },
    {
      key: 'Flexibility Rev',
      field: 'flexibilityRevenuePerHomePerYear',
      changes: [
        { value: 0, label: '0%' },
        { value: 250, label: '25%' },
        { value: 500, label: '50%' },
        { value: 1000, label: '100%' },
      ],
    },
  ];

  for (const v of variables) {
    for (const c of v.changes) {
      const override = { [v.field]: c.value };
      const projection = calculateAllScenarios(
        system, tariff,
        { best: override, likely: override, worst: override },
        10,
      );
      const summary = summariseScenarios(projection, system);
      points.push({
        variable: v.key,
        change: c.value,
        label: c.label,
        paybackMonths: {
          best: summary.best.paybackMonths,
          likely: summary.likely.paybackMonths,
          worst: summary.worst.paybackMonths,
        },
        tenYearNpv: {
          best: summary.best.tenYearNpv,
          likely: summary.likely.tenYearNpv,
          worst: summary.worst.tenYearNpv,
        },
        annualRevenue: {
          best: summary.best.annualNetRevenue,
          likely: summary.likely.annualNetRevenue,
          worst: summary.worst.annualNetRevenue,
        },
      });
    }
  }

  return points;
}

// --- Scenario Comparator ---

export interface ScenarioComparison {
  systemLabel: string;
  tariffLabel: string;
  system: BatterySystem;
  tariff: Tariff;
  summary: ThreeScenarioSummary;
  paybackRange: string;
  trafficLight: 'green' | 'amber' | 'red';
  totalCapex: number;
}

export function compareScenarios(
  systems: SystemOption[],
  tariffs: TariffWithMeta[],
): ScenarioComparison[] {
  const comparisons: ScenarioComparison[] = [];

  for (const sys of systems) {
    for (const tariff of tariffs) {
      const projection = calculateAllScenarios(sys.system, tariff);
      const summary = summariseScenarios(projection, sys.system);
      const totalCapex = sys.system.installCost * 1.15;

      comparisons.push({
        systemLabel: sys.label,
        tariffLabel: `${tariff.supplier} ${tariff.name}`,
        system: sys.system,
        tariff,
        summary,
        paybackRange: formatPaybackRange(summary),
        trafficLight: getDscrStatus(summary),
        totalCapex,
      });
    }
  }

  // Sort by likely NPV descending
  comparisons.sort((a, b) => b.summary.likely.tenYearNpv - a.summary.likely.tenYearNpv);
  return comparisons;
}

// --- Break-Even Analysis ---

export interface BreakEvenResult {
  breakEvenElectricityPricePence: number;
  breakEvenDegradationPercent: number;
  breakEvenPortfolioSize: number;
  breakEvenSpreadPence: number;
}

export function calculateBreakEven(
  system: BatterySystem,
  tariff: Tariff,
  annualFixedCosts: number = 2850, // homeowner + maintenance + insurance
): BreakEvenResult {
  // Break-even electricity price: find the energy inflation where NPV = 0
  let bePrice = 0;
  for (let inflation = -10; inflation <= 20; inflation += 0.5) {
    const proj = calculateAllScenarios(system, tariff, {
      likely: { energyInflationPercent: inflation },
    }, 10);
    const sum = summariseScenarios(proj, system);
    if (sum.likely.tenYearNpv >= 0) {
      bePrice = inflation;
      break;
    }
  }

  // Break-even degradation
  let beDeg = 0;
  for (let deg = 0.5; deg <= 10; deg += 0.25) {
    const proj = calculateAllScenarios(system, tariff, {
      likely: { batteryDegradationPercent: deg },
    }, 10);
    const sum = summariseScenarios(proj, system);
    if (sum.likely.tenYearNpv < 0) {
      beDeg = deg - 0.25;
      break;
    }
    beDeg = deg;
  }

  // Break-even portfolio size for business viability (annual profit > £50k)
  let bePortfolio = 1;
  for (let homes = 1; homes <= 200; homes++) {
    const proj = calculateAllScenarios(system, tariff, undefined, 10);
    const sum = summariseScenarios(proj, system);
    if (sum.likely.annualNetRevenue * homes > 50000) {
      bePortfolio = homes;
      break;
    }
    bePortfolio = homes;
  }

  // Break-even spread
  let beSpread = 0;
  for (let spread = -50; spread <= 50; spread += 2) {
    const proj = calculateAllScenarios(system, tariff, {
      likely: { iofSpreadChangePercent: spread },
    }, 10);
    const sum = summariseScenarios(proj, system);
    if (sum.likely.tenYearNpv >= 0) {
      beSpread = spread;
      break;
    }
  }

  return {
    breakEvenElectricityPricePence: bePrice,
    breakEvenDegradationPercent: beDeg,
    breakEvenPortfolioSize: bePortfolio,
    breakEvenSpreadPence: beSpread,
  };
}

// --- Portfolio Tracker (mock actual data) ---

export interface TrackerMonth {
  month: string;
  actual: number;
  best: number;
  likely: number;
  worst: number;
}

export function getPortfolioTrackerData(): TrackerMonth[] {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return months.map((m, i) => {
    const base = 1400 + Math.sin(i / 2) * 300;
    return {
      month: `${m} 2026`,
      actual: i < 3 ? Math.round(base * (0.9 + Math.random() * 0.2)) : 0,
      best: Math.round(base * 1.25),
      likely: Math.round(base),
      worst: Math.round(base * 0.7),
    };
  });
}

// Re-export for convenience
export { formatGbp, formatPaybackRange, getDscrStatus };
export { BEST_CASE_DEFAULTS, LIKELY_CASE_DEFAULTS, WORST_CASE_DEFAULTS };
