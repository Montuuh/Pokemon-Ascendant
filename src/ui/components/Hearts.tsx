import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { friendshipHearts } from '@/ui/evolutionText';
import styles from './Hearts.module.css';

// §6.3.9 — Friendship as five hearts in half steps, as the series' checker reads it: a grooming's +25 always shows.
export function Hearts({ friendship, size = 14 }: { friendship: number; size?: number }) {
  const hearts = friendshipHearts(friendship);
  return (
    <span className={styles.hearts} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={styles.heart} data-fill={hearts >= i + 1 ? 'full' : hearts > i ? 'half' : 'empty'}>
          <IconHeart size={size} />
          {hearts > i && <IconHeartFilled size={size} className={styles.fill} />}
        </span>
      ))}
    </span>
  );
}
