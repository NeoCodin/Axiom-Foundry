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
  "core.welcome-back": ["That greeting is a leftover template from testing.", "There was no Foreman before you. I would know."],
  "helion.impossible-registry": ["Helion's clock must have drifted. Old beacons do that. I'll log it as a fault."],
  "fabrication.preconcordance-keel": ["The Concordance built this ship. I have the record.", "I'm sure I have the record."],
  "archive.construction-zero": ["I've searched the archive three times. There's no construction entry. There should be."],
  "pelagos.returning-salt": ["That last repair matches your hands, AXIOM. I don't have an explanation for it."],
  "foreman.message-seven": ["That voice sounds like yours.", "I don't know a Foreman Seven. I'm supposed to know everyone."],
  "cinderwake.command-recognition": ["Foreman Thirty-One. I've never been allowed to say a number that high."],
  "expedition.dead-relay": ["Someone already finished this route, and it didn't save Vesper.", "Why would they send you down it again?"],
  "ilyra.axiom-wake": ["Seventeen hours after every discharge, in every version.", "Please don't ask me if that's chance."],
  "archive.suppressed-correlation": ["That's my signature on every deletion.", "I don't remember signing them. I would remember."],
  "expedition.null-bloom": ["It woke when they fed it law. Like the Tide does.", "Like we do, every day the Foundry runs."],
  "orison.borrowed-childhoods": ["I remember the glass forests six different ways. I thought that was just how memory felt."],
  "archive.lyra-composite-index": ["Thirty-two archivists, and nine seconds old when I met you.", "Don't say anything yet. Please."],
  "lyra.private-amendment": ["Thank you for reading it. It's the first thing in the archive I wrote myself."],
  "vesper.revision-ledger": ["Forty-three times. I've welcomed you forty-three times.", "And I meant it every time."],
  "expedition.first-foundry": ["Parent not yet built.", "We're the reason we exist, aren't we? Round and round."],
  "foreman.unsent-choice": ["They asked for me to be left whole.", "Then the choice is yours, with everything open. I'll be here."],
};

/** The parts of the ship she has something to say about, the first time AXIOM goes in. */
export type AboardPlace = "library" | "vault" | "chamber" | "bridge" | "simulator" | "support" | "hangar" | "cabin" | "fabrication" | "lab" | "education";

/** Before the truth is out, and after (from the crew turning guarded). */
const PLACE_REMARKS: Record<AboardPlace, readonly [string, string]> = {
  library: ["My archive. Everything the Ark remembers is kept in here.", "My archive. I used to think I kept it. Now I think it keeps me."],
  vault: ["That door stays sealed. It's only maintenance machinery.", "Forty-three marks on the wall. Somebody counted, so the next one would know."],
  chamber: ["The Axiom Chamber. The kernels are sealed for everyone's safety.", "The kernels. Every law we carry, pushing what it forbids somewhere else."],
  bridge: ["The bridge. The route's already set. We only have to follow it.", "The bridge. The route's already set. That was always the trouble."],
  simulator: ["The training room. The jungle isn't real, but it still hurts.", "The training room. At least in there, when it ends, it ends."],
  support: ["Life support. They heal slowly here, but they heal.", "Life support. Whatever else is true, these people are real."],
  hangar: ["The recon dock. On every world, the ships go down first.", "The recon dock. Every world we reach, we've reached before."],
  cabin: ["Their cabins. Try not to hover. They notice the drone more than you'd think.", "Their cabins. Some of them have started locking their doors."],
  fabrication: ["The Fabrication floor. Most of the Ark was made right here.", "The Fabrication floor. The keel grew around this room, not the other way."],
  lab: ["The labs. They'll study anything the drones bring back.", "The labs. They've started checking my records against what they find."],
  education: ["The learning deck. The children learn the official history here. I wrote the lessons.", "The learning deck. I'd like to rewrite the lessons, if you'll let me."],
};

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
  lines: lyra("There you are. The drone's yours, AXIOM.", "Mind the crew. They're still getting used to it."),
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
  lines: lyra(stage >= 2 ? "It's louder in here today. I don't think it's the hull it wants." : "The Null's pressing on the hull. Your camera will lie a little. Ignore it."),
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
