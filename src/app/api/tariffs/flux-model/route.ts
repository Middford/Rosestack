// ============================================================
// GET /api/tariffs/flux-model?months=12&batteryKwh=322&...
//
// Fetches historical Flux band rates from the flux_rates table
// and runs the Flux dispatch model day-by-day with actual rates.
//
// The flux_rates table stores 4 bands per day:
//   off-peak (01:00-04:00 UTC in winter, 02:00-05:00 UK)
//   day      (04:00-15:00 UTC / 05:00-16:00 UK)
//   peak     (15:00-18:00 UTC / 16:00-19:00 UK)
//   evening  (18:00-01:00 UTC / 19:00-02:00 UK = same as day rate)
//
// Returns the same structure as the Agile model API for comparison.
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { fluxRates } from '@/shared/db/schema';
import { and, gte, lte, eq, asc } from 'drizzle-orm';
import {
  runFluxHistoricalModel,
  type FluxHistoricalConfig,
  type FluxDayRates,
} from '@/modules/tariffs/flux-historical-model';

// UK timezone helpers
function toUkDate(isoUtc: string): string {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const p = fmt.formatToParts(d);
  return `${p.find(x => x.type === 'year')?.value}-${p.find(x => x.type === 'month')?.value}-${p.find(x => x.type === 'day')?.value}`;
}

function toUkHour(isoUtc: string): number {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit', hour12: false,
  });
  return parseInt(fmt.format(d));
}

/** Classify a UTC timestamp into a Flux band based on UK local time */
function classifyBand(isoUtc: string): 'offpeak' | 'day' | 'peak' {
  const hour = toUkHour(isoUtc);
  if (hour >= 2 && hour < 5) return 'offpeak';
  if (hour >= 16 && hour < 19) return 'peak';
  return 'day';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const config: FluxHistoricalConfig = {
    batteryCapKwh: Number(searchParams.get('batteryKwh') ?? 322),
    inverterKw: Number(searchParams.get('inverterKw') ?? 80),
    exportLimitKw: Number(searchParams.get('exportKw') ?? 66),
    solarKwp: Number(searchParams.get('solarKwp') ?? 25),
    efficiency: Number(searchParams.get('efficiency') ?? 0.93),
    houseKwhPerDay: Number(searchParams.get('houseKwh') ?? 24),
    hasHeatPump: searchParams.get('heatPump') !== 'false',
    evCount: Number(searchParams.get('evCount') ?? 2),
    evKwhPerDay: Number(searchParams.get('evKwhPerDay') ?? 7.8),
  };

  const months = Number(searchParams.get('months') ?? 12);

  try {
    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);
    const fromStr = fromDate.toISOString();
    const toStr = toDate.toISOString();

    // Fetch import rates from flux_rates
    const importRates = await db.select({
      validFrom: fluxRates.validFrom,
      validTo: fluxRates.validTo,
      valueIncVat: fluxRates.valueIncVat,
    })
      .from(fluxRates)
      .where(and(
        eq(fluxRates.type, 'import'),
        gte(fluxRates.validFrom, fromStr),
        lte(fluxRates.validFrom, toStr),
      ))
      .orderBy(asc(fluxRates.validFrom));

    // Fetch export rates
    const exportRates = await db.select({
      validFrom: fluxRates.validFrom,
      validTo: fluxRates.validTo,
      valueIncVat: fluxRates.valueIncVat,
    })
      .from(fluxRates)
      .where(and(
        eq(fluxRates.type, 'export'),
        gte(fluxRates.validFrom, fromStr),
        lte(fluxRates.validFrom, toStr),
      ))
      .orderBy(asc(fluxRates.validFrom));

    // Group rates by UK date and classify into bands
    // Each day should have: offpeak import/export, day import/export, peak import/export
    const dayMap = new Map<string, {
      offPeakImp?: number; offPeakExp?: number;
      dayImp?: number; dayExp?: number;
      peakImp?: number; peakExp?: number;
    }>();

    for (const r of importRates) {
      const ukDate = toUkDate(r.validFrom);
      const band = classifyBand(r.validFrom);
      if (!dayMap.has(ukDate)) dayMap.set(ukDate, {});
      const day = dayMap.get(ukDate)!;
      if (band === 'offpeak') day.offPeakImp = r.valueIncVat;
      else if (band === 'peak') day.peakImp = r.valueIncVat;
      else day.dayImp = r.valueIncVat;
    }

    for (const r of exportRates) {
      const ukDate = toUkDate(r.validFrom);
      const band = classifyBand(r.validFrom);
      if (!dayMap.has(ukDate)) dayMap.set(ukDate, {});
      const day = dayMap.get(ukDate)!;
      if (band === 'offpeak') day.offPeakExp = r.valueIncVat;
      else if (band === 'peak') day.peakExp = r.valueIncVat;
      else day.dayExp = r.valueIncVat;
    }

    // Build daily rates array — only include complete days
    const dates = [...dayMap.keys()]
      .filter(d => {
        const day = dayMap.get(d)!;
        return day.offPeakImp != null && day.offPeakExp != null
          && day.dayImp != null && day.dayExp != null
          && day.peakImp != null && day.peakExp != null;
      })
      .sort();

    const dailyRates: FluxDayRates[] = dates.map(date => {
      const day = dayMap.get(date)!;
      const month = parseInt(date.slice(5, 7));
      return {
        date,
        month,
        offPeakImp: day.offPeakImp!,
        offPeakExp: day.offPeakExp!,
        dayImp: day.dayImp!,
        dayExp: day.dayExp!,
        peakImp: day.peakImp!,
        peakExp: day.peakExp!,
      };
    });

    // Run the model
    const result = runFluxHistoricalModel(config, dailyRates);

    return NextResponse.json({
      config,
      dateRange: {
        from: dates[0] ?? null,
        to: dates[dates.length - 1] ?? null,
        totalDays: dates.length,
      },
      days: result.days,
      monthly: result.monthly,
      annual: result.annual,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (err) {
    console.error('[api/tariffs/flux-model] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
