import assert from "node:assert/strict";
import test from "node:test";

import {
  BIOADAPTATION_CONSENT_VERSION,
  advanceBioadaptation,
  beginBioadaptationProcedure,
  createBioadaptationState,
  getBioadaptationEffects,
  sanitizeBioadaptationRecords,
  sanitizeBioadaptationState,
} from "../app/bioadaptation-engine.ts";
import {
  createInitialState,
  getBioadaptationQuote,
  getCampaignCrewSummaries,
  simulateGame,
  startBioadaptation,
} from "../app/game-engine.ts";
import {
  getSurvivorRarity,
  sanitizeSurvivorSystemState,
} from "../app/survivor-engine.ts";

test("procedures are deterministic, offline-safe, and finish with a consent record", () => {
  const started = beginBioadaptationProcedure(
    createBioadaptationState(),
    "survivor-1",
    "atmospheric-adaptation",
    500,
  );
  const half = advanceBioadaptation(started, 2 * 3_600);
  assert.ok(half.state.active);
  assert.equal(half.completed, null);

  const finished = advanceBioadaptation(half.state, 2 * 3_600);
  assert.equal(finished.state.active, null);
  assert.equal(finished.survivorId, "survivor-1");
  assert.equal(finished.completed?.id, "atmospheric-adaptation");
  assert.equal(finished.completed?.consentVersion, BIOADAPTATION_CONSENT_VERSION);
});

test("a survivor has two distinct permanent choices and bounded support effects", () => {
  const records = sanitizeBioadaptationRecords([
    { id: "radiation-resistance", atOperationalSeconds: 1, consentVersion: 1 },
    { id: "radiation-resistance", atOperationalSeconds: 2, consentVersion: 1 },
    { id: "extended-field-endurance", atOperationalSeconds: 3, consentVersion: 1 },
    { id: "null-resistance", atOperationalSeconds: 4, consentVersion: 1 },
  ]);
  assert.deepEqual(records.map((record) => record.id), ["radiation-resistance", "extended-field-endurance"]);
  const effects = getBioadaptationEffects(records);
  assert.equal(effects.expeditionDurationMultiplier, 0.95);
  assert.equal(effects.injuryMultiplier, 0.765);

  const repaired = sanitizeBioadaptationState(
    { active: { survivorId: "missing", adaptationId: "null-resistance", progressSeconds: 50 } },
    new Set(["survivor-1"]),
  );
  assert.equal(repaired.active, null);
});

test("the clinic commits resources, occupies the volunteer, and preserves rarity and Continuity", () => {
  const state = createInitialState(0);
  state.settlement.completedWorldIds = ["cold-wake", "pelagos", "viridia", "cinder"];
  state.settlement.currentWorldId = "nox";
  state.survivors = sanitizeSurvivorSystemState({
    schema: 7,
    survivors: [{
      id: "volunteer",
      name: "Mara Vale",
      role: "navigator",
      assignedRole: "navigator",
      backgroundId: "storm-pilot",
      aptitudes: { navigator: 5 },
      skillXp: { navigator: 1_600 },
      traits: ["signal-ear"],
      ageGroup: "adult",
    }],
  });
  state.research.completedProjectIds = [
    "voluntary-adaptation-charter",
    "atmospheric-symbiosis",
  ];
  state.flux = 1e30;
  state.axioms = 10;
  state.researchStock["biological-samples"] = 10_000;
  state.researchStock["cultural-records"] = 10_000;
  state.researchStock["engineering-models"] = 10_000;
  const beforeCrew = state.survivors.survivors[0]!;
  const beforeRarity = getSurvivorRarity(beforeCrew).id;
  const beforeExpertise = getCampaignCrewSummaries(state)[0]!.expertise;
  const quote = getBioadaptationQuote(state, "volunteer", "atmospheric-adaptation");
  assert.equal(quote.canBegin, true);
  state.flux = quote.fluxCost * 2;

  const started = startBioadaptation(state, "volunteer", "atmospheric-adaptation");
  assert.ok(started.bioadaptation.active);
  assert.equal(started.survivors.survivors[0]!.assignedRole, null);
  assert.equal(started.axioms, state.axioms - quote.axiomCost);
  assert.equal(started.flux, quote.fluxCost);

  const finished = simulateGame(started, quote.durationSeconds, 2, false);
  const volunteer = finished.survivors.survivors[0]!;
  assert.equal(finished.bioadaptation.active, null);
  assert.deepEqual(volunteer.bioadaptations.map((record) => record.id), ["atmospheric-adaptation"]);
  assert.equal(getSurvivorRarity(volunteer).id, beforeRarity);
  const summary = getCampaignCrewSummaries(finished)[0]!;
  assert.deepEqual(summary.adaptationIds, ["atmospheric-adaptation"]);
  assert.deepEqual(summary.expertise, beforeExpertise);
});
