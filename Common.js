const today=new Date();today.setHours(0,0,0,0);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const daysLeft=d=>Math.round((new Date(d+'T00:00:00')-today)/864e5);
const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';
const load=k=>{try{return JSON.parse(localStorage.getItem(k))||[]}catch(e){return[]}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert('Penyimpanan browser tidak tersedia. Data tidak akan tersimpan.');return false}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const TONE={ok:'bg-emerald-50 text-emerald-700 ring-emerald-600/20',warn:'bg-amber-50 text-amber-800 ring-amber-600/25',bad:'bg-red-50 text-red-700 ring-red-600/20'};
const pill=s=>`<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[s[1]]}">${esc(s[0])}</span>`;
function p3kStatus(i){
  const d=i.exp?daysLeft(i.exp):null;
  if(d!==null&&d<0)return['Kedaluwarsa '+(-d)+' hari lalu','bad'];
  if(i.qty===0)return['Stok habis','bad'];
  if(d!==null&&d<=30)return['Kedaluwarsa dalam '+d+' hari','warn'];
  if(i.qty<=i.min)return['Stok menipis ('+i.qty+' dari min. '+i.min+')','warn'];
  return['Aman','ok'];
}
function aparStatus(i){
  const d=daysLeft(i.exp);
  if(d<0)return['Isi ulang terlambat '+(-d)+' hari','bad'];
  if(i.tekanan&&i.tekanan!=='Normal')return['Tekanan '+i.tekanan.toLowerCase(),'bad'];
  if(d<=30)return['Isi ulang dalam '+d+' hari','warn'];
  return['Layak pakai','ok'];
}
function heroStats(sts){
  $('hTotal').textContent=sts.length;
  $('hAlert').textContent=sts.filter(s=>s[1]!=='ok').length;
  $('hOk').textContent=sts.filter(s=>s[1]==='ok').length;
}
function matchFilter(s,f){return f==='all'||(f==='alert'?s[1]!=='ok':s[1]==='ok');}
const FILTER='<select id="flt" class="inp !w-auto" aria-label="Filter status"><option value="all">Semua status</option><option value="alert">Perlu tindakan</option><option value="ok">Aman</option></select>';