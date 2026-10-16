import type { MapNode } from '@/sim';
import type { NodeArt } from '@/ui/art';
import { nodeHint, NODE_LABEL } from '@/ui/strings';
import { Tip, useTip } from '@/ui/tooltip';
import { typeName } from '@/ui/tips';
import styles from './NodeMarker.module.css';

export type NodeStatus = 'reachable' | 'locked' | 'visited' | 'current';

/** What the marker means, said in words, because colour and size alone are not a label (§9.6). */
const STATUS_TEXT: Record<NodeStatus | 'gone', string> = {
  current: 'you are here',
  visited: 'already cleared',
  reachable: 'you can go here',
  locked: 'not reachable yet',
  gone: 'off your route',
};

// §9.3 (v0.9.14, after Pokelike's map) — a node is drawn as what it is: the trainer, the Leader, the Pokémon in the
// grass, the item on the ground. State reads through the picture itself — full colour on every route still open,
// faded where you can no longer go, darkened with a tick once cleared — and through a ring on the ground under the
// node you stand on and the ones you can step to next. Only the Gym and the Elite carry a caption, naming who waits
// there; every other node is its own picture, and its bubble says the rest.
export function NodeMarker({
  node,
  status,
  art,
  ahead,
  caption,
  onClick,
  style,
}: {
  node: MapNode;
  status: NodeStatus;
  art: NodeArt;
  /** Still on a route you can take from where you stand. */
  ahead: boolean;
  /** A landmark's name (the Leader, the Elite); null on every other node. */
  caption: string | null;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  // A node you can no longer reach says so in words too, not only by fading.
  const gone = status === 'locked' && !ahead;
  const said = STATUS_TEXT[gone ? 'gone' : status];
  // The node's whole story in one bubble: what it is, who is in it, the level band, and whether you can go.
  // The full preview card opens on click; this is the glance before the click.
  const tip = useTip(
    <Tip
      title={node.preview.title}
      meta={[
        // The kind only when the title does not already say it, and a level band only where there is a fight.
        ...(NODE_LABEL[node.kind] && NODE_LABEL[node.kind] !== node.preview.title ? [NODE_LABEL[node.kind]!] : []),
        // §2.7 — a trainer's levels are part of the surprise (v0.8.6); a wild node keeps its band.
        ...(node.preview.levelBand[1] > 0 && (node.kind === 'wild' || node.kind === 'elite-wild' || node.preview.objective?.kind === 'hold') ? [`Lv ${node.preview.levelBand[0]}–${node.preview.levelBand[1]}`] : []),
        // §2.7.3 — a hidden team's hint.
        ...(node.preview.usualTypes?.length ? [`Usually ${node.preview.usualTypes.map(typeName).join(' · ')}`] : []),
        said,
      ]}
      body={node.preview.detail}
      footer={nodeHint(node)}
    />,
  );
  // Not `disabled`: a disabled button gets no mouse events, and the bubble is how a node you cannot enter yet
  // is read — who is in it, how strong, which Gym is which. It still takes no click and no Tab stop.
  const enterable = status === 'reachable';
  const landmark = node.kind === 'gym' || node.kind === 'elite';
  return (
    <button
      type="button"
      className={[styles.node, styles[status], gone ? styles.gone : '', landmark ? styles.landmark : '', node.kind === 'gym' ? styles.climax : '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={enterable ? onClick : undefined}
      aria-disabled={enterable ? undefined : true}
      tabIndex={enterable ? undefined : -1}
      aria-label={`${NODE_LABEL[node.kind]}, ${said}.${node.preview.title !== NODE_LABEL[node.kind] ? ` ${node.preview.title}` : ''}`}
      aria-current={status === 'current' ? 'location' : undefined}
      {...tip}
      data-testid={`node-${node.id}`}
      data-kind={node.kind}
      data-status={status}
      data-ahead={ahead || undefined}
      data-art={art.kind}
    >
      <span className={styles.ground} aria-hidden="true" />
      <span className={`${styles.art} ${styles[art.kind]}`} aria-hidden="true">
        {/* An item is a smooth render, not pixel art: it is drawn with smoothing; everything else stays crisp. */}
        <img className={art.kind === 'item' ? undefined : 'pixel'} src={art.src} alt="" draggable={false} />
        {art.kind === 'pokemon' && art.cover && (
          <span className={art.cover.kind === 'water' ? styles.water : styles.grass} style={{ backgroundImage: `url(${art.cover.tile})` }} />
        )}
      </span>
      {status === 'visited' && (
        <span className={styles.tick} aria-hidden="true">
          ✓
        </span>
      )}
      {caption && <span className={styles.caption}>{caption}</span>}
    </button>
  );
}
