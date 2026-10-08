import { useEffect, useMemo, useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { battleSpriteUrl, portraitUrl } from '@/content/schemas/species';
import { BOND, BOND_RANK_NAME, BOND_TIER, boxCapacity, hiddenAbilityOf, maxHpOf, xpToNext, type PartyMon } from '@/sim';
import { MedalIcon } from '@/ui/components/MedalIcon';
import { MonIcon } from '@/ui/components/MonIcon';
import { MoveChip } from '@/ui/components/MoveChip';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { itemIcon, tmIcon } from '@/ui/art';
import { PokeDollar } from '@/ui/components/Money';
import { RelicOffer } from '@/ui/components/RelicOffer';
import { SupplyStrip } from '@/ui/components/SupplyStrip';
import { abilityTip, bondGainTip, bondUnlockTip, elitePrizeTip, levelGainTip, lootTip, poolTip, progressNoteTip, rewardMoneyTip } from '@/ui/tips';
import { REWARD_TEXT, STAT_SHORT } from '@/ui/strings';
import { Tipped } from '@/ui/tooltip';
import { ShinyMark } from '@/ui/components/ShinyMark';
import styles from './RewardScreen.module.css';

// Per docs/design/ui/screens.md §3.5 — the post-combat result (reworked in v0.9.6). One card per Pokémon: its XP bar,
// and when it levelled, what the levels gave — the stats as pills, the moves as chips, the Bond rank and what it
// opened; then what the fight moved on the account's medals and discoveries, and the loot as a strip of chips. Every
// piece explains itself on hover rather than in a sentence. Reduced motion fills instantly: the CSS transition handles it.


export function RewardScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const reward = run.pendingReward;
  const lastBond = useAccountStore((s) => s.lastBond);
  const lastProgress = useAccountStore((s) => s.lastProgress);
  const bondTotal = useAccountStore((s) => s.account.bond);
  const [filled, setFilled] = useState(false);
  // §2.8.1 — the Elite Trainer's relic pick is the screen's second step: the summary first, then the choice.
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 60);
    return () => clearTimeout(t);
  }, []);

  const rows = useMemo(() => {
    if (!reward) return [];
    return reward.xpAwarded
      .map((a) => {
        const mon = run.box.find((m) => m.uid === a.uid);
        if (!mon) return null;
        const up = reward.levelUps.find((l) => l.uid === a.uid) ?? null;
        return { mon, amount: a.amount, up };
      })
      .filter((r): r is { mon: PartyMon; amount: number; up: (typeof reward.levelUps)[number] | null } => !!r);
  }, [reward, run.box]);

  if (!reward) return null;

  const pick = reward.relicPick ?? null;
  if (picking && pick) {
    return (
      <RelicOffer
        testId="elite-relic-pick"
        heading="The Elite's prize"
        headingTip={elitePrizeTip()}
        lede="Three relics. Take one, or none."
        offer={pick}
        onPick={(relicId) => dispatch({ type: 'claim-reward', ...(relicId ? { relicId } : {}) })}
        ids={{ offer: 'elite-offer-', take: 'btn-take-elite-relic', decline: 'btn-decline-elite-relic' }}
      />
    );
  }

  const caught = reward.caught;
  const caughtSpecies = caught ? content.species(caught.speciesId) : null;
  const boxFull = run.box.length >= boxCapacity(run);
  const hasLoot = reward.money > 0 || (reward.consumables ?? []).length > 0 || (reward.balls ?? 0) > 0 || !!reward.relic || !!reward.heldItem || !!reward.tm;

  return (
    <main className={styles.root} data-testid="reward-screen">
      <div className={`${styles.card} fx-pop`}>
        <h1 className={`${styles.title} display`}>{caught?.shiny ? 'A shiny!' : caught ? 'Gotcha!' : 'Victory!'}</h1>
        {caught && caughtSpecies && (
          <section className={styles.catch} data-testid="reward-catch">
            {/* §5.14 — a shiny shows the palette it was caught in: the official shiny sprite, not the artwork. */}
            {caught.shiny ? (
              <span className={styles.catchShinyBox}><img className={`${styles.catchShiny} pixel fx-shiny`} src={battleSpriteUrl(caughtSpecies.id, 'front', true)} alt="" data-testid="reward-catch-shiny" /></span>
            ) : (
              <img src={portraitUrl(caughtSpecies.dex, caughtSpecies.id)} alt="" width={96} height={96} />
            )}
            <div>
              <h2 className={`${styles.catchName} display`}>
                {caughtSpecies.name} {caught.shiny && <ShinyMark name={caughtSpecies.name} size={18} owned />} <span className="tabular">Lv {caught.level}</span>
                {caught.shiny && !boxFull && <span className={`${styles.bond} tabular`} data-testid="reward-catch-bond"> +{BOND.shiny} Bond</span>}
              </h2>
              <span className={styles.types}>
                {caughtSpecies.types.map((t) => (
                  <TypeBadge key={t} type={t} size={18} defenderTypes={caughtSpecies.types} />
                ))}
              </span>
              <p className={styles.catchNote}>{boxFull ? 'Box full — choose who to release next.' : 'Joins the Box.'}</p>
            </div>
          </section>
        )}

        <ul className={styles.xpList}>
          {rows.map(({ mon, amount, up }) => {
            const species = content.species(mon.speciesId);
            const need = xpToNext(mon.level);
            const pct = Math.min(100, (mon.xp / need) * 100);
            const isActive = run.activeUids.includes(mon.uid);
            // §6.8.1 — the line's Bond from this fight, once per line (two copies of a line share one track).
            const line = content.lineBase(mon.speciesId);
            const firstActive = rows.find((r) => run.activeUids.includes(r.mon.uid) && content.lineBase(r.mon.speciesId) === line);
            const bond = isActive && firstActive?.mon.uid === mon.uid ? lastBond.find((b) => b.line === line) : undefined;
            const hidden = hiddenAbilityOf(line, content);
            return (
              <li key={mon.uid} className={`${styles.xpRow} ${up ? styles.levelled : ''}`} data-testid={`xp-${mon.speciesId}`}>
                <MonIcon speciesId={species.id} size={46} />
                <div className={styles.xpBody}>
                  <div className={styles.xpHead}>
                    <span className={`${styles.xpName} display`}>{species.name}</span>
                    {mon.shiny && <ShinyMark name={species.name} size={14} owned />}
                    {up ? (
                      <span className={styles.levelUp} data-testid={`levelup-${mon.speciesId}`}>
                        Lv {up.from} → {up.to}
                      </span>
                    ) : (
                      <span className={`${styles.level} tabular`}>Lv {mon.level}</span>
                    )}
                    {!isActive && <span className={styles.bench}>bench ×0.75</span>}
                    <span className={`${styles.gain} tabular`}>+{amount} XP</span>
                  </div>
                  <span className={styles.track}>
                    <span className={styles.fill} style={{ width: filled ? `${pct}%` : '0%' }} />
                  </span>
                  <span className={styles.xpMeta}>
                    <span className="tabular">
                      {mon.xp}/{need} to Lv {mon.level + 1}
                    </span>
                    <span className="tabular">
                      HP {mon.hp}/{maxHpOf(mon, content)}
                    </span>
                  </span>

                  {(up?.gains || (up && up.learned.length > 0) || up?.evolutionReady || bond) && (
                    <div className={styles.extras}>
                      {up?.gains && (
                        <Tipped as="span" tip={levelGainTip(species.name, up.from, up.to, up.gains, up.statsAt)} className={styles.gains} data-testid={`gains-${mon.speciesId}`}>
                          {(Object.keys(STAT_SHORT) as (keyof typeof STAT_SHORT)[]).map((k) => (
                            <span key={k} className={styles.statPill}>
                              <b className="tabular">+{up.gains![k]}</b> {STAT_SHORT[k]}
                            </span>
                          ))}
                        </Tipped>
                      )}
                      {/* §6.7.2 — a move learned past four waits in the pool: an outlined chip, never a lost one. */}
                      {up?.learned.map((m) => (
                        <span key={m} className={styles.learned} data-testid={up.activated.includes(m) ? `learned-${m}` : `pooled-${mon.speciesId}`}>
                          <MoveChip id={m} active={up.activated.includes(m)} fresh />
                          {!up.activated.includes(m) && (
                            <Tipped tip={poolTip(content.move(m).name)} className={styles.poolNote}>
                              {REWARD_TEXT.inPool}
                            </Tipped>
                          )}
                        </span>
                      ))}
                      {up?.evolutionReady && (
                        <span className={styles.ready} data-testid={`ready-${mon.speciesId}`}>
                          <IconSparkles size={14} /> {REWARD_TEXT.readyToEvolve}
                        </span>
                      )}
                      {bond && (
                        <Tipped tip={bondGainTip(content.species(line).name, bond.points, bondTotal[line] ?? 0, bond.rankUps)} className={`${styles.bond} tabular`} data-testid={`bond-${mon.speciesId}`}>
                          +{bond.points} Bond{bond.rankUps.length > 0 && <b className={styles.rankUp}> · {BOND_RANK_NAME[bond.rankUps[bond.rankUps.length - 1]!]}</b>}
                        </Tipped>
                      )}
                      {/* §6.8.2 — what a Bond rank opened, named: the hidden ability is a chip of its own. */}
                      {bond?.rankUps.map((r) =>
                        r === BOND_TIER.hiddenAbility && hidden ? (
                          <Tipped key={r} tip={abilityTip(hidden)} className={styles.unlock} data-testid={`unlock-${mon.speciesId}`}>
                            <IconSparkles size={13} /> {content.ability(hidden).name}
                          </Tipped>
                        ) : REWARD_TEXT.bondUnlock[r] ? (
                          <Tipped key={r} tip={bondUnlockTip(r, content.species(line).name)} className={styles.unlock} data-testid={`unlock-${mon.speciesId}`}>
                            <IconSparkles size={13} /> {REWARD_TEXT.bondUnlock[r]}
                          </Tipped>
                        ) : null,
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* §8.7 / §8.6.1 — what the fight moved on the account: a medal, a discovery. */}
        {lastProgress.length > 0 && (
          <ul className={styles.progress} aria-label="Progress" data-testid="reward-progress">
            {lastProgress.map((n) => (
              <Tipped as="li" tabIndex={0} key={`${n.kind}-${n.id}`} tip={progressNoteTip(n.kind, n.id, n.name, n.to, n.goal, n.done)} className={`${styles.note} ${n.done ? styles.noteDone : ''}`}>
                {n.kind === 'achievement' ? (
                  <MedalIcon tier={n.tier} />
                ) : (
                  <span className={styles.noteIcon} aria-hidden="true">
                    <img src={itemIcon(n.id)} alt="" width={15} height={15} />
                  </span>
                )}
                <span className={styles.noteName}>{n.name}</span>
                {/* The bar's column is kept even when a one-shot has none, so every row lines up. */}
                <span className={n.goal > 1 ? styles.noteBar : undefined} aria-hidden="true">
                  {n.goal > 1 && <span style={{ width: `${(n.to / n.goal) * 100}%` }} />}
                </span>
                <span className={`${styles.noteCount} ${n.done ? styles.noteEarned : ''} tabular`}>{n.done ? 'Done' : `${n.to}/${n.goal}`}</span>
              </Tipped>
            ))}
          </ul>
        )}

        {/* §2.14 / §7.3 / §7.4.6 — the loot, as one strip: each piece names itself and what it is for on hover. */}
        {hasLoot && (
          <div className={styles.loot}>
            {reward.money > 0 && (
              <Tipped as="span" tip={rewardMoneyTip(reward.money, run.money)} className={styles.lootChip} data-testid="reward-money">
                <PokeDollar size={22} /> <b className="tabular">{reward.money.toLocaleString('en-GB')} ₽</b>
              </Tipped>
            )}
            {((reward.consumables ?? []).length > 0 || (reward.balls ?? 0) > 0) && <SupplyStrip ids={reward.consumables ?? []} balls={reward.balls ?? 0} testId="reward-supplies" />}
            {reward.relic && (
              <Tipped as="span" tip={lootTip(content.relic(reward.relic).name, 'Relic', content.relic(reward.relic).description, 'Works for the rest of the run; nothing to equip.')} className={`${styles.lootChip} ${styles.lootRare}`} data-testid="reward-relic">
                <img src={itemIcon(reward.relic)} alt="" width={30} height={30} className={styles.dropIcon} /> {content.relic(reward.relic).name}
              </Tipped>
            )}
            {reward.heldItem && (
              <Tipped as="span" tip={lootTip(content.heldItem(reward.heldItem).name, 'Held item', content.heldItem(reward.heldItem).description, 'Give it to someone from the map.')} className={styles.lootChip} data-testid="reward-held-item">
                <img src={itemIcon(reward.heldItem)} alt="" width={30} height={30} className={styles.dropIcon} /> {content.heldItem(reward.heldItem).name}
              </Tipped>
            )}
            {reward.tm && (
              <Tipped as="span" tip={lootTip(content.tm(reward.tm).name, 'TM', content.tm(reward.tm).description, 'Teach it from the Move Manager.')} className={styles.lootChip} data-testid="reward-tm">
                <img src={tmIcon(reward.tm)} alt="" width={30} height={30} className={styles.dropIcon} /> {content.tm(reward.tm).name}
              </Tipped>
            )}
          </div>
        )}

        {reward.faintedUids.length > 0 && (
          <p className={styles.trauma} data-testid="reward-trauma">
            {reward.faintedUids.map((uid) => content.species(run.box.find((m) => m.uid === uid)!.speciesId).name).join(', ')} fainted: +1 Trauma for the rest of the run.
          </p>
        )}

        <button type="button" className={styles.continue} onClick={() => (pick ? setPicking(true) : dispatch({ type: 'claim-reward' }))} data-testid="btn-claim">
          {pick ? 'Choose a relic' : 'Continue'}
        </button>
      </div>
    </main>
  );
}
