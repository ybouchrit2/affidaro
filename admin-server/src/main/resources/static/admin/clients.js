// Clients page logic moved from inline scripts to comply with CSP
(() => {
  const apiBase = '/api/clients';
  let page = 0, size = 20;
  let currentData = [];
  let sortKey = 'createdAt';
  let sortDir = 'desc';
  const clientStats = new Map(); // id -> {agreementsCount, lastVisitTs}

  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportClients');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const classificationFilter = document.getElementById('classificationFilter');
  const pipelineFilter = document.getElementById('pipelineFilter');
  const dateStart = document.getElementById('dateStart');
  const dateEnd = document.getElementById('dateEnd');
  const pageInfo = document.getElementById('pageInfo');
  const saveClientBtn = document.getElementById('saveClientBtn');

  function safe(s){ return (s ?? '').toString(); }
  function formatDate(d){ if(!d) return ''; const dt = new Date(d); return dt.toLocaleString('ar-EG'); }

  function statusBadge(s){
    const m = {
      'lead': ['bg-warning','bi-lightbulb'],
      'meeting': ['bg-info','bi-calendar-event'],
      'agreed': ['bg-primary','bi-hand-thumbs-up'],
      'closed': ['bg-success','bi-check-circle'],
      'rejected': ['bg-danger','bi-x-circle']
    };
    const [cls, icon] = m[s] || ['bg-secondary','bi-dot'];
    return `<span class="badge ${cls}"><i class="bi ${icon}"></i> ${safe(s)}</span>`;
  }
  function classBadge(s){
    const m = {
      'vip': ['bg-purple','bi-star'],
      'active': ['bg-success','bi-person-check'],
      'former': ['bg-secondary','bi-person'],
      'lead': ['bg-warning','bi-person-plus']
    };
    const [cls, icon] = m[s] || ['bg-light','bi-person'];
    return `<span class="badge ${cls}"><i class="bi ${icon}"></i> ${safe(s)}</span>`;
  }

  async function fetchClients() {
    try {
      const q = searchInput.value.trim();
      let url = q ? `${apiBase}/search?q=${encodeURIComponent(q)}` : `${apiBase}?page=${page}&size=${size}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      currentData = Array.isArray(data) ? data : (data.content || []);
      document.getElementById('apiAlert').classList.add('d-none');
    } catch(e) {
      currentData = [];
      document.getElementById('apiAlert').classList.remove('d-none');
    }
    renderTable();
    pageInfo.textContent = `صفحة ${page+1}`;
  }

  function renderTable(){
    const tbody = document.querySelector('#clientsTable tbody');
    const q = searchInput.value.trim().toLowerCase();
    const st = statusFilter.value;
    const cf = classificationFilter?.value || '';
    const pf = pipelineFilter?.value || '';
    const ds = dateStart.value;
    const de = dateEnd.value;
    const filtered = currentData.filter(c => {
      const matchesQ = !q || [c.name,c.email,c.phone].some(v => (v||'').toLowerCase().includes(q));
      const matchesSt = !st || (c.status||'').toLowerCase() === st;
      const matchesCf = !cf || (c.classification||'').toLowerCase() === cf;
      const matchesPf = !pf || (c.pipelineStage||'').toLowerCase() === pf;
      let matchesDate = true;
      if (ds) { const sMs = new Date(ds).getTime(); const ca = new Date(c.createdAt).getTime(); matchesDate = matchesDate && (ca >= sMs); }
      if (de) { const eMs = new Date(de).getTime()+86400000-1; const ca = new Date(c.createdAt).getTime(); matchesDate = matchesDate && (ca <= eMs); }
      return matchesQ && matchesSt && matchesCf && matchesPf && matchesDate;
    });
    const sorted = [...filtered].sort((a,b)=>{
      let va = a[sortKey], vb = b[sortKey];
      va = va ?? ''; vb = vb ?? '';
      if (sortKey === 'createdAt') { va = new Date(va).getTime() || 0; vb = new Date(vb).getTime() || 0; }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
    });
    tbody.innerHTML = sorted.map(c => {
      const stats = clientStats.get(c.id) || {};
      const lastVisit = stats.lastVisitTs ? formatDate(stats.lastVisitTs) : '';
      const agreementsCount = stats.agreementsCount ?? '';
      return `
      <tr>
        <td>${safe(c.name)}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${agreementsCount}</td>
        <td>${lastVisit}</td>
        <td>${classBadge(c.classification)}</td>
        <td><span class="badge bg-info">${safe(c.pipelineStage)}</span></td>
        <td>${formatDate(c.createdAt)}</td>
        <td>
          <div class="btn-group btn-group-sm" role="group">
            <a class="btn btn-outline-primary" href="contracts.html?client=${encodeURIComponent(c.name||'')}">العقود</a>
            <a class="btn btn-outline-secondary" href="visits.html?client=${encodeURIComponent(c.name||'')}">الزيارات</a>
            <button class="btn btn-outline-info js-view-client" data-id="${c.id}">تفاصيل</button>
            <button class="btn btn-outline-warning js-edit-client" data-id="${c.id}">تعديل</button>
            <button class="btn btn-outline-danger js-delete-client" data-id="${c.id}">حذف</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  async function loadClientStats(list){
    for(const c of list){
      try {
        const [agreementsRes, visitRes] = await Promise.all([
          fetch(`/api/clients/${c.id}/agreements`),
          fetch(`/api/visits/byClient/${c.id}/recent`)
        ]);
        const agreements = await agreementsRes.json();
        const visit = await visitRes.json();
        clientStats.set(c.id, {
          agreementsCount: Array.isArray(agreements) ? agreements.length : 0,
          lastVisitTs: visit && visit.timestamp ? visit.timestamp : null
        });
      } catch(e){ /* ignore */ }
    }
    renderTable();
  }

  const _origFetchClients = fetchClients;
  async function fetchClientsWithStats(){
    await _origFetchClients();
    await loadClientStats(currentData);
  }

  // Events
  prevPageBtn?.addEventListener('click', ()=>{ if(page>0){ page--; fetchClientsWithStats(); } });
  nextPageBtn?.addEventListener('click', ()=>{ page++; fetchClientsWithStats(); });
  refreshBtn?.addEventListener('click', fetchClientsWithStats);
  searchInput?.addEventListener('input', ()=>{ page = 0; fetchClientsWithStats(); });
  statusFilter?.addEventListener('change', renderTable);
  classificationFilter?.addEventListener('change', renderTable);
  pipelineFilter?.addEventListener('change', renderTable);
  dateStart?.addEventListener('change', renderTable);
  dateEnd?.addEventListener('change', renderTable);
  exportBtn?.addEventListener('click', ()=>exportClientsCSV());

  document.querySelectorAll('.sortable').forEach(h=>{
    h.addEventListener('click', ()=>{
      const key = h.getAttribute('data-key');
      if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; } else { sortKey = key; sortDir = 'asc'; }
      renderTable();
    });
  });

  // Delegated actions for row buttons
  document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.js-view-client');
    if (viewBtn) { e.preventDefault(); viewClient(viewBtn.dataset.id); return; }
    const editBtn = e.target.closest('.js-edit-client');
    if (editBtn) { e.preventDefault(); editClient(editBtn.dataset.id); return; }
    const delBtn = e.target.closest('.js-delete-client');
    if (delBtn) { e.preventDefault(); deleteClient(delBtn.dataset.id); return; }
  });

  // Edit/save/delete/detail
  let editingClientId = null;
  async function editClient(id){
    try{
      const res = await fetch(`/api/clients/${id}`);
      if(!res.ok) throw new Error('failed');
      const data = await res.json();
      editingClientId = id;
      document.getElementById('editName').value = data.name||'';
      document.getElementById('editEmail').value = data.email||'';
      document.getElementById('editPhone').value = data.phone||'';
      document.getElementById('editStatus').value = data.status||'';
      const modal = new bootstrap.Modal(document.getElementById('editModal'));
      modal.show();
    }catch(e){
      console.warn('تعذر جلب بيانات العميل', e);
      alert('تعذر تحميل بيانات العميل');
    }
  }

  async function saveClient(){
    if(!editingClientId) return;
    try{
      const body = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        status: document.getElementById('editStatus').value
      };
      const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
      const csrf = token ? decodeURIComponent(token.split('=')[1]) : '';
      const res = await fetch(`/api/clients/${editingClientId}`,{
        method:'PUT',
        headers:{'Content-Type':'application/json','X-XSRF-TOKEN': csrf},
        body: JSON.stringify(body)
      });
      if(!res.ok) throw new Error('failed');
      const modalEl = document.getElementById('editModal');
      bootstrap.Modal.getInstance(modalEl)?.hide();
      await fetchClientsWithStats();
    }catch(e){
      console.warn('تعذر حفظ العميل', e);
      alert('تعذر حفظ التغييرات');
    }
  }

  async function deleteClient(id){
    if(!confirm('هل تريد حذف العميل؟')) return;
    try{
      const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
      const csrf = token ? decodeURIComponent(token.split('=')[1]) : '';
      const res = await fetch(`/api/clients/${id}`, { method:'DELETE', headers:{'X-XSRF-TOKEN': csrf} });
      if(!res.ok) throw new Error('failed');
      await fetchClientsWithStats();
    }catch(e){
      console.warn('تعذر حذف العميل', e);
      alert('تعذر حذف العميل');
    }
  }

  async function viewClient(id){
    try{
      const res = await fetch(`/api/clients/${id}`);
      if(!res.ok) throw new Error('failed');
      const data = await res.json();
      document.getElementById('detailName').textContent = data.name||'';
      document.getElementById('detailEmail').textContent = data.email||'';
      document.getElementById('detailPhone').textContent = data.phone||'';
      document.getElementById('detailStatus').innerHTML = statusBadge(data.status||'');
      document.getElementById('detailCreatedAt').textContent = formatDate(data.createdAt);
      const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
      modal.show();
    }catch(e){
      console.warn('تعذر جلب تفاصيل العميل', e);
      alert('تعذر تحميل تفاصيل العميل');
    }
  }

  function exportClientsCSV(){
    try{
      const q = searchInput.value.trim().toLowerCase();
      const st = statusFilter.value;
      const cf = classificationFilter?.value || '';
      const pf = pipelineFilter?.value || '';
      const ds = dateStart.value;
      const de = dateEnd.value;
      const filtered = currentData.filter(c => {
        const matchesQ = !q || [c.name,c.email,c.phone].some(v => (v||'').toLowerCase().includes(q));
        const matchesSt = !st || (c.status||'').toLowerCase() === st;
        const matchesCf = !cf || (c.classification||'').toLowerCase() === cf;
        const matchesPf = !pf || (c.pipelineStage||'').toLowerCase() === pf;
        let matchesDate = true;
        if (ds) { const sMs = new Date(ds).getTime(); const ca = new Date(c.createdAt).getTime(); matchesDate = matchesDate && (ca >= sMs); }
        if (de) { const eMs = new Date(de).getTime()+86400000-1; const ca = new Date(c.createdAt).getTime(); matchesDate = matchesDate && (ca <= eMs); }
        return matchesQ && matchesSt && matchesCf && matchesPf && matchesDate;
      });
      const rows = [
        ['Name','Status','Classification','Pipeline','Agreements','Last Visit','Created At'],
        ...filtered.map(c => {
          const stats = clientStats.get(c.id) || {};
          return [
            c.name||'', c.status||'', c.classification||'', c.pipelineStage||'',
            (stats.agreementsCount??'').toString(),
            stats.lastVisitTs ? new Date(stats.lastVisitTs).toISOString() : '',
            c.createdAt ? new Date(c.createdAt).toISOString() : ''
          ];
        })
      ];
      const csv = rows.map(r => r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'clients_export.csv'; a.click();
      URL.revokeObjectURL(url);
    }catch(e){ console.warn('CSV export failed', e); alert('فشل تصدير CSV'); }
  }

  // Save button
  saveClientBtn?.addEventListener('click', saveClient);

  // Periodic refresh and initial load
  setInterval(fetchClientsWithStats, 30000);
  fetchClientsWithStats();
})();