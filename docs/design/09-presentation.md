# Topic 9 — Presentation

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns:** the art direction, the colour and type system, the combat and map layouts, the title screen, iconography, audio, accessibility and the screen inventory.
> **It does not own:** any rule the UI displays. Per-screen detail is in [`ui/screens.md`](ui/screens.md), tokens and components in [`ui/design-system.md`](ui/design-system.md), and rendered references in [`ui/mockups/`](ui/mockups/).

---

# §9.1 Visual style

## §9.1.1 The statement

**Modern illustrated 2D, warm.** Bright, cel-shaded creature-RPG art with depth from lighting rather than
perspective; deckbuilder UI minimalism — Slay the Spire's clarity over decoration.

**Tone.** Cheerful, warm and vibrant by default (Pillar 5). Each Region layers its own palette and lighting on
top without ever breaking the base: even the Volcanic Highlands is *intense and dramatic*, never grim.

**Two coordinated themes.**

| Theme | Where | Feel |
|---|---|---|
| **Warm-light front-end** | Menus, map, node services, management, run-end, meta | Cream surfaces, warm-brown ink — a Pokémon Center interior |
| **Warm-dim stage** | The combat screen only | Deep-plum surface, warm-cream ink — the lights go down for a fight |

Display font **Baloo 2** (rounded), body font **Nunito**. Iconography is a single-weight rounded line set.

## §9.1.2 Asset sizes

| Asset | Size | Notes |
|---|---|---|
| Battle sprite | ~96 × 96, animated | Front and back; scaled up in the stage |
| Portrait | 475 × 475 | Menus, detail panels, card owner avatars at 32 × 32 |
| Box icon | 68 × 56 | Lists and the Box |
| Move card art | 144 × 96 | Landscape, framed by the card chrome |
| Relic icon | 64 × 64 | Rarity-tinted border |
| Held Item icon | 32 × 32 | With an equipped-state overlay |
| Consumable icon | 48 × 48 | 64 × 96 when framed as a card |
| Backdrop | 1920 × 1080 | Calm centre and lower third, so UI sits over it |

## §9.1.3 Colour

### §9.1.3.1 Core tokens

**Warm-light front-end**

| Token | Hex | Use |
|---|---|---|
| `--surface-0` | `#FBF4E6` | Page background, cream |
| `--surface-1` | `#FFFDF8` | Cards, raised tiles |
| `--surface-2` | `#F3E7D0` | Panels, headers |
| `--ink-primary` | `#3A2E22` | Headings and key data, warm brown |
| `--ink-secondary` | `#6B5A45` | Body text |
| `--ink-muted` | `#A8967C` | Labels, disabled |
| `--border` | `#E4D4B5` | Card and panel borders |
| `--accent-action` | `#FFCB3D` | Primary buttons, playable glow, AP pips |
| `--brand-red` | `#E84C4C` | Brand mark, danger accents |
| `--accent-positive` | `#54D98A` | Heals, gains, XP |
| `--accent-negative` | `#FF6B6B` | Damage, costs, faint |
| `--accent-warning` | `#FF9F45` | Status, Trauma, can't-afford |

**Warm-dim stage** overrides two: `--surface-0` `#2A2230` (deep plum) and `--ink-primary` `#FFF6EC` (warm
cream). The accent tokens are shared.

> **A contrast rule that is load-bearing.** On the **warm-light** theme the four semantic accents all fail WCAG
> AA as running text — as low as 1.6:1. They may be used as a **fill** (with dark ink on top), an **icon tint**,
> or a **border, underline or glow** — never as the `color` of text. On the **warm-dim stage** they pass
> comfortably and may be used as text. A "can't afford" warning is therefore an amber left-border and icon with
> normal-coloured text, not amber text.

### §9.1.3.2 Type palette (15)

| Type | Hex | | Type | Hex |
|---|---|---|---|---|
| Normal | `#A8A878` | | Ground | `#E0C068` |
| Fire | `#F08030` | | Flying | `#A890F0` |
| Water | `#6890F0` | | Psychic | `#F85888` |
| Electric | `#F8D030` | | Bug | `#A8B820` |
| Grass | `#78C850` | | Rock | `#B8A038` |
| Ice | `#98D8D8` | | Ghost | `#705898` |
| Fighting | `#C03028` | | Dragon | `#7038F8` |
| Poison | `#A040A0` | | | |

Canonical hues, but rendered warm: even Ice and Water get a warm backing or a warm-tinted glow on the stage so
they sit inside the palette rather than fighting it.

**Colour is never the only channel.** Every type, status and rarity carries a glyph or a shape as well as a
hue — a requirement that exists for colour-blind players and pays off for everyone in a seven-card hand.

---

# §9.2 The combat screen

## §9.2.1 Layout — squad formation

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡] [⚑ Fight name] [Rule] [Field]   [≣ last log line ▾]   [Turn][Deck]│  top bar, 56px
├──────────────────────────────────────────────────────────────────────┤
│   (sprite)                        [trainer]            [intent]       │
│  [BENCH 1 plate]                  [◉◉●○○]               (sprite)      │
│                    [intent]                          [BENCH 1 plate]  │
│              (sprite)  · · · · · · · · · · ·  (sprite)                │
│   (sprite)                                             [intent]       │
│  [BENCH 2 plate] [★ LEAD plate]           [LEAD plate]  (sprite)      │
│   your formation, left           enemy, mirrored, right [BENCH 2 plate]│
├──────────────────────────────────────────────────────────────────────┤
│  (3)   [Card][Card][Card][Card][Card] │ [Bag 2/2]       [ End Turn ] │
│  AP                                                      [ Run ]     │
└──────────────────────────────────────────────────────────────────────┘
```

**One formation each side, and every Pokémon on the field is one card** (v0.9.16, the user's calls: "unificar
información… que salgan los 3 pokemons que tiene el player, y que su información esté en la animación", and then "la
animación encapsulada dentro de la carta, algo parecido a las cartas de los movimientos"): the move card's grammar —
the slot tag on its top edge, the condition on its corner, types, name and level on a dark head, **the animated sprite
in a window lit in its first type**, its HP under it. There is no separate portrait column and no separate enemy panel
column: what a Pokémon is and where it stands are read in one place.

- **Your formation sits left**: the **Lead forward**, in the column nearest the enemy, **centred between its
  bench** — Bench 1 above, Bench 2 below, close together — the whole side centred on the stage; the Lead's card
  gold-framed and crowned, the same size as the rest. All three show their back sprites — the series' triple-battle picture. A bench card's last
  row is its HP and its swap price; the hits coming at a Pokémon this turn hang off its card's edge, towards the enemy
  (§9.2.5). The whole card is the button: a swap, an ally target, a step-back choice, the card it takes.
- **The enemy's formation mirrors yours, and is named as yours**: its **Lead** forward (the column nearest you,
  centred, red-framed), **Bench 1** behind it high and **Bench 2** low — the same tags as your plates (v0.9.16, the
  user's call; the rules still call the two behind the Lead its supports, §5.6). Each is its intent chips above its
  card (one line each, so two fit a column at 720 p; a chip wider than the card widens its column, never running onto a
  neighbour's card) and the card; a wild card carries the catch pill inside, at the end
  of its HP row. **One grammar for one enemy or three** (user, 2026-09-30): a lone enemy is a Lead
  standing large; the held card's number sits on every plate it reaches, and the full breakdown opens only for the one
  aimed at. **Two on the field stand as if three did**: the Lead centred, the other in the upper place, the lower empty.
- **Who an enemy will hit is drawn** (v0.9.16, the user's "flechas… muy sutil", then "se ven muy poquito"): a
  dotted arrow with a dark edge from the edge of each enemy's card to the edge of the card its visible intent names —
  over the cards, so its head is always in sight and a bench enemy's arrow is not taken for its Lead's — in **the
  intent's colour, which its chip's edge shares**: red a hit, **blue a stat change** (a drop on you, a rise on itself;
  its glyph an arrow down or up, so it is a shape as well as a colour), violet a condition, green help for an ally (a
  heal, a Cover) — every slot for a Cleave, a second action fainter. The chip is still the reading:
  the arrow joins it to its target. A hidden intent draws none. **Resting on an enemy** brings its arrows forward and the
  rest back (its bubble opens to its side, never over its own chip); **resting on one of yours** — or focusing it —
  brings forward the arrows aimed at it. The arrows step back while a ball rocks.
- **The rival trainer stands behind its line-up**, in the far column, between its Bench 1 and Bench 2 (v0.9.16), with
  **its whole team at its feet as the series' small Poké Balls**: beaten grey and struck, on the field lit and ringed,
  still to come plain — who they are stays a surprise until they come out (§2.7.3).
- **A fight opens one ball at a time**: the enemy's Pokémon sent out one after another, then yours — the Lead, a moment
  later Bench 1, then Bench 2 — each popping out in its card's window.
- **Every Pokémon's card is one size**, yours and the enemy's, a Lead or a lone wild one — the Lead is told by its
  frame and crown, not by its scale (v0.9.16, the user's call) — and **the size comes from the stage's height**, so
  720 p and 1080 p hold the same picture, smaller or larger: the card is a set fraction of the stage tall (capped only
  where a 1440 p screen would make it absurd), its window follows, and the sprite in the window is drawn at the whole or
  half multiple nearest it, never more than a tenth past it (D9).
- **The catch pill** (wild only) sits inside the enemy card, at the end of its HP row, with the best ball's chance; pressing it opens the
  **ball picker** — every ball in the bag with its count and its own chance, a row to throw (§2.6.4.1). **While the ball
  rocks, the field holds** as it stood when it left the hand — a pack does not scatter before the click says it was
  caught — the intents and arrows step back, and the ball shows only its wobbles.
- **The hand tray runs along the bottom, in one row** (v0.9.15): the 5 skill cards in the middle, a divider and
  the **Bag** (its item count and the turn's uses left, 2/2; it opens every item carried, one card per kind with ×N),
  and End Turn with Run under it on the right; **the AP capsule docks over the hand, at the screen's centre** (§9.2.2.4).
- **The damage preview** opens in the open ground between the formations when a card is aimed at an enemy — the
  number on the plate is the decision, the box the breakdown. Against a group, **every plate carries the held card's
  own number** (and a KO flag), or a blue dashed **Out of reach** lock where a Melee card cannot land.

## §9.2.2 Zones

### §9.2.2.1 Top bar
Persistent and never collapsed. Left: the menu, then **one chip naming the fight** — its kind as an icon (paw,
trainer, star for an Elite, trophy for a Gym; the bubble says what the kind means) and its name, the trainer named
once (v0.9.15: it was three chips, two of them saying the trainer's name); a Gym Leader's rule chip (§5.9.5); the
active field badge (with the `🏠 Home Field` marker when the enemy owns it); a hold-out's count (*Hold out · 2 turns*,
amber, solid on the last turn — §5.6.5). Middle: **the battle log as a ticker** —
the last thing that happened on one line, the whole fight dropping down on a click (it used to sit on the arena
floor, and fell off the stage at 720 p; the arena is for the fight) — and, while a card or an item waits for its
target, **the gold hint** in its place ("Click an enemy to aim it…", Cancel): on the field it lay across the very
Pokémon being aimed at (v0.9.16). Right: the turn and the deck/discard counts. Each chip shows its full text on hover
or focus.

**The log reads the fight back** (the user's note, 2026-10-19: it said who used what, never what it did). Every hit
says what it took and what is left — `Spearow took 17 (10/55 HP left).`, a multi-hit move its hits counted — and a
foe's hit says how it landed (a critical hit, super or not very effective, or that it did not affect its target), as a
card of yours already says on the line before its hit. The drop-down holds the whole fight (200 lines), each turn
under its own header held at the top while its lines scroll, your lines on a gold edge and the foe's on a red one,
every number in bold; it drops over the field, its chips and its arrows (the top bar sits above the stage). Two foes
of one name are told apart by their place (`Spearow (Bench 1) took 17 …`).

### §9.2.2.2 Player squad
Each of the three is a card (§9.2.1): the slot tag (and the **Lead crown**) on the top edge, the status condition on
the corner, type labels, name and level on the head, the animated back sprite in its window, an HP bar with a numeric
`cur / max` — **the part this turn's visible intents will take striped** (v0.9.16; the number is on the chip hung off the
card) — and a cyan shield segment when a shield is present, the stat-stage, Shield and Trauma chips in a column on the
window's top-left corner, and on a bench its **swap price** and what it would take as the Lead. The Lead stands forward, gold-framed and crowned; the
bench behind it, the same size. A slot an intent is aimed at glows red round its plate and keeps its own frame — your Lead stays gold, so it
never reads as the enemy's red Lead.

A **fainted** Pokémon keeps its place: its sprite gone, its plate dimmed and reading *Fainted*. It is never removed
from the screen — the player needs to see the shape of their team.

### §9.2.2.3 Enemy
Each is a card (§9.2.1) under its intent chips: its place tag (Lead in the enemy's deep red, Bench 1, Bench 2), the
status condition on the corner, type labels, name and level, the animated front sprite in its window, the HP bar with
**phase-threshold notches** for boss-tier enemies and a **Phase N/M** chip beside it — and, on the one a card is aimed
at (on every one, for an area card), the part that card would take, striped — and the stage, armour and Sturdy chips
and a runner's countdown (a running figure and *in 2*, amber and solid on its last turn, its bubble the race — §5.6.5)
in a column on the window's top-left corner. A guard carries no catch pill. Its tier (Wild, Trainer, Elite, Gym
Leader) is in the plate's bubble, not printed on every plate.

The sprite is as much the target as the plate: a click on either aims the held card there.

**A formation never outgrows its stage** (the user's report, 2026-10-19: at 720 p a group's Bench 1 intent was cut under
the top bar). The enemy group's two bench rows are each as tall as the taller unit, so nothing a fight hands out may
grow a unit unchecked. *Every card keeps one size, on both sides:* the chips — stages, a shield, Armour, Sturdy,
Trauma, a runner's count — sit in a column on the window's top-left corner, the corner a sprite anchored at its feet
mostly leaves free, never on a row of their own (one grew a card by 18 px). *On a short stage* (under 680 px, as at
720 p; the stage is a size container) the column holds two rows at most — the first chip, then **+N** whose bubble
names the rest — so it never covers the sprite; and a bench foe's second action and its next-turn plan (§5.6.1, §5.5.1)
fold into **Also** and **Then** badges on its intent chip's end, each with its whole bubble, the hits still shown one
by one on your cards. Where the stage is tall, everything is spelled out. A chip over a picture keeps a dark edge.

### §9.2.2.4 Hand tray
One row (v0.9.15; the header row it replaced cost the hand 60 px at 720 p): the hand and the Bag in the middle, End
Turn and, in a run, Run under it on the right — the exit quieter than the plan. **The AP capsule** (v0.9.16) sits in
the middle of the screen, the user's call: docked at the bottom centre of the field, right over the hand it is spent
from and clear of both formations — the number beside a pill of cells, one per point, gold like a card's cost gem,
draining as you play, and **no bubble covers it** — a card's steps aside, still over its card — and it keeps its
place while its number reads a preview. Of a capsule that fills, a sphere that drains and a striped bar, the cells are the one you can
count at a glance. **While a card is under
the pointer** — hovered, dragged or held — the cells it would spend go striped and the number reads `3 → 1` (a free
card changes nothing, so shows nothing); a card you cannot afford shows the cells you are short in red. The Defensive discount chip sits beside it when it is live. The next swap's price is not repeated here: it is on
each bench card, where the swap is clicked, with the ladder in that card's bubble. A hand wider than its row — a
relic's sixth or seventh card, or a narrow screen — tucks each card under its neighbour by just enough to fit, never
pushing the Bag. The deck and discard counts live in the top bar.

## §9.2.3 The move card

The card's **frame is its move's type colour**, so a hand reads as a type spread at a glance; everything on it
sits in insets that stay legible on any type (v0.9.15, the user's "one of the ugliest parts of the art"):

| Part | What it shows |
|---|---|
| **Head** (dark) | The **AP cost as a gold gem** (a cost changed this turn — Paralysis, a rule — wears an amber ring and the foot says `was N`) and the name, with the whole width for it |
| **Window** (dark, lit in the type's colour) | **The move itself**: its pixel illustration at 2× on one 68-cell grid for the whole set (D9; `public/art/moves/`, lane in `docs/art/pipeline.md`) — and the **owner**, its box sprite at 1× bottom-left (its name is in the bubble), so five cards from three Pokémon read as five moves and three owners. The ×N chip top-left; the Mastery star and a Step arrow top-right |
| **Plate** (cream) | What it does (`describeMove`), two lines held open so a row's gems line up |
| **Foot** (dark) | Range and role glyphs, the **power** in a dashed pill (a dash for none), the type's own pixel label (FRLG) |

**Dragged, the card itself travels** (v0.9.16), from the drag's first move: it hangs under the pointer, its place in
the hand left faded and its bubble shut, and over a target it can take it shrinks, lights and lifts up and aside, so the
target's own card — its number, its HP — stays in sight. The ×N chip sits on the window's top-left: how the move's type lands on the enemy Lead, green up, dark down. The
whole card's explanation is its one bubble, and it names the role in words (Offensive · Defensive · Utility) — the
foot's second glyph, which is the card's own and not the TypeChart's sword and shield. **The same picture lands on
the target**: when a move hits, its illustration flashes over the Pokémon it struck at 3× for about half a second,
with the lunge — an enemy's moves on your Lead too; never under reduced motion. A hand bigger than five tucks each card
under its neighbour so the row keeps its width. An item card (the Bag, §3.5) is the same anatomy smaller and pill-soft —
cost gem and name, the item on a lit window, what it does on the plate — its frame coloured by what it does: a
ball red, medicine green, a battle item blue.

**The two ways a card can be unplayable are colour-separated on purpose:**

| State | Treatment |
|---|---|
| **Not enough AP** | An amber border, a warning glyph in the foot, the picture faded, and an amber **Not enough AP** tag on the card's top edge, over the hand (the user's note, 2026-10-19) |
| **Out of position** (a Melee card whose owner is not the Lead; also asleep, frozen, sealed) | A dashed edge, the picture faded, and a **blue band across the window**: `Melee` in bold and `needs Lead` beneath |

Amber means AP. Blue means position. Neither card is ever hidden, and neither loses its words: the name, the cost, the
plate and the owner stay at full ink, because they are what you plan the swap or the next turn with (D5).

Full anatomy: [`ui/design-system.md`](ui/design-system.md).

## §9.2.4 The damage preview

Triggered by hovering or dragging a card onto a target, appearing beside that target. **Against a group it is
per target** (§5.6): while a card is hovered, selected or dragged, each enemy it can reach shows that card's own
number on its panel, each one it cannot shows the blue out-of-reach lock, and the full breakdown below opens for
the enemy the card points at (under the drag, or under the pointer once the card is selected). An area card
shows a number on every enemy — never one "each" figure. In a group the card's own corner prints the move's
**power**, outlined so it cannot pass for a hit. **Dragging** is by pointer (mouse, pen or finger): a pill with
the move's type label and name follows the pointer; a drop on an enemy aims the card there, a drop above the
hand plays a card that takes no enemy (or hits them all, or has only one to hit), anywhere else lets go; Escape
cancels. It always shows:

- the **final calculated damage**, large,
- the breakdown — base, STAB, type effectiveness, range, field, relic and item terms,
- the crit chance when it is non-zero,
- the status rider and its chance,
- a redundancy warning ("Already Burned"),
- and a **KO flag** when the hit would finish the target.

This is Pillar 1's single most important element. It calls the same function the simulation calls; a preview
that disagrees with the outcome is a bug, never a rounding difference.

## §9.2.5 Intent vocabulary

| Icon | Intent | Display |
|---|---|---|
| ⚔ | Attack | `⚔ 24 → Lead (Squirtle)` |
| ⚔🌐 | Cleave | `⚔ 18 → ALL SLOTS` |
| 🎯 | Backstrike | `🎯 22 → Bench-L (Charmander)` |
| ⬆ | Buff | `⬆ Atk +1` |
| 🛡 | Stall | `🛡 Def +1` |
| 💢 | Status | `💢 BURN → Lead` |
| ❓ | Unknown | `❓` **plus the kind glyph** — you know a Cleave is coming, not how hard |
| 👤+ | Call for help | `Call for Help → +Nidoran♀` — who will join, by name (§5.6.2) |

A Pokémon that **acts twice** (§5.6.1) shows its second intent as a second chip under the first, marked *Also*
with a dashed border; each has its own number and its own intent card.

**A wasted hit** (the user's report, 2026-10-19): an attack on a slot whose Pokémon an earlier intent this turn has
already knocked out hits nothing (§3.2.5). Its chip does not print 0: it prints the number it *would* have taken,
struck through (`forecast.moot`), and the portrait hangs it after the KO chip, dashed and struck — so the overkill
reads as overkill, and a swap that saves the Lead shows what the later hits would then do to whoever stands there.
While the foes' moves are playing (§9.9.2) and while the fight opens, the hits aimed at your side are not shown at
all: the next turn's intents wait for this one to land.

The intent number **recomputes live** when the player swaps, because it is predicted against whoever now
occupies the slot. The v0.1 playtest identified this as the element that makes the swap decision legible; it is
not an optimisation, it is the feature.

**As Lead** (v0.8.6, the user's idea): every living bench Pokémon carries a small **−N** badge in its corner (its bubble says "as your Lead") whenever the
visible intents would land something on it at the Lead — the same dry run with it leading, so it is the number its
portrait would show after the swap (red, with KO, when it would faint). The intent card of a hit aimed at your Lead
lists the same hit on each of them ("If Squirtle led: 10"). Pillar 2: the swap is priced in HP before it is made.

**The number is the hit** (§5.2): the dry-run Resolution's, so it matches what lands. **An area intent prints no
number on its chip** (user, 2026-09-25): `Bulldoze → ALL` — every target takes its own damage (type, Defence,
ability, held item), so the numbers go on the portraits it will land on, one each. **No area hit ever shows one
number**, on either side. A single-target chip keeps its `· N dmg`, which is the same number as the chip on the
portrait it is aimed at. A Healer's or Buffer's intent names the ally it lands on (`Soft-Boiled → heals Geodude`).

## §9.2.6 The intent card

Resting on an intent chip (or focusing it) opens the **intent card** — the enemy side's counterpart to a move
card's bubble (user, 2026-09-25): the move, its type, its power and range; who it is aimed at (a slot and its
occupant, your whole side, or the ally it heals or raises); **the HP it takes off each Pokémon it lands on** and
whether that knocks it out (the forecast's numbers, the same as on the portraits); its riders (a status and its
chance, a stat change, a heal, recoil, drain); and its recharge. The kind's one-line counsel sits at the foot. A
hidden intent (§5.5) opens the kind and nothing more. The numbers stay on the screen; the card is the full read.

---

# §9.3 The map screen

```
┌────────────────────────────────────────────────────────────────────────┐
│ Region 1 · column 6 of 20      Brock (Rock) · Misty (Water)     ₽ ◓ 🎒  │
├──────────────────┬─────────────────────────────────────────────────────┤
│  Active Team     │ ◀ scroll ▶                                          │
│  [Lead ★] [B][B] │  🧢- - -🌿- - -?╲ - 🧢- -🌿- - (cave) - -🌿- - - 🧔    │
│                  │  ✓━━━🧢━━━◉┉┉┉🌿╳ - 🎒- -⚔- -┤                        │
│  Box             │  🌿- - -💊- - -🧢╱ - 🌿- -?- - (water, rain) - 🧢- 👧   │
│  ⚪ ⚪ ⚠2 ⚪ …    │  [ the whole route in a strip, your view outlined ] │
└──────────────────┴─────────────────────────────────────────────────────┘
```

The route runs **left to right**, the way a Pokémon route is walked, and it is wider than the screen: the graph
is a horizontal scroller over the painted terrain (§2.5.4), dragged, wheeled or keyed (arrows, Home/End), and the
view follows the player — it centres on where you stand after every node and on a node when you open its
preview. A strip under the graph shows the whole route at a glance with the visible window outlined; clicking it
jumps there. The vertical map was a roguelike convention borrowed from a game about climbing a tower; a route is
a road.

The terrain is drawn from tiles at whole-pixel scale, so the FRLG pixel stays crisp: open ground, the scenery
between the routes, each lane in its Gym's terrain, the point of no return as a river with a bridge under every line
that crosses it, and a lane's Battlefield drawn over it as weather (§2.5.4).

**The routes are lines, the nodes are the things themselves** (v0.9.14, the user's note after Pokelike's map: "es
bastante limpio, y la ruta que el jugador querría seguir queda bastante clara, ya que los iconos son bastante
representativos de lo que va a venir"). Every edge is one **straight line** from node to node — diagonal where the
route changes track — so a route reads as a line you can follow and two edges never share a stretch of road. (The
FireRed roads that turned at right angles before it made a node seem to lead wherever a neighbour's road did.) The
lines speak in four registers, each with a dark casing so it holds 3:1 on any ground: **the steps you can take now**
solid gold, marching toward where they lead; **the routes still open** from where you stand dashed cream; **the road
behind you** solid; **a route you can no longer take** a faint dotted trace.

A node is drawn as **what it is**, standing on its point with a shadow under it: a trainer is its class's sprite, the
Elite its trainer, a Gym its Leader at twice the size with a gold glow; a Wild Area the Pokémon you will meet most,
peeking out of the grass (or the water, on the sea and the river); the Elite Wild the Pokémon itself; the nurse and the
merchant themselves; a find the item lying there; a Mystery the overworld's "?". State reads through the picture —
full colour on every route still open from where you stand (`nodesAhead`), faded where you can no longer go,
darkened with a tick once cleared — and through a ring on the ground: pulsing gold where you stand, gold under the
nodes you can step to next, which also bob on their spot. Only the Gyms and the Elite carry a caption; any
other names itself under the pointer, and its bubble says the rest. The node's preview opens over the route dimmed
and softened, never over a black void, and wears the same picture as the node. The strip under the board draws
the routes and every node in miniature — a fight a filled dot, a stop a ring, the Gyms diamonds in their types'
colours — the walked road dark and the closed routes faded, so the whole Region's choice is one glance.

The left column is the Active Team (three tiles, the Lead crowned) above a scrollable Box. Trauma badges overlay
any portrait; fainted Pokémon are dimmed but still draggable, so you can prepare a post-nurse line-up.

---

# §9.4 Iconography

## §9.4.1 Node icons
Wild 🌿 (its biome's emblem) · Trainer 👤 (its archetype) · Elite Trainer 👤⭐ · Elite Wild 🦕 · Field nurse ❤️ ·
Merchant 🛒 · Mystery ❓ · Something on the ground ◓ (the item ball) · Gym 👑 · City 🏙️.

## §9.4.2 Resource icons
AP ● · Poké Dollar ₽ · Pokéball ◓ · Trainer XP ⭐ · Token 🪙 · Trauma ⚠ · Mastery 🏆.

## §9.4.3 Status icons

| Condition | Icon | Tint |
|---|---|---|
| Burn | 🔥 | Fire |
| Poison | ☠️ | Poison |
| Paralysis | ⚡ | Electric |
| Sleep | 💤 | Desaturated blue |
| Freeze | 🧊 | Ice |
| Confusion | 💫 | Yellow-magenta |

Every one carries a distinct glyph shape, so the row reads in grayscale.

## §9.4.4 Type charts

A type badge explains its matchups on hover, as a chart of the games' own type labels — one row per multiplier, its
value a coloured pill (v0.9.6). **Attacking and defending never read alike**, because the same ×2 is good news on your
move and bad news on your Pokémon:

| Where | Reads | Rows | Colours |
|---|---|---|---|
| A move's type (a card, the Move Manager, the Dojo) | ⚔ *When it hits* | ×2 · ×½ · ×0 | gold for ×2, a muted pill for ×½ |
| A Pokémon's types (a portrait, a panel, the Box) | 🛡 *When it is hit*, both types together | ×4 · ×2 · ×½ · ×¼ · ×0 | the reds for ×4 and ×2, the greens for ×½ and ×¼ |

×0 is grey on both. A damaging card's own tooltip carries its type's attacking chart, since hovering the card is how a
player reaches its type in a fight.

## §9.4.5 Progress after a fight

The reward screen (§3.5 in `ui/screens.md`) says what the fight gave as pills and chips, the words on hover: per
Pokémon, its XP and, on a level-up, the stats gained (old → new on hover), the moves learned (an outlined chip
"in the pool" past four), *Ready to evolve*, the Bond and what a Bond rank opened (the hidden ability as its own chip);
then what the fight moved on the account — each medal and Tier-2 discovery with its bar, *Done* when it completed —
and the loot as one strip. Progress made **outside** a fight (an evolution, a recruit, a run's end) shows in the
**progress panel**: a dark note in the bottom-left corner, one at a time for a few seconds, never taking a click, held
while a fight or its reward screen is up — a fight's own news is its reward screen's (v0.9.6).

---

# §9.5 Audio

> ✅ **v0.9.23** — built 2026-10-16 (the user's note 12, pulled forward from v1.1). Code: `src/ui/audio/` — `synth.ts`
> (the Web Audio synthesiser: a tone and a filtered noise, two buses under a master), `sfx.ts` (the recipes and
> `sfxForEvent`), `music.ts` (the tracks and `notesForBar`), `director.ts` (`trackFor`, `inTension`), `useAudio.ts`
> (the hooks); the volumes in `settingsStore`; `e2e/audio` renders every sound offline and measures it.

## §9.5.1 Direction
**Every sound is made as it plays** — a Web Audio synthesiser with two voices, a tone (an oscillator with a pitch glide
and an envelope) and a filtered noise burst, and no recorded files at all: nothing to license, nothing of Nintendo's,
and the whole of it a few kilobytes. *Why (the fan-game study's cheap path, 2026-10-14):* a game that plays in a
browser tab and ships as a portfolio piece gains more from a coherent, small, chip-flavoured voice than from stems it
could not author. Themed per Region; combat follows the fight's tension; every player action has feedback, every
status has a motif, and the bosses and the Champion get their own tracks. Sound starts on the first click or key press
(the browser's rule), and is silent until then.

## §9.5.2 Combat stems

| Stem | Trigger | Built as |
|---|---|---|
| `combat_base` | Always playing | The fight's track: **combat**, or **boss** for a Gym, an Elite, a League door or a Legendary's arena, or **champion** |
| `combat_low_hp` | Team total HP below 30 % | The **tension layer**: the bass doubled an octave up, the hats doubled, the kick pushing on the off-beats |
| `combat_setup` | The first two turns of a boss fight | — (the boss track carries it) |
| `combat_phase` | Boss Phase 2 or 3 | A **sting** on the phase change: rising, then a hit and a low chord |
| `combat_victory` / `combat_defeat` | Outcome stings | Two short arpeggios, up and down |

A new track cross-fades over the old one in 250 ms; the tension layer is read at every bar.

## §9.5.3 SFX
Type-coded card whooshes — a swish under each of the fifteen types' own colour (Fire crackles, Water splashes,
Electric zaps, Ground rumbles) · a soft chime for consumables · a confident step plus chord for a manual swap ·
directional whooshes for Step-Forward and Step-Backward · a soft fall for a faint · a status sting each (Burn, Poison,
Paralysis, Sleep, Freeze, Confusion) · a crystalline ping for a crit · a heavy layered impact for super-effective · a
muted thud for resisted · a rising or falling triplet for a stat stage · paper shuffle for draws · a solid bell for End
Turn · rising tension then a hit for a boss's new phase · **the catch, each sound on its frame of the ball's animation**
(`catchSounds`, the user's report of 2026-10-19 that it drifted): the throw as the ball leaves the hand on screen, the
beam as it opens on the Pokémon, a tap and a smaller one as it lands and bounces, each wobble as the ball rocks (after
the still moment that opens its cycle), and the click or the burst as the ball shows it — started by the ball itself, not
counted from the fight's events · a level-up run · the evolution's rise as the sprite whitens and a fanfare as the new
Pokémon stands in its colours · a soft tick for every button. A turn's sounds play a beat apart, in the order they
happened.

## §9.5.4 Music
Each track is a key, a tempo, a four-bar progression and the patterns its voices play — a lead, a bass, a held pad and
a little kick, snare and hat — composed in code (`TRACKS`). Region 1 a light flute-like lead over strings, ~110 BPM
major · Region 2 brass-like and tense, ~115 BPM minor · Region 3 percussion and sub-bass, ~125 BPM modal (dorian) minor
· Cities and the Hub a warm looped jingle · Victory Road sparse, ~85 BPM · the League a steady minor march, ~130 BPM ·
a fight ~140 BPM minor · a boss ~150 BPM phrygian · the Champion ~156 BPM dorian · the title a hopeful march · **the
evolution** (the user's note, 2026-10-19), a scene's own loop over the screen's (`music.setScene`): a hushed pulse of
eighths under a circling figure, the chord climbing a step a bar so it never settles, ~144 BPM — ours, as every track
is — hushed for the fanfare, the screen's music back when the scene ends. *Divergence
(2026-10-16):* one League track, not one per member, and the Champion's is one composition with the tension layer
rather than three phases; a track per member is for the music pass after v1.0.

## §9.5.5 Mix
Two volumes the player sets — **Music** and **Effects**, each Off / Low / Medium / High (defaults Low and Medium) — over
a master at 0.8: the music a bed under the effects. Every recipe and every track's bar is **rendered offline and
measured** (`e2e/audio`): audible (an effect's peak over 1 %, a bar's RMS over 0.5 %) and never clipping (peak ≤ 1).
The LUFS targets wait for a real mix pass; the synthesiser's levels are the authoring-time normalisation for now.

---

# §9.6 Accessibility

**Staged, not deferred to nothing.** The full suite was originally a launch requirement, then postponed
wholesale; both extremes were wrong. The two items that are expensive to retrofit come early, the rest follow
at polish.

| Item | Version | Why then |
|---|---|---|
| **Reduced motion** | v0.2 ✅ | Brought forward. Honours `prefers-reduced-motion`: the shake, lunge, deal and pop fallbacks are per-component, and a blanket rule caps *every* animation at one iteration so nothing pulses forever. One-shots keep running, because a `forwards` animation carries its element to a final state and killing it strands damage numbers mid-air |
| **Keyboard play** | v0.2 ✅ | Brought forward. The whole fight runs from the keyboard: 1–9 pick a card, E ends the turn, Escape cancels. Tab order still works; this is the fast path |
| **Screen-reader labelling** | v0.2 ✅ | Brought forward from post-v1.0. Every control carries a name, cards read as a sentence rather than a pile of glyphs, and a polite live region narrates the fight and the map. Asserted by `e2e/a11y.spec.ts`, so it cannot rot |
| **Focus management** | v0.2 ✅ | Every modal takes focus on open, cycles Tab inside itself, and hands focus back on close |
| **Text size** (80 / 100 / 125 / 150 %) | v0.5 | Layouts have to be built at 150 % from the start or they clip |
| Basic settings — audio, fullscreen, language | v0.1 ✅ | Shipped; the Music and Effects volumes since v0.9.23 (§9.5.5) |
| Colour-blind palettes and pattern overlays | v1.1 | The shape-not-just-colour rule (§9.1.3.2) is already enforced, which is the hard half |
| SFX subtitles | v1.1 | Needs the audio pass first |
| Full key and pad rebinding, two profiles | v1.1 | |

The four brought forward were all cheaper to do now than to retrofit, and three of them are the kind of thing
that silently decays the moment nobody is checking. `e2e/a11y.spec.ts` is the check.

**Always true, from v0.1:** every hover has a focus and tap equivalent; nothing unplayable is hidden, only
marked; the damage preview is text as well as colour; pause is available mid-Action-Phase; flashes are capped at
photosensitivity-safe frequencies and disabled entirely under reduced motion.

## §9.6.1 Cognitive accessibility
A tutorial mode with longer telegraphs and slower pacing; an optional hint overlay suggesting a strong play,
off by default and with no penalty for using it; and a Pokédex study mode that previews an enemy's intent pool
against your current team's type matchups.

---

# §9.7 UI architecture

The UI is a **view**: it reads state, dispatches actions and computes nothing but formatting. It never owns
game state and never re-implements a rule — the damage preview calls the simulation, and playability comes from
the simulation as a boolean plus a reason.

Components are state-driven by class, styled from the design tokens of §9.1.3, and structured per screen in
[`ui/design-system.md`](ui/design-system.md). Every display string is localisation-ready with a namespaced
key; no literal English in a component.

> The per-screen specs in `ui/` name their data sources in Unity-era vocabulary — "channels" and "SOs". Read
> those as **store selectors and content lookups**; the binding *shape* is correct even where the noun is not.

---

# §9.8 Mobile

Not a launch target, but kept cheap: hit targets are at least 44 × 44, every hover has a tap equivalent,
tooltips can be tapped open, and layouts reflow from 4:3 to 21:9. A real mobile port is a roadmap item, not a
commitment.

---

# §9.9 Motion

| Element | Motion |
|---|---|
| **Pokémon** | 2-frame idle breath · a move's own animation (§9.9.2) · flash and recoil on damage · 3-frame faint fade · an 8-frame evolution sequence |
| **Cards** | Draw slides from the deck (200 ms) · play lifts, glows and fades toward the target (350 ms) · discard fades (150 ms) · the hand fans in |
| **Camera** | Locked in combat; a 1px shake on heavy hits, the whole stage shaken by Earthquake (§9.9.2) · smooth pan on the map · a 1.5 s zoom and chord for a boss intro |

**The choreography principle:** anything the player must *read in order to decide* — an intent, a damage
preview, a catch gauge — appears **instantly and persistently**. Flourish animates; information does not.

Under reduced motion: bars jump, arrows and previews appear instantly, no parallax, no shake, no particles.
Damage numbers keep a 1.2 s hold and a fade, because persistence is what makes them readable.

## §9.9.1 The arena's beats

The series' own beats, drawn in the arena on top of a result the sim has already decided (v0.9.3):

| Beat | What the player sees |
|---|---|
| **Sent out** | A Poké Ball flies in an arc from the trainer's hand — the foe's trainer, or yours from off the left edge — lands, and pops open; the Pokémon whitens and grows out of a ring of light. The foes first, staggered, then your Lead, then your bench. A wild one steps in from the grass instead. A trainer's next Pokémon comes out the same way. **No card before its Pokémon** (the user's note, 2026-10-19): while a Pokémon waits in its ball its whole card is unseen, its place kept, and the card comes in with it; the intents' arrows and the hits aimed at your side wait until your last Pokémon is out. |
| **Swapped** | No ball (the user's note, 2026-10-19): the two cards **glide between their places**, the Pokémon in them — the bench card forward to the Lead, the Lead back to the bench — a FLIP on the card itself (`FX_MS.swap`). A replacement after a faint, a Step-Forward, a Step-Backward and a forced swap move the same way. |
| **Fainted** | A fallen Pokémon holds a beat and flashes, then sinks through the ground line as it greys and fades out — gone by the last frame, never cut while it still shows, and it never fades back. A foe's card fades with it in its place, and the others hold theirs until it has gone (v0.9.11). A trainer's, or yours, then goes back into its ball, which flies back to the trainer's hand before the next one is thrown. A wild one simply goes. |
| **Evolution** | "What? Bulbasaur is evolving!" on a dark stage; the sprite turns to light, the old and the new shapes trade places faster and faster — never under 100 ms, both the same light, so a shape changes and not a screen's brightness — a bloom behind it, and the new Pokémon in its colours: "Congratulations! …". A click or a key skips it; it plays before the path is chosen when every path makes one species, after when they differ (v0.9.6). |
| **The catch** | The ball is thrown in a parabola — across at an even pace, up and down under gravity, its path never spun (v0.9.16: a rotated path swung it round in a loop), and never higher than the field has room for, so a Bench 1 at 720 p gets a flatter throw rather than a ball out of sight — opens on the Pokémon and draws it in, falls to the ground with a bounce, and rocks: a still moment, then a rock, once per shake check (§2.6.4.4) — three wobbles, a still moment, and the click with three sparks on a catch; on a break, the ball bursts open as the wobble its check followed ends, and the Pokémon is back in its card with the burst (v0.9.16: a still moment and a second's wait after it read as the beat stalling). The ball shows only its wobbles: the chance was on the pill before the throw (v0.9.16, the user's call: the lights under it went). "Gotcha!" or the series' line for how close it came lands with the click or the burst. About six and a half seconds for a catch, the series' pace; a break is over sooner. |

The beats are presentation only: the catch's result is rolled first (§2.6.4.1) and the ball only shows it. A beat
the player should not talk over — the catch and a faint — holds the hand, the keys and the outcome until it has played,
and the combat log keeps the catch's result back until the ball tells it; a Pokémon coming out never holds the hand, so
a fight can start at once. Their lengths are one table (`FX_MS`) that the timers and the keyframes both read. Under
reduced motion every beat is instant.

## §9.9.2 Moves

> ✅ **v0.9.24** — built 2026-10-18 (the user's note: "not a sprite appearing on the target, but a whole animation").
> Code: `ui/moveMotion.ts` (`motionOf`, `MOTION_MS`, `AREA_MOVES`), `useCombatFx` (`MoveFx`, the impact on the batch's
> clock, the move clock across batches, the HP and the log held to the impact), `ui/components/MoveFx.tsx` +
> `.module.css`, the numbers' layer in `CombatScreen`, `.fx-quake` and `.fx-dashing` in `motion.css`.

**Every move is animated from its user to what it hits**, read from the move's own row — its range, its reach, its type
and its power — so a move added to the content has its animation before anyone draws one:

| Kind | Which moves | What the player sees |
|---|---|---|
| **Melee** | A damaging Melee move | The user winds up, **dashes across the field** to its target, jabs into the blow and comes back to its card. Its sprite waits unseen in its card while its double crosses; the card itself stays |
| **Thrown** | A damaging Ranged move | A glow gathers on the user, then the move **flies along the line** to its target in its type's shape — a fireball with its tail (Fire), bubbles (Water), leaves (Grass), shards (Ice), rocks (Rock, Ground), needles (Bug), sludge (Poison), rings (Psychic), stars (Normal), a gust (Flying), a shadow (Ghost), an orb (the rest) — one, or a volley a beat apart |
| **Stream** | Flamethrower, Water Gun, Hydro Pump, Ice Beam, Psybeam, Bubble Beam, Aurora Beam, Hyper Beam, Solar Beam, Tri Attack, Sonic Boom | One continuous **beam** from the user to the target: it grows, holds and thins away |
| **Lightning** | Thunder Shock, Thunderbolt, and every other Ranged Electric move | A jagged **bolt** drawn from the user to the target, flickering |
| **Drain** | Absorb, Mega Drain, Dream Eater | A tendril to the target, the hit, and the life **flowing back** to the user as motes |
| **Stage** | Surf, Earthquake, Fissure, Blizzard, Thunder, Fire Blast, Rock Slide, Explosion, Self-Destruct, Petal Dance, Psychic, Razor Wind, Night Shade, Pin Missile, Dragon Rage — and **any move that lands on several at once** | The **whole stage** takes it: Surf a wall of water rolling across from its user's side; Earthquake the floor splitting from side to side, dust the width of the field, stones jumping and **the stage itself shaking**; Blizzard a driven storm of snow with frost at the edges; Thunder the sky darkening and a bolt striking each target; Fire Blast a great fireball and a wall of flame where it lands; Rock Slide rocks falling from above; Explosion and Self-Destruct a blast spreading from the user and a white flash; Psychic and Dragon Rage rings across the field; Petal Dance, Razor Wind and Pin Missile streaming across it. A move hitting several with no picture of its own fills the stage in its type's way |
| **Glow** | A move with no power that raises, heals or guards | Rings rise from the user's feet — or its ally's — in its type's light |
| **Hex** | A move with no power that puts a status or a lowered stat on the foe | Motes thrown at the foe and a swirl round it |

**The hit lands with its impact.** The damage number, the shake, the HP on the target's card and a burst of sparks in
the type's colour all wait for the moment the move arrives — the dash's end, the projectile's landing, the wave's
crest — so nothing reads before the blow: until then the card shows the HP it had. The log does the same: the line
naming the move as it is used, what it did when it lands, and a faint as its beat starts. A move that lands on several
lands on each a beat apart. A foe's move plays the same way, back across the field. An upgraded card (`-plus`) moves
as its base move. The move's own picture (§9.2.3) is not flashed on the target as well: the motion is the picture (it
still lands for an attack no move is drawn for). The numbers rise on a layer of their own over everything a move draws,
each over its Pokémon's sprite — a word about the hit (CRIT, Super effective, a status, a stage) a row under its
number, never over it — and the AP stays above the field's beats.

**One clock for the moves.** A move does not hold the hand — you may play the next card while one plays — but it waits
its turn: a card played while the last move is in the air starts when that one lands, and a Pokémon that has dashed
comes back to its card before it moves again. The enemy's turn starts the same way, and plays out before the next is
shown: the foes' next intents and your hand wait until their moves have landed. A move drawn while a fallen foe's
faint plays is aimed by the line as the screen still holds it. The kinds' lengths are one table (`MOTION_MS`, about
half a second to the impact and three-quarters for a dash or a throw, a second and a quarter for the stage, with the
impact's burst, the stagger between targets, every volley's and field's stagger and the stage's own beats —
Earthquake's shake, the flashes, the stones — beside them) that the timers and the keyframes both read, as `FX_MS` is
for the beats. They are presentation only: the sim has already decided the hit. **Under reduced motion none of it plays**: the number and the
HP land at once, as before.

**Flat, beside pixel sprites (D9).** Every shape is drawn flat — hard colour stops, an outline darker than its type,
no blur and no soft glow — and what spins turns in steps; the dashing double moves and never scales or turns. What
rises from a target's feet (Fire Blast's flames, Rock Slide's dust, a fog) is sized from its sprite's box, so it stays
in its window and off its plate; what happens in the ground itself (Earthquake's cracks and dust) is drawn under the
cards. Surf's wave is a slope of banded water under a white crest; Blizzard's frost closes in as flat frames. Every
beat ends with its impact's burst played out, and every stagger fits inside it — nothing is cut off as the move goes.

*Why (the user's call, 2026-10-18):* the card's picture flashed on the target said *what* hit, not *how*. A Pokémon that
crosses the field to hit, a Water move that arrives as water, and Surf as a wave the whole screen sees make each card
in the hand a different thing to play; the moves' own shapes, coloured by type, carry the Gen I feeling without a
frame of the series' art.

---

# §9.10 Localisation

Every user-facing string is a namespaced key (`ui.combat.end_turn`, `move.tackle.name`, `species.pidgey.name`),
never literal text in a component. Layouts tolerate **+40 % string length** and CJK line-breaking without
clipping; buttons hug their content with a minimum width. Numbers, dates and currency go through the formatter.

| Locale | Status |
|---|---|
| English (en-US) | Primary |
| Spanish (es-ES) | Planned for v1.1 |
| French, Japanese | Later; Japanese needs a CJK font |

---

# §9.11 Build order

| Surface | Version |
|---|---|
| Combat screen, scenario picker, main menu | v0.1 ✅ |
| Map, node preview, post-combat reward, team and loadout, starter select, victory, defeat, pause | v0.2 |
| Evolution, Move Manager, TM screen | v0.3 |
| Shop, Mystery Event, inventory | v0.4 |
| Legendary pick, Pokédex, achievements, settings expansion | v0.5–v0.6 |
| City plaza, Dojo, Grand Dojo, Black Market | v0.7 |
| Audio, the accessibility tier, localisation, generated backdrops | v1.1 |

---

# §9.12 The screen inventory

Twenty-seven screens, each with a written spec in [`ui/`](ui/) and a rendered mockup in
[`ui/mockups/`](ui/mockups/). Three are built.

## §9.12.1 Flow

```mermaid
flowchart TD
  Boot[Boot] --> Main[Main Menu]
  Main --> NewRun[New Run: difficulty → starter → relic → region modifier]
  Main --> Hub[Trainer Hub] --> Ach[Achievements]
  Main --> Settings
  NewRun --> Map[Route Map]
  Map --> NP[Node Preview]
  NP --> Combat
  NP --> Center[Pokemon Center]
  NP --> Shop
  NP --> Dojo
  NP --> Mystery[Mystery Event]
  NP --> City[City Plaza]
  City --> Center
  City --> Shop
  City --> Dojo
  Combat --> Reward[Post-Combat Reward] --> Map
  Combat --> Evo[Evolution] --> Reward
  Combat --> Legendary[Legendary Pick] --> Reward
  Combat --> Defeat[Defeat Summary] --> Hub
  Map --> Victory[Victory Summary] --> Hub
  Map -.overlay.-> Team[Team & Loadout]
  Map -.overlay.-> Moves[Move Manager]
  Map -.overlay.-> Inv[Inventory]
  Map -.overlay.-> Dex[Pokedex]
  Combat -.Esc.-> Pause
  Map -.Esc.-> Pause
```

## §9.12.2 Inventory

| Cluster | Screens |
|---|---|
| **Front-end** | Boot · Main Menu · Trainer Hub · Achievements · Settings |
| **New run** | Difficulty · Starter · Starting Relic · Region Modifier |
| **In run** | Route Map · Node Preview · **Combat** · Post-Combat Reward · Evolution · Legendary Pick |
| **Node services** | Pokémon Center · Shop · Dojo · City Plaza · Mystery Event · Roadside Trader |
| **Management** | Team & Loadout · Move Manager · Inventory · Pokédex |
| **Run end** | Victory · Defeat |
| **Overlay** | Pause · confirmation modal · toast · tooltip |

## §9.12.3 Notable decisions

- **New-run setup is reversible until the first node.** Confirming the Region Modifier locks the seed and
  generates the map, behind an explicit confirmation.
- **Team and loadout are Map-only** and lock on node entry. There is no mid-combat loadout.
- **The City is a top-down aerial town** with clickable buildings. Picking two closes the rest.
- **The Dojo always renders four move slots** plus the locked Mastery fifth; teaching is a choice of which slot
  to fill or overwrite, and Mastery is never a target.
- **Healing previews show before → after** on each team row: solid for current HP, hatched for the restoration.
- **Mystery choices show outcome tags** — gain, cost, risk. Never blind RNG (Pillar 1).
- **Defeat is warm, not punishing.** It shows how far you got and what you kept (Pillar 5).

# §9.13 The title screen

The front door and the run's first steps, redrawn in v0.9.17 on the user's note 8 ("mejora el arte del main menu y
las primeras pantallas — un fondo animado, que sea de lucha pokemon, usando un arte parecido al del juego"). The
warm-light front end it replaces (a generated town vista and a still mascot) read as a different game from the
fights; the title is now made of the fights' own pictures.

## §9.13.1 The battle behind the title

Across the whole screen, **a Pokémon battle that plays by itself**: one of the game's battle backdrops; the series'
composition — the foe far and high on its battle base, the near Pokémon low with its back to you — set right of
centre, so the menu's column on the left keeps its ground. The sprites are the battle sprites the fights use, at
the whole or half multiple nearest the screen's height (D9), the near one half a step larger. Each wears a small plate,
its name and its HP bar.

**A fight is five hits**: the winner strikes first and lands three, the third the knock-out; the other lands two
between them. A hit is the series' beat — the attacker lunges, **the move's own picture** (§9.2.3) lands on the target,
it flinches and its bar drains — then a breath. The loser faints as a Pokémon faints in a fight (§9.9.1), the scene
fades, and **the next matchup** comes in on its own backdrop: the far one steps in, the near one out of its ball. About
eleven seconds a fight.

**The matchups** are pairs the series is known for (Charizard and Venusaur, Pikachu and Gyarados, Machamp and Snorlax…),
each Pokémon with moves it learns there, never a move its target is immune to, and the winner the one its types favour —
so a fan reading the fight finds nothing off (`src/ui/title/matchups.ts`; no two fights in a row share a backdrop or a
Pokémon). It is decoration: no rule reads it, it takes no input, a screen reader skips it. **With motion off it is one
still frame**, both standing, both bars full (§9.6).

## §9.13.2 The title mark

The name as a mark of its own, not a line of type: **"Pokémon" small and spaced over "Ascendant" large**, cream
lettering with a dark outline and a red step under it, beside **its emblem — a ball whose upper half is a peak**, the
climb a run is. Drawn in code (SVG and the display face), so it is sharp at every size and costs no image.

## §9.13.3 The menu and the new-run steps

**The menu** is one column on the left over a dusk held dark to the column's edge, then gone within a short fade: the mark, the line *Your
party is your deck.*, the buttons (the next step gold, the rest dark glass), the version as the door to What's new,
and the fan-project line, never pushed off the screen (§9.6). The stage theme, cream on dark: the colour is the battle's.

**The new-run steps** (difficulty, starter, Starting Relic) are the same battle carried on — the matchup it was on,
from its entrance — under a dusk the panels read on, in the stage theme: near-opaque behind the header and the step's
heading, lighter below, where the cards bring their own ground. **Each starter is drawn as the fights draw it**: its
battle sprite in the window a combat card gives a Pokémon (§9.2.1), lit in its type, the one chosen breathing.
