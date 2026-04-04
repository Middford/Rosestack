// ============================================================
// GET /api/grid/scoring — Rank substations and properties using real ENWL data
//
// ?type=substations — ranked substations for deployment strategy
// ?type=substations&lat=53.8&lng=-2.4&radius=15 — within radius (km)
// ?type=properties&substationNumber=451200 — properties near a substation
//
// Property scoring uses TIERED FUNNEL:
//   Tier 1: Already 3-phase + solar + large → Score 85-100
//   Tier 2: Already 3-phase + solar/large  → Score 60-79
//   Tier 3: Cheap upgrade + solar          → Score 45-59
//   Tier 4: Cheap upgrade, smaller         → Score 30-44
//   Tier 5: Complex upgrade                → Score <30
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { enwlSubstations, enwlLct, enwlCapacity, enwlFlexTenders, enwlDistTx } from '@/shared/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import {
  rankSubstations,
  scorePropertyTiered,
  determine3PhaseStatus,
  type SubstationData,
  type LctData,
  type CapacityData,
  type DistTxData,
} from '@/modules/grid/enwl-scoring';
import { EPC_TARGET_PROPERTIES } from '@/modules/grid/epc-seed';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'substations';

  try {
    if (type === 'substations') {
      return await handleSubstations(searchParams);
    } else if (type === 'properties') {
      return await handleProperties(searchParams);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (err) {
    console.error('[GET /api/grid/scoring]', err);
    return NextResponse.json({ error: 'Failed to compute scoring' }, { status: 500 });
  }
}

async function handleSubstations(params: URLSearchParams) {
  const lat = parseFloat(params.get('lat') ?? '53.8');
  const lng = parseFloat(params.get('lng') ?? '-2.4');
  const radius = parseFloat(params.get('radius') ?? '15');
  const limit = parseInt(params.get('limit') ?? '100');

  const latDelta = radius / 111;
  const lngDelta = radius / 70;

  // Fetch distribution substations in bounding box
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
      gte(enwlSubstations.latitude, lat - latDelta),
      lte(enwlSubstations.latitude, lat + latDelta),
      gte(enwlSubstations.longitude, lng - lngDelta),
      lte(enwlSubstations.longitude, lng + lngDelta),
    ));

  const subNumbers = subs.map(s => s.substationNumber);

  // Fetch LCT data
  const lctRows = subNumbers.length > 0
    ? await db.select().from(enwlLct).where(inArray(enwlLct.distributionSubstation, subNumbers))
    : [];
  const lctMap = new Map<string, LctData>();
  for (const r of lctRows) {
    lctMap.set(r.distributionSubstation, {
      distributionSubstation: r.distributionSubstation,
      totalCustomers: r.totalCustomers,
      solarInstallations: r.solarInstallations,
      solarCapacityKw: r.solarCapacityKw,
      batteryInstallations: r.batteryInstallations,
      batteryCapacityKwh: r.batteryCapacityKwh,
      heatPumpInstallations: r.heatPumpInstallations,
      heatPumpCapacityKw: r.heatPumpCapacityKw,
    });
  }

  // Fetch capacity data — nearest section per substation
  const capacityMap = new Map<string, CapacityData>();
  if (subs.length > 0) {
    const capRows = await db.select({
      loadUtilisation: enwlCapacity.loadUtilisation,
      loadUtilisationCategory: enwlCapacity.loadUtilisationCategory,
      headroomKva: enwlCapacity.headroomKva,
      firmCapacityKva: enwlCapacity.firmCapacityKva,
      estimatedMaxLoadKva: enwlCapacity.estimatedMaxLoadKva,
      latitude: enwlCapacity.latitude,
      longitude: enwlCapacity.longitude,
    })
      .from(enwlCapacity)
      .where(and(
        gte(enwlCapacity.latitude, lat - latDelta),
        lte(enwlCapacity.latitude, lat + latDelta),
        gte(enwlCapacity.longitude, lng - lngDelta),
        lte(enwlCapacity.longitude, lng + lngDelta),
      ))
      .limit(5000);

    for (const sub of subs) {
      if (sub.latitude == null || sub.longitude == null) continue;
      let bestDist = Infinity;
      let bestCap: CapacityData | null = null;
      for (const cap of capRows) {
        if (cap.latitude == null || cap.longitude == null) continue;
        const d = Math.abs(cap.latitude - sub.latitude) + Math.abs(cap.longitude - sub.longitude);
        if (d < bestDist) { bestDist = d; bestCap = cap; }
      }
      if (bestCap) capacityMap.set(sub.substationNumber, bestCap);
    }
  }

  // Fetch Distribution TX data — generation headroom per substation
  const distTxMap = new Map<string, DistTxData>();
  if (subNumbers.length > 0) {
    const txRows = await db.select({
      distributionNumber: enwlDistTx.distributionNumber,
      ratingKva: enwlDistTx.ratingKva,
      loadKva: enwlDistTx.loadKva,
      generationHeadroomKva: enwlDistTx.generationHeadroomKva,
      utilisationPercent: enwlDistTx.utilisationPercent,
      primaryFeeder: enwlDistTx.primaryFeeder,
    })
      .from(enwlDistTx)
      .where(inArray(enwlDistTx.distributionNumber, subNumbers));
    for (const r of txRows) {
      distTxMap.set(r.distributionNumber, r);
    }
  }

  // Flex tender zones
  const flexRows = await db.select({ constraintManagementZone: enwlFlexTenders.constraintManagementZone }).from(enwlFlexTenders);
  const flexZones = new Set(flexRows.map(r => r.constraintManagementZone ?? ''));

  // Score and rank
  const ranked = rankSubstations(subs as SubstationData[], lctMap, capacityMap, distTxMap, flexZones).slice(0, limit);

  const totalSolar = ranked.reduce((s, r) => s + r.solarInstallations, 0);
  const totalBatteries = ranked.reduce((s, r) => s + r.batteryInstallations, 0);
  const threePhaseCount = ranked.filter(r => r.outfeed === '415V').length;

  return NextResponse.json({
    type: 'substations',
    center: { lat, lng },
    radius,
    total: ranked.length,
    summary: {
      totalSolar,
      totalBatteries,
      solarBatteryGap: totalSolar - totalBatteries,
      threePhaseCount,
      threePhasePercent: ranked.length > 0 ? Math.round(threePhaseCount / ranked.length * 100) : 0,
      avgScore: ranked.length > 0 ? Math.round(ranked.reduce((s, r) => s + r.totalScore, 0) / ranked.length) : 0,
      excellentCount: ranked.filter(r => r.totalScore >= 80).length,
      goodCount: ranked.filter(r => r.totalScore >= 60 && r.totalScore < 80).length,
    },
    substations: ranked,
  }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
}

async function handleProperties(params: URLSearchParams) {
  const substationNumber = params.get('substationNumber');
  if (!substationNumber) {
    return NextResponse.json({ error: 'substationNumber required' }, { status: 400 });
  }

  // Fetch target substation
  const subRows = await db.select().from(enwlSubstations)
    .where(eq(enwlSubstations.substationNumber, substationNumber)).limit(1);
  const sub = subRows[0] ?? null;
  if (!sub) return NextResponse.json({ error: 'Substation not found' }, { status: 404 });

  // Get LCT data
  const lctRows = await db.select().from(enwlLct)
    .where(eq(enwlLct.distributionSubstation, substationNumber)).limit(1);
  const isHighSolar = (lctRows[0]?.solarInstallations ?? 0) >= 5;

  // Get Distribution TX for this substation (generation headroom)
  const txRows = await db.select({
    distributionNumber: enwlDistTx.distributionNumber,
    ratingKva: enwlDistTx.ratingKva,
    loadKva: enwlDistTx.loadKva,
    generationHeadroomKva: enwlDistTx.generationHeadroomKva,
    utilisationPercent: enwlDistTx.utilisationPercent,
    primaryFeeder: enwlDistTx.primaryFeeder,
  }).from(enwlDistTx)
    .where(eq(enwlDistTx.distributionNumber, substationNumber)).limit(1);
  const distTx: DistTxData | null = txRows[0] ?? null;

  // Get ALL substations on the same primary feeder (for 3-phase upgrade check)
  const feeder = sub.primaryFeeder;
  let feederSubstations: SubstationData[] = [];
  if (feeder) {
    const feederRows = await db.select({
      substationNumber: enwlSubstations.substationNumber,
      substationGroup: enwlSubstations.substationGroup,
      outfeed: enwlSubstations.outfeed,
      area: enwlSubstations.area,
      primaryFeeder: enwlSubstations.primaryFeeder,
      primaryNumberAlias: enwlSubstations.primaryNumberAlias,
      latitude: enwlSubstations.latitude,
      longitude: enwlSubstations.longitude,
    }).from(enwlSubstations)
      .where(eq(enwlSubstations.primaryFeeder, feeder));
    feederSubstations = feederRows as SubstationData[];
  }

  // Determine 3-phase upgrade feasibility from real feeder data
  const { status: phaseStatus, label: phaseStatusLabel } = determine3PhaseStatus(
    sub as SubstationData, feederSubstations,
  );

  // Find EPC properties near this substation
  const subLat = sub.latitude ?? 53.8;
  const subLng = sub.longitude ?? -2.4;
  const nearbyProps = EPC_TARGET_PROPERTIES.filter(p => {
    return Math.abs(p.latitude - subLat) < 0.02 && Math.abs(p.longitude - subLng) < 0.03;
  });

  // Score each property with the tiered funnel
  const scored = nearbyProps.map(prop => {
    return scorePropertyTiered(
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
      sub as SubstationData,
      distTx,
      phaseStatus,
      phaseStatusLabel,
      isHighSolar,
    );
  }).sort((a, b) => b.totalScore - a.totalScore);

  // Count tiers
  const tierCounts = [0, 0, 0, 0, 0, 0]; // index 0 unused, 1-5
  scored.forEach(s => { tierCounts[s.breakdown.tier] = (tierCounts[s.breakdown.tier] ?? 0) + 1; });

  return NextResponse.json({
    type: 'properties',
    substationNumber,
    substationOutfeed: sub.outfeed,
    phaseStatus,
    phaseStatusLabel,
    substationLat: sub.latitude,
    substationLng: sub.longitude,
    solar: lctRows[0]?.solarInstallations ?? 0,
    batteries: lctRows[0]?.batteryInstallations ?? 0,
    heatPumps: lctRows[0]?.heatPumpInstallations ?? 0,
    generationHeadroomKva: distTx?.generationHeadroomKva ?? null,
    transformerRatingKva: distTx?.ratingKva ?? null,
    feederHas3Phase: feederSubstations.some(s => s.outfeed === '415V'),
    total: scored.length,
    tierCounts: { tier1: tierCounts[1], tier2: tierCounts[2], tier3: tierCounts[3], tier4: tierCounts[4], tier5: tierCounts[5] },
    properties: scored,
  }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
}
