/*
 * The combat simulation's rules. Not everyone who comes aboard the Ark is ready
 * to fight, so the Recon Dock has a simulator: a jungle that never was, full of
 * alien things that scream and charge. Crew drill in it; AXIOM can step in too.
 *
 * Waves of aliens come out of the jungle: stalkers that run you down, spitters
 * that hang back and lob acid, harriers that hold the sky and shoot down, and brutes
 * that take a cell to drop. AXIOM's sim-body is no person and moves like it: it
 * dashes through blows, punches acid back where it came from, slams down from the
 * air, and hauls itself about on a Containment tether (the drawing code moves it;
 * these rules settle what each move does). Kills give off Flux the carbine soaks
 * up, and shots on the Law-Heart's beat strike harder. You have
 * the Arc Carbine (arc-carbine.ts), a health bar and what spare cells you can
 * find; the training dome over the clearing where a run begins recharges the
 * seated cell. How many cells there are, and how hard they hit, is set by the
 * difficulty. Every wave AXIOM clears
 * is a live drill for the crew training as Security in the pods around it:
 * minutes of their training, more on harder settings, capped for each run.
 * Pure rules, advanced in place; ark-sim.ts draws the jungle and
 * ark-sim-audio.ts gives it voice.
 *
 * A run can also follow a course instead of the open jungle (ark-sim-conduit.ts):
 * walls that hold everything in, encounters that wait for AXIOM to reach them,
 * and a power pack on its back that feeds the carbine everywhere, harder, while
 * the sim-body mends itself between blows.
 */

import { CELLS, createCarbine, DEFAULT_LOADOUT, FORMS, pullTrigger, RECHARGE_RATE, stepCarbine, swapCell, type Carbine, type CarbineLoadout, type Discharge } from "./arc-carbine.ts";

export type SimDifficulty = "recruit" | "soldier" | "veteran";
export type AlienKind = "stalker" | "spitter" | "brute" | "harrier";

export const SIM_DIFFICULTIES: Record<SimDifficulty, {
  label: string;
  blurb: string;
  playerHealth: number;
  /** Multipliers on every alien's health, speed and damage. */
  toughness: number;
  pace: number;
  bite: number;
  /** Aliens in the first wave, and how many more each wave brings. */
  firstWave: number;
  growth: number;
  /** Most alive at once. */
  crowd: number;
  /** Seconds between arrivals within a wave. */
  arrival: number;
  /** Spare cells at the start; Infinity never runs dry. */
  cells: number;
  /** Chance a kill drops a cell, and health. */
  cellDrop: number;
  healthDrop: number;
  /** The wave spitters, harriers and brutes first appear in. */
  spittersFrom: number;
  harriersFrom: number;
  brutesFrom: number;
  /** Seconds of Security training each cleared wave drills into the trainees. */
  drill: number;
}> = {
  recruit: {
    label: "Recruit",
    blurb: "Slow aliens, endless cells. Learn the jungle.",
    playerHealth: 150, toughness: 0.8, pace: 0.8, bite: 0.6,
    firstWave: 4, growth: 2, crowd: 6, arrival: 1.6,
    cells: Infinity, cellDrop: 0, healthDrop: 0.15,
    spittersFrom: 3, harriersFrom: 4, brutesFrom: 5,
    drill: 60,
  },
  soldier: {
    label: "Soldier",
    blurb: "A fair fight. Spare cells are wherever you find them; the dome recharges yours.",
    playerHealth: 100, toughness: 1, pace: 1, bite: 1,
    firstWave: 5, growth: 3, crowd: 9, arrival: 1.1,
    cells: 3, cellDrop: 0.3, healthDrop: 0.1,
    spittersFrom: 2, harriersFrom: 2, brutesFrom: 3,
    drill: 120,
  },
  veteran: {
    label: "Veteran",
    blurb: "They are fast, they hit hard, and spare cells are scarce.",
    playerHealth: 80, toughness: 1.35, pace: 1.25, bite: 1.5,
    firstWave: 7, growth: 4, crowd: 12, arrival: 0.8,
    cells: 1, cellDrop: 0.18, healthDrop: 0.06,
    spittersFrom: 1, harriersFrom: 1, brutesFrom: 2,
    drill: 180,
  },
};

/** The most Security training one run can drill into the trainees, however long it lasts. */
export const DRILL_CAP_SECONDS = 15 * 60;

/** What each kind of alien is like before the difficulty touches it. */
export const ALIENS: Record<AlienKind, {
  health: number;
  speed: number;
  damage: number;
  /** How close it must be to strike, and how often it can. */
  reach: number;
  cooldown: number;
  radius: number;
  score: number;
}> = {
  stalker: { health: 3, speed: 5, damage: 12, reach: 1.8, cooldown: 0.9, radius: 0.6, score: 100 },
  spitter: { health: 2, speed: 3, damage: 9, reach: 11, cooldown: 2.2, radius: 0.7, score: 150 },
  brute: { health: 10, speed: 2.6, damage: 26, reach: 2.3, cooldown: 1.6, radius: 1.1, score: 400 },
  // It never comes down: its damage is a bolt's, and its cooldown the wait between volleys.
  harrier: { health: 2, speed: 6.5, damage: 10, reach: 1.7, cooldown: 3.4, radius: 0.7, score: 175 },
};

/** How high a harrier holds, and how far out from AXIOM it keeps while it circles. */
export const HARRIER_CRUISE = 8.5;
const HARRIER_RING = 14;
/** Bolts in a volley, the gap between them, and how fast they fall. */
export const VOLLEY = 3;
const VOLLEY_GAP = 0.32;
const BOLT_SPEED = 21;
/** A bolt hits anything this close to its path, and bursts this wide on the ground. */
const BOLT_HIT = 0.9;
export const BOLT_SPLASH = 1.7;
/** Feet higher off the ground than this, and nothing on the ground can reach AXIOM. */
export const STRIKE_HEIGHT = 2.4;
/** The Conservation strike: its reach and arc, what it does, and how often. */
export const PUNCH = { reach: 2.8, cone: Math.cos(Math.PI / 3), damage: 2, knock: 4, stagger: 1.2, cooldown: 0.4 } as const;
/** A slam's landing hurts and throws back everything on the ground this close. */
export const SLAM_RADIUS = 4.5;
/** Acid punched back burns what it meets this hard. */
export const REFLECT_DAMAGE = 4;
/** A kill's Flux, as a share of the cell the carbine soaks it into. */
export const KILL_FLUX = 0.15;
/** A shot on the Law-Heart's beat strikes this much harder. */
export const RESONANT = 1.5;
/** A tethered alien is hauled in to this far off. */
export const TETHER_HOLD = 2.2;

/** The training dome over the clearing where a run begins: inside it the carbine's cell draws power. */
export const SIM_DOME = { x: 0, z: 0, radius: 6 } as const;
/** The playable clearing's radius; the simulation's edge glows beyond it. */
export const ARENA_RADIUS = 52;
const SPIT_SPEED = 10;
const SPIT_HIT = 0.7;
const PICKUP_REACH = 1.3;
const BREATHER = 3;

export type SimAlien = {
  id: number;
  kind: AlienKind;
  x: number;
  z: number;
  health: number;
  maxHealth: number;
  /** Seconds until it can strike again. */
  cooldown: number;
  /** Seconds until it next screams while hunting. */
  screamIn: number;
  /** A spitter's or harrier's preferred side when circling. */
  circle: 1 | -1;
  /** A harrier's height above the ground, and the bolts left in its volley. */
  height?: number;
  volley?: number;
};

/** Acid in flight; reflected once a punch has sent it back. */
export type SimSpit = { id: number; x: number; z: number; dx: number; dz: number; life: number; reflected?: boolean };
/** A harrier's shot, falling from the sky toward where AXIOM was headed. */
export type SimBolt = { id: number; x: number; y: number; z: number; dx: number; dy: number; dz: number; toX: number; toZ: number };
export type SimPickup = { id: number; kind: "cell" | "health"; x: number; z: number };

export type SimEvent =
  | { type: "wave"; wave: number }
  /** A wave's last alien fell; drill is the Security training it earned the trainees. */
  | { type: "cleared"; wave: number; drill: number }
  | { type: "spawn" | "scream" | "strike" | "kill"; kind: AlienKind; x: number; z: number }
  | { type: "spit"; x: number; z: number }
  /** A harrier fired; a bolt burst on the ground. */
  | { type: "bolt"; x: number; y: number; z: number }
  | { type: "blast"; x: number; z: number }
  | { type: "hit"; kind: AlienKind; x: number; z: number }
  | { type: "hurt"; amount: number }
  | { type: "shot" | "dry" | "reload" | "reloaded" | "vent" | "vented" | "charged" | "punch" | "parry" | "slam" | "dodged" | "flux" | "resonant" | "death" }
  | { type: "pickup"; kind: SimPickup["kind"] };

/** A map other than the open jungle: where things can be, where they come from, and what AXIOM carries. */
export type SimCourse = {
  /** Keep something this wide inside the map; height above the floor, where the map has ceilings that matter. */
  confine(x: number, z: number, margin: number, height?: number): { x: number; z: number };
  /** How high the space goes here, above the floor. */
  ceilingAt(x: number, z: number): number;
  /** Where an alien of this kind comes in. */
  spawnAt(state: SimState, kind: AlienKind, random: () => number): { x: number; z: number };
  /** The next encounter's aliens once AXIOM has gone far enough for it; null until then, or once there are none left. */
  nextWave(state: SimState): AlienKind[] | null;
  /** A power pack: the cell fills everywhere at this many times a Lawheart's rate, and bolts strike this much harder. */
  pack: { recharge: number; damage: number };
  /** Health the sim-body mends each second, as a share of its most, once a moment has passed since the last blow. */
  regen: number;
};

/** How long after a blow the sim-body starts to mend, on a course that mends it. */
export const MEND_DELAY = 1.5;

export type SimState = {
  difficulty: SimDifficulty;
  /** Set when the run follows a course rather than the open jungle. */
  course?: SimCourse;
  time: number;
  wave: number;
  /** Aliens still to arrive this wave, in order, and when the next comes. */
  roster: AlienKind[];
  nextArrival: number;
  score: number;
  kills: number;
  /** Waves beaten outright, and the Security training they have drilled so far this run. */
  cleared: number;
  drilled: number;
  player: {
    x: number;
    z: number;
    health: number;
    maxHealth: number;
    /** The Arc Carbine in AXIOM's hands: its cell, spares, heat and loadout. */
    gun: Carbine;
    alive: boolean;
    /** How high the feet are off the ground, as the drawing code moves the sim-body. */
    lift: number;
    /** Until when a dash carries it through blows, and when it can punch again. */
    dodgeUntil: number;
    punchReady: number;
    /** When it last took a blow. */
    hurtAt: number;
  };
  aliens: SimAlien[];
  spit: SimSpit[];
  bolts: SimBolt[];
  /** Where AXIOM was last step and how fast it is going, for leading a shot. */
  track: { x: number; z: number; vx: number; vz: number };
  pickups: SimPickup[];
  nextId: number;
  /** What happened since the drawing code last read them: sounds, flashes, banners. */
  events: SimEvent[];
};

const clampToArena = (x: number, z: number, margin = 1) => {
  const distance = Math.hypot(x, z);
  const limit = ARENA_RADIUS - margin;
  return distance <= limit ? { x, z } : { x: (x / distance) * limit, z: (z / distance) * limit };
};

/** A fresh run: the player in the clearing under the dome, a few spare cells about. */
export function createSim(difficulty: SimDifficulty, random: () => number = Math.random, loadout: CarbineLoadout = DEFAULT_LOADOUT, course?: SimCourse): SimState {
  const rules = SIM_DIFFICULTIES[difficulty];
  const state: SimState = {
    difficulty,
    ...(course ? { course } : {}),
    time: 0,
    wave: 0,
    roster: [],
    nextArrival: BREATHER,
    score: 0,
    kills: 0,
    cleared: 0,
    drilled: 0,
    player: {
      x: 0,
      z: 0,
      health: rules.playerHealth,
      maxHealth: rules.playerHealth,
      // On a course the power pack feeds the seated cell; there are no spares to find.
      gun: createCarbine(loadout, course ? 0 : rules.cells),
      alive: true,
      lift: 0,
      dodgeUntil: -Infinity,
      punchReady: 0,
      hurtAt: -Infinity,
    },
    aliens: [],
    spit: [],
    bolts: [],
    track: { x: 0, z: 0, vx: 0, vz: 0 },
    pickups: [],
    nextId: 1,
    events: [],
  };
  if (Number.isFinite(rules.cells) && !course) {
    for (let crate = 0; crate < 4; crate += 1) {
      const angle = (crate / 4) * Math.PI * 2 + random() * 0.8;
      const reach = 10 + random() * 20;
      state.pickups.push({ id: state.nextId++, kind: "cell", x: Math.cos(angle) * reach, z: Math.sin(angle) * reach });
    }
  }
  return state;
}

/** How many aliens a wave brings, and which kind each is. */
export function waveRoster(difficulty: SimDifficulty, wave: number, random: () => number = Math.random): AlienKind[] {
  const rules = SIM_DIFFICULTIES[difficulty];
  const count = rules.firstWave + (wave - 1) * rules.growth;
  return Array.from({ length: count }, (_, index) => {
    if (wave >= rules.brutesFrom && index % 6 === 5) return "brute";
    if (wave >= rules.harriersFrom && index % 5 === 2) return "harrier";
    if (wave >= rules.spittersFrom && random() < 0.3) return "spitter";
    return "stalker";
  });
}

function spawn(state: SimState, kind: AlienKind, random: () => number) {
  const rules = SIM_DIFFICULTIES[state.difficulty];
  // Out of the trees, somewhere ahead or behind, never on top of the player; or where the course says.
  const angle = random() * Math.PI * 2;
  const reach = 22 + random() * 8;
  const at = state.course?.spawnAt(state, kind, random) ?? clampToArena(state.player.x + Math.cos(angle) * reach, state.player.z + Math.sin(angle) * reach, 2);
  const health = Math.ceil(ALIENS[kind].health * rules.toughness);
  state.aliens.push({
    id: state.nextId++,
    kind,
    x: at.x,
    z: at.z,
    health,
    maxHealth: health,
    cooldown: 1,
    screamIn: 2 + random() * 5,
    circle: random() < 0.5 ? 1 : -1,
    ...(kind === "harrier" ? { height: HARRIER_CRUISE, volley: 0 } : {}),
  });
  state.events.push({ type: "spawn", kind, x: at.x, z: at.z });
}

/** An alien's blow lands, unless a dash is carrying AXIOM through it. */
function strike(state: SimState, alien: SimAlien) {
  if (state.time < state.player.dodgeUntil) {
    state.events.push({ type: "dodged" });
    return;
  }
  const amount = ALIENS[alien.kind].damage * SIM_DIFFICULTIES[state.difficulty].bite;
  state.player.health -= amount;
  state.player.hurtAt = state.time;
  state.events.push({ type: "strike", kind: alien.kind, x: alien.x, z: alien.z }, { type: "hurt", amount });
}

/**
 * Hurt an alien; at nothing it falls, scores, may drop something, and gives off the
 * Flux the carbine soaks into its cell. Returns whether it fell.
 */
function hurtAlien(state: SimState, alien: SimAlien, damage: number, random: () => number) {
  alien.health -= damage;
  state.events.push({ type: "hit", kind: alien.kind, x: alien.x, z: alien.z });
  if (alien.health > 0) return false;
  const rules = SIM_DIFFICULTIES[state.difficulty];
  const gun = state.player.gun;
  state.aliens = state.aliens.filter((candidate) => candidate !== alien);
  state.kills += 1;
  state.score += Math.round(ALIENS[alien.kind].score * (1 + Math.max(0, state.wave - 1) * 0.1));
  state.events.push({ type: "kill", kind: alien.kind, x: alien.x, z: alien.z });
  const capacity = CELLS[gun.loadout.cell].capacity;
  if (gun.swapUntil === null && gun.charge < capacity) {
    gun.charge = Math.min(capacity, gun.charge + capacity * KILL_FLUX);
    state.events.push({ type: "flux" });
  }
  // On a course nothing drops: the pack feeds the cell and the sim-body mends itself.
  const roll = state.course ? 1 : random();
  if (roll < rules.cellDrop) state.pickups.push({ id: state.nextId++, kind: "cell", x: alien.x, z: alien.z });
  else if (roll < rules.cellDrop + rules.healthDrop) state.pickups.push({ id: state.nextId++, kind: "health", x: alien.x, z: alien.z });
  return true;
}

/** Things close enough to the sim-body's height to be reached from where it is. */
const atHeight = (state: SimState, alien: SimAlien, within: number) => Math.abs((alien.height ?? 0) - state.player.lift) <= within;

/**
 * The Conservation strike: what the fist meets in front of AXIOM is knocked back out of
 * its rush and stunned, and acid in flight close by is sent back at the nearest alien.
 * facing is the way AXIOM looks, along the ground.
 */
export function punch(state: SimState, facingX: number, facingZ: number, random: () => number = Math.random) {
  const player = state.player;
  if (!player.alive || state.time < player.punchReady) return null;
  player.punchReady = state.time + PUNCH.cooldown;
  state.events.push({ type: "punch" });
  let hit = 0;
  for (const alien of [...state.aliens]) {
    const dx = alien.x - player.x;
    const dz = alien.z - player.z;
    const distance = Math.hypot(dx, dz);
    if (!atHeight(state, alien, 2) || distance > PUNCH.reach + ALIENS[alien.kind].radius) continue;
    if (distance > 0.3 && (dx * facingX + dz * facingZ) / distance < PUNCH.cone) continue;
    hit += 1;
    if (hurtAlien(state, alien, PUNCH.damage, random)) continue;
    const away = distance > 0.001 ? { x: dx / distance, z: dz / distance } : { x: facingX, z: facingZ };
    const knock = PUNCH.knock * (alien.kind === "brute" ? 0.35 : 1);
    const at = clampToArena(alien.x + away.x * knock, alien.z + away.z * knock);
    alien.x = at.x;
    alien.z = at.z;
    alien.cooldown = Math.max(alien.cooldown, PUNCH.stagger);
  }
  let parried = 0;
  for (const blob of state.spit) {
    if (blob.reflected || Math.hypot(blob.x - player.x, blob.z - player.z) > PUNCH.reach) continue;
    const target = state.aliens
      .filter((alien) => (alien.height ?? 0) < STRIKE_HEIGHT)
      .sort((a, b) => Math.hypot(a.x - blob.x, a.z - blob.z) - Math.hypot(b.x - blob.x, b.z - blob.z))[0];
    const toX = target ? target.x - blob.x : facingX;
    const toZ = target ? target.z - blob.z : facingZ;
    const length = Math.max(0.001, Math.hypot(toX, toZ));
    blob.dx = (toX / length) * SPIT_SPEED * 1.8;
    blob.dz = (toZ / length) * SPIT_SPEED * 1.8;
    blob.reflected = true;
    blob.life = 2.5;
    parried += 1;
  }
  if (parried > 0) state.events.push({ type: "parry" });
  return { hit, parried };
}

/** A slam's landing: everything on the ground close by is hurt and thrown back, harder from higher up. */
export function slam(state: SimState, strength: number, random: () => number = Math.random) {
  const player = state.player;
  if (!player.alive) return 0;
  state.events.push({ type: "slam" });
  let hit = 0;
  for (const alien of [...state.aliens]) {
    if ((alien.height ?? 0) > STRIKE_HEIGHT) continue;
    const dx = alien.x - player.x;
    const dz = alien.z - player.z;
    const distance = Math.hypot(dx, dz);
    if (distance > SLAM_RADIUS + ALIENS[alien.kind].radius) continue;
    hit += 1;
    if (hurtAlien(state, alien, 1.5 * strength, random)) continue;
    const knock = 3 * strength * (alien.kind === "brute" ? 0.4 : 1);
    const at = clampToArena(alien.x + (dx / Math.max(0.001, distance)) * knock, alien.z + (dz / Math.max(0.001, distance)) * knock);
    alien.x = at.x;
    alien.z = at.z;
    alien.cooldown = Math.max(alien.cooldown, 0.8);
  }
  return hit;
}

/**
 * The Containment tether: the space between AXIOM and what it hooks cannot grow. Anything
 * lighter than a brute is hauled in to arm's length and stunned (a harrier out of the
 * sky); a brute is too heavy, and AXIOM goes to it instead.
 */
export function tetherAlien(state: SimState, id: number): "pulled" | "anchored" | null {
  const player = state.player;
  const alien = state.aliens.find((candidate) => candidate.id === id);
  if (!player.alive || !alien) return null;
  if (alien.kind === "brute") return "anchored";
  const dx = alien.x - player.x;
  const dz = alien.z - player.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  const at = clampToArena(player.x + (dx / distance) * TETHER_HOLD, player.z + (dz / distance) * TETHER_HOLD);
  alien.x = at.x;
  alien.z = at.z;
  alien.cooldown = Math.max(alien.cooldown, 1.1);
  if (alien.kind === "harrier") alien.height = player.lift + 1;
  return "pulled";
}

/** One bolt from a harrier, led toward where AXIOM will be when it lands, a little wide each shot. */
function fireBolt(state: SimState, alien: SimAlien, random: () => number) {
  const { player, track } = state;
  const height = alien.height ?? HARRIER_CRUISE;
  const travel = Math.hypot(player.x - alien.x, player.z - alien.z, height) / BOLT_SPEED;
  const scatter = 0.6 + (VOLLEY - (alien.volley ?? 0)) * 0.9;
  const angle = random() * Math.PI * 2;
  const toX = player.x + track.vx * travel * 0.8 + Math.cos(angle) * scatter;
  const toZ = player.z + track.vz * travel * 0.8 + Math.sin(angle) * scatter;
  const length = Math.max(0.001, Math.hypot(toX - alien.x, toZ - alien.z, height));
  state.bolts.push({
    id: state.nextId++,
    x: alien.x,
    y: height,
    z: alien.z,
    dx: ((toX - alien.x) / length) * BOLT_SPEED,
    dy: (-height / length) * BOLT_SPEED,
    dz: ((toZ - alien.z) / length) * BOLT_SPEED,
    toX,
    toZ,
  });
  state.events.push({ type: "bolt", x: alien.x, y: height, z: alien.z });
}

/** A dash: for a moment nothing can touch the sim-body. */
export function dodge(state: SimState, seconds: number) {
  state.player.dodgeUntil = Math.max(state.player.dodgeUntil, state.time + seconds);
}

/**
 * Advance the simulation by dt seconds, in place: waves arrive, aliens hunt and
 * strike, acid flies, pickups are collected, a reload finishes. The drawing code
 * moves the player (it knows where the trees are) before calling this.
 */
export function stepSim(state: SimState, dt: number, random: () => number = Math.random) {
  if (!state.player.alive) return state;
  const rules = SIM_DIFFICULTIES[state.difficulty];
  const player = state.player;
  state.time += dt;
  if (dt > 0) {
    state.track.vx = (player.x - state.track.x) / dt;
    state.track.vz = (player.z - state.track.z) / dt;
  }
  state.track.x = player.x;
  state.track.z = player.z;

  // The carbine: a cell swap finishes, the coils cool or vent, and under the dome (or off a power pack) the cell fills.
  const pack = state.course?.pack;
  for (const happened of stepCarbine(player.gun, state.time, dt, isPowered(state), RECHARGE_RATE * (pack?.recharge ?? 1))) {
    state.events.push({ type: happened === "swapped" ? "reloaded" : happened });
  }
  // On a course the sim-body mends between blows.
  if (state.course && state.time - player.hurtAt > MEND_DELAY) {
    player.health = Math.min(player.maxHealth, player.health + player.maxHealth * state.course.regen * dt);
  }

  // Waves: a breather, then the next comes out of the jungle a few at a time; on a course, once AXIOM reaches it.
  if (state.roster.length === 0 && state.aliens.length === 0 && state.time >= state.nextArrival) {
    const roster = state.course ? state.course.nextWave(state) : waveRoster(state.difficulty, state.wave + 1, random);
    if (roster) {
      state.wave += 1;
      state.roster = roster;
      state.nextArrival = state.time + 0.5;
      state.events.push({ type: "wave", wave: state.wave });
    } else {
      state.nextArrival = state.time + 0.25;
    }
  }
  if (state.roster.length > 0 && state.time >= state.nextArrival && state.aliens.length < rules.crowd) {
    spawn(state, state.roster.shift()!, random);
    state.nextArrival = state.roster.length > 0 ? state.time + rules.arrival * (0.6 + random() * 0.8) : Infinity;
  }

  // The aliens hunt.
  for (const alien of state.aliens) {
    const kind = ALIENS[alien.kind];
    const dx = player.x - alien.x;
    const dz = player.z - alien.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const speed = kind.speed * rules.pace;
    alien.cooldown -= dt;
    alien.screamIn -= dt;
    if (alien.screamIn <= 0) {
      alien.screamIn = 4 + random() * 5;
      state.events.push({ type: "scream", kind: alien.kind, x: alien.x, z: alien.z });
    }
    let moveX = 0;
    let moveZ = 0;
    if (alien.kind === "spitter") {
      // Keep at a spitting distance, circling; lob acid when ready.
      const want = distance > 11 ? 1 : distance < 7 ? -1 : 0;
      moveX = (dx / distance) * want + (-dz / distance) * 0.6 * alien.circle;
      moveZ = (dz / distance) * want + (dx / distance) * 0.6 * alien.circle;
      if (alien.cooldown <= 0 && distance <= kind.reach + 4) {
        alien.cooldown = kind.cooldown * (0.8 + random() * 0.4);
        state.spit.push({ id: state.nextId++, x: alien.x, z: alien.z, dx: (dx / distance) * SPIT_SPEED, dz: (dz / distance) * SPIT_SPEED, life: 2.4 });
        state.events.push({ type: "spit", x: alien.x, z: alien.z });
      }
    } else if (alien.kind === "harrier") {
      // It holds the sky, circling wide, and shoots down at where AXIOM is headed. It never comes down.
      const height = alien.height ?? HARRIER_CRUISE;
      // Under a low ceiling it holds lower.
      const cruise = Math.min(HARRIER_CRUISE, (state.course?.ceilingAt(alien.x, alien.z) ?? Infinity) - 1.5);
      const want = distance > HARRIER_RING + 2 ? 1 : distance < HARRIER_RING - 2 ? -1 : 0;
      moveX = (dx / distance) * want + (-dz / distance) * alien.circle;
      moveZ = (dz / distance) * want + (dx / distance) * alien.circle;
      alien.height = height + (cruise - height) * Math.min(1, dt * 1.5);
      if (alien.cooldown <= 0) {
        if (!alien.volley) {
          alien.volley = VOLLEY;
          state.events.push({ type: "scream", kind: alien.kind, x: alien.x, z: alien.z });
        }
        fireBolt(state, alien, random);
        alien.volley -= 1;
        alien.cooldown = alien.volley > 0 ? VOLLEY_GAP : kind.cooldown * (0.8 + random() * 0.4);
      }
    } else if (distance > kind.reach * 0.8) {
      moveX = dx / distance;
      moveZ = dz / distance;
    } else if (alien.cooldown <= 0 && player.lift < STRIKE_HEIGHT) {
      alien.cooldown = kind.cooldown;
      strike(state, alien);
    }
    // They keep a little apart rather than stacking into one (fliers among fliers).
    for (const other of state.aliens) {
      if (other === alien || (other.kind === "harrier") !== (alien.kind === "harrier")) continue;
      const apart = Math.hypot(alien.x - other.x, alien.z - other.z);
      const room = kind.radius + ALIENS[other.kind].radius;
      if (apart > 0.001 && apart < room) {
        moveX += ((alien.x - other.x) / apart) * (room - apart);
        moveZ += ((alien.z - other.z) / apart) * (room - apart);
      }
    }
    const length = Math.hypot(moveX, moveZ);
    if (length > 0.001) {
      const step = Math.min(length, 1.5) / length;
      const toX = alien.x + moveX * step * speed * dt;
      const toZ = alien.z + moveZ * step * speed * dt;
      const at = state.course ? state.course.confine(toX, toZ, kind.radius) : clampToArena(toX, toZ);
      alien.x = at.x;
      alien.z = at.z;
    }
    // Nor does the crowd shove one into AXIOM's own frame.
    const close = Math.hypot(alien.x - player.x, alien.z - player.z);
    const room = kind.radius + 0.6;
    const level = Math.abs((alien.height ?? 0) - player.lift) < 1.5;
    if (close < room && close > 0.001 && level) {
      alien.x = player.x + ((alien.x - player.x) / close) * room;
      alien.z = player.z + ((alien.z - player.z) / close) * room;
    }
  }

  // Acid in flight: it hits if it reaches the player (unless a dash carries it clear), and is
  // gone once spent. Acid punched back burns whatever it meets instead.
  for (const blob of state.spit) {
    blob.x += blob.dx * dt;
    blob.z += blob.dz * dt;
    blob.life -= dt;
    if (blob.reflected) {
      const struck = state.aliens.find((alien) => (alien.height ?? 0) < STRIKE_HEIGHT && Math.hypot(alien.x - blob.x, alien.z - blob.z) < ALIENS[alien.kind].radius + 0.4);
      if (struck) {
        blob.life = 0;
        hurtAlien(state, struck, REFLECT_DAMAGE, random);
      }
      continue;
    }
    if (Math.hypot(blob.x - player.x, blob.z - player.z) < SPIT_HIT && player.lift < STRIKE_HEIGHT - 0.2) {
      blob.life = 0;
      if (state.time < player.dodgeUntil) {
        state.events.push({ type: "dodged" });
        continue;
      }
      const amount = ALIENS.spitter.damage * rules.bite;
      player.health -= amount;
      player.hurtAt = state.time;
      state.events.push({ type: "hurt", amount });
    }
  }
  state.spit = state.spit.filter((blob) => blob.life > 0);

  // Bolts from the sky: they hit what is in their way, and burst where they meet the ground.
  const boltDamage = ALIENS.harrier.damage * rules.bite;
  const boltHurts = (amount: number) => {
    if (state.time < player.dodgeUntil) {
      state.events.push({ type: "dodged" });
      return;
    }
    player.health -= amount;
    player.hurtAt = state.time;
    state.events.push({ type: "hurt", amount });
  };
  for (const bolt of state.bolts) {
    bolt.x += bolt.dx * dt;
    bolt.y += bolt.dy * dt;
    bolt.z += bolt.dz * dt;
    if (Math.hypot(bolt.x - player.x, bolt.y - (player.lift + 1), bolt.z - player.z) < BOLT_HIT) {
      bolt.y = -1;
      boltHurts(boltDamage);
    } else if (bolt.y <= 0.2) {
      bolt.y = -1;
      state.events.push({ type: "blast", x: bolt.x, z: bolt.z });
      if (Math.hypot(bolt.x - player.x, bolt.z - player.z) < BOLT_SPLASH && player.lift < STRIKE_HEIGHT) boltHurts(boltDamage * 0.6);
    }
  }
  state.bolts = state.bolts.filter((bolt) => bolt.y >= 0);

  // Walk over a pickup to take it.
  state.pickups = state.pickups.filter((pickup) => {
    if (Math.hypot(pickup.x - player.x, pickup.z - player.z) > PICKUP_REACH) return true;
    if (pickup.kind === "health" && player.health >= player.maxHealth) return true;
    if (pickup.kind === "cell") player.gun.spare += 1;
    else player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.3);
    state.events.push({ type: "pickup", kind: pickup.kind });
    return false;
  });

  if (player.health <= 0) {
    player.health = 0;
    player.alive = false;
    state.events.push({ type: "death" });
  }
  // After a wave's last alien falls, a breather before the next, and the drill it earned.
  if (state.roster.length === 0 && state.aliens.length === 0 && state.nextArrival === Infinity) {
    state.nextArrival = state.time + BREATHER;
    if (player.alive) {
      const drill = Math.min(rules.drill, DRILL_CAP_SECONDS - state.drilled);
      state.cleared = state.wave;
      state.drilled += drill;
      state.events.push({ type: "cleared", wave: state.wave, drill });
    }
  }
  return state;
}

/** Whether the sim-body stands under the training dome, where the cell draws power. */
export const underDome = (state: SimState) => Math.hypot(state.player.x - SIM_DOME.x, state.player.z - SIM_DOME.z) <= SIM_DOME.radius;
/** Whether the cell is drawing power: under the dome, or always, off a course's power pack. */
export const isPowered = (state: SimState) => Boolean(state.course) || underDome(state);

/** Change the carbine's cell, if there is a spare and the seated one has room. */
export function reloadCarbine(state: SimState) {
  if (!state.player.alive || !swapCell(state.player.gun, state.time)) return false;
  state.events.push({ type: "reload" });
  return true;
}

/** What each bolt of a shot hit, by alien id; or one id (or nothing) for every bolt. */
export type BoltAim = number | null | ((discharge: Discharge) => readonly (number | null)[]);

/**
 * Pull the trigger. The drawing code works out what each bolt would hit, given how
 * many there are and how far they may stray; this decides whether the carbine fires
 * at all and what the bolts do. An empty cell clicks and starts a swap; past the
 * coils' limit the carbine vents. A shot on the Law-Heart's beat (resonant) strikes
 * harder. Away from the dome, a cell too low for another shot is swapped for a spare
 * straight away.
 */
export function fireCarbine(state: SimState, aim: BoltAim, random: () => number = Math.random, resonant = false): Discharge | null {
  const player = state.player;
  if (!player.alive) return null;
  const shot = pullTrigger(player.gun, state.time);
  if (shot === "dry") {
    state.events.push({ type: "dry" });
    if (player.gun.swapUntil !== null) state.events.push({ type: "reload" });
    return null;
  }
  if (typeof shot === "string") return null;
  state.events.push({ type: "shot" });
  if (resonant) state.events.push({ type: "resonant" });
  if (shot.vent) state.events.push({ type: "vent" });
  const hits = typeof aim === "function" ? aim(shot) : Array.from({ length: shot.bolts }, () => aim);
  const damage = shot.damage * (resonant ? RESONANT : 1) * (state.course?.pack.damage ?? 1);
  for (const hitId of hits) {
    const alien = hitId === null ? undefined : state.aliens.find((candidate) => candidate.id === hitId);
    if (alien) hurtAlien(state, alien, damage, random);
  }
  if (player.gun.charge < FORMS[player.gun.loadout.form].cost && !isPowered(state)) reloadCarbine(state);
  return shot;
}
