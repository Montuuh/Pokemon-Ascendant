import { produce } from 'immer';
import { getContent } from '@/content/registry';
import { arriveAtCity, defaultRunCtx, isEvolutionReady, knownMoves, maxHpOf, newPartyMon, type PartyMon, type RunState } from '@/sim';
import { useAppStore } from './store';
import { useCombatStore } from './combatStore';
import { useRunStore } from './runStore';

// The playtest cheats — the secret menu (`rarecandy`, typed anywhere). Every one of them writes the stores
// directly rather than dispatching, on purpose: a dispatch is observed by the account (§8.7), and a cheat must never
// pay out a medal, a Bond point or a Pokédex entry. They exist to reach a state quickly — a town, a level, a full
// team — so the game can be played from there; they are not part of the game and nothing in the sim knows them.
//
// Each returns what happened, as a key into the menu's string table (`CHEAT_MENU.done`) and what to fill it with,
// or null when it did not apply here (no run, the wrong screen).

export type CheatResult =
  | { say: 'pallet' | 'celadon' | 'healed' | 'trauma' | 'full' | 'nobodyReady' | 'allRelics' | 'won' }
  | { say: 'jump'; node: 'gym' | 'elite' }
  | { say: 'levels' | 'money' | 'balls' | 'evolving'; n: number }
  | { say: 'relic'; name: string }
  | null;

const run = () => useRunStore.getState().run;
const edit = (recipe: (d: RunState) => void): boolean => {
  const r = run();
  if (!r) return false;
  useRunStore.setState({ run: produce(r, recipe) });
  useRunStore.getState().save();
  return true;
};

/** Raise a Pokémon's level, keeping its chosen cards and adding what the new levels teach; HP keeps its share. */
function raise(mon: PartyMon, levels: number): void {
  const content = getContent();
  const share = mon.hp / Math.max(1, maxHpOf(mon, content));
  mon.level = Math.min(100, mon.level + levels);
  mon.xp = 0;
  for (const m of knownMoves(content, mon.speciesId, mon.level)) if (!mon.pool.includes(m)) mon.pool.push(m);
  for (const m of mon.pool) if (mon.moveIds.length < 4 && !mon.moveIds.includes(m)) mon.moveIds.push(m);
  if (mon.hp > 0) mon.hp = Math.max(1, Math.round(share * maxHpOf(mon, content)));
}

export const CHEATS = {
  /** §2.11 — stand the run in a City, rolled the way a Gym win would roll it. Whatever was in flight is dropped. */
  city(regionIndex: 0 | 1): CheatResult {
    const ok = edit((d) => {
      d.regionIndex = regionIndex;
      d.pendingScenario = null;
      d.pendingNodeId = null;
      d.pendingEvolutions = [];
      d.pendingRecruit = null;
      d.pendingReward = null;
      arriveAtCity(d, defaultRunCtx(getContent()));
    });
    if (!ok) return null;
    useCombatStore.setState({ state: null });
    useAppStore.getState().goTo('map');
    return { say: regionIndex === 0 ? 'pallet' : 'celadon' };
  },

  /** Make the first node of a kind on the map the only one you can walk into. */
  jump(node: 'gym' | 'elite'): CheatResult {
    const r = run();
    const target = r && r.phase === 'map' ? Object.values(r.map.nodes).find((n) => n.kind === node) : null;
    if (!target) return null;
    edit((d) => { d.reachable = [target.id]; });
    return { say: 'jump', node };
  },

  heal(): CheatResult {
    return edit((d) => {
      for (const m of d.box) {
        m.hp = maxHpOf(m, getContent());
        m.status = null;
        m.confusionTurns = 0;
      }
    }) ? { say: 'healed' } : null;
  },

  clearTrauma(): CheatResult {
    return edit((d) => {
      for (const m of d.box) m.traumaStacks = 0;
      for (const m of d.box) if (m.hp > 0) m.hp = maxHpOf(m, getContent());
    }) ? { say: 'trauma' } : null;
  },

  levels(n: number): CheatResult {
    return edit((d) => d.box.forEach((m) => raise(m, n))) ? { say: 'levels', n } : null;
  },

  /** §6.3.1 — queue the Evolution screen for everyone standing at a threshold, handing back to where you are. */
  evolve(): CheatResult {
    const r = run();
    if (!r || (r.phase !== 'map' && r.phase !== 'city')) return null;
    const content = getContent();
    const ready = r.box.filter((m) => isEvolutionReady(m, content) && !r.pendingEvolutions.some((p) => p.uid === m.uid));
    if (!ready.length) return { say: 'nobodyReady' };
    edit((d) => {
      for (const m of ready) {
        d.pendingEvolutions.push({ uid: m.uid, from: m.speciesId, branchIds: content.species(m.speciesId).branches.map((b) => b.id), returnTo: r.phase });
      }
      d.phase = 'evolution';
    });
    return { say: 'evolving', n: ready.length };
  },

  fill(): CheatResult {
    return edit((d) => {
      const pool = ['pidgey', 'rattata', 'oddish', 'zubat', 'geodude', 'poliwag'];
      const level = Math.max(5, ...d.box.map((m) => m.level)) - 2;
      for (const id of pool) {
        if (d.box.length >= 6) break;
        if (d.box.some((m) => m.speciesId === id)) continue;
        d.box.push(newPartyMon(id, level, getContent(), d.seed + d.box.length));
      }
    }) ? { say: 'full' } : null;
  },

  money(n: number): CheatResult {
    return edit((d) => { d.money += n; }) ? { say: 'money', n } : null;
  },

  balls(n: number): CheatResult {
    return edit((d) => { d.balls += n; }) ? { say: 'balls', n } : null;
  },

  relic(): CheatResult {
    const r = run();
    if (!r) return null;
    // Any relic but a Legendary: those are a pick at a Gym, and a cheat that hands them out would skip the choice.
    const left = getContent().allRelics().filter((x) => x.rarity !== 'legendary' && !r.relics.includes(x.id));
    const pick = left[Math.floor(Math.random() * left.length)];
    if (!pick) return { say: 'allRelics' };
    edit((d) => { d.relics.push(pick.id); });
    return { say: 'relic', name: pick.name };
  },

  /** End the fight on screen as a win; its reward screen follows as usual. */
  winFight(): CheatResult {
    const state = useCombatStore.getState().state;
    if (!state || state.outcome !== 'in-progress') return null;
    useCombatStore.setState({
      state: produce(state, (d) => {
        for (const e of d.enemies) e.hp = 0;
        d.outcome = 'victory';
      }),
    });
    return { say: 'won' };
  },
};
