import assert from "node:assert/strict";
import test from "node:test";
import {
  MISSIONS,
  RECALIBRATION_THRESHOLD,
  RETIRED_SAVE_KEYS,
  RUN_UPGRADES,
  SAVE_KEY,
  acknowledgeNextMission,
  buyRunUpgrade,
  buyTier,
  contributeToMission,
  createInitialState,
  getCampaignRelics,
  getCampaignWorldIndex,
  getMaxAffordableCount,
  getProductionSnapshot,
  getRecalibrationGain,
  getRunUpgradeCost,
  getTierCost,
  isTierUnlocked,
  pulseCore,
  recalibrate,
  sanitizeGameState,
  setTutorialComplete,
  simulateGame,
} from "../app/game-engine.ts";

test("the campaign reset retires every previous public save key", () => {
  assert.equal(SAVE_KEY, "axiom-foundry-save-v2");
  assert.deepEqual(RETIRED_SAVE_KEYS, ["axiom-foundry-save-v1"]);
  assert.equal(
    (RETIRED_SAVE_KEYS as readonly string[]).includes(SAVE_KEY),
    false,
  );
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
  const next = recalibrate(state, 1_000);
  assert.equal(next.axioms, 1);
  assert.equal(next.lifetimeAxioms, 1);
  assert.equal(next.cycle, 2);
  assert.equal(next.legacyUpgrades[0], 2);
  assert.equal(next.runFlux, 0);
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

test("a three-phase rescue grants a relay and waits before Planetfall", () => {
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

  const rescued = simulateGame(state, 0.1, 1);
  assert.equal(rescued.missions.statuses[0], "saved");
  assert.equal(rescued.missions.currentIndex, 1);
  assert.equal(rescued.missions.awaitingAcknowledgement, true);
  assert.equal(rescued.stellarRelays, 1);
  assert.ok(rescued.flux < 10);

  const waiting = simulateGame(rescued, 120, 10);
  assert.equal(waiting.missions.awaitingAcknowledgement, true);
  assert.equal(waiting.missions.currentIndex, 1);
  waiting.axioms = 3;
  waiting.lifetimeAxioms = 3;
  waiting.legacyUpgrades[0] = 1;
  waiting.runUpgrades[0] = 2;

  const accepted = acknowledgeNextMission(waiting);
  assert.equal(accepted.missions.awaitingAcknowledgement, false);
  assert.equal(accepted.missions.statuses[1], "active");
  assert.equal(accepted.flux, MISSIONS[0].landingFlux);
  assert.equal(accepted.tiers[0].bought, 0);
  assert.ok(accepted.tiers[0].amount >= 0);
  assert.equal(accepted.runUpgrades[0], 0);
  assert.equal(accepted.axioms, 3);
  assert.equal(accepted.legacyUpgrades[0], 1);
  assert.equal(getCampaignWorldIndex(accepted), 1);
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
  assert.equal(migrated.version, 4);
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

  assert.equal(migrated.version, 4);
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

  const continued = acknowledgeNextMission(migrated);
  assert.equal(continued.flux, MISSIONS[2].landingFlux);
  assert.equal(continued.missions.statuses[3], "active");
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

test("representative active play takes hours, not minutes, to finish the route", () => {
  let state = setTutorialComplete(createInitialState(0), true);
  let twoHourSnapshot: { index: number; lifetimeAxioms: number } | null = null;

  for (
    let second = 0;
    second < 8 * 3_600 && state.missions.currentIndex < MISSIONS.length;
    second += 1
  ) {
    state = pulseCore(pulseCore(state));
    const mission = MISSIONS[state.missions.currentIndex];
    const stage = mission?.stages[state.missions.stageIndex];

    for (let index = state.tiers.length - 1; index >= 0; index -= 1) {
      const costTen = getTierCost(state, index, 10);
      const costOne = getTierCost(state, index, 1);
      if (
        stage?.kind === "tierPurchaseDelta" &&
        stage.tierIndex === index &&
        costOne <= state.flux
      ) {
        state = buyTier(state, index, "1");
      } else if (costTen <= state.flux * 0.18) {
        state = buyTier(state, index, "10");
      } else if (costOne <= state.flux * 0.04) {
        state = buyTier(state, index, "1");
      }
    }

    for (let index = 0; index < RUN_UPGRADES.length; index += 1) {
      if (getRunUpgradeCost(state, index) <= state.flux * 0.08) {
        state = buyRunUpgrade(state, index);
      }
    }

    if (
      stage?.kind === "contributeFlux" &&
      state.flux >= stage.target - state.missions.contributedFlux
    ) {
      state = contributeToMission(state);
    }
    if (
      stage?.kind === "recalibrateGain" &&
      getRecalibrationGain(state) > 0
    ) {
      state = recalibrate(state, second * 1_000);
    }

    state = simulateGame(state, 1, 4);
    if (state.missions.awaitingAcknowledgement) {
      state = acknowledgeNextMission(state);
    }
    if (second === 2 * 3_600 - 1) {
      twoHourSnapshot = {
        index: state.missions.currentIndex,
        lifetimeAxioms: state.lifetimeAxioms,
      };
    }
  }

  assert.ok(twoHourSnapshot);
  assert.ok(twoHourSnapshot.index < MISSIONS.length - 1);
  assert.equal(twoHourSnapshot.lifetimeAxioms, 0);
  assert.equal(state.missions.currentIndex, MISSIONS.length);
  assert.equal(state.missions.worldsSaved, MISSIONS.length);
  assert.ok(state.playTime >= 2 * 3_600);
  assert.ok(state.playTime <= 8 * 3_600);
});
