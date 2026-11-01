/*
 * The walkable Ark for the drone view, built from the same room list as the
 * 2D cutaway: two decks, as the cutaway draws them. Pure geometry in metres
 * on each deck's floor plane: x runs from the stern to the bow, z across the
 * ship. Compartments sit end to end with a bulkhead and a doorway between
 * each; furniture blocks movement. The Law-Heart chamber is one two-storey
 * atrium: a catwalk rings it on the upper deck, its containment vessel stands
 * on the lower, and grav-lifts in two corners carry the drone between them.
 * The lower deck ends in the recon dock, where ships leave for the planet.
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
  /** The chamber's open middle, which the upper catwalk rings. */
  atrium: Box;
  /** Grav-lift columns joining the decks; each stands in the same spot on both. */
  lifts: { x: number; z: number }[];
  /** The recon dock: the pad ships launch from, the one where a ship is parked, and the bay opening. */
  dock: {
    pad: { x: number; z: number };
    parked: { x: number; z: number };
    lounge: { x: number; z: number };
    door: { x: number; z: number };
    opening: { x0: number; x1: number };
  };
};

/** Stern to bow along each deck, matching the 2D cutaway's two rows. */
export const UPPER_DECK: readonly WalkRoomKind[] = ["fabrication", "chamber", "habitation", "research", "bridge"];
export const LOWER_DECK: readonly WalkRoomKind[] = ["support", "chamber", "education", "hangar"];

export const UPPER_FLOOR = 6;
export const HALF_DEPTH = 7;
export const BULKHEAD = 0.4;
export const DOOR_HALF_WIDTH = 1.8;
export const DOOR_HEIGHT = 3.6;
export const LIFT_RADIUS = 0.9;
/** The containment vessel's plinth, which keeps everyone off the Law-Heart. */
export const PLINTH_HALF = 3.8;

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

function pillars(cx: number): Box[] {
  return [-5, 5].flatMap((px) => [-4.6, 4.6].map((pz) => ({ x0: cx + px - 0.25, x1: cx + px + 0.25, z0: pz - 0.25, z1: pz + 0.25 })));
}

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
      // Upstairs the middle is open air around the vessel; downstairs it is the vessel's plinth.
      return upper
        ? [{ x0: cx - 5, x1: cx + 5, z0: -4.6, z1: 4.6 }, ...pillars(cx)]
        : [{ x0: cx - PLINTH_HALF, x1: cx + PLINTH_HALF, z0: -PLINTH_HALF, z1: PLINTH_HALF }, ...pillars(cx)];
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
      ];
    case "education":
      return [
        { x0: x0 + 6.6, x1: x0 + 7.4, z0: -5.4, z1: -4.8 }, // the lectern
        ...[2, 3.6, 5.2].map((rowZ) => ({ x0: x0 + 2, x1: x1 - 2, z0: rowZ - 0.3, z1: rowZ + 0.3 })), // rows of desks
      ];
    case "hangar":
      return [
        { x0: x0 + 13.6, x1: x0 + 18.4, z0: -4.1, z1: 1.1 }, // the recon ship parked on the second pad
        { x0: x0 + 1.5, x1: x0 + 5.5, z0: -6.9, z1: -5.9 }, // departure lounge benches
        { x0: x1 - 4.2, x1: x1 - 2.4, z0: -6.9, z1: -5.4 }, // the launch desk
        { x0: x1 - 3.2, x1: x1 - 1, z0: 2.4, z1: 4.8 }, // cargo
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
    blockers.push(...furniture(kind, upper, x0, x1));
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
    heart: { x: cx, y: 5.5, z: 0 },
    atrium: { x0: cx - 5, x1: cx + 5, z0: -4.6, z1: 4.6 },
    lifts: [
      { x: chamber.x0 + 1.5, z: -5.8 },
      { x: chamber.x1 - 1.5, z: 5.8 },
    ],
    dock: {
      pad: { x: dock.x0 + 7, z: -1.5 },
      parked: { x: dock.x0 + 16, z: -1.5 },
      lounge: { x: dock.x0 + 3.5, z: -5.2 },
      door: { x: dock.x0 + 0.6, z: 0 },
      opening: { x0: dock.x0 + 3, x1: dock.x1 - 3 },
    },
  };
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
 * Where the dock's recon ship is in its round trip, as a fraction of the cycle:
 * boarding, lift-off, out through the bay, away at the planet, back, landing, and
 * the returning team walking off.
 */
export const DOCK_CYCLE_MS = 56_000;
export const DOCK_PHASES = {
  boardingEnds: 9_000,
  liftEnds: 11_000,
  departEnds: 20_000,
  returnStarts: 34_000,
  approachEnds: 43_000,
  landEnds: 45_000,
} as const;

export function reconShipAt(time: number) {
  const t = ((time % DOCK_CYCLE_MS) + DOCK_CYCLE_MS) % DOCK_CYCLE_MS;
  const ease = (value: number) => (value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2);
  const span = (from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)));
  const P = DOCK_PHASES;
  if (t < P.boardingEnds) return { lift: 0, out: 0, docked: true, away: false };
  if (t < P.liftEnds) return { lift: ease(span(P.boardingEnds, P.liftEnds)), out: 0, docked: false, away: false };
  if (t < P.departEnds) return { lift: 1, out: span(P.liftEnds, P.departEnds) ** 2, docked: false, away: false };
  if (t < P.returnStarts) return { lift: 1, out: 1, docked: false, away: true };
  if (t < P.approachEnds) return { lift: 1, out: 1 - ease(span(P.returnStarts, P.approachEnds)), docked: false, away: false };
  if (t < P.landEnds) return { lift: 1 - ease(span(P.approachEnds, P.landEnds)), out: 0, docked: false, away: false };
  return { lift: 0, out: 0, docked: true, away: false };
}
