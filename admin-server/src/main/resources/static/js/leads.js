const apiUrl = '/api/contact/recent';
let data = [];
function priorityBadge(p){
  const map = { 'high':['bg-danger','bi-exclamation-triangle'], 'medium':['bg-warning','bi-exclamation-circle'], 'low':['bg-info','bi-info-circle'] };
  const [cls, icon] = map[p] || ['bg-secondary','bi-dot'];
  return `<span class="badge ${cls}"><i class="bi ${icon}"></i> ${safe(p)}</span>`;
}
function safe(s){ return (s ?? '').toString(); }
function formatDate(d){ if(!d) return ''; const dt = new Date(d); return dt.toLocaleString('ar-EG'); }

let sortKey = 'timestamp';
let sortDir = 'desc';
async function load(){
  try{
    const res = await fetch(apiUrl);
    data = await res.json();
    document.getElementById('errorBox').classList.add('d-none');
    render();
  }catch(e){
    document.getElementById('errorBox').textContent = 'تعذر جلب البيانات. تأكد من تشغيل الخادم.';
    document.getElementById('errorBox').classList.remove('d-none');
  }
}

function render(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const tbody = document.querySelector('#leadsTable tbody');
  const filtered = data.filter(x => !q || [x.name,x.email,x.phone,x.service,x.source].some(v => (v||'').toLowerCase().includes(q)));
  const sorted = filtered.sort((a,b)=>{
    let va = a[sortKey], vb = b[sortKey];
    if (sortKey === 'timestamp') { va = new Date(va).getTime()||0; vb = new Date(vb).getTime()||0; }
    va = (va ?? '').toString().toLowerCase();
    vb = (vb ?? '').toString().toLowerCase();
    return sortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
  });
  tbody.innerHTML = sorted.map(x => `
    <tr>
      <td>${safe(x.name)}</td>
      <td>${safe(x.email)}</td>
      <td>${safe(x.phone)}</td>
      <td>${safe(x.service)}</td>
      <td>${priorityBadge(x.priority)}</td>
      <td>${safe(x.source)}</td>
      <td>${formatDate(x.timestamp)}</td>
      <td>${x.client ? '<span class="text-success"><i class="bi bi-link-45deg"></i> نعم</span>' : '<span class="text-muted">لا</span>'}</td>
    </tr>
  `).join('');
}

document.getElementById('refreshBtn').addEventListener('click', load);
document.getElementById('searchInput').addEventListener('input', render);
document.querySelectorAll('.sortable').forEach(h=>{
  h.addEventListener('click', ()=>{
    const key = h.getAttribute('data-key');
    if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; } else { sortKey = key; sortDir = 'asc'; }
    render();
  });
});
setInterval(load, 30000);
load();