import assert from "node:assert/strict";
import test from "node:test";

import {
  addDiscovery,
  getDoctrineAvailability,
  getExpeditionDiscovery,
  getNextArchiveDiscovery,
  getNextRoomDiscovery,
  syncAutomaticDiscoveries,
} from "../app/discovery-engine.ts";

test("orientation and saved worlds reveal only the next supported truths", () => {
  const started = syncAutomaticDiscoveries([], 0, true);
  assert.deepEqual(started, ["lyra.official-brief", "core.welcome-back"]);

  const helion = syncAutomaticDiscoveries(started, 1, true);
  assert.ok(helion.includes("helion.impossible-registry"));
  assert.equal(helion.includes("archive.construction-zero"), false);
});

test("room investigations respect requirements and room level", () => {
  const discovered = [
    "lyra.official-brief",
    "core.welcome-back",
    "helion.impossible-registry",
  ];
  assert.equal(
    getNextRoomDiscovery(discovered, "fabrication-floor", 1),
    null,
  );
  assert.equal(
    getNextRoomDiscovery(discovered, "fabrication-floor", 2)?.id,
    "fabrication.preconcordance-keel",
  );
});

test("archive and expedition discoveries never skip their evidence chain", () => {
  const early = ["lyra.official-brief", "core.welcome-back"];
  assert.equal(getNextArchiveDiscovery(early), null);
  assert.equal(getExpeditionDiscovery(early, "kestrel"), null);

  const archiveReady = [
    ...early,
    "helion.impossible-registry",
    "fabrication.preconcordance-keel",
  ];
  assert.equal(
    getNextArchiveDiscovery(archiveReady)?.id,
    "archive.construction-zero",
  );
});

test("doctrine choices unlock from discoveries rather than timers", () => {
  const concordance = getDoctrineAvailability(["lyra.official-brief"], 6);
  assert.equal(
    concordance.find(({ doctrine }) => doctrine.id === "concordance")?.available,
    true,
  );
  assert.equal(
    concordance.find(({ doctrine }) => doctrine.id === "genesis")?.available,
    false,
  );

  const expanded = addDiscovery(
    ["lyra.official-brief"],
    "helion.impossible-registry",
  );
  assert.deepEqual(expanded, [
    "lyra.official-brief",
    "helion.impossible-registry",
  ]);
});
