import type { Volume } from '@/app/settingsStore';
import { BOND_RANK_NAME, BOND_TIER } from '@/sim';
import type { GymRuleConfig, GymRuleId, RejectReason, RuleCounter, ArenaRuleId, ArenaRuleConfig, ArenaCounter } from '@/sim';

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
  'out-of-reach': 'A Melee move only reaches the enemy Lead. Ranged and area moves reach its supports.',
  'target-fainted': 'That Pokémon has fainted.',
  'target-is-lead': 'Already the Lead.',
  'target-frozen': 'Frozen Pokémon cannot swap.',
  'lead-frozen': 'Your Lead is frozen in place.',
  'invalid-index': 'Invalid target.',
  'not-wild': 'You can only catch wild Pokémon.',
  guard: 'A guard is not for catching.',
  'no-balls': 'No Poké Balls left.',
  'item-limit': 'No more items this turn; the next turn allows more.',
  'nothing-to-cure': 'Nothing to cure.',
  'choice-locked': 'Its held item will not let it play that.',
  'sealed': 'Mind Lock has sealed this card for the turn',
};

/** §5.9.5 Ice Armour — the enemy panel's chip for the shield it wears. */
export const ARMOUR_LABEL = 'Armour';
/** §7.3.7 Battle Hardened — one of yours behind its shield. */
export const SHIELD_LABEL = 'Shield';

/** §9.2.2.2 — a card's chips folded on a short stage: the "+N" bubble's title. */
export const UNIT_CHIPS_TEXT = {
  more: (n: number) => `${n} more`,
  sturdy: 'Sturdy',
  sturdyBody: 'Survives one hit that would have knocked it out, at 1 HP. Once per fight.',
  armourBody: (n: number) => `takes the next ${n} damage before its HP; a Fire move shatters it.`,
  shieldBody: (n: number) => `takes the next ${n} damage before its HP; it does not come back.`,
  traumaBody: 'its max HP is lowered until treated.',
};

/** §5.6.1 / §5.5.1 — a bench foe's second action and next plan, folded to badges on its chip on a short stage. */
export const INTENT_BADGE = { also: 'Also', then: 'Then' };

/** §9.2.2.4 — a card that costs more AP than is left, said on its top edge. */
export const NO_AP_LABEL = 'Not enough AP';

/** §7.3.1 — a relic's rarity, by name. */
export const RARITY_LABEL: Record<'common' | 'uncommon' | 'rare' | 'legendary', string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

/** A locked card's overlay: one word for why, and a few for how long (the whole sentence is in its tooltip). */
export const LOCK_LABEL: Partial<Record<RejectReason, { title: string; sub: string }>> = {
  'melee-needs-lead': { title: 'Melee', sub: 'needs Lead' },
  'owner-asleep': { title: 'Asleep', sub: 'this turn' },
  'owner-frozen': { title: 'Frozen', sub: 'this turn' },
  'owner-fainted': { title: 'Fainted', sub: 'out of the fight' },
  sealed: { title: 'Sealed', sub: 'this turn' },
};

/** §5.9.5 — the chip's count, in a few words: when a timed rule lands, or where a growing one stands. */
export function ruleCountText(rule: GymRuleId, count: RuleCounter): string | null {
  if (!count) return null;
  if (count.kind === 'multiplier') return `×${count.value.toFixed(2)}`;
  // 1 = at the end of this turn, 2 = the next, 3 = the one after: two turns from now.
  const when = count.turns === 1 ? 'this turn' : count.turns === 2 ? 'next turn' : `in ${count.turns - 1} turns`;
  switch (rule) {
    case 'riptide':
      return `tide ${when}`;
    case 'tremor':
      return `quake ${when}`;
    case 'overcharge':
      return count.turns === 1 ? 'overcharged now' : `overcharged ${when}`;
    case 'mind-lock':
      return count.turns === 1 ? 'sealed this turn' : `seal ${when}`;
    default:
      return when;
  }
}

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
  summon: 'Call for Help',
  guard: 'Cover',
  getaway: 'Getaway',
};

/** §2.6.4.4 — the series' lines for a ball that breaks open, by how many shake checks passed first (Gen III). */
export const CATCH_BREAK_LINE = ['Oh no! The Pokémon broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Shoot! It was so close, too!'] as const;

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

/**
 * §9.3 — the map's Labels: one short word for each kind of node (the user, 2026-10-20: "more generic — Wild, Trainer,
 * Elite Trainer, Elite Wild, Gym, Nurse, Trader") — its `NODE_LABEL`, or the shorter word here. What waits there
 * exactly is the node's bubble and its preview.
 */
export const MAP_LABEL: Partial<Record<string, string>> = {
  wild: 'Wild',
  aid: 'Nurse',
  trader: 'Trader',
  training: 'Training',
  summit: 'Summit',
};
/** §9.3 — the node preview's own words. */
export const PREVIEW_TEXT = {
  /** §2.3 — the loadout locks on entry; the Team screen is where it changes (the route's panel only shows it). */
  teamLock: 'The team locks when you enter. Change it on the Team screen (T) first.',
};
export const MAP_TEXT = {
  /** §5.6.5 — an item ball with a guard on it is a fight, and says so. */
  guarded: 'Guarded find',
  /** A Gym keeps its Leader's name: which lane ends at whom is the choice the board is for. */
  gym: (leader: string) => `${leader}'s Gym`,
};

export const NODE_LABEL: Record<string, string> = {
  wild: 'Wild Area',
  trainer: 'Trainer',
  elite: 'Elite Trainer',
  'elite-wild': 'Elite Wild',
  aid: 'Field nurse',
  merchant: 'Merchant',
  mystery: 'Mystery',
  cache: 'Item ball',
  gym: 'Gym',
  trader: 'Roadside trader',
  gauntlet: 'Gauntlet',
  training: 'Training Grounds',
  summit: 'The Summit',
  apex: 'Legendary',
  league: 'League',
};

/** §2.12 — Victory Road's own words. */
export const VICTORY_TEXT = {
  name: 'Victory Road',
  gauntletPrize: "The Gauntlet's prize",
  summitLede: 'Take one, or none, and go through the gate.',
  summitHealed: 'Healed in full',
  summitPlace: 'Indigo Plateau',
  summitOffer: 'One Legendary relic',
  summitPick: 'Choose 1 of 3',
  summitConfirm: (name: string) => `Take ${name} & enter →`,
  summitPickPrompt: 'Choose a relic',
  summitDecline: 'Enter without a relic →',
  summitSelected: 'Selected',
  leagueAhead: 'The League ahead',
  perfectClear: 'Perfect Clear',
} as const;

/** §9.5 — the sound settings' words: a name for every volume step, or the typecheck says so. */
export const SOUND_TEXT = {
  title: 'Sound',
  music: 'Music',
  effects: 'Effects',
  level: { 0: 'Off', 0.33: 'Low', 0.66: 'Medium', 1: 'High' } satisfies Record<Volume, string>,
} as const;

/** §2.1.6 — the League's own words. */
export const LEAGUE_TEXT = {
  name: 'Pokémon League',
  doors: 'The Elite Four and the Champion',
  doorWord: 'Door',
  eliteFour: 'Elite Four',
  champion: 'Champion',
  hallLabel: 'The Pokémon League, five doors',
  srHint: 'Choose the next door. Press Escape for the menu.',
  lockNote: 'The team locks when you enter. Change it in the hall first.',
  manyTypes: 'Many types',
  championHint: 'No running, and nothing heals in the fight. Beat him and the run is won.',
  beaten: 'Beaten',
  next: 'Next',
  ahead: 'Ahead',
  teamOf: (n: number) => `${n} Pokémon`,
  microRestLabel: (pct: number) => `Micro-rest · ${pct} % HP`,
  microRest: (pct: number) => `Between doors: ${pct} % HP back to everyone standing`,
} as const;

/** §2.12.3 — the Training Grounds' own words. */
export const TRAINING_TEXT = {
  title: 'Training Grounds',
  pickMon: 'Who will train?',
  pickUpgrade: 'One upgrade. They do not combine.',
  pickDetail: 'Choose how.',
  ready: 'Ready to train.',
  train: 'Train',
  upgrade: {
    stat: 'Stat Boost',
    'move-upgrade': 'Move Upgrade',
    level: 'Level Push',
    evolve: 'Early Evolution',
    'move-replace': 'Move Replacement',
  } as Record<string, string>,
  /** What each upgrade does, said in its tooltip; the card says only what it would do to this Pokémon. */
  line: {
    stat: 'A stat raised for the rest of the run: HP by 12 (and healed by as much), Attack, Defense or Speed by 6.',
    'move-upgrade': 'One move becomes its stronger self — more power, a cheaper cost or a rider.',
    level: 'One level, now, with every move and evolution it brings.',
    evolve: 'Evolve now, whatever the level, with the full choice of path.',
    'move-replace': 'A move from further up its learnset, in place of one it holds.',
  } as Record<string, string>,
  none: {
    'move-upgrade': 'No move of its has a stronger self.',
    level: 'Already at the top level.',
    evolve: 'It does not evolve.',
    'move-replace': 'Nothing further up its learnset.',
  } as Record<string, string>,
  out: 'Out',
  in: 'In',
} as const;

/** §2.9.6 — the roadside trader's own words. */
export const TRADER_TEXT = {
  title: 'Roadside trader',
  pickGive: 'Who will you give?',
  pickOffer: 'Pick one.',
  lastStanding: 'Your last one standing — it cannot go.',
  give: 'Give',
  trade: (name: string) => `Give ${name}`,
  offersLabel: 'Three face-down offers',
  arrivesAt: (from: number, to: number) => `Lv ${from} → ${to}`,
  joined: (name: string) => `${name} joins you!`,
  wentWith: (name: string) => `${name} went with the trader.`,
  walkOn: 'Walk on',
} as const;

/** §9.3 — the route board's own words. */
export const ROUTE_TEXT = {
  noReturn: 'Point of no return',
  labels: 'Labels',
  scroller: 'The route. Arrow keys, Home and End scroll it.',
  found: (what: string) => `You picked up ${what}.`,
};

/** §2.12.2.1 — the Legendaries' arena rules, by name. */
export const ARENA_RULE_LABEL: Record<ArenaRuleId, string> = {
  mist: 'Mist',
  thundercloud: 'Thundercloud',
  rekindle: 'Rekindle',
  barrier: 'Barrier',
  playful: 'Playful',
};
export const METRONOME_LABEL = 'Metronome';
export const metronomeNextText = (field: string) => `next: ${field}`;
/** §2.3 — the two places a Legendary takes, said on its Box card. */
export const TWO_PLACES = '2 places';

/** §2.12.2.1 — what an arena rule does, in one paragraph, with the numbers read from the config. */
export function arenaRuleText(rule: ArenaRuleId, a: ArenaRuleConfig): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  switch (rule) {
    case 'mist':
      return 'Its stats cannot be lowered, and it is never Frozen. Raise your own instead.';
    case 'thundercloud':
      return 'From its second phase the sky opens: its Thunder becomes a Cleave and hits your whole team. Finish the first phase with something in hand.';
    case 'rekindle':
      return `The first time it falls to ${pct(a.rekindleAt)} of its HP it rises once: ${pct(a.rekindleHeal)} back and its status gone. Hold a burst for after.`;
    case 'barrier':
      return `Every ${a.barrierEvery === 3 ? 'third' : `${a.barrierEvery}th`} turn it raises a Barrier and takes ${pct(a.barrierTaken)} of all damage. Spend those turns on swaps, heals and set-up.`;
    case 'playful':
      return 'It takes the type of the last move that hit it — its STAB and its weaknesses follow. Choose what to hit it with.';
  }
}

/** §2.12.2.1 — an arena rule's count on its chip in a fight. */
export function arenaCountText(rule: ArenaRuleId, count: ArenaCounter, a: ArenaRuleConfig): string | null {
  if (!count) return null;
  if (count.kind === 'turns') return count.turns === 1 ? 'up this turn' : count.turns === 2 ? 'up next turn' : `up in ${count.turns - 1} turns`;
  if (count.kind === 'rekindle') return count.spent ? 'spent' : `at ${Math.round(a.rekindleAt * 100)}%`;
  // Playful's type is on the Legendary's own card, as its type label: the chip does not say it twice.
  return null;
}

/** §5.9.5 — each Gym Leader's rule, by name. */
export const GYM_RULE_LABEL: Record<GymRuleId, string> = {
  'rock-solid': 'Rock Solid',
  riptide: 'Riptide',
  swarm: 'Swarm',
  rollout: 'Rollout',
  meltdown: 'Meltdown',
  bloom: 'Bloom',
  overcharge: 'Overcharge',
  toxic: 'Toxic',
  'mind-lock': 'Mind Lock',
  tremor: 'Tremor',
  'close-quarters': 'Close Quarters',
  'ice-armour': 'Ice Armour',
  synergy: 'Full Team Synergy',
};

/** §5.9.5 — what a rule does, in one paragraph, with the numbers read from the config. */
export function gymRuleText(rule: GymRuleId, g: GymRuleConfig): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const every = (n: number) => (n === 2 ? 'every second turn' : n === 3 ? 'every third turn' : `every ${n} turns`);
  switch (rule) {
    case 'rock-solid':
      return `No single hit takes more than ${pct(g.rockSolidCap)} of his Pokémon's Max HP — a multi-hit move is capped hit by hit. Chip the wall: multi-hits, Burn and Poison.`;
    case 'riptide':
      return `At the end of ${every(g.riptideEvery)} the tide trades your Lead with Bench 1 (Bench 2 if Bench 1 is down). It is her swap, not yours: it costs nothing and counts as none. Choose who stands on Bench 1.`;
    case 'swarm':
      return `Her Pokémon on the field hit ${pct(g.swarmPerWaiting)} harder for every one of hers still waiting to come out. Every one you knock out thins the swarm.`;
    case 'rollout':
      return `Her Lead hits ${pct(g.rolloutPerTurn)} harder for every turn in a row your Lead has been the same Pokémon, up to ${pct(g.rolloutPerTurn * g.rolloutMaxTurns)}. A swap resets the roll.`;
    case 'meltdown':
      return `Every attack his Pokémon land lowers its target's Defence one stage, down to ${g.meltdownFloor}. Spread the hits with swaps, or raise your Defence back.`;
    case 'bloom':
      return `At the end of each turn, each of her Pokémon on the field that took no damage restores ${pct(g.bloomHeal)} of its Max HP. Touch them both: Ranged and area cards, a status that ticks.`;
    case 'overcharge':
      return `${every(g.overchargeEvery)[0]!.toUpperCase()}${every(g.overchargeEvery).slice(1)} the field is overcharged: the first card you play costs ${g.overchargeAp} more AP. Open those turns with a cheap card.`;
    case 'toxic':
      return 'Every Poison his side inflicts is badly poisoned: its damage doubles each turn. Poison-types are immune; cure it early.';
    case 'mind-lock':
      return `At the draw of ${every(g.mindLockEvery)} she seals the strongest attack in your hand: it cannot be played that turn. The seal is shown before you spend a point.`;
    case 'tremor':
      return `At the end of ${every(g.tremorEvery)} the ground shakes: each of your Pokémon on the ground loses ${pct(g.tremorPercent)} of its Max HP. Flying Pokémon stand above it.`;
    case 'close-quarters':
      return `Your Ranged cards deal ${pct(g.closeQuartersRanged)} against his Pokémon; your Melee cards ${pct(g.closeQuartersMelee)}. Fight at the front: put your hitter in the Lead.`;
    case 'ice-armour':
      return `At each Intent phase her Lead's ice armour is set to ${pct(g.iceArmour)} of its Max HP — it takes damage before HP does and never stacks. A Fire move shatters it whole.`;
    case 'synergy':
      return `Each fallen ally empowers his teammates: his Pokémon hit ${pct(g.synergyPerFallen)} harder for every one of them you have beaten, up to +${pct(g.synergyCap)}. His last two take the field together.`;
  }
}

/** §4.3 — each Battlefield, as its chip names it. */
export const FIELD_LABEL: Record<string, string> = {
  'sunny-day': 'Sun',
  'rain-dance': 'Rain',
  'electric-terrain': 'Electric Terrain',
  sandstorm: 'Sandstorm',
  hail: 'Hail',
  'grassy-terrain': 'Grassy Terrain',
  'psychic-terrain': 'Psychic Terrain',
  'misty-terrain': 'Misty Terrain',
  'toxic-spikes': 'Toxic Spikes',
  'sticky-web': 'Sticky Web',
};

/** §4.3.5 — a Home Field's name, on its chip and at the top of its bubble. */
export function homeFieldLabel(type: string): string {
  return `Home Field: ${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

/** §5.6.3 — a fight node's shape, as its preview card names it. */
export const GROUP_LABEL: Record<string, string> = {
  caller: 'Calls for help',
  pair: 'Two at a time',
  trio: 'Three at a time',
  double: 'Two at a time',
  'acts-twice': 'Acts twice',
};

/** §5.6.3 — the shape's name, the one place a pack's size is put into words. */
export function groupLabel(plan: { kind: string; size?: number }): string {
  return plan.kind === 'pack' ? `A pack of ${plan.size ?? 2}` : GROUP_LABEL[plan.kind] ?? '';
}

/** §5.6.3 — what that shape means, for its bubble. */
export const GROUP_HINT: Record<string, string> = {
  pack: 'The wild Pokémon comes with company from its biome: it leads, the rest stand behind it as supports. Melee reaches only the one in front; a catch scatters the rest.',
  caller: 'The wild Pokémon can Call for Help: a companion is waiting to join it. The call is telegraphed a turn ahead, with the name of who comes.',
  pair: 'The trainer sends out two Pokémon at once. The first leads, the second supports it from behind.',
  trio: 'The trainer sends out three Pokémon at once: one leads, two support it from behind. The rest wait to fill a place that falls.',
  double: 'Two of the team fight at once, the rest waiting to step in. Melee reaches only the one in front.',
};

/** §5.6.1 — who in a fight acts twice, as the node's preview card promises it (v0.9.12). */
export const DOUBLE_ACTOR_LABEL: Record<'lead' | 'ace', string> = {
  lead: 'Its Lead acts twice',
  ace: 'Its ace acts twice',
};
export const DOUBLE_ACTOR_HINT =
  'Two actions a turn, both shown. Hurt it by a quarter of its Max HP in your turn, or hit it super-effectively, and the second is broken.';

/**
 * §5.6.5 — a fight with another objective, said once: the chip's words and the bubble's. The numbers are the
 * fight's own (its turns, the guard's escalation), never repeated here.
 */
export const OBJECTIVE_TEXT = {
  fleeLabel: 'Flees',
  /** A runner's count, in words, for a folded chip's bubble. */
  runnerChip: (turns: number) => `Gets away in ${turns}`,
  holdLabel: 'Hold out',
  /** The same count for both races: the turns left, this one included, and the last one said as such. */
  count: (left: number) => (left <= 1 ? 'last turn' : `${left} turns`),
  fleeTitle: "It won't stay long",
  fleeBody: (turns: number) =>
    `It gets away at the end of turn ${turns}: no XP, no drop, no catch — and no toll, nothing lost but the chance. Knock it out first for its premium, or weaken it and throw a ball. Asleep or frozen when its last turn begins, it cannot run until it wakes.`,
  holdTitle: 'Hold out',
  holdBody: (turns: number, rise: number) =>
    `Keep a Pokémon standing to the end of turn ${turns} and the find is yours — or knock the guard out first. It grows angrier: its Attack rises ${rise === 1 ? 'a stage' : `${rise} stages`} at the end of every turn. A guard is not for catching.`,
  nodeHint: 'A fight: outlast the guard, or knock it out.',
  fled: (name: string) => `${name} fled`,
  fledBody: 'No XP, no drop, no catch — and no toll. Nothing was lost but the chance.',
  heldBody: 'You held out: the find is yours.',
  getawayBody: "Its last action: nothing happens to you, and at the end of this turn it is gone. Knock it out or catch it before then.",
  guardMeta: 'On guard — its Attack rises every turn',
  getawayNote: " — gone at the turn's end",
} as const;

/** §2.5 / §5.6.5 — what a node is in one line, the same on the map's bubble and the preview card: a find with a guard is a fight. */
export const nodeHint = (node: { kind: string; preview: { objective?: { kind: string }; rosterId?: string } }): string =>
  node.preview.objective?.kind === 'hold' ? OBJECTIVE_TEXT.nodeHint
    // §2.1.6 — the Champion's door is the last: there is no rest after it, only the run won.
    : node.kind === 'league' && node.preview.rosterId === 'champion' ? LEAGUE_TEXT.championHint
    : (NODE_HINT[node.kind] ?? '');

export const RUN_END_TEXT = {
  victoryTitle: 'Run complete!', defeatTitle: 'Run over',
  victoryLine: 'Your team made it to the top.', defeatLine: 'Your team, and everything you learned.',
  team: 'The team you finished with', badges: 'Badges earned', progress: 'Run record',
  closeRecord: 'Back to the team', mainMenu: 'Main menu', runAgain: 'Run again',
  metrics: { regions: 'Regions cleared', nodes: 'Nodes cleared', fights: 'Fights won', turns: 'Turns played', catches: 'Pokémon caught', faints: 'Faints', depth: 'Depth reached' },
  region: (n: number, total: number) => `Regions ${n} / ${total}`,
  depth: (n: number, total: number) => `Column ${n} / ${total}`,
  trauma: (n: number) => `Trauma ×${n}`,
} as const;

export const NODE_HINT: Record<string, string> = {
  wild: 'Beat them for XP, or throw a ball and take one with you.',
  trainer: 'A trainer with a full team. More XP than a wild fight, and no catching.',
  elite: 'Two Pokémon, both with a second phase. The hardest fight before the Gym — and a relic for winning it.',
  'elite-wild': 'A boss-sized wild Pokémon. Catch it and it joins you; beat it and you take a relic. Never both.',
  aid: 'No fight, so you can walk in with nobody standing.',
  merchant: 'No fight. Once you walk on, the cart is gone.',
  mystery: 'No fight. A scene and a choice, with every outcome written on the button before you press it.',
  cache: 'No fight.',
  trader: 'No fight.',
  gym: 'The Gym Leader. Beat it and the next town is yours to rest in.',
  apex: 'Catch it and it joins you, two places in the team; beat it for a Legendary relic pick. Never both.',
  league: 'No running, and nothing heals in the fight.',
};

export const RUN_REJECT_TEXT: Record<string, string> = {
  'already-traded': 'One trade a visit.',
  'last-standing': 'Not your last Pokémon standing.',
  'internal-error': 'Something went wrong. Reload the page — the run is saved.',
  'not-a-field-item': 'That one only works in a fight.',
  fainted: 'It has fainted — a Revive first.',
  'not-fainted': 'It has not fainted.',
  'full-hp': 'Already at full HP.',
  'nothing-to-cure': 'Nothing for this to cure.',
  'ability-locked': `This is the line's hidden ability — it opens at Bond rank ${BOND_TIER.hiddenAbility} (${BOND_RANK_NAME[BOND_TIER.hiddenAbility]}).`,
  'not-on-map': 'Finish what you are doing first.',
  'node-unreachable': 'You cannot get there from here.',
  'wrong-phase': 'Not now.',
  'no-healthy-pokemon': 'Every Pokémon in your Box has fainted. Find a Center.',
  'team-too-large': 'The Active Team has three places, and a Legendary takes two.',
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
  'bad-bet': 'That bet is not on the table.',
  'daycare-used': 'The Daycare has already taken a Pokémon this visit.',
  'needs-another': 'Someone else has to be able to fight while it rests.',
  resting: 'It is resting at the Daycare until the next fight is over.',
  'not-an-egg-move': 'That is not one of this line’s egg moves.',
  'safari-closed': 'The Safari is done for this visit.',
  'bad-tile': 'Not from here.',
  'no-ap': 'Nothing left this turn — end it.',
  'market-closed': 'Nothing more there for you this visit.',
  'bad-payment': 'They will not take that.',
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
  /** The Slots, told in a toast when you step away while the reels still spin. */
  slotsWon: (m: number, payout: number) => `Three of a kind: ×${m}, ${payout} ₽.`,
  slotsLost: 'Nothing lines up.',
  nothingLinesUp: 'Nothing lines up',
  anythingElse: 'anything else',
  spin: 'Spin',
  pull: 'Pull',
  /** The Roulette: the ball's pocket and what the bet made of it. */
  ballLanded: (n: number, colour: string, payout: number) =>
    `The ball dropped on ${n} ${colour}${payout ? `: ${payout} ₽.` : '. The stake is gone.'}`,
  betHead: 'Your bet',
  spinOn: (colour: string) => `Spin, on ${colour}`,
  stakeGone: 'the stake is gone',
  reelsSpinning: 'The reels are spinning',
};

/** §2.11.5 — the Roulette's three bets, by the colour they are on. */
export const BET_NAME: Record<'red' | 'black' | 'green', string> = { red: 'Red', black: 'Black', green: 'Green' };

/** §2.9.4 — the Dojo's counters. */
export const DOJO_TEXT = {
  title: 'The Dojo',
  box: 'Your Box',
  deck: 'Deck',
  closeDeck: 'Close the Move Manager',
  learn: 'Learn',
  known: 'already known',
  equipped: 'equipped',
  locked: 'locked',
  master: 'Master',
  scrolls: 'Scrolls',
  apprentice: 'Apprentice',
  room: 'Fighting Dojo',
  preview: 'Preview move',
  deckFor: (name: string) => `${name}’s deck`,
  counters: 'The Dojo’s counters',
  tab: { tutor: 'Tutor', eggs: 'Egg moves', passive: 'Passive' },
  tabLabel: (name: string, left: number) => `${name}, ${left} still to buy for this Pokémon`,
  noTutor: 'The master has nothing to teach this one.',
  noEggs: 'The master has no scrolls for this line.',
};

/** §2.11.1 — the Pokémon Center's three counters. */
export const CENTER_TEXT = {
  lobby: 'Lobby',
  therapy: 'Therapy',
  daycare: 'Daycare',
  pcBox: 'PC Box',
  noTrauma: 'Nobody is carrying Trauma. Your Box is in better shape than most that get this far.',
  resting: (name: string) => `${name} is resting until the next fight is over.`,
  alone: 'Needs a partner',
  daycareDone: 'The Daycare has taken its Pokémon this visit.',
};

/** §2.3 / §9.12 — the Team screen (`TeamScreen`): the formation, the Box and the selected Pokémon's sheet. */
export const TEAM_TEXT = {
  title: 'Team',
  open: 'Team',
  openLabel: 'Open the Team: formation, Box and each Pokémon\'s sheet',
  close: 'Close the Team',
  formation: 'Formation',
  slots: ['Lead', 'Bench 1', 'Bench 2'] as const,
  box: 'Box',
  emptyPlace: 'Empty place',
  putHere: (name: string, place: string) => `Put ${name} in ${place}`,
  secondPlace: 'Its second place',
  allOut: 'Everyone you have is in the formation.',
  locked: 'Locked for this node',
  refused: 'Not now.',
  lastOne: 'Somebody has to be in the formation: this is the last one there.',
  /** §9.12 — the route's side panel is the team at a glance; the Team screen is where it changes. */
  panelHint: 'Change the team, its order and its moves on the Team screen (T).',
  waiting: (n: number) => `${n} waiting`,
  resting: 'resting at the Daycare',
  placeLabel: 'Where it stands',
  ability: 'Ability',
  noAbility: 'No ability yet',
  held: 'Holds',
  holdingNothing: 'Nothing',
  take: 'Take',
  give: 'Give',
  giveLabel: (item: string, name: string) => `Give ${item} to ${name}`,
  moves: 'Moves',
  manage: 'Manage',
  evolution: 'Evolution',
  ready: 'Ready to evolve',
  evolvesAt: (level: number) => `At Lv ${level}`,
  vsGyms: 'Against the Gyms ahead',
  stats: { hp: 'HP', attack: 'Attack', defense: 'Defense', speed: 'Speed' } as const,
  sheet: (name: string) => `${name}'s sheet`,
  monLabel: (name: string, level: number, hp: number, max: number) => `${name}, level ${level}, ${hp} of ${max} HP`,
  /** The matchup's chip: how hard it hits that type, and how hard that type hits it. */
  matchup: (attack: number, defend: number) => `hits ×${fmtMult(attack)} · takes ×${fmtMult(defend)}`,
};
/** A type multiplier as the chips write it: ×2, ×½, ×¼, ×0. */
export const fmtMult = (m: number) => (m === 0.5 ? '½' : m === 0.25 ? '¼' : String(m));

/** §2.9.5 — the item ball's reel (`FindScreen`, the preview's `ReelPool`). */
export const FIND_TEXT = {
  title: 'Item ball',
  pool: 'On the reel',
  spins: 'Picking it up spins the reel: each prize as likely as its row says.',
  spinning: 'Spinning…',
  skip: 'Stop',
  walkOn: 'Walk on',
  bagged: (prize: { kind: string }, got: { relic?: string; heldItem?: string; money?: number }) =>
    got.money !== undefined || prize.kind === 'money' ? 'Into your wallet.' : got.relic ? 'A relic, yours for the run.' : prize.kind === 'tm' ? 'Into your TM case.' : prize.kind === 'stone' ? 'Into the bag, for evolving.' : got.heldItem ? 'Into the bag, to give a Pokémon.' : 'Into the bag.',
};

/** §9.9.3 — the heal, seen: the Center's machine and the field nurse (`HealPanel`). */
export const HEAL_TEXT = {
  report: 'Healing report',
  label: 'Healing',
  patients: 'Your Box, healing',
  working: 'Healing…',
  skip: 'Skip the wait',
  nothing: 'Everyone is already fighting fit.',
  cured: 'Cured',
  revived: 'Revived',
  total: (hp: number, cured: number) => [hp > 0 ? `+${hp} HP` : null, cured > 0 ? `${cured} cured` : null].filter(Boolean).join(' · '),
  patient: (name: string, hp: number, max: number, gain: number) => `${name}, ${hp} of ${max} HP${gain > 0 ? `, ${gain} restored` : ''}`,
};

/** The way out of every town building, one phrase wherever it is written. */
export const BACK_TO_TOWN = 'Back to town';

/** §2.9.4.1 — the Ring's buttons. */
export const RING_TEXT = {
  back: BACK_TO_TOWN,
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
  showcase: { name: 'The Executive', line: 'A Legendary Pokémon. Three of yours.' },
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
  pickThree: (n: number, of: number) => `Pick ${of} to hand over — ${n} of ${of}`,
  keepOne: 'You must keep at least one Pokémon.',
  handOver: (names: string) => `Hand over ${names}`,
  pickN: (n: number) => `Pick ${n}`,
  dealTitle: 'Hand them over?',
  dealBody: (names: string, legendary: string) => `${names} go to Team Rocket for ${legendary}, and the door locks behind you.`,
  arrivesAt: (level: number | null) => (level === null ? 'At the level of the strongest you give' : `Arrives at Lv ${level}`),
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
  rare: 'Rare goods',
};

/** §2.11.2 — a City shop's shelves, by what they hold: the shop is the room. */
export const SHELF_LABEL: Record<'clerk' | 'medicine' | 'rare-medicine' | 'tms' | 'held' | 'stones' | 'relics' | 'relics-common' | 'relics-uncommon' | 'relics-rare', string> = {
  clerk: 'Clerk',
  medicine: 'Medicine',
  'rare-medicine': 'Rare medicine',
  tms: 'TMs',
  held: 'Held items',
  stones: 'Evolution stones',
  relics: 'Relics',
  'relics-common': 'Common relics',
  'relics-uncommon': 'Uncommon relics',
  'relics-rare': 'Rare relics',
};
/** What each shelf is for, in a line, for its bubble. */
export const SHELF_HINT: Record<keyof typeof SHELF_LABEL, string> = {
  clerk: 'Everything on sale here in one list, the Poké Balls with it — and the clerk buys held items back.',
  medicine: 'Potions, status cures and battle items for the fights ahead.',
  'rare-medicine': 'The strongest medicine the store stocks.',
  tms: 'TMs someone in your Box can learn. Single use.',
  held: 'Items a Pokémon wears into every fight.',
  stones: 'A stone someone in your Box can use to evolve — when there is one.',
  relics: 'Relics for the whole run, from Common to Rare.',
  'relics-common': 'The cheapest relics: small, steady edges for the whole run.',
  'relics-uncommon': 'Dearer relics that bend a rule or reward a plan.',
  'relics-rare': 'Rare relics — the best the store sells.',
};
export const SHOP_TEXT = {
  backToTown: BACK_TO_TOWN,
  backToRoute: 'Back to the route',
  exit: 'Exit',
  clerkTabs: 'Buy or sell',
  buy: 'Buy',
  sell: 'Sell',
  sellLede: 'Held items from your bag',
  /** The clerk's list: the Poké Balls have no shelf of their own, they are the clerk's. */
  balls: 'Poké Balls',
  emptyShelf: 'Nothing on this shelf today.',
  nothingToSell: 'Nothing in your bag to sell.',
};

/** §2.11.5 — the Slots' faces, named for screen readers. */
export const SLOT_FACE_LABEL: Record<string, string> = {
  cherry: 'Cherry',
  bell: 'Bell',
  bar: 'BAR',
  seven: 'Seven',
};

// §6.3.4 — the three archetypes, in the words the Evolution screen uses.
/** §6.3.3 / §9.9.1 — the Evolution screen and its cutscene (v0.9.5). */
export const EVOLUTION_TEXT = {
  evolving: (name: string) => `What? ${name} is evolving!`,
  evolved: (from: string, to: string) => `Congratulations! Your ${from} evolved into ${to}!`,
  choose: (name: string) => `Choose ${name}'s path`,
  pick: 'Pick a path.',
  evolve: (label: string | null) => (label ? `Evolve · ${label}` : 'Evolve'),
};

/** §3.5 — the reward screen's labels (v0.9.6). */
export const STAT_SHORT = { hp: 'HP', attack: 'Atk', defense: 'Def', speed: 'Spd' } as const;
export const STAT_LONG: Record<string, string> = { hp: 'HP', attack: 'Attack', defense: 'Defense', speed: 'Speed' };
export const REWARD_TEXT = {
  inPool: 'in the pool',
  readyToEvolve: 'Ready to evolve',
  /** §6.8.2 — what a Bond rank opened, by rank (the hidden ability names itself). */
  bondUnlock: { 1: 'Shiny Charm', 3: 'Mastery', 4: 'Starts a run' } as Record<number, string>,
};

/** §8.7 / §8.6.1 — the progress panel and the reward screen's progress line (v0.9.6). */
export const PROGRESS_TEXT = {
  heading: (kind: 'achievement' | 'discovery', done: boolean) => (kind === 'achievement' ? (done ? 'Medal earned' : 'Medal progress') : done ? 'Relic discovered' : 'Discovery progress'),
};

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
// (`CITIES[id].ringName`). The Black Market has
// no door: it is a secret inside the Game Corner (§2.11.6).
export type CityDoor = 'center' | 'mart' | 'department-store' | 'dojo' | 'ring' | 'safari' | 'game-corner' | 'gate';
/** Every door but the gate, which is named by where it leads ("To Region 2"), not by a fixed word. */
export type CityBuildingDoor = Exclude<CityDoor, 'gate'>;

export const CITY_DOOR_LABEL: Record<CityBuildingDoor, string> = {
  center: 'Pokémon Center',
  mart: 'Poké Mart',
  'department-store': 'Department Store',
  dojo: 'Dojo',
  // The fallback name only: every City names its own Ring (`CITIES[id].ringName`).
  ring: 'Challenge Ring',
  safari: 'Safari Zone',
  'game-corner': 'Game Corner',
};

export const CITY_DOOR_HINT: Record<CityDoor, string> & { gatePlain: string } = {
  center: 'Heals the whole Box and cures every status, free, as often as you like. Therapy takes Trauma off, the Daycare trades a fight for a level, and the PC Box picks the team.',
  mart: 'A shelf picked for your team, and Poké Balls. Dearer than the merchant; buys held items back.',
  'department-store': 'The biggest shelf of the run, and Poké Balls. Dearer than the merchant; buys held items back.',
  dojo: 'Tutor moves off the learnset, the line’s egg moves and passive abilities, as many as you can pay for.',
  ring: 'A ladder of rivals for a fee. See the next one, then fight or cash out — nothing heals between rungs, and a lost rung loses what the ladder paid. However it ends, your team walks out healed. Once per visit.',
  safari: 'A park of Pokémon the routes rarely show. Buy a ticket, stalk one through the grass, and throw when the odds are yours. Once per visit.',
  'game-corner': 'Slot machines and roulette tables, every outcome and its odds printed on the machine you play.',
  gate: 'Choose one rule for the next Region, then set off. The town stays behind.',
  /** §2.11.3 — the gate while Region Modifiers are off (v0.9.9). */
  gatePlain: 'The road to the next Region. The town stays behind once you set off.',
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

// §2.6.2 — a Wild Area's pool by rarity (v0.9.7).
export const WILD_TIER_LABEL: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' };
export const WILD_TIER_HINT: Record<string, string> = {
  common: 'What lives here. Most walks in meet one of these.',
  uncommon: 'Here, but harder to find.',
  rare: 'A real find. The starters, the fossils and the giants hide in this row. From Region 2, a Rare acts twice.',
};
export const WILD_TEXT = {
  pool: 'Who lives here',
  roll: 'Walking in rolls the rarity by these odds, then which Pokémon spawns from its row, each as likely as the next.',
  lure: 'The Lure Module rolls the rarity twice and keeps the rarer, so the rare rows come up more often.',
  spawn: (pct: string) => `${pct} to spawn`,
  /** §2.6.2 — the word the fight opens with (v0.9.8). */
  banner: (tier: 'common' | 'uncommon' | 'rare') => (tier === 'rare' ? `${WILD_TIER_LABEL.rare}!` : WILD_TIER_LABEL[tier]!),
  bannerSub: 'wild Pokémon',
  /** A chance as the card shows it: whole percents, one decimal under ten. */
  pct: (p: number) => `${p * 100 >= 10 ? Math.round(p * 100) : (Math.round(p * 1000) / 10).toString()} %`,
};

// §8.4.2 Twin Run — the new-run screen's two places (v0.9.9).
/** §8.8 — the difficulty step's words that read the account (Box Squeeze, as your Box is). */
export const DIFFICULTY_TEXT = {
  boxSqueeze: {
    holds: 'The Box holds',
    instead: 'instead of',
    tail: ', and no relic expands it.',
    plain: (yours: number, bought: number) => `The Box holds ${yours} instead of ${bought}, and no relic expands it.`,
  },
};

export const STARTER_TEXT = {
  lead: 'Lead',
  partner: 'Partner',
  pickPartner: 'Pick a partner',
  clearPartner: 'Remove the partner',
  filter: 'Show starters of one type',
  all: 'All',
  startingCards: 'Starting cards',
  baseStats: 'Base stats',
  evolution: 'Evolution',
  matchups: 'Matchups',
  weakTo: 'Weak to',
  resists: 'Resists',
  immune: 'Immune to',
  onlyType: (type: string, n: number) => `Show only ${type.charAt(0).toUpperCase()}${type.slice(1)} starters (${n})`,
  noEffect: 'No damage.',
};

// §6.3 — the Pokédex's evolutions and kit (v0.9.9).
export const DEX_EVO_TEXT = {
  atLevel: (lv: number) => `Lv ${lv}`,
  stats: 'Stats at the threshold',
  moves: 'What it does to the kit',
  becomes: 'becomes',
  learns: 'learns',
  evolutions: 'Evolutions',
  from: (name: string, lv: number | null) => (lv ? `From ${name} · Lv ${lv}` : `From ${name}`),
  learnset: 'Learnset',
  kitByPath: 'Kit by path',
};

// §8.4 — the Item Guide on the lobby's table (v0.9.9).
const regionList = (rs: number[]) => (rs.length === 1 ? `Region ${rs[0]}` : `Regions ${rs.join(', ')}`);
export const GUIDE_TEXT = {
  kinds: 'Item kinds',
  kind: { relic: 'Relics', consumable: 'Items', 'held-item': 'Held items', stone: 'Evolution Items', tm: 'TMs' } as Record<string, string>,
  kindOne: { relic: 'Relic · whole run', consumable: 'Item · single use', 'held-item': 'Held item · one Pokémon', stone: 'Evolution Item', tm: 'TM · teaches a move' } as Record<string, string>,
  search: 'Find an item',
  none: 'Nothing by that name.',
  tier: (t: number) => `Tier ${t}`,
  relicTier: (t: number) => (t === 3 ? 'Tier 3 · Mastery' : t === 2 ? 'Tier 2 · Discovered' : 'Tier 1 · Foundation'),
  signature: 'Signature',
  held: 'Held',
  stone: 'Stone',
  categories: 'Kind',
  yours: 'Your account',
  inPool: 'In your pool: it can turn up in a run.',
  mastery: (tokens: number) => `Not in your pool — the Poké Mart's Mastery shelf sells it for ${tokens} Tokens.`,
  discover: (text: string, have: number, goal: number) => `Not in your pool — discover it: ${text} (${have} / ${goal}).`,
  locked: 'Not in your pool.',
  cost: 'Cost',
  ap: (n: number) => (n === 0 ? 'Free to play' : `${n} AP`),
  target: 'Used on',
  targetOf: { ally: 'One of your Pokémon', 'self-lead': 'Your Lead', none: 'The fight', enemy: 'The enemy' } as Record<string, string>,
  upgrade: 'Upgrades into',
  found: 'Found',
  supplies: (rs: number[]) => `a won fight's supplies in ${regionList(rs)}`,
  prizes: (rs: number[]) => `an Elite's or a Gym's prize in ${regionList(rs)}`,
  ground: (rs: number[]) => `on the ground in ${regionList(rs)}`,
  shopsOnly: 'Only in shops.',
  aura: 'Lead aura',
  evolves: 'Evolves',
  fromLv: (lv: number) => `from Lv ${lv}`,
  teaches: 'Teaches',
  compatible: 'Learnable by',
  price: 'Price',
  notSold: 'Never sold.',
  // A non-breaking space keeps each amount whole when the line wraps.
  prices: (route: number, city: number) => `${route}\u00a0₽ from the merchant, ${city}\u00a0₽ in a City`,
  pending: (why: string) => `Not working yet: ${why}`,
};

// ---- Playing a card onto its target (§5.6, v0.9.16) -----------------------------------------------------------------

/** The top bar's hint while a card waits for its target. */
export const HINT_FOE_CARD = 'Click the enemy to play it on. Esc to cancel.';
export const HINT_ALLY_CARD = 'Click one of the highlighted Pokémon it acts on. Esc to cancel.';
/** A card let go of in the wrong place. */
export const DROP_ON_FOE = 'Play it onto an enemy.';
export function dropOnAlly(names: string[]): string {
  return names.length === 1 ? `Play it onto ${names[0]}.` : 'Play it onto one of the highlighted Pokémon.';
}
