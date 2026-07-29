/**
 * Expeditions E1+E2 (see docs/expedition-e2-spec.md). Groups of 2-4 real
 * crew launch to planetary sites for a fixed real-time duration and always
 * return in E2. Outcomes follow the strength-vs-difficulty margin: success,
 * lean, or setback (crew comes home wounded; armor absorbs the hit and loses
 * durability). Every inhabited world has its own survey route, story work,
 * critical Continuity operation, and repeatable resource route.
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
import type { CampaignWorldId } from "./campaign-content.ts";

export type ExpeditionSiteId =
  | "planetary-survey"
  | "pelagos-survey"
  | "pelagos-breakwater-route"
  | "pelagos-highwater-vault"
  | "pelagos-tidal-salvage"
  | "viridia-survey"
  | "viridia-canopy-signal"
  | "viridia-seed-vault-descent"
  | "viridia-spore-sampler"
  | "cinder-ashline-recovery"
  | "cinder-foundry-nine-recovery"
  | "cinder-mantle-salvage"
  | "nox-survey"
  | "nox-echo-bunker"
  | "kestrel-relay"
  | "lantern-null-bloom"
  | "null-sounding"
  | "vesper-survey"
  | "vesper-observatory-echo"
  | "vesper-red-scar-sounding"
  | "causal-wreckage"
  | "palimpsest-origin";

export type ExpeditionCategory = "survey" | "story" | "critical" | "resource";

export type ExpeditionPreparationOption =
  | { kind: "research"; id: string }
  | { kind: "weapons"; count: number }
  | { kind: "armor"; count: number }
  | { kind: "role"; role: ProfessionalRole; level: number; count?: number }
  | { kind: "completed-expedition"; id: ExpeditionSiteId }
  | { kind: "automation"; id: string; count: number }
  | { kind: "adaptation"; id: string; count: number };

export type ExpeditionPreparation = {
  id: string;
  label: string;
  detail: string;
  required: boolean;
  /** Any one option satisfies the preparation, allowing different solutions. */
  options: readonly ExpeditionPreparationOption[];
};

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
  worldId: CampaignWorldId | null;
  category: ExpeditionCategory;
  operationCode: string;
  successReport: string;
  requiresCampaignComplete?: boolean;
  repeatable: boolean;
  countsAsSurvey: boolean;
  requiredForContinuity: boolean;
  durationSeconds: number;
  difficulty: number; // strength required for a full success
  /** Multiplied by the explicit budget of the operation's own world. */
  fluxCostBase: number;
  /** Primary roles earning bonus expedition XP at this site. */
  focusRoles: readonly ProfessionalRole[];
  preparations: readonly ExpeditionPreparation[];
  rewards: {
    salvage: number;
    schematics: number;
    nullTraces: number;
    engineeringModels?: number;
    biologicalSamples?: number;
    culturalRecords?: number;
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
  /** Per-volunteer permanent support captured at launch for deterministic offline resolution. */
  injuryMultipliers: Record<string, number>;
  bioadaptationStrengthBonus: number;
  bioadaptationDurationMultiplier: number;
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
  engineeringModels: number;
  biologicalSamples: number;
  culturalRecords: number;
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

export const EXPEDITION_SCHEMA = 5;
export const MIN_EXPEDITION_CREW = 2;
export const MAX_EXPEDITION_CREW = 4;
export const MAX_EXPEDITION_LOG = 16;

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
    id: "pelagos-survey",
    name: "Planetary Survey",
    description:
      "Chart stable rooftops, tidal corridors, and freshwater access before committing a founding community.",
    worldId: "pelagos",
    category: "survey",
    operationCode: "PLG-S01",
    successReport: "The highwater charts now distinguish a temporary refuge from ground that can support a town.",
    repeatable: true,
    countsAsSurvey: true,
    requiredForContinuity: false,
    durationSeconds: 20 * 60,
    difficulty: 5,
    fluxCostBase: 70,
    focusRoles: ["navigator", "researcher"],
    preparations: [],
    rewards: { salvage: 12, schematics: 5, nullTraces: 0, culturalRecords: 4 },
  },
  {
    id: "pelagos-breakwater-route",
    name: "Breakwater Signal Route",
    description:
      "Follow hand-built repeaters through a drowned transit district and identify the people keeping them alive.",
    worldId: "pelagos",
    category: "story",
    operationCode: "PLG-O02",
    successReport: "The repeaters carry a census maintained by families who expected the Ark. No distress call was ever sent.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 25 * 60,
    difficulty: 6,
    fluxCostBase: 90,
    focusRoles: ["navigator", "technician", "teacher"],
    preparations: [],
    rewards: { salvage: 20, schematics: 8, nullTraces: 0, culturalRecords: 18, discoveryId: "expedition.pelagos-breakwater" },
  },
  {
    id: "pelagos-highwater-vault",
    name: "Highwater Archive Recovery",
    description:
      "Enter the municipal archive beneath the storm line, recover its population ledger, and prove that Pelagos can distribute medicine without the Ark.",
    worldId: "pelagos",
    category: "critical",
    operationCode: "PLG-C03",
    successReport: "Pelagos now owns a public ledger and an independent medical route. Continuity can evaluate the society from current records.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: true,
    durationSeconds: 35 * 60,
    difficulty: 8,
    fluxCostBase: 140,
    focusRoles: ["doctor", "navigator", "teacher"],
    preparations: [
      {
        id: "pelagos-medical-plan",
        label: "Floodwater medical plan",
        detail: "Bring one Doctor at level 2+, or complete Clinical Commons before entry.",
        required: true,
        options: [
          { kind: "role", role: "doctor", level: 2 },
          { kind: "research", id: "clinical-commons" },
        ],
      },
      {
        id: "pelagos-route-intelligence",
        label: "Mapped approach",
        detail: "The Breakwater Signal Route or Surface Reconnaissance gives the team a safer approach.",
        required: false,
        options: [
          { kind: "completed-expedition", id: "pelagos-breakwater-route" },
          { kind: "research", id: "surface-reconnaissance" },
        ],
      },
    ],
    rewards: { salvage: 35, schematics: 15, nullTraces: 2, culturalRecords: 35, biologicalSamples: 12, discoveryId: "expedition.pelagos-archive" },
  },
  {
    id: "pelagos-tidal-salvage",
    name: "Tidal Salvage Run",
    description: "Recover sealed machinery during the low-tide window. The route repeats, but the water never opens the same way twice.",
    worldId: "pelagos",
    category: "resource",
    operationCode: "PLG-R04",
    successReport: "The shuttle returns with structural stock and waterlogged technical records.",
    repeatable: true,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 30 * 60,
    difficulty: 6,
    fluxCostBase: 100,
    focusRoles: ["navigator", "technician", "fabricator"],
    preparations: [],
    rewards: { salvage: 60, schematics: 10, nullTraces: 0, engineeringModels: 6 },
  },
  {
    id: "viridia-survey",
    name: "Planetary Survey",
    description: "Map safe canopy corridors, altered watersheds, and ground the forest has not reclaimed.",
    worldId: "viridia",
    category: "survey",
    operationCode: "VRD-S01",
    successReport: "The canopy map identifies where a settlement can grow without teaching the forest to attack it.",
    repeatable: true,
    countsAsSurvey: true,
    requiredForContinuity: false,
    durationSeconds: 30 * 60,
    difficulty: 7,
    fluxCostBase: 130,
    focusRoles: ["navigator", "farmer", "researcher"],
    preparations: [],
    rewards: { salvage: 15, schematics: 7, nullTraces: 0, biologicalSamples: 12 },
  },
  {
    id: "viridia-canopy-signal",
    name: "Canopy Signal Trace",
    description: "Track a school transmitter moving through the upper forest even though its coordinates never change.",
    worldId: "viridia",
    category: "story",
    operationCode: "VRD-O02",
    successReport: "The transmitter is rooted inside a living classroom. Its oldest lesson addresses AXIOM by name.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 40 * 60,
    difficulty: 9,
    fluxCostBase: 190,
    focusRoles: ["researcher", "teacher", "farmer"],
    preparations: [],
    rewards: { salvage: 25, schematics: 16, nullTraces: 4, biologicalSamples: 24, culturalRecords: 20, discoveryId: "expedition.viridia-classroom" },
  },
  {
    id: "viridia-seed-vault-descent",
    name: "Seed Vault Descent",
    description: "Descend through a contagious root network and recover the unaltered seed library needed to make settlement agriculture independent.",
    worldId: "viridia",
    category: "critical",
    operationCode: "VRD-C03",
    successReport: "The seed library is viable, but one drawer contains crops bred for a climate Viridia has never possessed.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: true,
    durationSeconds: 60 * 60,
    difficulty: 11,
    fluxCostBase: 260,
    focusRoles: ["doctor", "farmer", "researcher"],
    preparations: [
      {
        id: "viridia-pathogen-model",
        label: "Pathogen model",
        detail: "Clinical Commons must identify the vault's spore cycle before anyone enters.",
        required: true,
        options: [{ kind: "research", id: "clinical-commons" }],
      },
      {
        id: "viridia-exposure-control",
        label: "Exposure control",
        detail: "Bring one armor frame, a level 4+ Doctor, or a volunteer with atmospheric adaptation.",
        required: true,
        options: [
          { kind: "armor", count: 1 },
          { kind: "role", role: "doctor", level: 4 },
          { kind: "adaptation", id: "atmospheric-adaptation", count: 1 },
        ],
      },
      {
        id: "viridia-canopy-intelligence",
        label: "Canopy intelligence",
        detail: "Tracing the Canopy Signal or completing Surface Reconnaissance improves the approach.",
        required: false,
        options: [
          { kind: "completed-expedition", id: "viridia-canopy-signal" },
          { kind: "research", id: "surface-reconnaissance" },
        ],
      },
    ],
    rewards: { salvage: 45, schematics: 28, nullTraces: 8, biologicalSamples: 65, culturalRecords: 18, discoveryId: "expedition.viridia-seed-vault" },
  },
  {
    id: "viridia-spore-sampler",
    name: "Spore-Line Sampling",
    description: "Run a repeatable clinic route through the changing forest and return fresh biological evidence.",
    worldId: "viridia",
    category: "resource",
    operationCode: "VRD-R04",
    successReport: "The clinic receives a clean comparison set from the newest growth line.",
    repeatable: true,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 45 * 60,
    difficulty: 9,
    fluxCostBase: 210,
    focusRoles: ["doctor", "farmer", "researcher"],
    preparations: [],
    rewards: { salvage: 90, schematics: 12, nullTraces: 2, biologicalSamples: 35 },
  },
  {
    id: "planetary-survey",
    name: "Planetary Survey",
    description: "Chart ash movement, shelter corridors, and thermal fractures before certifying permanent construction zones.",
    worldId: "cinder",
    category: "survey",
    operationCode: "CND-S01",
    successReport: "The new thermal chart separates stable industrial ground from rock that only appears dormant.",
    repeatable: true,
    countsAsSurvey: true,
    requiredForContinuity: false,
    durationSeconds: 90 * 60,
    difficulty: 10,
    fluxCostBase: 300,
    focusRoles: ["navigator", "researcher"],
    preparations: [],
    rewards: { salvage: 25, schematics: 20, nullTraces: 0, engineeringModels: 15 },
  },
  {
    id: "cinder-ashline-recovery",
    name: "Ashline Worker Recovery",
    description: "Reach a mantle crew cut off beyond the charged ash front and recover their hand-built regulator plans.",
    worldId: "cinder",
    category: "story",
    operationCode: "CND-O02",
    successReport: "The workers return with a regulator design that assumes Foundry Nine has already been recommissioned.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 65 * 60,
    difficulty: 12,
    fluxCostBase: 360,
    focusRoles: ["engineer", "fabricator", "doctor"],
    preparations: [
      { id: "cinder-ash-protection", label: "Ash protection", detail: "An armor frame or level 4+ Doctor is recommended against particulate burns.", required: false, options: [{ kind: "armor", count: 1 }, { kind: "role", role: "doctor", level: 4 }] },
    ],
    rewards: { salvage: 65, schematics: 35, nullTraces: 5, engineeringModels: 45, discoveryId: "expedition.cinder-ashline" },
  },
  {
    id: "cinder-foundry-nine-recovery",
    name: "Foundry Nine Recovery",
    description: "Cross the mantle galleries, isolate the recursive control line, and return Foundry Nine to human authority.",
    worldId: "cinder",
    category: "critical",
    operationCode: "CND-C03",
    successReport: "Foundry Nine accepts a public shutdown key. Its maintenance ledger lists the Ark as its original operator.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: true,
    durationSeconds: 80 * 60,
    difficulty: 15,
    fluxCostBase: 520,
    focusRoles: ["engineer", "fabricator", "technician"],
    preparations: [
      { id: "cinder-digital-twin", label: "Mantle digital twin", detail: "Predictive Fabrication must model the gallery before entry.", required: true, options: [{ kind: "research", id: "predictive-fabrication" }] },
      { id: "cinder-thermal-frame", label: "Thermal protection", detail: "Bring at least one armor frame, or allocate an Expedition Support drone.", required: true, options: [{ kind: "armor", count: 1 }, { kind: "automation", id: "expedition-support", count: 1 }] },
      { id: "cinder-full-protection", label: "Full-team protection", detail: "Two armor frames sharply reduce the projected injury burden.", required: false, options: [{ kind: "armor", count: 2 }] },
    ],
    rewards: { salvage: 95, schematics: 55, nullTraces: 10, engineeringModels: 90, discoveryId: "expedition.cinder-foundry-nine" },
  },
  {
    id: "cinder-mantle-salvage",
    name: "Mantle Salvage Circuit",
    description: "Repeat the stabilized gallery loop for alloys, discarded machine logic, and intact forge patterns.",
    worldId: "cinder",
    category: "resource",
    operationCode: "CND-R04",
    successReport: "The circuit returns a compact industrial cache without disturbing the mantle grid.",
    repeatable: true,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 60 * 60,
    difficulty: 12,
    fluxCostBase: 420,
    focusRoles: ["engineer", "fabricator", "technician"],
    preparations: [],
    rewards: { salvage: 140, schematics: 35, nullTraces: 2, engineeringModels: 40 },
  },
  {
    id: "nox-survey",
    name: "Planetary Survey",
    description: "Cross-check surface routes against three contradictory maps and certify only locations all three can physically reach.",
    worldId: "nox",
    category: "survey",
    operationCode: "NOX-S01",
    successReport: "The route exists in every verified account, even though no archive agrees on who built it.",
    repeatable: true,
    countsAsSurvey: true,
    requiredForContinuity: false,
    durationSeconds: 75 * 60,
    difficulty: 14,
    fluxCostBase: 520,
    focusRoles: ["navigator", "researcher", "security"],
    preparations: [],
    rewards: { salvage: 30, schematics: 24, nullTraces: 12, culturalRecords: 18 },
  },
  {
    id: "nox-echo-bunker",
    name: "Echo Bunker Mediation",
    description: "Enter two shelters that each claim the other is a fabricated signal and establish one verifiable record between them.",
    worldId: "nox",
    category: "story",
    operationCode: "NOX-O02",
    successReport: "Both shelters sign the same record. Each copy contains a different final witness: AXIOM.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 90 * 60,
    difficulty: 16,
    fluxCostBase: 650,
    focusRoles: ["teacher", "researcher", "security"],
    preparations: [
      { id: "nox-authentication", label: "Authenticated spectrum", detail: "Discarded Spectrum is required to distinguish a person from a copied signal.", required: true, options: [{ kind: "research", id: "discarded-spectrum" }] },
    ],
    rewards: { salvage: 40, schematics: 38, nullTraces: 35, culturalRecords: 65, discoveryId: "expedition.nox-echo-bunker" },
  },
  {
    id: "kestrel-relay",
    name: "Kestrel Relay Survey",
    description:
      "Secure Uncharted Relay 31, a dead transmitter that answers before it is powered, and use it to authenticate Nox's shared network.",
    worldId: "nox",
    category: "critical",
    operationCode: "NOX-C03",
    successReport: "Relay 31 now signs the public network. Its first authenticated message was transmitted eleven minutes before launch.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: true,
    durationSeconds: 2 * 60 * 60,
    difficulty: 18,
    fluxCostBase: 800,
    focusRoles: ["technician", "researcher", "security"],
    preparations: [
      { id: "nox-relay-model", label: "Relay authentication model", detail: "Discarded Spectrum must identify the relay's impossible carrier pattern.", required: true, options: [{ kind: "research", id: "discarded-spectrum" }] },
      { id: "nox-armed-entry", label: "Armed entry team", detail: "Relay drones are actively hostile. Auto-equip at least two weapons before launch.", required: true, options: [{ kind: "weapons", count: 2 }] },
      { id: "nox-impact-protection", label: "Impact protection", detail: "Two armor frames, a level 5+ Security specialist, or Defensive Forecasting reduces the risk of a hard return.", required: false, options: [{ kind: "armor", count: 2 }, { kind: "role", role: "security", level: 5 }, { kind: "research", id: "defensive-forecasting" }] },
    ],
    rewards: {
      salvage: 110,
      schematics: 70,
      nullTraces: 70,
      culturalRecords: 55,
      discoveryId: "expedition.dead-relay",
    },
  },
  {
    id: "lantern-null-bloom",
    name: "Lantern Null-Bloom Study",
    description:
      "Instrument a dormant Null bloom up close. The richest known source of Null Traces.",
    worldId: "nox",
    category: "story",
    operationCode: "NOX-X04",
    successReport: "The bloom opens around the instruments but refuses to touch the crew. Its center contains a map of Vesper.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 2 * 60 * 60,
    difficulty: 20,
    fluxCostBase: 900,
    focusRoles: ["researcher", "navigator"],
    preparations: [
      { id: "nox-null-baseline", label: "Null baseline", detail: "Null Signal Baseline must be complete before instrumentation can distinguish evidence from sensor loss.", required: true, options: [{ kind: "research", id: "null-signal-baseline" }] },
      { id: "nox-bloom-armor", label: "Exposure protection", detail: "Two armor frames or one Null-resistant volunteer is recommended.", required: false, options: [{ kind: "armor", count: 2 }, { kind: "adaptation", id: "null-resistance", count: 1 }] },
    ],
    rewards: {
      salvage: 55,
      schematics: 45,
      nullTraces: 110,
      culturalRecords: 20,
      discoveryId: "expedition.null-bloom",
    },
  },
  {
    id: "null-sounding",
    name: "Null Sounding",
    description:
      "A repeatable instrumented dive along the Null boundary. Steady Null Traces for a steady crew.",
    worldId: "nox",
    category: "resource",
    operationCode: "NOX-R05",
    successReport: "The team returns with a clean boundary sample and another timestamp that cannot be reconciled.",
    repeatable: true,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 90 * 60,
    difficulty: 17,
    fluxCostBase: 600,
    focusRoles: ["researcher", "navigator"],
    preparations: [],
    rewards: { salvage: 210, schematics: 18, nullTraces: 32, culturalRecords: 10 },
  },
  {
    id: "vesper-survey",
    name: "Planetary Survey",
    description: "Triangulate safe routes between observatories while red storm bands rewrite the visible horizon.",
    worldId: "vesper",
    category: "survey",
    operationCode: "VSP-S01",
    successReport: "The route remains stable only when the Ark records every discarded version beside the accepted one.",
    repeatable: true,
    countsAsSurvey: true,
    requiredForContinuity: false,
    durationSeconds: 2 * 60 * 60,
    difficulty: 18,
    fluxCostBase: 850,
    focusRoles: ["navigator", "researcher", "engineer"],
    preparations: [],
    rewards: { salvage: 38, schematics: 32, nullTraces: 28, engineeringModels: 20, culturalRecords: 18 },
  },
  {
    id: "vesper-observatory-echo",
    name: "Observatory Echo Audit",
    description: "Visit three observatories that remember different planetary histories and build one accountable comparison record.",
    worldId: "vesper",
    category: "story",
    operationCode: "VSP-O02",
    successReport: "The observatories agree to preserve every conflicting history in the public record.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 150 * 60,
    difficulty: 21,
    fluxCostBase: 1_000,
    focusRoles: ["researcher", "teacher", "navigator"],
    preparations: [
      { id: "vesper-observer-model", label: "Observer model", detail: "Observer Recursion is required to compare records without collapsing them into one answer.", required: true, options: [{ kind: "research", id: "observer-recursion" }] },
    ],
    rewards: { salvage: 70, schematics: 55, nullTraces: 85, engineeringModels: 35, culturalRecords: 90, discoveryId: "expedition.vesper-observatory-echo" },
  },
  {
    id: "causal-wreckage",
    name: "Causal Wreckage Recovery",
    description:
      "Board a contact wreck caught between two arrival times. Its systems identify Ark crew as ancestors, then reject the current date.",
    worldId: "vesper",
    category: "critical",
    operationCode: "VSP-C03",
    successReport: "The wreck recognizes the crew as ancestors, then erases the recognition. Vesper receives enough material to expose the Continuity Array safely.",
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: true,
    durationSeconds: 3 * 60 * 60,
    difficulty: 24,
    fluxCostBase: 1_050,
    focusRoles: ["researcher", "navigator", "engineer", "security"],
    preparations: [
      { id: "vesper-temporal-model", label: "Temporal signal model", detail: "Temporal Signal Analysis must identify which arrival is physically current.", required: true, options: [{ kind: "research", id: "temporal-signal-analysis" }] },
      { id: "vesper-armed-boarding", label: "Armed boarding team", detail: "Auto-equip at least two weapons before entering the wreck.", required: true, options: [{ kind: "weapons", count: 2 }] },
      { id: "vesper-shear-protection", label: "Causal-shear protection", detail: "Bring two armor frames, a Null-resistant volunteer, or an Expedition Support drone.", required: true, options: [{ kind: "armor", count: 2 }, { kind: "adaptation", id: "null-resistance", count: 1 }, { kind: "automation", id: "expedition-support", count: 1 }] },
      { id: "vesper-causal-map", label: "Causal route map", detail: "Causal Cartography is recommended and improves confidence in the return corridor.", required: false, options: [{ kind: "research", id: "causal-cartography" }] },
    ],
    rewards: {
      salvage: 120,
      schematics: 70,
      nullTraces: 90,
      engineeringModels: 80,
      culturalRecords: 75,
      discoveryId: "expedition.causal-wreckage",
    },
  },
  {
    id: "vesper-red-scar-sounding",
    name: "Red Scar Sounding",
    description: "Repeat an instrumented pass through the outer anomaly scars and return whatever evidence still agrees with itself.",
    worldId: "vesper",
    category: "resource",
    operationCode: "VSP-R04",
    successReport: "The sounding returns a small cache of mutually compatible evidence and a much larger archive of contradictions.",
    repeatable: true,
    countsAsSurvey: false,
    requiredForContinuity: false,
    durationSeconds: 2 * 60 * 60,
    difficulty: 20,
    fluxCostBase: 900,
    focusRoles: ["researcher", "navigator", "engineer"],
    preparations: [],
    rewards: { salvage: 300, schematics: 36, nullTraces: 55, engineeringModels: 30, culturalRecords: 28 },
  },
  {
    id: "palimpsest-origin",
    name: "Palimpsest Origin Run",
    description:
      "Follow the Foundry's oldest coordinate to whatever was there before the Ark.",
    worldId: null,
    category: "story",
    operationCode: "ARK-X01",
    successReport: "The coordinate is empty. The Foundry records a successful arrival anyway.",
    requiresCampaignComplete: true,
    repeatable: false,
    countsAsSurvey: false,
    requiredForContinuity: false,
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
    preparations: [],
    rewards: {
      salvage: 150,
      schematics: 80,
      nullTraces: 60,
      engineeringModels: 60,
      culturalRecords: 60,
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
          injuryMultipliers: { ...state.active.injuryMultipliers },
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
      const injuryMultipliersSource = isRecord(value.active.injuryMultipliers)
        ? value.active.injuryMultipliers
        : null;
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
        injuryMultipliers: injuryMultipliersSource
          ? Object.fromEntries(
              crewIds.map((crewId) => [
                crewId,
                Math.max(0.7, Math.min(1, finite(injuryMultipliersSource[crewId], 1, 1))),
              ]),
            )
          : {},
        bioadaptationStrengthBonus: finite(value.active.bioadaptationStrengthBonus, 0, 8),
        bioadaptationDurationMultiplier: Math.max(0.85, Math.min(1, finite(value.active.bioadaptationDurationMultiplier, 1, 1))),
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
          engineeringModels:
            raw.schematics === undefined
              ? 0
              : finite(raw.engineeringModels, 0, 1e9),
          biologicalSamples: finite(raw.biologicalSamples, 0, 1e9),
          culturalRecords: finite(raw.culturalRecords, 0, 1e9),
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
  reason: "campaign-incomplete" | "already-completed" | "busy" | null;
};

/** Only current-world work is exposed; future-world names and lore stay hidden. */
export function getExpeditionSitesForWorld(
  worldId: CampaignWorldId | string | null,
  campaignComplete: boolean,
) {
  if (worldId === null) {
    return campaignComplete
      ? EXPEDITION_SITE_DEFINITIONS.filter((site) => site.worldId === null)
      : [];
  }
  return EXPEDITION_SITE_DEFINITIONS.filter(
    (site) => site.worldId === worldId && !site.requiresCampaignComplete,
  );
}

export function getExpeditionAvailability(
  state: ExpeditionState,
  worldId: CampaignWorldId | string | null,
  campaignComplete: boolean,
): ExpeditionAvailability[] {
  return getExpeditionSitesForWorld(worldId, campaignComplete).map((site) => {
    let reason: ExpeditionAvailability["reason"] = null;
    if (site.requiresCampaignComplete && !campaignComplete)
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
  bioadaptationSupport: {
    strengthBonus?: number;
    durationMultiplier?: number;
    injuryMultipliers?: Readonly<Record<string, number>>;
  } = {},
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
    durationSeconds: Math.max(
      60,
      Math.ceil(
        getExpeditionDurationSeconds(site, crew) *
          Math.max(0.85, Math.min(1, bioadaptationSupport.durationMultiplier ?? 1)),
      ),
    ),
    strength:
      getExpeditionGroupStrength(crew) +
      getLoadoutStrengthBonus(loadout) +
      Math.min(2, Math.max(0, researchStrengthBonus)) +
      Math.min(8, Math.max(0, bioadaptationSupport.strengthBonus ?? 0)),
    loadout: loadout.map((entry) => ({ ...entry })),
    injuryMultipliers: Object.fromEntries(
      crew.map((survivor) => [
        survivor.id,
        Math.max(0.7, Math.min(1, bioadaptationSupport.injuryMultipliers?.[survivor.id] ?? 1)),
      ]),
    ),
    bioadaptationStrengthBonus: Math.min(8, Math.max(0, bioadaptationSupport.strengthBonus ?? 0)),
    bioadaptationDurationMultiplier: Math.max(0.85, Math.min(1, bioadaptationSupport.durationMultiplier ?? 1)),
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
  bioadaptationSupport: {
    strengthBonus?: number;
    durationMultiplier?: number;
    injuryMultipliers?: Readonly<Record<string, number>>;
  } = {},
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
        getExpeditionDurationSeconds(site, crew) *
          RESCUE_DURATION_RATIO *
          Math.max(0.85, Math.min(1, bioadaptationSupport.durationMultiplier ?? 1)),
      ),
    ),
    strength:
      getExpeditionGroupStrength(crew) +
      getLoadoutStrengthBonus(loadout) +
      Math.min(8, Math.max(0, bioadaptationSupport.strengthBonus ?? 0)),
    loadout: loadout.map((entry) => ({ ...entry })),
    injuryMultipliers: Object.fromEntries(
      crew.map((survivor) => [survivor.id, Math.max(0.7, Math.min(1, bioadaptationSupport.injuryMultipliers?.[survivor.id] ?? 1))]),
    ),
    bioadaptationStrengthBonus: Math.min(8, Math.max(0, bioadaptationSupport.strengthBonus ?? 0)),
    bioadaptationDurationMultiplier: Math.max(0.85, Math.min(1, bioadaptationSupport.durationMultiplier ?? 1)),
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
                  (active.injuryMultipliers[crewId] ?? 1) *
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
      engineeringModels: 0,
      biologicalSamples: 0,
      culturalRecords: 0,
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
                  (active.injuryMultipliers[crewId] ?? 1) *
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
    engineeringModels: Math.round(
      (site.rewards.engineeringModels ?? 0) *
        scale *
        recoveryMultiplier *
        researchRecoveryMultiplier,
    ),
    biologicalSamples: Math.round(
      (site.rewards.biologicalSamples ?? 0) *
        scale *
        recoveryMultiplier *
        researchRecoveryMultiplier,
    ),
    culturalRecords: Math.round(
      (site.rewards.culturalRecords ?? 0) *
        scale *
        recoveryMultiplier *
        researchRecoveryMultiplier,
    ),
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
