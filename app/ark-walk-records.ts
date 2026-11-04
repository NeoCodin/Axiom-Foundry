/*
 * Where the Ark keeps its story, for the drone view. Every record the Lore Archive
 * can hold has a place aboard. What the ship itself holds is there from the start
 * (the boot buffer, the Recalibration Vault, the Memory Archive's terminal), or shows
 * once the story points at it (a seam the Fabrication refit opened, scratches in the
 * vault's wall). What was found on a world or by a recon team is brought aboard, and
 * nothing shows in its place until then: the Helion beacon's registry and Vesper's
 * ledger either side of the bridge door, a core from Pelagos's Gravity Keel in the
 * machine shop, seeds from Viridia's vault in the farm, Cinder's foundry logs and the
 * Nox recordings in the lab, and the recon teams' finds on the briefing room wall.
 * The three room searches happen at their places; the archive's comparisons happen
 * at its terminal. Pure placement and wording; ark-walk.tsx draws and runs it.
 */

import { DISCOVERY_FRAGMENTS, type DiscoveryFragment, type DiscoveryId, type RoomId } from "./discovery-content.ts";
import { HALF_DEPTH, type SideRoomKind, type WalkLayout, type WalkRoomKind } from "./ark-walk-layout.ts";

/** How a place looks: a crack in the floor, a wall screen, a case on the wall, the vault door, the archive's terminal, carved marks. */
export type RecordForm = "seam" | "plate" | "case" | "vault" | "terminal" | "scar";
/** What a case holds. */
export type RecordItem = "salt" | "prism" | "seeds" | "relay" | "bloom" | "origin";

export type RecordPlace = {
  id: string;
  /** What AXIOM calls the spot. */
  label: string;
  deck: 0 | 1;
  section: WalkRoomKind;
  /** A room behind the hall's port wall, or the hall itself. */
  side?: SideRoomKind;
  /**
   * The surface it is on: the floor, the hall's port wall, a side room's far wall, or
   * the stern or bow wall of the room (facing into it).
   */
  mount: "floor" | "port" | "far" | "stern" | "bow";
  /** Along the room from its stern end, for floor, port and far mounts. */
  along?: number;
  /** Across the ship for floor and hall wall mounts; from the far wall in a side room. */
  across?: number;
  /** Height of its middle above the floor. */
  height: number;
  form: RecordForm;
  item?: RecordItem;
  /** The records kept here, in story order. */
  records: readonly DiscoveryId[];
  /** Shown, though there is nothing to read yet, once this record is found. */
  appearsWith?: DiscoveryId;
  /** Brought aboard from a world or by a recon team: nothing shows here until it is found. */
  brought?: boolean;
  /** The archive's comparisons are made here. */
  archive?: boolean;
};

export const RECORD_PLACES: readonly RecordPlace[] = [
  // ---- Upper deck ----
  {
    id: "foundation-seam", label: "A seam in the deck plate", deck: 0, section: "fabrication",
    mount: "floor", along: 9, across: 0, height: 0, form: "seam", records: ["fabrication.preconcordance-keel"],
  },
  {
    id: "keel-sample", label: "A core cut from Pelagos's Gravity Keel", deck: 0, section: "fabrication", side: "workshop",
    mount: "far", along: 8, height: 1.5, form: "case", item: "salt", records: ["pelagos.returning-salt"], brought: true,
  },
  {
    id: "boot-buffer", label: "Boot buffer A", deck: 0, section: "chamber",
    mount: "port", along: 6.2, height: 1.7, form: "plate", records: ["core.welcome-back"],
  },
  // What the drones bring back gets studied in the labs.
  {
    id: "foundry-logs", label: "A log core from Cinder's foundries", deck: 0, section: "research", side: "lab",
    mount: "far", along: 6.6, height: 1.5, form: "case", item: "prism", records: ["ilyra.axiom-wake"], brought: true,
  },
  {
    id: "nox-recordings", label: "Recordings from Nox's towers", deck: 0, section: "research", side: "lab",
    mount: "far", along: 9.2, height: 1.6, form: "plate", records: ["orison.borrowed-childhoods"], brought: true,
  },
  // The first beacon and the last ledger, either side of the bridge door: every record begins at one and ends at the other.
  {
    id: "first-beacon", label: "The Helion beacon's registry", deck: 0, section: "bridge",
    mount: "stern", across: -7, height: 2, form: "plate", records: ["helion.impossible-registry"], brought: true,
  },
  {
    id: "revision-ledger", label: "Vesper's sealed revision ledger", deck: 0, section: "bridge",
    mount: "stern", across: 7, height: 2, form: "plate", records: ["vesper.revision-ledger"], brought: true,
  },
  // ---- Lower deck ----
  {
    id: "seed-vault", label: "Seeds from Viridia's vault", deck: 1, section: "support", side: "farm",
    mount: "far", along: 12.1, height: 1.8, form: "case", item: "seeds", records: ["cinderwake.command-recognition"], brought: true,
  },
  {
    id: "recalibration-vault", label: "The Recalibration Vault", deck: 1, section: "chamber",
    mount: "port", along: 6.2, height: 1.4, form: "vault", records: ["foreman.message-seven"],
  },
  // "We used to leave scars in the walls because she could not edit stone."
  {
    id: "scar-record", label: "Scratches in the wall", deck: 1, section: "chamber",
    mount: "port", along: 12.75, height: 1.5, form: "scar", records: ["foreman.unsent-choice"], appearsWith: "foreman.message-seven",
  },
  {
    id: "memory-archive", label: "The Memory Archive", deck: 1, section: "education", side: "library",
    mount: "bow", across: 4.4, height: 1.4, form: "terminal", archive: true,
    records: ["lyra.official-brief", "archive.construction-zero", "archive.suppressed-correlation", "archive.lyra-composite-index", "lyra.private-amendment"],
  },
  {
    id: "dead-relay", label: "The relay from beyond the chart", deck: 1, section: "hangar", side: "briefing",
    mount: "far", along: 1.2, height: 1.5, form: "case", item: "relay", records: ["expedition.dead-relay"], brought: true,
  },
  {
    id: "null-bloom", label: "A sealed bloom sample", deck: 1, section: "hangar", side: "briefing",
    mount: "far", along: 2.8, height: 1.5, form: "case", item: "bloom", records: ["expedition.null-bloom"], brought: true,
  },
  {
    id: "origin-coordinate", label: "The origin coordinates", deck: 1, section: "hangar", side: "briefing",
    mount: "far", along: 4.4, height: 1.5, form: "case", item: "origin", records: ["expedition.first-foundry"], brought: true,
  },
];

/** Where a place is in the walk: its deck, its middle, and which way it faces into the room. */
export type RecordSpot = { deck: number; x: number; y: number; z: number; normal: { x: number; z: number } };

export function recordSpot(place: RecordPlace, layout: WalkLayout): RecordSpot | null {
  const deck = layout.decks[place.deck];
  const hall = deck?.compartments.find((compartment) => compartment.kind === place.section);
  if (!deck || !hall) return null;
  const side = place.side ? deck.sideRooms.find((room) => room.kind === place.side && room.section === place.section) : null;
  if (place.side && !side) return null;
  const y = deck.floorY + place.height;
  const room = side ?? { x0: hall.x0, x1: hall.x1, z0: -HALF_DEPTH, z1: HALF_DEPTH };
  // In a side room, across counts from its far wall; in a hall, it is the ship's own z.
  const acrossZ = (across = 0) => (side ? side.z0 + across : across);
  switch (place.mount) {
    case "floor":
      return { deck: place.deck, x: room.x0 + (place.along ?? 0), y: deck.floorY, z: acrossZ(place.across), normal: { x: 0, z: 0 } };
    case "port":
      return { deck: place.deck, x: hall.x0 + (place.along ?? 0), y, z: -HALF_DEPTH, normal: { x: 0, z: 1 } };
    case "far":
      return { deck: place.deck, x: room.x0 + (place.along ?? 0), y, z: room.z0, normal: { x: 0, z: 1 } };
    case "stern":
      return { deck: place.deck, x: room.x0, y, z: acrossZ(place.across), normal: { x: 1, z: 0 } };
    case "bow":
      return { deck: place.deck, x: room.x1, y, z: acrossZ(place.across), normal: { x: -1, z: 0 } };
  }
}

/** What there is to do at a place right now. */
export type PlaceState = {
  /** Records found here, in story order. */
  found: DiscoveryFragment[];
  /** The search the story is waiting on is here. */
  search: boolean;
  /** The archive has a comparison ready (only at the archive). */
  crossIndex: boolean;
  /** Something is here to see, if nothing yet to read. */
  visible: boolean;
};

const FRAGMENTS = new Map(DISCOVERY_FRAGMENTS.map((fragment) => [fragment.id as string, fragment]));

export function fragmentOf(id: string) {
  return FRAGMENTS.get(id) ?? null;
}

export function placeState(
  place: RecordPlace,
  discovered: readonly string[],
  searchRecordId: string | null,
  crossIndexReady: boolean,
): PlaceState {
  const have = new Set(discovered);
  const found = place.records.filter((id) => have.has(id)).map((id) => FRAGMENTS.get(id)!).filter(Boolean);
  const search = searchRecordId !== null && (place.records as readonly string[]).includes(searchRecordId);
  const crossIndex = Boolean(place.archive && crossIndexReady);
  // What was brought aboard shows once it is; the boot buffer, the vault and the archive
  // are part of the ship; a seam shows once the story points at it, and the scratches
  // once Foreman Seven has said what they are.
  const shipPart = !place.brought && !place.appearsWith && place.form !== "seam" && place.form !== "scar";
  const visible = found.length > 0 || search || crossIndex || shipPart || Boolean(place.appearsWith && have.has(place.appearsWith));
  return { found, search, crossIndex, visible };
}

/** A record read aloud: where it came from, what it says, and what AXIOM makes of it. */
export function recordLines(fragment: DiscoveryFragment): { speaker: string; text: string }[] {
  return [
    ...fragment.excerpt.map((text) => ({ speaker: fragment.source, text })),
    ...(fragment.contradiction ? [{ speaker: "AXIOM", text: fragment.contradiction }] : []),
  ];
}

/** The place a record is kept, for the archive's own notes ("Kept aboard: the library"). */
export function placeOfRecord(id: string) {
  return RECORD_PLACES.find((place) => (place.records as readonly string[]).includes(id)) ?? null;
}

/** Which game room each search needs reinforced, by the record it finds. */
export const SEARCH_ROOMS: Partial<Record<DiscoveryId, RoomId>> = Object.fromEntries(
  DISCOVERY_FRAGMENTS.flatMap((fragment) => (fragment.unlock.kind === "room-action" ? [[fragment.id, fragment.unlock.roomId]] : [])),
);
