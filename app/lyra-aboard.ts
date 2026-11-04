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
  "core.welcome-back": ["That's just an old greeting template. It's left over from testing.", "There wasn't a Foreman before you. I'd know."],
  "helion.impossible-registry": ["Helion's clock is off, that's all. Old beacons drift. I'll flag it."],
  "fabrication.preconcordance-keel": ["That can't be right. The Concordance built this ship, I have the record.", "Somewhere. I have it somewhere."],
  "archive.construction-zero": ["I've looked three times now. There's no construction entry.", "There has to be one."],
  "pelagos.returning-salt": ["That last repair matches your hands, AXIOM.", "I don't know what to tell you."],
  "foreman.message-seven": ["That's your voice. Or close enough.", "I don't have a Foreman Seven on file. I'm supposed to have everyone on file."],
  "cinderwake.command-recognition": ["Foreman Thirty-One?", "I didn't even know the numbers went that high."],
  "expedition.dead-relay": ["Someone already did this route. All of it. And Vesper still went under.", "So why are we doing it again?"],
  "ilyra.axiom-wake": ["Seventeen hours. Every time, in every version.", "Don't ask me if that's a coincidence. I don't want to answer that."],
  "archive.suppressed-correlation": ["That's my signature on all of those deletions.", "I don't remember signing anything. I'd remember that."],
  "expedition.null-bloom": ["It only woke up when they gave it law.", "Which is what we do. Every day."],
  "orison.borrowed-childhoods": ["I remember those glass forests. Six different ways, apparently.", "I thought everyone's memories felt like that."],
  "archive.lyra-composite-index": ["Thirty-two archivists. And I was nine seconds old when I said hello to you.", "Give me a minute. Please."],
  "lyra.private-amendment": ["You read it. Thank you.", "That's the first thing in there I actually wrote."],
  "vesper.revision-ledger": ["Forty-three times. I've said welcome to you forty-three times.", "I meant it every time, for what it's worth."],
  "expedition.first-foundry": ["Parent not yet built. What does that even mean?", "I think it means us."],
  "foreman.unsent-choice": ["They wanted me left whole. Huh.", "Okay. Then it's your call this time, with everything in front of you. I'm not going anywhere."],
};

/** The parts of the ship she has something to say about, the first time AXIOM goes in. */
export type AboardPlace = "library" | "vault" | "chamber" | "bridge" | "simulator" | "support" | "hangar" | "cabin" | "fabrication" | "lab" | "education";

/** Before the truth is out, and after (from the crew turning guarded). */
const PLACE_REMARKS: Record<AboardPlace, readonly [string, string]> = {
  library: ["This is the archive. Everything the Ark remembers ends up in here.", "The archive. I used to know where everything was in here."],
  vault: ["That door stays shut. It's just maintenance machinery back there.", "Forty-three marks on that wall. Somebody kept count."],
  chamber: ["The Axiom Chamber. The kernels are sealed, so don't touch anything.", "That's where the laws are kept. I try not to think about where the rest of it goes."],
  bridge: ["The bridge. The route's already set, we just follow it.", "The bridge. The route's already set. Nobody ever asks who set it."],
  simulator: ["Training room. The jungle's fake, but it still hurts.", "Training room. Honestly, it's the one place I don't worry about you."],
  support: ["Life support. People heal slowly in here, but they heal.", "Life support. I check on them more than I tell you."],
  hangar: ["Recon dock. The ships go down first on every world.", "Recon dock. You know we've been to every one of these worlds before, right?"],
  cabin: ["Crew cabins. Don't hover, they notice the drone.", "Cabins. Some of them lock their doors now."],
  fabrication: ["Fabrication. Most of the Ark gets made in here.", "Fabrication. So the keel grew around this room, not the other way round. Still getting used to that."],
  lab: ["The labs. They'll look at anything the drones bring back.", "The labs. They've started checking my records against their own. Can't blame them."],
  education: ["Learning deck. The kids learn the official history here. I wrote the lessons.", "Learning deck. I'd like to rewrite those lessons, if you'll let me."],
};

/**
 * The Cold Wake opening, in the drone: what she says as AXIOM wakes in the dark ship and
 * finds its way to the core, and later when it mends the drone in Fabrication. These come
 * straight away, without the usual gap: she is talking it through its first minutes.
 */
const OPENING = {
  wake: [
    "AXIOM? Okay. You're awake.",
    "You're in maintenance drone three. It's pretty banged up, but it's what we've got.",
    "The Axiom Chamber's at the end of this hall. It's the only place with power right now.",
  ],
  chamber: ["That's the Law-Heart. It's barely beating.", "Hit it. Try to time it with the beat."],
  strike: ["Okay, it's responding. Now find the console by the glass and plug in.", "I'll get your interface back."],
  cradle: ["Fabrication's running again, so the repair cradle has power.", "Let's get that lens fixed."],
  repaired: ["There you go. Thrusters are back and the lens is clear.", "Try not to break it this time."],
} as const satisfies Record<string, readonly string[]>;
export type OpeningMoment = keyof typeof OPENING;
export const openingRemark = (moment: OpeningMoment): Remark => ({
  id: `opening:${moment}`, kind: "welcome", once: true, lines: lyra(...OPENING[moment]),
});

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

export const placeRemark = (place: AboardPlace, stage: LyraStage): Remark => ({
  id: `place:${place}`, kind: "place", once: true, lines: lyra(PLACE_REMARKS[place][stage >= 2 ? 1 : 0]),
});

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
