import postgres from 'postgres';
import { writeFileSync } from 'fs';

const sql = postgres('postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway', { ssl: 'require' });

const dfmt = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' });
const tfmt = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', hour:'2-digit', minute:'2-digit', hour12:false });
function toDate(iso) { var p=dfmt.formatToParts(new Date(iso)); return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value; }
function toSlot(iso) { var p=tfmt.formatToParts(new Date(iso)); return parseInt(p.find(x=>x.type==='hour').value)*2+(parseInt(p.find(x=>x.type==='minute').value)>=30?1:0); }

async function main() {
  var imp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type='import' AND valid_from>='2025-09-01T00:00:00Z' AND valid_from<'2025-10-01T00:00:00Z' ORDER BY valid_from`;
  var exp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type='export' AND valid_from>='2025-09-01T00:00:00Z' AND valid_from<'2025-10-01T00:00:00Z' ORDER BY valid_from`;

  var dayMap = {};
  for (var s of imp) { var d=toDate(s.valid_from),sl=toSlot(s.valid_from); if(!dayMap[d])dayMap[d]={imp:Array(48).fill(null),exp:Array(48).fill(null)}; dayMap[d].imp[sl]=s.value_inc_vat; }
  for (var s of exp) { var d=toDate(s.valid_from),sl=toSlot(s.valid_from); if(dayMap[d])dayMap[d].exp[sl]=s.value_inc_vat; }

  var dates = Object.keys(dayMap).sort();
  var allDays = [];

  for (var date of dates) {
    var impR=dayMap[date].imp, expR=dayMap[date].exp;
    if(impR.filter(x=>x!==null).length<40)continue;
    for(var i=0;i<48;i++){if(impR[i]===null)impR[i]=20;if(expR[i]===null)expR[i]=10;}
    var cheapest=Math.min(...impR), peakImp=Math.max(...impR), peakExp=Math.max(...expR);
    var negCount=impR.filter(r=>r<=0).length;
    var dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date+'T12:00:00Z').getDay()];
    allDays.push({date,dow,impR,expR,cheapest:Math.round(cheapest*100)/100,peakImp:Math.round(peakImp*100)/100,peakExp:Math.round(peakExp*100)/100,negCount});
  }

  // Serialize the data for the client-side JS
  var dayDataJson = JSON.stringify(allDays.map(d => ({
    date: d.date, dow: d.dow, imp: d.impR, exp: d.expR,
    cheapest: d.cheapest, peakImp: d.peakImp, peakExp: d.peakExp, neg: d.negCount
  })));

  // Build HTML with canvas charts
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>Agile September 2025 \u2014 Import vs Export Line Charts</title>';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:16px}';
  h += 'h1{color:#fff;font-size:20px;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:16px}';
  h += '.day{background:#1a1a2e;border-radius:8px;margin-bottom:12px;border:1px solid #2a2a4a;overflow:hidden}';
  h += '.dh{padding:8px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;border-bottom:1px solid #2a2a4a}';
  h += '.dh .dt{font-weight:600;color:#fff;font-size:14px}.dh .info{font-size:11px;color:#888}';
  h += '.dh .spread{font-size:11px;font-weight:600}';
  h += '.spread-good{color:#10b981}.spread-bad{color:#ef4444}.spread-meh{color:#f59e0b}';
  h += 'canvas{width:100%!important;display:block}';
  h += '.leg{display:flex;gap:12px;padding:6px 12px;border-top:1px solid #2a2a4a;flex-wrap:wrap}';
  h += '.leg span{font-size:10px;display:flex;align-items:center;gap:4px;color:#888}';
  h += '.dot{width:10px;height:3px;display:inline-block;border-radius:1px}';
  h += '</style></head><body>';

  h += '<h1>\u26A1 Agile Import vs Export \u2014 September 2025</h1>';
  h += '<p class="sub">322kWh system \u00B7 Red line = import (what you pay) \u00B7 Green line = export (what you earn) \u00B7 Blue fill = negative pricing zone \u00B7 Where green crosses above red = profitable export</p>';

  // One card per day with a canvas
  for (var i = 0; i < allDays.length; i++) {
    var d = allDays[i];
    var spread = d.peakExp - d.cheapest;
    var spreadClass = spread > 15 ? 'spread-good' : spread > 5 ? 'spread-meh' : 'spread-bad';

    h += '<div class="day">';
    h += '<div class="dh">';
    h += '<span class="dt">' + d.date + ' ' + d.dow + '</span>';
    h += '<span class="info">Min: ' + d.cheapest + 'p | Peak: ' + d.peakImp + 'p | Peak Exp: ' + d.peakExp + 'p | Neg slots: ' + d.negCount + '</span>';
    h += '<span class="spread ' + spreadClass + '">Spread: ' + spread.toFixed(1) + 'p</span>';
    h += '</div>';
    h += '<canvas id="c' + i + '" height="160"></canvas>';
    h += '</div>';
  }

  h += '<div style="margin:16px 0;padding:8px 12px;background:#1a1a2e;border-radius:8px;border:1px solid #2a2a4a">';
  h += '<div class="leg">';
  h += '<span><span class="dot" style="background:#ef4444"></span> Import rate (you pay)</span>';
  h += '<span><span class="dot" style="background:#10b981"></span> Export rate (you earn)</span>';
  h += '<span><span class="dot" style="background:#3b82f640;border:1px solid #3b82f6;height:10px;width:10px;border-radius:2px"></span> Negative pricing zone</span>';
  h += '<span><span class="dot" style="background:#f59e0b"></span> Zero line</span>';
  h += '<span style="color:#10b981;font-weight:600">\u2191 Where green > red = profitable window</span>';
  h += '</div></div>';

  h += '<script>';
  h += 'var days = ' + dayDataJson + ';\n';
  h += 'function drawDay(idx) {\n';
  h += '  var d = days[idx], c = document.getElementById("c"+idx);\n';
  h += '  var W = c.width = c.parentElement.clientWidth * 2, H = c.height = 320;\n';
  h += '  var ctx = c.getContext("2d");\n';
  h += '  var pad = {top:25, right:20, bottom:30, left:50};\n';
  h += '  var pW = W-pad.left-pad.right, pH = H-pad.top-pad.bottom;\n';
  h += '  ctx.clearRect(0,0,W,H);\n';
  h += '  var allRates = d.imp.concat(d.exp);\n';
  h += '  var maxR = Math.max(Math.max.apply(null, allRates) * 1.1, 5);\n';
  h += '  var minR = Math.min(Math.min.apply(null, allRates) * 1.1, -1);\n';
  h += '  var range = maxR - minR;\n';
  h += '  var y = function(v) { return pad.top + pH - ((v - minR) / range) * pH; };\n';
  h += '  var x = function(i) { return pad.left + (i / 47) * pW; };\n';

  // Grid lines
  h += '  ctx.strokeStyle = "#2a2a4a"; ctx.lineWidth = 1;\n';
  h += '  for (var v = Math.ceil(minR/10)*10; v <= maxR; v += 10) {\n';
  h += '    ctx.beginPath(); ctx.moveTo(pad.left, y(v)); ctx.lineTo(W-pad.right, y(v)); ctx.stroke();\n';
  h += '    ctx.fillStyle = "#666"; ctx.font = "18px system-ui"; ctx.textAlign = "right";\n';
  h += '    ctx.fillText(v + "p", pad.left - 6, y(v) + 5);\n';
  h += '  }\n';

  // Zero line
  h += '  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1; ctx.setLineDash([4,4]);\n';
  h += '  ctx.beginPath(); ctx.moveTo(pad.left, y(0)); ctx.lineTo(W-pad.right, y(0)); ctx.stroke();\n';
  h += '  ctx.setLineDash([]);\n';

  // Negative zone fill
  h += '  ctx.fillStyle = "#3b82f610";\n';
  h += '  for (var i = 0; i < 48; i++) {\n';
  h += '    if (d.imp[i] < 0) {\n';
  h += '      var x1 = x(Math.max(0, i-0.5)), x2 = x(Math.min(47, i+0.5));\n';
  h += '      ctx.fillRect(x1, pad.top, x2-x1, pH);\n';
  h += '    }\n';
  h += '  }\n';

  // Fill between lines where export > import (profitable zone)
  h += '  ctx.fillStyle = "#10b98115";\n';
  h += '  ctx.beginPath();\n';
  h += '  var inProfit = false;\n';
  h += '  for (var i = 0; i < 48; i++) {\n';
  h += '    if (d.exp[i] > d.imp[i]) {\n';
  h += '      if (!inProfit) { ctx.moveTo(x(i), y(d.imp[i])); inProfit = true; }\n';
  h += '      ctx.lineTo(x(i), y(d.imp[i]));\n';
  h += '    } else if (inProfit) {\n';
  h += '      for (var j = i-1; j >= 0; j--) {\n';
  h += '        if (d.exp[j] <= d.imp[j]) break;\n';
  h += '        ctx.lineTo(x(j), y(d.exp[j]));\n';
  h += '      }\n';
  h += '      ctx.closePath(); ctx.fill(); ctx.beginPath(); inProfit = false;\n';
  h += '    }\n';
  h += '  }\n';
  h += '  if (inProfit) {\n';
  h += '    for (var j = 47; j >= 0; j--) {\n';
  h += '      if (d.exp[j] > d.imp[j]) ctx.lineTo(x(j), y(d.exp[j]));\n';
  h += '      else break;\n';
  h += '    }\n';
  h += '    ctx.closePath(); ctx.fill();\n';
  h += '  }\n';

  // Import line (red, thick)
  h += '  ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.beginPath();\n';
  h += '  for (var i = 0; i < 48; i++) { i === 0 ? ctx.moveTo(x(i), y(d.imp[i])) : ctx.lineTo(x(i), y(d.imp[i])); }\n';
  h += '  ctx.stroke();\n';

  // Export line (green, thick)
  h += '  ctx.strokeStyle = "#10b981"; ctx.lineWidth = 3; ctx.beginPath();\n';
  h += '  for (var i = 0; i < 48; i++) { i === 0 ? ctx.moveTo(x(i), y(d.exp[i])) : ctx.lineTo(x(i), y(d.exp[i])); }\n';
  h += '  ctx.stroke();\n';

  // Dots on negative import slots
  h += '  for (var i = 0; i < 48; i++) {\n';
  h += '    if (d.imp[i] < 0) { ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(x(i), y(d.imp[i]), 4, 0, Math.PI*2); ctx.fill(); }\n';
  h += '  }\n';

  // Crossover points (where export crosses above import)
  h += '  for (var i = 1; i < 48; i++) {\n';
  h += '    var prevDiff = d.exp[i-1] - d.imp[i-1], currDiff = d.exp[i] - d.imp[i];\n';
  h += '    if ((prevDiff <= 0 && currDiff > 0) || (prevDiff > 0 && currDiff <= 0)) {\n';
  h += '      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(x(i), y(d.imp[i]), 6, 0, Math.PI*2); ctx.fill();\n';
  h += '      ctx.fillStyle = "#000"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center"; ctx.fillText("X", x(i), y(d.imp[i])+4);\n';
  h += '    }\n';
  h += '  }\n';

  // X axis labels
  h += '  ctx.fillStyle = "#666"; ctx.font = "16px system-ui"; ctx.textAlign = "center";\n';
  h += '  for (var i = 0; i < 48; i += 4) {\n';
  h += '    var h2 = Math.floor(i/2), m = i%2===0?"00":"30";\n';
  h += '    ctx.fillText(String(h2).padStart(2,"0")+":"+m, x(i), H - pad.bottom + 18);\n';
  h += '  }\n';

  // Peak labels
  h += '  var maxImp = Math.max.apply(null, d.imp), maxExp = Math.max.apply(null, d.exp);\n';
  h += '  var maxImpIdx = d.imp.indexOf(maxImp), maxExpIdx = d.exp.indexOf(maxExp);\n';
  h += '  ctx.fillStyle = "#ef4444"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "left";\n';
  h += '  ctx.fillText(maxImp.toFixed(1)+"p", x(maxImpIdx)+8, y(maxImp)-4);\n';
  h += '  ctx.fillStyle = "#10b981";\n';
  h += '  ctx.fillText(maxExp.toFixed(1)+"p", x(maxExpIdx)+8, y(maxExp)+14);\n';

  // Min import label
  h += '  var minImp = Math.min.apply(null, d.imp), minImpIdx = d.imp.indexOf(minImp);\n';
  h += '  if (minImp < 5) { ctx.fillStyle = minImp < 0 ? "#3b82f6" : "#888"; ctx.fillText(minImp.toFixed(1)+"p", x(minImpIdx)+8, y(minImp)+14); }\n';

  h += '}\n';

  // Draw all on load + resize
  h += 'function drawAll() { for (var i = 0; i < days.length; i++) drawDay(i); }\n';
  h += 'drawAll();\n';
  h += 'window.addEventListener("resize", drawAll);\n';
  h += '</script></body></html>';

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/agile-sept-lines.html', h);
  console.log('Written ' + allDays.length + ' days with line charts');
  await sql.end();
}
main().catch(e => { console.error(e); process.exit(1); });
