import assert from "node:assert/strict";
import test from "node:test";

import {
  CAUSAL_EVIDENCE_DEFINITIONS,
  getCausalArchive,
} from "../app/causal-archive-engine.ts";

const empty = {
  defenseFragmentIds: [] as string[],
  planetaryFragmentIds: [] as string[],
  completedResearchIds: [] as string[],
  completedExpeditionIds: [] as string[],
  completedWorldIds: [] as string[],
  firstContactResolved: false,
  hostileEventsResolved: 0,
};

test("contact classifications advance only through real cross-system evidence", () => {
  const quiet = getCausalArchive(empty);
  assert.equal(quiet.activeClassification.id, "unknown-contacts");
  assert.equal(quiet.readinessBonus, 0);

  const retrograde = getCausalArchive({
    ...empty,
    firstContactResolved: true,
    defenseFragmentIds: ["contact-before-cause", "protected-lifeboat", "returned-navigation"],
  });
  assert.equal(retrograde.activeClassification.id, "retrograde-vessels");
  assert.equal(retrograde.identificationBonus, 1);

  const causal = getCausalArchive({
    ...empty,
    firstContactResolved: true,
    defenseFragmentIds: ["contact-before-cause", "protected-lifeboat", "returned-navigation", "ark-casualty-index"],
    planetaryFragmentIds: ["vector-without-origin", "civilian-exclusion"],
    completedResearchIds: ["temporal-signal-analysis", "causal-threat-projection"],
    completedWorldIds: ["pelagos"],
  });
  assert.equal(causal.activeClassification.id, "causal-interdictors");
  assert.equal(causal.readinessBonus, 4);
  assert.equal(causal.forecastSeconds, 120);
});

test("The Returned remains a provisional late-campaign synthesis", () => {
  const defenseFragmentIds = CAUSAL_EVIDENCE_DEFINITIONS.filter((entry) => entry.source === "ark-defense").map((entry) => entry.sourceId);
  const planetaryFragmentIds = CAUSAL_EVIDENCE_DEFINITIONS.filter((entry) => entry.source === "planetary-defense").map((entry) => entry.sourceId);
  const archive = getCausalArchive({
    defenseFragmentIds,
    planetaryFragmentIds,
    completedResearchIds: ["temporal-signal-analysis", "causal-threat-projection", "returned-origin-hypothesis"],
    completedExpeditionIds: ["causal-wreckage"],
    completedWorldIds: ["pelagos", "viridia", "cinder", "nox", "vesper"],
    firstContactResolved: true,
    hostileEventsResolved: 8,
  });
  assert.equal(archive.activeClassification.id, "the-returned");
  assert.match(archive.activeClassification.summary, /classification, not a conclusion/i);
  assert.equal(archive.readinessBonus, 6);
  assert.equal(archive.identificationBonus, 3);
});
