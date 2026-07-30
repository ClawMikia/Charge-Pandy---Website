# Charge-Pandy

**CLAP. CLAP. CHARGE / SHIELD / BOOM.**

A browser-based competitive hand-game — the schoolyard classic reloaded for the screen. Pick your Pandy fighter, sync your rhythm with the CPU, bank charges, and out-read your opponent across best-of-three rounds.

---

## How to Play

Every round follows a simple rhythm: **Clap. Clap. GO.**

Both players commit to a move on the third beat — no takebacks, no re-reads. The player with the stronger move wins the exchange.

### The Core Three Moves

| Move | Cost | Effect |
|------|------|--------|
| **Charge** | Free | Bank +1 charge. You are wide open while charging — getting hit eliminates you instantly. |
| **Shield** | Free | Block a standard Boom for free. Does nothing against pierce attacks (Double Boom, Ultimate). |
| **Boom** | 1 charge | Fire a shot. Eliminates anyone not shielding. If both Boom, both go down. |

### Advanced Moves (Banked Charges)

| Move | Cost | Effect |
|------|------|--------|
| **Double Boom** | 2 charges | Pierces a Shield — punish a blocking opponent. |
| **Reflect** | 1 charge | Send any incoming attack (Boom, Double Boom, Ultimate) straight back at the attacker. Whiffing costs the charge. |
| **Ultimate** | 3 charges | An unblockable finisher — wins the exchange outright unless answered by a Reflect. |

### Match Rules

- Each fighter starts with **3 lives**.
- Any successful hit removes one life.
- Trading identical attacks costs **both** players a life.
- Charges cap at **4** — hoarding is not free.
- First fighter to zero lives is eliminated.
- **Best 2 out of 3 rounds** takes the match.

---

## Pages & UI

### Home Page (`index.html`)

- **Hero section** — Animated Pandy portrait cycling through the roster, charge meter preview, and rhythm indicator (CLAP / CLAP / GO).
- **Moves showcase** — Three cards explaining Charge, Shield, and Boom with descriptions.
- **Roster teaser** — Horizontal scroll strip of all 20 Pandy fighters.
- **CTA buttons** — "Enter The Match" and "Learn The Moves".

### Play Page (`play.html`)

- **HUD** — Player and CPU health (lives), charge meters, round counter, and score. "Change Fighter" button to open the selection modal.
- **Arena stage** — Animated fighters positioned on the stage with hit flash effects, knockback animations, and elimination states.
- **Beat HUD** — Animated beat dots (CLAP → CLAP → GO) with timing cues.
- **Controls** — Six move buttons: Charge, Shield, Boom, Double Boom, Reflect, Ultimate. Each button shows its cost. Buttons are disabled when insufficient charge or outside the beat window.
- **Feed line** — Real-time text updates describing what happens each round.
- **Character Select Modal** — Grid of all 20 Pandys, live preview of your pick, CPU rolling animation, and "Confirm & Fight" button.
- **Result Modal** — Round/match result overlay with win/loss text. "Continue" or "New Match" options.
- **Restart Match** button — Resets the current match from the play screen.

### Rules Page (`rules.html`)

- **How to Play** — Explanation of the Clap-Clap-GO rhythm and timing window.
- **Core Moves** — Detailed breakdown of Charge, Shield, and Boom with cost, effectiveness, and trade-offs.
- **Advanced Tech** — Double Boom, Ultimate, and Reflect with descriptions and charge costs.
- **Match Rules** — Full list of win conditions, life system, charge caps, and scoring.
- **CTA** — "Put it into practice" button linking to the Play page.

---

## Features

- **20 selectable Pandys** — Each fighter has Charge, Shield, and Boom pose variants. CPU opponent picks randomly.
- **Theme toggle** — Dark mode and Light mode, persisted per session via the nav toggle.
- **Responsive navigation** — Hamburger menu on mobile with keyboard (Escape) support.
- **Animated feedback** — Hit flashes, knockback, shield pulses, charge rings, projectile bolts, and Ultimate screen-wide burst effects.
- **Weighted CPU AI** — The CPU makes strategic decisions based on its current charge level and threat assessment.
- **Animated visuals** — Floating hero portrait, pulsing charge meter, beat rhythm animation, scrolling roster strip.
- **Google Fonts** — Orbitron (display), Rajdhani (body), Share Tech Mono (mono/UI labels).

---

## Project Structure

```
Charge-Pandy/
├── index.html          Home page
├── play.html           Game/play page
├── rules.html          Rules and instructions page
├── web_icon.png        Favicon and site icon
├── css/
│   ├── base.css        Design tokens, nav, theme, HUD, shared primitives
│   ├── home.css        Home page layout and styles
│   ├── game.css        Play page, arena, HUD, modals, FX animations
│   └── rules.css       Rules page layout and styles
├── js/
│   ├── characters.js   20-fighter roster data (poses for each Pandy)
│   ├── shell.js        Navigation drawer, theme toggle, ambient FX
│   ├── home.js         Hero animation, roster strip, beat loop
│   └── game.js         Full match engine: beat sequence, AI, resolution, modals
└── assets/
    └── pandys/         60 PNGs — 20 fighters × 3 poses (charge, shield, boom)
```

---

## Getting Started

Open `index.html` in any modern browser. No build step, no server required — this is a purely client-side application.

---

## License

Charge-Pandy © 2026