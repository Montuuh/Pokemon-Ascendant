import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { BOND, BOND_LADDER, BOND_RANK_NAME, BOND_RANKS, UNMET_NAME, bondProgress, bondRank, bondUnlocks, hiddenAbilityOf, isThreeStageLine, type AccountState, speciesMet } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { InfoDot, Tip } from '@/ui/tooltip';
import { BondBar } from './BondBar';
import { RANK_ICON } from './rankIcons';
import styles from './PcSheet.module.css';

// §6.8 — the Line tab of a Pokédex sheet: the evolution line's stages (each a door to that species' sheet, the
// one you are on marked), the Bond so far, and the ladder of what each rank opens *for this line* — the fifth
// card by name, the hidden ability by name — with how Bond grows at the foot.

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

export function LineSheet({ line, account, current, onSpecies }: { line: string; account: AccountState; current?: string; onSpecies: (id: string) => void }) {
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
  // §8.9.2 — a stage you have not met is a silhouette and "???"; a line with no stage met keeps its names to itself.
  const metStage = (id: string) => speciesMet(account, id);
  const lineKnown = cols.some((col) => col.some(metStage));

  const moveName = (id: string | null | undefined) => (id ? content.move(id).name : 'not written yet');
  const hiddenName = hidden ? content.ability(hidden).name : `${(base.hiddenAbilityPending ?? 'Hidden ability').split(' — ')[0]} (not yet)`;
  const named = (label: string, name: string) => (lineKnown ? `${label} — ${name}` : label);
  // §6.8.2 — the ladder, with this line's own names on it once you have met the line.
  const rungs: { rank: 1 | 2 | 3 | 4 | 5; on: boolean; unlock: string }[] = [
    { rank: 1, on: u.mastery >= 1, unlock: `${named('Mastery Move Lv1', moveName(masteryMoves[0]))}, a fifth card` },
    { rank: 2, on: u.shiny, unlock: 'Shiny — your copies wear the official shiny palette' },
    { rank: 3, on: u.hiddenAbility, unlock: `${named('Hidden ability', hiddenName)}, open at the Dojo` },
    { rank: 4, on: u.mastery >= 2, unlock: named('Mastery Move Lv2', moveName(masteryMoves[1])) },
    three
      ? { rank: 5, on: u.mastery >= 3, unlock: `${named('Mastery Move Lv3', moveName(masteryMoves[2]))} · the line can start a run` }
      : { rank: 5, on: u.opener, unlock: 'The Mastery card in every opening hand · the line can start a run' },
  ];

  return (
    <div data-testid="line-sheet" data-line={line} data-rank={rank}>
      <div className={styles.embedded}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Stages</h3>
          <div className={styles.stages} data-testid="line-sheet-stages">
            {cols.map((col, i) => (
              <div key={i} style={{ display: 'contents' }}>
                {i > 0 && (
                  <span className={styles.stageArrow} aria-hidden="true">
                    <IconArrowRight size={20} />
                    {content.species(cols[i - 1]![0]!).evolveLevel && col.some(metStage) ? <span className="tabular">Lv {content.species(cols[i - 1]![0]!).evolveLevel}</span> : null}
                  </span>
                )}
                <div className={styles.stageCol}>
                  {col.map((id) => (
                    <button key={id} type="button" className={`${styles.stage} ${id === current ? styles.stageOn : ''}`} onClick={() => { if (id !== current) onSpecies(id); }} aria-current={id === current || undefined} data-testid={`line-stage-${id}`}>
                      <span className={metStage(id) ? undefined : styles.stageHidden}>
                        <MonIcon speciesId={id} size={64} alt={metStage(id) ? content.species(id).name : UNMET_NAME} />
                      </span>
                      <span className={styles.stageName}>{metStage(id) ? content.species(id).name : UNMET_NAME}</span>
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
            <span className={styles.bondMeta}>
              <span className={styles.bondRankName}>{p.next === null ? 'Every rank open' : `Next: ${BOND_RANK_NAME[rank + 1]}`}</span>
              {u.starter && <span className={`${styles.heroChip} ${styles.chipOn}`}><IconCheck size={13} stroke={3} /> Can start a run</span>}
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
        </section>
      </div>
    </div>
  );
}
