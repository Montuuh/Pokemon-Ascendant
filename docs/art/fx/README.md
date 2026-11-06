# Move animations from sprites

**Status (2026-11-06):** pret import, recipes and the sprite renderer built (v0.9.102, §9.9.2 in
`docs/design/09-presentation.md`). The 8 ChatGPT moves use a pret stand-in until their sheets arrive.

Combat move animations were CSS/SVG shapes in eight motion kinds (`src/ui/components/MoveFx.tsx`,
`src/ui/moveMotion.ts`, §9.9.2), so many moves looked alike. The user wants a unique animation for every move. The
chosen route (user, 2026-11-06) is **pret first, ChatGPT for the gaps**. A move effect the player has seen in the
games is an object, and the art rule is to fetch objects and generate only what does not exist
(`docs/session/standing-facts.md`, *Art*).

## Where each move's animation comes from

`move-fx-chatgpt.xlsx`, sheet *Todos los movimientos*, lists all 419 moves:

| Source | Moves | What it means |
|---|---:|---|
| pret | 234 | The move's own FRLG script (`Move_*` in `battle_anim_scripts.s`) and the sprites it loads |
| pret, no sprites | 19 | The GBA only moves, tints or shakes the Pokémon (Agility, Harden, Earthquake…) |
| Composed from pret | 49 | Gen IV moves drawn with pret sprites, often re-paletted as the GBA does (Fire/Ice/Thunder Fang = fangs + ember/crystals/spark) |
| `-plus` variant | 109 | Its base move's animation, stronger |
| ChatGPT | 8 | Nothing in pret reads right: Wood Hammer, Dragon Pulse, Aura Sphere, Dark Pulse, Flash Cannon, Gunk Shot, Stone Edge, Stealth Rock |

pret's library is 306 battle-anim graphics (280 sprites, 17 backgrounds, masks), pinned to the same commit as the
rooms (`PRET_COMMIT` in `scripts/lib/frlg-map.mjs`). The scripts and tables are in `docs/art/sources/pret-battle-anims/`.

## Import contract for the ChatGPT sheets

- The user generates each row's prompt in ChatGPT at the stated size (1024×1024 for a 2×2 grid, 1536×1024 for 3×2).
  Each cell is 512 px, a 64×64 logical sprite at 8×, on a flat key colour (magenta, or pure green for purple effects).
- The raw PNG, untouched, goes to `docs/art/sources/fx-chatgpt/<move-id>.png`. Alternates are `<move-id>-2.png`…
- Import, still to build: slice the grid, key out the background, sample to the 64-px grid, quantise to ≤ 12 colours
  (`scripts/lib/move-palette.mjs`), trim to a shared frame box, write `public/art/fx/<move-id>.png` as a horizontal
  strip plus its frame count.

## Built

- `npm run art:fx` (`scripts/fx/import-pret-fx.mjs`): every pret battle-animation sprite, decoded in its tag's palette
  and cut into frames in the GBA's 1-D tile order, the 23 re-palettes of `scripts/fx/variants.mjs`, the 16 backgrounds
  (240 × 160), and per FRLG move script the sprites and backgrounds it loads → `src/ui/fx/pret-anims.json`.
  `node scripts/fx/contact-sheet.mjs [regex]` shows them in `playtest/fx-contact.png`.
- `src/ui/fx/moveFx.ts`: the recipe per move (`main`, `impact`, `bg`); FRLG moves from their script, Gen IV moves and
  the ChatGPT stand-ins in `COMPOSED`.
- `src/ui/components/MoveFx.tsx`: the sprite renderer over the existing choreography.
- To import a ChatGPT sheet: slice, key out, sample to 64 px, quantise, write `public/art/fx/<move-id>.png`, register
  its frames in the recipe (replacing the stand-in) and screenshot it with `e2e/move-sprites.spec.ts`.

## Rebuild the sheet

```bash
node scripts/fx/map-pret-anims.mjs <tmp>/pret-moves.json
node scripts/fx/classify-moves.mjs <tmp>
python scripts/fx/build-prompt-sheet.py <tmp> docs/art/fx/move-fx-chatgpt.xlsx
```
