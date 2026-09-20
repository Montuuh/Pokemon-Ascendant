import type { PokemonType } from '@/sim';
import styles from './TypeBadge.module.css';

// Per §9.4 — type identity is colour + glyph (shape carries meaning for colour-blind players, §9.6).
// The type SVGs are filled silhouettes in the type hue, so the badge is a cream disc with a type-coloured ring;
// painting the disc in the type colour would hide the glyph.
export function TypeBadge({ type, size = 22, title }: { type: PokemonType; size?: number; title?: string }) {
  return (
    <span
      className={styles.badge}
      style={{ width: size, height: size, borderColor: `var(--type-${type})` }}
      title={title ?? type}
      aria-label={type}
    >
      <img src={`/art/icons/type/icon-type-${type}.svg`} alt="" width={size * 0.72} height={size * 0.72} />
    </span>
  );
}

// Status SVGs ship their own coloured badge + colour-blind pattern + white glyph, so they render bare.
export function StatusBadge({ status, size = 22 }: { status: string; size?: number }) {
  return (
    <span className={styles.bare} style={{ width: size, height: size }} title={status} aria-label={status}>
      <img src={`/art/icons/status/icon-status-${status}.svg`} alt="" width={size} height={size} />
    </span>
  );
}
