async function load(){
  try {
    const [sumRes, statsRes, agreementsRes, clientsRes] = await Promise.all([
      fetch('/api/analytics'),
      fetch('/api/visits/stats'),
      fetch('/api/agreements/recent?size=200'),
      fetch('/api/clients?size=200')
    ]);
    if(!sumRes.ok || !statsRes.ok || !agreementsRes.ok || !clientsRes.ok) throw new Error('HTTP error');
    const summary = await sumRes.json();
    const stats = await statsRes.json();
    const agreements = await agreementsRes.json();
    const clients = await clientsRes.json();
    renderCards(summary);
    renderVisits(stats.recent || []);
    renderVisitsByPageChart(stats.byPage || {});
    renderContractsMonthlyChart(agreements || []);
    renderClientsByStatusChart(clients || []);
    document.getElementById('apiAlert').classList.add('d-none');
  } catch(e) {
    document.getElementById('apiAlert').classList.remove('d-none');
    renderCards({});
    renderVisits([]);
    renderVisitsByPageChart({});
    renderContractsMonthlyChart([]);
    renderClientsByStatusChart([]);
  }
}

function renderCards(obj){
  const row = document.getElementById('cardsRow');
  const entries = Object.entries(obj || {});
  row.innerHTML = entries.map(([k,v]) => `
    <div class="col-md-3">
      <div class="card shadow-sm border-0">
        <div class="card-body text-center">
          <h6>${label(k)}</h6>
          <h2 class="fw-bold text-primary">${v}</h2>
        </div>
      </div>
    </div>
  `).join('');
}
function label(k){
  const m = {
    totalVisits:'إجمالي الزيارات', todayVisits:'زيارات اليوم', clientsTotal:'إجمالي العملاء', agreementsTotal:'إجمالي العقود', avgVisitDuration:'متوسط مدة الزيارة (ث)' };
  return m[k] || k;
}
function renderVisits(list){
  const tbody = document.querySelector('#visitsTable tbody');
  tbody.innerHTML = list.map(v => `
    <tr>
      <td>${formatDate(v.timestamp)}</td>
      <td>${safe(v.page)}</td>
      <td>${safe(v.referrer)}</td>
      <td>${(v.durationMs||0)/1000 | 0}</td>
    </tr>
  `).join('');
}
function renderVisitsByPageChart(byPage){
  const ctx = document.getElementById('visitsByPageChart');
  if(!ctx || typeof Chart === 'undefined') return;
  const labels = Object.keys(byPage);
  const values = labels.map(k => byPage[k]);
  new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'زيارات', data:values, backgroundColor:'#0d6efd' }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } });
}
function renderContractsMonthlyChart(list){
  const ctx = document.getElementById('contractsMonthlyChart');
  if(!ctx || typeof Chart === 'undefined') return;
  const now = new Date();
  const months = [];
  for(let i=11;i>=0;i--){ const d = new Date(now.getFullYear(), now.getMonth()-i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
  const counts = months.map(m => list.filter(a => {
    const dt = a.signedAt || a.createdAt; if(!dt) return false; const d = new Date(dt); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; return key === m && (a.status||'').toLowerCase()==='signed';
  }).length);
  new Chart(ctx, { type:'line', data:{ labels:months, datasets:[{ label:'عقود موقعة', data:counts, borderColor:'#198754', backgroundColor:'rgba(25,135,84,.2)' }] }, options:{ responsive:true, plugins:{ legend:{ display:true } } } });
}
function renderClientsByStatusChart(list){
  const ctx = document.getElementById('clientsByStatusChart');
  if(!ctx || typeof Chart === 'undefined') return;
  const m = {};
  (list||[]).forEach(c => { const k = (c.status||'').toLowerCase() || 'غير محدد'; m[k] = (m[k]||0)+1; });
  const labels = Object.keys(m);
  const values = labels.map(k => m[k]);
  new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data:values, backgroundColor:['#0d6efd','#ffc107','#198754','#dc3545','#6c757d'] }] }, options:{ responsive:true } });
}
function safe(s){ return (s ?? '').toString(); }
function formatDate(d){ if(!d) return ''; const dt = new Date(d); return dt.toLocaleString('ar-EG'); }

document.getElementById('refreshBtn').addEventListener('click', load);
setInterval(load, 30000);
load();