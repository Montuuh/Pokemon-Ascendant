import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { battlefields, gymById, laneField as laneBattlefield, nodesAhead, partyClears, stepOpen, wildFor, type FieldId, type HabitatSection, type GateKind, type MapNode, type RunState } from '@/sim';
import { getContent } from '@/content/registry';
import { IconMap2, IconTag } from '@tabler/icons-react';
import { useSettingsStore } from '@/app/settingsStore';
import { HabitatLegend } from '@/ui/components/HabitatLegend';
import { NodeMarker, type NodeStatus } from '@/ui/components/NodeMarker';
import { landmarkName, nodeArt, nodeLabel } from '@/ui/components/nodeArt';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { FIELD_LABEL, GATE_TEXT, ROUTE_TEXT } from '@/ui/strings';
import { gateTip, ledgeTip, mapHabitatsTip, mapLabelsTip } from '@/ui/tips';
import { Tipped, useTip } from '@/ui/tooltip';
import { asset } from '@/content/paths';
import { BUILDINGS, COL_TILES, mapTerrain, naturalHeight, type MapTerrain } from './terrain';
import { loadPieces, paintTerrain, piecesFor, TILE } from './tileset';
import styles from './RouteView.module.css';

// §9.3 — the route, left to right, wider than the screen: the painted terrain (§2.5.4) on a canvas, the edges drawn
// along its paths, the Gym's building and the field moves' obstacles over them, the nodes on top, and each Gym's
// Battlefield as weather over its ground. Dragged, wheeled or keyed; the view follows the player; Labels stays in the
// board's corner. The ground has one pixel density (v0.9.107): the largest half step at which the route fits the height,
// three at most; its people stand a third larger (v0.9.109).

interface Props {
  run: RunState;
  statusOf: (node: MapNode) => NodeStatus;
  onEnter: (nodeId: string) => void;
  /** §2.6.1 — the Wild Areas ahead by stretch and habitat (`routeHabitats`), computed once by the screen. */
  habitats: HabitatSection[];
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

/**
 * §2.5.4 (v0.9.107) — the fields FireRed itself draws as weather wear its own sprites (`scripts/build-route-weather.mjs`): rain,
 * the sandstorm, snow for hail, and its fog — white for Misty Terrain, the field's colour for the Psychic Terrain and the
 * Toxic Spikes' miasma. Repeated at the terrain's pixel scale, so a raindrop's pixel is a tile's pixel.
 */
const WEATHER_IMG: Partial<Record<FieldId, string>> = {
  'rain-dance': 'rain',
  sandstorm: 'sand',
  hail: 'snow',
  'misty-terrain': 'fog-misty',
  'psychic-terrain': 'fog-psychic',
  'toxic-spikes': 'fog-toxic',
};

/**
 * §9.3 — the densest the route is drawn: at three a column is 288 px, and about five and a half of them fit a 1080 p
 * screen — the next stop, the one after and the Y behind them. Past it the board shows less road, not more of it.
 */
const MAX_DENSITY = 3;

/** §9.3 — where in the window the view puts the node it follows, as a share of its width from the left. */
const FOCUS_AT = 0.35;

/**
 * §9.3 (v0.9.109) — the route's people stand a third larger than the tiles: the largest half step of their pixel at most
 * four thirds of the density (2.5 at 720 p, 4 at 1080 p). At the tiles' own they read small on a board the height of the
 * screen (the user, 2026-11-10: "los veo pequeños"); at four thirds a figure and the caption of the node two rows above
 * still fit the four tiles between two tracks.
 */
const personScale = (density: number) => Math.max(density, Math.floor(((density * 4) / 3) * 2) / 2);

/**
 * §2.5.4 (v0.9.108) — where a Gym's field is drawn: every tile of its ground (`TerrainCell.s`) — its lane, and its leaning
 * track's blend over the Y — not a rectangle at the lanes (the user, 2026-11-09). A mask one pixel a tile, stretched at
 * the board's pixel, so the field's edge is a tile's edge. The layer is sized to its own ground, never the board: a field
 * drawn from one side of its box (the sun from the top, the grass from the bottom) would all but vanish in a lane at the
 * other (the UI review). Null for a side with no ground (Victory Road).
 */
function fieldMask(terrain: MapTerrain, side: number): { x0: number; x1: number; y0: number; y1: number; url: string } | null {
  if (typeof document === 'undefined') return null;
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  terrain.cells.forEach((row, y) => row.forEach((c, x) => {
    if (c.s === side) [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x + 1), Math.min(y0, y), Math.max(y1, y + 1)];
  }));
  if (x1 < x0) return null;
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [x1 - x0, y1 - y0];
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (terrain.cells[y]![x]!.s === side) img.data[((y - y0) * canvas.width + x - x0) * 4 + 3] = 255;
  ctx.putImageData(img, 0, 0);
  return { x0, x1, y0, y1, url: canvas.toDataURL() };
}

/** §9.3 — an edge's look: the road walked, the steps you can take now, the routes still open, and the rest. */
const EDGE_CLASS = { walked: styles.edgeWalked, live: styles.edgeLive, open: styles.edge, gone: styles.edgeGone } as const;

export function RouteView({ run, statusOf, onEnter, habitats }: Props) {
  const content = getContent();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const animate = useMotionPref();
  // §9.3 (v0.9.107) — one pixel density for the ground: the largest half step at which the route's natural height fits
  // the board, three at most (2 at 720 p, 3 at 1080 p); the rows left over go to the route's own frame, never to an empty
  // band. People are drawn at `personScale` of it.
  const [boxH, setBoxH] = useState(0);
  const scale = boxH ? Math.min(MAX_DENSITY, Math.max(1, Math.floor((boxH / (naturalHeight(run.map) * TILE)) * 2) / 2)) : 2;
  // A whole tile over the box rather than a band of backdrop under the board (v0.9.108: at 720 p a tile is 32 px). The board
  // crops itself to the box (`viewH`), so what is cut is the bottom of the frame's last row, never a node or its caption,
  // and nothing hides on the axis the route does not scroll.
  const tall = boxH ? Math.ceil(boxH / (TILE * scale)) : 0;
  const terrain = useMemo(() => mapTerrain(run.map, tall), [run.map, tall]);
  const masks = useMemo(() => [0, 1].map((side) => fieldMask(terrain, side)), [terrain]);
  // Which terrain the canvas holds: the board says it is painted only once this map's tiles are down.
  const [paintedFor, setPaintedFor] = useState<object | null>(null);
  const painted = paintedFor === terrain;
  // §9.3 — the Labels toggle (the user, 2026-10-20): a name under every node, kept between sessions; L flips it.
  const labels = useSettingsStore((s) => s.mapLabels);
  const labelsTip = useTip(mapLabelsTip(labels));
  // §2.6.1 — the habitat legend (H): opened by the player, never drawn on the route; the nodes it points at are marked.
  const [legend, setLegend] = useState(false);
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set());
  const habitatsTip = useTip(mapHabitatsTip(legend));
  const habitatsBtn = useRef<HTMLButtonElement>(null);
  const legendEl = useRef<HTMLElement>(null);
  const zoned = !!run.zone;
  const toggleLegend = () => {
    setLegend((on) => !on);
    setMarked(new Set());
  };
  // Escape closes the legend first; only with it shut does the key reach the pause menu (the screen's own listener, which
  // this one, on the capture phase, stops).
  useEffect(() => {
    if (!legend) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      // The row that held focus unmounts with the panel: focus goes back to the button that opened it.
      if (legendEl.current?.contains(document.activeElement)) habitatsBtn.current?.focus();
      setLegend(false);
      setMarked(new Set());
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [legend]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((key !== 'l' && key !== 'h') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (key === 'h') {
        if (!zoned) {
          setLegend((on) => !on);
          setMarked(new Set());
        }
        return;
      }
      const s = useSettingsStore.getState();
      s.set({ mapLabels: !s.mapLabels });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoned]);

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
    const fit = () => setBoxH(el.clientHeight);
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // The node art's CSS is written at twice its native size; half the density draws it at the tiles' own pixel (a person's
  // then `--person-k` larger).
  const nodeScale = scale / 2;
  const px = TILE * scale;
  const boardW = terrain.w * px;
  const viewH = boxH ? Math.min(terrain.h * px, boxH) : terrain.h * px;
  const behavior: ScrollBehavior = animate ? 'smooth' : 'auto';

  // §2.5.4 — each lane's tag is a label at its mouth: on its lane's top edge, or else its bottom one, a few steps along
  // to clear the art and the captions there (on a lane with no clear spot, the one covering the least of heads and words). It takes no pointer (the field's explanation is a chip in the preview of every node of the
  // lane), so it can never cost a node its click — the nodes stand so close at 720 p that no spot is free of them all
  // (v0.9.72). It walks at most two columns, never into the Gym's, and reckons every node's caption whether Labels shows
  // it or not, so a toggle never moves it. Measured after layout, in half tiles; the effect owns its `left` and `top`.
  const board = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = board.current;
    if (!el) return;
    const nodes = [...el.querySelectorAll('[data-testid^="node-"][data-kind]')].map((b) => b.getBoundingClientRect());
    // A node's caption, where it hangs when Labels shows it: under its box, about a column wide.
    const reach = COL_TILES * px * 0.5;
    const captions = [
      ...nodes.map((b) => ({ left: (b.left + b.right) / 2 - reach, right: (b.left + b.right) / 2 + reach, top: b.bottom, bottom: b.bottom + px * 1.75 })),
      ...[...el.querySelectorAll('[data-testid^="node-"][data-kind] [data-chip]')].map((b) => b.getBoundingClientRect()),
    ];
    const gymX = (lane: number) => Math.min(...Object.values(run.map.nodes).filter((n) => n.kind === 'gym' && n.lane === lane).map((n) => terrain.at[n.id]!.x));
    // A person's head is the top of its box: covering it is worse than covering the ground at its feet.
    const heads = nodes.map((b) => ({ left: b.left, right: b.right, top: b.top, bottom: b.top + (b.bottom - b.top) * 0.6 }));
    const boardTop = el.getBoundingClientRect().top;
    for (const tag of el.querySelectorAll<HTMLElement>('[data-testid="weather-tag"]')) {
      const lane = Number(tag.dataset.lane);
      const zone = terrain.lanes.find((l) => l.lane === lane);
      if (!zone) continue;
      // From its mouth on its top edge, measured where it is drawn there.
      tag.style.left = `${(zone.x0 + 4) * px}px`;
      tag.style.top = `${(zone.y0 + 0.5) * px}px`;
      const box = tag.getBoundingClientRect();
      // The bottom edge the board shows, not the frame row it crops.
      const edges = [(zone.y0 + 0.5) * px, Math.min(zone.y1 * px, viewH) - 0.5 * px - box.height];
      const area = (b: { left: number; right: number; top: number; bottom: number }, step: number, top: number) => {
        const l = box.left + step * px, y = boardTop + top;
        return Math.max(0, Math.min(b.right, l + box.width) - Math.max(b.left, l)) * Math.max(0, Math.min(b.bottom, y + box.height) - Math.max(b.top, y));
      };
      // Two columns at most, and its right edge short of the Gym's column by half a column.
      const last = Math.min(2 * COL_TILES, gymX(lane) - COL_TILES / 2 - (zone.x0 + 4) - box.width / px);
      const spots: { step: number; top: number; cost: number }[] = [];
      for (const top of edges) {
        // From the lane's own edge where its ridge begins (its mouth sits four tiles in), never back out of it.
        for (let step = -3.5; step <= last; step += 0.5) {
          const blocked = [...nodes, ...captions].reduce((n, b) => n + area(b, step, top), 0);
          // Clear of everything wins at once; otherwise the least of heads and words covered.
          // A covered word cannot be read; a covered head is often its transparent margin — words weigh four times.
          const cost = blocked === 0 ? 0 : 1 + heads.reduce((n, b) => n + area(b, step, top), 0) + 4 * captions.reduce((n, b) => n + area(b, step, top), 0);
          spots.push({ step, top, cost });
        }
      }
      // …and never a node's face or body (its point) while a spot that spares them all is left: a tag across a figure
      // reads as that node's name.
      const faces = nodes.flatMap((b) => [0.35, 0.6].map((k) => ({ x: (b.left + b.right) / 2, y: b.top + (b.bottom - b.top) * k })));
      const spares = (s: { step: number; top: number }) => !faces.some((p) => p.x > box.left + s.step * px - 4 && p.x < box.left + s.step * px + box.width + 4 && p.y > boardTop + s.top - 4 && p.y < boardTop + s.top + box.height + 4);
      const cheapest = (list: typeof spots) => list.reduce((a, b) => (b.cost < a.cost ? b : a), list[0]!);
      const sparing = spots.filter(spares);
      const best = spots.find((s) => s.cost === 0) ?? (sparing.length ? cheapest(sparing) : cheapest(spots));
      if (best) {
        tag.style.left = `${(zone.x0 + 4 + best.step) * px}px`;
        tag.style.top = `${best.top}px`;
      }
    }
  }, [px, terrain, run.map, viewH]);

  // §9.3 — the view follows the player: where you stand after every node, the node you are looking at when its
  // preview opens, the route's start before the first step.
  const focusId = run.pendingNodeId ?? run.position ?? null;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const at = focusId ? terrain.at[focusId] : { x: 0, y: 0 };
    const target = (at?.x ?? 0) * px - el.clientWidth * FOCUS_AT;
    el.scrollTo({ left: Math.max(0, target), behavior: focusId ? behavior : 'auto' });
  }, [focusId, px, terrain, behavior]);

  // A mouse wheel scrolls the route sideways; dragging the terrain pans it. A press on a node is its own, not a drag (a lane's tag takes no pointer: a press there is the node's under it, or the terrain's).
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
      // §2.5.5 — a step an obstacle closes is no step to take while the Box cannot clear it.
      const live = run.phase === 'map' && run.position === n.id && run.reachable.includes(id) && stepOpen(run, id, content);
      const open = ahead.has(id) && (ahead.has(n.id) || n.id === run.position);
      // §2.5 / §9.3 (v0.9.107) — a step from the shared tracks into a lane is the commitment: it wears its Gym's colour.
      const into = run.map.nodes[id]!.lane;
      const commit = n.lane === undefined && into !== undefined && run.map.gyms[into] ? gymById(run.map.gyms[into]!).type : null;
      return {
        key: `${n.id}>${id}`,
        points: (terrain.edges[`${n.id}>${id}`] ?? []).map((p) => `${p.x},${p.y}`).join(' '),
        state: walked ? 'walked' : live ? 'live' : open ? 'open' : 'gone',
        commit,
        ledge: n.ledge === id,
      } as const;
    }),
  );
  // §2.5.5 — the obstacles still standing, each at its edge's middle. One the Box can clear is gone, as a tree is once
  // it is cut: the step is a plain line (v0.9.108 — a type box left under it read as a "water" tag in the middle of
  // nowhere, the user's words).
  const gates = nodes.flatMap((n) =>
    Object.entries(n.gates ?? {}).map(([to, kind]) => {
      const line = terrain.edges[`${n.id}>${to}`] ?? [];
      const [p, q] = [line[0], line[line.length - 1]];
      const gate = kind as GateKind;
      return p && q && !partyClears(run, gate, content) ? { key: `${n.id}>${to}`, kind: gate, x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, gone: !ahead.has(to) } : null;
    }),
  ).filter((g) => g !== null);
  // §2.5.5 — the ledge, a quarter of the way down its drop (v0.9.108): the middle is the skipped column's, where on seven
  // rows one of its nodes nearly always stands and took the ledge's pointer (the audit).
  const ledges = nodes.filter((n) => n.ledge).map((n) => {
    const line = terrain.edges[`${n.id}>${n.ledge}`] ?? [];
    const [a, b] = [line[0], line[line.length - 1]];
    return a && b ? { key: n.id, x: a.x + (b.x - a.x) / 4, y: a.y + (b.y - a.y) / 4, gone: !ahead.has(n.ledge!) } : null;
  }).filter((l) => l !== null);

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
      <div ref={scroller} className={styles.scroller} tabIndex={0} onKeyDown={onKey} aria-label={ROUTE_TEXT.scroller} data-testid="route-scroller">
        <div ref={board} className={styles.board} style={{ width: boardW, height: viewH, '--tile': `${px}px`, '--node-scale': nodeScale, '--person-k': personScale(scale) / scale, '--node-label-size': `${Math.min(16, 12 + scale)}px`, '--column-reach': `${Math.floor((COL_TILES * px) / 2) - 8}px`, '--reach': `${(Math.floor((COL_TILES * px) / 2) - 8) / nodeScale}px` } as CSSProperties} data-painted={painted || undefined} data-testid="route-board">
          <canvas ref={canvas} className={styles.terrain} style={{ width: boardW, height: terrain.h * px }} aria-hidden="true" />

          {/* §2.5.4 — each Gym's Battlefield, drawn as weather over every tile of its ground (named at its lane's mouth, below). */}
          {masks.map((mask, side) => {
            const field = run.map.gyms[side] ? laneField(run, side) : null;
            if (!field || !mask) return null;
            const img = WEATHER_IMG[field];
            const style = { left: mask.x0 * px, top: mask.y0 * px, width: (mask.x1 - mask.x0) * px, height: (mask.y1 - mask.y0) * px, '--field-mask': `url(${mask.url})`, ...(img ? { '--weather-img': `url(${asset(`art/map/weather/${img}.png`)})` } : {}) } as CSSProperties;
            return <div key={side} className={`${styles.weather} ${WEATHER_CLASS[field] ?? ''}`} style={style} data-testid="route-field" data-side={side} data-field={field} />;
          })}

          {/* §2.5.5 — the ledge: FRLG's own two ends, across its drop. */}
          {ledges.map((l) => (
            <Tipped key={l.key} tip={ledgeTip()} role="img" aria-label={GATE_TEXT.ledge.title} className={`${styles.ledge} ${l.gone ? styles.propGone : ''}`} style={{ left: (l.x - 1) * px, top: (l.y - 0.5) * px, width: 2 * px, height: px }} data-testid="route-ledge">
              <img className="pixel" src={asset('art/map/props/ledge.png')} alt="" />
            </Tipped>
          ))}

          {/* §9.3 — each line drawn twice: a crisp casing under it in screen pixels (a filter here would blur in the
              viewBox's tile units — the UI review), then the line. */}
          <svg className={styles.edges} viewBox={`0 0 ${terrain.w} ${terrain.h}`} preserveAspectRatio="none" aria-hidden="true">
            {edges.map((e) => {
              const shared = { points: e.points, vectorEffect: 'non-scaling-stroke' as const, 'data-commit': e.commit ?? undefined, 'data-ledge': e.ledge || undefined, style: e.commit ? ({ '--lane-ink': `var(--type-${e.commit})` } as CSSProperties) : undefined };
              return (
                <g key={e.key} data-edge={e.state} data-commit={e.commit ?? undefined}>
                  <polyline {...shared} className={`${EDGE_CLASS[e.state]} ${styles.casing}`} />
                  <polyline {...shared} className={EDGE_CLASS[e.state]} />
                </g>
              );
            })}
          </svg>

          {/* §2.5.4 — the Gym's building, its Leader at the door: over the lines that reach it. */}
          {terrain.buildings.map((b) => {
            const { w, h } = BUILDINGS[b.id];
            const node = run.map.nodes[b.node]!;
            const gone = statusOf(node) === 'locked' && !ahead.has(node.id);
            return (
              <img key={b.node} className={`${styles.building} pixel ${gone ? styles.propGone : ''}`} src={asset(`art/map/props/${b.id}.png`)} alt="" aria-hidden="true" style={{ left: (b.x - Math.floor(w / 2)) * px, top: (b.y + 1 - h) * px, width: w * px, height: h * px }} />
            );
          })}

          {/* §2.5.5 — the field moves' obstacles, each with its bubble: what closes the step, and what clears it. */}
          {gates.map((g) => (
            <Tipped key={g.key} tip={gateTip(g.kind)} role="img" aria-label={GATE_TEXT[g.kind].title} className={`${styles.gate} ${g.gone ? styles.propGone : ''}`} style={{ left: g.x * px, top: g.y * px, '--gate-w': `${(g.kind === 'surf' ? 2 : 1) * px}px` } as CSSProperties} data-testid="route-gate" data-gate={g.kind}>
              <img className="pixel" src={asset(`art/map/props/gate-${g.kind}.png`)} alt="" />
            </Tipped>
          ))}

          {nodes.map((node) => {
            const at = terrain.at[node.id]!;
            return (
              <NodeMarker
                key={node.id}
                node={node}
                run={run}
                artScale={scale}
                status={statusOf(node)}
                art={nodeArt(node, run.map, wildFor(node, run, content))}
                ahead={ahead.has(node.id)}
                marked={marked.has(node.id)}
                caption={labels ? nodeLabel(node, run.map) : (landmarkName(node, run.map) ?? (statusOf(node) === 'reachable' ? nodeLabel(node, run.map) : null))}
                style={{ left: at.x * px, top: at.y * px, '--node-top': `${at.y * px}px` } as CSSProperties}
                onClick={() => onEnter(node.id)}
              />
            );
          })}

          {/* §2.5.4 — each lane named at its mouth, on its top or bottom edge (the effect above places it). Drawn above the nodes to be read, and taking no pointer, so a node under
              it keeps its click; the field is explained in each of the lane's node previews. */}
          {terrain.lanes.map((z) => {
            const field = laneField(run, z.lane);
            if (!field) return null;
            return (
              <span key={z.lane} className={styles.weatherTag} data-field={field} data-lane={z.lane} data-testid="weather-tag">
                {FIELD_LABEL[field]}
              </span>
            );
          })}
        </div>
      </div>

        <div className={styles.corner}>
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
          {!run.zone && (
            <button ref={habitatsBtn} type="button" className={styles.labelsToggle} aria-pressed={legend} onClick={toggleLegend} data-testid="map-habitats" {...habitatsTip}>
              <IconMap2 size={16} stroke={2.4} aria-hidden="true" />
              {ROUTE_TEXT.habitats}
            </button>
          )}
        </div>
      </div>

      {/* §2.6.1 — after its button in the order of focus, so Tab from Habitats walks into it. */}
      {legend && !run.zone && (
        <HabitatLegend
          ref={legendEl}
          run={run}
          sections={habitats}
          onMark={(ids) => setMarked(new Set(ids))}
          onGo={(id) => {
            const at = terrain.at[id];
            const el = scroller.current;
            if (at && el) el.scrollTo({ left: Math.max(0, at.x * px - el.clientWidth * FOCUS_AT), behavior });
          }}
        />
      )}
    </div>
  );
}
