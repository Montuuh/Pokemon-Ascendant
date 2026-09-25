# Attribution

**Pokémon Ascendant is a free, non-commercial fan project.** It is not sold, it carries no advertising, and it takes no
payment of any kind. It is not affiliated with, endorsed by or connected to Nintendo, Creatures Inc.,
GAME FREAK inc. or The Pokémon Company. Pokémon, the Poké Ball device, Gym Badges, the Pokémon Centre and
Poké Mart marks, and all Pokémon names are trademarks of Nintendo / Creatures / GAME FREAK.

**On the art, in two halves.**

*Generated:* scenes, and only scenes — the main-menu vista, the Region 1 route plate, and the two town lobbies
(Pallet Town, Celadon City, v0.7.1). All are drawn as **top-down pixel art**, in the franchise's own overworld
register, deliberately and knowingly, on the basis that the project is free and stays free. v0.4 also generated the four battle backdrops; v0.5 replaced them
with the real ones, because a place the player has stood in is an object like any other.

*Real assets:* everything the player already knows by heart — every item, the Boulder Badge, the Pokémon
Centre, the trainer classes, the Pokémon themselves. A generative model approximates an object; it cannot
reproduce a specific one, and an approximate Potion reads as wrong however well it is drawn. These are
Nintendo / Creatures / GAME FREAK artwork, mirrored by fan archives and used here under the same
non-commercial fan terms as everything else in this file.

If Pokémon Ascendant ever stopped being non-commercial, none of this could ship as it stands.

| Asset family | Source | Licence / terms | Path |
|---|---|---|---|
| Pokémon official artwork, Gen VIII box icons | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) (mirrors official assets) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/pokemon/{portraits,icons}` |
| Animated battle sprites (gen5ani, and the gen5ani-shiny palettes for §5.13.1 Veteran) | [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/) / Smogon sprite project | © Nintendo / Creatures / GAME FREAK; sprite edits by the Smogon community; fan use | `public/art/pokemon/battle` |
| Stage backdrops (14) | **The real battle backgrounds** — Pokémon Showdown's gen6 rips (`npm run art:fetch`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/stages` |
| Stage backdrops: `power-plant`, `volcano` (v0.7.3) | **The real battle backgrounds** — Pokémon Showdown's classic set (`play.pokemonshowdown.com/fx/bg-thunderplains.png`, `bg-volcanocave.png`), installed with `install-art stage` | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/stages` |
| Game glyph SVG set (status, intent, trait, modifier, rarity, medal, action, nav, toolbar) | Authored for this project | project licence | `public/art/icons/**` |
| Type labels, 15 (FireRed/LeafGreen) | **The real assets** — the games' type boxes, via the PokéAPI sprites mirror | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/icons/type/*.png` |
| Scene art: the three Region route plates, the Abandoned Tower backdrop (v0.7.4), the main-menu vista and the town lobbies (v0.7.7: Pallet's Challenge Ring and Celadon's Pokémon Coliseum, generated as edits of the lobbies and pasted back over only the square they replace, in the original's palette) | Generated with Google Gemini image models (`npm run art:gen`; prompts in `docs/art/prompts/`) | generated work, Pokémon-themed by intent; outputs carry a SynthID watermark and are usable per Google's terms | `public/art/map/region-{1,2,3}.png`, `public/art/stages/tower.jpg`, `public/art/ui/menu-vista.png`, `public/art/towns/*.png` |
| 11 consumable item icons | **The real item renders**, Scarlet & Violet, 160², via [Serebii's itemdex](https://www.serebii.net/itemdex/) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/items` |
| Map emblems: the twelve Badges (Boulder, Cascade, Hive, Plain; Volcano, Rainbow, Thunder, Soul; Marsh, Earth, Knuckle, Glacier — each named as its art is), the HGSS Pokémon Centre, the HGSS tall-grass tile, the FRLG Fighting Dojo | **The real assets**, via the [Bulbagarden Archives](https://archives.bulbagarden.net) MediaWiki API | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/icons/map` |
| Held-item, relic and Evolution Item icons (the five stones since v0.7.5, the Safari Ball since v0.7.6, the Rare Candy since v0.7.7) — every one the real item it is, or the real item a relic is named after | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) `sprites/items` (`npm run art:items`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/items` |
| TM discs, one per type (Normal, Fire, Water, Ground) | **The real assets** — the Scarlet & Violet bag sprites, same archive | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/items/tm*.png` |
| Map emblems: the trainer classes (with v0.7.3's Engineer — the `scientist` sprite — and Rocket Grunt, and v0.7.4's Hex Maniac and Ace Trainer), the field nurse and the travelling merchant | The Showdown trainer-class sprites already in the project (`nurse`, and `backpacker` as the merchant), mounted on the same badge disc | as the trainer sprites above | `public/art/icons/map` |
| The Safari Zone (v0.7.6): the board's tiles — tall grass, short grass, the pond and its rim, the forest — cut on the 16-px grid from the FireRed / LeafGreen Safari Zone entrance map, the FRLG Strength boulder, Red's FRLG overworld sprite, and the entrance map itself as the Safari's backdrop | **The real assets**, via the [Bulbagarden Archives](https://archives.bulbagarden.net) (`npm run art:safari`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/safari` |
| Team Rocket's Black Market (v0.7.7) and the Game Corner room: the whole Celadon Game Corner map (the prize counter, the slot banks and their players, the posters, the Grunt; before the switch, open and shut, the Grunt's tiles taken from the Archives' empty copy of the same map), and the Rocket Hideout B1F's wall, floor tile and stairs | **The real assets**, cut on the 16-px grid from the FireRed / LeafGreen maps via the [Bulbagarden Archives](https://archives.bulbagarden.net) (`npm run art:rocket`) | © Nintendo / Creatures / GAME FREAK; fan use | `public/art/game-corner`, `public/art/black-market` |
| The Game Corner's roulette table and the locked steel hatch over the Black Market's stairs — the games never drew either | Drawn pixel by pixel by `npm run art:props` (`scripts/draw-game-corner-props.mjs`) in the room's own palette, after generated references (`docs/art/prompts/game-corner-*.txt`) that stayed soft when brought down to 64 × 30 | original work for this project | `public/art/game-corner/{roulette,hatch}.png` |
| The Safari's bait and rock tokens (v0.7.6) — the games never drew either as an item | Generated with Google Gemini image models (`npm run art:gen`; prompts in `docs/art/prompts/safari-*.txt`), installed onto the tiles' 16-px grid (`install-art pixel-icon`) | generated work; SynthID watermark; usable per Google's terms | `public/art/safari/{bait,rock}.png` |
| Nav / system icons | [Tabler Icons](https://tabler.io/icons) | MIT | `@tabler/icons-react` |
| Baloo 2 | Ek Type | SIL OFL 1.1 (`src/assets/fonts/OFL-Baloo2.txt`) | `src/assets/fonts` |
| Nunito | Vernon Adams, Cyreal, Jacques Le Bailly | SIL OFL 1.1 (`src/assets/fonts/OFL-Nunito.txt`) | `src/assets/fonts` |

Add a row for every third-party asset you bring in (game-icons.net entries need the author name per CC BY 3.0).

## Trainer sprites

`public/art/trainers` holds twenty-nine Pokémon Showdown trainer-class sprites — the archetypes (`youngster`,
`lass`, `bug-catcher`, `hiker`, `swimmer`, `camper`, `picnicker`, `acetrainer`, and v0.7.3's `scientist` as the
Engineer, `rocketgrunt` and `blackbelt` as the Karate King, and v0.7.4's `hexmaniac` — Showdown's FireRed/LeafGreen
`hexmaniac-gen3`), the twelve Gym Leaders (`brock`, `misty`, `bugsy`, `whitney`; `blaine`, `erika`, `ltsurge`,
`koga`; `sabrina`, `giovanni` — also the Region 3 Elite —, `kiyo` — Showdown's `blackbelt-gen4` — and `lorelei` —
`lorelei-gen3`), the route's two services (`nurse`, and
`merchant` — the Showdown `backpacker`), and v0.7.7's Black Market dealers (`rocketgruntf` the Trader, `gambler`,
and `archer` the Executive; the Fence is `rocketgrunt`) — fetched by `npm run art:trainers`. Same terms as the battle
sprites: © Nintendo / Creatures / GAME FREAK, community sprite work, fan use only.
