let selectedId = null;
function safe(s){ return (s ?? '').toString(); }
function formatDate(d){ if(!d) return ''; const dt = new Date(d); return dt.toLocaleString('ar-EG'); }
function outcomeBadge(o){
  const map = {
    'succeeded':['bg-success','bi-check2-circle'],
    'no_answer':['bg-warning','bi-telephone-x'],
    'scheduled':['bg-info','bi-calendar-event'],
    'sent':['bg-primary','bi-send'],
    'cancelled':['bg-danger','bi-x-circle']
  };
  const [cls, icon] = map[o] || ['bg-secondary','bi-dot'];
  return `<span class="badge ${cls}"><i class="bi ${icon}"></i> ${safe(o)}</span>`;
}

async function searchClients(){
  const q = document.getElementById('clientSearch').value.trim();
  if (!q) { document.getElementById('clientResults').innerHTML = ''; return; }
  const res = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`);
  const list = await res.json();
  const ul = document.getElementById('clientResults');
  ul.innerHTML = list.map(c => `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span><i class="bi bi-person me-2"></i>${safe(c.name)} <small class="text-muted">${safe(c.email)} | ${safe(c.phone)}</small></span>
      <button class="btn btn-sm btn-outline-primary" onclick="selectClient(${c.id}, '${safe(c.name).replace(/'/g,"&#39;")}')">اختيار</button>
  </li>`).join('');
}

function selectClient(id, name){
  selectedId = id;
  document.getElementById('selectedClient').textContent = `العميل: ${name} (#${id})`;
  document.getElementById('logsSection').classList.remove('is-hidden');
  document.getElementById('refreshBtn').disabled = false;
  loadLogs();
}

async function loadLogs(){
  if (!selectedId) return;
  const res = await fetch(`/api/clients/${selectedId}/logs`);
  const logs = await res.json();
  const tbody = document.querySelector('#logsTable tbody');
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${formatDate(l.timestamp)}</td>
      <td>${safe(l.channel)}</td>
      <td>${safe(l.userName)}</td>
      <td>${outcomeBadge(l.outcome)}</td>
      <td>${l.rating ?? ''}</td>
      <td>${safe(l.notes)}</td>
    </tr>
  `).join('');
}

document.getElementById('clientSearch').addEventListener('input', searchClients);
document.getElementById('refreshBtn').addEventListener('click', loadLogs);
setInterval(loadLogs, 30000);