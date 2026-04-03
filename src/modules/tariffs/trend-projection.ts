// ============================================================
// Forward Projection & Daily Prediction Table
//
// Uses historical backtest results to project daily revenue for
// the next 365 days. Combines:
// - Seasonal indices (month-level revenue patterns)
// - Year-over-year trend (increasing/decreasing returns)
// - Battery degradation curve
// - Optimal monthly tariff switching
// - Three scenarios (best/likely/worst)
// ============================================================

import { db } from '@/shared/db';
import { dailyPredictions, backtestDailyResults } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { FOGSTAR_STACK } from '@/modules/tariffs/system-presets';
import type { MonthlyAggregate, AnnualAggregate } from '@/modules/tariffs/backtest-engine';

// --- Types ---

export interface ProjectionOptions {
  configId: string;
  monthly: MonthlyAggregate[];
  annual: AnnualAggregate[];
  /** Years since installation (for degradation) */
  yearsInstalled?: number;
  /** Total capacity at install */
  totalCapacityKwh: number;
}

export interface DailyPrediction {
  date: string;
  predictedRevenuePenceLikely: number;
  predictedRevenuePenceBest: number;
  predictedRevenuePenceWorst: number;
  optimalTariff: string;
  seasonalIndex: number;
  effectiveCapacityKwh: number;
}

export interface ProjectionSummary {
  predictions: DailyPrediction[];
  annualTotals: {
    likely: number; // GBP
    best: number;
    worst: number;
  };
  monthlyTotals: Array<{
    month: number;
    label: string;
    likely: number;
    best: number;
    worst: number;
    optimalTariff: string;
  }>;
  trend: {
    annualGrowthRate: number; // e.g. 0.05 = 5% year-over-year
    direction: 'increasing' | 'stable' | 'decreasing';
  };
}

// --- Scenario Multipliers ---

const SCENARIO_MULTIPLIERS = {
  best: {
    energyInflation: 1.08,  // 8% growth
    spreadChange: 1.15,     // 15% wider spreads
    label: 'Best case',
  },
  likely: {
    energyInflation: 1.05,  // 5% growth
    spreadChange: 1.0,      // No change
    label: 'Likely case',
  },
  worst: {
    energyInflation: 1.02,  // 2% growth
    spreadChange: 0.80,     // 20% narrower spreads
    label: 'Worst case',
  },
} as const;

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// --- Core Function ---

/**
 * Generate daily revenue predictions for the next 365 days.
 */
export function generateDailyPredictions(
  options: ProjectionOptions,
): ProjectionSummary {
  const {
    monthly,
    annual,
    yearsInstalled = 0,
    totalCapacityKwh,
  } = options;

  // Calculate seasonal indices (ratio of each month's avg to overall avg)
  const overallAvgDaily = monthly.reduce((s, m) => s + m.agileAvgDailyPence, 0) / 12;
  const seasonalIndices: Record<number, number> = {};
  const optimalTariffByMonth: Record<number, string> = {};

  for (const m of monthly) {
    // Use the optimal switching revenue (best of agile/iof per month)
    const bestDailyPence = m.iofAvgDailyPence !== undefined
      ? Math.max(m.agileAvgDailyPence, m.iofAvgDailyPence)
      : m.agileAvgDailyPence;
    seasonalIndices[m.month] = overallAvgDaily > 0 ? bestDailyPence / overallAvgDaily : 1;
    optimalTariffByMonth[m.month] = m.bestTariff;
  }

  // Calculate year-over-year trend from annual backtest data
  const trend = calculateTrend(annual);

  // Generate predictions for next 365 days
  const today = new Date();
  const predictions: DailyPrediction[] = [];

  for (let dayOffset = 1; dayOffset <= 365; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().slice(0, 10);
    const month = date.getMonth() + 1; // 1-12

    const seasonalIndex = seasonalIndices[month] ?? 1;
    const tariff = optimalTariffByMonth[month] ?? 'agile';

    // Years from now for degradation
    const yearsFromNow = yearsInstalled + (dayOffset / 365);
    const degradation = Math.max(0.5, 1 - FOGSTAR_STACK.degradationRate * yearsFromNow);
    const effectiveCapacity = totalCapacityKwh * degradation;

    // Base daily revenue from the optimal switching strategy (backtest average)
    const baseDailyPence = overallAvgDaily * seasonalIndex;

    // Apply trend and scenarios
    const trendYears = dayOffset / 365; // fractional year into the future
    const likelyPence = baseDailyPence
      * Math.pow(SCENARIO_MULTIPLIERS.likely.energyInflation, trendYears)
      * SCENARIO_MULTIPLIERS.likely.spreadChange
      * degradation;
    const bestPence = baseDailyPence
      * Math.pow(SCENARIO_MULTIPLIERS.best.energyInflation, trendYears)
      * SCENARIO_MULTIPLIERS.best.spreadChange
      * degradation;
    const worstPence = baseDailyPence
      * Math.pow(SCENARIO_MULTIPLIERS.worst.energyInflation, trendYears)
      * SCENARIO_MULTIPLIERS.worst.spreadChange
      * degradation;

    predictions.push({
      date: dateStr,
      predictedRevenuePenceLikely: Math.round(likelyPence),
      predictedRevenuePenceBest: Math.round(bestPence),
      predictedRevenuePenceWorst: Math.round(worstPence),
      optimalTariff: tariff,
      seasonalIndex: Math.round(seasonalIndex * 100) / 100,
      effectiveCapacityKwh: Math.round(effectiveCapacity * 10) / 10,
    });
  }

  // Monthly totals
  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const monthPreds = predictions.filter(p => parseInt(p.date.slice(5, 7), 10) === m);
    return {
      month: m,
      label: MONTH_LABELS[m]!,
      likely: Math.round(monthPreds.reduce((s, p) => s + p.predictedRevenuePenceLikely, 0) / 100),
      best: Math.round(monthPreds.reduce((s, p) => s + p.predictedRevenuePenceBest, 0) / 100),
      worst: Math.round(monthPreds.reduce((s, p) => s + p.predictedRevenuePenceWorst, 0) / 100),
      optimalTariff: optimalTariffByMonth[m] ?? 'agile',
    };
  });

  // Annual totals
  const annualTotals = {
    likely: Math.round(predictions.reduce((s, p) => s + p.predictedRevenuePenceLikely, 0) / 100),
    best: Math.round(predictions.reduce((s, p) => s + p.predictedRevenuePenceBest, 0) / 100),
    worst: Math.round(predictions.reduce((s, p) => s + p.predictedRevenuePenceWorst, 0) / 100),
  };

  return { predictions, annualTotals, monthlyTotals, trend };
}

/**
 * Store daily predictions in the database.
 */
export async function storeDailyPredictions(
  configId: string,
  predictions: DailyPrediction[],
): Promise<void> {
  // Batch insert in chunks of 500
  for (let i = 0; i < predictions.length; i += 500) {
    const chunk = predictions.slice(i, i + 500);
    await db.insert(dailyPredictions)
      .values(chunk.map(p => ({
        configId,
        date: p.date,
        predictedRevenuePenceLikely: p.predictedRevenuePenceLikely,
        predictedRevenuePenceBest: p.predictedRevenuePenceBest,
        predictedRevenuePenceWorst: p.predictedRevenuePenceWorst,
        optimalTariff: p.optimalTariff,
        seasonalIndex: p.seasonalIndex,
        effectiveCapacityKwh: p.effectiveCapacityKwh,
      })))
      .onConflictDoNothing();
  }
}

// --- Trend Calculation ---

function calculateTrend(
  annual: AnnualAggregate[],
): { annualGrowthRate: number; direction: 'increasing' | 'stable' | 'decreasing' } {
  // Need at least 2 years to calculate a trend
  const validYears = annual.filter(a => a.daysCounted >= 300); // Nearly full years
  if (validYears.length < 2) {
    return { annualGrowthRate: 0.05, direction: 'stable' }; // Default assumption
  }

  // Calculate year-over-year growth rates
  const growthRates: number[] = [];
  for (let i = 1; i < validYears.length; i++) {
    const prev = validYears[i - 1]!;
    const curr = validYears[i]!;
    if (prev.agileRevenueGbp > 0) {
      const growth = (curr.agileRevenueGbp - prev.agileRevenueGbp) / prev.agileRevenueGbp;
      growthRates.push(growth);
    }
  }

  if (growthRates.length === 0) {
    return { annualGrowthRate: 0.05, direction: 'stable' };
  }

  const avgGrowth = growthRates.reduce((s, r) => s + r, 0) / growthRates.length;
  const direction = avgGrowth > 0.03 ? 'increasing'
    : avgGrowth < -0.03 ? 'decreasing'
      : 'stable';

  return {
    annualGrowthRate: Math.round(avgGrowth * 1000) / 1000,
    direction,
  };
}
