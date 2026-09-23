import { useState, type ReactNode } from 'react';
import { IconArrowsShuffle, IconCrown, IconEye, IconEyeOff, IconFlag, IconHeartBroken, IconLock, IconPokeball, IconSwords, IconTargetArrow, IconTrophy, IconUsers, IconWand } from '@tabler/icons-react';
import { Tabs } from 'radix-ui';
import { getContent } from '@/content/registry';
import { BOND_RANK_NAME, BOND_RANKS, DEX_FAMILIAR, UNMET_NAME, bondProgress, bondRank, catchRateOf, hiddenAbilityOf, isMet, isThreeStageLine, masteryTierFor, normalizeDexEntry, type AccountState, type SpeciesDef } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { spriteOf, portraitOf } from '@/ui/art';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { abilityTip, moveDefTip } from '@/ui/tips';
import { BondBar } from './BondBar';
import { LineSheet } from './LineSheet';
import type { SheetTab } from './usePcSheet';
import styles from './PcSheet.module.css';

// §5.13 / §8.9 — one species' Pokédex sheet: the hero (number, sprite, name, types), then three tabs. *Record*
// is the numbers the account kept about this species — faced, knocked out, caught, what your own copies did.
// *Kit* is what it fights with: the learnset, the tutor list, the abilities, the Mastery Moves of its line,
// what it evolves into. *Line* is the evolution line and its Bond (§6.8): the stages, the bar, the ladder.
// The Pokédex is the one book; the grid behind shows only number, sprite, name and the line's rank pips,
// and everything else lives here.

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SpeciesSheet({ speciesId, account, initialTab = 'record', onSpecies }: {
  speciesId: string;
  account: AccountState;
  initialTab?: SheetTab;
  onSpecies: (id: string, tab?: SheetTab) => void;
}) {
  const [tab, setTab] = useState<SheetTab>(initialTab);
  const content = getContent();
  const s = content.species(speciesId);
  const line = content.lineBase(speciesId);
  const entry = normalizeDexEntry(account.dex[speciesId]);
  const met = isMet(account.dex[speciesId], account.stats.leadTurns[speciesId]);
  // §8.9.2 — an unmet species keeps its name, types and kit to itself; so does an unmet line's first form.
  const name = met ? s.name : UNMET_NAME;
  const lineName = isMet(account.dex[line], account.stats.leadTurns[line]) ? content.species(line).name : UNMET_NAME;
  const points = account.bond[line] ?? 0;
  const rank = bondRank(points);
  const [spriteOk, setSpriteOk] = useState(true);
  const leadTurns = account.stats.leadTurns[speciesId] ?? 0;
  const familiarAt = DEX_FAMILIAR[s.rarity];

  return (
    <div data-testid="dex-sheet" data-species={speciesId} data-met={met}>
      <div className={styles.hero} style={met ? { ['--sheet-type' as string]: `var(--type-${s.types[0]})` } : undefined}>
        <span className={styles.heroBall} aria-hidden="true"><IconPokeball size={220} stroke={1.2} /></span>
        <span className={styles.heroArt}>
          {spriteOk ? (
            // §5.13.2 / §6.8.2 — your copies are Shiny from Bond rank 2, so the sheet shows the palette you play.
            <img src={spriteOf({ speciesId }, 'front', rank >= 2)} alt={name} className={`${styles.heroSprite} ${met ? '' : styles.heroSilhouette}`} onError={() => setSpriteOk(false)} />
          ) : (
            <img src={portraitOf({ speciesId })} alt={name} className={`${styles.heroSprite} ${met ? '' : styles.heroSilhouette}`} />
          )}
        </span>
        <div className={styles.heroBody}>
          <span className={`${styles.heroNumber} tabular`}>#{String(s.dex).padStart(3, '0')}</span>
          <h2 className={`${styles.heroName} display`} data-testid="dex-sheet-name">{name}</h2>
          <div className={styles.heroMeta}>
            {met && s.types.map((t) => <TypeBadge key={t} type={t} size={24} defenderTypes={s.types} />)}
            {met && (
              <>
                <Tipped tip={<Tip title={`${cap(s.rarity)} species`} body={`Familiar after ${familiarAt} knock-out${familiarAt === 1 ? '' : 's'}. Catch ceiling with a Poké Ball at ~0 HP: ${Math.round(catchRateOf(s.id, content) * 100)} %.`} />} className={styles.heroChip}>{cap(s.rarity)}</Tipped>
                <Tipped tip={<Tip title={s.stage === 'basic' ? 'Basic form' : s.stage === 'stage1' ? 'First evolution' : 'Final evolution'} body={s.evolvesTo.length ? `Evolves at Lv ${s.evolveLevel} — the Kit tab has where.` : 'This line goes no further.'} />} className={styles.heroChip}>{s.stage === 'basic' ? 'Basic' : s.stage === 'stage1' ? 'Stage 1' : 'Stage 2'}</Tipped>
              </>
            )}
            <button type="button" className={styles.heroChip} onClick={() => setTab('line')} data-testid="dex-sheet-line">
              {lineName} line · {rank > 0 ? BOND_RANK_NAME[rank] : 'no Bond yet'}
            </button>
          </div>
          <Tipped tip={<Tip title={`${lineName} line — ${rank > 0 ? BOND_RANK_NAME[rank] : 'no Bond yet'}`} meta={[`${points} Bond`]} body={bondProgress(points).next === null ? 'Every rank open.' : `${bondProgress(points).next! - points} more Bond to ${BOND_RANK_NAME[rank + 1]}.`} footer={`Ranks at ${BOND_RANKS.join(' · ')}. The line tab has what each one opens.`} />}>
            <BondBar points={points} compact />
          </Tipped>
        </div>
      </div>

      <div className={styles.body}>
        <Tabs.Root value={tab} onValueChange={(v) => setTab(v as SheetTab)}>
          <Tabs.List className={styles.tabs} aria-label="Pokédex sheet">
            <Tabs.Trigger className={styles.tab} value="record" data-testid="dex-sheet-tab-record">Record</Tabs.Trigger>
            <Tabs.Trigger className={styles.tab} value="kit" data-testid="dex-sheet-tab-kit">Kit</Tabs.Trigger>
            <Tabs.Trigger className={styles.tab} value="line" data-testid="dex-sheet-tab-line">{lineName} line</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="record" className={styles.panel}>
            {met ? (
              <Record entry={entry} leadTurns={leadTurns} />
            ) : (
              <p className={styles.locked} data-testid="dex-sheet-record-empty">
                <IconLock size={18} aria-hidden="true" /> Nothing on record — it starts the first time it takes the field.
              </p>
            )}
            <div className={styles.knowledge} data-known={entry.tier >= 1} data-testid="dex-sheet-knowledge">
              {entry.tier >= 1 ? <IconEye size={18} /> : <IconEyeOff size={18} />}
              <span>
                {entry.tier >= 1
                  ? <><b>Familiar.</b> Its hidden intents are shown from turn one, every fight.</>
                  : !met
                    // §8.9.2 — the count would give its rarity away, so an unmet species gets no number.
                    ? <>Knock it out to start toward Familiar — then its hidden intents show from turn one.</>
                    : <><b>{Math.max(0, familiarAt - entry.defeats)}</b> more knock-out{familiarAt - entry.defeats === 1 ? '' : 's'} to Familiar — then its hidden intents show from turn one.</>}
              </span>
              <InfoDot tip={<Tip title="Familiar" body="Knock a species out — wild or on a trainer's team, with any of your Pokémon — enough times and you know it: its hidden intents are shown from the first turn of every fight after. Catching it does not count." footer={`${DEX_FAMILIAR.common} knock-outs for a common species, ${DEX_FAMILIAR.uncommon} for an uncommon one, ${DEX_FAMILIAR.rare} for a rare one.${met ? ` ${name} is ${s.rarity}: ${familiarAt}.` : ''}`} />} />
            </div>
          </Tabs.Content>

          <Tabs.Content value="kit" className={styles.panel}>
            {met ? (
              <Kit s={s} account={account} onSpecies={onSpecies} />
            ) : (
              <p className={styles.locked} data-testid="dex-sheet-kit-locked">
                <IconLock size={18} aria-hidden="true" /> Unknown until you meet it.
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="line" className={styles.panel}>
            <LineSheet line={line} account={account} current={speciesId} onSpecies={(id) => onSpecies(id, 'line')} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

/** §8.9 — the record as tiles. A zero is drawn muted rather than hidden: the empty tile is the goal. */
function Record({ entry, leadTurns }: { entry: ReturnType<typeof normalizeDexEntry>; leadTurns: number }) {
  const tiles: { key: string; icon: ReactNode; label: string; value: number; tip: string }[] = [
    { key: 'met', icon: <IconEye size={18} />, label: 'Faced', value: entry.encounters, tip: 'Fights it took the field against you.' },
    { key: 'ko', icon: <IconSwords size={18} />, label: 'Knocked out', value: entry.defeats, tip: 'Times your side knocked one out. This is what makes it Familiar.' },
    { key: 'caught', icon: <IconPokeball size={18} />, label: 'Caught', value: entry.caught, tip: 'Times one went into a Poké Ball.' },
    { key: 'recruits', icon: <IconUsers size={18} />, label: 'Recruited', value: entry.recruits, tip: 'Times one joined your Box — caught or offered.' },
    { key: 'wins', icon: <IconTrophy size={18} />, label: 'Fights won with', value: entry.winsWith, tip: 'Fights won while it was on your Active Team.' },
    { key: 'runs', icon: <IconFlag size={18} />, label: 'Runs finished', value: entry.runsFinishedWith, tip: 'Runs that ended, won or lost, with it on your Active Team.' },
    { key: 'kos', icon: <IconTargetArrow size={18} />, label: 'KOs landed', value: entry.knockouts, tip: 'Enemies your copies finished — the blow, not the burn.' },
    { key: 'dmg', icon: <IconWand size={18} />, label: 'Damage dealt', value: entry.damageDealt, tip: 'Every point your copies dealt to an enemy.' },
    { key: 'faints', icon: <IconHeartBroken size={18} />, label: 'Fainted', value: entry.faints, tip: 'Times a copy of yours went down.' },
    { key: 'lead', icon: <IconCrown size={18} />, label: 'Turns as Lead', value: leadTurns, tip: 'Turns a copy of yours spent in the Lead slot.' },
    { key: 'evo', icon: <IconArrowsShuffle size={18} />, label: 'Evolved', value: entry.evolutions, tip: 'Times a copy of yours evolved from this form.' },
  ];
  return (
    <dl className={styles.record}>
      {tiles.map((t) => (
        <Tipped key={t.key} tip={<Tip title={t.label} body={t.tip} />} className={`${styles.tile} ${t.value === 0 ? styles.tileZero : ''}`} data-testid={`dex-stat-${t.key}`}>
          <span className={styles.tileIcon} aria-hidden="true">{t.icon}</span>
          <dt>{t.label}</dt>
          <dd className="tabular">{t.value}</dd>
        </Tipped>
      ))}
    </dl>
  );
}

/** §6.9, §6.4.3, §6.5.1, §5.13.2 — what the species fights with, and what it becomes. */
function Kit({ s, account, onSpecies }: { s: SpeciesDef; account: AccountState; onSpecies: (id: string) => void }) {
  const content = getContent();
  const line = content.lineBase(s.id);
  const rank = bondRank(account.bond[line] ?? 0);
  const masteryTier = masteryTierFor(account, line, content);
  const three = isThreeStageLine(line, content);
  const hidden = hiddenAbilityOf(line, content);
  const masteryMoves = content.masteryMoves(line);
  const abilities = s.availableAbilities.filter((a) => a !== hidden);
  const moveRow = (moveId: string, lv: number | null, locked = false, key = moveId) => {
    const m = content.move(moveId);
    return (
      <Tipped key={key} as="li" tip={moveDefTip(m)} className={`${styles.move} ${locked ? styles.moveLocked : ''}`}>
        <span className={`${styles.moveLv} tabular`}>{lv === null ? '—' : `Lv ${lv}`}</span>
        <TypeBadge type={m.type} size={18} />
        <span className={styles.moveName}>{m.name}</span>
        <span className={`${styles.moveStat} tabular`}>{m.apCost} AP{m.power > 0 ? ` · ${m.power}` : ''}</span>
      </Tipped>
    );
  };

  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Learnset <InfoDot tip={<Tip title="Learnset" body="The whole line's, base form first: known moves are every entry at or below the Pokémon's level, and evolving never forgets." />} /></h3>
        <ul className={styles.moves}>{content.lineLearnset(s.id).map((e, i) => moveRow(e.move, e.level, false, `${e.move}-${i}`))}</ul>
      </section>

      {s.tutorMoves.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Dojo tutor <InfoDot tip={<Tip title="Tutor moves" body="Off-learnset moves the Dojo teaches this form. Evolving changes the menu." />} /></h3>
          <ul className={styles.moves}>{s.tutorMoves.map((id) => moveRow(id, null))}</ul>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Mastery Moves <InfoDot tip={<Tip title="Mastery Moves" body={`A fifth card the line earns through its Bond: Lv1 at ${BOND_RANK_NAME[1]}, Lv2 at ${BOND_RANK_NAME[4]}, Lv3 at ${BOND_RANK_NAME[5]} for a three-stage line. No TM or Move Manager can touch it.`} />} /></h3>
        <ul className={styles.moves}>
          {masteryMoves.slice(0, three ? 3 : 2).map((id, i) => {
            const tier = i + 1;
            const open = masteryTier >= tier;
            if (!id) return <li key={`m${tier}`} className={`${styles.move} ${styles.moveLocked}`}><span className={styles.moveLv}>Lv{tier}</span><span className={styles.moveWide}>Not written yet</span></li>;
            return moveRow(id, null, !open, `m${tier}`);
          })}
        </ul>
        {!three && <p className={styles.muted}>A two-stage line: at Soulbound its Mastery card is in every opening hand instead of a third tier.</p>}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Abilities <InfoDot tip={<Tip title="Abilities" body={`The pool this form can carry. The first is granted at the first evolution; the Dojo swaps among the rest. The hidden one opens at Bond rank 3 (${BOND_RANK_NAME[3]}).`} />} /></h3>
        <div className={styles.chips}>
          {abilities.map((id) => (
            <Tipped key={id} tip={abilityTip(id)} className={styles.chip}>{content.ability(id).name}</Tipped>
          ))}
          {hidden ? (
            <Tipped tip={abilityTip(hidden)} className={`${styles.chip} ${rank >= 3 ? styles.chipOn : styles.chipLocked}`} data-testid="dex-sheet-hidden">
              {rank >= 3 ? null : <IconLock size={13} />} {content.ability(hidden).name} <span className={styles.muted}>· hidden</span>
            </Tipped>
          ) : (
            <span className={`${styles.chip} ${styles.chipLocked}`}><IconLock size={13} /> {(content.species(line).hiddenAbilityPending ?? 'Hidden ability').split(' — ')[0]} <span className={styles.muted}>· not yet</span></span>
          )}
        </div>
      </section>

      {s.evolvesTo.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Evolves {s.evolveLevel ? `at Lv ${s.evolveLevel}` : ''}</h3>
          <div className={styles.stages}>
            {s.evolvesTo.map((id) => (
              <button key={id} type="button" className={styles.stage} onClick={() => onSpecies(id)} data-testid={`dex-sheet-evolves-${id}`}>
                <span className={isMet(account.dex[id], account.stats.leadTurns[id]) ? undefined : styles.stageHidden}>
                  <MonIcon speciesId={id} size={56} alt={isMet(account.dex[id], account.stats.leadTurns[id]) ? content.species(id).name : UNMET_NAME} />
                </span>
                <span className={styles.stageName}>{isMet(account.dex[id], account.stats.leadTurns[id]) ? content.species(id).name : UNMET_NAME}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
