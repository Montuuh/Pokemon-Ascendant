# Pokémon Ascendant — Art Pipeline (fast lanes)

> The Unity project stalled on art for two non-artistic reasons: generation needed a human step, and every asset
> needed an import + bind step inside the editor. Both are gone here. **Art is a file at a canonical path.**
> Adding art = drop the file → reference by id/path → `npm run shot` → look at it. The whole loop is scriptable
> and Claude can run it end to end.

## 1. Art direction for the slice (locked, from `docs/design/ui/01 §9.1.1` + `ui/08`)

**Modern Illustrated, warm.** Bright cel-shaded creature-RPG feel; warm cream front-end, warm-dim stage; rounded
chrome; canonical Gen I type hues. Concretely:

| Layer | Source | Status |
|---|---|---|
| Pokémon portraits (475²) | PokéAPI official artwork | ✅ 46 migrated (`public/art/pokemon/portraits`) |
| Box / avatar icons (68×56) | PokéAPI Gen VIII icons | ✅ 18 migrated (`public/art/pokemon/icons`) |
| Battle sprites, animated (front/back) | Pokémon Showdown gen5ani | ✅ 36 fetched (`public/art/pokemon/battle`) |
| Type labels ×15 | **The games' own pixel labels** — the FireRed/LeafGreen "FIRE" / "WATER" boxes, 32×12, from the PokéAPI sprites mirror (`npm run art:types`; `--set generation-iv/heartgold-soulsilver` for the 48×16 Gen IV set). Drawn with nearest-neighbour scaling at 12/15/18/24 px tall. *(2026-09-22, the user's call: neither the authored silhouettes nor the modern franchise emblems sat with the pixel-art sprites; the Gen III–V labels are the sprites' own era.)* | ✅ 15 (`public/art/icons/type`) |
| Game glyphs: status ×6, intent ×7, trait ×5, modifier ×2, rarity ×5, medal ×4, action ×10, nav ×8, toolbar ×6 | Authored SVG set (`docs/art/icon-set.md`) | ✅ 56 (`public/art/icons/<family>`) |
| Nav / system icons | Tabler via `@tabler/icons-react` (MIT) | ✅ installed |
| Item icons (consumables) | **The real Scarlet & Violet renders** at 160², fetched from Serebii (`npm run art:pokemon`) | ✅ 11 |
| Map node markers | **Real assets on a common badge disc**: the HGSS tall-grass tile, the HGSS Pokémon Centre, the Boulder Badge, and the four Showdown trainer-class sprites | ✅ 7 (`npm run art:pokemon`, then `install-art badge`) |
| Stage backdrops | **The real battle backgrounds**, ripped from the games via Showdown's gen6 set (`npm run art:fetch`) | ✅ 13 |
| Card art (144×96) | Type-glyph on a gradient window → generated later | ◐ fallback live |
| VFX / motion | CSS keyframes + DOM floating numbers (`src/ui/styles/motion.css`, `useCombatFx`) | ✅ v0.1 |
| Trainer sprites | Showdown trainer sprites | ✅ 7 fetched, one per archetype. **Do not generate these** — AI trainers clash with the pixel-art battle sprites |
| Main-menu vista | Generated **top-down pixel art**, the same overworld register as the map plate | ✅ `public/art/ui/menu-vista.png` |
| Region map plate | Generated **top-down pixel art**, deliberately a different register from the cel-shaded battle plates, because that is how a Pokémon route map is read. Installed with nearest-neighbour scaling and an indexed palette | ✅ `public/art/map/region-1.png` |
| Town lobbies (§2.11) | Generated **top-down pixel art**, one landmark per door on its own plot so every building reads at a glance; the menu vista as the style key (`--ref`), best of four. `install-art town` (nearest-neighbour, indexed, 1920×1080). The doors are boxes over the buildings in `src/ui/screens/city/towns.ts`, measured off the installed PNG — redraw the art, re-measure the boxes. **Changing one building** (v0.7.7's Ring and Coliseum) is an edit, not a redraw: generate with the installed lobby — or a ×3 crop of the square — as `--ref`, then `node scripts/patch-town.mjs` pastes back only the pixels that changed (a diff mask, closed and hole-filled, inside a box around the square), snapped to the original's own palette; everything else stays byte-identical, which a pixel diff against git proves. A placeholder until v1.2 builds the towns from tilesets | ✅ `public/art/towns/pallet-town.png`, `celadon-city.png` |
| Game Corner wall and Black Market (§2.11.6) | **The real FRLG maps**, cut on the 16-px grid (`npm run art:rocket`): the Game Corner's back wall before and after the switch, the Rocket Hideout's wall, floor and stairs; shown at a whole-pixel scale | ✅ `public/art/game-corner`, `public/art/black-market` |
| Safari Zone board (§2.11.6) | **The real FRLG Safari tiles**, cut on the 16-px grid from the Archives' map of the Safari entrance (`npm run art:safari`), shown at a whole-pixel scale (a tile is a multiple of 16 px); bait and rock generated in the same register and brought down to the same grid (`install-art pixel-icon`) | ✅ `public/art/safari` |
| Fonts | Baloo 2 + Nunito variable (OFL), bundled | ✅ |

**Rule of thumb (revised 2026-09-20).** In order:

1. **If the real asset exists, ship the real asset.** Not "generate something like it" — the actual file.
   That is now every sprite, every item, every badge, every trainer, and every battle backdrop. v0.4 had
   generated the four in-use backdrops; v0.5 put the real ones back, because *a generated backdrop behind a
   real sprite is the one place the seam always shows*. The generated Gym was the better illustration and
   the worse Gym.
2. **If it has to be generated, generate it in the game's own format**, not in a style adjacent to it. The
   tell is the register, not the subject: v0.4's menu vista had a red-roofed Centre, a Poké Mart and tall
   grass, and still read as fan art of a Pokémon game, because it was a modern cel-shaded illustration
   sitting above a screen full of 16-bit sprites. Redrawn as a top-down overworld town it reads as the game.
   Only the **scenes** are generated now, and there are two of them: the menu vista and the route plate.
3. **Never the creatures.** Not for IP reasons — for craft ones. A model-drawn Pikachu next to a genuine
   64×64 sprite looks wrong at any prompt quality.

The short version: **generate a scene, fetch an object** — and generate the scene in pixels.

**The one family that stays authored: the six status glyphs.** There is no official asset to fetch. In the
games a status is a small badge reading `BRN` / `PSN` / `PAR`, which is *typeset text in the player's
language*, not a glyph — it would be illegible at a portrait corner and wrong in every locale but one. A
symbol in the status's own canonical colour is the faithful translation, not a substitute for one. Same
reasoning, opposite conclusion, as the type glyphs: there the franchise *does* have a language-neutral
emblem, so we use it.

Pokémon Ascendant is a free, non-commercial fan project and it is not sold, so the brief is fidelity to the
look, and the disclaimer in `ATTRIBUTION.md` carries the rest.

## 2. Lanes and commands

| Lane | Command / procedure | Output |
|---|---|---|
| Portraits + box icons for new species | `npm run art:portraits -- <dex…>` | `public/art/pokemon/{portraits,icons}/NNN-<id>.png` |
| Animated battle sprites | add species to `src/content/data/roster-vs.json` → `npm run art:sprites` | `public/art/pokemon/battle/<id>.gif`, `<id>-back.gif` |
| Game glyph | author SVG (32×32 viewBox, 2.2–3 px rounded strokes, style in `docs/art/icon-set.md`) | `public/art/icons/<family>/icon-<family>-<name>.svg` |
| Backdrop, procedural | CSS layers in the screen's `.backdrop` (gradients, SVG shapes, parallax) | in the `.module.css` or `public/art/stages/<name>.svg` |
| Backdrop / card art, generated | `npm run art:gen -- --out <path>.png --prompt-file docs/art/prompts/<name>.txt --aspect 16:9 --n 4 [--ref <style-key>.png]` | PNG on disk; read it back and judge |
| VFX | keyframes in `src/ui/styles/motion.css`; components toggle classes from sim events | no assets |

Prompts: copy the relevant block from `docs/art/backdrop-prompts.md` into
`docs/art/prompts/<name>.txt`. Generate the **Main-Menu vista first** as the style key, then pass it with `--ref`.
The generation script needs `GEMINI_API_KEY` in `.env` (`.env.example`). Budget note: a whole backdrop set costs
a few dollars; that money buys back the human-in-the-loop that stalled the last project.

## 3. Conventions

| Asset | Size | Format | Naming |
|---|---|---|---|
| Portrait | 475×475 | PNG RGBA | `NNN-<id>.png` |
| Box icon | 68×56 | PNG RGBA | `NNN-<id>.png` |
| Battle sprite | native gif (≈96²) | GIF (animated) | `<id>.gif`, `<id>-back.gif` |
| Glyph | 32×32 viewBox | SVG | `icon-<family>-<name>.svg` |
| Stage backdrop | 1920×1080 (16:9), calm centre + lower third | PNG/JPG ≤ 600 KB or SVG | `<region>-<scene>.png` |
| Card art | 144×96 | PNG | `<move-id>.png` |
| Trainer sprite | native | PNG | `trainer-<class>.png` |

All filenames lowercase kebab. Pokémon art paths are derived by the helpers in `src/content/schemas/species.ts`
— never hand-write them elsewhere. Rot-guard tests assert every referenced asset exists.

## 4. Judging art (the only rule that matters)

Judge **in context, at real size**: render the screen with `npm run shot` and Read the PNG. Check: readability
of HP/AP/intent over it, calm zones where UI sits, palette harmony with `tokens.css`, warmth (pillar 5), no text
or logos in generated images. Iterate up to three prompt/SVG rounds, then show the user two or three candidates.

## 5. Licences (fan project, non-commercial)

- Pokémon artwork, sprites and names are © Nintendo / Creatures / GAME FREAK. Used under fan-project custom;
  the game is free and carries the disclaimer on the menu. No store sale of Pokémon assets — ever.
- Pokémon Showdown sprites: credit Pokémon Showdown and the Smogon sprite project (`ATTRIBUTION.md`).
- Tabler icons: MIT. game-icons.net: CC BY 3.0 (attribution required). Fonts: SIL OFL 1.1.
- Generated images: per Google's terms; they carry SynthID; they are original scenes with no IP characters.

---

## 5. Generated art — how it actually authenticates (2026-09-19)

`npm run art:gen` defaults to **Vertex AI**, not the AI Studio endpoint, and uses **no API key at all**.
This is the part that cost an afternoon, so it is written down.

**The money.** Google AI Pro's promotional credits are GCP credits. They are spent through Vertex AI. They
are *not* AI Studio "Prepay" credit, which is a separate pot you top up by hand and which starts empty. Calling
`generativelanguage.googleapis.com` with a `GEMINI_API_KEY` therefore returns
`429 RESOURCE_EXHAUSTED — prepayment credits are depleted` even on a paid plan. That error means "use Vertex",
not "buy more credit". The same lesson, and the same fix, is in `Oak Forge 3D/lib/vertex-ai-images.ts`.

**Setup, once per machine.**

```bash
gcloud auth application-default login
gcloud config set project <your-gcp-project>
```

The project needs `aiplatform.googleapis.com` enabled and billing active. The script reads the project from
`GOOGLE_CLOUD_PROJECT` if set, otherwise from whatever gcloud is pointed at, so there is nothing to paste and
no secret on disk.

**Models.**

| Model | Endpoint | Notes |
|---|---|---|
| `gemini-3-pro-image` | `global` only | Nano Banana Pro. The default. Best fidelity; ~5 MB at 2K. |
| `gemini-2.5-flash-image` | `europe-west1` | Nano Banana. Cheaper, still good, useful for bulk icon passes. |

Gemini 3.x image models are **not published to regional endpoints**. A `404 Publisher Model ... not found`
against `europe-west1` means the model is fine and the location is wrong; the script picks `global`
automatically for any `gemini-3*` id.

**The one-word trap.** The request must ask for `responseModalities: ['TEXT', 'IMAGE']`. With `['IMAGE']`
alone, `gemini-3-pro-image` returns `finishReason: IMAGE_RECITATION` and no image, which reads exactly like
a content refusal and is not one.

**Flags that matter.**

| Flag | Why |
|---|---|
| `--aspect 16:9` | Without it everything comes back square and a backdrop arrives cropped. |
| `--size 2K` | Default. `1K` comes back small and soft, which is the problem we were solving. |
| `--n 4` | Best-of-four is a choice; one shot is a coin flip. The biggest quality lever here. |
| `--ref <png>` | Attaches a style key so eleven backdrops look like one game. Generate the Main-Menu vista first, then pass it to every other scene. |

**Cost.** Roughly €0.04 per image on 2.5-flash-image and more on Pro. The eleven-backdrop set at four variants
each is well inside a month's credit. Confirm current pricing before a bulk run.

**What still needs replacing.** `public/art/stages/*.jpg` are 800×480 Showdown battle backgrounds, upscaled
2.4× at 1920×1080. They are the biggest visual weakness in the build and the riskiest asset class for a fan
project. Generated originals fix both at once. Proof of the quality delta: `playtest/artgen/r1-route-*.png`.

## 6. What is deliberately NOT generated

One family only, and the reason is craft, not law:

| Family | Why not |
|---|---|
| Pokémon themselves, and pixel-art trainer sprites | We already have the official renders and the Showdown sprite set. A smooth generated creature next to a real 64×64 sprite reads as a mistake. Generated art surrounds the sprites; it does not replace them. |

Everything else is fair game and should lean *into* the franchise look: Poké Ball motifs, Gym badges, the
red-roofed Centre, Potion bottles with the classic cap, route signposts, tall-grass patches.

## 7. The whole set, and what it costs

| Family | Aspect | Source | Count |
|---|---|---|---|
| Battle backdrops in use | 16:9 | `gemini-3-pro-image` | 4 |
| Main-menu vista, Region map plate, town lobbies | 16:9 | `gemini-3-pro-image` | 4 |
| Consumable item icons | 1:1 | **real** — Serebii S&V renders | 11 |
| TM discs, one per type | 1:1 | **real** — S&V bag sprites, Bulbagarden | 4 |
| Map node markers | 1:1 | **real** — badge / building / tile / trainer sprites on a shared disc | 10 |

The item and marker rows moved from generated to real when the doctrine settled (§6 above): a model
approximates an object and cannot reproduce a specific one, and the player already knows exactly what a Potion
and a Boulder Badge look like. `npm run art:pokemon` fetches them; `install-art item|badge` mounts them.
v0.3 added the Dojo marker (the FRLG Fighting Dojo building) and the four TM discs.

Generate two variants of anything that ships and look at both. The install step
(`node scripts/install-art.mjs`) resizes and converts; never drop a 5 MB PNG into `public/` directly.

## 8. Two rules the second pass added

**Pixel art needs the whole chain to respect it.** Generate small (`--size 1K`), install with the `pixel`
profile so the upscale is nearest-neighbour, set `image-rendering: pixelated` on the element, and remove any
blur the screen was applying. Miss any one of those four and you have an expensive smudge.

**Say the canonical design, not the shape.** "A small bottle of purple liquid" gives you a generic potion.
"The classic Pokémon Antidote: a small squat glass bottle with a rounded purple cap and a purple label band"
gives you the item. The medicines in particular share one aerosol-can silhouette and differ only by colour
band — naming that silhouette is what makes eleven icons read as one bag.
