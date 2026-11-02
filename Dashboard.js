$('todayTxt').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const ICON={
 plus:'<path d="M12 4.5v15m7.5-7.5h-15"/>',
 fire:'<path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"/><path d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"/>',
 warn:'<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>',
 clock:'<path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>'
};
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">${p}</svg>`;
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const plus=n=>{const d=new Date(today);d.setDate(d.getDate()+n);return ymd(d);};

function breakdown(title,href,sts){
  const c={ok:0,warn:0,bad:0};sts.forEach(s=>c[s[1]]++);const t=sts.length||1;
  const seg=(k,col)=>c[k]?`<div class="${col}" style="width:${c[k]/t*100}%"></div>`:'';
  const row=(col,l,n)=>`<div class="flex items-center justify-between text-sm"><span class="flex items-center gap-2 text-slate-600"><span class="h-2.5 w-2.5 rounded-full ${col}"></span>${l}</span><b>${n}</b></div>`;
  return `<div class="card p-5">
    <div class="flex items-center justify-between mb-4"><h2 class="font-bold text-navy-900">${title}</h2><a href="${href}" class="text-sm font-semibold text-pln hover:underline">Kelola</a></div>
    <div class="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-4">${seg('ok','bg-emerald-500')}${seg('warn','bg-amber-400')}${seg('bad','bg-red-500')}</div>
    <div class="space-y-2">${row('bg-emerald-500','Aman',c.ok)}${row('bg-amber-400','Perlu segera ditangani',c.warn)}${row('bg-red-500','Mendesak',c.bad)}</div></div>`;
}

function render(){
  const p3k=load('p3k-data'),apar=load('apar-data');
  const sp=p3k.map(i=>({t:'P3K',href:'P3K.html',n:i.name,l:i.lokasi,s:p3kStatus(i),exp:i.exp}));
  const sa=apar.map(i=>({t:'APAR',href:'APAR.html',n:i.kode,l:i.lokasi,s:aparStatus(i),exp:i.exp}));
  const all=sp.concat(sa),bad=all.filter(x=>x.s[1]!=='ok');
  $('demoBox').classList.toggle('hidden',all.length>0);

  const card=(l,v,ic,top,bg)=>`<div class="card p-4 border-t-4 ${top}"><div class="flex items-center justify-between"><div class="text-sm text-slate-500">${l}</div><div class="rounded-xl p-2 ${bg}">${svg(ic)}</div></div><div class="mt-2 text-3xl font-extrabold text-navy-900">${v}</div></div>`;
  const soon=all.filter(x=>x.exp&&daysLeft(x.exp)>=0&&daysLeft(x.exp)<=30).length;
  $('cards').innerHTML=card('Item P3K',p3k.length,ICON.plus,'border-hsse','bg-emerald-50 text-hsse')
    +card('Unit APAR',apar.length,ICON.fire,'border-pln','bg-sky-50 text-pln')
    +card('Perlu tindakan',bad.length,ICON.warn,'border-red-500','bg-red-50 text-red-600')
    +card('Jatuh tempo 30 hari',soon,ICON.clock,'border-sun','bg-yellow-50 text-yellow-600');

  const pct=all.length?Math.round(all.filter(x=>x.s[1]==='ok').length/all.length*100):null;
  const col=pct===null?'#CBD5E1':pct>=80?'#2E9E57':pct>=50?'#F59E0B':'#E1251B';
  const C=2*Math.PI*52;
  const ring=`<div class="card p-5 flex flex-col items-center justify-center text-center">
    <h2 class="font-bold text-navy-900 mb-3 self-start">Tingkat kesiapan</h2>
    <div class="relative"><svg viewBox="0 0 120 120" class="h-40 w-40 -rotate-90"><circle cx="60" cy="60" r="52" fill="none" stroke="#E2E8F0" stroke-width="12"/><circle cx="60" cy="60" r="52" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${pct===null?0:C*pct/100} ${C}"/></svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-navy-900">${pct===null?'-':pct+'%'}</span><span class="text-xs text-slate-500">item dalam kondisi aman</span></div></div></div>`;
  $('stats').innerHTML=ring+breakdown('Status P3K','P3K.html',sp.map(x=>x.s))+breakdown('Status APAR','APAR.html',sa.map(x=>x.s));

  const up=all.filter(x=>x.exp&&daysLeft(x.exp)>=0&&daysLeft(x.exp)<=90).sort((a,b)=>a.exp.localeCompare(b.exp)).slice(0,7);
  $('timeline').innerHTML=up.length?up.map(x=>{const d=new Date(x.exp+'T00:00:00'),n=daysLeft(x.exp);
    return `<li class="flex items-center gap-3 py-3"><div class="w-12 shrink-0 rounded-xl bg-navy-900 py-1.5 text-center text-white leading-tight"><div class="text-lg font-extrabold">${d.getDate()}</div><div class="text-[11px] text-sky-200">${d.toLocaleDateString('id-ID',{month:'short'})}</div></div>
    <div class="min-w-0 flex-1"><div class="truncate font-semibold text-slate-900">${esc(x.n)}</div><div class="truncate text-xs text-slate-500">${x.t}, ${esc(x.l)}</div></div>
    <span class="shrink-0 text-xs font-semibold ${n<=30?'text-amber-700':'text-slate-500'}">${n===0?'Hari ini':n+' hari lagi'}</span></li>`}).join('')
    :'<li class="py-8 text-center text-sm text-slate-500">Tidak ada jadwal jatuh tempo dalam 90 hari ke depan.</li>';

  bad.sort((a,b)=>(a.s[1]==='bad'?0:1)-(b.s[1]==='bad'?0:1));
  $('alertCount').textContent=bad.length+' temuan';
  $('alerts').innerHTML=bad.length?bad.map(x=>`<tr class="hover:bg-slate-50/70"><td class="px-5 py-2.5"><a href="${x.href}" class="font-semibold text-pln hover:underline">${x.t}</a></td><td class="px-3 py-2.5 font-medium">${esc(x.n)}</td><td class="px-3 py-2.5 text-slate-600">${esc(x.l)}</td><td class="px-3 py-2.5">${pill(x.s)}</td></tr>`).join('')
    :`<tr><td colspan="4" class="px-5 py-10 text-center text-slate-500">${all.length?'Semua item dalam kondisi aman.':'Belum ada data untuk diperiksa.'}</td></tr>`;
}

$('demoBtn').onclick=()=>{
  const P=(name,lokasi,qty,min,exp)=>({id:uid(),name,lokasi,qty,min,exp:plus(exp)});
  const A=(kode,lokasi,jenis,berat,tekanan,exp,insp)=>({id:uid(),kode,lokasi,jenis,berat,tekanan,exp:plus(exp),insp:plus(insp)});
  store('p3k-data',[P('Plester luka','Lobi lantai 1',40,20,400),P('Kasa steril','Lobi lantai 1',12,10,25),P('Perban elastis','Ruang K3',3,5,200),P('Antiseptik povidone iodine','Gudang',6,4,-10),P('Sarung tangan medis','Ruang K3',50,20,300),P('Obat tetes mata','Pos satpam',2,2,60)]);
  store('apar-data',[A('APAR-001','Lobi lantai 1','Dry chemical powder',6,'Normal',150,-20),A('APAR-002','Gudang pintu timur','CO2',5,'Normal',20,-35),A('APAR-003','Ruang panel listrik','CO2',6.8,'Normal',300,-10),A('APAR-004','Genset','Dry chemical powder',9,'Rendah',90,-40),A('APAR-005','Kantin','Foam',9,'Normal',-5,-60),A('APAR-006','Pos satpam','Dry chemical powder',3,'Normal',60,-15)]);
  render();
};

const msg=t=>$('msg').textContent=t;
$('exp').onclick=()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({p3k:load('p3k-data'),apar:load('apar-data')},null,2)],{type:'application/json'}));
  a.download='cadangan-k3.json';a.click();msg('Cadangan diunduh.');
};
$('imp').onclick=()=>$('file').click();
$('file').onchange=e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);if(!Array.isArray(d.p3k)||!Array.isArray(d.apar))throw 0;
    if(!confirm('Ganti semua data saat ini dengan isi file?'))return;
    store('p3k-data',d.p3k);store('apar-data',d.apar);render();msg('Data berhasil dipulihkan.');
  }catch(err){msg('File tidak valid. Pilih file cadangan dari aplikasi ini.');}};
  r.readAsText(f);e.target.value='';
};
render();