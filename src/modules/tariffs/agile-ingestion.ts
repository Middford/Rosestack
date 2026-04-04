// ============================================================
// Agile Rate Ingestion Service
//
// Fetches historical half-hourly rates from the Octopus public API
// across multiple product codes and stores them in the agile_rates
// table. Deduplication via ON CONFLICT on (type, valid_from, region).
//
// Products are ingested in priority order (lowest number first) so
// the newest product code wins when date ranges overlap.
// ============================================================

import { db } from '@/shared/db';
import { agileRates, agileIngestionJobs } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// --- Product Registry ---

export interface AgileProduct {
  code: string;
  type: 'import' | 'export';
  region: string;
  priority: number; // lower = ingested first = wins dedup for overlapping dates
  description: string;
}

export const AGILE_PRODUCTS: AgileProduct[] = ([
  {
    code: 'AGILE-24-10-01',
    type: 'import' as const,
    region: 'N',
    priority: 1,
    description: 'Current Agile import (Oct 2024+)',
  },
  {
    code: 'AGILE-FLEX-22-11-25',
    type: 'import' as const,
    region: 'N',
    priority: 2,
    description: 'Previous Agile import (Nov 2022 – Oct 2024)',
  },
  {
    code: 'AGILE-18-02-21',
    type: 'import' as const,
    region: 'N',
    priority: 3,
    description: 'Original Agile import (Mar 2018 – Nov 2022)',
  },
  {
    code: 'AGILE-OUTGOING-19-05-13',
    type: 'export' as const,
    region: 'N',
    priority: 1,
    description: 'Agile export / Outgoing (May 2019+)',
  },
] satisfies AgileProduct[]).sort((a, b) => a.priority - b.priority);

// --- Constants ---

const PAGE_SIZE = 1500; // Octopus API allows up to 1500 per page
const INTER_PAGE_DELAY_MS = 250; // Respectful rate limiting
const BATCH_INSERT_SIZE = 500; // Rows per DB insert

// --- Types ---

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

export interface IngestionProgress {
  jobId: string;
  productCode: string;
  status: 'running' | 'completed' | 'failed';
  totalSlots: number;
  insertedSlots: number;
  skippedSlots: number;
  pagesProcessed: number;
}

export type ProgressCallback = (progress: IngestionProgress) => void;

// --- Core Functions ---

/**
 * Build the Octopus API URL for a given product code and region.
 * Pattern: E-1R-{PRODUCT_CODE}-{REGION}
 */
function buildApiUrl(product: AgileProduct): string {
  const tariffCode = `E-1R-${product.code}-${product.region}`;
  return `https://api.octopus.energy/v1/products/${product.code}/electricity-tariffs/${tariffCode}/standard-unit-rates/`;
}

/**
 * Ingest all historical rates for a single Octopus product.
 * Paginates through the API, batch-inserts into DB with dedup.
 */
export async function ingestProduct(
  product: AgileProduct,
  onProgress?: ProgressCallback,
): Promise<IngestionProgress> {
  // Create job record
  const [job] = await db.insert(agileIngestionJobs).values({
    productCode: product.code,
    type: product.type,
    status: 'running',
    startedAt: new Date(),
  }).returning();

  const progress: IngestionProgress = {
    jobId: job!.id,
    productCode: product.code,
    status: 'running',
    totalSlots: 0,
    insertedSlots: 0,
    skippedSlots: 0,
    pagesProcessed: 0,
  };

  try {
    const baseUrl = buildApiUrl(product);
    const params = new URLSearchParams({
      page_size: String(PAGE_SIZE),
      ordering: 'period', // oldest first for consistent progress
    });

    let url: string | null = `${baseUrl}?${params.toString()}`;
    let batch: typeof agileRates.$inferInsert[] = [];

    while (url !== null) {
      const response = await fetchWithRetry(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: OctopusApiResponse = await response.json() as OctopusApiResponse;

      for (const result of data.results) {
        batch.push({
          type: product.type,
          productCode: product.code,
          validFrom: result.valid_from,
          validTo: result.valid_to,
          valueIncVat: Math.round(result.value_inc_vat * 100) / 100,
          region: product.region,
        });

        if (batch.length >= BATCH_INSERT_SIZE) {
          const inserted = await insertBatch(batch);
          progress.insertedSlots += inserted;
          progress.skippedSlots += batch.length - inserted;
          progress.totalSlots += batch.length;
          batch = [];
        }
      }

      progress.pagesProcessed++;
      onProgress?.(progress);

      url = data.next;

      // Respect rate limits between pages
      if (url) {
        await sleep(INTER_PAGE_DELAY_MS);
      }
    }

    // Flush remaining batch
    if (batch.length > 0) {
      const inserted = await insertBatch(batch);
      progress.insertedSlots += inserted;
      progress.skippedSlots += batch.length - inserted;
      progress.totalSlots += batch.length;
    }

    progress.status = 'completed';
    onProgress?.(progress);

    // Update job record
    await db.update(agileIngestionJobs)
      .set({
        status: 'completed',
        totalSlots: progress.totalSlots,
        insertedSlots: progress.insertedSlots,
        skippedSlots: progress.skippedSlots,
        completedAt: new Date(),
      })
      .where(eq(agileIngestionJobs.id, job!.id));

    return progress;
  } catch (err) {
    progress.status = 'failed';
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';

    await db.update(agileIngestionJobs)
      .set({
        status: 'failed',
        totalSlots: progress.totalSlots,
        insertedSlots: progress.insertedSlots,
        skippedSlots: progress.skippedSlots,
        error: errorMsg,
        completedAt: new Date(),
      })
      .where(eq(agileIngestionJobs.id, job!.id));

    throw err;
  }
}

/**
 * Ingest all historical products in priority order.
 * Higher-priority products are ingested first so their data wins the
 * dedup race when date ranges overlap.
 */
export async function ingestAllProducts(
  onProgress?: ProgressCallback,
): Promise<IngestionProgress[]> {
  const results: IngestionProgress[] = [];

  for (const product of AGILE_PRODUCTS) {
    const result = await ingestProduct(product, onProgress);
    results.push(result);
  }

  return results;
}

/**
 * Fetch latest rates since the most recent data in DB.
 * Used for daily incremental updates.
 */
export async function ingestLatestRates(): Promise<{
  importInserted: number;
  exportInserted: number;
}> {
  // Find the most recent import and export timestamps in the DB
  const latestImport = await db.execute(
    sql`SELECT MAX(valid_from) as max_from FROM agile_rates WHERE type = 'import'`,
  );
  const latestExport = await db.execute(
    sql`SELECT MAX(valid_from) as max_from FROM agile_rates WHERE type = 'export'`,
  );

  const importFrom = (latestImport[0] as { max_from: string | null })?.max_from;
  const exportFrom = (latestExport[0] as { max_from: string | null })?.max_from;

  let importInserted = 0;
  let exportInserted = 0;

  // Fetch new import rates (current product code)
  if (importFrom) {
    const importProduct = AGILE_PRODUCTS.find(p => p.code === 'AGILE-24-10-01')!;
    const baseUrl = buildApiUrl(importProduct);
    const url = `${baseUrl}?period_from=${importFrom}&page_size=${PAGE_SIZE}`;
    const response = await fetchWithRetry(url);
    if (response.ok) {
      const data: OctopusApiResponse = await response.json() as OctopusApiResponse;
      const batch = data.results.map(r => ({
        type: 'import' as const,
        productCode: importProduct.code,
        validFrom: r.valid_from,
        validTo: r.valid_to,
        valueIncVat: Math.round(r.value_inc_vat * 100) / 100,
        region: importProduct.region,
      }));
      importInserted = await insertBatch(batch);
    }
  }

  // Fetch new export rates
  if (exportFrom) {
    const exportProduct = AGILE_PRODUCTS.find(p => p.code === 'AGILE-OUTGOING-19-05-13')!;
    const baseUrl = buildApiUrl(exportProduct);
    const url = `${baseUrl}?period_from=${exportFrom}&page_size=${PAGE_SIZE}`;
    const response = await fetchWithRetry(url);
    if (response.ok) {
      const data: OctopusApiResponse = await response.json() as OctopusApiResponse;
      const batch = data.results.map(r => ({
        type: 'export' as const,
        productCode: exportProduct.code,
        validFrom: r.valid_from,
        validTo: r.valid_to,
        valueIncVat: Math.round(r.value_inc_vat * 100) / 100,
        region: exportProduct.region,
      }));
      exportInserted = await insertBatch(batch);
    }
  }

  return { importInserted, exportInserted };
}

/**
 * Get current data coverage per product in the DB.
 */
export async function getIngestionCoverage(): Promise<Array<{
  type: string;
  productCode: string | null;
  slotCount: number;
  earliestSlot: string | null;
  latestSlot: string | null;
}>> {
  const result = await db.execute(sql`
    SELECT
      type,
      product_code,
      COUNT(*)::int as slot_count,
      MIN(valid_from) as earliest_slot,
      MAX(valid_from) as latest_slot
    FROM agile_rates
    GROUP BY type, product_code
    ORDER BY type, MIN(valid_from)
  `);

  return (result as unknown as Array<{
    type: string;
    product_code: string | null;
    slot_count: number;
    earliest_slot: string | null;
    latest_slot: string | null;
  }>).map(row => ({
    type: row.type,
    productCode: row.product_code,
    slotCount: row.slot_count,
    earliestSlot: row.earliest_slot,
    latestSlot: row.latest_slot,
  }));
}

// --- Helpers ---

/**
 * Batch-insert rows into agile_rates with ON CONFLICT DO NOTHING.
 * Returns the number of rows actually inserted (not skipped).
 */
async function insertBatch(
  batch: typeof agileRates.$inferInsert[],
): Promise<number> {
  if (batch.length === 0) return 0;

  const result = await db.insert(agileRates)
    .values(batch)
    .onConflictDoNothing({ target: [agileRates.type, agileRates.validFrom, agileRates.region] })
    .returning({ id: agileRates.id });

  return result.length;
}

/**
 * Fetch with exponential backoff retry on 429 / 5xx.
 */
async function fetchWithRetry(url: string, maxAttempts = 4): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(500 * Math.pow(2, attempt - 1), 8000);
      await sleep(delayMs);
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed after ${maxAttempts} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
