/* =========================================================
   CHARGE-PANDY — shell.js
   Nav drawer + theme toggle + small ambient FX
   ========================================================= */
(function(){
  const state = { theme: 'dark' };

  function initNav(){
    const toggle = document.querySelector('.nav-toggle');
    const scrim = document.querySelector('.nav-scrim');
    const nav = document.querySelector('.site-nav');
    if(!toggle || !nav) return;

    const close = () => document.body.classList.remove('nav-open');
    const open = () => document.body.classList.add('nav-open');

    toggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
    });
    scrim && scrim.addEventListener('click', close);
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });

    // mark active link
    const path = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a[data-page]').forEach(a => {
      if(a.dataset.page === path) a.classList.add('active');
    });
  }

  function initTheme(){
    const btn = document.querySelector('.theme-toggle');
    const label = btn ? btn.querySelector('.t-label') : null;
    const apply = () => {
      document.documentElement.setAttribute('data-theme', state.theme);
      if(label) label.textContent = state.theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    };
    apply();
    btn && btn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      apply();
      window.dispatchEvent(new CustomEvent('cp-theme-change', { detail: state.theme }));
    });
  }

  function initRevealOnLoad(){
    document.body.classList.add('cp-ready');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTheme();
    initRevealOnLoad();
  });

  window.CP_SHELL = state;
})();
