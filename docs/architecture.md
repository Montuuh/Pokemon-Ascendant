# Pokémon Ascendant — Architecture

> Engineering canon for the web build. Replaces the engine-specific parts of
> [`docs/design/10-foundations.md`](design/10-foundations.md); the
> engine-agnostic rules there (§10.4.2 event ordering, §10.5 state tree, §10.7 RNG, §10.8 save layers, §10.11 test
> layers) still apply and are cited from code. Updated 2026-09-19 to describe what v0.1 actually shipped.

## 1. Principles

1. **The sim is the game; everything else is a view.** All rules live in `src/sim` as pure, deterministic
   TypeScript. The UI, the save system and the dev tools only observe state and dispatch actions.
2. **Data-driven content.** Species, moves, abilities, consumables, scenarios are JSON validated by Zod schemas.
   No balance value in code (`BattleConfig` is the one typed config object).
3. **Deterministic and replayable.** Seed + input log ⇒ identical fight. The RNG cursor lives *in* the state, so
   the reducer is a pure function and any state can resume mid-fight.
4. **AI-verifiable by construction.** Every screen is deep-linkable (`?scenario=`), every state is dumpable
   (`window.__ascendant.dump()`), every visual is capturable (`npm run shot`), every fight replayable.
5. **Boring, mainstream tooling.**

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript strict (`noUncheckedIndexedAccess`) | catches the class of bugs a rules port produces |
| UI | React 19 + CSS Modules + design tokens | DOM/CSS is where iteration is fastest; the HTML mockups translated 1:1 |
| Build / dev | Vite | sub-second hot reload |
| State bridge | Zustand (`useAppStore` router, `useCombatStore`) | tiny; sim state in, actions out |
| Immutability | Immer inside the reducer | rules read like the C# they replace |
| Content validation | Zod | schemas = the master schema (§10.3.2) |
| Unit tests | Vitest (151 cases, ~3 s) | colocated with the sim |
| Screen tests + screenshots | Playwright on system Chrome | DOM assertions + PNGs Claude reads back |
| Icons / fonts | Tabler (MIT) + own SVG set; Baloo 2 + Nunito bundled | one family, offline-safe |
| Desktop (v1.0) | Tauri 2; Electron fallback | small binaries |

## 3. Repository layout (v0.1)

```
src/
  sim/                       pure rules
    types.ts                 vocabulary (types, statuses, roles, ranges, slots, intent kinds)
    content/defs.ts          content interfaces the sim consumes (MoveDef, SpeciesDef, ScenarioDef, ContentRegistry)
    combat/
      state.ts               CombatState, Combatant, EnemyCombatant, Intent, actions, events, reject reasons
      battleConfig.ts        every balance knob (divisor 8, ladders, statuses, AI weights, phases, trauma)
      setup.ts               createCombat(scenario) → state after Draw+Intent; rngFromState
      reducer.ts             combatReducer(state, action, ctx) — validate → produce(draft) → apply
      turn.ts                beginTurn (Draw+Intent) · resolveTurn (enemy action → ticks → discard → outcome)
      enemyTurn.ts           executeIntent — slot resolution, Cleave/Backstrike/fizzle
      intents.ts             classify · score · choose (floor, archetype filters) · declare · predict · describe
      damageFlow.ts          breakdownFor (abilities, thaw) · dealDamage (Shell Armor, Sturdy, faint, enemy queue) · heal · stages · move effects
      damage.ts / typeChart.ts / statStages.ts / stats.ts / status.ts / deck.ts / slots.ts / boss.ts / catch.ts / abilities.ts / preview.ts
    rng/                     GameRng (xorshift32, C#-compatible) · RngStreams (fnv1a + fmix32, 5 streams)
    replay/                  replayCombat · fingerprint · golden fixtures (json)
    balance/autoPlayer.ts    deterministic policy for balance + goldens (not the game AI)
    testing/harness.ts       scenario builders, dispatch/reject, withHand/withConsumableHand, tweak
    run/                     everything between fights, same reducer shape as combat/
      region.ts              the Region 1 content table: biomes, trainer rosters, the Gym, run start
      map.ts                 seeded 7-layer route generation with the §2.5 guarantees
      run.ts                 the run reducer + createRun + newPartyMon
      encounter.ts           a MapNode → a ScenarioDef the combat sim can run
      xp.ts                  the XP curve, level-ups and evolution at the threshold
      report.ts              a finished CombatState → a CombatOutcomeReport the run can apply
      save.ts                the checksummed envelope + the SaveProvider interface
    balance/autoRun.ts       a whole-run auto-player: route choices, team choices, fights
  content/
    schemas/index.ts         Zod master schema · schemas/species.ts art path helpers
    registry.ts              buildRegistry(): parse + index + cross-reference checks; getContent() singleton
    data/                    moves.json · species.json · abilities.json · consumables.json · scenarios.json · roster-vs.json
  app/                       store.ts (screen router + URL) · combatStore.ts (fight state, action log, selection)
                             runStore.ts (the run + autosave + the combat bridge) · saveProvider.ts (localStorage)
  ui/
    styles/                  tokens.css · fonts.css · motion.css · global.css
    components/              Portrait · MoveCard · ConsumableCard · EnemyPanel · HpBar · TypeBadge · CombatLog · Modal · OutcomeOverlay · FloatingNumbers
                             BoxPanel · NodeMarker · NodePreviewCard · SwapOrSkip · PauseMenu · MonIcon
    screens/                 MainMenu · ScenarioPicker · CombatScreen · StarterSelect · MapScreen · RewardScreen · RunEndScreen
    hooks/useCombatFx.ts     sim events → floating numbers / shakes / lunges / banners
    art.ts · strings.ts · moveText.ts
  dev/devtools.ts            window.__ascendant
public/art/                  pokemon/{portraits,icons,battle} · icons/<family> · icons/map · items · trainers · stages · map
e2e/                         screens.spec.ts (boot + interactions) · playthrough.spec.ts (win by clicks) · run.spec.ts (a whole route)
scripts/                     fetch-sprites · fetch-portraits · fetch-trainers · fetch-node-icons · fetch-art · gen-image
                             gen-species · gen-roster · add-content · check-refs · check-catalogs
```

## 4. Simulation design

### 4.1 State
`CombatState` is plain JSON: `player { team[3], leadIndex, ap, swapCounter, defensiveDiscount, deck, discard, hand,
consumables{pool,hand,used}, balls, critChance, pendingLeadPick }`, `enemies[]` (active), `enemyQueue[]`
(sequential Gym Pokémon), `defeatedEnemies[]`, `outcome`, `events[]` (append-only, `seq`-numbered), `log[]`,
`rngCursor`, `turn`, `phase`. Combatants carry level-scaled base stats, stages, one primary status
(`appliedTurn` + `turnsLeft`), confusion turns, ability ids, Sturdy charge, regen, trauma.

### 4.2 Actions and reducer
Player actions are the input log: `play-card {cardId, stepBackTo?}`, `use-consumable {cardId, targetIndex?}`,
`swap {benchIndex}`, `pick-lead {benchIndex}`, `end-turn`. `combatReducer` first runs `validateAction` (returns a
`RejectReason` the UI shows verbatim), then `produce`s a new state. `end-turn` runs the whole Resolution and the
next Draw + Intent, unless the Lead fainted (`pendingLeadPick`). Slots (`lead|bench1|bench2`) are positions;
intents lock to a slot and hit whoever is there when they fire.

### 4.3 Selectors
`preview.ts` mirrors the reducer's legality so UIs never dispatch blind: `cardPlayability` (reason, effective AP
after Paralysis/discount, Step-Forward, Step-Back options, damage breakdown), `swapOptions`,
`consumablePlayability`, `catchStatus`, `pickLeadOptions`. `predictIntentDamage` recomputes the telegraphed number
for the *current* occupant after every swap.

### 4.4 Events → feedback
Reducers `emit` typed events; `useCombatFx` turns new ones into floating numbers, shakes, lunges and banners
with small delays. State is final immediately; the FX are a beat of feedback. Golden fixtures compare a
fingerprint that includes the event count.

### 4.5 Determinism and replay
`RngStreams(seed)` derives five streams (`fmix32(seed ^ fnv1a(name))`); combat uses `CombatRNG` and stores its
cursor in state. `replayCombat({seed, actions})` re-runs a fight; `src/sim/replay/fixtures` hold three
auto-played goldens (`UPDATE_GOLDEN=1 npm test` to regenerate after a deliberate rules change).

## 5. Content pipeline
JSON → Zod parse (throws on drift) → `MapRegistry` with cross-reference checks (kits reference existing moves,
positional modifiers only on Melee, scenarios reference existing species/consumables) → `getContent()`
singleton. Tests assert every referenced asset exists on disk. Ids are permanent kebab-case.

## 6. UI architecture
- **Stores**: `useAppStore` (the screen; deep links `?screen=`/`?scenario=` are read on boot and cleaned off the bar, and the tab remembers its screen in sessionStorage for a reload), `useCombatStore` (state, action log,
  `dispatch` with rejection capture, selection `{mode: none|card|step-back|consumable-ally, cardId}`, `combatKey`).
- **Interaction model** (single enemy): click a card to select (preview appears), click the enemy or the card
  again to play; Step-Backward asks for a bench click; ally-target consumables ask for a team click; benches
  swap on click when legal; Esc cancels. Every illegal click surfaces the sim's reason as a toast.
- **Screens** own layout; **components** are dumb and token-styled; **strings** live in `ui/strings.ts` and
  `ui/moveText.ts` (rules text composed from data).
- **Art** resolves through `ui/art.ts` only.

## 7. Verification

| Question | Tool |
|---|---|
| Compile / lint / rules | `npm run check` (tsc, eslint, vitest) |
| Every screen renders, interactions work, a fight can be won by clicks | `npm run e2e` |
| What does it look like | `npm run shot` → `playtest/*.png` |
| Is one fight balanced | `npm run balance` (the per-fixture table) |
| Is the *run* balanced | `npm run balance` (the per-starter table — win rate, depth, turns, catches, evolutions) |
| What is the state | `window.__ascendant.dump()` for a fight, `__ascendant.run.dump()` for the run |
| Reach an awkward state fast | `__ascendant.run.new()`, `.fill(6)`, `.dispatch(action)`; `__ascendant.auto(n)` plays a fight |
| Did a rule drift | golden fixtures |

## 8. Persistence
Per §10.8. `sim/run/save.ts` turns a `RunState` into a checksummed envelope and back; *where* that string
lives is the app's business, behind `SaveProvider` — `app/saveProvider.ts` is localStorage today and a
server-backed profile later is one implementation, not a rewrite. The run autosaves at every node boundary.
A corrupt, truncated or wrong-version save degrades to "start a new run", never to a crash. Because the
envelope carries `pendingScenario` and every RNG cursor, a reload mid-fight rebuilds the same fight.

## 9. Packaging
Web: `npm run build` → `dist/` → itch.io / GitHub Pages (the playtest channel). Desktop (v1.0): Tauri 2.

## 10. Non-goals (for now)
Multiplayer, mobile layout, modding API, a canvas/WebGL renderer, console ports.
