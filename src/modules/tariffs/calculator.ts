// ============================================================
// Revenue Calculator Engine for Tariff Module
// Uses shared scenario engine for three-scenario projections
// ============================================================

import type { BatterySystem, Tariff } from '@/shared/types';
import {
  calculateAllScenarios,
  summariseScenarios,
  calculateDailyArbitrageSpreadPence,
} from '@/shared/utils/scenarios';
import type { TariffWithMeta, GridService } from './data';
import { GRID_SERVICES } from './data';

// --- Revenue Breakdown ---

export interface RevenueBreakdown {
  dailyArbitragePence: number;
  dailyArbitrageGbp: number;
  monthlyArbitrageGbp: number;
  annualArbitrageGbp: number;
  annualSavingSessionsGbp: number;
  annualFlexibilityGbp: number;
  annualSegGbp: number;
  annualGridServicesGbp: number;
  totalAnnualGbp: number;
  totalMonthlyGbp: number;
  totalDailyGbp: number;
}

export interface ThreeScenarioRevenue {
  best: RevenueBreakdown;
  likely: RevenueBreakdown;
  worst: RevenueBreakdown;
}

// --- Calculator ---

export function calculateRevenueBreakdown(
  system: BatterySystem,
  tariff: Tariff,
  cyclesPerDay: number,
  includeGridServices: boolean = true,
): RevenueBreakdown {
  const spreadPence = calculateDailyArbitrageSpreadPence(tariff);
  const usableCapacity = system.totalCapacityKwh * system.roundTripEfficiency;

  const dailyArbitragePence = spreadPence * usableCapacity * cyclesPerDay;
  const dailyArbitrageGbp = dailyArbitragePence / 100;
  const monthlyArbitrageGbp = dailyArbitrageGbp * 30.44;
  const annualArbitrageGbp = dailyArbitrageGbp * 365;

  // ================================================================
  // Saving Sessions Revenue — CORRECTED FORMULA
  // ================================================================
  // The reduction is measured at the household meter, NOT the battery.
  // Export during session is limited by the INVERTER discharge rate, not battery capacity.
  // A 100kWh battery with a 10kW inverter gets the same SS revenue as a 200kWh battery
  // with the same inverter — the inverter is the bottleneck.
  //
  // Reduction per session = household baseline (~1kWh) + inverter export (kW * hours)
  // SS revenue is ON TOP of normal arbitrage export payments — no double-counting.
  // DFS and Saving Sessions are the SAME events — do NOT add both.
  const savingSessions = GRID_SERVICES.find(s => s.id === 'saving-sessions')!;
  const sessionDurationHours = savingSessions.avgSessionDurationHours ?? 1.0;
  const householdBaselineKwh = 1.0; // typical UK home consumption during 1hr peak session

  // Battery export capped by inverter rate, not battery capacity
  const maxExportPerSessionKwh = Math.min(
    system.maxDischargeRateKw * sessionDurationHours,
    system.totalCapacityKwh * system.roundTripEfficiency, // can't export more than usable capacity
  );
  const reductionPerSessionKwh = householdBaselineKwh + maxExportPerSessionKwh;

  // Deduct pre-charge cost for the energy used in the session
  const cheapestImport = Math.min(...tariff.importRates.map(r => r.ratePencePerKwh));
  const preChargeCostPence = maxExportPerSessionKwh * cheapestImport / system.roundTripEfficiency;

  const grossSsPence = reductionPerSessionKwh * (savingSessions.ratePencePerKwh ?? 0);
  const netSsPerSessionPence = grossSsPence - preChargeCostPence;

  const annualSavingSessionsGbp = includeGridServices
    ? ((savingSessions.sessionsPerYear ?? 0) * Math.max(0, netSsPerSessionPence)) / 100
    : 0;

  // Flexibility revenue (ENWL + Piclo combined estimate)
  const annualFlexibilityGbp = includeGridServices ? 200 : 0;

  // SEG export for solar generation (if solar installed)
  const annualSegGbp = system.solarPvKwp
    ? (system.solarPvKwp * 900 * 0.5 * 15) / 100 // 50% exported at 15p
    : 0;

  // DFS revenue is NOT added here — DFS and Saving Sessions are the SAME events.
  // Adding both would be double-counting. See data.ts DFS entry for documentation.
  // Other grid services (Balancing Mechanism, Capacity Market) are via aggregator
  // and included in the flexibility estimate above when applicable.
  const annualGridServicesGbp = 0; // DFS already captured via Saving Sessions

  const totalAnnualGbp = annualArbitrageGbp + annualSavingSessionsGbp + annualFlexibilityGbp + annualSegGbp + annualGridServicesGbp;

  return {
    dailyArbitragePence,
    dailyArbitrageGbp: round2(dailyArbitrageGbp),
    monthlyArbitrageGbp: round2(monthlyArbitrageGbp),
    annualArbitrageGbp: round2(annualArbitrageGbp),
    annualSavingSessionsGbp: round2(annualSavingSessionsGbp),
    annualFlexibilityGbp: round2(annualFlexibilityGbp),
    annualSegGbp: round2(annualSegGbp),
    annualGridServicesGbp: round2(annualGridServicesGbp),
    totalAnnualGbp: round2(totalAnnualGbp),
    totalMonthlyGbp: round2(totalAnnualGbp / 12),
    totalDailyGbp: round2(totalAnnualGbp / 365),
  };
}

export function calculateThreeScenarioRevenue(
  system: BatterySystem,
  tariff: Tariff,
): ThreeScenarioRevenue {
  return {
    best: calculateRevenueBreakdown(system, tariff, 2.5, true),
    likely: calculateRevenueBreakdown(system, tariff, 2, true),
    worst: calculateRevenueBreakdown(system, tariff, 1.5, false),
  };
}

// --- Comparison across tariffs ---

export interface TariffComparison {
  tariff: TariffWithMeta;
  revenue: ThreeScenarioRevenue;
  spreadPence: number;
  rank: number;
}

export function compareTariffs(
  system: BatterySystem,
  tariffs: TariffWithMeta[],
): TariffComparison[] {
  const comparisons = tariffs.map(tariff => ({
    tariff,
    revenue: calculateThreeScenarioRevenue(system, tariff),
    spreadPence: tariff.arbitrageSpreadPence,
    rank: 0,
  }));

  // Sort by likely annual revenue descending
  comparisons.sort((a, b) => b.revenue.likely.totalAnnualGbp - a.revenue.likely.totalAnnualGbp);
  comparisons.forEach((c, i) => { c.rank = i + 1; });

  return comparisons;
}

// --- Full 10-year projection wrapper ---

export function calculateFullProjection(system: BatterySystem, tariff: Tariff) {
  const projection = calculateAllScenarios(system, tariff);
  const summary = summariseScenarios(projection, system);
  return { projection, summary };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
