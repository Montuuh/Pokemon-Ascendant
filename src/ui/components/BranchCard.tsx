import { IconArrowNarrowRight, IconPlus, IconSparkles } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { UNMET_NAME, type BranchPayload } from '@/sim';
import { itemIcon } from '@/ui/art';
import { ARCHETYPE_LABEL, DEX_EVO_TEXT, STAT_LONG, STAT_SHORT } from '@/ui/strings';
import { abilityTip, archetypeTip, branchTip, evoStatTip, stoneUseTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { MonIcon } from './MonIcon';
import { MoveChip } from './MoveChip';
import styles from './BranchCard.module.css';

// §6.3 — one evolution path as the Pokédex shows it (v0.9.9): where it goes and when, the archetype, how the stats move
// at the threshold, and what it does to the kit — the old card struck out beside the one replacing it, a new one with a
// plus. The same facts the Evolution screen shows mid-run, read off the content alone (`branchPayload`).

const STATS = ['hp', 'attack', 'defense', 'speed'] as const;

export function BranchCard({ p, toMet, onSpecies }: { p: BranchPayload; toMet: boolean; onSpecies?: (id: string) => void }) {
  const content = getContent();
  const branch = content.branch(p.branchId);
  const from = content.species(p.from);
  const to = content.species(p.to);
  const toName = toMet ? to.name : UNMET_NAME;
  return (
    <article className={styles.card} data-archetype={p.archetype} data-testid={`dex-branch-${p.branchId}`}>
      <header className={styles.head}>
        <button type="button" className={styles.to} onClick={() => onSpecies?.(p.to)} aria-label={toName} disabled={!onSpecies}>
          <span className={toMet ? undefined : styles.hidden}>
            <MonIcon speciesId={p.to} size={40} alt={toName} />
          </span>
        </button>
        <span className={styles.titles}>
          <span className={styles.line}>
            <Tipped as="span" tabIndex={-1} tip={archetypeTip(p.archetype)} className={styles.pill}>
              {ARCHETYPE_LABEL[p.archetype]}
            </Tipped>
            <Tipped as="span" tip={branchTip(branch.label, branch.description, p.archetype)} className={`${styles.label} display`}>
              {branch.label}
            </Tipped>
          </span>
          {/* The stage and its level head the group (the line tab); the card names where this path goes. */}
          <span className={styles.when}>
            → {toName}
            {p.stones.map((id) => (
              <Tipped key={id} as="span" tip={stoneUseTip(id)} className={styles.stone}>
                <img src={itemIcon(id)} alt={content.evolutionItem(id).name} width={18} height={18} />
              </Tipped>
            ))}
          </span>
        </span>
      </header>

      <ul className={styles.stats} aria-label={DEX_EVO_TEXT.stats}>
        {STATS.map((k) => {
          const d = p.statsAfter[k] - p.statsBefore[k];
          return (
            <Tipped as="li" key={k} tabIndex={-1} tip={evoStatTip(k, STAT_LONG[k]!, { name: from.name, value: p.statsBefore[k] }, { name: toName, value: p.statsAfter[k] }, p.level ?? 0)} className={`${styles.stat} ${d > 0 ? styles.up : d < 0 ? styles.down : ''}`}>
              <span className={styles.statName}>{STAT_SHORT[k]}</span>
              <b className="tabular">{d > 0 ? `+${d}` : d}</b>
            </Tipped>
          );
        })}
      </ul>

      <ul className={styles.moves} aria-label={DEX_EVO_TEXT.moves}>
        {p.upgrades.map((u) => (
          <li key={u.from} className={styles.change}>
            <MoveChip id={u.from} struck />
            <IconArrowNarrowRight size={16} className={styles.arrow} aria-label={DEX_EVO_TEXT.becomes} />
            <MoveChip id={u.to} />
          </li>
        ))}
        {p.adds.map((a) => (
          <li key={a} className={styles.change}>
            <IconPlus size={16} className={styles.arrow} aria-label={DEX_EVO_TEXT.learns} />
            <MoveChip id={a} />
          </li>
        ))}
        {p.abilityId && (
          <li className={styles.change}>
            <Tipped as="span" tip={abilityTip(p.abilityId)} className={styles.ability}>
              <IconSparkles size={14} /> {content.ability(p.abilityId).name}
            </Tipped>
          </li>
        )}
      </ul>
    </article>
  );
}
