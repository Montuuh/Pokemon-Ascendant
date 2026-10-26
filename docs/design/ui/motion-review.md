# Motion review — the checklist behind D11 and D12

> What the `ui-reviewer` holds motion to, with the numbers. **D11** (chrome) and **D12** (the world) in
> `docs/design/ui-doctrine.md` are the rules; this file is how to judge them. **§9.9** (`09-presentation.md`) owns
> what each beat *does*; this file owns how to tell whether it does it well. The measuring half is `npm run ui:motion`
> (the whole UI) and the *D11 motion* line of `npm run ui:audit` (the changed files).

## Where this comes from

Adapted on 2026-10-26 from two published agent skills, rewritten for this game rather than installed:

| Source | Licence | Taken | Left out, and why |
|---|---|---|---|
| Emil Kowalski, [`emilkowalski/skills`](https://github.com/emilkowalski/skills): `review-animations` (+ `STANDARDS.md`), `improve-animations`, `find-animation-opportunities`, `animation-performance` | MIT | The frequency gate, ease-out and the 300 ms budget for chrome, never `scale(0)`, origin-aware popovers, transitions over keyframes for what retriggers, `transform`/`opacity` only, the remedial order (delete → reduce → fix the curve), the sweep that rejects most candidates | Blur to mask crossfades and soft glows (D9 draws flat); "never `ease-in`" in the world (a ball falls under gravity); a reduced mode that keeps gentle movement (§9.9 decides: beats are instant); hover gating for touch (desktop first, §9.8) |
| [`awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) `game-feel` | Apache-2.0 | Layered feedback at the impact, weight tiers, exaggerate briefly and return to rest, shake the picture not the body, hit-stop that does not stall input, an accessibility switch for shake and flash | The engine code (Godot/Unity); camera trauma noise (§9.9 locks the camera: a 1 px shake, Earthquake's stage); squash-and-stretch on sprites (authentic pixel sprites are not deformed, D9) |

## 1. Which register

| Register | What | Bar |
|---|---|---|
| **Chrome** | Buttons, tabs, tooltips, `InfoDot` bubbles, sheets, panels, modals, shelves, the Hub, Settings, the hand's hover and selection | §2 — restraint |
| **World** | The arena's beats (§9.9.1), moves (§9.9.2), the heal (§9.9.3), the map's ring and steps, the evolution, results and run-end scenes, the Game Corner | §3 — weight and the series' pace |

An element that is both — a card flying from the hand to the field — is chrome while the player holds it and world once
it is played.

## 2. Chrome (D11)

**The gate.** Every chrome animation names its purpose — *feedback*, *where it came from or went*, *a state made
legible*, or *a jump bridged* — and passes its frequency:

| How often | Ascendant | Allowed |
|---|---|---|
| Every action | Hovering or selecting a card, AP pips, a tooltip after the first, keys | Near nothing: ≤ `--motion-fast`, colour and opacity, and never a wait |
| Every turn or stop | Playing a card, End Turn, opening Team, a shelf, the map's next steps | Standard: ≤ `--motion-base` |
| A few times a run | A shop, an event, a sheet, the results tray | Standard; a stagger of 30–80 ms for a group |
| Once a run or rarer | A level-up panel, an evolution, a Badge, a catch, the run's end, the title | The delight budget: `--ease-spring` overshoot, a longer beat — and still skippable |

"It looks nice" is not a purpose. When in doubt, the first fix is to delete the motion, then to shorten it, then to
fix its curve — in that order.

**The numbers.**

| Rule | Value |
|---|---|
| Enter and leave | `--ease-step` (a strong ease-out) or the `ease-out` keyword; never `ease-in`, which spends its time at the start, where the player is looking |
| Move on screen | ease-in-out |
| Press feedback | `scale(0.97)` on `:active`, `--motion-fast` |
| Tooltip, small popover | `--motion-fast` · grows from its trigger (`transform-origin`), from `scale(0.95)` and opacity |
| Sheet, panel, modal | `--motion-base`, at most `--motion-slow` · a modal grows from the centre |
| Anything chrome | Under 300 ms unless the reason is in the code comment |
| Retriggered (tooltips, selection, toggles, toasts) | A `transition`, which retargets from where it is, not `@keyframes`, which restart from zero |
| Properties | `transform` and `opacity`; `filter`/`clip-path` with care. Not `width`, `height`, `top`, `left`, `margin`, `padding` — the bars that still transition `width` are known; new code uses `scaleX` |
| `transition` | Names its properties; `all` animates whatever changes next |

**Performance.** Motion's `x`/`y`/`scale` shorthands run on the main thread; motion that plays while the sim
dispatches or a screen mounts uses a `transform` string or CSS. A value written every frame goes to `ref.style`, never
to React state. A custom property that changes every frame is set on the element that moves, not on a parent whose
children all recompute (the arena's `fxTimings` are constants for the fight, which is fine).

## 3. The world (D12)

**Weight.** Each event gets the weight of what it is. The tiers are a ceiling and a floor, not a recipe — §9.9 says
which channels each beat uses:

| Weight | Events | At the impact |
|---|---|---|
| **Light** | A routine hit, a status card, a heal tick, a ball set in the tray | The number, the type's spark, the sound |
| **Medium** | Super effective, a crit, a status landing, a swap, a stage raised or lowered | Light + its word under the number, a flash or the 1 px shake |
| **Heavy** | A faint, the catch's click or burst, a level-up, an evolution, a Badge, a boss's entrance, a field move (Earthquake, Surf, Explosion) | A held beat before or after, the stage itself, a fanfare |

A routine hit dressed as heavy is a Should; so is a faint as light as a tap.

**Rules.**
- **Together, at the impact.** Number, flash, shake, sound and the card's HP land on the same frame (§9.9.2). Two or
  three channels; more is noise.
- **Brief, then rest.** Shake decays to zero, a flash returns to the sprite, a scale returns to 1. A loop belongs to
  a thing that waits on the player (the ring where they stand) and stops under reduced motion (`motion.css`).
- **The picture, not the place.** Shake and lunge move the sprite or the stage layer, never the layout and never a
  card's slot. A held frame pauses drawing; the hand, the keys and the next move's clock carry on (§9.9.2's one clock).
- **Physics is allowed.** `ease-in` for a fall or something leaving at speed, a parabola for a throw, steps for a spin.
  Mark it so the lint keeps quiet: `/* motion-ok: gravity */` on the line or the one above.
- **Flat.** No blur, no soft glow, no deformed sprite (D9). A Pokémon is never squashed or stretched.
- **Flashes.** No more than three flashes in any second (WCAG 2.3.1): Explosion, Thunder and the evolution's trade are
  the ones to watch.
- **Skippable and in its place.** A beat over a second ends on a click or a key; only the catch and a faint hold the
  hand (§9.9.1).

## 4. Both switches

Reduced motion is two switches: the system's `prefers-reduced-motion`, and Settings' `data-motion` on `<html>`
(`reduced` or `full`, which wins either way; §9.6). Under reduced, §9.9 decides what stays: bars jump, beats are
instant, numbers keep their hold and fade. A motion stopped by one switch and not the other is a Blocker. The usual
leak is a literal duration (`1.2s`) — the tokens collapse to 0 ms and a literal does not — and JS motion that does not
ask `useMotionPref()`.

## 5. Watching it

The audit captures at reduced motion, so its screenshots are still frames. Motion is judged in the browser tool at full
motion (Settings → Motion → Full, `?screen=settings`), on the screen's deep-link:

```js
// Freeze every running CSS/WAAPI animation and step it — screenshot between steps.
document.getAnimations().forEach((a) => a.pause());
document.getAnimations().forEach((a) => (a.currentTime += 50));
// Slow one animation down to see its curve (the beat's JS timers are not slowed, so judge one at a time).
document.getAnimations().forEach((a) => (a.playbackRate = 0.25));
```

Then once with Settings → Motion → Reduced, and say what stopped and what did not. What could only be judged by
eye — whether a curve feels right — is reported as *not verified* with what was tried, never as a pass.

## 6. The lint (`npm run ui:motion`)

Deterministic evidence, not a verdict. It reads every `.css`, `.tsx` and `.ts` under `src/ui` and `src/app` (the
audit reads only the changed files) and reports:

| Rule | Finds | Usually |
|---|---|---|
| `transition-all` | `transition: all` or `transition-property: all` | D11 Should |
| `ease-in` | `ease-in` (not `ease-in-out`) in a transition or animation | D11 Should on chrome · exempt in the world when marked |
| `layout-property` | `width`, `height`, `top`, `left`, `right`, `bottom`, `margin*`, `padding*` in a transition, or set in `@keyframes` | D11 Should |
| `scale-zero` | `scale(0)`, or `scale: 0` in a Motion `initial` | D11 Should |
| `literal-duration` | A duration or delay in `transition`/`animation` that is not a token (`0` and offsets inside `calc()` are fine) | D11 Blocker if it outlives reduced motion, else D6 |
| `ungated-motion` | A file that uses `motion/react` or `.animate(` without `useMotionPref` | D11 Blocker |

`/* motion-ok: <reason> */` (or `// motion-ok: <reason>`) on the line or the line above silences one hit; the reason
is required and the reviewer reads it.

## 7. The motion sweep (on request)

`/ui-review --motion` or "audit the motion": a read-only pass over the whole UI rather than one change.

1. `npm run ui:motion` for the evidence; read `src/ui/styles/motion.css`, the tokens, `FX_MS` and `MOTION_MS`.
2. **Fixes**: findings ranked by leverage (impact over effort), each with `file:line`, the rule, the register and the
   concrete change.
3. **Opportunities**: at most five places that should move and do not — each through the gate in §2 (or a weight in
   §3), with its purpose, frequency and exact values.
4. **Rejected**: two to five places considered and not proposed, with the gate that stopped each. This list is what
   keeps the sweep from becoming a wishlist.
5. Fixes go to the roadmap's next subversion and opportunities to its backlog (`docs/session/standing-facts.md`).
