/* Hayat Borsasi - Hisse ve Sirket Isimleri Duzenleme Modulu
   Additive only: stable IDs, trades, prices, balances and orders remain untouched. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let filter="";
function list(){return typeof sectorsList==="function"?sectorsList():[];}
function duplicates(){
 const rows=list(), names=new Map(),tickers=new Map(),out=[];
 for(const s of rows){
  const n=String(s.name||"").trim().toLocaleLowerCase("tr-TR");
  const t=String(s.ticker||"").trim().toLocaleUpperCase("tr-TR");
  if(n){if(names.has(n))out.push("Aynı şirket adı: "+s.name);else names.set(n,s.id);}
  if(t){if(tickers.has(t))out.push("Tekrarlanan hisse kodu: "+s.ticker);else tickers.set(t,s.id);}
 }
 return [...new Set(out)];
}
function render(){
 const root=$("company-name-editor");if(!root)return;
 const rows=list().filter(s=>(String(s.name)+" "+String(s.ticker)).toLocaleLowerCase("tr-TR").includes(filter));
 const issues=duplicates();
 root.innerHTML='<div class="company-editor-head"><div><b>Hisse ve Şirket İsimleri</b><p>İsim ve kısa kodları düzenle. Kayıtların kimliği değişmez.</p></div><span class="company-editor-count">'+list().length+' kayıt</span></div>'+
 '<input id="company-editor-search" type="search" placeholder="Şirket adı veya hisse kodu ara..." value="'+esc(filter)+'">'+
 (issues.length?'<div class="company-editor-warning"><b>Kontrol edilmesi gereken kayıtlar</b><ul>'+issues.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>':'<div class="company-editor-ok">✓ Yinelenen şirket adı veya hisse kodu bulunmadı.</div>')+
 '<div class="company-editor-list">'+rows.map(s=>'<form class="company-editor-row" data-company-form="'+esc(s.id)+'">'+
 '<div class="company-editor-id"><b>'+esc(s.icon||"📈")+' '+esc(s.name)+'</b><small>'+esc(s.ticker)+' · '+esc(s.group||"Özel")+'</small></div>'+
 '<label>Şirket / Hisse adı<input name="name" maxlength="45" required value="'+esc(s.name)+'"></label>'+
 '<label>Hisse kodu<input name="ticker" maxlength="8" required value="'+esc(s.ticker)+'"></label>'+
 '<button type="submit">Kaydet</button></form>').join("")+'</div>'+
 '<p class="company-editor-foot">Not: Şirket adları ve kodları değişir; hisse kimlikleri, fiyat geçmişi, puanlar, işlem kayıtları, fon ağırlıkları ve diğer bağlı veriler korunur.</p>';
 $("company-editor-search").addEventListener("input",e=>{filter=e.target.value;const pos=e.target.selectionStart;render();const next=$("company-editor-search");next.focus();next.setSelectionRange(pos,pos);});
 root.querySelectorAll("[data-company-form]").forEach(form=>form.addEventListener("submit",e=>{
  e.preventDefault();
  const id=form.dataset.companyForm,name=form.elements.name.value.trim().replace(/\s+/g," "),ticker=form.elements.ticker.value.trim().replace(/\s+/g," ").toLocaleUpperCase("tr-TR");
  if(!name||!ticker)return alert("Şirket adı ve hisse kodu boş bırakılamaz.");
  if(!/^[\p{L}\p{N}.-]{1,8}$/u.test(ticker))return alert("Hisse kodu 1–8 karakter olmalı; harf, rakam, nokta veya tire kullan.");
  const conflict=list().find(s=>s.id!==id&&(String(s.name).trim().toLocaleLowerCase("tr-TR")===name.toLocaleLowerCase("tr-TR")||String(s.ticker).trim().toLocaleUpperCase("tr-TR")===ticker));
  if(conflict)return alert("Bu isim veya hisse kodu zaten kullanılıyor: "+conflict.name+" ("+conflict.ticker+").");
  const custom=Array.isArray(data.customSectors)&&data.customSectors.find(s=>s.id===id);
  if(custom){custom.name=name;custom.ticker=ticker;}
  else{data.companyNameOverrides??={};data.companyNameOverrides[id]={...(data.companyNameOverrides[id]||{}),name,ticker};}
  if(typeof save==="function"&&!save())return;
  render();
 }));
}
function mount(){
 const menu=$("screen-menu");
 const anchor=menu?.querySelector(".terminal-menu-grid");
 if(!menu||!anchor)return false;
 if($("company-name-editor"))return true;
 const section=document.createElement("section");
 section.id="company-name-editor";
 section.className="company-editor";
 section.innerHTML='<div class="company-editor-head"><b>Hisse ve Şirket İsimleri</b></div>';
 anchor.insertAdjacentElement("afterend",section);
 render();
 return true;
}
const style=document.createElement("style");
style.textContent='.company-editor{margin-top:14px;padding:16px;border:1px solid #e2e9f4;border-radius:14px;background:#fff}.company-editor-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.company-editor-head p,.company-editor-foot{margin:5px 0 0;color:#738198;font-size:12px;line-height:1.5}.company-editor-count{font-size:11px;color:#63718b;background:#f1f4fa;border-radius:20px;padding:6px 9px}.company-editor-list{display:grid;gap:9px;margin-top:12px}.company-editor-row{display:grid;grid-template-columns:minmax(150px,1fr) minmax(150px,1.2fr) minmax(90px,.65fr) auto;gap:9px;align-items:end;padding:11px;border:1px solid #e8edf5;border-radius:11px}.company-editor-id{min-width:0;align-self:center}.company-editor-id b,.company-editor-id small{display:block;overflow-wrap:anywhere}.company-editor-id small{color:#77859b;font-size:11px;margin-top:4px}.company-editor-row label{margin:0}.company-editor-row input{margin-top:5px}.company-editor-row button{min-height:42px;white-space:nowrap}.company-editor-warning,.company-editor-ok{margin-top:10px;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.5}.company-editor-warning{background:#fff5e8;color:#87551b}.company-editor-warning ul{margin:5px 0 0;padding-left:18px}.company-editor-ok{background:#edf9f3;color:#08764f}.company-editor-foot{margin-top:12px}@media(max-width:680px){.company-editor-row{grid-template-columns:1fr 1fr}.company-editor-id{grid-column:1/-1}.company-editor-row button{grid-column:1/-1;width:100%}}';
document.head.appendChild(style);
// terminal.js runs init() immediately before this file is loaded. Mount now;
 // if the menu is not ready for any reason, observe it until it appears.
if(!mount()){
 const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
 observer.observe(document.documentElement,{childList:true,subtree:true});
}
})();
