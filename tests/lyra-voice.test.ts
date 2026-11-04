import assert from "node:assert/strict";
import test from "node:test";
import {
  createLyraDirector,
  isUrgent,
  LYRA_COVERAGE,
  lyraLines,
  lyraStage,
  pelagosCues,
  simCues,
  type PelagosReading,
  type SimReading,
} from "../app/lyra-voice.ts";

/** Hands out the given numbers in turn, then keeps giving the last. */
const sequence = (...values: number[]) => {
  let at = 0;
  return () => values[Math.min(at++, values.length - 1)];
};

test("every warning has words, and the story's mood sets how far Lyra has slipped", () => {
  for (const cue of LYRA_COVERAGE.cues) {
    const lines = lyraLines(cue, 0, () => 0.5, 4);
    assert.ok(lines.length >= 1 && lines.every((line) => line.text.length > 0), cue);
    assert.ok(!lines.some((line) => line.text.includes("{n}")), `${cue} fills in its number`);
  }
  assert.deepEqual(["grateful", "uneasy", "guarded", "haunted"].map((mood) => lyraStage(mood as "grateful")), [0, 1, 2, 3]);
});

test("early on she says exactly the warning, once, whatever the dice", () => {
  for (const roll of [0, 0.05, 0.2, 0.5, 0.99]) {
    const lines = lyraLines("link-25", 0, sequence(0, roll));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].voice, "lyra");
    assert.equal(lines[0].delay, undefined);
  }
});

test("the Continuity Protocol speaks first, flat and in capitals, when a drone is recalled or a run ends", () => {
  const lines = lyraLines("death", 0, () => 0.5);
  assert.equal(lines[0].speaker, "Continuity");
  assert.equal(lines[0].voice, "continuity");
  assert.equal(lines[0].text, lines[0].text.toUpperCase());
  assert.equal(lines[1].speaker, "Lyra");
});

test("as the truth comes out she slips: Foreman for AXIOM, a line said twice, a voice not hers, a warning too late, a plea", () => {
  const foreman = lyraLines("link-25", 1, sequence(0, 0));
  assert.match(foreman[0].text, /Foreman/);
  assert.equal(foreman[1].text, "AXIOM. I meant AXIOM.");

  const twice = lyraLines("wave", 1, sequence(0, 0.1));
  assert.equal(twice.length, 2);
  assert.equal(twice[1].text, twice[0].text, "word for word");
  assert.ok((twice[1].delay ?? 0) > 0);

  const bleed = lyraLines("wave", 2, sequence(0, 0.2, 0));
  assert.equal(bleed[1].voice, "bleed");
  assert.match(bleed[1].text, /^—.*—$/);

  const late = lyraLines("harrier-dive", 2, sequence(0, 0.05));
  assert.equal(late.length, 1);
  assert.equal(late[0].text, "It was above you.");
  assert.ok((late[0].delay ?? 0) >= 2, "said once the moment has passed");

  const plea = lyraLines("brute", 3, sequence(0, 0.35, 0));
  assert.equal(plea.length, 2);
  assert.match(plea[1].text, /before|repeating/);
});

test("the director: one warning at a time, each held back after it is said, urgent ones cut in", () => {
  const lyra = createLyraDirector(() => 0, () => 0.5);
  assert.ok(lyra.cue("wave", 0));
  assert.equal(lyra.cue("wave", 5), null, "not again so soon");
  assert.equal(lyra.cue("brute", 0.5), null, "she is still speaking");
  assert.ok(isUrgent("harrier-dive"));
  assert.ok(lyra.cue("harrier-dive", 0.5), "but a dive cuts in");
  assert.ok(lyra.cue("brute", 10));
  assert.ok(lyra.cue("wave", 31), "and in time the first may come again");
});

test("from the middle of the story, rarely, she warns of something that isn't there", () => {
  assert.equal(createLyraDirector(() => 1, () => 0).ambient(1_000), null, "not while the crew are only uneasy");
  const haunted = createLyraDirector(() => 3, () => 0.1);
  assert.equal(haunted.ambient(100), null, "not straight away");
  const phantom = haunted.ambient(200);
  assert.ok(phantom && phantom.length === 1 && phantom[0].speaker === "Lyra");
  assert.equal(haunted.ambient(250), null, "and not often");
});

const steady: SimReading = { alive: true, health: 1, heat: 0, venting: false, charge: 1, swapping: false, spare: 2, powered: true };

test("in the simulator she watches the coils, the cell, the dome and the sim-body", () => {
  assert.deepEqual(simCues(null, steady), [], "nothing on the first frame");
  assert.deepEqual(simCues(steady, { ...steady, heat: 0.92 }), ["heat-high"]);
  assert.deepEqual(simCues({ ...steady, heat: 0.95 }, { ...steady, heat: 1, venting: true }), ["venting"]);
  assert.deepEqual(simCues({ ...steady, powered: false }, { ...steady, powered: false, charge: 0.1 }), ["cell-low"]);
  assert.deepEqual(simCues(steady, { ...steady, charge: 0.1 }), [], "no need while the dome refills it");
  assert.deepEqual(simCues({ ...steady, spare: 1 }, { ...steady, spare: 0 }), ["spare-last"]);
  assert.deepEqual(simCues(steady, { ...steady, powered: false }), ["outside-dome"]);
  assert.deepEqual(simCues(steady, { ...steady, health: 0.2 }), ["health-low"]);
  assert.deepEqual(simCues({ ...steady, health: 0.2 }, { ...steady, health: 0, alive: false }), ["death"]);
  assert.deepEqual(simCues({ ...steady, alive: false }, { ...steady, alive: false }), [], "once");
});

test("on a stealth run she warns of being watched, of the alarm, and of a Hollowed close by", () => {
  const quiet = { ...steady, spotted: 0, alarm: false, glitch: 0 };
  assert.deepEqual(simCues(quiet, { ...quiet, spotted: 0.6 }), ["spotted"]);
  assert.deepEqual(simCues({ ...quiet, spotted: 0.9 }, { ...quiet, spotted: 1, alarm: true }), ["alarm"]);
  assert.deepEqual(simCues(quiet, { ...quiet, glitch: 0.4 }), ["hollowed"]);
});

const home: PelagosReading = { link: 1, inDome: true, lost: false, pushed: false, failingWalls: 0, water: 6, food: 10, survivors: 3, signalNear: false };

test("on Pelagos she follows the link out of the dome and calls the shelter's needs", () => {
  const cues = (before: PelagosReading, now: PelagosReading) => pelagosCues(before, now).map((said) => said.cue);
  assert.deepEqual(cues(home, { ...home, inDome: false, link: 0.95 }), ["dome-leave"]);
  assert.deepEqual(cues({ ...home, link: 0.55 }, { ...home, link: 0.45 }), ["link-50"]);
  assert.deepEqual(cues({ ...home, link: 0.3 }, { ...home, link: 0.2 }), ["link-25"]);
  assert.deepEqual(cues({ ...home, link: 0.05 }, { ...home, link: 0, lost: true }), ["link-lost"]);
  assert.deepEqual(cues({ ...home, link: null }, { ...home, link: null, inDome: false }), [], "not from overhead");
  assert.deepEqual(cues(home, { ...home, pushed: true, failingWalls: 1 }), ["pushed", "walls-failing"]);
  assert.deepEqual(cues(home, { ...home, water: 1.4, food: 1.2 }), ["water-low", "food-low"]);
  assert.deepEqual(cues(home, { ...home, signalNear: true }), ["signal-near"]);
  assert.deepEqual(pelagosCues(home, { ...home, survivors: 5 }), [{ cue: "survivors-arrived", n: 5 }]);
});
