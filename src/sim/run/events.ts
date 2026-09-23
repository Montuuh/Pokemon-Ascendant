import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { RunState } from './types';

// §2.10 — Mystery Events. A flavour scene plus 2–3 choices, and **each choice states its outcome up front**
// unless the event is tagged a Gamble (§2.10.1). Pillar 1 holds even inside "Mystery": the badge on the map
// says which risk band you are walking into, and a Gamble still states the *space* of outcomes.
//
// A choice is data, not a script (§2.10.3's closed vocabulary), so a new event needs no new code.

export type EventRisk = 'safe' | 'tradeoff' | 'gamble';

export type EventOutcome =
  | { kind: 'money'; amount: number }
  | { kind: 'balls'; amount: number }
  | { kind: 'consumables'; ids: string[] }
  | { kind: 'relic'; rarity: 'common' | 'uncommon' }
  | { kind: 'held-item' }
  | { kind: 'heal-box'; percent: number }
  | { kind: 'hurt-box'; percent: number }
  | { kind: 'clear-trauma' }
  | { kind: 'add-trauma'; stacks: number }
  /** A weighted flip between two outcome lists; only a Gamble may use it, and both sides are shown. */
  | { kind: 'gamble'; chance: number; win: EventOutcome[]; lose: EventOutcome[] }
  | { kind: 'nothing' };

export interface EventChoice {
  label: string;
  /**
   * What it does, in the player's words. A Gamble states the odds rather than hiding them.
   *
   * This string is the promise; `outcomes` is the machine that keeps it. `eventContent.test.ts` asserts the
   * two do not drift — every ₽ figure and percentage the detail names has to appear in the outcomes.
   */
  detail: string;
  /** §2.10.2 — what the choice costs to take. The choice is unavailable if the run cannot pay. */
  cost?: number;
  /**
   * Applied in order. A list rather than a single outcome because a Tradeoff is *two* things — "250 ₽ but
   * the team arrives tired" is not expressible as one, and writing it as one is how a screen ends up lying.
   */
  outcomes: EventOutcome[];
}

export interface MysteryEvent {
  id: string;
  risk: EventRisk;
  title: string;
  scene: string;
  choices: EventChoice[];
}

/**
 * The v0.4 nine, drawn from docs/design/catalogs/mystery-events.md. The catalogue authors 22; the roadmap
 * asks for four, and nine lands a risk mix of 3 Safe · 4 Tradeoff · 2 Gamble — 33/44/22 against §2.10.3's
 * 30/50/20, which is as close as nine whole events get.
 *
 * The rest arrive with the systems they need: `mysterious-stone` wants Evolution Items, `wandering-tutor`
 * wants a Dojo you can reach from anywhere, `fossil-dig` wants Aerodactyl. None of them is cut — they are
 * waiting on content, and a row that would have to fake its effect is a row that stays out of the pool.
 */
export const MYSTERY_EVENTS: MysteryEvent[] = [
  {
    id: 'berry-bush',
    risk: 'safe',
    title: 'A bush heavy with berries',
    scene: 'The branches are bending under the weight of them. Your team has already noticed.',
    choices: [
      { label: 'Eat here', detail: 'Every Pokémon in the Box recovers 30 % of its HP.', outcomes: [{ kind: 'heal-box', percent: 30 }] },
      { label: 'Harvest them', detail: 'Take three Potions for later.', outcomes: [{ kind: 'consumables', ids: ['potion', 'potion', 'potion'] }] },
    ],
  },
  {
    id: 'lost-backpack',
    risk: 'safe',
    title: 'An unattended pack',
    scene: 'Left against a signpost, dusty, with nobody in sight for an hour in either direction.',
    choices: [
      { label: 'Take the supplies', detail: 'A Super Potion, an Antidote and an Ether.', outcomes: [{ kind: 'consumables', ids: ['super-potion', 'antidote', 'ether'] }] },
      { label: 'Take the cash', detail: '200 ₽.', outcomes: [{ kind: 'money', amount: 200 }] },
      { label: 'Leave it', detail: 'Someone may come back for it.', outcomes: [{ kind: 'nothing' }] },
    ],
  },
  {
    id: 'abandoned-pokeball',
    risk: 'safe',
    title: 'A dented ball in the grass',
    scene: 'Half-buried, scuffed, and still humming faintly when you pick it up.',
    choices: [
      { label: 'Keep it', detail: 'Two Poké Balls.', outcomes: [{ kind: 'balls', amount: 2 }] },
      { label: 'Prise it open', detail: 'Whatever was stored inside: an Ether.', outcomes: [{ kind: 'consumables', ids: ['ether'] }] },
    ],
  },
  {
    id: 'daycare-recovery',
    risk: 'tradeoff',
    title: 'An old couple with a spare pen',
    scene: 'They will not take money. They would just like something to look after for an afternoon.',
    choices: [
      { label: 'Leave one to rest', detail: 'Clears the Trauma off your most worn-out Pokémon.', outcomes: [{ kind: 'clear-trauma' }] },
      { label: 'Thank them and go', detail: 'They send you off with 150 ₽ and a packed lunch.', outcomes: [{ kind: 'money', amount: 150 }] },
    ],
  },
  {
    id: 'moving-truck',
    risk: 'tradeoff',
    title: 'A courier, short-handed',
    scene: 'The cargo is heavy and the next town is uphill. He is offering well over the going rate.',
    choices: [
      { label: 'Carry the cargo', detail: '250 ₽, but the whole team ends the day tired: −15 % HP.', outcomes: [{ kind: 'money', amount: 250 }, { kind: 'hurt-box', percent: 15 }] },
      { label: 'Decline', detail: 'Keep your legs for the route.', outcomes: [{ kind: 'nothing' }] },
    ],
  },
  {
    id: 'roadside-trader',
    risk: 'tradeoff',
    title: 'A trader with one crate left',
    scene: 'Everything else sold at the last town. What is left is the good stuff, and he knows it.',
    choices: [
      { label: 'Buy the charm', detail: 'A Common relic.', cost: 250, outcomes: [{ kind: 'relic', rarity: 'common' }] },
      { label: 'Buy the good one', detail: 'An Uncommon relic.', cost: 450, outcomes: [{ kind: 'relic', rarity: 'uncommon' }] },
      { label: 'Browse and leave', detail: 'Nothing today.', outcomes: [{ kind: 'nothing' }] },
    ],
  },
  {
    id: 'hot-spring',
    risk: 'tradeoff',
    title: 'Steam rising off a pool',
    scene: 'It smells of minerals and it is very, very warm. Nobody is going to want to leave.',
    choices: [
      {
        label: 'Pay for the bathhouse',
        detail: 'The whole Box heals to full and one Trauma stack comes off your worst-worn Pokémon.',
        cost: 200,
        outcomes: [{ kind: 'heal-box', percent: 100 }, { kind: 'clear-trauma' }],
      },
      { label: 'A quick dip', detail: 'Free. Every Pokémon recovers 40 % of its HP.', outcomes: [{ kind: 'heal-box', percent: 40 }] },
    ],
  },
  {
    id: 'slot-booth',
    risk: 'gamble',
    title: 'A carny with a coin',
    scene: 'Heads you double it, tails it is his. He lets you inspect the coin. It is a normal coin.',
    choices: [
      {
        label: 'Wager 100 ₽',
        detail: 'A true coin flip. Half the time you take 250 ₽, half the time the 100 ₽ is gone.',
        cost: 100,
        outcomes: [{ kind: 'gamble', chance: 0.5, win: [{ kind: 'money', amount: 250 }], lose: [{ kind: 'nothing' }] }],
      },
      { label: 'Walk on', detail: 'Nothing gained, nothing lost.', outcomes: [{ kind: 'nothing' }] },
    ],
  },
  {
    id: 'unmarked-cave',
    risk: 'gamble',
    title: 'A crack in the rock face',
    scene: 'Cold air is coming out of it. Something in there is either a stash or a very bad afternoon.',
    choices: [
      {
        label: 'Squeeze inside',
        detail: 'Two thirds of the time: a Held Item. One third: the team takes a beating, −25 % HP and a Trauma stack.',
        outcomes: [
          { kind: 'gamble', chance: 0.66, win: [{ kind: 'held-item' }], lose: [{ kind: 'hurt-box', percent: 25 }, { kind: 'add-trauma', stacks: 1 }] },
        ],
      },
      { label: 'Mark it on the map and go', detail: 'Nothing now.', outcomes: [{ kind: 'nothing' }] },
    ],
  },
];

const BY_ID = new Map(MYSTERY_EVENTS.map((e) => [e.id, e]));
export const mysteryEvent = (id: string): MysteryEvent => {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown mystery event "${id}"`);
  return e;
};

/** §2.10.4 — events never repeat within a run, so the pool is drawn from without replacement. */
export function rollEvent(rng: GameRng, seen: readonly string[]): string {
  const pool = MYSTERY_EVENTS.filter((e) => !seen.includes(e.id));
  const from = pool.length ? pool : MYSTERY_EVENTS;
  return from[Math.min(from.length - 1, Math.floor(rng.range01() * from.length))]!.id;
}

/** Every outcome a choice can produce, gamble branches included — what a validator has to walk. */
export function allOutcomes(choice: EventChoice): EventOutcome[] {
  return choice.outcomes.flatMap((o) => (o.kind === 'gamble' ? [o, ...o.win, ...o.lose] : [o]));
}

/** Fails loudly at load if an event names a consumable that does not exist. */
export function assertEventContent(content: ContentRegistry): void {
  for (const e of MYSTERY_EVENTS) {
    for (const c of e.choices) {
      for (const o of allOutcomes(c)) {
        if (o.kind === 'consumables') o.ids.forEach((id) => content.consumable(id));
      }
    }
  }
}

/** The risk badge the map shows before you commit (§2.10.4). */
export const RISK_LABEL: Record<EventRisk, string> = {
  safe: 'Safe',
  tradeoff: 'Tradeoff',
  gamble: 'Gamble',
};

export const eventRiskOf = (run: RunState): EventRisk | null => (run.pendingEvent ? mysteryEvent(run.pendingEvent).risk : null);
