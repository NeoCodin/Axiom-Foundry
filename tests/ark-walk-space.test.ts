import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildSpace, SYSTEMS, systemFor } from "../app/ark-walk-space.ts";

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

const sunsIn = (sky: THREE.Object3D) => {
  const found: THREE.Object3D[] = [];
  sky.traverse((object) => { if ((object as THREE.Mesh).geometry instanceof THREE.PlaneGeometry) found.push(object); });
  return found;
};

test("on a crossing no planet is out there, and the star ahead grows as the one behind shrinks", () => {
  const sky = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  const space = buildSpace(sky, "Viridia", new THREE.Vector3(260, -120, 260), 6, { originName: "Pelagos", destinationName: "Viridia", progress: 0 }, true);
  let spheres = 0;
  sky.traverse((object) => { if ((object as THREE.Mesh).geometry?.type === "SphereGeometry") spheres += 1; });
  assert.equal(spheres, 1, "only the nebula's shell");
  const [ahead, behind] = sunsIn(sky);
  space.update(0, camera, 0);
  const startAhead = ahead.scale.x;
  const startBehind = behind.scale.x;
  space.update(0, camera, 1);
  assert.ok(ahead.scale.x > startAhead * 10);
  assert.ok(behind.scale.x < startBehind / 10);
  space.dispose();
  assert.equal(sky.children.length, 0);
});

test("every world has its sun, Vesper its second, and the scene knows which world it is", () => {
  for (const system of SYSTEMS) {
    const sky = new THREE.Group();
    const space = buildSpace(sky, system.world, new THREE.Vector3(40, -120, 190), 150, null, true);
    assert.equal(sunsIn(sky).length, system.companion ? 2 : 1);
    assert.equal(space.key, system.world);
  }
});
