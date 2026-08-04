// js/menu.js
// Responsive burger-menu toggle. On small screens the .nav-actions
// menu collapses behind a .nav-toggle button; clicking the button toggles
// .nav-open on the menu. A link click (or Escape) closes it again.
(function () {
  function init() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav-actions');
    if (!toggle || !nav) return;

    const expanded = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('nav-open', open);
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      expanded(!nav.classList.contains('nav-open'));
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) expanded(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') expanded(false);
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) expanded(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();