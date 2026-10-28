# UI doctrine — what every screen of Pokémon Ascendant is held to

The rules a screen is reviewed against after every visual change. The reviewer is `.claude/agents/ui-reviewer`,
the protocol is `.claude/skills/ui-review`, the measuring tool is `npm run ui:audit`. Each doctrine has an id
(**D1**…**D12**) so a finding can name the rule it breaks. Topic 9 (`09-presentation.md`) owns the theme,
the type scale and the tokens; this file owns the *judgement*. *(Set by the user, 2026-09-22, after three
rounds on the Trainer Hub: "demasiada info en pantalla — más artístico, con botones que abran mini pantallas".)*

## The one sentence

**The picture on the screen, the paragraph one click away.** A screen is a place you look at; the reading
happens in a tooltip, a sheet or a panel the player opened on purpose.

## Doctrines

### D1 — Minimum text
A label, an icon or a number on the screen; never a sentence where a word does. A lede is one line. Any block
of running text longer than ~120 characters on a base screen is a finding unless it *is* the content (a story
event, a rules page, a sheet the player opened). Repeated text across siblings (the same caveat on every row)
is always a finding — say it once, at the top or in a tooltip.

### D2 — Explain on demand, not by default
Everything that needs explaining has a **door**: an `InfoDot` beside a heading, a tooltip on the element
(`useTip` / `<Tipped>`), a sheet or panel that opens on click. The explanation is never printed inline where
the door would do. Corollary: every non-obvious number, icon or state must *have* a door — a mystery is a
finding too. Native `title=` is banned (one voice: `src/ui/tips.tsx`).

### D3 — Widgets over grids
A list of identical text rows is a table of contents, not a screen. Prefer the shape that carries the meaning:
a ring for a level, a road for a track, a bar with marks for a ladder, cards with portraits for a roster, pips
for a rank, a sheet for a record. Unstyled primitives (`radix-ui`) under our tokens; never a component library
look. A plain `<table>` or a grid of ≥ 8 text-only rows on a base screen is a finding unless a widget was
considered and rejected in the code comment.

### D4 — Hide what can be hidden
If a piece of information can live behind a button, a tab, a hover or a sheet without hurting the *decision*
the screen exists for, it should. The test: cover the element with a thumb — did the player lose a choice, or
only a fact? A fact goes behind a door. Detail panels for the *selected* thing beat detail on *every* thing.

### D5 — Contrast and colour
Text meets WCAG AA: ≥ 4.5:1 for body, ≥ 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold). **That holds on a
disabled control too when its text is something a player reads to plan** — an unaffordable shop card, a locked
offer: say "not now" with the price chip, a lock or a label, never with opacity. WCAG exempts disabled controls;
this game does not, because "what am I saving toward" is read off exactly those. A sold or spent row, which is
history rather than a plan, may fade. *(Added 2026-09-22, from the v0.7.1 review; the user left the call to design.)* On the light theme
the semantic accents (`--accent-*`) are fills, borders or icon tints, **never running text**. Colour is never
the only channel: pair it with a glyph, a label or a shape (§9.6). Type hue comes from the games' own pixel
label, not from a coloured word.

### D6 — Tokens, not literals
Colours, spacing, radii, type sizes and motion come from `src/ui/styles/tokens.css`. A hex or a magic px in a
module that has a token is a finding. `useMotionPref()` gates every animation.

### D7 — Every element earns its place
Dead CSS classes, unused `data-testid`s, leftover copy from a previous design, a legend that explains a widget
the screen no longer has, a filter nobody needs, a count that duplicates another — garbage. The reviewer lists
it; the implementer removes it in the same change.

### D8 — Still works, in every detail
After the change, every interactive element on the modified screen does what it says: hover opens the right
bubble, focus is visible and Escape closes, buttons have accessible names, the deep-link (`?screen=` /
`?scenario=`) still lands, and nothing overflows or wraps into a column at 1920 × 1080 or 1280 × 720 — a
card's content spilling out of its card counts, not only a scrolling page. The e2e for the screen passes and its
screenshot has been *read*. **An animated outcome reveals its result when the animation lands**: a result line,
a lit row or a wallet that updates while the wheel is still turning has told the player before the machine did.
*(Added 2026-09-23 from the v0.7.2 Game Corner review.)*

### D9 — Classic Pokémon pixel-art register
Every game-world asset is **authentic classic Pokémon pixel art** (GBA FireRed/LeafGreen overworlds, interiors, tiles, badges and type boxes; DS/Gen III–V bag sprites for items, TMs, berries and relics; Gen V animated battle sprites and Showdown trainer sprites).
- **Integer pixel scaling only:** every pixel-art asset is rendered with `image-rendering: pixelated` at integer (or clean half-step) multiples. Never mix smooth 3D/HD renders (e.g., Scarlet & Violet 3D item renders) or cel-shaded illustrations into icons, items, TMs, trainers or map props.
- **Tile-grid parity in scenes:** overworld maps, town lobbies and interior rooms (`PixelRoom`) are built on the 16×16 px FRLG tile grid from authentic tiles and exterior/interior sprites. Any custom structure or prop that the original games never drew (such as the Challenge Ring, Pokémon Coliseum, Roulette table, or Move Card illustrations) must be authored or quantised onto the exact pixel grid with a 1-px dark outline and snapped to the FRLG palette — never soft AI "mixels" or half-scaled building cutouts.
- **One icon per item/relic identity:** no relic may share the exact same sprite file as a Held Item or another Relic. Every item, TM and relic in the game carries a distinct pixel-art sprite from the franchise's item/key-item/underground/berry sprite archive (or a palette/pixel edit in the same 24×24 / 32×32 GBA/DS bag style).
- **Typography & UI chrome:** typography uses **pixel-art / classic handheld fonts** for headers, names, numbers, combat plates, chips and dialogue boxes so the UI speaks the same visual language as the sprites, while the surrounding UI frames stay clean, tactile and warm (Poké-Center cream and combat-stage plum, classic bordered plates, no competing modern vector illustrations).

### D10 — One voice
Strings on a screen come from the content row or the string tables; tooltips from `tips.tsx`. The same thing
is called the same name everywhere (Bond, Familiar, Token, Lead, Active Team, Box). English in the product;
§-numbers never appear on screen, and neither do roadmap versions — a thing that is not here yet says "not
yet", not "v0.7". *(Line added by the first review, 2026-09-22.)*

### D11 — Motion earns its frame
Motion has two registers, and a finding names which one it judges. **Chrome** is everything a player operates —
panels, sheets, tooltips, buttons, shelves, the Hub: it moves to give feedback, to show where a thing came from or
went, or to bridge a change that would otherwise jump, and for nothing else. How often the player meets it decides
how much it may move: what is met every turn barely moves and never makes the player wait; what is met once a run may
take its time. Chrome enters and leaves on a strong ease-out from the `--ease-*` tokens, never `ease-in`, and stays
under 300 ms; it grows from `scale(0.95)` and opacity, never from nothing, and a popover grows from its trigger. It
animates `transform` and `opacity`, never layout, and `transition: all` is not a list. **The world** — the arena, the
map, the cutscenes, the reward beats — keeps the series' pace and physics instead (D12). In both, the information a
decision needs appears at once and stays (§9.9), and **both** switches stop the movement: the system's
`prefers-reduced-motion` and Settings' `data-motion`. A duration that is not a token escapes both. The checklist and
the numbers are in `docs/design/ui/motion-review.md`. *(Added 2026-10-26, adapted from Emil Kowalski's animation
skills: their restraint is right for chrome, and wrong for a Poké Ball falling under gravity.)*

### D12 — Impact lands, then rests
A beat in the world is felt where it lands: the number, the flash, the shake, the sound and the card's HP arrive
together at the impact (§9.9.2), two or three channels at once, and each event gets the **weight of what it is** — a
routine hit is light, a super-effective hit or a crit heavier, a faint, a catch, a level-up, an evolution or a Badge
the heaviest. Feedback is exaggerated briefly and returns to rest: no shake that does not decay, no pulse that became
the normal state. It moves the picture, never the layout or the sim; a held frame (hit-stop) pauses the drawing,
never the input or the clock of the next move. It stays in the pixel register (D9): flat shapes, stepped spins, no
soft glow. A beat longer than a second can be skipped with a click or a key, and none holds a decision that is not
its own (§9.9.1). *(Added 2026-10-26, adapted from the game-feel skill of awesome-gamedev-agent-skills.)*

## Severity

| Level | Means | On a review |
|---|---|---|
| **Blocker** | D5 contrast failure on body text · D8 broken interaction or overflow, a page error or a failed request · D2 native `title=` (banned) · D2 a mystery with no door on a decision-bearing element · D11 motion that makes the player wait on an every-turn action, information a decision needs animating in, or motion either reduced-motion switch does not stop | Fix before the change is done |
| **Should** | D1 / D3 / D4 violations on a base screen · D7 garbage · D6 literals · D11 `ease-in`, over 300 ms, `scale(0)`, `transition: all` or a layout property on chrome · D12 feedback heavier or lighter than its event, or that does not return to rest | Fix in the same change unless the user says otherwise |
| **Nit** | wording, spacing, a door that could be one level closer · D11/D12 origin, stagger, enter/exit timing | Note; fix if cheap |

## What the reviewer produces

A verdict line — **Ship** / **Ship with fixes** / **Rework** — then findings ranked by severity, each with the
doctrine id, the file and line, what is seen (screenshot name or audit number) and the concrete change. Then the
**garbage list** (D7) as a checklist. Then, if the screen is good, one line saying what it does well, so the
pattern is kept.
