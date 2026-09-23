# Elite catalog — Elite Trainers + Elite Wilds

> Implements §2.8: two distinct node types above Trainer and below Gym. The **Elite Trainer** is the
> late-trunk guaranteed node (≈L7); the **Elite Wild** is a seeded special node (≤1 per Region, not on every
> route). Source of truth for the numbers: `docs/design/catalogs/elites.md`.

## 1. Elite Trainer roster weights (§2.8.1)

| Region | Rival | Giovanni | Specialist |
|---|---|---|---|
| R1 | 80 % | — | 20 % |
| R2 | 60 % | — | 40 % |
| R3 | 40 % | 30 % | 30 % |

All Elite Trainers: **2 Pokémon, 2 phases** (the Rival's R3 ace is 3-phase with mid-fight evolution), reward =
**a Rare relic, choice of 1 of 3** + ~300/400/500 ₽ + 25 Trainer XP. No type lock (that is the Gym's identity).

## 2. Rival "Blue" — scales by Region band, not by appearance count

| Region | Team | Levels | Ace |
|---|---|---|---|
| R1 | `pidgeotto` + `ivysaur` | 12–14, 13–15 | Ivysaur, 2-phase |
| R2 | `pidgeot` + `gyarados` + `exeggutor*` | 22–24, 23–25, 24–26 | Exeggutor, 2-phase |
| R3 | `pidgeot` + `alakazam*` + `wartortle`→**`blastoise` at 50 % HP** | 32–34, 33–35, 34/36 | Blastoise, **3-phase + mid-fight evolution** (§5.8.1) |

The Rival is the only recurring named antagonist and the only non-Champion fight with mid-fight evolution.
**Its starter line counter-picks the player's** — it takes the starter that beats yours (decided 2026-09-19).
It is the Gen I beat everyone remembers, it makes the fight different every run, and it is a lookup table.

## 3. Specialists — one per Region

| Region | id | Name | Team | Levels |
|---|---|---|---|---|
| R1 | `elite-ace-trainer-r1` | Ace Trainer | `pidgeotto` + `ivysaur` | 12, 13 |
| R2 | `elite-karate-king-r2` | Karate King Koichi | `machoke` + `hitmonchan*` | 22, 23 — ✅ v0.7.3 (named Koichi in v0.7.4: Kiyo leads Region 3's Fighting Gym). Machoke stands in for Primeape, whose line is not built; Hitmonchan's three elemental punches are what stop a type check beating it |
| R2 (alt) | `elite-channeler-r2` | Channeler | `haunter*` + `hypno*` | 23, 24 |
| R3 | `elite-cooltrainer-r3` | Cooltrainer | `dewgong*` + `cloyster*` | 33, 34 — not built: its team is Lorelei's own (§3 of `gyms.md`), so Region 3 ships Giovanni's lane |

## 4. Giovanni (R3 Elite lane)

`dugtrio` L32–34 (**Sand Veil**, not Arena Trap — no flee mechanic exists) + `persian*` L34–36 (Tough Claws,
signature). ✅ v0.7.4 as "Boss Giovanni" (id elite-giovanni-r3): the Region 3 Elite Trainer, both two-phase; the
abilities are the species' own pools (Tough Claws has no hook). His **Gym lane** (Viridian Ground) is a separate encounter in `gyms.md`; both are canon and a run
may contain both.

## 5. Elite Wilds — the catch-vs-kill node (§2.8.2)

A boss-tier catchable wild: **catch it** (weaken to the Catchability gauge and throw) → Victory + full XP + the
rare recruit, or **defeat it** → Victory + a single Rare relic (no choice). Catching is the premium path by
design, because the Elite Trainer already owns the "pick 1 of 3" beat.

| id | Region | Species | Level | Profile |
|---|---|---|---|---|
| `elite-wild-snorlax` | R1 | `snorlax` | 14–16 | Boss HP ≈ 2× an Elite Pokémon. P1 stall (`rest-s` heals 50 % max HP + self-Sleep 2t, P1 only; `snore`; `amnesia`) → P2 offence (`body-slam` 30 % Paralysis, `crunch`) and +15 pp catch threshold. Thick Fat + Immunity. Catch → recruit Snorlax. |
| `elite-wild-marowak-spirit` | R1 | `marowak-spirit` | 14–16 | `curse-ms` (user loses 25 % max HP → 3-turn DoT), `confuse-ray`, `shadow-bone`, `lick`. Levitate + Cursed Body. **Catch → recruit a living Ground `marowak`** carrying `thick-club`. |
| `elite-wild-lapras` | R2 | `lapras` | 24–26 | ✅ v0.7.3. P1 control (`sing`, `mist`, `ice-shard`) → P2 `ice-beam` + `surf`. Catch → recruit Lapras. Its learnset only reaches Ice Beam at 30, so the fight carries the script as its kit: `sing` `ice-shard` `ice-beam` `surf` |
| `elite-wild-aerodactyl` | R3 | `aerodactyl` | 34–36 | ✅ v0.7.4 (the script is its kit; stage sky-pillar). P1 `agility`/`ancient-power` setup → P2 `sky-drop` + `rock-slide-m`. Catch → recruit Aerodactyl. |

One boss-wild per Region is drawn per encounter (never both). No mid-fight evolution — it is a wild, not a
trainer ace. Two phases; Phase 2 raises the catch threshold rather than the defence; everything telegraphed.

> **Phase 2 makes a boss-wild *easier* to catch, not harder** (decided 2026-09-19). As it tires, its catch
> threshold rises and the gauge fills faster for the same damage. The opposite — a defensive Phase 2 — narrows
> the catch window exactly when the player reaches for it, punishing the interesting choice. "It is tiring,
> throw now" is the readable story, and it keeps catching a real alternative to killing.

## 6. Victory Road roster 🔒 v0.8 (§2.12)

| Node | Content |
|---|---|
| Gauntlet | Elite-tier trainer, no pre-heal, 1-of-3 Rare relic. Roster: the Region's unused Specialist + a Rival rematch |
| Apex Pokémon | a VR-exclusive recruit, partially evolved: `dragonair*` / `kangaskhan*` / `chansey*` (ids reserved) |
| Training Grounds | no fight; one upgrade (stat / move / level / early evolution / move replacement) |
| Summit | full heal + a 1-of-3 **Legendary** pick + League roster preview + the one-way gate |

## 7. League 🔒 deferred

Elite Four ×4 + Champion, 21 boss-tier Pokémon total (§5.8.2), micro-rest 30 % HP between fights, Champion
signature +5 % Attack per fallen ally (cap +20 %, §5.12.1). Ids reserved: `elite-four-1`…`elite-four-4`,
`champion`. Do not author rosters until the R1→Victory Road loop ships.
