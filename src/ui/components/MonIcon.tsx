import { getContent } from '@/content/registry';
import { portraitUrl } from '@/content/schemas/species';

// Per docs/design/ui-doctrine.md §D9 — every Pokémon depiction across the game uses authentic pixel art.
// The static pixel portraits (public/art/pokemon/portraits/NNN-id.png) are trimmed and centred on a square
// canvas so they scale cleanly in list rows, Center/Dojo panels, and the Pokédex grid.
export function MonIcon({ speciesId, size = 44, alt }: { speciesId: string; size?: number; alt?: string }) {
  const species = getContent().species(speciesId);
  return (
    <img
      className="pixel"
      src={portraitUrl(species.dex, species.id)}
      alt={alt ?? species.name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flex: 'none', imageRendering: 'pixelated' }}
      draggable={false}
    />
  );
}
