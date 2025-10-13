// Sidebar behavior: toggle for mobile and active link highlighting on scroll
(function(){
  function initSidebar(){
    try{
      var body = document.body;
      var toggleBtn = document.getElementById('sidebarToggle');
      var sidebar = document.getElementById('adminSidebar');
      if(toggleBtn){
        toggleBtn.addEventListener('click', function(){
          body.classList.toggle('sidebar-collapsed');
        });
      }
      if(!sidebar) return;
      var links = sidebar.querySelectorAll('.sidebar-nav a');
      var map = Array.prototype.map.call(links, function(link){
        return { link: link, target: document.querySelector(link.getAttribute('href')) };
      });
      function updateActive(){
        var y = window.scrollY + 120;
        var activeIndex = -1;
        for(var i=0;i<map.length;i++){
          var el = map[i].target;
          if(el && el.offsetTop <= y){ activeIndex = i; }
        }
        Array.prototype.forEach.call(links, function(l, idx){ l.classList.toggle('active', idx===activeIndex); });
      }
      window.addEventListener('scroll', updateActive, { passive: true });
      updateActive();
    }catch(e){ /* ignore */ }
  }
  if(document.readyState==='complete' || document.readyState==='interactive') initSidebar();
  else document.addEventListener('DOMContentLoaded', initSidebar);
})();