import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { autoPlay } from '../balance/autoPlayer';
import { content, ctx, startFixture } from '../testing/harness';
import { fingerprint, replayCombat, type RecordedCombat } from './replay';

// Golden-master replays. A deliberate rules change updates them with:  UPDATE_GOLDEN=1 npm test
// Every other change that alters a fingerprint is a regression until proven otherwise.
const DIR = resolve(process.cwd(), 'src/sim/replay/fixtures');
const GOLDEN = ['wild-basic', 'full-hand-3mon', 'wild-boss-3phase'] as const;

interface GoldenFile extends RecordedCombat {
  fingerprint: string;
  turns: number;
  outcome: string;
}

describe('Golden-master replays', () => {
  it.each(GOLDEN)('%s', (id) => {
    const sc = content.scenario(id);
    const file = resolve(DIR, `${id}.json`);
    if (process.env.UPDATE_GOLDEN === '1' || !existsSync(file)) {
      const played = autoPlay(startFixture(id), ctx);
      const golden: GoldenFile = {
        scenarioId: id,
        seed: sc.seed,
        actions: played.actions,
        fingerprint: fingerprint(played.state),
        turns: played.turns,
        outcome: played.state.outcome,
      };
      mkdirSync(DIR, { recursive: true });
      writeFileSync(file, JSON.stringify(golden, null, 2) + '\n');
    }
    const golden = JSON.parse(readFileSync(file, 'utf8')) as GoldenFile;
    const replayed = replayCombat(golden, sc, ctx);
    expect(replayed.rejectedAt).toBeNull();
    expect(fingerprint(replayed.state)).toBe(golden.fingerprint);
  });
});
