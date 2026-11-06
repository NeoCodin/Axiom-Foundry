import {
  MISSIONS,
  SAVE_VERSION,
  formatDuration,
  sanitizeGameState,
  type GameState,
} from "./game-engine.ts";

/**
 * Portable save codes. Browser storage is the only copy of a player's save,
 * so a code lets them keep a backup or move between devices. A code is never
 * trusted: it must decode to a save from this build or an older one, and it
 * passes through the same sanitizer as a local-storage load.
 */
export type SaveTransferSource = "player" | "qa";

const CODE_PREFIX: Record<SaveTransferSource, string> = {
  player: "AXF-SAVE-1:",
  qa: "AXF-QA-1:",
};

export type SaveTransferFailure =
  | "empty"
  | "unrecognized"
  | "qa-into-player"
  | "corrupted"
  | "not-a-save"
  | "newer-version";

export type SaveTransferResult =
  | { ok: true; state: GameState; source: SaveTransferSource }
  | { ok: false; reason: SaveTransferFailure };

export const SAVE_TRANSFER_FAILURE_COPY: Record<SaveTransferFailure, string> = {
  empty: "Paste a backup code or choose a backup file first.",
  unrecognized: "That is not an Axiom Foundry backup code. Codes begin with AXF-SAVE-1.",
  "qa-into-player": "That code came from the QA sandbox. It can only be restored into the QA sandbox.",
  corrupted: "The code is incomplete or damaged. Copy the whole code and try again.",
  "not-a-save": "The code opened, but it does not contain an Axiom Foundry save.",
  "newer-version": "This backup comes from a newer version of the game. Reload the page to update, then try again.",
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(encoded: string) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isSaveShaped(value: unknown): value is { version: number } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === "number" &&
    Number.isFinite(candidate.version) &&
    typeof candidate.missions === "object" &&
    candidate.missions !== null &&
    Array.isArray(candidate.tiers)
  );
}

export function encodeSaveTransfer(state: GameState, source: SaveTransferSource) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  return CODE_PREFIX[source] + bytesToBase64(bytes);
}

/**
 * A player save may be restored into the QA sandbox (useful for reproducing a
 * report), but a QA save never replaces a player save.
 */
export function decodeSaveTransfer(
  code: string,
  target: SaveTransferSource,
  now = Date.now(),
): SaveTransferResult {
  const compact = code.replace(/\s+/g, "");
  if (!compact) return { ok: false, reason: "empty" };

  const source = (Object.keys(CODE_PREFIX) as SaveTransferSource[]).find((key) =>
    compact.startsWith(CODE_PREFIX[key]),
  );
  if (!source) return { ok: false, reason: "unrecognized" };
  if (source === "qa" && target === "player") {
    return { ok: false, reason: "qa-into-player" };
  }

  let parsed: unknown;
  try {
    const bytes = base64ToBytes(compact.slice(CODE_PREFIX[source].length));
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, reason: "corrupted" };
  }

  if (!isSaveShaped(parsed)) return { ok: false, reason: "not-a-save" };
  if (parsed.version > SAVE_VERSION) return { ok: false, reason: "newer-version" };
  return { ok: true, state: sanitizeGameState(parsed, now), source };
}

export function describeSaveTransfer(state: GameState) {
  const world = MISSIONS[state.missions.currentIndex]?.world ?? "Campaign complete";
  return {
    world,
    cycle: state.cycle,
    playTime: formatDuration(state.playTime),
    savedAt: new Date(state.lastSaved),
  };
}
