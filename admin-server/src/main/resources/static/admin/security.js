// Simple JWT auth integration for admin UI
(function(){
  const API_BASE_FOR_AUTH = window.API_BASE || location.origin;
  let authToken = localStorage.getItem('authToken') || null;

  // Patch fetch to attach Authorization on /api/**
  const originalFetch = window.fetch;
  window.fetch = async function(input, init){
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const nextInit = init || {};
      const headers = new Headers(nextInit.headers || {});
      if (authToken && url.includes('/api/')) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      nextInit.headers = headers;
      return originalFetch(input, nextInit);
    } catch(e){
      return originalFetch(input, init);
    }
  }

  // Login modal logic
  function bindLogin(){
    const btn = document.getElementById('loginSubmit');
    if(!btn) return;
    // Bootstrap style validation without inline scripts
    try{
      const form = btn.closest('form');
      if(form){
        form.addEventListener('submit', (event)=>{
          if(!form.checkValidity()){ event.preventDefault(); event.stopPropagation(); }
          form.classList.add('was-validated');
        });
      }
    }catch(e){}
    btn.addEventListener('click', async () => {
      const username = document.getElementById('loginUser').value;
      const password = document.getElementById('loginPass').value;
      const msgEl = document.getElementById('loginMsg');
      msgEl.textContent = '';
      try {
        const res = await fetch(`${API_BASE_FOR_AUTH}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if(data.status === 'ok' && data.token){
          authToken = data.token;
          localStorage.setItem('authToken', authToken);
          msgEl.classList.remove('text-danger');
          msgEl.classList.add('text-success');
          msgEl.textContent = 'تم تسجيل الدخول بنجاح';
          setTimeout(() => { location.reload(); }, 500);
        } else {
          msgEl.textContent = 'بيانات دخول غير صحيحة';
        }
      } catch(err){
        msgEl.textContent = 'خطأ في الاتصال بالسيرفر';
      }
    });
  }

  // Status messages via query params (?error, ?logout) without inline JS
  function showStatusIfPresent(){
    const status = document.getElementById('status');
    if(!status) return;
    const params = new URLSearchParams(location.search);
    if(params.has('error')){
      status.innerHTML = '<div class="alert alert-danger">Credenziali non valide, riprova.</div>';
    }else if(params.has('logout')){
      status.innerHTML = '<div class="alert alert-success">Logout effettuato con successo.</div>';
    }
  }

  function init(){ bindLogin(); showStatusIfPresent(); }
  if(document.readyState==='complete' || document.readyState==='interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();