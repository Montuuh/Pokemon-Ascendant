import { useMemo } from 'react';
import { IconBolt, IconBook2, IconCheck, IconEgg, IconMedal, IconStarFilled, IconSwords, IconTrophy, IconUsers } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import {
  HUB_UPGRADE_LABEL, LADDER_TOP, LEADER_TM, MART_PRICE, MAX_LEVEL, SHELVES, STARS, bondRank, cosmeticById, journalEntries, levelFor, rankRow, speciesMet, starsOf,
  trackTokensBetween, type HubUpgrade, BOND_TIER,
} from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { nodeBadge, trainerSprite } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { hubUpgradeTip, trainerXpTip, hubUpgradesTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import { FRAME_CLASS } from './frames';
import { LevelRing } from './LevelRing';
import { RewardTrack } from './RewardTrack';
import { TokenIcon } from './TokenIcon';
import styles from './Hub.module.css';
import journey from './Journey.module.css';

// §8.4.3 — the Trainer Card: the profile and the goal-setting surface. The rank is a dial you can read from
// across the room, the stars are the four feats (§8.15), the road is the ranks with the next one lit, the Badge
// Case is every Leader you have ever beaten (§8.14), and the numbers underneath are the record.
// What the card *wears* — title, avatar, frame — comes from the Trainer's Corner or the Journal (§8.4.4).

const SERVICES = (Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]).filter((u) => HUB_UPGRADE_LABEL[u].kind === 'service');

export function TrainerCard() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
  const animate = useMotionPref();
  const stats = account.stats;
  const rank = levelFor(account.xp);

  const favourite = useMemo(() => {
    const best = Object.entries(stats.leadTurns).sort((a, b) => b[1] - a[1])[0];
    return best && content.hasSpecies(best[0]) ? { id: best[0], turns: best[1] } : null;
  }, [stats.leadTurns, content]);

  const species = content.allSpecies();
  const met = species.filter((s) => speciesMet(account, s.id)).length;
  // §6.8.2 — "mastered" is a line at Soulbound, now that the Pokédex has one tier.
  const mastered = Object.values(account.bond).filter((pts) => bondRank(pts) >= BOND_TIER.soulbound).length;
  const title = account.wearing.title ? cosmeticById(account.wearing.title) : undefined;
  const avatar = account.wearing.avatar ? cosmeticById(account.wearing.avatar) : undefined;
  const frame = account.wearing.frame ? FRAME_CLASS[account.wearing.frame] : undefined;
  const journal = journalEntries(account, content);
  const stars = starsOf(account, content);
  const badges = content.allBadges();

  // §8.4.3 — the record. Every tile has a door (D2): the label is short, the bubble says what counts.
  const facts: { icon: React.ReactNode; label: string; value: React.ReactNode; tip: string }[] = [
    { icon: <IconTrophy size={18} />, label: 'Runs won · lost', value: `${stats.wins} · ${stats.losses}`, tip: 'Runs that beat the Champion, and runs that did not.' },
    { icon: <IconSwords size={18} />, label: 'Fights won', value: <NumberFlow value={stats.combatsWon} animated={animate} />, tip: 'Every fight won, wild or trainer, across every run.' },
    { icon: <IconUsers size={18} />, label: 'Recruited · evolved', value: `${stats.recruits} · ${stats.evolutions}`, tip: 'Pokémon that joined a Box of yours, and evolutions you chose.' },
    { icon: <IconBook2 size={18} />, label: 'Pokédex', value: `${met} / ${species.length}`, tip: 'Species you have met. Meet them all for the Pokédex star.' },
    { icon: <IconMedal size={18} />, label: 'Journal', value: `${journal.filter((e) => e.done).length} / ${journal.length}`, tip: "The Trainer Journal, with Professor Oak's aide." },
    { icon: <IconEgg size={18} />, label: 'Soulbound lines', value: String(mastered), tip: `Lines at Bond rank ${BOND_TIER.soulbound} or above: the line can start a run.` },
    { icon: <IconBolt size={18} />, label: 'League Ladder', value: stats.wins > 0 ? JOURNEY_TEXT.card.ladder(account.ladder, LADDER_TOP) : '—', tip: 'The highest League Ladder rung you have won. The Ladder opens when you beat the Champion.' },
  ];

  return (
    <div className={styles.card} data-testid="trainer-card">
      <div className={`${styles.cardHead} ${frame ?? ''}`} data-testid="card-head" data-frame={account.wearing.frame} data-stars={stars.length}>
        <LevelRing xp={account.xp} size={148} caption />
        <div className={styles.headBody}>
          <div className={styles.headTop}>
            <h2 className={`${styles.headTitle} display`}>
              {avatar?.sprite && <img src={trainerSprite(avatar.sprite)} alt={avatar.name} className={styles.avatar} data-testid="card-avatar" />}
              <span data-testid="card-rank">{rankRow(rank).name}</span>
              {title && <span className={styles.titleRibbon} data-testid="card-title">{title.name}</span>}
              {/* §8.15 — the four stars: a feat each, filled when it is done. */}
              <span className={journey.stars} role="group" aria-label={JOURNEY_TEXT.card.stars} data-testid="card-stars">
                {STARS.map((s) => {
                  const got = stars.includes(s.id);
                  return (
                    <Tipped key={s.id} tip={<Tip title={`${s.name} star`} body={JOURNEY_TEXT.card.star(s.name, s.earned, got)} />} className={`${journey.star} ${got ? journey.starOn : ''}`} data-testid={`star-${s.id}`} data-got={got}>
                      <IconStarFilled size={20} role="img" aria-label={JOURNEY_TEXT.card.star(s.name, s.earned, got)} />
                    </Tipped>
                  );
                })}
              </span>
              <InfoDot tip={trainerXpTip(`${account.xp} lifetime XP · ${account.tokensEarned} Tokens earned`)} />
            </h2>
          </div>
          <dl className={styles.facts}>
            {facts.map((f) => (
              <Tipped key={f.label} tip={<Tip title={f.label} body={f.tip} />} className={styles.fact}>
                <dt><span className={styles.factIcon} aria-hidden="true">{f.icon}</span>{f.label}</dt>
                <dd className="tabular">{f.value}</dd>
              </Tipped>
            ))}
            <div className={`${styles.fact} ${styles.factWide}`}>
              <dt><span className={styles.factIcon} aria-hidden="true"><IconUsers size={18} /></span>Favourite Lead</dt>
              <dd>
                {favourite ? (
                  <span className={styles.fav}>
                    <MonIcon speciesId={favourite.id} size={26} /> {content.species(favourite.id).name} <span className={styles.muted}>· {favourite.turns} turns</span>
                  </span>
                ) : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          The road ahead
          <InfoDot tip={<Tip title="The rank road" body="Every Trainer Rank brings someone or something to the lobby — Professor Oak's aide, the Poké Mart clerk, a Kit slot, fuller parcels — and a purse of Tokens with it. Click a stop to read it." footer={`${trackTokensBetween(1, MAX_LEVEL)} Tokens by ${rankRow(MAX_LEVEL).name}.`} />} />
        </h2>
        <RewardTrack account={account} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {JOURNEY_TEXT.card.badgeCase} <span className={`${styles.muted} tabular`}>{account.badges.length} / {badges.length}</span>
          <InfoDot tip={<Tip title={JOURNEY_TEXT.card.badgeCase} body={JOURNEY_TEXT.card.badgeCaseTip} />} />
        </h2>
        <ul className={journey.badgeCase} data-testid="badge-case">
          {badges.map((b) => {
            const won = account.badges.includes(b.id);
            const tm = LEADER_TM[b.id] ? content.tm(LEADER_TM[b.id]!).name : '';
            return (
              <li key={b.id}>
                <Tipped tip={<Tip title={b.name} meta={[`Region ${b.region}`]} body={won ? JOURNEY_TEXT.card.badgeGot(tm) : JOURNEY_TEXT.card.badgeNot(tm)} />} className={journey.badgeSlot} data-testid={`case-${b.id}`} data-won={won}>
                  <img src={nodeBadge(`gym-${b.type}`)} alt="" width={40} height={40} className="pixel" />
                  <span>{won ? b.name.replace(' Badge', '') : '???'}</span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {JOURNEY_TEXT.card.services}
          <InfoDot tip={hubUpgradesTip(SERVICES.length)} />
        </h2>
        <ul className={styles.chips}>
          {SERVICES.map((u) => {
            const row = HUB_UPGRADE_LABEL[u];
            const got = account.hub.includes(u);
            const price = MART_PRICE.hub[u] ?? null;
            return (
              <li key={u}>
                <Tipped tip={hubUpgradeTip(row.name, row.effect, price, SHELVES.hub.level, got, row.pending)}>
                  <span className={`${styles.chip} ${got ? (row.pending ? styles.chipWaiting : styles.chipOn) : ''}`} data-testid={`hub-upgrade-${u}`}>
                    {got && !row.pending && <span className={styles.chipTick} aria-hidden="true"><IconCheck size={13} stroke={3} /></span>}
                    {row.name} <span className={styles.muted}>· {got ? 'Yours' : <><TokenIcon size={13} /> {price}</>}</span>
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
