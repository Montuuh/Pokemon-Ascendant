# Glossary

> Canonical terms. Use these words and no synonyms — in canon, in code identifiers, in UI strings and in commit
> messages. Extends §1.10 with everything the later topics and the web build added. Each entry names where the
> term is defined.

## Combat

| Term | Defined | Meaning |
|---|---|---|
| **Active Team** | §2.3 | The 3 Pokémon brought into a combat from the Box. Locked on node entry. |
| **Lead** | §3.3 | The Active Pokémon that absorbs single-target damage and can play Melee cards. |
| **Bench** | §3.3 | The two non-Lead Active slots. Bench Pokémon still contribute cards. |
| **Slot** | §3.2.3 | A position (`lead`, `bench1`, `bench2`). Intents target slots, not Pokémon. |
| **Manual swap** | §3.3.1 | A player-initiated Lead change. Costs 1/2/3 AP within a turn and is the only thing that increments the swap counter. |
| **Swap counter** | §3.3.1 | Per-turn count of manual swaps; resets at Draw. |
| **Defensive swap discount** | §3.3.1 | −1 AP on the first Defensive card after a manual swap. |
| **Step-Forward / Step-Backward** | §3.3.2–3 | Melee-only card modifiers that bundle a Lead change with the effect. Never increment the counter. |
| **AP (Action Points)** | §3.7 | The per-turn budget. 3 baseline, cap 6. |
| **Skill deck** | §3.4 | The 12–15 cards built from the Active Team's active moves. |
| **Active 4** | §6.7.2 | The four pool moves a Pokémon contributes as cards. |
| **Learned Move Pool** | §6.7 | Everything a Pokémon knows. Grows, never shrinks. |
| **Mastery Move** | §5.13.2 | The immutable 5th card, unlocked per species across runs. |
| **Consumable Pile** | §3.5 | The per-combat roster of consumables; 2 drawn per turn, all returned at combat end. |
| **Intent** | §5.2 | A telegraphed enemy action, shown with its kind, magnitude and target slot. |
| **Cleave** | §5.4 | An intent hitting every occupied slot. Never fizzles. |
| **Backstrike** | §5.4 | An intent targeting a specific bench slot. Fizzles if the slot is empty. |
| **Unknown intent** | §5.5 | A hidden intent (❓). One per enemy in Elite/Gym fights. |
| **Witnessed / Scouted / Researched** | §5.5 | The three ways an Unknown intent becomes visible. |
| **Randomness floor** | §5.3 | The seeded ~12.5 % chance the AI picks a non-top intent. |
| **Counter-intel** | §5.7 | A fully-scouted boss deprioritises its top intent ×0.7 and loses the randomness floor. |
| **Faint** | §2.4.1 | `currentHP == 0`. There is no separate flag. |
| **Phase** | §5.8.3 | A boss behaviour band at 100/50/20 % HP, marked on its HP bar. |
| **Home Field** | §4.3.5 | An enemy-owned field: the boss's type-moves ×1.5, no player boost. |
| **Battlefield** | §4.3 | A neutral field affecting both sides symmetrically. |
| **Catchability gauge** | §2.6.4.1 | The deterministic 0–100 catch readiness meter. No roll. |

## Run

| Term | Defined | Meaning |
|---|---|---|
| **Run** | §2.1 | One playthrough: Pre-Run → Region ×3 → Victory Road → League. |
| **Region** | §2.1.2 | One of three seeded branching maps, 12 layers, ending in a Gym fork. |
| **Gym fork** | §2.5 v2 | The L9 split into two sub-lanes, each leading to a different Gym. |
| **Box** | §2.3 | The run's Pokémon roster. Capacity 6 (8 upgraded). |
| **Swap-or-Skip** | §2.3.1 | The forced prompt when recruiting at a full Box. Releasing is permanent. |
| **Badge** | §5.10 | A permanent run modifier from a Gym Leader. 3 per run, max 4. |
| **Region Modifier** | §2.11.3 | One per-Region accent chosen at each City. Expires with the Region. |
| **Relic** | §7.3 | A persistent run-state modifier. No slot cap. |
| **Legendary relic** | §7.3.7 | A 4th rarity class: choice-only, never a drop, max 2 per run. |
| **Held Item** | §7.4 | Per-Pokémon equipment. One slot each. |
| **TM** | §7.5 | A single-use item that adds a move to a pool. Map View only. |
| **Dojo** | §2.9.4 | The paid node that teaches off-learnset moves and abilities. |
| **Choice Plaza** | §2.11.4 | The City: Shop and Reflection always, plus 2 of 4 premium nodes. |
| **Elite Trainer** | §2.8.1 | The guaranteed late-trunk mini-boss. Rewards a 1-of-3 Rare relic. |
| **Elite Wild** | §2.8.2 | A seeded catchable boss-wild. Catch it or defeat it, not both. |
| **Trauma stack** | §8.2 | A per-instance, per-run faint penalty on Effective Max HP. |
| **Effective Max HP** | §8.2.1 | `floor(base × the two-zone Trauma factor)`. Every heal and DoT uses it. |
| **Apex Pokémon** | §2.12.2 | The Victory-Road-exclusive recruit. |

## Meta

| Term | Defined | Meaning |
|---|---|---|
| **Trainer XP** | §8.3.1 | Account XP, earned every run, never spent. Drives Trainer Level. |
| **Trainer Level** | §8.3.3 | The account metric that advances the Battle Pass track. |
| **Battle Pass track** | §8.3.5 | The per-level reward ladder; every 5th level grants Tokens. |
| **Trainer Token** | §8.3.4 | The manual-spend currency. Tier-3 Mastery relics only, 5 each. |
| **Meta tier (T1/T2/T3)** | §8.6.1 | Whether a relic is in your account's pool. Not rarity. |
| **Rarity** | §7.3.1 | In-run drop weight: Common / Uncommon / Rare (+ Legendary, which never drops). |
| **Pokédex** | §5.13 | Cross-run kill tracking. Tiers: Familiar → Veteran → Master. |
| **Hub** | §8.4 | The between-run kiosk menu. |
| **Difficulty modifier** | §8.8 | An opt-in challenge that multiplies the run's Trainer XP. |

## Project

| Term | Defined | Meaning |
|---|---|---|
| **Pillar** | §1.3.1 | One of the five immutable design commitments. |
| **Anti-pillar** | §1.3.3 | Something the game deliberately is not. |
| **§N.N.N** | — | A canon section reference. Stable forever; cited from code and tests. |
| **Catalog** | `catalogs/` | The authoring source for a content class. |
| **Implementation status** | `implementation-status.md` | The derived map from a system to its code, its state, and any divergence from canon. |
| **Codex** | `00-codex.md` | The derived whole-game digest. Canon wins over it. |
| **Golden master** | §10.7.4 | A recorded replay whose fingerprint guards against accidental rule changes. |
| **Fixture / scenario** | `src/content/data/scenarios.json` | A hand-authored combat used for testing and deep links. |

## Words we do not use

| Say | Not |
|---|---|
| Pokédex | Bestiary (renamed, CL-001) |
| Lead | active / front / tank |
| Faint | die / KO / knock out |
| Intent | telegraph / enemy move (the *telegraph* is the display of an intent) |
| Manual swap | switch / rotate |
| Archetype (evolution) | branch (a branch is the species you evolve into; the archetype is the flavour you pick) |
| Effective Max HP | max HP, when Trauma is in play |
| Region Modifier | region buff / act modifier |
| Content JSON / React / CSS | ScriptableObject / UI Toolkit / USS (Unity-era wording) |
