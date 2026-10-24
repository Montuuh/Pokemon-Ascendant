import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { getContent } from '@/content/registry';
import { maxHpOf, type PartyMon } from '@/sim';
import { nodeBadge, spriteOf, stageBackdrop } from '@/ui/art';
import { PixelSprite } from '@/ui/components/PixelSprite';
import { ShinyMark } from '@/ui/components/ShinyMark';
import { RUN_END_TEXT } from '@/ui/strings';
import { badgeTip, runEndTeamTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './FinalTeam.module.css';

/** §9.12.3 / D1–D4 — remember the whole Box, including a lost run's team; final condition is on demand. */
export function FinalTeam({
  box,
  badges,
  won,
}: {
  box: readonly PartyMon[];
  badges: readonly string[];
  won: boolean;
}) {
  const content = getContent();
  const team = useRef<HTMLUListElement>(null);
  const [cell, setCell] = useState({ width: 144, height: 160 });
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }>>({});
  // One native half-step for the entire lineup: independently fitting each species would enlarge Pikachu
  // to Dragonite's size. Measure the actual cell and the largest active source, including shiny variants.
  useLayoutEffect(() => {
    const el = team.current;
    if (!el) return;
    const measure = () =>
      setCell({
        width: Math.floor(el.firstElementChild?.clientWidth ?? 144),
        height: Number.parseFloat(getComputedStyle(el).getPropertyValue('--sprite-cell-h')),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [box.length]);
  const sources = box.map((mon) => spriteOf(mon, 'front', !!mon.shiny));
  const loaded = sources.flatMap((src) => (dimensions[src] ? [dimensions[src]] : []));
  const scale =
    loaded.length === box.length && loaded.length > 0
      ? Math.max(
          0.5,
          Math.floor(
            Math.min(
              cell.width / Math.max(...loaded.map((d) => d.width)),
              cell.height / Math.max(...loaded.map((d) => d.height)),
            ) * 2,
          ) / 2,
        )
      : 1;
  return (
    <figure className={`${styles.scene} ${won ? styles.won : ''}`} data-testid="run-end-team-scene">
      <img
        className={styles.backdrop}
        src={stageBackdrop(won ? 'league-champion' : 'meadow')}
        alt=""
        draggable={false}
      />
      <figcaption className={`${styles.caption} display`}>{RUN_END_TEXT.team}</figcaption>
      <ul
        ref={team}
        className={styles.team}
        style={{ '--members': box.length } as CSSProperties}
        aria-label={RUN_END_TEXT.team}
      >
        {box.map((mon) => {
          const species = content.species(mon.speciesId);
          const src = spriteOf(mon, 'front', !!mon.shiny);
          const size = dimensions[src];
          return (
            <li key={mon.uid}>
              <Tipped
                as="div"
                className={styles.member}
                tip={runEndTeamTip(species.name, mon.level, mon.hp, maxHpOf(mon, content), mon.traumaStacks)}
                data-testid={`run-end-mon-${mon.uid}`}
                data-species={mon.speciesId}
                data-shiny={mon.shiny || undefined}
              >
                <span className={styles.spriteCell}>
                  <img
                    className={styles.sprite}
                    src={src}
                    alt={species.name}
                    draggable={false}
                    style={size ? { width: size.width * scale, height: size.height * scale } : undefined}
                    onLoad={(event) => {
                      const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                      setDimensions((old) =>
                        old[src]?.width === width && old[src]?.height === height
                          ? old
                          : { ...old, [src]: { width, height } },
                      );
                    }}
                  />
                </span>
                <span className={styles.nameplate}>
                  <span className="display">
                    {species.name}
                    {mon.shiny && <ShinyMark name={species.name} plain owned />}
                  </span>
                  <span className="tabular">Lv {mon.level}</span>
                </span>
              </Tipped>
            </li>
          );
        })}
      </ul>
      {badges.length > 0 && (
        <div className={styles.badges} data-testid="badge-award" aria-label={RUN_END_TEXT.badges}>
          <span className={`${styles.badgeLabel} display`}>{RUN_END_TEXT.badges}</span>
          {badges.map((id) => {
            const badge = content.badge(id);
            return (
              <Tipped
                key={id}
                tip={badgeTip(badge.name, badge.description)}
                className={styles.badge}
                aria-label={badge.name}
                data-testid={`run-end-badge-${id}`}
              >
                <PixelSprite src={nodeBadge(`gym-${badge.type}`)} alt="" width={80} height={80} />
              </Tipped>
            );
          })}
        </div>
      )}
    </figure>
  );
}
