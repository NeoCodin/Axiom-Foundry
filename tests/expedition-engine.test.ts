import assert from "node:assert/strict";
import test from "node:test";

import {
  craftArmoryItem,
  createInitialState,
  getCampaignCrewSummaries,
  getCurrentViabilityForecast,
  getExpeditionLaunchQuote,
  repairArmoryItem,
  setTutorialComplete,
  simulateGame,
  startExpedition,
} from "../app/game-engine.ts";
import {
  assignSurvivorToRole,
  sanitizeSurvivorSystemState,
  startSurvivorTraining,
} from "../app/survivor-engine.ts";
import {
  getArmoryDamagedCount,
  getArmoryReadyCount,
} from "../app/armory-engine.ts";
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
  // strip skills so the group is weak but inside the lean band (3 vs 10)
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
    "scout-3",
  ]);
  const done = simulateGame(launched, 3 * 3_600, 240, false);
  assert.equal(done.expeditions.log[0]!.outcome, "lean");
  assert.equal(done.survivors.survivors.length, 4, "everyone came home");
  assert.equal(done.worldProgress.surveysCompleted, 1, "lean surveys still count");
  assert.ok(
    done.survivors.survivors.every((survivor) => survivor.health === 100),
    "lean returns never wound anyone",
  );

  const repaired = sanitizeExpeditionState({
    clockSeconds: -4,
    active: { siteId: "kestrel-relay", crewIds: ["a", "b"], durationSeconds: 1e12, strength: -5 },
    completedSiteIds: ["lantern-null-bloom", "not-a-site"],
    log: ["junk"],
    stats: { launched: -2 },
  });
  assert.equal(repaired.clockSeconds, 0);
  assert.ok(repaired.active);
  assert.deepEqual(repaired.active!.loadout, []);
  assert.deepEqual(repaired.completedSiteIds, ["lantern-null-bloom"]);
  assert.equal(repaired.log.length, 0);
  assert.equal(getExpeditionSite("kestrel-relay").repeatable, false);
});

test("setbacks wound the crew, block them while recovering, and heal back", () => {
  const state = cinderStateWithCrew();
  state.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(state.survivors)),
    survivors: state.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      skillXp: { navigator: 25 },
    })),
  });
  // two level-1 crew vs difficulty 10: margin -8 projects a setback
  const quote = getExpeditionLaunchQuote(state, "planetary-survey", [
    "scout-1",
    "scout-2",
  ]);
  assert.equal(quote.projectedOutcome, "setback", "risk is projected before launch");
  const launched = startExpedition(state, "planetary-survey", ["scout-1", "scout-2"]);
  const done = simulateGame(launched, 3 * 3_600, 240, false);
  const entry = done.expeditions.log[0]!;
  assert.equal(entry.outcome, "setback");
  assert.equal(entry.wounds.length, 2);
  assert.ok(
    entry.wounds.every((wound) => wound.damage >= 30 && wound.damage <= 70),
    "unarmored setback damage rolls 30-70",
  );
  assert.equal(done.survivors.survivors.length, 4, "setback crews still come home");
  for (const crewId of ["scout-1", "scout-2"]) {
    const survivor = done.survivors.survivors.find((candidate) => candidate.id === crewId)!;
    assert.ok(survivor.health < 95, `${crewId} came home hurt`);
  }

  // wounded crew (below 40) cannot deploy, train, work, or found
  const hurt = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(done.survivors)),
    survivors: done.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      health: survivor.id === "scout-1" || survivor.id === "scout-2" ? 20 : survivor.health,
    })),
  });
  assert.equal(hurt.survivors.find((survivor) => survivor.id === "scout-1")!.health, 20);
  const hurtState = { ...done, survivors: hurt };
  const requote = getExpeditionLaunchQuote(hurtState, "planetary-survey", ["scout-1", "scout-2"]);
  assert.equal(requote.canLaunch, false);
  assert.equal(requote.reason, "crew-wounded");
  assert.equal(startSurvivorTraining(hurt, "scout-1", "doctor"), hurt);
  assert.equal(assignSurvivorToRole(hurt, "scout-1", "navigator"), hurt);
  const summaries = getCampaignCrewSummaries(hurtState);
  assert.equal(summaries.find((summary) => summary.id === "scout-1")!.canSettle, false);

  // recovery runs offline-equivalently (in capped sessions) and never
  // overshoots the cap
  let healed = done;
  for (let session = 0; session < 10; session += 1) {
    healed = simulateGame(healed, 6 * 3_600, 240, false);
  }
  assert.ok(
    healed.survivors.survivors.every((survivor) => survivor.health === 100),
    "everyone heals back to full with zero input",
  );
});

test("weapons and armor are research-gated, add strength, and armor breaks absorbing hits", () => {
  const state = cinderStateWithCrew();
  // crafting is blocked until the research completes
  assert.equal(craftArmoryItem(state, "kinetic-pike"), state);
  state.research.completedProjectIds = [
    ...state.research.completedProjectIds,
    "expedition-armaments",
    "composite-plating",
  ];
  state.researchStock["engineering-models"] = 1_000;
  let armed = craftArmoryItem(state, "kinetic-pike");
  assert.notEqual(armed, state);
  assert.ok(armed.flux < state.flux);
  armed = craftArmoryItem(armed, "kinetic-pike");
  armed = craftArmoryItem(armed, "composite-weave");
  armed = craftArmoryItem(armed, "composite-weave");
  assert.equal(getArmoryReadyCount(armed.armory, "kinetic-pike"), 2);
  assert.equal(getArmoryReadyCount(armed.armory, "composite-weave"), 2);

  // gear adds strength (level 9 navigators wield pikes: +2 each)
  const bare = getExpeditionLaunchQuote(state, "planetary-survey", ["scout-1", "scout-2"]);
  const geared = getExpeditionLaunchQuote(armed, "planetary-survey", ["scout-1", "scout-2"]);
  assert.equal(geared.gearStrength, 4);
  assert.equal(geared.strength, bare.strength + 4);
  assert.equal(geared.loadout.filter((entry) => entry.armorId).length, 2);

  // force a setback with weak crew wearing armor: damage halves, armor breaks
  const weak = cinderStateWithCrew();
  weak.research.completedProjectIds = [
    ...weak.research.completedProjectIds,
    "composite-plating",
  ];
  weak.researchStock["engineering-models"] = 1_000;
  weak.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(weak.survivors)),
    survivors: weak.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      skillXp: { navigator: 25 },
    })),
  });
  let protectedState = craftArmoryItem(weak, "composite-weave");
  protectedState = craftArmoryItem(protectedState, "composite-weave");
  const launched = startExpedition(protectedState, "planetary-survey", ["scout-1", "scout-2"]);
  assert.equal(getArmoryReadyCount(launched.armory, "composite-weave"), 0, "armor is checked out");
  const done = simulateGame(launched, 3 * 3_600, 240, false);
  const entry = done.expeditions.log[0]!;
  assert.equal(entry.outcome, "setback");
  assert.ok(
    entry.wounds.every((wound) => wound.armorId === "composite-weave" && wound.damage <= 35),
    "composite weave halves the 30-70 roll",
  );
  assert.ok(
    done.survivors.survivors.every((survivor) => survivor.health >= 65),
    "armored setbacks leave crew above the wounded line",
  );
  assert.equal(getArmoryReadyCount(done.armory, "composite-weave"), 0);
  assert.equal(getArmoryDamagedCount(done.armory, "composite-weave"), 2, "weave breaks after one hit");
  const repairedOnce = repairArmoryItem(done, "composite-weave");
  assert.equal(getArmoryDamagedCount(repairedOnce.armory, "composite-weave"), 1);
  assert.equal(getArmoryReadyCount(repairedOnce.armory, "composite-weave"), 1);
});
