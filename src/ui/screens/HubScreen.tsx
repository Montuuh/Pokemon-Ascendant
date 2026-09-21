import { useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useAccountStore } from '@/app/accountStore';
import { levelFor, levelProgress } from '@/sim';
import { Tipped } from '@/ui/tooltip';
import { tokenTip, trainerLevelTip } from '@/ui/tips';
import { MAX_LEVEL } from '@/sim';
import { TrainerCard } from './hub/TrainerCard';
import { PcTerminal } from './hub/PcTerminal';
import { PokeMart } from './hub/PokeMart';
import { Daycare } from './hub/Daycare';
import styles from './HubScreen.module.css';

// §8.4 — the Trainer Hub: a Pokémon Centre interior in feel, a row of kiosks in fact.
//
// Four of canon's five kiosks are open from v0.6. The Daycare Lady opens at Trainer Level 3 (§8.4.1) and the
// Mystery Door is post-launch; both stay on the row, dimmed and labelled, because a door you can see is a goal
// and a door you cannot is nothing (§7.7).

type Kiosk = 'card' | 'pc' | 'mart' | 'daycare' | 'door';

export function HubScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const account = useAccountStore((s) => s.account);
  const acknowledge = useAccountStore((s) => s.acknowledge);
  const [kiosk, setKiosk] = useState<Kiosk>('card');
  const level = levelFor(account.xp);
  const p = levelProgress(account.xp);

  const KIOSKS: { id: Kiosk; name: string; blurb: string; open: boolean; needs?: string }[] = [
    { id: 'card', name: 'Trainer Card', blurb: 'Level, Tokens, the reward track.', open: true },
    { id: 'pc', name: 'PC Terminal', blurb: 'Pokédex and medals.', open: true },
    { id: 'mart', name: 'Poké Mart', blurb: 'Spend Tokens on Tier-3 relics.', open: true },
    { id: 'daycare', name: 'Daycare Lady', blurb: 'Starters and run options.', open: level >= 3, needs: `Opens at Trainer Level 3 — you are ${level}` },
    { id: 'door', name: 'Mystery Door', blurb: 'Daily seeds, leaderboards, Ascension.', open: false, needs: 'Post-launch' },
  ];

  return (
    <main className={styles.root} data-testid="hub-screen">
      <header className={styles.chrome}>
        <button type="button" className={styles.back} onClick={() => { acknowledge(); goTo('menu'); }} data-testid="btn-hub-back">
          <IconArrowLeft size={18} /> Menu
        </button>
        <h1 className={`${styles.title} display`}>Trainer Hub</h1>
        <span className={styles.status}>
          <Tipped tip={trainerLevelTip(p.level, p.into, p.span, MAX_LEVEL)}>
            <span className={styles.statusPill} data-testid="hub-level">Lv <b className="tabular">{level}</b></span>
          </Tipped>
          <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
            <span className={styles.statusPill} data-testid="hub-tokens"><span aria-hidden="true">🎟</span> <b className="tabular">{account.tokens}</b></span>
          </Tipped>
        </span>
      </header>

      <nav className={styles.kiosks} aria-label="Kiosks">
        {KIOSKS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`${styles.kiosk} ${kiosk === k.id ? styles.kioskOn : ''}`}
            onClick={() => k.open && setKiosk(k.id)}
            disabled={!k.open}
            data-testid={`kiosk-${k.id}`}
            aria-pressed={kiosk === k.id}
          >
            <span className={`${styles.kioskName} display`}>{k.name}</span>
            <span className={styles.kioskBlurb}>{k.open ? k.blurb : k.needs}</span>
          </button>
        ))}
      </nav>

      <section className={styles.panel} data-testid={`hub-panel-${kiosk}`}>
        {kiosk === 'card' && <TrainerCard />}
        {kiosk === 'pc' && <PcTerminal />}
        {kiosk === 'mart' && <PokeMart />}
        {kiosk === 'daycare' && <Daycare />}
      </section>
    </main>
  );
}
