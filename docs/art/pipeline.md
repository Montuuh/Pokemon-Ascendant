# Pokémon Ascendant — Art Pipeline & Classic Pixel Doctrine

> **Art is a file at a canonical path.** Adding or updating art = fetch or generate into a staging folder → process to exact pixel grid & palette → drop in `public/art/` → `npm run shot` → inspect in context.

## 1. Art Direction (Locked — Classic Pokémon Pixel Art, §9.1.1 & D9)

**Classic GBA/DS Pokémon Pixel Art inside a Warm Tactile Frame.**
Every creature, trainer, item, TM, relic, badge, overworld tile, town building and interior room speaks the **authentic Gen III–V Pokémon pixel-art language** (FireRed/LeafGreen 16-px overworld/interiors, GBA/DS 24×24–32×32 pixel bag icons, Gen V animated battle sprites, pixel-art typography). Never mix smooth 3D renders (like Scarlet & Violet 3D item renders), vector fan-art illustrations, or soft AI "mixels" into the game world.

| Layer | Source & Register | Status & Path |
|---|---|---|
| **Battle sprites** (front/back, normal & shiny) | Pokémon Showdown `gen5ani` & `gen5ani-shiny` (`npm run art:sprites`) | ✅ `public/art/pokemon/battle/*.gif` |
| **Box / party / owner icons** (68×56) | PokéAPI pixel box icons (`npm run art:portraits`) | ✅ `public/art/pokemon/icons/*.png` |
| **Pokémon portraits** (475²) | PokéAPI official artwork (or pixel sprites where pixel-unified) | ✅ `public/art/pokemon/portraits/*.png` |
| **Type labels** ×15 | **Authentic FRLG pixel boxes** (32×12, `npm run art:types`), rendered nearest-neighbour at 12/15/18/24 px | ✅ `public/art/icons/type/*.png` |
| **Consumable, Held, Stone, Ball, TM & Relic icons** | **Authentic GBA/DS pixel bag sprites** (`PokeAPI/sprites/items` & Bulbagarden Archives, `npm run art:items`). **Never** smooth 3D renders. Every relic and held item uses a **unique** pixel sprite | 🎯 **Priority 1** (`public/art/items/*.png`) |
| **Trainer sprites** (36) | Pokémon Showdown pixel trainer sprites (`npm run art:trainers`) | ✅ `public/art/trainers/trainer-*.png` |
| **Move card art** (161) | **GBA-style pixel art of the move effect** (never a creature) on a fixed 68×45 cell grid, ≤20 colours, 1-px dark outline, transparent ground (`npm run art:moves` + `scripts/install-move-art.mjs`), drawn at 2× | ✅ `public/art/moves/<move-id>.png` |
| **Region map terrain** | **Authentic FRLG 16×16 tiles**, cut from Bulbagarden Archives map renders (`npm run art:route`), painted by `src/ui/screens/map/tileset.ts` at 2× integer scale | ✅ `public/art/route/**` |
| **Wild Area landmarks** (25) | **Authentic FRLG map structures & tiles** (`npm run art:habitats`), cut with transparent flood-fill or assembled from route tiles + `grass.png` | ✅ `public/art/map/habitat/*.png` |
| **Town lobbies** (Pallet Town, Celadon City) | **Authentic FRLG overworld buildings & tiles** on the 16-px grid, with custom buildings (Challenge Ring, Coliseum) pixel-snapped to FRLG palette and grid | 🎯 **Priority 2** (`public/art/towns/*.png`) |
| **Interior rooms** (Hub, Poké Mart, Dept. Store, Game Corner, Black Market, Dojo) | **Authentic FRLG interior maps** from Bulbagarden Archives (`npm run art:hub`, `art:mart`, `art:rocket`), shown at integer pixel scale (`PixelRoom`) | ✅ `public/art/{hub,mart,game-corner,black-market}` (🎯 **Priority 3**: Dojo interior & Event vignettes) |
| **Safari Zone board** | **Authentic FRLG Safari Zone tiles & sprites** on the 16-px grid (`npm run art:safari`), plus pixel-grid bait & rock tokens | ✅ `public/art/safari/**` |
| **Stage backdrops** (21) | Official battle backgrounds via Pokémon Showdown (`gen6bgs` & classic pixel/battle sets, `npm run art:fetch`) | ✅ `public/art/stages/*.jpg` |
| **Gym Badges** (12) | Official badge sprites via Bulbagarden Archives (`scripts/fetch-map-emblems.mjs`) | ✅ `public/art/icons/map/node-gym-*.png` |
| **Typography** | **Classic Pokémon pixel-art fonts** for headers, names, levels, numbers, combat plates and chips + clean body fallback | 🎯 **UI/Font pass** (`src/assets/fonts`) |

---

## 2. Core Rules of Craft (Non-Negotiable)

1. **Fetch the real pixel asset first.** If the Pokémon games or the community (Showdown / Smogon / Spriters Resource / Bulbagarden / PokéAPI / PMD Collab) already drew an object, item, tile, building, trainer or creature in pixel art, **use the authentic pixel asset**. Never generate a Pokémon, trainer, badge or standard item with AI, and never use 3D/HD renders from Switch-era games when a Gen III–V pixel sprite exists.
2. **When generating custom art (scenes, custom props, move effects), enforce the pixel grid end-to-end.**
   - Raw AI outputs are **never** shipped directly: AI models produce "mixels" (inconsistent pixel sizes, soft gradients, anti-aliased edges, garbled sign text).
   - Every generated asset must pass through a deterministic `sharp` post-processor (`scripts/install-move-art.mjs` or `scripts/install-art.mjs` `pixel-sprite --palette-from`):
     1. Chroma-key / flood-fill the flat background out.
     2. Sample onto the exact target pixel grid (e.g. 68×45 for moves, 16×16 multiples for tiles/props).
     3. Snap colours to an indexed palette (or `--palette-from` an authentic FRLG map).
     4. Enforce a crisp 1-px dark outline (`alpha = 0` or `255`, zero semi-transparent fringe).
     5. Render in CSS with `image-rendering: pixelated` at integer (or clean 0.5×) multiples.
3. **One icon per mechanical identity.** Every Consumable, Held Item, Evolution Stone, Poké Ball, TM and Relic must have its own distinct pixel sprite. Do not reuse a Held Item's sprite on a Relic, or share one sprite between two different Relics.
4. **Judge in context, at real size.** Always render with `npm run shot` and inspect the PNG in `playtest/`. Check pixel crispness, contrast (WCAG AA per D5), calm zones under UI, and palette warmth.

---

## 3. Fast Lanes & Commands

| Lane | Command | Output |
|---|---|---|
| Battle sprites (animated front/back + shiny) | `npm run art:sprites` | `public/art/pokemon/battle/<id>[-back].gif` |
| Portraits + box icons | `npm run art:portraits -- <dex…>` | `public/art/pokemon/{portraits,icons}/NNN-<id>.png` |
| Trainer sprites | `npm run art:trainers` | `public/art/trainers/trainer-<class>.png` |
| Type pixel boxes (FRLG / HGSS) | `npm run art:types` | `public/art/icons/type/<type>.png` |
| All item, TM, stone, ball & relic pixel icons | `npm run art:items` | `public/art/items/<id>.png` |
| Move card pixel art | `npm run art:moves [id…]` · `npm run art:moves -- --sheet` | `public/art/moves/<move-id>.png` |
| Route FRLG tileset | `npm run art:route` | `public/art/route/**` |
| Wild Area FRLG habitat props | `npm run art:habitats` · `node scripts/habitat-gallery.mjs` | `public/art/map/habitat/*.png` |
| Hub / Mart / Rocket / Safari FRLG rooms | `npm run art:hub` · `art:mart` · `art:rocket` · `art:safari` | `public/art/{hub,mart,game-corner,black-market,safari}` |
| Raw AI image generation (Vertex AI) | `npm run art:gen -- --out <png> --prompt "…" --size 1K` | Staging file in `playtest/artgen/` |
| Install & quantise staging art | `node scripts/install-art.mjs <profile> <src> <name>` | `public/art/…` |

---

## 4. Vertex AI Generation Reference (`scripts/gen-image.mjs`)

`npm run art:gen` authenticates via **Google Cloud Vertex AI** (`gcloud auth application-default login`), using GCP promotional/billing credits rather than AI Studio keys.

| Model | Endpoint | Best for |
|---|---|---|
| `gemini-3-pro-image` | `global` (auto-selected) | High-fidelity custom structures, event vignettes, schwierige move re-rolls |
| `gemini-2.5-flash-image` | `europe-west1` or `global` | Bulk move-art passes (`GOOGLE_CLOUD_LOCATION=global --jobs 2`) |

- Always pass `responseModalities: ['TEXT', 'IMAGE']` (handled by `gen-image.mjs`).
- Never drop a raw multi-megabyte output from `gen-image.mjs` directly into `public/art/`; always run it through the pixel-grid installer first.

---

## 5. Attribution & Licensing

All third-party and official fan-archive assets must be recorded in [`docs/art/ATTRIBUTION.md`](ATTRIBUTION.md).
- Pokémon sprites, tiles, badges, items and names are © Nintendo / Creatures / GAME FREAK, used under non-commercial fan-project custom with the main-menu and README disclaimers.
- Community sprite work (Pokémon Showdown / Smogon Sprite Project, Bulbagarden Archives map renders) is credited in `ATTRIBUTION.md`.
