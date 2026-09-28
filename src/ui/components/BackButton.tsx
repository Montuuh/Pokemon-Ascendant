import type { ReactNode } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './BackButton.module.css';

// §2.11.0 — the way out of a building, the same on every one: a quiet round arrow at the top-left of the header,
// before the title, named on hover and for screen readers. What leaving costs (a committing door's warning, §2.11.0)
// is the caller's: it passes the click that asks first.

export function BackButton({ label, onClick, testId, tip }: { label: string; onClick: () => void; testId: string; tip?: ReactNode }) {
  return (
    <Tipped as="button" type="button" tip={tip ?? <Tip title={label} />} className={styles.back} onClick={onClick} aria-label={label} data-testid={testId}>
      <IconArrowLeft size={22} aria-hidden="true" />
    </Tipped>
  );
}
