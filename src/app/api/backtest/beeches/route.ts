// ============================================================
// GET /api/backtest/beeches
//
// Runs the dispatch matrix against real Octopus Agile ENWL rates
// for The Beeches property (192kWh LFP, 96kW, 6kWp solar, BB7).
//
// Query parameters:
//   days  — number of days to backtest (default 90, max 365)
//           Fetching full 3 years requires the sync script instead.
//
// Returns:
//   daily[]     — per-day net revenue, cycles, charge/discharge kWh
//   monthly[]   — per-month aggregates
//   annual      — total revenue, avg daily, best/worst days
//   bySlot[]    — average revenue per 30-min slot (time-of-day profile)
//   params      — system parameters used
// ============================================================

import { NextResponse } from 'next/server';
import { fetchAgileRates, getDailySlots, getAverageProfileByHalfHour } from '@/modules/tariffs/agile-api';
import { buildDayDispatchPlan } from '@/modules/tariffs/dispatch-matrix';
import type { SystemParams } from '@/modules/tariffs/dispatch-matrix';

// ── The Beeches system parameters ──────────────────────────────────────────────
const BEECHES_PARAMS: SystemParams = {
  totalCapacityKwh: 192,
  maxChargeRateKw: 96,
  maxDischargeRateKw: 96,
  roundTripEfficiency: 0.92,
  minSoc: 0.05,
  maxSoc: 0.98,
  solarKwp: 6.0,
  exportLimitKw: 50,
};

// ── Solar generation model (simple sinusoidal seasonal model, 6kWp south-facing) ─
// Returns 48-slot array of solar generation kWh per slot for a given day-of-year.
function estimateSolarGeneration(dayOfYear: number): number[] {
  // Seasonal factor: peaks at summer solstice (day 172), zero in deep winter
  const seasonalFactor = Math.max(0, Math.sin((dayOfYear - 80) * (Math.PI / 185)));
  // Peak generation for 6kWp south-facing at 35° tilt in UK: ~4.8 kWh/kWp/day in summer
  const dailyKwh = BEECHES_PARAMS.solarKwp! * 4.8 * seasonalFactor;

  // Distribute across daylight slots (slots 14–38 = 07:00–19:00, bell-shaped)
  const slots = new Array<number>(48).fill(0);
  const peakSlot = 26; // 13:00 UK local
  const spread = 10; // half-width of daylight window in slots
  let total = 0;

  for (let i = 0; i < 48; i++) {
    const dist = Math.abs(i - peakSlot);
    if (dist <= spread) {
      slots[i] = Math.exp(-0.5 * Math.pow(dist / (spread * 0.5), 2));
      total += slots[i]!;
    }
  }

  // Normalise so sum = dailyKwh, cap each slot at inverter limit (96kW × 0.5hr = 48 kWh, but 6kWp realistically ~3kWh max)
  const scale = total > 0 ? dailyKwh / total : 0;
  return slots.map(v => Math.min(v * scale, 3.0));
}

// ── Per-day result type ─────────────────────────────────────────────────────────
export interface DayResult {
  date: string;
  netRevenuePence: number;
  netRevenueGbp: number;
  totalChargeKwh: number;
  totalDischargeKwh: number;
  totalImportCostPence: number;
  totalExportRevenuePence: number;
  cyclesCompleted: number;
  savingSessionRevenuePence: number;
  slotCount: number; // number of import slots available for this day
}

export interface MonthResult {
  month: string; // YYYY-MM
  label: string; // e.g. "Jan 2024"
  netRevenuePence: number;
  netRevenueGbp: number;
  totalChargeKwh: number;
  totalDischargeKwh: number;
  days: number;
  avgDailyGbp: number;
}

export interface SlotProfile {
  slotIndex: number;
  timeLabel: string;
  avgRevenuePence: number;
  avgImportRate: number;
  avgExportRate: number;
}

export interface BacktestResult {
  params: {
    propertyName: string;
    capacityKwh: number;
    inverterKw: number;
    solarKwp: number;
    exportLimitKw: number;
    days: number;
    fromDate: string;
    toDate: string;
    fetchedAt: string;
  };
  annual: {
    totalNetRevenuePence: number;
    totalNetRevenueGbp: number;
    annualisedRevenueGbp: number;
    avgDailyRevenueGbp: number;
    totalCycles: number;
    bestDay: DayResult;
    worstDay: DayResult;
    totalChargeKwh: number;
    totalDischargeKwh: number;
  };
  daily: DayResult[];
  monthly: MonthResult[];
  bySlot: SlotProfile[];
  importProfile48: number[];
  exportProfile48: number[];
}

// ── Handler ─────────────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
): Promise<NextResponse<BacktestResult | { error: string; details?: string }>> {
  const { searchParams } = new URL(request.url);

  const rawDays = searchParams.get('days');
  const requestedDays = rawDays ? parseInt(rawDays, 10) : 90;
  const days = Math.max(7, Math.min(365, isNaN(requestedDays) ? 90 : requestedDays));

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    // Fetch import and export rates in parallel
    const [importSlots, exportSlots] = await Promise.all([
      fetchAgileRates(fromDate, toDate, 'import'),
      fetchAgileRates(fromDate, toDate, 'export'),
    ]);

    if (importSlots.length === 0) {
      return NextResponse.json(
        { error: 'No import rate data returned from Octopus API.' },
        { status: 502 },
      );
    }

    // Group into days
    const importByDay = getDailySlots(importSlots);
    const exportByDay = getDailySlots(exportSlots);

    // Get all unique dates that have full 48-slot import data
    const completeDates = [...importByDay.entries()]
      .filter(([, slots]) => slots.length >= 40) // allow a few missing slots
      .map(([date]) => date)
      .sort();

    const dailyResults: DayResult[] = [];
    const slotRevenueTotals = new Array<number>(48).fill(0);
    const slotImportTotals = new Array<number>(48).fill(0);
    const slotExportTotals = new Array<number>(48).fill(0);
    const slotCounts = new Array<number>(48).fill(0);

    for (const date of completeDates) {
      const importDaySlots = importByDay.get(date) ?? [];
      const exportDaySlots = exportByDay.get(date) ?? [];

      // Build 48-element rate arrays, padding any gaps with 0
      const importRates = new Array<number>(48).fill(0);
      const exportRates = new Array<number>(48).fill(0);

      for (const s of importDaySlots) {
        const idx = slotIndexFromTime(s.validFrom);
        if (idx >= 0 && idx < 48) importRates[idx] = s.valueIncVat;
      }
      for (const s of exportDaySlots) {
        const idx = slotIndexFromTime(s.validFrom);
        if (idx >= 0 && idx < 48) exportRates[idx] = s.valueIncVat;
      }

      // Estimate solar for this day
      const dayOfYear = getDayOfYear(date);
      const solarKwh = estimateSolarGeneration(dayOfYear);

      // Run dispatch matrix
      const plan = buildDayDispatchPlan(
        BEECHES_PARAMS,
        importRates,
        exportRates,
        solarKwh,
        undefined,
        date,
      );

      const result: DayResult = {
        date,
        netRevenuePence: plan.summary.netRevenuePence,
        netRevenueGbp: Math.round(plan.summary.netRevenuePence) / 100,
        totalChargeKwh: plan.summary.totalChargeKwh,
        totalDischargeKwh: plan.summary.totalDischargeKwh,
        totalImportCostPence: plan.summary.totalImportCostPence,
        totalExportRevenuePence: plan.summary.totalExportRevenuePence,
        cyclesCompleted: plan.summary.cyclesCompleted,
        savingSessionRevenuePence: plan.summary.savingSessionRevenuePence,
        slotCount: importDaySlots.length,
      };

      dailyResults.push(result);

      // Accumulate per-slot averages
      for (const slot of plan.slots) {
        const i = slot.slotIndex;
        slotRevenueTotals[i]! += slot.revenuePence;
        slotImportTotals[i]! += slot.importRatePence;
        slotExportTotals[i]! += slot.exportRatePence;
        slotCounts[i]!++;
      }
    }

    if (dailyResults.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient rate data to run backtest. Try a shorter date range.' },
        { status: 422 },
      );
    }

    // ── Aggregate monthly ──────────────────────────────────────────────────────
    const monthMap = new Map<string, MonthResult>();
    for (const day of dailyResults) {
      const month = day.date.slice(0, 7); // YYYY-MM
      if (!monthMap.has(month)) {
        const [yr, mo] = month.split('-').map(Number);
        const label = new Date(yr!, mo! - 1, 1).toLocaleDateString('en-GB', {
          month: 'short', year: 'numeric',
        });
        monthMap.set(month, {
          month,
          label,
          netRevenuePence: 0,
          netRevenueGbp: 0,
          totalChargeKwh: 0,
          totalDischargeKwh: 0,
          days: 0,
          avgDailyGbp: 0,
        });
      }
      const m = monthMap.get(month)!;
      m.netRevenuePence += day.netRevenuePence;
      m.netRevenueGbp = Math.round(m.netRevenuePence) / 100;
      m.totalChargeKwh += day.totalChargeKwh;
      m.totalDischargeKwh += day.totalDischargeKwh;
      m.days++;
    }
    for (const m of monthMap.values()) {
      m.avgDailyGbp = m.days > 0 ? Math.round((m.netRevenueGbp / m.days) * 100) / 100 : 0;
    }
    const monthly = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    // ── Annual summary ─────────────────────────────────────────────────────────
    const totalNetRevenuePence = dailyResults.reduce((s, d) => s + d.netRevenuePence, 0);
    const totalCycles = dailyResults.reduce((s, d) => s + d.cyclesCompleted, 0);
    const totalChargeKwh = dailyResults.reduce((s, d) => s + d.totalChargeKwh, 0);
    const totalDischargeKwh = dailyResults.reduce((s, d) => s + d.totalDischargeKwh, 0);
    const avgDailyPence = totalNetRevenuePence / dailyResults.length;
    const annualisedPence = avgDailyPence * 365;

    const sortedByRevenue = [...dailyResults].sort((a, b) => b.netRevenuePence - a.netRevenuePence);
    const bestDay = sortedByRevenue[0]!;
    const worstDay = sortedByRevenue[sortedByRevenue.length - 1]!;

    // ── Per-slot profile ───────────────────────────────────────────────────────
    const bySlot: SlotProfile[] = Array.from({ length: 48 }, (_, i) => {
      const n = slotCounts[i] ?? 0;
      const h = Math.floor((i * 30) / 60);
      const m = (i * 30) % 60;
      return {
        slotIndex: i,
        timeLabel: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        avgRevenuePence: n > 0 ? Math.round(((slotRevenueTotals[i] ?? 0) / n) * 100) / 100 : 0,
        avgImportRate: n > 0 ? Math.round(((slotImportTotals[i] ?? 0) / n) * 100) / 100 : 0,
        avgExportRate: n > 0 ? Math.round(((slotExportTotals[i] ?? 0) / n) * 100) / 100 : 0,
      };
    });

    const importProfile48 = getAverageProfileByHalfHour(importSlots);
    const exportProfile48 = getAverageProfileByHalfHour(exportSlots);

    const result: BacktestResult = {
      params: {
        propertyName: 'The Beeches, Whalley (BB7)',
        capacityKwh: BEECHES_PARAMS.totalCapacityKwh,
        inverterKw: BEECHES_PARAMS.maxChargeRateKw,
        solarKwp: BEECHES_PARAMS.solarKwp ?? 0,
        exportLimitKw: BEECHES_PARAMS.exportLimitKw ?? 0,
        days: dailyResults.length,
        fromDate: dailyResults[0]?.date ?? '',
        toDate: dailyResults[dailyResults.length - 1]?.date ?? '',
        fetchedAt: new Date().toISOString(),
      },
      annual: {
        totalNetRevenuePence: Math.round(totalNetRevenuePence),
        totalNetRevenueGbp: Math.round(totalNetRevenuePence) / 100,
        annualisedRevenueGbp: Math.round(annualisedPence) / 100,
        avgDailyRevenueGbp: Math.round(avgDailyPence) / 100,
        totalCycles: Math.round(totalCycles * 100) / 100,
        bestDay,
        worstDay,
        totalChargeKwh: Math.round(totalChargeKwh * 10) / 10,
        totalDischargeKwh: Math.round(totalDischargeKwh * 10) / 10,
      },
      daily: dailyResults,
      monthly,
      bySlot,
      importProfile48,
      exportProfile48,
    };

    return NextResponse.json(result, {
      headers: {
        // Cache for 1 hour — Agile rates are published day-ahead
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/backtest/beeches] error:', err);
    return NextResponse.json(
      { error: 'Backtest failed', details: message },
      { status: 502 },
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get the 0–47 half-hour slot index from an ISO UTC string (UK local time). */
function slotIndexFromTime(isoUtc: string): number {
  const date = new Date(isoUtc);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  return hour * 2 + (minute >= 30 ? 1 : 0);
}

/** Day-of-year from YYYY-MM-DD string (1–365). */
function getDayOfYear(ymd: string): number {
  const d = new Date(ymd + 'T12:00:00Z');
  const start = new Date(d.getFullYear() + '-01-01T12:00:00Z');
  return Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}
