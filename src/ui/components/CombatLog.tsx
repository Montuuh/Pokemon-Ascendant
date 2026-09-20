import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/sim';
import styles from './CombatLog.module.css';

/** Compact scrolling combat log (§9.2 mid-arena). Sticks to the newest line. */
export function CombatLog({ log, max = 60 }: { log: LogEntry[]; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const lines = log.slice(-max);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);
  return (
    <div className={styles.log} ref={ref} data-testid="combat-log" aria-live="polite">
      {lines.map((l, i) => (
        <div key={`${l.turn}-${i}-${l.text}`} className={`${styles.line} ${styles[l.category]}`}>
          {l.category === 'turn' ? <span className={styles.turn}>{l.text}</span> : l.text}
        </div>
      ))}
    </div>
  );
}
