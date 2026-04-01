// ============================================================
// GET /api/tariffs/rates
//
// Returns current tariff rates for revenue calculation.
// Tries the tariff_summary DB table first (fast), falls back to
// a live Octopus API fetch if no DB record exists, then falls
// back to hardcoded fallback values.
//
// Query parameters:
//   tariff  — 'flux' | 'iof' | 'agile' (default: 'flux')
//   region  — Octopus region letter     (default: 'G' = ENWL NW)
//
// Response shape: FluxRates (see flux-api.ts)
//
// Cache: 1 hour (rates change at most quarterly for Flux,
//         daily for Agile — caller should use /api/tariffs/refresh
//         for on-demand updates)
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/shared/db';
import { tariffSummary } from '@/shared/db/schema';
import {
  fetchFluxRates,
  FLUX_FALLBACK_RATES,
  type FluxRates,
} from '@/modules/tariffs/flux-api';

// --- Input validation ---

const QuerySchema = z.object({
  tariff: z.enum(['flux', 'iof', 'agile']).optional().default('flux'),
  region: z.string().max(2).optional().default('G'),
});

// --- Handler ---

export async function GET(
  request: Request,
): Promise<NextResponse<FluxRates | { error: string }>> {
  const { searchParams } = new URL(request.url);

  const parse = QuerySchema.safeParse({
    tariff: searchParams.get('tariff') ?? undefined,
    region: searchParams.get('region') ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters' },
      { status: 400 },
    );
  }

  const { tariff, region } = parse.data;

  // 1. Try DB summary (fast path — populated by /api/tariffs/refresh)
  const dbRates = await getRatesFromDb(tariff, region);
  if (dbRates) {
    return NextResponse.json(dbRates, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    });
  }

  // 2. Live API fetch (slower — only when DB is empty)
  if (tariff === 'flux') {
    try {
      const liveRates = await fetchFluxRates(region);
      return NextResponse.json(liveRates, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
      });
    } catch {
      // Fall through to fallback
    }
  }

  // 3. Hardcoded fallback
  return NextResponse.json(FLUX_FALLBACK_RATES, {
    headers: { 'Cache-Control': 'public, s-maxage=1800' },
  });
}

// --- DB lookup ---

async function getRatesFromDb(
  tariff: string,
  region: string,
): Promise<FluxRates | null> {
  try {
    const rows = await db
      .select()
      .from(tariffSummary)
      .where(
        and(
          eq(tariffSummary.tariffName, tariff),
          eq(tariffSummary.region, region),
        ),
      )
      .orderBy(desc(tariffSummary.updatedAt))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;
    if (
      row.offPeakImport === null ||
      row.dayImport === null ||
      row.peakImport === null ||
      row.offPeakExport === null ||
      row.dayExport === null ||
      row.peakExport === null
    ) {
      return null;
    }

    return {
      import: {
        offPeak: row.offPeakImport,
        day: row.dayImport,
        peak: row.peakImport,
      },
      export: {
        offPeak: row.offPeakExport,
        day: row.dayExport,
        peak: row.peakExport,
      },
      standingCharge: row.standingCharge ?? FLUX_FALLBACK_RATES.standingCharge,
      productCode: 'FLUX-IMPORT-23-02-14',
      tariffCode: `E-1R-FLUX-IMPORT-23-02-14-${region}`,
      region,
      source: 'live',
      fetchedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}
