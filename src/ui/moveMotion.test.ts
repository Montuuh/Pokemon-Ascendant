import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { AREA_MOVES, baseMoveId, MOTION_MS, motionOf, motionTimings } from './moveMotion';

// §9.9.2 — how a move moves: every move in the game has an animation, its impact inside its beat, and the great
// moves fill the stage. Read from the content, so a new move cannot ship without one.

const content = buildRegistry();
const kindOf = (id: string, victims = 1) => motionOf(content.move(id), victims);

describe('Move motion — §9.9.2', () => {
  it('MotionOf_EachKindFromTheMovesOwnRow', () => {
    expect(kindOf('tackle')).toMatchObject({ kind: 'melee' });
    expect(kindOf('ember')).toMatchObject({ kind: 'projectile', style: 'flame' });
    expect(kindOf('razor-leaf')).toMatchObject({ kind: 'projectile', style: 'leaves' });
    expect(kindOf('thunderbolt')).toMatchObject({ kind: 'bolt' });
    expect(kindOf('hydro-pump')).toMatchObject({ kind: 'beam' });
    expect(kindOf('mega-drain')).toMatchObject({ kind: 'drain' });
    expect(kindOf('swords-dance')).toMatchObject({ kind: 'aura' });
    expect(kindOf('thunder-wave')).toMatchObject({ kind: 'hex' });
  });

  it('MotionOf_APowerZeroMoveAimedAtTheOtherSide_IsThrownAtIt_NotGlowedOnItsUser', () => {
    // A lowered stage on the foe's whole side, a disable, a seed, a lock, a taunt, a hazard, a forced swap.
    for (const id of ['growl', 'tail-whip', 'disable', 'leech-seed', 'mean-look', 'taunt', 'spikes', 'stealth-rock', 'roar'])
      expect(kindOf(id), id).toMatchObject({ kind: 'hex' });
    expect(kindOf('giga-drain')).toMatchObject({ kind: 'drain' });
    expect(kindOf('protect')).toMatchObject({ kind: 'aura' });
  });

  it('MotionOf_AMoveDrawnWithItsSprites_HasNoEmptyCharge_AndAVolleyLandsWithItsLastShot', () => {
    const drawn = kindOf('swift');
    const sprite = motionOf(content.move('swift'), 1, { sprites: true, own: true, dash: false, volley: 3 });
    expect(sprite.impactMs).toBe(MOTION_MS.projectile.travel + 2 * MOTION_MS.projectile.volley);
    expect(sprite.impactMs).toBeLessThan(drawn.impactMs + 2 * MOTION_MS.projectile.volley);
    // Bite, which does not dash: its teeth are on the foe from the first frame and land a lead later.
    expect(motionOf(content.move('bite'), 1, { sprites: true, own: true, dash: false, volley: 1 }).impactMs).toBe(MOTION_MS.sprite.lead);
    // Pound has only its splat: it lands at once, no empty beat before it.
    expect(motionOf(content.move('pound'), 1, { sprites: true, own: false, dash: false, volley: 1 }).impactMs).toBe(MOTION_MS.frames.flicker);
    // Tackle still dashes across first.
    expect(motionOf(content.move('tackle'), 1, { sprites: true, own: false, dash: true, volley: 1 }).impactMs).toBe(kindOf('tackle').impactMs);
  });

  it('TheGreatMoves_FillTheStage_AndAnythingHittingSeveral_Too', () => {
    expect(kindOf('surf')).toMatchObject({ kind: 'area', style: 'wave' });
    expect(kindOf('earthquake')).toMatchObject({ kind: 'area', style: 'quake' });
    expect(kindOf('blizzard')).toMatchObject({ kind: 'area', style: 'blizzard' });
    expect(kindOf('thunder')).toMatchObject({ kind: 'area', style: 'storm' });
    // A Melee move that lands on two at once is no dash: the whole field takes it.
    expect(kindOf('tackle', 2)).toMatchObject({ kind: 'area' });
    for (const id of Object.keys(AREA_MOVES)) expect(content.hasMove(id), id).toBe(true);
  });

  it('AnUpgradedCard_MovesAsItsBaseMove', () => {
    expect(baseMoveId('flamethrower-plus')).toBe('flamethrower');
    expect(baseMoveId('solar-beam-plus-plus')).toBe('solar-beam');
    expect(kindOf('hydro-pump-plus')).toMatchObject({ kind: 'beam' });
    expect(kindOf('surf-plus')).toMatchObject({ kind: 'area', style: 'wave' });
  });

  it('EveryMove_HasAnAnimation_ItsImpactInsideItsBeat', () => {
    for (const move of content.allMoves()) {
      const m = motionOf(move, 1);
      expect(m.impactMs, move.id).toBeGreaterThan(0);
      expect(m.impactMs, move.id).toBeLessThan(m.totalMs);
    }
  });

  it('EarthquakesShake_RunsFromABeatBeforeItsImpactToTheEndOfItsSettle', () => {
    const quake = kindOf('earthquake');
    expect(quake.impactMs - MOTION_MS.stage.lead + MOTION_MS.stage.shake).toBe(quake.impactMs + MOTION_MS.area.settle);
  });

  it('EveryBeat_OutlastsItsImpactsBurst_SoNothingIsCutOff', () => {
    for (const id of ['tackle', 'ember', 'hydro-pump', 'thunderbolt', 'mega-drain']) {
      const m = kindOf(id);
      expect(m.totalMs, id).toBeGreaterThanOrEqual(m.impactMs + MOTION_MS.impact.ring);
    }
    const surf = kindOf('surf');
    expect(surf.totalMs).toBeGreaterThanOrEqual(surf.impactMs + 2 * MOTION_MS.impact.stagger + MOTION_MS.impact.ring);
  });

  it('MotionTimings_SayEveryBeatOfTheTable', () => {
    const vars = motionTimings();
    for (const [kind, beats] of Object.entries(MOTION_MS)) for (const [beat, ms] of Object.entries(beats)) expect(vars[`--mv-${kind}-${beat}`]).toBe(`${ms}ms`);
  });
});
