import { getContent } from '@/content/registry';
import { compactIconOf } from '@/ui/art';
import { portraitUrl } from '@/content/schemas/species';
import { PixelSprite } from './PixelSprite';
import { ShinyMark } from './ShinyMark';
import styles from './MonIcon.module.css';

// Per docs/design/ui-doctrine.md §D9 — every Pokémon depiction across the game uses authentic pixel art.
// Tiny cells use trimmed authentic box sprites: even the largest species fits at a clean 0.5×.
// Larger cells keep the battle portrait's presence, fitted to their original grid inside the layout cell.
export function MonIcon({ speciesId, size = 44, alt, shiny = false, marked = true, plain = true }: {
  speciesId: string;
  size?: number;
  alt?: string;
  /** §5.14 — pass the specimen's flag, never the account's shiny collection. */
  shiny?: boolean;
  /** A host that already marks the name keeps its single existing sparkle. */
  marked?: boolean;
  /** Inside a control, its host owns focus and the explanation; standalone marks have their own door. */
  plain?: boolean;
}) {
  const species = getContent().species(speciesId);
  const sprite = (
    <PixelSprite
      src={size < 48 || shiny ? compactIconOf(speciesId, shiny) : portraitUrl(species.dex, species.id)}
      alt={alt ?? (shiny ? `Shiny ${species.name}` : species.name)}
      width={size}
      height={size}
    />
  );
  if (!shiny || !marked) return sprite;
  return (
    <span className={styles.owned}>
      {sprite}
      <span className={styles.mark}><ShinyMark name={species.name} size={12} plain={plain} owned /></span>
    </span>
  );
}
