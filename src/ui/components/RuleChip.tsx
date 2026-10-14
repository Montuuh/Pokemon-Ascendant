import { IconGavel } from '@tabler/icons-react';
import { ruleCounter, type BattleConfig, type CombatState, type GymRuleId } from '@/sim';
import { GYM_RULE_LABEL, ruleCountText } from '@/ui/strings';
import { gymRuleTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './RuleChip.module.css';

interface Props {
  rule: GymRuleId;
  /** In a fight the chip keeps the rule's count (*Riptide · tide next turn*, *Rollout · ×1.50*); on a preview, none. */
  live?: { state: CombatState; config: BattleConfig };
  /** Smaller, for the Gym's preview card. */
  compact?: boolean;
}

// §5.9.5 — the Leader's rule as a chip: on the fight's top bar with its count, and on the Gym's preview card without
// one. The whole rule is one hover away, in the same words everywhere.
export function RuleChip({ rule, live, compact = false }: Props) {
  const count = live ? ruleCountText(rule, ruleCounter(live.state, live.config)) : null;
  return (
    <Tipped tip={gymRuleTip(rule)} className={[styles.chip, compact ? styles.compact : ''].join(' ')} data-testid="rule-chip" data-rule={rule}>
      <IconGavel size={compact ? 14 : 16} aria-hidden="true" />
      {GYM_RULE_LABEL[rule]}
      {count && <span className={`${styles.count} tabular`} data-testid="rule-count">{count}</span>}
    </Tipped>
  );
}
