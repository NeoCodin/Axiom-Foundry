import assert from "node:assert/strict";
import test from "node:test";
import { CELLS, FORMS } from "../app/arc-carbine.ts";
import {
  ALIENS,
  ARENA_RADIUS,
  DRILL_CAP_SECONDS,
  SIM_DOME,
  SIM_DIFFICULTIES,
  createSim,
  dodge,
  fireCarbine,
  HARRIER_CRUISE,
  KILL_FLUX,
  punch,
  reloadCarbine,
  RESONANT,
  slam,
  stepSim,
  tetherAlien,
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

test("the difficulties climb: tougher, faster, harder-hitting aliens and fewer spare cells", () => {
  const [recruit, soldier, veteran] = [SIM_DIFFICULTIES.recruit, SIM_DIFFICULTIES.soldier, SIM_DIFFICULTIES.veteran];
  for (const key of ["toughness", "pace", "bite", "firstWave", "crowd"] as const) {
    assert.ok(recruit[key] < soldier[key] && soldier[key] < veteran[key], key);
  }
  assert.ok(recruit.playerHealth > soldier.playerHealth && soldier.playerHealth > veteran.playerHealth);
  assert.equal(recruit.cells, Infinity, "a recruit never runs out");
  assert.ok(soldier.cells > veteran.cells);
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

test("the carbine spends its cell a shot at a time, cycles, clicks when empty, and swaps in a spare", () => {
  const state = createSim("soldier", seeded(1));
  state.player.x = 20;
  const cost = FORMS.conservation.cost;
  assert.ok(fireCarbine(state, null));
  assert.equal(state.player.gun.charge, CELLS.standard.capacity - cost);
  assert.equal(fireCarbine(state, null), null, "not faster than it cycles");
  // Fire in bursts, letting the coils vent when they must, until the cell runs dry.
  for (let shot = 0; shot < 80 && state.player.gun.swapUntil === null; shot += 1) {
    state.time += FORMS.conservation.interval;
    fireCarbine(state, null);
    if (state.player.gun.ventUntil !== null) stepSim(state, 2, seeded(1));
  }
  assert.ok(state.player.gun.swapUntil !== null, "an empty cell starts a swap away from the dome");
  assert.equal(fireCarbine(state, null), null, "no firing mid-swap");
  const spare = state.player.gun.spare;
  stepSim(state, CELLS.standard.swap + 0.01, seeded(1));
  assert.equal(state.player.gun.charge, CELLS.standard.capacity);
  assert.equal(state.player.gun.spare, spare - 1);
  assert.equal(reloadCarbine(state), false, "nothing to swap when full");
});

test("under the training dome the cell fills on its own; out in the jungle it does not", () => {
  const state = createSim("soldier", seeded(1));
  state.player.gun.charge = 10;
  assert.ok(Math.hypot(state.player.x - SIM_DOME.x, state.player.z - SIM_DOME.z) <= SIM_DOME.radius, "a run begins under the dome");
  stepSim(state, 2, seeded(1));
  assert.ok(state.player.gun.charge > 30);
  state.player.x = 25;
  const before = state.player.gun.charge;
  stepSim(state, 2, seeded(1));
  assert.equal(state.player.gun.charge, before);
});

test("firing hot overheats the coils: the carbine vents and won't fire until it has", () => {
  const state = createSim("soldier", seeded(1));
  let vented = false;
  for (let shot = 0; shot < 40 && !vented; shot += 1) {
    state.time += FORMS.conservation.interval;
    fireCarbine(state, null);
    vented = state.player.gun.ventUntil !== null;
  }
  assert.ok(vented, "sustained fire takes the coils past their limit");
  state.time += 0.5;
  assert.equal(fireCarbine(state, null), null);
  stepSim(state, 2, seeded(1));
  assert.equal(state.player.gun.ventUntil, null);
  state.time += 1;
  assert.ok(fireCarbine(state, null), "vented, it fires again");
});

test("on Recruit the spare cells never run out", () => {
  const state = createSim("recruit", seeded(1));
  state.player.x = 20;
  let fired = 0;
  for (let tick = 0; tick < 6_000; tick += 1) {
    state.time += FORMS.conservation.interval;
    stepSim(state, 0.02, seeded(1));
    if (fireCarbine(state, null)) fired += 1;
  }
  assert.ok(fired > (CELLS.standard.capacity / FORMS.conservation.cost) * 5, `${fired} shots, through cell after cell, and still firing`);
  assert.equal(state.player.gun.spare, Infinity);
});

test("each bolt of a Scatter can strike, and a Lance drops a stalker in one", () => {
  const scatter = createSim("soldier", seeded(4), { form: "transit", optic: "iron", barrel: "bare", cell: "standard" });
  scatter.aliens.push({ id: 99, kind: "stalker", x: 0, z: 5, health: 10, maxHealth: 10, cooldown: 5, screamIn: 9, circle: 1 });
  const shot = fireCarbine(scatter, (discharge) => Array.from({ length: discharge.bolts }, (_, bolt) => (bolt < 4 ? 99 : null)));
  assert.equal(shot?.bolts, 7);
  assert.equal(scatter.aliens[0].health, 10 - 4 * FORMS.transit.damage, "four of seven bolts struck");
  const lance = createSim("soldier", seeded(4), { form: "containment", optic: "scope", barrel: "bare", cell: "standard" });
  lance.aliens.push({ id: 7, kind: "stalker", x: 0, z: 5, health: 3, maxHealth: 3, cooldown: 5, screamIn: 9, circle: 1 });
  fireCarbine(lance, 7);
  assert.equal(lance.aliens.length, 0);
});

test("shooting an alien hurts it, killing it scores, and what it drops can be picked up", () => {
  const state = createSim("soldier", seeded(4));
  state.pickups = [];
  state.aliens.push({ id: 99, kind: "stalker", x: 0, z: 5, health: 2, maxHealth: 2, cooldown: 5, screamIn: 9, circle: 1 });
  fireCarbine(state, 99, () => 0.99);
  assert.equal(state.aliens[0].health, 1);
  state.time += FORMS.conservation.interval;
  fireCarbine(state, 99, () => 0);
  assert.equal(state.aliens.length, 0);
  assert.equal(state.kills, 1);
  assert.ok(state.score >= ALIENS.stalker.score);
  assert.equal(state.pickups[0]?.kind, "cell", "a lucky roll drops a spare cell");
  const before = state.player.gun.spare;
  state.player.x = state.pickups[0].x;
  state.player.z = state.pickups[0].z;
  stepSim(state, 0.01, seeded(4));
  assert.equal(state.pickups.length, 0);
  assert.equal(state.player.gun.spare, before + 1);
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

test("clearing a wave drills the Security trainees: more on harder settings, capped for the run", () => {
  assert.ok(SIM_DIFFICULTIES.recruit.drill < SIM_DIFFICULTIES.soldier.drill && SIM_DIFFICULTIES.soldier.drill < SIM_DIFFICULTIES.veteran.drill);
  const state = createSim("soldier", seeded(8));
  stepSim(state, 0.1, seeded(8));
  assert.ok(!types(state).includes("cleared"), "nothing is cleared before the first wave");
  state.events.length = 0;
  run(state, 4);
  assert.equal(state.wave, 1);
  // Every alien of the wave falls.
  state.roster = [];
  state.aliens = [];
  state.nextArrival = Infinity;
  state.events.length = 0;
  stepSim(state, 0.05, seeded(8));
  assert.deepEqual(state.events.find((event) => event.type === "cleared"), { type: "cleared", wave: 1, drill: SIM_DIFFICULTIES.soldier.drill });
  assert.equal(state.cleared, 1);
  assert.equal(state.drilled, SIM_DIFFICULTIES.soldier.drill);

  // Near the cap, a wave gives only what is left of it.
  state.drilled = DRILL_CAP_SECONDS - 30;
  state.events.length = 0;
  run(state, 4);
  state.roster = [];
  state.aliens = [];
  state.nextArrival = Infinity;
  stepSim(state, 0.05, seeded(8));
  assert.equal(state.events.find((event) => event.type === "cleared")?.drill, 30);
  assert.equal(state.drilled, DRILL_CAP_SECONDS);
});

const alien = (id: number, kind: "stalker" | "spitter" | "brute" | "harrier", x: number, z: number, health = 10) =>
  ({ id, kind, x, z, health, maxHealth: health, cooldown: 0, screamIn: 99, circle: 1 as const, ...(kind === "harrier" ? { height: HARRIER_CRUISE, dive: false } : {}) });
const quiet = (state: SimState) => {
  state.roster = [];
  state.nextArrival = Infinity;
  state.pickups = [];
};

test("harriers circle overhead out of reach, then dive at AXIOM and strike", () => {
  assert.ok(waveRoster("soldier", 2).includes("harrier"), "they join from the second wave");
  assert.ok(!waveRoster("soldier", 1).includes("harrier"));
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.aliens.push({ ...alien(5, "harrier", 9, 0), cooldown: 3 });
  run(state, 2);
  const harrier = state.aliens[0];
  assert.ok((harrier.height ?? 0) > 5, "it keeps high while it circles");
  assert.equal(state.player.health, state.player.maxHealth);
  run(state, 6);
  assert.ok(types(state).includes("strike") || state.player.health < state.player.maxHealth, "then it comes down and claws");
});

test("nothing on the ground reaches AXIOM up in the air", () => {
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.aliens.push(alien(5, "stalker", 1.2, 0));
  state.player.lift = 4;
  run(state, 2);
  assert.equal(state.player.health, state.player.maxHealth);
  state.player.lift = 0;
  run(state, 2);
  assert.ok(state.player.health < state.player.maxHealth);
});

test("a dash carries AXIOM through blows and acid", () => {
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.aliens.push(alien(5, "stalker", 1.2, 0));
  dodge(state, 0.5);
  stepSim(state, 0.05, seeded(1));
  assert.ok(types(state).includes("dodged"));
  assert.equal(state.player.health, state.player.maxHealth);
});

test("the punch knocks a stalker back and stuns it; it throws acid back to burn the spitter", () => {
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.aliens.push(alien(5, "stalker", 0, -2));
  const struck = punch(state, 0, -1);
  assert.equal(struck?.hit, 1);
  const stalker = state.aliens[0];
  assert.ok(stalker.z < -5, "knocked back");
  assert.ok(stalker.cooldown >= 1, "and stunned");
  assert.equal(punch(state, 0, -1), null, "not again straight away");
  const second = createSim("soldier", seeded(1));
  quiet(second);
  second.aliens.push({ ...alien(6, "spitter", 0, -8, 3), cooldown: 5 });
  second.spit.push({ id: 90, x: 0, z: -1.5, dx: 0, dz: 10, life: 1 });
  const answer = punch(second, 0, -1);
  assert.equal(answer?.parried, 1);
  for (let tick = 0; tick < 40; tick += 1) stepSim(second, 0.02, seeded(1));
  assert.ok(second.aliens.length === 0 || second.aliens[0].health < 3, "the acid burned the spitter");
  assert.equal(second.player.health, second.player.maxHealth, "and not AXIOM");
});

test("a slam throws back what's on the ground near the landing, harder from higher, but not harriers overhead", () => {
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.aliens.push(alien(5, "stalker", 2, 0), alien(6, "stalker", 20, 0), alien(7, "harrier", 1, 1));
  assert.equal(slam(state, 1.5), 1);
  assert.ok(state.aliens.find((candidate) => candidate.id === 5)!.x > 4, "the near one is thrown");
  assert.equal(state.aliens.find((candidate) => candidate.id === 7)!.health, 10, "the flier is untouched");
});

test("the tether hauls a harrier out of the sky to arm's length; a brute is too heavy, so AXIOM goes to it", () => {
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.aliens.push(alien(5, "harrier", 0, -20), alien(6, "brute", 15, 0));
  assert.equal(tetherAlien(state, 5), "pulled");
  const harrier = state.aliens[0];
  assert.ok(Math.hypot(harrier.x, harrier.z) < 2.5 && (harrier.height ?? 0) < 2, "hauled in and down");
  assert.equal(tetherAlien(state, 6), "anchored");
  assert.equal(tetherAlien(state, 99), null);
});

test("kills give off Flux into the cell, and shots on the Law-Heart's beat strike harder", () => {
  const state = createSim("soldier", seeded(1));
  quiet(state);
  state.player.x = 25;
  state.player.gun.charge = 40;
  state.aliens.push(alien(5, "stalker", 25, 3, 1));
  fireCarbine(state, 5, () => 0.99);
  assert.equal(state.kills, 1);
  assert.ok(Math.abs(state.player.gun.charge - (40 - FORMS.conservation.cost + 100 * KILL_FLUX)) < 0.01, "the kill topped the cell up");
  state.aliens.push(alien(6, "brute", 25, 3, 10));
  state.time += 1;
  fireCarbine(state, 6, () => 0.99, true);
  assert.equal(state.aliens[0].health, 10 - FORMS.conservation.damage * RESONANT);
  assert.ok(types(state).includes("resonant"));
});
