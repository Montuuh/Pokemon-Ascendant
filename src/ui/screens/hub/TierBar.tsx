import { IconEye, IconSparkles, IconStar } from '@tabler/icons-react';
import { Progress } from 'radix-ui';
import type { ReactNode } from 'react';
import { DEX_THRESHOLDS, type DexTier, type RarityTier } from '@/sim';
import styles from './TierBar.module.css';

// §5.13.1 — one species' Pokédex progress as three segments, one per tier, each with the reward it opens
// drawn at its end. The whole bar is the road to Master; the lit icons are what you already have. This
// replaced a single "3 / 10" bar that changed its denominator on every tier, which read as three different
// bars pretending to be one.

const TIER_ICON: Record<1 | 2 | 3, (props: { size?: number; stroke?: number }) => ReactNode> = {
  1: (p) => <IconEye {...p} />,
  2: (p) => <IconSparkles {...p} />,
  3: (p) => <IconStar {...p} />,
};

const TIER_WHAT: Record<1 | 2 | 3, string> = {
  1: 'Familiar — its hidden intents are shown from turn one',
  2: 'Veteran — your own copies are Shiny',
  3: 'Master — its Mastery Move joins the deck',
};

interface Props {
  defeats: number;
  rarity: RarityTier;
  tier: DexTier;
  compact?: boolean;
}

export function TierBar({ defeats, rarity, tier, compact = false }: Props) {
  const [f, v, m] = DEX_THRESHOLDS[rarity];
  const segments: { to: number; from: number; tier: 1 | 2 | 3 }[] = [
    { from: 0, to: f, tier: 1 },
    { from: f, to: v, tier: 2 },
    { from: v, to: m, tier: 3 },
  ];
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`} data-testid="tier-bar">
      {segments.map((s) => {
        const fill = Math.max(0, Math.min(1, (defeats - s.from) / (s.to - s.from)));
        const reached = tier >= s.tier;
        return (
          <div key={s.tier} className={styles.segment} style={{ flexGrow: s.to - s.from }}>
            <Progress.Root className={styles.track} value={Math.round(fill * 100)} aria-label={`${TIER_WHAT[s.tier]}: ${Math.min(defeats, s.to)} of ${s.to}`}>
              <Progress.Indicator className={styles.fill} style={{ transform: `translateX(-${100 - Math.round(fill * 100)}%)` }} />
            </Progress.Root>
            <span className={`${styles.mark} ${reached ? styles.markOn : ''}`} data-tier={s.tier} aria-hidden="true">
              {TIER_ICON[s.tier]({ size: compact ? 12 : 14, stroke: 2.4 })}
              {!compact && <span className={`${styles.at} tabular`}>{s.to}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
