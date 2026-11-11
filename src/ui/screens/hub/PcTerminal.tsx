import { useMemo, useState } from 'react';
import { IconPokeball } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { MAX_BOND_RANK, UNMET_NAME, bondRank, normalizeDexEntry, speciesMet } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeLabel } from '@/ui/components/TypeBadge';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { dexCardTip, hallRunTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import journey from './Journey.module.css';
import { ShinyMark } from '@/ui/components/ShinyMark';
import { PcSheet } from './PcSheet';
import { usePcSheet } from './usePcSheet';
import styles from './Hub.module.css';

// §8.4.1 — the PC Terminal: what the account *knows*, and the runs it has won. Two tabs — the Pokédex (§5.13,
// §8.9, and the Bond of every line inside it, §6.8) and the Hall of Fame (§8.15). The medals and the relic
// discoveries that used to live here are the Trainer Journal now, with Professor Oak's aide (§8.7).
//
// The Pokédex is a *picture*: a card per species with number, sprite, name, type label and the line's rank as
// six pips — nothing else. Every card is a button that opens a sheet (PcSheet) where the reading is: the
// species' record and kit, and the line's stages, Bond bar and ladder (docs/design/ui-doctrine.md — the picture
// on the grid, the paragraph one click away). The Bond is per line and a line is a page of the Pokédex, so it
// lives here; "By Bond" orders the book by the lines you have played.

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
  // §5.14 — the species caught shiny at least once: the collection.
  const shinies = species.filter((s) => normalizeDexEntry(account.dex[s.id]).shinyCaught > 0).length;
  const linesTotal = species.filter((s) => s.stage === 'basic').length;

  return (
    <>
    <PcSheet sheet={sheet} account={account} />
    <Tabs.Root className={styles.pc} defaultValue="dex" data-testid="pc-terminal">
      <Tabs.List className={styles.tabs} aria-label="PC Terminal">
        <Tabs.Trigger className={styles.tab} value="dex" data-testid="pc-tab-dex">
          Pokédex <span className={`${styles.muted} tabular`}>{met} / {species.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger className={styles.tab} value="hall" data-testid="pc-tab-hall">
          {JOURNEY_TEXT.hall.tab} <span className={`${styles.muted} tabular`}>{account.hall.length}</span>
        </Tabs.Trigger>
      </Tabs.List>

      {/* ── Pokédex (§5.13, §8.9) ─────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="dex" className={styles.tabPanel}>
        <div className={styles.dexHead}>
          <p className={styles.lede} data-testid="dex-legend">
            {met} of {species.length} met · {linesPlayed} of {linesTotal} lines played{shinies > 0 ? ` · ${shinies} shin${shinies === 1 ? 'y' : 'ies'}` : ''}.
            <InfoDot tip={<Tip title="The Pokédex" body="Every species there is. A silhouette: not met yet. The pips: its line's Bond rank. A sparkle: caught shiny." />} />
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
                  tip={dexCardTip(known ? sp.name : UNMET_NAME, sp.dex, known ? sp.types : [], known, entry.encounters, metOf(lineBase) ? content.species(lineBase).name : UNMET_NAME, rank, entry.shinyCaught)}
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
                  <span className={`${styles.dexName} display`}>{known ? sp.name : UNMET_NAME}{entry.shinyCaught > 0 && <> <ShinyMark name={sp.name} size={12} plain /></>}</span>
                  <span className={styles.dexTypes} aria-hidden="true">
                    {known && sp.types.map((t) => <TypeLabel key={t} type={t} size={12} />)}
                  </span>
                  <span className={styles.pips} aria-hidden="true">
                    {Array.from({ length: MAX_BOND_RANK }, (_, i) => i + 1).map((r) => <i key={r} className={`${styles.pip} ${rank >= r ? styles.pipOn : ''}`} />)}
                  </span>
                </Tipped>
              </motion.li>
            );
          })}
        </ul>
      </Tabs.Content>

      {/* ── Hall of Fame (§8.15) ─────────────────────────────────────────────────────────────────────── */}
      <Tabs.Content value="hall" className={styles.tabPanel}>
        {account.hall.length === 0 ? (
          <p className={journey.empty} data-testid="hall-empty">{JOURNEY_TEXT.hall.empty}</p>
        ) : (
          <ol className={journey.hall}>
            {[...account.hall].reverse().map((h) => (
              <Tipped as="li" key={h.run} tip={hallRunTip(h.run, h.seed)} className={journey.hallRow} tabIndex={0} data-testid={`hall-${h.run}`}>
                <span className={`${journey.hallRun} display tabular`}>{JOURNEY_TEXT.hall.run(h.run)}</span>
                <span className={journey.hallTeam}>
                  {h.team.map((m, i) => (
                    <span key={i} className={journey.hallMon}>
                      <MonIcon speciesId={m.speciesId} size={48} {...(m.shiny ? { shiny: true } : {})} />
                      <span className="tabular">Lv {m.level}</span>
                    </span>
                  ))}
                </span>
                <span className={`${journey.hallFacts} tabular`}>
                  <span>{JOURNEY_TEXT.hall.rung(h.rung)}</span>
                  <span>{JOURNEY_TEXT.hall.badges(h.badges.length)} · {JOURNEY_TEXT.hall.relics(h.relics.length)}</span>
                </span>
              </Tipped>
            ))}
          </ol>
        )}
      </Tabs.Content>
    </Tabs.Root>
    </>
  );
}
