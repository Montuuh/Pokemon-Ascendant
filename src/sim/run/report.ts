import type { CombatState } from '../combat/state';
import type { ActiveSetup, CombatOutcomeReport, RunState } from './types';

// The seam between a fight and the run (§2.4). The combat sim knows nothing about the Box: it names its team
// p0/p1/p2. The scenario the run built carries the Box uid on each member, so zipping the two by index maps
// the result home. Keeping this pure means the autoplayer and the UI agree on what a fight did.

/** §2.4.2 — a fainted Pokémon leaves the fight at 0 HP and keeps that into the next node. */
export function buildOutcomeReport(combat: CombatState, run: RunState): CombatOutcomeReport {
  const setups = (run.pendingScenario?.player.team ?? []) as ActiveSetup[];

  const team = combat.player.team.map((c, i) => ({
    uid: setups[i]?.uid ?? c.uid,
    hp: c.hp,
    // §7.3.5 — the running total, not the delta: the fight was handed the run's count and grew it.
    defeats: c.defeats,
    // §4.2.7 — a status does not survive the fight it was inflicted in; only the run's own carry-over does.
    status: null,
    fainted: c.hp <= 0,
  }));

  const caught =
    combat.outcome === 'caught'
      ? (() => {
          const mon = combat.defeatedEnemies[combat.defeatedEnemies.length - 1] ?? combat.enemies[0];
          return mon ? { speciesId: mon.speciesId, level: mon.level } : null;
        })()
      : null;

  const outcome: CombatOutcomeReport['outcome'] =
    combat.outcome === 'caught' ? 'caught' : combat.outcome === 'victory' ? 'victory' : combat.outcome === 'escaped' ? 'escaped' : 'defeat';

  // §8.8 No Refunds reads this; every other run keeps its shelf stocked and simply ignores it.
  const spentConsumables = combat.player.consumables.used.map((c) => c.consumableId);

  // §7.3.7 — every relic charge this fight spent. The run decides which of them do not come back: this
  // layer knows what happened, and the content row knows whether it was the last time.
  const spentRelics = [...combat.player.spent];

  const lead = combat.player.team[combat.player.leadIndex];

  return {
    outcome, team, caught, ballsLeft: combat.player.balls, spentConsumables, spentRelics, turns: combat.turn,
    damageTaken: combat.player.totalDamageTaken,
    manualSwaps: combat.player.totalManualSwaps,
    // §8.6.1 — the discovery tallies, and the two end-of-fight facts the criteria need.
    tally: { ...combat.player.tally, statusesApplied: [...combat.player.tally.statusesApplied] },
    leadHpFraction: lead && lead.maxHp > 0 ? lead.hp / lead.maxHp : 1,
    activeSpecies: combat.player.team.map((c) => c.speciesId),
    // §5.13.1 — a caught Pokémon is in `defeatedEnemies` too (the fight ends with it there), and catching is
    // explicitly not a kill, so it is left out.
    defeated: combat.defeatedEnemies.filter((e) => e.hp <= 0).map((e) => e.speciesId),
    // Lead turns are keyed by combat uid; map them back to species, which is what the account keeps.
    leadTurns: Object.fromEntries(
      combat.player.team.map((c, i) => [setups[i]?.uid ?? c.uid, combat.player.leadTurns[c.uid] ?? 0] as const).filter(([, n]) => n > 0)
        .map(([uid, n]) => [combat.player.team.find((c, i) => (setups[i]?.uid ?? c.uid) === uid)?.speciesId ?? uid, n]),
    ),
  };
}
