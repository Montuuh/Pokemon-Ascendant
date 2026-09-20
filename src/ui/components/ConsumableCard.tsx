import { IconAlertTriangle } from '@tabler/icons-react';
import type { ConsumablePlayability } from '@/sim';
import { itemIcon } from '@/ui/art';
import { REJECT_TEXT } from '@/ui/strings';
import styles from './ConsumableCard.module.css';

interface Props {
  play: ConsumablePlayability;
  selected: boolean;
  onClick: () => void;
}

// Per docs/design/ui/09 — consumable cards are pill-soft and share the move-card grammar (AP dots left, label right).
export function ConsumableCard({ play, selected, onClick }: Props) {
  const { def } = play;
  const state = play.playable ? 'playable' : play.reason === 'not-enough-ap' ? 'no-ap' : 'locked';
  const label =
    def.effect.kind === 'heal-flat'
      ? `+${def.effect.amount}`
      : def.effect.kind === 'ap'
        ? `+${def.effect.amount} AP`
        : def.effect.kind === 'catch'
          ? 'catch'
          : def.effect.kind === 'stage'
            ? `+${def.effect.stages} ${def.effect.stat === 'attack' ? 'Atk' : 'Def'}`
            : 'cure';
  return (
    <button
      type="button"
      className={[styles.card, state === 'playable' ? '' : styles.dim, selected ? styles.selected : ''].join(' ')}
      onClick={onClick}
      data-testid={`consumable-${def.id}`}
      data-card-id={play.cardId}
      data-state={state}
      aria-pressed={selected}
      title={`${def.name} — ${def.description}${play.reason ? ` · ${REJECT_TEXT[play.reason]}` : ''}`}
    >
      <span className={styles.iconWrap}>
        <img className={`${styles.icon} pixel`} src={itemIcon(def.id)} alt="" width={40} height={40} />
      </span>
      <span className={`${styles.name} display`}>{def.name}</span>
      <span className={styles.footer}>
        <span className={styles.dots}>
          {state === 'no-ap' && <IconAlertTriangle size={12} className={styles.warn} />}
          {def.apCost === 0 ? <small>free</small> : Array.from({ length: def.apCost }, (_, i) => <span key={i} className={styles.dot} />)}
        </span>
        <span className="display">{label}</span>
      </span>
    </button>
  );
}
