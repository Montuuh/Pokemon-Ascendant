import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { MAX_LEVEL, levelProgress } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Tipped } from '@/ui/tooltip';
import { trainerLevelTip } from '@/ui/tips';
import styles from './LevelRing.module.css';

// §8.3.1 — the Trainer Level as a dial: the ring is the XP inside the current level, the number is the level.
// One glance answers "how far am I" the way a flat bar under a caption never did. The ring fills on mount and
// the numbers roll, unless motion is off.

interface Props {
  xp: number;
  /** Diameter in px. The header uses a small one, the Trainer Card a large one. */
  size?: number;
  /** Print the XP line under the ring. */
  caption?: boolean;
}

export function LevelRing({ xp, size = 96, caption = false }: Props) {
  const p = levelProgress(xp);
  const animate = useMotionPref();
  // Start empty and fill on the first frame, so a returning player sees the level *arrive*. Motion off:
  // land at once. The flag flips inside a frame callback, never synchronously in the effect.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const shown = animate && !settled ? 0 : p.fraction;

  const big = size >= 120;
  return (
    <Tipped tip={trainerLevelTip(p.level, p.into, p.span, MAX_LEVEL)} className={styles.root} style={{ width: size }} data-testid="level-ring">
      <div className={styles.ring} style={{ width: size, height: size }}>
        <CircularProgressbarWithChildren
          value={shown * 100}
          strokeWidth={big ? 9 : 11}
          styles={buildStyles({
            pathColor: 'var(--accent-action)',
            trailColor: 'var(--surface-sunken)',
            pathTransitionDuration: animate ? 0.9 : 0,
            strokeLinecap: 'round',
          })}
        >
          <span className={`${styles.label} ${big ? styles.labelBig : ''}`}>
            <span className={styles.lv}>Lv</span>
            <span className={`${styles.num} display tabular`} data-testid="level-ring-value">
              <NumberFlow value={p.level} animated={animate} />
            </span>
          </span>
        </CircularProgressbarWithChildren>
      </div>
      {caption && (
        <span className={`${styles.caption} tabular`} data-testid="level-ring-caption" data-into={p.into} data-span={p.span}>
          {p.level >= MAX_LEVEL ? (
            'Max level'
          ) : (
            <>
              <NumberFlow value={p.into} animated={animate} /> / {p.span} XP
            </>
          )}
        </span>
      )}
    </Tipped>
  );
}
