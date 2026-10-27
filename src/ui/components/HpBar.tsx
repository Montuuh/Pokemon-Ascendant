import { useState, type CSSProperties } from 'react';
import styles from './HpBar.module.css';

interface Props {
  hp: number;
  maxHp: number;
  shield?: number;
  /** §5.8 — boss phase thresholds as fractions of max HP (rendered as markers). */
  phaseMarkers?: number[];
  height?: number;
  /**
   * §9.2.5 (v0.9.16) — the HP it will have after what is coming: the part of the bar about to go, striped. Yours from
   * the enemies' visible intents; an enemy's from the card you are aiming at it. Absent, or not below `hp`: nothing.
   */
  future?: number | null;
}

// Per §9.2.2 / ui rule — HP bars for boss-tier enemies must show phase-threshold markers.
export function HpBar({ hp, maxHp, shield = 0, phaseMarkers = [], height = 10, future = null }: Props) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  // §9.9 / D12 — the fill moves at the series' constant rate, so its time is the share of the bar it crosses: a big hit
  // drains long, a chip in a blink. The last width is kept to know how far this change goes.
  const [moved, setMoved] = useState({ pct, share: 0 });
  if (moved.pct !== pct) setMoved({ pct, share: Math.abs(pct - moved.pct) / 100 });
  const tone = pct > 50 ? 'var(--accent-positive)' : pct > 20 ? 'var(--accent-warning)' : 'var(--accent-negative)';
  // A shield takes damage before HP does, so it is drawn over the end of the fill — the part it protects — and shows
  // at full HP too, when it is first set (§5.9.5 Ice Armour).
  const shieldPct = Math.min(pct, (shield / maxHp) * 100);
  const futurePct = future !== null && future < hp ? Math.max(0, (future / maxHp) * 100) : null;
  return (
    <div className={styles.track} style={{ height }} role="meter" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
      <div className={styles.fill} style={{ width: `${pct}%`, background: tone, '--share': moved.share } as CSSProperties} />
      {futurePct !== null && <div className={styles.loss} style={{ left: `${futurePct}%`, width: `${pct - futurePct}%` }} data-testid="hp-loss" data-future={Math.max(0, future!)} />}
      {shield > 0 && <div className={styles.shield} style={{ left: `${pct - shieldPct}%`, width: `${shieldPct}%` }} data-testid="hp-shield" />}
      {phaseMarkers.map((m) => (
        <span key={m} className={styles.marker} style={{ left: `${m * 100}%` }} />
      ))}
    </div>
  );
}
