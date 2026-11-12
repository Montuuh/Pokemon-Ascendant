import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/registry';
import { formSize, standParty, TITLE_BEATS, TITLE_PARTIES, titleEvolvingShare } from './parties';

// §9.13.1 — the parties on the title's summit: every picture they need is on disk, and every line is a real one.
describe('The title parties — §9.13.1', () => {
  const content = getContent();

  it('EveryForm_IsASpeciesWithItsPicture_ItsLight_AndItsSize', () => {
    for (const party of TITLE_PARTIES) {
      for (const id of party.lines.flat()) {
        expect(() => content.species(id), id).not.toThrow();
        expect(existsSync(`public/art/title/forms/${id}.png`), `${id} form`).toBe(true);
        expect(existsSync(`public/art/title/forms/${id}-light.png`), `${id} light`).toBe(true);
        expect(formSize(id).w, id).toBeGreaterThan(0);
      }
    }
  });

  it('EveryParty_AtEveryStage_StandsSideBySideOnTheLedge_NoneOverAnother', () => {
    for (const party of TITLE_PARTIES) {
      for (const stage of [0, 1, 2]) {
        const widths = party.lines.map((line) => formSize(line[stage]!).w) as [number, number, number];
        const spots = standParty(widths);
        const label = `${party.lines.map((line) => line[stage]).join(' ')}`;
        spots.forEach((spot, i) => {
          expect(spot.x, label).toBeGreaterThanOrEqual(412);
          expect(spot.x, label).toBeLessThanOrEqual(596);
          if (i > 0) expect(spot.x - widths[i]! / 2, label).toBeGreaterThanOrEqual(spots[i - 1]!.x + widths[i - 1]! / 2);
        });
      }
    }
  });

  it('EveryLine_IsAnEvolutionChain_InOrder', () => {
    for (const party of TITLE_PARTIES) {
      for (const [first, second, third] of party.lines) {
        expect(content.species(first).evolvesTo, first).toContain(second);
        expect(content.species(second).evolvesTo, second).toContain(third);
      }
    }
  });

  it('EveryFlyer_HasItsFrontSprite_AndIsNotInItsOwnParty', () => {
    for (const party of TITLE_PARTIES) {
      expect(existsSync(`public/art/pokemon/battle/${party.flyer}.gif`), party.flyer).toBe(true);
      expect(party.lines.flat()).not.toContain(party.flyer);
    }
  });

  it('TheParty_IsEvolving_LessThanAThirdOfTheTime', () => {
    expect(titleEvolvingShare()).toBeLessThan(1 / 3);
    // One member's beat ends before the next one's begins.
    expect(TITLE_BEATS.gap).toBeGreaterThan(0);
  });

  it('EveryForm_HasItsFlash', () => {
    for (const id of TITLE_PARTIES.flatMap((party) => party.lines.flat())) expect(existsSync(`public/art/title/forms/${id}-flash.png`), id).toBe(true);
  });

  it('NoPokemon_StandsInTwoParties', () => {
    const ids = TITLE_PARTIES.flatMap((p) => p.lines.flat());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('TheVista_ItsCloudStrips_AndItsNightSide_AreOnDisk', () => {
    for (const name of ['summit', 'clouds-far', 'clouds-near', 'dusk']) expect(existsSync(`public/art/title/${name}.png`), name).toBe(true);
  });
});
