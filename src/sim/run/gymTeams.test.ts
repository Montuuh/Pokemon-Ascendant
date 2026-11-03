import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { enemyKit, kitRole } from '../combat/enemyKit';
import { lineChain } from '../combat/kit';
import { evolveMethod } from './xp';
import { ALL_GYMS, ENEMY_KIT_SIZE, GYM_REPERTOIRE, TRAINER_REPERTOIRE, gymTeamFor } from './region';
import { LEAGUE_MEMBERS, leagueTeam } from './league';

// §5.9.3 / §6.3.7 — every authored Gym Pokémon is a form it could be at its level, and §5.2.2 / §5.5.2 — every climax
// carries six moves by role, its combo's two among them.

/** The level-up evolutions a form needs that its level does not reach (a stone or a held item is legal at any level). */
function missedLevels(speciesId: string, level: number): string[] {
  const chain = lineChain(content, speciesId);
  const out: string[] = [];
  for (let i = 0; i + 1 < chain.length; i++) {
    const from = chain[i]!;
    const to = chain[i + 1]!;
    const branch = from.branches.find((b) => b.to === to.id) ?? from.branches[0]!;
    if (evolveMethod(from, branch) === 'level' && level < (from.evolveLevel ?? 0)) out.push(`${from.id}→${to.id} at ${from.evolveLevel}`);
    if (to.id === speciesId) break;
  }
  return out;
}

describe('Gym teams — §5.9.3', () => {
  it('EveryGymPokemon_IsAFormItCouldBeAtItsLevel', () => {
    for (const gym of ALL_GYMS) for (const m of gymTeamFor(gym)) expect(missedLevels(m.species, m.level), `${gym.id} ${m.species} Lv ${m.level}`).toEqual([]);
  });

  it('EveryGymPokemon_CarriesSixMoves_ItsComboAndItsSignatureAmongThem_§5.2.2', () => {
    for (const gym of ALL_GYMS) {
      for (const m of gymTeamFor(gym)) {
        const kit = enemyKit(content, m.species, m.level, ENEMY_KIT_SIZE.climax, GYM_REPERTOIRE[gym.type] ?? [], m.moves, m.combo);
        expect(kit.length, `${gym.id} ${m.species}`).toBe(ENEMY_KIT_SIZE.climax);
        for (const id of [...(m.combo ?? []), ...(m.signature ? [m.signature.move] : [])]) expect(kit, `${gym.id} ${m.species}`).toContain(id);
      }
    }
  });

  it('EveryGymAce_HasACombo_§5.5.2', () => {
    for (const gym of ALL_GYMS) expect(gym.team.at(-1)!.combo, gym.id).toBeDefined();
  });
});

describe('The League — §5.11 / §5.5.2', () => {
  it('EveryLeagueAce_HasACombo_InItsKit_WhateverTheStarter', () => {
    for (const starter of ['bulbasaur', 'charmander', 'squirtle']) {
      for (const member of LEAGUE_MEMBERS) {
        const ace = leagueTeam(member, { starter }, content).at(-1)!;
        expect(ace.combo, `${member.id} ${ace.species}`).toBeDefined();
        for (const id of ace.combo!) expect(ace.moves, `${member.id} ${ace.species}`).toContain(id);
        expect(ace.moves!.length).toBe(ENEMY_KIT_SIZE.climax);
      }
    }
  });
});

describe('Kits by role — §5.2.2', () => {
  it('ATrainersKit_IsFive_WithASetUpAndADisruption_FromItsRepertoireFirst', () => {
    const kit = enemyKit(content, 'geodude', 20, ENEMY_KIT_SIZE.trainer, TRAINER_REPERTOIRE.hiker);
    expect(kit).toHaveLength(5);
    expect(kit).toContain('stealth-rock');
    expect(kit.some((id) => kitRole(content.move(id)) === 'setup')).toBe(true);
  });

  it('AWildKit_IsTheAutoPickOfFour', () => {
    expect(enemyKit(content, 'rattata', 20, ENEMY_KIT_SIZE.wild)).toHaveLength(4);
  });

  it('EveryRepertoireMove_Exists', () => {
    for (const ids of [...Object.values(TRAINER_REPERTOIRE), ...Object.values(GYM_REPERTOIRE)]) for (const id of ids!) expect(content.hasMove(id), id).toBe(true);
  });
});
