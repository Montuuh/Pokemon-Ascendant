import { getContent } from '@/content/registry';
import { portraitUrl } from '@/content/schemas/species';

// The Gen VIII box icons are a 68×56 canvas with a small sprite inside, so they read as a smudge in a list
// row. The official-artwork portraits are square and high-resolution, so the run screens scale those instead.
export function MonIcon({ speciesId, size = 44, title }: { speciesId: string; size?: number; title?: string }) {
  const species = getContent().species(speciesId);
  return (
    <img
      src={portraitUrl(species.dex, species.id)}
      alt=""
      title={title ?? species.name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flex: 'none' }}
      draggable={false}
    />
  );
}
