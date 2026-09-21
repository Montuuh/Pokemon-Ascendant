import { useMemo, useState } from 'react';
import { IconCheck, IconEye, IconPokeball, IconSparkles, IconStar, IconSwords } from '@tabler/icons-react';
import { Progress, Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, DEX_TIER_NAME, dexNext, discoveryProgress, isOfferable, masteryMoveFor, relicTier, relicUnlocked, type AchievementDef, type MedalTier } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { itemIcon } from '@/ui/art';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { dexTip, relicTierTip } from '@/ui/tips';
import { TierBar } from './TierBar';
import styles from './Hub.module.css';

// §8.4.1 — the PC Terminal: what the account *knows*. Three tabs — the Pokédex (§5.13, §8.9), the medal case
// (§8.7) and the relic discoveries (§8.6.1). The Tier-2 board lived on the Poké Mart in v0.6.0 and made the
// shop read as two things; it is knowledge, so it lives with the other knowledge.
//
// The Pokédex opens with the verb. The v0.6.0 panel said "defeat a species to learn it" and players still
// asked whether they had to catch it, or beat it *with* it — so the legend now says all three things it needs
// to say, with the reward icon of each tier beside the number that earns it.

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

type DexFilter = 'all' | 'known' | 'unknown' | 'mastery';

export function PcTerminal() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
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

  const discoverable = content.allRelics().filter((r) => relicTier(r) === 2 && isOfferable(r));
  const discovered = discoverable.filter((r) => relicUnlocked(account, r)).length;

  return (
    <Tabs.Root className={styles.pc} defaultValue="dex" data-testid="pc-terminal">
      <Tabs.List className={styles.tabs} aria-label="PC Terminal">
        <Tabs.Trigger className={styles.tab} value="dex" data-testid="pc-tab-dex">
          Pokédex <span className={`${styles.muted} tabular`}>{known} / {species.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger className={styles.tab} value="medals" data-testid="pc-tab-medals">
          Medals <span className={`${styles.muted} tabular`}>{progress.unlocked.length} / {ACHIEVEMENTS.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger className={styles.tab} value="relics" data-testid="pc-tab-relics">
          Relic discoveries <span className={`${styles.muted} tabular`}>{discovered} / {discoverable.length}</span>
        </Tabs.Trigger>
      </Tabs.List>

      {/* ── Pokédex ─────────────────────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="dex" className={styles.tabPanel}>
        <div className={styles.legend} data-testid="dex-legend">
          <div className={styles.legendStep}>
            <span className={styles.legendIcon}><IconSwords size={18} /></span>
            <span className={styles.legendText}>
              <b>Knock a species out</b> — wild or on a trainer's team, with any of your Pokémon.
              <span className={styles.muted}> Catching it does not count.</span>
            </span>
          </div>
          <div className={styles.legendStep}>
            <span className={styles.legendIcon}><IconEye size={18} /></span>
            <span className={styles.legendText}><b>Familiar</b> — its hidden intents are shown from turn one.</span>
          </div>
          <div className={styles.legendStep}>
            <span className={styles.legendIcon}><IconSparkles size={18} /></span>
            <span className={styles.legendText}><b>Veteran</b> — your own copies are Shiny.</span>
          </div>
          <div className={styles.legendStep}>
            <span className={styles.legendIcon}><IconStar size={18} /></span>
            <span className={styles.legendText}>
              <b>Master</b> — its Mastery Move joins the deck as a fifth card.
              <InfoDot tip={<Tip title="Thresholds" body="Knock-outs needed for Familiar / Veteran / Master: a common species 10 / 30 / 50, an uncommon one 5 / 15 / 25, a rare one 2 / 5 / 10. The bar on each row is drawn to that species' own numbers." footer="A line's Mastery Move also opens by recruiting it, winning three fights with it, or finishing a run with it." />} />
            </span>
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.muted}>{rows.length} species</span>
          <div className={styles.filters} role="group" aria-label="Filter">
            {(['all', 'known', 'unknown', 'mastery'] as DexFilter[]).map((f) => (
              <button key={f} type="button" className={`${styles.filter} ${filter === f ? styles.filterOn : ''}`} onClick={() => setFilter(f)} aria-pressed={filter === f} data-testid={`dex-filter-${f}`}>
                {f === 'all' ? 'All' : f === 'known' ? 'Known' : f === 'unknown' ? 'Unknown' : '★ Mastery'}
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
                  <MonIcon speciesId={s.id} size={44} />
                  <span className={styles.dexBody}>
                    <span className={styles.dexName}>
                      <span className={`${styles.muted} tabular`}>#{String(s.dex).padStart(3, '0')}</span> {s.name}
                      <span className={styles.dexRarity}>{s.rarity}</span>
                      {entry?.recruited && <span className={styles.dexBadge}><IconPokeball size={11} /> caught</span>}
                      {masteryMove && <span className={`${styles.dexBadge} ${styles.dexMastery}`}>★ {content.move(masteryMove).name}</span>}
                    </span>
                    <span className={styles.dexKo}>
                      <IconSwords size={14} className={styles.koIcon} />
                      <span className="tabular"><b>{defeats}</b> KO{next ? ` · ${next.need - defeats} more to ${DEX_TIER_NAME[next.tier]}` : ' · Master'}</span>
                    </span>
                    <TierBar defeats={defeats} rarity={s.rarity} tier={tier} />
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </Tabs.Content>

      {/* ── Medals ──────────────────────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="medals" className={styles.tabPanel}>
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
                        <Progress.Root className={`${styles.bar} tabular`} value={Math.round((at / a.goal) * 100)} aria-label={`${at} of ${a.goal}`}>
                          <Progress.Indicator className={styles.fill} style={{ width: `${Math.round((at / a.goal) * 100)}%` }} />
                          <span className={styles.barText}>{at} / {a.goal}</span>
                        </Progress.Root>
                      ) : (
                        <span className={`${styles.state} ${got ? styles.stateGot : ''}`}>{got ? <><IconCheck size={14} /> Earned</> : 'Not yet'}</span>
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
      </Tabs.Content>

      {/* ── Relic discoveries ───────────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="relics" className={styles.tabPanel}>
        <p className={styles.lede}>
          {discoverable.length} relics join your pool the first time you do a particular thing, in any run.
          <InfoDot tip={<Tip title="Tier-2 relics" body="Your pool is what a run can drop, offer or stock. Tier 1 is always in it; Tier 2 joins when you meet its criterion; Tier 3 is bought at the Poké Mart. The reward track also opens one Tier-2 relic at a time, in this order, at Levels 2, 14, 16, 17, 21, 22, 24, 26 and 28." footer="Tier is not rarity: tier decides whether a relic is in your pool at all; rarity decides how often it drops once it is." />} />
        </p>
        <ul className={styles.discoveries} data-testid="discoveries">
          {discoverable.map((r) => {
            const got = relicUnlocked(account, r);
            const prog = discoveryProgress(account, r);
            const pct = prog ? Math.round((prog.have / prog.goal) * 100) : 0;
            return (
              <li key={r.id} className={`${styles.discovery} ${got ? styles.discoveryOn : ''}`} data-testid={`discovery-${r.id}`} data-state={got ? 'open' : 'locked'}>
                <Tipped tip={relicTierTip(r, got ? 'owned' : 'discoverable', prog)} className={styles.discoveryInner}>
                  <img src={itemIcon(r.id)} alt="" width={28} height={28} className={styles.discoveryIcon} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                  <span className={styles.discoveryBody}>
                    <span className={styles.discoveryName}>{r.name}{got && <span className={styles.discoveryTick}><IconCheck size={12} stroke={3} /></span>}</span>
                    <span className={styles.discoveryHow}>
                      {got ? 'In your pool' : prog ? prog.text : 'Reward track only'}
                    </span>
                    {!got && prog && prog.goal > 1 && (
                      <Progress.Root className={styles.discoveryBar} value={pct} aria-label={`${prog.have} of ${prog.goal}`}>
                        <Progress.Indicator className={styles.discoveryFill} style={{ width: `${pct}%` }} />
                        <span className={`${styles.discoveryBarText} tabular`}>{prog.have} / {prog.goal}</span>
                      </Progress.Root>
                    )}
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </Tabs.Content>
    </Tabs.Root>
  );
}
