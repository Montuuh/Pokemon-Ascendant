import { useMemo } from 'react';
import { IconBook2, IconBolt, IconEgg, IconMedal, IconSwords, IconTrophy, IconUsers } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, HUB_UPGRADE_LABEL, MAX_LEVEL, levelProgress, type HubUpgrade } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { hubUpgradeTip, tokenTip } from '@/ui/tips';
import { LevelRing } from './LevelRing';
import { RewardTrack } from './RewardTrack';
import { TokenIcon } from './TokenIcon';
import styles from './Hub.module.css';

// §8.4.3 — the Trainer Card: the profile and the goal-setting surface. The level is a dial you can read from
// across the room, the track is a road with the next stop lit, and the numbers underneath are the record.
// No mechanical effect lives here.

const HUB_LEVELS: Record<HubUpgrade, number> = {
  'starting-relic-plus-one': 3,
  'expanded-box': 6,
  'pokedex-insight': 7,
  'trauma-salve-cache': 9,
  'apex-reveal': 11,
  'modifier-slot-plus-one': 13,
  'twin-run': 18,
};

export function TrainerCard() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
  const animate = useMotionPref();
  const p = levelProgress(account.xp);
  const stats = account.stats;

  const favourite = useMemo(() => {
    const best = Object.entries(stats.leadTurns).sort((a, b) => b[1] - a[1])[0];
    return best && content.hasSpecies(best[0]) ? { id: best[0], turns: best[1] } : null;
  }, [stats.leadTurns, content]);

  const dexKnown = Object.values(account.dex).filter((e) => e.tier >= 1).length;
  const dexTotal = content.allSpecies().length;
  const mastered = Object.values(account.dex).filter((e) => e.tier >= 3).length;
  const medals = account.achievements.unlocked.length;

  const facts: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    { icon: <IconTrophy size={18} />, label: 'Runs won · lost', value: `${stats.wins} · ${stats.losses}` },
    { icon: <IconSwords size={18} />, label: 'Fights won', value: <NumberFlow value={stats.combatsWon} animated={animate} /> },
    { icon: <IconUsers size={18} />, label: 'Recruited · evolved', value: `${stats.recruits} · ${stats.evolutions}` },
    { icon: <IconBook2 size={18} />, label: 'Pokédex', value: `${dexKnown} / ${dexTotal}` },
    { icon: <IconMedal size={18} />, label: 'Medals', value: `${medals} / ${ACHIEVEMENTS.length}` },
    { icon: <IconEgg size={18} />, label: 'Mastered', value: String(mastered) },
    { icon: <IconBolt size={18} />, label: 'Hardest win', value: stats.hardestWin > 0 ? `${stats.hardestWin} modifier${stats.hardestWin === 1 ? '' : 's'}` : stats.wins > 0 ? 'Baseline' : '—' },
  ];

  return (
    <div className={styles.card} data-testid="trainer-card">
      <div className={styles.cardHead}>
        <LevelRing xp={account.xp} size={148} caption />
        <div className={styles.headBody}>
          <div className={styles.headTop}>
            <h2 className={`${styles.headTitle} display`}>
              Trainer
              {account.titles[0] && <span className={styles.titleRibbon}>{account.titles[0]}</span>}
            </h2>
            <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
              <span className={styles.tokens} data-testid="trainer-tokens">
                <TokenIcon /> <b className="tabular"><NumberFlow value={account.tokens} animated={animate} /></b> Tokens
              </span>
            </Tipped>
          </div>
          <p className={styles.headLede}>
            {p.level >= MAX_LEVEL
              ? 'Every reward on the track is yours.'
              : <><b className="tabular">{p.span - p.into} XP</b> to Level {p.level + 1}. Every fight pays 5, a recruit 10, an evolution 15, a Badge 50 — and a lost run pays by how far it got.</>}
            <InfoDot tip={<Tip title="Trainer XP and Tokens" body="XP is never spent: it only moves the level, and each level hands out the stop on the road below. Tokens are the other currency — from every fifth level and from Gold and Platinum medals — and buy one thing: Tier-3 relics at the Poké Mart." footer={`${account.xp} lifetime XP · ${account.tokensEarned} Tokens earned`} />} />
          </p>
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.label} className={styles.fact}>
                <dt><span className={styles.factIcon} aria-hidden="true">{f.icon}</span>{f.label}</dt>
                <dd className="tabular">{f.value}</dd>
              </div>
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
          <InfoDot tip={<Tip title="The reward track" body="Every Trainer Level grants its stop the moment it is reached. Every fifth level pays Tokens; the rest open starters, relics, modifiers and Hub conveniences. Click a stop to read it." footer="All three meta-starters by Level 12; the cap is 30." />} />
        </h2>
        <RewardTrack account={account} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Hub upgrades
          <InfoDot tip={<Tip title="Hub upgrades" body="Seven conveniences the road hands out. Each widens an option — a bigger Box, a fourth Starting Relic, two starters — and none adds a point of damage." />} />
        </h2>
        <ul className={styles.chips}>
          {(Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]).map((u) => {
            const row = HUB_UPGRADE_LABEL[u];
            const got = account.hub.includes(u);
            return (
              <li key={u}>
                <Tipped tip={hubUpgradeTip(row.name, row.effect, HUB_LEVELS[u], got, got ? row.pending : undefined)}>
                  <span className={`${styles.chip} ${got ? (row.pending ? styles.chipWaiting : styles.chipOn) : ''}`} data-testid={`hub-upgrade-${u}`}>
                    {got && !row.pending && <span className={styles.chipTick} aria-hidden="true">✓</span>}
                    {row.name} <span className={styles.muted}>· Lv {HUB_LEVELS[u]}</span>
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
