import { IconArrowRight, IconCheck, IconPokeball } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { BOND, BOND_LADDER, BOND_RANK_NAME, BOND_RANKS, bondProgress, bondRank, bondUnlocks, hiddenAbilityOf, isThreeStageLine, type AccountState } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { InfoDot, Tip } from '@/ui/tooltip';
import { BondBar } from './BondBar';
import { RANK_ICON } from './rankIcons';
import styles from './PcSheet.module.css';

// §6.8 — one evolution line's sheet: its stages (each a door to that species' Pokédex sheet), the Bond so
// far, and the ladder of what each rank opens *for this line* — the fifth card by name, the hidden ability by
// name. The Companions grid behind shows only the portrait, the name and the bar; the reading is here.

/** The line as columns: the base, then what it evolves into, then what those evolve into. Eevee fans out. */
function stagesOf(line: string): string[][] {
  const content = getContent();
  const cols: string[][] = [[line]];
  for (;;) {
    const next = cols[cols.length - 1]!.flatMap((id) => content.species(id).evolvesTo);
    if (next.length === 0) return cols;
    cols.push([...new Set(next)]);
  }
}

export function LineSheet({ line, account, onSpecies }: { line: string; account: AccountState; onSpecies: (id: string) => void }) {
  const content = getContent();
  const base = content.species(line);
  const points = account.bond[line] ?? 0;
  const p = bondProgress(points);
  const rank = bondRank(points);
  const three = isThreeStageLine(line, content);
  const u = bondUnlocks(rank, three);
  const masteryMoves = content.masteryMoves(line);
  const hidden = hiddenAbilityOf(line, content);
  const cols = stagesOf(line);

  const moveName = (id: string | null | undefined) => (id ? content.move(id).name : 'not authored yet (v0.7)');
  const hiddenName = hidden ? content.ability(hidden).name : `${(base.hiddenAbilityPending ?? 'Hidden ability').split(' — ')[0]} (v0.7)`;
  // §6.8.2 — the ladder, with this line's own names on it.
  const rungs: { rank: 1 | 2 | 3 | 4 | 5; on: boolean; unlock: string }[] = [
    { rank: 1, on: u.mastery >= 1, unlock: `Mastery Move Lv1 — ${moveName(masteryMoves[0])}, a fifth card` },
    { rank: 2, on: u.shiny, unlock: 'Shiny — your copies wear the official shiny palette' },
    { rank: 3, on: u.hiddenAbility, unlock: `Hidden ability — ${hiddenName}, open at the Dojo` },
    { rank: 4, on: u.mastery >= 2, unlock: `Mastery Move Lv2 — ${moveName(masteryMoves[1])}` },
    three
      ? { rank: 5, on: u.mastery >= 3, unlock: `Mastery Move Lv3 — ${moveName(masteryMoves[2])} · the line can start a run` }
      : { rank: 5, on: u.opener, unlock: 'The Mastery card in every opening hand · the line can start a run' },
  ];

  return (
    <div data-testid="line-sheet" data-line={line} data-rank={rank}>
      <div className={styles.hero} style={{ ['--sheet-type' as string]: `var(--type-${base.types[0]})` }}>
        <span className={styles.heroBall} aria-hidden="true"><IconPokeball size={220} stroke={1.2} /></span>
        <span className={styles.heroArt}><MonIcon speciesId={line} size={140} /></span>
        <div className={styles.heroBody}>
          <span className={styles.heroNumber}>Evolution line</span>
          <h2 className={`${styles.heroName} display`}>{base.name} line</h2>
          <div className={styles.heroMeta}>
            <span className={styles.heroChip}>{rank > 0 ? `${BOND_RANK_NAME[rank]} · rank ${rank}` : 'Not yet played'}</span>
            <span className={styles.heroChip}>{three ? 'Three stages' : cols.length > 1 ? 'Two stages' : 'One stage'}</span>
            {u.starter && <span className={`${styles.heroChip} ${styles.chipOn}`}><IconCheck size={13} stroke={3} /> Can start a run</span>}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Stages <span className={styles.muted}>— open one for its Pokédex sheet</span></h3>
          <div className={styles.stages} data-testid="line-sheet-stages">
            {cols.map((col, i) => (
              <div key={i} style={{ display: 'contents' }}>
                {i > 0 && (
                  <span className={styles.stageArrow} aria-hidden="true">
                    <IconArrowRight size={20} />
                    {content.species(cols[i - 1]![0]!).evolveLevel ? <span className="tabular">Lv {content.species(cols[i - 1]![0]!).evolveLevel}</span> : null}
                  </span>
                )}
                <div className={styles.stageCol}>
                  {col.map((id) => (
                    <button key={id} type="button" className={styles.stage} onClick={() => onSpecies(id)} data-testid={`line-stage-${id}`}>
                      <MonIcon speciesId={id} size={64} />
                      <span className={styles.stageName}>{content.species(id).name}</span>
                      <span className={`${styles.muted} tabular`}>#{String(content.species(id).dex).padStart(3, '0')}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Bond
            <InfoDot tip={<Tip title="How Bond grows" body={`Play the line. +${BOND.win} per fight won with it on the Active Team (+${BOND.lead} more if it led), +${BOND.evolution} per evolution, +${BOND.recruit} the first time you recruit it in a run, +${BOND.runFinished} for finishing a run with it, +${BOND.runWon} for winning one.`} footer={`Ranks at ${BOND_RANKS.join(' · ')} Bond.`} />} />
          </h3>
          <div className={styles.bondBlock} data-testid="line-sheet-bond">
            <BondBar points={points} />
            <span className={styles.bondRankName}>
              {p.next === null ? 'Every rank open' : `${p.next - points} to ${BOND_RANK_NAME[rank + 1]}`}
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>What each rank opens</h3>
          <ol className={styles.ladder} data-testid="line-sheet-ladder">
            {rungs.map((r) => (
              <li key={r.rank} className={`${styles.rung} ${r.on ? styles.rungOn : ''}`} data-rank={r.rank} data-on={r.on}>
                <span className={styles.rungIcon} aria-hidden="true">{RANK_ICON[r.rank](18)}</span>
                <span className={styles.rungBody}>
                  <span className={styles.rungName}>{r.rank} · {BOND_LADDER[r.rank - 1]!.name}</span>
                  <span className={styles.rungUnlock}>{r.unlock}</span>
                </span>
                <span className={`${styles.rungAt} tabular`}>{r.on ? <IconCheck size={16} stroke={3} /> : `${BOND_RANKS[r.rank - 1]} Bond`}</span>
              </li>
            ))}
          </ol>
          <p className={styles.how}>
            Bond grows by playing the line: +{BOND.win} per fight won with it (+{BOND.lead} leading), +{BOND.evolution} per evolution, +{BOND.recruit} for a first recruit in a run, +{BOND.runFinished} for finishing a run with it, +{BOND.runWon} for winning one.
          </p>
        </section>
      </div>
    </div>
  );
}
