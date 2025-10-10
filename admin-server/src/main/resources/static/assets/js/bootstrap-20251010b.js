// Bootstrap loader to ensure API_BASE is set before main.js loads
(function(){
  try {
    // Force same-origin API base in production
    if (!window.API_BASE) {
      window.API_BASE = location.origin;
    }
  } catch (e) {
    // In case location.origin is unavailable (older browsers), fallback to protocol + host
    try { window.API_BASE = window.API_BASE || (location.protocol + '//' + location.host); } catch(_) {}
  }

  // Dynamically load the main script (cache-busted)
  var s = document.createElement('script');
  s.src = 'assets/js/main.js?v=20251010b';
  s.defer = true;
  document.head.appendChild(s);
})();