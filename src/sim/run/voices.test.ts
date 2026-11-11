import { describe, expect, it } from 'vitest';
import { ALL_GYMS, ALL_TRAINERS, REGIONS } from './region';
import { LEAGUE_MEMBERS } from './league';
import { LEGENDARY_ARENAS } from './legendaries';

// §2.7 — every line said as a fight opens is held in the battle ticker on turn 1, so it must fit the narrowest one:
// a Gym at 1280×720 with three rule chips beside it leaves about 300 px, 48 characters of the ticker's type.
const OPENING_MAX = 48;

const spoken: [string, string][] = [
  ...ALL_TRAINERS.map((t): [string, string] => [t.name, t.line]),
  ...ALL_GYMS.map((g): [string, string] => [g.name, g.line]),
  ...REGIONS.flatMap((r): [string, string][] => [
    [r.elite.name, r.elite.line],
    [`${r.name} Elite Wild`, r.eliteWild.line],
  ]),
  ...LEAGUE_MEMBERS.map((m): [string, string] => [m.name, m.line]),
  ...Object.entries(LEGENDARY_ARENAS).map(([id, a]): [string, string] => [id, a.line]),
];

describe('Opening lines — §2.7', () => {
  it('EveryOpeningLine_FitsTheNarrowestTicker', () => {
    const long = spoken
      .filter(([, line]) => line.length > OPENING_MAX)
      .map(([who, line]) => `${line.length} ${who}: ${line}`);
    expect(long).toEqual([]);
  });

  it('EveryOpeningLine_IsWritten', () => {
    expect(spoken.filter(([, line]) => !line?.trim())).toEqual([]);
  });
});
