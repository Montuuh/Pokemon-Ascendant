import { asset } from '@/content/paths';
import styles from './EventVignette.module.css';

/** §2.10.1 — the scene is an illustration, while choices and outcomes remain the sim's content. */
export function EventVignette({ eventId }: { eventId: string }) {
  return (
    <div className={styles.frame} data-testid="event-vignette" data-event={eventId} aria-hidden="true">
      <img className={styles.art} src={asset(`art/events/${eventId}.png`)} width={256} height={112} alt="" />
    </div>
  );
}
