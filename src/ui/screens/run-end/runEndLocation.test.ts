import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, generateLeague } from '@/sim';
import { runEndLocation } from './runEndLocation';

const content = buildRegistry();
const fresh = (region = 0) => structuredClone(createRun('squirtle', 11, defaultRunCtx(content), region));

describe('Run ending location — §9.12.3 / §2.1.6', () => {
  it('ReachedFight_AfterClearedNode_UsesAttemptedColumn', () => {
    const run = fresh(1);
    const nodes = Object.values(run.map.nodes);
    run.position = nodes.find((n) => n.layer === 0)!.id;
    run.pendingNodeId = nodes.find((n) => n.layer === 1)!.id;
    expect(runEndLocation(run)).toBe('Region 2 · Column 2 / 20');
  });

  it('LegacyEnding_NoPendingNode_UsesPositionAndRegion', () => {
    const run = fresh(2);
    run.position = Object.values(run.map.nodes).find((n) => n.layer === 19)!.id;
    expect(runEndLocation(run)).toBe('Region 3 · Column 20 / 20');
  });

  it('LeagueDefeat_PreviousOpponentCleared_NamesReachedOpponent', () => {
    const run = fresh(2);
    run.zone = 'league';
    run.map = generateLeague(run, content);
    run.position = 'league-0';
    run.pendingNodeId = 'league-1';
    expect(runEndLocation(run)).toBe('League · Agatha');
  });

  it('LeagueChampionCleared_NoPendingNode_KeepsChampionIdentity', () => {
    const run = fresh(2);
    run.zone = 'league';
    run.map = generateLeague(run, content);
    run.position = 'league-4';
    expect(runEndLocation(run)).toBe('League · Champion Blue');
  });

  it('UnknownLeagueRoster_StillIdentifiesZoneAndColumn', () => {
    const run = fresh(2);
    run.zone = 'league';
    run.map = generateLeague(run, content);
    run.pendingNodeId = 'league-0';
    delete run.map.nodes['league-0']!.preview.rosterId;
    expect(runEndLocation(run)).toBe('League · Column 1 / 5');
  });

  it('InvalidPendingId_UsesValidPosition', () => {
    const run = fresh();
    run.pendingNodeId = 'missing';
    run.position = Object.values(run.map.nodes).find((n) => n.layer === 0)!.id;
    expect(runEndLocation(run)).toBe('Region 1 · Column 1 / 20');
  });

  for (const [zone, expected] of [[undefined, 'Region 1'], ['victory-road', 'Victory Road'], ['league', 'League']] as const) {
    it(`Arrival_${zone ?? 'region'}_DoesNotInventColumnZero`, () => {
      const run = fresh();
      run.zone = zone;
      expect(runEndLocation(run)).toBe(`${expected} · Entrance`);
    });
  }
});
