import assert from "node:assert/strict";
import test from "node:test";
import {
  ALIENS,
  ARENA_RADIUS,
  CARBINE,
  SIM_DIFFICULTIES,
  createSim,
  fireCarbine,
  reloadCarbine,
  stepSim,
  waveRoster,
  type SimState,
} from "../app/ark-sim-rules.ts";

/** A repeatable random stream, so each run plays the same. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
const run = (state: SimState, seconds: number, random = seeded(3)) => {
  for (let elapsed = 0; elapsed < seconds && state.player.alive; elapsed += 1 / 30) stepSim(state, 1 / 30, random);
  return state;
};
const types = (state: SimState) => state.events.map((event) => event.type);

test("the difficulties climb: tougher, faster, harder-hitting aliens and less ammunition", () => {
  const [recruit, soldier, veteran] = [SIM_DIFFICULTIES.recruit, SIM_DIFFICULTIES.soldier, SIM_DIFFICULTIES.veteran];
  for (const key of ["toughness", "pace", "bite", "firstWave", "crowd"] as const) {
    assert.ok(recruit[key] < soldier[key] && soldier[key] < veteran[key], key);
  }
  assert.ok(recruit.playerHealth > soldier.playerHealth && soldier.playerHealth > veteran.playerHealth);
  assert.equal(recruit.reserve, Infinity, "a recruit never runs out");
  assert.ok(soldier.reserve > veteran.reserve);
  assert.ok(waveRoster("veteran", 1).length > waveRoster("recruit", 1).length);
});

test("waves come out of the jungle, bigger each time, with spitters and brutes in theirs", () => {
  const state = run(createSim("soldier", seeded(1)), 4);
  assert.equal(state.wave, 1, "the first wave arrives after a breather");
  assert.ok(types(state).includes("spawn") && types(state).includes("wave"));
  for (const alien of state.aliens) assert.ok(Math.hypot(alien.x, alien.z) <= ARENA_RADIUS, "inside the simulation");
  assert.ok(waveRoster("soldier", 4).length > waveRoster("soldier", 1).length);
  assert.ok(!waveRoster("soldier", 1, seeded(2)).includes("brute"));
  assert.ok(waveRoster("soldier", 6, seeded(2)).includes("brute"));
  assert.ok(Array.from({ length: 6 }, (_, wave) => waveRoster("soldier", wave + 2, seeded(wave))).flat().includes("spitter"));
});

test("the carbine fires a round at a time, cycles, clicks when empty, and reloads from the reserve", () => {
  const state = createSim("soldier", seeded(1));
  assert.equal(fireCarbine(state, null), true);
  assert.equal(state.player.magazine, CARBINE.magazine - 1);
  assert.equal(fireCarbine(state, null), false, "not faster than it cycles");
  for (let shot = 0; shot < CARBINE.magazine * 3; shot += 1) {
    state.time += CARBINE.interval;
    fireCarbine(state, null);
  }
  assert.equal(state.player.magazine, 0);
  assert.ok(state.player.reloadDone !== null, "an empty magazine starts a reload");
  assert.equal(fireCarbine(state, null), false, "no firing mid-reload");
  const reserve = state.player.reserve;
  stepSim(state, CARBINE.reload + 0.01, seeded(1));
  assert.equal(state.player.magazine, CARBINE.magazine);
  assert.equal(state.player.reserve, reserve - CARBINE.magazine);
  assert.equal(reloadCarbine(state), false, "nothing to reload when full");
});

test("on Recruit the ammunition never runs out", () => {
  const state = createSim("recruit", seeded(1));
  let fired = 0;
  for (let tick = 0; tick < 6_000; tick += 1) {
    state.time += CARBINE.interval;
    if (fireCarbine(state, null)) fired += 1;
    if (state.player.reloadDone !== null && state.time >= state.player.reloadDone) stepSim(state, 0, seeded(1));
  }
  assert.ok(fired > 500, `${fired} rounds and still firing`);
  assert.equal(state.player.reserve, Infinity);
});

test("shooting an alien hurts it, killing it scores, and what it drops can be picked up", () => {
  const state = createSim("soldier", seeded(4));
  state.pickups = [];
  state.aliens.push({ id: 99, kind: "stalker", x: 0, z: 5, health: 2, maxHealth: 2, cooldown: 5, screamIn: 9, circle: 1 });
  fireCarbine(state, 99, () => 0.99);
  assert.equal(state.aliens[0].health, 1);
  state.time += CARBINE.interval;
  fireCarbine(state, 99, () => 0);
  assert.equal(state.aliens.length, 0);
  assert.equal(state.kills, 1);
  assert.ok(state.score >= ALIENS.stalker.score);
  assert.equal(state.pickups[0]?.kind, "ammo", "a lucky roll drops ammunition");
  const before = state.player.reserve;
  state.player.x = state.pickups[0].x;
  state.player.z = state.pickups[0].z;
  stepSim(state, 0.01, seeded(4));
  assert.equal(state.pickups.length, 0);
  assert.equal(state.player.reserve, before + CARBINE.magazine * 2);
});

test("aliens close in and strike; stand still on Veteran and the run ends", () => {
  const state = run(createSim("veteran", seeded(5)), 120);
  assert.ok(types(state).includes("hurt"));
  assert.equal(state.player.alive, false);
  assert.equal(state.player.health, 0);
  assert.equal(types(state).at(-1), "death");
  const after = state.time;
  stepSim(state, 1, seeded(5));
  assert.equal(state.time, after, "nothing moves once the run is over");
});

test("spitters keep their distance and lob acid that can be dodged", () => {
  const state = createSim("soldier", seeded(6));
  state.nextArrival = Infinity;
  state.aliens.push({ id: 7, kind: "spitter", x: 0, z: 9, health: 2, maxHealth: 2, cooldown: 0, screamIn: 9, circle: 1 });
  stepSim(state, 0.05, seeded(6));
  assert.equal(state.spit.length, 1, "it spits from range");
  // Step aside and the acid flies past.
  state.player.x = 3;
  for (let tick = 0; tick < 40; tick += 1) stepSim(state, 0.05, seeded(6));
  assert.equal(state.player.health, state.player.maxHealth);
  const spitter = state.aliens[0];
  const distance = Math.hypot(spitter.x - state.player.x, spitter.z - state.player.z);
  assert.ok(distance > 5, `it keeps back (${distance.toFixed(1)} m)`);
});
