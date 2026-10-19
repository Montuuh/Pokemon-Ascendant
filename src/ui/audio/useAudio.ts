import { useEffect, useRef } from 'react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { useSettingsStore } from '@/app/settingsStore';
import { getContent } from '@/content/registry';
import type { CombatState } from '@/sim';
import { catchTimeline, FX_MS, type CatchFx } from '@/ui/hooks/useCombatFx';
import { inTension, trackFor } from './director';
import { music } from './music';
import { playSfx, sfxForEvent, type SfxId } from './sfx';
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

/** §2.6.4.4 — where in the drop (`catchDrop`'s keyframes) the ball first touches the ground; it bounces once after. */
const CATCH_TOUCH = 0.65;

/**
 * §9.5.3 / §2.6.4.4 — a throw's sounds, each at its beat of the catch animation (`catchTimeline`, the keyframes' own
 * clock), in ms from the throw: the throw, the ball opening on the Pokémon, the ground and its bounce, each rock of each
 * wobble (after the still moment that opens its cycle), and the click — or the burst. Pure.
 */
export function catchSounds(wobbles: number, success: boolean): [SfxId, number][] {
  const t = catchTimeline(wobbles, success);
  const out: [SfxId, number][] = [
    ['ball-throw', 0],
    ['ball-open', t.absorbAt],
    ['ball-land', t.dropAt + FX_MS.drop * CATCH_TOUCH],
  ];
  for (let i = 0; i < wobbles; i++) out.push(['ball-shake', t.wobbleAt + i * t.cycle + FX_MS.pause]);
  out.push([success ? 'ball-click' : 'ball-break', t.resultAt]);
  return out;
}

/** §9.5.3 — the catch, heard as it is drawn: started when the ball leaves the hand on screen. */
export function useCatchSfx(c: CatchFx | null): void {
  const id = c?.id ?? null;
  useEffect(() => {
    if (!c) return;
    for (const [sfx, at] of catchSounds(c.wobbles, c.success)) playSfx(sfx, at / 1000);
    // Keyed on the throw itself: a re-render mid-throw must not throw it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}

/**
 * §9.5.3 — a fight's sounds: each new event's, a beat apart so a turn reads in order. A throw is heard on the catch
 * animation's clock (`useCatchSfx`); with no animation, its result at once.
 */
export function useCombatSfx(state: CombatState | null, animate = true): void {
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
        // The ball's own sounds play with the ball (`useCatchSfx`); what follows waits for it to finish.
        if (!animate) {
          playSfx(e.success ? 'ball-click' : 'ball-break', delay);
          delay += 0.3;
        } else delay += catchTimeline(Math.min(3, e.checks), e.success).total / 1000;
        continue;
      }
      const ids = sfxForEvent(e, look);
      for (const id of ids) playSfx(id, delay);
      if (ids.length) delay += 0.08;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
