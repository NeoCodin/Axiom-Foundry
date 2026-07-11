import {
  type DiscoveryId,
  type DoctrineId,
  type ExpeditionId,
  type RoomId,
  type WorldId,
} from "./discovery-content.ts";

export type CrewSpecialty = "engineering" | "theory" | "navigation";
export type CrewHomeworld = WorldId | "foundry";

export type RoomDefinition = {
  id: RoomId;
  name: string;
  specialty: CrewSpecialty;
  unlockWorlds: number;
  maxLevel: number;
  baseUpgradeCost: number;
};

export type CrewDefinition = {
  id: string;
  canonicalName: string;
  defaultCallsign: string;
  homeworld: CrewHomeworld;
  specialty: CrewSpecialty;
  unlockWorlds: number;
};

export type ExpeditionDefinition = {
  id: ExpeditionId;
  title: string;
  destination: string;
  durationSeconds: number;
  rewardSalvage: number;
  rewardXp: number;
  unlockWorlds: number;
  discoveryId: DiscoveryId;
};

export type LivingRoomState = {
  id: RoomId;
  level: number;
  unlocked: boolean;
};

export type LivingCrewState = {
  id: string;
  callsign: string;
  xp: number;
  level: number;
  assignedRoomId: RoomId | null;
  unlocked: boolean;
};

export type ActiveExpedition = {
  id: ExpeditionId;
  crewIds: string[];
  launchedAt: number;
  endsAt: number;
  rewardSalvage: number;
  rewardXp: number;
  discoveryId: DiscoveryId;
};

export type LivingFoundryState = {
  schema: number;
  foundryName: string;
  salvage: number;
  cohesion: number;
  rooms: LivingRoomState[];
  crew: LivingCrewState[];
  activeExpedition: ActiveExpedition | null;
  expeditionHistory: Partial<Record<ExpeditionId, number>>;
  discoveredLore: string[];
  doctrine: DoctrineId | null;
};

export type LivingFoundryBonuses = {
  manualMultiplier: number;
  productionMultiplier: number;
  machineCostMultiplier: number;
  researchCostMultiplier: number;
  resonanceMultiplier: number;
  expeditionDurationMultiplier: number;
  expeditionRewardMultiplier: number;
};

export const LIVING_FOUNDRY_SCHEMA = 1;
export const MAX_ROOM_LEVEL = 5;
export const MAX_CREW_LEVEL = 10;

export const ROOM_DEFINITIONS: readonly RoomDefinition[] = [
  {
    id: "axiom-chamber",
    name: "Axiom Chamber",
    specialty: "engineering",
    unlockWorlds: 0,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 30,
  },
  {
    id: "fabrication-floor",
    name: "Fabrication Floor",
    specialty: "engineering",
    unlockWorlds: 1,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 35,
  },
  {
    id: "planetfall-bridge",
    name: "Planetfall Bridge",
    specialty: "navigation",
    unlockWorlds: 1,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 30,
  },
  {
    id: "resonance-gallery",
    name: "Resonance Gallery",
    specialty: "theory",
    unlockWorlds: 1,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 45,
  },
  {
    id: "memory-archive",
    name: "Memory Archive",
    specialty: "theory",
    unlockWorlds: 1,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 50,
  },
  {
    id: "research-observatory",
    name: "Research Observatory",
    specialty: "theory",
    unlockWorlds: 2,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 65,
  },
  {
    id: "expedition-bay",
    name: "Expedition Bay",
    specialty: "navigation",
    unlockWorlds: 2,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 75,
  },
  {
    id: "recalibration-vault",
    name: "Recalibration Vault",
    specialty: "engineering",
    unlockWorlds: 4,
    maxLevel: MAX_ROOM_LEVEL,
    baseUpgradeCost: 100,
  },
] as const;

export const CREW_DEFINITIONS: readonly CrewDefinition[] = [
  {
    id: "mara-venn",
    canonicalName: "Mara Venn",
    defaultCallsign: "Forge",
    homeworld: "foundry",
    specialty: "engineering",
    unlockWorlds: 0,
  },
  {
    id: "ivo-senn",
    canonicalName: "Ivo Senn",
    defaultCallsign: "Proof",
    homeworld: "foundry",
    specialty: "theory",
    unlockWorlds: 1,
  },
  {
    id: "cael-rook",
    canonicalName: "Cael Rook",
    defaultCallsign: "Keel",
    homeworld: "foundry",
    specialty: "navigation",
    unlockWorlds: 1,
  },
  {
    id: "sena-marr",
    canonicalName: "Sena Marr",
    defaultCallsign: "Dawn",
    homeworld: "helion",
    specialty: "engineering",
    unlockWorlds: 1,
  },
  {
    id: "aro-vale",
    canonicalName: "Aro Vale",
    defaultCallsign: "Tide",
    homeworld: "pelagos",
    specialty: "navigation",
    unlockWorlds: 2,
  },
  {
    id: "oren-kes",
    canonicalName: "Oren Kes",
    defaultCallsign: "Chord",
    homeworld: "cinderwake",
    specialty: "engineering",
    unlockWorlds: 3,
  },
  {
    id: "neme-soryn",
    canonicalName: "Neme Soryn",
    defaultCallsign: "Prism",
    homeworld: "ilyra",
    specialty: "theory",
    unlockWorlds: 4,
  },
  {
    id: "iven-rook",
    canonicalName: "Iven Rook",
    defaultCallsign: "Seed",
    homeworld: "orison",
    specialty: "theory",
    unlockWorlds: 5,
  },
  {
    id: "cass-vey",
    canonicalName: "Cass Vey",
    defaultCallsign: "Vesper",
    homeworld: "vesper",
    specialty: "navigation",
    unlockWorlds: 6,
  },
] as const;

export const EXPEDITION_DEFINITIONS: readonly ExpeditionDefinition[] = [
  {
    id: "kestrel",
    title: "Kestrel Relay Survey",
    destination: "Uncharted Relay 31",
    durationSeconds: 10 * 60,
    rewardSalvage: 35,
    rewardXp: 35,
    unlockWorlds: 3,
    discoveryId: "expedition.dead-relay",
  },
  {
    id: "lantern",
    title: "Lantern Null-Bloom Study",
    destination: "Dormant Null Bloom",
    durationSeconds: 60 * 60,
    rewardSalvage: 120,
    rewardXp: 110,
    unlockWorlds: 4,
    discoveryId: "expedition.null-bloom",
  },
  {
    id: "palimpsest",
    title: "Palimpsest Origin Run",
    destination: "Foundry Origin Coordinate",
    durationSeconds: 4 * 60 * 60,
    rewardSalvage: 360,
    rewardXp: 300,
    unlockWorlds: 6,
    discoveryId: "expedition.first-foundry",
  },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(0, parsed));
};

const textValue = (value: unknown, fallback: string, maximum: number) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, maximum);
  return normalized || fallback;
};

const doctrineIds: readonly DoctrineId[] = [
  "concordance",
  "genesis",
  "release",
];

const roomDefinition = (roomId: RoomId) =>
  ROOM_DEFINITIONS.find((room) => room.id === roomId);

const crewDefinition = (crewId: string) =>
  CREW_DEFINITIONS.find((crew) => crew.id === crewId);

const expeditionDefinition = (expeditionId: ExpeditionId) =>
  EXPEDITION_DEFINITIONS.find((expedition) => expedition.id === expeditionId);

const crewLevelForXp = (xp: number) =>
  Math.min(MAX_CREW_LEVEL, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 90)));

export function getRoomSlotCapacity(room: LivingRoomState) {
  if (!room.unlocked || room.level <= 0) return 0;
  return Math.min(3, 1 + Math.floor((room.level - 1) / 2));
}

function enforceCrewAssignments(state: LivingFoundryState) {
  const expeditionCrew = new Set(state.activeExpedition?.crewIds ?? []);
  for (const crew of state.crew) {
    const room = crew.assignedRoomId
      ? state.rooms.find((candidate) => candidate.id === crew.assignedRoomId)
      : null;
    if (!crew.unlocked || !room?.unlocked || expeditionCrew.has(crew.id)) {
      crew.assignedRoomId = null;
    }
  }

  for (const room of state.rooms) {
    const capacity = getRoomSlotCapacity(room);
    const occupants = state.crew.filter(
      (crew) => crew.assignedRoomId === room.id,
    );
    for (const overflow of occupants.slice(capacity)) {
      overflow.assignedRoomId = null;
    }
  }
}

export function getRoomUpgradeCost(
  state: LivingFoundryState,
  roomId: RoomId,
) {
  const room = state.rooms.find((candidate) => candidate.id === roomId);
  const definition = roomDefinition(roomId);
  if (!room?.unlocked || !definition || room.level >= definition.maxLevel) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.ceil(definition.baseUpgradeCost * Math.pow(3, room.level - 1));
}

function calculateCohesion(state: LivingFoundryState) {
  const unlockedCrew = state.crew.filter((crew) => crew.unlocked);
  const staffedRooms = new Set(
    unlockedCrew
      .map((crew) => crew.assignedRoomId)
      .filter((roomId): roomId is RoomId => roomId !== null),
  );
  const homeworlds = new Set(
    unlockedCrew.map((crew) => crewDefinition(crew.id)?.homeworld ?? "foundry"),
  );
  const matchedCrew = unlockedCrew.filter((crew) => {
    if (!crew.assignedRoomId) return false;
    return roomDefinition(crew.assignedRoomId)?.specialty ===
      crewDefinition(crew.id)?.specialty;
  }).length;
  return Math.min(
    100,
    50 +
      Math.max(0, unlockedCrew.length - 3) * 3 +
      staffedRooms.size * 3 +
      homeworlds.size * 2 +
      matchedCrew * 2,
  );
}

export function cloneLivingFoundryState(
  state: LivingFoundryState,
): LivingFoundryState {
  return {
    ...state,
    rooms: state.rooms.map((room) => ({ ...room })),
    crew: state.crew.map((crew) => ({ ...crew })),
    activeExpedition: state.activeExpedition
      ? {
          ...state.activeExpedition,
          crewIds: [...state.activeExpedition.crewIds],
        }
      : null,
    expeditionHistory: { ...state.expeditionHistory },
    discoveredLore: [...state.discoveredLore],
  };
}

export function createLivingFoundryState(
  worldsSaved = 0,
): LivingFoundryState {
  const state: LivingFoundryState = {
    schema: LIVING_FOUNDRY_SCHEMA,
    foundryName: "Axiom Foundry // Iteration 44",
    salvage: 35,
    cohesion: 50,
    rooms: ROOM_DEFINITIONS.map((room) => ({
      id: room.id,
      level: worldsSaved >= room.unlockWorlds ? 1 : 0,
      unlocked: worldsSaved >= room.unlockWorlds,
    })),
    crew: CREW_DEFINITIONS.map((crew) => ({
      id: crew.id,
      callsign: crew.defaultCallsign,
      xp: 0,
      level: 1,
      assignedRoomId: null,
      unlocked: false,
    })),
    activeExpedition: null,
    expeditionHistory: {},
    discoveredLore: [],
    doctrine: null,
  };
  state.cohesion = calculateCohesion(state);
  return state;
}

export function syncLivingFoundryState(
  state: LivingFoundryState,
  worldsSaved: number,
) {
  const next = cloneLivingFoundryState(state);
  next.rooms = ROOM_DEFINITIONS.map((definition) => {
    const existing = next.rooms.find((room) => room.id === definition.id);
    const unlocked = worldsSaved >= definition.unlockWorlds;
    return {
      id: definition.id,
      unlocked,
      level: unlocked
        ? Math.max(1, Math.min(definition.maxLevel, existing?.level ?? 1))
        : 0,
    };
  });
  next.crew = CREW_DEFINITIONS.map((definition) => {
    const existing = next.crew.find((crew) => crew.id === definition.id);
    return {
      id: definition.id,
      callsign: textValue(
        existing?.callsign,
        definition.defaultCallsign,
        18,
      ),
      xp: finite(existing?.xp, 0, 1e9),
      level: crewLevelForXp(finite(existing?.xp, 0, 1e9)),
      assignedRoomId: null,
      unlocked: false,
    };
  });
  enforceCrewAssignments(next);
  next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
  return next;
}

export function sanitizeLivingFoundryState(
  value: unknown,
  worldsSaved = 0,
): LivingFoundryState {
  const base = createLivingFoundryState(worldsSaved);
  if (!isRecord(value)) return base;

  const rawRooms = Array.isArray(value.rooms) ? value.rooms : [];
  const rawCrew = Array.isArray(value.crew) ? value.crew : [];
  const rawHistory = isRecord(value.expeditionHistory)
    ? value.expeditionHistory
    : {};

  const state: LivingFoundryState = {
    ...base,
    foundryName: textValue(value.foundryName, base.foundryName, 32),
    salvage: finite(value.salvage, base.salvage, 1e12),
    cohesion: finite(value.cohesion, base.cohesion, 100),
    rooms: ROOM_DEFINITIONS.map((definition) => {
      const raw = rawRooms.find(
        (candidate) => isRecord(candidate) && candidate.id === definition.id,
      );
      const unlocked = worldsSaved >= definition.unlockWorlds;
      return {
        id: definition.id,
        unlocked,
        level: unlocked
          ? Math.max(
              1,
              Math.min(
                definition.maxLevel,
                Math.floor(finite(raw?.level, 1, definition.maxLevel)),
              ),
            )
          : 0,
      };
    }),
    crew: CREW_DEFINITIONS.map((definition) => {
      const raw = rawCrew.find(
        (candidate) => isRecord(candidate) && candidate.id === definition.id,
      );
      const xp = finite(raw?.xp, 0, 1e9);
      return {
        id: definition.id,
        callsign: textValue(
          raw?.callsign,
          definition.defaultCallsign,
          18,
        ),
        xp,
        level: crewLevelForXp(xp),
        assignedRoomId: null,
        unlocked: false,
      };
    }),
    activeExpedition: null,
    expeditionHistory: Object.fromEntries(
      EXPEDITION_DEFINITIONS.map((definition) => [
        definition.id,
        Math.floor(finite(rawHistory[definition.id], 0, 1e6)),
      ]),
    ),
    discoveredLore: Array.isArray(value.discoveredLore)
      ? [...new Set(value.discoveredLore.filter((id): id is string => typeof id === "string"))].slice(0, 200)
      : [],
    doctrine: doctrineIds.includes(value.doctrine as DoctrineId)
      ? (value.doctrine as DoctrineId)
      : null,
  };

  if (isRecord(value.activeExpedition)) {
    const rawExpedition = value.activeExpedition;
    const id = rawExpedition.id as ExpeditionId;
    const definition = expeditionDefinition(id);
    const crewIds = Array.isArray(rawExpedition.crewIds)
      ? rawExpedition.crewIds.filter(
          (crewId): crewId is string =>
            typeof crewId === "string" &&
            state.crew.some((crew) => crew.id === crewId && crew.unlocked),
        )
      : [];
    if (
      definition &&
      worldsSaved >= definition.unlockWorlds &&
      crewIds.length >= 1 &&
      crewIds.length <= 3
    ) {
      const launchedAt = finite(rawExpedition.launchedAt, 0, 1e16);
      const rawEndsAt = finite(rawExpedition.endsAt, 0, 1e16);
      const latestValidEnd = launchedAt + definition.durationSeconds * 1_000;
      if (launchedAt <= 0 || rawEndsAt <= launchedAt || rawEndsAt > latestValidEnd) {
        state.activeExpedition = null;
      } else {
      state.activeExpedition = {
        id,
        crewIds: [...new Set(crewIds)].slice(0, 3),
        launchedAt,
        endsAt: rawEndsAt,
        rewardSalvage: Math.min(
          Math.ceil(definition.rewardSalvage * 1.5),
          finite(rawExpedition.rewardSalvage, definition.rewardSalvage, 1e12),
        ),
        rewardXp: Math.min(
          Math.ceil(definition.rewardXp * 1.5),
          finite(rawExpedition.rewardXp, definition.rewardXp, 1e9),
        ),
        discoveryId: definition.discoveryId,
      };
      }
    }
  }

  const synced = syncLivingFoundryState(state, worldsSaved);
  enforceCrewAssignments(synced);
  synced.cohesion = Math.max(state.cohesion, calculateCohesion(synced));
  return synced;
}

export function renameFoundry(state: LivingFoundryState, name: string) {
  const nextName = textValue(name, "", 32);
  if (!nextName) return state;
  return { ...state, foundryName: nextName };
}

export function renameCrew(
  state: LivingFoundryState,
  crewId: string,
  callsign: string,
) {
  const nextCallsign = textValue(callsign, "", 18);
  const crew = state.crew.find((member) => member.id === crewId && member.unlocked);
  if (!crew || !nextCallsign) return state;
  const next = cloneLivingFoundryState(state);
  const target = next.crew.find((member) => member.id === crewId)!;
  target.callsign = nextCallsign;
  return next;
}

export function assignCrew(
  state: LivingFoundryState,
  crewId: string,
  roomId: RoomId | null,
) {
  const crew = state.crew.find((member) => member.id === crewId && member.unlocked);
  if (!crew || state.activeExpedition?.crewIds.includes(crewId)) return state;
  if (roomId === null) {
    const next = cloneLivingFoundryState(state);
    next.crew.find((member) => member.id === crewId)!.assignedRoomId = null;
    next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
    return next;
  }

  const room = state.rooms.find((candidate) => candidate.id === roomId);
  if (!room?.unlocked) return state;
  const occupants = state.crew.filter(
    (member) => member.id !== crewId && member.assignedRoomId === roomId,
  ).length;
  if (occupants >= getRoomSlotCapacity(room)) return state;

  const next = cloneLivingFoundryState(state);
  next.crew.find((member) => member.id === crewId)!.assignedRoomId = roomId;
  next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
  return next;
}

export function upgradeRoom(state: LivingFoundryState, roomId: RoomId) {
  const cost = getRoomUpgradeCost(state, roomId);
  if (!Number.isFinite(cost) || state.salvage < cost) return state;
  const next = cloneLivingFoundryState(state);
  const room = next.rooms.find((candidate) => candidate.id === roomId)!;
  room.level += 1;
  next.salvage -= cost;
  next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
  return next;
}

function roomScore(state: LivingFoundryState, roomId: RoomId) {
  const room = state.rooms.find((candidate) => candidate.id === roomId);
  if (!room?.unlocked) return 0;
  const definition = roomDefinition(roomId)!;
  const crewScore = state.crew
    .filter((crew) => crew.unlocked && crew.assignedRoomId === roomId)
    .reduce((sum, crew) => {
      const specialty = crewDefinition(crew.id)?.specialty;
      return sum + crew.level * (specialty === definition.specialty ? 1 : 0.55);
    }, 0);
  return room.level + crewScore;
}

export function getLivingFoundryBonuses(
  state: LivingFoundryState,
): LivingFoundryBonuses {
  const chamber = roomScore(state, "axiom-chamber");
  const fabrication = roomScore(state, "fabrication-floor");
  const bridge = roomScore(state, "planetfall-bridge");
  const resonance = roomScore(state, "resonance-gallery");
  const research = roomScore(state, "research-observatory");
  const archive = roomScore(state, "memory-archive");
  const hangar = roomScore(state, "expedition-bay");
  const vault = roomScore(state, "recalibration-vault");
  const cohesionBonus = Math.max(0, state.cohesion - 50) * 0.001;

  return {
    manualMultiplier: 1 + Math.min(0.2, chamber * 0.012),
    productionMultiplier:
      1 + Math.min(0.25, (chamber + bridge + vault) * 0.006 + cohesionBonus),
    machineCostMultiplier: Math.max(0.85, 1 - fabrication * 0.008),
    researchCostMultiplier: Math.max(0.85, 1 - (research + archive) * 0.006),
    resonanceMultiplier: 1 + Math.min(0.15, resonance * 0.008),
    expeditionDurationMultiplier: Math.max(
      0.75,
      1 - (hangar + bridge) * 0.008,
    ),
    expeditionRewardMultiplier:
      1 + Math.min(0.25, (hangar + research + archive) * 0.007),
  };
}

export function advanceLivingFoundry(
  state: LivingFoundryState,
  elapsedSeconds: number,
) {
  const seconds = Math.max(0, Math.min(24 * 60 * 60, elapsedSeconds));
  if (seconds <= 0) return state;
  const next = cloneLivingFoundryState(state);
  const expeditionCrew = new Set(next.activeExpedition?.crewIds ?? []);
  for (const crew of next.crew) {
    if (!crew.unlocked || !crew.assignedRoomId || expeditionCrew.has(crew.id)) {
      continue;
    }
    const room = next.rooms.find((candidate) => candidate.id === crew.assignedRoomId);
    const gainedXp = (seconds / 60) * (1 + Math.max(0, (room?.level ?? 1) - 1) * 0.08);
    crew.xp = Math.min(1e9, crew.xp + gainedXp);
    crew.level = crewLevelForXp(crew.xp);
  }
  next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
  return next;
}

export function getAvailableExpeditions(
  worldsSaved: number,
) {
  return EXPEDITION_DEFINITIONS.filter(
    (expedition) => worldsSaved >= expedition.unlockWorlds,
  );
}

export function getExpeditionStatus(
  state: LivingFoundryState,
  now = Date.now(),
) {
  if (!state.activeExpedition) {
    return { status: "idle" as const, remainingMs: 0 };
  }
  const remainingMs = Math.max(0, state.activeExpedition.endsAt - now);
  return {
    status: remainingMs <= 0 ? ("ready" as const) : ("active" as const),
    remainingMs,
  };
}

export function launchExpedition(
  state: LivingFoundryState,
  expeditionId: ExpeditionId,
  crewIds: readonly string[],
  worldsSaved: number,
  now = Date.now(),
) {
  if (state.activeExpedition) return state;
  const definition = expeditionDefinition(expeditionId);
  if (!definition || worldsSaved < definition.unlockWorlds) return state;
  const uniqueCrewIds = [...new Set(crewIds)];
  if (uniqueCrewIds.length < 1 || uniqueCrewIds.length > 3) return state;
  const crewAreAvailable = uniqueCrewIds.every((crewId) => {
    const crew = state.crew.find((member) => member.id === crewId);
    return crew?.unlocked && !state.activeExpedition?.crewIds.includes(crewId);
  });
  if (!crewAreAvailable) return state;

  const bonuses = getLivingFoundryBonuses(state);
  const specialtyBonus = uniqueCrewIds.reduce((sum, crewId) => {
    const crew = state.crew.find((member) => member.id === crewId)!;
    return sum + (crewDefinition(crew.id)?.specialty === "navigation" ? 0.03 : 0.01);
  }, 0);
  const durationMultiplier = Math.max(
    0.65,
    bonuses.expeditionDurationMultiplier - specialtyBonus,
  );
  const rewardMultiplier =
    bonuses.expeditionRewardMultiplier + Math.min(0.12, uniqueCrewIds.length * 0.04);
  const next = cloneLivingFoundryState(state);
  next.activeExpedition = {
    id: expeditionId,
    crewIds: uniqueCrewIds,
    launchedAt: now,
    endsAt: now + definition.durationSeconds * durationMultiplier * 1_000,
    rewardSalvage: Math.ceil(definition.rewardSalvage * rewardMultiplier),
    rewardXp: Math.ceil(definition.rewardXp * rewardMultiplier),
    discoveryId: definition.discoveryId,
  };
  for (const crew of next.crew) {
    if (uniqueCrewIds.includes(crew.id)) crew.assignedRoomId = null;
  }
  return next;
}

export function claimExpedition(
  state: LivingFoundryState,
  now = Date.now(),
) {
  const expedition = state.activeExpedition;
  if (!expedition || getExpeditionStatus(state, now).status !== "ready") {
    return state;
  }
  const next = cloneLivingFoundryState(state);
  next.salvage = Math.min(1e12, next.salvage + expedition.rewardSalvage);
  for (const crewId of expedition.crewIds) {
    const crew = next.crew.find((member) => member.id === crewId);
    if (!crew) continue;
    crew.xp = Math.min(1e9, crew.xp + expedition.rewardXp);
    crew.level = crewLevelForXp(crew.xp);
  }
  next.discoveredLore = [
    ...new Set([...next.discoveredLore, expedition.discoveryId]),
  ];
  next.expeditionHistory[expedition.id] =
    (next.expeditionHistory[expedition.id] ?? 0) + 1;
  next.activeExpedition = null;
  next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
  return next;
}

export function grantLivingFoundryRewards(
  state: LivingFoundryState,
  rewards: {
    salvage?: number;
    loreIds?: readonly string[];
    crewXp?: number;
  },
) {
  const next = cloneLivingFoundryState(state);
  next.salvage = Math.min(
    1e12,
    next.salvage + finite(rewards.salvage, 0, 1e12),
  );
  next.discoveredLore = [
    ...new Set([...next.discoveredLore, ...(rewards.loreIds ?? [])]),
  ].slice(0, 200);
  const crewXp = finite(rewards.crewXp, 0, 1e9);
  if (crewXp > 0) {
    for (const crew of next.crew) {
      if (!crew.unlocked) continue;
      crew.xp = Math.min(1e9, crew.xp + crewXp);
      crew.level = crewLevelForXp(crew.xp);
    }
  }
  next.cohesion = Math.max(next.cohesion, calculateCohesion(next));
  return next;
}

export function chooseDoctrine(
  state: LivingFoundryState,
  doctrine: DoctrineId,
) {
  if (!doctrineIds.includes(doctrine) || state.doctrine) return state;
  return { ...state, doctrine };
}

export function getCrewDefinition(crewId: string) {
  return crewDefinition(crewId) ?? null;
}

export function getRoomDefinition(roomId: RoomId) {
  return roomDefinition(roomId) ?? null;
}

export function getExpeditionDefinition(expeditionId: ExpeditionId) {
  return expeditionDefinition(expeditionId) ?? null;
}
