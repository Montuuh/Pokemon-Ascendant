# Content catalogs — the authoring source for `src/content/data`

> Every piece of game content (species, moves, abilities, items, relics, trainers, gyms, events, badges,
> modifiers, achievements, biomes) is listed here **once**, with a stable kebab-case id, its canon reference (§)
> and a status. Agents author content **here first**, then port rows into JSON. The JSON is the runtime truth;
> the catalog is the design truth. When they disagree, fix one and log it.

## Status legend (every row carries one)

| Mark | Meaning |
|---|---|
| ✅ | **Canon** — taken verbatim (or normalised) from `docs/design/NN-*.md`; numbers may still be tuning placeholders |
| 🆕 | **Ratified 2026-09-19, not yet in JSON.** Authored by the design pass and approved as a batch. Port it when its version comes up; mark placeholder numbers `"_tuning": "placeholder"` |
| ⚠ | **Code divergence** — canon is settled but the shipped build still does something else. The row states both and names the version that fixes it |
| 🔒 | **Deferred** — canon content outside the current roadmap version (League, Champion, Region 3 legendaries); listed so ids are reserved |

## Conventions

- **Ids** are kebab-case, unique across *all* catalogs (a relic and a held item may not share an id: the relic is `charcoal-charm`, the held item `charcoal`). Ids never change once a save can reference them.
- **Numbers** are placeholders unless the row says `tuned`. The knob that owns a number is named (`BattleConfig.x`, `ProgressionConfig.y`) so tuning happens in one place.
- **Cross-references** inside a row use backticks: `` `vine-whip` ``. `node scripts/check-catalogs.mjs` (Pokémon Ascendant) extracts every backticked kebab id and checks it exists as a primary id in some catalog — the catalogs have the same rot-guard as the JSON.
- **Canon pointer**: each catalog names the § it implements; a catalog never restates a *rule*, only *data*. Rules live in the topic files; what is built is in `../implementation-status.md`.
- **Version column** says the roadmap version that first needs the row (`v0.1` … `v0.8`). Agents building version N ignore rows tagged later.

## Files

| Catalog | Rows | Canon | First needed |
|---|---|---|---|
| `species-r1.md` | Region 1 launch pool: 24 lines / 57 species with learnsets, archetype payloads, ability pools, Mastery lines | §6.3, §6.9, §2.6.3, §5.13 | v0.2 (recruits), v0.3 (evolution) |
| `species-pool-r2-r3.md` | Region 2/3 pools, Elite and Gym rosters, legendaries (ids reserved) | §2.6.3 spec | v0.7 |
| `moves.md` | ~170 moves (56 shipped in v0.1) | §3.6, §4.1, §6.3.6 | v0.1+ |
| `abilities.md` | 38 abilities (12 hooked in v0.1) with hook classification | §6.5, §6.6, §6.5.1 | v0.3 |
| `mastery-moves.md` | Mastery Lv1–Lv3 per line + unlock achievements | §5.13.2, §6.8 | v0.6 |
| `consumables.md` | 24 launch consumables + balls + Defog + Evolution Items (new class) | §7.2, §2.6.4, §6.3.2 | v0.1 (11) / v0.4 |
| `relics.md` | 50 drop-pool + 10 Legendary, with meta tiers and Tier-2 unlock criteria | §7.3, §8.6 | v0.4 |
| `held-items.md` | 19 held items | §7.4 | v0.4 |
| `tms.md` | 15 TMs with compatibility lists | §7.5, §6.4.1 | v0.3 |
| `trainers.md` | 8 archetypes × 3 regions, rosters, rewards, sprites, lines | §2.7 | v0.2 |
| `gyms.md` | 12 Gym Leaders (teams, Phase-2 archetype, Home Field, badge, sprite) | §5.9, §5.10 | v0.2 (1) / v0.5 (4) / v0.7 (12) |
| `elites.md` | Elite Trainer roster (Rival / Giovanni / Specialists) + Elite Wilds per region | §2.8 | v0.4 |
| `mystery-events.md` | 12 canon + 10 proposed events, choices as effect data | §2.10 | v0.4 |
| `modifiers.md` | 12 badges · 17 region modifiers · 10 difficulty modifiers, each as a hook | §5.10, §2.11.3, §8.8 | v0.4–v0.5 |
| `achievements.md` | 50 achievements with trigger events | §8.7 | v0.5 (10) / v0.6 |
| `biomes-regions.md` | 8 biomes, 3 regions, encounter weights, level bands, palettes | §2.6.1, §2.13 | v0.2 |
| `field-effects.md` | 4 fields + Home Field per type | §4.3 | v0.7 |
| `economy.md` | ₽ sources/sinks, prices, XP tables, level curve, run budget | §2.14, §2.9.2, §2.11.2, §6.2, §8.3 | v0.2+ |

## Porting a row to JSON

1. Copy the row's fields into the matching file under `src/content/data/` (the Zod schema in `src/content/schemas/` is the field contract; extend the schema when a catalog column has no field yet).
2. Keep the id. Add `"gdd": "§x.y"` and, for placeholders, `"_tuning": "placeholder"`.
3. Run `npm run check` — it includes the catalogue and reference guards.
4. Flip the row's status in the catalog to note the version it shipped in (`✅ v0.3`).
