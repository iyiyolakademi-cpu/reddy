/* Hayat Borsam Pro Terminal v3
 * Charts reflect personal point entries. No real-world exchange prices, money or trading.
 * Data is read from the existing app; no migrations or destructive schema writes.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const escPro=v=>String(v==null?"":v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const fmt=n=>Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const signedPro=n=>(n>=0?"+":"")+fmt(n);
const cls=n=>n>0?"pro-return-positive":n<0?"pro-return-negative":"pro-return-neutral";
const button=(label,attrs)=>'<button type="button" '+attrs+'>'+label+'</button>';
const empty='<div class="pro-empty">Bu bölüm için henüz kayıt bulunmuyor.</div>';
const daysOpt=[{n:1,t:"1G"},{n:7,t:"1H"},{n:30,t:"1A"},{n:90,t:"3A"},{n:365,t:"1Y"},{n:0,t:"Tümü"}];
const state={
  marketTab:"market", selectedGroup:null, marketScope:"market",
  market:{n:30,type:"line",ma7:true,ma30:false,volume:true},
  sector:{n:30,type:"area",ma7:true,ma30:false,volume:true},
  stock:{n:30,type:"candles",ma7:true,ma30:false,volume:true},
  opened:null, detailTab:"overview", previousFocus:null
};
const chartCache={};
function allStocks(){return sectorsList();}
function st(id){return allStocks().find(s=>s.id===id);}
function groups(){return [...new Set(allStocks().map(s=>s.group||"Özel"))];}
function forGroup(g){return allStocks().filter(s=>(s.group||"Özel")===g);}
function trades(){return (Array.isArray(data.trades)?data.trades:[]).filter(t=>Number.isFinite(Date.parse(t.time))&&Date.parse(t.time)<=Date.now()&&Number.isFinite(Number(t.delta)));}
function isFavorite(id){return Array.isArray(data.watchlistV2)&&data.watchlistV2.includes(id);}
function dayKey(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function localDate(s){const d=new Date(String(s)+"T12:00:00");return Number.isNaN(d.valueOf())?new Date():d;}
function offsetDate(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function formatDay(day){return localDate(day).toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"});}
function deltaFor(id,numDays){
 const since=numDays?dayKey(offsetDate(new Date(),-numDays+1)):"0000-01-01";
 return trades().filter(t=>t.sector===id&&String(t.time).slice(0,10)>=since).reduce((sum,t)=>sum+Number(t.delta),0);
}
function dayCount(id,k){return trades().filter(t=>t.sector===id&&t.time.slice(0,10)===k).length;}
function totalValue(scope,key){
 const list=scope==="stock"?[st(key)].filter(Boolean):scope==="sector"?forGroup(key):allStocks();
 if(!list.length)return 0;
 if(scope==="market"){
  const t=timeline().filter(x=>Date.parse(x.time)<=Date.now()).at(-1);
  return t?t.level:Number(data.base)||0;
 }
 return list.reduce((sum,s)=>sum+currentOf(s.id),0)/list.length;
}
function initialValue(scope,key){
 if(scope==="market")return Number(data.base)||0;
 const list=scope==="stock"?[st(key)].filter(Boolean):forGroup(key);
 return list.length?list.reduce((sum,s)=>sum+initialOf(s.id),0)/list.length:0;
}
function scopeTrades(scope,key){
 const items=scope==="stock"?[st(key)].filter(Boolean):scope==="sector"?forGroup(key):allStocks();
 const set=new Set(items.map(s=>s.id));
 const den=Math.max(1,items.length);
 return trades().filter(t=>set.has(t.sector)).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)||String(a.id).localeCompare(String(b.id)))
 .map(t=>({time:t.time,day:String(t.time).slice(0,10),delta:scope==="market"?indexDelta(t):Number(t.delta)/den,raw:Number(t.delta)}));
}
/** Create OHLC by replaying chronological personal activity. Nonactivity dates carry previous close. */
function dailyBars(scope,key,n){
 const evt=scopeTrades(scope,key),today=new Date();today.setHours(12,0,0,0);
 const oldest=evt.length?localDate(evt[0].day):offsetDate(today,-29);
 const firstVisible=n>0?offsetDate(today,-(n-1)):oldest;
 const start=n>0?offsetDate(firstVisible,-35):offsetDate(oldest,-35);
 // Date range may be many years: retain the most recent 10 years for rendering safety.
 const first=+start<+offsetDate(today,-3650)?offsetDate(today,-3650):start;
 let pos=0,v=initialValue(scope,key);
 while(pos<evt.length&&evt[pos].day<dayKey(first)){v+=evt[pos].delta;pos++;}
 const arr=[];
 for(let d=new Date(first);d<=today;d=offsetDate(d,1)){
  const keyDay=dayKey(d),open=v;let high=v,low=v,count=0,activity=0;
  while(pos<evt.length&&evt[pos].day===keyDay){
   v+=evt[pos].delta;high=Math.max(high,v);low=Math.min(low,v);count++;activity+=Math.abs(evt[pos].raw);pos++;
  }
  arr.push({date:keyDay,open,high,low,close:v,volume:count,activity,ma7:null,ma30:null});
 }
 for(let i=0;i<arr.length;i++){
  if(i>=6)arr[i].ma7=arr.slice(i-6,i+1).reduce((a,b)=>a+b.close,0)/7;
  if(i>=29)arr[i].ma30=arr.slice(i-29,i+1).reduce((a,b)=>a+b.close,0)/30;
 }
 const cutoff=dayKey(firstVisible);
 const display=n===0?arr:arr.filter(r=>r.date>=cutoff);
 return display.length?display:[{date:dayKey(today),open:v,high:v,low:v,close:v,volume:0,activity:0,ma7:null,ma30:null}];
}
function stats(rows){
 const open=rows[0].open,close=rows[rows.length-1].close;
 const high=Math.max(...rows.map(r=>r.high)),low=Math.min(...rows.map(r=>r.low));
 const avg=rows.reduce((a,b)=>a+b.close,0)/rows.length,volume=rows.reduce((a,b)=>a+b.volume,0);
 const returns=rows.slice(1).map((r,i)=>Math.abs(rows[i].close)>0.00001?(r.close-rows[i].close)/Math.abs(rows[i].close)*100:0);
 const mean=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
 const variance=returns.length?returns.reduce((a,b)=>a+(b-mean)**2,0)/returns.length:0;
 return {open,close,high,low,avg,volume,change:close-open,volatility:Math.sqrt(variance)};
}
function config(view){return state[view];}
function chartButtons(view,s){
 const types=[["line","Çizgi"],["area","Alan"],["candles","Mum"]];
 return '<div class="pro-chart-controls"><div class="pro-button-group" role="group" aria-label="Grafik türü">'+types.map(t=>button(t[1],'data-pro-action="chart-type" data-view="'+view+'" data-value="'+t[0]+'" aria-pressed="'+(s.type===t[0])+'" class="'+(s.type===t[0]?"pro-active":"")+'"')).join("")+'</div><div class="pro-button-group" role="group" aria-label="Grafik dönemi">'+daysOpt.map(d=>button(d.t,'data-pro-action="chart-period" data-view="'+view+'" data-value="'+d.n+'" aria-pressed="'+(s.n===d.n)+'" class="'+(s.n===d.n?"pro-active":"")+'"')).join("")+'</div><div class="pro-indicators">'+[["ma7","HO 7","#dd8a22"],["ma30","HO 30","#8158d8"],["volume","Hacim","#4b8ec7"]].map(k=>button('<i class="pro-dot" style="background:'+k[2]+'"></i>'+k[1],'data-pro-action="chart-toggle" data-view="'+view+'" data-value="'+k[0]+'" aria-pressed="'+Boolean(s[k[0]])+'" class="'+(s[k[0]]?"pro-active":"")+'"')).join("")+'</div></div>';
}
function chartSvg(rows,view,s){
 const W=900,L=58,R=870,TOP=26,BOTTOM=250,VTOP=274,VBOT=313;
 const vals=rows.flatMap(r=>[r.open,r.close,r.low,r.high]);if(s.ma7)rows.forEach(r=>{if(r.ma7!==null)vals.push(r.ma7);});if(s.ma30)rows.forEach(r=>{if(r.ma30!==null)vals.push(r.ma30);});
 const min=Math.min(...vals),max=Math.max(...vals),pad=Math.max(.5,(max-min)*.1),yMin=min-pad,yMax=max+pad,span=Math.max(.000001,yMax-yMin);
 const yy=v=>BOTTOM-(v-yMin)/span*(BOTTOM-TOP),xx=i=>rows.length===1?(L+R)/2:L+i*(R-L)/(rows.length-1);
 const xCenter=i=>rows.length===1?(L+R)/2:xx(i);
 const stroke=rows[rows.length-1].close>=rows[0].open?"#079a75":"#d04b65";
 let out='<svg class="pro-graph" viewBox="0 0 '+W+' 332" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kişisel gelişim puanlarının tarihsel grafiği" data-pro-svg="'+view+'">';
 out+='<defs><linearGradient id="pro-grad-'+view+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+stroke+'" stop-opacity=".20"/><stop offset="100%" stop-color="'+stroke+'" stop-opacity=".005"/></linearGradient></defs>';
 for(let i=0;i<=4;i++){const y=TOP+i*(BOTTOM-TOP)/4;out+='<line x1="'+L+'" y1="'+y+'" x2="'+R+'" y2="'+y+'" class="pro-gridline"/><text x="50" y="'+(y+4)+'" class="pro-axis" text-anchor="end">'+escPro(fmt(yMax-(yMax-yMin)*i/4))+'</text>';}
 const linePath=(get,filter=true)=>{let d="";rows.forEach((r,i)=>{const val=get(r);if(val===null||!Number.isFinite(val)){if(filter)d="";return;}d+=(d?" L":"M")+xx(i).toFixed(2)+" "+yy(val).toFixed(2);});return d;};
 if(s.type==="candles"){
  const width=Math.max(1.2,Math.min(13,(R-L)/Math.max(rows.length,2)*.64));
  rows.forEach((r,i)=>{
   const x=xCenter(i),col=r.close>=r.open?"#11956e":"#d85a70",body=Math.max(1,Math.abs(yy(r.open)-yy(r.close)));
   out+='<line x1="'+x+'" x2="'+x+'" y1="'+yy(r.high)+'" y2="'+yy(r.low)+'" stroke="'+col+'" stroke-width="1.35"/><rect x="'+(x-width/2)+'" y="'+Math.min(yy(r.open),yy(r.close))+'" width="'+width+'" height="'+body+'" fill="'+col+'" rx="1"/>';
  });
 } else {
  let points=rows.map((r,i)=>[xx(i),yy(r.close)]);
  if(rows.length===1)points=[[L,yy(rows[0].open)],[R,yy(rows[0].close)]];
  const path=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" ");
  if(s.type==="area")out+='<path d="'+path+' L'+R+' '+BOTTOM+' L'+L+' '+BOTTOM+' Z" fill="url(#pro-grad-'+view+')"/>';
  out+='<path d="'+path+'" stroke="'+stroke+'" stroke-width="2.7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
 }
 function addMA(k,color){let buf=[];rows.forEach((r,i)=>{if(r[k]===null){if(buf.length>1)out+='<path d="'+buf.join(" ")+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-dasharray="5 3"/>';buf=[];return;}buf.push((buf.length?"L":"M")+xx(i).toFixed(2)+" "+yy(r[k]).toFixed(2));});if(buf.length>1)out+='<path d="'+buf.join(" ")+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-dasharray="5 3"/>';}
 if(s.ma7)addMA("ma7","#dd8a22");if(s.ma30)addMA("ma30","#8158d8");
 if(s.volume){
  const vMax=Math.max(1,...rows.map(r=>r.volume));
  const bw=Math.max(1.1,Math.min(12,(R-L)/Math.max(rows.length,2)*.65));
  rows.forEach((r,i)=>{if(!r.volume)return;const h=r.volume/vMax*(VBOT-VTOP),x=xCenter(i);out+='<rect x="'+(x-bw/2)+'" y="'+(VBOT-h)+'" width="'+bw+'" height="'+h+'" fill="'+(r.close>=r.open?"#67bfa0":"#e6a0ad")+'" opacity=".82" rx=".5"/>';});
  out+='<text x="50" y="294" text-anchor="end" class="pro-axis">Adet</text>';
 }
 const count=Math.min(5,rows.length);for(let i=0;i<count;i++){const idx=count===1?0:Math.round(i*(rows.length-1)/(count-1));out+='<text class="pro-axis" x="'+xCenter(idx)+'" y="329" text-anchor="middle">'+escPro(formatDay(rows[idx].date).replace(/ \d{4}$/,""))+'</text>';}
 out+='<line class="pro-crosshair" x1="'+xCenter(rows.length-1)+'" x2="'+xCenter(rows.length-1)+'" y1="'+TOP+'" y2="'+BOTTOM+'"/><rect class="pro-region" data-pro-region="'+view+'" x="'+L+'" y="'+TOP+'" width="'+(R-L)+'" height="'+(VBOT-TOP)+'" aria-label="Grafik noktalarını incele"/>';
 out+='</svg>';
 chartCache[view]={rows,left:L,right:R};
 return out;
}
function chartHTML(scope,key,view,title){
 const s=config(view),rows=dailyBars(scope,key,s.n),info=stats(rows),changePct=Math.abs(info.open)>0.00001?(info.change/info.open*100):0;
 return '<section class="card pro-chart-card"><div class="pro-chart-head"><div><div class="pro-eyebrow">GELİŞMİŞ GRAFİK TERMİNALİ • '+escPro(scope==="market"?"HBX":scope==="stock"?st(key)?.ticker||"Hisse":key)+'</div><h3>'+escPro(title)+'</h3><p>Kişisel puan geçmişi • Borsa benzeri görselleştirme</p></div><div><div class="pro-chart-price">'+fmt(info.close)+'</div><span class="pro-chart-change '+(info.change<0?"pro-neg":"")+'">'+signedPro(info.change)+" ("+(changePct>=0?"+":"")+changePct.toLocaleString("tr-TR",{maximumFractionDigits:1})+"%)"+'</span></div></div>'+chartButtons(view,s)+'<div class="pro-chart-body">'+chartSvg(rows,view,s)+'</div><div class="pro-tooltip" data-pro-tip="'+view+'" aria-live="off"></div><div class="pro-chart-legend">'+(s.ma7?'<span>🟠 HO 7 günlük ortalama</span>':"")+(s.ma30?'<span>🟣 HO 30 günlük ortalama</span>':"")+(s.volume?'<span>Hacim = günlük işlem adedi</span>':"")+'</div><div class="pro-chart-stats">'+[["Açılış",fmt(info.open)],["Yüksek",fmt(info.high)],["Düşük",fmt(info.low)],["Kapanış",fmt(info.close)],["Ortalama",fmt(info.avg)],["Oynaklık",info.volatility.toLocaleString("tr-TR",{maximumFractionDigits:2})+"%"]].map(x=>'<div><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join("")+'</div><p class="pro-chart-note">Yüksek/düşük değerler, kişisel puan işlemleri sırasında oluşan seviyelerdir. Hacim işlem sayısını ifade eder. HO ve oynaklık geçmiş puanlardan hesaplanır; finansal gösterge veya gerçek piyasa verisi değildir.</p></section>';
}
function chartTooltip(view,idx){
 const c=chartCache[view];if(!c||!c.rows.length)return;
 const row=c.rows[Math.max(0,Math.min(c.rows.length-1,idx))];
 const tip=document.querySelector('[data-pro-tip="'+view+'"]');
 if(tip)tip.innerHTML='<b>'+escPro(formatDay(row.date))+'</b><span>A: '+fmt(row.open)+'</span><span>Y: '+fmt(row.high)+'</span><span>D: '+fmt(row.low)+'</span><span>K: '+fmt(row.close)+'</span><span>İşlem: '+row.volume+'</span>';
 const svg=document.querySelector('[data-pro-svg="'+view+'"]');
 const cross=svg?.querySelector(".pro-crosshair");
 if(cross){const x=c.rows.length===1?(c.left+c.right)/2:c.left+idx*(c.right-c.left)/(c.rows.length-1);cross.setAttribute("x1",x);cross.setAttribute("x2",x);}
}
function bindChartLatest(view){const c=chartCache[view];if(c)chartTooltip(view,c.rows.length-1);}
function marketHeader(){
 const list=groups(),selection=state.marketScope;
 return '<div class="pro-market-header"><div><div class="pro-eyebrow">HAYAT BORSAM • PRO TERMİNAL</div><h2>Gelişim Piyasası</h2></div><div class="pro-switch">'+button("Piyasa",'data-pro-action="market-tab" data-value="market" class="'+(state.marketTab==="market"?"pro-active":"")+'" aria-pressed="'+(state.marketTab==="market")+'"')+button("Sektörler",'data-pro-action="market-tab" data-value="sectors" class="'+(state.marketTab==="sectors"?"pro-active":"")+'" aria-pressed="'+(state.marketTab==="sectors")+'"')+'</div></div><div class="pro-market-only" id="pro-market-chart"><div class="pro-toolbar-select"><label for="pro-market-instrument">Grafikteki endeks</label><select id="pro-market-instrument" data-pro-select="instrument"><option value="market" '+(selection==="market"?"selected":"")+'>HBX • Genel Hayat Endeksi</option>'+list.map(g=>'<option value="'+escPro(g)+'" '+(selection===g?"selected":"")+'>'+escPro(g)+" Endeksi"+'</option>').join("")+'</select></div><div id="pro-market-chart-body"></div></div>';
}
function renderMarket(){
 const mount=$("pro-market-top");if(!mount)return;
 mount.innerHTML=marketHeader();
 const market=$("screen-market");
 market.classList.toggle("pro-sectors-active",state.marketTab==="sectors");
 if(state.marketTab==="market"){
  const isMain=state.marketScope==="market",scope=isMain?"market":"sector";
  const key=isMain?null:state.marketScope,title=isMain?"HBX • Genel Hayat Endeksi":state.marketScope+" Endeksi";
  $("pro-market-chart-body").innerHTML=chartHTML(scope,key,"market",title);
  bindChartLatest("market");
 }
}
function sectorStats(g){
 const items=forGroup(g),now=dayKey(new Date()),lastWeek=dayKey(offsetDate(new Date(),-6));
 const all=trades().filter(t=>items.some(s=>s.id===t.sector));
 const count=Math.max(1,items.length),value=items.reduce((sum,s)=>sum+currentOf(s.id),0)/count;
 const today=all.filter(t=>t.time.slice(0,10)===now).reduce((sum,t)=>sum+Number(t.delta),0)/count;
 const week=all.filter(t=>t.time.slice(0,10)>=lastWeek).reduce((sum,t)=>sum+Number(t.delta),0)/count;
 return {items,value,today,week,transactions:all.length,activity:all.filter(t=>t.time.slice(0,10)>=lastWeek).length};
}
function renderSectors(){
 const mount=$("pro-sector-section");if(!mount)return;
 const list=groups();
 if(!list.length){mount.innerHTML=empty;return;}
 if(!list.includes(state.selectedGroup))state.selectedGroup=list[0];
 const selected=state.selectedGroup,info=sectorStats(selected);
 mount.innerHTML='<div class="pro-sector-layout"><aside class="card pro-sector-side"><h3>Sektörler</h3><select aria-label="Sektör seç" class="pro-sector-select" id="pro-sector-select" data-pro-select="sector">'+list.map(g=>'<option value="'+escPro(g)+'" '+(g===selected?"selected":"")+'>'+escPro(g)+'</option>').join("")+'</select><div class="pro-sector-list">'+list.map(g=>{const x=sectorStats(g);return button('<span>'+escPro(g)+'<small>'+x.items.length+' hisse</small></span><b class="'+cls(x.today)+'">'+signedPro(x.today)+'</b>','class="pro-sector-link '+(g===selected?"pro-active":"")+'" data-pro-action="sector-pick" data-value="'+escPro(g)+'"');}).join("")+'</div></aside><div class="pro-sector-details"><section class="card"><div class="pro-sector-heading"><div><span class="pro-eyebrow">SEKTÖR DETAYI</span><h2>'+escPro(selected)+'</h2><p>Bu kategorideki hisselerin eşit ağırlıklı kişisel endeksi</p></div><span class="terminal-chip neutral">'+info.items.length+' hisse</span></div><div class="pro-kpis">'+[["Sektör Endeksi",fmt(info.value)],["Bugünkü değişim",signedPro(info.today)],["7 günlük değişim",signedPro(info.week)],["7 günlük işlem",info.activity]].map(x=>'<div class="pro-kpi"><small>'+escPro(x[0])+'</small><strong>'+escPro(x[1])+'</strong></div>').join("")+'</div></section><div id="pro-sector-chart"></div><div class="pro-sector-leaders" id="pro-sector-leaders"></div><section class="card"><div class="pro-chart-head"><h3>Sektördeki Tüm Hisseler</h3><span class="terminal-chip neutral">Günlük fiyat hareketi</span></div><div id="pro-sector-stocks"></div></section></div></div>';
 $("pro-sector-chart").innerHTML=chartHTML("sector",selected,"sector",selected+" Performans Grafiği");
 bindChartLatest("sector");
 const movers=info.items.map(s=>({s,day:deltaFor(s.id,1),week:deltaFor(s.id,7),count:trades().filter(t=>t.sector===s.id&&t.time.slice(0,10)>=dayKey(offsetDate(new Date(),-6))).length}));
 const top=[...movers].sort((a,b)=>b.week-a.week).slice(0,4);
 const active=[...movers].sort((a,b)=>b.count-a.count).slice(0,4);
 const rank=arr=>arr.length?arr.map(x=>button('<span>'+escPro(x.s.icon)+' '+escPro(x.s.name)+'</span><small>'+x.count+' işlem</small><strong class="'+cls(x.week)+'">'+signedPro(x.week)+'</strong>','data-pro-action="stock-open" data-id="'+escPro(x.s.id)+'"')).join(""):empty;
 $("pro-sector-leaders").innerHTML='<section class="pro-surface"><h3>Son 7 Günün Liderleri</h3><div class="pro-rank-table">'+rank(top)+'</div></section><section class="pro-surface"><h3>En Aktif Hisseler</h3><div class="pro-rank-table">'+rank(active)+'</div></section>';
 $("pro-sector-stocks").innerHTML='<div class="pro-sector-stocks">'+[...movers].sort((a,b)=>b.day-a.day).map(x=>'<div class="pro-sector-stock"><div class="main"><strong>'+escPro(x.s.icon)+" "+escPro(x.s.name)+'</strong><small>'+escPro(x.s.ticker)+'</small></div><div class="price">'+fmt(currentOf(x.s.id))+'</div><div class="delta '+cls(x.day)+'">'+signedPro(x.day)+'</div>'+button("İncele",'data-pro-action="stock-open" data-id="'+escPro(x.s.id)+'"')+'</div>').join("")+'</div>';
}
function stockHeader(id){
 const s=st(id);if(!s)return "";
 const today=deltaFor(id,1),week=deltaFor(id,7),month=deltaFor(id,30),current=currentOf(id),initial=initialOf(id);
 return '<header class="pro-detail-top"><div class="pro-detail-bar">'+button("← Piyasaya Dön",'class="pro-back" data-pro-action="stock-close"')+'<span class="pro-eyebrow">HİSSE PROFİLİ 2.0 • '+escPro(s.ticker)+'</span></div><div class="pro-detail-heading"><div><div class="pro-eyebrow">'+escPro(s.group||"Gelişim")+'</div><h1>'+escPro(s.icon)+" "+escPro(s.name)+'</h1><div class="info">Kişisel gelişim hissesi • '+escPro(s.ticker)+'</div></div><div><div class="pro-detail-price">'+fmt(current)+'</div><div class="'+cls(today)+'" style="text-align:right;font-weight:750">'+signedPro(today)+" bugün"+'</div></div></div><div class="pro-detail-actions">'+button("＋ Puan İşlemi",'data-pro-action="trade" data-id="'+escPro(id)+'"')+button(isFavorite(id)?"★ Takipten Çıkar":"☆ Takip Listeme Ekle",'class="ghost" data-pro-action="watch" data-id="'+escPro(id)+'"')+button("Gelişim Planım",'class="ghost" data-pro-action="stock-plan" data-id="'+escPro(id)+'"')+'</div><div class="pro-kpis">'+[["Başlangıç",fmt(initial)],["7 Gün",signedPro(week)],["30 Gün",signedPro(month)],["Tüm Zamanlar",signedPro(current-initial)]].map(x=>'<div class="pro-kpi"><small>'+escPro(x[0])+'</small><strong>'+escPro(x[1])+'</strong></div>').join("")+'</div></header>';
}
function tabBar(){
 const opts=[["overview","Genel Bakış"],["chart","Grafik"],["trades","İşlemler"],["tasks","Görevler"],["notes","Notlar"]];
 return '<nav class="pro-detail-nav" aria-label="Hisse sayfaları">'+opts.map(o=>button(o[1],'data-pro-action="stock-tab" data-value="'+o[0]+'" class="'+(state.detailTab===o[0]?"pro-active":"")+'" aria-current="'+(state.detailTab===o[0]?"page":"false")+'"')).join("")+'</nav>';
}
function overview(id){
 const s=st(id);if(!s)return empty;
 const tasks=(data.tasksV2||[]).filter(t=>t.sector===id),goals=(data.goalsV2||[]).filter(g=>g.sector===id),news=(data.news||[]).filter(n=>n.sector===id).slice().reverse(),rewards=(data.dividends||[]).filter(n=>n.sector===id);
 const sectorList=forGroup(s.group||"Özel"),rank=sectorList.map(x=>({id:x.id,val:currentOf(x.id)})).sort((a,b)=>b.val-a.val).findIndex(x=>x.id===id)+1;
 const chart=dailyBars("stock",id,30),latest=stats(chart);
 const taskRows=tasks.length?tasks.slice(0,4).map(t=>'<div class="pro-detail-row"><div><strong>'+escPro(t.title)+'</strong><small>'+escPro(t.period==="daily"?"Günlük":t.period==="weekly"?"Haftalık":"Aylık")+' • +'+fmt(t.points)+' puan</small></div><span class="pro-detail-tag">'+(isCompleted(t)?"Tamamlandı":"Bekliyor")+'</span></div>').join(""):empty;
 const goalRows=goals.length?goals.slice(0,4).map(g=>'<div class="pro-detail-row"><div><strong>'+escPro(g.title)+'</strong><small>'+fmt(g.value)+' / '+fmt(g.target)+' • '+(g.due?escPro(g.due):"Tarih yok")+'</small></div><span class="pro-detail-tag">'+(g.value>=g.target?"Tamamlandı":"Sürüyor")+'</span></div>').join(""):empty;
 const newsRows=news.length?news.slice(0,4).map(n=>'<div class="pro-detail-row"><div><strong>'+escPro(n.text)+'</strong><small>'+escPro(String(n.date||"").slice(0,10))+'</small></div></div>').join(""):empty;
 return '<div class="pro-detail-content"><div class="pro-detail-grid"><section class="pro-detail-panel"><div class="pro-chart-head"><div><h3>30 Günlük Görünüm</h3><p>Her günün kapanış puanına göre</p></div>'+button("Gelişmiş Grafiğe Git",'class="ghost" data-pro-action="stock-tab" data-value="chart"')+'</div><div class="pro-kpis">'+[["Açılış",fmt(latest.open)],["En Yüksek",fmt(latest.high)],["En Düşük",fmt(latest.low)],["Kapanış",fmt(latest.close)]].map(x=>'<div class="pro-kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div><div id="pro-overview-chart"></div><p class="pro-chart-note">Bütün değerler girilen gelişim puanlarından oluşturulur.</p></section><section class="pro-detail-panel"><h3>Hisse Bilgileri</h3><div class="pro-detail-row"><strong>Hisse kodu</strong><b>'+escPro(s.ticker)+'</b></div><div class="pro-detail-row"><strong>Sektör sıralaması</strong><b>'+rank+' / '+sectorList.length+'</b></div><div class="pro-detail-row"><strong>Toplam işlem sayısı</strong><b>'+trades().filter(t=>t.sector===id).length+'</b></div><div class="pro-detail-row"><strong>İzleme listesi</strong><b>'+(isFavorite(id)?"Takip ediliyor":"Eklenmedi")+'</b></div><div class="pro-detail-row"><strong>Temettü / ödül</strong><b>'+rewards.length+' kayıt</b></div><div class="pro-detail-row"><strong>Hedef ve görev</strong><b>'+goals.length+' hedef • '+tasks.length+' görev</b></div></section></div><div class="pro-detail-grid"><section class="pro-detail-panel"><div class="pro-chart-head"><h3>Bu Hisseye Bağlı Görevler</h3>'+button("Görevleri Aç",'class="ghost" data-pro-action="stock-tab" data-value="tasks"')+'</div>'+taskRows+'</section><section class="pro-detail-panel"><h3>Aktif Hedefler</h3>'+goalRows+'</section></div><section class="pro-detail-panel"><h3>Hisse Haberleri ve Gelişmeler</h3>'+newsRows+'</section></div>';
}
function isCompleted(t){
 const today=dayKey(new Date());if(!Array.isArray(t.logs))return false;
 const p=t.period;
 if(p==="daily")return t.logs.some(l=>l.key===today);
 if(p==="monthly")return t.logs.some(l=>l.key===today.slice(0,7));
 const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+4-(d.getDay()||7));
 const y=d.getFullYear(),first=new Date(y,0,1);const w=Math.ceil((Math.floor((d-first)/86400000)+1)/7);
 return t.logs.some(l=>l.key===y+"-W"+String(w).padStart(2,"0"));
}
function transactions(id){
 const t=trades().filter(t=>t.sector===id).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
 const positive=t.filter(x=>x.delta>0).length,negative=t.filter(x=>x.delta<0).length;
 return '<section class="pro-detail-panel"><div class="pro-chart-head"><div><h3>İşlem Geçmişi</h3><p>'+t.length+' kayıt • '+positive+' artış • '+negative+' düşüş</p></div>'+button("＋ Yeni İşlem",'data-pro-action="trade" data-id="'+escPro(id)+'"')+'</div>'+(t.length?t.map(x=>'<div class="pro-detail-row"><div><strong>'+escPro(x.description||"Puan işlemi")+'</strong><small>'+escPro(new Date(x.time).toLocaleString("tr-TR"))+(x.detail?" • "+escPro(x.detail):"")+'</small></div><div class="value '+cls(x.delta)+'">'+signedPro(x.delta)+'</div></div>').join(""):empty)+'</section>';
}
function tasksView(id){
 const arr=(data.tasksV2||[]).filter(t=>t.sector===id),goals=(data.goalsV2||[]).filter(g=>g.sector===id);
 return '<section class="pro-detail-panel"><div class="pro-chart-head"><div><h3>Bağlı Görevler</h3><p>Tamamlandığında mevcut günlük puan sınırına göre işlem oluşur.</p></div>'+button("Yeni Görev Oluştur",'class="ghost" data-pro-action="stock-plan" data-id="'+escPro(id)+'"')+'</div>'+(arr.length?arr.map(t=>'<div class="pro-detail-row"><div><strong>'+escPro(t.title)+'</strong><small>'+escPro(t.period==="daily"?"Günlük":t.period==="weekly"?"Haftalık":"Aylık")+' • +'+fmt(t.points)+' puan</small></div>'+button(isCompleted(t)?"Geri Al":"Tamamla",'class="ghost" data-pro-action="task-toggle" data-id="'+escPro(t.id)+'"')+'</div>').join(""):empty)+'</section><section class="pro-detail-panel"><h3>Bu Hissenin Hedefleri</h3>'+(goals.length?goals.map(g=>'<div class="pro-detail-row"><div><strong>'+escPro(g.title)+'</strong><small>'+fmt(g.value)+" / "+fmt(g.target)+(g.due?" • "+escPro(g.due):"")+'</small></div><span class="pro-detail-tag '+(g.value>=g.target?"pro-done":"")+'">'+(g.value>=g.target?"Tamamlandı":"Aktif")+'</span></div>').join(""):empty)+'</section>';
}
function notesView(id){
 const note=data.stockNotesV2?.[id]||"";
 return '<section class="pro-detail-panel"><h3>Hisse Not Defteri</h3><p class="terminal-intro">Planlarını, başarılarını ve kişisel değerlendirmelerini burada tutabilirsin. Notlar mevcut kayıt sisteminle eşitlenir.</p><label class="pro-eyebrow" for="pro-detail-notetext">KİŞİSEL NOTLARIM</label><textarea class="pro-detail-notearea" id="pro-detail-notetext" maxlength="1500" placeholder="Bu hisseyle ilgili düşüncelerim...">'+escPro(note)+'</textarea><div class="pro-detail-notefoot"><small>En fazla 1500 karakter</small>'+button("Notlarımı Kaydet",'data-pro-action="note-save" data-id="'+escPro(id)+'"')+'</div><p class="pro-chart-note">Bu alana gizli şifre, ödeme kartı bilgisi veya erişim anahtarı yazma.</p></section>';
}
function renderDetail(resetScroll=false){
 if(!state.opened)return;
 const id=state.opened,s=st(id);if(!s){closeStock();return;}
 const root=$("pro-stock-detail");
 root.innerHTML='<div class="pro-detail-shell">'+stockHeader(id)+tabBar()+'<main class="pro-detail-content" id="pro-detail-body"></main></div>';
 const body=$("pro-detail-body");
 if(state.detailTab==="overview"){
  body.innerHTML=overview(id);
  // The main chart is loaded only in the dedicated graph tab for compact overview performance.
 } else if(state.detailTab==="chart"){
  body.innerHTML=chartHTML("stock",id,"stock",s.name+" • "+s.ticker);
  bindChartLatest("stock");
 } else if(state.detailTab==="trades")body.innerHTML=transactions(id);
 else if(state.detailTab==="tasks")body.innerHTML=tasksView(id);
 else body.innerHTML=notesView(id);
 if(resetScroll)root.scrollTop=0;
}
function openStock(id){
 if(!st(id))return;
 state.previousFocus=document.activeElement;
 state.opened=id;state.detailTab="overview";
 const prior=$("terminal-stock-modal");if(prior)prior.hidden=true;
 $("pro-stock-detail").hidden=false;document.body.classList.add("pro-detail-open");
 renderDetail(true);
 $("pro-stock-detail").querySelector("[data-pro-action=stock-close]")?.focus({preventScroll:true});
}
function closeStock(){
 state.opened=null;$("pro-stock-detail").hidden=true;document.body.classList.remove("pro-detail-open");
 const focus=state.previousFocus;if(focus&&document.contains(focus))focus.focus({preventScroll:true});
}
function tabChange(tab){
 if(!["overview","chart","trades","tasks","notes"].includes(tab))return;
 state.detailTab=tab;renderDetail(true);
}
function openTrade(id){
 closeStock();
 if(typeof window.proShowScreen==="function")window.proShowScreen("market");
 if(typeof openMoverTrade==="function")openMoverTrade(id);
}
function openPlan(id){
 closeStock();
 if(typeof window.proShowScreen==="function")window.proShowScreen("plan");
 const select=$("terminal-task-sector");if(select&&st(id))select.value=id;
 const goal=$("terminal-goal-sector");if(goal&&st(id))goal.value=id;
}
function refresh(){
 if(!$("pro-market-top"))return;
 // Rebuild only the screen that is visible; other pages are refreshed when opened.
 const grp=groups();if(!grp.includes(state.selectedGroup))state.selectedGroup=grp[0]||null;
 if(state.marketScope!=="market"&&!grp.includes(state.marketScope))state.marketScope="market";
 renderMarket();
 if(state.marketTab==="sectors")renderSectors();
 if(state.opened)renderDetail();
}
function dispatch(e){
 const btn=e.target.closest("[data-pro-action]");if(!btn)return;
 const action=btn.dataset.proAction,v=btn.dataset.value,view=btn.dataset.view,id=btn.dataset.id;
 if(action==="market-tab"){
  state.marketTab=v==="sectors"?"sectors":"market";refresh();return;
 }
 if(action==="sector-pick"){state.selectedGroup=v;renderSectors();return;}
 if(action==="chart-period"||action==="chart-type"||action==="chart-toggle"){
  if(!["market","sector","stock"].includes(view))return;
  const s=config(view);
  if(action==="chart-period"){const n=Number(v);if(daysOpt.some(d=>d.n===n))s.n=n;}
  else if(action==="chart-type"){if(["line","area","candles"].includes(v))s.type=v;}
  else if(["ma7","ma30","volume"].includes(v))s[v]=!s[v];
  if(view==="market")renderMarket();
  else if(view==="sector")renderSectors();
  else if(state.opened)renderDetail();
  return;
 }
 if(action==="stock-open"){openStock(id);return;}
 if(action==="stock-close"){closeStock();return;}
 if(action==="stock-tab"){tabChange(v);return;}
 if(action==="trade"){openTrade(id);return;}
 if(action==="stock-plan"){openPlan(id);return;}
 if(action==="watch"){
  window.HayatBorsamTerminal?.toggleWatch?.(id);
  if(state.opened)renderDetail();return;
 }
 if(action==="task-toggle"){
  window.HayatBorsamTerminal?.completeTask?.(id);if(state.opened)renderDetail();return;
 }
 if(action==="note-save"){
  const f=$("pro-detail-notetext");if(!f)return;
  data.stockNotesV2??={};data.stockNotesV2[id]=f.value.slice(0,1500);
  save();return;
 }
}
function pointer(e){
 const svg=e.target.closest("[data-pro-svg]");if(!svg)return;
 const view=svg.dataset.proSvg,c=chartCache[view];if(!c||!c.rows.length)return;
 const r=svg.getBoundingClientRect();if(!r.width)return;
 const x=(e.clientX-r.left)*900/r.width;
 const index=c.rows.length===1?0:Math.max(0,Math.min(c.rows.length-1,Math.round((x-c.left)/(c.right-c.left)*(c.rows.length-1))));
 chartTooltip(view,index);
}
function init(){
 const market=$("screen-market");if(!market)return;
 const top=document.createElement("section");top.id="pro-market-top";market.insertBefore(top,market.firstChild);
 const sectors=document.createElement("section");sectors.id="pro-sector-section";market.insertBefore(sectors,top.nextSibling);
 const overlay=document.createElement("section");overlay.id="pro-stock-detail";overlay.className="pro-detail-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Hisse detayları");overlay.hidden=true;document.body.appendChild(overlay);
 document.addEventListener("click",dispatch);
 document.addEventListener("change",e=>{
  const s=e.target.closest("[data-pro-select]");if(!s)return;
  if(s.dataset.proSelect==="instrument"){state.marketScope=s.value;renderMarket();}
  if(s.dataset.proSelect==="sector"){state.selectedGroup=s.value;renderSectors();}
 });
 document.addEventListener("pointermove",pointer);
 document.addEventListener("pointerdown",pointer);
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&state.opened){closeStock();}
  if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&e.target.closest("[data-pro-svg]")){
   const v=e.target.closest("[data-pro-svg]").dataset.proSvg;
   const c=chartCache[v];if(c){const cur=Number(e.target.dataset.proCurrent||c.rows.length-1);const next=Math.max(0,Math.min(c.rows.length-1,cur+(e.key==="ArrowLeft"?-1:1)));e.target.dataset.proCurrent=next;chartTooltip(v,next);}
  }
 });
 const signOut=$("signOutBtn");if(signOut)signOut.addEventListener("click",closeStock);
 refresh();
}
window.HayatBorsamPro={refresh,openStock,closeStock};
init();
})();
