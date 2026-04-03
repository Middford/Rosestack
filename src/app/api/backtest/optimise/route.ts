// ============================================================
// POST /api/backtest/optimise — Run hardware optimiser
//
// Grid-searches across battery stacks, inverters, and solar
// to find the configuration that maximises 10-year NPV.
//
// Returns ranked configs with diminishing returns analysis.
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findOptimalConfig } from '@/modules/tariffs/hardware-optimiser';
import { db } from '@/shared/db';
import { optimiserRuns } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const PostSchema = z.object({
  phaseType: z.enum(['single', 'three']),
  maxStacks: z.number().int().min(1).max(15).optional(),
  solarSteps: z.array(z.number()).optional(),
  discountRate: z.number().min(0).max(0.5).optional(),
  energyInflation: z.number().min(-0.1).max(0.2).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = PostSchema.parse(body);

    // Create run record
    const [run] = await db.insert(optimiserRuns).values({
      phaseType: input.phaseType,
      status: 'running',
      startedAt: new Date(),
    }).returning();

    const result = await findOptimalConfig({
      phaseType: input.phaseType,
      maxStacks: input.maxStacks,
      solarSteps: input.solarSteps,
      discountRate: input.discountRate,
      energyInflation: input.energyInflation,
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    // Update run record
    await db.update(optimiserRuns)
      .set({
        status: 'completed',
        configGrid: result.configs.map(c => ({
          stacks: c.config.stacks,
          inverters: c.config.inverterCount,
          solar: c.config.solarKwp,
          npv: c.npv10yr,
          payback: c.paybackMonths,
        })) as unknown as Record<string, unknown>,
        bestConfig: {
          stacks: result.bestConfig.config.stacks,
          inverters: result.bestConfig.config.inverterCount,
          solar: result.bestConfig.config.solarKwp,
          npv: result.bestConfig.npv10yr,
          payback: result.bestConfig.paybackMonths,
          irr: result.bestConfig.irr,
          year1Revenue: result.bestConfig.year1RevenueGbp,
          capex: result.bestConfig.capex.totalGbp,
        } as unknown as Record<string, unknown>,
        bestNpv10yr: result.bestConfig.npv10yr,
        diminishingReturnsAtStack: result.diminishingReturnsAtStack,
        optimalSwitchingRevenuePence: result.bestConfig.optimalSwitchingRevenueGbp * 100,
        switchingCalendar: result.switchingCalendar as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(optimiserRuns.id, run!.id));

    return NextResponse.json({
      runId: run!.id,
      totalEvaluated: result.totalEvaluated,
      bestConfig: {
        stacks: result.bestConfig.config.stacks,
        inverterCount: result.bestConfig.config.inverterCount,
        solarKwp: result.bestConfig.config.solarKwp,
        phase: result.bestConfig.config.phaseType,
        capex: result.bestConfig.capex,
        npv10yr: result.bestConfig.npv10yr,
        paybackMonths: result.bestConfig.paybackMonths,
        irr: result.bestConfig.irr,
        year1RevenueGbp: result.bestConfig.year1RevenueGbp,
        optimalSwitchingRevenueGbp: result.bestConfig.optimalSwitchingRevenueGbp,
        monthlyBestTariff: result.bestConfig.monthlyBestTariff,
      },
      diminishingReturnsAtStack: result.diminishingReturnsAtStack,
      switchingCalendar: result.switchingCalendar,
      // Top 10 configs
      topConfigs: result.configs.slice(0, 10).map(c => ({
        stacks: c.config.stacks,
        inverterCount: c.config.inverterCount,
        solarKwp: c.config.solarKwp,
        capexGbp: c.capex.totalGbp,
        npv10yr: c.npv10yr,
        paybackMonths: c.paybackMonths,
        irr: c.irr,
      })),
    });
  } catch (err) {
    console.error('[api/backtest/optimise] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  const [run] = await db.select()
    .from(optimiserRuns)
    .where(eq(optimiserRuns.id, runId))
    .limit(1);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json(run);
}
