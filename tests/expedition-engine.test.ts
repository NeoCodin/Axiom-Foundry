import assert from "node:assert/strict";
import test from "node:test";

import {
  abandonStrandedCrew,
  admitCrewToMedBay,
  beginArmoryUpgrade,
  craftArmoryItem,
  createInitialState,
  getCampaignCrewSummaries,
  getArmoryLawQuote,
  getArmoryModificationQuote,
  getArmoryUpgradeQuote,
  getCurrentViabilityForecast,
  getExpeditionLaunchQuote,
  getProstheticSurgeryQuote,
  getRescueMissionQuote,
  getSurfaceRecon,
  performProstheticSurgery,
  installArmoryModification,
  purchaseArmoryLaw,
  repairArmoryItem,
  setTutorialComplete,
  simulateGame,
  startExpedition,
  startRescueMission,
} from "../app/game-engine.ts";
import {
  assignSurvivorToRole,
  getSurvivorHealthCap,
  sanitizeSurvivorSystemState,
  startSurvivorTraining,
} from "../app/survivor-engine.ts";
import {
  getEffectiveArmoryDurability,
  getEffectiveWeaponStrength,
  getArmoryDamagedCount,
  getArmoryReadyCount,
  sanitizeArmoryState,
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
    schema: 4,
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
  // Surface Recon: the successful mission charts the world and cuts scans
  assert.equal(done.worldProgress.expeditionsCompleted, 1);
  assert.equal(getSurfaceRecon(done).multiplier, 0.9);
  assert.equal(getSurfaceRecon({ ...done, worldProgress: { ...done.worldProgress, expeditionsCompleted: 20 } }).multiplier, 1 / 3);
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

test("Armory Mark projects are costly, offline-safe, bounded upgrades", () => {
  const state = cinderStateWithCrew();
  state.research.completedProjectIds = [
    ...state.research.completedProjectIds,
    "expedition-armaments",
    "arc-discharge-weapons",
    "composite-plating",
    "reactive-shell",
  ];
  state.researchStock["engineering-models"] = 100_000;
  state.researchStock.schematics = 100_000;
  state.researchStock["null-traces"] = 100_000;
  state.living.salvage = 100_000;
  let equipped = craftArmoryItem(state, "kinetic-pike");
  equipped = craftArmoryItem(equipped, "composite-weave");

  const weaponQuote = getArmoryUpgradeQuote(equipped, "kinetic-pike");
  assert.equal(weaponQuote.targetMark, 2);
  assert.equal(weaponQuote.canStart, true);
  const upgrading = beginArmoryUpgrade(equipped, "kinetic-pike");
  assert.ok(upgrading.armory.activeProject);
  assert.ok(upgrading.flux < equipped.flux);
  assert.ok(upgrading.living.salvage < equipped.living.salvage);
  assert.equal(
    getArmoryUpgradeQuote(upgrading, "composite-weave").reason,
    "project",
    "only one deliberate Armory project runs at once",
  );

  const finished = simulateGame(
    upgrading,
    weaponQuote.durationSeconds + 1,
    240,
    false,
  );
  assert.equal(finished.armory.activeProject, null);
  assert.equal(finished.armory.marks["kinetic-pike"], 2);
  assert.equal(getArmoryReadyCount(finished.armory, "kinetic-pike"), 1);
  assert.equal(getEffectiveWeaponStrength(finished.armory, "kinetic-pike"), 3);

  const armorQuote = getArmoryUpgradeQuote(finished, "composite-weave");
  const armorDone = simulateGame(
    beginArmoryUpgrade(finished, "composite-weave"),
    armorQuote.durationSeconds + 1,
    240,
    false,
  );
  assert.equal(armorDone.armory.marks["composite-weave"], 2);
  assert.equal(getEffectiveArmoryDurability(armorDone.armory, "composite-weave"), 2);
});

test("specializations create visible tradeoffs and Axiom laws stay hard-gated", () => {
  const state = cinderStateWithCrew();
  state.research.completedProjectIds = [
    ...state.research.completedProjectIds,
    "expedition-armaments",
    "arc-discharge-weapons",
    "observer-recursion",
  ];
  state.researchStock["engineering-models"] = 10_000;
  state.researchStock.schematics = 10_000;
  state.living.salvage = 10_000;
  let armed = craftArmoryItem(state, "kinetic-pike");
  const sensorQuote = getArmoryModificationQuote(
    armed,
    "kinetic-pike",
    "sensor-link",
  );
  assert.equal(sensorQuote.canInstall, true);
  armed = installArmoryModification(armed, "kinetic-pike", "sensor-link");
  const preview = getExpeditionLaunchQuote(armed, "planetary-survey", [
    "scout-1",
    "scout-2",
  ]);
  assert.equal(preview.loadout.some((entry) => entry.weaponModification === "sensor-link"), true);

  assert.equal(getArmoryLawQuote(armed, "recursive-forging").canBuy, false);
  armed.axioms = 20;
  assert.equal(
    getArmoryLawQuote(armed, "recursive-forging").canBuy,
    false,
    "Axioms cannot bypass the research proof",
  );
  armed.research.completedProjectIds.push("recursive-manufacturing");
  const lawCost = getArmoryLawQuote(armed, "recursive-forging").cost;
  const lawful = purchaseArmoryLaw(armed, "recursive-forging");
  assert.equal(lawful.armory.laws["recursive-forging"], 1);
  assert.equal(lawful.axioms, 20 - lawCost);
  assert.ok(
    getArmoryUpgradeQuote(lawful, "kinetic-pike").durationSeconds <
      getArmoryUpgradeQuote(armed, "kinetic-pike").durationSeconds,
  );
});

test("legacy Armory saves migrate into Mark I standardized frames", () => {
  const migrated = sanitizeArmoryState({
    schema: 1,
    stock: { "kinetic-pike": [0, 3], "composite-weave": [1, 2] },
  });
  assert.equal(migrated.schema, 2);
  assert.equal(migrated.marks["kinetic-pike"], 1);
  assert.equal(getArmoryReadyCount(migrated, "kinetic-pike"), 3);
  assert.equal(migrated.modifications["kinetic-pike"], null);
  assert.equal(migrated.activeProject, null);
});

test("distress strands the party stable forever; rescue brings everyone home", () => {
  const state = cinderStateWithCrew();
  // two level-1 crew vs Palimpsest-difficulty sites would distress; use
  // kestrel-relay with a doctored difficulty via strength math instead:
  // 2 crew at level 1 = strength 2 vs difficulty 20 site is only available
  // post-campaign, so drive distress through the lantern site at Nox.
  state.missions.currentIndex = 4;
  state.settlement.completedWorldIds = ["cold-wake", "pelagos", "viridia", "cinder"];
  state.settlement.currentWorldId = "nox";
  state.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(state.survivors)),
    survivors: state.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      skillXp: { navigator: 25 },
    })),
  });
  // strength 2 vs lantern difficulty 16: margin -14 is a setback, not
  // distress; drop to the null-sounding at 14? -12. Distress needs <= -16,
  // so use palimpsest via campaign-complete state.
  state.settlement.currentWorldId = null as never;
  state.settlement.completedWorldIds = [
    "cold-wake", "pelagos", "viridia", "cinder", "nox", "vesper",
  ] as never;
  state.missions.currentIndex = 5;

  state.flux = 1e18;
  const quote = getExpeditionLaunchQuote(state, "palimpsest-origin", ["scout-1", "scout-2"]);
  assert.equal(quote.projectedOutcome, "distress", "stranding is projected before launch");
  assert.equal(quote.canLaunch, true);
  const launched = startExpedition(state, "palimpsest-origin", ["scout-1", "scout-2"]);
  assert.ok(launched.expeditions.active);
  const done = simulateGame(launched, 8 * 3_600, 240, false);
  assert.equal(done.expeditions.log.at(-1)!.outcome, "distress");
  assert.ok(done.expeditions.stranded, "the party is stranded, not lost");
  assert.equal(done.expeditions.stranded!.crewIds.length, 2);
  assert.equal(done.survivors.survivors.length, 4, "stranded crew stay on the roster");
  const strandedCrew = done.survivors.survivors.filter((survivor) =>
    done.expeditions.stranded!.crewIds.includes(survivor.id),
  );
  assert.ok(
    strandedCrew.every((survivor) => survivor.health >= 8 && survivor.health <= 20),
    "stranded crew hold at critical health",
  );
  assert.ok(
    strandedCrew.every((survivor) => survivor.injury === "severe"),
    "unarmored distress leaves a severe permanent injury",
  );

  // stranded crew are frozen: no decay AND no recovery while off-ship
  const later = simulateGame(done, 6 * 3_600, 240, false);
  const laterStranded = later.survivors.survivors.filter((survivor) =>
    later.expeditions.stranded!.crewIds.includes(survivor.id),
  );
  assert.deepEqual(
    laterStranded.map((survivor) => survivor.health),
    strandedCrew.map((survivor) => survivor.health),
    "stranded health never changes, online or offline",
  );
  // ...and they are unavailable everywhere
  const summaries = getCampaignCrewSummaries(later);
  for (const id of later.expeditions.stranded!.crewIds) {
    assert.equal(summaries.find((summary) => summary.id === id)!.available, false);
  }

  // a strong rescue extracts everyone cleanly
  const strongRescue = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(later.survivors)),
    survivors: later.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      skillXp:
        survivor.id === "scout-3" || survivor.id === "scout-4"
          ? { navigator: 120 * 81 + 5, security: 120 * 81 + 5 }
          : survivor.skillXp,
    })),
  });
  const readyState = { ...later, survivors: strongRescue };
  const rescueQuote = getRescueMissionQuote(readyState, ["scout-3", "scout-4"]);
  assert.equal(rescueQuote.canLaunch, true);
  assert.equal(rescueQuote.projectedExtraction, "clean");
  const rescueLaunched = startRescueMission(readyState, ["scout-3", "scout-4"]);
  assert.notEqual(rescueLaunched, readyState);
  assert.equal(rescueLaunched.expeditions.active!.kind, "rescue");
  const rescued = simulateGame(rescueLaunched, 6 * 3_600, 240, false);
  assert.equal(rescued.expeditions.stranded, null, "the party is home");
  assert.equal(rescued.expeditions.log.at(-1)!.outcome, "rescue");
  assert.equal(rescued.expeditions.log.at(-1)!.rescuedCrewIds.length, 2);
  assert.ok(
    rescued.survivors.survivors
      .filter((survivor) => survivor.id === "scout-3" || survivor.id === "scout-4")
      .every((survivor) => survivor.health === 100),
    "clean extraction leaves rescuers unharmed",
  );
  // rescued crew resume recovery once aboard
  let healing = rescued;
  for (let session = 0; session < 4; session += 1) {
    healing = simulateGame(healing, 6 * 3_600, 240, false);
  }
  const survivorsBack = healing.survivors.survivors.filter(
    (survivor) => survivor.id === "scout-1" || survivor.id === "scout-2",
  );
  assert.ok(
    survivorsBack.every((survivor) => survivor.health > 20),
    "recovery resumes aboard the Ark",
  );
  assert.ok(
    survivorsBack.every((survivor) => survivor.health <= 40),
    "severe injuries cap health at 40 until repaired",
  );
});

test("abandonment is the only death: explicit, permanent, and memorialized", () => {
  const state = cinderStateWithCrew();
  state.settlement.currentWorldId = null as never;
  state.settlement.completedWorldIds = [
    "cold-wake", "pelagos", "viridia", "cinder", "nox", "vesper",
  ] as never;
  state.missions.currentIndex = 5;
  state.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(state.survivors)),
    survivors: state.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      skillXp: { navigator: 25 },
    })),
  });
  state.flux = 1e18;
  const launched = startExpedition(state, "palimpsest-origin", ["scout-1", "scout-2"]);
  const done = simulateGame(launched, 8 * 3_600, 240, false);
  assert.ok(done.expeditions.stranded);

  // abandoning nothing is a no-op; abandoning the party is permanent
  const abandoned = abandonStrandedCrew(done);
  assert.equal(abandoned.expeditions.stranded, null);
  assert.equal(abandoned.survivors.survivors.length, 2, "the abandoned are gone");
  assert.equal(abandoned.expeditions.memorials.length, 2);
  assert.equal(abandoned.expeditions.stats.abandoned, 2);
  assert.ok(abandoned.expeditions.memorials[0]!.name.startsWith("Scout"));
  assert.equal(abandonStrandedCrew(abandoned), abandoned);

  // memorials survive the save round-trip
  const reloaded = sanitizeExpeditionState(
    JSON.parse(JSON.stringify(abandoned.expeditions)),
  );
  assert.equal(reloaded.memorials.length, 2);
  assert.equal(reloaded.stats.abandoned, 2);
});

test("prosthetic surgery repairs permanent injuries behind research, surgeon, and medical gates", () => {
  const state = cinderStateWithCrew();
  state.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(state.survivors)),
    survivors: state.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      // scout-1 carries a severe injury; scout-2 is a level-9 surgeon
      health: survivor.id === "scout-1" ? 40 : 100,
      injury: survivor.id === "scout-1" ? "severe" : null,
      skillXp:
        survivor.id === "scout-2"
          ? { doctor: 120 * 81 + 5 }
          : JSON.parse(JSON.stringify(survivor.skillXp)),
      role: survivor.id === "scout-2" ? "doctor" : survivor.role,
      assignedRole: survivor.id === "scout-2" ? "doctor" : survivor.assignedRole,
    })),
  });
  state.researchStock["engineering-models"] = 500;
  state.researchStock["biological-samples"] = 500;

  // research gate first
  let quote = getProstheticSurgeryQuote(state, "scout-1");
  assert.equal(quote.canOperate, false);
  assert.equal(quote.reason, "research");
  assert.equal(performProstheticSurgery(state, "scout-1"), state);

  state.research.completedProjectIds = [
    ...state.research.completedProjectIds,
    "prosthetic-fabrication",
  ];
  // surgery happens only in the Medical Bay
  quote = getProstheticSurgeryQuote(state, "scout-1");
  assert.equal(quote.canOperate, false);
  assert.equal(quote.reason, "not-admitted");
  const admittedState = admitCrewToMedBay(state, "scout-1");
  assert.notEqual(admittedState, state);
  quote = getProstheticSurgeryQuote(admittedState, "scout-1");
  assert.equal(quote.canOperate, true);

  // healthy crew have nothing to repair
  assert.equal(getProstheticSurgeryQuote(state, "scout-3").reason, "no-injury");

  const repaired = performProstheticSurgery(admittedState, "scout-1");
  assert.notEqual(repaired, admittedState);
  const patient = repaired.survivors.survivors.find(
    (survivor) => survivor.id === "scout-1",
  )!;
  assert.equal(patient.injury, null, "the injury is repaired");
  assert.equal(patient.health, 50, "surgery stabilizes the patient at 50");
  assert.equal(getSurvivorHealthCap(patient), 100, "the cap is fully restored");
  assert.ok(repaired.flux < admittedState.flux);
  assert.equal(repaired.researchStock["engineering-models"], 470);
  assert.equal(repaired.researchStock["biological-samples"], 480);
  // healed past 80, they can found colonies again
  let recovered = repaired;
  for (let session = 0; session < 6; session += 1) {
    recovered = simulateGame(recovered, 6 * 3_600, 240, false);
  }
  const summaries = getCampaignCrewSummaries(recovered);
  assert.equal(summaries.find((summary) => summary.id === "scout-1")!.canSettle, true);

  // without a level-5 doctor on duty, surgery is blocked (patient admitted)
  const noSurgeon = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(admittedState.survivors)),
    survivors: admittedState.survivors.survivors.map((survivor) => ({
      ...JSON.parse(JSON.stringify(survivor)),
      assignedRole: survivor.id === "scout-2" ? null : survivor.assignedRole,
    })),
  });
  assert.ok(noSurgeon.medBayIds.includes("scout-1"), "admission survives sanitize");
  const noSurgeonQuote = getProstheticSurgeryQuote(
    { ...admittedState, survivors: noSurgeon },
    "scout-1",
  );
  assert.equal(noSurgeonQuote.reason, "surgeon");
});
