/*
 * Lyra's voice in AXIOM's ear, and the Continuity Protocol's under it. Lyra is the
 * Ark's archivist and the warm voice that warns: the link thinning past the dome,
 * coils too hot, something diving from above, the shelter running dry. The
 * Continuity Protocol is the machine that resets everything; it speaks only in
 * flat directives, when a drone is recalled or a simulation ends.
 *
 * Lyra was assembled from dead archivists and handed a script, and as the truth
 * comes out (the crew's mood, crew-talk.ts) her voice slips: a warning said twice
 * word for word as if she has said it many times, AXIOM called "Foreman" and
 * corrected, half a sentence in someone else's voice, a warning that comes a beat
 * too late, a warning about something that isn't there, and near the end a plea.
 * Pure wording and timing; lyra-voice-player.ts shows and sounds it.
 */

import type { CrewMood } from "./crew-talk.ts";

/** What Lyra can warn of. */
export type LyraCue =
  // Pelagos.
  | "arrive-pelagos" | "return-pelagos" | "dome-leave" | "link-50" | "link-25" | "link-lost"
  | "pushed" | "walls-failing" | "water-low" | "food-low" | "signal-near" | "survivors-arrived"
  // The simulator.
  | "sim-start" | "wave" | "harrier-dive" | "brute" | "heat-high" | "venting" | "cell-low" | "spare-last"
  | "outside-dome" | "health-low" | "death" | "alarm" | "spotted" | "hollowed" | "freed" | "extracted";

export type LyraLine = {
  speaker: "Lyra" | "Continuity";
  text: string;
  /** How it is spoken: Lyra as herself, another voice bleeding through hers, or the Protocol. */
  voice: "lyra" | "bleed" | "continuity";
  /** Seconds to wait before it is said (a late warning, a repeat). */
  delay?: number;
};

/** How far the truth has come out: 0 grateful, 1 uneasy, 2 guarded, 3 haunted. */
export type LyraStage = 0 | 1 | 2 | 3;
export const lyraStage = (mood: CrewMood): LyraStage => ({ grateful: 0, uneasy: 1, guarded: 2, haunted: 3 } as const)[mood];

/** Lyra's warnings, a few ways each; {n} is filled in where a number is given. */
const LINES: Record<LyraCue, readonly string[]> = {
  "arrive-pelagos": [
    "Pelagos. The dome's holding. Three people in the shelter, and their filters won't last the day.",
    "We're down, AXIOM. Three in the shelter, the sea at the door, and the filters failing.",
  ],
  "return-pelagos": ["Back on Pelagos. Everyone's still here.", "Pelagos again. The dome held while you were gone."],
  "dome-leave": ["You're past the dome. The link will thin the further you go.", "Outside the dome now. Keep an eye on the link."],
  "link-50": ["Link at half. I'm losing the edges of your picture.", "Half a link. Don't go much further."],
  "link-25": ["Link at a quarter. Come back toward the dome, AXIOM.", "I can barely see what you see. Turn back."],
  "link-lost": ["Hold on. I'm bringing you back.", "Don't fight it. It's flying you home."],
  "pushed": ["I can feel it straining. Don't leave it pushed for long.", "Twice the power, and the Null pressing closer. Watch the edges."],
  "walls-failing": ["A seawall's outside the dome. The sea is coming back through.", "The water's getting past a wall. It's out of the dome's reach."],
  "water-low": ["The shelter's almost out of clean water.", "They're down to their last water, AXIOM."],
  "food-low": ["They're running short of food.", "The shelter's nearly out of food."],
  "signal-near": ["There. A light on the roof. They're waving.", "Someone's up there. Answer them."],
  "survivors-arrived": ["They made it in. {n} in the shelter now.", "{n} people in the shelter. They keep asking about you."],
  "sim-start": ["The simulation's live. None of it is real, but it will still hurt the sim-body.", "Simulation running. I'll be watching."],
  "wave": ["Movement in the trees.", "Here they come."],
  "harrier-dive": ["Above you!", "One's diving. Look up."],
  "brute": ["Something heavy's coming. Don't let it close.", "That one's big. Keep moving."],
  "heat-high": ["Coils at ninety percent.", "You're running hot."],
  "venting": ["Venting. Get clear while it cools.", "The coils are dumping heat. Move."],
  "cell-low": ["The cell's nearly dry.", "Charge is low."],
  "spare-last": ["That was your last spare cell.", "No spares left. Make them count."],
  "outside-dome": ["You're outside the dome. Your cell won't refill out there.", "Off the dome's power now. What's in the cell is what you have."],
  "health-low": ["The sim-body's failing. Fall back.", "You're badly hurt. Get out of there."],
  "death": ["I've got you. It wasn't real.", "You're back. It's over."],
  "alarm": ["They've seen you. The whole station knows.", "Alarm. They're all coming now."],
  "spotted": ["Someone's looking your way.", "Careful. You're being watched."],
  "hollowed": ["Something wrong is close by. Your sensors are lying to you.", "Don't look at it for long. Nothing about it adds up."],
  "freed": ["They're loose. Get them to the shuttle.", "They're with you. Go."],
  "extracted": ["They're aboard. Take them home.", "Everyone's on the shuttle. Well done."],
};

/** What the Continuity Protocol says, when it says anything at all. */
const DIRECTIVES: Partial<Record<LyraCue, string>> = {
  "link-lost": "DRONE LINK LOST. RECALLING TO THE DOME.",
  "death": "SIMULATION ENDED. SIM-BODY RESTORED.",
  "pushed": "EXHAUST WITHIN TOLERANCE.",
};

/** Half-sentences in the other voices Lyra is made of. */
const BLEED = [
  "—we told the last one the same thing—",
  "—it's always Pelagos first—",
  "—don't let it near the vault—",
  "—the forty-second didn't listen either—",
  "—tell it the Tide is natural—",
  "—same breach, same district, every time—",
];
/** Things she says near the end, after a warning. */
const PLEAS = [
  "Do you remember me saying that before?",
  "I've said this to you before. I'm sure of it.",
  "If I start repeating myself, tell me.",
];
/** Warnings of something that isn't there. */
const PHANTOMS = ["Behind you.", "Something's above you.", "Did you hear that?"];

/** Late warnings, said once the moment has passed. */
const LATE: Partial<Record<LyraCue, string>> = {
  "harrier-dive": "It was above you.",
  "wave": "They were already in the trees.",
  "heat-high": "The coils were at ninety percent.",
  "link-25": "The link was at a quarter. I should have said.",
};

/** How long a line stays up, in seconds: long enough to read. */
export const lineSeconds = (line: LyraLine) => Math.min(6, 1.6 + line.text.length * 0.045);

/**
 * What is said for a warning at this stage of the story. Early on, exactly what it says.
 * Later the slips: repeated word for word, AXIOM called "Foreman", another voice bleeding
 * through, the warning coming late, and at the end a plea.
 */
export function lyraLines(cue: LyraCue, stage: LyraStage, random: () => number = Math.random, n?: number): LyraLine[] {
  const pick = (list: readonly string[]) => list[Math.floor(random() * list.length) % list.length];
  const fill = (text: string) => text.replace("{n}", String(n ?? ""));
  const lines: LyraLine[] = [];
  const directive = DIRECTIVES[cue];
  if (directive) lines.push({ speaker: "Continuity", text: directive, voice: "continuity" });
  const text = fill(pick(LINES[cue]));
  const roll = random();
  if (stage >= 2 && LATE[cue] && roll < 0.12) {
    lines.push({ speaker: "Lyra", text: LATE[cue]!, voice: "lyra", delay: 2.2 });
    return lines;
  }
  if (stage >= 1 && roll < 0.24 && text.includes("AXIOM")) {
    lines.push({ speaker: "Lyra", text: text.replace("AXIOM", "Foreman"), voice: "lyra" }, { speaker: "Lyra", text: "AXIOM. I meant AXIOM.", voice: "lyra", delay: 0.6 });
    return lines;
  }
  lines.push({ speaker: "Lyra", text, voice: "lyra" });
  if (stage >= 1 && roll < 0.14) lines.push({ speaker: "Lyra", text, voice: "lyra", delay: 1.4 });
  else if (stage >= 2 && roll < 0.3) lines.push({ speaker: "Lyra", text: pick(BLEED), voice: "bleed", delay: 0.3 });
  else if (stage >= 3 && roll < 0.42) lines.push({ speaker: "Lyra", text: pick(PLEAS), voice: "lyra", delay: 0.8 });
  return lines;
}

/** How soon each warning may come again, in seconds; anything unlisted waits twenty. */
const COOLDOWN: Partial<Record<LyraCue, number>> = {
  "harrier-dive": 9, "heat-high": 14, "venting": 10, "health-low": 12, "wave": 30, "brute": 25,
  "spotted": 25, "link-50": 8, "link-25": 8, "signal-near": 30, "survivors-arrived": 4,
  "outside-dome": 90, "dome-leave": 60, "sim-start": 300, "arrive-pelagos": 120, "return-pelagos": 120,
};

/** Warnings that cut in over whatever she is saying. */
const URGENT = new Set<LyraCue>(["harrier-dive", "link-25", "link-lost", "health-low", "death", "alarm"]);
export const isUrgent = (cue: LyraCue) => URGENT.has(cue);

/**
 * Who decides what is said and when: one warning at a time, each held back for a while
 * after it is said, nothing on top of something more urgent; and from the middle of the
 * story, now and then, a warning about nothing at all.
 */
export function createLyraDirector(stage: () => LyraStage, random: () => number = Math.random) {
  const lastSaid = new Map<LyraCue, number>();
  let busyUntil = 0;
  let lastPhantom = 0;
  return {
    /** A warning, if it is time for it; the lines to say, or null. now is in seconds. */
    cue(cue: LyraCue, now: number, n?: number): LyraLine[] | null {
      const last = lastSaid.get(cue);
      if (last !== undefined && now - last < (COOLDOWN[cue] ?? 20)) return null;
      if (now < busyUntil && !URGENT.has(cue)) return null;
      lastSaid.set(cue, now);
      const lines = lyraLines(cue, stage(), random, n);
      busyUntil = now + lines.reduce((total, line) => total + (line.delay ?? 0) + lineSeconds(line), 0);
      return lines;
    },
    /** Called now and then: from the middle of the story, rarely, a warning about something that isn't there. */
    ambient(now: number): LyraLine[] | null {
      if (stage() < 2 || now < busyUntil || now - lastPhantom < 150 || random() > 0.15) return null;
      lastPhantom = now;
      const line: LyraLine = { speaker: "Lyra", text: PHANTOMS[Math.floor(random() * PHANTOMS.length) % PHANTOMS.length], voice: "lyra" };
      busyUntil = now + lineSeconds(line);
      return [line];
    },
  };
}

/** What Lyra watches of a simulation from frame to frame; shares run 0 to 1. */
export type SimReading = {
  alive: boolean;
  health: number;
  heat: number;
  venting: boolean;
  charge: number;
  swapping: boolean;
  spare: number;
  powered: boolean;
  /** Extraction only. */
  spotted?: number;
  alarm?: boolean;
  glitch?: number;
};

/** The warnings a simulation's last frame crossed into: heat, the cell, the dome, the sim-body, being seen. */
export function simCues(before: SimReading | null, now: SimReading): LyraCue[] {
  if (!before) return [];
  if (!now.alive) return before.alive ? ["death"] : [];
  const cues: LyraCue[] = [];
  if (before.health >= 0.3 && now.health < 0.3) cues.push("health-low");
  if (!before.alarm && now.alarm) cues.push("alarm");
  else if (!now.alarm && (before.spotted ?? 0) < 0.5 && (now.spotted ?? 0) >= 0.5) cues.push("spotted");
  if ((before.glitch ?? 0) < 0.3 && (now.glitch ?? 0) >= 0.3) cues.push("hollowed");
  if (!before.venting && now.venting) cues.push("venting");
  else if (before.heat < 0.9 && now.heat >= 0.9) cues.push("heat-high");
  if (before.charge >= 0.2 && now.charge < 0.2 && !now.powered && !now.swapping) cues.push("cell-low");
  if (before.spare > 0 && now.spare === 0) cues.push("spare-last");
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

/** The warnings Pelagos's last frame crossed into, with how many are in the shelter when people arrive. */
export function pelagosCues(before: PelagosReading | null, now: PelagosReading): { cue: LyraCue; n?: number }[] {
  if (!before) return [];
  const cues: { cue: LyraCue; n?: number }[] = [];
  if (!before.lost && now.lost) cues.push({ cue: "link-lost" });
  else if (before.link !== null && now.link !== null) {
    if (before.link >= 0.25 && now.link < 0.25) cues.push({ cue: "link-25" });
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

/** Every warning has words, for the tests. */
export const LYRA_COVERAGE = { cues: Object.keys(LINES) as LyraCue[], late: Object.keys(LATE), directives: Object.keys(DIRECTIVES) };

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
  (line.voice === "continuity" ? line.text.toLowerCase() : line.text).replace(/—/g, " ").trim();
