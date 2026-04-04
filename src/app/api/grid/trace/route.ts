// ============================================================
// GET /api/grid/trace?lat=53.72&lng=-2.49
//
// Returns the full infrastructure chain from a property location
// back to the primary substation, including:
// - Nearest distribution substation (with voltage, capacity)
// - Other substations on the same feeder
// - Primary substation location
// - LV overhead conductor routes (where available)
// - Road-crossing risk flag
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { enwlSubstations, enwlDistTx, enwlLct } from '@/shared/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  try {
    // 1. Find nearest distribution substations (within ~1km)
    const nearbyRange = 0.01; // ~1km
    const nearbySubs = await db.select({
      substationNumber: enwlSubstations.substationNumber,
      substationGroup: enwlSubstations.substationGroup,
      outfeed: enwlSubstations.outfeed,
      infeed: enwlSubstations.infeed,
      area: enwlSubstations.area,
      primaryFeeder: enwlSubstations.primaryFeeder,
      primaryNumberAlias: enwlSubstations.primaryNumberAlias,
      bspNumberAlias: enwlSubstations.bspNumberAlias,
      latitude: enwlSubstations.latitude,
      longitude: enwlSubstations.longitude,
    })
      .from(enwlSubstations)
      .where(and(
        eq(enwlSubstations.substationGroup, 'DISTRIBUTION'),
        gte(enwlSubstations.latitude, lat - nearbyRange),
        lte(enwlSubstations.latitude, lat + nearbyRange),
        gte(enwlSubstations.longitude, lng - nearbyRange * 1.5),
        lte(enwlSubstations.longitude, lng + nearbyRange * 1.5),
      ));

    if (nearbySubs.length === 0) {
      return NextResponse.json({ error: 'No substations found near this location' }, { status: 404 });
    }

    // Find nearest by distance
    function dist(sLat: number | null, sLng: number | null): number {
      if (sLat == null || sLng == null) return Infinity;
      return Math.sqrt((sLat - lat) ** 2 + ((sLng - lng) * 0.65) ** 2); // rough, adjusted for latitude
    }

    nearbySubs.sort((a, b) => dist(a.latitude, a.longitude) - dist(b.latitude, b.longitude));
    const nearest = nearbySubs[0]!;
    const distKm = nearest.latitude != null && nearest.longitude != null
      ? Math.sqrt(((nearest.latitude - lat) * 111) ** 2 + (((nearest.longitude - lng) * 111 * 0.65) ** 2))
      : 0;

    // 2. Get transformer data for nearest substation
    const txRows = await db.select({
      distributionNumber: enwlDistTx.distributionNumber,
      txNumber: enwlDistTx.txNumber,
      ratingKva: enwlDistTx.ratingKva,
      loadKva: enwlDistTx.loadKva,
      generationHeadroomKva: enwlDistTx.generationHeadroomKva,
      utilisationPercent: enwlDistTx.utilisationPercent,
      primaryNumber: enwlDistTx.primaryNumber,
      primaryFeeder: enwlDistTx.primaryFeeder,
      utilisationCategory: enwlDistTx.utilisationCategory,
    }).from(enwlDistTx)
      .where(eq(enwlDistTx.distributionNumber, nearest.substationNumber))
      .limit(1);

    // 3. Get LCT data
    const lctRows = await db.select({
      solarInstallations: enwlLct.solarInstallations,
      batteryInstallations: enwlLct.batteryInstallations,
      heatPumpInstallations: enwlLct.heatPumpInstallations,
      totalCustomers: enwlLct.totalCustomers,
    }).from(enwlLct)
      .where(eq(enwlLct.distributionSubstation, nearest.substationNumber))
      .limit(1);

    // 4. Get all substations on the same feeder (for the trace line)
    let feederSubs: typeof nearbySubs = [];
    if (nearest.primaryFeeder) {
      feederSubs = await db.select({
        substationNumber: enwlSubstations.substationNumber,
        substationGroup: enwlSubstations.substationGroup,
        outfeed: enwlSubstations.outfeed,
        infeed: enwlSubstations.infeed,
        area: enwlSubstations.area,
        primaryFeeder: enwlSubstations.primaryFeeder,
        primaryNumberAlias: enwlSubstations.primaryNumberAlias,
        bspNumberAlias: enwlSubstations.bspNumberAlias,
        latitude: enwlSubstations.latitude,
        longitude: enwlSubstations.longitude,
      })
        .from(enwlSubstations)
        .where(eq(enwlSubstations.primaryFeeder, nearest.primaryFeeder));
    }

    // 5. Find the primary substation location
    let primarySub = null;
    if (nearest.primaryNumberAlias) {
      const primaryRows = await db.select({
        substationNumber: enwlSubstations.substationNumber,
        substationGroup: enwlSubstations.substationGroup,
        outfeed: enwlSubstations.outfeed,
        infeed: enwlSubstations.infeed,
        latitude: enwlSubstations.latitude,
        longitude: enwlSubstations.longitude,
      })
        .from(enwlSubstations)
        .where(and(
          eq(enwlSubstations.substationNumber, nearest.primaryNumberAlias),
          eq(enwlSubstations.substationGroup, 'PRIMARY'),
        ))
        .limit(1);
      primarySub = primaryRows[0] ?? null;
    }

    // 6. Road-crossing risk detection
    // If the property and the nearest substation are on opposite sides,
    // there's a road crossing. We check the perpendicular distance
    // between property and substation — if >50m apart with a road between,
    // flag it. Since we don't have road data, use distance as proxy:
    // >100m from substation in urban area = likely road crossing
    const roadCrossingRisk = distKm > 0.1 ? 'likely' : distKm > 0.05 ? 'possible' : 'unlikely';
    const roadCrossingNote = roadCrossingRisk === 'likely'
      ? `Property is ${Math.round(distKm * 1000)}m from nearest substation — road crossing probable. ENWL road-crossing costs typically £4,000-£7,000 extra.`
      : roadCrossingRisk === 'possible'
        ? `Property is ${Math.round(distKm * 1000)}m from nearest substation — road crossing possible. Check cable route.`
        : `Property is ${Math.round(distKm * 1000)}m from nearest substation — likely same side of road.`;

    // 7. Build the trace chain
    const tx = txRows[0];
    const lct = lctRows[0];

    // Feeder phase breakdown
    const feederPhases = {
      threePhase: feederSubs.filter(s => s.outfeed === '415V').length,
      singlePhase: feederSubs.filter(s => s.outfeed === '240V').length,
      total: feederSubs.length,
    };

    const trace = {
      property: { latitude: lat, longitude: lng },

      nearestSubstation: {
        substationNumber: nearest.substationNumber,
        outfeed: nearest.outfeed,
        latitude: nearest.latitude,
        longitude: nearest.longitude,
        distanceKm: Math.round(distKm * 1000) / 1000,
        transformer: tx ? {
          txNumber: tx.txNumber,
          ratingKva: tx.ratingKva,
          loadKva: tx.loadKva,
          utilisationPercent: tx.utilisationPercent,
          generationHeadroomKva: tx.generationHeadroomKva,
          utilisationCategory: tx.utilisationCategory,
          primaryName: tx.primaryNumber,
        } : null,
        lct: lct ? {
          solarInstallations: lct.solarInstallations,
          batteryInstallations: lct.batteryInstallations,
          heatPumpInstallations: lct.heatPumpInstallations,
          totalCustomers: lct.totalCustomers,
        } : null,
      },

      feeder: {
        feederId: nearest.primaryFeeder,
        phases: feederPhases,
        substations: feederSubs.map(s => ({
          substationNumber: s.substationNumber,
          outfeed: s.outfeed,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
      },

      primary: primarySub ? {
        substationNumber: primarySub.substationNumber,
        name: tx?.primaryNumber ?? nearest.primaryNumberAlias,
        infeed: primarySub.infeed,
        outfeed: primarySub.outfeed,
        latitude: primarySub.latitude,
        longitude: primarySub.longitude,
      } : {
        name: tx?.primaryNumber ?? nearest.primaryNumberAlias,
        latitude: null,
        longitude: null,
      },

      roadCrossing: {
        risk: roadCrossingRisk,
        note: roadCrossingNote,
        distanceToSubM: Math.round(distKm * 1000),
        estimatedExtraCost: roadCrossingRisk === 'likely' ? 5000 : roadCrossingRisk === 'possible' ? 2500 : 0,
      },

      // Nearby substations for context (closest 5)
      nearbySubstations: nearbySubs.slice(0, 5).map(s => ({
        substationNumber: s.substationNumber,
        outfeed: s.outfeed,
        latitude: s.latitude,
        longitude: s.longitude,
        distanceKm: Math.round(
          Math.sqrt(((s.latitude! - lat) * 111) ** 2 + (((s.longitude! - lng) * 111 * 0.65) ** 2)) * 1000
        ) / 1000,
      })),
    };

    return NextResponse.json(trace, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (err) {
    console.error('[GET /api/grid/trace]', err);
    return NextResponse.json({ error: 'Failed to trace infrastructure' }, { status: 500 });
  }
}
