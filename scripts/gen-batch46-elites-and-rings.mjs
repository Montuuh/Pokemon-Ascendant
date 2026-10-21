import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const BRAIN_DIR = 'C:/Users/dmont/.gemini/antigravity/brain/97508ad9-424d-4885-9f0c-66ab4b226390';

const tasks = [
  // --- 1. elite-snorlax (Route bridge / river crossing) ---
  {
    name: 'elite-snorlax-p1',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. A tranquil riverside wooden bridge and pathway where a giant wild Snorlax blocks the route. Symmetrical weathered dark timber bridge railings flanking both sides over a gently flowing stream with water lilies and river reeds. In the background, lush weeping willow trees and thick green summer foliage under a bright sunny blue sky with soft white clouds. The combat floor is an immaculate, flat, level wide wooden plank bridge deck and packed earth trail, completely clear and unobstructed. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, nostalgic Kanto Route 12 / 16 aesthetic. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui.'
  },
  {
    name: 'elite-snorlax-p2',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. A peaceful forest riverbank clearing and wooden footbridge. Symmetrical rustic timber fences and tall reed grass lining the banks of a clear blue river reflecting the summer sun. In the center back, a path leading between two large ancient oak trees into a sun-dappled meadow. The battle ground is a flat, level, spacious packed dirt and gravel road bordered by wooden planks. Nostalgic 16-bit handheld RPG aesthetic, clean pixel clusters, sharp 1px outlines. Completely empty arena floor, no pokemon, no humans, no text, no dialogue boxes, no ui.'
  },

  // --- 2. elite-lapras (Sea cavern lagoon / mystical grotto) ---
  {
    name: 'elite-lapras-p1',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. A mystical subterranean sea cavern lagoon where the majestic wild Lapras dwells (Seafoam Islands / Union Cave deep grotto aesthetic). Symmetrical glistening limestone cave arches and glowing pale blue stalactites framing both sides. In the center background, crystal-clear turquoise subterranean lake water under shafts of ethereal sunlight beaming through a high cavern ceiling opening. The combat arena is a wide, flat, level natural smooth stone reef platform surrounded by tranquil shallow waters with subtle caustic wave reflections. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, serene aquatic sanctuary. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui.'
  },
  {
    name: 'elite-lapras-p2',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. A secluded ocean sea grotto and tidal inlet at dawn. Symmetrical dark sea-carved basalt cliffs and sea caves flanking both sides, with gentle ocean mist drifting across the water. In the center back, a majestic sea arch framing a tranquil pastel sunrise over calm ocean waves. The battle ground is an expansive, flat, level wet sandbar and smooth tide-pool stone platform. Nostalgic 16-bit handheld RPG aesthetic, clean pixel clusters, sharp 1px outlines. Completely empty arena floor, no pokemon, no humans, no text, no dialogue boxes, no ui.'
  },

  // --- 3. elite-aerodactyl (Prehistoric canyon gorge / fossil cliff) ---
  {
    name: 'elite-aerodactyl-p1',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. A windswept prehistoric canyon gorge and fossil plateau where the ancient wild Aerodactyl roosts (Grampa Canyon aesthetic). Symmetrical towering stratified red and ochre sandstone canyon bluffs framing both flanks, with visible ancient fossil impressions carved into the rock face. In the center background, jagged rocky mountain peaks under a dramatic amber and azure sky with swirling high-altitude wind wisps. The combat floor is an expansive, completely flat, level compacted sandstone plateau and weathered stone arena, clean and unobstructed. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, primal fossil canyon ambiance. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui.'
  },
  {
    name: 'elite-aerodactyl-p2',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. A high mountain caldera pass and rocky precipice overlooking an ancient arid canyon. Symmetrical sharp rock crags and layered sedimentary cliff walls on both sides. In the center back, a vast panorama of desert mesas and rocky ravines bathed in brilliant desert sunlight. The battle ground is a flat, level, spacious solid rock slab arena bordered by fine desert gravel. Nostalgic 16-bit handheld RPG aesthetic, clean pixel clusters, sharp 1px outlines. Completely empty arena floor, no pokemon, no humans, no text, no dialogue boxes, no ui.'
  },

  // --- 4. ring-pallet (Battle ring in the middle of Pallet Town) ---
  {
    name: 'ring-pallet-p1',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. The outdoor battle ring located right in the center of Pallet Town plaza. Symmetrical low wooden corner posts with red and blue triangular pennant flags marking the ring corners. In the background, the charming nostalgic seaside village of Pallet Town: the iconic red-roofed Pokémon Center on the left, the blue-roofed Poké Mart on the right, traditional wooden cottages with tile roofs, white picket fences, and leafy green oak trees under a bright sunny blue sky. The combat floor is an immaculate, flat, level raised sandy battle platform bordered by grey stone coping stones with a red and white Poké Ball emblem outline. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, cheerful starting town. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui.'
  },
  {
    name: 'ring-pallet-p2',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. An open-air village Pokémon battle ring in the heart of sunny Pallet Town. Symmetrical wooden benches and neat floral flowerbeds flanking the perimeter path. In the background, cozy rural houses with red and teal roofs, white fences, and green rolling hills with pine trees under a warm midday sun. The battle ground is a flat, level, spacious compacted golden sand square arena with crisp white regulation boundary lines. Nostalgic 16-bit handheld RPG aesthetic, clean pixel clusters, sharp 1px outlines, wholesome starting town vibe. Completely empty arena floor, no pokemon, no humans, no text, no dialogue boxes, no ui.'
  },

  // --- 5. ring-celadon (Coliseum battle arena in Celadon City) ---
  {
    name: 'ring-celadon-p1',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. Inside the grand open-air Pokémon Coliseum stadium in the central plaza of Celadon City. Symmetrical curved stone coliseum arena walls with stepped tiers of red spectator seats rising along both flanks. In the background above the coliseum rim, the impressive modern cityscape of Celadon City: the grand multi-story Celadon Department Store with rooftop trees, sleek office windows, and colorful city banners under a clear daytime sky. The combat floor is an expansive, completely flat, level golden sand coliseum arena with crisp white regulation boundary lines and a red-and-white Poké Ball center court emblem. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, bustling metropolis tournament. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui.'
  },
  {
    name: 'ring-celadon-p2',
    prompt: '16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. The central arena of the Celadon City open-air Pokémon Coliseum. Symmetrical low stone balustrades with hanging red and gold tournament pennants framing the field, backed by tiered stadium spectator seating. In the background, the grand neoclassical stone and brick facade of the Celadon plaza architecture under bright midday sunlight. The battle ground is a flat, level, spacious oval sandy sparring court with a painted Poké Ball center mark. Nostalgic 16-bit handheld RPG aesthetic, clean pixel clusters, sharp 1px outlines. Completely empty arena floor, no pokemon, no humans, no text, no dialogue boxes, no ui.'
  }
];

function runCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  await fs.mkdir('playtest/artgen', { recursive: true });

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const outFile = `playtest/artgen/${t.name}.png`;
    console.log(`\n========================================`);
    console.log(`[${i + 1}/${tasks.length}] Generating ${t.name}...`);
    console.log(`========================================`);
    
    let ok = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await runCmd('node', [
          'scripts/gen-image.mjs',
          '--out', outFile,
          '--prompt', t.prompt,
          '--aspect', '16:9',
          '--size', '2K'
        ]);
        ok = true;
        break;
      } catch (err) {
        console.error(`Attempt ${attempt} failed: ${err.message}. Retrying in 20s...`);
        await sleep(20000);
      }
    }
    if (!ok) {
      console.error(`FAILED to generate ${t.name}`);
      process.exit(1);
    }

    // Generate downscaled preview in brain dir for inspect
    const brainPreview = path.join(BRAIN_DIR, `${t.name}.png`);
    await sharp(outFile)
      .resize(960, 540, { fit: 'inside' })
      .png()
      .toFile(brainPreview);
    console.log(`Wrote preview: ${brainPreview}`);

    if (i < tasks.length - 1) {
      console.log('Waiting 10s between requests to respect rate limits...');
      await sleep(10000);
    }
  }

  console.log('\nAll Elites & Rings generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
