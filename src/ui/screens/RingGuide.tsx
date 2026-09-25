import { useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconHeartPlus, IconSparkles } from '@tabler/icons-react';
import type { RingState } from '@/sim';
import { trainerSprite } from '@/ui/art';
import { HpBar } from '@/ui/components/HpBar';
import { Modal } from '@/ui/components/Modal';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money } from '@/ui/components/Money';
import { RING_GUIDE } from '@/ui/strings';
import styles from './RingGuide.module.css';

// §2.9.4.1 — the Ring's How to play: five short pages, one idea each, in the order a first climb meets them. Every
// picture is this visit's own ladder — its rungs and prizes, its first rival and team, your own Box — so the guide
// cannot teach a number the Ring does not play. It opens by itself on a browser's first walk into a Ring, and from
// the How to play button after that.

const PAGES = ['ladder', 'rival', 'wounds', 'bank', 'medics'] as const;
type Page = (typeof PAGES)[number];

function Picture({ page, ring, team, rare }: { page: Page; ring: RingState; team: readonly string[]; rare: boolean }) {
  if (page === 'ladder') {
    return (
      <ol className={styles.ladder} aria-hidden="true">
        {[...ring.rungs].map((rung, i) => ({ rung, i })).reverse().map(({ rung, i }) => (
          <li key={i} className={styles.rung}>
            <span className={styles.rungMark}>{i + 1}</span>
            {'money' in rung.prize ? <Money amount={rung.prize.money} size={18} /> : <><IconSparkles size={18} /> {RING_GUIDE.relic(rare)}</>}
          </li>
        ))}
      </ol>
    );
  }
  if (page === 'rival') {
    const rival = ring.rungs[0]!;
    return (
      <div className={styles.rival} aria-hidden="true">
        <img className={styles.sprite} src={trainerSprite(rival.sprite)} alt="" width={96} height={96} />
        <span className={styles.team}>{rival.team.map((m, k) => <MonIcon key={`${m.species}-${k}`} speciesId={m.species} size={48} />)}</span>
      </div>
    );
  }
  if (page === 'wounds') {
    // The same team, rung to rung: what the last fight left is what the next one gets.
    return (
      <div className={styles.bars} aria-hidden="true">
        {team.slice(0, 3).map((id, k) => (
          <span key={`${id}-${k}`} className={styles.barRow}>
            <MonIcon speciesId={id} size={40} />
            <span className={styles.bar}><HpBar hp={[35, 12, 0][k]!} maxHp={100} height={10} /></span>
          </span>
        ))}
      </div>
    );
  }
  if (page === 'bank') {
    const money = ring.rungs.find((r) => 'money' in r.prize)?.prize;
    return (
      <div className={styles.chips} aria-hidden="true">
        <span className={styles.chip}>{money && 'money' in money ? <Money amount={money.money} size={28} /> : null}</span>
        <span className={styles.chip}><IconSparkles size={28} /></span>
      </div>
    );
  }
  return (
    <div className={styles.bars} aria-hidden="true">
      {team.slice(0, 3).map((id, k) => (
        <span key={`${id}-${k}`} className={styles.barRow}>
          <MonIcon speciesId={id} size={40} />
          <span className={styles.bar}><HpBar hp={100} maxHp={100} height={10} /></span>
          <IconHeartPlus size={20} className={styles.heart} />
        </span>
      ))}
    </div>
  );
}

export function RingGuide({ name, ring, team, rare, onClose }: { name: string; ring: RingState; team: readonly string[]; rare: boolean; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const last = PAGES.length - 1;
  const numbers = { name, rungs: ring.rungs.length, fee: ring.fee, top: RING_GUIDE.top(rare) };
  const words = RING_GUIDE.pages[page]!;

  return (
    <Modal title={RING_GUIDE.title(name)} testId="ring-guide" size="reading" onDismiss={onClose}>
      <div className={styles.page} data-testid={`ring-guide-page-${page}`}>
        <div className={styles.picture}>
          <Picture page={PAGES[page]!} ring={ring} team={team} rare={rare} />
        </div>
        <div className={styles.words}>
          <h3 className={`${styles.heading} display`}>{words.title}</h3>
          <p className={styles.body}>{words.body(numbers)}</p>
        </div>
      </div>
      {/* Next comes first in the DOM, so it is what the dialog focuses: Enter walks through the guide. */}
      <div className={styles.nav}>
        <button type="button" className={styles.primary} onClick={() => (page === last ? onClose() : setPage(page + 1))} data-testid="btn-ring-guide-next">
          {page === last ? <><IconCheck size={16} aria-hidden="true" /> {RING_GUIDE.done}</> : <>{RING_GUIDE.next} <IconArrowRight size={16} aria-hidden="true" /></>}
        </button>
        {page > 0 && (
          <button type="button" className={styles.secondary} onClick={() => setPage(page - 1)} data-testid="btn-ring-guide-prev">
            <IconArrowLeft size={16} aria-hidden="true" /> {RING_GUIDE.back}
          </button>
        )}
        {page < last && (
          <button type="button" className={styles.skip} onClick={onClose} data-testid="btn-ring-guide-skip">
            {RING_GUIDE.skip}
          </button>
        )}
        <ol className={styles.dots} aria-label={RING_GUIDE.pagesLabel}>
          {RING_GUIDE.pages.map((q, i) => (
            <li key={q.title}>
              <button type="button" className={`${styles.dot} ${i === page ? styles.dotOn : ''}`} aria-label={q.title} aria-current={i === page ? 'step' : undefined} onClick={() => setPage(i)} />
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  );
}
