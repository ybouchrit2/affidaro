async function viewVisit(id){
  try{
    if(!id){ throw new Error('missing id'); }
    const res = await fetch(`/api/visits/${id}`);
    if(!res.ok) throw new Error('failed');
    const v = await res.json();
    document.getElementById('visitDetailClient').textContent = v.clientName || (v.client && v.client.name) || '';
    document.getElementById('visitDetailPage').textContent = v.page || '';
    document.getElementById('visitDetailReferrer').textContent = v.referrer || '';
    document.getElementById('visitDetailDuration').textContent = ((v.durationMs||0)/1000|0).toString();
    document.getElementById('visitDetailTimestamp').textContent = new Date(v.timestamp).toLocaleString('ar-EG');
    const modal = new bootstrap.Modal(document.getElementById('visitDetailsModal'));
    modal.show();
  }catch(e){
    console.warn('تعذر تحميل تفاصيل الزيارة', e);
    alert('تعذر تحميل تفاصيل الزيارة');
  }
}

const state = { visits: [], filtered: [] };

function safe(v){ return v==null? '—' : String(v); }
function formatDate(ts){ try { const d=new Date(ts); return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}` } catch(e){ return '—'; } }

async function load(){
  try {
    const res = await fetch('/api/visits/stats');
    if(!res.ok) throw new Error('HTTP '+res.status);
    const stats = await res.json();
    state.visits = stats.recent || [];
    document.getElementById('apiAlert').classList.add('d-none');
  } catch(e) {
    state.visits = [];
    document.getElementById('apiAlert').classList.remove('d-none');
  }
  // Prefill filters from URL query params if provided
  try {
    const params = new URLSearchParams(location.search);
    const qClient = params.get('client');
    const qPage = params.get('page');
    if(qClient) document.getElementById('filterClient').value = qClient;
    if(qPage) document.getElementById('filterPage').value = qPage;
  } catch(_) {}
  applyFilters();
}

function applyFilters(){
  const clientQ = document.getElementById('filterClient').value.trim().toLowerCase();
  const pageQ = document.getElementById('filterPage').value.trim().toLowerCase();
  const dateQ = document.getElementById('filterDate').value;
  const dateOnly = dateQ ? new Date(dateQ) : null;
  const dayStart = dateOnly ? new Date(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate()).getTime() : null;
  const dayEnd = dateOnly ? dayStart + 24*60*60*1000 : null;

  state.filtered = state.visits.filter(v => {
    const name = (v.clientName || (v.client && v.client.name) || '').toLowerCase();
    const page = (v.page || '').toLowerCase();
    const ts = v.timestamp ? new Date(v.timestamp).getTime() : 0;
    const okClient = clientQ ? name.includes(clientQ) : true;
    const okPage = pageQ ? page.includes(pageQ) : true;
    const okDate = dateOnly ? (ts >= dayStart && ts < dayEnd) : true;
    return okClient && okPage && okDate;
  });
  renderTable();
  renderMiniStats();
}

function resetFilters(){
  document.getElementById('filterClient').value = '';
  document.getElementById('filterPage').value = '';
  document.getElementById('filterDate').value = '';
  applyFilters();
}

function renderTable(){
  const tbody = document.querySelector('#visitsTable tbody');
  tbody.innerHTML = state.filtered.map(v => `
    <tr>
      <td>${safe(v.clientName || (v.client && v.client.name))}</td>
      <td>${safe(v.page)}</td>
      <td>${safe(v.referrer)}</td>
      <td>${(v.durationMs||0)/1000 | 0}</td>
      <td>${formatDate(v.timestamp)}</td>
      <td>
        <button class="btn btn-sm btn-outline-info" onclick="viewVisit('${v.id || ''}')"><i class="bi bi-info-circle"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderMiniStats(){
  const byClient = {};
  state.filtered.forEach(v => {
    const key = v.clientName || (v.client && v.client.name) || 'غير معروف';
    byClient[key] = (byClient[key] || 0) + (v.durationMs||0);
  });
  const items = Object.entries(byClient).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const row = document.getElementById('miniStats');
  row.innerHTML = items.map(([name, ms]) => `
    <div class="col-md-4">
      <div class="card card-stat">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-bold">${safe(name)}</div>
              <div class="text-muted small">إجمالي مدة الزيارات</div>
            </div>
            <div class="fs-5">${Math.round(ms/1000)} ث</div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnApply').addEventListener('click', applyFilters);
  document.getElementById('btnReset').addEventListener('click', resetFilters);
  load();
});