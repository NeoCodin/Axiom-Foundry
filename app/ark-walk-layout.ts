/*
 * The walkable Ark for the drone view, built from the same room list as the
 * 2D cutaway: two decks, as the cutaway draws them. Pure geometry in metres
 * on each deck's floor plane: x runs from the stern to the bow, z across the
 * ship. Compartments sit end to end with a bulkhead and a doorway between
 * each; furniture blocks movement. The Law-Heart chamber is one two-storey
 * atrium: a catwalk rings it on the upper deck, its floor is on the lower,
 * and grav-lifts in two corners carry the drone between them.
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
};

/** Stern to bow along each deck, matching the 2D cutaway's two rows. */
export const UPPER_DECK: readonly WalkRoomKind[] = ["fabrication", "chamber", "habitation", "research", "bridge"];
export const LOWER_DECK: readonly WalkRoomKind[] = ["support", "chamber", "education", "hangar"];

const WIDTH: Record<WalkRoomKind, number> = {
  fabrication: 10,
  support: 10,
  chamber: 12,
  habitation: 10,
  education: 10,
  research: 9,
  hangar: 9,
  bridge: 8,
};
const HEIGHT: Record<WalkRoomKind, number> = {
  fabrication: 3.6,
  support: 3.6,
  chamber: 9,
  habitation: 3.4,
  education: 3.4,
  research: 3.6,
  hangar: 3.8,
  bridge: 4,
};
export const UPPER_FLOOR = 4;
export const HALF_DEPTH = 4;
export const BULKHEAD = 0.4;
export const DOOR_HALF_WIDTH = 1;
export const DOOR_HEIGHT = 2.6;
export const LIFT_RADIUS = 0.8;

function pillars(cx: number): Box[] {
  return [-4, 4].flatMap((px) => [-2.2, 2.2].map((pz) => ({ x0: cx + px - 0.2, x1: cx + px + 0.2, z0: pz - 0.2, z1: pz + 0.2 })));
}

function furniture(kind: WalkRoomKind, upper: boolean, x0: number, x1: number): Box[] {
  const cx = (x0 + x1) / 2;
  switch (kind) {
    case "fabrication":
      return [
        { x0: x0 + 1.4, x1: x0 + 3.6, z0: -3.8, z1: -1.6 },
        { x0: x0 + 4.6, x1: x1 - 0.8, z0: 2.3, z1: 3.3 },
      ];
    case "chamber":
      // Upstairs the middle is open air around the heart; downstairs it is the pedestal.
      return upper
        ? [{ x0: cx - 4, x1: cx + 4, z0: -2.2, z1: 2.2 }, ...pillars(cx)]
        : [{ x0: cx - 1.7, x1: cx + 1.7, z0: -1.7, z1: 1.7 }, ...pillars(cx)];
    case "habitation":
      return [
        { x0: x0 + 0.8, x1: x0 + 5.2, z0: -3.9, z1: -2.5 },
        { x0: x1 - 4.2, x1: x1 - 1.8, z0: 1.3, z1: 2.5 },
      ];
    case "research":
      return [{ x0: x0 + 1.2, x1: x1 - 1.2, z0: -3.9, z1: -3.0 }];
    case "bridge":
      return [
        { x0: x1 - 2.6, x1: x1 - 1.4, z0: -1.4, z1: 1.4 },
        { x0: x1 - 3.8, x1: x1 - 3.0, z0: -0.4, z1: 0.4 }, // the pilot's stool
      ];
    case "support":
      return [
        { x0: x0 + 1.6, x1: x0 + 8.4, z0: -3.9, z1: -2.0 }, // the three culture tanks
        { x0: x0 + 4, x1: x0 + 6, z0: 3.0, z1: 3.9 }, // the atmosphere desk
      ];
    case "education":
      return [
        { x0: x0 + 2.6, x1: x0 + 7.4, z0: 1.4, z1: 1.9 }, // two rows of desks
        { x0: x0 + 2.6, x1: x0 + 7.4, z0: 2.7, z1: 3.2 },
        { x0: x0 + 4.7, x1: x0 + 5.3, z0: -2.9, z1: -2.4 }, // the lectern
      ];
    case "hangar":
      return [
        { x0: x0 + 1.6, x1: x0 + 6.8, z0: -3.4, z1: -1.0 }, // the shuttle
        { x0: x1 - 2.4, x1: x1 - 1.2, z0: 2.0, z1: 2.8 }, // the launch desk
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
  const cx = (chamber.x0 + chamber.x1) / 2;
  return {
    decks,
    halfDepth: HALF_DEPTH,
    spawn: { deck: 0, x: decks[0].compartments[0].x0 + 1.6, z: 0, yaw: 0 },
    heart: { x: cx, y: 3.5, z: 0 },
    atrium: { x0: cx - 4, x1: cx + 4, z0: -2.2, z1: 2.2 },
    lifts: [
      { x: chamber.x0 + 1, z: -3.1 },
      { x: chamber.x1 - 1, z: 3.1 },
    ],
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
