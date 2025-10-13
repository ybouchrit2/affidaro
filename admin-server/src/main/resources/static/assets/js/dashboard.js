// Externalized from dashboard.html to comply with CSP (no inline scripts)
const el = id => document.getElementById(id);
const safe = v => v == null ? '—' : String(v);
const formatDate = ts => {
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch (e) {
    return '—';
  }
};

function renderCards(summary) {
  el('totalClients').textContent = safe(summary.totalClients);
  el('newClientsToday').textContent = safe(summary.newClientsToday);
  el('visitsToday').textContent = safe(summary.visitsToday);
  el('avgVisitDurationSec').textContent = Math.round((summary.avgVisitDuration || 0) / 1000);
}

function renderVisits(list) {
  const tbody = document.querySelector('#visitsTable tbody');
  tbody.innerHTML = (list || []).slice(0, 10).map(v => `
        <tr>
          <td>${formatDate(v.timestamp)}</td>
          <td>${safe(v.page)}</td>
          <td>${safe(v.referrer)}</td>
          <td>${(v.durationMs || 0) / 1000 | 0}</td>
        </tr>
      `).join('');
}

function renderLastByPage(list) {
  const map = new Map();
  (list || []).forEach(v => {
    const key = v.page || '';
    const prev = map.get(key);
    const vTs = v.timestamp ? new Date(v.timestamp).getTime() : 0;
    const pTs = prev && prev.timestamp ? new Date(prev.timestamp).getTime() : -1;
    if (!prev || vTs > pTs) map.set(key, v);
  });
  const tbody = document.querySelector('#lastByPageTable tbody');
  const rows = Array.from(map.entries()).sort((a, b) => {
    const ta = a[1].timestamp ? new Date(a[1].timestamp).getTime() : 0;
    const tb = b[1].timestamp ? new Date(b[1].timestamp).getTime() : 0;
    return tb - ta;
  }).slice(0, 10);
  tbody.innerHTML = rows.map(([page, v]) => `
        <tr>
          <td>${safe(page)}</td>
          <td>${formatDate(v.timestamp)}</td>
          <td>${safe(v.referrer)}</td>
          <td>${(v.durationMs || 0) / 1000 | 0}</td>
        </tr>
      `).join('');
}

async function load() {
  try {
    const [sumRes, statsRes] = await Promise.all([
      fetch('/api/analytics'),
      fetch('/api/visits/stats')
    ]);
    const summary = await sumRes.json();
    const stats = await statsRes.json();
    renderCards(summary);
    renderVisits(stats.recent || []);
    renderLastByPage(stats.recent || []);
  } catch (e) {
    renderCards({});
    renderVisits([]);
    renderLastByPage([]);
  }
}

document.addEventListener('DOMContentLoaded', load);