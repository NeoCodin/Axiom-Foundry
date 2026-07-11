import assert from "node:assert/strict";
import test from "node:test";
import {
  MISSIONS,
  RECALIBRATION_THRESHOLD,
  acknowledgeNextMission,
  buyTier,
  createInitialState,
  getMaxAffordableCount,
  getTierCost,
  pulseCore,
  recalibrate,
  sanitizeGameState,
  setTutorialComplete,
  simulateGame,
} from "../app/game-engine.ts";

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

test("planetary clocks wait for orientation and pause during offline progress", () => {
  const initial = createInitialState(0);
  const beforeOrientation = simulateGame(initial, 60, 10);
  assert.equal(beforeOrientation.missions.timeLeft, MISSIONS[0].timeLimit);

  const started = setTutorialComplete(beforeOrientation, true);
  const active = simulateGame(started, 1, 1);
  assert.equal(active.missions.timeLeft, MISSIONS[0].timeLimit - 1);

  const offline = simulateGame(active, 60, 10, false);
  assert.equal(offline.missions.timeLeft, active.missions.timeLeft);
});

test("a rescued world grants a relay and waits before the next timer", () => {
  let state = setTutorialComplete(createInitialState(0), true);
  state.flux = 75;
  state.maxFlux = 75;
  state.runFlux = 75;
  state.allTimeFlux = 75;

  const rescued = simulateGame(state, 0.1, 1);
  assert.equal(rescued.missions.statuses[0], "saved");
  assert.equal(rescued.missions.currentIndex, 1);
  assert.equal(rescued.missions.awaitingAcknowledgement, true);
  assert.equal(rescued.stellarRelays, 1);
  assert.ok(rescued.flux >= 125);

  const waiting = simulateGame(rescued, 120, 10);
  assert.equal(waiting.missions.timeLeft, MISSIONS[1].timeLimit);

  const accepted = acknowledgeNextMission(waiting);
  assert.equal(accepted.missions.awaitingAcknowledgement, false);
  assert.equal(accepted.missions.statuses[1], "active");
});

test("missing a deadline records the world without resetting progression", () => {
  let state = setTutorialComplete(createInitialState(0), true);
  state.flux = 42;
  state.maxFlux = 42;
  state.missions.timeLeft = 0.05;
  const lost = simulateGame(state, 0.1, 1);
  assert.equal(lost.missions.statuses[0], "lost");
  assert.equal(lost.missions.worldsLost, 1);
  assert.equal(lost.flux, 42);
  assert.equal(lost.cycle, 1);
});
