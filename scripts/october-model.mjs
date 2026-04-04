// October 2025 — Full month simulation
// 600kWh battery, 100kW inverter, 70kW export, 20kWp solar
// Three tariffs: IOF, Standard Flux, Agile
// Start: 1 Oct 00:00, empty batteries (5% SOC)

import postgres from 'postgres';
import { writeFileSync } from 'fs';

const DB = 'postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway';
const sql = postgres(DB, { ssl: 'require' });

// ═══════════════════════════════════════════
// SYSTEM
// ═══════════════════════════════════════════
const SYS = {
  cap: 600,          // kWh
  inverterKw: 100,   // kW
  exportKw: 70,      // G99 limit
  eff: 0.93,
  minSoc: 0.05,      // 5% = 30kWh floor
  maxSoc: 0.95,      // 95% = 570kWh ceiling (5% headroom)
  solarKwp: 20,
};

const HOUSE_KWH_SLOT = 0.5;   // 24kWh/day baseload
const EV_CHARGE_KW = 22;       // per charger
const EV_COUNT = 2;
const EV_DAILY_KWH = 15;       // ~15kWh/day average driving per EV

// IOF rates
const IOF = { offPeak: 16.40, day: 27.33, peak: 38.26 };
const IOF_RESERVE = 0.20; // 20% mandated

// Standard Flux rates
const FLUX = {
  offPeakImp: 17.90, offPeakExp: 5.12,
  dayImp: 26.80, dayExp: 10.54,
  peakImp: 30.68, peakExp: 30.68,
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function toUkDate(iso) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  return `${p.find(x=>x.type==='year').value}-${p.find(x=>x.type==='month').value}-${p.find(x=>x.type==='day').value}`;
}
function toUkSlot(iso) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
  return parseInt(p.find(x=>x.type==='hour').value)*2+(parseInt(p.find(x=>x.type==='minute').value)>=30?1:0);
}

function getBand(slot) {
  // Off-peak: 02:00-05:00 = slots 4-9
  if (slot >= 4 && slot < 10) return 'offpeak';
  // Peak: 16:00-19:00 = slots 32-37
  if (slot >= 32 && slot < 38) return 'peak';
  return 'day';
}

function getDayOfYear(d) {
  const dt = new Date(d + 'T12:00:00Z');
  return Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 864e5);
}

function estimateSolar(dayOfYear) {
  const seasonal = Math.max(0, Math.sin((dayOfYear - 80) * (Math.PI / 185)));
  const daily = SYS.solarKwp * 4.8 * seasonal;
  if (daily <= 0) return new Array(48).fill(0);
  const slots = new Array(48).fill(0);
  let total = 0;
  for (let i = 0; i < 48; i++) {
    const dist = Math.abs(i - 26);
    if (dist <= 10) { slots[i] = Math.exp(-0.5 * (dist / 5) ** 2); total += slots[i]; }
  }
  const max = SYS.solarKwp * 0.85 * 0.5;
  return slots.map(v => Math.min((total > 0 ? daily / total : 0) * v, max));
}

// ═══════════════════════════════════════════
// TARIFF SIMULATORS (slot-by-slot)
// ═══════════════════════════════════════════

function simulateIof(dates, solarByDate) {
  const maxKwh = SYS.cap * (SYS.maxSoc - IOF_RESERVE); // 80% usable = 450kWh
  const minKwh = SYS.cap * SYS.minSoc; // 30kWh
  const chargePerSlot = Math.min(SYS.inverterKw, SYS.cap) * 0.5; // 50kWh from grid per slot
  const dischargePerSlot = Math.min(SYS.inverterKw, SYS.exportKw) * 0.5; // 35kWh per slot

  let stored = minKwh;
  let evNeedKwh = 0;
  const days = [];

  for (const date of dates) {
    const solar = solarByDate[date] || new Array(48).fill(0);
    let dayCost = 0, dayExport = 0, daySelfUse = 0, dayEvCost = 0, daySolarUsed = 0;
    evNeedKwh += EV_DAILY_KWH * EV_COUNT; // EVs need charging

    for (let slot = 0; slot < 48; slot++) {
      const band = getBand(slot);
      const impRate = band === 'offpeak' ? IOF.offPeak : band === 'peak' ? IOF.peak : IOF.day;
      const expRate = impRate; // IOF: import = export

      // Solar goes into battery first
      const solarKwh = solar[slot] || 0;
      if (solarKwh > 0) {
        const headroom = maxKwh - stored;
        const solarIn = Math.min(solarKwh, headroom);
        stored += solarIn;
        daySolarUsed += solarIn;
      }

      // Household consumption (battery powers house 24/7)
      if (stored > minKwh + HOUSE_KWH_SLOT) {
        stored -= HOUSE_KWH_SLOT;
        daySelfUse += HOUSE_KWH_SLOT * impRate;
      }

      if (band === 'offpeak') {
        // CHARGE from grid
        const headroom = maxKwh - stored;
        if (headroom > 0) {
          const eIn = Math.min(chargePerSlot * SYS.eff, headroom);
          const grid = eIn / SYS.eff;
          dayCost += grid * impRate;
          stored += eIn;
        }
        // Also charge EVs during off-peak
        if (evNeedKwh > 0) {
          const evCharge = Math.min(EV_CHARGE_KW * EV_COUNT * 0.5, evNeedKwh);
          dayEvCost += evCharge * impRate;
          evNeedKwh -= evCharge;
        }
      } else if (band === 'day') {
        // IOF: battery idle during day. Kraken holds.
        // But with 600kWh we could argue for a DAY discharge cycle too
        // IOF day export = 27.33p, day import = 27.33p — no spread, so idle

        // However: if battery was charged at 16.40p off-peak,
        // exporting at 27.33p day rate IS profitable (10.93p spread)
        // Kraken MIGHT do this with a big battery. Let's model it:
        // After peak discharge, if battery still has charge, Kraken could
        // also discharge during 05:00-07:00 morning peak at 27.33p
        // For now: Kraken only discharges at peak (conservative)
      } else if (band === 'peak') {
        // DISCHARGE at peak rate
        const avail = stored - minKwh;
        if (avail > 0) {
          const expKwh = Math.min(dischargePerSlot, avail);
          dayExport += expKwh * expRate;
          stored -= expKwh;
        }
      }
    }

    const dayNet = dayExport + daySelfUse - dayCost - dayEvCost + daySolarUsed * IOF.day; // solar self-use valued at day rate
    days.push({
      date, stored: Math.round(stored),
      cost: Math.round(dayCost), export: Math.round(dayExport),
      selfUse: Math.round(daySelfUse), evCost: Math.round(dayEvCost),
      solarKwh: Math.round(daySolarUsed * 10) / 10,
      net: Math.round(dayExport + daySelfUse - dayCost - dayEvCost),
      socPct: Math.round(stored / SYS.cap * 100),
    });
  }
  return days;
}

function simulateFlux(dates, solarByDate) {
  const maxKwh = SYS.cap * (SYS.maxSoc - 0.10); // 10% reserve for Flux
  const minKwh = SYS.cap * SYS.minSoc;
  const chargePerSlot = Math.min(SYS.inverterKw, SYS.cap) * 0.5;
  const dischargePerSlot = Math.min(SYS.inverterKw, SYS.exportKw) * 0.5;

  let stored = minKwh;
  let evNeedKwh = 0;
  const days = [];

  for (const date of dates) {
    const solar = solarByDate[date] || new Array(48).fill(0);
    let dayCost = 0, dayExport = 0, daySelfUse = 0, dayEvCost = 0, daySolarUsed = 0;
    evNeedKwh += EV_DAILY_KWH * EV_COUNT;

    for (let slot = 0; slot < 48; slot++) {
      const band = getBand(slot);
      const impRate = band === 'offpeak' ? FLUX.offPeakImp : band === 'peak' ? FLUX.peakImp : FLUX.dayImp;
      const expRate = band === 'offpeak' ? FLUX.offPeakExp : band === 'peak' ? FLUX.peakExp : FLUX.dayExp;

      // Solar
      const solarKwh = solar[slot] || 0;
      if (solarKwh > 0) {
        const headroom = maxKwh - stored;
        const solarIn = Math.min(solarKwh, headroom);
        stored += solarIn;
        daySolarUsed += solarIn;
      }

      // House self-use
      if (stored > minKwh + HOUSE_KWH_SLOT) {
        stored -= HOUSE_KWH_SLOT;
        daySelfUse += HOUSE_KWH_SLOT * impRate;
      }

      if (band === 'offpeak') {
        // Charge
        const headroom = maxKwh - stored;
        if (headroom > 0) {
          const eIn = Math.min(chargePerSlot * SYS.eff, headroom);
          dayCost += (eIn / SYS.eff) * impRate;
          stored += eIn;
        }
        if (evNeedKwh > 0) {
          const evCharge = Math.min(EV_CHARGE_KW * EV_COUNT * 0.5, evNeedKwh);
          dayEvCost += evCharge * impRate;
          evNeedKwh -= evCharge;
        }
      } else if (band === 'day') {
        // Flux day export is only 10.54p vs 17.90p import — not worth cycling
        // Could export solar surplus at 10.54p
        // Battery idle during day
      } else if (band === 'peak') {
        // Discharge — Flux peak export = 30.68p (same as import)
        const avail = stored - minKwh;
        if (avail > 0) {
          const expKwh = Math.min(dischargePerSlot, avail);
          dayExport += expKwh * expRate;
          stored -= expKwh;
        }
      }
    }

    days.push({
      date, stored: Math.round(stored),
      cost: Math.round(dayCost), export: Math.round(dayExport),
      selfUse: Math.round(daySelfUse), evCost: Math.round(dayEvCost),
      solarKwh: Math.round(daySolarUsed * 10) / 10,
      net: Math.round(dayExport + daySelfUse - dayCost - dayEvCost),
      socPct: Math.round(stored / SYS.cap * 100),
    });
  }
  return days;
}

function simulateAgile(dates, solarByDate, ratesByDate) {
  const maxKwh = SYS.cap * (SYS.maxSoc - 0.05); // 5% Agile reserve
  const minKwh = SYS.cap * SYS.minSoc;
  const chargePerSlot = Math.min(SYS.inverterKw, SYS.cap) * 0.5;
  const dischargePerSlot = Math.min(SYS.inverterKw, SYS.exportKw) * 0.5;

  let stored = minKwh;
  let evNeedKwh = 0;
  const days = [];

  for (const date of dates) {
    const solar = solarByDate[date] || new Array(48).fill(0);
    const impRates = ratesByDate[date]?.imp || new Array(48).fill(20);
    const expRates = ratesByDate[date]?.exp || new Array(48).fill(10);

    evNeedKwh += EV_DAILY_KWH * EV_COUNT;

    // Agile strategy: sort slots to find optimal charge/discharge
    // Charge on cheapest slots, discharge on most expensive
    const slotData = impRates.map((imp, i) => ({ i, imp, exp: expRates[i], solar: solar[i] || 0 }));

    // Determine actions
    const actions = new Array(48).fill('idle');

    // Always charge on negative/very cheap
    for (let i = 0; i < 48; i++) {
      if (impRates[i] < 3) actions[i] = 'charge';
    }

    // Greedy pairing for remaining
    const chargeCandidates = slotData.filter((s, i) => actions[i] === 'idle').sort((a, b) => a.imp - b.imp);
    const dischargeCandidates = slotData.filter((s, i) => actions[i] === 'idle').sort((a, b) => b.exp - a.exp);

    for (const ds of dischargeCandidates) {
      if (actions[ds.i] !== 'idle') continue;
      // Value = max(export, self-use at import rate for house share)
      const dischargeValue = Math.max(ds.exp, ds.imp * (HOUSE_KWH_SLOT / dischargePerSlot));

      const cs = chargeCandidates.find(c => actions[c.i] === 'idle' && c.i < ds.i);
      if (cs) {
        const chargeCost = cs.imp / SYS.eff;
        // Only trade if spread exceeds cycle degradation cost (~0.6p/kWh for 600kWh at £60K/8000 cycles)
        if (ds.exp - chargeCost > 0.6) {
          actions[cs.i] = 'charge';
          actions[ds.i] = 'discharge';
        }
      }
    }

    // Also discharge for self-use on expensive import slots
    for (let i = 0; i < 48; i++) {
      if (actions[i] === 'idle' && impRates[i] > 20) {
        actions[i] = 'discharge_selfuse';
      }
    }

    // SOC pass
    let dayCost = 0, dayExport = 0, daySelfUse = 0, dayEvSave = 0;
    let daySolarUsed = 0, negSlots = 0, chargeKwh = 0, dischargeKwh = 0;

    for (let i = 0; i < 48; i++) {
      const impR = impRates[i];
      const expR = expRates[i];
      if (impR <= 0) negSlots++;

      // Solar first
      if (solar[i] > 0) {
        const headroom = maxKwh - stored;
        const sIn = Math.min(solar[i], headroom);
        stored += sIn;
        daySolarUsed += sIn;
      }

      if (actions[i] === 'charge') {
        const headroom = maxKwh - stored;
        if (headroom > 0) {
          const eIn = Math.min(chargePerSlot * SYS.eff, headroom);
          const grid = eIn / SYS.eff;
          dayCost += grid * impR;
          stored += eIn;
          chargeKwh += eIn;
        }
        // Charge EVs on cheap slots too
        if (evNeedKwh > 0 && impR < 5) {
          const evChg = Math.min(EV_CHARGE_KW * EV_COUNT * 0.5, evNeedKwh);
          if (impR <= 0) dayEvSave += evChg * Math.abs(impR); // paid to charge EVs
          evNeedKwh -= evChg;
        }
      } else if (actions[i] === 'discharge' || actions[i] === 'discharge_selfuse') {
        const avail = stored - minKwh;
        if (avail <= 0) continue;

        // House self-use first
        const hKwh = Math.min(HOUSE_KWH_SLOT, avail);
        daySelfUse += hKwh * impR;
        stored -= hKwh;
        dischargeKwh += hKwh;

        if (actions[i] === 'discharge') {
          // Export surplus
          const remain = stored - minKwh;
          const expKwh = Math.min(dischargePerSlot, remain);
          if (expKwh > 0) {
            dayExport += expKwh * expR;
            stored -= expKwh;
            dischargeKwh += expKwh;
          }
        }
      }
    }

    // Charge EVs on remaining cheapest available slot if still needed
    if (evNeedKwh > 0) {
      const cheapest = Math.min(...impRates);
      const evChg = Math.min(evNeedKwh, EV_CHARGE_KW * EV_COUNT * 3); // 3 hours
      dayCost += evChg * cheapest;
      evNeedKwh = Math.max(0, evNeedKwh - evChg);
    }

    days.push({
      date, stored: Math.round(stored),
      cost: Math.round(dayCost), export: Math.round(dayExport),
      selfUse: Math.round(daySelfUse), evSave: Math.round(dayEvSave),
      solarKwh: Math.round(daySolarUsed * 10) / 10,
      net: Math.round(dayExport + daySelfUse + dayEvSave - dayCost),
      socPct: Math.round(stored / SYS.cap * 100),
      negSlots, chargeKwh: Math.round(chargeKwh), dischargeKwh: Math.round(dischargeKwh),
      cheapestImp: Math.round(Math.min(...impRates) * 100) / 100,
      peakImp: Math.round(Math.max(...impRates) * 100) / 100,
    });
  }
  return days;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
async function main() {
  console.log('Fetching October rates...');

  const impSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'import' AND valid_from >= '2025-10-01T00:00:00Z' AND valid_from < '2025-11-01T00:00:00Z' ORDER BY valid_from`;
  const expSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'export' AND valid_from >= '2025-10-01T00:00:00Z' AND valid_from < '2025-11-01T00:00:00Z' ORDER BY valid_from`;

  console.log(`  Import: ${impSlots.length} slots, Export: ${expSlots.length} slots`);

  // Group by date
  const ratesByDate = {};
  for (const s of impSlots) {
    const d = toUkDate(s.valid_from);
    if (!ratesByDate[d]) ratesByDate[d] = { imp: new Array(48).fill(20), exp: new Array(48).fill(10) };
    const idx = toUkSlot(s.valid_from);
    if (idx >= 0 && idx < 48) ratesByDate[d].imp[idx] = s.value_inc_vat;
  }
  for (const s of expSlots) {
    const d = toUkDate(s.valid_from);
    if (!ratesByDate[d]) ratesByDate[d] = { imp: new Array(48).fill(20), exp: new Array(48).fill(10) };
    const idx = toUkSlot(s.valid_from);
    if (idx >= 0 && idx < 48) ratesByDate[d].exp[idx] = s.value_inc_vat;
  }

  const dates = Object.keys(ratesByDate).filter(d => d.startsWith('2025-10')).sort();
  console.log(`  Valid October days: ${dates.length}`);

  // Solar for each day
  const solarByDate = {};
  for (const d of dates) solarByDate[d] = estimateSolar(getDayOfYear(d));

  // Run all three tariffs
  console.log('Running IOF...');
  const iofDays = simulateIof(dates, solarByDate);
  console.log('Running Flux...');
  const fluxDays = simulateFlux(dates, solarByDate);
  console.log('Running Agile...');
  const agileDays = simulateAgile(dates, solarByDate, ratesByDate);

  // Totals
  const iofTotal = iofDays.reduce((s, d) => s + d.net, 0);
  const fluxTotal = fluxDays.reduce((s, d) => s + d.net, 0);
  const agileTotal = agileDays.reduce((s, d) => s + d.net, 0);

  console.log(`\nOctober 2025 Results (600kWh system):`);
  console.log(`  IOF:   £${(iofTotal/100).toFixed(2)} (£${(iofTotal/100/dates.length).toFixed(2)}/day)`);
  console.log(`  Flux:  £${(fluxTotal/100).toFixed(2)} (£${(fluxTotal/100/dates.length).toFixed(2)}/day)`);
  console.log(`  Agile: £${(agileTotal/100).toFixed(2)} (£${(agileTotal/100/dates.length).toFixed(2)}/day)`);

  // Build HTML
  const mths = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dows = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>RoseStack \u2014 October 2025 Full Month Model</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px;max-width:1600px;margin:0 auto}
h1{color:#fff;font-size:24px;margin-bottom:4px}h2{color:#fff;font-size:18px;margin:28px 0 12px}
.sub{color:#888;font-size:13px;margin-bottom:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:28px}
.card{background:#1a1a2e;border-radius:10px;padding:16px;border:1px solid #2a2a4a}
.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.card .val{font-size:28px;font-weight:700;margin-top:2px}
.card .det{color:#666;font-size:11px;margin-top:4px}
.iof{color:#3b82f6}.flux{color:#a855f7}.agile{color:#10b981}
table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px;font-size:13px}
thead th{background:#12122a;color:#888;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0;white-space:nowrap}
thead th:first-child{text-align:left}
tbody td{padding:6px 10px;border-bottom:1px solid #1f1f3a;text-align:right;font-variant-numeric:tabular-nums}
tbody td:first-child{text-align:left;color:#ccc;font-weight:500}
tbody tr:hover{background:#1f1f3a}
.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}
canvas{width:100%!important}
.legend{display:flex;gap:16px;margin-top:8px;justify-content:center;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#888}
.legend-dot{width:10px;height:10px;border-radius:2px}
.winner{font-weight:700}.best-row{background:#10b98108}
.neg{color:#10b981}.pos{color:#ef4444}
.note{background:#1a1a2e;border-left:4px solid #f59e0b;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}
.note p{color:#ccc;font-size:12px;line-height:1.6}.note strong{color:#f59e0b}
.tariff-header{display:flex;gap:24px;margin-bottom:16px}
.tariff-header .th{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600}
.th-iof{background:#3b82f620;color:#3b82f6;border:1px solid #3b82f640}
.th-flux{background:#a855f720;color:#a855f7;border:1px solid #a855f740}
.th-agile{background:#10b98120;color:#10b981;border:1px solid #10b98140}
</style></head><body>

<h1>\u26A1 October 2025 \u2014 Full Month Tariff Model</h1>
<p class="sub">600kWh battery \u00B7 100kW inverter \u00B7 70kW G99 export \u00B7 20kWp solar \u00B7 2\u00D7EV \u00B7 24kWh/day household \u00B7 Start: empty (5% SOC)</p>

<div class="tariff-header">
  <div class="th th-iof">\u{1F50C} IOF: Import = Export parity (38.26p peak) \u00B7 20% reserve \u00B7 Kraken controls</div>
  <div class="th th-flux">\u{1F4A1} Flux: Off-peak 17.9p/5.1p \u00B7 Day 26.8p/10.5p \u00B7 Peak 30.7p/30.7p</div>
  <div class="th th-agile">\u{1F4C8} Agile: Real half-hourly rates from Octopus API</div>
</div>

<div class="cards">
  <div class="card"><div class="lbl">IOF October Total</div><div class="val iof">\u00A3${(iofTotal/100).toFixed(2)}</div><div class="det">\u00A3${(iofTotal/100/dates.length).toFixed(2)}/day avg \u00B7 ${dates.length} days</div></div>
  <div class="card"><div class="lbl">Flux October Total</div><div class="val flux">\u00A3${(fluxTotal/100).toFixed(2)}</div><div class="det">\u00A3${(fluxTotal/100/dates.length).toFixed(2)}/day avg</div></div>
  <div class="card"><div class="lbl">Agile October Total</div><div class="val agile">\u00A3${(agileTotal/100).toFixed(2)}</div><div class="det">\u00A3${(agileTotal/100/dates.length).toFixed(2)}/day avg</div></div>
  <div class="card"><div class="lbl">Best Tariff</div><div class="val" style="color:#f59e0b">${iofTotal >= fluxTotal && iofTotal >= agileTotal ? 'IOF' : fluxTotal >= agileTotal ? 'Flux' : 'Agile'}</div><div class="det">For October 2025</div></div>
  <div class="card"><div class="lbl">IOF Annualised</div><div class="val iof">\u00A3${(iofTotal/100/dates.length*365).toFixed(0)}</div><div class="det">If every month = October</div></div>
  <div class="card"><div class="lbl">Flux Annualised</div><div class="val flux">\u00A3${(fluxTotal/100/dates.length*365).toFixed(0)}</div><div class="det">If every month = October</div></div>
</div>

<h2>Daily Revenue Chart</h2>
<div class="chart-box">
  <canvas id="dailyChart" height="300"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>IOF</div>
    <div class="legend-item"><div class="legend-dot" style="background:#a855f7"></div>Flux</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Agile</div>
  </div>
</div>

<h2>SOC Tracker (Battery Level Through Month)</h2>
<div class="chart-box">
  <canvas id="socChart" height="200"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>IOF SOC%</div>
    <div class="legend-item"><div class="legend-dot" style="background:#a855f7"></div>Flux SOC%</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Agile SOC%</div>
  </div>
</div>

<h2>Cumulative P&L</h2>
<div class="chart-box">
  <canvas id="cumChart" height="250"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>IOF cumulative</div>
    <div class="legend-item"><div class="legend-dot" style="background:#a855f7"></div>Flux cumulative</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Agile cumulative</div>
  </div>
</div>

<h2>Daily Breakdown</h2>
<table>
<thead><tr>
  <th>Date</th><th>Day</th>
  <th style="color:#3b82f6">IOF Net</th><th style="color:#3b82f6">IOF SOC</th>
  <th style="color:#a855f7">Flux Net</th><th style="color:#a855f7">Flux SOC</th>
  <th style="color:#10b981">Agile Net</th><th style="color:#10b981">Agile SOC</th><th style="color:#10b981">Neg</th><th style="color:#10b981">Min Imp</th><th style="color:#10b981">Peak Imp</th>
  <th>Best</th><th>Solar</th>
</tr></thead>
<tbody>
${dates.map((d, idx) => {
  const iof = iofDays[idx];
  const flux = fluxDays[idx];
  const agile = agileDays[idx];
  const dow = dows[new Date(d + 'T12:00:00Z').getDay()];
  const best = iof.net >= flux.net && iof.net >= agile.net ? 'IOF' : flux.net >= agile.net ? 'Flux' : 'Agile';
  const bestClass = best === 'IOF' ? 'iof' : best === 'Flux' ? 'flux' : 'agile';
  return `<tr>
    <td>${d}</td><td>${dow}</td>
    <td class="iof">\u00A3${(iof.net/100).toFixed(2)}</td><td>${iof.socPct}%</td>
    <td class="flux">\u00A3${(flux.net/100).toFixed(2)}</td><td>${flux.socPct}%</td>
    <td class="agile">\u00A3${(agile.net/100).toFixed(2)}</td><td>${agile.socPct}%</td>
    <td>${agile.negSlots || 0}</td><td>${agile.cheapestImp || '-'}p</td><td>${agile.peakImp || '-'}p</td>
    <td class="${bestClass} winner">${best}</td><td>${agile.solarKwh}kWh</td>
  </tr>`;
}).join('\n')}
</tbody>
</table>

<div class="note">
<p><strong>Model assumptions:</strong> IOF: 20% SOC reserve, Kraken charges off-peak (02:00-05:00) and discharges peak (16:00-19:00) only, full utilisation.
Flux: 10% reserve, same charge/discharge windows but different import/export rates. Flux peak export = 30.68p (vs IOF 38.26p).
Agile: 5% reserve, greedy optimiser charges cheapest slots and discharges into best export + self-use, cycle degradation hurdle of 0.6p/kWh.
All tariffs: house self-use at 0.5kWh/slot (24kWh/day), 2 EVs at 15kWh/day each charged on cheapest available, 20kWp solar (October yield ~2.5kWh/kWp/day).</p>
</div>

<script>
const data = ${JSON.stringify(dates.map((d, i) => ({
  d: d.slice(5),
  iof: iofDays[i].net,
  flux: fluxDays[i].net,
  agile: agileDays[i].net,
  iofSoc: iofDays[i].socPct,
  fluxSoc: fluxDays[i].socPct,
  agileSoc: agileDays[i].socPct,
})))};

function drawChart(canvasId, getValue, opts = {}) {
  const c = document.getElementById(canvasId);
  const ctx = c.getContext('2d');
  const W = c.width = c.parentElement.clientWidth * 2;
  const H = c.height = opts.height || 600;
  const pad = {top:20,right:20,bottom:50,left:70};
  const pW = W-pad.left-pad.right, pH = H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);

  const allVals = data.flatMap(d => getValue(d));
  let maxV = Math.max(...allVals) * 1.1;
  let minV = opts.minZero ? 0 : Math.min(0, Math.min(...allVals) * 1.1);
  if (opts.maxV) maxV = opts.maxV;
  const range = maxV - minV || 1;
  const y = v => pad.top + pH - ((v-minV)/range)*pH;
  const x = i => pad.left + (i/(data.length-1))*pW;

  // Grid
  ctx.strokeStyle='#2a2a4a';ctx.lineWidth=1;
  const step = opts.step || Math.ceil((maxV-minV)/5/100)*100;
  for(let v=Math.ceil(minV/step)*step;v<=maxV;v+=step){
    ctx.beginPath();ctx.moveTo(pad.left,y(v));ctx.lineTo(W-pad.right,y(v));ctx.stroke();
    ctx.fillStyle='#666';ctx.font='20px system-ui';ctx.textAlign='right';
    ctx.fillText(opts.fmt?opts.fmt(v):(v/100).toFixed(0),pad.left-8,y(v)+6);
  }
  if(!opts.noZero){ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.left,y(0));ctx.lineTo(W-pad.right,y(0));ctx.stroke();}

  // Lines
  const colors = ['#3b82f6','#a855f7','#10b981'];
  const getters = [d=>[d.iof||0],d=>[d.flux||0],d=>[d.agile||0]];
  if(opts.getters) getters.splice(0,3,...opts.getters);

  getters.forEach((getter, ci) => {
    ctx.strokeStyle=colors[ci];ctx.lineWidth=3;ctx.beginPath();
    let cumulative = 0;
    data.forEach((d,i)=>{
      const vals = getter(d);
      const v = opts.cumulative ? (cumulative += vals[0]) : vals[0];
      i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v));
    });
    ctx.stroke();
  });

  // X labels
  ctx.fillStyle='#666';ctx.font='18px system-ui';ctx.textAlign='center';
  for(let i=0;i<data.length;i+=2)ctx.fillText(data[i].d,x(i),H-pad.bottom+25);
}

drawChart('dailyChart', d=>[d.iof,d.flux,d.agile], {step:1000});
drawChart('socChart', d=>[d.iofSoc,d.fluxSoc,d.agileSoc], {
  getters:[d=>[d.iofSoc],d=>[d.fluxSoc],d=>[d.agileSoc]],
  minZero:true, maxV:100, step:20, fmt:v=>v+'%', noZero:true, height:400
});
drawChart('cumChart', d=>[d.iof,d.flux,d.agile], {cumulative:true, step:5000, height:500});

window.addEventListener('resize',()=>{
  drawChart('dailyChart', d=>[d.iof,d.flux,d.agile], {step:1000});
  drawChart('socChart', d=>[d.iofSoc,d.fluxSoc,d.agileSoc], {
    getters:[d=>[d.iofSoc],d=>[d.fluxSoc],d=>[d.agileSoc]],
    minZero:true, maxV:100, step:20, fmt:v=>v+'%', noZero:true, height:400
  });
  drawChart('cumChart', d=>[d.iof,d.flux,d.agile], {cumulative:true, step:5000, height:500});
});
</script>
</body></html>`;

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/october-2025-model.html', html);
  console.log('\nWritten to output/october-2025-model.html');
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
