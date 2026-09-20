import { describe, expect, it } from 'vitest';
import { parseRoadmap, ROADMAP } from './roadmap';

// The About screen reads docs/roadmap.md. These run the parser against the *real* file, so the day someone
// reformats the table into a shape it cannot read, a test fails instead of the game shipping an empty About.

describe('The roadmap the game reads', () => {
  it('ParsesEveryVersionRow_FromTheRealFile', () => {
    expect(ROADMAP.length).toBeGreaterThanOrEqual(10);
    const versions = ROADMAP.map((v) => v.version);
    expect(versions).toEqual([...versions].sort((a, b) => parseFloat(a.slice(1)) - parseFloat(b.slice(1))));
    expect(versions[0]).toBe('v0.1');
    expect(versions[versions.length - 1]).toBe('v1.0');
    for (const v of ROADMAP) {
      expect(v.name.length, v.version).toBeGreaterThan(2);
      expect(v.claim.length, v.version).toBeGreaterThan(10);
    }
  });

  it('AFinishedRowCarriesItsDate_AndAnUnfinishedOneDoesNot', () => {
    for (const v of ROADMAP) {
      if (v.status === 'done') expect(v.date, `${v.version} is done but has no date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      else expect(v.date, `${v.version} is not done but carries a date`).toBeNull();
    }
    // Versions ship in order: nothing later is done while something earlier is not.
    const lastDone = ROADMAP.map((v) => v.status).lastIndexOf('done');
    for (let i = 0; i < lastDone; i++) expect(ROADMAP[i]!.status, `${ROADMAP[i]!.version} before a finished version`).toBe('done');
  });

  it('ExactlyOneVersionIsInProgress_OrNoneBetweenReleases', () => {
    // The game highlights "what is being built"; two of them would be a lie and the roadmap's own rule is
    // "the version being built is the only scope".
    expect(ROADMAP.filter((v) => v.status === 'active').length).toBeLessThanOrEqual(1);
  });

  it('IgnoresEverythingThatIsNotAVersionRow', () => {
    const md = `
| Version | Name | Playable claim | Status |
|---|---|---|---|
| v0.1 | Slice | Fight a fight | ✅ 2026-09-19 · ◐ playtest |
| v0.2 | Route | Walk a route | ◐ in progress |
| v0.3 | Later | Do a thing | ☐ |
| not a version | x | y | ✅ |
| Path | What |
|---|---|
| \`src/sim\` | rules |
`;
    const parsed = parseRoadmap(md);
    expect(parsed.map((v) => [v.version, v.status, v.date, v.note])).toEqual([
      ['v0.1', 'done', '2026-09-19', 'playtest'],
      ['v0.2', 'active', null, 'in progress'],
      ['v0.3', 'planned', null, ''],
    ]);
  });
});
