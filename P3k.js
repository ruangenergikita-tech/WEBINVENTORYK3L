const KEY='p3k-data';let items=load(KEY);
$('fltBox').innerHTML=FILTER;
function render(){
  const q=$('q').value.trim().toLowerCase(),f=$('flt').value;
  const st=items.map(i=>[i,p3kStatus(i)]);
  heroStats(st.map(x=>x[1]));
  const list=st.filter(([i,s])=>(!q||(i.name+' '+i.lokasi).toLowerCase().includes(q))&&matchFilter(s,f));
  $('rows').innerHTML=list.length?list.map(([i,s])=>`<tr class="hover:bg-slate-50/70">
    <td class="px-5 py-3 font-semibold text-slate-900">${esc(i.name)}</td>
    <td class="px-3 py-3 text-slate-600">${esc(i.lokasi)}</td>
    <td class="px-3 py-3"><div class="mx-auto inline-flex items-center rounded-full bg-slate-100 p-0.5 w-fit">
      <button data-a="dec" data-id="${i.id}" aria-label="Kurangi stok" class="h-7 w-7 rounded-full text-slate-600 hover:bg-white hover:shadow-sm">−</button>
      <b class="w-9 text-center">${i.qty}</b>
      <button data-a="inc" data-id="${i.id}" aria-label="Tambah stok" class="h-7 w-7 rounded-full text-slate-600 hover:bg-white hover:shadow-sm">+</button></div></td>
    <td class="px-3 py-3 text-slate-600">${fmt(i.exp)}</td>
    <td class="px-3 py-3">${pill(s)}</td>
    <td class="px-5 py-3 text-right whitespace-nowrap">
      <button data-a="edit" data-id="${i.id}" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-pln hover:bg-sky-50">Ubah</button>
      <button data-a="del" data-id="${i.id}" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Hapus</button></td></tr>`).join('')
  :`<tr><td colspan="6" class="px-5 py-14 text-center text-slate-500">${items.length?'Tidak ada item yang cocok dengan pencarian atau filter.':'Belum ada item P3K. Isi formulir di atas untuk menambah item pertama.'}</td></tr>`;
}
function resetForm(){$('f').reset();$('id').value='';$('qty').value=0;$('min').value=5;$('saveBtn').textContent='Tambah item';$('fTitle').textContent='Tambah item P3K';$('cancelBtn').classList.add('hidden');}
$('f').onsubmit=e=>{
  e.preventDefault();
  const d={name:$('name').value.trim(),lokasi:$('lokasi').value.trim(),qty:Math.max(0,+$('qty').value||0),min:Math.max(0,+$('min').value||0),exp:$('exp').value};
  const id=$('id').value;
  if(id)items=items.map(i=>i.id===id?{...i,...d}:i);else items.unshift({id:uid(),...d});
  store(KEY,items);render();resetForm();
};
$('cancelBtn').onclick=resetForm;$('q').oninput=render;$('flt').onchange=render;
$('rows').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  const it=items.find(i=>i.id===b.dataset.id);if(!it)return;const a=b.dataset.a;
  if(a==='inc')it.qty++;
  else if(a==='dec')it.qty=Math.max(0,it.qty-1);
  else if(a==='del'){if(!confirm('Hapus "'+it.name+'"?'))return;items=items.filter(i=>i!==it);}
  else{
    $('id').value=it.id;$('name').value=it.name;$('lokasi').value=it.lokasi;$('qty').value=it.qty;$('min').value=it.min;$('exp').value=it.exp||'';
    $('saveBtn').textContent='Simpan perubahan';$('fTitle').textContent='Ubah item P3K';$('cancelBtn').classList.remove('hidden');$('name').focus();window.scrollTo({top:0,behavior:'smooth'});return;
  }
  store(KEY,items);render();
};
$('csv').onclick=()=>{
  const rows=items.map(i=>[i.name,i.lokasi,i.qty,i.min,i.exp||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([['Item,Lokasi,Jumlah,Minimum,Kedaluwarsa'].concat(rows).join('\n')],{type:'text/csv'}));a.download='p3k.csv';a.click();
};
render();