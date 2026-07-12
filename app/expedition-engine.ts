/**
 * Expedition E1: survivor-roster expeditions (see AI_HANDOFF roadmap).
 * Groups of 2-4 real crew launch to planetary sites for a fixed real-time
 * duration and ALWAYS return. E1 outcomes are success or a lean return -
 * health, gear, and mortality arrive in later phases. Planetary surveys are
 * a departure requirement from Cinder onward.
 */

import type { Survivor } from "./survivor-engine.ts";
import { getSurvivorSkillLevel } from "./survivor-engine.ts";

export type ExpeditionSiteId =
  | "planetary-survey"
  | "kestrel-relay"
  | "lantern-null-bloom"
  | "null-sounding"
  | "palimpsest-origin";

export type ExpeditionOutcome = "success" | "lean";

export type ExpeditionSiteDefinition = {
  id: ExpeditionSiteId;
  name: string;
  description: string;
  minWorldIndex: number;
  requiresCampaignComplete?: boolean;
  repeatable: boolean;
  countsAsSurvey: boolean;
  durationSeconds: number;
  difficulty: number; // strength required for a full success
  fluxCostBase: number; // x continuityScale at launch
  rewards: {
    salvage: number;
    engineeringModels: number;
    nullTraces: number;
    discoveryId?: string;
  };
};

export type ActiveExpedition = {
  siteId: ExpeditionSiteId;
  worldId: string | null;
  crewIds: string[];
  startedAtSeconds: number;
  durationSeconds: number;
  strength: number;
};

export type ExpeditionResult = {
  siteId: ExpeditionSiteId;
  outcome: ExpeditionOutcome;
  strength: number;
  difficulty: number;
  crewIds: string[];
  resolvedAtSeconds: number;
  salvage: number;
  engineeringModels: number;
  nullTraces: number;
  discoveryId: string | null;
  surveyCredited: boolean;
};

export type ExpeditionState = {
  schema: number;
  clockSeconds: number;
  active: ActiveExpedition | null;
  log: ExpeditionResult[];
  completedSiteIds: ExpeditionSiteId[];
  stats: { launched: number; completed: number };
};

export const EXPEDITION_SCHEMA = 1;
export const MIN_EXPEDITION_CREW = 2;
export const MAX_EXPEDITION_CREW = 4;
export const MAX_EXPEDITION_LOG = 10;
export const EXPEDITION_XP_PER_MEMBER = 90;

export const EXPEDITION_SITE_DEFINITIONS: readonly ExpeditionSiteDefinition[] = [
  {
    id: "planetary-survey",
    name: "Planetary Survey",
    description:
      "Chart shelter sites, hazards, and resources on the surface. Required before AXIOM can certify this world safe for departure.",
    minWorldIndex: 3,
    repeatable: true,
    countsAsSurvey: true,
    durationSeconds: 90 * 60,
    difficulty: 10,
    fluxCostBase: 300,
    rewards: { salvage: 25, engineeringModels: 20, nullTraces: 0 },
  },
  {
    id: "kestrel-relay",
    name: "Kestrel Relay Survey",
    description:
      "Investigate Uncharted Relay 31, a dead transmitter that answers before it is powered.",
    minWorldIndex: 3,
    repeatable: false,
    countsAsSurvey: false,
    durationSeconds: 60 * 60,
    difficulty: 12,
    fluxCostBase: 450,
    rewards: {
      salvage: 60,
      engineeringModels: 30,
      nullTraces: 10,
      discoveryId: "expedition.dead-relay",
    },
  },
  {
    id: "lantern-null-bloom",
    name: "Lantern Null-Bloom Study",
    description:
      "Instrument a dormant Null bloom up close. The richest known source of Null Traces.",
    minWorldIndex: 4,
    repeatable: false,
    countsAsSurvey: false,
    durationSeconds: 2 * 60 * 60,
    difficulty: 16,
    fluxCostBase: 700,
    rewards: {
      salvage: 40,
      engineeringModels: 20,
      nullTraces: 70,
      discoveryId: "expedition.null-bloom",
    },
  },
  {
    id: "null-sounding",
    name: "Null Sounding",
    description:
      "A repeatable instrumented dive along the Null boundary. Steady Null Traces for a steady crew.",
    minWorldIndex: 4,
    repeatable: true,
    countsAsSurvey: false,
    durationSeconds: 90 * 60,
    difficulty: 14,
    fluxCostBase: 600,
    rewards: { salvage: 15, engineeringModels: 10, nullTraces: 25 },
  },
  {
    id: "palimpsest-origin",
    name: "Palimpsest Origin Run",
    description:
      "Follow the Foundry's oldest coordinate to whatever was there before the Ark.",
    minWorldIndex: 5,
    requiresCampaignComplete: true,
    repeatable: false,
    countsAsSurvey: false,
    durationSeconds: 4 * 60 * 60,
    difficulty: 20,
    fluxCostBase: 1_200,
    rewards: {
      salvage: 150,
      engineeringModels: 80,
      nullTraces: 60,
      discoveryId: "expedition.first-foundry",
    },
  },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(0, parsed));
};

const isSiteId = (value: unknown): value is ExpeditionSiteId =>
  EXPEDITION_SITE_DEFINITIONS.some((site) => site.id === value);

export const getExpeditionSite = (siteId: ExpeditionSiteId) =>
  EXPEDITION_SITE_DEFINITIONS.find((site) => site.id === siteId)!;

export function createExpeditionState(): ExpeditionState {
  return {
    schema: EXPEDITION_SCHEMA,
    clockSeconds: 0,
    active: null,
    log: [],
    completedSiteIds: [],
    stats: { launched: 0, completed: 0 },
  };
}

export function cloneExpeditionState(state: ExpeditionState): ExpeditionState {
  return {
    ...state,
    active: state.active
      ? { ...state.active, crewIds: [...state.active.crewIds] }
      : null,
    log: state.log.map((entry) => ({ ...entry, crewIds: [...entry.crewIds] })),
    completedSiteIds: [...state.completedSiteIds],
    stats: { ...state.stats },
  };
}

export function sanitizeExpeditionState(value: unknown): ExpeditionState {
  const base = createExpeditionState();
  if (!isRecord(value)) return base;
  const state: ExpeditionState = {
    ...base,
    clockSeconds: finite(value.clockSeconds, 0, 1e15),
    completedSiteIds: Array.isArray(value.completedSiteIds)
      ? [...new Set(value.completedSiteIds.filter(isSiteId))]
      : [],
    stats: {
      launched: Math.floor(
        finite(isRecord(value.stats) ? value.stats.launched : 0, 0, 1e9),
      ),
      completed: Math.floor(
        finite(isRecord(value.stats) ? value.stats.completed : 0, 0, 1e9),
      ),
    },
  };
  if (isRecord(value.active) && isSiteId(value.active.siteId)) {
    const site = getExpeditionSite(value.active.siteId);
    const crewIds = Array.isArray(value.active.crewIds)
      ? value.active.crewIds
          .filter((id): id is string => typeof id === "string")
          .slice(0, MAX_EXPEDITION_CREW)
      : [];
    if (crewIds.length >= 1) {
      const duration = finite(
        value.active.durationSeconds,
        site.durationSeconds,
        7 * 24 * 3_600,
      );
      state.active = {
        siteId: value.active.siteId,
        worldId:
          typeof value.active.worldId === "string" ? value.active.worldId : null,
        crewIds,
        startedAtSeconds: finite(value.active.startedAtSeconds, 0, 1e15),
        durationSeconds: Math.max(60, duration),
        strength: finite(value.active.strength, 0, 10_000),
      };
    }
  }
  if (Array.isArray(value.log)) {
    state.log = value.log
      .filter(isRecord)
      .filter((raw) => isSiteId(raw.siteId))
      .slice(-MAX_EXPEDITION_LOG)
      .map((raw) => ({
        siteId: raw.siteId as ExpeditionSiteId,
        outcome: raw.outcome === "lean" ? ("lean" as const) : ("success" as const),
        strength: finite(raw.strength, 0, 10_000),
        difficulty: finite(raw.difficulty, 0, 10_000),
        crewIds: Array.isArray(raw.crewIds)
          ? raw.crewIds.filter((id): id is string => typeof id === "string")
          : [],
        resolvedAtSeconds: finite(raw.resolvedAtSeconds, 0, 1e15),
        salvage: finite(raw.salvage, 0, 1e9),
        engineeringModels: finite(raw.engineeringModels, 0, 1e9),
        nullTraces: finite(raw.nullTraces, 0, 1e9),
        discoveryId:
          typeof raw.discoveryId === "string" ? raw.discoveryId : null,
        surveyCredited: raw.surveyCredited === true,
      }));
  }
  return state;
}

/**
 * Group strength: each member contributes their best professional level,
 * with composition bonuses - Navigators shorten the trip instead (see
 * launch), Soldiers steady the group, Researchers sharpen instruments.
 */
export function getExpeditionGroupStrength(crew: readonly Survivor[]) {
  let strength = 0;
  for (const survivor of crew) {
    const bestLevel = Math.max(
      getSurvivorSkillLevel(survivor, "engineer"),
      getSurvivorSkillLevel(survivor, "doctor"),
      getSurvivorSkillLevel(survivor, "researcher"),
      getSurvivorSkillLevel(survivor, "navigator"),
      getSurvivorSkillLevel(survivor, "technician"),
      getSurvivorSkillLevel(survivor, "fabricator"),
      getSurvivorSkillLevel(survivor, "farmer"),
      getSurvivorSkillLevel(survivor, "teacher"),
      getSurvivorSkillLevel(survivor, "security"),
    );
    strength += Math.max(1, bestLevel);
    if (getSurvivorSkillLevel(survivor, "security") >= 3) strength += 2;
    if (getSurvivorSkillLevel(survivor, "researcher") >= 3) strength += 1;
  }
  return strength;
}

export function getExpeditionDurationSeconds(
  site: ExpeditionSiteDefinition,
  crew: readonly Survivor[],
) {
  const navigators = crew.filter(
    (survivor) => getSurvivorSkillLevel(survivor, "navigator") >= 3,
  ).length;
  return Math.ceil(site.durationSeconds * Math.max(0.7, 1 - 0.1 * navigators));
}

export type ExpeditionAvailability = {
  site: ExpeditionSiteDefinition;
  available: boolean;
  reason: "locked-world" | "campaign-incomplete" | "already-completed" | "busy" | null;
};

export function getExpeditionAvailability(
  state: ExpeditionState,
  worldIndex: number,
  campaignComplete: boolean,
): ExpeditionAvailability[] {
  return EXPEDITION_SITE_DEFINITIONS.map((site) => {
    let reason: ExpeditionAvailability["reason"] = null;
    if (worldIndex < site.minWorldIndex) reason = "locked-world";
    else if (site.requiresCampaignComplete && !campaignComplete)
      reason = "campaign-incomplete";
    else if (!site.repeatable && state.completedSiteIds.includes(site.id))
      reason = "already-completed";
    else if (state.active) reason = "busy";
    return { site, available: reason === null, reason };
  });
}

export function launchExpedition(
  state: ExpeditionState,
  site: ExpeditionSiteDefinition,
  crew: readonly Survivor[],
  worldId: string | null,
): ExpeditionState {
  if (state.active) return state;
  if (crew.length < MIN_EXPEDITION_CREW || crew.length > MAX_EXPEDITION_CREW) {
    return state;
  }
  if (!site.repeatable && state.completedSiteIds.includes(site.id)) return state;
  const next = cloneExpeditionState(state);
  next.active = {
    siteId: site.id,
    worldId,
    crewIds: crew.map((survivor) => survivor.id),
    startedAtSeconds: next.clockSeconds,
    durationSeconds: getExpeditionDurationSeconds(site, crew),
    strength: getExpeditionGroupStrength(crew),
  };
  next.stats.launched += 1;
  return next;
}

export type ExpeditionAdvanceResult = {
  state: ExpeditionState;
  completed: ExpeditionResult | null;
};

export function advanceExpeditions(
  state: ExpeditionState,
  elapsedSeconds: number,
  currentWorldId: string | null,
): ExpeditionAdvanceResult {
  const elapsed = finite(elapsedSeconds, 0, 90 * 24 * 3_600);
  if (elapsed <= 0) return { state, completed: null };
  const next = cloneExpeditionState(state);
  next.clockSeconds += elapsed;
  if (
    !next.active ||
    next.clockSeconds < next.active.startedAtSeconds + next.active.durationSeconds
  ) {
    return { state: next, completed: null };
  }
  const site = getExpeditionSite(next.active.siteId);
  const outcome: ExpeditionOutcome =
    next.active.strength >= site.difficulty ? "success" : "lean";
  const scale = outcome === "success" ? 1 : 0.45;
  const surveyCredited =
    site.countsAsSurvey &&
    currentWorldId !== null &&
    currentWorldId === next.active.worldId;
  const result: ExpeditionResult = {
    siteId: site.id,
    outcome,
    strength: next.active.strength,
    difficulty: site.difficulty,
    crewIds: [...next.active.crewIds],
    resolvedAtSeconds: next.clockSeconds,
    salvage: Math.round(site.rewards.salvage * scale),
    engineeringModels: Math.round(site.rewards.engineeringModels * scale),
    nullTraces: Math.round(site.rewards.nullTraces * scale),
    discoveryId: outcome === "success" ? site.rewards.discoveryId ?? null : null,
    surveyCredited,
  };
  next.log = [...next.log, result].slice(-MAX_EXPEDITION_LOG);
  if (!site.repeatable && outcome === "success") {
    next.completedSiteIds = [...new Set([...next.completedSiteIds, site.id])];
  }
  next.stats.completed += 1;
  next.active = null;
  return { state: next, completed: result };
}

export function getDeployedCrewIds(state: ExpeditionState): ReadonlySet<string> {
  return new Set(state.active?.crewIds ?? []);
}
