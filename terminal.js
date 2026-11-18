/* Hayat Borsam Terminal 2.0 — additive extension; original transactions and Firebase data stay intact. */
(function(){
"use strict";
const q=id=>document.getElementById(id);
const safe=value=>esc(String(value==null?"":value));
const uuid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"hb_"+Date.now()+"_"+Math.random().toString(36).slice(2);
const keyDay=(d=new Date())=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const shortDate=s=>{if(!s)return "Tarih yok";const d=new Date(s+"T12:00:00");return isNaN(d)?"Tarih yok":d.toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"});};
const money=n=>num(Number(n)||0);
const empty='<div class="terminal-empty">Henüz kayıt yok. İlk adımı eklediğinde burada görünecek.</div>';
let marketFilter="all",marketSearch="",marketSort="name",openedStock=null,reportDays=7;

function ensureData(){
 if(!Array.isArray(data.tasksV2))data.tasksV2=[];
 if(!Array.isArray(data.goalsV2))data.goalsV2=[];
 if(!Array.isArray(data.watchlistV2))data.watchlistV2=[];
 if(!data.stockNotesV2||typeof data.stockNotesV2!=="object")data.stockNotesV2={};
}
function timelineRows(){return timeline().filter(x=>Date.parse(x.time)<=Date.now());}
function stocks(){return sectorsList();}
function sector(id){return stocks().find(x=>x.id===id);}
function dayChange(id,k=keyDay()){return data.trades.filter(t=>t.sector===id&&t.time.slice(0,10)===k).reduce((a,t)=>a+t.delta,0);}
function rangeChange(id,n){const cutoff=Date.now()-n*86400000;return data.trades.filter(t=>t.sector===id&&Date.parse(t.time)>=cutoff&&Date.parse(t.time)<=Date.now()).reduce((a,t)=>a+t.delta,0);}
function allRangeChange(n){const cutoff=Date.now()-n*86400000;return data.trades.filter(t=>Date.parse(t.time)>=cutoff&&Date.parse(t.time)<=Date.now()).reduce((a,t)=>a+t.delta,0);}
function pct(v,initial){return initial?((v/initial)*100).toFixed(1).replace(".",",")+"%":"—";}
function signs(v){return v>0?"up":v<0?"down":"neutral-delta";}
function pill(v){return '<span class="terminal-chip '+(v<0?"negative":v===0?"neutral":"")+'">'+(v>0?"▲ ":v<0?"▼ ":"＝ ")+safe(money(Math.abs(v)))+'</span>';}
function sectOptions(selected){return stocks().map(s=>'<option value="'+safe(s.id)+'"'+(selected===s.id?" selected":"")+'>'+safe(s.icon)+" "+safe(s.name)+'</option>').join("");}
function currentIndex(){const rows=timelineRows();return rows.length?rows[rows.length-1].level:data.base;}
function prevIndex(n){return currentIndex()-allRangeChange(n)/Math.max(1,stocks().length);}
function streak(){const active=new Set(data.trades.map(t=>t.time.slice(0,10)));let d=new Date();if(!active.has(keyDay(d)))d.setDate(d.getDate()-1);let n=0;while(active.has(keyDay(d))&&n<1000){n++;d.setDate(d.getDate()-1);}return n;}
function periodKey(period,d=new Date()){if(period==="monthly")return keyDay(d).slice(0,7);if(period==="weekly"){const c=new Date(d);c.setHours(12,0,0,0);c.setDate(c.getDate()+4-(c.getDay()||7));const y=c.getFullYear(),first=new Date(y,0,1),w=Math.ceil((((c-first)/86400000)+1)/7);return y+"-W"+String(w).padStart(2,"0");}return keyDay(d);}
function isTaskDone(t){const k=periodKey(t.period);return Array.isArray(t.logs)&&t.logs.some(l=>l.key===k);}
function periodLabel(p){return p==="weekly"?"Haftalık":p==="monthly"?"Aylık":"Günlük";}
function goalPct(g){return Math.max(0,Math.min(100,100*(Number(g.value)||0)/Math.max(1,Number(g.target)||1)));}
function button(label,attrs){return '<button type="button" '+attrs+'>'+label+'</button>';}
function svgLine(values){if(!values.length)return "";let min=Math.min.apply(null,values),max=Math.max.apply(null,values),span=Math.max(1,max-min);return values.map((v,i)=>(i?"L":"M")+(18+i*596/Math.max(1,values.length-1)).toFixed(1)+" "+(137-(v-min)/span*108).toFixed(1)).join(" ");}
function sectorHistory(id,n=30){const now=Date.now(),start=now-n*86400000;const arr=data.trades.filter(t=>t.sector===id&&Date.parse(t.time)<=now).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));let val=initialOf(id);for(const t of arr)if(Date.parse(t.time)<start)val+=t.delta;const values=[val];for(const t of arr)if(Date.parse(t.time)>=start)values.push(val+=t.delta);return values.length===1?[val,val]:values;}
function newEl(tag,id,className){const x=document.createElement(tag);if(id)x.id=id;if(className)x.className=className;return x;}

function init(){
 ensureData();
 const home=q("screen-home"),market=q("screen-market"),plan=q("screen-plan"),menu=q("screen-menu"),trade=q("screen-trade");
 if(!home||!market||!plan||!menu||!trade)return;
 const head=newEl("div","terminal-home-head");
 head.innerHTML='<div class="terminal-hero"><div class="terminal-kicker">KİŞİSEL PİYASA / HBX</div><div style="display:flex;align-items:center;flex-wrap:wrap"><div class="terminal-big" id="terminal-main-index">—</div><span class="terminal-gain" id="terminal-main-delta">—</span></div><div class="muted" id="terminal-hero-note">Kendi hedeflerinle oluşturduğun kişisel gelişim endeksi</div><div class="terminal-actions">'+button("＋ Yeni İşlem",'data-open-screen="trade"')+button("Piyasayı Gör",'class="secondary" data-open-screen="market"')+button("Bugünkü Planım",'class="secondary" data-open-screen="plan"')+'</div></div><div id="terminal-ticker" class="terminal-ticker" aria-label="Gelişim hisselerinin kısa özeti"></div>';
 home.insertBefore(head,home.firstChild);
 const homeLower=newEl("div","terminal-home-lower","terminal-section terminal-columns");
 homeLower.innerHTML='<section class="card"><div class="terminal-heading"><h2>Bugünün Piyasa Özeti</h2><span class="hint">Kişisel verilerin</span></div><div class="terminal-metric-grid" id="terminal-home-stats"></div><div id="terminal-home-movers"></div></section><section class="card"><div class="terminal-heading"><h2>Bugünkü Önceliklerim</h2>'+button("Planı Aç",'class="terminal-button-link" data-open-screen="plan"')+'</div><div id="terminal-home-tasks"></div><div class="rule"></div><h3>Akıllı Analiz</h3><div class="terminal-callout" id="terminal-home-insight"></div></section>';
 home.appendChild(homeLower);
 const prelude=newEl("div","terminal-market-prelude","terminal-section");
 prelude.innerHTML='<section class="card"><div class="terminal-heading"><h2>Canlı Kişisel Piyasa</h2><span class="terminal-chip neutral">Simülasyon / Gerçek para içermez</span></div><p class="terminal-intro">Fiyatlar, senin girdiğin kişisel gelişim puanlarıdır; gerçek menkul kıymet veya piyasa verisi değildir.</p><div class="terminal-metric-grid" id="terminal-market-metrics"></div><div class="rule"></div><h3>Günlük Isı Haritası</h3><div id="terminal-heat" class="terminal-heat"></div></section><section class="card section"><div class="terminal-heading"><h2>Hisse Takip Ekranı</h2><span class="hint" id="terminal-stock-count"></span></div><div class="terminal-toolbar"><input id="terminal-search" aria-label="Hisse ara" placeholder="Hisse veya kod ara..."><select id="terminal-filter" aria-label="Hisse filtresi"><option value="all">Tüm Hisseler</option><option value="favorites">★ İzleme Listem</option><option value="rising">Bugün Yükselenler</option><option value="falling">Bugün Düşenler</option></select><select id="terminal-sort" aria-label="Hisse sıralama"><option value="name">İsme Göre</option><option value="value">Değer (yüksekten)</option><option value="change">Günlük Değişim</option></select></div><div id="terminal-stock-list" class="terminal-watchlist"></div></section>';
 market.insertBefore(prelude,market.firstChild);
 plan.innerHTML='<section class="card"><h2 class="terminal-section-title">Görevler ve Alışkanlıklar</h2><p class="terminal-intro">Hisseye bağlı görevlerini tamamladıkça, günlük +10 puan sınırı içinde otomatik işlem oluşur. Dinlenme günleri ceza yaratmaz.</p><form id="terminal-task-form" class="terminal-form-grid"><div class="field wide"><label for="terminal-task-title">Görev adı</label><input id="terminal-task-title" required maxlength="90" placeholder="Örn. 20 sayfa kitap oku"></div><div class="field"><label for="terminal-task-sector">İlgili hisse</label><select id="terminal-task-sector"></select></div><div class="field"><label for="terminal-task-period">Sıklık</label><select id="terminal-task-period"><option value="daily">Her gün</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option></select></div><div class="field"><label for="terminal-task-points">Ödül puanı</label><input id="terminal-task-points" type="number" min="0" max="10" step="0.5" value="3" required></div><button type="submit">Görev Ekle</button></form><div class="rule"></div><div class="terminal-heading"><h3>Aktif Görevlerim</h3><span id="terminal-task-progress" class="hint"></span></div><div id="terminal-task-list"></div></section><section class="card"><h2 class="terminal-section-title">Ölçülebilir Hedeflerim</h2><p class="terminal-intro">Kitap sayısı, satış adedi, tamamlanan proje veya çalışma saati gibi gerçek sonuçları kaydet.</p><form id="terminal-goal-form" class="terminal-form-grid"><div class="field wide"><label for="terminal-goal-title">Hedef adı</label><input id="terminal-goal-title" required maxlength="100" placeholder="Örn. 20 yeni OynaBak görüşmesi"></div><div class="field"><label for="terminal-goal-sector">İlgili hisse</label><select id="terminal-goal-sector"></select></div><div class="field"><label for="terminal-goal-target">Hedef miktarı</label><input id="terminal-goal-target" type="number" min="0.01" step="any" required placeholder="20"></div><div class="field"><label for="terminal-goal-due">Bitiş tarihi</label><input id="terminal-goal-due" type="date"></div><button type="submit">Hedef Ekle</button></form><div class="rule"></div><div id="terminal-goal-list" class="terminal-goals"></div></section>';
 menu.innerHTML='<section class="card"><h2 class="terminal-section-title">Borsa Yönetimi</h2><p class="terminal-intro">Raporlarını, geçmişini, haberlerini, temettülerini ve piyasa ayarlarını bu bölümde yönet.</p><div class="terminal-menu-grid">'+button("📋 İşlem Geçmişi<small>Tüm kayıtlarını görüntüle</small>",'data-open-screen="history"')+button("📈 Hisse Analizi<small>Piyasa ve hisse detayları</small>",'data-open-screen="market"')+button("🎯 Görev ve Hedefler<small>Planını düzenle</small>",'data-open-screen="plan"')+button("⬇ JSON Yedekle<small>Verilerinin kopyasını indir</small>",'id="terminal-menu-backup"')+'</div></section><section class="card" id="terminal-report-card"><div class="terminal-heading"><h2>Performans Raporu</h2><div class="actions"><select id="terminal-report-days" aria-label="Rapor dönemi"><option value="7">Son 7 Gün</option><option value="30">Son 30 Gün</option><option value="90">Son 90 Gün</option></select>'+button("Yazdır / PDF",'id="terminal-print" class="ghost"')+'</div></div><div id="terminal-report" class="terminal-report"></div></section><section class="card"><h2 class="terminal-section-title">Başarı Rozetlerim</h2><p class="terminal-intro">Rozetler yatırım getirisi değil, kendi hedeflerine yönelik kayıtlı ilerlemenin işaretleridir.</p><div id="terminal-achievements" style="display:flex;flex-wrap:wrap;gap:9px"></div></section><details class="terminal-tools card" id="terminal-legacy-tools"><summary>Diğer Borsa Araçları ve Ayarlar</summary><div id="terminal-tools-body"></div></details>';
 // Existing DOM nodes retain their event listeners when moved.
 const toolBody=q("terminal-tools-body");
 ["dailyClose","openingClosing","monthlyReport","weeklyReport","lifeNews","dividends"].forEach(id=>{const e=q(id);if(e)toolBody.appendChild(e);});
 const remaining=[...trade.children].filter(el=>el.id!=="newTrade"&&el.id!=="quickActions");
 remaining.forEach(el=>toolBody.appendChild(el));
 const calendar=q("calendarSection");if(calendar)plan.appendChild(calendar);
 const modal=newEl("div","terminal-stock-modal","terminal-modal-cover");modal.hidden=true;modal.innerHTML='<div class="terminal-modal" role="dialog" aria-modal="true" aria-labelledby="terminal-modal-title"><div class="terminal-modal-head"><div><div class="terminal-kicker" style="color:#627894">HİSSE PROFİLİ</div><h2 id="terminal-modal-title" style="font-size:22px;margin:6px 0"></h2><p class="terminal-intro" id="terminal-modal-sub"></p></div>'+button("✕ Kapat",'id="terminal-close-modal" class="ghost"')+'</div><div id="terminal-modal-data"></div></div>';document.body.appendChild(modal);
 q("terminal-task-sector").innerHTML=sectOptions();
 q("terminal-goal-sector").innerHTML=sectOptions();
 q("terminal-search").addEventListener("input",e=>{marketSearch=e.target.value.toLocaleLowerCase("tr-TR");renderStockList();});
 q("terminal-filter").addEventListener("change",e=>{marketFilter=e.target.value;renderStockList();});
 q("terminal-sort").addEventListener("change",e=>{marketSort=e.target.value;renderStockList();});
 q("terminal-task-form").addEventListener("submit",addTask);
 q("terminal-goal-form").addEventListener("submit",addGoal);
 q("terminal-report-days").addEventListener("change",e=>{reportDays=Number(e.target.value);renderReport();});
 q("terminal-print").addEventListener("click",()=>window.print());
 q("terminal-menu-backup").addEventListener("click",()=>q("backup").click());
 q("terminal-close-modal").addEventListener("click",closeModal);
 modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
 document.addEventListener("click",actions);
 const oldRender=render;
 render=function(){oldRender();renderTerminal();};
 // Ensure latest categories are reflected when new custom stocks are added.
 renderTerminal();
 if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
function closeModal(){q("terminal-stock-modal").hidden=true;openedStock=null;document.body.style.overflow="";}
function actions(e){
 const target=e.target.closest("[data-open-screen],[data-sector-detail],[data-t-watch],[data-t-trade],[data-t-task],[data-t-task-delete],[data-t-goal],[data-t-goal-delete],[data-t-note]");
 if(!target)return;
 if(target.hasAttribute("data-open-screen")){window.proShowScreen(target.dataset.openScreen);return;}
 if(target.hasAttribute("data-sector-detail")){showStock(target.dataset.sectorDetail);return;}
 if(target.hasAttribute("data-t-watch")){toggleWatch(target.dataset.tWatch);return;}
 if(target.hasAttribute("data-t-trade")){const id=target.dataset.tTrade;closeModal();window.proShowScreen("market");openMoverTrade(id);return;}
 if(target.hasAttribute("data-t-task")){toggleTask(target.dataset.tTask);return;}
 if(target.hasAttribute("data-t-task-delete")){deleteTask(target.dataset.tTaskDelete);return;}
 if(target.hasAttribute("data-t-goal")){updateGoal(target.dataset.tGoal);return;}
 if(target.hasAttribute("data-t-goal-delete")){deleteGoal(target.dataset.tGoalDelete);return;}
 if(target.hasAttribute("data-t-note")){const id=target.dataset.tNote;data.stockNotesV2[id]=q("terminal-note-input").value.slice(0,1500);save();showStock(id);return;}
}
function renderTerminal(){
 ensureData();if(!q("terminal-market-prelude"))return;
 const total=currentIndex(),today=data.trades.filter(t=>t.time.slice(0,10)===keyDay()).length,dc=allRangeChange(1)/Math.max(1,stocks().length);
 q("terminal-main-index").textContent=money(total);
 q("terminal-main-delta").textContent=(dc>=0?"+":"")+money(dc)+" bugün";
 q("terminal-hero-note").textContent=stocks().length+" hisse • "+today+" günlük işlem • Gerçek para işlemi değildir";
 renderTicker();renderHome();renderMarket();renderTasks();renderGoals();renderReport();renderAwards();
 if(openedStock)showStock(openedStock);
}
function renderTicker(){
 const ids=data.watchlistV2.length?data.watchlistV2:stocks().slice(0,9).map(s=>s.id);
 q("terminal-ticker").innerHTML=ids.map(id=>{const s=sector(id);if(!s)return "";const c=dayChange(id);return '<div class="terminal-quote"><b>'+safe(s.ticker)+'</b><strong>'+money(currentOf(id))+'</strong><span class="'+signs(c)+'">'+(c>=0?"+":"")+money(c)+'</span>'+button("Detay",'data-sector-detail="'+safe(id)+'" class="ghost"')+'</div>';}).join("");
}
function renderHome(){
 const today=keyDay(),trades=data.trades.filter(t=>t.time.slice(0,10)===today),rated=new Set(trades.map(t=>t.sector)).size;
 const up=stocks().filter(s=>dayChange(s.id)>0).length,down=stocks().filter(s=>dayChange(s.id)<0).length;
 q("terminal-home-stats").innerHTML=[
  ["Günlük işlem",trades.length],["Değerlendirilen hisse",rated+"/"+stocks().length],["Yükselen",up],["Düşen",down]
 ].map(x=>'<div class="terminal-metric"><small>'+safe(x[0])+'</small><strong>'+safe(x[1])+'</strong></div>').join("");
 const ranked=stocks().map(s=>({s,delta:dayChange(s.id)})).filter(x=>x.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,4);
 q("terminal-home-movers").innerHTML=ranked.length?'<h3 style="margin-top:17px">Günün Hareketleri</h3>'+ranked.map(x=>'<div class="terminal-mini-row"><div style="flex:1;min-width:0"><b>'+safe(x.s.name)+'</b><small style="display:block;color:#728299">'+safe(x.s.ticker)+'</small></div>'+pill(x.delta)+button("İncele",'data-sector-detail="'+safe(x.s.id)+'" class="ghost"')+'</div>').join(""):'<p class="terminal-empty">Bugün henüz işlem yok. İlk işleminle piyasa hareket etmeye başlayacak.</p>';
 const pending=data.tasksV2.filter(t=>!isTaskDone(t)).slice(0,4);
 q("terminal-home-tasks").innerHTML=pending.length?pending.map(t=>'<div class="terminal-mini-row"><div style="flex:1"><b>'+safe(t.title)+'</b><small style="display:block;color:#728299">'+safe(periodLabel(t.period))+" • "+safe(sector(t.sector)?.name||"Hisse")+'</small></div>'+button("Tamamla",'data-t-task="'+safe(t.id)+'" class="ghost"')+'</div>').join(""):'<div class="terminal-empty">Açık görevin bulunmuyor. Plan bölümünden görev oluşturabilirsin.</div>';
 const recent=stocks().map(s=>({s,c:rangeChange(s.id,7)})).sort((a,b)=>a.c-b.c),weak=recent[0],strong=recent[recent.length-1];
 const completed=data.tasksV2.filter(isTaskDone).length;
 const message=strong&&weak&&data.trades.length?
   "Son 7 günün en güçlü alanı "+strong.s.name+" ("+(strong.c>=0?"+":"")+money(strong.c)+"). "+(weak.c<0?"Daha fazla ilgi isteyebilecek alan "+weak.s.name+".":"Bu hafta belirgin gerileme kaydedilmedi.")+" Bu dönemde "+completed+" görev tamamlandı.":
   "Henüz karşılaştırma yapacak kadar işlem kaydı yok. Küçük, sürdürülebilir adımlarla başlayabilir; puanları kendi kurallarına göre değerlendirebilirsin.";
 q("terminal-home-insight").textContent=message;
}
function renderMarket(){
 const n=stocks().length,positive=stocks().filter(s=>dayChange(s.id)>0).length,negative=stocks().filter(s=>dayChange(s.id)<0).length;
 const total=currentIndex(),dif=total-data.base;
 q("terminal-market-metrics").innerHTML=[["HBX",money(total)],["Başlangıca göre",(dif>=0?"+":"")+money(dif)],["Yükselen hisse",positive],["Düşen hisse",negative]].map(x=>'<div class="terminal-metric"><small>'+safe(x[0])+'</small><strong>'+safe(x[1])+'</strong></div>').join("");
 q("terminal-heat").innerHTML=stocks().map(s=>{const d=dayChange(s.id);return button('<b>'+safe(s.ticker)+'</b><span>'+safe(s.name)+'</span><strong>'+(d>=0?"+":"")+money(d)+'</strong>','class="'+(d>0?"heat-up":d<0?"heat-down":"heat-flat")+'" data-sector-detail="'+safe(s.id)+'" title="'+safe(s.name)+'"');}).join("");
 renderStockList();
}
function renderStockList(){
 const all=stocks().filter(s=>{
  const d=dayChange(s.id);
  if(marketFilter==="favorites"&&!data.watchlistV2.includes(s.id))return false;
  if(marketFilter==="rising"&&d<=0)return false;
  if(marketFilter==="falling"&&d>=0)return false;
  return (s.name+" "+s.ticker+" "+s.group).toLocaleLowerCase("tr-TR").includes(marketSearch);
 });
 all.sort((a,b)=>marketSort==="value"?currentOf(b.id)-currentOf(a.id):marketSort==="change"?dayChange(b.id)-dayChange(a.id):a.name.localeCompare(b.name,"tr"));
 q("terminal-stock-count").textContent=all.length+" / "+stocks().length+" hisse";
 q("terminal-stock-list").innerHTML=all.length?all.map(s=>{const ch=dayChange(s.id),watched=data.watchlistV2.includes(s.id);
  return '<div class="terminal-stock"><div><div class="stock-name">'+safe(s.icon)+" "+safe(s.name)+'</div><small>'+safe(s.ticker)+" • "+safe(s.group||"Gelişim")+'</small></div><div class="stock-price">'+money(currentOf(s.id))+'<small>puan</small></div><div class="stock-change '+signs(ch)+'">'+(ch>0?"+":"")+money(ch)+'<small>Bugün</small></div><div class="stock-tools">'+button(watched?"★":"☆",'class="favorite '+(watched?"is-on":"")+'" data-t-watch="'+safe(s.id)+'" aria-label="'+(watched?"İzleme listesinden çıkar":"İzleme listesine ekle")+'"')+button("Detay",'data-sector-detail="'+safe(s.id)+'"')+'</div></div>';
 }).join(""):empty;
}
function toggleWatch(id){ensureData();data.watchlistV2=data.watchlistV2.includes(id)?data.watchlistV2.filter(x=>x!==id):data.watchlistV2.concat(id);save();}
function showStock(id){
 const s=sector(id);if(!s)return;openedStock=id;
 const rows=data.trades.filter(t=>t.sector===id).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)),val=currentOf(id),ini=initialOf(id),day=dayChange(id),week=rangeChange(id,7),month=rangeChange(id,30);
 const svgValues=sectorHistory(id),chart=svgLine(svgValues),color=month<0?"#c34359":"#0b986d";
 q("terminal-modal-title").textContent=s.icon+" "+s.name+" ("+s.ticker+")";
 q("terminal-modal-sub").textContent=(s.group||"Gelişim")+" • Kişisel gelişim puanı, gerçek menkul kıymet değil";
 q("terminal-modal-data").innerHTML='<div class="terminal-metric-grid">'+[["Güncel değer",money(val)],["Bugün",signed(day)],["7 gün",signed(week)],["30 gün",signed(month)]].map(x=>'<div class="terminal-metric"><small>'+safe(x[0])+'</small><strong>'+safe(x[1])+'</strong></div>').join("")+'</div><div class="terminal-modal-chart"><svg viewBox="0 0 640 160" role="img" aria-label="Hisse son 30 gün eğrisi"><path d="'+chart+'" fill="none" stroke="'+color+'" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"></path><line x1="18" y1="145" x2="620" y2="145" stroke="#dfe6ed" stroke-width="1"></line></svg></div><div class="terminal-modal-meta"><span>Başlangıç: <b>'+money(ini)+'</b></span><span>Toplam değişim: <b>'+signed(val-ini)+'</b></span><span>İşlem: <b>'+rows.length+'</b></span></div><p class="terminal-legend">30 günlük çizgi, girişlerine göre hesaplanır. Hisse değerleri kişisel puanlardır; yatırım tavsiyesi veya gerçek piyasa fiyatı içermez.</p><div class="terminal-actions">'+button("＋ Bu Hisseyi Puanla",'data-t-trade="'+safe(id)+'"')+button(data.watchlistV2.includes(id)?"★ Listemden Çıkar":"☆ İzleme Listeme Ekle",'data-t-watch="'+safe(id)+'" class="ghost"')+'</div><div class="terminal-label">Hisse Notlarım</div><textarea id="terminal-note-input" maxlength="1500" placeholder="Bu alandaki gelişmelerini ve düşüncelerini yaz...">'+safe(data.stockNotesV2[id]||"")+'</textarea>'+button("Notu Kaydet",'data-t-note="'+safe(id)+'" class="ghost"')+'<h3 style="margin-top:18px">Son İşlemler</h3>'+(rows.length?rows.slice(0,8).map(t=>'<div class="terminal-mini-row"><div style="flex:1"><b>'+safe(t.description)+'</b><small style="display:block;color:#718095">'+safe(new Date(t.time).toLocaleString("tr-TR"))+'</small></div>'+pill(t.delta)+'</div>').join(""):empty);
 q("terminal-stock-modal").hidden=false;document.body.style.overflow="hidden";
}
function addTask(e){
 e.preventDefault();ensureData();
 const title=q("terminal-task-title").value.trim(),sectorId=q("terminal-task-sector").value,points=Number(q("terminal-task-points").value),period=q("terminal-task-period").value;
 if(!title||!sector(sectorId)||!["daily","weekly","monthly"].includes(period)||!Number.isFinite(points)||points<0||points>10)return alert("Geçerli görev, hisse, sıklık ve 0–10 arası puan belirle.");
 data.tasksV2.push({id:uuid(),title,sector:sectorId,points,period,createdAt:new Date().toISOString(),logs:[]});
 q("terminal-task-title").value="";save();
}
function renderTasks(){
 const c=q("terminal-task-list"),tasks=data.tasksV2,done=tasks.filter(isTaskDone).length;
 q("terminal-task-progress").textContent=done+"/"+tasks.length+" tamamlandı";
 c.innerHTML=tasks.length?tasks.slice().sort((a,b)=>Number(isTaskDone(a))-Number(isTaskDone(b))).map(t=>{
  const completed=isTaskDone(t),s=sector(t.sector),log=(t.logs||[]).find(l=>l.key===periodKey(t.period));
  return '<div class="terminal-task"><span style="font-size:21px">'+(completed?"☑":"□")+'</span><div class="description"><b class="'+(completed?"done":"")+'">'+safe(t.title)+'</b><small>'+safe(periodLabel(t.period))+" • "+safe(s?s.name:"Silinmiş Hisse")+" • +"+money(t.points)+" puan"+(log?(" • İşlenen: +"+money(log.awarded||0)):"")+'</small></div>'+button(completed?"Geri Al":"Tamamla",'data-t-task="'+safe(t.id)+'" class="'+(completed?"ghost":"")+'"')+button("Sil",'data-t-task-delete="'+safe(t.id)+'" class="danger"')+'</div>';
 }).join(""):empty;
}
function toggleTask(id){
 ensureData();const t=data.tasksV2.find(x=>x.id===id);if(!t)return;
 const k=periodKey(t.period);t.logs??=[];const existing=t.logs.find(l=>l.key===k);
 if(existing){
  if(existing.tradeId)data.trades=data.trades.filter(x=>x.id!==existing.tradeId);
  t.logs=t.logs.filter(l=>l!==existing);save();return;
 }
 if(!sector(t.sector))return alert("Görevin bağlı olduğu hisse artık bulunmuyor.");
 const possible=Math.max(0,10-daySectorSum(t.sector,keyDay())),awarded=Math.min(t.points,possible),tradeId=awarded>0?uuid():null;
 if(awarded>0)data.trades.push({id:tradeId,time:localInputDate(),sector:t.sector,description:"Görev: "+t.title,detail:"Planlayıcıdan otomatik oluşturuldu.",delta:awarded,autoTaskId:t.id});
 t.logs.push({key:k,at:new Date().toISOString(),tradeId,awarded});
 save();if(t.points>awarded)alert("Görev tamamlandı. Hisse günlük +10 tavanına yaklaştığı için "+money(awarded)+" puan işlendi.");
}
function deleteTask(id){
 if(!confirm("Görev silinsin mi? Geçmişte oluşmuş işlemler saklanır."))return;
 data.tasksV2=data.tasksV2.filter(x=>x.id!==id);save();
}
function addGoal(e){
 e.preventDefault();ensureData();const title=q("terminal-goal-title").value.trim(),s=q("terminal-goal-sector").value,target=Number(q("terminal-goal-target").value),due=q("terminal-goal-due").value;
 if(!title||!sector(s)||!Number.isFinite(target)||target<=0)return alert("Geçerli hedef adı, hisse ve hedef miktarı gir.");
 data.goalsV2.push({id:uuid(),title,sector:s,target,value:0,due,createdAt:new Date().toISOString()});
 q("terminal-goal-title").value="";q("terminal-goal-target").value="";q("terminal-goal-due").value="";save();
}
function renderGoals(){
 const e=q("terminal-goal-list"),goals=data.goalsV2;
 e.innerHTML=goals.length?goals.map(g=>{
  const p=goalPct(g),done=p>=100,overdue=g.due&&g.due<keyDay()&&!done;
  return '<div class="terminal-goal"><div class="terminal-heading"><h3>'+safe(g.title)+'</h3><span class="terminal-chip '+(overdue?"negative":done?"":"neutral")+'">'+(done?"✓ Tamamlandı":overdue?"Tarih geçti":"Aktif")+'</span></div><small class="hint">'+safe(sector(g.sector)?.name||"Silinmiş Hisse")+(g.due?" • Bitiş: "+shortDate(g.due):"")+'</small><div class="value">'+money(g.value)+" / "+money(g.target)+'</div><div class="track"><i style="width:'+p+'%"></i></div><div class="terminal-goal-actions"><input aria-label="İlerleme miktarı" id="goal-amount-'+safe(g.id)+'" type="number" step="any" min="-1000000" max="1000000" placeholder="Adet">'+button("İlerleme Kaydet",'data-t-goal="'+safe(g.id)+'"')+button("Sil",'data-t-goal-delete="'+safe(g.id)+'" class="danger"')+'</div></div>';
 }).join(""):empty;
}
function updateGoal(id){
 const g=data.goalsV2.find(x=>x.id===id);if(!g)return;
 const field=q("goal-amount-"+id),n=Number(field.value);
 if(!field.value||!Number.isFinite(n)||n===0)return alert("Eklenecek ya da düzeltilecek miktarı gir. Azaltmak için negatif sayı kullan.");
 g.value=Math.max(0,g.value+n);save();
}
function deleteGoal(id){if(!confirm("Bu hedefi silmek istediğine emin misin?"))return;data.goalsV2=data.goalsV2.filter(g=>g.id!==id);save();}
function renderReport(){
 const div=q("terminal-report"),total=currentIndex(),start=prevIndex(reportDays),change=total-start,threshold=Date.now()-reportDays*86400000;
 const rows=data.trades.filter(t=>Date.parse(t.time)>=threshold&&Date.parse(t.time)<=Date.now());
 const ranked=stocks().map(s=>({s,delta:rangeChange(s.id,reportDays)})).sort((a,b)=>b.delta-a.delta);
 const active=ranked.filter(x=>x.delta!==0),positive=ranked.filter(x=>x.delta>0),negative=ranked.filter(x=>x.delta<0),goalsDone=data.goalsV2.filter(g=>goalPct(g)>=100).length;
 const completedLogs=data.tasksV2.reduce((n,t)=>n+(t.logs||[]).filter(l=>Date.parse(l.at)>=threshold).length,0);
 const analyst=rows.length?("Bu dönemde "+positive.length+" hisse yükseldi, "+negative.length+" hisse geriledi. "+(ranked[0]&&ranked[0].delta>0?ranked[0].s.name+" en güçlü alan oldu. ":"")+(ranked[ranked.length-1]&&ranked[ranked.length-1].delta<0?ranked[ranked.length-1].s.name+" için sürdürülebilir küçük bir hedef belirleyebilirsin.":"Düşüş kaydedilen alan bulunmuyor.")):"Bu dönem henüz işlem bulunmuyor. Raporlar yalnızca kişisel kayıtlarınla oluşturulur.";
 div.innerHTML='<p class="terminal-intro">Son '+reportDays+' günlük kayıtlarına dayanan otomatik özet. Hedeflerin ve hisse puanların gerçek finansal varlık değildir.</p><div class="summary">'+[["Dönem sonu HBX",money(total)],["HBX değişimi",(change>=0?"+":"")+money(change)],["Kayıtlı işlem",rows.length],["Tamamlanan görev",completedLogs],["Tamamlanan hedef",goalsDone],["İşlem serisi",streak()+" gün"]].map(x=>'<div><small>'+safe(x[0])+'</small><b>'+safe(x[1])+'</b></div>').join("")+'</div><h3>Performans Sıralaması</h3><div class="table">'+(active.length?active.map(x=>'<div><span>'+safe(x.s.name)+'</span><b class="'+signs(x.delta)+'">'+signed(x.delta)+'</b></div>').join(""):empty)+'</div><h3>Dönem Değerlendirmesi</h3><div class="terminal-callout">'+safe(analyst)+'</div><p class="terminal-legend" style="margin-top:14px">Ölçüm: Girilen hisse puanı değişimleri. İşlem bulunmayan günler başarısızlık olarak değerlendirilmez.</p>';
}
function renderAwards(){
 const n=data.trades.length,s=streak(),completed=data.goalsV2.filter(g=>goalPct(g)>=100).length,taskDone=data.tasksV2.reduce((a,t)=>a+(t.logs||[]).length,0);
 const badges=[["İlk İşlem",n>=1,"İlk gelişim kaydı"],["İstikrarlı Başlangıç",s>=3,"3 günlük işlem serisi"],["7 Günlük Seri",s>=7,"7 günlük işlem serisi"],["100 İşlem",n>=100,"100 gelişim kaydı"],["Hedef Tamamlandı",completed>0,"İlk gerçek hedef"],["Plan Uygulayıcısı",taskDone>=10,"10 görev tamamla"]];
 q("terminal-achievements").innerHTML=badges.map(b=>'<span class="terminal-badge '+(b[1]?"":"locked")+'" title="'+safe(b[2])+'">'+(b[1]?"🏅 ":"🔒 ")+safe(b[0])+'</span>').join("");
}
window.HayatBorsamTerminal={refresh:renderTerminal,openStock:showStock};
init();
})();
