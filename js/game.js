/* =========================================================
   CHARGE-PANDY — game.js
   Full match engine for the Charge / Shield / Boom duel.
   ========================================================= */
(function(){
  const roster = window.CP_ROSTER || [];

  const MAX_CHARGE = 4;
  const MAX_LIVES = 3;
  const WINS_NEEDED = 2;

  const COST = { charge:0, shield:0, boom:1, dboom:2, reflect:1, ultimate:3 };
  const TIER = { charge:0, shield:0, boom:1, dboom:2, ultimate:3, reflect:0 };
  const POSE_FOR = { charge:'charge', shield:'shield', reflect:'shield', boom:'boom', dboom:'boom', ultimate:'boom' };

  const MOVE_LABEL = {
    charge:'Charge', shield:'Shield', boom:'Boom',
    dboom:'Double Boom', reflect:'Reflect', ultimate:'Ultimate'
  };

  // ---------------- state ----------------
  const S = {
    player: { char:null, charge:0, lives:MAX_LIVES },
    cpu: { char:null, charge:0, lives:MAX_LIVES },
    round: 1,
    score: { player:0, cpu:0 },
    armedMove: null,
    phase: 'select', // select | beat | resolve | roundover | matchover
  };

  // ---------------- dom refs ----------------
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));

  const selectScrim = el('#selectScrim');
  const selectGrid = el('#selectGrid');
  const selectPreviewImg = el('#selectPreviewImg');
  const selectPreviewTag = el('#selectPreviewTag');
  const confirmSelect = el('#confirmSelect');
  const cpuRollImg = el('#cpuRollImg');
  const cpuRollTag = el('#cpuRollTag');
  const cpuRollPortrait = el('#cpuRoll .cpu-roll-portrait');

  const resultScrim = el('#resultScrim');
  const resultEyebrow = el('#resultEyebrow');
  const resultTitle = el('#resultTitle');
  const resultBody = el('#resultBody');
  const resultContinue = el('#resultContinue');

  const hudPlayerName = el('#hudPlayerName');
  const hudCpuName = el('#hudCpuName');
  const hudPlayerLives = el('#hudPlayerLives');
  const hudCpuLives = el('#hudCpuLives');
  const hudPlayerCharge = el('#hudPlayerCharge');
  const hudCpuCharge = el('#hudCpuCharge');
  const roundTag = el('#roundTag');

  const playerSprite = el('#playerSprite');
  const cpuSprite = el('#cpuSprite');
  const fighterPlayer = el('#fighterPlayer');
  const fighterCpu = el('#fighterCpu');
  const fxLayer = el('#fxLayer');

  const feedLine = el('#feedLine');
  const beatDots = els('.beat-dot');
  const beatWord = el('#beatWord');

  const controls = el('#controls');
  const moveButtons = els('.move-btn');

  let cpuRollTimer = null;
  let pendingPlayerPick = null;

  // ---------------- helpers ----------------
  const rand = (n) => Math.floor(Math.random()*n);
  const pick = (arr) => arr[rand(arr.length)];

  function weightedPick(pairs){
    const total = pairs.reduce((s,p)=>s+p[1],0);
    let r = Math.random()*total;
    for(const [val,w] of pairs){ if(r < w) return val; r -= w; }
    return pairs[pairs.length-1][0];
  }

  function buildLivesIcons(container, lives){
    container.innerHTML = '';
    for(let i=0;i<MAX_LIVES;i++){
      const d = document.createElement('div');
      d.className = 'life' + (i >= lives ? ' lost' : '');
      container.appendChild(d);
    }
  }

  function buildChargeMeter(container, charge){
    container.innerHTML = '';
    for(let i=0;i<MAX_CHARGE;i++){
      const d = document.createElement('div');
      d.className = 'cell' + (i < charge ? ' filled' : '');
      container.appendChild(d);
    }
  }
  function els2(sel, root){ return Array.from(root.querySelectorAll(sel)); }
  // fix buildChargeMeter helper usage
  function syncHud(){
    buildLivesIcons(hudPlayerLives, S.player.lives);
    buildLivesIcons(hudCpuLives, S.cpu.lives);
    buildChargeMeter(hudPlayerCharge, S.player.charge);
    buildChargeMeter(hudCpuCharge, S.cpu.charge);
    hudPlayerName.textContent = S.player.char ? S.player.char.name : '— select fighter —';
    hudCpuName.textContent = S.cpu.char ? S.cpu.char.name : '— CPU —';
    roundTag.textContent = `ROUND ${S.round} · YOU ${S.score.player} – ${S.score.cpu} CPU`;
  }

  function setFeed(text, cls){
    feedLine.textContent = text;
    feedLine.className = 'feed-line' + (cls ? ' '+cls : '');
  }

  function setSprite(imgEl, character, moveOrPose){
    if(!character) return;
    const poseKey = POSE_FOR[moveOrPose] || moveOrPose;
    imgEl.src = character.poses[poseKey];
  }

  function updateControlsAvailability(){
    moveButtons.forEach(btn=>{
      const move = btn.dataset.move;
      const cost = COST[move];
      const legal = S.player.charge >= cost && !(move==='charge' && S.player.charge >= MAX_CHARGE);
      btn.disabled = !legal || S.phase !== 'beat';
    });
  }

  function armMove(move){
    if(S.phase !== 'beat') return;
    const btn = moveButtons.find(b=>b.dataset.move===move);
    if(!btn || btn.disabled) return;
    S.armedMove = move;
    moveButtons.forEach(b=>b.classList.toggle('selected', b.dataset.move===move));
  }

  // ---------------- FX ----------------
  function fx(el){ fxLayer.appendChild(el); setTimeout(()=>el.remove(), 700); }

  function fxBolt(direction){
    const d = document.createElement('div');
    d.className = 'fx-bolt ' + (direction==='toCpu' ? 'to-cpu' : 'to-player');
    fx(d);
  }
  function fxShield(who){
    const d = document.createElement('div');
    d.className = 'fx-shield-ring ' + who;
    fx(d);
  }
  function fxCharge(who){
    const d = document.createElement('div');
    d.className = 'fx-charge-ring ' + who;
    fx(d);
  }
  function fxUltimate(side){
    const d = document.createElement('div');
    d.className = 'fx-ult';
    d.style.setProperty('--ox', side==='player' ? '22%' : '78%');
    fx(d);
  }
  function hitFlash(fighterEl){
    const flash = fighterEl.querySelector('.hit-flash');
    flash.classList.remove('show'); void flash.offsetWidth;
    flash.classList.add('show');
    fighterEl.classList.add('knockback');
    setTimeout(()=>fighterEl.classList.remove('knockback'), 220);
  }

  // ---------------- CPU AI ----------------
  function cpuChooseMove(){
    const c = S.cpu.charge;
    const pairs = [];
    pairs.push(['shield', 3]);
    if(c < MAX_CHARGE) pairs.push(['charge', c===0 ? 5 : 3]);
    if(c >= 1){ pairs.push(['boom', 3]); pairs.push(['reflect', 1.6]); }
    if(c >= 2) pairs.push(['dboom', 2]);
    if(c >= 3) pairs.push(['ultimate', 1.4]);
    return weightedPick(pairs);
  }

  // ---------------- resolution ----------------
  function attackLands(attackTier, defenderMove){
    if(defenderMove === 'reflect') return false;
    if(attackTier === 1) return defenderMove !== 'shield';
    if(attackTier >= 2) return true;
    return false;
  }

  function resolveRound(pMove, cMove){
    S.phase = 'resolve';
    updateControlsAvailability();

    // pay costs
    S.player.charge -= COST[pMove];
    S.cpu.charge -= COST[cMove];

    const pTier = TIER[pMove];
    const cTier = TIER[cMove];
    let dmgPlayer = 0, dmgCpu = 0;
    const notes = [];

    const cReflectsPlayer = cMove === 'reflect' && pTier > 0;
    const pReflectsCpu = pMove === 'reflect' && cTier > 0;

    if(cReflectsPlayer){ dmgPlayer += 1; notes.push(`${S.cpu.char.name} reflects it back!`); }
    if(pReflectsCpu){ dmgCpu += 1; notes.push(`${S.player.char.name} reflects it back!`); }

    if(pTier > 0 && cMove !== 'reflect'){
      if(attackLands(pTier, cMove)) dmgCpu += 1;
    }
    if(cTier > 0 && pMove !== 'reflect'){
      if(attackLands(cTier, pMove)) dmgPlayer += 1;
    }

    if(pMove === 'charge') S.player.charge = Math.min(MAX_CHARGE, S.player.charge + 1);
    if(cMove === 'charge') S.cpu.charge = Math.min(MAX_CHARGE, S.cpu.charge + 1);

    S.player.lives = Math.max(0, S.player.lives - dmgPlayer);
    S.cpu.lives = Math.max(0, S.cpu.lives - dmgCpu);

    // ---- visuals ----
    setSprite(playerSprite, S.player.char, pMove);
    setSprite(cpuSprite, S.cpu.char, cMove);

    if(pMove === 'charge') fxCharge('player');
    if(cMove === 'charge') fxCharge('cpu');
    if(pMove === 'shield') fxShield('player');
    if(cMove === 'shield') fxShield('cpu');
    if(pMove === 'reflect') fxShield('player');
    if(cMove === 'reflect') fxShield('cpu');
    if(pTier === 3) fxUltimate('player');
    if(cTier === 3) fxUltimate('cpu');
    if(pTier > 0 && pTier < 3) fxBolt('toCpu');
    if(cTier > 0 && cTier < 3) fxBolt('toPlayer');
    if(dmgCpu > 0) hitFlash(fighterCpu);
    if(dmgPlayer > 0) hitFlash(fighterPlayer);
    if(S.cpu.lives <= 0) fighterCpu.classList.add('eliminated');
    if(S.player.lives <= 0) fighterPlayer.classList.add('eliminated');

    syncHud();

    // ---- feed text ----
    let headline;
    if(dmgPlayer > 0 && dmgCpu > 0){
      headline = `Trade! Both ${MOVE_LABEL[pMove]} into it — both fighters take a hit.`;
    } else if(dmgCpu > 0){
      headline = `${MOVE_LABEL[pMove]} connects! ${S.cpu.char.name} takes a hit.`;
    } else if(dmgPlayer > 0){
      headline = `${S.cpu.char.name} answers with ${MOVE_LABEL[cMove]} — you take a hit.`;
    } else if(pMove === 'shield' && cTier > 0){
      headline = `Shield holds! ${MOVE_LABEL[cMove]} blocked clean.`;
    } else if(cMove === 'shield' && pTier > 0){
      headline = `${S.cpu.char.name} shields — your ${MOVE_LABEL[pMove]} is stopped cold.`;
    } else if(pMove === 'charge' && cMove === 'charge'){
      headline = `Both fighters charge up. Tension builds.`;
    } else {
      headline = `${MOVE_LABEL[pMove]} vs ${MOVE_LABEL[cMove]} — no one lands a hit.`;
    }
    if(notes.length) headline += ' ' + notes.join(' ');
    setFeed(headline, (dmgPlayer||dmgCpu) ? 'hot' : 'good');

    setTimeout(()=> afterResolve(), 900);
  }

  function afterResolve(){
    if(S.player.lives <= 0 || S.cpu.lives <= 0){
      endRound();
    } else {
      S.phase = 'idle';
      setTimeout(()=> startBeat(), 700);
    }
  }

  function endRound(){
    S.phase = 'roundover';
    const playerWon = S.cpu.lives <= 0 && S.player.lives > 0;
    const tie = S.cpu.lives <= 0 && S.player.lives <= 0;
    if(playerWon) S.score.player++;
    else if(!tie) S.score.cpu++;
    else { S.score.player++; S.score.cpu++; } // simultaneous KO: both get a point, rare edge case

    const matchDone = S.score.player >= WINS_NEEDED || S.score.cpu >= WINS_NEEDED;

    resultEyebrow.textContent = matchDone ? 'Match Point' : `Round ${S.round} Result`;
    if(matchDone){
      const playerTakesMatch = S.score.player > S.score.cpu;
      resultTitle.textContent = playerTakesMatch ? 'MATCH WON' : 'MATCH LOST';
      resultTitle.className = playerTakesMatch ? 'text-blue' : 'text-orange';
      resultBody.textContent = playerTakesMatch
        ? `${S.player.char.name} takes the match ${S.score.player}–${S.score.cpu}. GG.`
        : `${S.cpu.char.name} takes the match ${S.score.cpu}–${S.score.player}. Run it back?`;
      resultContinue.textContent = 'New Match';
      S.phase = 'matchover';
    } else {
      resultTitle.textContent = tie ? 'DOUBLE KNOCKOUT' : (playerWon ? 'ROUND WON' : 'ROUND LOST');
      resultTitle.className = playerWon ? 'text-blue' : 'text-orange';
      resultBody.textContent = tie
        ? `Both fighters dropped in the same exchange. Round shared — on to round ${S.round+1}.`
        : `${playerWon ? S.player.char.name : S.cpu.char.name} takes round ${S.round}. Score: YOU ${S.score.player} – ${S.score.cpu} CPU.`;
      resultContinue.textContent = 'Next Round';
    }
    openResult();
  }

  function openResult(){ resultScrim.classList.add('show'); }
  function closeResult(){ resultScrim.classList.remove('show'); }

  resultContinue.addEventListener('click', () => {
    closeResult();
    if(S.phase === 'matchover'){
      resetMatch(true);
      openSelectModal();
    } else {
      S.round++;
      S.player.lives = MAX_LIVES; S.cpu.lives = MAX_LIVES;
      S.player.charge = 0; S.cpu.charge = 0;
      fighterPlayer.classList.remove('eliminated');
      fighterCpu.classList.remove('eliminated');
      setSprite(playerSprite, S.player.char, 'shield');
      setSprite(cpuSprite, S.cpu.char, 'shield');
      syncHud();
      setFeed(`Round ${S.round} — clap it up.`);
      setTimeout(()=> startBeat(), 500);
    }
  });

  // ---------------- beat sequence ----------------
  function startBeat(){
    if(S.phase === 'matchover') return;
    S.phase = 'beat';
    S.armedMove = null;
    moveButtons.forEach(b=>b.classList.remove('selected'));
    updateControlsAvailability();
    beatDots.forEach(d=>d.classList.remove('active'));
    beatWord.textContent = 'READY';
    beatWord.classList.remove('go');

    setTimeout(()=>{ beatDots[0].classList.add('active'); beatWord.textContent = 'CLAP'; }, 350);
    setTimeout(()=>{ beatDots[1].classList.add('active'); beatWord.textContent = 'CLAP'; }, 900);
    setTimeout(()=>{
      beatWord.textContent = 'GO';
      beatWord.classList.add('go');
      const pMove = S.armedMove || 'shield';
      const cMove = cpuChooseMove();
      resolveRound(pMove, cMove);
    }, 1450);
  }

  moveButtons.forEach(btn=>{
    btn.addEventListener('click', ()=> armMove(btn.dataset.move));
  });

  // ---------------- match lifecycle ----------------
  function resetMatch(fullReset){
    S.round = 1;
    S.score = { player:0, cpu:0 };
    S.player.lives = MAX_LIVES; S.cpu.lives = MAX_LIVES;
    S.player.charge = 0; S.cpu.charge = 0;
    fighterPlayer.classList.remove('eliminated');
    fighterCpu.classList.remove('eliminated');
    S.phase = 'select';
    syncHud();
  }

  function startMatch(){
    setSprite(playerSprite, S.player.char, 'shield');
    setSprite(cpuSprite, S.cpu.char, 'shield');
    syncHud();
    setFeed('First exchange — clap it up.');
    setTimeout(()=> startBeat(), 500);
  }

  // ---------------- character select modal ----------------
  function buildSelectGrid(){
    selectGrid.innerHTML = roster.map(c => `
      <div class="select-card" data-id="${c.id}" tabindex="0" role="button" aria-label="Pick ${c.name}">
        <img src="${c.poses.charge}" alt="${c.name}" loading="lazy">
        <div class="sc-tag">${c.tag}</div>
      </div>
    `).join('');

    els2('.select-card', selectGrid).forEach(card=>{
      const choose = () => {
        els2('.select-card', selectGrid).forEach(c=>c.classList.remove('picked'));
        card.classList.add('picked');
        const id = Number(card.dataset.id);
        pendingPlayerPick = roster.find(r=>r.id===id);
        selectPreviewImg.src = pendingPlayerPick.poses.charge;
        selectPreviewTag.textContent = pendingPlayerPick.name;
        confirmSelect.disabled = false;
      };
      card.addEventListener('click', choose);
      card.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); choose(); } });
    });
  }

  function startCpuRoll(){
    cpuRollPortrait.classList.add('rolling');
    cpuRollTag.textContent = 'rolling…';
    cpuRollTimer = setInterval(()=>{
      const c = pick(roster);
      cpuRollImg.src = c.poses.charge;
    }, 90);
  }

  function stopCpuRollAndLock(){
    clearInterval(cpuRollTimer);
    cpuRollPortrait.classList.remove('rolling');
    const c = pick(roster);
    cpuRollImg.src = c.poses.charge;
    cpuRollTag.textContent = c.name;
    return c;
  }

  function openSelectModal(){
    pendingPlayerPick = null;
    confirmSelect.disabled = true;
    buildSelectGrid();
    selectPreviewImg.src = 'assets/pandys/pandy1_charge.png';
    selectPreviewTag.textContent = 'Pick a fighter';
    startCpuRoll();
    selectScrim.classList.add('show');
  }
  function closeSelectModal(){ selectScrim.classList.remove('show'); }

  confirmSelect.addEventListener('click', () => {
    if(!pendingPlayerPick) return;
    confirmSelect.disabled = true;
    confirmSelect.textContent = 'Rolling CPU…';
    setTimeout(()=>{
      const cpuChar = stopCpuRollAndLock();
      setTimeout(()=>{
        S.player.char = pendingPlayerPick;
        S.cpu.char = cpuChar;
        closeSelectModal();
        confirmSelect.textContent = 'Confirm & Fight';
        confirmSelect.disabled = false;
        resetMatch();
        startMatch();
      }, 650);
    }, 500);
  });

  el('#openSelect').addEventListener('click', openSelectModal);
  el('#restartMatch').addEventListener('click', () => {
    if(!S.player.char) return;
    resetMatch();
    startMatch();
  });

  document.addEventListener('DOMContentLoaded', () => {
    syncHud();
    openSelectModal();
  });
})();
