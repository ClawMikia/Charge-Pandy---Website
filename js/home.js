/* =========================================================
   CHARGE-PANDY — home.js
   ========================================================= */
(function(){
  const roster = window.CP_ROSTER || [];

  function buildStrip(){
    const strip = document.getElementById('rosterStrip');
    if(!strip) return;
    strip.innerHTML = roster.map(p => `
      <div class="rt-card">
        <img src="${p.poses.charge}" alt="${p.name}" loading="lazy">
        <div class="rt-tag">${p.tag}</div>
      </div>
    `).join('');
  }

  function heroCycle(){
    const img = document.getElementById('heroPortrait');
    const tag = document.getElementById('heroTag');
    if(!img || !roster.length) return;
    let i = 0;
    setInterval(() => {
      i = (i+1) % roster.length;
      const p = roster[i];
      img.style.opacity = 0;
      setTimeout(() => {
        img.src = p.poses.charge;
        tag.textContent = p.name;
        img.style.opacity = 1;
      }, 260);
    }, 3400);
    img.style.transition = 'opacity .26s ease';
  }

  function heroMeterPulse(){
    const cells = document.querySelectorAll('#heroMeter .cell');
    if(!cells.length) return;
    let n = 0;
    setInterval(() => {
      cells.forEach((c, idx) => c.classList.toggle('filled', idx <= n));
      n = (n+1) % cells.length;
    }, 900);
  }

  function beatLoop(){
    const spans = document.querySelectorAll('#heroBeat span');
    if(!spans.length) return;
    let i = 0;
    setInterval(() => {
      spans.forEach(s => s.classList.remove('active'));
      spans[i].classList.add('active');
      i = (i+1) % spans.length;
    }, 620);
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildStrip();
    heroCycle();
    heroMeterPulse();
    beatLoop();
  });
})();
