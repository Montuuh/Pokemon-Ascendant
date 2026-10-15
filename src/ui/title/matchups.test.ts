import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/registry';
import { TITLE_MATCHUPS, titleHits } from './matchups';

// §9.13.1 — the battles behind the title: every picture they need is on disk, and every fight ends with one standing.
describe('The title battles — §9.13.1', () => {
  const content = getContent();

  it('EveryFighter_IsASpeciesWithItsBattleSprites', () => {
    for (const m of TITLE_MATCHUPS) {
      for (const side of ['near', 'far'] as const) {
        const id = m[side].speciesId;
        expect(() => content.species(id), id).not.toThrow();
        expect(existsSync(`public/art/pokemon/battle/${id}.gif`), `${id} front`).toBe(true);
        if (side === 'near') expect(existsSync(`public/art/pokemon/battle/${id}-back.gif`), `${id} back`).toBe(true);
      }
    }
  });

  it('EveryMove_IsAMoveWithItsIllustration_AndEveryStageABackdrop', () => {
    for (const m of TITLE_MATCHUPS) {
      for (const id of [...m.near.moves, ...m.far.moves]) {
        expect(() => content.move(id), id).not.toThrow();
        expect(existsSync(`public/art/moves/${id}.png`), `${id} art`).toBe(true);
      }
      expect(existsSync(`public/art/stages/${m.stage}.jpg`), m.stage).toBe(true);
    }
  });

  it('EveryFight_TheWinnerKnocksTheOtherOut_AndIsLeftStanding', () => {
    for (const m of TITLE_MATCHUPS) {
      const hits = titleHits(m);
      const taken = (side: 'near' | 'far') => hits.filter((h) => h.by !== side).reduce((a, h) => a + h.damage, 0);
      const loser = m.winner === 'near' ? 'far' : 'near';
      expect(taken(loser)).toBeCloseTo(1, 5);
      expect(taken(m.winner)).toBeLessThan(0.9);
      expect(hits[hits.length - 1]!.by).toBe(m.winner);
    }
  });

  it('NoTwoFightsInARow_ShareAStage_OrAPokemon', () => {
    TITLE_MATCHUPS.forEach((m, i) => {
      const next = TITLE_MATCHUPS[(i + 1) % TITLE_MATCHUPS.length]!;
      expect(next.stage, `${i} → ${i + 1}`).not.toBe(m.stage);
      const ids = new Set([m.near.speciesId, m.far.speciesId]);
      expect(ids.has(next.near.speciesId) || ids.has(next.far.speciesId), `${i} → ${i + 1}`).toBe(false);
    });
  });
});
