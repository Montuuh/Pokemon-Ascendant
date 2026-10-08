import { IconMedal } from '@tabler/icons-react';
import styles from './MedalIcon.module.css';

// §8.7 — a medal's disc in its tier's colour (the reward screen's progress rows, the progress panel).
const TIER_CLASS: Record<string, string | undefined> = { bronze: styles.bronze, silver: styles.silver, gold: styles.gold, platinum: styles.platinum };

export function MedalIcon({ tier, size = 26 }: { tier: string; size?: number }) {
  return (
    <span className={`${styles.medal} ${TIER_CLASS[tier] ?? ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <IconMedal size={Math.round(size * 0.6)} />
    </span>
  );
}
