import { useEffect, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { IconAward, IconCertificate, IconFlag, IconNotebook, IconPackage, IconPlayerSkipForward, IconTrophy } from '@tabler/icons-react';
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
import { itemIcon, mapPerson, nodeBadge, tmIcon, trainerSprite } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { bondRulesTip, reportTokensTip, reportXpTip, researchTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import { TokenIcon } from '../hub/TokenIcon';
import { ParcelOffer } from '../hub/OakAide';
import styles from './FieldReport.module.css';

// §8.3.6 — the Field Report: a run's end as a prize-giving, in the order the series pays things. The tally is
// counted, the bars fill from where the run found them, what was earned is drawn as the thing it is, and the last
// panel is what to chase next. Every panel is on the screen at rest and none of them scrolls: a row is a picture, a
// name and a number, and its sentence is one hover away. Motion only decides when each panel arrives; Skip, or a
// reduced-motion setting, lands them all at once.

/** Seconds between one panel arriving and the next, and how long each takes to land. */
const STEP = 0.45;
const LAND = 0.22;
/**
 * What a panel draws before it counts the rest. The report never scrolls and never outgrows its row at 720p, so a
 * long run is capped by rows — the heaviest first — and the rest is one hover away.
 */
const TALLY_ROWS = 4;
const BOND_ROWS = 3;
const EARNED_SHOWN = 8;

function Panel({ index, fast, heading, aside, testId, onArrive, children }: { index: number; fast: boolean; heading: ReactNode; aside?: ReactNode; testId: string; onArrive?: () => void; children: ReactNode }) {
  const animate = useMotionPref() && !fast;
  return (
    <motion.section
      className={styles.panel}
      data-testid={testId}
      initial={animate ? { opacity: 0, transform: 'translateY(10px)' } : false}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ delay: animate ? index * STEP : 0, duration: LAND, ease: 'easeOut' }}
      {...(onArrive ? { onAnimationComplete: onArrive } : {})}
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
function FillBar({ from, to, delay, fast, label, tone = 'xp' }: { from: number; to: number; delay: number; fast: boolean; label: string; tone?: 'xp' | 'research' }) {
  const animate = useMotionPref() && !fast;
  // The bar waits at `from` until its panel has arrived, then lands on `to`; with motion off it is there already.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(() => setLanded(true), (delay + LAND) * 1000);
    return () => window.clearTimeout(id);
  }, [animate, delay]);
  const at = !animate || landed ? to : from;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return (
    <span className={styles.bar} data-tone={tone} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(to) * 100)} aria-label={label}>
      <span className={styles.barFrom} style={{ transform: `scaleX(${clamp(from)})` }} />
      <span className={styles.barFill} style={{ transform: `scaleX(${clamp(at)})` }} />
    </span>
  );
}

/** One thing the run handed over: its own picture, with its name and what it is a hover away. */
interface Prize {
  key: string;
  icon: ReactNode;
  name: string;
  detail?: string | undefined;
}

export function FieldReport({ won }: { won: boolean }) {
  const account = useAccountStore((s) => s.account);
  const ledger = useAccountStore((s) => s.ledger);
  const content = getContent();
  const motionOn = useMotionPref();
  const [fast, setFast] = useState(false);
  // The parcels waiting when the sheet opened: its button says Later until one is taken, Done after.
  const [parcelOpen, setParcelOpen] = useState<number | null>(null);
  // Skip is there only while there is something left to skip: until the last panel has landed.
  const [arrived, setArrived] = useState(false);
  const animate = motionOn && !fast;

  // 1 — the tally: the lines that paid most, and the rest as one row. The figure's bubble is every line.
  const lines = (REPORT_LINES.filter((l) => (ledger.xpBy[l] ?? 0) > 0) as ReportLine[]).sort((a, b) => (ledger.xpBy[b] ?? 0) - (ledger.xpBy[a] ?? 0));
  const tally = lines.length > TALLY_ROWS + 1 ? lines.slice(0, TALLY_ROWS) : lines;
  const tallyRest = lines.slice(tally.length);

  // 2 — Research and the Rank: both fill with the same XP, from where the run began.
  const cost = parcelCost(account.parcelsEarned);
  const researchFrom = ledger.parcels > 0 ? 0 : Math.min(1, (ledger.researchAtStart ?? 0) / cost);
  const rank = levelProgress(account.xp);
  const rankUp = levelFor(account.xp) > ledger.levelAtStart;
  const rankFrom = rankUp || rank.span === 0 ? 0 : Math.max(0, (ledger.xpAtStart - xpForLevel(rank.level)) / rank.span);

  // 3 — Bond, per line, most gained first.
  const byLine = new Map<string, number>();
  for (const g of ledger.bondGains) byLine.set(g.line, (byLine.get(g.line) ?? 0) + g.points);
  const bonds = [...byLine.entries()].sort((a, b) => b[1] - a[1]);

  // 4 — what the run handed over, each drawn as the thing it is, the heaviest first: the strip counts what it cannot
  // show, and a Hall of Fame entry is never the thing behind "+3".
  const pix = (src: string) => <img src={src} alt="" width={28} height={28} className={`pixel ${styles.prizeArt}`} />;
  const prizes: Prize[] = [];
  if (ledger.hall) prizes.push({ key: 'hall', icon: <IconTrophy size={24} />, name: JOURNEY_TEXT.report.hall });
  if (ledger.ladderRung) prizes.push({ key: 'ladder', icon: <IconFlag size={24} />, name: JOURNEY_TEXT.report.ladder(ledger.ladderRung) });
  for (const id of ledger.newBadges) prizes.push({ key: `badge${id}`, icon: pix(nodeBadge(`gym-${content.badge(id).type}`)), name: JOURNEY_TEXT.report.badge(content.badge(id).name), detail: JOURNEY_TEXT.report.badgeDetail });
  for (const r of ledger.rewards) prizes.push({ key: `rank${r.level}`, icon: pix(mapPerson(r.level === 2 ? 'scientist' : r.level === 3 ? 'merchant' : 'acetrainer')), name: JOURNEY_TEXT.report.rank(rankRow(r.level).name, r.reward.arrives), detail: r.reward.why });
  for (const id of ledger.opened) {
    const entry = vaultEntry(id);
    if (!entry) continue;
    const card = vaultCard(entry, content);
    prizes.push({ key: `open${id}`, icon: pix(entry.kind === 'tm' ? tmIcon(entry.ids[0]!) : itemIcon(entry.ids[0]!)), name: JOURNEY_TEXT.report.opened(card.name), detail: card.description });
  }
  for (const j of ledger.journalRewards) {
    const a = achievementById(j.id);
    if (!a) continue;
    const trophy = j.reward.cosmetic ? cosmeticById(j.reward.cosmetic) : undefined;
    const extra = [trophy?.name ?? '', j.reward.parcels ? JOURNEY_TEXT.report.parcels(j.reward.parcels) : ''].filter(Boolean).join(' · ');
    prizes.push({ key: `j${j.id}`, icon: trophy?.sprite ? pix(trainerSprite(trophy.sprite)) : <MedalIcon tier={a.tier} size={28} />, name: `${a.name}${extra ? ` — ${extra}` : ''}`, detail: a.description });
  }
  // A Field Note whose relic left the vault is already in the strip, as that relic.
  for (const id of ledger.notes) {
    if (ledger.opened.includes(`relic:${id}`)) continue;
    prizes.push({ key: `note${id}`, icon: <IconNotebook size={24} />, name: JOURNEY_TEXT.report.note(content.relic(id).name), detail: content.relic(id).discovery?.text });
  }
  for (const a of ledger.aides) prizes.push({ key: `aide${a.owned}`, icon: <IconAward size={24} />, name: JOURNEY_TEXT.report.aide(a.owned, a.perk ? HUB_UPGRADE_LABEL[a.perk].name : a.parcels ? JOURNEY_TEXT.report.parcels(a.parcels) : `${a.tokens} Tokens`) });
  if (ledger.ribbons.length) prizes.push({ key: 'ribbons', icon: <IconCertificate size={24} />, name: JOURNEY_TEXT.report.ribbons(ledger.ribbons.length), detail: JOURNEY_TEXT.report.ribbonsDetail });
  // The "+N" tile takes a place of its own, so the strip is never more than EARNED_SHOWN tiles.
  const shown = prizes.length > EARNED_SHOWN ? prizes.slice(0, EARNED_SHOWN - 1) : prizes;
  const rest = prizes.slice(shown.length);

  const moneyTokens = ledger.moneyTokens.reduce((n, m) => n + m.tokens, 0);
  const money = ledger.moneyTokens.reduce((n, m) => n + m.money, 0);
  const goals = nextGoals(account, content, 3, (id) => cosmeticById(id)?.name ?? id);

  return (
    <div className={styles.root} data-testid="field-report" data-fast={fast} data-outcome={won ? 'victory' : 'defeat'}>
      <header className={styles.head}>
        <h2 className={`${styles.title} display`}>{JOURNEY_TEXT.report.title}</h2>
        {animate && !arrived && (
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
            <Tipped tip={reportXpTip(ledger.xp, lines.map((l) => ({ label: JOURNEY_TEXT.report.line[l]!, xp: ledger.xpBy[l] ?? 0 })))}>
              <span className={`${styles.figure} display tabular`} data-testid="summary-xp" data-xp={ledger.xp}>+<NumberFlow value={ledger.xp} animated={animate} /> XP</span>
            </Tipped>
          }
        >
          <dl className={styles.tally}>
            {tally.map((l) => (
              <div key={l}>
                <dt>{JOURNEY_TEXT.report.line[l]}</dt>
                <dd className="tabular">+{ledger.xpBy[l]}</dd>
              </div>
            ))}
            {tallyRest.length > 0 && (
              <div data-testid="report-tally-more">
                <dt>{JOURNEY_TEXT.report.tallyMore(tallyRest.length)}</dt>
                <dd className="tabular">+{tallyRest.reduce((n, l) => n + (ledger.xpBy[l] ?? 0), 0)}</dd>
              </div>
            )}
            {lines.length === 0 && <div><dt>{JOURNEY_TEXT.report.nothing}</dt><dd className="tabular">+0</dd></div>}
          </dl>
        </Panel>

        <Panel index={1} fast={fast} heading={<>{JOURNEY_TEXT.research} <InfoDot tip={researchTip()} /></>} testId="report-research">
          <div className={styles.meter}>
            <FillBar from={researchFrom} to={account.research / cost} delay={1 * STEP} fast={fast} label={JOURNEY_TEXT.research} tone="research" />
            <span className={`${styles.meterText} tabular`}>{account.research} / {cost}</span>
          </div>
          {ledger.parcels > 0 && (
            <p className={styles.callout} data-testid="report-parcels" data-earned={ledger.parcels}>
              <IconPackage size={20} aria-hidden="true" /> {JOURNEY_TEXT.report.parcelsEarned(ledger.parcels)}
            </p>
          )}
          {/* The sheet stays up after the last parcel is taken, so the card just added is said before it closes. */}
          {(account.parcels > 0 || parcelOpen !== null) && (
            <Dialog.Root open={parcelOpen !== null} onOpenChange={(open) => setParcelOpen(open ? account.parcels : null)}>
              {account.parcels > 0 && (
                <Dialog.Trigger asChild>
                  <button type="button" className={styles.open} data-testid="btn-open-parcel">{JOURNEY_TEXT.report.openParcel(account.parcels)}</button>
                </Dialog.Trigger>
              )}
              <Dialog.Portal>
                <Dialog.Overlay className={styles.scrim} />
                {/* Focus lands on the sheet, not on the first card: a card under the keyboard would open its bubble over
                    the sheet's heading, and a second Enter would take it. */}
                <Dialog.Content
                  className={styles.parcelSheet}
                  aria-describedby={undefined}
                  data-testid="parcel-sheet"
                  tabIndex={-1}
                  onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).focus();
                  }}
                >
                  <Dialog.Title className="sr-only">{JOURNEY_TEXT.parcel.title}</Dialog.Title>
                  <ParcelOffer inSheet />
                  <Dialog.Close asChild>
                    <button type="button" className={styles.later} data-testid="btn-parcel-later">{parcelOpen !== null && account.parcels < parcelOpen ? JOURNEY_TEXT.report.done : JOURNEY_TEXT.report.later}</button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </Panel>

        <Panel index={2} fast={fast} heading={`${rankRow(rank.level).name} · ${JOURNEY_TEXT.rank(rank.level)}`} testId="report-rank">
          <div className={styles.meter}>
            <FillBar from={rankFrom} to={rank.fraction} delay={2 * STEP} fast={fast} label={JOURNEY_TEXT.report.rankBar} />
            <span className={`${styles.meterText} tabular`}>{rank.level >= MAX_LEVEL ? JOURNEY_TEXT.report.topRank : JOURNEY_TEXT.report.toNext(rank.span - rank.into, rankRow(rank.level + 1).name)}</span>
          </div>
          {rankUp && <p className={styles.callout} data-testid="report-rank-up">{JOURNEY_TEXT.report.rankUp(rankRow(ledger.levelAtStart).name, rankRow(rank.level).name)}</p>}
        </Panel>

        <Panel index={3} fast={fast} heading={<>{JOURNEY_TEXT.report.bond} <InfoDot tip={bondRulesTip()} /></>} testId="report-bond">
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
                const name = content.species(line).name;
                const body = crossed ? `${BOND_RANK_NAME[p.rank]}: ${BOND_LADDER[p.rank - 1]!.unlock}.` : JOURNEY_TEXT.report.bondRank(p.rank, MAX_BOND_RANK);
                return (
                  <Tipped as="li" key={line} tip={<Tip title={`${name} — +${points} Bond`} body={body} />} tabIndex={0} data-testid={`report-bond-${line}`} data-rank={p.rank} data-crossed={crossed}>
                    <MonIcon speciesId={line} size={28} />
                    <span className={styles.bondBody}>
                      <span className={styles.bondHead}>
                        <span className={`${styles.bondName} display`}>{name}</span>
                        <span className={`${styles.bondPts} tabular`}>+{points}</span>
                      </span>
                      {/* A rank crossed is said beside the bar it refilled, so the name keeps its line. */}
                      <span className={styles.bondMeter}>
                        <FillBar from={from} to={p.fraction} delay={3 * STEP} fast={fast} label={JOURNEY_TEXT.report.bondBar(name)} />
                        {crossed && <span className={styles.bondUp}>{BOND_RANK_NAME[p.rank]}</span>}
                      </span>
                    </span>
                  </Tipped>
                );
              })}
              {bonds.length > BOND_ROWS && <li className={styles.quiet}>{JOURNEY_TEXT.report.moreLines(bonds.length - BOND_ROWS)}</li>}
            </ul>
          )}
        </Panel>

        <Panel
          index={4}
          fast={fast}
          heading={JOURNEY_TEXT.report.earned}
          testId="report-earned"
          aside={
            <Tipped tip={reportTokensTip(ledger.tokens, ledger.reportTokens, moneyTokens, money)} data-testid="report-tokens" data-tokens={ledger.tokens}>
              <span className={`${styles.figure} display tabular`}><TokenIcon /> +<NumberFlow value={ledger.tokens} animated={animate} /></span>
            </Tipped>
          }
        >
          {prizes.length === 0 ? (
            <p className={styles.quiet}>{JOURNEY_TEXT.report.nothingNamed}</p>
          ) : (
            <ul className={styles.prizes}>
              {shown.map((p) => (
                <Tipped as="li" key={p.key} tip={<Tip title={p.name} body={p.detail} />} className={styles.prize} tabIndex={0} aria-label={p.name} data-testid={`report-prize-${p.key}`}>
                  {p.icon}
                </Tipped>
              ))}
              {rest.length > 0 && (
                <Tipped as="li" tip={<Tip title={JOURNEY_TEXT.report.more(rest.length)} body={rest.map((p) => <div key={p.key}>{p.name}</div>)} />} className={`${styles.prize} ${styles.prizeMore} tabular`} tabIndex={0} data-testid="report-prize-more">
                  +{rest.length}
                </Tipped>
              )}
            </ul>
          )}
        </Panel>

        <Panel index={5} fast={fast} heading={JOURNEY_TEXT.report.next} testId="report-next" onArrive={() => setArrived(true)}>
          {goals.length === 0 ? (
            <p className={styles.quiet}>{JOURNEY_TEXT.report.noGoals}</p>
          ) : (
            <ul className={styles.goals}>
              {goals.map((g) => (
                <Tipped as="li" key={g.id} tip={<Tip title={g.name} meta={g.pinned ? [JOURNEY_TEXT.report.pinned] : undefined} body={g.description} footer={g.prize} />} tabIndex={0} data-testid={`report-goal-${g.id}`} data-pinned={g.pinned}>
                  <span className={styles.goalHead}>
                    <span className="display">{g.name}</span>
                    <span className={`${styles.goalCount} tabular`}>{g.have} / {g.goal}</span>
                  </span>
                  <span className={styles.goalBar} aria-hidden="true"><span style={{ transform: `scaleX(${Math.min(1, g.have / g.goal)})` }} /></span>
                </Tipped>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
