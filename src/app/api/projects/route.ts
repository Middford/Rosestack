// ============================================================
// GET  /api/projects — List all projects (homes + systems + leads)
// POST /api/projects — Create a new project
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, batterySystems, leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

// --- GET: Fetch all projects ---

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(homes)
      .leftJoin(batterySystems, eq(homes.systemId, batterySystems.id))
      .leftJoin(leads, eq(leads.homeId, homes.id));

    const projects = rows.map((row) => ({
      ...row.homes,
      system: row.battery_systems ?? null,
      lead: row.leads ?? null,
    }));

    return NextResponse.json(projects, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('[GET /api/projects]', err);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}

// --- POST: Create a new project ---

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate essential fields
    if (!body.address || !body.postcode || !body.latitude || !body.longitude || !body.phase) {
      return NextResponse.json(
        { error: 'Missing required fields: address, postcode, latitude, longitude, phase' },
        { status: 400 },
      );
    }

    // 1. Insert into homes
    const [home] = await db
      .insert(homes)
      .values({
        address: body.address,
        postcode: body.postcode,
        latitude: body.latitude,
        longitude: body.longitude,
        phase: body.phase,
        status: 'prospect',
        targetInstallDate: body.targetInstallDate ? new Date(body.targetInstallDate) : null,
        tariffName: body.tariffName ?? null,
        solarKwp: body.solarKwp ?? null,
        exportLimitKw: body.exportLimitKw ?? null,
        monthlyHomeownerPayment: body.monthlyHomeownerPayment ?? null,
        insuranceCostAnnual: body.insuranceCostAnnual ?? 500,
        g99ApplicationCost: body.g99ApplicationCost ?? 350,
        installationCostOverride: body.installationCostOverride ?? null,
        maintenanceCostOverride: body.maintenanceCostOverride ?? null,
        solarCostOverride: body.solarCostOverride ?? null,
        dailyConsumptionKwh: body.dailyConsumptionKwh ?? 24,
        hasHeatPump: body.hasHeatPump ?? false,
        evCount: body.evCount ?? 0,
      })
      .returning();

    // 2. Insert into battery_systems
    const capex = body.capex ?? {};
    const [system] = await db
      .insert(batterySystems)
      .values({
        homeId: home.id,
        inverterModel: body.inverterModel ?? 'TBD',
        batteryModules: body.batteryModules ?? 1,
        totalCapacityKwh: body.totalCapacityKwh ?? 0,
        batteryChemistry: body.batteryChemistry ?? 'LFP',
        solarPvKwp: body.solarPvKwp ?? body.solarKwp ?? null,
        installCost: capex.totalCapex ?? body.installCost ?? 0,
        annualMaintenanceCost: body.annualMaintenanceCost ?? 150,
        warrantyYears: body.warrantyYears ?? 10,
        degradationRatePercent: body.degradationRatePercent ?? 2.5,
        maxChargeRateKw: body.maxChargeRateKw ?? 5,
        maxDischargeRateKw: body.maxDischargeRateKw ?? 5,
        roundTripEfficiency: body.roundTripEfficiency ?? 0.92,
      })
      .returning();

    // 3. Insert into leads
    const [lead] = await db
      .insert(leads)
      .values({
        homeId: home.id,
        name: body.homeownerName ?? 'Unknown',
        phone: body.phone ?? null,
        email: body.email ?? null,
        source: 'website',
        pipelineStatus: 'new_lead',
      })
      .returning();

    // 4. Update homes.systemId with the created battery system id
    const [updatedHome] = await db
      .update(homes)
      .set({ systemId: system.id })
      .where(eq(homes.id, home.id))
      .returning();

    return NextResponse.json(
      {
        ...updatedHome,
        system,
        lead,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/projects]', err);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 },
    );
  }
}
