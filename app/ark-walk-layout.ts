/*
 * The walkable deck for the drone view, built from the same room list as the
 * 2D cutaway. Pure geometry in metres on the floor plane: x runs from the
 * stern to the bow, z across the ship. Compartments sit end to end with a
 * bulkhead and a doorway between each; furniture blocks movement.
 */

export type WalkRoomKind = "fabrication" | "chamber" | "habitation" | "research" | "bridge";

export type Box = { x0: number; x1: number; z0: number; z1: number };

export type WalkCompartment = {
  kind: WalkRoomKind;
  label: string;
  online: boolean;
  x0: number;
  x1: number;
  height: number;
  /** Where the room's console stands; using it opens the room's screen. */
  console: { x: number; z: number };
};

export type WalkLayout = {
  compartments: WalkCompartment[];
  doorways: Box[];
  blockers: Box[];
  halfDepth: number;
  length: number;
  spawn: { x: number; z: number; yaw: number };
  heart: { x: number; z: number };
};

/** Stern to bow along one deck. Life Support and the Learning Deck are below. */
export const DECK_ORDER: readonly WalkRoomKind[] = ["fabrication", "chamber", "habitation", "research", "bridge"];

const WIDTH: Record<WalkRoomKind, number> = { fabrication: 10, chamber: 12, habitation: 10, research: 9, bridge: 8 };
const HEIGHT: Record<WalkRoomKind, number> = { fabrication: 3.6, chamber: 6, habitation: 3.4, research: 3.6, bridge: 4 };
export const HALF_DEPTH = 4;
export const BULKHEAD = 0.4;
export const DOOR_HALF_WIDTH = 1;
export const DOOR_HEIGHT = 2.6;

function furniture(kind: WalkRoomKind, x0: number, x1: number): Box[] {
  const cx = (x0 + x1) / 2;
  switch (kind) {
    case "fabrication":
      return [
        { x0: x0 + 1.4, x1: x0 + 3.6, z0: -3.8, z1: -1.6 },
        { x0: x0 + 4.6, x1: x1 - 0.8, z0: 2.3, z1: 3.3 },
      ];
    case "chamber":
      return [
        { x0: cx - 1.7, x1: cx + 1.7, z0: -1.7, z1: 1.7 },
        // The four pillars around the pedestal.
        ...[-2.8, 2.8].flatMap((px) => [-2.8, 2.8].map((pz) => ({ x0: cx + px - 0.2, x1: cx + px + 0.2, z0: pz - 0.2, z1: pz + 0.2 }))),
      ];
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
  }
}

function consoleFor(kind: WalkRoomKind, x0: number, x1: number) {
  const cx = (x0 + x1) / 2;
  switch (kind) {
    case "fabrication":
      return { x: x0 + 2.5, z: -2.7 };
    case "chamber":
      return { x: cx, z: 0 };
    case "habitation":
      return { x: x1 - 3, z: 1.9 };
    case "research":
      return { x: cx, z: -3.45 };
    case "bridge":
      return { x: x1 - 2, z: 0 };
  }
}

export function buildWalkLayout(
  rooms: readonly { kind: WalkRoomKind; label: string; online: boolean }[],
): WalkLayout {
  const byKind = new Map(rooms.map((room) => [room.kind, room]));
  const compartments: WalkCompartment[] = [];
  const doorways: Box[] = [];
  const blockers: Box[] = [];
  let x = 0;
  DECK_ORDER.forEach((kind, index) => {
    const room = byKind.get(kind);
    const x0 = x;
    const x1 = x + WIDTH[kind];
    compartments.push({
      kind,
      label: room?.label ?? (kind === "chamber" ? "Axiom Chamber" : kind),
      online: kind === "chamber" ? true : room?.online ?? false,
      x0,
      x1,
      height: HEIGHT[kind],
      console: consoleFor(kind, x0, x1),
    });
    blockers.push(...furniture(kind, x0, x1));
    x = x1;
    if (index < DECK_ORDER.length - 1) {
      doorways.push({ x0: x, x1: x + BULKHEAD, z0: -DOOR_HALF_WIDTH, z1: DOOR_HALF_WIDTH });
      x += BULKHEAD;
    }
  });
  const chamber = compartments.find((compartment) => compartment.kind === "chamber")!;
  return {
    compartments,
    doorways,
    blockers,
    halfDepth: HALF_DEPTH,
    length: x,
    spawn: { x: compartments[0].x0 + 1.6, z: 0, yaw: 0 },
    heart: { x: (chamber.x0 + chamber.x1) / 2, z: 0 },
  };
}

function inside(box: Box, x: number, z: number, margin: number) {
  return x >= box.x0 + margin && x <= box.x1 - margin && z >= box.z0 + margin && z <= box.z1 - margin;
}

/** Can a drone of this radius hover at (x, z)? */
export function isWalkable(layout: WalkLayout, x: number, z: number, radius = 0.3) {
  const open =
    layout.compartments.some((compartment) =>
      inside({ x0: compartment.x0, x1: compartment.x1, z0: -layout.halfDepth, z1: layout.halfDepth }, x, z, radius),
    ) ||
    // A doorway is passable along its whole thickness; the margin applies across it only.
    layout.doorways.some((door) => x >= door.x0 - radius && x <= door.x1 + radius && z >= door.z0 + radius && z <= door.z1 - radius);
  if (!open) return false;
  return !layout.blockers.some((box) => inside(box, x, z, -radius));
}

/** Move with wall sliding: try the full step, then each axis alone. */
export function moveWithin(layout: WalkLayout, x: number, z: number, dx: number, dz: number, radius = 0.3) {
  if (isWalkable(layout, x + dx, z + dz, radius)) return { x: x + dx, z: z + dz };
  if (isWalkable(layout, x + dx, z, radius)) return { x: x + dx, z };
  if (isWalkable(layout, x, z + dz, radius)) return { x, z: z + dz };
  return { x, z };
}

export function compartmentAt(layout: WalkLayout, x: number) {
  return layout.compartments.find((compartment) => x >= compartment.x0 && x <= compartment.x1) ?? null;
}
