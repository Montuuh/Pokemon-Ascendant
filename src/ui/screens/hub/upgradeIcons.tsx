import { IconAdjustments, IconBook2, IconBox, IconCoin, IconDiamond, IconEye, IconFirstAidKit, IconMountain, IconPokeball, IconRocket, IconShare, IconUsers } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { HubUpgrade } from '@/sim';

/** §8.4.2, §8.4.5 — one glyph per service and per Kit perk, shared by the Mart's shelf and the Kit's slots. */
export const UPGRADE_ICON: Record<HubUpgrade, (size: number) => ReactNode> = {
  'starting-relic-plus-one': (s) => <IconDiamond size={s} />,
  'expanded-box': (s) => <IconBox size={s} />,
  'pokedex-insight': (s) => <IconEye size={s} />,
  'trauma-salve-cache': (s) => <IconFirstAidKit size={s} />,
  'apex-reveal': (s) => <IconMountain size={s} />,
  'modifier-slot-plus-one': (s) => <IconAdjustments size={s} />,
  'twin-run': (s) => <IconUsers size={s} />,
  'moms-allowance': (s) => <IconCoin size={s} />,
  'first-aid-pouch': (s) => <IconFirstAidKit size={s} />,
  'tm-case': (s) => <IconBook2 size={s} />,
  'ball-case': (s) => <IconPokeball size={s} />,
  'exp-share': (s) => <IconShare size={s} />,
  'head-start': (s) => <IconRocket size={s} />,
};
