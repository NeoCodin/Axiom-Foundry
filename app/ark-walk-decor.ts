/*
 * What the crew put up aboard, for the drone view. The Ark wakes bare; as people
 * come aboard they make it theirs: photos of each other, paintings, posters, the
 * children's drawings, star charts, banners and bunting, then rugs, plants, a sofa
 * and armchairs, planters of flowers, and at last murals across whole bulkheads.
 * The more of them there are, the more goes up. Pure planning against the layout;
 * ark-walk.tsx draws it.
 */

import { ROOM_SPOTS } from "./ark-walk-crew.ts";
import {
  DOCK_BOARD,
  DOCK_WALL_Z,
  DOOR_HALF_WIDTH,
  SIDE_ROOM_PLANS,
  WINDOW_WIDTH,
  WINDOWS,
  wallRibs,
  type Box,
  type WalkCompartment,
  type WalkLayout,
  type WalkRoomKind,
} from "./ark-walk-layout.ts";

export type WallArt = "painting" | "portraits" | "poster" | "drawings" | "chart" | "banner" | "mural";
export type FloorDecor = "plant" | "rug" | "sofa" | "armchair" | "table" | "planter" | "shelf" | "bench" | "cushions" | "mat";
export type Overhead = "bunting" | "lights";
export type DecorKind = WallArt | FloorDecor | Overhead;

/** A place on a wall: the wall's plane, which way it faces into the room, and the art's centre and size. */
export type WallSpot = {
  /** "z" for the hull walls (a plane of fixed z), "x" for the bulkheads (fixed x). */
  normal: "x" | "z";
  plane: number;
  /** The way the art faces, along the normal. */
  facing: 1 | -1;
  /** Centre along the wall, and height of the centre above the deck. */
  along: number;
  y: number;
  width: number;
  height: number;
};

export type DecorPiece = {
  kind: DecorKind;
  deck: number;
  room: WalkRoomKind;
  seed: number;
  /** Pieces go up in this order as the crew grows. */
  order: number;
  wall?: WallSpot;
  /** A floor piece's footprint, and the way its front faces. */
  floor?: Box & { facing: { x: number; z: number } };
  /** Bunting or lights strung across the room, wall to wall. */
  line?: { x: number; z0: number; z1: number; y: number };
};

/** Floor pieces the drone flies over rather than round. */
const UNDERFOOT: ReadonlySet<FloorDecor> = new Set(["rug", "cushions", "mat"]);

/** Which wall art each room's people favour, in turn. Drawings need children aboard. */
const ART: Record<WalkRoomKind, readonly WallArt[]> = {
  habitation: ["portraits", "painting", "drawings", "poster", "painting", "banner"],
  education: ["drawings", "poster", "chart", "drawings", "painting"],
  research: ["chart", "painting", "poster", "chart"],
  bridge: ["chart", "painting", "banner"],
  support: ["poster", "painting", "poster"],
  fabrication: ["poster", "painting", "poster"],
  hangar: ["portraits", "poster", "painting", "banner"],
  chamber: [],
};

/** Who decorates first: where people live, then where they learn, wait, heal and work. */
const WARMTH: Record<WalkRoomKind, number> = {
  habitation: 0,
  education: 1,
  hangar: 2,
  support: 3,
  research: 4,
  fabrication: 5,
  bridge: 6,
  chamber: 9,
};

type FloorSlot = { kind: FloorDecor; x: number; z: number; w: number; d: number; face?: { x: number; z: number }; fromBow?: boolean };
const toward = (x: number, z: number) => ({ x, z });

/**
 * Floor pieces, in the order they arrive. x from the room's stern end (or bow), z across
 * the ship; they keep to the open bands between the centre walkway and the furniture.
 */
const FLOOR: Partial<Record<WalkRoomKind, readonly FloorSlot[]>> = {
  habitation: [
    { kind: "plant", x: 1, z: 5.4, w: 0.8, d: 0.8 },
    { kind: "rug", x: 3.6, z: 6.4, w: 3, d: 2.6, fromBow: true },
    { kind: "plant", x: 1, z: -5.2, w: 0.8, d: 0.8, fromBow: true },
    { kind: "armchair", x: 9.6, z: -6.4, w: 1, d: 1, face: toward(-1, 0) },
    { kind: "shelf", x: 0.35, z: 6.6, w: 0.5, d: 2.2, face: toward(1, 0) },
    { kind: "plant", x: 1, z: 5.4, w: 0.8, d: 0.8, fromBow: true },
  ],
  education: [
    { kind: "rug", x: 2.6, z: -6.4, w: 3.6, d: 3.6, fromBow: true },
    { kind: "cushions", x: 2.6, z: -6.4, w: 2.6, d: 2.6, fromBow: true },
    { kind: "shelf", x: 0.35, z: -6.4, w: 0.5, d: 2.4, face: toward(-1, 0), fromBow: true },
    { kind: "plant", x: 1, z: -5.2, w: 0.8, d: 0.8 },
    { kind: "plant", x: 1, z: 5.4, w: 0.8, d: 0.8, fromBow: true },
  ],
  hangar: [
    { kind: "mat", x: 1.4, z: 0, w: 1.6, d: 2.8 },
    { kind: "plant", x: 0.8, z: -11.6, w: 0.8, d: 0.8 },
    { kind: "plant", x: 6.4, z: -12.6, w: 0.8, d: 0.8 },
    { kind: "bench", x: 18, z: -13, w: 2.4, d: 0.7, face: toward(0, 1) },
    { kind: "planter", x: 24, z: -6.4, w: 3.2, d: 1 },
  ],
  support: [
    { kind: "planter", x: 16, z: -6.4, w: 3.2, d: 1 },
    { kind: "plant", x: 1.2, z: 6.2, w: 0.8, d: 0.8 },
    { kind: "bench", x: 18.4, z: 6.6, w: 2, d: 0.7, face: toward(0, -1) },
    { kind: "planter", x: 21.6, z: -6.4, w: 3.2, d: 1 },
    { kind: "plant", x: 1.2, z: 5.6, w: 0.8, d: 0.8, fromBow: true },
  ],
  research: [
    { kind: "plant", x: 0.6, z: 4.6, w: 0.8, d: 0.8 },
    { kind: "sofa", x: 14.6, z: 6.4, w: 3, d: 1, face: toward(0, -1) },
    { kind: "plant", x: 1, z: 5.4, w: 0.8, d: 0.8, fromBow: true },
  ],
  bridge: [
    { kind: "plant", x: 1, z: 5.4, w: 0.8, d: 0.8 },
    { kind: "planter", x: 0.7, z: -8.4, w: 0.9, d: 2.8, fromBow: true },
    { kind: "planter", x: 0.7, z: 8.4, w: 0.9, d: 2.8, fromBow: true },
    { kind: "plant", x: 1, z: -5.4, w: 0.8, d: 0.8 },
  ],
  fabrication: [
    { kind: "plant", x: 1, z: 5.4, w: 0.8, d: 0.8, fromBow: true },
    { kind: "plant", x: 1, z: -5.4, w: 0.8, d: 0.8, fromBow: true },
  ],
};

/** Strings of bunting and lights, by fraction of the room's length. */
const LINES: Partial<Record<WalkRoomKind, readonly { kind: Overhead; at: number; after: number }[]>> = {
  habitation: [{ kind: "bunting", at: 0.3, after: 3 }, { kind: "lights", at: 0.55, after: 6 }, { kind: "bunting", at: 0.78, after: 10 }],
  education: [{ kind: "bunting", at: 0.5, after: 2 }],
  hangar: [{ kind: "bunting", at: 0.3, after: 3 }, { kind: "bunting", at: 0.7, after: 7 }],
  fabrication: [{ kind: "lights", at: 0.5, after: 3 }],
  research: [{ kind: "lights", at: 0.5, after: 3 }],
};

/** Whole bulkheads painted over, late, once there are many hands: room, which end, which side. */
const MURALS: readonly { room: WalkRoomKind; end: "stern" | "bow"; side: 1 | -1 }[] = [
  { room: "habitation", end: "stern", side: -1 },
  { room: "education", end: "bow", side: 1 },
  { room: "hangar", end: "stern", side: -1 },
  { room: "fabrication", end: "bow", side: -1 },
];
const MURAL_LATE = 7;

/** Tall things standing against a hull wall, which art would hang behind: room, side, stern-relative span. */
const CROWDED: readonly { room: WalkRoomKind; side: 1 | -1; from: number; to: number }[] = [
  { room: "fabrication", side: -1, from: 1.5, to: 5.5 }, // the press
  { room: "support", side: -1, from: 0, to: 99 }, // the culture tanks
];

function hash(value: number) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** How many pieces a crew of this size has put up: none on an empty ship, quickly at first, then steadily. */
export function decorBudget(population: number) {
  if (population <= 0) return 0;
  return Math.round(3 + 4.2 * Math.sqrt(population) + 0.25 * population);
}

/** Every piece the ship could hold, each with the place in line it goes up. */
export function decorSlots(layout: WalkLayout): DecorPiece[] {
  const pieces: DecorPiece[] = [];
  const half = layout.halfDepth;
  layout.decks.forEach((deck, deckIndex) => {
    const last = deck.compartments.length - 1;
    deck.compartments.forEach((room, roomIndex) => {
      if (room.kind === "chamber") return;
      const dock = room.kind === "hangar";
      const seedBase = deckIndex * 1000 + roomIndex * 100;
      const art = (kindIndex: number) => ART[room.kind][kindIndex % ART[room.kind].length];
      const queue: DecorPiece[][] = [[], [], []];
      const artY = Math.min(4.5, room.height - 2.1);

      // Hull walls: one piece between each pair of ribs, where no window or tall furniture is.
      const bounds = [room.x0, ...wallRibs(room), room.x1];
      for (const side of dock ? [-1] as const : [-1, 1] as const) {
        const offsets = (side < 0 ? WINDOWS[room.kind]?.port : WINDOWS[room.kind]?.starboard) ?? [];
        const busy = [
          ...offsets.map((offset) => ({ from: offset - WINDOW_WIDTH / 2, to: offset + WINDOW_WIDTH / 2 })),
          ...CROWDED.filter((crowd) => crowd.room === room.kind && crowd.side === side),
          ...(dock && side < 0 ? [{ from: DOCK_BOARD.at - DOCK_BOARD.width / 2, to: DOCK_BOARD.at + DOCK_BOARD.width / 2 }] : []),
          // The doors to the rooms behind the hall, and the nameplates over them.
          ...(side < 0 ? (SIDE_ROOM_PLANS[room.kind] ?? []).map((plan) => ({ from: plan.door - plan.doorHalf - 0.4, to: plan.door + plan.doorHalf + 0.4 })) : []),
        ];
        for (let bay = 0; bay < bounds.length - 1; bay += 1) {
          const from = bounds[bay] - room.x0;
          const to = bounds[bay + 1] - room.x0;
          if (busy.some((span) => span.from < to + 0.2 && span.to > from - 0.2)) continue;
          const seed = seedBase + (side + 1) * 20 + bay;
          queue[0].push({
            kind: art(0),
            deck: deckIndex,
            room: room.kind,
            seed,
            order: 0,
            wall: { normal: "z", plane: side * (room.half - 0.04), facing: side > 0 ? -1 : 1, along: room.x0 + (from + to) / 2, y: artY, width: Math.min(2.2, to - from - 0.7), height: 1.5 },
          });
        }
      }

      // Bulkheads: either side of each doorway, at both ends, unless a mural is planned there.
      const ends: { end: "stern" | "bow"; plane: number; facing: 1 | -1 }[] = [{ end: "stern", plane: room.x0 + 0.03, facing: 1 }];
      // The bow of the upper deck is the bridge window; the lower deck ends at the hull.
      if (roomIndex < last || dock) ends.push({ end: "bow", plane: room.x1 - 0.03, facing: -1 });
      for (const { end, plane, facing } of ends) {
        for (const side of [-1, 1] as const) {
          // In the dock only the gallery side of the pressure wall is indoors.
          const reach = dock && side > 0 ? DOCK_WALL_Z - 0.6 : room.half - 1.2;
          const seed = seedBase + 60 + (end === "bow" ? 10 : 0) + (side + 1) * 2;
          const mural = MURALS.some((plan) => plan.room === room.kind && plan.end === end && plan.side === side);
          if (mural) {
            const near = DOOR_HALF_WIDTH + 1.2;
            queue[2].push({
              kind: "mural",
              deck: deckIndex,
              room: room.kind,
              seed,
              order: MURAL_LATE,
              wall: { normal: "x", plane, facing, along: side * (near + reach) / 2, y: 3.8, width: Math.min(8, reach - near), height: 2.8 },
            });
            continue;
          }
          for (const [slot, centre] of [DOOR_HALF_WIDTH + 2.6, DOOR_HALF_WIDTH + 6.8].entries()) {
            if (centre + 1.6 > reach) continue;
            queue[1].push({
              kind: art(0),
              deck: deckIndex,
              room: room.kind,
              seed: seed + slot,
              order: 0,
              wall: { normal: "x", plane, facing, along: side * centre, y: 3.7, width: 2.6, height: 1.6 },
            });
          }
        }
      }

      // Hull and bulkhead art take turns, shuffled so the walls fill unevenly, as people would.
      const shuffled = (list: DecorPiece[]) => list.map((piece) => ({ piece, key: hash(piece.seed * 1.7 + 0.3) })).sort((a, b) => a.key - b.key).map(({ piece }) => piece);
      const walls = shuffled([...queue[0], ...queue[1]]);
      // Each room's favourite kind of art goes up first, then the others in turn.
      walls.forEach((piece, index) => { piece.kind = art(index); });
      const floors: DecorPiece[] = (FLOOR[room.kind] ?? []).map((slot, index) => {
        const x = slot.fromBow ? room.x1 - slot.x : room.x0 + slot.x;
        return {
          kind: slot.kind,
          deck: deckIndex,
          room: room.kind,
          seed: seedBase + 80 + index,
          order: 0,
          floor: { x0: x - slot.w / 2, x1: x + slot.w / 2, z0: slot.z - slot.d / 2, z1: slot.z + slot.d / 2, facing: slot.face ?? toward(0, 1) },
        };
      });
      // Within a room: art and furniture alternate, two pieces of art to each of furniture.
      const inRoom: DecorPiece[] = [];
      let nextWall = 0;
      let nextFloor = 0;
      while (nextWall < walls.length || nextFloor < floors.length) {
        const furnitureTurn = inRoom.length % 3 === 1;
        if ((furnitureTurn && nextFloor < floors.length) || nextWall >= walls.length) inRoom.push(floors[nextFloor++]);
        else inRoom.push(walls[nextWall++]);
      }
      inRoom.forEach((piece, index) => {
        piece.order = index + WARMTH[room.kind] * 0.35 + hash(piece.seed * 3.1) * 0.5;
        pieces.push(piece);
      });
      for (const piece of queue[2]) {
        piece.order = MURAL_LATE + WARMTH[room.kind] * 1.5;
        pieces.push(piece);
      }
      for (const [index, line] of (LINES[room.kind] ?? []).entries()) {
        pieces.push({
          kind: line.kind,
          deck: deckIndex,
          room: room.kind,
          seed: seedBase + 90 + index,
          order: line.after + WARMTH[room.kind] * 0.35,
          line: { x: room.x0 + (room.x1 - room.x0) * line.at, z0: -room.half + 0.3, z1: dock ? DOCK_WALL_Z - 0.3 : room.half - 0.3, y: room.height - 1.1 },
        });
      }
    });
  });
  return pieces.sort((a, b) => a.order - b.order);
}

/**
 * What is up, for a crew of this size: the first pieces in line, in rooms that are
 * awake. Children's drawings only where there are children to draw them.
 */
export function planDecor(layout: WalkLayout, population: number, { children = false }: { children?: boolean } = {}): DecorPiece[] {
  const awake = (piece: DecorPiece) => layout.decks[piece.deck].compartments.some((room) => room.kind === piece.room && room.online);
  return decorSlots(layout)
    .filter(awake)
    .slice(0, decorBudget(population))
    .map((piece) => (piece.kind === "drawings" && !children ? { ...piece, kind: piece.room === "education" ? "chart" : "painting" } : piece));
}

/** Footprints the drone must fly round. */
export function decorBlockers(pieces: readonly DecorPiece[]) {
  return pieces
    .filter((piece) => piece.floor && !UNDERFOOT.has(piece.kind as FloorDecor))
    .map((piece) => ({ deck: piece.deck, box: { x0: piece.floor!.x0, x1: piece.floor!.x1, z0: piece.floor!.z0, z1: piece.floor!.z1 } }));
}

/** Add the furniture people brought aboard to the decks' blockers. */
export function furnishLayout(layout: WalkLayout, pieces: readonly DecorPiece[]) {
  for (const { deck, box } of decorBlockers(pieces)) layout.decks[deck].blockers.push(box);
  return layout;
}

export type Fitting = { kind: "lockers" | "bench" | "board" | "plant"; deck: number; room: WalkRoomKind; x: number; side: 1 | -1; count: number };

/** The halls that were built with lockers and benches, and the ones with only lockers. */
const FITTED: ReadonlySet<WalkRoomKind> = new Set(["education", "habitation", "research", "support"]);
const FITTED_LOCKERS: ReadonlySet<WalkRoomKind> = new Set(["fabrication"]);
const LOCKER_WIDTH = 0.52;

/**
 * What stands along a hall's walls between its ribs, doors and windows. Lockers and benches came
 * with the ship; noticeboards and plants are the crew's, so they wait for people. Each one that
 * stands on the floor is added to the deck's blockers.
 */
export function planFittings(layout: WalkLayout, decor: readonly DecorPiece[], population: number) {
  const fittings: Fitting[] = [];
  const marks = crewFootprints(layout);
  layout.decks.forEach((deck, deckIndex) => {
    for (const room of deck.compartments) {
      if (!room.online || !(FITTED.has(room.kind) || FITTED_LOCKERS.has(room.kind))) continue;
      const width = room.x1 - room.x0;
      const bays = Math.max(2, Math.round(width / 5.6));
      for (const side of [-1, 1] as const) {
        const near = (z0: number, z1: number) => (side > 0 ? z1 > room.half - 1.6 : z0 < -room.half + 1.6);
        const taken: [number, number][] = Array.from({ length: bays + 1 }, (_, bay) => {
          const x = room.x0 + (width * bay) / bays;
          return [x - 0.7, x + 0.7];
        });
        for (const sideRoom of deck.sideRooms) {
          if (sideRoom.section === room.kind && Boolean(sideRoom.starboard) === side > 0) taken.push([sideRoom.door.x0 - 0.6, sideRoom.door.x1 + 0.6]);
        }
        const windows = (side < 0 ? WINDOWS[room.kind]?.port : WINDOWS[room.kind]?.starboard) ?? [];
        for (const offset of windows) taken.push([room.x0 + offset - WINDOW_WIDTH / 2 - 0.4, room.x0 + offset + WINDOW_WIDTH / 2 + 0.4]);
        for (const box of deck.blockers) if (near(box.z0, box.z1)) taken.push([box.x0 - 0.2, box.x1 + 0.2]);
        for (const piece of decor) {
          if (piece.deck === deckIndex && piece.wall?.normal === "z" && Math.sign(piece.wall.plane) === side && piece.wall.y - piece.wall.height / 2 < 3.2) {
            taken.push([piece.wall.along - piece.wall.width / 2 - 0.2, piece.wall.along + piece.wall.width / 2 + 0.2]);
          }
        }
        for (const mark of marks) {
          if (mark.deck === deckIndex && near(mark.z, mark.z)) taken.push([mark.x - 0.6, mark.x + 0.6]);
        }
        taken.sort((a, b) => a[0] - b[0]);
        const spans: [number, number][] = [];
        let cursor = room.x0;
        for (const [from, to] of taken) {
          if (from > cursor) spans.push([cursor, from]);
          cursor = Math.max(cursor, to);
        }
        if (room.x1 > cursor) spans.push([cursor, room.x1]);

        const block = (x0: number, x1: number, depth: number) => {
          const z0 = side > 0 ? room.half - depth : -room.half;
          deck.blockers.push({ x0, x1, z0, z1: z0 + depth });
        };
        spans.filter(([from, to]) => to - from >= 2.3).forEach(([from, to], turn) => {
          const room_ = to - from;
          const mid = (from + to) / 2;
          if (FITTED_LOCKERS.has(room.kind) || turn % 2 === 0) {
            const count = Math.min(7, Math.floor((room_ - 0.2) / LOCKER_WIDTH));
            const x = mid - ((count - 1) * LOCKER_WIDTH) / 2;
            fittings.push({ kind: "lockers", deck: deckIndex, room: room.kind, x, side, count });
            block(x - LOCKER_WIDTH / 2, x + (count - 0.5) * LOCKER_WIDTH, 0.68);
          } else {
            fittings.push({ kind: "bench", deck: deckIndex, room: room.kind, x: mid, side, count: 1 });
            block(mid - 1.05, mid + 1.05, 0.72);
            if (population > 0) fittings.push({ kind: "board", deck: deckIndex, room: room.kind, x: mid, side, count: 1 });
          }
          if (population > 0 && FITTED.has(room.kind) && turn % 3 === 2) {
            fittings.push({ kind: "plant", deck: deckIndex, room: room.kind, x: to - 0.1, side, count: 1 });
          }
        });
      }
    }
  });
  return fittings;
}

/** Where crew stand and walk, so furniture never lands on them. */
export function crewFootprints(layout: WalkLayout) {
  const marks: { deck: number; x: number; z: number }[] = [];
  layout.decks.forEach((deck, deckIndex) => {
    for (const room of deck.compartments as WalkCompartment[]) {
      for (const spot of ROOM_SPOTS[room.kind]) {
        if (spot.deck !== undefined && spot.deck !== deckIndex) continue;
        const from = { x: room.x0 + spot.at.x, z: spot.at.z };
        const to = spot.to ? { x: room.x0 + spot.to.x, z: spot.to.z } : from;
        const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.5));
        for (let step = 0; step <= steps; step += 1) {
          marks.push({ deck: deckIndex, x: from.x + ((to.x - from.x) * step) / steps, z: from.z + ((to.z - from.z) * step) / steps });
        }
      }
    }
  });
  return marks;
}
