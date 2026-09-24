import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import type { Tile } from '@/sim';
import { safariArt } from '@/ui/art';
import styles from './Tiles.module.css';

// §2.11.6 — how a Safari tile is drawn, shared by the stalk's board and the How to play's little boards: the ground
// (FireRed / LeafGreen's own 16-px tiles, `npm run art:safari`), and everything on it — the sight, the path, the
// bait, the Pokémon, Red. One set of pieces, so the guide's pictures are the board's pictures.
//
// The art is scaled by whole pixels: a tile is a multiple of 16 px on screen, so a FRLG pixel is always a whole
// number of screen pixels and no seam opens between two tiles. The URLs travel as CSS variables so
// they go through `asset()` (a root-absolute url() in a module would miss GitHub Pages' sub-path).

const ART = [
  'grass', 'grass-tuft', 'grass-tall', 'boulder', 'forest',
  'water', 'water-n', 'water-s', 'water-w', 'water-e', 'water-nw', 'water-ne', 'water-sw', 'water-se',
] as const;

/** The largest tile, in whole art pixels (a multiple of 16 px), that fits a board of cols × rows plus its frame. */
export function tilePx(width: number, height: number, cols: number, rows: number): number {
  const fit = Math.min(width / (cols + 2), height / (rows + 2));
  return Math.max(16, Math.floor(fit / 16) * 16);
}

/** Measure a box and hand back the tile size that fits a board in it. */
export function useTilePx(box: RefObject<HTMLElement | null>, cols: number, rows: number): number {
  const [px, setPx] = useState(48);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setPx(tilePx(el.clientWidth, el.clientHeight, cols, rows));
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, [box, cols, rows]);
  return px;
}

/** The board's own style: its exact size, the tile size, and one url per tile image. */
export function boardStyle(cols: number, rows: number, tile: number): CSSProperties {
  const vars: Record<string, string | number> = { '--tile': `${tile}px`, width: tile * (cols + 2), height: tile * (rows + 2) };
  for (const name of ART) vars[`--art-${name}`] = `url(${safariArt(name)})`;
  return { ...vars, gridTemplateColumns: `repeat(${cols}, ${tile}px)` } as CSSProperties;
}

const WATER_EDGE: Record<string, string | undefined> = {
  '': styles.water,
  n: styles.waterN,
  s: styles.waterS,
  w: styles.waterW,
  e: styles.waterE,
  nw: styles.waterNw,
  ne: styles.waterNe,
  sw: styles.waterSw,
  se: styles.waterSe,
};

/**
 * The class for one tile. Short grass takes a tuft now and then (a fixed pattern, not a roll: a redraw must not
 * move them); a pond tile takes the rocky rim on each side where land meets it — off the board counts as water.
 */
export function tileClass(t: Tile, x: number, y: number, at: (x: number, y: number) => Tile | null): string {
  if (t === 'g') return `${styles.tile} ${styles.tall}`;
  if (t === 'r') return `${styles.tile} ${styles.boulder}`;
  if (t === 'o') return `${styles.tile} ${(x * 7 + y * 3) % 5 === 0 ? styles.tuft : styles.short}`;
  const land = (dx: number, dy: number) => {
    const n = at(x + dx, y + dy);
    return n !== null && n !== 'w';
  };
  const v = land(0, -1) ? 'n' : land(0, 1) ? 's' : '';
  const h = land(-1, 0) ? 'w' : land(1, 0) ? 'e' : '';
  return `${styles.tile} ${WATER_EDGE[v + h] ?? WATER_EDGE[v] ?? styles.water}`;
}

/** What the end of the turn means for this tile: red where it would notice you, pale where it only looks. */
export const sightClass = (seen: boolean, watched: boolean): string => (seen ? styles.seen ?? '' : watched ? styles.watched ?? '' : '');
/** A tile a click acts on. */
export const targetClass = styles.target;
export const cellClass = styles.cell;
export const frameClass = styles.frame;

