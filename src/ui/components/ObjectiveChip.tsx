import { IconHourglassHigh, IconRun } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { objectiveTurnsLeft, type CombatState, type NodeObjective } from '@/sim';
import { OBJECTIVE_TEXT } from '@/ui/strings';
import { objectiveMeta, objectiveTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './ObjectiveChip.module.css';

interface Props {
  kind: 'flee' | 'hold';
  turns: number;
  /** In a fight the chip counts down (*Flees in 2*, *Hold out · last turn*); on a preview it says the turns. */
  live?: CombatState;
  compact?: boolean;
  /** On a card, where the catch pill shares the row: the icon and the number, the words a hover away. */
  terse?: boolean;
  /** The node's objective, for what it pays (a preview); in a fight it is read off the run's node. */
  objective?: NodeObjective;
}

// §5.6.5 — a fight's other objective as a chip: the runner's countdown on its card, the hold-out's on the top bar, and
// either on the node's preview. The whole race is one hover away, in the same words everywhere.
export function ObjectiveChip({ kind, turns, live, compact = false, terse = false, objective }: Props) {
  const left = live ? (objectiveTurnsLeft(live) ?? turns) : turns;
  const Icon = kind === 'flee' ? IconRun : IconHourglassHigh;
  const count = OBJECTIVE_TEXT.count(left);
  // In a run, the fight's node says what the race pays; a fixture has no node and says nothing more.
  const fromRun = useRunStore((s) => (live && s.run?.pendingNodeId ? s.run.map.nodes[s.run.pendingNodeId]?.preview.objective : undefined));
  return (
    <Tipped
      tip={objectiveTip(kind, turns, objectiveMeta(objective ?? fromRun))}
      className={[styles.chip, compact ? styles.compact : '', left <= 1 ? styles.urgent : ''].join(' ')}
      data-testid="objective-chip"
      data-kind={kind}
      data-left={left}
      aria-label={`${kind === 'flee' ? OBJECTIVE_TEXT.fleeLabel : OBJECTIVE_TEXT.holdLabel} ${count}`}
    >
      <Icon size={compact ? 14 : 16} aria-hidden="true" />
      {!terse && (kind === 'flee' ? OBJECTIVE_TEXT.fleeLabel : OBJECTIVE_TEXT.holdLabel)}
      <span className={`${terse ? '' : styles.count} tabular`}>{terse ? left : count}</span>
    </Tipped>
  );
}
