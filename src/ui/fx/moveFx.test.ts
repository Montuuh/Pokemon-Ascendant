import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/registry';
import { composedRecipes, fxBgOf, fxRecipeOf, fxSprite, fxSpriteFile, pretScriptOf } from './moveFx';

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
});
