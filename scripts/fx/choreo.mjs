// §9.9.2 — a move's choreography, read from its FRLG battle-animation script: every sprite it creates, when (the
// script's own delays, in GBA frames at 60 fps), how it moves (the C callback of its template, as one of a dozen paths),
// where (on its user or its target, at the offset its callback reads) and for how long (the duration its callback
// reads, where it reads one). The game replays this timeline with the same sprites, so
// Flamethrower pours its embers in a wave, Fire Spin circles its target and Rock Throw drops its rocks from above.

/** The paths a pret sprite moves along, by the callback that moves it — first match wins. */
export const PATHS = [
  // From the target back to its user: a drain's orbs, Leech Life's needle.
  ['absorb', /Absorption|AbsorbOrb|LeechLife|SwallowBlueOrb|IngrainOrb|PresentHeal|SpitUp/],
  // Round its point: Fire Spin's embers, a vortex, a swirl.
  ['orbit', /Vortex|Orbit|Swirl|Spiral|Twister|FireSpin|RazorWindTornado|Whirlwind|Tornado|Wisp|Circle|PinkHeart|Gust(?!ToTarget)/],
  // A stream that bends on its way: Flamethrower, Ice Beam, Aurora Beam, notes.
  ['wave', /SinWave|SineWave|Wavy|FlyingMusic|AuroraBeam|IceBeamParticle|HyperBeamOrb|SlowFlying|PerishSong|ElectricPuff|Sing/],
  // Down from above its point: Rock Throw, Weather Ball, Eruption, a falling coin.
  ['fall', /Falling|Fall\b|WeatherBallDown|Eruption|Hail|Meteor|Rain|Drop(?!let)|Feather|MetronomeFinger|Stomp/],
  // Up from its point: a plume, rising energy, Ingrain's roots.
  ['rise', /Plume|Rising|Endure|RaiseSprite|FocusEnergy|Up\b|Ingrain|Root|Raise|Halo|Bubbles?Rise|SmallDrifting|Bell/],
  // Out from its point in all directions: dirt, sparks, a burst of confetti.
  ['scatter', /Scatter|Spread|Burst|Fragment|Puff|Confetti|Droplet|Spray|SparkElectricity|Electricity|Explosion|Sparkle|Star(?!t)/],
  // Thrown in an arc: Egg Bomb, Sludge Bomb, a missile.
  ['arc', /Arc|ThrowProjectile|Sludge|EggBomb|Lob|Bonemerang|Present\b|BatonPass|Pokeball|Coin/],
  // Straight from the user to its target.
  ['line', /Translate|ToTarget|Projectile|Throw|Stinger|Needle|Seed|Crescent|Leaf|Thread|Web|Heart|Orb|Bubble|Ball|Shot|Bolt|Beam|Ring|Wave|Pellet|Spike|Feint|Shadow|Ember/],
];
/** Where a sprite of no listed path plays: on its point (a hit splat, a bite, a claw, a fist). */
export const ON = 'on';
/**
 * Callbacks the names above misread, read one by one from pret (`AnimBite` closes, `AnimRoarNoiseLine` goes out from
 * its user, `AnimThunderboltOrb` flashes on its target, `AnimMovePowderParticle` falls on it).
 */
const BY_CALLBACK = {
  AnimBite: 'close', AnimViceGripPincer: 'close', AnimGuillotinePincer: 'close', AnimMovingClamp: 'close',
  AnimRoarNoiseLine: 'out', AnimBreathPuff: 'out', AnimMovementWaves: 'out',
  AnimPetalDanceBigFlower: 'sway', AnimPetalDanceSmallFlower: 'sway', AnimFallingFeather: 'sway', AnimSwordsDanceBlade: 'rise', AnimCirclingMusicNote: 'orbit', AnimConfusionDuck: 'orbit',
  AnimDizzyPunchDuck: 'orbit', AnimRapidSpin: 'orbit', AnimDragonDanceOrb: 'orbit', AnimFireRing: 'orbit', AnimCirclingSparkle: 'orbit',
  AnimSparkElectricity: 'orbit', AnimSparkElectricityFlashing: 'orbit',
  AnimMovePowderParticle: 'fall', AnimSporeParticle: 'fall', AnimSweetScentPetal: 'fall', AnimLightning: 'fall', AnimCurseNail: 'fall',
  AnimRockTomb: 'fall', AnimSunlight: 'fall', AnimWishStar: 'fall', AnimGreenStar: 'fall', AnimMoonlightSparkle: 'fall',
  AnimSuperpowerRock: 'rise', AnimLargeFlame: 'rise', AnimEmberFlare: 'rise', AnimGuardRing: 'rise', AnimSleepLetterZ: 'rise',
  AnimLetterZ: 'rise', AnimThoughtBubble: 'rise',
  AnimOutrageFlame: 'scatter', AnimSpeedDust: 'scatter', AnimBlackSmoke: 'scatter', AnimFireCross: 'scatter', AnimSludgeBombHitParticle: 'scatter',
  AnimFlyingParticle: 'line', AnimOverheatFlame: 'line', AnimYawnCloud: 'line', AnimTravelDiagonally: 'line', AnimMoveParticleBeyondTarget: 'line',
  InitPoisonGasCloudAnim: 'line', AnimRockBlastRock: 'line', AnimTriAttackTriangle: 'line',
  AnimBouncingMusicNote: 'wave', AnimBubbleEffect: 'wave', AnimWaterBubbleProjectile: 'wave', AnimSwirlingSnowball: 'wave',
  AnimSpikes: 'arc', AnimLeechSeed: 'arc', AnimMimicOrb: 'absorb',
  AnimThunderboltOrb: 'on', AnimElectricity: 'on', AnimBlendThinRing: 'on', AnimTailGlowOrb: 'on', AnimGrowingChargeOrb: 'on',
  AnimThunderWave: 'on', AnimWaveFromCenterOfTarget: 'on', AnimSmokeBallEscapeCloud: 'on', AnimEyeSparkle: 'on', AnimFlashingCircleImpact: 'on',
};
export const pathOf = (callback) => BY_CALLBACK[callback] ?? PATHS.find(([, re]) => re.test(callback))?.[0] ?? ON;

/** How long a sprite of each path lives, in GBA frames — about what its callback takes. */
export const LIFE = { absorb: 30, orbit: 40, wave: 24, fall: 18, rise: 24, scatter: 20, arc: 24, line: 18, on: 16, close: 12, out: 18, sway: 48 };

/**
 * §9.9.2 — the visual tasks that move, deform or light the Pokémon itself (no sprite), as one of a dozen beats the
 * game plays on its sprite: Agility's elliptical rush and its afterimages, Harden's metallic shine, Growth's swelling,
 * Minimize's shrinking, Splash's hop, Tail Whip's sway, a tint in the move's colour. First match wins; a beat's own
 * length in GBA frames. A shake on a Pokémon that takes the hit is the hit's own (it shakes already).
 */
export const MON_TASKS = [
  ['trace', /TraceMonBlended|DoubleTeam|AttackerPunchWithTrace/, 40],
  ['sway', /TranslateMonElliptical|SwayMon|RockMonBackAndForth|RotateMonSpriteToSide|RotateMonToSideAndRestore|TeeterDance|ThrashMoveMon/, 40],
  ['shine', /MetallicShine|FlashAnimTagWithColor|StatusClearedEffect/, 30],
  ['grow', /GrowAndShrink|StrongFrustrationGrowAndShrink|TransparentCloneGrowAndShrink|StretchAttackerUp|DeepInhale/, 24],
  ['shrink', /Minimize|Withdraw|SwitchOutShrinkMon|ShrinkTargetCopy/, 30],
  // A squash or a stretch (Defense Curl, Stockpile): shrunk to its half step instead — a Pokémon is never deformed.
  ['shrink', /StretchTargetUp|DefenseCurlDeformMon|SquishAndSweatDroplets|SmellingSaltsSquish|SlackOffSquish|SwallowDeformMon|StockpileDeformMon|SpitUpDeformMon/, 20],
  ['melt', /AcidArmor|TransformMon/, 40],
  ['vanish', /Teleport|MonToSubstitute|SwapMonSpriteToFromSubstitute|AttackerFadeToInvisible|SubstituteFadeToInvisible/, 30],
  ['hop', /Splash|DigUpMovement/, 30],
  ['gray', /SetGrayscaleOrOriginalPal/, 30],
  ['tint', /BlendColorCycle|BlendMonInAndOut|BlendBattleAnimPal(?!Exclude)|MusicNotesRainbowBlend|SetCamouflageBlend/, 24],
  ['shake', /ShakeMon|HorizontalShake|ShakeTargetInPattern|ShakeAndSinkMon|ShakeTargetBasedOnMovePowerOrDmg/, 20],
];
/** ScaleMonAndRestore swells its Pokémon (negative scale args) or shrinks it (positive). */
const scaleBeat = (args) => (Number(args[0]) < 0 ? 'grow' : 'shrink');

/** A sprite that lands the blow: the hit's splat, a cross, a strike — the move lands with the first of them. */
const HIT = /HitSplat|CrossImpact|ArmThrustHit|KnockOffStrike|SlidingHit|WhipHit|FlashingHit|Explosion/;

/** What a battle-anim argument names: a number, or one of the battlers (ANIM_ATTACKER 0, ANIM_TARGET 1, …). */
const BATTLER = { ANIM_ATTACKER: 0, ANIM_TARGET: 1, ANIM_ATK_PARTNER: 2, ANIM_DEF_PARTNER: 3 };
const argValue = (s) => (/^-?\d+$/.test(s ?? '') ? Number(s) : (BATTLER[s] ?? null));

/**
 * How a callback places and times its sprite, read from its C body: on whom it starts (`InitSpritePosToAnimAttacker`
 * or `…Target`, or an argument that chooses between them), whether its first two arguments are that offset, and which
 * argument is its duration (`sprite->data[0] = gBattleAnimArgs[n]`).
 */
export function readCallback(body) {
  if (!body) return { anchor: null, offset: false, duration: null };
  const atk = /InitSpritePosToAnimAttacker|SetSpriteCoordsToAnimAttackerCoords/.test(body);
  const tgt = /InitSpritePosToAnimTarget|SetSpriteCoordsToAnimTargetCoords|SetAverageBattlerPositions/.test(body);
  // `if (!gBattleAnimArgs[n]) …Attacker … else …Target`, or `if (gBattleAnimArgs[n] == 0)` / `== ANIM_ATTACKER`.
  const chooser = /if \(!?gBattleAnimArgs\[(\d)\](?:\s*==\s*(?:0|ANIM_ATTACKER|FALSE))?\)\s*\r?\n\s*(?:\w+\s*=\s*)?\w*(?:Attacker|Target)/.exec(body);
  const duration = /sprite->data\[0\]\s*=\s*gBattleAnimArgs\[(\d)\]/.exec(body);
  return {
    anchor: chooser && atk && tgt ? { arg: Number(chooser[1]) } : atk && !tgt ? 'user' : tgt && !atk ? 'target' : null,
    offset: atk || tgt,
    duration: duration ? Number(duration[1]) : null,
  };
}

/** Sprites a script loads that are not the move itself: a Poké Ball, the user's shadow, a sweat drop. */
const NOT_THE_MOVE = new Set(['round-shadow', 'item-bag', 'white-bag', 'tied-bag']);
const MAX_EMITS = 40;

/**
 * The timeline of one move script: `[t, sprite, path, dx, dy, on, life, hit]` per sprite it creates — t and life in
 * GBA frames, `on` 'u' (its user) or 't' (its target) where it plays or starts, `hit` 1 for the blow — and
 * `[t, beat, on, life]` per visual task that moves or lights a Pokémon (`MON_TASKS`), following its calls and the blow's
 * branch, and where the GBA waits for its visuals, the end of the longest still playing.
 */
export function timeline(labels, label, templates, spriteKey, bodies = {}) {
  const emits = [];
  const mon = [];
  let t = 0;
  let end = 0;
  const seen = new Set();
  const run = (name, depth) => {
    if (!labels[name] || depth > 12) return 'end';
    for (const line of labels[name]) {
      const [cmd, ...rest] = line.split(/\s+/);
      const args = rest.join(' ').split(',').map((s) => s.trim());
      if (cmd === 'createsprite') {
        const tpl = templates[args[0]];
        const sprite = tpl?.tag && spriteKey(tpl.tag);
        if (sprite && !NOT_THE_MOVE.has(sprite) && emits.length < MAX_EMITS) {
          const path = pathOf(tpl.callback);
          // Its own arguments start after the template, its battler and its subpriority.
          const own = args.slice(3).map(argValue);
          const how = readCallback(bodies[tpl.callback]);
          const anchor = typeof how.anchor === 'object' && how.anchor ? (own[how.anchor.arg] === 0 ? 'u' : 't') : how.anchor === 'user' ? 'u' : how.anchor === 'target' ? 't' : path === 'sway' ? 'u' : 't';
          const dur = how.duration !== null ? own[how.duration] : null;
          const life = typeof dur === 'number' && dur >= 4 && dur <= 90 ? dur : LIFE[path];
          // A pair closing (Bite's jaws) reads its halves' offsets even where its callback places them itself.
          const [dx, dy] = how.offset || path === 'close' ? [own[0] ?? 0, own[1] ?? 0] : [0, 0];
          emits.push([t, sprite, path, dx, dy, anchor, life, HIT.test(tpl.callback) ? 1 : 0]);
          end = Math.max(end, t + life);
        }
      } else if (cmd === 'createvisualtask') {
        const task = args[0].replace(/^AnimTask_/, '');
        const beat = task === 'ScaleMonAndRestore' ? scaleBeat(args.slice(2)) : MON_TASKS.find(([, re]) => re.test(task))?.[0];
        if (beat && mon.length < MAX_EMITS) {
          const rest = args.slice(1).join(' ');
          // On whom: the battler or the palette it names; a palette task on the background alone moves no Pokémon.
          const on = /ANIM_TARGET|F_PAL_TARGET|ANIM_DEF_PARTNER|F_PAL_DEF/.test(rest) ? 't' : /ANIM_ATTACKER|F_PAL_ATTACKER|ANIM_ATK_PARTNER/.test(rest) ? 'u' : beat === 'tint' || beat === 'gray' ? null : 'u';
          if (on) {
            const life = MON_TASKS.find(([b]) => b === beat)?.[2] ?? 24;
            mon.push([t, beat, on, life]);
            end = Math.max(end, t + life);
          }
        }
      } else if (cmd === 'delay') {
        t += Number(args[0]) || 0;
        end = Math.max(end, t);
      } else if (cmd === 'waitforvisualfinish') {
        t = Math.max(t, end);
      } else if (cmd === 'call') {
        if (run(args[0], depth + 1) === 'end') return 'end';
      } else if (cmd === 'goto') {
        if (seen.has(args[0])) return 'end';
        seen.add(args[0]);
        return run(args[0], depth + 1);
      } else if (/^jump|^choosetwoturnanim/.test(cmd)) {
        // A two-turn move plays its blow, the turn the card lands (the last label); any other branch, its first.
        const branches = args.filter((a) => labels[a] && !seen.has(a));
        const to = cmd === 'choosetwoturnanim' ? branches.at(-1) : branches[0];
        if (to) {
          seen.add(to);
          return run(to, depth + 1);
        }
      } else if (cmd === 'return') return 'return';
      else if (cmd === 'end') return 'end';
    }
    return 'end';
  };
  run(label, 0);
  return { frames: Math.max(end, t), emits, mon };
}
