import styles from './Hub.module.css';

/** §8.4.4 — the three card frames: the swatch on the Corner's shelf and the border on the Trainer Card, one map. */
export const FRAME_CLASS: Record<string, string> = {
  'frame-great': styles.frameGreat!,
  'frame-ultra': styles.frameUltra!,
  'frame-master': styles.frameMaster!,
};
