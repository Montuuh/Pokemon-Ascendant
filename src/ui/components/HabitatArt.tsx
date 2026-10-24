import { useEffect, useState, type CSSProperties } from 'react';
import { WILD_GRASS } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { POOL_CYCLE, usePoolStep } from '@/ui/hooks/usePoolStep';
import styles from './HabitatArt.module.css';

/** A face shorter than this (its natural height, px) shows at its own size: at half, a Diglett is a speck. */
const WHOLE_BELOW = 40;

/**
 * §9.3 — a Wild Area on the map (the user, 2026-10-20: "the habitat in front in the middle, the pool's Pokémon at the
 * sides, rotating"): its habitat's landmark in front, in the grass every Wild Area shares, and either side of it one of
 * its pool's Pokémon — at half size, a small one at its own — each going round the whole pool, the two half a pool apart
 * so they never show the same one. `seed` (the node's hash) sets where in the pool and in the period this node starts,
 * so two neighbours of one habitat never move together. With motion off they stand still on the pair the seed picks.
 */
export function HabitatArt({ src, low, pool, seed, artScale = 1 }: { src: string; low: boolean; pool: readonly string[]; seed: number; artScale?: number }) {
  const n = pool.length;
  const moving = useMotionPref() && n > 1;
  const offset = seed % POOL_CYCLE.faceMs;
  const leftStep = usePoolStep(moving, offset);
  const rightStep = usePoolStep(moving, offset + POOL_CYCLE.faceMs / 2);
  // Half the landmark's own width, once it is in: the residents stand just off its sides.
  const [half, setHalf] = useState(24);
  // Each face's own size, once fetched: whether it shows whole or halved, and how far out it reaches.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const measure = (face: string, img: HTMLImageElement) => setSizes((s) => (s[face] ? s : { ...s, [face]: { w: img.naturalWidth, h: img.naturalHeight } }));
  // Every face is fetched once, up front, so a turn never shows an empty place while the next one loads.
  useEffect(() => {
    if (!moving) return;
    for (const face of pool) {
      const img = new Image();
      img.onload = () => measure(face, img);
      img.src = face;
    }
  }, [moving, pool]);

  const base = (seed >>> 12) % Math.max(1, n);
  const left = n ? pool[(base + leftStep) % n]! : null;
  let r = (base + rightStep + Math.floor(n / 2)) % Math.max(1, n);
  if (n > 1 && pool[r] === left) r = (r + 1) % n;
  const right = n > 1 ? pool[r]! : null;

  const face = (url: string, side: 'left' | 'right') => {
    const size = sizes[url];
    // The surrounding route grows; each resident still lands on a native whole/half pixel multiple.
    const scale = Math.max(0.5, Math.round((size && size.h < WHOLE_BELOW ? 1 : 0.5) * artScale * 2) / 2) / artScale;
    return (
      <img
        className={`pixel ${styles.face} ${styles[side]}`}
        src={url}
        alt=""
        draggable={false}
        data-resident={side}
        style={{ '--scale': scale, '--w': `${size ? Math.round(size.w * scale) : 0}px` } as CSSProperties}
        onLoad={(e) => measure(url, e.currentTarget)}
      />
    );
  };
  return (
    <span className={styles.root} style={{ '--half': `${half}px`, '--tuft-scale': Math.max(0.5, Math.round(artScale) / 2) / artScale } as CSSProperties} data-testid="habitat-art">
      {left && face(left, 'left')}
      {right && face(right, 'right')}
      {left && <img className={`pixel ${styles.tuft} ${styles.left}`} src={WILD_GRASS} alt="" draggable={false} />}
      {right && <img className={`pixel ${styles.tuft} ${styles.right}`} src={WILD_GRASS} alt="" draggable={false} />}
      <img className={`pixel ${styles.landmark}`} src={src} alt="" draggable={false} data-low={low || undefined} onLoad={(e) => setHalf(Math.ceil(e.currentTarget.naturalWidth / 2))} />
      <img className={`pixel ${styles.grass}`} src={WILD_GRASS} alt="" draggable={false} />
    </span>
  );
}
