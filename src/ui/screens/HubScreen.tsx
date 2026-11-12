import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconMapPin } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { useAppStore } from '@/app/store';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { ALL_GYMS, BOND_TIER, MAX_LEVEL, bondRank, hubFeatureKey, hubPlaceKey, hubState, kitSlots, levelProgress, rankRow, speciesOwned, type HubFeatureState } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { compactIconOf, hubLock, hubProp, hubRoom, mapPerson } from '@/ui/art';
import { playSfx } from '@/ui/audio/sfx';
import { PixelRoom, type RoomSprite } from '@/ui/components/PixelRoom';
import { Tipped } from '@/ui/tooltip';
import { hubExitTip, hubLockedTip, hubPlaceTip, hubPropTip, hubSpotTip, lobbyPersonTip, tokenTip } from '@/ui/tips';
import { HUB_TEXT, JOURNEY_TEXT } from '@/ui/strings';
import { LevelRing } from './hub/LevelRing';
import { TrainerCard } from './hub/TrainerCard';
import { PcTerminal } from './hub/PcTerminal';
import { PokeMart } from './hub/PokeMart';
import { ItemGuide } from './hub/ItemGuide';
import { OakAide } from './hub/OakAide';
import { TrainerKit } from './hub/TrainerKit';
import { HallRoom } from './hub/HallRoom';
import { TokenIcon } from './hub/TokenIcon';
import { BADGE_CELL, BADGE_PIPS, HUB_PROPS, PLACES, SPOT_ORDER, type HubProp, type HubSpot } from './hub/lobby';
import styles from './HubScreen.module.css';

// §8.4 — the Trainer Hub, the Road to the Plateau: a different place as the career advances — the room a trainer
// leaves, Professor Oak's Lab, Viridian City's Pokémon Center, the Indigo Plateau — each the real FRLG room, and the
// room is the menu. A door opens its kiosk over the room and "Lobby" closes it; the rank dial, the place and the Token
// count sit in the header above both.
//
// §8.4.6 — what the account has not earned stands in the room as a silhouette that names what earns it and opens
// nothing. What it has just earned arrives once: a move fades the new room in from black, as the games warp, and is
// announced in the game's own text box; a new feature's silhouette lifts off it and its plate pulses, and the keyboard
// lands on it. Every Leader beaten comes to stand in
// the room (§8.14) and a Partner line walks it (§6.8.2). Which place, which features and what is new are the sim's
// (`hubState`); this file only draws them.

type Kiosk = Exclude<HubSpot, 'run'>;
const KIOSK_LABEL: Record<Kiosk, string> = { ...HUB_TEXT.feature, aide: JOURNEY_TEXT.aide };
/** How long the arrival box stays if nothing dismisses it. */
const ARRIVAL_MS = 3200;
const ARRIVE_SFX = 'hub-arrive';
const UNLOCK_SFX = 'hub-unlock';

export function HubScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const account = useAccountStore((s) => s.account);
  const acknowledge = useAccountStore((s) => s.acknowledge);
  const seeHub = useAccountStore((s) => s.seeHub);
  const animate = useMotionPref();
  const [kiosk, setKiosk] = useState<Kiosk | null>(null);
  // Focus follows the door: into the kiosk's Lobby button when one opens, back to the spot that opened it when it
  // closes (D8), so the keyboard never lands on the page's body.
  const lobbyButton = useRef<HTMLButtonElement>(null);
  const opened = useRef<HubSpot | null>(null);
  useEffect(() => {
    if (kiosk) {
      opened.current = kiosk;
      lobbyButton.current?.focus();
    } else if (opened.current) {
      document.querySelector<HTMLElement>(`[data-testid="kiosk-${opened.current}"]`)?.focus();
    }
  }, [kiosk]);
  // Escape closes an open kiosk — unless something inside it (a Pokédex sheet) has already answered the key.
  useEffect(() => {
    if (!kiosk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setKiosk(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kiosk]);

  const p = levelProgress(account.xp);
  const content = getContent();
  const hub = hubState(account);
  const room = PLACES[hub.place];

  // §8.4.6 — what has arrived since the player last looked. The account forgets it the moment it is shown (so a
  // reload never plays it twice); the screen keeps it for as long as it is open, so the beat can finish.
  const [arrived, setArrived] = useState<readonly string[]>([]);
  const fresh = hub.fresh.some((key) => !arrived.includes(key)) ? [...new Set([...arrived, ...hub.fresh])] : arrived;
  // Kept while rendering, before the account is told: the render after `seeHub` no longer sees them as fresh.
  if (fresh !== arrived) setArrived(fresh);
  const freshKey = hub.fresh.join(' ');
  useLayoutEffect(() => {
    if (freshKey) seeHub();
  }, [freshKey, seeHub]);
  // A move is the road's big beat: the room fades in from black, the box names it, and what the move brought lifts
  // and pulses once the room is there. Any key or press ends the fade and the box together.
  const moved = fresh.includes(hubPlaceKey(hub.place));
  const isFresh = (f: HubFeatureState) => f.unlocked && fresh.includes(hubFeatureKey(f.id, f.tier));
  const [announced, setAnnounced] = useState<string | null>(null);
  const arrival = moved && announced !== hub.place ? HUB_TEXT.arrive[hub.place] : '';
  useEffect(() => {
    if (!arrival) return;
    playSfx(ARRIVE_SFX);
    const done = () => setAnnounced(hub.place);
    const timer = window.setTimeout(done, ARRIVAL_MS);
    // Skippable: any key or press ends it, and still does what it was pressed for.
    window.addEventListener('keydown', done, { once: true });
    window.addEventListener('pointerdown', done, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', done);
      window.removeEventListener('pointerdown', done);
    };
  }, [arrival, hub.place]);
  // The keyboard lands on the first door that has just arrived.
  const firstFresh = hub.features.find((f) => isFresh(f) && SPOT_ORDER.includes(f.id as HubSpot))?.id;
  useEffect(() => {
    if (!firstFresh || kiosk) return;
    if (!moved) playSfx(UNLOCK_SFX);
    document.querySelector<HTMLElement>(`[data-testid="kiosk-${firstFresh}"]`)?.focus();
    // Once per arrival, not per kiosk closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstFresh]);

  const leaders = account.badges.flatMap((badge) => ALL_GYMS.filter((g) => g.badgeId === badge).slice(0, 1)).slice(0, room.leaders.length);
  const partners = Object.entries(account.bond)
    .filter(([line, pts]) => bondRank(pts) >= BOND_TIER.partner && content.hasSpecies(line))
    .sort((a, b) => b[1] - a[1])
    .slice(0, room.partners.length);
  const leave = () => {
    acknowledge();
    goTo('menu');
  };
  const open = (spot: HubSpot) => {
    if (spot === 'run') {
      acknowledge();
      goTo('starter');
    } else setKiosk(spot);
  };

  const featureOf = (id: string) => hub.features.find((f) => f.id === id);
  const doors = SPOT_ORDER.flatMap((id) => {
    const f = featureOf(id);
    return f?.unlocked && room.features[id] ? [f] : [];
  });
  const propFact = (id: HubProp, tier: number): string => {
    switch (id) {
      case 'badges': return HUB_TEXT.prop.badges(account.badges.length, content.allBadges().length);
      case 'trophies': return HUB_TEXT.prop.trophies(tier);
      case 'dex': return HUB_TEXT.prop.dex(speciesOwned(account));
      case 'banner': return HUB_TEXT.prop.banner(rankRow(p.level).name);
      case 'ladder': return HUB_TEXT.prop.ladder(account.ladder);
    }
  };
  // What is drawn over the room, back to front: silhouettes and the career's props, then the people.
  const sprites: RoomSprite[] = [];
  for (const f of hub.features) {
    const at = room.features[f.id];
    if (!at) continue;
    const name = HUB_TEXT.feature[f.id];
    const prop = (HUB_PROPS as readonly string[]).includes(f.id) ? (f.id as HubProp) : null;
    const lockAt = at.lock ?? at.boxes[0]!;
    const lockArt = hubLock(hub.place, f.id);
    // A door this place cannot hold locked has no silhouette drawn for it.
    if (!prop && !at.lock) continue;
    if (!f.unlocked) {
      const need = HUB_TEXT.need(f.need);
      sprites.push({ src: lockArt, at: lockAt, state: 'locked', testId: `locked-${f.id}`, label: HUB_TEXT.lockedLabel(name, need), tip: hubLockedTip(name, need) });
      continue;
    }
    if (prop) sprites.push({
      src: hubProp(f.tier > 1 ? `${prop}-${f.tier}` : prop), at: at.boxes[0]!, testId: `prop-${prop}`, label: name, tip: hubPropTip(name, propFact(prop, f.tier)),
      // §8.14 — the Badge Case holds what the account has won: a Badge in its own socket, the rest empty.
      ...(prop === 'badges' ? { over: account.badges.flatMap((id) => (BADGE_PIPS[id] ? [{ src: hubProp(`pip-${id}`), at: BADGE_PIPS[id], cell: BADGE_CELL, testId: `pip-${id}` }] : [])) } : {}),
      ...(isFresh(f) ? { state: 'fresh' as const } : {}),
    });
    // A door just earned: its silhouette lifts off it, once.
    else if (isFresh(f)) sprites.push({ src: lockArt, at: lockAt, state: 'lifting', testId: `lifting-${f.id}` });
  }
  sprites.push(
    ...leaders.map((g, i) => ({ src: mapPerson(g.sprite), at: room.leaders[i]!, label: g.name, tip: lobbyPersonTip(g.name, JOURNEY_TEXT.lobby.leader(content.badge(g.badgeId).name)) })),
    ...partners.map(([line], i) => ({ src: compactIconOf(line), at: room.partners[i]!, label: content.species(line).name, tip: lobbyPersonTip(content.species(line).name, JOURNEY_TEXT.lobby.partner) })),
  );

  return (
    <main className={`${styles.root} ${arrival ? styles.arriving : ''}`} data-testid="hub-screen" data-kiosk={kiosk ?? 'lobby'} data-rank={p.level} data-place={hub.place} data-fresh={fresh.join(' ')}>
      <header className={styles.chrome}>
        {kiosk ? (
          <button key="lobby" ref={lobbyButton} type="button" className={styles.back} onClick={() => setKiosk(null)} data-testid="btn-hub-lobby">
            <IconArrowLeft size={18} /> Lobby
          </button>
        ) : (
          <button key="menu" type="button" className={styles.back} onClick={leave} data-testid="btn-hub-back">
            <IconArrowLeft size={18} /> Menu
          </button>
        )}
        <h1 className={`${styles.title} display ${arrival ? 'sr-only' : ''}`}>{kiosk ? KIOSK_LABEL[kiosk] : 'Trainer Hub'}</h1>
        {/* The arrival's box stands where the title was: clear of the room, its plates and the way out. */}
        {arrival && <p className={styles.arrival} role="status" data-testid="hub-arrival">{arrival}</p>}
        <div className={styles.status}>
          <Tipped tip={hubPlaceTip(HUB_TEXT.place[hub.place], hub.next ? { name: HUB_TEXT.place[hub.next.id], needs: hub.next.needs.map((need, i) => HUB_TEXT.need(need, i > 0)) } : null)}>
            <span className={styles.statusPill} data-testid="hub-place" data-place={hub.place}><IconMapPin size={16} aria-hidden="true" /> {HUB_TEXT.place[hub.place]}</span>
          </Tipped>
          <span className={styles.statusRing} data-testid="hub-level" data-level={p.level}>
            <LevelRing xp={account.xp} size={56} />
            <span className={styles.statusXp}>
              <span className={`${styles.statusXpText} tabular`}>{p.level >= MAX_LEVEL ? rankRow(p.level).name : `${p.span - p.into} XP to ${rankRow(p.level + 1).name}`}</span>
              <span className={styles.statusBar} aria-hidden="true"><span className={styles.statusFill} style={{ width: `${Math.round(p.fraction * 100)}%` }} /></span>
            </span>
          </span>
          <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
            <span className={styles.statusPill} data-testid="hub-tokens" data-tokens={account.tokens} aria-label={`${account.tokens} Tokens`}><TokenIcon /> <b className="tabular"><NumberFlow value={account.tokens} animated={animate} /></b></span>
          </Tipped>
        </div>
      </header>

      {kiosk ? (
        <section className={styles.panel} data-testid={`hub-panel-${kiosk}`}>
          {kiosk === 'card' && <TrainerCard />}
          {kiosk === 'pc' && <PcTerminal onHall={featureOf('hall')?.unlocked ? () => setKiosk('hall') : undefined} />}
          {kiosk === 'mart' && <PokeMart />}
          {kiosk === 'guide' && <ItemGuide />}
          {kiosk === 'aide' && <OakAide />}
          {kiosk === 'kit' && <TrainerKit />}
          {kiosk === 'hall' && <HallRoom />}
        </section>
      ) : (
        <PixelRoom<HubSpot>
          // A new place is a new room: nothing of the last one's light or focus carries over.
          key={hub.place}
          art={hubRoom(hub.place)}
          w={room.w}
          h={room.h}
          label={HUB_TEXT.room[hub.place]}
          testId="hub-lobby"
          // D9 — whole pixels, and a half step only where the screen's own pixel ratio makes it whole; never over
          // ×4, so the pixels stay near one size from the bedroom (the smallest map) to the Plateau (the largest).
          scaleStep={0.5}
          devicePixels
          maxScale={4}
          frame="silhouette"
          onChoose={open}
          sprites={sprites}
          spots={doors.map((f) => {
            const id = f.id as HubSpot;
            return {
              id,
              semantics: { kind: 'navigation' as const },
              boxes: room.features[id]!.boxes,
              label: HUB_TEXT.feature[id],
              tip: hubSpotTip(id, account.tokens, { parcels: account.parcels, slots: kitSlots(account), wins: account.hall.length }),
              testId: `kiosk-${id}`,
              ...(isFresh(f) ? { fresh: true } : {}),
              // A parcel waiting is the one thing the room says without being asked.
              ...(id === 'aide' && account.parcels > 0 ? { label: `${HUB_TEXT.feature.aide} · ${account.parcels}`, ariaLabel: `${KIOSK_LABEL.aide}, ${account.parcels} parcel${account.parcels === 1 ? '' : 's'} waiting` } : {}),
              // A plate that would hang off the room's west edge, or over the counter beside it, hangs from its piece's left.
              ...(room.features[id]!.boxes[0]![0] < 24 || id === 'pc' ? { plate: 'start' as const } : {}),
            };
          })}
          exit={{ box: room.exit, label: 'Menu', tip: hubExitTip(), testId: 'hub-exit', onExit: leave }}
        >
          {/* The games' warp: the new room out of black, in steps, cut to the room's own shape. */}
          {arrival && <span className={styles.warp} style={{ maskImage: `url("${hubRoom(hub.place)}")` }} aria-hidden="true" data-testid="hub-warp" />}
        </PixelRoom>
      )}
    </main>
  );
}
