import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { battlefields, gymById, laneField as laneBattlefield, nodesAhead, type FieldId, type MapNode, type RunState } from '@/sim';
import { NodeMarker, type NodeStatus } from '@/ui/components/NodeMarker';
import { landmarkName, nodeArt } from '@/ui/components/nodeArt';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { FIELD_LABEL, ROUTE_TEXT } from '@/ui/strings';
import { fieldTip, noReturnTip, routeStripTip } from '@/ui/tips';
import { Tipped, useTip } from '@/ui/tooltip';
import { mapTerrain } from './terrain';
import { loadPieces, paintStrip, paintTerrain, piecesFor, TILE } from './tileset';
import styles from './RouteView.module.css';

// §9.3 — the route, left to right, wider than the screen: the painted terrain (§2.5.4) on a canvas, the edges drawn
// along its paths, the nodes on top, each lane's Battlefield as weather over it, and a strip under it all with the
// whole route and the window you are looking through. Dragged, wheeled or keyed; the view follows the player.

interface Props {
  run: RunState;
  statusOf: (node: MapNode) => NodeStatus;
  onEnter: (nodeId: string) => void;
}

/** §2.5.4 / §4.3.14 — the field a lane's fights stand on (its Gym's own), for the weather drawn over it. */
function laneField(run: RunState, lane: number): FieldId | null {
  return battlefields(laneBattlefield(run, lane))[0] ?? null;
}

const WEATHER_CLASS: Record<FieldId, string | undefined> = {
  'rain-dance': styles.rain,
  'sunny-day': styles.sun,
  'electric-terrain': styles.spark,
  sandstorm: styles.sand,
  hail: styles.hail,
  'grassy-terrain': styles.grassy,
  'psychic-terrain': styles.psychic,
  'misty-terrain': styles.misty,
  'toxic-spikes': styles.toxic,
  'sticky-web': styles.web,
};

/** §9.3 — an edge's look: the road walked, the steps you can take now, the routes still open, and the rest. */
const EDGE_CLASS = { walked: styles.edgeWalked, live: styles.edgeLive, open: styles.edge, gone: styles.edgeGone } as const;
const STRIP_EDGE_CLASS = { walked: styles.stripWalked, live: styles.stripLive, open: styles.stripOpen, gone: styles.stripGoneLine } as const;
/** The nodes that are a fight, drawn filled on the strip; the stops are rings. */
const FIGHTS = new Set(['wild', 'trainer', 'elite', 'elite-wild']);

export function RouteView({ run, statusOf, onEnter }: Props) {
  const terrain = useMemo(() => mapTerrain(run.map), [run.map]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const animate = useMotionPref();
  const [scale, setScale] = useState(2);
  const [fits, setFits] = useState(false);
  const [view, setView] = useState({ left: 0, width: 1 });
  // Which terrain the canvas holds: the board says it is painted only once this map's tiles are down.
  const [paintedFor, setPaintedFor] = useState<object | null>(null);
  const painted = paintedFor === terrain;
  const stripTip = useTip(routeStripTip());

  // Paint once per map: the tiles are loaded, the terrain drawn, the strip drawn from the same pieces.
  useEffect(() => {
    let live = true;
    void loadPieces(piecesFor(terrain)).then((pieces) => {
      if (!live || !canvas.current) return;
      paintTerrain(canvas.current, terrain, pieces);
      if (strip.current) paintStrip(strip.current, terrain, pieces);
      setPaintedFor(terrain);
    });
    return () => {
      live = false;
    };
  }, [terrain]);

  // The board fills the height it is given; the route is as long as it is.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const root = el.parentElement;
    const fit = () => {
      setScale(Math.max(1, el.clientHeight / (terrain.h * TILE)));
      // §9.3 — the strip is the scroll position; a board that fits its window whole has none to show. Judged at the
      // height the board would have without the strip, so hiding it can never make the board overflow.
      const tall = Math.max(1, (root?.clientHeight ?? el.clientHeight) / (terrain.h * TILE));
      setFits(terrain.w * TILE * tall <= el.clientWidth);
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    if (root) obs.observe(root);
    return () => obs.disconnect();
  }, [terrain.h, terrain.w]);

  const px = TILE * scale;
  const boardW = terrain.w * px;
  const behavior: ScrollBehavior = animate ? 'smooth' : 'auto';

  // §9.3 — the view follows the player: where you stand after every node, the node you are looking at when its
  // preview opens, the route's start before the first step.
  const focusId = run.pendingNodeId ?? run.position ?? null;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const at = focusId ? terrain.at[focusId] : { x: 0, y: 0 };
    const target = (at?.x ?? 0) * px - el.clientWidth * 0.35;
    el.scrollTo({ left: Math.max(0, target), behavior: focusId ? behavior : 'auto' });
  }, [focusId, px, terrain, behavior]);

  // The strip's window follows the scroll.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const sync = () => setView({ left: el.scrollLeft / Math.max(1, boardW), width: el.clientWidth / Math.max(1, boardW) });
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [boardW]);

  // A mouse wheel scrolls the route sideways; dragging the terrain pans it. A press on a node, a weather tag or the
  // river's pill is theirs, not a drag.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    let drag: { x: number; left: number } | null = null;
    const down = (e: PointerEvent) => {
      const host = (e.target as HTMLElement).closest('button, [tabindex]');
      if (host && host !== el) return;
      drag = { x: e.clientX, left: el.scrollLeft };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag) el.scrollLeft = drag.left - (e.clientX - drag.x);
    };
    const up = () => {
      drag = null;
    };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const el = scroller.current;
    if (!el || e.target !== el) return;
    const step = el.clientWidth * 0.6;
    if (e.key === 'ArrowRight') el.scrollBy({ left: step, behavior });
    else if (e.key === 'ArrowLeft') el.scrollBy({ left: -step, behavior });
    else if (e.key === 'Home') el.scrollTo({ left: 0, behavior });
    else if (e.key === 'End') el.scrollTo({ left: boardW, behavior });
    else return;
    e.preventDefault();
  };

  const nodes = Object.values(run.map.nodes);
  // §9.3 — the routes still open from where you stand: drawn in full, everything else faded.
  const ahead = useMemo(() => nodesAhead(run.map, run.position ?? null), [run.map, run.position]);
  const edges = nodes.flatMap((n) =>
    n.next.map((id) => {
      const walked = run.visited.includes(n.id) && (run.visited.includes(id) || run.position === id);
      const live = run.phase === 'map' && run.position === n.id && run.reachable.includes(id);
      const open = ahead.has(id) && (ahead.has(n.id) || n.id === run.position);
      return {
        key: `${n.id}>${id}`,
        points: (terrain.edges[`${n.id}>${id}`] ?? []).map((p) => `${p.x},${p.y}`).join(' '),
        state: walked ? 'walked' : live ? 'live' : open ? 'open' : 'gone',
      } as const;
    }),
  );
  const gymNames = run.map.gyms.map((id) => gymById(id).name.replace(/^Leader /, ''));

  return (
    <div className={styles.root}>
      <div ref={scroller} className={styles.scroller} tabIndex={0} onKeyDown={onKey} aria-label={ROUTE_TEXT.scroller} data-testid="route-scroller">
        <div className={styles.board} style={{ width: boardW, height: terrain.h * px }} data-painted={painted || undefined} data-testid="route-board">
          <canvas ref={canvas} className={styles.terrain} style={{ width: boardW, height: terrain.h * px }} aria-hidden="true" />

          {/* §2.5.4 — each lane's Battlefield, drawn over its stretch as weather, and named at the lane's mouth. */}
          {terrain.lanes.map((z) => {
            const field = laneField(run, z.lane);
            if (!field) return null;
            const style: CSSProperties = { left: z.x0 * px, top: z.y0 * px, width: (z.x1 - z.x0) * px, height: (z.y1 - z.y0) * px };
            return (
              <div key={z.lane} className={`${styles.weather} ${WEATHER_CLASS[field] ?? ''}`} style={style} data-field={field}>
                <Tipped tip={fieldTip(field)} className={styles.weatherTag} style={{ left: px * 4, [z.lane === 0 ? 'top' : 'bottom']: px * 1.5 }}>
                  {FIELD_LABEL[field]}
                </Tipped>
              </div>
            );
          })}

          <svg className={styles.edges} viewBox={`0 0 ${terrain.w} ${terrain.h}`} preserveAspectRatio="none" aria-hidden="true">
            {edges.map((e) => (
              <polyline key={e.key} points={e.points} className={EDGE_CLASS[e.state]} vectorEffect="non-scaling-stroke" data-edge={e.state} />
            ))}
          </svg>

          {terrain.river && (
            <Tipped tip={noReturnTip(gymNames)} className={styles.noReturn} style={{ left: ((terrain.river.x0 + terrain.river.x1) / 2) * px, top: px * 0.5 }} data-testid="no-return">
              {ROUTE_TEXT.noReturn}
            </Tipped>
          )}

          {nodes.map((node) => {
            const at = terrain.at[node.id]!;
            return (
              <NodeMarker
                key={node.id}
                node={node}
                status={statusOf(node)}
                art={nodeArt(node, run.map)}
                ahead={ahead.has(node.id)}
                caption={landmarkName(node, run.map)}
                style={{ left: at.x * px, top: at.y * px }}
                onClick={() => onEnter(node.id)}
              />
            );
          })}
        </div>
      </div>

      {/* §9.3 — the whole route in a strip, the window you are looking through outlined; a click jumps there. */}
      <div
        className={`${styles.strip} ${fits ? styles.stripHidden : ''}`}
        onClick={(e) => {
          const el = scroller.current;
          if (!el) return;
          const r = e.currentTarget.getBoundingClientRect();
          const t = (e.clientX - r.left) / r.width;
          el.scrollTo({ left: t * boardW - el.clientWidth / 2, behavior });
        }}
        {...stripTip}
        data-testid="route-strip"
      >
        <canvas ref={strip} className={styles.stripArt} aria-hidden="true" />
        {/* §9.3 — the routes and every node on them, in miniature: a fight a filled dot, a stop a ring; the road behind
            you dark, the routes you can no longer take faded — the whole Region's choice at a glance. */}
        <svg className={styles.stripLines} viewBox={`0 0 ${terrain.w} ${terrain.h}`} preserveAspectRatio="none" aria-hidden="true">
          {edges.map((e) => (
            <polyline key={e.key} points={e.points} className={STRIP_EDGE_CLASS[e.state]} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {nodes
          .filter((n) => n.kind !== 'gym')
          .map((n) => (
            <span
              key={n.id}
              className={[styles.stripNode, FIGHTS.has(n.kind) ? styles.stripFight : styles.stripStop, run.visited.includes(n.id) ? styles.stripDone : !ahead.has(n.id) && n.id !== run.position ? styles.stripGone : ''].join(' ')}
              style={{ left: `${(terrain.at[n.id]!.x / terrain.w) * 100}%`, top: `${(terrain.at[n.id]!.y / terrain.h) * 100}%` }}
              data-strip-kind={n.kind}
            />
          ))}
        <span className={styles.window} style={{ left: `${view.left * 100}%`, width: `${Math.min(1, view.width) * 100}%` }} />
        {nodes
          .filter((n) => n.id === run.position || n.kind === 'gym')
          .map((n) => (
            <span
              key={n.id}
              className={n.kind === 'gym' ? styles.stripGym : styles.stripYou}
              style={{
                left: `${(terrain.at[n.id]!.x / terrain.w) * 100}%`,
                top: `${(terrain.at[n.id]!.y / terrain.h) * 100}%`,
                ...(n.kind === 'gym' ? { background: `var(--type-${gymById(run.map.gyms[n.lane ?? 0]!).type})` } : {}),
              }}
            />
          ))}
      </div>
    </div>
  );
}
