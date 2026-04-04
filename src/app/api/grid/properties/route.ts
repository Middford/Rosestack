// ============================================================
// GET /api/grid/properties — Top ranked properties across ALL of Lancashire
//
// Scores every EPC property against real ENWL substation data
// and returns the top N (default 200) as a prioritised door-knock list.
//
// Each property gets:
// - Nearest substation (with voltage, headroom, solar/battery counts)
// - 3-phase upgrade feasibility from feeder analysis
// - Tiered score (1-5)
// - Road crossing risk
// - Estimated connection cost
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { enwlSubstations, enwlLct, enwlDistTx } from '@/shared/db/schema';
import { and, gte, lte, eq } from 'drizzle-orm';
import { EPC_TARGET_PROPERTIES } from '@/modules/grid/epc-seed';
import {
  scorePropertyTiered,
  determine3PhaseStatus,
  type SubstationData,
  type DistTxData,
} from '@/modules/grid/enwl-scoring';
import { CONNECTION_COSTS } from '@/modules/projects/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '200');
  const minScore = parseInt(searchParams.get('minScore') ?? '0');

  try {
    // 1. Load all distribution substations in Lancashire with their data
    const subs = await db.select({
      substationNumber: enwlSubstations.substationNumber,
      substationGroup: enwlSubstations.substationGroup,
      outfeed: enwlSubstations.outfeed,
      area: enwlSubstations.area,
      primaryFeeder: enwlSubstations.primaryFeeder,
      primaryNumberAlias: enwlSubstations.primaryNumberAlias,
      latitude: enwlSubstations.latitude,
      longitude: enwlSubstations.longitude,
    })
      .from(enwlSubstations)
      .where(and(
        eq(enwlSubstations.substationGroup, 'DISTRIBUTION'),
        gte(enwlSubstations.latitude, 53.6),
        lte(enwlSubstations.latitude, 54.0),
        gte(enwlSubstations.longitude, -2.6),
        lte(enwlSubstations.longitude, -2.1),
      ));

    // Build lookup maps
    const subsByNumber = new Map(subs.map(s => [s.substationNumber, s]));

    // 2. Load LCT data for solar density check
    const lctRows = await db.select({
      distributionSubstation: enwlLct.distributionSubstation,
      solarInstallations: enwlLct.solarInstallations,
      batteryInstallations: enwlLct.batteryInstallations,
    })
      .from(enwlLct)
      .where(and(
        gte(enwlLct.latitude, 53.6),
        lte(enwlLct.latitude, 54.0),
        gte(enwlLct.longitude, -2.6),
        lte(enwlLct.longitude, -2.1),
      ));
    const lctMap = new Map(lctRows.map(l => [l.distributionSubstation, l]));

    // 3. Load distribution TX data for generation headroom
    const txRows = await db.select({
      distributionNumber: enwlDistTx.distributionNumber,
      ratingKva: enwlDistTx.ratingKva,
      loadKva: enwlDistTx.loadKva,
      generationHeadroomKva: enwlDistTx.generationHeadroomKva,
      utilisationPercent: enwlDistTx.utilisationPercent,
      primaryFeeder: enwlDistTx.primaryFeeder,
    })
      .from(enwlDistTx)
      .where(and(
        gte(enwlDistTx.latitude, 53.6),
        lte(enwlDistTx.latitude, 54.0),
        gte(enwlDistTx.longitude, -2.6),
        lte(enwlDistTx.longitude, -2.1),
      ));
    const txMap = new Map(txRows.map(t => [t.distributionNumber, t]));

    // 4. For each EPC property, find nearest substation and score it
    function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const scored = EPC_TARGET_PROPERTIES.map(prop => {
      // Find nearest substation
      let nearestSub: SubstationData | null = null;
      let nearestDist = Infinity;

      for (const sub of subs) {
        if (sub.latitude == null || sub.longitude == null) continue;
        const d = haversineKm(prop.latitude, prop.longitude, sub.latitude, sub.longitude);
        if (d < nearestDist) {
          nearestDist = d;
          nearestSub = sub as SubstationData;
        }
      }

      // Get LCT and TX data for nearest substation
      const lct = nearestSub ? lctMap.get(nearestSub.substationNumber) : null;
      const isHighSolar = (lct?.solarInstallations ?? 0) >= 5;
      const distTx: DistTxData | null = nearestSub ? (txMap.get(nearestSub.substationNumber) ?? null) : null;

      // Determine 3-phase status from feeder
      let feederSubs: SubstationData[] = [];
      if (nearestSub?.primaryFeeder) {
        feederSubs = subs.filter(s => s.primaryFeeder === nearestSub!.primaryFeeder) as SubstationData[];
      }
      const { status: phaseStatus, label: phaseStatusLabel } = determine3PhaseStatus(
        nearestSub, feederSubs,
      );

      // Score the property
      const score = scorePropertyTiered(
        {
          id: prop.id,
          address: prop.address,
          postcode: prop.postcode,
          latitude: prop.latitude,
          longitude: prop.longitude,
          propertyType: prop.propertyType,
          bedrooms: prop.bedrooms,
          epcRating: prop.epcRating,
          gardenAccess: prop.gardenAccess,
          threePhaseConfirmed: prop.threePhaseConfirmed,
          threePhaseScore: prop.threePhaseScore,
        },
        nearestSub,
        distTx,
        phaseStatus,
        phaseStatusLabel,
        isHighSolar,
      );

      // Determine connection type and cost
      const connectionType = phaseStatus === 'already-3-phase' ? 'g99-only'
        : phaseStatus === 'cheap-upgrade' ? (nearestDist > 0.1 ? 'g99-road-crossing' : 'g99-plus-upgrade')
        : 'g99-road-crossing';
      const connCosts = CONNECTION_COSTS[connectionType];

      return {
        ...score,
        // Property location (from EPC data)
        latitude: prop.latitude,
        longitude: prop.longitude,
        // Substation context
        nearestSubstationNumber: nearestSub?.substationNumber ?? null,
        nearestSubstationOutfeed: nearestSub?.outfeed ?? null,
        distanceToSubKm: Math.round(nearestDist * 1000) / 1000,
        // Grid data
        solarNearby: lct?.solarInstallations ?? 0,
        batteriesNearby: lct?.batteryInstallations ?? 0,
        generationHeadroomKva: distTx?.generationHeadroomKva ?? null,
        transformerRatingKva: distTx?.ratingKva ?? null,
        // Connection assessment
        connectionType,
        connectionLabel: connCosts.label,
        estimatedConnectionCost: connCosts.g99Fee + connCosts.dnoConnectionCost,
        exportLimitKw: connCosts.exportLimitKw,
        // Road crossing risk
        roadCrossingRisk: nearestDist > 0.1 ? 'likely' : nearestDist > 0.05 ? 'possible' : 'unlikely',
      };
    })
      .filter(s => s.totalScore >= minScore)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);

    // Summary stats
    const tierCounts = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 };
    scored.forEach(s => {
      const key = `tier${s.breakdown.tier}` as keyof typeof tierCounts;
      tierCounts[key]++;
    });

    return NextResponse.json({
      total: scored.length,
      totalEpcProperties: EPC_TARGET_PROPERTIES.length,
      tierCounts,
      avgScore: scored.length > 0 ? Math.round(scored.reduce((s, p) => s + p.totalScore, 0) / scored.length) : 0,
      properties: scored,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (err) {
    console.error('[GET /api/grid/properties]', err);
    return NextResponse.json({ error: 'Failed to rank properties' }, { status: 500 });
  }
}
