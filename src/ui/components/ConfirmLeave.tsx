import { IconDoorExit, IconLock } from '@tabler/icons-react';
import { LEAVE_WARNING } from '@/ui/strings';
import { Modal } from './Modal';
import styles from './ConfirmLeave.module.css';

// §2.11.0 — the committing doors (the Ring, the Safari, the Black Market) resolve once a visit and close behind
// you. Walking out of one is the one exit in a City that cannot be taken back, so it asks first, in one line that
// says what closes. Stay is the first button and takes the focus, and Escape stays: the safe answer is the easy one.
// The showcase's deal asks the same way under its own title, since the deal is what locks the door.

export function ConfirmLeave({ body, heading = LEAVE_WARNING.title, leaveLabel = LEAVE_WARNING.leave, exitIcon = true, onStay, onLeave, testId = 'confirm-leave' }: {
  body: string;
  heading?: string;
  leaveLabel?: string;
  /** The door icon on the confirm button — off when the answer is a deal rather than a walk out. */
  exitIcon?: boolean;
  onStay: () => void;
  onLeave: () => void;
  testId?: string;
}) {
  return (
    <Modal title={heading} testId={testId} onDismiss={onStay}>
      <p className={styles.body}>
        <IconLock size={18} aria-hidden="true" className={styles.lock} />
        {body}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.stay} onClick={onStay} data-testid="btn-leave-stay">
          {LEAVE_WARNING.stay}
        </button>
        <button type="button" className={styles.leave} onClick={onLeave} data-testid="btn-leave-confirm">
          {exitIcon && <IconDoorExit size={18} aria-hidden="true" />} {leaveLabel}
        </button>
      </div>
    </Modal>
  );
}
