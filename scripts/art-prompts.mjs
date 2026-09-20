#!/usr/bin/env node
// The prompt book. One file so the shared style anchor is written once and every scene inherits it, which is
// what keeps eleven images looking like one game. Run `node scripts/art-prompts.mjs` to (re)write
// docs/art/prompts/*.txt, then feed those to `npm run art:gen`.
//
// Doctrine (docs/art/pipeline.md §1): this is a Pokémon fan game and the art should look like it. Poké Ball
// motifs, Gym badges, the red-roofed Centre and the blue-roofed Mart are all on the table. The creatures are
// the exception, and only because we ship the real sprites.
import { writeFile, mkdir } from 'node:fs/promises';

const OUT = 'docs/art/prompts';

/** The look, stated in full in every prompt. Models do not remember the last call. */
const STYLE = `Bright, cheerful, polished cel-shaded environment art in the exact visual language of a modern
Pokémon game — clean crisp linework, smooth cel-shading, saturated friendly colours, soft rounded toy-like
geometry, gentle warm global illumination, cosy miniature-diorama charm, the wholesome all-ages look of a
handheld creature-collecting adventure.`;

/** Every scene wants the same things kept out. */
const AVOID = `Avoid: text, words, letters, numbers, UI, buttons, HUD, watermark, signature, creatures,
monsters, animals, people, characters, photorealistic, 3D photoreal render, dark, gloomy, grim, scary,
cluttered, harsh shadows, neon, low quality, blurry, jpeg artifacts.`;

/** A battle plate has a UI contract: the middle and the bottom third must stay quiet. */
const BATTLE_FRAMING = `Wide establishing battlefield view with an open, uncluttered flat playing area across
the centre and foreground; far background softly blurred into atmospheric parallax layers. Keep the centre and
the lower third low-contrast and calm so battle sprites and a card tray overlay on top and stay readable.
16:9 widescreen.`;

const scenes = {
  // ---- Battle backdrops -----------------------------------------------------------------------------
  'r1-route': `${STYLE} A sunny Pokémon route clearing: neatly trimmed short grass with thick darker
square-ish patches of tall wild grass clustered along the left and right foreground edges, low grey stone
ledges you would hop down, a wooden route signpost and a rail fence, friendly round-canopy trees and
wildflowers framing the sides, a worn dirt path crossing the clearing, calm pastel sky with soft clouds and
distant blue hills. ${BATTLE_FRAMING} ${AVOID}`,

  'r1-forest': `${STYLE} A sunlit clearing deep inside a Pokémon forest route: tall rounded broadleaf trees
with thick canopies framing the left and right edges, warm golden sunbeams filtering through the leaves,
mossy roots, toadstools, ferns and bluebells along the edges, a mossy fallen log to one side, a carpet of
fallen leaves. ${BATTLE_FRAMING} ${AVOID}`,

  'r1-cave': `${STYLE} The inside of a friendly Pokémon cave route: smooth rounded boulders and stone ledges
framing the left and right edges, pale blue-violet crystal clusters glowing softly on the walls, a few
stalactites, a shallow clear pool in one corner, warm daylight spilling in from a distant cave mouth. Lit and
inviting rather than murky, saturated and readable. Flat sandy stone floor across the centre.
${BATTLE_FRAMING} ${AVOID}`,

  'gym-arena': `${STYLE} The interior of a Pokémon Gym battle hall, Rock-type themed: a wide polished arena
floor with the classic circular Poké Ball emblem inlaid dead centre in red, white and black, bold white
boundary lines marking the battlefield, heavy rough-hewn stone pillars and boulder formations along the walls,
tall hanging banners in warm earth tones each bearing a simple Gym badge emblem, a large glowing Poké Ball
crest high on the far wall, dramatic warm spotlights from a vaulted ceiling. Grand and ceremonial but still
bright and friendly. ${BATTLE_FRAMING} ${AVOID}`,

  // ---- Screens --------------------------------------------------------------------------------------
  //
  // Pixel, not cel-shaded, and the reason is the same one that governs everything else here: the player has
  // seen a Pokémon town before. v0.4's vista was a handsome modern illustration of one — thick uniform
  // outlines, flat gradients — and next to a Gen V sprite it read as fan art of the game rather than the
  // game. The map plate was already drawn this way; this makes the two full-screen scenes speak once.
  'menu-vista': `Top-down overhead pixel art of a small Pokémon town, drawn exactly like an overworld town
from a 16-bit handheld Pokémon game: crisp chunky pixels, a tile-based grid, a limited saturated palette,
clean dithering, hard pixel edges, no anti-aliasing, no smooth gradients, viewed from straight above at a
fixed orthographic angle. A Pokémon Centre with its unmistakable bright red pitched roof and white walls and
a Poké Mart with a blue pitched roof stand near the middle, surrounded by a cluster of small houses with
brightly coloured tiled roofs, neat flower beds, wooden fences, round-canopy trees, a pale sandy path winding
between them, a small blue stream with a wooden bridge, a wooden signpost, and patches of darker tall grass
at the town's edge where the route begins. Keep the LEFT THIRD of the frame open, calm and uncluttered —
plain tiled grass and path — for a menu panel to sit on top. Bright cheerful daytime palette.
16:9 widescreen. ${AVOID}`,

  // Deliberately NOT the cel-shaded style of the battle plates: a Pokémon world map is read from directly
  // above, in pixels, and that is what the map screen wants under its node graph.
  //
  // No Gym building on the plate. v0.5's route ends at *two* Gyms, drawn as node badges near the top corners,
  // and the painted one sat between them and read as a third. The plate's job is the ground the lattice
  // stands on, and the only things on it that should look like destinations are the ones the map draws.
  // What it does carry is the fork: water going out on the left, rock going out on the right, so the two
  // lanes have somewhere to be before their badges say so.
  'r1-map': `Top-down overhead pixel art of a Pokémon route, drawn exactly like an overworld map from a 16-bit
handheld Pokémon game: crisp chunky pixels, a tile-based grid, a limited saturated palette, clean dithering,
hard pixel edges, no anti-aliasing, no smooth gradients, viewed from straight above at a fixed orthographic
angle. The route is a wide grassy area crossed by a winding pale sandy path: neatly tiled short grass, darker
square patches of tall wild grass, grey rock ledges you would hop down, wooden signposts and fence rails,
round-canopy trees dotted along the edges. On the LEFT, a wide blue river with a wooden bridge and a sandy
bank widening toward the top-left corner; on the RIGHT, a grey rocky cliff face with a dark cave entrance,
spreading into broken boulder ground toward the top-right corner. No buildings anywhere in the frame. Keep
the large central area open and uncluttered so map markers can sit on top of it.
Bright cheerful daytime palette. 16:9 widescreen. ${AVOID}`,
};

/*
 * Items and map emblems used to be generated here and are not any more.
 *
 * A model approximates an object; it cannot reproduce a specific one. For a Potion, a Poké Ball, the Boulder
 * Badge or a Pokémon Centre, an approximation reads as wrong however well it is drawn, because the player
 * already knows exactly what those look like. Those come from the real sources now — see
 * scripts/fetch-pokemon-assets.mjs. Generation is kept for the scenes, which have no canonical original to
 * get wrong.
 */

await mkdir(OUT, { recursive: true });
const oneLine = (s) => s.replace(/\s+/g, ' ').trim();

let n = 0;
for (const [id, text] of Object.entries(scenes)) {
  await writeFile(`${OUT}/${id}.txt`, `${oneLine(text)}\n`, 'utf8');
  n++;
}
console.log(`${n} prompts written to ${OUT}/`);
