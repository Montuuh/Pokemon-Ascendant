import { useState } from 'react';
import { IconCheck, IconDoorExit } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { PRICES, type PartyMon } from '@/sim';
import { MoveManager } from '@/ui/components/MoveManager';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money, Price } from '@/ui/components/Money';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import { moveDefTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './DojoScreen.module.css';

// Per docs/design/ui/screens.md (Dojo / Tutor, screen 4.7) and §2.9.4 — the Dojo. Node-screen chrome: header, content, Leave.
//
// v0.3 rationed the visit to one free service because there was no money. v0.4 restores canon: 150 ₽ a tutor
// move, 200 ₽ an ability, as many as you can pay for. The Dojo is the run's main money sink, so the wallet is
// in the header and every offer wears its price — deciding *whether* is now part of the node, not just which.

export function DojoScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [uid, setUid] = useState<string>(run.activeUids[0] ?? run.box[0]!.uid);
  const [toast, setToast] = useState<string | null>(null);

  const mon = run.box.find((m) => m.uid === uid) ?? run.box[0]!;
  const species = content.species(mon.speciesId);
  const canMove = run.money >= PRICES.dojoMove;
  const canAbility = run.money >= PRICES.dojoAbility;
  const broke = !canMove && !canAbility;

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  // §6.4.3 — the tutor list belongs to this *stage*, so evolving changes the menu and delaying one to take a
  // pre-form move is a legal play.
  const tutorList = species.tutorMoves.map((id) => ({ id, move: content.move(id), known: mon.pool.includes(id) }));
  const abilities = species.availableAbilities.map((id) => ({ id, def: content.ability(id), equipped: mon.abilityId === id }));

  return (
    // A node service screen is front-end chrome, not stage chrome: warm light, like the Pokémon Centre
    // (screen 4.6 of docs/design/ui/screens.md, "the warmest screen").
    <main className={styles.root} data-testid="dojo-screen">
      <header className={styles.topBar}>
        <div>
          <h1 className={`${styles.title} display`}>The Dojo</h1>
          <p className={styles.sub}>
            The master will work with anyone you can pay for. Teach a Pokémon something off its learnset, or
            change what it does without a card.
          </p>
        </div>
        <span className={styles.credits} data-testid="dojo-money">
          <Money amount={run.money} size={18} />
          <span className={styles.creditsLabel}>in hand</span>
        </span>
      </header>

      <div className={styles.body}>
        <aside className={styles.roster} aria-label="Choose a Pokémon">
          <h2 className={styles.colTitle}>Your Box</h2>
          <ul className={styles.list}>
            {run.box.map((m: PartyMon) => {
              const s = content.species(m.speciesId);
              return (
                <li key={m.uid}>
                  <button
                    type="button"
                    className={`${styles.pick} ${m.uid === uid ? styles.picked : ''}`}
                    onClick={() => setUid(m.uid)}
                    aria-pressed={m.uid === uid}
                    data-testid={`dojo-pick-${s.id}`}
                    aria-label={`${s.name}, level ${m.level}, ${m.pool.length} moves learned`}
                  >
                    <MonIcon speciesId={s.id} size={40} />
                    <span className={styles.pickBody}>
                      <span className={`${styles.pickName} display`}>{s.name}</span>
                      <span className={styles.pickMeta}>
                        Lv {m.level} · {m.pool.length} known
                      </span>
                    </span>
                    {s.types.map((t) => (
                      <TypeBadge key={t} type={t} size={16} />
                    ))}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={styles.services}>
          <div className={styles.service}>
            <h2 className={styles.colTitle}>Tutor move — {species.name}</h2>
            {tutorList.length === 0 ? (
              <p className={styles.empty}>The master has nothing to teach this one.</p>
            ) : (
              <ul className={styles.list}>
                {tutorList.map(({ id, move, known }) => (
                  <li key={id}>
                    <Tipped
                      as="button"
                      type="button"
                      tip={moveDefTip(move)}
                      className={`${styles.offer} ${known || !canMove ? styles.off : ''}`}
                      disabled={known || !canMove}
                      onClick={() => act({ type: 'teach-move', uid, moveId: id })}
                      data-testid={`tutor-${id}`}
                    >
                      <TypeBadge type={move.type} size={20} />
                      <span className={styles.offerBody}>
                        <span className={`${styles.offerName} display`}>{move.name}</span>
                        <span className={styles.offerMeta}>
                          {[move.range, move.role, move.power > 0 ? `${move.power} power` : null, known ? 'already known' : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <span className={`${styles.ap} tabular`}>{move.apCost} AP</span>
                      {known ? <IconCheck size={16} /> : <Price amount={PRICES.dojoMove} affordable={canMove} />}
                    </Tipped>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.service}>
            <h2 className={styles.colTitle}>Passive ability</h2>
            <ul className={styles.list}>
              {abilities.map(({ id, def, equipped }) => {
                const inert = def.hook === 'none';
                return (
                  <li key={id}>
                    <Tipped
                      as="button"
                      type="button"
                      tip={<Tip title={def.name} meta={['Ability', 'Passive']} body={def.description} footer={inert ? 'No effect until a later version.' : equipped ? 'Already equipped.' : 'Replaces the current passive. One slot per Pokémon.'} />}
                      className={`${styles.offer} ${equipped || !canAbility ? styles.off : ''}`}
                      disabled={equipped || !canAbility}
                      onClick={() => act({ type: 'set-ability', uid, abilityId: id })}
                      data-testid={`ability-${id}`}
                    >
                      <span className={styles.offerBody}>
                        <span className={`${styles.offerName} display`}>{def.name}</span>
                        <span className={styles.offerMeta}>
                          {def.description}
                          {/* Honesty over polish: a Region-1 passive that waits on a system this build does not
                              have yet says so rather than selling a no-op. */}
                          {inert && ' · no effect until a later version'}
                        </span>
                      </span>
                      {equipped ? <span className={styles.tag}>equipped</span> : <Price amount={PRICES.dojoAbility} affordable={canAbility} />}
                    </Tipped>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The deck sits beside the shelf, so what a purchase does to the active 4 is on screen while you
              are deciding whether to make it. */}
          <div className={`${styles.service} ${styles.deck}`}>
            <h2 className={styles.colTitle}>Deck</h2>
            <MoveManager uid={uid} onClose={() => undefined} embedded />
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        {toast && (
          <p className={styles.toast} role="status" data-testid="dojo-toast">
            {toast}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {run.log.slice(-1).join(' ')}
        </p>
        <button type="button" className={styles.leave} onClick={() => act({ type: 'leave-dojo' })} data-testid="btn-leave-dojo">
          <IconDoorExit size={18} /> {broke ? 'Back to the route' : 'Leave — keep the money'}
        </button>
      </footer>
    </main>
  );
}
