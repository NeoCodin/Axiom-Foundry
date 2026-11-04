/*
 * Lyra's recorded voice (ElevenLabs, the "Lyra" voice) and how it is coloured as it plays:
 * a radio band, a metallic ring, a second copy of her a breath behind, and crunch. She
 * starts close to human and slips further as the truth comes out; the other voices that
 * break through hers are further gone still. The owner sets the colouring by ear in the QA
 * panel's voice lab, which keeps it on this device until the numbers are written in here.
 * Pure settings and lookups; lyra-voice-sound.ts builds the sound.
 */

import type { LyraLine, LyraStage } from "./lyra-voice.ts";

/** Each from 0 (none) to 1 (a lot). */
export type VoiceFx = { radio: number; metal: number; doubling: number; crunch: number };
export const FX_KEYS = ["radio", "metal", "doubling", "crunch"] as const;

export const DEFAULT_FX: VoiceFx = { radio: 1, metal: 0.78, doubling: 0.48, crunch: 0.22 };
/** How much further each stage of the story (crew-talk.ts moods) takes her. */
const SLIP: VoiceFx = { radio: 0.03, metal: 0.1, doubling: 0.12, crunch: 0.05 };
/** The other voices in hers: always further gone than she is. */
const BLEED: VoiceFx = { radio: 0.25, metal: 0.35, doubling: 0.5, crunch: 0.3 };

const unit = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback);

export function fxFor(base: VoiceFx, stage: LyraStage, voice: LyraLine["voice"]): VoiceFx {
  const add = voice === "bleed" ? BLEED : { radio: SLIP.radio * stage, metal: SLIP.metal * stage, doubling: SLIP.doubling * stage, crunch: SLIP.crunch * stage };
  return { radio: unit(base.radio + add.radio, 0), metal: unit(base.metal + add.metal, 0), doubling: unit(base.doubling + add.doubling, 0), crunch: unit(base.crunch + add.crunch, 0) };
}

/** The lines recorded so far, by the words spoken (spokenText), with each take's file in public/audio/lyra. */
export const RECORDINGS: readonly { said: string; voice: "lyra" | "bleed"; files: readonly string[] }[] = [
  { said: "Okay, we're down. Three people in that shelter, and their filters won't last the day.", voice: "lyra", files: ["arrive-pelagos-a.mp3", "arrive-pelagos-b.mp3"] },
  { said: "This says I'm made out of thirty-two archivists who came before me.", voice: "lyra", files: ["composite-a.mp3", "composite-b.mp3"] },
  { said: "told the last one the same thing", voice: "bleed", files: ["bleed-last-one-a.mp3", "bleed-last-one-b.mp3"] },
];

/** What the voice lab keeps: the colouring, and which take of each line to use. */
export type VoiceLab = { fx: VoiceFx; takes: Record<string, number> };
export const VOICE_LAB_KEY = "axiom-foundry-lyra-voice-lab-v1";

export function readVoiceLab(stored: string | null): VoiceLab {
  try {
    const value = JSON.parse(stored ?? "null") as { fx?: Partial<Record<string, unknown>>; takes?: Record<string, unknown> } | null;
    if (value && typeof value === "object") {
      const fx = { ...DEFAULT_FX };
      for (const key of FX_KEYS) fx[key] = unit(value.fx?.[key], DEFAULT_FX[key]);
      const takes: Record<string, number> = {};
      for (const [said, take] of Object.entries(value.takes ?? {})) if (typeof take === "number" && Number.isInteger(take) && take >= 0) takes[said] = take;
      return { fx, takes };
    }
  } catch {
    // Unreadable: the defaults.
  }
  return { fx: { ...DEFAULT_FX }, takes: {} };
}
export const writeVoiceLab = (lab: VoiceLab) => JSON.stringify(lab);

/** The file to play for these words, in the take the lab chose, or null when they aren't recorded. */
export function recordingOf(said: string, takes: Record<string, number>): string | null {
  const files = RECORDINGS.find((recording) => recording.said === said)?.files;
  if (!files?.length) return null;
  return files[Math.min(files.length - 1, takes[said] ?? 0)];
}
