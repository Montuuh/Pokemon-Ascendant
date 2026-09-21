import { useMemo, useState } from 'react';
import { IconCheck, IconEye, IconPokeball, IconSwords } from '@tabler/icons-react';
import { Progress, Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, BOND_LADDER, BOND_RANK_NAME, bondRank, bondUnlocks, dexNext, discoveryProgress, isOfferable, isThreeStageLine, masteryTierFor, relicTier, relicUnlocked, type AchievementDef, type MedalTier } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { itemIcon } from '@/ui/art';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { bondTip, dexTip, relicTierTip } from '@/ui/tips';
import { BondBar } from './BondBar';
import { RANK_ICON } from './rankIcons';
import styles from './Hub.module.css';

// §8.4.1 — the PC Terminal: what the account *knows* and what it has *earned*. Four tabs — Companions (the
// Bond of every line you have played, §6.8), the Pokédex (knowledge about the species you fight, §5.13), the
// medal case (§8.7) and the relic discoveries (§8.6.1).
//
// Both the Companions tab and the Pokédex open with the verb. The first v0.6 panel said "defeat a species to
// learn it" and the first player asked whether they had to catch it, or beat it *with* it — so each tab says
// what earns what, with the reward icon beside the number that earns it.

const CATEGORY_LABEL: Record<AchievementDef['category'], string> = {
  'first-steps': 'First steps',
  recruitment: 'Recruitment',
  evolution: 'Evolution',
  mastery: 'Bond',
  combat: 'Combat',
  boss: 'Gym Leaders',
  'build-identity': 'Build identity',
  endurance: 'Endurance',
};

const MEDAL_GLYPH: Record<MedalTier, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

type DexFilter = 'all' | 'known' | 'unknown';

export function PcTerminal() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
  const [filter, setFilter] = useState<DexFilter>('all');

  const species = useMemo(() => [...content.allSpecies()].sort((a, b) => a.dex - b.dex), [content]);
  const rows = species.filter((s) => {
    const tier = account.dex[s.id]?.tier ?? 0;
    if (filter === 'known') return tier >= 1;
    if (filter === 'unknown') return tier === 0;
    return true;
  });
  const known = species.filter((s) => (account.dex[s.id]?.tier ?? 0) >= 1).length;

  // §6.8 — one row per line, base forms; the lines you have played first, then dex order.
  const lines = useMemo(
    () => species.filter((s) => s.stage === 'basic').sort((a, b) => (account.bond[b.id] ?? 0) - (account.bond[a.id] ?? 0) || a.dex - b.dex),
    [species, account.bond],
  );
  const bonded = lines.filter((l) => (account.bond[l.id] ?? 0) > 0).length;

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
    <Tabs.Root className={styles.pc} defaultValue="companions" data-testid="pc-terminal">
      <Tabs.List className={styles.tabs} aria-label="PC Terminal">
        <Tabs.Trigger className={styles.tab} value="companions" data-testid="pc-tab-companions">
          Companions <span className={`${styles.muted} tabular`}>{bonded} / {lines.length}</span>
        </Tabs.Trigger>
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

      {/* ── Companions (§6.8) ─────────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="companions" className={styles.tabPanel}>
        <div className={`${styles.legend} ${styles.legendBond}`} data-testid="bond-legend">
          <div className={`${styles.legendStep} ${styles.legendWide}`}>
            <span className={styles.legendIcon}><IconSwords size={18} /></span>
            <span className={styles.legendText}>
              <b>Play a line and its Bond grows:</b> +1 per fight won with it in the Active Team (+1 more if it led), +5 per evolution, +2 the first time you recruit it in a run, +8 for finishing a run with it, +15 for winning one.
            </span>
          </div>
          {BOND_LADDER.map((r) => (
            <div key={r.rank} className={styles.legendStep} data-rank={r.rank}>
              <span className={styles.legendIcon} data-rank={r.rank}>{RANK_ICON[r.rank](18)}</span>
              <span className={styles.legendText}><b>{r.rank} · {r.name}</b> — {r.unlock}</span>
            </div>
          ))}
        </div>

        <ul className={styles.bondGrid} data-testid="bond-grid">
          {lines.map((l) => {
            const points = account.bond[l.id] ?? 0;
            const rank = bondRank(points);
            const three = isThreeStageLine(l.id, content);
            const u = bondUnlocks(rank, three);
            const masteryNow = masteryTierFor(account, l.id, content);
            const masteryMoves = content.masteryMoves(l.id);
            const hidden = l.hiddenAbility ? content.ability(l.hiddenAbility) : null;
            // A tier whose move is not shipped yet says so in two characters, not a sentence: the ladder is the
            // point of the row, and every line would otherwise carry the same caveat three times.
            const soon = (id: string | null | undefined, fallback: string) => (id ? content.move(id).name : fallback);
            const shipped = (id: string | null | undefined) => !!id;
            const hiddenName = hidden ? hidden.name : (l.hiddenAbilityPending ?? 'Hidden ability').split(' — ')[0]!;
            const chips: { key: string; on: boolean; text: string; soon?: string }[] = [
              { key: 'm1', on: u.mastery >= 1, text: `★ ${soon(masteryMoves[0], 'Mastery Lv1')}`, soon: shipped(masteryMoves[0]) ? undefined : 'v0.7' },
              { key: 'shiny', on: u.shiny, text: '✨ Shiny' },
              { key: 'hidden', on: u.hiddenAbility, text: `🧬 ${hiddenName}`, soon: hidden ? undefined : 'v0.7' },
              { key: 'm2', on: u.mastery >= 2, text: `★★ ${soon(masteryMoves[1], 'Mastery Lv2')}`, soon: shipped(masteryMoves[1]) ? undefined : 'v0.7' },
              three
                ? { key: 'm3', on: u.mastery >= 3, text: `★★★ ${soon(masteryMoves[2], 'Mastery Lv3')}`, soon: shipped(masteryMoves[2]) ? undefined : 'v0.7' }
                : { key: 'opener', on: u.opener, text: '★ In every opening hand' },
              { key: 'starter', on: u.starter, text: 'Can start a run' },
            ];
            return (
              <li key={l.id} className={`${styles.bondRow} ${points === 0 ? styles.bondUnplayed : ''}`} data-testid={`bond-${l.id}`} data-rank={rank}>
                <Tipped tip={bondTip(l.name, points, rank, three, masteryNow)} className={styles.bondInner}>
                  <MonIcon speciesId={l.id} size={48} />
                  <span className={styles.bondBody}>
                    <span className={styles.bondName}>
                      {l.name} line
                      <span className={styles.bondRank} data-rank={rank}>{rank > 0 ? `${BOND_RANK_NAME[rank]} · rank ${rank}` : 'Not yet played'}</span>
                    </span>
                    <BondBar points={points} />
                    <span className={styles.bondChips}>
                      {chips.map((c) => (
                        <span key={c.key} className={`${styles.bondChip} ${c.on ? styles.bondChipOn : ''}`} data-on={c.on || undefined}>
                          {c.on && <IconCheck size={11} stroke={3} />} {c.text}
                          {c.soon && <em className={styles.bondNote}>{c.soon}</em>}
                        </span>
                      ))}
                    </span>
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </Tabs.Content>

      {/* ── Pokédex (§5.13) ───────────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="dex" className={styles.tabPanel}>
        <div className={`${styles.legend} ${styles.legendTwo}`} data-testid="dex-legend">
          <div className={styles.legendStep}>
            <span className={styles.legendIcon}><IconSwords size={18} /></span>
            <span className={styles.legendText}>
              <b>Knock a species out</b> — wild or on a trainer's team, with any of your Pokémon.
              <span className={styles.muted}> Catching it does not count.</span>
            </span>
          </div>
          <div className={styles.legendStep}>
            <span className={styles.legendIcon}><IconEye size={18} /></span>
            <span className={styles.legendText}>
              <b>Familiar</b> — its hidden intents are shown from turn one, in every fight from then on.
              <InfoDot tip={<Tip title="Thresholds" body="Knock-outs for Familiar: 10 for a common species, 5 for an uncommon one, 2 for a rare one." footer="The Pokédex is knowledge about the species you fight. Making your own better is the Bond — the Companions tab." />} />
            </span>
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.muted}>{rows.length} species</span>
          <div className={styles.filters} role="group" aria-label="Filter">
            {(['all', 'known', 'unknown'] as DexFilter[]).map((f) => (
              <button key={f} type="button" className={`${styles.filter} ${filter === f ? styles.filterOn : ''}`} onClick={() => setFilter(f)} aria-pressed={filter === f} data-testid={`dex-filter-${f}`}>
                {f === 'all' ? 'All' : f === 'known' ? 'Familiar' : 'Unknown'}
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
            const need = next?.need ?? defeats;
            const pct = next ? Math.min(100, Math.round((defeats / next.need) * 100)) : 100;
            return (
              <li key={s.id} className={`${styles.dexRow} ${tier === 0 ? styles.dexUnknown : ''}`} data-testid={`dex-${s.id}`} data-tier={tier}>
                <Tipped tip={dexTip(s.name, s.rarity, tier, defeats, next)} className={styles.dexInner}>
                  <MonIcon speciesId={s.id} size={44} />
                  <span className={styles.dexBody}>
                    <span className={styles.dexName}>
                      <span className={`${styles.muted} tabular`}>#{String(s.dex).padStart(3, '0')}</span> {s.name}
                      <span className={styles.dexRarity}>{s.rarity}</span>
                      {entry?.recruited && <span className={styles.dexBadge}><IconPokeball size={11} /> caught</span>}
                    </span>
                    <span className={styles.dexKo}>
                      <IconSwords size={14} className={styles.koIcon} />
                      <span className="tabular"><b>{defeats}</b> KO{next ? ` · ${next.need - defeats} more to Familiar` : ' · Familiar'}</span>
                    </span>
                    <span className={styles.dexFamiliarRow}>
                      <Progress.Root className={styles.dexBar} value={pct} aria-label={`${defeats} of ${need}`}>
                        <Progress.Indicator className={styles.dexFill} style={{ width: `${pct}%` }} />
                      </Progress.Root>
                      <span className={`${styles.dexEye} ${tier >= 1 ? styles.dexEyeOn : ''}`} aria-hidden="true"><IconEye size={13} stroke={2.4} /> {need}</span>
                    </span>
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
          <InfoDot tip={<Tip title="Tier-2 relics" body="Your pool is what a run can drop, offer or stock. Tier 1 is always in it; Tier 2 joins when you meet its criterion; Tier 3 is bought at the Poké Mart. The Poké Mart's Discoveries shelf sells any of them for four Tokens from Level 8 — the shortcut past a criterion you keep missing." footer="Tier is not rarity: tier decides whether a relic is in your pool at all; rarity decides how often it drops once it is." />} />
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
