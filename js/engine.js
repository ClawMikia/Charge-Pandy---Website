/* Charge / Shield / Boom duel engine - exact port of GameEngine.kt */
(function () {
  'use strict';
  var MAX_CHARGE = 4, MAX_LIVES = 3, WINS_NEEDED = 2;

  /* cost = charges spent; tier: 0 not an attack, 1 Boom (blocked by Shield),
     2 Double Boom (pierces Shield), 3 Ultimate (unblockable) */
  var MOVES = {
    charge:     { id: 'charge',     label: 'Charge',      cost: 0, tier: 0, pose: 'charge', sfx: 'move_charge',   emoji: '\u26A1',       costText: 'free' },
    shield:     { id: 'shield',     label: 'Shield',      cost: 0, tier: 0, pose: 'shield', sfx: 'move_shield',   emoji: '\uD83D\uDEE1', costText: 'free' },
    boom:       { id: 'boom',       label: 'Boom',        cost: 1, tier: 1, pose: 'boom',   sfx: 'move_boom',     emoji: '\uD83D\uDD2B', costText: '1 charge' },
    doubleBoom: { id: 'doubleBoom', label: 'Double Boom', cost: 2, tier: 2, pose: 'boom',   sfx: 'move_double',   emoji: '\uD83D\uDCA5', costText: '2 charges' },
    reflect:    { id: 'reflect',    label: 'Reflect',     cost: 1, tier: 0, pose: 'shield', sfx: 'move_reflect',  emoji: '\uD83C\uDF00', costText: '1 charge' },
    ultimate:   { id: 'ultimate',   label: 'Ultimate',    cost: 3, tier: 3, pose: 'boom',   sfx: 'move_ultimate', emoji: '\u2604',       costText: '3 charges' }
  };
  var ORDER = ['charge', 'shield', 'boom', 'doubleBoom', 'reflect', 'ultimate'];

  function isAttack(id) { return MOVES[id].tier > 0; }

  function isLegal(id, charge) {
    if (id === 'charge' && charge >= MAX_CHARGE) return false;
    return charge >= MOVES[id].cost;
  }

  function attackLands(tier, defenderId) {
    if (defenderId === 'reflect') return false;
    switch (tier) {
      case 1: return defenderId !== 'shield';
      case 2:
      case 3: return true;
      default: return false;
    }
  }

  /* Resolves one simultaneous exchange. Mutates player / cpu ({charge, lives}). */
  function resolve(player, cpu, pm, cm) {
    player.charge -= MOVES[pm].cost;
    cpu.charge -= MOVES[cm].cost;
    var dmgPlayer = 0, dmgCpu = 0;
    var cpuReflects = cm === 'reflect' && isAttack(pm);
    var playerReflects = pm === 'reflect' && isAttack(cm);
    if (cpuReflects) dmgPlayer += 1;
    if (playerReflects) dmgCpu += 1;
    if (isAttack(pm) && cm !== 'reflect') { if (attackLands(MOVES[pm].tier, cm)) dmgCpu += 1; }
    if (isAttack(cm) && pm !== 'reflect') { if (attackLands(MOVES[cm].tier, pm)) dmgPlayer += 1; }
    if (pm === 'charge') player.charge = Math.min(player.charge + 1, MAX_CHARGE);
    if (cm === 'charge') cpu.charge = Math.min(cpu.charge + 1, MAX_CHARGE);
    player.lives = Math.max(player.lives - dmgPlayer, 0);
    cpu.lives = Math.max(cpu.lives - dmgCpu, 0);
    return { damageToPlayer: dmgPlayer, damageToCpu: dmgCpu, playerReflected: playerReflects, cpuReflected: cpuReflects };
  }

  /* Weighted-random CPU move from its own banked charge. */
  function chooseCpuMove(charge) {
    var pairs = [['shield', 3.0]];
    if (charge < MAX_CHARGE) pairs.push(['charge', charge === 0 ? 5.0 : 3.0]);
    if (charge >= 1) { pairs.push(['boom', 3.0]); pairs.push(['reflect', 1.6]); }
    if (charge >= 2) pairs.push(['doubleBoom', 2.0]);
    if (charge >= 3) pairs.push(['ultimate', 1.4]);
    var total = 0, i;
    for (i = 0; i < pairs.length; i++) total += pairs[i][1];
    var r = Math.random() * total;
    for (i = 0; i < pairs.length; i++) {
      if (r < pairs[i][1]) return pairs[i][0];
      r -= pairs[i][1];
    }
    return pairs[pairs.length - 1][0];
  }

  window.CP = window.CP || {};
  window.CP.engine = {
    MAX_CHARGE: MAX_CHARGE, MAX_LIVES: MAX_LIVES, WINS_NEEDED: WINS_NEEDED,
    MOVES: MOVES, ORDER: ORDER, isAttack: isAttack, isLegal: isLegal, resolve: resolve, chooseCpuMove: chooseCpuMove
  };
})();
