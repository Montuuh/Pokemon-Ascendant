import styles from './TitleMark.module.css';

/**
 * §9.13.2 — the game's title mark (v0.9.17): the name set as a mark of its own rather than a line of type — "Pokémon"
 * small over "Ascendant" large, cream lettering with a dark outline and a red step under it, beside its emblem: a ball
 * whose upper half is a peak, the climb the run is. Drawn here, in vector, so it is sharp at every size.
 */
export function TitleMark({ className }: { className?: string }) {
  return (
    <h1 className={`${styles.mark} ${className ?? ''}`} aria-label="Pokémon Ascendant">
      <svg className={styles.emblem} viewBox="0 0 64 64" aria-hidden="true">
        {/* The lower half of the ball, the band, the peak above it, the button. */}
        <path className={styles.ink} d="M4 35 A28 28 0 0 0 60 35 Z" />
        <path className={styles.cream} d="M9 38 A23 23 0 0 0 55 38 Z" />
        <path className={styles.ink} d="M2 33 L32 3 L62 33 Z" />
        <path className={styles.red} d="M10 30 L32 8 L54 30 Z" />
        <path className={styles.shine} d="M24 18 L32 10 L35 13 L27 21 Z" />
        <rect className={styles.ink} x="2" y="30" width="60" height="8" rx="2" />
        <circle className={styles.ink} cx="32" cy="34" r="10" />
        <circle className={styles.cream} cx="32" cy="34" r="6" />
      </svg>
      <span className={styles.words} aria-hidden="true">
        <span className={`${styles.kicker} display`}>Pokémon</span>
        <span className={`${styles.word} display`}>Ascendant</span>
      </span>
    </h1>
  );
}
