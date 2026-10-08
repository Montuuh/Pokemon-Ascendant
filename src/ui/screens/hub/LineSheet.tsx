import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { branchPayload, SHINY, BOND_LADDER, isStarterLine, BOND_RANK_NAME, BOND_RANKS, UNMET_NAME, bondProgress, bondRank, bondUnlocks, hiddenAbilityOf, type AccountState, speciesMet } from '@/sim';
import { bondRulesText, evoPathsTip } from '@/ui/tips';
import { BranchCard } from '@/ui/components/BranchCard';
import { MonIcon } from '@/ui/components/MonIcon';
import { DEX_EVO_TEXT } from '@/ui/strings';
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
  const u = bondUnlocks(rank);
  const hidden = hiddenAbilityOf(line, content);
  const cols = stagesOf(line);
  // §8.9.2 — a stage you have not met is a silhouette and "???"; a line with no stage met keeps its names to itself.
  const metStage = (id: string) => speciesMet(account, id);
  const lineKnown = cols.some((col) => col.some(metStage));

  const hiddenName = hidden ? content.ability(hidden).name : `${(base.hiddenAbilityPending ?? 'Hidden ability').split(' — ')[0]} (not yet)`;
  const named = (label: string, name: string) => (lineKnown ? `${label} — ${name}` : label);
  // §6.8.2 — the ladder, with the line's hidden ability named once you have met the line. A line that is a starter
  // already (a default one or a Poké Mart one) has nothing to gain from "can start a run": its rank 4 strikes that and
  // promises the palette instead.
  const starterLine = isStarterLine(line);
  const rungs: { rank: 1 | 2 | 3 | 4; on: boolean; unlock: string; struck?: string }[] = [
    { rank: 1, on: u.shinyCharm, unlock: `Shiny Charm — its shinies turn up ${SHINY.charmMultiplier} times as often` },
    { rank: 2, on: u.hiddenAbility, unlock: `${named('Hidden ability', hiddenName)}, assignable at the Dojo` },
    { rank: 3, on: u.mastery > 0, unlock: 'Mastery Move — a fifth card unique to the line, in every evolution' },
    starterLine
      ? { rank: 4, on: u.starter, struck: 'The line can start a run', unlock: 'Your starter will always be shiny' }
      : { rank: 4, on: u.starter, unlock: 'The line can start a run' },
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

        {/* §6.3 — every path of the line (v0.9.9): where it goes, when, how the stats move and what the kit gains and
            forgets. A stage you have met shows its paths; §8.9.2 — an unmet one keeps them to itself. */}
        {cols.slice(0, -1).some((col) => col.some((id) => content.species(id).branches.length && metStage(id))) && (
          <section className={styles.section} data-testid="line-sheet-evolutions">
            <h3 className={styles.sectionTitle}>
              {DEX_EVO_TEXT.evolutions}
              <InfoDot tip={evoPathsTip()} />
            </h3>
            {/* One group per stage that evolves: its name and level once, then a card per path. */}
            {cols.flat().filter((id) => metStage(id) && content.species(id).branches.length).map((id) => (
              <div key={id} className={styles.branchGroup}>
                <p className={styles.branchFrom}>{DEX_EVO_TEXT.from(content.species(id).name, content.species(id).evolveLevel ?? null)}</p>
                <div className={styles.branches}>
                  {content.species(id).branches.map((b) => (
                    <BranchCard key={b.id} p={branchPayload(content, b.id)} toMet={metStage(b.to)} onSpecies={onSpecies} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Bond
            <InfoDot tip={<Tip title="How Bond grows" body={bondRulesText()} footer={`Ranks at ${BOND_RANKS.join(' · ')} Bond.`} />} />
          </h3>
          <div className={styles.bondBlock} data-testid="line-sheet-bond">
            <BondBar points={points} />
            <span className={styles.bondMeta}>
              <span className={styles.bondRankName}>{p.next === null ? 'Every rank open' : `Next: ${BOND_RANK_NAME[rank + 1]}`}</span>
              {u.starter && <span className={`${styles.heroChip} ${styles.chipOn}`}><IconCheck size={13} stroke={3} /> {starterLine ? 'Always shiny' : 'Can start a run'}</span>}
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
                  <span className={styles.rungUnlock}>
                    {r.struck && <><s className={styles.rungStruck} data-testid="rung-struck"><span className="sr-only">Already a starter: </span>{r.struck}</s><span className="sr-only">; </span> </>}
                    {r.unlock}
                  </span>
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
