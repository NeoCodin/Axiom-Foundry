import assert from "node:assert/strict";
import test from "node:test";

import { getCommandPriorities } from "../app/command-priorities.ts";
import {
  COLD_WAKE_DEPARTURE_STAGE,
  COLD_WAKE_FOUNDRY_STAGE,
  COLD_WAKE_LIFE_SUPPORT_STAGE,
  COLD_WAKE_NAVIGATION_STAGE,
  createInitialState,
  isThreatOperationsActivated,
  setTutorialComplete,
} from "../app/game-engine.ts";
import { getProgressiveDisclosure } from "../app/progressive-disclosure.ts";
import { selectResearchProject } from "../app/research-engine.ts";
import { beginTransit } from "../app/transit-engine.ts";

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
  assert.match(priorities[0]?.detail ?? "", /Strike the Law Press 12 times/);
});

test("Cold Wake reveals one destination at each commissioning handoff", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.manualPulses = 50;
  state.tiers[0] = { amount: 25, bought: 25 };
  state.maxFlux = 100_000;
  let disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.engineering, false);
  assert.equal(disclosure.research, false);
  assert.equal(disclosure.population, false);
  assert.equal(disclosure.expeditions, false);

  state.missions.awaitingAcknowledgement = true;
  state.lifetimeAxioms = 1;
  disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.settlement, false);
  assert.equal(disclosure.population, false);
  assert.equal(disclosure.research, false);

  state.lifetimeAxioms = 3;
  disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.settlement, true);
  assert.equal(disclosure.population, false);
  assert.equal(disclosure.research, false);

  state.missions.currentIndex = 1;
  state.settlement.currentWorldId = "pelagos";
  disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.engineering, true);
  assert.equal(disclosure.population, false);
  assert.equal(disclosure.research, false);

  state.survivors.beaconOnline = true;
  disclosure = getProgressiveDisclosure(state);
  assert.equal(disclosure.population, false);
});

test("Pelagos keeps Personnel hidden until the first rescued witnesses arrive", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.missions.currentIndex = 1;
  state.missions.statuses = ["saved", "active", "locked", "locked", "locked", "locked"];
  state.settlement.completedWorldIds = ["cold-wake"];
  state.settlement.currentWorldId = "pelagos";
  assert.equal(state.survivors.beaconOnline, false);
  assert.equal(state.survivors.survivors.length, 0);
  assert.equal(getProgressiveDisclosure(state).population, false);
  state.survivors.survivors = [{ id: "first-witness" } as never];
  assert.equal(getProgressiveDisclosure(state).population, true);
  state.settings.personnelIntroduced = true;
  state.survivors.signalsResolved = 1;
  assert.equal(getProgressiveDisclosure(state).research, false);
  state.survivors.signalsResolved = 2;
  assert.equal(getProgressiveDisclosure(state).research, false, "a crew context still needs at least two people");
  state.survivors.survivors.push({ id: "second-witness" } as never);
  assert.equal(getProgressiveDisclosure(state).research, true);
});

test("Cold Wake priorities route Foundry, Ark commissioning, and departure exactly", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.lifetimeAxioms = 3;
  state.settings.coldWakeForecastReviewed = true;

  state.missions.stageIndex = COLD_WAKE_FOUNDRY_STAGE;
  let priority = getCommandPriorities(state).find((entry) => entry.id === "active-directive");
  assert.equal(priority?.target, "engineering");
  assert.equal(priority?.panel, "machines");

  state.missions.stageIndex = COLD_WAKE_NAVIGATION_STAGE;
  priority = getCommandPriorities(state).find((entry) => entry.id === "active-directive");
  assert.equal(priority?.target, "deck");

  state.missions.stageIndex = COLD_WAKE_LIFE_SUPPORT_STAGE;
  priority = getCommandPriorities(state).find((entry) => entry.id === "active-directive");
  assert.equal(priority?.target, "deck");

  state.missions.stageIndex = COLD_WAKE_DEPARTURE_STAGE;
  priority = getCommandPriorities(state).find((entry) => entry.id === "active-directive");
  assert.equal(priority?.target, "settlement");
});

test("Cold Wake law proofs route back to the visible Law Press", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.missions.stageIndex = 3;
  state.tiers[0] = { amount: 50, bought: 50 };
  const priority = getCommandPriorities(state).find((entry) => entry.id === "active-directive");
  assert.equal(priority?.target, "deck");
  assert.equal(priority?.actionLabel, "Charge the Law Press");
  assert.match(priority?.detail ?? "", /hull remains one object/);
});

test("transit replaces the destination directive with an offline Navigation priority", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.missions.currentIndex = 2;
  state.settlement.currentWorldId = null;
  state.transit = beginTransit(
    state.transit,
    "pelagos",
    "viridia",
    4,
    false,
    0,
  );

  const priorities = getCommandPriorities(state);
  const transit = priorities.find((entry) => entry.id === "active-transit");
  assert.ok(transit);
  assert.equal(transit.target, "settlement");
  assert.equal(transit.cadence, "automatic");
  assert.equal(
    priorities.some((entry) => entry.id === "active-directive"),
    false,
  );
  assert.equal(isThreatOperationsActivated(state), true);
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
  state.survivors.beaconOnline = true;
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
