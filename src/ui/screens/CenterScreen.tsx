import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import {
  IconBuildingWarehouse,
  IconHeartFilled,
  IconHeartPlus,
  IconSparkles,
} from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import {
  boxCapacity,
  DEFAULT_PROGRESSION,
  effectiveMax,
  friendshipScale,
  joinTeam,
  therapyPrice,
} from '@/sim';
import { Hearts } from '@/ui/components/Hearts';
import { BoxPanel } from '@/ui/components/BoxPanel';
import { HealPanel } from '@/ui/components/HealPanel';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { hubArt } from '@/ui/art';
import { TeamScreen } from '@/ui/components/TeamScreen';
import { MonIcon } from '@/ui/components/MonIcon';
import { ownedMonTip } from '@/ui/ownedMonTip';
import { MoveManager } from '@/ui/components/MoveManager';
import { HpBar } from '@/ui/components/HpBar';
import { Money, Price } from '@/ui/components/Money';
import { SupplyStrip } from '@/ui/components/SupplyStrip';
import { BACK_TO_TOWN, CENTER_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { centerTip, centerHealTip, friendshipTip, groomTip, pcBoxTip, therapyTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { BackButton } from '@/ui/components/BackButton';
import styles from './CenterScreen.module.css';
import { CENTER_EXIT, CENTER_PEOPLE, CENTER_ROOM, CENTER_SPOTS } from './center/room';

// Pokémon Center, §2.11.1 + §8.2.4 — "the warmest screen" (docs/design/ui/screens.md 4.6). A City building:
// its door leads back to the town.
//
// §2.11.1 — the nurse heals on request, the beds treat Trauma, and the PC manages the Box; §6.3.9 — the lounge grooms.
type Counter = 'heal' | 'therapy' | 'pc' | 'groom';

export function CenterScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [toast, setToast] = useState<string | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [healing, setHealing] = useState(false);
  const [healShown, setHealShown] = useState(false);
  /** §9.12 — the Team screen, from the PC Box. */
  const [team, setTeam] = useState(false);
  const [counter, setCounter] = useState<Counter | null>(null);
  const roomFrame = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const movesDoor = useRef<HTMLElement | null>(null);

  // D9 — use PixelRoom's measured scale and position for the overlay too: the animated machine replaces the map's
  // own machine, pixel for pixel. The report sits in a separate quiet cartridge beside the room.
  useLayoutEffect(() => {
    const frame = roomFrame.current;
    const room = frame?.querySelector<HTMLElement>('[data-testid="center-lobby"]');
    if (!frame || !room) return;
    const fit = () => {
      const scale = Number(room.dataset.scale ?? 2);
      const bounds = room.getBoundingClientRect();
      const parent = frame.getBoundingClientRect();
      frame.style.setProperty('--scene-px', `${scale}px`);
      frame.style.setProperty(
        '--machine-x',
        `${bounds.left - parent.left + (bounds.width - CENTER_ROOM.w * scale) / 2 + CENTER_ROOM.machine[0] * scale}px`,
      );
      frame.style.setProperty(
        '--machine-y',
        `${bounds.top - parent.top + (bounds.height - CENTER_ROOM.h * scale) / 2 + CENTER_ROOM.machine[1] * scale}px`,
      );
    };
    fit();
    const observer = new MutationObserver(fit);
    observer.observe(room, { attributes: true, attributeFilter: ['data-scale'] });
    const resize = new ResizeObserver(fit);
    resize.observe(frame);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);

  const open = (id: Counter) => {
    if (healing) return;
    if (id === 'heal') {
      if (act({ type: 'heal-center' })) { setHealing(true); setHealShown(true); }
      return;
    }
    returnTo.current = document.activeElement as HTMLElement | null;
    setCounter(id);
  };

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
      return false;
    }
    return true;
  }
  // Escape closes the Move Manager, as it does on the map.
  useEffect(() => {
    if (!managing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setManaging(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [managing]);

  const toggleActive = (uid: string) => {
    const on = run.activeUids.includes(uid);
    act({
      type: 'set-active',
      uids: on ? run.activeUids.filter((u) => u !== uid) : joinTeam(run.activeUids, uid, run.box, content),
    });
  };

  const traumatised = run.box.filter((m) => m.traumaStacks > 0);
  const groomPrice = DEFAULT_PROGRESSION.friendship.groomPrice;
  // §6.3.9 Soothe Bell — the gain a grooming gives, as the sim multiplies it.
  const groomGain = DEFAULT_PROGRESSION.friendship.groom * friendshipScale(run, content);

  return (
    <main className={styles.root} data-testid="center-screen" data-counter={counter ?? 'lobby'}>
      <header className={styles.topBar}>
        <BackButton
          label={BACK_TO_TOWN}
          onClick={() => act({ type: 'leave-center' })}
          testId="btn-leave-center"
        />
        <div>
          <h1 className={`${styles.title} display`}>
            <IconHeartPlus size={26} /> Pokémon Center
            <InfoDot tip={centerTip()} />
          </h1>
          {/* §2.11.1 — the first visit's supplies (v0.8.6), shown for this visit only. */}
          <SupplyStrip ids={run.lastGift ?? []} testId="center-gift" />
        </div>
        <span className={styles.wallet} data-testid="center-money">
          <Money amount={run.money} size={18} />
          <span className={styles.walletLabel}>in hand</span>
        </span>
      </header>

      <div ref={roomFrame} className={styles.scene}>
        <div
          className={styles.room}
          inert={healing || undefined}
          data-testid="center-counters"
          data-ready={!healing || undefined}
        >
          <PixelRoom<Counter>
            art={CENTER_ROOM.art}
            w={CENTER_ROOM.w}
            h={CENTER_ROOM.h}
            frame="silhouette"
            scaleStep={0.5}
            maxScale={3}
            label="Pokémon Center"
            testId="center-lobby"
            onChoose={open}
            sprites={[
              { src: hubArt('nurse'), at: CENTER_PEOPLE.nurse },
              { src: hubArt('player'), at: CENTER_PEOPLE.player },
            ]}
            spots={[
              {
                id: 'heal',
                semantics: { kind: 'navigation' },
                boxes: CENTER_SPOTS.heal,
                label: CENTER_TEXT.heal,
                tip: centerHealTip(),
                testId: 'door-center-heal',
              },
              {
                id: 'therapy',
                semantics: { kind: 'dialog', open: counter === 'therapy' },
                boxes: CENTER_SPOTS.therapy,
                label: CENTER_TEXT.therapy,
                tip: therapyTip(),
                testId: 'door-center-therapy',
              },
              {
                id: 'pc',
                semantics: { kind: 'dialog', open: counter === 'pc' },
                boxes: CENTER_SPOTS.pc,
                label: CENTER_TEXT.pcBox,
                tip: pcBoxTip(),
                testId: 'door-center-pc',
              },
              {
                id: 'groom',
                semantics: { kind: 'dialog', open: counter === 'groom' },
                boxes: CENTER_SPOTS.groom,
                label: CENTER_TEXT.groom,
                tip: groomTip(friendshipScale(run, content)),
                testId: 'door-center-groom',
              },
            ]}
            exit={{
              box: CENTER_EXIT,
              label: BACK_TO_TOWN,
              tip: <Tip title={BACK_TO_TOWN} />,
              testId: 'center-exit',
              onExit: () => act({ type: 'leave-center' }),
            }}
          />
        </div>
        <div className={styles.reception}>
          {healShown && <HealPanel
            key={run.heals}
            compactAfterDone
            lines={run.lastHeal ?? []}
            box={run.box}
            stamp={run.heals ?? 0}
            variant="center"
            onDone={() => setHealing(false)}
            testId="center-heal"
            machineStyle={
              {
                position: 'absolute',
                left: 'var(--machine-x)',
                top: 'var(--machine-y)',
                '--px': 'var(--scene-px)',
              } as React.CSSProperties
            }
          />}{!healing && <section className={styles.teamPanel} aria-label="Box health" data-testid="center-health">
            <h2 className={styles.colTitle}>{CENTER_TEXT.pokemon} <InfoDot tip={centerTip()} /></h2>
            <ul className={styles.healthList}>
              {run.box.map((mon) => {
                const max = effectiveMax(run, mon, content);
                const name = content.species(mon.speciesId).name;
                return <li key={mon.uid} className={styles.healthRow} data-testid={`center-health-${mon.uid}`}>
                  <Tipped tip={ownedMonTip(mon)} aria-label={mon.shiny ? `Shiny ${name}` : name}>
                    <MonIcon speciesId={mon.speciesId} shiny={mon.shiny} size={40} />
                  </Tipped>
                  <div className={styles.healthDetails}>
                    <span className={styles.patientName}>{name} <small>Lv {mon.level}</small></span>
                    <HpBar hp={mon.hp} maxHp={max} height={6} />
                    <span className={styles.healthNumbers}>HP {mon.hp}/{max} · Trauma {mon.traumaStacks}</span>
                  </div>
                </li>;
              })}
            </ul>
          </section>}
        </div>
      </div>

      <Dialog.Root
        open={counter !== null}
        onOpenChange={(value) => {
          if (!value) setCounter(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.scrim} />
          <Dialog.Content
            className={styles.counter}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              document.querySelector<HTMLElement>('[data-testid="center-service-back"]')?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnTo.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (team || managing) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (team || managing) event.preventDefault();
            }}
          >
            <div className={styles.counterBack}>
              <BackButton
                label={CENTER_TEXT.lobby}
                onClick={() => setCounter(null)}
                testId="center-service-back"
              />
            </div>
            {/* Therapy: one Trauma stack off, priced by how bad it already is. */}
            {counter === 'therapy' && (
              <section className={styles.service} aria-label={CENTER_TEXT.therapy}>
                <Dialog.Title asChild>
                  <h2 className={styles.colTitle}>
                    <IconSparkles size={16} aria-hidden="true" /> {CENTER_TEXT.therapy}
                    <InfoDot tip={therapyTip()} />
                  </h2>
                </Dialog.Title>
                {traumatised.length === 0 ? (
                  <p className={styles.empty} data-testid="center-no-trauma">
                    {CENTER_TEXT.noTrauma}
                  </p>
                ) : (
                  <ul className={styles.list}>
                    {traumatised.map((mon) => {
                      const s = content.species(mon.speciesId);
                      const price = therapyPrice(mon);
                      const affordable = run.money >= price;
                      const max = effectiveMax(run, mon, content);
                      return (
                        <li key={mon.uid}>
                          <Tipped
                            as="button"
                            tip={ownedMonTip(mon)}
                            type="button"
                            className={`${styles.patient} ${affordable ? '' : styles.off}`}
                            aria-disabled={!affordable || undefined}
                            onClick={() => affordable && act({ type: 'use-therapy', uid: mon.uid })}
                            data-testid={`therapy-${s.id}`}
                            aria-label={
                              affordable
                                ? `Therapy for ${mon.shiny ? 'Shiny ' : ''}${s.name}: take one Trauma stack off`
                                : `Therapy for ${mon.shiny ? 'Shiny ' : ''}${s.name}: not enough money`
                            }
                          >
                            <MonIcon speciesId={s.id} shiny={mon.shiny} size={44} />
                            <span className={styles.patientBody}>
                              <span className={`${styles.patientName} display`}>{s.name}</span>
                              <span className={styles.patientMeta}>
                                Lv {mon.level} · Trauma {mon.traumaStacks} · Max HP {max}
                              </span>
                              {/* §8.2.1 — Trauma is a Max-HP tax, so the bar shows what it has already taken away. */}
                              <HpBar hp={mon.hp} maxHp={max} />
                            </span>
                            <Price amount={price} affordable={affordable} />
                          </Tipped>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* §6.3.9 — the grooming: Friendship for one Pokémon, once each a visit. */}
            {counter === 'groom' && (
              <section className={styles.service} aria-label={CENTER_TEXT.groom}>
                <Dialog.Title asChild>
                  <h2 className={styles.colTitle}>
                    <IconHeartPlus size={16} aria-hidden="true" /> {CENTER_TEXT.groom}
                    <InfoDot tip={groomTip(friendshipScale(run, content))} />
                  </h2>
                </Dialog.Title>
                <ul className={styles.list}>
                  {run.box.map((mon) => {
                    const s = content.species(mon.speciesId);
                    const full = mon.friendship >= DEFAULT_PROGRESSION.friendship.max;
                    const done = run.city?.groomed?.includes(mon.uid) || full;
                    const affordable = run.money >= groomPrice;
                    const name = `${mon.shiny ? 'Shiny ' : ''}${s.name}`;
                    return (
                      <li key={mon.uid}>
                        <Tipped
                          as="button"
                          tip={ownedMonTip(mon, friendshipTip(mon.friendship, mon.speciesId))}
                          type="button"
                          className={`${styles.patient} ${affordable && !done ? '' : styles.off}`}
                          aria-disabled={!affordable || done || undefined}
                          onClick={() => affordable && !done && act({ type: 'groom', uid: mon.uid })}
                          data-testid={`groom-${mon.uid}`}
                          aria-label={full ? CENTER_TEXT.fullLabel(name) : done ? CENTER_TEXT.groomedLabel(name) : affordable ? CENTER_TEXT.groomLabel(name) : `${CENTER_TEXT.groomLabel(name)}: ${CENTER_TEXT.cannotAfford.toLowerCase()}`}
                        >
                          <MonIcon speciesId={s.id} shiny={mon.shiny} size={44} />
                          <span className={styles.patientBody}>
                            <span className={`${styles.patientName} display`}>{s.name}</span>
                            <Hearts friendship={mon.friendship} />
                          </span>
                          {full ? <span className={styles.patientMeta}>{CENTER_TEXT.full}</span> : done ? <span className={styles.gained} data-testid={`groomed-${mon.uid}`}><IconHeartFilled size={14} aria-hidden="true" />{CENTER_TEXT.gained(groomGain)}</span> : <Price amount={groomPrice} affordable={affordable} />}
                        </Tipped>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* §2.11.1 — the PC manages the formation, held items and moves. */}
            {counter === 'pc' && (
              <section className={styles.service} aria-label={CENTER_TEXT.pcBox} data-testid="center-pc">
                <Dialog.Title asChild>
                  <h2 className={styles.colTitle}>
                    <IconBuildingWarehouse size={16} aria-hidden="true" /> {CENTER_TEXT.pcBox}
                    <InfoDot tip={pcBoxTip()} />
                  </h2>
                </Dialog.Title>
                <BoxPanel
                  box={run.box}
                  activeUids={run.activeUids}
                  capacity={boxCapacity(run)}
                  onToggleActive={toggleActive}
                  onSetLead={(uid) => act({ type: 'set-lead', uid })}
                  onOpenMoves={(uid) => {
                    movesDoor.current = document.activeElement as HTMLElement | null;
                    setManaging(uid);
                  }}
                  stones={run.stones}
                  onOpenTeam={() => setTeam(true)}
                />
              </section>
            )}
            <Dialog.Root
              open={managing !== null}
              onOpenChange={(value) => {
                if (!value) setManaging(null);
              }}
            >
              <Dialog.Portal>
                <Dialog.Content
                  className={styles.moveScope}
                  aria-describedby={undefined}
                  onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    document.querySelector<HTMLElement>('[data-testid="btn-close-moves"]')?.focus();
                  }}
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    movesDoor.current?.focus();
                  }}
                >
                  <Dialog.Title className="sr-only">
                    {managing
                      ? content.species(run.box.find((mon) => mon.uid === managing)!.speciesId).name
                      : ''}
                  </Dialog.Title>
                  {managing && <MoveManager uid={managing} onClose={() => setManaging(null)} />}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            {team && <TeamScreen onClose={() => setTeam(false)} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <footer className={styles.footer}>
        {toast && (
          <p className={styles.toast} role="status">
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
