import { IconMist, IconShield, IconShieldCheck, IconShieldStar, IconStar } from '@tabler/icons-react';
import { SLOT_LABEL, type SideCondition, type SlotId } from '@/sim';
import { SIDE_CHIP_TEXT, SIDE_NAME } from '@/ui/strings';
import { sideConditionLine, sideConditionTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './SideChips.module.css';

// §3.11.6 / §3.11.13 — a side's conditions by that side of the field, never on the top line: whose they are is where they
// stand (yours over your formation, the foe's over its own), so the chip needs no word for it. An icon and the turns left;
// the name, the rule and the clock in its bubble. Past two, the rest fold into "+N".

const ICON: Record<SideCondition['id'], typeof IconShield> = {
  reflect: IconShield,
  'light-screen': IconShieldStar,
  safeguard: IconShieldCheck,
  mist: IconMist,
  wish: IconStar,
};

interface Props {
  side: 'player' | 'enemy';
  sides: readonly SideCondition[] | undefined;
}

export function SideChips({ side, sides }: Props) {
  const mine = (sides ?? []).filter((s) => s.side === side);
  if (!mine.length) return null;
  const shown = mine.length > 2 ? mine.slice(0, 1) : mine;
  const rest = mine.length > 2 ? mine.slice(1) : [];
  const placeOf = (s: SideCondition) => (s.id !== 'wish' ? null : side === 'player' ? `your ${SLOT_LABEL[s.place as SlotId]}` : 'its place');
  const nameOf = (s: SideCondition) => (s.id === 'wish' ? SIDE_CHIP_TEXT.wishName : SIDE_NAME[s.id].name);
  return (
    <div className={[styles.row, side === 'player' ? styles.yours : styles.theirs].join(' ')} data-testid={`sides-${side}`}>
      {shown.map((s) => {
        const Icon = ICON[s.id];
        return (
          <Tipped key={s.id} tip={sideConditionTip(s, placeOf(s))} className={styles.chip} data-testid={`side-${side}-${s.id}`} aria-label={`${nameOf(s)} ${s.turnsLeft}`}>
            <Icon size={14} stroke={2.2} aria-hidden="true" />
            <span className="tabular">{s.turnsLeft}</span>
          </Tipped>
        );
      })}
      {rest.length > 0 && (
        <Tipped tip={<Tip title={SIDE_CHIP_TEXT.moreTitle(rest.length)} body={rest.map((s) => <div key={s.id}><b>{nameOf(s)}</b> — {sideConditionLine(s, placeOf(s))}</div>)} />} className={`${styles.chip} tabular`} data-testid={`sides-${side}-more`}>
          {SIDE_CHIP_TEXT.more(rest.length)}
        </Tipped>
      )}
    </div>
  );
}
