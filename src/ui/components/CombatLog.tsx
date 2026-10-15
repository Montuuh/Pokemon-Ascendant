import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconListDetails } from '@tabler/icons-react';
import type { LogEntry } from '@/sim';
import styles from './CombatLog.module.css';

/**
 * §9.2.2.1 — the combat log, in the top bar: the last thing that happened on one line, the whole fight one click
 * away. The arena is for the fight; the sr-only announcer still says every line aloud.
 */
export function CombatLog({ log, max = 60 }: { log: LogEntry[]; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const lines = log.slice(-max);
  // The ticker says what happened: a turn marker and an enemy's declaration (its intent chip already shows it) are skipped.
  const last = [...lines].reverse().find((l) => l.category !== 'turn' && l.category !== 'intent');
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length, open]);
  // Closes on a press anywhere else, or Escape — a drop-down, not a dialog.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.ticker} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Battle log" data-testid="log-ticker">
        <IconListDetails size={15} className={styles.tickerIcon} />
        <span key={last ? `${last.turn}-${last.text}-${lines.length}` : 'none'} className={`${styles.last} ${last ? styles[last.category] : ''}`}>
          {last?.text ?? 'The battle begins.'}
        </span>
        <IconChevronDown size={15} className={styles.chevron} data-open={open || undefined} />
      </button>
      <div className={styles.log} ref={ref} data-testid="combat-log" hidden={!open}>
        {lines.map((l, i) => (
          <div key={`${l.turn}-${i}-${l.text}`} className={`${styles.line} ${styles[l.category]}`}>
            {l.category === 'turn' ? <span className={styles.turn}>{l.text}</span> : l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
