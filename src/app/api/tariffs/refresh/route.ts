// ============================================================
// POST /api/tariffs/refresh
//
// Admin endpoint — fetches the latest Octopus Flux rates and stores
// them in the tariff_rates and tariff_summary DB tables.
//
// Also accepts GET for cron-triggered calls (Vercel cron, etc.).
//
// Usage:
//   POST /api/tariffs/refresh?type=flux          (fetch Flux only)
//   POST /api/tariffs/refresh?type=all           (fetch all — default)
//   GET  /api/tariffs/refresh                    (cron-safe, same as "all")
//
// Called by:
//   - Admin dashboard "Refresh Rates" button
//   - Weekly cron for Flux rate checks
//   - Daily cron for Agile rates (Agile path delegates to agile-api.ts)
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { tariffRates, tariffSummary } from '@/shared/db/schema';
import { fetchFluxRates, fluxRatesToDbRows } from '@/modules/tariffs/flux-api';

// --- Input validation ---

const QuerySchema = z.object({
  type: z.enum(['flux', 'all']).optional().default('all'),
});

// --- Response types ---

interface RefreshResult {
  success: boolean;
  tariff: string;
  source: 'live' | 'fallback';
  ratesInserted: number;
  summaryUpserted: boolean;
  rates: {
    import: { offPeak: number; day: number; peak: number };
    export: { offPeak: number; day: number; peak: number };
    standingCharge: number;
    spread: number;
  };
  fetchedAt: string;
}

interface RefreshResponse {
  results: RefreshResult[];
  durationMs: number;
  refreshedAt: string;
}

// --- Handler ---

export async function GET(
  request: Request,
): Promise<NextResponse<RefreshResponse | { error: string }>> {
  return handleRefresh(request);
}

export async function POST(
  request: Request,
): Promise<NextResponse<RefreshResponse | { error: string }>> {
  return handleRefresh(request);
}

async function handleRefresh(
  request: Request,
): Promise<NextResponse<RefreshResponse | { error: string }>> {
  const { searchParams } = new URL(request.url);

  const parse = QuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid query: type must be "flux" or "all"' },
      { status: 400 },
    );
  }

  const startMs = Date.now();
  const results: RefreshResult[] = [];

  // --- Flux refresh ---
  if (parse.data.type === 'flux' || parse.data.type === 'all') {
    const fluxResult = await refreshFlux();
    results.push(fluxResult);
  }

  return NextResponse.json(
    {
      results,
      durationMs: Date.now() - startMs,
      refreshedAt: new Date().toISOString(),
    },
    {
      headers: {
        // No caching — always fetch fresh on explicit refresh
        'Cache-Control': 'no-store',
      },
    },
  );
}

// --- Flux refresh logic ---

async function refreshFlux(): Promise<RefreshResult> {
  const rates = await fetchFluxRates('G');
  const rows = fluxRatesToDbRows(rates);

  let ratesInserted = 0;
  let summaryUpserted = false;

  try {
    // Insert raw rate rows
    await db.insert(tariffRates).values(
      rows.map(r => ({
        productCode: r.productCode,
        tariffCode: r.tariffCode,
        direction: r.direction,
        validFrom: r.validFrom,
        validTo: r.validTo,
        valueExcVat: r.valueExcVat,
        valueIncVat: r.valueIncVat,
        region: r.region,
      })),
    );
    ratesInserted = rows.length;

    // Upsert summary row for quick lookups
    const spread = round2(rates.export.peak - rates.import.offPeak);

    await db.insert(tariffSummary).values({
      tariffName: 'flux',
      region: rates.region,
      offPeakImport: rates.import.offPeak,
      dayImport: rates.import.day,
      peakImport: rates.import.peak,
      offPeakExport: rates.export.offPeak,
      dayExport: rates.export.day,
      peakExport: rates.export.peak,
      standingCharge: rates.standingCharge,
      spread,
      validFrom: new Date(),
      updatedAt: new Date(),
    });
    summaryUpserted = true;
  } catch (dbErr) {
    // Log but don't fail the response — rates were still fetched successfully
    console.error('[refresh/flux] DB write error:', dbErr);
  }

  const spread = round2(rates.export.peak - rates.import.offPeak);

  return {
    success: true,
    tariff: 'flux',
    source: rates.source,
    ratesInserted,
    summaryUpserted,
    rates: {
      import: rates.import,
      export: rates.export,
      standingCharge: rates.standingCharge,
      spread,
    },
    fetchedAt: rates.fetchedAt,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
