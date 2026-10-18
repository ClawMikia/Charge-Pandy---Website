/* ==========================================================================
   Charge-Pandy - martial-arts layer (website)
   - flat dragon silhouettes drifting behind every screen (dark blue + dark orange)
   - outfit colour picker: recolours the player's Pandy images everywhere
   - martial-arts motion: strikes, slashes, ink-swipe transitions, impacts
   Loaded after app.js and before the page script.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP = window.CP || {};
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } }
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  /* =====================================================================
     1. DRAGONS
     ===================================================================== */
  var DRAGON_TONES = {
    dark:  { blue: ['#08194A', '#0E2C7A'], orange: ['#47200A', '#74340E'], eye: '#9A6A3A' },
    light: { blue: ['#D3DCF6', '#B4C2F0'], orange: ['#F6DFCB', '#EFC4A3'], eye: '#A9805A' }
  };
  var NSEG = 48;

  function Dragon(rand, w, h, index, initial) {
    this.tone = index % 2 === 0 ? 'blue' : 'orange';
    this.rand = rand;
    this.respawn(w, h, initial);
    this.phase = rand() * 6.28;
  }
  Dragon.prototype.respawn = function (w, h, initial) {
    var r = this.rand, base = Math.max(w, h);
    this.L = base * (0.26 + r() * 0.26);
    this.speed = this.L * (0.018 + r() * 0.022);
    this.pw = 1.1 + r() * 0.7;
    this.left = r() < 0.5;
    var tilt = (r() - 0.5) * 0.7;
    this.ang = this.left ? Math.PI + tilt : tilt;
    var margin = this.L * 0.06;
    if (initial) {
      this.x = -this.L * 0.2 + r() * (w + this.L * 0.4);
    } else {
      this.x = this.left ? w + margin : -margin;
    }
    this.y = h * (0.06 + r() * 0.88);
    this.w = w; this.h = h;
  };
  Dragon.prototype.update = function (dt, w, h) {
    this.x += Math.cos(this.ang) * this.speed * dt;
    this.y += Math.sin(this.ang) * this.speed * dt;
    this.phase += this.pw * dt;
    var m = this.L * 1.25;
    if (this.x < -m || this.x > w + m || this.y < -m || this.y > h + m) this.respawn(w, h, false);
  };

  var PX = new Float32Array((NSEG + 1) * 2), HW = new Float32Array(NSEG + 1),
      TX = new Float32Array((NSEG + 1) * 2), NX = new Float32Array((NSEG + 1) * 2);

  Dragon.prototype.draw = function (ctx, tones) {
    var L = this.L, ph = this.phase, i, s;
    var amp = 0.075 * L, W = 0.05 * L, TWO_PI = Math.PI * 2;
    for (i = 0; i <= NSEG; i++) {
      s = i / NSEG;
      PX[i * 2] = -s * L;
      PX[i * 2 + 1] = amp * Math.sin(TWO_PI * 1.6 * s - ph) * (0.35 + 0.65 * s);
      var sm = Math.min(Math.max(s / 0.22, 0), 1);
      HW[i] = W * (0.38 + 0.62 * Math.sin(sm * Math.PI / 2)) * Math.pow(1 - s, 0.9);
    }
    for (i = 0; i <= NSEG; i++) {
      var a = Math.max(i - 1, 0), b = Math.min(i + 1, NSEG);
      var tx = PX[b * 2] - PX[a * 2], ty = PX[b * 2 + 1] - PX[a * 2 + 1];
      var m = Math.sqrt(tx * tx + ty * ty) || 1; tx /= m; ty /= m;
      TX[i * 2] = tx; TX[i * 2 + 1] = ty; NX[i * 2] = -ty; NX[i * 2 + 1] = tx;
    }
    var col = tones[0], acc = tones[1];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.ang);
    if (this.left) ctx.scale(1, -1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // body
    ctx.fillStyle = col;
    ctx.beginPath();
    for (i = 0; i <= NSEG; i++) {
      var x1 = PX[i * 2] + NX[i * 2] * HW[i], y1 = PX[i * 2 + 1] + NX[i * 2 + 1] * HW[i];
      if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
    }
    for (i = NSEG; i >= 0; i--) ctx.lineTo(PX[i * 2] - NX[i * 2] * HW[i], PX[i * 2 + 1] - NX[i * 2 + 1] * HW[i]);
    ctx.closePath(); ctx.fill();

    // dorsal spikes
    ctx.fillStyle = acc;
    ctx.beginPath();
    for (i = 3; i < NSEG - 3; i += 3) {
      var px = PX[i * 2], py = PX[i * 2 + 1], nx = NX[i * 2], ny = NX[i * 2 + 1], tx2 = TX[i * 2], ty2 = TX[i * 2 + 1], hw = HW[i];
      var bw = 0.013 * L, hh = hw * 0.75 + 0.012 * L;
      ctx.moveTo(px + nx * hw * 0.9 - tx2 * bw, py + ny * hw * 0.9 - ty2 * bw);
      ctx.lineTo(px + nx * (hw + hh) + tx2 * 0.016 * L, py + ny * (hw + hh) + ty2 * 0.016 * L);
      ctx.lineTo(px + nx * hw * 0.9 + tx2 * bw, py + ny * hw * 0.9 + ty2 * bw);
      ctx.closePath();
    }
    ctx.fill();

    // legs + claws
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, 0.008 * L);
    var legAt = [0.2, 0.55];
    for (var q = 0; q < 2; q++) {
      i = Math.floor(legAt[q] * NSEG);
      var lx = PX[i * 2], ly = PX[i * 2 + 1], lnx = NX[i * 2], lny = NX[i * 2 + 1], ltx = TX[i * 2], lty = TX[i * 2 + 1], lhw = HW[i];
      var bx = lx - lnx * lhw * 0.7, by = ly - lny * lhw * 0.7;
      var kx = bx - lnx * 0.03 * L + ltx * 0.028 * L, ky = by - lny * 0.03 * L + lty * 0.028 * L;
      var fx = kx - lnx * 0.026 * L - ltx * 0.008 * L, fy = ky - lny * 0.026 * L - lty * 0.008 * L;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
      var angs = [-0.8, 0, 0.8];
      for (var c = 0; c < 3; c++) {
        var ca = Math.cos(angs[c]), sa = Math.sin(angs[c]), dx = -lnx, dy = -lny;
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + (dx * ca - dy * sa) * 0.02 * L, fy + (dx * sa + dy * ca) * 0.02 * L);
      }
      ctx.stroke();
    }

    // tail tuft
    ctx.fillStyle = acc;
    var ex = PX[NSEG * 2], ey = PX[NSEG * 2 + 1], etx = TX[NSEG * 2], ety = TX[NSEG * 2 + 1];
    var blades = [[-0.6, 0.05], [0, 0.07], [0.6, 0.05]];
    ctx.beginPath();
    for (i = 0; i < 3; i++) {
      var ba = blades[i][0], bl = blades[i][1], cax = Math.cos(ba), sax = Math.sin(ba);
      var cx = etx * cax - ety * sax, cy = etx * sax + ety * cax, bnx = -cy, bny = cx;
      ctx.moveTo(ex - bnx * 0.008 * L, ey - bny * 0.008 * L);
      ctx.lineTo(ex + cx * bl * L, ey + cy * bl * L);
      ctx.lineTo(ex + bnx * 0.008 * L, ey + bny * 0.008 * L);
      ctx.closePath();
    }
    ctx.fill();

    // head
    var H = 0.095 * L;
    var hang = Math.atan2(PX[1] - PX[7], PX[0] - PX[6]);
    var hc = Math.cos(hang), hs = Math.sin(hang);
    function hx(x, y) { return [PX[0] + (x * hc - y * hs) * H, PX[1] + (x * hs + y * hc) * H]; }
    function poly(pts, fill) {
      ctx.fillStyle = fill; ctx.beginPath();
      for (var k = 0; k < pts.length; k++) { var p = hx(pts[k][0], pts[k][1]); if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
      ctx.closePath(); ctx.fill();
    }
    poly([[-0.6, -0.4], [0.1, -0.62], [0.8, -0.45], [1.5, -0.3], [1.8, -0.12], [1.72, 0.06], [1.1, 0.16], [0.95, 0.42], [0.3, 0.5], [-0.6, 0.35]], col);
    poly([[0.35, -0.55], [-0.9, -1.35], [-0.55, -0.95], [-1.3, -1.1], [-0.2, -0.5]], acc);
    ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1.2, 0.005 * L);
    for (var sg = -1; sg <= 1; sg += 2) {
      ctx.beginPath();
      for (var k2 = 0; k2 < 9; k2++) {
        var u = k2 / 8, wx = 1.5 - u * 2.6;
        var wy = sg * (0.1 + 0.9 * Math.sin(u * Math.PI * 0.9)) + Math.sin(ph * 1.5 - u * 5) * 0.18 * u;
        var wp = hx(wx, wy);
        if (k2 === 0) ctx.moveTo(wp[0], wp[1]); else ctx.lineTo(wp[0], wp[1]);
      }
      ctx.stroke();
    }
    var ep = hx(0.55, -0.2);
    ctx.fillStyle = tones.eye; ctx.beginPath(); ctx.arc(ep[0], ep[1], Math.max(1.5, 0.12 * H), 0, 6.283); ctx.fill();
    ctx.restore();
  };

  function DragonField(canvas) {
    var ctx = canvas.getContext('2d');
    var dragons = [], w = 0, h = 0, last = 0, running = false, seed = 20240921, fixed = false;
    function rand() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var r = canvas.getBoundingClientRect();
      w = Math.max(r.width, 1); h = Math.max(r.height, 1);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w > 900 ? 7 : 5;
      dragons = [];
      for (var i = 0; i < n; i++) dragons.push(new Dragon(rand, w, h, i, true));
      dragons.sort(function (a, b) { return a.L - b.L; });
      paint();
    }
    function paint() {
      if (!fixed && !canvas.offsetParent) return;
      ctx.clearRect(0, 0, w, h);
      var t = isLight() ? DRAGON_TONES.light : DRAGON_TONES.dark;
      for (var i = 0; i < dragons.length; i++) {
        var d = dragons[i], tn = t[d.tone];
        d.draw(ctx, { 0: tn[0], 1: tn[1], eye: t.eye });
      }
    }
    function frame(ts) {
      if (!running) return;
      var dt = Math.min((ts - last) / 1000, 0.1); last = ts;
      if (!document.hidden && (fixed || canvas.offsetParent !== null)) {
        for (var i = 0; i < dragons.length; i++) dragons[i].update(dt, w, h);
        paint();
      }
      requestAnimationFrame(frame);
    }
    this.start = function () {
      fixed = getComputedStyle(canvas).position === 'fixed';
      resize();
      window.addEventListener('resize', resize);
      if (reduceMotion) return;
      running = true; last = performance.now(); requestAnimationFrame(frame);
    };
    this.repaint = paint;
  }

  function mountDragons() {
    var c = document.createElement('canvas');
    c.className = 'fx-dragons'; c.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(c, document.body.firstChild);
    var f = new DragonField(c); f.start();
    var intro = document.getElementById('intro');
    if (intro) {
      var c2 = document.createElement('canvas');
      c2.className = 'fx-dragons fx-dragons-intro'; c2.setAttribute('aria-hidden', 'true');
      intro.insertBefore(c2, intro.firstChild);
      var f2 = new DragonField(c2); f2.start();
    }
    // repaint when the theme flips (reduced-motion users get a static frame)
    new MutationObserver(function () { f.repaint(); if (f2) f2.repaint(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* =====================================================================
     2. OUTFIT COLOUR  (images only)
     ===================================================================== */
  var PALETTE = [
    { name: 'Original', hue: null }, { name: 'Crimson', hue: 354 }, { name: 'Ember', hue: 22 },
    { name: 'Gold', hue: 46 }, { name: 'Jade', hue: 140 }, { name: 'Cyan', hue: 185 },
    { name: 'Azure', hue: 212 }, { name: 'Violet', hue: 272 }, { name: 'Magenta', hue: 318 }
  ];
  var DOM_HUE = {"10_boom": 315, "10_charge": 217, "10_shield": 316, "11_boom": 208, "11_charge": -1, "11_shield": 64, "12_boom": 35, "12_charge": 170, "12_shield": 283, "13_boom": 219, "13_charge": 36, "13_shield": 12, "14_boom": 33, "14_charge": 216, "14_shield": 44, "15_boom": -1, "15_charge": 216, "15_shield": 26, "16_boom": 155, "16_charge": 341, "16_shield": 111, "17_boom": 36, "17_charge": 341, "17_shield": 284, "18_boom": 275, "18_charge": 1, "18_shield": 36, "19_boom": 249, "19_charge": 219, "19_shield": -1, "1_boom": 237, "1_charge": 270, "1_shield": -1, "20_boom": 284, "20_charge": 50, "20_shield": 31, "2_boom": 0, "2_charge": 287, "2_shield": 6, "3_boom": 226, "3_charge": 27, "3_shield": 186, "4_boom": 61, "4_charge": -1, "4_shield": 88, "5_boom": 255, "5_charge": 305, "5_shield": 36, "6_boom": 359, "6_charge": 333, "6_shield": 300, "7_boom": 26, "7_charge": 31, "7_shield": 231, "8_boom": -1, "8_charge": 215, "8_shield": 359, "9_boom": 274, "9_charge": 4, "9_shield": 259};
  var colorIndex = Math.max(0, Math.min(PALETTE.length - 1, parseInt(lsGet('cp_avatar_color', '0'), 10) || 0));
  function currentHue() { return PALETTE[colorIndex].hue; }
  CP.avatarPalette = PALETTE;
  CP.avatarColorIndex = function () { return colorIndex; };

  function smooth(a, b, x) { var t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }
  function shortest(d) { d = d - Math.floor(d + 0.5); return d; }

  // same maths as the Flutter + Android ports
  function recolorPixels(d, th) {
    var i, opaque = 0, sat = 0;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] <= 13) continue;
      opaque++;
      var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      var v0 = mx / 255, s0 = mx ? (mx - mn) / mx : 0;
      if (s0 >= 0.28 && v0 >= 0.12) sat++;
    }
    var grey = opaque > 0 && sat / opaque < 0.10;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b), dl = max - min;
      var h = 0, s = max ? dl / max : 0, v = max;
      if (dl > 1e-6) {
        if (max === r) h = ((g - b) / dl) % 6; else if (max === g) h = (b - r) / dl + 2; else h = (r - g) / dl + 4;
        h /= 6; if (h < 0) h += 1;
      }
      if (!grey) {
        var w = smooth(0.20, 0.34, s) * smooth(0.08, 0.16, v);
        if (w <= 0) continue;
        h = h + shortest(th - h) * w;
        s = s + (Math.min(1, s * 1.25 + 0.04) - s) * w;
      } else {
        var wg = smooth(0.14, 0.26, v) * (1 - smooth(0.74, 0.86, v)) * (1 - smooth(0.15, 0.28, s));
        if (wg <= 0.001) continue;
        s = s + (0.55 - s) * wg; h = th;
      }
      h = h - Math.floor(h);
      var hh = h * 6, k = Math.floor(hh) % 6, f = hh - Math.floor(hh);
      var p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s), R, G, B;
      switch (k) {
        case 0: R = v; G = t; B = p; break; case 1: R = q; G = v; B = p; break;
        case 2: R = p; G = v; B = t; break; case 3: R = p; G = q; B = v; break;
        case 4: R = t; G = p; B = v; break; default: R = v; G = p; B = q;
      }
      d[i] = Math.round(R * 255); d[i + 1] = Math.round(G * 255); d[i + 2] = Math.round(B * 255);
    }
  }

  var cache = {}, pendingReq = {};
  function isPandyUrl(u) { return /assets\/pandy\/pandy\d+_(charge|shield|boom)\.png$/.test(u || ''); }
  function filterFor(url, hue) {
    var m = /pandy(\d+_(?:charge|shield|boom))\.png$/.exec(url), dom = m ? DOM_HUE[m[1]] : -1;
    if (dom === undefined || dom < 0) return 'sepia(.6) saturate(2.2) hue-rotate(' + ((hue - 38 + 360) % 360) + 'deg)';
    return 'hue-rotate(' + ((hue - dom + 360) % 360) + 'deg) saturate(1.15)';
  }
  function request(url, hue) {
    var key = hue + '|' + url;
    if (cache[key] || pendingReq[key]) return;
    pendingReq[key] = true;
    var img = new Image();
    img.onload = function () {
      try {
        var cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
        var data = cx.getImageData(0, 0, cv.width, cv.height);
        recolorPixels(data.data, hue / 360);
        cx.putImageData(data, 0, 0);
        cache[key] = { url: cv.toDataURL('image/png') };
      } catch (e) {
        // file:// pages taint the canvas - fall back to a CSS hue-rotate on the original image
        cache[key] = { url: url, filter: filterFor(url, hue) };
      }
      delete pendingReq[key]; applyAllFor(url);
    };
    img.onerror = function () { cache[key] = { url: url }; delete pendingReq[key]; };
    img.src = url;
  }

  function tinted(url) {
    var hue = currentHue();
    if (hue === null || !isPandyUrl(url)) return url;
    var hit = cache[hue + '|' + url];
    if (!hit) { request(url, hue); return url; }
    return hit.url;
  }

  function excluded(img) { return img.id === 'imgC' || !!img.closest('.pick,.cpu-card,.award'); }
  function applyImg(img) {
    var orig = img.getAttribute('data-orig') || img.getAttribute('src');
    if (!isPandyUrl(orig)) return;
    if (excluded(img)) { restoreImg(img, orig); return; }
    var hue = currentHue();
    if (hue === null) { restoreImg(img, orig); return; }
    var hit = cache[hue + '|' + orig];
    if (!hit) { img.setAttribute('data-orig', orig); request(orig, hue); return; }
    img.setAttribute('data-orig', orig);
    img.style.filter = hit.filter || '';
    if (img.getAttribute('src') !== hit.url) img.setAttribute('src', hit.url);
  }
  function restoreImg(img, orig) {
    if (img.hasAttribute('data-orig')) {
      img.style.filter = '';
      if (img.getAttribute('src') !== orig) img.setAttribute('src', orig);
      img.removeAttribute('data-orig');
    }
  }
  function applyAllFor(url) {
    var imgs = document.querySelectorAll('img[src*="assets/pandy/pandy"],img[data-orig]');
    for (var i = 0; i < imgs.length; i++) {
      var o = imgs[i].getAttribute('data-orig') || imgs[i].getAttribute('src');
      if (!url || o === url) applyImg(imgs[i]);
    }
  }
  function setColor(idx) {
    colorIndex = idx; lsSet('cp_avatar_color', idx);
    applyAllFor(null);
    refreshSwatches();
    document.dispatchEvent(new Event('cp-recolor'));
  }

  var origSprite = CP.sprite;
  CP.spriteRaw = origSprite;
  CP.sprite = function (ch, pose) { return tinted(origSprite(ch, pose)); };

  var swatchWrap = null;
  function swatchCss(p) {
    return p.hue === null ? 'conic-gradient(#d8d8e6 0 50%, #55556a 0)' : 'hsl(' + p.hue + ',72%,52%)';
  }
  function refreshSwatches() {
    if (!swatchWrap) return;
    Array.prototype.forEach.call(swatchWrap.children, function (b, i) { b.classList.toggle('active', i === colorIndex); b.setAttribute('aria-pressed', i === colorIndex); });
  }
  function buildColorRow() {
    var row = document.getElementById('colorRow');
    if (!row) return;
    row.innerHTML = '<div class="cr-label">Outfit color <span class="cr-name" id="crName"></span></div><div class="cr-swatches"></div>';
    swatchWrap = row.querySelector('.cr-swatches');
    PALETTE.forEach(function (p, i) {
      var b = document.createElement('button');
      b.className = 'swatch'; b.type = 'button'; b.title = p.name; b.setAttribute('aria-label', p.name + ' outfit');
      b.style.background = swatchCss(p);
      b.addEventListener('mouseenter', function () { row.querySelector('#crName').textContent = p.name; });
      b.addEventListener('mouseleave', function () { row.querySelector('#crName').textContent = PALETTE[colorIndex].name; });
      b.addEventListener('click', function () { if (CP.sound) CP.sound.play('pick'); setColor(i); row.querySelector('#crName').textContent = p.name; });
      swatchWrap.appendChild(b);
    });
    row.querySelector('#crName').textContent = PALETTE[colorIndex].name;
    refreshSwatches();
  }

  /* =====================================================================
     3. MARTIAL-ARTS MOTION
     ===================================================================== */
  var STRIKE_SEL = '.btn,.sb-link,.sb-tool,.move,.pick,.tab,.tile,.menu-btn,.swatch';

  function strikeAt(el, e) {
    var r = el.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (!isFinite(x) || (x === 0 && y === 0 && !e.clientX)) { x = r.width / 2; y = r.height / 2; }
    var s = document.createElement('span');
    s.className = 'fx-strike'; s.style.left = x + 'px'; s.style.top = y + 'px';
    s.innerHTML = '<i class="ring"></i><i class="sl a"></i><i class="sl b"></i><i class="sl c"></i>';
    el.appendChild(s);
    setTimeout(function () { s.remove(); }, 520);
    el.classList.remove('fx-chop'); void el.offsetWidth; el.classList.add('fx-chop');
    setTimeout(function () { el.classList.remove('fx-chop'); }, 260);
  }
  function wireStrikes() {
    document.addEventListener('pointerdown', function (e) {
      if (reduceMotion || e.button > 0) return;
      var el = e.target.closest && e.target.closest(STRIKE_SEL);
      if (el && !el.disabled) strikeAt(el, e);
    }, true);
  }

  // ----- ink swipe between pages + kung-fu flash
  var navigating = false;
  function swipeCover(done) {
    var a = document.createElement('div'), b = document.createElement('div');
    a.className = 'fx-swipe edge'; b.className = 'fx-swipe ink';
    document.body.appendChild(a); document.body.appendChild(b);
    b.addEventListener('animationend', function () { if (done) done(); }, { once: true });
  }
  function swipeReveal() {
    var b = document.createElement('div'), a = document.createElement('div');
    b.className = 'fx-swipe ink out'; a.className = 'fx-swipe edge out';
    document.body.appendChild(b); document.body.appendChild(a);
    document.documentElement.classList.remove('fx-entering');
    setTimeout(function () { b.remove(); a.remove(); }, 700);
  }
  function flash() {
    if (reduceMotion) return;
    var f = document.createElement('div'); f.className = 'fx-flash';
    f.innerHTML = '<i class="x1"></i><i class="x2"></i><i class="core"></i>';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 650);
  }

  var origGo = CP.go;
  CP.go = function (url) {
    var page = CP.page;
    if (url === page + '.html' || (page === 'home' && url === 'index.html') || navigating) return;
    if (reduceMotion || !origGo) { if (origGo) origGo(url); else window.location.href = url; return; }
    navigating = true;
    if (CP.sound) CP.sound.play('nav');
    try { sessionStorage.setItem('cp_swipe', '1'); } catch (e) { /* ignore */ }
    swipeCover(function () { window.location.href = url; });
  };

  // ----- gameplay: stance actions + impacts
  function addAct(sprite, cls, ms) {
    sprite.classList.remove('act-charge', 'act-shield', 'act-boom', 'act-doubleBoom', 'act-reflect', 'act-ultimate');
    void sprite.offsetWidth;
    sprite.classList.add(cls);
    setTimeout(function () { sprite.classList.remove(cls); }, ms);
  }
  function impactAt(spriteEl, kind) {
    var stage = spriteEl.closest('.inner'); if (!stage) return;
    var sr = spriteEl.getBoundingClientRect(), pr = stage.getBoundingClientRect();
    var cx = sr.left - pr.left + sr.width * 0.5, cy = sr.top - pr.top + sr.height * 0.5;
    var n = document.createElement('div');
    n.className = 'fx-impact ' + kind; n.style.left = cx + 'px'; n.style.top = cy + 'px';
    var html = '<i class="ring"></i><i class="ring r2"></i>';
    if (kind !== 'block') {
      html += '<i class="slash s1"></i><i class="slash s2"></i><i class="slash s3"></i>';
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * 6.283 + Math.random() * 0.5, d = 46 + Math.random() * 54;
        html += '<i class="dust" style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d * 0.7 + 14) + 'px;--sz:' + (7 + Math.round(Math.random() * 9)) + 'px"></i>';
      }
    }
    n.innerHTML = html; stage.appendChild(n);
    setTimeout(function () { n.remove(); }, 900);
  }
  function shake(stageInner, ms) {
    if (!stageInner) return;
    stageInner.classList.remove('fx-shake'); void stageInner.offsetWidth; stageInner.classList.add('fx-shake');
    setTimeout(function () { stageInner.classList.remove('fx-shake'); }, ms || 380);
  }
  var ATTACKS = { boom: 1, doubleBoom: 1, ultimate: 1 };
  window.CPFX = {
    flash: flash,
    reveal: function (o) {
      if (reduceMotion) return;
      addAct(o.spriteP, 'act-' + o.pm, 850);
      addAct(o.spriteC, 'act-' + o.cm, 850);
      var heavy = o.pm === 'ultimate' || o.cm === 'ultimate' || o.pm === 'doubleBoom' || o.cm === 'doubleBoom';
      setTimeout(function () {
        if (o.dmgC > 0) impactAt(o.spriteC, heavy ? 'heavy' : 'hit');
        if (o.dmgP > 0) impactAt(o.spriteP, heavy ? 'heavy' : 'hit');
        if (o.pm === 'shield' && ATTACKS[o.cm] && o.dmgP === 0) impactAt(o.spriteP, 'block');
        if (o.cm === 'shield' && ATTACKS[o.pm] && o.dmgC === 0) impactAt(o.spriteC, 'block');
        if (o.pm === 'reflect' && ATTACKS[o.cm]) impactAt(o.spriteP, 'block');
        if (o.cm === 'reflect' && ATTACKS[o.pm]) impactAt(o.spriteC, 'block');
        if ((o.dmgC > 0 || o.dmgP > 0) && heavy) shake(o.spriteP.closest('.inner'), 420);
        else if (o.dmgC > 0 || o.dmgP > 0) shake(o.spriteP.closest('.inner'), 260);
      }, 220);
    }
  };

  /* ----- boot ----- */
  function boot() {
    mountDragons();
    wireStrikes();
    buildColorRow();
    applyAllFor(null);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') { if (m.target.tagName === 'IMG') applyImg(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j]; if (n.nodeType !== 1) continue;
          if (n.tagName === 'IMG') applyImg(n);
          else if (n.querySelectorAll) { var inner = n.querySelectorAll('img'); for (var k = 0; k < inner.length; k++) applyImg(inner[k]); }
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    var entering = false;
    try { entering = sessionStorage.getItem('cp_swipe') === '1'; sessionStorage.removeItem('cp_swipe'); } catch (e) { /* ignore */ }
    if (entering && !reduceMotion) swipeReveal(); else document.documentElement.classList.remove('fx-entering');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
