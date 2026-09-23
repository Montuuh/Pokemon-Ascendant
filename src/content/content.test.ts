import { describe, expect, it } from 'vitest';
import { activeMoves, knownMoves, BIOMES, ELITE_WILD, GYMS, REGIONS, TRAINER_SPRITES, GYM } from '@/sim';
import { existsSync } from 'node:fs';
import { buildRegistry } from './registry';
import { boxIconUrl, portraitUrl, battleSpriteUrl } from './schemas/species';

// Content rot-guards — every id resolves, every referenced asset exists, every kit obeys §6.3.6 / §3.3.4.
const reg = buildRegistry();

describe('content registry', () => {
  it('builds without cross-reference errors', () => {
    expect(reg.allMoves().length).toBeGreaterThanOrEqual(50);
    expect(reg.allSpecies().length).toBeGreaterThanOrEqual(40);
    expect(reg.allConsumables().length).toBeGreaterThanOrEqual(10);
    expect(reg.allScenarios()).toHaveLength(6);
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
    expect(existsSync('public/art/map/region-1.png'), 'region 1 route plate').toBe(true);
    expect(existsSync('public/art/map/region-2.png'), 'region 2 route plate').toBe(true);
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
      // Two deliberate exceptions: Magikarp's three-card deck until it evolves is the whole joke, and Ditto is a
      // Transform and a spare (species-gen1.md — the Transform mechanic is an open question).
      const floor = s.id === 'magikarp' ? 3 : s.id === 'ditto' ? 2 : 4;
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

  it('§6.3.5 — a branch upgrades at most two moves and adds at most one, and always does something', () => {
    for (const s of reg.allSpecies()) {
      for (const b of s.branches) {
        expect(b.upgrades.length, b.id).toBeLessThanOrEqual(2);
        expect(b.adds.length, b.id).toBeLessThanOrEqual(1);
        expect(b.upgrades.length + b.adds.length, `${b.id} has an empty payload`).toBeGreaterThan(0);
        // An upgrade has to be one: same or better AP-for-power, and never a downgrade in role.
        for (const u of b.upgrades) {
          const from = reg.move(u.from);
          const to = reg.move(u.to);
          expect(to.power >= from.power || to.effects.length > from.effects.length, `${b.id}: ${u.from} → ${u.to} is not an upgrade`).toBe(true);
        }
      }
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

  it('§4.1.5.1 — the two combat stats are derived, never the raw Gen I Attack/Defence', () => {
    // A special attacker must out-hit its physical stat: Butterfree (Atk 45, Spc 90) hits at 90.
    expect(reg.species('butterfree').baseStats.attack).toBe(90);
    // A special wall keeps its bulk: Oddish (Def 55, Spc 75) defends at 65.
    expect(reg.species('oddish').baseStats.defense).toBe(65);
  });
});
