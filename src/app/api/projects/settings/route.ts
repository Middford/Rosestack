// ============================================================
// GET /api/projects/settings — Fetch cashflow settings
// PUT /api/projects/settings — Upsert cashflow settings
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { projectCashflowSettings } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

// Default values (mirror schema defaults)
const DEFAULTS = {
  facilitySize: 500_000,
  interestRatePercent: 6.0,
  g99FeeDefault: 350,
  insuranceDefault: 500,
  maintenanceDefault: 150,
  homeownerPaymentDefault: 100,
  horizonMonths: 96,
};

// --- GET: Fetch the single settings row ---

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(projectCashflowSettings)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(DEFAULTS);
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/projects/settings]', err);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}

// --- PUT: Upsert cashflow settings ---

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Check if a row already exists
    const existing = await db
      .select()
      .from(projectCashflowSettings)
      .limit(1);

    const values = {
      facilitySize: body.facilitySize ?? DEFAULTS.facilitySize,
      interestRatePercent: body.interestRatePercent ?? DEFAULTS.interestRatePercent,
      g99FeeDefault: body.g99FeeDefault ?? DEFAULTS.g99FeeDefault,
      insuranceDefault: body.insuranceDefault ?? DEFAULTS.insuranceDefault,
      maintenanceDefault: body.maintenanceDefault ?? DEFAULTS.maintenanceDefault,
      homeownerPaymentDefault: body.homeownerPaymentDefault ?? DEFAULTS.homeownerPaymentDefault,
      horizonMonths: body.horizonMonths ?? DEFAULTS.horizonMonths,
      updatedAt: new Date(),
    };

    let result;

    if (existing.length > 0) {
      // Update existing row
      const [updated] = await db
        .update(projectCashflowSettings)
        .set(values)
        .where(eq(projectCashflowSettings.id, existing[0].id))
        .returning();
      result = updated;
    } else {
      // Insert new row
      const [inserted] = await db
        .insert(projectCashflowSettings)
        .values(values)
        .returning();
      result = inserted;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[PUT /api/projects/settings]', err);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 },
    );
  }
}
