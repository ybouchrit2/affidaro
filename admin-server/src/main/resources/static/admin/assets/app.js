async function fetchStats(){
  try{
    const res = await fetch('/api/visits/stats');
    const data = await res.json();
    document.getElementById('total').textContent = data.total ?? 0;
    document.getElementById('today').textContent = data.today ?? 0;
    const avgEl = document.getElementById('avg');
    if(avgEl) {
      const avgSec = Math.round(((data.avgDurationMs||0))/1000);
      avgEl.textContent = avgSec;
    }
    const byBody = document.querySelector('#byPageTable tbody');
    byBody.innerHTML = '';
    Object.entries(data.byPage||{}).sort((a,b)=>b[1]-a[1]).forEach(([page,count])=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${page}</td><td>${count}</td>`;
      byBody.appendChild(tr);
    });
    const recentBody = document.querySelector('#recentTable tbody');
    recentBody.innerHTML = '';
    (data.recent||[]).forEach(v=>{
      const tr=document.createElement('tr');
      const dur = v.durationMs ? Math.round(v.durationMs/1000) : '';
      tr.innerHTML = `<td>${v.timestamp}</td><td>${v.page||''}</td><td>${v.referrer||''}</td><td>${v.ip||''}</td><td>${v.userAgent||''}</td><td>${dur}</td>`;
      recentBody.appendChild(tr);
    })
  }catch(e){
    console.error('Failed to load stats', e);
  }
}

fetchStats();
setInterval(fetchStats, 10000);