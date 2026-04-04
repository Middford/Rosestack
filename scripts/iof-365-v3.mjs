// IOF 365-day model v3 — CORRECT strategy
//
// The battery doesn't try to fill to 100%. It aims to have exactly enough
// at 16:00 to discharge 210kWh (70kW × 3hrs) + power the house during peak.
//
// Strategy:
// 1. Off-peak (02:00-05:00): charge what's needed MINUS predicted solar surplus
// 2. Daytime: solar powers house, excess tops up battery
// 3. ~15:00: day-rate top-up if solar fell short of prediction
// 4. Peak (16:00-19:00): full 70kW export + house runs off battery
// 5. Evening: house runs off remaining battery charge
//
// The off-peak charge adapts by season based on predicted solar.

import { writeFileSync, readFileSync } from 'fs';

var CAP = 600, EXPORT_KW = 70, EFF = 0.93;
var FLOOR_PCT = 0.20; // IOF 20% discharge reserve
var FLOOR = CAP * FLOOR_PCT; // 120kWh
var PEAK_SLOTS = 6; // 16:00-19:00
var DISCHARGE_SLOT = EXPORT_KW * 0.5; // 35kWh per slot
var MAX_PEAK_EXPORT = PEAK_SLOTS * DISCHARGE_SLOT; // 210kWh
var OFFPEAK_RATE = 16.40, DAY_RATE = 27.33, PEAK_RATE = 38.26;
var OFFPEAK_HOURS = 3; // 02:00-05:00
var INVERTER_KW = 100;

// House consumption by hour band (kWh per slot = per 30 min)
// Night 00:00-06:00: 0.3 kWh/slot (low baseload)
// Morning 06:00-09:00: 1.0 kWh/slot (heating, kettle, shower)
// Day 09:00-16:00: 0.5 kWh/slot (background)
// Peak 16:00-21:00: 1.5 kWh/slot (cooking, heating, TV, lights)
// Evening 21:00-00:00: 0.5 kWh/slot (winding down)
function housePerSlot(slot, month) {
  // Heat pump addition in winter (months 11,12,1,2,3)
  var hpAdd = [0,0.8,0.8,0.5,0.3,0.1,0,0,0.1,0.3,0.5,0.8,0.8][month];

  if (slot < 12) return 0.3 + hpAdd * 0.5; // night: 00:00-06:00
  if (slot < 18) return 1.0 + hpAdd; // morning: 06:00-09:00
  if (slot < 32) return 0.5 + hpAdd * 0.3; // day: 09:00-16:00
  if (slot < 42) return 1.5 + hpAdd; // peak: 16:00-21:00
  return 0.5 + hpAdd * 0.3; // evening: 21:00-00:00
}

// Solar generation per slot (kWh) for 25kWp
var SOLAR_DAILY = [0,12,22,42,62,80,88,82,68,50,30,15,9];
function solarPerSlot(slot, month) {
  var daily = SOLAR_DAILY[month];
  if (daily <= 0) return 0;
  var dist = Math.abs(slot - 26); // peak at 13:00
  if (dist > 10) return 0;
  var raw = Math.exp(-0.5 * Math.pow(dist / 5, 2));
  // Normalise to daily total
  var totalRaw = 0;
  for (var i = 0; i < 48; i++) {
    var d = Math.abs(i - 26);
    if (d <= 10) totalRaw += Math.exp(-0.5 * Math.pow(d / 5, 2));
  }
  return Math.min(raw * daily / totalRaw, 25 * 0.85 * 0.5);
}

// EV charging: 30kWh/day, flexible timing
var EV_DAILY = 30;

var MN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getMonth(doy) {
  var c = [0,31,59,90,120,151,181,212,243,273,304,334,365];
  for (var m = 1; m <= 12; m++) if (doy <= c[m]) return m;
  return 12;
}
function getDate(doy) { return new Date(2025, 0, doy).toISOString().slice(0, 10); }

// ═══════════════════════════════════════════
// SIMULATE EACH DAY
// ═══════════════════════════════════════════
var days = [];
var mt = {};
for (var m = 1; m <= 12; m++) mt[m] = { d:0, rev:0, chg:0, exp:0, su:0, ev:0, sol:0 };

// Running battery SOC across the year (carries over day to day)
var batKwh = FLOOR; // Start Jan 1 at 20% (just finished previous day's peak discharge)

for (var doy = 1; doy <= 365; doy++) {
  var month = getMonth(doy);
  var date = getDate(doy);
  var dow = DOW[new Date(2025, 0, doy).getDay()];

  // Predict today's solar surplus (solar - house daytime demand)
  var predictedSolar = 0, predictedDayDemand = 0;
  for (var s = 10; s < 32; s++) { // 05:00-16:00
    predictedSolar += solarPerSlot(s, month);
    predictedDayDemand += housePerSlot(s, month);
  }
  var predictedSurplus = Math.max(0, predictedSolar - predictedDayDemand);

  // What do we need at 16:00?
  // Export: 210kWh + house during peak: ~9-15kWh + buffer to stay above floor after
  var peakHouseDemand = 0;
  for (var s = 32; s < 38; s++) peakHouseDemand += housePerSlot(s, month);
  var needAt1600 = MAX_PEAK_EXPORT + peakHouseDemand + FLOOR; // ~339-345kWh

  // What will solar contribute between now and 16:00?
  var solarContrib = predictedSurplus; // net surplus after house

  // How much do we need from grid to reach target?
  var currentBat = batKwh; // SOC from end of previous day
  var gridNeeded = Math.max(0, needAt1600 - currentBat - solarContrib);

  // Night house demand (19:00 prev day → 02:00 = already consumed, but we model from 00:00)
  // Slots 0-3 (00:00-02:00): house on battery
  var nightDraw = 0;
  for (var s = 0; s < 4; s++) nightDraw += housePerSlot(s, month);
  batKwh = Math.max(FLOOR, batKwh - nightDraw);

  // ── OFF-PEAK CHARGING (02:00-05:00) ──
  // Only charge the gap: what we need at 16:00 minus what we already have minus predicted solar
  // If battery is already above target from yesterday's solar surplus, charge nothing
  var offpeakTarget = Math.max(0, needAt1600 - batKwh - solarContrib);
  var offpeakMaxKwh = INVERTER_KW * OFFPEAK_HOURS * EFF; // 279kWh
  var offpeakCharged = Math.min(offpeakTarget, offpeakMaxKwh, CAP - batKwh);
  var offpeakGrid = offpeakCharged / EFF;
  var offpeakCost = offpeakGrid * OFFPEAK_RATE;
  batKwh += offpeakCharged;

  // Also charge EVs during off-peak
  var evCost = EV_DAILY * OFFPEAK_RATE;

  // ── MORNING (05:00-09:00) ──
  // Solar surplus goes to battery (up to 100%), deficit drawn from battery
  for (var s = 10; s < 18; s++) {
    var sol = solarPerSlot(s, month);
    var dem = housePerSlot(s, month);
    var net = sol - dem;
    if (net > 0) {
      batKwh = Math.min(CAP, batKwh + net);
      solarUsed += Math.min(net, CAP - (batKwh - net)); // track what actually went in
    } else {
      batKwh = Math.max(FLOOR, batKwh + net);
    }
  }

  // ── DAYTIME (09:00-15:00) ──
  // Let solar fill battery to 100% — excess carries to tomorrow
  var solarUsed = 0;
  for (var s = 18; s < 30; s++) {
    var sol = solarPerSlot(s, month);
    var dem = housePerSlot(s, month);
    var net = sol - dem;
    if (net > 0) {
      var toStore = Math.min(net, CAP - batKwh); // fill to 100%, not just target
      batKwh += toStore;
      solarUsed += toStore;
    } else {
      batKwh = Math.max(FLOOR, batKwh + net);
    }
  }

  // ── 15:00 TOP-UP (one hour at day rate) ──
  // Only top up if battery is below peak target — if solar surplus pushed it above, skip
  var topupNeeded = Math.max(0, needAt1600 - batKwh);
  var topupKwh = Math.min(topupNeeded, INVERTER_KW * 1 * EFF); // 1 hour max
  var topupGrid = topupKwh / EFF;
  var topupCost = topupGrid * DAY_RATE;
  batKwh += topupKwh;

  // If battery is ABOVE target (solar surplus), the excess stays — it carries to tomorrow

  // 15:00-16:00 house still running
  for (var s = 30; s < 32; s++) {
    batKwh = Math.max(FLOOR, batKwh - housePerSlot(s, month));
  }

  var bat1600 = Math.round(batKwh);

  // ── PEAK DISCHARGE (16:00-19:00) ──
  // Export full 70kW and power house — battery may be above target from solar surplus
  var exportRev = 0, selfUseVal = 0, totalExported = 0, totalSelfUse = 0;
  for (var s = 32; s < 38; s++) {
    var avail = batKwh - FLOOR;
    if (avail <= 0) break;

    // House self-use at peak rate
    var houseDem = housePerSlot(s, month);
    var houseKwh = Math.min(houseDem, avail);
    selfUseVal += houseKwh * PEAK_RATE;
    totalSelfUse += houseKwh;
    batKwh -= houseKwh;

    // Export at full rate (capped by inverter/export limit per slot)
    var remainAvail = batKwh - FLOOR;
    var expKwh = Math.min(DISCHARGE_SLOT, remainAvail);
    exportRev += expKwh * PEAK_RATE;
    totalExported += expKwh;
    batKwh -= expKwh;
  }

  // ── EVENING (19:00-00:00) house on remaining battery ──
  var eveningSaved = 0;
  for (var s = 38; s < 48; s++) {
    var dem = housePerSlot(s, month);
    if (batKwh > FLOOR + dem) {
      batKwh -= dem;
      eveningSaved += dem * DAY_RATE; // saved at day rate (19:00-02:00 is day band on IOF)
    }
    // If battery at floor, house draws from grid (not our cost to model)
  }

  var totalChargeCost = offpeakCost + topupCost;
  var netPence = exportRev + selfUseVal + eveningSaved - totalChargeCost - evCost;

  days.push({
    doy: doy, date: date, dow: dow, m: month,
    offpeakCharged: Math.round(offpeakCharged), offpeakCost: Math.round(offpeakCost),
    topupKwh: Math.round(topupKwh), topupCost: Math.round(topupCost),
    solarUsed: Math.round(solarUsed * 10) / 10,
    bat1600: bat1600,
    surplus: Math.round(Math.max(0, bat1600 - needAt1600)), // excess above target from solar carry-over
    exported: Math.round(totalExported), selfUseKwh: Math.round(totalSelfUse * 10) / 10,
    expRev: Math.round(exportRev), suVal: Math.round(selfUseVal), eveSaved: Math.round(eveningSaved),
    evCost: Math.round(evCost), net: Math.round(netPence),
    endSoc: Math.round(batKwh / CAP * 100),
  });

  mt[month].d++;
  mt[month].rev += netPence;
  mt[month].chg += totalChargeCost;
  mt[month].exp += exportRev;
  mt[month].su += selfUseVal + eveningSaved;
  mt[month].ev += evCost;
  mt[month].sol += solarUsed;
}

var aNet = days.reduce(function(s,d){return s+d.net}, 0);
var aExp = days.reduce(function(s,d){return s+d.expRev}, 0);
var aChg = days.reduce(function(s,d){return s+d.offpeakCost+d.topupCost}, 0);
var aSu = days.reduce(function(s,d){return s+d.suVal+d.eveSaved}, 0);
var aEv = days.reduce(function(s,d){return s+d.evCost}, 0);

console.log('IOF 365-DAY MODEL v3 (600kWh, 70kW export, 25kWp solar)');
console.log('Strategy: charge what you need, let solar do its thing, top up at 15:00');
console.log('');
console.log('Month  Off-pk£  Top-up£  Export£  Self-Use£ EV£      Net£      Daily£');
console.log('─────  ───────  ───────  ───────  ────────  ───────  ────────  ──────');
for (var m = 1; m <= 12; m++) {
  var t = mt[m];
  var offpk = days.filter(function(d){return d.m===m}).reduce(function(s,d){return s+d.offpeakCost},0);
  var topup = days.filter(function(d){return d.m===m}).reduce(function(s,d){return s+d.topupCost},0);
  console.log(
    MN[m].padEnd(7) +
    ('£'+(offpk/100).toFixed(0)).padStart(6) + '   ' +
    ('£'+(topup/100).toFixed(0)).padStart(6) + '   ' +
    ('£'+(t.exp/100).toFixed(0)).padStart(6) + '   ' +
    ('£'+(t.su/100).toFixed(0)).padStart(7) + '   ' +
    ('£'+(t.ev/100).toFixed(0)).padStart(6) + '   ' +
    ('£'+(t.rev/100).toFixed(0)).padStart(7) + '   ' +
    ('£'+(t.rev/100/t.d).toFixed(2)).padStart(7)
  );
}
console.log('');
console.log('ANNUAL: £' + (aNet/100).toFixed(0) + ' net (£' + (aNet/100/365).toFixed(2) + '/day)');
console.log('  Export: £' + (aExp/100).toFixed(0) + '  Self-use: £' + (aSu/100).toFixed(0) + '  Charge: £' + (aChg/100).toFixed(0) + '  EV: £' + (aEv/100).toFixed(0));

// ═══════════════════════════════════════════
// HTML OUTPUT
// ═══════════════════════════════════════════
var h = '';
h += '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
h += '<title>RoseStack IOF 365-Day Model v3</title>';
h += '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px;max-width:1400px;margin:0 auto}';
h += 'h1{color:#fff;font-size:24px;margin-bottom:4px}h2{color:#fff;font-size:18px;margin:28px 0 12px}.sub{color:#888;font-size:13px;margin-bottom:24px;line-height:1.6}';
h += '.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px}';
h += '.card{background:#1a1a2e;border-radius:10px;padding:16px;border:1px solid #2a2a4a}.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}';
h += '.card .val{font-size:28px;font-weight:700;margin-top:2px;color:#3b82f6}.card .det{color:#666;font-size:11px;margin-top:4px}';
h += 'table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px;font-size:12px}';
h += 'thead th{background:#12122a;color:#888;font-size:10px;text-transform:uppercase;padding:8px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0;white-space:nowrap}';
h += 'thead th:first-child,thead th:nth-child(2){text-align:left}';
h += 'tbody td{padding:5px 8px;border-bottom:1px solid #1f1f3a;text-align:right;font-variant-numeric:tabular-nums}';
h += 'tbody td:first-child,tbody td:nth-child(2){text-align:left}tbody tr:hover{background:#1f1f3a}';
h += '.mh td{background:#12122a;color:#3b82f6;font-weight:700;font-size:13px;padding:10px 8px}';
h += '.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}canvas{width:100%!important}';
h += '.legend{display:flex;gap:16px;margin-top:8px;justify-content:center;flex-wrap:wrap}';
h += '.legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#888}.legend-dot{width:10px;height:10px;border-radius:2px}';
h += '.scroll-table{max-height:800px;overflow-y:auto;border-radius:10px}';
h += '.note{background:#1a1a2e;border-left:4px solid #3b82f6;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}.note p{color:#ccc;font-size:12px;line-height:1.6}.note strong{color:#3b82f6}';
h += '</style></head><body>';

h += '<h1>\u{1F50C} IOF 365-Day Model v3 \u2014 Smart Charging</h1>';
h += '<p class="sub">600kWh \u00B7 100kW inverter \u00B7 70kW export \u00B7 25kWp solar \u00B7 2\u00D7EV \u00B7 House+HP<br>';
h += 'Strategy: Charge minimum off-peak. Let solar run house + top up battery. Day-rate top-up at 15:00 only if needed. Full 70kW \u00D7 3hr peak export.</p>';

h += '<div class="cards">';
h += '<div class="card"><div class="lbl">Annual Net Revenue</div><div class="val">\u00A3' + (aNet/100).toFixed(0) + '</div><div class="det">\u00A3' + (aNet/100/365).toFixed(2) + '/day avg</div></div>';
h += '<div class="card"><div class="lbl">Export Revenue</div><div class="val">\u00A3' + (aExp/100).toFixed(0) + '</div><div class="det">210kWh/day peak</div></div>';
h += '<div class="card"><div class="lbl">Charge Cost</div><div class="val" style="color:#ef4444">\u00A3' + (aChg/100).toFixed(0) + '</div><div class="det">Off-peak + day top-up</div></div>';
h += '<div class="card"><div class="lbl">Self-Use + Evening</div><div class="val" style="color:#10b981">\u00A3' + (aSu/100).toFixed(0) + '</div><div class="det">House powered by battery</div></div>';
h += '<div class="card"><div class="lbl">EV Cost</div><div class="val" style="color:#ef4444">\u00A3' + (aEv/100).toFixed(0) + '</div><div class="det">30kWh/day at 16.40p</div></div>';
h += '<div class="card"><div class="lbl">Bat@16:00 (avg)</div><div class="val" style="color:#f59e0b">' + Math.round(days.reduce(function(s,d){return s+d.bat1600},0)/365) + 'kWh</div><div class="det">Target: ' + Math.round(MAX_PEAK_EXPORT + FLOOR + 15) + 'kWh</div></div>';
h += '</div>';

h += '<h2>Monthly Summary</h2>';
h += '<table><thead><tr><th>Month</th><th>Days</th><th>Off-pk \u00A3</th><th>Top-up \u00A3</th><th>Export \u00A3</th><th>Self-Use \u00A3</th><th>EV \u00A3</th><th>Net \u00A3</th><th>Daily \u00A3</th><th>Solar kWh</th></tr></thead><tbody>';
for (var m = 1; m <= 12; m++) {
  var t = mt[m];
  var offpk = days.filter(function(d){return d.m===m}).reduce(function(s,d){return s+d.offpeakCost},0);
  var topup = days.filter(function(d){return d.m===m}).reduce(function(s,d){return s+d.topupCost},0);
  h += '<tr><td>' + MN[m] + '</td><td>' + t.d + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (offpk/100).toFixed(0) + '</td>';
  h += '<td style="color:#ef4444">' + (topup > 0 ? '\u00A3'+(topup/100).toFixed(0) : '\u2014') + '</td>';
  h += '<td>\u00A3' + (t.exp/100).toFixed(0) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + (t.su/100).toFixed(0) + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (t.ev/100).toFixed(0) + '</td>';
  h += '<td style="color:#3b82f6;font-weight:700">\u00A3' + (t.rev/100).toFixed(0) + '</td>';
  h += '<td>\u00A3' + (t.rev/100/t.d).toFixed(2) + '</td>';
  h += '<td>' + t.sol.toFixed(0) + '</td></tr>';
}
h += '</tbody></table>';

h += '<h2>Daily Revenue + SOC Chart</h2><div class="chart-box"><canvas id="dailyChart" height="300"></canvas>';
h += '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Net revenue</div>';
h += '<div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Bat@16:00 (kWh, right axis)</div></div></div>';

h += '<h2>All 365 Days</h2><div class="scroll-table"><table>';
h += '<thead><tr><th>Date</th><th>Day</th><th>Off-pk kWh</th><th>Off-pk \u00A3</th><th>Top-up kWh</th><th>Top-up \u00A3</th><th>Solar\u2192Bat</th><th>Bat@16:00</th><th>Exported</th><th>Export \u00A3</th><th>Self-Use \u00A3</th><th>Eve \u00A3</th><th>EV \u00A3</th><th>Net \u00A3</th><th>End SOC</th></tr></thead><tbody>';
for (var i = 0; i < days.length; i++) {
  var d = days[i];
  if (i === 0 || d.m !== days[i-1].m) h += '<tr class="mh"><td colspan="15">' + MN[d.m] + ' 2025</td></tr>';
  h += '<tr><td>' + d.date + '</td><td>' + d.dow + '</td>';
  h += '<td>' + d.offpeakCharged + '</td>';
  h += '<td>\u00A3' + (d.offpeakCost/100).toFixed(2) + '</td>';
  h += '<td>' + (d.topupKwh > 0 ? d.topupKwh : '\u2014') + '</td>';
  h += '<td>' + (d.topupCost > 0 ? '\u00A3'+(d.topupCost/100).toFixed(2) : '\u2014') + '</td>';
  h += '<td>' + (d.solarUsed > 0 ? d.solarUsed+'kWh' : '\u2014') + '</td>';
  h += '<td style="font-weight:600">' + d.bat1600 + 'kWh</td>';
  h += '<td>' + d.exported + 'kWh</td>';
  h += '<td>\u00A3' + (d.expRev/100).toFixed(2) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + (d.suVal/100).toFixed(2) + '</td>';
  h += '<td style="color:#10b981">\u00A3' + (d.eveSaved/100).toFixed(2) + '</td>';
  h += '<td style="color:#ef4444">\u00A3' + (d.evCost/100).toFixed(2) + '</td>';
  h += '<td style="color:#3b82f6;font-weight:600">\u00A3' + (d.net/100).toFixed(2) + '</td>';
  h += '<td>' + d.endSoc + '%</td></tr>';
}
h += '</tbody></table></div>';

h += '<div class="note"><p><strong>v3 Smart Charging:</strong> Off-peak charge is reduced in summer because solar surplus will top up the battery for free. ';
h += 'Day-rate top-up at 15:00 only fills the gap if solar underperformed. House + heat pump run off battery 24/7 (saving import costs). ';
h += 'Evening self-use valued at IOF day rate (27.33p). Peak self-use valued at peak rate (38.26p). ';
h += 'Battery SOC carries over day-to-day. End SOC shows what is left after peak export + evening house use.</p></div>';

// Chart
var chartJs = readFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/scripts/iof-chart.js', 'utf8');
var dJson = JSON.stringify(days.map(function(d){ return {d:d.date.slice(5),net:d.net,month:d.m,bat:d.bat1600}; }));
var mJson = JSON.stringify(Object.keys(mt).map(function(m){ return {label:MN[m],exportRev:mt[m].exp,selfUse:mt[m].su,cost:mt[m].chg+mt[m].ev,net:mt[m].rev}; }));
h += '<script>\nvar monthData=' + mJson + ';\nvar dailyData=' + dJson + ';\n' + chartJs + '\n</script>';
h += '</body></html>';

writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/iof-365-v3.html', h);
console.log('\nWritten to output/iof-365-v3.html');
