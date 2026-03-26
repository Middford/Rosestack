import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { hardwareCatalogue } from '@/shared/db/schema';
import { eq, desc } from 'drizzle-orm';

const CategorySchema = z.enum(['battery', 'inverter', 'solar', 'heat-pump']);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    let rows;
    if (category) {
      const parsed = CategorySchema.safeParse(category);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      rows = await db
        .select()
        .from(hardwareCatalogue)
        .where(eq(hardwareCatalogue.category, parsed.data))
        .orderBy(desc(hardwareCatalogue.createdAt));
    } else {
      rows = await db.select().from(hardwareCatalogue).orderBy(desc(hardwareCatalogue.createdAt));
    }
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/hardware]', err);
    return NextResponse.json({ error: 'Failed to fetch hardware' }, { status: 500 });
  }
}
