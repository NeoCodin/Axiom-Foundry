import assert from "node:assert/strict";
import test from "node:test";
import { placeState, RECORD_PLACES, recordLines, recordSpot, SEARCH_ROOMS, fragmentOf } from "../app/ark-walk-records.ts";
import { buildWalkLayout, isWalkable, LOWER_DECK, UPPER_DECK, type WalkRoomKind } from "../app/ark-walk-layout.ts";
import { DISCOVERY_FRAGMENTS, DISCOVERY_IDS } from "../app/discovery-content.ts";

const kinds = [...new Set<WalkRoomKind>([...UPPER_DECK, ...LOWER_DECK])];
const fullShip = buildWalkLayout(kinds.map((kind) => ({ kind, label: kind, online: true })), { residents: 30, armory: true });

test("every record the archive can hold has exactly one place aboard", () => {
  const placed = RECORD_PLACES.flatMap((place) => place.records);
  assert.deepEqual([...placed].sort(), [...DISCOVERY_IDS].sort());
  assert.equal(new Set(RECORD_PLACES.map((place) => place.id)).size, RECORD_PLACES.length);
});

test("each search happens in the room the story names", () => {
  const where = (id: string) => RECORD_PLACES.find((place) => (place.records as readonly string[]).includes(id))!;
  assert.deepEqual(SEARCH_ROOMS, {
    "fabrication.preconcordance-keel": "fabrication-floor",
    "foreman.message-seven": "recalibration-vault",
    "lyra.private-amendment": "memory-archive",
  });
  assert.equal(where("fabrication.preconcordance-keel").section, "fabrication", "the Fabrication Floor's seam");
  assert.equal(where("foreman.message-seven").form, "vault", "the Recalibration Vault");
  assert.equal(where("lyra.private-amendment").side, "library", "the Memory Archive is the Learning Deck's library");
  // The archive's comparisons are made at the archive, which keeps what they find.
  for (const fragment of DISCOVERY_FRAGMENTS.filter((candidate) => candidate.unlock.kind === "archive-action" && candidate.id !== "foreman.unsent-choice")) {
    assert.equal(where(fragment.id).id, "memory-archive", fragment.id);
  }
});

test("every place is in its room, and the drone can get in front of it", () => {
  for (const place of RECORD_PLACES) {
    const spot = recordSpot(place, fullShip);
    assert.ok(spot, place.id);
    const deck = fullShip.decks[spot.deck];
    assert.ok(spot.y >= deck.floorY && spot.y <= deck.floorY + 3, `${place.id}: within reach of the floor`);
    const room = place.side
      ? deck.sideRooms.find((candidate) => candidate.kind === place.side)!
      : { ...deck.compartments.find((candidate) => candidate.kind === place.section)!, z0: -fullShip.halfDepth, z1: fullShip.halfDepth };
    assert.ok(spot.x >= room.x0 && spot.x <= room.x1 && spot.z >= room.z0 && spot.z <= room.z1, `${place.id}: inside its room`);
    const stand = { x: spot.x + spot.normal.x, z: spot.z + spot.normal.z };
    assert.ok(isWalkable(deck, stand.x, stand.z, 0.35), `${place.id}: the drone can hover a metre in front (${stand.x.toFixed(1)}, ${stand.z.toFixed(1)})`);
  }
  // Places in rooms that are not there yet are simply absent.
  const noArmory = buildWalkLayout(kinds.map((kind) => ({ kind, label: kind, online: true })), { residents: 30, armory: false });
  const lattice = RECORD_PLACES.find((place) => place.id === "shield-lattice")!;
  assert.ok(recordSpot(lattice, noArmory), "the Armory is built, though sealed, before it is unlocked");
});

test("what each place shows: empty cases wait, a seam appears when the story points at it", () => {
  const place = (id: string) => RECORD_PLACES.find((candidate) => candidate.id === id)!;
  const early = ["lyra.official-brief", "core.welcome-back", "helion.impossible-registry"];
  assert.equal(placeState(place("foundation-seam"), early, null, false).visible, false, "nothing to see yet");
  const lead = placeState(place("foundation-seam"), early, "fabrication.preconcordance-keel", false);
  assert.ok(lead.visible && lead.search && lead.found.length === 0);
  const sample = placeState(place("keel-sample"), early, null, false);
  assert.ok(sample.visible && sample.found.length === 0, "the case is on the wall, empty");
  assert.equal(placeState(place("scar-record"), early, null, false).visible, false);
  assert.equal(placeState(place("scar-record"), [...early, "foreman.message-seven"], null, false).visible, true, "Foreman Seven says to look for scars");
  const archive = placeState(place("memory-archive"), [...early, "archive.construction-zero"], null, true);
  assert.deepEqual(archive.found.map((fragment) => fragment.id), ["lyra.official-brief", "archive.construction-zero"]);
  assert.ok(archive.crossIndex);
  assert.equal(placeState(place("keel-sample"), early, null, true).crossIndex, false, "comparisons only at the archive");
});

test("a record reads as its source's words, then what AXIOM makes of them", () => {
  const lines = recordLines(fragmentOf("foreman.message-seven")!);
  assert.equal(lines[0].speaker, "Recalibration Vault · impossible voiceprint");
  assert.match(lines[1].text, /scars in the walls/);
  assert.deepEqual(lines.at(-1), { speaker: "AXIOM", text: "The speaker has your voice and identifies themself as Foreman Seven." });
  assert.ok(recordLines(fragmentOf("lyra.private-amendment")!).every((line) => line.speaker !== "AXIOM"), "Lyra's own words stand alone");
});
