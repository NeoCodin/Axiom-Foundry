import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialState,
  getCurrentViabilityForecast,
  getExpeditionLaunchQuote,
  setTutorialComplete,
  simulateGame,
  startExpedition,
} from "../app/game-engine.ts";
import { sanitizeSurvivorSystemState } from "../app/survivor-engine.ts";
import {
  getExpeditionSite,
  sanitizeExpeditionState,
} from "../app/expedition-engine.ts";

function cinderStateWithCrew() {
  const state = setTutorialComplete(createInitialState(0), true);
  state.settlement.completedWorldIds = ["cold-wake", "pelagos", "viridia"];
  state.settlement.currentWorldId = "cinder";
  state.missions.currentIndex = 3;
  state.survivors = sanitizeSurvivorSystemState({
    schema: 3,
    berthSections: 10,
    lifeSupport: { atmosphere: 90, water: 90, nutrition: 90, medical: 90 },
    survivors: Array.from({ length: 4 }, (_, index) => ({
      id: `scout-${index + 1}`,
      name: `Scout ${index + 1}`,
      role: "navigator",
      backgroundId: "storm-pilot",
      aptitudes: { navigator: 5, security: 4 },
      skillXp: { navigator: 120 * 9 + 5, security: 120 * 9 + 5 },
      assignedRole: "navigator",
      traits: ["signal-ear"],
    })),
  });
  state.flux = 1e12;
  return state;
}

test("surveys gate departure and expeditions credit them on completion", () => {
  const state = cinderStateWithCrew();
  const forecast = getCurrentViabilityForecast(state);
  const surveyLine = forecast?.lines.find((line) => line.kind === "survey");
  assert.ok(surveyLine, "cinder requires surveys");
  assert.equal(surveyLine!.requiredValue, 2);
  assert.equal(surveyLine!.met, false);

  const quote = getExpeditionLaunchQuote(state, "planetary-survey", [
    "scout-1",
    "scout-2",
    "scout-3",
  ]);
  assert.equal(quote.canLaunch, true);
  const launched = startExpedition(state, "planetary-survey", [
    "scout-1",
    "scout-2",
    "scout-3",
  ]);
  assert.notEqual(launched, state);
  assert.ok(launched.flux < state.flux);
  assert.ok(launched.expeditions.active);

  // deployed crew are unavailable and cannot double-launch
  const second = getExpeditionLaunchQuote(launched, "planetary-survey", [
    "scout-1",
    "scout-4",
  ]);
  assert.equal(second.canLaunch, false);

  // the expedition resolves offline and credits the survey
  const done = simulateGame(launched, 2 * 3_600, 240, false);
  assert.equal(done.expeditions.active, null);
  assert.equal(done.worldProgress.surveysCompleted, 1);
  assert.ok(done.expeditions.log.length === 1);
  assert.equal(done.expeditions.log[0]!.outcome, "success");
  assert.ok(done.living.salvage > launched.living.salvage);
  // crew earned expedition XP in their profession
  assert.ok(
    done.survivors.survivors[0]!.skillXp.navigator >
      launched.survivors.survivors[0]!.skillXp.navigator,
  );
});

test("weak crews return lean but always return; sanitize repairs the state", () => {
  const state = cinderStateWithCrew();
  // strip skills so the group is weak
  state.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(state.survivors)),
    survivors: state.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      skillXp: { navigator: 25 },
    })),
  });
  const launched = startExpedition(state, "planetary-survey", [
    "scout-1",
    "scout-2",
  ]);
  const done = simulateGame(launched, 3 * 3_600, 240, false);
  assert.equal(done.expeditions.log[0]!.outcome, "lean");
  assert.equal(done.survivors.survivors.length, 4, "everyone came home");
  assert.equal(done.worldProgress.surveysCompleted, 1, "lean surveys still count");

  const repaired = sanitizeExpeditionState({
    clockSeconds: -4,
    active: { siteId: "kestrel-relay", crewIds: ["a", "b"], durationSeconds: 1e12, strength: -5 },
    completedSiteIds: ["lantern-null-bloom", "not-a-site"],
    log: ["junk"],
    stats: { launched: -2 },
  });
  assert.equal(repaired.clockSeconds, 0);
  assert.ok(repaired.active);
  assert.deepEqual(repaired.completedSiteIds, ["lantern-null-bloom"]);
  assert.equal(repaired.log.length, 0);
  assert.equal(getExpeditionSite("kestrel-relay").repeatable, false);
});
