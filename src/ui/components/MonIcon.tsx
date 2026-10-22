import { getContent } from '@/content/registry';
import { compactIconOf } from '@/ui/art';
import { portraitUrl } from '@/content/schemas/species';
import { PixelSprite } from './PixelSprite';

// Per docs/design/ui-doctrine.md §D9 — every Pokémon depiction across the game uses authentic pixel art.
// Tiny cells use trimmed authentic box sprites: even the largest species fits at a clean 0.5×.
// Larger cells keep the battle portrait's presence, fitted to their original grid inside the layout cell.
export function MonIcon({ speciesId, size = 44, alt }: { speciesId: string; size?: number; alt?: string }) {
  const species = getContent().species(speciesId);
  return (
    <PixelSprite
      src={size < 48 ? compactIconOf(speciesId) : portraitUrl(species.dex, species.id)}
      alt={alt ?? species.name}
      width={size}
      height={size}
    />
  );
}
