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
 *
 * The cutaway is a slice; the ship is deeper than it. Behind some halls' port
 * walls are rooms of their own, through doors: stores and a machine shop behind
 * Fabrication, cabins and the galley behind Habitation, the labs behind the
 * Analysis Core, a farm and the infirmary behind Life Support, a library, a
 * classroom and a playroom behind the Learning Deck, and the Armory and a
 * briefing room behind the Recon Dock. A room nobody uses yet stays sealed.
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
  /** How far people have filled it: 0 is bare, and more rows of desks follow the crew. */
  fill: number;
};

export type SideRoomKind =
  | "cabin"
  | "galley"
  | "armory"
  | "briefing"
  | "simulator"
  | "stores"
  | "workshop"
  | "lab"
  | "library"
  | "classroom"
  | "playroom"
  | "farm"
  | "infirmary";

/** A room behind a hall's port wall. z0 is its far wall, z1 the hall's side. */
export type SideRoom = Box & {
  id: string;
  kind: SideRoomKind;
  label: string;
  /** The hall it opens off. */
  section: WalkRoomKind;
  open: boolean;
  height: number;
  /** The doorway through the hall's wall. */
  door: Box;
};

export type WalkDeck = {
  label: string;
  floorY: number;
  compartments: WalkCompartment[];
  doorways: Box[];
  blockers: Box[];
  sideRooms: SideRoom[];
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

export const UPPER_FLOOR = 11.5;
/** Half the ship's width: 40 metres across, room enough to feel empty. */
export const HALF_DEPTH = 20;
export const BULKHEAD = 0.4;
export const DOOR_HALF_WIDTH = 3;
export const DOOR_HEIGHT = 4.6;
export const LIFT_RADIUS = 0.9;
/** Half the core room's outside size: the gallery round it is what is left of the chamber. */
export const CORE_HALF_X = 11;
export const CORE_HALF_Z = 14;

/** Hull windows: their size, and where they sit, from each room's stern end, on the port (-z) and starboard (+z) walls. */
export const WINDOW_WIDTH = 3;
export const WINDOW_LOW = 1.2;
export const WINDOW_HIGH = 6.5;
export const WINDOWS: Partial<Record<WalkRoomKind, { port?: readonly number[]; starboard?: readonly number[] }>> = {
  fabrication: { starboard: [6, 10, 14, 26, 30] },
  habitation: { starboard: [7.5, 11, 14.5, 20, 23.5, 27] },
  research: { starboard: [6, 9.5, 13, 19] },
  bridge: { port: [8, 11.5, 15, 18.5], starboard: [8, 11.5, 15, 18.5] },
  support: { starboard: [2.5, 6.7, 14.8, 22, 26, 30] },
  education: { starboard: [2.5, 6, 9.5, 13, 19, 22.5, 26] },
  // The dock's back wall is the Armory's, with the recon board on it.
  // The stretch past the lounge window is the combat simulator's wall.
  hangar: { port: [3.5] },
  chamber: { port: [3, 9.5, 16, 24.5, 31], starboard: [3, 9.5, 16, 24.5, 31] },
};

/** Where a compartment's wall ribs stand, stern to bow, between its bays. */
export function wallRibs(room: { x0: number; x1: number }) {
  const width = room.x1 - room.x0;
  const bays = Math.max(2, Math.round(width / 3.5));
  return Array.from({ length: bays - 1 }, (_, bay) => room.x0 + (width * (bay + 1)) / bays);
}

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

/** The pressure wall between the dock's gallery and its launch bay, across the ship. */
export const DOCK_WALL_Z = HALF_DEPTH - 5;
/** The recon status board on the dock's back wall: centre and width, from the dock's stern end. */
export const DOCK_BOARD = { at: 19, width: 5 } as const;

/** The wall between a hall and the rooms behind it, and how tall those rooms' doors are. */
export const INNER_WALL = 0.4;
export const SIDE_DOOR_HEIGHT = 2.7;
/** How many people must be aboard before each cabin is lived in. */
export const CABIN_OPENS_AT = [1, 6, 14, 24, 36, 50, 70] as const;

export type SideRoomPlan = {
  id: string;
  kind: SideRoomKind;
  label: string;
  /** Along the hall, from its stern end. */
  from: number;
  to: number;
  /** Across the ship: the far wall, and the hall's side. */
  z0: number;
  z1: number;
  height: number;
  /** The door's centre along the hall, and half its width. */
  door: number;
  doorHalf: number;
};

const behind = (depth: number) => ({ z0: -(HALF_DEPTH + INNER_WALL + depth), z1: -(HALF_DEPTH + INNER_WALL) });
const cabin = (index: number, from: number): SideRoomPlan => ({
  id: `cabin-${index}`, kind: "cabin", label: "Quarters", from, to: from + 3.9, ...behind(5.6), height: 3.4, door: from + 1.95, doorHalf: 0.75,
});
const sideRoom = (kind: SideRoomKind, label: string, from: number, to: number, depth: number, height: number, door: number, doorHalf = 0.8): SideRoomPlan => ({
  id: kind, kind, label, from, to, ...behind(depth), height, door, doorHalf,
});

/** The rooms behind each hall, stern to bow. */
export const SIDE_ROOM_PLANS: Partial<Record<WalkRoomKind, readonly SideRoomPlan[]>> = {
  // Doors go where each hall's wall is clear: past the press and the racks, between the
  // research desks, either side of the chalkboard, past the culture tanks, beside the cargo.
  fabrication: [
    sideRoom("stores", "Stores", 0, 6.6, 7, 6, 1, 0.75),
    sideRoom("workshop", "Machine shop", 6.8, 17, 7, 6, 15, 0.9),
  ],
  research: [sideRoom("lab", "Analysis labs", 0, 24, 10, 7, 7.5)],
  education: [
    // The library is the size of a university's: tall stacks round a long reading floor.
    sideRoom("library", "Library", 0, 17, 16, 10.5, 8.5, 1.6),
    sideRoom("classroom", "Classroom", 17.2, 23.8, 6, 4.2, 20.5),
    sideRoom("playroom", "Playroom", 24, 30, 6, 4.2, 27),
  ],
  support: [
    sideRoom("farm", "Hydroponic farm", 0, 24, 10, 6, 0.75, 0.6),
    sideRoom("infirmary", "Infirmary", 24.2, 30, 7, 5, 27),
  ],
  habitation: [
    cabin(0, 0),
    cabin(1, 4.1),
    cabin(2, 8.2),
    cabin(3, 12.3),
    cabin(4, 16.4),
    cabin(5, 20.5),
    cabin(6, 24.6),
    { id: "galley", kind: "galley", label: "Galley", from: 28.7, to: 34, ...behind(5.6), height: 3.4, door: 31, doorHalf: 0.9 },
  ],
  hangar: [
    sideRoom("simulator", "Combat simulator", 5.2, 9.4, 9.6, 5.2, 7.3),
    { id: "armory", kind: "armory", label: "Armory", from: 9.6, to: 24.6, ...behind(9.6), height: 5.2, door: 11, doorHalf: 1.1 },
    sideRoom("briefing", "Briefing room", 24.8, 30.4, 9.6, 5.2, 25.9),
  ],
};

/** How far along the Learning Deck each further block of desks starts. */
export const DESK_BLOCK = 11;

/** The library's floor plan, in metres out from its far wall. */
export const LIBRARY_STACKS = [3.2, 6.2, 9.2, 12.2] as const;
export const LIBRARY_TABLES = [4.5, 9] as const;

/** The furniture in a room behind a hall, in deck coordinates. */
function sideFurniture(room: Box & { kind: SideRoomKind }): Box[] {
  const { x0, x1, z0, z1 } = room;
  switch (room.kind) {
    case "cabin":
      return [
        { x0: x0 + 0.1, x1: x0 + 1.1, z0: z0 + 0.5, z1: z0 + 2.7 }, // the bunk
        { x0: x1 - 0.75, x1: x1 - 0.1, z0: z0 + 0.5, z1: z0 + 1.7 }, // the desk
        { x0: x1 - 0.7, x1: x1 - 0.1, z0: z1 - 1.7, z1: z1 - 0.7 }, // the wardrobe
      ];
    case "galley":
      return [
        { x0: x0 + 0.1, x1: x1 - 0.1, z0: z0 + 0.05, z1: z0 + 0.75 }, // stoves and sinks along the far wall
        { x0: x0 + 1.2, x1: x1 - 1.2, z0: z0 + 2.3, z1: z0 + 3.1 }, // the island
        { x0: x0 + 0.05, x1: x0 + 0.85, z0: z1 - 1.6, z1: z1 - 0.6 }, // the cold store
      ];
    case "armory":
      return [
        { x0: x0 + 4.6, x1: x1 - 0.1, z0: z0 + 0.1, z1: z0 + 2.5 }, // the firing range, behind its glass
        ...[0, 1, 2].map((rack) => ({ x0: x0 + 3 + rack * 3.2, x1: x0 + 5.8 + rack * 3.2, z0: z1 - 0.7, z1: z1 - 0.1 })), // weapon racks
        ...[3.6, 5.4, 7.2].map((at) => ({ x0: x1 - 1.3, x1: x1 - 0.2, z0: z0 + at - 0.5, z1: z0 + at + 0.5 })), // armour stands
        { x0: x0 + 0.1, x1: x0 + 1.1, z0: z0 + 3.2, z1: z0 + 6.2 }, // the repair bench
        { x0: x0 + 6, x1: x0 + 8.6, z0: z0 + 4, z1: z0 + 6.4 }, // the forge cradle and its console
      ];
    case "briefing":
      return [{ x0: x0 + 1.6, x1: x0 + 4, z0: z0 + 3.6, z1: z0 + 6 }]; // the map table
    case "simulator":
      return [
        { x0: x0 + 0.15, x1: x0 + 1.15, z0: z0 + 0.6, z1: z0 + 2.6 }, // four VR pods along the side walls
        { x0: x0 + 0.15, x1: x0 + 1.15, z0: z0 + 3.2, z1: z0 + 5.2 },
        { x0: x1 - 1.15, x1: x1 - 0.15, z0: z0 + 0.6, z1: z0 + 2.6 },
        { x0: x1 - 1.15, x1: x1 - 0.15, z0: z0 + 3.2, z1: z0 + 5.2 },
        { x0: x0 + 1.6, x1: x1 - 1.6, z0: z0 + 0.1, z1: z0 + 0.7 }, // the console under the screen
      ];
    case "stores":
      return [
        { x0: x0 + 0.1, x1: x0 + 1, z0: z0 + 0.3, z1: z1 - 2 }, // shelving
        { x0: x0 + 2.8, x1: x0 + 3.7, z0: z0 + 0.3, z1: z0 + 5.2 },
        { x0: x1 - 1, x1: x1 - 0.1, z0: z0 + 0.3, z1: z1 - 2 },
      ];
    case "workshop":
      return [
        { x0: x0 + 1, x1: x0 + 3.6, z0: z0 + 0.2, z1: z0 + 1.2 }, // the lathe
        { x0: x0 + 4.4, x1: x0 + 5.2, z0: z0 + 0.2, z1: z0 + 1 }, // the drill press
        { x0: x0 + 0.1, x1: x0 + 0.8, z0: z0 + 2.5, z1: z0 + 5.5 }, // parts bins
        { x0: x0 + 4.6, x1: x0 + 6.6, z0: z0 + 3, z1: z0 + 5 }, // the turntable and the machine on it
        { x0: x1 - 1, x1: x1 - 0.1, z0: z0 + 1, z1: z1 - 1.6 }, // the workbench
      ];
    case "lab":
      return [
        { x0: x0 + 2, x1: x0 + 5.5, z0: z0 + 2.8, z1: z0 + 4 }, // benches
        { x0: x0 + 9.5, x1: x0 + 13, z0: z0 + 2.8, z1: z0 + 4 },
        { x0: x0 + 2, x1: x0 + 5.5, z0: z0 + 0.2, z1: z0 + 0.9 }, // the fume hood
        { x0: x0 + 0.1, x1: x0 + 1, z0: z0 + 0.3, z1: z1 - 1.8 }, // server racks
        { x0: x0 + 10, x1: x0 + 14.5, z0: z0 + 0.2, z1: z0 + 0.9 }, // cases of what has been found
      ];
    case "library":
      return [
        { x0: x0 + 0.1, x1: x1 - 0.1, z0: z0 + 0.1, z1: z0 + 0.6 }, // two storeys of shelves round the walls
        { x0: x0 + 0.1, x1: x0 + 0.6, z0: z0 + 0.6, z1: z1 - 1 },
        ...LIBRARY_STACKS.map((row) => ({ x0: x0 + 1.6, x1: x0 + 6.6, z0: z0 + row - 0.35, z1: z0 + row + 0.35 })), // stacks on the floor
        ...LIBRARY_TABLES.map((row) => ({ x0: x0 + 9.4, x1: x0 + 14, z0: z0 + row - 0.7, z1: z0 + row + 0.7 })), // long reading tables
      ];
    case "classroom":
      return [2.4, 4].map((row) => ({ x0: x0 + 0.8, x1: x1 - 0.8, z0: z0 + row - 0.3, z1: z0 + row + 0.3 })); // two rows of desks
    case "playroom":
      return [
        { x0: x1 - 1.4, x1: x1 - 0.2, z0: z0 + 0.3, z1: z0 + 2.5 }, // the slide
        { x0: x0 + 0.6, x1: x0 + 1.6, z0: z0 + 0.6, z1: z0 + 1.6 }, // the crayon table
      ];
    case "farm":
      return [1.2, 3, 4.8].map((bed) => ({ x0: x0 + 1, x1: x1 - 1, z0: z0 + bed - 0.4, z1: z0 + bed + 0.4 })); // raised beds
    case "infirmary":
      return [
        { x0: x0 + 0.15, x1: x0 + 1.15, z0: z0 + 0.2, z1: z0 + 2.3 }, // four beds
        { x0: x1 - 1.15, x1: x1 - 0.15, z0: z0 + 0.2, z1: z0 + 2.3 },
        { x0: x0 + 0.15, x1: x0 + 1.15, z0: z0 + 3.4, z1: z0 + 5.5 },
        { x0: x1 - 1.15, x1: x1 - 0.15, z0: z0 + 3.4, z1: z0 + 5.5 },
      ];
  }
}
/** The recon dock's plan, in metres from its stern end (x) and across the ship (z). */
const DOCK = { wallZ: DOCK_WALL_Z, doorFrom: 10, doorTo: 14, padX: 6.5, parkedX: 19, padZ: (DOCK_WALL_Z + 0.4 + HALF_DEPTH) / 2 } as const;

const WIDTH: Record<WalkRoomKind, number> = {
  // Fabrication is the Ark's workshop floor, longer than the rest; Support below it matches, to keep the core square.
  fabrication: 36,
  support: 36,
  chamber: 34,
  habitation: 34,
  education: 34,
  research: 24,
  bridge: 24,
  // The dock runs under both the Analysis Core and the bridge.
  hangar: 24 + BULKHEAD + 24,
};
const HEIGHT: Record<WalkRoomKind, number> = {
  fabrication: 11,
  support: 10.5,
  chamber: UPPER_FLOOR + 11,
  habitation: 10,
  education: 10.5,
  research: 10,
  bridge: 11,
  hangar: 10.5,
};

function furniture(kind: WalkRoomKind, upper: boolean, x0: number, x1: number, fill: number): Box[] {
  const cx = (x0 + x1) / 2;
  switch (kind) {
    case "fabrication":
      // Laid out where they stand on the wide floor (not pushed out to the walls): the production line
      // down the starboard side, the machine racks and the control desk to port.
      return [
        { x0: x0 + 1.1, x1: x0 + 3.7, z0: 7.7, z1: 10.3 }, // the salvage intake hopper
        { x0: x0 + 3.7, x1: x0 + 10.2, z0: 8.3, z1: 9.7 }, // the first belt
        { x0: x0 + 10.2, x1: x0 + 12.8, z0: 7.4, z1: 10.6 }, // the Law Press
        { x0: x0 + 12.8, x1: x0 + 18.6, z0: 8.3, z1: 9.7 }, // the second belt
        { x0: x0 + 19.6, x1: x0 + 20.4, z0: 7, z1: 7.8 }, // the arm's post
        { x0: x0 + 21.2, x1: x0 + 22.4, z0: 8.3, z1: 9.5 }, // the parts lift
        { x0: x0 + 6, x1: x0 + 13.4, z0: -13.9, z1: -12.4 }, // machine racks, one per Foundry tier
        { x0: x0 + 8.3, x1: x0 + 10.7, z0: -9.8, z1: -8.6 }, // the control desk
      ];
    case "chamber":
      // The sealed core room fills the middle on both decks.
      return [{ x0: cx - CORE_HALF_X, x1: cx + CORE_HALF_X, z0: -CORE_HALF_Z, z1: CORE_HALF_Z }];
    case "habitation":
      // People sleep in their cabins now; the hall is their common room.
      return [
        { x0: x1 - 5.4, x1: x1 - 1.8, z0: 2.4, z1: 4.4 }, // the mess table and its chairs
        { x0: x0 + 1, x1: x0 + 5, z0: 6.2, z1: 6.9 }, // lockers
      ];
    case "research":
      return [
        { x0: x0 + 1, x1: x0 + 6.4, z0: -6.9, z1: -5.4 }, // desks under the wall screens, the labs' door between them
        { x0: x0 + 8.6, x1: x1 - 1, z0: -6.9, z1: -5.4 },
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
        { x0: x0 + 1.4, x1: x0 + 12.6, z0: -6.6, z1: -4.2 }, // four culture tanks
        { x0: x0 + 5, x1: x0 + 8.4, z0: 5, z1: 6.4 }, // the atmosphere desk
        { x0: x0 + 9.4, x1: x0 + 13.2, z0: 6.2, z1: 6.9 }, // hydroponic shelves
      ];
    case "education":
      if (fill === 0) return [];
      return [
        { x0: x0 + 6.6, x1: x0 + 7.4, z0: -5.4, z1: -4.8 }, // the lectern
        ...Array.from({ length: fill }).flatMap((_, block) => [2, 3.6, 5.2].map((rowZ) => ({
          x0: x0 + 2 + block * DESK_BLOCK, x1: x0 + 12 + block * DESK_BLOCK, z0: rowZ - 0.3, z1: rowZ + 0.3,
        }))), // rows of desks
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
  opens: (plan: SideRoomPlan) => boolean,
  fills: Partial<Record<WalkRoomKind, number>>,
): WalkDeck {
  const compartments: WalkCompartment[] = [];
  const doorways: Box[] = [];
  const blockers: Box[] = [];
  const sideRooms: SideRoom[] = [];
  let x = 0;
  order.forEach((kind, index) => {
    const room = byKind.get(kind);
    const x0 = x;
    const x1 = x + WIDTH[kind];
    const fill = fills[kind] ?? 1;
    compartments.push({
      kind,
      label: room?.label ?? (kind === "chamber" ? "Axiom Chamber" : kind),
      online: kind === "chamber" ? true : room?.online ?? false,
      x0,
      x1,
      // The atrium is counted from the lower floor; upstairs only its top part remains.
      height: kind === "chamber" && upper ? HEIGHT.chamber - UPPER_FLOOR : HEIGHT[kind],
      fill,
    });
    // The chamber and the dock are laid out at full width; the rest is pushed out to the walls.
    const pieces = furniture(kind, upper, x0, x1, fill);
    blockers.push(...(kind === "chamber" || kind === "hangar" || kind === "fabrication" ? pieces : pieces.map(againstWall)));
    const online = kind === "chamber" ? true : room?.online ?? false;
    for (const plan of SIDE_ROOM_PLANS[kind] ?? []) {
      const side: SideRoom = {
        id: plan.id,
        kind: plan.kind,
        label: plan.label,
        section: kind,
        open: online && opens(plan),
        x0: x0 + plan.from,
        x1: x0 + plan.to,
        z0: plan.z0,
        z1: plan.z1,
        height: plan.height,
        door: { x0: x0 + plan.door - plan.doorHalf, x1: x0 + plan.door + plan.doorHalf, z0: plan.z1, z1: -HALF_DEPTH },
      };
      sideRooms.push(side);
      blockers.push(...sideFurniture(side));
    }
    x = x1;
    if (index < order.length - 1) {
      doorways.push({ x0: x, x1: x + BULKHEAD, z0: -DOOR_HALF_WIDTH, z1: DOOR_HALF_WIDTH });
      x += BULKHEAD;
    }
  });
  return { label: upper ? "Upper deck" : "Lower deck", floorY: upper ? UPPER_FLOOR : 0, compartments, doorways, blockers, sideRooms, length: x };
}

/**
 * Rooms wait for someone to need them: the farm its first farmer, the classroom its first
 * teacher, the playroom its first child, and the simulator and briefing room the recon teams.
 */
/** How far people have filled each hall: desks wait for a teacher and grow with the crew, plants wait for a farmer. */
export function hallFills(crew: readonly { role: string }[]): Partial<Record<WalkRoomKind, number>> {
  const teaching = crew.some((member) => member.role === "teacher");
  return {
    education: teaching ? (crew.length >= 30 ? 3 : crew.length >= 12 ? 2 : 1) : 0,
    support: crew.some((member) => member.role === "farmer") ? 1 : 0,
  };
}

export function sealedSideRooms(crew: readonly { role: string; ageGroup?: string | null }[], reconWorking: boolean) {
  const sealed: SideRoomKind[] = [];
  if (!crew.some((member) => member.role === "farmer")) sealed.push("farm");
  if (!crew.some((member) => member.role === "teacher")) sealed.push("classroom");
  if (!crew.some((member) => member.ageGroup === "child")) sealed.push("playroom");
  if (!reconWorking) sealed.push("simulator", "briefing");
  return sealed;
}

/**
 * The ship for this crew: cabins are lived in once enough people are aboard, the
 * galley whenever Habitation is, the Armory once it has been unlocked, and the rooms
 * in sealed once someone needs them.
 */
export function buildWalkLayout(
  rooms: readonly { kind: WalkRoomKind; label: string; online: boolean }[],
  { residents = 0, armory = false, sealed = [], fills = {} }: { residents?: number; armory?: boolean; sealed?: readonly SideRoomKind[]; fills?: Partial<Record<WalkRoomKind, number>> } = {},
): WalkLayout {
  const byKind = new Map(rooms.map((room) => [room.kind, room]));
  const opens = (plan: SideRoomPlan) => {
    if (sealed.includes(plan.kind)) return false;
    if (plan.kind === "cabin") return residents >= (CABIN_OPENS_AT[Number(plan.id.split("-")[1])] ?? Infinity);
    return plan.kind === "armory" ? armory : true;
  };
  const decks = [buildDeck(UPPER_DECK, true, byKind, opens, fills), buildDeck(LOWER_DECK, false, byKind, opens, fills)];
  const chamber = decks[0].compartments.find((compartment) => compartment.kind === "chamber")!;
  const dock = decks[1].compartments.find((compartment) => compartment.kind === "hangar")!;
  const cx = (chamber.x0 + chamber.x1) / 2;
  return {
    decks,
    halfDepth: HALF_DEPTH,
    spawn: { deck: 0, x: decks[0].compartments[0].x0 + 1.6, z: 0, yaw: 0 },
    heart: { x: cx, y: UPPER_FLOOR + 0.4, z: 0 },
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
    deck.doorways.some((door) => x >= door.x0 - radius && x <= door.x1 + radius && z >= door.z0 + radius && z <= door.z1 - radius) ||
    // The rooms behind the halls, through their doors, unless they are sealed.
    deck.sideRooms.some((room) => room.open && (
      inside(room, x, z, radius) ||
      (x >= room.door.x0 + radius && x <= room.door.x1 - radius && z >= room.door.z0 - radius && z <= room.door.z1 + radius)
    ));
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

/** The room behind a hall that the drone is in, if any. */
export function sideRoomAt(deck: WalkDeck, x: number, z: number) {
  return deck.sideRooms.find((room) => x >= room.x0 && x <= room.x1 && z >= room.z0 && z <= room.z1) ?? null;
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

