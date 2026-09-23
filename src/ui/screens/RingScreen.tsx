import { useState } from 'react';
import { IconCheck, IconSparkles, IconSwords, IconTrophy } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { boxCapacity, rarePickOpen, RING, type RingRung } from '@/sim';
import { trainerSprite } from '@/ui/art';
import { BoxPanel } from '@/ui/components/BoxPanel';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money } from '@/ui/components/Money';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import { bankedTip, moneyTip, ringTip, rungTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import styles from './RingScreen.module.css';

// §2.9.4.1 — the Challenge Ring, between rungs. The decision is the whole design: the ladder with what each
// rung pays, the next rival in full (Pillar 1), your Box as the last rung left it — nothing heals here — and two
// buttons: fight the next rung, or take what the ladder has banked and leave.

const prizeLabel = (rung: RingRung, rare: boolean) => ('money' in rung.prize ? `${rung.prize.money} ₽` : `${rare ? 'Rare relic' : 'Relic'}, 1 of 3`);

const RUNG_CLASS = { won: styles.won, next: styles.next, ahead: styles.ahead } as const;

export function RingScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const startRingFight = useRunStore((s) => s.startRingFight);
  const goTo = useAppStore((s) => s.goTo);
  const content = getContent();
  const [toast, setToast] = useState<string | null>(null);

  const ring = run.city!.ring!;
  const rare = rarePickOpen(content, run.relics, run.perks.relicPool, RING.pickCount);
  const next = ring.rungs[ring.cleared] ?? null;
  const healthy = run.activeUids.some((u) => (run.box.find((m) => m.uid === u)?.hp ?? 0) > 0);

  function say(reason: string | undefined) {
    setToast(RUN_REJECT_TEXT[reason ?? ''] ?? 'Not now.');
    window.setTimeout(() => setToast(null), 2600);
  }
  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) say(useRunStore.getState().lastRejected?.reason);
  }
  function fight() {
    if (startRingFight()) goTo('combat');
    else say(useRunStore.getState().lastRejected?.reason);
  }
  const toggleActive = (uid: string) => {
    const on = run.activeUids.includes(uid);
    act({ type: 'set-active', uids: on ? run.activeUids.filter((u) => u !== uid) : [...run.activeUids, uid].slice(-3) });
  };

  return (
    <main className={styles.root} data-testid="ring-screen">
      <header className={styles.topBar}>
        <h1 className={`${styles.title} display`}>
          <IconTrophy size={26} aria-hidden="true" /> Challenge Ring
          <InfoDot tip={ringTip()} />
        </h1>
        <div className={styles.purse}>
          <Tipped tip={bankedTip(ring.banked)} className={styles.banked} data-testid="ring-banked">
            Banked <Money amount={ring.banked} size={18} />
          </Tipped>
          <Tipped tip={moneyTip(run.money)} className={styles.wallet}>
            <Money amount={run.money} size={18} />
          </Tipped>
        </div>
      </header>

      <div className={styles.body}>
        {/* The ladder, top rung at the top: what each pays, and where you stand. */}
        <ol className={styles.ladder} aria-label="The ladder" data-testid="ring-ladder">
          {[...ring.rungs].map((rung, i) => ({ rung, i })).reverse().map(({ rung, i }) => {
            const state = i < ring.cleared ? 'won' : i === ring.cleared ? 'next' : 'ahead';
            const level = Math.min(...rung.team.map((m) => m.level));
            return (
              <li key={i}>
                <Tipped tip={rungTip(i, prizeLabel(rung, rare), level, state, i === ring.rungs.length - 1)} className={`${styles.rung} ${RUNG_CLASS[state]}`} data-testid={`ring-rung-${i}`} data-state={state}>
                  {/* The number stays on every rung; a won rung adds its tick, the next one is lit by its frame. */}
                  <span className={styles.rungMark} aria-hidden="true">
                    {state === 'won' ? <IconCheck size={18} /> : i + 1}
                  </span>
                  <span className="sr-only">Rung {i + 1}{state === 'won' ? ', won' : state === 'next' ? ', next' : ''}:</span>
                  <span className={styles.rungPrize}>
                    {'money' in rung.prize ? <Money amount={rung.prize.money} size={16} /> : <><IconSparkles size={16} aria-hidden="true" /> {rare ? 'Rare relic' : 'Relic'}</>}
                  </span>
                  <span className={styles.rungLevel}>Lv {level}+</span>
                </Tipped>
              </li>
            );
          })}
        </ol>

        {/* The next rival, in full: you always see what you are about to fight. */}
        {next && (
          <section className={styles.rival} aria-label="Next rival" data-testid="ring-rival">
            <img className={styles.sprite} src={trainerSprite(next.sprite)} alt="" width={96} height={96} />
            <div className={styles.rivalBody}>
              <h2 className={`${styles.rivalName} display`}>{next.trainer}</h2>
              <ul className={styles.team}>
                {next.team.map((m, k) => {
                  const s = content.species(m.species);
                  return (
                    <li key={`${m.species}-${k}`} className={styles.member}>
                      <MonIcon speciesId={s.id} size={40} />
                      <span className={styles.memberName}>{s.name}</span>
                      <b className="tabular">Lv {m.level}</b>
                      <span className={styles.types}>
                        {s.types.map((t) => <TypeBadge key={t} type={t} size={12} />)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        <aside className={styles.side} aria-label="Who fights">
          <BoxPanel
            box={run.box}
            activeUids={run.activeUids}
            capacity={boxCapacity(run)}
            onToggleActive={toggleActive}
            onSetLead={(uid) => act({ type: 'set-lead', uid })}
            onOpenMoves={null}
          />
        </aside>
      </div>

      <footer className={styles.footer}>
        {toast && <p className={styles.toast} role="status">{toast}</p>}
        <p className="sr-only" role="status" aria-live="polite">{run.log.slice(-1).join(' ')}</p>
        <button type="button" className={styles.cashOut} onClick={() => act({ type: 'ring-cash-out' })} data-testid="btn-ring-cash-out">
          {ring.banked ? <>Cash out <Money amount={ring.banked} size={16} /></> : 'Walk away'}
        </button>
        {next && (
          <button type="button" className={styles.fight} onClick={fight} disabled={!healthy} data-testid="btn-ring-fight">
            <IconSwords size={18} aria-hidden="true" /> Fight rung {ring.cleared + 1}
          </button>
        )}
      </footer>
    </main>
  );
}
