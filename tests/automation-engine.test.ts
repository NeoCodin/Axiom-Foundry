import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_UTILITY_DRONE_FRAMES,
  buildAutomationFrame,
  createAutomationState,
  getAutomationEffects,
  getAvailableAutomationFrames,
  sanitizeAutomationState,
  setAutomationAllocation,
  setAutomationMaintenancePolicy,
} from "../app/automation-engine.ts";

test("utility frames are scarce, permanent allocations with bounded load", () => {
  let state = createAutomationState();
  for (let index = 0; index < 20; index += 1) state = buildAutomationFrame(state);
  assert.equal(state.framesBuilt, MAX_UTILITY_DRONE_FRAMES);
  state = setAutomationAllocation(state, "medical-assistance", 3);
  state = setAutomationAllocation(state, "research-routing", 3);
  state = setAutomationAllocation(state, "interceptor-control", 2);
  assert.equal(getAvailableAutomationFrames(state), 0);
  assert.equal(setAutomationAllocation(state, "personnel-logistics", 1), state);
  const effects = getAutomationEffects(state);
  assert.equal(effects.operationalLoad, 0.1);
  assert.equal(effects.medicalRecoveryMultiplier, 1.15);
  assert.equal(effects.researchRoutingMultiplier, 1.09);
  assert.equal(effects.interceptorReadiness, 12);
});

test("a targeted seizure suppresses one program without deleting its assignment", () => {
  let state = createAutomationState();
  state = buildAutomationFrame(buildAutomationFrame(state));
  state = setAutomationAllocation(state, "hull-maintenance", 2);
  const seized = getAutomationEffects(state, "hull-maintenance");
  assert.equal(seized.hullRepairMultiplier, 1);
  assert.equal(seized.operationalLoad, 0);
  assert.equal(state.allocations["hull-maintenance"], 2);
});

test("automation sanitization repairs over-allocation and maintenance policy", () => {
  const state = sanitizeAutomationState({
    framesBuilt: 2,
    allocations: {
      "hull-maintenance": 99,
      "medical-assistance": 99,
    },
    maintenancePolicy: "delete-everything",
    stats: { equipmentRepaired: -5 },
  });
  assert.equal(state.allocations["hull-maintenance"], 2);
  assert.equal(state.allocations["medical-assistance"], 0);
  assert.equal(state.maintenancePolicy, "reserve");
  assert.equal(state.stats.equipmentRepaired, 0);
  assert.equal(setAutomationMaintenancePolicy(state, "priority").maintenancePolicy, "priority");
});
