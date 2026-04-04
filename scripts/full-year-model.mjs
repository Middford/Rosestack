// Full year model — every day, Agile vs IOF, with Kraken utilisation haircut
// Outputs JSON for the HTML dashboard

import postgres from 'postgres';
import { writeFileSync } from 'fs';

const DB = 'postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway';
const sql = postgres(DB, { ssl: 'require' });

// System
const bat = { cap: 322, chargeKw: 76.8, dischargeKw: 66, eff: 0.93, minSoc: 0.05 };
const evTotalKwh = 96; // 2 × 48kWh added per charge
const evChargerKw = 44; // 2 × 22kW
const houseKwhPerSlot = 0.5;
const KRAKEN_UTILISATION = 0.70; // Real-world IOF discharge utilisation

// IOF fixed rates
const IOF = { offPeak: 16.40, day: 27.33, peak: 38.26 };

// Solar model
function estimateSolar(dayOfYear, kwp) {
  if (kwp <= 0) return new Array(48).fill(0);
  const seasonal = Math.max(0, Math.sin((dayOfYear - 80) * (Math.PI / 185)));
  const dailyKwh = kwp * 4.8 * seasonal;
  if (dailyKwh <= 0) return new Array(48).fill(0);
  const slots = new Array(48).fill(0);
  const peak = 26, spread = 10;
  let total = 0;
  for (let i = 0; i < 48; i++) {
    const dist = Math.abs(i - peak);
    if (dist <= spread) { slots[i] = Math.exp(-0.5 * (dist / (spread * 0.5)) ** 2); total += slots[i]; }
  }
  const maxSlot = kwp * 0.85 * 0.5;
  return slots.map(v => Math.min((total > 0 ? dailyKwh / total : 0) * v, maxSlot));
}

function getDayOfYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / (1000 * 60 * 60 * 24));
}

// UK timezone helpers
function toUkDate(isoUtc) {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = fmt.formatToParts(d);
  return `${p.find(x => x.type === 'year').value}-${p.find(x => x.type === 'month').value}-${p.find(x => x.type === 'day').value}`;
}
function toUkSlot(isoUtc) {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = fmt.formatToParts(d);
  return parseInt(p.find(x => x.type === 'hour').value) * 2 + (parseInt(p.find(x => x.type === 'minute').value) >= 30 ? 1 : 0);
}

// Agile dispatch
function dispatchAgile(impRates, expRates, solarKwh) {
  const maxSoc = bat.cap * (bat.maxSoc || 0.93);
  const minKwh = bat.minSoc * bat.cap;
  const maxChargeSlot = bat.chargeKw * 0.5;
  const maxDischargeSlot = Math.min(bat.dischargeKw, 66) * 0.5;

  // Sort slots by import rate for charging, export rate for discharging
  const slots = impRates.map((imp, i) => ({ i, imp, exp: expRates[i], solar: solarKwh?.[i] || 0 }));

  // Determine actions: charge on cheapest, discharge on most expensive
  const actions = new Array(48).fill('idle');

  // Negative/very cheap = always charge
  for (const s of slots) {
    if (s.imp < 2) actions[s.i] = 'charge';
  }

  // Greedy pairing for remaining
  const chargePool = slots.filter((s, i) => actions[i] === 'idle').sort((a, b) => a.imp - b.imp);
  const dischPool = slots.filter((s, i) => actions[i] === 'idle').sort((a, b) => b.exp - a.exp);
  for (const cs of chargePool) {
    for (const ds of dischPool) {
      if (cs.i >= ds.i || actions[cs.i] !== 'idle' || actions[ds.i] !== 'idle') continue;
      if (ds.exp - (cs.imp / bat.eff) > 0) {
        actions[cs.i] = 'charge';
        actions[ds.i] = 'discharge';
        break;
      }
    }
  }

  // SOC pass
  let stored = minKwh;
  let importCost = 0, exportRev = 0, selfUseVal = 0, selfUseKwh = 0;
  let chargeKwh = 0, dischargeKwh = 0, negSlots = 0, profitSlots = 0;

  for (let i = 0; i < 48; i++) {
    if (impRates[i] <= 0) negSlots++;

    if (actions[i] === 'charge') {
      const headroom = maxSoc - stored;
      const eIn = Math.min(maxChargeSlot * bat.eff, headroom);
      const grid = eIn / bat.eff;
      const cost = grid * impRates[i];
      importCost += cost;
      stored += eIn;
      chargeKwh += eIn;
    } else if (actions[i] === 'discharge') {
      // Self-use first
      const avail = stored - minKwh;
      const houseKwh = Math.min(houseKwhPerSlot, avail);
      selfUseVal += houseKwh * impRates[i];
      selfUseKwh += houseKwh;
      stored -= houseKwh;

      // Export surplus
      const remain = stored - minKwh;
      const expKwh = Math.min(maxDischargeSlot, remain);
      exportRev += expKwh * expRates[i];
      stored -= expKwh;
      dischargeKwh += expKwh + houseKwh;
      if (expRates[i] > 5) profitSlots++;
    }
  }

  // EV value: charge during negative slots
  const evChargeCost = negSlots > 0 ? 0 : evTotalKwh * Math.min(...impRates.filter(r => r < 10));
  const cheapestImp = Math.min(...impRates);
  const evEarned = cheapestImp < 0 ? evTotalKwh * Math.abs(cheapestImp) * 0.3 : 0; // rough estimate

  const netPence = exportRev - importCost + selfUseVal;

  return {
    netPence: Math.round(netPence),
    importCostPence: Math.round(importCost),
    exportRevPence: Math.round(exportRev),
    selfUseValPence: Math.round(selfUseVal),
    selfUseKwh: Math.round(selfUseKwh * 10) / 10,
    chargeKwh: Math.round(chargeKwh),
    dischargeKwh: Math.round(dischargeKwh),
    negSlots,
    profitSlots,
    cheapestImport: Math.round(Math.min(...impRates) * 100) / 100,
    peakImport: Math.round(Math.max(...impRates) * 100) / 100,
    peakExport: Math.round(Math.max(...expRates) * 100) / 100,
  };
}

// IOF dispatch
function dispatchIof(solarKwh) {
  const iofMaxSoc = bat.cap * 0.78; // 20% reserve
  const minKwh = bat.minSoc * bat.cap;
  const maxChargeSlot = bat.chargeKw * 0.5;
  const maxDischargeSlot = Math.min(bat.dischargeKw, 66) * 0.5;

  // Charge: slots 4-9 (02:00-05:00) at 16.40p
  let stored = minKwh;
  let chargeCost = 0, chargeKwh = 0;
  for (let i = 4; i < 10; i++) {
    const headroom = iofMaxSoc - stored;
    const eIn = Math.min(maxChargeSlot * bat.eff, headroom);
    const grid = eIn / bat.eff;
    chargeCost += grid * IOF.offPeak;
    stored += eIn;
    chargeKwh += eIn;
  }

  // Discharge: slots 32-37 (16:00-19:00) at 38.26p — with Kraken utilisation
  let exportRev = 0, dischargeKwh = 0, selfUseVal = 0, selfUseKwh = 0;
  for (let i = 32; i < 38; i++) {
    const avail = stored - minKwh;

    // House self-use at peak rate
    const hKwh = Math.min(houseKwhPerSlot, avail);
    selfUseVal += hKwh * IOF.peak;
    selfUseKwh += hKwh;
    stored -= hKwh;

    // Export with Kraken utilisation haircut
    const remain = stored - minKwh;
    const expKwh = Math.min(maxDischargeSlot * KRAKEN_UTILISATION, remain);
    exportRev += expKwh * IOF.peak;
    stored -= expKwh;
    dischargeKwh += expKwh + hKwh;
  }

  // EV on IOF: off-peak at 16.40p
  const evCost = evTotalKwh * IOF.offPeak;

  const netPence = exportRev - chargeCost + selfUseVal;

  return {
    netPence: Math.round(netPence),
    chargeCostPence: Math.round(chargeCost),
    exportRevPence: Math.round(exportRev),
    selfUseValPence: Math.round(selfUseVal),
    selfUseKwh: Math.round(selfUseKwh * 10) / 10,
    chargeKwh: Math.round(chargeKwh),
    dischargeKwh: Math.round(dischargeKwh),
    evCostPence: Math.round(evCost),
  };
}

async function main() {
  console.log('Fetching rates from DB...');
  const impSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'import' ORDER BY valid_from`;
  const expSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'export' ORDER BY valid_from`;
  console.log(`  Import: ${impSlots.length} slots, Export: ${expSlots.length} slots`);

  // Group by date
  const impByDate = new Map();
  for (const s of impSlots) {
    const d = toUkDate(s.valid_from);
    if (!impByDate.has(d)) impByDate.set(d, []);
    impByDate.get(d).push(s);
  }
  const expByDate = new Map();
  for (const s of expSlots) {
    const d = toUkDate(s.valid_from);
    if (!expByDate.has(d)) expByDate.set(d, []);
    expByDate.get(d).push(s);
  }

  const dates = [...impByDate.keys()]
    .filter(d => impByDate.get(d).length >= 40 && expByDate.has(d))
    .sort();

  console.log(`  Valid days: ${dates.length}`);
  console.log('Running dispatch for every day...');

  const results = [];

  for (const date of dates) {
    const impArr = new Array(48).fill(20);
    const expArr = new Array(48).fill(10);
    for (const s of impByDate.get(date)) { const idx = toUkSlot(s.valid_from); if (idx >= 0 && idx < 48) impArr[idx] = s.value_inc_vat; }
    for (const s of expByDate.get(date)) { const idx = toUkSlot(s.valid_from); if (idx >= 0 && idx < 48) expArr[idx] = s.value_inc_vat; }

    const doy = getDayOfYear(date);
    const solar = estimateSolar(doy, 25);

    const agile = dispatchAgile(impArr, expArr, solar);
    const iof = dispatchIof(solar);

    const winner = agile.netPence > iof.netPence ? 'agile' : 'iof';
    const month = parseInt(date.slice(5, 7));
    const year = parseInt(date.slice(0, 4));

    results.push({
      date, month, year, doy,
      agile, iof, winner,
      delta: agile.netPence - iof.netPence,
    });
  }

  console.log(`Processed ${results.length} days. Generating HTML...`);

  // Write JSON for HTML
  writeFileSync(
    'C:/Users/dmidd/AppData/Local/Temp/rosestack/output/model-data.json',
    JSON.stringify(results, null, 0)
  );

  // Generate HTML
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Monthly aggregation
  const monthly = {};
  for (let m = 1; m <= 12; m++) monthly[m] = { agile: [], iof: [], days: 0 };
  for (const r of results) {
    monthly[r.month].agile.push(r.agile.netPence);
    monthly[r.month].iof.push(r.iof.netPence);
    monthly[r.month].days++;
  }

  const monthlyData = [];
  for (let m = 1; m <= 12; m++) {
    const a = monthly[m].agile;
    const i = monthly[m].iof;
    if (a.length === 0) continue;
    const agileAvg = a.reduce((s, v) => s + v, 0) / a.length;
    const iofAvg = i.reduce((s, v) => s + v, 0) / i.length;
    const best = Math.max(agileAvg, iofAvg);
    monthlyData.push({
      month: m, label: monthNames[m], days: a.length,
      agileAvg: Math.round(agileAvg), iofAvg: Math.round(iofAvg),
      agileGbp: (agileAvg / 100).toFixed(2), iofGbp: (iofAvg / 100).toFixed(2),
      bestGbp: (best / 100).toFixed(2),
      winner: agileAvg > iofAvg ? 'Agile' : 'IOF',
      delta: Math.round(agileAvg - iofAvg),
    });
  }

  // Annual
  const totalAgile = results.reduce((s, r) => s + r.agile.netPence, 0);
  const totalIof = results.reduce((s, r) => s + r.iof.netPence, 0);
  const agileWinDays = results.filter(r => r.winner === 'agile').length;
  const iofWinDays = results.filter(r => r.winner === 'iof').length;

  // Optimal switching
  let switchingTotal = 0;
  const switchCal = {};
  for (const md of monthlyData) {
    const best = Math.max(md.agileAvg, md.iofAvg);
    switchCal[md.month] = md.winner;
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][md.month];
    switchingTotal += best * daysInMonth;
  }

  // Best/worst days
  const sorted = [...results].sort((a, b) => b.agile.netPence - a.agile.netPence);
  const best5 = sorted.slice(0, 5);
  const worst5 = sorted.slice(-5).reverse();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RoseStack — Full Year Tariff Model — RS-300</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',system-ui,sans-serif; background:#0f0f1a; color:#e0e0e0; padding:24px; }
h1 { color:#fff; font-size:24px; margin-bottom:4px; }
h2 { color:#fff; font-size:18px; margin:32px 0 16px; }
.sub { color:#888; font-size:13px; margin-bottom:24px; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:32px; }
.card { background:#1a1a2e; border-radius:10px; padding:14px; border:1px solid #2a2a4a; }
.card .lbl { color:#888; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
.card .val { color:#fff; font-size:26px; font-weight:700; margin-top:2px; }
.card .det { color:#666; font-size:11px; margin-top:2px; }
.card.green .val { color:#10b981; }
.card.red .val { color:#ef4444; }
.card.amber .val { color:#f59e0b; }
.card.blue .val { color:#3b82f6; }
table { width:100%; border-collapse:collapse; background:#1a1a2e; border-radius:10px; overflow:hidden; margin-bottom:24px; }
thead th { background:#12122a; color:#888; font-size:11px; text-transform:uppercase; padding:10px 12px; text-align:right; border-bottom:2px solid #2a2a4a; position:sticky; top:0; }
thead th:first-child { text-align:left; }
tbody td { padding:8px 12px; border-bottom:1px solid #1f1f3a; font-size:13px; text-align:right; font-variant-numeric:tabular-nums; }
tbody td:first-child { text-align:left; color:#ccc; font-weight:500; }
tbody tr:hover { background:#1f1f3a; }
.tag { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; }
.tag-agile { background:#10b98120; color:#10b981; }
.tag-iof { background:#3b82f620; color:#3b82f6; }
.neg { color:#10b981; }
.pos { color:#ef4444; }
.win { background:#10b98110; }
.chart-box { background:#1a1a2e; border-radius:10px; padding:20px; border:1px solid #2a2a4a; margin-bottom:24px; }
canvas { width:100%!important; }
.legend { display:flex; gap:20px; margin-top:8px; justify-content:center; }
.legend-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#888; }
.legend-dot { width:10px; height:10px; border-radius:2px; }
.scroll-table { max-height:600px; overflow-y:auto; border-radius:10px; }
.note { background:#1a1a2e; border-left:4px solid #f59e0b; padding:14px; border-radius:0 8px 8px 0; margin:24px 0; }
.note p { color:#ccc; font-size:12px; line-height:1.6; }
.note strong { color:#f59e0b; }
.switch-cal { display:flex; gap:4px; margin:16px 0; }
.switch-cal .mo { flex:1; padding:10px 4px; border-radius:6px; text-align:center; font-size:12px; font-weight:600; }
.switch-cal .mo.agile { background:#10b98130; color:#10b981; }
.switch-cal .mo.iof { background:#3b82f630; color:#3b82f6; }
.switch-cal .mo .mlbl { font-size:10px; color:#888; display:block; margin-bottom:2px; }
</style>
</head>
<body>

<h1>⚡ RoseStack Full Year Tariff Model</h1>
<p class="sub">RS-300 (322kWh, 66kW export, 25kWp solar, 2×EV) · ${results.length} days analysed · IOF at 70% Kraken utilisation · Region N (ENWL)</p>

<div class="cards">
  <div class="card green"><div class="lbl">Agile Annual</div><div class="val">£${(totalAgile / results.length * 365 / 100).toFixed(0)}</div><div class="det">£${(totalAgile / results.length / 100).toFixed(2)}/day avg</div></div>
  <div class="card blue"><div class="lbl">IOF Annual</div><div class="val">£${(totalIof / results.length * 365 / 100).toFixed(0)}</div><div class="det">£${(totalIof / results.length / 100).toFixed(2)}/day avg</div></div>
  <div class="card amber"><div class="lbl">Optimal Switching</div><div class="val">£${(switchingTotal / 100).toFixed(0)}</div><div class="det">Best tariff each month</div></div>
  <div class="card"><div class="lbl">Agile Win Days</div><div class="val">${agileWinDays}</div><div class="det">${(agileWinDays/results.length*100).toFixed(0)}% of days</div></div>
  <div class="card"><div class="lbl">IOF Win Days</div><div class="val">${iofWinDays}</div><div class="det">${(iofWinDays/results.length*100).toFixed(0)}% of days</div></div>
  <div class="card"><div class="lbl">Days Analysed</div><div class="val">${results.length}</div><div class="det">${results[0].date} → ${results[results.length-1].date}</div></div>
</div>

<h2>Optimal Monthly Switching Calendar</h2>
<div class="switch-cal">
${monthlyData.map(m => `  <div class="mo ${m.winner.toLowerCase()}"><span class="mlbl">${m.label}</span>${m.winner}<br>£${m.bestGbp}/d</div>`).join('\n')}
</div>

<h2>Monthly Comparison</h2>
<div class="chart-box">
  <canvas id="monthlyChart" height="300"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Agile</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>IOF (70% Kraken)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Winner</div>
  </div>
</div>

<table>
<thead><tr><th>Month</th><th>Days</th><th>Agile avg/day</th><th>IOF avg/day</th><th>Delta</th><th>Winner</th><th>Best £/month</th></tr></thead>
<tbody>
${monthlyData.map(m => {
  const deltaClass = m.delta > 0 ? 'neg' : 'pos';
  const daysInMonth = [0,31,28,31,30,31,30,31,31,30,31,30,31][m.month];
  const bestMonthly = (Math.max(m.agileAvg, m.iofAvg) * daysInMonth / 100).toFixed(0);
  return `<tr><td>${m.label}</td><td>${m.days}</td><td>£${m.agileGbp}</td><td>£${m.iofGbp}</td><td class="${deltaClass}">${m.delta > 0 ? '+' : ''}${(m.delta/100).toFixed(2)}</td><td><span class="tag tag-${m.winner.toLowerCase()}">${m.winner}</span></td><td>£${bestMonthly}</td></tr>`;
}).join('\n')}
</tbody>
</table>

<h2>Daily Revenue Timeline</h2>
<div class="chart-box">
  <canvas id="dailyChart" height="250"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Agile daily</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>IOF daily</div>
  </div>
</div>

<h2>Best 5 Days (Agile)</h2>
<table>
<thead><tr><th>Date</th><th>Agile</th><th>IOF</th><th>Winner</th><th>Neg slots</th><th>Cheapest imp</th><th>Peak imp</th></tr></thead>
<tbody>
${best5.map(r => `<tr><td>${r.date}</td><td class="neg">£${(r.agile.netPence/100).toFixed(2)}</td><td>£${(r.iof.netPence/100).toFixed(2)}</td><td><span class="tag tag-${r.winner}">${r.winner.toUpperCase()}</span></td><td>${r.agile.negSlots}</td><td>${r.agile.cheapestImport}p</td><td>${r.agile.peakImport}p</td></tr>`).join('\n')}
</tbody>
</table>

<h2>Worst 5 Days (Agile)</h2>
<table>
<thead><tr><th>Date</th><th>Agile</th><th>IOF</th><th>Winner</th><th>Neg slots</th><th>Cheapest imp</th><th>Peak imp</th></tr></thead>
<tbody>
${worst5.map(r => `<tr><td>${r.date}</td><td class="pos">£${(r.agile.netPence/100).toFixed(2)}</td><td>£${(r.iof.netPence/100).toFixed(2)}</td><td><span class="tag tag-${r.winner}">${r.winner.toUpperCase()}</span></td><td>${r.agile.negSlots}</td><td>${r.agile.cheapestImport}p</td><td>${r.agile.peakImport}p</td></tr>`).join('\n')}
</tbody>
</table>

<h2>All ${results.length} Days</h2>
<div class="scroll-table">
<table>
<thead><tr><th>Date</th><th>Agile</th><th>IOF</th><th>Delta</th><th>Winner</th><th>Neg slots</th><th>Min imp</th><th>Peak imp</th><th>Peak exp</th></tr></thead>
<tbody>
${results.map(r => {
  const d = r.delta;
  const dc = d > 0 ? 'neg' : 'pos';
  return `<tr${r.winner === 'agile' ? ' class="win"' : ''}><td>${r.date}</td><td>£${(r.agile.netPence/100).toFixed(2)}</td><td>£${(r.iof.netPence/100).toFixed(2)}</td><td class="${dc}">${d > 0 ? '+' : ''}${(d/100).toFixed(2)}</td><td><span class="tag tag-${r.winner}">${r.winner.toUpperCase()}</span></td><td>${r.agile.negSlots}</td><td>${r.agile.cheapestImport}p</td><td>${r.agile.peakImport}p</td><td>${r.agile.peakExport}p</td></tr>`;
}).join('\n')}
</tbody>
</table>
</div>

<div class="note">
<p><strong>Methodology:</strong> Agile uses actual half-hourly import (AGILE-24-10-01) and export (AGILE-OUTGOING-19-05-13) rates from the Octopus API.
IOF uses fixed bands (off-peak 16.40p, day 27.33p, peak 38.26p) with import=export parity. IOF discharge is haircut to 70% of max capacity to reflect
real-world Kraken fleet utilisation. Battery: 322kWh Fogstar, 76.8kW charge, 66kW G99 export, 93% round-trip efficiency, 5% reserve (Agile) / 20% reserve (IOF).
Solar: 25kWp south-facing, Lancashire latitude sinusoidal model. EVs not included in daily figures (add ~£24/day on Agile neg days, ~£8/day on IOF).</p>
</div>

<script>
const monthlyData = ${JSON.stringify(monthlyData)};
const dailyData = ${JSON.stringify(results.map(r => ({ date: r.date, agile: r.agile.netPence, iof: r.iof.netPence })))};

// Monthly bar chart
const mc = document.getElementById('monthlyChart');
const mctx = mc.getContext('2d');
function drawMonthly() {
  const W = mc.width = mc.parentElement.clientWidth * 2;
  const H = mc.height = 600;
  const pad = { top:30, right:30, bottom:50, left:70 };
  const pW = W-pad.left-pad.right;
  const pH = H-pad.top-pad.bottom;
  mctx.clearRect(0,0,W,H);

  const vals = monthlyData.flatMap(m => [m.agileAvg, m.iofAvg]);
  const maxV = Math.max(...vals) * 1.1;
  const minV = Math.min(0, Math.min(...vals) * 1.1);
  const range = maxV - minV;

  const y = v => pad.top + pH - ((v - minV) / range) * pH;
  const barW = pW / monthlyData.length;

  // Grid
  mctx.strokeStyle = '#2a2a4a'; mctx.lineWidth = 1;
  for (let v = 0; v <= maxV; v += 500) {
    mctx.beginPath(); mctx.moveTo(pad.left, y(v)); mctx.lineTo(W-pad.right, y(v)); mctx.stroke();
    mctx.fillStyle='#666'; mctx.font='20px system-ui'; mctx.textAlign='right';
    mctx.fillText('£'+(v/100).toFixed(0), pad.left-8, y(v)+6);
  }

  // Zero line
  mctx.strokeStyle='#555'; mctx.lineWidth=2;
  mctx.beginPath(); mctx.moveTo(pad.left, y(0)); mctx.lineTo(W-pad.right, y(0)); mctx.stroke();

  monthlyData.forEach((m, i) => {
    const x = pad.left + i * barW;
    const bw = barW * 0.35;
    // Agile bar
    mctx.fillStyle = '#10b981';
    const ah = Math.abs(y(0) - y(m.agileAvg));
    mctx.fillRect(x + barW*0.1, m.agileAvg >= 0 ? y(m.agileAvg) : y(0), bw, ah);
    // IOF bar
    mctx.fillStyle = '#3b82f6';
    const ih = Math.abs(y(0) - y(m.iofAvg));
    mctx.fillRect(x + barW*0.1 + bw + 4, m.iofAvg >= 0 ? y(m.iofAvg) : y(0), bw, ih);
    // Winner dot
    const best = Math.max(m.agileAvg, m.iofAvg);
    mctx.fillStyle = '#f59e0b';
    mctx.beginPath(); mctx.arc(x + barW*0.5, y(best) - 12, 5, 0, Math.PI*2); mctx.fill();
    // Label
    mctx.fillStyle='#888'; mctx.font='20px system-ui'; mctx.textAlign='center';
    mctx.fillText(m.label, x + barW*0.5, H - pad.bottom + 30);
  });
}
drawMonthly();

// Daily line chart
const dc = document.getElementById('dailyChart');
const dctx = dc.getContext('2d');
function drawDaily() {
  const W = dc.width = dc.parentElement.clientWidth * 2;
  const H = dc.height = 500;
  const pad = { top:20, right:20, bottom:40, left:70 };
  const pW = W-pad.left-pad.right;
  const pH = H-pad.top-pad.bottom;
  dctx.clearRect(0,0,W,H);

  const maxV = Math.max(...dailyData.map(d => Math.max(d.agile, d.iof))) * 1.1;
  const minV = Math.min(0, Math.min(...dailyData.map(d => Math.min(d.agile, d.iof))) * 1.1);
  const range = maxV - minV;
  const y = v => pad.top + pH - ((v - minV) / range) * pH;
  const x = i => pad.left + (i / (dailyData.length-1)) * pW;

  // Zero line
  dctx.strokeStyle='#555'; dctx.lineWidth=1;
  dctx.beginPath(); dctx.moveTo(pad.left, y(0)); dctx.lineTo(W-pad.right, y(0)); dctx.stroke();

  // IOF line
  dctx.strokeStyle='#3b82f640'; dctx.lineWidth=2;
  dctx.beginPath();
  dailyData.forEach((d, i) => { i === 0 ? dctx.moveTo(x(i), y(d.iof)) : dctx.lineTo(x(i), y(d.iof)); });
  dctx.stroke();

  // Agile line
  dctx.strokeStyle='#10b981'; dctx.lineWidth=2;
  dctx.beginPath();
  dailyData.forEach((d, i) => { i === 0 ? dctx.moveTo(x(i), y(d.agile)) : dctx.lineTo(x(i), y(d.agile)); });
  dctx.stroke();

  // X labels
  dctx.fillStyle='#666'; dctx.font='18px system-ui'; dctx.textAlign='center';
  for (let i = 0; i < dailyData.length; i += Math.floor(dailyData.length/12)) {
    dctx.fillText(dailyData[i].date.slice(0,7), x(i), H-pad.bottom+25);
  }

  // Y labels
  dctx.textAlign='right';
  for (let v = 0; v <= maxV; v += 1000) {
    dctx.fillText('£'+(v/100).toFixed(0), pad.left-8, y(v)+6);
  }
}
drawDaily();
window.addEventListener('resize', () => { drawMonthly(); drawDaily(); });
</script>
</body>
</html>`;

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/full-year-model.html', html);
  console.log('Done! Written to output/full-year-model.html');

  // Print summary
  console.log(`\nAnnual (annualised from ${results.length} days):`);
  console.log(`  Agile: £${(totalAgile / results.length * 365 / 100).toFixed(0)}/yr`);
  console.log(`  IOF:   £${(totalIof / results.length * 365 / 100).toFixed(0)}/yr`);
  console.log(`  Switch: £${(switchingTotal / 100).toFixed(0)}/yr`);
  console.log(`  Agile wins ${agileWinDays} days (${(agileWinDays/results.length*100).toFixed(0)}%)`);
  console.log(`  IOF wins ${iofWinDays} days (${(iofWinDays/results.length*100).toFixed(0)}%)`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
