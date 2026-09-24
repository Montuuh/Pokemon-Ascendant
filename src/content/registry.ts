import type { AbilityDef, BadgeDef, ConsumableDef, ContentRegistry, EvolutionBranch, EvolutionItemDef, HeldItemDef, MoveDef, RegionModifierDef, RelicDef, ScenarioDef, SpeciesDef, TmDef } from '@/sim/content/defs';
import { AbilitiesFileSchema, BadgesFileSchema, ConsumablesFileSchema, EvolutionItemsFileSchema, HeldItemsFileSchema, MasteryFileSchema, MovesFileSchema, RegionModifiersFileSchema, RelicsFileSchema, ScenariosFileSchema, SpeciesFileSchema, TmsFileSchema } from './schemas';
import movesJson from './data/moves.json';
import speciesJson from './data/species.json';
import abilitiesJson from './data/abilities.json';
import consumablesJson from './data/consumables.json';
import scenariosJson from './data/scenarios.json';
import tmsJson from './data/tms.json';
import relicsJson from './data/relics.json';
import badgesJson from './data/badges.json';
import regionModifiersJson from './data/region-modifiers.json';
import heldItemsJson from './data/held-items.json';
import masteryJson from './data/mastery.json';
import evolutionItemsJson from './data/evolution-items.json';

// The single in-memory content index. Parsed once with Zod (throws loudly on drift), then cross-referenced:
// every move/ability/consumable id a species or scenario mentions must exist. Content is immutable after load.

export class ContentError extends Error {}

class MapRegistry implements ContentRegistry {
  /** child id → parent id, derived from evolvesTo at construction. */
  private readonly preEvolution = new Map<string, string>();
  private readonly lineCache = new Map<string, readonly { level: number; move: string }[]>();
  /** §6.3 — branches are authored on the species that evolves; this is the flat index by branch id. */
  private readonly branches = new Map<string, EvolutionBranch>();

  constructor(
    private readonly moves: ReadonlyMap<string, MoveDef>,
    private readonly speciesMap: ReadonlyMap<string, SpeciesDef>,
    private readonly abilities: ReadonlyMap<string, AbilityDef>,
    private readonly consumables: ReadonlyMap<string, ConsumableDef>,
    private readonly scenarios: ReadonlyMap<string, ScenarioDef>,
    private readonly tms: ReadonlyMap<string, TmDef>,
    private readonly relics: ReadonlyMap<string, RelicDef>,
    private readonly badges: ReadonlyMap<string, BadgeDef>,
    private readonly regionModifiers: ReadonlyMap<string, RegionModifierDef>,
    private readonly heldItems: ReadonlyMap<string, HeldItemDef>,
    private readonly mastery: ReadonlyMap<string, readonly (string | null)[]>,
    private readonly evolutionItems: ReadonlyMap<string, EvolutionItemDef>,
  ) {
    for (const s of speciesMap.values()) {
      for (const child of s.evolvesTo) this.preEvolution.set(child, s.id);
      for (const b of s.branches) {
        if (this.branches.has(b.id)) throw new ContentError(`Duplicate branch id "${b.id}"`);
        this.branches.set(b.id, b);
      }
    }
  }

  /** §6.9 — base form first, then each stage's own entries, ordered by level. */
  lineLearnset(id: string): readonly { level: number; move: string }[] {
    const cached = this.lineCache.get(id);
    if (cached) return cached;
    const chain: SpeciesDef[] = [];
    for (let cur: string | undefined = id; cur; cur = this.preEvolution.get(cur)) chain.unshift(this.species(cur));
    const out: { level: number; move: string }[] = [];
    const seen = new Set<string>();
    for (const s of chain)
      for (const l of [...s.learnset].sort((a, b) => a.level - b.level))
        if (!seen.has(l.move)) { seen.add(l.move); out.push(l); }
    this.lineCache.set(id, out);
    return out;
  }

  move(id: string): MoveDef {
    return must(this.moves, id, 'move');
  }
  species(id: string): SpeciesDef {
    return must(this.speciesMap, id, 'species');
  }
  ability(id: string): AbilityDef {
    return must(this.abilities, id, 'ability');
  }
  consumable(id: string): ConsumableDef {
    return must(this.consumables, id, 'consumable');
  }
  scenario(id: string): ScenarioDef {
    return must(this.scenarios, id, 'scenario');
  }
  tm(id: string): TmDef {
    return must(this.tms, id, 'TM');
  }
  relic(id: string): RelicDef {
    return must(this.relics, id, 'relic');
  }
  heldItem(id: string): HeldItemDef {
    return must(this.heldItems, id, 'held item');
  }
  allRelics(): readonly RelicDef[] {
    return [...this.relics.values()];
  }

  badge(id: string): BadgeDef {
    return must(this.badges, id, 'badge');
  }

  allBadges(): readonly BadgeDef[] {
    return [...this.badges.values()];
  }

  regionModifier(id: string): RegionModifierDef {
    return must(this.regionModifiers, id, 'region modifier');
  }

  allRegionModifiers(): readonly RegionModifierDef[] {
    return [...this.regionModifiers.values()];
  }
  allHeldItems(): readonly HeldItemDef[] {
    return [...this.heldItems.values()];
  }
  branch(id: string): EvolutionBranch {
    return must(this.branches, id, 'branch');
  }
  allTms(): readonly TmDef[] {
    return [...this.tms.values()];
  }
  evolutionItem(id: string): EvolutionItemDef {
    return must(this.evolutionItems, id, 'evolution item');
  }
  allEvolutionItems(): readonly EvolutionItemDef[] {
    return [...this.evolutionItems.values()];
  }
  hasMove(id: string): boolean {
    return this.moves.has(id);
  }
  allMoves(): MoveDef[] {
    return [...this.moves.values()];
  }
  lineBase(id: string): string {
    let cur = id;
    for (let guard = 0; guard < 4; guard++) {
      const parent = this.preEvolution.get(cur);
      if (!parent) break;
      cur = parent;
    }
    return cur;
  }

  allSpecies(): SpeciesDef[] {
    return [...this.speciesMap.values()];
  }
  hasSpecies(id: string): boolean {
    return this.speciesMap.has(id);
  }
  masteryMoves(lineId: string): readonly (string | null)[] {
    return this.mastery.get(lineId) ?? [null, null, null];
  }
  allAbilities(): AbilityDef[] {
    return [...this.abilities.values()];
  }
  allConsumables(): ConsumableDef[] {
    return [...this.consumables.values()];
  }
  allScenarios(): ScenarioDef[] {
    return [...this.scenarios.values()];
  }
}

function must<T>(map: ReadonlyMap<string, T>, id: string, kind: string): T {
  const v = map.get(id);
  if (!v) throw new ContentError(`Unknown ${kind} id "${id}"`);
  return v;
}

function indexById<T extends { id: string }>(items: T[], kind: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const it of items) {
    if (map.has(it.id)) throw new ContentError(`Duplicate ${kind} id "${it.id}"`);
    map.set(it.id, it);
  }
  return map;
}

export function buildRegistry(): MapRegistry {
  const moves: MoveDef[] = MovesFileSchema.parse(movesJson).moves;
  const species: SpeciesDef[] = SpeciesFileSchema.parse(speciesJson).species;
  const abilities: AbilityDef[] = AbilitiesFileSchema.parse(abilitiesJson).abilities;
  const consumables: ConsumableDef[] = ConsumablesFileSchema.parse(consumablesJson).consumables;
  const scenarios: ScenarioDef[] = ScenariosFileSchema.parse(scenariosJson).scenarios;
  const tms: TmDef[] = TmsFileSchema.parse(tmsJson).tms;
  const relics: RelicDef[] = RelicsFileSchema.parse(relicsJson).relics;
  const badges: BadgeDef[] = BadgesFileSchema.parse(badgesJson).badges;
  const regionModifiers: RegionModifierDef[] = RegionModifiersFileSchema.parse(regionModifiersJson).modifiers;
  const heldItems: HeldItemDef[] = HeldItemsFileSchema.parse(heldItemsJson).items;
  const mastery = MasteryFileSchema.parse(masteryJson).lines;
  const evolutionItems: EvolutionItemDef[] = EvolutionItemsFileSchema.parse(evolutionItemsJson).items;

  const reg = new MapRegistry(
    indexById(moves, 'move'),
    indexById(species, 'species'),
    indexById(abilities, 'ability'),
    indexById(consumables, 'consumable'),
    indexById(scenarios, 'scenario'),
    indexById(tms, 'TM'),
    indexById(relics, 'relic'),
    indexById(badges, 'badge'),
    indexById(regionModifiers, 'region modifier'),
    indexById(heldItems, 'held item'),
    new Map(Object.entries(mastery)),
    indexById(evolutionItems, 'evolution item'),
  );

  // Cross-reference integrity (fails fast at boot / in tests).
  for (const s of species) {
    for (const l of s.learnset) reg.move(l.move);
    for (const a of s.availableAbilities) reg.ability(a);
    for (const e of s.evolvesTo) reg.species(e);
    // §6.9 — a learnset entry at or above the evolution level would be unreachable.
    if (s.evolveLevel !== undefined)
      for (const l of s.learnset)
        if (l.level >= s.evolveLevel)
          throw new ContentError(`§6.9: ${s.id} learns ${l.move} at level ${l.level}, at or above its evolveLevel ${s.evolveLevel}`);
    if (s.stage === 'basic' && s.learnset.filter((l) => l.level <= 1).length !== 2)
      throw new ContentError(`§6.9: ${s.id} is a base form and must know exactly 2 moves at level 1`);
    for (const t of s.tutorMoves) reg.move(t);
    // §6.3 — a species that evolves must offer at least one archetype, or the Evolution screen has nothing
    // to ask. Every branch's moves, target and passive must resolve.
    if (s.evolvesTo.length > 0 && s.branches.length === 0)
      throw new ContentError(`§6.3: ${s.id} evolves but offers no branch`);
    for (const b of s.branches) {
      if (!s.evolvesTo.includes(b.to)) throw new ContentError(`§6.3: branch ${b.id} evolves ${s.id} into ${b.to}, which is not in its evolvesTo`);
      for (const u of b.upgrades) { reg.move(u.from); reg.move(u.to); }
      for (const a of b.adds) reg.move(a);
      if (b.abilityId) reg.ability(b.abilityId);
    }
  }
  for (const t of tms) {
    reg.move(t.move);
    for (const id of t.compatibleSpecies) reg.species(id);
  }
  // §5.13.2 — a Mastery line is keyed by a base form we ship, and every named tier is a move we ship.
  for (const [line, tiers] of Object.entries(mastery)) {
    const s = reg.species(line);
    if (s.stage !== 'basic') throw new ContentError(`§5.13.2: Mastery line "${line}" is not a base form`);
    for (const id of tiers) if (id) reg.move(id);
  }
  // §6.3.2 — a stone names a line that evolves, a level below its threshold, and (if any) one of its own branches.
  for (const it of evolutionItems) {
    for (const u of it.uses) {
      const s = reg.species(u.species);
      if (s.evolveLevel === undefined || s.branches.length === 0) throw new ContentError(`§6.3.2: ${it.id} works on ${u.species}, which does not evolve`);
      if (u.fromLevel >= s.evolveLevel) throw new ContentError(`§6.3.2: ${it.id} evolves ${u.species} from ${u.fromLevel}, not earlier than its level ${s.evolveLevel}`);
      if (u.branch && !s.branches.some((b) => b.id === u.branch)) throw new ContentError(`§6.3.2: ${it.id} names branch ${u.branch}, which ${u.species} does not offer`);
    }
  }
  for (const m of moves) {
    if (m.modifier !== 'none' && m.range !== 'melee') throw new ContentError(`§3.3.4: ${m.id} has a positional modifier but is not Melee`);
  }
  for (const c of consumables) if (c.upgradeTo) reg.consumable(c.upgradeTo);
  for (const sc of scenarios) {
    if (sc.player.leadIndex >= sc.player.team.length) throw new ContentError(`${sc.id}: leadIndex out of range`);
    for (const t of sc.player.team) {
      reg.species(t.species);
      t.moves?.forEach((m) => reg.move(m));
    }
    for (const e of sc.enemies) {
      reg.species(e.species);
      e.moves?.forEach((m) => reg.move(m));
    }
    for (const c of sc.player.consumables) reg.consumable(c);
  }
  return reg;
}

let cached: MapRegistry | null = null;
/** Lazily-built singleton for app code; tests may call buildRegistry() directly. */
export function getContent(): MapRegistry {
  return (cached ??= buildRegistry());
}
