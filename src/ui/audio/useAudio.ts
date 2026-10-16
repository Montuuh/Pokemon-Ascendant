import { useEffect, useRef } from 'react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { useSettingsStore } from '@/app/settingsStore';
import { getContent } from '@/content/registry';
import type { CombatState } from '@/sim';
import { catchTimeline } from '@/ui/hooks/useCombatFx';
import { inTension, trackFor } from './director';
import { music } from './music';
import { playSfx, sfxForEvent } from './sfx';
import { synth } from './synth';

// §9.5 — where the sound meets the app. Three hooks: the first gesture wakes the context and every button ticks; the
// music follows the screen and the run; a fight's new events become its sounds. Nothing here decides anything about
// the game: it reads the stores and plays.

/** The first pointer or key wakes the context (browsers start no sound without one); a button ticks when pressed. */
export function useAudioUnlock(): void {
  const sfx = useSettingsStore((s) => s.sfxVolume);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  useEffect(() => {
    synth.setVolume('sfx', sfx);
    synth.setVolume('music', musicVolume);
  }, [sfx, musicVolume]);
  useEffect(() => {
    const wake = () => synth.unlock();
    const tick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement | null)?.closest('button');
      // A control that plays its own sample (the Effects volume) is not ticked over it.
      if (b && !b.disabled && b.getAttribute('aria-disabled') !== 'true' && b.dataset.sfx !== 'own') playSfx('ui-click');
    };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    window.addEventListener('click', tick);
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('click', tick);
    };
  }, []);
}

/** The music director: follows the screen, the run's zone and the fight's kind. */
export function useMusicDirector(): void {
  const screen = useAppStore((s) => s.screen);
  const run = useRunStore((s) => s.run);
  const combat = useCombatStore((s) => s.state);
  const id = trackFor(screen, run, combat);
  const tension = screen === 'combat' && inTension(combat);
  useEffect(() => {
    music.play(id);
  }, [id]);
  useEffect(() => {
    music.setTension(tension);
  }, [tension]);
}

/**
 * §9.5.3 — a fight's sounds: each new event's, a beat apart so a turn reads in order; a throw's wobbles and its click
 * or burst on the catch animation's own clock.
 */
export function useCombatSfx(state: CombatState | null): void {
  const seen = useRef(0);
  useEffect(() => {
    if (!state) return;
    const fresh = state.events.filter((e) => e.seq >= seen.current);
    seen.current = state.nextSeq;
    if (!fresh.length) return;
    const content = getContent();
    const mine = new Set(state.player.team.map((m) => m.uid));
    const look = { isPlayer: (uid: string) => mine.has(uid), moveType: (id: string) => content.move(id).type };
    let delay = 0;
    for (const e of fresh) {
      if (e.t === 'catch') {
        // The throw, a wobble per check that passed (three at most), then the click or the burst (§2.6.4.4).
        const wobbles = Math.min(3, e.checks);
        const t = catchTimeline(wobbles, e.success);
        playSfx('ball-throw', delay);
        for (let i = 0; i < wobbles; i++) playSfx('ball-shake', delay + (t.wobbleAt + i * t.cycle) / 1000);
        playSfx(e.success ? 'ball-click' : 'ball-break', delay + t.resultAt / 1000);
        delay += t.total / 1000;
        continue;
      }
      const ids = sfxForEvent(e, look);
      for (const id of ids) playSfx(id, delay);
      if (ids.length) delay += 0.08;
    }
  }, [state]);
}
