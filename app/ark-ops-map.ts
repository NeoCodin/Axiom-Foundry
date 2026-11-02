/*
 * The Extraction simulation's ground: an abandoned relay station on a grid of
 * one-metre tiles, with the yard and the shuttle pad outside. Walls, windows,
 * doors and low cover. Pure geometry, shared by the rules and the drawing: what
 * blocks a body, what blocks the eye, how much wall a sound comes through, and
 * the way from one place to another.
 */

export type OpsTile = "ground" | "floor" | "wall" | "window" | "door" | "doorway" | "cover";
export type OpsPoint = { x: number; z: number };
export type OpsRect = { x0: number; z0: number; x1: number; z1: number };
export type OpsRoom = OpsRect & { name: string; dark?: boolean };
export type OpsLight = OpsPoint & { kind: "fire" | "lamp" | "alarm" };

export type OpsMap = {
  name: string;
  width: number;
  height: number;
  /** Row by row: tile (i, j) covers x from i to i + 1 and z from j to j + 1, in metres. */
  tiles: OpsTile[];
  /** Each door's tile; its open or shut state lives with the mission, by this index. */
  doors: { i: number; j: number }[];
  doorAt: ReadonlyMap<number, number>;
  rooms: OpsRoom[];
  /** Where everyone starts, in metres (tile centres). */
  spawn: {
    player: OpsPoint;
    survivors: OpsPoint[];
    guards: OpsPoint[];
    patrols: OpsPoint[];
    extras: OpsPoint[];
    aliens: OpsPoint[];
    hollowed: OpsPoint[];
    ammo: OpsPoint[];
    medkits: OpsPoint[];
  };
  /** Places a patrolling Wrecker walks between. */
  patrolPoints: OpsPoint[];
  /** The shuttle pad, in metres. */
  extraction: OpsRect;
  lights: OpsLight[];
};

const centre = (i: number, j: number): OpsPoint => ({ x: i + 0.5, z: j + 0.5 });
export const tileIndex = (map: OpsMap, i: number, j: number) => j * map.width + i;

export function tileAt(map: OpsMap, i: number, j: number): OpsTile {
  if (i < 0 || j < 0 || i >= map.width || j >= map.height) return "wall";
  return map.tiles[tileIndex(map, i, j)];
}

/** Is this tile a door, and is it open? Doorways are always open; other tiles are not doors. */
export function doorOpen(map: OpsMap, doors: readonly boolean[], i: number, j: number) {
  const door = map.doorAt.get(tileIndex(map, i, j));
  return door === undefined ? true : doors[door] === true;
}

export function blocksBody(map: OpsMap, doors: readonly boolean[], i: number, j: number) {
  const tile = tileAt(map, i, j);
  if (tile === "wall" || tile === "window" || tile === "cover") return true;
  return tile === "door" && !doorOpen(map, doors, i, j);
}

/** Walls and shut doors hide everything; low cover hides someone crouched behind it. */
export function blocksSight(map: OpsMap, doors: readonly boolean[], i: number, j: number, low = false) {
  const tile = tileAt(map, i, j);
  if (tile === "wall") return true;
  if (tile === "door") return !doorOpen(map, doors, i, j);
  return tile === "cover" && low;
}

/** How much a tile damps a sound passing through it: a wall most, a shut door less, a broken window little. */
export function soundBlock(map: OpsMap, doors: readonly boolean[], i: number, j: number) {
  const tile = tileAt(map, i, j);
  if (tile === "wall") return 1;
  if (tile === "door") return doorOpen(map, doors, i, j) ? 0 : 0.7;
  return tile === "window" ? 0.3 : 0;
}

/** Walk the straight line from a to b in short steps, visiting each tile it enters once. */
function alongLine(a: OpsPoint, b: OpsPoint, visit: (i: number, j: number) => boolean | void) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(length / 0.2));
  let lastI = Math.floor(a.x);
  let lastJ = Math.floor(a.z);
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const i = Math.floor(a.x + (b.x - a.x) * t);
    const j = Math.floor(a.z + (b.z - a.z) * t);
    if (i === lastI && j === lastJ) continue;
    lastI = i;
    lastJ = j;
    if (visit(i, j) === true) return true;
  }
  return false;
}

export function lineOfSight(map: OpsMap, doors: readonly boolean[], a: OpsPoint, b: OpsPoint, low = false) {
  const startI = Math.floor(a.x);
  const startJ = Math.floor(a.z);
  const endI = Math.floor(b.x);
  const endJ = Math.floor(b.z);
  return !alongLine(a, b, (i, j) => {
    if ((i === startI && j === startJ) || (i === endI && j === endJ)) return false;
    return blocksSight(map, doors, i, j, low);
  });
}

/** How many walls' worth of damping lie between two points (0 for a clear line). */
export function wallsBetween(map: OpsMap, doors: readonly boolean[], a: OpsPoint, b: OpsPoint) {
  let total = 0;
  alongLine(a, b, (i, j) => {
    total += soundBlock(map, doors, i, j);
  });
  return total;
}

/**
 * Move a round body by (dx, dz), sliding along whatever it meets: one axis at a
 * time, stopped at the edge of the first tile in the way.
 */
export function moveBody(map: OpsMap, doors: readonly boolean[], x: number, z: number, dx: number, dz: number, radius: number): OpsPoint {
  // Long moves go in short steps, so nothing passes clean through a one-tile wall.
  const steps = Math.ceil(Math.hypot(dx, dz) / 0.25);
  if (steps > 1) {
    let at = { x, z };
    for (let step = 0; step < steps; step += 1) at = moveBody(map, doors, at.x, at.z, dx / steps, dz / steps, radius);
    return at;
  }
  const gap = 0.001;
  let nx = x + dx;
  if (dx !== 0) {
    for (let j = Math.floor(z - radius); j <= Math.floor(z + radius); j += 1) {
      for (let i = Math.floor(nx - radius); i <= Math.floor(nx + radius); i += 1) {
        if (!blocksBody(map, doors, i, j)) continue;
        nx = dx > 0 ? Math.min(nx, i - radius - gap) : Math.max(nx, i + 1 + radius + gap);
      }
    }
  }
  let nz = z + dz;
  if (dz !== 0) {
    for (let i = Math.floor(nx - radius); i <= Math.floor(nx + radius); i += 1) {
      for (let j = Math.floor(nz - radius); j <= Math.floor(nz + radius); j += 1) {
        if (!blocksBody(map, doors, i, j)) continue;
        nz = dz > 0 ? Math.min(nz, j - radius - gap) : Math.max(nz, j + 1 + radius + gap);
      }
    }
  }
  return { x: nx, z: nz };
}

export function inRect(rect: OpsRect, x: number, z: number) {
  return x >= rect.x0 && x <= rect.x1 && z >= rect.z0 && z <= rect.z1;
}

export function roomAt(map: OpsMap, x: number, z: number) {
  return map.rooms.find((room) => inRect(room, x, z)) ?? null;
}

/**
 * The way from one point to another over the tiles, as tile centres after the
 * first (the last is the goal itself). Shut doors are passable to those who
 * can open them, at a cost. Null when there is no way.
 */
export function findPath(map: OpsMap, doors: readonly boolean[], from: OpsPoint, to: OpsPoint, opensDoors: boolean): OpsPoint[] | null {
  const passable = (i: number, j: number) => {
    if (!blocksBody(map, doors, i, j)) return true;
    return opensDoors && tileAt(map, i, j) === "door";
  };
  const startI = Math.floor(from.x);
  const startJ = Math.floor(from.z);
  let goalI = Math.floor(to.x);
  let goalJ = Math.floor(to.z);
  if (!passable(goalI, goalJ)) {
    // Aim for the nearest open tile beside the goal instead.
    let best: [number, number] | null = null;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      if (passable(goalI + di, goalJ + dj)) {
        best = [goalI + di, goalJ + dj];
        break;
      }
    }
    if (!best) return null;
    [goalI, goalJ] = best;
  }
  const size = map.width * map.height;
  const cost = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const start = tileIndex(map, startI, startJ);
  const goal = tileIndex(map, goalI, goalJ);
  const guess = (index: number) => {
    const di = Math.abs((index % map.width) - goalI);
    const dj = Math.abs(Math.floor(index / map.width) - goalJ);
    return Math.max(di, dj) + 0.41 * Math.min(di, dj);
  };
  // A small binary heap of [priority, index].
  const heap: [number, number][] = [];
  const push = (item: [number, number]) => {
    heap.push(item);
    let at = heap.length - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (heap[parent][0] <= heap[at][0]) break;
      [heap[parent], heap[at]] = [heap[at], heap[parent]];
      at = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let at = 0;
      for (;;) {
        const left = at * 2 + 1;
        const right = left + 1;
        let smallest = at;
        if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left;
        if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right;
        if (smallest === at) break;
        [heap[smallest], heap[at]] = [heap[at], heap[smallest]];
        at = smallest;
      }
    }
    return top;
  };
  cost[start] = 0;
  push([guess(start), start]);
  while (heap.length > 0) {
    const [, current] = pop();
    if (closed[current]) continue;
    closed[current] = 1;
    if (current === goal) break;
    const ci = current % map.width;
    const cj = Math.floor(current / map.width);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const ni = ci + di;
      const nj = cj + dj;
      if (!passable(ni, nj)) continue;
      // No cutting a corner past a wall.
      if (di !== 0 && dj !== 0 && (!passable(ci + di, cj) || !passable(ci, cj + dj))) continue;
      const next = tileIndex(map, ni, nj);
      const step = (di !== 0 && dj !== 0 ? 1.41 : 1) + (tileAt(map, ni, nj) === "door" && !doorOpen(map, doors, ni, nj) ? 2 : 0);
      if (cost[current] + step >= cost[next]) continue;
      cost[next] = cost[current] + step;
      came[next] = current;
      push([cost[next] + guess(next), next]);
    }
  }
  if (!closed[goal]) return null;
  const path: OpsPoint[] = [];
  for (let at = goal; at !== start && at !== -1; at = came[at]) path.push(centre(at % map.width, Math.floor(at / map.width)));
  path.reverse();
  if (path.length > 0 && Math.floor(to.x) === goalI && Math.floor(to.z) === goalJ) path[path.length - 1] = { x: to.x, z: to.z };
  return path;
}

/**
 * The relay station: a one-storey ruin of offices, a Wrecker camp, a holding room
 * for the survivors, a corridor, a dark storeroom, a kitchen, a generator room and
 * a back room, with the shuttle pad out in the yard to the west.
 */
export function buildRelayStation(): OpsMap {
  const width = 44;
  const height = 26;
  const tiles: OpsTile[] = new Array(width * height).fill("ground");
  const set = (i: number, j: number, tile: OpsTile) => {
    tiles[j * width + i] = tile;
  };
  const fill = (i0: number, j0: number, i1: number, j1: number, tile: OpsTile) => {
    for (let j = j0; j <= j1; j += 1) for (let i = i0; i <= i1; i += 1) set(i, j, tile);
  };
  // The shell and its floor.
  fill(12, 2, 41, 23, "wall");
  fill(13, 3, 40, 22, "floor");
  // Inner walls: the north rooms, the corridor's south side, the storeroom, the south rooms.
  fill(13, 8, 40, 8, "wall");
  fill(20, 3, 20, 7, "wall");
  fill(33, 3, 33, 7, "wall");
  fill(22, 11, 40, 11, "wall");
  fill(22, 12, 22, 22, "wall");
  fill(33, 12, 33, 22, "wall");
  fill(13, 16, 21, 16, "wall");
  fill(34, 17, 40, 17, "wall");
  // Doors, doorways and windows.
  const doorTiles: [number, number][] = [
    [16, 8], // office to the entry hall
    [33, 5], // camp to the holding room
    [37, 8], // holding room to the corridor
    [27, 11], // corridor to the storeroom
    [36, 11], // corridor to the kitchen
    [17, 16], // entry hall to the generator room
    [22, 20], // generator room to the storeroom
    [37, 17], // kitchen to the back room
    [39, 23], // the back door, out to the yard
  ];
  for (const [i, j] of doorTiles) set(i, j, "door");
  for (const [i, j] of [[26, 8], [27, 8], [12, 12]] as const) set(i, j, "doorway");
  for (const [i, j] of [[16, 2], [27, 2], [37, 2], [12, 5], [12, 10], [12, 19], [41, 13], [41, 20], [17, 23], [27, 23]] as const) set(i, j, "window");
  // Low cover: a desk, the camp's crates, the hall's barricade, the kitchen counter.
  for (const [i, j] of [[17, 6], [23, 4], [24, 4], [29, 6], [15, 13], [16, 13], [19, 11], [35, 14], [36, 14], [37, 14], [38, 14]] as const) set(i, j, "cover");

  const doors = doorTiles.map(([i, j]) => ({ i, j }));
  const doorAt = new Map(doors.map((door, index) => [door.j * width + door.i, index]));
  const points = (list: readonly (readonly [number, number])[]) => list.map(([i, j]) => centre(i, j));
  return {
    name: "Relay station",
    width,
    height,
    tiles,
    doors,
    doorAt,
    rooms: [
      { name: "Yard", x0: 0, z0: 0, x1: width, z1: height },
      { name: "Office", x0: 13, z0: 3, x1: 20, z1: 8 },
      { name: "Wrecker camp", x0: 21, z0: 3, x1: 33, z1: 8 },
      { name: "Holding room", x0: 34, z0: 3, x1: 41, z1: 8 },
      { name: "Entry hall", x0: 13, z0: 9, x1: 22, z1: 16 },
      { name: "Corridor", x0: 22, z0: 9, x1: 41, z1: 11 },
      { name: "Storeroom", x0: 23, z0: 12, x1: 33, z1: 23, dark: true },
      { name: "Kitchen", x0: 34, z0: 12, x1: 41, z1: 17 },
      { name: "Generator room", x0: 13, z0: 17, x1: 22, z1: 23 },
      { name: "Back room", x0: 34, z0: 18, x1: 41, z1: 23 },
    ].reverse(),
    spawn: {
      player: centre(8, 12),
      survivors: points([[36, 4], [38, 4], [36, 6], [38, 6]]),
      guards: points([[26, 5], [31, 4], [35, 7]]),
      patrols: points([[30, 9], [36, 15]]),
      extras: points([[19, 14], [24, 10]]),
      aliens: points([[25, 18], [30, 14], [29, 21]]),
      hollowed: points([[15, 20], [38, 20]]),
      ammo: points([[14, 4], [14, 14], [39, 13]]),
      medkits: points([[20, 21], [35, 21]]),
    },
    patrolPoints: points([[39, 9], [23, 10], [17, 12], [37, 13], [25, 6], [35, 20], [18, 20]]),
    extraction: { x0: 1, z0: 9, x1: 6, z1: 15 },
    lights: [
      { ...centre(27, 5), kind: "fire" },
      { ...centre(37, 5), kind: "lamp" },
      { ...centre(31, 10), kind: "alarm" },
      { ...centre(17, 11), kind: "lamp" },
      { ...centre(37, 15), kind: "lamp" },
    ],
  };
}
