import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_STORM_DELAY_SECONDS,
  FIRST_TRANSIT_HAZARD_DELAY_SECONDS,
  MAX_INSTALLATION_MARK,
  MAX_PRODUCTION_PENALTY,
  MAX_REPAIR_SECONDS,
  advanceDefense,
  beginDefenseInstallationProject,
  createDefenseState,
  getDefenseProductionMultiplier,
  getDefenseReadiness,
  getForecastLeadSeconds,
  getIncomingForecast,
  getInstallationProjectRequirements,
  sanitizeDefenseState,
  setDefenseDoctrine,
  setEnvironmentalDefenseDoctrine,
  type DefenseAdvanceContext,
  type DefenseInstallationId,
  type DefenseState,
} from "../app/defense-engine.ts";

const CINDER: DefenseAdvanceContext = {
  environment: "cinder-orbit",
  stormsEnabled: true,
  hostilesEnabled: false,
  worldIndex: 3,
  security: 0,
  engineers: 0,
  navigators: 0,
};

const quietContext: DefenseAdvanceContext = {
  ...CINDER,
  environment: null,
  stormsEnabled: false,
};

function completeMark(state: DefenseState, id: DefenseInstallationId) {
  const started = beginDefenseInstallationProject(state, id, 60);
  return advanceDefense(started, 60, quietContext).state;
}

test("environmental events never occur when disabled and scheduling is deterministic", () => {
  const state = createDefenseState(1234);
  const safe = advanceDefense(state, 90 * 3_600, quietContext);
  assert.equal(safe.resolvedEvents.length, 0);
  assert.equal(safe.state.incoming, null);

  const first = advanceDefense(state, 8 * 3_600, CINDER);
  const second = advanceDefense(state, 8 * 3_600, CINDER);
  assert.deepEqual(first.state, second.state);
  assert.deepEqual(first.resolvedEvents, second.resolvedEvents);
  assert.ok(first.resolvedEvents.every((event) => event.kind === "ash-storm"));
});

test("Cinder weather is mild, delayed, and cannot follow the Ark into transit", () => {
  const state = createDefenseState(42);
  const beforeArrival = advanceDefense(state, FIRST_STORM_DELAY_SECONDS - 60, CINDER);
  assert.equal(beforeArrival.resolvedEvents.length, 0);
  assert.equal(beforeArrival.state.incoming?.kind, "ash-storm");
  assert.equal(beforeArrival.state.incoming?.severity, 1);

  const transit = advanceDefense(beforeArrival.state, 60, {
    ...CINDER,
    environment: "transit",
  });
  assert.notEqual(transit.state.incoming?.kind, "ash-storm");
  assert.equal(
    transit.state.incoming!.arrivesAtSeconds - transit.state.clockSeconds,
    FIRST_TRANSIT_HAZARD_DELAY_SECONDS - 60,
  );
});

test("one long advance resolves the same hazards as many short advances", () => {
  const seedState = createDefenseState(777);
  const oneShot = advanceDefense(seedState, 24 * 3_600, CINDER);
  let chunked = seedState;
  for (let i = 0; i < 96; i += 1) chunked = advanceDefense(chunked, 900, CINDER).state;
  assert.equal(oneShot.state.stats.resolved, chunked.stats.resolved);
  assert.equal(oneShot.state.clockSeconds, chunked.clockSeconds);
  assert.deepEqual(oneShot.state.eventLog, chunked.eventLog);
});

test("installation Marks are costly offline projects instead of instant levels", () => {
  let state = createDefenseState(1);
  const markOne = getInstallationProjectRequirements(state, "shieldArray");
  assert.equal(markOne.targetMark, 1);
  assert.equal(markOne.requiredResearchId, null);
  assert.ok(markOne.durationSeconds >= 30 * 60);

  const started = beginDefenseInstallationProject(state, "shieldArray", 3_600);
  assert.ok(started.construction);
  assert.equal(started.installations.shieldArray, 0);
  const halfway = advanceDefense(started, 1_800, quietContext).state;
  assert.equal(halfway.installations.shieldArray, 0);
  state = advanceDefense(halfway, 1_800, quietContext).state;
  assert.equal(state.installations.shieldArray, 1);

  const markTwo = getInstallationProjectRequirements(state, "shieldArray");
  assert.equal(markTwo.targetMark, 2);
  assert.equal(markTwo.requiredResearchId, "defensive-forecasting");
  assert.ok(markTwo.fluxCost > markOne.fluxCost);
  assert.ok(markTwo.schematicCost > 0);

  for (let mark = 2; mark <= MAX_INSTALLATION_MARK; mark += 1) {
    state = completeMark(state, "shieldArray");
  }
  assert.equal(state.installations.shieldArray, MAX_INSTALLATION_MARK);
  assert.equal(getInstallationProjectRequirements(state, "shieldArray").maxed, true);
  assert.equal(beginDefenseInstallationProject(state, "shieldArray", 60), state);
});

test("Mark installations and crew can make hazards safe while negligence stays recoverable", () => {
  let strong = createDefenseState(9);
  for (const id of ["shieldArray", "repairDrones", "pointDefense"] as const) {
    for (let mark = 0; mark < MAX_INSTALLATION_MARK; mark += 1) strong = completeMark(strong, id);
  }
  const crew = { ...CINDER, security: 4, engineers: 4 };
  assert.ok(getDefenseReadiness(strong, crew) >= 90);
  const defended = advanceDefense(strong, 7 * 24 * 3_600, crew);
  assert.ok(defended.state.stats.resolved > 10);
  assert.equal(defended.state.stats.damaged, 0);

  const negligent = advanceDefense(createDefenseState(9), 30 * 24 * 3_600, CINDER);
  assert.ok(negligent.state.stats.damaged > 0);
  assert.ok((negligent.state.damage?.productionPenalty ?? 0) <= MAX_PRODUCTION_PENALTY);
  assert.ok((negligent.state.damage?.repairRemainingSeconds ?? 0) <= MAX_REPAIR_SECONDS);
  assert.ok(getDefenseProductionMultiplier(negligent.state) >= 1 - MAX_PRODUCTION_PENALTY);
});

test("environmental and contact doctrines are independent standing orders", () => {
  let state = createDefenseState(31);
  state = setEnvironmentalDefenseDoctrine(state, "harvest");
  state = setDefenseDoctrine(state, "observe");
  assert.equal(state.environmentalDoctrine, "harvest");
  assert.equal(state.contactDoctrine, "observe");

  const harvested = advanceDefense(state, 10 * 3_600, {
    ...CINDER,
    environment: "transit",
  });
  assert.ok(harvested.calibrationData > 0);

  const observed = advanceDefense(harvested.state, 2 * 3_600, {
    ...quietContext,
    hostilesEnabled: true,
    worldIndex: 4,
  });
  assert.ok(observed.nullTraces > 0);
});

test("forecast lead grows by meaningful Early-Warning Marks", () => {
  let state = createDefenseState(5);
  assert.equal(getForecastLeadSeconds(state, 0), 15 * 60);
  state = completeMark(state, "earlyWarningRelay");
  assert.equal(getForecastLeadSeconds(state, 2), 15 * 60 + 45 * 60 + 20 * 60);

  const scheduled = advanceDefense(state, 60, CINDER).state;
  assert.ok(scheduled.incoming);
  const early = getIncomingForecast(scheduled, 0);
  assert.ok(early);
});

test("legacy 5/5 saves migrate to Mark I and malformed state is bounded", () => {
  const migrated = sanitizeDefenseState({
    schema: 2,
    rngState: 0,
    clockSeconds: -5,
    doctrine: "observe",
    installations: { shieldArray: 5, pointDefense: 99, repairDrones: -3 },
    incoming: { kind: "ash-storm", severity: 2, arrivesAtSeconds: 4_000 },
    damage: { productionPenalty: 4, repairRemainingSeconds: 1e9 },
    eventLog: ["junk", { kind: "ash-storm", severity: 2, outcome: "battered" }],
    stats: { resolved: -4 },
  });
  assert.equal(migrated.contactDoctrine, "observe");
  assert.equal(migrated.environmentalDoctrine, "brace");
  assert.equal(migrated.installations.shieldArray, 1);
  assert.equal(migrated.installations.pointDefense, 1);
  assert.equal(migrated.installations.repairDrones, 0);
  assert.ok((migrated.damage?.productionPenalty ?? 0) <= MAX_PRODUCTION_PENALTY);
  assert.equal(migrated.eventLog.length, 1);

  const roundTrip = sanitizeDefenseState(JSON.parse(JSON.stringify(migrated)));
  assert.deepEqual(roundTrip, migrated);
});

test("Nox contacts remain deterministic, injure only under risky doctrine, and recover", () => {
  const context: DefenseAdvanceContext = {
    environment: "transit",
    stormsEnabled: true,
    hostilesEnabled: true,
    worldIndex: 4,
    security: 0,
    engineers: 0,
    navigators: 0,
    eligibleDefenderIds: ["guard-1", "engineer-1"],
    injuryMitigation: 1,
  };
  const first = advanceDefense(createDefenseState(71), 2 * 3_600, context);
  const replay = advanceDefense(createDefenseState(71), 2 * 3_600, context);
  assert.deepEqual(first.state, replay.state);
  assert.equal(first.resolvedEvents[0]!.kind, "retrograde-probe");
  assert.equal(first.state.firstContactResolved, true);
  assert.ok(first.resolvedEvents[0]!.injuries.length > 0);
  assert.ok((first.state.compromise?.remainingSeconds ?? 0) <= 6 * 3_600);
  assert.ok(first.state.causalFragmentIds.length >= 1);

  const evading = setDefenseDoctrine(createDefenseState(71), "evade");
  const evaded = advanceDefense(evading, 2 * 3_600, context);
  assert.equal(evaded.resolvedEvents[0]!.injuries.length, 0);
});
