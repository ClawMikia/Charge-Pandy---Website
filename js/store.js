/* Data layer: player stats, achievements, quests, medals and match history,
   saved in localStorage (same tables / rules as the Room database). */
(function () {
  'use strict';
  var KEY = 'cp_db_v1';
  var EXP_PER_LEVEL = 500;
  var db = null;
  var memory = null; // fallback if localStorage is unavailable

  function freshStats() {
    return { level: 1, exp: 0, totalWins: 0, totalLosses: 0, totalMatchesPlayed: 0, perfectWins: 0, ultimateFinishes: 0 };
  }

  function buildMedals() {
    var list = [];
    for (var i = 1; i <= 30; i++) {
      var tier = i <= 10 ? 'Bronze' : i <= 20 ? 'Silver' : i <= 25 ? 'Gold' : 'Platinum';
      var icon = i <= 20 ? 'pandy' + i + '_boom' : 'pandy' + (i - 10) + '_shield';
      list.push({ id: 'm' + i, name: 'Medal ' + i, description: 'Special recognition for feat ' + i,
        tier: tier, icon: icon, isEarned: false, earnedTimestamp: null });
    }
    return list;
  }

  function buildFresh() {
    var seed = window.CP_SEED;
    return {
      stats: freshStats(),
      achievements: seed.achievements.map(function (a) {
        return { id: a.id, title: a.title, description: a.description, icon: a.icon, isUnlocked: false, unlockedTimestamp: null };
      }),
      quests: seed.quests.map(function (q) {
        return { id: q.id, title: q.title, description: q.description, type: q.type, currentProgress: 0,
          targetProgress: q.target, isCompleted: false, expReward: q.reward, icon: q.icon };
      }),
      medals: buildMedals(),
      history: []
    };
  }

  function save() {
    var text = JSON.stringify(db);
    try { localStorage.setItem(KEY, text); } catch (e) { memory = text; }
  }

  function load() {
    var text = null;
    try { text = localStorage.getItem(KEY); } catch (e) { text = memory; }
    try { db = text ? JSON.parse(text) : null; } catch (e) { db = null; }
    if (!db || !db.achievements || !db.achievements.length || !db.quests || !db.medals) {
      db = buildFresh();
      save();
    }
    if (!db.history) db.history = [];
  }

  function sound(name, delay) {
    if (window.CP && window.CP.sound) window.CP.sound.play(name, { delay: delay });
  }

  load();

  window.CP = window.CP || {};
  window.CP.store = {
    EXP_PER_LEVEL: EXP_PER_LEVEL,
    stats: function () { return db.stats; },
    achievements: function () { return db.achievements; },
    quests: function () { return db.quests; },
    medals: function () { return db.medals; },
    matchesPlayed: function () { return db.history.length; },
    matchesWon: function () { return db.history.filter(function (m) { return m.playerWon; }).length; },

    updateStats: function (fn) { fn(db.stats); save(); },

    /* Same unlock rules as GamificationRepository.evaluateAchievements */
    evaluateAchievements: function () {
      var s = db.stats, any = false;
      db.achievements.forEach(function (a) {
        if (a.isUnlocked) return;
        var ok = false;
        switch (a.id) {
          case 'a1': ok = s.totalMatchesPlayed >= 1; break;
          case 'a2': ok = s.totalWins >= 1; break;
          case 'a21': ok = s.totalMatchesPlayed >= 100; break;
          case 'a23': ok = s.totalWins >= 50; break;
          case 'a28': ok = s.exp >= 1000; break;
          case 'a29': ok = s.level >= 50; break;
          case 'a30': ok = db.achievements.every(function (x) { return x.id === 'a30' || x.isUnlocked; }); break;
        }
        if (ok) { a.isUnlocked = true; a.unlockedTimestamp = Date.now(); any = true; }
      });
      save();
      if (any) sound('achievement', 1800);
    },

    incrementQuest: function (type, amount) {
      amount = amount || 1;
      var any = false;
      db.quests.forEach(function (q) {
        if (q.isCompleted || q.type !== type) return;
        var next = q.currentProgress + amount;
        var done = next >= q.targetProgress;
        q.currentProgress = Math.min(next, q.targetProgress);
        q.isCompleted = done;
        if (done) { any = true; db.stats.exp += q.expReward; }
      });
      save();
      if (any) sound('quest', 700);
    },

    /* Same tier thresholds as GamificationRepository.evaluateMedals */
    evaluateMedals: function () {
      var wins = db.stats.totalWins, any = false;
      db.medals.forEach(function (m) {
        if (m.isEarned) return;
        var idx = parseInt(m.id.substring(1), 10);
        if (isNaN(idx)) return;
        var ok = false;
        if (m.tier === 'Bronze') ok = wins >= idx;
        else if (m.tier === 'Silver') ok = wins >= 10 + idx;
        else if (m.tier === 'Gold') ok = wins >= 20 + (idx - 20) * 11;
        else if (m.tier === 'Platinum') ok = wins >= 25 + (idx - 25) * 50;
        if (ok) { m.isEarned = true; m.earnedTimestamp = Date.now(); any = true; }
      });
      save();
      if (any) sound('medal', 2600);
    },

    recordMatch: function (rec) {
      db.history.push({ timestamp: Date.now(), playerCharacterName: rec.playerCharacterName,
        cpuCharacterName: rec.cpuCharacterName, playerWon: rec.playerWon,
        playerRoundsWon: rec.playerRoundsWon, cpuRoundsWon: rec.cpuRoundsWon });
      save();
    },

    resetAll: function () { db = buildFresh(); save(); }
  };
})();
