// ============================================================
// POST /api/tariffs/ingest — Trigger bulk Agile rate ingestion
// GET  /api/tariffs/ingest?coverage — Show current data coverage
// GET  /api/tariffs/ingest?jobId=x — Poll job progress
//
// The POST handler ingests one product at a time to stay within
// Vercel function timeouts. Call once per product code, or omit
// productCode to ingest the next product that has no data.
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { agileIngestionJobs } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import {
  AGILE_PRODUCTS,
  ingestProduct,
  ingestLatestRates,
  getIngestionCoverage,
} from '@/modules/tariffs/agile-ingestion';

// --- POST: Trigger ingestion ---

const PostSchema = z.object({
  productCode: z.string().optional(),
  mode: z.enum(['full', 'latest']).optional().default('full'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productCode, mode } = PostSchema.parse(body);

    // Incremental update mode
    if (mode === 'latest') {
      const result = await ingestLatestRates();
      return NextResponse.json({
        mode: 'latest',
        importInserted: result.importInserted,
        exportInserted: result.exportInserted,
      });
    }

    // Full ingestion of a single product
    const product = productCode
      ? AGILE_PRODUCTS.find(p => p.code === productCode)
      : AGILE_PRODUCTS[0]; // Default to highest priority

    if (!product) {
      return NextResponse.json(
        { error: `Unknown product code: ${productCode}. Available: ${AGILE_PRODUCTS.map(p => p.code).join(', ')}` },
        { status: 400 },
      );
    }

    const result = await ingestProduct(product);

    return NextResponse.json({
      jobId: result.jobId,
      productCode: result.productCode,
      status: result.status,
      totalSlots: result.totalSlots,
      insertedSlots: result.insertedSlots,
      skippedSlots: result.skippedSlots,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/tariffs/ingest] POST error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- GET: Coverage or job status ---

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Poll specific job
  const jobId = searchParams.get('jobId');
  if (jobId) {
    const [job] = await db.select()
      .from(agileIngestionJobs)
      .where(eq(agileIngestionJobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  }

  // Show data coverage
  const coverage = await getIngestionCoverage();
  const products = AGILE_PRODUCTS.map(p => ({
    ...p,
    coverage: coverage.find(c => c.productCode === p.code) ?? null,
  }));

  return NextResponse.json({
    products,
    totalImportSlots: coverage
      .filter(c => c.type === 'import')
      .reduce((sum, c) => sum + c.slotCount, 0),
    totalExportSlots: coverage
      .filter(c => c.type === 'export')
      .reduce((sum, c) => sum + c.slotCount, 0),
  });
}
