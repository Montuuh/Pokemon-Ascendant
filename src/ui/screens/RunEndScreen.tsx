import { Dialog } from 'radix-ui';
import { IconBook2, IconRotateClockwise } from '@tabler/icons-react';
import { FieldReport } from './run-end/FieldReport';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { RUN_END_TEXT } from '@/ui/strings';
import { runEndProgressTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { FinalTeam } from './run-end/FinalTeam';
import { RunRecord } from './run-end/RunRecord';
import { runEndLocation } from './run-end/runEndLocation';
import styles from './RunEndScreen.module.css';

// §9.12.3, §8.3.6 — the last team is the ending's picture, and the Field Report beside it pays the run: what the
// account earned is on the screen, not behind a door. The door that is left opens the run's own numbers.
export function RunEndScreen({ outcome }: { outcome: 'victory' | 'defeat' }) {
  const goTo = useAppStore((s) => s.goTo);
  const run = useRunStore((s) => s.run);
  const abandon = useRunStore((s) => s.abandon);
  const won = outcome === 'victory';
  const title = won ? RUN_END_TEXT.victoryTitle : RUN_END_TEXT.defeatTitle;
  const finish = (again: boolean) => {
    abandon();
    goTo(again ? 'starter' : 'menu');
  };

  return (
    <main className={`${styles.root} ${won ? styles.won : styles.lost}`} data-testid={`${outcome}-screen`}>
      <header className={styles.heading}>
        <h1 className={`${styles.title} display`}>{title}</h1>
        {run && <p className={styles.sub}>{won ? RUN_END_TEXT.victoryLine : RUN_END_TEXT.defeatLine}</p>}
        {run && (
          <span className={`${styles.distance} tabular`} data-testid="run-end-distance">
            {runEndLocation(run)}
          </span>
        )}
      </header>
      {run && (
        <div className={styles.main}>
          <FinalTeam box={run.box} badges={run.badges} won={won} />
          <FieldReport won={won} />
        </div>
      )}
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
