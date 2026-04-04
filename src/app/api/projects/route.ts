// ============================================================
// GET  /api/projects — List all projects (homes + systems + leads)
// POST /api/projects — Create a new project
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, batterySystems, leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { batteries, inverters } from '@/modules/hardware/data';
import { calculateProjectCapex, getSystemTotals } from '@/modules/projects/utils';

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
    if (!body.address || !body.postcode) {
      return NextResponse.json(
        { error: 'Missing required fields: address, postcode' },
        { status: 400 },
      );
    }

    // Geocode by full address if lat/lng look like postcode centroids or defaults
    let lat = body.latitude ?? 53.8;
    let lng = body.longitude ?? -2.4;
    if (body.address && body.postcode && (lat === 53.8 || lat === 53.75 || !body.latitude)) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(body.address + ', ' + body.postcode)}&format=json&limit=1&countrycodes=gb`,
          { signal: AbortSignal.timeout(3000) },
        );
        const geoData = await geoRes.json();
        if (geoData?.[0]) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch {
        // Fall back to provided coordinates
      }
    }

    // Derive system specs from hardware catalogue
    const batteryId = body.batteryId ?? 'bat-fogstar-64';
    const inverterId = body.inverterId ?? 'inv-solis-30k';
    const batteryStacks = body.batteryStacks ?? 4;
    const inverterCount = body.inverterCount ?? 3;
    const solarKwp = body.solarKwp ?? 25;
    const currentPhase = body.currentPhase ?? body.phase ?? '1-phase';
    const plannedPhase = body.plannedPhase ?? body.phase ?? '3-phase';

    const battery = batteries.find(b => b.id === batteryId);
    const inverter = inverters.find(i => i.id === inverterId);
    const { totalCapKwh, totalInverterKw, efficiency } = getSystemTotals(
      batteryId, batteryStacks, inverterId, inverterCount,
    );

    const capex = calculateProjectCapex({
      batteryId,
      batteryStacks,
      inverterId,
      inverterCount,
      solarKwp,
      currentPhase,
      plannedPhase,
      g99ApplicationCost: body.g99ApplicationCost,
      installationCostOverride: body.installationCostOverride,
      solarCostOverride: body.solarCostOverride,
    });

    // 1. Insert into homes
    const [home] = await db
      .insert(homes)
      .values({
        address: body.address,
        postcode: body.postcode,
        latitude: lat,
        longitude: lng,
        phase: plannedPhase,
        status: 'prospect',
        targetInstallDate: body.targetInstallDate
          ? new Date(body.targetInstallDate.length === 7 ? `${body.targetInstallDate}-01` : body.targetInstallDate)
          : null,
        tariffName: body.tariffName ?? 'flux',
        solarKwp,
        exportLimitKw: body.exportLimitKw ?? 66,
        monthlyHomeownerPayment: body.monthlyHomeownerPayment ?? 100,
        insuranceCostAnnual: body.insuranceCostAnnual ?? 500,
        g99ApplicationCost: body.g99ApplicationCost ?? 3500,
        installationCostOverride: body.installationCostOverride ?? null,
        maintenanceCostOverride: body.maintenanceCostOverride ?? null,
        solarCostOverride: body.solarCostOverride ?? null,
        dailyConsumptionKwh: body.dailyConsumptionKwh ?? 24,
        hasHeatPump: body.hasHeatPump ?? false,
        evCount: body.evCount ?? 0,
        propertyType: body.propertyType ?? null,
        bedrooms: body.bedrooms ?? null,
        gardenAccess: body.gardenAccess ?? null,
        epcRating: body.epcRating ?? null,
        esaContractRef: body.esaContractRef ?? null,
      })
      .returning();

    // 2. Insert into battery_systems (derived from hardware catalogue)
    const inverterModel = inverter
      ? `${inverter.manufacturer} ${inverter.model}`
      : body.inverterId ?? 'Unknown';

    const [system] = await db
      .insert(batterySystems)
      .values({
        homeId: home.id,
        inverterModel: `${inverterCount}x ${inverterModel}`,
        batteryModules: batteryStacks * (battery?.maxModulesPerString ?? 1),
        totalCapacityKwh: totalCapKwh,
        batteryChemistry: battery?.chemistry ?? 'LFP',
        solarPvKwp: solarKwp,
        installCost: capex.totalCapex,
        annualMaintenanceCost: body.maintenanceCostOverride ?? 150,
        warrantyYears: battery?.warrantyYears ?? 10,
        degradationRatePercent: battery?.degradationRatePercent ?? 1.5,
        maxChargeRateKw: Math.min(
          (battery?.chargeRateKw ?? 7.5) * batteryStacks,
          totalInverterKw,
        ),
        maxDischargeRateKw: Math.min(
          (battery?.dischargeRateKw ?? 7.5) * batteryStacks,
          totalInverterKw,
          body.exportLimitKw ?? 66,
        ),
        roundTripEfficiency: efficiency,
      })
      .returning();

    // 3. Insert into leads
    const [lead] = await db
      .insert(leads)
      .values({
        homeId: home.id,
        name: body.homeownerName || 'Unknown',
        phone: body.homeownerPhone ?? null,
        email: body.homeownerEmail ?? null,
        source: 'website',
        pipelineStatus: 'new_lead',
      })
      .returning();

    // 4. Update homes.systemId
    const [updatedHome] = await db
      .update(homes)
      .set({ systemId: system.id })
      .where(eq(homes.id, home.id))
      .returning();

    return NextResponse.json(
      { ...updatedHome, system, lead },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/projects]', err);
    const message = err instanceof Error ? err.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
