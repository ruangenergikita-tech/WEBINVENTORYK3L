const KEY='apar-data';let items=load(KEY);
$('fltBox').innerHTML=FILTER;
function render(){
  const q=$('q').value.trim().toLowerCase(),f=$('flt').value;
  const st=items.map(i=>[i,aparStatus(i)]);
  heroStats(st.map(x=>x[1]));
  const list=st.filter(([i,s])=>(!q||(i.kode+' '+i.lokasi).toLowerCase().includes(q))&&matchFilter(s,f));
  $('rows').innerHTML=list.length?list.map(([i,s])=>`<tr class="hover:bg-slate-50/70">
    <td class="px-5 py-3 font-bold text-slate-900">${esc(i.kode)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.lokasi)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.jenis)}, ${i.berat} kg</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.tekanan)}</td>
    <td class="px-3 py-3 text-slate-700">${fmt(i.exp)}<div class="text-xs text-slate-400">Inspeksi: ${fmt(i.insp)}</div></td>
    <td class="px-3 py-3">${pill(s)}</td>
    <td class="px-5 py-3 text-right whitespace-nowrap">
      <button data-a="edit" data-id="${i.id}" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-pln hover:bg-sky-50">Ubah</button>
      <button data-a="del" data-id="${i.id}" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Hapus</button></td></tr>`).join('')
  :`<tr><td colspan="7" class="px-5 py-14 text-center text-slate-500">${items.length?'Tidak ada APAR yang cocok dengan pencarian atau filter.':'Belum ada data APAR. Isi formulir di atas untuk menambah unit pertama.'}</td></tr>`;
}
function resetForm(){$('f').reset();$('id').value='';$('berat').value=3;$('saveBtn').textContent='Tambah APAR';$('fTitle').textContent='Tambah unit APAR';$('cancelBtn').classList.add('hidden');}
$('f').onsubmit=e=>{
  e.preventDefault();
  const d={kode:$('kode').value.trim(),lokasi:$('lokasi').value.trim(),jenis:$('jenis').value,berat:+$('berat').value||0,tekanan:$('tekanan').value,exp:$('exp').value,insp:$('insp').value};
  const id=$('id').value;
  if(id)items=items.map(i=>i.id===id?{...i,...d}:i);else items.unshift({id:uid(),...d});
  store(KEY,items);render();resetForm();
};
$('cancelBtn').onclick=resetForm;$('q').oninput=render;$('flt').onchange=render;
$('rows').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  const it=items.find(i=>i.id===b.dataset.id);if(!it)return;
  if(b.dataset.a==='del'){if(!confirm('Hapus '+it.kode+'?'))return;items=items.filter(i=>i!==it);store(KEY,items);render();}
  else{
    $('id').value=it.id;$('kode').value=it.kode;$('lokasi').value=it.lokasi;$('jenis').value=it.jenis;$('berat').value=it.berat;$('tekanan').value=it.tekanan;$('exp').value=it.exp;$('insp').value=it.insp||'';
    $('saveBtn').textContent='Simpan perubahan';$('fTitle').textContent='Ubah unit APAR';$('cancelBtn').classList.remove('hidden');$('kode').focus();window.scrollTo({top:0,behavior:'smooth'});
  }
};
$('csv').onclick=()=>{
  const rows=items.map(i=>[i.kode,i.lokasi,i.jenis,i.berat,i.tekanan,i.exp,i.insp||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([['Kode,Lokasi,Jenis,Berat (kg),Tekanan,Isi ulang,Inspeksi terakhir'].concat(rows).join('\n')],{type:'text/csv'}));a.download='apar.csv';a.click();
};
render();