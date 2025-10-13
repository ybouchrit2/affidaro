// Expose shared state globally for modules defined outside the IIFE
window.API = window.API_BASE || location.origin;
window.selectedClientId = null;

(() => {
  const API = window.API;
  let recentVisits = [];
  let recentContacts = [];
  let byPageMap = {};
  let autoRefreshTimer = null;
  let loadingCount = 0;
  let updatingTextTimer = null;
  // table state
  let clientsSort = { key: 'createdAt', dir: 'desc' };
  let clientsPage = 1;
  const clientsPageSize = 10;
  let clientsQuery = '';
  let agreementsSort = { key: 'signedAt', dir: 'desc' };
  let agreementsPage = 1;
  const agreementsPageSize = 10;
  let agreementsQuery = '';
  let visitModal, contactModal;
  // CRM state
  let clients = [];
  let agreements = [];
  let currentContact = null;

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
    const ut = document.getElementById('updatingText');
    if(sp){
      if(loadingCount > 0) sp.classList.remove('is-hidden');
      else sp.classList.add('is-hidden');
    }
    if(ut){
      if(loadingCount > 0){
        ut.classList.remove('is-hidden');
        if(updatingTextTimer){ clearTimeout(updatingTextTimer); updatingTextTimer = null; }
      } else {
        if(updatingTextTimer){ clearTimeout(updatingTextTimer); }
        updatingTextTimer = setTimeout(()=>{ ut.classList.add('is-hidden'); }, 2000);
      }
    }
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

  // ---- CRM: Clients & Agreements ----
  function fmtDate(val){
    try{ return new Date(val).toLocaleDateString('it-IT'); }catch(e){ return val; }
  }

  function renderClients(){
    const tbody = document.getElementById('clientsList');
    if(!tbody) return;
    tbody.innerHTML = '';
    let rows = (clients || []).slice(0);
    // Date range filter
    const fromMs = fmtDateInputToMs(document.getElementById('clientsFrom')?.value || '');
    const toMs = fmtDateEndToMs(document.getElementById('clientsTo')?.value || '');
    if(clientsQuery){
      const q = clientsQuery.toLowerCase();
      rows = rows.filter(c => `${c.name||''} ${c.phone||''} ${c.email||''} ${c.source||''}`.toLowerCase().includes(q));
    }
    if(fromMs || toMs){
      rows = rows.filter(c => {
        const ts = new Date(c.createdAt).getTime();
        if(fromMs && ts < fromMs) return false;
        if(toMs && ts > toMs) return false;
        return true;
      });
    }
    rows.sort((a,b)=>{
      const k = clientsSort.key;
      const av = a[k] ?? ''; const bv = b[k] ?? '';
      const cmp = (new Date(av).getTime() || (''+av).localeCompare(''+bv)) - (new Date(bv).getTime() || 0);
      return clientsSort.dir==='asc' ? cmp : -cmp;
    });
    const totalPages = Math.max(1, Math.ceil(rows.length / clientsPageSize));
    clientsPage = Math.min(clientsPage, totalPages);
    const start = (clientsPage-1)*clientsPageSize;
    const pageRows = rows.slice(start, start+clientsPageSize);
    const pageInfo = document.getElementById('clientsPageInfo'); if(pageInfo) pageInfo.textContent = `${clientsPage}/${totalPages}`;
    pageRows.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fmtDate(c.createdAt)}</td><td>${c.name||''}</td><td>📞 ${c.phone||''}</td><td>📧 ${c.email||''}</td><td>${c.status||''}</td><td>${c.source||''}</td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        window.selectedClientId = c.id;
        const label = document.getElementById('selectedClientLabel');
        if(label) label.textContent = `Cliente selezionato: ${c.name||c.id}`;
        loadSelectedClientDetails();
        loadAgreementsForSelected();
        loadClientLogs();
      });
      tbody.appendChild(tr);
    });
  }

  async function loadClients(){
    try{
      setLoading(true);
      const status = document.getElementById('clientsFilter')?.value || '';
      const url = status ? `${API}/api/clients/recent?status=${encodeURIComponent(status)}` : `${API}/api/clients/recent`;
      const res = await fetch(url, { credentials: 'include' });
      if(!res.ok) throw new Error('clients endpoint not available');
      clients = await res.json();
      renderClients();
    }catch(e){ console.warn('clients error', e.message); clients = []; renderClients(); }
    finally{ setLoading(false); }
  }

  async function loadAgreementsForSelected(){
    const tbody = document.getElementById('agreementsList');
    if(!window.selectedClientId || !tbody){ agreements=[]; tbody.innerHTML=''; return; }
    try{
      setLoading(true);
      const res = await fetch(`${API}/api/clients/${window.selectedClientId}/agreements`, { credentials: 'include' });
      if(!res.ok) throw new Error('agreements endpoint not available');
      agreements = await res.json();
      renderAgreements();
    }catch(e){ console.warn('agreements error', e.message); agreements=[]; tbody.innerHTML=''; }
    finally{ setLoading(false); }
  }

  function statusBadgeHTML(st){
    const s = (st||'').toLowerCase();
    if(s==='pending') return `<span class="status-badge status-pending">🟡 قيد الانتظار</span>`;
    if(s==='signed') return `<span class="status-badge status-signed">🟢 موقّع</span>`;
    if(s==='cancelled') return `<span class="status-badge status-cancelled">🔴 ملغى</span>`;
    return `<span class="badge text-bg-secondary">${st||''}</span>`;
  }

  function renderAgreements(){
    const tbody = document.getElementById('agreementsList');
    if(!tbody) return;
    tbody.innerHTML = '';
    let rows = (agreements||[]).slice(0);
    if(agreementsQuery){
      const q = agreementsQuery.toLowerCase();
      rows = rows.filter(a => `${a.service||''} ${a.currency||''} ${a.status||''}`.toLowerCase().includes(q));
    }
    rows.sort((a,b)=>{
      const k=agreementsSort.key; const av=a[k]??''; const bv=b[k]??'';
      const at=(new Date(av).getTime())||0; const bt=(new Date(bv).getTime())||0;
      const cmp = at-bt || ((''+av).localeCompare(''+bv));
      return agreementsSort.dir==='asc'?cmp:-cmp;
    });
    const totalPages = Math.max(1, Math.ceil(rows.length/agreementsPageSize));
    agreementsPage = Math.min(agreementsPage, totalPages);
    const start=(agreementsPage-1)*agreementsPageSize;
    const pageRows = rows.slice(start, start+agreementsPageSize);
    const pageInfo = document.getElementById('agreementsPageInfo'); if(pageInfo) pageInfo.textContent = `${agreementsPage}/${totalPages}`;
    pageRows.forEach(a => {
      const price = (a.agreedPrice ?? '') + '';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fmtDate(a.signedAt || a.createdAt)}</td><td>${a.service||''}</td><td>${price}</td><td>${a.currency||''}</td><td>${statusBadgeHTML(a.status)}</td>`;
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
    currentContact = c;
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

  async function loadAnalytics(){
    try{
      setLoading(true);
      const res = await fetch(API + '/api/analytics', { credentials: 'include' });
      const ct = (res.headers && res.headers.get('content-type')) || '';
      if(res.ok && ct.includes('application/json')){
        const data = await res.json();
        const total = data.totalVisits ?? 0;
        const today = data.visitsToday ?? 0;
        const avgSec = Math.round((data.avgDurationMs || 0) / 1000);
        const newClients = data.newClientsToday ?? 0;
        const totalClients = data.totalClients ?? 0;
        const totalContracts = data.totalContracts ?? 0;
        const contractsToday = data.contractsToday ?? 0;
        const elT = document.getElementById('statTotal'); if(elT) elT.textContent = total;
        const elD = document.getElementById('statToday'); if(elD) elD.textContent = today;
        const elA = document.getElementById('statAvg'); if(elA) elA.textContent = avgSec;
        const elN = document.getElementById('statNewClients'); if(elN) elN.textContent = newClients;
        const k1 = document.getElementById('kpiTotalClients'); if(k1) k1.textContent = totalClients;
        const k2 = document.getElementById('kpiTotalContracts'); if(k2) k2.textContent = totalContracts;
        const k3 = document.getElementById('kpiAvgVisit'); if(k3) k3.textContent = avgSec;
        const k4 = document.getElementById('kpiContractsToday'); if(k4) k4.textContent = contractsToday;
      }
    }catch(e){ console.warn('analytics error', e.message); }
    finally{ setLoading(false); }
  }

  async function loadContracts(){
    try{
      setLoading(true);
      const res = await fetch(API + '/api/contracts', { credentials: 'include' });
      // We don't render global contracts list here; call is for freshness
      await res.json().catch(()=>({}));
    }catch(e){ console.warn('contracts fetch error', e.message); }
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
      await Promise.all([loadAnalytics(), loadStats(), loadContacts(), loadClients(), loadContracts()]);
      setLastUpdate();
    });
    document.getElementById('autoRefreshSwitch').addEventListener('change', (e) => {
      if(e.target.checked){
        autoRefreshTimer = setInterval(async () => {
          await Promise.all([loadAnalytics(), loadStats(), loadClients(), loadContracts()]);
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

    // CRM events
    const clientsFilter = document.getElementById('clientsFilter');
    if(clientsFilter){ clientsFilter.addEventListener('change', loadClients); }

    // Clients date range filters
    const cf = document.getElementById('clientsFrom');
    const ct = document.getElementById('clientsTo');
    if(cf){ cf.addEventListener('change', ()=>{ clientsPage = 1; renderClients(); }); }
    if(ct){ ct.addEventListener('change', ()=>{ clientsPage = 1; renderClients(); }); }

    const clientSearchInput = document.getElementById('clientSearch');
    const clientSearchBtn = document.getElementById('clientSearchBtn');
    async function runClientSearch(){
      const q = (clientSearchInput?.value || '').trim();
      if(!q){ await loadClients(); return; }
      try{
        setLoading(true);
        const res = await fetch(API + '/api/clients/search?q=' + encodeURIComponent(q), { credentials: 'include' });
        if(!res.ok) throw new Error('search endpoint not available');
        clients = await res.json();
        renderClients();
      }catch(err){ console.warn('client search error', err.message); }
      finally{ setLoading(false); }
    }
    if(clientSearchBtn){ clientSearchBtn.addEventListener('click', runClientSearch); }
    if(clientSearchInput){ clientSearchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); runClientSearch(); } }); }

    const clientForm = document.getElementById('clientForm');
    if(clientForm){
      clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('clientName')?.value || '',
          phone: document.getElementById('clientPhone')?.value || '',
          email: document.getElementById('clientEmail')?.value || '',
          source: document.getElementById('clientSource')?.value || '',
          status: document.getElementById('clientStatus')?.value || 'lead',
          notes: document.getElementById('clientNotes')?.value || ''
        };
        try{
          setLoading(true);
          const res = await fetch(API + '/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
          if(!res.ok) throw new Error('failed to save client');
          // reset and reload
          clientForm.reset();
          await loadClients();
        }catch(err){ console.warn('save client error', err.message); }
        finally{ setLoading(false); }
      });
    }

    const agreementForm = document.getElementById('agreementForm');
    if(agreementForm){
      agreementForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.selectedClientId){ alert('Seleziona un cliente dalla lista a sinistra.'); return; }
        const signedDateVal = document.getElementById('agrSignedAt')?.value || '';
        const signedMs = signedDateVal ? new Date(signedDateVal + 'T00:00:00').getTime() : null;
        const payload = {
          clientId: window.selectedClientId,
          service: document.getElementById('agrService')?.value || '',
          price: document.getElementById('agrPrice')?.value || '',
          currency: document.getElementById('agrCurrency')?.value || 'EUR',
          status: document.getElementById('agrStatus')?.value || 'pending',
          details: document.getElementById('agrDetails')?.value || '',
          signedAtMs: signedMs
        };
        try{
          setLoading(true);
          const res = await fetch(API + '/api/agreements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
          if(!res.ok) throw new Error('failed to save agreement');
          agreementForm.reset();
          await loadAgreementsForSelected();
        }catch(err){ console.warn('save agreement error', err.message); }
        finally{ setLoading(false); }
      });
    }

    const createClientBtn = document.getElementById('createClientFromContact');
    if(createClientBtn){
      createClientBtn.addEventListener('click', async () => {
        if(!currentContact || !currentContact.id){ alert('Nessun contatto selezionato.'); return; }
        try{
          setLoading(true);
          const res = await fetch(API + '/api/clients/fromContact/' + encodeURIComponent(currentContact.id), { method: 'POST', credentials: 'include' });
          const data = await res.json().catch(()=>({status:'error'}));
          if(!res.ok || data.status!=='ok'){ throw new Error('failed to create client from contact'); }
          // close modal, reload clients and select the created/updated client
          if(contactModal) contactModal.hide();
          await loadClients();
          if(data.id){
            window.selectedClientId = data.id;
            const label = document.getElementById('selectedClientLabel');
            const created = clients.find(c=>c.id===window.selectedClientId);
            if(label) label.textContent = 'Cliente selezionato: ' + (created?.name || window.selectedClientId);
            await loadAgreementsForSelected();
          }
        }catch(err){ console.warn('create-from-contact error', err.message); }
        finally{ setLoading(false); }
      });
    }

    // Export buttons
    const exportClientsBtn = document.getElementById('exportClients');
    if(exportClientsBtn){
      exportClientsBtn.addEventListener('click', () => {
        let rows = (clients || []).slice(0);
        const fromMs = fmtDateInputToMs(document.getElementById('clientsFrom')?.value || '');
        const toMs = fmtDateEndToMs(document.getElementById('clientsTo')?.value || '');
        if(clientsQuery){
          const q = clientsQuery.toLowerCase();
          rows = rows.filter(c => `${c.name||''} ${c.phone||''} ${c.email||''} ${c.source||''}`.toLowerCase().includes(q));
        }
        if(fromMs || toMs){
          rows = rows.filter(c => {
            const ts = new Date(c.createdAt).getTime();
            if(fromMs && ts < fromMs) return false;
            if(toMs && ts > toMs) return false;
            return true;
          });
        }
        exportCsv('clients.csv', rows, ['createdAt','name','phone','email','status','source']);
      });
    }
    const exportAgreementsBtn = document.getElementById('exportAgreements');
    if(exportAgreementsBtn){
      exportAgreementsBtn.addEventListener('click', () => {
        let rows = (agreements || []).slice(0);
        if(agreementsQuery){
          const q = agreementsQuery.toLowerCase();
          rows = rows.filter(a => `${a.service||''} ${a.currency||''} ${a.status||''}`.toLowerCase().includes(q));
        }
        exportCsv('agreements.csv', rows, ['signedAt','service','agreedPrice','currency','status']);
      });
    }
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
    // Enable auto-refresh by default
    const autoSwitch = document.getElementById('autoRefreshSwitch');
    if(autoSwitch){
      autoSwitch.checked = true;
      autoSwitch.dispatchEvent(new Event('change'));
    }
    const hasToken = !!localStorage.getItem('authToken');
    const tasks = [loadStats(), loadContacts(), loadClients()];
    if(hasToken){ tasks.push(loadAnalytics(), loadContracts()); }
    await Promise.all(tasks);
    setLastUpdate();
  }
  if(document.readyState==='complete' || document.readyState==='interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
  // ---- CRM Details & Logs ----
  function setSelectValue(id, value){
    const el = document.getElementById(id);
    if(!el) return;
    const v = (value || '').toString();
    const found = Array.from(el.options).some(o => o.value === v);
    el.value = found ? v : el.value;
  }

  async function loadSelectedClientDetails(){
    if(!window.selectedClientId) return;
    try{
      const res = await fetch(`${API}/api/clients/${window.selectedClientId}`);
      const data = await res.json();
      if(data && data.id){
        setSelectValue('clientClassification', data.classification || 'lead');
        setSelectValue('clientStage', data.pipelineStage || 'interested');
      }
    }catch(e){ console.error('loadSelectedClientDetails error', e); }
  }

  async function saveClassification(){
    if(!window.selectedClientId) return;
    const val = document.getElementById('clientClassification')?.value;
    try{
      await fetch(`${API}/api/clients/${window.selectedClientId}/classification`,{
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({classification: val})
      });
    }catch(e){ console.error('saveClassification error', e); }
  }

  async function saveStage(){
    if(!window.selectedClientId) return;
    const val = document.getElementById('clientStage')?.value;
    try{
      await fetch(`${API}/api/clients/${window.selectedClientId}/stage`,{
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({pipelineStage: val})
      });
    }catch(e){ console.error('saveStage error', e); }
  }

  async function loadClientLogs(){
    if(!window.selectedClientId) return;
    try{
      const res = await fetch(`${API}/api/clients/${window.selectedClientId}/logs`);
      const arr = await res.json();
      const tbody = document.getElementById('clientLogsList');
      if(!tbody) return;
      tbody.innerHTML = '';
      (arr||[]).forEach(l => {
        const tr = document.createElement('tr');
        const ts = l.timestamp ? new Date(l.timestamp).toLocaleString('it-IT') : '';
        tr.innerHTML = `<td>${ts}</td><td>${l.channel||''}</td><td>${l.userName||''}</td><td>${l.notes||''}</td><td>${l.outcome||''}</td>`;
        tbody.appendChild(tr);
      });
    }catch(e){ console.error('loadClientLogs error', e); }
  }

  async function addLog(){
    if(!window.selectedClientId) return;
    const channel = document.getElementById('logChannel')?.value || '';
    const outcome = document.getElementById('logOutcome')?.value || '';
    const notes = document.getElementById('logNotes')?.value || '';
    try{
      await fetch(`${API}/api/clients/${window.selectedClientId}/logs`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({channel, outcome, notes})
      });
      document.getElementById('logNotes').value = '';
      loadClientLogs();
    }catch(e){ console.error('addLog error', e); }
  }

  document.getElementById('saveClassificationBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); saveClassification(); });
  document.getElementById('saveStageBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); saveStage(); });
  document.getElementById('addLogBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); addLog(); });
    // sortable headers for clients
    document.querySelectorAll('thead [data-sort]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        const table = th.closest('table');
        if(table && table.querySelector('#clientsList')){
          if(clientsSort.key === key){ clientsSort.dir = clientsSort.dir === 'asc' ? 'desc' : 'asc'; }
          else { clientsSort = { key, dir: 'asc' }; }
          renderClients();
        } else if(table && table.querySelector('#agreementsList')){
          if(agreementsSort.key === key){ agreementsSort.dir = agreementsSort.dir === 'asc' ? 'desc' : 'asc'; }
          else { agreementsSort = { key, dir: 'asc' }; }
          renderAgreements();
        }
      });
    });
    const clientsPrev = document.getElementById('clientsPrev'); if(clientsPrev){ clientsPrev.addEventListener('click', ()=>{ clientsPage = Math.max(1, clientsPage-1); renderClients(); }); }
    const clientsNext = document.getElementById('clientsNext'); if(clientsNext){ clientsNext.addEventListener('click', ()=>{ clientsPage += 1; renderClients(); }); }
    const clientsSearchInline = document.getElementById('clientsSearchInline'); if(clientsSearchInline){ clientsSearchInline.addEventListener('input', (e)=>{ clientsQuery = e.target.value || ''; clientsPage = 1; renderClients(); }); }
    const agreementsPrev = document.getElementById('agreementsPrev'); if(agreementsPrev){ agreementsPrev.addEventListener('click', ()=>{ agreementsPage = Math.max(1, agreementsPage-1); renderAgreements(); }); }
    const agreementsNext = document.getElementById('agreementsNext'); if(agreementsNext){ agreementsNext.addEventListener('click', ()=>{ agreementsPage += 1; renderAgreements(); }); }
    const agreementsSearchInline = document.getElementById('agreementsSearchInline'); if(agreementsSearchInline){ agreementsSearchInline.addEventListener('input', (e)=>{ agreementsQuery = e.target.value || ''; agreementsPage = 1; renderAgreements(); }); }