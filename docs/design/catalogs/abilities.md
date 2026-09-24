# Ability catalog — 65 abilities

> Implements §6.5 (ability system), §6.6 (launch pool), §6.5.1 (`AvailableAbilities`, taught at the Dojo,
> one passive slot, swap allowed). Hooks map to `AbilityHook` in `src/sim/content/defs.ts`; a new hook is a sim
> change, not just content. Status legend in `README.md`.
>
> **How a Pokémon gets one** (§6.5.1, decided 2026-09-19): each species carries an `availableAbilities` pool.
> The **first entry is granted automatically at the first evolution**, and the **Dojo sets or swaps** the slot to
> any entry in the pool. Pure auto-grant makes the Dojo pointless; pure Dojo-only means most Pokémon have no
> passive at all. The hybrid gives every evolved Pokémon an identity and makes the Dojo the place you *change*
> it. **The third entry of each line is its hidden ability** (§6.8.3, 2026-09-21): listed at the Dojo, locked
> until the line's Bond reaches rank 3. `species.json` carries it as `hiddenAbility`.

## 1. Hook vocabulary (the sim contract)

Adding an ability means picking an existing hook or adding one. Hooks in **bold** are live in v0.1.

| Hook | Fires | Params | Live |
|---|---|---|---|
| **`none`** | never (flavour / reserved) | — | ✅ |
| **`low-hp-type-boost`** | damage calc | `type`, `threshold` (0.3), `multiplier` (1.2) | ✅ |
| **`range-boost`** | damage calc | `range` (melee/ranged), `multiplier` | ✅ |
| **`lead-flat-reduction`** | incoming damage, wearer is Lead | `amount` | ✅ |
| **`riders-always-apply`** | status rider roll | — | ✅ |
| **`reveal-intents`** | combat start | — | ✅ |
| **`sturdy`** | lethal damage, once per combat | — | ✅ |
| **`turn-end-bench-heal`** | end of Resolution | `amount` | ✅ |
| **`start-stage`** | combat start | `stat`, `stages` | ✅ |
| **`ignore-defence-stages`** | damage calc | — | ✅ v0.7.5 (Infiltrator) |
| **`lead-trap-chip`** | end of Resolution, wearer is Lead | `divisor` | ✅ v0.7.5 (Arena Trap) |
| **`on-damaged-stages`** | a hit lands on the wearer | `defense`, `attack` | ✅ v0.7.5 (Weak Armor) |
| **`consumable-heal-bonus`** | a healing item on the wearer | `multiplier` | ✅ v0.7.5 (Gluttony) |
| **`type-move-heal`** | the wearer plays a move of the type | `type`, `divisor` | ✅ v0.7.5 (Rain Dish) |
| **`block-moves`** | a named move targets the wearer | `moves` | ✅ v0.7.5 (Damp) |
| **`status-immunity`** | status application | `status` | ✅ v0.3 |
| `type-immunity` | damage calc, before type chart | `type` | ⏳ not built (Levitate is reserved) |
| **`type-absorb`** | damage calc | `type`, `percentOfMaxHp` → heal instead of damage | ✅ v0.3 |
| **`on-enter-lead`** | Lead changes to the wearer (swap, Step-Forward or replacement, not combat start) | `target`, `stat`, `stages` | ✅ v0.3 |
| `on-faint-team` | any ally faints | effect payload | ⏳ not built |
| `stab-multiplier` | damage calc | `multiplier` | ✅ v0.6 |
| **`super-effective-reduction`** | incoming damage, type multiplier > 1 | `multiplier` (0.75) | ✅ v0.3 |
| `conditional-reduction` | incoming damage, under a condition the wearer cannot choose | when (confused · ranged · type), `types` (a comma list, for type), `multiplier` | ✅ v0.3 (`type` v0.7.3) |
| `crit-on-crit-taken` | the wearer is critted | — | ⏳ not built (Anger Point is reserved) |
| `dot-immunity` | status tick | — | ⏳ not built (Rock Head ships on `recoil-immunity`) |
| `turn-start-ap` | Draw phase | `amount`, `turn` | ✅ v0.6 |
| `field-draw` | Draw phase, field active | `field`, `cards` | 🔒 v0.8.4 (field effects) |
| `lead-aura` | while the wearer is Lead | `type`, `percent` | ✅ v0.4 (held items) |
| `post-combat-loot` | combat end | `chance`, `pool` | ⏳ not built |
| `low-hp-damage-reduction` | incoming damage | `threshold`, `multiplier` | ⏳ not built (Sand Veil ships on `conditional-reduction`) |
| `ignore-immunity` | damage calc | — | ⏳ not built |
| `rider-force-plus-damage` | rider + damage | `multiplier` | ✅ v0.7.5 |

## 2. Catalog

| id | Name | Category | Effect | Hook (params) | Species pools | Status |
|---|---|---|---|---|---|---|
| `overgrow` | Overgrow | Combat | Grass moves +20 % below 30 % HP | `low-hp-type-boost` (grass) | bulbasaur | ✅ |
| `blaze` | Blaze | Combat | Fire moves +20 % below 30 % HP | `low-hp-type-boost` (fire) | charmander | ✅ |
| `torrent` | Torrent | Combat | Water moves +20 % below 30 % HP | `low-hp-type-boost` (water) | squirtle | ✅ |
| `swarm` | Swarm | Combat | Bug moves +20 % below 30 % HP | `low-hp-type-boost` (bug) | caterpie, weedle | ✅ v0.3 |
| `tough-claws` | Tough Claws | Combat | Melee +15 % | `range-boost` (melee) | charizard, venusaur, golem, aerodactyl | ✅ |
| `snipe` | Snipe | Combat | Ranged +15 % | `range-boost` (ranged) | beedrill, zubat, bellsprout, charmander | ✅ |
| `shell-armor` | Shell Armor | Combat | Lead takes −2 per hit | `lead-flat-reduction` (2) | squirtle, krabby | ✅ |
| `solid-rock` | Solid Rock | Combat | Super-effective hits deal −25 % | **`super-effective-reduction`** (0.75) | geodude | ✅ v0.3 |
| `compound-eyes` | Compound Eyes | Combat | Status riders always apply | `riders-always-apply` | caterpie | ✅ |
| `sheer-force` | Sheer Force | Combat | Moves carrying a rider for the foe deal +20 %; the rider still rolls | `rider-force-plus-damage` (1.2) | krabby (hidden) | ✅ v0.7.5 |
| `keen-eye` | Keen Eye | Vision | All Unknown intents revealed at combat start | `reveal-intents` | pidgey, aerodactyl(→`pressure` alt) | ✅ |
| `anticipation` | Anticipation | Vision | The first enemy intent each combat is revealed | `reveal-intents` (`firstOnly`) | eevee | ✅ v0.6 |
| `sturdy` | Sturdy | Survival | Survive one lethal hit per combat at 1 HP | `sturdy` | geodude, onix | ✅ |
| `rock-head` | Rock Head | Survival | The wearer takes no self-damage from recoil moves | `dot-immunity` (`recoilOnly`) | geodude, onix, marowak, aerodactyl | ✅ v0.4 (on `recoil-immunity`) |
| `magic-guard` | Magic Guard | Survival | Immune to Burn/Poison DoT (the status still applies) | `dot-immunity` | — (reserved, §6.6) | 🔒 reserved |
| `multiscale` | Multiscale | Survival | At full HP the wearer takes −50 % from the first hit each combat | `low-hp-damage-reduction` (inverted) | — (reserved) | 🔒 |
| `battle-armor` | Battle Armor | Survival | While Lead, incoming hits deal 2 less | **`lead-flat-reduction`** (2) | cubone, kabuto lines | ✅ Gen I — ships as a Lead flat reduction: the no-crit variant (`critOnly`) has no hook yet, and the shell reads as armour either way |
| `weak-armor` | Weak Armor | Survival | When a hit lands: Def −1, Atk +1 | `on-damaged-stages` | onix (hidden) | ✅ v0.7.5 |
| `levitate` | Levitate | Type | Immune to Ground moves | `type-immunity` (ground) | marowak-spirit | 🔒 reserved |
| `water-absorb` | Water Absorb | Type | Water moves heal instead of damaging | `type-absorb` (water) | vaporeon, poliwag, lapras | ✅ v0.3 |
| `volt-absorb` | Volt Absorb | Type | Electric moves heal instead of damaging | `type-absorb` (electric) | jolteon | ✅ v0.6 |
| `flash-fire` | Flash Fire | Type | Fire moves deal 0 and grant Atk +1 | `type-absorb` (fire, `buffInstead`) | flareon | ✅ v0.6 |
| `lightning-rod` | Lightning Rod | Type | Electric intents targeting a bench slot redirect to the wearer, at −50 % | `on-enter-lead` variant → new `redirect` | marowak | 🔒 reserved |
| `thick-fat` | Thick Fat | Type | Fire and Ice moves deal half damage | **`conditional-reduction`** (when: type, fire+ice, 0.5) | seel line · Snorlax's catalogue pool | ✅ v0.7.3 |
| `flame-body` | Flame Body | Status | A Melee attacker is Burned (30 %) | **`on-damaged`** (melee, burn, 0.30) | vulpix, ponyta, magmar, moltres | ✅ Gen I |
| `cute-charm` | Cute Charm | Status | A Melee attacker is Confused (30 %) | **`on-damaged`** (melee, confusion, 0.30) | clefairy, jigglypuff lines | ✅ Gen I |
| `water-veil` | Water Veil | Status | Cannot be Burned | **`status-immunity`** (burn) | goldeen line | ✅ Gen I |
| `own-tempo` | Own Tempo | Status | Cannot be Confused | **`status-immunity`** (confusion) | slowpoke line, lickitung, jynx | ✅ Gen I |
| `immunity` | Immunity | Status | Cannot be Poisoned | **`status-immunity`** (poison) | — (Snorlax's catalogue pool; the built Snorlax carries `sturdy`) | ✅ Gen I |
| `insomnia` | Insomnia | Status | Cannot be put to Sleep | **`status-immunity`** (sleep) | drowzee line | ✅ Gen I |
| `limber` | Limber | Status | Cannot be Paralysed | **`status-immunity`** (paralysis) | hitmonlee, ditto | ✅ Gen I |
| `inner-focus` | Inner Focus | Status | Cannot be Confused | `status-immunity` (confusion) | zubat | ✅ v0.3 |
| `vital-spirit` | Vital Spirit | Status | Cannot be put to Sleep | **`status-immunity`** (sleep) | mankey line, magmar | ✅ Gen I |
| `effect-spore` | Effect Spore | Status | A Melee attacker is Poisoned (30 %) | **`on-damaged`** (melee, poison, 0.30) | oddish | ✅ v0.3 |
| `poison-point` | Poison Point | Status | A Melee attacker is Poisoned (30 %) | **`on-damaged`** (melee, poison, 0.30) | weedle, tentacool, koffing | ✅ v0.3 |
| `static` | Static | Status | A Melee attacker is Paralysed (30 %) | **`on-damaged`** (melee, paralysis, 0.30) | pikachu, voltorb, magnemite, electabuzz | ✅ v0.7.3 |
| `cursed-body` | Cursed Body | Status | The attacker's move goes on cooldown 1 turn | `on-damaged`, with a cooldown payload instead of a rider | marowak-spirit | 🔒 reserved |
| `intimidate` | Intimidate | Positional | On entering Lead: all enemies Atk −1 | `on-enter-lead` | gyarados | ✅ v0.3 |
| `steadfast` | Steadfast | Positional | On entering Lead: self Atk +1 | `on-enter-lead` | machop | ✅ v0.3 |
| `run-down` | Run Down | Positional | The first manual swap each combat costs 0 AP | new `swap-discount` | rattata, eevee | ✅ v0.4 |
| `infiltrator` | Infiltrator | Positional | The wearer's moves ignore a target's raised Defence (v0.7.5 — was "ignore the Home Field bonus", which waits on v0.8.4) | `ignore-defence-stages` | zubat (hidden) | ✅ v0.7.5 |
| `healer` | Healer | Support | At turn end, heal a bench ally 3 HP | `turn-end-bench-heal` (3) | pidgeot, bulbasaur, oddish | ✅ |
| `friend-guard` | Friend Guard | Support | Bench takes −10 % Cleave damage | `low-hp-damage-reduction` (`cleaveOnly`) | — (reserved) | 🔒 |
| `rain-dish` | Rain Dish | Support | Each Water move it plays restores 1/16 of its HP (v0.7.5 — was a turn-end heal in Rain) | `type-move-heal` (water, 16) | squirtle (hidden) | ✅ v0.7.5 |
| `hydration` | Hydration | Support | Status conditions clear at turn end while Rain is active | `field-draw` variant | lapras | 🔒 v0.8.4 (field effects) |
| `iron-shell` | Iron Shell | Combat | At combat start Def +1 | `start-stage` (def, 1) | metapod | ✅ |
| `guts` | Guts | Combat | +30 % Atk while statused (and Burn's −25 % does not apply) | **`while-statused`** (1.3) | machop, mankey, rattata, flareon | ✅ v0.3 |
| `sand-veil` | Sand Veil | Combat | Incoming Ranged attacks deal −15 % | `low-hp-damage-reduction` (`rangedOnly`) | diglett | ✅ v0.3 (on `conditional-reduction`) |
| `arena-trap` | Arena Trap | Positional | While the wearer leads, every enemy loses 1/16 of its HP at the end of each turn (v0.7.5 — there is no flee to trap, so the sand swallows instead) | `lead-trap-chip` (16) | diglett (hidden) | ✅ v0.7.5 |
| `hustle` | Hustle | Combat | Melee +25 %, the wearer's rider chances −15 pp | `range-boost` (melee, 1.25) + param | rattata, diglett | ✅ v0.3 |
| `anger-point` | Anger Point | Combat | After being critted, every move the wearer plays next turn always-crits | `crit-on-crit-taken` | mankey | 🔒 reserved |
| `moxie` | Moxie | Combat | Atk +1 whenever the wearer faints an enemy | new `on-kill` | gyarados | ✅ v0.4 |
| `adaptability` | Adaptability | Combat | STAB 1.5 → 1.75 | `stab-multiplier` (1.75) | eevee | ✅ v0.6 |
| `speed-boost` | Speed Boost | Combat | +1 AP on turn 2 of each combat | `turn-start-ap` (1, turn 2) | jolteon | ✅ v0.6 |
| `swift-swim` | Swift Swim | Combat | Draw +1 on turn 1 of Rain combats | `field-draw` (rain, 1) | magikarp, poliwag, psyduck | 🔒 v0.8.4 (field effects) |
| `chlorophyll` | Chlorophyll | Combat | Draw +1 on turn 1 of Sun combats | `field-draw` (sun, 1) | oddish, bellsprout, bulbasaur | 🔒 v0.8.4 (field effects) |
| `cloud-nine` | Cloud Nine | Combat | All field effects are suppressed while the wearer is Lead | `field-draw` variant | psyduck | 🔒 v0.8.4 (field effects) |
| `damp` | Damp | Combat | Self-Destruct and Explosion fail against the wearer (and the AI never fires them into it) | `block-moves` | psyduck, poliwag | ✅ v0.7.5 |
| `pickup` | Pickup | Meta | 25 % chance of a random consumable after a combat win | `post-combat-loot` | — (R2 Meowth) | 🔒 |
| `gluttony` | Gluttony | Meta | Healing items used on the wearer restore +50 % | `consumable-heal-bonus` (1.5) | snorlax (hidden) | ✅ v0.7.5 |
| `pressure` | Pressure | Combat | The enemy's cooldowns last +1 turn while the wearer is Lead | new `enemy-cooldown` | aerodactyl | 🔒 reserved |
| `no-guard` | No Guard | Combat | Both the wearer's and its attacker's riders always apply | `riders-always-apply` (`bothSides`) | machop | ✅ v0.3 |
| `hyper-cutter` | Hyper Cutter | Combat | The wearer's Atk cannot be lowered | new `stage-immunity` (atk) | krabby | 🔒 reserved |
| `tangled-feet` | Tangled Feet | Combat | While Confused the wearer takes −30 % damage | `low-hp-damage-reduction` (`whileConfused`) | pidgey | ✅ v0.3 (on `conditional-reduction`) |
| `mold-breaker` | Mold Breaker | Combat | The wearer's moves ignore type immunities | `ignore-immunity` | — (Champion-tier) | 🔒 |

**Counts:** 65 rows · 47 in `abilities.json` (the Gen I pass of 2026-09-23 added nine: the rows marked ✅ Gen I, every one on a hook that already existed) · 9 reserved for later regions.
§6.6's "~30 launch abilities" is met.

v0.3 added six simulation hooks — `while-statused`, `on-damaged`, `status-immunity`, `on-enter-lead`,
`type-absorb`, `super-effective-reduction` — and turned seven rows from flavour into behaviour. Nine rows in the
JSON are still inert because the system they need has not landed: Swift Swim, Chlorophyll and Cloud Nine wait on
field effects (v0.7); Tangled Feet, Run Down, Sand Veil, Rock Head, Moxie and Damp wait on v0.4. The Dojo shows
those with "no effect until a later version" rather than selling a no-op.

**Four lines' canonical first entry is one of those.** Oddish's Chlorophyll, Diglett's Sand Veil, Magikarp's
Swift Swim and Psyduck's Cloud Nine are what §6.5.1 grants at the first evolution, so those Pokémon currently
evolve into a passive that does nothing. Pool order is design and has been left alone; the archetype branches
lean on a live entry where one exists (Gloom → Effect Spore, Dugtrio → Hustle, Gyarados → Intimidate), and the
Dojo can swap the rest. Psyduck has no live option at all until v0.7.

## 3. Assignment rules

- **Pool order matters**: the first entry is what the first evolution grants, so it should be the species'
  most characteristic passive.
- Every **base form** lists 2–3 pool entries; evolved forms inherit the pool and may add 1 (so a Dojo visit
  before evolving is not wasted).
- A pool never contains two abilities with the same hook (no "which +15 % is better" non-choices).
- Exactly one entry per pool is a **defensive/utility** option, so the Dojo is a real fork rather than a damage
  upgrade (Pillar 3).
- Boss-only abilities (`mold-breaker`, `pressure` on a boss) are marked 🔒 and never appear in a player pool.
