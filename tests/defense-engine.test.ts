import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_STORM_DELAY_SECONDS,
  MAX_PRODUCTION_PENALTY,
  MAX_REPAIR_SECONDS,
  advanceDefense,
  createDefenseState,
  getDefenseProductionMultiplier,
  getDefenseReadiness,
  getForecastLeadSeconds,
  getIncomingForecast,
  getInstallationCost,
  sanitizeDefenseState,
  setDefenseDoctrine,
  upgradeDefenseInstallation,
  type DefenseAdvanceContext,
} from "../app/defense-engine.ts";

const CINDER: DefenseAdvanceContext = {
  stormsEnabled: true,
  worldIndex: 3,
  security: 0,
  engineers: 0,
  navigators: 0,
};

test("storms never occur before they are enabled and scheduling is deterministic", () => {
  const state = createDefenseState(1234);
  const safe = advanceDefense(state, 90 * 3_600, { ...CINDER, stormsEnabled: false });
  assert.equal(safe.resolvedEvents.length, 0);
  assert.equal(safe.state.incoming, null);

  const first = advanceDefense(state, 8 * 3_600, CINDER);
  const second = advanceDefense(state, 8 * 3_600, CINDER);
  assert.deepEqual(first.state, second.state);
  assert.deepEqual(first.resolvedEvents, second.resolvedEvents);
});

test("the first storm is mild, arrives after the tutorial delay, and resolves automatically", () => {
  const state = createDefenseState(42);
  const beforeArrival = advanceDefense(state, FIRST_STORM_DELAY_SECONDS - 60, CINDER);
  assert.equal(beforeArrival.resolvedEvents.length, 0);
  assert.ok(beforeArrival.state.incoming);
  assert.equal(beforeArrival.state.incoming!.severity, 1);

  const arrived = advanceDefense(beforeArrival.state, 120, CINDER);
  assert.equal(arrived.resolvedEvents.length, 1);
  assert.equal(arrived.resolvedEvents[0]!.severity, 1);
});

test("one long advance resolves the same storms as many short ones", () => {
  const seedState = createDefenseState(777);
  const oneShot = advanceDefense(seedState, 24 * 3_600, CINDER);
  let chunked = seedState;
  for (let i = 0; i < 96; i += 1) {
    chunked = advanceDefense(chunked, 900, CINDER).state;
  }
  assert.equal(oneShot.state.stats.resolved, chunked.stats.resolved);
  assert.equal(oneShot.state.clockSeconds, chunked.clockSeconds);
  assert.deepEqual(oneShot.state.eventLog, chunked.eventLog);
});

test("readiness beats storms and negligence is survivable but never fatal", () => {
  // Fully built Ark rides out everything.
  let strong = createDefenseState(9);
  for (let i = 0; i < 5; i += 1) {
    strong = upgradeDefenseInstallation(strong, "shieldArray");
    strong = upgradeDefenseInstallation(strong, "repairDrones");
  }
  const crew = { ...CINDER, security: 4, engineers: 4 };
  assert.ok(getDefenseReadiness(strong, crew) >= 90);
  const defended = advanceDefense(strong, 7 * 24 * 3_600, crew);
  assert.ok(defended.state.stats.resolved > 10);
  assert.equal(defended.state.stats.damaged, 0);
  assert.ok(defended.salvage > 0);

  // A player who builds nothing takes bounded, recoverable damage forever.
  const negligent = advanceDefense(createDefenseState(9), 30 * 24 * 3_600, CINDER);
  assert.ok(negligent.state.stats.resolved > 40);
  assert.ok(negligent.state.stats.damaged > 0);
  const penalty = negligent.state.damage?.productionPenalty ?? 0;
  assert.ok(penalty <= MAX_PRODUCTION_PENALTY + 1e-9);
  const repair = negligent.state.damage?.repairRemainingSeconds ?? 0;
  assert.ok(repair <= MAX_REPAIR_SECONDS + 1e-9);
  assert.ok(getDefenseProductionMultiplier(negligent.state) >= 1 - MAX_PRODUCTION_PENALTY);
});

test("observe doctrine gathers research inputs including Null Traces", () => {
  let state = createDefenseState(31);
  for (let i = 0; i < 4; i += 1) state = upgradeDefenseInstallation(state, "shieldArray");
  state = setDefenseDoctrine(state, "observe");
  const crew = { ...CINDER, security: 2, engineers: 2 };
  const observed = advanceDefense(state, 4 * 24 * 3_600, crew);

  let defendState = createDefenseState(31);
  for (let i = 0; i < 4; i += 1) defendState = upgradeDefenseInstallation(defendState, "shieldArray");
  const defended = advanceDefense(defendState, 4 * 24 * 3_600, crew);

  assert.ok(observed.nullTraces > 0);
  assert.ok(observed.calibrationData > 0);
  assert.equal(defended.nullTraces, 0);
  assert.ok(defended.salvage > observed.salvage);
});

test("forecast lead grows with the relay and navigators", () => {
  let state = createDefenseState(5);
  assert.equal(getForecastLeadSeconds(state, 0), 15 * 60);
  state = upgradeDefenseInstallation(state, "earlyWarningRelay");
  assert.equal(getForecastLeadSeconds(state, 2), 15 * 60 + 45 * 60 + 20 * 60);

  const scheduled = advanceDefense(state, 60, CINDER).state;
  assert.ok(scheduled.incoming);
  // storm timers are always projectable; severity resolves inside the window
  const early = getIncomingForecast(scheduled, 0);
  assert.ok(early);
  const arrivesIn = scheduled.incoming!.arrivesAtSeconds - scheduled.clockSeconds;
  if (arrivesIn > getForecastLeadSeconds(scheduled, 0)) assert.equal(early!.severityKnown, false);
  const later = advanceDefense(scheduled, Math.max(0, arrivesIn - 10 * 60), CINDER).state;
  if (later.incoming) assert.equal(getIncomingForecast(later, 0)?.severityKnown, true);
});

test("installation costs scale with continuity and cap at level five", () => {
  let state = createDefenseState(1);
  const pelagosCost = getInstallationCost(state, "shieldArray", 1);
  const cinderCost = getInstallationCost(state, "shieldArray", 6_000);
  assert.ok(cinderCost > pelagosCost);
  for (let i = 0; i < 5; i += 1) state = upgradeDefenseInstallation(state, "shieldArray");
  assert.equal(state.installations.shieldArray, 5);
  assert.equal(upgradeDefenseInstallation(state, "shieldArray"), state);
  assert.equal(getInstallationCost(state, "shieldArray", 1), Number.POSITIVE_INFINITY);
});

test("sanitization repairs malformed defense saves without losing structure", () => {
  const damaged = sanitizeDefenseState({
    rngState: 0,
    clockSeconds: -5,
    doctrine: "attack-everything",
    installations: { shieldArray: 99, pointDefense: -3, bogus: 4 },
    incoming: { severity: 90, arrivesAtSeconds: -1 },
    damage: { productionPenalty: 4, repairRemainingSeconds: 1e9 },
    eventLog: ["junk", { severity: 2, outcome: "battered" }],
    stats: { resolved: -4 },
  });
  assert.equal(damaged.doctrine, "defend");
  assert.equal(damaged.installations.shieldArray, 5);
  assert.equal(damaged.installations.pointDefense, 0);
  assert.equal(damaged.incoming, null);
  assert.ok((damaged.damage?.productionPenalty ?? 0) <= MAX_PRODUCTION_PENALTY);
  assert.equal(damaged.eventLog.length, 1);
  assert.equal(damaged.stats.resolved, 0);

  const roundTrip = sanitizeDefenseState(JSON.parse(JSON.stringify(damaged)));
  assert.deepEqual(roundTrip.installations, damaged.installations);
});
