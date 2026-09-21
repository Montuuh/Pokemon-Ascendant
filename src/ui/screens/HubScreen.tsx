import { useState } from 'react';
import { IconArrowLeft, IconBook2, IconBuildingStore, IconDoor, IconEgg, IconId } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAppStore } from '@/app/store';
import { useAccountStore } from '@/app/accountStore';
import { levelFor, levelProgress } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Tipped } from '@/ui/tooltip';
import { tokenTip } from '@/ui/tips';
import { LevelRing } from './hub/LevelRing';
import { TrainerCard } from './hub/TrainerCard';
import { PcTerminal } from './hub/PcTerminal';
import { PokeMart } from './hub/PokeMart';
import { Daycare } from './hub/Daycare';
import { TokenIcon } from './hub/TokenIcon';
import styles from './HubScreen.module.css';

// §8.4 — the Trainer Hub: a Pokémon Centre interior in feel, a row of kiosks in fact.
//
// The level dial and the Token count sit in the header, above every kiosk, because they are the two numbers
// the whole room is about and a player should never have to find them. Four of canon's five kiosks are open;
// the Daycare Lady opens at Trainer Level 3 (§8.4.1) and the Mystery Door is post-launch — both stay on the
// row, dimmed and labelled, because a door you can see is a goal and a door you cannot is nothing (§7.7).

type Kiosk = 'card' | 'pc' | 'mart' | 'daycare' | 'door';

export function HubScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const account = useAccountStore((s) => s.account);
  const acknowledge = useAccountStore((s) => s.acknowledge);
  const animate = useMotionPref();
  const [kiosk, setKiosk] = useState<Kiosk>('card');
  const level = levelFor(account.xp);
  const p = levelProgress(account.xp);

  const KIOSKS: { id: Kiosk; name: string; blurb: string; icon: React.ReactNode; open: boolean; needs?: string }[] = [
    { id: 'card', name: 'Trainer Card', blurb: 'Your level, the road ahead, the record.', icon: <IconId size={22} />, open: true },
    { id: 'pc', name: 'PC Terminal', blurb: 'Pokédex, medals, discoveries.', icon: <IconBook2 size={22} />, open: true },
    { id: 'mart', name: 'Poké Mart', blurb: 'Spend Tokens: starters, upgrades, relics, cosmetics.', icon: <IconBuildingStore size={22} />, open: true },
    { id: 'daycare', name: 'Daycare Lady', blurb: 'Starters and run options.', icon: <IconEgg size={22} />, open: level >= 3, needs: `Opens at Level 3 — you are ${level}` },
    { id: 'door', name: 'Mystery Door', blurb: 'Daily seeds, leaderboards, Ascension.', icon: <IconDoor size={22} />, open: false, needs: 'Post-launch' },
  ];

  return (
    <main className={styles.root} data-testid="hub-screen">
      <header className={styles.chrome}>
        <button type="button" className={styles.back} onClick={() => { acknowledge(); goTo('menu'); }} data-testid="btn-hub-back">
          <IconArrowLeft size={18} /> Menu
        </button>
        <h1 className={`${styles.title} display`}>Trainer Hub</h1>
        <div className={styles.status}>
          <span className={styles.statusRing} data-testid="hub-level" data-level={level}>
            <LevelRing xp={account.xp} size={56} />
            <span className={styles.statusXp}>
              <span className={`${styles.statusXpText} tabular`}>{p.level >= 30 ? 'Max' : `${p.span - p.into} XP to Lv ${p.level + 1}`}</span>
              <span className={styles.statusBar} aria-hidden="true"><span className={styles.statusFill} style={{ width: `${Math.round(p.fraction * 100)}%` }} /></span>
            </span>
          </span>
          <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
            <span className={styles.statusPill} data-testid="hub-tokens"><TokenIcon /> <b className="tabular"><NumberFlow value={account.tokens} animated={animate} /></b></span>
          </Tipped>
        </div>
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
            <span className={styles.kioskIcon} aria-hidden="true">{k.icon}</span>
            <span className={styles.kioskText}>
              <span className={`${styles.kioskName} display`}>{k.name}</span>
              <span className={styles.kioskBlurb}>{k.open ? k.blurb : k.needs}</span>
            </span>
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
