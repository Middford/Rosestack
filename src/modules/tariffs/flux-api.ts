// ============================================================
// Octopus Flux API Integration — ENWL Region (North West England)
//
// Fetches live Flux tariff rates from the Octopus public API.
// No authentication required.
//
// Flux is a time-of-use tariff with 3 pricing bands:
//   Off-peak : 02:00–05:00  (3 hours  — cheapest import, lowest export)
//   Day      : 05:00–16:00 and 19:00–02:00  (13 hours — mid-rate)
//   Peak     : 16:00–19:00  (3 hours  — highest import, best export)
//
// Region G = ENWL (Electricity North West Limited), covering Lancashire
// and the wider North West of England — the primary deployment area.
//
// Tariff code format: E-1R-{PRODUCT_CODE}-{REGION}
//   Import: E-1R-FLUX-IMPORT-23-02-14-G
//   Export: E-1R-FLUX-EXPORT-23-02-14-G
//
// Rates change quarterly. This module:
//   1. Discovers the current product code via product discovery
//   2. Fetches unit rates (3 distinct values per direction)
//   3. Maps them to the 3-band structure by sorting (lowest=off-peak, highest=peak)
//   4. Fetches standing charges
//   5. Falls back to hardcoded values if the API is unavailable
// ============================================================

// --- Constants ---

const OCTOPUS_API_BASE = 'https://api.octopus.energy/v1';
const DEFAULT_REGION = 'G'; // North West England (ENWL)

// Known product codes — updated quarterly but the root name persists.
// Discovery will find the latest version; these are fallback identifiers.
const KNOWN_FLUX_IMPORT_CODE = 'FLUX-IMPORT-23-02-14';
const KNOWN_FLUX_EXPORT_CODE = 'FLUX-EXPORT-23-02-14';

// Fallback rates from confirmed Octopus API data (Region D/G, March 2026).
// Used when the live API is unavailable. Updated from data.ts Flux entry.
export const FLUX_FALLBACK_RATES: FluxRates = {
  import: {
    offPeak: 17.90,  // 02:00–05:00
    day: 29.83,      // 05:00–16:00 + 19:00–02:00
    peak: 41.77,     // 16:00–19:00
  },
  export: {
    offPeak: 5.12,
    day: 10.54,
    peak: 30.68,
  },
  standingCharge: 46.36, // pence/day
  productCode: KNOWN_FLUX_IMPORT_CODE,
  tariffCode: `E-1R-${KNOWN_FLUX_IMPORT_CODE}-${DEFAULT_REGION}`,
  region: DEFAULT_REGION,
  source: 'fallback',
  fetchedAt: new Date().toISOString(),
};

// --- Types ---

export interface FluxBandRates {
  offPeak: number;  // pence/kWh inc VAT
  day: number;
  peak: number;
}

export interface FluxRates {
  import: FluxBandRates;
  export: FluxBandRates;
  standingCharge: number;  // pence/day
  productCode: string;
  tariffCode: string;
  region: string;
  source: 'live' | 'fallback';
  fetchedAt: string;
}

interface OctopusProduct {
  code: string;
  direction: string;
  full_name: string;
  display_name: string;
  is_prepay: boolean;
  is_business: boolean;
  available_to: string | null;
}

interface OctopusProductsResponse {
  count: number;
  next: string | null;
  results: OctopusProduct[];
}

interface OctopusRateResult {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string | null;
  payment_method: string | null;
}

interface OctopusRatesResponse {
  count: number;
  next: string | null;
  results: OctopusRateResult[];
}

// --- Product Discovery ---

/**
 * Find the current active Flux product codes via the Octopus products API.
 * Returns { importCode, exportCode } — uses known fallback codes if discovery fails.
 */
export async function discoverFluxProductCodes(
  region: string = DEFAULT_REGION,
): Promise<{ importCode: string; exportCode: string }> {
  try {
    let url: string | null =
      `${OCTOPUS_API_BASE}/products/?is_business=false&is_prepay=false&page_size=100`;

    while (url) {
      const response = await fetchWithRetry(url);
      if (!response.ok) break;

      const data = (await response.json()) as OctopusProductsResponse;

      const fluxImport = data.results.find(
        p =>
          p.code.startsWith('FLUX-IMPORT') &&
          p.available_to === null &&
          !p.is_prepay &&
          !p.is_business,
      );
      const fluxExport = data.results.find(
        p =>
          p.code.startsWith('FLUX-EXPORT') &&
          p.available_to === null &&
          !p.is_prepay &&
          !p.is_business,
      );

      if (fluxImport && fluxExport) {
        return { importCode: fluxImport.code, exportCode: fluxExport.code };
      }

      url = data.next;
    }
  } catch {
    // Fall through to defaults
  }

  return {
    importCode: KNOWN_FLUX_IMPORT_CODE,
    exportCode: KNOWN_FLUX_EXPORT_CODE,
  };
}

// --- Rate Fetching ---

/**
 * Fetch current unit rates for a Flux product/tariff combination.
 *
 * Flux has 3 distinct rate bands. The API returns all historical rate rows;
 * we filter to those valid today and deduplicate by value to find the 3 bands.
 * Bands are mapped by sorting: lowest = off-peak, highest = peak, middle = day.
 *
 * @returns Array of { valueIncVat, validFrom } — one per distinct band.
 */
async function fetchFluxUnitRates(
  productCode: string,
  tariffCode: string,
): Promise<OctopusRateResult[]> {
  const today = new Date().toISOString().split('T')[0];
  const url =
    `${OCTOPUS_API_BASE}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/` +
    `?period_from=${today}T00:00:00Z&page_size=100`;

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(
      `Flux unit rates fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OctopusRatesResponse;
  return data.results;
}

/**
 * Fetch the current standing charge for a Flux tariff.
 * Returns pence/day inc VAT, or null if the fetch fails.
 */
async function fetchFluxStandingCharge(
  productCode: string,
  tariffCode: string,
): Promise<number | null> {
  const today = new Date().toISOString().split('T')[0];
  const url =
    `${OCTOPUS_API_BASE}/products/${productCode}/electricity-tariffs/${tariffCode}/standing-charges/` +
    `?period_from=${today}T00:00:00Z&page_size=10`;

  try {
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;

    const data = (await response.json()) as OctopusRatesResponse;
    if (data.results.length === 0) return null;

    // Take the most recent standing charge (last valid_from)
    const sorted = [...data.results].sort(
      (a, b) =>
        new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime(),
    );
    return round2(sorted[0]!.value_inc_vat);
  } catch {
    return null;
  }
}

// --- Band Mapping ---

/**
 * Map a set of distinct rate values to the 3 Flux bands.
 * Flux rates are monotonically: offPeak < day < peak.
 * We sort ascending and assign accordingly.
 */
function mapRatesToBands(rates: OctopusRateResult[]): FluxBandRates | null {
  if (rates.length === 0) return null;

  // Deduplicate by rounded value_inc_vat
  const seen = new Set<number>();
  const distinct: number[] = [];
  for (const r of rates) {
    const v = round2(r.value_inc_vat);
    if (!seen.has(v)) {
      seen.add(v);
      distinct.push(v);
    }
  }

  const sorted = distinct.sort((a, b) => a - b);

  if (sorted.length === 1) {
    // Single rate — flat tariff, use for all bands
    return { offPeak: sorted[0]!, day: sorted[0]!, peak: sorted[0]! };
  }
  if (sorted.length === 2) {
    // Two bands — off-peak and peak, day = peak
    return { offPeak: sorted[0]!, day: sorted[1]!, peak: sorted[1]! };
  }
  // 3+ bands — take lowest, middle, highest
  const offPeak = sorted[0]!;
  const peak = sorted[sorted.length - 1]!;
  const day = sorted[Math.floor(sorted.length / 2)]!;
  return { offPeak, day, peak };
}

// --- Main Entry Point ---

/**
 * Fetch the current Octopus Flux rates for the given region.
 *
 * Performs product discovery, fetches import/export unit rates and standing
 * charges, and maps the results to the 3-band structure. Falls back to
 * hardcoded rates if any step fails.
 *
 * All rates are in pence per kWh, inclusive of VAT.
 */
export async function fetchFluxRates(
  region: string = DEFAULT_REGION,
): Promise<FluxRates> {
  try {
    const { importCode, exportCode } = await discoverFluxProductCodes(region);

    const importTariffCode = `E-1R-${importCode}-${region}`;
    const exportTariffCode = `E-1R-${exportCode}-${region}`;

    // Fetch import, export, and standing charge in parallel
    const [importRates, exportRates, standingCharge] = await Promise.all([
      fetchFluxUnitRates(importCode, importTariffCode),
      fetchFluxUnitRates(exportCode, exportTariffCode),
      fetchFluxStandingCharge(importCode, importTariffCode),
    ]);

    const importBands = mapRatesToBands(importRates);
    const exportBands = mapRatesToBands(exportRates);

    if (!importBands || !exportBands) {
      console.warn('[flux-api] Could not map rate bands — using fallback');
      return FLUX_FALLBACK_RATES;
    }

    return {
      import: importBands,
      export: exportBands,
      standingCharge: standingCharge ?? FLUX_FALLBACK_RATES.standingCharge,
      productCode: importCode,
      tariffCode: importTariffCode,
      region,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(
      '[flux-api] Live fetch failed, using fallback rates:',
      err instanceof Error ? err.message : err,
    );
    return { ...FLUX_FALLBACK_RATES, fetchedAt: new Date().toISOString() };
  }
}

/**
 * Build the raw rate rows for insertion into tariff_rates table.
 * Returns one row per time band per direction.
 */
export function fluxRatesToDbRows(
  rates: FluxRates,
): Array<{
  productCode: string;
  tariffCode: string;
  direction: string;
  validFrom: Date;
  validTo: null;
  valueExcVat: number;
  valueIncVat: number;
  region: string;
}> {
  const now = new Date();
  // Approximate exc VAT by dividing by 1.05 (5% VAT on electricity)
  const toExcVat = (inc: number) => round2(inc / 1.05);

  const bands: Array<{ band: string; direction: 'import' | 'export'; value: number }> = [
    { band: 'off-peak', direction: 'import', value: rates.import.offPeak },
    { band: 'day',      direction: 'import', value: rates.import.day },
    { band: 'peak',     direction: 'import', value: rates.import.peak },
    { band: 'off-peak', direction: 'export', value: rates.export.offPeak },
    { band: 'day',      direction: 'export', value: rates.export.day },
    { band: 'peak',     direction: 'export', value: rates.export.peak },
  ];

  return bands.map(({ direction, value }) => ({
    productCode: rates.productCode,
    tariffCode: rates.tariffCode,
    direction,
    validFrom: now,
    validTo: null,
    valueExcVat: toExcVat(value),
    valueIncVat: value,
    region: rates.region,
  }));
}

// --- Helpers ---

async function fetchWithRetry(url: string, maxAttempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(500 * Math.pow(2, attempt - 1), 4000);
      await sleep(delayMs);
    }
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Fetch failed after ${maxAttempts} attempts: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
