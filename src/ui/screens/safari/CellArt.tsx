import type { ReactNode } from 'react';
import { IconArrowUp, IconEye } from '@tabler/icons-react';
import type { Facing } from '@/sim';
import { safariArt, spriteOf } from '@/ui/art';
import { Tipped } from '@/ui/tooltip';
import styles from './Tiles.module.css';

// §2.11.6 — everything that stands on a Safari tile (tiles.ts draws the ground), shared by the board and the guide.

const ROTATE = { n: 0, e: 90, s: 180, w: 270 } as const;

export interface CellContent {
  step?: boolean;
  bait?: boolean;
  mon?: { species: string; name: string; facing: Facing; state: 'eating' | 'held' | null; stateTip?: ReactNode };
  player?: { exposed: boolean };
  seen?: boolean;
}

/** Everything that stands on a tile, in the order it is stacked. */
export function CellArt({ step, bait, mon, player, seen }: CellContent) {
  return (
    <>
      {step && !mon && <span className={styles.step} aria-hidden="true" />}
      {bait && <img className={styles.token} src={safariArt('bait')} alt="" />}
      {mon && (
        <span className={styles.mon}>
          <img src={spriteOf({ speciesId: mon.species }, 'front')} alt={mon.name} />
          <IconArrowUp size={14} className={styles.facing} style={{ transform: `rotate(${ROTATE[mon.facing]}deg)` }} aria-hidden="true" />
        </span>
      )}
      {mon?.state && (
        <Tipped tip={mon.stateTip} className={styles.monState} data-testid="safari-mon-state">
          <img src={safariArt(mon.state === 'eating' ? 'bait' : 'rock')} alt="" />
          <span className="sr-only">{mon.state}</span>
        </Tipped>
      )}
      {player && <img src={safariArt('player')} alt="You" className={`${styles.player} ${player.exposed ? styles.exposed : ''}`} />}
      {seen && !player && <IconEye size={14} className={styles.eye} aria-hidden="true" />}
    </>
  );
}
