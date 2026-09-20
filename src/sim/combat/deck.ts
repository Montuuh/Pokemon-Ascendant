import type { GameRng } from '../rng/gameRng';
import type { CombatState, ConsumableCard, SkillCard } from './state';

// §3.4 — the Skill Deck: 4 cards per Active Pokémon, discard-and-reshuffle, purge on faint.
// §3.5 — the Consumable Pile: per-combat-use roster, 2 drawn per turn, unused return to the pool.

export function buildSkillDeck(state: CombatState, moveIdsByUid: ReadonlyArray<[string, string[]]>): SkillCard[] {
  const cards: SkillCard[] = [];
  for (const [ownerUid, moveIds] of moveIdsByUid) {
    for (const moveId of moveIds) {
      cards.push({ id: `c${state.nextCardSerial++}`, moveId, ownerUid });
    }
  }
  return cards;
}

/** Draw up to `count` skill cards into the hand; reshuffles the discard when the deck runs dry (§3.4). */
export function drawSkillCards(state: CombatState, count: number, rng: GameRng): SkillCard[] {
  const drawn: SkillCard[] = [];
  const p = state.player;
  for (let i = 0; i < count; i++) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) break;
      p.deck = rng.shuffle(p.discard);
      p.discard = [];
      // §7.3 — Recycle Tag and Cycle Cell both pay out on a reshuffle; flag it once, read it twice.
      p.reshuffled = true;
    }
    const card = p.deck.pop()!;
    p.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

/**
 * §3.3.5 — remove a fainted owner's cards from deck AND discard. Hand cards are dropped at turn end.
 *
 * §8.8 Faint Echo delays only the discard half. The deck purge stays immediate whatever the modifier says,
 * because the alternative is drawing a card from a Pokémon that is not there — the modifier is meant to jam
 * your reshuffles, not to hand you phantom plays.
 */
export function purgeOwner(state: CombatState, ownerUid: string): number {
  const p = state.player;
  const before = p.deck.length + p.discard.length;
  p.deck = p.deck.filter((c) => c.ownerUid !== ownerUid);
  if (state.modifiers.includes('faint-echo')) {
    // Jam the pile instead: the cards sit there dead until `sweepEchoes` clears them next turn end.
    for (const card of p.discard) if (card.ownerUid === ownerUid) card.echoUntilTurn = state.turn + 1;
    p.echoing = true;
  } else {
    p.discard = p.discard.filter((c) => c.ownerUid !== ownerUid);
  }
  return before - (p.deck.length + p.discard.length);
}

/** §8.8 Faint Echo — at the end of each turn, echoes whose turn has passed finally leave the discard pile. */
export function sweepEchoes(state: CombatState): number {
  const p = state.player;
  if (!p.echoing) return 0;
  const before = p.discard.length;
  p.discard = p.discard.filter((c) => c.echoUntilTurn === undefined || c.echoUntilTurn > state.turn);
  p.echoing = p.discard.some((c) => c.echoUntilTurn !== undefined);
  return before - p.discard.length;
}

/** End of Resolution — alive owners' hand cards go to the discard; fainted owners' cards are dropped (§3.4). */
export function discardHand(state: CombatState, isOwnerAlive: (uid: string) => boolean): void {
  const p = state.player;
  for (const card of p.hand) if (isOwnerAlive(card.ownerUid)) p.discard.push(card);
  p.hand = [];
}

export function buildConsumablePool(state: CombatState, consumableIds: readonly string[]): ConsumableCard[] {
  return consumableIds.map((consumableId) => ({ id: `k${state.nextCardSerial++}`, consumableId }));
}

/** §3.5 — draw `count` distinct consumables from the pool into the consumable hand. */
export function drawConsumables(state: CombatState, count: number, rng: GameRng): ConsumableCard[] {
  const c = state.player.consumables;
  const drawn: ConsumableCard[] = [];
  for (let i = 0; i < count && c.pool.length > 0; i++) {
    const idx = rng.range(0, c.pool.length);
    const [card] = c.pool.splice(idx, 1);
    c.hand.push(card!);
    drawn.push(card!);
  }
  return drawn;
}

/** Unused consumable cards return to the pool at turn end; used ones stay set aside (§3.5). */
export function returnConsumableHand(state: CombatState): void {
  const c = state.player.consumables;
  c.pool.push(...c.hand);
  c.hand = [];
}
