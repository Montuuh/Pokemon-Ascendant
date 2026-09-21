import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { BOND_LADDER, BOND_RANK_NAME, DEX_TIER_NAME, MAX_LEVEL, levelFor, levelProgress } from '@/sim';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { tokenTip, trainerLevelTip } from '@/ui/tips';
import { trackRewardLabel } from './trackText';
import { TokenIcon } from './TokenIcon';
import styles from './AccountSummary.module.css';

// §8.3 — what the run just did for the account: XP earned, the level moved, the track rewards, Tokens, medals,
// Pokédex promotions, Mastery unlocks and relics discovered. One block, shown on the run-end screen. It reads
// the ledger the account store kept from the run's first fold, so a reload mid-run does not lose the total.

const MEDAL_GLYPH: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

export function AccountSummary() {
  const account = useAccountStore((s) => s.account);
  const ledger = useAccountStore((s) => s.ledger);
  const content = getContent();
  const p = levelProgress(account.xp);
  const from = ledger.levelAtStart;
  const to = levelFor(account.xp);

  const lines: { key: string; glyph: string; text: string }[] = [];
  for (const r of ledger.rewards) lines.push({ key: `r${r.level}`, glyph: '★', text: `Level ${r.level}: ${trackRewardLabel(r.reward)}` });
  for (const a of ledger.unlockedAchievements) lines.push({ key: `a${a.id}`, glyph: MEDAL_GLYPH[a.tier] ?? '🏅', text: `${a.name} — ${a.description}` });
  for (const d of ledger.dexPromotions) lines.push({ key: `d${d.speciesId}${d.tier}`, glyph: '📖', text: `${content.species(d.speciesId).name} is now ${DEX_TIER_NAME[d.tier]}` });
  // §6.8 — Bond: one line per line, the points and any rank it crossed.
  const bondByLine = new Map<string, number>();
  for (const g of ledger.bondGains) bondByLine.set(g.line, (bondByLine.get(g.line) ?? 0) + g.points);
  for (const [line, pts] of bondByLine) {
    const ups = ledger.bondRankUps.filter((r) => r.line === line).map((r) => r.rank);
    const top = ups.length ? Math.max(...ups) : null;
    lines.push({ key: `b${line}`, glyph: '✦', text: `${content.species(line).name} line: +${pts} Bond${top ? ` → ${BOND_RANK_NAME[top]} (${BOND_LADDER[top - 1]!.unlock})` : ''}` });
  }
  for (const id of ledger.discoveredRelics) lines.push({ key: `x${id}`, glyph: '◆', text: `Discovered ${content.relic(id).name}` });

  return (
    <section className={styles.root} data-testid="account-summary">
      <div className={styles.head}>
        <h2 className={styles.title}>
          Trainer
          <InfoDot tip={<Tip title="Trainer XP" body="Every fight, recruit, evolution and Badge paid into your account, and a lost run pays by how far it got. XP is never spent: each level pays Tokens, and four of them open a shelf at the Poké Mart." footer="The Trainer Card in the Hub has the whole track." />} />
        </h2>
        <Tipped tip={trainerLevelTip(p.level, p.into, p.span, MAX_LEVEL)}>
          <span className={styles.level} data-testid="summary-level">
            {to > from ? (
              <>Lv {from} <span aria-hidden="true">→</span> <b>{to}</b></>
            ) : (
              <>Lv <b>{to}</b></>
            )}
          </span>
        </Tipped>
      </div>

      <div className={styles.xpRow}>
        <span className={`${styles.xp} tabular`} data-testid="summary-xp">+{ledger.xp} XP</span>
        <span className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={p.span || 1} aria-valuenow={p.into} aria-label="Trainer XP">
          <span className={styles.fill} style={{ width: `${Math.round(p.fraction * 100)}%` }} />
        </span>
        <span className={`${styles.toNext} tabular`}>{p.level >= MAX_LEVEL ? 'Max' : `${p.span - p.into} to Lv ${p.level + 1}`}</span>
        {ledger.tokens > 0 && (
          <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
            <span className={styles.tokens} data-testid="summary-tokens"><TokenIcon /> +{ledger.tokens}</span>
          </Tipped>
        )}
      </div>

      {lines.length > 0 && (
        <ul className={styles.lines} data-testid="summary-lines">
          {lines.map((l) => (
            <li key={l.key}>
              <span className={styles.glyph} aria-hidden="true">{l.glyph}</span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
