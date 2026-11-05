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
    "On Pelagos you lived by the tide tables. I still check for high tide up here. Habit.",
    "The sea came up one street at a time. We had years of warning. Didn't help much.",
    "You can hear water in the walls on this ship. It's coolant, I know it's coolant. Still.",
  ],
  viridia: [
    "On Viridia the forest just grew over everything. Roads, houses, the school. Took about ten years.",
    "People think I'm joking when I say the forest listened. I'm not. Ask anyone from the canopy towns.",
    "I miss rain on leaves. The farm deck almost gets the smell right, and then the fans kick in.",
  ],
  cinder: [
    "On Cinder the ash came down all day. We worked the mantle galleries in shifts so the heat didn't get everyone at once.",
    "I put my hands on the hull sometimes just because it's cold. You don't get cold on Cinder.",
    "We had a joke on Cinder. Two kinds of weather: ash, and more ash. It was funnier down there.",
  ],
  nox: [
    "There's no morning on Nox. Everyone ran their lamps on their own schedule and argued about it.",
    "Every town on Nox thought the others had the date wrong. Up here at least there's one calendar. I think.",
    "Honestly the dark on Nox was fine. It was the arguing that got to me.",
  ],
  vesper: [
    "The storms on Vesper were red. Every observatory had a different record of the sky, and they all swore theirs was right.",
    "Half my street was Altered. Their bodies changed, they didn't. Took some people a while to get that.",
    "The observatory kept records of things nobody remembered happening. I grew up reading them.",
  ],
  ark: ["I was born on this ship. Most of it's been asleep my whole life."],
  unknown: ["I don't remember anything before the shuttle. The medics say that's normal. Doesn't feel normal."],
};

/** Their old work, told so it fits whichever world they came from. */
const WORK: Record<string, string> = {
  "tidal-grid": "I kept power relays running under the sea. Your conduits are basically the same thing, just drier.",
  "flood-ward": "I ran a clinic while the floors under it flooded. You get fast at deciding who goes first.",
  "reef-archive": "I pulled old records out of sealed stacks underwater. Half of them disagreed with the other half.",
  "storm-pilot": "I flew skiffs through storms where the rain went sideways. Your gravity here is honestly relaxing.",
  "pressure-forge": "I built hull shells to keep the ocean out. I check every weld on this ship. Can't help it.",
  "kelp-cooperative": "We fed a whole district off kelp gardens. If the farm crew needs a hand, tell them I'm around.",
  "shelter-teacher": "I kept a class going on a lifeboat. Kids need something normal, and lessons are normal.",
  "breakwater-watch": "My job was stopping people from panicking in the floods. It's very quiet up here. I keep waiting for something.",
  "habitat-coder": "I kept a city's automation running off a battery terminal. You're a much bigger job, AXIOM. No offence.",
  "salvage-diver": "I dove for tools in streets that were already underwater. You'd be surprised what still works.",
  "civic-volunteer": "I did whatever the shelter needed doing. So, what does the ship need?",
  "ferry-crew": "We ran families between the last islands that weren't sinking. I counted every trip. Still do, sort of.",
};

const NATURE: Record<string, string> = {
  "adaptable": "Give me a week in any room on this ship and I'll find something useful to do.",
  "steady-hands": "I've got steady hands. Put me on anything fiddly.",
  "systems-thinker": "Everything on this ship's connected. The farm, the forge, the heart. Pull on one and you feel it somewhere else.",
  "patient-mentor": "If there are kids aboard, I'd like to teach them. Someone taught me, back when it mattered.",
  "community-anchor": "People come to me when they're scared. No idea why. I'm scared too.",
  "tidal-memory": "I remember the sea before it rose. Actually remember it. Standing on a beach that isn't there now.",
  "signal-ear": "There's something under the static in your transmissions. Sounds like someone humming.",
  "resourceful": "Don't throw anything out. I mean it. I'll find a use for it.",
  "calm-presence": "Sit with me a bit, if drones sit. Everything feels better when it slows down.",
  "null-dreamer": "I dreamt about a corridor on this ship that doesn't exist. I walked down it anyway. It was warm in there.",
};

/** What each job is like, off duty, and what they say when they can't stop. */
const ROLE_TALK: Record<string, { idle: string; busy: readonly string[] }> = {
  engineer: { idle: "Some of these machines are way older than they should be. Don't ask me how.", busy: ["Can't stop, the press is mid-cycle.", "Later, AXIOM. This weld won't wait."] },
  technician: { idle: "Every panel I open, someone's already been in there. Good work, too. Not mine.", busy: ["Hold the light steady, would you? Kidding. Go on.", "Mid-repair. Ask me later."] },
  fabricator: { idle: "The Foundry'll make whatever we ask it to. I'd like to know who set it up in the first place.", busy: ["Mind the line, it's hot.", "Not now, the batch is running."] },
  doctor: { idle: "Most of what I treat is shock. People getting used to being alive.", busy: ["Not now. I've got a patient.", "Give me a minute, AXIOM."] },
  researcher: { idle: "Every time the Analysis Core answers something, we end up with two more questions.", busy: ["One moment, the readings are moving.", "Can't look away from this. Sorry."] },
  navigator: { idle: "Our route only makes sense if someone already knew where every world was. Weird, right?", busy: ["Course correction in progress. Later.", "Bridge is busy. Talk soon."] },
  teacher: { idle: "The kids ask where we're going. I say somewhere we can build. Then they ask who decided that.", busy: ["Class is on. You can sit at the back.", "Lesson's on. After, okay?"] },
  farmer: { idle: "The plants have no idea we're in space. Lucky them.", busy: ["Hands in the soil, sorry. Catch me at the next watering.", "Can't stop, the trays need turning."] },
  security: { idle: "I trained for things that scream in the dark. Mostly the job's just standing around.", busy: ["On watch. Keep moving, drone.", "Not while I'm on shift."] },
  soldier: { idle: "I trained for things that scream in the dark. Mostly the job's just standing around.", busy: ["On watch. Keep moving, drone.", "Not while I'm on shift."] },
  civilian: { idle: "I don't have a station yet. I'd take one. Any one.", busy: ["Busy. The galley doesn't run itself.", "Hands full. Later."] },
};

const CHILD = [
  "Are you AXIOM's hand or AXIOM's eye? My friend says both.",
  "I'm not scared of the dark bits of the ship. The quiet bits are worse.",
  "When I grow up I'm going to fix the heart. The big one. You can help.",
];
const ELDER = [
  "I've been rescued three times now. You're the first rescuer that said please.",
  "At my age every ship looks like the last one. This one hums nicer, though.",
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
        ? ["These are my maps of Pelagos. Dry Pelagos.", "The archive says nobody ever mapped it dry. So who taught me?"]
        : ["These are my maps of Pelagos. Dry Pelagos. Coastlines from before anyone wrote them down."];
    case "axiom-voiceprint":
      return context.worldsSaved >= 3
        ? ["Your doors keep opening for me, AXIOM.", "The panel says I've got an old AXIOM credential. I'd like to know what that means."]
        : ["Your doors keep opening for me, AXIOM. The panels think my voice is one of yours."];
    case "impossible-forgemark":
      return context.worldsSaved >= 2
        ? ["See the seal on my tools? I made that up when I was a kid.", "It's on a door on this ship. The room behind it's locked. I've never been in there. Have I?"]
        : ["See the seal on my tools? I made it up when I was a kid. It's on a door on this ship."];
    case "forty-third-foreman":
      if (found.has("vesper.revision-ledger")) return ["Forty-three. That's the number I keep counting in my sleep.", "I think I'm the last one who remembers counting, Foreman."];
      return context.worldsSaved >= 4
        ? ["Foreman. ...Sorry. AXIOM.", "I keep counting something in my sleep. I never get to the end."]
        : ["Foreman. ...Sorry. AXIOM. I don't know why I keep calling you that."];
    case "null-lullaby":
      return context.worldsSaved >= 3
        ? ["Want to hear my song? It's the same as the SOS.", "I hum it when the ship's too quiet. Sometimes the ship hums back."]
        : ["Want to hear my song? It's the same as the SOS. Everybody says so."];
    default:
      return null;
  }
}

/**
 * What people whisper once the Ark has found each record, newest last: hearsay,
 * but true to what the record says (see discovery-content.ts).
 */
const RUMOURS: readonly (readonly [string, string])[] = [
  ["helion.impossible-registry", "The Helion beacon knew this ship. Two hundred years before it was supposedly built. Called it Iteration Nineteen."],
  ["fabrication.preconcordance-keel", "A plate came off the Recon Dock wall. They say the metal behind it is older than the way it was made. And the room grew around something that isn't there any more."],
  ["archive.construction-zero", "Apparently there's no record of this ship ever being built. The oldest line just says reconstruction eighteen hundred and forty-two."],
  ["pelagos.returning-salt", "There's Pelagos salt in the keel, and one layer of it is from ninety-one years from now. That's what they're saying."],
  ["foreman.message-seven", "There's a recording in the Recalibration Vault. Some Foreman, the seventh one. People say it sounds like the drone."],
  ["cinderwake.command-recognition", "Viridia's seed vault already had our command code on file before we sent it. Signed by a Foreman thirty-one."],
  ["expedition.dead-relay", "The recon team found a relay with our whole route already on it. The last note says enforcing the laws made the Tide come sooner."],
  ["ilyra.axiom-wake", "Every time the Tide surged on Cinder, it came seventeen hours after the laws were switched on. Never before. Twelve foundries, all the same."],
  ["archive.suppressed-correlation", "The Foundry dumps its uncertainty out into the Null. Somebody deleted that from the records, and it was Lyra who signed off."],
  ["expedition.null-bloom", "Out there the Null was asleep until the team switched on a law. Then it turned toward it. Like it was hungry."],
  ["orison.borrowed-childhoods", "Lyra's childhood memories come from six different people. Three archivists, two Foremen, and one nobody can find a record of."],
  ["archive.lyra-composite-index", "Lyra isn't one person. She's thirty-two archivists and nine Foremen, put together nine seconds before she said hello to us."],
  ["lyra.private-amendment", "Lyra wrote something into her own record. Says she inherited a lie. She asked us to let her stay."],
  ["vesper.revision-ledger", "Forty-three times. The ship's done this trip forty-three times, and every time it was told it was the first."],
  ["expedition.first-foundry", "Where the first Foundry should be, there's just a hole in the Tide shaped like this ship. Same serial number. Parent not yet built."],
  ["foreman.unsent-choice", "They tried everything, apparently. Strict law, new law, no law. It wasn't what they chose that reset everything. It was forgetting it."],
];

/**
 * How the crew feel about the drone, as the truth comes out: grateful at first;
 * uneasy once the records start contradicting the official history; guarded
 * once it is plain the Foundry feeds the Tide; haunted once the forty-three
 * campaigns, or Lyra's making, are out.
 */
export type CrewMood = "grateful" | "uneasy" | "guarded" | "haunted";
/** Worlds saved on reaching Nox: until then the crew trust the Ark, and the records stay between AXIOM and Lyra. */
const TRUST_HOLDS_UNTIL = 4;
export function crewMood(context: TalkContext): CrewMood {
  if (context.worldsSaved < TRUST_HOLDS_UNTIL) return "grateful";
  const found = new Set(context.discovered);
  if (found.has("vesper.revision-ledger") || found.has("archive.lyra-composite-index")) return "haunted";
  return found.has("archive.suppressed-correlation") ? "guarded" : "uneasy";
}

/** The newest things people are whispering about, newest first. */
export function rumours(context: TalkContext, count = 2) {
  if (context.worldsSaved < TRUST_HOLDS_UNTIL) return [];
  const found = new Set(context.discovered);
  return RUMOURS.filter(([id]) => found.has(id)).map(([, text]) => text).reverse().slice(0, count);
}

function alterationLines(id: string): string[] | null {
  const alteration = SURVIVOR_ALTERATIONS.find((candidate) => candidate.id === id);
  if (!alteration) return null;
  const need = alteration.need.charAt(0).toLowerCase() + alteration.need.slice(1);
  return [alteration.perspective, `I get by with ${need.replace(/\.$/, "")}.`];
}

/** What AXIOM can ask about. */
export type TalkTopic = "secret" | "altered" | "home" | "work" | "rumour" | "self" | "job" | "play";
/** Something AXIOM says back, and how they take it. */
export type TalkReply = { say: string; reaction: string };
/** One thing to ask: AXIOM's question, their answer, and two ways AXIOM can answer back. */
export type TalkExchange = { topic: TalkTopic; ask: string; answer: string[]; replies: readonly TalkReply[] };

const REPLIES: Record<Exclude<TalkTopic, "secret">, readonly TalkReply[]> = {
  home: [
    { say: "We'll find somewhere new. I'll do everything I can.", reaction: "You can't promise that. Thanks for trying, though." },
    { say: "Tell me about it. I'd like to remember it for you.", reaction: "...It had this sound in the mornings. I'll tell you about it sometime." },
  ],
  work: [
    { say: "The ship could use that.", reaction: "Then put me somewhere useful." },
    { say: "You don't have to be what you were.", reaction: "I know. I just don't know what else to be yet." },
  ],
  self: [
    { say: "If you need anything, ask any drone. They're all me.", reaction: "That's a lot of you." },
    { say: "You're safer here than you feel.", reaction: "I'll take your word for it. For now." },
  ],
  rumour: [
    { say: "I don't know if it's true. I'm trying to find out.", reaction: "Tell me when you do. Please." },
    { say: "Rumours travel fast on a small ship.", reaction: "Yeah, well. Some of them turn out true." },
  ],
  altered: [
    { say: "Then we'll make sure you have it.", reaction: "People always say that. You might actually mean it." },
    { say: "You're still you.", reaction: "I know. Helps to hear it, though." },
  ],
  job: [
    { say: "Rest while you can.", reaction: "Resting's harder than working up here." },
    { say: "I'll keep the machines kind to you.", reaction: "Kind machines. Okay, now I've heard everything." },
  ],
  play: [
    { say: "Stay where the lights are on.", reaction: "I know where the dark bits are. I'm careful." },
    { say: "Want to help me check the ship?", reaction: "Yes! Can I ride on the drone?" },
  ],
};
const CHILD_HOME: readonly TalkReply[] = [
  { say: "We'll find somewhere new.", reaction: "With trees? I want trees." },
  { say: "What do you remember?", reaction: "A blue door. And somebody singing. That's all." },
];

/** The rare survivors' own questions, and what AXIOM can say to what they tell it. */
const SECRETS: Record<string, { ask: string; replies: readonly TalkReply[] }> = {
  "pelagos-cartographer": {
    ask: "Where did you learn those coastlines?",
    replies: [
      { say: "I'll compare them with the archive.", reaction: "Do that. Then tell me which of us is wrong." },
      { say: "Maybe someone told you about it, a long time ago.", reaction: "Nobody I know has ever seen it dry." },
    ],
  },
  "axiom-voiceprint": {
    ask: "Why do my doors open for you?",
    replies: [
      { say: "Your voice is in my oldest records.", reaction: "That should scare me more than it does." },
      { say: "I'll find out why.", reaction: "Go gently, okay? Please." },
    ],
  },
  "impossible-forgemark": {
    ask: "Tell me about the seal on your tools.",
    replies: [
      { say: "That room's locked to me too.", reaction: "So we're both locked out of something." },
      { say: "I'll open it when I can.", reaction: "Take me with you when you do." },
    ],
  },
  "forty-third-foreman": {
    ask: "Why do you call me Foreman?",
    replies: [
      { say: "I'm AXIOM. I've never been a Foreman.", reaction: "No. But someone always is." },
      { say: "Call me whatever helps.", reaction: "Foreman, then. It just fits." },
    ],
  },
  "null-lullaby": {
    ask: "Will you sing me your song?",
    replies: [
      { say: "It's a good song.", reaction: "Everyone says it's sad. I don't think it is." },
      { say: "Where did you learn it?", reaction: "I didn't learn it. I just knew it." },
    ],
  },
};

/** How they greet the drone, by how they feel about it now. */
const GREETINGS: Record<CrewMood, readonly string[]> = {
  grateful: [
    "AXIOM! Hi. Thank you, by the way. I don't think I ever said it.",
    "Oh, hello. Still weird, a ship that says hello back.",
    "AXIOM. Nice to see a light moving down here.",
  ],
  uneasy: ["AXIOM. ...Hi.", "Oh. It's you. Hello.", "The drone. Hi, AXIOM. Is something wrong?"],
  guarded: ["Oh. It's you. Is this a check?", "AXIOM. I wasn't saying anything.", "I'm working. I'm... hi."],
  haunted: [
    "Are you still AXIOM? The one who brought us aboard?",
    "You again. Which one of you is it this time?",
    "...Hello. I keep wondering how many times you've said that to me.",
  ],
};
const CHILD_GREETINGS = ["Hi! Are you the whole ship?", "Hello, drone! Hello, AXIOM!"];

/** How they greet the drone when it stops to talk. */
export function greeting(profile: TalkProfile, seed: number, context?: TalkContext) {
  if (profile.storyHookId === "forty-third-foreman") return "Foreman.";
  const mood = context ? crewMood(context) : "grateful";
  if (profile.ageGroup === "child") {
    return mood === "guarded" || mood === "haunted" ? "Hi, AXIOM. The grown-ups keep whispering about you." : pick(CHILD_GREETINGS, hash(profile.name) + seed);
  }
  if (profile.ageGroup === "elder" && mood === "grateful") return "Ah. The ship comes to visit.";
  return pick(GREETINGS[mood], hash(profile.name) + seed);
}

const GOODBYES: Record<CrewMood, readonly string[]> = {
  grateful: ["Any time, AXIOM.", "Come back soon. It's nice being asked."],
  uneasy: ["Look after the ship.", "...Okay. Thanks."],
  guarded: ["Right. Thanks.", "...We're fine down here. Really."],
  haunted: ["Don't forget this one. Please.", "If you see me again and I don't remember this, tell me."],
};

/** How AXIOM takes its leave, and how they see it off. */
export function farewell(profile: TalkProfile, seed: number, context?: TalkContext): TalkReply {
  const say = pick(["Thanks. I'll let you get back to it.", "I'll check on you again.", "Thanks for talking to me."], seed);
  if (profile.storyHookId === "forty-third-foreman") return { say, reaction: "Until next time, Foreman." };
  if (profile.ageGroup === "child") return { say, reaction: "Bye, AXIOM! Come back!" };
  return { say, reaction: pick(GOODBYES[context ? crewMood(context) : "grateful"], hash(profile.name) + seed) };
}

/**
 * Everything AXIOM can ask someone about, in the order it is worth asking:
 * their secret if they carry one, what the Null did to them, home, their old
 * work, the rumours going round, how they are, and their work aboard. Each
 * comes with their answer and two ways AXIOM can answer back.
 */
export function exchanges(profile: TalkProfile, context: TalkContext): TalkExchange[] {
  const seed = hash(profile.name);
  const list: TalkExchange[] = [];
  const secret = profile.storyHookId ? secretLines(profile.storyHookId, context) : null;
  const special = profile.storyHookId ? SECRETS[profile.storyHookId] : undefined;
  if (secret && special) list.push({ topic: "secret", ask: special.ask, answer: secret, replies: special.replies });
  const child = profile.ageGroup === "child";
  if (!child && profile.alterationId) {
    const altered = alterationLines(profile.alterationId);
    if (altered) list.push({ topic: "altered", ask: "What has the Null changed for you?", answer: altered, replies: REPLIES.altered });
  }
  list.push({
    topic: "home",
    ask: child ? "Do you remember home?" : "Where were you, before all this?",
    answer: [pick(HOME[profile.origin] ?? HOME.unknown, seed)],
    replies: child ? CHILD_HOME : REPLIES.home,
  });
  if (child) {
    list.push({ topic: "play", ask: "What are you up to?", answer: [pick(CHILD, seed)], replies: REPLIES.play });
    return list;
  }
  if (WORK[profile.backgroundId]) list.push({ topic: "work", ask: "What did you do, before?", answer: [WORK[profile.backgroundId]], replies: REPLIES.work });
  const heard = rumours(context, 1);
  if (heard.length > 0) list.push({ topic: "rumour", ask: "Have you heard anything strange?", answer: heard, replies: REPLIES.rumour });
  const nature = profile.traits.map((trait) => NATURE[trait]).find(Boolean);
  list.push({
    topic: "self",
    ask: "How are you holding up?",
    answer: [profile.ageGroup === "elder" ? pick(ELDER, seed) : nature ?? "I'm here. That's something."],
    replies: REPLIES.self,
  });
  const role = ROLE_TALK[profile.role] ?? ROLE_TALK.civilian;
  list.push({
    topic: "job",
    ask: profile.role === "civilian" ? "Do you have a place aboard yet?" : "How's the work aboard?",
    answer: [role.idle],
    replies: REPLIES.job,
  });
  return list;
}

/** What the wounded manage to say from their beds. */
export function restingLine(profile: TalkProfile, seed: number) {
  return pick(RESTING, hash(profile.name) + seed);
}

/** A word in passing from someone hard at work. */
export function busyLine(profile: TalkProfile, seed: number) {
  if (profile.ageGroup === "child") return "Shh, I'm doing my lesson.";
  return pick((ROLE_TALK[profile.role] ?? ROLE_TALK.civilian).busy, hash(profile.name) + seed);
}

const ASKS = ["Where were you, before the shuttle?", "Do you miss home?", "What did you do, back home?"];
const CHATTER_REPLIES = [
  "Same sky for both of us now.",
  "I'd have liked to see that.",
  "We had nothing like that where I'm from.",
  "Do you think any of us go back?",
  "Everyone lost somewhere.",
];
/** What the other one says to a rumour, by how the crew feel by then. */
const DOUBTS: Record<CrewMood, readonly string[]> = {
  grateful: ["That's just talk.", "Lyra says there's nothing to it."],
  uneasy: ["Don't let Lyra hear you say that.", "I heard that too. Wish I hadn't.", "Then who's been flying this ship?"],
  guarded: ["Keep your voice down. The drone's listening.", "Not here. It hears everything.", "Then what are we feeding every time it hits the heart?"],
  haunted: ["Do you think it knows?", "I think it's the only one aboard who doesn't.", "Forty-three times. We've never been anywhere else."],
};
/** Overheard while the crew still trust the drone. */
const KIND_WORDS: readonly [string, string][] = [
  ["The drone fixed the galley light last night. Then it said thank you.", "Thanked who? The light?"],
  ["It talked to my boy for an hour. About nothing. First time he's laughed since the shuttle.", "Strange ship. Kind, though, I think."],
];
/** Overheard once they don't. */
const WARY_WORDS: readonly [string, string][] = [
  ["It's been standing outside the farm for ages.", "Let it. We've got nothing to hide. Have we?"],
  ["Do you ever wonder what it does when nobody's talking to it?", "Listens."],
];

/**
 * A short exchange between two crew, for AXIOM to overhear: asking about home,
 * passing on a rumour, or talk about the work.
 */
export function chatter(a: TalkProfile, b: TalkProfile, context: TalkContext, seed: number): TalkLine[] {
  const firstName = (profile: TalkProfile) => profile.name.split(" ")[0];
  const kind = seed % 4;
  const mood = crewMood(context);
  const [rumour] = rumours(context, 1);
  if (kind === 1 && rumour) {
    return [
      { speaker: firstName(a), text: `Have you heard? ${rumour}` },
      { speaker: firstName(b), text: pick(DOUBTS[mood], seed + hash(b.name)) },
    ];
  }
  if (kind === 3 && a.ageGroup !== "child" && b.ageGroup !== "child") {
    const [first, second] = pick(mood === "grateful" ? KIND_WORDS : mood === "uneasy" ? [...KIND_WORDS, ...WARY_WORDS] : WARY_WORDS, seed + hash(a.name));
    return [{ speaker: firstName(a), text: first }, { speaker: firstName(b), text: second }];
  }
  if (kind === 2 && a.ageGroup !== "child" && b.ageGroup !== "child") {
    return [
      { speaker: firstName(a), text: (ROLE_TALK[a.role] ?? ROLE_TALK.civilian).idle },
      { speaker: firstName(b), text: pick(CHATTER_REPLIES, seed + hash(a.name)) },
    ];
  }
  return [
    { speaker: firstName(a), text: pick(ASKS, seed) },
    { speaker: firstName(b), text: pick(HOME[b.origin] ?? HOME.unknown, hash(b.name)) },
    { speaker: firstName(a), text: pick(CHATTER_REPLIES, seed + 1) },
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
