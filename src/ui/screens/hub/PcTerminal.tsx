import { useMemo, useState } from 'react';
import { IconCheck, IconPokeball } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { Progress, Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS, BOND, BOND_RANKS, UNMET_NAME, bondRank, discoveryProgress, isOfferable, normalizeDexEntry, relicTier, relicUnlocked, type AchievementDef, type MedalTier, speciesMet } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { itemIcon } from '@/ui/art';
import { TypeLabel } from '@/ui/components/TypeBadge';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { dexCardTip, relicTierTip } from '@/ui/tips';
import { PcSheet } from './PcSheet';
import { usePcSheet } from './usePcSheet';
import styles from './Hub.module.css';

// §8.4.1 — the PC Terminal: what the account *knows* and what it has *earned*. Three tabs — the Pokédex
// (§5.13, §8.9, and the Bond of every line inside it, §6.8), the medal case (§8.7) and the relic discoveries
// (§8.6.1).
//
// The Pokédex is a *picture*: a card per species with number, sprite, name, type label and the line's rank as
// five pips — nothing else. Every card is a button that opens a sheet (PcSheet) where the reading is: the
// species' record and kit, and the line's stages, Bond bar and ladder (docs/design/ui-doctrine.md — the picture
// on the grid, the paragraph one click away). The Bond is per line and a line is a page of the Pokédex, so it
// lives here; "By Bond" orders the book by the lines you have played.

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

export function PcTerminal() {
  const account = useAccountStore((s) => s.account);
  const content = getContent();
  const animate = useMotionPref();
  const sheet = usePcSheet();
  const [order, setOrder] = useState<'dex' | 'bond'>('dex');

  const species = useMemo(() => [...content.allSpecies()].sort((a, b) => a.dex - b.dex), [content]);
  // §8.9.2 — "met" is any trace of the species on the account (`isMet`). An unmet species is a silhouette.
  const metOf = (id: string) => speciesMet(account, id);
  const met = species.filter((s) => metOf(s.id)).length;
  // §6.8 — the Bond is per line; "By Bond" puts the lines you have played first, whole, then the rest by number.
  const bondOf = (id: string) => account.bond[content.lineBase(id)] ?? 0;
  const lineOrder = useMemo(() => Object.fromEntries(species.filter((s) => s.stage === 'basic').map((s) => [s.id, s.dex])), [species]);
  const shown = useMemo(
    () => (order === 'dex' ? species : [...species].sort((a, b) => bondOf(b.id) - bondOf(a.id) || lineOrder[content.lineBase(a.id)]! - lineOrder[content.lineBase(b.id)]! || a.dex - b.dex)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, species, account.bond],
  );
  const linesPlayed = species.filter((s) => s.stage === 'basic' && (account.bond[s.id] ?? 0) > 0).length;
  const linesTotal = species.filter((s) => s.stage === 'basic').length;

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
    <>
    <PcSheet sheet={sheet} account={account} />
    <Tabs.Root className={styles.pc} defaultValue="dex" data-testid="pc-terminal">
      <Tabs.List className={styles.tabs} aria-label="PC Terminal">
        <Tabs.Trigger className={styles.tab} value="dex" data-testid="pc-tab-dex">
          Pokédex <span className={`${styles.muted} tabular`}>{met} / {species.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger className={styles.tab} value="medals" data-testid="pc-tab-medals">
          Medals <span className={`${styles.muted} tabular`}>{progress.unlocked.length} / {ACHIEVEMENTS.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger className={styles.tab} value="relics" data-testid="pc-tab-relics">
          Relic discoveries <span className={`${styles.muted} tabular`}>{discovered} / {discoverable.length}</span>
        </Tabs.Trigger>
      </Tabs.List>

      {/* ── Pokédex (§5.13, §8.9) ─────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="dex" className={styles.tabPanel}>
        <div className={styles.dexHead}>
          <p className={styles.lede} data-testid="dex-legend">
            {met} of {species.length} met · {linesPlayed} of {linesTotal} lines played.
            <InfoDot tip={<Tip title="The Pokédex" body={`Every species there is. A silhouette is one you have not met yet — its name, types and kit stay unknown until it takes the field against you or with you; the five pips are its line's Bond rank. Each sheet keeps the record — faced, knocked out, caught, what your own copies did — the kit, and the line: stages, Bond and what each rank opens. A line gets better by being played: +${BOND.win} per fight won with it (+${BOND.lead} leading), +${BOND.evolution} per evolution, +${BOND.recruit} for a first recruit, +${BOND.runFinished} for finishing a run with it, +${BOND.runWon} for winning one — ranks at ${BOND_RANKS.join(' · ')}.`} />} />
          </p>
          <div className={styles.order} role="group" aria-label="Order">
            <button type="button" className={`${styles.orderBtn} ${order === 'dex' ? styles.orderOn : ''}`} onClick={() => setOrder('dex')} aria-pressed={order === 'dex'} data-testid="dex-order-dex">By number</button>
            <button type="button" className={`${styles.orderBtn} ${order === 'bond' ? styles.orderOn : ''}`} onClick={() => setOrder('bond')} aria-pressed={order === 'bond'} data-testid="dex-order-bond">By Bond</button>
          </div>
        </div>
        <ul className={styles.dexGrid} data-testid="dex-grid">
          {shown.map((sp, i) => {
            const entry = normalizeDexEntry(account.dex[sp.id]);
            const known = metOf(sp.id);
            const rank = bondRank(bondOf(sp.id));
            const lineBase = content.lineBase(sp.id);
            return (
              <motion.li
                key={sp.id}
                layout={animate}
                initial={animate ? { opacity: 0, scale: 0.96 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i, 24) * 0.015, duration: 0.2 }}
              >
                {/* §8.9.2 — unmet: a silhouette and "???", no types, and no type tint on the card either. */}
                <Tipped
                  as="button"
                  type="button"
                  tip={dexCardTip(known ? sp.name : UNMET_NAME, sp.dex, known ? sp.types : [], known, entry.encounters, metOf(lineBase) ? content.species(lineBase).name : UNMET_NAME, rank)}
                  className={styles.dexCard}
                  style={known ? { ['--card-type' as string]: `var(--type-${sp.types[0]})` } : undefined}
                  onClick={() => sheet.open({ id: sp.id })}
                  data-testid={`dex-${sp.id}`}
                  data-tier={entry.tier}
                  data-met={known}
                  data-rank={rank}
                >
                  <span className={`${styles.dexNo} tabular`}>#{String(sp.dex).padStart(3, '0')}</span>
                  <span className={styles.cardBall} aria-hidden="true"><IconPokeball size={72} stroke={1.4} /></span>
                  <span className={styles.dexArt}><MonIcon speciesId={sp.id} size={64} alt={known ? sp.name : UNMET_NAME} /></span>
                  <span className={`${styles.dexName} display`}>{known ? sp.name : UNMET_NAME}</span>
                  <span className={styles.dexTypes} aria-hidden="true">
                    {known && sp.types.map((t) => <TypeLabel key={t} type={t} size={12} />)}
                  </span>
                  <span className={styles.pips} aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((r) => <i key={r} className={`${styles.pip} ${rank >= r ? styles.pipOn : ''}`} />)}
                  </span>
                </Tipped>
              </motion.li>
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
    </>
  );
}
