import { useMemo, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useAchievementStore } from '@/app/achievementStore';
import { ACHIEVEMENTS, type AchievementDef, type MedalTier } from '@/sim';
import { InfoDot, Tip } from '@/ui/tooltip';
import styles from './HubScreen.module.css';

// §8.4 — the Trainer Hub, as much of it as v0.5 can honestly show.
//
// Canon gives it five kiosks. Four of them are Trainer XP, Tokens and the Pokédex, which are v0.6: the hub
// *shell* is what v0.5 owes, so the PC Terminal is real and the rest are named with the version that opens
// them. Showing a locked kiosk beats hiding it — it is the map of where the meta is going, and §7.7's rule
// about labelled blanks applies to a door as much as to a relic.

const CATEGORY_LABEL: Record<AchievementDef['category'], string> = {
  'first-steps': 'First steps',
  recruitment: 'Recruitment',
  evolution: 'Evolution',
  combat: 'Combat',
  boss: 'Gym Leaders',
  'build-identity': 'Build identity',
  endurance: 'Endurance',
};

const MEDAL_GLYPH: Record<MedalTier, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

const KIOSKS = [
  { id: 'pc', name: 'PC Terminal', blurb: 'Achievements, and the record of what you have done.', open: true },
  { id: 'card', name: 'Trainer Card', blurb: 'Level, Tokens and the profile.', open: false, needs: 'Trainer XP arrives in v0.6' },
  { id: 'mart', name: 'Poké Mart', blurb: 'Spend Tokens on Mastery relics.', open: false, needs: 'Tokens arrive in v0.6' },
  { id: 'daycare', name: 'Daycare Lady', blurb: 'Configure the starting roster and run options.', open: false, needs: 'Unlocks at Trainer Level 3 — v0.6' },
  { id: 'door', name: 'Mystery Door', blurb: 'Daily seeds, leaderboards, Ascension.', open: false, needs: 'Post-launch' },
] as const;

export function HubScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const progress = useAchievementStore((s) => s.progress);
  const acknowledge = useAchievementStore((s) => s.acknowledge);
  const [kiosk, setKiosk] = useState<string>('pc');

  const byCategory = useMemo(() => {
    const out = new Map<AchievementDef['category'], AchievementDef[]>();
    for (const a of ACHIEVEMENTS) {
      if (!out.has(a.category)) out.set(a.category, []);
      out.get(a.category)!.push(a);
    }
    return [...out.entries()];
  }, []);

  const done = progress.unlocked.length;

  return (
    <main className={styles.root} data-testid="hub-screen">
      <header className={styles.chrome}>
        <button type="button" className={styles.back} onClick={() => { acknowledge(); goTo('menu'); }} data-testid="btn-hub-back">
          <IconArrowLeft size={18} /> Menu
        </button>
        <h1 className={`${styles.title} display`}>Trainer Hub</h1>
        <span className={styles.count} data-testid="hub-achievement-count">
          {done} / {ACHIEVEMENTS.length} medals
        </span>
      </header>

      <nav className={styles.kiosks} aria-label="Kiosks">
        {KIOSKS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`${styles.kiosk} ${kiosk === k.id ? styles.kioskOn : ''}`}
            onClick={() => k.open && setKiosk(k.id)}
            disabled={!k.open}
            data-testid={`kiosk-${k.id}`}
            aria-pressed={kiosk === k.id}
          >
            <span className={`${styles.kioskName} display`}>{k.name}</span>
            <span className={styles.kioskBlurb}>{k.open ? k.blurb : k.needs}</span>
          </button>
        ))}
      </nav>

      <section className={styles.panel} data-testid="pc-terminal">
        {byCategory.map(([category, rows]) => (
          <div key={category} className={styles.group}>
            <h2 className={styles.groupTitle}>{CATEGORY_LABEL[category]}</h2>
            <ul className={styles.list}>
              {rows.map((a) => {
                const got = progress.unlocked.includes(a.id);
                const at = progress.counts[a.id] ?? 0;
                // §8.7.3 — a hidden row keeps its description until it completes. The *name* stays visible:
                // hiding both leaves a row that says nothing at all, which is a gap, not a secret.
                const blurb = a.hidden && !got ? '???' : a.description;
                return (
                  <li key={a.id} className={got ? styles.got : styles.pending} data-testid={`achievement-${a.id}`}>
                    <span className={styles.medal} aria-hidden="true">{MEDAL_GLYPH[a.tier]}</span>
                    <span className={styles.rowBody}>
                      <span className={`${styles.rowName} display`}>{a.hidden && !got ? `${a.name} (hidden)` : a.name}</span>
                      <span className={styles.rowDesc}>{blurb}</span>
                    </span>
                    {a.goal > 1 && !got ? (
                      <span className={`${styles.bar} tabular`} aria-label={`${at} of ${a.goal}`}>
                        <span className={styles.fill} style={{ width: `${Math.round((at / a.goal) * 100)}%` }} />
                        <span className={styles.barText}>{at} / {a.goal}</span>
                      </span>
                    ) : (
                      <span className={styles.state}>{got ? 'Earned' : 'Not yet'}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className={styles.note}>
          Ten of fifty medals so far.
          <InfoDot tip={<Tip title="Why ten" body="The other forty wait on Trainer XP, the Pokédex and Regions 2 and 3. A medal you could never earn is not a goal, it is a blank — they arrive with the systems that make them possible." />} />
        </p>
      </section>
    </main>
  );
}
