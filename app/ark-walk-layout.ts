/*
 * The walkable Ark for the drone view, built from the same room list as the
 * 2D cutaway: two decks, as the cutaway draws them. Pure geometry in metres
 * on each deck's floor plane: x runs from the stern to the bow, z across the
 * ship. Compartments sit end to end with a bulkhead and a doorway between
 * each; furniture blocks movement. The Law-Heart burns in a sealed core room
 * two storeys tall in the middle of its chamber; a gallery runs round it on
 * both decks, looking in through glass, and grav-lifts in two corners carry
 * the drone between them. The lower deck ends in the recon dock: a gallery,
 * and behind a pressure wall the sealed launch bay that the recon ship leaves
 * from when a team goes down to the planet.
 */

export type WalkRoomKind =
  | "fabrication"
  | "chamber"
  | "habitation"
  | "research"
  | "bridge"
  | "support"
  | "education"
  | "hangar";

export type Box = { x0: number; x1: number; z0: number; z1: number };

export type WalkCompartment = {
  kind: WalkRoomKind;
  label: string;
  online: boolean;
  x0: number;
  x1: number;
  /** Ceiling height above this deck's floor. */
  height: number;
};

export type WalkDeck = {
  label: string;
  floorY: number;
  compartments: WalkCompartment[];
  doorways: Box[];
  blockers: Box[];
  length: number;
};

export type WalkLayout = {
  /** Upper deck first, then the lower. */
  decks: WalkDeck[];
  halfDepth: number;
  spawn: { deck: number; x: number; z: number; yaw: number };
  heart: { x: number; y: number; z: number };
  /** The sealed core room the Law-Heart burns in; the gallery runs round it. */
  core: Box;
  /** Grav-lift columns joining the decks; each stands in the same spot on both. */
  lifts: { x: number; z: number }[];
  /**
   * The recon dock: a gallery on the ship's side of a pressure wall, and the sealed
   * launch bay beyond it, with blast doors in the wall and hull doors to space.
   */
  dock: {
    /** The pad the recon ship flies from, and the one where a second ship is laid up. */
    pad: { x: number; z: number };
    parked: { x: number; z: number };
    lounge: { x: number; z: number };
    /** The way out of the dock to the rest of the ship. */
    exit: { x: number; z: number };
    bay: Box;
    /** The gap in the pressure wall that the blast doors close. */
    blastDoor: Box;
    /** The hull opening the outer doors close, along the bay's outer wall. */
    opening: { x0: number; x1: number };
  };
};

/** Stern to bow along each deck, matching the 2D cutaway's two rows. */
export const UPPER_DECK: readonly WalkRoomKind[] = ["fabrication", "chamber", "habitation", "research", "bridge"];
export const LOWER_DECK: readonly WalkRoomKind[] = ["support", "chamber", "education", "hangar"];

export const UPPER_FLOOR = 6;
/** Half the ship's width: 22 metres across, room enough to move. */
export const HALF_DEPTH = 11;
export const BULKHEAD = 0.4;
export const DOOR_HALF_WIDTH = 2.4;
export const DOOR_HEIGHT = 3.8;
export const LIFT_RADIUS = 0.9;
/** Half the core room's outside size: the gallery round it is what is left of the chamber. */
export const CORE_HALF_X = 5.4;
export const CORE_HALF_Z = 7.5;

/**
 * Furniture is drawn against walls 7 m out from the centre line; this pushes it out to
 * the real walls, leaving the middle of each room clear.
 */
const DESIGN_HALF = 7;
export function towardWalls(z: number, half = HALF_DEPTH) {
  return Math.abs(z) < 1.2 ? z : Math.sign(z) * (Math.abs(z) + half - DESIGN_HALF);
}

/** A piece of furniture moved out to the wall, keeping its size. */
function againstWall(box: Box): Box {
  const middle = towardWalls((box.z0 + box.z1) / 2);
  const depth = (box.z1 - box.z0) / 2;
  return { ...box, z0: middle - depth, z1: middle + depth };
}

/** The recon dock's plan, in metres from its stern end (x) and across the ship (z). */
const DOCK = { wallZ: 6, doorFrom: 10, doorTo: 14, padX: 6.5, parkedX: 17.5, padZ: 8.7 } as const;

const WIDTH: Record<WalkRoomKind, number> = {
  fabrication: 14,
  support: 14,
  chamber: 16,
  habitation: 14,
  education: 14,
  research: 12,
  bridge: 12,
  // The dock runs under both the Analysis Core and the bridge.
  hangar: 12 + BULKHEAD + 12,
};
const HEIGHT: Record<WalkRoomKind, number> = {
  fabrication: 5,
  support: 5.2,
  chamber: 12.5,
  habitation: 4.6,
  education: 4.8,
  research: 5,
  bridge: 5.5,
  hangar: 5.8,
};

function furniture(kind: WalkRoomKind, upper: boolean, x0: number, x1: number): Box[] {
  const cx = (x0 + x1) / 2;
  switch (kind) {
    case "fabrication":
      return [
        { x0: x0 + 2, x1: x0 + 5, z0: -6.6, z1: -3.6 }, // the press
        { x0: x0 + 6, x1: x1 - 1, z0: -6.9, z1: -5.5 }, // machine racks, one per Foundry tier
        { x0: x0 + 5, x1: x1 - 1, z0: 4.4, z1: 5.6 }, // the conveyor
        { x0: x1 - 4.2, x1: x1 - 3, z0: 2.4, z1: 3.6 }, // the robot arm
        { x0: x0 + 1, x1: x0 + 3.4, z0: 4.4, z1: 6.6 }, // stacked crates
      ];
    case "chamber":
      // The sealed core room fills the middle on both decks.
      return [{ x0: cx - CORE_HALF_X, x1: cx + CORE_HALF_X, z0: -CORE_HALF_Z, z1: CORE_HALF_Z }];
    case "habitation":
      return [
        { x0: x0 + 1, x1: x0 + 6, z0: -6.9, z1: -4.8 }, // bunks
        { x0: x0 + 7.5, x1: x0 + 12.5, z0: -6.9, z1: -4.8 },
        { x0: x1 - 5.4, x1: x1 - 1.8, z0: 2.4, z1: 4.4 }, // the mess table and its chairs
        { x0: x0 + 1, x1: x0 + 5, z0: 6.2, z1: 6.9 }, // lockers
      ];
    case "research":
      return [
        { x0: x0 + 1, x1: x1 - 1, z0: -6.9, z1: -5.4 }, // desks under the wall screens
        { x0: cx - 1.4, x1: cx + 1.4, z0: 2.2, z1: 4.6 }, // the holo-table
        { x0: x0 + 1, x1: x0 + 4.6, z0: 6, z1: 6.9 }, // server racks
      ];
    case "bridge":
      return [
        { x0: x1 - 3.4, x1: x1 - 1.8, z0: -2.6, z1: 2.6 }, // the helm
        { x0: x1 - 5.2, x1: x1 - 4.2, z0: -0.5, z1: 0.5 }, // the pilot's chair
        { x0: x0 + 2, x1: x0 + 6, z0: -6.9, z1: -5.6 }, // side stations
        { x0: x0 + 2, x1: x0 + 6, z0: 5.6, z1: 6.9 },
      ];
    case "support":
      return [
        { x0: x0 + 1.4, x1: x1 - 1.4, z0: -6.6, z1: -4.2 }, // four culture tanks
        { x0: x0 + 5, x1: x0 + 8.4, z0: 5, z1: 6.4 }, // the atmosphere desk
        { x0: x0 + 9.4, x1: x1 - 0.8, z0: 6.2, z1: 6.9 }, // hydroponic shelves
        { x0: x0 + 1, x1: x0 + 3.4, z0: 2.35, z1: 3.35 }, // the two sick-bay beds
        { x0: x0 + 1, x1: x0 + 3.4, z0: 3.75, z1: 4.75 },
      ];
    case "education":
      return [
        { x0: x0 + 6.6, x1: x0 + 7.4, z0: -5.4, z1: -4.8 }, // the lectern
        ...[2, 3.6, 5.2].map((rowZ) => ({ x0: x0 + 2, x1: x1 - 2, z0: rowZ - 0.3, z1: rowZ + 0.3 })), // rows of desks
      ];
    case "hangar":
      return [
        // The pressure wall between the gallery and the launch bay, either side of the blast doors.
        { x0, x1: x0 + DOCK.doorFrom, z0: DOCK.wallZ, z1: DOCK.wallZ + 0.4 },
        { x0: x0 + DOCK.doorTo, x1, z0: DOCK.wallZ, z1: DOCK.wallZ + 0.4 },
        { x0: x0 + DOCK.parkedX - 2.9, x1: x0 + DOCK.parkedX + 2.9, z0: DOCK.padZ - 2.1, z1: DOCK.padZ + 2.1 }, // the laid-up ship
        { x0: x0 + 1.5, x1: x0 + 5.5, z0: -HALF_DEPTH + 0.1, z1: -HALF_DEPTH + 1.1 }, // departure lounge benches
        { x0: x0 + 5, x1: x0 + 7, z0: DOCK.wallZ - 1.4, z1: DOCK.wallZ - 0.4 }, // the launch desk, at the bay window
        { x0: x1 - 3.2, x1: x1 - 1, z0: -HALF_DEPTH + 0.6, z1: -HALF_DEPTH + 3 }, // cargo
      ];
  }
}

function buildDeck(
  order: readonly WalkRoomKind[],
  upper: boolean,
  byKind: ReadonlyMap<WalkRoomKind, { label: string; online: boolean }>,
): WalkDeck {
  const compartments: WalkCompartment[] = [];
  const doorways: Box[] = [];
  const blockers: Box[] = [];
  let x = 0;
  order.forEach((kind, index) => {
    const room = byKind.get(kind);
    const x0 = x;
    const x1 = x + WIDTH[kind];
    compartments.push({
      kind,
      label: room?.label ?? (kind === "chamber" ? "Axiom Chamber" : kind),
      online: kind === "chamber" ? true : room?.online ?? false,
      x0,
      x1,
      // The atrium is counted from the lower floor; upstairs only its top part remains.
      height: kind === "chamber" && upper ? HEIGHT.chamber - UPPER_FLOOR : HEIGHT[kind],
    });
    // The chamber and the dock are laid out at full width; the rest is pushed out to the walls.
    const pieces = furniture(kind, upper, x0, x1);
    blockers.push(...(kind === "chamber" || kind === "hangar" ? pieces : pieces.map(againstWall)));
    x = x1;
    if (index < order.length - 1) {
      doorways.push({ x0: x, x1: x + BULKHEAD, z0: -DOOR_HALF_WIDTH, z1: DOOR_HALF_WIDTH });
      x += BULKHEAD;
    }
  });
  return { label: upper ? "Upper deck" : "Lower deck", floorY: upper ? UPPER_FLOOR : 0, compartments, doorways, blockers, length: x };
}

export function buildWalkLayout(
  rooms: readonly { kind: WalkRoomKind; label: string; online: boolean }[],
): WalkLayout {
  const byKind = new Map(rooms.map((room) => [room.kind, room]));
  const decks = [buildDeck(UPPER_DECK, true, byKind), buildDeck(LOWER_DECK, false, byKind)];
  const chamber = decks[0].compartments.find((compartment) => compartment.kind === "chamber")!;
  const dock = decks[1].compartments.find((compartment) => compartment.kind === "hangar")!;
  const cx = (chamber.x0 + chamber.x1) / 2;
  return {
    decks,
    halfDepth: HALF_DEPTH,
    spawn: { deck: 0, x: decks[0].compartments[0].x0 + 1.6, z: 0, yaw: 0 },
    heart: { x: cx, y: 6.2, z: 0 },
    core: { x0: cx - CORE_HALF_X, x1: cx + CORE_HALF_X, z0: -CORE_HALF_Z, z1: CORE_HALF_Z },
    lifts: [
      { x: chamber.x0 + 1.3, z: -(HALF_DEPTH + CORE_HALF_Z) / 2 },
      { x: chamber.x1 - 1.3, z: (HALF_DEPTH + CORE_HALF_Z) / 2 },
    ],
    dock: {
      pad: { x: dock.x0 + DOCK.padX, z: DOCK.padZ },
      parked: { x: dock.x0 + DOCK.parkedX, z: DOCK.padZ },
      lounge: { x: dock.x0 + 3.5, z: -HALF_DEPTH + 1.8 },
      exit: { x: dock.x0 + 0.6, z: 0 },
      bay: { x0: dock.x0, x1: dock.x1, z0: DOCK.wallZ + 0.4, z1: HALF_DEPTH },
      blastDoor: { x0: dock.x0 + DOCK.doorFrom, x1: dock.x0 + DOCK.doorTo, z0: DOCK.wallZ, z1: DOCK.wallZ + 0.4 },
      opening: { x0: dock.x0 + 3, x1: dock.x1 - 3 },
    },
  };
}

export type Rect = { a0: number; a1: number; y0: number; y1: number };

/**
 * Split a wall running from a0 to a1 along its length, and 0 to height up it,
 * into solid rectangles around the given openings (windows, a bay).
 */
export function wallPieces(a0: number, a1: number, height: number, openings: readonly Rect[]): Rect[] {
  const levels = [...new Set([0, height, ...openings.flatMap((hole) => [hole.y0, hole.y1])])]
    .filter((y) => y >= 0 && y <= height)
    .sort((low, high) => low - high);
  const pieces: Rect[] = [];
  for (let band = 0; band < levels.length - 1; band += 1) {
    const y0 = levels[band];
    const y1 = levels[band + 1];
    const middle = (y0 + y1) / 2;
    let cursor = a0;
    for (const hole of openings.filter((opening) => opening.y0 <= middle && opening.y1 >= middle).sort((left, right) => left.a0 - right.a0)) {
      if (hole.a0 > cursor) pieces.push({ a0: cursor, a1: hole.a0, y0, y1 });
      cursor = Math.max(cursor, hole.a1);
    }
    if (cursor < a1) pieces.push({ a0: cursor, a1, y0, y1 });
  }
  return pieces;
}

function inside(box: Box, x: number, z: number, margin: number) {
  return x >= box.x0 + margin && x <= box.x1 - margin && z >= box.z0 + margin && z <= box.z1 - margin;
}

/** Can a drone of this radius hover at (x, z) on this deck? */
export function isWalkable(deck: WalkDeck, x: number, z: number, radius = 0.3) {
  const open =
    deck.compartments.some((compartment) =>
      inside({ x0: compartment.x0, x1: compartment.x1, z0: -HALF_DEPTH, z1: HALF_DEPTH }, x, z, radius),
    ) ||
    // A doorway is passable along its whole thickness; the margin applies across it only.
    deck.doorways.some((door) => x >= door.x0 - radius && x <= door.x1 + radius && z >= door.z0 + radius && z <= door.z1 - radius);
  if (!open) return false;
  return !deck.blockers.some((box) => inside(box, x, z, -radius));
}

/** Move with wall sliding: try the full step, then each axis alone. */
export function moveWithin(deck: WalkDeck, x: number, z: number, dx: number, dz: number, radius = 0.3) {
  if (isWalkable(deck, x + dx, z + dz, radius)) return { x: x + dx, z: z + dz };
  if (isWalkable(deck, x + dx, z, radius)) return { x: x + dx, z };
  if (isWalkable(deck, x, z + dz, radius)) return { x, z: z + dz };
  return { x, z };
}

export function compartmentAt(deck: WalkDeck, x: number) {
  return deck.compartments.find((compartment) => x >= compartment.x0 && x <= compartment.x1) ?? null;
}

/** The grav-lift the drone is standing in, if any. */
export function liftAt(layout: WalkLayout, x: number, z: number) {
  return layout.lifts.find((lift) => Math.hypot(x - lift.x, z - lift.z) <= LIFT_RADIUS) ?? null;
}

/**
 * The launch bay's two scenes, as pure functions of time since they began.
 * Departure: the team boards, the blast doors seal the bay off from the ship,
 * the air is pumped out, the hull doors open, the ship lifts, turns and goes;
 * then the hull doors close, the bay fills with air and the blast doors open.
 * Arrival runs the same in reverse and ends with the team walking off. The bay
 * is never open to space and to the ship at once.
 */
export type DockScene = "departure" | "arrival";

export type DockMoment = {
  /** 0 open to the ship, 1 sealed. */
  blastDoors: number;
  /** 0 closed, 1 open to space. */
  hullDoors: number;
  /** The bay is sealed off: red lights and the alarm. */
  alarm: boolean;
  /** Air being pumped out of the bay. */
  venting: boolean;
  /** The ship: lifted off its pad, turned to face the hull doors, and how far out (each 0 to 1). */
  ship: { lift: number; turn: number; out: number };
  /** The team walking aboard (departure) or off (arrival), 0 to 1. */
  walk: number;
  done: boolean;
};

export const DOCK_SCENES: Record<DockScene, number> = { departure: 38_000, arrival: 42_000 };

export function dockMoment(scene: DockScene, elapsed: number): DockMoment {
  const span = (from: number, to: number) => Math.min(1, Math.max(0, (elapsed - from) / (to - from)));
  const ease = (value: number) => (value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2);
  if (scene === "departure") {
    const blastDoors = elapsed < 35_000 ? ease(span(7_000, 10_000)) : 1 - ease(span(35_000, 38_000));
    const hullDoors = elapsed < 28_000 ? ease(span(13_000, 17_000)) : 1 - ease(span(28_000, 32_000));
    return {
      blastDoors,
      hullDoors,
      alarm: blastDoors > 0,
      venting: elapsed >= 10_000 && elapsed < 13_000,
      ship: { lift: ease(span(17_000, 19_000)), turn: ease(span(19_000, 21_000)), out: span(21_000, 28_000) ** 2 },
      walk: span(0, 6_500),
      done: elapsed >= DOCK_SCENES.departure,
    };
  }
  const blastDoors = elapsed < 29_500 ? ease(span(0, 3_000)) : 1 - ease(span(29_500, 32_500));
  const hullDoors = elapsed < 22_500 ? ease(span(6_000, 10_000)) : 1 - ease(span(22_500, 26_500));
  return {
    blastDoors,
    hullDoors,
    alarm: blastDoors > 0,
    venting: false,
    ship: { lift: 1 - ease(span(20_000, 22_500)), turn: 1 - ease(span(18_000, 20_000)), out: 1 - ease(span(10_000, 18_500)) },
    walk: span(32_500, 42_000),
    done: elapsed >= DOCK_SCENES.arrival,
  };
}

