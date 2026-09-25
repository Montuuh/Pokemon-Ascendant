import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

/**
 * Dim modal (docs/design/ui/01 §1.4). Blocks the screen behind it; no dismiss unless the caller offers one.
 *
 * §9.6 — it also owns focus while it is open. Without that, Tab walks straight out of the dialog into the
 * board behind it, which for a keyboard or screen-reader player means the modal may as well not be there.
 * On open the first control takes focus; Tab cycles inside; on close focus returns where it came from.
 */
export function Modal({
  title,
  children,
  testId,
  tone = 'neutral',
  size = 'default',
  onDismiss,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
  tone?: 'neutral' | 'victory' | 'defeat';
  /** `reading` widens the panel, left-aligns it and lets it scroll — for prose rather than a prompt. */
  size?: 'default' | 'reading';
  /** The safe answer, taken on Escape. A modal that offers one should never need a click to leave. */
  onDismiss?: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismiss.current) {
        // Captured, so a screen's own Escape (the pause menu) does not fire behind the modal.
        e.stopPropagation();
        dismiss.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo?.focus?.();
    };
  }, []);

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
      <div ref={panel} className={`${styles.panel} ${styles[tone]} ${size === 'reading' ? styles.reading : ''} fx-pop`}>
        <h2 className={`${styles.title} display`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
