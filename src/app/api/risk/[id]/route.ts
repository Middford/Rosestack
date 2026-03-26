import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { riskRegister } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const PatchRiskSchema = z.object({
  mitigationStatus: z.enum(['not-started', 'in-progress', 'implemented', 'tested']).optional(),
  residualScore: z.number().int().min(1).max(25).optional(),
  probability: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  mitigationStrategy: z.string().min(5).optional(),
  triggerThreshold: z.string().optional(),
  contingencyPlan: z.string().optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = PatchRiskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value;
    }
    // Recalculate score if probability or impact changed
    if (parsed.data.probability !== undefined || parsed.data.impact !== undefined) {
      const [existing] = await db.select().from(riskRegister).where(eq(riskRegister.id, id));
      if (existing) {
        const p = parsed.data.probability ?? existing.probability;
        const i = parsed.data.impact ?? existing.impact;
        updates.score = p * i;
      }
    }

    const [row] = await db.update(riskRegister).set(updates).where(eq(riskRegister.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[PATCH /api/risk/:id]', err);
    return NextResponse.json({ error: 'Failed to update risk' }, { status: 500 });
  }
}
