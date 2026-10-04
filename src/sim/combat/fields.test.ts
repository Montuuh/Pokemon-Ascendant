import { describe, expect, it } from 'vitest';
import type { EnemySetup, ScenarioDef } from '../content/defs';
import { consumableCard, ctx, dispatch, eventsOf, handCard, scenario, start, tweak, withConsumableHand, withHand } from '../testing/harness';
import { breakdownFor } from './damageFlow';
import { fieldDrawBonus, fieldsSuppressed, isGrounded } from './fields';
import { forecastTurn } from './forecast';

// §4.3 — field effects: the damage terms, Electric Terrain's paralysis guard, the Sandstorm, the Home Field, Cloud
// Nine, the weather draw and Defog.

const CHARMANDER = { species: 'charmander', level: 12, moves: ['ember', 'scratch', 'growl', 'smokescreen'] };
const SQUIRTLE = { species: 'squirtle', level: 12, moves: ['water-gun', 'tackle', 'tail-whip', 'withdraw'] };
const RATTATA: EnemySetup = { species: 'rattata', level: 10, tier: 'wild', phaseCount: 1 };

const withFields = (def: ScenarioDef, fields: ScenarioDef['fields']): ScenarioDef => ({ ...def, fields });

describe('Field effects — §4.3', () => {
  it('Sun_FireUp_WaterDown_ByTheConfigNumbers', () => {
    const plain = start(scenario({ team: [CHARMANDER, SQUIRTLE], enemies: [RATTATA] }));
    const sunny = start(withFields(scenario({ team: [CHARMANDER, SQUIRTLE], enemies: [RATTATA] }), { weather: 'sunny-day' }));
    const e = (s: typeof plain) => s.enemies[0]!;
    const fire = ctx.content.move('ember');
    const water = ctx.content.move('water-gun');
    const fireSun = breakdownFor(sunny.player.team[0]!, e(sunny), fire, false, ctx, sunny);
    expect(fireSun.fieldMultiplier).toBe(ctx.config.weatherBoost);
    expect(fireSun.final).toBeGreaterThan(breakdownFor(plain.player.team[0]!, e(plain), fire, false, ctx, plain).final);
    expect(breakdownFor(sunny.player.team[1]!, e(sunny), water, false, ctx, sunny).fieldMultiplier).toBe(ctx.config.weatherDamp);
  });

  it('Rain_WaterUp_FireDown', () => {
    const s = start(withFields(scenario({ team: [CHARMANDER, SQUIRTLE], enemies: [RATTATA] }), { weather: 'rain-dance' }));
    expect(breakdownFor(s.player.team[1]!, s.enemies[0]!, ctx.content.move('water-gun'), false, ctx, s).fieldMultiplier).toBe(ctx.config.weatherBoost);
    expect(breakdownFor(s.player.team[0]!, s.enemies[0]!, ctx.content.move('ember'), false, ctx, s).fieldMultiplier).toBe(ctx.config.weatherDamp);
  });

  it('ElectricTerrain_LiftsElectricIntoTheGrounded_NotTheFlying', () => {
    const pika = { species: 'pikachu', level: 12, moves: ['thunder-shock', 'quick-attack', 'growl', 'tail-whip'] };
    const s = start(withFields(scenario({ team: [pika], enemies: [RATTATA, { species: 'pidgey', level: 10, tier: 'wild', phaseCount: 1 }], onField: 2 }), { terrain: 'electric-terrain' }));
    const shock = ctx.content.move('thunder-shock');
    expect(isGrounded(s.enemies[0]!, ctx.content)).toBe(true);
    expect(breakdownFor(s.player.team[0]!, s.enemies[0]!, shock, false, ctx, s).fieldMultiplier).toBe(ctx.config.electricTerrainBoost);
    expect(breakdownFor(s.player.team[0]!, s.enemies[1]!, shock, false, ctx, s).fieldMultiplier).toBeUndefined();
  });

  it('ElectricTerrain_AGroundedPokemonCannotBeParalysed', () => {
    const glare = { species: 'ekans', level: 12, moves: ['glare', 'wrap', 'leer', 'poison-sting'] };
    let s = start(withFields(scenario({ team: [glare], enemies: [RATTATA] }), { terrain: 'electric-terrain' }));
    s = withHand(tweak(s, (d) => { d.player.ap = 3; }), ['glare']);
    const after = dispatch(s, { type: 'play-card', cardId: handCard(s, 'glare').id });
    expect(after.enemies[0]!.status).toBeNull();
    expect(eventsOf(after, 'status-immune').length).toBeGreaterThan(0);
  });

  it('Sandstorm_ChipsTheExposed_SparesRockGroundFighting', () => {
    const s = tweak(start(withFields(scenario({ team: [CHARMANDER, { species: 'geodude', level: 12 }], enemies: [RATTATA] }), { hazard: 'sandstorm' })), (d) => {
      d.enemies[0]!.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false };
    });
    const after = dispatch(s, { type: 'end-turn' });
    const sand = eventsOf(after, 'damage').filter((e) => e.t === 'damage' && e.cause === 'sandstorm').map((e) => (e.t === 'damage' ? e.targetUid : ''));
    expect(sand).toContain('p0');
    expect(sand).toContain('e0');
    expect(sand).not.toContain('p1');
    const hit = eventsOf(after, 'damage').find((e) => e.t === 'damage' && e.cause === 'sandstorm' && e.targetUid === 'p0');
    expect(hit && hit.t === 'damage' && hit.amount).toBe(Math.max(1, Math.floor(s.player.team[0]!.maxHp * ctx.config.sandstormPercent)));
  });

  it('HomeField_LiftsOnlyTheEnemysOwnType', () => {
    const geo: EnemySetup = { species: 'geodude', level: 12, tier: 'boss', phaseCount: 1, moves: ['rock-throw', 'tackle'] };
    const s = start(withFields(scenario({ kind: 'boss', team: [{ species: 'onix', level: 12, moves: ['rock-throw', 'tackle', 'harden', 'bind'] }], enemies: [geo] }), { home: 'rock' }));
    const rock = ctx.content.move('rock-throw');
    expect(breakdownFor(s.enemies[0]!, s.player.team[0]!, rock, false, ctx, s).fieldMultiplier).toBe(ctx.config.homeFieldBoost);
    // The player's Rock move on the enemy's turf gets nothing.
    expect(breakdownFor(s.player.team[0]!, s.enemies[0]!, rock, false, ctx, s).fieldMultiplier).toBeUndefined();
  });

  it('CloudNine_Leading_SuppressesEveryField', () => {
    const psyduck = { species: 'psyduck', level: 12, abilityId: 'cloud-nine' };
    const s = start(withFields(scenario({ team: [psyduck, CHARMANDER], enemies: [RATTATA] }), { weather: 'sunny-day' }));
    expect(fieldsSuppressed(s, ctx.content)).toBe(true);
    expect(breakdownFor(s.player.team[1]!, s.enemies[0]!, ctx.content.move('ember'), false, ctx, s).fieldMultiplier).toBeUndefined();
  });

  it('SwiftSwim_UnderRain_DrawsOneMoreOnTurnOne', () => {
    const s = start(withFields(scenario({ team: [{ species: 'psyduck', level: 12, abilityId: 'swift-swim' }], enemies: [RATTATA] }), { weather: 'rain-dance' }));
    expect(fieldDrawBonus({ ...s, turn: 1 }, ctx.content)).toBe(1);
    expect(fieldDrawBonus({ ...s, turn: 2 }, ctx.content)).toBe(0);
  });

  it('Defog_ClearsEveryField_AndTheForecastFollows', () => {
    const geo: EnemySetup = { species: 'geodude', level: 12, tier: 'boss', phaseCount: 1, moves: ['rock-throw', 'tackle'] };
    let s = start(withFields(scenario({ kind: 'boss', team: [CHARMANDER], enemies: [geo], consumables: ['defog'] }), { home: 'rock', hazard: 'sandstorm' }));
    s = withConsumableHand(tweak(s, (d) => { d.player.ap = 3; }), ['defog']);
    const before = forecastTurn(s, ctx);
    const after = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'defog').id });
    expect(after.fields).toEqual({});
    const hitBefore = before.incoming['p0']?.[0]?.amount ?? 0;
    const hitAfter = forecastTurn(after, ctx).incoming['p0']?.[0]?.amount ?? 0;
    if (s.enemies[0]!.intent?.moveId === 'rock-throw') expect(hitAfter).toBeLessThan(hitBefore);
  });

  // §4.3.8–§4.3.13 — the six fields v0.8.7 added, so every Gym has ground of its own (§4.3.14).
  const quiet = (d: { enemies: { intent: unknown }[] }) => {
    for (const e of d.enemies) e.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false };
  };

  it('Hail_ChipsAllButTheIceTypes', () => {
    const s = tweak(start(withFields(scenario({ team: [CHARMANDER, { species: 'dewgong', level: 22 }], enemies: [RATTATA] }), { weather: 'hail' })), quiet);
    const after = dispatch(s, { type: 'end-turn' });
    const hit = eventsOf(after, 'damage').filter((e) => e.t === 'damage' && e.cause === 'hail').map((e) => (e.t === 'damage' ? e.targetUid : ''));
    expect(hit).toContain('p0');
    expect(hit).toContain('e0');
    expect(hit).not.toContain('p1');
  });

  it('GrassyTerrain_LiftsGrassFromTheGround_AndMendsTheGrounded', () => {
    const bulba = { species: 'bulbasaur', level: 12, moves: ['vine-whip', 'tackle', 'growl', 'leech-seed'] };
    let s = start(withFields(scenario({ team: [bulba], enemies: [RATTATA] }), { terrain: 'grassy-terrain' }));
    expect(breakdownFor(s.player.team[0]!, s.enemies[0]!, ctx.content.move('vine-whip'), false, ctx, s).fieldMultiplier).toBe(ctx.config.typeTerrainBoost);
    s = tweak(s, (d) => {
      quiet(d);
      d.player.team[0]!.hp = 5;
    });
    const after = dispatch(s, { type: 'end-turn' });
    expect(after.player.team[0]!.hp).toBe(5 + Math.max(1, Math.floor(s.player.team[0]!.maxHp * ctx.config.grassyHealPercent)));
  });

  it('PsychicTerrain_LiftsPsychic_AndGuardsTheGroundedFromSleep', () => {
    const abra = { species: 'drowzee', level: 12, moves: ['confusion', 'hypnosis', 'pound', 'disable'] };
    let s = start(withFields(scenario({ team: [abra], enemies: [RATTATA] }), { terrain: 'psychic-terrain' }));
    expect(breakdownFor(s.player.team[0]!, s.enemies[0]!, ctx.content.move('confusion'), false, ctx, s).fieldMultiplier).toBe(ctx.config.typeTerrainBoost);
    s = withHand(tweak(s, (d) => { d.player.ap = 3; }), ['hypnosis']);
    const after = dispatch(s, { type: 'play-card', cardId: handCard(s, 'hypnosis').id });
    expect(after.enemies[0]!.status).toBeNull();
  });

  it('MistyTerrain_GuardsTheGroundedFromEveryStatus', () => {
    const ekans = { species: 'ekans', level: 12, moves: ['glare', 'wrap', 'leer', 'poison-sting'] };
    let s = start(withFields(scenario({ team: [ekans], enemies: [RATTATA] }), { terrain: 'misty-terrain' }));
    s = withHand(tweak(s, (d) => { d.player.ap = 3; }), ['glare']);
    const after = dispatch(s, { type: 'play-card', cardId: handCard(s, 'glare').id });
    expect(after.enemies[0]!.status).toBeNull();
  });

  it('ToxicSpikes_PoisonWhoeverStepsIntoTheLead_ButNotTheOpeningLead', () => {
    let s = start(withFields(scenario({ team: [CHARMANDER, SQUIRTLE], enemies: [RATTATA] }), { hazard: 'toxic-spikes' }));
    expect(s.player.team[0]!.status).toBeNull();
    s = tweak(s, (d) => { d.player.ap = 3; });
    const after = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(after.player.team[1]!.status?.kind).toBe('poison');
  });

  it('StickyWeb_TakesASpeedStageFromWhoeverStepsIntoTheLead', () => {
    let s = start(withFields(scenario({ team: [CHARMANDER, SQUIRTLE], enemies: [RATTATA] }), { hazard: 'sticky-web' }));
    s = tweak(s, (d) => { d.player.ap = 3; });
    const after = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(after.player.team[1]!.stages.speed).toBe(-ctx.config.stickyWebStages);
  });
});
