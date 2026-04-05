// ============================================================
// POST /api/leads/[id]/promote — Create project from lead (Stage 2)
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, batterySystems, leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { batteries, inverters } from '@/modules/hardware/data';
import { calculateProjectCapex, getSystemTotals } from '@/modules/projects/utils';

// Stage 0-1 statuses — lead can only be promoted from these
const PRE_PROPOSAL_STATUSES = [
  'new_lead', 'initial_contact', 'interested', 'property_assessed',
  'visit_scheduled', 'visit_complete',
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Fetch the lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id));

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 2. Guard: already promoted
    if (lead.homeId) {
      return NextResponse.json(
        { error: 'Lead already has a project. Cannot promote twice.' },
        { status: 409 },
      );
    }

    // 3. Guard: must be in Stage 0-1
    if (!PRE_PROPOSAL_STATUSES.includes(lead.pipelineStatus ?? '')) {
      return NextResponse.json(
        { error: `Lead is at status '${lead.pipelineStatus}', must be in Stage 0-1 to promote.` },
        { status: 400 },
      );
    }

    // 4. Read optional system spec overrides from request body
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — use defaults
    }

    const batteryId = (body.batteryId as string) ?? 'bat-fogstar-64';
    const inverterId = (body.inverterId as string) ?? 'inv-solis-30k';
    const batteryStacks = (body.batteryStacks as number) ?? 4;
    const inverterCount = (body.inverterCount as number) ?? 3;
    const solarKwp = (body.solarKwp as number) ?? 25;
    const plannedPhase = (body.plannedPhase as string) ?? '3-phase';
    const currentPhase = lead.phaseStatus ?? '1-phase';

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
      currentPhase: currentPhase as '1-phase' | '3-phase',
      plannedPhase: plannedPhase as '1-phase' | '3-phase',
    });

    // 5. Create home record from lead data
    const [home] = await db
      .insert(homes)
      .values({
        address: lead.address ?? '',
        postcode: lead.postcode ?? '',
        latitude: lead.latitude ?? 53.8,
        longitude: lead.longitude ?? -2.4,
        phase: plannedPhase as '1-phase' | '3-phase',
        status: 'prospect',
        tariffName: (body.tariffName as string) ?? 'flux',
        solarKwp,
        exportLimitKw: (body.exportLimitKw as number) ?? 66,
        monthlyHomeownerPayment: (body.monthlyHomeownerPayment as number) ?? 100,
        insuranceCostAnnual: 500,
        g99ApplicationCost: 3500,
        dailyConsumptionKwh: (body.dailyConsumptionKwh as number) ?? 24,
        hasHeatPump: (body.hasHeatPump as boolean) ?? false,
        evCount: (body.evCount as number) ?? 0,
        propertyType: (lead.leadPropertyType ?? 'detached') as 'detached' | 'semi' | 'terrace' | 'bungalow' | 'farm' | 'commercial',
        bedrooms: lead.leadBedrooms ?? null,
        epcRating: lead.epcRating ?? null,
      })
      .returning();

    // 6. Create battery system
    const inverterModel = inverter
      ? `${inverter.manufacturer} ${inverter.model}`
      : inverterId;

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
        annualMaintenanceCost: 150,
        warrantyYears: battery?.warrantyYears ?? 10,
        degradationRatePercent: battery?.degradationRatePercent ?? 1.5,
        maxChargeRateKw: Math.min(
          (battery?.chargeRateKw ?? 7.5) * batteryStacks,
          totalInverterKw,
        ),
        maxDischargeRateKw: Math.min(
          (battery?.dischargeRateKw ?? 7.5) * batteryStacks,
          totalInverterKw,
          (body.exportLimitKw as number) ?? 66,
        ),
        roundTripEfficiency: efficiency,
      })
      .returning();

    // 7. Link home to system
    const [updatedHome] = await db
      .update(homes)
      .set({ systemId: system.id })
      .where(eq(homes.id, home.id))
      .returning();

    // 8. Update lead: link to home and advance to proposal_prepared
    const [updatedLead] = await db
      .update(leads)
      .set({
        homeId: home.id,
        pipelineStatus: 'proposal_prepared',
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    return NextResponse.json(
      { home: updatedHome, system, lead: updatedLead },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/leads/[id]/promote]', err);
    const message = err instanceof Error ? err.message : 'Failed to promote lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
