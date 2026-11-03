import type { ContentRegistry, MoveDef } from '../content/defs';
import { disrupts } from './disruption';
import { autoPickMoves } from './kit';
import { knownMoves } from './stats';

// §5.2.2 — an enemy's kit by roles, not by power (v0.9.92). A wild Pokémon keeps the Auto pick of four; a trainer's
// carries five and the climaxes six, each extra slot a role its kit lacked — a heavy hit, a set-up, a disruption, a
// defence — taken from its archetype's repertoire first, then from what it knows at its level.

export type KitRole = 'attack' | 'heavy' | 'setup' | 'disrupt' | 'defence';

const DEFENCE = new Set(['protect', 'endure', 'guard', 'substitute', 'counter', 'side-condition', 'heal', 'wish']);

/** §5.2.2 — the role a move fills in an enemy's kit. */
export function kitRole(move: MoveDef): KitRole {
  if (move.power > 0) return move.apCost >= 3 ? 'heavy' : 'attack';
  if (move.effects.some((e) => e.kind === 'helping-hand')) return 'setup';
  if (disrupts(move) || move.effects.some((e) => (e.kind === 'status' && !e.self) || (e.kind === 'stage' && (e.target === 'foe' || e.target === 'foe-side')))) return 'disrupt';
  if (move.effects.some((e) => DEFENCE.has(e.kind))) return 'defence';
  return 'setup';
}

/** §5.2.2 — the roles a kit of this size makes room for, in the order they are filled. */
const ROLES_BY_SIZE: Record<number, KitRole[]> = { 5: ['heavy', 'setup', 'disrupt'], 6: ['heavy', 'setup', 'disrupt', 'defence'] };

/**
 * §5.2.2 — an enemy's kit of `size`: `authored` moves as written (a Gym's scripted kit), else the Auto pick of four; then
 * each role the template names that the kit lacks, from `repertoire` first and from the Pokémon's own moves (newest
 * first) after; then whatever is left of the repertoire and the moves it knows, until the kit is full. `required` (a
 * combo's two moves, §5.5.2) always make it in, right after the scripted or picked four.
 */
export function enemyKit(content: ContentRegistry, speciesId: string, level: number, size: number, repertoire: readonly string[] = [], authored?: readonly string[], required: readonly string[] = []): string[] {
  const species = content.species(speciesId);
  const pool = knownMoves(content, speciesId, level);
  const kit = authored ? [...authored] : autoPickMoves(pool, content, Math.min(4, size), species.types);
  for (const id of required) if (!kit.includes(id) && content.hasMove(id)) kit.push(id);
  if (kit.length >= size) return kit;
  const taught = repertoire.filter((id) => content.hasMove(id));
  const newest = [...pool].reverse();
  const roleOf = (id: string) => kitRole(content.move(id));
  for (const role of ROLES_BY_SIZE[size] ?? []) {
    if (kit.length >= size) break;
    if (kit.some((id) => roleOf(id) === role)) continue;
    const pick = [...taught, ...newest].find((id) => !kit.includes(id) && roleOf(id) === role);
    if (pick) kit.push(pick);
  }
  for (const id of [...taught, ...newest]) {
    if (kit.length >= size) break;
    if (!kit.includes(id)) kit.push(id);
  }
  return kit;
}
