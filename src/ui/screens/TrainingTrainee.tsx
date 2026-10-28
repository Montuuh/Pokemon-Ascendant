import { useState, type CSSProperties } from 'react';
import { asset } from '@/content/paths';
import type { PartyMon } from '@/sim';
import styles from './TrainingScreen.module.css';

// §2.12.3 — the Pokémon on the coach's mat: the Dojo's own practice sprite (a native 32 px cell, shiny palette included),
// drawn in the scene's pixels. Species fill their cell differently (Magnemite stops at row 20, Charizard at 31), so each is
// seated by its lowest opaque row: every trainee stands on the same line of the mat, whatever its size.

/** The scene's own pixels (256 × 112): where a trainee's feet stand on the mat, and the mat's centre. */
const MAT_FEET_Y = 90;
const MAT_X = 112;
/** The lowest opaque row of a species' practice sprite, measured once per sprite. */
const FEET = new Map<string, number>();
/** Before the sprite has been read: the middle of the range. */
const FEET_GUESS = 26;

const practiceSprite = (m: PartyMon) =>
  asset(`art/dojo/pokemon/${m.speciesId}${m.shiny ? '-shiny' : ''}.png`);

function lowestOpaqueRow(img: HTMLImageElement): number | null {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = height - 1; y >= 0; y--)
    for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3]! > 0) return y;
  return null;
}

/** `hop` — the beat after Train: two steps up and down, in whole art pixels. */
export function TrainingTrainee({ mon, hop }: { mon: PartyMon; hop: boolean }) {
  const src = practiceSprite(mon);
  const [, measured] = useState(0);
  const row = FEET.get(src) ?? FEET_GUESS;
  return (
    <img
      // Keyed by the Pokémon, so each one steps onto the mat afresh.
      key={mon.uid}
      className={`pixel ${styles.trainee} ${hop ? styles.hop : ''}`}
      style={{ '--x': MAT_X, '--y': MAT_FEET_Y - (row + 1) } as CSSProperties}
      src={src}
      onLoad={(e) => {
        if (FEET.has(src)) return;
        const found = lowestOpaqueRow(e.currentTarget);
        if (found !== null) {
          FEET.set(src, found);
          measured((n) => n + 1);
        }
      }}
      alt=""
      draggable={false}
      data-testid="training-trainee"
    />
  );
}
