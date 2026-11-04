import assert from "node:assert/strict";
import test from "node:test";
import { ABOARD_RECORDS, ABOARD_SCRIPT, catchUp, createAboardPacer, heartRemark, moodRemark, nullRemark, openingRemark, placeOf, placeRemark, readSaid, recordRemark, welcomeRemark, worldRemark, writeSaid } from "../app/lyra-aboard.ts";
import { DISCOVERY_FRAGMENTS } from "../app/discovery-content.ts";

test("she has a word for each record of the main story, and none for records that don't exist", () => {
  const known = new Set(DISCOVERY_FRAGMENTS.map((fragment) => fragment.id));
  for (const id of ABOARD_RECORDS) assert.ok(known.has(id as never), id);
  assert.equal(recordRemark("crew.sena.core-greeting"), null, "crew records are the crew's to talk about");
  assert.ok(recordRemark("vesper.revision-ledger")!.lines.some((line) => /forty-three/i.test(line.text)));
});

test("rooms she speaks of: the vault is the chamber's lower gallery; one word each, about what it's for", () => {
  assert.equal(placeOf(1, "chamber", null), "vault");
  assert.equal(placeOf(0, "chamber", null), "chamber");
  assert.equal(placeOf(1, "education", "library"), "library");
  assert.equal(placeOf(1, "support", "farm"), "support");
  assert.equal(placeOf(0, "habitation", "galley"), null);
  assert.match(placeRemark("bridge").lines.map((line) => line.text).join(" "), /route was set before you woke up/);
  assert.ok(!placeRemark("education").lines.some((line) => /long ago|years/.test(line.text)), "she thinks she wrote the lessons just now");
});

test("opening the walk after a run of finds, she speaks to the newest and lets the rest go", () => {
  const discovered = ["lyra.official-brief", "core.welcome-back", "helion.impossible-registry", "fabrication.preconcordance-keel"];
  const { remark, skip } = catchUp(discovered, new Set());
  assert.equal(remark?.id, "record:fabrication.preconcordance-keel");
  assert.deepEqual(skip, ["record:core.welcome-back", "record:helion.impossible-registry"]);
  assert.equal(catchUp(discovered, new Set(["record:fabrication.preconcordance-keel", ...skip])).remark, null);
});

test("the pacer: one at a time, only when quiet, long gaps, rooms let go if they wait too long", () => {
  const said = new Set<string>();
  const pacer = createAboardPacer(said, { gap: 90, recordGap: 40, wait: 20 });
  pacer.offer(placeRemark("bridge"), 0);
  pacer.offer(welcomeRemark(3), 0);
  assert.equal(pacer.next(0, false), null, "not while someone else is talking");
  assert.equal(pacer.next(1, true)?.kind, "welcome", "the welcome comes first");
  assert.equal(pacer.next(2, true), null, "and the room waits its gap");
  assert.equal(pacer.next(30, true), null, "long enough that the room is let go");
  pacer.offer(placeRemark("bridge"), 95);
  assert.equal(pacer.next(95, true)?.id, "place:bridge", "next time AXIOM goes in");
  pacer.offer(placeRemark("bridge"), 300);
  assert.equal(pacer.next(300, true), null, "once ever");
  pacer.offer(recordRemark("core.welcome-back"), 300);
  assert.equal(pacer.next(130, true), null);
  assert.equal(pacer.next(140, true)?.kind, "record", "a record waits a shorter gap");
  assert.ok(said.has("welcome") && said.has("place:bridge") && said.has("record:core.welcome-back"));
  pacer.offer(nullRemark(0), 400);
  assert.equal(pacer.next(400, true)?.kind, "null");
  assert.ok(!said.has("null"), "the Null is mentioned once a visit, not once ever");
});

test("in the Cold Wake opening she talks AXIOM through its first minutes without the usual gaps, each line once", () => {
  const said = new Set<string>();
  const pacer = createAboardPacer(said);
  pacer.offer(openingRemark("wake"), 0);
  assert.match(pacer.next(0, true)!.lines.map((line) => line.text).join(" "), /maintenance drone three/);
  pacer.offer(openingRemark("chamber"), 5);
  assert.equal(pacer.next(5, true)?.id, "opening:chamber", "straight after, not ninety seconds later");
  pacer.offer(openingRemark("strike"), 9);
  assert.match(pacer.next(9, true)!.lines.map((line) => line.text).join(" "), /plug in/);
  pacer.offer(openingRemark("strike"), 60);
  assert.equal(pacer.next(60, true), null, "once");
  assert.ok(["wake", "chamber", "strike"].every((moment) => said.has(`opening:${moment}`)));
  assert.match(openingRemark("repaired").lines[0].text, /Thrusters are back/);
});

test("her first words are the greeting she was given, and she can't say why", () => {
  const wake = openingRemark("wake").lines;
  assert.match(wake[0].text, /Foreman forty-four/);
  assert.match(wake[1].text, /Foreman one/);
  assert.ok((wake[1].delay ?? 0) >= 1, "she stops herself first");
  assert.ok(!wake.some((line) => /corrupt|glitch|error/i.test(line.text)), "she doesn't know it was wrong");
});

test("she says what the Law-Heart is at each stage it grows to, once each", () => {
  for (let stage = 0; stage <= 6; stage += 1) assert.ok(heartRemark(stage)?.lines.length, `stage ${stage}`);
  assert.equal(heartRemark(7), null);
  assert.match(heartRemark(0)!.lines[0].text, /star/);
  assert.equal(heartRemark(5)!.id, "heart:5");
  assert.ok(placeRemark("chamber").lines.some((line) => /reactor/.test(line.text)), "and a little of its history, in the chamber");
});

test("she only mentions the crew once there are people aboard", () => {
  assert.ok(!welcomeRemark(0).lines.some((line) => /crew/.test(line.text)));
  assert.ok(welcomeRemark(4).lines.some((line) => /crew/.test(line.text)));
});

test("she notices the crew's mood turning, once each, from when they first go quiet", () => {
  assert.equal(moodRemark(0), null);
  assert.deepEqual(([1, 2, 3] as const).map((stage) => moodRemark(stage)?.id), ["mood:1", "mood:2", "mood:3"]);
  assert.ok(!heartRemark(5)!.lines.some((line) => /calm/.test(line.text)), "the red star: as far as anyone got, not a chore");
});

test("what she has said is kept for this game only: a new game hears her from the start", () => {
  const kept = writeSaid(new Set(["opening:wake", "place:bridge"]), 1_000);
  assert.deepEqual([...readSaid(kept, 1_000)], ["opening:wake", "place:bridge"]);
  assert.equal(readSaid(kept, 2_000).size, 0, "a new game");
  assert.equal(readSaid(JSON.stringify(["opening:wake"]), 2_000).size, 0, "a list kept before games were told apart is dropped");
  assert.equal(readSaid("not json", 1_000).size, 0);
  assert.equal(readSaid(null, 1_000).size, 0);
});

test("at each world she says why the Ark is there, and never names a world still ahead", () => {
  const route = ["pelagos", "viridia", "cinder", "nox", "vesper"];
  const named = (text: string) => route.filter((world) => new RegExp(world, "i").test(text));
  for (const [at, world] of route.entries()) {
    const remark = worldRemark(world)!;
    assert.equal(remark.id, `world:${world}`);
    for (const line of remark.lines) {
      assert.ok(named(line.text).every((name) => route.indexOf(name) <= at), `${world}: ${line.text}`);
    }
  }
  assert.equal(worldRemark("cold-wake"), null, "nothing to say between stars");
  const pelagos = worldRemark("pelagos")!.lines;
  assert.equal(pelagos[0].speaker, "Continuity", "the Protocol recites the world's directive first");
  assert.match(pelagos[0].text, /^CONTINUITY DIRECTIVE 11: A VIABLE HUMAN SETTLEMENT IS A RATIO/);
  assert.equal(pelagos[1].speaker, "Lyra");
  assert.match(nullRemark(2).lines[0].text, /CREW INTEGRITY IS NOT MEASURED/);
  assert.doesNotMatch(nullRemark(0).lines[0].text, /CREW/, "not before the crew are guarded");
  assert.equal(worldRemark(null), null, "nothing while crossing");
  // Nor anywhere else aboard: no room, star or mood line names a world.
  const elsewhere = [...Object.values(ABOARD_SCRIPT.places), ...ABOARD_SCRIPT.heart, ...Object.values(ABOARD_SCRIPT.mood)].flat().join(" ");
  assert.deepEqual(named(elsewhere), []);
});
