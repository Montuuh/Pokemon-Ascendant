import { RARITY_LABEL } from '@/ui/strings';
import styles from './RarityGem.module.css';

// §7.3.1 — a relic's rarity as a gem whose shape and colour both say it (the user's note, 2026-10-19): a green square
// for Common, a blue pentagon for Uncommon, a red star for Rare, a gold crown for Legendary. The shape carries it for
// whoever cannot tell the colours apart (D5); the colour carries it at a glance. Drawn on a 12-px grid with crisp edges
// and a dark outline, the pixel sprites' kin (D9).

export type GemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** The gem's body on the 12-px grid, then its light facet. */
const SHAPE: Record<GemRarity, { body: string; light: string }> = {
  common: { body: '2,2 10,2 10,10 2,10', light: '3,3 6,3 6,5 3,5' },
  uncommon: { body: '6,1 11,4.5 9,11 3,11 1,4.5', light: '6,2.5 8.5,4.5 3.5,4.5' },
  rare: { body: '6,0.5 7.6,4.4 11.6,4.6 8.5,7.2 9.6,11.3 6,9 2.4,11.3 3.5,7.2 0.4,4.6 4.4,4.4', light: '6,2.5 6.9,4.8 5.1,4.8' },
  legendary: { body: '1,10.5 1,3.5 3.6,6.2 6,1.5 8.4,6.2 11,3.5 11,10.5', light: '2,8 10,8 10,9 2,9' },
};

export function RarityGem({ rarity, size = 14, label = false, className }: { rarity: GemRarity; size?: number; label?: boolean; className?: string }) {
  const s = SHAPE[rarity];
  return (
    <svg
      className={[styles.gem, className].filter(Boolean).join(' ')}
      data-rarity={rarity}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      {...(label ? { role: 'img', 'aria-label': RARITY_LABEL[rarity] } : { 'aria-hidden': true })}
    >
      <polygon className={styles.body} points={s.body} />
      <polygon className={styles.light} points={s.light} />
    </svg>
  );
}
