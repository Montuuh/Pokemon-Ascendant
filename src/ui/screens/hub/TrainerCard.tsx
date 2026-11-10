import { useMemo } from 'react';
import { IconBolt, IconBook2, IconEgg, IconMedal, IconStar, IconStarFilled, IconSwords, IconTrophy, IconUsers } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { BOND_TIER, LADDER_TOP, LEADER_TM, MAX_LEVEL, STARS, bondRank, cosmeticById, journalEntries, levelFor, rankRow, speciesMet, starsOf, trackTokensBetween } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { nodeBadge, trainerSprite } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { badgeCaseTip, badgeSlotTip, cardFactTip, rankRoadTip, starTip, trainerXpTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import { FRAME_CLASS } from './frames';
import { LevelRing } from './LevelRing';
import { RewardTrack } from './RewardTrack';
import styles from './Hub.module.css';
import journey from './Journey.module.css';

// §8.4.3 — the Trainer Card: the profile and the goal-setting surface. The rank is a dial you can read from
// across the room, the stars are the four feats (§8.15), the road is the ranks with the next one lit, the Badge
// Case is every Leader you have ever beaten (§8.14), three Regions of four, and the numbers underneath are the
// record. What the card *wears* — title, avatar, frame — comes from the Trainer's Corner or the Journal (§8.4.4).
// The services are the Mart's shelf, and are read there.

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
  // §8.14 — a row a Region.
  const badges = [...content.allBadges()].sort((a, b) => a.region - b.region);

  // §8.4.3 — the record. Every tile has a door (D2): the label is short, the bubble says what counts.
  const F = JOURNEY_TEXT.card.facts;
  const facts: { icon: React.ReactNode; label: string; value: React.ReactNode; tip: string; wide?: boolean }[] = [
    { icon: <IconTrophy size={18} />, label: F.runs.label, value: `${stats.wins} · ${stats.losses}`, tip: F.runs.tip },
    { icon: <IconSwords size={18} />, label: F.fights.label, value: <NumberFlow value={stats.combatsWon} animated={animate} />, tip: F.fights.tip },
    { icon: <IconUsers size={18} />, label: F.recruits.label, value: `${stats.recruits} · ${stats.evolutions}`, tip: F.recruits.tip },
    { icon: <IconBook2 size={18} />, label: F.pokedex.label, value: `${met} / ${species.length}`, tip: F.pokedex.tip },
    { icon: <IconMedal size={18} />, label: F.journal.label, value: `${journal.filter((e) => e.done).length} / ${journal.length}`, tip: F.journal.tip },
    { icon: <IconEgg size={18} />, label: F.soulbound.label, value: String(mastered), tip: F.soulbound.tip(BOND_TIER.soulbound) },
    { icon: <IconBolt size={18} />, label: F.ladder.label, value: stats.wins > 0 ? JOURNEY_TEXT.card.ladder(account.ladder, LADDER_TOP) : '—', tip: F.ladder.tip },
    {
      icon: <IconUsers size={18} />,
      label: F.lead.label,
      wide: true,
      tip: F.lead.tip,
      value: favourite ? (
        <span className={styles.fav}>
          <MonIcon speciesId={favourite.id} size={26} /> {content.species(favourite.id).name} <span className={styles.muted}>· {favourite.turns} turns</span>
        </span>
      ) : '—',
    },
  ];

  return (
    <div className={styles.card} data-testid="trainer-card">
      <div className={`${styles.cardHead} ${frame ?? ''}`} data-testid="card-head" data-frame={account.wearing.frame}>
        <LevelRing xp={account.xp} size={148} caption />
        <div className={styles.headBody}>
          <div className={styles.headTop}>
            <h2 className={`${styles.headTitle} display`}>
              {avatar?.sprite && <img src={trainerSprite(avatar.sprite)} alt={avatar.name} className={styles.avatar} data-testid="card-avatar" />}
              <span data-testid="card-rank">{rankRow(rank).name}</span>
              {title && <span className={styles.titleRibbon} data-testid="card-title">{title.name}</span>}
              {/* §8.15 — the four stars: a feat each, filled when it is done. */}
              <span className={journey.stars} role="group" aria-label={JOURNEY_TEXT.card.stars}>
                {STARS.map((s) => {
                  const got = stars.includes(s.id);
                  return (
                    <Tipped key={s.id} tip={starTip(s.name, s.earned, got)} className={`${journey.star} ${got ? journey.starOn : ''}`} tabIndex={0} data-testid={`star-${s.id}`} data-got={got}>
                      {/* Earned is the filled star, not earned its outline: the shape says it, not only the colour. */}
                      {got ? <IconStarFilled size={20} role="img" aria-label={`${s.name} star, earned`} /> : <IconStar size={20} role="img" aria-label={`${s.name} star`} />}
                    </Tipped>
                  );
                })}
              </span>
              <InfoDot tip={trainerXpTip(`${account.xp} lifetime XP · ${account.tokensEarned} Tokens earned`)} />
            </h2>
          </div>
          <dl className={styles.facts}>
            {facts.map((f) => (
              <Tipped as="div" key={f.label} tip={cardFactTip(f.label, f.tip)} className={`${styles.fact} ${f.wide ? styles.factWide : ''}`}>
                <dt><span className={styles.factIcon} aria-hidden="true">{f.icon}</span>{f.label}</dt>
                <dd className={f.wide ? undefined : 'tabular'}>{f.value}</dd>
              </Tipped>
            ))}
          </dl>
        </div>
      </div>

      {/* The road and the Badge Case stand side by side, so neither is under the fold at 720p. */}
      <div className={journey.cardLower}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {JOURNEY_TEXT.card.road}
          <InfoDot tip={rankRoadTip(trackTokensBetween(1, MAX_LEVEL), rankRow(MAX_LEVEL).name)} />
        </h2>
        <RewardTrack account={account} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {JOURNEY_TEXT.card.badgeCase} <span className={`${styles.muted} tabular`}>{account.badges.length} / {badges.length}</span>
          <InfoDot tip={badgeCaseTip()} />
        </h2>
        <ul className={journey.badgeCase}>
          {badges.map((b) => {
            const won = account.badges.includes(b.id);
            const tm = LEADER_TM[b.id] ? content.tm(LEADER_TM[b.id]!).name : '';
            return (
              <li key={b.id}>
                <Tipped tip={badgeSlotTip(b.name, b.region, tm, won)} className={journey.badgeSlot} tabIndex={0} data-testid={`case-${b.id}`} data-won={won}>
                  <img src={nodeBadge(`gym-${b.type}`)} alt={won ? b.name : 'A Badge not won yet'} width={44} height={44} className="pixel" />
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>
      </div>
    </div>
  );
}
