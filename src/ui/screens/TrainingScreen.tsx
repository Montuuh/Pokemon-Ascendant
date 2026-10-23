import { useState } from 'react';
import { IconBarbell } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import {
  DEFAULT_PROGRESSION,
  VICTORY_ROAD,
  TRAINING_UPGRADES,
  trainingOptions,
  type PartyMon,
  type TrainingUpgrade,
} from '@/sim';
import { BackButton } from '@/ui/components/BackButton';
import { RouteStop } from '@/ui/components/RouteStop';
import { MonIcon } from '@/ui/components/MonIcon';
import { SHOP_TEXT, STAT_LONG, TRAINING_TEXT } from '@/ui/strings';
import { moveDefTip, trainingTip, trainingUpgradeTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import styles from './TrainingScreen.module.css';

// §2.12.3 — the Training Grounds: one Pokémon, one upgrade, and the road. Three choices in a row — who, what, and the
// detail when the upgrade has one (which stat, which move) — then Train. Walking on is the corner arrow, as at every stop.

type Stat = 'hp' | 'attack' | 'defense' | 'speed';
const STATS: Stat[] = ['hp', 'attack', 'defense', 'speed'];

export function TrainingScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [uid, setUid] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<TrainingUpgrade | null>(null);
  const [stat, setStat] = useState<Stat | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [newMoveId, setNewMoveId] = useState<string | null>(null);
  const mon = run.box.find((m) => m.uid === uid) ?? null;
  const opts = mon ? trainingOptions(mon, content, DEFAULT_PROGRESSION.maxLevel) : null;

  const available = (u: TrainingUpgrade): boolean => {
    if (!mon || !opts) return false;
    if (u === 'move-upgrade') return opts.upgradable.length > 0;
    if (u === 'level') return opts.canLevel;
    if (u === 'evolve') return opts.canEvolve;
    if (u === 'move-replace') return opts.ahead.length > 0;
    return true;
  };
  const ready =
    !!mon &&
    !!upgrade &&
    (upgrade === 'stat'
      ? !!stat
      : upgrade === 'move-upgrade'
        ? !!moveId
        : upgrade === 'move-replace'
          ? !!moveId && !!newMoveId
          : true);
  // The card says what the upgrade would do to this Pokémon; what it does in general is its tooltip.
  const outcome = (u: TrainingUpgrade): string => {
    if (!mon || !opts) return '';
    if (u === 'stat')
      return `HP +${VICTORY_ROAD.statBoost.hp} · the others +${VICTORY_ROAD.statBoost.attack}`;
    if (u === 'move-upgrade')
      return `${opts.upgradable.length} move${opts.upgradable.length === 1 ? '' : 's'} can grow`;
    if (u === 'level') return `Lv ${mon.level} → ${mon.level + 1}`;
    if (u === 'evolve')
      return `→ ${[...new Set(content.species(mon.speciesId).branches.map((b) => content.species(b.to).name))].join(' / ')}`;
    return `${opts.ahead.length} move${opts.ahead.length === 1 ? '' : 's'} further up`;
  };
  const pickMon = (m: PartyMon) => {
    setUid(m.uid === uid ? null : m.uid);
    setUpgrade(null);
    setStat(null);
    setMoveId(null);
    setNewMoveId(null);
  };
  const pickUpgrade = (u: TrainingUpgrade) => {
    setUpgrade(u);
    setStat(null);
    setMoveId(null);
    setNewMoveId(null);
  };
  const train = () =>
    mon &&
    upgrade &&
    dispatch({
      type: 'train',
      uid: mon.uid,
      upgrade,
      ...(stat ? { stat } : {}),
      ...(moveId ? { moveId } : {}),
      ...(newMoveId ? { newMoveId } : {}),
    });

  return (
    <main className={styles.root} data-testid="training-screen">
      <div className={styles.corner}>
        <BackButton
          label={SHOP_TEXT.backToRoute}
          onClick={() => dispatch({ type: 'leave-training' })}
          testId="btn-leave-training"
        />
      </div>
      <section className={styles.head}>
        <div className={styles.text}>
          <h1 className={`${styles.title} display`}>
            {TRAINING_TEXT.title}
            <InfoDot tip={trainingTip()} />
          </h1>
          <p className={styles.sub}>
            {!mon
              ? TRAINING_TEXT.pickMon
              : !upgrade
                ? TRAINING_TEXT.pickUpgrade
                : ready
                  ? TRAINING_TEXT.ready
                  : TRAINING_TEXT.pickDetail}
          </p>
        </div>
      </section>

      <div className={styles.stop}>
        <RouteStop kind="training" />
        <div className={styles.controls}>
          <ul className={styles.box} aria-label={TRAINING_TEXT.pickMon}>
            {run.box.map((m) => (
              <li key={m.uid}>
                <button
                  type="button"
                  className={`${styles.mon} ${m.uid === uid ? styles.picked : ''}`}
                  onClick={() => pickMon(m)}
                  aria-pressed={m.uid === uid}
                  data-testid={`train-mon-${m.uid}`}
                >
                  <MonIcon speciesId={m.speciesId} size={40} />
                  <span className={`${styles.name} display`}>{content.species(m.speciesId).name}</span>
                  <span className={`${styles.level} tabular`}>Lv {m.level}</span>
                </button>
              </li>
            ))}
          </ul>

          {mon && (
            <ul className={styles.upgrades} aria-label={TRAINING_TEXT.pickUpgrade}>
              {TRAINING_UPGRADES.map((u) => {
                const open = available(u);
                return (
                  <li key={u}>
                    <Tipped
                      as="button"
                      type="button"
                      tip={trainingUpgradeTip(u)}
                      className={`${styles.upgrade} ${upgrade === u ? styles.picked : ''}`}
                      onClick={open ? () => pickUpgrade(u) : undefined}
                      aria-disabled={!open || undefined}
                      aria-pressed={upgrade === u}
                      data-testid={`train-upgrade-${u}`}
                    >
                      <span className={`${styles.upgradeName} display`}>{TRAINING_TEXT.upgrade[u]}</span>
                      <span className={styles.upgradeLine}>{open ? outcome(u) : TRAINING_TEXT.none[u]}</span>
                    </Tipped>
                  </li>
                );
              })}
            </ul>
          )}

          {mon && opts && upgrade === 'stat' && (
            <div className={styles.detail} role="group" aria-label={TRAINING_TEXT.upgrade.stat}>
              {STATS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.chip} ${stat === s ? styles.picked : ''}`}
                  onClick={() => setStat(s)}
                  aria-pressed={stat === s}
                  data-testid={`train-stat-${s}`}
                >
                  {STAT_LONG[s] ?? s} <b className="tabular">+{VICTORY_ROAD.statBoost[s]}</b>
                </button>
              ))}
            </div>
          )}
          {mon && opts && upgrade === 'move-upgrade' && (
            <div className={styles.detail} role="group" aria-label={TRAINING_TEXT.upgrade['move-upgrade']}>
              {opts.upgradable.map((id) => (
                <Tipped
                  key={id}
                  as="button"
                  type="button"
                  tip={moveDefTip(content.move(`${id}-plus`))}
                  className={`${styles.chip} ${moveId === id ? styles.picked : ''}`}
                  onClick={() => setMoveId(id)}
                  aria-pressed={moveId === id}
                  data-testid={`train-move-${id}`}
                >
                  {content.move(id).name} → <b>{content.move(`${id}-plus`).name}</b>
                </Tipped>
              ))}
            </div>
          )}
          {mon && opts && upgrade === 'move-replace' && (
            <div className={styles.replace}>
              <div className={styles.detail} role="group" aria-label={TRAINING_TEXT.out}>
                <span className={styles.detailLabel}>{TRAINING_TEXT.out}</span>
                {mon.moveIds.map((id) => (
                  <Tipped
                    key={id}
                    as="button"
                    type="button"
                    tip={moveDefTip(content.move(id))}
                    className={`${styles.chip} ${moveId === id ? styles.picked : ''}`}
                    onClick={() => setMoveId(id)}
                    aria-pressed={moveId === id}
                    data-testid={`train-out-${id}`}
                  >
                    {content.move(id).name}
                  </Tipped>
                ))}
              </div>
              <div className={styles.detail} role="group" aria-label={TRAINING_TEXT.in}>
                <span className={styles.detailLabel}>{TRAINING_TEXT.in}</span>
                {opts.ahead.map((id) => (
                  <Tipped
                    key={id}
                    as="button"
                    type="button"
                    tip={moveDefTip(content.move(id))}
                    className={`${styles.chip} ${newMoveId === id ? styles.picked : ''}`}
                    onClick={() => setNewMoveId(id)}
                    aria-pressed={newMoveId === id}
                    data-testid={`train-in-${id}`}
                  >
                    {content.move(id).name}
                  </Tipped>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.train}
            disabled={!ready}
            onClick={train}
            data-testid="btn-train"
          >
            <IconBarbell size={20} aria-hidden="true" />
            {TRAINING_TEXT.train}
            {mon && ` ${content.species(mon.speciesId).name}`}
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')}
      </p>
    </main>
  );
}
