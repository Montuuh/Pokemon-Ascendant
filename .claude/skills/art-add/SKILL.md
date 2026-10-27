---
name: art-add
description: >
  Add or replace any art asset (Pokémon portrait/sprite, icon, backdrop, card art, overworld/interior prop, VFX)
  end to end: pick the lane, fetch authentic GBA/DS pixel art or generate via Nano Banana + pixel quantisation,
  place at the canonical path, reference it, and judge it in context with a screenshot. Use when asked for art,
  sprites, icons, backgrounds, "make it look like", or when a screen shows a placeholder. Read docs/art/pipeline.md first.
---

# Art add — Pokémon Ascendant

Every visual asset in *Pokémon Ascendant* obeys the **Classic Pokémon Pixel Art Doctrine** (`docs/design/ui-doctrine.md §D9`, `docs/art/pipeline.md`): authentic **GBA/DS handheld pixel art** (*FireRed / LeafGreen*, *Emerald*, *HeartGold / SoulSilver*, *Black / White*). Never mix modern 3D renders (*Scarlet/Violet*), painted high-res Sugimori portraits, flat vector illustrations, or raw un-quantised AI "mixels" alongside pixel sprites.

Art is a file at a canonical path plus (sometimes) one id reference. The judge step is always **in context** (rendered on the real screen at real size with `image-rendering: pixelated`), never the raw PNG alone.

## AI Image Generation Engine & Brain

When an asset must be generated with AI (move card effects, custom pixel props/structures, stage/city vistas that have no direct canonical GBA/DS tile cut):

1. **Brain & Orchestration (`argon 4` / `pro` reasoning + `image-generator` / `art:gen`):**
   - Use the top-tier reasoning brain (`argon 4` / `pro` model in subagent orchestration) to craft strict GBA/DS pixel-art prompts and inspect every output on a contact sheet before installation.
   - Generate images using **Nano Banana** (`gemini-3-pro-image` / Nano Banana Pro via `npm run art:gen -- --out <raw.png> --prompt "…"`, or `gemini-2.5-flash-image` for bulk move passes via `scripts/gen-move-art.mjs`, or the `image-generator` subagent).
2. **Mandatory Pixel-Art Prompting & Post-Processing (No Mixels):**
   - Every Nano Banana prompt **must** specify: *16-bit Game Boy Advance pixel art (Pokémon FireRed / LeafGreen / Emerald era), low resolution pixel grid, crisp hard square pixels, limited 8–16 colour palette, 1-pixel dark outlines, no anti-aliasing, no smooth gradients, flat single-colour background for keying*.
   - **Never ship raw Nano Banana output directly to `public/art/`.** Every generated sprite or illustration must pass through `scripts/install-art.mjs` (`town`, `pixel-sprite`) or `scripts/install-move-art.mjs` to key out the background, snap to the true pixel grid (`kernel: 'nearest'`), and quantise the palette.

## Pick the lane (`docs/art/pipeline.md §3`)

| Need | Lane | How |
|---|---|---|
| Pokémon portrait (`portraits/NNN-id.png`) & box icon (`icons/NNN-id.png`) | Pixel-art front sprite trimmed & centred from canonical battle sprite + Gen VIII pixel box icon | `node scripts/fetch-portraits.mjs` |
| Animated battle sprite (`battle/<id>.gif`) | Showdown `gen5ani` / `gen5ani-shiny` | add species to `roster-vs.json` → `npm run art:sprites` |
| Item / TM / Relic / Stone / Ball icon (`items/<id>.png`) | Authentic 24×24 GBA/DS pixel bag sprites (`PokeAPI/sprites/items`) | `npm run art:items` (`scripts/fetch-item-icons.mjs` — never 3D S&V renders; 100 % unique sprite per item/relic) |
| Type / Status / Intent / Medal badge | Authentic GBA/DS pixel-art pills & 16×16 / 24×24 pixel sprites | `public/art/icons/<family>/` (`npm run art:types` for FRLG type pills; pixel-art sprites/SVGs aligned to integer pixel grid) |
| Move card art (`moves/<id>.png`, 68×45 pixel grid) | Nano Banana GBA pixel-art effect + `install-move-art.mjs` | `npm run art:moves -- <move-id…>` (`scripts/gen-move-art.mjs` + `scripts/install-move-art.mjs`) |
| Overworld / interior room / habitat prop | Authentic FRLG 16×16 tiles & map structures (or Nano Banana + `install-art.mjs pixel-sprite`) | `npm run art:route`, `art:habitats`, `art:mart`, `art:hub`, `art:rocket`, `art:safari` |
| Stage / Town backdrop (`stages/`, `towns/`) | Pixel-art scene via Nano Banana Pro + `install-art.mjs town` | `npm run art:gen -- --out playtest/artgen/<name>.png --prompt "…"` → `node scripts/install-art.mjs town …` |
| Nav / system chrome icon | Tabler (`@tabler/icons-react`) | import the component for UI chrome buttons only; never for in-world Pokémon objects |
| VFX / motion | CSS keyframes + DOM | `src/ui/styles/motion.css` + `src/ui/moveMotion.ts`; no sprite sheets |

## Procedure

1. Confirm the lane and the exact filename (lowercase kebab, sizes per `docs/art/pipeline.md`).
2. Produce the file:
   - If canonical Pokémon/GBA/DS sprite exists → fetch via script (`fetch-item-icons.mjs`, `fetch-portraits.mjs`, `fetch-sprites.mjs`, `fetch-hub-art.mjs`, etc.).
   - If generated via Nano Banana → generate at least 2–4 candidates (`--n 4`), quantise to the pixel grid (`install-art.mjs` / `install-move-art.mjs`), and build a contact sheet when presenting options to the user.
3. Reference it via `src/ui/art.ts` or `src/content/schemas/species.ts` helpers, and ensure `image-rendering: pixelated; image-rendering: crisp-edges;` applies.
4. `npm run shot` (or targeted Playwright spec) → **Read the PNG**. Judge in context: pixel crispness, integer scaling, readability at real size, palette against tokens, calm zones under UI, Pillar 5 warmth.
5. Third-party asset → record in `docs/art/ATTRIBUTION.md`. Update `docs/art/pipeline.md` if a new asset family is added.
