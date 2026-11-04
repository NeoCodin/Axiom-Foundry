import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { DEFAULT_FX, fxFor, readVoiceLab, RECORDINGS, recordingOf, writeVoiceLab } from "../app/lyra-voice-fx.ts";
import { LYRA_SCRIPT, spokenText, type LyraLine } from "../app/lyra-voice.ts";
import { ABOARD_SCRIPT } from "../app/lyra-aboard.ts";

const everything = (value: unknown): string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(everything) : value && typeof value === "object" ? Object.values(value).flatMap(everything) : [];

test("every recording is one of her real lines, and its takes are on disk", () => {
  const script = new Set([...everything(LYRA_SCRIPT), ...everything(ABOARD_SCRIPT)].map((text) => spokenText({ speaker: "Lyra", text, voice: "lyra" } as LyraLine)));
  for (const recording of RECORDINGS) {
    assert.ok(script.has(recording.said), `in the script: ${recording.said}`);
    for (const file of recording.files) assert.ok(existsSync(new URL(`../public/audio/lyra/${file}`, import.meta.url)), file);
  }
});

test("she slips further as the story goes, and the other voices are further gone than she is", () => {
  const early = fxFor(DEFAULT_FX, 0, "lyra");
  const late = fxFor(DEFAULT_FX, 3, "lyra");
  assert.deepEqual(early, DEFAULT_FX, "at the start, exactly what the lab set");
  assert.ok(late.metal > early.metal && late.doubling > early.doubling);
  const other = fxFor(DEFAULT_FX, 0, "bleed");
  assert.ok(other.doubling > late.doubling && other.metal > late.metal);
  const maxed = fxFor({ radio: 1, metal: 1, doubling: 1, crunch: 1 }, 3, "bleed");
  assert.ok(Object.values(maxed).every((amount) => amount === 1), "never past 1");
});

test("the lab's settings survive storage and junk, and pick the take to play", () => {
  const lab = { fx: { radio: 0.5, metal: 0.2, doubling: 0.3, crunch: 0.1 }, takes: { [RECORDINGS[0].said]: 1 } };
  assert.deepEqual(readVoiceLab(writeVoiceLab(lab)), lab);
  assert.deepEqual(readVoiceLab("not json").fx, DEFAULT_FX);
  assert.deepEqual(readVoiceLab(JSON.stringify({ fx: { radio: 9, metal: "x" }, takes: { a: -1 } })), { fx: { ...DEFAULT_FX, radio: 1 }, takes: {} });
  assert.equal(recordingOf(RECORDINGS[0].said, lab.takes), RECORDINGS[0].files[1]);
  assert.equal(recordingOf(RECORDINGS[0].said, { [RECORDINGS[0].said]: 7 }), RECORDINGS[0].files.at(-1), "a take that isn't there falls back to the last");
  assert.equal(recordingOf("Never recorded.", {}), null, "anything else is the browser's voice");
});
