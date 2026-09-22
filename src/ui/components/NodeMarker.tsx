import type { MapNode } from '@/sim';
import { nodeBadge } from '@/ui/art';
import { NODE_HINT, NODE_LABEL } from '@/ui/strings';
import { Tip, useTip } from '@/ui/tooltip';
import styles from './NodeMarker.module.css';

export type NodeStatus = 'reachable' | 'locked' | 'visited' | 'current';

/**
 * A badge id → its file. The preview names one where the node kind alone is not specific enough — a trainer
 * archetype, a Gym type, a Wild's biome — and otherwise the kind is the id.
 *
 * `fallbackBadge` is what a badge degrades to when its specific file does not exist yet: a biome-tinted Wild
 * falls back to the generic tall grass rather than to a broken-image glyph, so adding a biome or a Gym type
 * to the map is never blocked on adding a PNG first.
 */
const badge = (id: string) => nodeBadge(id);
const fallbackBadge = (kind: string) => nodeBadge(kind === 'elite-wild' ? 'wild' : kind);

/** What the marker means, said in words, because colour and size alone are not a label (§9.6). */
const STATUS_TEXT: Record<NodeStatus, string> = {
  current: 'you are here',
  visited: 'already cleared',
  reachable: 'you can go here',
  locked: 'not reachable yet',
};

// Per docs/design/ui/screens.md §2.2 art notes — 44 px marker, 58 px for the current node and the Gym,
// locked dimmed, visited ticked. The badges are full-colour Pokémon emblems, so state is carried by scale,
// ring and saturation rather than by tint, and every state also has a word in the label.
export function NodeMarker({
  node,
  status,
  onClick,
  style,
}: {
  node: MapNode;
  status: NodeStatus;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  // The node's whole story in one bubble: what it is, who is in it, the level band, and whether you can go.
  // The full preview card opens on click; this is the glance before the click.
  const tip = useTip(
    <Tip
      title={node.preview.title}
      meta={[
        // The kind only when the title does not already say it, and a level band only where there is a fight.
        ...(NODE_LABEL[node.kind] && NODE_LABEL[node.kind] !== node.preview.title ? [NODE_LABEL[node.kind]!] : []),
        ...(node.preview.levelBand[1] > 0 ? [`Lv ${node.preview.levelBand[0]}–${node.preview.levelBand[1]}`] : []),
        STATUS_TEXT[status],
      ]}
      body={node.preview.detail}
      footer={NODE_HINT[node.kind]}
    />,
  );
  return (
    <button
      type="button"
      className={[styles.node, styles[status], node.kind === 'gym' && styles.climax, node.kind === 'elite' && styles.major]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={onClick}
      disabled={status !== 'reachable'}
      aria-label={`${NODE_LABEL[node.kind]}, ${STATUS_TEXT[status]}. ${node.preview.title}`}
      aria-current={status === 'current' ? 'location' : undefined}
      {...tip}
      data-testid={`node-${node.id}`}
      data-kind={node.kind}
      data-status={status}
    >
      <img
        className={styles.badge}
        src={badge(node.preview.icon ?? node.kind)}
        alt=""
        width={44}
        height={44}
        draggable={false}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          const fb = fallbackBadge(node.kind);
          if (!img.src.endsWith(fb)) img.src = fb;
        }}
      />
      {status === 'visited' && (
        <span className={styles.tick} aria-hidden="true">
          ✓
        </span>
      )}
      <span className={styles.caption}>{NODE_LABEL[node.kind]}</span>
    </button>
  );
}
