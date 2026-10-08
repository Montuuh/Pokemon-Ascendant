import { useEffect, useRef, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAppStore } from '@/app/store';
import { useAccountStore } from '@/app/accountStore';
import { MAX_LEVEL, levelProgress } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { hubArt, martArt } from '@/ui/art';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { Tipped } from '@/ui/tooltip';
import { hubExitTip, hubSpotTip, tokenTip } from '@/ui/tips';
import { LevelRing } from './hub/LevelRing';
import { TrainerCard } from './hub/TrainerCard';
import { PcTerminal } from './hub/PcTerminal';
import { PokeMart } from './hub/PokeMart';
import { ItemGuide } from './hub/ItemGuide';
import { TokenIcon } from './hub/TokenIcon';
import { LOBBY, LOBBY_EXIT, LOBBY_PEOPLE, LOBBY_SPOTS, type HubSpot } from './hub/lobby';
import styles from './HubScreen.module.css';

// §8.4 — the Trainer Hub as a place (v0.9.2): the Indigo Plateau's Pokémon Center lobby, where a run is meant to end.
// The room is the menu — the Mart's clerk, the nurse who keeps your Trainer Card, the PC, and the door to the Elite
// Four, which is the way into a run; the doormat goes back to the title. A door opens its kiosk over the room, and
// "Lobby" closes it. The level dial and the Token count sit in the header above both, because they are the two
// numbers the whole room is about.

const SPOT_LABEL: Record<HubSpot, string> = { mart: 'Poké Mart', card: 'Trainer Card', pc: 'PC Terminal', guide: 'Item Guide', run: 'New run' };
const KIOSK_LABEL: Record<Exclude<HubSpot, 'run'>, string> = { mart: 'Poké Mart', card: 'Trainer Card', pc: 'PC Terminal', guide: 'Item Guide' };

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
    <main className={styles.root} data-testid="hub-screen" data-kiosk={kiosk ?? 'lobby'}>
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
              <span className={`${styles.statusXpText} tabular`}>{p.level >= MAX_LEVEL ? 'Max' : `${p.span - p.into} XP to Lv ${p.level + 1}`}</span>
              <span className={styles.statusBar} aria-hidden="true"><span className={styles.statusFill} style={{ width: `${Math.round(p.fraction * 100)}%` }} /></span>
            </span>
          </span>
          <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
            <span className={styles.statusPill} aria-label={`${account.tokens} Tokens`}><TokenIcon /> <b className="tabular"><NumberFlow value={account.tokens} animated={animate} /></b></span>
          </Tipped>
        </div>
      </header>

      {kiosk ? (
        <section className={styles.panel} data-testid={`hub-panel-${kiosk}`}>
          {kiosk === 'card' && <TrainerCard />}
          {kiosk === 'pc' && <PcTerminal />}
          {kiosk === 'mart' && <PokeMart />}
          {kiosk === 'guide' && <ItemGuide />}
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
          // The map has nobody in it: the clerk, the nurse and you.
          sprites={[
            { src: martArt('clerk'), at: LOBBY_PEOPLE.clerk },
            { src: hubArt('nurse'), at: LOBBY_PEOPLE.nurse },
            { src: hubArt('player'), at: LOBBY_PEOPLE.player },
          ]}
          spots={(Object.keys(LOBBY_SPOTS) as HubSpot[]).map((id) => ({
            id,
            boxes: LOBBY_SPOTS[id],
            label: SPOT_LABEL[id],
            tip: hubSpotTip(id, account.tokens),
            testId: `kiosk-${id}`,
          }))}
          exit={{ box: LOBBY_EXIT, label: 'Menu', tip: hubExitTip(), testId: 'hub-exit', onExit: leave }}
        />
      )}
    </main>
  );
}
