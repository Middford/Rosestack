// ============================================================
// GET /api/grid/properties — Top ranked properties from DB
//
// Scores EPC properties from epc_properties table against real
// ENWL substation data. With 122K+ properties, scoring is done
// in stages:
// 1. Pre-filter properties by area (lat/lng bounds)
// 2. Pre-filter to detached houses with solar or large size
// 3. Find nearest substation per property
// 4. Score with tiered funnel
// 5. Return top N
//
// ?limit=200 — number of results (default 200)
// ?lat=53.8&lng=-2.4&radius=15 — search area (default East Lancs)
// ?solarOnly=true — only properties with confirmed solar PV
// ?detachedOnly=true — only detached (not semi)
// ?minBedrooms=4 — minimum bedrooms
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { enwlSubstations, enwlLct, enwlDistTx } from '@/shared/db/schema';
import { and, gte, lte, eq, desc, sql as dsql } from 'drizzle-orm';
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
  const lat = parseFloat(searchParams.get('lat') ?? '53.75');
  const lng = parseFloat(searchParams.get('lng') ?? '-2.45');
  const radius = parseFloat(searchParams.get('radius') ?? '20');
  const solarOnly = searchParams.get('solarOnly') === 'true';
  const detachedOnly = searchParams.get('detachedOnly') === 'true';
  const minBedrooms = parseInt(searchParams.get('minBedrooms') ?? '3');

  try {
    const latDelta = radius / 111;
    const lngDelta = radius / 70;

    // 1. Fetch candidate properties from DB using Drizzle raw SQL
    // Build conditions array
    const conditions = [
      dsql`latitude BETWEEN ${lat - latDelta} AND ${lat + latDelta}`,
      dsql`longitude BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`,
      dsql`number_habitable_rooms >= ${minBedrooms}`,
    ];
    if (solarOnly) conditions.push(dsql`photo_supply > 0`);
    if (detachedOnly) conditions.push(dsql`built_form = 'Detached'`);

    const epcRows = await db.execute(dsql`
      SELECT lmk_key, address, address1, postcode, uprn, local_authority_label,
             built_form, construction_age, total_floor_area, number_habitable_rooms,
             current_energy_rating, current_energy_efficiency,
             photo_supply, solar_water_heating, mains_gas,
             mainheat_description, latitude, longitude
      FROM epc_properties
      WHERE ${dsql.join(conditions, dsql` AND `)}
      ORDER BY total_floor_area DESC NULLS LAST
      LIMIT 2000
    `) as unknown as Record<string, unknown>[];

    if (epcRows.length === 0) {
      return NextResponse.json({
        total: 0, totalSearched: 0, tierCounts: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
        avgScore: 0, properties: [],
      });
    }

    // 2. Load ENWL substations in the area
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

    // Build lookup maps
    const lctRows = await db.select({
      distributionSubstation: enwlLct.distributionSubstation,
      solarInstallations: enwlLct.solarInstallations,
      batteryInstallations: enwlLct.batteryInstallations,
    })
      .from(enwlLct)
      .where(and(
        gte(enwlLct.latitude, lat - latDelta),
        lte(enwlLct.latitude, lat + latDelta),
        gte(enwlLct.longitude, lng - lngDelta),
        lte(enwlLct.longitude, lng + lngDelta),
      ));
    const lctMap = new Map(lctRows.map(l => [l.distributionSubstation, l]));

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
        gte(enwlDistTx.latitude, lat - latDelta),
        lte(enwlDistTx.latitude, lat + latDelta),
        gte(enwlDistTx.longitude, lng - lngDelta),
        lte(enwlDistTx.longitude, lng + lngDelta),
      ));
    const txMap = new Map(txRows.map(t => [t.distributionNumber, t]));

    // 3. Score each property
    function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const scored = epcRows.map((prop: Record<string, unknown>) => {
      const pLat = prop.latitude as number;
      const pLng = prop.longitude as number;
      if (!pLat || !pLng) return null;

      // Find nearest substation
      let nearestSub: SubstationData | null = null;
      let nearestDist = Infinity;
      for (const sub of subs) {
        if (sub.latitude == null || sub.longitude == null) continue;
        const d = haversineKm(pLat, pLng, sub.latitude, sub.longitude);
        if (d < nearestDist) { nearestDist = d; nearestSub = sub as SubstationData; }
      }

      const lct = nearestSub ? lctMap.get(nearestSub.substationNumber) : null;
      const isHighSolar = (lct?.solarInstallations ?? 0) >= 5;
      const distTx: DistTxData | null = nearestSub ? (txMap.get(nearestSub.substationNumber) ?? null) : null;

      // 3-phase from feeder
      let feederSubs: SubstationData[] = [];
      if (nearestSub?.primaryFeeder) {
        feederSubs = subs.filter(s => s.primaryFeeder === nearestSub!.primaryFeeder) as SubstationData[];
      }
      const { status: phaseStatus, label: phaseStatusLabel } = determine3PhaseStatus(nearestSub, feederSubs);

      // Determine if property has solar from EPC data
      const photoSupply = parseFloat(String(prop.photo_supply ?? '0')) || 0;
      const hasSolarEpc = photoSupply > 0 || prop.solar_water_heating === 'Y';

      const rooms = parseInt(String(prop.number_habitable_rooms ?? '3')) || 3;
      const builtForm = String(prop.built_form ?? 'Detached');
      const epcRating = String(prop.current_energy_rating ?? 'D');
      const floorArea = parseFloat(String(prop.total_floor_area ?? '0')) || 0;

      // Infer property type and bedrooms from EPC data
      const propertyType = builtForm === 'Detached' ? 'detached' : builtForm === 'Semi-Detached' ? 'semi' : 'terrace';
      const bedrooms = rooms >= 8 ? 5 : rooms >= 6 ? 4 : rooms >= 4 ? 3 : 2;
      const gardenAccess = propertyType === 'detached' || propertyType === 'semi';

      const score = scorePropertyTiered(
        {
          id: String(prop.lmk_key),
          address: String(prop.address ?? prop.address1 ?? ''),
          postcode: String(prop.postcode ?? ''),
          latitude: pLat,
          longitude: pLng,
          propertyType,
          bedrooms,
          epcRating,
          gardenAccess,
          threePhaseConfirmed: false,
          threePhaseScore: propertyType === 'detached' && floorArea > 150 ? 70 : 40,
          photoSupply: photoSupply > 0 ? photoSupply : undefined,
          solarWaterHeating: prop.solar_water_heating === 'Y',
        },
        nearestSub,
        distTx,
        phaseStatus,
        phaseStatusLabel,
        isHighSolar || hasSolarEpc,
      );

      const connectionType = phaseStatus === 'already-3-phase' ? 'g99-only'
        : phaseStatus === 'cheap-upgrade' ? (nearestDist > 0.1 ? 'g99-road-crossing' : 'g99-plus-upgrade')
        : 'g99-road-crossing';
      const connCosts = CONNECTION_COSTS[connectionType];

      return {
        ...score,
        latitude: pLat,
        longitude: pLng,
        floorAreaM2: floorArea,
        rooms,
        builtForm,
        localAuthority: String(prop.local_authority_label ?? ''),
        hasSolarEpc,
        nearestSubstationNumber: nearestSub?.substationNumber ?? null,
        nearestSubstationOutfeed: nearestSub?.outfeed ?? null,
        distanceToSubKm: Math.round(nearestDist * 1000) / 1000,
        solarNearby: lct?.solarInstallations ?? 0,
        batteriesNearby: lct?.batteryInstallations ?? 0,
        generationHeadroomKva: distTx?.generationHeadroomKva ?? null,
        transformerRatingKva: distTx?.ratingKva ?? null,
        connectionType,
        connectionLabel: connCosts.label,
        estimatedConnectionCost: connCosts.g99Fee + connCosts.dnoConnectionCost,
        exportLimitKw: connCosts.exportLimitKw,
        roadCrossingRisk: nearestDist > 0.1 ? 'likely' : nearestDist > 0.05 ? 'possible' : 'unlikely',
      };
    })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);

    // Fetch sold prices from Land Registry for the final results
    // Group by postcode to minimize API calls
    const postcodes = [...new Set(scored.map(s => s.postcode).filter(Boolean))];
    const priceMap = new Map<string, { lastSoldPrice: number; lastSoldDate: string; lastSoldAddress: string }>();

    // Fetch in batches of 5 postcodes at a time (Land Registry is rate-limited)
    for (let i = 0; i < Math.min(postcodes.length, 50); i++) {
      const pc = postcodes[i]!;
      try {
        const priceRes = await fetch(
          `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?_pageSize=3&propertyAddress.postcode=${encodeURIComponent(pc)}&_sort=-transactionDate`,
          { signal: AbortSignal.timeout(3000) },
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          const items = priceData.result?.items || [];
          // Find the most relevant sale for each address in our results
          for (const item of items) {
            const addr = item.propertyAddress;
            const paon = (addr?.paon || '').toUpperCase();
            const street = (addr?.street || '').toUpperCase();
            const key = `${paon} ${street} ${pc}`.trim();
            if (!priceMap.has(pc) || parseInt(item.pricePaid) > (priceMap.get(pc)?.lastSoldPrice ?? 0)) {
              priceMap.set(pc, {
                lastSoldPrice: parseInt(item.pricePaid) || 0,
                lastSoldDate: (item.transactionDate || '').slice(0, 10),
                lastSoldAddress: `${paon} ${street}`.trim(),
              });
            }
          }
        }
      } catch {
        // Skip — Land Registry timeout or error
      }
    }

    // Attach prices to scored results with estimated current value
    // North West England average annual house price growth ~4% (HM Land Registry HPI)
    const ANNUAL_GROWTH_RATE = 0.04;
    const now = new Date();

    const scoredWithPrices = scored.map(s => {
      const priceInfo = priceMap.get(s.postcode);
      const floorArea = (s as any).floorAreaM2 || 0;

      let estimatedCurrentValue: number | null = null;
      let yearsSinceSale: number | null = null;

      if (priceInfo?.lastSoldPrice && priceInfo.lastSoldDate) {
        const saleDate = new Date(priceInfo.lastSoldDate);
        yearsSinceSale = Math.max(0, (now.getTime() - saleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        // Compound growth: currentValue = soldPrice × (1 + rate)^years
        estimatedCurrentValue = Math.round(priceInfo.lastSoldPrice * Math.pow(1 + ANNUAL_GROWTH_RATE, yearsSinceSale));
      }

      const valuePerM2 = estimatedCurrentValue && floorArea > 0
        ? Math.round(estimatedCurrentValue / floorArea)
        : null;

      return {
        ...s,
        lastSoldPrice: priceInfo?.lastSoldPrice ?? null,
        lastSoldDate: priceInfo?.lastSoldDate ?? null,
        estimatedCurrentValue,
        yearsSinceSale: yearsSinceSale != null ? Math.round(yearsSinceSale * 10) / 10 : null,
        valuePerM2,
      };
    });

    const tierCounts = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 };
    scoredWithPrices.forEach(s => {
      const key = `tier${s.breakdown.tier}` as keyof typeof tierCounts;
      tierCounts[key]++;
    });

    return NextResponse.json({
      total: scoredWithPrices.length,
      totalSearched: epcRows.length,
      totalInDb: 122208,
      tierCounts,
      avgScore: scoredWithPrices.length > 0 ? Math.round(scoredWithPrices.reduce((s, p) => s + p.totalScore, 0) / scoredWithPrices.length) : 0,
      filters: { lat, lng, radius, solarOnly, detachedOnly, minBedrooms },
      properties: scoredWithPrices,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/grid/properties]', message);
    return NextResponse.json({ error: `Failed to rank properties: ${message}` }, { status: 500 });
  }
}
