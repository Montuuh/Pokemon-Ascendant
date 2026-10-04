import type { ContentRegistry, MoveDef } from '../content/defs';
import type { PokemonType, StatusCondition } from '../types';
import type { BattleConfig } from './battleConfig';
import type { Combatant, CombatState } from './state';

// §4.3 — field effects. One engine, two classes: a neutral **Battlefield** (Weather, Terrain, Hazard — symmetric,
// set by where the fight is, §2.6.1) and an enemy-owned **Home Field** (a Gym Leader's or an Elite's own type,
// §4.3.5). Weather and Terrain are independent categories; one of each may stand at once (§4.3.7).

export type FieldId =
  | 'sunny-day' | 'rain-dance' | 'hail'
  | 'electric-terrain' | 'grassy-terrain' | 'psychic-terrain' | 'misty-terrain'
  | 'sandstorm' | 'toxic-spikes' | 'sticky-web';
export type FieldCategory = 'weather' | 'terrain' | 'hazard';

export const FIELD_CATEGORY: Record<FieldId, FieldCategory> = {
  'sunny-day': 'weather',
  'rain-dance': 'weather',
  hail: 'weather',
  'electric-terrain': 'terrain',
  'grassy-terrain': 'terrain',
  'psychic-terrain': 'terrain',
  'misty-terrain': 'terrain',
  sandstorm: 'hazard',
  'toxic-spikes': 'hazard',
  'sticky-web': 'hazard',
};

/** §4.3 — the fields standing in a fight: at most one per category, and an enemy's Home Field by type. */
export interface FieldState {
  weather?: FieldId;
  terrain?: FieldId;
  hazard?: FieldId;
  /** §4.3.5 — the Gym Leader's or Elite's own type: its moves of that type hit harder. */
  home?: PokemonType;
}

/** §4.3 — every Battlefield standing (Weather, Terrain, Hazard), in that order. */
export function battlefields(fields: FieldState): FieldId[] {
  return [fields.weather, fields.terrain, fields.hazard].filter((f): f is FieldId => !!f);
}

/** §4.3.7 — set a Battlefield: it takes its category's place, overwriting what stood there. */
export function withField(fields: FieldState, id: FieldId): FieldState {
  return { ...fields, [FIELD_CATEGORY[id]]: id };
}

const hasAbilityHook = (c: Combatant, hook: string, content: ContentRegistry) =>
  c.hp > 0 && c.abilityIds.some((id) => content.ability(id).hook === hook);

/**
 * §6.5 Cloud Nine — every field is suppressed while a Cloud Nine Pokémon leads, on either side. Suppressed, not
 * cleared: the badge stays up and the field returns the moment it steps out of the Lead.
 */
export function fieldsSuppressed(state: CombatState, content: ContentRegistry): boolean {
  const lead = state.player.team[state.player.leadIndex];
  const enemyLead = state.enemies.find((e) => e.hp > 0);
  return (!!lead && hasAbilityHook(lead, 'field-suppress', content)) || (!!enemyLead && hasAbilityHook(enemyLead, 'field-suppress', content));
}

/** §4.3.3 — grounded is every Pokémon but a Flying-type or a Levitate holder. */
export function isGrounded(c: Combatant, content: ContentRegistry): boolean {
  return !c.types.includes('flying') && !c.abilityIds.some((id) => content.ability(id).hook === 'levitate');
}

const isEnemy = (state: CombatState, c: Combatant) => state.enemies.some((e) => e.uid === c.uid) || state.enemyQueue.some((e) => e.uid === c.uid);

/**
 * §4.3.1–§4.3.3, §4.3.5 — the field's term in the damage formula, one more independent multiplier (§7.3.6). Sun
 * and Rain move Fire and Water; Electric Terrain lifts Electric into a grounded target; a Home Field lifts only the
 * enemy's own type. Cloud Nine turns every one of them off.
 */
export function fieldDamageMultiplier(state: CombatState, attacker: Combatant, target: Combatant, move: MoveDef, ctx: { content: ContentRegistry; config: BattleConfig }): number {
  const f = state.fields;
  if (!f || fieldsSuppressed(state, ctx.content)) return 1;
  const cfg = ctx.config;
  let m = 1;
  if (f.weather === 'sunny-day') m *= move.type === 'fire' ? cfg.weatherBoost : move.type === 'water' ? cfg.weatherDamp : 1;
  if (f.weather === 'rain-dance') m *= move.type === 'water' ? cfg.weatherBoost : move.type === 'fire' ? cfg.weatherDamp : 1;
  if (f.terrain === 'electric-terrain' && move.type === 'electric' && isGrounded(target, ctx.content)) m *= cfg.electricTerrainBoost;
  // §4.3.9 / §4.3.10 — Grassy and Psychic Terrain lift their type from a grounded attacker: the ground is its own.
  if (f.terrain === 'grassy-terrain' && move.type === 'grass' && isGrounded(attacker, ctx.content)) m *= cfg.typeTerrainBoost;
  if (f.terrain === 'psychic-terrain' && move.type === 'psychic' && isGrounded(attacker, ctx.content)) m *= cfg.typeTerrainBoost;
  if (f.home && move.type === f.home && isEnemy(state, attacker)) m *= cfg.homeFieldBoost;
  return m;
}

/**
 * §4.3.3, §4.3.10, §4.3.11 — the terrains that guard the ground: Electric Terrain stops Paralysis, Psychic Terrain
 * stops Sleep, Misty Terrain stops every status. Only for a grounded Pokémon, on both sides.
 */
export function fieldBlocksStatus(state: CombatState, target: Combatant, status: StatusCondition, content: ContentRegistry): boolean {
  const t = state.fields?.terrain;
  if (!t || fieldsSuppressed(state, content) || !isGrounded(target, content)) return false;
  return (t === 'electric-terrain' && status === 'paralysis') || (t === 'psychic-terrain' && status === 'sleep') || t === 'misty-terrain';
}

/** §4.3.8 — who Hail spares: the Ice-types. */
export const hailImmune = (c: Combatant): boolean => c.types.includes('ice');

/** §4.3.12 — who Toxic Spikes spare: Poison- and Steel-types, and anything not on the ground. */
export const toxicSpikesSpare = (c: Combatant, content: ContentRegistry): boolean => c.types.includes('poison') || !isGrounded(c, content);

/** §4.3.4 — who a Sandstorm spares: Rock-, Ground- and Fighting-types. */
export function sandstormImmune(c: Combatant): boolean {
  return c.types.some((t) => t === 'rock' || t === 'ground' || t === 'fighting');
}

/**
 * §6.5 Swift Swim, Chlorophyll — extra cards on turn 1 of a fight under their weather, one per Active Pokémon that
 * holds one (the ability's `cards`). Nothing under Cloud Nine, which leads from turn 1 like everything else.
 */
export function fieldDrawBonus(state: CombatState, content: ContentRegistry): number {
  if (state.turn !== 1 || !state.fields || fieldsSuppressed(state, content)) return 0;
  const standing = battlefields(state.fields);
  let n = 0;
  for (const c of state.player.team) {
    if (c.hp <= 0) continue;
    for (const id of c.abilityIds) {
      const a = content.ability(id);
      if (a.hook === 'field-draw' && standing.includes(String(a.params?.field) as FieldId)) n += Number(a.params?.cards ?? 1);
    }
  }
  return n;
}
