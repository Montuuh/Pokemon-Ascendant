import { asset } from '@/content/paths';

/** §2.12.4 / §2.1.6 — native Indigo scenes and physical gate anchors, built by build-league-art.mjs. */
export const LEAGUE_ART = {
  summit: asset('art/league/summit.png'),
  gallery: asset('art/league/gallery.png'),
};
export const SUMMIT_SCENE = { width: 304, height: 240 } as const;
export const LEAGUE_GALLERY = {
  width: 448,
  height: 224,
  doors: [48, 128, 208, 288, 392].map((x) => ({ x, y: 32 })),
} as const;
