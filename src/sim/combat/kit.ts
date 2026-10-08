import type { ContentRegistry, EvolutionBranch, SpeciesDef } from '../content/defs';
import type { PokemonType } from '../types';

// §6.3.5 / §6.9 — a line's kit as slots (v0.9.5). A base form learns four moves; every evolution after that rewrites
// slots rather than piling cards on: the first evolution upgrades two and adds one, the last swaps up to three. A
// payload names a slot by the move that first held it, so a Venusaur branch that swaps "Vine Whip" lands on Razor
// Leaf if an Ivysaur branch had already turned Vine Whip into Razor Leaf — whichever branch was taken before.

/**
 * §6.3.5 / §6.9 — how many moves a species may carry or be offered, as data (v0.9.9, the user's call: a validator over
 * every species). `kit` — the cards a form holds on any path through its line; `learnset` — level-up entries;
 * `tutor` / `egg` — its Dojo lists; `offered` — everything a form can be shown with: its kit, its tutor list, its
 * line's egg moves and its Mastery Move. `content.test` walks all 151 against it.
 */
export const MOVE_CAP = { kit: 5, learnset: 5, tutor: 3, egg: 3, offered: 12 } as const;

/** Every upgrade in the line, read backwards: an evolved card → the cards it can have come from. */
export function upgradeParents(content: ContentRegistry, speciesId: string): Map<string, Set<string>> {
  const base = content.lineBase(speciesId);
  const parents = new Map<string, Set<string>>();
  const visit = (id: string) => {
    const s = content.species(id);
    for (const b of s.branches)
      for (const u of b.upgrades) {
        if (!parents.has(u.to)) parents.set(u.to, new Set());
        parents.get(u.to)!.add(u.from);
      }
    for (const next of s.evolvesTo) visit(next);
  };
  visit(base);
  return parents;
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
 * §6.3.5 — the kit a form holds on each path that reaches it (v0.9.9, for the Pokédex): a base form's own pool at its
 * last level before evolving (or its whole learnset if it never does); an evolved form's, one row per chain of
 * branches from the base — Ivysaur three, Venusaur nine. The same payload arithmetic the run applies.
 */
export function kitPaths(content: ContentRegistry, speciesId: string): { branches: string[]; pool: string[] }[] {
  const base = content.species(content.lineBase(speciesId));
  const parents = upgradeParents(content, base.id);
  const own = (s: SpeciesDef) => {
    const known = new Set<string>();
    for (const e of s.learnset) if (e.level <= (s.evolveLevel ? s.evolveLevel - 1 : 100)) known.add(e.move);
    return [...known];
  };
  const out: { branches: string[]; pool: string[] }[] = [];
  const walk = (s: SpeciesDef, branches: string[], pool: string[]) => {
    if (s.id === speciesId) {
      out.push({ branches, pool });
      return;
    }
    for (const b of s.branches) walk(content.species(b.to), [...branches, b.id], applyPayload(pool, b, parents));
  };
  walk(base, [], own(base));
  return out;
}
