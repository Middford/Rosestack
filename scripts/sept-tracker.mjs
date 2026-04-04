import postgres from 'postgres';
import { writeFileSync } from 'fs';

const sql = postgres('postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway', { ssl: 'require' });

const CAP = 322, EFF = 0.93, FLOOR = CAP * 0.05, MAX_CHG = 80*0.5*EFF, MAX_DIS = Math.min(80,66)*0.5;
const CYCLE_COST = 1.2;

const tfmt = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', hour:'2-digit', minute:'2-digit', hour12:false });
const dfmt = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' });
function toDate(iso) { var p = dfmt.formatToParts(new Date(iso)); return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value; }
function toSlot(iso) { var p = tfmt.formatToParts(new Date(iso)); return parseInt(p.find(x=>x.type==='hour').value)*2+(parseInt(p.find(x=>x.type==='minute').value)>=30?1:0); }

function solarSlot(slot) {
  var daily = 63.8;
  var dist = Math.abs(slot - 26); if (dist > 10) return 0;
  var raw = Math.exp(-0.5*(dist/5)**2), totalRaw = 0;
  for (var i=16;i<=36;i++){var d=Math.abs(i-26);if(d<=10)totalRaw+=Math.exp(-0.5*(d/5)**2);}
  return Math.min(raw*daily/totalRaw, 25*0.85*0.5);
}
function houseSlot(slot) {
  var base=24/48, profile=slot<12?0.6:slot<18?2.0:slot<32?1.0:slot<42?2.5:1.0;
  var avg=(12*0.6+6*2.0+14*1.0+10*2.5+6*1.0)/48, hp=0.3;
  var dem=base*(profile/avg);
  if(slot>=12&&slot<18)dem+=hp;else if(slot>=32&&slot<40)dem+=hp;else dem+=hp*0.3;
  return dem;
}

async function main() {
  var imp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type='import' AND valid_from>='2025-09-01T00:00:00Z' AND valid_from<'2025-10-01T00:00:00Z' ORDER BY valid_from`;
  var exp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type='export' AND valid_from>='2025-09-01T00:00:00Z' AND valid_from<'2025-10-01T00:00:00Z' ORDER BY valid_from`;

  var dayMap = {};
  for (var s of imp) { var d=toDate(s.valid_from),sl=toSlot(s.valid_from); if(!dayMap[d])dayMap[d]={imp:Array(48).fill(null),exp:Array(48).fill(null)}; dayMap[d].imp[sl]=s.value_inc_vat; }
  for (var s of exp) { var d=toDate(s.valid_from),sl=toSlot(s.valid_from); if(dayMap[d])dayMap[d].exp[sl]=s.value_inc_vat; }

  var dates = Object.keys(dayMap).sort();
  var batKwh = FLOOR;
  var allDays = [];

  for (var date of dates) {
    var impR = dayMap[date].imp, expR = dayMap[date].exp;
    if (impR.filter(x=>x!==null).length < 40) continue;
    for(var i=0;i<48;i++){if(impR[i]===null)impR[i]=20;if(expR[i]===null)expR[i]=10;}

    var cheapest=Math.min(...impR), peakImp=Math.max(...impR), peakExp=Math.max(...expR);
    var bestSpread=peakExp-(cheapest/EFF);
    var negCount=impR.filter(r=>r<=0).length;

    var strategy='hold';
    if(negCount>0)strategy=bestSpread>CYCLE_COST?'trade':'neg-only';
    else if(bestSpread>CYCLE_COST*2)strategy='trade';
    else if(bestSpread>CYCLE_COST)strategy='trade';

    var actions=Array(48).fill('idle');
    if(strategy==='trade'||strategy==='neg-only'){
      for(var i=0;i<48;i++){if(impR[i]<=0)actions[i]='charge-neg';else if(impR[i]<5&&strategy==='trade')actions[i]='charge';}
      if(strategy==='trade'){
        var sorted=impR.map((r,i)=>({i,r})).filter((_,i)=>actions[i]==='idle').sort((a,b)=>a.r-b.r);
        var needed=Math.ceil((CAP-batKwh)/MAX_CHG), assigned=0;
        for(var s of sorted){if(assigned>=needed)break;if(s.r<15){actions[s.i]='charge';assigned++;}}
        var expSorted=expR.map((r,i)=>({i,r})).filter((_,i)=>actions[i]==='idle').sort((a,b)=>b.r-a.r);
        for(var s of expSorted){if(actions[s.i]!=='idle')continue;if(s.r-(cheapest/EFF)-CYCLE_COST>0)actions[s.i]='discharge';}
      }
    }
    for(var i=0;i<48;i++){if(actions[i]==='idle'&&impR[i]>25&&batKwh>FLOOR+10)actions[i]='self-use';}

    var slots=[];
    for(var i=0;i<48;i++){
      var sol=solarSlot(i),house=houseSlot(i),chg=0,dis=0;
      if(sol>0){var ts=Math.min(sol,CAP-batKwh);batKwh+=ts;}
      if(batKwh>FLOOR+house)batKwh-=house;
      if(actions[i]==='charge-neg'||actions[i]==='charge'){var hd=CAP-batKwh;if(hd>0){var st=Math.min(MAX_CHG,hd);batKwh+=st;chg=st;}}
      else if(actions[i]==='discharge'){var av=batKwh-FLOOR;if(av>0){var ex=Math.min(MAX_DIS,av);batKwh-=ex;dis=ex;}}
      slots.push({slot:i,time:String(Math.floor(i/2)).padStart(2,'0')+':'+(i%2===0?'00':'30'),imp:impR[i],exp:expR[i],action:actions[i],charge:Math.round(chg*10)/10,discharge:Math.round(dis*10)/10,solar:Math.round(sol*10)/10,house:Math.round(house*10)/10,soc:Math.round(batKwh/CAP*100),batKwh:Math.round(batKwh)});
    }
    var dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date+'T12:00:00Z').getDay()];
    allDays.push({date,dow,strategy,negCount,cheapest:Math.round(cheapest*100)/100,peakImp:Math.round(peakImp*100)/100,peakExp:Math.round(peakExp*100)/100,slots});
  }

  // HTML
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>Agile September 2025 \u2014 Slot Rate Tracker</title>';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:16px}';
  h += 'h1{color:#fff;font-size:20px;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:16px}';
  h += '.day{background:#1a1a2e;border-radius:8px;margin-bottom:12px;border:1px solid #2a2a4a;overflow:hidden}';
  h += '.dh{padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2a2a4a;flex-wrap:wrap;gap:4px}';
  h += '.dh .dt{font-weight:600;color:#fff;font-size:14px}.dh .info{font-size:11px;color:#888}';
  h += '.tag{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600}';
  h += '.t-trade{background:#10b98120;color:#10b981}.t-hold{background:#f59e0b20;color:#f59e0b}.t-neg{background:#3b82f620;color:#3b82f6}';
  h += '.chart{display:flex;height:120px;padding:2px 0;position:relative}';
  h += '.chart2{display:flex;height:35px;border-top:1px solid #1f1f3a}';
  h += '.sl{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative;min-width:0}';
  h += '.b{width:70%;border-radius:2px 2px 0 0;min-height:0;position:relative;transition:height .2s}';
  h += '.b-i{background:#ef4444}.b-e{background:#10b981}.b-n{background:#3b82f6}';
  h += '.b-c{position:absolute;inset:0;background:rgba(59,130,246,0.4);border:1px solid #3b82f6;border-radius:2px}';
  h += '.b-d{position:absolute;inset:0;background:rgba(249,115,22,0.4);border:1px solid #f97316;border-radius:2px}';
  h += '.tl{font-size:6px;color:#555;margin-top:1px}';
  h += '.ds{padding:6px 12px;display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid #2a2a4a;font-size:10px;color:#888}';
  h += '.ds b{color:#ccc}';
  h += '.leg{display:flex;gap:10px;padding:6px 12px;flex-wrap:wrap;border-top:1px solid #2a2a4a}';
  h += '.leg span{font-size:9px;display:flex;align-items:center;gap:3px;color:#888}';
  h += '.dot{width:8px;height:8px;border-radius:2px;display:inline-block}';
  h += '.sl:hover .tip{display:block}.tip{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#0f0f1a;border:1px solid #3a3a5a;border-radius:4px;padding:4px 6px;font-size:9px;white-space:nowrap;z-index:10;color:#fff}';
  h += '</style></head><body>';

  h += '<h1>\u26A1 Agile Rate Tracker \u2014 September 2025</h1>';
  h += '<p class="sub">322kWh \u00B7 80kW inv \u00B7 66kW export \u00B7 25kWp solar | Top: import rates (red=positive, blue=negative) with charge/discharge overlay | Bottom: export rates (green)</p>';

  var maxR = 50;

  for (var day of allDays) {
    var tc = day.strategy==='trade'?'t-trade':day.strategy==='hold'?'t-hold':'t-neg';
    var totalChg = day.slots.reduce((s,sl)=>s+sl.charge,0);
    var totalDis = day.slots.reduce((s,sl)=>s+sl.discharge,0);
    var totalSol = day.slots.reduce((s,sl)=>s+sl.solar,0);

    h += '<div class="day">';
    h += '<div class="dh"><span class="dt">' + day.date + ' ' + day.dow + '</span>';
    h += '<span class="info">Neg:' + day.negCount + ' | Min:' + day.cheapest + 'p | Peak:' + day.peakImp + 'p | PkExp:' + day.peakExp + 'p</span>';
    h += '<span class="tag ' + tc + '">' + day.strategy.toUpperCase() + '</span></div>';

    // Import chart
    h += '<div class="chart">';
    for (var s of day.slots) {
      var impH = s.imp >= 0 ? (s.imp/maxR*100) : 0;
      var negH = s.imp < 0 ? (Math.abs(s.imp)/maxR*100) : 0;
      var overlay = '';
      if (s.charge > 0) overlay = '<div class="b-c"></div>';
      if (s.discharge > 0) overlay = '<div class="b-d"></div>';
      var barClass = s.imp >= 0 ? 'b-i' : 'b-n';
      var barH = s.imp >= 0 ? impH : negH;

      h += '<div class="sl">';
      h += '<div class="tip">' + s.time + ' imp:' + s.imp.toFixed(1) + 'p exp:' + s.exp.toFixed(1) + 'p ' + s.action + (s.charge>0?' chg:'+s.charge+'kWh':'') + (s.discharge>0?' dis:'+s.discharge+'kWh':'') + ' SOC:'+s.soc+'%</div>';
      h += '<div class="b ' + barClass + '" style="height:' + barH + '%">' + overlay + '</div>';
      if (s.slot%4===0) h += '<div class="tl">' + s.time + '</div>';
      h += '</div>';
    }
    h += '</div>';

    // Export chart
    h += '<div class="chart2">';
    for (var s of day.slots) {
      h += '<div class="sl"><div class="b b-e" style="height:' + (s.exp/maxR*100) + '%"></div></div>';
    }
    h += '</div>';

    h += '<div class="ds">';
    h += '<span>SOC: <b>' + day.slots[0].soc + '% \u2192 ' + day.slots[47].soc + '%</b></span>';
    h += '<span>Charged: <b>' + totalChg.toFixed(0) + 'kWh</b></span>';
    h += '<span>Discharged: <b>' + totalDis.toFixed(0) + 'kWh</b></span>';
    h += '<span>Solar: <b>' + totalSol.toFixed(0) + 'kWh</b></span>';
    h += '</div>';
    h += '</div>';
  }

  h += '<div style="margin-top:16px;padding:8px 12px;background:#1a1a2e;border-radius:8px;border:1px solid #2a2a4a">';
  h += '<div class="leg">';
  h += '<span><span class="dot" style="background:#ef4444"></span>Import rate</span>';
  h += '<span><span class="dot" style="background:#10b981"></span>Export rate</span>';
  h += '<span><span class="dot" style="background:#3b82f6"></span>Negative import</span>';
  h += '<span><span class="dot" style="background:rgba(59,130,246,0.4);border:1px solid #3b82f6"></span>Charging</span>';
  h += '<span><span class="dot" style="background:rgba(249,115,22,0.4);border:1px solid #f97316"></span>Discharging</span>';
  h += '</div></div>';

  h += '</body></html>';

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/agile-sept-tracker.html', h);
  console.log('Written ' + allDays.length + ' days');
  await sql.end();
}
main().catch(e => { console.error(e); process.exit(1); });
