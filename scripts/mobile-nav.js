(function() {
  function wrapTables() {
    document.querySelectorAll('.data-table').forEach(function(table) {
      if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }
  function initMobileNav() {
    var nav = document.querySelector('.site-header nav');
    var navContainer = document.querySelector('.site-header .nav');
    if (!nav || !navContainer) return;

    var btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.className = 'nav-toggle';
    btn.innerHTML = '<span></span><span></span><span></span>';
    navContainer.insertBefore(btn, nav);

    function toggle() {
      var open = nav.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open);
      document.body.classList.toggle('nav-open', open);
    }
    function close() {
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }
    btn.addEventListener('click', toggle);
    nav.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') close();
    });
  }
  function init() {
    initMobileNav();
    wrapTables();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
