import { IconChevronDown, IconSparkles } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { BOND_RANK_NAME, BOND_TIER, hiddenAbilityOf } from '@/sim';
import { itemIcon } from '@/ui/art';
import { MedalIcon } from '@/ui/components/MedalIcon';
import { abilityTip, bondGainTip, bondUnlockTip, progressNoteTip } from '@/ui/tips';
import { RESULT_TEXT, REWARD_TEXT } from '@/ui/strings';
import { Tipped } from '@/ui/tooltip';
import styles from './ProgressDoor.module.css';

/**
 * §9.4.5 / §8.7 / §6.8.1 — what the fight moved on the account (medals, discoveries, each line's Bond), behind one chip on
 * the top bar: the fight's own news is its team and its spoils; this is one click away (D4). The chip shows the medals'
 * faces and the count; a Bond rank gained lights it. Escape or a click outside closes the list.
 */
export function ProgressDoor() {
  const content = getContent();
  const notes = useAccountStore((s) => s.lastProgress);
  const bonds = useAccountStore((s) => s.lastBond);
  const totals = useAccountStore((s) => s.account.bond);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  if (!notes.length && !bonds.length) return null;
  const ranked = bonds.some((b) => b.rankUps.length > 0);
  return (
    <div className={styles.root} ref={root}>
      <button type="button" className={`${styles.chip} ${ranked ? styles.lit : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`${RESULT_TEXT.progress}: ${notes.length + bonds.length}`} data-testid="results-progress">
        {notes.slice(0, 3).map((n) => (
          <span key={`${n.kind}-${n.id}`} className={styles.face}>
            {n.kind === 'achievement' ? <MedalIcon tier={n.tier} size={20} /> : <img className="pixel" src={itemIcon(n.id)} alt="" />}
          </span>
        ))}
        {bonds.length > 0 && <IconSparkles size={15} className={styles.spark} />}
        <span className="tabular">+{notes.length + bonds.length}</span>
        <IconChevronDown size={14} />
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label={RESULT_TEXT.progressHead} data-testid="reward-progress">
          <span className={styles.heading}>{RESULT_TEXT.progressHead}</span>
          {notes.map((n) => (
            <Tipped as="div" key={`${n.kind}-${n.id}`} tip={progressNoteTip(n.kind, n.id, n.name, n.to, n.goal, n.done)} className={styles.note}>
              {n.kind === 'achievement' ? (
                <MedalIcon tier={n.tier} size={22} />
              ) : (
                <span className={styles.noteIcon}>
                  <img className="pixel" src={itemIcon(n.id)} alt="" />
                </span>
              )}
              <span className={n.done ? styles.noteDone : undefined}>{n.name}</span>
              <span className={n.goal > 1 && !n.done ? styles.bar : undefined} aria-hidden="true">
                {n.goal > 1 && !n.done && <span style={{ width: `${(n.to / n.goal) * 100}%` }} />}
              </span>
              <span className={`${n.done ? styles.done : ''} tabular`}>{n.done ? 'Done' : `${n.to}/${n.goal}`}</span>
            </Tipped>
          ))}
          {bonds.length > 0 && (
            <div className={styles.bonds}>
              <span className={styles.bondLabel}>{RESULT_TEXT.bond}</span>
              {bonds.map((b) => {
                const hidden = hiddenAbilityOf(b.line, content);
                return (
                  <span key={b.line} className={styles.bond}>
                    <Tipped tip={bondGainTip(content.species(b.line).name, b.points, totals[b.line] ?? 0, b.rankUps)} data-testid={`bond-${b.line}`}>
                      {content.species(b.line).name} <b className="tabular">+{b.points}</b>
                      {b.rankUps.length > 0 && <b> · {BOND_RANK_NAME[b.rankUps[b.rankUps.length - 1]!]}</b>}
                    </Tipped>
                    {/* §6.8.2 — what a rank opened, named: the hidden ability is a chip of its own. */}
                    {b.rankUps.map((r) =>
                      r === BOND_TIER.hiddenAbility && hidden ? (
                        <Tipped key={r} tip={abilityTip(hidden)} className={styles.unlock}>
                          <IconSparkles size={12} /> {content.ability(hidden).name}
                        </Tipped>
                      ) : REWARD_TEXT.bondUnlock[r] ? (
                        <Tipped key={r} tip={bondUnlockTip(r, content.species(b.line).name)} className={styles.unlock}>
                          <IconSparkles size={12} /> {REWARD_TEXT.bondUnlock[r]}
                        </Tipped>
                      ) : null,
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
