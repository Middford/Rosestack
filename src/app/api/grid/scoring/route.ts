// ============================================================
// GET /api/grid/scoring — Rank substations and properties using real ENWL data
//
// ?type=substations — ranked substations for deployment strategy
// ?type=substations&lat=53.8&lng=-2.4&radius=15 — within radius (km)
// ?type=properties&substationNumber=451200 — properties near a substation
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { enwlSubstations, enwlLct, enwlCapacity, enwlFlexTenders } from '@/shared/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  rankSubstations,
  scorePropertyWithEnwl,
  type SubstationData,
  type LctData,
  type CapacityData,
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
      return NextResponse.json({ error: 'Invalid type. Use substations or properties.' }, { status: 400 });
    }
  } catch (err) {
    console.error('[GET /api/grid/scoring]', err);
    return NextResponse.json({ error: 'Failed to compute scoring' }, { status: 500 });
  }
}

async function handleSubstations(params: URLSearchParams) {
  const lat = parseFloat(params.get('lat') ?? '53.8');
  const lng = parseFloat(params.get('lng') ?? '-2.4');
  const radius = parseFloat(params.get('radius') ?? '15'); // km
  const limit = parseInt(params.get('limit') ?? '100');

  // Rough bounding box from radius (1 degree lat ≈ 111km, 1 degree lng ≈ 70km at 54°N)
  const latDelta = radius / 111;
  const lngDelta = radius / 70;

  // Fetch distribution substations in bounding box
  const subs = await db.select({
    substationNumber: enwlSubstations.substationNumber,
    substationGroup: enwlSubstations.substationGroup,
    outfeed: enwlSubstations.outfeed,
    area: enwlSubstations.area,
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

  // Fetch LCT data for these substations
  const subNumbers = subs.map(s => s.substationNumber);
  const lctRows = subNumbers.length > 0
    ? await db.select().from(enwlLct).where(
        sql`${enwlLct.distributionSubstation} = ANY(${subNumbers})`,
      )
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

  // Fetch capacity data — get one representative section per substation area
  // (average load utilisation for sections near each substation)
  const capacityMap = new Map<string, CapacityData>();
  if (subs.length > 0) {
    // For efficiency, get all capacity sections in the bounding box
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

    // For each substation, find nearest capacity section
    for (const sub of subs) {
      if (sub.latitude == null || sub.longitude == null) continue;
      let bestDist = Infinity;
      let bestCap: CapacityData | null = null;
      for (const cap of capRows) {
        if (cap.latitude == null || cap.longitude == null) continue;
        const d = Math.abs(cap.latitude - sub.latitude) + Math.abs(cap.longitude - sub.longitude);
        if (d < bestDist) {
          bestDist = d;
          bestCap = {
            firmCapacityKva: cap.firmCapacityKva,
            estimatedMaxLoadKva: cap.estimatedMaxLoadKva,
            headroomKva: cap.headroomKva,
            loadUtilisation: cap.loadUtilisation,
            loadUtilisationCategory: cap.loadUtilisationCategory,
          };
        }
      }
      if (bestCap) capacityMap.set(sub.substationNumber, bestCap);
    }
  }

  // Fetch flex tender zones
  const flexRows = await db.select({
    constraintManagementZone: enwlFlexTenders.constraintManagementZone,
  }).from(enwlFlexTenders);
  const flexZones = new Set(flexRows.map(r => r.constraintManagementZone ?? ''));

  // Score and rank
  const ranked = rankSubstations(
    subs as SubstationData[],
    lctMap,
    capacityMap,
    flexZones,
  ).slice(0, limit);

  // Summary stats
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
      excellentCount: ranked.filter(r => r.totalScore >= 75).length,
      goodCount: ranked.filter(r => r.totalScore >= 55 && r.totalScore < 75).length,
    },
    substations: ranked,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}

async function handleProperties(params: URLSearchParams) {
  const substationNumber = params.get('substationNumber');
  if (!substationNumber) {
    return NextResponse.json({ error: 'substationNumber parameter required' }, { status: 400 });
  }

  // Fetch the target substation
  const subRows = await db.select().from(enwlSubstations)
    .where(eq(enwlSubstations.substationNumber, substationNumber))
    .limit(1);
  const sub = subRows[0] ?? null;
  if (!sub) {
    return NextResponse.json({ error: 'Substation not found' }, { status: 404 });
  }

  // Get LCT data for this substation
  const lctRows = await db.select().from(enwlLct)
    .where(eq(enwlLct.distributionSubstation, substationNumber))
    .limit(1);
  const isHighSolar = (lctRows[0]?.solarInstallations ?? 0) >= 5;

  // Get nearest capacity section
  let nearestCapacity: CapacityData | null = null;
  if (sub.latitude != null && sub.longitude != null) {
    const capRows = await db.select({
      firmCapacityKva: enwlCapacity.firmCapacityKva,
      estimatedMaxLoadKva: enwlCapacity.estimatedMaxLoadKva,
      headroomKva: enwlCapacity.headroomKva,
      loadUtilisation: enwlCapacity.loadUtilisation,
      loadUtilisationCategory: enwlCapacity.loadUtilisationCategory,
    })
      .from(enwlCapacity)
      .where(and(
        gte(enwlCapacity.latitude, (sub.latitude ?? 0) - 0.01),
        lte(enwlCapacity.latitude, (sub.latitude ?? 0) + 0.01),
        gte(enwlCapacity.longitude, (sub.longitude ?? 0) - 0.015),
        lte(enwlCapacity.longitude, (sub.longitude ?? 0) + 0.015),
      ))
      .limit(1);
    nearestCapacity = capRows[0] ?? null;
  }

  // Find EPC properties near this substation (within ~2km)
  const subLat = sub.latitude ?? 53.8;
  const subLng = sub.longitude ?? -2.4;
  const nearbyProps = EPC_TARGET_PROPERTIES.filter(p => {
    const dLat = Math.abs(p.latitude - subLat);
    const dLng = Math.abs(p.longitude - subLng);
    return dLat < 0.02 && dLng < 0.03; // ~2km box
  });

  // Score each property
  const scored = nearbyProps.map(prop => {
    // Count nearby properties for cluster score
    const nearbyCount = nearbyProps.filter(other => {
      if (other.id === prop.id) return false;
      const d = Math.abs(other.latitude - prop.latitude) + Math.abs(other.longitude - prop.longitude);
      return d < 0.005; // ~500m
    }).length;

    return scorePropertyWithEnwl(
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
        photoSupply: undefined, // Not yet in EPC seed data
        solarWaterHeating: undefined,
      },
      sub as SubstationData,
      nearestCapacity,
      isHighSolar,
      nearbyCount,
    );
  }).sort((a, b) => b.totalScore - a.totalScore);

  return NextResponse.json({
    type: 'properties',
    substationNumber,
    substationOutfeed: sub.outfeed,
    substationLat: sub.latitude,
    substationLng: sub.longitude,
    solar: lctRows[0]?.solarInstallations ?? 0,
    batteries: lctRows[0]?.batteryInstallations ?? 0,
    heatPumps: lctRows[0]?.heatPumpInstallations ?? 0,
    total: scored.length,
    properties: scored,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
