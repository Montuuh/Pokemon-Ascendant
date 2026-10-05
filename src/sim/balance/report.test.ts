import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY, type FightTrace, type RelicGain } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';

// §2.2.1 / v0.8.8 — the balance pass's instrument: whole three-Region runs, and per Region how often it is cleared,
// how long a fight runs, how hard the enemies hit (the median landed move as a share of the target's Max HP — the
// playtest's "enemies hit too softly" was 12 %), how Gyms go, and what the bag still holds when the run ends.
// v0.8.10 — and the run's two growth curves: relics (§7.3: how many, from where, at each Gym) and XP (§6.2.1: what a
// fight pays, how many levels a Region adds, and the level gap to what the team fights, column by column).
// Off in `npm run check` (it is minutes long); run it with `BALANCE_REPORT=1 REPORT_SEEDS=80 npx vitest run
// src/sim/balance/report.test.ts`.

const ON = !!process.env.BALANCE_REPORT;
const SEEDS = Number(process.env.REPORT_SEEDS ?? 40);

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)} %`;
const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`;
const teamLevel = (f: FightTrace) => mean(f.team.map((m) => m.levelBefore));
/** The active team's mean level going in, less the mean level of what it fought: + is the team over. */
const gap = (f: FightTrace) => teamLevel(f) - mean(f.enemies.map((e) => e.level));
const COLUMNS = [[0, 4], [5, 9], [10, 14], [15, 19]] as const;
const KINDS = ['wild', 'trainer', 'elite', 'gym'] as const;

describe.skipIf(!ON)('Balance report — §2.2.1', () => {
  it('prints the report', { timeout: 60 * 60_000 }, () => {
    const fights: FightTrace[] = [];
    const cleared = [0, 0, 0, 0];
    const bagLeft: number[] = [];
    const relics: RelicGain[][] = [];
    const reachedRegion: number[] = [];
    let shiniesMet = 0;
    let shiniesCaught = 0;
    for (const starter of STARTER_IDS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const r = autoRun(9000 + seed, starter, ctx, DEFAULT_RUN_POLICY, 3, (f) => fights.push(f));
        cleared[r.regionsCleared]! += 1;
        bagLeft.push(r.bagLeft.length);
        relics.push(r.relicsGained);
        reachedRegion.push(r.regionsCleared);
        shiniesMet += r.metaEvents.reduce((a, e) => a + (e.t === 'combat-end' ? e.shinies?.length ?? 0 : 0), 0);
        shiniesCaught += r.metaEvents.filter((e) => e.t === 'recruit' && e.shiny).length;
      }
    }
    const n = SEEDS * STARTER_IDS.length;
    const past = (k: number) => cleared.slice(k).reduce((a, b) => a + b, 0);
    console.log(`runs ${n} · R1 ${pct(past(1) / n)} · R2|R1 ${pct(past(2) / Math.max(1, past(1)))} · R3|R2 ${pct(past(3) / Math.max(1, past(2)))} · whole run ${pct(past(3) / n)}`);
    for (const region of [0, 1, 2]) {
      const here = fights.filter((f) => f.region === region);
      const gyms = here.filter((f) => f.kind === 'gym');
      const lost = (f: FightTrace) => f.outcome === 'defeat';
      const used = here.flatMap((f) => f.used).filter((id) => ctx.content.consumable(id).effect.kind !== 'catch');
      console.log(
        `R${region + 1}: fights ${here.length} · turns ${(here.reduce((a, f) => a + f.turns, 0) / Math.max(1, here.length)).toFixed(1)}` +
          ` · median enemy hit ${pct(median(here.flatMap((f) => f.enemyHits)))}` +
          ` · Gym fights ${gyms.length} lost ${pct(gyms.filter(lost).length / Math.max(1, gyms.length))} (${(gyms.reduce((a, f) => a + f.turns, 0) / Math.max(1, gyms.length)).toFixed(1)} turns)` +
          ` · items used per fight ${(used.length / Math.max(1, here.length)).toFixed(2)}`,
      );
    }
    console.log(`shinies (§5.14): met ${(shiniesMet / n).toFixed(2)} a run · caught ${(shiniesCaught / n).toFixed(2)} a run`);
    console.log(`bag left at the run's end: mean ${(bagLeft.reduce((a, b) => a + b, 0) / bagLeft.length).toFixed(1)} · median ${median(bagLeft)}`);

    // §7.3 — how many relics a run holds and where they came from.
    console.log('\nRELICS');
    for (const region of [0, 1, 2]) {
      const gyms = fights.filter((f) => f.region === region && f.kind === 'gym');
      // Gained in the Region (its route, its Gym's pick, the City after it), by the runs that reached it.
      const inRegion = relics.filter((_, i) => reachedRegion[i]! >= region).map((rs) => rs.filter((g) => g.region === region).length);
      console.log(`R${region + 1}: held entering the Gym ${mean(gyms.map((f) => f.relics)).toFixed(1)} · gained in the Region ${mean(inRegion).toFixed(1)}`);
    }
    const wins = relics.filter((_, i) => reachedRegion[i]! >= 3).map((rs) => rs.length);
    console.log(`run end: every run ${mean(relics.map((rs) => rs.length)).toFixed(1)} · whole-run wins ${mean(wins).toFixed(1)} (${wins.length} runs)`);
    const share = (key: (g: RelicGain) => string) => {
      const all = relics.flat();
      const m = new Map<string, number>();
      for (const g of all) m.set(key(g), (m.get(key(g)) ?? 0) + 1);
      return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / Math.max(1, all.length))}`).join(' · ');
    };
    console.log(`by source: ${share((g) => g.source)}`);
    console.log(`by rarity: ${share((g) => ctx.content.relic(g.id).rarity)}`);

    // §6.2.1 — what a won fight pays each active Pokémon, and how many levels a Region adds.
    console.log('\nXP (per active Pokémon, per won fight)');
    for (const region of [0, 1, 2]) {
      const here = fights.filter((f) => f.region === region);
      const won = here.filter((f) => f.outcome !== 'defeat');
      const xp = (k: string) => mean(won.filter((f) => f.kind === k).flatMap((f) => f.team.map((m) => m.xpGained)));
      const first = mean(here.filter((f) => f.layer === 0).map(teamLevel));
      const atGym = mean(here.filter((f) => f.kind === 'gym').map(teamLevel));
      console.log(`R${region + 1}: ${KINDS.map((k) => `${k} ${xp(k).toFixed(0)}`).join(' · ')} · team Lv ${first.toFixed(1)} → ${atGym.toFixed(1)} at the Gym (${signed(atGym - first)})`);
    }

    // §2.2.1 / §6.2.1 — does the team keep pace with what it fights? Column by column, and at the big fights.
    console.log('\nLEVEL GAP (active team mean − enemy mean, going in; + = the team over)');
    for (const region of [0, 1, 2]) {
      const here = fights.filter((f) => f.region === region);
      const col = (kind: string, a: number, b: number) => signed(mean(here.filter((f) => f.kind === kind && f.layer >= a && f.layer <= b).map(gap)));
      console.log(`R${region + 1}: ${COLUMNS.map(([a, b]) => `cols ${a}–${b} wild ${col('wild', a, b)} trainer ${col('trainer', a, b)}`).join(' · ')}`);
      const gyms = here.filter((f) => f.kind === 'gym');
      const ace = (f: FightTrace) => teamLevel(f) - Math.max(...f.enemies.map((e) => e.level));
      console.log(
        `    elite ${signed(mean(here.filter((f) => f.kind === 'elite').map(gap)))} · Gym ${signed(mean(gyms.map(gap)))}` +
          ` (its ace ${signed(mean(gyms.map(ace)))}) · the Box against the team at the Gym ${signed(mean(gyms.map((f) => f.boxLevel - teamLevel(f))))}`,
      );
    }
    expect(fights.length).toBeGreaterThan(0);
  });
});
