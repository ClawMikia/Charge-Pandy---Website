/* Play page: character select + the duel (port of PlayViewModel / PlayFragment). */
(function () {
  'use strict';
  var CP = window.CP, E = CP.engine, store = CP.store, snd = CP.sound;
  var $ = function (id) { return document.getElementById(id); };
  var sleep = CP.sleep;
  var spriteRaw = CP.spriteRaw || CP.sprite; // un-recoloured sprites (picker grid + CPU)

  var selectView = $('selectView'), duelView = $('duelView');

  /* ===================================================================
     SELECT SCREEN
     =================================================================== */
  var roster = CP.roster;
  var cursor = 0, cursorActive = false;
  var pending = null, busy = false;
  var rollTimer = null, cpuShown = roster[Math.floor(Math.random() * roster.length)], cpuText = 'rolling\u2026';
  var COLS = 5;

  var pickGrid = $('pickGrid'), preview = $('preview'), cpuCard = $('cpuCard'), btnConfirm = $('btnConfirm');

  function buildGrid() {
    pickGrid.innerHTML = '';
    roster.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'pick cut sm';
      b.setAttribute('aria-label', c.name);
      b.innerHTML = '<img src="' + spriteRaw(c, 'charge') + '" alt=""><div class="tag">' + c.tag + '</div>';
      b.addEventListener('click', function () {
        if (busy) return;
        cursor = i; cursorActive = false;
        pick(c);
      });
      pickGrid.appendChild(b);
    });
  }

  function renderSelect() {
    Array.prototype.forEach.call(pickGrid.children, function (b, i) {
      b.classList.toggle('picked', !!pending && pending.id === roster[i].id);
      b.classList.toggle('cursor', cursorActive && i === cursor);
    });
    if (pending) {
      preview.innerHTML = '<img src="' + CP.sprite(pending, 'charge') + '" alt=""><div class="nm">' + pending.name + '</div>';
    } else {
      preview.innerHTML = '<div class="nm">Choose your fighter to begin.</div>';
    }
    renderCpu();
    btnConfirm.disabled = !pending || busy;
    btnConfirm.innerHTML = (busy ? 'Rolling CPU\u2026' : 'Confirm &amp; Fight') + ' <span class="kbd">Enter</span>';
  }

  function renderCpu() {
    cpuCard.innerHTML = '<img src="' + spriteRaw(cpuShown, 'charge') + '" alt="">' +
      '<div><div class="t">CPU OPPONENT</div><div class="n">' + cpuText + '</div></div>';
  }

  function startRoll() {
    stopRoll();
    cpuText = 'rolling\u2026';
    rollTimer = setInterval(function () {
      cpuShown = roster[Math.floor(Math.random() * roster.length)];
      var img = cpuCard.querySelector('img');
      if (img) img.src = spriteRaw(cpuShown, 'charge'); else renderCpu();
    }, 90);
  }
  function stopRoll() { if (rollTimer) { clearInterval(rollTimer); rollTimer = null; } }

  function pick(c) {
    if (busy) return;
    snd.play('pick');
    pending = c;
    cursor = roster.indexOf(c);
    renderSelect();
  }

  async function confirmPick() {
    if (!pending || busy) return;
    snd.play('confirm');
    busy = true; renderSelect();
    await sleep(500);
    stopRoll();
    var cpuPick = CP.randomFighter();
    snd.play('reveal');
    cpuShown = cpuPick; cpuText = cpuPick.name;
    renderSelect();
    await sleep(650);
    busy = false;
    startMatch(pending, cpuPick);
    showDuel();
  }

  function moveCursor(i) {
    i = Math.max(0, Math.min(roster.length - 1, i));
    cursorActive = true;
    if (i === cursor) { renderSelect(); return; }
    snd.play('arm', { gain: 0.7 });
    cursor = i;
    renderSelect();
  }

  function showSelect() {
    G.gen++; // cancel any running beat loop
    pending = null; busy = false; cursor = 0; cursorActive = false;
    selectView.hidden = false; duelView.hidden = true;
    startRoll();
    renderSelect();
  }

  btnConfirm.addEventListener('click', confirmPick);
  $('btnBack').addEventListener('click', function (e) { e.preventDefault(); if (!busy) CP.go('index.html'); });

  /* ===================================================================
     DUEL STATE
     =================================================================== */
  var G = {
    gen: 0, phase: 'select', player: null, cpu: null,
    p: { charge: 0, lives: E.MAX_LIVES }, c: { charge: 0, lives: E.MAX_LIVES },
    round: 1, pScore: 0, cScore: 0,
    beat: 'idle', armed: null, legal: {}, feed: '', pPose: 'shield', cPose: 'shield'
  };

  var dock = $('dock');
  var imgP = $('imgP'), imgC = $('imgC'), spriteP = $('spriteP'), spriteC = $('spriteC'), ultFlash = $('ultFlash');

  function buildDock() {
    dock.innerHTML = '';
    E.ORDER.forEach(function (id, i) {
      var m = E.MOVES[id];
      var b = document.createElement('button');
      b.className = 'move cut';
      b.setAttribute('data-move', id);
      b.setAttribute('data-keepfocus', '');
      b.innerHTML = '<span class="kbd">' + (i + 1) + '</span><span class="em">' + m.emoji + '</span>' +
        '<span class="nm">' + m.label + '</span><span class="cost">' + m.costText + '</span>';
      b.addEventListener('click', function () { arm(id); });
      dock.appendChild(b);
    });
  }

  var LIFE_SVG = '<svg class="life{L}" viewBox="0 0 16 16"><polygon points="8,0 16,6.1 13.1,16 2.9,16 0,6.1"/></svg>';
  function lifeHtml(n) {
    var out = '';
    for (var i = 0; i < E.MAX_LIVES; i++) out += LIFE_SVG.replace('{L}', i < n ? '' : ' lost');
    return out;
  }
  function chargeHtml(n) {
    var out = '';
    for (var i = 0; i < E.MAX_CHARGE; i++) out += '<span class="charge' + (i < n ? ' on' : '') + '"></span>';
    return out;
  }
  function setSrc(img, src) { if (img.getAttribute('src') !== src) img.setAttribute('src', src); }

  function render() {
    $('pName').textContent = G.player ? G.player.name : '- select fighter -';
    $('cName').textContent = G.cpu ? G.cpu.name : '- CPU -';
    $('pLives').innerHTML = lifeHtml(G.p.lives);
    $('cLives').innerHTML = lifeHtml(G.c.lives);
    $('pCharges').innerHTML = chargeHtml(G.p.charge);
    $('cCharges').innerHTML = chargeHtml(G.c.charge);
    $('scoreLine').textContent = 'ROUND ' + G.round + ' \u00B7 YOU ' + G.pScore + ' \u2013 ' + G.cScore + ' CPU';
    var b = G.beat;
    $('dot1').classList.toggle('on', b === 'clap1' || b === 'clap2' || b === 'go');
    $('dot2').classList.toggle('on', b === 'clap2' || b === 'go');
    $('beatWord').textContent = (b === 'clap1' || b === 'clap2') ? 'CLAP' : b === 'go' ? 'GO' : 'READY';
    if (G.player) setSrc(imgP, CP.sprite(G.player, G.pPose));
    if (G.cpu) setSrc(imgC, spriteRaw(G.cpu, G.cPose));
    $('feed').textContent = G.feed;

    var canPick = G.phase === 'beat';
    Array.prototype.forEach.call(dock.children, function (btn) {
      var id = btn.getAttribute('data-move');
      btn.disabled = !(canPick && G.legal[id]);
      btn.classList.toggle('armed', G.armed === id);
    });
  }

  function restartAnim(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function arm(id) {
    if (G.phase !== 'beat') return;
    if (!G.legal[id]) { snd.play('denied'); return; }
    if (G.armed !== id) snd.play('arm');
    G.armed = id;
    render();
  }

  function showDuel() {
    selectView.hidden = true; duelView.hidden = false;
    if (window.CPFX) CPFX.flash();
    stopRoll();
    render();
  }

  /* ---- match flow ---- */
  function startMatch(pp, cp) {
    G.gen++;
    G.player = pp; G.cpu = cp;
    G.round = 1; G.pScore = 0; G.cScore = 0;
    G.p.charge = 0; G.p.lives = E.MAX_LIVES;
    G.c.charge = 0; G.c.lives = E.MAX_LIVES;
    snd.play('match_start');
    emitIdle('First exchange \u2014 clap it up.');
    runBeat();
  }

  function emitIdle(feed) {
    G.phase = 'idle'; G.feed = feed;
    G.pPose = 'shield'; G.cPose = 'shield';
    G.beat = 'idle'; G.armed = null; G.legal = {};
    render();
  }

  function runBeat() {
    startBeat().catch(function (err) { if (window.console) console.error('Beat loop error', err); });
  }

  async function startBeat() {
    var gen = ++G.gen;
    G.armed = null; G.legal = {};
    E.ORDER.forEach(function (id) { if (E.isLegal(id, G.p.charge)) G.legal[id] = true; });
    G.phase = 'beat'; G.beat = 'ready';
    render();

    await sleep(350); if (gen !== G.gen) return;
    G.beat = 'clap1'; snd.play('beat1'); render();

    await sleep(550); if (gen !== G.gen) return;
    G.beat = 'clap2'; snd.play('beat2'); render();

    await sleep(550); if (gen !== G.gen) return;
    G.beat = 'go'; snd.play('go'); render();

    var pm = G.armed || 'shield';
    var cm = E.chooseCpuMove(G.c.charge);
    await resolveExchange(gen, pm, cm);
  }

  async function resolveExchange(gen, pm, cm) {
    var out = E.resolve(G.p, G.c, pm, cm);

    // gamification: EXP for making a move + action quests
    store.updateStats(function (s) { s.exp += 5; });
    switch (pm) {
      case 'boom': store.incrementQuest('boom'); break;
      case 'doubleBoom': store.incrementQuest('doubleBoom'); break;
      case 'ultimate': store.incrementQuest('ultimate'); break;
      case 'reflect': store.incrementQuest('reflect'); break;
      case 'charge':
        store.incrementQuest('charge');
        if (G.p.charge === E.MAX_CHARGE) store.incrementQuest('maxCharge');
        break;
      case 'shield':
        if (out.damageToPlayer === 0 && E.isAttack(cm)) store.incrementQuest('shield');
        break;
    }
    CP.refreshSidebar();

    playExchangeSounds(pm, cm, out.damageToPlayer, out.damageToCpu);

    // visual reveal
    if (out.damageToCpu > 0) restartAnim(spriteC, 'hit', 400);
    if (out.damageToPlayer > 0) restartAnim(spriteP, 'hit', 400);
    if (pm === 'ultimate' || cm === 'ultimate') restartAnim(ultFlash, 'go', 600);
    if (window.CPFX) CPFX.reveal({ pm: pm, cm: cm, dmgP: out.damageToPlayer, dmgC: out.damageToCpu, spriteP: spriteP, spriteC: spriteC });

    G.phase = 'resolve';
    G.pPose = E.MOVES[pm].pose; G.cPose = E.MOVES[cm].pose;
    G.feed = buildFeed(pm, cm, out.damageToPlayer, out.damageToCpu, out.playerReflected, out.cpuReflected);
    G.legal = {};
    render();

    await sleep(900); if (gen !== G.gen) return;

    if (G.p.lives <= 0 || G.c.lives <= 0) {
      endRound();
    } else {
      G.phase = 'idle';
      render();
      await sleep(700); if (gen !== G.gen) return;
      runBeat();
    }
  }

  function playExchangeSounds(pm, cm, dmgPlayer, dmgCpu) {
    snd.play(E.MOVES[pm].sfx);
    snd.play(E.MOVES[cm].sfx, { delay: 40, gain: 0.65 });
    if (dmgCpu > 0) snd.play('hit_cpu', { delay: 140 });
    if (dmgPlayer > 0) snd.play('hit_player', { delay: 140 });
    var blocked = (pm === 'shield' && cm === 'boom') || (cm === 'shield' && pm === 'boom');
    if (blocked) snd.play('block', { delay: 120 });
  }

  function buildFeed(pm, cm, dmgPlayer, dmgCpu, playerReflected, cpuReflected) {
    var pName = G.player ? G.player.name : '', cName = G.cpu ? G.cpu.name : '';
    var P = E.MOVES[pm], C = E.MOVES[cm];
    var notes = '';
    if (cpuReflected) notes += ' ' + cName + ' reflects it back!';
    if (playerReflected) notes += ' ' + pName + ' reflects it back!';
    var headline;
    if (dmgPlayer > 0 && dmgCpu > 0) headline = 'Trade! Both ' + P.label + ' into it \u2014 both fighters take a hit.';
    else if (dmgCpu > 0) headline = P.label + ' connects! ' + cName + ' takes a hit.';
    else if (dmgPlayer > 0) headline = cName + ' answers with ' + C.label + ' \u2014 you take a hit.';
    else if (pm === 'shield' && E.isAttack(cm)) headline = 'Shield holds! ' + C.label + ' blocked clean.';
    else if (cm === 'shield' && E.isAttack(pm)) headline = cName + ' shields \u2014 your ' + P.label + ' is stopped cold.';
    else if (pm === 'charge' && cm === 'charge') headline = 'Both fighters charge up. Tension builds.';
    else headline = P.label + ' vs ' + C.label + ' \u2014 no one lands a hit.';
    return (headline + notes).trim();
  }

  /* ---- round / match results ---- */
  function endRound() {
    var playerWon = G.c.lives <= 0 && G.p.lives > 0;
    var tie = G.c.lives <= 0 && G.p.lives <= 0;

    if (playerWon && G.p.lives === E.MAX_LIVES) store.incrementQuest('perfect');

    if (tie) { G.pScore++; G.cScore++; }
    else if (playerWon) G.pScore++;
    else G.cScore++;
    var matchDone = G.pScore >= E.WINS_NEEDED || G.cScore >= E.WINS_NEEDED;

    var eyebrow, title, body, label, expGain = 0;
    if (matchDone) {
      var takes = G.pScore > G.cScore;
      snd.play(takes ? 'match_win' : 'match_lose');
      eyebrow = 'Match Point';
      title = takes ? 'MATCH WON' : 'MATCH LOST';
      body = takes
        ? G.player.name + ' takes the match ' + G.pScore + '\u2013' + G.cScore + '. GG.'
        : G.cpu.name + ' takes the match ' + G.cScore + '\u2013' + G.pScore + '. Run it back?';
      label = 'New Match';
      expGain = takes ? 100 : 25;

      var oldLevel = store.stats().level;
      store.updateStats(function (s) {
        s.exp += expGain;
        if (takes) s.totalWins += 1;
        s.totalMatchesPlayed += 1;
        s.level = Math.floor(s.exp / store.EXP_PER_LEVEL) + 1;
      });
      store.evaluateAchievements();
      store.incrementQuest('matches');
      if (takes) store.incrementQuest('wins');
      store.evaluateMedals();
      if (store.stats().level > oldLevel) snd.play('levelup', { delay: 3400 });
      store.recordMatch({
        playerCharacterName: G.player.name, cpuCharacterName: G.cpu.name,
        playerWon: takes, playerRoundsWon: G.pScore, cpuRoundsWon: G.cScore
      });
      CP.refreshSidebar();
    } else {
      snd.play(tie ? 'round_draw' : (playerWon ? 'round_win' : 'round_lose'));
      eyebrow = 'Round ' + G.round + ' Result';
      title = tie ? 'DOUBLE KNOCKOUT' : (playerWon ? 'ROUND WON' : 'ROUND LOST');
      body = tie
        ? 'Both fighters dropped in the same exchange. Round shared \u2014 on to round ' + (G.round + 1) + '.'
        : (playerWon ? G.player.name : G.cpu.name) + ' takes round ' + G.round + '. Score: YOU ' + G.pScore + ' \u2013 ' + G.cScore + ' CPU.';
      label = 'Next Round';
    }

    G.phase = matchDone ? 'matchOver' : 'roundOver';
    render();
    showResult(eyebrow, title, body, label, expGain, matchDone);
  }

  function showResult(eyebrow, title, body, label, expGain, matchDone) {
    var accent = title.indexOf('WON') >= 0 ? 'var(--blue-soft)' : 'var(--orange)';
    CP.dialog.open({
      sound: false,
      html: '<div class="eyebrow">' + eyebrow + '</div><h2 style="color:' + accent + '">' + title + '</h2><p>' + body + '</p>' +
        (expGain > 0 ? '<div class="exp">+' + expGain + ' EXP EARNED</div>' : '') +
        '<div class="actions"><button class="btn" data-act="go" data-autofocus>' + label + ' <span class="kbd">Enter</span></button></div>',
      onEscape: function () { /* the result dialog is not cancelable */ },
      onEnter: function (d) { proceed(d); },
      onOpen: function (el, d) { el.querySelector('[data-act=go]').addEventListener('click', function () { proceed(d); }); }
    });

    function proceed(d) {
      d.close(true);
      if (matchDone) {
        showSelect();
      } else {
        G.round++;
        G.p.charge = 0; G.p.lives = E.MAX_LIVES;
        G.c.charge = 0; G.c.lives = E.MAX_LIVES;
        snd.play('round_start');
        emitIdle('Round ' + G.round + ' \u2014 clap it up.');
        runBeat();
      }
    }
  }

  /* ---- buttons ---- */
  function changeFighter() { snd.play('nav'); showSelect(); }
  function restartMatch() { if (G.player && G.cpu) startMatch(G.player, G.cpu); }

  $('btnChange').addEventListener('click', changeFighter);
  $('btnRestart').addEventListener('click', restartMatch);
  $('btnQuit').addEventListener('click', function (e) { e.preventDefault(); CP.go('index.html'); });

  /* ===================================================================
     KEYBOARD (page layer - global shortcuts live in app.js)
     =================================================================== */
  var DIGITS = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5 };

  CP.onKey(function (e) {
    var k = e.key;
    var inSelect = !selectView.hidden;

    if (e.ctrlKey || e.metaKey) {
      if (!inSelect && (k === 'r' || k === 'R')) { restartMatch(); return true; }
      return false;
    }

    if (inSelect) {
      if (busy) return true; // swallow everything (incl. Esc) while the CPU is rolling
      if (k === 'ArrowRight') { moveCursor(cursor + 1); return true; }
      if (k === 'ArrowLeft') { moveCursor(cursor - 1); return true; }
      if (k === 'ArrowDown') { if (cursor + COLS < roster.length) moveCursor(cursor + COLS); return true; }
      if (k === 'ArrowUp') { if (cursor - COLS >= 0) moveCursor(cursor - COLS); return true; }
      if (k === ' ') { cursorActive = true; pick(roster[cursor]); return true; }
      if (k === 'Enter') {
        var c = roster[cursor];
        if (pending && pending.id === c.id) confirmPick();
        else { cursorActive = true; pick(c); }
        return true;
      }
      return false;
    }

    // duel
    if (Object.prototype.hasOwnProperty.call(DIGITS, k)) { arm(E.ORDER[DIGITS[k]]); return true; }
    if (k === 'f' || k === 'F') { changeFighter(); return true; }
    return false;
  });

  /* ---- boot ---- */
  document.addEventListener('cp-recolor', function () {
    if (!selectView.hidden) renderSelect(); else render();
  });
  buildGrid();
  buildDock();
  showSelect();
})();
