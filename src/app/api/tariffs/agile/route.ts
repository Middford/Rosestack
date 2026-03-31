// ============================================================
// GET /api/tariffs/agile
//
// Proxy endpoint for Octopus Agile rates (ENWL region H).
// Fetches from the public Octopus API with pagination and returns
// a combined response with slots, statistics, and 48-slot profile.
//
// Query parameters:
//   from    — YYYY-MM-DD start date (optional, defaults to ~3 years ago)
//   to      — YYYY-MM-DD end date   (optional, defaults to today)
//   region  — Octopus region code   (optional, default "H" = ENWL North West)
//   type    — "import" | "export"   (optional, default "import")
//
// Region H = ENWL (Electricity North West Limited), serving Lancashire
// and the wider North West of England — the primary area for RoseStack
// battery deployments. Changing this parameter is not yet supported in
// the fetch layer (hardcoded to H) but is accepted for future extension.
//
// Returns:
//   { slots: AgileSlot[], statistics: AgileStatistics, profileBy48Slot: number[] }
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  fetchAgileRates,
  getStatistics,
  getAverageProfileByHalfHour,
} from '@/modules/tariffs/agile-api';
import type { AgileSlot, AgileStatistics } from '@/modules/tariffs/agile-api';

// --- Input validation schema ---

const QuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD')
    .optional(),
  region: z.string().max(2).optional().default('H'),
  type: z.enum(['import', 'export']).optional().default('import'),
});

// --- Response shape ---

interface AgileRouteResponse {
  slots: AgileSlot[];
  statistics: AgileStatistics;
  profileBy48Slot: number[];
  meta: {
    region: string;
    type: 'import' | 'export';
    slotCount: number;
    from: string | null;
    to: string | null;
    fetchedAt: string;
  };
}

interface AgileRouteError {
  error: string;
  details?: string;
}

// --- Handler ---

export async function GET(
  request: Request,
): Promise<NextResponse<AgileRouteResponse | AgileRouteError>> {
  const { searchParams } = new URL(request.url);

  // Validate query parameters
  const parseResult = QuerySchema.safeParse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parseResult.error.issues
          .map(i => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      },
      { status: 400 },
    );
  }

  const { from, to, type } = parseResult.data;
  const region = parseResult.data.region;

  // Parse date strings to Date objects
  const fromDate = from ? parseLocalDate(from) : undefined;
  const toDate = to ? parseLocalDateEnd(to) : undefined;

  // Validate date range logic
  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json(
      { error: 'Invalid date range: from must be before to' },
      { status: 400 },
    );
  }

  try {
    // Fetch from Octopus API (region H is hardcoded in the fetch layer;
    // the region param is accepted here for future multi-region support)
    const slots = await fetchAgileRates(fromDate, toDate, type);
    const statistics = getStatistics(slots);
    const profileBy48Slot = getAverageProfileByHalfHour(slots);

    const response: AgileRouteResponse = {
      slots,
      statistics,
      profileBy48Slot,
      meta: {
        region,
        type,
        slotCount: slots.length,
        from: from ?? null,
        to: to ?? null,
        fetchedAt: new Date().toISOString(),
      },
    };

    // Cache for 30 minutes (Agile prices are published day-ahead at ~4pm,
    // so frequent polling is unnecessary and respectful to the public API)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Distinguish timeout / rate-limit from other errors for better client handling
    if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'Octopus API rate limit reached. Retry in a few minutes.',
          details: message,
        },
        { status: 429 },
      );
    }

    if (message.includes('timeout') || message.toLowerCase().includes('abort')) {
      return NextResponse.json(
        {
          error: 'Request to Octopus API timed out.',
          details: message,
        },
        { status: 504 },
      );
    }

    console.error('[api/tariffs/agile] fetch error:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch Agile rates from Octopus API.',
        details: message,
      },
      { status: 502 },
    );
  }
}

// --- Date helpers ---

/**
 * Parse "YYYY-MM-DD" as the start of that day in UTC midnight.
 * The Octopus API accepts ISO 8601; we use UTC midnight as the lower bound.
 */
function parseLocalDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

/**
 * Parse "YYYY-MM-DD" as the end of that day (23:59:59 UTC).
 */
function parseLocalDateEnd(ymd: string): Date {
  return new Date(`${ymd}T23:59:59Z`);
}
