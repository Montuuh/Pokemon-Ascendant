---
name: slop-remover
description: >
  AI Slop Remover for Pokémon Ascendant — finds and removes the text an AI adds that the player does not need:
  narration of the screen, explanations of how the game is built, dev and roadmap leaks ("not working yet", "a
  later version"), aphorisms and "not X, but Y" flourishes, reassurance and praise, pillar slogans stated as
  facts, the same rule repeated in every bubble, and defensive clarifications against misreadings nobody had.
  Covers every player-facing string: screens, components, tooltips (tips.tsx), string tables, the combat log,
  content JSON (moves, relics, items, species paths, trainers), and What's new. Use when writing or reviewing
  copy, when the user says a screen or bubble has too much text or "suena a IA", before a UI review of new
  screens, or as /slop-remover [audit|apply] [path|surface].
argument-hint: '[audit | apply] [path, e.g. src/ui/screens/ShopScreen.tsx | surface, e.g. tooltip]'
---

Request: $ARGUMENTS (default: `audit` of the files changed since HEAD)

The player reads this game at a glance, mid-decision. Every visible word must help them **decide, act or
recover**, or be the game's own content (a story event, a rules page, a trainer's line). Text that describes the
screen, the build or itself is slop. When unsure, the fix is less text, not different text. Standard:
`docs/design/ui-doctrine.md` D1 (minimum text), D2 (explain on demand), D10 (one voice); tooltips are built in
`src/ui/tips.tsx` and strings in `src/ui/strings.ts` (`.claude/rules/ui.md`).

## 1. Find candidates

```bash
node .claude/skills/slop-remover/slop-scan.mjs                         # whole game: totals by surface, top 40
node .claude/skills/slop-remover/slop-scan.mjs --path src/ui/screens/ShopScreen.tsx --all
node .claude/skills/slop-remover/slop-scan.mjs --surface tooltip --all # or: screen, component, string table,
                                                                       # content:relics, sim:combat, "what's new"
node .claude/skills/slop-remover/slop-scan.mjs --json playtest/slop/candidates.json --code   # every string, for a full read
```

It reads the TypeScript AST (so comments, class names, test ids and selectors are skipped), the prose fields of
`src/content/data/*.json` and the What's new entries of `CHANGELOG.md`, tags each string with where the player
meets it, and ranks the pattern hits. **Candidates, not verdicts.** Most slop is not a keyword: a full audit
reads every string (the `--json` dump grouped by file), and anything non-obvious is looked at on its screen
(`npm run ui:audit -- --screens <ids>` or the browser, `docs/session/standing-facts.md` for the shared server).

## 2. Classify every string

**Cut** (slop):

- **Dev and roadmap leaks** (D10, always a finding): "not working yet", "inert in this build", "a later
  version", "in development", "not written yet", "not in the game yet", `§`, `v0.x`, "fixture", "config",
  "uniformly", "legal intents". A thing that is not here says "Not yet", or is not shown.
- **Implementation talk**: how the game computes or produces something the player cannot act on ("the series'
  four shake checks", "made as it plays — no recordings", "shown because you bought…").
- **Narrates the interface**: "click to…", "the X tab has…", "its picture and its bubble say the rest",
  "Inspect the cart before you spend", a hint that repeats the label beside it ("Cleared · this stop is already
  behind you").
- **Design narration**: explaining why the game is built this way ("with every outcome written on the button
  before you press it", "because that is where you decide…").
- **Flourishes**: aphorisms and two-beat punchlines ("Four arms, one plan.", "Cheaper than a wipe, dearer than
  a win.", "The house edge is real."), "not X, but Y" / "X, not Y" constructions, "— it cuts both ways",
  "the Dojo remembers", rhetorical triplets.
- **Reassurance, praise and moralising**: "Your Box is in better shape than most", "One or two catches is a good
  day", "a turn that ends with points left is a turn that did less than it could", "that is a bug worth
  reporting".
- **Pillar slogans stated as fact**: "Nothing is hidden", "Nothing here is a guess" while hidden intents exist.
  A slogan that is false in a corner case is a wrong rule on screen.
- **Defensive clarifications**: a clause that rules out a misreading the player never had ("this is ordinary
  typed damage, not fixed damage", "the signature overrides neither", "the level on the card does not count").
- **Repetition**: the same rule in every bubble that touches it (Trauma, Familiar, "Leaving all three is
  allowed"). Say it once where it belongs — the thing's own tooltip — and let the others link to it or drop it.
- Filler words: actually, really, very, simply, truly, iconic, "a real find".

**Shorten** (keep the fact, drop the words): one sentence where one does, verb or fact first, numbers from the
sim or config, at most one em dash per string (prefer a colon or a full stop), no parenthetical asides stacked.

**Move**: a paragraph on a base screen goes into its tooltip (D1, D2); a rule that only lives in copy goes
into canon first (`docs/design/`) and the copy is built from the content row or the config.

**Keep** (never cut):

- Rules the player needs to predict an outcome (cost, target, duration, condition) and every number that comes
  from config. A counterplay line ("Chip the wall: multi-hits, Burn and Poison.") is the pillar at work.
- Confirmations that state what is lost ("The save is deleted…", "Selling is for good.").
- Errors with a recovery step; empty states with one next action.
- The game's voice where the series has one: battle-log lines ("It's super effective!", "Gotcha!"), trainer
  dialogue, Mystery event scenes, Pokédex-style item flavour, Badge flavour. Cheesy is canon (pillar 5); an AI
  aphorism in a trainer's mouth is still a candidate.
- The fan-project disclaimer, attribution and licence lines (About, main menu).
- Accessibility labels (`aria-label`, screen-reader summaries), even when they read long.

## 3. Audit (mode `audit`, read-only)

Report grouped by class, then by screen, as a table: `path:line or content id · current text · verdict (Cut /
Shorten / Move / Keep / Bug) · proposed text · reason (doctrine)`. Flag bugs found on the way (wrong grammar,
a false rule, a stale number) separately. End with counts and the riskiest changes (anything a test or a
golden reads). Long audits go to `docs/reviews/YYYY-MM-DD-slop-audit.md`. Do not edit in audit mode.

## 4. Apply (mode `apply`, only on the scope the user named)

1. Edit at the source: content rows in `src/content/data/*.json` (and their catalogue row in
   `docs/design/catalogs/` when the description is canon there), strings in `src/ui/strings.ts`, bubbles in
   `src/ui/tips.tsx`, log lines in `src/sim`. Never assemble a replacement sentence in JSX.
2. `git grep` the old text in `e2e/` and `src/**/*.test.ts`; update tests that matched removed copy, preferring
   `data-testid` over visible text. A sim log line may be asserted by a golden: regenerate only on purpose.
3. `npm run check`, then `npm run shot` and read the PNGs of the screens you touched.
4. Copy is UI: finish with the `ui-review` skill. Commit as `fix(ui): …` / `content: …`.

## While writing new copy

Read each new string as the player would, mid-turn. If deleting it loses nothing they need to decide, act or
recover, delete it. If it explains the screen, the code or the design, it belongs in a comment or in
`docs/design/`, not in the game.
