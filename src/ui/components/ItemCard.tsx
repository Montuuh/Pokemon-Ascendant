import { IconAlertTriangle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { itemIcon, tmIcon } from '@/ui/art';
import styles from './ItemCard.module.css';

// One card shape for everything you can own (§7.2–§7.4): a consumable, a relic, a held item, a TM, a ball.
// The Shop, the inventory drawer, the reward screen and the Mystery Event all draw the same card, because
// "the thing I was offered" and "the thing I now have" should be visibly the same object.

export type ItemKind = 'consumable' | 'relic' | 'held-item' | 'tm' | 'ball';

/** §7.3.1 — rarity is drop weight, and the border says which band this row sits in. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ItemCardProps {
  id: string;
  kind: ItemKind;
  name: string;
  description: string;
  rarity?: Rarity;
  /** A short badge over the icon — "Relic", "Held", the slot number. */
  tag?: string;
  /**
   * §7.7 — set when the row's effect is authored but its system is not built yet. The card says so instead
   * of selling a no-op, which is the whole reason the field exists on the content row.
   */
  pending?: string;
  /** Rendered in the card's bottom-right: a price, an "equipped" pill, a button. */
  footer?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  dim?: boolean;
  onClick?: () => void;
  testId?: string;
}

export function ItemCard(props: ItemCardProps) {
  const { id, kind, name, description, rarity, tag, pending, footer, selected, disabled, dim, onClick, testId } = props;
  const interactive = !!onClick;
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      className={[styles.card, selected && styles.selected, dim && styles.dim, interactive && styles.interactive]
        .filter(Boolean)
        .join(' ')}
      data-rarity={rarity ?? 'common'}
      data-kind={kind}
      disabled={interactive ? disabled : undefined}
      onClick={onClick}
      data-testid={testId}
      title={pending ? `${name} — ${pending}` : name}
    >
      <span className={styles.art}>
        {/* §6.4.1 — a TM is a disc coloured by its move's type, so it has its own resolver; everything else
            is a file named for its own id.

            A row with no icon collapses the frame rather than hiding the image inside it. Some things this
            card shows are not objects at all — a Region Modifier is a *rule* (§2.11.3) — and an empty beige
            tile reads as a missing asset, which is exactly the wrong thing to say about a row that is
            working perfectly. */}
        <img
          src={kind === 'tm' ? tmIcon(id) : itemIcon(id)}
          alt=""
          className={styles.icon}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = 'none';
            img.parentElement?.setAttribute('data-empty', 'true');
          }}
        />
        {tag && <span className={styles.tag}>{tag}</span>}
      </span>
      <span className={styles.body}>
        <span className={`${styles.name} display`}>{name}</span>
        <span className={styles.desc}>{description}</span>
        {pending && (
          <span className={styles.pending}>
            <IconAlertTriangle size={13} /> {pending}
          </span>
        )}
      </span>
      {footer && <span className={styles.footer}>{footer}</span>}
    </Tag>
  );
}
