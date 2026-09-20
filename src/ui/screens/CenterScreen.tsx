import { useState } from 'react';
import { IconDoorExit, IconHeartPlus, IconSparkles } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { runHelpers, therapyPrice, type PartyMon } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { HpBar } from '@/ui/components/HpBar';
import { Money, Price } from '@/ui/components/Money';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import styles from './CenterScreen.module.css';

// Pokémon Center, §2.9.1 + §8.2.4 — "the warmest screen" (docs/design/ui/screens.md 4.6).
//
// The heal already happened: it is free, automatic and total, so it is reported rather than offered. What is
// left is Therapy, and that *is* a decision — §8.2.4 prices it at 100 × (1 + stacks), so the Pokémon you have
// been leaning on hardest is also the most expensive to mend. A Pokémon with no Trauma has nothing to buy.

export function CenterScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [toast, setToast] = useState<string | null>(null);

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  const traumatised = run.box.filter((m) => m.traumaStacks > 0);

  return (
    <main className={styles.root} data-testid="center-screen">
      <header className={styles.topBar}>
        <div>
          <h1 className={`${styles.title} display`}>
            <IconHeartPlus size={26} /> Pokémon Center
          </h1>
          <p className={styles.sub}>
            Everyone is back to full health, and it cost nothing. What the machine cannot fix is the wear —
            that takes a session with the counter staff, and they do charge.
          </p>
        </div>
        <span className={styles.wallet} data-testid="center-money">
          <Money amount={run.money} size={18} />
          <span className={styles.walletLabel}>in hand</span>
        </span>
      </header>

      <section className={styles.body}>
        <h2 className={styles.colTitle}>
          <IconSparkles size={16} /> Therapy — one Trauma stack, {run.box.length === 0 ? '' : 'priced by how bad it already is'}
        </h2>

        {traumatised.length === 0 ? (
          <p className={styles.empty} data-testid="center-no-trauma">
            Nobody is carrying Trauma. Your Box is in better shape than most that get this far.
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
                    title={affordable ? `Take one stack off ${s.name}.` : 'Not enough money.'}
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

        <p className={styles.note}>
          Trauma costs 5 % of Max HP per stack up to five, then 10 % each. It never heals on its own — a
          Centre is the only place it comes off.
        </p>
      </section>

      <footer className={styles.footer}>
        {toast && (
          <p className={styles.toast} role="status" data-testid="center-toast">
            {toast}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {run.log.slice(-1).join(' ')}
        </p>
        <button type="button" className={styles.leave} onClick={() => act({ type: 'leave-center' })} data-testid="btn-leave-center">
          <IconDoorExit size={18} /> Back to the route
        </button>
      </footer>
    </main>
  );
}
