import { useEffect, useMemo, useState } from 'react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { portraitUrl } from '@/content/schemas/species';
import { boxCapacity, maxHpOf, xpToNext, type PartyMon } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { itemIcon, tmIcon } from '@/ui/art';
import { PokeDollar } from '@/ui/components/Money';
import styles from './RewardScreen.module.css';

// Per docs/design/ui/screens.md §3.5 — the post-combat result. XP bars fill, level-ups flag, a catch gets its
// own line, and Continue is always reachable. Reduced motion fills instantly: the CSS transition handles it.

export function RewardScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const reward = run.pendingReward;
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 60);
    return () => clearTimeout(t);
  }, []);

  const rows = useMemo(() => {
    if (!reward) return [];
    return reward.xpAwarded
      .map((a) => {
        const mon = run.box.find((m) => m.uid === a.uid);
        if (!mon) return null;
        const up = reward.levelUps.find((l) => l.uid === a.uid) ?? null;
        return { mon, amount: a.amount, up };
      })
      .filter((r): r is { mon: PartyMon; amount: number; up: (typeof reward.levelUps)[number] | null } => !!r);
  }, [reward, run.box]);

  if (!reward) return null;

  const caught = reward.caught;
  const caughtSpecies = caught ? content.species(caught.speciesId) : null;
  const boxFull = run.box.length >= boxCapacity(run);

  return (
    <main className={styles.root} data-testid="reward-screen">
      <div className={`${styles.card} fx-pop`}>
        <h1 className={`${styles.title} display`}>{caught ? 'Gotcha!' : 'Victory!'}</h1>
        <p className={styles.sub}>
          {caught
            ? `${caughtSpecies!.name} was caught. A catch counts as a clean win.`
            : reward.faintedUids.length > 0
              ? 'The node is clear, but it cost you.'
              : 'The node is clear.'}
        </p>

        {caught && caughtSpecies && (
          <section className={styles.catch} data-testid="reward-catch">
            <img src={portraitUrl(caughtSpecies.dex, caughtSpecies.id)} alt="" width={110} height={110} />
            <div>
              <h2 className={`${styles.catchName} display`}>
                {caughtSpecies.name} <span className="tabular">Lv {caught.level}</span>
              </h2>
              <span className={styles.types}>
                {caughtSpecies.types.map((t) => (
                  <TypeBadge key={t} type={t} size={15} />
                ))}
              </span>
              <p className={styles.catchNote}>
                {boxFull ? 'Your Box is full — you will choose who to release next.' : 'Joins the Box.'}
              </p>
            </div>
          </section>
        )}

        <h2 className={styles.sectionTitle}>Experience</h2>
        <ul className={styles.xpList}>
          {rows.map(({ mon, amount, up }) => {
            const species = content.species(mon.speciesId);
            const need = xpToNext(mon.level);
            const pct = Math.min(100, (mon.xp / need) * 100);
            const isActive = run.activeUids.includes(mon.uid);
            return (
              <li key={mon.uid} className={styles.xpRow} data-testid={`xp-${mon.speciesId}`}>
                <MonIcon speciesId={species.id} size={46} />
                <div className={styles.xpBody}>
                  <div className={styles.xpHead}>
                    <span className={`${styles.xpName} display`}>{species.name}</span>
                    {up ? (
                      <span className={styles.levelUp} data-testid={`levelup-${mon.speciesId}`}>
                        Lv {up.from} → {up.to}
                      </span>
                    ) : (
                      <span className={`${styles.level} tabular`}>Lv {mon.level}</span>
                    )}
                    <span className={`${styles.gain} tabular`}>+{amount} XP</span>
                    {!isActive && <span className={styles.bench}>bench ×0.75</span>}
                  </div>
                  <span className={styles.track}>
                    <span className={styles.fill} style={{ width: filled ? `${pct}%` : '0%' }} />
                  </span>
                  <span className={styles.xpMeta}>
                    <span className="tabular">
                      {mon.xp}/{need} to Lv {mon.level + 1}
                    </span>
                    <span className="tabular">
                      HP {mon.hp}/{maxHpOf(mon, content)}
                    </span>
                  </span>
                  {up?.evolutionReady && (
                    <p className={styles.evolved} data-testid={`ready-${mon.speciesId}`}>
                      {species.name} is ready to evolve — you choose how.
                    </p>
                  )}
                  {up && up.activated.length > 0 && (
                    <p className={styles.learned}>
                      Learned {up.activated.map((m) => content.move(m).name).join(', ')} — the deck thickens.
                    </p>
                  )}
                  {/* §6.7.2 — past four, a new move waits in the pool. Say so, or it looks like it was lost. */}
                  {up && up.learned.length > up.activated.length && (
                    <p className={styles.pooled} data-testid={`pooled-${mon.speciesId}`}>
                      {up.learned
                        .filter((m) => !up.activated.includes(m))
                        .map((m) => content.move(m).name)
                        .join(', ')}{' '}
                      joined the move pool — the active 4 is full. Swap it in from the Move Manager.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* §2.14 / §7.3 / §7.4.6 — the loot line. Four independent rolls off one stream, so a fight can hand
            over all of them or none; each gets its own row rather than being folded into a summary, because a
            relic is a permanent change to the run and should not read like a coin pickup. */}
        {reward.money > 0 && (
          <p className={styles.drop} data-testid="reward-money">
            <PokeDollar size={26} />
            <span>
              <b>{reward.money.toLocaleString('en-GB')} ₽</b> — spend it at the Mart, the Dojo or the Centre.
            </span>
          </p>
        )}

        {reward.relic && (
          <p className={styles.drop} data-testid="reward-relic">
            <img src={itemIcon(reward.relic)} alt="" width={32} height={32} className={styles.dropIcon} />
            <span>
              <b>{content.relic(reward.relic).name}</b> — {content.relic(reward.relic).description} It works for
              the rest of the run; there is nothing to equip.
            </span>
          </p>
        )}

        {reward.heldItem && (
          <p className={styles.drop} data-testid="reward-held-item">
            <img src={itemIcon(reward.heldItem)} alt="" width={32} height={32} className={styles.dropIcon} />
            <span>
              <b>{content.heldItem(reward.heldItem).name}</b> — {content.heldItem(reward.heldItem).description} It
              does nothing in the bag: give it to someone from the map.
            </span>
          </p>
        )}

        {reward.tm && (
          <p className={styles.drop} data-testid="reward-tm">
            <img src={tmIcon(reward.tm)} alt="" width={32} height={32} className={styles.dropIcon} />
            <span>
              <b>{content.tm(reward.tm).name}</b> — teach it to a compatible Pokémon from the Move Manager.
            </span>
          </p>
        )}

        {reward.faintedUids.length > 0 && (
          <p className={styles.trauma} data-testid="reward-trauma">
            {reward.faintedUids
              .map((uid) => content.species(run.box.find((m) => m.uid === uid)!.speciesId).name)
              .join(', ')}{' '}
            fainted and carries a Trauma stack for the rest of the run.
          </p>
        )}

        <button type="button" className={styles.continue} onClick={() => dispatch({ type: 'claim-reward' })} data-testid="btn-claim">
          Continue
        </button>
      </div>
    </main>
  );
}
