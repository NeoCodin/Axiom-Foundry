/*
 * Lyra's voice in AXIOM's ear, and the Continuity Protocol's under it. Lyra is the
 * Ark's archivist and the warm voice that warns: the link thinning past the dome,
 * the cell running down off the dome's power, the shelter running dry. What happens
 * all the time in a fight (waves, dives, heat, reloads) she leaves alone. The
 * Continuity Protocol is the machine that resets everything; it speaks only in
 * flat directives, when a drone is recalled or a simulation ends, and now and then
 * in a flat notice that is worse for how calmly it says it. Lyra worries straight after.
 *
 * Lyra was assembled from dead archivists and handed a script, and as the truth
 * comes out (the crew's mood, crew-talk.ts) her voice slips: half a sentence in
 * someone else's voice, and near the end a plea.
 * Pure wording and timing; lyra-voice-player.ts shows and sounds it.
 */

import type { CrewMood } from "./crew-talk.ts";

/** What Lyra can warn of. */
export type LyraCue =
  // Pelagos.
  | "arrive-pelagos" | "return-pelagos" | "dome-leave" | "link-50" | "link-far" | "link-lost"
  | "pushed" | "walls-failing" | "water-low" | "food-low" | "signal-near" | "survivors-arrived"
  // The simulator.
  | "sim-start" | "cell-low" | "outside-dome" | "death" | "alarm" | "spotted" | "hollowed" | "freed" | "extracted";

export type LyraLine = {
  speaker: "Lyra" | "Continuity";
  text: string;
  /** How it is spoken: Lyra as herself, another voice bleeding through hers, or the Protocol. */
  voice: "lyra" | "bleed" | "continuity";
  /** Seconds to wait before it is said. */
  delay?: number;
};

/** How far the truth has come out: 0 grateful, 1 uneasy, 2 guarded, 3 haunted. */
export type LyraStage = 0 | 1 | 2 | 3;
export const lyraStage = (mood: CrewMood): LyraStage => ({ grateful: 0, uneasy: 1, guarded: 2, haunted: 3 } as const)[mood];

/** Lyra's warnings, a few ways each; {n} is filled in where a number is given. */
const LINES: Record<LyraCue, readonly string[]> = {
  "arrive-pelagos": [
    "Okay, we're down. Three people in that shelter, and their filters won't last the day.",
    "That's Pelagos. There are three people in the shelter, AXIOM. Their water's bad.",
  ],
  "return-pelagos": ["Dome held. Everyone's still in the shelter.", "You're back. Nothing's changed down here, which I'll take."],
  "dome-leave": ["You're outside the dome now. The link gets worse the further out you go.", "Leaving the dome. Watch the link."],
  "link-50": ["Link's down to half.", "Half link. Your picture's breaking up on my end."],
  "link-far": ["That's as far as I can reach you. Come back.", "I'm about to lose you. Please come back."],
  "link-lost": ["Okay, I've got the drone. Bringing it home.", "Lost you. It's flying itself back, don't fight it."],
  "pushed": ["That's a lot of strain on it. Don't leave it like that.", "Double the power, but the dome's shrinking. Watch the walls at the edge."],
  "walls-failing": ["One of the seawalls is outside the dome now. Water's getting back in.", "We're losing a wall. It's past the dome's edge."],
  "water-low": ["The shelter's almost out of clean water.", "They're on their last water, AXIOM."],
  "food-low": ["They're running low on food.", "Food's nearly gone in the shelter."],
  "signal-near": ["Someone's on that roof. See the light?", "There's a signal right above you. Answer it."],
  "survivors-arrived": ["They made it in. {n} in the shelter now.", "{n} people in the shelter. They keep asking who you are."],
  "sim-start": ["Sim's running. None of it's real, but the sim-body still takes the hits.", "Okay, you're in. I'll keep an eye on things."],
  "cell-low": ["Cell's almost empty.", "You're low on charge."],
  "outside-dome": ["You're off the dome's power. What's in the cell is all you get.", "Careful, the cell won't charge out there."],
  "death": ["Got you. It wasn't real.", "You're out. That's the run."],
  "alarm": ["They've seen you. The whole station knows now.", "That's the alarm. They're all coming."],
  "spotted": ["Someone's looking your way.", "Careful. One of them's watching."],
  "hollowed": ["Something's wrong close by. I don't know what it is. You might want to get out of there.", "I'm getting readings I don't understand near you. I'd get away from there."],
  "freed": ["They're free. Get them to the shuttle.", "They're with you. Go."],
  "extracted": ["They're on board. Take them home.", "Everyone's on the shuttle. Nice work."],
};

/** What the Continuity Protocol says, when it says anything at all. */
const DIRECTIVES: Partial<Record<LyraCue, string>> = {
  "link-lost": "DRONE LINK LOST. RECALLING TO THE DOME.",
  "death": "SIMULATION ENDED. SIM-BODY RESTORED.",
  "pushed": "EXHAUST WITHIN TOLERANCE.",
};

/**
 * The Protocol's notices: said flatly, once a visit, the first time each moment comes up
 * from that stage of the story. It knows what it knows, but it never mentions the Foremen.
 */
const NOTICES: Partial<Record<LyraCue, { from: LyraStage; text: string }>> = {
  "dome-leave": { from: 0, text: "LEAVING DOME COVERAGE. RECOVERY IS NOT GUARANTEED." },
  "link-far": { from: 0, text: "NO LIVING OR NON-LIVING ARTIFACT HAS RETURNED FROM BEYOND THIS DISTANCE." },
  "walls-failing": { from: 0, text: "SEAWALL BREACHED. OCCUPANTS HAVE NOT BEEN INFORMED." },
  "water-low": { from: 1, text: "CLEAN WATER BELOW RESERVE. OCCUPANTS HAVE STOPPED ASKING." },
  "food-low": { from: 1, text: "FOOD BELOW RESERVE. THE RATION MODEL NOW ASSUMES FEWER OCCUPANTS." },
  "pushed": { from: 1, text: "TOLERANCE HAS BEEN WIDENED." },
  "link-lost": { from: 2, text: "RECALL WILL NOT ALWAYS BE AVAILABLE." },
  "sim-start": { from: 0, text: "SIMULATION ACTIVE. PAIN RESPONSE IS ACCURATE." },
  "death": { from: 2, text: "TAKE NOTE: IN REALITY, YOU CANNOT BE RESTORED." },
  "alarm": { from: 0, text: "YOUR POSITION IS NOW KNOWN." },
  "extracted": { from: 2, text: "SURVIVORS RECOVERED. NULL SCREENING IS NOT AVAILABLE." },
  "hollowed": { from: 0, text: "UNCLASSIFIED SIGNATURE IN THIS SECTOR. IT IS AWARE OF THE DRONE." },
};

/** Half-sentences in the other voices Lyra is made of. */
const BLEED = [
  "...told the last one the same thing",
  "...it's always Pelagos first",
  "...keep it away from the vault",
  "...the forty-second didn't listen either",
  "...just tell it the Tide's natural",
  "...same breach, same district, every",
];
/** Things she says near the end, after a warning. */
const PLEAS = [
  "Have I said that to you before?",
  "I feel like I've said that already.",
  "Tell me if I start repeating myself. Please.",
];
/** How long a line stays up, in seconds: long enough to read. */
export const lineSeconds = (line: LyraLine) => Math.min(6, 1.6 + line.text.length * 0.045);

/**
 * What is said for a warning at this stage of the story. Early on, exactly what it says.
 * Later the slips: another voice bleeding through hers, and at the end a plea.
 */
export function lyraLines(cue: LyraCue, stage: LyraStage, random: () => number = Math.random, n?: number): LyraLine[] {
  const pick = (list: readonly string[]) => list[Math.floor(random() * list.length) % list.length];
  const lines: LyraLine[] = [];
  const directive = DIRECTIVES[cue];
  if (directive) lines.push({ speaker: "Continuity", text: directive, voice: "continuity" });
  lines.push({ speaker: "Lyra", text: pick(LINES[cue]).replace("{n}", String(n ?? "")), voice: "lyra" });
  const roll = random();
  if (stage >= 2 && roll < 0.16) lines.push({ speaker: "Lyra", text: pick(BLEED), voice: "bleed", delay: 0.3 });
  else if (stage >= 3 && roll < 0.3) lines.push({ speaker: "Lyra", text: pick(PLEAS), voice: "lyra", delay: 0.8 });
  return lines;
}

/** How soon each warning may come again, in seconds; anything unlisted waits twenty. */
const COOLDOWN: Partial<Record<LyraCue, number>> = {
  "spotted": 25, "cell-low": 30, "link-50": 8, "link-far": 120, "signal-near": 30, "survivors-arrived": 4,
  "outside-dome": 90, "dome-leave": 60, "sim-start": 300, "arrive-pelagos": 120, "return-pelagos": 120,
};

/** Warnings that cut in over whatever she is saying. */
const URGENT = new Set<LyraCue>(["link-far", "link-lost", "death", "alarm"]);
export const isUrgent = (cue: LyraCue) => URGENT.has(cue);

/**
 * Who decides what is said and when: one warning at a time, each held back for a while
 * after it is said, nothing on top of something more urgent. The Protocol's notices go
 * after its directive and before Lyra, once each.
 */
export function createLyraDirector(stage: () => LyraStage, random: () => number = Math.random) {
  const lastSaid = new Map<LyraCue, number>();
  const noticed = new Set<LyraCue>();
  let busyUntil = 0;
  return {
    /** A warning, if it is time for it; the lines to say, or null. now is in seconds. */
    cue(cue: LyraCue, now: number, n?: number): LyraLine[] | null {
      const last = lastSaid.get(cue);
      if (last !== undefined && now - last < (COOLDOWN[cue] ?? 20)) return null;
      if (now < busyUntil && !URGENT.has(cue)) return null;
      lastSaid.set(cue, now);
      const lines = lyraLines(cue, stage(), random, n);
      const notice = NOTICES[cue];
      if (notice && stage() >= notice.from && !noticed.has(cue)) {
        noticed.add(cue);
        lines.splice(DIRECTIVES[cue] ? 1 : 0, 0, { speaker: "Continuity", text: notice.text, voice: "continuity", delay: DIRECTIVES[cue] ? 0.5 : 0 });
      }
      busyUntil = now + lines.reduce((total, line) => total + (line.delay ?? 0) + lineSeconds(line), 0);
      return lines;
    },
  };
}

/** What Lyra watches of a simulation from frame to frame; shares run 0 to 1. */
export type SimReading = {
  alive: boolean;
  charge: number;
  swapping: boolean;
  powered: boolean;
  /** Extraction only. */
  spotted?: number;
  alarm?: boolean;
  glitch?: number;
};

/** The warnings a simulation's last frame crossed into: the cell, the dome, the sim-body going down, being seen. */
export function simCues(before: SimReading | null, now: SimReading): LyraCue[] {
  if (!before) return [];
  if (!now.alive) return before.alive ? ["death"] : [];
  const cues: LyraCue[] = [];
  if (!before.alarm && now.alarm) cues.push("alarm");
  else if (!now.alarm && (before.spotted ?? 0) < 0.5 && (now.spotted ?? 0) >= 0.5) cues.push("spotted");
  if ((before.glitch ?? 0) < 0.3 && (now.glitch ?? 0) >= 0.3) cues.push("hollowed");
  if (before.charge >= 0.2 && now.charge < 0.2 && !now.powered && !now.swapping) cues.push("cell-low");
  if (before.powered && !now.powered) cues.push("outside-dome");
  return cues;
}

/** What Lyra watches on Pelagos. link is null while AXIOM looks down from overhead. */
export type PelagosReading = {
  link: number | null;
  inDome: boolean;
  lost: boolean;
  pushed: boolean;
  failingWalls: number;
  water: number;
  food: number;
  survivors: number;
  signalNear: boolean;
};

/** How little link is left when AXIOM is at the very edge of what the dome can reach. */
const LINK_EDGE = 0.12;

/** The warnings Pelagos's last frame crossed into, with how many are in the shelter when people arrive. */
export function pelagosCues(before: PelagosReading | null, now: PelagosReading): { cue: LyraCue; n?: number }[] {
  if (!before) return [];
  const cues: { cue: LyraCue; n?: number }[] = [];
  if (!before.lost && now.lost) cues.push({ cue: "link-lost" });
  else if (before.link !== null && now.link !== null) {
    if (before.link >= LINK_EDGE && now.link < LINK_EDGE) cues.push({ cue: "link-far" });
    else if (before.link >= 0.5 && now.link < 0.5) cues.push({ cue: "link-50" });
    else if (before.inDome && !now.inDome) cues.push({ cue: "dome-leave" });
  }
  if (!before.pushed && now.pushed) cues.push({ cue: "pushed" });
  if (now.failingWalls > before.failingWalls) cues.push({ cue: "walls-failing" });
  if (before.water >= 1.5 && now.water < 1.5) cues.push({ cue: "water-low" });
  if (before.food >= 1.5 && now.food < 1.5) cues.push({ cue: "food-low" });
  if (now.survivors > before.survivors) cues.push({ cue: "survivors-arrived", n: now.survivors });
  if (!before.signalNear && now.signalNear) cues.push({ cue: "signal-near" });
  return cues;
}

/** Everything she and the Protocol can say as warnings, for reading through. */
export const LYRA_SCRIPT = { lines: LINES, directives: DIRECTIVES, notices: NOTICES, bleed: BLEED, pleas: PLEAS };

/** Every warning has words, for the tests. */
export const LYRA_COVERAGE = { cues: Object.keys(LINES) as LyraCue[], directives: Object.keys(DIRECTIVES) };

/** Voices that sound like a woman's and like a man's, best first: Windows' own, then the Mac's, then Google's. */
const FEMALE = [/Zira/i, /Samantha/i, /Google US English/i, /Susan|Hazel|Karen|Moira|Tessa|Serena|Victoria|Fiona/i, /female/i];
const MALE = [/David/i, /Mark/i, /Google UK English Male/i, /Daniel|Fred|Alex|George|Rishi/i, /male/i];

/**
 * How each part is spoken by the browser's own voices. The owner's picks from the audition
 * (Nov 3): Zira pitched right up for Lyra, Zira pitched right down for the voices bleeding
 * through hers, David low and steady for the Continuity Protocol.
 */
export const SPOKEN: Record<LyraLine["voice"], { prefer: readonly RegExp[]; rate: number; pitch: number }> = {
  lyra: { prefer: FEMALE, rate: 0.95, pitch: 2 },
  bleed: { prefer: FEMALE, rate: 0.85, pitch: 0 },
  continuity: { prefer: MALE, rate: 0.9, pitch: 0.4 },
};

/** The browser voice for a part: the first English one its preferences name, else any English voice, else none. */
export function chooseVoice<V extends { name: string; lang: string }>(voices: readonly V[], voice: LyraLine["voice"]): V | null {
  const english = voices.filter((candidate) => /^en/i.test(candidate.lang));
  for (const pattern of SPOKEN[voice].prefer) {
    const found = english.find((candidate) => pattern.test(candidate.name));
    if (found) return found;
  }
  return english[0] ?? null;
}

/** What the voice is given to read: the Protocol's capitals in plain case, so no voice spells them out; no dashes. */
export const spokenText = (line: LyraLine) =>
  (line.voice === "continuity" ? line.text.toLowerCase() : line.text).replace(/—/g, " ").replace(/^\.\.\./, "").trim();
