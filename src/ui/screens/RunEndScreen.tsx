import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { GYMS, LAYERS, maxHpOf } from '@/sim';
import { nodeBadge } from '@/ui/art';
import { MonIcon } from '@/ui/components/MonIcon';
import { AccountSummary } from './hub/AccountSummary';
import styles from './RunEndScreen.module.css';

// Per docs/design/ui/screens.md §3.8 / §3.9 — one result chrome for both endings: header, the run in numbers,
// the team you finished with, one line of tone, Continue. Defeat is warm, not punishing (Pillar 5).

export function RunEndScreen({ outcome }: { outcome: 'victory' | 'defeat' }) {
  const goTo = useAppStore((s) => s.goTo);
  const run = useRunStore((s) => s.run);
  const abandon = useRunStore((s) => s.abandon);
  const content = getContent();

  if (!run) {
    return (
      <main className={styles.root} data-testid={`${outcome}-screen`}>
        <div className={styles.card}>
          <h1 className={`${styles.title} display`}>{outcome === 'victory' ? 'Region cleared' : 'Run over'}</h1>
          <button type="button" className={styles.continue} onClick={() => goTo('menu')}>
            Main menu
          </button>
        </div>
      </main>
    );
  }

  const won = outcome === 'victory';
  const depth = run.position ? run.map.nodes[run.position]!.layer + 1 : 0;
  // §5.10 — the Badge you actually won, from the lane you actually took. This read `GYM` until v0.5, which
  // was fine while every run ended at Brock and congratulated a Misty run on its Boulder Badge afterwards.
  const badges = run.badges.map((id) => content.badge(id));
  const beaten = GYMS.find((g) => run.badges.includes(g.badgeId)) ?? null;
  const metrics: { label: string; value: string }[] = [
    { label: 'Nodes cleared', value: `${run.stats.nodesCleared} / ${LAYERS}` },
    { label: 'Fights won', value: String(run.stats.combatsWon) },
    { label: 'Turns played', value: String(run.stats.turnsPlayed) },
    { label: 'Pokémon caught', value: String(run.stats.catches) },
    { label: 'Faints', value: String(run.stats.faints) },
    { label: 'Depth reached', value: `Layer ${depth} / ${LAYERS}` },
  ];

  return (
    <main className={`${styles.root} ${won ? styles.won : styles.lost}`} data-testid={`${outcome}-screen`}>
      <div className={`${styles.card} fx-pop`}>
        <h1 className={`${styles.title} display`}>{won ? 'Region cleared!' : 'Run over'}</h1>
        <p className={styles.sub}>
          {won
            ? `${beaten?.name ?? 'The Gym Leader'} is beaten — and so is the road out of Region 1.`
            : 'Every Pokémon in your Box was down. That is where the run ends, and where the next one starts smarter.'}
        </p>

        {won && badges.length > 0 && (
          <div className={styles.badge} data-testid="badge-award">
            {badges.map((b) => (
              <div key={b.id} className={styles.badgeRow}>
                <img src={nodeBadge(`gym-${b.type}`)} alt="" width={48} height={48} />
                <span>
                  <span className="display">{b.name}</span>
                  {/* §5.10 — a Badge is permanent, so what it does is worth reading even at the end of a
                      Region: it is the thing the next one starts with. */}
                  <em className={styles.badgeEffect}>{b.description}</em>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* §8.3 — what the run did for the account. Failure is fuel, made legible: the lost run's XP is the
            first thing under the numbers, not a footnote. */}
        <AccountSummary />

        <dl className={styles.metrics}>
          {metrics.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd className="display tabular">{m.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className={styles.sectionTitle}>The team you finished with</h2>
        <ul className={styles.team}>
          {run.box.map((mon) => {
            const s = content.species(mon.speciesId);
            return (
              <li key={mon.uid} className={mon.hp <= 0 ? styles.fainted : ''}>
                <MonIcon speciesId={s.id} size={52} />
                <span className={styles.memberName}>{s.name}</span>
                <span className="tabular">Lv {mon.level}</span>
                <span className={`${styles.hp} tabular`}>
                  {mon.hp}/{maxHpOf(mon, content)}
                </span>
                {mon.traumaStacks > 0 && <span className={styles.trauma}>Trauma ×{mon.traumaStacks}</span>}
              </li>
            );
          })}
        </ul>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.continue}
            onClick={() => {
              abandon();
              goTo('menu');
            }}
            data-testid="btn-end-continue"
          >
            Main menu
          </button>
          <button
            type="button"
            className={styles.again}
            onClick={() => {
              abandon();
              goTo('starter');
            }}
            data-testid="btn-run-again"
          >
            Run again
          </button>
        </div>
      </div>
    </main>
  );
}
