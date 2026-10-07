import type { CSSProperties } from 'react';
import { itemIcon, spriteOf } from '@/ui/art';
import { catchMs, FX_MS, type CatchFx, type Ghost, type SpriteSlot } from '@/ui/hooks/useCombatFx';
import styles from './ArenaFx.module.css';

// §9.9 — the arena's beats that outlive the sim's state (v0.9.3): a Pokémon that has fainted or been caught is no
// longer on the field when its event arrives, so it is drawn here one more time, where it stood. The catch is drawn
// whole: the ball thrown, the Pokémon drawn into it, the ball landing and rocking as many times as the odds earned,
// and the click or the burst — to a result the sim rolled before the throw left the hand (§2.6.4).

export function ArenaFx({ ghosts, catching, slotClass }: { ghosts: readonly Ghost[]; catching: CatchFx | null; slotClass: (slot: SpriteSlot) => string }) {
  return (
    <>
      {ghosts.map((g) => (
        <div key={g.id} className={`${slotClass(g.slot)} ${styles.ghost} fx-ghost-${g.kind}`} data-testid="arena-ghost" data-kind={g.kind} aria-hidden="true">
          <span className="fx-ghost-body">
            <img className="pixel" src={spriteOf({ speciesId: g.speciesId }, g.slot === 'player' ? 'back' : 'front', g.shiny)} alt="" draggable={false} />
          </span>
        </div>
      ))}
      {catching && <CatchBeat key={catching.id} c={catching} slotClass={slotClass} />}
    </>
  );
}

function CatchBeat({ c, slotClass }: { c: CatchFx; slotClass: (slot: SpriteSlot) => string }) {
  const pct = Math.round(c.chance * 100);
  // When each beat starts, from the throw.
  const absorbAt = FX_MS.throw;
  const landAt = absorbAt + FX_MS.absorb;
  const wobbleAt = landAt + FX_MS.land;
  const resultAt = catchMs(c.wobbles) - FX_MS.result;
  const vars = {
    '--at-absorb': `${absorbAt}ms`,
    '--at-land': `${landAt}ms`,
    '--at-wobble': `${wobbleAt}ms`,
    '--at-result': `${resultAt}ms`,
    '--wobbles': c.wobbles,
    '--catch-pct': `${pct}%`,
  } as CSSProperties;
  return (
    <div className={`${slotClass(c.slot)} ${styles.catch}`} style={vars} data-testid="catch-fx" data-success={c.success} data-wobbles={c.wobbles} aria-hidden="true">
      <img className={`pixel ${styles.mon}`} src={spriteOf({ speciesId: c.speciesId }, 'front', c.shiny)} alt="" draggable={false} />
      <img className={`pixel ${styles.ball} ${c.success ? styles.caught : styles.broke}`} src={itemIcon(c.ball)} alt="" draggable={false} />
      <span className={styles.flash} />
      {c.success && (
        <span className={styles.stars}>
          <i />
          <i />
          <i />
        </span>
      )}
      <span className={styles.bar}>
        <span className={styles.fill} />
        <b className={`${styles.pct} tabular`}>{pct}%</b>
      </span>
    </div>
  );
}
