import { useAccountStore } from '@/app/accountStore';
import { useAppStore, type Screen } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { produce } from 'immer';
import * as sim from '@/sim';
import { nextAction } from '@/sim/balance/autoPlayer';

// DEV-ONLY window hook — the web equivalent of the Unity-era CombatDebug/ScenarioLauncher. From the browser
// console or the Claude browser tool's javascript_tool:
//   __ascendant.dump()                 compact JSON of the live combat (HP / status / AP / hand / intent / outcome)
//   __ascendant.start('wild-basic', 7) launch a fixture (optional seed)
//   __ascendant.dispatch({type:'end-turn'})
//   __ascendant.auto(1)                let the balance auto-player take N actions (or a whole fight with 999)
//   __ascendant.replay()               export { scenarioId, seed, actions } for a golden/bug report
//   __ascendant.run.new('squirtle', 7) start a run (optional seed)
//   __ascendant.run.dump()             compact JSON of the live run (position, box, reachable, phase)
//   __ascendant.run.dispatch({...})    a RunAction
//   __ascendant.run.fill(6)            top the Box up to N Pokémon — the fast way to reach Swap-or-Skip
//   __ascendant.run.goto('merchant')   walk to the nearest node of a kind, auto-playing every fight on the way
//   __ascendant.run.city()             stand the run in Pallet Town (1: Celadon City) without walking there
//   __ascendant.run.levelTo(11)        put the Lead at a level, learnset and all
//   __ascendant.run.heal()             refill every Box Pokémon's bars, as a Center would (levelTo does not)
//   __ascendant.run.grantTm('tm05-surf')
//   __ascendant.run.grantStone('fire-stone')  put an Evolution Item in the bag (§6.3.2)
//   __ascendant.run.wear('leftovers')   put a held item in the bag (§7.4)
//   __ascendant.run.wear()              one of every generic held item, for eyeballing the inventory drawer
//   __ascendant.run.trauma(3)           give the Lead N Trauma stacks — the fast way to see §8.2.4's Therapy
//   __ascendant.run.pay(2000)           set the wallet, for pricing screens without grinding for the money
//   __ascendant.run.afflict('burn')     give the Lead a carried status (§4.2.7.1), as a fight would have left it
//   __ascendant.run.jump('gym')         stand the run right in front of the first node of a kind, skipping the route
export interface AscendantDevTools {
  version: string;
  dump: () => Record<string, unknown> | null;
  goTo: (screen: Screen) => void;
  start: (scenarioId: string, seed?: number) => void;
  dispatch: (action: sim.CombatAction) => boolean;
  auto: (steps?: number) => number;
  replay: () => sim.RecordedCombat | null;
  state: () => sim.CombatState | null;
  run: AscendantRunTools;
  /** §8.10 — the account, for looking at it and for putting it somewhere. */
  meta: {
    record: (events: sim.MetaEvent[]) => sim.AccountDelta;
    progress: () => sim.AchievementProgress;
    account: () => sim.AccountState;
    /** Set lifetime XP outright (levels settle on the next fold) — the fast way to see a track reward. */
    xp: (xp: number) => void;
    tokens: (n: number) => void;
    reset: () => void;
  };
  sim: typeof sim;
}

/** The run-layer half of the hook. Everything here goes through the real reducer, never around it. */
export interface AscendantRunTools {
  new: (starterId?: string, seed?: number) => void;
  dump: () => Record<string, unknown> | null;
  state: () => sim.RunState | null;
  dispatch: (action: sim.RunAction) => boolean;
  /** Top the Box up with wild-band recruits, for reaching Box-full states without playing to them. */
  fill: (to?: number) => number;
  /**
   * Walk to the nearest node of a kind, auto-playing every fight on the way. Returns where it stopped.
   * `stopAtEvolution` halts on the first Evolution screen instead of taking the first archetype, which is
   * how you get *to* that screen rather than past it.
   */
  goto: (kind: sim.NodeKind, stopAtEvolution?: boolean) => string;
  /** Put a Pokémon at a level, learnset and all — the fast way to stand one at its evolution threshold. */
  levelTo: (level: number, uid?: string) => void;
  /** §2.11.1 — every Box Pokémon to full HP and no status, as the Center's heal: levelTo raises the level, not the HP. */
  heal: () => void;
  /** Drop TMs into the bag without waiting on §7.5's loot roll. */
  grantTm: (...tmIds: string[]) => void;
  /** §6.3.2 — drop Evolution Items into the bag. */
  grantStone: (...stoneIds: string[]) => void;
  /** §7.4 — drop held items into the bag. No argument means one of every generic item. */
  wear: (...itemIds: string[]) => void;
  /** §8.2 — stack Trauma on one Pokémon, for reaching the Centre's Therapy without playing badly on purpose. */
  trauma: (stacks: number, uid?: string) => void;
  /** §2.14 — set the wallet outright. */
  pay: (amount: number) => void;
  /** §4.2.7.1 — leave a status on a Box Pokémon, as if its last fight had ended with it. */
  afflict: (kind: sim.PrimaryStatus, uid?: string) => void;
  /**
   * Make the first node of a kind the only reachable one, without walking there. For tests about what a node
   * *does* (the Gym's ending, a Region 3 fight), not about the route that leads to it.
   */
  jump: (kind: sim.NodeKind) => boolean;
  /**
   * §2.11 — stand the run in the City after Region `regionIndex` (0 → Pallet Town, 1 → Celadon City), with the
   * lobby rolled the way a Gym win would roll it. The route is skipped; the City is the real one.
   */
  city: (regionIndex?: number) => void;
  save: () => void;
  load: () => boolean;
}

declare global {
  interface Window {
    __ascendant?: AscendantDevTools;
  }
}

export function installDevTools(): void {
  const combat = () => useCombatStore.getState();
  window.__ascendant = {
    version: __APP_VERSION__,
    meta: {
      record: (events) => useAccountStore.getState().record(events),
      progress: () => useAccountStore.getState().account.achievements,
      account: () => useAccountStore.getState().account,
      xp: (xp) => {
        useAccountStore.setState({ account: { ...useAccountStore.getState().account, xp } });
        useAccountStore.getState().record([{ t: 'relic-acquired', relicId: 'dev', heldCount: 0 }]);
      },
      tokens: (n) => {
        useAccountStore.setState({ account: { ...useAccountStore.getState().account, tokens: n } });
        // An empty fold writes the account, so the number survives the reload the next test step does.
        useAccountStore.getState().record([]);
      },
      reset: () => useAccountStore.getState().reset(),
    },
    goTo: (screen) => useAppStore.getState().goTo(screen),
    start: (id, seed) => combat().start(id, seed),
    dispatch: (action) => combat().dispatch(action),
    state: () => combat().state,
    replay: () => combat().exportReplay(),
    auto: (steps = 1) => {
      let done = 0;
      for (let i = 0; i < steps; i++) {
        const s = combat().state;
        if (!s || s.outcome !== 'in-progress') break;
        const a = nextAction(s, combat().ctx) ?? { type: 'end-turn' as const };
        if (!combat().dispatch(a)) break;
        done++;
      }
      return done;
    },
    run: {
      new: (starterId = 'squirtle', seed) => useRunStore.getState().newRun(starterId, seed),
      state: () => useRunStore.getState().run,
      dispatch: (action) => useRunStore.getState().dispatch(action),
      save: () => useRunStore.getState().save(),
      load: () => useRunStore.getState().loadSave().ok,
      fill: (to = sim.RUN_START.boxCapacity) => {
        const store = useRunStore.getState();
        const run = store.run;
        if (!run) return 0;
        const pool = ['pidgey', 'rattata', 'oddish', 'zubat', 'geodude', 'poliwag'];
        const box = [...run.box];
        let added = 0;
        for (const id of pool) {
          if (box.length >= to) break;
          box.push(sim.newPartyMon(id, 8, combat().ctx.content, run.seed + box.length));
          added++;
        }
        useRunStore.setState({ run: { ...run, box } });
        return added;
      },
      heal: () => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const content = combat().ctx.content;
        useRunStore.setState({ run: { ...run, box: run.box.map((m) => ({ ...m, hp: sim.maxHpOf(m, content), status: null, confusionTurns: 0 })) } });
      },
      levelTo: (level, uid) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const target = uid ?? run.activeUids[0] ?? run.box[0]?.uid;
        const content = combat().ctx.content;
        const box = run.box.map((m) => {
          if (m.uid !== target) return m;
          // Re-derive the pool from the new level so the Pokémon is exactly what it would have been.
          const pool = sim.knownMoves(content, m.speciesId, level);
          return { ...m, level, xp: 0, pool: [...pool], moveIds: sim.autoPickMoves(pool, content) };
        });
        useRunStore.setState({ run: { ...run, box } });
      },

      grantTm: (...tmIds) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        useRunStore.setState({ run: { ...run, tms: [...run.tms, ...tmIds] } });
      },

      grantStone: (...stoneIds) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        useRunStore.setState({ run: { ...run, stones: [...run.stones, ...stoneIds] } });
      },

      wear: (...itemIds) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const ids = itemIds.length
          ? itemIds
          : combat().ctx.content.allHeldItems().filter((i) => !i.speciesLock).map((i) => i.id);
        useRunStore.setState({ run: { ...run, bag: [...run.bag, ...ids] } });
      },

      trauma: (stacks, uid) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const target = uid ?? run.activeUids[0] ?? run.box[0]?.uid;
        const box = run.box.map((m) => (m.uid === target ? { ...m, traumaStacks: Math.max(0, Math.min(10, stacks)) } : m));
        useRunStore.setState({ run: { ...run, box } });
      },

      pay: (amount) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        useRunStore.setState({ run: { ...run, money: Math.max(0, Math.floor(amount)) } });
      },

      jump: (kind) => {
        const run = useRunStore.getState().run;
        const node = run && Object.values(run.map.nodes).find((n) => n.kind === kind);
        if (!run || !node || run.phase !== 'map') return false;
        useRunStore.setState({ run: { ...run, reachable: [node.id] } });
        return true;
      },

      afflict: (kind, uid) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const target = uid ?? run.activeUids[0] ?? run.box[0]?.uid;
        const box = run.box.map((m) => (m.uid === target ? { ...m, status: { kind, turnsLeft: null } } : m));
        useRunStore.setState({ run: { ...run, box } });
      },

      city: (regionIndex = 0) => {
        const run = useRunStore.getState().run;
        if (!run) return;
        const ctx = sim.defaultRunCtx(getContent());
        useRunStore.setState({ run: produce(run, (d) => { d.regionIndex = regionIndex; sim.arriveAtCity(d, ctx); }) });
        useAppStore.getState().goTo('map');
      },

      /**
       * Walk to the nearest node of a kind, auto-playing every fight and taking the first archetype at every
       * Evolution screen. Everything goes through the real reducers, so what it reaches is a state the game
       * could have reached on its own — it just skips the twenty minutes.
       */
      goto: (kind, stopAtEvolution = false) => {
        const store = () => useRunStore.getState();
        // One iteration per phase transition, not per node: a ten-layer route with fights, rewards,
        // evolutions and service screens in between spends three or four of these per layer.
        for (let step = 0; step < 90; step++) {
          const run = store().run;
          if (!run || run.outcome !== 'in-progress') break;

          if (run.phase === 'evolution') {
            if (stopAtEvolution) break;
            const p = run.pendingEvolutions[0]!;
            store().dispatch({ type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
            continue;
          }
          if (run.phase === 'reward') { store().dispatch({ type: 'claim-reward' }); continue; }
          if (run.phase === 'swap-or-skip') { store().dispatch({ type: 'resolve-recruit', releaseUid: null }); continue; }

          // Arrived: stop and hand the screen over. A node's phase is not always its kind's name: a Mystery
          // opens `event` and the merchant opens `shop`.
          if (run.phase === (kind === 'mystery' ? 'event' : kind === 'merchant' ? 'shop' : kind)) break;
          // §7.3.7 / §2.11 — a Gym's win stops on the Legendary pick (the walk's arrival for `goto('gym')`), and
          // after it the City; neither is walked through.
          if (run.phase === 'legendary' || run.phase === 'city') break;

          // A service node on the way is walked *through*, not stopped at. A `goto('mystery')` that parks at
          // the merchant is a walk that did not finish — which is exactly what it used to do.
          if (run.phase === 'shop') { store().dispatch({ type: 'leave-shop' }); continue; }
          if (run.phase === 'aid') { store().dispatch({ type: 'leave-aid' }); continue; }
          if (run.phase === 'event') {
            // Option 0 is a real choice made by the real reducer; the walker just always takes the first.
            if (!run.eventResult) store().dispatch({ type: 'choose-event', option: 0 });
            store().dispatch({ type: 'leave-event' });
            continue;
          }
          if (run.phase === 'combat') {
            for (let i = 0; i < 400; i++) {
              const s = combat().state;
              if (!s || s.outcome !== 'in-progress') break;
              combat().dispatch(nextAction(s, combat().ctx) ?? { type: 'end-turn' });
            }
            store().finishCombat();
            continue;
          }
          if (run.phase !== 'map') break;

          // Nearest node of the wanted kind, by breadth-first walk over the edges we can still reach.
          const from = [...run.reachable];
          const cameFrom = new Map<string, string>();
          const queue = [...from];
          let goal: string | null = null;
          for (let i = 0; i < queue.length && !goal; i++) {
            const id = queue[i]!;
            if (run.map.nodes[id]!.kind === kind) { goal = id; break; }
            for (const next of run.map.nodes[id]!.next) {
              if (cameFrom.has(next) || from.includes(next)) continue;
              cameFrom.set(next, id);
              queue.push(next);
            }
          }
          if (!goal) break;
          let first = goal;
          while (cameFrom.has(first)) first = cameFrom.get(first)!;

          const healthy = run.box.filter((m) => m.hp > 0).slice(0, 3).map((m) => m.uid);
          if (healthy.length) store().dispatch({ type: 'set-active', uids: healthy });
          if (!store().dispatch({ type: 'enter-node', nodeId: first })) break;
          store().beginCombat();
        }
        const r = store().run;
        const here = r?.position ? r.map.nodes[r.position] : null;
        return r ? `${r.phase} · ${here ? `${here.kind} ${here.id}` : 'start'}` : 'no run';
      },

      dump: () => {
        const r = useRunStore.getState().run;
        if (!r) return null;
        const here = r.position ? r.map.nodes[r.position] : null;
        return {
          seed: r.seed,
          phase: r.phase,
          outcome: r.outcome,
          layer: here ? here.layer + 1 : 0,
          at: here ? `${here.kind} ${here.id}` : 'start',
          reachable: r.reachable.map((id) => `${r.map.nodes[id]!.kind} ${id}`),
          balls: r.balls,
          consumables: r.consumables,
          active: r.activeUids,
          tms: r.tms,
          box: r.box.map((m) => `${m.speciesId}${m.archetype ? `/${m.archetype}` : ''} L${m.level} ${m.hp}/${sim.maxHpOf(m, combat().ctx.content)}${m.traumaStacks ? ` T${m.traumaStacks}` : ''} [${m.moveIds.join(',')}]${m.pool.length > m.moveIds.length ? ` +${m.pool.length - m.moveIds.length} pooled` : ''}${m.abilityId ? ` ability:${m.abilityId}` : ''}`),
          stats: r.stats,
          lastLog: r.log.slice(-5),
        };
      },
    },

    dump: () => {
      const s = combat().state;
      if (!s) return null;
      const ctx = combat().ctx;
      const mon = (c: sim.Combatant) => ({
        name: c.name,
        hp: `${c.hp}/${c.maxHp}`,
        status: c.status ? `${c.status.kind}(${c.status.turnsLeft ?? '∞'})` : null,
        confusion: c.confusionTurns || undefined,
        stages: Object.fromEntries(Object.entries(c.stages).filter(([, v]) => v !== 0)),
      });
      const e = s.enemies[0];
      return {
        scenario: s.scenarioId,
        seed: s.seed,
        turn: s.turn,
        phase: s.phase,
        outcome: s.outcome,
        ap: s.player.ap,
        swapCounter: s.player.swapCounter,
        lead: s.player.team[s.player.leadIndex]?.name,
        team: s.player.team.map(mon),
        enemy: e ? { ...mon(e), phase: e.phase, intent: e.intent ? sim.describeIntent(s, e, ctx) : null } : null,
        queue: s.enemyQueue.map((q) => q.name),
        hand: s.player.hand.map((c) => {
          const p = sim.cardPlayability(s, c.id, ctx)!;
          return `${c.moveId}[${p.owner.name}] ${p.playable ? `${p.apCost}AP${p.damage ? ` ${p.damage.final}dmg` : ''}` : p.reason}`;
        }),
        consumables: s.player.consumables.hand.map((c) => c.consumableId),
        deck: s.player.deck.length,
        discard: s.player.discard.length,
        pendingLeadPick: s.player.pendingLeadPick,
        catch: sim.catchStatus(s, ctx),
        lastLog: s.log.slice(-5).map((l) => l.text),
      };
    },
    sim,
  };
}
