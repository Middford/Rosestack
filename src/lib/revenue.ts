// ============================================================
// Per-Install Revenue Calculation Service
//
// Calculates daily, monthly, and annual gross and net revenue
// for a single battery installation using live tariff rates.
//
// Formula (all rates in pence/kWh, stored as decimal):
//   chargeKwh     = batteryCapacityKwh          (raw capacity to charge)
//   exportKwh     = chargeKwh × roundTripEff     (energy available to export)
//   maxExport     = exportPowerKw × peakHours    (inverter-limited peak export)
//   actualExport  = min(exportKwh, maxExport)
//   chargeCost    = chargeKwh × offPeakImport / 100
//   exportRevenue = actualExport × peakExport / 100
//   dailyProfit   = exportRevenue - chargeCost - standingCharge / 100
//   netProfit     = dailyProfit - homeownerPaymentPerDay
//
// Standing charge is shared between RoseStack and homeowner —
// it is already factored into the net revenue calculation.
//
// Used by:
//   - /api/tariffs/fleet-revenue  (fleet-wide aggregation)
//   - FleetRevenueDashboard component (per-install cards)
//   - Three-scenario projections in the tariff module
// ============================================================

import type { FluxRates } from '@/modules/tariffs/flux-api';

// --- Types ---

export interface InstallConfig {
  homeId: string;
  address: string;
  batteryCapacityKwh: number;
  roundTripEfficiency: number;     // 0–1, e.g. 0.9 for 90%
  exportPowerKw: number;           // max inverter discharge rate
  batteryHealthPercent: number;    // 0–100, accounts for degradation
  monthlyHomeownerPaymentGbp: number;
  tariff: 'flux' | 'iof' | 'agile';
  installDate?: string;            // ISO date — used for degradation
}

export interface DailyRevenue {
  chargeKwh: number;
  exportKwh: number;
  maxExportKwh: number;
  actualExportKwh: number;
  chargeCostGbp: number;
  exportRevenueGbp: number;
  standingChargeGbp: number;
  grossDailyGbp: number;
  homeownerDailyGbp: number;
  netDailyGbp: number;
}

export interface InstallRevenue {
  homeId: string;
  address: string;
  tariff: string;
  rates: {
    offPeakImport: number;
    peakExport: number;
    standingCharge: number;
  };
  daily: DailyRevenue;
  monthly: {
    grossGbp: number;
    homeownerGbp: number;
    netGbp: number;
  };
  annual: {
    grossGbp: number;
    homeownerGbp: number;
    netGbp: number;
  };
  batteryHealthPercent: number;
  calculatedAt: string;
}

export interface FleetRevenueSummary {
  totalInstalls: number;
  totalCapacityKwh: number;
  monthlyFleetGrossGbp: number;
  monthlyHomeownerPaymentsGbp: number;
  monthlyRoseStackNetGbp: number;
  annualFleetGrossGbp: number;
  annualRoseStackNetGbp: number;
  avgSpreadPence: number;
  installs: InstallRevenue[];
  calculatedAt: string;
}

// --- Constants ---

/** Peak window = 16:00–19:00 = 3 hours */
const PEAK_WINDOW_HOURS = 3;

/** Days per month (average) */
const DAYS_PER_MONTH = 30.44;

/** Days per year */
const DAYS_PER_YEAR = 365;

// --- Core calculation ---

/**
 * Calculate revenue for a single install using the provided Flux rates.
 *
 * The battery health percentage scales the effective capacity —
 * a 90% health battery on a 100kWh system yields 90kWh usable capacity.
 */
export function calculateInstallRevenue(
  install: InstallConfig,
  rates: FluxRates,
): InstallRevenue {
  const healthFactor = install.batteryHealthPercent / 100;

  // Effective capacity after degradation
  const effectiveCapacityKwh = install.batteryCapacityKwh * healthFactor;

  // Step 1: Charge from grid at off-peak rate
  const chargeKwh = effectiveCapacityKwh;

  // Step 2: Apply round-trip efficiency to get exportable energy
  const exportKwh = chargeKwh * install.roundTripEfficiency;

  // Step 3: Cap by inverter peak-window limit
  const maxExportKwh = install.exportPowerKw * PEAK_WINDOW_HOURS;
  const actualExportKwh = Math.min(exportKwh, maxExportKwh);

  // Step 4: Cost and revenue
  const offPeakImport = rates.import.offPeak;  // pence/kWh
  const peakExport = rates.export.peak;         // pence/kWh

  const chargeCostGbp = (chargeKwh * offPeakImport) / 100;
  const exportRevenueGbp = (actualExportKwh * peakExport) / 100;
  const standingChargeGbp = rates.standingCharge / 100;

  // Step 5: Daily profit
  const grossDailyGbp = exportRevenueGbp - chargeCostGbp;
  const homeownerDailyGbp = install.monthlyHomeownerPaymentGbp / DAYS_PER_MONTH;
  const netDailyGbp = grossDailyGbp - standingChargeGbp - homeownerDailyGbp;

  // Step 6: Scale to monthly / annual
  const grossMonthlyGbp = grossDailyGbp * DAYS_PER_MONTH;
  const homeownerMonthlyGbp = install.monthlyHomeownerPaymentGbp;
  const standingMonthlyGbp = standingChargeGbp * DAYS_PER_MONTH;
  const netMonthlyGbp = grossMonthlyGbp - standingMonthlyGbp - homeownerMonthlyGbp;

  const grossAnnualGbp = grossDailyGbp * DAYS_PER_YEAR;
  const homeownerAnnualGbp = homeownerMonthlyGbp * 12;
  const standingAnnualGbp = standingChargeGbp * DAYS_PER_YEAR;
  const netAnnualGbp = grossAnnualGbp - standingAnnualGbp - homeownerAnnualGbp;

  return {
    homeId: install.homeId,
    address: install.address,
    tariff: install.tariff,
    rates: {
      offPeakImport,
      peakExport,
      standingCharge: rates.standingCharge,
    },
    daily: {
      chargeKwh: round2(chargeKwh),
      exportKwh: round2(exportKwh),
      maxExportKwh: round2(maxExportKwh),
      actualExportKwh: round2(actualExportKwh),
      chargeCostGbp: round2(chargeCostGbp),
      exportRevenueGbp: round2(exportRevenueGbp),
      standingChargeGbp: round2(standingChargeGbp),
      grossDailyGbp: round2(grossDailyGbp),
      homeownerDailyGbp: round2(homeownerDailyGbp),
      netDailyGbp: round2(netDailyGbp),
    },
    monthly: {
      grossGbp: round2(grossMonthlyGbp),
      homeownerGbp: round2(homeownerMonthlyGbp),
      netGbp: round2(netMonthlyGbp),
    },
    annual: {
      grossGbp: round2(grossAnnualGbp),
      homeownerGbp: round2(homeownerAnnualGbp),
      netGbp: round2(netAnnualGbp),
    },
    batteryHealthPercent: install.batteryHealthPercent,
    calculatedAt: new Date().toISOString(),
  };
}

// --- Three-scenario wrapper ---

export interface ThreeScenarioInstallRevenue {
  best: InstallRevenue;
  likely: InstallRevenue;
  worst: InstallRevenue;
}

/**
 * Calculate best/likely/worst revenue for an install.
 *
 * Scenario assumptions:
 *   Best   — 2.5 effective cycles/day modelled as 100% battery health
 *   Likely — 2 effective cycles/day modelled as 90% battery health
 *   Worst  — 1.5 effective cycles/day modelled as 80% battery health
 *
 * The "cycles/day" concept is approximated here by scaling the battery
 * health factor. For a more precise model, use the dispatch matrix.
 */
export function calculateThreeScenarioInstallRevenue(
  install: InstallConfig,
  rates: FluxRates,
): ThreeScenarioInstallRevenue {
  return {
    best: calculateInstallRevenue(
      { ...install, batteryHealthPercent: Math.min(install.batteryHealthPercent * 1.05, 100) },
      rates,
    ),
    likely: calculateInstallRevenue(install, rates),
    worst: calculateInstallRevenue(
      { ...install, batteryHealthPercent: install.batteryHealthPercent * 0.85 },
      rates,
    ),
  };
}

// --- Fleet aggregation ---

/**
 * Aggregate revenue across all installs in the fleet.
 * Returns per-install breakdown plus fleet totals.
 */
export function calculateFleetRevenue(
  installs: InstallConfig[],
  rates: FluxRates,
): FleetRevenueSummary {
  const installRevenues = installs.map(i => calculateInstallRevenue(i, rates));

  const totalCapacityKwh = installs.reduce((s, i) => s + i.batteryCapacityKwh, 0);

  const monthlyFleetGrossGbp = installRevenues.reduce(
    (s, r) => s + r.monthly.grossGbp,
    0,
  );
  const monthlyHomeownerPaymentsGbp = installRevenues.reduce(
    (s, r) => s + r.monthly.homeownerGbp,
    0,
  );
  const monthlyRoseStackNetGbp = installRevenues.reduce(
    (s, r) => s + r.monthly.netGbp,
    0,
  );

  const spread = rates.export.peak - rates.import.offPeak;

  return {
    totalInstalls: installs.length,
    totalCapacityKwh: round2(totalCapacityKwh),
    monthlyFleetGrossGbp: round2(monthlyFleetGrossGbp),
    monthlyHomeownerPaymentsGbp: round2(monthlyHomeownerPaymentsGbp),
    monthlyRoseStackNetGbp: round2(monthlyRoseStackNetGbp),
    annualFleetGrossGbp: round2(monthlyFleetGrossGbp * 12),
    annualRoseStackNetGbp: round2(monthlyRoseStackNetGbp * 12),
    avgSpreadPence: round2(spread),
    installs: installRevenues,
    calculatedAt: new Date().toISOString(),
  };
}

// --- Helpers ---

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
