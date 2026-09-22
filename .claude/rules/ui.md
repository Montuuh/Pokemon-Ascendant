---
paths:
  - "src/ui/**"
  - "src/app/**"
---

# UI rules — `src/ui/**`, `src/app/**`

- **UI owns no game state.** Components read sim state from the store and dispatch actions. No rules, no math beyond formatting; the damage preview calls `previewDamage` from the sim.
- **Tokens only.** Colours, spacing, radii, type scale and motion durations come from `src/ui/styles/tokens.css`. Never hardcode a hex/px that has a token. Stage screens (combat, map) add `theme-stage` to their root.
- **CSS Modules per component**, camelCase class names, one component per file, props typed.
- **Unplayable cards stay visible** (greyed / locked overlay), never `display:none`. State is a `data-state` attribute plus a class.
- **Intent labels always show slot + occupant name** ("→ Lead (Charmander)"). Boss HP bars show phase markers.
- **WCAG:** on the light theme the semantic accents (`--accent-*`) are fill, border or icon tint only, never running-text colour. On the stage theme they may colour text.
- **Testable by construction:** every screen root and every interactive element a test could need has a stable `data-testid`. Every screen is reachable by `?screen=` (later `?scenario=`) so Playwright and the browser tool can deep-link.
- **Motion:** CSS transitions/keyframes driven by tokens and sim events; honour `prefers-reduced-motion` (tokens collapse to 0 ms). Card feel per §9.9 (draw 200 ms, play 350 ms, discard 150 ms).
- **Text:** user-facing strings gathered per screen (ready for i18n at v0.9); rules text comes from the sim/content, never assembled ad hoc in JSX.
- **Short on the screen, the explanation on hover (2026-09-21).** A label, an icon or a number on the screen; the
  paragraph in a tooltip. Never a native `title=` — use `useTip()` on an interactive element, `<Tipped>` on an
  inline one, `<InfoDot>` beside a heading. Every tooltip's prose lives in `src/ui/tips.tsx` and is built from the
  content row or the string tables, so the game explains itself in one voice. A screen lede longer than one line
  is a tooltip that has not been written yet.
- **Verify visually.** After any visual change run `npm run shot` and Read the PNG, or screenshot via the browser tool. Hover, drag and animation are verified with Playwright actions, not assumed.
- **The review (2026-09-22).** Every change under `src/ui` or `src/app` is reviewed by the `ui-reviewer` agent
  against `docs/design/ui-doctrine.md` (D1 minimum text · D2 doors · D3 widgets over grids · D4 hide what can be
  hidden · D5 contrast · D6 tokens · D7 no garbage · D8 still works · D9 pixel-art kin · D10 one voice). The
  `ui-review` skill runs it: `npm run ui:audit` → agent → fix → `node .claude/hooks/ui-clear.mjs`. The hooks
  queue the edits and hold the turn open until then.
- **Widgets (2026-09-21).** Unstyled primitives from `radix-ui` (Tabs, Progress, ScrollArea, Accordion) for
  anything with keyboard/ARIA semantics — styled by our CSS Modules, never by a theme. `motion` for entrance
  and layout animation, always through `useMotionPref()` so the Settings override wins. `@number-flow/react`
  for any counter that changes while the player watches (XP, Tokens). `react-circular-progressbar` is the
  level ring. Do not add a component library with its own look; the tokens are the look.
