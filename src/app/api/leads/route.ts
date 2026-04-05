// ============================================================
// POST /api/leads — Create a lead-only record (no project)
// GET  /api/leads — List all leads
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { leads } from '@/shared/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.address || !body.postcode) {
      return NextResponse.json(
        { error: 'Missing required fields: address, postcode' },
        { status: 400 },
      );
    }

    // Geocode for precise coordinates
    let lat = body.latitude ?? null;
    let lng = body.longitude ?? null;
    if (body.address && body.postcode && (!lat || lat === 53.8 || lat === 53.75)) {
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

    const [lead] = await db
      .insert(leads)
      .values({
        homeId: null,
        name: body.homeownerName || `Homeowner at ${body.address}`,
        phone: body.phone ?? null,
        email: body.email ?? null,
        source: body.source ?? 'website',
        pipelineStatus: 'new_lead',
        // Lead-level property data
        address: body.address,
        postcode: body.postcode,
        latitude: lat,
        longitude: lng,
        epcRating: body.epcRating ?? null,
        gridScore: body.gridScore ?? null,
        gridTier: body.gridTier ?? null,
        phaseStatus: body.phaseStatus ?? null,
        leadPropertyType: body.propertyType ?? null,
        leadBedrooms: body.bedrooms ?? null,
      })
      .returning();

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leads]', err);
    const message = err instanceof Error ? err.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await db.select().from(leads);
    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('[GET /api/leads]', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
