import assert from "node:assert/strict";
import test from "node:test";

import { SAVE_KEY } from "../app/game-engine.ts";
import { CAMPAIGN_WORLD_IDS, getCampaignWorld } from "../app/campaign-content.ts";
import { RESEARCH_PROJECT_DEFINITIONS } from "../app/research-engine.ts";
import { getSurvivorBestSkillLevel } from "../app/survivor-engine.ts";
import {
  QA_SAVE_KEY,
  boostQaCrew,
  completeQaResearch,
  createQaCheckpoint,
  grantQaResources,
  prepareQaContinuity,
} from "../app/qa-sandbox-engine.ts";

test("QA checkpoints are isolated, valid campaign snapshots", () => {
  assert.notEqual(QA_SAVE_KEY, SAVE_KEY);
  for (const [index, worldId] of CAMPAIGN_WORLD_IDS.entries()) {
    const state = createQaCheckpoint(index, 1_000_000);
    assert.equal(state.missions.currentIndex, index);
    assert.equal(state.settlement.currentWorldId, worldId);
    assert.deepEqual(state.settlement.completedWorldIds, CAMPAIGN_WORLD_IDS.slice(0, index));
    assert.equal(state.settings.tutorialComplete, true);
    assert.ok(state.flux > 0);
  }
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
