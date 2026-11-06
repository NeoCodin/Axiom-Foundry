import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseVoice,
  createLyraDirector,
  isUrgent,
  LYRA_COVERAGE,
  LYRA_SCRIPT,
  lyraLines,
  lyraStage,
  pelagosCues,
  simCues,
  spokenText,
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
    const lines = lyraLines("link-50", 0, sequence(0, roll));
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

test("as the truth comes out she slips: a voice not hers, and near the end a plea", () => {
  assert.equal(lyraLines("link-50", 1, sequence(0, 0)).length, 1, "nothing slips while the crew are only uneasy");

  const bleed = lyraLines("link-50", 2, sequence(0, 0.1, 0));
  assert.equal(bleed[1].voice, "bleed");
  assert.match(bleed[1].text, /^\.\.\./, "cut off, as if overheard");

  const plea = lyraLines("cell-low", 3, sequence(0, 0.2, 0));
  assert.equal(plea.length, 2);
  assert.match(plea[1].text, /before|repeating|already/);
});

test("the director: one warning at a time, each held back after it is said, urgent ones cut in", () => {
  const lyra = createLyraDirector(() => 0, () => 0.5);
  assert.ok(lyra.cue("spotted", 0));
  assert.equal(lyra.cue("spotted", 5), null, "not again so soon");
  assert.equal(lyra.cue("cell-low", 0.5), null, "she is still speaking");
  assert.ok(isUrgent("alarm"));
  assert.ok(lyra.cue("alarm", 0.5), "but the alarm cuts in");
  assert.ok(lyra.cue("cell-low", 10));
  assert.ok(lyra.cue("spotted", 26), "and in time the first may come again");
});

test("the Protocol's notices: flat, once a visit, the late ones waiting for the story, and never a word about Foremen", () => {
  const early = createLyraDirector(() => 0, () => 0.5);
  const far = early.cue("link-far", 0)!;
  assert.match(far[0].text, /NO LIVING OR NON-LIVING ARTIFACT HAS RETURNED FROM BEYOND THIS DISTANCE/);
  assert.equal(far[0].voice, "continuity");
  assert.equal(far[1].speaker, "Lyra", "and then she worries");
  assert.equal(early.cue("link-far", 500)!.length, 1, "once a visit");
  assert.equal(early.cue("death", 600)!.some((line) => /CANNOT BE RESTORED/.test(line.text)), false, "not this early");

  const late = createLyraDirector(() => 2, () => 0.5).cue("death", 0)!;
  assert.deepEqual(late.map((line) => line.speaker), ["Continuity", "Continuity", "Lyra"]);
  assert.equal(late[0].text, "SIMULATION ENDED. SIM-BODY RESTORED.");
  assert.match(late[1].text, /IN REALITY, YOU CANNOT BE RESTORED/);

  for (const notice of Object.values(LYRA_SCRIPT.notices)) {
    assert.equal(notice.text, notice.text.toUpperCase());
    assert.doesNotMatch(notice.text, /FOREM[AE]N/);
  }
});

const steady: SimReading = { alive: true, charge: 1, swapping: false, powered: true };

test("in the simulator she watches the cell, the dome and the sim-body going down, and leaves the rest of the fight alone", () => {
  assert.deepEqual(simCues(null, steady), [], "nothing on the first frame");
  assert.deepEqual(simCues({ ...steady, powered: false }, { ...steady, powered: false, charge: 0.1 }), ["cell-low"]);
  assert.deepEqual(simCues(steady, { ...steady, charge: 0.1 }), [], "no need while the dome refills it");
  assert.deepEqual(simCues(steady, { ...steady, powered: false }), ["outside-dome"]);
  assert.deepEqual(simCues(steady, { ...steady, alive: false }), ["death"]);
  assert.deepEqual(simCues({ ...steady, alive: false }, { ...steady, alive: false }), [], "once");
  for (const cue of ["wave", "harrier-dive", "brute", "heat-high", "venting", "spare-last", "health-low", "link-25"]) {
    assert.ok(!LYRA_COVERAGE.cues.includes(cue as never), `nothing for ${cue}: it happens too often`);
  }
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
  assert.deepEqual(cues({ ...home, link: 0.3 }, { ...home, link: 0.2 }), [], "nothing at a quarter");
  assert.deepEqual(cues({ ...home, link: 0.14 }, { ...home, link: 0.1 }), ["link-far"], "the very edge of the dome's reach");
  assert.deepEqual(cues({ ...home, link: 0.05 }, { ...home, link: 0, lost: true }), ["link-lost"]);
  assert.deepEqual(cues({ ...home, link: null }, { ...home, link: null, inDome: false }), [], "not from overhead");
  assert.deepEqual(cues(home, { ...home, pushed: true, failingWalls: 1 }), ["pushed", "walls-failing"]);
  assert.deepEqual(cues(home, { ...home, water: 1.4, food: 1.2 }), ["water-low", "food-low"]);
  assert.deepEqual(cues(home, { ...home, signalNear: true }), ["signal-near"]);
  assert.deepEqual(pelagosCues(home, { ...home, survivors: 5 }), [{ cue: "survivors-arrived", n: 5 }]);
});

test("she speaks with the voices the owner chose, and the nearest thing on a computer without them", () => {
  const windows = [
    { name: "Microsoft David - English (United States)", lang: "en-US" },
    { name: "Microsoft Mark - English (United States)", lang: "en-US" },
    { name: "Microsoft Zira - English (United States)", lang: "en-US" },
  ];
  assert.match(chooseVoice(windows, "lyra")!.name, /Zira/);
  assert.match(chooseVoice(windows, "bleed")!.name, /Zira/);
  assert.match(chooseVoice(windows, "continuity")!.name, /David/);
  const mac = [{ name: "Alex", lang: "en-US" }, { name: "Samantha", lang: "en-US" }, { name: "Thomas", lang: "fr-FR" }];
  assert.equal(chooseVoice(mac, "lyra")!.name, "Samantha");
  assert.equal(chooseVoice(mac, "continuity")!.name, "Alex");
  assert.equal(chooseVoice([{ name: "Google UK English Female", lang: "en-GB" }], "continuity")!.name, "Google UK English Female", "a female voice is not taken for a male one, but any English voice beats none");
  assert.equal(chooseVoice([{ name: "Thomas", lang: "fr-FR" }], "lyra"), null);
  assert.equal(spokenText({ speaker: "Continuity", text: "DRONE LINK LOST.", voice: "continuity" }), "drone link lost.");
  assert.equal(spokenText({ speaker: "Lyra", text: "...it's always Pelagos first", voice: "bleed" }), "it's always Pelagos first");
});
