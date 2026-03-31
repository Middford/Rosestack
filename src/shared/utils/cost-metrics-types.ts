/**
 * Cost Metrics, Benchmarking & Payback Engine — Types & Constants
 *
 * Five cost-per-kWh metrics, monthly payback with seasonal weighting,
 * and export sensitivity analysis.
 */

// ---------------------------------------------------------------------------
// Seasonal weighting factors (12 elements, index 0 = January)
// ---------------------------------------------------------------------------

export interface SeasonalWeights {
  arbitrage: number[];
  solar: number[];
  savingSessions: number[];
  flexibility: number[];
}

/**
 * From the spec — seasonal revenue weighting table.
 * Arbitrage peaks in winter (higher spreads), solar in summer,
 * Saving Sessions Oct-Mar only, flexibility winter-heavy.
 */
export const DEFAULT_SEASONAL_WEIGHTS: SeasonalWeights = {
  //                     Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
  arbitrage:           [1.15, 1.10, 1.00, 0.90, 0.80, 0.75, 0.75, 0.80, 0.90, 1.00, 1.10, 1.20],
  solar:               [0.15, 0.25, 0.50, 0.80, 1.10, 1.20, 1.20, 1.00, 0.70, 0.40, 0.20, 0.10],
  savingSessions:      [2.00, 1.50, 1.00, 0.50, 0.00, 0.00, 0.00, 0.00, 0.00, 0.50, 1.50, 2.00],
  flexibility:         [1.50, 1.30, 1.00, 0.80, 0.50, 0.30, 0.30, 0.30, 0.50, 0.80, 1.30, 1.50],
};

// ---------------------------------------------------------------------------
// Cost breakdown input — separates all cost components
// ---------------------------------------------------------------------------

export interface CostBreakdownInput {
  /** Raw battery module(s) cost only */
  batteryModuleCostGbp: number;
  /** Inverter / energy controller cost */
  inverterCostGbp: number;
  /** Gateway / BMS / comms */
  gatewayCostGbp: number;
  /** Cabling, enclosure, breakers, spreader plates */
  ancillaryCostGbp: number;
  /** Installation labour */
  labourCostGbp: number;
  /** Testing, grid connection, MCS certification */
  commissioningCostGbp: number;
  /** G99 application fee */
  g99CostGbp: number;
  /** DNO connection charges */
  dnoCostGbp: number;
  /** Gross battery capacity in kWh */
  grossCapacityKwh: number;
  /** Round-trip efficiency 0-1 (e.g. 0.92) */
  roundTripEfficiency: number;
  /** Year 1 degradation as percentage (e.g. 2.0 = 2%) */
  year1DegradationPercent: number;
  /** Annual OPEX: maintenance + insurance + monitoring */
  annualOpexGbp: number;
  /** OPEX inflation rate as percentage (e.g. 3.0 = 3%) */
  inflationPercent: number;
  /** Projection horizon (typically 10) */
  projectionYears: number;
  /** Cycles per day (typically 2.0) */
  cyclesPerDay: number;
  /** Annual degradation rate for LCOS throughput calc */
  degradationRatePercent: number;
}

// ---------------------------------------------------------------------------
// Five cost metrics output
// ---------------------------------------------------------------------------

export interface FiveCostMetrics {
  /** Battery modules only / gross capacity */
  hardwarePerKwh: number;
  /** (battery + inverter + gateway + ancillaries) / gross capacity */
  systemPerKwh: number;
  /** (system + labour + commissioning + G99 + DNO) / gross capacity */
  installedPerKwh: number;
  /** installed cost / (gross × efficiency × (1 - year1 degradation)) */
  effectivePerUsableKwh: number;
  /** (installed + NPV(opex)) / total lifetime throughput */
  lcosPerKwh: number;
}

export type CostMetricKey = keyof FiveCostMetrics;

export interface CostMetricRating {
  metric: CostMetricKey;
  value: number;
  rating: "green" | "amber" | "red";
  label: string;
}

// ---------------------------------------------------------------------------
// Traffic-light thresholds (from spec)
// ---------------------------------------------------------------------------

export const COST_METRIC_THRESHOLDS: Record<
  CostMetricKey,
  { green: number; amber: number; label: string; unit: string }
> = {
  hardwarePerKwh: { green: 200, amber: 300, label: "Hardware", unit: "£/kWh" },
  systemPerKwh: { green: 280, amber: 400, label: "System", unit: "£/kWh" },
  installedPerKwh: { green: 350, amber: 500, label: "Installed", unit: "£/kWh" },
  effectivePerUsableKwh: { green: 400, amber: 550, label: "Effective", unit: "£/usable kWh" },
  lcosPerKwh: { green: 0.10, amber: 0.15, label: "LCOS (10yr)", unit: "p/kWh" },
};

// ---------------------------------------------------------------------------
// Monthly payback types
// ---------------------------------------------------------------------------

export interface MonthlyPaybackParams {
  /** Annual revenue by stream in GBP */
  annualRevenueByStream: {
    arbitrage: number;
    solar: number;
    savingSessions: number;
    flexibility: number;
    seg: number;
  };
  /** Total annual costs in GBP */
  annualCostsGbp: number;
  /** Total installed cost (CAPEX) */
  installedCostGbp: number;
  /** Seasonal weights (defaults to DEFAULT_SEASONAL_WEIGHTS) */
  seasonalWeights?: SeasonalWeights;
  /** Projection horizon in months (default 120 = 10 years) */
  projectionMonths?: number;
  /** Annual degradation rate percentage */
  degradationRatePercent: number;
  /** Calendar month of install (1=Jan, default 1) */
  startMonth?: number;
}

export interface MonthlyPaybackEntry {
  /** 1-indexed month from install */
  month: number;
  /** Calendar month 1-12 */
  calendarMonth: number;
  grossRevenueGbp: number;
  costsGbp: number;
  netRevenueGbp: number;
  cumulativeNetGbp: number;
  seasonalWeight: number;
}

export interface MonthlyPaybackResult {
  months: MonthlyPaybackEntry[];
  /** Month where cumulative >= installedCost, or 999 */
  paybackMonth: number;
  installedCostGbp: number;
}

// ---------------------------------------------------------------------------
// Export sensitivity types
// ---------------------------------------------------------------------------

export interface ExportSensitivityPoint {
  exportKw: number;
  paybackMonths: number;
  annualRevenueGbp: number;
  /** paybackMonths < contractTermMonths */
  viable: boolean;
}

export interface ExportSensitivityResult {
  points: ExportSensitivityPoint[];
  contractTermMonths: number;
  /** Export kW with best (lowest) payback */
  optimalExportKw: number;
}

// ---------------------------------------------------------------------------
// Revenue by stream (for monthly payback input)
// ---------------------------------------------------------------------------

export interface RevenueByStream {
  arbitrage: number;
  solar: number;
  savingSessions: number;
  flexibility: number;
  seg: number;
}
