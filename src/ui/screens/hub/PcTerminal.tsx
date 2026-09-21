import { useMemo, useState } from 'react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, DEX_TIER_NAME, dexNext, masteryMoveFor, type AchievementDef, type MedalTier } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { dexTip } from '@/ui/tips';
import styles from './Hub.module.css';

// §8.4.1 — the PC Terminal: the Pokédex (§5.13, §8.9) and the medal case (§8.7). Browsable by species,
// filterable by tier, as §8.9 asks; the medal list is the v0.5 panel unchanged.

const CATEGORY_LABEL: Record<AchievementDef['category'], string> = {
  'first-steps': 'First steps',
  recruitment: 'Recruitment',
  evolution: 'Evolution',
  mastery: 'Mastery',
  combat: 'Combat',
  boss: 'Gym Leaders',
  'build-identity': 'Build identity',
  endurance: 'Endurance',
};

const MEDAL_GLYPH: Record<MedalTier, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

type Tab = 'dex' | 'medals';
type DexFilter = 'all' | 'known' | 'unknown' | 'mastery';

export function PcTerminal() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
  const [tab, setTab] = useState<Tab>('dex');
  const [filter, setFilter] = useState<DexFilter>('all');

  const species = useMemo(() => [...content.allSpecies()].sort((a, b) => a.dex - b.dex), [content]);
  const rows = species.filter((s) => {
    const tier = account.dex[s.id]?.tier ?? 0;
    const mastery = account.mastery[content.lineBase(s.id)] ?? 0;
    if (filter === 'known') return tier >= 1;
    if (filter === 'unknown') return tier === 0;
    if (filter === 'mastery') return mastery >= 1;
    return true;
  });
  const known = species.filter((s) => (account.dex[s.id]?.tier ?? 0) >= 1).length;

  const byCategory = useMemo(() => {
    const out = new Map<AchievementDef['category'], AchievementDef[]>();
    for (const a of ACHIEVEMENTS) {
      if (!out.has(a.category)) out.set(a.category, []);
      out.get(a.category)!.push(a);
    }
    return [...out.entries()];
  }, []);
  const progress = account.achievements;

  return (
    <div className={styles.pc} data-testid="pc-terminal">
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'dex'} className={`${styles.tab} ${tab === 'dex' ? styles.tabOn : ''}`} onClick={() => setTab('dex')} data-testid="pc-tab-dex">
          Pokédex <span className={`${styles.muted} tabular`}>{known} / {species.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'medals'} className={`${styles.tab} ${tab === 'medals' ? styles.tabOn : ''}`} onClick={() => setTab('medals')} data-testid="pc-tab-medals">
          Medals <span className={`${styles.muted} tabular`}>{progress.unlocked.length} / {ACHIEVEMENTS.length}</span>
        </button>
      </div>

      {tab === 'dex' ? (
        <>
          <div className={styles.filterRow}>
            <span className={styles.lede}>
              Defeat a species to learn it.
              <InfoDot tip={<Tip title="The Pokédex" body="Three tiers per species, earned by defeating it — in the wild or on a trainer's team; catching does not count. Familiar reveals its hidden intents from turn one. Veteran makes your own copies Shiny. Master opens its Mastery Move." footer="Thresholds scale with rarity: a common species needs 10 / 30 / 50, a rare one 2 / 5 / 10." />} />
            </span>
            <div className={styles.filters} role="group" aria-label="Filter">
              {(['all', 'known', 'unknown', 'mastery'] as DexFilter[]).map((f) => (
                <button key={f} type="button" className={`${styles.filter} ${filter === f ? styles.filterOn : ''}`} onClick={() => setFilter(f)} aria-pressed={filter === f} data-testid={`dex-filter-${f}`}>
                  {f === 'all' ? 'All' : f === 'known' ? 'Known' : f === 'unknown' ? 'Unknown' : 'Mastery'}
                </button>
              ))}
            </div>
          </div>
          <ul className={styles.dexGrid} data-testid="dex-grid">
            {rows.map((s) => {
              const entry = account.dex[s.id];
              const tier = entry?.tier ?? 0;
              const defeats = entry?.defeats ?? 0;
              const next = dexNext(entry, s.rarity);
              const line = content.lineBase(s.id);
              const mastery = account.mastery[line] ?? 0;
              const masteryMove = masteryMoveFor(s.id, mastery, content);
              return (
                <li key={s.id} className={`${styles.dexRow} ${tier === 0 ? styles.dexUnknown : ''}`} data-testid={`dex-${s.id}`} data-tier={tier}>
                  <Tipped tip={dexTip(s.name, s.rarity, tier, defeats, next, mastery)} className={styles.dexInner}>
                    <MonIcon speciesId={s.id} size={40} />
                    <span className={styles.dexBody}>
                      <span className={styles.dexName}>
                        <span className={`${styles.muted} tabular`}>#{String(s.dex).padStart(3, '0')}</span> {s.name}
                        {entry?.recruited && <span className={styles.dexBadge} title={undefined}>caught</span>}
                        {masteryMove && <span className={`${styles.dexBadge} ${styles.dexMastery}`}>★ {content.move(masteryMove).name}</span>}
                      </span>
                      <span className={styles.dexTierLine}>
                        <span className={styles.dexTier} data-tier={tier}>{DEX_TIER_NAME[tier]}</span>
                        {next ? (
                          <span className={styles.dexBar} aria-label={`${defeats} of ${next.need}`}>
                            <span className={styles.dexFill} style={{ width: `${Math.min(100, Math.round((defeats / next.need) * 100))}%` }} />
                            <span className={`${styles.dexBarText} tabular`}>{defeats} / {next.need}</span>
                          </span>
                        ) : (
                          <span className={`${styles.muted} tabular`}>{defeats} defeated</span>
                        )}
                      </span>
                    </span>
                  </Tipped>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className={styles.medals}>
          {byCategory.map(([category, list]) => (
            <div key={category} className={styles.group}>
              <h2 className={styles.groupTitle}>{CATEGORY_LABEL[category]}</h2>
              <ul className={styles.list}>
                {list.map((a) => {
                  const got = progress.unlocked.includes(a.id);
                  const at = progress.counts[a.id] ?? 0;
                  // §8.7.3 — a hidden row keeps its description until it completes. The *name* stays visible:
                  // hiding both leaves a row that says nothing at all, which is a gap, not a secret.
                  const blurb = a.hidden && !got ? '???' : a.description;
                  return (
                    <li key={a.id} className={got ? styles.got : styles.pendingRow} data-testid={`achievement-${a.id}`}>
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
            {ACHIEVEMENTS.length} of fifty medals so far.
            <InfoDot tip={<Tip title="Why not fifty" body="The rest wait on Regions 2 and 3, the League and the systems that make them possible. A medal you could never earn is not a goal, it is a blank — they arrive with their systems." />} />
          </p>
        </div>
      )}
    </div>
  );
}
