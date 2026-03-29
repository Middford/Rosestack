import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const PatchLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'proposal-sent', 'contracted', 'lost']).optional(),
  notes: z.array(z.string()).optional(),
  homeId: z.string().uuid().optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = PatchLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.homeId !== undefined) updates.homeId = parsed.data.homeId;

    const [row] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[PATCH /api/leads/:id]', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
