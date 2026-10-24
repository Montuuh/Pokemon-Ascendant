import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../../../..');
const destination = mkdtempSync(join(tmpdir(), 'ascendant-b04-release-'));
const archive = join(destination, 'head.tar');
execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, 'HEAD'], { cwd: root });
execFileSync('tar', ['-xf', archive, '-C', destination]);
const owned = [
  'src/ui/screens/run-end/FinalTeam.tsx', 'src/ui/hooks/useMotionPref.ts',
  'src/ui/art.ts', 'src/content/schemas/species.ts',
  'scripts/build-battle-stills.mjs', 'e2e/run-end-motion.spec.ts', 'e2e/run-end-art.spec.ts',
  'docs/art/pipeline.md', 'docs/art/ATTRIBUTION.md',
  ...readdirSync(join(root, 'public/art/pokemon/battle')).filter((f) => f.endsWith('.png') || f === 'stills-manifest.json').map((f) => `public/art/pokemon/battle/${f}`),
];
for (const file of owned) {
  mkdirSync(dirname(join(destination, file)), { recursive: true });
  writeFileSync(join(destination, file), readFileSync(join(root, file)));
}
writeFileSync(join(root, 'playtest/art-review-2026-10-24/implementation/B04/exact-export-path.txt'), destination + '\n');
writeFileSync(join(destination, 'b04-owned-files.json'), JSON.stringify(owned, null, 2));
// Release metadata is authored in this isolated candidate first; no external hunks enter it.
const update = (file, fn) => writeFileSync(join(destination, file), fn(readFileSync(join(destination, file), 'utf8')));
update('package.json', (text) => text.replace('"version": "0.9.42"', '"version": "0.9.43"'));
update('package-lock.json', (text) => text.replaceAll('"version": "0.9.42"', '"version": "0.9.43"'));
update('CHANGELOG.md', (text) => text.replace('### v0.9.42', '### v0.9.43 — A still final team · 2026-10-24\n\nFinal teams follow the chosen motion preference.\n\n- **Reduced motion.** Victory and defeat keep every normal and shiny Pokémon still.\n- **Live settings.** System and in-game motion changes apply without reopening the screen.\n\n### v0.9.42'));
update('README.md', (text) => text.replace('**v0.9.42 — Where the run ended.** Ending labels identify the reached Region column, Victory Road column or League opponent.', '**v0.9.43 — A still final team.** Victory and defeat respect reduced motion, including shiny sprites and live preference changes.'));
update('docs/roadmap.md', (text) => text.replace('## v1.0 — Release', '### v0.9.43 — A still final team  ✅ 2026-10-24\n\n**Shipped.** B04 selects exact first-frame battle sprites for final teams when system or in-game reduced motion applies. Normal and shiny palettes, native half-step scales and baselines are retained. System preference changes update live; Full motion retains GIF animation. No game rule or composition change.\n\n## v1.0 — Release'));
update('docs/session/active.md', (text) => text.replace('**Date:** 2026-10-24 · **Version:** v0.9.42 (*Where the run ended*) — B03 location labels.', '**Date:** 2026-10-24 · **Version:** v0.9.43 (*A still final team*) — B04 reduced motion.').replace('**B03:**', '**B04:** final-team PNG/GIF selection follows system and in-game motion live, preserving shiny palettes and native geometry. Evidence: playtest/art-review-2026-10-24/implementation/B04. Independent review and exact-release results are recorded there. A02/A03 and their18-entry queue remain excluded.\n\n**B03:**'));
writeFileSync(join(destination, 'playwright.b04.config.ts'), `import config from './playwright.config';
export default { ...config, use: { ...config.use, baseURL: 'http://localhost:5176' },
  webServer: { command: 'npm run dev -- --port 5176', url: 'http://localhost:5176', reuseExistingServer: false, timeout: 60000 } };
`);
console.log(destination);
