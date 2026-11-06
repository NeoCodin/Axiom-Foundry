import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { DEFAULT_FX, fxFor, readVoiceLab, RECORDINGS, recordingOf, writeVoiceLab } from "../app/lyra-voice-fx.ts";
import { LYRA_SCRIPT, spokenText, type LyraLine } from "../app/lyra-voice.ts";
import { ABOARD_SCRIPT, nullRemark, openingRemark, welcomeRemark } from "../app/lyra-aboard.ts";

const everything = (value: unknown): string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(everything) : value && typeof value === "object" ? Object.values(value).flatMap(everything) : [];

test("every line she can say is recorded, every recording is a real line, and its takes are on disk", () => {
  const spoken = (text: string) => spokenText({ speaker: "Lyra", text, voice: "lyra" } as LyraLine);
  const remarks = [welcomeRemark(0), welcomeRemark(3), nullRemark(0), nullRemark(2), nullRemark(0, { severe: true })].flatMap((remark) => remark.lines).filter((line) => line.speaker === "Lyra").map((line) => line.text);
  // The Protocol speaks in capitals, in its own voice.
  const script = new Set([...everything(LYRA_SCRIPT), ...everything(ABOARD_SCRIPT), ...remarks].filter((text) => text !== text.toUpperCase()).map(spoken));
  const recorded = new Set(RECORDINGS.map((recording) => recording.said));
  assert.deepEqual([...script].filter((line) => !recorded.has(line)), [], "lines still in the browser's voice");
  assert.deepEqual([...recorded].filter((line) => !script.has(line)), [], "recordings of lines she no longer says");
  assert.equal(recorded.size, RECORDINGS.length, "one entry each");
  for (const recording of RECORDINGS) {
    for (const file of recording.files) assert.ok(existsSync(new URL(`../public/audio/lyra/${file}`, import.meta.url)), file);
  }
  assert.ok(openingRemark("wake").lines.every((line) => recorded.has(spokenText(line))), "her first words above all");
});

test("she slips further as the story goes, and the other voices are further gone than she is", () => {
  assert.deepEqual(fxFor(DEFAULT_FX, 0, "lyra"), DEFAULT_FX, "at the start, exactly what was set");
  const light = { radio: 0.2, metal: 0.1, doubling: 0.1, crunch: 0.1 };
  const early = fxFor(light, 0, "lyra");
  const late = fxFor(light, 3, "lyra");
  assert.ok(late.metal > early.metal && late.doubling > early.doubling);
  const other = fxFor(light, 0, "bleed");
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
