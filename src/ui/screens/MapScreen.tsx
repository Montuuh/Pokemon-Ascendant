import { useEffect, useMemo, useState } from 'react';
import { IconMenu2, IconBackpack, IconSparkles } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { regionPlate } from '@/ui/art';
import { getContent } from '@/content/registry';
import { LAYERS, boxCapacity, gymById, isServiceNode, nodesInLayer, regionName, type MapNode, type PartyMon } from '@/sim';
import { BoxPanel } from '@/ui/components/BoxPanel';
import { InventoryDrawer } from '@/ui/components/InventoryDrawer';
import { Money } from '@/ui/components/Money';
import { MoveManager } from '@/ui/components/MoveManager';
import { NodeMarker, type NodeStatus } from '@/ui/components/NodeMarker';
import { NodePreviewCard } from '@/ui/components/NodePreviewCard';
import { PauseMenu } from '@/ui/components/PauseMenu';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { itemIcon, tmIcon } from '@/ui/art';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import { bagTip, ballsTip, moneyTip, regionTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped, useTip } from '@/ui/tooltip';
import styles from './MapScreen.module.css';

// Per docs/design/ui/screens.md §2.2 — the Region map. The left column is the Active Team and the Box (§2.3,
// the only place the loadout changes); the right is the layered node graph over the route plate. Every rule
// belongs to the run reducer; this screen dispatches and draws.

/**
 * Layer 0 sits at the bottom and the Gyms at the top, so the route reads as a climb.
 *
 * §2.5 — past the fork the two lanes are pushed apart into the outer thirds of the board, with a visible gap
 * down the middle. A lane that merely happens to occupy the left columns reads as "the same map, wider"; a
 * lane with a gutter beside it reads as *a fork*, which is what it is. The split is the single most important
 * thing this screen has to say, and geometry says it better than a label.
 */
function positionOf(node: MapNode, width: number): { left: string; top: string } {
  const top = ((LAYERS - 1 - node.layer) / (LAYERS - 1)) * 82 + 7;
  if (node.lane === undefined) return { left: `${((node.col + 1) / (width + 1)) * 100}%`, top: `${top}%` };

  // Inside a lane: spread that lane's own columns across its half, minus a gutter in the middle.
  const perLane = Math.max(1, Math.ceil(width / 2));
  const within = node.col % perLane;
  const spread = node.layer === LAYERS - 1 ? 0 : ((within + 1) / (perLane + 1) - 0.5) * 30;
  const centre = node.lane === 0 ? 24 : 76;
  return { left: `${centre + spread}%`, top: `${top}%` };
}

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

  const layers = useMemo(
    () => (run ? Array.from({ length: LAYERS }, (_, i) => nodesInLayer(run.map, i)) : []),
    [run],
  );

  const edges = useMemo(() => {
    if (!run) return [];
    return Object.values(run.map.nodes).flatMap((n) =>
      n.next.map((id) => {
        const to = run.map.nodes[id]!;
        const a = positionOf(n, layers[n.layer]!.length);
        const b = positionOf(to, layers[to.layer]!.length);
        return {
          key: `${n.id}-${id}`,
          x1: parseFloat(a.left),
          y1: parseFloat(a.top),
          x2: parseFloat(b.left),
          y2: parseFloat(b.top),
          walked: run.visited.includes(n.id) && (run.visited.includes(id) || run.position === id),
          live: run.position === n.id || (run.position === null && n.layer === 0),
        };
      }),
    );
  }, [run, layers]);

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
            {'Layer '}<b className="tabular">{Math.min(standingLayer + 2, LAYERS)}</b> of <b className="tabular">{LAYERS}</b>
            {' · seed '}
            <span className="tabular">{run.seed}</span>
          </p>
        </div>

        {/* §2.5 — the fork, named from layer 0. Pillar 1 telegraphs every intent inside a fight; the Region's
            two possible climaxes are the largest thing it can telegraph, and they decide what you recruit for
            ten nodes before you get there. Which one is still yours to choose, and the map shows both. */}
        <div className={styles.fork} data-testid="fork-banner">
          <span className={styles.forkLabel}>{committedLane === null ? 'This route ends at one of' : 'You committed to'}</span>
          <span className={styles.forkGyms}>
            {run.map.gyms.map((id, lane) => {
              const gym = gymById(id);
              const shut = committedLane !== null && committedLane !== lane;
              return (
                <Tipped
                  key={id}
                  tip={<Tip title={gym.name} meta={[`${gym.type.charAt(0).toUpperCase() + gym.type.slice(1)} Gym`, shut ? 'Not on your lane' : 'One of two endings']} body={shut ? `${gym.name} is on the lane you did not take.` : gym.telegraph} footer={shut ? undefined : 'Two of the four Gyms are drawn each run. The path forks at layer 8 and the lanes never rejoin.'} />}
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
          <Tipped tip={ballsTip(run.balls)} className={styles.stat}>
            <img src={itemIcon('poke-ball')} alt="" width={22} height={22} />
            <b className="tabular">{run.balls}</b>
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
          />
        </aside>

        <section className={styles.graph} data-testid="map-graph" aria-label={`Region ${run.regionIndex + 1} route map, ${LAYERS} layers`}>
          <img className={styles.backdrop} src={regionPlate(run.regionIndex + 1)} alt="" aria-hidden="true" />
          <div className={styles.veil} aria-hidden="true" />
          <svg className={styles.edgeLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {edges.map((e) => (
              <line
                key={e.key}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                className={e.walked ? styles.edgeWalked : e.live ? styles.edgeLive : styles.edge}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {layers.map((row) =>
            row.map((node) => (
              <NodeMarker
                key={node.id}
                node={node}
                status={statusOf(node)}
                style={positionOf(node, row.length)}
                onClick={() => dispatch({ type: 'enter-node', nodeId: node.id })}
              />
            )),
          )}
          <p className={styles.legend}>{run.position ? 'Choose where to go next.' : 'Pick where the route begins.'}</p>
          <p className="sr-only">Press Escape for the menu. Tab moves between the nodes you can reach.</p>
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
