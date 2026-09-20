import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTip } from './useTip';
import styles from './Tooltip.module.css';

/**
 * A small ⓘ that carries an explanation. The pattern the user asked for on 2026-09-21: one short line on the
 * screen, and the paragraph behind a hover. Focusable, so a keyboard user gets it too.
 */
export function InfoDot({ tip, label = 'More about this' }: { tip: ReactNode; label?: string }) {
  const props = useTip(tip);
  return (
    <button type="button" className={styles.infoDot} aria-label={label} {...props}>
      <IconInfoCircle size={16} stroke={2.2} />
    </button>
  );
}
