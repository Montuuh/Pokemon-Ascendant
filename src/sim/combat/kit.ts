import type { ContentRegistry, EvolutionBranch, LearnsetEntry, SpeciesDef } from '../content/defs';
import type { PokemonType } from '../types';

// §6.3.5 / §6.9 — a line's kit as slots (v0.9.5). A base form learns four moves; every evolution after that rewrites
// slots: the first evolution upgrades two and adds one, the last swaps up to three. A payload names a slot by the move
// that first held it, so a Venusaur branch that swaps "Vine Whip" lands on Razor Leaf if an Ivysaur branch had already
// turned Vine Whip into Razor Leaf — whichever branch was taken before. Since v0.9.11 an evolved form also learns its
// line's signature moves by level, so no path ends without a real attack of its type (the user: rather too many moves
// than a Pokémon with bad ones) — the pool is the choice, the active four are the deck.

/**
 * §6.3.5 / §6.9 — how many moves a species may carry or be offered, as data (v0.9.9, the user's call: a validator over
 * every species). `kit` — the cards a form holds on any path through its line, what it learns by level included;
 * `learnset` — level-up entries; `tutor` / `egg` — its Dojo lists; `offered` — everything a form can be shown with: its
 * kit, its tutor list, its line's egg moves and its Mastery Move. `content.test` walks all 151 against it. Raised in
 * v0.9.11 with the evolved forms' learnsets (a final form's kit is now 8–11 cards): a guard against runaway lists, not a
 * budget — the deck is still each Pokémon's active four.
 */
export const MOVE_CAP = { kit: 18, learnset: 14, tutor: 3, egg: 3, offered: 24 } as const;

/**
 * Every upgrade in the line, read backwards: an evolved card → the cards it can have come from. A branch's upgrades and,
 * since v0.9.91, the learnsets' tracks (§6.9.1): a move that replaces another holds that move's slot. `tracks: false`
 * leaves the tracks out — what a branch's payload follows: a slot a track has grown is the track's, and a branch's
 * upgrade of the move it grew from arrives beside it, not over it (a Sandslash keeps the Dig its Scratch became).
 */
export function upgradeParents(content: ContentRegistry, speciesId: string, tracks = true): Map<string, Set<string>> {
  const base = content.lineBase(speciesId);
  const parents = new Map<string, Set<string>>();
  const edge = (to: string, from: string) => {
    if (!parents.has(to)) parents.set(to, new Set());
    parents.get(to)!.add(from);
  };
  const visit = (id: string) => {
    const s = content.species(id);
    for (const b of s.branches) for (const u of b.upgrades) edge(u.to, u.from);
    if (tracks) for (const l of s.learnset) if (l.replaces) edge(l.move, l.replaces);
    for (const next of s.evolvesTo) visit(next);
  };
  visit(base);
  return parents;
}

/** The cards `move` can have come from, nearest first (its slot's history). */
function ancestorsOf(move: string, parents: Map<string, Set<string>>): string[] {
  const out: string[] = [];
  const queue = [move];
  while (queue.length) {
    const x = queue.shift()!;
    for (const y of parents.get(x) ?? []) if (!out.includes(y) && y !== move) { out.push(y); queue.push(y); }
  }
  return out;
}

/**
 * §6.9 / §6.9.1 — one learnset row on a pool. A move the pool already holds (or the card a branch or a track made of it)
 * is not learned again. A track's row takes the slot of the move it replaces — that move itself, or an earlier step of its
 * track a late catch never learned — in place; a slot a branch has rewritten into something else is left to the branch,
 * and the row is learned beside it. Mutates `pool`; returns what happened, or null when nothing did.
 */
export function learnInto(pool: string[], entry: Pick<LearnsetEntry, 'move' | 'replaces'>, parents: Map<string, Set<string>>): { move: string; replaced: string | null } | null {
  if (holdsSlot(pool, entry.move, parents)) return null;
  if (entry.replaces) {
    const history = [entry.replaces, ...ancestorsOf(entry.replaces, parents)];
    const i = pool.findIndex((m) => history.includes(m));
    if (i >= 0) {
      const replaced = pool[i]!;
      pool[i] = entry.move;
      return { move: entry.move, replaced };
    }
  }
  pool.push(entry.move);
  return { move: entry.move, replaced: null };
}

/**
 * §6.9.2 — the Move Reminder: the moves a track or an evolution took out of this pool that its line learns by level at or
 * below `level` — Ember after Flamethrower, Tackle after a branch's Headbutt. Remembering one puts it back in the pool.
 */
export function forgottenMoves(pool: readonly string[], speciesId: string, level: number, content: ContentRegistry): string[] {
  return reminderOptions(pool, speciesId, level, content).map((o) => o.move);
}

/** §6.9.2 — the same, each with the card in the pool that took its slot (`by`), for the Move Manager to name. */
export function reminderOptions(pool: readonly string[], speciesId: string, level: number, content: ContentRegistry): { move: string; by: string }[] {
  const parents = upgradeParents(content, speciesId);
  const learnt = new Set(content.lineLearnset(speciesId).filter((l) => l.level <= level).map((l) => l.move));
  const out: { move: string; by: string }[] = [];
  for (const m of pool) for (const a of ancestorsOf(m, parents)) if (learnt.has(a) && !pool.includes(a) && !out.some((o) => o.move === a)) out.push({ move: a, by: m });
  return out;
}

/** Where `from` sits in the pool: the move itself, or the card that slot has become. −1 when the slot is empty. */
export function slotIndex(pool: readonly string[], from: string, parents: Map<string, Set<string>>): number {
  const direct = pool.indexOf(from);
  if (direct >= 0) return direct;
  return pool.findIndex((m) => {
    const seen = new Set<string>();
    const queue = [m];
    while (queue.length) {
      const x = queue.shift()!;
      if (x === from) return true;
      for (const y of parents.get(x) ?? []) if (!seen.has(y)) { seen.add(y); queue.push(y); }
    }
    return false;
  });
}

/** §6.9 — the pool already holds this move, or the card an evolution made of it (v0.9.11): a level-up never teaches back
 *  the weaker card a branch has rewritten — a Venusaur with Razor Leaf+ does not learn Razor Leaf at 30. */
export function holdsSlot(pool: readonly string[], move: string, parents: Map<string, Set<string>>): boolean {
  return slotIndex(pool, move, parents) >= 0;
}

/** §6.3.5 — a branch's payload on a pool: each upgrade replaces its slot in place (or arrives as a gift when the slot
 *  was never learned), each addition is appended. The pool deduplicates. */
export function applyPayload(pool: readonly string[], branch: Pick<EvolutionBranch, 'upgrades' | 'adds'>, parents: Map<string, Set<string>>): string[] {
  const out = [...pool];
  for (const u of branch.upgrades) {
    const i = slotIndex(out, u.from, parents);
    if (i >= 0) out[i] = u.to;
    else if (!out.includes(u.to)) out.push(u.to);
  }
  for (const a of branch.adds) if (!out.includes(a)) out.push(a);
  return [...new Set(out)];
}

/** The species from the line's base to `speciesId`, through whichever branch of the line leads there. */
export function lineChain(content: ContentRegistry, speciesId: string): SpeciesDef[] {
  const find = (s: SpeciesDef): SpeciesDef[] | null => {
    if (s.id === speciesId) return [s];
    for (const next of s.evolvesTo) {
      const rest = find(content.species(next));
      if (rest) return [s, ...rest];
    }
    return null;
  };
  return find(content.species(content.lineBase(speciesId))) ?? [content.species(speciesId)];
}

/**
 * §6.7.2 — the Move Manager's "Auto" button, and the fallback for a player who never opens it.
 *
 * Two kit rules from §6.3.6 are enforced here, and both were learned the hard way from the whole-run harness:
 *
 *  1. **Two ways to deal damage.** "The four most recently learned" alone produced kits with one damaging
 *     card, or none — Oddish learns Absorb at 1 and Acid at 7, so by level 10 its only card that hurts a Rock
 *     was gone.
 *  2. **At least one Ranged card** (§6.3.6.5), whenever the pool has one. A four-Melee kit is a dead hand
 *     every turn that Pokémon is benched. Evolution branches made this reachable: a Vanguard Charmeleon's
 *     pool is mostly Melee, and picking purely by power dropped Ember — the only card it could play from the
 *     bench — which cost the Charmander line two thirds of its win rate before the harness caught it.
 *
 * Otherwise: keep the two strongest attacks (one of its own type), fill with the newest of the rest — not a move
 * beside its own + — and return them in learn order so the kit still reads as a history. An enemy's kit is the same
 * pick (`activeMoves`), so a Gym's Pokémon and a player's Auto agree on what a five-card pool plays.
 */
export function autoPickMoves(pool: readonly string[], content: ContentRegistry, cap = 4, types: readonly PokemonType[] = []): string[] {
  if (pool.length <= cap) return [...pool];
  const power = (id: string) => content.move(id).power ?? 0;
  const ranged = (id: string) => content.move(id).range === 'ranged';
  const family = (id: string) => id.replace(/(-plus)+$/, '');

  const attacks = pool.filter((m) => power(m) > 0);
  const byPower = [...attacks].sort((a, b) => power(b) - power(a));
  // 3. v0.9.5 — one of the two kept attacks is of the Pokémon's own type when it has one: a Kingler that picked
  //    Guillotine and Vice Grip+ over Bubble led the Water Gym without a Water move.
  const stab = byPower.find((m) => types.includes(content.move(m).type));
  const keep = (stab ? [stab, ...byPower.filter((m) => m !== stab)] : byPower).slice(0, Math.min(2, attacks.length));
  // 4. v0.9.5 — the rest by recency, but never a move and its + together while something else is waiting.
  const rest = pool.filter((m) => !keep.includes(m)).reverse();
  const picked = new Set(keep);
  const fill = (allowTwin: boolean) => {
    for (const m of rest) {
      if (picked.size >= cap) return;
      if (picked.has(m)) continue;
      if (!allowTwin && [...picked].some((p) => family(p) === family(m))) continue;
      picked.add(m);
    }
  };
  fill(false);
  fill(true);

  // §6.3.6.5 — buy a Ranged card with the least useful slot we hold: a zero-power card first, then the
  // weakest attack, and never the last attack we have.
  if (!Array.from(picked).some(ranged)) {
    const candidate = pool.filter(ranged).sort((a, b) => power(b) - power(a))[0];
    if (candidate) {
      const held = Array.from(picked);
      const attacksHeld = held.filter((m) => power(m) > 0);
      const drop =
        held.filter((m) => power(m) === 0).sort((a, b) => held.indexOf(a) - held.indexOf(b))[0] ??
        (attacksHeld.length > 1 ? [...attacksHeld].sort((a, b) => power(a) - power(b))[0] : undefined);
      if (drop) {
        picked.delete(drop);
        picked.add(candidate);
      }
    }
  }
  return pool.filter((m) => picked.has(m));
}

/**
 * §6.3.5 / §6.9 — the kit a form holds on each path that reaches it (v0.9.9, for the Pokédex): one row per chain of
 * branches from the base — Ivysaur three, Venusaur nine — each form adding what it learns by level before it evolves
 * (a form that never evolves: its whole learnset), and each branch its payload. The same arithmetic the run applies:
 * a level-up never teaches back a card a branch has rewritten (v0.9.11: evolved forms learn by level too).
 */
export function kitPaths(content: ContentRegistry, speciesId: string): { branches: string[]; pool: string[] }[] {
  const base = content.species(content.lineBase(speciesId));
  const parents = upgradeParents(content, base.id);
  const branchParents = upgradeParents(content, base.id, false);
  const learn = (s: SpeciesDef, pool: string[]) => {
    const out = [...pool];
    const top = s.evolveLevel ? s.evolveLevel - 1 : 100;
    for (const e of [...s.learnset].sort((x, y) => x.level - y.level)) if (e.level <= top) learnInto(out, e, parents);
    return out;
  };
  const out: { branches: string[]; pool: string[] }[] = [];
  const walk = (s: SpeciesDef, branches: string[], before: string[]) => {
    const pool = learn(s, before);
    if (s.id === speciesId) {
      out.push({ branches, pool });
      return;
    }
    for (const b of s.branches) walk(content.species(b.to), [...branches, b.id], applyPayload(pool, b, branchParents));
  };
  walk(base, [], []);
  return out;
}
