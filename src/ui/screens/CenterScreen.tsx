import { useEffect, useState } from 'react';
import { IconBuildingWarehouse, IconHeartPlus, IconLock, IconSparkles, IconZzz } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { boxCapacity, daycarePrice, runHelpers, therapyPrice, type PartyMon } from '@/sim';
import { BoxPanel } from '@/ui/components/BoxPanel';
import { MonIcon } from '@/ui/components/MonIcon';
import { MoveManager } from '@/ui/components/MoveManager';
import { HpBar } from '@/ui/components/HpBar';
import { Money, Price } from '@/ui/components/Money';
import { SupplyStrip } from '@/ui/components/SupplyStrip';
import { BACK_TO_TOWN, CENTER_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { centerTip, daycareRowTip, daycareTip, pcBoxTip, therapyTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { BackButton } from '@/ui/components/BackButton';
import styles from './CenterScreen.module.css';

// Pokémon Center, §2.11.1 + §8.2.4 — "the warmest screen" (docs/design/ui/screens.md 4.6). A City building:
// its door leads back to the town.
//
// The heal already happened: it is free, automatic and total, so it is reported rather than offered. What is
// left are three counters side by side. Therapy — §8.2.4 prices it at 100 × (1 + stacks), so the Pokémon you have
// been leaning on hardest is also the most expensive to mend. The Daycare — a whole level for a fight sat out,
// once a visit. The PC Box — the map's Box panel brought indoors, because a City lobby has no map beside it: the
// team, the Lead and the moves are chosen here before the next door.

export function CenterScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [toast, setToast] = useState<string | null>(null);
  const [managing, setManaging] = useState<string | null>(null);

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
    act({ type: 'set-active', uids: on ? run.activeUids.filter((u) => u !== uid) : [...run.activeUids, uid].slice(-3) });
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
      ...(s.evolveLevel !== undefined && next >= s.evolveLevel && mon.level < s.evolveLevel ? [`Ready to evolve.`] : []),
    ];
  };

  return (
    <main className={styles.root} data-testid="center-screen">
      <header className={styles.topBar}>
        <BackButton label={BACK_TO_TOWN} onClick={() => act({ type: 'leave-center' })} testId="btn-leave-center" />
        <div>
          <h1 className={`${styles.title} display`}>
            <IconHeartPlus size={26} /> Pokémon Center
          </h1>
          <p className={styles.sub}>
            {CENTER_TEXT.healed}
            <InfoDot tip={centerTip()} />
          </p>
          {/* §2.11.1 — the first visit's supplies (v0.8.6), shown for this visit only. */}
          <SupplyStrip ids={run.lastGift ?? []} testId="center-gift" />
        </div>
        <span className={styles.wallet} data-testid="center-money">
          <Money amount={run.money} size={18} />
          <span className={styles.walletLabel}>in hand</span>
        </span>
      </header>

      <div className={styles.body}>
        {/* Therapy: one Trauma stack off, priced by how bad it already is. */}
        <section className={styles.service} aria-label={CENTER_TEXT.therapy}>
          <h2 className={styles.colTitle}>
            <IconSparkles size={16} aria-hidden="true" /> {CENTER_TEXT.therapy}
            <InfoDot tip={therapyTip()} />
          </h2>
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
                    <button
                      type="button"
                      className={`${styles.patient} ${affordable ? '' : styles.off}`}
                      disabled={!affordable}
                      onClick={() => act({ type: 'use-therapy', uid: mon.uid })}
                      data-testid={`therapy-${s.id}`}
                      aria-label={affordable ? `Therapy for ${s.name}: take one Trauma stack off` : `Therapy for ${s.name}: not enough money`}
                    >
                      <MonIcon speciesId={s.id} size={44} />
                      <span className={styles.patientBody}>
                        <span className={`${styles.patientName} display`}>{s.name}</span>
                        <span className={styles.patientMeta}>
                          Lv {mon.level} · Trauma {mon.traumaStacks} · Max HP {max}
                        </span>
                        {/* §8.2.1 — Trauma is a Max-HP tax, so the bar shows what it has already taken away. */}
                        <HpBar hp={mon.hp} maxHp={max} />
                      </span>
                      <Price amount={price} affordable={affordable} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* The Daycare: a whole level, and the Pokémon sits out the next fight. Once a visit. */}
        <section className={styles.service} aria-label={CENTER_TEXT.daycare} data-testid="center-daycare">
          <h2 className={styles.colTitle}>
            <IconZzz size={16} aria-hidden="true" /> {CENTER_TEXT.daycare}
            <InfoDot tip={daycareTip(dayPrice)} />
          </h2>
          {daycareUsed ? (
            <p className={styles.empty} data-testid="daycare-used">
              {resting ? CENTER_TEXT.resting(content.species(resting.speciesId).name) : CENTER_TEXT.daycareDone}
            </p>
          ) : (
            <ul className={styles.list}>
              {run.box.map((mon) => {
                const s = content.species(mon.speciesId);
                const affordable = run.money >= dayPrice;
                const partnered = othersFor(mon);
                const open = affordable && partnered;
                const blocked = !partnered ? RUN_REJECT_TEXT['needs-another']! : !affordable ? RUN_REJECT_TEXT['cannot-afford']! : null;
                return (
                  <li key={mon.uid}>
                    {/* aria-disabled, not disabled: a row that cannot be taken still opens its bubble to say why. */}
                    <Tipped
                      as="button"
                      type="button"
                      tip={daycareRowTip(s.name, mon.level + 1, bringsFor(mon), blocked)}
                      className={`${styles.patient} ${open ? '' : styles.off}`}
                      aria-disabled={!open}
                      onClick={() => open && act({ type: 'daycare', uid: mon.uid })}
                      data-testid={`daycare-${s.id}`}
                      aria-label={`Daycare for ${s.name}: level ${mon.level} to ${mon.level + 1}, sits out the next fight${blocked ? `, ${blocked}` : ''}`}
                    >
                      <MonIcon speciesId={s.id} size={44} />
                      <span className={styles.patientBody}>
                        <span className={`${styles.patientName} display`}>{s.name}</span>
                        <span className={`${styles.patientMeta} tabular`}>
                          Lv {mon.level} → <b>{mon.level + 1}</b>
                        </span>
                      </span>
                      {partnered ? <Price amount={dayPrice} affordable={affordable} /> : <span className={styles.lock}><IconLock size={14} aria-hidden="true" /> {CENTER_TEXT.alone}</span>}
                    </Tipped>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* The PC Box: the map's Box panel, indoors. */}
        <section className={`${styles.service} ${styles.pc}`} aria-label={CENTER_TEXT.pcBox} data-testid="center-pc">
          <h2 className={styles.colTitle}>
            <IconBuildingWarehouse size={16} aria-hidden="true" /> {CENTER_TEXT.pcBox}
            <InfoDot tip={pcBoxTip()} />
          </h2>
          <BoxPanel
            box={run.box}
            activeUids={run.activeUids}
            capacity={boxCapacity(run)}
            onToggleActive={toggleActive}
            onSetLead={(uid) => act({ type: 'set-lead', uid })}
            onOpenMoves={setManaging}
            stones={run.stones}
            restingUid={run.resting}
          />
        </section>
      </div>

      <footer className={styles.footer}>
        {toast && (
          <p className={styles.toast} role="status" data-testid="center-toast">
            {toast}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {run.log.slice(-1).join(' ')}
        </p>
      </footer>

      {managing && <MoveManager uid={managing} onClose={() => setManaging(null)} />}
    </main>
  );
}
