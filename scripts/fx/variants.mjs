// Re-palettes of pret's battle-animation sprites, for the Gen IV moves FireRed has no animation for. The GBA does the
// same (Ice Punch is Fire Punch's fist in another palette): each colour keeps its lightness and takes a new hue.
// `hue` is the OKLCh hue in degrees (red 29, orange 60, yellow 105, green 142, cyan 195, blue 264, violet 300,
// magenta 328); `chroma` scales the colour's own chroma, `minChroma` adds to it (to colour a grey), `light` scales
// lightness and `lift` adds to it.
export const VARIANTS = {
  'slash@dark': { base: 'slash', hue: 300, chroma: 0.7, light: 0.62 },
  'cut@psychic': { base: 'cut', hue: 340, chroma: 1.1 },
  'claw-slash@ghost': { base: 'claw-slash', hue: 300, chroma: 1, light: 0.8 },
  'horn-hit@poison': { base: 'horn-hit', hue: 318, chroma: 1 },
  'cross-impact@poison': { base: 'cross-impact', hue: 318, chroma: 1 },
  'shadow-ball@grass': { base: 'shadow-ball', hue: 142, chroma: 1.3, light: 1.5, lift: 0.12 },
  'air-wave@vacuum': { base: 'air-wave', hue: 230, minChroma: 0.07 },
  'metal-sound-waves@bug': { base: 'metal-sound-waves', hue: 130, chroma: 1.3, minChroma: 0.04 },
  'noise-line@dark': { base: 'noise-line', hue: 300, chroma: 0.6, light: 0.55 },
  'protect@gold': { base: 'protect', hue: 95, chroma: 1 },
  'guard-ring@water': { base: 'guard-ring', hue: 250, chroma: 1.4, minChroma: 0.04 },
  'fire-plume@earth': { base: 'fire-plume', hue: 62, chroma: 0.55, light: 0.78 },
  'explosion@mud': { base: 'explosion', hue: 62, chroma: 0.45, light: 0.7 },
  'bird@brave': { base: 'bird', hue: 255, minChroma: 0.09 },
  'white-shadow@shade': { base: 'white-shadow', hue: 300, minChroma: 0.05, light: 0.3 },
  'meteor@draco': { base: 'meteor', hue: 300, chroma: 1, light: 0.85 },
  'circle-of-light@zen': { base: 'circle-of-light', hue: 300, minChroma: 0.1, light: 0.9 },
  'punch-impact@dark': { base: 'punch-impact', hue: 300, chroma: 0.6, light: 0.55 },
  'impact@dark': { base: 'impact', hue: 300, chroma: 0.5, minChroma: 0.06, light: 0.5 },
  'fire-plume@lava': { base: 'fire-plume', hue: 40, chroma: 1.1 },
  'rocks@stone': { base: 'rocks', hue: 250, chroma: 0.3, light: 0.9 },
  'vine@power': { base: 'vine', hue: 142, chroma: 1.2 },
  'sparkle-1@stone': { base: 'sparkle-1', hue: 70, chroma: 0.4 },
};
