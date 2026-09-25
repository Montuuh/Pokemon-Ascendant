import type { RejectReason } from '@/sim';

// User-facing strings for the combat screen, gathered for the v0.9 localisation pass.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 2026-09-20 → 20 Sep 2026. The About timeline and the What's new page. In the game's language (D10), not the
 * browser's — a Spanish browser printed "23 sept 2026" beside English text — and spelled out here rather than by
 * `toLocaleDateString`, whose English month is "Sep" or "Sept" depending on the browser's ICU.
 */
export function niceDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${Number(m[3])} ${month} ${m[1]}` : iso;
}

/** docs/release-doctrine.md R1 — a major says what it is in words too; a minor and a patch say it by size. */
export const MAJOR_RELEASE_LABEL = 'Major release';

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
  sleep: 'Its cards are offline next turn · no new Sleep or Freeze while asleep',
  freeze: 'Cards offline · position locked · ×1.5 Fire damage · no new Sleep or Freeze while frozen',
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
  'incompatible-stone': 'That stone does nothing for this Pokémon.',
  'stone-too-early': 'Not yet — the stone works on this Pokémon from a higher level.',
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
  'ring-closed': 'The ladder is done for this visit.',
  'nothing-to-restock': 'Nothing else to stock on this floor.',
  'bad-stake': 'That stake is not on the table.',
  'safari-closed': 'The Safari is done for this visit.',
  'bad-tile': 'Not from here.',
  'no-ap': 'Nothing left this turn — end it.',
  'market-closed': 'Nothing more there for you this visit.',
  'bad-payment': 'They will not take that.',
  'legendary-cap': 'You already carry as many Legendary relics as a run can hold.',
};

/** §2.11.0 — the warning before walking out of a building that closes behind you. */
export const LEAVE_WARNING = {
  title: 'Leave for good?',
  stay: 'Stay',
  leave: 'Leave',
  cashOut: (name: string, banked: number) =>
    banked ? `Take the ${banked} ₽ and go. The ${name} closes behind you for this visit.` : `Walk away with nothing. The ${name} closes behind you for this visit.`,
  safari: 'The park closes behind you; your Safari Balls stay here.',
  market: 'The door locks behind you for this visit.',
};

/** §2.11.5 — the Game Corner room and its machines' panels. */
export const CASINO_TEXT = {
  room: 'The Game Corner',
  slots: 'Slots',
  slotsLabel: 'Slot machines',
  roulette: 'Roulette',
  rouletteLabel: 'Roulette table',
  wheelTitle: 'The Roulette',
  slotsTitle: 'The Slots',
  odds: 'The odds',
  oddsOf: (machine: string) => `${machine}: the odds`,
  stepAway: 'Step away',
  landed: (m: number, payout: number) => `It landed on ×${m}: ${payout} ₽.`,
  lost: 'It landed on ×0. The stake is gone.',
};

/** §2.9.4.1 — the Ring's buttons. */
export const RING_TEXT = {
  back: 'Back to town',
  stepIn: 'Step in',
  stepInLabel: (fee: number, afford: boolean) => `Step in, ${fee} Poké Dollars${afford ? '' : ', not enough money'}`,
  cashOut: 'Cash out',
  walkAway: 'Walk away',
  fight: (rung: number) => `Fight rung ${rung}`,
  banked: 'Banked',
};

/** §2.11.6 — Team Rocket's Black Market, and the Game Corner's back wall that hides it. */
export const MARKET_TEXT = {
  title: 'Black Market',
  grunt: 'Hey! Keep away from that poster!',
  gruntName: 'A Rocket Grunt',
  poster: 'A poster',
  justPoster: 'Just a poster, this time.',
  found: 'There’s a switch behind the poster!',
  push: 'Push it',
  leaveIt: 'Leave it',
  stairs: 'Stairs down',
  stairsShut: 'The hatch is locked. Team Rocket will not open it twice in one visit.',
  hatch: 'A locked steel hatch',
  hatchTitle: 'A locked steel hatch',
  up: 'Back upstairs',
  counters: 'The counters',
  dealt: 'Dealt this visit',
  trader: { name: 'The Trader', line: 'Fresh stock, no questions asked.' },
  fence: { name: 'The Fence', line: 'Candy for the road. And I buy what you don’t need.' },
  gambler: { name: 'The Gambler', line: 'Put up a few trinkets. Win, and the good one’s yours.' },
  showcase: { name: 'The Executive', line: 'The rarest thing in Kanto. Three of your Pokémon.' },
  traded: 'Pleasure doing business.',
  soldOut: 'Sold out',
  pickGive: 'Pick one of yours to hand over',
  trade: 'Trade',
  tradeFor: (give: string, get: string, level: number) => `Trade ${give} for ${get}, Lv ${level}`,
  candy: 'Rare Candy',
  candyFor: (name: string, level: number) => `A Rare Candy for ${name} — Lv ${level}`,
  pickMon: 'Pick a Pokémon',
  buys: 'The Fence buys',
  noRelics: 'You carry no relics.',
  sellArmed: 'Sell?',
  stakeUpTo: (n: number) => `Stake up to ${n} of your relics`,
  noStake: 'You carry no relics to stake.',
  won: (pct: number, name: string) => `At ${pct} %, you won — the ${name} is yours.`,
  lost: (pct: number) => `At ${pct} %, the house won. The stake is gone.`,
  wagerOn: (name: string) => `Wager on the ${name}`,
  pickTarget: 'Pick the relic to win',
  priceTag: (n: number) => `${n} Pokémon`,
  pickThree: (n: number, of: number) => `Pick ${of} to hand over — ${n} of ${of}`,
  keepOne: 'You must keep at least one Pokémon.',
  handOver: (names: string) => `Hand over ${names}`,
  pickN: (n: number) => `Pick ${n}`,
  dealTitle: 'Hand them over?',
  dealBody: (names: string, relic: string) => `${names} go to Team Rocket for the ${relic}, and the door locks behind you.`,
  deal: 'Deal',
};

/** §2.11.6 — the Safari tiers and traits, in the words on the lineup cards and the board. */
export const SAFARI_TIER_LABEL: Record<string, string> = { common: 'Easy', uncommon: 'Tricky', rare: 'Rare' };
export const SAFARI_TRAIT: Record<string, { label: string; hint: string }> = {
  'keen-eyed': { label: 'Keen-eyed', hint: 'Looks four tiles ahead, not three.' },
  quick: { label: 'Quick', hint: 'Walks two tiles a turn.' },
  alert: { label: 'Alert', hint: 'Hears you on the tiles right beside it, grass or not — unless it is eating.' },
  'sharp-eared': { label: 'Sharp-eared', hint: 'Hears you within two tiles, grass or not — unless it is eating.' },
  water: { label: 'In its pond', hint: 'It never leaves the water. Reach it from the open shore.' },
};
/** §2.11.6 — the stalk's own words. */
export const SAFARI_TEXT = {
  closed: 'The park is closed this visit. It will be open in the next town.',
  exposed: 'It will see you there',
  backAway: 'Back away',
  sure: (name: string) => `Sure? The ${name} is gone for good`,
  outOfReach: 'out of reach',
  missed: (pct: number) => `It broke out of a ${pct} % ball.`,
  eating: (turns: number) => `Eating, ${turns} more turn${turns === 1 ? '' : 's'}`,
  held: 'Stopped by the rock',
  modes: { move: 'Move', bait: 'Bait', rock: 'Rock' } as Record<string, string>,
  tile: { g: 'Tall grass', o: 'Open ground', r: 'Boulder', w: 'Water' } as Record<string, string>,
};
/** §2.11.6 — how a stalk ended, on its lineup card. */
export const SAFARI_RESULT_LABEL: Record<string, string> = { caught: 'Caught', fled: 'Bolted', left: 'Left', closed: 'Missed' };

/** §2.11.2 — the Department Store's floors, in the words on the lift buttons. */
export const STORE_FLOOR_LABEL: Record<string, string> = {
  consumables: 'Medicine',
  tms: 'TMs',
  'held-items': 'Held items',
  relics: 'Relics',
  rare: 'Rare counter',
};

/** §2.11.5 — the Slots' faces, named for screen readers. */
export const SLOT_FACE_LABEL: Record<string, string> = {
  cherry: 'Cherry',
  bell: 'Bell',
  bar: 'BAR',
  seven: 'Seven',
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
// (`mart`) drawn as the Poké Mart in the town and the Department Store in the city, the Ring is named by its City
// (`CITIES[id].ringName`), and the doors that are not open yet have no sim building at all. The Black Market has
// no door: it is a secret inside the Game Corner (§2.11.6).
export type CityDoor = 'center' | 'mart' | 'department-store' | 'dojo' | 'ring' | 'extra-moves' | 'safari' | 'game-corner' | 'gate';
/** Every door but the gate, which is named by where it leads ("To Region 2"), not by a fixed word. */
export type CityBuildingDoor = Exclude<CityDoor, 'gate'>;

export const CITY_DOOR_LABEL: Record<CityBuildingDoor, string> = {
  center: 'Pokémon Center',
  mart: 'Poké Mart',
  'department-store': 'Department Store',
  dojo: 'Dojo',
  // The fallback name only: every City names its own Ring (`CITIES[id].ringName`).
  ring: 'Challenge Ring',
  'extra-moves': 'Extra moves',
  safari: 'Safari Zone',
  'game-corner': 'Game Corner',
};

export const CITY_DOOR_HINT: Record<CityDoor, string> = {
  center: 'Heals the whole Box and cures every status, free, as often as you like. Therapy takes Trauma off, for a price.',
  mart: 'A shelf picked for your team, and Poké Balls. Dearer than the merchant; buys held items back.',
  'department-store': 'The biggest shelf of the run, and Poké Balls. Dearer than the merchant; buys held items back.',
  dojo: 'Tutor moves off the learnset and passive abilities, as many as you can pay for.',
  ring: 'A ladder of rivals for a fee. See the next one, then fight or cash out — nothing heals between rungs, and a lost rung loses what the ladder paid. However it ends, your team walks out healed. Once per visit.',
  'extra-moves': 'A catalogue of moves beyond each species\' tutor list.',
  safari: 'A park of Pokémon the routes never offer. Buy a ticket, stalk one through the grass, and throw when the odds are yours. Once per visit.',
  'game-corner': 'Slot machines and roulette tables, every outcome and its odds printed on the machine you play.',
  gate: 'Choose one rule for the next Region, then set off. The town stays behind.',
};

/** §2.11.0 — what a door in development says when you walk in anyway. */
export const CITY_DOOR_SOON = 'Not open yet — this door is in development.';

/** §2.11.6 — the Safari's How to play: one idea a page, in the order a first stalk meets them. */
type GuideNumbers = { balls: number; clock: number; ap: number };
export const SAFARI_GUIDE = {
  title: 'How to play: the Safari',
  button: 'How to play',
  skip: 'Skip',
  done: 'Let’s go',
  pages: [
    {
      title: 'Pick one to stalk',
      body: () => 'Today’s Pokémon are on show before you pay. The rings are how many alarms each will take: an Easy one forgives a mistake or two, a Rare bolts at its first — but it is one no route will ever offer you.',
    },
    {
      title: 'Hide in the tall grass',
      body: () => 'It notices you on open ground, or on the tile right in front of it. Anywhere else in the tall grass you are hidden — even while it looks your way.',
    },
    {
      title: 'Read its next move',
      body: () => 'The dots are where it walks this turn; the yellow tiles are where you can step. Red with an eye: it would see you there when the turn ends. Pale red: it looks there, but the grass hides you.',
    },
    {
      title: 'Bait and rocks',
      body: () => 'Bait draws it over to eat for two turns, head down — it looks one tile ahead and hears nothing. A rock stops it for a turn, facing the noise, so you can walk in behind.',
    },
    {
      title: 'One throw, the whole turn',
      body: () => 'End a turn within two tiles of it, then spend the next one throwing. The odds are on the button: closer, from behind, never seen and while it eats all raise them. A miss is an alarm.',
    },
    {
      title: 'Mind the balls and the clock',
      body: (n: GuideNumbers) =>
        `This ticket buys ${n.balls} Safari Balls and ${n.clock} turns for the whole visit, shared by every stalk. You have ${n.ap} actions a turn: a step, a bait or a rock costs one. One or two catches is a good day.`,
    },
  ] as { title: string; body: (n: GuideNumbers) => string }[],
};

/** §2.9.4.1 — the Ring's How to play: one idea a page, in the order a first climb meets them. */
type RingNumbers = { name: string; rungs: number; fee: number; top: string };
export const RING_GUIDE = {
  title: (name: string) => `How to play: the ${name}`,
  button: 'How to play',
  skip: 'Skip',
  done: 'Got it',
  next: 'Next',
  back: 'Back',
  pagesLabel: 'Pages',
  relic: (rare: boolean) => (rare ? 'Rare relic' : 'Relic'),
  top: (rare: boolean) => (rare ? 'a Rare relic, one of three' : 'a relic, one of three'),
  pages: [
    {
      title: 'A ladder of rivals',
      body: (n: RingNumbers) => `${n.rungs} rungs, each a trainer stronger than the last. Pay ${n.fee} ₽ to step in; every rung below the top pays money, and the top one pays ${n.top}.`,
    },
    {
      title: 'See them before you fight',
      body: () => 'The next rival and their whole team are always on show — before you pay, and before every rung.',
    },
    {
      title: 'Nothing heals between rungs',
      body: () => 'Your team walks into each rung as the last one left it: the HP, the statuses, the fainted. Pick who fights next with that in mind.',
    },
    {
      title: 'Cash out, or climb',
      body: () => 'After every rung you win, take what the ladder has banked and leave — or fight on for more. Lose a rung and the bank is lost with it.',
    },
    {
      title: 'The run never ends here',
      body: (n: RingNumbers) => `Even if your whole team faints, the run goes on: the fallen only take their Trauma. However the ladder ends — won, lost or cashed out — the ${n.name}'s medics heal your whole team to full.`,
    },
  ] as { title: string; body: (n: RingNumbers) => string }[],
};

/** The secret playtest menu (`rarecandy`). */
export const CHEAT_MENU = {
  title: 'Rare Candy',
  hint: 'Playtest shortcuts. Nothing here counts towards medals, Bond or the Pokédex.',
  notHere: 'Not from here.',
  close: 'Close',
  travel: 'Travel',
  team: 'Team',
  bag: 'Bag',
  fight: 'Fight',
  pallet: 'To Pallet Town',
  celadon: 'To Celadon City',
  gym: 'Next step: the Gym',
  elite: 'Next step: the Elite',
  heal: 'Heal everyone',
  trauma: 'Clear all Trauma',
  level1: '+1 level (whole Box)',
  level5: '+5 levels (whole Box)',
  evolve: 'Evolve who can',
  fill: 'Fill the Box',
  money: '+1,000 ₽',
  balls: '+5 Poké Balls',
  relic: 'A random relic',
  win: 'Win this fight',
  /** What a cheat did, in the menu's status line. */
  done: {
    pallet: () => 'Welcome to Pallet Town.',
    celadon: () => 'Welcome to Celadon City.',
    jump: (r: { node: 'gym' | 'elite' }) => `The ${r.node === 'gym' ? 'Gym' : 'Elite'} is the next step.`,
    healed: () => 'Everyone is patched up.',
    trauma: () => 'Trauma cleared from the whole Box.',
    levels: (r: { n: number }) => `The whole Box gained ${r.n} level${r.n === 1 ? '' : 's'}.`,
    nobodyReady: () => 'Nobody is ready to evolve yet.',
    evolving: (r: { n: number }) => `${r.n} ready to evolve.`,
    full: () => 'The Box is full.',
    money: (r: { n: number }) => `+${r.n.toLocaleString('en-GB')} ₽.`,
    balls: (r: { n: number }) => `+${r.n} Poké Balls.`,
    relic: (r: { name: string }) => `Took the ${r.name}.`,
    allRelics: () => 'You hold every relic already.',
    won: () => 'The fight is won.',
  },
};
