import { Progress } from 'radix-ui';
import { BOND_RANKS, MAX_BOND_RANK, bondProgress } from '@/sim';
import { RANK_ICON } from './rankIcons';
import styles from './BondBar.module.css';

// §6.8.2 — one line's Bond as a bar with five marks, each mark the thing that rank opens. The bar is the
// whole road to Soulbound (0–100); the lit marks are what the line already has.

export function BondBar({ points, compact = false }: { points: number; compact?: boolean }) {
  const p = bondProgress(points);
  const max = BOND_RANKS[MAX_BOND_RANK - 1]!;
  const pct = Math.min(100, Math.round((Math.min(points, max) / max) * 100));
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`} data-testid="bond-bar" data-rank={p.rank}>
      <Progress.Root className={styles.track} value={pct} aria-label={`Bond ${points} of ${max}`}>
        <Progress.Indicator className={styles.fill} style={{ width: `${pct}%` }} />
        {BOND_RANKS.map((at, i) => {
          const rank = (i + 1) as 1 | 2 | 3 | 4 | 5;
          const lit = p.rank >= rank;
          return (
            <span key={rank} className={`${styles.mark} ${lit ? styles.markOn : ''}`} style={{ left: `${(at / max) * 100}%` }} data-rank={rank} aria-hidden="true">
              {RANK_ICON[rank](compact ? 11 : 13)}
            </span>
          );
        })}
      </Progress.Root>
      {!compact && (
        <span className={`${styles.text} tabular`}>
          {p.next === null ? `${points} · Soulbound` : `${points} / ${p.next}`}
        </span>
      )}
    </div>
  );
}
