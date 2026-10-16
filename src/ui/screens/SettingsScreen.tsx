import { IconArrowLeft } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { TEXT_SCALES, useSettingsStore, VOLUMES, type MotionMode, type TextScale, type Volume } from '@/app/settingsStore';
import { playSfx } from '@/ui/audio/sfx';
import { SOUND_TEXT } from '@/ui/strings';
import { soundTip } from '@/ui/tips';
import { InfoDot, Tip } from '@/ui/tooltip';
import styles from './SettingsScreen.module.css';

// §9.6 — the settings screen. Two rows, both accessibility, both scheduled for v0.5 by name.
//
// Each option says what it does in the player's terms rather than in the setting's terms: "Larger" beats
// "125 %" for the person who needs it and the percentage is there for the person who wants it.

const MOTION_OPTIONS: { id: MotionMode; label: string; note: string }[] = [
  { id: 'system', label: 'Match my system', note: 'Follows the reduced-motion setting on this device.' },
  { id: 'reduced', label: 'Reduce motion', note: 'No shakes, lunges or pulses. One-shot effects still finish.' },
  { id: 'full', label: 'Full motion', note: 'Everything animates, even if this device asks for less.' },
];

const SCALE_LABEL: Record<TextScale, string> = { 0.8: 'Compact', 1: 'Normal', 1.25: 'Large', 1.5: 'Largest' };
const VOLUME_ROWS = [
  { key: 'musicVolume', label: SOUND_TEXT.music, id: 'music' },
  { key: 'sfxVolume', label: SOUND_TEXT.effects, id: 'sfx' },
] as const;

export function SettingsScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const textScale = useSettingsStore((s) => s.textScale);
  const motion = useSettingsStore((s) => s.motion);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const volumes = { musicVolume, sfxVolume };
  const setSetting = useSettingsStore((s) => s.set);
  const reset = useSettingsStore((s) => s.reset);

  return (
    <main className={styles.root} data-testid="settings-screen">
      <header className={styles.chrome}>
        <button type="button" className={styles.back} onClick={() => goTo('menu')} data-testid="btn-settings-back">
          <IconArrowLeft size={18} /> Menu
        </button>
        <h1 className={`${styles.title} display`}>Settings</h1>
        <button type="button" className={styles.reset} onClick={reset} data-testid="btn-settings-reset">
          Reset
        </button>
      </header>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>
          Text size
          <InfoDot tip={<Tip title="Text size" body="Every screen is built to hold together at the largest setting. If something clips at 150 %, that is a bug worth reporting." />} />
        </h2>
        <div className={styles.options} role="group" aria-label="Text size">
          {TEXT_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              className={`${styles.option} ${textScale === scale ? styles.on : ''}`}
              onClick={() => setSetting({ textScale: scale })}
              aria-pressed={textScale === scale}
              data-testid={`text-scale-${Math.round(scale * 100)}`}
            >
              <span className={`${styles.optionLabel} display`}>{SCALE_LABEL[scale]}</span>
              <span className={`${styles.optionNote} tabular`}>{Math.round(scale * 100)} %</span>
            </button>
          ))}
        </div>
      </section>

      {/* What the text size looks like, beside the control it previews. */}
      <p className={styles.sample} data-testid="settings-sample">
        A Pidgey appeared! Gust is coming for your Lead — 6 damage, and it will not be the last.
      </p>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Motion</h2>
        <div className={styles.options} role="group" aria-label="Motion">
          {MOTION_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`${styles.option} ${motion === o.id ? styles.on : ''}`}
              onClick={() => setSetting({ motion: o.id })}
              aria-pressed={motion === o.id}
              data-testid={`motion-${o.id}`}
            >
              <span className={`${styles.optionLabel} display`}>{o.label}</span>
              <span className={styles.optionNote}>{o.note}</span>
            </button>
          ))}
        </div>
      </section>

      {/* §9.5 — the music and the effects, each in four steps; an effects step plays a sample of itself. */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>
          {SOUND_TEXT.title}
          <InfoDot tip={soundTip()} />
        </h2>
        {VOLUME_ROWS.map((row) => (
          <div key={row.key} className={styles.volumeRow} role="group" aria-label={row.label}>
            <span className={styles.rowLabel}>{row.label}</span>
            {VOLUMES.map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.option} ${volumes[row.key] === v ? styles.on : ''}`}
                onClick={() => {
                  setSetting({ [row.key]: v } as { sfxVolume: Volume } | { musicVolume: Volume });
                  if (row.key === 'sfxVolume') playSfx('ui-click', 0.12);
                }}
                aria-pressed={volumes[row.key] === v}
                data-testid={`volume-${row.id}-${Math.round(v * 100)}`}
                data-sfx={row.key === 'sfxVolume' ? 'own' : undefined}
              >
                <span className={`${styles.optionLabel} display`}>{SOUND_TEXT.level[v]}</span>
              </button>
            ))}
          </div>
        ))}
      </section>

    </main>
  );
}
