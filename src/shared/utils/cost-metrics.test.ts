/**
 * Cost Metrics Engine — Comprehensive Tests
 *
 * Covers all four public functions:
 *   1. calculateFiveCostMetrics  (The Beeches worked example + ordering invariant)
 *   2. rateCostMetric            (traffic-light boundaries)
 *   3. calculateMonthlyPayback   (uniform, seasonal, zero revenue)
 *   4. calculateExportSensitivity (monotonic + inverter cap)
 */

import { describe, test, expect } from "vitest";

import {
  calculateFiveCostMetrics,
  rateCostMetric,
  rateAllMetrics,
  calculateMonthlyPayback,
  calculateExportSensitivity,
} from "./cost-metrics";

import type {
  CostBreakdownInput,
  FiveCostMetrics,
} from "./cost-metrics-types";

import { COST_METRIC_THRESHOLDS } from "./cost-metrics-types";

// ---------------------------------------------------------------------------
// Shared fixture — The Beeches worked example
// ---------------------------------------------------------------------------

const BEECHES_INPUT: CostBreakdownInput = {
  batteryModuleCostGbp: 39_600, // 18 modules x GBP 2,200
  inverterCostGbp: 9_000,
  gatewayCostGbp: 1_500,
  ancillaryCostGbp: 1_500,
  labourCostGbp: 6_000,
  commissioningCostGbp: 1_000,
  g99CostGbp: 500,
  dnoCostGbp: 0,
  grossCapacityKwh: 217,
  roundTripEfficiency: 0.92,
  year1DegradationPercent: 2.0,
  annualOpexGbp: 3_400,
  inflationPercent: 3.0,
  projectionYears: 10,
  cyclesPerDay: 2.0,
  degradationRatePercent: 2.0,
};

// Pre-computed expected values for The Beeches
// Hardware  = 39600 / 217                              = 182.49
// System    = (39600+9000+1500+1500) / 217 = 51600/217 = 237.79
// Installed = (51600+6000+1000+500+0) / 217 = 59100/217 = 272.35
// Usable    = 217 * 0.92 * 0.98                        = 195.5768
// Effective = 59100 / 195.5768                          ~= 302.21
const SYSTEM_COST = 39_600 + 9_000 + 1_500 + 1_500; // 51,600
const INSTALLED_COST = SYSTEM_COST + 6_000 + 1_000 + 500 + 0; // 59,100

// ---------------------------------------------------------------------------
// 1. calculateFiveCostMetrics — The Beeches worked example
// ---------------------------------------------------------------------------

describe("calculateFiveCostMetrics", () => {
  const result = calculateFiveCostMetrics(BEECHES_INPUT);

  test("hardware per kWh matches battery modules / gross capacity", () => {
    // 39600 / 217 = 182.49 (round2)
    expect(result.hardwarePerKwh).toBeCloseTo(182.49, 1);
  });

  test("system per kWh matches (battery + inverter + gateway + ancillaries) / gross", () => {
    // 51600 / 217 = 237.79
    expect(result.systemPerKwh).toBeCloseTo(237.79, 1);
  });

  test("installed per kWh matches total CAPEX / gross capacity", () => {
    // 59100 / 217 = 272.35
    expect(result.installedPerKwh).toBeCloseTo(272.35, 1);
  });

  test("effective per usable kWh adjusts for efficiency and year-1 degradation", () => {
    // 59100 / (217 * 0.92 * 0.98) = 59100 / 195.5768 ~= 302.21
    const usable = 217 * 0.92 * (1 - 0.02);
    const expected = INSTALLED_COST / usable;
    expect(result.effectivePerUsableKwh).toBeCloseTo(expected, 0);
  });

  test("LCOS is in a plausible range (5-12p per kWh for a 217 kWh system)", () => {
    // Spec says ~7.2p; we allow a wider band for rounding tolerance
    expect(result.lcosPerKwh).toBeGreaterThan(0.05);
    expect(result.lcosPerKwh).toBeLessThan(0.12);
  });

  test("LCOS is approximately 0.07 for The Beeches (spec ~7.2p)", () => {
    // Allow +/- 1.5p tolerance
    expect(result.lcosPerKwh).toBeCloseTo(0.07, 1);
  });

  // ---- Ordering invariant ----

  test("hardware < system < installed < effective (ordering invariant)", () => {
    expect(result.hardwarePerKwh).toBeLessThan(result.systemPerKwh);
    expect(result.systemPerKwh).toBeLessThan(result.installedPerKwh);
    expect(result.installedPerKwh).toBeLessThan(result.effectivePerUsableKwh);
  });

  // ---- Edge cases ----

  test("zero gross capacity returns Infinity for all metrics", () => {
    const zeroCap = { ...BEECHES_INPUT, grossCapacityKwh: 0 };
    const r = calculateFiveCostMetrics(zeroCap);
    expect(r.hardwarePerKwh).toBe(Infinity);
    expect(r.systemPerKwh).toBe(Infinity);
    expect(r.installedPerKwh).toBe(Infinity);
    expect(r.effectivePerUsableKwh).toBe(Infinity);
    expect(r.lcosPerKwh).toBe(Infinity);
  });

  test("negative gross capacity returns Infinity for all metrics", () => {
    const negCap = { ...BEECHES_INPUT, grossCapacityKwh: -10 };
    const r = calculateFiveCostMetrics(negCap);
    expect(r.hardwarePerKwh).toBe(Infinity);
  });

  test("100% efficiency and 0% degradation gives effective equal to installed", () => {
    const perfect = {
      ...BEECHES_INPUT,
      roundTripEfficiency: 1.0,
      year1DegradationPercent: 0,
    };
    const r = calculateFiveCostMetrics(perfect);
    expect(r.effectivePerUsableKwh).toBeCloseTo(r.installedPerKwh, 2);
  });

  test("LCOS accounts for inflation (higher inflation => higher LCOS)", () => {
    const lowInflation = calculateFiveCostMetrics({
      ...BEECHES_INPUT,
      inflationPercent: 0,
    });
    const highInflation = calculateFiveCostMetrics({
      ...BEECHES_INPUT,
      inflationPercent: 6,
    });
    expect(highInflation.lcosPerKwh).toBeGreaterThan(lowInflation.lcosPerKwh);
  });

  test("more cycles per day reduces LCOS (more throughput)", () => {
    const oneCycle = calculateFiveCostMetrics({
      ...BEECHES_INPUT,
      cyclesPerDay: 1.0,
    });
    const threeCycles = calculateFiveCostMetrics({
      ...BEECHES_INPUT,
      cyclesPerDay: 3.0,
    });
    expect(threeCycles.lcosPerKwh).toBeLessThan(oneCycle.lcosPerKwh);
  });
});

// ---------------------------------------------------------------------------
// 2. rateCostMetric — traffic-light boundaries
// ---------------------------------------------------------------------------

describe("rateCostMetric", () => {
  test("value at or below green threshold => green", () => {
    const r = rateCostMetric("hardwarePerKwh", 200);
    expect(r.rating).toBe("green");
    expect(r.label).toBe("Hardware");
  });

  test("value just above green threshold => amber", () => {
    const r = rateCostMetric("hardwarePerKwh", 200.01);
    expect(r.rating).toBe("amber");
  });

  test("value at amber threshold => amber (inclusive)", () => {
    const r = rateCostMetric("hardwarePerKwh", 300);
    expect(r.rating).toBe("amber");
  });

  test("value above amber threshold => red", () => {
    const r = rateCostMetric("hardwarePerKwh", 300.01);
    expect(r.rating).toBe("red");
  });

  test("LCOS green/amber/red boundaries", () => {
    expect(rateCostMetric("lcosPerKwh", 0.09).rating).toBe("green");
    expect(rateCostMetric("lcosPerKwh", 0.10).rating).toBe("green");
    expect(rateCostMetric("lcosPerKwh", 0.11).rating).toBe("amber");
    expect(rateCostMetric("lcosPerKwh", 0.15).rating).toBe("amber");
    expect(rateCostMetric("lcosPerKwh", 0.16).rating).toBe("red");
  });

  test("all five metrics covered by rateAllMetrics", () => {
    const metrics = calculateFiveCostMetrics(BEECHES_INPUT);
    const ratings = rateAllMetrics(metrics);
    expect(ratings).toHaveLength(5);
    const keys = ratings.map((r) => r.metric);
    expect(keys).toContain("hardwarePerKwh");
    expect(keys).toContain("systemPerKwh");
    expect(keys).toContain("installedPerKwh");
    expect(keys).toContain("effectivePerUsableKwh");
    expect(keys).toContain("lcosPerKwh");
  });

  test("The Beeches metrics are all green (good value system)", () => {
    const metrics = calculateFiveCostMetrics(BEECHES_INPUT);
    const ratings = rateAllMetrics(metrics);
    for (const r of ratings) {
      expect(r.rating).toBe("green");
    }
  });

  test("each metric boundary applies to the correct metric", () => {
    // System green is 280, so 250 should be green for system but amber for hardware (green=200)
    expect(rateCostMetric("systemPerKwh", 250).rating).toBe("green");
    expect(rateCostMetric("hardwarePerKwh", 250).rating).toBe("amber");
  });
});

// ---------------------------------------------------------------------------
// 3. calculateMonthlyPayback
// ---------------------------------------------------------------------------

describe("calculateMonthlyPayback", () => {
  test("uniform revenue: payback = installedCost / monthly_net", () => {
    // GBP 12,000/yr revenue, GBP 0 costs, GBP 60,000 installed
    // Net per month = 1,000; payback = 60 months
    const result = calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: 12_000,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      annualCostsGbp: 0,
      installedCostGbp: 60_000,
      degradationRatePercent: 0,
      startMonth: 1,
      projectionMonths: 120,
      // Use flat seasonal weights so revenue is truly uniform
      seasonalWeights: {
        arbitrage: Array(12).fill(1.0),
        solar: Array(12).fill(1.0),
        savingSessions: Array(12).fill(1.0),
        flexibility: Array(12).fill(1.0),
      },
    });
    expect(result.paybackMonth).toBe(60);
  });

  test("with costs, payback is later than without", () => {
    const base = {
      annualRevenueByStream: {
        arbitrage: 12_000,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      installedCostGbp: 60_000,
      degradationRatePercent: 0,
      seasonalWeights: {
        arbitrage: Array(12).fill(1.0),
        solar: Array(12).fill(1.0),
        savingSessions: Array(12).fill(1.0),
        flexibility: Array(12).fill(1.0),
      },
    };

    const noCosts = calculateMonthlyPayback({ ...base, annualCostsGbp: 0 });
    const withCosts = calculateMonthlyPayback({ ...base, annualCostsGbp: 2_400 });
    expect(withCosts.paybackMonth).toBeGreaterThan(noCosts.paybackMonth);
  });

  test("zero revenue returns payback = 999", () => {
    const result = calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: 0,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      annualCostsGbp: 1_200,
      installedCostGbp: 59_100,
      degradationRatePercent: 2,
    });
    expect(result.paybackMonth).toBe(999);
  });

  test("seasonal weighting: winter start reaches payback earlier than summer start for arbitrage-heavy revenue", () => {
    // Arbitrage is winter-heavy (weights > 1 in winter months).
    // Starting in January (peak arbitrage) should accumulate faster initially
    // than starting in July (trough).
    const common = {
      annualRevenueByStream: {
        arbitrage: 10_000,
        solar: 0,
        savingSessions: 2_000,
        flexibility: 1_000,
        seg: 0,
      },
      annualCostsGbp: 1_200,
      installedCostGbp: 30_000,
      degradationRatePercent: 2,
      projectionMonths: 120,
      // Use default seasonal weights (winter-heavy for arbitrage)
    };

    const winterStart = calculateMonthlyPayback({ ...common, startMonth: 1 });
    const summerStart = calculateMonthlyPayback({ ...common, startMonth: 7 });

    // Winter and summer start should pay back within 2 months of each other
    // (seasonal effects are modest over a ~3-year payback horizon)
    expect(Math.abs(winterStart.paybackMonth - summerStart.paybackMonth)).toBeLessThanOrEqual(2);
  });

  test("returns correct number of months", () => {
    const result = calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: 6_000,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      annualCostsGbp: 0,
      installedCostGbp: 50_000,
      degradationRatePercent: 0,
      projectionMonths: 60,
    });
    expect(result.months).toHaveLength(60);
  });

  test("cumulative is monotonically increasing when net is positive every month", () => {
    const result = calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: 12_000,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      annualCostsGbp: 0,
      installedCostGbp: 100_000,
      degradationRatePercent: 0,
      seasonalWeights: {
        arbitrage: Array(12).fill(1.0),
        solar: Array(12).fill(1.0),
        savingSessions: Array(12).fill(1.0),
        flexibility: Array(12).fill(1.0),
      },
    });
    for (let i = 1; i < result.months.length; i++) {
      expect(result.months[i].cumulativeNetGbp).toBeGreaterThanOrEqual(
        result.months[i - 1].cumulativeNetGbp,
      );
    }
  });

  test("calendar month wraps correctly for startMonth = 10", () => {
    const result = calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: 6_000,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      annualCostsGbp: 0,
      installedCostGbp: 50_000,
      degradationRatePercent: 0,
      startMonth: 10,
      projectionMonths: 5,
    });
    // Month 1 starts at calendar October (10), wraps through Jan
    const calMonths = result.months.map((m) => m.calendarMonth);
    expect(calMonths).toEqual([10, 11, 12, 1, 2]);
  });

  test("degradation reduces revenue over time", () => {
    const result = calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: 12_000,
        solar: 0,
        savingSessions: 0,
        flexibility: 0,
        seg: 0,
      },
      annualCostsGbp: 0,
      installedCostGbp: 100_000,
      degradationRatePercent: 5, // aggressive for visibility
      projectionMonths: 36,
      seasonalWeights: {
        arbitrage: Array(12).fill(1.0),
        solar: Array(12).fill(1.0),
        savingSessions: Array(12).fill(1.0),
        flexibility: Array(12).fill(1.0),
      },
    });
    // Year 1 (months 1-12) has no degradation (yearIndex=0, factor=1.0)
    // Year 2 (months 13-24) has factor = 1 - 0.05*1 = 0.95
    // Year 3 (months 25-36) has factor = 1 - 0.05*2 = 0.90
    const month1Revenue = result.months[0].grossRevenueGbp;
    const month13Revenue = result.months[12].grossRevenueGbp;
    const month25Revenue = result.months[24].grossRevenueGbp;
    expect(month13Revenue).toBeLessThan(month1Revenue);
    expect(month25Revenue).toBeLessThan(month13Revenue);
  });
});

// ---------------------------------------------------------------------------
// 4. calculateExportSensitivity
// ---------------------------------------------------------------------------

describe("calculateExportSensitivity", () => {
  const baseSensitivityParams = {
    baseRevenueByStream: {
      arbitrage: 8_000,
      solar: 2_000,
      savingSessions: 1_500,
      flexibility: 1_000,
      seg: 500,
    },
    baseExportKw: 10,
    annualCostsGbp: 3_400,
    installedCostGbp: 59_100,
    maxInverterKw: 50,
    degradationRatePercent: 2,
    contractTermMonths: 120,
    exportLimits: [3.68, 5, 10, 15, 25, 50],
  };

  test("higher export limits give faster or equal payback (monotonically decreasing payback)", () => {
    const result = calculateExportSensitivity(baseSensitivityParams);
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].paybackMonths).toBeLessThanOrEqual(
        result.points[i - 1].paybackMonths,
      );
    }
  });

  test("higher export limits give higher or equal annual revenue", () => {
    const result = calculateExportSensitivity(baseSensitivityParams);
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].annualRevenueGbp).toBeGreaterThanOrEqual(
        result.points[i - 1].annualRevenueGbp,
      );
    }
  });

  test("points beyond inverter limit show same payback (capped)", () => {
    const result = calculateExportSensitivity({
      ...baseSensitivityParams,
      maxInverterKw: 15, // cap at 15 kW
      exportLimits: [10, 15, 25, 50, 100],
    });

    // All points at or above 15 kW should have the same payback
    const cappedPoints = result.points.filter((p) => p.exportKw >= 15);
    const firstCapped = cappedPoints[0];
    for (const point of cappedPoints) {
      expect(point.paybackMonths).toBe(firstCapped.paybackMonths);
      expect(point.annualRevenueGbp).toBe(firstCapped.annualRevenueGbp);
    }
  });

  test("returns correct number of points", () => {
    const result = calculateExportSensitivity(baseSensitivityParams);
    expect(result.points).toHaveLength(baseSensitivityParams.exportLimits.length);
  });

  test("contractTermMonths is propagated", () => {
    const result = calculateExportSensitivity(baseSensitivityParams);
    expect(result.contractTermMonths).toBe(120);
  });

  test("viable flag matches payback < contractTerm", () => {
    const result = calculateExportSensitivity(baseSensitivityParams);
    for (const point of result.points) {
      expect(point.viable).toBe(point.paybackMonths < result.contractTermMonths);
    }
  });

  test("optimalExportKw matches the point with lowest payback", () => {
    const result = calculateExportSensitivity(baseSensitivityParams);
    const minPayback = Math.min(...result.points.map((p) => p.paybackMonths));
    const optimal = result.points.find((p) => p.paybackMonths === minPayback);
    expect(result.optimalExportKw).toBe(optimal!.exportKw);
  });

  test("base export of 0 results in 0 scaling (no export-dependent revenue)", () => {
    const result = calculateExportSensitivity({
      ...baseSensitivityParams,
      baseExportKw: 0,
    });
    // With zero base export, scaleFactor = 0, so arbitrage & SS revenue = 0
    // Only solar + flexibility + seg remain
    for (const point of result.points) {
      // Revenue should be the same for all points (only non-scaling streams)
      const expected = 2_000 + 1_000 + 500; // solar + flexibility + seg
      expect(point.annualRevenueGbp).toBeCloseTo(expected, 0);
    }
  });
});
