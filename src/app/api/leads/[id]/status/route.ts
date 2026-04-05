// ============================================================
// PATCH /api/leads/[id]/status — Persist pipeline status change
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const VALID_STATUSES = [
  'new_lead', 'initial_contact', 'interested', 'property_assessed',
  'visit_scheduled', 'visit_complete',
  'proposal_prepared', 'proposal_sent', 'proposal_reviewing',
  'verbal_agreement', 'contract_sent', 'contracted',
  'g99_submitted', 'g99_approved', 'installation_scheduled',
  'installed', 'commissioned', 'live',
  'on_hold', 'lost',
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(leads)
      .set({
        pipelineStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/leads/[id]/status]', err);
    const message = err instanceof Error ? err.message : 'Failed to update status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
