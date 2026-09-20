---
name: port-from-unity
description: >
  Port one system, rule, content set or test suite from the Unity project (../ProjectAscendant) into Pokémon Ascendant's
  TypeScript sim. Use when asked to "port", "bring over", "migrate" a combat rule, resolver, content seeder or
  test file. Follows the port map in docs/migration/from-unity.md and keeps the C# tests as the spec.
---

# Port from Unity — Pokémon Ascendant

Source of truth for the port: `docs/migration/from-unity.md` (port map, order, parity notes). The Unity repo is
at `../ProjectAscendant` — **read-only**; never modify it.

## Steps for one unit of work (a resolver, a rule cluster, a content family)

1. **Locate**: the C# file(s) under `Assets/Scripts/**` and their tests under `Assets/Tests/EditMode/**`.
   Read the tests first — they are the executable spec and list the edge cases.
2. **Read the §** the C# cites (`// Per §…`) in `docs/design/`. If code and § disagree, the § wins; log a
   `⚠️ OPEN` if the § is ambiguous — do not port a bug because it shipped.
3. **Design the TS shape**: state fields on the discriminated-union `CombatState`, a reducer case or a pure
   function in `src/sim/<area>/`, config fields in `BattleConfig`/content. No classes with hidden state.
4. **Port the tests first** to Vitest (`Method_Scenario_Expected`, § headers), then make them pass.
5. **Parity notes**: where C# used `float` (Mathf, `float` fields) note it in a comment; where an integer
   `floor` could differ, add a golden-master case rather than guessing.
6. **Content**: the Unity seeders (`Assets/Scripts/Editor/VS_*Seeder.cs`) are code-as-data. Transcribe to JSON
   under `src/content/data/`, validate with the Zod schema, add a rot-guard test. Cross-check a sample against
   the `.asset` YAML if a value looks off.
7. `npm run check` green → update the port map status table in `docs/migration/from-unity.md`.

## Do not

- Do not port MonoBehaviours, ScriptableObject plumbing, event-channel assets, Addressables, or editor tooling.
  Their purpose is served by reducers, JSON, the store and Playwright respectively.
- Do not widen scope: port what the current roadmap version needs (docs/roadmap.md), leave the rest listed.
