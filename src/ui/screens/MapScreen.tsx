import { useEffect, useState } from 'react';
import { IconMenu2, IconBackpack, IconSparkles } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { ballsIn, boxCapacity, gymById, isServiceNode, noReturnLayer, regionName, supplyLabel, type MapNode, type PartyMon } from '@/sim';
import { BoxPanel } from '@/ui/components/BoxPanel';
import { InventoryDrawer } from '@/ui/components/InventoryDrawer';
import { Money } from '@/ui/components/Money';
import { MoveManager } from '@/ui/components/MoveManager';
import type { NodeStatus } from '@/ui/components/NodeMarker';
import { NodePreviewCard } from '@/ui/components/NodePreviewCard';
import { PauseMenu } from '@/ui/components/PauseMenu';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { itemIcon, tmIcon } from '@/ui/art';
import { ROUTE_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { bagTip, ballsTip, forkFooter, moneyTip, regionTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped, useTip } from '@/ui/tooltip';
import { RouteView } from './map/RouteView';
import styles from './MapScreen.module.css';

// Per docs/design/ui/screens.md §2.2 — the Region map. The left column is the Active Team and the Box (§2.3,
// the only place the loadout changes); the right is the route, left to right over its painted terrain (§9.3,
// `map/RouteView.tsx`). Every rule belongs to the run reducer; this screen dispatches and draws.

export function MapScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const run = useRunStore((s) => s.run);
  const rawDispatch = useRunStore((s) => s.dispatch);
  const rawBeginCombat = useRunStore((s) => s.beginCombat);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** §6.7.2 — which Pokémon the Move Manager is open on, if any. */
  const [managing, setManaging] = useState<string | null>(null);
  /** §7.2–§7.5 — the inventory drawer: relics, held items, the bag. The only place a Held Item moves. */
  const [inventory, setInventory] = useState(false);
  const bagBubble = useTip(bagTip());
  /** §2.9.5 — the find the pill has already said, so it is said once. */
  const [dismissedFind, setDismissedFind] = useState<object | null>(null);
  const lastFind = run?.lastFind ?? null;
  useEffect(() => {
    if (!lastFind) return;
    const t = window.setTimeout(() => setDismissedFind(lastFind), 3200);
    return () => window.clearTimeout(t);
  }, [lastFind]);

  const phase = run?.phase;
  const outcome = run?.outcome;

  /** The run reducer never throws on an illegal click; it explains itself, and the map says so. */
  function say(reason: string | undefined) {
    setToast(RUN_REJECT_TEXT[reason ?? ''] ?? 'Not now.');
    window.setTimeout(() => setToast(null), 2600);
  }
  function dispatch(action: Parameters<typeof rawDispatch>[0]): boolean {
    const ok = rawDispatch(action);
    if (!ok) say(useRunStore.getState().lastRejected?.reason);
    return ok;
  }
  function beginCombat(): boolean {
    const ok = rawBeginCombat();
    if (!ok) say(useRunStore.getState().lastRejected?.reason);
    return ok;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape closes the innermost open thing first, then toggles the menu (§9.6, shared overlay chrome).
      if (useRunStore.getState().run && document.querySelector('[data-testid="inventory-drawer"]')) {
        setInventory(false);
        return;
      }
      setManaging((open) => {
        if (open) return null;
        if (phase === 'map') setPaused((p) => !p);
        return open;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // Follow the run's own phase: the reducer decides where the player is, the router just keeps up.
  useEffect(() => {
    if (phase === 'combat') goTo('combat');
    if (phase === 'ended') goTo(outcome === 'victory' ? 'victory' : 'defeat');
  }, [phase, outcome, goTo]);

  if (!run) {
    return (
      <main className={styles.empty} data-testid="map-screen">
        <div className={styles.emptyCard}>
          <h1 className="display">No run in progress</h1>
          <p>Start a new one from the main menu.</p>
          <button type="button" className={styles.menuBtn} onClick={() => goTo('menu')}>
            Main menu
          </button>
        </div>
      </main>
    );
  }

  const locked = run.phase !== 'map';
  const active = run.activeUids.map((uid) => run.box.find((m) => m.uid === uid)).filter((m): m is PartyMon => !!m);
  const pending = run.pendingNodeId ? run.map.nodes[run.pendingNodeId]! : null;
  const healthy = active.some((m) => m.hp > 0);
  const standingLayer = run.position ? run.map.nodes[run.position]!.layer : -1;
  // §2.9.5 — what the last find on the ground held, said once as you walk on.
  const foundShown = run.lastFind && run.lastFind !== dismissedFind && run.phase === 'map' ? [...(run.lastFind.items.length ? [supplyLabel(run.lastFind.items, (id) => getContent().consumable(id).name)] : []), ...(run.lastFind.money ? [`${run.lastFind.money} ₽`] : [])].join(' and ') : null;
  // §2.5 — once you step past the fork you are in a lane, and the other Gym is gone for this Region. The
  // banner stops offering a choice the moment the choice is made.
  const committedLane = run.position ? (run.map.nodes[run.position]!.lane ?? null) : null;

  const statusOf = (node: MapNode): NodeStatus => {
    if (node.id === run.position) return 'current';
    if (run.visited.includes(node.id)) return 'visited';
    if (run.reachable.includes(node.id) && run.phase === 'map') return 'reachable';
    return 'locked';
  };

  const toggleActive = (uid: string) => {
    const on = run.activeUids.includes(uid);
    const next = on ? run.activeUids.filter((u) => u !== uid) : [...run.activeUids, uid].slice(-3);
    dispatch({ type: 'set-active', uids: next });
  };

  return (
    <main className={`${styles.root} theme-stage`} data-testid="map-screen">
      <header className={styles.topBar}>
        <div>
          <div className={styles.regionRow}>
            <h1 className={`${styles.regionName} display`}>Region {run.regionIndex + 1}</h1>
            <InfoDot tip={regionTip(run.regionIndex, run.modifiers.includes('greater-threats'))} />
          </div>
          <p className={styles.progress}>
            {regionName(run.regionIndex) ? `${regionName(run.regionIndex)} · ` : ''}
            {'Column '}<b className="tabular">{Math.min(standingLayer + 2, run.map.layers)}</b> of <b className="tabular">{run.map.layers}</b>
            {' · seed '}
            <span className="tabular">{run.seed}</span>
          </p>
        </div>

        {/* §2.5 — both Gyms, named from the first column. Pillar 1 telegraphs every intent inside a fight; the
            Region's two possible climaxes are the largest thing it can telegraph, and they decide what you recruit
            in the trunk and which side of the Y you lean to. The banner stops offering both past the river. */}
        <div className={styles.fork} data-testid="fork-banner">
          <span className={styles.forkLabel}>{committedLane === null ? 'This route ends at one of' : 'You committed to'}</span>
          <span className={styles.forkGyms}>
            {run.map.gyms.map((id, lane) => {
              const gym = gymById(id);
              const shut = committedLane !== null && committedLane !== lane;
              return (
                <Tipped
                  key={id}
                  tip={<Tip title={gym.name} meta={[`${gym.type.charAt(0).toUpperCase() + gym.type.slice(1)} Gym`, shut ? 'Not on your lane' : 'One of two endings']} body={shut ? `${gym.name} is on the lane you did not take.` : gym.telegraph} footer={shut ? undefined : forkFooter((run.map.yLayer ?? run.map.forkLayer) + 1, noReturnLayer(run.map) + 1)} />}
                  className={`${styles.forkGym} ${shut ? styles.forkShut : ''}`}
                  data-type={gym.type}
                  data-lane={lane}
                >
                  <TypeBadge type={gym.type} size={12} />
                  {gym.name.replace(/^Leader /, '')}
                </Tipped>
              );
            })}
          </span>
        </div>
        <div className={styles.purse}>
          {/* §2.14 — the wallet is on the map because the map is where you decide whether the merchant
              is worth the fight it costs. Deciding that without knowing the balance is not a decision. */}
          <Tipped tip={moneyTip(run.money)} className={styles.stat} data-testid="map-money">
            <Money amount={run.money} size={20} />
          </Tipped>
          <Tipped tip={ballsTip(ballsIn(run.consumables, getContent()))} className={styles.stat}>
            <img src={itemIcon('poke-ball')} alt="" width={22} height={22} />
            <b className="tabular">{ballsIn(run.consumables, getContent())}</b>
          </Tipped>
          {run.relics.length > 0 && (
            <Tipped
              tip={<Tip title={`${run.relics.length} relic${run.relics.length === 1 ? '' : 's'}`} body={run.relics.map((r) => getContent().relic(r).name).join(' · ')} footer="Run-long passives. Open the bag to read each one." />}
              className={styles.stat}
              data-testid="relic-count"
            >
              <IconSparkles size={20} />
              <b className="tabular">{run.relics.length}</b>
            </Tipped>
          )}
          {run.tms.length > 0 && (
            <Tipped tip={<Tip title={`${run.tms.length} TM${run.tms.length === 1 ? '' : 's'} to teach`} body={run.tms.map((t) => getContent().tm(t).name).join(' · ')} footer="Teach one from a Pokémon's card in the Box panel. Single use." />} className={styles.stat} data-testid="tm-count">
              <img src={tmIcon(run.tms[0]!)} alt="" width={22} height={22} />
              <b className="tabular">{run.tms.length}</b>
            </Tipped>
          )}
          <button
            type="button"
            className={styles.bagBtn}
            onClick={() => setInventory(true)}
            data-testid="btn-inventory"
            aria-label="Bag: relics, held items and consumables"
            {...bagBubble}
          >
            <IconBackpack size={18} />
            <b className="tabular">{run.consumables.length + run.bag.length}</b>
          </button>
        </div>
        <button type="button" className={styles.menuBtn} onClick={() => setPaused(true)} data-testid="btn-pause">
          <IconMenu2 size={18} /> Menu
        </button>
      </header>

      {/* §9.6 — the map narrates its own state: where you are, and what that opened up. */}
      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')} {run.reachable.length} route{run.reachable.length === 1 ? '' : 's'} open.
      </p>

      <div className={styles.body}>
        <aside className={styles.side} aria-label="Active Team and Box">
          <BoxPanel
            box={run.box}
            activeUids={run.activeUids}
            capacity={boxCapacity(run)}
            onToggleActive={locked ? null : toggleActive}
            onSetLead={locked ? null : (uid) => dispatch({ type: 'set-lead', uid })}
            onOpenMoves={setManaging}
            stones={run.stones}
            restingUid={run.resting}
          />
        </aside>

        <section className={styles.graph} data-testid="map-graph" aria-label={`Region ${run.regionIndex + 1} route map, ${run.map.layers} columns`}>
          <RouteView run={run} statusOf={statusOf} onEnter={(nodeId) => dispatch({ type: 'enter-node', nodeId })} />
          <p className="sr-only">
            {run.position ? 'Choose where to go next.' : 'Pick where the route begins.'} Press Escape for the menu. Tab moves between the nodes you can reach.
          </p>
          {/* §2.9.5 — what a find on the ground held: said once, on the board, then gone. */}
          {foundShown && (
            <p className={styles.found} role="status" data-testid="map-found">
              {ROUTE_TEXT.found(foundShown)}
            </p>
          )}
        </section>
      </div>

      {pending && run.phase === 'preview' && (
        <NodePreviewCard
          node={pending}
          active={active}
          canEnter={isServiceNode(pending.kind) || healthy}
          blockedReason={!isServiceNode(pending.kind) && !healthy ? RUN_REJECT_TEXT['no-healthy-pokemon']! : null}
          onEnter={() => beginCombat()}
          onCancel={() => dispatch({ type: 'cancel-preview' })}
        />
      )}

      {managing && <MoveManager uid={managing} onClose={() => setManaging(null)} />}
      {inventory && <InventoryDrawer onClose={() => setInventory(false)} />}

      {paused && <PauseMenu onResume={() => setPaused(false)} />}

      {toast && (
        <p className={styles.toast} role="status" data-testid="map-toast">
          {toast}
        </p>
      )}
    </main>
  );
}
