// IOF 365-day model — clean rewrite, no template literal issues
import { writeFileSync, readFileSync } from 'fs';

const CAP = 600, EXPORT_KW = 70, EFF = 0.93;
const FLOOR = CAP * 0.20; // 120kWh — IOF 20% discharge reserve
const PEAK_SLOTS = 6; // 16:00-19:00
const DISCHARGE_SLOT = EXPORT_KW * 0.5; // 35kWh per slot
const MAX_PEAK = PEAK_SLOTS * DISCHARGE_SLOT; // 210kWh
const HOUSE_PEAK = 1.5 * PEAK_SLOTS; // 9kWh during peak
const OFFPEAK = 16.40, DAY_RATE = 27.33, PEAK = 38.26;
const SOLAR = [0,12,22,42,62,80,88,82,68,50,30,15,9]; // kWh/day by month (25kWp)
const DAY_DEMAND = [0,30,28,20,18,14,12,12,14,18,20,28,32]; // house+HP daytime draw
const EV_DAILY = 30;
const MN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getMonth(doy) {
  const c = [0,31,59,90,120,151,181,212,243,273,304,334,365];
  for (let m = 1; m <= 12; m++) if (doy <= c[m]) return m;
  return 12;
}
function getDate(doy) { return new Date(2025, 0, doy).toISOString().slice(0, 10); }

const days = [];
const mt = {};
for (let m = 1; m <= 12; m++) mt[m] = { d:0, rev:0, chg:0, exp:0, su:0, ev:0, sol:0 };

for (let doy = 1; doy <= 365; doy++) {
  const m = getMonth(doy);
  const date = getDate(doy);
  const dow = DOW[new Date(2025, 0, doy).getDay()];

  const sol = SOLAR[m] * 0.92; // daytime solar
  const dem = DAY_DEMAND[m];
  const solToBat = Math.max(0, sol - dem);
  const houseFromBat = Math.max(0, dem - sol);
  const netDay = solToBat - houseFromBat;
  const needAt0500 = CAP - netDay;
  const offpeakMax = 100 * 3 * EFF; // 279kWh
  const offpeakCharged = Math.min(Math.max(0, needAt0500 - FLOOR), offpeakMax);
  const offpeakGrid = offpeakCharged / EFF;
  const offpeakCost = offpeakGrid * OFFPEAK;
  const afterOffpeak = FLOOR + offpeakCharged;
  const stillNeeded = Math.max(0, needAt0500 - afterOffpeak);
  const dayCost = stillNeeded > 0 ? (stillNeeded / EFF) * DAY_RATE : 0;
  const bat1600 = Math.min(CAP, afterOffpeak + netDay + stillNeeded);
  const avail = Math.max(0, bat1600 - FLOOR);
  const exported = Math.min(avail, MAX_PEAK);
  const selfUseKwh = Math.min(HOUSE_PEAK, avail);
  const expRev = exported * PEAK;
  const suVal = selfUseKwh * PEAK;
  const evCost = EV_DAILY * OFFPEAK;
  const totalCost = offpeakCost + dayCost;
  const net = expRev + suVal - totalCost - evCost;

  days.push({ doy, date, dow, m, solToBat: Math.round(solToBat*10)/10, houseFromBat: Math.round(houseFromBat*10)/10,
    offpeakCost: Math.round(offpeakCost), dayCost: Math.round(dayCost), bat1600: Math.round(bat1600),
    exported: Math.round(exported), expRev: Math.round(expRev), suVal: Math.round(suVal),
    evCost: Math.round(evCost), net: Math.round(net) });

  mt[m].d++; mt[m].rev += net; mt[m].chg += totalCost; mt[m].exp += expRev;
  mt[m].su += suVal; mt[m].ev += evCost; mt[m].sol += solToBat;
}

const aNet = days.reduce((s,d) => s+d.net, 0);
const aExp = days.reduce((s,d) => s+d.expRev, 0);
const aChg = days.reduce((s,d) => s+d.offpeakCost+d.dayCost, 0);
const aSu = days.reduce((s,d) => s+d.suVal, 0);
const aEv = days.reduce((s,d) => s+d.evCost, 0);

// Print console summary
console.log('IOF 365-DAY MODEL (600kWh, 70kW export, 25kWp solar)');
console.log('Month  Charge   Export    Self-Use  EV Cost   Net       Daily');
for (let m = 1; m <= 12; m++) {
  const t = mt[m];
  console.log(MN[m].padEnd(7) + 'GBP' + (t.chg/100).toFixed(0).padStart(5) + '   GBP' + (t.exp/100).toFixed(0).padStart(5) +
    '    GBP' + (t.su/100).toFixed(0).padStart(4) + '    GBP' + (t.ev/100).toFixed(0).padStart(4) +
    '    GBP' + (t.rev/100).toFixed(0).padStart(5) + '   GBP' + (t.rev/100/t.d).toFixed(2).padStart(6));
}
console.log('ANNUAL: GBP' + (aNet/100).toFixed(0) + ' net (GBP' + (aNet/100/365).toFixed(2) + '/day)');

// Build HTML with string concatenation (no template literal issues)
var h = '';
h += '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
h += '<title>RoseStack IOF 365-Day Model</title>';
h += '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px;max-width:1400px;margin:0 auto}';
h += 'h1{color:#fff;font-size:24px;margin-bottom:4px}h2{color:#fff;font-size:18px;margin:28px 0 12px}.sub{color:#888;font-size:13px;margin-bottom:24px;line-height:1.6}';
h += '.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px}';
h += '.card{background:#1a1a2e;border-radius:10px;padding:16px;border:1px solid #2a2a4a}.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}';
h += '.card .val{font-size:28px;font-weight:700;margin-top:2px;color:#3b82f6}.card .det{color:#666;font-size:11px;margin-top:4px}';
h += 'table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px;font-size:12px}';
h += 'thead th{background:#12122a;color:#888;font-size:10px;text-transform:uppercase;padding:8px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0;white-space:nowrap}';
h += 'thead th:first-child,thead th:nth-child(2),thead th:nth-child(3){text-align:left}';
h += 'tbody td{padding:5px 8px;border-bottom:1px solid #1f1f3a;text-align:right;font-variant-numeric:tabular-nums}';
h += 'tbody td:first-child,tbody td:nth-child(2),tbody td:nth-child(3){text-align:left}tbody tr:hover{background:#1f1f3a}';
h += '.mh td{background:#12122a;color:#3b82f6;font-weight:700;font-size:13px;padding:10px 8px}';
h += '.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}';
h += 'canvas{width:100%!important}.legend{display:flex;gap:16px;margin-top:8px;justify-content:center;flex-wrap:wrap}';
h += '.legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#888}.legend-dot{width:10px;height:10px;border-radius:2px}';
h += '.scroll-table{max-height:800px;overflow-y:auto;border-radius:10px}';
h += '.note{background:#1a1a2e;border-left:4px solid #3b82f6;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}.note p{color:#ccc;font-size:12px;line-height:1.6}.note strong{color:#3b82f6}';
h += '</style></head><body>';

h += '<h1>\u{1F50C} IOF 365-Day Revenue Model</h1>';
h += '<p class="sub">600kWh \u00B7 100kW inverter \u00B7 70kW G99 export \u00B7 25kWp solar \u00B7 2\u00D7EV \u00B7 House+HP<br>';
h += 'Goal: arrive at 16:00 fully charged. Discharge 70kW \u00D7 3hrs = 210kWh every day at 38.26p.</p>';

h += '<div class="cards">';
h += '<div class="card"><div class="lbl">Annual Net Revenue</div><div class="val">\u00A3' + (aNet/100).toFixed(0) + '</div><div class="det">\u00A3' + (aNet/100/365).toFixed(2) + '/day avg</div></div>';
h += '<div class="card"><div class="lbl">Export Revenue</div><div class="val">\u00A3' + (aExp/100).toFixed(0) + '</div><div class="det">210kWh/day \u00D7 38.26p</div></div>';
h += '<div class="card"><div class="lbl">Charge Cost</div><div class="val" style="color:#ef4444">\u00A3' + (aChg/100).toFixed(0) + '</div><div class="det">Off-peak + day top-up</div></div>';
h += '<div class="card"><div class="lbl">Self-Use Saved</div><div class="val" style="color:#10b981">\u00A3' + (aSu/100).toFixed(0) + '</div><div class="det">House during peak</div></div>';
h += '<div class="card"><div class="lbl">EV Cost</div><div class="val" style="color:#ef4444">\u00A3' + (aEv/100).toFixed(0) + '</div><div class="det">30kWh/day at 16.40p</div></div>';
h += '<div class="card"><div class="lbl">Daily Export</div><div class="val" style="color:#f59e0b">210kWh</div><div class="det">70kW \u00D7 3hrs every day</div></div>';
h += '</div>';

h += '<h2>Monthly Summary</h2>';
h += '<table><thead><tr><th>Month</th><th>Days</th><th>Charge Cost</th><th>Export Rev</th><th>Self-Use</th><th>EV Cost</th><th>Net Revenue</th><th>Daily Avg</th><th>Solar\u2192Bat</th></tr></thead><tbody>';
for (let m = 1; m <= 12; m++) {
  var t = mt[m];
  h += '<tr><td>' + MN[m] + '</td><td>' + t.d + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (t.chg/100).toFixed(2) + '</td>';
  h += '<td>\u00A3' + (t.exp/100).toFixed(2) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + (t.su/100).toFixed(2) + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (t.ev/100).toFixed(2) + '</td>';
  h += '<td style="color:#3b82f6;font-weight:700">\u00A3' + (t.rev/100).toFixed(2) + '</td>';
  h += '<td>\u00A3' + (t.rev/100/t.d).toFixed(2) + '</td>';
  h += '<td>' + t.sol.toFixed(0) + 'kWh</td></tr>';
}
h += '</tbody></table>';

h += '<h2>Daily Chart</h2><div class="chart-box"><canvas id="dailyChart" height="250"></canvas>';
h += '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Daily net revenue</div></div></div>';

h += '<h2>Monthly Revenue Chart</h2><div class="chart-box"><canvas id="monthlyChart" height="300"></canvas>';
h += '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Export</div>';
h += '<div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Self-use</div>';
h += '<div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Charge+EV cost</div>';
h += '<div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Net</div></div></div>';

h += '<h2>All 365 Days</h2><div class="scroll-table"><table>';
h += '<thead><tr><th>Date</th><th>Day</th><th>Mth</th><th>Off-pk \u00A3</th><th>Day top-up</th><th>Solar\u2192Bat</th><th>House\u2190Bat</th><th>Bat@16:00</th><th>Export \u00A3</th><th>Self-Use</th><th>EV \u00A3</th><th>Net \u00A3</th></tr></thead><tbody>';
for (var i = 0; i < days.length; i++) {
  var d = days[i];
  if (i === 0 || d.m !== days[i-1].m) h += '<tr class="mh"><td colspan="12">' + MN[d.m] + ' 2025</td></tr>';
  h += '<tr><td>' + d.date + '</td><td>' + d.dow + '</td><td>' + MN[d.m] + '</td>';
  h += '<td>\u00A3' + (d.offpeakCost/100).toFixed(2) + '</td>';
  h += '<td>' + (d.dayCost > 0 ? '\u00A3'+(d.dayCost/100).toFixed(2) : '\u2014') + '</td>';
  h += '<td>' + (d.solToBat > 0 ? d.solToBat+'kWh' : '\u2014') + '</td>';
  h += '<td>' + (d.houseFromBat > 0 ? d.houseFromBat+'kWh' : '\u2014') + '</td>';
  h += '<td>' + d.bat1600 + 'kWh</td>';
  h += '<td>\u00A3' + (d.expRev/100).toFixed(2) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + (d.suVal/100).toFixed(2) + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (d.evCost/100).toFixed(2) + '</td>';
  h += '<td style="color:#3b82f6;font-weight:600">\u00A3' + (d.net/100).toFixed(2) + '</td></tr>';
}
h += '</tbody></table></div>';

h += '<div class="note"><p><strong>Assumptions:</strong> Kraken charges to 100% by 16:00 using off-peak (16.40p) first, then day rate (27.33p) if needed. ';
h += 'Solar offsets daytime house demand first, surplus goes to battery. Winter house+HP demand exceeds solar so more grid charging needed. ';
h += 'Discharge: 70kW for 3 hours = 210kWh at 38.26p export every day. House self-use during peak at 38.26p. EVs 30kWh/day at off-peak. ';
h += '20% discharge floor (120kWh). Battery size: 600kWh. Efficiency: 93%.</p></div>';

// Inject chart JS
var monthJson = JSON.stringify(Object.keys(mt).map(function(m) {
  return { label: MN[m], exportRev: mt[m].exp, selfUse: mt[m].su, cost: mt[m].chg + mt[m].ev, net: mt[m].rev };
}));
var dailyJson = JSON.stringify(days.map(function(d) { return { d: d.date.slice(5), net: d.net, month: d.m }; }));
var chartJs = readFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/scripts/iof-chart.js', 'utf8');
h += '<script>\nvar monthData = ' + monthJson + ';\nvar dailyData = ' + dailyJson + ';\n' + chartJs + '\n</script>';
h += '</body></html>';

writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/iof-365-model.html', h);
console.log('Written to output/iof-365-model.html');
