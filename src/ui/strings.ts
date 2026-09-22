import type { RejectReason } from '@/sim';

// User-facing strings for the combat screen, gathered for the v0.9 localisation pass.
export const REJECT_TEXT: Record<RejectReason, string> = {
  'no-fleeing-a-gym': 'There is no running from a Gym Leader.',
  'not-action-phase': 'Not now.',
  'lead-pick-pending': 'Choose a new Lead first.',
  'card-not-in-hand': 'That card is not in your hand.',
  'owner-fainted': 'That Pokémon has fainted.',
  'owner-asleep': 'That Pokémon is asleep — its cards are offline this turn.',
  'owner-frozen': 'That Pokémon is frozen solid.',
  'melee-needs-lead': 'Melee cards play from the Lead slot. Swap it in or use a Step-Forward card.',
  'not-enough-ap': 'Not enough AP.',
  'no-enemy': 'No target.',
  'target-fainted': 'That Pokémon has fainted.',
  'target-is-lead': 'Already the Lead.',
  'target-frozen': 'Frozen Pokémon cannot swap.',
  'lead-frozen': 'Your Lead is frozen in place.',
  'invalid-index': 'Invalid target.',
  'not-wild': 'You can only catch wild Pokémon.',
  'no-balls': 'No Poké Balls left.',
  'nothing-to-cure': 'Nothing to cure.',
  'choice-locked': 'Its held item will not let it play that.',
};

export const STATUS_LABEL: Record<string, string> = {
  burn: 'Burned',
  poison: 'Poisoned',
  paralysis: 'Paralysed',
  sleep: 'Asleep',
  freeze: 'Frozen',
  confusion: 'Confused',
};

export const STATUS_HINT: Record<string, string> = {
  burn: '−25% Attack · loses HP each turn',
  poison: '−15% Defense · loses HP each turn',
  paralysis: 'Its cards cost +1 AP (3 turns)',
  sleep: 'Its cards are offline next turn',
  freeze: 'Cards offline · position locked · ×1.5 Fire damage',
  confusion: 'Discards 1 random card per turn (3 turns)',
};

export const INTENT_LABEL: Record<string, string> = {
  attack: 'Attack',
  cleave: 'Cleave · all slots',
  backstrike: 'Backstrike',
  buff: 'Powering up',
  debuff: 'Debuff',
  stall: 'Recovering',
  status: 'Status',
  unknown: 'Unknown',
  incapacitated: "Can't act",
};

export const EFFECTIVENESS_LABEL: Record<string, string> = {
  immune: 'no effect',
  quarter: '×¼',
  half: '×½',
  neutral: '',
  double: '×2 super effective',
  quad: '×4 super effective',
};

// ---- Run layer (§2) -------------------------------------------------------------------------------------

/**
 * §5.8 — what kind of fight this is, for the header chip. A ternary chain was here and it read 'Gym' for an
 * Elite, because 'elite' fell off the end of it. A table cannot fall off its end.
 */
export const ENCOUNTER_LABEL: Record<string, string> = {
  wild: 'Wild',
  trainer: 'Trainer',
  elite: 'Elite',
  boss: 'Gym',
};

export const NODE_LABEL: Record<string, string> = {
  wild: 'Wild Area',
  trainer: 'Trainer',
  elite: 'Elite Trainer',
  'elite-wild': 'Elite Wild',
  aid: 'Field nurse',
  merchant: 'Merchant',
  mystery: 'Mystery',
  gym: 'Gym',
};

export const NODE_HINT: Record<string, string> = {
  wild: 'A wild Pokémon. Beat it for XP, or throw a ball and take it with you.',
  trainer: 'A trainer with a full team. More XP than a wild fight, and no catching.',
  elite: 'Two Pokémon, both with a second phase. The hardest fight before the Gym — and a relic for winning it.',
  'elite-wild': 'A boss-sized wild Pokémon. Catch it and it joins you; beat it and you take a relic. Never both.',
  aid: 'No fight, so you can walk in with nobody standing.',
  merchant: 'No fight. Once you walk on, the cart is gone.',
  mystery: 'No fight. A scene and a choice, with every outcome written on the button before you press it.',
  gym: 'The Gym Leader. Beat it and the next town is yours to rest in.',
};

export const RUN_REJECT_TEXT: Record<string, string> = {
  'ability-locked': 'This is the line\'s hidden ability — it opens at Bond rank 3 (Veteran).',
  'not-on-map': 'Finish what you are doing first.',
  'node-unreachable': 'You cannot get there from here.',
  'wrong-phase': 'Not now.',
  'no-healthy-pokemon': 'Every Pokémon in your Box has fainted. Find a Center.',
  'team-too-large': 'Three Pokémon can be Active at once.',
  'unknown-pokemon': 'That Pokémon is not in your Box.',
  'box-not-full': 'There is room in the Box already.',
  'unknown-branch': 'That evolution is not on offer.',
  'move-not-in-pool': 'That Pokémon has not learned that move.',
  'too-many-moves': 'Four cards is the budget. Take one out first.',
  'empty-kit': 'A Pokémon needs at least one card.',
  'incompatible-tm': 'That TM does not work on this Pokémon.',
  'no-such-tm': 'You are not carrying that TM.',
  'already-known': 'It already knows that.',
  'not-on-tutor-list': 'The tutor does not teach that at this stage.',
  'ability-not-in-pool': 'That ability is not in this species’ pool.',
  'no-dojo-credit': 'The Dojo has nothing left to offer this visit.',
  'cannot-afford': 'Not enough money.',
  'already-sold': 'That one is sold.',
  'not-in-city': 'Only in a town.',
  'building-closed': 'That door is not open yet.',
  'not-offered': 'That is not on offer.',
  'no-such-item': 'You are not carrying that.',
};

// §6.3.4 — the three archetypes, in the words the Evolution screen uses.
export const ARCHETYPE_LABEL: Record<string, string> = {
  vanguard: 'Vanguard',
  specialist: 'Specialist',
  support: 'Support',
};

export const ARCHETYPE_HINT: Record<string, string> = {
  vanguard: 'Melee, high power, anchored in the Lead slot. Step-Forward and Step-Backward show up here.',
  specialist: 'Ranged and coverage, with status riders. Works from the bench without losing much.',
  support: 'Defensive and utility: healing, shields and stat stages for whoever is holding the front.',
};

// §2.11.4 — a City's doors, in the lobby's words. The door ids are the UI's: the shop is one sim building
// (`mart`) drawn as the Poké Mart in the town and the Department Store in the city, and the doors that are
// not open yet have no sim building at all.
export type CityDoor = 'center' | 'mart' | 'department-store' | 'dojo' | 'ring' | 'safari' | 'game-corner' | 'black-market' | 'gate';
/** Every door but the gate, which is named by where it leads ("To Region 2"), not by a fixed word. */
export type CityBuildingDoor = Exclude<CityDoor, 'gate'>;

export const CITY_DOOR_LABEL: Record<CityBuildingDoor, string> = {
  center: 'Pokémon Center',
  mart: 'Poké Mart',
  'department-store': 'Department Store',
  dojo: 'Dojo',
  ring: 'Challenge Ring',
  safari: 'Safari Zone',
  'game-corner': 'Game Corner',
  'black-market': 'Black Market',
};

export const CITY_DOOR_HINT: Record<CityDoor, string> = {
  center: 'Heals the whole Box and cures every status, free, as often as you like. Therapy takes Trauma off, for a price.',
  mart: 'A shelf picked for your team, and Poké Balls. Dearer than the merchant; buys held items back.',
  'department-store': 'The biggest shelf of the run, and Poké Balls. Dearer than the merchant; buys held items back.',
  dojo: 'Tutor moves off the learnset and passive abilities, as many as you can pay for.',
  ring: 'A ladder of rivals. See the next one, then cash out or climb. You only get one go per visit.',
  safari: 'A park of Pokémon the routes do not have, caught with its own rules.',
  'game-corner': 'The Wheel and the Slots, the odds printed beside each.',
  'black-market': 'Beneath the Game Corner. Rare stock, no questions, once per visit.',
  gate: 'Choose one rule for the next Region, then set off. The town stays behind.',
};

/** §2.11.0 — what a door in development says when you walk in anyway. */
export const CITY_DOOR_SOON = 'Not open yet — this door is in development.';
