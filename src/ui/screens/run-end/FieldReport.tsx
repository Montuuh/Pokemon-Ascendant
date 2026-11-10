import { useEffect, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { IconAward, IconFlag, IconNotebook, IconPackage, IconPlayerSkipForward, IconCertificate, IconStar, IconTrophy } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { motion } from 'motion/react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import {
  BOND_LADDER, BOND_RANKS, BOND_RANK_NAME, HUB_UPGRADE_LABEL, MAX_BOND_RANK, MAX_LEVEL, REPORT_LINES, achievementById, bondProgress, bondRank, cosmeticById,
  levelFor, levelProgress, nextGoals, parcelCost, rankRow, vaultCard, vaultEntry, xpForLevel, type ReportLine,
} from '@/sim';
import { MedalIcon } from '@/ui/components/MedalIcon';
import { MonIcon } from '@/ui/components/MonIcon';
import { nodeBadge } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Tip, Tipped } from '@/ui/tooltip';
import { moneyTokensTip, trainerXpTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import { TokenIcon } from '../hub/TokenIcon';
import { ParcelOffer } from '../hub/OakAide';
import styles from './FieldReport.module.css';

// §8.3.6 — the Field Report: a run's end as a prize-giving.
//
// Until v0.9.110 this screen showed the last team and a button, and everything the run had earned sat behind it in
// a dialog of text. The run is paid *here* now, in the order the series pays things: the tally is counted, the
// bars fill from where the run found them, what was earned appears as the thing it is, and the last panel is what
// to chase next. Every panel is on the screen at rest; motion only decides when each one arrives, and Skip (or a
// reduced-motion setting) lands them all at once.

/** Seconds between one panel arriving and the next. */
const STEP = 0.45;

function Panel({ index, fast, heading, aside, testId, children }: { index: number; fast: boolean; heading: string; aside?: ReactNode; testId: string; children: ReactNode }) {
  const animate = useMotionPref() && !fast;
  return (
    <motion.section
      className={styles.panel}
      data-testid={testId}
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animate ? index * STEP : 0, duration: 0.22, ease: 'easeOut' }}
    >
      <header className={styles.panelHead}>
        <h2 className={`${styles.panelTitle} display`}>{heading}</h2>
        {aside}
      </header>
      {children}
    </motion.section>
  );
}

/** A bar that fills from where the run found it to where the run left it, once its panel has arrived. */
function FillBar({ from, to, delay, fast, label, testId }: { from: number; to: number; delay: number; fast: boolean; label: string; testId?: string }) {
  const animate = useMotionPref() && !fast;
  // The bar waits at `from` until its panel has arrived, then lands on `to`; with motion off it is there already.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(() => setLanded(true), delay * 1000 + 250);
    return () => window.clearTimeout(id);
  }, [animate, delay]);
  const at = !animate || landed ? to : from;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return (
    <span className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(to) * 100)} aria-label={label} data-testid={testId} data-from={clamp(from).toFixed(3)} data-to={clamp(to).toFixed(3)}>
      <span className={styles.barFrom} style={{ transform: `scaleX(${clamp(from)})` }} />
      <span className={styles.barFill} style={{ transform: `scaleX(${clamp(at)})` }} />
    </span>
  );
}

export function FieldReport({ won }: { won: boolean }) {
  const account = useAccountStore((s) => s.account);
  const ledger = useAccountStore((s) => s.ledger);
  const content = getContent();
  const [fast, setFast] = useState(false);
  const [parcelOpen, setParcelOpen] = useState(false);
  const animate = useMotionPref() && !fast;

  // 1 — the tally.
  const lines = REPORT_LINES.filter((l) => (ledger.xpBy[l] ?? 0) > 0) as ReportLine[];

  // 2 — Research and the Rank: both fill with the same XP, from where the run began.
  const cost = parcelCost(account.parcelsEarned);
  const researchFrom = ledger.parcels > 0 ? 0 : Math.min(1, (ledger.researchAtStart ?? 0) / cost);
  const researchTo = account.research / cost;
  const rank = levelProgress(account.xp);
  const rankUp = levelFor(account.xp) > ledger.levelAtStart;
  const rankFrom = rankUp || rank.span === 0 ? 0 : Math.max(0, (ledger.xpAtStart - xpForLevel(rank.level)) / rank.span);

  // 3 — Bond, per line, most gained first.
  const byLine = new Map<string, number>();
  for (const g of ledger.bondGains) byLine.set(g.line, (byLine.get(g.line) ?? 0) + g.points);
  const bonds = [...byLine.entries()].sort((a, b) => b[1] - a[1]);
  const BOND_ROWS = 4;

  // 4 — what the run handed over, each as the thing it is.
  const prizes: { key: string; icon: ReactNode; text: string; tip?: string }[] = [];
  for (const r of ledger.rewards) prizes.push({ key: `rank${r.level}`, icon: <IconStar size={18} />, text: JOURNEY_TEXT.report.rank(rankRow(r.level).name, r.reward.arrives), tip: r.reward.why });
  for (const id of ledger.newBadges) prizes.push({ key: `badge${id}`, icon: <img src={nodeBadge(`gym-${content.badge(id).type}`)} alt="" width={20} height={20} className="pixel" />, text: JOURNEY_TEXT.report.badge(content.badge(id).name) });
  for (const id of ledger.opened) {
    const entry = vaultEntry(id);
    if (entry) prizes.push({ key: `open${id}`, icon: <IconPackage size={18} />, text: JOURNEY_TEXT.report.opened(vaultCard(entry, content).name), tip: vaultCard(entry, content).description });
  }
  for (const j of ledger.journalRewards) {
    const a = achievementById(j.id);
    if (!a) continue;
    const extra = [j.reward.cosmetic ? (cosmeticById(j.reward.cosmetic)?.name ?? '') : '', j.reward.parcels ? JOURNEY_TEXT.report.parcels(j.reward.parcels) : ''].filter(Boolean).join(' · ');
    prizes.push({ key: `j${j.id}`, icon: <MedalIcon tier={a.tier} size={20} />, text: `${a.name}${extra ? ` — ${extra}` : ''}`, tip: a.description });
  }
  for (const id of ledger.notes) prizes.push({ key: `note${id}`, icon: <IconNotebook size={18} />, text: JOURNEY_TEXT.report.note(content.relic(id).name), tip: content.relic(id).discovery?.text });
  for (const a of ledger.aides) prizes.push({ key: `aide${a.owned}`, icon: <IconAward size={18} />, text: JOURNEY_TEXT.report.aide(a.owned, a.perk ? HUB_UPGRADE_LABEL[a.perk].name : a.parcels ? JOURNEY_TEXT.report.parcels(a.parcels) : `${a.tokens} Tokens`) });
  if (ledger.ribbons.length) prizes.push({ key: 'ribbons', icon: <IconCertificate size={18} />, text: JOURNEY_TEXT.report.ribbons(ledger.ribbons.length) });
  if (ledger.ladderRung) prizes.push({ key: 'ladder', icon: <IconFlag size={18} />, text: JOURNEY_TEXT.report.ladder(ledger.ladderRung) });
  if (ledger.hall) prizes.push({ key: 'hall', icon: <IconTrophy size={18} />, text: JOURNEY_TEXT.report.hall });

  const moneyTokens = ledger.moneyTokens.reduce((n, m) => n + m.tokens, 0);
  const money = ledger.moneyTokens.reduce((n, m) => n + m.money, 0);
  const goals = nextGoals(account, content, 3, (id) => cosmeticById(id)?.name ?? id);

  return (
    <div className={styles.root} data-testid="field-report" data-fast={fast} data-outcome={won ? 'victory' : 'defeat'}>
      <header className={styles.head}>
        <h2 className={`${styles.title} display`}>{JOURNEY_TEXT.report.title}</h2>
        {animate && (
          <button type="button" className={styles.skip} onClick={() => setFast(true)} data-testid="btn-report-skip">
            <IconPlayerSkipForward size={16} aria-hidden="true" /> {JOURNEY_TEXT.report.skip}
          </button>
        )}
      </header>

      <div className={styles.grid}>
        <Panel
          index={0}
          fast={fast}
          heading={JOURNEY_TEXT.report.tally}
          testId="report-tally"
          aside={
            <Tipped tip={trainerXpTip()} className={styles.total}>
              <span className={`${styles.totalXp} display tabular`} data-testid="summary-xp">+<NumberFlow value={ledger.xp} animated={animate} /> XP</span>
            </Tipped>
          }
        >
          <dl className={styles.tally}>
            {lines.map((l) => (
              <div key={l}>
                <dt>{JOURNEY_TEXT.report.line[l]}</dt>
                <dd className="tabular">+{ledger.xpBy[l]}</dd>
              </div>
            ))}
            {lines.length === 0 && <div><dt>{JOURNEY_TEXT.report.nothing}</dt><dd className="tabular">+0</dd></div>}
          </dl>
        </Panel>

        <Panel index={1} fast={fast} heading={JOURNEY_TEXT.research} testId="report-research">
          <div className={styles.meter}>
            <FillBar from={researchFrom} to={researchTo} delay={1 * STEP} fast={fast} label={JOURNEY_TEXT.research} testId="report-research-bar" />
            <span className={`${styles.meterText} tabular`}>{account.research} / {cost}</span>
          </div>
          {ledger.parcels > 0 ? (
            <p className={styles.parcelLine} data-testid="report-parcels" data-earned={ledger.parcels}>
              <IconPackage size={20} aria-hidden="true" /> {JOURNEY_TEXT.report.parcelsEarned(ledger.parcels)}
            </p>
          ) : (
            <p className={styles.quiet}>{JOURNEY_TEXT.report.noParcel(Math.max(0, cost - account.research))}</p>
          )}
          {/* The sheet stays up after the last parcel is taken, so the card just added is said before it closes. */}
          {(account.parcels > 0 || parcelOpen) && (
            <Dialog.Root open={parcelOpen} onOpenChange={setParcelOpen}>
              {account.parcels > 0 && (
                <Dialog.Trigger asChild>
                  <button type="button" className={styles.open} data-testid="btn-open-parcel">{JOURNEY_TEXT.report.openParcel(account.parcels)}</button>
                </Dialog.Trigger>
              )}
              <Dialog.Portal>
                <Dialog.Overlay className={styles.scrim} />
                <Dialog.Content className={styles.parcelSheet} aria-describedby={undefined} data-testid="parcel-sheet">
                  <Dialog.Title className="sr-only">{JOURNEY_TEXT.parcel.title}</Dialog.Title>
                  <ParcelOffer />
                  <Dialog.Close asChild>
                    <button type="button" className={styles.later} data-testid="btn-parcel-later">{JOURNEY_TEXT.report.later}</button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </Panel>

        <Panel index={2} fast={fast} heading={`${rankRow(rank.level).name} · ${JOURNEY_TEXT.rank(rank.level)}`} testId="report-rank">
          <div className={styles.meter}>
            <FillBar from={rankFrom} to={rank.fraction} delay={2 * STEP} fast={fast} label={JOURNEY_TEXT.report.rankBar} testId="report-rank-bar" />
            <span className={`${styles.meterText} tabular`}>{rank.level >= MAX_LEVEL ? JOURNEY_TEXT.report.topRank : JOURNEY_TEXT.report.toNext(rank.span - rank.into, rankRow(rank.level + 1).name)}</span>
          </div>
          {rankUp && <p className={styles.rankUp} data-testid="report-rank-up">{JOURNEY_TEXT.report.rankUp(rankRow(ledger.levelAtStart).name, rankRow(rank.level).name)}</p>}
        </Panel>

        <Panel index={3} fast={fast} heading={JOURNEY_TEXT.report.bond} testId="report-bond">
          {bonds.length === 0 ? (
            <p className={styles.quiet}>{JOURNEY_TEXT.report.noBond}</p>
          ) : (
            <ul className={styles.bonds}>
              {bonds.slice(0, BOND_ROWS).map(([line, points]) => {
                const now = account.bond[line] ?? points;
                const start = ledger.bondAtStart?.[line] ?? Math.max(0, now - points);
                const p = bondProgress(now);
                const crossed = bondRank(now) > bondRank(start);
                const floor = p.rank === 0 ? 0 : BOND_RANKS[p.rank - 1]!;
                const from = crossed || p.span === 0 ? 0 : (start - floor) / p.span;
                const top = crossed ? bondRank(now) : 0;
                return (
                  <li key={line} data-testid={`report-bond-${line}`} data-rank={p.rank} data-crossed={crossed}>
                    <MonIcon speciesId={line} size={32} />
                    <span className={styles.bondBody}>
                      <span className={styles.bondHead}>
                        <span className="display">{content.species(line).name}</span>
                        <span className={`${styles.bondPts} tabular`}>+{points}</span>
                      </span>
                      <FillBar from={from} to={p.fraction} delay={3 * STEP} fast={fast} label={JOURNEY_TEXT.report.bondBar(content.species(line).name)} />
                      {top > 0 ? (
                        <span className={styles.bondUp}>{BOND_RANK_NAME[top]}: {BOND_LADDER[top - 1]!.unlock}</span>
                      ) : (
                        <span className={styles.bondRank}>{JOURNEY_TEXT.report.bondRank(p.rank, MAX_BOND_RANK)}</span>
                      )}
                    </span>
                  </li>
                );
              })}
              {bonds.length > BOND_ROWS && <li className={styles.quiet}>{JOURNEY_TEXT.report.moreLines(bonds.length - BOND_ROWS)}</li>}
            </ul>
          )}
        </Panel>

        <Panel index={4} fast={fast} heading={JOURNEY_TEXT.report.earned} testId="report-earned">
          {prizes.length === 0 ? (
            <p className={styles.quiet}>{JOURNEY_TEXT.report.nothingNamed}</p>
          ) : (
            <ul className={styles.prizes}>
              {prizes.map((p) => (
                <li key={p.key}>
                  <span className={styles.prizeIcon} aria-hidden="true">{p.icon}</span>
                  {p.tip ? <Tipped tip={<Tip title={p.text} body={p.tip} />}>{p.text}</Tipped> : <span>{p.text}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className={styles.tokens} data-testid="report-tokens" data-tokens={ledger.tokens}>
            <TokenIcon /> <b className="tabular">+<NumberFlow value={ledger.tokens} animated={animate} /></b>
            <span className={styles.quiet}>{JOURNEY_TEXT.report.tokenSplit(ledger.reportTokens, moneyTokens)}</span>
            {money > 0 && <Tipped tip={moneyTokensTip(money, moneyTokens)} className={styles.moneyDot} data-testid="summary-money">{money} ₽</Tipped>}
          </p>
        </Panel>

        <Panel index={5} fast={fast} heading={JOURNEY_TEXT.report.next} testId="report-next">
          {goals.length === 0 ? (
            <p className={styles.quiet}>{JOURNEY_TEXT.report.noGoals}</p>
          ) : (
            <ul className={styles.goals}>
              {goals.map((g) => (
                <li key={g.id} data-testid={`report-goal-${g.id}`} data-pinned={g.pinned}>
                  <span className={styles.goalHead}>
                    <span className="display">{g.name}</span>
                    <span className={`${styles.goalCount} tabular`}>{g.have} / {g.goal}</span>
                  </span>
                  <span className={styles.goalDesc}>{g.description}</span>
                  <span className={styles.goalPrize}>{g.prize}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
