import assert from "node:assert/strict";
import test from "node:test";

import {
  SAVE_VERSION,
  createInitialState,
  sanitizeGameState,
} from "../app/game-engine.ts";
import { createQaCheckpoint } from "../app/qa-sandbox-engine.ts";
import {
  SAVE_TRANSFER_FAILURE_COPY,
  decodeSaveTransfer,
  describeSaveTransfer,
  encodeSaveTransfer,
} from "../app/save-transfer.ts";

const NOW = 1_800_000_000_000;

function rawCode(prefix: string, payload: unknown) {
  return prefix + Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

test("a player save code round-trips through the load sanitizer, including unicode text", () => {
  const original = createQaCheckpoint(2, NOW);
  assert.ok(original.survivors.survivors.length > 0);
  original.survivors.survivors[0]!.callsign = "Nāvi 星海 🚀";

  const result = decodeSaveTransfer(encodeSaveTransfer(original, "player"), "player", NOW);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.source, "player");
  assert.deepEqual(result.state, sanitizeGameState(JSON.parse(JSON.stringify(original)), NOW));
  assert.equal(result.state.survivors.survivors[0]!.callsign, "Nāvi 星海 🚀");
});

test("pasted codes tolerate surrounding whitespace and line wrapping", () => {
  const code = encodeSaveTransfer(createInitialState(NOW), "player");
  const wrapped = `\n  ${code.match(/.{1,60}/g)!.join("\n")}  \r\n`;

  const result = decodeSaveTransfer(wrapped, "player", NOW);

  assert.equal(result.ok, true);
});

test("malformed codes are rejected with a specific reason", () => {
  const reasonFor = (code: string) => {
    const result = decodeSaveTransfer(code, "player", NOW);
    return result.ok ? "ok" : result.reason;
  };

  assert.equal(reasonFor("   \n "), "empty");
  assert.equal(reasonFor("my save please"), "unrecognized");
  assert.equal(reasonFor("AXF-SAVE-1:%%%not-base64%%%"), "corrupted");
  assert.equal(reasonFor(`AXF-SAVE-1:${Buffer.from("{not json").toString("base64")}`), "corrupted");
  assert.equal(reasonFor(rawCode("AXF-SAVE-1:", { hello: "world" })), "not-a-save");
  assert.equal(reasonFor(rawCode("AXF-SAVE-1:", [1, 2, 3])), "not-a-save");

  const future = { ...createInitialState(NOW), version: SAVE_VERSION + 1 };
  assert.equal(reasonFor(rawCode("AXF-SAVE-1:", future)), "newer-version");

  for (const copy of Object.values(SAVE_TRANSFER_FAILURE_COPY)) {
    assert.ok(copy.length > 0);
  }
});

test("a QA sandbox save never replaces a player save, but a player save can be inspected in QA", () => {
  const qaCode = encodeSaveTransfer(createQaCheckpoint(4, NOW), "qa");
  const playerCode = encodeSaveTransfer(createInitialState(NOW), "player");

  const intoPlayer = decodeSaveTransfer(qaCode, "player", NOW);
  assert.equal(intoPlayer.ok, false);
  if (!intoPlayer.ok) assert.equal(intoPlayer.reason, "qa-into-player");

  const qaIntoQa = decodeSaveTransfer(qaCode, "qa", NOW);
  assert.equal(qaIntoQa.ok, true);

  const playerIntoQa = decodeSaveTransfer(playerCode, "qa", NOW);
  assert.equal(playerIntoQa.ok, true);
  if (playerIntoQa.ok) assert.equal(playerIntoQa.source, "player");
});

test("tampered values are repaired by the same sanitizer as a local-storage load", () => {
  const tampered = {
    ...createInitialState(NOW),
    flux: "infinite please",
    cycle: -40,
  };

  const result = decodeSaveTransfer(rawCode("AXF-SAVE-1:", tampered), "player", NOW);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Number.isFinite(result.state.flux) && result.state.flux >= 0);
  assert.ok(result.state.cycle >= 1);
});

test("restore confirmation describes the save being restored", () => {
  const state = createQaCheckpoint(3, NOW);
  const summary = describeSaveTransfer(state);

  assert.equal(summary.world, "Cinder");
  assert.equal(summary.cycle, state.cycle);
  assert.equal(summary.savedAt.getTime(), state.lastSaved);
  assert.ok(summary.playTime.length > 0);
});
