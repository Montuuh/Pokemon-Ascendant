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
- **Verify visually.** After any visual change run `npm run shot` and Read the PNG, or screenshot via the browser tool. Hover, drag and animation are verified with Playwright actions, not assumed.
