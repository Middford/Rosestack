// ============================================================
// Finance Module — Cost & Return Metrics Engine (Section 9)
// RAG thresholds for RoseStack context: 5 cost + 8 return metrics
// ============================================================

export type RagStatus = 'green' | 'amber' | 'red';
export type MetricTrend = 'up' | 'down' | 'flat';

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: 'cost' | 'return';
  /**
   * For cost metrics (higherIsBetter = false):
   *   green = { below: X }  — value below X is green
   *   amber = { above: X, below: Y } — value X..Y is amber
   *   anything > Y is red
   *
   * For return metrics (higherIsBetter = true):
   *   green = { above: X }  — value above X is green
   *   amber = { above: Y, below: X } — value Y..X is amber
   *   anything < Y is red
   */
  greenThreshold: { above?: number; below?: number };
  amberThreshold: { above?: number; below?: number };
  higherIsBetter: boolean;
}

export interface MetricValue {
  definition: MetricDefinition;
  /** Actual numeric value in the metric's native unit */
  value: number;
  ragStatus: RagStatus;
  trend?: MetricTrend;
  /** Percentage deviation from the likely-case value (positive = above, negative = below) */
  comparedToLikelyCase?: number;
}

// ============================================================
// RAG Evaluation
// ============================================================

/**
 * Determine RAG status for a metric value given its definition.
 *
 * For cost metrics (higherIsBetter = false):
 *   green  → value < greenThreshold.below
 *   amber  → greenThreshold.below <= value <= amberThreshold.below
 *   red    → value > amberThreshold.below
 *
 * For return metrics (higherIsBetter = true):
 *   green  → value > greenThreshold.above
 *   amber  → amberThreshold.above <= value <= greenThreshold.above
 *   red    → value < amberThreshold.above
 */
export function evaluateRag(definition: MetricDefinition, value: number): RagStatus {
  if (!definition.higherIsBetter) {
    // Cost metric: lower is better
    const greenBelow = definition.greenThreshold.below ?? Infinity;
    const amberBelow = definition.amberThreshold.below ?? Infinity;
    if (value < greenBelow) return 'green';
    if (value <= amberBelow) return 'amber';
    return 'red';
  } else {
    // Return metric: higher is better
    const greenAbove = definition.greenThreshold.above ?? -Infinity;
    const amberAbove = definition.amberThreshold.above ?? -Infinity;
    if (value > greenAbove) return 'green';
    if (value >= amberAbove) return 'amber';
    return 'red';
  }
}

// ============================================================
// Cost Metric Definitions (5 metrics)
// ============================================================

/**
 * 1. Capital Cost per kWh
 * Formula: Total CAPEX / battery capacity kWh
 * Typical LFP systems 2025: £220–280/kWh installed
 */
const CAPEX_PER_KWH: MetricDefinition = {
  id: 'capexPerKwh',
  name: 'Capital Cost per kWh',
  description: 'Total CAPEX divided by installed battery capacity. Typical LFP systems 2025: £220–280/kWh installed.',
  unit: '£/kWh',
  category: 'cost',
  greenThreshold: { below: 250 },
  amberThreshold: { below: 350 },
  higherIsBetter: false,
};

/**
 * 2. Annual Operating Cost per Home
 * Formula: maintenance + insurance + monitoring + compliance amortised
 */
const OPEX_PER_HOME: MetricDefinition = {
  id: 'opexPerHome',
  name: 'Annual Operating Cost per Home',
  description: 'Total annual operating cost per installed home: maintenance, insurance, monitoring and compliance amortised.',
  unit: '£/year',
  category: 'cost',
  greenThreshold: { below: 800 },
  amberThreshold: { below: 1200 },
  higherIsBetter: false,
};

/**
 * 3. Homeowner Cost Ratio
 * Formula: Annual homeowner payment / Annual gross revenue × 100
 * At £100/month = £1,200/year on £15,000 gross = 8% (green)
 */
const HOMEOWNER_COST_RATIO: MetricDefinition = {
  id: 'homeownerCostRatio',
  name: 'Homeowner Cost Ratio',
  description: 'Annual homeowner payment as a percentage of annual gross revenue. At £1,200/yr on £15k gross = 8% (green).',
  unit: '%',
  category: 'cost',
  greenThreshold: { below: 10 },
  amberThreshold: { below: 20 },
  higherIsBetter: false,
};

/**
 * 4. Debt Service Cost Ratio
 * Formula: Annual debt service / Annual gross revenue × 100
 * Lenders want DSCR > 1.2, which corresponds to debt < 83% of revenue.
 */
const DEBT_SERVICE_RATIO: MetricDefinition = {
  id: 'debtServiceRatio',
  name: 'Debt Service Cost Ratio',
  description: 'Annual debt service as a percentage of annual gross revenue. Lenders want DSCR > 1.2, so debt < 83% of revenue.',
  unit: '%',
  category: 'cost',
  greenThreshold: { below: 40 },
  amberThreshold: { below: 55 },
  higherIsBetter: false,
};

/**
 * 5. Installation Cost per Property
 * Formula: Non-hardware installation costs per home (G99, MCS, labour, civils)
 * Typical: £6,000–10,000 depending on property complexity.
 */
const INSTALL_COST_PER_PROPERTY: MetricDefinition = {
  id: 'installCostPerProperty',
  name: 'Installation Cost per Property',
  description: 'Non-hardware installation costs per home including G99, MCS, labour and civils. Typical: £6k–10k.',
  unit: '£',
  category: 'cost',
  greenThreshold: { below: 8000 },
  amberThreshold: { below: 12000 },
  higherIsBetter: false,
};

// ============================================================
// Return Metric Definitions (8 metrics)
// ============================================================

/**
 * 1. Simple Payback Period
 * Formula: Total CAPEX / Annual Net Revenue × 12
 * Likely case for 192kWh system: ~70 months
 */
const PAYBACK_MONTHS: MetricDefinition = {
  id: 'paybackMonths',
  name: 'Simple Payback Period',
  description: 'Total CAPEX divided by annual net revenue, expressed in months. Likely case for 192kWh system: ~70 months.',
  unit: 'months',
  category: 'return',
  // Lower is better, so invert the convention:
  // green  → < 60 months  →  above = -Infinity (no lower bound), store as higherIsBetter = false override
  // We handle payback specially: lower = better, so higherIsBetter = false
  greenThreshold: { below: 60 },
  amberThreshold: { below: 84 },
  higherIsBetter: false,
};

/**
 * 2. 10-Year IRR
 * Formula: Internal Rate of Return over 10 years
 */
const IRR_10_YEAR: MetricDefinition = {
  id: 'irr10Year',
  name: '10-Year IRR',
  description: 'Internal Rate of Return over a 10-year projection period.',
  unit: '%',
  category: 'return',
  greenThreshold: { above: 20 },
  amberThreshold: { above: 10 },
  higherIsBetter: true,
};

/**
 * 3. 10-Year NPV at 8%
 * Formula: Net Present Value at 8% discount rate over 10 years
 * Positive NPV = creates value above 8% hurdle rate.
 */
const NPV_10_YEAR: MetricDefinition = {
  id: 'npv10Year',
  name: '10-Year NPV at 8%',
  description: 'Net Present Value at an 8% discount rate over 10 years. Positive NPV means value created above the hurdle rate.',
  unit: '£',
  category: 'return',
  greenThreshold: { above: 20000 },
  amberThreshold: { above: 5000 },
  higherIsBetter: true,
};

/**
 * 4. Annual Net Revenue Yield
 * Formula: Annual Net Revenue / Total CAPEX × 100
 * At £15k net / £47k capex = 31.9% (green)
 */
const NET_REVENUE_YIELD: MetricDefinition = {
  id: 'netRevenueYield',
  name: 'Annual Net Revenue Yield',
  description: 'Annual net revenue as a percentage of total CAPEX. At £15k net / £47k capex = 31.9% (green).',
  unit: '%',
  category: 'return',
  greenThreshold: { above: 15 },
  amberThreshold: { above: 8 },
  higherIsBetter: true,
};

/**
 * 5. Gross Margin
 * Formula: (Gross Revenue - Homeowner Payment) / Gross Revenue × 100
 * At £100/month on £15k gross = 92% margin (green).
 */
const GROSS_MARGIN: MetricDefinition = {
  id: 'grossMargin',
  name: 'Gross Margin',
  description: 'Revenue retained after homeowner payment, as a percentage of gross revenue. At £1,200/yr on £15k gross = 92%.',
  unit: '%',
  category: 'return',
  greenThreshold: { above: 90 },
  amberThreshold: { above: 80 },
  higherIsBetter: true,
};

/**
 * 6. DSCR
 * Formula: Annual Net Revenue / Annual Debt Service
 * Lender covenant minimum: 1.2.
 */
const DSCR: MetricDefinition = {
  id: 'dscr',
  name: 'Debt Service Coverage Ratio',
  description: 'Annual net revenue divided by annual debt service. Lender covenant minimum: 1.2.',
  unit: '×',
  category: 'return',
  greenThreshold: { above: 1.5 },
  amberThreshold: { above: 1.2 },
  higherIsBetter: true,
};

/**
 * 7. Revenue per kWh Capacity
 * Formula: Annual Net Revenue / Battery Capacity kWh
 * At £15k / 192kWh = £78.1/kWh/year (green).
 */
const REVENUE_PER_KWH: MetricDefinition = {
  id: 'revenuePerKwh',
  name: 'Revenue per kWh Capacity',
  description: 'Annual net revenue per kWh of installed battery capacity. At £15k / 192kWh = £78.1/kWh/year (green).',
  unit: '£/kWh/year',
  category: 'return',
  greenThreshold: { above: 60 },
  amberThreshold: { above: 40 },
  higherIsBetter: true,
};

/**
 * 8. Lifetime Revenue Multiple
 * Formula: Total projected net revenue over ESA term / Total CAPEX
 * At 10yr × £15k = £150k net / £47k = 3.2× (green).
 */
const LIFETIME_REVENUE_MULTIPLE: MetricDefinition = {
  id: 'lifetimeRevenueMultiple',
  name: 'Lifetime Revenue Multiple',
  description: 'Total projected net revenue over the ESA term divided by total CAPEX. At 10yr × £15k / £47k = 3.2× (green).',
  unit: '×',
  category: 'return',
  greenThreshold: { above: 3.0 },
  amberThreshold: { above: 2.0 },
  higherIsBetter: true,
};

// ============================================================
// Exported Metric Collections
// ============================================================

export const COST_METRICS: MetricDefinition[] = [
  CAPEX_PER_KWH,
  OPEX_PER_HOME,
  HOMEOWNER_COST_RATIO,
  DEBT_SERVICE_RATIO,
  INSTALL_COST_PER_PROPERTY,
];

export const RETURN_METRICS: MetricDefinition[] = [
  PAYBACK_MONTHS,
  IRR_10_YEAR,
  NPV_10_YEAR,
  NET_REVENUE_YIELD,
  GROSS_MARGIN,
  DSCR,
  REVENUE_PER_KWH,
  LIFETIME_REVENUE_MULTIPLE,
];

export const ALL_METRICS: MetricDefinition[] = [...COST_METRICS, ...RETURN_METRICS];

// ============================================================
// Metric Value Computation
// ============================================================

/**
 * Evaluate a single metric value against its RAG thresholds.
 */
export function calculateMetricValue(
  definition: MetricDefinition,
  value: number,
  likelyCaseValue?: number,
): MetricValue {
  const ragStatus = evaluateRag(definition, value);
  const comparedToLikelyCase =
    likelyCaseValue !== undefined && likelyCaseValue !== 0
      ? Math.round(((value - likelyCaseValue) / Math.abs(likelyCaseValue)) * 10000) / 100
      : undefined;

  return {
    definition,
    value,
    ragStatus,
    comparedToLikelyCase,
  };
}

export interface AllMetricsParams {
  /** Total capital expenditure in £ */
  totalCapexGbp: number;
  /** Installed battery capacity in kWh */
  batteryCapacityKwh: number;
  /** Annual gross revenue in £ */
  annualGrossRevenue: number;
  /** Annual net revenue in £ (after all operating costs) */
  annualNetRevenue: number;
  /** Annual debt service payment in £ (principal + interest) */
  annualDebtService: number;
  /** Annual operating costs excluding homeowner payment in £ */
  annualOpex: number;
  /** Annual homeowner payment in £ (typically £1,200 = £100/month) */
  annualHomeownerPayment: number;
  /** Non-hardware installation costs per home in £ (G99, MCS, labour, civils) */
  installCostExHardware: number;
  /** ESA contract term in years */
  esaTermYears: number;
  /** 10-year IRR as a percentage (e.g. 22.5 for 22.5%) */
  irr10Year: number;
  /** 10-year NPV at 8% discount rate in £ */
  npv10Year: number;
}

/**
 * Compute all 13 metrics from a set of financial parameters.
 * Returns a MetricValue[] with RAG statuses populated.
 */
export function calculateAllMetrics(params: AllMetricsParams): MetricValue[] {
  const {
    totalCapexGbp,
    batteryCapacityKwh,
    annualGrossRevenue,
    annualNetRevenue,
    annualDebtService,
    annualOpex,
    annualHomeownerPayment,
    installCostExHardware,
    esaTermYears,
    irr10Year,
    npv10Year,
  } = params;

  // --- Cost Metrics ---

  const capexPerKwh =
    batteryCapacityKwh > 0 ? totalCapexGbp / batteryCapacityKwh : 0;

  const opexPerHome = annualOpex; // already expressed per home

  const homeownerCostRatioValue =
    annualGrossRevenue > 0
      ? (annualHomeownerPayment / annualGrossRevenue) * 100
      : 0;

  const debtServiceRatioValue =
    annualGrossRevenue > 0
      ? (annualDebtService / annualGrossRevenue) * 100
      : 0;

  const installCostPerPropertyValue = installCostExHardware;

  // --- Return Metrics ---

  const paybackMonthsValue =
    annualNetRevenue > 0 ? (totalCapexGbp / annualNetRevenue) * 12 : 999;

  const irr10YearValue = irr10Year;

  const npv10YearValue = npv10Year;

  const netRevenueYieldValue =
    totalCapexGbp > 0 ? (annualNetRevenue / totalCapexGbp) * 100 : 0;

  const grossMarginValue =
    annualGrossRevenue > 0
      ? ((annualGrossRevenue - annualHomeownerPayment) / annualGrossRevenue) * 100
      : 0;

  const dscrValue =
    annualDebtService > 0 ? annualNetRevenue / annualDebtService : 0;

  const revenuePerKwhValue =
    batteryCapacityKwh > 0 ? annualNetRevenue / batteryCapacityKwh : 0;

  const lifetimeRevenueMultipleValue =
    totalCapexGbp > 0 ? (annualNetRevenue * esaTermYears) / totalCapexGbp : 0;

  return [
    calculateMetricValue(CAPEX_PER_KWH, capexPerKwh),
    calculateMetricValue(OPEX_PER_HOME, opexPerHome),
    calculateMetricValue(HOMEOWNER_COST_RATIO, homeownerCostRatioValue),
    calculateMetricValue(DEBT_SERVICE_RATIO, debtServiceRatioValue),
    calculateMetricValue(INSTALL_COST_PER_PROPERTY, installCostPerPropertyValue),
    calculateMetricValue(PAYBACK_MONTHS, paybackMonthsValue),
    calculateMetricValue(IRR_10_YEAR, irr10YearValue),
    calculateMetricValue(NPV_10_YEAR, npv10YearValue),
    calculateMetricValue(NET_REVENUE_YIELD, netRevenueYieldValue),
    calculateMetricValue(GROSS_MARGIN, grossMarginValue),
    calculateMetricValue(DSCR, dscrValue),
    calculateMetricValue(REVENUE_PER_KWH, revenuePerKwhValue),
    calculateMetricValue(LIFETIME_REVENUE_MULTIPLE, lifetimeRevenueMultipleValue),
  ];
}

// ============================================================
// RAG Grouping Utilities
// ============================================================

/**
 * Split a MetricValue[] into green / amber / red buckets.
 */
export function getMetricsByRag(
  metrics: MetricValue[],
): { green: MetricValue[]; amber: MetricValue[]; red: MetricValue[] } {
  return {
    green: metrics.filter(m => m.ragStatus === 'green'),
    amber: metrics.filter(m => m.ragStatus === 'amber'),
    red: metrics.filter(m => m.ragStatus === 'red'),
  };
}

/**
 * Summarise a set of MetricValues into counts and an overall RAG status.
 * Overall status: red if any metric is red, amber if any is amber, else green.
 */
export function getPortfolioRagSummary(
  metrics: MetricValue[],
): { greenCount: number; amberCount: number; redCount: number; overallStatus: RagStatus } {
  const grouped = getMetricsByRag(metrics);
  const greenCount = grouped.green.length;
  const amberCount = grouped.amber.length;
  const redCount = grouped.red.length;

  let overallStatus: RagStatus = 'green';
  if (redCount > 0) overallStatus = 'red';
  else if (amberCount > 0) overallStatus = 'amber';

  return { greenCount, amberCount, redCount, overallStatus };
}
