import { useRunStore } from '@/app/runStore';
import { BackButton } from '@/ui/components/BackButton';
import { HealPanel } from '@/ui/components/HealPanel';
import { SupplyStrip } from '@/ui/components/SupplyStrip';
import { RouteStop } from '@/ui/components/RouteStop';
import { SHOP_TEXT } from '@/ui/strings';
import { nurseTip } from '@/ui/tips';
import { InfoDot } from '@/ui/tooltip';
import styles from './AidScreen.module.css';

// §2.9.1 — the field nurse. Not a decision: the heal and the cures land on arrival, so this screen only shows what she
// did — the nurse at work and every bar filling with what it got back (§9.9.3, `HealPanel`) — and lets you walk on, by
// the corner arrow every stop shares. Trauma is a Pokémon Center's work. One visit: her scene, the total directly
// under it and the bars beside it stand as one group, a little over the middle of the window.

export function AidScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);

  return (
    <main className={styles.root} data-testid="aid-screen">
      <div className={styles.corner}>
        <BackButton
          label={SHOP_TEXT.backToRoute}
          onClick={() => dispatch({ type: 'leave-aid' })}
          testId="btn-leave-aid"
        />
      </div>
      <header className={styles.text}>
        <h1 className={`${styles.title} display`}>
          Field nurse
          <InfoDot tip={nurseTip()} />
        </h1>
        {/* §2.9.1 — and what she handed over for the road (v0.8.6). */}
        <SupplyStrip ids={run.lastGift ?? []} testId="aid-gift" />
      </header>

      <HealPanel
        lines={run.lastHeal ?? []}
        box={run.box}
        stamp={run.heals ?? 0}
        variant="nurse"
        stage={<RouteStop kind="aid" />}
        testId="aid-box"
      />

      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')}
      </p>
    </main>
  );
}
