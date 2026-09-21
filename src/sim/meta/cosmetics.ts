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

/** §8.4.4 — the price by kind. Cheap on purpose: a Level-1 wallet holds two Tokens after its first level. */
export const COSMETIC_PRICE: Record<CosmeticKind, number> = { title: 2, avatar: 3, frame: 2 };

export const COSMETICS: readonly CosmeticDef[] = [
  // Titles — the four the reward track used to hand out at Levels 19/23/27/29 (v0.6.0), now bought in any order.
  { id: 'title-ace-trainer', kind: 'title', name: 'Ace Trainer', blurb: 'Worn under your name on the Trainer Card.' },
  { id: 'title-pokedex-scholar', kind: 'title', name: 'Pokédex Scholar', blurb: 'For the one who reads the intents before the fight.' },
  { id: 'title-veteran', kind: 'title', name: 'Veteran', blurb: 'For the one who has lost runs and come back.' },
  { id: 'title-champion-in-waiting', kind: 'title', name: 'Champion in Waiting', blurb: 'For the one who knows how this ends.' },
  // Avatars — the eight trainer classes of Region 1, the sprites the map already uses for their trainers.
  { id: 'avatar-youngster', kind: 'avatar', name: 'Youngster', blurb: 'Shorts, all year.', sprite: 'youngster' },
  { id: 'avatar-lass', kind: 'avatar', name: 'Lass', blurb: 'Bows and a Normal-type or two.', sprite: 'lass' },
  { id: 'avatar-bug-catcher', kind: 'avatar', name: 'Bug Catcher', blurb: 'Net, jar, Viridian Forest.', sprite: 'bug-catcher' },
  { id: 'avatar-camper', kind: 'avatar', name: 'Camper', blurb: 'Route 3, tent pitched.', sprite: 'camper' },
  { id: 'avatar-picnicker', kind: 'avatar', name: 'Picnicker', blurb: 'Route 3, basket packed.', sprite: 'picnicker' },
  { id: 'avatar-hiker', kind: 'avatar', name: 'Hiker', blurb: 'Rock-solid, in every sense.', sprite: 'hiker' },
  { id: 'avatar-swimmer', kind: 'avatar', name: 'Swimmer', blurb: 'Route 19, come in.', sprite: 'swimmer' },
  { id: 'avatar-ace-trainer', kind: 'avatar', name: 'Ace Trainer', blurb: 'The last trainer before the Gym.', sprite: 'acetrainer' },
  // Frames — the three balls above the Poké Ball, as a border around the card's head.
  { id: 'frame-great', kind: 'frame', name: 'Great Ball frame', blurb: 'Blue and red, the second ball.' },
  { id: 'frame-ultra', kind: 'frame', name: 'Ultra Ball frame', blurb: 'Black and gold, the third ball.' },
  { id: 'frame-master', kind: 'frame', name: 'Master Ball frame', blurb: 'Purple. There is only one.' },
];

export const cosmeticById = (id: string): CosmeticDef | undefined => COSMETICS.find((c) => c.id === id);

/** The four v0.6.0 titles were stored by name; the id each became. */
export const TITLE_ID_BY_NAME: Record<string, string> = Object.fromEntries(COSMETICS.filter((c) => c.kind === 'title').map((c) => [c.name, c.id]));
