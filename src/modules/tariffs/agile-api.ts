// ============================================================
// Octopus Agile API Integration — ENWL Region (North West England)
//
// Region code H = ENWL (Electricity North West Limited), covering
// the North West of England including Lancashire (where RoseStack
// properties are located). The Octopus tariff code suffix "-H"
// identifies this DNO region. Full region list:
//   A = Eastern, B = East Midlands, C = London, D = Merseyside & North Wales,
//   E = Midlands, F = North Eastern, G = North Western (old code for ENWL),
//   H = South Western, J = Southern, K = South Eastern, L = South Western,
//   M = Yorkshire, N = Southern, P = South Western
// Octopus uses "H" for ENWL (North West England / Lancashire) in AGILE-24-10-01.
//
// Public API — no authentication required.
// Base URL (import): https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-H/standard-unit-rates/
// Base URL (export): https://api.octopus.energy/v1/products/AGILE-OUTGOING-19-05-13/electricity-tariffs/E-1R-AGILE-OUTGOING-19-05-13-H/standard-unit-rates/
//
// Rates are returned in pence per kWh inclusive of VAT (5% for electricity).
// The API returns 48 half-hour slots per day in reverse chronological order.
// Pagination is via the `next` link in the response envelope.
// ============================================================

// --- Types ---

export interface AgileSlot {
  /** ISO 8601 UTC datetime string — start of this half-hour slot */
  validFrom: string;
  /** ISO 8601 UTC datetime string — end of this half-hour slot */
  validTo: string;
  /** Rate in pence per kWh, inclusive of VAT at 5% */
  valueIncVat: number;
}

interface OctopusApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    value_exc_vat: number;
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
    payment_method: string | null;
  }>;
}

// --- Constants ---

const AGILE_IMPORT_BASE =
  'https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-H/standard-unit-rates/';

const AGILE_EXPORT_BASE =
  'https://api.octopus.energy/v1/products/AGILE-OUTGOING-19-05-13/electricity-tariffs/E-1R-AGILE-OUTGOING-19-05-13-H/standard-unit-rates/';

/** Maximum slots the API returns per page */
const PAGE_SIZE = 100;

/** Default lookback when no date range is given: ~3 years of data */
const DEFAULT_LOOKBACK_DAYS = 1095;

// --- Core fetch function ---

/**
 * Fetch Agile rates from the Octopus public API with full pagination.
 *
 * @param from  Start of the date range (inclusive). Defaults to ~3 years ago.
 * @param to    End of the date range (inclusive). Defaults to now.
 * @param type  'import' (default) or 'export' for SEG/Agile Outgoing rates.
 * @returns     Array of AgileSlot sorted chronologically (oldest first).
 */
export async function fetchAgileRates(
  from?: Date,
  to?: Date,
  type: 'import' | 'export' = 'import',
): Promise<AgileSlot[]> {
  const baseUrl = type === 'export' ? AGILE_EXPORT_BASE : AGILE_IMPORT_BASE;

  const periodFrom = from
    ? from.toISOString()
    : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const periodTo = to ? to.toISOString() : new Date().toISOString();

  const params = new URLSearchParams({
    period_from: periodFrom,
    period_to: periodTo,
    page_size: String(PAGE_SIZE),
  });

  const slots: AgileSlot[] = [];
  let url: string | null = `${baseUrl}?${params.toString()}`;

  // Paginate through all results
  while (url !== null) {
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      const body = await response.text().catch(() => '(no body)');
      throw new Error(
        `Octopus API error: ${response.status} ${response.statusText} — ${body}`,
      );
    }

    const data: OctopusApiResponse = (await response.json()) as OctopusApiResponse;

    for (const result of data.results) {
      slots.push({
        validFrom: result.valid_from,
        validTo: result.valid_to,
        valueIncVat: Math.round(result.value_inc_vat * 100) / 100,
      });
    }

    url = data.next;
  }

  // API returns newest first — sort to chronological order (oldest first)
  slots.sort(
    (a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime(),
  );

  return slots;
}

/**
 * Fetch with exponential backoff retry on rate-limit (429) and transient errors.
 * The Octopus public API is generous but can 429 on rapid pagination.
 */
async function fetchWithRetry(
  url: string,
  maxAttempts: number = 4,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(500 * Math.pow(2, attempt - 1), 8000);
      await sleep(delayMs);
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        // Timeout guard via AbortController
        signal: AbortSignal.timeout(30_000),
      });

      // Retry on rate limit or server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      // Retry on network failures (TypeError from fetch)
      if (attempt === maxAttempts - 1) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch Octopus API after ${maxAttempts} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Grouping ---

/**
 * Group an array of AgileSlots by calendar date in the UK local timezone.
 *
 * Returns a Map keyed by "YYYY-MM-DD" (UK local date), where each entry
 * is an array of slots for that day sorted chronologically.
 * A full day has 48 slots (00:00–23:30).
 */
export function getDailySlots(rates: AgileSlot[]): Map<string, AgileSlot[]> {
  const byDate = new Map<string, AgileSlot[]>();

  for (const slot of rates) {
    // Convert UTC validFrom to UK local date
    const ukDate = toUkDateString(slot.validFrom);
    if (!byDate.has(ukDate)) {
      byDate.set(ukDate, []);
    }
    byDate.get(ukDate)!.push(slot);
  }

  // Sort each day's slots chronologically
  for (const [, slots] of byDate) {
    slots.sort(
      (a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime(),
    );
  }

  return byDate;
}

/**
 * Convert an ISO UTC string to a YYYY-MM-DD date string in UK local time
 * (Europe/London — accounts for BST/GMT transitions).
 */
function toUkDateString(isoUtc: string): string {
  const date = new Date(isoUtc);
  // Use Intl.DateTimeFormat for reliable UK timezone conversion
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value ?? '';
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

// --- Statistics ---

export interface AgileStatistics {
  mean: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  /** Percentage of slots with a negative rate (0–100) */
  negativePct: number;
}

/**
 * Calculate a statistical summary of a set of Agile rates.
 * All values are in pence per kWh.
 */
export function getStatistics(rates: AgileSlot[]): AgileStatistics {
  if (rates.length === 0) {
    return {
      mean: 0,
      median: 0,
      p10: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      min: 0,
      max: 0,
      negativePct: 0,
    };
  }

  const values = rates.map(r => r.valueIncVat).sort((a, b) => a - b);
  const n = values.length;

  const mean = round2(values.reduce((s, v) => s + v, 0) / n);
  const median = round2(percentile(values, 50));
  const p10 = round2(percentile(values, 10));
  const p25 = round2(percentile(values, 25));
  const p75 = round2(percentile(values, 75));
  const p90 = round2(percentile(values, 90));
  const min = round2(values[0]!);
  const max = round2(values[n - 1]!);
  const negativePct = round2(
    (values.filter(v => v < 0).length / n) * 100,
  );

  return { mean, median, p10, p25, p75, p90, min, max, negativePct };
}

/**
 * Linear interpolation percentile on a pre-sorted array.
 * @param sorted  Sorted array of numbers (ascending).
 * @param p       Percentile to calculate (0–100).
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const fraction = rank - lower;

  return (sorted[lower] ?? 0) + fraction * ((sorted[upper] ?? 0) - (sorted[lower] ?? 0));
}

// --- 48-Slot Average Profile ---

/**
 * Calculate the average rate for each of the 48 half-hour slots across all days
 * in the dataset. This is the foundation for the dispatch matrix optimiser.
 *
 * Slot mapping (UK local time):
 *   index 0  = 00:00–00:30
 *   index 1  = 00:30–01:00
 *   ...
 *   index 23 = 11:30–12:00
 *   index 24 = 12:00–12:30
 *   ...
 *   index 47 = 23:30–00:00
 *
 * @param rates  Array of AgileSlots (any date range, any order).
 * @returns      48-element array of average p/kWh per slot, index 0 = 00:00.
 */
export function getAverageProfileByHalfHour(rates: AgileSlot[]): number[] {
  // Accumulate totals and counts per slot index
  const totals = new Array<number>(48).fill(0);
  const counts = new Array<number>(48).fill(0);

  for (const slot of rates) {
    const slotIndex = getUkSlotIndex(slot.validFrom);
    if (slotIndex >= 0 && slotIndex < 48) {
      totals[slotIndex] += slot.valueIncVat;
      counts[slotIndex]++;
    }
  }

  return totals.map((total, i) =>
    counts[i]! > 0 ? round2(total / counts[i]!) : 0,
  );
}

/**
 * Derive the 0–47 slot index from an ISO UTC datetime string,
 * converted to UK local time.
 * Slot 0 = 00:00–00:30 UK local, slot 47 = 23:30–00:00 UK local.
 */
function getUkSlotIndex(isoUtc: string): number {
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

// --- Utility ---

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
