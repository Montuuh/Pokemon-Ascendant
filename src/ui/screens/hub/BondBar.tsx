import { Progress } from 'radix-ui';
import { BOND_RANKS, BOND_RANK_NAME, MAX_BOND_RANK, bondProgress } from '@/sim';
import { RANK_ICON } from './rankIcons';
import styles from './BondBar.module.css';

// §6.8.2 — one line's Bond as a bar with a mark at each of its six ranks, each the thing that rank opens: close
// together at the start, where the ranks come quickly, and wider toward Partner. The lit marks are what the line has.

export function BondBar({ points, compact = false }: { points: number; compact?: boolean }) {
  const p = bondProgress(points);
  const max = BOND_RANKS[MAX_BOND_RANK - 1]!;
  const pct = Math.min(100, Math.round((Math.min(points, max) / max) * 100));
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`} data-rank={p.rank}>
      <Progress.Root className={styles.track} value={pct} aria-label={`Bond ${points} of ${max}`}>
        <Progress.Indicator className={styles.fill} style={{ width: `${pct}%` }} />
        {BOND_RANKS.map((at, i) => {
          const rank = i + 1;
          const lit = p.rank >= rank;
          return (
            <span key={rank} className={`${styles.mark} ${lit ? styles.markOn : ''}`} style={{ left: `${(at / max) * 100}%` }} data-rank={rank} aria-hidden="true">
              {RANK_ICON[rank]?.(compact ? 11 : 13)}
            </span>
          );
        })}
      </Progress.Root>
      {!compact && (
        <span className={`${styles.text} tabular`}>
          {p.next === null ? `${points} · ${BOND_RANK_NAME[MAX_BOND_RANK]}` : `${points} / ${p.next}`}
        </span>
      )}
    </div>
  );
}
