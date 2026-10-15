import { IconAlertTriangle, IconLock } from '@tabler/icons-react';
import type { ConsumablePlayability } from '@/sim';
import { itemIcon } from '@/ui/art';
import { REJECT_TEXT } from '@/ui/strings';
import { consumableTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './ConsumableCard.module.css';

interface Props {
  play: ConsumablePlayability;
  selected: boolean;
  onClick: () => void;
  /** §3.5 — how many of this item the bag holds (v0.8.6: one card per kind in the bag). */
  count?: number;
}

/** What an item does, as the colour of its frame: a ball red, medicine green, a battle item blue. */
const FRAME: Record<string, string> = {
  catch: 'var(--brand-red)',
  'heal-flat': 'var(--accent-positive)',
  'heal-percent': 'var(--accent-positive)',
  revive: 'var(--accent-positive)',
  cure: 'var(--accent-positive)',
  ap: 'var(--brand-blue)',
  stage: 'var(--brand-blue)',
  'clear-fields': 'var(--type-psychic)',
};

const STAT_NAME = { attack: 'Attack', defense: 'Defense', speed: 'Speed' } as const;

/** The plate: what the item does, in two words. Every effect kind has its own. */
function effectLabel(effect: ConsumablePlayability['def']['effect']): string {
  switch (effect.kind) {
    case 'heal-flat':
      return `+${effect.amount} HP`;
    case 'heal-percent':
      return `+${effect.percent}% HP`;
    case 'revive':
      return `Revive ${effect.percent}%`;
    case 'ap':
      return `+${effect.amount} AP`;
    case 'catch':
      return 'Catch';
    case 'clear-fields':
      return 'Clear fields';
    case 'stage':
      return `${effect.stages > 0 ? '+' : ''}${effect.stages} ${STAT_NAME[effect.stat]}`;
    case 'cure':
      return effect.status === 'all' ? 'Cure all' : 'Cure';
  }
}

// §9.2.3 — an item card in the move card's grammar, smaller and softer: the cost gem and the name on a
// dark head, the item itself on a lit window, what it does on the plate. The frame says what kind of item it is.
export function ConsumableCard({ play, selected, onClick, count = 1 }: Props) {
  const { def } = play;
  const tip = useTip(consumableTip(def, play.playable, play.reason ? REJECT_TEXT[play.reason] : null));
  const state = play.playable ? 'playable' : play.reason === 'not-enough-ap' ? 'no-ap' : 'locked';
  const label = effectLabel(def.effect);
  return (
    <button
      type="button"
      className={[styles.card, state === 'playable' ? '' : styles.dim, selected ? styles.selected : ''].join(' ')}
      style={{ ['--item-frame' as string]: FRAME[def.effect.kind] ?? 'var(--border-strong)' }}
      onClick={onClick}
      data-testid={`consumable-${def.id}`}
      data-card-id={play.cardId}
      data-state={state}
      aria-pressed={selected}
      {...tip}
    >
      <span className={styles.head}>
        <span className={`${styles.cost} display tabular`}>{def.apCost}</span>
        <span className={`${styles.name} display`}>{def.name}</span>
      </span>
      <span className={styles.window}>
        <img className={styles.icon} src={itemIcon(def.id)} alt="" width={56} height={56} draggable={false} />
        {count > 1 && <span className={`${styles.count} display tabular`}>×{count}</span>}
        {state !== 'playable' && (
          <span className={styles.lockMark} aria-label={state === 'no-ap' ? 'Not enough AP' : 'Not now'}>
            {state === 'no-ap' ? <IconAlertTriangle size={14} /> : <IconLock size={14} />}
          </span>
        )}
      </span>
      <span className={`${styles.plate} display`}>{label}</span>
    </button>
  );
}
