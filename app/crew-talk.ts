/*
 * What the crew say when AXIOM's drone stops to talk, and what they say to each
 * other as it passes. A survivor's lines come from who they are: the world they
 * were pulled from, the work they did there, their nature, what the Null did to
 * them if anything, the secrets a rare few carry, and what the Ark has uncovered
 * so far, because rumours travel faster than records. Pure; the drone view shows
 * the lines as subtitles.
 */

import { SURVIVOR_ALTERATIONS } from "./survivor-engine.ts";

/** Who someone is, as far as their conversation goes. */
export type TalkProfile = {
  name: string;
  origin: string;
  backgroundId: string;
  role: string;
  ageGroup?: string | null;
  traits: readonly string[];
  alterationId?: string | null;
  storyHookId?: string | null;
  resting?: boolean;
};

/** Where the Ark is in its story: the world it orbits, worlds saved, records found. */
export type TalkContext = { worldId: string; worldsSaved: number; discovered: readonly string[] };
export type TalkLine = { speaker: string; text: string };

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
const pick = <T>(list: readonly T[], seed: number) => list[seed % list.length];

/** Home, in a few words each, by the world they came from. */
const HOME: Record<string, readonly string[]> = {
  pelagos: [
    "On Pelagos we told the time by the tide tables. Nothing rises up here. I keep checking anyway.",
    "The sea took the low districts one street at a time. We had years of warning and it still felt sudden.",
    "You can hear water in the walls of this ship. It's the coolant. I tell myself it's only the coolant.",
  ],
  viridia: [
    "Viridia grew over everything. Roads, houses, the school. It never felt like an attack. It felt like being forgotten.",
    "The forest listened. I know how that sounds. Ask anyone from the canopy towns.",
    "I miss the smell of rain on leaves. The farm deck gets close, then the fans come on.",
  ],
  cinder: [
    "On Cinder the ash came down like snow that burned. We worked the mantle galleries in shifts so the heat couldn't have all of us at once.",
    "Cold is a luxury. Sometimes I put my hands flat on the hull just to feel it.",
    "We used to say Cinder had two weathers: ash, and worse ash. I laughed at that for twenty years.",
  ],
  nox: [
    "Nox never had a morning. We made our own with lamps, and argued about whose lamp was the right one.",
    "Every settlement on Nox swore the others had the date wrong. Up here I finally know what day it is. I think.",
    "You get used to the dark. You don't get used to people who are certain.",
  ],
  vesper: [
    "Vesper's storms were red as the inside of an eyelid. Every observatory remembered a different sky.",
    "Half my neighbours were Altered. You learn that a body changing isn't the same as a person changing.",
    "The observatory kept records of a history nobody lived. Sometimes I think I was born into it.",
  ],
  ark: ["I was born aboard. Every room I know has always been half asleep."],
  unknown: ["I don't remember where I was before the shuttle. The medics say that's common. It doesn't feel common."],
};

/** Their old work, told so it fits whichever world they came from. */
const WORK: Record<string, string> = {
  "tidal-grid": "I kept power relays talking to each other under the sea. Your conduits are the same problem, only drier.",
  "flood-ward": "I ran a clinic while the floors below it filled with water. You learn to triage by the sound of a door.",
  "reef-archive": "I pulled records out of pressure-sealed stacks. Half of what I recovered disagreed with the other half.",
  "storm-pilot": "I flew skiffs through rain that fell upward. Your gravity here is almost restful.",
  "pressure-forge": "I built shells to hold back an ocean. Every seam on this ship, I look at how it was welded.",
  "kelp-cooperative": "We fed a whole district from gardens under the waves. Tell the farm crew I can help. Please.",
  "shelter-teacher": "I kept a class going in a lifeboat. Lessons are a kind of hull. They keep the fear out.",
  "breakwater-watch": "My job was keeping panic from becoming another hazard. It's quiet here. I don't trust quiet.",
  "habitat-coder": "I patched a city's automation from a battery terminal. You're a much bigger patch, AXIOM. No offence.",
  "salvage-diver": "I dove for tools in streets that were already underwater. You'd be amazed what still works.",
  "civic-volunteer": "I learned whatever the shelter needed, usually before anyone asked. So. What does the ship need?",
  "ferry-crew": "We moved families between the last islands that held still. I counted every crossing. I still count.",
};

const NATURE: Record<string, string> = {
  "adaptable": "Give me a week in any room on this ship and I'll be useful in it.",
  "steady-hands": "My hands don't shake. Everything else does. Not my hands.",
  "systems-thinker": "Everything aboard pulls on everything else. The farm, the forge, the heart. You can feel it if you stand still.",
  "patient-mentor": "If there are children aboard, I'd like to teach them. Someone taught me when it mattered.",
  "community-anchor": "People come to me when they're frightened. I don't know why. I'm frightened too.",
  "tidal-memory": "I remember the sea before it rose. Not stories. Me, standing on a beach that isn't there any more.",
  "signal-ear": "There's a pattern under the static in your transmissions. Like someone humming under their breath.",
  "resourceful": "Nothing aboard is scrap. It's only waiting to be something else.",
  "calm-presence": "Sit with me a while, if drones sit. The ship feels better slower.",
  "null-dreamer": "I dreamed of a corridor on this ship that doesn't exist. I walked it anyway. It was warm.",
};

/** What each job is like, off duty, and what they say when they can't stop. */
const ROLE_TALK: Record<string, { idle: string; busy: readonly string[] }> = {
  engineer: { idle: "The machines down here are older than they should be. Older than the ship, some of them.", busy: ["Can't stop, the press is mid-cycle.", "Later, AXIOM. This weld won't wait."] },
  technician: { idle: "Every panel I open, someone's already been inside it. Neat work, too. Not mine.", busy: ["Hold the light steady, would you? That's a joke. Go on.", "Mid-repair. Ask me after."] },
  fabricator: { idle: "The Foundry builds whatever we tell it to. I'd love to know who told it first.", busy: ["Mind the line, it's hot.", "Not now, the batch is running."] },
  doctor: { idle: "Most of what I treat is the shock of having been saved.", busy: ["Not now. I've got a patient.", "Give me a minute, AXIOM."] },
  researcher: { idle: "Every answer the Analysis Core gives us comes with a question stapled to it.", busy: ["One moment, the readings are moving.", "Can't look away from this. Sorry."] },
  navigator: { idle: "Our route makes sense if you assume someone already knew where every world was.", busy: ["Course correction in progress. Later.", "Bridge is busy. Talk soon."] },
  teacher: { idle: "The children ask where we're going. I say somewhere we can build. Then they ask who decided.", busy: ["Class is in. You can sit at the back.", "Lesson's on. After, all right?"] },
  farmer: { idle: "The plants don't know we're in space. I envy them.", busy: ["Hands in the soil, sorry. Talk at the next watering.", "Can't stop, the trays need turning."] },
  security: { idle: "I trained for things that scream in the dark. Turns out most of the job is waiting.", busy: ["On watch. Keep moving, drone.", "Not while I'm on shift."] },
  soldier: { idle: "I trained for things that scream in the dark. Turns out most of the job is waiting.", busy: ["On watch. Keep moving, drone.", "Not while I'm on shift."] },
  civilian: { idle: "I don't have a station yet. I'd take one. Any one.", busy: ["Busy, busy. The galley doesn't run itself.", "Hands full. Later."] },
};

const CHILD = [
  "Are you AXIOM's hand or AXIOM's eye? My friend says both.",
  "I'm not scared of the dark parts of the ship. I'm scared of the quiet parts.",
  "When I grow up I'm going to fix the heart. The big one. You can help.",
];
const ELDER = [
  "I've been rescued three times in my life. This is the first time the rescuer said please.",
  "When you're old, every ship looks like the last one. This one hums nicer.",
];
const RESTING = [
  "Not now… the doctors say rest. I'm trying.",
  "I'll be up soon. Don't let them give my station away.",
];

/** The rare survivors, whose secrets come out a little more as the Ark travels. */
function secretLines(hook: string, context: TalkContext): string[] | null {
  const found = new Set(context.discovered);
  switch (hook) {
    case "pelagos-cartographer":
      return context.worldsSaved >= 2
        ? ["These are my maps of Pelagos. Dry Pelagos.", "The archive says nobody ever charted it dry. Then who taught me?"]
        : ["These are my maps of Pelagos. Dry Pelagos. Coastlines from before anyone wrote them down."];
    case "axiom-voiceprint":
      return context.worldsSaved >= 3
        ? ["Your doors keep opening for me, AXIOM.", "An obsolete AXIOM credential, the panel says. I'd like to know what I'm obsolete from."]
        : ["Your doors keep opening for me, AXIOM. The panels say my voice is one of yours."];
    case "impossible-forgemark":
      return context.worldsSaved >= 2
        ? ["See this seal on my tools? I made it up when I was a girl.", "It's on a door aboard this ship. The room behind it is still locked. I've never been inside. Have I?"]
        : ["See this seal on my tools? I made it up when I was a girl. It's on a door aboard this ship."];
    case "forty-third-foreman":
      if (found.has("vesper.revision-ledger")) return ["Forty-three. That's the number I was counting in my sleep.", "I think I'm the last one who remembers counting, Foreman."];
      return context.worldsSaved >= 4
        ? ["Foreman. …Sorry. AXIOM.", "I keep counting something in my sleep. I never reach the end."]
        : ["Foreman. …Sorry. AXIOM. I don't know why I keep calling you that."];
    case "null-lullaby":
      return context.worldsSaved >= 3
        ? ["Want to hear my song? It's the same as the SOS.", "I hum it when the ship is too quiet. Sometimes the ship hums back."]
        : ["Want to hear my song? It's the same as the SOS. Everybody says so."];
    default:
      return null;
  }
}

/** What people whisper once the Ark has found each record, newest last. */
const RUMOURS: readonly (readonly [string, string])[] = [
  ["helion.impossible-registry", "They say the ship's registry had our names in it before we came aboard."],
  ["fabrication.preconcordance-keel", "Someone found a seam in the Fabrication floor. Older than the ship, they're saying."],
  ["archive.construction-zero", "There's no record of this ship ever being built. None. It's just… running."],
  ["pelagos.returning-salt", "The salt on the keel matches Pelagos. From before we ever went there."],
  ["foreman.message-seven", "There's a recording in the Recalibration Vault. A Foreman, they say. The seventh."],
  ["cinderwake.command-recognition", "The shields learned AXIOM's rhythm too fast. Like they already knew it."],
  ["expedition.dead-relay", "The recon team found a relay out there that was waiting for us. Waiting."],
  ["ilyra.axiom-wake", "Somewhere there are twelve versions of the same place, and in every one, AXIOM arrives."],
  ["archive.suppressed-correlation", "Somebody hid how much the Foundry costs. Somebody who isn't here any more."],
  ["expedition.null-bloom", "The Null bloomed in front of the recon team. They say it was beautiful. They don't sleep well."],
  ["orison.borrowed-childhoods", "Some of us remember childhoods that belonged to someone else. Good childhoods. That's the worst part."],
  ["archive.lyra-composite-index", "Lyra isn't one person. Did you know? I can't stop hearing the seams in her voice now."],
  ["lyra.private-amendment", "Lyra changed something about herself and didn't tell us. Or didn't tell herself."],
  ["vesper.revision-ledger", "Forty-three first campaigns. Everyone's saying it. Forty-three."],
  ["expedition.first-foundry", "They found where the first Foundry stood. Coordinates nobody should have."],
  ["foreman.unsent-choice", "There was a choice someone never sent. I keep wondering what they'd have chosen."],
];

/** The newest things people are whispering about, newest first. */
export function rumours(context: TalkContext, count = 2) {
  const found = new Set(context.discovered);
  return RUMOURS.filter(([id]) => found.has(id)).map(([, text]) => text).reverse().slice(0, count);
}

function alterationLines(id: string): string[] | null {
  const alteration = SURVIVOR_ALTERATIONS.find((candidate) => candidate.id === id);
  if (!alteration) return null;
  const need = alteration.need.charAt(0).toLowerCase() + alteration.need.slice(1);
  return [alteration.perspective, `I get by with ${need.replace(/\.$/, "")}.`];
}

/**
 * Everything someone has to say to AXIOM, one topic at a time; each topic is a
 * line or two said together. The drone view moves to the next topic on each
 * conversation, so talking to someone again gets something new.
 */
export function talkTopics(profile: TalkProfile, context: TalkContext): string[][] {
  const seed = hash(profile.name);
  if (profile.resting) return [[pick(RESTING, seed)]];
  const topics: string[][] = [];
  const secret = profile.storyHookId ? secretLines(profile.storyHookId, context) : null;
  if (secret) topics.push(secret);
  topics.push([pick(HOME[profile.origin] ?? HOME.unknown, seed)]);
  if (profile.ageGroup === "child") {
    topics.push([pick(CHILD, seed)], [pick(CHILD, seed + 1)]);
  } else {
    if (profile.alterationId) {
      const altered = alterationLines(profile.alterationId);
      if (altered) topics.push(altered);
    }
    const [newest] = rumours(context, 1);
    if (newest) topics.push([newest]);
    if (profile.ageGroup === "elder") topics.push([pick(ELDER, seed)]);
    if (WORK[profile.backgroundId]) topics.push([WORK[profile.backgroundId]]);
    for (const trait of profile.traits.slice(0, 2)) if (NATURE[trait]) topics.push([NATURE[trait]]);
    topics.push([(ROLE_TALK[profile.role] ?? ROLE_TALK.civilian).idle]);
  }
  return topics;
}

/** A word in passing from someone hard at work. */
export function busyLine(profile: TalkProfile, seed: number) {
  if (profile.ageGroup === "child") return "Shh, I'm doing my lesson.";
  return pick((ROLE_TALK[profile.role] ?? ROLE_TALK.civilian).busy, hash(profile.name) + seed);
}

const ASKS = ["Where were you, before the shuttle?", "Do you miss it? Home?", "What did you do, back home?"];
const REPLIES = [
  "Same sky up here for both of us now.",
  "I'd have liked to see that.",
  "We had nothing like that where I'm from.",
  "Do you think any of us go back?",
  "Everyone's got a drowned somewhere.",
];
const DOUBTS = [
  "Don't let Lyra hear you say that.",
  "I heard it too. I wish I hadn't.",
  "That's just talk.",
  "Then who's been flying this ship?",
  "Keep your voice down. The drone's listening.",
];

/**
 * A short exchange between two crew, for AXIOM to overhear: asking about home,
 * passing on a rumour, or talk about the work.
 */
export function chatter(a: TalkProfile, b: TalkProfile, context: TalkContext, seed: number): TalkLine[] {
  const firstName = (profile: TalkProfile) => profile.name.split(" ")[0];
  const kind = seed % 3;
  const [rumour] = rumours(context, 1);
  if (kind === 1 && rumour) {
    return [
      { speaker: firstName(a), text: `Have you heard? ${rumour}` },
      { speaker: firstName(b), text: pick(DOUBTS, seed + hash(b.name)) },
    ];
  }
  if (kind === 2 && a.ageGroup !== "child" && b.ageGroup !== "child") {
    return [
      { speaker: firstName(a), text: (ROLE_TALK[a.role] ?? ROLE_TALK.civilian).idle },
      { speaker: firstName(b), text: pick(REPLIES, seed + hash(a.name)) },
    ];
  }
  return [
    { speaker: firstName(a), text: pick(ASKS, seed) },
    { speaker: firstName(b), text: pick(HOME[b.origin] ?? HOME.unknown, hash(b.name)) },
    { speaker: firstName(a), text: pick(REPLIES, seed + 1) },
  ];
}

/** Lines for the QA demo crew, who have no survivor records behind them. */
export function standInProfile(name: string, role: string, ageGroup?: string | null): TalkProfile {
  const seed = hash(name);
  const origins = ["pelagos", "viridia", "cinder", "nox", "vesper"];
  const backgrounds = Object.keys(WORK);
  const traits = Object.keys(NATURE);
  return {
    name,
    origin: origins[seed % origins.length],
    backgroundId: backgrounds[seed % backgrounds.length],
    role,
    ageGroup,
    traits: [traits[seed % traits.length]],
  };
}

/** Every world, job and nature has something to say: for the tests. */
export const TALK_COVERAGE = { homes: Object.keys(HOME), work: Object.keys(WORK), natures: Object.keys(NATURE), roles: Object.keys(ROLE_TALK) };
