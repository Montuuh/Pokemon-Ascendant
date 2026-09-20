import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { RosterSchema, boxIconUrl, portraitUrl } from './schemas/species';
import roster from './data/roster-vs.json';

// Content rot-guard: every roster species has its migrated portrait + box icon on disk.
describe('roster-vs.json', () => {
  it('validates against RosterSchema', () => {
    expect(() => RosterSchema.parse(roster)).not.toThrow();
  });

  it('every species has portrait and icon art', () => {
    const r = RosterSchema.parse(roster);
    for (const line of r.lines) {
      for (const s of line.species) {
        expect(existsSync(`public${portraitUrl(s.dex, s.id)}`), `${s.id} portrait`).toBe(true);
        expect(existsSync(`public${boxIconUrl(s.dex, s.id)}`), `${s.id} icon`).toBe(true);
      }
    }
  });
});
