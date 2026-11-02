import assert from "node:assert/strict";
import test from "node:test";

import {
  addDiscovery,
  getDoctrineAvailability,
  getExpeditionDiscovery,
  getNextArchiveDiscovery,
  getNextRoomDiscovery,
  getRoomInvestigation,
  syncAutomaticDiscoveries,
} from "../app/discovery-engine.ts";
import { DISCOVERY_IDS } from "../app/discovery-content.ts";
import { EXPEDITION_SITE_DEFINITIONS } from "../app/expedition-engine.ts";
import { ROOM_DEFINITIONS } from "../app/living-foundry-engine.ts";

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

test("the room the story is waiting on is named, and searchable once reinforced", () => {
  const discovered = syncAutomaticDiscoveries([], 1, true);
  const rooms = (level: number) => [{ id: "fabrication-floor" as const, level }];
  const sealed = getRoomInvestigation(discovered, [{ id: "fabrication-floor", level: 0 }]);
  assert.equal(sealed?.fragment.id, "fabrication.preconcordance-keel");
  assert.equal(sealed?.ready, false);
  assert.equal(getRoomInvestigation(discovered, rooms(1))?.ready, false, "the seam needs a reinforced floor");
  const ready = getRoomInvestigation(discovered, rooms(2));
  assert.equal(ready?.ready, true);
  assert.equal(ready?.roomId, "fabrication-floor");
  assert.equal(getRoomInvestigation(syncAutomaticDiscoveries([], 0, true), rooms(2)), null, "nothing to search before the evidence");
});

test("the whole story can be reached through play, and every ending with it", () => {
  // Every way the game actually hands out records: saved worlds, the archive's
  // cross-index, room searches, and the records expeditions bring home.
  const expeditionRecords = EXPEDITION_SITE_DEFINITIONS
    .map((site) => site.rewards.discoveryId)
    .filter((id): id is string => typeof id === "string" && (DISCOVERY_IDS as readonly string[]).includes(id));
  const allRooms = ROOM_DEFINITIONS.map((room) => ({ id: room.id, level: room.maxLevel }));
  let discovered: string[] = [];
  for (let worldsSaved = 0; worldsSaved <= 6; worldsSaved += 1) {
    discovered = [...new Set([...discovered, ...expeditionRecords])];
    for (let guard = 0; guard < 40; guard += 1) {
      const before = discovered.length;
      discovered = syncAutomaticDiscoveries(discovered, worldsSaved, true);
      const archive = getNextArchiveDiscovery(discovered);
      if (archive) discovered = addDiscovery(discovered, archive.id);
      const room = getRoomInvestigation(discovered, allRooms);
      if (room?.ready) discovered = addDiscovery(discovered, room.fragment.id);
      if (discovered.length === before) break;
    }
  }
  const missing = DISCOVERY_IDS.filter((id) => !discovered.includes(id));
  assert.deepEqual(missing, [], "every record is reachable");
  for (const { doctrine, available } of getDoctrineAvailability(discovered, 6)) {
    assert.ok(available, `the ${doctrine.id} ending can be chosen`);
  }
});
