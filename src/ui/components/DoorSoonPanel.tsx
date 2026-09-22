import { useEffect } from 'react';
import { IconBarrierBlock } from '@tabler/icons-react';
import { CITY_DOOR_HINT, CITY_DOOR_LABEL, CITY_DOOR_SOON, type CityBuildingDoor } from '@/ui/strings';
import { Modal } from './Modal';
import styles from './DoorSoonPanel.module.css';

// §2.11.0 — a door in development is still a door: it opens on a one-line panel that names the place, says in
// a line what it will be, and says it is not open yet. One panel for every such door, in the town or inside a
// building, so they all read and close the same way (Escape or the button).

export function DoorSoonPanel({ door, onClose, backLabel }: { door: CityBuildingDoor; onClose: () => void; backLabel: string }) {
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
          {backLabel}
        </button>
      </div>
    </Modal>
  );
}
