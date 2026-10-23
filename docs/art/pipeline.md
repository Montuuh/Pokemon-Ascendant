# Pokémon Ascendant — Art Pipeline & Classic Pixel Doctrine

> **Art is a file at a canonical path.** Adding or updating art = fetch or generate into a staging folder → process to exact pixel grid & palette → drop in `public/art/` → `npm run shot` → inspect in context.

## 1. Art Direction (Locked — Classic Pokémon Pixel Art, §9.1.1 & D9)

**Classic GBA/DS Pokémon Pixel Art inside a Warm Tactile Frame.**
Every creature, trainer, item, TM, relic, badge, overworld tile, town building and interior room speaks the **authentic Gen III–V Pokémon pixel-art language** (FireRed/LeafGreen 16-px overworld/interiors, GBA/DS 24×24–32×32 pixel bag icons, Gen V animated battle sprites, pixel-art typography). Never mix smooth 3D renders (like Scarlet & Violet 3D item renders), vector fan-art illustrations, or soft AI "mixels" into the game world.

| Layer | Source & Register | Status & Path |
|---|---|---|
| **Battle sprites** (front/back, normal & shiny) | Pokémon Showdown `gen5ani` & `gen5ani-shiny` (`npm run art:sprites`) | ✅ `public/art/pokemon/battle/*.gif` |
| **Box / party / owner icons** | PokéAPI pixel box icons (`npm run art:portraits`); 151 compact derivatives trimmed to exact alpha bounds without resampling (`node scripts/build-compact-icons.mjs`) | ✅ `public/art/pokemon/{icons,compact}/*.png` |
| **Pokémon portraits** (475²) | PokéAPI official artwork (or pixel sprites where pixel-unified) | ✅ `public/art/pokemon/portraits/*.png` |
| **Type labels** ×15 | **Authentic FRLG pixel boxes** (32×12, `npm run art:types`), rendered nearest-neighbour only at 12/18/24 px | ✅ `public/art/icons/type/*.png` |
| **Consumable, Held, Stone, Ball, TM & Relic icons** | **Authentic GBA/DS pixel bag sprites** (`PokeAPI/sprites/items` & Bulbagarden Archives, `npm run art:items`). **Never** smooth 3D renders. Every relic and held item uses a **unique** pixel sprite | 🎯 **Priority 1** (`public/art/items/*.png`) |
| **Trainer sprites** (36) | Pokémon Showdown pixel trainer sprites (`npm run art:trainers`) | ✅ `public/art/trainers/trainer-*.png` |
| **Move card art** (161) | **GBA-style pixel art of the move effect** (never a creature) on a fixed 68×45 cell grid, ≤20 colours, 1-px dark outline, transparent ground (`npm run art:moves` + `scripts/install-move-art.mjs`), drawn at 2× | ✅ `public/art/moves/<move-id>.png` |
| **Region map terrain** | **Authentic FRLG 16×16 tiles**, cut from Bulbagarden Archives map renders (`npm run art:route`), painted by `src/ui/screens/map/tileset.ts` at 2× integer scale | ✅ `public/art/route/**` |
| **Wild Area landmarks** (25) | **Authentic FRLG map structures & tiles** (`npm run art:habitats`), cut with transparent flood-fill or assembled from route tiles + `grass.png` | ✅ `public/art/map/habitat/*.png` |
| **Town lobbies** (Pallet Town, Celadon City) | **Authentic FRLG overworld buildings & tiles** on the 16-px grid, with custom buildings (Challenge Ring, Coliseum) pixel-snapped to FRLG palette and grid | 🎯 **Priority 2** (`public/art/towns/*.png`) |
| **Interior rooms** (Hub, Pokémon Center, Poké Mart, Dept. Store, Game Corner, Black Market, Dojo) | **Authentic FRLG tiles and interior maps** from Bulbagarden Archives, shown at whole or half-step pixel scale (`PixelRoom`). The Center has its own 320×224 composition; the Dojo adds palette-matched practice props and authentic Gen III creatures to its original room | ✅ `public/art/{hub,center,mart,game-corner,black-market,dojo}` (🎯 **Priority 3**: Event vignettes) |
| **Safari Zone board** | **Authentic FRLG Safari Zone tiles & sprites** on the 16-px grid (`npm run art:safari`), plus pixel-grid bait & rock tokens | ✅ `public/art/safari/**` |
| **Stage backdrops** (45) | Existing JPG scene compositions, normalised to indexed 640×360 PNG, ≤256 colours per scene, no dithering (`node scripts/normalise-stages.mjs install`); JPGs retained as sources | ✅ `public/art/stages/*.png`; source/output SHA-256 in `manifest.json` |
| **Gym Badges** (12) | Official badge sprites via Bulbagarden Archives (`scripts/fetch-map-emblems.mjs`) | ✅ `public/art/icons/map/node-gym-*.png` |
| **Typography** | **Pixelify Sans** for headings, names and chips; **Tiny5** for numbers; **Nunito** for prose. Locally bundled SIL OFL fonts | ✅ `src/assets/fonts` |

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

### Indigo Ascent scenes (A11)

Rebuild `public/art/league/summit.png` (304×240) and `gallery.png` (448×224) with `node scripts/build-league-art.mjs`. The arrival uses authentic Indigo Plateau façade and approach crops. The new gallery composes five authentic thresholds, statues and furniture on stone paving, with palette-matched runner strips and a separate Champion bay; it does not reuse the Hub room plan. The manifest retains source hashes, crop coordinates and native door anchors. No generated imagery or resampling is used.

The Summit renders at 2×/3× on the supported desktop viewports; the gallery fits available space in half-step scales. Its DOM controls follow the native gate anchors, while `PixelSprite` preserves each trainer's own grid. The selected direction and historical alternatives are retained in `docs/design/ui/mockups/league-arrival`.

### Mystery Event scenes (A10)

Every implemented Mystery Event, including Eevee's Stone Cache, has a native 256×112 vignette in `public/art/events`. The 15 compositions reuse authentic FRLG tiles and furniture, Emerald people and objects, and previously credited habitat props. The hot spring uses the Emerald Lavaridge map. No AI generation is used for this family; the existing cave landmark retains its original pixel-authored opening.

Rebuild with `node scripts/build-event-art.mjs` (add `--fetch` to refresh pinned sources). `manifest.json` records source URLs, crop coordinates and SHA-256 hashes. Generate the 2× contact sheet with `node scripts/event-art-gallery.mjs`. Scenes render at 2× at 720p and 3× at 1080p. Choice miniatures show only named, guaranteed items: random supplies, relics and gamble branches do not disclose an invented reward.

### Runtime sizing and reproducible derivatives (A04–A06)

`MonIcon` uses compact pixel icons below 48 px and portraits at 48 px or above. Compact icons preserve every source pixel: only fully transparent margins are removed. `PixelSprite` fits the original aspect ratio into its cell using 0.5× scale steps, without stretching. `TypeLabel` keeps its native 32×12 aspect ratio and snaps its height to multiples of 6 px; the current UI uses 12, 18 and 24 px.

Stage scenes use 0.5× scale steps with cover cropping. Regenerate the 45 runtime PNGs with `node scripts/normalise-stages.mjs install`: nearest-neighbour cover sampling onto a 640×360 logical grid, independent palettes of at most 256 colours and no dithering. `public/art/stages/manifest.json` records source and output hashes, dimensions, bytes and processing settings. The retained JPG sources total 21,875,118 bytes; the runtime PNG set totals 5,194,563 bytes (76.25% less). This measures runtime stage assets, not repository size: both sets remain in the repository. Normalisation cannot recover detail lost to JPEG compression or establish the origin of portraits already embedded in a scene; see [attribution](ATTRIBUTION.md).

---

## 3. Fast Lanes & Commands

| Lane | Command | Output |
|---|---|---|
| Battle sprites (animated front/back + shiny) | `npm run art:sprites` | `public/art/pokemon/battle/<id>[-back].gif` |
| Portraits + box icons | `npm run art:portraits -- <dex…>` | `public/art/pokemon/{portraits,icons}/NNN-<id>.png` |
| Compact party / owner icons | `node scripts/build-compact-icons.mjs` | `public/art/pokemon/compact/NNN-<id>.png` |
| Normalise existing stage JPGs | `node scripts/normalise-stages.mjs install` | `public/art/stages/*.png` + `manifest.json` (JPG sources retained) |
| Trainer sprites | `npm run art:trainers` | `public/art/trainers/trainer-<class>.png` |
| Type pixel boxes (FRLG / HGSS) | `npm run art:types` | `public/art/icons/type/<type>.png` |
| All item, TM, stone, ball & relic pixel icons | `npm run art:items` | `public/art/items/<id>.png` |
| Move card pixel art | `npm run art:moves [id…]` · `npm run art:moves -- --sheet` | `public/art/moves/<move-id>.png` |
| Route FRLG tileset | `npm run art:route` | `public/art/route/**` |
| Wild Area FRLG habitat props | `npm run art:habitats` · `node scripts/habitat-gallery.mjs` | `public/art/map/habitat/*.png` |
| Hub / Mart / Rocket / Safari FRLG rooms | `npm run art:hub` · `art:mart` · `art:rocket` · `art:safari` | `public/art/{hub,mart,game-corner,black-market,safari}` |
| Fighting Dojo, original master and pupils | `npm run art:dojo` | `public/art/dojo/room.png` + source/output hashes in `manifest.json` |
| Dojo practice area, equipment and Gen III practice sprites | `node scripts/build-dojo-props.mjs` | `public/art/dojo/training-room.png`, props and `pokemon/*.png`; `props-manifest.json` |
| Dedicated Pokémon Center composition | `npm run art:center` (`-- --fetch` refreshes credited source maps) | `public/art/center/room.png`; source maps, crop coordinates and SHA-256 in `manifest.json` |
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
