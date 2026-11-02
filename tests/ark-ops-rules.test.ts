import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRelayStation,
  findPath,
  inRect,
  lineOfSight,
  moveBody,
  tileAt,
  wallsBetween,
} from "../app/ark-ops-map.ts";
import {
  OPS_DIFFICULTIES,
  createOps,
  fireOps,
  opsObjective,
  opsPrompt,
  stepOps,
  type OpsAgent,
  type OpsInput,
  type OpsState,
} from "../app/ark-ops-rules.ts";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
const still: OpsInput = { forward: 0, strafe: 0, yaw: -Math.PI / 2, sprint: false, crouched: false, aiming: false, light: true, interact: false };
const run = (state: OpsState, seconds: number, input: Partial<OpsInput> = {}, random = seeded(3)) => {
  for (let elapsed = 0; elapsed < seconds && !state.outcome; elapsed += 1 / 30) stepOps(state, 1 / 30, { ...still, ...input }, random);
  return state;
};
const types = (state: OpsState) => state.events.map((event) => event.type);
/** Just one of them, to watch it alone. */
const alone = (state: OpsState, pick: (agent: OpsAgent) => boolean) => {
  const agent = state.agents.find(pick)!;
  state.agents = [agent];
  return agent;
};

test("the relay station joins up: in from the yard, to every survivor, and back out to the pad", () => {
  const map = buildRelayStation();
  assert.equal(map.tiles.length, map.width * map.height);
  const shut = map.doors.map(() => false);
  const floorish = (point: { x: number; z: number }) => ["floor", "ground"].includes(tileAt(map, Math.floor(point.x), Math.floor(point.z)));
  for (const list of Object.values(map.spawn)) {
    for (const point of Array.isArray(list) ? list : [list]) assert.ok(floorish(point), `${point.x}, ${point.z} stands on open floor`);
  }
  for (const survivor of map.spawn.survivors) {
    assert.ok(findPath(map, shut, map.spawn.player, survivor, true), "AXIOM can reach every survivor, opening doors");
    assert.ok(findPath(map, shut, survivor, { x: 3.5, z: 12.5 }, true), "and bring them out to the pad");
  }
  assert.equal(findPath(map, shut, map.spawn.player, map.spawn.survivors[0], false), null, "the holding room is shut in");
  for (const door of map.doors) {
    const open = (i: number, j: number) => ["floor", "ground", "doorway"].includes(tileAt(map, i, j));
    const across = (open(door.i - 1, door.j) && open(door.i + 1, door.j)) || (open(door.i, door.j - 1) && open(door.i, door.j + 1));
    assert.ok(across, `the door at ${door.i}, ${door.j} joins two places`);
  }
  assert.ok(inRect(map.extraction, 3.5, 12.5));
});

test("walls stop bodies, sight and most of a sound; an open door lets them through", () => {
  const map = buildRelayStation();
  const doors = map.doors.map(() => false);
  // Across the wall between the office and the camp.
  assert.equal(lineOfSight(map, doors, { x: 18.5, z: 5.5 }, { x: 22.5, z: 5.5 }), false);
  assert.ok(wallsBetween(map, doors, { x: 18.5, z: 5.5 }, { x: 22.5, z: 5.5 }) >= 1);
  const stopped = moveBody(map, doors, 19.5, 5.5, 2, 0, 0.3);
  assert.ok(stopped.x < 20, "the wall holds");
  // The office door: shut, then open.
  const office = map.doors.findIndex((door) => door.i === 16 && door.j === 8);
  assert.equal(lineOfSight(map, doors, { x: 16.5, z: 6.5 }, { x: 16.5, z: 10.5 }), false);
  doors[office] = true;
  assert.ok(lineOfSight(map, doors, { x: 16.5, z: 6.5 }, { x: 16.5, z: 10.5 }));
  assert.ok(moveBody(map, doors, 16.5, 6.5, 0, 3, 0.3).z > 9, "walks through the open door");
  // Low cover hides someone crouched, not someone standing.
  assert.ok(lineOfSight(map, doors, { x: 37.5, z: 12.5 }, { x: 37.5, z: 15.5 }));
  assert.equal(lineOfSight(map, doors, { x: 37.5, z: 12.5 }, { x: 37.5, z: 15.5 }, true), false);
});

test("the difficulties climb: more Wreckers who shoot straighter and see sooner", () => {
  const [recruit, soldier, veteran] = [OPS_DIFFICULTIES.recruit, OPS_DIFFICULTIES.soldier, OPS_DIFFICULTIES.veteran];
  for (const key of ["wreckers", "aim", "damage", "spot"] as const) assert.ok(recruit[key] < soldier[key] && soldier[key] < veteran[key], key);
  assert.equal(recruit.reserve, Infinity);
  const state = createOps("veteran", seeded(1));
  assert.equal(state.agents.filter((agent) => agent.kind === "wrecker").length, 7);
  assert.equal(state.agents.filter((agent) => agent.kind === "hollowed").length, 2);
  assert.equal(state.survivors.length, 4);
  assert.ok(state.survivors.every((survivor) => survivor.state === "held"));
});

test("holding E beside the survivors frees them, and they follow AXIOM out to the shuttle", () => {
  const state = createOps("soldier", seeded(2));
  state.agents = [];
  state.player.x = 37;
  state.player.z = 5;
  assert.equal(opsPrompt(state), "Hold E · free the survivors");
  run(state, 1, { interact: true });
  assert.ok(state.survivors.every((survivor) => survivor.state === "held"), "not yet: it takes a moment");
  run(state, 1.5, { interact: true });
  assert.ok(types(state).includes("freed"));
  assert.ok(state.survivors.every((survivor) => survivor.state === "following"));
  assert.match(opsObjective(state), /Get them to the shuttle · 4 with you/);
  // Out by the corridor and the hall to the pad (the holding room door opened for them).
  state.doors.fill(true);
  for (const waypoint of [{ x: 37.5, z: 9.5 }, { x: 22.5, z: 9.8 }, { x: 15.5, z: 12.5 }, { x: 9.5, z: 12.5 }, { x: 3.5, z: 12.5 }]) {
    state.player.x = waypoint.x;
    state.player.z = waypoint.z;
    run(state, 6);
  }
  assert.equal(state.outcome, "extracted");
  assert.equal(state.saved, 4);
  assert.ok(state.drill > 0 && state.score > 4000, "a clean rescue scores and drills the trainees");
  assert.ok(types(state).includes("extracted"));
});

test("leaving from the pad without anyone is a failed mission", () => {
  const state = createOps("recruit", seeded(4));
  state.agents = [];
  state.player.x = 3.5;
  state.player.z = 12.5;
  assert.equal(opsPrompt(state), "Hold E · leave without the others");
  run(state, 2.5, { interact: true });
  assert.equal(state.outcome, "failed");
  assert.match(state.failure ?? "", /no one/);
});

test("a Wrecker who sees AXIOM in the open raises the alarm; one behind a wall does not", () => {
  const state = createOps("soldier", seeded(5));
  const guard = alone(state, (agent) => agent.kind === "wrecker" && agent.mode === "guard");
  guard.facing = Math.atan2(0, 1); // facing +z, towards the corridor
  guard.homeFacing = guard.facing;
  guard.look = guard.facing;
  state.doors.fill(true);
  state.player.x = guard.x;
  state.player.z = guard.z + 6;
  state.player.yaw = Math.PI;
  // The camp's doorway is open: from the corridor the guard can see in.
  state.player.x = 26.5;
  state.player.z = 10.2;
  run(state, 3);
  assert.equal(state.alarm, true);
  assert.ok(types(state).includes("shout"));

  const hidden = createOps("soldier", seeded(5));
  const other = alone(hidden, (agent) => agent.kind === "wrecker" && agent.mode === "guard");
  hidden.player.x = other.x - 4; // through the camp's west wall, in the office
  hidden.player.z = other.z;
  hidden.player.x = 18.5;
  run(hidden, 3, { crouched: true });
  assert.equal(hidden.alarm, false);
});

test("gunfire brings Wreckers to look; a crouched step behind a wall does not", () => {
  const state = createOps("soldier", seeded(6));
  const guard = alone(state, (agent) => agent.kind === "wrecker" && agent.mode === "guard");
  state.player.x = 18.5;
  state.player.z = 12.5;
  run(state, 2, { forward: 1, crouched: true });
  assert.notEqual(guard.mode, "investigate", "quiet steps go unheard");
  state.player.lastShot = -Infinity;
  fireOps(state, null);
  assert.equal(guard.mode, "investigate");
  assert.ok(guard.goal && Math.hypot(guard.goal.x - state.player.x, guard.goal.z - state.player.z) < 0.5, "towards the sound");
});

test("in a fight a Wrecker shoots back, and it hurts", () => {
  const state = createOps("veteran", seeded(7));
  const guard = alone(state, (agent) => agent.kind === "wrecker");
  state.doors.fill(true);
  // Three metres in front of them.
  state.player.x = guard.x + Math.sin(guard.facing) * 3;
  state.player.z = guard.z + Math.cos(guard.facing) * 3;
  run(state, 6);
  assert.ok(types(state).includes("shot"));
  assert.ok(types(state).includes("hurt"));
  assert.ok(state.player.health < state.player.maxHealth);
});

test("aliens sleep in the dark until something loud, then hunt the nearest living thing", () => {
  const state = createOps("soldier", seeded(8));
  const alien = alone(state, (agent) => agent.kind === "alien");
  state.player.x = 20.5;
  state.player.z = 12.5;
  run(state, 2);
  assert.equal(alien.mode, "dormant");
  fireOps(state, null);
  assert.equal(alien.mode, "hunt");
  assert.ok(types(state).includes("scream"));
  state.doors.fill(true);
  run(state, 12);
  assert.ok(types(state).includes("strike"), "it comes and claws");
});

test("the Hollowed skip ahead towards a sound, and wear the sim-body's view thin", () => {
  const state = createOps("soldier", seeded(9));
  const hollowed = alone(state, (agent) => agent.kind === "hollowed");
  state.doors.fill(true);
  state.player.x = hollowed.x + 4;
  state.player.z = hollowed.z;
  hollowed.voiceIn = 0.5;
  run(state, 4);
  assert.equal(hollowed.mode, "hunt");
  assert.ok(types(state).includes("skip"));
  assert.ok(types(state).includes("whisper"));
});

test("a round in a survivor hurts them; losing AXIOM ends the mission", () => {
  const state = createOps("soldier", seeded(10));
  state.agents = [];
  const survivor = state.survivors[0];
  fireOps(state, { kind: "survivor", id: survivor.id, head: false });
  assert.ok(survivor.health < 60);
  assert.ok(types(state).includes("survivor-hurt"));

  const doomed = createOps("veteran", seeded(11));
  const guard = alone(doomed, (agent) => agent.kind === "wrecker");
  doomed.doors.fill(true);
  doomed.player.x = guard.x;
  doomed.player.z = guard.z + 2;
  run(doomed, 60);
  assert.equal(doomed.outcome, "failed");
  assert.match(doomed.failure ?? "", /sim-body/);
});
