import { describe, it, expect } from 'vitest';
import {
  evaluateRag,
  calculateMetricValue,
  calculateAllMetrics,
  getMetricsByRag,
  getPortfolioRagSummary,
  COST_METRICS,
  RETURN_METRICS,
  ALL_METRICS,
  type MetricDefinition,
  type AllMetricsParams,
} from '@/modules/finance/metrics';

// ============================================================
// Fixtures
// ============================================================

/**
 * Healthy system: 192kWh / 96kW, 10-year term, no debt.
 * Based on The Beeches corrected figures from the session handover:
 *   gross revenue ~£18,000/yr, net ~£15,650/yr.
 */
const HEALTHY_PARAMS: AllMetricsParams = {
  totalCapexGbp: 53708,
  batteryCapacityKwh: 192,
  annualGrossRevenue: 18000,
  annualNetRevenue: 15650,
  annualDebtService: 4800,
  annualOpex: 1150, // maintenance + insurance + monitoring
  annualHomeownerPayment: 1200,
  installCostExHardware: 9550, // g99 + mcs + survey + enclosure + commissioning
  esaTermYears: 10,
  irr10Year: 22.5,
  npv10Year: 35000,
};

/**
 * Distressed system: poor revenue, high costs, heavy debt.
 */
const DISTRESSED_PARAMS: AllMetricsParams = {
  totalCapexGbp: 80000,
  batteryCapacityKwh: 192,
  annualGrossRevenue: 8000,
  annualNetRevenue: 3000,
  annualDebtService: 9000,
  annualOpex: 2000,
  annualHomeownerPayment: 1200,
  installCostExHardware: 15000,
  esaTermYears: 10,
  irr10Year: 3.0,
  npv10Year: -5000,
};

// ============================================================
// evaluateRag
// ============================================================

describe('evaluateRag', () => {
  const costMetric: MetricDefinition = {
    id: 'test-cost',
    name: 'Test Cost',
    description: '',
    unit: '£',
    category: 'cost',
    greenThreshold: { below: 100 },
    amberThreshold: { below: 200 },
    higherIsBetter: false,
  };

  const returnMetric: MetricDefinition = {
    id: 'test-return',
    name: 'Test Return',
    description: '',
    unit: '%',
    category: 'return',
    greenThreshold: { above: 20 },
    amberThreshold: { above: 10 },
    higherIsBetter: true,
  };

  it('cost metric: green when below green threshold', () => {
    expect(evaluateRag(costMetric, 50)).toBe('green');
    expect(evaluateRag(costMetric, 99)).toBe('green');
  });

  it('cost metric: amber when between green and amber threshold', () => {
    expect(evaluateRag(costMetric, 100)).toBe('amber');
    expect(evaluateRag(costMetric, 150)).toBe('amber');
    expect(evaluateRag(costMetric, 200)).toBe('amber');
  });

  it('cost metric: red when above amber threshold', () => {
    expect(evaluateRag(costMetric, 201)).toBe('red');
    expect(evaluateRag(costMetric, 500)).toBe('red');
  });

  it('return metric: green when above green threshold', () => {
    expect(evaluateRag(returnMetric, 21)).toBe('green');
    expect(evaluateRag(returnMetric, 100)).toBe('green');
  });

  it('return metric: amber when between amber and green threshold', () => {
    expect(evaluateRag(returnMetric, 20)).toBe('amber');
    expect(evaluateRag(returnMetric, 15)).toBe('amber');
    expect(evaluateRag(returnMetric, 10)).toBe('amber');
  });

  it('return metric: red when below amber threshold', () => {
    expect(evaluateRag(returnMetric, 9)).toBe('red');
    expect(evaluateRag(returnMetric, 0)).toBe('red');
    expect(evaluateRag(returnMetric, -5)).toBe('red');
  });
});

// ============================================================
// Metric Definition Counts
// ============================================================

describe('Metric definitions', () => {
  it('should have exactly 5 cost metrics', () => {
    expect(COST_METRICS).toHaveLength(5);
  });

  it('should have exactly 8 return metrics', () => {
    expect(RETURN_METRICS).toHaveLength(8);
  });

  it('ALL_METRICS should contain all 13 metrics', () => {
    expect(ALL_METRICS).toHaveLength(13);
  });

  it('all cost metrics should have higherIsBetter = false', () => {
    for (const m of COST_METRICS) {
      expect(m.higherIsBetter).toBe(false);
    }
  });

  it('return metrics that are higher-is-better should have higherIsBetter = true', () => {
    // paybackMonths is special: lower is better (higherIsBetter = false)
    const higherBetter = RETURN_METRICS.filter(m => m.id !== 'paybackMonths');
    for (const m of higherBetter) {
      expect(m.higherIsBetter).toBe(true);
    }
  });

  it('all metric IDs should be unique', () => {
    const ids = ALL_METRICS.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each metric should have a non-empty name and description', () => {
    for (const m of ALL_METRICS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// calculateMetricValue
// ============================================================

describe('calculateMetricValue', () => {
  it('should attach the definition and value', () => {
    const def = COST_METRICS[0]; // capexPerKwh
    const result = calculateMetricValue(def, 240);
    expect(result.definition).toBe(def);
    expect(result.value).toBe(240);
  });

  it('capexPerKwh: £240/kWh is green (< £250)', () => {
    const result = calculateMetricValue(COST_METRICS[0], 240);
    expect(result.ragStatus).toBe('green');
  });

  it('capexPerKwh: £300/kWh is amber (£250–350)', () => {
    const result = calculateMetricValue(COST_METRICS[0], 300);
    expect(result.ragStatus).toBe('amber');
  });

  it('capexPerKwh: £400/kWh is red (> £350)', () => {
    const result = calculateMetricValue(COST_METRICS[0], 400);
    expect(result.ragStatus).toBe('red');
  });

  it('irr10Year: 25% is green (> 20%)', () => {
    const irrDef = ALL_METRICS.find(m => m.id === 'irr10Year')!;
    const result = calculateMetricValue(irrDef, 25);
    expect(result.ragStatus).toBe('green');
  });

  it('irr10Year: 15% is amber (10–20%)', () => {
    const irrDef = ALL_METRICS.find(m => m.id === 'irr10Year')!;
    const result = calculateMetricValue(irrDef, 15);
    expect(result.ragStatus).toBe('amber');
  });

  it('irr10Year: 5% is red (< 10%)', () => {
    const irrDef = ALL_METRICS.find(m => m.id === 'irr10Year')!;
    const result = calculateMetricValue(irrDef, 5);
    expect(result.ragStatus).toBe('red');
  });

  it('comparedToLikelyCase: positive percentage when value > likely', () => {
    const def = ALL_METRICS.find(m => m.id === 'irr10Year')!;
    const result = calculateMetricValue(def, 25, 20);
    // (25 - 20) / 20 × 100 = 25%
    expect(result.comparedToLikelyCase).toBeCloseTo(25, 0);
  });

  it('comparedToLikelyCase: negative percentage when value < likely', () => {
    const def = ALL_METRICS.find(m => m.id === 'irr10Year')!;
    const result = calculateMetricValue(def, 15, 20);
    // (15 - 20) / 20 × 100 = -25%
    expect(result.comparedToLikelyCase).toBeCloseTo(-25, 0);
  });

  it('comparedToLikelyCase: undefined when no likely value provided', () => {
    const def = ALL_METRICS[0];
    const result = calculateMetricValue(def, 100);
    expect(result.comparedToLikelyCase).toBeUndefined();
  });
});

// ============================================================
// calculateAllMetrics — Healthy System
// ============================================================

describe('calculateAllMetrics — healthy system', () => {
  let metrics: ReturnType<typeof calculateAllMetrics>;

  beforeAll(() => {
    metrics = calculateAllMetrics(HEALTHY_PARAMS);
  });

  it('should return 13 metrics', () => {
    expect(metrics).toHaveLength(13);
  });

  it('capexPerKwh: £53,708 / 192kWh = £279.7/kWh → amber', () => {
    const m = metrics.find(m => m.definition.id === 'capexPerKwh')!;
    expect(m.value).toBeCloseTo(53708 / 192, 0);
    // 279.7 is between 250 and 350 → amber
    expect(m.ragStatus).toBe('amber');
  });

  it('opexPerHome: £1,150 → amber (£800–1,200)', () => {
    const m = metrics.find(m => m.definition.id === 'opexPerHome')!;
    expect(m.value).toBe(1150);
    expect(m.ragStatus).toBe('amber');
  });

  it('homeownerCostRatio: £1,200 / £18,000 = 6.67% → green (< 10%)', () => {
    const m = metrics.find(m => m.definition.id === 'homeownerCostRatio')!;
    expect(m.value).toBeCloseTo((1200 / 18000) * 100, 1);
    expect(m.ragStatus).toBe('green');
  });

  it('debtServiceRatio: £4,800 / £18,000 = 26.7% → green (< 40%)', () => {
    const m = metrics.find(m => m.definition.id === 'debtServiceRatio')!;
    expect(m.value).toBeCloseTo((4800 / 18000) * 100, 1);
    expect(m.ragStatus).toBe('green');
  });

  it('installCostPerProperty: £9,550 → amber (£8,000–12,000)', () => {
    const m = metrics.find(m => m.definition.id === 'installCostPerProperty')!;
    expect(m.value).toBe(9550);
    expect(m.ragStatus).toBe('amber');
  });

  it('paybackMonths: £53,708 / £15,650 × 12 = 41.1 months → green (< 60)', () => {
    const m = metrics.find(m => m.definition.id === 'paybackMonths')!;
    expect(m.value).toBeCloseTo((53708 / 15650) * 12, 0);
    expect(m.ragStatus).toBe('green');
  });

  it('irr10Year: 22.5% → green (> 20%)', () => {
    const m = metrics.find(m => m.definition.id === 'irr10Year')!;
    expect(m.value).toBe(22.5);
    expect(m.ragStatus).toBe('green');
  });

  it('npv10Year: £35,000 → green (> £20,000)', () => {
    const m = metrics.find(m => m.definition.id === 'npv10Year')!;
    expect(m.value).toBe(35000);
    expect(m.ragStatus).toBe('green');
  });

  it('netRevenueYield: £15,650 / £53,708 = 29.1% → green (> 15%)', () => {
    const m = metrics.find(m => m.definition.id === 'netRevenueYield')!;
    expect(m.value).toBeCloseTo((15650 / 53708) * 100, 0);
    expect(m.ragStatus).toBe('green');
  });

  it('grossMargin: (£18,000 - £1,200) / £18,000 = 93.3% → green (> 90%)', () => {
    const m = metrics.find(m => m.definition.id === 'grossMargin')!;
    expect(m.value).toBeCloseTo(((18000 - 1200) / 18000) * 100, 0);
    expect(m.ragStatus).toBe('green');
  });

  it('dscr: £15,650 / £4,800 = 3.26 → green (> 1.5)', () => {
    const m = metrics.find(m => m.definition.id === 'dscr')!;
    expect(m.value).toBeCloseTo(15650 / 4800, 1);
    expect(m.ragStatus).toBe('green');
  });

  it('revenuePerKwh: £15,650 / 192 = £81.5/kWh → green (> £60)', () => {
    const m = metrics.find(m => m.definition.id === 'revenuePerKwh')!;
    expect(m.value).toBeCloseTo(15650 / 192, 1);
    expect(m.ragStatus).toBe('green');
  });

  it('lifetimeRevenueMultiple: £15,650 × 10 / £53,708 = 2.91 → amber (2–3×)', () => {
    const m = metrics.find(m => m.definition.id === 'lifetimeRevenueMultiple')!;
    expect(m.value).toBeCloseTo((15650 * 10) / 53708, 1);
    // 2.91 is between 2.0 and 3.0 → amber
    expect(m.ragStatus).toBe('amber');
  });
});

// ============================================================
// calculateAllMetrics — Distressed System
// ============================================================

describe('calculateAllMetrics — distressed system', () => {
  let metrics: ReturnType<typeof calculateAllMetrics>;

  beforeAll(() => {
    metrics = calculateAllMetrics(DISTRESSED_PARAMS);
  });

  it('capexPerKwh: £80,000 / 192kWh = £416.7/kWh → red (> £350)', () => {
    const m = metrics.find(m => m.definition.id === 'capexPerKwh')!;
    expect(m.ragStatus).toBe('red');
  });

  it('opexPerHome: £2,000 → red (> £1,200)', () => {
    const m = metrics.find(m => m.definition.id === 'opexPerHome')!;
    expect(m.ragStatus).toBe('red');
  });

  it('debtServiceRatio: £9,000 / £8,000 = 112.5% → red (> 55%)', () => {
    const m = metrics.find(m => m.definition.id === 'debtServiceRatio')!;
    expect(m.ragStatus).toBe('red');
  });

  it('installCostPerProperty: £15,000 → red (> £12,000)', () => {
    const m = metrics.find(m => m.definition.id === 'installCostPerProperty')!;
    expect(m.ragStatus).toBe('red');
  });

  it('irr10Year: 3% → red (< 10%)', () => {
    const m = metrics.find(m => m.definition.id === 'irr10Year')!;
    expect(m.ragStatus).toBe('red');
  });

  it('npv10Year: -£5,000 → red (< £5,000)', () => {
    const m = metrics.find(m => m.definition.id === 'npv10Year')!;
    expect(m.ragStatus).toBe('red');
  });

  it('dscr: £3,000 / £9,000 = 0.33 → red (< 1.2)', () => {
    const m = metrics.find(m => m.definition.id === 'dscr')!;
    expect(m.value).toBeCloseTo(3000 / 9000, 2);
    expect(m.ragStatus).toBe('red');
  });
});

// ============================================================
// RAG Grouping
// ============================================================

describe('getMetricsByRag', () => {
  it('should correctly split metrics into three buckets', () => {
    const metrics = calculateAllMetrics(HEALTHY_PARAMS);
    const grouped = getMetricsByRag(metrics);

    // Total across groups should match input length
    expect(grouped.green.length + grouped.amber.length + grouped.red.length).toBe(metrics.length);

    // All items in each group have the correct status
    for (const m of grouped.green) expect(m.ragStatus).toBe('green');
    for (const m of grouped.amber) expect(m.ragStatus).toBe('amber');
    for (const m of grouped.red) expect(m.ragStatus).toBe('red');
  });

  it('healthy system should have no red metrics', () => {
    const metrics = calculateAllMetrics(HEALTHY_PARAMS);
    const grouped = getMetricsByRag(metrics);
    expect(grouped.red).toHaveLength(0);
  });

  it('distressed system should have mostly red metrics', () => {
    const metrics = calculateAllMetrics(DISTRESSED_PARAMS);
    const grouped = getMetricsByRag(metrics);
    expect(grouped.red.length).toBeGreaterThan(5);
  });
});

// ============================================================
// Portfolio RAG Summary
// ============================================================

describe('getPortfolioRagSummary', () => {
  it('healthy system: overall status should be green or amber (no reds)', () => {
    const metrics = calculateAllMetrics(HEALTHY_PARAMS);
    const summary = getPortfolioRagSummary(metrics);
    expect(summary.redCount).toBe(0);
    expect(['green', 'amber']).toContain(summary.overallStatus);
  });

  it('distressed system: overall status should be red', () => {
    const metrics = calculateAllMetrics(DISTRESSED_PARAMS);
    const summary = getPortfolioRagSummary(metrics);
    expect(summary.redCount).toBeGreaterThan(0);
    expect(summary.overallStatus).toBe('red');
  });

  it('counts should sum to total metrics', () => {
    const metrics = calculateAllMetrics(HEALTHY_PARAMS);
    const summary = getPortfolioRagSummary(metrics);
    expect(summary.greenCount + summary.amberCount + summary.redCount).toBe(metrics.length);
  });

  it('overall status should be amber when there are amber but no red metrics', () => {
    // Build a params set that produces amber but not red
    // NPV at threshold, no bad metrics
    const borderlineParams: AllMetricsParams = {
      totalCapexGbp: 53708,
      batteryCapacityKwh: 192,
      annualGrossRevenue: 18000,
      annualNetRevenue: 15650,
      annualDebtService: 4800,
      annualOpex: 900,       // amber (800–1,200)
      annualHomeownerPayment: 1200,
      installCostExHardware: 9000, // amber (8,000–12,000)
      esaTermYears: 10,
      irr10Year: 25,
      npv10Year: 25000,
    };
    const metrics = calculateAllMetrics(borderlineParams);
    const summary = getPortfolioRagSummary(metrics);
    // capexPerKwh = 279.7 (amber), installCost = 9,000 (amber), opex = 900 (amber)
    expect(summary.amberCount).toBeGreaterThan(0);
    expect(summary.overallStatus).toBe('amber');
  });
});

// ============================================================
// DSCR boundary: exactly 1.2 should be amber (at the boundary, >= 1.2 = amber)
// ============================================================

describe('DSCR boundary values', () => {
  const dscrDef = ALL_METRICS.find(m => m.id === 'dscr')!;

  it('DSCR exactly 1.2 → amber (at threshold boundary)', () => {
    const result = calculateMetricValue(dscrDef, 1.2);
    // >= amberAbove (1.2) and < greenAbove (1.5) → amber
    expect(result.ragStatus).toBe('amber');
  });

  it('DSCR 1.5 → amber (at green boundary, not above)', () => {
    const result = calculateMetricValue(dscrDef, 1.5);
    // value 1.5 is NOT > 1.5 so amber
    expect(result.ragStatus).toBe('amber');
  });

  it('DSCR 1.51 → green', () => {
    const result = calculateMetricValue(dscrDef, 1.51);
    expect(result.ragStatus).toBe('green');
  });

  it('DSCR 1.19 → red (< 1.2)', () => {
    const result = calculateMetricValue(dscrDef, 1.19);
    expect(result.ragStatus).toBe('red');
  });
});

// vitest provides beforeAll as a global via tsconfig vitest/globals types
