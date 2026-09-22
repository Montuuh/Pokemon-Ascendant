# UI doctrine — what every screen of Pokémon Ascendant is held to

The rules a screen is reviewed against after every visual change. The reviewer is `.claude/agents/ui-reviewer`,
the protocol is `.claude/skills/ui-review`, the measuring tool is `npm run ui:audit`. Each doctrine has an id
(**D1**…**D10**) so a finding can name the rule it breaks. Topic 9 (`09-presentation.md`) owns the theme,
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
Text meets WCAG AA: ≥ 4.5:1 for body, ≥ 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold). On the light theme
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
`?scenario=`) still lands, and nothing overflows or wraps into a column at 1920 × 1080 or 1280 × 720. The
e2e for the screen passes and its screenshot has been *read*.

### D9 — Pixel-art kin
The battle sprites, portraits and type labels are pixel art. Anything placed beside them is either pixel art
too (nearest-neighbour scaled, integer or half multiples) or so plainly *ours* — flat, rounded, warm — that it
reads as the frame around the picture, never as a competing picture. No third-party icon style for a thing the
games already drew.

### D10 — One voice
Strings on a screen come from the content row or the string tables; tooltips from `tips.tsx`. The same thing
is called the same name everywhere (Bond, Familiar, Token, Lead, Active Team, Box). English in the product;
§-numbers never appear on screen, and neither do roadmap versions — a thing that is not here yet says "not
yet", not "v0.7". *(Line added by the first review, 2026-09-22.)*

## Severity

| Level | Means | On a review |
|---|---|---|
| **Blocker** | D5 contrast failure on body text · D8 broken interaction or overflow · D2 a mystery with no door on a decision-bearing element | Fix before the change is done |
| **Should** | D1 / D3 / D4 violations on a base screen · D7 garbage · D6 literals | Fix in the same change unless the user says otherwise |
| **Nit** | wording, spacing, a door that could be one level closer | Note; fix if cheap |

## What the reviewer produces

A verdict line — **Ship** / **Ship with fixes** / **Rework** — then findings ranked by severity, each with the
doctrine id, the file and line, what is seen (screenshot name or audit number) and the concrete change. Then the
**garbage list** (D7) as a checklist. Then, if the screen is good, one line saying what it does well, so the
pattern is kept.
