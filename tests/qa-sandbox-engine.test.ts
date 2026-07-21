import assert from "node:assert/strict";
import test from "node:test";

import { COLD_WAKE_FOUNDRY_STAGE, SAVE_KEY } from "../app/game-engine.ts";
import { CAMPAIGN_WORLD_IDS, getCampaignWorld } from "../app/campaign-content.ts";
import { RESEARCH_PROJECT_DEFINITIONS } from "../app/research-engine.ts";
import { getSurvivorBestSkillLevel } from "../app/survivor-engine.ts";
import { getProgressiveDisclosure } from "../app/progressive-disclosure.ts";
import {
  QA_SAVE_KEY,
  addQaFlux,
  boostQaCrew,
  completeQaResearch,
  createQaCheckpoint,
  createQaPlanetIntroductionCheckpoint,
  grantQaResources,
  prepareQaContinuity,
} from "../app/qa-sandbox-engine.ts";

test("custom QA Flux grants are additive, tracked, and safely bounded", () => {
  const state = createQaCheckpoint(0, 1_000_000);
  const amount = 123_456_789;
  const next = addQaFlux(state, amount);
  assert.equal(next.flux, state.flux + amount);
  assert.equal(next.maxFlux, state.maxFlux + amount);
  assert.equal(next.runFlux, state.runFlux + amount);
  assert.equal(next.allTimeFlux, state.allTimeFlux + amount);
  assert.strictEqual(addQaFlux(state, -1), state);
  assert.strictEqual(addQaFlux(state, Number.NaN), state);
  assert.equal(addQaFlux(state, Number.POSITIVE_INFINITY).flux, 1e280);
});

test("QA checkpoints are isolated, valid campaign snapshots", () => {
  assert.notEqual(QA_SAVE_KEY, SAVE_KEY);
  for (const [index, worldId] of CAMPAIGN_WORLD_IDS.entries()) {
    const state = createQaCheckpoint(index, 1_000_000);
    assert.equal(state.missions.currentIndex, index);
    assert.equal(state.settlement.currentWorldId, worldId);
    assert.deepEqual(state.settlement.completedWorldIds, CAMPAIGN_WORLD_IDS.slice(0, index));
    assert.equal(state.settings.tutorialComplete, true);
    assert.equal(state.settings.continuityIntroduced, index > 0);
    assert.ok(state.flux > 0);
    assert.equal(state.missions.stageIndex, 0);
    assert.ok(state.runUpgrades.every((level) => level === 0));
    assert.deepEqual(
      state.missions.baseline.tierBought,
      state.tiers.map((tier) => tier.bought),
    );
  }
});

test("QA can replay the full staged public onboarding without a campaign wait", () => {
  const state = createQaPlanetIntroductionCheckpoint(1_000_000);
  assert.equal(state.missions.currentIndex, 0);
  assert.equal(state.missions.stageIndex, COLD_WAKE_FOUNDRY_STAGE);
  assert.equal(state.missions.awaitingAcknowledgement, false);
  assert.equal(state.lifetimeAxioms, 3);
  assert.equal(state.settings.tutorialComplete, true);
  assert.equal(state.settings.continuityIntroduced, false);
  assert.equal(state.settings.foundryIntroduced, false);
  assert.equal(getProgressiveDisclosure(state).settlement, true);
});

test("QA overrides expose research, Continuity, resources, and expert crew", () => {
  let state = createQaCheckpoint(5, 1_000_000);
  state = grantQaResources(state);
  assert.ok(state.living.salvage >= 1_000_000_000);
  assert.ok(Object.values(state.researchStock).every((value) => value > 0));

  state = completeQaResearch(state);
  assert.equal(state.research.completedProjectIds.length, RESEARCH_PROJECT_DEFINITIONS.length);

  state = boostQaCrew(state);
  assert.ok(state.survivors.survivors.length > 0);
  assert.ok(state.survivors.survivors.filter((survivor) => survivor.role !== "civilian").every((survivor) => getSurvivorBestSkillLevel(survivor) === 10));

  state = prepareQaContinuity(state);
  const world = getCampaignWorld("vesper")!;
  assert.equal(state.missions.awaitingAcknowledgement, true);
  assert.deepEqual(state.worldProgress.completedInfrastructureIds, world.infrastructure.map((objective) => objective.id));
  assert.deepEqual(state.worldProgress.completedExpeditionIds, world.requiredExpeditionIds);
});
