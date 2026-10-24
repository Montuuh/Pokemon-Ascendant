import { Dialog } from 'radix-ui';
import { IconArrowLeft } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { maxHpOf, REGION_COUNT, type RunState } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { RUN_END_TEXT } from '@/ui/strings';
import { AccountSummary } from '../hub/AccountSummary';
import styles from './RunRecord.module.css';

/** §8.3 / §9.12.3 — the existing account ledger and full run record, behind the final team's door. */
export function RunRecord({ run, won }: { run: RunState; won: boolean }) {
  const content = getContent();
  const depth = run.position ? (run.map.nodes[run.position]?.layer ?? -1) + 1 : 0;
  const metrics = [
    {
      label: RUN_END_TEXT.metrics.regions,
      value: `${won ? run.regionIndex + 1 : run.regionIndex} / ${REGION_COUNT}`,
    },
    { label: RUN_END_TEXT.metrics.nodes, value: String(run.stats.nodesCleared) },
    { label: RUN_END_TEXT.metrics.fights, value: String(run.stats.combatsWon) },
    { label: RUN_END_TEXT.metrics.turns, value: String(run.stats.turnsPlayed) },
    { label: RUN_END_TEXT.metrics.catches, value: String(run.stats.catches) },
    { label: RUN_END_TEXT.metrics.faints, value: String(run.stats.faints) },
    ...(won ? [] : [{ label: RUN_END_TEXT.metrics.depth, value: RUN_END_TEXT.depth(depth, run.map.layers) }]),
  ];
  return (
    <Dialog.Portal>
      <Dialog.Overlay className={styles.scrim} />
      <Dialog.Content className={styles.record} aria-describedby={undefined} data-testid="run-record">
        <header className={styles.head}>
          <Dialog.Title className={`${styles.title} display`}>{RUN_END_TEXT.progress}</Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              className={styles.close}
              aria-label={RUN_END_TEXT.closeRecord}
              data-testid="btn-close-run-record"
            >
              <IconArrowLeft size={20} aria-hidden="true" />
              {RUN_END_TEXT.closeRecord}
            </button>
          </Dialog.Close>
        </header>
        <div className={styles.body}>
          <AccountSummary />
          <dl className={styles.metrics}>
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd className="display tabular">{metric.value}</dd>
              </div>
            ))}
          </dl>
          <h2 className={`${styles.sectionTitle} display`}>{RUN_END_TEXT.team}</h2>
          <ul className={styles.team}>
            {run.box.map((mon) => (
              <li key={mon.uid}>
                <MonIcon speciesId={mon.speciesId} size={32} />
                <span className={`${styles.name} display`}>{content.species(mon.speciesId).name}</span>
                <span className="tabular">Lv {mon.level}</span>
                <span className="tabular">
                  {mon.hp}/{maxHpOf(mon, content)} HP
                </span>
                {mon.traumaStacks > 0 && <span>{RUN_END_TEXT.trauma(mon.traumaStacks)}</span>}
              </li>
            ))}
          </ul>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
