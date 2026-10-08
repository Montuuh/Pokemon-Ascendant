import { IconShieldHalf, IconSword } from '@tabler/icons-react';
import { typeGlyph } from '@/ui/art';
import styles from './TypeChart.module.css';

// §4.1.2 — the type chart as it is read in a tooltip (v0.9.6): one row per multiplier, its value as a coloured pill and
// the types it applies to as their own pixel labels — the badges the player already knows, not a list of words.
// Attacking and defending never read alike: a sword and the golds when it is your hit (×2 is good news), a shield and
// the reds and greens when it is a hit on you (×2 is bad news). The colour always means the same thing to the player.

export type ChartTone = 'x4' | 'x2' | 'half' | 'quarter' | 'zero' | 'hit' | 'glance';
export interface ChartRow {
  tone: ChartTone;
  /** The pill: "×2". */
  value: string;
  /** What the row means, for a screen reader and as the row's caption. */
  label: string;
  types: readonly string[];
}

// A multiplier → its pill colour.
const TONE_CLASS: Record<ChartTone, string | undefined> = {
  x4: styles.x4,
  x2: styles.x2,
  half: styles.half,
  quarter: styles.quarter,
  zero: styles.zero,
  hit: styles.hit,
  glance: styles.glance,
};

export function TypeChart({ rows, empty, mode }: { rows: readonly ChartRow[]; empty: string; mode: 'attack' | 'defense' }) {
  const shown = rows.filter((r) => r.types.length > 0);
  return (
    <div className={styles.chart}>
      <span className={styles.mode}>
        {mode === 'attack' ? <IconSword size={14} /> : <IconShieldHalf size={14} />}
        {mode === 'attack' ? 'When it hits' : 'When it is hit'}
      </span>
      {shown.length === 0 && <p className={styles.empty}>{empty}</p>}
      {shown.map((r) => (
        <div key={r.tone} role="group" className={styles.row} aria-label={`${r.label}: ${r.types.join(', ')}`}>
          <span className={`${styles.value} ${TONE_CLASS[r.tone] ?? ''}`}>{r.value}</span>
          <span className={styles.caption}>{r.label}</span>
          <span className={styles.types}>
            {r.types.map((t) => (
              <img key={t} src={typeGlyph(t)} alt={t} height={12} className={styles.glyph} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
