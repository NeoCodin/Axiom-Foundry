import assert from "node:assert/strict";
import test from "node:test";
import { calculateNullSaturation, getLawHeartNullResistance, getNullDisplayLabel, WORLD_NULL_SATURATION } from "../app/null-saturation-engine.ts";

test("six-world saturation curve stays below post-Vesper danger", () => {
  assert.deepEqual(WORLD_NULL_SATURATION, { "cold-wake": 28, pelagos: 6, viridia: 10, cinder: 15, nox: 23, vesper: 34 });
  assert.ok(Math.max(...Object.values(WORLD_NULL_SATURATION)) <= 35);
});
test("Null terminology is revealed progressively", () => {
  assert.equal(getNullDisplayLabel(0), "Unknown Interference");
  assert.equal(getNullDisplayLabel(1), "Law Variance");
  assert.equal(getNullDisplayLabel(2), "Causal Contamination");
  assert.equal(getNullDisplayLabel(4), "Null Saturation");
});
test("effective saturation subtracts protection and produces bounded effects", () => {
  const view = calculateNullSaturation({ worldId: "vesper", worldIndex: 5, lifetimeAxioms: 12, completedResearchIds: ["null-signal-baseline", "observer-recursion"], completedInfrastructure: 2 });
  assert.equal(view.ambient, 34);
  assert.equal(view.effective, 14);
  assert.ok(view.medicalRecoveryMultiplier >= 0.88);
  assert.ok(view.researchThroughputMultiplier >= 0.9);
});
test("red Lawheart remains less stable than gold and white", () => {
  assert.ok(getLawHeartNullResistance(12) > getLawHeartNullResistance(24));
  assert.ok(getLawHeartNullResistance(72) > getLawHeartNullResistance(24));
});
test("QA override can isolate environment and protections", () => {
  const view = calculateNullSaturation({ worldId: "pelagos", worldIndex: 1, lifetimeAxioms: 0, override: { enabled: true, ambient: 52, lawHeartResistance: 5, researchProtection: 2, infrastructureProtection: 1, visualIntensity: 1 } });
  assert.equal(view.effective, 44);
  assert.equal(view.visualIntensity, 1);
  assert.equal(view.classification, "severe");
});
