import postgres from 'postgres';
import { writeFileSync } from 'fs';

const sql = postgres('postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway', { ssl: 'require' });

const dfmt = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' });
const tfmt = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', hour:'2-digit', minute:'2-digit', hour12:false });
function toDate(iso) { var p=dfmt.formatToParts(new Date(iso)); return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value; }
function toSlot(iso) { var p=tfmt.formatToParts(new Date(iso)); return parseInt(p.find(x=>x.type==='hour').value)*2+(parseInt(p.find(x=>x.type==='minute').value)>=30?1:0); }

// System params
var CAP=322, EFF=0.93, FLOOR=CAP*0.05, MAX_CHG=80*0.5*EFF, MAX_DIS=Math.min(80,66)*0.5, CYCLE_COST=1.2;

var SOLAR_DAILY=[0,21.8,36.2,58.1,78.8,90.7,97.5,90.7,76.2,63.8,39.9,22.5,14.5];
function solarSlot(slot, month) {
  var daily=SOLAR_DAILY[month]||0, dist=Math.abs(slot-26); if(dist>10||daily<=0)return 0;
  var raw=Math.exp(-0.5*(dist/5)**2), totalRaw=0;
  for(var i=16;i<=36;i++){var d=Math.abs(i-26);if(d<=10)totalRaw+=Math.exp(-0.5*(d/5)**2);}
  return Math.min(raw*daily/totalRaw, 25*0.85*0.5);
}
function houseSlot(slot, month) {
  var base=24/48, profile=slot<12?0.6:slot<18?2.0:slot<32?1.0:slot<42?2.5:1.0;
  var avg=(12*0.6+6*2.0+14*1.0+10*2.5+6*1.0)/48;
  var hp=[0,0.8,0.8,0.5,0.3,0.1,0,0,0.1,0.3,0.5,0.8,0.8][month]||0;
  var dem=base*(profile/avg);
  if(slot>=12&&slot<18)dem+=hp;else if(slot>=32&&slot<40)dem+=hp;else dem+=hp*0.3;
  return dem;
}

async function main() {
  // Full year: last 365 days
  var fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 365);
  var imp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type='import' AND valid_from>=${fromDate.toISOString()} ORDER BY valid_from`;
  var exp = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type='export' AND valid_from>=${fromDate.toISOString()} ORDER BY valid_from`;

  var dayMap = {};
  for(var s of imp){var d=toDate(s.valid_from),sl=toSlot(s.valid_from);if(!dayMap[d])dayMap[d]={imp:Array(48).fill(null),exp:Array(48).fill(null)};dayMap[d].imp[sl]=s.value_inc_vat;}
  for(var s of exp){var d=toDate(s.valid_from),sl=toSlot(s.valid_from);if(dayMap[d])dayMap[d].exp[sl]=s.value_inc_vat;}

  var dates = Object.keys(dayMap).sort();
  var batKwh = FLOOR;
  var allDays = [];

  for(var date of dates) {
    var impR=dayMap[date].imp, expR=dayMap[date].exp;
    if(impR.filter(x=>x!==null).length<40)continue;
    for(var i=0;i<48;i++){if(impR[i]===null)impR[i]=20;if(expR[i]===null)expR[i]=10;}

    var month=parseInt(date.slice(5,7));
    var cheapest=Math.min(...impR), peakImp=Math.max(...impR), peakExp=Math.max(...expR);
    var bestSpread=peakExp-(cheapest/EFF);
    var negCount=impR.filter(r=>r<=0).length;
    var dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date+'T12:00:00Z').getDay()];

    var strategy='hold';
    if(negCount>0)strategy=bestSpread>CYCLE_COST?'trade':'neg-only';
    else if(bestSpread>CYCLE_COST*2)strategy='trade';
    else if(bestSpread>CYCLE_COST)strategy='trade';

    // Actions — PAIRED approach: every discharge must have a profitable charge partner
    var actions=Array(48).fill('idle');

    // Always charge on negative
    for(var i=0;i<48;i++){if(impR[i]<=0)actions[i]='charge';}

    if(strategy==='trade'){
      // Candidate charges: cheapest first (not already neg-assigned)
      var chargeCands=impR.map((r,i)=>({i,r})).filter(s=>actions[s.i]==='idle'&&s.r<20).sort((a,b)=>a.r-b.r);
      // Candidate discharges: most expensive first
      var disCands=expR.map((r,i)=>({i,r})).filter(s=>actions[s.i]==='idle').sort((a,b)=>b.r-a.r);

      var usedC=new Set(), usedD=new Set();
      for(var ds of disCands){
        var bestC=chargeCands.find(c=>!usedC.has(c.i)&&c.i<ds.i);
        if(!bestC)continue;
        var spread=ds.r-(bestC.r/EFF)-CYCLE_COST;
        if(spread>0){
          actions[bestC.i]='charge'; actions[ds.i]='discharge';
          usedC.add(bestC.i); usedD.add(ds.i);
        }
      }
    }

    // Execute and track SOC — solar powers house first, then battery, then export
    var slotData = [];
    for(var i=0;i<48;i++){
      var sol=solarSlot(i,month), house=houseSlot(i,month), chg=0, dis=0;
      // Solar → house first
      var solR=sol, hR=house;
      if(solR>0&&hR>0){var s2h=Math.min(solR,hR);solR-=s2h;hR-=s2h;}
      // Solar → battery
      if(solR>0){var ts=Math.min(solR,CAP-batKwh);batKwh+=ts;solR-=ts;}
      // Solar → grid (battery full)
      if(solR>0.01)dis+=solR;
      // House → battery (always, not just expensive slots)
      if(hR>0&&batKwh>FLOOR+hR){batKwh-=hR;hR=0;}
      // Grid charge/discharge actions
      if(actions[i]==='charge'){var hd=CAP-batKwh;if(hd>0){var st=Math.min(MAX_CHG,hd);batKwh+=st;chg=st;}}
      else if(actions[i]==='discharge'){var av=batKwh-FLOOR;if(av>0){var ex=Math.min(MAX_DIS,av);batKwh-=ex;dis+=ex;}}
      slotData.push({ action: actions[i], chg: Math.round(chg*10)/10, dis: Math.round(dis*10)/10, soc: Math.round(batKwh/CAP*100) });
    }

    allDays.push({
      date, dow, imp: impR, exp: expR, actions: slotData.map(s => s.action),
      chgs: slotData.map(s => s.chg), diss: slotData.map(s => s.dis), socs: slotData.map(s => s.soc),
      cheapest: Math.round(cheapest*100)/100, peakImp: Math.round(peakImp*100)/100,
      peakExp: Math.round(peakExp*100)/100, negCount, strategy,
      totalChg: slotData.reduce((s,sl) => s+sl.chg, 0), totalDis: slotData.reduce((s,sl) => s+sl.dis, 0),
      endSoc: slotData[47].soc,
    });
  }

  var dayDataJson = JSON.stringify(allDays);

  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>Agile September 2025 \u2014 Rate + Action Tracker</title>';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;padding:16px}';
  h += 'h1{color:#fff;font-size:20px;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:16px}';
  h += '.day{background:#1a1a2e;border-radius:8px;margin-bottom:12px;border:1px solid #2a2a4a;overflow:hidden}';
  h += '.dh{padding:8px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;border-bottom:1px solid #2a2a4a}';
  h += '.dh .dt{font-weight:600;color:#fff;font-size:14px}.dh .info{font-size:11px;color:#888}';
  h += '.tag{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600}';
  h += '.t-trade{background:#10b98120;color:#10b981}.t-hold{background:#f59e0b20;color:#f59e0b}.t-neg{background:#3b82f620;color:#3b82f6}';
  h += 'canvas{width:100%!important;display:block}';
  h += '.ds{padding:8px 12px;display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid #2a2a4a;font-size:11px;color:#888}.ds b{color:#ccc}';
  h += '.dp-great{color:#10b981;font-weight:700;font-size:13px}.dp-good{color:#10b981;font-weight:600}.dp-ok{color:#f59e0b;font-weight:600}.dp-loss{color:#ef4444;font-weight:700;font-size:13px}';
  h += '.leg{display:flex;gap:10px;padding:8px 16px;flex-wrap:wrap;background:#1a1a2e;border-radius:8px;border:1px solid #2a2a4a;margin-bottom:16px}';
  h += '.leg span{font-size:10px;display:flex;align-items:center;gap:4px;color:#888}';
  h += '.dot{width:10px;height:10px;display:inline-block;border-radius:2px}';
  h += '</style></head><body>';

  h += '<h1>\u26A1 Agile Rate + Action Tracker \u2014 Full Year</h1>';
  h += '<p class="sub">322kWh \u00B7 80kW \u00B7 66kW export \u00B7 25kWp solar \u00B7 ' + allDays.length + ' days | Lines: import (red) & export (green) | Blue columns: CHARGING | Orange columns: DISCHARGING | Yellow dashed: SOC %</p>';

  // Monthly summary table
  // Compute monthly stats from the daily stats we'll calculate below
  // We need to run through allDays and compute per-day P&L first
  var MN=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var monthStats = {};
  for(var m=1;m<=12;m++) monthStats[m]={days:0,traded:0,held:0,neg:0,importCost:0,exportRev:0,selfUseVal:0,solarKwh:0,profit:0};

  for(var d of allDays){
    var m=parseInt(d.date.slice(5,7));
    var ms=monthStats[m];
    ms.days++;
    if(d.strategy==='trade')ms.traded++;else ms.held++;
    if(d.negCount>0)ms.neg++;

    // Recalculate daily P&L for summary
    var dayM=parseInt(d.date.slice(5,7));
    var dChgCost=0, dExpRev=0, dSelfUse=0, dSolar=0;
    var chargeRates=[], dischargeRates=[];
    for(var si=0;si<48;si++){
      if(d.actions[si]==='charge'||d.actions[si]==='charge-neg') chargeRates.push(d.imp[si]);
      if(d.actions[si]==='discharge') dischargeRates.push(d.exp[si]);
    }
    var avgImpR=chargeRates.length>0?chargeRates.reduce(function(s,v){return s+v},0)/chargeRates.length:0;
    var avgExpR=dischargeRates.length>0?dischargeRates.reduce(function(s,v){return s+v},0)/dischargeRates.length:0;
    var totalImpKwh=d.totalChg>0?Math.round(d.totalChg/EFF):0;
    dChgCost=totalImpKwh*avgImpR;
    dExpRev=Math.round(d.totalDis)*avgExpR;
    // Self-use: house consumption × avg import rate
    var houseDaily=0;
    for(var si=0;si<48;si++) houseDaily+=houseSlot(si,dayM);
    var avgDayImp=d.imp.reduce(function(s,v){return s+v},0)/48;
    dSelfUse=houseDaily*avgDayImp;
    // Solar
    for(var si=0;si<48;si++) dSolar+=solarSlot(si,dayM);
    var dProfit=dExpRev+dSelfUse-dChgCost;

    ms.importCost+=dChgCost;
    ms.exportRev+=dExpRev;
    ms.selfUseVal+=dSelfUse;
    ms.solarKwh+=dSolar;
    ms.profit+=dProfit;
  }

  h += '<div style="background:#1a1a2e;border-radius:8px;border:1px solid #2a2a4a;padding:12px;margin-bottom:16px;overflow-x:auto">';
  h += '<table style="width:100%;font-size:11px;border-collapse:collapse">';
  h += '<tr style="border-bottom:2px solid #2a2a4a">';
  h += '<th style="text-align:left;padding:6px 8px;color:#888">Month</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Days</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Traded</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Held</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Neg Days</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Charge Cost</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Export Rev</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Self-Use</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Solar kWh</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888;font-weight:700">Monthly Profit</th>';
  h += '<th style="text-align:right;padding:6px 8px;color:#888">Daily Avg</th>';
  h += '</tr>';

  var yearProfit=0;
  for(var m=1;m<=12;m++){
    var ms=monthStats[m];
    if(ms.days===0)continue;
    yearProfit+=ms.profit;
    var profitColor=ms.profit>0?'#10b981':'#ef4444';
    h+='<tr style="border-bottom:1px solid #1f1f3a">';
    h+='<td style="padding:6px 8px;color:#fff;font-weight:600">'+MN[m]+'</td>';
    h+='<td style="text-align:right;padding:6px 8px">'+ms.days+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#10b981">'+ms.traded+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#f59e0b">'+ms.held+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#3b82f6">'+ms.neg+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#ef4444">\u00A3'+(ms.importCost/100).toFixed(0)+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#10b981">\u00A3'+(ms.exportRev/100).toFixed(0)+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#06b6d4">\u00A3'+(ms.selfUseVal/100).toFixed(0)+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#f59e0b">'+Math.round(ms.solarKwh)+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:'+profitColor+';font-weight:700;font-size:13px">\u00A3'+(ms.profit/100).toFixed(0)+'</td>';
    h+='<td style="text-align:right;padding:6px 8px;color:#888">\u00A3'+(ms.profit/100/ms.days).toFixed(2)+'</td>';
    h+='</tr>';
  }
  // Annual total row
  var yearColor=yearProfit>0?'#10b981':'#ef4444';
  h+='<tr style="border-top:2px solid #2a2a4a">';
  h+='<td style="padding:6px 8px;color:#fff;font-weight:700">ANNUAL</td>';
  h+='<td style="text-align:right;padding:6px 8px;font-weight:600">'+allDays.length+'</td>';
  var yTraded=0,yHeld=0,yNeg=0,yChg=0,yExp=0,ySu=0,ySol=0;
  for(var m=1;m<=12;m++){var ms=monthStats[m];yTraded+=ms.traded;yHeld+=ms.held;yNeg+=ms.neg;yChg+=ms.importCost;yExp+=ms.exportRev;ySu+=ms.selfUseVal;ySol+=ms.solarKwh;}
  h+='<td style="text-align:right;padding:6px 8px;color:#10b981;font-weight:600">'+yTraded+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:#f59e0b;font-weight:600">'+yHeld+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:#3b82f6;font-weight:600">'+yNeg+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:#ef4444;font-weight:600">\u00A3'+(yChg/100).toFixed(0)+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:#10b981;font-weight:600">\u00A3'+(yExp/100).toFixed(0)+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:#06b6d4;font-weight:600">\u00A3'+(ySu/100).toFixed(0)+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:#f59e0b;font-weight:600">'+Math.round(ySol)+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;color:'+yearColor+';font-weight:700;font-size:15px">\u00A3'+(yearProfit/100).toFixed(0)+'</td>';
  h+='<td style="text-align:right;padding:6px 8px;font-weight:600">\u00A3'+(yearProfit/100/allDays.length).toFixed(2)+'</td>';
  h+='</tr>';
  h += '</table></div>';

  h += '<div class="leg">';
  h += '<span><span class="dot" style="background:#ef4444"></span> Import rate</span>';
  h += '<span><span class="dot" style="background:#10b981"></span> Export rate</span>';
  h += '<span><span class="dot" style="background:#3b82f640;border:2px solid #3b82f6"></span> CHARGING</span>';
  h += '<span><span class="dot" style="background:#f9731640;border:2px solid #f97316"></span> DISCHARGING</span>';
  h += '<span><span class="dot" style="background:transparent;border:2px dashed #f59e0b"></span> Battery SOC %</span>';
  h += '<span><span class="dot" style="background:#10b98120"></span> Export > Import zone</span>';
  h += '</div>';

  var lastMonth = 0;
  for(var i=0;i<allDays.length;i++){
    var d = allDays[i];
    var curMonth = parseInt(d.date.slice(5,7));
    if(curMonth !== lastMonth){
      h += '<h2 style="color:#fff;font-size:18px;margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #3b82f6">' + MN[curMonth] + ' ' + d.date.slice(0,4) + '</h2>';
      lastMonth = curMonth;
    }
    var tc = d.strategy==='trade'?'t-trade':d.strategy==='hold'?'t-hold':'t-neg';
    h += '<div class="day">';
    h += '<div class="dh"><span class="dt">'+d.date+' '+d.dow+'</span>';
    h += '<span class="info">Min:'+d.cheapest+'p | Peak:'+d.peakImp+'p | PkExp:'+d.peakExp+'p | Neg:'+d.negCount+'</span>';
    h += '<span class="tag '+tc+'">'+d.strategy.toUpperCase()+'</span></div>';
    h += '<canvas id="c'+i+'" height="200"></canvas>';
    // Calculate daily stats
    var totalImportKwh = d.totalChg > 0 ? Math.round(d.totalChg / EFF) : 0;
    var totalExportKwh = Math.round(d.totalDis);
    var chargeSlotRates = [];
    var dischargeSlotRates = [];
    for (var si = 0; si < 48; si++) {
      if (d.actions[si] === 'charge' || d.actions[si] === 'charge-neg') chargeSlotRates.push(d.imp[si]);
      if (d.actions[si] === 'discharge') dischargeSlotRates.push(d.exp[si]);
    }
    var avgImportRate = chargeSlotRates.length > 0 ? (chargeSlotRates.reduce(function(s,v){return s+v},0) / chargeSlotRates.length) : 0;
    var avgExportRate = dischargeSlotRates.length > 0 ? (dischargeSlotRates.reduce(function(s,v){return s+v},0) / dischargeSlotRates.length) : 0;
    var importCost = totalImportKwh * avgImportRate;
    var exportRev = totalExportKwh * avgExportRate;
    var selfUseKwh = 0;
    for (var si = 0; si < 48; si++) selfUseKwh += houseSlot(si,dayMonth);
    var selfUseVal = selfUseKwh * (d.imp.reduce(function(s,v){return s+v},0) / 48); // avg import rate
    var dailyProfit = exportRev + selfUseVal - importCost;
    var profitClass = dailyProfit > 2000 ? 'dp-great' : dailyProfit > 500 ? 'dp-good' : dailyProfit > 0 ? 'dp-ok' : 'dp-loss';

    h += '<div class="ds">';
    h += '<span>Bat: <b>' + d.socs[0] + '% \u2192 ' + d.endSoc + '% (' + Math.round(d.endSoc * CAP / 100) + 'kWh)</b></span>';
    h += '<span>Import: <b>' + totalImportKwh + 'kWh</b> @ <b>' + avgImportRate.toFixed(1) + 'p</b> avg = <b>\u00A3' + (importCost/100).toFixed(2) + '</b></span>';
    h += '<span>Export: <b>' + totalExportKwh + 'kWh</b> @ <b>' + avgExportRate.toFixed(1) + 'p</b> avg = <b>\u00A3' + (exportRev/100).toFixed(2) + '</b></span>';
    var dayMonth = parseInt(d.date.slice(5,7));
    var totalSolar = d.imp.map(function(_,si){ return solarSlot(si,dayMonth); }).reduce(function(s,v){return s+v},0);
    h += '<span>Solar: <b>' + totalSolar.toFixed(1) + 'kWh</b></span>';
    h += '<span>Self-use: <b>' + selfUseKwh.toFixed(1) + 'kWh</b> = <b>\u00A3' + (selfUseVal/100).toFixed(2) + '</b></span>';
    h += '<span class="' + profitClass + '">Profit: <b>\u00A3' + (dailyProfit/100).toFixed(2) + '</b></span>';
    h += '</div></div>';
  }

  // Client-side chart rendering
  h += '<script>\n';
  h += 'var days=' + dayDataJson + ';\n';
  h += 'function draw(idx){\n';
  h += 'var d=days[idx],c=document.getElementById("c"+idx);\n';
  h += 'var W=c.width=c.parentElement.clientWidth*2,H=c.height=400;\n';
  h += 'var ctx=c.getContext("2d");\n';
  h += 'var pad={top:25,right:50,bottom:30,left:50};\n';
  h += 'var pW=W-pad.left-pad.right,pH=H-pad.top-pad.bottom;\n';
  h += 'ctx.clearRect(0,0,W,H);\n';

  // Scale: left axis = rates, right axis = SOC
  h += 'var allR=d.imp.concat(d.exp);\n';
  h += 'var maxR=Math.max(Math.max.apply(null,allR)*1.1,5);\n';
  h += 'var minR=Math.min(Math.min.apply(null,allR)*1.1,-1);\n';
  h += 'var range=maxR-minR;\n';
  h += 'var y=function(v){return pad.top+pH-((v-minR)/range)*pH};\n';
  h += 'var x=function(i){return pad.left+(i/47)*pW};\n';
  h += 'var ySoc=function(v){return pad.top+pH-(v/100)*pH};\n'; // 0-100% on right axis

  // Grid
  h += 'ctx.strokeStyle="#2a2a4a";ctx.lineWidth=1;\n';
  h += 'for(var v=Math.ceil(minR/10)*10;v<=maxR;v+=10){ctx.beginPath();ctx.moveTo(pad.left,y(v));ctx.lineTo(W-pad.right,y(v));ctx.stroke();ctx.fillStyle="#666";ctx.font="18px system-ui";ctx.textAlign="right";ctx.fillText(v+"p",pad.left-6,y(v)+5);}\n';

  // Right axis (SOC)
  h += 'ctx.textAlign="left";\n';
  h += 'for(var v=0;v<=100;v+=25){ctx.fillStyle="#f59e0b40";ctx.fillText(v+"%",W-pad.right+6,ySoc(v)+5);}\n';

  // Zero line
  h += 'ctx.strokeStyle="#f59e0b";ctx.lineWidth=1;ctx.setLineDash([4,4]);\n';
  h += 'ctx.beginPath();ctx.moveTo(pad.left,y(0));ctx.lineTo(W-pad.right,y(0));ctx.stroke();ctx.setLineDash([]);\n';

  // Charge/discharge column backgrounds FIRST (behind the lines)
  h += 'var slotW=pW/48;\n';
  h += 'for(var i=0;i<48;i++){\n';
  h += '  var sx=pad.left+i*slotW;\n';
  h += '  if(d.actions[i]==="charge"||d.actions[i]==="charge-neg"){\n';
  h += '    ctx.fillStyle="rgba(59,130,246,0.15)";ctx.fillRect(sx,pad.top,slotW,pH);\n';
  h += '    ctx.strokeStyle="#3b82f640";ctx.lineWidth=1;ctx.strokeRect(sx,pad.top,slotW,pH);\n';
  h += '  }\n';
  h += '  if(d.actions[i]==="discharge"){\n';
  h += '    ctx.fillStyle="rgba(249,115,22,0.15)";ctx.fillRect(sx,pad.top,slotW,pH);\n';
  h += '    ctx.strokeStyle="#f9731640";ctx.lineWidth=1;ctx.strokeRect(sx,pad.top,slotW,pH);\n';
  h += '  }\n';
  h += '}\n';

  // Profitable zone fill (export > import)
  h += 'ctx.fillStyle="#10b98110";\n';
  h += 'for(var i=0;i<47;i++){\n';
  h += '  if(d.exp[i]>d.imp[i]&&d.exp[i+1]>d.imp[i+1]){\n';
  h += '    ctx.beginPath();ctx.moveTo(x(i),y(d.imp[i]));ctx.lineTo(x(i+1),y(d.imp[i+1]));ctx.lineTo(x(i+1),y(d.exp[i+1]));ctx.lineTo(x(i),y(d.exp[i]));ctx.closePath();ctx.fill();\n';
  h += '  }\n';
  h += '}\n';

  // Import line
  h += 'ctx.strokeStyle="#ef4444";ctx.lineWidth=3;ctx.beginPath();\n';
  h += 'for(var i=0;i<48;i++){i===0?ctx.moveTo(x(i),y(d.imp[i])):ctx.lineTo(x(i),y(d.imp[i]));}ctx.stroke();\n';

  // Export line
  h += 'ctx.strokeStyle="#10b981";ctx.lineWidth=3;ctx.beginPath();\n';
  h += 'for(var i=0;i<48;i++){i===0?ctx.moveTo(x(i),y(d.exp[i])):ctx.lineTo(x(i),y(d.exp[i]));}ctx.stroke();\n';

  // SOC line (dashed, yellow, right axis)
  h += 'ctx.strokeStyle="#f59e0b";ctx.lineWidth=2;ctx.setLineDash([6,3]);ctx.beginPath();\n';
  h += 'for(var i=0;i<48;i++){i===0?ctx.moveTo(x(i),ySoc(d.socs[i])):ctx.lineTo(x(i),ySoc(d.socs[i]));}ctx.stroke();ctx.setLineDash([]);\n';

  // Charge/discharge markers on the rate lines
  h += 'for(var i=0;i<48;i++){\n';
  h += '  if(d.chgs[i]>0){ctx.fillStyle="#3b82f6";ctx.beginPath();ctx.arc(x(i),y(d.imp[i]),5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText("C",x(i),y(d.imp[i])+4);}\n';
  h += '  if(d.diss[i]>0){ctx.fillStyle="#f97316";ctx.beginPath();ctx.arc(x(i),y(d.exp[i]),5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText("D",x(i),y(d.exp[i])+4);}\n';
  h += '}\n';

  // X axis
  h += 'ctx.fillStyle="#666";ctx.font="16px system-ui";ctx.textAlign="center";\n';
  h += 'for(var i=0;i<48;i+=4){var hh=Math.floor(i/2),mm=i%2===0?"00":"30";ctx.fillText(String(hh).padStart(2,"0")+":"+mm,x(i),H-pad.bottom+18);}\n';

  // Peak labels
  h += 'var maxI=Math.max.apply(null,d.imp),maxE=Math.max.apply(null,d.exp);\n';
  h += 'var mIi=d.imp.indexOf(maxI),mEi=d.exp.indexOf(maxE);\n';
  h += 'ctx.fillStyle="#ef4444";ctx.font="bold 16px system-ui";ctx.textAlign="left";ctx.fillText(maxI.toFixed(1)+"p",x(mIi)+8,y(maxI)-4);\n';
  h += 'ctx.fillStyle="#10b981";ctx.fillText(maxE.toFixed(1)+"p",x(mEi)+8,y(maxE)+14);\n';

  h += '}\n';
  h += 'function drawAll(){for(var i=0;i<days.length;i++)draw(i);}\n';
  h += 'drawAll();window.addEventListener("resize",drawAll);\n';
  h += '</script></body></html>';

  writeFileSync('C:/Users/dmidd/AppData/Local/Temp/rosestack/output/agile-full-year-tracker.html', h);
  console.log('Written ' + allDays.length + ' days');
  await sql.end();
}
main().catch(e => { console.error(e); process.exit(1); });
