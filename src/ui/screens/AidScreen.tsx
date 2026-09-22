import { IconDoorExit } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { runHelpers, type PartyMon } from '@/sim';
import { trainerSprite } from '@/ui/art';
import { HpBar } from '@/ui/components/HpBar';
import { MonIcon } from '@/ui/components/MonIcon';
import { nurseTip, partyTip } from '@/ui/tips';
import { InfoDot, useTip } from '@/ui/tooltip';
import styles from './AidScreen.module.css';

// §2.9.1 — the field nurse. Not a decision: the heal and the cures land on arrival, so this screen only shows
// what she did — the Box, with its HP after her — and lets you walk on. Trauma is a Pokémon Center's work.

export function AidScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);

  return (
    <main className={styles.root} data-testid="aid-screen">
      <section className={styles.card}>
        <img className={styles.nurse} src={trainerSprite('nurse')} alt="" width={120} height={120} />
        <div className={styles.text}>
          <h1 className={`${styles.title} display`}>
            Field nurse
            <InfoDot tip={nurseTip()} />
          </h1>
          <p className={styles.sub}>Everyone is patched up.</p>
        </div>
      </section>

      <ul className={styles.box} aria-label="Your Box after the nurse" data-testid="aid-box">
        {run.box.map((m) => (
          <Patient key={m.uid} mon={m} />
        ))}
      </ul>

      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')}
      </p>
      <button type="button" className={styles.leave} onClick={() => dispatch({ type: 'leave-aid' })} data-testid="btn-leave-aid">
        <IconDoorExit size={18} /> Back to the route
      </button>
    </main>
  );
}

function Patient({ mon }: { mon: PartyMon }) {
  const content = getContent();
  const s = content.species(mon.speciesId);
  const max = runHelpers.maxHpOf(mon, content);
  const tip = useTip(partyTip(s.name, mon.level, mon.hp, max, mon.status?.kind ?? null, mon.traumaStacks));
  return (
    <li className={styles.patient} tabIndex={0} aria-label={`${s.name}, ${mon.hp} of ${max} HP`} {...tip}>
      <MonIcon speciesId={s.id} size={44} />
      <span className={`${styles.name} display`}>{s.name}</span>
      <HpBar hp={mon.hp} maxHp={max} height={8} />
    </li>
  );
}
