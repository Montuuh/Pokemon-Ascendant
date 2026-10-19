import { IconCheck, IconTrophy } from '@tabler/icons-react';
import { leagueMemberOf, type MapNode, type RunState, microRestPct } from '@/sim';
import { itemIcon, trainerSprite } from '@/ui/art';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { LEAGUE_TEXT } from '@/ui/strings';
import { leagueDoorTip, microRestTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './LeagueHall.module.css';

// §2.1.6 — the League in place of the map: five doors in a row, no path to choose — the Elite Four under one label,
// the Champion apart. Each door is its member: who, the type they are known by, how many Pokémon (never which, as a
// Gym's) — beaten, next, or still ahead. The next door opens its preview like any node; between doors, the micro-rest.

type DoorState = 'beaten' | 'next' | 'ahead';
const STATE_CLASS: Record<DoorState, string> = { beaten: styles.beaten!, next: styles.next!, ahead: styles.ahead! };

export function LeagueHall({ run, onEnter }: { run: RunState; onEnter: (nodeId: string) => void }) {
  const doors: MapNode[] = Object.values(run.map.nodes).sort((a, b) => a.layer - b.layer);
  const door = (node: MapNode) => {
    const member = leagueMemberOf(node);
    const state: DoorState = run.visited.includes(node.id) ? 'beaten' : run.reachable.includes(node.id) ? 'next' : 'ahead';
    const count = node.preview.enemies?.length ?? 0;
    return (
      <li key={node.id}>
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
          <img className={styles.sprite} src={trainerSprite(member?.sprite ?? 'acetrainer')} alt="" width={80} height={80} />
          <span className={`${styles.name} display`}>{node.preview.title}</span>
          <span className={styles.type}>{member?.type ? <TypeBadge type={member.type} size={14} defenderTypes={[member.type]} /> : <span className={styles.many}>{LEAGUE_TEXT.manyTypes}</span>}</span>
          <span className={styles.balls}>
            {Array.from({ length: count }, (_, i) => <img key={i} src={itemIcon('poke-ball')} alt="" width={16} height={16} />)}
            <span className="sr-only">{LEAGUE_TEXT.teamOf(count)}</span>
          </span>
          {state === 'beaten' && (
            <span className={styles.tick}>
              <IconCheck size={18} stroke={3} aria-hidden="true" />
              <span className="sr-only">{LEAGUE_TEXT.beaten}</span>
            </span>
          )}
        </Tipped>
      </li>
    );
  };
  const elite = doors.filter((n) => leagueMemberOf(n)?.title !== 'Champion');
  const champion = doors.filter((n) => leagueMemberOf(n)?.title === 'Champion');
  return (
    <div className={styles.root} data-testid="league-hall">
      <div className={styles.groups}>
        <section className={styles.group} aria-label={LEAGUE_TEXT.eliteFour}>
          <h2 className={styles.seat}>{LEAGUE_TEXT.eliteFour}</h2>
          <ol className={styles.doors}>{elite.map(door)}</ol>
        </section>
        <section className={`${styles.group} ${styles.championGroup}`} aria-label={LEAGUE_TEXT.champion}>
          <h2 className={styles.seat}>
            <IconTrophy size={14} aria-hidden="true" /> {LEAGUE_TEXT.champion}
          </h2>
          <ol className={styles.doors}>{champion.map(door)}</ol>
        </section>
      </div>
      {/* §2.1.6 — the micro-rest: one line, its paragraph a hover away. */}
      <Tipped tip={microRestTip(microRestPct(run.modifiers))} className={styles.rest} data-testid="league-rest">
        {LEAGUE_TEXT.microRest(microRestPct(run.modifiers))}
      </Tipped>
    </div>
  );
}
