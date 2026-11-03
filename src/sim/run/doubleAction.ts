import type { ScenarioDef } from '../content/defs';
import { leagueMemberOf } from './league';
import { ALL_TRAINERS } from './region';
import type { MapNode, RunState } from './types';

// §5.6.1 / §5.6.3 — who acts twice (v0.9.12; v0.9.92, the user's call: "que sea más frecuente los dobles ataques").
// Acting twice is placed, never a species' stat: the Elite Wild in every Region (its shape, `groups.ts`); a Rare wild
// from Region 1's eighth column; a trainer's ace — an Ace Trainer's from Region 1, everyone's from Region 2; the Elite
// Trainer's Lead, and from Region 2 both its Pokémon; the Gym Leader's ace always, and from Region 2 its first too; the
// Gauntlet's ace, each Elite Four's ace and the Champion's last two. At most two in a fight.

/** §5.6.1 — who in a fight acts twice: its first, its last, both, its last two, or a wild Rare. */
export type DoubleActor = 'lead' | 'ace' | 'lead-and-ace' | 'last-two' | 'rare';

export interface DoubleActionRules {
  /** §2.6.2 — a wild Pokémon rolled Rare acts twice from this column on (null: never). */
  rareWildFrom: number | null;
  /** §2.7.1 — whose trainers' aces act twice: the Ace Trainer archetype's, or every trainer's. */
  trainerAce: 'ace-trainer' | 'all';
  /** §2.8.2 — the Gym Leader's: its ace, or its first and its ace. */
  gym: 'ace' | 'lead-and-ace';
  /** §2.8.1 — the Elite Trainer's: its Lead, or both its Pokémon. */
  elite: 'lead' | 'lead-and-ace';
}

/** Per Region, which fights field a Pokémon that acts twice. Tuned by the run harness (§2.2.1). */
export const DOUBLE_ACTION: readonly DoubleActionRules[] = [
  { rareWildFrom: 8, trainerAce: 'ace-trainer', gym: 'ace', elite: 'lead' },
  { rareWildFrom: 0, trainerAce: 'all', gym: 'lead-and-ace', elite: 'lead-and-ace' },
  { rareWildFrom: 0, trainerAce: 'all', gym: 'lead-and-ace', elite: 'lead-and-ace' },
];

const rulesFor = (run: RunState): DoubleActionRules => DOUBLE_ACTION[Math.min(run.regionIndex, DOUBLE_ACTION.length - 1)]!;

/**
 * §5.6.1 — who in this node's fight acts twice, as the map can promise it, or nobody. A Rare is decided only when the
 * wild roll is made, on entry; the Elite Wild's is its group shape.
 */
export function doubleActorFor(node: MapNode, run: RunState): DoubleActor | null {
  const r = rulesFor(run);
  switch (node.kind) {
    case 'wild':
      return r.rareWildFrom !== null && node.layer >= r.rareWildFrom && node.preview.wild ? 'rare' : null;
    case 'trainer': {
      const roster = ALL_TRAINERS.find((t) => t.id === node.preview.rosterId);
      return r.trainerAce === 'all' || roster?.archetype === 'ace-trainer' ? 'ace' : null;
    }
    case 'gym':
      return r.gym;
    case 'elite':
      return r.elite;
    case 'gauntlet':
      return 'ace';
    case 'league':
      return leagueMemberOf(node)?.id === 'champion' ? 'last-two' : 'ace';
    default:
      return null;
  }
}

/** §5.6.1 — the places in a team of `size` that `who` names. */
export function doubleActorIndices(who: DoubleActor, size: number): number[] {
  const last = size - 1;
  switch (who) {
    case 'lead':
    case 'rare':
      return [0];
    case 'ace':
      return [last];
    case 'lead-and-ace':
      return [...new Set([0, last])];
    case 'last-two':
      return [...new Set([Math.max(0, last - 1), last])];
  }
}

/** §5.6.1 — mark this fight's Pokémon that act twice. A fight that already has one (the Elite Wild) is left alone. */
export function applyDoubleAction(scenario: ScenarioDef, node: MapNode, run: RunState): ScenarioDef {
  if (scenario.enemies.some((e) => e.acts === 2)) return scenario;
  const who = doubleActorFor(node, run);
  if (!who || (who === 'rare' && scenario.wildTier !== 'rare')) return scenario;
  const marked = new Set(doubleActorIndices(who, scenario.enemies.length));
  return { ...scenario, enemies: scenario.enemies.map((e, i) => (marked.has(i) ? { ...e, acts: 2 as const } : e)) };
}
