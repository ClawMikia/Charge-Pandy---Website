/* Shared site code: theme, right sidebar + drawer, dialogs, keyboard layer. */
(function () {
  'use strict';
  window.CP = window.CP || {};
  var CP = window.CP;
  var PAGE = document.body.getAttribute('data-page') || 'home';

  /* ------------------------------------------------------------ helpers */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } }
  CP.lsGet = lsGet; CP.lsSet = lsSet;
  CP.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  CP.page = PAGE;

  /* ------------------------------------------------------------ roster */
  var NAMES = ['Riot', 'Volt', 'Cinder', 'Frostbyte', 'Nomad', 'Static', 'Hollow', 'Ember', 'Vanta', 'Circuit',
    'Rogue', 'Havoc', 'Glitch', 'Talon', 'Ashen', 'Pulse', 'Onyx', 'Ferro', 'Wraith', 'Solstice'];
  CP.roster = NAMES.map(function (n, i) {
    return { id: i + 1, name: 'PANDY // ' + n, tag: '#' + (i + 1 < 10 ? '0' : '') + (i + 1) };
  });
  CP.sprite = function (ch, pose) { return 'assets/pandy/pandy' + ch.id + '_' + pose + '.png'; };
  CP.iconUrl = function (res) { return 'assets/pandy/' + res + '.png'; };
  CP.randomFighter = function () { return CP.roster[Math.floor(Math.random() * CP.roster.length)]; };

  /* ------------------------------------------------------------ theme */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', lsGet('cp_theme', 'dark'));
  }
  CP.isLight = function () { return lsGet('cp_theme', 'dark') === 'light'; };
  CP.toggleTheme = function () {
    lsSet('cp_theme', CP.isLight() ? 'dark' : 'light');
    applyTheme();
    CP.sound.play('theme');
    refreshSidebar();
  };
  applyTheme();

  /* ---------------------------------------- flat-colour icon filters */
  var TINTS = {
    success: [0.298, 0.686, 0.314, 1], lost: [1, 1, 1, 0.2], white: [1, 1, 1, 1],
    Bronze: [0.804, 0.498, 0.196, 1], Silver: [0.753, 0.753, 0.753, 1],
    Gold: [1, 0.843, 0, 1], Platinum: [0.898, 0.894, 0.886, 1]
  };
  function injectFilters() {
    var html = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>';
    Object.keys(TINTS).forEach(function (k) {
      var t = TINTS[k];
      html += '<filter id="tint-' + k + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' +
        '0 0 0 0 ' + t[0] + ' 0 0 0 0 ' + t[1] + ' 0 0 0 0 ' + t[2] + ' 0 0 0 ' + t[3] + ' 0"/></filter>';
    });
    html += '</defs></svg>';
    document.body.insertAdjacentHTML('afterbegin', html);
  }
  CP.tintStyle = function (kind) { return 'filter:url(#tint-' + kind + ')'; };

  /* ------------------------------------------------------------ navigation */
  CP.go = function (url) {
    if (url === PAGE + '.html' || (PAGE === 'home' && url === 'index.html')) return;
    CP.sound.play('nav');
    setTimeout(function () { window.location.href = url; }, 130);
  };
  var PAGES = {
    home: 'index.html', play: 'play.html', awards: 'awards.html', rules: 'rules.html'
  };

  /* ------------------------------------------------------------ dialogs */
  var dialogs = [];
  CP.dialogOpen = function () { return dialogs.length > 0; };

  CP.dialog = {
    open: function (o) {
      var wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = '<div class="card cut lg' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" tabindex="-1">' + o.html + '</div>';
      document.body.appendChild(wrap);
      var d = { el: wrap, o: o };
      d.close = function (silent) {
        var i = dialogs.indexOf(d);
        if (i < 0) return;
        dialogs.splice(i, 1);
        wrap.remove();
        if (o.sound !== false && !silent) CP.sound.play('dialog_close');
        if (o.onClose) o.onClose();
      };
      if (o.dismissOnScrim) {
        wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) d.close(); });
      }
      dialogs.push(d);
      if (o.sound !== false) CP.sound.play('dialog_open');
      var auto = wrap.querySelector('[data-autofocus]') || wrap.querySelector('.card');
      if (auto && auto.focus) auto.focus();
      if (o.onOpen) o.onOpen(wrap, d);
      return d;
    }
  };

  /* ---- shortcut cheat-sheet ---- */
  var HELP = [
    ['Global', [['H', 'Home'], ['P', 'Play'], ['A', 'Awards'], ['R', 'Rules'], ['T', 'Toggle dark / light theme'],
      ['M', 'Mute / unmute sound'], ['? / F1', 'Show this help'], ['F11', 'Fullscreen (browser)'], ['Esc', 'Back to Home / close a dialog']]],
    ['Duel', [['1', 'Charge'], ['2', 'Shield'], ['3', 'Boom'], ['4', 'Double Boom'], ['5', 'Reflect'], ['6', 'Ultimate'],
      ['F', 'Change fighter'], ['Ctrl + R', 'Restart match'], ['Esc', 'Quit match']]],
    ['Menus & dialogs', [['Enter', 'Confirm / continue / start'], ['L', 'Learn the moves (Home)'],
      ['Arrows', 'Move through the Pandy grid'], ['Space', 'Pick the highlighted Pandy'], ['Tab', 'Move between buttons']]]
  ];
  CP.help = function () {
    if (dialogs.length) return;
    var cols = HELP.map(function (s) {
      return '<div><h3>' + s[0] + '</h3>' + s[1].map(function (r) {
        return '<div class="row"><span class="kbd">' + r[0] + '</span><span>' + r[1] + '</span></div>';
      }).join('') + '</div>';
    }).join('');
    CP.dialog.open({
      wide: true, dismissOnScrim: true,
      html: '<div class="eyebrow">Keyboard</div><h2>Shortcuts</h2><div class="help-grid">' + cols + '</div>' +
        '<div class="actions"><button class="btn" data-act="close" data-autofocus>Close <span class="kbd">Esc</span></button></div>',
      onEnter: function (d) { d.close(); },
      onEscape: function (d) { d.close(); },
      onOpen: function (el, d) { el.querySelector('[data-act=close]').addEventListener('click', function () { d.close(); }); }
    });
  };

  /* ---- reset all data ---- */
  CP.resetDialog = function () {
    if (dialogs.length) return;
    CP.dialog.open({
      dismissOnScrim: true,
      html: '<h2>Reset all data?</h2><p>This will clear all your progress, stats, and achievements. This cannot be undone.</p>' +
        '<div class="actions"><button class="btn ghost" data-act="cancel" data-autofocus>Cancel <span class="kbd">Esc</span></button>' +
        '<button class="btn" data-act="reset">Reset</button></div>',
      onEscape: function (d) { d.close(); },
      onOpen: function (el, d) {
        el.querySelector('[data-act=cancel]').addEventListener('click', function () { d.close(); });
        el.querySelector('[data-act=reset]').addEventListener('click', function () {
          CP.store.resetAll();
          lsSet('cp_first_launch', 'true');
          CP.sound.play('reset');
          d.close(true);
          setTimeout(function () { window.location.href = 'index.html'; }, 350);
        });
      }
    });
  };

  /* ------------------------------------------------------------ fullscreen */
  CP.toggleFullscreen = function () {
    CP.sound.play('fullscreen');
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* ignore */ }
  };

  /* ------------------------------------------------------------ sidebar */
  var ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M14.5 4l5.5 5.5-9 9L5.5 13z"/><path d="M4 20l4-4"/><path d="M9.5 9.5l5 5"/></svg>',
    awards: '<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/><path d="M12 14v4"/><path d="M8 20h8"/></svg>',
    rules: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    volOn: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a8 8 0 0 1 0 11"/></svg>',
    volOff: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/></svg>',
    keys: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  function sidebarHtml() {
    var st = CP.store.stats();
    var pct = Math.min(100, Math.round(((st.exp % CP.store.EXP_PER_LEVEL) / CP.store.EXP_PER_LEVEL) * 100));
    function link(key, label, hint) {
      return '<a class="sb-link' + (PAGE === key ? ' active' : '') + '" href="' + PAGES[key] + '" data-nav="' + key + '">' +
        ICONS[key] + '<span>' + label + '</span><span class="kbd">' + hint + '</span></a>';
    }
    var silent = CP.sound.muted || CP.sound.volume <= 0;
    return '' +
      '<div class="sb-brand"><img src="assets/app_icon.png" alt=""><div><div class="name">CHARGE-PANDY</div><div class="sub">DUEL ARENA</div></div></div>' +
      '<div class="sb-level"><div class="row"><span class="lv">LEVEL ' + st.level + '</span><span class="xp">' + st.exp + ' EXP</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<nav class="sb-nav"><div class="sb-label">Navigate</div>' +
      link('home', 'Home', 'H') + link('play', 'Play', 'P') + link('awards', 'Awards', 'A') + link('rules', 'Rules', 'R') +
      '</nav>' +
      '<div class="sb-tools">' +
      '<button class="sb-tool" data-tool="theme">' + (CP.isLight() ? ICONS.sun : ICONS.moon) + '<span>' + (CP.isLight() ? 'Light Mode' : 'Dark Mode') + '</span><span class="kbd">T</span></button>' +
      '<div class="sb-volume"><button class="sb-tool' + (silent ? ' muted' : '') + '" data-tool="mute" title="Mute (M)" aria-label="Mute">' + (silent ? ICONS.volOff : ICONS.volOn) + '</button>' +
      '<input type="range" min="0" max="100" value="' + Math.round((CP.sound.muted ? 0 : CP.sound.volume) * 100) + '" data-tool="volume" aria-label="Volume"></div>' +
      '<button class="sb-tool" data-tool="help">' + ICONS.keys + '<span>Shortcuts</span><span class="kbd">?</span></button>' +
      '<button class="sb-tool" data-tool="full">' + ICONS.full + '<span>Fullscreen</span><span class="kbd">F11</span></button>' +
      '<button class="sb-tool" data-tool="reset">' + ICONS.reset + '<span>Reset Data</span></button>' +
      '</div>';
  }

  var sidebar;
  function refreshSidebar() {
    if (!sidebar) return;
    var focusedVolume = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-tool') === 'volume';
    if (focusedVolume) {
      // keep the slider mid-drag: only update the icon / level block
      var silent = CP.sound.muted || CP.sound.volume <= 0;
      var mb = sidebar.querySelector('[data-tool=mute]');
      if (mb) { mb.innerHTML = silent ? ICONS.volOff : ICONS.volOn; mb.classList.toggle('muted', silent); }
      return;
    }
    sidebar.innerHTML = sidebarHtml();
  }
  CP.refreshSidebar = refreshSidebar;

  function closeDrawer() { document.body.classList.remove('drawer-open'); }

  function buildSidebar() {
    sidebar = document.getElementById('sidebar');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'sidebar';
      sidebar.className = 'sidebar';
      sidebar.setAttribute('aria-label', 'Main navigation');
      document.body.appendChild(sidebar);
    }
    sidebar.classList.add('sidebar');
    sidebar.innerHTML = sidebarHtml();

    var menu = document.createElement('button');
    menu.className = 'menu-btn';
    menu.setAttribute('aria-label', 'Open menu');
    menu.innerHTML = ICONS.menu;
    menu.addEventListener('click', function () { document.body.classList.toggle('drawer-open'); });
    document.body.appendChild(menu);

    var scrim = document.createElement('div');
    scrim.className = 'drawer-scrim';
    scrim.addEventListener('click', closeDrawer);
    document.body.appendChild(scrim);

    sidebar.addEventListener('click', function (e) {
      var link = e.target.closest('[data-nav]');
      if (link) { e.preventDefault(); closeDrawer(); CP.go(link.getAttribute('href')); return; }
      var tool = e.target.closest('[data-tool]');
      if (!tool) return;
      var t = tool.getAttribute('data-tool');
      if (t === 'theme') CP.toggleTheme();
      else if (t === 'mute') CP.sound.toggleMute();
      else if (t === 'help') { closeDrawer(); CP.help(); }
      else if (t === 'full') CP.toggleFullscreen();
      else if (t === 'reset') { closeDrawer(); CP.resetDialog(); }
    });
    sidebar.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-tool') === 'volume') CP.sound.setVolume(e.target.value / 100);
    });
    sidebar.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-tool') === 'volume') { CP.sound.play('click'); e.target.blur(); refreshSidebar(); }
    });
    CP.sound.onChange(refreshSidebar);
  }

  /* ------------------------------------------------------------ keyboard */
  var pageKeys = null;
  CP.onKey = function (fn) { pageKeys = fn; };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'F11') { CP.sound.play('fullscreen'); return; } // the browser handles the fullscreen itself
    if (e.isComposing) return;

    // dialogs own the keyboard while open
    if (dialogs.length) {
      var top = dialogs[dialogs.length - 1];
      if (e.key === 'Escape') {
        e.preventDefault();
        if (top.o.onEscape) top.o.onEscape(top); else top.close();
        return;
      }
      if ((e.key === 'Enter') && top.o.onEnter) {
        var tn = e.target && e.target.tagName;
        if (tn !== 'BUTTON' && tn !== 'A') { e.preventDefault(); top.o.onEnter(top); }
      }
      return;
    }

    if (e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && e.target.type !== 'range')) return;
    var onButton = tag === 'BUTTON' || tag === 'A';
    var k = e.key;
    var ctrl = e.ctrlKey || e.metaKey;

    if (ctrl) { if (pageKeys && pageKeys(e)) e.preventDefault(); return; }

    if (k === 'F1' || k === '?') { e.preventDefault(); CP.help(); return; }

    if (k === 'Escape') {
      if (document.body.classList.contains('drawer-open')) { closeDrawer(); return; }
      if (pageKeys && pageKeys(e)) { e.preventDefault(); return; }
      if (PAGE !== 'home') CP.go('index.html');
      return;
    }

    if ((k === 'Enter' || k === ' ') && onButton) return; // let the focused control activate itself

    var lower = k.length === 1 ? k.toLowerCase() : k;
    if (!e.shiftKey) {
      if (lower === 'h') { CP.go('index.html'); return; }
      if (lower === 'p') { CP.go('play.html'); return; }
      if (lower === 'a') { CP.go('awards.html'); return; }
      if (lower === 'r') { CP.go('rules.html'); return; }
      if (lower === 't') { CP.toggleTheme(); return; }
      if (lower === 'm') { CP.sound.toggleMute(); return; }
    }
    if (pageKeys && pageKeys(e)) e.preventDefault();
  });

  // buttons give up focus after a click so keyboard shortcuts keep working
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b && b.blur && b.getAttribute('data-keepfocus') === null) setTimeout(function () { b.blur(); }, 0);
  });

  /* ------------------------------------------------------------ boot */
  function boot() {
    injectFilters();
    buildSidebar();
    CP.sound.preload();
    document.dispatchEvent(new Event('cp-ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
