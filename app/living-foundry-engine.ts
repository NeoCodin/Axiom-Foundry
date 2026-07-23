import type { DoctrineId, RoomId } from "./discovery-content.ts";

export type CrewSpecialty = "engineering" | "theory" | "navigation";

export type RoomDefinition = {
  id: RoomId;
  name: string;
  specialty: CrewSpecialty;
  unlockWorlds: number;
  maxLevel: number;
  baseUpgradeCost: number;
};

export type LivingRoomState = {
  id: RoomId;
  level: number;
  unlocked: boolean;
};

/**
 * The Living Foundry now owns only the physical Ark layer. The original
 * scripted nine-person roster and its parallel expedition system were never
 * exposed to players and have been retired in favor of SurvivorSystemState and
 * ExpeditionState. Sanitization intentionally ignores those legacy fields.
 */
export type LivingFoundryState = {
  schema: number;
  foundryName: string;
  salvage: number;
  cohesion: number;
  rooms: LivingRoomState[];
  discoveredLore: string[];
  doctrine: DoctrineId | null;
};

export type LivingFoundryBonuses = {
  manualMultiplier: number;
  productionMultiplier: number;
  machineCostMultiplier: number;
  researchCostMultiplier: number;
  resonanceMultiplier: number;
  expeditionRewardMultiplier: number;
};

export const LIVING_FOUNDRY_SCHEMA = 2;
export const MAX_ROOM_LEVEL = 5;

export const ROOM_DEFINITIONS: readonly RoomDefinition[] = [
  { id: "axiom-chamber", name: "Axiom Chamber", specialty: "engineering", unlockWorlds: 0, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 30 },
  { id: "fabrication-floor", name: "Fabrication Floor", specialty: "engineering", unlockWorlds: 1, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 35 },
  { id: "planetfall-bridge", name: "Planetfall Bridge", specialty: "navigation", unlockWorlds: 1, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 30 },
  { id: "resonance-gallery", name: "Resonance Gallery", specialty: "theory", unlockWorlds: 1, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 45 },
  { id: "memory-archive", name: "Memory Archive", specialty: "theory", unlockWorlds: 1, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 50 },
  { id: "research-observatory", name: "Research Observatory", specialty: "theory", unlockWorlds: 2, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 65 },
  { id: "expedition-bay", name: "Expedition Bay", specialty: "navigation", unlockWorlds: 2, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 75 },
  { id: "recalibration-vault", name: "Recalibration Vault", specialty: "engineering", unlockWorlds: 4, maxLevel: MAX_ROOM_LEVEL, baseUpgradeCost: 100 },
] as const;

const doctrineIds: readonly DoctrineId[] = ["concordance", "genesis", "release"];

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

const roomDefinition = (roomId: RoomId) =>
  ROOM_DEFINITIONS.find((room) => room.id === roomId);

export function getRoomUpgradeCost(state: LivingFoundryState, roomId: RoomId) {
  const room = state.rooms.find((candidate) => candidate.id === roomId);
  const definition = roomDefinition(roomId);
  if (!room?.unlocked || !definition || room.level >= definition.maxLevel) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.ceil(definition.baseUpgradeCost * Math.pow(3, room.level - 1));
}

export function cloneLivingFoundryState(state: LivingFoundryState): LivingFoundryState {
  return {
    ...state,
    rooms: state.rooms.map((room) => ({ ...room })),
    discoveredLore: [...state.discoveredLore],
  };
}

export function createLivingFoundryState(worldsSaved = 0): LivingFoundryState {
  return {
    schema: LIVING_FOUNDRY_SCHEMA,
    foundryName: "Axiom Foundry // Iteration 44",
    salvage: 35,
    cohesion: 50,
    rooms: ROOM_DEFINITIONS.map((room) => ({
      id: room.id,
      level: worldsSaved >= room.unlockWorlds ? 1 : 0,
      unlocked: worldsSaved >= room.unlockWorlds,
    })),
    discoveredLore: [],
    doctrine: null,
  };
}

export function syncLivingFoundryState(state: LivingFoundryState, worldsSaved: number) {
  const next = cloneLivingFoundryState(state);
  next.schema = LIVING_FOUNDRY_SCHEMA;
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
  return next;
}

export function sanitizeLivingFoundryState(value: unknown, worldsSaved = 0): LivingFoundryState {
  const base = createLivingFoundryState(worldsSaved);
  if (!isRecord(value)) return base;
  const rawRooms = Array.isArray(value.rooms) ? value.rooms : [];
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
          ? Math.max(1, Math.min(definition.maxLevel, Math.floor(finite(raw?.level, 1, definition.maxLevel))))
          : 0,
      };
    }),
    discoveredLore: Array.isArray(value.discoveredLore)
      ? [...new Set(value.discoveredLore.filter((id): id is string => typeof id === "string"))].slice(0, 200)
      : [],
    doctrine: doctrineIds.includes(value.doctrine as DoctrineId)
      ? (value.doctrine as DoctrineId)
      : null,
  };
  return syncLivingFoundryState(state, worldsSaved);
}

export function renameFoundry(state: LivingFoundryState, name: string) {
  const nextName = textValue(name, "", 32);
  if (!nextName) return state;
  return { ...state, foundryName: nextName };
}

export function upgradeRoom(state: LivingFoundryState, roomId: RoomId) {
  const cost = getRoomUpgradeCost(state, roomId);
  if (!Number.isFinite(cost) || state.salvage < cost) return state;
  const next = cloneLivingFoundryState(state);
  const room = next.rooms.find((candidate) => candidate.id === roomId)!;
  room.level += 1;
  next.salvage -= cost;
  return next;
}

function roomScore(state: LivingFoundryState, roomId: RoomId) {
  const room = state.rooms.find((candidate) => candidate.id === roomId);
  return room?.unlocked ? room.level : 0;
}

export function getLivingFoundryBonuses(state: LivingFoundryState): LivingFoundryBonuses {
  const chamber = roomScore(state, "axiom-chamber");
  const fabrication = roomScore(state, "fabrication-floor");
  const bridge = roomScore(state, "planetfall-bridge");
  const resonance = roomScore(state, "resonance-gallery");
  const research = roomScore(state, "research-observatory");
  const archive = roomScore(state, "memory-archive");
  const expedition = roomScore(state, "expedition-bay");
  const vault = roomScore(state, "recalibration-vault");
  const cohesionBonus = Math.max(0, state.cohesion - 50) * 0.001;
  return {
    manualMultiplier: 1 + Math.min(0.2, chamber * 0.012),
    productionMultiplier: 1 + Math.min(0.25, (chamber + bridge + vault) * 0.006 + cohesionBonus),
    machineCostMultiplier: Math.max(0.85, 1 - fabrication * 0.008),
    researchCostMultiplier: Math.max(0.85, 1 - (research + archive) * 0.006),
    resonanceMultiplier: 1 + Math.min(0.15, resonance * 0.008),
    expeditionRewardMultiplier: 1 + Math.min(0.08, expedition * 0.012),
  };
}

export function advanceLivingFoundry(state: LivingFoundryState, elapsedSeconds: number) {
  return elapsedSeconds > 0 ? state : state;
}

export function grantLivingFoundryRewards(
  state: LivingFoundryState,
  rewards: { salvage?: number; loreIds?: readonly string[] },
) {
  const next = cloneLivingFoundryState(state);
  next.salvage = Math.min(1e12, next.salvage + finite(rewards.salvage, 0, 1e12));
  next.discoveredLore = [
    ...new Set([...next.discoveredLore, ...(rewards.loreIds ?? [])]),
  ].slice(0, 200);
  return next;
}

export function chooseDoctrine(state: LivingFoundryState, doctrine: DoctrineId) {
  if (!doctrineIds.includes(doctrine) || state.doctrine) return state;
  return { ...state, doctrine };
}

export function getRoomDefinition(roomId: RoomId) {
  return roomDefinition(roomId) ?? null;
}
