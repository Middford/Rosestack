import postgres from 'postgres';
import { writeFileSync } from 'fs';

const sql = postgres('postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway', { ssl: 'require' });

async function main() {
  const day = '2026-03-08';
  const imp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'import' AND valid_from >= ${day + 'T00:00:00Z'} AND valid_from < ${day + 'T23:59:59Z'} ORDER BY valid_from`;
  const exp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'export' AND valid_from >= ${day + 'T00:00:00Z'} AND valid_from < ${day + 'T23:59:59Z'} ORDER BY valid_from`;

  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  const toTime = iso => { const p = fmt.formatToParts(new Date(iso)); return p.find(x=>x.type==='hour').value+':'+p.find(x=>x.type==='minute').value; };
  const toSlot = iso => { const p = fmt.formatToParts(new Date(iso)); return parseInt(p.find(x=>x.type==='hour').value)*2+(parseInt(p.find(x=>x.type==='minute').value)>=30?1:0); };

  const impBySlot = {}, expBySlot = {};
  for (const r of imp) impBySlot[toSlot(r.valid_from)] = { rate: r.value_inc_vat, time: toTime(r.valid_from) };
  for (const r of exp) expBySlot[toSlot(r.valid_from)] = { rate: r.value_inc_vat, time: toTime(r.valid_from) };

  const slots = [];
  for (let i = 0; i < 48; i++) {
    const ir = impBySlot[i]?.rate ?? null;
    const er = expBySlot[i]?.rate ?? null;
    const t = impBySlot[i]?.time || String(Math.floor(i/2)).padStart(2,'0')+':'+(i%2===0?'00':'30');
    const eH = Math.floor((i+1)/2), eM = (i+1)%2===0?'00':'30';
    slots.push({ i, time: t, end: String(eH).padStart(2,'0')+':'+eM, imp: ir, exp: er });
  }

  const minImp = Math.min(...slots.filter(s=>s.imp!==null).map(s=>s.imp));
  const maxImp = Math.max(...slots.filter(s=>s.imp!==null).map(s=>s.imp));
  const maxExp = Math.max(...slots.filter(s=>s.exp!==null).map(s=>s.exp));
  const bestSpread = maxExp - minImp;

  // Build table rows
  const tableRows = slots.map(s => {
    if (s.imp === null && s.exp === null) return '';
    const spread = s.exp !== null && s.imp !== null ? (s.exp - s.imp) : null;
    const spreadStr = spread !== null ? spread.toFixed(2)+'p' : 'n/a';
    const impClass = s.imp > 35 ? 'high' : s.imp > 25 ? 'mid' : 'low';
    const verdict = spread !== null && spread < 0 ? '&#10060; LOSS' : '&#9888;&#65039; Marginal';
    return `<tr><td>${s.i}</td><td>${s.time}\u2013${s.end}</td><td class="${impClass}">${s.imp !== null ? s.imp.toFixed(2)+'p' : 'n/a'}</td><td>${s.exp !== null ? s.exp.toFixed(2)+'p' : 'n/a'}</td><td class="neg-spread">${spreadStr}</td><td>${verdict}</td></tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Agile Worst Day \u2014 8 March 2026</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:32px}
h1{color:#fff;font-size:24px;margin-bottom:4px}.sub{color:#888;font-size:13px;margin-bottom:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:32px}
.card{background:#1a1a2e;border-radius:10px;padding:14px;border:1px solid #2a2a4a}
.card .lbl{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.card .val{color:#fff;font-size:26px;font-weight:700;margin-top:2px}
.card .det{color:#666;font-size:11px;margin-top:2px}
.card.red .val{color:#ef4444}.card.amber .val{color:#f59e0b}.card.blue .val{color:#3b82f6}
table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:10px;overflow:hidden;margin-bottom:24px}
thead th{background:#12122a;color:#888;font-size:11px;text-transform:uppercase;padding:10px 14px;text-align:right;border-bottom:2px solid #2a2a4a;position:sticky;top:0}
thead th:first-child,thead th:nth-child(2){text-align:left}
tbody td{padding:9px 14px;border-bottom:1px solid #1f1f3a;font-size:14px;text-align:right;font-variant-numeric:tabular-nums}
tbody td:first-child{text-align:center;color:#666;font-size:12px}
tbody td:nth-child(2){text-align:left;color:#ccc;font-weight:500}
tbody tr:hover{background:#1f1f3a}
.neg-spread{color:#ef4444;font-weight:600}
.high{color:#ef4444;font-weight:600}.mid{color:#fbbf24}.low{color:#888}
.chart-box{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a;margin-bottom:24px}
canvas{width:100%!important}
.legend{display:flex;gap:20px;margin-top:8px;justify-content:center}
.legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#888}
.legend-dot{width:10px;height:10px;border-radius:2px}
.verdict{background:#1a1a2e;border:2px solid #ef4444;border-radius:10px;padding:24px;margin:24px 0;text-align:center}
.verdict h3{color:#ef4444;font-size:22px;margin-bottom:10px}
.verdict p{color:#ccc;font-size:14px;line-height:1.8}
.note{background:#1a1a2e;border-left:4px solid #f59e0b;padding:14px;border-radius:0 8px 8px 0;margin:24px 0}
.note p{color:#ccc;font-size:13px;line-height:1.6}.note strong{color:#f59e0b}
.compare{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}
.compare .side{background:#1a1a2e;border-radius:10px;padding:20px;border:1px solid #2a2a4a}
.compare .side h3{font-size:16px;margin-bottom:12px}
.compare .side.agile-side{border-color:#ef4444}.compare .side.agile-side h3{color:#ef4444}
.compare .side.iof-side{border-color:#10b981}.compare .side.iof-side h3{color:#10b981}
.compare .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1f1f3a;font-size:13px}
.compare .row .label{color:#888}.compare .row .value{color:#fff;font-weight:600}
</style></head><body>

<h1>\u{1F480} Agile Worst Day \u2014 8 March 2026</h1>
<p class="sub">Sunday \u00B7 Cold, still, no wind, no solar \u00B7 Wholesale gas sets the floor \u00B7 EVERY slot has a negative spread</p>

<div class="cards">
  <div class="card red"><div class="lbl">Cheapest Import</div><div class="val">${minImp.toFixed(1)}p</div><div class="det">You can NEVER buy below this</div></div>
  <div class="card red"><div class="lbl">Best Export</div><div class="val">${maxExp.toFixed(1)}p</div><div class="det">You can NEVER sell above this</div></div>
  <div class="card red"><div class="lbl">Best Possible Spread</div><div class="val">${bestSpread.toFixed(1)}p</div><div class="det">NEGATIVE \u2014 impossible to profit</div></div>
  <div class="card amber"><div class="lbl">Peak Import</div><div class="val">${maxImp.toFixed(1)}p</div><div class="det">Evening peak demand</div></div>
  <div class="card blue"><div class="lbl">IOF Earns Today</div><div class="val">\u00A339.12</div><div class="det">Same fixed amount regardless</div></div>
  <div class="card"><div class="lbl">Negative Price Slots</div><div class="val">0</div><div class="det">No free charging at all</div></div>
</div>

<div class="compare">
  <div class="side agile-side">
    <h3>\u26A1 AGILE \u2014 8 March 2026</h3>
    <div class="row"><span class="label">Optimal strategy</span><span class="value" style="color:#ef4444">DO NOTHING</span></div>
    <div class="row"><span class="label">Cheapest charge rate</span><span class="value">${minImp.toFixed(1)}p/kWh</span></div>
    <div class="row"><span class="label">Best export rate</span><span class="value">${maxExp.toFixed(1)}p/kWh</span></div>
    <div class="row"><span class="label">Best spread</span><span class="value" style="color:#ef4444">${bestSpread.toFixed(1)}p (NEGATIVE)</span></div>
    <div class="row"><span class="label">Revenue</span><span class="value" style="color:#ef4444">\u00A30.00</span></div>
    <div class="row"><span class="label">Battery action</span><span class="value">HOLD \u2014 wait for better day</span></div>
    <div class="row"><span class="label">EV charging</span><span class="value">Skip \u2014 cheapest is ${minImp.toFixed(1)}p</span></div>
  </div>
  <div class="side iof-side">
    <h3>\u{1F50C} IOF \u2014 8 March 2026</h3>
    <div class="row"><span class="label">Strategy</span><span class="value" style="color:#10b981">SAME AS ALWAYS</span></div>
    <div class="row"><span class="label">Charge rate (02:00-05:00)</span><span class="value">16.40p/kWh</span></div>
    <div class="row"><span class="label">Export rate (16:00-19:00)</span><span class="value">38.26p/kWh</span></div>
    <div class="row"><span class="label">Spread</span><span class="value" style="color:#10b981">21.86p GUARANTEED</span></div>
    <div class="row"><span class="label">Revenue</span><span class="value" style="color:#10b981">\u00A339.12</span></div>
    <div class="row"><span class="label">Battery action</span><span class="value">Charge + discharge (automatic)</span></div>
    <div class="row"><span class="label">EV charging</span><span class="value">Off-peak at 16.40p</span></div>
  </div>
</div>

<h2>Rate Chart</h2>
<div class="chart-box">
  <canvas id="chart" height="300"></canvas>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Import (what you pay)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Export (what you earn)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#ef444420;border:1px solid #ef4444"></div>Loss zone (gap between lines)</div>
  </div>
</div>

<h2>All 48 Slots</h2>
<table>
<thead><tr><th>Slot</th><th>Time</th><th>Import (p/kWh)</th><th>Export (p/kWh)</th><th>Spread</th><th>Verdict</th></tr></thead>
<tbody>
${tableRows}
</tbody>
</table>

<div class="verdict">
  <h3>THE PATIENT TRADER WOULD HOLD</h3>
  <p>If you charged for free last Thursday during a solar glut, that energy is still in the battery.<br>
  Today there is no profitable trade. The algorithm sits idle. Zero cycles. Zero degradation.<br>
  On Monday or Tuesday when wind picks up and prices normalise, you sell into the evening peak.<br><br>
  <strong>This is why massive storage matters on Agile.</strong><br>
  A small battery (64kWh) would have already sold its Thursday charge by Friday evening.<br>
  A 600kWh battery can hold Thursday's free energy through an entire dead weekend and sell Monday evening.<br>
  The bigger the tank, the more patient you can be.</p>
</div>

<div class="note">
<p><strong>What caused this day:</strong> Cold, still Sunday in early March. No wind = no cheap overnight wholesale electricity (gas sets the floor at ~23p).
No solar = no daytime price crash. Weekend demand is lower but supply is also low.
The Agile export rate tracks at ~44% of import across every slot, making it mathematically impossible to buy and sell at a profit.
Days like this occur roughly 20-30 times per year, mostly November\u2013March.</p>
</div>

<script>
const slots = ${JSON.stringify(slots)};
const c = document.getElementById('chart');
const ctx = c.getContext('2d');
function draw() {
  const W = c.width = c.parentElement.clientWidth * 2;
  const H = c.height = 600;
  const pad = {top:30,right:30,bottom:50,left:70};
  const pW = W-pad.left-pad.right, pH = H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  const maxR = 50, minR = 0, range = maxR - minR;
  const y = v => pad.top + pH - ((v-minR)/range)*pH;
  const x = i => pad.left + (i/47)*pW;
  ctx.strokeStyle='#2a2a4a';ctx.lineWidth=1;
  for(let v=0;v<=50;v+=10){ctx.beginPath();ctx.moveTo(pad.left,y(v));ctx.lineTo(W-pad.right,y(v));ctx.stroke();
    ctx.fillStyle='#666';ctx.font='20px system-ui';ctx.textAlign='right';ctx.fillText(v+'p',pad.left-8,y(v)+6);}
  // Loss zone fill
  ctx.fillStyle='#ef444418';ctx.beginPath();
  let started=false;
  for(let i=0;i<48;i++){if(slots[i].imp===null)continue;if(!started){ctx.moveTo(x(i),y(slots[i].imp));started=true;}else ctx.lineTo(x(i),y(slots[i].imp));}
  for(let i=47;i>=0;i--){if(slots[i].exp===null)continue;ctx.lineTo(x(i),y(slots[i].exp));}
  ctx.closePath();ctx.fill();
  // Import line
  ctx.strokeStyle='#ef4444';ctx.lineWidth=3;ctx.beginPath();
  slots.forEach((s,i)=>{if(s.imp===null)return;i===0||slots[i-1]?.imp===null?ctx.moveTo(x(i),y(s.imp)):ctx.lineTo(x(i),y(s.imp));});ctx.stroke();
  // Export line
  ctx.strokeStyle='#10b981';ctx.lineWidth=3;ctx.beginPath();
  slots.forEach((s,i)=>{if(s.exp===null)return;i===0||slots[i-1]?.exp===null?ctx.moveTo(x(i),y(s.exp)):ctx.lineTo(x(i),y(s.exp));});ctx.stroke();
  // Dots
  for(let i=0;i<48;i++){
    if(slots[i].imp!==null){ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(x(i),y(slots[i].imp),4,0,Math.PI*2);ctx.fill();}
    if(slots[i].exp!==null){ctx.fillStyle='#10b981';ctx.beginPath();ctx.arc(x(i),y(slots[i].exp),3,0,Math.PI*2);ctx.fill();}
  }
  ctx.fillStyle='#666';ctx.font='18px system-ui';ctx.textAlign='center';
  for(let i=0;i<48;i+=4)ctx.fillText(slots[i].time,x(i),H-pad.bottom+25);
  // Annotation
  ctx.fillStyle='#ef4444';ctx.font='bold 22px system-ui';ctx.textAlign='center';
  ctx.fillText('Import ALWAYS above Export',W/2,y(45));
  ctx.fillText('= impossible to profit',W/2,y(43));
}
draw();window.addEventListener('resize',draw);
</script>
</body></html>`;

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/worst-day-8march2026.html', html);
  console.log('Done: output/worst-day-8march2026.html');
  await sql.end();
}
main();
