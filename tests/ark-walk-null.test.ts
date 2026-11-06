import assert from "node:assert/strict";
import test from "node:test";
import { createNullFeed, misreadLabel, NULL_BURST_LENGTH, type NullClass, type NullFeed } from "../app/ark-walk-null.ts";

/** A repeatable random stream, so each run sees the same storm. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/** Run a feed for a while at 60 frames a second, collecting every frame. */
function watch(classification: NullClass, minutes: number, { exposure = 1, reducedMotion = false, seed = 7 } = {}) {
  const feed = createNullFeed(classification, 0.85, { random: seeded(seed), reducedMotion });
  const frames: (NullFeed & { now: number })[] = [];
  for (let now = 0; now < minutes * 60_000; now += 1000 / 60) frames.push({ ...feed.update(now, exposure), now });
  return frames;
}
const bursts = (frames: readonly NullFeed[]) => frames.filter((frame) => frame.began).length;
const touched = (frame: NullFeed) =>
  frame.tear > 0 || frame.split > 0 || frame.snow > 0 || frame.drop > 0 || frame.freeze || frame.misread || frame.jolt.yaw !== 0;

test("a quiet world leaves the feed clean and the signal full", () => {
  const frames = watch("quiet", 5);
  assert.equal(bursts(frames), 0);
  assert.ok(frames.every((frame) => frame.ambient === 0 && frame.bars === 4 && !touched(frame)));
});

test("the worse the Null, the more often it breaks in and the weaker the signal", () => {
  const trace = bursts(watch("trace", 10));
  const elevated = bursts(watch("elevated", 10));
  const severe = bursts(watch("severe", 10));
  assert.ok(trace > 10 && elevated > trace && severe > elevated, `${trace} < ${elevated} < ${severe}`);
  const ambient = (classification: NullClass) => watch(classification, 0.1)[0].ambient;
  assert.ok(ambient("trace") > 0 && ambient("elevated") > ambient("trace") && ambient("severe") > ambient("elevated"));
  assert.ok(watch("severe", 0.1)[0].bars < watch("trace", 0.1)[0].bars);
});

test("every burst clears itself within a second, and the signal is never lost for long", () => {
  for (const classification of ["trace", "elevated", "severe"] as const) {
    const frames = watch(classification, 10);
    let lastBegan = -Infinity;
    let dark = 0;
    for (const frame of frames) {
      if (frame.began) lastBegan = frame.now;
      if (touched(frame)) assert.ok(frame.now - lastBegan < 1000 + NULL_BURST_LENGTH.misread, `${classification}: still touched long after a burst`);
      dark = frame.drop > 0 ? dark + 1000 / 60 : 0;
      assert.ok(dark <= 250, `${classification}: the signal stays lost for ${dark} ms`);
    }
    if (classification !== "severe") assert.ok(frames.every((frame) => frame.drop === 0), `${classification}: only a severe Null drops the signal`);
  }
});

test("the Law-Heart shields the feed and an open bay exposes it", () => {
  const shielded = bursts(watch("elevated", 10, { exposure: 0.4 }));
  const open = bursts(watch("elevated", 10, { exposure: 1.8 }));
  assert.ok(open > shielded * 2, `${shielded} near the heart, ${open} by the open bay`);
  assert.ok(watch("elevated", 0.1, { exposure: 0.4 })[0].ambient < watch("elevated", 0.1, { exposure: 1.8 })[0].ambient);
});

test("under reduced motion the feed never tears, shakes, snows or drops", () => {
  const frames = watch("severe", 5, { reducedMotion: true });
  assert.ok(frames.every((frame) => frame.ambient === 0 && !touched(frame)));
});

test("a misread label keeps its length and its spaces, and changes", () => {
  const label = "Upper deck · Habitation Ring";
  const misread = misreadLabel(label, 3);
  assert.equal([...misread].length, [...label].length);
  assert.notEqual(misread, label);
  [...label].forEach((character, index) => { if (character === " ") assert.equal([...misread][index], " "); });
});
