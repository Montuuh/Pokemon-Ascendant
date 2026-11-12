import { forwardRef } from 'react';
import { gymById, type HabitatSection, type RunState } from '@/sim';
import { habitatProp } from '@/ui/art';
import { HABITAT_TEXT } from '@/ui/strings';
import { habitatRowTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { TypeLabel } from './TypeBadge';
import styles from './HabitatLegend.module.css';

// §2.6.1 (v0.9.120) — the map's legend of habitats: for the trunk and each Gym's lane, which habitats its Wild Areas
// still ahead are, how many, and which types they lean on. It is a column beside the board, never over it, so no node
// ahead is covered. Hovering or focusing a row marks those nodes on the board; pressing it brings the nearest into view;
// its bubble opens above the row, inside the column, off the nodes it marks. It is not on the route, so nothing but the
// stops draws the eye there (the user's rule for the map). Every fact is the sim's (`routeHabitats`).

interface Props {
  run: RunState;
  sections: HabitatSection[];
  onMark: (nodeIds: readonly string[]) => void;
  onGo: (nodeId: string) => void;
}

export const HabitatLegend = forwardRef<HTMLElement, Props>(function HabitatLegend({ run, sections, onMark, onGo }, ref) {
  return (
    <aside ref={ref} className={styles.panel} aria-label={HABITAT_TEXT.title} data-testid="habitat-legend">
      <h2 className={`${styles.title} display`}>{HABITAT_TEXT.title}</h2>
      {sections.length === 0 && <p className={styles.empty}>{HABITAT_TEXT.none}</p>}
      {sections.map((s) => {
        const gym = s.lane === null ? null : run.map.gyms[s.lane] ? gymById(run.map.gyms[s.lane]!) : null;
        const stretch = s.lane === null ? 'trunk' : `lane-${s.lane}`;
        return (
          <section key={stretch} className={styles.section} data-lane={s.lane ?? 'trunk'} data-testid="habitat-section">
            <h3 className={styles.head}>
              {gym && <TypeLabel type={gym.type} size={12} />}
              {gym ? HABITAT_TEXT.lane(gym.name.replace(/^Leader /, '')) : HABITAT_TEXT.trunk}
            </h3>
            <ul className={styles.rows}>
              {s.habitats.map((h) => (
                <li key={h.biome}>
                  <Tipped
                    as="button"
                    tip={habitatRowTip(h)}
                    className={styles.row}
                    onClick={() => onGo(h.nodes[0]!)}
                    onMouseEnter={() => onMark(h.nodes)}
                    onMouseLeave={() => onMark([])}
                    onFocus={() => onMark(h.nodes)}
                    onBlur={() => onMark([])}
                    data-testid={`habitat-row-${stretch}-${h.biome}`}
                  >
                    <span className={styles.thumb}>
                      <img src={habitatProp(h.biome)} alt="" draggable={false} />
                    </span>
                    <span className={styles.name}>{h.name}</span>
                    <span className={`${styles.count} tabular`}>×{h.nodes.length}</span>
                    <span className={styles.lean}>
                      {h.lean.map((t) => (
                        <TypeLabel key={t} type={t} size={12} />
                      ))}
                    </span>
                  </Tipped>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </aside>
  );
});
