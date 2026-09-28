import { useState, type ReactNode } from 'react';
import { Tabs } from 'radix-ui';
import { IconBook, IconCheck, IconEgg, IconSparkles } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { abilityLocked, dojoPrice, eggMovesFor, tutorListFor, type MoveDef, type PartyMon } from '@/sim';
import { MoveManager } from '@/ui/components/MoveManager';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money, Price } from '@/ui/components/Money';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { BACK_TO_TOWN, DOJO_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { counterTabTip, dojoTip, eggMovesTip, moveDefTip, passiveTip, tutorTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped, useTip } from '@/ui/tooltip';
import { BackButton } from '@/ui/components/BackButton';
import styles from './DojoScreen.module.css';

// Per docs/design/ui/screens.md (Dojo / Tutor, screen 4.7) and §2.9.4 — the Dojo, a City building since v0.7.1
// (§2.11.4): header, content, and a door back to town. Three counters — the tutor, the egg moves (§2.9.4.2, the
// master's scrolls: the line's own, for any stage) and the passive — beside the deck they change.
//
// As many services as you can pay for, each priced by the sim (`dojoPrice`: the town's price, the city's +30 %,
// any modifier's discount). The Dojo is the run's main money sink, so the wallet is in the header and every
// offer wears its price — deciding *whether* is part of the visit, not just which.

type Counter = 'tutor' | 'eggs' | 'passive';
const COUNTERS: readonly Counter[] = ['tutor', 'eggs', 'passive'];
const COUNTER_ICON: Record<Counter, ReactNode> = {
  tutor: <IconBook size={16} aria-hidden="true" />,
  eggs: <IconEgg size={16} aria-hidden="true" />,
  passive: <IconSparkles size={16} aria-hidden="true" />,
};

export function DojoScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [uid, setUid] = useState<string>(run.activeUids[0] ?? run.box[0]!.uid);
  const [toast, setToast] = useState<string | null>(null);
  const [counter, setCounter] = useState<Counter>('tutor');

  const mon = run.box.find((m) => m.uid === uid) ?? run.box[0]!;
  const species = content.species(mon.speciesId);
  // §2.9.4 — the town's price, the city's +30 %, and any modifier's discount: the sim prices it, not the screen.
  const movePrice = dojoPrice(run, content, 'move');
  const abilityPrice = dojoPrice(run, content, 'ability');
  const eggPrice = dojoPrice(run, content, 'egg');
  const canEgg = run.money >= eggPrice;
  const canMove = run.money >= movePrice;
  const canAbility = run.money >= abilityPrice;

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  // §6.4.3 — the tutor list belongs to this *stage*, so evolving changes the menu and delaying one to take a
  // pre-form move is a legal play.
  // §2.9.4 — the city Dojo's list is wider: every stage the line has reached (tutorListFor).
  const tutorList = tutorListFor(run, mon, content).map((id) => ({ id, move: content.move(id), known: mon.pool.includes(id) }));
  // §2.9.4.2 — the line's egg moves: inherited, not grown into, so every stage of the line is offered the same list.
  const eggList = eggMovesFor(mon, content).map((id) => ({ id, move: content.move(id), known: mon.pool.includes(id) }));
  // §6.8.3 — the line's hidden ability is listed, greyed and named as such, until the line's Bond opens it.
  const abilities = species.availableAbilities.map((id) => ({ id, def: content.ability(id), equipped: mon.abilityId === id, locked: abilityLocked(run, mon.speciesId, id, content) }));
  // What each tab still has to sell this Pokémon, on the tab itself.
  const counts: Record<Counter, number> = {
    tutor: tutorList.filter((o) => !o.known).length,
    eggs: eggList.filter((o) => !o.known).length,
    passive: abilities.filter((a) => !a.equipped && !a.locked).length,
  };

  return (
    // A node service screen is front-end chrome, not stage chrome: warm light, like the Pokémon Centre
    // (screen 4.6 of docs/design/ui/screens.md, "the warmest screen").
    <main className={styles.root} data-testid="dojo-screen">
      <header className={styles.topBar}>
        <BackButton label={BACK_TO_TOWN} onClick={() => act({ type: 'leave-dojo' })} testId="btn-leave-dojo" />
        <div>
          <h1 className={`${styles.title} display`}>The Dojo</h1>
          <p className={styles.sub}>
            {DOJO_TEXT.sub}
            <InfoDot tip={dojoTip()} />
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
                      <TypeBadge key={t} type={t} size={12} />
                    ))}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={styles.services}>
          {/* Three counters as tabs, so the one being bought from sits beside the deck it changes at every size. */}
          <Tabs.Root className={styles.counters} value={counter} onValueChange={(v) => setCounter(v as Counter)}>
            <Tabs.List className={styles.counterTabs} aria-label={DOJO_TEXT.counters}>
              {COUNTERS.map((c) => (
                <CounterTab key={c} counter={c} left={counts[c]} price={c === 'tutor' ? movePrice : c === 'eggs' ? eggPrice : abilityPrice} />
              ))}
            </Tabs.List>

            <Tabs.Content value="tutor" className={styles.service}>
              <h2 className={styles.colTitle}>
                {DOJO_TEXT.heading.tutor(species.name)}
                <InfoDot tip={tutorTip()} />
              </h2>
              {tutorList.length === 0 ? (
                <p className={styles.empty}>{DOJO_TEXT.noTutor}</p>
              ) : (
                <ul className={styles.list}>
                  {tutorList.map((o) => (
                    <MoveOffer key={o.id} {...o} price={movePrice} affordable={canMove} testId={`tutor-${o.id}`} onBuy={() => act({ type: 'teach-move', uid, moveId: o.id })} />
                  ))}
                </ul>
              )}
            </Tabs.Content>

            <Tabs.Content value="eggs" className={styles.service} data-testid="dojo-eggs">
              <h2 className={styles.colTitle}>
                {DOJO_TEXT.heading.eggs(species.name)}
                <InfoDot tip={eggMovesTip()} />
              </h2>
              {eggList.length === 0 ? (
                <p className={styles.empty}>{DOJO_TEXT.noEggs}</p>
              ) : (
                <ul className={styles.list}>
                  {eggList.map((o) => (
                    <MoveOffer key={o.id} {...o} price={eggPrice} affordable={canEgg} testId={`egg-${o.id}`} onBuy={() => act({ type: 'teach-egg-move', uid, moveId: o.id })} />
                  ))}
                </ul>
              )}
            </Tabs.Content>

            <Tabs.Content value="passive" className={styles.service}>
              <h2 className={styles.colTitle}>
                {DOJO_TEXT.heading.passive(species.name)}
                <InfoDot tip={passiveTip()} />
              </h2>
              <ul className={styles.list}>
                {abilities.map(({ id, def, equipped, locked }) => {
                  const inert = def.hook === 'none';
                  return (
                    <li key={id}>
                      <Tipped
                        as="button"
                        type="button"
                        tip={<Tip title={def.name} meta={['Ability', 'Passive', ...(locked ? ['Hidden'] : [])]} body={def.description} footer={locked ? RUN_REJECT_TEXT['ability-locked'] : inert ? 'No effect until a later version.' : equipped ? 'Already equipped.' : 'Replaces the current passive. One slot per Pokémon.'} />}
                        className={`${styles.offer} ${equipped ? styles.off : !canAbility || locked ? styles.short : ''}`}
                        disabled={equipped || !canAbility || locked}
                        onClick={() => act({ type: 'set-ability', uid, abilityId: id })}
                        data-testid={`ability-${id}`}
                        data-locked={locked || undefined}
                      >
                        <span className={styles.offerBody}>
                          <span className={`${styles.offerName} display`}>{locked ? '🧬 ' : ''}{def.name}</span>
                          <span className={styles.offerMeta}>
                            {def.description}
                            {/* Honesty over polish: a Region-1 passive that waits on a system this build does not
                                have yet says so rather than selling a no-op. */}
                            {inert && ' · no effect until a later version'}
                            {locked && ' · hidden ability — opens at Bond rank 3'}
                          </span>
                        </span>
                        {equipped ? <span className={styles.tag}>equipped</span> : locked ? <span className={styles.tag}>locked</span> : <Price amount={abilityPrice} affordable={canAbility} />}
                      </Tipped>
                    </li>
                  );
                })}
              </ul>
            </Tabs.Content>
          </Tabs.Root>

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
      </footer>

    </main>
  );
}

/** A counter's tab: its name, and how much of it this Pokémon has left to buy — the number explained on hover. */
function CounterTab({ counter, left, price }: { counter: Counter; left: number; price: number }) {
  const tip = useTip(counterTabTip(DOJO_TEXT.tab[counter], left, price));
  return (
    <Tabs.Trigger value={counter} className={styles.counterTab} data-testid={`dojo-tab-${counter}`} aria-label={DOJO_TEXT.tabLabel(DOJO_TEXT.tab[counter], left)} {...tip}>
      {COUNTER_ICON[counter]}
      {DOJO_TEXT.tab[counter]}
      <span className={`${styles.tabCount} tabular`} aria-hidden="true">{left}</span>
    </Tabs.Trigger>
  );
}

/** One move on a Dojo counter — the tutor's or the scrolls': its type, its card line, and its price or a tick. */
function MoveOffer({ move, known, price, affordable, testId, onBuy }: { move: MoveDef; known: boolean; price: number; affordable: boolean; testId: string; onBuy: () => void }) {
  return (
    <li>
      <Tipped
        as="button"
        type="button"
        tip={moveDefTip(move)}
        className={`${styles.offer} ${known ? styles.off : !affordable ? styles.short : ''}`}
        disabled={known || !affordable}
        onClick={onBuy}
        data-testid={testId}
      >
        <TypeBadge type={move.type} size={18} />
        <span className={styles.offerBody}>
          <span className={`${styles.offerName} display`}>{move.name}</span>
          <span className={styles.offerMeta}>
            {[move.range, move.role, move.power > 0 ? `${move.power} power` : null, known ? 'already known' : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className={`${styles.ap} tabular`}>{move.apCost} AP</span>
        {known ? <IconCheck size={16} /> : <Price amount={price} affordable={affordable} />}
      </Tipped>
    </li>
  );
}
