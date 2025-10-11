(() => {
  const API = window.API_BASE || location.origin;
  let recentVisits = [];
  let recentContacts = [];
  let byPageMap = {};
  let autoRefreshTimer = null;
  let loadingCount = 0;
  let visitModal, contactModal;

  function fmtTs(ts){
    try{ return new Date(ts).toLocaleString('it-IT'); }catch(e){ return ts; }
  }
  function fmtDateInputToMs(val){
    if(!val) return null;
    const d = new Date(val + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  function fmtDateEndToMs(val){
    if(!val) return null;
    const d = new Date(val + 'T23:59:59');
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  function setLastUpdate(){
    const el = document.getElementById('lastUpdate');
    el.textContent = new Date().toLocaleTimeString('it-IT');
  }
  function setApiBase(){
    document.getElementById('apiBaseTxt').textContent = API;
  }
  function setLoading(on){
    loadingCount += on ? 1 : -1;
    if(loadingCount < 0) loadingCount = 0;
    const sp = document.getElementById('loadingSpinner');
    if(sp) sp.style.visibility = loadingCount > 0 ? 'visible' : 'hidden';
  }

  function renderByPage(){
    const byPage = document.getElementById('byPage');
    byPage.innerHTML = '';
    const entries = Object.entries(byPageMap || {}).sort((a,b)=>b[1]-a[1]);
    entries.forEach(([page,count])=>{
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<span class="badge badge-page text-bg-primary me-2">${count}</span><code>${page || '/'}</code>`;
      byPage.appendChild(li);
    });

    // Fill filter select
    const sel = document.getElementById('filterPage');
    const current = sel.value;
    sel.innerHTML = '<option value="">Tutte</option>' + entries.map(([p])=>`<option value="${p}">${p||'/'}</option>`).join('');
    if(current) sel.value = current;
  }

  function renderVisits(){
    const tbody = document.getElementById('recentVisits');
    tbody.innerHTML = '';
    const fromMs = fmtDateInputToMs(document.getElementById('filterFrom').value);
    const toMs = fmtDateEndToMs(document.getElementById('filterTo').value);
    const pageFilter = document.getElementById('filterPage').value;
    const q = (document.getElementById('searchText').value || '').toLowerCase();
    let rows = recentVisits.slice(0);
    rows = rows.filter(v => {
      const ts = new Date(v.timestamp).getTime();
      if(fromMs && ts < fromMs) return false;
      if(toMs && ts > toMs) return false;
      if(pageFilter && (v.page||'') !== pageFilter) return false;
      if(q && !(`${v.page||''} ${v.referrer||''}`.toLowerCase().includes(q))) return false;
      return true;
    });
    rows.slice(0, 20).forEach(v => {
      const tr = document.createElement('tr');
      const durSec = v.durationMs ? Math.round(v.durationMs/1000) : 0;
      tr.innerHTML = `<td>${fmtTs(v.timestamp)}</td><td><code>${v.page||'/'}</code></td><td>${(v.referrer||'').slice(0,120)}</td><td>${durSec}</td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', ()=> openVisitModal(v));
      tbody.appendChild(tr);
    });
  }

  function renderContacts(){
    const tbody = document.getElementById('recentContacts');
    tbody.innerHTML = '';
    (recentContacts || []).slice(0, 50).forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtTs(c.timestamp)}</td>
        <td>${c.name||''}</td>
        <td>${c.phone||''}</td>
        <td>${c.email||''}</td>
        <td>${c.service||''}</td>
        <td>${c.location||''}</td>
        <td>${c.propertyType||''}</td>
        <td>${c.priority||''}</td>
        <td>${c.budget||''}</td>
        <td>${c.contactTime||''}</td>
        <td>${c.source||''}</td>
        <td>${(c.details||'').slice(0,160)}</td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', ()=> openContactModal(c));
      tbody.appendChild(tr);
    });
  }

  function openVisitModal(v){
    const list = document.getElementById('visitDetails');
    if(!list) return;
    list.innerHTML = '';
    const items = [
      {k:'Ora', v: fmtTs(v.timestamp)},
      {k:'Pagina', v: v.page||'/'},
      {k:'Referrer', v: v.referrer||''},
      {k:'Durata (s)', v: v.durationMs ? Math.round(v.durationMs/1000) : 0},
    ];
    items.forEach(it=>{
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<strong>${it.k}</strong><span>${it.v}</span>`;
      list.appendChild(li);
    });
    if(visitModal) visitModal.show();
  }

  function openContactModal(c){
    const list = document.getElementById('contactDetails');
    if(!list) return;
    list.innerHTML = '';
    const items = [
      {k:'Ora', v: fmtTs(c.timestamp)},
      {k:'Nome', v: c.name||''},
      {k:'Telefono', v: c.phone||''},
      {k:'Email', v: c.email||''},
      {k:'Servizio', v: c.service||''},
      {k:'Località', v: c.location||''},
      {k:'Tipo di proprietà', v: c.propertyType||''},
      {k:'Priorità', v: c.priority||''},
      {k:'Budget', v: c.budget||''},
      {k:'Orario di contatto', v: c.contactTime||''},
      {k:'Fonte', v: c.source||''},
      {k:'Dettagli', v: c.details||''},
    ];
    items.forEach(it=>{
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<strong>${it.k}</strong><span>${it.v}</span>`;
      list.appendChild(li);
    });
    if(contactModal) contactModal.show();
  }

  async function loadStats(){
    try{
      setLoading(true);
      const res = await fetch(API + '/api/visits/stats', { credentials: 'include' });
      const ct = (res.headers && res.headers.get('content-type')) || '';
      if(!res.ok || !ct.includes('application/json')){
        byPageMap = {};
        recentVisits = [];
      }else{
        const data = await res.json();
        document.getElementById('statTotal').textContent = data.total ?? 0;
        document.getElementById('statToday').textContent = data.today ?? 0;
        const avgSec = Math.round((data.avgDurationMs || 0) / 1000);
        document.getElementById('statAvg').textContent = avgSec;
        byPageMap = data.byPage || {};
        recentVisits = data.recent || [];
      }
      renderByPage();
      renderVisits();
    }catch(e){ console.error('stats error', e); }
    finally{ setLoading(false); }
  }

  async function loadContacts(){
    try{
      setLoading(true);
      const res = await fetch(API + '/api/contact/recent', { credentials: 'include' });
      if(!res.ok){ throw new Error('contacts endpoint not available'); }
      recentContacts = await res.json();
      renderContacts();
    }catch(e){ console.warn('contacts error', e.message); recentContacts = []; renderContacts(); }
    finally{ setLoading(false); }
  }

  function exportCsv(filename, rows, headers){
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => {
      const val = (r[h] ?? '').toString().replace(/\n/g,' ').replace(/"/g,'\"');
      return '"' + val + '"';
    }).join(','))).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }

  function bindEvents(){
    document.getElementById('applyFilters').addEventListener('click', renderVisits);
    document.getElementById('resetFilters').addEventListener('click', () => {
      document.getElementById('filterFrom').value='';
      document.getElementById('filterTo').value='';
      document.getElementById('filterPage').value='';
      document.getElementById('searchText').value='';
      renderVisits();
    });
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      await Promise.all([loadStats(), loadContacts()]);
      setLastUpdate();
    });
    document.getElementById('autoRefreshSwitch').addEventListener('change', (e) => {
      if(e.target.checked){
        autoRefreshTimer = setInterval(async () => {
          await Promise.all([loadStats(), loadContacts()]);
          setLastUpdate();
        }, 30000);
      }else{
        if(autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    });
    document.getElementById('exportVisits').addEventListener('click', () => {
      exportCsv('visits.csv', recentVisits, ['timestamp','page','referrer','durationMs']);
    });
    document.getElementById('exportContacts').addEventListener('click', () => {
      exportCsv('contacts.csv', recentContacts, ['timestamp','name','phone','email','service','location','propertyType','priority','budget','contactTime','source','details']);
    });
  }

  async function init(){
    setApiBase();
    // Prepare Bootstrap modals
    const vm = document.getElementById('visitModal');
    const cm = document.getElementById('contactModal');
    if(window.bootstrap){
      visitModal = new bootstrap.Modal(vm);
      contactModal = new bootstrap.Modal(cm);
    }
    bindEvents();
    await Promise.all([loadStats(), loadContacts()]);
    setLastUpdate();
  }
  if(document.readyState==='complete' || document.readyState==='interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();