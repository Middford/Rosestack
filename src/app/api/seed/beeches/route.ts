// ============================================================
// POST /api/seed/beeches
// Seeds The Beeches demo data into the database.
// Development only — returns BEECHES_SUMMARY as JSON in all envs
// so the frontend can render without a live database.
// ============================================================

import { NextResponse } from 'next/server';
import { THE_BEECHES, BEECHES_SUMMARY } from '@/modules/portfolio/beeches-seed';

export async function POST() {
  // In production this endpoint is disabled
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled in production' },
      { status: 403 },
    );
  }

  // Attempt a real database insert if DATABASE_URL is configured
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import('@/shared/db');
      const { homes, batterySystems, leads } = await import('@/shared/db/schema');

      // Upsert home — ignore conflict on fixed demo UUID
      await db
        .insert(homes)
        .values({
          id: (THE_BEECHES.home as Record<string, unknown>).id as string,
          address: (THE_BEECHES.home as Record<string, unknown>).address as string,
          postcode: (THE_BEECHES.home as Record<string, unknown>).postcode as string,
          latitude: (THE_BEECHES.home as Record<string, unknown>).latitude as number,
          longitude: (THE_BEECHES.home as Record<string, unknown>).longitude as number,
          phase: (THE_BEECHES.home as Record<string, unknown>).phase as '1-phase' | '3-phase',
          status: (THE_BEECHES.home as Record<string, unknown>).status as
            | 'prospect'
            | 'qualified'
            | 'contracted'
            | 'installed'
            | 'live'
            | 'churned',
          epcRating: (THE_BEECHES.home as Record<string, unknown>).epcRating as string,
          propertyType: (THE_BEECHES.home as Record<string, unknown>).propertyType as
            | 'detached'
            | 'semi'
            | 'terrace'
            | 'bungalow'
            | 'farm'
            | 'commercial',
          gardenAccess: (THE_BEECHES.home as Record<string, unknown>).gardenAccess as boolean,
          bedrooms: (THE_BEECHES.home as Record<string, unknown>).bedrooms as number,
          floorAreaSqm: (THE_BEECHES.home as Record<string, unknown>).floorAreaSqm as number,
          builtYear: (THE_BEECHES.home as Record<string, unknown>).builtYear as number,
          heatingType: (THE_BEECHES.home as Record<string, unknown>).heatingType as string,
          installDate: (THE_BEECHES.home as Record<string, unknown>).installDate as Date,
          contractEndDate: (THE_BEECHES.home as Record<string, unknown>).contractEndDate as Date,
          monthlyHomeownerPayment: (THE_BEECHES.home as Record<string, unknown>)
            .monthlyHomeownerPayment as number,
          esaContractRef: (THE_BEECHES.home as Record<string, unknown>).esaContractRef as string,
          exportLimitKw: (THE_BEECHES.home as Record<string, unknown>).exportLimitKw as number,
          propertyScore: (THE_BEECHES.home as Record<string, unknown>).propertyScore as number,
          g99Probability: (THE_BEECHES.home as Record<string, unknown>).g99Probability as number,
          consumptionKwhPerYear: (THE_BEECHES.home as Record<string, unknown>)
            .consumptionKwhPerYear as number,
          notes: (THE_BEECHES.home as Record<string, unknown>).notes as string,
        })
        .onConflictDoNothing();

      // Upsert battery system
      await db
        .insert(batterySystems)
        .values({
          homeId: (THE_BEECHES.batterySystem as Record<string, unknown>).homeId as string,
          inverterModel: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .inverterModel as string,
          batteryModules: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .batteryModules as number,
          totalCapacityKwh: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .totalCapacityKwh as number,
          batteryChemistry: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .batteryChemistry as 'LFP' | 'NMC' | 'NaIon' | 'Other',
          solarPvKwp: (THE_BEECHES.batterySystem as Record<string, unknown>).solarPvKwp as number,
          installCost: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .installCost as number,
          annualMaintenanceCost: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .annualMaintenanceCost as number,
          warrantyYears: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .warrantyYears as number,
          degradationRatePercent: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .degradationRatePercent as number,
          maxChargeRateKw: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .maxChargeRateKw as number,
          maxDischargeRateKw: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .maxDischargeRateKw as number,
          roundTripEfficiency: (THE_BEECHES.batterySystem as Record<string, unknown>)
            .roundTripEfficiency as number,
        })
        .onConflictDoNothing();

      // Upsert lead
      await db
        .insert(leads)
        .values({
          homeId: (THE_BEECHES.lead as Record<string, unknown>).homeId as string,
          name: (THE_BEECHES.lead as Record<string, unknown>).name as string,
          source: (THE_BEECHES.lead as Record<string, unknown>).source as
            | 'referral'
            | 'door-knock'
            | 'website'
            | 'club'
            | 'social'
            | 'other',
          status: (THE_BEECHES.lead as Record<string, unknown>).status as
            | 'new'
            | 'contacted'
            | 'qualified'
            | 'proposal-sent'
            | 'contracted'
            | 'lost',
          notes: (THE_BEECHES.lead as Record<string, unknown>).notes as unknown[],
        })
        .onConflictDoNothing();

      return NextResponse.json({
        success: true,
        seeded: true,
        message: 'The Beeches demo data inserted into database',
        summary: BEECHES_SUMMARY,
      });
    } catch (err) {
      // DB not reachable — fall through to static response
      console.warn('[seed/beeches] Database insert failed, returning static data:', err);
    }
  }

  // No database configured — return static summary for frontend development
  return NextResponse.json({
    success: true,
    seeded: false,
    message: 'No DATABASE_URL configured — returning static demo data',
    summary: BEECHES_SUMMARY,
  });
}

// GET — return summary without writing anything (useful for health checks and previews)
export async function GET() {
  return NextResponse.json({
    property: 'The Beeches, Whalley',
    available: true,
    summary: BEECHES_SUMMARY,
  });
}
