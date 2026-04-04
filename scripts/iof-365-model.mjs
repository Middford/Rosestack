// IOF 365-day model
// Assumption: Kraken optimises perfectly — always arrives at 16:00 with max charge
// Discharge: full 70kW export for 3 hours (16:00-19:00) every single day
// Plus house self-use during peak at 38.26p
// Charge cost varies by season (solar offsets off-peak charging)
//
// System: 600kWh, 100kW inverter, 70kW export, 25kWp solar, 93% eff
// IOF rates: off-peak 16.40p, day 27.33p, peak 38.26p (import = export)
// Reserve: discharge stops at 20% SOC (120kWh)

import { writeFileSync, readFileSync } from 'fs';

// ═══════════════════════════════════════════
// SYSTEM
// ═══════════════════════════════════════════
const CAP = 600;
const EXPORT_KW = 70;
const EFF = 0.93;
const DISCHARGE_FLOOR = CAP * 0.20; // 120 kWh — IOF 20% reserve
const MAX_DISCHARGE = CAP - DISCHARGE_FLOOR; // 480 kWh available

// Peak window: 16:00-19:00 = 3 hours = 6 slots
const PEAK_SLOTS = 6;
const DISCHARGE_PER_SLOT = EXPORT_KW * 0.5; // 35 kWh per slot
const MAX_PEAK_EXPORT = PEAK_SLOTS * DISCHARGE_PER_SLOT; // 210 kWh in 3 hours

// House consumption during peak (3hrs)
const HOUSE_PEAK_KWH = 1.5 * PEAK_SLOTS; // 1.5kWh/slot during peak = 9kWh

// IOF rates
const OFFPEAK = 16.40;
const DAY = 27.33;
const PEAK = 38.26;

// ═══════════════════════════════════════════
// SOLAR MODEL (25kWp, Lancashire)
// ═══════════════════════════════════════════
// Monthly solar generation kWh/day for 25kWp
const SOLAR_DAILY = [
  0, 12, 22, 42, 62, 80, 88, 82, 68, 50, 30, 15, 9
]; // index 1-12

// How much solar lands between 05:00-16:00 (available to offset charging)
// In summer ~90% of generation is in this window, winter ~95% (shorter days)
const SOLAR_DAY_PCT = 0.92;

// ═══════════════════════════════════════════
// HOUSEHOLD DEMAND (05:00-16:00, 11 hours)
// ═══════════════════════════════════════════
// kWh consumed during day window (house + heat pump, NOT EVs, NOT peak)
const DAY_DEMAND = [
  0, 30, 28, 20, 18, 14, 12, 12, 14, 18, 20, 28, 32
]; // includes heat pump in winter

// EV charging kWh needed per day (2 EVs)
const EV_DAILY = 30;

// ═══════════════════════════════════════════
// MODEL EACH DAY
// ═══════════════════════════════════════════

function getMonth(dayOfYear) {
  const cumDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let m = 1; m <= 12; m++) {
    if (dayOfYear <= cumDays[m]) return m;
  }
  return 12;
}

function getDate(dayOfYear) {
  const d = new Date(2025, 0, dayOfYear);
  return d.toISOString().slice(0, 10);
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const days = [];
const monthlyTotals = {};
for (let m = 1; m <= 12; m++) monthlyTotals[m] = { days: 0, revenue: 0, chargeCost: 0, exportRev: 0, selfUse: 0, evCost: 0, solarUsed: 0 };

for (let doy = 1; doy <= 365; doy++) {
  const month = getMonth(doy);
  const date = getDate(doy);
  const dow = DOW_NAMES[new Date(2025, 0, doy).getDay()];

  const solarTotal = SOLAR_DAILY[month];
  const solarDaytime = solarTotal * SOLAR_DAY_PCT;
  const dayDemand = DAY_DEMAND[month];

  // ── STEP 1: What needs charging to reach 100% by 16:00? ──
  // After overnight charge (off-peak), daytime solar adds and demand subtracts.
  // We need battery = 600 kWh at 16:00.
  //
  // Working backwards from 16:00:
  //   Battery at 16:00 = 600 (target)
  //   During day (05:00-16:00): solar adds, house drains
  //   Net daytime battery change = solar_to_battery - house_draw_from_battery
  //
  // Solar first powers the house directly. Surplus goes to battery.
  // If solar < house demand, battery tops up the house.

  const solarToHouse = Math.min(solarDaytime, dayDemand);
  const solarToBattery = Math.max(0, solarDaytime - dayDemand);
  const houseFromBattery = Math.max(0, dayDemand - solarDaytime);

  const netDaytimeBatteryChange = solarToBattery - houseFromBattery;

  // Battery SOC needed at 05:00 (start of day) to reach 600 by 16:00
  const batteryNeededAt0500 = CAP - netDaytimeBatteryChange;

  // ── STEP 2: How much off-peak charging? ──
  // EVs also charge off-peak
  // Assume battery starts each day at DISCHARGE_FLOOR (120kWh) after previous day's export

  const batteryAt0200 = DISCHARGE_FLOOR; // post-previous-peak discharge
  const offpeakChargeNeeded = Math.max(0, batteryNeededAt0500 - batteryAt0200);

  // Off-peak can deliver: 100kW × 3hrs × 0.93 = 279kWh stored
  const offpeakMaxStored = 100 * 3 * EFF; // 279 kWh
  const offpeakCharged = Math.min(offpeakChargeNeeded, offpeakMaxStored);
  const offpeakGrid = offpeakCharged / EFF;
  const offpeakCost = offpeakGrid * OFFPEAK;

  // EV charging during off-peak
  const evOffpeak = Math.min(EV_DAILY, (100 * 3) - offpeakGrid); // remaining inverter capacity
  const evCost = evOffpeak * OFFPEAK;

  // ── STEP 3: Any remaining charge needed from day rate? ──
  const batteryAfterOffpeak = batteryAt0200 + offpeakCharged;
  const stillNeeded = Math.max(0, batteryNeededAt0500 - batteryAfterOffpeak);

  // Day-rate top-up (if solar couldn't cover everything)
  let dayChargeCost = 0;
  if (stillNeeded > 0) {
    const dayGrid = stillNeeded / EFF;
    dayChargeCost = dayGrid * DAY;
  }

  // ── STEP 4: Battery at 16:00 ──
  // Target is 600, but might not reach it in winter if demand is huge
  const batteryAt1600 = Math.min(CAP, batteryAfterOffpeak + netDaytimeBatteryChange + stillNeeded);

  // ── STEP 5: DISCHARGE 16:00-19:00 ──
  const availableForExport = Math.max(0, batteryAt1600 - DISCHARGE_FLOOR);
  const actualExport = Math.min(availableForExport, MAX_PEAK_EXPORT); // capped by 70kW × 3hrs = 210kWh
  const peakSelfUse = Math.min(HOUSE_PEAK_KWH, availableForExport - actualExport + HOUSE_PEAK_KWH);
  const actualPeakSelfUse = Math.min(peakSelfUse, availableForExport);

  const exportRevenue = actualExport * PEAK;
  const selfUseValue = actualPeakSelfUse * PEAK;

  // ── STEP 6: NET ──
  const totalChargeCost = offpeakCost + dayChargeCost;
  const net = exportRevenue + selfUseValue - totalChargeCost - evCost;

  days.push({
    doy, date, dow, month,
    solarTotal, solarToBattery: Math.round(solarToBattery * 10) / 10,
    houseFromBattery: Math.round(houseFromBattery * 10) / 10,
    offpeakCharged: Math.round(offpeakCharged), offpeakCost: Math.round(offpeakCost),
    dayChargeCost: Math.round(dayChargeCost),
    totalChargeCost: Math.round(totalChargeCost),
    batteryAt1600: Math.round(batteryAt1600),
    availableForExport: Math.round(availableForExport),
    actualExport: Math.round(actualExport),
    exportRevenue: Math.round(exportRevenue),
    selfUseValue: Math.round(selfUseValue),
    evCost: Math.round(evCost),
    net: Math.round(net),
  });

  monthlyTotals[month].days++;
  monthlyTotals[month].revenue += net;
  monthlyTotals[month].chargeCost += totalChargeCost;
  monthlyTotals[month].exportRev += exportRevenue;
  monthlyTotals[month].selfUse += selfUseValue;
  monthlyTotals[month].evCost += evCost;
  monthlyTotals[month].solarUsed += solarToBattery;
}

// ═══════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════

const annualNet = days.reduce((s, d) => s + d.net, 0);
const annualExport = days.reduce((s, d) => s + d.exportRevenue, 0);
const annualCharge = days.reduce((s, d) => s + d.totalChargeCost, 0);
const annualSelfUse = days.reduce((s, d) => s + d.selfUseValue, 0);
const annualEvCost = days.reduce((s, d) => s + d.evCost, 0);

console.log('IOF 365-DAY MODEL — 600kWh SYSTEM');
console.log('Goal: arrive at 16:00 fully charged, discharge 70kW for 3 hours, every day');
console.log('');

// Monthly summary
console.log('MONTHLY SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════════════════════════');
console.log('Month  Days  Charge Cost   Export Rev   Self-Use   EV Cost   Net Revenue   Daily Avg   Solar→Bat');
console.log('─────  ────  ───────────   ──────────   ────────   ───────   ───────────   ─────────   ─────────');

for (let m = 1; m <= 12; m++) {
  const t = monthlyTotals[m];
  console.log(
    MONTH_NAMES[m].padEnd(7) +
    String(t.days).padStart(3) + '   ' +
    ('£' + (t.chargeCost/100).toFixed(2)).padStart(10) + '   ' +
    ('£' + (t.exportRev/100).toFixed(2)).padStart(10) + '   ' +
    ('£' + (t.selfUse/100).toFixed(2)).padStart(8) + '   ' +
    ('£' + (t.evCost/100).toFixed(2)).padStart(7) + '   ' +
    ('£' + (t.revenue/100).toFixed(2)).padStart(11) + '   ' +
    ('£' + (t.revenue/100/t.days).toFixed(2)).padStart(8) + '   ' +
    (t.solarUsed.toFixed(0) + 'kWh').padStart(8)
  );
}

console.log('─────  ────  ───────────   ──────────   ────────   ───────   ───────────   ─────────   ─────────');
console.log(
  'TOTAL  365   ' +
  ('£' + (annualCharge/100).toFixed(2)).padStart(10) + '   ' +
  ('£' + (annualExport/100).toFixed(2)).padStart(10) + '   ' +
  ('£' + (annualSelfUse/100).toFixed(2)).padStart(8) + '   ' +
  ('£' + (annualEvCost/100).toFixed(2)).padStart(7) + '   ' +
  ('£' + (annualNet/100).toFixed(2)).padStart(11) + '   ' +
  ('£' + (annualNet/100/365).toFixed(2)).padStart(8)
);

console.log('');
console.log('ANNUAL P&L:');
console.log('  Export revenue (210kWh/day × 38.26p):  £' + (annualExport/100).toFixed(2));
console.log('  Self-use value (9kWh/day × 38.26p):    £' + (annualSelfUse/100).toFixed(2));
console.log('  Charge cost (off-peak + day top-up):   -£' + (annualCharge/100).toFixed(2));
console.log('  EV charging (30kWh/day off-peak):      -£' + (annualEvCost/100).toFixed(2));
console.log('  ─────────────────────────────────────────────────');
console.log('  NET ANNUAL REVENUE:                    £' + (annualNet/100).toFixed(2));

// ═══════════════════════════════════════════
// HTML
// ═══════════════════════════════════════════

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>RoseStack \u2014 IOF 365-Day Model</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px;max-width:1400px;margin:0 auto}
h1{color:#fff;font-size:24px;margin-bottom:4px}h2{color:#fff;font-size:18px;margin:28px 0 12px}
.sub{color:#888;font-size:13px;margin-bottom:24px;line-height:1.6}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px}
.card{background:#1a1a2e;border-radius:10px;padding:16px;border:1px solid #2a2a4a}
.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.card .val{font-size:28px;font-weight:700;margin-top:2px;color:#3b82f6}
.card .det{color:#666;font-size:11px;margin-top:4px}
.card.green .val{color:#10b981}.card.amber .val{color:#f59e0b}
table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px;font-size:12px}
thead th{background:#12122a;color:#888;font-size:10px;text-transform:uppercase;padding:8px 8px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0;white-space:nowrap}
thead th:first-child,thead th:nth-child(2),thead th:nth-child(3){text-align:left}
tbody td{padding:5px 8px;border-bottom:1px solid #1f1f3a;text-align:right;font-variant-numeric:tabular-nums}
tbody td:first-child,tbody td:nth-child(2),tbody td:nth-child(3){text-align:left}
tbody tr:hover{background:#1f1f3a}
.month-header td{background:#12122a;color:#3b82f6;font-weight:700;font-size:13px;padding:10px 8px}
.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}
canvas{width:100%!important}
.legend{display:flex;gap:16px;margin-top:8px;justify-content:center;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#888}
.legend-dot{width:10px;height:10px;border-radius:2px}
.note{background:#1a1a2e;border-left:4px solid #3b82f6;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}
.note p{color:#ccc;font-size:12px;line-height:1.6}.note strong{color:#3b82f6}
.scroll-table{max-height:800px;overflow-y:auto;border-radius:10px}
</style></head><body>

<h1>\u{1F50C} IOF 365-Day Revenue Model</h1>
<p class="sub">600kWh battery \u00B7 100kW inverter \u00B7 70kW G99 export \u00B7 25kWp solar \u00B7 2\u00D7EV (30kWh/day) \u00B7 House + heat pump<br>
Strategy: Kraken optimises to arrive at 16:00 fully charged. Discharge 70kW \u00D7 3hrs = 210kWh every day at 38.26p. House runs off battery 24/7.</p>

<div class="cards">
  <div class="card"><div class="lbl">Annual Revenue</div><div class="val">\u00A3${(annualNet/100).toFixed(0)}</div><div class="det">\u00A3${(annualNet/100/365).toFixed(2)}/day average</div></div>
  <div class="card"><div class="lbl">Export Revenue</div><div class="val">\u00A3${(annualExport/100).toFixed(0)}</div><div class="det">210kWh/day \u00D7 38.26p</div></div>
  <div class="card"><div class="lbl">Charge Cost</div><div class="val" style="color:#ef4444">\u00A3${(annualCharge/100).toFixed(0)}</div><div class="det">Off-peak + day top-up</div></div>
  <div class="card green"><div class="lbl">Self-Use Saved</div><div class="val">\u00A3${(annualSelfUse/100).toFixed(0)}</div><div class="det">House during peak at 38.26p</div></div>
  <div class="card"><div class="lbl">EV Cost</div><div class="val" style="color:#ef4444">\u00A3${(annualEvCost/100).toFixed(0)}</div><div class="det">30kWh/day at off-peak 16.40p</div></div>
  <div class="card amber"><div class="lbl">Daily Export</div><div class="val">210kWh</div><div class="det">70kW \u00D7 3hrs, every day, guaranteed</div></div>
</div>

<h2>Monthly Revenue</h2>
<div class="chart-box">
  <canvas id="monthlyChart" height="300"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Export revenue</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Self-use value</div>
    <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Charge + EV cost</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Net revenue</div>
  </div>
</div>

<h2>Monthly Summary</h2>
<table>
<thead><tr><th>Month</th><th>Days</th><th>Charge Cost</th><th>Export Rev</th><th>Self-Use</th><th>EV Cost</th><th>Net Revenue</th><th>Daily Avg</th><th>Solar\u2192Bat</th></tr></thead>
<tbody>
${Object.entries(monthlyTotals).map(([m, t]) => `<tr>
  <td>${MONTH_NAMES[m]}</td><td>${t.days}</td>
  <td style="color:#ef4444">\u00A3${(t.chargeCost/100).toFixed(2)}</td>
  <td>\u00A3${(t.exportRev/100).toFixed(2)}</td>
  <td style="color:#10b981">\u00A3${(t.selfUse/100).toFixed(2)}</td>
  <td style="color:#ef4444">\u00A3${(t.evCost/100).toFixed(2)}</td>
  <td style="color:#3b82f6;font-weight:700">\u00A3${(t.revenue/100).toFixed(2)}</td>
  <td>\u00A3${(t.revenue/100/t.days).toFixed(2)}</td>
  <td>${t.solarUsed.toFixed(0)}kWh</td>
</tr>`).join('\n')}
</tbody>
</table>

<h2>Daily Chart</h2>
<div class="chart-box">
  <canvas id="dailyChart" height="250"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Daily net revenue</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b50;border:1px solid #f59e0b"></div>Summer (solar offsets charging)</div>
  </div>
</div>

<h2>All 365 Days</h2>
<div class="scroll-table">
<table>
<thead><tr><th>Date</th><th>Day</th><th>Month</th><th>Off-pk Chg</th><th>Day Top-up</th><th>Solar\u2192Bat</th><th>House\u2190Bat</th><th>Bat@16:00</th><th>Export</th><th>Self-Use</th><th>EV Cost</th><th>Net</th></tr></thead>
<tbody>
DAILY_TABLE_ROWS
</tbody>
</table>
</div>

<div class="note">
<p><strong>Assumptions:</strong> Kraken optimises charging to minimise cost while ensuring battery reaches 100% by 16:00.
In summer, off-peak charging is reduced because solar fills the gap for free. In winter, off-peak charging is maxed out
and day-rate top-up may be needed when house+HP demand exceeds solar. Export is always 210kWh (70kW \u00D7 3hrs) at 38.26p.
House self-use during peak saves 38.26p per kWh. EVs charge 30kWh/day at off-peak 16.40p.
Discharge floor: 20% SOC (120kWh). Battery cycles daily between ~20% and 100%.</p>
</div>

SCRIPT_PLACEHOLDER
</body></html>`;

  // Build script with data injected, reading chart code from external file
  const chartJs = readFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/scripts/iof-chart.js', 'utf8');
  const monthDataJson = JSON.stringify(Object.entries(monthlyTotals).map(([m, t]) => ({
    label: MONTH_NAMES[m], exportRev: t.exportRev, selfUse: t.selfUse,
    cost: t.chargeCost + t.evCost, net: t.revenue,
  })));
  const dailyDataJson = JSON.stringify(days.map(d => ({ d: d.date.slice(5), net: d.net, month: d.month })));
  const scriptTag = '<script>\nvar monthData = ' + monthDataJson + ';\nvar dailyData = ' + dailyDataJson + ';\n' + chartJs + '\n</script>';

  // Build daily table rows
  const dailyRows = days.map(function(d, i) {
    const showHeader = i === 0 || d.month !== days[i-1].month;
    const header = showHeader ? '<tr class="month-header"><td colspan="12">' + MONTH_NAMES[d.month] + ' 2025</td></tr>' : '';
    return header + '<tr>' +
      '<td>' + d.date + '</td><td>' + d.dow + '</td><td>' + MONTH_NAMES[d.month] + '</td>' +
      '<td>\u00A3' + (d.offpeakCost/100).toFixed(2) + '</td>' +
      '<td>' + (d.dayChargeCost > 0 ? '\u00A3'+(d.dayChargeCost/100).toFixed(2) : '\u2014') + '</td>' +
      '<td>' + (d.solarToBattery > 0 ? d.solarToBattery+'kWh' : '\u2014') + '</td>' +
      '<td>' + (d.houseFromBattery > 0 ? d.houseFromBattery+'kWh' : '\u2014') + '</td>' +
      '<td>' + d.batteryAt1600 + 'kWh</td>' +
      '<td>\u00A3' + (d.exportRevenue/100).toFixed(2) + '</td>' +
      '<td style="color:#10b981">\u00A3' + (d.selfUseValue/100).toFixed(2) + '</td>' +
      '<td style="color:#ef4444">\u00A3' + (d.evCost/100).toFixed(2) + '</td>' +
      '<td style="color:#3b82f6;font-weight:600">\u00A3' + (d.net/100).toFixed(2) + '</td>' +
      '</tr>';
  }).join('\n');

  const finalHtml = html.replace('SCRIPT_PLACEHOLDER', scriptTag).replace('DAILY_TABLE_ROWS', dailyRows);

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/iof-365-model.html', finalHtml);
  console.log('\nWritten to output/iof-365-model.html');
}

main().catch(e => { console.error(e); process.exit(1); });
