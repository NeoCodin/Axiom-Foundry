import assert from "node:assert/strict";
import test from "node:test";
import {
  BARRELS,
  CELLS,
  createCarbine,
  DEFAULT_LOADOUT,
  FORMS,
  pullTrigger,
  RECHARGE_RATE,
  sanitizeLoadout,
  stepCarbine,
  swapCell,
  VENT_SECONDS,
} from "../app/arc-carbine.ts";

test("one carbine, three firing laws: each makes it a different weapon", () => {
  assert.ok(FORMS.conservation.interval < FORMS.containment.interval, "Conservation fires fastest");
  assert.ok(FORMS.containment.damage > FORMS.conservation.damage * 4, "Containment hits hardest");
  assert.equal(FORMS.containment.spread, 0, "and exactly");
  assert.ok(FORMS.transit.bolts > 1 && FORMS.transit.spread > FORMS.conservation.spread, "Transit throws a wide burst");
  for (const form of Object.values(FORMS)) assert.match(form.law, /Conservation|Containment|Transit/, "each is one of the first three laws");
});

test("attachments: a suppressor damps the shot, a focus coil tightens it, a heat sink runs cooler", () => {
  const plain = pullTrigger(createCarbine(), 0);
  const quiet = pullTrigger(createCarbine({ ...DEFAULT_LOADOUT, barrel: "suppressor" }), 0);
  const tight = pullTrigger(createCarbine({ ...DEFAULT_LOADOUT, barrel: "focus" }), 0);
  assert.ok(typeof plain === "object" && typeof quiet === "object" && typeof tight === "object");
  assert.ok(quiet.noise < plain.noise && quiet.damage < plain.damage);
  assert.ok(tight.spread < plain.spread);
  assert.ok(CELLS.heatsink.limit > CELLS.standard.limit && CELLS.heatsink.cooling > CELLS.standard.cooling);
  assert.ok(CELLS.extended.capacity > CELLS.standard.capacity && CELLS.extended.swap > CELLS.standard.swap);
  assert.equal(BARRELS.bare.noise, 1);
});

test("the cell: shots spend it, the Lawheart's reach refills it, a swap seats a spare", () => {
  const gun = createCarbine(DEFAULT_LOADOUT, 1);
  pullTrigger(gun, 0);
  assert.equal(gun.charge, CELLS.standard.capacity - FORMS.conservation.cost);
  stepCarbine(gun, 1, 1, false);
  assert.equal(gun.charge, CELLS.standard.capacity - FORMS.conservation.cost, "no reach, no charge");
  stepCarbine(gun, 2, 1, true);
  assert.equal(gun.charge, CELLS.standard.capacity, `inside the reach it fills at ${RECHARGE_RATE} a second`);
  gun.charge = 2;
  assert.equal(pullTrigger(gun, 5), "dry", "too little for a shot clicks");
  assert.ok(gun.swapUntil !== null, "and starts a swap");
  stepCarbine(gun, 5 + CELLS.standard.swap, 0.01, false);
  assert.equal(gun.charge, CELLS.standard.capacity);
  assert.equal(gun.spare, 0);
  gun.charge = 10;
  assert.equal(swapCell(gun, 9), false, "no spares left to swap in");
});

test("heat: past the coils' limit the carbine vents, then cools back to nothing", () => {
  const gun = createCarbine({ ...DEFAULT_LOADOUT, form: "containment" });
  let time = 0;
  let shots = 0;
  while (gun.ventUntil === null && shots < 10) {
    pullTrigger(gun, time);
    shots += 1;
    time += FORMS.containment.interval;
  }
  assert.ok(shots >= 3 && shots <= 6, `a few heavy bolts back to back (${shots})`);
  assert.equal(pullTrigger(gun, time + 0.1), "hot");
  stepCarbine(gun, time + VENT_SECONDS, VENT_SECONDS, false);
  assert.equal(gun.ventUntil, null);
  assert.equal(gun.heat, 0);
});

test("a stored loadout is checked, and anything unknown falls back to the issue part", () => {
  assert.deepEqual(sanitizeLoadout({ form: "transit", optic: "scope", barrel: "rocket", cell: 3 }), { form: "transit", optic: "scope", barrel: "bare", cell: "standard" });
  assert.deepEqual(sanitizeLoadout(null), DEFAULT_LOADOUT);
});
