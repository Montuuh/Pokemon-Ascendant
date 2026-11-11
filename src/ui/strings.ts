import type { Volume } from '@/app/settingsStore';
import { BOND_RANK_NAME, BOND_TIER } from '@/sim';
import type { DamageCause, GymRuleConfig, GymRuleId, RejectReason, RuleCounter, ArenaRuleId, ArenaRuleConfig, ArenaCounter } from '@/sim';

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
  'no-fleeing-a-gym': 'There is no running from this fight.',
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
  'target-frozen': 'That Pokémon cannot move from its place — frozen, recharging, rampaging or rooted.',
  'lead-frozen': 'Your Lead cannot leave its place — frozen, recharging, rampaging or rooted.',
  'invalid-index': 'Invalid target.',
  'not-wild': 'You can only catch wild Pokémon.',
  guard: 'A guard cannot be caught.',
  'no-balls': 'No Poké Balls left.',
  'item-limit': 'No more items this turn.',
  'nothing-to-cure': 'Nothing to cure.',
  'choice-locked': 'Its held item will not let it play that.',
  'sealed': 'Mind Lock has sealed this card for the turn.',
  'no-pp': 'No PP left for this move this fight.',
  'protect-again': 'Protect cannot go up two turns running.',
  'target-protected': 'It is protected this turn — nothing aimed at it lands. An area move still hits the others.',
  recharging: 'Recharging after its last move — its cards are offline this turn.',
  disabled: 'Disabled — this card cannot be played until its lock lifts.',
  taunted: 'Taunted — only its attacks can be played until the taunt wears off.',
  'lead-trapped': 'Your Lead is trapped: no swapping it out until the trap wears off.',
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

/** §4.1.3.1 — the critical rhythm: its dial on every card, and the hand's CRIT. */
export const RHYTHM_TEXT = {
  title: 'Critical rhythm',
  readyTitle: 'Critical ready',
  label: (left: number, side: 'ally' | 'foe') => `Critical rhythm: ${left} ${side === 'ally' ? 'AP' : left === 1 ? 'action' : 'actions'} to go`,
  readyLabel: 'Critical ready',
  body: (left: number, side: 'ally' | 'foe') =>
    side === 'ally'
      ? `${left} more AP spent on its cards and its next hit is a critical. Each AP a card costs fills the ring; a free card, or the AP of a swap, fills nothing.`
      : `${left} more ${left === 1 ? 'action' : 'actions'} and its next hit is a critical. Every action it takes fills the ring.`,
  readyBody: (side: 'ally' | 'foe') =>
    side === 'ally' ? 'Its next damaging card is a critical; the numbers on its cards count it.' : 'Its next hit is a critical; the number on its intent counts it.',
  /** The tooltip's lines: the species' own Speed (the card's number has its level in it), what is moving it now, and how long a full ring takes. */
  reads: (speed: number, level: number) => (level <= 1 ? `Pace from Speed ${speed}.` : `Pace from the species' Speed ${speed}, not the level's.`),
  pace: (acts: number, side: 'ally' | 'foe') => `A full ring takes ${acts.toFixed(1)} ${side === 'ally' ? 'AP' : 'actions'}`,
  stage: (stage: number, mult: number) => `Speed ${stage > 0 ? '+' : '−'}${Math.abs(stage)}: × ${mult.toFixed(1)}`,
  paralysed: (mult: number) => `Paralysed: × ${mult.toFixed(1)}`,
  /** A card's hover: what it feeds its owner's ring. */
  feeds: (owner: string, ap: number, pct: number, completes: boolean) =>
    completes ? `Its ${ap} AP fill ${owner}'s ring: the next damaging card is a critical.` : `Its ${ap} AP fill ${pct} % of ${owner}'s ring.`,
  always: (owner: string) => `✦ Always a critical, without spending ${owner}'s rhythm.`,
  card: (owner: string) => `Critical: ${owner}'s rhythm is full, so this hit is a critical. The first of its damaging cards you play spends it.`,
};

/** §5.6.1 / §5.5.1 — a bench foe's second action and next plan, folded to badges on its chip on a short stage. */
export const INTENT_BADGE = { also: 'Also', then: 'Then', combo: 'Combo' };

/** §9.2.2.4 — a card that costs more AP than is left, said on its top edge. */
export const NO_AP_LABEL = 'Not enough AP';

/** §7.3.1 — a relic's rarity, by name. */
export const RARITY_LABEL: Record<'common' | 'uncommon' | 'rare' | 'legendary', string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

/** §5.2.3 — a Disable's or a Taunt's lock on a card: the turn it holds through. */
export const LOCK_UNTIL = (turn: number) => `through Turn ${turn}`;

/** A locked card's overlay: one word for why, and a few for how long (the whole sentence is in its tooltip). */
export const LOCK_LABEL: Partial<Record<RejectReason, { title: string; sub: string }>> = {
  'melee-needs-lead': { title: 'Melee', sub: 'needs Lead' },
  'owner-asleep': { title: 'Asleep', sub: 'this turn' },
  'owner-frozen': { title: 'Frozen', sub: 'this turn' },
  'owner-fainted': { title: 'Fainted', sub: 'out of the fight' },
  sealed: { title: 'Sealed', sub: 'this turn' },
  recharging: { title: 'Recharge', sub: 'this turn' },
  'no-pp': { title: 'No PP', sub: 'this fight' },
  disabled: { title: 'Disabled', sub: 'this turn' },
  taunted: { title: 'Taunted', sub: 'attacks only' },
  'protect-again': { title: 'Not again', sub: 'used last turn' },
  'target-protected': { title: 'Protected', sub: 'this turn' },
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
  paralysis: 'Its cards cost +1 AP · half Speed (3 turns)',
  sleep: 'Cards offline for 1 turn · swapping allowed',
  freeze: 'Cards offline for 1 turn · cannot swap · ×1.5 Fire damage',
  confusion: 'Fumbles 1 of its own skill cards per draw, if drawn (3 turns). A confused enemy picks its intent at random.',
};

export const INTENT_LABEL: Record<string, string> = {
  attack: 'Attack',
  cleave: 'Cleave · all slots',
  backstrike: 'Backstrike',
  buff: 'Powering up',
  debuff: 'Debuff',
  disrupt: 'Disrupt',
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
  /** §2.7.3 — a Gym's declared off-type member, the one it names before commitment. */
  guest: (name: string) => `Guest: ${name}`,
  guestTitle: (name: string) => `${name} — the Leader's guest`,
  guestFooter: (others: number) => `The other ${others} share the Gym's type and stay hidden until the fight.`,
};
export const MAP_TEXT = {
  /** §5.6.5 — an item ball with a guard on it is a fight, and says so. */
  guarded: 'Guarded find',
  /** A Gym keeps its Leader's name: which lane ends at whom is the choice the board is for. */
  gym: (leader: string) => `${leader}'s Gym`,
  /** §2.5 — the point of no return, said on the preview of the step that takes it. */
  commits: (leader: string) => `This step commits you to ${leader}'s Gym. The lanes never meet again.`,
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
  /** What the beat after Train says it did, on the scene's foot where Train stood. */
  trained: {
    stat: (stat: string, add: number) => `${stat} +${add}`,
    'move-upgrade': (from: string, to: string) => `${from} → ${to}`,
    level: (from: number, to: number) => `Lv ${from} → ${to}`,
    evolve: 'Ready to evolve',
    'move-replace': (out: string, into: string) => `${out} → ${into}`,
  },
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
  lastStanding: 'Your last Pokémon standing cannot go.',
  give: 'Give',
  trade: (name: string) => `Give ${name}`,
  offersLabel: 'Three face-down offers',
  arrivesAt: (from: number, to: number) => `Lv ${from} → ${to}`,
  joined: (name: string) => `${name} joins you!`,
  wentWith: (name: string) => `${name} went with the trader.`,
  walkOn: 'Walk on',
} as const;

/** §2.5.5 — the route's obstacles and its ledge, in words (v0.9.107). */
export const GATE_TEXT = {
  cut: { title: 'A small tree', body: 'It closes this step until one of these types in your Box cuts it down.' },
  smash: { title: 'A cracked rock', body: 'It closes this step until one of these types in your Box smashes it.' },
  surf: { title: 'Deep water', body: 'It closes this step until one of these types in your Box swims you across.' },
  ledge: { title: 'A ledge', body: 'Jump down past the next column, its fight and its pay. No climbing back.' },
  /** The preview of a step an obstacle closes. */
  closed: (title: string) => `${title} closes this step: nothing in your Box can clear it.`,
  /** The preview of the ledge's landing. */
  drop: 'You reach it by the ledge: one way, past the column before it.',
} as const;

/** §9.3 — the route board's own words. */
export const ROUTE_TEXT = {
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
      return `At the end of ${every(g.riptideEvery)} the tide trades your Lead with Bench 1 (Bench 2 if Bench 1 is down). It costs you nothing, and your next swap does not cost more.`;
    case 'swarm':
      return `Her Pokémon on the field hit ${pct(g.swarmPerWaiting)} harder for every one of hers still waiting to come out.`;
    case 'rollout':
      return `Her Lead hits ${pct(g.rolloutPerTurn)} harder for every turn in a row your Lead has been the same Pokémon, up to ${pct(g.rolloutPerTurn * g.rolloutMaxTurns)}. A swap resets the roll.`;
    case 'meltdown':
      return `Every attack his Pokémon land lowers its target's Defense one stage, down to ${g.meltdownFloor}.`;
    case 'bloom':
      return `At the end of each turn, each of her Pokémon on the field that took no damage restores ${pct(g.bloomHeal)} of its Max HP. A Burn or Poison tick counts as damage.`;
    case 'overcharge':
      return `${every(g.overchargeEvery)[0]!.toUpperCase()}${every(g.overchargeEvery).slice(1)} the field is overcharged: the first card you play costs ${g.overchargeAp} more AP.`;
    case 'toxic':
      return 'Every Poison his side inflicts is badly poisoned: its damage doubles each turn. Poison- and Steel-types are immune.';
    case 'mind-lock':
      return `At the draw of ${every(g.mindLockEvery)} she seals the strongest attack in your hand: it cannot be played that turn.`;
    case 'tremor':
      return `At the end of ${every(g.tremorEvery)} the ground shakes: each of your grounded Pokémon loses ${pct(g.tremorPercent)} of its Max HP; Flying-types and Levitate are spared.`;
    case 'close-quarters':
      return `Your Ranged cards deal ${pct(g.closeQuartersRanged)} against his Pokémon; your Melee cards ${pct(g.closeQuartersMelee)}.`;
    case 'ice-armour':
      return `Every turn her Lead's ice armour is set to ${pct(g.iceArmour)} of its Max HP: it takes damage before HP does and never stacks. A Fire move shatters it whole.`;
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
  pack: 'The wild Pokémon leads; its company stands behind it. Melee reaches only the one in front; a catch scatters them.',
  caller: 'The wild Pokémon can Call for Help. The call shows a turn ahead, with the name of who comes.',
  pair: 'Two fight at once: one leads, one stands behind it.',
  trio: 'Three fight at once: one leads, two stand behind it. The rest fill a place that falls.',
  double: 'Two fight at once, the rest waiting to step in. Melee reaches only the one in front.',
};

/** §5.6.1 — who in a fight acts twice, as the node's preview card promises it (v0.9.12). */
export const DOUBLE_ACTOR_LABEL: Record<'lead' | 'ace' | 'lead-and-ace' | 'last-two', string> = {
  lead: 'Its Lead acts twice',
  ace: 'Its ace acts twice',
  'lead-and-ace': 'Its first and its ace act twice',
  'last-two': 'Its last two act twice',
};
export const DOUBLE_ACTOR_HINT =
  'Two actions a turn, both shown. Hurt it by a quarter of its Max HP in your turn, or hit it super-effectively, and the second is broken.';

/**
 * §5.8.3 / §9.2.2.3 — a boss's phases in words: the chip, the pending cue, the commit banner, the bubble, and an open
 * signature that waits. The effects name what §5.9.4's archetype does; the numbers come from BattleConfig.
 */
export const PHASE_TEXT = {
  chip: (phase: number, of: number) => `Phase ${phase}/${of}`,
  /** The pending cue on the card: short enough for 720p at 150 % text; "next turn" is in its label and bubble. */
  pending: (phase: number) => `→ ${phase}`,
  pendingLabel: (phase: number) => `Phase ${phase} next turn`,
  title: (phase: number, of: number) => `Phase ${phase} of ${of}`,
  /** One line per archetype: what entering Phase 2 changes. */
  phase2: {
    entrenchment: (def: number) => `Dug in: +${def} Defense, once. It presses the attack.`,
    onslaught: () => 'Attacks only, and presses them.',
    'status-siege': () => 'Inflicts status wherever it can.',
    'tempo-control': (tax: number) => `Your AP −${tax} each turn while it stands.`,
  },
  phase3: (move: string | null) => (move ? `Last stand: presses the attack and declares ${move} at its next action.` : 'Last stand: presses the attack.'),
  phase1: 'No phase effect yet.',
  next: (phase: number, pct: number) => `Phase ${phase} at ${pct} % HP — it starts the turn after the bar crosses the notch.`,
  enters: 'A crossed notch is entered at the next turn’s start; healing never takes it back.',
  answer: (response: string) => `Answer: ${response}`,
  banner: (name: string, phase: number, effect: string) => `${name} · Phase ${phase} — ${effect}`,
  /** The banner's effect, in a few words. */
  short2: { entrenchment: 'digs in', onslaught: 'attacks only', 'status-siege': 'status siege', 'tempo-control': 'taxes your AP' } as const,
  short3: (move: string | null) => (move ? `last stand: ${move} next` : 'last stand'),
  signature: 'Signature',
  /** When the asleep or frozen chip above already says why, the waiting chip does not say it again. */
  waitingShort: 'Signature waiting',
  archetype: { entrenchment: 'Entrenchment', onslaught: 'Onslaught', 'status-siege': 'Status Siege', 'tempo-control': 'Tempo Control' } as const,
  fallback: (phase: number) => `Phase ${phase}`,
  waitLabel: { asleep: 'Asleep', frozen: 'Frozen', recharging: 'Recharging', paralysed: 'Paralysed', 'no-target': 'No target' } as const,
  waiting: (reason: string) => `Signature waiting — ${reason}`,
  waitingBody: (move: string) => `${move} comes at its first action it can take: not this turn. A Sleep or Freeze card does not cancel an action already declared.`,
};

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
    `It gets away at the end of turn ${turns}, leaving no XP, no drop and no toll. Knock it out first for its premium, or catch it. Asleep or frozen, it cannot run until it wakes.`,
  holdTitle: 'Hold out',
  holdBody: (turns: number, rise: number) =>
    `Keep a Pokémon standing to the end of turn ${turns}, or knock the guard out first, and the find is yours. Its Attack rises ${rise === 1 ? 'a stage' : `${rise} stages`} at the end of every turn. It cannot be caught.`,
  nodeHint: 'A fight: outlast the guard, or knock it out.',
  fleeHint: 'Or catch it before it runs.',
  fled: (name: string) => `${name} fled`,
  fledBody: 'No XP, no drop, no catch, and no toll.',
  heldBody: 'You held out: the find is yours.',
  getawayBody: "Its last action: nothing happens to you, and at the end of this turn it is gone. Knock it out or catch it before then.",
  guardMeta: 'On guard — its Attack rises every turn',
  getawayNote: " — gone at the turn's end",
} as const;

/** §2.5 / §5.6.5 — what a node is in one line, the same on the map's bubble and the preview card: a find with a guard is a fight. */
export const nodeHint = (node: { kind: string; preview: { objective?: { kind: string }; rosterId?: string } }): string =>
  node.preview.objective?.kind === 'hold' ? OBJECTIVE_TEXT.nodeHint
    : node.preview.objective?.kind === 'flee' ? OBJECTIVE_TEXT.fleeHint
    // §2.1.6 — the Champion's door is the last: there is no rest after it, only the run won.
    : node.kind === 'league' && node.preview.rosterId === 'champion' ? LEAGUE_TEXT.championHint
    : (NODE_HINT[node.kind] ?? '');

export const RUN_END_TEXT = {
  victoryTitle: 'Run complete!', defeatTitle: 'Run over',
  victoryLine: 'Your team made it to the top.', defeatLine: 'The team that got you here.',
  team: 'The team you finished with', badges: 'Badges earned', progress: 'Run record',
  closeRecord: 'Back to the team', mainMenu: 'Main menu', runAgain: 'Run again',
  metrics: { regions: 'Regions cleared', nodes: 'Nodes cleared', fights: 'Fights won', turns: 'Turns played', catches: 'Pokémon caught', faints: 'Faints', depth: 'Depth reached' },
  region: (n: number) => `Region ${n}`,
  victoryRoad: 'Victory Road', league: 'League', entrance: 'Entrance',
  champion: (name: string) => `Champion ${name}`,
  column: (n: number, total: number) => `Column ${n} / ${total}`,
  location: (zone: string, marker: string) => `${zone} · ${marker}`,
  trauma: (n: number) => `Trauma ×${n}`,
} as const;

export const NODE_HINT: Record<string, string> = {
  wild: 'Beat them for XP, or throw a ball and take one with you.',
  trainer: 'More XP than a wild fight. No catching.',
  elite: 'Its first and last Pokémon have a second phase. The hardest fight before the Gym.',
  'elite-wild': 'A boss-sized wild Pokémon.',
  aid: 'No fight, so you can walk in with nobody standing.',
  merchant: 'No fight. Once you walk on, the cart is gone.',
  mystery: 'No fight.',
  cache: 'No fight.',
  trader: 'No fight.',
  gym: 'Win the Badge.',
  apex: 'Catch it (it takes two places in the team) or beat it for a Legendary relic pick. Never both.',
  league: 'No running, and nothing heals in the fight.',
};

export const RUN_REJECT_TEXT: Record<string, string> = {
  'already-traded': 'One trade a visit.',
  'gate-closed': 'Something on the way closes this step: nothing in your Box can clear it.',
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
  'already-groomed': 'Groomed already this visit.',
  'not-forgotten': 'It has not forgotten that move.',
  'already-sold': 'That one is sold.',
  'not-in-city': 'Only in a town.',
  'building-closed': 'That door is not open yet.',
  'not-offered': 'That is not on offer.',
  'no-such-item': 'You are not carrying that.',
  'ring-closed': 'The ladder is done for this visit.',
  'nothing-to-restock': 'Nothing else to stock on this floor.',
  'bad-stake': 'That stake is not on the table.',
  'bad-bet': 'That bet is not on the table.',
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
  heal: 'Heal Pokémon',
  pokemon: 'Your Pokémon',
  pcBox: 'PC Box',
  groom: 'Grooming',
  groomLabel: (name: string) => `Groom ${name}`,
  groomedLabel: (name: string) => `${name} is groomed for this visit`,
  full: 'As fond as it gets',
  gained: (n: number) => `+${n}`,
  fullLabel: (name: string) => `${name} is as fond of you as it gets`,
  noTrauma: 'Nobody is carrying Trauma.',
  cannotAfford: 'Not enough money',
};

/** §6.9.2 — the Move Manager's Move Reminder. */
export const MOVE_MANAGER_TEXT = {
  reminder: 'Move Reminder',
  remindLabel: (move: string) => `Remember ${move}: back into the pool`,
  tookSlot: (by: string) => `${by} took its slot. Remembering is free, and keeps both.`,
  fourFull: 'The active 4 is full: bench one of them first.',
  lastCard: 'The last card in the four stays: a Pokémon always has a move.',
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
  lastOne: 'The last one in the formation stays.',
  /** §9.12 — the route's side panel is the team at a glance; the Team screen is where it changes. */
  panelHint: 'Change the team, its order and its moves on the Team screen (T).',
  waiting: (n: number) => `${n} waiting`,
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
  friendship: 'Friendship',
  hearts: (n: number) => `Friendship: ${String(n).replace('.5', '½')} of 5 hearts`,
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
  upShort: 'Upstairs',
  counters: 'The counters',
  dealt: 'Dealt this visit',
  trader: { name: 'The Trader', line: 'Fresh stock, no questions asked.' },
  fence: { name: 'The Fence', line: 'Candy for the road. And I buy what you don’t need.' },
  gambler: { name: 'The Gambler', line: 'Put up a few trinkets. Win, and the good one’s yours.' },
  showcase: { name: 'The Executive', line: 'A Legendary Pokémon. Three of yours.' },
  traded: 'Pleasure doing business.',
  soldOut: 'Sold out',
  pickGive: 'Pick one of yours to hand over',
  youGive: 'You give',
  youReceive: 'You receive',
  pickOffer: 'Pick an offer',
  fresh: 'Full HP · No Trauma',
  donorCondition: (hp: number, trauma: number) => `${hp > 0 ? `${hp} HP` : 'Fainted'} · Trauma ${trauma}`,
  itemToBag: (name: string) => `${name} → Bag`,
  confirmTrade: 'Confirm trade',
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
  alert: { label: 'Alert', hint: 'Hears you on the tiles beside it, even in grass, unless it is eating.' },
  'sharp-eared': { label: 'Sharp-eared', hint: 'Hears you within two tiles, even in grass, unless it is eating.' },
  water: { label: 'In its pond', hint: 'It never leaves the water. Reach it from the open shore.' },
};
/** §2.11.6 — the stalk's own words. */
export const SAFARI_TEXT = {
  giftPrompt: 'First catch: Ranger gift',
  giftLabel: 'Ranger gift',
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
  clerk: 'Everything on sale. The clerk buys held items back.',
  medicine: 'Potions, status cures and battle items.',
  'rare-medicine': 'The strongest medicine on sale.',
  tms: 'TMs someone in your Box can learn. Single use.',
  held: 'Items a Pokémon wears into every fight.',
  stones: 'A stone someone in your Box can use to evolve.',
  relics: 'Relics for the whole run, from Common to Rare.',
  'relics-common': 'Last the whole run; nothing to equip.',
  'relics-uncommon': 'Last the whole run; nothing to equip.',
  'relics-rare': 'Last the whole run; nothing to equip.',
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
  later: 'Evolve later',
  preparing: (name: string) => `${name} is preparing to evolve.`,
  preview: (from: string, to: string) => `${from} could evolve into ${to}.`,
  evolving: (name: string) => `What? ${name} is evolving!`,
  evolved: (from: string, to: string) => `Congratulations! Your ${from} evolved into ${to}!`,
  choose: (name: string) => `Choose ${name}'s path`,
  pick: 'Pick a path.',
  evolve: (label: string | null) => (label ? `Evolve · ${label}` : 'Evolve'),
};

/** §9.4.5 / §6.8.2 — a move waiting past the four, and what a Bond rank opened: words the fight's result and its doors share. */
export const STAT_SHORT = { hp: 'HP', attack: 'Atk', defense: 'Def', speed: 'Spd' } as const;
export const STAT_LONG: Record<string, string> = { hp: 'HP', attack: 'Attack', defense: 'Defense', speed: 'Speed' };
export const REWARD_TEXT = {
  inPool: 'in the pool',
  /** §6.8.2 — what a Bond rank opened, by rank (the hidden ability names itself). */
  bondUnlock: { 1: 'You know it', 2: 'Shiny Charm', 4: 'Mastery', 5: 'Starts a run', 6: 'Partner' } as Record<number, string>,
};

/** §9.4.5 — the result screen's words: the series' word on the ribbon, one line in its voice under it, and the labels. */
export const RESULT_TEXT = {
  ribbon: { victory: 'Victory!', caught: 'Gotcha!', defeat: 'Wiped out…', beaten: 'Beaten', escaped: 'Got away safely!', held: 'Held out!' },
  fled: (name: string) => `${name} fled!`,
  voice: {
    wild: (name: string) => `The wild ${name} fainted!`,
    wilds: 'The wild Pokémon fainted!',
    trainer: (name: string) => `You defeated ${name}!`,
    badge: (badge: string) => `Received the ${badge}.`,
    caught: (name: string) => `${name} was caught!`,
    boxFull: 'The Box is full.',
    defeat: 'Every Pokémon is down. The run ends here.',
    ringLost: 'The ladder is lost.',
    escaped: (foe: string) => `You ran from ${foe}.`,
    fled: (name: string) => `${name} got away before it went down.`,
  },
  wildFoe: (name: string) => `the wild ${name}`,
  /** The level-up panel's heading, as the series says it. */
  grew: (name: string, level: number) => `${name} grew to Lv ${level}!`,
  /** §6.9.1 — a track's step, said in words (the level tag's door, Training's live region). */
  grewInto: (from: string, to: string) => `${from} grew into ${to}`,
  reminderKeeps: (from: string) => `the Move Reminder keeps ${from}`,
  learned: 'New move',
  /** §6.9.1 — a track's step on the level-up panel: the old card struck, the new one in its slot. */
  upgraded: 'Grew into',
  /** v0.9.80 — a level that teaches a move waits for the player; this is what the waiting panel asks for. */
  clickOn: 'Click to go on',
  fainted: 'Fainted',
  stillThere: 'Still there',
  newCatch: 'New',
  boxFull: 'Box full',
  prize: 'Prize',
  wallet: (n: number) => `Now ${n.toLocaleString('en-GB')} ₽`,
  toll: 'Toll',
  tollShare: (pct: number) => `${pct} %`,
  /** A spoil card's foot: what kind of thing it is. */
  kind: { consumable: 'Item', ball: 'Ball', relic: 'Relic', 'held-item': 'Held item', tm: 'TM' },
  leftBehind: 'Lost',
  noXp: 'No XP',
  noToll: 'No toll',
  box: 'Box',
  received: 'Received',
  progress: 'Progress',
  progressHead: 'This fight moved',
  bond: 'Bond',
  skip: 'Skip',
  continue: 'Continue',
  chooseRelic: 'Choose a relic',
  runEnd: 'See how far you got',
  take: (name: string) => `Take ${name}`,
  takeIt: 'Take it',
  pickOne: 'Pick one',
  leave: 'Leave them',
  gymPrize: 'The Gym owes you something',
  elitePrize: "The Elite's prize",
};

/** §8.7 / §8.6.1 — the progress panel (v0.9.6); the fight's own progress is behind its result's door (§9.4.5). */
export const PROGRESS_TEXT = {
  heading: (kind: 'achievement' | 'discovery', done: boolean) => (kind === 'achievement' ? (done ? 'Journal entry done' : 'Journal progress') : done ? 'Field Note written' : 'Field Note progress'),
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
  center: 'Free healing and cures for the whole Box. Therapy treats Trauma; the PC Box picks the team.',
  mart: 'A shelf picked for your team, and Poké Balls. Dearer than the merchant; buys held items back.',
  'department-store': 'The biggest shelf of the run, and Poké Balls. Dearer than the merchant; buys held items back.',
  dojo: 'Tutor moves off the learnset, the line’s egg moves and passive abilities, as many as you can pay for.',
  ring: 'Rivals one after another, for a fee. Cash out after any win; lose a rung and you lose the winnings. You leave healed. Once per visit.',
  safari: 'Pokémon the routes rarely show. Stalk one through the grass, then throw. Once per visit.',
  'game-corner': 'Slots and roulette, with the odds printed on every machine.',
  gate: 'Choose one rule for the next Region, then set off. The town stays behind.',
  /** §2.11.3 — the gate while Region Modifiers are off (v0.9.9). */
  gatePlain: 'The road to the next Region. The town stays behind once you set off.',
};

/** §2.11.0 — what a door in development says when you walk in anyway. */
export const CITY_DOOR_SOON = 'Not open yet.';

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
      body: () => 'Today’s Pokémon are on show before you pay. The rings are how many alarms each will take: an Easy one forgives a mistake or two, a Rare bolts at its first.',
    },
    {
      title: 'Hide in the tall grass',
      body: () => 'It notices you on open ground, or on the tile right in front of it. Anywhere else in the tall grass you are hidden, even while it looks your way.',
    },
    {
      title: 'Read its next move',
      body: () => 'The dots are where it walks this turn; the yellow tiles are where you can step. Red with an eye: it would see you there when the turn ends. Pale red: it looks there, but the grass hides you.',
    },
    {
      title: 'Bait and rocks',
      body: () => 'Bait draws it over to eat for two turns: it looks one tile ahead and hears nothing. A rock stops it for a turn, facing the noise, so you can walk in behind.',
    },
    {
      title: 'One throw, the whole turn',
      body: () => 'End a turn within two tiles of it, then spend the next one throwing. The odds are on the button: closer, from behind, never seen and while it eats all raise them. A miss is an alarm.',
    },
    {
      title: 'Mind the balls and the clock',
      body: (n: GuideNumbers) =>
        `This ticket buys ${n.balls} Safari Balls and ${n.clock} turns for the whole visit, shared by every stalk. You have ${n.ap} actions a turn: a step, a bait or a rock costs one.`,
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
      body: () => 'The next rival and their whole team are on show before you pay, and before every rung.',
    },
    {
      title: 'Nothing heals between rungs',
      body: () => 'Your team walks into each rung as the last one left it: the HP, the statuses, the fainted.',
    },
    {
      title: 'Cash out, or climb',
      body: () => 'After every rung you win, take what the ladder has banked and leave, or fight on for more. Lose a rung and the bank goes with it.',
    },
    {
      title: 'The run never ends here',
      body: (n: RingNumbers) => `The fallen only take their Trauma. However the ladder ends, the ${n.name}'s medics heal your whole team.`,
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
  common: 'Most walks in meet one of these.',
  uncommon: 'Here, but harder to find.',
  rare: 'Starters, fossils and the giants. From Region 2, a Rare acts twice.',
};
export const WILD_TEXT = {
  pool: 'Who lives here',
  lure: 'The Lure Module rolls the rarity twice and keeps the rarer.',
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
  /** The standard run, as the first card of the picker: picked while no modifier is. */
  baseline: 'Baseline',
  baselineNote: 'The standard run. Nothing added.',
  /** The shelf of modifiers the account has not opened yet: one closed line, the rows a click away. */
  shelf: 'Locked modifiers',
  shelfNext: (rung: number) => `Next on League Ladder rung ${rung}`,
  shelfNone: 'Not available yet',
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
  from: (name: string, how: string | null) => (how ? `From ${name} · ${how}` : `From ${name}`),
  friendship: 'High Friendship',
  how: 'How it evolves',
  replaces: (move: string) => `, in ${move}'s slot`,
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
  signature: 'Signature',
  held: 'Held',
  stone: 'Stone',
  categories: 'Kind',
  yours: 'Your account',
  inPool: 'Open: it can turn up in a run.',
  byParcel: "Not opened yet — it arrives in an Oak's Parcel.",
  byNote: (text: string, have: number, goal: number) => `Not opened yet — a Field Note opens it: ${text} (${have} / ${goal}). Or take it from an Oak's Parcel.`,
  byBadge: (badge: string) => `Not opened yet — it comes with the ${badge}, the first time you win it.`,
  locked: 'Not opened yet.',
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
  pending: 'Not yet.',
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

/** §3.11 — the move keywords' chips on a card: a word on the chip, the rule in its bubble (one voice with the card's). */
export const KEYWORD_TEXT = {
  protect: { label: 'Protect', tip: 'Protect is up: nothing the other side aims at it lands this turn. An area hit still reaches the rest.' },
  endure: { label: 'Endure', tip: 'Endure: a hit that would knock it out this turn leaves it at 1 HP.' },
  guard: { label: (n: number) => `Guard ${n}`, tip: (n: number) => `Guard: the next ${n} damage from moves goes here first. Gone when the next turn starts.` },
  substitute: { label: (n: number) => `Sub ${n}`, tip: (n: number) => `Substitute: a decoy with ${n} HP takes the hits first, and no status or stat drop reaches it while it stands.` },
  counter: { label: 'Counter', tip: (range: 'melee' | 'ranged') => `Counter: every ${range === 'melee' ? 'Melee' : 'Ranged'} hit it takes this turn is returned half again as hard.` },
  recharge: { label: 'Recharge', now: 'Recharging: its cards are locked this turn and it cannot swap out.', next: 'It must recharge next turn: its cards will be locked and it cannot swap out.' },
  charge: { label: 'Charging', away: 'Away', tip: 'Charging: its hit lands at the start of next turn.', awayTip: 'Out of reach: everything aimed at it misses until its hit lands next turn.' },
  rampage: { label: 'Rampage', tip: (left: number) => `On a rampage: it cannot swap out, its move comes back free ${left} more time${left === 1 ? '' : 's'}, then it is Confused.` },
  rooted: { label: 'Rooted', tip: 'Rooted: it regenerates every turn and cannot swap out for the rest of the fight.' },
  taunt: { label: 'Taunted', tip: (until: number) => `Through Turn ${until} it can only attack.` },
  trapped: { label: 'Trapped', tip: (until: number) => `Through Turn ${until}, it cannot be swapped out by hand.` },
  drowsy: { label: 'Drowsy', tip: (mine: boolean) => `At the end of next turn it falls asleep, if it still leads. ${mine ? 'Swap it out to shake it off.' : 'Unless it swaps out.'}` },
  seeded: { label: 'Seeded', tip: (share: string, mine: boolean) => `It loses ${share} of its max HP at every turn's end, to the other side's Lead, while it leads. ${mine ? 'Swap it out to shake it off.' : 'Unless it swaps out.'}` },
  cursed: { label: 'Cursed', tip: (share: string, mine: boolean) => `It loses ${share} of its max HP at every turn's end while it leads. ${mine ? 'Swap it out to shake it off.' : 'Unless it swaps out.'}` },
  disabled: { label: 'Disabled', tip: (move: string, until: number) => `${move} cannot be used through Turn ${until}.` },
  helped: { label: 'Helped', tip: (m: string) => `Helping Hand: its hits this turn are ×${m}.` },
} as const;

/** A share of max HP as the series says it: ⅛, ¼, ½ — else a percent. */
export const frac = (p: number) => (p === 0.125 ? '⅛' : p === 0.25 ? '¼' : p === 0.5 ? '½' : `${Math.round(p * 100)}%`);

/**
 * §5.2.3 — the disruptions in words: `card` on the move's face (you playing it), `rule` in its bubble, `intent` on an
 * enemy's intent card (it, at you).
 */
export const DISRUPT_TEXT = {
  card: {
    disable: (t: number) => `Disables the foe's move for ${t} turns.`,
    taunt: 'Taunt: the foe only attacks next turn.',
    forceSwap: "Blows the foe's stat raises away.",
    trap: (t: number) => `The foe cannot swap out for ${t} turns.`,
    drowsy: 'Drowsy: asleep at the end of next turn.',
    perish: (t: number, share: string) => `In ${t} turns each Lead loses ${share} HP.`,
    seed: (share: string) => `Seeds the foe: ${share} a turn to your Lead.`,
    curse: (share: string) => `Curses the foe: ${share} a turn.`,
    hazard: (name: string) => `${name} on the foe's side.`,
    knockOff: "Knocks the foe's item off.",
    haze: 'Washes every stat change away.',
    helpingHand: (m: string) => `Your Lead hits ×${m} this turn.`,
  },
  rule: {
    disable: (t: number) => `Disable: the move the foe declared — else its strongest — cannot be used for ${t} turns; a declared one fizzles.`,
    taunt: 'Taunt: the foe’s declared move that does no damage fizzles, and next turn it only attacks.',
    forceSwap: 'On a foe: every stat it raised is blown away. An enemy’s Roar drags your Lead out instead.',
    trap: (t: number) => `Mean Look: the target cannot be swapped out by hand for ${t} turns.`,
    drowsy: 'Yawn: the target falls asleep at the end of next turn, if it still leads; a swap shakes it off.',
    perish: (t: number, share: string) => `Perish Song: after ${t} more turns, whoever leads on each side loses ${share} of its max HP.`,
    seed: (share: string) => `Leech Seed: ${share} of the target's max HP at each turn's end, to your Lead, while it leads; not a Grass-type.`,
    curse: (share: string) => `Curse: ${share} of the target's max HP at each turn's end while it leads.`,
    hazard: (name: string, effect: string) => `${name} on the foe's side: ${effect}.`,
    knockOff: 'Knock Off: hits harder while the target holds an item, and knocks it off for the fight.',
    haze: 'Haze: every stat change on the field, on both sides, is washed away.',
    helpingHand: (m: string) => `Helping Hand: your Lead's hits this turn are ×${m}.`,
  },
  intent: {
    disable: (move: string, t: number) => `Locks your Lead's strongest card, ${move}, for ${t} turns.`,
    taunt: "Next turn your Lead's cards that do no damage cannot be played.",
    drag: (who: string, entry: number) => `Drags your Lead out: ${who} is dragged in, free${entry > 0 ? `, and takes ${entry} from the hazards on your side` : ''}.`,
    stands: 'Your Lead stands its ground: it cannot move, or nobody can come in.',
    trap: (t: number) => `Your Lead cannot be swapped out by hand for ${t} turns.`,
    drowsy: 'Your Lead falls asleep at the end of next turn if it still leads.',
    perish: (t: number, share: string) => `After ${t} more turns, whoever leads on each side loses ${share} of its max HP.`,
    seed: (share: string) => `Your Lead loses ${share} of its max HP at each turn's end while it leads, to their Lead; a Grass-type shrugs it off.`,
    curse: (share: string) => `It pays half its own HP; your Lead loses ${share} at each turn's end while it leads.`,
    hazard: (name: string, effect: string) => `${name} on your side: ${effect}.`,
    knockOff: "Your Lead's held item is knocked off for the fight.",
    haze: 'Every stat change on the field is washed away — yours and its own.',
    helpingHand: (m: string) => `Its Lead's hits this turn are ×${m}.`,
    yourSide: 'On your side.',
    bothSides: 'On both sides of the field.',
  },
  /** The footer, by what answers it: a swap for most — not for a trap, a hazard (a swap steps onto it) or a Roar. */
  footer: 'Most of these are answered by a swap.',
  trapFooter: 'A swap cannot answer this one: outlast it, or break the plan before it lands.',
  hazardFooter: 'A swap steps onto it.',
  dragFooter: 'A rooted, frozen or recharging Lead stands its ground; it waits a turn before it roars again.',
} as const;

/** What a floating damage number names when no move dealt it: the status, the weather, the rule, the disruption. */
export const DAMAGE_CAUSE_LABEL: Record<Exclude<DamageCause, 'move'>, string> = {
  burn: 'burn',
  poison: 'poison',
  sandstorm: 'sandstorm',
  hail: 'hail',
  tremor: 'tremor',
  hazard: 'hazard',
  seed: 'seed',
  perish: 'Perish Song',
};

/** §5.2.3 — where a hazard, Perish Song or Haze is aimed, on its intent chip. */
export const INTENT_SIDE_LABEL = 'Your side';

/** §5.5.2 — a combo's finisher, shown under the set-up as next turn's plan. */
export const COMBO_TEXT = {
  label: 'Combo',
  title: 'A combo — its finisher, next turn',
  footer: (left: number) => `Break it this turn: ${left} more damage, or one super-effective hit. A KO, a sleep or a freeze cancels it too, and so does your Taunt or Disable on its set-up.`,
} as const;

/** §5.2.3 — Perish Song's count, on the top bar: both sides' Leads are struck when it ends. */
export const PERISH_TEXT = {
  label: 'Perish',
  title: 'Perish Song',
  body: (left: number, percent: number) => `In ${left} turn${left === 1 ? '' : 's'}, whoever leads on each side loses ${frac(percent)} of its max HP.`,
} as const;

/** §3.11 — a keyword's whole rule, for a card's bubble and an enemy stance's intent card. */
export const KEYWORD_RULE = {
  pp: 'Its last use takes the card out of the deck until the fight ends.',
  protect: 'Protect: nothing the other side aims at it lands this turn; an area hit still reaches the rest. Not two turns running.',
  endure: 'Endure: a hit that would knock it out this turn leaves it at 1 HP.',
  guard: (power: number) => `Guard: soaks about a ${power}-power hit before HP, until the next turn starts. Burn, Poison and weather pass it by.`,
  substitute: (pct: number) => `Substitute: pays ${pct}% of max HP for a decoy that takes the hits first; no status or stat drop reaches it while it stands.`,
  side: (name: string, effect: string, turns: number) => `${name}: ${effect} for ${turns} turns.`,
  field: (name: string, turns: number) => `Sets ${name} for ${turns} turns over whatever stood there, for both sides; then the fight's own ground returns.`,
  fieldCost: (delta: number, name: string) => `In ${name} it costs ${Math.abs(delta)} AP ${delta < 0 ? 'less' : 'more'}.`,
  recharge: 'Recharge: next turn its cards are locked and it cannot swap out. Its teammates still play.',
  fatigue: (ap: number) => `Fatigue: your next turn starts ${ap} AP short.`,
  rampage: (turns: number) => `Rampage: it comes back to your hand free for ${turns} turns while it cannot swap out, then it is Confused.`,
  charge: (away: boolean, skipIn: string | null) => `${away ? 'Out of reach: everything aimed at it misses until ' : 'Charge: '}the hit lands at the start of your next turn${skipIn ? `; in ${skipIn} it lands at once` : ''}.`,
  counter: (range: 'melee' | 'ranged', mult: number) => `Counter: every ${range === 'melee' ? 'Melee' : 'Ranged'} hit it takes this turn is returned ×${mult}.`,
  wish: (pct: number) => `Wish: whoever stands in its place at the end of next turn recovers ${pct}% of its max HP.`,
  root: 'Rooted: it regenerates every turn and cannot swap out for the rest of the fight.',
  batonPass: 'Baton Pass: on the step back, its stat changes and its Substitute go to the new Lead.',
  overexert: (ap: number) => `Overexert: it can be played with up to ${ap} AP you do not have; the rest comes off next turn.`,
} as const;

/** §3.11.6 / §4.3 — the side conditions' and the fields' names as the keyword lines say them. */
export const SIDE_NAME: Record<'reflect' | 'light-screen' | 'safeguard' | 'mist' | 'spikes' | 'stealth-rock', { name: string; short: string; effect: string }> = {
  spikes: { name: 'Spikes', short: 'Spikes: ⅛ on entry', effect: 'whoever steps into its Lead loses ⅛ of its HP (not Flying), for the rest of the fight' },
  'stealth-rock': { name: 'Stealth Rock', short: 'Stealth Rock: ⅛ × Rock on entry', effect: 'whoever steps into its Lead loses ⅛ of its HP times Rock’s effectiveness on it, for the rest of the fight' },
  reflect: { name: 'Reflect', short: 'Reflect: Melee −⅓', effect: 'Melee damage into its side is cut by a third' },
  'light-screen': { name: 'Light Screen', short: 'Light Screen: Ranged −⅓', effect: 'Ranged damage into its side is cut by a third' },
  safeguard: { name: 'Safeguard', short: 'Safeguard: no status', effect: 'no status can be put on its side' },
  mist: { name: 'Mist', short: 'Mist: no stat drops', effect: 'the other side cannot lower its side’s stats' },
};
export const FIELD_IN: Record<string, string> = { 'rain-dance': 'the rain', 'sunny-day': 'the Sun', hail: 'the hail', sandstorm: 'the sandstorm', 'electric-terrain': 'Electric Terrain', 'grassy-terrain': 'Grassy Terrain', 'psychic-terrain': 'Psychic Terrain', 'misty-terrain': 'Misty Terrain', 'toxic-spikes': 'Toxic Spikes', 'sticky-web': 'a Sticky Web' };

/** §5.2.1 — an enemy's stance on its intent card: it is already up. */
export const STANCE_LABEL = 'Up now';
export const STANCE_CHIP = ' — up now';
export const STANCE_FOOTER = 'A stance is up the moment it is declared: your cards this turn already meet it.';

/** §3.11.6 / §3.11.13 — a side's condition as a chip by its side: an icon and the turns, the rest in its bubble. */
export const SIDE_CHIP_TEXT = {
  title: (name: string, side: 'player' | 'enemy') => `${side === 'player' ? 'Your' : 'The foe’s'} ${name}`,
  turns: (n: number) => `${n} turn${n === 1 ? '' : 's'} left`,
  wish: (amount: number, place: string, turnsLeft: number) => `${amount} HP to whoever stands at ${place} at the end of ${turnsLeft <= 1 ? 'this' : 'next'} turn.`,
  wishName: 'Wish',
  more: (n: number) => `+${n}`,
  moreTitle: (n: number) => `${n} more on this side`,
  /** §5.2.3 — a hazard is named by where it lies: the side it hurts. */
  hazardTitle: (name: string, side: 'player' | 'enemy') => `${name} on ${side === 'player' ? 'your' : 'the foe’s'} side`,
  entry: (amount: number, name: string) => `${amount} of it from the ${name} on the way in.`,
} as const;

/** §4.3.15 — a field a move set: how long it has, and what comes back. */
export const FIELD_TIMER_TEXT = (turns: number, restore: string | null) => `${turns} turn${turns === 1 ? '' : 's'} left, then ${restore ? `${restore} returns` : 'it clears'}.`;

/** §3.11.12 — AP an overexerting card borrowed: off the next refill. */
export const AP_DEBT_TEXT = { mark: (n: number) => `−${n} next`, line: (n: number) => `${n} AP owed: next turn starts ${n} short.` } as const;

/** §8.3.6, §8.4.5, §8.6.2, §8.7, §8.14, §8.15 — the account's road: the Field Report, Oak's aide, the Kit, the lobby's walls. */
export const JOURNEY_TEXT = {
  aide: "Professor Oak's aide",
  rank: (n: number) => `Rank ${n}`,
  research: 'Research',
  researchTip: (early: number, count: number, cost: number) => `Every Trainer XP is a point of Research. A full bar is an Oak's Parcel: the first ${count} cost ${early}, the rest ${cost}, and what is left over carries.`,
  vault: (opened: number, total: number) => `${opened} / ${total} opened`,
  parcel: {
    tab: 'Parcels',
    title: 'A parcel from Professor Oak — take one',
    take: 'Take it',
    more: (n: number) => `${n} more waiting`,
    next: (n: number) => (n === 1 ? 'Next parcel' : `Next parcel (${n})`),
    added: (name: string) => `${name} can now turn up in a run.`,
    none: 'No parcel waiting. The next one arrives when Research fills.',
    vaultEmpty: 'The vault is empty: everything is open. A full Research bar pays Tokens now.',
  },
  journal: {
    title: 'Trainer Journal',
    pinned: 'Pinned',
    noPins: 'Nothing pinned',
    tip: "Every entry pays Tokens by its medal and hands over something with a name: a parcel, a relic, a trophy for your card. Pin up to three: the new-run screen names them, and a run's end shows how close they are.",
    done: 'Done',
    hidden: 'A hidden entry: what it asks is revealed when it is done.',
    pin: (name: string) => `Pin ${name}`,
    unpin: (name: string) => `Unpin ${name}`,
    pinTitle: (pinned: boolean) => (pinned ? 'Pinned' : 'Pin it'),
    pinBody: (pinned: boolean, canPin: boolean) => (pinned ? 'One of the entries you are chasing. Click to unpin it.' : canPin ? "Keep this entry in view: on the new-run screen and at a run's end." : 'Three are pinned already: unpin one first.'),
  },
  kit: {
    slots: 'Kit slots',
    empty: 'Empty',
    slotOpen: 'An open slot. Pack one of your perks into it.',
    slotLocked: (rank: string) => `This slot opens at ${rank}.`,
    yours: 'Your perks',
    none: "No perks yet. The Poké Mart sells them, and Professor Oak's aide hands some over as your Pokédex fills.",
    toFind: 'Still to find',
    pack: 'Pack',
    unpack: 'Unpack',
    full: 'Kit full',
    atAide: (owned: number) => `${owned} species`,
    atAideTip: (owned: number) => `${owned} species owned`,
    unpackLabel: (name: string) => `Unpack ${name}`,
  },
  report: {
    title: 'Field Report',
    skip: 'Skip',
    tally: 'The run',
    nothing: 'Nothing to report',
    line: { fights: 'Fights won', recruits: 'New recruits', evolutions: 'Evolutions', badges: 'Badges', discoveries: 'Species discovered', pokedex: 'Pokédex', journal: 'Journal', distance: 'Distance covered' } as Record<string, string>,
    parcelsEarned: (n: number) => (n === 1 ? "An Oak's Parcel arrived" : `${n} Oak's Parcels arrived`),
    openParcel: (n: number) => (n === 1 ? 'Open the parcel' : `Open a parcel (${n})`),
    later: 'Later',
    done: 'Done',
    tallyMore: (n: number) => `${n} more`,
    xpFooter: 'XP moves your Rank and fills Research.',
    rankBar: 'Trainer Rank',
    topRank: 'Top rank',
    toNext: (xp: number, next: string) => `${xp} XP to ${next}`,
    rankUp: (from: string, to: string) => `${from} → ${to}`,
    bond: 'Bond',
    noBond: 'No Bond this run',
    bondRank: (rank: number, max: number) => `Rank ${rank} of ${max}.`,
    bondBar: (name: string) => `${name} line's Bond`,
    moreLines: (n: number) => `and ${n} more line${n === 1 ? '' : 's'}`,
    earned: 'Earned',
    nothingNamed: 'Nothing new this time',
    more: (n: number) => `${n} more`,
    rank: (name: string, arrives: string) => `${name}: ${arrives}`,
    badge: (name: string) => `${name}, in your Badge Case`,
    badgeDetail: "The first time you have beaten this Leader. Their TM can now turn up in a run, and they stand in your lobby.",
    opened: (name: string) => `${name} unlocked`,
    note: (name: string) => `Field Note: ${name}`,
    parcels: (n: number) => (n === 1 ? "an Oak's Parcel" : `${n} Oak's Parcels`),
    aide: (owned: number, prize: string) => `${owned} species owned: ${prize}`,
    ribbons: (n: number) => (n === 1 ? 'A Ribbon pinned' : `${n} Ribbons pinned`),
    ribbonsDetail: "A line's Ribbons are on its page of the Pokédex.",
    ladder: (rung: number) => `League Ladder rung ${rung} won`,
    hall: 'Entered the Hall of Fame',
    next: 'Next time',
    pinned: 'Pinned',
    noGoals: 'Every entry in the Journal is done',
  },
  card: {
    stars: 'Stars',
    star: (earned: string, got: boolean) => (got ? 'Earned.' : `${earned} to earn it.`),
    badgeCase: 'Badge Case',
    badgeCaseTip: "Every Badge you have ever won, across every run: a row a Region. A Leader's first Badge unlocks their TM, and brings the Leader to your lobby.",
    badgeGot: (tm: string) => `Won. ${tm} unlocked.`,
    badgeNot: (tm: string) => `Not won yet. Its Leader holds ${tm}.`,
    road: 'The road ahead',
    roadTip: "Every Trainer Rank brings someone or something to the lobby — Professor Oak's aide, the Poké Mart clerk, a Kit slot, fuller parcels — and a purse of Tokens with it.",
    roadTotal: (tokens: number, last: string) => `${tokens} Tokens by ${last}.`,
    ladder: (rung: number, top: number) => `Rung ${rung} / ${top}`,
    /** §8.4.3 — the record's tiles: a short label on the card, what counts in its bubble. */
    facts: {
      runs: { label: 'Runs won · lost', tip: 'Runs that beat the Champion, and runs that did not.' },
      fights: { label: 'Fights won', tip: 'Every fight won, wild or trainer, across every run.' },
      recruits: { label: 'Recruited · evolved', tip: 'Pokémon that joined a Box of yours, and evolutions you chose.' },
      pokedex: { label: 'Pokédex', tip: 'Species you have met. Meet them all for the Pokédex star.' },
      journal: { label: 'Journal', tip: "The Trainer Journal, with Professor Oak's aide." },
      soulbound: { label: 'Soulbound lines', tip: (rank: number) => `Lines at Bond rank ${rank} or above: the line can start a run.` },
      ladder: { label: 'League Ladder', tip: 'The highest League Ladder rung you have won. The Ladder opens when you beat the Champion.' },
      lead: { label: 'Favourite Lead', tip: 'The Pokémon that has spent the most turns as your Lead, across every run.' },
    },
  },
  lobby: {
    leader: (badge: string) => `You beat them for the ${badge}.`,
    partner: 'A Partner line: its Bond is at the top rank.',
  },
  hall: {
    tab: 'Hall of Fame',
    empty: 'No run has beaten the Champion yet. The first one is kept here, with its team.',
    run: (n: number) => `Run ${n}`,
    rung: (n: number) => (n > 0 ? `Ladder rung ${n}` : 'Baseline'),
    badges: (n: number) => `${n} Badge${n === 1 ? '' : 's'}`,
    relics: (n: number) => `${n} relic${n === 1 ? '' : 's'}`,
    tip: (seed: number) => `Seed ${seed}. The run that beat the Champion, as it ended.`,
  },
  ladder: {
    card: (rung: number) => `League Ladder · Rung ${rung}`,
    tipTitle: (rung: number) => `League Ladder — rung ${rung}`,
    win: (top: boolean) => (top ? 'The top rung: win it for the League Ladder star.' : 'Win it to open the next rung, and to free its newest modifier for custom runs.'),
    locked: 'The League Ladder opens when you beat the Champion.',
  },
  preflight: {
    kit: 'Kit',
    goals: 'Chasing',
    noKit: 'Nothing packed',
    kitTitle: 'Your Trainer Kit',
    kitEmpty: 'No perk is packed. Pack one at the Kit table in the Hub.',
    goalsTitle: 'Pinned in your Journal',
  },
} as const;
