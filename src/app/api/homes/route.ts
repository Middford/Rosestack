import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { homes } from '@/shared/db/schema';
import { eq, desc } from 'drizzle-orm';

const CreateHomeSchema = z.object({
  address: z.string().min(5).max(500),
  postcode: z.string().min(5).max(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phase: z.enum(['1-phase', '3-phase']),
  status: z.enum(['prospect', 'qualified', 'contracted', 'installed', 'live', 'churned']).optional(),
  epcRating: z.string().max(5).optional(),
  propertyType: z.enum(['detached', 'semi', 'terrace', 'bungalow', 'farm', 'commercial']).optional(),
  gardenAccess: z.boolean().optional(),
  monthlyHomeownerPayment: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let rows;
    if (status) {
      rows = await db
        .select()
        .from(homes)
        .where(eq(homes.status, status as 'prospect' | 'qualified' | 'contracted' | 'installed' | 'live' | 'churned'))
        .orderBy(desc(homes.createdAt));
    } else {
      rows = await db.select().from(homes).orderBy(desc(homes.createdAt));
    }
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/homes]', err);
    return NextResponse.json({ error: 'Failed to fetch homes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateHomeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { epcRating, propertyType, ...rest } = parsed.data;
    const [row] = await db
      .insert(homes)
      .values({
        ...rest,
        epcRating: epcRating ?? null,
        propertyType: propertyType ?? null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/homes]', err);
    return NextResponse.json({ error: 'Failed to create home' }, { status: 500 });
  }
}
