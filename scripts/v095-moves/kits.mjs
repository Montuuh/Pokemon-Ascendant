// v0.9.5 — every line's kit. L: the base learnset ('id' at level 1, 'lv:id' later). M: the first evolution's
// branches by archetype ('from>to' upgrades, '+id' the one addition). F: the final evolution's branches ('slot>to'
// swaps, where `slot` is a base-kit move and the swap lands on whatever that slot has become). mastery: the Lv1
// move; Lv2 and Lv3 are its + and ++.
export const KITS = {
  // ── Starters ─────────────────────────────────────────────────────────────────────────────────────────
  bulbasaur: {
    L: 'tackle growl 4:vine-whip 8:leech-seed',
    M: { vanguard: 'tackle>headbutt vine-whip>razor-leaf +take-down', specialist: 'vine-whip>razor-leaf growl>poison-powder +sleep-powder', support: 'leech-seed>mega-drain growl>growth +stun-spore' },
    F: { vanguard: 'tackle>body-slam vine-whip>petal-dance', specialist: 'vine-whip>razor-leaf-plus growl>toxic', support: 'leech-seed>mega-drain-plus growl>growth-plus' },
    mastery: 'solar-beam',
  },
  charmander: {
    L: 'scratch growl 4:ember 8:leer',
    M: { vanguard: 'scratch>slash growl>rage +fire-punch', specialist: 'ember>ember-plus leer>smokescreen +fire-spin', support: 'growl>smokescreen leer>focus-energy +rest' },
    F: { vanguard: 'scratch>slash-plus growl>wing-attack', specialist: 'ember>flamethrower scratch>swift', support: 'ember>fire-spin-plus leer>agility' },
    mastery: 'fire-blast',
  },
  squirtle: {
    L: 'tackle tail-whip 4:bubble 8:water-gun',
    M: { vanguard: 'tackle>skull-bash tail-whip>withdraw +bite', specialist: 'water-gun>bubble-beam bubble>bubble-plus +surf', support: 'tail-whip>withdraw bubble>bubble-plus +rest' },
    F: { vanguard: 'tackle>skull-bash-plus tail-whip>body-slam', specialist: 'water-gun>hydro-pump bubble>ice-beam', support: 'tail-whip>barrier water-gun>bubble-beam-plus' },
    mastery: 'waterfall',
  },
  caterpie: {
    L: 'tackle string-shot 3:harden 6:leech-life',
    M: { vanguard: 'tackle>headbutt leech-life>twineedle +harden-plus', specialist: 'leech-life>leech-life-plus string-shot>string-shot-plus +pin-missile', support: 'harden>harden-plus string-shot>string-shot-plus +withdraw' },
    F: { vanguard: 'tackle>gust-plus string-shot>supersonic', specialist: 'leech-life>confusion-plus string-shot>sleep-powder harden>stun-spore', support: 'harden>poison-powder string-shot>sleep-powder tackle>gust' },
    mastery: 'psybeam',
  },
  weedle: {
    L: 'poison-sting string-shot 3:harden 6:leech-life',
    M: { vanguard: 'poison-sting>poison-sting-plus leech-life>twineedle +harden-plus', specialist: 'string-shot>string-shot-plus leech-life>pin-missile +poison-powder' },
    F: { vanguard: 'leech-life>twineedle-plus harden>focus-energy string-shot>agility', specialist: 'poison-sting>toxic leech-life>pin-missile-plus harden>agility' },
    mastery: 'fury-attack',
  },
  pidgey: {
    L: 'tackle sand-attack 4:gust 8:quick-attack',
    M: { vanguard: 'tackle>wing-attack quick-attack>quick-attack-plus +whirlwind', specialist: 'gust>gust-plus sand-attack>sand-attack-plus +swift', support: 'sand-attack>sand-attack-plus tackle>growl +agility' },
    F: { vanguard: 'tackle>drill-peck quick-attack>fly', specialist: 'gust>wing-attack-plus tackle>swift-plus', support: 'tackle>mirror-move gust>gust-plus quick-attack>roar' },
    mastery: 'sky-attack',
  },
  // ── Two-stage lines ──────────────────────────────────────────────────────────────────────────────────
  rattata: {
    L: 'tackle tail-whip 4:quick-attack 8:bite',
    M: { vanguard: 'bite>hyper-fang quick-attack>quick-attack-plus +focus-energy', specialist: 'tackle>swift tail-whip>leer-plus +body-slam' },
    mastery: 'super-fang',
  },
  spearow: {
    L: 'peck growl 4:leer 8:fury-attack',
    M: { vanguard: 'peck>drill-peck fury-attack>double-edge +mirror-move', specialist: 'peck>gust-plus leer>leer-plus +agility' },
    mastery: 'sky-attack',
  },
  ekans: {
    L: 'wrap leer 4:poison-sting 8:bite',
    M: { vanguard: 'bite>bite-plus wrap>wrap-plus +glare', support: 'leer>screech poison-sting>acid +haze' },
    mastery: 'body-slam',
  },
  pikachu: {
    L: 'thunder-shock growl 4:quick-attack 8:thunder-wave',
    M: { vanguard: 'quick-attack>quick-attack-plus thunder-shock>thunder-punch +slam', specialist: 'thunder-shock>thunderbolt growl>agility +swift', support: 'growl>double-team thunder-shock>thunder-shock-plus +light-screen' },
    mastery: 'thunder',
  },
  sandshrew: {
    L: 'scratch defense-curl 4:sand-attack 8:poison-sting',
    M: { vanguard: 'scratch>slash poison-sting>fury-swipes +swords-dance', support: 'defense-curl>defense-curl-plus sand-attack>sand-attack-plus +dig' },
    mastery: 'earthquake',
  },
  'nidoran-f': {
    L: 'growl scratch 4:tail-whip 8:poison-sting',
    M: { vanguard: 'scratch>fury-swipes poison-sting>poison-sting-plus +bite', support: 'poison-sting>acid tail-whip>tail-whip-plus +toxic' },
    F: { vanguard: 'scratch>body-slam tail-whip>earthquake', specialist: 'poison-sting>sludge growl>thunderbolt' },
    mastery: 'double-kick',
  },
  'nidoran-m': {
    L: 'leer tackle 4:horn-attack 8:poison-sting',
    M: { vanguard: 'horn-attack>horn-attack-plus tackle>double-kick +focus-energy', specialist: 'poison-sting>poison-sting-plus leer>leer-plus +toxic' },
    F: { vanguard: 'horn-attack>horn-drill tackle>earthquake', specialist: 'poison-sting>sludge leer>thunderbolt' },
    mastery: 'thrash',
  },
  clefairy: {
    L: 'pound growl 4:sing 8:double-slap',
    M: { support: 'growl>minimize double-slap>double-slap-plus +metronome', specialist: 'double-slap>swift sing>sing-plus +light-screen' },
    mastery: 'body-slam',
  },
  vulpix: {
    L: 'ember tail-whip 4:quick-attack 8:roar',
    M: { specialist: 'ember>flamethrower tail-whip>tail-whip-plus +fire-spin', support: 'roar>confuse-ray ember>ember-plus +dig' },
    mastery: 'fire-blast',
  },
  jigglypuff: {
    L: 'sing pound 4:defense-curl 8:double-slap',
    M: { vanguard: 'pound>body-slam double-slap>double-slap-plus +rest', support: 'defense-curl>defense-curl-plus sing>sing-plus +disable' },
    mastery: 'double-edge',
  },
  zubat: {
    L: 'leech-life supersonic 4:bite 8:wing-attack',
    M: { vanguard: 'bite>bite-plus leech-life>leech-life-plus +haze', specialist: 'wing-attack>wing-attack-plus supersonic>supersonic-plus +confuse-ray' },
    mastery: 'sky-attack',
  },
  paras: {
    L: 'scratch stun-spore 4:leech-life 8:absorb',
    M: { vanguard: 'scratch>slash leech-life>leech-life-plus +swords-dance', support: 'absorb>mega-drain stun-spore>spore +growth' },
    mastery: 'solar-beam',
  },
  venonat: {
    L: 'tackle disable 4:supersonic 8:confusion',
    M: { specialist: 'confusion>psybeam tackle>leech-life +swift', support: 'supersonic>poison-powder disable>sleep-powder +stun-spore' },
    mastery: 'solar-beam',
  },
  diglett: {
    L: 'scratch sand-attack 4:growl 8:dig',
    M: { vanguard: 'dig>earthquake scratch>slash +fissure', specialist: 'sand-attack>sand-attack-plus scratch>rock-slide +rock-throw' },
    mastery: 'tri-attack',
  },
  meowth: {
    L: 'scratch growl 4:bite 8:pay-day',
    M: { vanguard: 'scratch>slash bite>bite-plus +screech', specialist: 'pay-day>pay-day-plus growl>swift +bubble-beam' },
    mastery: 'fury-swipes',
  },
  psyduck: {
    L: 'scratch tail-whip 4:water-gun 8:disable',
    M: { specialist: 'water-gun>hydro-pump scratch>confusion +psychic', support: 'disable>amnesia tail-whip>tail-whip-plus +bubble-beam' },
    mastery: 'psybeam',
  },
  mankey: {
    L: 'scratch leer 4:low-kick 8:karate-chop',
    M: { vanguard: 'karate-chop>karate-chop-plus low-kick>submission +thrash', specialist: 'low-kick>seismic-toss scratch>fury-swipes +rock-slide' },
    mastery: 'rage',
  },
  growlithe: {
    L: 'bite roar 4:ember 8:leer',
    M: { vanguard: 'bite>bite-plus leer>take-down +quick-attack-plus', specialist: 'ember>flamethrower roar>roar-plus +fire-spin' },
    mastery: 'fire-blast',
  },
  tentacool: {
    L: 'acid supersonic 4:wrap 8:poison-sting',
    M: { specialist: 'acid>acid-plus poison-sting>bubble-beam +hydro-pump', support: 'supersonic>supersonic-plus wrap>barrier +screech' },
    mastery: 'surf',
  },
  ponyta: {
    L: 'ember tail-whip 4:stomp 8:growl',
    M: { vanguard: 'stomp>stomp-plus tail-whip>take-down +agility', specialist: 'ember>flamethrower growl>fire-spin +swift' },
    mastery: 'fire-blast',
  },
  slowpoke: {
    L: 'confusion disable 4:headbutt 8:growl',
    M: { specialist: 'confusion>psychic headbutt>water-gun +surf', support: 'growl>amnesia disable>disable-plus +rest' },
    mastery: 'psybeam',
  },
  magnemite: {
    L: 'tackle sonic-boom 4:thunder-shock 8:supersonic',
    M: { specialist: 'thunder-shock>thunderbolt sonic-boom>sonic-boom-plus +swift', support: 'supersonic>thunder-wave tackle>screech +light-screen' },
    mastery: 'thunder',
  },
  doduo: {
    L: 'peck growl 4:fury-attack 8:quick-attack',
    M: { vanguard: 'peck>drill-peck fury-attack>thrash +agility', specialist: 'growl>tri-attack quick-attack>swift +rage' },
    mastery: 'sky-attack',
  },
  seel: {
    L: 'headbutt growl 4:aurora-beam 8:water-gun',
    M: { vanguard: 'headbutt>take-down water-gun>waterfall +rest', support: 'growl>growl-plus aurora-beam>aurora-beam-plus +blizzard' },
    mastery: 'ice-beam',
  },
  grimer: {
    L: 'pound poison-gas 4:disable 8:sludge',
    M: { vanguard: 'pound>pound-plus sludge>acid-plus +minimize', support: 'poison-gas>acid-armor disable>disable-plus +screech' },
    mastery: 'body-slam',
  },
  shellder: {
    L: 'tackle withdraw 4:supersonic 8:clamp',
    M: { vanguard: 'clamp>clamp-plus tackle>ice-punch +spike-cannon', support: 'withdraw>withdraw-plus supersonic>aurora-beam +barrier' },
    mastery: 'blizzard',
  },
  drowzee: {
    L: 'pound hypnosis 4:disable 8:confusion',
    M: { specialist: 'confusion>psychic pound>headbutt +psybeam', support: 'hypnosis>hypnosis-plus disable>meditate +psywave' },
    mastery: 'dream-eater',
  },
  krabby: {
    L: 'bubble leer 4:vice-grip 8:harden',
    M: { vanguard: 'vice-grip>vice-grip-plus leer>stomp +guillotine', support: 'harden>harden-plus bubble>bubble-beam +withdraw' },
    mastery: 'crabhammer',
  },
  voltorb: {
    L: 'tackle screech 4:sonic-boom 8:thunder-shock',
    M: { vanguard: 'tackle>self-destruct thunder-shock>thunder-shock-plus +swift', specialist: 'thunder-shock>thunderbolt sonic-boom>sonic-boom-plus +light-screen' },
    mastery: 'explosion',
  },
  exeggcute: {
    L: 'barrage hypnosis 4:reflect 8:leech-seed',
    M: { specialist: 'barrage>egg-bomb reflect>psychic +stomp', support: 'leech-seed>leech-seed-plus hypnosis>sleep-powder +stun-spore' },
    mastery: 'solar-beam',
  },
  cubone: {
    L: 'bone-club growl 4:tail-whip 8:leer',
    M: { vanguard: 'bone-club>bone-club-plus tail-whip>focus-energy +thrash', specialist: 'bone-club>dig leer>leer-plus +rock-slide' },
    mastery: 'bonemerang',
  },
  koffing: {
    L: 'tackle smog 4:smokescreen 8:self-destruct',
    M: { support: 'smokescreen>smokescreen-plus tackle>poison-gas +haze', vanguard: 'self-destruct>self-destruct-plus smog>smog-plus +explosion' },
    mastery: 'sludge',
  },
  rhyhorn: {
    L: 'horn-attack tail-whip 4:stomp 8:rock-throw',
    M: { vanguard: 'horn-attack>horn-drill stomp>stomp-plus +take-down', specialist: 'tail-whip>rock-slide rock-throw>rock-throw-plus +dig' },
    mastery: 'earthquake',
  },
  horsea: {
    L: 'bubble smokescreen 4:leer 8:water-gun',
    M: { specialist: 'water-gun>hydro-pump bubble>bubble-beam +ice-beam', support: 'smokescreen>smokescreen-plus leer>agility +haze' },
    mastery: 'blizzard',
  },
  goldeen: {
    L: 'peck tail-whip 4:supersonic 8:horn-attack',
    M: { vanguard: 'horn-attack>horn-attack-plus peck>fury-attack +horn-drill', specialist: 'supersonic>waterfall tail-whip>agility +bubble-beam' },
    mastery: 'waterfall',
  },
  staryu: {
    L: 'tackle harden 4:water-gun 8:swift',
    M: { specialist: 'swift>psychic water-gun>bubble-beam +thunderbolt', support: 'harden>recover tackle>light-screen +minimize' },
    mastery: 'hydro-pump',
  },
  magikarp: {
    L: 'splash tackle',
    M: { vanguard: 'tackle>bite-plus splash>leer +thrash', specialist: 'splash>dragon-rage tackle>bubble-beam +hydro-pump' },
    mastery: 'hyper-beam',
  },
  eevee: {
    L: 'tackle tail-whip 4:sand-attack 8:quick-attack',
    M: { vanguard: 'tackle>ember quick-attack>fire-spin +flamethrower', specialist: 'tackle>thunder-shock quick-attack>pin-missile +thunderbolt', support: 'tackle>water-gun tail-whip>acid-armor +aurora-beam' },
    mastery: 'take-down',
  },
  omanyte: {
    L: 'water-gun withdraw 4:horn-attack 8:leer',
    M: { specialist: 'water-gun>hydro-pump leer>rock-slide +ice-beam', vanguard: 'horn-attack>horn-attack-plus withdraw>withdraw-plus +rock-throw' },
    mastery: 'spike-cannon',
  },
  kabuto: {
    L: 'scratch harden 4:absorb 8:leer',
    M: { vanguard: 'scratch>scratch-plus leer>swords-dance +rock-slide', specialist: 'absorb>mega-drain harden>harden-plus +surf' },
    mastery: 'hydro-pump',
  },
  // ── Three-stage lines ────────────────────────────────────────────────────────────────────────────────
  oddish: {
    L: 'absorb poison-powder 4:stun-spore 8:acid',
    M: { vanguard: 'absorb>mega-drain acid>acid-plus +petal-dance', specialist: 'acid>acid-plus poison-powder>toxic +sleep-powder', support: 'stun-spore>stun-spore-plus absorb>mega-drain +growth' },
    F: { specialist: 'acid>sludge poison-powder>toxic-plus', vanguard: 'absorb>mega-drain-plus acid>petal-dance-plus', support: 'stun-spore>stun-spore-plus poison-powder>haze absorb>mega-drain-plus' },
    mastery: 'solar-beam',
  },
  poliwag: {
    L: 'bubble hypnosis 4:water-gun 8:double-slap',
    M: { vanguard: 'double-slap>body-slam bubble>bubble-plus +submission', specialist: 'bubble>bubble-beam water-gun>water-gun-plus +hydro-pump', support: 'hypnosis>hypnosis-plus double-slap>amnesia +rest' },
    F: { vanguard: 'double-slap>submission-plus water-gun>ice-punch', specialist: 'bubble>surf water-gun>ice-beam', support: 'hypnosis>hypnosis-plus double-slap>psychic water-gun>bubble-beam' },
    mastery: 'mega-punch',
  },
  abra: {
    L: 'teleport confusion 4:disable 8:kinesis',
    M: { specialist: 'confusion>psybeam disable>disable-plus +psychic', support: 'kinesis>reflect teleport>recover +barrier' },
    F: { specialist: 'confusion>psychic-plus teleport>thunder-wave', support: 'kinesis>light-screen disable>thunder-wave' },
    mastery: 'psywave',
  },
  machop: {
    L: 'low-kick leer 4:karate-chop 8:focus-energy',
    M: { vanguard: 'karate-chop>karate-chop-plus low-kick>low-kick-plus +submission', support: 'leer>leer-plus focus-energy>meditate +counter' },
    F: { vanguard: 'low-kick>mega-kick karate-chop>mega-punch', support: 'focus-energy>meditate-plus leer>rock-slide' },
    mastery: 'seismic-toss',
  },
  bellsprout: {
    L: 'vine-whip growth 4:wrap 8:poison-powder',
    M: { vanguard: 'wrap>slam vine-whip>vine-whip-plus +razor-leaf', specialist: 'vine-whip>razor-leaf poison-powder>acid +sleep-powder' },
    F: { vanguard: 'wrap>slam-plus growth>swords-dance', specialist: 'vine-whip>razor-leaf-plus poison-powder>acid-plus growth>stun-spore' },
    mastery: 'solar-beam',
  },
  geodude: {
    L: 'tackle defense-curl 4:rock-throw 8:self-destruct',
    M: { vanguard: 'tackle>rock-slide self-destruct>self-destruct-plus +harden', specialist: 'rock-throw>rock-throw-plus tackle>rock-slide +harden', support: 'defense-curl>defense-curl-plus rock-throw>rock-slide +harden-plus' },
    F: { vanguard: 'tackle>rock-slide-plus self-destruct>explosion', specialist: 'tackle>earthquake rock-throw>rock-slide-plus', support: 'defense-curl>defense-curl-plus tackle>body-slam rock-throw>rock-slide-plus' },
    mastery: 'mega-punch',
  },
  gastly: {
    L: 'lick confuse-ray 4:night-shade 8:hypnosis',
    M: { specialist: 'night-shade>night-shade-plus lick>lick-plus +psywave', support: 'hypnosis>hypnosis-plus confuse-ray>confuse-ray-plus +haze' },
    F: { vanguard: 'lick>mega-punch confuse-ray>lick-plus', specialist: 'night-shade>psychic hypnosis>hypnosis-plus' },
    mastery: 'dream-eater',
  },
  dratini: {
    L: 'wrap leer 4:thunder-wave 8:agility',
    M: { vanguard: 'wrap>slam leer>leer-plus +dragon-rage', specialist: 'wrap>dragon-rage thunder-wave>thunder-wave-plus +bubble-beam', support: 'agility>agility-plus leer>barrier +haze' },
    F: { vanguard: 'wrap>slam-plus agility>body-slam', specialist: 'wrap>dragon-rage-plus thunder-wave>thunderbolt leer>ice-beam', support: 'leer>barrier-plus thunder-wave>thunder-wave-plus agility>recover' },
    mastery: 'hyper-beam',
  },
  // ── Single-stage species: two at level 1, three more by level ───────────────────────────────────────
  farfetchd: { L: 'peck sand-attack 8:leer 16:fury-attack 24:swords-dance', mastery: 'cut' },
  onix: { L: 'tackle screech 8:bind 16:rock-throw 24:harden', mastery: 'rock-slide' },
  hitmonlee: { L: 'double-kick meditate 8:swift 16:rolling-kick 24:high-jump-kick', mastery: 'mega-kick' },
  hitmonchan: { L: 'comet-punch agility 8:swift 16:fire-punch 24:ice-punch', mastery: 'mega-punch' },
  lickitung: { L: 'wrap supersonic 8:stomp 16:disable 24:slam', mastery: 'lick' },
  chansey: { L: 'pound double-slap 8:sing 16:growl 24:soft-boiled', mastery: 'egg-bomb' },
  tangela: { L: 'constrict bind 8:absorb 16:poison-powder 24:stun-spore', mastery: 'slam' },
  kangaskhan: { L: 'comet-punch rage 8:bite 16:tail-whip 24:mega-punch', mastery: 'dizzy-punch' },
  'mr-mime': { L: 'confusion barrier 8:light-screen 16:double-slap 24:reflect', mastery: 'psybeam' },
  scyther: { L: 'quick-attack leer 8:focus-energy 16:swift 24:wing-attack', mastery: 'slash' },
  jynx: { L: 'pound lovely-kiss 8:lick 16:double-slap 24:ice-punch', mastery: 'blizzard' },
  electabuzz: { L: 'quick-attack leer 8:thunder-shock 16:screech 24:thunder-punch', mastery: 'thunder' },
  magmar: { L: 'ember leer 8:confuse-ray 16:fire-punch 24:smokescreen', mastery: 'flamethrower' },
  pinsir: { L: 'vice-grip focus-energy 8:seismic-toss 16:harden 24:guillotine', mastery: 'slash' },
  tauros: { L: 'tackle tail-whip 8:stomp 16:leer 24:take-down', mastery: 'thrash' },
  lapras: { L: 'water-gun growl 8:sing 16:mist 24:body-slam', mastery: 'ice-beam' },
  ditto: { L: 'transform pound' },
  porygon: { L: 'tackle sharpen 8:conversion 16:psybeam 24:agility', mastery: 'tri-attack' },
  aerodactyl: { L: 'wing-attack agility 8:supersonic 16:bite 24:take-down', mastery: 'rock-slide' },
  snorlax: { L: 'headbutt amnesia 8:rest 16:body-slam 24:harden', mastery: 'double-edge' },
  articuno: { L: 'peck ice-beam 10:blizzard 20:agility 40:mist' },
  zapdos: { L: 'thunder-shock drill-peck 10:thunder 20:agility 40:light-screen' },
  moltres: { L: 'peck fire-spin 10:leer 20:agility 40:sky-attack' },
  mewtwo: { L: 'confusion disable 10:swift 20:psychic 40:barrier' },
  mew: { L: 'pound transform 10:mega-punch 20:metronome 40:psychic' },
};
