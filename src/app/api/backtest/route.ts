// ============================================================
// POST /api/backtest — Run a backtest for a system configuration
// GET  /api/backtest?configId=x — Retrieve results with aggregations
//
// Accepts either a preset name (rs-25, rs-300, beeches) or
// custom SystemParams. Returns daily, monthly, annual, and
// forward-projected results with optimal tariff switching.
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runBacktest } from '@/modules/tariffs/backtest-engine';
import {
  generateDailyPredictions,
  storeDailyPredictions,
} from '@/modules/tariffs/trend-projection';
import {
  SYSTEM_PRESETS,
  configToParams,
  calculateCapex,
} from '@/modules/tariffs/system-presets';
import { db } from '@/shared/db';
import { backtestDailyResults } from '@/shared/db/schema';
import { eq, sql } from 'drizzle-orm';

// --- POST: Run a new backtest ---

const PostSchema = z.object({
  preset: z.string().optional(),
  params: z.object({
    totalCapacityKwh: z.number(),
    maxChargeRateKw: z.number(),
    maxDischargeRateKw: z.number(),
    roundTripEfficiency: z.number(),
    minSoc: z.number(),
    maxSoc: z.number(),
    solarKwp: z.number().optional(),
    exportLimitKw: z.number().optional(),
  }).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeIof: z.boolean().optional().default(true),
  includePredictions: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = PostSchema.parse(body);

    // Resolve system params
    let params;
    let config;
    let name: string;

    if (input.preset && SYSTEM_PRESETS[input.preset]) {
      const preset = SYSTEM_PRESETS[input.preset]!;
      params = preset.params;
      config = preset.config;
      name = preset.label;
    } else if (input.params) {
      params = input.params;
      name = `Custom ${input.params.totalCapacityKwh}kWh`;
    } else {
      return NextResponse.json(
        { error: 'Provide either preset name or params. Available presets: ' + Object.keys(SYSTEM_PRESETS).join(', ') },
        { status: 400 },
      );
    }

    // Run backtest
    const result = await runBacktest({
      params,
      config,
      fromDate: input.fromDate,
      toDate: input.toDate,
      includeIof: input.includeIof,
      name,
    });

    // Generate forward predictions if requested
    let predictions;
    if (input.includePredictions) {
      const projectionResult = generateDailyPredictions({
        configId: result.configId,
        monthly: result.monthly,
        annual: result.annual,
        totalCapacityKwh: params.totalCapacityKwh,
      });

      await storeDailyPredictions(result.configId, projectionResult.predictions);

      predictions = {
        annualTotals: projectionResult.annualTotals,
        monthlyTotals: projectionResult.monthlyTotals,
        trend: projectionResult.trend,
        dailyCount: projectionResult.predictions.length,
      };
    }

    return NextResponse.json({
      configId: result.configId,
      agile: result.agile,
      iof: result.iof,
      monthly: result.monthly,
      annual: result.annual,
      predictions,
    });
  } catch (err) {
    console.error('[api/backtest] POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- GET: Retrieve existing results ---

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get('configId');

  if (!configId) {
    return NextResponse.json(
      { error: 'configId is required' },
      { status: 400 },
    );
  }

  // Fetch daily results grouped by tariff
  const agileResults = await db.select()
    .from(backtestDailyResults)
    .where(eq(backtestDailyResults.configId, configId))
    .orderBy(backtestDailyResults.date);

  if (agileResults.length === 0) {
    return NextResponse.json(
      { error: 'No results found for this configId. Run POST /api/backtest first.' },
      { status: 404 },
    );
  }

  // Split by tariff
  const agileDaily = agileResults.filter(r => r.tariff === 'agile');
  const iofDaily = agileResults.filter(r => r.tariff === 'iof');

  // Monthly summary
  const monthlySummary = await db.execute(sql`
    SELECT
      CAST(EXTRACT(MONTH FROM TO_DATE(date, 'YYYY-MM-DD')) AS INT) as month,
      tariff,
      ROUND(AVG(net_revenue_pence)::numeric) as avg_daily_pence,
      COUNT(*)::int as days,
      ROUND(AVG(profitable_export_slots)::numeric, 1) as avg_export_slots,
      ROUND(AVG(zero_cost_charge_slots)::numeric, 1) as avg_zero_cost_slots
    FROM backtest_daily_results
    WHERE config_id = ${configId}
    GROUP BY month, tariff
    ORDER BY month, tariff
  `);

  return NextResponse.json({
    configId,
    dailyCount: { agile: agileDaily.length, iof: iofDaily.length },
    monthlySummary: monthlySummary,
    // Return last 30 days as sample (full data available via pagination)
    recentDays: agileDaily.slice(-30),
  });
}
