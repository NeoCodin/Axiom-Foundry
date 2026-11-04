/*
 * The Conduit: a simulator course for the sim-body at full speed. Three runs of tube,
 * each bending away from the last, then a vast round hall built around a simulated
 * Lawheart, where the floor is far below the ceiling and the fight is in the air.
 * AXIOM carries a power pack: the carbine's cell fills wherever it goes, faster than
 * under a dome, and its bolts strike harder; the sim-body mends between blows. Things
 * wait in each stretch of tube and come at it as it arrives; the hall comes in three
 * waves, the last of them everything at once.
 * Pure geometry and encounters (a SimCourse for ark-sim-rules.ts); ark-sim.ts draws it.
 */

import type { AlienKind, SimCourse, SimDifficulty, SimState } from "./ark-sim-rules.ts";

/** The tubes' spine, in metres along the ground: where the first starts, where each turns, and where the last opens into the hall. */
export const SPINE = [
  { x: 0, z: 4 },
  { x: 0, z: -30 },
  { x: 18, z: -48 },
  { x: 18, z: -76 },
  { x: 0, z: -94 },
  // The last stretch runs straight at the hall, so its mouth meets the wall square.
  { x: 0, z: -112 },
] as const;
/** A tube: how far from the spine things can go, the drawn bore and where its centre sits, and how high anything can rise inside. */
export const TUBE = { half: 3, bore: 4.5, centre: 3.5, ceiling: 7.6 } as const;
/** The hall: its middle, its wall and ceiling, and the simulated Lawheart's column at its heart. */
export const HALL = { x: 0, z: -146, radius: 34, ceiling: 36, core: 3.2 } as const;

const SEGMENTS = SPINE.slice(1).reduce<{ ax: number; az: number; dx: number; dz: number; length: number; start: number }[]>((list, to, at) => {
  const from = SPINE[at];
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const start = list.length ? list[list.length - 1].start + list[list.length - 1].length : 0;
  list.push({ ax: from.x, az: from.z, dx, dz, length: Math.hypot(dx, dz), start });
  return list;
}, []);
/** How far it is through the tubes, from the closed end to the hall's door. */
export const TUBE_LENGTH = SEGMENTS[SEGMENTS.length - 1].start + SEGMENTS[SEGMENTS.length - 1].length;

/** The nearest point on the spine: how far along it is, and how far off to the side. */
function nearest(x: number, z: number) {
  let best: { s: number; x: number; z: number; off: number } = { s: 0, x: SPINE[0].x, z: SPINE[0].z, off: Infinity };
  for (const segment of SEGMENTS) {
    const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / (segment.length * segment.length)));
    const px = segment.ax + segment.dx * t;
    const pz = segment.az + segment.dz * t;
    const off = Math.hypot(x - px, z - pz);
    if (off < best.off) best = { s: segment.start + segment.length * t, x: px, z: pz, off };
  }
  return best;
}

/** The point on the spine this far along it, and which way the tube runs there. */
export function spineAt(s: number) {
  const segment = SEGMENTS.find((candidate) => s <= candidate.start + candidate.length) ?? SEGMENTS[SEGMENTS.length - 1];
  const t = Math.max(0, Math.min(1, (s - segment.start) / segment.length));
  return { x: segment.ax + segment.dx * t, z: segment.az + segment.dz * t, along: { x: segment.dx / segment.length, z: segment.dz / segment.length } };
}

const fromHall = (x: number, z: number) => Math.hypot(x - HALL.x, z - HALL.z);
export const inHall = (x: number, z: number, margin = 0) => fromHall(x, z) <= HALL.radius - margin;

/** How far through the course a point is: along the tubes, then on into the hall. */
export function progressOf(x: number, z: number) {
  if (inHall(x, z)) return TUBE_LENGTH + Math.hypot(x - SPINE[SPINE.length - 1].x, z - SPINE[SPINE.length - 1].z);
  return nearest(x, z).s;
}

/**
 * Keep something this wide inside the course: within a tube's width of the spine, or
 * inside the hall's wall and outside the core. Something higher than a tube's ceiling
 * (height above the floor) can only be in the hall: the wall over the tube's mouth stops it.
 */
export function conduitConfine(x: number, z: number, margin: number, height = 0) {
  const hx = x - HALL.x;
  const hz = z - HALL.z;
  const out = Math.max(0.0001, Math.hypot(hx, hz));
  const wall = HALL.radius - margin;
  if (out <= wall) {
    const core = HALL.core + margin;
    return out >= core ? { x, z } : { x: HALL.x + (hx / out) * core, z: HALL.z + (hz / out) * core };
  }
  const toHall = { x: HALL.x + (hx / out) * wall, z: HALL.z + (hz / out) * wall, gap: out - wall };
  if (height > TUBE.ceiling - 1.6) return toHall;
  const spine = nearest(x, z);
  const half = TUBE.half - margin;
  if (spine.off <= half) return { x, z };
  const toTube = {
    x: spine.x + ((x - spine.x) / spine.off) * half,
    z: spine.z + ((z - spine.z) / spine.off) * half,
    gap: spine.off - half,
  };
  return toTube.gap <= toHall.gap ? { x: toTube.x, z: toTube.z } : { x: toHall.x, z: toHall.z };
}

export const conduitCeiling = (x: number, z: number) => (inHall(x, z) ? HALL.ceiling : TUBE.ceiling);

/** What waits in each stretch, and how far through the course AXIOM has to be before it comes. */
export const ENCOUNTERS: readonly { name: string; at: number; where: "tube" | "hall"; roster: readonly AlienKind[] }[] = [
  { name: "The first run", at: 0, where: "tube", roster: ["stalker", "stalker", "stalker", "stalker"] },
  { name: "The bend", at: 36, where: "tube", roster: ["stalker", "spitter", "stalker", "stalker", "spitter"] },
  { name: "The long run", at: 62, where: "tube", roster: ["harrier", "stalker", "stalker", "harrier", "stalker", "spitter"] },
  {
    name: "The Core Hall", at: TUBE_LENGTH + 4, where: "hall",
    roster: ["stalker", "stalker", "harrier", "spitter", "stalker", "harrier", "stalker", "spitter", "stalker", "harrier"],
  },
  {
    name: "The Core Hall · it wakes", at: TUBE_LENGTH + 4, where: "hall",
    roster: ["harrier", "harrier", "brute", "stalker", "stalker", "spitter", "harrier", "stalker", "spitter", "harrier", "stalker", "stalker"],
  },
  {
    name: "The Core Hall · everything", at: TUBE_LENGTH + 4, where: "hall",
    roster: ["brute", "harrier", "harrier", "stalker", "stalker", "spitter", "harrier", "stalker", "brute", "spitter", "harrier", "stalker", "stalker", "spitter", "harrier", "stalker"],
  },
];

/** Fewer for a recruit, more for a veteran. */
function scaled(roster: readonly AlienKind[], difficulty: SimDifficulty) {
  if (difficulty === "recruit") return roster.filter((_, at) => at % 4 !== 3);
  if (difficulty === "veteran") return [...roster, ...roster.filter((_, at) => at % 3 === 0)];
  return [...roster];
}

/** Where something comes in: further down the tube ahead of AXIOM, or across the hall from it, clear of the core. */
function spawnAt(state: SimState, _kind: AlienKind, random: () => number) {
  const player = state.player;
  const encounter = ENCOUNTERS[Math.max(0, state.wave - 1)];
  if (encounter.where === "tube") {
    const s = Math.min(TUBE_LENGTH - 2, progressOf(player.x, player.z) + 16 + random() * 14);
    const at = spineAt(s);
    const side = (random() - 0.5) * 3;
    return { x: at.x - at.along.z * side, z: at.z + at.along.x * side };
  }
  const away = Math.atan2(HALL.z - player.z, HALL.x - player.x);
  let point: { x: number; z: number } = { x: HALL.x, z: HALL.z + HALL.radius - 4 };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = away + (random() - 0.5) * Math.PI * 1.1;
    const reach = HALL.core + 6 + random() * (HALL.radius - HALL.core - 10);
    point = { x: HALL.x + Math.cos(angle) * reach, z: HALL.z + Math.sin(angle) * reach };
    if (Math.hypot(point.x - player.x, point.z - player.z) >= 14) break;
  }
  return point;
}

/** The encounter AXIOM is in (1 being the first), and whether it has beaten every one. */
export const encounterName = (state: SimState) => ENCOUNTERS[Math.max(0, state.wave - 1)]?.name ?? "";
export const conduitCleared = (state: SimState) => state.cleared >= ENCOUNTERS.length;

/** The Conduit, as the rules take a course. */
export function conduitCourse(): SimCourse {
  return {
    confine: conduitConfine,
    ceilingAt: conduitCeiling,
    spawnAt,
    nextWave(state) {
      const next = ENCOUNTERS[state.wave];
      if (!next || progressOf(state.player.x, state.player.z) < next.at) return null;
      return scaled(next.roster, state.difficulty);
    },
    pack: { recharge: 2.5, damage: 1.4 },
    regen: 0.06,
  };
}
