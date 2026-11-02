/*
 * The Extraction simulation's rules. Lawless humans, the Wreckers, hold a group of
 * survivors in an abandoned relay station; AXIOM's sim-body goes in from the
 * shuttle, frees them and brings them out. Wreckers patrol and listen, and raise
 * the alarm when they see you. Aliens wait in the dark and hunt anything alive.
 * The Hollowed, people the Null has taken entirely (not the Altered, who are still
 * themselves), drift until something makes a sound, then stutter towards it.
 * Everyone hears: footsteps, gunfire and doors carry, softened by every wall
 * between. Pure rules, advanced in place; ark-ops.ts draws them and
 * ark-ops-audio.ts gives them voice.
 */

import { ALIENS, CARBINE, DRILL_CAP_SECONDS, SIM_DIFFICULTIES, type SimDifficulty } from "./ark-sim-rules.ts";
import {
  buildRelayStation,
  doorOpen,
  findPath,
  inRect,
  lineOfSight,
  moveBody,
  roomAt,
  tileAt,
  tileIndex,
  wallsBetween,
  type OpsMap,
  type OpsPoint,
} from "./ark-ops-map.ts";

export const OPS_DIFFICULTIES: Record<SimDifficulty, {
  wreckers: number;
  aliens: number;
  hollowed: number;
  /** A Wrecker's chance to hit at close range, and what a round does. */
  aim: number;
  damage: number;
  /** How fast a Wrecker who can see you becomes sure of it. */
  spot: number;
  wreckerHealth: number;
  alienSpeed: number;
  playerHealth: number;
  reserve: number;
}> = {
  recruit: { wreckers: 4, aliens: 2, hollowed: 1, aim: 0.3, damage: 8, spot: 0.55, wreckerHealth: 3, alienSpeed: 3.1, playerHealth: 150, reserve: Infinity },
  soldier: { wreckers: 5, aliens: 3, hollowed: 2, aim: 0.42, damage: 12, spot: 0.85, wreckerHealth: 4, alienSpeed: 3.7, playerHealth: 100, reserve: 120 },
  veteran: { wreckers: 7, aliens: 3, hollowed: 2, aim: 0.55, damage: 15, spot: 1.2, wreckerHealth: 4, alienSpeed: 4.2, playerHealth: 80, reserve: 72 },
};

/** How fast the sim-body moves, and how far its footsteps carry (metres, through open air). */
export const OPS_GAITS = {
  run: { speed: 6.2, stride: 0.95, noise: 15 },
  walk: { speed: 3.6, stride: 0.75, noise: 6 },
  crouch: { speed: 1.8, stride: 0.6, noise: 2.2 },
} as const;
export type OpsGait = keyof typeof OPS_GAITS;
const GUNFIRE = 42;
const ENEMY_GUNFIRE = 32;
const DOOR_NOISE = 9;
const BODY = 0.3;
const SIGHT_RANGE = 24;
const SIGHT_HALF_ANGLE = (62 * Math.PI) / 180;
const FREE_SECONDS = 2.2;
const LEAVE_SECONDS = 2;
const HOLLOWED_HEALTH = 5;
const SURVIVOR_HEALTH = 60;
const SURVIVOR_NAMES = ["Ama Reyes", "Tobin Ash", "Lio Marsh", "Nessa Coil", "Pell Varga", "Ruth Okafor", "Sami Dune", "Ivo Brandt"];

export type OpsKind = "wrecker" | "alien" | "hollowed";
export type OpsMode = "guard" | "patrol" | "investigate" | "combat" | "search" | "dormant" | "hunt" | "wander";
export type OpsTarget = { kind: "player" } | { kind: "agent"; id: number } | { kind: "survivor"; id: number };

export type OpsAgent = {
  id: number;
  kind: OpsKind;
  x: number;
  z: number;
  /** Which way they face: their forward is (sin facing, cos facing). */
  facing: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  mode: OpsMode;
  home: OpsPoint;
  homeFacing: number;
  /** A patroller walks between patrol points; anyone else keeps to their post. */
  patrols: boolean;
  path: OpsPoint[];
  goal: OpsPoint | null;
  replanIn: number;
  wait: number;
  cooldown: number;
  burst: number;
  /** 0 to 1: how sure a Wrecker is that they have seen someone. */
  spot: number;
  target: OpsTarget | null;
  lastSeen: OpsPoint | null;
  lostFor: number;
  modeTime: number;
  stride: number;
  voiceIn: number;
  skipIn: number;
  opening: number;
  moving: boolean;
  diedAt: number;
  /** Where a standing guard is looking. */
  look: number;
};

export type OpsSurvivor = {
  id: number;
  name: string;
  x: number;
  z: number;
  facing: number;
  health: number;
  state: "held" | "following" | "safe" | "lost";
  path: OpsPoint[];
  replanIn: number;
  stride: number;
  moving: boolean;
};

export type OpsPickup = { id: number; kind: "ammo" | "medkit"; x: number; z: number };

export type OpsEvent =
  | { type: "step"; who: "player" | "survivor" | OpsKind; x: number; z: number; gait: OpsGait | "skitter" | "drag" }
  | { type: "shot"; who: "player" | "wrecker"; id: number; x: number; z: number; tx: number; tz: number; hit: boolean }
  | { type: "hit"; id: number; kind: OpsKind | "survivor"; x: number; z: number; head: boolean }
  | { type: "death"; id: number; kind: OpsKind; x: number; z: number }
  | { type: "hurt"; amount: number; x: number; z: number }
  | { type: "survivor-hurt" | "survivor-lost"; id: number; name: string; x: number; z: number }
  | { type: "door"; index: number; open: boolean; x: number; z: number }
  | { type: "shout" | "bark" | "chitter" | "scream" | "whisper" | "scratch" | "strike"; id: number; kind: OpsKind; x: number; z: number }
  | { type: "skip"; id: number; x: number; z: number; fromX: number; fromZ: number }
  | { type: "freed" | "reload" | "reloaded" | "dry" | "alarm" | "death-player" }
  | { type: "pickup"; kind: OpsPickup["kind"] }
  | { type: "extracted"; saved: number; drill: number }
  | { type: "failed"; reason: string };

export type OpsInput = {
  forward: number;
  strafe: number;
  /** The camera's heading: forward is (-sin yaw, -cos yaw), as in the drone view. */
  yaw: number;
  sprint: boolean;
  crouched: boolean;
  aiming: boolean;
  light: boolean;
  interact: boolean;
};

export type OpsState = {
  difficulty: SimDifficulty;
  map: OpsMap;
  time: number;
  doors: boolean[];
  player: {
    x: number;
    z: number;
    yaw: number;
    health: number;
    maxHealth: number;
    magazine: number;
    reserve: number;
    reloadDone: number | null;
    lastShot: number;
    alive: boolean;
    crouched: boolean;
    aiming: boolean;
    light: boolean;
    speed: number;
    stride: number;
  };
  agents: OpsAgent[];
  survivors: OpsSurvivor[];
  pickups: OpsPickup[];
  /** Raised once any Wrecker is sure they have seen the sim-body; it stays raised. */
  alarm: boolean;
  /** For the heads-up display: how close any Wrecker is to seeing you, 0 to 1. */
  spotted: number;
  freeing: number;
  leaving: number;
  outcome: null | "extracted" | "failed";
  failure: string | null;
  saved: number;
  kills: number;
  score: number;
  /** Seconds of Security training the run earned the trainees, set on extraction. */
  drill: number;
  nextId: number;
  interactWas: boolean;
  events: OpsEvent[];
};

const angleTo = (from: OpsPoint, to: OpsPoint) => Math.atan2(to.x - from.x, to.z - from.z);
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const distance = (a: OpsPoint, b: OpsPoint) => Math.hypot(a.x - b.x, a.z - b.z);

/** A fresh mission: the sim-body by the shuttle, the station manned, the survivors held. */
export function createOps(difficulty: SimDifficulty, random: () => number = Math.random): OpsState {
  const map = buildRelayStation();
  const rules = OPS_DIFFICULTIES[difficulty];
  const state: OpsState = {
    difficulty,
    map,
    time: 0,
    doors: map.doors.map(() => false),
    player: {
      ...map.spawn.player,
      yaw: -Math.PI / 2,
      health: rules.playerHealth,
      maxHealth: rules.playerHealth,
      magazine: CARBINE.magazine,
      reserve: rules.reserve,
      reloadDone: null,
      lastShot: -Infinity,
      alive: true,
      crouched: false,
      aiming: false,
      light: true,
      speed: 0,
      stride: 0,
    },
    agents: [],
    survivors: [],
    pickups: [],
    alarm: false,
    spotted: 0,
    freeing: 0,
    leaving: 0,
    outcome: null,
    failure: null,
    saved: 0,
    kills: 0,
    score: 0,
    drill: 0,
    nextId: 1,
    interactWas: false,
    events: [],
  };
  // The kitchen door stands open; the rest are shut.
  state.doors[4] = true;
  const agent = (kind: OpsKind, at: OpsPoint, mode: OpsMode, patrols: boolean, health: number): OpsAgent => {
    const room = roomAt(map, at.x, at.z);
    const facing = room ? angleTo(at, { x: (room.x0 + room.x1) / 2, z: (room.z0 + room.z1) / 2 }) : random() * Math.PI * 2;
    return {
      id: state.nextId++, kind, x: at.x, z: at.z, facing, health, maxHealth: health, alive: true, mode,
      home: { ...at }, homeFacing: facing, patrols, path: [], goal: null, replanIn: 0, wait: 1 + random() * 3,
      cooldown: 0, burst: 0, spot: 0, target: null, lastSeen: null, lostFor: 0, modeTime: 0, stride: 0,
      voiceIn: 4 + random() * 12, skipIn: 1, opening: 0, moving: false, diedAt: 0, look: facing,
    };
  };
  const posts = [
    ...map.spawn.guards.map((at) => ({ at, patrols: false })),
    ...map.spawn.patrols.map((at) => ({ at, patrols: true })),
    ...map.spawn.extras.map((at) => ({ at, patrols: true })),
  ].slice(0, rules.wreckers);
  for (const post of posts) state.agents.push(agent("wrecker", post.at, post.patrols ? "patrol" : "guard", post.patrols, rules.wreckerHealth));
  for (const at of map.spawn.aliens.slice(0, rules.aliens)) state.agents.push(agent("alien", at, "dormant", false, ALIENS.stalker.health));
  for (const at of map.spawn.hollowed.slice(0, rules.hollowed)) state.agents.push(agent("hollowed", at, "wander", false, HOLLOWED_HEALTH));
  const names = [...SURVIVOR_NAMES].sort(() => random() - 0.5);
  map.spawn.survivors.forEach((at, index) => {
    state.survivors.push({
      id: state.nextId++, name: names[index], x: at.x, z: at.z, facing: random() * Math.PI * 2,
      health: SURVIVOR_HEALTH, state: "held", path: [], replanIn: 0, stride: 0, moving: false,
    });
  });
  for (const at of map.spawn.ammo) state.pickups.push({ id: state.nextId++, kind: "ammo", ...at });
  for (const at of map.spawn.medkits) state.pickups.push({ id: state.nextId++, kind: "medkit", ...at });
  return state;
}

const playerPoint = (state: OpsState): OpsPoint => ({ x: state.player.x, z: state.player.z });

function targetBody(state: OpsState, target: OpsTarget | null): (OpsPoint & { alive: boolean; low: boolean }) | null {
  if (!target) return null;
  if (target.kind === "player") return { x: state.player.x, z: state.player.z, alive: state.player.alive, low: state.player.crouched };
  if (target.kind === "agent") {
    const agent = state.agents.find((candidate) => candidate.id === target.id);
    return agent ? { x: agent.x, z: agent.z, alive: agent.alive, low: false } : null;
  }
  const survivor = state.survivors.find((candidate) => candidate.id === target.id);
  return survivor ? { x: survivor.x, z: survivor.z, alive: survivor.state === "held" || survivor.state === "following", low: false } : null;
}

/** Can this agent see that point? Wreckers look ahead of them unless already fighting; the rest sense all round. */
function sees(state: OpsState, agent: OpsAgent, at: OpsPoint, range: number, low: boolean, cone: boolean) {
  const apart = distance(agent, at);
  if (apart > range) return false;
  if (cone && apart > 2.5 && Math.abs(wrap(angleTo(agent, at) - agent.facing)) > SIGHT_HALF_ANGLE) return false;
  return lineOfSight(state.map, state.doors, agent, at, low);
}

type NoiseSource = { kind: "player" } | { kind: "agent"; id: number; agentKind: OpsKind } | { kind: "survivor" } | { kind: "gun"; by: "player" | "wrecker" } | { kind: "door" };

/** A sound at (x, z) reaching everyone close enough, less far through every wall in between. */
function noise(state: OpsState, x: number, z: number, loudness: number, source: NoiseSource) {
  const at = { x, z };
  for (const agent of state.agents) {
    if (!agent.alive) continue;
    if (source.kind === "agent") {
      if (source.id === agent.id) continue;
      // Wreckers know their own people's steps; the monsters ignore each other.
      if (agent.kind === "wrecker" && source.agentKind === "wrecker") continue;
      if (agent.kind !== "wrecker" && source.agentKind !== "wrecker") continue;
    }
    const apart = distance(agent, at);
    if (apart > loudness) continue;
    if (apart > loudness / (1 + wallsBetween(state.map, state.doors, at, agent) * 1.2)) continue;
    hear(state, agent, at, source);
  }
}

function hear(state: OpsState, agent: OpsAgent, at: OpsPoint, source: NoiseSource) {
  if (agent.kind === "wrecker") {
    if (agent.mode === "combat") return;
    if (agent.mode !== "investigate") state.events.push({ type: "bark", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
    setMode(agent, "investigate");
    agent.goal = { ...at };
    agent.wait = 0;
    return;
  }
  if (agent.mode === "dormant") state.events.push({ type: "scream", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
  if (agent.mode !== "hunt") setMode(agent, "hunt");
  // A gunshot pulls them even off a chase; anything else only if they have nothing better.
  if (!agent.target || source.kind === "gun") {
    agent.goal = { ...at };
    agent.replanIn = 0;
  }
}

function setMode(agent: OpsAgent, mode: OpsMode) {
  if (agent.mode === mode) return;
  agent.mode = mode;
  agent.modeTime = 0;
  agent.path = [];
  agent.replanIn = 0;
}

function raiseAlarm(state: OpsState, by: OpsAgent, at: OpsPoint) {
  state.events.push({ type: "shout", id: by.id, kind: by.kind, x: by.x, z: by.z });
  if (state.alarm) return;
  state.alarm = true;
  state.events.push({ type: "alarm" });
  // Every Wrecker not already fighting comes to look.
  for (const other of state.agents) {
    if (!other.alive || other.kind !== "wrecker" || other === by || other.mode === "combat") continue;
    setMode(other, "investigate");
    other.goal = { ...at };
  }
}

function engage(agent: OpsAgent, target: OpsTarget, at: OpsPoint) {
  setMode(agent, "combat");
  agent.target = target;
  agent.lastSeen = { ...at };
  agent.lostFor = 0;
  agent.cooldown = Math.max(agent.cooldown, 0.45);
}

function turnToward(agent: { facing: number }, angle: number, amount: number) {
  const delta = wrap(angle - agent.facing);
  agent.facing = wrap(agent.facing + Math.max(-amount, Math.min(amount, delta)));
}

/**
 * Walk a body along its path, opening a shut door in the way first if it can.
 * True once it has arrived (or has no path).
 */
function walk(
  state: OpsState,
  body: OpsAgent | OpsSurvivor,
  speed: number,
  dt: number,
  opener: number | null,
  onStep: (gaitDistance: number) => void,
) {
  const next = body.path[0];
  body.moving = false;
  if (!next) return true;
  const i = Math.floor(next.x);
  const j = Math.floor(next.z);
  if (tileAt(state.map, i, j) === "door" && !doorOpen(state.map, state.doors, i, j)) {
    if (opener === null || !("opening" in body)) {
      body.path = [];
      return true;
    }
    body.opening += dt;
    if (body.kind === "alien" && Math.floor((body.opening - dt) / 0.45) !== Math.floor(body.opening / 0.45)) {
      state.events.push({ type: "scratch", id: body.id, kind: body.kind, x: body.x, z: body.z });
    }
    if (body.opening >= opener) {
      body.opening = 0;
      setDoor(state, state.map.doorAt.get(tileIndex(state.map, i, j))!, true);
    }
    return false;
  }
  const dx = next.x - body.x;
  const dz = next.z - body.z;
  const apart = Math.hypot(dx, dz);
  if (apart < 0.15) {
    body.path.shift();
    return body.path.length === 0;
  }
  const step = Math.min(apart, speed * dt);
  const at = moveBody(state.map, state.doors, body.x, body.z, (dx / apart) * step, (dz / apart) * step, BODY);
  const moved = Math.hypot(at.x - body.x, at.z - body.z);
  body.x = at.x;
  body.z = at.z;
  body.moving = moved > 0.0005;
  turnToward(body, Math.atan2(dx, dz), dt * 8);
  if (moved < step * 0.2) {
    // Snagged on something: try again from here.
    body.path = [];
    return true;
  }
  onStep(moved);
  return false;
}

/** Plan a route for this body to a point, if it does not have a fresh one. */
function headFor(state: OpsState, body: OpsAgent | OpsSurvivor, goal: OpsPoint, opensDoors: boolean, every = 0.6) {
  if (body.path.length > 0 && body.replanIn > 0) return;
  body.replanIn = every;
  body.path = findPath(state.map, state.doors, body, goal, opensDoors) ?? [];
}

function setDoor(state: OpsState, index: number, open: boolean) {
  if (state.doors[index] === open) return;
  state.doors[index] = open;
  const door = state.map.doors[index];
  state.events.push({ type: "door", index, open, x: door.i + 0.5, z: door.j + 0.5 });
  noise(state, door.i + 0.5, door.j + 0.5, DOOR_NOISE, { kind: "door" });
}

function hurtPlayer(state: OpsState, amount: number, from: OpsPoint) {
  const player = state.player;
  if (!player.alive) return;
  player.health -= amount;
  state.events.push({ type: "hurt", amount, x: from.x, z: from.z });
  if (player.health <= 0) {
    player.health = 0;
    player.alive = false;
    state.events.push({ type: "death-player" });
    fail(state, "The sim-body went down");
  }
}

function hurtSurvivor(state: OpsState, survivor: OpsSurvivor, amount: number) {
  if (survivor.state !== "held" && survivor.state !== "following") return;
  survivor.health -= amount;
  state.events.push({ type: "survivor-hurt", id: survivor.id, name: survivor.name, x: survivor.x, z: survivor.z });
  if (survivor.health > 0) return;
  survivor.health = 0;
  survivor.state = "lost";
  state.events.push({ type: "survivor-lost", id: survivor.id, name: survivor.name, x: survivor.x, z: survivor.z });
  if (state.survivors.every((other) => other.state === "lost")) fail(state, "Every survivor was lost");
}

function hurtAgent(state: OpsState, agent: OpsAgent, amount: number, head: boolean, by: OpsTarget, from: OpsPoint) {
  if (!agent.alive) return;
  agent.health -= amount;
  state.events.push({ type: "hit", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z, head });
  if (agent.health <= 0) {
    agent.alive = false;
    agent.health = 0;
    agent.diedAt = state.time;
    agent.moving = false;
    state.events.push({ type: "death", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
    if (by.kind === "player") {
      state.kills += 1;
      state.score += agent.kind === "hollowed" ? 150 : 100;
    }
    return;
  }
  // Whoever shot them now has their attention.
  if (agent.kind === "wrecker") {
    if (agent.mode !== "combat") engage(agent, by, from);
    if (by.kind === "player") raiseAlarm(state, agent, from);
  } else {
    setMode(agent, "hunt");
    agent.target = by;
  }
}

function fail(state: OpsState, reason: string) {
  if (state.outcome) return;
  state.outcome = "failed";
  state.failure = reason;
  state.events.push({ type: "failed", reason });
}

function extract(state: OpsState) {
  const aboard = state.survivors.filter((survivor) => survivor.state === "following" && inRect(state.map.extraction, survivor.x, survivor.z));
  for (const survivor of aboard) survivor.state = "safe";
  state.saved = aboard.length;
  if (state.saved === 0) {
    fail(state, "The shuttle left with no one aboard");
    return;
  }
  state.outcome = "extracted";
  state.score += state.saved * 1000 + (state.alarm ? 0 : 1500) + Math.max(0, Math.round((900 - state.time) * 2));
  const drill = SIM_DIFFICULTIES[state.difficulty].drill;
  state.drill = Math.min(DRILL_CAP_SECONDS, drill * (2 + state.saved + (state.alarm ? 0 : 1)));
  state.events.push({ type: "extracted", saved: state.saved, drill: state.drill });
}

/** The door the sim-body is facing, close enough to use. */
export function doorInReach(state: OpsState) {
  const player = state.player;
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  let best: number | null = null;
  let nearest = Infinity;
  state.map.doors.forEach((door, index) => {
    const dx = door.i + 0.5 - player.x;
    const dz = door.j + 0.5 - player.z;
    const apart = Math.hypot(dx, dz);
    if (apart > 1.8 || (apart > 0.6 && (dx * forwardX + dz * forwardZ) / apart < 0.45)) return;
    if (apart < nearest) {
      nearest = apart;
      best = index;
    }
  });
  return best;
}

const heldNearby = (state: OpsState) =>
  state.survivors.filter((survivor) => survivor.state === "held" && distance(survivor, state.player) < 2.6);

/** What pressing or holding E would do right now, for the prompt. */
export function opsPrompt(state: OpsState): string | null {
  if (state.outcome || !state.player.alive) return null;
  if (heldNearby(state).length > 0) return "Hold E · free the survivors";
  if (inRect(state.map.extraction, state.player.x, state.player.z) && state.survivors.some((survivor) => survivor.state === "held")) {
    return "Hold E · leave without the others";
  }
  const door = doorInReach(state);
  if (door !== null) return state.doors[door] ? "E · close the door" : "E · open the door";
  return null;
}

export function opsObjective(state: OpsState) {
  if (state.outcome === "extracted") return `Extracted · ${state.saved} saved`;
  if (state.outcome === "failed") return state.failure ?? "Mission failed";
  const held = state.survivors.filter((survivor) => survivor.state === "held").length;
  const following = state.survivors.filter((survivor) => survivor.state === "following").length;
  if (following === 0) return "Find and free the survivors";
  if (held > 0) return `${following} with you · free the others, or get these out`;
  return `Get them to the shuttle · ${following} with you`;
}

/** How strongly a Hollowed close by is corrupting the sim-body's view, 0 to 1. */
export function opsGlitch(state: OpsState) {
  let strongest = 0;
  for (const agent of state.agents) {
    if (!agent.alive || agent.kind !== "hollowed") continue;
    const apart = distance(agent, state.player);
    const near = Math.max(0, 1 - apart / 9);
    strongest = Math.max(strongest, near * (lineOfSight(state.map, state.doors, agent, state.player) ? 1 : 0.55));
  }
  return strongest;
}

/** Start a reload, if there is room in the magazine and rounds to fill it. */
export function reloadOps(state: OpsState) {
  const player = state.player;
  if (!player.alive || state.outcome || player.reloadDone !== null || player.magazine >= CARBINE.magazine || player.reserve <= 0) return false;
  player.reloadDone = state.time + CARBINE.reload;
  state.events.push({ type: "reload" });
  return true;
}

/**
 * Pull the trigger. The drawing code works out what the round would hit (a
 * Wrecker, a monster, a survivor, or nothing) and whether in the head; this
 * decides whether it fires and what it does. Everyone near enough hears it.
 */
export function fireOps(state: OpsState, hit: { kind: "agent" | "survivor"; id: number; head: boolean } | null) {
  const player = state.player;
  if (!player.alive || state.outcome || player.reloadDone !== null || state.time - player.lastShot < CARBINE.interval) return false;
  if (player.magazine <= 0) {
    player.lastShot = state.time;
    state.events.push({ type: "dry" });
    reloadOps(state);
    return false;
  }
  player.magazine -= 1;
  player.lastShot = state.time;
  const struck = hit?.kind === "agent" ? state.agents.find((agent) => agent.id === hit.id && agent.alive) : undefined;
  const friend = hit?.kind === "survivor" ? state.survivors.find((survivor) => survivor.id === hit.id) : undefined;
  const end = struck ?? friend;
  state.events.push({ type: "shot", who: "player", id: 0, x: player.x, z: player.z, tx: end?.x ?? player.x, tz: end?.z ?? player.z, hit: Boolean(end) });
  noise(state, player.x, player.z, GUNFIRE, { kind: "gun", by: "player" });
  if (struck) hurtAgent(state, struck, CARBINE.damage * (hit!.head ? 3 : 1), hit!.head, { kind: "player" }, playerPoint(state));
  if (friend) {
    state.events.push({ type: "hit", id: friend.id, kind: "survivor", x: friend.x, z: friend.z, head: hit!.head });
    hurtSurvivor(state, friend, hit!.head ? 70 : 30);
  }
  if (player.magazine === 0) reloadOps(state);
  return true;
}

/** The living things a monster could go for, nearest first. */
function prey(state: OpsState, from: OpsPoint) {
  const options: { target: OpsTarget; at: OpsPoint; apart: number }[] = [];
  if (state.player.alive) options.push({ target: { kind: "player" }, at: playerPoint(state), apart: distance(from, state.player) });
  for (const survivor of state.survivors) {
    if (survivor.state === "held" || survivor.state === "following") options.push({ target: { kind: "survivor", id: survivor.id }, at: survivor, apart: distance(from, survivor) });
  }
  for (const agent of state.agents) {
    if (agent.alive && agent.kind === "wrecker") options.push({ target: { kind: "agent", id: agent.id }, at: agent, apart: distance(from, agent) });
  }
  return options.sort((a, b) => a.apart - b.apart);
}

function strike(state: OpsState, attacker: OpsAgent, target: OpsTarget, amount: number) {
  state.events.push({ type: "strike", id: attacker.id, kind: attacker.kind, x: attacker.x, z: attacker.z });
  if (target.kind === "player") hurtPlayer(state, amount, attacker);
  else if (target.kind === "survivor") {
    const survivor = state.survivors.find((candidate) => candidate.id === target.id);
    if (survivor) hurtSurvivor(state, survivor, amount);
  } else {
    const agent = state.agents.find((candidate) => candidate.id === target.id);
    if (agent) hurtAgent(state, agent, Math.ceil(amount / 8), false, { kind: "agent", id: attacker.id }, attacker);
  }
}

function stepNoise(state: OpsState, agent: OpsAgent, gait: OpsGait | "skitter" | "drag", loudness: number) {
  state.events.push({ type: "step", who: agent.kind, x: agent.x, z: agent.z, gait });
  noise(state, agent.x, agent.z, loudness, { kind: "agent", id: agent.id, agentKind: agent.kind });
}

function thinkWrecker(state: OpsState, agent: OpsAgent, dt: number, random: () => number) {
  const rules = OPS_DIFFICULTIES[state.difficulty];
  const player = state.player;
  agent.cooldown -= dt;
  agent.voiceIn -= dt;
  agent.modeTime += dt;
  agent.wait -= dt;
  agent.replanIn -= dt;

  // What they can see: the sim-body, and anything monstrous.
  if (agent.mode !== "combat") {
    let engaged = false;
    if (player.alive && sees(state, agent, player, SIGHT_RANGE, player.crouched, true)) {
      const apart = distance(agent, player);
      const rate = rules.spot * (1.6 - apart / SIGHT_RANGE) * (player.crouched ? 0.45 : 1) * (player.light ? 1.6 : 1)
        * (player.speed > 4.5 ? 1.4 : player.speed < 0.3 ? 0.7 : 1) * (state.alarm ? 1.6 : 1);
      agent.spot = apart < 2.8 ? 1 : Math.min(1, agent.spot + rate * dt);
      // A glimpse turns their head.
      turnToward(agent, angleTo(agent, player), dt * 2.5 * agent.spot);
      if (agent.spot >= 1) {
        engage(agent, { kind: "player" }, player);
        raiseAlarm(state, agent, player);
        engaged = true;
      }
    } else {
      agent.spot = Math.max(0, agent.spot - 0.3 * dt);
    }
    if (!engaged) {
      const monster = state.agents.find((other) => other.alive && other.kind !== "wrecker" && other.mode !== "dormant" && sees(state, agent, other, 18, false, true));
      if (monster) {
        engage(agent, { kind: "agent", id: monster.id }, monster);
        state.events.push({ type: "shout", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
      }
    }
  }

  const step = (moved: number, gait: OpsGait, loudness: number) => {
    agent.stride += moved;
    if (agent.stride < OPS_GAITS[gait].stride) return;
    agent.stride = 0;
    stepNoise(state, agent, gait, loudness);
  };
  const calmVoice = () => {
    if (agent.voiceIn > 0) return;
    agent.voiceIn = 12 + random() * 16;
    state.events.push({ type: "bark", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
  };

  switch (agent.mode) {
    case "guard": {
      calmVoice();
      if (distance(agent, agent.home) > 0.6) {
        headFor(state, agent, agent.home, true, 1.5);
        walk(state, agent, OPS_GAITS.walk.speed * 0.7, dt, 0.6, (moved) => step(moved, "walk", 7));
      } else {
        if (agent.wait <= 0) {
          agent.wait = 3 + random() * 5;
          agent.look = agent.homeFacing + (random() - 0.5) * 2.4;
        }
        turnToward(agent, agent.look, dt * 1.2);
      }
      break;
    }
    case "patrol": {
      calmVoice();
      if (!agent.goal) {
        const points = state.map.patrolPoints;
        agent.goal = { ...points[Math.floor(random() * points.length)] };
        agent.path = [];
      }
      if (agent.wait > 0) {
        turnToward(agent, agent.facing + Math.sin(state.time * 0.8 + agent.id) * 0.6, dt);
        break;
      }
      headFor(state, agent, agent.goal, true, 2);
      if (walk(state, agent, OPS_GAITS.walk.speed * (state.alarm ? 0.85 : 0.6), dt, 0.6, (moved) => step(moved, "walk", 7))) {
        if (distance(agent, agent.goal) < 1.2) {
          agent.goal = null;
          agent.wait = 2 + random() * 4;
        }
      }
      break;
    }
    case "investigate":
    case "search": {
      const goal = agent.goal ?? agent.home;
      if (distance(agent, goal) > 1 && agent.modeTime < 25) {
        headFor(state, agent, goal, true, 1);
        walk(state, agent, OPS_GAITS.walk.speed * (state.alarm ? 1.2 : 0.8), dt, 0.6, (moved) => step(moved, "walk", 7));
        agent.wait = 4 + random() * 3;
      } else {
        // Look around where the sound came from; a search then tries somewhere nearby.
        turnToward(agent, agent.facing + 2, dt * 1.4);
        if (agent.wait <= 0) {
          if (agent.mode === "search" && agent.modeTime < 20) {
            const around = agent.lastSeen ?? goal;
            agent.goal = { x: around.x + (random() - 0.5) * 10, z: around.z + (random() - 0.5) * 10 };
            agent.path = [];
          } else {
            agent.goal = null;
            setMode(agent, agent.patrols || state.alarm ? "patrol" : "guard");
            agent.patrols = agent.patrols || state.alarm;
          }
        }
      }
      break;
    }
    case "combat": {
      const target = targetBody(state, agent.target);
      if (!target || !target.alive) {
        agent.target = null;
        setMode(agent, "search");
        break;
      }
      const visible = sees(state, agent, target, 32, target.low, false);
      if (visible) {
        agent.lastSeen = { x: target.x, z: target.z };
        agent.lostFor = 0;
        turnToward(agent, angleTo(agent, target), dt * 6);
        if (agent.cooldown <= 0) {
          if (agent.burst <= 0) agent.burst = 3;
          agent.burst -= 1;
          agent.cooldown = agent.burst > 0 ? 0.14 : 0.7 + random() * 0.8;
          const apart = distance(agent, target);
          let chance = rules.aim * Math.max(0.15, Math.min(1, 1.25 - apart / 22));
          if (agent.target?.kind === "player") {
            if (player.crouched) chance *= 0.7;
            if (player.speed > 4) chance *= 0.7;
          }
          const hit = random() < chance;
          state.events.push({ type: "shot", who: "wrecker", id: agent.id, x: agent.x, z: agent.z, tx: target.x, tz: target.z, hit });
          noise(state, agent.x, agent.z, ENEMY_GUNFIRE, { kind: "gun", by: "wrecker" });
          if (hit) {
            if (agent.target?.kind === "player") hurtPlayer(state, rules.damage, agent);
            else if (agent.target?.kind === "agent") {
              const monster = state.agents.find((other) => other.id === (agent.target as { id: number }).id);
              if (monster) hurtAgent(state, monster, 1, false, { kind: "agent", id: agent.id }, agent);
            }
          }
        }
      } else {
        agent.lostFor += dt;
        const last = agent.lastSeen ?? target;
        if (distance(agent, last) > 1.2) {
          headFor(state, agent, last, true, 0.8);
          walk(state, agent, OPS_GAITS.run.speed * 0.75, dt, 0.5, (moved) => step(moved, "run", 12));
        } else if (agent.lostFor > 4) {
          setMode(agent, "search");
          agent.goal = { ...last };
        }
        if (agent.lostFor > 14) setMode(agent, "search");
      }
      break;
    }
    default:
      setMode(agent, "guard");
  }
}

function thinkMonster(state: OpsState, agent: OpsAgent, dt: number, random: () => number) {
  const rules = OPS_DIFFICULTIES[state.difficulty];
  const hollowed = agent.kind === "hollowed";
  agent.cooldown -= dt;
  agent.voiceIn -= dt;
  agent.modeTime += dt;
  agent.wait -= dt;
  agent.replanIn -= dt;
  if (agent.voiceIn <= 0) {
    agent.voiceIn = hollowed ? 4 + random() * 4 : agent.mode === "dormant" ? 9 + random() * 6 : 3 + random() * 4;
    state.events.push({ type: hollowed ? "whisper" : "chitter", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
  }
  // Anything alive close enough, or in sight, draws them.
  const nearest = prey(state, agent).find(({ at, apart, target }) =>
    apart < 3.5 || (apart < (hollowed ? 10 : agent.mode === "dormant" ? 6 : 14)
      && lineOfSight(state.map, state.doors, agent, at, target.kind === "player" && state.player.crouched)));
  if (nearest) {
    if (agent.mode === "dormant") state.events.push({ type: "scream", id: agent.id, kind: agent.kind, x: agent.x, z: agent.z });
    if (agent.mode !== "hunt") setMode(agent, "hunt");
    agent.target = nearest.target;
    agent.goal = { ...nearest.at };
  } else if (agent.target) {
    const target = targetBody(state, agent.target);
    if (!target || !target.alive) agent.target = null;
  }
  if (agent.mode === "dormant") return;

  const speed = hollowed ? 1.3 : rules.alienSpeed;
  const gait = hollowed ? "drag" : "skitter";
  const onStep = (moved: number) => {
    agent.stride += moved;
    if (agent.stride < (hollowed ? 0.9 : 0.55)) return;
    agent.stride = 0;
    stepNoise(state, agent, gait, hollowed ? 4 : 6);
  };
  if (agent.mode === "wander") {
    if (!agent.goal || agent.wait <= 0) {
      agent.goal = { x: agent.home.x + (random() - 0.5) * 6, z: agent.home.z + (random() - 0.5) * 6 };
      agent.path = [];
      agent.wait = 4 + random() * 4;
    }
    headFor(state, agent, agent.goal, false, 3);
    walk(state, agent, 0.7, dt, null, onStep);
    return;
  }

  // Hunting: towards the prey, or towards the last thing heard.
  const target = targetBody(state, agent.target);
  const goal = target && target.alive ? target : agent.goal;
  if (!goal) {
    setMode(agent, hollowed ? "wander" : "hunt");
    return;
  }
  const apart = distance(agent, goal);
  const reach = 1.35;
  if (target && target.alive && apart < reach) {
    turnToward(agent, angleTo(agent, target), dt * 8);
    agent.moving = false;
    if (agent.cooldown <= 0 && agent.target) {
      agent.cooldown = hollowed ? 1.1 : ALIENS.stalker.cooldown;
      strike(state, agent, agent.target, hollowed ? 15 : Math.round(ALIENS.stalker.damage * SIM_DIFFICULTIES[state.difficulty].bite));
    }
    return;
  }
  if (!target && apart < 1) {
    agent.goal = null;
    if (hollowed) setMode(agent, "wander");
    return;
  }
  headFor(state, agent, goal, true, 0.5);
  if (hollowed) {
    // The Hollowed skip ahead along their way, like a video losing frames.
    agent.skipIn -= dt;
    if (agent.skipIn <= 0 && agent.path.length > 0) {
      agent.skipIn = 1.1 + random();
      const from = { x: agent.x, z: agent.z };
      let budget = 2.4;
      while (budget > 0 && agent.path.length > 0) {
        const next = agent.path[0];
        if (tileAt(state.map, Math.floor(next.x), Math.floor(next.z)) === "door" && !doorOpen(state.map, state.doors, Math.floor(next.x), Math.floor(next.z))) break;
        const leg = distance(agent, next);
        if (leg > budget) {
          agent.x += ((next.x - agent.x) / leg) * budget;
          agent.z += ((next.z - agent.z) / leg) * budget;
          break;
        }
        agent.x = next.x;
        agent.z = next.z;
        budget -= leg;
        agent.path.shift();
      }
      state.events.push({ type: "skip", id: agent.id, x: agent.x, z: agent.z, fromX: from.x, fromZ: from.z });
    }
  }
  walk(state, agent, speed, dt, hollowed ? 1.2 : 1.4, onStep);
}

function thinkSurvivor(state: OpsState, survivor: OpsSurvivor, index: number, dt: number) {
  survivor.moving = false;
  if (survivor.state !== "following") return;
  survivor.replanIn -= dt;
  const player = state.player;
  // Single file behind the sim-body; at the shuttle, close in so everyone is aboard.
  const gap = inRect(state.map.extraction, player.x, player.z) ? 0.8 : 1.3 + index * 0.9;
  const apart = distance(survivor, player);
  if (apart <= gap) {
    turnToward(survivor, angleTo(survivor, player), dt * 4);
    survivor.path = [];
    return;
  }
  headFor(state, survivor, player, false, 0.5);
  const speed = player.crouched ? OPS_GAITS.crouch.speed : apart > 6 ? OPS_GAITS.run.speed : OPS_GAITS.walk.speed;
  walk(state, survivor, speed, dt, null, (moved) => {
    survivor.stride += moved;
    if (survivor.stride < 0.8) return;
    survivor.stride = 0;
    state.events.push({ type: "step", who: "survivor", x: survivor.x, z: survivor.z, gait: player.crouched ? "crouch" : "walk" });
    noise(state, survivor.x, survivor.z, player.crouched ? 1.5 : 3.5, { kind: "survivor" });
  });
}

/**
 * Advance the mission by dt seconds, in place: the sim-body moves (and is heard),
 * uses what is in front of it, picks things up; everyone else thinks and acts; and
 * the mission ends at the shuttle, or when the sim-body or every survivor is lost.
 */
export function stepOps(state: OpsState, dt: number, input: OpsInput, random: () => number = Math.random) {
  if (state.outcome) return state;
  state.time += dt;
  const player = state.player;

  if (player.reloadDone !== null && state.time >= player.reloadDone) {
    const taken = Math.min(CARBINE.magazine - player.magazine, player.reserve);
    player.magazine += taken;
    if (Number.isFinite(player.reserve)) player.reserve -= taken;
    player.reloadDone = null;
    state.events.push({ type: "reloaded" });
  }

  if (player.alive) {
    player.yaw = input.yaw;
    player.crouched = input.crouched;
    player.aiming = input.aiming;
    player.light = input.light;
    const gait: OpsGait = player.crouched ? "crouch" : input.sprint && !input.aiming ? "run" : "walk";
    const speed = OPS_GAITS[gait].speed * (input.aiming ? 0.6 : 1);
    const length = Math.hypot(input.forward, input.strafe);
    let moved = 0;
    if (length > 0) {
      const forwardX = -Math.sin(input.yaw);
      const forwardZ = -Math.cos(input.yaw);
      const dx = ((input.forward * forwardX + input.strafe * -forwardZ) / length) * speed * dt;
      const dz = ((input.forward * forwardZ + input.strafe * forwardX) / length) * speed * dt;
      const at = moveBody(state.map, state.doors, player.x, player.z, dx, dz, BODY);
      moved = Math.hypot(at.x - player.x, at.z - player.z);
      player.x = at.x;
      player.z = at.z;
    }
    player.speed = dt > 0 ? moved / dt : 0;
    player.stride += moved;
    if (player.stride >= OPS_GAITS[gait].stride) {
      player.stride = 0;
      state.events.push({ type: "step", who: "player", x: player.x, z: player.z, gait });
      noise(state, player.x, player.z, OPS_GAITS[gait].noise, { kind: "player" });
    }

    // E: free the survivors (held), leave from the pad (held), or a door (pressed).
    const pressed = input.interact && !state.interactWas;
    state.interactWas = input.interact;
    const held = heldNearby(state);
    const onPad = inRect(state.map.extraction, player.x, player.z);
    if (held.length > 0 && input.interact) {
      state.freeing += dt / FREE_SECONDS;
      if (state.freeing >= 1) {
        state.freeing = 0;
        for (const survivor of state.survivors) if (survivor.state === "held") survivor.state = "following";
        state.events.push({ type: "freed" });
        noise(state, player.x, player.z, 4, { kind: "survivor" });
      }
    } else {
      state.freeing = 0;
      if (pressed && !onPad) {
        const door = doorInReach(state);
        if (door !== null) {
          const tile = state.map.doors[door];
          const bodies = [player, ...state.agents.filter((agent) => agent.alive), ...state.survivors.filter((survivor) => survivor.state === "following")];
          const blocked = bodies.some((body) => Math.abs(body.x - (tile.i + 0.5)) < 0.8 && Math.abs(body.z - (tile.j + 0.5)) < 0.8);
          if (!(state.doors[door] && blocked)) setDoor(state, door, !state.doors[door]);
        }
      }
    }

    for (const pickup of [...state.pickups]) {
      if (distance(pickup, player) > 1.1) continue;
      if (pickup.kind === "medkit" && player.health >= player.maxHealth) continue;
      if (pickup.kind === "ammo" && !Number.isFinite(player.reserve)) continue;
      if (pickup.kind === "ammo") player.reserve += CARBINE.magazine * 2;
      else player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.4);
      state.pickups = state.pickups.filter((other) => other !== pickup);
      state.events.push({ type: "pickup", kind: pickup.kind });
    }

    // At the shuttle: everyone freed and aboard lifts off; or hold E to go with who is here.
    if (onPad) {
      const following = state.survivors.filter((survivor) => survivor.state === "following");
      const stillHeld = state.survivors.some((survivor) => survivor.state === "held");
      const aboard = following.every((survivor) => inRect(state.map.extraction, survivor.x, survivor.z));
      if (!stillHeld && following.length > 0 && aboard) extract(state);
      else if (input.interact && stillHeld) {
        state.leaving += dt / LEAVE_SECONDS;
        if (state.leaving >= 1) extract(state);
      } else state.leaving = 0;
    } else state.leaving = 0;
  }
  if (state.outcome) return state;

  for (const agent of state.agents) {
    if (!agent.alive) continue;
    if (agent.kind === "wrecker") thinkWrecker(state, agent, dt, random);
    else thinkMonster(state, agent, dt, random);
  }
  // Nobody stands inside anybody else.
  const bodies = [...state.agents.filter((agent) => agent.alive), ...state.survivors.filter((survivor) => survivor.state === "following" || survivor.state === "held")];
  for (let a = 0; a < bodies.length; a += 1) {
    for (let b = a + 1; b < bodies.length; b += 1) {
      const dx = bodies[b].x - bodies[a].x;
      const dz = bodies[b].z - bodies[a].z;
      const apart = Math.hypot(dx, dz);
      if (apart > 0.55 || apart < 0.0001) continue;
      const push = (0.55 - apart) / 2;
      const one = moveBody(state.map, state.doors, bodies[a].x, bodies[a].z, (-dx / apart) * push, (-dz / apart) * push, BODY);
      const other = moveBody(state.map, state.doors, bodies[b].x, bodies[b].z, (dx / apart) * push, (dz / apart) * push, BODY);
      bodies[a].x = one.x;
      bodies[a].z = one.z;
      bodies[b].x = other.x;
      bodies[b].z = other.z;
    }
  }
  let following = 0;
  for (const survivor of state.survivors) {
    if (survivor.state === "following") thinkSurvivor(state, survivor, following++, dt);
  }

  state.spotted = state.agents.reduce((most, agent) => {
    if (!agent.alive || agent.kind !== "wrecker") return most;
    if (agent.mode === "combat" && agent.target?.kind === "player" && agent.lostFor === 0) return 1;
    return Math.max(most, agent.spot);
  }, 0);
  return state;
}
