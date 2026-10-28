# Attribution

**Pokémon Ascendant is a free, non-commercial fan project.** It is not sold, it carries no advertising, and it takes no
payment of any kind. It is not affiliated with, endorsed by or connected to Nintendo, Creatures Inc.,
GAME FREAK inc. or The Pokémon Company. Pokémon, the Poké Ball device, Gym Badges, the Pokémon Centre and
Poké Mart marks, and all Pokémon names are trademarks of Nintendo / Creatures / GAME FREAK.

**On the art, in two halves.**

*Generated:* effect illustrations and scene compositions, including the main-menu vista and town lobbies.
The current battle-stage set has a documented generation workflow, but incomplete per-image authorship
records; see the provenance limits below. The three route plates the map was painted on until v0.8.7 remain as a style key. Overworld scenes use
the franchise's top-down register; battle stages use a ground-level arena view. The project deliberately uses
Pokémon-themed scenes on the basis that it is free and stays free. The current stage inventory and its
provenance limits are recorded below; the older official-stage credits are historical records.

*Real assets:* everything the player already knows by heart — every item, the Boulder Badge, the Pokémon
Centre, the trainer classes, the Pokémon themselves. A generative model approximates an object; it cannot
reproduce a specific one, and an approximate Potion reads as wrong however well it is drawn. These are
Nintendo / Creatures / GAME FREAK artwork, mirrored by fan archives and used here under the same
non-commercial fan terms as everything else in this file.

If Pokémon Ascendant ever stopped being non-commercial, none of this could ship as it stands.

| Asset family | Source | Licence / terms | Path |
|---|---|---|---|
| Pokémon official artwork, Gen VIII box icons | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) (mirrors official assets) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/pokemon/{portraits,icons}` |
| Compact Pokémon icons (151, A05) | Derived from the existing PokéAPI box icons by `node scripts/build-compact-icons.mjs`: exact alpha-bound crop, no resampling | Same rights and fan-use terms as the source icons | `public/art/pokemon/compact/*.png` |
| Animated battle sprites (gen5ani, and the gen5ani-shiny palettes for §5.13.1 Veteran) | [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/) / Smogon sprite project | © Nintendo / Creatures / GAME FREAK; sprite edits by the Smogon community; fan use | `public/art/pokemon/battle` |
| Reduced-motion battle stills (B04) | Exact first frames of the existing normal/shiny front/back Showdown GIFs, extracted by `scripts/build-battle-stills.mjs`; source/output hashes in `stills-manifest.json` | Same rights and fan-use terms as the source GIFs; no generated Pokémon | `public/art/pokemon/battle/*.png` |
| Current stage backdrops (45, A06 runtime derivatives) | Retained JPG sources and matching source/output hashes in `manifest.json`; indexed 640×360 PNG derivatives from `scripts/normalise-stages.mjs`. Generation batch scripts document the workflow, not a complete per-image authorship chain | Pokémon-themed compositions; underlying marks and incorporated artwork retain their respective rights. Embedded-portrait provenance remains unverified | `public/art/stages/*.png`; retained sources `*.jpg`; `manifest.json` |
| Move effect illustrations (161) | Project generation workflow in `scripts/gen-move-art.mjs` and `docs/art/prompts/move-art.json`; twelve A14 replacements have retained raw outputs, exact prompts and model/hash records. The earlier 149 have a committed input baseline, without a complete retained raw/prompt chain | Generated project illustrations as documented by the workflow; Pokémon names and concepts retain their owners' rights. See the A14–A15 provenance limits below | `public/art/moves/*.png`; `palette-manifest.json`, `refresh-manifest.json`; `docs/art/sources/moves-a14` |
| The Pokémon Center's healing machine and its tray ball (v0.9.25) | **The real asset** — cut from the FRLG Indigo Plateau Pokémon Center map the Hub already ships (`scripts/cut-heal-machine.mjs`); the 4 × 4 tray ball drawn on its grid | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/hub/heal-machine.png`, `heal-ball.png` |
| Game glyph SVG set (status, intent, trait, modifier, rarity, medal, action, nav, toolbar) | Authored for this project | project licence | `public/art/icons/**` |
| Type labels, 15 (FireRed/LeafGreen) | **The real assets** — the games' type boxes, via the PokéAPI sprites mirror | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/icons/type/*.png` |
| Scene art: the three Region route plates, the Abandoned Tower backdrop (v0.7.4), the main-menu vista and the town lobbies (v0.7.7: Pallet's Challenge Ring and Celadon's Pokémon Coliseum, generated as edits of the lobbies and pasted back over only the square they replace, in the original's palette) | Generated with Google Gemini image models (`npm run art:gen`; prompts in `docs/art/prompts/`) | generated work, Pokémon-themed by intent; outputs carry a SynthID watermark and are usable per Google's terms | `public/art/map/region-{1,2,3}.png`, `public/art/stages/tower.jpg`, `public/art/ui/menu-vista.png`, `public/art/towns/*.png` |
| Consumable item icons (Defog borrows the pixel Smoke Ball) | Pixel bag sprites from [PokeAPI/sprites](https://github.com/PokeAPI/sprites/tree/master/sprites/items), fetched by `scripts/fetch-item-icons.mjs`; native files, without spatial resampling. The former Serebii 160² render attribution is superseded | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/items` |
| Map emblems: the twelve Badges (Boulder, Cascade, Hive, Plain; Volcano, Rainbow, Thunder, Soul; Marsh, Earth, Knuckle, Glacier — each named as its art is) | **The real assets**, via the [Bulbagarden Archives](https://archives.bulbagarden.net) MediaWiki API | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/icons/map` |
| Held-item, relic and Evolution Item icons (the five stones since v0.7.5, the Safari Ball since v0.7.6, the Rare Candy since v0.7.7, the Great and Ultra Balls since v0.8.6) — every one the real item it is, or the real item a relic is named after | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) `sprites/items` (`npm run art:items`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/items` |
| TM discs, one per type (all fifteen Gen I types) | Pixel bag sprites from [PokeAPI/sprites](https://github.com/PokeAPI/sprites/tree/master/sprites/items): `tm-normal` is installed as `tm.png`; the other fourteen use their type slug. Current files are 30×30; a source-game edition is not established here for every sprite | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/items/tm*.png` |
| The Safari Zone (v0.7.6): the board's tiles — tall grass, short grass, the pond and its rim, the forest — cut on the 16-px grid from the FireRed / LeafGreen Safari Zone entrance map, the FRLG Strength boulder, Red's FRLG overworld sprite, and the entrance map itself as the Safari's backdrop | **The real assets**, via the [Bulbagarden Archives](https://archives.bulbagarden.net) (`npm run art:safari`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/safari` |
| The Region map's terrain (v0.8.7): every tile — Route 1's grass, sand road, trees, tall grass and flowers; Route 24's water and Nugget Bridge (turned to run east–west); Viridian Forest's canopy and road; Mt. Moon's and Seafoam's cave floors and boulders; the Power Plant's floor and rubble; Ruby Path's rock; Pokémon Tower's floor and graves; Kindle Road's sea and beach; Mt. Ember's slopes — cut on the 16-px grid from the FireRed / LeafGreen map renders (`npm run art:route`) | **The real assets**, from the full map renders on the [Bulbagarden Archives](https://archives.bulbagarden.net/) | © Nintendo / Creatures / GAME FREAK; map renders by the Bulbagarden community; fan use | `public/art/route/**` |
| The Wild Areas' landmarks on the map (v0.9.27): the Pokémon Tower's dome and the Power Plant (Route 10, halved), a Tanoby chamber's front, a sandbank off Route 20 (halved), Kindle Road's rocks — cut whole from the FireRed / LeafGreen map renders, their ground flooded transparent — and the route's own tiles (tall grass, flowers, pines, a pond, sea rocks, boulders) put together; a cave's mouth, a crater's glow, the open sea's oval, the Tall Grass's rustle, a bank of cloud and four recolours (basalt, sandstone, a marsh's water, an icy pool) drawn on their 1-px grid (`npm run art:habitats`) | **The real assets**, from the full map renders on the [Bulbagarden Archives](https://archives.bulbagarden.net/) and `public/art/route` | © Nintendo / Creatures / GAME FREAK; map renders by the Bulbagarden community; fan use | `public/art/map/habitat/*.png` |
| Team Rocket's Black Market (v0.7.7) and the Game Corner room: the whole Celadon Game Corner map (the prize counter, the slot banks and their players, the posters, the Grunt; before the switch, open and shut, the Grunt's tiles taken from the Archives' empty copy of the same map), and the Rocket Hideout B1F's wall, floor tile and stairs | **The real assets**, cut on the 16-px grid from the FireRed / LeafGreen maps via the [Bulbagarden Archives](https://archives.bulbagarden.net) (`npm run art:rocket`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/game-corner`, `public/art/black-market` |
| The Game Corner's roulette table and the locked steel hatch over the Black Market's stairs — the games never drew either | Drawn pixel by pixel by `npm run art:props` (`scripts/draw-game-corner-props.mjs`) in the room's own palette, after generated references (`docs/art/prompts/game-corner-*.txt`) that stayed soft when brought down to 64 × 30 | original work for this project | `public/art/game-corner/{roulette,hatch}.png` |
| The Poké Mart and the Department Store (v0.7.10): the FireRed / LeafGreen Poké Mart interior, and Celadon Department Store 1F–5F (2F, 4F and 5F as rooms, two of them mirrored; 1F, 3F and 5F lend their floor-number mats) | **The real assets**, from the FireRed / LeafGreen maps via the [Bulbagarden Archives](https://archives.bulbagarden.net) (`npm run art:mart`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/mart` |
| The Trainer Hub (v0.9.2): the Indigo Plateau's Pokémon Center lobby from FireRed / LeafGreen, FireRed's Red overworld sprite, and the Gen IV Pokémon Center nurse overworld (trimmed) | **The real assets** via the [Bulbagarden Archives](https://archives.bulbagarden.net) (`npm run art:hub`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/hub` |
| Fighting Dojo interior, master and pupils (A08) | **The real FRLG map**, [Fighting Dojo FRLG](https://archives.bulbagarden.net/wiki/File:Fighting_Dojo_FRLG.png); edge-connected black outside keyed to alpha, no resampling (`npm run art:dojo`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/dojo/room.png`; source/output SHA-256 in `manifest.json` |
| Dojo practice sprites (A08) | Authentic FRLG front sprites via [PokéAPI](https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/versions/generation-iii/firered-leafgreen); Gen III [Substitute](https://archives.bulbagarden.net/wiki/File:SubstituteG3f.png) and [Egg](https://archives.bulbagarden.net/wiki/File:Spr_3r_Egg.png) via Bulbagarden Archives. Exact half-size nearest-neighbour derivatives | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/dojo/pokemon`, `substitute.png`, `egg.png`; `props-manifest.json` |
| Dojo equipment, scroll rack and practice platforms (A08) | Pixel-authored for this project on the native room grid, using its FRLG palette; no generated creatures (`scripts/build-dojo-props.mjs`) | Project licence for authored shapes; underlying Pokémon artwork retains its rights | `public/art/dojo/*.png`; `props-manifest.json` |
| Dedicated Pokémon Center room (A09) | New tile composition from authentic [Pokémon Center inside FRLG](https://archives.bulbagarden.net/wiki/File:Pok%C3%A9mon_Center_inside_FRLG.png) and [Player Bedroom FRLG](https://archives.bulbagarden.net/wiki/File:Player_Bedroom_FRLG.png), via Bulbagarden Archives. Native-resolution crops, without resampling (`npm run art:center`); source maps, crop coordinates and hashes retained. Nurse, player and animated machine reuse the credited Hub sprites | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/center`; sprites in `public/art/hub` |
| The Safari's bait and rock tokens (v0.7.6) — the games never drew either as an item | Generated with Google Gemini image models (`npm run art:gen`; prompts in `docs/art/prompts/safari-*.txt`), installed onto the tiles' 16-px grid (`install-art pixel-icon`) | generated work; SynthID watermark; usable per Google's terms | `public/art/safari/{bait,rock}.png` |
| Nav / system icons | [Tabler Icons](https://tabler.io/icons) | MIT | `@tabler/icons-react` |
| Pixelify Sans (headings, names, chips; replaces Baloo 2) | The Pixelify Sans Project Authors, [eifetx/Pixelify-Sans](https://github.com/eifetx/Pixelify-Sans); distributed via [Google Fonts](https://github.com/google/fonts/tree/main/ofl/pixelifysans) | SIL OFL 1.1 (`src/assets/fonts/OFL-PixelifySans.txt`) | `src/assets/fonts/PixelifySans-VariableFont_wght.ttf` |
| Tiny5 (numbers) | The Tiny5 Project Authors, [Gissio/font_tiny5](https://github.com/Gissio/font_tiny5), copyright 2022–2024; distributed via [Google Fonts](https://github.com/google/fonts/tree/main/ofl/tiny5) | SIL OFL 1.1 (`src/assets/fonts/OFL-Tiny5.txt`) | `src/assets/fonts/Tiny5-VariableFont.ttf` |
| Nunito | Vernon Adams, Cyreal, Jacques Le Bailly | SIL OFL 1.1 (`src/assets/fonts/OFL-Nunito.txt`) | `src/assets/fonts` |

Add a row for every third-party asset you bring in (game-icons.net entries need the author name per CC BY 3.0).

## Mystery Event vignettes (A10)

The 15 native 256×112 scenes in `public/art/events` combine previously credited FRLG route tiles, Mart furniture, habitat props and bag-item pixels with these additional sources:

- [Kanto Route 1 FRLG](https://archives.bulbagarden.net/wiki/File:Kanto_Route_1_FRLG.png), via Bulbagarden Archives: sign and fence crops.
- [Lavaridge Town Emerald](https://archives.bulbagarden.net/wiki/File:Lavaridge_Town_E.png), via Bulbagarden Archives: the actual hot-spring pool (its rim and water only; the steps and cliff around it are covered or keyed out).
- [pret/pokeemerald, pinned revision 731ad5b](https://github.com/pret/pokeemerald/tree/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/graphics/object_events/pics): authentic Emerald overworld people (including the bathing old woman and the salesman), truck, moving boxes, item ball, Birch's bag, Oran trees, boulder, the shrine statue, the overworld Pikachu (`object_events/pics/pokemon`) and the field-effect glint and question bubble (`field_effects/pics`).

Pokémon artwork © Nintendo / Creatures / GAME FREAK; map renders by the Bulbagarden community and Emerald extraction by pret, used for this non-commercial fan project. The manifest retains sources, exact crops and hashes; `scripts/build-event-art.mjs` reproduces the compositions without generated imagery. The reused cave landmark includes its previously authored pixel opening; this entry does not claim every pixel of that composite is official artwork.

## Indigo Ascent (A11)

`public/art/league/sources/indigo-frlg.png` retains the authentic [Indigo Plateau FRLG map](https://archives.bulbagarden.net/wiki/File:Indigo_Plateau_FRLG.png) from Bulbagarden Archives. The shipped exterior and newly composed gallery combine its crops with previously credited Hub, Center, Route 1 and Mt. Ember pixels. The floor plan, repeated gate placement and flat runner/separator shapes are authored for this project in the FRLG palette. The build script and manifest retain source URLs, exact crops, source/output hashes and processing details; no AI-generated artwork is added.

Pokémon artwork © Nintendo / Creatures / GAME FREAK, map renders by the Bulbagarden community, non-commercial fan use. The three historical proposal floor plans remain in `docs/design/ui/mockups/league-arrival`; option A was selected by the user and integrated as Indigo Ascent.

## Current stage provenance and processing (A06)

Earlier attribution listed fourteen Showdown gen6 backdrops, then additional Showdown classic sources
(`bg-thunderplains`, `bg-volcanocave`, `bg-route`, `bg-mountain`, `bg-beachshore`, `bg-river`). These are
historical source credits, not the current inventory or evidence that a retained JPG is an official rip.
No artwork was removed as part of this documentation correction.

The 45 current runtime PNGs derive from the JPG files already present in `public/art/stages`. The existing
`scripts/gen-batch*.mjs` scene-generation scripts record prompts and generation/install operations for the
project's stage work; they do not prove a complete chain of authorship for every pixel of every retained JPG.
In particular, portraits already embedded in Gym or apex-stage compositions have not been traced to an
original source. Their visual appearance is not evidence of official authorship. The historical Showdown
credits above must not be used as attribution for the current files.

`public/art/stages/manifest.json` records each source JPG and its SHA-256, each output PNG's SHA-256,
dimensions, bytes and palette metrics, plus the processing settings and library versions. The deterministic
normalisation uses nearest-neighbour cover sampling at 640×360 and per-scene indexed palettes of at most
256 colours without dithering. It introduces no generated content, does not establish missing provenance
and cannot undo JPEG loss. Source JPGs are retained. The PNG runtime set is 5,194,563 bytes versus
21,875,118 bytes for those JPGs (76.25% less runtime stage data); this is not a repository-size reduction.

Pixelify Sans, Tiny5 and Nunito are bundled locally with their SIL OFL 1.1 notices. Baloo 2 is retired from
the runtime typography; its earlier attribution does not describe the current display face.

## Arena and route-stop compositions (A12–A13)

`public/art/ring` contains two native 480×192 compositions rebuilt by `scripts/build-ring-art.mjs` from the already credited FRLG Indigo Plateau, Viridian Forest and Route 1 maps, plus Emerald spectator sprites (six already-credited NPC sheets, front and side frames, some mirrored, dealt by a fixed-seed generator so the Coliseum crowd has uneven spacing and no cloned run). The courts, route, grandstands, markings and banners are authored on the same pixel grid in FRLG colours. The manifest records the source paths, URLs, crop coordinates and SHA-256 hashes. The trainer overlays use the existing Showdown sprites credited below; these compositions are new arrangements, not original game maps.

`public/art/route-stops` contains three native 256×112 compositions rebuilt by `scripts/build-route-stop-art.mjs`. They reuse credited FRLG route terrain and furniture, Emerald trader and object sprites retained with the event family, and the existing Dojo equipment. The new Emerald nurse and Black Belt source sheets are retained with URLs pinned to pret/pokeemerald commit 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881. Source crops and hashes, output dimensions and hashes are recorded in the manifest. No AI generation or resampling is used for either family.

Underlying game artwork remains © Nintendo / Creatures / GAME FREAK, mirrored by Bulbagarden Archives and pret/pokeemerald; non-commercial fan use under the terms described above. New arrangements do not change ownership of their source pixels.

## Move effect refresh and palette derivatives (A14–A15)

The twelve selected A14 effect illustrations are generated assets, not official move-animation rips. Eleven use Gemini 3 Pro Image through Vertex AI; Take Down uses Gemini 2.5 Flash Image after three rejected variants. Their raw outputs and exact prompts are retained in `docs/art/sources/moves-a14`. `public/art/moves/refresh-manifest.json` records each model, source/prompt/output SHA-256, native dimensions and framing margin. The fixed-grid installer removes the flat background and applies the effective per-image palette. New silhouettes depict effects only; no Pokémon or trainer art was generated.

All 161 current move PNGs also pass through deterministic palette reduction: at most 20 actual opaque RGB colours, original binary transparency restored, no spatial resampling. The original runtime baseline is the artwork committed at 02af49b709cbb14ff0a8ae8bd36927c9e5919a54. Its palette-only derivatives and alpha-mask hashes are recorded in `public/art/moves/palette-manifest.json`; that manifest explicitly links the twelve subsequent silhouette replacements. This processing does not change the authorship or rights of the source illustrations. Pokémon names and game concepts retain their respective owners' rights under the fan-project notice above.

The generation scripts and prompt collection document the intended workflow for the earlier 149 effects.
Their committed input hashes establish which images were processed; they do not establish a retained,
per-image raw-output and exact-prompt chain comparable to the twelve A14 replacements.

## Inventory verification and limits (A19, 2026-10-23)

All 45 stage source/output pairs match their manifest SHA-256 values. All 161 current move images match
the palette manifest or its linked refresh output; all twelve retained A14 source images and exact prompts
match the refresh hashes. These checks establish file identity and reproducible derivation, not missing
authorship or original rights.

The current item directory contains 136 native pixel PNGs: 135 are 30×30 and `berry-pouch.png` is 24×24.
The fifteen TM files are 30×30. The Potion, Smoke Ball used for Defog, and Normal TM source downloads
were independently compared byte for byte with the current PokéAPI mirror and matched. The fetch script
uses the mirror's moving `master` branch, without a pinned source revision or a full per-item hash manifest;
this sample verification does not assert that every item has been checked against its remote source.
The old Scarlet/Violet render credit does not describe the current pixel files. Their exact source-game
edition remains unverified where the mirror and fetch mapping do not identify it.

## Route overworld and market derivatives (A17–A18)

The 36 route frames in `public/art/map/people` and four market NPCs in `public/art/black-market` use authentic FRLG overworld sheets from [pret/pokefirered](https://github.com/pret/pokefirered/tree/ce6406d8c2eaf46d543c8a2606de0c3cb1951982/graphics/object_events/pics/people), pinned to commit `ce6406d8c2eaf46d543c8a2606de0c3cb1951982`. Each derivative retains its native 16×32 south-facing frame, with palette-zero transparency and no resampling. Matching FRLG trainer classes stand in for Johto and role-only identities on the route; the preview retains each trainer's real name and battle portrait. The route item ball uses the previously credited pret/pokeemerald source retained with the event family. Rebuild with `scripts/build-map-people.mjs`; the manifest records URLs, crops and hashes.

The new 320×256 market floorplan uses authentic [Rocket Hideout B1F FRLG](https://archives.bulbagarden.net/wiki/File:Rocket_Hideout_B1F_FRLG.png) floor, wall, stairway, furniture, storage and computer crops, plus the already credited Game Corner roulette table. It is a new arrangement, not a reused Hub or original game room. B14 adds two ball stands from the same retained Hideout map and replaces the floor's three exact RGB values with subdued slate/olive palettes to distinguish circulation from service bays; object and NPC geometry is unchanged. `scripts/build-black-market-art.mjs` rebuilds it; `public/art/black-market/room-manifest.json` retains sources, crop rectangles, palette substitutions, dimensions and hashes. No generated imagery or spatial resampling is used. Underlying game artwork remains © Nintendo / Creatures / GAME FREAK; Bulbagarden Archives and pret provide the retained references. Non-commercial fan use under the notice above.

## Trainer sprites

`public/art/trainers` holds thirty-six Pokémon Showdown trainer-class sprites — the archetypes (`youngster`,
`lass`, `bug-catcher`, `hiker`, `swimmer`, `camper`, `picnicker`, `acetrainer`, and v0.7.3's `scientist` as the
Engineer, `rocketgrunt` and `blackbelt` as the Karate King, and v0.7.4's `hexmaniac` — Showdown's FireRed/LeafGreen
`hexmaniac-gen3`), the twelve Gym Leaders (`brock`, `misty`, `bugsy`, `whitney`; `blaine`, `erika`, `ltsurge`,
`koga`; `sabrina`, `giovanni`, `kiyo` — Showdown's `blackbelt-gen4` — and `lorelei` —
`lorelei-gen3`), Region 3's Elite Boss Giovanni as `giovanni-rocket` (Showdown's `giovanni-lgpe`, 2026-10-19), the route's two services (`nurse`, and
`merchant` — the Showdown `backpacker` — and, from v0.9.19, the route Trader `pokefan`), and v0.7.7's Black Market dealers (`rocketgruntf` the Trader, `gambler`,
and `archer` the Executive; the Fence is `rocketgrunt`), and v0.9.22's League (`bruno`, `agatha` — Showdown's `agatha-gen3` —, `will`, `lance`, and `blue` the Champion) — fetched by `npm run art:trainers`. Same terms as the battle
sprites: © Nintendo / Creatures / GAME FREAK, community sprite work, fan use only.
