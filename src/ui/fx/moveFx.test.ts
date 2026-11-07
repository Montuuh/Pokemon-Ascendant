import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/registry';
import { MOTION_MS } from '@/ui/moveMotion';
import { composedRecipes, fxBeatOf, fxBgOf, fxCastOf, fxChoreoOf, fxLunges, fxRecipeOf, fxSprite, fxSpriteFile, pretScriptOf } from './moveFx';

// §9.9.2 — every move is drawn with FireRed's own battle-animation sprites (or pret's, composed for a Gen IV move),
// except the few the GBA animates without any: those keep the drawn shapes.
const DRAWN_WITHOUT_SPRITES = new Set(['bind', 'wrap', 'tail-whip', 'surf', 'growth', 'earthquake', 'agility', 'double-team', 'harden', 'minimize', 'withdraw', 'haze', 'mirror-move', 'transform', 'flash', 'splash', 'acid-armor', 'substitute', 'iron-defense']);
const base = (id: string) => id.replace(/(-plus)+$/, '');

describe('Move animation sprites — §9.9.2', () => {
  const moves = getContent().allMoves();

  it('fxRecipeOf_EveryMove_HasSpritesUnlessTheGbaDrawsItWithout', () => {
    const missing = moves.filter((m) => !fxRecipeOf(m.id) && !DRAWN_WITHOUT_SPRITES.has(base(m.id))).map((m) => m.id);
    expect(missing).toEqual([]);
  });

  it('fxRecipeOf_EverySpriteAndBackground_IsImportedOnDisk', () => {
    const recipes = [...moves.map((m) => fxRecipeOf(m.id)), ...Object.values(composedRecipes())];
    for (const r of recipes) {
      if (!r) continue;
      for (const p of [r.main, r.impact]) {
        if (!p) continue;
        const info = fxSprite(p.sprite);
        expect(info, p.sprite).toBeDefined();
        expect(existsSync(`public/art/fx/pret/${fxSpriteFile(p.sprite)}`), p.sprite).toBe(true);
        if (p.frame !== undefined) expect(p.frame, p.sprite).toBeLessThan(info!.frames);
      }
      if (r.bg) expect(existsSync(`public/art/fx/bg/${r.bg}.png`), r.bg).toBe(true);
    }
  });

  it('fxRecipeOf_AFrlgMove_TakesTheSpritesItsOwnScriptLoads', () => {
    expect(fxRecipeOf('flamethrower')).toEqual({ main: { sprite: 'small-ember' } });
    expect(fxRecipeOf('bite')).toEqual({ main: { sprite: 'sharp-teeth' }, impact: { sprite: 'impact' }, pair: true });
    expect(fxRecipeOf('thunder')?.bg).toBe('thunder');
    expect(fxRecipeOf('psychic')).toEqual({ bg: 'psychic' });
    expect(pretScriptOf('high-jump-kick')).toBeDefined();
  });

  it('fxRecipeOf_AnUpgradedCard_IsDrawnAsItsBaseMove', () => {
    expect(fxRecipeOf('ember-plus')).toEqual(fxRecipeOf('ember'));
  });

  it('fxRecipeOf_HandsAndFeet_ShowsTheFootForAKickAndTheFistForAPunch', () => {
    expect(fxRecipeOf('mega-kick')?.main).toEqual({ sprite: 'hands-and-feet', frame: 2 });
    expect(fxRecipeOf('mega-punch')?.main).toEqual({ sprite: 'hands-and-feet', frame: 0 });
  });

  it('fxBgOf_ARoutineHitOrAStatusCard_KeepsTheStage_AHeavyMoveWashesIt', () => {
    expect(fxBgOf('mega-kick', 'melee')).toBeUndefined();
    expect(fxBgOf('confusion', 'projectile')).toBeUndefined();
    expect(fxBgOf('hypnosis', 'hex')).toBeUndefined();
    expect(fxBgOf('night-slash', 'melee')).toBeUndefined();
    expect(fxBgOf('psychic', 'area')).toBe('psychic');
    expect(fxBgOf('thunder', 'area')).toBe('thunder');
    expect(fxBgOf('giga-impact', 'melee')).toBe('highspeed');
  });

  it('fxRecipeOf_ARepaletteOfASheetOfPieces_HoldsAPieceAsItsBaseDoes', () => {
    expect(fxRecipeOf('stone-edge')?.main).toEqual({ sprite: 'rocks@stone', frame: 0 });
  });

  it('fxRecipeOf_AThrownMove_ThrowsOneUnlessItIsAVolley', () => {
    expect(fxRecipeOf('energy-ball')?.volley).toBeUndefined();
    expect(fxRecipeOf('pin-missile')?.volley).toBe(4);
  });

  it('fxLunges_OnlyWhereTheGbaMovesTheAttacker_BiteLandsFromAfar', () => {
    expect(fxLunges('tackle')).toBe(true);
    expect(fxLunges('quick-attack')).toBe(true);
    expect(fxLunges('bite')).toBe(false);
    expect(fxLunges('cut')).toBe(false);
    expect(fxLunges('giga-impact')).toBe(true);
    expect(fxLunges('night-slash')).toBe(false);
    // A move drawn without sprites keeps its dash: it is its only picture of the blow.
    expect(fxLunges('bind')).toBe(true);
  });

  it('fxCastOf_AMeleeMoveWithOnlyItsHit_IsDrawnWithSprites_SoItHasNoEmptyBeat', () => {
    expect(fxCastOf('pound')).toMatchObject({ sprites: true, own: false, dash: false });
    expect(fxCastOf('bite')).toMatchObject({ sprites: true, own: true, dash: false });
    expect(fxCastOf('tackle')).toMatchObject({ sprites: false, dash: true });
  });

  it('fxRecipeOf_AFrlgScriptWhoseFirstSpriteIsNotTheMove_IsDrawnWithThePieceThatIs', () => {
    expect(fxRecipeOf('rock-tomb')?.main?.sprite).toBe('rocks');
    expect(fxRecipeOf('kinesis')?.main?.sprite).toBe('bent-spoon');
    expect(fxRecipeOf('crush-claw')?.main?.sprite).toBe('claw-slash');
  });

  it('fxSprite_AnObjBlendSprite_IsSeeThrough', () => {
    expect(fxSprite('protect')?.blend).toBe(true);
    expect(fxSprite('protect@gold')?.blend).toBe(true);
    expect(fxSprite('small-ember')?.blend).toBeUndefined();
  });

  it('fxChoreoOf_AFrlgMove_ReplaysItsScriptsSprites_EachOnItsCallbacksPath', () => {
    const paths = (id: string) => new Set(fxChoreoOf(id)!.emits.map((e) => e.path));
    // Flamethrower's 22 embers pour in a wave; Fire Spin's circle its target; Rock Throw's fall on it; Absorb's flow back.
    expect(fxChoreoOf('flamethrower')!.emits.filter((e) => e.path === 'wave')).toHaveLength(22);
    expect(paths('fire-spin')).toEqual(new Set(['orbit']));
    expect(paths('rock-throw')).toEqual(new Set(['fall']));
    expect(paths('absorb').has('absorb')).toBe(true);
    // Bite's jaws close on the foe, and it lands as they do.
    const bite = fxChoreoOf('bite')!;
    expect(bite.emits.filter((e) => e.path === 'close')).toHaveLength(2);
    expect(bite.impactMs).toBeGreaterThan(0);
  });

  it('fxChoreoOf_EveryChoreography_FitsItsBeat_WithSpritesOnDisk', () => {
    for (const m of moves) {
      for (const dash of [false, true]) {
        const c = fxChoreoOf(m.id, fxBeatOf('melee', dash, MOTION_MS.choreo.max));
        if (!c) continue;
        expect(c.totalMs, m.id).toBeLessThanOrEqual(MOTION_MS.choreo.max + MOTION_MS.melee.windup + MOTION_MS.melee.dash + 1);
        expect(c.impactMs, m.id).toBeLessThanOrEqual(c.totalMs);
        for (const e of c.emits) expect(fxSprite(e.piece.sprite), `${m.id} ${e.piece.sprite}`).toBeDefined();
      }
    }
  });

  it('fxChoreoOf_ADash_LandsItsSpritesWhenTheUserArrives', () => {
    expect(fxChoreoOf('tackle', fxBeatOf('melee', true, MOTION_MS.choreo.max))!.impactMs).toBe(MOTION_MS.melee.windup + MOTION_MS.melee.dash);
  });

  it('fxChoreoOf_AGenIvMove_BorrowsTheScriptItMovesLike_ItsSpritesSwapped', () => {
    const fang = fxChoreoOf('fire-fang')!;
    expect(fang.emits.filter((e) => e.path === 'close').map((e) => e.piece.sprite)).toEqual(['fangs', 'fangs']);
    expect(fang.emits.some((e) => e.piece.sprite === 'small-ember')).toBe(true);
    expect(fxChoreoOf('aura-sphere')).toBeUndefined();
  });

  it('fxChoreoOf_AMoveLandsWithItsBlow_NotWithAPreamble', () => {
    // Fire Punch circles its embers first: it lands with the fist's splat, not as the first ember shows.
    const punch = fxChoreoOf('fire-punch')!;
    expect(punch.impactMs).toBeGreaterThan(punch.emits[0]!.at);
    // Lightning lands with its bolt's stroke, its sparks after it.
    expect(fxChoreoOf('thunderbolt', fxBeatOf('bolt', false, MOTION_MS.choreo.max))!.impactMs).toBeGreaterThanOrEqual(MOTION_MS.bolt.strike);
  });

  it('fxChoreoOf_ASpriteThatDoesNotTravel_PlaysWhereItsCallbackPlacesIt', () => {
    expect(fxChoreoOf('swords-dance')!.emits[0]).toMatchObject({ path: 'rise', on: 'user' });
    expect(new Set(fxChoreoOf('petal-dance')!.emits.map((e) => `${e.path}:${e.on}`))).toContain('sway:user');
    expect(fxChoreoOf('tackle')!.emits[0]!.on).toBe('target');
  });

  it('fxChoreoOf_EveryBeat_KeepsToItsCap_AndHolds_ItsLastSprite', () => {
    for (const m of moves) {
      const c = fxChoreoOf(m.id, fxBeatOf('melee', true, MOTION_MS.choreo.light));
      if (!c) continue;
      expect(c.totalMs, m.id).toBeLessThanOrEqual(MOTION_MS.choreo.light + 1);
      for (const e of c.emits) expect(e.at + e.life, m.id).toBeLessThanOrEqual(c.totalMs + 0.001);
    }
  });

  it('fxChoreoOf_WithNoBlow_LandsAsItReachesItsTarget', () => {
    // Fire Blast's star of fire bursts on its target: it lands then, not as its fireball forms on its user.
    const blast = fxChoreoOf('fire-blast')!;
    expect(blast.impactMs).toBeGreaterThan(blast.emits[0]!.at);
  });

  it('fxChoreoOf_AMoveTheGbaPlaysOnThePokemon_CarriesItsBeats', () => {
    const kinds = (id: string) => fxChoreoOf(id)!.mon.map((b) => `${b.kind}:${b.on}`);
    // Agility rushes with afterimages; Harden shines; Growth swells and lights; Minimize shrinks; Splash hops.
    expect(kinds('agility')).toEqual(expect.arrayContaining(['sway:user', 'trace:user']));
    expect(kinds('harden')).toEqual(['shine:user']);
    expect(kinds('growth')).toEqual(expect.arrayContaining(['grow:user', 'tint:user']));
    expect(kinds('minimize')).toEqual(['shrink:user']);
    expect(kinds('splash')).toEqual(['hop:user']);
    // A hit's own shake on its target is in the script too; the game skips it, the hit shakes it already.
    expect(kinds('tackle')).toContain('shake:target');
  });

  it('fxChoreoOf_ABeatTheScriptRepeats_IsOneBeatPlayedAgain_AndNoLightFlashesThreeTimesASecond', () => {
    // Growth swells twice: one swelling played twice, not two that would merge into one on screen.
    const growth = fxChoreoOf('growth')!.mon.filter((b) => b.kind === 'grow');
    expect(growth).toHaveLength(1);
    expect(growth[0]!.n).toBe(2);
    for (const m of moves) {
      const beats = fxChoreoOf(m.id)?.mon ?? [];
      for (const b of beats) {
        expect(b.n, m.id).toBeLessThanOrEqual(3);
        // The same beat never twice at once on the same Pokémon.
        expect(beats.filter((o) => o.kind === b.kind && o.on === b.on && Math.abs(o.at - b.at) < MOTION_MS.mon[b.kind]), m.id).toHaveLength(1);
        if (b.kind === 'shine' || b.kind === 'tint' || b.kind === 'gray') expect(b.n / ((b.n * MOTION_MS.mon[b.kind]) / 1000), m.id).toBeLessThanOrEqual(3);
      }
    }
  });
});
