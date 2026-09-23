import { useEffect, useState } from 'react';
import {
  IconArrowBigUpLines, IconBackpack, IconBarrierBlock, IconBuildingStore, IconClover, IconHeartPlus, IconKarate,
  IconMenu2, IconShoppingBag, IconStairsDown, IconTrees, IconTrophy,
} from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { CITIES, runHelpers, type PartyMon } from '@/sim';
import { itemIcon, nodeBadge, statusGlyph, townArt } from '@/ui/art';
import { DoorSoonPanel } from '@/ui/components/DoorSoonPanel';
import { HpBar } from '@/ui/components/HpBar';
import { InventoryDrawer } from '@/ui/components/InventoryDrawer';
import { Modal } from '@/ui/components/Modal';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money } from '@/ui/components/Money';
import { PauseMenu } from '@/ui/components/PauseMenu';
import { CITY_DOOR_LABEL, RUN_REJECT_TEXT, STATUS_LABEL, type CityBuildingDoor, type CityDoor } from '@/ui/strings';
import { badgeTip, bagTip, ballsTip, doorTip, moneyTip, partyTip, townTip } from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import { TOWNS, type DoorPlacement } from './towns';
import styles from './CityScreen.module.css';

// §2.11 — a City is a lobby: the town is drawn, its buildings are the doors, and the road out is the gate.
//
// Nothing here is a rule. Which doors are open is the sim's (`CITIES[id].open`); what the doors *look* like is
// `towns.ts`. The open ones dispatch `enter-building` and the run's phase does the rest (the Center, shop and
// Dojo screens lead back here). A door in development opens the shared "not open yet" panel (§2.11.0). The gate
// opens the Reflection: pick a modifier, then set off (§2.11.3).

const DOOR_ICON: Record<CityDoor, typeof IconHeartPlus> = {
  center: IconHeartPlus,
  mart: IconShoppingBag,
  'department-store': IconBuildingStore,
  dojo: IconKarate,
  ring: IconTrophy,
  safari: IconTrees,
  'game-corner': IconClover,
  'black-market': IconStairsDown,
  gate: IconArrowBigUpLines,
};

type Panel = { kind: 'soon'; door: CityBuildingDoor } | { kind: 'gate' } | null;

export function CityScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [panel, setPanel] = useState<Panel>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [inventory, setInventory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const city = run.city!;
  const def = CITIES[city.id];
  const layout = TOWNS[city.id];
  const next = run.regionIndex + 2;
  const gateName = `To Region ${next}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Innermost first: a panel, the bag, then the menu.
      if (panel) setPanel(null);
      else if (inventory) setInventory(false);
      else setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, inventory]);

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  const isOpen = (d: DoorPlacement) => d.door === 'gate' || (!!d.building && def.open.includes(d.building));
  function knock(d: DoorPlacement) {
    if (d.door === 'gate') {
      setPick(null);
      setPanel({ kind: 'gate' });
    } else if (d.building && isOpen(d)) act({ type: 'enter-building', building: d.building });
    else setPanel({ kind: 'soon', door: d.door as CityBuildingDoor });
  }

  const bagCount = run.consumables.length + run.bag.length;

  return (
    <main className={`${styles.root} theme-stage`} data-testid="city-screen" data-city={city.id}>
      <header className={styles.topBar}>
        <div className={styles.nameBlock}>
          <h1 className={`${styles.name} display`}>{def.name}</h1>
          <InfoDot tip={townTip(def.name, next, run.modifiers.includes('greater-threats'))} />
          {/* §5.10 — the Badge case: what the Gyms behind you paid, for the rest of the run. */}
          <span className={styles.badges} data-testid="city-badges">
            {run.badges.map((id) => {
              const b = content.badge(id);
              return (
                <Tipped key={id} tip={badgeTip(b.name, b.description)} className={styles.badgeIcon}>
                  <img src={nodeBadge(`gym-${b.type}`)} alt={b.name} width={40} height={40} />
                </Tipped>
              );
            })}
          </span>
        </div>
        <div className={styles.purse}>
          <Tipped tip={moneyTip(run.money)} className={styles.stat} data-testid="city-money">
            <Money amount={run.money} size={20} />
          </Tipped>
          <Tipped tip={ballsTip(run.balls)} className={styles.stat}>
            <img src={itemIcon('poke-ball')} alt="" width={22} height={22} />
            <b className="tabular">{run.balls}</b>
          </Tipped>
          <BagButton count={bagCount} onOpen={() => setInventory(true)} />
        </div>
        <Party box={run.box} />
        <button type="button" className={styles.menuBtn} onClick={() => setPaused(true)} data-testid="btn-pause">
          <IconMenu2 size={18} /> Menu
        </button>
      </header>

      <div className={styles.stage}>
        <div className={styles.town}>
          <img className={styles.art} src={townArt(city.id)} alt={`${def.name}, seen from above`} draggable={false} />
          {layout.doors.map((d) => (
            <Door key={d.door} placement={d} open={isOpen(d)} label={d.door === 'gate' ? gateName : CITY_DOOR_LABEL[d.door]} onKnock={() => knock(d)} />
          ))}
        </div>
      </div>

      {toast && (
        <p className={styles.toast} role="status">
          {toast}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')}
      </p>

      {panel?.kind === 'soon' && <DoorSoonPanel door={panel.door} onClose={() => setPanel(null)} backLabel="Back to town" />}

      {panel?.kind === 'gate' && (
        <Modal title={gateName} testId="reflection" size="reading">
          <p className={styles.lede}>One rule for Region {next}, from its first node to its Gym. Pick one, then set off.</p>
          <div className={styles.offer} role="group" aria-label="Region Modifier">
            {city.reflection.map((id) => {
              const m = content.regionModifier(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={pick === id}
                  className={`${styles.mod} ${pick === id ? styles.modPicked : ''}`}
                  onClick={() => setPick(id)}
                  data-testid={`reflection-${id}`}
                >
                  <span className={`${styles.modName} display`}>{m.name}</span>
                  <span className={styles.modBody}>{m.description}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => setPanel(null)} data-testid="btn-stay">
              Stay in town
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={!pick}
              onClick={() => pick && act({ type: 'depart-city', modifierId: pick })}
              data-testid="btn-depart"
            >
              <IconArrowBigUpLines size={18} /> Set off
            </button>
          </div>
        </Modal>
      )}

      {inventory && <InventoryDrawer onClose={() => setInventory(false)} />}
      {paused && <PauseMenu onResume={() => setPaused(false)} />}
    </main>
  );
}

/** One building's door: a box over the art that lights on hover, and the name plate hanging off it. */
function Door({ placement, open, label, onKnock }: { placement: DoorPlacement; open: boolean; label: string; onKnock: () => void }) {
  const { door, box, plate } = placement;
  const Icon = DOOR_ICON[door];
  const tip = useTip(doorTip(door, open, label));
  return (
    <button
      type="button"
      className={`${styles.door} ${door === 'gate' ? styles.gate : ''}`}
      style={{ left: `${box[0]}%`, top: `${box[1]}%`, width: `${box[2]}%`, height: `${box[3]}%` }}
      onClick={onKnock}
      data-testid={`door-${door}`}
      data-state={open ? 'open' : 'soon'}
      aria-label={open ? label : `${label} — not open yet`}
      {...tip}
    >
      {/* The plate is part of the door: it takes the click and the hover like the building does. */}
      <span className={`${styles.plate} ${plate === 'top' ? styles.plateTop : styles.plateBottom}`}>
        <Icon size={16} aria-hidden="true" />
        {label}
        {!open && <IconBarrierBlock size={15} className={styles.soonIcon} aria-hidden="true" />}
      </span>
    </button>
  );
}

function BagButton({ count, onOpen }: { count: number; onOpen: () => void }) {
  const tip = useTip(bagTip());
  return (
    <button type="button" className={styles.bagBtn} onClick={onOpen} data-testid="btn-inventory" aria-label="Bag: relics, held items and consumables" {...tip}>
      <IconBackpack size={18} />
      <b className="tabular">{count}</b>
    </button>
  );
}

/** The Box at a glance, in the header — who needs the Center, before you choose whether to walk in. */
function Party({ box }: { box: readonly PartyMon[] }) {
  return (
    <ul className={styles.party} aria-label="Your Box" data-testid="city-party">
      {box.map((m) => (
        <PartyChip key={m.uid} mon={m} />
      ))}
    </ul>
  );
}

function PartyChip({ mon }: { mon: PartyMon }) {
  const content = getContent();
  const s = content.species(mon.speciesId);
  const max = runHelpers.maxHpOf(mon, content);
  const status = mon.status ? (STATUS_LABEL[mon.status.kind] ?? mon.status.kind) : null;
  const tip = useTip(partyTip(s.name, mon.level, mon.hp, max, mon.status?.kind ?? null, mon.traumaStacks));
  const name = [s.name, `${mon.hp} of ${max} HP`, status, mon.traumaStacks ? `Trauma ×${mon.traumaStacks}` : null].filter(Boolean).join(', ');
  return (
    <li className={styles.chip} tabIndex={0} aria-label={name} data-testid={`city-mon-${s.id}`} {...tip}>
      <MonIcon speciesId={s.id} size={34} />
      <span className={styles.chipBar}>
        <HpBar hp={mon.hp} maxHp={max} height={6} />
      </span>
      {mon.status && <img className={styles.chipStatus} src={statusGlyph(mon.status.kind)} alt="" width={14} height={14} />}
      {mon.traumaStacks > 0 && <span className={styles.chipTrauma} aria-hidden="true">×{mon.traumaStacks}</span>}
    </li>
  );
}
