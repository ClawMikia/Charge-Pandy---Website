/* =========================================================
   CHARGE-PANDY — characters.js
   Roster of 20 selectable Pandy designs.
   ========================================================= */
(function(){
  const CODENAMES = [
    "Riot","Volt","Cinder","Frostbyte","Nomad","Static","Hollow","Ember",
    "Vanta","Circuit","Rogue","Havoc","Glitch","Talon","Ashen","Pulse",
    "Onyx","Ferro","Wraith","Solstice"
  ];

  const roster = Array.from({length:20}, (_,i) => {
    const n = i+1;
    return {
      id: n,
      name: `PANDY // ${CODENAMES[i]}`,
      tag: `#${String(n).padStart(2,'0')}`,
      poses: {
        charge: `assets/pandys/pandy${n}_charge.png`,
        shield: `assets/pandys/pandy${n}_shield.png`,
        boom:   `assets/pandys/pandy${n}_boom.png`
      }
    };
  });

  window.CP_ROSTER = roster;
})();
