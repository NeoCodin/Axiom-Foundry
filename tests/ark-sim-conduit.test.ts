import assert from "node:assert/strict";
import test from "node:test";
import { CELLS, FORMS, RECHARGE_RATE } from "../app/arc-carbine.ts";
import {
  conduitCleared,
  conduitConfine,
  conduitCourse,
  ENCOUNTERS,
  HALL,
  inHall,
  progressOf,
  spineAt,
  SPINE,
  TUBE,
  TUBE_LENGTH,
} from "../app/ark-sim-conduit.ts";
import { createSim, fireCarbine, MEND_DELAY, stepSim } from "../app/ark-sim-rules.ts";

const seeded = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return value / 4_294_967_296;
  };
};
const run = (state: ReturnType<typeof createSim>, seconds: number, random = seeded(3)) => {
  for (let tick = 0; tick < seconds * 20; tick += 1) stepSim(state, 0.05, random);
};
const conduit = (difficulty: "recruit" | "soldier" | "veteran" = "soldier") => createSim(difficulty, seeded(1), undefined, conduitCourse());

test("the tubes hold everything to their width, and the last one opens onto the hall's wall", () => {
  assert.deepEqual(conduitConfine(0, -10, 0.4), { x: 0, z: -10 }, "down the middle of the first tube");
  const pushed = conduitConfine(12, -10, 0.4);
  assert.ok(Math.abs(pushed.x - (TUBE.half - 0.4)) < 1e-9 && pushed.z === -10, "back to the tube's side wall");
  const last = SPINE[SPINE.length - 1];
  assert.ok(Math.abs(Math.hypot(last.x - HALL.x, last.z - HALL.z) - HALL.radius) < 1e-9);
  assert.ok(TUBE_LENGTH > 120 && TUBE_LENGTH < 135);
});

test("the hall: anywhere inside its wall, never inside the Lawheart's column, and the wall over a tube's mouth stops a flier", () => {
  assert.deepEqual(conduitConfine(10, -150, 0.4), { x: 10, z: -150 });
  const core = conduitConfine(HALL.x + 1, HALL.z, 0.4);
  assert.ok(Math.hypot(core.x - HALL.x, core.z - HALL.z) >= HALL.core + 0.4 - 1e-9, "pushed out of the column");
  const beyond = conduitConfine(0, -110, 0.4, 0);
  assert.deepEqual(beyond, { x: 0, z: -110 }, "walking out of the mouth into the tube is fine");
  const high = conduitConfine(0, -110, 0.4, 12);
  assert.ok(inHall(high.x, high.z, 0.3), "but high up, the wall is in the way");
});

test("progress runs along the spine and on into the hall", () => {
  assert.ok(Math.abs(progressOf(0, 0) - 4) < 1e-9);
  const middle = spineAt(60);
  assert.ok(Math.abs(progressOf(middle.x, middle.z) - 60) < 1e-6);
  assert.ok(progressOf(HALL.x, HALL.z + 10) > TUBE_LENGTH);
});

test("each stretch waits for AXIOM to reach it, then comes from further down the tube", () => {
  const state = conduit();
  run(state, 4);
  assert.equal(state.wave, 1, "the first run starts once the sim begins");
  assert.ok(state.aliens.length + state.roster.length > 0);
  for (const alien of state.aliens) {
    assert.ok(progressOf(alien.x, alien.z) > progressOf(state.player.x, state.player.z) + 10, "ahead of AXIOM");
    assert.deepEqual(conduitConfine(alien.x, alien.z, 0), { x: alien.x, z: alien.z }, "and inside the tube");
  }
  state.aliens = [];
  state.roster = [];
  state.nextArrival = Infinity;
  state.player.health = 1e6;
  run(state, 6);
  assert.equal(state.cleared, 1);
  assert.equal(state.wave, 1, "the bend waits until AXIOM gets there");
  const bend = spineAt(ENCOUNTERS[1].at + 1);
  state.player.x = bend.x;
  state.player.z = bend.z;
  run(state, 1);
  assert.equal(state.wave, 2);
});

test("the last wave beaten, the course is cleared", () => {
  const state = conduit();
  state.player.health = 1e6;
  state.player.maxHealth = 1e6;
  state.player.x = HALL.x;
  state.player.z = HALL.z + 20;
  for (let encounter = 0; encounter < ENCOUNTERS.length; encounter += 1) {
    run(state, 4);
    state.aliens = [];
    state.roster = [];
    state.nextArrival = Infinity;
    run(state, 0.2);
  }
  assert.ok(conduitCleared(state), `cleared ${state.cleared} of ${ENCOUNTERS.length}`);
  for (const alien of state.aliens) assert.ok(inHall(alien.x, alien.z), "the hall's waves come in the hall");
});

test("the power pack feeds the carbine anywhere, harder, with no spares to find; the sim-body mends between blows", () => {
  const state = conduit();
  state.roster = [];
  state.nextArrival = Infinity;
  assert.equal(state.player.gun.spare, 0);
  assert.equal(state.pickups.length, 0);
  state.player.x = 16;
  state.player.z = -70;
  state.player.gun.charge = 10;
  run(state, 1);
  assert.ok(state.player.gun.charge >= Math.min(CELLS.standard.capacity, 10 + RECHARGE_RATE * 2.5 * 0.95), `fed at the pack's rate (${state.player.gun.charge})`);
  state.aliens.push({ id: 90, kind: "brute", x: 16, z: -74, health: 100, maxHealth: 100, cooldown: 99, screamIn: 99, circle: 1 });
  state.player.gun.charge = CELLS.standard.capacity;
  state.time += 1;
  fireCarbine(state, 90, () => 0.99);
  assert.ok(Math.abs(state.aliens[0].health - (100 - FORMS.conservation.damage * 1.4)) < 1e-9, "bolts strike harder");
  state.aliens = [];
  state.player.health = 40;
  state.player.hurtAt = state.time;
  run(state, MEND_DELAY * 0.8);
  assert.equal(state.player.health, 40, "not straight after a blow");
  run(state, 3);
  assert.ok(state.player.health > 40, "then it mends");
});

test("a recruit faces fewer in each stretch, a veteran more", () => {
  const recruit = conduit("recruit");
  const veteran = conduit("veteran");
  const soldier = conduit("soldier");
  for (const state of [recruit, veteran, soldier]) run(state, 3.6);
  const count = (state: ReturnType<typeof createSim>) => state.aliens.length + state.roster.length;
  assert.ok(count(recruit) < count(soldier) && count(soldier) < count(veteran));
});
