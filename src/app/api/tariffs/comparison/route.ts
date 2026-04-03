// ============================================================
// GET /api/tariffs/comparison?months=12&batteryKwh=322&...
//
// Runs all three tariff models (IOF, Agile, Flux) with the same
// hardware config and returns combined results for side-by-side
// comparison. Uses historical DB data for Agile and Flux,
// and the fixed IOF model (since IOF data is limited in the API).
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { agileRates, fluxRates } from '@/shared/db/schema';
import { and, gte, lte, eq, asc } from 'drizzle-orm';
import { runAgileModel, type AgileModelConfig, type AgileDayData } from '@/modules/tariffs/agile-model';
import { runFluxHistoricalModel, type FluxHistoricalConfig, type FluxDayRates } from '@/modules/tariffs/flux-historical-model';
import { runIofModel, type IofModelConfig } from '@/modules/tariffs/iof-model';

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

function toUkHour(isoUtc: string): number {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false });
  return parseInt(fmt.format(d));
}

function classifyFluxBand(isoUtc: string): 'offpeak' | 'day' | 'peak' {
  const hour = toUkHour(isoUtc);
  if (hour >= 2 && hour < 5) return 'offpeak';
  if (hour >= 16 && hour < 19) return 'peak';
  return 'day';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const batteryKwh = Number(searchParams.get('batteryKwh') ?? 322);
  const inverterKw = Number(searchParams.get('inverterKw') ?? 80);
  const exportKw = Number(searchParams.get('exportKw') ?? 66);
  const solarKwp = Number(searchParams.get('solarKwp') ?? 25);
  const efficiency = Number(searchParams.get('efficiency') ?? 0.93);
  const houseKwh = Number(searchParams.get('houseKwh') ?? 24);
  const hasHeatPump = searchParams.get('heatPump') !== 'false';
  const evCount = Number(searchParams.get('evCount') ?? 2);
  const evKwhPerDay = Number(searchParams.get('evKwhPerDay') ?? 7.8);
  const months = Number(searchParams.get('months') ?? 12);

  try {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);
    const fromStr = fromDate.toISOString();
    const toStr = toDate.toISOString();

    // ── Fetch Agile rates ──
    const [agileImports, agileExports] = await Promise.all([
      db.select({ validFrom: agileRates.validFrom, valueIncVat: agileRates.valueIncVat })
        .from(agileRates)
        .where(and(eq(agileRates.type, 'import'), gte(agileRates.validFrom, fromStr), lte(agileRates.validFrom, toStr)))
        .orderBy(asc(agileRates.validFrom)),
      db.select({ validFrom: agileRates.validFrom, valueIncVat: agileRates.valueIncVat })
        .from(agileRates)
        .where(and(eq(agileRates.type, 'export'), gte(agileRates.validFrom, fromStr), lte(agileRates.validFrom, toStr)))
        .orderBy(asc(agileRates.validFrom)),
    ]);

    // ── Fetch Flux rates ──
    const [fluxImports, fluxExports] = await Promise.all([
      db.select({ validFrom: fluxRates.validFrom, validTo: fluxRates.validTo, valueIncVat: fluxRates.valueIncVat })
        .from(fluxRates)
        .where(and(eq(fluxRates.type, 'import'), gte(fluxRates.validFrom, fromStr), lte(fluxRates.validFrom, toStr)))
        .orderBy(asc(fluxRates.validFrom)),
      db.select({ validFrom: fluxRates.validFrom, validTo: fluxRates.validTo, valueIncVat: fluxRates.valueIncVat })
        .from(fluxRates)
        .where(and(eq(fluxRates.type, 'export'), gte(fluxRates.validFrom, fromStr), lte(fluxRates.validFrom, toStr)))
        .orderBy(asc(fluxRates.validFrom)),
    ]);

    // ── Build Agile daily data ──
    const agileImpByDate = new Map<string, Array<{ slot: number; rate: number }>>();
    for (const s of agileImports) {
      const d = toUkDate(s.validFrom);
      if (!agileImpByDate.has(d)) agileImpByDate.set(d, []);
      agileImpByDate.get(d)!.push({ slot: toUkSlot(s.validFrom), rate: s.valueIncVat });
    }
    const agileExpByDate = new Map<string, Array<{ slot: number; rate: number }>>();
    for (const s of agileExports) {
      const d = toUkDate(s.validFrom);
      if (!agileExpByDate.has(d)) agileExpByDate.set(d, []);
      agileExpByDate.get(d)!.push({ slot: toUkSlot(s.validFrom), rate: s.valueIncVat });
    }

    const agileDates = [...agileImpByDate.keys()]
      .filter(d => (agileImpByDate.get(d)?.length ?? 0) >= 40 && agileExpByDate.has(d))
      .sort();

    const agileDailyData: AgileDayData[] = agileDates.map(date => {
      const impSlots = agileImpByDate.get(date) ?? [];
      const expSlots = agileExpByDate.get(date) ?? [];
      const month = parseInt(date.slice(5, 7));
      const rates = [];
      for (let i = 0; i < 48; i++) {
        rates.push({
          slot: i,
          importRate: impSlots.find(s => s.slot === i)?.rate ?? 20,
          exportRate: expSlots.find(s => s.slot === i)?.rate ?? 10,
        });
      }
      return { date, month, rates };
    });

    // ── Build Flux daily data ──
    const fluxDayMap = new Map<string, {
      offPeakImp?: number; offPeakExp?: number;
      dayImp?: number; dayExp?: number;
      peakImp?: number; peakExp?: number;
    }>();

    for (const r of fluxImports) {
      const ukDate = toUkDate(r.validFrom);
      const band = classifyFluxBand(r.validFrom);
      if (!fluxDayMap.has(ukDate)) fluxDayMap.set(ukDate, {});
      const day = fluxDayMap.get(ukDate)!;
      if (band === 'offpeak') day.offPeakImp = r.valueIncVat;
      else if (band === 'peak') day.peakImp = r.valueIncVat;
      else day.dayImp = r.valueIncVat;
    }
    for (const r of fluxExports) {
      const ukDate = toUkDate(r.validFrom);
      const band = classifyFluxBand(r.validFrom);
      if (!fluxDayMap.has(ukDate)) fluxDayMap.set(ukDate, {});
      const day = fluxDayMap.get(ukDate)!;
      if (band === 'offpeak') day.offPeakExp = r.valueIncVat;
      else if (band === 'peak') day.peakExp = r.valueIncVat;
      else day.dayExp = r.valueIncVat;
    }

    const fluxDates = [...fluxDayMap.keys()]
      .filter(d => {
        const day = fluxDayMap.get(d)!;
        return day.offPeakImp != null && day.offPeakExp != null
          && day.dayImp != null && day.dayExp != null
          && day.peakImp != null && day.peakExp != null;
      })
      .sort();

    const fluxDailyRates: FluxDayRates[] = fluxDates.map(date => {
      const day = fluxDayMap.get(date)!;
      return {
        date, month: parseInt(date.slice(5, 7)),
        offPeakImp: day.offPeakImp!, offPeakExp: day.offPeakExp!,
        dayImp: day.dayImp!, dayExp: day.dayExp!,
        peakImp: day.peakImp!, peakExp: day.peakExp!,
      };
    });

    // ── Run all three models ──
    const agileConfig: AgileModelConfig = {
      batteryCapKwh: batteryKwh, inverterKw, exportLimitKw: exportKw, solarKwp,
      efficiency, houseKwhPerDay: houseKwh, hasHeatPump, evCount, evKwhPerDay,
    };

    const fluxConfig: FluxHistoricalConfig = { ...agileConfig };

    const iofConfig: IofModelConfig = {
      batteryCapKwh: batteryKwh, inverterKw, exportLimitKw: exportKw, solarKwp,
      efficiency, houseKwhPerDay: houseKwh, hasHeatPump, evCount, evKwhPerDay,
    };

    const agileResult = runAgileModel(agileConfig, agileDailyData);
    const fluxResult = runFluxHistoricalModel(fluxConfig, fluxDailyRates);
    const iofResult = runIofModel(iofConfig); // IOF fixed-rate model (38.26p peak, import=export parity)

    // ── Build monthly comparison ──
    const monthlyComparison = [];
    for (let m = 1; m <= 12; m++) {
      const agileMonth = agileResult.monthly.find(x => x.month === m);
      const fluxMonth = fluxResult.monthly.find(x => x.month === m);
      const iofMonth = iofResult.monthly.find(x => x.month === m);

      if (!agileMonth && !fluxMonth && !iofMonth) continue;

      monthlyComparison.push({
        month: m,
        label: ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m],
        iof: {
          net: iofMonth ? Math.round(iofMonth.net) : 0,
          dailyAvg: iofMonth ? Math.round(iofMonth.dailyAvg) : 0,
        },
        flux: {
          net: fluxMonth ? Math.round(fluxMonth.net) : 0,
          dailyAvg: fluxMonth ? Math.round(fluxMonth.dailyAvg) : 0,
          days: fluxMonth?.days ?? 0,
          avgSpread: fluxMonth?.avgSpread ?? 0,
        },
        agile: {
          net: agileMonth ? Math.round(agileMonth.net) : 0,
          dailyAvg: agileMonth ? Math.round(agileMonth.dailyAvg) : 0,
          days: agileMonth?.days ?? 0,
          tradedDays: agileMonth?.tradedDays ?? 0,
          heldDays: agileMonth?.heldDays ?? 0,
          negDays: agileMonth?.negDays ?? 0,
        },
        best: (() => {
          const iD = iofMonth?.dailyAvg ?? 0;
          const fD = fluxMonth?.dailyAvg ?? 0;
          const aD = agileMonth?.dailyAvg ?? 0;
          if (iD >= fD && iD >= aD) return 'iof';
          if (fD >= aD) return 'flux';
          return 'agile';
        })(),
      });
    }

    return NextResponse.json({
      config: { batteryKwh, inverterKw, exportKw, solarKwp, efficiency, houseKwh, hasHeatPump, evCount, evKwhPerDay },
      dateRanges: {
        agile: { from: agileDates[0], to: agileDates[agileDates.length - 1], totalDays: agileDates.length },
        flux: { from: fluxDates[0], to: fluxDates[fluxDates.length - 1], totalDays: fluxDates.length },
        iof: { from: null, to: null, totalDays: 365, note: 'Fixed-rate model (IOF API limited)' },
      },
      annual: {
        iof: { net: iofResult.annual.net, netGbp: iofResult.annual.netGbp, avgDailyPence: iofResult.annual.avgDailyPence, avgDailyGbp: iofResult.annual.avgDailyGbp },
        flux: { net: fluxResult.annual.net, netGbp: fluxResult.annual.netGbp, avgDailyPence: fluxResult.annual.avgDailyPence, avgDailyGbp: fluxResult.annual.avgDailyGbp, totalDays: fluxResult.annual.totalDays, avgSpread: fluxResult.annual.avgSpread },
        agile: { net: agileResult.annual.net, netGbp: agileResult.annual.netGbp, avgDailyPence: agileResult.annual.avgDailyPence, avgDailyGbp: agileResult.annual.avgDailyGbp, totalDays: agileResult.annual.totalDays, tradedDays: agileResult.annual.tradedDays, heldDays: agileResult.annual.heldDays, negDays: agileResult.annual.negDays },
      },
      monthly: monthlyComparison,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (err) {
    console.error('[api/tariffs/comparison] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
