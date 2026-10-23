import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { IconArrowRight, IconCheck, IconLock, IconTrophy } from '@tabler/icons-react';
import { leagueMemberOf, type MapNode, type RunState, microRestPct } from '@/sim';
import { trainerSprite } from '@/ui/art';
import { PixelSprite } from '@/ui/components/PixelSprite';
import { TypeLabel } from '@/ui/components/TypeBadge';
import { LEAGUE_TEXT } from '@/ui/strings';
import { leagueDoorTip, microRestTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { LEAGUE_ART, LEAGUE_GALLERY } from '../league/scene';
import styles from './LeagueHall.module.css';

// §2.1.6 / §5.11 / §5.12 — one gallery, five physical thresholds in their fixed run order. A door only
// opens the existing node preview; the map screen and reducer still own entering and starting the fight.
type DoorState = 'beaten' | 'next' | 'ahead';
const STATE_CLASS: Record<DoorState, string> = { beaten: styles.beaten!, next: styles.next!, ahead: styles.ahead! };

export function LeagueHall({ run, onEnter }: { run: RunState; onEnter: (nodeId: string) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setScale(Math.max(1, Math.min(3, Math.floor(Math.min(el.clientWidth / LEAGUE_GALLERY.width, el.clientHeight / LEAGUE_GALLERY.height) * 2) / 2)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const doors = Object.values(run.map.nodes).sort((a, b) => a.layer - b.layer);
  const door = (node: MapNode, index: number) => {
    const member = leagueMemberOf(node);
    const state: DoorState = run.visited.includes(node.id) ? 'beaten' : run.reachable.includes(node.id) ? 'next' : 'ahead';
    const count = node.preview.enemies?.length ?? 0;
    const anchor = LEAGUE_GALLERY.doors[index];
    if (!anchor) return null;
    return (
      <li key={node.id} className={styles.threshold} style={{ left: `${anchor.x / LEAGUE_GALLERY.width * 100}%`, top: `${(anchor.y - 12) / LEAGUE_GALLERY.height * 100}%` }}>
        <Tipped
          as="button"
          type="button"
          tip={leagueDoorTip(node, state)}
          className={`${styles.door} ${STATE_CLASS[state]}`}
          onClick={state === 'next' ? () => onEnter(node.id) : undefined}
          aria-disabled={state === 'next' ? undefined : true}
          data-testid={`league-door-${node.layer}`}
          data-state={state}
        >
          <span className={styles.number}>{index + 1}{member?.title === 'Champion' && <IconTrophy size={14} aria-hidden="true" />}</span>
          <span className={styles.sprite}><PixelSprite src={trainerSprite(member?.sprite ?? 'acetrainer')} alt="" width={40 * scale} height={40 * scale} /></span>
          <span className={styles.placard}>
          <span className={styles.plate}>
            <span className={`${styles.name} display`}>{node.preview.title}</span>
            {member?.type ? <TypeLabel type={member.type} size={18} /> : <span className={styles.many}>{LEAGUE_TEXT.manyTypes}</span>}
            <span className={styles.count}>{LEAGUE_TEXT.teamOf(count)}</span>
          </span>
          <span className={styles.state}>
            {state === 'beaten' ? <IconCheck size={16} stroke={3} aria-hidden="true" /> : state === 'ahead' ? <IconLock size={14} aria-hidden="true" /> : <IconArrowRight size={16} aria-hidden="true" />}
            {state === 'beaten' ? LEAGUE_TEXT.beaten : state === 'next' ? LEAGUE_TEXT.next : LEAGUE_TEXT.ahead}
          </span>
          </span>
        </Tipped>
      </li>
    );
  };

  return (
    <div className={styles.root} data-testid="league-hall">
      <div className={styles.galleryHead} style={{ width: LEAGUE_GALLERY.width * scale }}>
        <h2 className={styles.seat}>{LEAGUE_TEXT.eliteFour}</h2>
        <h2 className={styles.seat}><IconTrophy size={16} aria-hidden="true" />{LEAGUE_TEXT.champion}</h2>
      </div>
      <div ref={frame} className={styles.frame}>
        <div className={styles.gallery} style={{ width: LEAGUE_GALLERY.width * scale, height: LEAGUE_GALLERY.height * scale, '--gallery-scale': scale } as CSSProperties} data-testid="league-gallery" data-scale={scale}>
          <img className={styles.art} src={LEAGUE_ART.gallery} alt="" width={LEAGUE_GALLERY.width} height={LEAGUE_GALLERY.height} draggable={false} />
          <ol className={styles.doors} aria-label={LEAGUE_TEXT.doors}>{doors.map(door)}</ol>
        </div>
      </div>
      {/* §2.1.6 — use the run's modifier-aware percentage; the explanation is only in its tooltip. */}
      <Tipped tip={microRestTip(microRestPct(run.modifiers))} className={styles.rest} data-testid="league-rest">
        {LEAGUE_TEXT.microRestLabel(microRestPct(run.modifiers))}
      </Tipped>
    </div>
  );
}
