import type { CSSProperties } from 'react';
import styles from './FloatingNumbers.module.css';

export interface FloatingFx {
  id: number;
  uid: string;
  kind: 'damage' | 'heal' | 'status' | 'text';
  text: string;
  emphasis?: 'crit' | 'super' | 'weak' | 'immune';
  /** Drawn a row higher than the rest, so a word said on top of a hit's own numbers never prints over them. */
  lifted?: boolean;
  /** A word about the hit before it (CRIT, Super effective, a status, a stage): a row under it, never over it. */
  under?: boolean;
}

/** Where each column of numbers stands, in % of the sprite's width from its centre: far enough apart for a word. */
const COLUMN = [0, -34, 34];

/** Transient combat numbers over a combatant's sprite (spawned from sim events by useCombatFx). */
export function FloatingNumbers({ uid, fx }: { uid: string; fx: FloatingFx[] }) {
  const mine = fx.filter((f) => f.uid === uid);
  if (mine.length === 0) return null;
  // Each number its own column — the first centred over the sprite, the next to either side; each word about it a row
  // further down its column.
  const at = mine.reduce<{ col: number; row: number }[]>((acc, f, i) => {
    const last = acc[i - 1];
    return [...acc, !last ? { col: 0, row: f.under ? 1 : 0 } : f.under ? { col: last.col, row: last.row + 1 } : { col: last.col + 1, row: 0 }];
  }, []);
  return (
    <div className={styles.layer} aria-hidden="true" data-testid="floats">
      {mine.map((f, i) => (
        <span
          key={f.id}
          data-float
          className={[styles.num, styles[f.kind], f.emphasis ? styles[f.emphasis] : '', f.lifted ? styles.lifted : ''].join(' ')}
          style={{ animationDelay: `${i * 90}ms`, left: `${50 + COLUMN[at[i]!.col % 3]!}%`, '--row': at[i]!.row } as CSSProperties}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
