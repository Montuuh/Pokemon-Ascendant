import { useEffect, useRef, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAppStore } from '@/app/store';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ALL_GYMS, BOND_TIER, MAX_LEVEL, bondRank, kitSlots, levelProgress, rankRow } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { compactIconOf, hubArt, mapPerson, martArt } from '@/ui/art';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { Tipped } from '@/ui/tooltip';
import { hubExitTip, hubSpotTip, tokenTip } from '@/ui/tips';
import { LevelRing } from './hub/LevelRing';
import { TrainerCard } from './hub/TrainerCard';
import { PcTerminal } from './hub/PcTerminal';
import { PokeMart } from './hub/PokeMart';
import { ItemGuide } from './hub/ItemGuide';
import { OakAide } from './hub/OakAide';
import { TrainerKit } from './hub/TrainerKit';
import { TokenIcon } from './hub/TokenIcon';
import { LEADER_SPOTS, LOBBY, LOBBY_EXIT, LOBBY_PEOPLE, LOBBY_SPOTS, PARTNER_SPOTS, SPOT_RANK, type HubSpot } from './hub/lobby';
import styles from './HubScreen.module.css';

// §8.4 — the Trainer Hub as a place (v0.9.2): the Indigo Plateau's Pokémon Center lobby, where a run is meant to end.
// The room is the menu — the Mart's clerk, the nurse who keeps your Trainer Card, the PC, and the door to the Elite
// Four, which is the way into a run; the doormat goes back to the title. A door opens its kiosk over the room, and
// "Lobby" closes it. The rank dial and the Token count sit in the header above both, because they are the two
// numbers the whole room is about.
//
// §8.4.6 — the lobby fills (v0.9.110). A door is in the room only once the rank has brought whoever keeps it —
// Professor Oak's aide at Rookie, the Mart clerk at Trainer, the Kit table at Challenger — every Leader beaten comes
// to stand in it (§8.14), and a Partner line walks it (§6.8.2). The first day's lobby is the nurse, the PC and the door.

const SPOT_LABEL: Record<HubSpot, string> = { mart: 'Poké Mart', card: 'Trainer Card', pc: 'PC Terminal', guide: 'Item Guide', run: 'New run', aide: "Oak's aide", kit: 'Trainer Kit' };
const KIOSK_LABEL: Record<Exclude<HubSpot, 'run'>, string> = { mart: 'Poké Mart', card: 'Trainer Card', pc: 'PC Terminal', guide: 'Item Guide', aide: "Professor Oak's aide", kit: 'Trainer Kit' };
/** Tab order: the picture's own, the door first. */
const SPOT_ORDER: readonly HubSpot[] = ['run', 'mart', 'card', 'pc', 'aide', 'kit', 'guide'];

export function HubScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const account = useAccountStore((s) => s.account);
  const acknowledge = useAccountStore((s) => s.acknowledge);
  const animate = useMotionPref();
  const [kiosk, setKiosk] = useState<Exclude<HubSpot, 'run'> | null>(null);
  // Focus follows the door: into the kiosk's Lobby button when one opens, back to the spot that opened it when it
  // closes (D8), so the keyboard never lands on the page's body.
  const lobbyButton = useRef<HTMLButtonElement>(null);
  const opened = useRef<HubSpot | null>(null);
  useEffect(() => {
    if (kiosk) {
      opened.current = kiosk;
      lobbyButton.current?.focus();
    } else if (opened.current) {
      document.querySelector<HTMLElement>(`[data-testid="kiosk-${opened.current}"]`)?.focus();
    }
  }, [kiosk]);
  // Escape closes an open kiosk — unless something inside it (a Pokédex sheet) has already answered the key.
  useEffect(() => {
    if (!kiosk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setKiosk(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kiosk]);
  const p = levelProgress(account.xp);
  // §8.4.6 — who is in the room: the doors the rank has opened, the Leaders beaten, the Partner lines.
  const spots = SPOT_ORDER.filter((id) => p.level >= (SPOT_RANK[id] ?? 1));
  const leaders = account.badges.flatMap((badge) => ALL_GYMS.filter((g) => g.badgeId === badge).slice(0, 1)).slice(0, LEADER_SPOTS.length);
  const partners = Object.entries(account.bond)
    .filter(([line, pts]) => bondRank(pts) >= BOND_TIER.partner && getContent().hasSpecies(line))
    .sort((a, b) => b[1] - a[1])
    .slice(0, PARTNER_SPOTS.length);
  const leave = () => {
    acknowledge();
    goTo('menu');
  };
  const open = (spot: HubSpot) => {
    if (spot === 'run') {
      acknowledge();
      goTo('starter');
    } else setKiosk(spot);
  };

  return (
    <main className={styles.root} data-testid="hub-screen" data-kiosk={kiosk ?? 'lobby'} data-rank={p.level}>
      <header className={styles.chrome}>
        {kiosk ? (
          <button key="lobby" ref={lobbyButton} type="button" className={styles.back} onClick={() => setKiosk(null)} data-testid="btn-hub-lobby">
            <IconArrowLeft size={18} /> Lobby
          </button>
        ) : (
          <button key="menu" type="button" className={styles.back} onClick={leave} data-testid="btn-hub-back">
            <IconArrowLeft size={18} /> Menu
          </button>
        )}
        <h1 className={`${styles.title} display`}>{kiosk ? KIOSK_LABEL[kiosk] : 'Trainer Hub'}</h1>
        <div className={styles.status}>
          <span className={styles.statusRing} data-testid="hub-level" data-level={p.level}>
            <LevelRing xp={account.xp} size={56} />
            <span className={styles.statusXp}>
              <span className={`${styles.statusXpText} tabular`}>{p.level >= MAX_LEVEL ? rankRow(p.level).name : `${p.span - p.into} XP to ${rankRow(p.level + 1).name}`}</span>
              <span className={styles.statusBar} aria-hidden="true"><span className={styles.statusFill} style={{ width: `${Math.round(p.fraction * 100)}%` }} /></span>
            </span>
          </span>
          <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
            <span className={styles.statusPill} data-testid="hub-tokens" data-tokens={account.tokens} aria-label={`${account.tokens} Tokens`}><TokenIcon /> <b className="tabular"><NumberFlow value={account.tokens} animated={animate} /></b></span>
          </Tipped>
        </div>
      </header>

      {kiosk ? (
        <section className={styles.panel} data-testid={`hub-panel-${kiosk}`}>
          {kiosk === 'card' && <TrainerCard />}
          {kiosk === 'pc' && <PcTerminal />}
          {kiosk === 'mart' && <PokeMart />}
          {kiosk === 'guide' && <ItemGuide />}
          {kiosk === 'aide' && <OakAide />}
          {kiosk === 'kit' && <TrainerKit />}
        </section>
      ) : (
        <PixelRoom<HubSpot>
          art={hubArt('lobby')}
          w={LOBBY.w}
          h={LOBBY.h}
          label="The Trainer Hub, the Indigo Plateau's Pokémon Center"
          testId="hub-lobby"
          frame="silhouette"
          onChoose={open}
          // The people the map has no room for: the nurse and you from the first day, then whoever the rank, the
          // Badge Case and the Bond have brought.
          sprites={[
            ...(spots.includes('mart') ? [{ src: martArt('clerk'), at: LOBBY_PEOPLE.clerk }] : []),
            { src: hubArt('nurse'), at: LOBBY_PEOPLE.nurse },
            ...(spots.includes('aide') ? [{ src: mapPerson('scientist'), at: LOBBY_PEOPLE.aide }] : []),
            ...leaders.map((g, i) => ({ src: mapPerson(g.sprite), at: LEADER_SPOTS[i]! })),
            ...partners.map(([line], i) => ({ src: compactIconOf(line), at: PARTNER_SPOTS[i]! })),
            { src: hubArt('player'), at: LOBBY_PEOPLE.player },
          ]}
          spots={spots.map((id) => ({
            id,
            semantics: { kind: 'navigation' as const },
            boxes: LOBBY_SPOTS[id],
            label: SPOT_LABEL[id],
            tip: hubSpotTip(id, account.tokens, { parcels: account.parcels, slots: kitSlots(account) }),
            testId: `kiosk-${id}`,
            // A parcel waiting is the one thing the room says without being asked.
            ...(id === 'aide' && account.parcels > 0 ? { label: `${SPOT_LABEL.aide} · ${account.parcels}`, ariaLabel: `${KIOSK_LABEL.aide}, ${account.parcels} parcel${account.parcels === 1 ? '' : 's'} waiting` } : {}),
            // The PC's plate hangs right of it, over open floor, clear of the Trainer Card's counter beside it.
            ...(id === 'pc' ? { plate: 'start' as const } : {}),
          }))}
          exit={{ box: LOBBY_EXIT, label: 'Menu', tip: hubExitTip(), testId: 'hub-exit', onExit: leave }}
        />
      )}
    </main>
  );
}
