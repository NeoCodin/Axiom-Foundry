import {
  CREW_DIALOGUE,
  DISCOVERY_FRAGMENTS,
  ENDING_DOCTRINES,
  type DiscoveryFragment,
  type DiscoveryId,
  type DoctrineId,
  type ExpeditionId,
  type RoomId,
  type WorldId,
} from "./discovery-content.ts";

const unique = <T extends string>(values: readonly T[]) => [...new Set(values)];

function requirementsMet(
  discovered: ReadonlySet<string>,
  fragment: DiscoveryFragment,
) {
  return (fragment.unlock.requires ?? []).every((id) => discovered.has(id));
}

export function syncAutomaticDiscoveries(
  discoveryIds: readonly string[],
  worldsSaved: number,
  orientationComplete: boolean,
) {
  const discovered = new Set<string>(discoveryIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const fragment of DISCOVERY_FRAGMENTS) {
      if (discovered.has(fragment.id) || !requirementsMet(discovered, fragment)) {
        continue;
      }

      const unlock = fragment.unlock;
      const shouldUnlock =
        unlock.kind === "start"
          ? orientationComplete
          : unlock.kind === "saved-worlds"
            ? worldsSaved >= unlock.count
            : false;

      if (shouldUnlock) {
        discovered.add(fragment.id);
        changed = true;
      }
    }
  }

  return unique([...discovered]);
}

/**
 * The records a player normally has on arriving at a world (its place on the route, which
 * is also how many worlds are saved by then): what each world gave on leaving it, and what
 * could be searched for or compared during the world before. The QA checkpoints use this,
 * so a jump to a world brings the story a player would have brought there.
 */
export function getStoryRecordsAtArrival(worldIndex: number) {
  const found = new Set<string>();
  const sweep = (takes: (fragment: DiscoveryFragment) => boolean) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const fragment of DISCOVERY_FRAGMENTS) {
        if (found.has(fragment.id) || !requirementsMet(found, fragment) || !takes(fragment)) continue;
        found.add(fragment.id);
        changed = true;
      }
    }
  };
  sweep((fragment) => fragment.unlock.kind === "start");
  for (let saved = 1; saved <= worldIndex; saved += 1) {
    sweep((fragment) => fragment.unlock.kind !== "start" && fragment.unlock.kind !== "saved-worlds");
    sweep(({ unlock }) => unlock.kind === "saved-worlds" && unlock.count <= saved);
  }
  return DISCOVERY_FRAGMENTS.filter((fragment) => found.has(fragment.id)).map((fragment) => fragment.id);
}

export function getNextRoomDiscovery(
  discoveryIds: readonly string[],
  roomId: RoomId,
  roomLevel: number,
) {
  const discovered = new Set(discoveryIds);
  return (
    DISCOVERY_FRAGMENTS.find((fragment) => {
      const unlock = fragment.unlock;
      return (
        !discovered.has(fragment.id) &&
        unlock.kind === "room-action" &&
        unlock.roomId === roomId &&
        roomLevel >= (unlock.repeat ?? 1) &&
        requirementsMet(discovered, fragment)
      );
    }) ?? null
  );
}

/**
 * The room search the story is waiting on, if any: the room-action record whose
 * evidence is all in, its room, and whether that room is open and reinforced
 * enough to search yet (level 0 is still sealed). Without this the chain stops
 * at the first room record and everything after it, both harder endings included,
 * can never be found.
 */
export function getRoomInvestigation(
  discoveryIds: readonly string[],
  rooms: readonly { id: RoomId; level: number }[],
) {
  const discovered = new Set(discoveryIds);
  for (const fragment of DISCOVERY_FRAGMENTS) {
    const unlock = fragment.unlock;
    if (discovered.has(fragment.id) || unlock.kind !== "room-action" || !requirementsMet(discovered, fragment)) continue;
    const level = rooms.find((room) => room.id === unlock.roomId)?.level ?? 0;
    const needed = unlock.repeat ?? 1;
    return { fragment, roomId: unlock.roomId, actionId: unlock.actionId, level, needed, ready: level >= needed };
  }
  return null;
}

export function getNextArchiveDiscovery(discoveryIds: readonly string[]) {
  const discovered = new Set(discoveryIds);
  return (
    DISCOVERY_FRAGMENTS.find(
      (fragment) =>
        !discovered.has(fragment.id) &&
        fragment.unlock.kind === "archive-action" &&
        requirementsMet(discovered, fragment),
    ) ?? null
  );
}

export function getExpeditionDiscovery(
  discoveryIds: readonly string[],
  expeditionId: ExpeditionId,
) {
  const discovered = new Set(discoveryIds);
  return (
    DISCOVERY_FRAGMENTS.find((fragment) => {
      const unlock = fragment.unlock;
      return (
        !discovered.has(fragment.id) &&
        unlock.kind === "expedition-discovery" &&
        unlock.expeditionId === expeditionId &&
        requirementsMet(discovered, fragment)
      );
    }) ?? null
  );
}

export function addDiscovery(
  discoveryIds: readonly string[],
  discoveryId: DiscoveryId,
) {
  return unique([...discoveryIds, discoveryId]);
}

export function getDiscoveredFragments(discoveryIds: readonly string[]) {
  const discovered = new Set(discoveryIds);
  return DISCOVERY_FRAGMENTS.filter((fragment) => discovered.has(fragment.id));
}

export function getDoctrineAvailability(
  discoveryIds: readonly string[],
  worldsSaved: number,
) {
  const discovered = new Set(discoveryIds);
  return ENDING_DOCTRINES.map((doctrine) => ({
    doctrine,
    available:
      worldsSaved >= 6 &&
      discoveryIds.length >= doctrine.unlock.minDiscoveries &&
      doctrine.unlock.requiredDiscoveries.every((id) => discovered.has(id)),
  }));
}

export function getChosenDoctrine(
  doctrineId: DoctrineId | null,
) {
  if (!doctrineId) return null;
  return ENDING_DOCTRINES.find((doctrine) => doctrine.id === doctrineId) ?? null;
}

export function getCrewTransmission(
  discoveryIds: readonly string[],
  worldsSaved: number,
  crew: readonly {
    homeworld: WorldId | string;
    assignedRoomId: RoomId | null;
  }[],
  rotationSeed: number,
) {
  const discovered = new Set(discoveryIds);
  const eligible = CREW_DIALOGUE.filter((dialogue) => {
    if (!(dialogue.unlock.requires ?? []).every((id) => discovered.has(id))) {
      return false;
    }

    const matchingCrew = crew.some(
      (member) =>
        member.homeworld === dialogue.homeworld &&
        member.assignedRoomId === dialogue.roomId,
    );
    if (!matchingCrew) return false;

    if (dialogue.unlock.kind === "saved-worlds") {
      return worldsSaved >= dialogue.unlock.count;
    }
    if (dialogue.unlock.kind === "room-action") {
      return true;
    }
    return false;
  });

  if (eligible.length === 0) return null;
  const safeSeed = Number.isFinite(rotationSeed)
    ? Math.max(0, Math.floor(rotationSeed))
    : 0;
  const dialogue = eligible[safeSeed % eligible.length];
  const line = dialogue.lines[Math.floor(safeSeed / eligible.length) % dialogue.lines.length];
  return line ?? null;
}
