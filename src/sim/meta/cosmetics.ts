// §8.4.4 — cosmetics: what the Trainer's Corner sells. A title on the card, a trainer avatar beside it, a
// frame around it. None of it touches a run; a cosmetic is the one purchase that is only ever a purchase.
//
// Lives in code rather than content JSON because nothing in the sim reads it: the account owns a list of ids
// and one worn id per kind, and the Hub draws them. The ids are stable — a save holds them.

export type CosmeticKind = 'title' | 'avatar' | 'frame';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** One line on the shelf. */
  blurb: string;
  /** Avatars: the trainer-class sprite under `public/art/trainers/`. */
  sprite?: string;
}

/** §8.4.4 — the price by kind: about half a run's Tokens, so a run that buys nothing else still buys a look. */
export const COSMETIC_PRICE: Record<CosmeticKind, number> = { title: 6, avatar: 8, frame: 6 };

export const COSMETICS: readonly CosmeticDef[] = [
  // Titles — the four the reward track used to hand out (v0.6.0). Some rows are Journal prizes, never sold (`journal.ts`).
  { id: 'title-ace-trainer', kind: 'title', name: 'Ace Trainer', blurb: 'Worn under your name on the Trainer Card.' },
  { id: 'title-pokedex-scholar', kind: 'title', name: 'Pokédex Scholar', blurb: 'For the one who reads the intents before the fight.' },
  { id: 'title-veteran', kind: 'title', name: 'Veteran', blurb: 'For the one who has lost runs and come back.' },
  { id: 'title-champion-in-waiting', kind: 'title', name: 'Champion in Waiting', blurb: 'For the one who knows how this ends.' },
  { id: 'title-collector', kind: 'title', name: 'Collector', blurb: 'For the one who opens every parcel.' },
  { id: 'title-cooltrainer', kind: 'title', name: 'Cooltrainer', blurb: 'For the one who makes it look easy.' },
  { id: 'title-dragon-tamer', kind: 'title', name: 'Dragon Tamer', blurb: 'For the one who waits for Dratini.' },
  { id: 'title-hex-maniac', kind: 'title', name: 'Hex Maniac', blurb: 'For the one who wins on status.' },
  { id: 'title-route-walker', kind: 'title', name: 'Route Walker', blurb: 'For the one who takes the long lane.' },
  // Avatars — the eight trainer classes of Region 1, the sprites the map already uses for their trainers.
  { id: 'avatar-youngster', kind: 'avatar', name: 'Youngster', blurb: 'Shorts, all year.', sprite: 'youngster' },
  { id: 'avatar-lass', kind: 'avatar', name: 'Lass', blurb: 'Bows and a Normal-type or two.', sprite: 'lass' },
  { id: 'avatar-bug-catcher', kind: 'avatar', name: 'Bug Catcher', blurb: 'Net, jar, Viridian Forest.', sprite: 'bug-catcher' },
  { id: 'avatar-camper', kind: 'avatar', name: 'Camper', blurb: 'Route 3, tent pitched.', sprite: 'camper' },
  { id: 'avatar-picnicker', kind: 'avatar', name: 'Picnicker', blurb: 'Route 3, basket packed.', sprite: 'picnicker' },
  { id: 'avatar-hiker', kind: 'avatar', name: 'Hiker', blurb: 'Rock-solid, in every sense.', sprite: 'hiker' },
  { id: 'avatar-swimmer', kind: 'avatar', name: 'Swimmer', blurb: 'Route 19, come in.', sprite: 'swimmer' },
  { id: 'avatar-ace-trainer', kind: 'avatar', name: 'Ace Trainer', blurb: 'The last trainer before the Gym.', sprite: 'acetrainer' },
  // Sold at the Corner: the classes of Regions 2 and 3.
  { id: 'avatar-battle-girl', kind: 'avatar', name: 'Battle Girl', blurb: 'Fists first.', sprite: 'battlegirl' },
  { id: 'avatar-black-belt', kind: 'avatar', name: 'Black Belt', blurb: 'The Dojo, every morning.', sprite: 'blackbelt' },
  { id: 'avatar-engineer', kind: 'avatar', name: 'Engineer', blurb: 'The Power Plant runs on him.', sprite: 'engineer' },
  { id: 'avatar-gambler', kind: 'avatar', name: 'Gambler', blurb: 'Red or black.', sprite: 'gambler' },
  { id: 'avatar-hex-maniac', kind: 'avatar', name: 'Hex Maniac', blurb: 'The tower, after dark.', sprite: 'hexmaniac' },
  { id: 'avatar-pokefan', kind: 'avatar', name: 'Poké Fan', blurb: 'Here for the Pikachu.', sprite: 'pokefan' },
  { id: 'avatar-scientist', kind: 'avatar', name: 'Scientist', blurb: "One of Professor Oak's.", sprite: 'scientist' },
  { id: 'avatar-swimmer-m', kind: 'avatar', name: 'Swimmer', blurb: 'Out past the shelf.', sprite: 'swimmerm' },
  // Frames — the three balls above the Poké Ball, as a border around the card's head.
  { id: 'frame-great', kind: 'frame', name: 'Great Ball frame', blurb: 'Blue and red, the second ball.' },
  { id: 'frame-ultra', kind: 'frame', name: 'Ultra Ball frame', blurb: 'Black and gold, the third ball.' },
  { id: 'frame-master', kind: 'frame', name: 'Master Ball frame', blurb: 'Purple. There is only one.' },
];

export const cosmeticById = (id: string): CosmeticDef | undefined => COSMETICS.find((c) => c.id === id);

/** The four v0.6.0 titles were stored by name; the id each became. */
export const TITLE_ID_BY_NAME: Record<string, string> = Object.fromEntries(COSMETICS.filter((c) => c.kind === 'title').map((c) => [c.name, c.id]));
