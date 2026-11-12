import { useEffect, useRef } from 'react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { useSettingsStore } from '@/app/settingsStore';
import { getContent } from '@/content/registry';
import { POKEMON_TYPES, PRIMARY_STATUSES, type CombatState } from '@/sim';
import { catchTimeline, FX_MS, type CatchFx } from '@/ui/hooks/useCombatFx';
import { inTension, trackFor, tracksAhead } from './director';
import { music } from './music';
import { playSfx, sfxForEvent, sfxIds, warmSfx, type SfxId } from './sfx';
import { synth } from './synth';

// §9.5 — where the sound meets the app. Three hooks: the first gesture wakes the context and every button ticks; the
// music follows the screen and the run; a fight's new events become its sounds. Nothing here decides anything about
// the game: it reads the stores and plays.

/** What a button says when it names its own sound in `data-sfx`: nothing (`own`, `none`), or one of these. */
const BUTTON_SFX: Record<string, SfxId | null> = { own: null, none: null, select: 'ui-select', back: 'ui-back', purchase: 'purchase', save: 'save' };
/** The words in a button's test id that say it goes back, and the ones that say it goes on. */
const BACK_WORDS = new Set(['back', 'close', 'cancel', 'stay', 'later', 'decline', 'prev', 'exit', 'retreat']);
const SELECT_WORDS = new Set(['confirm', 'continue', 'claim', 'depart', 'enter', 'start', 'resume', 'take', 'next', 'evolve', 'fight']);

/**
 * §9.5.3 — the sound a pressed button makes, read in one place for the whole game: what it asks for in `data-sfx`,
 * else what its test id says it does — the save, a purchase at a shop slot, a step back, a confirm — else the tick.
 * Pure. Null is silence (a control that plays its own sound).
 */
export function buttonSfx(dataSfx: string | undefined, testId: string | undefined): SfxId | null {
  if (dataSfx !== undefined && dataSfx in BUTTON_SFX) return BUTTON_SFX[dataSfx]!;
  if (testId) {
    if (testId === 'btn-save-quit') return 'save';
    if (testId.startsWith('shop-slot-')) return 'purchase';
    const words = testId.split('-');
    if (words.some((w) => BACK_WORDS.has(w))) return 'ui-back';
    if (words.some((w) => SELECT_WORDS.has(w))) return 'ui-select';
  }
  return 'ui-click';
}

/** The first pointer or key wakes the context (browsers start no sound without one); a button ticks when pressed. */
export function useAudioUnlock(): void {
  const sfx = useSettingsStore((s) => s.sfxVolume);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  useEffect(() => {
    synth.setVolume('sfx', sfx);
    synth.setVolume('music', musicVolume);
  }, [sfx, musicVolume]);
  useEffect(() => {
    let warmed = false;
    const wake = () => {
      synth.unlock();
      if (warmed) return;
      warmed = true;
      warmSfx(sfxIds(POKEMON_TYPES, [...PRIMARY_STATUSES, 'confusion']));
    };
    const tick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement | null)?.closest('button');
      if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
      // A control that plays its own sample (the Effects volume) is not ticked over it.
      const id = buttonSfx(b.dataset.sfx, b.dataset.testid);
      if (id) playSfx(id);
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
  const ahead = tracksAhead(screen, run, combat).join(' ');
  useEffect(() => {
    music.play(id);
  }, [id]);
  useEffect(() => {
    if (ahead) music.prewarm(ahead.split(' ') as Parameters<typeof music.prewarm>[0]);
  }, [ahead]);
  useEffect(() => {
    music.setTension(tension);
    // §9.5.2 — the alarm, once, as the team drops under the line; the stem carries it from there.
    if (tension) playSfx('low-hp');
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
