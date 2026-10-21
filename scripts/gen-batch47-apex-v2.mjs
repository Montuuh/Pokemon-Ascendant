import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const BRAIN_DIR = 'C:/Users/dmont/.gemini/antigravity/brain/97508ad9-424d-4885-9f0c-66ab4b226390';

const NEGATIVE_PROMPT = 'ABSOLUTELY NO POKEMON, NO CREATURES, NO ANIMALS, NO TRAINERS, NO CHARACTERS, NO HUMANS. NO TEXT, NO USER INTERFACE, NO DIALOGUE BOXES, NO MENUS, NO HEALTH BARS, NO BUTTONS, NO LOGOS, NO WATERMARKS. STRICTLY EMPTY SCENERY ONLY.';

const tasks = [
  // --- 1. Apex Articuno (apex-articuno) ---
  {
    name: 'apex-articuno-p1',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on symmetrical perspective. The deep glacial sanctum of Seafoam Islands. Symmetrical colossal crystalline ice pillars and frozen aquamarine stalactites framing both flanks. In the far center background, a massive glowing natural ice rose window and frozen waterfall, with soft shafts of ethereal azure daylight piercing through the permafrost ceiling. Faint mist wafts gently at the edges. The combat battlefield is an expansive, completely flat, level polished ice-sheet arena with subtle crystalline boundary lines. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, rich dithered shading, crisp hand-crafted pixel edges, cool sapphire, cyan, and frost white palette. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui. ${NEGATIVE_PROMPT}`
  },
  {
    name: 'apex-articuno-p2',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, distant panoramic mountain summit perspective. An open-air sacred frozen mountain plateau at night. Distant snowy jagged alpine peaks beneath a majestic, swirling aurora borealis of teal and violet in a deep starry polar sky. In the midground, weathered ancient stone obelisks encrusted in ice framing the sides. The combat ground is an expansive, flat, level snow-packed permafrost terrace. Authentic 16-bit GBA / Nintendo DS RPG pixel art aesthetic, rich dithered shading, crisp hand-crafted pixel edges, deep navy, arctic cyan, and silver palette. Completely empty arena floor, no characters, no pokemon, no text, no ui. ${NEGATIVE_PROMPT}`
  },

  // --- 2. Apex Zapdos (apex-zapdos) ---
  {
    name: 'apex-zapdos-p1',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on perspective. The cavernous main generator hall of the Abandoned Power Plant. Symmetrical industrial steel girders and rusted iron catwalks lining both upper walls under a high vaulted glass skylight ceiling. Symmetrical decommissioned transformer units along the flanks. In the far center background, a massive dormant dynamo generator flanked by twin tall Tesla coils in the distance, emitting faint crackling yellow electric sparks. Ambient dusty blue and warm amber industrial lighting. The combat battlefield is an expansive, completely flat, level dark concrete floor with faded yellow hazard safety lines. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, rich dithered shading, crisp hand-crafted pixel edges, atmospheric abandoned power station. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui. ${NEGATIVE_PROMPT}`
  },
  {
    name: 'apex-zapdos-p2',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, distant panoramic outdoor perspective. The rooftop substation terrace of the Abandoned Power Plant under a dramatic stormy sky. In the far background, towering high-voltage lattice transmission towers and distant industrial silhouettes against dark indigo rain clouds lit by distant lightning strikes. Symmetrical industrial transformer banks and safety railings along the perimeter. The combat ground is a wide, completely flat, level wet asphalt and gravel roof deck with subtle puddle reflections. Authentic 16-bit GBA / Nintendo DS RPG pixel art aesthetic, rich dithered shading, crisp hand-crafted pixel edges, deep slate, electric yellow, and stormy indigo palette. Completely empty arena floor, no characters, no pokemon, no text, no ui. ${NEGATIVE_PROMPT}`
  },

  // --- 3. Apex Moltres (apex-moltres) ---
  {
    name: 'apex-moltres-p1',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, distant panoramic caldera perspective. The grand volcanic summit caldera of Mt. Ember. Symmetrical towering dark basalt columns and layered red volcanic strata framing both sides. In the far distance at the back, a dramatic smoldering volcanic crater with a gentle glowing magma river and plumes of warm smoke rising into a fiery twilight sky with floating embers. The combat battlefield is an expansive, completely flat, level dark obsidian stone terrace, cool and solid. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, rich dithered shading, crisp hand-crafted pixel edges, vibrant crimson, warm amber, and charcoal basalt palette. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui. ${NEGATIVE_PROMPT}`
  },
  {
    name: 'apex-moltres-p2',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on perspective. An ancient ruined stone sanctuary built inside a dormant volcanic caldera. Symmetrical crumbling red sandstone colonnades and carved stone braziers burning with orange fire along both flanks. In the center background, an ancient ceremonial stone archway framing a distant glowing caldera under a starry sunset sky. The combat floor is an immaculate, flat, level ancient stone flagstone plaza bordered by charred rock tiles. Authentic 16-bit GBA / Nintendo DS RPG pixel art aesthetic, rich dithered shading, crisp hand-crafted pixel edges, deep terracotta, golden firelight, and volcanic slate palette. Completely empty arena floor, no characters, no pokemon, no text, no ui. ${NEGATIVE_PROMPT}`
  },

  // --- 4. Apex Mewtwo (apex-mewtwo) ---
  {
    name: 'apex-mewtwo-p1',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on perspective. The secret subterranean cloning laboratory deep beneath Pokémon Mansion on Cinnabar Island. Symmetrical rows of dark server racks, hanging electrical cable conduits, and steel support pillars lining both walls. In the far center background, on a raised back platform in the distance, a large shattered cylindrical glass stasis chamber with faint dripping green nutrient fluid and dim green diagnostic terminal screens. Mysterious ambient purple and cyan fluorescent lighting casting soft shadows. The combat battlefield is an expansive, completely flat, level polished grey laboratory tile floor with faint yellow safety boundary lines. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, rich dithered shading, crisp hand-crafted pixel edges, moody sci-fi laboratory atmosphere. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui. ${NEGATIVE_PROMPT}`
  },
  {
    name: 'apex-mewtwo-p2',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, perfectly centered straight-on perspective. A heavily reinforced underground containment vault. Symmetrical reinforced blast-wall bulkheads and recessed violet halogen light strips along the flanks. In the far background, a massive circular vault door with glowing purple psychic runes etched into the metal, flanked by deactivated control consoles. Subtle lavender ethereal particles drift near the walls. The combat ground is a wide, flat, level dark composite stone arena floor with clean geometric perimeter markings. Authentic 16-bit GBA / Nintendo DS RPG pixel art aesthetic, rich dithered shading, crisp hand-crafted pixel edges, sleek dark indigo, violet, and graphite palette. Completely empty arena floor, no characters, no pokemon, no text, no ui. ${NEGATIVE_PROMPT}`
  },

  // --- 5. Apex Mew (apex-mew) ---
  {
    name: 'apex-mew-p1',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, distant panoramic landscape perspective. A secluded sacred clearing on mythical Faraway Island. Symmetrical giant rainforest trees with hanging mossy lianas and broad leafy boughs framing the left and right edges like a natural proscenium. In the far center background, a majestic colossal ancient tree with glowing pink and golden leaves, surrounded by a tranquil pond with floating lotus blossoms and warm sunbeams filtering through the canopy. Tiny golden stardust particles drift in the background air. The combat battlefield is an expansive, completely flat, level sun-dappled moss and wildflower clearing in the foreground. Authentic 16-bit GBA / Nintendo DS RPG pixel art style, rich dithered shading, crisp hand-crafted pixel edges, lush emerald green, pastel blossom pink, and warm sunlight palette. Completely empty arena floor, no characters, no pokemon, no trainers, no text, no ui. ${NEGATIVE_PROMPT}`
  },
  {
    name: 'apex-mew-p2',
    prompt: `16-bit pixel art battle stage background, wide angle horizontal view at eye level, distant panoramic perspective. An ancient moss-covered stone temple courtyard hidden in the heart of a primordial jungle. Symmetrical weathered monolithic stone pillars wrapped in tropical flowering vines framing both sides. In the far background, an ancient carved stone altar nestled beneath a canopy of giant luminous exotic flowers under a soft twilight sky with gentle purple and turquoise gradients. The combat ground is a wide, completely flat, level ancient flagstone terrace covered in soft green moss. Authentic 16-bit GBA / Nintendo DS RPG pixel art aesthetic, rich dithered shading, crisp hand-crafted pixel edges, mystical, serene, and spacious. Completely empty arena floor, no characters, no pokemon, no text, no ui. ${NEGATIVE_PROMPT}`
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

    // Respect Vertex AI API rate limit
    if (i < tasks.length - 1) {
      console.log('Sleeping 4s between requests...');
      await sleep(4000);
    }
  }

  console.log('\nAll 10 Apex proposals generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
