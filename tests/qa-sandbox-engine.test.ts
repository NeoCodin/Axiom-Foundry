import assert from "node:assert/strict";
import test from "node:test";

import { COLD_WAKE_FOUNDRY_STAGE, MISSIONS, SAVE_KEY } from "../app/game-engine.ts";
import { CAMPAIGN_WORLD_IDS, getCampaignWorld } from "../app/campaign-content.ts";
import {
  RESEARCH_PROJECT_DEFINITIONS,
  createResearchLatticeState,
  selectResearchProject,
} from "../app/research-engine.ts";
import { getSurvivorBestSkillLevel } from "../app/survivor-engine.ts";
import { getProgressiveDisclosure } from "../app/progressive-disclosure.ts";
import {
  QA_SAVE_KEY,
  QA_RESOURCE_GRANT,
  QA_RESEARCH_EVIDENCE_GRANT,
  addQaFlux,
  boostQaCrew,
  completeQaActiveResearch,
  completeQaResearch,
  createQaCheckpoint,
  createQaPelagosOnboardingCheckpoint,
  createQaPlanetIntroductionCheckpoint,
  createQaResearchIntroductionCheckpoint,
  createQaTransitCheckpoint,
  fillQaResearchLattice,
  grantQaResources,
  prepareQaContinuity,
  resetQaResearch,
  setQaAxioms,
  stockQaResearchEvidence,
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

test("QA Axiom override sets exact spendable and lifetime stages", () => {
  const state = createQaCheckpoint(4, 1_000_000);
  const redStage = setQaAxioms(state, 24);
  assert.equal(redStage.axioms, 24);
  assert.equal(redStage.lifetimeAxioms, 24);
  assert.equal(redStage.cycle, 25);

  const dormantStage = setQaAxioms(redStage, 0);
  assert.equal(dormantStage.axioms, 0);
  assert.equal(dormantStage.lifetimeAxioms, 0);
  assert.equal(dormantStage.cycle, 1);
});

test("QA world checkpoints are fresh arrivals rather than completed or overpowered saves", () => {
  assert.notEqual(QA_SAVE_KEY, SAVE_KEY);
  for (const [index, worldId] of CAMPAIGN_WORLD_IDS.entries()) {
    const state = createQaCheckpoint(index, 1_000_000);
    const expectedFlux = index === 0 ? 0 : MISSIONS[index - 1].landingFlux;
    assert.equal(state.missions.currentIndex, index);
    assert.equal(state.settlement.currentWorldId, worldId);
    assert.deepEqual(state.settlement.completedWorldIds, CAMPAIGN_WORLD_IDS.slice(0, index));
    assert.equal(state.settings.tutorialComplete, true);
    assert.equal(state.settings.continuityIntroduced, index > 0);
    assert.equal(state.settings.researchIntroduced, index >= 3);
    assert.equal(state.flux, expectedFlux);
    assert.equal(state.maxFlux, expectedFlux);
    assert.equal(state.runFlux, 0);
    assert.ok(state.flux < QA_RESOURCE_GRANT);
    assert.ok(state.axioms < 100);
    assert.ok(state.living.salvage < 100_000);
    assert.equal(state.missions.stageIndex, 0);
    assert.equal(state.missions.awaitingAcknowledgement, false);
    assert.equal(state.settings.autoEnabled, false);
    assert.equal(state.settings.autoUpgrades, false);
    assert.deepEqual(state.worldProgress.completedInfrastructureIds, []);
    assert.deepEqual(state.worldProgress.resolvedCrisisIds, []);
    assert.equal(state.worldProgress.surveysCompleted, 0);
    assert.equal(state.expeditions.active, null);
    assert.ok(state.runUpgrades.every((level) => level === 0));
    assert.deepEqual(
      state.missions.baseline.tierBought,
      state.tiers.map((tier) => tier.bought),
    );
  }
});

test("QA can replay Pelagos and Viridia introductions with public unlock rules", () => {
  const pelagos = createQaPelagosOnboardingCheckpoint(1_000_000);
  assert.equal(pelagos.settlement.currentWorldId, "pelagos");
  assert.equal(pelagos.survivors.survivors.length, 0);
  assert.equal(getProgressiveDisclosure(pelagos).research, false);
  assert.equal(pelagos.settings.completedGuideIds.includes("pelagos-arrival"), false);

  const viridia = createQaResearchIntroductionCheckpoint(1_000_000);
  assert.equal(viridia.settlement.currentWorldId, "viridia");
  assert.equal(viridia.settings.researchIntroduced, false);
  assert.equal(getProgressiveDisclosure(viridia).research, true);
  assert.equal(viridia.settings.completedGuideIds.includes("viridia-research"), false);
});

test("QA travel previews enter a real live corridor between adjacent worlds", () => {
  const now = 1_000_000;
  const state = createQaTransitCheckpoint(1, now);
  assert.equal(state.missions.currentIndex, 1);
  assert.equal(state.settlement.currentWorldId, null);
  assert.ok(state.transit.active);
  assert.equal(state.transit.active?.originWorldId, "pelagos");
  assert.equal(state.transit.active?.destinationWorldId, "viridia");
  assert.equal(state.transit.active?.elapsedSeconds, 0);
  assert.ok((state.transit.active?.totalSeconds ?? 0) > 0);
  assert.equal(state.transit.active?.startedAt, now);
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

test("QA Research controls reset projects without resetting the world or crew", () => {
  const state = completeQaResearch(createQaCheckpoint(5, 1_000_000));
  const next = resetQaResearch(state);
  assert.deepEqual(next.research, createResearchLatticeState());
  assert.deepEqual(next.settlement, state.settlement);
  assert.deepEqual(next.survivors, state.survivors);
  assert.deepEqual(next.researchStock, state.researchStock);
});

test("QA can stock Ark evidence and loaded Lattice reservoirs independently", () => {
  const state = resetQaResearch(createQaCheckpoint(5, 1_000_000));
  const stocked = stockQaResearchEvidence(state);
  assert.ok(
    Object.values(stocked.researchStock).every(
      (value) => value === QA_RESEARCH_EVIDENCE_GRANT,
    ),
  );
  assert.ok(Object.values(stocked.research.inventory).every((value) => value === 0));

  const loaded = fillQaResearchLattice(state);
  assert.ok(Object.values(loaded.research.inventory).every((value) => value === QA_RESOURCE_GRANT));
  assert.deepEqual(loaded.researchStock, state.researchStock);
});

test("QA completes only the active Research project when requested", () => {
  const state = resetQaResearch(createQaCheckpoint(5, 1_000_000));
  assert.strictEqual(completeQaActiveResearch(state), state);
  const active = {
    ...state,
    research: selectResearchProject(
      state.research,
      "resonance-stabilization",
      1_000_000,
    ),
  };
  const completed = completeQaActiveResearch(active);
  assert.equal(completed.research.activeProjectId, null);
  assert.equal(completed.research.completedProjectIds.includes("resonance-stabilization"), true);
  assert.equal(
    completed.research.completedProjectIds.length,
    active.research.completedProjectIds.length + 1,
  );
});
