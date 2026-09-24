import { useEffect, useState } from 'react';
import { IconWand } from '@tabler/icons-react';
import { CHEATS, type CheatResult } from '@/app/cheats';
import { CHEAT_MENU } from '@/ui/strings';
import { Modal } from './Modal';
import styles from './CheatMenu.module.css';

// The secret playtest menu. Type the code (`rarecandy`) on any screen — not inside a text field — and it opens over
// whatever is there; Escape or Close shuts it. Nothing on any screen points at it: it is for whoever was told.

const CODE = 'rarecandy';

type Entry = { label: string; run: () => CheatResult; testId: string };

/** The status line for what a cheat did — every sentence from the string table. */
function said(r: CheatResult): string {
  if (!r) return CHEAT_MENU.notHere;
  const line = CHEAT_MENU.done[r.say] as (x: typeof r) => string;
  return line(r);
}

const GROUPS: { title: string; entries: Entry[] }[] = [
  {
    title: CHEAT_MENU.travel,
    entries: [
      { label: CHEAT_MENU.pallet, run: () => CHEATS.city(0), testId: 'cheat-pallet' },
      { label: CHEAT_MENU.celadon, run: () => CHEATS.city(1), testId: 'cheat-celadon' },
      { label: CHEAT_MENU.gym, run: () => CHEATS.jump('gym'), testId: 'cheat-gym' },
      { label: CHEAT_MENU.elite, run: () => CHEATS.jump('elite'), testId: 'cheat-elite' },
    ],
  },
  {
    title: CHEAT_MENU.team,
    entries: [
      { label: CHEAT_MENU.heal, run: CHEATS.heal, testId: 'cheat-heal' },
      { label: CHEAT_MENU.trauma, run: CHEATS.clearTrauma, testId: 'cheat-trauma' },
      { label: CHEAT_MENU.level1, run: () => CHEATS.levels(1), testId: 'cheat-level-1' },
      { label: CHEAT_MENU.level5, run: () => CHEATS.levels(5), testId: 'cheat-level-5' },
      { label: CHEAT_MENU.evolve, run: CHEATS.evolve, testId: 'cheat-evolve' },
      { label: CHEAT_MENU.fill, run: CHEATS.fill, testId: 'cheat-fill' },
    ],
  },
  {
    title: CHEAT_MENU.bag,
    entries: [
      { label: CHEAT_MENU.money, run: () => CHEATS.money(1000), testId: 'cheat-money' },
      { label: CHEAT_MENU.balls, run: () => CHEATS.balls(5), testId: 'cheat-balls' },
      { label: CHEAT_MENU.relic, run: CHEATS.relic, testId: 'cheat-relic' },
    ],
  },
  {
    title: CHEAT_MENU.fight,
    entries: [{ label: CHEAT_MENU.win, run: CHEATS.winFight, testId: 'cheat-win' }],
  },
];

export function CheatMenu() {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<string | null>(null);

  // Listened in the capture phase, so the menu hears a key before any screen does. While what has been typed is
  // the start of the code, the key goes no further — the `e` in the code would otherwise end a fight's turn — and
  // while the menu is open no key reaches the screen behind it, Escape included (a City would open its pause menu).
  useEffect(() => {
    let typed = '';
    const onKey = (e: KeyboardEvent) => {
      if (open) {
        if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key === 'Shift') return;
        e.stopPropagation();
        if (e.key === 'Escape') setOpen(false);
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key.length !== 1) return;
      const next = typed + e.key.toLowerCase();
      if (!CODE.startsWith(next)) {
        typed = CODE.startsWith(e.key.toLowerCase()) ? e.key.toLowerCase() : '';
        return;
      }
      e.stopPropagation();
      typed = next;
      if (typed === CODE) {
        typed = '';
        setLine(null);
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (!open) return null;
  return (
    <Modal title={CHEAT_MENU.title} testId="cheat-menu">
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <section key={g.title} className={styles.group}>
            <h3 className={styles.heading}>{g.title}</h3>
            <div className={styles.buttons}>
              {g.entries.map((c) => (
                <button key={c.testId} type="button" className={styles.cheat} onClick={() => setLine(said(c.run()))} data-testid={c.testId}>
                  <IconWand size={16} aria-hidden="true" /> {c.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <footer className={styles.footer}>
        <p className={styles.line} role="status">{line ?? CHEAT_MENU.hint}</p>
        <button type="button" className={styles.close} onClick={() => setOpen(false)} data-testid="cheat-close">
          {CHEAT_MENU.close}
        </button>
      </footer>
    </Modal>
  );
}
