import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { tariffs } from '@/shared/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(tariffs).orderBy(desc(tariffs.validFrom));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/tariffs]', err);
    return NextResponse.json({ error: 'Failed to fetch tariffs' }, { status: 500 });
  }
}
