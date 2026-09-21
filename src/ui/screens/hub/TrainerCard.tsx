import { useMemo } from 'react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, HUB_UPGRADE_LABEL, MAX_LEVEL, REWARD_TRACK, levelProgress, xpForLevel, type HubUpgrade } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { hubUpgradeTip, tokenTip, trackRewardTip, trainerLevelTip } from '@/ui/tips';
import { trackRewardLabel } from './trackText';
import styles from './Hub.module.css';

// §8.4.3 — the Trainer Card: the profile and the goal-setting surface. Level, XP bar, Tokens, the lifetime
// numbers, and the whole reward track with the next row lit. No mechanical effect lives here.

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

  const facts: { label: string; value: string }[] = [
    { label: 'Runs won · lost', value: `${stats.wins} · ${stats.losses}` },
    { label: 'Fights won', value: String(stats.combatsWon) },
    { label: 'Recruited · evolved · mastered', value: `${stats.recruits} · ${stats.evolutions} · ${mastered}` },
    { label: 'Pokédex', value: `${dexKnown} / ${dexTotal}` },
    { label: 'Medals', value: `${medals} / ${ACHIEVEMENTS.length}` },
    { label: 'Hardest win', value: stats.hardestWin > 0 ? `${stats.hardestWin} modifier${stats.hardestWin === 1 ? '' : 's'}` : stats.wins > 0 ? 'Baseline' : '—' },
  ];

  return (
    <div className={styles.card} data-testid="trainer-card">
      <div className={styles.cardHead}>
        <div className={styles.level}>
          <Tipped tip={trainerLevelTip(p.level, p.into, p.span, MAX_LEVEL)}>
            <span className={`${styles.levelBig} display`} data-testid="trainer-level">Lv {p.level}</span>
          </Tipped>
          {account.titles[0] && <span className={styles.titleRibbon}>{account.titles[0]}</span>}
          <div className={styles.xpBar} role="progressbar" aria-valuemin={0} aria-valuemax={p.span || 1} aria-valuenow={p.into} aria-label="Trainer XP">
            <span className={styles.xpFill} style={{ width: `${Math.round(p.fraction * 100)}%` }} />
          </div>
          <span className={`${styles.xpText} tabular`} data-testid="trainer-xp">
            {p.level >= MAX_LEVEL ? `${account.xp} XP · max level` : `${p.into} / ${p.span} XP · ${account.xp} lifetime`}
          </span>
        </div>
        <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
          <span className={styles.tokens} data-testid="trainer-tokens">
            <span aria-hidden="true">🎟</span> <b className="tabular">{account.tokens}</b> Tokens
          </span>
        </Tipped>
      </div>

      <dl className={styles.facts}>
        {facts.map((f) => (
          <div key={f.label} className={styles.fact}>
            <dt>{f.label}</dt>
            <dd className="tabular">{f.value}</dd>
          </div>
        ))}
        <div className={styles.fact}>
          <dt>Favourite Lead</dt>
          <dd>
            {favourite ? (
              <span className={styles.fav}>
                <MonIcon speciesId={favourite.id} size={28} /> {content.species(favourite.id).name} <span className={styles.muted}>· {favourite.turns} turns</span>
              </span>
            ) : '—'}
          </dd>
        </div>
      </dl>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Hub upgrades
          <InfoDot tip={<Tip title="Hub upgrades" body="Seven conveniences the reward track hands out. Each widens an option — a bigger Box, a fourth Starting Relic, two starters — and none adds a point of damage." />} />
        </h2>
        <ul className={styles.chips}>
          {(Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]).map((u) => {
            const row = HUB_UPGRADE_LABEL[u];
            const got = account.hub.includes(u);
            return (
              <li key={u}>
                <Tipped tip={hubUpgradeTip(row.name, row.effect, HUB_LEVELS[u], got, got ? row.pending : undefined)}>
                  <span className={`${styles.chip} ${got ? (row.pending ? styles.chipWaiting : styles.chipOn) : ''}`} data-testid={`hub-upgrade-${u}`}>
                    {row.name} <span className={styles.muted}>· Lv {HUB_LEVELS[u]}</span>
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Reward track
          <InfoDot tip={<Tip title="The reward track" body="Every Trainer Level grants its reward the moment it is reached. Every fifth level pays Tokens; the rest open starters, relics, modifiers and Hub conveniences." footer="All three meta-starters by Level 12; the cap is 30." />} />
        </h2>
        <ol className={styles.track} data-testid="reward-track">
          {Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2).map((level) => {
            const reward = REWARD_TRACK[level]!;
            const state = account.claimedLevels.includes(level) ? 'claimed' : level === p.level + 1 ? 'next' : 'locked';
            const label = trackRewardLabel(reward, content);
            return (
              <li key={level} className={`${styles.trackRow} ${styles[`track_${state}`]}`} data-testid={`track-${level}`} data-state={state}>
                <Tipped tip={trackRewardTip(level, label, state, Math.max(0, xpForLevel(level) - account.xp))}>
                  <span className={styles.trackInner}>
                    <span className={`${styles.trackLevel} tabular`}>{level}</span>
                    <span className={styles.trackLabel}>{label}</span>
                    <span className={styles.trackMark} aria-hidden="true">{state === 'claimed' ? '✓' : state === 'next' ? '→' : ''}</span>
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
