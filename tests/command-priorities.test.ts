import assert from "node:assert/strict";
import test from "node:test";

import { getCommandPriorities } from "../app/command-priorities.ts";
import {
  createInitialState,
  isThreatOperationsActivated,
  setTutorialComplete,
} from "../app/game-engine.ts";
import { getProgressiveDisclosure } from "../app/progressive-disclosure.ts";
import { selectResearchProject } from "../app/research-engine.ts";

test("orientation is the only priority before the game begins", () => {
  const state = createInitialState(0);
  const priorities = getCommandPriorities(state);
  assert.equal(priorities.length, 1);
  assert.equal(priorities[0]?.id, "orientation");
  assert.equal(priorities[0]?.target, "deck");
});

test("the command board routes the active Cold Wake action to the Ark", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  const priorities = getCommandPriorities(state);
  assert.equal(priorities[0]?.id, "active-directive");
  assert.equal(priorities[0]?.target, "deck");
  assert.match(priorities[0]?.detail ?? "", /Tune the Core 12 times/);
});

test("Threat Operations wakes in layers and preserves old defense progress", () => {
  const freshCinder = createInitialState(0);
  freshCinder.missions.currentIndex = 3;
  assert.equal(isThreatOperationsActivated(freshCinder), false);

  freshCinder.expeditions.stats.completed = 1;
  assert.equal(isThreatOperationsActivated(freshCinder), false);
  freshCinder.expeditions.stats.completed = 2;
  assert.equal(isThreatOperationsActivated(freshCinder), true);

  const oldSave = createInitialState(0);
  oldSave.missions.currentIndex = 3;
  oldSave.defense.installations.shieldArray = 1;
  assert.equal(isThreatOperationsActivated(oldSave), true);
});

test("facilities reveal in a teachable Cinder sequence", () => {
  const state = createInitialState(0);
  state.missions.currentIndex = 1;
  state.settlement.currentWorldId = "pelagos";
  assert.equal(getProgressiveDisclosure(state).medical, false);

  state.missions.currentIndex = 2;
  state.settlement.currentWorldId = "viridia";
  assert.equal(getProgressiveDisclosure(state).medical, true);

  state.missions.currentIndex = 3;
  state.settlement.currentWorldId = "cinder";
  let disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.expeditions, true);
  assert.equal(disclosure.armory, false);
  assert.equal(disclosure.defense, false);

  state.expeditions.stats.completed = 1;
  disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.armory, true);
  assert.equal(disclosure.defense, false);

  state.expeditions.stats.completed = 2;
  assert.equal(getProgressiveDisclosure(state).defense, true);
});

test("research blockers name the missing evidence and open its exact destination", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.missions.currentIndex = 99;
  state.settlement.currentWorldId = null;
  state.tiers[0].bought = 1;
  state.research = selectResearchProject(
    state.research,
    "auxiliary-power-routing",
  );
  state.research.inventory["calibration-data"] = 0;
  state.researchStock["calibration-data"] = 0;

  const priority = getCommandPriorities(state).find(
    (entry) => entry.id === "active-research",
  );
  assert.ok(priority);
  assert.equal(priority.cadence, "action");
  assert.equal(priority.target, "deck");
  assert.match(priority.missing ?? "", /Calibration Data/i);
  assert.match(priority.nextAction ?? "", /Tune the Axiom Chamber/i);

  state.researchStock["calibration-data"] = 100;
  const transfer = getCommandPriorities(state).find(
    (entry) => entry.id === "active-research",
  );
  assert.equal(transfer?.target, "research");
  assert.equal(transfer?.panel, "research-lattice");
  assert.match(transfer?.nextAction ?? "", /Transfer Calibration Data/i);
});
