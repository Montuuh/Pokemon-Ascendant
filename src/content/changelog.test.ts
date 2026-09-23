import { describe, expect, it } from 'vitest';
import { CHANGELOG, latestShipped, levelOf, parseChangelog, sameVersion } from './changelog';
import { APP_VERSION, ROADMAP } from './roadmap';

// The What's new screen reads CHANGELOG.md. These run the parser against the *real* file, so a reformat it
// cannot read fails here instead of shipping an empty page — and they hold docs/release-doctrine.md's rules
// that a test can see: the newest shipped entry is the version the build says it is, and nothing is out of order.

const key = (v: string) => v.replace(/^v/, '').split('.').map(Number);
const newerThan = (a: string, b: string) => {
  const [x, y] = [key(a), key(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

describe('The changelog the game reads — release doctrine', () => {
  it('ReadsEveryVersion_FromTheRealFile_NewestFirst', () => {
    const minors = CHANGELOG.releases.map((r) => r.version);
    expect(minors.at(-1)).toBe('v0.1');
    for (let i = 1; i < minors.length; i++) expect(newerThan(minors[i - 1]!, minors[i]!), `${minors[i - 1]} before ${minors[i]}`).toBe(true);
    for (const r of CHANGELOG.releases) {
      expect(r.level, r.version).not.toBe('patch');
      for (let i = 1; i < r.patches.length; i++) expect(newerThan(r.patches[i - 1]!.version, r.patches[i]!.version)).toBe(true);
      // A patch sits under its own minor: v0.7.3 under v0.7.
      for (const p of r.patches) {
        expect(p.level).toBe('patch');
        expect(p.version.startsWith(`${r.version}.`), `${p.version} under ${r.version}`).toBe(true);
      }
    }
  });

  it('EveryEntrySaysWhatItAdded', () => {
    for (const r of CHANGELOG.releases.flatMap((m) => [m, ...m.patches])) {
      // A minor still being built says what it is for in its lede; its patches carry the bullets until it ships.
      if (r.level !== 'patch' && r.date === null) {
        expect(r.lede.length, `${r.version} needs a lede`).toBeGreaterThan(10);
        continue;
      }
      expect(r.items.length, `${r.version} has no bullets`).toBeGreaterThan(0);
      for (const item of r.items) {
        expect(item.title.length, r.version).toBeGreaterThan(2);
        expect(item.body.length, `${r.version} · ${item.title}`).toBeGreaterThan(10);
      }
    }
  });

  it('TheNewestShippedEntry_IsTheVersionTheBuildSaysItIs', () => {
    const latest = latestShipped();
    expect(latest).not.toBeNull();
    expect(sameVersion(latest!.version, APP_VERSION), `CHANGELOG says ${latest!.version}, package.json ${APP_VERSION}`).toBe(true);
  });

  it('AgreesWithTheRoadmap_OnEveryMinor', () => {
    // A minor is a roadmap row: same name, and shipped on the same day, or still being built on both.
    for (const r of CHANGELOG.releases) {
      const row = ROADMAP.find((v) => v.version === r.version);
      expect(row, `${r.version} is not on the roadmap`).toBeDefined();
      expect(row!.date, r.version).toBe(r.date);
    }
  });

  it('LevelOf_MajorMinorPatch_ComesFromTheNumber', () => {
    expect(levelOf('v1.0')).toBe('major');
    expect(levelOf('v2.0')).toBe('major');
    expect(levelOf('v0.7')).toBe('minor');
    expect(levelOf('v1.1')).toBe('minor');
    expect(levelOf('v0.7.3')).toBe('patch');
    expect(sameVersion('v0.6', '0.6.0')).toBe(true);
    expect(sameVersion('v0.7.3', '0.7.3')).toBe(true);
    expect(sameVersion('v0.7', '0.7.3')).toBe(false);
  });

  it('Parse_NextBlockAndWrappedBullets', () => {
    const log = parseChangelog(`
# Changelog
> preamble with - **not a bullet.** here

## Next

- **A fix.** Something that reached the game
  after the last version.

## v0.2 — Two · in progress

Lede line.

### v0.2.1 — Two point one · 2026-01-02

- **Thing.** It works.

## v0.1 — One · 2026-01-01

- **First.** The first thing.
`);
    expect(log.next).toEqual([{ title: 'A fix', body: 'Something that reached the game after the last version.' }]);
    expect(log.releases.map((r) => r.version)).toEqual(['v0.2', 'v0.1']);
    expect(log.releases[0]!.date).toBeNull();
    expect(log.releases[0]!.lede).toBe('Lede line.');
    expect(log.releases[0]!.patches[0]!.items[0]).toEqual({ title: 'Thing', body: 'It works.' });
    expect(latestShipped(log)!.version).toBe('v0.2.1');
  });
});
