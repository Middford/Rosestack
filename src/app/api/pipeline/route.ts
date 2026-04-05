// ============================================================
// GET /api/pipeline — Returns all leads with home + system data
// mapped to the Lead interface format for the kanban board.
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, batterySystems, leads } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { calculatePropertyScore, calculateEngagementScore } from '@/modules/projects/utils';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(leads)
      .leftJoin(homes, eq(leads.homeId, homes.id))
      .leftJoin(batterySystems, eq(homes.systemId, batterySystems.id));

    const pipeline = rows.map((row) => {
      const lead = row.leads;
      const home = row.homes;
      const system = row.battery_systems;

      const createdAt = lead.createdAt ?? new Date();
      const daysAgo = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
      const status = (lead.pipelineStatus ?? 'new_lead') as string;

      const propertyScore = calculatePropertyScore({
        phase: home?.phase ?? lead.phaseStatus ?? '1-phase',
        propertyType: home?.propertyType ?? lead.leadPropertyType ?? 'detached',
        bedrooms: home?.bedrooms ?? lead.leadBedrooms ?? 3,
        gardenAccess: home?.gardenAccess ?? false,
        epcRating: home?.epcRating ?? lead.epcRating ?? 'D',
        solarKwp: home?.solarKwp ?? 0,
        hasHeatPump: home?.hasHeatPump ?? false,
        evCount: home?.evCount ?? 0,
      });
      const engagementScore = calculateEngagementScore(status, daysAgo);
      const totalScore = Math.round(propertyScore * 0.6 + engagementScore * 0.4);

      return {
        id: lead.id,
        homeId: lead.homeId,
        name: lead.name ?? 'Unknown',
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        address: home?.address ?? lead.address ?? '',
        postcode: home?.postcode ?? lead.postcode ?? '',
        hasProject: lead.homeId != null,
        source: (lead.source ?? 'website') as 'referral' | 'door-knock' | 'website' | 'club' | 'social' | 'other',
        referredBy: undefined,
        status,
        propertyScore,
        engagementScore,
        totalScore,
        activities: [],
        followUps: [],
        estimatedSystemSize: system ? `${system.totalCapacityKwh} kWh` : 'TBD',
        estimatedAnnualRevenue: system ? Math.round(system.totalCapacityKwh * 40) : 0, // rough £40/kWh/yr
        daysInCurrentStatus: daysAgo,
        g99Assessment: home?.g99Probability != null
          ? { probability: home.g99Probability, riskFactors: [], mitigations: [] }
          : undefined,
        createdAt: new Date(createdAt),
        updatedAt: new Date(lead.updatedAt ?? createdAt),
        // Extra fields for cashflow/project context
        targetInstallDate: home?.targetInstallDate
          ? new Date(home.targetInstallDate).toISOString().slice(0, 7)
          : null,
        tariffName: home?.tariffName ?? 'flux',
        totalCapacityKwh: system?.totalCapacityKwh ?? 0,
        phase: home?.phase ?? lead.phaseStatus ?? '3-phase',
        gridScore: lead.gridScore ?? null,
        gridTier: lead.gridTier ?? null,
        installCost: system?.installCost ?? 0,
      };
    });

    return NextResponse.json(pipeline, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('[GET /api/pipeline]', err);
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 });
  }
}
