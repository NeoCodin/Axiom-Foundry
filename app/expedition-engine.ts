/**
 * Expeditions E1+E2 (see docs/expedition-e2-spec.md). Groups of 2-4 real
 * crew launch to planetary sites for a fixed real-time duration and always
 * return in E2. Outcomes follow the strength-vs-difficulty margin: success,
 * lean, or setback (crew comes home wounded; armor absorbs the hit and loses
 * durability). Planetary surveys are a departure requirement from Cinder on.
 */

import type { Survivor, SurvivorInjuryTier } from "./survivor-engine.ts";
import {
  getSurvivorSkillLevel,
  type ProfessionalRole,
} from "./survivor-engine.ts";
import {
  getEntryDamageMultiplier,
  getEntryWorstInjury,
  getLoadoutStrengthBonus,
  getLoadoutRecoveryMultiplier,
  type ArmoryArmorId,
  type ArmoryModificationId,
  type ArmoryWeaponId,
  type ExpeditionLoadoutEntry,
} from "./armory-engine.ts";
import { ARMORY_ITEM_DEFINITIONS } from "./armory-engine.ts";

export type ExpeditionSiteId =
  | "planetary-survey"
  | "kestrel-relay"
  | "lantern-null-bloom"
  | "null-sounding"
  | "palimpsest-origin";

export type ExpeditionOutcome =
  | "success"
  | "lean"
  | "setback"
  | "distress"
  | "rescue";

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
  /** Primary roles earning bonus expedition XP at this site. */
  focusRoles: readonly ProfessionalRole[];
  rewards: {
    salvage: number;
    schematics: number;
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
  loadout: ExpeditionLoadoutEntry[];
  /** Rescue missions retrieve a stranded party instead of working a site. */
  kind: "expedition" | "rescue";
};

/**
 * A party lost to a distress outcome. Stranded crew are STABLE: their health
 * never decays, online or offline, and the signal never expires. They come
 * home through a rescue mission - or die only through the explicit Abandon
 * action.
 */
export type StrandedParty = {
  siteId: ExpeditionSiteId;
  worldId: string | null;
  crewIds: string[];
  loadout: ExpeditionLoadoutEntry[];
  strandedAtSeconds: number;
};

export type MemorialRecord = {
  crewId: string;
  name: string;
  professions: string[];
  siteId: ExpeditionSiteId;
  worldId: string | null;
  abandonedAtSeconds: number;
};

export type ExpeditionWound = {
  crewId: string;
  /** Final damage after armor mitigation. Zero for distress events. */
  damage: number;
  /** Injury tier inflicted if the wound leaves the member critical. */
  injuryTier: SurvivorInjuryTier;
  armorId: ArmoryArmorId | null;
  /** Distress only: the critical health the member is stranded at. */
  strandedHealth?: number;
};

export type ExpeditionResult = {
  siteId: ExpeditionSiteId;
  outcome: ExpeditionOutcome;
  strength: number;
  difficulty: number;
  crewIds: string[];
  resolvedAtSeconds: number;
  salvage: number;
  schematics: number;
  nullTraces: number;
  discoveryId: string | null;
  surveyCredited: boolean;
  wounds: ExpeditionWound[];
  loadout: ExpeditionLoadoutEntry[];
  /** Rescue results: the stranded crew brought home. */
  rescuedCrewIds: string[];
  /** Rescue results: the stranded party's gear, returning with them. */
  strandedLoadout: ExpeditionLoadoutEntry[];
};

export type ExpeditionState = {
  schema: number;
  clockSeconds: number;
  active: ActiveExpedition | null;
  stranded: StrandedParty | null;
  log: ExpeditionResult[];
  completedSiteIds: ExpeditionSiteId[];
  memorials: MemorialRecord[];
  stats: { launched: number; completed: number; abandoned: number };
};

export const EXPEDITION_SCHEMA = 3;
export const MIN_EXPEDITION_CREW = 2;
export const MAX_EXPEDITION_CREW = 4;
export const MAX_EXPEDITION_LOG = 10;

// Outcome bands on margin = strength - difficulty (docs/expedition-e2-spec.md section 2).
export const LEAN_MARGIN = 8;
export const DISTRESS_MARGIN = 16;
export const SETBACK_DAMAGE_MIN = 30;
export const SETBACK_DAMAGE_MAX = 70;
export const MAX_MEMORIALS = 100;

// Rescue missions (docs/expedition-e2-spec.md section 4): they know the route, so
// they fly faster and need less strength - and they can NEVER strand.
export const RESCUE_DIFFICULTY_RELIEF = 4;
export const RESCUE_FLUX_RATIO = 0.5;
export const RESCUE_DURATION_RATIO = 0.6;
export const RESCUE_XP_PER_MEMBER = 90;

// Stranded crew hold at critical health; armor keeps them at the top band.
export const STRANDED_HEALTH_ARMORED_MIN = 14;
export const STRANDED_HEALTH_UNARMORED_MIN = 8;
export const STRANDED_HEALTH_SPAN = 6;

// Profession-dependent XP replaced E1's flat 90 per member.
export const EXPEDITION_XP_BASE = 60;
export const EXPEDITION_XP_PER_DIFFICULTY = 6;
export const EXPEDITION_XP_FOCUS_MULTIPLIER = 1.5;
const XP_OUTCOME_SCALE: Record<ExpeditionOutcome, number> = {
  success: 1,
  lean: 0.6,
  setback: 0.4,
  distress: 0,
  rescue: 0,
};
const REWARD_OUTCOME_SCALE: Record<ExpeditionOutcome, number> = {
  success: 1,
  lean: 0.45,
  setback: 0.25,
  distress: 0,
  rescue: 0,
};

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
    focusRoles: ["navigator", "researcher"],
    rewards: { salvage: 25, schematics: 20, nullTraces: 0 },
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
    focusRoles: ["technician", "researcher"],
    rewards: {
      salvage: 60,
      schematics: 30,
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
    focusRoles: ["researcher", "navigator"],
    rewards: {
      salvage: 40,
      schematics: 20,
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
    focusRoles: ["researcher", "navigator"],
    rewards: { salvage: 15, schematics: 10, nullTraces: 25 },
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
    focusRoles: [
      "engineer",
      "doctor",
      "researcher",
      "navigator",
      "technician",
      "fabricator",
      "farmer",
      "teacher",
      "security",
    ],
    rewards: {
      salvage: 150,
      schematics: 80,
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
    stranded: null,
    log: [],
    completedSiteIds: [],
    memorials: [],
    stats: { launched: 0, completed: 0, abandoned: 0 },
  };
}

export function cloneExpeditionState(state: ExpeditionState): ExpeditionState {
  return {
    ...state,
    active: state.active
      ? {
          ...state.active,
          crewIds: [...state.active.crewIds],
          loadout: state.active.loadout.map((entry) => ({ ...entry })),
        }
      : null,
    stranded: state.stranded
      ? {
          ...state.stranded,
          crewIds: [...state.stranded.crewIds],
          loadout: state.stranded.loadout.map((entry) => ({ ...entry })),
        }
      : null,
    log: state.log.map((entry) => ({
      ...entry,
      crewIds: [...entry.crewIds],
      wounds: entry.wounds.map((wound) => ({ ...wound })),
      loadout: entry.loadout.map((gear) => ({ ...gear })),
      rescuedCrewIds: [...entry.rescuedCrewIds],
      strandedLoadout: entry.strandedLoadout.map((gear) => ({ ...gear })),
    })),
    completedSiteIds: [...state.completedSiteIds],
    memorials: state.memorials.map((record) => ({
      ...record,
      professions: [...record.professions],
    })),
    stats: { ...state.stats },
  };
}

const isWeaponId = (value: unknown): value is ArmoryWeaponId =>
  ARMORY_ITEM_DEFINITIONS.some(
    (item) => item.kind === "weapon" && item.id === value,
  );

const isArmorId = (value: unknown): value is ArmoryArmorId =>
  ARMORY_ITEM_DEFINITIONS.some(
    (item) => item.kind === "armor" && item.id === value,
  );

const isModificationId = (value: unknown): value is ArmoryModificationId =>
  value === "stabilizer" ||
  value === "overcharger" ||
  value === "sensor-link" ||
  value === "field-medic-kit";

const isInjuryTier = (value: unknown): value is SurvivorInjuryTier =>
  value === "minor" || value === "major" || value === "severe";

const sanitizeLoadout = (
  value: unknown,
  crewIds: readonly string[],
): ExpeditionLoadoutEntry[] => {
  if (!Array.isArray(value)) return [];
  const known = new Set(crewIds);
  const seen = new Set<string>();
  const loadout: ExpeditionLoadoutEntry[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.crewId !== "string") continue;
    if (!known.has(raw.crewId) || seen.has(raw.crewId)) continue;
    seen.add(raw.crewId);
    loadout.push({
      crewId: raw.crewId,
      weaponId: isWeaponId(raw.weaponId) ? raw.weaponId : null,
      armorId: isArmorId(raw.armorId) ? raw.armorId : null,
      armorDurability: Math.floor(finite(raw.armorDurability, 0, 10)),
      weaponStrength: finite(
        raw.weaponStrength,
        isWeaponId(raw.weaponId)
          ? ARMORY_ITEM_DEFINITIONS.find((item) => item.id === raw.weaponId)!
              .strengthBonus
          : 0,
        100,
      ),
      weaponModification: isModificationId(raw.weaponModification)
        ? raw.weaponModification
        : null,
      armorModification: isModificationId(raw.armorModification)
        ? raw.armorModification
        : null,
      armorDamageMultiplier: finite(
        raw.armorDamageMultiplier,
        isArmorId(raw.armorId)
          ? ARMORY_ITEM_DEFINITIONS.find((item) => item.id === raw.armorId)!
              .damageMultiplier
          : 1,
        2,
      ),
    });
  }
  return loadout;
};

const sanitizeWounds = (
  value: unknown,
  crewIds: readonly string[],
): ExpeditionWound[] => {
  if (!Array.isArray(value)) return [];
  const known = new Set(crewIds);
  return value
    .filter(isRecord)
    .filter(
      (raw): raw is Record<string, unknown> & { crewId: string } =>
        typeof raw.crewId === "string" && known.has(raw.crewId),
    )
    .map((raw) => {
      const wound: ExpeditionWound = {
        crewId: raw.crewId,
        damage: finite(raw.damage, 0, 100),
        injuryTier: isInjuryTier(raw.injuryTier) ? raw.injuryTier : "minor",
        armorId: isArmorId(raw.armorId) ? raw.armorId : null,
      };
      if (typeof raw.strandedHealth === "number") {
        wound.strandedHealth = finite(raw.strandedHealth, 5, 100);
      }
      return wound;
    });
};

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
      abandoned: Math.floor(
        finite(isRecord(value.stats) ? value.stats.abandoned : 0, 0, 1e9),
      ),
    },
  };
  if (isRecord(value.stranded) && isSiteId(value.stranded.siteId)) {
    const crewIds = Array.isArray(value.stranded.crewIds)
      ? value.stranded.crewIds
          .filter((id): id is string => typeof id === "string")
          .slice(0, MAX_EXPEDITION_CREW)
      : [];
    if (crewIds.length >= 1) {
      state.stranded = {
        siteId: value.stranded.siteId,
        worldId:
          typeof value.stranded.worldId === "string"
            ? value.stranded.worldId
            : null,
        crewIds,
        loadout: sanitizeLoadout(value.stranded.loadout, crewIds),
        strandedAtSeconds: finite(value.stranded.strandedAtSeconds, 0, 1e15),
      };
    }
  }
  if (Array.isArray(value.memorials)) {
    state.memorials = value.memorials
      .filter(isRecord)
      .filter(
        (raw): raw is Record<string, unknown> & { name: string } =>
          typeof raw.name === "string" && isSiteId(raw.siteId),
      )
      .slice(-MAX_MEMORIALS)
      .map((raw) => ({
        crewId: typeof raw.crewId === "string" ? raw.crewId : "",
        name: raw.name.slice(0, 64),
        professions: Array.isArray(raw.professions)
          ? raw.professions
              .filter((role): role is string => typeof role === "string")
              .slice(0, 9)
          : [],
        siteId: raw.siteId as ExpeditionSiteId,
        worldId: typeof raw.worldId === "string" ? raw.worldId : null,
        abandonedAtSeconds: finite(raw.abandonedAtSeconds, 0, 1e15),
      }));
  }
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
        loadout: sanitizeLoadout(value.active.loadout, crewIds),
        kind: value.active.kind === "rescue" ? "rescue" : "expedition",
      };
    }
  }
  if (Array.isArray(value.log)) {
    state.log = value.log
      .filter(isRecord)
      .filter((raw) => isSiteId(raw.siteId))
      .slice(-MAX_EXPEDITION_LOG)
      .map((raw) => {
        const crewIds = Array.isArray(raw.crewIds)
          ? raw.crewIds.filter((id): id is string => typeof id === "string")
          : [];
        const rescuedCrewIds = Array.isArray(raw.rescuedCrewIds)
          ? raw.rescuedCrewIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [];
        return {
          siteId: raw.siteId as ExpeditionSiteId,
          outcome:
            raw.outcome === "lean" ||
            raw.outcome === "setback" ||
            raw.outcome === "distress" ||
            raw.outcome === "rescue"
              ? raw.outcome
              : ("success" as const),
          strength: finite(raw.strength, 0, 10_000),
          difficulty: finite(raw.difficulty, 0, 10_000),
          crewIds,
          resolvedAtSeconds: finite(raw.resolvedAtSeconds, 0, 1e15),
          salvage: finite(raw.salvage, 0, 1e9),
          // legacy logs stored this reward as engineeringModels
          schematics: finite(raw.schematics ?? raw.engineeringModels, 0, 1e9),
          nullTraces: finite(raw.nullTraces, 0, 1e9),
          discoveryId:
            typeof raw.discoveryId === "string" ? raw.discoveryId : null,
          surveyCredited: raw.surveyCredited === true,
          wounds: sanitizeWounds(raw.wounds, crewIds),
          loadout: sanitizeLoadout(raw.loadout, crewIds),
          rescuedCrewIds,
          strandedLoadout: sanitizeLoadout(raw.strandedLoadout, rescuedCrewIds),
        };
      });
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

/** The outcome the Expedition Bay projects before launch - always visible. */
export function getProjectedExpeditionOutcome(
  strength: number,
  difficulty: number,
): ExpeditionOutcome {
  const margin = strength - difficulty;
  if (margin >= 0) return "success";
  if (margin > -LEAN_MARGIN) return "lean";
  if (margin > -DISTRESS_MARGIN) return "setback";
  return "distress";
}

/**
 * Deterministic per-member damage roll in [SETBACK_DAMAGE_MIN,
 * SETBACK_DAMAGE_MAX], derived purely from the expedition so resolution is
 * identical online, offline, and across chunk sizes.
 */
function setbackDamageRoll(active: ActiveExpedition, memberIndex: number) {
  const seed =
    (Math.floor(active.startedAtSeconds) +
      active.strength * 8_191 +
      active.crewIds.length * 131) |
    0;
  let hash =
    (Math.imul(seed + 0x9e37, 0x85ebca6b) ^
      Math.imul(memberIndex + 1, 0xc2b2ae35)) >>>
    0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x27d4eb2f) >>> 0;
  hash = (hash ^ (hash >>> 13)) >>> 0;
  const span = SETBACK_DAMAGE_MAX - SETBACK_DAMAGE_MIN + 1;
  return SETBACK_DAMAGE_MIN + (hash % span);
}

/** Expedition XP scales with site difficulty, profession focus, and outcome. */
export function getExpeditionMemberXp(
  site: ExpeditionSiteDefinition,
  primaryRole: ProfessionalRole,
  outcome: ExpeditionOutcome,
) {
  const base = EXPEDITION_XP_BASE + EXPEDITION_XP_PER_DIFFICULTY * site.difficulty;
  const focus = site.focusRoles.includes(primaryRole)
    ? EXPEDITION_XP_FOCUS_MULTIPLIER
    : 1;
  return Math.round(base * focus * XP_OUTCOME_SCALE[outcome]);
}

export function launchExpedition(
  state: ExpeditionState,
  site: ExpeditionSiteDefinition,
  crew: readonly Survivor[],
  worldId: string | null,
  loadout: readonly ExpeditionLoadoutEntry[] = [],
  researchStrengthBonus = 0,
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
    strength:
      getExpeditionGroupStrength(crew) +
      getLoadoutStrengthBonus(loadout) +
      Math.min(2, Math.max(0, researchStrengthBonus)),
    loadout: loadout.map((entry) => ({ ...entry })),
    kind: "expedition",
  };
  next.stats.launched += 1;
  return next;
}

/** Launches a rescue mission to the stranded party's site. */
export function launchRescueMission(
  state: ExpeditionState,
  crew: readonly Survivor[],
  loadout: readonly ExpeditionLoadoutEntry[] = [],
): ExpeditionState {
  if (state.active || !state.stranded) return state;
  if (crew.length < MIN_EXPEDITION_CREW || crew.length > MAX_EXPEDITION_CREW) {
    return state;
  }
  const site = getExpeditionSite(state.stranded.siteId);
  const next = cloneExpeditionState(state);
  next.active = {
    siteId: site.id,
    worldId: state.stranded.worldId,
    crewIds: crew.map((survivor) => survivor.id),
    startedAtSeconds: next.clockSeconds,
    durationSeconds: Math.max(
      60,
      Math.ceil(
        getExpeditionDurationSeconds(site, crew) * RESCUE_DURATION_RATIO,
      ),
    ),
    strength:
      getExpeditionGroupStrength(crew) + getLoadoutStrengthBonus(loadout),
    loadout: loadout.map((entry) => ({ ...entry })),
    kind: "rescue",
  };
  next.stats.launched += 1;
  return next;
}

/**
 * The only death in the game: an explicit choice to leave a stranded party
 * behind. Callers pass memorial records built from the live roster; the
 * ledger is permanent.
 */
export function abandonStrandedParty(
  state: ExpeditionState,
  records: readonly MemorialRecord[],
): ExpeditionState {
  if (!state.stranded) return state;
  const next = cloneExpeditionState(state);
  next.memorials = [...next.memorials, ...records].slice(-MAX_MEMORIALS);
  next.stats.abandoned += next.stranded!.crewIds.length;
  next.stranded = null;
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
  rewardMultiplier = 1,
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
  const active = next.active;

  if (active.kind === "rescue") {
    // A rescue ALWAYS retrieves everyone and can never strand itself. An
    // under-strength rescue is a hard extraction: the rescuers take setback
    // damage on the way out.
    const rescueDifficulty = Math.max(
      1,
      site.difficulty - RESCUE_DIFFICULTY_RELIEF,
    );
    const hard = active.strength < rescueDifficulty;
    const wounds: ExpeditionWound[] = hard
      ? active.crewIds.map((crewId, index) => {
          const entry = active.loadout.find(
            (candidate) => candidate.crewId === crewId,
          );
          return {
            crewId,
            damage:
              Math.round(
                setbackDamageRoll(active, index) *
                  getEntryDamageMultiplier(entry) *
                  10,
              ) / 10,
            injuryTier: "minor",
            armorId: entry?.armorId ?? null,
          };
        })
      : [];
    const result: ExpeditionResult = {
      siteId: site.id,
      outcome: "rescue",
      strength: active.strength,
      difficulty: rescueDifficulty,
      crewIds: [...active.crewIds],
      resolvedAtSeconds: next.clockSeconds,
      salvage: 0,
      schematics: 0,
      nullTraces: 0,
      discoveryId: null,
      surveyCredited: false,
      wounds,
      loadout: active.loadout.map((entry) => ({ ...entry })),
      rescuedCrewIds: next.stranded ? [...next.stranded.crewIds] : [],
      strandedLoadout: next.stranded
        ? next.stranded.loadout.map((entry) => ({ ...entry }))
        : [],
    };
    next.log = [...next.log, result].slice(-MAX_EXPEDITION_LOG);
    next.stats.completed += 1;
    next.active = null;
    next.stranded = null;
    return { state: next, completed: result };
  }

  const outcome = getProjectedExpeditionOutcome(
    active.strength,
    site.difficulty,
  );
  const scale = REWARD_OUTCOME_SCALE[outcome];
  const surveyCredited =
    outcome !== "distress" &&
    site.countsAsSurvey &&
    currentWorldId !== null &&
    currentWorldId === active.worldId;
  const wounds: ExpeditionWound[] =
    outcome === "setback"
      ? active.crewIds.map((crewId, index) => {
          const entry = active.loadout.find(
            (candidate) => candidate.crewId === crewId,
          );
          return {
            crewId,
            damage:
              Math.round(
                setbackDamageRoll(active, index) *
                  getEntryDamageMultiplier(entry) *
                  10,
              ) / 10,
            // Setback wounds inflict at most a minor permanent injury; the
            // heavier tiers are reserved for distress events (E2 spec section 3).
            injuryTier: "minor",
            armorId: entry?.armorId ?? null,
          };
        })
      : outcome === "distress"
        ? active.crewIds.map((crewId, index) => {
            const entry = active.loadout.find(
              (candidate) => candidate.crewId === crewId,
            );
            const armored = Boolean(entry?.armorId);
            const roll = setbackDamageRoll(active, index);
            return {
              crewId,
              damage: 0,
              injuryTier: getEntryWorstInjury(entry),
              armorId: entry?.armorId ?? null,
              strandedHealth:
                (armored
                  ? STRANDED_HEALTH_ARMORED_MIN
                  : STRANDED_HEALTH_UNARMORED_MIN) +
                ((roll - SETBACK_DAMAGE_MIN) % (STRANDED_HEALTH_SPAN + 1)),
            };
          })
        : [];
  const recoveryMultiplier = getLoadoutRecoveryMultiplier(active.loadout);
  const researchRecoveryMultiplier = Math.min(
    1.15,
    Math.max(1, rewardMultiplier),
  );
  const result: ExpeditionResult = {
    siteId: site.id,
    outcome,
    strength: active.strength,
    difficulty: site.difficulty,
    crewIds: [...active.crewIds],
    resolvedAtSeconds: next.clockSeconds,
    salvage: Math.round(
      site.rewards.salvage * scale * recoveryMultiplier * researchRecoveryMultiplier,
    ),
    schematics: Math.round(
      site.rewards.schematics * scale * recoveryMultiplier * researchRecoveryMultiplier,
    ),
    nullTraces: Math.round(site.rewards.nullTraces * scale),
    discoveryId: outcome === "success" ? site.rewards.discoveryId ?? null : null,
    surveyCredited,
    wounds,
    loadout: active.loadout.map((entry) => ({ ...entry })),
    rescuedCrewIds: [],
    strandedLoadout: [],
  };
  if (outcome === "distress") {
    // The party shelters in place: stable forever, retrievable forever.
    next.stranded = {
      siteId: site.id,
      worldId: active.worldId,
      crewIds: [...active.crewIds],
      loadout: active.loadout.map((entry) => ({ ...entry })),
      strandedAtSeconds: next.clockSeconds,
    };
  }
  next.log = [...next.log, result].slice(-MAX_EXPEDITION_LOG);
  if (!site.repeatable && outcome === "success") {
    next.completedSiteIds = [...new Set([...next.completedSiteIds, site.id])];
  }
  next.stats.completed += 1;
  next.active = null;
  return { state: next, completed: result };
}

export function getDeployedCrewIds(state: ExpeditionState): ReadonlySet<string> {
  return new Set([
    ...(state.active?.crewIds ?? []),
    ...(state.stranded?.crewIds ?? []),
  ]);
}
