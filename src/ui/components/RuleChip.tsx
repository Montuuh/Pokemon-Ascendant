import { IconGavel } from '@tabler/icons-react';
import { ARENA_RULE_IDS, arenaCounter, ruleCounter, type ArenaRuleId, type BattleConfig, type CombatState, type GymRuleId } from '@/sim';
import { ARENA_RULE_LABEL, arenaCountText, GYM_RULE_LABEL, ruleCountText } from '@/ui/strings';
import { arenaRuleTip, gymRuleTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './RuleChip.module.css';

interface Props {
  rule: GymRuleId | ArenaRuleId;
  /** In a fight the chip keeps the rule's count (*Riptide · tide next turn*, *Barrier · up this turn*); on a preview, none. */
  live?: { state: CombatState; config: BattleConfig };
  /** Smaller, for a preview card. */
  compact?: boolean;
}

const isArena = (rule: string): rule is ArenaRuleId => (ARENA_RULE_IDS as readonly string[]).includes(rule);

// §5.9.5 — the Leader's rule as a chip, and §2.12.2.1 a Legendary's arena rule the same way: on the fight's top bar
// with its count, and on the preview card without one. The whole rule is one hover away, in the same words everywhere.
export function RuleChip({ rule, live, compact = false }: Props) {
  const arena = isArena(rule);
  const count = !live ? null : arena ? arenaCountText(rule, arenaCounter(live.state, live.config), live.config.arenaRules) : ruleCountText(rule, ruleCounter(live.state, live.config));
  return (
    <Tipped tip={arena ? arenaRuleTip(rule) : gymRuleTip(rule)} className={[styles.chip, compact ? styles.compact : ''].join(' ')} data-testid="rule-chip" data-rule={rule}>
      <IconGavel size={compact ? 14 : 16} aria-hidden="true" />
      {arena ? ARENA_RULE_LABEL[rule] : GYM_RULE_LABEL[rule]}
      {count && <span className={`${styles.count} tabular`} data-testid="rule-count">{count}</span>}
    </Tipped>
  );
}
