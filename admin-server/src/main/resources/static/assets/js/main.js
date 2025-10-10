// Wrap in an IIFE to avoid leaking globals and make top-level errors easier to catch
(function(){
  'use strict';

  // API base (قابل للتغيير لاحقاً إن لزم)
  const API_BASE = (typeof window.API_BASE !== 'undefined' && window.API_BASE !== null) ? window.API_BASE : '';

  // DOM elements cache
  const elements = {};
  
  // Helper: Get DOM element and cache it
  function getElement(id) {
    if (!elements[id]) {
      elements[id] = document.getElementById(id);
    }
    return elements[id];
  }

  // جلب إحصائيات الزيارات وتحديث واجهة العدادات
  async function updateVisitStats(){
    try{
      const res = await fetch(API_BASE + '/api/visits/stats');
      if(!res.ok) return;
      const data = await res.json();
      const totalEl = document.getElementById('visitsTotal');
      if(totalEl){ totalEl.textContent = data.total ?? 0; }
      // إن أردنا لاحقاً إضافة زيارات اليوم يمكن استخدام: document.getElementById('visitsToday')
    }catch(e){ /* ignore */ }
  }

  // تتبع مدة التواجد في الصفحة وإرسالها عند المغادرة
  try {
    const visitStart = Date.now();
    let sentVisit = false;
    function sendVisit(){
      if(sentVisit) return; sentVisit = true;
      const payload = {
        page: location.pathname,
        referrer: document.referrer || '',
        durationMs: Math.max(0, Date.now() - visitStart)
      };
      const url = API_BASE + '/api/visits';
      try{
        const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
        if(navigator.sendBeacon){ navigator.sendBeacon(url, blob); }
        else {
          fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), keepalive:true}).catch(()=>{});
        }
      }catch(e){ /* ignore */ }
    }
    window.addEventListener('pagehide', sendVisit);
    window.addEventListener('beforeunload', sendVisit);
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') sendVisit(); });
  } catch(e) {}
  
  // Portfolio/Work filtering functionality
  document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.btn-filter');
    const workItems = document.querySelectorAll('.work-item');
    
    if (filterButtons.length && workItems.length) {
      filterButtons.forEach(button => {
        button.addEventListener('click', function() {
          // Remove active class from all buttons
          filterButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          this.classList.add('active');
          
          const filterValue = this.getAttribute('data-filter');
          
          // Show/hide items based on filter
          workItems.forEach(item => {
            if (filterValue === 'all') {
              item.style.display = 'block';
            } else {
              if (item.getAttribute('data-category') === filterValue) {
                item.style.display = 'block';
              } else {
                item.style.display = 'none';
              }
            }
          });
        });
      });
    }
    
    // Counter animation for statistics
    function animateCounters() {
      const counters = document.querySelectorAll('.counter');
      const speed = 200; // The lower the slower
      
      counters.forEach(counter => {
        const target = +counter.getAttribute('data-count') || +counter.innerText;
        const count = +counter.innerText;
        
        // If data-count is not set, use the innerText as target
        if (!counter.hasAttribute('data-count')) {
          counter.setAttribute('data-count', count);
        }
        
        const inc = target / speed;
        
        if (count < target) {
          counter.innerText = Math.ceil(count + inc);
          setTimeout(() => animateCounters(), 1);
        } else {
          counter.innerText = target;
        }
      });
    }
    
    // Intersection Observer for triggering counter animation when stats are visible
    const statsSection = document.querySelector('.stats-container');
    if (statsSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(statsSection);
    }

    // حدّث عداد الزيارات عند الجاهزية (قد لا يكون القسم مُحمَّلاً بعد، لذلك نعيد النداء بعد إدراج الأقسام)
    updateVisitStats();
  });

  // Helper: hide preloader if present
  function hidePreloader(){
    const pre = getElement('preloader');
    if(pre) pre.style.display = 'none';
  }

  // Ensure preloader is hidden on window load and as a fallback after 3s (reduced from 6s)
  window.addEventListener('load', hidePreloader);
  setTimeout(hidePreloader, 3000);

  // Back to top (guard for missing element)
  const backBtn = getElement('backToTop');
  if(backBtn){
    // Use passive event listener for better scroll performance
    window.addEventListener('scroll', ()=>{ 
      backBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
    }, {passive: true});
    const reduceMotionPref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    backBtn.addEventListener('click', ()=> window.scrollTo({top:0,behavior: reduceMotionPref ? 'auto' : 'smooth'}));
  }

  // Sticky CTA visibility for small screens
  const sticky = document.querySelector('.sticky-cta');
  function updateSticky(){ 
    if(!sticky) return; 
    sticky.classList.toggle('d-none', window.innerWidth < 992);
  }
  updateSticky(); 
  // Use debounced resize listener for better performance
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateSticky, 100);
  }, {passive: true});

  // Cookie bar
  const cb = getElement('cookieBar');
  if(cb && !localStorage.getItem('cookiesAccepted')) {
    cb.style.display = 'flex';
    const acceptBtn = getElement('acceptCookies');
    if(acceptBtn) acceptBtn.addEventListener('click', function(){ 
      localStorage.setItem('cookiesAccepted','1'); 
      cb.style.display = 'none'; 
    });
  }

  // Lazy load sections
  document.addEventListener('DOMContentLoaded', function() {
    const lazyLoadSections = document.querySelectorAll('[data-include][data-lazy="true"]');
    
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadSection(entry.target);
            sectionObserver.unobserve(entry.target);
          }
        });
      }, {rootMargin: '200px'});
      
      lazyLoadSections.forEach(section => {
        sectionObserver.observe(section);
      });
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      lazyLoadSections.forEach(section => {
        loadSection(section);
      });
    }

    // Eagerly load non-lazy sections
    document.querySelectorAll('[data-include]:not([data-lazy="true"])').forEach(section => loadSection(section));

    // Accessibility: hide decorative icons from assistive tech
    ['.bi', '.fas', '.far', '.fal', '.fa'].forEach(sel => {
      document.querySelectorAll(sel).forEach(icon => {
        if(!icon.getAttribute('aria-label')) icon.setAttribute('aria-hidden','true');
      });
    });

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduced-motion');
    }
  });

  // Load section content
  function loadSection(section) {
    const url = section.getAttribute('data-include');
    if (!url) return;
    
    fetch(url)
      .then(response => response.text())
      .then(html => {
        section.innerHTML = html;
        // Execute any scripts in the loaded content
        const scripts = section.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        });
        // After injecting section HTML, ensure dynamic forms are bound
        try { bindContactFormIfPresent(); } catch(e) {}
        // تحديث عداد الزيارات بعد إدراج الأقسام التي قد تحتوي عنصر العرض
        try { updateVisitStats(); } catch(e) {}
      })
      .catch(error => {
        console.warn('Error loading section:', url, error);
      });
  }

  // Form handling (client-side) - demo simulation
  const contactForm = getElement('contactForm');
  if(contactForm) {
    contactForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const phone = document.getElementById('phone');
      const service = document.getElementById('service');
      const websiteHoneypot = document.getElementById('website');
      const msgBox = document.getElementById('formMsg');

      // simple validation (guards in case elements are removed)
      if(websiteHoneypot && websiteHoneypot.value.trim() !== '') { /* spam */ return; }
      if(!name || !email || !phone || !service || !msgBox){
        return; // required elements missing
      }
      const invalidName = !name.value.trim();
      const invalidEmail = !email.checkValidity();
      const invalidPhone = !phone.checkValidity();
      const invalidService = !service.value;
      // update aria-invalid for accessibility
      name.setAttribute('aria-invalid', invalidName ? 'true' : 'false');
      email.setAttribute('aria-invalid', invalidEmail ? 'true' : 'false');
      phone.setAttribute('aria-invalid', invalidPhone ? 'true' : 'false');
      service.setAttribute('aria-invalid', invalidService ? 'true' : 'false');

      if(invalidName||invalidEmail||invalidPhone||invalidService){
        msgBox.style.display='block'; msgBox.className='alert alert-danger'; msgBox.textContent='يرجى ملء الحقول المطلوبة بشكل صحيح.'; 
        msgBox.focus();
        return;
      }

      // Build payload
      const detailsEl = document.getElementById('details');
      const payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        service: service.value,
        location: (document.getElementById('location')?.value || '').trim(),
        propertyType: document.getElementById('propertyType')?.value || '',
        priority: document.getElementById('priority')?.value || '',
        budget: document.getElementById('budget')?.value || '',
        contactTime: document.getElementById('contactTime')?.value || '',
        details: detailsEl ? detailsEl.value.trim() : '',
        source: 'معاينة مجانية - صفحة هبوط Aversa'
      };

      // Show loading state
      msgBox.style.display='block'; msgBox.className='alert alert-info'; msgBox.textContent='جاري إرسال طلبك...';

      try{
        const res = await fetch(API_BASE + '/api/contact',{
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('Failed');
        const successEl = document.getElementById('successModal');
        if(window.bootstrap && successEl){
          try{ const successModal = new bootstrap.Modal(successEl); successModal.show(); }catch(e){ /* ignore */ }
        }
        this.reset();
        // clear aria-invalid flags on success
        try{
          name.setAttribute('aria-invalid','false');
          email.setAttribute('aria-invalid','false');
          phone.setAttribute('aria-invalid','false');
          service.setAttribute('aria-invalid','false');
        }catch(e){}
        msgBox.style.display='none';
      } catch(err){
        msgBox.className='alert alert-danger'; msgBox.textContent='حدث خطأ أثناء الإرسال. جرب مرة أخرى أو اتصل بالهاتف.';
      }
    });
  }

  // Smooth scroll for in-page links
  try{
    const anchors = document.querySelectorAll('a[href^="#"]');
    if(anchors && anchors.length){
      anchors.forEach(a=>{ a.addEventListener('click', function(e){ const target = document.querySelector(this.getAttribute('href')); if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); } }); });
    }
  } catch(e){ /* ignore */ }

  // Accessibility: focus outline for keyboard navigation
  document.addEventListener('keydown', function(e){ if(e.key==='Tab') document.body.classList.add('show-focus'); });

  // Reveal small fades for better perceived performance
  window.addEventListener('load', ()=>{ try{ document.querySelectorAll('.fade-card').forEach(el=>el.classList.add('show')); }catch(e){} });

  // Pause demo video when modal closed
  try{
    const videoModalEl = document.getElementById('videoModal');
    if(videoModalEl) videoModalEl.addEventListener('hidden.bs.modal', function (event) {
      const v = document.getElementById('promoVideo');
      if(v && !v.paused) { v.pause(); v.currentTime = 0; }
    });
  } catch(e){ /* ignore */ }

})();

// Robust binding: delegate submit for contact form, including late-loaded sections
function bindContactFormIfPresent(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  if(form.dataset.bound === '1') return;
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const service = document.getElementById('service');
    const websiteHoneypot = document.getElementById('website');
    const msgBox = document.getElementById('formMsg');
    const submitBtn = form.querySelector('button[type="submit"]');

    if(websiteHoneypot && websiteHoneypot.value.trim() !== '') { return; }
    if(!name || !email || !phone || !service || !msgBox){ return; }

    // Inline error helper
    function setError(el, message){
      if(!el) return;
      el.classList.toggle('is-invalid', !!message);
      el.setAttribute('aria-invalid', message ? 'true' : 'false');
      try{
        const fb = el.closest('.form-group')?.querySelector('.form-feedback');
        if(fb){ fb.textContent = message || ''; }
      }catch(e){}
    }

    const invalidName = !name.value.trim();
    const invalidEmail = !email.checkValidity();
    const invalidPhone = !phone.checkValidity();
    const invalidService = !service.value;
    setError(name, invalidName ? 'الاسم مطلوب.' : '');
    setError(email, invalidEmail ? 'رجاءً أدخل بريدًا إلكترونيًا صالحًا.' : '');
    setError(phone, invalidPhone ? 'رقم الهاتف غير صالح.' : '');
    setError(service, invalidService ? 'اختر الخدمة المطلوبة.' : '');

    if(invalidName||invalidEmail||invalidPhone||invalidService){
      msgBox.style.display='block'; msgBox.className='alert alert-danger'; msgBox.textContent='رجاءً أكمل الحقول المطلوبة بشكل صحيح.';
      msgBox.focus();
      return;
    }

    const detailsEl = document.getElementById('details');
    const payload = {
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      service: service.value,
      location: (document.getElementById('location')?.value || '').trim(),
      propertyType: document.getElementById('propertyType')?.value || '',
      priority: document.getElementById('priority')?.value || '',
      budget: document.getElementById('budget')?.value || '',
      contactTime: document.getElementById('contactTime')?.value || '',
      details: detailsEl ? detailsEl.value.trim() : '',
      source: 'معاينة مجانية - صفحة هبوط Aversa'
    };

    msgBox.style.display='block'; msgBox.className='alert alert-info'; msgBox.textContent='جاري إرسال طلبك...';
    if(submitBtn){ submitBtn.disabled = true; }

    try{
      const res = await fetch(API_BASE + '/api/contact',{
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Failed');
      const successEl = document.getElementById('successModal');
      if(window.bootstrap && successEl){
        try{ const successModal = new bootstrap.Modal(successEl); successModal.show(); }catch(e){ }
      }
      form.reset();
      try{
        setError(name, '');
        setError(email, '');
        setError(phone, '');
        setError(service, '');
      }catch(e){}
      msgBox.style.display='none';
    } catch(err){
      msgBox.className='alert alert-danger'; msgBox.textContent='حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى أو التواصل عبر واتساب.';
    }
    if(submitBtn){ submitBtn.disabled = false; }
  });
  form.dataset.bound = '1';
}

// Attempt to bind on DOM ready and after a small delay for late-loaded includes
document.addEventListener('DOMContentLoaded', function(){ try{ bindContactFormIfPresent(); }catch(e){} });
setTimeout(function(){ try{ bindContactFormIfPresent(); }catch(e){} }, 1000);
const contactForm = document.getElementById('contactForm');
if(contactForm && contactForm.dataset.bound !== '1') {
  contactForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const service = document.getElementById('service');
    const websiteHoneypot = document.getElementById('website');
    const msgBox = document.getElementById('formMsg');

    // simple validation
    if(websiteHoneypot && websiteHoneypot.value.trim() !== '') { /* spam */ return; }
    if(!name.value.trim()||!email.checkValidity()||!phone.checkValidity()||!service.value){
      msgBox.style.display='block'; msgBox.className='alert alert-danger'; msgBox.textContent='يرجى ملء الحقول المطلوبة بشكل صحيح.'; 
      msgBox.focus();
      return;
    }

    // Build payload
    const payload = {
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      service: service.value,
      location: (document.getElementById('location')?.value || '').trim(),
      propertyType: document.getElementById('propertyType')?.value || '',
      priority: document.getElementById('priority')?.value || '',
      budget: document.getElementById('budget')?.value || '',
      contactTime: document.getElementById('contactTime')?.value || '',
      details: document.getElementById('details').value.trim(),
      source: 'معاينة مجانية - صفحة هبوط Aversa'
    };

    // Show loading state
    msgBox.style.display='block'; msgBox.className='alert alert-info'; msgBox.textContent='جاري إرسال طلبك...';

    try{
      const res = await fetch(API_BASE + '/api/contact',{
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Failed');
      const successEl = document.getElementById('successModal');
      if(window.bootstrap && successEl){
        try{ const successModal = new bootstrap.Modal(successEl); successModal.show(); }catch(e){}
      }
      this.reset();
      msgBox.style.display='none';
    } catch(err){
      msgBox.className='alert alert-danger'; msgBox.textContent='حدث خطأ أثناء الإرسال. جرب مرة أخرى أو اتصل بالهاتف.';
    }
  });
  contactForm.dataset.bound = '1';
}

// Smooth scroll for in-page links
document.querySelectorAll('a[href^="#"]').forEach(a=>{ a.addEventListener('click', function(e){ const target = document.querySelector(this.getAttribute('href')); if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); } }); });

// Accessibility: focus outline for keyboard navigation
document.addEventListener('keydown', function(e){ if(e.key==='Tab') document.body.classList.add('show-focus'); });

// Reveal small fades for better perceived performance
window.addEventListener('load', ()=>{ document.querySelectorAll('.fade-card').forEach(el=>el.classList.add('show')); });

// Pause demo video when modal closed
const videoModalEl = document.getElementById('videoModal');
if(videoModalEl) videoModalEl.addEventListener('hidden.bs.modal', function (event) {
  const v = document.getElementById('promoVideo');
  if(v && !v.paused) { v.pause(); v.currentTime = 0; }
});

// Enable lazy-loading for images/iframes not explicitly marked
document.addEventListener('DOMContentLoaded', function(){
  try {
    document.querySelectorAll('img:not([loading])').forEach(img=>{
      img.setAttribute('loading','lazy');
    });
    document.querySelectorAll('iframe:not([loading])').forEach(ifr=>{
      ifr.setAttribute('loading','lazy');
    });
  } catch(e) { /* ignore */ }
});
