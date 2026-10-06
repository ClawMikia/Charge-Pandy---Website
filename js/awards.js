/* Awards page: summary strip + tabs for achievements, medals and quests. */
(function () {
  'use strict';
  var CP = window.CP, store = CP.store;
  var $ = function (id) { return document.getElementById(id); };
  var tab = 'achievements';

  var st = store.stats();
  $('levelTitle').textContent = 'Level ' + st.level + ' Fighter';
  $('sumLevel').textContent = st.level;
  $('sumWins').textContent = st.totalWins;
  $('sumExp').textContent = st.exp;
  $('sumBar').style.width = Math.min(100, Math.round(((st.exp % store.EXP_PER_LEVEL) / store.EXP_PER_LEVEL) * 100)) + '%';

  var ach = store.achievements(), med = store.medals(), qst = store.quests();
  var earned = med.filter(function (m) { return m.isEarned; }).length;
  $('sumMedals').textContent = earned + ' / ' + med.length;
  $('cntAch').textContent = ach.filter(function (a) { return a.isUnlocked; }).length + '/' + ach.length;
  $('cntMed').textContent = earned + '/' + med.length;
  $('cntQst').textContent = qst.filter(function (q) { return q.isCompleted; }).length + '/' + qst.length;

  function tile(icon, kind, title, desc, extra) {
    return '<div class="award cut sm"><img class="ico" src="' + CP.iconUrl(icon) + '" alt="" style="' + CP.tintStyle(kind) + '">' +
      '<div class="body"><div class="head"><h4>' + title + '</h4>' + (extra && extra.prog ? '<span class="prog">' + extra.prog + '</span>' : '') + '</div>' +
      '<p>' + desc + '</p>' + (extra && extra.bar !== undefined ? '<div class="bar' + (extra.done ? ' done' : '') + '"><i style="width:' + extra.bar + '%"></i></div>' : '') +
      '</div></div>';
  }

  function render() {
    var html = '';
    if (tab === 'achievements') {
      html = ach.map(function (a) { return tile(a.icon, a.isUnlocked ? 'success' : 'lost', a.title.toUpperCase(), a.description); }).join('');
    } else if (tab === 'medals') {
      html = med.map(function (m) { return tile(m.icon, m.isEarned ? m.tier : 'lost', m.name.toUpperCase(), m.description); }).join('');
    } else {
      html = qst.map(function (q) {
        var pct = q.targetProgress ? Math.round((q.currentProgress / q.targetProgress) * 100) : 0;
        return tile(q.icon, q.isCompleted ? 'success' : 'white', q.title.toUpperCase(), q.description,
          { prog: q.isCompleted ? 'COMPLETE' : q.currentProgress + ' / ' + q.targetProgress, bar: pct, done: q.isCompleted });
      }).join('');
    }
    $('awardGrid').innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
  }

  var order = ['achievements', 'medals', 'quests'];
  function setTab(t) { if (t !== tab) { tab = t; CP.sound.play('arm'); render(); } }
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
  });
  CP.onKey(function (e) {
    if (e.ctrlKey || e.metaKey) return false;
    var i = order.indexOf(tab);
    if (e.key === 'ArrowRight') { setTab(order[Math.min(i + 1, order.length - 1)]); return true; }
    if (e.key === 'ArrowLeft') { setTab(order[Math.max(i - 1, 0)]); return true; }
    return false;
  });
  render();
})();
