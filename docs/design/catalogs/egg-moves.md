# Egg moves catalog — 64 lines

> Implements §2.9.4.2. The Dojo's third counter sells a line's egg moves to any stage of it, at 250 ₽ in the town
> and +30 % in the city (`PRICES.dojoEgg`, `CITIES[id].dojoMarkup`). The list sits on the line's **base form**
> (`eggMoves` in `src/content/data/species.json`), up to three, from the series' own egg-move lists (any
> generation), kept to moves this game already has and the line never learns, tutors or gains from a branch —
> `content.test.ts` guards all three clauses.

| Line (base) | Egg moves (type, power) | Status |
|---|---|---|
| Bulbasaur | `petal-dance` (Grass 100) · `ingrain` (Grass) · `amnesia` (Normal) | ✅ v0.7.9 |
| Charmander | `dragon-pulse` (Dragon 90) · `outrage` (Dragon 110) · `ancient-power` (Rock 65) | ✅ v0.7.9 |
| Squirtle | `haze` (Ice) · `mist` (Water) · `flail` (Normal 55) | ✅ v0.7.9 |
| Pidgey | `air-cutter` (Flying 60) | ✅ v0.7.9 |
| Rattata | `flame-wheel` (Fire 60) · `last-resort` (Normal 75) · `revenge` (Fighting 70) | ✅ v0.7.9 |
| Spearow | `tri-attack` (Normal 80) · `feather-dance` (Flying) | ✅ v0.7.9 |
| Ekans | `sucker-punch` (Normal 55) · `disable` (Normal) · `slam` (Normal 75) | ✅ v0.7.9 |
| Pikachu | `wish` (Normal) · `flail` (Normal 55) | ✅ v0.7.9 |
| Sandshrew | `rapid-spin` (Water 45) · `swords-dance` (Normal) · `metal-claw` (Rock 50) | ✅ v0.7.9 |
| Nidoran♀ | `skull-bash` (Normal 60) · `iron-tail` (Rock 80) · `supersonic` (Normal) | ✅ v0.7.9 |
| Nidoran♂ | `sucker-punch` (Normal 55) · `amnesia` (Normal) · `confusion` (Psychic 50) | ✅ v0.7.9 |
| Clefairy | `amnesia` (Normal) · `splash` (Normal) | ✅ v0.7.9 |
| Vulpix | `hypnosis` (Psychic) · `flare-blitz` (Fire 110) · `disable` (Normal) | ✅ v0.7.9 |
| Jigglypuff | `last-resort` (Normal 75) | ✅ v0.7.9 |
| Zubat | `brave-bird` (Flying 85) · `zen-headbutt` (Psychic 75) · `hypnosis` (Psychic) | ✅ v0.7.9 |
| Oddish | `swords-dance` (Normal) · `synthesis` (Grass) · `ingrain` (Grass) | ✅ v0.7.9 |
| Paras | `cross-poison` (Poison 75) · `leech-seed` (Grass) · `agility` (Psychic) | ✅ v0.7.9 |
| Venonat | `agility` (Psychic) · `screech` (Normal) | ✅ v0.7.9 |
| Diglett | `ancient-power` (Rock 65) · `headbutt` (Normal 65) | ✅ v0.7.9 |
| Meowth | `hypnosis` (Psychic) · `last-resort` (Normal 75) · `amnesia` (Normal) | ✅ v0.7.9 |
| Psyduck | `cross-chop` (Fighting 80) · `hypnosis` (Psychic) · `confuse-ray` (Ghost) | ✅ v0.7.9 |
| Mankey | `revenge` (Fighting 70) | ✅ v0.7.9 |
| Growlithe | `close-combat` (Fighting 110) · `double-kick` (Fighting 25) · `body-slam` (Normal 75) | ✅ v0.7.9 |
| Poliwag | `water-pulse` (Water 70) · `haze` (Ice) · `mist` (Water) | ✅ v0.7.9 |
| Machop | `ice-punch` (Ice 75) · `thunder-punch` (Electric 75) · `fire-punch` (Fire 75) | ✅ v0.7.9 |
| Bellsprout | `synthesis` (Grass) · `ingrain` (Grass) · `leech-life` (Bug 45) | ✅ v0.7.9 |
| Tentacool | `rapid-spin` (Water 45) · `aurora-beam` (Ice 65) · `confuse-ray` (Ghost) | ✅ v0.7.9 |
| Geodude | `mega-punch` (Normal 80) · `flail` (Normal 55) | ✅ v0.7.9 |
| Ponyta | `hypnosis` (Psychic) · `low-kick` (Fighting 45) · `thrash` (Normal 85) | ✅ v0.7.9 |
| Slowpoke | `zen-headbutt` (Psychic 75) · `stomp` (Normal 70) | ✅ v0.7.9 |
| Farfetch'd | `revenge` (Fighting 70) · `feather-dance` (Flying) · `quick-attack` (Normal 40) | ✅ v0.7.9 |
| Doduo | `supersonic` (Normal) · `haze` (Ice) · `flail` (Normal 55) | ✅ v0.7.9 |
| Seel | `icicle-spear` (Ice 25) · `signal-beam` (Bug 70) · `horn-drill` (Normal 130) | ✅ v0.7.9 |
| Grimer | `shadow-punch` (Ghost 70) · `explosion` (Normal 170) · `lick` (Ghost 40) | ✅ v0.7.9 |
| Shellder | `rock-blast` (Rock 65) · `rapid-spin` (Water 45) · `twineedle` (Bug 70) | ✅ v0.7.9 |
| Gastly | `thunder-punch` (Electric 75) · `haze` (Ice) | ✅ v0.7.9 |
| Onix | `heavy-slam` (Rock 100) · `rock-blast` (Rock 65) · `stealth-rock` (Rock) | ✅ v0.7.9 |
| Drowzee | `fire-punch` (Fire 75) · `barrier` (Psychic) | ✅ v0.7.9 |
| Krabby | `ancient-power` (Rock 65) · `agility` (Psychic) · `slam` (Normal 75) | ✅ v0.7.9 |
| Exeggcute | `ancient-power` (Rock 65) · `synthesis` (Grass) · `moonlight` (Grass) | ✅ v0.7.9 |
| Cubone | `double-kick` (Fighting 25) · `ancient-power` (Rock 65) · `skull-bash` (Normal 60) | ✅ v0.7.9 |
| Hitmonlee | `mach-punch` (Fighting 40) · `rapid-spin` (Water 45) | ✅ v0.7.9 |
| Hitmonchan | `rapid-spin` (Water 45) · `hi-jump-kick` (Fighting 110) | ✅ v0.7.9 |
| Lickitung | `body-slam` (Normal 75) · `zen-headbutt` (Psychic 75) · `amnesia` (Normal) | ✅ v0.7.9 |
| Koffing | `psybeam` (Psychic 70) · `psywave` (Psychic 50) | ✅ v0.7.9 |
| Rhyhorn | `crunch` (Normal 75) · `fire-fang` (Fire 50) · `skull-bash` (Normal 60) | ✅ v0.7.9 |
| Chansey | `mud-bomb` (Ground 70) | ✅ v0.7.9 |
| Tangela | `leech-seed` (Grass) · `confusion` (Psychic 50) · `amnesia` (Normal) | ✅ v0.7.9 |
| Kangaskhan | `circle-throw` (Fighting 55) · `double-edge` (Normal 110) · `stomp` (Normal 70) | ✅ v0.7.9 |
| Horsea | `outrage` (Dragon 110) · `aurora-beam` (Ice 65) · `signal-beam` (Bug 70) | ✅ v0.7.9 |
| Goldeen | `aqua-tail` (Water 65) · `hydro-pump` (Water 100) · `body-slam` (Normal 75) | ✅ v0.7.9 |
| Mr. Mime | `icy-wind` (Ice 60) · `confuse-ray` (Ghost) · `charm` (Normal) | ✅ v0.7.9 |
| Scyther | `bug-buzz` (Bug 95) · `silver-wind` (Bug 65) | ✅ v0.7.9 |
| Jynx | `wish` (Normal) | ✅ v0.7.9 |
| Electabuzz | `cross-chop` (Fighting 80) · `dynamic-punch` (Fighting 100) · `karate-chop` (Fighting 50) | ✅ v0.7.9 |
| Magmar | `mach-punch` (Fighting 40) · `cross-chop` (Fighting 80) · `flare-blitz` (Fire 110) | ✅ v0.7.9 |
| Pinsir | `close-combat` (Fighting 110) · `quick-attack` (Normal 40) · `bug-bite` (Bug 40) | ✅ v0.7.9 |
| Lapras | `dragon-pulse` (Dragon 90) · `ancient-power` (Rock 65) · `horn-drill` (Normal 130) | ✅ v0.7.9 |
| Eevee | `flail` (Normal 55) | ✅ v0.7.9 |
| Omanyte | `bubble-beam` (Water 65) · `water-pulse` (Water 70) · `supersonic` (Normal) | ✅ v0.7.9 |
| Kabuto | `rapid-spin` (Water 45) · `giga-drain` (Grass 90) · `aurora-beam` (Ice 65) | ✅ v0.7.9 |
| Aerodactyl | `roost` (Normal) · `tailwind` (Flying) · `wide-guard` (Rock) | ✅ v0.7.9 |
| Snorlax | `zen-headbutt` (Psychic 75) · `self-destruct` (Normal 130) · `charm` (Normal) | ✅ v0.7.9 |
| Dratini | `iron-tail` (Rock 80) · `water-pulse` (Water 70) · `haze` (Ice) | ✅ v0.7.9 |

**Lines with none** — the games gave them no egg moves, or none this game has that the line does not already
learn: Caterpie, Weedle, Abra, Magnemite, Voltorb, Staryu, Tauros, Magikarp, Ditto, Porygon, Articuno, Zapdos, Moltres, Mewtwo, Mew. The counter says the master has no scrolls for them rather than inventing some.

**Picking order.** Where a line had more than three candidates, the one that changes what the line can do came
first (Charmander's dragon moves, Growlithe's Close Combat, the elemental punches of Machop and the humanoids),
then coverage, then utility. Squirtle's and Dratini's signature egg moves (Aqua Jet, Extreme Speed) are already
in their learnsets here, so their scrolls hold the rest.
