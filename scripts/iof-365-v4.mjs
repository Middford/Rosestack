// IOF 365-day v4 — ALWAYS FULL strategy
// Battery target: 100% (600kWh) at all times
// Off-peak tops up whatever gap remains after solar + house + peak export
// Continuous SOC tracking day-to-day through the full year

import { writeFileSync, readFileSync } from 'fs';

var CAP = 600, EXPORT_KW = 70, EFF = 0.93;
var FLOOR = CAP * 0.20; // 120kWh IOF discharge floor
var PEAK_SLOTS = 6;
var DISCHARGE_SLOT = EXPORT_KW * 0.5; // 35kWh
var MAX_PEAK = PEAK_SLOTS * DISCHARGE_SLOT; // 210kWh
var OFFPEAK_RATE = 16.40, DAY_RATE = 27.33, PEAK_RATE = 38.26;
var INVERTER_KW = 100;
var EV_DAILY = 30;

// Calibrated to 900 kWh/kWp/year for Lancashire (53.8°N), 25kWp south-facing 35° tilt
// Source: MCS yield data, PVGIS, cross-referenced with Forecast.Solar
var SOLAR_DAILY = [0,21.8,36.2,58.1,78.8,90.7,97.5,90.7,76.2,63.8,39.9,22.5,14.5];
var MN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function housePerSlot(slot, month) {
  var hp = [0,0.8,0.8,0.5,0.3,0.1,0,0,0.1,0.3,0.5,0.8,0.8][month];
  if (slot < 12) return 0.3 + hp * 0.5;
  if (slot < 18) return 1.0 + hp;
  if (slot < 32) return 0.5 + hp * 0.3;
  if (slot < 42) return 1.5 + hp;
  return 0.5 + hp * 0.3;
}

function solarPerSlot(slot, month) {
  var daily = SOLAR_DAILY[month];
  if (daily <= 0) return 0;
  var dist = Math.abs(slot - 26);
  if (dist > 10) return 0;
  var raw = Math.exp(-0.5 * Math.pow(dist / 5, 2));
  var totalRaw = 0;
  for (var i = 16; i <= 36; i++) { var d = Math.abs(i-26); if(d<=10) totalRaw += Math.exp(-0.5*Math.pow(d/5,2)); }
  return Math.min(raw * daily / totalRaw, 25 * 0.85 * 0.5);
}

function getMonth(doy) {
  var c = [0,31,59,90,120,151,181,212,243,273,304,334,365];
  for (var m = 1; m <= 12; m++) if (doy <= c[m]) return m;
  return 12;
}
function getDate(doy) { return new Date(2025, 0, doy).toISOString().slice(0, 10); }

var days = [];
var mt = {};
for (var m = 1; m <= 12; m++) mt[m] = { d:0, rev:0, offpk:0, topup:0, exp:0, su:0, ev:0, solIn:0 };

// Start: battery at 100% on Jan 1 (charged over NYE)
var batKwh = CAP;

for (var doy = 1; doy <= 365; doy++) {
  var month = getMonth(doy);
  var date = getDate(doy);
  var dow = DOW[new Date(2025, 0, doy).getDay()];

  var dayOffpkCost = 0, dayTopupCost = 0, dayExpRev = 0, daySuVal = 0;
  var dayEveSaved = 0, daySolIn = 0, dayExported = 0, daySelfUseKwh = 0;

  // ── SLOTS 0-3: MIDNIGHT TO 02:00 (house on battery) ──
  for (var s = 0; s < 4; s++) {
    var dem = housePerSlot(s, month);
    batKwh = Math.max(FLOOR, batKwh - dem);
  }

  var batBefore02 = batKwh;

  // ── PREDICT solar surplus for today ──
  var predictedSolarSurplus = 0;
  for (var ps = 10; ps < 38; ps++) {
    var pSol = solarPerSlot(ps, month);
    var pDem = housePerSlot(ps, month);
    if (pSol > pDem) predictedSolarSurplus += (pSol - pDem);
  }

  // ── SLOTS 4-9: OFF-PEAK 02:00-05:00 ──
  // Only charge to (600 - predicted solar surplus) — leave room for free solar
  var offpeakTarget = Math.max(FLOOR, CAP - predictedSolarSurplus);
  var offpeakCharged = 0;
  for (var s = 4; s < 10; s++) {
    var headroom = offpeakTarget - batKwh;
    if (headroom > 0) {
      var maxSlot = INVERTER_KW * 0.5 * EFF; // 46.5kWh stored per slot
      var stored = Math.min(maxSlot, headroom);
      var grid = stored / EFF;
      dayOffpkCost += grid * OFFPEAK_RATE;
      batKwh += stored;
      offpeakCharged += stored;
    }
    // House still running during off-peak
    batKwh = Math.max(FLOOR, batKwh - housePerSlot(s, month));
  }

  // EV charges during off-peak
  var evCost = EV_DAILY * OFFPEAK_RATE;

  // ── SLOTS 10-31: DAYTIME 05:00-16:00 (solar + house) ──
  for (var s = 10; s < 32; s++) {
    var sol = solarPerSlot(s, month);
    var dem = housePerSlot(s, month);
    var net = sol - dem;
    if (net > 0) {
      // Solar surplus → battery (up to 600kWh)
      var toStore = Math.min(net, CAP - batKwh);
      batKwh += toStore;
      daySolIn += toStore;
    } else {
      // House draws from battery
      batKwh = Math.max(FLOOR, batKwh + net);
    }
  }

  // ── 15:00 CHECK: top up at day rate to reach 600kWh ──
  // No cap — fill completely. Even in winter: buy 27.33p, sell 38.26p = profitable after efficiency
  var topupKwh = 0;
  if (batKwh < CAP - 1) {
    topupKwh = CAP - batKwh;
    var topupGrid = topupKwh / EFF;
    dayTopupCost += topupGrid * DAY_RATE;
    batKwh = CAP;
  }

  var bat1600 = Math.round(batKwh);

  // ── SLOTS 32-37: PEAK 16:00-19:00 (discharge 70kW + house) ──
  for (var s = 32; s < 38; s++) {
    var avail = batKwh - FLOOR;
    if (avail <= 0) break;

    // House at peak rate
    var houseDem = housePerSlot(s, month);
    var houseKwh = Math.min(houseDem, avail);
    daySuVal += houseKwh * PEAK_RATE;
    daySelfUseKwh += houseKwh;
    batKwh -= houseKwh;
    avail = batKwh - FLOOR;

    // Export at full rate
    var expKwh = Math.min(DISCHARGE_SLOT, avail);
    dayExpRev += expKwh * PEAK_RATE;
    dayExported += expKwh;
    batKwh -= expKwh;
  }

  // ── SLOTS 38-47: EVENING 19:00-00:00 (house on battery) ──
  for (var s = 38; s < 48; s++) {
    var dem = housePerSlot(s, month);
    if (batKwh > FLOOR + dem) {
      batKwh -= dem;
      dayEveSaved += dem * DAY_RATE; // saved at IOF day rate
    }
  }

  var netPence = dayExpRev + daySuVal + dayEveSaved - dayOffpkCost - dayTopupCost - evCost;

  days.push({
    doy: doy, date: date, dow: dow, m: month,
    batBefore02: Math.round(batBefore02),
    offpeakCharged: Math.round(offpeakCharged), offpeakCost: Math.round(dayOffpkCost),
    topupKwh: Math.round(topupKwh), topupCost: Math.round(dayTopupCost),
    solarIn: Math.round(daySolIn * 10) / 10,
    bat1600: bat1600, exported: Math.round(dayExported),
    selfUseKwh: Math.round(daySelfUseKwh * 10) / 10,
    expRev: Math.round(dayExpRev), suVal: Math.round(daySuVal),
    eveSaved: Math.round(dayEveSaved), evCost: Math.round(evCost),
    net: Math.round(netPence), endSoc: Math.round(batKwh / CAP * 100),
    endKwh: Math.round(batKwh),
  });

  mt[month].d++;
  mt[month].rev += netPence;
  mt[month].offpk += dayOffpkCost;
  mt[month].topup += dayTopupCost;
  mt[month].exp += dayExpRev;
  mt[month].su += daySuVal + dayEveSaved;
  mt[month].ev += evCost;
  mt[month].solIn += daySolIn;
}

var aNet = days.reduce(function(s,d){return s+d.net},0);
var aExp = days.reduce(function(s,d){return s+d.expRev},0);
var aOffpk = days.reduce(function(s,d){return s+d.offpeakCost},0);
var aTopup = days.reduce(function(s,d){return s+d.topupCost},0);
var aSu = days.reduce(function(s,d){return s+d.suVal+d.eveSaved},0);
var aEv = days.reduce(function(s,d){return s+d.evCost},0);

console.log('IOF 365-DAY v4 — ALWAYS FULL (600kWh target)');
console.log('Off-peak tops up to 600. Solar fills any remaining gap. Top-up at 15:00 if needed.');
console.log('SOC carries day-to-day. Summer solar keeps battery near-full, reducing grid charging.\n');

console.log('Month  Bat@02  Off-pk£  Solar   Top-up£   Export£  Self-Use£  Net£      Daily£');
console.log('─────  ──────  ───────  ──────  ────────  ───────  ─────────  ────────  ──────');
for (var m = 1; m <= 12; m++) {
  var t = mt[m];
  var mDays = days.filter(function(d){return d.m===m});
  var avgBat02 = Math.round(mDays.reduce(function(s,d){return s+d.batBefore02},0)/mDays.length);
  var avgSol = Math.round(t.solIn / t.d);
  console.log(
    MN[m].padEnd(7) +
    (avgBat02+'kWh').padStart(6) + '  ' +
    ('£'+(t.offpk/100).toFixed(0)).padStart(6) + '   ' +
    (avgSol+'kWh').padStart(5) + '   ' +
    (t.topup > 0 ? '£'+(t.topup/100).toFixed(0) : '—').padStart(7) + '   ' +
    ('£'+(t.exp/100).toFixed(0)).padStart(6) + '   ' +
    ('£'+(t.su/100).toFixed(0)).padStart(8) + '   ' +
    ('£'+(t.rev/100).toFixed(0)).padStart(7) + '   ' +
    ('£'+(t.rev/100/t.d).toFixed(2)).padStart(7)
  );
}
console.log('');
console.log('ANNUAL: £' + (aNet/100).toFixed(0) + ' net (£' + (aNet/100/365).toFixed(2) + '/day)');
console.log('  Export: £' + (aExp/100).toFixed(0));
console.log('  Self-use + evening: £' + (aSu/100).toFixed(0));
console.log('  Off-peak charge: -£' + (aOffpk/100).toFixed(0));
console.log('  Day top-up: -£' + (aTopup/100).toFixed(0));
console.log('  EV: -£' + (aEv/100).toFixed(0));

// Show the carry-over effect: end-of-day SOC through the year
console.log('\nEND-OF-DAY SOC (battery level going into next morning):');
for (var m = 1; m <= 12; m++) {
  var mDays = days.filter(function(d){return d.m===m});
  var avgEnd = Math.round(mDays.reduce(function(s,d){return s+d.endKwh},0)/mDays.length);
  var minEnd = Math.min.apply(null, mDays.map(function(d){return d.endKwh}));
  var maxEnd = Math.max.apply(null, mDays.map(function(d){return d.endKwh}));
  console.log('  ' + MN[m].padEnd(4) + ': avg ' + avgEnd + 'kWh  min ' + minEnd + 'kWh  max ' + maxEnd + 'kWh');
}

// HTML
var h = '';
h += '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
h += '<title>RoseStack IOF 365 v4 — Always Full</title>';
h += '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px;max-width:1500px;margin:0 auto}';
h += 'h1{color:#fff;font-size:24px;margin-bottom:4px}h2{color:#fff;font-size:18px;margin:28px 0 12px}.sub{color:#888;font-size:13px;margin-bottom:24px;line-height:1.6}';
h += '.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:28px}';
h += '.card{background:#1a1a2e;border-radius:10px;padding:14px;border:1px solid #2a2a4a}.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}';
h += '.card .val{font-size:26px;font-weight:700;margin-top:2px;color:#3b82f6}.card .det{color:#666;font-size:11px;margin-top:4px}';
h += 'table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px;font-size:11px}';
h += 'thead th{background:#12122a;color:#888;font-size:9px;text-transform:uppercase;padding:6px 6px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0;white-space:nowrap}';
h += 'thead th:first-child,thead th:nth-child(2){text-align:left}';
h += 'tbody td{padding:4px 6px;border-bottom:1px solid #1f1f3a;text-align:right;font-variant-numeric:tabular-nums}';
h += 'tbody td:first-child,tbody td:nth-child(2){text-align:left}tbody tr:hover{background:#1f1f3a}';
h += '.mh td{background:#12122a;color:#3b82f6;font-weight:700;font-size:12px;padding:8px 6px}';
h += '.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}canvas{width:100%!important}';
h += '.legend{display:flex;gap:16px;margin-top:8px;justify-content:center;flex-wrap:wrap}';
h += '.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#888}.legend-dot{width:10px;height:10px;border-radius:2px}';
h += '.scroll-table{max-height:800px;overflow-y:auto;border-radius:10px}';
h += '.note{background:#1a1a2e;border-left:4px solid #3b82f6;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}.note p{color:#ccc;font-size:12px;line-height:1.6}.note strong{color:#3b82f6}';
h += '</style></head><body>';

h += '<h1>IOF 365-Day v4 — Always Full Strategy</h1>';
h += '<p class="sub">600kWh always at 100%. Off-peak tops up the gap. Solar fills during day. Surplus carries forward. 70kW x 3hr peak export daily.</p>';

h += '<div class="cards">';
h += '<div class="card"><div class="lbl">Annual Net</div><div class="val">\u00A3' + (aNet/100).toFixed(0) + '</div><div class="det">\u00A3' + (aNet/100/365).toFixed(2) + '/day</div></div>';
h += '<div class="card"><div class="lbl">Export</div><div class="val">\u00A3' + (aExp/100).toFixed(0) + '</div><div class="det">210kWh/day x 38.26p</div></div>';
h += '<div class="card"><div class="lbl">Off-peak Cost</div><div class="val" style="color:#ef4444">\u00A3' + (aOffpk/100).toFixed(0) + '</div><div class="det">Varies by season</div></div>';
h += '<div class="card"><div class="lbl">Day Top-up</div><div class="val" style="color:#ef4444">\u00A3' + (aTopup/100).toFixed(0) + '</div><div class="det">Only when solar short</div></div>';
h += '<div class="card"><div class="lbl">Self-Use Saved</div><div class="val" style="color:#10b981">\u00A3' + (aSu/100).toFixed(0) + '</div><div class="det">House on battery 24/7</div></div>';
h += '<div class="card"><div class="lbl">EV</div><div class="val" style="color:#ef4444">\u00A3' + (aEv/100).toFixed(0) + '</div><div class="det">30kWh/day off-peak</div></div>';
h += '</div>';

// Monthly table
h += '<h2>Monthly Summary</h2><table>';
h += '<thead><tr><th>Month</th><th>Avg Bat@02</th><th>Off-pk \u00A3</th><th>Solar In</th><th>Top-up \u00A3</th><th>Export \u00A3</th><th>Self-Use \u00A3</th><th>EV \u00A3</th><th>Net \u00A3</th><th>Daily \u00A3</th></tr></thead><tbody>';
for (var m = 1; m <= 12; m++) {
  var t = mt[m];
  var mDays = days.filter(function(d){return d.m===m});
  var avgBat02 = Math.round(mDays.reduce(function(s,d){return s+d.batBefore02},0)/mDays.length);
  h += '<tr><td>' + MN[m] + '</td><td>' + avgBat02 + 'kWh</td>';
  h += '<td style="color:#ef4444">\u00A3' + (t.offpk/100).toFixed(0) + '</td>';
  h += '<td style="color:#f59e0b">' + Math.round(t.solIn) + 'kWh</td>';
  h += '<td style="color:#ef4444">' + (t.topup > 0 ? '\u00A3'+(t.topup/100).toFixed(0) : '\u2014') + '</td>';
  h += '<td>\u00A3' + (t.exp/100).toFixed(0) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + (t.su/100).toFixed(0) + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (t.ev/100).toFixed(0) + '</td>';
  h += '<td style="color:#3b82f6;font-weight:700">\u00A3' + (t.rev/100).toFixed(0) + '</td>';
  h += '<td>\u00A3' + (t.rev/100/t.d).toFixed(2) + '</td></tr>';
}
h += '</tbody></table>';

// Charts
h += '<h2>Daily Net Revenue + End-of-Day SOC</h2><div class="chart-box"><canvas id="dailyChart" height="350"></canvas>';
h += '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Net revenue (left)</div>';
h += '<div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>End-of-day kWh (right)</div>';
h += '<div class="legend-item"><div class="legend-dot" style="background:#10b98140"></div>Solar in (right)</div></div></div>';

// Daily table
h += '<h2>All 365 Days</h2><div class="scroll-table"><table>';
h += '<thead><tr><th>Date</th><th>Day</th><th>Bat@02</th><th>Off-pk kWh</th><th>Off-pk \u00A3</th><th>Solar In</th><th>Top-up</th><th>Bat@16:00</th><th>Export kWh</th><th>Export \u00A3</th><th>Self+Eve \u00A3</th><th>Net \u00A3</th><th>End kWh</th><th>End %</th></tr></thead><tbody>';
for (var i = 0; i < days.length; i++) {
  var d = days[i];
  if (i === 0 || d.m !== days[i-1].m) h += '<tr class="mh"><td colspan="14">' + MN[d.m] + ' 2025</td></tr>';
  h += '<tr><td>' + d.date + '</td><td>' + d.dow + '</td>';
  h += '<td>' + d.batBefore02 + '</td>';
  h += '<td>' + d.offpeakCharged + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (d.offpeakCost/100).toFixed(2) + '</td>';
  h += '<td style="color:#f59e0b">' + (d.solarIn > 0 ? d.solarIn + 'kWh' : '\u2014') + '</td>';
  h += '<td>' + (d.topupKwh > 0 ? d.topupKwh + 'kWh \u00A3'+(d.topupCost/100).toFixed(2) : '\u2014') + '</td>';
  h += '<td style="font-weight:600">' + d.bat1600 + '</td>';
  h += '<td>' + d.exported + '</td>';
  h += '<td>\u00A3' + (d.expRev/100).toFixed(2) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + ((d.suVal+d.eveSaved)/100).toFixed(2) + '</td>';
  h += '<td style="color:#3b82f6;font-weight:600">\u00A3' + (d.net/100).toFixed(2) + '</td>';
  h += '<td>' + d.endKwh + '</td>';
  h += '<td>' + d.endSoc + '%</td></tr>';
}
h += '</tbody></table></div>';

h += '<div class="note"><p><strong>v4 Always Full:</strong> Battery maintained at 600kWh. Off-peak charges the gap after peak export + house use. ';
h += 'Solar surplus fills battery during the day — in summer this drastically reduces grid charging. ';
h += 'Summer excess carries into autumn, reducing off-peak costs for weeks after solar drops. ';
h += 'The Bat@02 column shows how much battery had before off-peak charging — higher in summer (solar carry-over), lower in winter.</p></div>';

// Chart JS
var chartJs = readFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/scripts/iof-chart.js', 'utf8');
var mJson = JSON.stringify(Object.keys(mt).map(function(m){return {label:MN[m],exportRev:mt[m].exp,selfUse:mt[m].su,cost:mt[m].offpk+mt[m].topup+mt[m].ev,net:mt[m].rev}}));
var dJson = JSON.stringify(days.map(function(d){return {d:d.date.slice(5),net:d.net,month:d.m,endKwh:d.endKwh,solIn:d.solarIn}}));
h += '<script>\nvar monthData=' + mJson + ';\nvar dailyData=' + dJson + ';\n' + chartJs + '\n</script>';
h += '</body></html>';

writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/iof-365-v4.html', h);
console.log('\nWritten to output/iof-365-v4.html');
