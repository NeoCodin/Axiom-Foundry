import assert from "node:assert/strict";
import test from "node:test";
import { SYSTEMS, systemFor } from "../app/ark-walk-space.ts";

test("every world has its own star, and looks different from the others", () => {
  assert.deepEqual(SYSTEMS.map((system) => system.world), ["Pelagos", "Viridia", "Cinder", "Nox", "Vesper"]);
  assert.equal(new Set(SYSTEMS.map((system) => system.sun.color)).size, 5);
  assert.equal(new Set(SYSTEMS.map((system) => system.planet.kind)).size, 5);
  for (const system of SYSTEMS) assert.ok(systemFor(system.world).system === system && !systemFor(system.world).deep);
});

test("Cinder sits close in under the biggest sun, Nox far out by the smallest", () => {
  const sizes = SYSTEMS.map((system) => system.sun.size);
  assert.equal(SYSTEMS.find((system) => system.sun.size === Math.max(...sizes))?.world, "Cinder");
  assert.equal(SYSTEMS.find((system) => system.sun.size === Math.min(...sizes))?.world, "Nox");
});

test("away from a world the Ark is in deep space: no planet fills the window before it arrives", () => {
  assert.ok(systemFor("Cold Wake").deep);
  assert.equal(systemFor("Cold Wake").system.world, "Pelagos");
  const crossing = systemFor("Transit to Viridia");
  assert.ok(crossing.deep);
  assert.equal(crossing.system.world, "Viridia");
});
