import assert from "node:assert/strict";
import test from "node:test";
import {
  MISSIONS,
  RECALIBRATION_THRESHOLD,
  RETIRED_SAVE_KEYS,
  RUN_UPGRADES,
  SAVE_KEY,
  buyTier,
  contributeToMission,
  createInitialState,
  departCurrentWorld,
  getCampaignRelics,
  getCampaignCrewSummaries,
  getCampaignWorldIndex,
  getColonyLegacyEffects,
  fabricateWorldEquipment,
  getArkRescueQuote,
  getBerthConstructionQuote,
  hasQualifiedNullHandler,
  cloneGameState,
  hasRescueDetail,
  performArkRescue,
  getCrisisFluxCost,
  getCrisisReadiness,
  getEquipmentFabricationQuote,
  getCurrentViabilityForecast,
  getDefenseCrewContext,
  getEffectiveCohesion,
  getExpeditionResearchSupport,
  getMedBayStatus,
  getMaxAffordableCount,
  getProductionSnapshot,
  getResearchCrewAvailable,
  getResearchPowerAvailable,
  getResearchFieldValidation,
  getProfileElevationQuote,
  elevateCrewProfile,
  getTierCost,
  isTierUnlocked,
  pulseCore,
  recalibrate,
  sanitizeGameState,
  setTutorialComplete,
  simulateGame,
} from "../app/game-engine.ts";
import { CAMPAIGN_WORLDS } from "../app/campaign-content.ts";
import {
  addResearchInputs,
  advanceResearch,
  createResearchLatticeState,
  getResearchProjectDefinition,
  selectResearchProject,
  setResearchCrew,
  type ResearchProjectId,
} from "../app/research-engine.ts";
import {
  SOS_SCAN_SECONDS_BY_WORLD,
  advanceSurvivorSystem,
  getSurvivorRarity,
  sanitizeSurvivorSystemState,
  type Survivor,
} from "../app/survivor-engine.ts";
import { getArmoryReadyCount } from "../app/armory-engine.ts";
import { beginTransit } from "../app/transit-engine.ts";

function testCrewMember(
  id: string,
  role: Survivor["role"],
  skillXp: Partial<Survivor["skillXp"]> = {},
  traits: Survivor["traits"] = ["calm-presence"],
  assignedRole: Survivor["assignedRole"] = role,
): Survivor {
  const blankSkills: Survivor["skillXp"] = {
    engineer: 0,
    doctor: 0,
    researcher: 0,
    navigator: 0,
    technician: 0,
    fabricator: 0,
    farmer: 0,
    teacher: 0,
    security: 0,
  };
  return {
    id,
    name: id,
    callsign: "",
    origin: "pelagos",
    originSignalId: "test-signal",
    backgroundId: "civic-volunteer",
    role,
    aptitudes: {
      engineer: 1,
      doctor: 1,
      researcher: 1,
      navigator: 1,
      technician: 1,
      fabricator: 1,
      farmer: 1,
      teacher: 1,
      security: 1,
    },
    adaptability: 1,
    traits,
    skillXp: { ...blankSkills, ...skillXp },
    assignedRole,
    serviceSeconds: 0,
    joinedAt: 0,
    storyHookId: null,
    rarityFloor: null,
    profileElevations: [],
    bioadaptations: [],
    assignmentLocked: false,
    preferredRole: assignedRole,
    settlementProtected: false,
    ageGroup: "adult",
    ageProgress: 0,
    health: 100,
    injury: null,
  };
}

test("the campaign reset retires every previous public save key", () => {
  assert.equal(SAVE_KEY, "axiom-foundry-save-v5");
  assert.deepEqual(RETIRED_SAVE_KEYS, [
    "axiom-foundry-save-v1",
    "axiom-foundry-save-v2",
    "axiom-foundry-save-v3",
    "axiom-foundry-save-v4",
  ]);
  assert.equal(
    (RETIRED_SAVE_KEYS as readonly string[]).includes(SAVE_KEY),
    false,
  );
});

test("every planetary crisis exposes a complete data-driven resolution checklist", () => {
  for (const [index, world] of CAMPAIGN_WORLDS.entries()) {
    assert.equal(MISSIONS[index]!.world, world.name);
    for (const researchId of world.requiredResearchIds) {
      assert.ok(
        getResearchProjectDefinition(researchId as ResearchProjectId),
        `${world.name}: ${researchId}`,
      );
    }
    const state = createInitialState(0);
    state.settlement.currentWorldId = world.id;
    state.settlement.completedWorldIds = CAMPAIGN_WORLDS.slice(0, index).map(
      (completedWorld) => completedWorld.id,
    );
    state.missions.currentIndex = index;
    state.missions.stageIndex = 0;
    state.missions.awaitingAcknowledgement = false;
    state.flux = 0;
    const expectedCount =
      MISSIONS[index]!.stages.length +
      world.infrastructure.length +
      world.requiredResearchIds.length +
      1;
    for (const crisisId of world.crisisIds) {
      const readiness = getCrisisReadiness(state, crisisId);
      assert.equal(readiness.requirements.length, expectedCount, world.name);
      assert.equal(
        new Set(readiness.requirements.map((requirement) => requirement.id)).size,
        expectedCount,
        world.name,
      );
      assert.ok(
        readiness.requirements.every(
          (requirement) => requirement.label && requirement.detail,
        ),
        world.name,
      );
      assert.equal(readiness.canResolve, false, world.name);
      assert.ok(Number.isFinite(readiness.cost), world.name);
    }
  }
});

test("Pelagos Brine Sickness names every gate and unlocks only when all are ready", () => {
  const state = createInitialState(0);
  const pelagos = CAMPAIGN_WORLDS.find((world) => world.id === "pelagos")!;
  state.settlement.currentWorldId = "pelagos";
  state.settlement.completedWorldIds = ["cold-wake"];
  state.missions.currentIndex = 1;
  state.missions.stageIndex = 0;
  state.missions.awaitingAcknowledgement = false;

  let readiness = getCrisisReadiness(state, "pelagos-brine-sickness");
  assert.equal(readiness.cost, 500_000);
  for (const label of [
    "Assemble the gravity ferry",
    "Model the returning tide",
    "Tow the oceans home",
    "Restart the tidal grid",
    "Build the purification spine",
    "Seal the highwater habitat",
    "Continuity Index",
    "Adaptive Instruction",
    "Reserve 500.00K Flux",
  ]) {
    assert.ok(
      readiness.requirements.some((requirement) => requirement.label === label),
      label,
    );
  }
  assert.match(readiness.requirements[0]!.detail, /Current objective/);
  assert.match(
    readiness.requirements.find(
      (requirement) => requirement.id === "research:adaptive-instruction",
    )!.detail,
    /Closed-Loop Atmosphere/,
  );

  state.missions.stageIndex = 1;
  readiness = getCrisisReadiness(state, "pelagos-brine-sickness");
  assert.equal(readiness.requirements[0]!.met, true);
  assert.equal(readiness.requirements[1]!.met, false);

  state.missions.awaitingAcknowledgement = true;
  state.worldProgress.completedInfrastructureIds = pelagos.infrastructure.map(
    (objective) => objective.id,
  );
  state.research.completedProjectIds = [
    "continuity-index",
    "adaptive-instruction",
  ];
  state.flux = getCrisisFluxCost(state);
  readiness = getCrisisReadiness(state, "pelagos-brine-sickness");
  assert.equal(readiness.canResolve, true);
  assert.ok(readiness.requirements.every((requirement) => requirement.met));
});

test("manual tuning bootstraps a new cycle", () => {
  let state = createInitialState(0);
  for (let index = 0; index < 10; index += 1) state = pulseCore(state);
  assert.ok(state.flux >= 10);
  const built = buyTier(state, 0, "1");
  assert.equal(built.tiers[0].bought, 1);
  assert.ok(built.flux >= 0);
});

test("an exact-price purchase succeeds without negative Flux", () => {
  const state = createInitialState(0);
  state.maxFlux = 10;
  state.flux = getTierCost(state, 0, 1);
  const next = buyTier(state, 0, "1");
  assert.equal(next.tiers[0].bought, 1);
  assert.ok(Math.abs(next.flux) < 1e-10);
});

test("buy max matches repeated single purchases", () => {
  const maxState = createInitialState(0);
  maxState.flux = 1_000_000;
  maxState.maxFlux = 1_000_000;
  const expectedCount = getMaxAffordableCount(maxState, 0);
  const maxBought = buyTier(maxState, 0, "max");

  let singles = createInitialState(0);
  singles.flux = 1_000_000;
  singles.maxFlux = 1_000_000;
  for (let index = 0; index < expectedCount; index += 1) {
    singles = buyTier(singles, 0, "1");
  }

  assert.equal(maxBought.tiers[0].bought, expectedCount);
  assert.equal(maxBought.tiers[0].bought, singles.tiers[0].bought);
  assert.ok(Math.abs(maxBought.flux - singles.flux) < 1e-6);
});

test("chunked and continuous production agree within simulation tolerance", () => {
  const initial = createInitialState(0);
  initial.tiers[0] = { amount: 10, bought: 10 };
  const continuous = simulateGame(initial, 10, 100);
  let chunked = initial;
  for (let index = 0; index < 100; index += 1) {
    chunked = simulateGame(chunked, 0.1, 1);
  }
  assert.ok(Math.abs(continuous.flux - chunked.flux) < 1e-8);
});

test("recalibration grants the previewed Axiom and retains legacy progress", () => {
  const state = createInitialState(0);
  state.runFlux = RECALIBRATION_THRESHOLD;
  state.maxFlux = RECALIBRATION_THRESHOLD;
  state.legacyUpgrades[0] = 2;
  state.living.foundryName = "The Quiet Argument";
  state.living.rooms[0].level = 3;
  state.living.discoveredLore = ["awakening.cold-wake"];
  const next = recalibrate(state, 1_000);
  assert.equal(next.axioms, 1);
  assert.equal(next.lifetimeAxioms, 1);
  assert.equal(next.cycle, 2);
  assert.equal(next.legacyUpgrades[0], 2);
  assert.equal(next.runFlux, 0);
  assert.equal(next.living.foundryName, "The Quiet Argument");
  assert.equal(next.living.rooms[0].level, 3);
  assert.deepEqual(next.living.discoveredLore, ["awakening.cold-wake"]);
});

test("Profile Elevation preserves a favorite crew member's identity and XP", () => {
  const state = createInitialState(0);
  const favorite = testCrewMember(
    "favorite",
    "researcher",
    { researcher: 500 },
  );
  favorite.callsign = "Lantern";
  state.survivors.survivors = [favorite];
  state.research.completedProjectIds = ["human-potential-mapping"];
  state.axioms = 3;
  state.researchStock["cultural-records"] = 200;

  const quote = getProfileElevationQuote(state, favorite.id);
  assert.equal(quote.targetRarity, "notable");
  assert.equal(quote.canElevate, true);
  const elevated = elevateCrewProfile(state, favorite.id);
  const after = elevated.survivors.survivors[0]!;

  assert.equal(state.survivors.survivors[0]!.rarityFloor, null, "snapshot stays immutable");
  assert.equal(after.name, favorite.name);
  assert.equal(after.callsign, "Lantern");
  assert.equal(after.skillXp.researcher, 500);
  assert.equal(getSurvivorRarity(after).id, "notable");
  assert.equal(after.profileElevations.length, 1);
  assert.equal(elevated.axioms, 2);
});

test("completed lattice research provides modest final economy support", () => {
  const baseline = createInitialState(0);
  baseline.tiers[0] = { amount: 10, bought: 10 };
  const researched = createInitialState(0);
  researched.tiers[0] = { amount: 10, bought: 10 };
  researched.research.completedProjectIds = [
    "auxiliary-power-routing",
    "predictive-fabrication",
  ];
  assert.ok(
    getProductionSnapshot(researched).fluxPerSecond >
      getProductionSnapshot(baseline).fluxPerSecond,
  );
  assert.ok(getTierCost(researched, 0, 1) < getTierCost(baseline, 0, 1));
});

test("completed research visibly supports medicine, defense, expeditions, and field validation", () => {
  const baseline = createInitialState(0);
  const doctor = testCrewMember("doctor", "doctor", { doctor: 500 });
  const patient = testCrewMember("patient", "engineer");
  patient.health = 40;
  baseline.survivors.survivors = [doctor, patient];
  baseline.survivors.medBayIds = [patient.id];
  baseline.research.activeProjectId = "auxiliary-power-routing";
  baseline.survivors.berthSections = 10;

  const baseMedical = getMedBayStatus(baseline);
  const field = getResearchFieldValidation(baseline);
  assert.ok(field.multiplier > 1);
  assert.ok(field.multiplier <= 1.25);

  const researched = cloneGameState(baseline);
  researched.research.completedProjectIds = [
    "clinical-commons",
    "planetary-epidemiology",
    "synthetic-ecosystem-design",
    "defensive-forecasting",
    "temporal-signal-analysis",
    "causal-threat-projection",
    "autonomous-repair-swarms",
    "surface-reconnaissance",
    "specialized-field-loadouts",
  ];
  const researchedMedical = getMedBayStatus(researched);
  assert.ok(researchedMedical.recoveryPerHour > baseMedical.recoveryPerHour);
  assert.ok(
    researchedMedical.diversionPerPatientPercent <
      baseMedical.diversionPerPatientPercent,
  );
  assert.equal(researchedMedical.activeProtocols.length, 3);

  const defense = getDefenseCrewContext(researched);
  assert.equal(defense.researchReadiness, 14);
  assert.equal(defense.researchForecastSeconds, 3_600);
  assert.equal(defense.researchRepairMultiplier, 1.25);

  const expedition = getExpeditionResearchSupport(researched);
  assert.equal(expedition.strengthBonus, 2);
  assert.equal(expedition.rewardMultiplier, 1.15);
});

test("generations, colonies, and logistics feed the Ark's idle support systems", () => {
  const plain = createInitialState(0);
  const firstAdult = testCrewMember("first-adult", "teacher", {}, [], null);
  const secondAdult = testCrewMember("second-adult", "teacher", {}, [], null);
  plain.survivors.survivors = [firstAdult, secondAdult];
  plain.survivors.autoAssignmentEnabled = false;

  const connected = cloneGameState(plain);
  connected.survivors.survivors[0]!.ageGroup = "child";
  connected.survivors.survivors[1]!.ageGroup = "elder";
  connected.settlement.colonies = [{
    worldId: "pelagos",
    name: "Pelagos Test Colony",
    establishedAt: 1,
    viabilityScore: 100,
    founders: [],
    legacyBenefitIds: [],
    transmissionsRead: 0,
  }];
  connected.research.completedProjectIds = [
    "adaptive-instruction",
    "colony-data-integration",
  ];

  const plainAfter = simulateGame(plain, 3_600, 240, false);
  const connectedAfter = simulateGame(connected, 3_600, 240, false);
  assert.ok(
    connectedAfter.researchStock["cultural-records"] >
      plainAfter.researchStock["cultural-records"],
  );

  const logistics = cloneGameState(plain);
  logistics.research.completedProjectIds = ["automated-personnel-logistics"];
  const logisticsAfter = simulateGame(logistics, 3_600, 240, false);
  assert.ok(logisticsAfter.living.salvage > plainAfter.living.salvage);
});

test("malformed saves recover to finite nonnegative state", () => {
  const state = sanitizeGameState({
    flux: Number.NaN,
    maxFlux: -10,
    runFlux: Number.POSITIVE_INFINITY,
    tiers: [{ amount: -5, bought: -2 }],
  }, 100);
  assert.ok(Number.isFinite(state.flux));
  assert.ok(Number.isFinite(state.runFlux));
  assert.ok(state.flux >= 0);
  assert.ok(state.tiers.every((tier) => tier.amount >= 0 && tier.bought >= 0));
});

test("planetary directives do not expose countdown state", () => {
  const initial = createInitialState(0);
  assert.equal("timeLeft" in initial.missions, false);
  assert.equal("timeLimit" in MISSIONS[0], false);
});

test("Cold Wake engineering waits for an explicit continuity departure", () => {
  let state = setTutorialComplete(createInitialState(0), true);
  state.manualPulses = 12;
  state = simulateGame(state, 0.1, 1);
  assert.equal(state.missions.stageIndex, 1);

  state.tiers[0] = { amount: 25, bought: 25 };
  state = simulateGame(state, 0.1, 1);
  assert.equal(state.missions.stageIndex, 2);

  state.flux = 15_000;
  state.maxFlux = 15_000;
  state.runFlux = 15_000;
  state = contributeToMission(state);

  const readyForContinuity = simulateGame(state, 0.1, 1);
  assert.equal(readyForContinuity.missions.statuses[0], "active");
  assert.equal(readyForContinuity.missions.currentIndex, 0);
  assert.equal(readyForContinuity.missions.awaitingAcknowledgement, true);
  assert.equal(readyForContinuity.stellarRelays, 0);
  assert.equal(readyForContinuity.settlement.currentWorldId, "cold-wake");
  assert.ok(readyForContinuity.living.salvage > 35);

  const waiting = simulateGame(readyForContinuity, 120, 10);
  assert.equal(waiting.missions.awaitingAcknowledgement, true);
  assert.equal(waiting.missions.currentIndex, 0);
  assert.equal(waiting.missions.worldsSaved, 0);
  assert.equal(getCampaignWorldIndex(waiting), 0);
});

test("Cold Wake departure requires the full Ark-readiness forecast", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  assert.equal(getCurrentViabilityForecast(state)?.canDepart, false);
  state.missions.awaitingAcknowledgement = true;
  state.research.completedProjectIds = ["closed-loop-atmosphere"];
  state.worldProgress.completedInfrastructureIds = [
    "wake-axiom-chamber",
    "restore-life-support",
    "recover-orbital-control",
  ];
  state.worldProgress.completedResearchIds = ["closed-loop-atmosphere"];
  state.worldProgress.resolvedCrisisIds = ["ark-reactor-desynchronization"];
  state.worldProgress.supplies = { "reserve-power": 12 };

  const departure = departCurrentWorld(state, 1_000);
  assert.equal(departure.ok, true);
  assert.equal(departure.state.settlement.currentWorldId, "pelagos");
  assert.equal(departure.state.missions.statuses[0], "saved");
  assert.equal(departure.state.missions.currentIndex, 1);
  assert.equal(departure.state.survivors.survivors.length, 0);
});

test("campaign work waits during transit and begins only after automatic arrival", () => {
  const state = createInitialState(0);
  state.missions.currentIndex = 2;
  state.missions.statuses = ["saved", "saved", "active", "locked", "locked", "locked"];
  state.missions.worldsSaved = 2;
  state.settlement.completedWorldIds = ["cold-wake", "pelagos"];
  state.settlement.currentWorldId = null;
  state.transit = beginTransit(
    state.transit,
    "pelagos",
    "viridia",
    0,
    false,
    1_000,
  );
  const total = state.transit.active!.totalSeconds;

  const halfway = simulateGame(state, total / 2, 10);
  assert.equal(halfway.settlement.currentWorldId, null);
  assert.ok(halfway.transit.active);
  assert.equal(halfway.missions.stageIndex, 0);

  const arrived = simulateGame(halfway, total / 2 + 1, 10);
  assert.equal(arrived.transit.active, null);
  assert.equal(arrived.settlement.currentWorldId, "viridia");
});

test("unfinished planetary directives remain active indefinitely", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.flux = 42;
  state.maxFlux = 42;
  const muchLater = simulateGame(state, 48 * 60 * 60, 10);
  assert.equal(muchLater.missions.statuses[0], "active");
  assert.equal(muchLater.missions.currentIndex, 0);
  assert.equal("worldsLost" in muchLater.missions, false);
  assert.equal(muchLater.flux, 42);
  assert.equal(muchLater.cycle, 1);
  assert.equal(muchLater.stellarRelays, 0);
  assert.equal(getCampaignWorldIndex(muchLater), 0);
});

test("milestone efficiency grows linearly at 25-purchase breakpoints", () => {
  // per-machine efficiency = output / bought isolates the milestone bonus
  const perMachine = [24, 25, 50, 100].map((bought) => {
    const state = createInitialState(0);
    state.tiers[0] = { amount: bought, bought };
    return getProductionSnapshot(state).tierOutputs[0] / bought;
  });
  assert.ok(Math.abs(perMachine[1] / perMachine[0] - 1.5) < 1e-10);
  assert.ok(Math.abs(perMachine[2] / perMachine[0] - 2) < 1e-10);
  assert.ok(Math.abs(perMachine[3] / perMachine[0] - 3) < 1e-10);
});

test("planet blueprints gate upper tiers even when an old save has huge Flux", () => {
  const state = createInitialState(0);
  state.flux = 1e30;
  state.maxFlux = 1e30;
  assert.equal(isTierUnlocked(state, 0), true);
  assert.equal(isTierUnlocked(state, 1), false);
  state.missions.currentIndex = 1;
  state.missions.statuses[0] = "saved";
  state.missions.statuses[1] = "active";
  assert.equal(isTierUnlocked(state, 1), true);
});

test("Flow and Resonance multiply Flux output evenly - never compounding", () => {
  const state = createInitialState(0);
  state.missions.currentIndex = 1;
  state.missions.statuses = ["saved", "active", "locked", "locked", "locked", "locked"];
  state.tiers[0] = { amount: 15, bought: 15 };
  state.tiers[1] = { amount: 15, bought: 15 };
  const base = getProductionSnapshot(state);
  assert.equal(
    base.fluxPerSecond,
    base.tierOutputs[0] + base.tierOutputs[1],
    "total Flux is the plain sum of what was bought",
  );

  // Flow scales every tier's Flux by the same factor - a flat multiplier,
  // not a feedback loop
  state.runUpgrades[1] = 1;
  const flow = getProductionSnapshot(state);
  const flowRatio = flow.tierOutputs[0] / base.tierOutputs[0];
  assert.ok(flowRatio > 1);
  assert.ok(
    Math.abs(flow.tierOutputs[1] / base.tierOutputs[1] - flowRatio) < 1e-10,
  );

  // Resonance links likewise scale output without touching machine counts
  state.runUpgrades[1] = 0;
  state.tiers[1].bought = 14;
  const noLink = getProductionSnapshot(state);
  state.tiers[1].bought = 15;
  const linked = getProductionSnapshot(state);
  assert.ok(linked.resonance.multiplier > noLink.resonance.multiplier);
  assert.ok(
    linked.tierOutputs[0] / noLink.tierOutputs[0] >
      linked.resonance.multiplier / noLink.resonance.multiplier - 1e-10,
  );
});

test("Harmonic Gearing is distributed across the chain exactly once", () => {
  const state = createInitialState(0);
  state.missions.currentIndex = 5;
  state.missions.statuses = ["saved", "saved", "saved", "saved", "saved", "active"];
  state.runUpgrades[2] = RUN_UPGRADES[2].maxLevel;
  const production = getProductionSnapshot(state);
  const compoundedAcrossEdges = Math.pow(
    production.edgeGearing,
    state.tiers.length - 1,
  );
  assert.ok(
    Math.abs(compoundedAcrossEdges - production.higherTierMultiplier) < 1e-10,
  );
});

test("v2 saves enter the expanded campaign without replaying old Flux progress", () => {
  const migrated = sanitizeGameState({
    version: 2,
    flux: 1e20,
    maxFlux: 1e20,
    runFlux: 1e20,
    axioms: 7,
    lifetimeAxioms: 9,
    stellarRelays: 6,
    missions: {
      currentIndex: 6,
      statuses: MISSIONS.map(() => "saved"),
    },
  }, 100);
  assert.equal(migrated.version, 12);
  assert.equal(migrated.missions.currentIndex, 0);
  assert.equal(migrated.missions.stageIndex, 0);
  assert.equal(migrated.missions.worldsSaved, 0);
  assert.equal(migrated.axioms, 7);
  assert.equal(migrated.lifetimeAxioms, 9);
  assert.equal(migrated.missions.baseline.manualPulses, migrated.manualPulses);
});

test("v3 timed saves recover lost worlds under the untimed campaign", () => {
  const migrated = sanitizeGameState({
    version: 3,
    axioms: 2,
    lifetimeAxioms: 3,
    stellarRelays: 1,
    missions: {
      schema: 2,
      currentIndex: 3,
      stageIndex: 0,
      timeLeft: 0,
      statuses: ["saved", "lost", "lost", "locked", "locked", "locked"],
      awaitingAcknowledgement: true,
    },
  }, 100);

  assert.equal(migrated.version, 12);
  assert.equal(migrated.missions.schema, 3);
  assert.deepEqual(migrated.missions.statuses.slice(0, 4), [
    "saved",
    "saved",
    "saved",
    "locked",
  ]);
  assert.equal(migrated.missions.worldsSaved, 3);
  assert.equal(migrated.stellarRelays, 3);
  assert.equal("timeLeft" in migrated.missions, false);
  assert.equal("worldsLost" in migrated.missions, false);
  assert.ok(getCampaignRelics(migrated).phaseCoilMultiplier > 1);
  assert.ok(getCampaignRelics(migrated).resonanceBonus > 0);

});

test("a timed Vesper loss restores its final Axiom exactly once", () => {
  const migrated = sanitizeGameState({
    version: 3,
    axioms: 2,
    lifetimeAxioms: 3,
    stellarRelays: 5,
    missions: {
      schema: 2,
      currentIndex: MISSIONS.length,
      statuses: ["saved", "saved", "saved", "saved", "saved", "lost"],
    },
  }, 100);

  assert.equal(migrated.missions.worldsSaved, MISSIONS.length);
  assert.equal(migrated.stellarRelays, MISSIONS.length);
  assert.equal(migrated.axioms, 3);
  assert.equal(migrated.lifetimeAxioms, 4);

  const reloaded = sanitizeGameState(migrated, 200);
  assert.equal(reloaded.axioms, 3);
  assert.equal(reloaded.lifetimeAxioms, 4);
});

test("idle time cannot silently skip the continuity campaign", () => {
  let state = setTutorialComplete(createInitialState(0), true);
  state.manualPulses = 12;
  state = simulateGame(state, 0.1, 1);
  state.tiers[0] = { amount: 25, bought: 25 };
  state = simulateGame(state, 0.1, 1);
  state.flux = 15_000;
  state.maxFlux = 15_000;
  state.runFlux = 15_000;
  state = contributeToMission(state);
  state = simulateGame(state, 0.1, 1);
  assert.equal(state.missions.awaitingAcknowledgement, true);

  const fourHoursLater = simulateGame(state, 4 * 3_600, 120);
  assert.equal(fourHoursLater.missions.currentIndex, 0);
  assert.equal(fourHoursLater.missions.worldsSaved, 0);
  assert.equal(fourHoursLater.settlement.currentWorldId, "cold-wake");
  assert.equal(fourHoursLater.survivors.survivors.length, 0);
  assert.ok(fourHoursLater.playTime >= 4 * 3_600);
});

test("continuity crisis costs follow the deliberately flatter six-world scale", () => {
  const expectedCosts = [
    5_000,
    500_000,
    30_000_000,
    1_800_000_000,
    108_000_000_000,
    6_480_000_000_000,
  ];

  assert.deepEqual(
    expectedCosts.map((_, completedWorlds) => {
      const state = createInitialState(0);
      state.settlement.completedWorldIds = CAMPAIGN_WORLDS.slice(
        0,
        completedWorlds,
      ).map((world) => world.id);
      return getCrisisFluxCost(state);
    }),
    expectedCosts,
  );
});

test("campaign summaries expose level-one Leadership and cross-training", () => {
  const state = createInitialState(0);
  state.survivors.survivors = [
    testCrewMember("security-one", "security"),
    testCrewMember("navigator-one", "navigator"),
    testCrewMember(
      "cross-trained",
      "civilian",
      { doctor: 1, researcher: 120 },
      ["adaptable"],
      "doctor",
    ),
  ];

  const summaries = getCampaignCrewSummaries(state);
  assert.equal(
    summaries.find((member) => member.id === "security-one")?.expertise
      .leadership,
    1,
  );
  assert.equal(
    summaries.find((member) => member.id === "navigator-one")?.expertise
      .leadership,
    1,
  );
  assert.deepEqual(
    summaries.find((member) => member.id === "cross-trained")?.roles,
    ["civilian", "doctor", "researcher"],
  );
});

test("every Researcher contributes Null Studies and Null Dreamers add a bonus", () => {
  const state = createInitialState(0);
  state.survivors.survivors = [
    testCrewMember("ordinary-researcher", "researcher"),
    testCrewMember("null-dreamer", "researcher", {}, ["null-dreamer"]),
  ];

  const summaries = getCampaignCrewSummaries(state);
  const ordinary = summaries.find(
    (member) => member.id === "ordinary-researcher",
  )!;
  const dreamer = summaries.find((member) => member.id === "null-dreamer")!;
  assert.equal(ordinary.expertise.research, 1);
  assert.equal(ordinary.expertise["null-studies"], 1);
  assert.equal(dreamer.expertise.research, 1);
  assert.equal(dreamer.expertise["null-studies"], 2);
});

test("simulateGame applies completed-project research speed exactly once", () => {
  const state = createInitialState(0);
  let research = createResearchLatticeState();
  research.completedProjectIds = ["ark-drive-coupling"];
  research = addResearchInputs(research, { "calibration-data": 100 });
  research = setResearchCrew(research, 1, 1);
  research = selectResearchProject(research, "auxiliary-power-routing");
  state.research = research;

  const elapsedSeconds = 10;
  const expected = advanceResearch(research, elapsedSeconds, {
    powerAvailable: getResearchPowerAvailable(state),
    crewAvailable: getResearchCrewAvailable(state),
    externalSpeedMultiplier: 1,
  });
  const simulated = simulateGame(state, elapsedSeconds, 1, false);

  assert.ok(expected.progressedWork > 0);
  assert.ok(
    Math.abs(
      (simulated.research.progress["auxiliary-power-routing"] ?? 0) -
        expected.progressedWork,
    ) < 1e-10,
  );
});

test("colony legacies drive their named systems, prices, and effective cohesion", () => {
  const baseline = createInitialState(0);
  baseline.tiers[0] = { amount: 10, bought: 10 };
  baseline.living.cohesion = 64;
  const state = createInitialState(0);
  state.tiers[0] = { amount: 10, bought: 10 };
  state.living.cohesion = 64;
  state.settlement.colonies = [
    ["pelagos", "pelagos-signal-net"],
    ["viridia", "viridia-mentor-seeds"],
    ["cinder", "cinder-pattern-library"],
    ["nox", "nox-open-archive"],
    ["vesper", "vesper-common-testimony", "vesper-null-index"],
  ].map(([worldId, ...legacyBenefitIds], index) => ({
    worldId: worldId as (typeof CAMPAIGN_WORLDS)[number]["id"],
    name: `Test Colony ${index + 1}`,
    establishedAt: index,
    viabilityScore: 100,
    founders: [],
    legacyBenefitIds,
    transmissionsRead: 0,
  }));

  const effects = getColonyLegacyEffects(state);
  assert.equal(effects.beaconSpeedMultiplier, 1.05);
  assert.equal(effects.trainingSpeedMultiplier, 1.06);
  assert.ok(Math.abs(effects.fabricationCostMultiplier - 0.93) < 1e-12);
  assert.equal(effects.researchSpeedMultiplier, 1.08);
  assert.equal(effects.cohesionProductionMultiplier, 1.1);
  assert.equal(effects.cohesionBonus, 10);
  assert.equal(effects.nullSignalMultiplier, 1.1);
  assert.ok(
    Math.abs(getTierCost(state, 0) / getTierCost(baseline, 0) - 0.93) <
      1e-12,
  );
  assert.ok(
    Math.abs(
      getProductionSnapshot(state).fluxPerSecond /
        getProductionSnapshot(baseline).fluxPerSecond -
        1.1,
    ) < 1e-12,
  );
  assert.equal(getEffectiveCohesion(state), 74);
  state.living.cohesion = 96;
  assert.equal(getEffectiveCohesion(state), 100);
});

test("continuity equipment is fabricated with Flux and feeds substitutions", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.settlement.completedWorldIds = ["cold-wake"];
  state.settlement.currentWorldId = "pelagos";

  const unknownQuote = getEquipmentFabricationQuote(state, "not-real-equipment");
  assert.equal(unknownQuote.atLimit, true);
  assert.equal(fabricateWorldEquipment(state, "not-real-equipment"), state);

  const lockedQuote = getEquipmentFabricationQuote(state, "mobile-field-clinic");
  assert.equal(lockedQuote.researchMet, false);
  assert.equal(lockedQuote.researchName, "Clinical Commons");
  state.flux = lockedQuote.cost * 2;
  state.researchStock["engineering-models"] = lockedQuote.modelCost * 2;
  assert.equal(
    fabricateWorldEquipment(state, "mobile-field-clinic"),
    state,
    "equipment stays locked until its research is proven",
  );

  state.research.completedProjectIds = ["clinical-commons"];
  const quote = getEquipmentFabricationQuote(state, "mobile-field-clinic");
  assert.ok(Number.isFinite(quote.cost));
  assert.ok(quote.cost > 0);
  assert.ok(quote.modelCost > 0);
  assert.equal(quote.owned, 0);
  assert.equal(quote.maxUnits, 1);
  assert.equal(quote.atLimit, false);
  assert.equal(quote.researchMet, true);

  // Cannot afford Flux.
  state.flux = quote.cost - 1;
  assert.equal(fabricateWorldEquipment(state, "mobile-field-clinic"), state);

  // Cannot afford Engineering Models.
  state.flux = quote.cost + 10;
  state.researchStock["engineering-models"] = quote.modelCost - 1;
  assert.equal(fabricateWorldEquipment(state, "mobile-field-clinic"), state);

  state.researchStock["engineering-models"] = quote.modelCost + 5;
  const bought = fabricateWorldEquipment(state, "mobile-field-clinic");
  assert.notEqual(bought, state);
  assert.equal(bought.worldProgress.equipment["mobile-field-clinic"], 1);
  assert.ok(bought.flux < state.flux);
  assert.ok(
    bought.researchStock["engineering-models"] <
      state.researchStock["engineering-models"],
  );

  // Owned units feed the viability forecast substitutions.
  const forecast = getCurrentViabilityForecast(bought);
  const medicineSkill = forecast?.lines.find(
    (line) => line.kind === "expertise" && line.id === "medicine",
  );
  assert.equal(medicineSkill?.substitutionValue, 6);

  // The unit limit is enforced.
  const limitQuote = getEquipmentFabricationQuote(bought, "mobile-field-clinic");
  assert.equal(limitQuote.atLimit, true);
  bought.flux = limitQuote.cost * 2;
  assert.equal(fabricateWorldEquipment(bought, "mobile-field-clinic"), bought);
});

test("equipment and berth prices scale with campaign progression, never with live production", () => {
  const early = setTutorialComplete(createInitialState(0), true);
  early.settlement.completedWorldIds = ["cold-wake"];
  early.settlement.currentWorldId = "pelagos";
  const earlyQuote = getEquipmentFabricationQuote(early, "mobile-field-clinic");

  // A compounding economy must never move the price target: pricing that
  // tracks live production outruns any wallet during hypergrowth.
  const industrial = setTutorialComplete(createInitialState(0), true);
  industrial.settlement.completedWorldIds = ["cold-wake"];
  industrial.settlement.currentWorldId = "pelagos";
  industrial.missions.currentIndex = 1;
  industrial.tiers[0] = { amount: 500, bought: 500 };
  industrial.maxFlux = 1_000_000;
  const industrialQuote = getEquipmentFabricationQuote(
    industrial,
    "mobile-field-clinic",
  );
  assert.equal(industrialQuote.cost, earlyQuote.cost);
  assert.equal(
    getBerthConstructionQuote(industrial).cost,
    getBerthConstructionQuote(early).cost,
  );

  // Later worlds cost more, and each berth section costs more than the last.
  const late = setTutorialComplete(createInitialState(0), true);
  late.settlement.completedWorldIds = ["cold-wake", "pelagos", "viridia"];
  late.settlement.currentWorldId = "cinder";
  const lateQuote = getEquipmentFabricationQuote(late, "automated-fabricator-rig");
  assert.ok(lateQuote.cost > earlyQuote.cost);
  const before = getBerthConstructionQuote(late).cost;
  late.survivors.berthSections = 10;
  assert.ok(getBerthConstructionQuote(late).cost > before);
});

test("rescues cost Flux and Survivor Duty automates them when qualified", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.settlement.completedWorldIds = ["cold-wake"];
  state.settlement.currentWorldId = "pelagos";
  state.missions.currentIndex = 1;
  state.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(state.survivors)),
    beaconOnline: true,
    beaconWorldId: "pelagos",
    berthSections: 10,
    lifeSupport: { atmosphere: 90, water: 90, nutrition: 90, medical: 90 },
  });
  state.living.salvage = 1_000_000;
  const sim = simulateGame(state, 120, 240, false);
  assert.ok(sim.survivors.activeSignal, "first scan fires fast");

  // Flux gate blocks the launch even when Salvage is plentiful.
  sim.flux = 0;
  const blocked = getArkRescueQuote(sim);
  assert.equal(blocked.canRescue, false);
  assert.equal(blocked.reason, "flux");
  assert.equal(performArkRescue(sim), sim);

  sim.flux = blocked.fluxCost + 10;
  const rescuedState = performArkRescue(sim);
  assert.notEqual(rescuedState, sim);
  assert.ok(rescuedState.flux < sim.flux);
  assert.ok(rescuedState.survivors.survivors.length > 0);

  // Survivor Duty: a level-5 Navigator and level-3 Soldier on station
  // dispatch the next rescue automatically during simulation.
  const duty = cloneGameState(rescuedState);
  duty.flux = 1e9;
  duty.living.salvage = 1e6;
  duty.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(duty.survivors)),
    survivors: [
      ...JSON.parse(JSON.stringify(duty.survivors.survivors)),
      {
        id: "duty-navigator",
        name: "Duty Navigator",
        role: "navigator",
        backgroundId: "storm-pilot",
        aptitudes: { navigator: 5 },
        skillXp: { navigator: 120 * 16 + 5 },
        assignedRole: "navigator",
      },
      {
        id: "duty-soldier",
        name: "Duty Soldier",
        role: "security",
        backgroundId: "breakwater-watch",
        aptitudes: { security: 5 },
        skillXp: { security: 120 * 4 + 5 },
        assignedRole: "security",
      },
    ],
  });
  assert.ok(hasRescueDetail(duty));
  const before = duty.survivors.survivors.length;
  const after = simulateGame(duty, SOS_SCAN_SECONDS_BY_WORLD.pelagos + 60, 240, false);
  assert.ok(after.survivors.survivors.length > before, "auto-rescue fired");
  assert.equal(after.survivors.activeSignal, null);
});

test("staffed Analysis Core auto-transfers inputs; Null Traces need a qualified handler", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.research.activeProjectId = "null-signal-baseline";
  state.research.completedProjectIds = ["auxiliary-power-routing", "continuity-index"];
  state.research.assignedCrew = 2;
  state.researchStock["calibration-data"] = 500;
  state.researchStock["null-traces"] = 500;
  state.survivors = sanitizeSurvivorSystemState({
    survivors: [{
      id: "analysis-lead",
      name: "Analysis Lead",
      role: "researcher",
      backgroundId: "reef-archive",
      aptitudes: { researcher: 4 },
      skillXp: { researcher: 500 },
      assignedRole: "researcher",
    }],
  });

  const sim = simulateGame(state, 5, 50, false);
  assert.ok(sim.research.inventory["calibration-data"] > 0, "common input moved");
  assert.equal(sim.research.inventory["null-traces"], 0, "null traces held back");

  // add a level-5 Exceptional researcher and the traces flow
  const qualified = cloneGameState(state);
  qualified.survivors = sanitizeSurvivorSystemState({
    ...JSON.parse(JSON.stringify(qualified.survivors)),
    survivors: [{
      id: "null-handler",
      name: "Null Handler",
      role: "researcher",
      backgroundId: "reef-archive",
      aptitudes: { researcher: 5, doctor: 5, engineer: 4 },
      adaptability: 5,
      traits: ["signal-ear", "systems-thinker"],
      skillXp: { researcher: 120 * 16 + 10 },
      assignedRole: "researcher",
    }],
  });
  assert.ok(hasQualifiedNullHandler(qualified));
  const flowing = simulateGame(qualified, 5, 50, false);
  assert.ok(flowing.research.inventory["null-traces"] > 0, "null traces auto-transferred");

  // unstaffed core moves nothing
  const idle = cloneGameState(state);
  idle.research.assignedCrew = 0;
  const stalled = simulateGame(idle, 5, 50, false);
  assert.equal(stalled.research.inventory["calibration-data"], 0);
});

test("rescued groups deliver their cargo: schematics, traces, and armory gear", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.settlement.currentWorldId = "pelagos";
  state.survivors = sanitizeSurvivorSystemState({
    berthSections: 10,
    lifeSupport: { atmosphere: 60, water: 60, nutrition: 60, medical: 60 },
    beaconOnline: true,
    beaconWorldId: "pelagos",
    worldSignalCount: 1,
    rngState: 424_242,
  });
  state.survivors = advanceSurvivorSystem(state.survivors, 2_400);
  assert.ok(state.survivors.activeSignal, "a signal is waiting");
  const cargo = state.survivors.activeSignal!.cargo;
  assert.ok(cargo.schematics > 0);
  state.living.salvage = 100_000;
  state.flux = 1e9;

  const before = state.researchStock["schematics"];
  const rescued = performArkRescue(state);
  assert.notEqual(rescued, state);
  assert.equal(
    Math.round(rescued.researchStock["schematics"] - before),
    Math.round(cargo.schematics),
    "carried schematics land in the schematics reservoir",
  );
  const gearExpected = cargo.weaponTiers.length + cargo.armorTiers.length;
  const gearReceived =
    getArmoryReadyCount(rescued.armory, "kinetic-pike") +
    getArmoryReadyCount(rescued.armory, "composite-weave");
  assert.equal(gearReceived, gearExpected, "carried gear lands in the armory");
});

test("economy v2: flux/sec moves only when you buy, and offline gain is linear", () => {
  const state = setTutorialComplete(createInitialState(0), true);
  state.missions.currentIndex = 1;
  state.missions.statuses = ["saved", "active", "locked", "locked", "locked", "locked"];
  state.flux = 10_000;
  state.maxFlux = 10_000;

  // buying adds an exact, predictable amount to the rate
  const before = getProductionSnapshot(state);
  const bought = buyTier(state, 0, "1");
  const after = getProductionSnapshot(bought);
  assert.ok(after.fluxPerSecond > before.fluxPerSecond);

  // ...and NOTHING else ever raises it: a full offline day leaves the
  // rate exactly where purchases put it
  const idle = simulateGame(bought, 8 * 3_600, 240, false);
  assert.equal(
    getProductionSnapshot(idle).fluxPerSecond,
    after.fluxPerSecond,
    "no passive compounding, ever",
  );
  assert.deepEqual(
    idle.tiers.map((tier) => tier.bought),
    bought.tiers.map((tier) => tier.bought),
    "no machine mints machines",
  );

  // offline is linear: two 4-hour sessions equal one 8-hour session
  const half = simulateGame(bought, 4 * 3_600, 240, false);
  const twoHalves = simulateGame(half, 4 * 3_600, 240, false);
  assert.ok(
    Math.abs(twoHalves.flux - idle.flux) / Math.max(1, idle.flux) < 1e-6,
    "chunked offline equals continuous offline",
  );
});

test("economy v2 migration dissolves produced stockpiles into bought counts", () => {
  const migrated = sanitizeGameState({
    version: 7,
    flux: 1e9,
    maxFlux: 1e9,
    tiers: [
      { amount: 2.4e12, bought: 120 },
      { amount: 9.9e9, bought: 60 },
      { amount: 5e7, bought: 25 },
      { amount: 0, bought: 0 },
      { amount: 0, bought: 0 },
      { amount: 0, bought: 0 },
    ],
  }, 100);
  assert.equal(migrated.version, 12);
  for (const tier of migrated.tiers) {
    assert.equal(tier.amount, tier.bought, "amount mirrors bought after v2");
  }
  assert.equal(migrated.tiers[0]!.bought, 120, "purchases are never touched");
});
