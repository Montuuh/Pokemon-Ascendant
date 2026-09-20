import type { PokemonType } from '@/sim';
import { statusGlyph, typeGlyph } from '@/ui/art';
import { statusTip, typeTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './TypeBadge.module.css';

// Per §9.4 — type identity is colour + glyph (shape carries meaning for colour-blind players, §9.6).
// The type SVGs are filled silhouettes in the type hue, so the badge is a cream disc with a type-coloured ring;
// painting the disc in the type colour would hide the glyph.
//
// Both badges carry their own tooltip, so every place one appears explains itself without the caller doing
// anything. `defenderTypes` lets a badge on a dual-typed Pokémon answer "weak to what?" for the pair rather
// than for its own type alone — the question a player is actually asking when they hover an enemy's types.
export function TypeBadge({ type, size = 22, defenderTypes }: { type: PokemonType; size?: number; defenderTypes?: readonly PokemonType[] }) {
  const tip = useTip(typeTip(type, defenderTypes));
  return (
    <span className={styles.badge} style={{ width: size, height: size, borderColor: `var(--type-${type})` }} aria-label={type} tabIndex={0} {...tip}>
      <img src={typeGlyph(type)} alt="" width={size * 0.72} height={size * 0.72} />
    </span>
  );
}

// Status SVGs ship their own coloured badge + colour-blind pattern + white glyph, so they render bare.
export function StatusBadge({ status, size = 22 }: { status: string; size?: number }) {
  const tip = useTip(statusTip(status));
  return (
    <span className={styles.bare} style={{ width: size, height: size }} aria-label={status} tabIndex={0} {...tip}>
      <img src={statusGlyph(status)} alt="" width={size} height={size} />
    </span>
  );
}
