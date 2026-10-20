import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, effectiveMax, matchupAgainst, newPartyMon, statAtLevel, teamStats } from '@/sim';

// §2.3 / §9.12 — the Team screen's reads: a Pokémon's stats as its next fight fields them, and how it meets a type.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

describe('The Team sheet — §2.3, §6.2.3, §4.1.2', () => {
  it('TeamStats_AreTheFightsOwn_LevelPathAndBoosts_HpAtTheTraumaCeiling', () => {
    const run = produce(createRun('charmander', 7, ctx), (d) => {
      d.box[0]!.level = 20;
      d.box[0]!.traumaStacks = 2;
      d.box[0]!.boosts = { attack: 5 };
    });
    const mon = run.box[0]!;
    const species = content.species(mon.speciesId);
    const s = teamStats(run, mon, content);
    expect(s.hp).toBe(effectiveMax(run, mon, content));
    expect(s.attack).toBe(statAtLevel(species, 'attack', 20, mon.archetype) + 5);
    expect(s.defense).toBe(statAtLevel(species, 'defense', 20, mon.archetype));
    expect(s.speed).toBe(statAtLevel(species, 'speed', 20, mon.archetype));
  });

  it('Matchup_TakesItsBestDamagingMove_AndTheTypesDefence', () => {
    const run = createRun('squirtle', 7, ctx);
    const squirtle = run.box[0]!;
    // A Water move against Fire is ×2; Fire's attacks against Water are ×0.5.
    const water = squirtle.moveIds.some((id) => content.move(id).type === 'water' && content.move(id).power > 0);
    const m = matchupAgainst(squirtle, 'fire', content);
    if (water) expect(m.attack).toBe(2);
    expect(m.defend).toBe(0.5);
  });

  it('Matchup_WithNoDamagingMove_HitsForOne', () => {
    const mon = { ...newPartyMon('pidgey', 5, content, 1), moveIds: [] };
    expect(matchupAgainst(mon, 'electric', content).attack).toBe(1);
    expect(matchupAgainst(mon, 'electric', content).defend).toBe(2);
  });
});
