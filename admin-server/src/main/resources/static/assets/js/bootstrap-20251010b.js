// Bootstrap: ensure API_BASE is set early; main.js is included statically in index.html
(function(){
  try {
    if (!window.API_BASE) {
      window.API_BASE = location.origin;
    }
  } catch (e) {
    try { window.API_BASE = window.API_BASE || (location.protocol + '//' + location.host); } catch(_) {}
  }
})();