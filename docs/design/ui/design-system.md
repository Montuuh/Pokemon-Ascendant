# UI design system

> Tokens, components, motion, input and the move-card anatomy. The decisions these implement are canon in
> **Topic 9 — Presentation**; this is the implementation-level detail, and the rendered references live in
> [mockups/](mockups/).
>
> Written in the Unity era: where these pages name a "channel" or an "SO", read **store selector** and
> **content lookup**. The binding *shape* is correct even where the noun is not.

---

# UI Design System — The Standards

> The shared foundation every screen inherits. If a screen needs something not defined here, it is
> added here first, then used — never invented per-screen. Maps 1:1 onto a UI Toolkit `theme.uss`
> token sheet + a reusable component USS/UXML library. Extends GDD §9.1.3, §9.4, §9.7, §9.9.

## §9.1.1 Art direction — "Pokémon Center warmth" (Pillar 5)

> `↻ DECISION (user, this pass):` the UI leans **warm, bright, friendly and rounded** — the cosy
> Pokémon-Center / hand-held-menu feeling — *over* a cold tactical-dark deckbuilder look. This is a
> deliberate steer toward **Pillar 5 (cheerful core)** and is the most-visible change this spec makes
> to existing canon. It revises the **§9.1.3 palette** (currently cold navy) and the radius/tone
> language below. Routed to `art-director` + WCAG re-verification at ratification (CL-023).

**Principles**
- **Warm not cold.** Surfaces are warm cream / soft parchment in the front-end and a warm-neutral
  slate in combat — never the old blue-black. Accents are sunny and candy-bright, not neon.
- **Round not sharp.** Generous corner radii everywhere; panels feel like rounded cards/pills, like
  a Pokédex device. The lone exception is the *skill card* silhouette (see DS-1 corner language).
- **Bright & legible.** High saturation reserved for type identity, HP/affordance, and rewards.
  Backgrounds stay calm so sprites and type colors pop (the readability contract is unchanged).
- **Friendly motion.** Soft springy settles over snappy tactical cuts (still instant for *info*; see
  DS-6). Bouncy, never frantic.
- The regional-accent rule from §9.1.1 still holds: each Region tints the warm base; it never goes
  grim. Volcanic Highlands = "warm and intense," not "dark."

---

## DS-1 Layout grid & spacing

- **Reference canvas:** 1920×1080 logical (matches §9.1.2). UI Toolkit scales by % / `length`
  percentages so it reflows 4:3 → 21:9 (§9.8). Design at this reference; never hardcode pixel
  positions in logic — panels use flex/anchors.
- **Safe area:** 48px outer margin on all base panels (content never touches screen edge).
- **8-point spacing scale** (the *only* allowed gaps/padding values):

  | Token | px | Use |
  |-------|----|-----|
  | `--sp-0` | 0 | flush |
  | `--sp-1` | 4 | icon↔label, tight inline |
  | `--sp-2` | 8 | intra-component padding |
  | `--sp-3` | 12 | list-row inner padding |
  | `--sp-4` | 16 | default gap between components |
  | `--sp-5` | 24 | group separation |
  | `--sp-6` | 32 | section separation |
  | `--sp-8` | 48 | panel margin, zone separation |
  | `--sp-10` | 64 | hero spacing |

- **Radius (warm/rounded, §9.1.1):** `--radius-sm` 8px (chips/badges), `--radius-md` 14px
  (buttons/list-rows), `--radius-lg` 22px (cards/panels), `--radius-xl` 32px (modals, hero panels),
  `--radius-pill` 999px (toggles, AP pips, tabs). Everything rounder than a stock deckbuilder.
- **Corner language (preserved readability cue, §9.2.2.4):** the *skill card* keeps a **crisper,
  squarer silhouette** (`--radius-md`) while the *consumable card* is **pill-soft** (`--radius-xl`).
  Both are rounder than before, but the silhouette contrast that lets players tell them apart at a
  glance is retained — only now the difference is "soft vs softer," tuned by the art-director.
- **Z-layers (UIRouter):** `0 world/base` · `100 base-panel HUD` · `200 pushed overlay` ·
  `300 modal/confirm` · `400 toast` · `500 tooltip/damage-preview` · `600 transition curtain`.

## DS-2 Color tokens

> `↻ CHANGE to §9.1.3.1` — the **Core UI palette is re-warmed** (see §9.1.1). The **Type palette
> (§9.1.3.2) is kept verbatim** (those 15 hues are Pokémon-canonical and already cheerful). All new
> warm surface/text values below must be re-verified for **WCAG AA** against type chips and text at
> ratification — flagged for `art-director`.

The game runs **two themes off one token set**: a **warm-light front-end** (menus, hub, shops,
management — the cosy Pokémon-Center feeling) and a **warm-dim combat/map stage** (so 96×96 sprites
and type colors pop). Components reference tokens, never raw hex, so the same UXML renders in either
theme by swapping the token sheet.

### Surfaces & elevation — Front-end (warm light)
| Token | Hex | Use |
|-------|-----|-----|
| `--surface-0` | #FBF4E6 | app background — warm cream |
| `--surface-1` | #FFFDF8 | panel / card — near-white warm |
| `--surface-2` | #F3E7D0 | raised / selected fill — soft parchment |
| `--surface-3` | #EAD9B8 | hovered raised |
| `--ink-primary` | #3A2E22 | headings / key data — warm espresso (not black) |
| `--ink-secondary`| #6B5A45 | body text |
| `--ink-muted` | #A8967C | disabled / watermark |
| `--border-subtle`| #E4D4B5 | dividers, card outlines |
| `--border-strong`| #C9A86A | focused/active outline (warm tan) |
| `--scrim` | rgba(58,46,34,0.55) | modal/pause dim (warm, not black) |

### Surfaces & elevation — Combat/Map stage (warm dim)
| Token | Hex | Use |
|-------|-----|-----|
| `--surface-0` | #2A2230 | stage backdrop — warm aubergine-charcoal (replaces cold navy) |
| `--surface-1` | #3A3040 | HUD panel / hand tray |
| `--surface-2` | #4A3E50 | raised card / tooltip |
| `--surface-3` | #5A4C62 | hovered raised |
| `--ink-primary` | #FFF6EC | headings / key data — warm white |
| `--ink-secondary`| #E0D2C2 | body text |
| `--ink-muted` | #9E8FA0 | disabled / watermark |
| `--border-subtle`| #4A3E50 | dividers, card outlines |
| `--border-strong`| #FFC15A | focused/active outline (warm gold) |
| `--scrim` | rgba(26,18,28,0.66) | modal/pause dim |

> Per-Region the stage `--surface-0/1` are tinted (Verdant = warm green-slate, Coastal = warm
> teal-slate, Volcanic = warm ember-slate) — still warm, never grim (§9.1.1).

### Interaction states (apply to any interactive element)
> `--ink-*` are the warm replacements for the old `--text-*` tokens; `--text-primary/secondary/muted`
> become aliases of `--ink-primary/secondary/muted` so existing §10.x references still resolve.

| State | Treatment |
|-------|-----------|
| default | base surface + `--ink-secondary` |
| hover | surface +1 step, `--ink-primary`, soft 120ms ease |
| pressed | surface −1 step, 0.97 scale (springy settle) |
| focused (kbd/pad) | 3px `--accent-action` rounded outline, offset 2px (always visible — accessibility) |
| disabled | 50% opacity, no pointer, `--ink-muted` (never hidden — `ui.md`) |
| selected | `--accent-action` 4px inset edge + surface +1 |
| danger | `--accent-negative` fill/outline |

### Rarity tints (relics, Legendary picks, loot) — new, derived to harmonize with type palette
| Rarity | Border | Glow |
|--------|--------|------|
| Common | #8A95B0 (`--text-muted`) | none |
| Uncommon | #5CE181 (`--accent-positive`) | soft |
| Rare | #6890F0 (type-water blue) | medium |
| Epic | #A040A0 (type-poison purple) | medium-strong |
| Legendary | #FFD451 (`--accent-action` gold) | strong + animated shimmer (reduced-motion: static) |

### Semantic accents (warmed; `--accent-*` from §9.1.3.1 kept — already bright & cheerful)
`--accent-action` #FFCB3D sunny gold (playable / AP / focus) · `--accent-positive` #54D98A fresh
green (heal / buff) · `--accent-negative` #FF6B6B coral red (damage / faint) · `--accent-warning`
#FF9F45 warm amber (status / Trauma).

### Friendly secondary accents (new — reinforce the Pokémon-Center identity)
`--brand-red` #E84C4C (Poké-Ball red — primary brand mark, New Run / confirm-positive moments) ·
`--brand-blue` #4FA3E3 (soft sky — informational highlights, links, water-UI) · `--brand-cream`
#FFF1D6 (card paper / reward shine). Use sparingly as identity punctuation, not as fills.

## DS-3 Typography

- **Two families:** `--font-display` (pixel-style display face for headings, Pokémon names, numbers
  on cards) and `--font-body` (clean humanist sans for body/longform — readability at small sizes &
  CJK roadmap §9.10). Both must ship en-US glyph coverage; body face must have a CJK fallback hook.
- **Type scale** (base 16px; all sizes are tokens, multiplied by the accessibility text-size factor
  80/100/125/150% from §9.6 — **every text element binds the factor, designed to not clip at 150%**):

  | Token | px@100% | Weight | Use |
  |-------|---------|--------|-----|
  | `--type-display` | 40 | display bold | screen titles |
  | `--type-h1` | 30 | display bold | section headers, Pokémon name (combat) |
  | `--type-h2` | 24 | display semibold | card titles, kiosk headers |
  | `--type-h3` | 20 | display semibold | sub-headers, button labels |
  | `--type-body` | 17 | body regular | descriptions, effect text |
  | `--type-small` | 15 | body regular | secondary/meta |
  | `--type-caption` | 13 | body medium | badges, footnotes, counters |
  | `--type-number` | 22 | display bold tabular | HP/AP/damage (tabular figures, no jitter) |

- **Numbers use tabular figures** everywhere they change live (HP, AP, damage preview, counters).
- **Line length:** body text wraps at ≤ 60ch. **Never** rely on overflow clipping for meaning.

## DS-4 Component library

Each component = one UXML template + one USS block, BEM-named (`.pa-button`, `.pa-button--primary`,
`.pa-button__icon`) per §10.7.2. Components are **state-driven via classes**, fed by event-bus data
(§9.7) — they never read game state directly (`ui.md`).

### Buttons
| Variant | Use | Look |
|---------|-----|------|
| `--primary` | confirm / advance | `--accent-action` fill, dark text |
| `--secondary` | neutral / back | `--surface-2` fill, light text |
| `--ghost` | tertiary / inline | transparent, 1px `--border-subtle` |
| `--danger` | destructive (abandon run) | `--accent-negative` outline→fill on hover |
| `--icon` | toolbar (Bag/Dex/Team/Pause) | 48×48 square, icon-only, tooltip on hover/focus |

States from DS-2. Min hit target **44×44** (§9.8). Disabled stays visible.

### Panel / Card chrome
- **Panel:** `--surface-1`, `--radius-lg`, 1px `--border-subtle`, `--sp-6` inner padding, optional
  title bar (`--type-h2` + close `--icon` button top-right).
- **Card (generic):** `--surface-2`, `--radius-md`, hover → `--surface-3` + 2px rise.
- **Skill card / Consumable card / Relic card / Pokémon card:** see component specs in §9.1–DS-4.4.

### List row
- Height 56px, `--surface-1` (alt rows +2% lightness), `--sp-3` padding, hover/selected per DS-2.
- Slots: `[leading icon/portrait] [title + subtitle] [trailing value/status]`. Used by Pokédex,
  achievements, inventory lists, box list, shop list.

### Tabs / segmented control
- For Inventory (Relics·Consumables·Held), Settings (Display·Audio·Controls), Pokédex filters.
- Underline-style selected tab in `--accent-action`; keyboard left/right cycles; focus ring visible.

### Badge / chip
- `--radius-sm`, `--type-caption`. Variants: type-color, status-condition, rarity, count (e.g.
  `×3`), Trauma (`⚠ ×2`, `--accent-warning`), tier (Familiar/Veteran/Master).
- **Lead crown badge:** small gold crown icon overlaid top-center of the Lead portrait (battlefield +
  map + team screen). 16×16px, `--accent-action` gold with a 1px dark outline for contrast. Not
  interactive; purely decorative status indicator.

### Progress / bars
- **HP bar:** track `--surface-0`, fill gradient (green→amber→red by % thresholds), **phase-threshold
  notch markers** for boss-tier (§5.8.3 / `ui.md`), shield-HP overlay segment (lighter cyan) when
  present (CL-022). Numeric `cur / max` in `--type-number` overlaid right-aligned. **Minimum legible
  width: 80px** (smaller portraits may show bar-only, no text overlay — tap/focus reveals full detail).
- **XP / Trainer-Level bar:** segmented to show milestone ticks (CL-019 token milestones). Each segment
  is a discrete pill; completed segments glow gold briefly before settling to full-lit state.
- **Catch gauge (CL-014):** 0–100 fill, telegraph color shifts to `--accent-positive` at threshold;
  shown in Combat over a wild target. Positioned above the wild's HP bar, ~6px gap, same width.
- **AP pips:** 3 base pips (`--accent-action` lit / `--ink-muted` dim), pill-shaped (`--radius-pill`),
  animate spend with a soft 180ms shrink-fade. When AP > 3 (rare buff state), add pips in a second row
  underneath, max 6 total on-screen (overflow shows `+N` text badge instead of more pips).

### Tooltip & damage-preview (layer 500)
- Tooltip: `--surface-2`, `--radius-md`, `--sp-3` padding, ≤ 320px wide, 120ms fade, 6px rise.
- **Damage preview** = a specialized tooltip bound to `DamageCalculator.Preview(...)` →
  `DamageBreakdown` (§9.7). Always shows final value + breakdown + crit% + rider + redundancy
  warning (§9.2.4). Has an **always-on docked mode** (accessibility §9.6).

### Modal & confirmation
- Centered `--surface-1` panel over `--scrim`. Title + body + `[secondary Cancel] [primary Confirm]`.
- Destructive confirms use `--danger` primary. Esc = Cancel; Enter = Confirm (focus on Cancel by
  default for destructive actions).

### Toast / notification (layer 400)
- Bottom-center, `--surface-2`, auto-dismiss 3s, stacks max 3. For "Relic acquired", "Achievement
  unlocked 🏆", "Autosaved". Subtitle-style; never blocks input.

### Drag-and-drop affordance
- Used by Team/Loadout reorder (§9.3) and any reorderable list. Grab handle (⠿) on the leading
  edge; lifted item gets `--surface-3` + shadow + 1.03 scale; valid drop slots highlight
  `--accent-action` dashed outline; invalid = no highlight. Keyboard equiv: focus + `[ ]` to move.

### Empty / loading / error states
- Every list/grid defines an **empty state** (icon + one line, e.g. "Box is empty"). Loading uses a
  skeleton shimmer (reduced-motion: static "Loading…"). Errors are non-fatal toasts.

## §9.1–§9.1 Content card anatomies (cross-referenced by screen specs)
- **Skill card** — 🔒 locked anatomy in **`09-component-move-card.md`** (full type-colour theming,
  compressed↔expanded states, owner avatar, AP dots wrapping past 3, category/range/modifier trait
  strip, status-rider corner badge, two distinct unplayable states). Supersedes the old §9.2.3 note.
- **Consumable card** — same frame, rounded chrome, no power footer, "use" verb; 48×48 icon framed.
- **Relic card** — 64×64 icon, rarity-tinted border (DS-2), name, effect text, source tag; used in
  Inventory grid + Starting-Relic / Legendary pick.
- **Pokémon card / portrait tile** — portrait (96×96 battle / 32×32 map), type badge(s), level,
  HP bar, status row, Trauma badge, Lead crown when Lead. Used in Team, Box, Combat, Pokédex.

## DS-5 Iconography system (extends §9.4)

- **Inherit** §9.4 node icons, resource/state icons, status-condition icons verbatim.
- **Rule:** every icon that encodes meaning by color also carries a **shape/pattern** so it reads
  under colorblind modes (§9.6) — status icons get pattern overlays (stripes/dots), type chips
  get a glyph. Color is never the sole channel.
- **Style:** single-weight, 2px pixel-grid-aligned line icons at 32×32 base; type/status icons may be
  filled. Consistent optical size; no mixed photoreal + line.
- **New icon families this spec introduces** (full list in `06-asset-icon-manifest.md`): toolbar
  icons (Bag, Team, Dex, Settings, Pause, Map), action verbs (Use, Equip, Swap, Evolve, Teach,
  Catch, Release), economy (₽, ⭐ XP, 🪙 Token, relic-slot), navigation (Back ◀, Confirm ✓, Close ✕,
  drag ⠿), rarity frames ×5, tier badges ×3.

## DS-6 Motion language (extends §9.9)

- **Easing:** `--ease-standard` cubic-bezier(0.2,0,0,1) for enters; `--ease-exit` (0.4,0,1,1).
- **Durations:** micro 80ms (hover/press) · short 120–220ms (overlays/popovers) · medium 300ms
  (panel swap) · result 250ms+40ms stagger. (Transition table in `00 §Transition language`.)
- **Choreography principle (Pillar 1 telegraphy):** anything the player must *read to decide*
  (intent, damage preview, catch gauge) appears **instantly / persistently**, never gated behind an
  animation. Flourish animates; information does not.
- **Reduced-motion (§9.6):** every animation has a defined reduced-motion fallback (mostly
  instant or fade-only). Bars fill instantly; no parallax/shake/particle. This is a per-component
  contract, listed in each component, not a global toggle bolted on after.

## DS-7 Input & navigation model

- **Three input classes, parity required (§9.8 "no hover-only"):** mouse/touch, keyboard, gamepad.
  Every hover reveal has a focus/tap equivalent; every click has a key/pad equivalent.
- **Global bindings (rebindable, §9.6, two profiles):**

  | Action | Mouse | Keyboard | Pad |
  |--------|-------|----------|-----|
  | Navigate | hover/click | arrows / Tab | d-pad / stick |
  | Confirm | left-click | Enter / Space | A |
  | Back / Cancel | right-click / Close btn | Esc / Backspace | B |
  | Pause | ⏸ btn | Esc (in base) | Start |
  | Inspect/tooltip | hover | hold-focus | trigger |
  | End Turn (combat) | button | Space | Y |
  | Toggle damage-preview dock | button | Tab | RB |

- **Focus model:** UIRouter tracks a focus owner per panel; pushing an overlay traps focus inside it
  and restores prior focus on pop. A visible focus ring (DS-2) is mandatory in all states.
- **The `UIRouter` contract** (the one piece of "UI plumbing" Epic 13 builds first): `Push(panel)`,
  `Pop()`, `Replace(base)`, `ShowModal(...)→Task<bool>`, `Toast(...)`, focus trap/restore, layer
  assignment, transition playback (honoring reduced-motion). All screens are authored against it.

## DS-8 Localization & text rules (restate §9.10 as binding constraints)

- No hardcoded display strings — every label is a loc key (`ui.button.end_turn`, `combat.card.*`).
  Screen specs name the **key namespace**, not literal English, for any new string.
- Layout must tolerate **+40% string length** (DE/FR) and **CJK line-break** without clipping;
  buttons hug content with min-width, never fixed-width text.
- Numbers/dates/currency go through the loc formatter (₽ placement may vary by locale).

## DS-9 What "fits the standards" means (acceptance checklist for every screen)

A screen spec is *done* only if it: ① uses only tokens from DS-1–DS-3 (no ad-hoc px/hex); ② composes
only DS-4 components (or adds a new one here first); ③ states every component's data binding as an
event-bus channel / SO, never a direct system call; ④ lists empty/loading/disabled/focus states;
⑤ has a reduced-motion note; ⑥ has full keyboard + pad navigation; ⑦ names loc-key namespaces;
⑧ cites the GDD § it surfaces; ⑨ passes a Pillar-5 readability skim and the `ui.md` invariants
(damage preview final value, grayed-not-hidden, intent shows slot+occupant, boss HP phase markers).

---

# Component Spec — Move (Skill) Card  🔒 LOCKED (iteration 1)

> Authoritative anatomy for the skill card, agreed via mockup iteration (move_card_v3 + modifier/rider).
> Supersedes the generic card note in §9.2.3 and `01-design-system §9.1` — those should point here.
> Style: warm/rounded (§9.1.1), full type-colour theming. Fonts: **Baloo 2** (display) / **Nunito**
> (body). All taxonomy cited to canon; every face element maps to a `MoveSO` field. Status: locked for
> the first iteration; the three flagged micro-decisions at the end stay open.

---

## 1. Concept

The card is **flooded with its move's type colour** (instant hand-reading of type spread). The art
window and the effect text sit in **calm cream insets** so colour identifies while text stays legible.
The card has **two display states** so the battlefield stays visible:

- **Compressed** — the resting state in hand. Small footprint; shows only what you need to *decide*.
- **Expanded** — on **hover / keyboard-focus / select / drag**. Unfolds the art window + effect text.

> Transition: expand **grows in place within the hand row** — the card enlarges from its own slot and
> the neighbouring cards slide aside to make room. It does **not** pop above the tray. Reduced-motion:
> instant resize, no slide. (`01 DS-6`.)

---

## 2. Anatomy (final layout)

Corners belong to **overhanging badges**; the **top bar carries the name + owner**; the **footer is
AP-left / power-right**. No internal trait strip.

| Zone | Content | Placement / token |
|------|---------|-------------------|
| **Mechanics badges** | **category + range + modifier** icons | **overhang the top-LEFT edge**, half above the card; ~20–22px circles; modifier gold-tinted |
| **Status-rider badge** | condition glyph(s), condition-coloured | **overhang the top-RIGHT edge**; 2px dark ring |
| **Top bar** | **owner** avatar + **move name** | deeper type shade; name `Baloo 2`, owner avatar = 32×32 species portrait |
| **Window** (expanded only) | **owner portrait** ‖ **move art** | cream `--surface` inset, `--radius-md` |
| **Effect plate** (expanded only) | localised effect text, modifier/rider terms colour-coded inline | cream inset, `Nunito` ~12px |
| **Footer** | **AP cost dots — bottom-LEFT** · **`PWR n` — bottom-RIGHT** | `Baloo 2`; power = base only, **no STAB/maths here** |

**Compressed** = type-colour body · the two overhanging badge clusters · top bar (owner avatar + name)
· footer (AP bottom-left, power bottom-right). It drops only the window + effect plate. Everything
needed to *decide* is present; the full read appears on expand.

> **left = how it works (mechanics), right = what it inflicts (status)** — the corner split is the
> card's core mental model.

**Iteration-2 refinements — ADOPTED (master designer, 2026-06-14, all 5):**
1. **Owner-tinted inset** — the owner-portrait cream inset is tinted faintly toward the owner's primary
   type (Water-owner = faint blue cream, Fire-owner = faint orange cream). 15 tint variants in USS;
   instant "who contributed this card" read.
2. **Range icon always visible** — the **range** glyph (melee ✊ / ranged ◎) floats into the **top bar**
   beside the owner avatar, so it shows even compressed. Category + modifier badges stay in the
   top-left cluster (expanded-only); range is the tactically urgent one.
3. **Status-rider badge bumped** to **26–28px** (was 24) with a subtle pulsing glow (reduced-motion =
   static stronger border) — a rider out-weighs a range read, so it pops more.
4. **Not-enough-AP reinforced** — amber ⚠ next to the AP dots **and** an amber outer border (on top of
   the desaturate), so the deficit reads at a glance.
5. **Out-of-position text hierarchy** — "**Melee**" is the 18px bold heading; "needs Lead slot" the
   11px semibold subtitle (the actionable line, weighted under the verb).

---

## 3. Icon taxonomy (all canon — bind to data, don't invent)

| Group | Values | Source | Mockup icon (final = SVG, `06`) |
|-------|--------|--------|------------------------------|
| **Category** | Offensive · Defensive · Utility | §6.3.6 kit composition | ⚔ sword / 🛡 shield / ✦ sparkles |
| **Range** | Melee · Ranged | §6.3.6, move lines | ✊ grab / ◎ target-arrow |
| **Modifier** | Step-Forward · Step-Backward · none | §6.3.4 Vanguard | ▲/▼ chevrons, **gold tint** = movement class |
| **Status rider** | Burn, Poison, Paralysis, Sleep, Freeze, Confusion (+chance) | §4 status, §5.3.x riders | condition glyph on the **top-right overhang badge**, condition-coloured |

Two distinct visual languages, deliberately: **gold = modifier** (a guaranteed positional effect, in
the **top-left** mechanics cluster) vs **condition-colour = status rider** (a chance to inflict, the
**top-right** badge). They never read the same.

---

## 4. AP cost — dots

- AP lives at the **footer bottom-LEFT** (power is bottom-RIGHT) — identical on compressed and expanded
  so it never shifts when a card grows.
- Render AP as **gold dots**; **wrap to a new row after 3** (4 → 3+1, 5 → 3+2, 6 → 3+3). (`01 DS-4`.)
- In the **not-enough-AP** state, show **available** dots filled gold and **missing** dots as red
  dashed outlines, so the deficit is legible.

---

## 5. States (the load-bearing part)

| State | Trigger | Treatment |
|-------|---------|-----------|
| **Default (compressed)** | resting, affordable, playable | full colour, crisp |
| **Expanded** | hover / focus / select / drag | lifts above tray, unfolds window + effect |
| **Not enough AP** | `MoveSO.ApCost > currentAP` | card **desaturated** (grayscale+50% opacity) · AP dots show gold-have vs red-missing · amber `Not enough AP` label · **stays fully visible** (`ui.md`) |
| **Out of position** | move is **Melee** and owner is **not in the Lead slot** | card **not desaturated** (it's affordable) · **blue positional lock** overlay + melee glyph + `Needs Lead slot` · blue = position |
| **Drag-over-target** | dragged onto an enemy | the **damage preview** appears (final value + STAB/type/crit breakdown) — this is the *only* place the maths shows (`§9.2.4`, `10.7.4`) |

> The two "can't play" reasons are colour-separated on purpose: **amber = AP**, **blue = position**.
> Verify the exact melee-position rule (melee usable only from Lead?) against §3 / §4 targeting before
> implementation — UI reads `IsPlayable(move, state)` + a reason enum, it does not compute the rule.

---

## 6. Data bindings (`MoveSO` / event channels)

| Element | Field |
|---------|-------|
| type colour + band | `MoveSO.Type` → type palette (§9.1.3.2) |
| name / effect text | loc keys `move.<id>.name` / `.effect` (§9.10) |
| AP dots | `MoveSO.ApCost` |
| category / range / modifier icons | `MoveSO.Category` / `.Range` / `.Modifier` |
| status-rider badge | `MoveSO.StatusRider` (condition + chance) |
| power | `MoveSO.Power` |
| owner avatar + name | owning `PokemonInstance` → species portrait (32×32) + `species.<id>.name` |
| playable / reason | `HandChannel` card-state + `IsPlayable()` reason enum (AP / position / none) |
| damage preview (drag) | `DamageCalculator.Preview(card,target) → DamageBreakdown` (pure, §9.7) |

UI never computes affordability/legality — it renders the state the combat system publishes (`ui.md`).

---

## 7. Accessibility

- Type/category/status read by **glyph + shape**, not colour alone (colorblind, §9.6); status
  badges carry the DS-5 pattern overlay.
- Every card is keyboard/pad focusable; focus = expanded + gold ring (`01 DS-2`).
- Unplayable cards are **never hidden**; the reason is text, not just a tint.
- Damage preview is **hover / drag-over-target only — no persistent dock** (master-designer decision
  2026-06-14). `↻ NOTE:` this drops the GDD §9.6 "always-on damage preview" accessibility toggle;
  surface at ratification so the accessibility reviewer can weigh re-adding a lightweight option.
- Number text uses tabular figures (`01 DS-3`).

---

## 8. Asset hand-off (feeds `06` / `08`)

New/confirmed icons this card needs: **category ×3** (offensive/defensive/utility), **range ×2**
(melee/ranged), **modifier ×2** (step-fwd/back), **status riders ×6** (the §9.4.3 set) as art-corner
badges, **AP dot**. All warm/rounded SVG (`08` P0-3/4/5). Owner avatars come from the 32×32 sprite
pipeline (`08`).

---

## 9. Open micro-decisions (flagged — not blocking iteration 1)

1. **Multiple status riders** on one move → stack badges up the art-window edge (max 2–3) vs one
   "multi-status" badge that expands on hover. *Default: stack, cap 3.*
2. **Show the rider chance %** on/near the badge, or keep the badge clean and let the effect line +
   hover carry the % . *Default: clean badge, % in effect text + hover.*
3. **Power as `PWR n`** text vs an icon+number like the other stats. *Default: keep `PWR n`.*

Resolve these during the combat-screen assembly pass or first playtest; they don't change the layout.

---

## Art-director review notes (2026-06-14)

### Refinements — ✅ ALL 5 ADOPTED (master designer, 2026-06-14) — folded into §2 above; detail kept here

1. **Owner portrait inset tint** — the owner portrait sits in a cream `--surface` inset that currently
   matches the effect plate. Consider tinting this inset subtly toward the *owner's primary type* (e.g.
   a Squirtle-owned move gets a faint blue-tinted cream, a Charmander-owned move a faint orange cream).
   This gives instant "who contributed this card" read at a glance without needing to parse the avatar.
   Trade-off: adds 15 tint variants (one per type) to the component USS. Benefit: hand-read speed.

2. **Compressed state legibility check** — the compressed card shows owner avatar + name + AP + power,
   but the mechanics badges (category/range/modifier) are ONLY visible in expanded state (they're part
   of the art-window zone which is hidden when compressed). This may slow the "is this melee or ranged?"
   decision. **Recommendation:** float the **range icon** (melee ✊ / ranged ◎) into the top bar next
   to the owner avatar so it's always visible, even compressed. The category/modifier badges can stay
   in the mechanics cluster (expanded-only) since they're less tactically urgent.

3. **Status-rider badge scale** — at 24px the rider badge is visually equal to the 20px mechanics badges,
   but it encodes MORE decision weight (a status is rarer and more impactful than knowing the move is
   ranged). Consider bumping the rider badge to 26–28px so it pops more, or give it a subtle pulsing
   glow (reduced-motion = static stronger border). The mockup shows it well, but in a 7-card hand with
   rapid scanning, a bit more emphasis helps.

4. **Not-enough-AP state clarity** — the grayscale+opacity treatment works, but the red-dashed AP dots
   are small and easy to miss when scanning quickly. Add a small **amber warning icon** (⚠) next to the
   AP dots in this state, or tint the card's outer border amber (not just desaturate). Keep the
   "Not enough AP" text label, but reinforce it visually on the card itself.

5. **Out-of-position overlay text hierarchy** — the blue lock overlay is clear, but "needs Lead slot"
   could be larger and bolder. The text is the actionable part; the lock icon is decorative. Swap the
   visual weights: make "Melee" the larger heading (16px → 18px bold), and "needs Lead slot" the
   subtitle (stays 11px but bumps to semibold).

### Strengths to preserve

- The **flooded type-colour** + **cream insets** contrast is excellent — legibility is high, the cards
  feel tactile and distinct.
- **Corner badge overhang** is a strong visual signature; keep it exactly as-is.
- **Compressed ↔ expanded** growing in place is the right interaction model — no jarring pop-above.
- The silhouette contrast (skill card `--radius-md` vs consumable `--radius-xl`) reads instantly even
  in peripheral vision — do not soften this further.

### Flags for game-designer / ui-programmer

- Confirm **melee usability rule**: the mockup shows "needs Lead slot" for melee moves. Is this the
  final rule, or can Bench Pokémon use melee moves that target their own row? (Affects the overlay text.)
- Confirm **AP overflow visual** (the design system now caps at 6 pips + `+N` text) — does any content
  grant > 6 AP? If so, the `+N` badge needs a spec (probably a small gold chip next to the pips).
