import { rhythmEvery, rhythmReady, type BattleConfig, type Combatant } from '@/sim';
import { Tip, Tipped } from '@/ui/tooltip';
import { UNIT_CHIPS_TEXT } from '@/ui/strings';
import type { UnitChip } from './UnitChips';
import card from './UnitCard.module.css';

/**
 * §4.1.3.1 — the critical rhythm, on every card at all times: how full its meter is, and what fills it. Full, it turns
 * the warning colour — the next hit is a critical.
 */
export function rhythmChip(c: Combatant, config: BattleConfig, enemy: boolean): UnitChip {
  const every = rhythmEvery(c, config);
  const label = UNIT_CHIPS_TEXT.rhythm(c.rhythm, every);
  const explain = UNIT_CHIPS_TEXT.rhythmBody(every, enemy);
  return {
    key: 'rhythm',
    label,
    explain,
    node: (
      <Tipped tip={<Tip title={UNIT_CHIPS_TEXT.rhythmTitle} body={explain.charAt(0).toUpperCase() + explain.slice(1)} />} className={`${card.chip} ${rhythmReady(c, config) ? card.warn : card.info}`} data-testid="unit-rhythm">
        {label}
      </Tipped>
    ),
  };
}
