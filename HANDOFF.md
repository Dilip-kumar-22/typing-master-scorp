# Typing Master · S-Corp — Antigravity Handoff

Paste **this entire document** into Antigravity, and attach the prototype files (`index.html`, `styles.css`, all `.jsx` files) as references. Antigravity should build the final product as a single self-contained `index.html` in **vanilla JS** (the prototype uses React for velocity — the production target is vanilla).

This handoff has 4 parts:
1. **Visual design brief** — colors, type, components, motion, 3D system
2. **App architecture** — two-view routing (Home → Practice)
3. **Product spec** — your original feature list (verbatim)
4. **Implementation notes & priorities**

---

## 🎨 PART 1 — VISUAL DESIGN BRIEF

The product feels like a **premium SaaS app crossed with a mechanical-keyboard product page** — colorful, 3D, glassmorphic, neon on midnight. Think Linear + Raycast + cyberpunk lighting. Not flat. Not corporate.

### 1.1 Color tokens (CSS custom properties)

```css
:root {
  /* Surfaces */
  --bg-0: #07071a;   /* base */
  --bg-1: #0d0c24;
  --bg-2: #14122e;
  --panel:        rgba(20, 18, 46, 0.55);   /* glass panel */
  --panel-strong: rgba(28, 25, 60, 0.85);   /* modal / drawer */
  --hairline:        rgba(255, 255, 255, 0.07);
  --hairline-strong: rgba(255, 255, 255, 0.14);

  /* Brand */
  --violet:  #8b5cf6;   --violet-2: #a78bfa;
  --indigo:  #6366f1;
  --cyan:    #22d3ee;   --teal:     #2dd4bf;
  --magenta: #ec4899;   --rose:     #f43f5e;
  --amber:   #f59e0b;
  --lime:    #a3e635;   --green:    #22c55e;

  /* Text */
  --text-0: #f5f3ff;
  --text-1: #d6d3ec;
  --text-2: #9994c4;
  --text-3: #5d5a86;

  /* Glow */
  --glow-violet:  0 0 40px rgba(139, 92, 246, 0.55);
  --glow-cyan:    0 0 40px rgba(34, 211, 238, 0.55);
  --glow-magenta: 0 0 40px rgba(236, 72, 153, 0.5);
}
```

**Signature gradients** (use these for every brand moment):
- Primary action: `linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)`
- Brand mark: `conic-gradient(from 220deg, #8b5cf6, #22d3ee, #ec4899, #8b5cf6)`
- Hero title gradient: `linear-gradient(90deg, #a78bfa 0%, #22d3ee 50%, #ec4899 100%)`
- Donut stroke: `#8b5cf6 → #22d3ee → #ec4899`
- Mode-card accents (per category): violet, cyan, magenta, teal, amber, lime, indigo (one per group)

### 1.2 Background (mandatory — don't skip)

Every screen layers **5 elements** behind the app:
1. **Base radial gradients** — four overlapping radial-gradient orbs (violet/cyan/magenta/indigo at corners) + a linear gradient bottom.
2. **56×56px line grid** at 2.5% opacity, **masked** with a radial gradient so it fades at the edges.
3. **Grain** — `radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px)` at 3px, `mix-blend-mode: overlay`, 40% opacity.
4. **Three floating blurred orbs** — `border-radius: 50%`, `filter: blur(80px)`, slow 18s `transform: translate + scale` keyframe. Violet (top-left), cyan (top-right), magenta (bottom-right).

This recipe is what makes the page _alive_ rather than dark-mode-flat.

### 1.3 Typography

- **UI**: Space Grotesk 400/500/600/700. Body letter-spacing `-0.005em`.
- **Mono / typing display**: JetBrains Mono 400/500/600/700. Offer Fira Code and Courier as user options.
- **Section eyebrows**: 11px, `letter-spacing: 0.18em`, uppercase, `--text-3`.
- **Hero title**: 60px Space Grotesk 700, letter-spacing `-0.025em`, line-height 1.02. Second line gets the gradient text fill above.
- **Stat values**: JetBrains Mono 700 32px (home mini stats), 26px (practice stats bar).
- **Big results WPM**: JetBrains Mono 700 96px, gradient text.

### 1.4 Component patterns

**Glass panel** (used everywhere — topbar, cards, drawers):
```css
background: rgba(20, 18, 46, 0.55);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 20px;
backdrop-filter: blur(24px) saturate(140%);
box-shadow: 0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05);
```

**Buttons**:
- Pill, `border-radius: 999px`, padding `10px 16px`.
- **Primary**: violet→magenta gradient, inner white highlight, `box-shadow: 0 8px 24px rgba(139,92,246,0.4)`. Hover: lifts `translateY(-2px)`, stronger glow.
- **Ghost**: transparent, hairline border, hover gains violet border + violet glow.
- **Large CTA** (hero "Start typing"): `padding: 14px 22px; font-size: 14px;`

**Icon buttons** (40×40, radius 12): glass background; hover violet-tinted + glow + 1px lift; active state violet→magenta gradient + violet glow.

### 1.5 THE 3D KEYBOARD (signature element — do not skip)

This is the single most important visual in the product. The keyboard must look like **real, depressed hardware keycaps** viewed from a tilted angle, sitting on a recessed deck.

**Stage** (perspective wrapper):
```css
.kb-stage {
  perspective: 1200px;
  perspective-origin: 50% -20%;
  padding: 40px 8px 20px;
  position: relative;
}
/* Violet rim glow under the deck */
.kb-stage::after {
  content: '';
  position: absolute;
  left: 12%; right: 12%; bottom: -10px;
  height: 60px;
  background: radial-gradient(ellipse at center top,
    rgba(139,92,246,0.55) 0%,
    rgba(34,211,238,0.25) 30%,
    transparent 70%);
  filter: blur(20px);
  z-index: -1;
}
```

**Deck** (the keys sit ON this, not floating):
```css
.kb {
  transform-style: preserve-3d;
  transform: rotateX(32deg);
  padding: 22px 22px 30px;
  background: linear-gradient(180deg, #1a1635 0%, #0e0a22 100%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  box-shadow:
    0 18px 0 #07061a,                    /* deck side wall */
    0 22px 0 rgba(0,0,0,0.6),
    0 40px 80px rgba(0,0,0,0.6),
    0 60px 100px rgba(139,92,246,0.25),  /* purple ambient */
    inset 0 1px 0 rgba(255,255,255,0.08),
    inset 0 -2px 0 rgba(0,0,0,0.4);
}
```

**Keycaps** (the 3D illusion):
```css
.key {
  height: 56px;
  border-radius: 10px;
  transform: translateZ(8px);
  background: linear-gradient(180deg,
    hsl(var(--tone) var(--sat) calc(var(--light) + 14%)) 0%,
    hsl(var(--tone) var(--sat) calc(var(--light) +  4%)) 45%,
    hsl(var(--tone) var(--sat) var(--light)) 100%);
  border: 1px solid rgba(255,255,255,0.12);
  font-family: 'JetBrains Mono'; font-weight: 700;
  text-shadow: 0 1px 0 rgba(0,0,0,0.5);
  /* 9-layer side-wall stack — THIS is what makes it look 3D */
  box-shadow:
    0 1px 0 hsl(var(--tone) var(--sat) calc(var(--light) -  4%)),
    0 2px 0 hsl(var(--tone) var(--sat) calc(var(--light) -  6%)),
    0 3px 0 hsl(var(--tone) var(--sat) calc(var(--light) -  8%)),
    0 4px 0 hsl(var(--tone) var(--sat) calc(var(--light) - 10%)),
    0 5px 0 hsl(var(--tone) var(--sat) calc(var(--light) - 12%)),
    0 6px 0 hsl(var(--tone) var(--sat) calc(var(--light) - 14%)),
    0 7px 0 hsl(var(--tone) var(--sat) calc(var(--light) - 16%)),
    0 8px 0 hsl(var(--tone) var(--sat) calc(var(--light) - 18%)),
    0 9px 0 hsl(var(--tone) var(--sat) calc(var(--light) - 20%)),
    0 12px 16px rgba(0,0,0,0.55),                      /* contact shadow */
    inset 0 1.5px 0 rgba(255,255,255,0.18),            /* top highlight */
    inset 0 -2px 0 rgba(0,0,0,0.35);                   /* bottom inner */
}
.key:hover {
  filter: brightness(1.18);
  transform: translateZ(10px) translateY(-1px);
}
.key.is-down {
  transform: translateZ(0) translateY(7px) scale(0.98);
  /* shadow stack collapses to 3 layers */
}
```

Key states drive `--tone --sat --light` HSL variables:
- **Default**: `--tone:230; --sat:12%; --light:22%` (cool gunmetal)
- **Target** (active mode's keys): `--tone:268; --sat:80%; --light:58%` (violet) + outer halo with `pulse-key` 1.6s animation
- **Selected** (custom-key picker): `--tone:188; --sat:75%; --light:52%` (cyan) with dark text
- **Heat 1–5** (frequency/error): yellow `50/90/62` → orange `32/95/58` → red `12/92/54` → rose `350/92/56` → magenta `320/92/56`

Each state keeps the **9-layer side-wall stack** in its own hue so the colored highlights still look 3D.

### 1.6 Mouse parallax (typing card)

The typing card tilts subtly in 3D as the cursor moves over it, with a soft violet+cyan glare following the mouse:

```js
const onMouseMove = (e) => {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top)  / r.height;
  const rx = (0.5 - y) * 6;   // ±3deg
  const ry = (x - 0.5) * 8;   // ±4deg
  el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  el.style.setProperty('--mx', (x * 100) + '%');
  el.style.setProperty('--my', (y * 100) + '%');
};
```

The card has `transform-style: preserve-3d` and a `.tilt-glare` pseudo-layer that tracks `--mx/--my` via a radial-gradient.

### 1.7 Motion language

| Element | Animation | Timing |
|---|---|---|
| Default state changes | ease | 0.18–0.20s |
| Hover-lift interactive surfaces | `translateY(-1 to -2px)` + glow | 0.18s |
| WPM count-up | cubic-out `1 - (1-k)³` | 360–1100ms |
| Cursor blink | opacity 1 → 0.25 → 1 | 1.1s loop |
| Background orbs | translate + scale | 18s loop, staggered |
| Key target halo pulse | opacity 0.45 → 0.85 | 1.6s loop |
| Results card entrance | slide up 40px + fade | 450ms |
| Drawer entrance | translateX(100%) → 0 | 320ms cubic-bezier(0.2, 0.8, 0.2, 1) |
| Hero orb rings | rotate 360° | 14s / 22s reverse / 18s |
| Mode-card hover | translateY(-3px) + colored glow | 0.2s ease |
| Quick-card hover | translateY(-4px) + accent glow | 0.2s ease |

### 1.8 Don'ts

- ❌ No flat dark-mode look. Orbs + grid + grain are non-negotiable.
- ❌ No emoji as UI (sparingly in copy only).
- ❌ No flat keyboard. The 9-layer side-wall stack on `.key` is the brand.
- ❌ No off-palette colors. Use the tokens.
- ❌ Don't replace JetBrains Mono in the typing area.
- ❌ Don't put the typing/keyboard on the same screen as mode selection on initial load — that's the Home screen. Practice is its own focused view.

---

## 🏗️ PART 2 — APP ARCHITECTURE

The app has **two views**, switched via a `view` state (`'home' | 'practice'`). The user starts on Home and enters Practice by clicking any "Start" CTA or any mode card.

### 2.1 Home view (the dashboard)

```
┌─────────────────────────────────────────────────────────┐
│  TopBar: brand · theme toggle · settings                │
├─────────────────────────────────────────────────────────┤
│  HERO                                                   │
│  ┌─────────────────────────┬───────────────────────┐    │
│  │ "Welcome back" tag      │                       │    │
│  │ "Train your fingers.    │   [3D orbital widget  │    │
│  │  Sharpen your mind."    │    with Best WPM]     │    │
│  │ subtitle                │                       │    │
│  │ [Start typing] [mode]   │                       │    │
│  └─────────────────────────┴───────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  QUICK ROW (3 cards)                                    │
│  [Continue]    [Daily Challenge]    [Random Mode]       │
├─────────────────────────────────────────────────────────┤
│  STATS STRIP (4 mini tiles)                             │
│  [Best WPM] [Avg WPM] [Total time] [Sessions]           │
├─────────────────────────────────────────────────────────┤
│  WPM TREND CHART (full width SVG line graph)            │
├─────────────────────────────────────────────────────────┤
│  PRACTICE MODES (3-column grid)                         │
│  [Home Row] [Upper Row] [Lower Row]                     │
│  [Custom]   [Num+Sym]   [Case]                          │
│  [Difficulty]                                           │
├─────────────────────────────────────────────────────────┤
│  RECENT SESSIONS (table, last 8)                        │
└─────────────────────────────────────────────────────────┘
```

**Hero orb**: a `width:320px` square with 3 absolute-positioned `border-radius: 50%` rings (each spinning at a different rate via `@keyframes spin`), and a central 160×160 sphere with a radial-gradient (white highlight → violet → near-black) plus inset shadows for fake reflection. Displays Best WPM in the center.

**Quick cards**: 3 buttons in a row. Each has an accent tone (violet/cyan/magenta), a 44×44 icon tile filled with that tone's gradient, an eyebrow label, a title, a meta line, and a `cta + arrow` row at the bottom. Hover: lift 4px + colored glow. The Daily Challenge card carries a "NEW" badge.

**Mini stats**: each tile has a colored blurred orb in its top-right corner (`width:80px; height:80px; filter: blur(28px); opacity:0.5`) keyed to its tone.

**Mode cards**: each card represents one of the 7 mode groups (Home Row, Upper Row, Lower Row, Custom Keys, Numbers & Symbols, Case Modes, Difficulty). Each card has its own `--c1` accent. The card shows the top 2 variations as buttons by default; a chevron expander shows the rest. Click any variation = jump to Practice with that mode loaded.

**Quick actions** (default behavior):
- **Continue** → resumes the last-used mode (or "Start beginner" if no history)
- **Daily Challenge** → a mode deterministically picked from the date string (so everyone gets the same challenge today)
- **Random** → picks any item across all groups

### 2.2 Practice view (focused typing)

```
┌─────────────────────────────────────────────────────────┐
│  TopBar (same)                                          │
├─────────────────────────────────────────────────────────┤
│  PRACTICE HEAD:  [← Home]   Group · [Mode picker ▼]   [Restart] │
│    (mode picker opens a popover listing ALL modes)      │
├─────────────────────────────────────────────────────────┤
│  STATS BAR (WPM · Accuracy · Errors · Streak · Time · Zen · etc) │
├─────────────────────────────────────────────────────────┤
│  TYPING CARD (3D mouse-parallax tilt, gradient top edge)│
│  Live mode tag · pulse dot                              │
│  big monospace text with per-char states                │
│  footer: kbd shortcuts · char counter                   │
├─────────────────────────────────────────────────────────┤
│  CUSTOM KEYS PANEL (only when mode = Custom Keys)       │
│  ↑ shows full keyboard picker + preset chips inline     │
├─────────────────────────────────────────────────────────┤
│  3D KEYBOARD CARD (heatmap + legend)                    │
│  toggle: Frequency / Errors                             │
└─────────────────────────────────────────────────────────┘
```

Critical: **keyboard input is captured globally with `document.addEventListener('keydown')` only while `view === 'practice'`**. Otherwise typing on Home would steal keystrokes.

### 2.3 Shared overlays
- **Settings drawer**: right-side slide-in. Available on both views.
- **Results overlay**: full-screen scrim + glass card; triggered on prompt completion. Confetti if accuracy > 95%.

---

## 🎯 PART 3 — PRODUCT SPEC (original verbatim)

Build a full-featured, visually stunning Typing Practice Web App.

### Mode categories (with expand/collapse on Home)

**Home Row**: home keys only / home + G / home + H / home + G&H / left hand / right hand
**Upper Row**: upper only / left hand / right hand / upper + home
**Lower Row**: lower only / left hand / right hand / lower + home
**Custom Key Selector**: clickable full QWERTY keyboard to toggle keys ON/OFF — selected keys glow. "Generate words from selected keys" button. Must include **numbers, symbols, AND special keys** (Tab, Space, Enter, Backspace) as togglable cells. Preset chips: All letters / All numbers / All symbols / Home row / + Space / Clear.
**Numbers & Symbols**: numbers only / symbols only / numbers + letters / all keys combined
**Case Modes**: lowercase / UPPERCASE / mixed / camelCase / ALL CAPS
**Difficulty**: Beginner (2–4 letter words) / Intermediate (5–7) / Advanced (8–12) / Expert (sentences w/ punctuation) / Code snippets (JS/Python) / Paragraph (real English)

### Typing area
- Large monospace, font-size 28–32 (slider 20–40)
- Per-char states: upcoming gray / current white + cursor / correct white / wrong red + shake
- Cursor: 3px gradient underline (violet → magenta), 1.1s blink, glow
- Auto-scroll on overflow; show 3 upcoming words faintly
- Input captured globally via `document.addEventListener('keydown')` (no visible input)
- **3D mouse-parallax tilt on the typing card** (see 1.6)

### Live stats bar
WPM (animated count-up) · Raw WPM · Accuracy % · Errors · Streak · Timer · animated progress bar.

### Sound effects (Web Audio API)
- Correct keystroke: soft tick (~80–180Hz square)
- Wrong: low buzz (90Hz sawtooth)
- Word completed: gentle two-note chime
- Session complete: ascending 4-note jingle (C/E/G/C')
- Personal best: 5-note burst
- Combo streak milestone: rising pitch tones
- Volume slider + ON/OFF toggle
- 3 sound packs: **Mechanical** (square+triangle), **Soft** (sine), **Typewriter** (sawtooth+click)

### Results screen
- Big animated WPM number (gradient text, count-up 1100ms)
- Accuracy donut chart (SVG, gradient stroke, animated 900ms)
- Breakdown: correct / errors / time / raw WPM
- Struggle-key list (top miss keys with bar graphs)
- Comparison to last session (↑/↓ chip)
- Buttons: Share / New mode / Try again
- Confetti canvas burst when accuracy > 95% (180 particles, brand palette)

### Keyboard heatmap
- Full QWERTY rendered as the 3D keyboard
- Keys light up as pressed (`is-down`)
- Color intensity by frequency: yellow → orange → red → rose → magenta
- Separate **Error heatmap** view (which keys you get wrong most)
- Toggle between Frequency / Errors

### Settings drawer
- Theme: Light / Dark / Auto
- Accent color: 4 swatch options (violet / cyan / lime / amber)
- Font: JetBrains Mono / Fira Code / Courier
- Font size slider (20–40px)
- Cursor style: line / block / underline
- Sound: ON/OFF + volume slider + sound pack
- Prompt length: 20 / 40 / 60 / 80 / 100 words
- Timer mode: off / count-up / 30s / 60s / 120s countdown
- Toggle: Highlight mode keys on keyboard
- Toggle: Show next-word preview
- Toggle: Auto-advance on completion
- Sessions history (last 20) + WPM trend mini-chart
- Reset progress button (with confirm)

### Progress tracker (localStorage)
- Store last 20 sessions (date, mode, WPM, accuracy, time)
- Personal-best tracking per mode
- WPM trend SVG line graph (gradient area + line, last-point highlighted)

### Bonus
- Zen mode (hide stats while typing, reveal on complete)
- Word-difficulty prediction (red tint upcoming words containing struggle keys)
- Custom paragraph paste
- Share-result text: "I scored 87 WPM at 96% accuracy on Intermediate"

---

## 🔧 PART 4 — IMPLEMENTATION NOTES

### Final shipping target
- Single self-contained `index.html` with inline `<style>` and `<script>` blocks
- **Vanilla JS** (no React, no Babel). The prototype uses React only for velocity — treat it as visual reference.
- Google Fonts via CDN (only allowed external load): JetBrains Mono, Space Grotesk, Fira Code
- Web Audio API for all sounds (no audio files)
- localStorage for settings + history
- Canvas for confetti, SVG for donut + trend chart
- `requestAnimationFrame` for count-up animations

### Priority order
1. **Get the visual system right first**: base layers, glass panels, gradients, typography, the 3D keyboard with the 9-layer shadow stack. If you don't nail this, the rest looks generic.
2. **Home view** with hero, quick cards, modes grid. This is what the user lands on.
3. **Practice view** with typing engine, stats, 3D keyboard heatmap.
4. **Results overlay** with donut, struggle keys, confetti.
5. **Settings drawer** with all toggles wired to actual behavior.
6. **Sound packs** — synthesize the 3 profiles.
7. **Bonus**: Zen, word prediction, custom paste.

### Pitfalls to avoid
- **Don't render the typing area on the Home screen** — keyboard input would conflict. Use the `view` state to gate the keydown listener.
- **The 3D keyboard needs 9 box-shadow layers, not 1**. A single-layer offset shadow makes it look flat. Use HSL math to step down lightness in 2% increments across the stack.
- **Don't forget the deck under the keys** — keys sitting on flat panel look fake. The dark deck with its own depth shadow + violet rim glow underneath is what sells the realism.
- **Backdrop-filter blur is mandatory** on all glass surfaces. Without it the colors look muddy.
- **Special keys in Custom Keys panel**: Tab/Space/Enter/Backspace must be selectable AND meaningfully affect prompt generation (Tab inserts `\t`, Enter inserts `\n`, Space is default separator).
- **Persist across reload**: settings AND history go through localStorage on every change. Use a single `STORAGE_KEY` (`'typing_master_v1'`) with `{ settings, history }`.

### Component inventory (from the prototype)
| File | What it does |
|---|---|
| `home.jsx` | Hero + quick cards + stats + trend + modes grid + recent table |
| `app.jsx` | View routing, state, key handler, action wiring |
| `typing.jsx` | Typing card with per-char states + mouse parallax |
| `stats.jsx` | Live stats bar + animated WPM count-up |
| `keyboard.jsx` | 3D QWERTY render with heat/target/selected states |
| `modes.jsx` | Custom keys panel (full keyboard + specials + preset chips) |
| `results.jsx` | Results overlay + donut + confetti canvas |
| `settings.jsx` | Settings drawer + trend mini-chart |
| `audio.jsx` | Web Audio synth for 3 sound packs |
| `data.jsx` | Word banks, sentences, mode groups, layout, prompt builder |
| `styles.css` | All styling (tokens, components, animations) |

Build it like the prototype looks. The prototype is the spec.
