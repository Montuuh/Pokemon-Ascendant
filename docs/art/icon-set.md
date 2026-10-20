# UI Icons — game-specific SVG & pixel set

Game-specific iconography for **Pokémon Ascendant** (`public/art/icons/`).
- **In-world Pokémon objects** (Type labels, Gym Badges, Items, TMs, Relics, Map Landmarks) use **authentic GBA/DS pixel art** (see `docs/art/pipeline.md`).
- **Deckbuilder system glyphs** (Status conditions, Intents, Card Traits, Step Modifiers, Rarity gems, Medals, Actions, Navigation) live in `public/art/icons/<family>/` as crisp 32×32 SVGs or pixel-snapped badges, paired with `@tabler/icons-react` (MIT) for secondary UI chrome.

## Style & Accessibility Spec
- **32×32 viewBox**, crisp edges, high contrast on both the warm-light front-end (`#FBF4E6`) and the warm-dim stage (`#2A2230`).
- **Shape carries meaning** so every icon reads without colour (colour-blind requirement, §9.6).
- **Type labels (`public/art/icons/type/`)**: the authentic 32×12 FireRed/LeafGreen pixel boxes (`npm run art:types`), rendered with `image-rendering: pixelated` at integer or half-step multiples (12/15/18/24 px tall).

## Families in `public/art/icons/`
| Folder | Count | Format | Notes |
|--------|------:|--------|-------|
| `type/` | 15 | PNG (pixel) | Official FRLG 32×12 pixel type boxes (`normal`..`dragon`) |
| `map/` | 25 | PNG / SVG | The 12 official Gym Badges on discs (`node-gym-<type>.png`), legacy map emblems, and the authored 16-px grid `node-mystery-sign.svg` |
| `status/` | 6 | SVG | Filled badge + colour-blind pattern + white glyph (`burn`, `poison`, `paralysis`, `sleep`, `freeze`, `confusion`) |
| `intent/` | 11 | SVG | Attack, cleave, backstrike, buff, debuff, stall, status, heal, call-for-help, guard, unknown |
| `trait/` | 5 | SVG | Category (`offensive`, `defensive`, `utility`) and range (`melee`, `ranged`) |
| `modifier/` | 2 | SVG | Movement class (`step-forward`, `step-backward`) |
| `rarity/` | 5 | SVG | Common, Uncommon, Rare, Epic, Legendary frames/gems |
| `medal/` | 4 | SVG | Bronze, Silver, Gold, Platinum achievement tiers |
| `action/` | 10 | SVG | Verb glyphs (`use`, `equip`, `unequip`, `swap`, `evolve`, `teach`, `catch`, `release`, `heal`, `buy`) |
| `nav/` | 8 | SVG | Back, confirm, close, drag, search, filter, lock, info |
| `toolbar/` | 6 | SVG | Bag, Team, Pokédex, Settings, Pause, Map |
