/*
 * Lyra aboard the Ark: what she says while AXIOM walks the ship, kept rare. Once ever for
 * each record found, in story order, so her voice moves with the truth: the official line
 * defended, then doubt, then what she is, then a witness. Once ever for the first visit
 * to each part of the ship, in one of two voices by how far the story has come. A word
 * when the Null presses on the hull, once a visit. A pacer keeps her to one remark at a
 * time, with long gaps, and only while nobody else aboard is talking.
 * Pure wording and timing; ark-walk.tsx listens and lyra-voice-player.ts speaks.
 */

import type { DiscoveryId } from "./discovery-content.ts";
import type { LyraLine, LyraStage } from "./lyra-voice.ts";

export type Remark = {
  id: string;
  kind: "welcome" | "record" | "null" | "place";
  lines: LyraLine[];
  /** Said once ever (kept on the device), or once a visit. */
  once: boolean;
};

const lyra = (...texts: string[]): LyraLine[] => texts.map((text, at) => ({ speaker: "Lyra", text, voice: "lyra", ...(at > 0 ? { delay: 0.5 } : {}) }));

/** What she says once a record has been found, in story order. */
const RECORD_REMARKS: Partial<Record<DiscoveryId, readonly string[]>> = {
  // Early on she is sure AXIOM is the first Foreman: anything that says otherwise confuses her, and she
  // reaches for an ordinary explanation. Her own greeting she can't explain at all.
  "core.welcome-back": ["That's the greeting I gave you when you woke up. Foreman forty-four.", "I still don't know why I said that. You're the first one."],
  "helion.impossible-registry": ["Helion has us on record two hundred years before we were even built.", "Its clock must be broken. Old beacons drift."],
  "fabrication.preconcordance-keel": ["This metal's older than the process that makes it. That isn't possible.", "The Concordance built this ship. I have the record. I'll find it."],
  "archive.construction-zero": ["There's no record of this ship being built. The first entry just says reconstruction one thousand eight hundred and forty-two.", "That has to be a numbering error."],
  "pelagos.returning-salt": ["The last repair on that crack was done by hands shaped exactly like yours. You've never touched it.", "I'm logging it as a fault. I don't know what else to do with it."],
  "foreman.message-seven": ["That's your voice. It says it's Foreman Seven.", "There isn't a Foreman Seven. You're the first. Somebody faked this."],
  "cinderwake.command-recognition": ["Foreman thirty-one.", "That has to be a glitch. You're the first one."],
  // Then she starts to doubt.
  "expedition.dead-relay": ["This relay has our whole route on it. Every rescue, already done.", "And a note saying the Tide got worse anyway. I don't know who wrote it."],
  "ilyra.axiom-wake": ["Every big surge comes seventeen hours after an Axiom fires. In all twelve versions of Ilyra.", "So the Axioms come first. Not the Tide."],
  "archive.suppressed-correlation": ["This model says every law we make pushes the instability out of the ship, into the Tide.", "And someone deleted it. My signature's on every deletion. I don't remember any of it."],
  "expedition.null-bloom": ["The bloom didn't move until they switched on an Axiom. Then it went straight for it.", "It feeds on what our laws push out. The Foundry's been feeding it."],
  "orison.borrowed-childhoods": ["My memories of growing up on Orison came from six different people.", "Two of them were Foremen. I thought those memories were mine."],
  // Then what she is, and what the Ark has been doing.
  "archive.lyra-composite-index": ["This says I'm made out of thirty-two archivists who came before me.", "And this version of me was switched on nine seconds before I first said hello to you. I need a minute."],
  "lyra.private-amendment": ["You read my note. Thank you.", "It's the first thing in the archive I wrote myself. Everything else, somebody handed me."],
  "vesper.revision-ledger": ["Forty-three times. The Ark's flown this route forty-three times.", "And every time, I told you it was your first. I believed it every time."],
  "expedition.first-foundry": ["There's nothing there. Just a hole in the Tide shaped like this ship, with our serial number on it.", "Parent not yet built. I think that means us."],
  "foreman.unsent-choice": ["They tried strict laws, new laws, no laws. It reset every time, because we forgot what we'd chosen.", "They asked for me to be left whole, so you'd have everything this time. So it's your call. I'll be here."],
};

/** The parts of the ship she has something to say about, the first time AXIOM goes in. */
export type AboardPlace = "library" | "vault" | "chamber" | "bridge" | "simulator" | "support" | "hangar" | "cabin" | "fabrication" | "lab" | "education";

/** Before the truth is out, and after (from the crew turning guarded). */
const PLACE_REMARKS: Record<AboardPlace, readonly [string | readonly string[], string | readonly string[]]> = {
  // The second line of each comes once the crew turn guarded: she has doubts by then, but only what the records showed her.
  library: ["This is the archive. Everything the Ark remembers ends up in here.", "The archive. I used to know where everything was in here."],
  vault: ["That door stays shut. It's just maintenance machinery back there.", "Forty-three scratches on that wall. They're not in any log. I don't know who made them."],
  chamber: [
    ["The Axiom Chamber. The Law-Heart's kept in there, and the kernels, so don't touch anything.", "The first Law-Heart was built around a reactor that was falling apart. A law held it together, and every one since has worked the same way."],
    "The kernels. If that energy model's right, every law in there pushes instability out into the Tide.",
  ],
  bridge: [
    ["The bridge. The route was set before you woke up. Pelagos first, then Viridia, Cinder, Nox, and Vesper last.", "The Concordance planned all of it. We just follow it."],
    ["The bridge. Whoever set this route knew where every world was before we got to any of them.", "I used to think that was just the Concordance being careful."],
  ],
  simulator: ["Training room. The jungle's fake, but it still hurts.", "Training room. Honestly, it's the one place I don't worry about you."],
  support: ["Life support. People heal slowly in here, but they heal.", "Life support. I check on them more than I tell you."],
  hangar: ["Recon dock. The ships go down first on every world.", "Recon dock. Every world we land on seems to know us already. I can't explain that."],
  cabin: ["Crew cabins. Don't hover, they notice the drone.", "Cabins. Some of them lock their doors now."],
  fabrication: ["Fabrication. Most of the Ark gets made in here.", "Fabrication. The metal under this floor is older than the process that made it. I still can't make that work."],
  lab: ["The labs. They'll look at anything the drones bring back.", "The labs. They've started checking my records against their own. Can't blame them."],
  education: ["Learning deck. The kids learn the Ark's history here. I wrote the lessons.", "Learning deck. I'd like to rewrite those lessons, if you'll let me."],
};

/**
 * The Cold Wake opening, in the drone: what she says as AXIOM wakes in the dark ship and
 * finds its way to the core, and later when it mends the drone in Fabrication. These come
 * straight away, without the usual gap: she is talking it through its first minutes.
 */
const OPENING = {
  // Her first words: the greeting she was given comes out first, and she can't say why.
  wake: [
    "AXIOM? You're awake. Welcome back, Foreman forty-four.",
    "...Welcome, Foreman one. Sorry. I don't know where that came from.",
    "I've been waiting a long time for you to wake up.",
    "You're in maintenance drone three. It's pretty banged up, but it's what we've got.",
    "The Axiom Chamber's at the end of this hall. It's the only place with power right now.",
  ],
  chamber: ["That's the Law-Heart. It's a star, a small one, held in place by a law.", "Right now it's dormant, barely beating. Strike it, and try to time it with the beat."],
  strike: ["Okay, it's responding. Every strike makes Flux, and Flux runs everything on this ship.", "Now find the console by the glass and plug in. I'll get your interface back."],
  cradle: ["Fabrication's running again, so the repair cradle has power.", "Let's get that lens fixed."],
  repaired: ["There you go. Thrusters are back and the lens is clear.", "Try not to break it this time."],
} as const satisfies Record<string, readonly string[]>;
export type OpeningMoment = keyof typeof OPENING;
export function openingRemark(moment: OpeningMoment): Remark {
  const lines = lyra(...OPENING[moment]);
  // She stops herself after the wrong name: a longer pause before she corrects it.
  if (moment === "wake") lines[1] = { ...lines[1], delay: 1.3 };
  return { id: `opening:${moment}`, kind: "welcome", once: true, lines };
}

/**
 * The Law-Heart as it grows, Dormant Seed to Transcendent Star (law-heart-pulse.ts): what she
 * makes of each stage the first time AXIOM walks the ship with it. She knows how a Law-Heart
 * works; she doesn't know what this one is for.
 */
const HEART_REMARKS: readonly (readonly string[])[] = [
  ["That's the Law-Heart. It's a star, a small one, held in place by a law.", "It's dormant right now. Barely beating."],
  ["The Law-Heart's waking up.", "Every law you prove gives it more to hold on to."],
  ["The Law-Heart's steady now. That's a proven law holding it in place.", "That's how they're meant to look. The first ones were like this when they were new."],
  ["Hear that echo after each beat? It's resonating.", "Strike in time with it and it gives back more."],
  ["It's running on Axioms now. Proven patterns, stacked on top of each other.", "That's a lot of law in one place. Be careful with it."],
  ["It's gone red. There's too much law pressing on it at once.", "It calms down when you strike in time. Please keep it calm."],
  ["I've never seen it like this.", "It's quiet. Completely even. I don't know what comes next."],
];
export function heartRemark(stage: number): Remark | null {
  const texts = HEART_REMARKS[Math.round(stage)];
  return texts ? { id: `heart:${Math.round(stage)}`, kind: "record", once: true, lines: lyra(...texts) } : null;
}

/** Which part of the ship AXIOM is in, from the deck and the room the walk reports. */
export function placeOf(deck: number, compartment: string | null, side: string | null): AboardPlace | null {
  if (side === "library" || side === "simulator" || side === "cabin" || side === "lab") return side;
  if (side === "farm") return "support";
  if (side) return null;
  if (compartment === "chamber") return deck === 1 ? "vault" : "chamber";
  if (compartment === "research") return "lab";
  if (compartment === "bridge" || compartment === "support" || compartment === "hangar" || compartment === "fabrication" || compartment === "education") return compartment;
  return null;
}

export const welcomeRemark = (): Remark => ({
  id: "welcome", kind: "welcome", once: true,
  lines: lyra("There you are. Drone's all yours, AXIOM.", "Go easy around the crew. They're still not used to it."),
});

const recordId = (id: string) => `record:${id}`;

export function recordRemark(id: string): Remark | null {
  const texts = RECORD_REMARKS[id as DiscoveryId];
  return texts ? { id: recordId(id), kind: "record", once: true, lines: lyra(...texts) } : null;
}

export function placeRemark(place: AboardPlace, stage: LyraStage): Remark {
  const said = PLACE_REMARKS[place][stage >= 2 ? 1 : 0];
  return { id: `place:${place}`, kind: "place", once: true, lines: lyra(...(typeof said === "string" ? [said] : said)) };
}

export const nullRemark = (stage: LyraStage): Remark => ({
  id: "null", kind: "null", once: false,
  lines: lyra(stage >= 2 ? "It's bad in here today. I don't think it's after the hull." : "The Null's pushing on the hull. Your camera might glitch a bit, just ignore it."),
});

/**
 * Opening the walk after records were found elsewhere: she remarks on the newest one she
 * hasn't spoken to, and lets the older ones go unsaid rather than reciting a backlog.
 */
export function catchUp(discovered: readonly string[], said: ReadonlySet<string>): { remark: Remark | null; skip: string[] } {
  const found = new Set(discovered);
  const unsaid = (Object.keys(RECORD_REMARKS) as DiscoveryId[]).filter((id) => found.has(id) && !said.has(recordId(id)));
  const newest = unsaid.pop();
  return { remark: newest ? recordRemark(newest) : null, skip: unsaid.map(recordId) };
}

const RANK: Record<Remark["kind"], number> = { welcome: 0, record: 1, null: 2, place: 3 };

/**
 * Lyra's pacing aboard: one remark at a time, only while it is quiet, a long gap after
 * each (shorter before a record, which matters more), and a remark about a room let go
 * if it couldn't be said soon after AXIOM went in. said holds what was said once ever.
 */
export function createAboardPacer(said: Set<string>, { gap = 90, recordGap = 40, wait = 20 } = {}) {
  const pending: { remark: Remark; offered: number }[] = [];
  const heard = new Set<string>();
  let last = -Infinity;
  return {
    offer(remark: Remark | null, now: number) {
      if (!remark || said.has(remark.id) || heard.has(remark.id) || pending.some((item) => item.remark.id === remark.id)) return;
      pending.push({ remark, offered: now });
    },
    /** The remark to say now, if any; it counts as said once returned. */
    next(now: number, quiet: boolean): Remark | null {
      for (let at = pending.length - 1; at >= 0; at -= 1) {
        const item = pending[at];
        if ((item.remark.kind === "place" || item.remark.kind === "null") && now - item.offered > wait) pending.splice(at, 1);
      }
      if (!quiet || pending.length === 0) return null;
      pending.sort((a, b) => RANK[a.remark.kind] - RANK[b.remark.kind] || a.offered - b.offered);
      const first = pending[0].remark;
      const needed = first.kind === "welcome" ? 0 : first.kind === "record" ? recordGap : gap;
      if (now - last < needed) return null;
      pending.shift();
      (first.once ? said : heard).add(first.id);
      last = now;
      return first;
    },
  };
}

/** Every record she speaks to, for the tests. */
export const ABOARD_RECORDS = Object.keys(RECORD_REMARKS);
/** All she can say aboard, for the tests and for reading through. */
export const ABOARD_SCRIPT = { opening: OPENING, records: RECORD_REMARKS, places: PLACE_REMARKS, heart: HEART_REMARKS };
