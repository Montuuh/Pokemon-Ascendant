import {
  IconArrowsExchange,
  IconBarbell,
  IconBuildingCastle,
  IconChevronRight,
  IconCrown,
  IconFirstAidKit,
  IconGift,
  IconMountain,
  IconPaw,
  IconQuestionMark,
  IconShoppingBag,
  IconSparkles,
  IconSwords,
  IconTrophy,
  IconUser,
  IconUserStar,
  type TablerIcon,
} from '@tabler/icons-react';
import type { MapNode, RunState } from '@/sim';
import { WILD_GRASS, type NodeArt } from '@/ui/art';
import { useTip } from '@/ui/tooltip';
import { routeNodeTip } from '@/ui/tips';
import { HabitatArt } from './HabitatArt';
import { kindName, nodeHash, routeNodeArt, titleSays } from './nodeArt';
import styles from './NodeMarker.module.css';

export type NodeStatus = 'reachable' | 'locked' | 'visited' | 'current';

/** §9.3 — each kind's mark on its chip: the word's picture, so a chip reads before it is read. */
const KIND_ICON: Record<string, TablerIcon> = {
  wild: IconPaw,
  trainer: IconUser,
  elite: IconUserStar,
  'elite-wild': IconCrown,
  gym: IconBuildingCastle,
  aid: IconFirstAidKit,
  merchant: IconShoppingBag,
  trader: IconArrowsExchange,
  // The node's picture is the games' own ball: its chip says what it holds, a find, not a second ball.
  cache: IconGift,
  mystery: IconQuestionMark,
  gauntlet: IconSwords,
  training: IconBarbell,
  summit: IconMountain,
  apex: IconSparkles,
  league: IconTrophy,
};

/** What the marker means, said in words, because colour and size alone are not a label (§9.6). */
const STATUS_TEXT: Record<NodeStatus | 'gone', string> = {
  current: 'you are here',
  visited: 'already cleared',
  reachable: 'you can go here',
  locked: 'not reachable yet',
  gone: 'off your route',
};

// §9.3 (v0.9.14, after Pokelike's map) — a node is drawn as what it is: the trainer, the Leader, a Wild Area's habitat
// in the grass, the item on the ground. State reads through the picture itself — full colour on every route still open,
// faded where you can no longer go, darkened with a tick once cleared — and through a ring on the ground under the
// node you stand on and the ones you can step to next. The Gym and the Elite always carry a caption, naming who waits
// there; every other node is its own picture, and its bubble says the rest — unless the map's labels are on (the user,
// 2026-10-20), and then every node wears its short name under it, in a lighter caption than a landmark's. A node you can
// step to always wears its chip, as a button: gold, with an arrow (the user, 2026-10-20: "contrast what is clickable").
export function NodeMarker({
  node,
  run,
  artScale,
  status,
  art,
  ahead,
  caption,
  onClick,
  style,
}: {
  node: MapNode;
  run: RunState;
  artScale: number;
  status: NodeStatus;
  art: NodeArt;
  /** Still on a route you can take from where you stand. */
  ahead: boolean;
  /** A landmark's name (the Leader, the Elite), or any node's short name while the map's labels are on; else null. */
  caption: string | null;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  // A node you can no longer reach says so in words too, not only by fading.
  const gone = status === 'locked' && !ahead;
  const said = STATUS_TEXT[gone ? 'gone' : status];
  const kind = kindName(node);
  const picture = routeNodeArt(art, node);
  // The node's whole story in one bubble: what it is, who is in it, the level band, and whether you can go.
  // The full preview card opens on click; this is the glance before the click.
  const tip = useTip(routeNodeTip(node, run, picture.src, kind, status, ahead));
  // Not `disabled`: a disabled button gets no mouse events, and the bubble is how a node you cannot enter yet
  // is read — who is in it, how strong, which Gym is which. It still takes no click and no Tab stop.
  const enterable = status === 'reachable';
  const landmark = node.kind === 'gym' || node.kind === 'elite';
  // A guarded find is a fight: its chip wears the swords, not the ball.
  const ChipIcon = node.preview.objective?.kind === 'hold' ? IconSwords : (KIND_ICON[node.kind] ?? IconQuestionMark);
  return (
    <button
      type="button"
      className={[styles.node, styles[status], gone ? styles.gone : '', landmark ? styles.landmark : '', node.kind === 'gym' ? styles.climax : '']
        .filter(Boolean)
        .join(' ')}
      style={{ ...style, '--habitat-scale': Math.max(1, artScale - 0.5) } as React.CSSProperties}
      onClick={enterable ? onClick : undefined}
      aria-disabled={enterable ? undefined : true}
      tabIndex={enterable ? undefined : -1}
      // A title that already says the kind is read in its place ("A guarded find"), never dropped: a Gym's names its Leader.
      aria-label={titleSays(node.preview.title, kind) ? `${node.preview.title}, ${said}.` : `${kind}, ${said}. ${node.preview.title}`}
      aria-current={status === 'current' ? 'location' : undefined}
      {...tip}
      data-testid={`node-${node.id}`}
      data-tip-side="side"
      data-kind={node.kind}
      data-status={status}
      data-ahead={ahead || undefined}
      data-art={art.kind}
    >
      <span className={styles.ground} aria-hidden="true" />
      <span className={[styles.art, styles[art.kind]].filter(Boolean).join(' ')} aria-hidden="true">
        {picture.kind === 'habitat' ? (
          // A Wild Area: its landmark, its residents going round, out of step with the nodes round it.
          <HabitatArt artScale={Math.max(1, artScale - 0.5)} src={picture.src} low={picture.low} pool={picture.pool} seed={nodeHash(node.id)} />
        ) : (
          <>
            <img className="pixel" src={picture.src} alt="" draggable={false} />
            {/* The one grass every Wild Area shares, in front: an Elite Wild stands in it as a Wild Area's landmark does. */}
            {art.kind === 'pokemon' && art.grass && <img className={`pixel ${styles.grass}`} src={WILD_GRASS} alt="" draggable={false} />}
          </>
        )}
      </span>
      {status === 'visited' && (
        <span className={styles.tick} aria-hidden="true">
          ✓
        </span>
      )}
      {/* §9.3 — the chip: the kind's icon and its word; a node you can step to wears it as a button (gold, with its
          arrow), so what takes a click reads apart from what does not. */}
      {caption && (
        <span className={[styles.caption, landmark ? styles.name : styles.label, enterable ? styles.go : ''].filter(Boolean).join(' ')} data-chip={enterable ? 'go' : 'label'}>
          <ChipIcon size={12} stroke={2.4} aria-hidden="true" className={styles.chipIcon} />
          {caption}
          {enterable && <IconChevronRight size={12} stroke={2.8} aria-hidden="true" className={styles.chipIcon} />}
        </span>
      )}
    </button>
  );
}
