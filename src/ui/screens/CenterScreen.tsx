import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { IconBuildingWarehouse, IconHeartPlus, IconLock, IconSparkles, IconZzz } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { boxCapacity, daycarePrice, joinTeam, runHelpers, therapyPrice, type PartyMon } from '@/sim';
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
import { centerTip, daycareRowTip, daycareTip, pcBoxTip, therapyTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { BackButton } from '@/ui/components/BackButton';
import styles from './CenterScreen.module.css';
import { CENTER_EXIT, CENTER_PEOPLE, CENTER_ROOM, CENTER_SPOTS } from './center/room';

// Pokémon Center, §2.11.1 + §8.2.4 — "the warmest screen" (docs/design/ui/screens.md 4.6). A City building:
// its door leads back to the town.
//
// The heal already happened: it is free, automatic and total, so it is reported rather than offered. What is
// left are three doors in an authored room of authentic FRLG tiles. Therapy — §8.2.4 prices it at 100 × (1 + stacks), so the Pokémon you have
// been leaning on hardest is also the most expensive to mend. The Daycare — a whole level for a fight sat out,
// once a visit. The PC Box — the map's Box panel brought indoors, because a City lobby has no map beside it: the
// team, the Lead and the moves are chosen here before the next door.

type Counter = 'therapy' | 'daycare' | 'pc';

export function CenterScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [toast, setToast] = useState<string | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  // §9.9.3 — the counters open once the machine has run: what it gave is said by the machine, not by the PC's bars first.
  const [healed, setHealed] = useState(false);
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
    if (!healed) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    setCounter(id);
  };

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
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
  const daycareUsed = !!run.city?.daycareUsed;
  const resting = run.resting ? run.box.find((m) => m.uid === run.resting) : undefined;
  const dayPrice = daycarePrice(run, content);
  // §2.11.1 — someone else has to be able to fight while it rests.
  const othersFor = (mon: PartyMon) => run.box.some((m) => m.uid !== mon.uid && m.hp > 0);
  // What the Daycare's level brings, read off the content: the moves learnt at it, and an evolution it makes ready.
  const bringsFor = (mon: PartyMon): string[] => {
    const s = content.species(mon.speciesId);
    const next = mon.level + 1;
    const learnt = s.learnset.filter((l) => l.level === next).map((l) => content.move(l.move).name);
    return [
      ...(learnt.length ? [`Learns ${learnt.join(' and ')}.`] : []),
      ...(s.evolveLevel !== undefined && next >= s.evolveLevel && mon.level < s.evolveLevel
        ? [`Ready to evolve.`]
        : []),
    ];
  };

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
          inert={!healed || undefined}
          data-testid="center-counters"
          data-ready={healed || undefined}
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
                id: 'daycare',
                boxes: CENTER_SPOTS.daycare,
                label: CENTER_TEXT.daycare,
                tip: daycareTip(dayPrice),
                testId: 'door-center-daycare',
              },
              {
                id: 'therapy',
                boxes: CENTER_SPOTS.therapy,
                label: CENTER_TEXT.therapy,
                tip: therapyTip(),
                testId: 'door-center-therapy',
              },
              {
                id: 'pc',
                boxes: CENTER_SPOTS.pc,
                label: CENTER_TEXT.pcBox,
                tip: pcBoxTip(),
                testId: 'door-center-pc',
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
          <HealPanel
            lines={run.lastHeal ?? []}
            box={run.box}
            stamp={run.heals ?? 0}
            variant="center"
            compactAfterDone
            onDone={() => setHealed(true)}
            testId="center-heal"
            machineStyle={
              {
                position: 'absolute',
                left: 'var(--machine-x)',
                top: 'var(--machine-y)',
                '--px': 'var(--scene-px)',
              } as React.CSSProperties
            }
          />
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
                    {traumatised.map((mon: PartyMon) => {
                      const s = content.species(mon.speciesId);
                      const price = therapyPrice(mon);
                      const affordable = run.money >= price;
                      const max = runHelpers.maxHpOf(mon, content);
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
                                ? `Therapy for ${mon.shiny ? "Shiny " : ""}${s.name}: take one Trauma stack off`
                                : `Therapy for ${mon.shiny ? "Shiny " : ""}${s.name}: not enough money`
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

            {/* The Daycare: a whole level, and the Pokémon sits out the next fight. Once a visit. */}
            {counter === 'daycare' && (
              <section
                className={styles.service}
                aria-label={CENTER_TEXT.daycare}
                data-testid="center-daycare"
              >
                <Dialog.Title asChild>
                  <h2 className={styles.colTitle}>
                    <IconZzz size={16} aria-hidden="true" /> {CENTER_TEXT.daycare}
                    <InfoDot tip={daycareTip(dayPrice)} />
                  </h2>
                </Dialog.Title>
                {daycareUsed ? (
                  <p className={styles.empty} data-testid="daycare-used">
                    {resting
                      ? CENTER_TEXT.resting(content.species(resting.speciesId).name)
                      : CENTER_TEXT.daycareDone}
                  </p>
                ) : (
                  <ul className={styles.list}>
                    {run.box.map((mon) => {
                      const s = content.species(mon.speciesId);
                      const affordable = run.money >= dayPrice;
                      const partnered = othersFor(mon);
                      const open = affordable && partnered;
                      const blocked = !partnered
                        ? RUN_REJECT_TEXT['needs-another']!
                        : !affordable
                          ? RUN_REJECT_TEXT['cannot-afford']!
                          : null;
                      return (
                        <li key={mon.uid}>
                          {/* aria-disabled, not disabled: a row that cannot be taken still opens its bubble to say why. */}
                          <Tipped
                            as="button"
                            type="button"
                            tip={ownedMonTip(mon, daycareRowTip(s.name, mon.level + 1, bringsFor(mon), blocked))}
                            className={`${styles.patient} ${open ? '' : styles.off}`}
                            aria-disabled={!open}
                            onClick={() => open && act({ type: 'daycare', uid: mon.uid })}
                            data-testid={`daycare-${s.id}`}
                            aria-label={`Daycare for ${mon.shiny ? 'Shiny ' : ''}${s.name}: level ${mon.level} to ${mon.level + 1}, sits out the next fight${blocked ? `, ${blocked}` : ''}`}
                          >
                            <MonIcon speciesId={s.id} shiny={mon.shiny} size={44} />
                            <span className={styles.patientBody}>
                              <span className={`${styles.patientName} display`}>{s.name}</span>
                              <span className={`${styles.patientMeta} tabular`}>
                                Lv {mon.level} → <b>{mon.level + 1}</b>
                              </span>
                            </span>
                            {partnered ? (
                              <Price amount={dayPrice} affordable={affordable} />
                            ) : (
                              <span className={styles.lock}>
                                <IconLock size={14} aria-hidden="true" /> {CENTER_TEXT.alone}
                              </span>
                            )}
                          </Tipped>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* The PC Box: the map's Box panel, indoors. */}
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
                  restingUid={run.resting}
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
