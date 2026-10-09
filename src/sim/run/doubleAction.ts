import type { ScenarioDef } from '../content/defs';
import { ALL_TRAINERS } from './region';
import type { MapNode, RunState } from './types';

// §5.6.1 / §5.6.3 — who acts twice (v0.9.12, the user's call: Pokémon and trainers with a double intent). Acting
// twice is placed, never a species' stat: the Elite Wild in every Region (its shape, `groups.ts`), and from Region 2
// a Rare wild Pokémon, an Ace Trainer's Lead and a Gym Leader's ace; in Region 3 the Elite's Lead too. One Pokémon
// at most acts twice in a fight, so a turn never shows more than one double intent to read.

export interface DoubleActionRules {
  /** §2.6.2 — a wild Pokémon rolled Rare: the banner's promise of a harder fight. */
  rareWild: boolean;
  /** §2.7.1 — the Ace Trainer archetype's Lead. */
  aceTrainer: boolean;
  /** §2.8.2 — the Gym Leader's last Pokémon, its ace. */
  gymAce: boolean;
  /** §2.8.1 — the Elite Trainer's Lead. */
  eliteLead: boolean;
}

/** Per Region, which fights field a Pokémon that acts twice. Tuned by the run harness (§2.2.1). */
export const DOUBLE_ACTION: readonly DoubleActionRules[] = [
  { rareWild: false, aceTrainer: false, gymAce: false, eliteLead: false },
  { rareWild: true, aceTrainer: true, gymAce: true, eliteLead: false },
  { rareWild: true, aceTrainer: true, gymAce: true, eliteLead: true },
];

const rulesFor = (run: RunState): DoubleActionRules => DOUBLE_ACTION[Math.min(run.regionIndex, DOUBLE_ACTION.length - 1)]!;

/**
 * §5.6.1 — who in this node's fight acts twice, as the map can promise it: the Lead, the ace (the last of the team),
 * a Rare (decided only when the wild roll is made, on entry), or nobody. The Elite Wild's is its group shape.
 */
export function doubleActorFor(node: MapNode, run: RunState): 'lead' | 'ace' | 'rare' | null {
  const r = rulesFor(run);
  switch (node.kind) {
    case 'wild':
      return r.rareWild && node.preview.wild ? 'rare' : null;
    case 'trainer': {
      const roster = ALL_TRAINERS.find((t) => t.id === node.preview.rosterId);
      return r.aceTrainer && roster?.archetype === 'ace-trainer' ? 'lead' : null;
    }
    case 'gym':
      return r.gymAce ? 'ace' : null;
    case 'elite':
      return r.eliteLead ? 'lead' : null;
    default:
      return null;
  }
}

/** §5.6.1 — mark this fight's Pokémon that acts twice. A fight that already has one (the Elite Wild) is left alone. */
export function applyDoubleAction(scenario: ScenarioDef, node: MapNode, run: RunState): ScenarioDef {
  if (scenario.enemies.some((e) => e.acts === 2)) return scenario;
  const who = doubleActorFor(node, run);
  if (!who || (who === 'rare' && scenario.wildTier !== 'rare')) return scenario;
  const index = who === 'ace' ? scenario.enemies.length - 1 : 0;
  return { ...scenario, enemies: scenario.enemies.map((e, i) => (i === index ? { ...e, acts: 2 as const } : e)) };
}
