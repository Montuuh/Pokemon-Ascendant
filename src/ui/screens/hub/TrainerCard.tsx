import { useMemo } from 'react';
import { IconBook2, IconBolt, IconCheck, IconEgg, IconMedal, IconSwords, IconTrophy, IconUsers } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, HUB_UPGRADE_LABEL, MART_PRICE, MAX_LEVEL, SHELVES, XP, bondRank, cosmeticById, martShelf, trackTokensBetween, type HubUpgrade } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { trainerSprite } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { hubUpgradeTip } from '@/ui/tips';
import { FRAME_CLASS } from './frames';
import { LevelRing } from './LevelRing';
import { RewardTrack } from './RewardTrack';
import { TokenIcon } from './TokenIcon';
import styles from './Hub.module.css';

// §8.4.3 — the Trainer Card: the profile and the goal-setting surface. The level is a dial you can read from
// across the room, the track is a road with the next stop lit, and the numbers underneath are the record.
// No mechanical effect lives here. What the card *wears* — title, avatar, frame — is bought at the Poké Mart's
// Trainer's Corner (§8.4.4) and read off the account.

export function TrainerCard() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
  const animate = useMotionPref();
  const stats = account.stats;

  const favourite = useMemo(() => {
    const best = Object.entries(stats.leadTurns).sort((a, b) => b[1] - a[1])[0];
    return best && content.hasSpecies(best[0]) ? { id: best[0], turns: best[1] } : null;
  }, [stats.leadTurns, content]);

  const dexKnown = Object.values(account.dex).filter((e) => e.tier >= 1).length;
  const dexTotal = content.allSpecies().length;
  // §6.8.2 — "mastered" is a line at Soulbound, now that the Pokédex has one tier.
  const mastered = Object.values(account.bond).filter((pts) => bondRank(pts) >= 5).length;
  const title = account.wearing.title ? cosmeticById(account.wearing.title) : undefined;
  const avatar = account.wearing.avatar ? cosmeticById(account.wearing.avatar) : undefined;
  const frame = account.wearing.frame ? FRAME_CLASS[account.wearing.frame] : undefined;
  const medals = account.achievements.unlocked.length;

  // §8.4.3 — the record. Every tile has a door (D2): the label is short, the bubble says what counts.
  const facts: { icon: React.ReactNode; label: string; value: React.ReactNode; tip: string }[] = [
    { icon: <IconTrophy size={18} />, label: 'Runs won · lost', value: `${stats.wins} · ${stats.losses}`, tip: 'Runs that reached the end, and runs that did not.' },
    { icon: <IconSwords size={18} />, label: 'Fights won', value: <NumberFlow value={stats.combatsWon} animated={animate} />, tip: 'Every fight won, wild or trainer, across every run.' },
    { icon: <IconUsers size={18} />, label: 'Recruited · evolved', value: `${stats.recruits} · ${stats.evolutions}`, tip: 'Pokémon that joined a Box of yours, and evolutions you chose.' },
    { icon: <IconBook2 size={18} />, label: 'Pokédex', value: `${dexKnown} / ${dexTotal}`, tip: 'Species you know: their hidden intents show from turn one.' },
    { icon: <IconMedal size={18} />, label: 'Medals', value: `${medals} / ${ACHIEVEMENTS.length}`, tip: 'The medal case in the PC Terminal.' },
    { icon: <IconEgg size={18} />, label: 'Soulbound lines', value: String(mastered), tip: 'Lines at Bond rank 5 — every unlock open, and the line can start a run.' },
    { icon: <IconBolt size={18} />, label: 'Hardest win', value: stats.hardestWin > 0 ? `${stats.hardestWin} modifier${stats.hardestWin === 1 ? '' : 's'}` : stats.wins > 0 ? 'Baseline' : '—', tip: 'The most difficulty modifiers a won run carried.' },
  ];

  return (
    <div className={styles.card} data-testid="trainer-card">
      <div className={`${styles.cardHead} ${frame ?? ''}`} data-testid="card-head" data-frame={account.wearing.frame}>
        <LevelRing xp={account.xp} size={148} caption />
        <div className={styles.headBody}>
          <div className={styles.headTop}>
            <h2 className={`${styles.headTitle} display`}>
              {avatar?.sprite && <img src={trainerSprite(avatar.sprite)} alt={avatar.name} className={styles.avatar} data-testid="card-avatar" />}
              Trainer
              {title && <span className={styles.titleRibbon} data-testid="card-title">{title.name}</span>}
              <InfoDot tip={<Tip title="Trainer XP and Tokens" body={`XP is never spent: it moves the level, and every level pays Tokens and, four times, opens a shelf at the Poké Mart. A fight pays ${XP.combat}, a first recruit ${XP.recruit}, an evolution ${XP.evolution}, a Badge ${XP.gym}; a lost run pays by how far it got. Tokens also come from Gold and Platinum medals, and buy everything the Mart sells.`} footer={`${account.xp} lifetime XP · ${account.tokensEarned} Tokens earned`} />} />
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
          <InfoDot tip={<Tip title="The reward track" body={`Every Trainer Level pays Tokens the moment it is reached — two, more at every fifth — and the storefront stops open a shelf at the Poké Mart: Starters at ${SHELVES.starters.level}, Hub upgrades at ${SHELVES.hub.level}, Discoveries at ${SHELVES.discoveries.level}, the Mastery lane at ${SHELVES.mastery.level}. Click a stop to read it.`} footer={`${trackTokensBetween(1, MAX_LEVEL)} Tokens by Level ${MAX_LEVEL}.`} />} />
        </h2>
        <RewardTrack account={account} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Hub upgrades
          <InfoDot tip={<Tip title="Hub upgrades" body="Seven conveniences sold at the Poké Mart — the fourth Starting Relic at the Trainer's Corner, the rest on the Hub upgrades shelf from Level 5. Each widens an option — a bigger Box, two starters, a second modifier slot — and none adds a point of damage." />} />
        </h2>
        <ul className={styles.chips}>
          {(Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]).map((u) => {
            const row = HUB_UPGRADE_LABEL[u];
            const got = account.hub.includes(u);
            return (
              <li key={u}>
                <Tipped tip={hubUpgradeTip(row.name, row.effect, MART_PRICE.hub[u], SHELVES[martShelf({ kind: 'hub', id: u }, content) ?? 'hub'].level, got, row.pending)}>
                  <span className={`${styles.chip} ${got ? (row.pending ? styles.chipWaiting : styles.chipOn) : ''}`} data-testid={`hub-upgrade-${u}`}>
                    {got && !row.pending && <span className={styles.chipTick} aria-hidden="true"><IconCheck size={13} stroke={3} /></span>}
                    {row.name} <span className={styles.muted}>· {got ? 'Yours' : <><TokenIcon size={13} /> {MART_PRICE.hub[u]}</>}</span>
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
