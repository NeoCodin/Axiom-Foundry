/*
 * Pelagos, reclaimed by hand: the prototype of settling a world. A drowned district on
 * a grid of two-metre tiles, the sea over most of it. On high ground in the west stand
 * the municipal shelter, three survivors on their last filters, and the seed Lawheart
 * the drone brought down: its reach is the dome where the laws hold and the drone's
 * link to AXIOM is clean. Beyond the dome the Null takes the link a little at a time.
 *
 * Seawalls are Containment held on a line, so they hold only inside the reach. They
 * close the gaps between drowned blocks; pumps drain what the walls enclose, and the
 * ground under the water becomes the settlement's. The Lawheart and tidal turbines give
 * power; purifiers make water, kelp beds food; salvage rigs strip the wrecks; relays
 * carry the reach (and the link) out over the rooftops, and habitats house the people
 * the drone brings in. Pushing the Lawheart doubles its power, but the exhaust pushes
 * the Null back in: the dome shrinks, and walls left outside it let the sea through.
 *
 * Survivors signal from rooftops out in the Null; only the drone can reach them, and
 * only while its link holds. Nothing here kills anyone: a dry shelter goes hungry and
 * stops taking people in until it is supplied again. Pure rules; pelagos-view.tsx
 * draws and drives them.
 */

/** Tiles across the district, and metres to a tile. */
export const SIZE = 40;
export const TILE = 2;

/** The seed Lawheart and the shelter beside it, on the hill. */
export const LAWHEART = { x: 10, y: 20 } as const;
export const SHELTER = { x0: 7, x1: 8, y0: 19, y1: 21 } as const;

/** The dome's radius in tiles, steady and pushed; a relay's; and how far past the edge the link lasts. */
export const LAWHEART_REACH = 9;
export const PUSHED_REACH = 6;
export const RELAY_REACH = 6;
export const LINK_FADE = 7;
/** The weakest link the drone can still answer a signal on. */
export const ANSWER_LINK = 0.25;

export type Ground = "sea" | "street" | "marsh" | "block" | "ruin" | "plaza" | "hill" | "cliff" | "embankment";
/** A tile's ground, and its height in metres against the sea (rooftops for blocks). */
export type Tile = { height: number; ground: Ground };

export type StructureKind = "seawall" | "pump" | "turbine" | "rig" | "purifier" | "kelp" | "relay" | "habitat";
export type Structure = { kind: StructureKind; x: number; y: number };

/** What each structure costs in salvage, the power it draws (negative: makes), and where it goes. */
export const STRUCTURES: Record<StructureKind, { label: string; cost: number; power: number; blurb: string }> = {
  seawall: { label: "Seawall", cost: 4, power: 0, blurb: "Containment on a line: the sea cannot cross it. Holds only inside the reach." },
  pump: { label: "Pump", cost: 15, power: 2, blurb: "Drains the water the walls enclose. On flooded ground." },
  turbine: { label: "Tidal turbine", cost: 20, power: -3, blurb: "Power from the open sea. On water the tide still reaches." },
  rig: { label: "Salvage rig", cost: 15, power: 1, blurb: "Strips a wreck for salvage. On a wreck." },
  purifier: { label: "Purifier", cost: 20, power: 1, blurb: "Clean water for the shelter. On dry ground." },
  kelp: { label: "Kelp bed", cost: 10, power: 0, blurb: "Food grown in the flood. On water." },
  relay: { label: "Relay", cost: 20, power: 1, blurb: "Carries the reach, and the drone's link, further out. On dry ground or a rooftop." },
  habitat: { label: "Habitat", cost: 30, power: 1, blurb: "Room for four more, on ground the sea gave back." },
};
export const STRUCTURE_ORDER: readonly StructureKind[] = ["seawall", "pump", "turbine", "rig", "purifier", "kelp", "relay", "habitat"];

/** The Lawheart's own power, steady and pushed. */
export const LAWHEART_POWER = 4;
export const PUSHED_POWER = 8;
/** Per second: what a pump drains (tiles), the sea refills, and each producer makes. */
export const PUMP_RATE = 2.5;
export const REFILL_RATE = 6;
export const WATER_RATE = 0.15;
export const FOOD_RATE = 0.1;
export const SALVAGE_RATE = 0.6;
/** What each person uses a second. */
export const DRINK = 0.02;
export const EAT = 0.012;
export const SHELTER_ROOM = 6;
export const HABITAT_ROOM = 4;
/** What the drone strips from a wreck with each pass. */
export const HAND_SALVAGE = 10;
/** How long survivors take to reach the shelter once answered, in seconds. */
export const ARRIVAL_SECONDS = 10;

export type Deposit = { x: number; y: number; left: number; full: number };
export type Signal = { x: number; y: number; people: number; answered: boolean; arriveAt: number | null; arrived: boolean };

export type PelagosState = {
  tiles: Tile[];
  /** Whether each tile is under water. Only ground at or below the sea floods. */
  flooded: boolean[];
  structures: Structure[];
  deposits: Deposit[];
  signals: Signal[];
  salvage: number;
  water: number;
  food: number;
  survivors: number;
  pushed: boolean;
  /** Seconds played. */
  time: number;
  /** Where the drone is, in tiles. */
  drone: { x: number; y: number };
  /** Draining and refilling carry fractions of a tile from one step to the next. */
  drainCredit: number[];
  refillCredit: number;
};

export const index = (x: number, y: number) => y * SIZE + x;
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Blocks that fell, leaving water where a building stood. */
const COLLAPSED = new Set(["0,4", "2,0"]);
/** The three gaps in the old embankment round the shelter's lowland. */
export const BREACHES: readonly { x: number; y: number }[] = [
  { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 15, y: 18 }, { x: 15, y: 19 }, { x: 15, y: 24 }, { x: 15, y: 25 },
];
const BREACH_KEYS = new Set(BREACHES.map(({ x, y }) => `${x},${y}`));

function noise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * The district: open sea to the east; the drowned city of four-tile blocks and two-tile
 * streets between them, its old heart a sunken plaza; the shelter's hill in the western
 * lowland inside a breached embankment; cliffs along the other edges.
 */
function groundAt(x: number, y: number): Tile {
  if (x >= 34) return { height: -2, ground: "sea" };
  if (x <= 1 || y <= 1 || y >= 38) return { height: 2, ground: "cliff" };
  if (x >= 16) {
    const across = x - 16;
    const down = y - 2;
    if (across % 6 >= 4 || down % 6 >= 4 || down >= 34) return { height: -1, ground: "street" };
    const column = Math.floor(across / 6);
    const row = Math.floor(down / 6);
    if (column === 1 && row === 3) return { height: -2, ground: "plaza" };
    if (COLLAPSED.has(`${column},${row}`)) return { height: -1, ground: "ruin" };
    return { height: 3 + Math.floor(noise(column * 7 + row * 3 + 1) * 5), ground: "block" };
  }
  const fromHill = Math.hypot(x - 9.5, y - 20);
  if (fromHill <= 3.2) return { height: 2, ground: "hill" };
  if (fromHill <= 5.2) return { height: 1, ground: "hill" };
  const ring = ((y === 12 || y === 28) && x >= 2 && x <= 15) || (x === 15 && y >= 12 && y <= 28);
  if (ring) return BREACH_KEYS.has(`${x},${y}`) ? { height: 0, ground: "marsh" } : { height: 1, ground: "embankment" };
  return { height: 0, ground: "marsh" };
}

export const floodable = (tile: Tile) => tile.height <= 0;
const onShelter = (x: number, y: number) => x >= SHELTER.x0 && x <= SHELTER.x1 && y >= SHELTER.y0 && y <= SHELTER.y1;
const onLawheart = (x: number, y: number) => x === LAWHEART.x && y === LAWHEART.y;

export function createPelagos(): PelagosState {
  const tiles: Tile[] = [];
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) tiles.push(groundAt(x, y));
  const deposit = (x: number, y: number, full: number): Deposit => ({ x, y, left: full, full });
  const signal = (x: number, y: number, people: number): Signal => ({ x, y, people, answered: false, arriveAt: null, arrived: false });
  return {
    tiles,
    flooded: tiles.map(floodable),
    structures: [],
    deposits: [deposit(13, 15, 40), deposit(4, 24, 40), deposit(12, 9, 50), deposit(18, 13, 60), deposit(21, 21, 60), deposit(30, 7, 60), deposit(24, 31, 60), deposit(6, 4, 50)],
    // Rooftops beyond the dome: the first is just within the link's fade, the others need relays.
    signals: [signal(17, 9, 2), signal(29, 15, 3), signal(29, 33, 3)],
    salvage: 60,
    water: 6,
    food: 10,
    survivors: 3,
    pushed: false,
    time: 0,
    drone: { x: LAWHEART.x + 2.5, y: LAWHEART.y + 0.5 },
    drainCredit: [],
    refillCredit: 0,
  };
}

export const structureAt = (state: PelagosState, x: number, y: number) =>
  state.structures.find((structure) => structure.x === x && structure.y === y) ?? null;

/** Where the reach comes from: the Lawheart, and each relay it can carry to. */
export type Reach = { x: number; y: number; r: number };

/** The district as it stands this moment: reach, power, which structures run, where the sea gets in. */
export type Derived = {
  reach: Reach[];
  supply: number;
  demand: number;
  /** Structures running this moment, by their place in the list. */
  running: Set<number>;
  /** Tiles the open sea can reach through. */
  openSea: boolean[];
};

const within = (sources: readonly Reach[], x: number, y: number) =>
  sources.some((source) => Math.hypot(x - source.x, y - source.y) <= source.r);

export function derive(state: PelagosState): Derived {
  const lawheart: Reach = { x: LAWHEART.x, y: LAWHEART.y, r: state.pushed ? PUSHED_REACH : LAWHEART_REACH };
  const reach: Reach[] = [lawheart];
  const running = new Set<number>();
  const turbines = state.structures.map((structure, at) => ({ structure, at })).filter(({ structure }) => structure.kind === "turbine");
  let supply = state.pushed ? PUSHED_POWER : LAWHEART_POWER;
  let demand = 0;
  const powerTurbines = () => {
    for (const { structure, at } of turbines) {
      if (running.has(at) || !within(reach, structure.x, structure.y)) continue;
      running.add(at);
      supply += -STRUCTURES.turbine.power;
    }
  };
  powerTurbines();
  // Relays first, each one only once the reach already gets to it, and only while there is power.
  const relays = state.structures.map((structure, at) => ({ structure, at })).filter(({ structure }) => structure.kind === "relay");
  for (let grew = true; grew;) {
    grew = false;
    for (const { structure, at } of relays) {
      if (running.has(at) || !within(reach, structure.x, structure.y) || demand + STRUCTURES.relay.power > supply) continue;
      running.add(at);
      demand += STRUCTURES.relay.power;
      reach.push({ x: structure.x, y: structure.y, r: RELAY_REACH });
      powerTurbines();
      grew = true;
    }
  }
  // Everything else inside the reach, water and food before the pumps, while power lasts.
  const priority: StructureKind[] = ["seawall", "kelp", "purifier", "habitat", "pump", "rig"];
  for (const kind of priority) {
    state.structures.forEach((structure, at) => {
      if (structure.kind !== kind || !within(reach, structure.x, structure.y)) return;
      const draw = STRUCTURES[kind].power;
      if (demand + draw > supply) return;
      demand += draw;
      running.add(at);
    });
  }
  // The sea comes in through any flooded-able ground not held by a standing wall.
  const walls = new Set(state.structures.flatMap((structure, at) => (structure.kind === "seawall" && running.has(at) ? [index(structure.x, structure.y)] : [])));
  const openSea = new Array<boolean>(SIZE * SIZE).fill(false);
  const queue: number[] = [];
  state.tiles.forEach((tile, at) => {
    if (tile.ground === "sea") {
      openSea[at] = true;
      queue.push(at);
    }
  });
  while (queue.length > 0) {
    const at = queue.pop()!;
    const x = at % SIZE;
    const y = Math.floor(at / SIZE);
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(nx, ny)) continue;
      const next = index(nx, ny);
      if (openSea[next] || walls.has(next) || !floodable(state.tiles[next])) continue;
      openSea[next] = true;
      queue.push(next);
    }
  }
  return { reach, supply, demand, running, openSea };
}

export const inReach = (derived: Derived, x: number, y: number) => within(derived.reach, x, y);

/** The drone's link at a spot: whole inside the reach, fading to nothing a few tiles past its edge. */
export function linkAt(derived: Derived, x: number, y: number) {
  let beyond = Infinity;
  for (const source of derived.reach) beyond = Math.min(beyond, Math.hypot(x - source.x, y - source.y) - source.r);
  if (beyond <= 0) return 1;
  return Math.max(0, 1 - beyond / LINK_FADE);
}

/** The ground a pump would drain: everything the water can reach from it without crossing a wall or high ground. */
export function basinOf(state: PelagosState, derived: Derived, x: number, y: number) {
  const start = index(x, y);
  const walls = new Set(state.structures.flatMap((structure, at) => (structure.kind === "seawall" && derived.running.has(at) ? [index(structure.x, structure.y)] : [])));
  const seen = new Set<number>([start]);
  const queue = [start];
  let open = false;
  while (queue.length > 0) {
    const at = queue.pop()!;
    if (derived.openSea[at]) open = true;
    const ax = at % SIZE;
    const ay = Math.floor(at / SIZE);
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = ax + dx;
      const ny = ay + dy;
      if (!inside(nx, ny)) continue;
      const next = index(nx, ny);
      if (seen.has(next) || walls.has(next) || !floodable(state.tiles[next])) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return { tiles: [...seen], open };
}

/** Why a structure cannot go on a tile, or null when it can. */
export function placementProblem(state: PelagosState, derived: Derived, kind: StructureKind, x: number, y: number): string | null {
  if (!inside(x, y)) return "Off the map.";
  const tile = state.tiles[index(x, y)];
  const wet = state.flooded[index(x, y)];
  if (onShelter(x, y) || onLawheart(x, y)) return "The shelter and the Lawheart stand here.";
  if (structureAt(state, x, y)) return "Something is already built here.";
  if (tile.ground === "sea") return "Too deep: the open sea.";
  if (!inReach(derived, x, y)) return "Outside the Lawheart's reach. Carry it out with relays first.";
  if (state.salvage < STRUCTURES[kind].cost) return `Needs ${STRUCTURES[kind].cost} salvage.`;
  switch (kind) {
    case "seawall":
      return floodable(tile) ? null : "Walls go on low ground; this is already high.";
    case "pump":
      return floodable(tile) ? null : "Pumps go on low ground.";
    case "turbine":
      return wet && derived.openSea[index(x, y)] ? null : "Turbines need water the tide still reaches.";
    case "kelp":
      return wet ? null : "Kelp needs water.";
    case "rig":
      return state.deposits.some((deposit) => deposit.x === x && deposit.y === y && deposit.left > 0) ? null : "Rigs go on a wreck.";
    case "purifier":
      return wet ? "Needs dry ground." : tile.ground === "block" ? "Not on a rooftop." : null;
    case "relay":
      return wet ? "Needs dry ground or a rooftop." : null;
    case "habitat":
      return floodable(tile) && !wet ? null : "Habitats go on ground reclaimed from the sea.";
  }
}

export function place(state: PelagosState, kind: StructureKind, x: number, y: number) {
  const problem = placementProblem(state, derive(state), kind, x, y);
  if (problem) return problem;
  state.salvage -= STRUCTURES[kind].cost;
  state.structures.push({ kind, x, y });
  return null;
}

/** Take a structure down, getting half its salvage back. */
export function demolish(state: PelagosState, x: number, y: number) {
  const at = state.structures.findIndex((structure) => structure.x === x && structure.y === y);
  if (at < 0) return false;
  state.salvage += Math.floor(STRUCTURES[state.structures[at].kind].cost / 2);
  state.structures.splice(at, 1);
  state.drainCredit = [];
  return true;
}

export const room = (state: PelagosState, derived: Derived) =>
  SHELTER_ROOM + HABITAT_ROOM * state.structures.filter((structure, at) => structure.kind === "habitat" && derived.running.has(at)).length;

/** Ground the sea covered when the drone arrived and no longer does. */
export const reclaimed = (state: PelagosState) =>
  state.tiles.reduce((count, tile, at) => count + (floodable(tile) && tile.ground !== "sea" && !state.flooded[at] ? 1 : 0), 0);

export function step(state: PelagosState, dt: number) {
  const derived = derive(state);
  state.time += dt;
  // The sea comes back in wherever it can, from the edge of the water inward.
  state.refillCredit += REFILL_RATE * dt;
  if (state.refillCredit >= 1) {
    const frontier: number[] = [];
    state.tiles.forEach((tile, at) => {
      if (!derived.openSea[at] || state.flooded[at] || !floodable(tile)) return;
      const x = at % SIZE;
      const y = Math.floor(at / SIZE);
      if (NEIGHBOURS.some(([dx, dy]) => inside(x + dx, y + dy) && state.flooded[index(x + dx, y + dy)])) frontier.push(at);
    });
    for (const at of frontier.slice(0, Math.floor(state.refillCredit))) state.flooded[at] = true;
    state.refillCredit = frontier.length === 0 ? 0 : state.refillCredit % 1;
  }
  // Each running pump drains its basin, nearest water first, unless the sea still gets in.
  state.structures.forEach((structure, at) => {
    if (structure.kind !== "pump" || !derived.running.has(at)) return;
    const basin = basinOf(state, derived, structure.x, structure.y);
    if (basin.open) return;
    state.drainCredit[at] = (state.drainCredit[at] ?? 0) + PUMP_RATE * dt;
    const wet = basin.tiles.filter((tile) => state.flooded[tile]);
    wet.sort((a, b) => Math.hypot(a % SIZE - structure.x, Math.floor(a / SIZE) - structure.y) - Math.hypot(b % SIZE - structure.x, Math.floor(b / SIZE) - structure.y));
    for (const tile of wet.slice(0, Math.floor(state.drainCredit[at]))) state.flooded[tile] = false;
    state.drainCredit[at] %= 1;
  });
  // What the district makes.
  state.structures.forEach((structure, at) => {
    if (!derived.running.has(at)) return;
    const wet = state.flooded[index(structure.x, structure.y)];
    if (structure.kind === "purifier") state.water = Math.min(40, state.water + WATER_RATE * dt);
    if (structure.kind === "kelp" && wet) state.food = Math.min(40, state.food + FOOD_RATE * dt);
    if (structure.kind === "rig") {
      const deposit = state.deposits.find((candidate) => candidate.x === structure.x && candidate.y === structure.y);
      if (deposit && deposit.left > 0) {
        const taken = Math.min(deposit.left, SALVAGE_RATE * dt);
        deposit.left -= taken;
        state.salvage += taken;
      }
    }
  });
  // What the people use; nobody dies of it, but a dry or hungry shelter takes nobody in.
  state.water = Math.max(0, state.water - DRINK * state.survivors * dt);
  state.food = Math.max(0, state.food - EAT * state.survivors * dt);
  const space = room(state, derived);
  for (const signal of state.signals) {
    if (signal.arriveAt === null || signal.arrived || state.time < signal.arriveAt) continue;
    if (state.survivors + signal.people > space || state.water <= 0 || state.food <= 0) continue;
    signal.arrived = true;
    state.survivors += signal.people;
  }
  return derived;
}

/** The drone's hand at a wreck: a pass of salvage, if it is close enough. */
export function salvageByHand(state: PelagosState, deposit: Deposit) {
  if (deposit.left <= 0 || Math.hypot(state.drone.x - (deposit.x + 0.5), state.drone.y - (deposit.y + 0.5)) > 2.5) return 0;
  const taken = Math.min(HAND_SALVAGE, deposit.left);
  deposit.left -= taken;
  state.salvage += taken;
  return taken;
}

/** Answer a rooftop signal from the drone: only close by, and only while the link holds. */
export function answerSignal(state: PelagosState, derived: Derived, signal: Signal): "answered" | "far" | "weak" | "done" {
  if (signal.answered) return "done";
  if (Math.hypot(state.drone.x - (signal.x + 0.5), state.drone.y - (signal.y + 0.5)) > 3) return "far";
  if (linkAt(derived, state.drone.x, state.drone.y) < ANSWER_LINK) return "weak";
  signal.answered = true;
  signal.arriveAt = state.time + ARRIVAL_SECONDS;
  return "answered";
}

/** Whether the old embankment's three breaches are all walled and holding. */
export const embankmentClosed = (state: PelagosState, derived: Derived) =>
  BREACHES.every(({ x, y }) => state.structures.some((structure, at) => structure.kind === "seawall" && structure.x === x && structure.y === y && derived.running.has(at)));

/**
 * How close the district is to living on its own, out of 100: water and food count
 * only while the district makes as much as its people use, not while a store lasts.
 */
export function viability(state: PelagosState, derived = derive(state)) {
  const making = (kind: StructureKind) => state.structures.filter((structure, at) =>
    structure.kind === kind && derived.running.has(at) && (kind !== "kelp" || state.flooded[index(structure.x, structure.y)])).length;
  const water = state.water > 0 && making("purifier") * WATER_RATE >= DRINK * state.survivors ? 25 : 0;
  const food = state.food > 0 && making("kelp") * FOOD_RATE >= EAT * state.survivors ? 25 : 0;
  const ground = 30 * Math.min(1, reclaimed(state) / 150);
  const people = 20 * Math.min(1, state.survivors / 12);
  return Math.round(water + food + ground + people);
}

/** What to do next, as AXIOM would put it. */
export function objective(state: PelagosState, derived: Derived) {
  const has = (kind: StructureKind) => state.structures.some((structure, at) => structure.kind === kind && derived.running.has(at));
  const growing = state.structures.some((structure, at) => structure.kind === "kelp" && derived.running.has(at) && state.flooded[index(structure.x, structure.y)]);
  // The drone's hands are the first salvage rig: say so whenever the next thing can't be afforded.
  const short = state.salvage < 15 ? " Short of salvage? Fly the drone (Tab) to a wreck and strip it (E), or set a salvage rig on one (4)." : "";
  if (!has("purifier")) return `The shelter's filters are failing. Build a purifier on the hill (5).${short}`;
  if (!growing) {
    return has("kelp")
      ? `The kelp bed is stranded on dry ground. Lay one where the water will stay (6).${short}`
      : `Food is short. Lay a kelp bed in open water outside the old embankment (6), where it will stay flooded.${short}`;
  }
  if (!embankmentClosed(state, derived)) return `Close the three breaches in the old embankment with seawalls (1). They're marked on the ground.${short}`;
  if (reclaimed(state) < 40) return `Put a pump inside the embankment (2) and drain it.${short}`;
  const answered = state.signals.filter((signal) => signal.answered).length;
  if (answered === 0) return "Survivors are signalling from a rooftop to the north-east. Fly the drone out to them (Tab), and watch the link.";
  if (answered < 2) return `The next signal is past the drone's link. Carry the reach out with relays on the rooftops (7).${short}`;
  if (!has("habitat")) return `Build a habitat on the ground you reclaimed (8) so there's room for everyone.${short}`;
  if (viability(state, derived) < 80) return "Keep the district alive: water, food, room, and more ground from the sea.";
  return "The district can live. Beyond the plaza, the old city's heart holds a Null Well. (A later build.)";
}

/** The parts that change, for saving; the ground is rebuilt from the map. */
export function serialize(state: PelagosState) {
  const { tiles: _tiles, drainCredit: _drain, refillCredit: _refill, ...rest } = state;
  return JSON.stringify({ ...rest, flooded: state.flooded.map((wet) => (wet ? 1 : 0)).join("") });
}

export function restore(saved: string | null): PelagosState | null {
  if (!saved) return null;
  try {
    const data = JSON.parse(saved) as Omit<PelagosState, "tiles" | "flooded" | "drainCredit" | "refillCredit"> & { flooded: string };
    const fresh = createPelagos();
    if (typeof data.flooded !== "string" || data.flooded.length !== SIZE * SIZE || !Array.isArray(data.structures)) return null;
    return {
      ...fresh,
      ...data,
      tiles: fresh.tiles,
      flooded: [...data.flooded].map((wet, at) => wet === "1" && floodable(fresh.tiles[at])),
      drainCredit: [],
      refillCredit: 0,
    };
  } catch {
    return null;
  }
}
