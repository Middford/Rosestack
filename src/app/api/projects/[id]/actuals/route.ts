import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { revenueActuals } from '@/shared/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const actuals = await db
      .select()
      .from(revenueActuals)
      .where(eq(revenueActuals.homeId, id))
      .orderBy(asc(revenueActuals.calendarYear), asc(revenueActuals.calendarMonth));

    return NextResponse.json(actuals);
  } catch (error) {
    console.error('Failed to fetch revenue actuals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue actuals' },
      { status: 500 },
    );
  }
}
