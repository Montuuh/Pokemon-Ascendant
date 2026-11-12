import { useState } from 'react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { compactIconOf, hubRoom } from '@/ui/art';
import { MonIcon } from '@/ui/components/MonIcon';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { hallRunTip, lobbyPersonTip } from '@/ui/tips';
import { HUB_TEXT, JOURNEY_TEXT } from '@/ui/strings';
import { useTip } from '@/ui/tooltip';
import type { HallEntry } from '@/sim';
import { HALL } from './lobby';
import journey from './Journey.module.css';
import styles from './HallRoom.module.css';

// §8.15 — the Hall of Fame, a room of its own (the user's call, 2026-11-12): the League's Hall as FireRed / LeafGreen
// drew it, up the stairs from the Indigo Plateau's lobby, open from the first run that beat the Champion. The room
// stands one winning team before the machine — the newest until another is picked — and the book of every win is
// beside it. It reads the account's Hall and nothing else.

export function HallRoom() {
  const hall = useAccountStore((s) => s.account.hall);
  const content = getContent();
  const runs = [...hall].reverse();
  const [picked, setPicked] = useState<number | null>(null);
  const shown = runs.find((h) => h.run === picked) ?? runs[0];

  return (
    <div className={styles.hall} data-testid="hall-room" data-run={shown?.run}>
      <div className={styles.stage}>
      <PixelRoom<never>
        art={hubRoom('hall')}
        w={HALL.w}
        h={HALL.h}
        label={HUB_TEXT.hall.room}
        testId="hall-floor"
        frame="silhouette"
        scaleStep={0.5}
        devicePixels
        onChoose={() => undefined}
        spots={[]}
        sprites={(shown?.team ?? []).slice(0, HALL.team.length).map((m, i) => {
          const name = content.hasSpecies(m.speciesId) ? content.species(m.speciesId).name : m.speciesId;
          return { src: compactIconOf(m.speciesId, !!m.shiny), at: HALL.team[i]!, label: HUB_TEXT.hall.mon(name, m.level), tip: lobbyPersonTip(name, `Lv ${m.level}`), testId: `hall-mon-${i}` };
        })}
      />
      </div>
      {runs.length === 0 ? (
        <p className={journey.empty} data-testid="hall-empty">{JOURNEY_TEXT.hall.empty}</p>
      ) : (
        <ol className={`${journey.hall} ${styles.book}`} aria-label={HUB_TEXT.hall.link}>
          {runs.map((h) => <HallRow key={h.run} entry={h} on={h.run === shown?.run} onPick={() => setPicked(h.run)} />)}
        </ol>
      )}
    </div>
  );
}

/** One won run: press it to stand its team in the room. */
function HallRow({ entry: h, on, onPick }: { entry: HallEntry; on: boolean; onPick: () => void }) {
  const tip = useTip(hallRunTip(h.run, h.seed));
  return (
    <li>
      <button type="button" className={`${journey.hallRow} ${styles.row}`} aria-pressed={on} onClick={onPick} data-testid={`hall-${h.run}`} {...tip}>
        <span className={`${journey.hallRun} display tabular`}>{JOURNEY_TEXT.hall.run(h.run)}</span>
        <span className={journey.hallTeam}>
          {h.team.map((m, i) => (
            <span key={i} className={journey.hallMon}>
              <MonIcon speciesId={m.speciesId} size={48} {...(m.shiny ? { shiny: true } : {})} />
              <span className="tabular">Lv {m.level}</span>
            </span>
          ))}
        </span>
        <span className={`${journey.hallFacts} tabular`}>
          <span>{JOURNEY_TEXT.hall.rung(h.rung)}</span>
          <span>{JOURNEY_TEXT.hall.badges(h.badges.length)} · {JOURNEY_TEXT.hall.relics(h.relics.length)}</span>
        </span>
      </button>
    </li>
  );
}
