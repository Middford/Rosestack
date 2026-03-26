import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/shared/db';
import { opportunityRegister } from '@/shared/db/schema';
import { desc } from 'drizzle-orm';

const CreateOpportunitySchema = z.object({
  name: z.string().min(3).max(300),
  category: z.enum(['hardware-cost', 'revenue-enhancement', 'grid-flexibility', 'policy-tailwind', 'business-model', 'competitive-advantage']),
  description: z.string().min(10),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  captureStrategy: z.string().min(5),
  captureOwner: z.string().min(2).max(100),
  captureStatus: z.enum(['not-started', 'researching', 'in-progress', 'captured', 'missed']).optional(),
  expectedValue: z.number().positive().optional(),
  triggerThreshold: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  investmentRequired: z.string().optional(),
});

export async function GET() {
  try {
    const rows = await db.select().from(opportunityRegister).orderBy(desc(opportunityRegister.score));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/opportunities]', err);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateOpportunitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const score = parsed.data.probability * parsed.data.impact;
    const [row] = await db
      .insert(opportunityRegister)
      .values({
        ...parsed.data,
        score,
        captureStatus: parsed.data.captureStatus ?? 'not-started',
        expectedValue: parsed.data.expectedValue ?? null,
        triggerThreshold: parsed.data.triggerThreshold ?? null,
        dependencies: parsed.data.dependencies ?? null,
        investmentRequired: parsed.data.investmentRequired ?? null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/opportunities]', err);
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }
}
