import { IconDna, IconPokeball, IconSparkles, IconStars } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/** §6.8.2 — one glyph per Bond tier, shared by the bar and the ladder: the Charm, the hidden ability, the Mastery, the run. */
export const RANK_ICON: Record<1 | 2 | 3 | 4, (size: number) => ReactNode> = {
  1: (s) => <IconSparkles size={s} stroke={2.4} />,
  2: (s) => <IconDna size={s} stroke={2.4} />,
  3: (s) => <IconStars size={s} stroke={2.4} />,
  4: (s) => <IconPokeball size={s} stroke={2.4} />,
};
