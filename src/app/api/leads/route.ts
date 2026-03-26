import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { leads } from '@/shared/db/schema';
import { eq, desc } from 'drizzle-orm';

const CreateLeadSchema = z.object({
  name: z.string().min(2).max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  source: z.enum(['referral', 'door-knock', 'website', 'club', 'social', 'other']),
  referredBy: z.string().max(200).optional(),
  notes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let rows;
    if (status) {
      rows = await db
        .select()
        .from(leads)
        .where(eq(leads.status, status as 'new' | 'contacted' | 'qualified' | 'proposal-sent' | 'contracted' | 'lost'))
        .orderBy(desc(leads.createdAt));
    } else {
      rows = await db.select().from(leads).orderBy(desc(leads.createdAt));
    }
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/leads]', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const [row] = await db
      .insert(leads)
      .values({
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        source: parsed.data.source,
        referredBy: parsed.data.referredBy ?? null,
        notes: parsed.data.notes ?? [],
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leads]', err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
