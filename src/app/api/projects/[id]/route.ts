// ============================================================
// GET   /api/projects/:id — Fetch a single project
// PATCH /api/projects/:id — Update project fields
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, batterySystems, leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

// --- GET: Single project by id ---

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const rows = await db
      .select()
      .from(homes)
      .leftJoin(batterySystems, eq(homes.systemId, batterySystems.id))
      .leftJoin(leads, eq(leads.homeId, homes.id))
      .where(eq(homes.id, id));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }

    const row = rows[0];
    const project = {
      ...row.homes,
      system: row.battery_systems ?? null,
      lead: row.leads ?? null,
    };

    return NextResponse.json(project);
  } catch (err) {
    console.error('[GET /api/projects/:id]', err);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 },
    );
  }
}

// --- PATCH: Update project fields ---

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check project exists
    const existing = await db
      .select()
      .from(homes)
      .where(eq(homes.id, id));

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }

    // Build homes update payload (only include fields that are present)
    const homeFields: Record<string, unknown> = {};
    const homeColumns = [
      'address', 'postcode', 'latitude', 'longitude', 'phase', 'status',
      'targetInstallDate', 'tariffName', 'solarKwp', 'exportLimitKw',
      'monthlyHomeownerPayment', 'insuranceCostAnnual', 'g99ApplicationCost',
      'installationCostOverride', 'maintenanceCostOverride', 'solarCostOverride',
      'dailyConsumptionKwh', 'hasHeatPump', 'evCount', 'epcRating',
      'propertyType', 'gardenAccess', 'notes', 'bedrooms',
    ];

    for (const col of homeColumns) {
      if (col in body) {
        // Convert date strings to Date objects for timestamp columns
        if (col === 'targetInstallDate' && body[col]) {
          homeFields[col] = new Date(body[col]);
        } else {
          homeFields[col] = body[col];
        }
      }
    }

    let updatedHome = existing[0];
    if (Object.keys(homeFields).length > 0) {
      homeFields.updatedAt = new Date();
      const [result] = await db
        .update(homes)
        .set(homeFields)
        .where(eq(homes.id, id))
        .returning();
      updatedHome = result;
    }

    // Build battery_systems update payload if hardware fields changed
    const systemFields: Record<string, unknown> = {};
    const systemColumns = [
      'inverterModel', 'batteryModules', 'totalCapacityKwh', 'batteryChemistry',
      'solarPvKwp', 'installCost', 'annualMaintenanceCost', 'warrantyYears',
      'degradationRatePercent', 'maxChargeRateKw', 'maxDischargeRateKw',
      'roundTripEfficiency',
    ];

    for (const col of systemColumns) {
      if (col in body) {
        systemFields[col] = body[col];
      }
    }

    let updatedSystem = null;
    if (Object.keys(systemFields).length > 0 && updatedHome.systemId) {
      const [result] = await db
        .update(batterySystems)
        .set(systemFields)
        .where(eq(batterySystems.id, updatedHome.systemId))
        .returning();
      updatedSystem = result;
    }

    // Re-fetch full project with joins
    const rows = await db
      .select()
      .from(homes)
      .leftJoin(batterySystems, eq(homes.systemId, batterySystems.id))
      .leftJoin(leads, eq(leads.homeId, homes.id))
      .where(eq(homes.id, id));

    const row = rows[0];
    const project = {
      ...row.homes,
      system: row.battery_systems ?? null,
      lead: row.leads ?? null,
    };

    return NextResponse.json(project);
  } catch (err) {
    console.error('[PATCH /api/projects/:id]', err);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 },
    );
  }
}
