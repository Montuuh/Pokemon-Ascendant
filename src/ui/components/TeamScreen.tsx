import { useEffect, useRef, useState, type DragEvent } from 'react';
import { IconCards, IconCrown, IconLock, IconPlus, IconX } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { battleSpriteUrl } from '@/content/schemas/species';
import { benchXpShare, boxCapacity, gymById, matchupAgainst, placesOf, runHelpers, teamStats, xpToNext, DEFAULT_PROGRESSION, type PartyMon, type RunAction } from '@/sim';
import { itemIcon } from '@/ui/art';
import { ItemIcon } from '@/ui/components/FindPrize';
import { HpBar } from '@/ui/components/HpBar';
import { MonIcon } from '@/ui/components/MonIcon';
import { MoveChip } from '@/ui/components/MoveChip';
import { MoveManager } from '@/ui/components/MoveManager';
import { ShinyMark } from '@/ui/components/ShinyMark';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { RUN_REJECT_TEXT, TEAM_TEXT } from '@/ui/strings';
import { abilitySheetTip, heldItemTip, matchupTip, teamPlaceTip, teamStatTip, teamTip, teamXpTip } from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import styles from './TeamScreen.module.css';

// §2.3 / §9.12 — the Team screen (v0.9.26, the user, 2026-10-20: "improve the design of managing the Pokémon team, on
// the route and in the towns"). One sheet wherever the team is chosen — the map, a City's lobby, its Center, the Ring:
// the formation as the fight will stand it (Lead, Bench 1, Bench 2), the Box beside it, and the selected Pokémon's
// sheet — its stats as its next fight fields them, its ability, the item it holds (given or taken here), its four cards
// (the Move Manager one click away), its evolution, and how it meets the Gyms the route ends at. A Pokémon is moved by
// dragging it onto a place, by an empty place's "+", or by the place buttons on its sheet; every change is the run's
// `set-active`, so the reducer keeps every rule (two places for a Legendary, nobody resting, somebody standing) and the
// screen says why when it refuses. A modal: focus is held inside it (and inside the Move Manager while that is open),
// stays where it was through every action, and goes back to the door that opened it.

const SLOTS = 3;
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface Props {
  onClose: () => void;
  /** The team is locked (a node entered): the sheet still reads, nothing moves. */
  locked?: boolean;
  initialUid?: string | null;
}

export function TeamScreen({ onClose, locked = false, initialUid = null }: Props) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [selected, setSelected] = useState<string>(initialUid ?? run.activeUids[0] ?? run.box[0]!.uid);
  const [managing, setManaging] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const movesBtn = useRef<HTMLButtonElement>(null);
  // Read by the key handler, which is set up once: the latest of each, never a stale one.
  const closeRef = useRef(onClose);
  const managingRef = useRef(managing);
  useEffect(() => {
    closeRef.current = onClose;
    managingRef.current = managing;
  });

  const active = run.activeUids.map((u) => run.box.find((m) => m.uid === u)).filter((m): m is PartyMon => !!m);
  const benched = run.box.filter((m) => !run.activeUids.includes(m.uid));
  const mon = run.box.find((m) => m.uid === selected) ?? run.box[0]!;

  // Once, on open: focus inside, Tab held inside (the Move Manager's own panel while it is up), Escape closing the
  // innermost first; and on close, focus back where it came from.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const trap = () => (managingRef.current ? document.querySelector<HTMLElement>('[data-testid="move-manager-overlay"]') : panel.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (managingRef.current) setManaging(null);
        else closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const box = trap();
      const items = Array.from(box?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const now = document.activeElement;
      if (e.shiftKey && (now === first || !box?.contains(now))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (now === last || !box?.contains(now))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      returnTo?.focus?.();
    };
  }, []);

  // A control that acted and is gone (Give, Take, an empty place's "+") hands the focus on to what took its place, once
  // the run has redrawn the sheet: the selector is set before the dispatch and read after the render.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = panel.current?.querySelector<HTMLElement>(pendingFocus.current);
    pendingFocus.current = null;
    el?.focus();
  });
  const focusNext = (selector: string) => {
    pendingFocus.current = selector;
  };

  // The Move Manager takes the focus when it opens; "Moves" gets it back when it closes.
  const wasManaging = useRef(false);
  useEffect(() => {
    if (managing) document.querySelector<HTMLElement>('[data-testid="move-manager-overlay"] button')?.focus();
    else if (wasManaging.current) movesBtn.current?.focus();
    wasManaging.current = !!managing;
  }, [managing]);

  function act(action: RunAction) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? TEAM_TEXT.refused);
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  /** §2.3 — put `uid` in place `slot` (0 the Lead), or in the Box (`null`): the formation as the run will hold it. */
  function place(uid: string, slot: number | null) {
    if (locked) return;
    const now = [...run.activeUids];
    const at = now.indexOf(uid);
    if (slot === null) {
      // The last one in the formation stays: the same refusal the sheet's Box button gives, in its words.
      if (at >= 0 && now.length <= 1) {
        setToast(TEAM_TEXT.lastOne);
        window.setTimeout(() => setToast(null), 2600);
        return;
      }
      if (at >= 0) act({ type: 'set-active', uids: now.filter((u) => u !== uid) });
      return;
    }
    if (at >= 0) {
      // A swap inside the formation: the two trade places.
      const target = Math.min(slot, now.length - 1);
      [now[at], now[target]] = [now[target]!, now[at]!];
      act({ type: 'set-active', uids: now });
      return;
    }
    // From the Box: it takes the place, and whoever stood there goes to the Box.
    if (slot < now.length) now[slot] = uid;
    else now.push(uid);
    act({ type: 'set-active', uids: now });
  }

  const drag = (uid: string) => ({
    draggable: !locked,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData('text/plain', uid);
      e.dataTransfer.effectAllowed = 'move';
    },
  });
  const drop = (key: string, slot: number | null) => ({
    onDragOver: (e: DragEvent) => {
      if (locked) return;
      e.preventDefault();
      setOver(key);
    },
    onDragLeave: () => setOver((o) => (o === key ? null : o)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(null);
      const uid = e.dataTransfer.getData('text/plain');
      if (uid) place(uid, slot);
    },
  });

  // The route's Gyms, while there is a route: what the sheet's matchup is against.
  const gyms = !run.city && run.zone !== 'league' && run.zone !== 'victory-road' ? run.map.gyms.map((id) => gymById(id)) : [];
  const monName = content.species(mon.speciesId).name;

  return (
    <div className={styles.scrim} role="presentation" onClick={onClose}>
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-label={TEAM_TEXT.title} onClick={(e) => e.stopPropagation()} data-testid="team-screen">
        <header className={styles.head}>
          <h2 className={`${styles.title} display`}>
            {TEAM_TEXT.title}
            <InfoDot tip={teamTip()} />
          </h2>
          {locked && (
            <span className={styles.lockNote}>
              <IconLock size={14} aria-hidden="true" /> {TEAM_TEXT.locked}
            </span>
          )}
          {toast && (
            <p className={styles.toast} role="status">
              {toast}
            </p>
          )}
          <button type="button" className={styles.close} onClick={onClose} aria-label={TEAM_TEXT.close} data-testid="team-close" data-autofocus>
            <IconX size={18} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.left}>
            <section aria-label={TEAM_TEXT.formation}>
              <h3 className={styles.section}>{TEAM_TEXT.formation}</h3>
              <ol className={styles.formation}>
                {Array.from({ length: SLOTS }, (_, i) => {
                  const m = active[i];
                  // A Legendary's second place (§2.3): drawn as taken, by the one before it.
                  const second = !m && i > 0 && active[i - 1] && placesOf(active[i - 1]!.speciesId, content) > 1;
                  // The next free place takes the selected Pokémon from the Box with a click: the keyboard's way in.
                  const open = !m && !second && i === active.length && !locked && !run.activeUids.includes(mon.uid);
                  return (
                    <li key={i} className={`${styles.slot} ${over === `slot-${i}` ? styles.over : ''}`} {...drop(`slot-${i}`, i)} data-testid={`team-slot-${i}`}>
                      <span className={styles.slotLabel}>
                        {i === 0 && <IconCrown size={14} aria-hidden="true" />}
                        {TEAM_TEXT.slots[i]}
                      </span>
                      {m ? (
                        <SlotCard mon={m} selected={m.uid === mon.uid} onSelect={() => setSelected(m.uid)} drag={drag(m.uid)} />
                      ) : second ? (
                        <span className={styles.empty}>{TEAM_TEXT.secondPlace}</span>
                      ) : open ? (
                        <button type="button" className={styles.put} onClick={() => (focusNext(`[data-testid="team-card-${mon.uid}"]`), place(mon.uid, i))} aria-label={TEAM_TEXT.putHere(monName, TEAM_TEXT.slots[i]!)} data-testid={`team-put-${i}`}>
                          <IconPlus size={22} aria-hidden="true" />
                        </button>
                      ) : (
                        <span className={styles.empty}>
                          <span className="sr-only">{TEAM_TEXT.emptyPlace}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>

            <section aria-label={TEAM_TEXT.box} className={`${styles.boxArea} ${over === 'box' ? styles.over : ''}`} {...drop('box', null)} data-testid="team-box">
              <h3 className={styles.section}>
                {TEAM_TEXT.box} <span className="tabular">{run.box.length}/{boxCapacity(run)}</span>
              </h3>
              {benched.length ? (
                <ul className={styles.tiles}>
                  {benched.map((m) => (
                    <li key={m.uid}>
                      <BoxTile mon={m} selected={m.uid === mon.uid} resting={m.uid === run.resting} onSelect={() => setSelected(m.uid)} drag={drag(m.uid)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.note}>{TEAM_TEXT.allOut}</p>
              )}
            </section>
          </div>

          <Sheet
            mon={mon}
            slot={run.activeUids.indexOf(mon.uid)}
            filled={active.length}
            locked={locked}
            gyms={gyms}
            movesRef={movesBtn}
            onPlace={(slot) => place(mon.uid, slot)}
            onManage={() => setManaging(mon.uid)}
            onEquip={(itemId) => {
              // Given, its Take button takes the focus; taken, the first item it could be given instead.
              focusNext(itemId ? '[data-testid="team-take"]' : '[data-testid^="team-give-"]');
              act({ type: 'equip-item', uid: mon.uid, itemId });
            }}
          />
        </div>
      </div>
      {managing && <MoveManager uid={managing} onClose={() => setManaging(null)} />}
    </div>
  );
}

type DragProps = { draggable: boolean; onDragStart: (e: DragEvent) => void };

/**
 * D9 — a battle sprite at the largest whole or half multiple of its own size that fits `box`, standing on the card's
 * floor: a Caterpie stays small beside an Onix, as it does on the map and in the arena.
 */
function PixelSprite({ src, box }: { src: string; box: number }) {
  const [size, setSize] = useState<[number, number] | null>(null);
  return (
    <span className={styles.spriteBox} style={{ height: box }}>
      <img
        className="pixel"
        src={src}
        alt=""
        draggable={false}
        style={size ? { width: size[0], height: size[1] } : { visibility: 'hidden' }}
        onLoad={(e) => {
          const w = e.currentTarget.naturalWidth;
          const h = e.currentTarget.naturalHeight;
          const k = Math.max(1, Math.floor((box / Math.max(w, h)) * 2) / 2);
          setSize([w * k, h * k]);
        }}
      />
    </span>
  );
}

/** A place in the formation: the battle sprite, the name and level, the HP. */
function SlotCard({ mon, selected, onSelect, drag }: { mon: PartyMon; selected: boolean; onSelect: () => void; drag: DragProps }) {
  const content = getContent();
  const s = content.species(mon.speciesId);
  const max = runHelpers.maxHpOf(mon, content);
  return (
    <button type="button" className={`${styles.card} ${selected ? styles.selected : ''} ${mon.hp <= 0 ? styles.fainted : ''}`} onClick={onSelect} aria-pressed={selected} aria-label={TEAM_TEXT.monLabel(s.name, mon.level, mon.hp, max)} data-testid={`team-card-${mon.uid}`} {...drag}>
      <PixelSprite src={battleSpriteUrl(s.id, 'front', !!mon.shiny)} box={96} />
      <span className={`${styles.cardName} display`}>
        {s.name}
        {mon.shiny && <ShinyMark name={s.name} size={12} plain />}
      </span>
      <span className={`${styles.cardLevel} tabular`}>Lv {mon.level}</span>
      <HpBar hp={mon.hp} maxHp={max} height={7} />
    </button>
  );
}

/** A Pokémon in the Box: its face, its name and level, its HP. */
function BoxTile({ mon, selected, resting, onSelect, drag }: { mon: PartyMon; selected: boolean; resting: boolean; onSelect: () => void; drag: DragProps }) {
  const content = getContent();
  const s = content.species(mon.speciesId);
  const max = runHelpers.maxHpOf(mon, content);
  return (
    <button type="button" className={`${styles.tile} ${selected ? styles.selected : ''} ${mon.hp <= 0 ? styles.fainted : ''}`} onClick={onSelect} aria-pressed={selected} aria-label={TEAM_TEXT.monLabel(s.name, mon.level, mon.hp, max) + (resting ? `, ${TEAM_TEXT.resting}` : '')} data-testid={`team-tile-${mon.uid}`} {...drag}>
      <MonIcon speciesId={s.id} size={40} />
      <span className={`${styles.tileName} display`}>{s.name}</span>
      <span className={`${styles.tileLevel} tabular`}>Lv {mon.level}</span>
      <HpBar hp={mon.hp} maxHp={max} height={5} />
    </button>
  );
}

/** A place button: refused with a bubble that says why, never silently (D2) — `aria-disabled`, not `disabled`. */
function PlaceButton({ label, pressed, refusal, onPlace, testId }: { label: string; pressed: boolean; refusal: 'gap' | 'last' | 'locked' | null; onPlace: () => void; testId: string }) {
  const tip = useTip(refusal ? teamPlaceTip(refusal) : null);
  return (
    <button type="button" className={styles.placeBtn} aria-pressed={pressed} aria-disabled={refusal ? true : undefined} onClick={refusal ? undefined : onPlace} data-testid={testId} {...tip}>
      {label}
    </button>
  );
}

function Sheet({
  mon,
  slot,
  filled,
  locked,
  gyms,
  movesRef,
  onPlace,
  onManage,
  onEquip,
}: {
  mon: PartyMon;
  slot: number;
  /** How many places the formation has filled: a Pokémon moves into one of them, or the next. */
  filled: number;
  locked: boolean;
  gyms: ReturnType<typeof gymById>[];
  movesRef: React.RefObject<HTMLButtonElement | null>;
  onPlace: (slot: number | null) => void;
  onManage: () => void;
  onEquip: (itemId: string | null) => void;
}) {
  const run = useRunStore((s) => s.run)!;
  const content = getContent();
  const s = content.species(mon.speciesId);
  const stats = teamStats(run, mon, content);
  const top = Math.max(stats.hp, stats.attack, stats.defense, stats.speed);
  const ability = mon.abilityId ? content.ability(mon.abilityId) : null;
  const held = mon.heldItem ? content.heldItem(mon.heldItem) : null;
  const bagItems = [...new Set(run.bag)].map((id) => content.heldItem(id)).filter((i) => !i.speciesLock || i.speciesLock === mon.speciesId);
  const evolve = s.evolveLevel !== undefined && s.evolvesTo.length ? (mon.level >= s.evolveLevel ? TEAM_TEXT.ready : TEAM_TEXT.evolvesAt(s.evolveLevel)) : null;
  const abilityTip = useTip(abilitySheetTip(ability));
  const xpTip = useTip(teamXpTip(mon.xp, xpToNext(mon.level), benchXpShare(run, content, DEFAULT_PROGRESSION.benchXpShare)));
  // A place it cannot take: a gap in the formation, the last one out of it, or a locked team.
  const refusal = (i: number | null): 'gap' | 'last' | 'locked' | null =>
    locked ? 'locked' : i === null ? (slot >= 0 && filled <= 1 ? 'last' : null) : i > (slot >= 0 ? filled - 1 : filled) ? 'gap' : null;

  return (
    <section className={styles.sheet} aria-label={TEAM_TEXT.sheet(s.name)} data-testid="team-sheet">
      <header className={styles.sheetHead}>
        <MonIcon speciesId={s.id} size={72} />
        <div className={styles.sheetName}>
          <h3 className={`${styles.name} display`}>
            {s.name}
            {mon.shiny && <ShinyMark name={s.name} size={14} plain />}
          </h3>
          <span className={styles.types}>
            {s.types.map((t) => (
              <TypeBadge key={t} type={t} size={12} defenderTypes={s.types} />
            ))}
          </span>
          <span className={styles.level} tabIndex={0} {...xpTip}>
            <b className="tabular">Lv {mon.level}</b>
            <span className={styles.xp}>
              <span style={{ width: `${Math.min(100, (mon.xp / xpToNext(mon.level)) * 100)}%` }} />
            </span>
          </span>
        </div>
      </header>

      {/* Where it stands: the three places and the Box, one button each. */}
      <div className={styles.places} role="group" aria-label={TEAM_TEXT.placeLabel}>
        {TEAM_TEXT.slots.map((label, i) => (
          <PlaceButton key={label} label={label} pressed={slot === i} refusal={refusal(i)} onPlace={() => onPlace(i)} testId={`team-place-${i}`} />
        ))}
        <PlaceButton label={TEAM_TEXT.box} pressed={slot < 0} refusal={refusal(null)} onPlace={() => onPlace(null)} testId="team-place-box" />
      </div>

      <dl className={styles.stats}>
        {(['hp', 'attack', 'defense', 'speed'] as const).map((k) => (
          <Tipped key={k} as="div" tip={teamStatTip(k, stats[k])} className={styles.stat}>
            <dt>{TEAM_TEXT.stats[k]}</dt>
            <dd className="tabular">{stats[k]}</dd>
            <span className={styles.statBar}>
              <span style={{ width: `${(stats[k] / top) * 100}%` }} />
            </span>
          </Tipped>
        ))}
      </dl>

      <div className={styles.rows}>
        <span className={styles.rowLabel}>{TEAM_TEXT.ability}</span>
        <span className={styles.rowValue} tabIndex={0} {...abilityTip}>
          {ability ? ability.name : TEAM_TEXT.noAbility}
        </span>

        <span className={styles.rowLabel}>{TEAM_TEXT.held}</span>
        <span className={styles.rowValue}>
          {held ? (
            <Tipped tip={heldItemTip(held)} className={styles.item}>
              <ItemIcon src={itemIcon(held.id)} size={30} />
              {held.name}
            </Tipped>
          ) : (
            <span className={styles.muted}>{TEAM_TEXT.holdingNothing}</span>
          )}
          {held && !locked && (
            <button type="button" className={styles.small} onClick={() => onEquip(null)} data-testid="team-take">
              {TEAM_TEXT.take}
            </button>
          )}
        </span>
        {!locked && bagItems.length > 0 && (
          <>
            <span className={styles.rowLabel}>{TEAM_TEXT.give}</span>
            <ul className={styles.bagItems}>
              {bagItems.map((i) => (
                <li key={i.id}>
                  <Tipped as="button" type="button" tip={heldItemTip(i)} className={styles.bagItem} onClick={() => onEquip(i.id)} aria-label={TEAM_TEXT.giveLabel(i.name, s.name)} data-testid={`team-give-${i.id}`}>
                    <ItemIcon src={itemIcon(i.id)} size={30} />
                  </Tipped>
                </li>
              ))}
            </ul>
          </>
        )}

        <span className={styles.rowLabel}>{TEAM_TEXT.moves}</span>
        <span className={styles.moves}>
          {mon.moveIds.map((id) => (
            <MoveChip key={id} id={id} active />
          ))}
          <button ref={movesRef} type="button" className={styles.small} onClick={onManage} data-testid="team-manage-moves">
            <IconCards size={14} aria-hidden="true" /> {TEAM_TEXT.manage}
          </button>
        </span>

        {evolve && (
          <>
            <span className={styles.rowLabel}>{TEAM_TEXT.evolution}</span>
            <span className={styles.rowValue}>{evolve}</span>
          </>
        )}
      </div>

      {gyms.length > 0 && (
        <div className={styles.matchups} aria-label={TEAM_TEXT.vsGyms}>
          <span className={styles.rowLabel}>{TEAM_TEXT.vsGyms}</span>
          {gyms.map((g) => {
            const m = matchupAgainst(mon, g.type, content);
            // Good news or bad news by its border, and none when it is both: the words always carry it.
            const good = (m.attack > 1 || m.defend < 1) && m.defend <= 1;
            const bad = m.defend > 1 && m.attack <= 1;
            return (
              <Tipped key={g.id} tip={matchupTip(g.name, g.type, m.attack, m.defend)} className={styles.matchup} data-good={good || undefined} data-bad={bad || undefined}>
                <TypeBadge type={g.type} size={12} mode="attack" />
                <span className="tabular">{TEAM_TEXT.matchup(m.attack, m.defend)}</span>
              </Tipped>
            );
          })}
        </div>
      )}
    </section>
  );
}
