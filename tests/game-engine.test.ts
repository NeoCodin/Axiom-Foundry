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
  getCampaignWorldIndex,
  getCrisisFluxCost,
  getCrisisReadiness,
  getCurrentViabilityForecast,
  getMaxAffordableCount,
  getProductionSnapshot,
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
  getResearchProjectDefinition,
  type ResearchProjectId,
} from "../app/research-engine.ts";

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
  state.living.crew[0].callsign = "Ember";
  state.living.crew[0].assignedRoomId = "axiom-chamber";
  const next = recalibrate(state, 1_000);
  assert.equal(next.axioms, 1);
  assert.equal(next.lifetimeAxioms, 1);
  assert.equal(next.cycle, 2);
  assert.equal(next.legacyUpgrades[0], 2);
  assert.equal(next.runFlux, 0);
  assert.equal(next.living.foundryName, "The Quiet Argument");
  assert.equal(next.living.crew[0].callsign, "Ember");
  assert.equal(next.living.crew[0].assignedRoomId, "axiom-chamber");
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

  state.flux = 5_000;
  state.maxFlux = 5_000;
  state.runFlux = 5_000;
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
  const outputs = [24, 25, 50, 100].map((bought) => {
    const state = createInitialState(0);
    state.tiers[0] = { amount: 1, bought };
    return getProductionSnapshot(state).tierOutputs[0];
  });
  assert.ok(Math.abs(outputs[1] / outputs[0] - 1.5) < 1e-10);
  assert.ok(Math.abs(outputs[2] / outputs[0] - 2) < 1e-10);
  assert.ok(Math.abs(outputs[3] / outputs[0] - 3) < 1e-10);
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

test("Flow and Resonance multiply final Flux without recursively boosting upper tiers", () => {
  const state = createInitialState(0);
  state.missions.currentIndex = 1;
  state.missions.statuses = ["saved", "active", "locked", "locked", "locked", "locked"];
  state.tiers[0] = { amount: 15, bought: 15 };
  state.tiers[1] = { amount: 15, bought: 15 };
  const base = getProductionSnapshot(state);

  state.runUpgrades[1] = 1;
  const flow = getProductionSnapshot(state);
  assert.ok(flow.tierOutputs[0] > base.tierOutputs[0]);
  assert.equal(flow.tierOutputs[1], base.tierOutputs[1]);

  state.runUpgrades[1] = 0;
  state.tiers[1].bought = 14;
  const noLink = getProductionSnapshot(state);
  state.tiers[1].bought = 15;
  const linked = getProductionSnapshot(state);
  assert.ok(linked.tierOutputs[0] > noLink.tierOutputs[0]);
  assert.equal(linked.tierOutputs[1], noLink.tierOutputs[1]);
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
  assert.equal(migrated.version, 7);
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

  assert.equal(migrated.version, 7);
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
  state.flux = 5_000;
  state.maxFlux = 5_000;
  state.runFlux = 5_000;
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
