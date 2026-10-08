// v0.9.5 — every retired move id and the Gen I move that takes its place wherever it was named (tutors, egg moves,
// trainer kits, scenarios). A suffixed id (`rest-s`, `rock-slide-m`) is its Gen I move.
export const REMAP = {
  roost: 'recover', 'roost-plus': 'recover', 'vine-lash': 'razor-leaf', 'petal-blizzard': 'petal-dance', 'power-whip': 'razor-leaf',
  'sweet-scent': 'stun-spore', 'dragon-claw': 'slash', 'flame-wheel': 'fire-punch', 'flame-wheel-r': 'fire-punch', 'dragon-claw-plus': 'slash',
  'aqua-jet': 'bubble', 'hydro-crash': 'waterfall', 'aqua-ring': 'rest', 'aqua-ring-plus': 'rest', 'aqua-fortress': 'light-screen',
  'bug-bite': 'leech-life', 'bug-bite-plus': 'twineedle', 'silk-bind': 'string-shot', 'pin-shot': 'pin-missile', 'harden-plus': 'harden',
  'powder-spread': 'sleep-powder', 'silver-wind': 'gust', tailwind: 'agility', 'tailwind-plus': 'agility', 'feather-dance': 'growl',
  'aerial-ace': 'wing-attack', hurricane: 'sky-attack', magnitude: 'earthquake', 'rock-blast': 'rock-throw', rollout: 'defense-curl',
  'stealth-rock': 'leer', 'stone-edge': 'rock-slide', 'rock-polish': 'sharpen', 'body-press': 'body-slam', crunch: 'hyper-fang',
  'sucker-punch': 'quick-attack', 'psych-up': 'meditate', flail: 'rage', 'giga-drain': 'mega-drain', moonlight: 'recover',
  'moonlight-plus': 'recover', 'fire-fang': 'fire-punch', 'heat-wave': 'flamethrower', 'water-pulse': 'bubble-beam', 'rapid-spin': 'withdraw',
  'aqua-tail-g': 'waterfall', brine: 'bubble-beam', 'sludge-bomb': 'sludge', 'poison-fang': 'poison-sting', 'poison-jab': 'sludge',
  'cross-poison': 'sludge', 'leech-life-plus': 'leech-life', 'mud-slap': 'sand-attack', 'mud-shot': 'sand-attack', 'mud-bomb': 'dig',
  bulldoze: 'earthquake', 'iron-tail': 'slam', 'vital-throw': 'seismic-toss', 'cross-chop': 'karate-chop', 'close-combat': 'submission',
  'dynamic-punch': 'submission', 'bulk-up': 'meditate', 'bulk-up-plus': 'meditate', 'brick-break': 'karate-chop', 'belly-drum-p': 'meditate',
  'zen-headbutt': 'headbutt', 'air-slash': 'wing-attack', 'will-o-wisp': 'confuse-ray', 'will-o-wisp-plus': 'confuse-ray', synthesis: 'recover',
  charm: 'growl', 'iron-defense': 'barrier', 'skull-bash-plus': 'skull-bash', 'bug-buzz': 'pin-missile', 'poison-sting-plus': 'poison-sting',
  'hypnosis-plus': 'hypnosis', 'amnesia-plus': 'amnesia', 'flare-blitz': 'fire-blast', 'brave-bird': 'sky-attack', 'fell-stinger-v': 'twineedle',
  'aromatic-mist': 'growth', 'aromatherapy-m': 'haze', aromatherapy: 'haze', safeguard: 'mist', 'wide-guard': 'light-screen',
  'metal-claw': 'slash', wish: 'recover', 'powder-snow': 'aurora-beam', 'ice-shard': 'ice-punch', 'icy-wind': 'aurora-beam',
  'icicle-spear': 'ice-punch', spark: 'thunder-shock', 'charge-beam': 'thunder-shock', discharge: 'thunderbolt', 'volt-tackle': 'thunder-punch',
  'zap-cannon': 'thunder', 'extreme-speed': 'quick-attack', 'sludge-wave': 'sludge', 'dragon-pulse': 'dragon-rage', 'mach-punch': 'comet-punch',
  'sky-uppercut': 'high-jump-kick', 'leaf-blade': 'razor-leaf', 'signal-beam': 'psybeam', 'ancient-power': 'rock-slide', 'heavy-slam': 'body-slam',
  'bone-rush': 'bonemerang', 'air-cutter': 'gust', 'sky-drop': 'fly', 'shadow-punch': 'lick', 'shadow-ball': 'night-shade',
  extrasensory: 'psybeam', 'calm-mind': 'amnesia', psystrike: 'psychic', 'hyper-voice': 'swift', 'aura-sphere': 'psychic',
  'earth-power': 'earthquake', 'drill-run': 'dig', 'power-gem': 'rock-slide', twister: 'dragon-rage', outrage: 'thrash',
  'lava-plume': 'flamethrower', 'x-scissor': 'slash', megahorn: 'horn-attack', 'gunk-shot': 'sludge', ingrain: 'leech-seed',
  venoshock: 'acid', revenge: 'counter', 'rage-fist': 'rage', 'last-resort': 'take-down', 'iron-head-a': 'headbutt',
  'glacial-song': 'ice-beam', 'belly-drum-s': 'meditate', 'leaf-tornado': 'razor-leaf', 'seed-bomb': 'razor-leaf', 'aqua-tail': 'waterfall',
  'spore-cloud': 'spore', 'dragon-tail': 'slam', 'circle-throw': 'seismic-toss', psyshock: 'psychic', 'leek-slash': 'cut', 'sticky-web': 'string-shot',
  'giga-impact-v': 'hyper-beam', 'sheer-cold-l': 'blizzard', 'leaf-storm-s': 'razor-leaf', 'hi-jump-kick': 'high-jump-kick', softboiled: 'soft-boiled',
  'transform-d': 'transform', 'rest-s': 'rest', 'fissure-d': 'fissure', 'guillotine-k': 'guillotine', 'slam-k': 'slam', 'splash-m': 'splash',
  'tri-attack-d': 'tri-attack', 'sludge-bomb-w': 'sludge', 'horn-drill-r': 'horn-drill', 'shadow-ball-h': 'night-shade',
};

export function remap(id, known) {
  if (known.has(id)) return id;
  if (REMAP[id]) return REMAP[id];
  const stem = id.replace(/-[a-z]$/, '');
  if (known.has(stem)) return stem;
  return null;
}
