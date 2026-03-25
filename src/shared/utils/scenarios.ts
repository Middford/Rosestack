import type {
  ScenarioAssumptions,
  ScenarioType,
  YearlyProjection,
  ThreeScenarioProjection,
  ThreeScenarioSummary,
  BatterySystem,
  Tariff,
  TariffRate,
} from '@/shared/types';

// ============================================================
// Three-Scenario Financial Engine
// ALL modules use this. No agent builds their own projection logic.
// ============================================================

// --- Default Assumption Sets ---

export const BEST_CASE_DEFAULTS: ScenarioAssumptions = {
  type: 'best',
  energyInflationPercent: 8,
  batteryDegradationPercent: 1.5,
  iofSpreadChangePercent: 15,
  savingSessionsPerYear: 20,
  savingSessionRatePencePerKwh: 300, // 300p = £3.00/kWh — realistic upper bound
  flexibilityRevenuePerHomePerYear: 2000,
  hardwareCostChangePercent: -20,
  installCostChangePercent: -10,
  homeownerChurnPercent: 0,
  deploymentPacePercent: 120,
  interestRateSpreadPercent: 1.5,
  cyclesPerDay: 2.5,
  solarSelfConsumptionPercent: 50,
  maintenanceCostChangePercent: -15,
};

export const LIKELY_CASE_DEFAULTS: ScenarioAssumptions = {
  type: 'likely',
  energyInflationPercent: 5,
  batteryDegradationPercent: 2,
  iofSpreadChangePercent: 0,
  savingSessionsPerYear: 12,
  savingSessionRatePencePerKwh: 225, // 225p = £2.25/kWh — current realistic rate
  flexibilityRevenuePerHomePerYear: 500,
  hardwareCostChangePercent: 0,
  installCostChangePercent: 0,
  homeownerChurnPercent: 1,
  deploymentPacePercent: 100,
  interestRateSpreadPercent: 2.5,
  cyclesPerDay: 2,
  solarSelfConsumptionPercent: 35,
  maintenanceCostChangePercent: 0,
};

export const WORST_CASE_DEFAULTS: ScenarioAssumptions = {
  type: 'worst',
  energyInflationPercent: 2,
  batteryDegradationPercent: 3,
  iofSpreadChangePercent: -20,
  savingSessionsPerYear: 5,
  savingSessionRatePencePerKwh: 150, // 150p = £1.50/kWh — reduced programme
  flexibilityRevenuePerHomePerYear: 0,
  hardwareCostChangePercent: 10,
  installCostChangePercent: 15,
  homeownerChurnPercent: 5,
  deploymentPacePercent: 50,
  interestRateSpreadPercent: 4,
  cyclesPerDay: 1.5,
  solarSelfConsumptionPercent: 20,
  maintenanceCostChangePercent: 25,
};

// --- Helpers ---

/**
 * Calculate the daily arbitrage spread for a tariff in pence.
 * Looks at the difference between the highest export rate and lowest import rate.
 */
export function calculateDailyArbitrageSpreadPence(tariff: Tariff): number {
  const cheapestImport = Math.min(...tariff.importRates.map(r => r.ratePencePerKwh));
  const highestExport = Math.max(...tariff.exportRates.map(r => r.ratePencePerKwh));
  return highestExport - cheapestImport;
}

/**
 * Calculate total daily import cost and export revenue per cycle.
 * Each cycle: charge at cheapest import, discharge at highest export.
 */
function calculateDailyCycleRevenuePence(
  capacityKwh: number,
  efficiency: number,
  tariff: Tariff,
  spreadChangePercent: number,
): number {
  const cheapestImport = Math.min(...tariff.importRates.map(r => r.ratePencePerKwh));
  const highestExport = Math.max(...tariff.exportRates.map(r => r.ratePencePerKwh));

  // Apply spread change
  const adjustedExport = highestExport * (1 + spreadChangePercent / 100);

  // Revenue per cycle = (export revenue - import cost) for usable capacity
  const usableCapacity = capacityKwh * efficiency;
  const importCost = capacityKwh * cheapestImport; // cost to fully charge
  const exportRevenue = usableCapacity * adjustedExport; // revenue from discharge

  return exportRevenue - importCost; // pence per cycle
}

/**
 * Calculate hours in cheap import window for a tariff.
 */
function getCheapWindowHours(rates: TariffRate[]): number {
  if (rates.length === 0) return 6; // default 6 hours
  const minRate = Math.min(...rates.map(r => r.ratePencePerKwh));
  const cheapRates = rates.filter(r => r.ratePencePerKwh <= minRate * 1.1);
  let totalHours = 0;
  for (const rate of cheapRates) {
    const [startH, startM] = rate.periodStart.split(':').map(Number);
    const [endH, endM] = rate.periodEnd.split(':').map(Number);
    let start = startH + startM / 60;
    let end = endH + endM / 60;
    if (end <= start) end += 24; // crosses midnight
    totalHours += end - start;
  }
  return totalHours || 6;
}

// --- Core Calculation ---

/**
 * Calculate a single scenario projection over 10 years.
 */
export function calculateScenario(
  system: BatterySystem,
  tariff: Tariff,
  assumptions: ScenarioAssumptions,
  years: number = 10,
): YearlyProjection[] {
  const projections: YearlyProjection[] = [];
  const totalCapex = system.installCost * (1 + assumptions.hardwareCostChangePercent / 100)
    + (system.installCost * 0.15 * (1 + assumptions.installCostChangePercent / 100)); // install ~15% of hardware

  let cumulativeRevenue = 0;

  for (let year = 1; year <= years; year++) {
    // Battery capacity degrades each year
    const capacityRemaining = 1 - (assumptions.batteryDegradationPercent / 100 * year);
    const effectiveCapacity = system.totalCapacityKwh * Math.max(capacityRemaining, 0.5); // floor at 50%

    // Energy inflation compounds
    const inflationMultiplier = Math.pow(1 + assumptions.energyInflationPercent / 100, year - 1);

    // Daily arbitrage revenue (pence)
    const dailyCycleRevenue = calculateDailyCycleRevenuePence(
      effectiveCapacity,
      system.roundTripEfficiency,
      tariff,
      assumptions.iofSpreadChangePercent,
    );
    const dailyArbitrageRevenue = dailyCycleRevenue * assumptions.cyclesPerDay * inflationMultiplier;

    // Annual arbitrage revenue (convert pence to pounds)
    const annualArbitrageRevenue = (dailyArbitrageRevenue * 365) / 100;

    // Saving Sessions revenue
    // Sessions reward baseline reduction, not full battery discharge.
    // Realistic discharge per session: ~30-60kWh for large systems, capped at 1.5hr * discharge rate.
    // For smaller systems, capped at effective capacity.
    const maxSessionDischargeKwh = Math.min(
      effectiveCapacity,
      system.maxDischargeRateKw * 1.5, // 1.5 hour typical session length
    );
    const savingSessionRevenue =
      (assumptions.savingSessionsPerYear *
        assumptions.savingSessionRatePencePerKwh *
        maxSessionDischargeKwh) / 100; // pence to pounds

    // Flexibility market revenue
    const flexRevenue = assumptions.flexibilityRevenuePerHomePerYear;

    // Solar self-consumption savings (if solar installed)
    let solarSavings = 0;
    if (system.solarPvKwp) {
      // ~900 kWh per kWp in Lancashire, self-consumption saves import cost
      const solarGeneration = system.solarPvKwp * 900;
      const selfConsumed = solarGeneration * (assumptions.solarSelfConsumptionPercent / 100);
      const avgImportRate = tariff.importRates.reduce((sum, r) => sum + r.ratePencePerKwh, 0) / tariff.importRates.length;
      solarSavings = (selfConsumed * avgImportRate * inflationMultiplier) / 100;
    }

    const grossRevenue = annualArbitrageRevenue + savingSessionRevenue + flexRevenue + solarSavings;

    // Costs
    const homeownerPayment = 100 * 12; // £100/month fixed
    const maintenance = system.annualMaintenanceCost * (1 + assumptions.maintenanceCostChangePercent / 100);
    // Insurance scales with system size: ~0.8% of hardware value, min £150, max £1,500
    const insuranceBase = Math.max(150, Math.min(1500, system.installCost * 0.008));
    const insurance = Math.round(insuranceBase);
    // G99, MCS, monitoring amortised over 10 years (~£3,000 one-off = £300/yr)
    const complianceAndMonitoring = 300;

    const netRevenue = grossRevenue - homeownerPayment - maintenance - insurance - complianceAndMonitoring;
    cumulativeRevenue += netRevenue;

    const roi = totalCapex > 0 ? ((cumulativeRevenue / totalCapex) * 100) : 0;

    projections.push({
      year,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      homeownerPayment,
      maintenance: Math.round(maintenance * 100) / 100,
      insurance,
      netRevenue: Math.round(netRevenue * 100) / 100,
      cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
      batteryCapacityRemaining: Math.round(capacityRemaining * 10000) / 100, // as percentage
      roi: Math.round(roi * 100) / 100,
    });
  }

  return projections;
}

/**
 * Calculate all three scenarios at once.
 * Pass overrides to customise any assumption per scenario.
 */
export function calculateAllScenarios(
  system: BatterySystem,
  tariff: Tariff,
  overrides?: {
    best?: Partial<ScenarioAssumptions>;
    likely?: Partial<ScenarioAssumptions>;
    worst?: Partial<ScenarioAssumptions>;
  },
  years: number = 10,
): ThreeScenarioProjection {
  const bestAssumptions = { ...BEST_CASE_DEFAULTS, ...overrides?.best };
  const likelyAssumptions = { ...LIKELY_CASE_DEFAULTS, ...overrides?.likely };
  const worstAssumptions = { ...WORST_CASE_DEFAULTS, ...overrides?.worst };

  return {
    best: calculateScenario(system, tariff, bestAssumptions, years),
    likely: calculateScenario(system, tariff, likelyAssumptions, years),
    worst: calculateScenario(system, tariff, worstAssumptions, years),
  };
}

/**
 * Calculate payback period in months from a projection.
 */
function calculatePaybackMonths(projections: YearlyProjection[], totalCapex: number): number {
  for (let i = 0; i < projections.length; i++) {
    if (projections[i].cumulativeRevenue >= totalCapex) {
      if (i === 0) {
        // Payback within first year
        const monthlyRate = projections[0].netRevenue / 12;
        return monthlyRate > 0 ? Math.ceil(totalCapex / monthlyRate) : 999;
      }
      // Interpolate between years
      const prevCumulative = projections[i - 1].cumulativeRevenue;
      const yearlyNet = projections[i].netRevenue;
      const remainingToPayback = totalCapex - prevCumulative;
      const monthsIntoYear = yearlyNet > 0 ? (remainingToPayback / yearlyNet) * 12 : 12;
      return Math.ceil(i * 12 + monthsIntoYear);
    }
  }
  return 999; // no payback within projection period
}

/**
 * Simple IRR calculation using Newton's method.
 */
function calculateIrr(cashFlows: number[], maxIterations: number = 100): number {
  let rate = 0.1; // initial guess 10%

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / discountFactor;
      if (t > 0) {
        dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < 0.01) break;
    if (dnpv === 0) break;

    rate = rate - npv / dnpv;

    // Clamp to reasonable range
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate;
}

/**
 * Calculate NPV at a given discount rate.
 */
function calculateNpv(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cf, t) => {
    return npv + cf / Math.pow(1 + discountRate, t);
  }, 0);
}

/**
 * Summarise a three-scenario projection into key metrics.
 */
export function summariseScenarios(
  projection: ThreeScenarioProjection,
  system: BatterySystem,
  annualDebtService: number = 0,
): ThreeScenarioSummary {
  const totalCapex = system.installCost * 1.15; // hardware + ~15% install

  function summarise(projections: YearlyProjection[]) {
    const cashFlows = [-totalCapex, ...projections.map(p => p.netRevenue)];
    const irr = calculateIrr(cashFlows);
    const npv = calculateNpv(cashFlows, 0.08); // 8% discount rate
    const avgNetRevenue = projections.reduce((sum, p) => sum + p.netRevenue, 0) / projections.length;
    const dscr = annualDebtService > 0
      ? avgNetRevenue / annualDebtService
      : projections.length > 0 ? projections[0].grossRevenue / (totalCapex / 10) : 0; // simplified

    return {
      paybackMonths: calculatePaybackMonths(projections, totalCapex),
      tenYearIrr: Math.round(irr * 10000) / 100, // as percentage
      tenYearNpv: Math.round(npv * 100) / 100,
      annualNetRevenue: Math.round(avgNetRevenue * 100) / 100,
      dscr: Math.round(dscr * 100) / 100,
    };
  }

  return {
    best: summarise(projection.best),
    likely: summarise(projection.likely),
    worst: summarise(projection.worst),
  };
}

/**
 * Get the colour for a scenario type (for charts and UI).
 */
export function getScenarioColour(type: ScenarioType): string {
  const colours: Record<ScenarioType, string> = {
    best: 'var(--color-scenario-best)',
    likely: 'var(--color-scenario-likely)',
    worst: 'var(--color-scenario-worst)',
  };
  return colours[type];
}

/**
 * Get the hex colour for a scenario type (for Recharts).
 */
export function getScenarioHex(type: ScenarioType): string {
  const colours: Record<ScenarioType, string> = {
    best: '#10B981',
    likely: '#3B82F6',
    worst: '#F59E0B',
  };
  return colours[type];
}

/**
 * Format currency for display.
 */
export function formatGbp(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a payback range from three scenarios.
 */
export function formatPaybackRange(summary: ThreeScenarioSummary): string {
  const min = Math.min(summary.best.paybackMonths, summary.likely.paybackMonths, summary.worst.paybackMonths);
  const max = Math.max(summary.best.paybackMonths, summary.likely.paybackMonths, summary.worst.paybackMonths);
  return `${min}–${max} months (likely: ${summary.likely.paybackMonths})`;
}

/**
 * Get DSCR traffic light status.
 * Returns 'green' if all above covenant, 'amber' if only worst below, 'red' if likely below.
 */
export function getDscrStatus(
  summary: ThreeScenarioSummary,
  covenantThreshold: number = 1.2,
): 'green' | 'amber' | 'red' {
  if (summary.likely.dscr < covenantThreshold) return 'red';
  if (summary.worst.dscr < covenantThreshold) return 'amber';
  return 'green';
}
