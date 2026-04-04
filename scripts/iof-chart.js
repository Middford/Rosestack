function drawMonthly() {
  var c = document.getElementById('monthlyChart');
  var ctx = c.getContext('2d');
  var W = c.width = c.parentElement.clientWidth * 2;
  var H = c.height = 600;
  var pad = {top:20,right:20,bottom:50,left:80};
  var pW = W-pad.left-pad.right, pH = H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  var maxV = Math.max.apply(null, monthData.map(function(m){return m.exportRev+m.selfUse}))*1.1;
  var y = function(v){return pad.top+pH-((v)/maxV)*pH};
  var bw=pW/12;
  ctx.strokeStyle='#2a2a4a';ctx.lineWidth=1;
  for(var v=0;v<=maxV;v+=5000){ctx.beginPath();ctx.moveTo(pad.left,y(v));ctx.lineTo(W-pad.right,y(v));ctx.stroke();
    ctx.fillStyle='#666';ctx.font='20px system-ui';ctx.textAlign='right';ctx.fillText('\u00A3'+(v/100).toFixed(0),pad.left-8,y(v)+6);}
  for(var i=0;i<monthData.length;i++){
    var m=monthData[i]; var x=pad.left+i*bw; var w=bw*0.6;
    ctx.fillStyle='#3b82f6';ctx.fillRect(x+bw*0.2,y(m.exportRev),w,y(0)-y(m.exportRev));
    ctx.fillStyle='#10b981';ctx.fillRect(x+bw*0.2,y(m.exportRev+m.selfUse),w,y(m.exportRev)-y(m.exportRev+m.selfUse));
    ctx.fillStyle='#ef444460';ctx.fillRect(x+bw*0.2,y(0),w,(m.cost/maxV)*pH);
    ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(x+bw*0.5,y(m.net),6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#888';ctx.font='20px system-ui';ctx.textAlign='center';ctx.fillText(m.label,x+bw*0.5,H-pad.bottom+25);
  }
}
function drawDaily() {
  var c = document.getElementById('dailyChart');
  var ctx = c.getContext('2d');
  var W = c.width = c.parentElement.clientWidth * 2;
  var H = c.height = 500;
  var pad = {top:20,right:20,bottom:40,left:70};
  var pW = W-pad.left-pad.right, pH = H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  var nets = dailyData.map(function(d){return d.net});
  var maxV = Math.max.apply(null,nets)*1.15;
  var minV = Math.min(0,Math.min.apply(null,nets)*1.1);
  var range = maxV-minV;
  var y = function(v){return pad.top+pH-((v-minV)/range)*pH};
  var x = function(i){return pad.left+(i/(dailyData.length-1))*pW};
  var sumStart=-1,sumEnd=-1;
  for(var i=0;i<dailyData.length;i++){if(dailyData[i].month===5&&sumStart<0)sumStart=i;if(dailyData[i].month===9)sumEnd=i;}
  if(sumStart>=0&&sumEnd>=0){ctx.fillStyle='#f59e0b08';ctx.fillRect(x(sumStart),pad.top,x(sumEnd)-x(sumStart),pH);}
  ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.left,y(0));ctx.lineTo(W-pad.right,y(0));ctx.stroke();
  ctx.strokeStyle='#3b82f6';ctx.lineWidth=2;ctx.beginPath();
  for(var i=0;i<dailyData.length;i++){i===0?ctx.moveTo(x(i),y(dailyData[i].net)):ctx.lineTo(x(i),y(dailyData[i].net));}
  ctx.stroke();
  ctx.fillStyle='#666';ctx.font='18px system-ui';ctx.textAlign='center';
  for(var i=0;i<dailyData.length;i+=30)ctx.fillText(dailyData[i].d,x(i),H-pad.bottom+25);
  ctx.textAlign='right';
  for(var v=0;v<=maxV;v+=2000)ctx.fillText('\u00A3'+(v/100).toFixed(0),pad.left-8,y(v)+6);
}
drawMonthly();drawDaily();
window.addEventListener('resize',function(){drawMonthly();drawDaily();});
