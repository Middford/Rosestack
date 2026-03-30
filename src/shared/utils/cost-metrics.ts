/**
 * Cost Metrics, Benchmarking & Payback Engine
 *
 * Pure calculation functions — no DB, no React, no side effects.
 * All functions take data in, return numbers out.
 */

import type {
  CostBreakdownInput,
  CostMetricKey,
  CostMetricRating,
  ExportSensitivityPoint,
  ExportSensitivityResult,
  FiveCostMetrics,
  MonthlyPaybackEntry,
  MonthlyPaybackParams,
  MonthlyPaybackResult,
  RevenueByStream,
  SeasonalWeights,
} from "./cost-metrics-types";

import {
  COST_METRIC_THRESHOLDS,
  DEFAULT_SEASONAL_WEIGHTS,
} from "./cost-metrics-types";

// ---------------------------------------------------------------------------
// 1. Five Cost Metrics
// ---------------------------------------------------------------------------

/**
 * Calculate all five cost-per-kWh metrics.
 *
 * Formulas from the spec:
 *   Hardware £/kWh  = battery_module_cost / gross_capacity
 *   System £/kWh    = (battery + inverter + gateway + ancillaries) / gross_capacity
 *   Installed £/kWh = (system + labour + commissioning + G99 + DNO) / gross_capacity
 *   Effective £/kWh = installed_cost / (gross × efficiency × (1 - year1_degradation))
 *   LCOS £/kWh      = (installed + Σ(opex × (1+inflation)^yr)) / Σ(yearly_throughput)
 */
export function calculateFiveCostMetrics(
  input: CostBreakdownInput,
): FiveCostMetrics {
  const {
    batteryModuleCostGbp,
    inverterCostGbp,
    gatewayCostGbp,
    ancillaryCostGbp,
    labourCostGbp,
    commissioningCostGbp,
    g99CostGbp,
    dnoCostGbp,
    grossCapacityKwh,
    roundTripEfficiency,
    year1DegradationPercent,
    annualOpexGbp,
    inflationPercent,
    projectionYears,
    cyclesPerDay,
    degradationRatePercent,
  } = input;

  // Guard against division by zero
  if (grossCapacityKwh <= 0) {
    return {
      hardwarePerKwh: Infinity,
      systemPerKwh: Infinity,
      installedPerKwh: Infinity,
      effectivePerUsableKwh: Infinity,
      lcosPerKwh: Infinity,
    };
  }

  // 1. Hardware £/kWh — battery modules only
  const hardwarePerKwh = batteryModuleCostGbp / grossCapacityKwh;

  // 2. System £/kWh — all hardware, no labour
  const systemCost =
    batteryModuleCostGbp + inverterCostGbp + gatewayCostGbp + ancillaryCostGbp;
  const systemPerKwh = systemCost / grossCapacityKwh;

  // 3. Installed £/kWh — total all-in CAPEX
  const installedCost =
    systemCost + labourCostGbp + commissioningCostGbp + g99CostGbp + dnoCostGbp;
  const installedPerKwh = installedCost / grossCapacityKwh;

  // 4. Effective £/usable kWh — adjusted for efficiency + year 1 degradation
  const usableCapacityYear1 =
    grossCapacityKwh *
    roundTripEfficiency *
    (1 - year1DegradationPercent / 100);
  const effectivePerUsableKwh =
    usableCapacityYear1 > 0 ? installedCost / usableCapacityYear1 : Infinity;

  // 5. LCOS — levelised cost of storage over projection horizon
  //    Numerator: installed cost + sum of inflated annual OPEX
  //    Denominator: sum of yearly throughput (degraded capacity × cycles × 365)
  let totalLifetimeCost = installedCost;
  let totalLifetimeThroughputKwh = 0;

  for (let year = 1; year <= projectionYears; year++) {
    // OPEX with inflation
    const inflatedOpex =
      annualOpexGbp * Math.pow(1 + inflationPercent / 100, year);
    totalLifetimeCost += inflatedOpex;

    // Throughput: degraded capacity × efficiency × cycles × 365
    const capacityFactor = Math.max(
      1 - (degradationRatePercent / 100) * year,
      0.5,
    );
    const yearlyThroughput =
      grossCapacityKwh *
      capacityFactor *
      roundTripEfficiency *
      cyclesPerDay *
      365;
    totalLifetimeThroughputKwh += yearlyThroughput;
  }

  const lcosPerKwh =
    totalLifetimeThroughputKwh > 0
      ? totalLifetimeCost / totalLifetimeThroughputKwh
      : Infinity;

  return {
    hardwarePerKwh: round2(hardwarePerKwh),
    systemPerKwh: round2(systemPerKwh),
    installedPerKwh: round2(installedPerKwh),
    effectivePerUsableKwh: round2(effectivePerUsableKwh),
    lcosPerKwh: round4(lcosPerKwh),
  };
}

// ---------------------------------------------------------------------------
// 2. Traffic-Light Rating
// ---------------------------------------------------------------------------

export function rateCostMetric(
  metric: CostMetricKey,
  value: number,
): CostMetricRating {
  const threshold = COST_METRIC_THRESHOLDS[metric];
  let rating: "green" | "amber" | "red";

  if (value <= threshold.green) {
    rating = "green";
  } else if (value <= threshold.amber) {
    rating = "amber";
  } else {
    rating = "red";
  }

  return { metric, value, rating, label: threshold.label };
}

export function rateAllMetrics(metrics: FiveCostMetrics): CostMetricRating[] {
  return (Object.keys(metrics) as CostMetricKey[]).map((key) =>
    rateCostMetric(key, metrics[key]),
  );
}

// ---------------------------------------------------------------------------
// 3. Monthly Payback Engine (with seasonal weighting)
// ---------------------------------------------------------------------------

/**
 * Month-by-month payback calculation with seasonal revenue weighting.
 *
 * Each month's revenue is:
 *   base = annual / 12
 *   weighted = base × seasonal_weight[calendarMonth] × degradation_factor[year]
 *
 * The overall seasonal weight for a month is a revenue-share-weighted average
 * of the per-stream seasonal weights.
 */
export function calculateMonthlyPayback(
  params: MonthlyPaybackParams,
): MonthlyPaybackResult {
  const {
    annualRevenueByStream,
    annualCostsGbp,
    installedCostGbp,
    seasonalWeights = DEFAULT_SEASONAL_WEIGHTS,
    projectionMonths = 120,
    degradationRatePercent,
    startMonth = 1,
  } = params;

  const streams = annualRevenueByStream;
  const totalAnnualRevenue =
    streams.arbitrage +
    streams.solar +
    streams.savingSessions +
    streams.flexibility +
    streams.seg;

  // Monthly base for each stream
  const monthlyBase = {
    arbitrage: streams.arbitrage / 12,
    solar: streams.solar / 12,
    savingSessions: streams.savingSessions / 12,
    flexibility: streams.flexibility / 12,
    seg: streams.seg / 12,
  };

  const monthlyCost = annualCostsGbp / 12;
  const months: MonthlyPaybackEntry[] = [];
  let cumulative = 0;
  let paybackMonth = 999;

  for (let m = 1; m <= projectionMonths; m++) {
    // Calendar month (1-12) accounting for install month offset
    const calendarMonth = ((startMonth - 1 + m - 1) % 12) + 1;
    const monthIndex = calendarMonth - 1; // 0-indexed for array lookup

    // Year index for degradation (year 0 = first year)
    const yearIndex = Math.floor((m - 1) / 12);
    const degradationFactor = Math.max(
      1 - (degradationRatePercent / 100) * yearIndex,
      0.5,
    );

    // Per-stream seasonally weighted revenue
    const arbRevenue =
      monthlyBase.arbitrage *
      seasonalWeights.arbitrage[monthIndex] *
      degradationFactor;
    const solarRevenue =
      monthlyBase.solar *
      seasonalWeights.solar[monthIndex] *
      degradationFactor;
    const ssRevenue =
      monthlyBase.savingSessions *
      seasonalWeights.savingSessions[monthIndex] *
      degradationFactor;
    const flexRevenue =
      monthlyBase.flexibility *
      seasonalWeights.flexibility[monthIndex] *
      degradationFactor;
    // SEG doesn't have seasonal weighting (fixed rate) but degrades with capacity
    const segRevenue = monthlyBase.seg * degradationFactor;

    const grossRevenue =
      arbRevenue + solarRevenue + ssRevenue + flexRevenue + segRevenue;

    // Overall seasonal weight (for display)
    const seasonalWeight =
      totalAnnualRevenue > 0
        ? grossRevenue / ((totalAnnualRevenue / 12) * degradationFactor || 1)
        : 1;

    const net = grossRevenue - monthlyCost;
    cumulative += net;

    months.push({
      month: m,
      calendarMonth,
      grossRevenueGbp: round2(grossRevenue),
      costsGbp: round2(monthlyCost),
      netRevenueGbp: round2(net),
      cumulativeNetGbp: round2(cumulative),
      seasonalWeight: round2(seasonalWeight),
    });

    if (cumulative >= installedCostGbp && paybackMonth === 999) {
      paybackMonth = m;
    }
  }

  return { months, paybackMonth, installedCostGbp };
}

// ---------------------------------------------------------------------------
// 4. Export Sensitivity Analysis
// ---------------------------------------------------------------------------

/**
 * Calculate payback at multiple DNO export limits.
 *
 * For each export limit, we scale the arbitrage and Saving Sessions revenue
 * proportionally to the effective export capacity, since those are the
 * streams directly constrained by the export limit.
 */
export function calculateExportSensitivity(params: {
  /** Base annual revenue at the current export limit */
  baseRevenueByStream: RevenueByStream;
  /** The current effective export kW */
  baseExportKw: number;
  /** Annual costs */
  annualCostsGbp: number;
  /** Total installed cost */
  installedCostGbp: number;
  /** Max inverter discharge rate (ceiling for export scaling) */
  maxInverterKw: number;
  /** Degradation rate */
  degradationRatePercent: number;
  /** Contract term in months */
  contractTermMonths?: number;
  /** Export limits to test */
  exportLimits?: number[];
}): ExportSensitivityResult {
  const {
    baseRevenueByStream,
    baseExportKw,
    annualCostsGbp,
    installedCostGbp,
    maxInverterKw,
    degradationRatePercent,
    contractTermMonths = 120,
    exportLimits = [3.68, 5, 10, 15, 25, 50, 75, 100],
  } = params;

  const points: ExportSensitivityPoint[] = [];
  let bestPayback = 999;
  let optimalExportKw = exportLimits[0];

  for (const exportKw of exportLimits) {
    // Effective export is min of requested limit and inverter capacity
    const effectiveExport = Math.min(exportKw, maxInverterKw);

    // Scale export-dependent revenue proportionally
    const scaleFactor =
      baseExportKw > 0 ? effectiveExport / baseExportKw : 0;

    const scaledRevenue: RevenueByStream = {
      arbitrage: baseRevenueByStream.arbitrage * scaleFactor,
      savingSessions: baseRevenueByStream.savingSessions * scaleFactor,
      // These don't scale with export limit
      solar: baseRevenueByStream.solar,
      flexibility: baseRevenueByStream.flexibility,
      seg: baseRevenueByStream.seg,
    };

    const totalAnnualRevenue = Object.values(scaledRevenue).reduce(
      (a, b) => a + b,
      0,
    );

    const payback = calculateMonthlyPayback({
      annualRevenueByStream: scaledRevenue,
      annualCostsGbp,
      installedCostGbp,
      degradationRatePercent,
    });

    const point: ExportSensitivityPoint = {
      exportKw,
      paybackMonths: payback.paybackMonth,
      annualRevenueGbp: round2(totalAnnualRevenue),
      viable: payback.paybackMonth < contractTermMonths,
    };

    points.push(point);

    if (payback.paybackMonth < bestPayback) {
      bestPayback = payback.paybackMonth;
      optimalExportKw = exportKw;
    }
  }

  return { points, contractTermMonths, optimalExportKw };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
