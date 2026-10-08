import type { PokemonType } from '@/sim';
import { statusGlyph, typeGlyph } from '@/ui/art';
import { statusTip, typeAttackTip, typeDefenseTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './TypeBadge.module.css';

// Per §9.4 / §9.6 — type identity is colour + a word, never colour alone.
// The type badge is the games' own pixel label — the "FIRE" / "WATER" box of FireRed/LeafGreen, 32×12, fetched
// by `npm run art:types` — drawn at an integer or half multiple of its size with nearest-neighbour scaling, so it
// sits with the pixel-art sprites rather than beside them. The label carries its colour and its word, which is
// as colour-blind-safe as a badge gets. `size` is the label's height; its width follows the sprite.
//
// Both badges carry their own tooltip, so every place one appears explains itself without the caller doing
// anything. A move's type reads attacking, a Pokémon's defending (v0.9.6), each as a chart of type labels.

/** The label alone, for callers that already own a tooltip (a move card, a Tip's icon slot). */
export function TypeLabel({ type, size = 18, className }: { type: PokemonType | string; size?: number; className?: string }) {
  return <img src={typeGlyph(type)} alt={type} height={size} className={`${styles.label} ${className ?? ''}`} draggable={false} />;
}

/**
 * `mode` says what the badge is the type *of*: a move's (`attack` — what it hits hard, softly, not at all) or a
 * Pokémon's (`defense`, the default — what hits it ×4 to ×0, `defenderTypes` being the whole Pokémon's typing).
 */
export function TypeBadge({ type, size = 18, defenderTypes, mode = 'defense' }: { type: PokemonType; size?: number; defenderTypes?: readonly PokemonType[]; mode?: 'attack' | 'defense' }) {
  const tip = useTip(mode === 'attack' ? typeAttackTip(type) : typeDefenseTip(defenderTypes ?? [type]));
  return (
    <span className={styles.badge} aria-label={type} tabIndex={0} {...tip}>
      <TypeLabel type={type} size={size} />
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
