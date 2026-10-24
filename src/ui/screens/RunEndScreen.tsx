import { Dialog } from 'radix-ui';
import { IconBook2, IconRotateClockwise } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { useAccountStore } from '@/app/accountStore';
import { REGION_COUNT } from '@/sim';
import { RUN_END_TEXT } from '@/ui/strings';
import { runEndProgressTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { TokenIcon } from './hub/TokenIcon';
import { FinalTeam } from './run-end/FinalTeam';
import { RunRecord } from './run-end/RunRecord';
import styles from './RunEndScreen.module.css';

// §9.12.3 — the last team is the ending's picture. What the run kept is one door away, including on defeat.
export function RunEndScreen({ outcome }: { outcome: 'victory' | 'defeat' }) {
  const goTo = useAppStore((s) => s.goTo);
  const run = useRunStore((s) => s.run);
  const abandon = useRunStore((s) => s.abandon);
  const ledger = useAccountStore((s) => s.ledger);
  const won = outcome === 'victory';
  const title = won ? RUN_END_TEXT.victoryTitle : RUN_END_TEXT.defeatTitle;
  const finish = (again: boolean) => {
    abandon();
    goTo(again ? 'starter' : 'menu');
  };
  const depth = run?.position ? (run.map.nodes[run.position]?.layer ?? -1) + 1 : 0;

  return (
    <main className={`${styles.root} ${won ? styles.won : styles.lost}`} data-testid={`${outcome}-screen`}>
      <header className={styles.heading}>
        <h1 className={`${styles.title} display`}>{title}</h1>
        {run && <p className={styles.sub}>{won ? RUN_END_TEXT.victoryLine : RUN_END_TEXT.defeatLine}</p>}
        {run && (
          <span className={`${styles.distance} tabular`} data-testid="run-end-distance">
            {won
              ? RUN_END_TEXT.region(run.regionIndex + 1, REGION_COUNT)
              : RUN_END_TEXT.depth(depth, run.map.layers)}
          </span>
        )}
      </header>
      {run && <FinalTeam box={run.box} badges={run.badges} won={won} />}
      <Dialog.Root>
        <div className={styles.actions}>
          {run && (
            <Dialog.Trigger asChild>
              <Tipped
                as="button"
                type="button"
                tip={runEndProgressTip()}
                className={styles.recordDoor}
                data-testid="btn-run-record"
              >
                <IconBook2 size={20} aria-hidden="true" />
                <span>{RUN_END_TEXT.progress}</span>
                <span className={`${styles.earned} tabular`}>+{ledger.xp} XP</span>
                {ledger.tokens > 0 && (
                  <span className={`${styles.earned} tabular`}>
                    <TokenIcon /> +{ledger.tokens}
                  </span>
                )}
              </Tipped>
            </Dialog.Trigger>
          )}
          <button
            type="button"
            className={styles.continue}
            onClick={() => finish(false)}
            data-testid="btn-end-continue"
          >
            {RUN_END_TEXT.mainMenu}
          </button>
          {run && (
            <button
              type="button"
              className={styles.again}
              onClick={() => finish(true)}
              data-testid="btn-run-again"
            >
              <IconRotateClockwise size={20} aria-hidden="true" />
              {RUN_END_TEXT.runAgain}
            </button>
          )}
        </div>
        {run && <RunRecord run={run} won={won} />}
      </Dialog.Root>
    </main>
  );
}
