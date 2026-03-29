import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { riskRegister } from '@/shared/db/schema';
import { desc } from 'drizzle-orm';

const CreateRiskSchema = z.object({
  name: z.string().min(3).max(300),
  category: z.enum(['tariff', 'energy-market', 'regulatory', 'technology', 'operational', 'financial', 'competitive']),
  description: z.string().min(10),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  mitigationStrategy: z.string().min(5),
  mitigationOwner: z.string().min(2).max(100),
  mitigationStatus: z.enum(['not-started', 'in-progress', 'implemented', 'tested']).optional(),
  residualScore: z.number().int().optional(),
  triggerThreshold: z.string().optional(),
  contingencyPlan: z.string().optional(),
});

export async function GET() {
  try {
    const rows = await db.select().from(riskRegister).orderBy(desc(riskRegister.score));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/risk]', err);
    return NextResponse.json({ error: 'Failed to fetch risks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateRiskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const score = parsed.data.probability * parsed.data.impact;
    const [row] = await db
      .insert(riskRegister)
      .values({
        ...parsed.data,
        score,
        mitigationStatus: parsed.data.mitigationStatus ?? 'not-started',
        residualScore: parsed.data.residualScore ?? null,
        triggerThreshold: parsed.data.triggerThreshold ?? null,
        contingencyPlan: parsed.data.contingencyPlan ?? null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/risk]', err);
    return NextResponse.json({ error: 'Failed to create risk' }, { status: 500 });
  }
}
