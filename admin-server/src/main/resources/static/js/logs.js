let data = [];
let page = 0; const size = 50;

function safe(s){ return (s ?? '').toString(); }
function formatDate(d){ if(!d) return ''; const dt = new Date(d); return dt.toLocaleString('ar-EG'); }

async function load(){
  const ds = document.getElementById('dateStart').value;
  const de = document.getElementById('dateEnd').value;
  let days = 7;
  if (ds && de) {
    const diff = Math.ceil((new Date(de) - new Date(ds)) / 86400000);
    if (diff > 0) days = Math.min(diff, 365);
  }
  try {
    const res = await fetch(`/api/logs/recent?days=${days}`);
    if(!res.ok) throw new Error('HTTP '+res.status);
    data = await res.json();
    document.getElementById('apiAlert').classList.add('d-none');
  } catch(e) {
    data = [];
    document.getElementById('apiAlert').classList.remove('d-none');
  }
  render();
}

function render(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const type = document.getElementById('typeFilter').value;
  const startIndex = page * size;
  const filtered = data.filter(l => {
    const matchesQ = !q || [l.userName, l.outcome, l.channel].some(v => (v||'').toLowerCase().includes(q));
    const matchesType = !type || (l.targetType||'').toLowerCase() === type;
    return matchesQ && matchesType;
  });
  const pageList = filtered.slice(startIndex, startIndex + size);
  const tbody = document.querySelector('#logsTable tbody');
  tbody.innerHTML = pageList.map(l => `
    <tr>
      <td>${formatDate(l.timestamp)}</td>
      <td>${safe(l.userName || (l.user && l.user.username))}</td>
      <td>${safe(l.action || l.outcome)}</td>
      <td>${safe(l.targetType)}${l.targetId ? ' #' + l.targetId : ''}</td>
      <td>
        <button class="btn btn-sm btn-outline-info" onclick="viewLog('${l.id || ''}')"><i class="bi bi-info-circle"></i></button>
      </td>
    </tr>
  `).join('');
  document.getElementById('pageInfo').textContent = `صفحة ${page+1}`;
}

document.getElementById('refreshBtn').addEventListener('click', load);
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('typeFilter').addEventListener('change', render);
document.getElementById('dateStart').addEventListener('change', load);
document.getElementById('dateEnd').addEventListener('change', load);
document.getElementById('prevPage').addEventListener('click', ()=>{ if(page>0){ page--; render(); } });
document.getElementById('nextPage').addEventListener('click', ()=>{ page++; render(); });

setInterval(load, 30000);
load();

function exportLogsCSV(){
  try {
    const q = (document.getElementById('searchInput').value||'').trim().toLowerCase();
    const type = (document.getElementById('typeFilter').value||'').toLowerCase();
    const filtered = (data||[]).filter(l => {
      const matchesQ = !q || [l.userName, l.notes, l.outcome, l.channel].some(v => (v||'').toLowerCase().includes(q));
      const matchesType = !type || (l.targetType||'').toLowerCase() === type;
      return matchesQ && matchesType;
    });
    const rows = [
      ['Timestamp','User','Action','Target'],
      ...filtered.map(l => [
        l.timestamp||'', l.userName || (l.user && l.user.username) || '', l.action || l.outcome || '',
        (l.targetType||'') + (l.targetId ? ' #' + l.targetId : '')
      ])
    ];
    const csv = rows.map(r => r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'logs_export.csv'; a.click(); URL.revokeObjectURL(url);
  } catch(e) {
    console.warn('CSV export failed', e);
    alert('فشل تصدير CSV');
  }
}
document.getElementById('exportLogs').addEventListener('click', exportLogsCSV);

async function viewLog(id){
  try{
    if(!id){ throw new Error('missing id'); }
    const res = await fetch(`/api/logs/${id}`);
    if(!res.ok) throw new Error('failed');
    const l = await res.json();
    document.getElementById('logDetailTimestamp').textContent = new Date(l.timestamp).toLocaleString('ar-EG');
    document.getElementById('logDetailUser').textContent = l.userName || (l.user && l.user.username) || '';
    document.getElementById('logDetailAction').textContent = l.action || l.outcome || '';
    document.getElementById('logDetailTarget').textContent = (l.targetType||'') + (l.targetId? ' #' + l.targetId : '');
    document.getElementById('logDetailNotes').textContent = l.notes || '';
    const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
    modal.show();
  }catch(e){
    console.warn('تعذر تحميل تفاصيل السجل', e);
    alert('تعذر تحميل تفاصيل السجل');
  }
}