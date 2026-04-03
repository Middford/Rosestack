// ============================================================
// GET /api/tariffs/agile-model?months=12&batteryKwh=322&...
//
// Fetches historical Agile rates from DB and runs the patient
// trader model. Returns the same structure as the IOF model
// for direct comparison.
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { agileRates } from '@/shared/db/schema';
import { and, gte, lte, eq } from 'drizzle-orm';
import { runAgileModel, type AgileModelConfig, type AgileDayData } from '@/modules/tariffs/agile-model';

// UK timezone helpers
function toUkDate(isoUtc: string): string {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = fmt.formatToParts(d);
  return `${p.find(x => x.type === 'year')?.value}-${p.find(x => x.type === 'month')?.value}-${p.find(x => x.type === 'day')?.value}`;
}

function toUkSlot(isoUtc: string): number {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = fmt.formatToParts(d);
  return parseInt(p.find(x => x.type === 'hour')?.value ?? '0') * 2 +
    (parseInt(p.find(x => x.type === 'minute')?.value ?? '0') >= 30 ? 1 : 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Parse config from query params
  const config: AgileModelConfig = {
    batteryCapKwh: Number(searchParams.get('batteryKwh') ?? 322),
    inverterKw: Number(searchParams.get('inverterKw') ?? 80),
    exportLimitKw: Number(searchParams.get('exportKw') ?? 66),
    solarKwp: Number(searchParams.get('solarKwp') ?? 25),
    efficiency: Number(searchParams.get('efficiency') ?? 0.93),
    houseKwhPerDay: Number(searchParams.get('houseKwh') ?? 24),
    hasHeatPump: searchParams.get('heatPump') !== 'false',
    evCount: Number(searchParams.get('evCount') ?? 2),
    evKwhPerDay: Number(searchParams.get('evKwhPerDay') ?? 7.8),
  };

  const months = Number(searchParams.get('months') ?? 12);

  try {
    // Calculate date range: last N months
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);
    const fromStr = fromDate.toISOString();
    const toStr = toDate.toISOString();

    // Fetch import + export rates from DB
    const importSlots = await db.select({
      validFrom: agileRates.validFrom,
      valueIncVat: agileRates.valueIncVat,
    })
      .from(agileRates)
      .where(and(
        eq(agileRates.type, 'import'),
        gte(agileRates.validFrom, fromStr),
        lte(agileRates.validFrom, toStr),
      ))
      .orderBy(agileRates.validFrom);

    const exportSlots = await db.select({
      validFrom: agileRates.validFrom,
      valueIncVat: agileRates.valueIncVat,
    })
      .from(agileRates)
      .where(and(
        eq(agileRates.type, 'export'),
        gte(agileRates.validFrom, fromStr),
        lte(agileRates.validFrom, toStr),
      ))
      .orderBy(agileRates.validFrom);

    // Group by UK date
    const importByDate = new Map<string, Array<{ slot: number; rate: number }>>();
    for (const s of importSlots) {
      const d = toUkDate(s.validFrom);
      if (!importByDate.has(d)) importByDate.set(d, []);
      importByDate.get(d)!.push({ slot: toUkSlot(s.validFrom), rate: s.valueIncVat });
    }

    const exportByDate = new Map<string, Array<{ slot: number; rate: number }>>();
    for (const s of exportSlots) {
      const d = toUkDate(s.validFrom);
      if (!exportByDate.has(d)) exportByDate.set(d, []);
      exportByDate.get(d)!.push({ slot: toUkSlot(s.validFrom), rate: s.valueIncVat });
    }

    // Build daily data array (only days with enough import slots + export data)
    const dates = [...importByDate.keys()]
      .filter(d => (importByDate.get(d)?.length ?? 0) >= 40 && exportByDate.has(d))
      .sort();

    const dailyData: AgileDayData[] = dates.map(date => {
      const impSlots = importByDate.get(date) ?? [];
      const expSlots = exportByDate.get(date) ?? [];
      const month = parseInt(date.slice(5, 7));

      // Build 48-slot rate array
      const rates = [];
      for (let i = 0; i < 48; i++) {
        const impRate = impSlots.find(s => s.slot === i)?.rate ?? 20;
        const expRate = expSlots.find(s => s.slot === i)?.rate ?? 10;
        rates.push({ slot: i, importRate: impRate, exportRate: expRate });
      }

      return { date, month, rates };
    });

    // Run the model
    const result = runAgileModel(config, dailyData);

    return NextResponse.json({
      config,
      dateRange: { from: dates[0], to: dates[dates.length - 1], totalDays: dates.length },
      days: result.days,
      monthly: result.monthly,
      annual: result.annual,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (err) {
    console.error('[api/tariffs/agile-model] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
