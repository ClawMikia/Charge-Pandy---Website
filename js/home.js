/* Home page: counters, roster, first-launch intro. */
(function () {
  'use strict';
  var CP = window.CP, store = CP.store;
  var $ = function (id) { return document.getElementById(id); };

  $('statPlayed').textContent = store.matchesPlayed();
  $('statWon').textContent = store.matchesWon();

  $('roster').innerHTML = CP.roster.map(function (c) {
    return '<div class="tile cut sm"><img src="' + CP.sprite(c, 'charge') + '" alt="' + c.name + '"><div class="tag">' + c.tag + '</div></div>';
  }).join('');

  var intro = $('intro');
  if (CP.lsGet('cp_first_launch', 'true') !== 'false') intro.hidden = false;

  function startTutorial() {
    CP.lsSet('cp_first_launch', 'false');
    CP.sound.play('confirm');
    setTimeout(function () { window.location.href = 'rules.html'; }, 170);
  }
  $('btnStart').addEventListener('click', startTutorial);
  $('btnEnter').addEventListener('click', function (e) { e.preventDefault(); CP.go('play.html'); });
  $('btnLearn').addEventListener('click', function (e) { e.preventDefault(); CP.go('rules.html'); });

  CP.onKey(function (e) {
    if (e.ctrlKey || e.metaKey) return false;
    if (!intro.hidden) {
      if (e.key === 'Enter') { startTutorial(); return true; }
      return false;
    }
    if (e.key === 'Enter') { CP.go('play.html'); return true; }
    if (e.key === 'l' || e.key === 'L') { CP.go('rules.html'); return true; }
    return false;
  });
})();
