---
name: art-add
description: >
  Add or replace any art asset (Pokémon portrait/sprite, icon, backdrop, card art, VFX) end to end: pick the
  lane, fetch or generate, place at the canonical path, reference it, and judge it in context with a
  screenshot. Use when asked for art, sprites, icons, backgrounds, "make it look like", or when a screen shows
  a placeholder. Read docs/art/pipeline.md first.
---

# Art add — Pokémon Ascendant

Art is a file at a canonical path plus (sometimes) one id reference. There is no import step. The judge step is
always **in context** (rendered on the real screen at real size), never the raw PNG.

## Pick the lane (docs/art/pipeline.md §Lanes)

| Need | Lane | How |
|---|---|---|
| Pokémon portrait / box icon | PokéAPI official artwork | `npm run art:portraits -- <dex…>` (script) or copy from `../ProjectAscendant/Assets/Sprites/VS` |
| Animated battle sprite | Showdown gen5ani | add species to `roster-vs.json` → `npm run art:sprites` |
| Game glyph (type/status/intent/rarity/medal) | Hand-authored SVG, 32×32, warm rounded stroke | write the SVG in `public/art/icons/<family>/icon-<family>-<name>.svg` matching the existing set |
| Nav / system icon | Tabler (`@tabler/icons-react`) | import the component; do not add files |
| Node / verb icon | game-icons.net (CC BY 3.0) | download SVG → `public/art/icons/node/`, tint in CSS, add attribution |
| Backdrop / stage | Procedural first (CSS/SVG layers), generated second | edit the screen's `.backdrop` CSS or add an SVG in `public/art/stages/`; with a key: `npm run art:gen -- --out public/art/stages/<name>.png --prompt-file <txt>` |
| Card art (144×96) | Type-glyph fallback now; generated later | `npm run art:gen -- --out public/art/cards/<move-id>.png --prompt "…"` |
| VFX / motion | CSS keyframes + DOM | `src/ui/styles/motion.css` + component classes; no sprite sheets |

## Procedure

1. Confirm the lane and the exact filename (lowercase kebab, sizes per pipeline doc).
2. Produce the file (fetch / write SVG / generate). For generated art, start from the prompt in
   `docs/art/backdrop-prompts.md`; attach the style key with `--ref` once one exists.
3. Reference it (content id, CSS url, or component prop). Never hardcode a path outside the helpers in
   `src/content/schemas/species.ts` for Pokémon art.
4. `npm run shot` → **Read the PNG**. Judge: readability at real size, palette against tokens, calm zones
   under UI, pillar 5 warmth. Iterate the prompt/SVG up to 3 times before asking the user to pick.
5. Third-party asset → line in `docs/art/ATTRIBUTION.md`. Update the inventory table in
   `docs/art/pipeline.md` if a new family appeared.
