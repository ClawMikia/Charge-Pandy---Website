/* Sound effects (martial-arts themed WAVs in assets/sfx/). Volume + mute are
   remembered in localStorage. Audio problems never break the site. */
(function () {
  'use strict';
  var NAMES = ['click', 'nav', 'dialog_open', 'dialog_close', 'theme', 'reset', 'fullscreen', 'confirm', 'pick',
    'reveal', 'denied', 'arm', 'mute_on', 'beat1', 'beat2', 'go', 'round_start', 'match_start', 'move_charge',
    'move_shield', 'move_boom', 'move_double', 'move_reflect', 'move_ultimate', 'hit_player', 'hit_cpu', 'block',
    'round_win', 'round_lose', 'round_draw', 'match_win', 'match_lose', 'quest', 'achievement', 'medal', 'levelup'];
  var BASE = 'assets/sfx/';
  var MAX_VOICES = 4;
  var pool = {};

  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) { /* ignore */ } }

  var volume = parseFloat(read('cp_sfx_volume', '0.8'));
  if (isNaN(volume)) volume = 0.8;
  var muted = read('cp_sfx_muted', 'false') === 'true';
  var listeners = [];

  function entry(name) {
    if (!pool[name]) {
      var a = new Audio(BASE + name + '.wav');
      a.preload = 'auto';
      pool[name] = { els: [a], i: 0 };
    }
    return pool[name];
  }

  function playNow(name, gain) {
    if (muted || volume <= 0) return;
    try {
      var e = entry(name);
      var el = null, k;
      for (k = 0; k < e.els.length; k++) {
        if (e.els[k].paused || e.els[k].ended) { el = e.els[k]; break; }
      }
      if (!el) {
        if (e.els.length < MAX_VOICES) { el = e.els[0].cloneNode(); e.els.push(el); }
        else { el = e.els[e.i % e.els.length]; e.i++; }
      }
      el.currentTime = 0;
      el.volume = Math.max(0, Math.min(1, volume * (gain == null ? 1 : gain)));
      var p = el.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked or file missing */ });
    } catch (err) { /* ignore */ }
  }

  function emit() { for (var i = 0; i < listeners.length; i++) listeners[i](); }

  window.CP = window.CP || {};
  window.CP.sound = {
    play: function (name, opts) {
      opts = opts || {};
      if (opts.delay) setTimeout(function () { playNow(name, opts.gain); }, opts.delay);
      else playNow(name, opts.gain);
    },
    preload: function () { NAMES.forEach(function (n) { try { entry(n); } catch (e) { /* ignore */ } }); },
    get volume() { return volume; },
    get muted() { return muted; },
    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (volume > 0 && muted) muted = false;
      write('cp_sfx_volume', volume); write('cp_sfx_muted', muted); emit();
    },
    toggleMute: function () {
      muted = !muted; write('cp_sfx_muted', muted); emit();
      if (!muted) playNow('mute_on', 1);
    },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
