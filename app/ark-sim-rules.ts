/*
 * The combat simulation's rules. Not everyone who comes aboard the Ark is ready
 * to fight, so the Recon Dock has a simulator: a jungle that never was, full of
 * alien things that scream and charge. Crew drill in it; AXIOM can step in too.
 *
 * Waves of aliens come out of the jungle: stalkers that run you down, spitters
 * that hang back and lob acid, and brutes that take a cell to drop. You have
 * the Arc Carbine (arc-carbine.ts), a health bar and what spare cells you can
 * find; the training dome over the clearing where a run begins recharges the
 * seated cell. How many cells there are, and how hard they hit, is set by the
 * difficulty. Every wave AXIOM clears
 * is a live drill for the crew training as Security in the pods around it:
 * minutes of their training, more on harder settings, capped for each run.
 * Pure rules, advanced in place; ark-sim.ts draws the jungle and
 * ark-sim-audio.ts gives it voice.
 */

import { createCarbine, DEFAULT_LOADOUT, FORMS, pullTrigger, stepCarbine, swapCell, type Carbine, type CarbineLoadout, type Discharge } from "./arc-carbine.ts";

export type SimDifficulty = "recruit" | "soldier" | "veteran";
export type AlienKind = "stalker" | "spitter" | "brute";

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
  /** The wave spitters, then brutes, first appear in. */
  spittersFrom: number;
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
    spittersFrom: 3, brutesFrom: 5,
    drill: 60,
  },
  soldier: {
    label: "Soldier",
    blurb: "A fair fight. Spare cells are wherever you find them; the dome recharges yours.",
    playerHealth: 100, toughness: 1, pace: 1, bite: 1,
    firstWave: 5, growth: 3, crowd: 9, arrival: 1.1,
    cells: 3, cellDrop: 0.3, healthDrop: 0.1,
    spittersFrom: 2, brutesFrom: 3,
    drill: 120,
  },
  veteran: {
    label: "Veteran",
    blurb: "They are fast, they hit hard, and spare cells are scarce.",
    playerHealth: 80, toughness: 1.35, pace: 1.25, bite: 1.5,
    firstWave: 7, growth: 4, crowd: 12, arrival: 0.8,
    cells: 1, cellDrop: 0.18, healthDrop: 0.06,
    spittersFrom: 1, brutesFrom: 2,
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
  stalker: { health: 3, speed: 4.2, damage: 12, reach: 1.8, cooldown: 0.9, radius: 0.6, score: 100 },
  spitter: { health: 2, speed: 2.6, damage: 9, reach: 11, cooldown: 2.2, radius: 0.7, score: 150 },
  brute: { health: 10, speed: 2.1, damage: 26, reach: 2.3, cooldown: 1.6, radius: 1.1, score: 400 },
};

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
  /** A spitter's preferred side when circling. */
  circle: 1 | -1;
};

export type SimSpit = { id: number; x: number; z: number; dx: number; dz: number; life: number };
export type SimPickup = { id: number; kind: "cell" | "health"; x: number; z: number };

export type SimEvent =
  | { type: "wave"; wave: number }
  /** A wave's last alien fell; drill is the Security training it earned the trainees. */
  | { type: "cleared"; wave: number; drill: number }
  | { type: "spawn" | "scream" | "strike" | "kill"; kind: AlienKind; x: number; z: number }
  | { type: "spit"; x: number; z: number }
  | { type: "hit"; kind: AlienKind; x: number; z: number }
  | { type: "hurt"; amount: number }
  | { type: "shot" | "dry" | "reload" | "reloaded" | "vent" | "vented" | "charged" | "death" }
  | { type: "pickup"; kind: SimPickup["kind"] };

export type SimState = {
  difficulty: SimDifficulty;
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
  };
  aliens: SimAlien[];
  spit: SimSpit[];
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
export function createSim(difficulty: SimDifficulty, random: () => number = Math.random, loadout: CarbineLoadout = DEFAULT_LOADOUT): SimState {
  const rules = SIM_DIFFICULTIES[difficulty];
  const state: SimState = {
    difficulty,
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
      gun: createCarbine(loadout, rules.cells),
      alive: true,
    },
    aliens: [],
    spit: [],
    pickups: [],
    nextId: 1,
    events: [],
  };
  if (Number.isFinite(rules.cells)) {
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
    if (wave >= rules.spittersFrom && random() < 0.3) return "spitter";
    return "stalker";
  });
}

function spawn(state: SimState, kind: AlienKind, random: () => number) {
  const rules = SIM_DIFFICULTIES[state.difficulty];
  // Out of the trees, somewhere ahead or behind, never on top of the player.
  const angle = random() * Math.PI * 2;
  const reach = 22 + random() * 8;
  const at = clampToArena(state.player.x + Math.cos(angle) * reach, state.player.z + Math.sin(angle) * reach, 2);
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
  });
  state.events.push({ type: "spawn", kind, x: at.x, z: at.z });
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

  // The carbine: a cell swap finishes, the coils cool or vent, and under the dome the cell fills.
  for (const happened of stepCarbine(player.gun, state.time, dt, underDome(state))) {
    state.events.push({ type: happened === "swapped" ? "reloaded" : happened });
  }

  // Waves: a breather, then the next comes out of the jungle a few at a time.
  if (state.roster.length === 0 && state.aliens.length === 0 && state.time >= state.nextArrival) {
    state.wave += 1;
    state.roster = waveRoster(state.difficulty, state.wave, random);
    state.nextArrival = state.time + 0.5;
    state.events.push({ type: "wave", wave: state.wave });
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
    } else if (distance > kind.reach * 0.8) {
      moveX = dx / distance;
      moveZ = dz / distance;
    } else if (alien.cooldown <= 0) {
      alien.cooldown = kind.cooldown;
      const amount = kind.damage * rules.bite;
      player.health -= amount;
      state.events.push({ type: "strike", kind: alien.kind, x: alien.x, z: alien.z }, { type: "hurt", amount });
    }
    // They keep a little apart rather than stacking into one.
    for (const other of state.aliens) {
      if (other === alien) continue;
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
      const at = clampToArena(alien.x + moveX * step * speed * dt, alien.z + moveZ * step * speed * dt);
      alien.x = at.x;
      alien.z = at.z;
    }
    // Nor does the crowd shove one into AXIOM's own frame.
    const close = Math.hypot(alien.x - player.x, alien.z - player.z);
    const room = kind.radius + 0.6;
    if (close < room && close > 0.001) {
      alien.x = player.x + ((alien.x - player.x) / close) * room;
      alien.z = player.z + ((alien.z - player.z) / close) * room;
    }
  }

  // Acid in flight: it hits if it reaches the player, and is gone once spent.
  for (const blob of state.spit) {
    blob.x += blob.dx * dt;
    blob.z += blob.dz * dt;
    blob.life -= dt;
    if (Math.hypot(blob.x - player.x, blob.z - player.z) < SPIT_HIT) {
      blob.life = 0;
      const amount = ALIENS.spitter.damage * rules.bite;
      player.health -= amount;
      state.events.push({ type: "hurt", amount });
    }
  }
  state.spit = state.spit.filter((blob) => blob.life > 0);

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
 * coils' limit the carbine vents. Away from the dome, a cell too low for another
 * shot is swapped for a spare straight away.
 */
export function fireCarbine(state: SimState, aim: BoltAim, random: () => number = Math.random): Discharge | null {
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
  if (shot.vent) state.events.push({ type: "vent" });
  const hits = typeof aim === "function" ? aim(shot) : Array.from({ length: shot.bolts }, () => aim);
  const rules = SIM_DIFFICULTIES[state.difficulty];
  for (const hitId of hits) {
    const alien = hitId === null ? undefined : state.aliens.find((candidate) => candidate.id === hitId);
    if (!alien) continue;
    alien.health -= shot.damage;
    state.events.push({ type: "hit", kind: alien.kind, x: alien.x, z: alien.z });
    if (alien.health > 0) continue;
    state.aliens = state.aliens.filter((candidate) => candidate !== alien);
    state.kills += 1;
    state.score += Math.round(ALIENS[alien.kind].score * (1 + Math.max(0, state.wave - 1) * 0.1));
    state.events.push({ type: "kill", kind: alien.kind, x: alien.x, z: alien.z });
    const roll = random();
    if (roll < rules.cellDrop) state.pickups.push({ id: state.nextId++, kind: "cell", x: alien.x, z: alien.z });
    else if (roll < rules.cellDrop + rules.healthDrop) state.pickups.push({ id: state.nextId++, kind: "health", x: alien.x, z: alien.z });
  }
  if (player.gun.charge < FORMS[player.gun.loadout.form].cost && !underDome(state)) reloadCarbine(state);
  return shot;
}
