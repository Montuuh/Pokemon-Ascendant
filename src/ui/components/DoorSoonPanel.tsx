import { useEffect } from 'react';
import { IconBarrierBlock } from '@tabler/icons-react';
import { CITY_DOOR_HINT, CITY_DOOR_LABEL, CITY_DOOR_SOON, type CityBuildingDoor } from '@/ui/strings';
import { Modal } from './Modal';
import styles from './DoorSoonPanel.module.css';

// §2.11.0 — a door in development is still a door: it opens on a one-line panel that names the place, says in
// a line what it will be, and says it is not open yet. No door is in development since v0.7.9; the panel stays for
// the next one drawn before it is built, so it reads and closes the same way (Escape or the button).

export function DoorSoonPanel({ door, onClose }: { door: CityBuildingDoor; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Modal title={CITY_DOOR_LABEL[door]} testId="door-soon">
      <p className={styles.lede}>{CITY_DOOR_HINT[door]}</p>
      <p className={styles.tag}>
        <IconBarrierBlock size={18} aria-hidden="true" /> {CITY_DOOR_SOON}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.back} onClick={onClose} data-testid="btn-door-back">
          Back to town
        </button>
      </div>
    </Modal>
  );
}
