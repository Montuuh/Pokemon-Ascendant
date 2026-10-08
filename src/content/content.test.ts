import { describe, expect, it } from 'vitest';
import { activeMoves, knownMoves, BIOMES, ELITE_WILD, GYMS, REGIONS, TRAINER_SPRITES, GYM } from '@/sim';
import { existsSync, readFileSync } from 'node:fs';
import { applyPayload, upgradeParents } from '@/sim/combat/kit';
import { buildRegistry } from './registry';
import { boxIconUrl, portraitUrl, battleSpriteUrl } from './schemas/species';

// Content rot-guards — every id resolves, every referenced asset exists, every kit obeys §6.3.6 / §3.3.4.
const reg = buildRegistry();

describe('content registry', () => {
  it('builds without cross-reference errors', () => {
    expect(reg.allMoves().length).toBeGreaterThanOrEqual(50);
    expect(reg.allSpecies().length).toBeGreaterThanOrEqual(40);
    expect(reg.allConsumables().length).toBeGreaterThanOrEqual(10);
    expect(reg.allScenarios()).toHaveLength(16);
  });

  it('every species has portrait, box icon and animated battle sprites on disk', () => {
    for (const s of reg.allSpecies()) {
      expect(existsSync(`public${portraitUrl(s.dex, s.id)}`), `${s.id} portrait`).toBe(true);
      expect(existsSync(`public${boxIconUrl(s.dex, s.id)}`), `${s.id} icon`).toBe(true);
      expect(existsSync(`public${battleSpriteUrl(s.id)}`), `${s.id} front sprite`).toBe(true);
      expect(existsSync(`public${battleSpriteUrl(s.id, 'back')}`), `${s.id} back sprite`).toBe(true);
      // §5.13.1 Veteran — the shiny palette, front and back, for every species you could own.
      expect(existsSync(`public${battleSpriteUrl(s.id, 'front', true)}`), `${s.id} shiny sprite`).toBe(true);
      expect(existsSync(`public${battleSpriteUrl(s.id, 'back', true)}`), `${s.id} shiny back sprite`).toBe(true);
    }
  });

  it('every run-layer asset the map can name exists on disk', () => {
    // The run generates its own nodes, so these are not covered by the scenario fixtures above.
    for (const sprite of TRAINER_SPRITES) {
      expect(existsSync(`public/art/trainers/${sprite}.png`), `trainer sprite ${sprite}`).toBe(true);
    }
    // Every backdrop the run can name, not just the default Gym's. §2.5 gives each biome and each of the
    // four Gyms its own place, so a stage key that ships without a file is a black screen behind a real
    // fight — and it would only ever show up on the one seed that drew that Gym.
    const everyRegion = REGIONS.flatMap((r) => [r.trunkStage, r.eliteWild.stage, ...r.gyms.map((g) => g.stage), ...Object.values(r.biomes).map((b) => b!.stage)]);
    for (const stage of [GYM.stage, ...GYMS.map((g) => g.stage), ...Object.values(BIOMES).map((b) => b!.stage), ELITE_WILD.stage, ...everyRegion]) {
      expect(existsSync(`public/art/stages/${stage}.jpg`), `stage ${stage}`).toBe(true);
    }
    // §9.4.1 — every Wild biome wears its own emblem, and a find on the ground its item ball (v0.8.7).
    for (const biome of new Set(REGIONS.flatMap((r) => Object.keys(r.biomes)))) expect(existsSync(`public/art/icons/map/node-wild-${biome}.png`), `wild emblem ${biome}`).toBe(true);
    expect(existsSync('public/art/icons/map/node-cache.png'), 'find badge').toBe(true);
    expect(existsSync('public/art/ui/menu-vista.png'), 'main menu vista').toBe(true);
    // Every archetype a Region fields and every Gym type it can draw has its own badge on the map (§2.5).
    const archetypes = REGIONS.flatMap((r) => r.trainers.map((t) => `node-trainer-${t.archetype}`));
    const gymTypes = REGIONS.flatMap((r) => r.gyms.map((g) => `node-gym-${g.type}`));
    for (const icon of [...new Set(['node-wild', 'node-trainer', 'node-aid', 'node-merchant', 'node-gym', ...archetypes, ...gymTypes])]) {
      expect(existsSync(`public/art/icons/map/${icon}.png`), `map node badge ${icon}`).toBe(true);
    }
  });

  it('every consumable has an item icon, and every TM a disc in its move\'s type', () => {
    for (const c of reg.allConsumables()) {
      expect(existsSync(`public/art/items/${c.id}.png`), `${c.id} icon`).toBe(true);
    }
    // §6.4.1 — a TM's disc is coloured by its move's type, falling back to the Normal one.
    for (const tm of reg.allTms()) {
      const typed = `public/art/items/tm-${reg.move(tm.move).type}.png`;
      const file = existsSync(typed) ? typed : 'public/art/items/tm.png';
      expect(existsSync(file), `${tm.id} disc`).toBe(true);
    }
  });

  it('every scenario stage backdrop and trainer sprite exists', () => {
    for (const sc of reg.allScenarios()) {
      expect(existsSync(`public/art/stages/${sc.stage}.jpg`), `${sc.id} stage ${sc.stage}`).toBe(true);
      if (sc.trainer) expect(existsSync(`public/art/trainers/${sc.trainer.sprite}.png`), `${sc.id} trainer`).toBe(true);
    }
  });

  it('§3.3.4 — Step-Forward/Step-Backward only on Melee moves', () => {
    for (const m of reg.allMoves()) {
      if (m.modifier !== 'none') expect(m.range).toBe('melee');
    }
  });

  it('§3.6 — utility/defensive moves carry an effect; offensive moves carry power', () => {
    for (const m of reg.allMoves()) {
      if (m.role === 'offensive') expect(m.power, m.id).toBeGreaterThan(0);
      else expect(m.effects.length, m.id).toBeGreaterThan(0);
    }
  });

  it('§6.3.6 — basic-stage kits have no ultimate (4 AP) cards and at most one SF/SB', () => {
    for (const s of reg.allSpecies()) {
      if (s.stage !== 'basic' || s.evolvesTo.length === 0) continue; // a single-stage species is a final form
      const kit = s.learnset.map((l) => reg.move(l.move));
      expect(kit.every((m) => m.apCost <= 3), s.id).toBe(true);
      expect(kit.filter((m) => m.modifier !== 'none').length, s.id).toBeLessThanOrEqual(1);
    }
  });

  it('§6.9 — a base form knows exactly 2 moves at level 1 and 4 by its evolution level', () => {
    for (const s of reg.allSpecies()) {
      if (s.stage !== 'basic') continue;
      expect(knownMoves(reg, s.id, 1).length, s.id).toBe(2);
      // Two deliberate exceptions: Magikarp's two-card deck until it evolves is the whole joke — Splash and Tackle,
      // which is all it ever learned in Gen I — and Ditto is a Transform and a spare (species-gen1.md).
      const floor = s.id === 'magikarp' || s.id === 'ditto' ? 2 : 4;
      expect(activeMoves(reg, s.id, s.evolveLevel ?? 20).length, s.id).toBeGreaterThanOrEqual(floor);
    }
  });

  it('§6.9 — no learnset entry is stranded at or above its evolution level', () => {
    for (const s of reg.allSpecies()) {
      if (s.evolveLevel === undefined) continue;
      for (const l of s.learnset) expect(l.level, `${s.id}/${l.move}`).toBeLessThan(s.evolveLevel);
    }
  });

  it('§6.5.1 — every species carries an ability pool; a base form is granted none at combat start', () => {
    for (const s of reg.allSpecies()) {
      expect(s.availableAbilities.length, s.id).toBeGreaterThan(0);
      for (const a of s.availableAbilities) expect(() => reg.ability(a)).not.toThrow();
    }
  });

  it('§6.3.3 — a species that evolves offers at least two archetypes, and no two share one', () => {
    for (const s of reg.allSpecies()) {
      if (!s.evolvesTo.length) continue;
      expect(s.branches.length, s.id).toBeGreaterThanOrEqual(2);
      const seen = new Set(s.branches.map((b) => b.archetype));
      expect(seen.size, `${s.id} repeats an archetype`).toBe(s.branches.length);
    }
  });

  it('§6.3.5 — a first evolution upgrades up to two slots and adds one; a final evolution swaps one to three and adds none', () => {
    for (const s of reg.allSpecies()) {
      const final = s.evolvesTo.length > 0 && s.stage !== 'basic';
      for (const b of s.branches) {
        if (final) {
          expect(b.upgrades.length, b.id).toBeGreaterThanOrEqual(1);
          expect(b.upgrades.length, b.id).toBeLessThanOrEqual(3);
          expect(b.adds.length, b.id).toBe(0);
        } else {
          expect(b.upgrades.length, b.id).toBeLessThanOrEqual(2);
          expect(b.adds.length, b.id).toBe(1);
        }
        for (const u of b.upgrades) expect(u.to, b.id).not.toBe(u.from);
      }
    }
  });

  it('§6.3.5 — every path through a line holds 2 → 4 → 5 → 5 different cards, at least one of them Ranged', () => {
    // §6.3.6.5's Lead anchors keep a Melee-only kit on purpose.
    const anchors = new Set(['pinsir', 'snorlax', 'machop']);
    for (const base of reg.allSpecies().filter((s) => s.stage === 'basic' && s.evolvesTo.length)) {
      const parents = upgradeParents(reg, base.id);
      const pool0 = knownMoves(reg, base.id, base.evolveLevel! - 1);
      expect(pool0.length, base.id).toBe(base.id === 'magikarp' ? 2 : 4);
      for (const b1 of base.branches) {
        const mid = applyPayload(pool0, b1, parents);
        expect(mid.length, b1.id).toBe(base.id === 'magikarp' ? 3 : 5);
        const next = reg.species(b1.to);
        const finals = next.branches.length ? next.branches.map((b2) => [b2.id, applyPayload(mid, b2, parents)] as const) : [[b1.id, mid] as const];
        for (const [id, pool] of finals) {
          expect(pool.length, `${b1.id} → ${id}`).toBe(mid.length);
          if (!anchors.has(base.id)) expect(pool.some((m) => reg.move(m).range === 'ranged'), `${b1.id} → ${id}: [${pool.join(' ')}]`).toBe(true);
          for (const t of reg.masteryMoves(base.id)) if (t) expect(pool, `${id} holds its Mastery ${t}`).not.toContain(t);
        }
      }
    }
  });

  it('§3.6 — every move is a Gen I move at its Gen I name and its modern type, or one made better (+, ++)', () => {
    const gen1 = new Map((JSON.parse(readFileSync('src/content/data/gen1-moves.json', 'utf8')) as { moves: { id: string; name: string; type: string }[] }).moves.map((m) => [m.id, m]));
    const enemyOnly = new Set(['call-for-help', 'cover']);
    for (const m of reg.allMoves()) {
      if (enemyOnly.has(m.id)) continue;
      const tier = m.id.endsWith('-plus-plus') ? '++' : m.id.endsWith('-plus') ? '+' : '';
      const g = gen1.get(m.id.replace(/(-plus)+$/, ''));
      expect(g, `${m.id} is not a Gen I move`).toBeDefined();
      expect(m.name, m.id).toBe(`${g!.name}${tier}`);
      expect(m.type, m.id).toBe(g!.type);
    }
  });

  it('§6.3.6.4 — every damaging card sits in its AP band; Cleave, recoil, sacrifice and Mastery tiers are budgeted apart', () => {
    const band: Record<number, { melee: [number, number]; ranged: [number, number] }> = {
      1: { melee: [40, 50], ranged: [45, 55] },
      2: { melee: [60, 75], ranged: [65, 90] },
      3: { melee: [85, 100], ranged: [90, 100] },
      4: { melee: [110, 130], ranged: [115, 130] },
    };
    const mastery = new Set(reg.allSpecies().flatMap((s) => reg.masteryMoves(s.id).slice(1)).filter(Boolean));
    for (const m of reg.allMoves()) {
      if (m.power <= 1 || mastery.has(m.id) || m.targeting === 'cleave') continue;
      if (m.effects.some((e) => e.kind === 'recoil' || (e.kind === 'status' && e.self))) continue;
      const [lo, hi] = band[m.apCost]![m.range];
      expect(m.power, `${m.id} (${m.apCost} AP ${m.range})`).toBeGreaterThanOrEqual(lo);
      expect(m.power, `${m.id} (${m.apCost} AP ${m.range})`).toBeLessThanOrEqual(hi);
    }
  });

  it('§6.4.3 — a tutor list is stage-specific and never sells what the line already learns', () => {
    for (const s of reg.allSpecies()) {
      const own = new Set(reg.lineLearnset(s.id).map((l) => l.move));
      for (const t of s.tutorMoves) {
        expect(() => reg.move(t)).not.toThrow();
        expect(own.has(t), `${s.id} tutors ${t}, which it learns anyway`).toBe(false);
      }
    }
  });

  it('§2.9.4.2 — egg moves sit on a base form, at most three, and are never what the line learns or tutors anyway', () => {
    let lines = 0;
    for (const s of reg.allSpecies()) {
      if (!s.eggMoves.length) continue;
      lines++;
      expect(reg.lineBase(s.id), `${s.id} carries egg moves but is not its line's base`).toBe(s.id);
      expect(s.eggMoves.length).toBeLessThanOrEqual(3);
      const stages = reg.allSpecies().filter((x) => reg.lineBase(x.id) === s.id);
      const learnt = new Set(stages.flatMap((x) => [...reg.lineLearnset(x.id).map((l) => l.move), ...x.tutorMoves]));
      for (const e of s.eggMoves) {
        expect(() => reg.move(e)).not.toThrow();
        expect(learnt.has(e), `${s.id}'s line already gets ${e}`).toBe(false);
      }
    }
    // Most lines have some; the few the games never gave any (Magikarp, Ditto, the legendaries…) have none.
    expect(lines).toBeGreaterThan(55);
  });

  it('§4.1.5.1 — the two combat stats are derived, never the raw Gen I Attack/Defence', () => {
    // A special attacker must out-hit its physical stat: Butterfree (Atk 45, Spc 90) hits at 90.
    expect(reg.species('butterfree').baseStats.attack).toBe(90);
    // A special wall keeps its bulk: Oddish (Def 55, Spc 75) defends at 65.
    expect(reg.species('oddish').baseStats.defense).toBe(65);
  });
});

// §6.8.4 / §5.13.2 — every recruitable line's Mastery is whole (v0.9.1), and each tier sits in its power band.
describe('Mastery Moves — §6.8.4', () => {
  /** On purpose outside the band: none since v0.9.5, when every tier became a Gen I move's + and ++. */
  const EXCEPTIONS = new Set<string>();
  const stagesOf = (line: string): number => {
    let n = 1;
    let s = reg.species(line);
    while (s.evolvesTo.length) {
      n++;
      s = reg.species(s.evolvesTo[0]!);
    }
    return n;
  };

  it('EveryRecruitableLine_CarriesEveryTierItsStagesReach', () => {
    for (const s of reg.allSpecies().filter((x) => x.stage === 'basic')) {
      const tiers = reg.masteryMoves(s.id);
      if (!tiers[0]) continue;
      const stages = stagesOf(s.id);
      if (stages >= 2) expect(tiers[1], `${s.id} Lv2`).toBeTruthy();
      if (stages >= 3) expect(tiers[2], `${s.id} Lv3`).toBeTruthy();
    }
  });

  it('EveryRecruitableLine_HasItsHiddenAbility_SoNoBondRankIsEmpty_§6.8.3', () => {
    // §6.8.2 rank 2 opens the hidden ability; a line without one would cross that rank for nothing (v0.9.1).
    for (const s of reg.allSpecies().filter((x) => x.stage === 'basic' && reg.masteryMoves(x.id)[0])) {
      expect(s.hiddenAbility, `${s.id} hidden ability`).toBeTruthy();
      reg.ability(s.hiddenAbility!);
    }
  });

  it('Lv2AndLv3_SitInTheirPowerAndApBands', () => {
    const bands = [null, { power: [85, 110], ap: [1, 2] }, { power: [110, 140], ap: [2, 3] }] as const;
    for (const s of reg.allSpecies().filter((x) => x.stage === 'basic')) {
      reg.masteryMoves(s.id).forEach((id, tier) => {
        const band = bands[tier];
        if (!id || !band || EXCEPTIONS.has(id)) return;
        const m = reg.move(id);
        expect(m.apCost, `${id} AP`).toBeGreaterThanOrEqual(band.ap[0]);
        expect(m.apCost, `${id} AP`).toBeLessThanOrEqual(band.ap[1]);
        // Super Fang's family takes a share of HP; its printed power is a placeholder.
        if (m.effects.some((e) => e.kind === 'fixed-damage')) return;
        expect(m.power, `${id} power`).toBeGreaterThanOrEqual(band.power[0]);
        expect(m.power, `${id} power`).toBeLessThanOrEqual(band.power[1]);
      });
    }
  });
});
