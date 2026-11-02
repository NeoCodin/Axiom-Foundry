import assert from "node:assert/strict";
import test from "node:test";
import { LYING, planCrew, ROOM_SPOTS, SEATED, type WalkCrewMember } from "../app/ark-walk-crew.ts";
import { buildWalkLayout, isWalkable, LOWER_DECK, UPPER_DECK, type WalkRoomKind } from "../app/ark-walk-layout.ts";

const everyRoom = [...new Set([...UPPER_DECK, ...LOWER_DECK])].map((kind) => ({ kind, label: kind, online: true }));
const allOnline = () => true;
const member = (id: string, role: string, extra: Partial<WalkCrewMember> = {}): WalkCrewMember => ({ id, name: id, role, ...extra });

test("everyone aboard gets one place, nobody shares a spot, and conversations come in pairs", () => {
  const crew = [
    ...["engineer", "engineer", "technician", "fabricator", "engineer", "engineer"].map((role, index) => member(`e${index}`, role)),
    ...["researcher", "researcher", "researcher", "researcher", "researcher"].map((role, index) => member(`r${index}`, role)),
    member("d0", "doctor"), member("f0", "farmer"), member("f1", "farmer"), member("t0", "teacher"), member("n0", "navigator"),
    member("s0", "soldier"), member("s1", "security"),
    ...Array.from({ length: 9 }, (_, index) => member(`c${index}`, "civilian")),
  ];
  const plan = planCrew(crew, allOnline);
  const ids = [...plan.placed.map((placement) => placement.member.id), ...plan.roaming.map((person) => person.id)];
  assert.equal(new Set(ids).size, ids.length, "nobody is in two places");
  assert.equal(ids.length, crew.length, "everyone is somewhere");
  const spots = plan.placed.map((placement) => `${placement.room}:${placement.index}`);
  assert.equal(new Set(spots).size, spots.length, "no spot holds two people");
  const pairs = new Map<string, number>();
  for (const placement of plan.placed) {
    if (placement.spot.pair) pairs.set(placement.spot.pair, (pairs.get(placement.spot.pair) ?? 0) + 1);
  }
  for (const [pair, count] of pairs) assert.equal(count, 2, `${pair} has a partner`);
  const at = (id: string) => plan.placed.find((placement) => placement.member.id === id);
  assert.equal(at("n0")?.spot.activity, "pilot", "the navigator flies");
  assert.equal(at("t0")?.spot.activity, "teach", "the teacher teaches");
});

test("the wounded rest in the sick bay with a doctor at their side, and the rest go to their bunks", () => {
  const crew = [member("w0", "engineer", { resting: true }), member("w1", "farmer", { resting: true }), member("w2", "civilian", { resting: true }), member("d0", "doctor")];
  const plan = planCrew(crew, allOnline);
  const activity = (id: string) => plan.placed.find((placement) => placement.member.id === id)?.spot.activity;
  assert.equal(activity("w0"), "patient");
  assert.equal(activity("w1"), "patient");
  assert.equal(activity("w2"), "sleep", "the sick bay has two beds");
  assert.equal(activity("d0"), "heal");
  const quiet = planCrew([member("d0", "doctor")], allOnline);
  assert.notEqual(quiet.placed[0]?.spot.activity, "heal", "with nobody hurt the doctor has other work");
});

test("trainees and children are in class; the recon team is not aboard", () => {
  const crew = [member("a", "engineer", { training: true }), member("b", "civilian", { ageGroup: "child" }), member("c", "soldier")];
  const plan = planCrew(crew, allOnline, new Set(["c"]));
  assert.deepEqual(plan.placed.filter((placement) => placement.spot.activity === "study").map((placement) => placement.member.id).sort(), ["a", "b"]);
  assert.ok(!plan.placed.some((placement) => placement.member.id === "c") && !plan.roaming.some((person) => person.id === "c"));
});

test("a dormant room sends its people to Habitation", () => {
  const plan = planCrew([member("r", "researcher"), member("s", "researcher")], (room) => room !== "research");
  assert.ok(plan.placed.every((placement) => placement.room === "habitation"));
});

test("every place someone stands or walks is clear floor", () => {
  const layout = buildWalkLayout(everyRoom, { residents: 99, armory: true });
  for (const [room, spots] of Object.entries(ROOM_SPOTS) as [WalkRoomKind, (typeof ROOM_SPOTS)[WalkRoomKind]][]) {
    for (const spot of spots) {
      if (SEATED.has(spot.activity) || LYING.has(spot.activity)) continue;
      const deck = layout.decks[spot.deck ?? layout.decks.findIndex((candidate) => candidate.compartments.some((compartment) => compartment.kind === room))];
      const compartment = deck.compartments.find((candidate) => candidate.kind === room)!;
      for (const place of [spot.at, spot.to].filter((value) => value !== undefined)) {
        assert.ok(isWalkable(deck, compartment.x0 + place.x, place.z, 0.25), `${room} ${spot.activity} at ${place.x}, ${place.z}`);
      }
    }
  }
});
