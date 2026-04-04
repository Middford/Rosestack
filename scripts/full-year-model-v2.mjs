// Full year model V2 — FIXED
// - IOF: full Kraken discharge (no per-slot haircut, 100% daily utilisation)
// - Agile: self-consumption offset at full import rate before grid export
// - Both: proper kWh tracking

import postgres from 'postgres';
import { writeFileSync } from 'fs';

const DB = 'postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway';
const sql = postgres(DB, { ssl: 'require' });

const bat = { cap: 322, chargeKw: 76.8, dischargeKw: 66, eff: 0.93, minSoc: 0.05 };
const houseKwhPerSlot = 0.5; // ~24kWh/day

// Solar model
function estimateSolar(dayOfYear, kwp) {
  if (kwp <= 0) return new Array(48).fill(0);
  const seasonal = Math.max(0, Math.sin((dayOfYear - 80) * (Math.PI / 185)));
  const daily = kwp * 4.8 * seasonal;
  if (daily <= 0) return new Array(48).fill(0);
  const slots = new Array(48).fill(0);
  let total = 0;
  for (let i = 0; i < 48; i++) {
    const dist = Math.abs(i - 26);
    if (dist <= 10) { slots[i] = Math.exp(-0.5 * (dist / 5) ** 2); total += slots[i]; }
  }
  const max = kwp * 0.85 * 0.5;
  return slots.map(v => Math.min((total > 0 ? daily / total : 0) * v, max));
}

function getDayOfYear(d) {
  const dt = new Date(d + 'T12:00:00Z');
  return Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 864e5);
}

function toUkDate(iso) {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  return `${p.find(x => x.type === 'year').value}-${p.find(x => x.type === 'month').value}-${p.find(x => x.type === 'day').value}`;
}

function toUkSlot(iso) {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  return parseInt(p.find(x => x.type === 'hour').value) * 2 + (parseInt(p.find(x => x.type === 'minute').value) >= 30 ? 1 : 0);
}

// ═══════════════════════════════════════════
// AGILE DISPATCH — with self-consumption
// ═══════════════════════════════════════════
function dispatchAgile(impRates, expRates, solarKwh) {
  const maxSocKwh = bat.cap * 0.93; // 5% reserve
  const minKwh = bat.minSoc * bat.cap;
  const maxChargeSlot = bat.chargeKw * 0.5;
  const maxDischargeSlot = Math.min(bat.dischargeKw, 66) * 0.5;

  // Build slot actions
  const actions = new Array(48).fill('idle');

  // Sort by import rate for charging decisions
  const importSorted = impRates.map((r, i) => ({ i, r })).sort((a, b) => a.r - b.r);
  const exportSorted = expRates.map((r, i) => ({ i, r })).sort((a, b) => b.r - a.r);

  // Cheap/negative slots → charge
  for (const s of importSorted) {
    if (s.r < 5) actions[s.i] = 'charge';
  }

  // Expensive export slots → discharge (but only if we have profitable spread)
  // On Agile the VALUE is self-consumption at import rate, not just export
  // So discharge whenever import rate is high enough to justify it
  for (const s of exportSorted) {
    if (actions[s.i] !== 'idle') continue;
    // Value of discharging = max(export rate, import rate saved by self-use)
    // The house will consume 0.5kWh at the import rate, rest exported
    const valuePerKwh = (houseKwhPerSlot * impRates[s.i] + (maxDischargeSlot - houseKwhPerSlot) * expRates[s.i]) / maxDischargeSlot;
    // Find cheapest available charge slot
    const cheapest = importSorted.find(c => actions[c.i] === 'idle' && c.i < s.i);
    if (cheapest && valuePerKwh - (cheapest.r / bat.eff) > 0) {
      actions[cheapest.i] = 'charge';
      actions[s.i] = 'discharge';
    }
  }

  // Any slot not assigned that has high import rate → discharge for self-use even without export
  for (let i = 0; i < 48; i++) {
    if (actions[i] === 'idle' && impRates[i] > 15) {
      actions[i] = 'discharge'; // at least offset house consumption
    }
  }

  // SOC pass
  let stored = minKwh;
  let importCost = 0, exportRev = 0, selfUseVal = 0, selfUseKwh = 0;
  let chargeKwh = 0, dischargeKwh = 0, negSlots = 0, profitExportSlots = 0;

  for (let i = 0; i < 48; i++) {
    if (impRates[i] <= 0) negSlots++;

    if (actions[i] === 'charge') {
      const headroom = maxSocKwh - stored;
      if (headroom <= 0) continue;
      const eIn = Math.min(maxChargeSlot * bat.eff, headroom);
      const grid = eIn / bat.eff;
      importCost += grid * impRates[i]; // negative import = earned
      stored += eIn;
      chargeKwh += eIn;
    } else if (actions[i] === 'discharge') {
      const avail = stored - minKwh;
      if (avail <= 0) continue;

      // Self-use first (house consumption at import rate)
      const hKwh = Math.min(houseKwhPerSlot, avail);
      selfUseVal += hKwh * impRates[i]; // saved at full import rate
      selfUseKwh += hKwh;
      stored -= hKwh;

      // Export surplus
      const remain = stored - minKwh;
      const expKwh = Math.min(maxDischargeSlot, remain);
      if (expKwh > 0) {
        exportRev += expKwh * expRates[i];
        stored -= expKwh;
        dischargeKwh += expKwh;
        if (expRates[i] > 5) profitExportSlots++;
      }
      dischargeKwh += hKwh;
    }
  }

  return {
    netPence: Math.round(exportRev - importCost + selfUseVal),
    importCostPence: Math.round(importCost),
    exportRevPence: Math.round(exportRev),
    selfUseValPence: Math.round(selfUseVal),
    selfUseKwh: Math.round(selfUseKwh * 10) / 10,
    chargeKwh: Math.round(chargeKwh),
    dischargeKwh: Math.round(dischargeKwh),
    negSlots,
    profitExportSlots: profitExportSlots,
    cheapestImport: Math.round(Math.min(...impRates) * 100) / 100,
    peakImport: Math.round(Math.max(...impRates) * 100) / 100,
    peakExport: Math.round(Math.max(...expRates) * 100) / 100,
  };
}

// ═══════════════════════════════════════════
// IOF DISPATCH — full Kraken utilisation
// ═══════════════════════════════════════════
function dispatchIof() {
  const iofMaxSocKwh = bat.cap * 0.78; // 20% reserve
  const minKwh = bat.minSoc * bat.cap;
  const maxChargeSlot = bat.chargeKw * 0.5;
  const maxDischargeSlot = Math.min(bat.dischargeKw, 66) * 0.5;

  // Charge: 02:00-05:00 (slots 4-9) at 16.40p
  let stored = minKwh;
  let chargeCost = 0;
  for (let i = 4; i < 10; i++) {
    const headroom = iofMaxSocKwh - stored;
    if (headroom <= 0) break;
    const eIn = Math.min(maxChargeSlot * bat.eff, headroom);
    chargeCost += (eIn / bat.eff) * 16.40;
    stored += eIn;
  }
  const charged = stored - minKwh;

  // Discharge: 16:00-19:00 (slots 32-37) at 38.26p — FULL utilisation
  let exportRev = 0, discharged = 0, selfUseVal = 0, selfUseKwh = 0;
  for (let i = 32; i < 38; i++) {
    const avail = stored - minKwh;
    if (avail <= 0) break;

    // House self-use at peak IOF rate
    const hKwh = Math.min(houseKwhPerSlot, avail);
    selfUseVal += hKwh * 38.26;
    selfUseKwh += hKwh;
    stored -= hKwh;

    // Export at full rate
    const remain = stored - minKwh;
    const expKwh = Math.min(maxDischargeSlot, remain);
    exportRev += expKwh * 38.26;
    stored -= expKwh;
    discharged += expKwh + hKwh;
  }

  return {
    netPence: Math.round(exportRev - chargeCost + selfUseVal),
    chargeCostPence: Math.round(chargeCost),
    exportRevPence: Math.round(exportRev),
    selfUseValPence: Math.round(selfUseVal),
    selfUseKwh: Math.round(selfUseKwh * 10) / 10,
    chargedKwh: Math.round(charged),
    dischargedKwh: Math.round(discharged),
  };
}

async function main() {
  console.log('Fetching rates...');
  const impSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'import' ORDER BY valid_from`;
  const expSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'export' ORDER BY valid_from`;

  const impByDate = new Map();
  for (const s of impSlots) { const d = toUkDate(s.valid_from); if (!impByDate.has(d)) impByDate.set(d, []); impByDate.get(d).push(s); }
  const expByDate = new Map();
  for (const s of expSlots) { const d = toUkDate(s.valid_from); if (!expByDate.has(d)) expByDate.set(d, []); expByDate.get(d).push(s); }

  const dates = [...impByDate.keys()].filter(d => impByDate.get(d).length >= 40 && expByDate.has(d)).sort();
  console.log(`${dates.length} valid days. Running...`);

  // IOF is same every day (fixed rates)
  const iofDaily = dispatchIof();
  console.log(`IOF daily (fixed): £${(iofDaily.netPence/100).toFixed(2)} (charge £${(iofDaily.chargeCostPence/100).toFixed(2)}, export £${(iofDaily.exportRevPence/100).toFixed(2)}, self-use £${(iofDaily.selfUseValPence/100).toFixed(2)})`);
  console.log(`IOF annual: £${(iofDaily.netPence/100*365).toFixed(0)}`);

  const results = [];
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const date of dates) {
    const impArr = new Array(48).fill(20);
    const expArr = new Array(48).fill(10);
    for (const s of impByDate.get(date)) { const idx = toUkSlot(s.valid_from); if (idx >= 0 && idx < 48) impArr[idx] = s.value_inc_vat; }
    for (const s of expByDate.get(date)) { const idx = toUkSlot(s.valid_from); if (idx >= 0 && idx < 48) expArr[idx] = s.value_inc_vat; }

    const solar = estimateSolar(getDayOfYear(date), 25);
    const agile = dispatchAgile(impArr, expArr, solar);

    const winner = agile.netPence > iofDaily.netPence ? 'agile' : 'iof';
    results.push({
      date, month: parseInt(date.slice(5, 7)), year: parseInt(date.slice(0, 4)),
      agile, iof: iofDaily, winner,
      delta: agile.netPence - iofDaily.netPence,
    });
  }

  // Monthly aggregation
  const monthlyMap = {};
  for (let m = 1; m <= 12; m++) monthlyMap[m] = [];
  for (const r of results) monthlyMap[r.month].push(r);

  const monthlyData = [];
  for (let m = 1; m <= 12; m++) {
    const days = monthlyMap[m];
    if (days.length === 0) continue;
    const agileAvg = days.reduce((s, r) => s + r.agile.netPence, 0) / days.length;
    const iofAvg = iofDaily.netPence; // same every day
    const best = Math.max(agileAvg, iofAvg);
    monthlyData.push({
      month: m, label: monthNames[m], days: days.length,
      agileAvg: Math.round(agileAvg), iofAvg: Math.round(iofAvg),
      agileGbp: (agileAvg / 100).toFixed(2), iofGbp: (iofAvg / 100).toFixed(2),
      bestGbp: (best / 100).toFixed(2), winner: agileAvg > iofAvg ? 'Agile' : 'IOF',
      delta: Math.round(agileAvg - iofAvg),
      avgNegSlots: (days.reduce((s, r) => s + r.agile.negSlots, 0) / days.length).toFixed(1),
      avgSelfUse: (days.reduce((s, r) => s + r.agile.selfUseValPence, 0) / days.length / 100).toFixed(2),
    });
  }

  const totalAgile = results.reduce((s, r) => s + r.agile.netPence, 0);
  const totalIof = iofDaily.netPence * results.length;
  const agileWinDays = results.filter(r => r.winner === 'agile').length;
  const iofWinDays = results.filter(r => r.winner === 'iof').length;

  let switchTotal = 0;
  const switchCal = {};
  for (const md of monthlyData) {
    const best = Math.max(md.agileAvg, md.iofAvg);
    switchCal[md.month] = md.winner;
    switchTotal += best * [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][md.month];
  }

  const sorted = [...results].sort((a, b) => b.agile.netPence - a.agile.netPence);

  console.log(`\nResults:`);
  console.log(`  Agile annual: £${(totalAgile / results.length * 365 / 100).toFixed(0)}`);
  console.log(`  IOF annual: £${(iofDaily.netPence / 100 * 365).toFixed(0)}`);
  console.log(`  Switching: £${(switchTotal / 100).toFixed(0)}`);
  console.log(`  Agile wins: ${agileWinDays} days (${(agileWinDays/results.length*100).toFixed(0)}%)`);

  // Generate HTML (same template as V1 but with corrected data)
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>RoseStack — Full Year Tariff Model V2 — RS-300</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px}
h1{color:#fff;font-size:24px;margin-bottom:4px}h2{color:#fff;font-size:18px;margin:32px 0 16px}.sub{color:#888;font-size:13px;margin-bottom:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:32px}
.card{background:#1a1a2e;border-radius:10px;padding:14px;border:1px solid #2a2a4a}
.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}.card .val{color:#fff;font-size:26px;font-weight:700;margin-top:2px}
.card .det{color:#666;font-size:11px;margin-top:2px}.card.green .val{color:#10b981}.card.red .val{color:#ef4444}.card.amber .val{color:#f59e0b}.card.blue .val{color:#3b82f6}
table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px}
thead th{background:#12122a;color:#888;font-size:11px;text-transform:uppercase;padding:10px 12px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0}
thead th:first-child{text-align:left}tbody td{padding:8px 12px;border-bottom:1px solid #1f1f3a;font-size:13px;text-align:right;font-variant-numeric:tabular-nums}
tbody td:first-child{text-align:left;color:#ccc;font-weight:500}tbody tr:hover{background:#1f1f3a}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.tag-agile{background:#10b98120;color:#10b981}.tag-iof{background:#3b82f620;color:#3b82f6}
.neg{color:#10b981}.pos{color:#ef4444}.win{background:#10b98110}
.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}
canvas{width:100%!important}.legend{display:flex;gap:20px;margin-top:8px;justify-content:center}
.legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#888}.legend-dot{width:10px;height:10px;border-radius:2px}
.scroll-table{max-height:600px;overflow-y:auto;border-radius:10px}
.note{background:#1a1a2e;border-left:4px solid #f59e0b;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}
.note p{color:#ccc;font-size:12px;line-height:1.6}.note strong{color:#f59e0b}
.switch-cal{display:flex;gap:4px;margin:16px 0}
.switch-cal .mo{flex:1;padding:10px 4px;border-radius:6px;text-align:center;font-size:12px;font-weight:600}
.switch-cal .mo.agile{background:#10b98130;color:#10b981}.switch-cal .mo.iof{background:#3b82f630;color:#3b82f6}
.switch-cal .mo .mlbl{font-size:10px;color:#888;display:block;margin-bottom:2px}
</style></head><body>

<h1>⚡ RoseStack Full Year Tariff Model V2</h1>
<p class="sub">RS-300 (322kWh, 66kW export, 25kWp solar) · ${results.length} days · IOF at FULL Kraken utilisation · Self-consumption offset included · Region N (ENWL)</p>

<div class="cards">
  <div class="card green"><div class="lbl">Agile Annual</div><div class="val">£${(totalAgile / results.length * 365 / 100).toFixed(0)}</div><div class="det">£${(totalAgile / results.length / 100).toFixed(2)}/day · inc. self-use</div></div>
  <div class="card blue"><div class="lbl">IOF Annual</div><div class="val">£${(iofDaily.netPence / 100 * 365).toFixed(0)}</div><div class="det">£${(iofDaily.netPence / 100).toFixed(2)}/day fixed</div></div>
  <div class="card amber"><div class="lbl">Optimal Switching</div><div class="val">£${(switchTotal / 100).toFixed(0)}</div><div class="det">Best tariff each month</div></div>
  <div class="card"><div class="lbl">Agile Wins</div><div class="val">${agileWinDays} days</div><div class="det">${(agileWinDays/results.length*100).toFixed(0)}% of all days</div></div>
  <div class="card"><div class="lbl">IOF Wins</div><div class="val">${iofWinDays} days</div><div class="det">${(iofWinDays/results.length*100).toFixed(0)}% of all days</div></div>
  <div class="card"><div class="lbl">IOF Daily Breakdown</div><div class="val">£${(iofDaily.netPence/100).toFixed(2)}</div><div class="det">Charge £${(iofDaily.chargeCostPence/100).toFixed(2)} · Export £${(iofDaily.exportRevPence/100).toFixed(2)} · Self £${(iofDaily.selfUseValPence/100).toFixed(2)}</div></div>
</div>

<h2>Optimal Monthly Switching Calendar</h2>
<div class="switch-cal">
${monthlyData.map(m => `  <div class="mo ${m.winner.toLowerCase()}"><span class="mlbl">${m.label}</span>${m.winner}<br>£${m.bestGbp}/d</div>`).join('\n')}
</div>

<h2>Monthly Comparison</h2>
<table>
<thead><tr><th>Month</th><th>Days</th><th>Agile avg/day</th><th>IOF daily</th><th>Delta</th><th>Winner</th><th>Neg slots/day</th><th>Agile self-use/day</th></tr></thead>
<tbody>
${monthlyData.map(m => {
  const dc = m.delta > 0 ? 'neg' : 'pos';
  return `<tr><td>${m.label}</td><td>${m.days}</td><td>£${m.agileGbp}</td><td>£${m.iofGbp}</td><td class="${dc}">${m.delta > 0 ? '+' : ''}£${(m.delta/100).toFixed(2)}</td><td><span class="tag tag-${m.winner.toLowerCase()}">${m.winner}</span></td><td>${m.avgNegSlots}</td><td>£${m.avgSelfUse}</td></tr>`;
}).join('\n')}
</tbody>
</table>

<h2>Daily Revenue Timeline</h2>
<div class="chart-box">
  <canvas id="dailyChart" height="250"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Agile daily (inc. self-use)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>IOF daily (fixed £${(iofDaily.netPence/100).toFixed(2)})</div>
  </div>
</div>

<h2>Best 10 Days (Agile)</h2>
<table>
<thead><tr><th>Date</th><th>Agile</th><th>IOF</th><th>Winner</th><th>Self-use</th><th>Export</th><th>Charge cost</th><th>Neg slots</th></tr></thead>
<tbody>
${sorted.slice(0, 10).map(r => `<tr><td>${r.date}</td><td class="neg">£${(r.agile.netPence/100).toFixed(2)}</td><td>£${(r.iof.netPence/100).toFixed(2)}</td><td><span class="tag tag-${r.winner}">${r.winner.toUpperCase()}</span></td><td>£${(r.agile.selfUseValPence/100).toFixed(2)}</td><td>£${(r.agile.exportRevPence/100).toFixed(2)}</td><td>£${(r.agile.importCostPence/100).toFixed(2)}</td><td>${r.agile.negSlots}</td></tr>`).join('\n')}
</tbody>
</table>

<h2>All ${results.length} Days</h2>
<div class="scroll-table">
<table>
<thead><tr><th>Date</th><th>Agile</th><th>IOF</th><th>Delta</th><th>Winner</th><th>Self-use</th><th>Export</th><th>Neg</th><th>Min imp</th><th>Peak imp</th></tr></thead>
<tbody>
${results.map(r => {
  const dc = r.delta > 0 ? 'neg' : 'pos';
  return `<tr${r.winner==='agile'?' class="win"':''}><td>${r.date}</td><td>£${(r.agile.netPence/100).toFixed(2)}</td><td>£${(r.iof.netPence/100).toFixed(2)}</td><td class="${dc}">${r.delta>0?'+':''}£${(r.delta/100).toFixed(2)}</td><td><span class="tag tag-${r.winner}">${r.winner.toUpperCase()}</span></td><td>£${(r.agile.selfUseValPence/100).toFixed(2)}</td><td>£${(r.agile.exportRevPence/100).toFixed(2)}</td><td>${r.agile.negSlots}</td><td>${r.agile.cheapestImport}p</td><td>${r.agile.peakImport}p</td></tr>`;
}).join('\n')}
</tbody>
</table>
</div>

<div class="note">
<p><strong>V2 Changes:</strong> IOF now models full Kraken discharge (no 70% haircut). Agile now includes self-consumption offset — battery powers the house at full import rate (0.5kWh/slot) before exporting surplus at Agile Outgoing rate. This dramatically improves Agile's daily value on high-import-rate days. IOF charges ${iofDaily.chargedKwh}kWh and discharges ${iofDaily.dischargedKwh}kWh daily at 38.26p export parity.</p>
</div>

<script>
const dailyData = ${JSON.stringify(results.map(r => ({ d: r.date, a: r.agile.netPence, i: r.iof.netPence })))};
const dc = document.getElementById('dailyChart');
const ctx = dc.getContext('2d');
function draw() {
  const W = dc.width = dc.parentElement.clientWidth * 2;
  const H = dc.height = 500;
  const pad = {top:20,right:20,bottom:40,left:70};
  const pW = W-pad.left-pad.right, pH = H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  const maxV = Math.max(...dailyData.map(d=>Math.max(d.a,d.i)))*1.1;
  const minV = Math.min(0,Math.min(...dailyData.map(d=>Math.min(d.a,d.i)))*1.1);
  const range = maxV-minV;
  const y=v=>pad.top+pH-((v-minV)/range)*pH;
  const x=i=>pad.left+(i/(dailyData.length-1))*pW;
  ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.left,y(0));ctx.lineTo(W-pad.right,y(0));ctx.stroke();
  // IOF line (flat)
  ctx.strokeStyle='#3b82f660';ctx.lineWidth=3;ctx.setLineDash([8,4]);
  ctx.beginPath();ctx.moveTo(x(0),y(dailyData[0].i));ctx.lineTo(x(dailyData.length-1),y(dailyData[0].i));ctx.stroke();
  ctx.setLineDash([]);
  // Agile line
  ctx.strokeStyle='#10b981';ctx.lineWidth=2;ctx.beginPath();
  dailyData.forEach((d,i)=>{i===0?ctx.moveTo(x(i),y(d.a)):ctx.lineTo(x(i),y(d.a))});ctx.stroke();
  // Labels
  ctx.fillStyle='#666';ctx.font='18px system-ui';ctx.textAlign='center';
  for(let i=0;i<dailyData.length;i+=Math.floor(dailyData.length/12))ctx.fillText(dailyData[i].d.slice(0,7),x(i),H-pad.bottom+25);
  ctx.textAlign='right';
  for(let v=0;v<=maxV;v+=2000){ctx.fillText('£'+(v/100).toFixed(0),pad.left-8,y(v)+6)}
}
draw();window.addEventListener('resize',draw);
</script>
</body></html>`;

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/full-year-model-v2.html', html);
  console.log('Written to output/full-year-model-v2.html');
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
