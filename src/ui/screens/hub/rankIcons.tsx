import { IconDna, IconEye, IconHeartHandshake, IconPokeball, IconSparkles, IconStars } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/**
 * §6.8.2 — one glyph per Bond rank, shared by the bar and the ladder: knowing it, the Charm, the hidden ability, the
 * Mastery, the run, the Partner.
 */
export const RANK_ICON: Record<number, (size: number) => ReactNode> = {
  1: (s) => <IconEye size={s} stroke={2.4} />,
  2: (s) => <IconSparkles size={s} stroke={2.4} />,
  3: (s) => <IconDna size={s} stroke={2.4} />,
  4: (s) => <IconStars size={s} stroke={2.4} />,
  5: (s) => <IconPokeball size={s} stroke={2.4} />,
  6: (s) => <IconHeartHandshake size={s} stroke={2.4} />,
};
