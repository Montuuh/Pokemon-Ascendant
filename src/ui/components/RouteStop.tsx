import { asset } from '@/content/paths';
import styles from './RouteStop.module.css';

/** §2.9.1–§2.9.2 / §2.12.3 — a place on the road; the service controls stay outside the illustration. */
export function RouteStop({ kind }: { kind: 'merchant' | 'aid' | 'training' }) {
  return (
    <div className={styles.frame} data-testid="route-stop-vignette" data-stop={kind} aria-hidden="true">
      <img
        className={styles.art}
        src={asset(`art/route-stops/${kind}.png`)}
        width={256}
        height={112}
        alt=""
        draggable={false}
      />
    </div>
  );
}
