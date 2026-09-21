import { IconDna, IconPokeball, IconSparkles, IconStar, IconStars } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/** §6.8.2 — one glyph per Bond rank, shared by the bar, the legend and the row chips. */
export const RANK_ICON: Record<1 | 2 | 3 | 4 | 5, (size: number) => ReactNode> = {
  1: (s) => <IconStar size={s} stroke={2.4} />,
  2: (s) => <IconSparkles size={s} stroke={2.4} />,
  3: (s) => <IconDna size={s} stroke={2.4} />,
  4: (s) => <IconStars size={s} stroke={2.4} />,
  5: (s) => <IconPokeball size={s} stroke={2.4} />,
};
