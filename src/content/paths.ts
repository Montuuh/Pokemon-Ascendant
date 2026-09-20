// Where a public asset lives, relative to wherever the app is served from.
//
// Every art URL in the game used to start with `/art/…`, which is correct at `localhost:5173/` and wrong the
// moment the app is hosted under a sub-path — GitHub Pages serves it at `/Pokemon-Ascendant/`, and a root-
// absolute path there asks the wrong site for the sprite. Vite knows the base at build time; this is the one
// place that reads it, so no component has to.
//
// `BASE_URL` is `/` in dev and under Vitest, and whatever `vite.config.ts` sets for a hosted build.

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** `asset('art/items/potion.png')` → `/art/items/potion.png` locally, `/Pokemon-Ascendant/art/items/potion.png` on Pages. */
export const asset = (path: string): string => `${BASE}${path.replace(/^\/+/, '')}`;
