import type { ContentRegistry, EnemySetup, ScenarioDef } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import { activeMoves } from '../combat/stats';
import type { BiomeId } from './region';
import { ALL_TRAINERS, GYM, REGIONS, STATUS_ACCENT_FALLBACK, STATUS_ACCENT_FROM, STATUS_ACCENT_MOVES, eliteWildTeamFor, gymById, gymTeamFor, regionContent, statTierFor } from './region';
import { hasModifier, modifierValue } from './modifiers';
import { masteryMoveFor } from '../meta/mastery';
import { isThreeStageLine } from '../meta/bond';
import type { ActiveSetup, MapNode, PartyMon, RingRung, RunState } from './types';
import { RING } from './cities';

/** The catch consumable's catalog id (§7.2.5). */
const BALL_ITEM = 'poke-ball';

/**
 * §2.5 — where a fight happens. Past the fork a node belongs to a lane, and the lane's whole job is to look
 * like the Gym at the end of it, so its trainers stand in the same biome its wilds come from. Before the
 * fork there is no lane yet and the trunk is the Region's default.
 *
 * This used to be the string `'meadow'`, written in twice, which quietly put every Hiker in a field four
 * layers deep into a cave lane — the one place the theming had to hold, undone by a default.
 */
function stageFor(node: MapNode, run: RunState): string {
  const region = regionContent(run.regionIndex);
  if (node.lane === undefined) return region.trunkStage;
  const gymId = run.map.gyms[node.lane];
  const theme = gymId ? region.laneThemes[gymById(gymId).type] : undefined;
  return (theme && region.biomes[theme.biome]?.stage) ?? region.trunkStage;
}

// Turning a map node into a fight (§2.6–§2.8, §5.9). Everything the combat sim needs comes from here, so the
// two layers stay separate: the run knows about the Box, the combat knows about a scenario.

/** The Active Team as combat setups, carrying HP, status and Trauma across from the run (§2.4, §8.2). */
export function activeSetups(run: RunState, content: ContentRegistry): ActiveSetup[] {
  return run.activeUids
    .map((uid) => run.box.find((m) => m.uid === uid))
    .filter((m): m is PartyMon => !!m && m.hp > 0)
    .map((mon) => {
      const setup: ActiveSetup = {
        uid: mon.uid,
        species: mon.speciesId,
        level: mon.level,
        moves: mon.moveIds.length ? mon.moveIds : activeMoves(content, mon.speciesId, mon.level),
        traumaStacks: mon.traumaStacks,
      };
      // hpPercent is how the sim seeds mid-run HP; 100 % is the default so we only send it when it matters.
      const maxAtFull = maxHpOf(mon, content);
      const pct = Math.max(1, Math.min(100, Math.round((mon.hp / maxAtFull) * 100)));
      if (pct < 100) setup.hpPercent = pct;
      // §4.2.7.1 — every status outlives its fight: the kind, and what is left of its clock.
      if (mon.status) {
        setup.status = mon.status.kind;
        setup.statusTurnsLeft = mon.status.turnsLeft;
        if (mon.status.escalatingTicks !== undefined) setup.statusEscalating = mon.status.escalatingTicks;
      }
      if (mon.confusionTurns > 0) setup.confusionTurns = mon.confusionTurns;
      // §6.5.1 — the Box owns the passive slot now: whatever an evolution granted or the Dojo swapped in is
      // what walks into the fight, not the species default.
      if (mon.abilityId) setup.abilityId = mon.abilityId;
      // §7.4.1 — the loadout locks with the Active Team, so the item travels into the fight with its wearer.
      if (mon.heldItem) setup.heldItem = mon.heldItem;
      // §7.3.5 — the run's record walks into the fight, so Champion's Crest is worth what it has earned.
      if (mon.defeats) setup.defeats = mon.defeats;
      // §5.13.2 — the fifth slot, from the account's Mastery tier for this line (frozen into the run's perks).
      const line = content.lineBase(mon.speciesId);
      const mastery = masteryMoveFor(mon.speciesId, run.perks?.mastery[line] ?? 0, content);
      if (mastery) setup.masteryMove = mastery;
      // §6.8.2 rank 5 on a line that caps at Lv2 — the Mastery card opens every fight in hand.
      if (mastery && (run.perks?.bond?.[line] ?? 0) >= 5 && !isThreeStageLine(line, content)) setup.masteryOpener = true;
      return setup;
    });
}

/** Effective Max HP for a Box Pokémon, Trauma included (§8.2.1). */
export function maxHpOf(mon: PartyMon, content: ContentRegistry, traumaZone1 = 5, zone1Pct = 5, zone2Pct = 10, cap = 10): number {
  const species = content.species(mon.speciesId);
  const base = species.baseStats.hp + species.growth.hp * (Math.max(1, mon.level) - 1);
  const s = Math.min(Math.max(0, mon.traumaStacks), cap);
  const penalty = Math.min(s, traumaZone1) * zone1Pct + Math.max(0, s - traumaZone1) * zone2Pct;
  const floor = 100 - (traumaZone1 * zone1Pct + (cap - traumaZone1) * zone2Pct);
  return Math.max(1, Math.floor((base * Math.max(floor, 100 - penalty)) / 100));
}

function bandLevel(rng: GameRng, [lo, hi]: [number, number]): number {
  return lo + Math.floor(rng.range01() * (hi - lo + 1));
}

/** §2.6 — a Wild Area fight against the species the preview offered. */
export function buildWildScenario(node: MapNode, run: RunState, content: ContentRegistry, rng: GameRng, speciesId: string): ScenarioDef {
  const level = bandLevel(rng, node.preview.levelBand);
  // The node drew its biome when the map generated and wrote it into the badge (§2.5); going back to the
  // species for it gets a shared one wrong — Psyduck is in both the Meadow and the River pool, and the
  // lookup would answer Meadow for a Psyduck standing in the River lane.
  const region = regionContent(run.regionIndex);
  const drawn = region.biomes[(node.preview.icon ?? '').replace('wild-', '') as BiomeId];
  const pools = REGIONS.flatMap((r) => Object.values(r.biomes)).filter((b): b is NonNullable<typeof b> => !!b);
  const biome = drawn ?? pools.find((b) => b.common.includes(speciesId) || b.uncommon.includes(speciesId) || b.rare.includes(speciesId));
  return {
    id: `run-${node.id}`,
    name: `Wild ${content.species(speciesId).name}`,
    description: node.preview.detail,
    kind: 'wild',
    stage: biome?.stage ?? 'meadow',
    seed: rng.cursor,
    player: {
      team: activeSetups(run, content),
      leadIndex: 0,
      // One Poké Ball card per ball held: the pile is the only way a ball reaches the hand (§3.5, §2.6.4).
      consumables: [...run.consumables, ...Array.from({ length: run.balls }, () => BALL_ITEM)],
      balls: run.balls,
      relics: [...run.relics],
      badges: [...run.badges],
      ...(run.regionModifier ? { regionModifier: run.regionModifier } : {}),
    },
    enemies: [{ species: speciesId, level, tier: 'wild', phaseCount: 1 }],
  };
}

/** §2.7 — a trainer fight. The roster is fixed by the preview, so what you saw is what you get. */
export function buildTrainerScenario(node: MapNode, run: RunState, content: ContentRegistry, rng: GameRng): ScenarioDef {
  const region = regionContent(run.regionIndex);
  // By id; a save from before v0.7.3 has no id on its preview, and only then does the title stand in.
  const roster = ALL_TRAINERS.find((t) => t.id === node.preview.rosterId)
    ?? region.trainers.find((t) => t.name === node.preview.title) ?? ALL_TRAINERS.find((t) => t.name === node.preview.title) ?? region.trainers[0]!;
  // The node fixed its roster when the map was generated (§2.7.1), so what you saw is what you get.
  const team = node.preview.enemies ?? roster.team;
  return {
    id: `run-${node.id}`,
    name: roster.name,
    description: roster.line,
    kind: 'trainer',
    stage: stageFor(node, run),
    seed: rng.cursor,
    trainer: { name: roster.name, sprite: roster.sprite },
    player: {
      team: activeSetups(run, content),
      leadIndex: 0,
      consumables: [...run.consumables],
      balls: 0,
      relics: [...run.relics],
      badges: [...run.badges],
      ...(run.regionModifier ? { regionModifier: run.regionModifier } : {}),
    },
    enemies: team.map((m): EnemySetup => ({ species: m.species, level: m.level, tier: 'trainer', phaseCount: 1, ...(roster.veiled ? { veiled: true } : {}) })),
  };
}

/**
 * §2.8.1 — the Elite Trainer. Two Pokémon, both two-phase: harder than a Trainer, softer than the Gym, and
 * the only fight before the Gym where a phase transition happens at all.
 */
export function buildEliteScenario(node: MapNode, run: RunState, content: ContentRegistry, rng: GameRng): ScenarioDef {
  const elite = regionContent(run.regionIndex).elite;
  const team = node.preview.enemies ?? elite.team;
  return {
    id: `run-${node.id}`,
    name: elite.name,
    description: elite.line,
    kind: 'elite',
    stage: stageFor(node, run),
    seed: rng.cursor,
    trainer: { name: elite.name, sprite: elite.sprite },
    player: {
      team: activeSetups(run, content),
      leadIndex: 0,
      consumables: [...run.consumables],
      balls: 0,
      relics: [...run.relics],
      badges: [...run.badges],
      ...(run.regionModifier ? { regionModifier: run.regionModifier } : {}),
    },
    // By slot, not by species: a later Region's preview may have evolved the species the row names.
    enemies: team.map((m, i): EnemySetup => ({ species: m.species, level: m.level, tier: 'elite', phaseCount: elite.team[i]?.phaseCount ?? 2 })),
  };
}

/**
 * §2.8.2 — the Elite Wild. A boss-tier **catchable**: the balls come with you, the gauge is the point, and
 * §2.8.2's Phase 2 makes it *easier* to catch rather than harder ("it is tiring — throw now").
 *
 * It is a wild fight by `kind`, which is what lets a Poké Ball into the hand at all (§3.5), and boss by
 * `tier`, which is what gives it the HP and the phases.
 */
export function buildEliteWildScenario(node: MapNode, run: RunState, content: ContentRegistry, rng: GameRng): ScenarioDef {
  const region = regionContent(run.regionIndex);
  const team = node.preview.enemies ?? eliteWildTeamFor(node.layer, region.eliteWild, region.wildBand);
  const mon = team[0]!;
  return {
    id: `run-${node.id}`,
    name: `Wild ${content.species(mon.species).name}`,
    description: region.eliteWild.line,
    kind: 'wild',
    stage: region.eliteWild.stage,
    seed: rng.cursor,
    player: {
      team: activeSetups(run, content),
      leadIndex: 0,
      consumables: [...run.consumables, ...Array.from({ length: run.balls }, () => BALL_ITEM)],
      balls: run.balls,
      relics: [...run.relics],
      badges: [...run.badges],
      ...(run.regionModifier ? { regionModifier: run.regionModifier } : {}),
    },
    enemies: [{ species: mon.species, level: mon.level, tier: 'boss', phaseCount: region.eliteWild.phaseCount, ...(region.eliteWild.moves ? { moves: [...region.eliteWild.moves] } : {}) }],
  };
}

/** §5.9 — the Gym. Two Pokémon, sequential, the second a three-phase ace. */
export function buildGymScenario(node: MapNode, run: RunState, content: ContentRegistry, rng: GameRng): ScenarioDef {
  // §2.5 — the lane fixed which Gym this is at generation, so the fight can never disagree with the map.
  const gym = node.lane !== undefined ? gymById(run.map.gyms[node.lane] ?? GYM.id) : GYM;
  return {
    id: `run-${node.id}`,
    name: `${gym.name} — ${gym.type[0]!.toUpperCase()}${gym.type.slice(1)} Gym`,
    description: gym.line,
    kind: 'boss',
    stage: gym.stage,
    seed: rng.cursor,
    trainer: { name: gym.name, sprite: gym.sprite },
    player: {
      team: activeSetups(run, content),
      leadIndex: 0,
      consumables: [...run.consumables],
      balls: 0,
      relics: [...run.relics],
      badges: [...run.badges],
      ...(run.regionModifier ? { regionModifier: run.regionModifier } : {}),
    },
    // §5.9.3 — the team the *preview* promised, which is the band-derived one, not the catalogue row. The
    // species and level are read off the preview too, so a later Region's shift and evolution reach the Gym.
    // §5.9.3 — a scripted kit (the off-type answer a learnset lacks) travels with its slot.
    enemies: gymTeamFor(gym).map((m, i): EnemySetup => ({
      species: node.preview.enemies?.[i]?.species ?? m.species,
      level: node.preview.enemies?.[i]?.level ?? m.level,
      tier: 'boss',
      phaseCount: m.phaseCount,
      ...(m.moves ? { moves: [...m.moves] } : {}),
    })),
  };
}

/**
 * §2.2 — the Region's escalation, folded into every fight: the enemy stat tier on Max HP and Attack (the next
 * Region's under §8.8 Greater Threats), and from Region 2 the status accent (each enemy gains its type's status
 * move unless its own kit already has one).
 */
function applyRegion(scenario: ScenarioDef, run: RunState, content: ContentRegistry): ScenarioDef {
  const tier = statTierFor(run.regionIndex, hasModifier(run.modifiers, 'greater-threats'));
  const accent = run.regionIndex >= STATUS_ACCENT_FROM;
  if (tier.hp === 1 && tier.attack === 1 && !accent) return scenario;
  return {
    ...scenario,
    enemies: scenario.enemies.map((e) => {
      const out: EnemySetup = { ...e };
      if (tier.hp !== 1) out.hpMultiplier = (e.hpMultiplier ?? 1) * tier.hp;
      if (tier.attack !== 1) out.attackMultiplier = (e.attackMultiplier ?? 1) * tier.attack;
      if (accent) {
        const kit = e.moves ?? activeMoves(content, e.species, e.level);
        const hasStatus = kit.some((id) => {
          const m = content.move(id);
          return m.power === 0 && m.effects.some((fx) => fx.kind === 'status' && !fx.self);
        });
        const type = content.species(e.species).types[0]!;
        if (!hasStatus) out.moves = [...kit, STATUS_ACCENT_MOVES[type] ?? STATUS_ACCENT_FALLBACK];
      }
      return out;
    }),
  };
}

/**
 * §8.8 — fold the run's difficulty modifiers into the scenario. The ones that change a number are applied to
 * the enemy list here, once, rather than re-derived inside the fight; the list itself rides along for the two
 * that change a rule mid-combat.
 */
function applyModifiers(scenario: ScenarioDef, run: RunState): ScenarioDef {
  if (!run.modifiers.length) return scenario;
  const extra = modifierValue(run.modifiers, 'masters-challenge', 'extraPhases', 0);
  const maxPhases = modifierValue(run.modifiers, 'masters-challenge', 'maxPhases', 3);
  const wildHp = modifierValue(run.modifiers, 'iron-will', 'hpMultiplier', 1);
  return {
    ...scenario,
    modifiers: [...run.modifiers],
    enemies: scenario.enemies.map((e) => ({
      ...e,
      // Iron Will is a *wild* modifier: a trainer's Pidgey is the same Pidgey.
      ...(wildHp !== 1 && e.tier === 'wild' ? { hpMultiplier: (e.hpMultiplier ?? 1) * wildHp } : {}),
      ...(extra > 0 && (e.tier === 'boss' || e.tier === 'elite')
        ? { phaseCount: Math.min(maxPhases, e.phaseCount + extra) as 1 | 2 | 3 }
        : {}),
    })),
  };
}

/**
 * §2.9.4.1 — a Challenge Ring rung as a fight: an Elite-class trainer (every Pokémon two-phase) in the arena,
 * folded through the same Region tier, accent, modifiers and perks as any route fight, so the Ring in Celadon
 * is Region 2's Ring. No balls: a rival's Pokémon are not for catching.
 */
export function buildRingScenario(run: RunState, rung: RingRung, index: number, content: ContentRegistry, rng: GameRng): ScenarioDef {
  const base: ScenarioDef = {
    id: `ring-${run.city?.id ?? 'city'}-${index}`,
    name: rung.trainer,
    description: rung.line,
    kind: 'trainer',
    stage: 'gym',
    seed: rng.cursor,
    trainer: { name: rung.trainer, sprite: rung.sprite },
    player: {
      team: activeSetups(run, content),
      leadIndex: 0,
      consumables: [...run.consumables],
      balls: 0,
      relics: [...run.relics],
      badges: [...run.badges],
      ...(run.regionModifier ? { regionModifier: run.regionModifier } : {}),
    },
    enemies: rung.team.map((m): EnemySetup => ({ species: m.species, level: m.level, tier: 'elite', phaseCount: RING.phaseCount })),
  };
  return applyPerks(applyModifiers(applyRegion(base, run, content), run), run, content);
}

export function buildScenario(node: MapNode, run: RunState, content: ContentRegistry, rng: GameRng, wildChoice?: string): ScenarioDef | null {
  const base = ((): ScenarioDef | null => {
    switch (node.kind) {
      case 'wild':
        return buildWildScenario(node, run, content, rng, wildChoice ?? node.preview.speciesIds[0]!);
      case 'trainer':
        return buildTrainerScenario(node, run, content, rng);
      case 'gym':
        return buildGymScenario(node, run, content, rng);
      case 'elite':
        return buildEliteScenario(node, run, content, rng);
      case 'elite-wild':
        return buildEliteWildScenario(node, run, content, rng);
      // A service node has no fight to build.
      case 'aid':
      case 'merchant':
      case 'mystery':
        return null;
    }
  })();
  return base ? applyPerks(applyModifiers(applyRegion(base, run, content), run), run, content) : null;
}

/**
 * §8.10 — what the account's snapshot tells the fight: which enemy species never hide their intents
 * (§5.13.1 Familiar) and, under Pokédex Insight (§8.4.2), which get one intent shown free because this run
 * has not met them yet. Nothing here touches a number.
 */
function applyPerks(scenario: ScenarioDef, run: RunState, content: ContentRegistry): ScenarioDef {
  const perks = run.perks;
  if (!perks) return scenario;
  const species = [...new Set(scenario.enemies.map((e) => e.species))];
  // §7.3.4 Battle Tracker — a species met earlier this run is scouted: it hides nothing, like a Familiar one.
  const scouted = run.relics.some((id) => content.relic(id).hook === 'run-scouting') ? run.seenSpecies : [];
  const familiar = species.filter((id) => perks.familiar.includes(id) || scouted.includes(id));
  const insight = perks.insight ? species.filter((id) => !perks.familiar.includes(id) && !run.seenSpecies.includes(id)) : [];
  if (!familiar.length && !insight.length) return scenario;
  return { ...scenario, player: { ...scenario.player, ...(familiar.length ? { familiar } : {}), ...(insight.length ? { insight } : {}) } };
}
