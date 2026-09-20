import styles from './FloatingNumbers.module.css';

export interface FloatingFx {
  id: number;
  uid: string;
  kind: 'damage' | 'heal' | 'status' | 'text';
  text: string;
  emphasis?: 'crit' | 'super' | 'weak' | 'immune';
}

/** Transient combat numbers anchored to a combatant card (spawned from sim events by useCombatFx). */
export function FloatingNumbers({ uid, fx }: { uid: string; fx: FloatingFx[] }) {
  const mine = fx.filter((f) => f.uid === uid);
  if (mine.length === 0) return null;
  return (
    <div className={styles.layer} aria-hidden="true">
      {mine.map((f, i) => (
        <span
          key={f.id}
          className={[styles.num, styles[f.kind], f.emphasis ? styles[f.emphasis] : ''].join(' ')}
          style={{ animationDelay: `${i * 90}ms`, left: `${50 + ((i % 3) - 1) * 14}%` }}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
