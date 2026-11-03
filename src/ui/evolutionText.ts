import { DEFAULT_PROGRESSION, evolveMethod, readyBranches, type ContentRegistry, type EvolveMethod, type PartyMon } from '@/sim';

// §6.3.7 — how a species evolves, in the words every sheet uses: a level, a stone, a held item it levels up with, or
// Friendship. Formatting only: the methods are the species' and its branches' (content), the readiness the sim's.

/** The methods its branches use, in the order the sheets name them, or null for a form that goes no further. */
function methodsOf(speciesId: string, content: ContentRegistry): ('level' | EvolveMethod)[] | null {
  const s = content.species(speciesId);
  if (!s.evolvesTo.length || s.evolveLevel === undefined) return null;
  const used = new Set(s.branches.map((b) => evolveMethod(s, b)));
  return (['level', 'stone', 'held-item', 'friendship'] as const).filter((m) => used.has(m));
}

/** "Fire Stone", or Eevee's "Fire, Water or Thunder Stone". */
function stoneNames(speciesId: string, content: ContentRegistry): string {
  const names = content.allEvolutionItems().filter((i) => i.uses.some((u) => u.species === speciesId)).map((i) => i.name);
  if (names.length <= 1) return names[0] ?? 'stone';
  const short = names.map((n) => n.replace(/ Stone$/, ''));
  return `${short.slice(0, -1).join(', ')} or ${short.at(-1)} Stone`;
}

const article = (word: string) => (/^[AEIOU]/i.test(word) ? 'an' : 'a');

/** One method in a few words: "At Lv 16", "Fire Stone", "Level up holding a Twisted Spoon", "Level up at high Friendship". */
function methodText(method: 'level' | EvolveMethod, speciesId: string, content: ContentRegistry): string {
  const s = content.species(speciesId);
  switch (method) {
    case 'level': return `At Lv ${s.evolveLevel}`;
    case 'stone': return stoneNames(speciesId, content);
    case 'held-item': {
      const item = content.heldItem(s.evolveItem!).name;
      return `Level up holding ${article(item)} ${item}`;
    }
    case 'friendship': return 'Level up at high Friendship';
  }
}

/** §6.3.7 — how this species evolves, for a sheet's row: its methods joined ("Fire, Water or Thunder Stone, or level up at high Friendship"). */
export function evolveMethodText(speciesId: string, content: ContentRegistry): string | null {
  const methods = methodsOf(speciesId, content);
  if (!methods) return null;
  return methods.map((m, i) => (i === 0 ? methodText(m, speciesId, content) : `or ${methodText(m, speciesId, content).replace(/^./, (c) => c.toLowerCase())}`)).join(', ');
}

/** §6.3.7 — the pictures a method label leads with: the stones' and the held item's own sprites, Friendship's heart. */
export type MethodIcon = { kind: 'item'; id: string; name: string } | { kind: 'friendship' };
export function evolveMethodIcons(speciesId: string, content: ContentRegistry): MethodIcon[] {
  const methods = methodsOf(speciesId, content) ?? [];
  const s = content.species(speciesId);
  return methods.flatMap((m): MethodIcon[] =>
    m === 'stone' ? content.allEvolutionItems().filter((i) => i.uses.some((u) => u.species === speciesId)).map((i) => ({ kind: 'item' as const, id: i.id, name: i.name }))
    : m === 'held-item' ? [{ kind: 'item' as const, id: s.evolveItem!, name: content.heldItem(s.evolveItem!).name }]
    : m === 'friendship' ? [{ kind: 'friendship' as const }]
    : []);
}

/** §6.3.7 — the same as a sentence: "Evolves at Lv 16.", "Evolves with a Fire Stone.", "Evolves levelling up holding a Twisted Spoon." */
export function evolveSentence(speciesId: string, content: ContentRegistry): string | null {
  const methods = methodsOf(speciesId, content);
  if (!methods) return null;
  const s = content.species(speciesId);
  const clause = (m: 'level' | EvolveMethod): string => {
    switch (m) {
      case 'level': return `at Lv ${s.evolveLevel}`;
      case 'stone': { const name = stoneNames(speciesId, content); return `with ${article(name)} ${name}`; }
      case 'held-item': { const item = content.heldItem(s.evolveItem!).name; return `levelling up holding ${article(item)} ${item}`; }
      case 'friendship': return 'levelling up at high Friendship';
    }
  };
  return `Evolves ${methods.map(clause).join(', or ')}.`;
}

/** §6.3.7 — the label between two stages of a line: "Lv 16", "Fire Stone", "Twisted Spoon", Eevee's "Stones or Friendship". */
export function evolveMethodShort(speciesId: string, content: ContentRegistry): string | null {
  const methods = methodsOf(speciesId, content);
  if (!methods) return null;
  const s = content.species(speciesId);
  return methods.map((m) => (m === 'level' ? `Lv ${s.evolveLevel}` : m === 'stone' ? (stoneNames(speciesId, content).includes(' or ') ? 'Stones' : stoneNames(speciesId, content)) : m === 'held-item' ? content.heldItem(s.evolveItem!).name : 'Friendship')).join(' or ');
}

/**
 * §6.3.7–§6.3.9 — where this Pokémon stands on its evolution, for the Team sheet: ready (any branch's method holds), one
 * level-up away (holding its item, or fond enough), or how it evolves.
 */
export function evolutionStatus(mon: PartyMon, content: ContentRegistry): string | null {
  const methods = methodsOf(mon.speciesId, content);
  if (!methods) return null;
  if (readyBranches(mon, content).length) return 'Ready to evolve';
  const s = content.species(mon.speciesId);
  if (methods.includes('held-item') && mon.heldItem === s.evolveItem) return `Holding its ${content.heldItem(s.evolveItem!).name}: evolves at its next level-up`;
  if (methods.includes('friendship') && mon.friendship >= DEFAULT_PROGRESSION.friendship.evolve) return 'Fond enough: evolves at its next level-up';
  return evolveMethodText(mon.speciesId, content);
}

/**
 * §6.3.9 — Friendship as hearts, five in half steps (as the series' checker reads it): a half heart for each grooming's
 * worth, so one always moves it, and the fifth whole heart only at the top of the scale.
 */
export function friendshipHearts(friendship: number): number {
  const f = DEFAULT_PROGRESSION.friendship;
  return friendship >= f.max ? 5 : Math.min(4.5, Math.floor(Math.max(0, friendship) / f.groom) / 2);
}

/** §6.3.9 — the words for the hearts: one band per whole heart, so the two never disagree. */
export function friendshipWords(friendship: number): string {
  const hearts = Math.floor(friendshipHearts(friendship));
  return hearts >= 5 ? 'It adores you.'
    : hearts >= 4 ? 'It is very fond of you.'
    : hearts >= 3 ? 'It is quite fond of you.'
    : hearts >= 1 ? 'It is warming to you.'
    : 'It is wary of you.';
}

/** §6.3.9 — whether this species has a Friendship branch (Eevee's Umbreon), so its sheet names the threshold. */
export function evolvesByFriendship(speciesId: string, content: ContentRegistry): boolean {
  return (methodsOf(speciesId, content) ?? []).includes('friendship');
}
