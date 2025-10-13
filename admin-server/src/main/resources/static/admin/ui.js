// UI polish: update lastUpdate clock, auto-refresh toggle, and spinner handling
(function(){
  function formatTime(d){
    try { return d.toLocaleTimeString(); } catch(e){ return '—'; }
  }
  function initUI(){
    var lastUpdateEl = document.getElementById('lastUpdate');
    var refreshBtn = document.getElementById('refreshBtn');
    var autoSwitch = document.getElementById('autoRefreshSwitch');
    var spinner = document.getElementById('loadingSpinner');
    var updatingText = document.getElementById('updatingText');

    function touchClock(){ if(lastUpdateEl) lastUpdateEl.textContent = formatTime(new Date()); }
    touchClock();
    var clockId = setInterval(touchClock, 30000);

    // Show spinner on manual refresh, hide on completion or after timeout
    var hideTimer = null;
    function showLoading(){
      if(spinner) spinner.style.visibility = 'visible';
      if(updatingText) updatingText.style.visibility = 'visible';
      if(hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hideLoading, 4000);
    }
    function hideLoading(){
      if(spinner) spinner.style.visibility = 'hidden';
      if(updatingText) updatingText.style.visibility = 'hidden';
      if(hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      touchClock();
    }
    if(refreshBtn){
      refreshBtn.addEventListener('click', showLoading);
    }
    // Optional: listen for a custom event fired by data loaders to hide spinner
    document.addEventListener('admin:refresh:done', hideLoading);

    // Auto-refresh: click the refresh button every 30s
    var autoId = null;
    function setAuto(state){
      if(autoId){ clearInterval(autoId); autoId = null; }
      if(state){
        autoId = setInterval(function(){ if(refreshBtn){ refreshBtn.click(); } }, 30000);
      }
    }
    if(autoSwitch){
      setAuto(autoSwitch.checked);
      autoSwitch.addEventListener('change', function(){ setAuto(autoSwitch.checked); });
    }
  }
  if(document.readyState==='complete' || document.readyState==='interactive') initUI();
  else document.addEventListener('DOMContentLoaded', initUI);
})();