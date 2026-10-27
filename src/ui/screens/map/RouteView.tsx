import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { battlefields, gymById, laneField as laneBattlefield, nodesAhead, type FieldId, type MapNode, type RunState } from '@/sim';
import { IconTag } from '@tabler/icons-react';
import { useSettingsStore } from '@/app/settingsStore';
import { NodeMarker, type NodeStatus } from '@/ui/components/NodeMarker';
import { landmarkName, nodeArt, nodeLabel } from '@/ui/components/nodeArt';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { FIELD_LABEL, ROUTE_TEXT } from '@/ui/strings';
import { fieldTip, mapLabelsTip, noReturnTip } from '@/ui/tips';
import { Tipped, useTip } from '@/ui/tooltip';
import { mapTerrain, COL_TILES } from './terrain';
import { loadPieces, paintTerrain, piecesFor, TILE } from './tileset';
import styles from './RouteView.module.css';

// §9.3 — the route, left to right, wider than the screen: the painted terrain (§2.5.4) on a canvas, the edges drawn
// along its paths, responsive nodes on top and each lane's Battlefield as weather. Dragged, wheeled or keyed;
// the view follows the player. Labels stays in the board's corner; the user removed the miniature route strip.

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

export function RouteView({ run, statusOf, onEnter }: Props) {
  const terrain = useMemo(() => mapTerrain(run.map), [run.map]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const animate = useMotionPref();
  const [scale, setScale] = useState(2);
  // Which terrain the canvas holds: the board says it is painted only once this map's tiles are down.
  const [paintedFor, setPaintedFor] = useState<object | null>(null);
  const painted = paintedFor === terrain;
  // §9.3 — the Labels toggle (the user, 2026-10-20): a name under every node, kept between sessions; L flips it.
  const labels = useSettingsStore((s) => s.mapLabels);
  const labelsTip = useTip(mapLabelsTip(labels));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'l' && e.key !== 'L') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const s = useSettingsStore.getState();
      s.set({ mapLabels: !s.mapLabels });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Paint once per map: load the tiles, then draw the terrain.
  useEffect(() => {
    let live = true;
    void loadPieces(piecesFor(terrain)).then((pieces) => {
      if (!live || !canvas.current) return;
      paintTerrain(canvas.current, terrain, pieces);
      setPaintedFor(terrain);
    });
    return () => {
      live = false;
    };
  }, [terrain]);

  // The board fills the height it is given, never more: nothing scrolls up or down, so a taller board would cut its top
  // row's heads or its bottom row's captions off. The route is as long as it is.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const fit = () => {
      setScale(el.clientHeight / (terrain.h * TILE));
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, [terrain.h, terrain.w]);

  // Native half steps grow the artwork with the route, rather than leaving fixed 32px people on a large board.
  const nodeScale = Math.max(1.5, Math.round(scale * 1.25 * 2) / 2);
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

  // Upper nodes paint last, so a lower sprite's transparent hit box cannot cover their feet or captions.
  const nodes = Object.values(run.map.nodes).sort((a, b) => b.row - a.row);
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
        <div className={styles.board} style={{ width: boardW, height: terrain.h * px, '--node-scale': nodeScale, '--node-label-size': `${Math.min(16, 12 + nodeScale)}px`, '--column-reach': `${Math.floor((COL_TILES * px) / 2) - 8}px`, '--reach': `${(Math.floor((COL_TILES * px) / 2) - 8) / nodeScale}px` } as CSSProperties} data-painted={painted || undefined} data-testid="route-board">
          <canvas ref={canvas} className={styles.terrain} style={{ width: boardW, height: terrain.h * px }} aria-hidden="true" />

          {/* §2.5.4 — each lane's Battlefield, drawn over its stretch as weather (named after the nodes, below). */}
          {terrain.lanes.map((z) => {
            const field = laneField(run, z.lane);
            if (!field) return null;
            const style: CSSProperties = { left: z.x0 * px, top: z.y0 * px, width: (z.x1 - z.x0) * px, height: (z.y1 - z.y0) * px };
            return (
              <div key={z.lane} className={`${styles.weather} ${WEATHER_CLASS[field] ?? ''}`} style={style} />
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
                run={run}
                artScale={nodeScale}
                status={statusOf(node)}
                art={nodeArt(node, run.map)}
                ahead={ahead.has(node.id)}
                caption={labels ? nodeLabel(node, run.map) : (landmarkName(node, run.map) ?? (statusOf(node) === 'reachable' ? nodeLabel(node, run.map) : null))}
                style={{ left: at.x * px, top: at.y * px, '--node-top': `${at.y * px}px` } as CSSProperties}
                onClick={() => onEnter(node.id)}
              />
            );
          })}

          {/* §2.5.4 — each lane named at its mouth, on its top edge: the lower lane's on the split between the rows, never
              at the board's foot, where the bottom row's captions and the Labels toggle hang. Drawn after the nodes and
              above them, so the tag takes the pointer, not the hit box of a node standing behind it (v0.9.69). */}
          {terrain.lanes.map((z) => {
            const field = laneField(run, z.lane);
            if (!field) return null;
            return (
              <Tipped key={z.lane} tip={fieldTip(field)} className={styles.weatherTag} style={{ left: (z.x0 + 4) * px, top: (z.y0 + 0.5) * px }} data-field={field} data-testid="weather-tag">
                {FIELD_LABEL[field]}
              </Tipped>
            );
          })}
        </div>
      </div>

        <button
          type="button"
          className={styles.labelsToggle}
          aria-pressed={labels}
          onClick={() => useSettingsStore.getState().set({ mapLabels: !labels })}
          data-testid="map-labels"
          {...labelsTip}
        >
          <IconTag size={16} stroke={2.4} aria-hidden="true" />
          {ROUTE_TEXT.labels}
        </button>
    </div>
  );
}
