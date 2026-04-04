import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, revenueActuals } from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';

interface OctopusConsumptionResult {
  consumption: number;
  interval_start: string;
  interval_end: string;
}

interface OctopusResponse {
  count: number;
  results: OctopusConsumptionResult[];
}

interface MonthBucket {
  year: number;
  month: number;
  importKwh: number;
  exportKwh: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Fetch the home record
    const [home] = await db
      .select()
      .from(homes)
      .where(eq(homes.id, id))
      .limit(1);

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // 2. Check Octopus credentials
    const record = home as Record<string, unknown>;
    const octopusApiKey = record.octopusApiKey as string | undefined;
    const importMpan = record.importMpan as string | undefined;
    const importSerialNumber = record.importSerialNumber as string | undefined;
    const exportMpan = record.exportMpan as string | undefined;
    const exportSerialNumber = record.exportSerialNumber as string | undefined;

    if (!octopusApiKey || !importMpan || !importSerialNumber || !exportMpan || !exportSerialNumber) {
      return NextResponse.json(
        { error: 'Octopus meter credentials not configured' },
        { status: 400 },
      );
    }

    // 3. Parse optional period range from request body
    let periodFrom: string;
    let periodTo: string;

    try {
      const body = await request.json().catch(() => ({}));
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      periodFrom = (body as { periodFrom?: string }).periodFrom ?? ninetyDaysAgo.toISOString();
      periodTo = (body as { periodTo?: string }).periodTo ?? now.toISOString();
    } catch {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      periodFrom = ninetyDaysAgo.toISOString();
      periodTo = now.toISOString();
    }

    const authHeader = `Basic ${Buffer.from(octopusApiKey + ':').toString('base64')}`;

    // 4. Fetch import consumption
    const importUrl =
      `https://api.octopus.energy/v1/electricity-meter-points/${importMpan}` +
      `/meters/${importSerialNumber}/consumption/` +
      `?page_size=25000&period_from=${periodFrom}&period_to=${periodTo}&order_by=period`;

    const importRes = await fetch(importUrl, {
      headers: { Authorization: authHeader },
    });

    if (!importRes.ok) {
      if (importRes.status === 401) {
        return NextResponse.json({ error: 'Invalid Octopus API key' }, { status: 401 });
      }
      if (importRes.status === 404) {
        return NextResponse.json({ error: 'Import MPAN not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Octopus API error (import): ${importRes.status}` },
        { status: 502 },
      );
    }

    const importData = (await importRes.json()) as OctopusResponse;

    // 5. Fetch export consumption
    const exportUrl =
      `https://api.octopus.energy/v1/electricity-meter-points/${exportMpan}` +
      `/meters/${exportSerialNumber}/consumption/` +
      `?page_size=25000&period_from=${periodFrom}&period_to=${periodTo}&order_by=period`;

    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: authHeader },
    });

    if (!exportRes.ok) {
      if (exportRes.status === 401) {
        return NextResponse.json({ error: 'Invalid Octopus API key' }, { status: 401 });
      }
      if (exportRes.status === 404) {
        return NextResponse.json({ error: 'Export MPAN not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Octopus API error (export): ${exportRes.status}` },
        { status: 502 },
      );
    }

    const exportData = (await exportRes.json()) as OctopusResponse;

    // 6. Group consumption by calendar month
    const monthBuckets = new Map<string, MonthBucket>();

    for (const item of importData.results) {
      const date = new Date(item.interval_start);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const key = `${year}-${month}`;

      const bucket = monthBuckets.get(key) ?? { year, month, importKwh: 0, exportKwh: 0 };
      bucket.importKwh += item.consumption;
      monthBuckets.set(key, bucket);
    }

    for (const item of exportData.results) {
      const date = new Date(item.interval_start);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const key = `${year}-${month}`;

      const bucket = monthBuckets.get(key) ?? { year, month, importKwh: 0, exportKwh: 0 };
      bucket.exportKwh += item.consumption;
      monthBuckets.set(key, bucket);
    }

    // 7. Calculate revenue for each month and determine install-relative month index
    const monthlyHomeownerPayment = home.monthlyHomeownerPayment ?? 0;

    // Fetch battery system for maintenance/insurance costs
    const maintenanceCostPerMonth = 0; // Will be populated from batterySystems if available
    const insuranceCostPerMonth = 0;   // Future: from insurance table

    const sortedBuckets = Array.from(monthBuckets.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );

    let totalImportKwh = 0;
    let totalExportKwh = 0;
    let cumulativeNet = 0;

    // 8. Upsert into revenueActuals
    for (let i = 0; i < sortedBuckets.length; i++) {
      const bucket = sortedBuckets[i];
      totalImportKwh += bucket.importKwh;
      totalExportKwh += bucket.exportKwh;

      // Simplified tariff estimates
      const importCost = bucket.importKwh * 0.20;     // 20p/kWh average import
      const exportRevenue = bucket.exportKwh * 0.15;   // 15p/kWh average export
      const netTariffRevenue = exportRevenue - importCost;

      const costsGbp = monthlyHomeownerPayment + maintenanceCostPerMonth + insuranceCostPerMonth;
      const netRevenueGbp = netTariffRevenue - costsGbp;
      cumulativeNet += netRevenueGbp;

      const monthIndex = i + 1; // Relative month from first data point

      // Upsert: delete existing row for this home/year/month, then insert
      await db
        .delete(revenueActuals)
        .where(
          and(
            eq(revenueActuals.homeId, id),
            eq(revenueActuals.calendarYear, bucket.year),
            eq(revenueActuals.calendarMonth, bucket.month),
          ),
        );

      await db.insert(revenueActuals).values({
        homeId: id,
        month: monthIndex,
        calendarMonth: bucket.month,
        calendarYear: bucket.year,
        arbitrageRevenueGbp: netTariffRevenue,
        savingSessionsRevenueGbp: 0,
        flexibilityRevenueGbp: 0,
        solarRevenueGbp: 0,
        segRevenueGbp: 0,
        totalRevenueGbp: netTariffRevenue,
        costsGbp,
        netRevenueGbp,
        cumulativeNetGbp: cumulativeNet,
      });
    }

    // 9. Update lastMeterSync on the home record
    await db
      .update(homes)
      .set({ updatedAt: new Date() })
      .where(eq(homes.id, id));

    // 10. Return summary
    return NextResponse.json({
      synced: true,
      monthsProcessed: sortedBuckets.length,
      totalImportKwh: Math.round(totalImportKwh * 100) / 100,
      totalExportKwh: Math.round(totalExportKwh * 100) / 100,
    });
  } catch (error) {
    console.error('Meter sync failed:', error);
    return NextResponse.json(
      { error: 'Meter sync failed' },
      { status: 500 },
    );
  }
}
