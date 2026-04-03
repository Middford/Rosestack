// ============================================================
// Backtest Engine
//
// Reads historical Agile rates from the agile_rates DB table and
// runs the dispatch algorithm against every historical day for a
// given system configuration. Stores results in backtest_daily_results.
//
// Supports both Agile dispatch (actual half-hourly rates) and
// IOF dispatch (fixed time-of-use bands) for tariff comparison.
// ============================================================

import { db } from '@/shared/db';
import {
  agileRates,
  backtestConfigs,
  backtestDailyResults,
} from '@/shared/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { SystemParams } from '@/modules/tariffs/dispatch-matrix';
import {
  buildMultiDayDispatchPlan,
  buildIofDayDispatch,
  type DayRates,
  type DailyMetric,
} from '@/modules/tariffs/multi-day-dispatch';
import { estimateSolarGeneration, getDayOfYear } from '@/modules/tariffs/solar-model';
import type { SystemConfig } from '@/modules/tariffs/system-presets';
import { configToParams, calculateCapex } from '@/modules/tariffs/system-presets';

// --- Types ---

export interface BacktestOptions {
  /** Pre-built SystemParams, OR a SystemConfig to convert */
  params: SystemParams;
  config?: SystemConfig;
  /** Date range (YYYY-MM-DD). Defaults to all available data. */
  fromDate?: string;
  toDate?: string;
  /** Run IOF comparison alongside Agile? Default true. */
  includeIof?: boolean;
  /** Name for the backtest config record */
  name?: string;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

export interface BacktestResult {
  configId: string;
  agile: BacktestAggregate;
  iof?: BacktestAggregate;
  monthly: MonthlyAggregate[];
  annual: AnnualAggregate[];
}

export interface BacktestAggregate {
  tariff: string;
  totalDays: number;
  totalNetRevenuePence: number;
  avgDailyRevenuePence: number;
  annualisedRevenueGbp: number;
  bestDayPence: number;
  bestDayDate: string;
  worstDayPence: number;
  worstDayDate: string;
  avgProfitableExportSlots: number;
  avgZeroCostChargeSlots: number;
}

export interface MonthlyAggregate {
  /** Calendar month 1-12 */
  month: number;
  monthLabel: string;
  agileAvgDailyPence: number;
  agileTotalDays: number;
  iofAvgDailyPence?: number;
  bestTariff: string;
  agileDeltaPence: number;
  avgProfitableExportSlots: number;
  avgZeroCostChargeSlots: number;
}

export interface AnnualAggregate {
  year: number;
  agileNetRevenuePence: number;
  agileRevenueGbp: number;
  daysCounted: number;
  iofNetRevenuePence?: number;
  iofRevenueGbp?: number;
}

// --- Constants ---

/** Minimum slots per day to consider it valid for backtesting */
const MIN_SLOTS_PER_DAY = 40;

/** Flat export rate (pence/kWh) for days before Agile Outgoing existed (pre-2019) */
const ASSUMED_EXPORT_RATE = 5.5;

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// --- Core Function ---

/**
 * Run a full backtest against historical Agile data in the database.
 */
export async function runBacktest(options: BacktestOptions): Promise<BacktestResult> {
  const {
    params,
    config,
    fromDate,
    toDate,
    includeIof = true,
    name = 'Custom backtest',
    onProgress,
  } = options;

  // Create or reuse config record
  const capex = config ? calculateCapex(config) : undefined;
  const [configRecord] = await db.insert(backtestConfigs).values({
    name,
    params: params as unknown as Record<string, unknown>,
    phaseType: config?.phaseType ?? 'three',
    totalCapacityKwh: params.totalCapacityKwh,
    totalInverterKw: Math.min(params.maxChargeRateKw, params.maxDischargeRateKw),
    solarKwp: params.solarKwp ?? 0,
    exportLimitKw: params.exportLimitKw ?? 999,
    totalCapexGbp: capex?.totalGbp ?? 0,
  }).returning();

  const configId = configRecord!.id;

  // Fetch all import rates from DB
  const importSlots = await queryRates('import', fromDate, toDate);
  const exportSlots = await queryRates('export', fromDate, toDate);

  // Group into daily maps (keyed by YYYY-MM-DD UK local date)
  const importByDate = groupByUkDate(importSlots);
  const exportByDate = groupByUkDate(exportSlots);

  // Build day list: only days with enough import slots
  const allDates = [...importByDate.keys()].sort();
  const validDates = allDates.filter(date => {
    const slots = importByDate.get(date);
    return slots && slots.length >= MIN_SLOTS_PER_DAY;
  });

  // Build DayRates array for multi-day dispatch
  const dayRatesArray: DayRates[] = validDates.map(date => {
    const importSlotArr = importByDate.get(date)!;
    const exportSlotArr = exportByDate.get(date);
    const dayOfYear = getDayOfYear(date);
    const solarKwh = params.solarKwp
      ? estimateSolarGeneration(dayOfYear, params.solarKwp)
      : undefined;

    return {
      date,
      importRates: slotsTo48Array(importSlotArr, 'import'),
      exportRates: exportSlotArr
        ? slotsTo48Array(exportSlotArr, 'export')
        : new Array(48).fill(ASSUMED_EXPORT_RATE),
      solarKwh,
    };
  });

  // Run Agile multi-day dispatch
  const agileResult = buildMultiDayDispatchPlan(params, dayRatesArray, 'AGILE');

  // Optionally run IOF dispatch for each day
  let iofMetrics: DailyMetric[] | undefined;
  if (includeIof) {
    iofMetrics = dayRatesArray.map(day => {
      const dayOfYear = getDayOfYear(day.date);
      const solarKwh = params.solarKwp
        ? estimateSolarGeneration(dayOfYear, params.solarKwp)
        : undefined;
      const iofPlan = buildIofDayDispatch(params, day.date, solarKwh);
      const lastSlot = iofPlan.slots[iofPlan.slots.length - 1];

      return {
        date: day.date,
        tariff: 'iof',
        totalChargeKwh: iofPlan.summary.totalChargeKwh,
        totalDischargeKwh: iofPlan.summary.totalDischargeKwh,
        totalImportCostPence: iofPlan.summary.totalImportCostPence,
        totalExportRevenuePence: iofPlan.summary.totalExportRevenuePence,
        netRevenuePence: iofPlan.summary.netRevenuePence,
        cyclesCompleted: iofPlan.summary.cyclesCompleted,
        profitableExportSlots: 6, // IOF: only 3hr peak = 6 slots
        zeroCostChargeSlots: 0, // IOF: no zero-cost charging possible
        endOfDaySoc: lastSlot?.socEnd ?? params.minSoc,
      };
    });
  }

  // Store results in DB (batch insert)
  await storeResults(configId, agileResult.dailyMetrics, 'agile');
  if (iofMetrics) {
    await storeResults(configId, iofMetrics, 'iof');
  }

  // Aggregate
  const agileAgg = aggregateMetrics(agileResult.dailyMetrics, 'agile');
  const iofAgg = iofMetrics ? aggregateMetrics(iofMetrics, 'iof') : undefined;

  const monthly = aggregateMonthly(agileResult.dailyMetrics, iofMetrics);
  const annual = aggregateAnnual(agileResult.dailyMetrics, iofMetrics);

  onProgress?.(validDates.length, validDates.length);

  return { configId, agile: agileAgg, iof: iofAgg, monthly, annual };
}

// --- DB Queries ---

interface RateRow {
  validFrom: string;
  validTo: string;
  valueIncVat: number;
}

async function queryRates(
  type: 'import' | 'export',
  fromDate?: string,
  toDate?: string,
): Promise<RateRow[]> {
  const conditions = [eq(agileRates.type, type)];
  if (fromDate) conditions.push(gte(agileRates.validFrom, `${fromDate}T00:00:00Z`));
  if (toDate) conditions.push(lte(agileRates.validFrom, `${toDate}T23:59:59Z`));

  const rows = await db.select({
    validFrom: agileRates.validFrom,
    validTo: agileRates.validTo,
    valueIncVat: agileRates.valueIncVat,
  })
    .from(agileRates)
    .where(and(...conditions))
    .orderBy(agileRates.validFrom);

  return rows;
}

// --- Grouping & Conversion ---

function groupByUkDate(slots: RateRow[]): Map<string, RateRow[]> {
  const map = new Map<string, RateRow[]>();
  for (const slot of slots) {
    const date = toUkDateString(slot.validFrom);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(slot);
  }
  return map;
}

function toUkDateString(isoUtc: string): string {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value ?? '';
  const m = parts.find(p => p.type === 'month')?.value ?? '';
  const dd = parts.find(p => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${dd}`;
}

function getUkSlotIndex(isoUtc: string): number {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  return hour * 2 + (minute >= 30 ? 1 : 0);
}

/**
 * Convert an array of rate rows for a single day into a 48-element array.
 * Missing slots filled with the day's average rate.
 */
function slotsTo48Array(slots: RateRow[], type: 'import' | 'export'): number[] {
  const arr = new Array<number>(48).fill(0);
  let total = 0;
  let count = 0;

  for (const slot of slots) {
    const idx = getUkSlotIndex(slot.validFrom);
    if (idx >= 0 && idx < 48) {
      arr[idx] = slot.valueIncVat;
      total += slot.valueIncVat;
      count++;
    }
  }

  // Fill gaps with average
  const avg = count > 0 ? total / count : (type === 'import' ? 20 : 10);
  for (let i = 0; i < 48; i++) {
    if (arr[i] === 0 && count > 0) arr[i] = avg;
  }

  return arr;
}

// --- Storage ---

async function storeResults(
  configId: string,
  metrics: DailyMetric[],
  tariff: string,
): Promise<void> {
  // Batch insert in chunks of 500
  for (let i = 0; i < metrics.length; i += 500) {
    const chunk = metrics.slice(i, i + 500);
    await db.insert(backtestDailyResults)
      .values(chunk.map(m => ({
        configId,
        date: m.date,
        tariff,
        totalChargeKwh: m.totalChargeKwh,
        totalDischargeKwh: m.totalDischargeKwh,
        totalImportCostPence: m.totalImportCostPence,
        totalExportRevenuePence: m.totalExportRevenuePence,
        netRevenuePence: m.netRevenuePence,
        cyclesCompleted: m.cyclesCompleted,
        profitableExportSlots: m.profitableExportSlots,
        zeroCostChargeSlots: m.zeroCostChargeSlots,
        endOfDaySoc: m.endOfDaySoc,
        exportSource: 'agile_outgoing',
      })))
      .onConflictDoNothing();
  }
}

// --- Aggregation ---

function aggregateMetrics(metrics: DailyMetric[], tariff: string): BacktestAggregate {
  const total = metrics.reduce((s, d) => s + d.netRevenuePence, 0);
  const avgDaily = metrics.length > 0 ? total / metrics.length : 0;
  let best = metrics[0];
  let worst = metrics[0];

  for (const m of metrics) {
    if (!best || m.netRevenuePence > best.netRevenuePence) best = m;
    if (!worst || m.netRevenuePence < worst.netRevenuePence) worst = m;
  }

  return {
    tariff,
    totalDays: metrics.length,
    totalNetRevenuePence: Math.round(total),
    avgDailyRevenuePence: Math.round(avgDaily),
    annualisedRevenueGbp: Math.round((avgDaily * 365) / 100),
    bestDayPence: best?.netRevenuePence ?? 0,
    bestDayDate: best?.date ?? '',
    worstDayPence: worst?.netRevenuePence ?? 0,
    worstDayDate: worst?.date ?? '',
    avgProfitableExportSlots: metrics.length > 0
      ? Math.round(metrics.reduce((s, d) => s + d.profitableExportSlots, 0) / metrics.length * 10) / 10
      : 0,
    avgZeroCostChargeSlots: metrics.length > 0
      ? Math.round(metrics.reduce((s, d) => s + d.zeroCostChargeSlots, 0) / metrics.length * 10) / 10
      : 0,
  };
}

function aggregateMonthly(
  agileMetrics: DailyMetric[],
  iofMetrics?: DailyMetric[],
): MonthlyAggregate[] {
  const agileByMonth = new Map<number, DailyMetric[]>();
  const iofByMonth = new Map<number, DailyMetric[]>();

  for (const m of agileMetrics) {
    const month = parseInt(m.date.slice(5, 7), 10);
    if (!agileByMonth.has(month)) agileByMonth.set(month, []);
    agileByMonth.get(month)!.push(m);
  }

  if (iofMetrics) {
    for (const m of iofMetrics) {
      const month = parseInt(m.date.slice(5, 7), 10);
      if (!iofByMonth.has(month)) iofByMonth.set(month, []);
      iofByMonth.get(month)!.push(m);
    }
  }

  const results: MonthlyAggregate[] = [];

  for (let month = 1; month <= 12; month++) {
    const agile = agileByMonth.get(month) ?? [];
    const iof = iofByMonth.get(month) ?? [];

    const agileAvg = agile.length > 0
      ? agile.reduce((s, d) => s + d.netRevenuePence, 0) / agile.length
      : 0;
    const iofAvg = iof.length > 0
      ? iof.reduce((s, d) => s + d.netRevenuePence, 0) / iof.length
      : undefined;

    const delta = iofAvg !== undefined ? agileAvg - iofAvg : agileAvg;
    const bestTariff = iofAvg !== undefined && iofAvg > agileAvg ? 'iof' : 'agile';

    results.push({
      month,
      monthLabel: MONTH_LABELS[month]!,
      agileAvgDailyPence: Math.round(agileAvg),
      agileTotalDays: agile.length,
      iofAvgDailyPence: iofAvg !== undefined ? Math.round(iofAvg) : undefined,
      bestTariff,
      agileDeltaPence: Math.round(delta),
      avgProfitableExportSlots: agile.length > 0
        ? Math.round(agile.reduce((s, d) => s + d.profitableExportSlots, 0) / agile.length * 10) / 10
        : 0,
      avgZeroCostChargeSlots: agile.length > 0
        ? Math.round(agile.reduce((s, d) => s + d.zeroCostChargeSlots, 0) / agile.length * 10) / 10
        : 0,
    });
  }

  return results;
}

function aggregateAnnual(
  agileMetrics: DailyMetric[],
  iofMetrics?: DailyMetric[],
): AnnualAggregate[] {
  const agileByYear = new Map<number, DailyMetric[]>();
  const iofByYear = new Map<number, DailyMetric[]>();

  for (const m of agileMetrics) {
    const year = parseInt(m.date.slice(0, 4), 10);
    if (!agileByYear.has(year)) agileByYear.set(year, []);
    agileByYear.get(year)!.push(m);
  }

  if (iofMetrics) {
    for (const m of iofMetrics) {
      const year = parseInt(m.date.slice(0, 4), 10);
      if (!iofByYear.has(year)) iofByYear.set(year, []);
      iofByYear.get(year)!.push(m);
    }
  }

  const years = [...new Set([...agileByYear.keys(), ...iofByYear.keys()])].sort();

  return years.map(year => {
    const agile = agileByYear.get(year) ?? [];
    const iof = iofByYear.get(year) ?? [];
    const agileTotal = agile.reduce((s, d) => s + d.netRevenuePence, 0);
    const iofTotal = iof.length > 0 ? iof.reduce((s, d) => s + d.netRevenuePence, 0) : undefined;

    return {
      year,
      agileNetRevenuePence: Math.round(agileTotal),
      agileRevenueGbp: Math.round(agileTotal / 100),
      daysCounted: agile.length,
      iofNetRevenuePence: iofTotal !== undefined ? Math.round(iofTotal) : undefined,
      iofRevenueGbp: iofTotal !== undefined ? Math.round(iofTotal / 100) : undefined,
    };
  });
}
