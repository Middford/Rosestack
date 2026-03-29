import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { homes } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const PatchHomeSchema = z.object({
  status: z.enum(['prospect', 'qualified', 'contracted', 'installed', 'live', 'churned']).optional(),
  epcRating: z.string().max(5).optional(),
  gardenAccess: z.boolean().optional(),
  monthlyHomeownerPayment: z.number().positive().optional(),
  notes: z.string().optional(),
  installDate: z.string().datetime().optional(),
  contractEndDate: z.string().datetime().optional(),
  esaContractRef: z.string().max(100).optional(),
}).strict();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const [row] = await db.select().from(homes).where(eq(homes.id, id));
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[GET /api/homes/:id]', err);
    return NextResponse.json({ error: 'Failed to fetch home' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = PatchHomeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.epcRating !== undefined) updates.epcRating = parsed.data.epcRating;
    if (parsed.data.gardenAccess !== undefined) updates.gardenAccess = parsed.data.gardenAccess;
    if (parsed.data.monthlyHomeownerPayment !== undefined) updates.monthlyHomeownerPayment = parsed.data.monthlyHomeownerPayment;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.installDate !== undefined) updates.installDate = new Date(parsed.data.installDate);
    if (parsed.data.contractEndDate !== undefined) updates.contractEndDate = new Date(parsed.data.contractEndDate);
    if (parsed.data.esaContractRef !== undefined) updates.esaContractRef = parsed.data.esaContractRef;

    const [row] = await db.update(homes).set(updates).where(eq(homes.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[PATCH /api/homes/:id]', err);
    return NextResponse.json({ error: 'Failed to update home' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const [row] = await db.delete(homes).where(eq(homes.id, id)).returning({ id: homes.id });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ deleted: row.id });
  } catch (err) {
    console.error('[DELETE /api/homes/:id]', err);
    return NextResponse.json({ error: 'Failed to delete home' }, { status: 500 });
  }
}
