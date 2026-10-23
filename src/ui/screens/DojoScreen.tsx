import { useState, type ReactNode } from 'react';
import { Dialog, Tabs } from 'radix-ui';
import { IconBook, IconCheck, IconEgg, IconLock, IconPlus, IconSparkles, IconX } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { asset } from '@/content/paths';
import { abilityLocked, dojoPrice, eggMovesFor, tutorListFor, type MoveDef } from '@/sim';
import { moveArt } from '@/ui/art';
import { MoveManager } from '@/ui/components/MoveManager';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money, Price } from '@/ui/components/Money';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { PixelSprite } from '@/ui/components/PixelSprite';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { BACK_TO_TOWN, DOJO_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { counterTabTip, dojoTip, eggMovesTip, moveDefTip, passiveTip, tutorTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped, useTip } from '@/ui/tooltip';
import { BackButton } from '@/ui/components/BackButton';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import styles from './DojoScreen.module.css';

// §2.9.4, §2.9.4.2 — the master's room and the line's scrolls, beside a visual move shelf.
// The original FRLG map includes the master and his pupils. Every service still uses the sim's prices,
// stage-aware lists and gates; learning adds to the pool, while the Move Manager owns the active four.
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
  const [selected, setSelected] = useState<string | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [practiceBeat, setPracticeBeat] = useState(0);
  const motion = useMotionPref();
  const mon = run.box.find((m) => m.uid === uid) ?? run.box[0]!;
  const species = content.species(mon.speciesId);
  // §2.9.4 — including Celadon's +30% and any modifier discount, computed by the sim.
  const movePrice = dojoPrice(run, content, 'move');
  const abilityPrice = dojoPrice(run, content, 'ability');
  const eggPrice = dojoPrice(run, content, 'egg');
  const tutorList = tutorListFor(run, mon, content).map((id) => ({
    id,
    move: content.move(id),
    known: mon.pool.includes(id),
  }));
  const eggList = eggMovesFor(mon, content).map((id) => ({
    id,
    move: content.move(id),
    known: mon.pool.includes(id),
  }));
  // §6.8.3 — hidden abilities remain named, visible and locked until the line's Bond opens them.
  const abilities = species.availableAbilities.map((id) => ({
    id,
    def: content.ability(id),
    equipped: mon.abilityId === id,
    locked: abilityLocked(run, mon.speciesId, id, content),
  }));
  const counts: Record<Counter, number> = {
    tutor: tutorList.filter((o) => !o.known).length,
    eggs: eggList.filter((o) => !o.known).length,
    passive: abilities.filter((a) => !a.equipped && !a.locked).length,
  };
  const offers = counter === 'eggs' ? eggList : tutorList;
  const preview =
    counter !== 'passive' ? (offers.find((o) => o.id === selected) ?? offers[0])?.move : undefined;

  function choose(next: Counter) {
    setCounter(next);
    setSelected(null);
  }
  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  return (
    <main className={styles.root} data-testid="dojo-screen">
      <header className={styles.topBar}>
        <BackButton
          label={BACK_TO_TOWN}
          onClick={() => act({ type: 'leave-dojo' })}
          testId="btn-leave-dojo"
        />
        <h1 className={`${styles.title} display`}>
          {DOJO_TEXT.title}
          <InfoDot tip={dojoTip()} />
        </h1>
        <span className={styles.credits} data-testid="dojo-money">
          <Money amount={run.money} size={18} />
        </span>
      </header>
      <div className={styles.body}>
        <div className={styles.roomWrap} data-practice-beat={practiceBeat % 2}>
          <PixelRoom<Counter>
            art={asset('art/dojo/training-room.png')}
            w={208}
            h={256}
            frame="silhouette"
            scaleStep={0.5}
            label={DOJO_TEXT.room}
            testId="dojo-room"
            chosen={counter}
            onChoose={choose}
            sprites={[
              {
                src: asset(`art/dojo/pokemon/${species.id}${mon.shiny ? '-shiny' : ''}.png`),
                at: [72, 152, 32, 32],
              },
              ...(counter === 'passive'
                ? []
                : [
                    {
                      src: asset(`art/dojo/${counter === 'eggs' ? 'egg' : 'substitute'}.png`),
                      at: [108, 112, 32, 32] as const,
                    },
                  ]),
              ...(selected && preview && motion
                ? [
                    {
                      src: asset(`art/dojo/effects/${preview.id.replace(/(-plus)+$/, '')}.png`),
                      at: [100, 112, 48, 32] as const,
                      onLoad: () => setPracticeBeat((beat) => beat + 1),
                    },
                  ]
                : []),
            ]}
            spots={[
              {
                id: 'tutor',
                boxes: [
                  [94, 73, 20, 23],
                  [28, 64, 32, 40],
                ],
                label: DOJO_TEXT.master,
                ariaLabel: DOJO_TEXT.tab.tutor,
                tip: tutorTip(),
                testId: 'dojo-master',
              },
              {
                id: 'eggs',
                boxes: [
                  [148, 64, 32, 40],
                  [79, 22, 50, 24],
                ],
                label: DOJO_TEXT.scrolls,
                ariaLabel: DOJO_TEXT.tab.eggs,
                tip: eggMovesTip(),
                testId: 'dojo-scrolls',
              },
              {
                id: 'passive',
                boxes: [[175, 155, 17, 23]],
                label: DOJO_TEXT.apprentice,
                ariaLabel: DOJO_TEXT.tab.passive,
                tip: passiveTip(),
                testId: 'dojo-apprentice',
              },
            ]}
          />
        </div>
        <section className={styles.services}>
          <div className={styles.who}>
            <div className={styles.selectedMon}>
              <MonIcon speciesId={species.id} size={40} />
              <h2 className="display">{species.name}</h2>
              {species.types.map((t) => (
                <TypeBadge key={t} type={t} size={12} defenderTypes={species.types} />
              ))}
            </div>
            <Dialog.Root open={deckOpen} onOpenChange={setDeckOpen}>
              <Dialog.Trigger asChild>
                <button type="button" className={styles.deckButton} data-testid="dojo-deck">
                  <IconBook size={18} />
                  {DOJO_TEXT.deck}
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className={styles.scrim} />
                <Dialog.Content
                  className={styles.deckPanel}
                  aria-describedby={undefined}
                  data-testid="dojo-deck-dialog"
                >
                  <div className={styles.deckHeading}>
                    <Dialog.Title className="display">{DOJO_TEXT.deckFor(species.name)}</Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className={styles.close}
                        aria-label={DOJO_TEXT.closeDeck}
                        data-testid="dojo-deck-close"
                      >
                        <IconX size={20} />
                      </button>
                    </Dialog.Close>
                  </div>
                  {preview && (
                    <Tipped
                      tip={moveDefTip(preview)}
                      className={styles.comparison}
                      data-testid="dojo-comparison"
                    >
                      <PixelSprite src={moveArt(preview.id)} alt="" width={136} height={90} />
                      <span>
                        <strong className="display">{preview.name}</strong>
                        <span className={styles.previewStats}>
                          <TypeBadge type={preview.type} size={18} mode="attack" />
                          {preview.apCost} AP{preview.power > 0 && ` · ${preview.power}`}
                        </span>
                      </span>
                    </Tipped>
                  )}
                  <MoveManager uid={uid} onClose={() => setDeckOpen(false)} embedded />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
          <ul className={styles.roster} aria-label={DOJO_TEXT.box}>
            {run.box.map((m) => {
              const s = content.species(m.speciesId);
              return (
                <li key={m.uid}>
                  <Tipped
                    as="button"
                    type="button"
                    tip={<Tip title={s.name} meta={[`Lv ${m.level}`, `${m.pool.length} moves learned`]} />}
                    className={styles.pick}
                    onClick={() => {
                      setUid(m.uid);
                      setSelected(null);
                    }}
                    aria-pressed={m.uid === uid}
                    data-testid={`dojo-pick-${s.id}`}
                    aria-label={`${s.name}, level ${m.level}, ${m.pool.length} moves learned`}
                  >
                    <MonIcon speciesId={s.id} size={32} />
                  </Tipped>
                </li>
              );
            })}
          </ul>
          <Tabs.Root className={styles.counters} value={counter} onValueChange={(v) => choose(v as Counter)}>
            <Tabs.List className={styles.counterTabs} aria-label={DOJO_TEXT.counters}>
              {COUNTERS.map((c) => (
                <CounterTab
                  key={c}
                  counter={c}
                  left={counts[c]}
                  price={c === 'tutor' ? movePrice : c === 'eggs' ? eggPrice : abilityPrice}
                />
              ))}
            </Tabs.List>
            {(['tutor', 'eggs'] as const).map((c) => {
              const list = c === 'tutor' ? tutorList : eggList;
              const price = c === 'tutor' ? movePrice : eggPrice;
              return (
                <Tabs.Content
                  key={c}
                  value={c}
                  className={styles.service}
                  data-testid={c === 'eggs' ? 'dojo-eggs' : 'dojo-tutor'}
                >
                  {list.length === 0 ? (
                    <p className={styles.empty}>{c === 'tutor' ? DOJO_TEXT.noTutor : DOJO_TEXT.noEggs}</p>
                  ) : (
                    <ul className={styles.shelf}>
                      {list.map((o) => (
                        <MoveOffer
                          key={o.id}
                          {...o}
                          price={price}
                          affordable={run.money >= price}
                          selected={preview?.id === o.id}
                          testId={`${c === 'tutor' ? 'tutor' : 'egg'}-${o.id}`}
                          counter={c}
                          onSelect={() => {
                            setSelected(o.id);
                            setPracticeBeat((n) => n + 1);
                          }}
                          onBuy={() => {
                            setSelected(o.id);
                            act({ type: c === 'tutor' ? 'teach-move' : 'teach-egg-move', uid, moveId: o.id });
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </Tabs.Content>
              );
            })}
            <Tabs.Content value="passive" className={styles.service}>
              <ul className={styles.abilities}>
                {abilities.map(({ id, def, equipped, locked }) => (
                  <li key={id}>
                    <Tipped
                      as="div"
                      tabIndex={equipped || run.money < abilityPrice || locked ? 0 : -1}
                      tip={
                        <Tip
                          title={def.name}
                          meta={['Ability', 'Passive', ...(locked ? ['Hidden'] : [])]}
                          body={def.description}
                          footer={
                            locked
                              ? RUN_REJECT_TEXT['ability-locked']
                              : def.hook === 'none'
                                ? 'No effect until a later version.'
                                : equipped
                                  ? 'Already equipped.'
                                  : 'Replaces the current passive. One slot per Pokémon.'
                          }
                        />
                      }
                    >
                      <button
                        type="button"
                        className={styles.ability}
                        disabled={equipped || run.money < abilityPrice || locked}
                        onClick={() => act({ type: 'set-ability', uid, abilityId: id })}
                        data-testid={`ability-${id}`}
                        data-locked={locked || undefined}
                      >
                        <span className={styles.abilityIcon}>
                          {locked ? (
                            <IconLock size={28} />
                          ) : equipped ? (
                            <IconCheck size={28} />
                          ) : (
                            <IconSparkles size={28} />
                          )}
                        </span>
                        <span className={`${styles.offerName} display`}>{def.name}</span>
                        {equipped ? (
                          <span className={styles.tag}>{DOJO_TEXT.equipped}</span>
                        ) : locked ? (
                          <span className={styles.tag}>{DOJO_TEXT.locked}</span>
                        ) : (
                          <Price amount={abilityPrice} affordable={run.money >= abilityPrice} />
                        )}
                      </button>
                    </Tipped>
                  </li>
                ))}
              </ul>
            </Tabs.Content>
          </Tabs.Root>
        </section>
      </div>
      {toast && (
        <p className={styles.toast} role="status">
          {toast}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')}
      </p>
    </main>
  );
}

function CounterTab({ counter, left, price }: { counter: Counter; left: number; price: number }) {
  const tip = useTip(counterTabTip(DOJO_TEXT.tab[counter], left, price));
  return (
    <Tabs.Trigger
      value={counter}
      className={styles.counterTab}
      data-testid={`dojo-tab-${counter}`}
      aria-label={DOJO_TEXT.tabLabel(DOJO_TEXT.tab[counter], left)}
      {...tip}
    >
      {COUNTER_ICON[counter]}
      {DOJO_TEXT.tab[counter]}
      <span className={`${styles.tabCount} tabular`} aria-hidden="true">
        {left}
      </span>
    </Tabs.Trigger>
  );
}

// A focusable preview remains available when the purchase is locked, so a player can inspect what to save for.
function MoveOffer({
  move,
  known,
  price,
  affordable,
  selected,
  testId,
  counter,
  onSelect,
  onBuy,
}: {
  move: MoveDef;
  known: boolean;
  price: number;
  affordable: boolean;
  selected: boolean;
  testId: string;
  counter: Counter;
  onSelect: () => void;
  onBuy: () => void;
}) {
  return (
    <li className={styles.moveCard} data-selected={selected} data-known={known}>
      <Tipped
        as="button"
        type="button"
        tip={moveDefTip(move)}
        className={styles.preview}
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${DOJO_TEXT.preview}: ${move.name}`}
        data-testid={`dojo-preview-${counter}-${move.id}`}
      >
        <span className={styles.artWindow}>
          <PixelSprite src={moveArt(move.id)} alt="" width={136} height={90} />
        </span>
        <span className={`${styles.offerName} display`}>{move.name}</span>
        <span className={styles.moveMeta}>
          <TypeBadge type={move.type} size={12} mode="attack" />
          <span className="tabular">{move.apCost} AP</span>
        </span>
      </Tipped>
      <button
        type="button"
        className={styles.buy}
        disabled={known || !affordable}
        onClick={onBuy}
        data-testid={testId}
        aria-label={`${known ? DOJO_TEXT.known : DOJO_TEXT.learn} ${move.name}, ${price} ₽`}
      >
        {known ? (
          <>
            <IconCheck size={16} aria-hidden="true" />
            {DOJO_TEXT.known}
          </>
        ) : (
          <>
            <IconPlus size={16} aria-hidden="true" />
            {DOJO_TEXT.learn}
            <Price amount={price} affordable={affordable} />
          </>
        )}
      </button>
    </li>
  );
}
