import { useEffect, useState } from 'react';
import type { LevelUp } from '@/sim';
import { playSfx } from '@/ui/audio/sfx';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { LEVEL_UP_SETTLED, LevelUpPanel } from './results/LevelUpPanel';
import { RESULT_MS } from './results/results';
import styles from './TrainingScreen.module.css';

/** How long the stat window stands, in ms: as the fight's end shows it, and longer when a move is taught (it takes reading). */
export const levelBeatMs = (up: LevelUp): number => (up.learned.length ? 2600 : RESULT_MS.level);

/**
 * §2.12.3 — a Level Push is a level-up, so it plays as one (series-beat rule): the fanfare, then the same stat window
 * the fight's end shows — "grew to Lv N", each stat's gain counting up, and any move the level taught — beneath the
 * scene, where the result stands. A click on it, Escape, or the foot of the scene skips to the road. The window holds its
 * finished state until the screen leaves (leaving is its exit, so it never folds). With motion off it stands finished,
 * and the fanfare still plays.
 */
export function TrainingLevelUp({ name, up, onSkip }: { name: string; up: LevelUp; onSkip: () => void }) {
  const animate = useMotionPref();
  const [p, setP] = useState(animate ? 0 : LEVEL_UP_SETTLED);
  const beat = levelBeatMs(up);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);
  useEffect(() => {
    playSfx('level-up');
    if (!animate) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const now = Math.min(1, (performance.now() - start) / beat);
      setP(Math.min(now, LEVEL_UP_SETTLED));
      if (now < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, beat]);
  return (
    <div className={styles.levelNews} onClick={onSkip}>
      <LevelUpPanel name={name} up={up} p={p} place="b1" variant="screen" />
    </div>
  );
}
