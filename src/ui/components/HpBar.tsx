import styles from './HpBar.module.css';

interface Props {
  hp: number;
  maxHp: number;
  shield?: number;
  /** §5.8 — boss phase thresholds as fractions of max HP (rendered as markers). */
  phaseMarkers?: number[];
  height?: number;
}

// Per §9.2.2 / ui rule — HP bars for boss-tier enemies must show phase-threshold markers.
export function HpBar({ hp, maxHp, shield = 0, phaseMarkers = [], height = 10 }: Props) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const tone = pct > 50 ? 'var(--accent-positive)' : pct > 20 ? 'var(--accent-warning)' : 'var(--accent-negative)';
  const shieldPct = Math.min(100, ((hp + shield) / maxHp) * 100);
  return (
    <div className={styles.track} style={{ height }} role="meter" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
      {shield > 0 && <div className={styles.shield} style={{ width: `${shieldPct}%` }} />}
      <div className={styles.fill} style={{ width: `${pct}%`, background: tone }} />
      {phaseMarkers.map((m) => (
        <span key={m} className={styles.marker} style={{ left: `${m * 100}%` }} />
      ))}
    </div>
  );
}
