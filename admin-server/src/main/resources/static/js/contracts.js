const apiUrl = '/api/agreements/recent';
let page = 0, size = 20, data = [];
let sortKey = 'createdAt';
let sortDir = 'desc';
function statusBadge(s){
  const map = {
    'pending':['bg-warning','bi-hourglass-split'],
    'signed':['bg-success','bi-check2-circle'],
    'in_progress':['bg-info','bi-gear'],
    'completed':['bg-primary','bi-flag'],
    'cancelled':['bg-danger','bi-x-circle']
  };
  const [cls, icon] = map[s] || ['bg-secondary','bi-dot'];
  return `<span class="badge ${cls}"><i class="bi ${icon}"></i> ${safe(s)}</span>`;
}
function safe(s){ return (s ?? '').toString(); }
function formatDate(d){ if(!d) return ''; const dt = new Date(d); return dt.toLocaleString('ar-EG'); }

async function load(){
  try {
    const res = await fetch(`${apiUrl}?page=${page}&size=${size}`);
    if(!res.ok) throw new Error('HTTP '+res.status);
    data = await res.json();
    document.getElementById('apiAlert').classList.add('d-none');
  } catch(e) {
    data = [];
    document.getElementById('apiAlert').classList.remove('d-none');
  }
  // Prefill search by client name from URL (?client=...)
  try {
    const qp = new URLSearchParams(location.search);
    const qClient = qp.get('client');
    if(qClient) document.getElementById('searchInput').value = qClient;
  } catch(_) {}
  render();
  document.getElementById('pageInfo').textContent = `صفحة ${page+1}`;
}

function render(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const tbody = document.querySelector('#contractsTable tbody');
  const st = (document.getElementById('statusFilter').value||'').toLowerCase();
  const ds = document.getElementById('dateStart').value;
  const de = document.getElementById('dateEnd').value;
  const filtered = data.filter(a => {
    const matchesQ = !q || [a.service,a.status,a.currency,(a.client&&a.client.name)||''].some(v => (v||'').toLowerCase().includes(q));
    const matchesSt = !st || (a.status||'').toLowerCase() === st;
    let matchesDate = true;
    if (ds) { const sMs = new Date(ds).getTime(); const ca = new Date(a.createdAt).getTime(); matchesDate = matchesDate && (ca >= sMs); }
    if (de) { const eMs = new Date(de).getTime()+86400000-1; const ca = new Date(a.createdAt).getTime(); matchesDate = matchesDate && (ca <= eMs); }
    return matchesQ && matchesSt && matchesDate;
  });
  const sorted = filtered.sort((a,b)=>{
    const get = (obj, path) => path.split('.').reduce((o,k)=> (o && o[k] != null) ? o[k] : null, obj);
    let va = get(a, sortKey), vb = get(b, sortKey);
    if (['createdAt','signedAt','startDate','endDate'].includes(sortKey)) { va = new Date(va).getTime()||0; vb = new Date(vb).getTime()||0; }
    if (sortKey === 'agreedPrice') { va = Number(va)||0; vb = Number(vb)||0; }
    va = (va ?? '').toString().toLowerCase();
    vb = (vb ?? '').toString().toLowerCase();
    return sortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
  });
  tbody.innerHTML = sorted.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.client && a.client.name ? safe(a.client.name) : (a.client && a.client.id ? '#'+a.client.id : '')}</td>
      <td>${safe(a.service)}</td>
      <td>${a.agreedPrice ? `${a.agreedPrice} ${safe(a.currency||'')}` : ''}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${formatDate(a.createdAt)}</td>
      <td>${formatDate(a.signedAt)}</td>
      <td>${formatDate(a.startDate)}</td>
      <td>${formatDate(a.endDate)}</td>
      <td>
        <button class="btn btn-sm btn-outline-info" onclick="viewContract(${a.id})"><i class="bi bi-info-circle"></i></button>
        <button class="btn btn-sm btn-outline-secondary" onclick="printContract(${a.id})"><i class="bi bi-printer"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="closeContract(${a.id})"><i class="bi bi-x-circle"></i></button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('prevPage').addEventListener('click', ()=>{ if(page>0){ page--; load(); } });
document.getElementById('nextPage').addEventListener('click', ()=>{ page++; load(); });
document.getElementById('refreshBtn').addEventListener('click', load);
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('statusFilter').addEventListener('change', render);
document.getElementById('dateStart').addEventListener('change', render);
document.getElementById('dateEnd').addEventListener('change', render);
document.querySelectorAll('.sortable').forEach(h=>{
  h.addEventListener('click', ()=>{
    const key = h.getAttribute('data-key');
    if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; } else { sortKey = key; sortDir = 'asc'; }
    render();
  });
});
setInterval(load, 30000);
load();

document.getElementById('exportContracts').addEventListener('click', exportContractsCSV);

function exportContractsCSV(){
  try {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const stVal = (document.getElementById('statusFilter').value||'').toLowerCase();
    const dsVal = document.getElementById('dateStart').value;
    const deVal = document.getElementById('dateEnd').value;
    const filtered = (data||[]).filter(a => {
      const matchesQ = !q || [a.service,a.status,a.currency,(a.client&&a.client.name)||''].some(v => (v||'').toLowerCase().includes(q));
      const matchesSt = !stVal || (a.status||'').toLowerCase() === stVal;
      let matchesDate = true;
      if (dsVal) { const sMs = new Date(dsVal).getTime(); const ca = new Date(a.createdAt).getTime(); matchesDate = matchesDate && (ca >= sMs); }
      if (deVal) { const eMs = new Date(deVal).getTime()+86400000-1; const ca = new Date(a.createdAt).getTime(); matchesDate = matchesDate && (ca <= eMs); }
      return matchesQ && matchesSt && matchesDate;
    });
    const rows = [
      ['ID','Client','Service','AgreedPrice','Currency','Status','CreatedAt','SignedAt','StartDate','EndDate'],
      ...filtered.map(a => [
        a.id||'', (a.client&&a.client.name) ? a.client.name : (a.client&&a.client.id ? '#'+a.client.id : ''), a.service||'',
        a.agreedPrice||'', a.currency||'', a.status||'', a.createdAt||'', a.signedAt||'', a.startDate||'', a.endDate||''
      ])
    ];
    const csv = rows.map(r => r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'contracts_export.csv'; a.click(); URL.revokeObjectURL(url);
  } catch(e) {
    console.warn('CSV export failed', e);
    alert('فشل تصدير CSV');
  }
}

function printContract(id){
  window.print();
}
async function closeContract(id){
  try {
    const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
    const csrf = token ? decodeURIComponent(token.split('=')[1]) : '';
    const res = await fetch(`/api/agreements/${id}`, { method:'PUT', headers:{'Content-Type':'application/json','X-XSRF-TOKEN': csrf }, body: JSON.stringify({ status:'cancelled' })});
    if(res.ok){ load(); }
  } catch(e){ console.error(e); }
}

async function viewContract(id){
  try {
    const res = await fetch(`/api/agreements/${id}`);
    if(!res.ok) throw new Error('failed');
    const a = await res.json();
    document.getElementById('contractDetailId').textContent = a.id;
    document.getElementById('contractDetailClient').textContent = (a.client && a.client.name) ? a.client.name : (a.client && a.client.id ? '#'+a.client.id : '');
    document.getElementById('contractDetailService').textContent = a.service || '';
    document.getElementById('contractDetailPrice').textContent = a.agreedPrice ? `${a.agreedPrice} ${a.currency||''}` : '';
    document.getElementById('contractDetailStatus').innerHTML = statusBadge(a.status||'');
    document.getElementById('contractDetailCreated').textContent = formatDate(a.createdAt);
    document.getElementById('contractDetailSigned').textContent = formatDate(a.signedAt);
    document.getElementById('contractDetailStart').textContent = formatDate(a.startDate);
    document.getElementById('contractDetailEnd').textContent = formatDate(a.endDate);
    const modal = new bootstrap.Modal(document.getElementById('contractDetailsModal'));
    modal.show();
  } catch(e) {
    console.warn('تعذر تحميل تفاصيل العقد', e);
    alert('تعذر تحميل تفاصيل العقد');
  }
}