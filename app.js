/* Inventori K3 HSSE PLN: satu file JavaScript untuk semua halaman. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

/* =====================================================================
   1. KONFIGURASI FIREBASE
   Diambil dari Firebase Console:
   Project settings > Your apps > Web app > SDK setup and configuration > Config
   ===================================================================== */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5fZyadOvpO5IbUyoRXNonZ30n0GBUL6w",
  authDomain: "inventoryk3l.firebaseapp.com",
  projectId: "inventoryk3l",
  storageBucket: "inventoryk3l.firebasestorage.app",
  messagingSenderId: "885252168172",
  appId: "1:885252168172:web:b44872f657dc04262b08c9",
  measurementId: "G-JMS1KTR7DG"
};

/* =====================================================================
   2. FUNGSI BANTU DAN ATURAN STATUS (P3K dan APAR)
   ===================================================================== */
const today=new Date();today.setHours(0,0,0,0);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const daysLeft=d=>Math.round((new Date(d+'T00:00:00')-today)/864e5);
const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';
const TONE={ok:'bg-emerald-50 text-emerald-700 ring-emerald-600/20',warn:'bg-amber-50 text-amber-800 ring-amber-600/25',bad:'bg-red-50 text-red-700 ring-red-600/20'};
const pill=s=>`<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[s[1]]}">${esc(s[0])}</span>`;
function p3kStatus(i){
  const d=i.exp?daysLeft(i.exp):null, lay=i.tipeTgl==='kelayakan';
  if(d!==null&&d<0)return[(lay?'Masa layak habis ':'Kedaluwarsa ')+(-d)+' hari lalu','bad'];
  if(i.qty===0)return['Stok habis','bad'];
  if(d!==null&&d<=30)return[(lay?'Masa layak habis dalam ':'Kedaluwarsa dalam ')+d+' hari','warn'];
  if(i.qty<=i.min)return['Stok menipis ('+i.qty+' dari min. '+i.min+')','warn'];
  return['Aman','ok'];
}
// Tanggal + keterangan jenisnya (kedaluwarsa / kelayakan)
const tgl=i=>i.exp?fmt(i.exp)+`<div class="text-xs text-slate-400">${i.tipeTgl==='kelayakan'?'Batas kelayakan':'Kedaluwarsa'}</div>`:'-';
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

/* =====================================================================
   3. FIREBASE: LOGIN, LOGOUT, DAN DATA
   ===================================================================== */
const cfg = FIREBASE_CONFIG;
const root = document.documentElement;
const isPublic = root.hasAttribute('data-public');
const configured = !!cfg.apiKey && !String(cfg.apiKey).startsWith('ISI');
const DB = { configured, me: null };
window.DB = DB;

const MSG = {
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/wrong-password': 'Email atau kata sandi salah.',
  'auth/user-not-found': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
  'auth/network-request-failed': 'Tidak ada koneksi internet.',
  'auth/operation-not-allowed': 'Login Email/Password belum diaktifkan di Firebase Console.',
  'auth/unauthorized-domain': 'Domain ini belum diizinkan. Tambahkan di Authentication > Settings > Authorized domains.',
  'auth/operation-not-supported-in-this-environment': 'Buka halaman lewat http(s) atau localhost, bukan langsung dari file.',
  'permission-denied': 'Akses ditolak. Pastikan email Anda sudah ada di daftar pada aturan Firestore (firestore.rules).'
};
DB.err = e => MSG[e && e.code] || (e && e.message) || 'Terjadi kesalahan.';

DB.banner = msg => {
  let b = document.getElementById('dbBanner');
  if (!b) {
    b = document.createElement('div'); b.id = 'dbBanner'; b.setAttribute('role', 'alert');
    b.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg';
    document.body.appendChild(b);
  }
  b.textContent = msg;
};

async function main() {
  if (!configured) {
    if (!isPublic) { location.replace('Login.html'); return; }
    start(DB); return;
  }
  const app = initializeApp(cfg), auth = getAuth(app), db = getFirestore(app);
  const first = await new Promise(res => { const un = onAuthStateChanged(auth, u => { un(); res(u); }); });
  if (first) DB.me = { uid: first.uid, email: first.email };

  // ---- Login dan logout ----
  DB.login = async (email, password) => {
    const c = await signInWithEmailAndPassword(auth, email.trim(), password);
    DB.me = { uid: c.user.uid, email: c.user.email };
    return DB.me;
  };
  DB.logout = async () => { await signOut(auth); location.href = 'Login.html'; };
  DB.resetPassword = email => sendPasswordResetEmail(auth, email.trim());

  // ---- Data (tambah, ubah, kurangi, hapus) ----
  DB.watch = (name, cb) => onSnapshot(collection(db, name),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => { console.error(e); DB.banner(DB.err(e)); });
  DB.add = (name, data) => addDoc(collection(db, name), { ...data, created: Date.now(), by: DB.me.uid });
  DB.update = (name, id, data) => updateDoc(doc(db, name, id), data);
  DB.remove = (name, id) => deleteDoc(doc(db, name, id));
  // Ganti atau tambah banyak dokumen sekaligus (dipecah per 400 operasi).
  DB.replaceAll = async (name, oldItems, newItems) => {
    const t = Date.now();
    const ops = oldItems.map(o => ({ del: doc(db, name, o.id) }))
      .concat(newItems.map((n, i) => ({ ref: doc(collection(db, name)), data: { ...n, created: n.created || t + i, by: DB.me.uid } })));
    for (let i = 0; i < ops.length; i += 400) {
      const b = writeBatch(db);
      ops.slice(i, i + 400).forEach(o => o.del ? b.delete(o.del) : b.set(o.ref, o.data));
      await b.commit();
    }
  };

  // ---- Penjaga halaman: tanpa login tidak bisa membuka halaman ----
  if (!isPublic) {
    if (!DB.me) { location.replace('Login.html'); return; }
    const u = document.getElementById('userName'); if (u) u.textContent = DB.me.email;
    const b = document.getElementById('logoutBtn'); if (b) b.onclick = DB.logout;
    const g = document.getElementById('guardHide'); if (g) g.remove();
  }
  start(DB);
}

/* =====================================================================
   4. LOGIKA PER HALAMAN
   ===================================================================== */

// ---- Login.html ----
async function initLogin(DB) {
  const show = m => { $('loginMessage').textContent = m; };
  if (!DB.configured) { show('Firebase belum dikonfigurasi. Isi FIREBASE_CONFIG di bagian atas file app.js.'); $('lBtn').disabled = true; return; }
  if (DB.me) { location.replace('Dashboard.html'); return; }
  $('loginForm').onsubmit = async e => {
    e.preventDefault(); show(''); $('lBtn').disabled = true;
    try { await DB.login($('email').value, $('password').value); location.replace('Dashboard.html'); }
    catch (err) { show(DB.err(err)); $('lBtn').disabled = false; }
  };
  $('forgotBtn').onclick = async () => {
    const em = $('email').value.trim();
    if (!em) { show('Isi email terlebih dahulu, lalu klik lagi.'); return; }
    try { await DB.resetPassword(em); show('Email pengaturan ulang kata sandi sudah dikirim.'); }
    catch (err) { show(DB.err(err)); }
  };
}

// ---- Dashboard.html ----
function initDashboard(DB) {

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

let p3k=[],apar=[],got={p:0,a:0};
function render(){
  const sp=p3k.map(i=>({t:'P3K',href:'Data.html',n:i.name,l:i.lokasi,s:p3kStatus(i),exp:i.exp}));
  const sa=apar.map(i=>({t:'APAR',href:'Data.html',n:i.kode,l:i.lokasi,s:aparStatus(i),exp:i.exp}));
  const all=sp.concat(sa),bad=all.filter(x=>x.s[1]!=='ok');
  $('demoBox').classList.toggle('hidden',!(got.p&&got.a)||all.length>0);

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
  $('stats').innerHTML=ring+breakdown('Status P3K','Tambah.html?jenis=p3k',sp.map(x=>x.s))+breakdown('Status APAR','Tambah.html?jenis=apar',sa.map(x=>x.s));

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



const COLS = { ok: '#2E9E57', warn: '#F59E0B', bad: '#E1251B' };
const charts = {};
function renderCharts() {
  if (!window.Chart) { $('chartsMsg').classList.remove('hidden'); return; }
  Chart.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';
  Chart.defaults.color = '#475569';
  const show = (id, has) => {
    $(id + 'Wrap').classList.toggle('hidden', !has);
    $(id + 'Empty').classList.toggle('hidden', has);
    if (!has && charts[id]) { charts[id].destroy(); delete charts[id]; }
  };
  const draw = (id, cfg) => { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($(id), cfg); };
  const sp = p3k.map(i => [i, p3kStatus(i)]), sa = apar.map(i => [i, aparStatus(i)]);

  // 1. Stok semua barang P3K
  show('chP3k', sp.length > 0);
  if (sp.length) {
    $('chP3kWrap').style.height = Math.max(220, sp.length * 38 + 80) + 'px';
    draw('chP3k', { type: 'bar',
      data: { labels: sp.map(([i]) => i.name + ' (' + i.lokasi + ')'),
        datasets: [
          { label: 'Stok', data: sp.map(([i]) => i.qty), backgroundColor: sp.map(([, s]) => COLS[s[1]]), borderRadius: 4 },
          { label: 'Stok minimum', data: sp.map(([i]) => i.min), backgroundColor: '#CBD5E1', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
  }

  // 2. APAR per jenis media
  const byJenis = {}; apar.forEach(i => { byJenis[i.jenis] = (byJenis[i.jenis] || 0) + 1; });
  const jl = Object.keys(byJenis);
  show('chJenis', jl.length > 0);
  if (jl.length) draw('chJenis', { type: 'doughnut',
    data: { labels: jl, datasets: [{ data: jl.map(k => byJenis[k]), backgroundColor: ['#1596D4', '#2E9E57', '#FFD21F', '#E1251B', '#0E5384', '#94A3B8'], borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });

  // 3. Status seluruh barang
  const cnt = (list, k) => list.filter(([, s]) => s[1] === k).length;
  show('chStatus', sp.length + sa.length > 0);
  if (sp.length + sa.length) draw('chStatus', { type: 'bar',
    data: { labels: ['P3K', 'APAR'],
      datasets: [
        { label: 'Aman', data: [cnt(sp, 'ok'), cnt(sa, 'ok')], backgroundColor: COLS.ok },
        { label: 'Perlu segera ditangani', data: [cnt(sp, 'warn'), cnt(sa, 'warn')], backgroundColor: COLS.warn },
        { label: 'Mendesak', data: [cnt(sp, 'bad'), cnt(sa, 'bad')], backgroundColor: COLS.bad }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } } });

  // 4. Jadwal jatuh tempo 12 bulan ke depan
  const now = new Date();
  const labels = ['Terlambat'];
  for (let k = 0; k < 12; k++) labels.push(new Date(now.getFullYear(), now.getMonth() + k, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
  const slot = exp => {
    if (!exp) return -1;
    if (daysLeft(exp) < 0) return 0;
    const d = new Date(exp + 'T00:00:00'), k = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
    return k >= 0 && k < 12 ? k + 1 : -1;
  };
  const bucket = list => { const a = Array(13).fill(0); list.forEach(x => { const k = slot(x.exp); if (k >= 0) a[k]++; }); return a; };
  const bp = bucket(p3k), ba = bucket(apar);
  show('chBulan', bp.concat(ba).some(n => n > 0));
  draw('chBulan', { type: 'bar',
    data: { labels, datasets: [
      { label: 'Kedaluwarsa P3K', data: bp, backgroundColor: '#2E9E57', borderRadius: 4 },
      { label: 'Isi ulang APAR', data: ba, backgroundColor: '#1596D4', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } } });
}

const fail=e=>alert(DB.err(e));
DB.watch('p3k',l=>{p3k=l;got.p=1;render();renderCharts();});
DB.watch('apar',l=>{apar=l;got.a=1;render();renderCharts();});

$('demoBtn').onclick=async()=>{
  const P=(name,lokasi,qty,min,exp)=>({name,lokasi,qty,min,exp:plus(exp)});
  const A=(kode,lokasi,jenis,berat,tekanan,exp,insp)=>({kode,lokasi,jenis,berat,tekanan,exp:plus(exp),insp:plus(insp)});
  $('demoBtn').disabled=true;
  try{
    await DB.replaceAll('p3k',[],[P('Plester luka','Lobi lantai 1',40,20,400),P('Kasa steril','Lobi lantai 1',12,10,25),P('Perban elastis','Ruang K3',3,5,200),P('Antiseptik povidone iodine','Gudang',6,4,-10),P('Sarung tangan medis','Ruang K3',50,20,300),P('Obat tetes mata','Pos satpam',2,2,60)]);
    await DB.replaceAll('apar',[],[A('APAR-001','Lobi lantai 1','Dry chemical powder',6,'Normal',150,-20),A('APAR-002','Gudang pintu timur','CO2',5,'Normal',20,-35),A('APAR-003','Ruang panel listrik','CO2',6.8,'Normal',300,-10),A('APAR-004','Genset','Dry chemical powder',9,'Rendah',90,-40),A('APAR-005','Kantin','Foam',9,'Normal',-5,-60),A('APAR-006','Pos satpam','Dry chemical powder',3,'Normal',60,-15)]);
  }catch(e){fail(e)}
  $('demoBtn').disabled=false;
};

const msg=t=>$('msg').textContent=t;
const strip=({id,created,by,...r})=>r;
$('exp').onclick=()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({p3k:p3k.map(strip),apar:apar.map(strip)},null,2)],{type:'application/json'}));
  a.download='cadangan-k3.json';a.click();msg('Cadangan diunduh.');
};
$('imp').onclick=()=>$('file').click();
$('file').onchange=e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=async()=>{
    let d;
    try{d=JSON.parse(r.result);if(!Array.isArray(d.p3k)||!Array.isArray(d.apar))throw 0;}
    catch(err){msg('File tidak valid. Pilih file cadangan dari aplikasi ini.');return;}
    if(!confirm('Ganti semua data saat ini dengan isi file?'))return;
    try{
      await DB.replaceAll('p3k',p3k,d.p3k.map(strip));
      await DB.replaceAll('apar',apar,d.apar.map(strip));
      msg('Data berhasil dipulihkan.');
    }catch(err){msg(DB.err(err));}
  };
  r.readAsText(f);e.target.value='';
};
// Pindahkan data lama (versi localStorage) dari browser ini ke database
const readOld = k => { try { const x = JSON.parse(localStorage.getItem(k)); return Array.isArray(x) ? x : []; } catch (e) { return []; } };
const oldP = readOld('p3k-data'), oldA = readOld('apar-data');
if (oldP.length || oldA.length) $('migBtn').classList.remove('hidden');
$('migBtn').onclick = async () => {
  if (!confirm('Tambahkan ' + oldP.length + ' item P3K dan ' + oldA.length + ' unit APAR dari browser ini ke database?')) return;
  try {
    await DB.replaceAll('p3k', [], oldP.map(strip));
    await DB.replaceAll('apar', [], oldA.map(strip));
    $('migBtn').classList.add('hidden'); msg('Data lama berhasil dipindahkan.');
  } catch (err) { msg(DB.err(err)); }
};
render();

}


// ---- Data.html (laporan, hanya baca) ----
function initData(DB) {
const byNew = (a, b) => (b.created || 0) - (a.created || 0);
const FIXED = ['Baju', 'Sepatu'];
let p3k = [], apar = [], brg = [], loaded = { p: false, a: false, b: false };
$('todayTxt').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
DB.watch('p3k', l => { p3k = l.sort(byNew); loaded.p = true; render(); });
DB.watch('apar', l => { apar = l.sort(byNew); loaded.a = true; render(); });
DB.watch('barang', l => { brg = l.sort(byNew); loaded.b = true; render(); });

const brgMatch = (i, t) => t === 'all' || (t === 'Lainnya' ? !FIXED.includes(i.kategori) : i.kategori === t);

// Data setelah pencarian dan filter diterapkan
function view() {
  const q = $('q').value.trim().toLowerCase(), f = $('flt').value, t = $('tipe').value;
  const sp = p3k.map(i => [i, p3kStatus(i)]), sa = apar.map(i => [i, aparStatus(i)]), sb = brg.map(i => [i, p3kStatus(i)]);
  const lp = (t === 'all' || t === 'P3K') ? sp.filter(([i, s]) => (!q || (i.name + ' ' + i.lokasi).toLowerCase().includes(q)) && matchFilter(s, f)) : [];
  const la = (t === 'all' || t === 'APAR') ? sa.filter(([i, s]) => (!q || (i.kode + ' ' + i.lokasi).toLowerCase().includes(q)) && matchFilter(s, f)) : [];
  const lb = sb.filter(([i, s]) => brgMatch(i, t) && (!q || ((i.kategori || '') + ' ' + i.name + ' ' + i.lokasi + ' ' + (i.ukuran || '') + ' ' + (i.ket || '')).toLowerCase().includes(q)) && matchFilter(s, f));
  return { sp, sa, sb, lp, la, lb, t };
}
const empty = (cols, total, ready) => `<tr><td colspan="${cols}" class="px-5 py-12 text-center text-slate-500">${!ready ? 'Memuat data...' : total ? 'Tidak ada data yang cocok dengan pencarian atau filter.' : 'Belum ada data. Tambahkan lewat halaman Tambah.'}</td></tr>`;

function render() {
  const { sp, sa, sb, lp, la, lb, t } = view();
  const all = sp.concat(sa, sb);
  $('sP3k').textContent = sp.length;
  $('sApar').textContent = sa.length;
  $('sBrg').textContent = sb.length;
  $('sAlert').textContent = all.filter(x => x[1][1] !== 'ok').length;
  $('sOk').textContent = all.filter(x => x[1][1] === 'ok').length;

  $('secP3k').classList.toggle('hidden', !(t === 'all' || t === 'P3K'));
  $('secApar').classList.toggle('hidden', !(t === 'all' || t === 'APAR'));
  $('secBrg').classList.toggle('hidden', t === 'P3K' || t === 'APAR');
  $('cP3k').textContent = lp.length + ' dari ' + sp.length + ' item';
  $('cApar').textContent = la.length + ' dari ' + sa.length + ' unit';
  $('cBrg').textContent = lb.length + ' dari ' + sb.length + ' item';

  $('rowsP3k').innerHTML = lp.length ? lp.map(([i, s]) => `<tr class="hover:bg-slate-50/70">
    <td class="px-5 py-3 font-semibold text-slate-900">${esc(i.name)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.lokasi)}</td>
    <td class="px-3 py-3 text-center"><b>${i.qty}</b> <span class="text-xs text-slate-400">min. ${i.min}</span></td>
    <td class="px-3 py-3 text-slate-600">${tgl(i)}</td>
    <td class="px-3 py-3">${pill(s)}</td></tr>`).join('') : empty(5, sp.length, loaded.p);

  $('rowsApar').innerHTML = la.length ? la.map(([i, s]) => `<tr class="hover:bg-slate-50/70">
    <td class="px-5 py-3 font-bold text-slate-900">${esc(i.kode)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.lokasi)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.jenis)}, ${i.berat} kg</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.tekanan)}</td>
    <td class="px-3 py-3 text-slate-700">${fmt(i.exp)}<div class="text-xs text-slate-400">Inspeksi: ${fmt(i.insp)}</div></td>
    <td class="px-3 py-3">${pill(s)}</td></tr>`).join('') : empty(6, sa.length, loaded.a);

  $('rowsBrg').innerHTML = lb.length ? lb.map(([i, s]) => `<tr class="hover:bg-slate-50/70">
    <td class="px-5 py-3"><span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">${esc(i.kategori || 'Lainnya')}</span></td>
    <td class="px-3 py-3 font-semibold text-slate-900">${esc(i.name)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.lokasi)}</td>
    <td class="px-3 py-3 text-slate-600">${esc([i.ukuran ? 'Ukuran ' + i.ukuran : '', i.ket].filter(Boolean).join(', ') || '-')}</td>
    <td class="px-3 py-3 text-center"><b>${i.qty}</b> <span class="text-xs text-slate-400">min. ${i.min}</span></td>
    <td class="px-3 py-3 text-slate-600">${tgl(i)}</td>
    <td class="px-3 py-3">${pill(s)}</td></tr>`).join('') : empty(7, sb.length, loaded.b);
}

$('q').oninput = render; $('flt').onchange = render; $('tipe').onchange = render;
$('print').onclick = () => window.print();
$('csv').onclick = () => {
  const { lp, la, lb } = view();
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const tg = i => i.exp ? (i.tipeTgl === 'kelayakan' ? 'Kelayakan ' : 'Kedaluwarsa ') + i.exp : '';
  const rows = lp.map(([i, s]) => ['P3K', i.name, i.lokasi, 'Stok ' + i.qty + ', minimum ' + i.min, tg(i), s[0]])
    .concat(la.map(([i, s]) => ['APAR', i.kode, i.lokasi, i.jenis + ', ' + i.berat + ' kg, tekanan ' + i.tekanan, i.exp || '', s[0]]))
    .concat(lb.map(([i, s]) => [i.kategori || 'Lainnya', i.name, i.lokasi, [i.ukuran ? 'Ukuran ' + i.ukuran : '', i.ket, 'Stok ' + i.qty + ', minimum ' + i.min].filter(Boolean).join(', '), tg(i), s[0]]));
  const csv = [['Kategori', 'Nama atau kode', 'Lokasi', 'Detail', 'Jatuh tempo', 'Status']].concat(rows).map(r => r.map(q).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = 'laporan-k3.csv'; a.click();
};
render();

}


// ---- Tambah.html (satu formulir untuk semua kategori + CRUD) ----
function initTambah(DB) {
const byNew = (a, b) => (b.created || 0) - (a.created || 0);
const fail = e => alert(DB.err(e));
const FIXED = ['Baju', 'Sepatu'];
let p3k = [], apar = [], brg = [], ready = { p: false, a: false, b: false };
const flash = t => { const el = $('msg'); el.textContent = t; clearTimeout(el._t); el._t = setTimeout(() => { el.textContent = ''; }, 3000); };

DB.watch('p3k', l => { p3k = l.sort(byNew); ready.p = true; render(); });
DB.watch('apar', l => { apar = l.sort(byNew); ready.a = true; render(); });
DB.watch('barang', l => { brg = l.sort(byNew); ready.b = true; render(); });

// ---- Isian formulir menyesuaikan kategori ----
const PH = { P3K: ['Nama item', 'Contoh: Plester luka', 'Lokasi kotak P3K', 'Contoh: Lobi lantai 1'],
  APAR: ['Kode APAR', 'Contoh: APAR-001', 'Lokasi', 'Contoh: Gudang pintu timur'],
  Baju: ['Nama baju', 'Contoh: Coverall oranye', 'Lokasi penyimpanan', 'Contoh: Gudang K3'],
  Sepatu: ['Nama sepatu', 'Contoh: Safety shoes', 'Lokasi penyimpanan', 'Contoh: Gudang K3'],
  Custom: ['Nama item', 'Contoh: Helm proyek', 'Lokasi penyimpanan', 'Contoh: Gudang K3'] };
const show = (id, on) => $(id).classList.toggle('hidden', !on);
function layout() {
  const k = $('kat').value, isA = k === 'APAR', isG = !isA && k !== 'P3K';
  const p = PH[k];
  $('namaLbl').textContent = p[0]; $('nama').placeholder = p[1]; $('lokasiLbl').textContent = p[2]; $('lokasi').placeholder = p[3];
  show('wCustom', k === 'Custom'); $('katCustom').required = k === 'Custom';
  show('wQty', !isA); show('wMin', !isA);
  show('wUkuran', isG); show('wKet', isG);
  ['wBerat', 'wJenis', 'wTekanan', 'wInsp'].forEach(id => show(id, isA));
  $('berat').required = isA; $('exp').required = isA;
  show('wTipeTgl', !isA);
  const lay = $('tipeTgl').value === 'kelayakan';
  $('expLbl').textContent = isA ? 'Jadwal isi ulang' : (lay ? 'Batas kelayakan (opsional)' : 'Tanggal kedaluwarsa (opsional)');
}
$('kat').onchange = layout;
$('tipeTgl').onchange = layout;

function resetForm() {
  const k = $('kat').value, c = $('katCustom').value;   // pertahankan kategori agar mudah input beruntun
  $('f').reset(); $('kat').value = k; $('katCustom').value = c;
  $('id').value = ''; $('eKind').value = ''; $('kat').disabled = false;
  $('title').textContent = 'Tambah data'; $('save').textContent = 'Tambah data'; $('cancel').classList.add('hidden');
  layout();
}
$('cancel').onclick = resetForm;

$('f').onsubmit = e => {
  e.preventDefault();
  const id = $('id').value, kind = id ? $('eKind').value : ($('kat').value === 'P3K' ? 'p3k' : $('kat').value === 'APAR' ? 'apar' : 'barang');
  const nama = $('nama').value.trim(), lokasi = $('lokasi').value.trim(), exp = $('exp').value;
  let d;
  if (kind === 'apar') d = { kode: nama, lokasi, jenis: $('jenis').value, berat: +$('berat').value || 0, tekanan: $('tekanan').value, exp, insp: $('insp').value };
  else {
    d = { name: nama, lokasi, qty: Math.max(0, +$('qty').value || 0), min: Math.max(0, +$('min').value || 0), exp, tipeTgl: $('tipeTgl').value };
    if (kind === 'barang') {
      d.kategori = $('kat').value === 'Custom' ? $('katCustom').value.trim() : $('kat').value;
      d.ukuran = $('ukuran').value.trim(); d.ket = $('ket').value.trim();
    }
  }
  (id ? DB.update(kind, id, d) : DB.add(kind, d)).then(() => { resetForm(); flash(id ? 'Perubahan disimpan.' : 'Data ditambahkan.'); }).catch(fail);
};

// ---- Daftar gabungan ----
function items() {
  return p3k.map(i => ({ c: 'p3k', kat: 'P3K', i, s: p3kStatus(i) }))
    .concat(apar.map(i => ({ c: 'apar', kat: 'APAR', i, s: aparStatus(i) })))
    .concat(brg.map(i => ({ c: 'barang', kat: i.kategori || 'Lainnya', i, s: p3kStatus(i) })))
    .sort((a, b) => byNew(a.i, b.i));
}
function render() {
  const all = items();
  heroStats(all.map(x => x.s));
  // saran nama kategori custom yang sudah pernah dipakai
  $('katList').innerHTML = [...new Set(brg.map(i => i.kategori).filter(k => k && !FIXED.includes(k)))].map(k => `<option value="${esc(k)}">`).join('');

  const f = $('fKat').value, q = $('q').value.trim().toLowerCase();
  const list = all.filter(x => (f === 'all' || (f === 'Lainnya' ? x.c === 'barang' && !FIXED.includes(x.kat) : x.kat === f))
    && (!q || ((x.i.name || x.i.kode || '') + ' ' + x.i.lokasi + ' ' + x.kat).toLowerCase().includes(q)));
  const ctl = (x, a, t) => `<button data-a="${a}" data-c="${x.c}" data-id="${x.i.id}" aria-label="${t}" class="h-7 w-7 rounded-full text-slate-600 hover:bg-white hover:shadow-sm">${a === 'inc' ? '+' : '−'}</button>`;
  $('rows').innerHTML = list.length ? list.map(x => {
    const i = x.i, isA = x.c === 'apar';
    const detail = isA ? `${i.jenis}, ${i.berat} kg, tekanan ${i.tekanan}`
      : x.c === 'barang' ? ([i.ukuran ? 'Ukuran ' + i.ukuran : '', i.ket].filter(Boolean).join(', ') || '-') : 'Minimum ' + i.min;
    return `<tr class="hover:bg-slate-50/70">
    <td class="px-5 py-3"><span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">${esc(x.kat)}</span></td>
    <td class="px-3 py-3 font-semibold text-slate-900">${esc(isA ? i.kode : i.name)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.lokasi)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(detail)}</td>
    <td class="px-3 py-3 text-center">${isA ? '<span class="text-slate-400">-</span>' : `<div class="inline-flex items-center rounded-full bg-slate-100 p-0.5">${ctl(x, 'dec', 'Kurangi stok')}<b class="w-9 text-center">${i.qty}</b>${ctl(x, 'inc', 'Tambah stok')}</div>`}</td>
    <td class="px-3 py-3 text-slate-700">${isA ? fmt(i.exp) : tgl(i)}${isA ? `<div class="text-xs text-slate-400">Inspeksi: ${fmt(i.insp)}</div>` : ''}</td>
    <td class="px-3 py-3">${pill(x.s)}</td>
    <td class="px-5 py-3 text-right whitespace-nowrap">
      <button data-a="edit" data-c="${x.c}" data-id="${i.id}" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-pln hover:bg-sky-50">Ubah</button>
      <button data-a="del" data-c="${x.c}" data-id="${i.id}" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Hapus</button></td></tr>`;
  }).join('')
  : `<tr><td colspan="8" class="px-5 py-12 text-center text-slate-500">${!(ready.p && ready.a && ready.b) ? 'Memuat data...' : all.length ? 'Tidak ada data yang cocok dengan pencarian atau filter.' : 'Belum ada data. Pilih kategori dan isi formulir di atas untuk menambah data pertama.'}</td></tr>`;
}
$('fKat').onchange = render; $('q').oninput = render;

$('rows').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const c = b.dataset.c, a = b.dataset.a, src = c === 'p3k' ? p3k : c === 'apar' ? apar : brg;
  const it = src.find(i => i.id === b.dataset.id); if (!it) return;
  if (a === 'inc') DB.update(c, it.id, { qty: it.qty + 1 }).catch(fail);
  else if (a === 'dec') DB.update(c, it.id, { qty: Math.max(0, it.qty - 1) }).catch(fail);
  else if (a === 'del') { if (confirm('Hapus "' + (it.name || it.kode) + '"?')) DB.remove(c, it.id).then(() => flash('Data dihapus.')).catch(fail); }
  else {
    $('f').reset();
    $('id').value = it.id; $('eKind').value = c;
    $('kat').value = c === 'p3k' ? 'P3K' : c === 'apar' ? 'APAR' : (FIXED.includes(it.kategori) ? it.kategori : 'Custom');
    if (c === 'barang' && $('kat').value === 'Custom') $('katCustom').value = it.kategori || '';
    $('kat').disabled = true; layout();
    $('nama').value = it.name || it.kode || ''; $('lokasi').value = it.lokasi || ''; $('exp').value = it.exp || '';
    if (c === 'apar') { $('jenis').value = it.jenis; $('berat').value = it.berat; $('tekanan').value = it.tekanan; $('insp').value = it.insp || ''; }
    else { $('qty').value = it.qty; $('min').value = it.min; $('tipeTgl').value = it.tipeTgl || 'kedaluwarsa'; layout(); }
    if (c === 'barang') { $('ukuran').value = it.ukuran || ''; $('ket').value = it.ket || ''; }
    $('title').textContent = 'Ubah data'; $('save').textContent = 'Simpan perubahan'; $('cancel').classList.remove('hidden');
    $('nama').focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Kategori awal dari alamat, contoh Tambah.html?jenis=apar
const j = (new URLSearchParams(location.search).get('jenis') || '').toLowerCase();
const start0 = { p3k: 'P3K', apar: 'APAR', baju: 'Baju', sepatu: 'Sepatu', custom: 'Custom' }[j];
if (start0) $('kat').value = start0;
layout(); render();

}


/* =====================================================================
   5. PENJALAN HALAMAN
   Setiap halaman HTML memiliki atribut <body data-page="...">.
   ===================================================================== */
function start(DB) {
  const pages = { login: initLogin, dashboard: initDashboard, data: initData, tambah: initTambah };
  const run = pages[document.body.dataset.page];
  if (run) run(DB);
}

main().catch(e => { console.error(e); if (document.body) { window.DB.banner(window.DB.err(e)); } });