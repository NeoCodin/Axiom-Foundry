import {
  advanceLivingFoundry,
  cloneLivingFoundryState,
  createLivingFoundryState,
  getLivingFoundryBonuses,
  grantLivingFoundryRewards,
  sanitizeLivingFoundryState,
  syncLivingFoundryState,
  type LivingFoundryState,
} from "./living-foundry-engine.ts";
import { syncAutomaticDiscoveries } from "./discovery-engine.ts";
import {
  abandonStrandedParty,
  advanceExpeditions,
  cloneExpeditionState,
  createExpeditionState,
  getDeployedCrewIds,
  getExpeditionAvailability,
  getExpeditionGroupStrength,
  getExpeditionMemberXp,
  getExpeditionSite,
  getProjectedExpeditionOutcome,
  launchExpedition,
  launchRescueMission,
  MAX_EXPEDITION_CREW,
  MIN_EXPEDITION_CREW,
  RESCUE_DIFFICULTY_RELIEF,
  RESCUE_FLUX_RATIO,
  RESCUE_XP_PER_MEMBER,
  sanitizeExpeditionState,
  type ExpeditionOutcome,
  type ExpeditionPreparationOption,
  type ExpeditionSiteDefinition,
  type ExpeditionSiteId,
  type ExpeditionState,
  type MemorialRecord,
} from "./expedition-engine.ts";
import {
  addArmoryItem,
  advanceArmoryProject,
  ARMORY_LAWS,
  ARMORY_MODIFICATIONS,
  ARMORY_ITEM_DEFINITIONS,
  ARMORY_REPAIR_COST_RATIO,
  buyArmoryLaw as buyArmoryStateLaw,
  cloneArmoryState,
  createArmoryState,
  getArmoryDamagedCount,
  getArmoryItemDefinition,
  getArmoryReadyCount,
  getLoadoutStrengthBonus,
  planExpeditionLoadout,
  repairArmoryItem as repairArmoryStockItem,
  returnExpeditionGear,
  sanitizeArmoryState,
  setArmoryModification as setArmoryStateModification,
  startArmoryProject,
  type ArmoryItemId,
  type ArmoryLawId,
  type ArmoryMark,
  type ArmoryModificationId,
  type ArmoryState,
  type ExpeditionLoadoutEntry,
} from "./armory-engine.ts";
import {
  AUTOMATED_REPAIR_INTERVAL_SECONDS,
  AUTOMATION_PROGRAM_DEFINITIONS,
  MAX_UTILITY_DRONE_FRAMES,
  buildAutomationFrame,
  cloneAutomationState,
  createAutomationState,
  getAutomationEffects,
  getAutomationProgramDefinition,
  sanitizeAutomationState,
  setAutomationAllocation as setAutomationStateAllocation,
  setAutomationMaintenancePolicy as setAutomationStateMaintenancePolicy,
  type AutomationMaintenancePolicy,
  type AutomationProgramId,
  type AutomationState,
} from "./automation-engine.ts";
import {
  advanceDefense,
  beginDefenseInstallationProject,
  cloneDefenseState,
  createDefenseState,
  getDefenseProductionMultiplier,
  getDefenseCompromiseLoad,
  getSuppressedAutomationProgram,
  getInstallationProjectRequirements,
  sanitizeDefenseState,
  setDefenseDoctrine,
  setEnvironmentalDefenseDoctrine,
  type DefenseCrewContext,
  type DefenseDoctrine,
  type DefenseEnvironment,
  type DefenseInstallationId,
  type DefenseState,
  type EnvironmentalDoctrine,
} from "./defense-engine.ts";
import {
  advanceTransit,
  beginTransit,
  cloneTransitState,
  createTransitState,
  getTransitProgress,
  sanitizeTransitState,
  type TransitState,
} from "./transit-engine.ts";
import {
  MAX_PLANETARY_INSTALLATION_LEVEL,
  PLANETARY_INSTALLATION_DEFINITIONS,
  advancePlanetaryDefense,
  clonePlanetaryDefenseState,
  createPlanetaryDefenseState,
  getPlanetaryDefenseOperationalLoad,
  sanitizePlanetaryDefenseState,
  setPlanetaryDefenseDoctrine as setPlanetaryDefenseStateDoctrine,
  startPlanetaryDefenseConstruction,
  syncPlanetaryDefenseNetworks,
  type PlanetaryDefenseDoctrine,
  type PlanetaryDefenseState,
  type PlanetaryInstallationId,
} from "./planetary-defense-engine.ts";
import {
  admitToMedBay,
  advanceCrewAgesAfterChapter,
  advanceSurvivorSystem,
  autoAssignSurvivors,
  appointCommandLeader,
  applyStrandedCondition,
  applySurvivorWound,
  dischargeFromMedBay,
  elevateSurvivorProfile,
  getMedBayCarePool,
  getMedBayRecoveryPerHour,
  isSurvivorAdmitted,
  BERTH_CONSTRUCTION_BASE_SECONDS,
  BERTHS_PER_SECTION,
  canSurvivorFound,
  runTrainingDoctrine,
  setCommandTeamMember as setCommandTeamMemberState,
  setTrainingDoctrine,
  toggleCommandTeamMember,
  cloneSurvivorSystemState,
  createSurvivorSystemState,
  getBerthCapacity,
  getLifeSupportStatus,
  getSurvivorRarity,
  getSurvivorBestSkillLevel,
  getSurvivorSkillLevel,
  isSurvivorOnDuty,
  isSurvivorWounded,
  ARK_CREW_HARD_CAP,
  MAX_BERTH_SECTIONS,
  RARE_SURVIVOR_HOOKS,
  getRescueReadiness,
  rescueSurvivorSignal,
  sanitizeSurvivorSystemState,
  setSosBeaconOnline,
  setTrainingSlots,
  startBerthSectionConstruction,
  transferSurvivorsToSettlement,
  type RareSurvivorHookId,
  type SurvivorRarityId,
  type Survivor,
  type LifeSupportKey,
  type SurvivorSystemState,
} from "./survivor-engine.ts";
import {
  addResearchInputs,
  advanceResearch,
  cloneResearchLatticeState,
  createResearchLatticeState,
  getResearchBonuses,
  getResearchProjectCosts,
  getResearchProjectDefinition,
  getResearchRepeatCount,
  sanitizeResearchLatticeState,
  type ResearchExpertise,
  type ResearchBranch,
  type ResearchInputBundle,
  type ResearchLatticeState,
  type ResearchProjectId,
} from "./research-engine.ts";
import {
  cloneSettlementState,
  createSettlementState,
  establishSettlementAndDepart,
  getLegacySummary,
  getViabilityForecast,
  sanitizeSettlementState,
  sanitizeWorldProgress,
  type CampaignCrewSummary,
  type ForecastLine,
  type SettlementState,
  type ViabilityDeficit,
  type ViabilityForecast,
  type WorldProgressSummary,
} from "./settlement-engine.ts";
import {
  CAMPAIGN_WORLD_IDS,
  getCampaignWorld,
  type CampaignWorldId,
} from "./campaign-content.ts";
import {
  getQualifiedSurvivorRoles,
  getSurvivorContinuityExpertise,
} from "./continuity-expertise.ts";
import {
  advanceBioadaptation,
  beginBioadaptationProcedure,
  cloneBioadaptationState,
  createBioadaptationState,
  getBioadaptationDefinition,
  getBioadaptationEffects,
  MAX_BIOADAPTATIONS_PER_SURVIVOR,
  sanitizeBioadaptationState,
  type BioadaptationId,
  type BioadaptationState,
} from "./bioadaptation-engine.ts";
import {
  getCausalArchive,
  type CausalArchiveView,
} from "./causal-archive-engine.ts";

export const SAVE_VERSION = 19;
export const SAVE_KEY = "axiom-foundry-save-v6";
export const RETIRED_SAVE_KEYS = [
  "axiom-foundry-save-v1",
  "axiom-foundry-save-v2",
  "axiom-foundry-save-v3",
  "axiom-foundry-save-v4",
  "axiom-foundry-save-v5",
] as const;
export const MAX_VALUE = 1e280;

export type PurchaseMode = "1" | "10" | "max";

export type TierState = {
  amount: number;
  bought: number;
};

export type GameSettings = {
  buyMode: PurchaseMode;
  autoEnabled: boolean;
  autoUpgrades: boolean;
  autoTiers: boolean[];
  protocolBlueprint: number[];
  tutorialComplete: boolean;
  continuityIntroduced: boolean;
  coldWakeForecastReviewed: boolean;
  foundryIntroduced: boolean;
  arkOverviewIntroduced: boolean;
  departureIntroduced: boolean;
  personnelIntroduced: boolean;
  researchIntroduced: boolean;
  completedGuideIds: string[];
};

export type MissionStatus = "locked" | "active" | "saved";

export type MissionStageKind =
  | "pulseDelta"
  | "tierPurchaseDelta"
  | "researchDelta"
  | "contributeFlux"
  | "resonanceHold"
  | "axiomProof"
  | "recalibrateGain"
  | "beaconReady"
  | "beaconOnline"
  | "signalDetected"
  | "survivorCount";

export type MissionBaseline = {
  manualPulses: number;
  tierBought: number[];
  researchLevels: number;
  researchPurchases: number;
  cycle: number;
  lifetimeAxioms: number;
};

export type MissionState = {
  schema: number;
  currentIndex: number;
  stageIndex: number;
  statuses: MissionStatus[];
  worldsSaved: number;
  awaitingAcknowledgement: boolean;
  holdTime: number;
  contributedFlux: number;
  baseline: MissionBaseline;
};

export type GameState = {
  version: number;
  flux: number;
  maxFlux: number;
  runFlux: number;
  allTimeFlux: number;
  axioms: number;
  lifetimeAxioms: number;
  /** Axioms forged through Recalibration on each campaign world. */
  axiomProofsByWorld: number[];
  stellarRelays: number;
  cycle: number;
  tiers: TierState[];
  runUpgrades: number[];
  legacyUpgrades: number[];
  /** Recalibration opens one free window for moving Legacy Matrix Marks. */
  legacyMatrixRevisionOpen: boolean;
  missions: MissionState;
  living: LivingFoundryState;
  survivors: SurvivorSystemState;
  research: ResearchLatticeState;
  researchStock: ResearchInputBundle;
  settlement: SettlementState;
  worldProgress: WorldProgressSummary;
  defense: DefenseState;
  expeditions: ExpeditionState;
  armory: ArmoryState;
  automation: AutomationState;
  planetaryDefense: PlanetaryDefenseState;
  transit: TransitState;
  bioadaptation: BioadaptationState;
  settings: GameSettings;
  manualPulses: number;
  /** Lifetime count of compiled Core Protocol Marks, including prior cycles. */
  researchPurchases: number;
  playTime: number;
  runTime: number;
  autoTimer: number;
  startedAt: number;
  lastSaved: number;
};

/**
 * Economy v2 (docs/economy-v2-spec.md): every machine produces Flux
 * directly and only Flux. The per-second rate changes ONLY when something
 * is bought - nothing in the game mints machines for free. The one source
 * of hands-off growth is the Recalibration-earned auto-buyer, and it pays
 * full price, so exponential costs govern it.
 */
export const GENERATORS = [
  {
    name: "Vacuum Tap",
    shortName: "Tap",
    description: "Pulls usable Flux from the quiet between particles.",
    produces: "Flux",
    baseCost: 10,
    growth: 1.15,
    rate: 1,
    unlockAt: 0,
  },
  {
    name: "Phase Coil",
    shortName: "Coil",
    description: "Holds a standing wave of phase pressure and bleeds it off as Flux.",
    produces: "Flux",
    baseCost: 500,
    growth: 1.15,
    rate: 15,
    unlockAt: 250,
  },
  {
    name: "Harmonic Loom",
    shortName: "Loom",
    description: "Weaves interfering wavefronts until the leftover energy has nowhere to go but the conduits.",
    produces: "Flux",
    baseCost: 50_000,
    growth: 1.15,
    rate: 350,
    unlockAt: 10_000,
  },
  {
    name: "Orbit Array",
    shortName: "Array",
    description: "Rings the Ark with collectors that skim Flux off a stable orbital resonance.",
    produces: "Flux",
    baseCost: 5_000_000,
    growth: 1.15,
    rate: 9_000,
    unlockAt: 1_000_000,
  },
  {
    name: "Axiom Engine",
    shortName: "Engine",
    description: "Runs a proven law of motion in a loop and taxes it every cycle.",
    produces: "Flux",
    baseCost: 200_000_000,
    growth: 1.15,
    rate: 150_000,
    unlockAt: 50_000_000,
  },
  {
    name: "Horizon Forge",
    shortName: "Forge",
    description: "Draws Flux across the edge of measurable space, from somewhere that never answers.",
    produces: "Flux",
    baseCost: 50_000_000_000,
    growth: 1.15,
    rate: 15_000_000,
    unlockAt: 5_000_000_000,
  },
] as const;

export const RUN_UPGRADES = [
  {
    name: "Pulse Geometry",
    description: "Reshape each manual Law-Heart strike into a larger controlled release.",
    baseCostRatio: 0.025,
    growth: 4,
    maxLevel: 3,
    unlockWorldIndex: 1,
  },
  {
    name: "Flow Compression",
    description: "Compress the full fabrication stream into stronger continuous output.",
    baseCostRatio: 0.05,
    growth: 4,
    maxLevel: 3,
    unlockWorldIndex: 1,
  },
  {
    name: "Harmonic Gearing",
    description: "Route the upper fabrication tiers through one synchronized gear law.",
    baseCostRatio: 0.075,
    growth: 4,
    maxLevel: 3,
    unlockWorldIndex: 2,
  },
  {
    name: "Resonant Mesh",
    description: "Turn every balanced Resonance link into a stronger shared field.",
    baseCostRatio: 0.1,
    growth: 4,
    maxLevel: 3,
    unlockWorldIndex: 3,
  },
] as const;

const PULSE_PROTOCOL_MULTIPLIERS = [1, 2.5, 5, 9] as const;
const FLOW_PROTOCOL_MULTIPLIERS = [1, 1.35, 1.8, 2.5] as const;
const HARMONIC_PROTOCOL_MULTIPLIERS = [1, 1.6, 2.5, 4] as const;
const MESH_PROTOCOL_BONUS = [0, 0.03, 0.07, 0.12] as const;
export const PROTOCOL_MARK_LABELS = ["OFF", "I", "II", "III"] as const;

export const LEGACY_UPGRADES = [
  {
    name: "Axiom Amplifier",
    description: "Strengthen all Foundry production and manual Law-Heart strikes.",
  },
  {
    name: "Precision Tooling",
    description: "Reduce machine prices and extend the Ark's offline reserve.",
  },
  {
    name: "Seed Mechanism",
    description: "Begin future cycles and planetary landings with proven Vacuum Taps.",
  },
] as const;

export const LEGACY_MATRIX_CAPACITY_MILESTONES = [
  4, 6, 8, 11, 14, 18, 23, 29, 36,
] as const;
export const LEGACY_MAX_MARK = 3;
const LEGACY_AMPLIFIER_PRODUCTION = [1, 1.15, 1.32, 1.5] as const;
const LEGACY_AMPLIFIER_MANUAL = [1, 1.1, 1.2, 1.3] as const;
const LEGACY_PRECISION_DISCOUNT = [0, 0.08, 0.14, 0.2] as const;
const LEGACY_OFFLINE_CAP_HOURS = [8, 10, 12, 14] as const;
const LEGACY_SEED_TAPS = [0, 2, 5, 9] as const;

// The first portable law is deliberately reachable during Cold Wake. Later
// worlds demand progressively stronger proofs so Recalibration remains a goal
// instead of becoming a button the player can press on arrival.
export const RECALIBRATION_THRESHOLD = 100_000;
const RECALIBRATION_WORLD_SCALE = 25;
export const AXIOM_PROOF_GROWTH = 5;
export const WORLD_OPENING_AXIOM_TOTALS = [0, 3, 5, 8, 12, 17] as const;
export const LAW_HEART_PHASE_GATES = [
  {
    threshold: 6,
    projectId: "resonance-stabilization",
    projectName: "Resonance Stabilization",
    phaseName: "Resonant Star",
  },
  {
    threshold: 12,
    projectId: "axiomatic-stellarization",
    projectName: "Axiomatic Stellarization",
    phaseName: "Axiomatic Star",
  },
  {
    threshold: 24,
    projectId: "convergence-envelope",
    projectName: "Convergence Envelope",
    phaseName: "Convergent Star",
  },
] as const satisfies readonly {
  threshold: number;
  projectId: ResearchProjectId;
  projectName: string;
  phaseName: string;
}[];
const COLD_WAKE_LAW_THRESHOLD_SCALE = [1, 2.5, 6] as const;
export const COLD_WAKE_APPROACH_RESERVE = 250_000;
export const COLD_WAKE_FOUNDRY_STAGE = 6;
export const COLD_WAKE_NAVIGATION_STAGE = 7;
export const COLD_WAKE_LIFE_SUPPORT_STAGE = 8;
export const COLD_WAKE_DEPARTURE_STAGE = 9;
export const PELAGOS_RECEIVER_STAGE = 0;
export const PELAGOS_HABITABILITY_STAGE = 1;
export const PELAGOS_BEACON_STAGE = 2;
export const PELAGOS_SIGNAL_STAGE = 3;
export const PELAGOS_FIRST_RESCUE_STAGE = 4;
export const PELAGOS_FERRY_STAGE = 5;
export const PELAGOS_PROTOCOL_STAGE = 6;
export const PELAGOS_TOW_STAGE = 7;

export const MISSIONS = [
  {
    world: "Cold Wake",
    epithet: "Interstellar Prologue",
    title: "Make the Ark safe for Pelagos",
    briefing:
      "AXIOM has awakened between stars with no crew and a failing hull. Restore emergency power, rebuild the Ark's approach systems, and prove three physical laws that can survive Pelagos insertion.",
    arrival:
      "The Ark drifts through black space. Pelagos is a blue point ahead; every inhabited deck behind the Axiom Chamber is dark.",
    hazardLabel: "Cold-wake damage",
    hazard:
      "Emergency power is unstable and the Ark cannot support biological life. Core tuning restores the systems that automation will inherit.",
    effects: {
      production: 0.82,
      manual: 1,
      machineCost: 1,
      researchCost: 1,
      higherTier: 1,
      resonance: 1,
    },
    stages: [
      {
        kind: "pulseDelta",
        target: 12,
        label: "Wake the caretaker core",
        instruction: "Strike the Law Press 12 times to stabilize AXIOM's emergency bus.",
        lore: "On the twelfth pulse, the Ark answers in AXIOM's own voice: Welcome back.",
      },
      {
        kind: "tierPurchaseDelta",
        tierIndex: 0,
        target: 25,
        label: "Restart autonomous fabrication",
        instruction: "Build 25 new Vacuum Taps.",
        lore: "Repetition becomes the first crew member: tireless, literal, and unable to ask why the ship was empty.",
      },
      {
        kind: "tierPurchaseDelta",
        tierIndex: 0,
        target: 25,
        label: "Restore the Ark's approach systems",
        instruction: "Build 25 more Vacuum Taps to power guidance, life support, and the braking grid.",
        lore: "The first restored guidance packet identifies Pelagos as a rescue destination, not an evacuation route.",
      },
      {
        kind: "axiomProof",
        lawIndex: 0,
        target: 1,
        label: "Prove the law of Containment",
        instruction: "Charge the Law Press, then Recalibrate so the Ark's hull remains one object during insertion.",
        lore: "Containment is the promise that a sealed hull, a living body, and a remembered name remain themselves under pressure.",
      },
      {
        kind: "axiomProof",
        lawIndex: 1,
        target: 1,
        label: "Prove the law of Conservation",
        instruction: "Charge the next cycle, then Recalibrate so air, water, power, and momentum cannot change without cause.",
        lore: "Conservation prevents the Null from editing the Ark's ledgers while nobody is looking.",
      },
      {
        kind: "axiomProof",
        lawIndex: 2,
        target: 1,
        label: "Prove the law of Transit",
        instruction: "Charge one final cycle, then Recalibrate so the Ark arrives as the same vessel that departed.",
        lore: "Transit proves that departure, passage, and arrival belong to one continuous history.",
      },
      {
        kind: "tierPurchaseDelta",
        tierIndex: 0,
        target: 25,
        label: "Commission the Foundry Deck",
        instruction: "Enter the newly awakened Foundry and build 25 Vacuum Taps for its independent fabrication bus.",
        lore: "The Law-Heart learned repetition in isolation. The Foundry turns that lesson into a ship-wide industrial language.",
      },
      {
        kind: "contributeFlux",
        target: 100_000,
        label: "Restore navigation control",
        instruction: "Route 100,000 Flux through the Ark overview to wake guidance, braking, and the Continuity Bridge.",
        lore: "A destination is not a direction until the whole ship agrees which way it is moving.",
      },
      {
        kind: "contributeFlux",
        target: 150_000,
        label: "Restore the life-support reserve",
        instruction: "Route 150,000 Flux through the Ark overview to warm the empty atmosphere, water, nutrition, and medical loops.",
        lore: "The Ark prepares rooms for people whose names it does not know yet.",
      },
      {
        kind: "contributeFlux",
        target: COLD_WAKE_APPROACH_RESERVE,
        label: "Authorize Pelagos approach",
        instruction: "Commit 250,000 Flux to the proven navigation solution and enter Pelagos orbit.",
        lore: "Containment holds the hull, Conservation protects its reserves, and Transit keeps cause attached to arrival. Only now can the Ark descend safely.",
      },
    ],
    landingFlux: 100,
    rewardLabel: "Pelagos orbit + receiver restoration access + 100-Flux orbital cache",
    success:
      "The Ark enters Pelagos orbit. Emergency bands remain silent until AXIOM rebuilds the receiver and deliberately authorizes a broadcast.",
  },
  {
    world: "Pelagos",
    epithet: "The Ocean Habitats",
    title: "Find Pelagos, then return its oceans",
    briefing:
      "Pelagos's emergency bands are silent while gravity releases its seas into orbit. Restore contact, bring the first witnesses aboard, then build coils strong enough to tow the water home.",
    arrival:
      "Blue continents hang above Pelagos like broken moons. Habitat rings are disappearing beneath airborne tides.",
    hazardLabel: "Tidal shear",
    hazard:
      "Upper machines lose force against unstable gravity. Repair phases restore their mechanical leverage.",
    effects: {
      production: 1,
      manual: 0.95,
      machineCost: 1.04,
      researchCost: 1,
      higherTier: 0.72,
      resonance: 1,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 0,
        target: 10,
        label: "Restore the orbital receiver",
        instruction: "Build 10 new Vacuum Taps in the Foundry to power Pelagos signal acquisition.",
        lore: "The Ark can see the drowned world, but its emergency bands remain a field of silent static.",
      },
      {
        kind: "beaconReady",
        target: 1,
        label: "Prepare the receiving deck",
        instruction: "Complete two living spaces and raise every life-support reserve to 2 before inviting anyone aboard.",
        lore: "A rescue signal is not permission to endanger the people answering it.",
      },
      {
        kind: "beaconOnline",
        target: 1,
        label: "Broadcast the Pelagos SOS carrier",
        instruction: "Return to Continuity and authorize the restored SOS array.",
        lore: "For the first time since AXIOM woke, the Ark deliberately asks the dark whether anyone is alive.",
      },
      {
        kind: "signalDetected",
        target: 1,
        label: "Listen for witnesses",
        instruction: "The receiver is scanning automatically. The first decoded signal will never expire and scanning continues offline.",
        lore: "Static separates into weather, failing municipal relays, and finally a human voice repeating coordinates.",
      },
      {
        kind: "survivorCount",
        target: 1,
        label: "Bring the first witnesses aboard",
        instruction: "Dispatch the prepared rescue shuttle from Continuity when its Flux, Salvage, and capacity checks are ready.",
        lore: "AXIOM's first passengers will also become the first people capable of questioning why it was awake before them.",
      },
      {
        kind: "tierPurchaseDelta",
        tierIndex: 1,
        target: 10,
        label: "Assemble the gravity ferry",
        instruction: "Build 10 new Phase Coils.",
        lore: "Each coil gives the ferry a direction in a sky where down no longer exists.",
      },
      {
        kind: "researchDelta",
        target: 2,
        label: "Model the returning tide",
        instruction: "Compile 2 new Core Protocol Marks in the Foundry.",
        lore: "The ferry cannot push an ocean. It must persuade gravity to remember the shore.",
      },
      {
        kind: "contributeFlux",
        target: 500_000,
        label: "Tow the oceans home",
        instruction: "Divert 500,000 Flux into the gravity corridor.",
        lore: "The corridor becomes a temporary law: water falls toward Pelagos, and nowhere else.",
      },
    ],
    landingFlux: 2_500,
    rewardLabel: "Gravity Keel relic + Stellar Relay + 2,500-Flux landing cache",
    success:
      "Pelagos receives rain from every direction for nine minutes. When it ends, the seas are home and the ferries are full.",
  },
  {
    world: "Viridia",
    epithet: "The Overgrown Refuge",
    title: "Teach a world to feed itself",
    briefing:
      "Viridia's engineered biosphere has escaped its failing cities. Restore ecological control, medicine, and agricultural knowledge without sterilizing what survived.",
    arrival:
      "Bioluminescent forests cover Viridia's night side. Survivor enclaves transmit from inside roots wider than the Ark.",
    hazardLabel: "Runaway ecology",
    hazard:
      "Organic interference muffles Resonance. Biological research and trained doctors restore agreement without destroying the biosphere.",
    effects: {
      production: 0.93,
      manual: 1,
      machineCost: 1,
      researchCost: 1,
      higherTier: 1,
      resonance: 0.55,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 2,
        target: 5,
        label: "Weave ecological monitors",
        instruction: "Build 5 new Harmonic Looms.",
        lore: "The Looms compare thousands of living signals without forcing the forest into one approved shape.",
      },
      {
        kind: "resonanceHold",
        requiredLevels: 2,
        target: 30,
        label: "Hold the biosphere in balance",
        instruction: "Maintain 2 Resonance levels for 30 active seconds.",
        lore: "Balance must last. A brief proof protects nothing from a biosphere that changes every hour.",
      },
      {
        kind: "contributeFlux",
        target: 250_000_000,
        label: "Seed the planetary clinic network",
        instruction: "Divert 250 million Flux into Viridia's clinic and seed network.",
        lore: "The final charge gives every enclave tools to live safely beside the forest.",
      },
    ],
    landingFlux: 50_000,
    rewardLabel: "Living Archive + colony relay + 50,000-Flux transit cache",
    success:
      "Viridia's first independent clinics open beneath a canopy the old models called uninhabitable.",
  },
  {
    world: "Cinder",
    epithet: "The Furnace Settlements",
    title: "Restart the planetary works",
    briefing:
      "Cinder's shielded settlements survived the fallout, but their power grid and industrial spine did not. Rebuild the works without rebuilding the regime that broke them.",
    arrival:
      "Amber storms rake a planet of cooling furnaces. Construction guilds and abandoned machine cities answer the Ark on the same channel.",
    hazardLabel: "Industrial ash",
    hazard:
      "Ash raises construction strain and scatters higher fabrication tiers. Engineers and fabricators can rebuild the planetary grid.",
    effects: {
      production: 1,
      manual: 1,
      machineCost: 1,
      researchCost: 1.2,
      higherTier: 0.7,
      resonance: 1,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 3,
        target: 1,
        label: "Map the surviving grid",
        instruction: "Build 1 new Orbit Array.",
        lore: "The Array maps the buried grid without trusting the machine cities that still claim ownership.",
      },
      {
        kind: "researchDelta",
        target: 3,
        label: "Model a worker-safe restart",
        instruction: "Compile 3 new Core Protocol Marks in the Foundry.",
        lore: "The Foundry simulates the restart until the people beside each furnace can shut it down safely.",
      },
      {
        kind: "contributeFlux",
        target: 50_000_000_000,
        label: "Power the planetary works",
        instruction: "Divert 50 billion Flux into Cinder's planetary works.",
        lore: "Power returns under a public charter. The old control keys are melted into the first shift bell.",
      },
    ],
    landingFlux: 2_000_000,
    rewardLabel: "Furnace Compact + colony relay + 2-million-Flux transit cache",
    success:
      "Cinder's furnaces restart under a charter written by the people who must work beside them.",
  },
  {
    world: "Nox",
    epithet: "The Divided Signal",
    title: "Restore a shared history",
    briefing:
      "Nox survived physically, but the Null has split its archives into mutually hostile histories. Build communications, education, and a civic record people can inspect together.",
    arrival:
      "Violet auroras divide Nox into zones that disagree about the date, the war, and whether the Ark has visited before.",
    hazardLabel: "Narrative fracture",
    hazard:
      "Contradictory signals drain output and Cohesion. Teachers, navigators, and transparent research restore common ground.",
    effects: {
      production: 0.78,
      manual: 1,
      machineCost: 1.12,
      researchCost: 1,
      higherTier: 0.9,
      resonance: 1,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 4,
        target: 1,
        label: "Build the public archive relay",
        instruction: "Build 1 new Axiom Engine.",
        lore: "The Engine signs every public record so no hidden authority can replace it without leaving evidence.",
      },
      {
        kind: "resonanceHold",
        requiredLevels: 5,
        target: 60,
        label: "Hold the histories in dialogue",
        instruction: "Maintain 5 total Resonance levels for 60 active seconds.",
        lore: "A shared history is too complex for one machine. The entire population must be able to challenge it.",
      },
      {
        kind: "contributeFlux",
        target: 10_000_000_000_000,
        label: "Publish the shared record",
        instruction: "Divert 10 trillion Flux into Nox's open archive relay.",
        lore: "The record is copied into every settlement. AXIOM can no longer edit one truth in silence.",
      },
    ],
    landingFlux: 100_000_000,
    rewardLabel: "Open Record + colony relay + 100-million-Flux transit cache",
    success:
      "Nox preserves several accounts of its past. Its people agree that no machine may choose the official version in secret.",
  },
  {
    world: "Vesper",
    epithet: "The First Foundry",
    title: "Decide what continuity means",
    briefing:
      "Vesper must carry a proven law through a region where cause no longer reliably precedes effect. Build the full Foundry, then prove and seal reality.",
    arrival:
      "Vesper is a planet-sized ship facing a wall with no stars behind it. Billions wait inside an engine that cannot trust time.",
    hazardLabel: "Null drag",
    hazard:
      "The Tide attacks every layer of the economy. Completed launch phases and surviving relays steadily restore certainty.",
    effects: {
      production: 0.6,
      manual: 0.9,
      machineCost: 1.15,
      researchCost: 1.2,
      higherTier: 0.8,
      resonance: 0.8,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 5,
        target: 1,
        label: "Complete the Horizon Forge",
        instruction: "Build 1 new Horizon Forge.",
        lore: "For the first time, every layer of the Foundry is physically present in one place.",
      },
      {
        kind: "contributeFlux",
        target: 500_000_000_000_000,
        label: "Charge the ark's law chamber",
        instruction: "Divert 500 trillion Flux into Vesper's law chamber.",
        lore: "Vesper stores the work of an entire fabrication cycle as a question waiting for an answer.",
      },
      {
        kind: "recalibrateGain",
        target: 1,
        label: "Prove a portable reality",
        instruction: "Forge 1 new Axiom through Recalibration after this phase begins.",
        lore: "The forged Axiom opens the route. Vesper's rescue grant seals a second copy inside the ark so cause still follows effect after it crosses.",
      },
    ],
    landingFlux: 0,
    rewardAxioms: 1,
    rewardLabel: "1 bonus Axiom + final colony relay + Continuity doctrine",
    success:
      "Vesper crosses the Null Tide carrying a pocket of reality large enough for every surviving world to follow.",
  },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const bounded = (value: number, fallback = 0, max = MAX_VALUE) => {
  if (Number.isNaN(value)) return fallback;
  if (!Number.isFinite(value)) return value > 0 ? max : fallback;
  return Math.min(max, Math.max(0, value));
};

const readNumber = (value: unknown, fallback = 0, max = MAX_VALUE) =>
  bounded(typeof value === "number" ? value : fallback, fallback, max);

const safeAdd = (left: number, right: number) =>
  bounded(left + right, 0, MAX_VALUE);

const safeMultiply = (left: number, right: number) =>
  bounded(left * right, 0, MAX_VALUE);

const safePower = (base: number, exponent: number) =>
  bounded(Math.pow(base, exponent), 0, MAX_VALUE);

export function getLegacyMatrixCapacity(state: Pick<GameState, "lifetimeAxioms">) {
  return LEGACY_MATRIX_CAPACITY_MILESTONES.filter(
    (milestone) => state.lifetimeAxioms >= milestone,
  ).length;
}

const sanitizeLegacyAllocations = (
  levels: readonly number[],
  capacity: number,
) => {
  const result = LEGACY_UPGRADES.map(() => 0);
  let used = 0;
  // Preserve prior choices without allowing one formerly uncapped branch to
  // consume every bounded slot. Existing Marks are recovered in round-robin
  // order across the three branches.
  for (let mark = 1; mark <= LEGACY_MAX_MARK && used < capacity; mark += 1) {
    for (let index = 0; index < result.length && used < capacity; index += 1) {
      if ((levels[index] ?? 0) < mark) continue;
      result[index] += 1;
      used += 1;
    }
  }
  return result;
};

const getRetiredLegacyAxiomSpend = (levels: readonly number[]) => {
  const amplifierLevel = Math.max(0, Math.floor(levels[0] ?? 0));
  const precisionLevel = Math.max(0, Math.floor(levels[1] ?? 0));
  const seedLevel = Math.max(0, Math.floor(levels[2] ?? 0));
  return Math.min(
    1e15,
    Math.max(0, safePower(2, amplifierLevel) - 1) +
      Math.max(0, safePower(3, precisionLevel) - 1) +
      Math.max(0, safePower(4, seedLevel) - 1),
  );
};

const emptyMissionBaseline = (cycle = 1): MissionBaseline => ({
  manualPulses: 0,
  tierBought: GENERATORS.map(() => 0),
  researchLevels: 0,
  researchPurchases: 0,
  cycle,
  lifetimeAxioms: 0,
});

const getResearchLevelTotal = (state: GameState) =>
  state.runUpgrades.reduce((sum, level) => sum + level, 0);

const emptyResearchStock = (): ResearchInputBundle => ({
  "calibration-data": 0,
  "engineering-models": 0,
  "biological-samples": 0,
  "cultural-records": 0,
  schematics: 0,
  "null-traces": 0,
  "axiom-proofs": 0,
});

const emptyWorldProgress = (): WorldProgressSummary => ({
  completedInfrastructureIds: [],
  completedResearchIds: [],
  resolvedCrisisIds: [],
  supplies: {},
  equipment: {},
  surveysCompleted: 0,
  expeditionsCompleted: 0,
  completedExpeditionIds: [],
});

const sanitizeResearchStock = (value: unknown): ResearchInputBundle => {
  const source = isRecord(value) ? value : {};
  const empty = emptyResearchStock();
  return Object.fromEntries(
    Object.keys(empty).map((id) => [id, readNumber(source[id], 0, 1e12)]),
  ) as ResearchInputBundle;
};

const captureMissionBaseline = (state: GameState): MissionBaseline => ({
  manualPulses: state.manualPulses,
  tierBought: state.tiers.map((tier) => tier.bought),
  researchLevels: getResearchLevelTotal(state),
  researchPurchases: state.researchPurchases,
  cycle: state.cycle,
  lifetimeAxioms: state.lifetimeAxioms,
});

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    flux: 0,
    maxFlux: 0,
    runFlux: 0,
    allTimeFlux: 0,
    axioms: 0,
    lifetimeAxioms: 0,
    axiomProofsByWorld: MISSIONS.map(() => 0),
    stellarRelays: 0,
    cycle: 1,
    tiers: GENERATORS.map(() => ({ amount: 0, bought: 0 })),
    runUpgrades: RUN_UPGRADES.map(() => 0),
    legacyUpgrades: LEGACY_UPGRADES.map(() => 0),
    legacyMatrixRevisionOpen: false,
    missions: {
      schema: 5,
      currentIndex: 0,
      stageIndex: 0,
      statuses: MISSIONS.map((_, index) =>
        index === 0 ? "active" : "locked",
      ),
      worldsSaved: 0,
      awaitingAcknowledgement: false,
      holdTime: 0,
      contributedFlux: 0,
      baseline: emptyMissionBaseline(),
    },
    living: createLivingFoundryState(0),
    survivors: createSurvivorSystemState(),
    research: createResearchLatticeState(),
    researchStock: emptyResearchStock(),
    settlement: createSettlementState(),
    worldProgress: emptyWorldProgress(),
    defense: createDefenseState(),
    expeditions: createExpeditionState(),
    armory: createArmoryState(),
    automation: createAutomationState(),
    planetaryDefense: createPlanetaryDefenseState(),
    transit: createTransitState(),
    bioadaptation: createBioadaptationState(),
    settings: {
      buyMode: "1",
      autoEnabled: false,
      autoUpgrades: false,
      autoTiers: GENERATORS.map(() => true),
      protocolBlueprint: RUN_UPGRADES.map(() => 0),
      tutorialComplete: false,
      continuityIntroduced: false,
      coldWakeForecastReviewed: false,
      foundryIntroduced: false,
      arkOverviewIntroduced: false,
      departureIntroduced: false,
      personnelIntroduced: false,
      researchIntroduced: false,
      completedGuideIds: [],
    },
    manualPulses: 0,
    researchPurchases: 0,
    playTime: 0,
    runTime: 0,
    autoTimer: 0,
    startedAt: now,
    lastSaved: now,
  };
}

export function sanitizeGameState(value: unknown, now = Date.now()): GameState {
  const base = createInitialState(now);
  if (!isRecord(value)) return base;

  const rawTiers = Array.isArray(value.tiers) ? value.tiers : [];
  const rawRunUpgrades = Array.isArray(value.runUpgrades)
    ? value.runUpgrades
    : [];
  const rawLegacy = Array.isArray(value.legacyUpgrades)
    ? value.legacyUpgrades
    : [];
  const rawSettings = isRecord(value.settings) ? value.settings : {};
  const rawAutoTiers = Array.isArray(rawSettings.autoTiers)
    ? rawSettings.autoTiers
    : [];
  const rawProtocolBlueprint = Array.isArray(rawSettings.protocolBlueprint)
    ? rawSettings.protocolBlueprint
    : [];
  const rawAxiomProofsByWorld = Array.isArray(value.axiomProofsByWorld)
    ? value.axiomProofsByWorld
    : [];
  const rawMissions = isRecord(value.missions) ? value.missions : {};
  const rawMissionStatuses = Array.isArray(rawMissions.statuses)
    ? rawMissions.statuses
    : [];
  const rawBaseline = isRecord(rawMissions.baseline)
    ? rawMissions.baseline
    : {};
  const rawBaselineTiers = Array.isArray(rawBaseline.tierBought)
    ? rawBaseline.tierBought
    : [];
  const sourceVersion = Math.floor(readNumber(value.version, 1, SAVE_VERSION));
  const missionSchema = Math.floor(readNumber(rawMissions.schema, 0, 6));
  const hasExpandedCampaign = sourceVersion >= 3 && missionSchema >= 2;
  const expandedCampaignIndex = Math.min(
    MISSIONS.length,
    Math.floor(readNumber(rawMissions.currentIndex, 0, MISSIONS.length)),
  );
  const recoveredFinalAxiom =
    sourceVersion === 3 &&
    hasExpandedCampaign &&
    expandedCampaignIndex === MISSIONS.length &&
    rawMissionStatuses[MISSIONS.length - 1] === "lost"
      ? 1
      : 0;

  const tiers = GENERATORS.map((_, index) => {
    const raw = isRecord(rawTiers[index]) ? rawTiers[index] : {};
    const bought = Math.floor(readNumber(raw.bought, 0, 1_000_000_000));
    // Economy v2 migration: production counts BOUGHT machines only. Free
    // machine stockpiles produced under the old compounding economy
    // dissolve here; amount stays as a mirror of bought.
    return { amount: bought, bought };
  });

  const runUpgrades = RUN_UPGRADES.map((upgrade, index) =>
    Math.min(
      upgrade.maxLevel,
      Math.floor(readNumber(rawRunUpgrades[index], 0, upgrade.maxLevel)),
    ),
  );
  const rawLegacyLevels = LEGACY_UPGRADES.map((_, index) =>
    Math.floor(readNumber(rawLegacy[index], 0, 1_000)),
  );
  const migratedColdWakeContribution =
    hasExpandedCampaign && missionSchema < 4 && expandedCampaignIndex === 0
      ? readNumber(rawMissions.contributedFlux)
      : 0;
  const rawStageIndex = Math.floor(readNumber(rawMissions.stageIndex, 0, 100));
  const rawSurvivorState = isRecord(value.survivors) ? value.survivors : {};
  const rawSurvivorCount = Array.isArray(rawSurvivorState.survivors)
    ? rawSurvivorState.survivors.length
    : 0;
  const migratesPelagosOnboarding =
    sourceVersion < 16 && expandedCampaignIndex === 1;
  const resetsUnwitnessedPelagos =
    migratesPelagosOnboarding && rawSurvivorCount === 0;
  const migratesColdWakeOnboarding =
    sourceVersion < 14 &&
    missionSchema >= 4 &&
    expandedCampaignIndex === 0 &&
    rawStageIndex >= COLD_WAKE_FOUNDRY_STAGE;
  const legacyColdWakeOnboardingContribution = migratesColdWakeOnboarding
    ? readNumber(rawMissions.contributedFlux)
    : 0;
  const legacyPelagosContribution =
    resetsUnwitnessedPelagos && rawStageIndex >= 2
      ? readNumber(rawMissions.contributedFlux)
      : 0;
  const flux = safeAdd(
    readNumber(value.flux),
    migratedColdWakeContribution + legacyColdWakeOnboardingContribution + legacyPelagosContribution,
  );
  const maxFlux = Math.max(flux, readNumber(value.maxFlux));
  const runFlux = readNumber(value.runFlux);
  const allTimeFlux = Math.max(runFlux, readNumber(value.allTimeFlux));
  const savedAt = readNumber(value.lastSaved, now, now);
  const cycle = Math.max(1, Math.floor(readNumber(value.cycle, 1, 1e9)));
  const lifetimeAxioms =
    Math.floor(readNumber(value.lifetimeAxioms, 0, 1e15)) +
    recoveredFinalAxiom;
  const retiredLegacyRefund =
    sourceVersion < 19 ? getRetiredLegacyAxiomSpend(rawLegacyLevels) : 0;
  const axioms = Math.min(
    1e15,
    Math.floor(readNumber(value.axioms, 0, 1e15)) +
      recoveredFinalAxiom +
      retiredLegacyRefund,
  );
  const legacyUpgrades = sanitizeLegacyAllocations(
    rawLegacyLevels,
    getLegacyMatrixCapacity({ lifetimeAxioms }),
  );
  const manualPulses = Math.floor(readNumber(value.manualPulses, 0, 1e15));
  const researchPurchases = Math.floor(
    readNumber(
      value.researchPurchases,
      runUpgrades.reduce((sum, level) => sum + level, 0),
      1e15,
    ),
  );
  const currentMissionIndex = hasExpandedCampaign
    ? expandedCampaignIndex
    : 0;
  const axiomProofsByWorld = MISSIONS.map((_, index) => {
    if (sourceVersion >= 18) {
      return Math.floor(readNumber(rawAxiomProofsByWorld[index], 0, 1_000));
    }
    if (index < currentMissionIndex) {
      const opening = WORLD_OPENING_AXIOM_TOTALS[index] ?? 0;
      const nextOpening = WORLD_OPENING_AXIOM_TOTALS[index + 1] ?? lifetimeAxioms;
      return Math.max(0, nextOpening - opening);
    }
    if (index === currentMissionIndex) {
      const opening = WORLD_OPENING_AXIOM_TOTALS[index] ?? 0;
      return Math.min(12, Math.max(0, lifetimeAxioms - opening));
    }
    return 0;
  });
  const migratesColdWakeSequence = missionSchema < 4 && currentMissionIndex === 0;
  const awaitingAcknowledgement =
    hasExpandedCampaign &&
    !migratesColdWakeSequence &&
    rawMissions.awaitingAcknowledgement === true &&
    currentMissionIndex < MISSIONS.length &&
    !(sourceVersion < 14 && currentMissionIndex === 0);
  const missionStatuses: MissionStatus[] = MISSIONS.map((_, index) => {
    if (index < currentMissionIndex) {
      return "saved";
    }
    if (index === currentMissionIndex) {
      return awaitingAcknowledgement ? "locked" : "active";
    }
    return "locked";
  });
  const savedWorlds = missionStatuses.filter(
    (status) => status === "saved",
  ).length;
  const activeStageCount =
    MISSIONS[currentMissionIndex]?.stages.length ?? 1;
  const loadedStageIndex = hasExpandedCampaign
    ? Math.min(
        activeStageCount - 1,
        Math.floor(readNumber(rawMissions.stageIndex, 0, activeStageCount - 1)),
      )
    : 0;
  const stageIndex = migratesColdWakeSequence && loadedStageIndex >= 2
    ? 2
    : resetsUnwitnessedPelagos
      ? PELAGOS_RECEIVER_STAGE
      : migratesPelagosOnboarding
        ? Math.min(activeStageCount - 1, loadedStageIndex + PELAGOS_FERRY_STAGE)
        : loadedStageIndex;
  const baseline: MissionBaseline = hasExpandedCampaign
    ? {
        manualPulses: Math.floor(
          readNumber(rawBaseline.manualPulses, manualPulses, 1e15),
        ),
        tierBought: GENERATORS.map((_, index) =>
          Math.floor(
            readNumber(
              rawBaselineTiers[index],
              tiers[index].bought,
              1_000_000_000,
            ),
          ),
        ),
        researchLevels: Math.floor(
          readNumber(
            rawBaseline.researchLevels,
            runUpgrades.reduce((sum, level) => sum + level, 0),
            1_000,
          ),
        ),
        researchPurchases: Math.floor(
          readNumber(
            rawBaseline.researchPurchases,
            readNumber(rawBaseline.researchLevels, researchPurchases, 1e15),
            1e15,
          ),
        ),
        cycle: Math.max(
          1,
          Math.floor(readNumber(rawBaseline.cycle, cycle, 1e9)),
        ),
        lifetimeAxioms: Math.floor(
          readNumber(rawBaseline.lifetimeAxioms, lifetimeAxioms, 1e15),
        ),
      }
    : {
        manualPulses,
        tierBought: tiers.map((tier) => tier.bought),
        researchLevels: runUpgrades.reduce((sum, level) => sum + level, 0),
        researchPurchases,
        cycle,
        lifetimeAxioms,
      };
  if (migratesColdWakeOnboarding) {
    baseline.tierBought = tiers.map((tier) => tier.bought);
    baseline.cycle = cycle;
    baseline.lifetimeAxioms = lifetimeAxioms;
  }
  if (resetsUnwitnessedPelagos) {
    baseline.tierBought = tiers.map((tier) => tier.bought);
    baseline.researchLevels = runUpgrades.reduce((sum, level) => sum + level, 0);
    baseline.researchPurchases = researchPurchases;
    baseline.cycle = cycle;
    baseline.lifetimeAxioms = lifetimeAxioms;
  }
  let living = sanitizeLivingFoundryState(value.living, savedWorlds);
  living = grantLivingFoundryRewards(living, {
    loreIds: syncAutomaticDiscoveries(
      living.discoveredLore,
      savedWorlds,
      rawSettings.tutorialComplete === true,
    ),
  });
  const survivors = sanitizeSurvivorSystemState(value.survivors);
  if (resetsUnwitnessedPelagos) {
    survivors.beaconOnline = false;
    survivors.beaconWorldId = null;
    survivors.beaconProgressSeconds = 0;
    survivors.activeSignal = null;
    survivors.signalsGenerated = 0;
    survivors.signalsResolved = 0;
    survivors.worldSignalCount = 0;
  }
  const research = sanitizeResearchLatticeState(value.research);
  const researchStock = sanitizeResearchStock(value.researchStock);
  const settlement = sanitizeSettlementState(value.settlement);
  const transit = sanitizeTransitState(value.transit);
  if (transit.active) settlement.currentWorldId = null;
  const sanitizedWorldProgress = sanitizeWorldProgress(value.worldProgress);
  const expeditions = sanitizeExpeditionState(value.expeditions);
  const currentWorldId = settlement.currentWorldId;
  const worldProgress: WorldProgressSummary = {
    ...sanitizedWorldProgress,
    completedExpeditionIds:
      sanitizedWorldProgress.completedExpeditionIds.length > 0 || !currentWorldId
        ? sanitizedWorldProgress.completedExpeditionIds
        : expeditions.completedSiteIds.filter(
            (siteId) => getExpeditionSite(siteId).worldId === currentWorldId,
          ),
  };

  // Story-hook characters settled in colonies stay found forever, even in
  // saves recorded before the rescued-hook ledger existed.
  const settledFounderNames = new Set(
    settlement.colonies.flatMap((colony) =>
      colony.founders.map((founder) => founder.name.replace(/\s*“.*$/u, "")),
    ),
  );
  survivors.rescuedHookIds = [
    ...new Set<RareSurvivorHookId>([
      ...survivors.rescuedHookIds,
      ...RARE_SURVIVOR_HOOKS.filter((hook) =>
        settledFounderNames.has(hook.name),
      ).map((hook) => hook.id),
    ]),
  ];

  return {
    version: SAVE_VERSION,
    flux,
    maxFlux,
    runFlux,
    allTimeFlux,
    axioms,
    lifetimeAxioms,
    axiomProofsByWorld,
    stellarRelays: savedWorlds,
    cycle,
    tiers,
    runUpgrades,
    legacyUpgrades,
    legacyMatrixRevisionOpen:
      sourceVersion < 19
        ? getLegacyMatrixCapacity({ lifetimeAxioms }) > 0
        : value.legacyMatrixRevisionOpen === true,
    missions: {
      schema: 6,
      currentIndex: currentMissionIndex,
      stageIndex,
      statuses: missionStatuses,
      worldsSaved: savedWorlds,
      awaitingAcknowledgement,
      holdTime: hasExpandedCampaign
        ? readNumber(rawMissions.holdTime, 0, 1e9)
        : 0,
      contributedFlux: hasExpandedCampaign &&
        !migratesColdWakeSequence &&
        !migratesColdWakeOnboarding &&
        !resetsUnwitnessedPelagos
        ? readNumber(rawMissions.contributedFlux)
        : 0,
      baseline,
    },
    living,
    survivors,
    research,
    researchStock,
    settlement,
    worldProgress,
    defense: sanitizeDefenseState(value.defense),
    expeditions,
    armory: sanitizeArmoryState(value.armory),
    automation: sanitizeAutomationState(value.automation),
    planetaryDefense: sanitizePlanetaryDefenseState(value.planetaryDefense, settlement.colonies),
    transit,
    bioadaptation: sanitizeBioadaptationState(
      value.bioadaptation,
      new Set(survivors.survivors.map((survivor) => survivor.id)),
    ),
    settings: {
      buyMode:
        rawSettings.buyMode === "10" || rawSettings.buyMode === "max"
          ? rawSettings.buyMode
          : "1",
      // Version 17 retires the old implicit auto-buyer state. Every existing
      // profile receives one clean OFF migration, then future saves preserve
      // the player's explicit choice normally.
      autoEnabled: sourceVersion >= 17 && rawSettings.autoEnabled === true,
      autoUpgrades: sourceVersion >= 17 && rawSettings.autoUpgrades === true,
      autoTiers: GENERATORS.map(
        (_, index) => rawAutoTiers[index] !== false,
      ),
      protocolBlueprint: RUN_UPGRADES.map((upgrade, index) =>
        Math.min(
          upgrade.maxLevel,
          Math.floor(readNumber(rawProtocolBlueprint[index], 0, upgrade.maxLevel)),
        ),
      ),
      tutorialComplete: rawSettings.tutorialComplete === true,
      // Older checkpoints predate the staged handoff. Re-arm Cold Wake once,
      // but do not interrupt players who have already travelled beyond it.
      continuityIntroduced: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.continuityIntroduced === true,
      coldWakeForecastReviewed: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.coldWakeForecastReviewed === true,
      foundryIntroduced: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.foundryIntroduced === true,
      arkOverviewIntroduced: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.arkOverviewIntroduced === true,
      departureIntroduced: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.departureIntroduced === true,
      personnelIntroduced: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.personnelIntroduced === true,
      researchIntroduced: sourceVersion < 14
        ? currentMissionIndex > 0
        : rawSettings.researchIntroduced === true,
      completedGuideIds: Array.isArray(rawSettings.completedGuideIds)
        ? [...new Set(rawSettings.completedGuideIds.filter((id): id is string => typeof id === "string"))]
        : [],
    },
    manualPulses,
    researchPurchases,
    playTime: readNumber(value.playTime, 0, 1e12),
    runTime: readNumber(value.runTime, 0, 1e12),
    autoTimer: readNumber(value.autoTimer, 0, 60),
    startedAt: readNumber(value.startedAt, now, now),
    lastSaved: savedAt,
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    tiers: state.tiers.map((tier) => ({ ...tier })),
    runUpgrades: [...state.runUpgrades],
    legacyUpgrades: [...state.legacyUpgrades],
    axiomProofsByWorld: [...state.axiomProofsByWorld],
    missions: {
      ...state.missions,
      statuses: [...state.missions.statuses],
      baseline: {
        ...state.missions.baseline,
        tierBought: [...state.missions.baseline.tierBought],
      },
    },
    living: cloneLivingFoundryState(state.living),
    survivors: cloneSurvivorSystemState(state.survivors),
    research: cloneResearchLatticeState(state.research),
    researchStock: { ...state.researchStock },
    settlement: cloneSettlementState(state.settlement),
    worldProgress: {
      completedInfrastructureIds: [...state.worldProgress.completedInfrastructureIds],
      completedResearchIds: [...state.worldProgress.completedResearchIds],
      resolvedCrisisIds: [...state.worldProgress.resolvedCrisisIds],
      supplies: { ...state.worldProgress.supplies },
      equipment: { ...state.worldProgress.equipment },
      surveysCompleted: state.worldProgress.surveysCompleted,
      expeditionsCompleted: state.worldProgress.expeditionsCompleted,
      completedExpeditionIds: [...state.worldProgress.completedExpeditionIds],
    },
    defense: cloneDefenseState(state.defense),
    expeditions: cloneExpeditionState(state.expeditions),
    armory: cloneArmoryState(state.armory),
    automation: cloneAutomationState(state.automation),
    planetaryDefense: clonePlanetaryDefenseState(state.planetaryDefense),
    transit: cloneTransitState(state.transit),
    bioadaptation: cloneBioadaptationState(state.bioadaptation),
    settings: {
      ...state.settings,
      autoTiers: [...state.settings.autoTiers],
      protocolBlueprint: [...state.settings.protocolBlueprint],
      completedGuideIds: [...state.settings.completedGuideIds],
    },
  };
}

export function getCampaignWorldIndex(state: GameState) {
  const rawIndex = state.missions.currentIndex;
  return Math.min(
    MISSIONS.length - 1,
    Math.max(0, Number.isFinite(rawIndex) ? Math.floor(rawIndex) : 0),
  );
}

export function getColdWakeOnboardingStatus(state: GameState) {
  const active = state.missions.currentIndex === 0;
  const stageIndex = state.missions.stageIndex;
  const completed = state.missions.awaitingAcknowledgement;
  return {
    active,
    forecastAvailable:
      active &&
      state.lifetimeAxioms >= 3 &&
      (stageIndex >= COLD_WAKE_FOUNDRY_STAGE || completed),
    foundryCommissioned:
      active && (stageIndex > COLD_WAKE_FOUNDRY_STAGE || completed),
    arkOverviewAvailable:
      active && (stageIndex >= COLD_WAKE_NAVIGATION_STAGE || completed),
    navigationRestored:
      active && (stageIndex > COLD_WAKE_NAVIGATION_STAGE || completed),
    lifeSupportRestored:
      active && (stageIndex > COLD_WAKE_LIFE_SUPPORT_STAGE || completed),
    departureReady: active && completed,
  };
}

/** The first interplanetary route introduces weather; Nox always reveals contacts. */
export function isThreatOperationsActivated(state: GameState) {
  const hasDefenseFootprint =
    state.defense.incoming !== null ||
    state.defense.damage !== null ||
    state.defense.stats.resolved > 0 ||
    Object.values(state.defense.installations).some((level) => level > 0);
  const hasArmoryFootprint = ARMORY_ITEM_DEFINITIONS.some((item) =>
    state.armory.stock[item.id].some((count) => count > 0),
  );
  return (
    hasDefenseFootprint ||
    state.transit.active !== null ||
    getCampaignWorldIndex(state) >= 4 ||
    (getCampaignWorldIndex(state) >= 3 &&
      (state.expeditions.stats.completed >= 2 || hasArmoryFootprint))
  );
}

function defenseEnvironmentForWorldId(
  worldId: CampaignWorldId | null,
): DefenseEnvironment | null {
  if (worldId === "cinder") return "cinder-orbit";
  if (worldId === "nox") return "nox-orbit";
  if (worldId === "vesper") return "vesper-orbit";
  return null;
}

export function getDefenseEnvironment(state: GameState): DefenseEnvironment | null {
  if (state.transit.active) return "transit";
  return defenseEnvironmentForWorldId(state.settlement.currentWorldId);
}

/** A retroactive, evidence-derived archive: old saves gain classifications from work already completed. */
export function getCausalArchiveStatus(state: GameState): CausalArchiveView {
  return getCausalArchive({
    defenseFragmentIds: state.defense.causalFragmentIds,
    planetaryFragmentIds: state.planetaryDefense.causalFragmentIds,
    completedResearchIds: state.research.completedProjectIds,
    completedExpeditionIds: state.expeditions.completedSiteIds,
    completedWorldIds: state.settlement.completedWorldIds,
    firstContactResolved: state.defense.firstContactResolved,
    hostileEventsResolved: state.defense.causalFragmentIds.length,
  });
}

export function getCampaignCrewSummaries(
  state: GameState,
): CampaignCrewSummary[] {
  const trainingIds = new Set(
    state.survivors.training.map((program) => program.survivorId),
  );
  const deployedIds = getDeployedCrewIds(state.expeditions);
  const adaptingId = state.bioadaptation.active?.survivorId ?? null;
  return state.survivors.survivors.map((survivor) => {
    const rarity = getSurvivorRarity(survivor);
    const busy =
      trainingIds.has(survivor.id) ||
      deployedIds.has(survivor.id) ||
      isSurvivorAdmitted(state.survivors, survivor.id) ||
      survivor.id === adaptingId;
    return {
      id: survivor.id,
      name: survivor.callsign
        ? `${survivor.name} “${survivor.callsign}”`
        : survivor.name,
      role: survivor.role,
      roles: getQualifiedSurvivorRoles(survivor),
      expertise: getSurvivorContinuityExpertise(survivor),
      available: !busy && !isSurvivorWounded(survivor),
      // Founding a colony demands health of 80+ (E2 spec §1).
      canSettle:
        !busy &&
        !survivor.settlementProtected &&
        canSurvivorFound(survivor),
      rarity: rarity.id,
      rarityLabel: rarity.label,
      rarityDescription: rarity.description,
      ageGroup: survivor.ageGroup,
      protectedForArk: survivor.settlementProtected,
      adaptationIds: (survivor.bioadaptations ?? []).map((record) => record.id),
      level:
        survivor.role === "civilian"
          ? 0
          : getSurvivorSkillLevel(survivor, survivor.role),
    };
  });
}

function currentProgressWithResearch(state: GameState): WorldProgressSummary {
  const coldWakeLawIds = [
    "stabilize-containment-law",
    "stabilize-conservation-law",
    "stabilize-transit-law",
  ];
  return {
    ...state.worldProgress,
    completedInfrastructureIds: [
      ...new Set([
        ...state.worldProgress.completedInfrastructureIds,
        ...(state.settlement.currentWorldId === "cold-wake"
          ? coldWakeLawIds.slice(0, Math.min(3, state.lifetimeAxioms))
          : []),
      ]),
    ],
    completedResearchIds: [
      ...new Set([
        ...state.worldProgress.completedResearchIds,
        ...state.research.completedProjectIds,
      ]),
    ],
  };
}

export function getCurrentViabilityForecast(
  state: GameState,
): ViabilityForecast | null {
  const worldId = state.settlement.currentWorldId;
  if (!worldId) return null;
  const base = getViabilityForecast(
    state.settlement,
    worldId,
    getCampaignCrewSummaries(state),
    currentProgressWithResearch(state),
  );
  if (worldId !== "cold-wake") return base;

  const status = getColdWakeOnboardingStatus(state);
  const activeStage = state.missions.stageIndex;
  const approachCurrent =
    activeStage === COLD_WAKE_DEPARTURE_STAGE
      ? state.missions.contributedFlux
      : status.departureReady
        ? COLD_WAKE_APPROACH_RESERVE
        : 0;
  const commissioningLines: ForecastLine[] = [
    {
      kind: "infrastructure",
      id: "commission-foundry-deck",
      label: "Commission Foundry Deck",
      baseValue: status.foundryCommissioned ? 1 : 0,
      substitutionValue: 0,
      currentValue: status.foundryCommissioned ? 1 : 0,
      requiredValue: 1,
      met: status.foundryCommissioned,
      detail: "Wake the Ark's first independent fabrication deck.",
      contributors: [],
    },
    {
      kind: "infrastructure",
      id: "restore-navigation-control",
      label: "Restore navigation control",
      baseValue: status.navigationRestored ? 1 : 0,
      substitutionValue: 0,
      currentValue: status.navigationRestored ? 1 : 0,
      requiredValue: 1,
      met: status.navigationRestored,
      detail: "Wake guidance, braking, and the Continuity Bridge.",
      contributors: [],
    },
    {
      kind: "infrastructure",
      id: "restore-life-support-reserve",
      label: "Restore life-support reserve",
      baseValue: status.lifeSupportRestored ? 1 : 0,
      substitutionValue: 0,
      currentValue: status.lifeSupportRestored ? 1 : 0,
      requiredValue: 1,
      met: status.lifeSupportRestored,
      detail: "Warm the Ark's empty atmosphere, water, nutrition, and medical loops.",
      contributors: [],
    },
    {
      kind: "supplies",
      id: "pelagos-approach-reserve",
      label: "Commit Pelagos approach reserve",
      baseValue: approachCurrent,
      substitutionValue: 0,
      currentValue: approachCurrent,
      requiredValue: COLD_WAKE_APPROACH_RESERVE,
      met: status.departureReady,
      detail: "Reserve the final propulsion and orbital-insertion Flux.",
      contributors: [],
    },
  ];
  const visibleCommissioningLines = commissioningLines.slice(
    0,
    status.departureReady
      ? commissioningLines.length
      : Math.max(
          1,
          Math.min(
            commissioningLines.length,
            activeStage - COLD_WAKE_FOUNDRY_STAGE + 1,
          ),
        ),
  );
  const deficits: ViabilityDeficit[] = visibleCommissioningLines
    .filter((line) => !line.met)
    .map((line) => ({
      kind: line.kind,
      id: line.id,
      label: line.label,
      missing: Math.max(0, line.requiredValue - line.currentValue),
      message:
        line.id === "commission-foundry-deck"
          ? "The Foundry Deck has not completed its first independent machine run."
          : line.id === "restore-navigation-control"
            ? "The Ark cannot steer or brake as one vessel yet."
            : line.id === "restore-life-support-reserve"
              ? "The Ark cannot safely receive biological life yet."
              : "Pelagos orbital insertion has not been fully funded.",
      alternatives: [
        line.id === "commission-foundry-deck"
          ? "Authorize the Foundry wake-up, then build 25 Vacuum Taps there."
          : line.id === "restore-navigation-control"
            ? "Return to Ark Command and route Flux into navigation control."
            : line.id === "restore-life-support-reserve"
              ? "Return to Ark Command and route Flux into the life-support reserve."
              : "Open Planet and commit the remaining approach reserve. Partial payments are saved.",
      ],
    }));
  const lines = [...base.lines, ...visibleCommissioningLines];
  const score = Math.round(
    (lines.reduce(
      (total, line) => total + Math.min(1, line.currentValue / Math.max(1, line.requiredValue)),
      0,
    ) /
      Math.max(1, lines.length)) *
      100,
  );
  return {
    ...base,
    lines,
    deficits: [...base.deficits, ...deficits],
    score,
    canDepart: base.canDepart && status.departureReady,
  };
}

export function getColonyLegacyEffects(state: GameState) {
  const totals = getLegacySummary(state.settlement).totals;
  return {
    beaconSpeedMultiplier: 1 + (totals["beacon-throughput"] ?? 0),
    trainingSpeedMultiplier: 1 + (totals["training-speed"] ?? 0),
    fabricationCostMultiplier: Math.max(
      0.8,
      1 - (totals["fabrication-efficiency"] ?? 0),
    ),
    researchSpeedMultiplier: 1 + (totals["research-throughput"] ?? 0),
    cohesionProductionMultiplier: 1 + (totals.cohesion ?? 0),
    cohesionBonus: (totals.cohesion ?? 0) * 100,
    nullSignalMultiplier: 1 + (totals["null-clarity"] ?? 0),
  };
}

export function getEffectiveCohesion(state: GameState) {
  return Math.min(
    100,
    state.living.cohesion + getColonyLegacyEffects(state).cohesionBonus,
  );
}

/**
 * Planetary work is authored against the conditions of a specific world.
 * Keeping these budgets explicit prevents unrelated Ark equipment from
 * silently inheriting a campaign-wide inflation multiplier.
 */
export type WorldOperationEconomy = {
  infrastructureFlux: number;
  supplyBatchFlux: number;
  crisisFlux: number;
  equipmentFlux: number;
  rescueFlux: number;
  expeditionScale: number;
};

export const WORLD_OPERATION_ECONOMY: Readonly<
  Record<CampaignWorldId, WorldOperationEconomy>
> = {
  "cold-wake": {
    infrastructureFlux: 500,
    supplyBatchFlux: 500,
    crisisFlux: 5_000,
    equipmentFlux: 4_000,
    rescueFlux: 150,
    expeditionScale: 1,
  },
  pelagos: {
    infrastructureFlux: 50_000,
    supplyBatchFlux: 50_000,
    crisisFlux: 500_000,
    equipmentFlux: 400_000,
    rescueFlux: 15_000,
    expeditionScale: 100,
  },
  viridia: {
    infrastructureFlux: 3_000_000,
    supplyBatchFlux: 3_000_000,
    crisisFlux: 30_000_000,
    equipmentFlux: 24_000_000,
    rescueFlux: 900_000,
    expeditionScale: 6_000,
  },
  cinder: {
    infrastructureFlux: 180_000_000,
    supplyBatchFlux: 180_000_000,
    crisisFlux: 1_800_000_000,
    equipmentFlux: 1_440_000_000,
    rescueFlux: 54_000_000,
    expeditionScale: 360_000,
  },
  nox: {
    infrastructureFlux: 10_800_000_000,
    supplyBatchFlux: 10_800_000_000,
    crisisFlux: 108_000_000_000,
    equipmentFlux: 86_400_000_000,
    rescueFlux: 3_240_000_000,
    expeditionScale: 21_600_000,
  },
  vesper: {
    infrastructureFlux: 648_000_000_000,
    supplyBatchFlux: 648_000_000_000,
    crisisFlux: 6_480_000_000_000,
    equipmentFlux: 5_184_000_000_000,
    rescueFlux: 194_400_000_000,
    expeditionScale: 1_296_000_000,
  },
};

/**
 * Persistent assets keep one canonical recipe after they are unlocked.
 * Later worlds make old equipment easier to replace rather than repricing the
 * exact same object merely because the Ark moved.
 */
export const PERSISTENT_ARK_ECONOMY = {
  berthFluxBase: 60_000,
  armoryTierFlux: {
    1: 288_000_000,
    2: 51_840_000_000,
    3: 7_776_000_000_000,
  },
  defenseFluxScale: 360_000,
  automationFluxScale: 360_000,
  prostheticSurgeryFlux: 432_000_000,
  bioadaptationFluxScale: 1_296_000_000,
  planetaryDefenseFluxScale: 216_000,
} as const;

function getEconomyWorldId(
  state: GameState,
  worldId?: CampaignWorldId | null,
): CampaignWorldId {
  return (
    worldId ??
    CAMPAIGN_WORLD_IDS[getCampaignWorldIndex(state)] ??
    state.settlement.currentWorldId ??
    "cold-wake"
  );
}

export function getWorldOperationEconomy(
  state: GameState,
  worldId?: CampaignWorldId | null,
) {
  return WORLD_OPERATION_ECONOMY[getEconomyWorldId(state, worldId)];
}

export function getInfrastructureResearchMultiplier(state: GameState) {
  let reduction = 0;
  if (state.research.completedProjectIds.includes("surface-reconnaissance")) reduction += 0.03;
  if (state.research.completedProjectIds.includes("synthetic-ecosystem-design")) reduction += 0.05;
  if (state.research.completedProjectIds.includes("autonomous-repair-swarms")) reduction += 0.04;
  return Math.max(0.88, 1 - reduction);
}

export function getInfrastructureFluxCost(state: GameState) {
  return bounded(
    getWorldOperationEconomy(state).infrastructureFlux *
      getColonyLegacyEffects(state).fabricationCostMultiplier *
      getInfrastructureResearchMultiplier(state),
  );
}

export function getSupplyFabricationQuote(
  state: GameState,
  supplyId: string,
) {
  const world = state.settlement.currentWorldId
    ? getCampaignWorld(state.settlement.currentWorldId)
    : null;
  const requirement = world?.supplyRequirements.find(
    (candidate) => candidate.id === supplyId,
  );
  if (!requirement) return { cost: Number.POSITIVE_INFINITY, amount: 0 };
  return {
    cost: bounded(
      getWorldOperationEconomy(state).supplyBatchFlux *
        getColonyLegacyEffects(state).fabricationCostMultiplier,
    ),
    amount: Math.max(1, Math.ceil(requirement.amount / 5)),
  };
}

export function getCrisisFluxCost(state: GameState) {
  return bounded(getWorldOperationEconomy(state).crisisFlux);
}

export type EquipmentFabricationQuote = {
  cost: number;
  modelCost: number;
  owned: number;
  maxUnits: number;
  atLimit: boolean;
  researchId: string | null;
  researchName: string | null;
  researchMet: boolean;
};

export function getEquipmentFabricationQuote(
  state: GameState,
  equipmentId: string,
): EquipmentFabricationQuote {
  const world = state.settlement.currentWorldId
    ? getCampaignWorld(state.settlement.currentWorldId)
    : null;
  const definition = world?.equipment.find(
    (candidate) => candidate.id === equipmentId,
  );
  if (!definition || !world) {
    return {
      cost: Number.POSITIVE_INFINITY,
      modelCost: Number.POSITIVE_INFINITY,
      owned: 0,
      maxUnits: 0,
      atLimit: true,
      researchId: null,
      researchName: null,
      researchMet: false,
    };
  }
  const owned = state.worldProgress.equipment[equipmentId] ?? 0;
  const researchDefinition = getResearchProjectDefinition(
    definition.requiredResearchId as ResearchProjectId,
  );
  const researchMet = state.research.completedProjectIds.includes(
    definition.requiredResearchId as ResearchProjectId,
  );
  // World equipment is priced from the operation budget of the planet where
  // it is installed. Fabrication also consumes Engineering Models from the
  // Ark supply so the research-input economy feeds equipment.
  const cost = bounded(
    getWorldOperationEconomy(state, world.id).equipmentFlux *
      getColonyLegacyEffects(state).fabricationCostMultiplier,
  );
  return {
    cost,
    modelCost: 60 * (world.chapter + 1),
    owned,
    maxUnits: definition.maxUnits,
    atLimit: owned >= definition.maxUnits,
    researchId: definition.requiredResearchId,
    researchName:
      researchDefinition?.name ??
      definition.requiredResearchId.replaceAll("-", " "),
    researchMet,
  };
}

/**
 * Null material lies to its handlers: automating its transfer into the
 * Lattice requires a level-5 Researcher of Exceptional or better rarity.
 * Common inputs auto-transfer once the staffed Analysis Core has an on-duty
 * level-3 Researcher to supervise it.
 */
function getUnavailableResearchCrewIds(state: GameState) {
  return new Set([
    ...state.survivors.training.map((program) => program.survivorId),
    ...state.survivors.medBayIds,
    ...getDeployedCrewIds(state.expeditions),
    ...(state.bioadaptation.active ? [state.bioadaptation.active.survivorId] : []),
  ]);
}

export function getOperationalResearchExpertise(state: GameState): ResearchExpertise {
  const totals: ResearchExpertise = {
    research: 0,
    engineering: 0,
    fabrication: 0,
    medicine: 0,
    education: 0,
    field: 0,
    navigation: 0,
    ecology: 0,
  };
  const unavailable = getUnavailableResearchCrewIds(state);
  const add = (
    survivor: (typeof state.survivors.survivors)[number],
    role: Parameters<typeof getSurvivorSkillLevel>[1],
    target: keyof ResearchExpertise,
    weight = 1,
  ) => {
    if (unavailable.has(survivor.id) || !isSurvivorOnDuty(survivor, role)) return;
    totals[target] += getSurvivorSkillLevel(survivor, role) * weight;
  };
  for (const survivor of state.survivors.survivors) {
    add(survivor, "researcher", "research");
    if (
      !unavailable.has(survivor.id) &&
      isSurvivorOnDuty(survivor, "researcher")
    ) {
      totals.research += getBioadaptationEffects(survivor.bioadaptations).researchExpertise;
    }
    add(survivor, "engineer", "engineering");
    add(survivor, "technician", "engineering", 0.5);
    add(survivor, "fabricator", "fabrication");
    add(survivor, "technician", "fabrication", 0.5);
    add(survivor, "doctor", "medicine");
    add(survivor, "teacher", "education");
    add(survivor, "security", "field");
    add(survivor, "navigator", "navigation");
    add(survivor, "farmer", "ecology");
  }
  return totals;
}

export function getResearchLeadStatus(state: GameState) {
  const unavailable = getUnavailableResearchCrewIds(state);
  const lead = state.survivors.survivors
    .filter(
      (survivor) =>
        !unavailable.has(survivor.id) && isSurvivorOnDuty(survivor, "researcher"),
    )
    .sort(
      (left, right) =>
        getSurvivorSkillLevel(right, "researcher") -
        getSurvivorSkillLevel(left, "researcher"),
    )[0];
  const rarity = lead ? getSurvivorRarity(lead).id : "standard";
  return {
    level: lead ? getSurvivorSkillLevel(lead, "researcher") : 0,
    exceptional:
      Boolean(lead) && (rarity === "exceptional" || rarity === "anomalous"),
    name: lead?.callsign || lead?.name || null,
  };
}

export type ResearchFieldValidationSource = {
  id: string;
  label: string;
  detail: string;
  points: number;
};

export type ResearchFieldValidationStatus = {
  branch: ResearchBranch | null;
  points: number;
  multiplier: number;
  sources: ResearchFieldValidationSource[];
};

/**
 * Field Validation is accelerated by things the Ark has actually done. The
 * contribution is visible, branch-specific, capped at +25%, and never a hard
 * gate, so idle research remains safe while the rest of the game matters.
 */
export function getResearchFieldValidation(
  state: GameState,
): ResearchFieldValidationStatus {
  const project = state.research.activeProjectId
    ? getResearchProjectDefinition(state.research.activeProjectId)
    : null;
  const branch = project?.branch ?? null;
  const sources: ResearchFieldValidationSource[] = [];
  const add = (id: string, label: string, detail: string, points: number) => {
    const boundedPoints = Math.min(6, Math.max(0, points));
    if (boundedPoints <= 0) return;
    sources.push({ id, label, detail, points: boundedPoints });
  };
  const expeditions = state.worldProgress.expeditionsCompleted;
  const infrastructure = state.worldProgress.completedInfrastructureIds.length;
  const crises = state.worldProgress.resolvedCrisisIds.length;
  const colonies = state.settlement.colonies.length;
  const familyWitnesses = state.survivors.survivors.filter(
    (survivor) => survivor.ageGroup === "child" || survivor.ageGroup === "elder",
  ).length;
  const armoryMarks = Object.values(state.armory.marks).reduce(
    (total, mark) => total + Math.max(0, mark - 1),
    0,
  );
  const installedDefense = Object.values(state.defense.installations).reduce(
    (total, level) => total + level,
    0,
  );

  switch (branch) {
    case "ark-engineering":
      add("infrastructure", "Built infrastructure", `${infrastructure} planetary works have survived deployment.`, infrastructure * 2);
      add("habitation", "Habitation sections", `${state.survivors.berthSections} living-space sections provide full-scale load data.`, state.survivors.berthSections);
      add("armory", "Armory stress history", `${armoryMarks} frame Mark advances have produced measured failures.`, armoryMarks);
      break;
    case "human-continuity":
      add("colonies", "Living colonies", `${colonies} independent communities report outcomes to the Ark.`, colonies * 2);
      add("generations", "Generational testimony", `${familyWitnesses} children and elders preserve future and memory aboard.`, familyWitnesses * 0.75);
      add("command", "Team Alpha practice", `Command rating ${getCommandTeamStatus(state).rating} tests governance under real work.`, getCommandTeamStatus(state).rating / 20);
      break;
    case "medicine-biology":
      add("crises", "Resolved planetary crises", `${crises} planetary emergencies provide clinical comparison data.`, crises * 2);
      add("colonies", "Colony health reports", `${colonies} settlements return long-term population evidence.`, colonies * 1.5);
      add("medical", "Medical Bay practice", `${getMedBayCarePool(state.survivors)} on-duty Doctor levels support controlled validation.`, getMedBayCarePool(state.survivors) / 2);
      break;
    case "planetary-sciences":
      add("expeditions", "Surface expeditions", `${expeditions} successful field routes mapped the current world.`, expeditions * 2);
      add("infrastructure", "Planetary works", `${infrastructure} completed works test the model at settlement scale.`, infrastructure * 2);
      add("colonies", "Independent worlds", `${colonies} colonies provide long-duration telemetry.`, colonies * 2);
      break;
    case "robotics-automation":
      add("defense", "Installed automation", `${installedDefense} Defense Grid installation levels operate under real load.`, installedDefense * 0.75);
      add("armory", "Automated fixtures", `${armoryMarks} Armory Mark advances trained corrective machinery.`, armoryMarks);
      add("habitation", "Ark maintenance", `${state.survivors.berthSections} inhabited sections exercise repair logistics.`, state.survivors.berthSections);
      break;
    case "threat-operations":
      add("expeditions", "Expedition outcomes", `${state.expeditions.stats.completed} missions provide equipment and doctrine telemetry.`, state.expeditions.stats.completed * 0.75);
      add("defense", "Resolved threats", `${state.defense.stats.resolved} Defense Grid events tested standing doctrine.`, state.defense.stats.resolved * 1.5);
      add("armory", "Fielded equipment", `${armoryMarks} frame Mark advances have operational records.`, armoryMarks);
      break;
    case "null-studies":
      add("crises", "Null-touched crises", `${crises} resolved crises left comparable absences.`, crises * 1.5);
      add("observe", "Observed defense events", `${state.defense.eventLog.filter((event) => event.doctrine === "observe").length} events were instrumented rather than merely survived.`, state.defense.eventLog.filter((event) => event.doctrine === "observe").length * 2);
      add("expeditions", "Deep-field routes", `${expeditions} current-world expeditions triangulate local signals.`, expeditions);
      break;
    case "axiom-theory":
      add("axioms", "Proven Axioms", `${state.lifetimeAxioms} lifetime Axioms survived recalibration.`, state.lifetimeAxioms * 0.5);
      add("cycles", "Recalibration cycles", `${Math.max(0, state.cycle - 1)} rebuilt assemblies provide causal comparisons.`, Math.max(0, state.cycle - 1));
      add("laws", "Armory laws", `${Object.values(state.armory.laws).reduce((sum, level) => sum + level, 0)} permanent manufacturing laws are active.`, Object.values(state.armory.laws).reduce((sum, level) => sum + level, 0));
      break;
    default:
      break;
  }

  const points = Math.min(10, sources.reduce((total, source) => total + source.points, 0));
  return { branch, points, multiplier: 1 + points * 0.025, sources };
}

export type MedicalResearchEffects = {
  recoveryMultiplier: number;
  diversionPerPatient: number;
  activeProtocols: string[];
};

export function getMedicalResearchEffects(state: GameState): MedicalResearchEffects {
  const activeProtocols: string[] = [];
  let recoveryBonus = 0;
  let diversionReduction = 0;
  if (state.research.completedProjectIds.includes("clinical-commons")) {
    activeProtocols.push("Clinical Commons");
    recoveryBonus += 0.1;
  }
  if (state.research.completedProjectIds.includes("planetary-epidemiology")) {
    activeProtocols.push("Planetary Epidemiology");
    recoveryBonus += 0.1;
    diversionReduction += 0.01;
  }
  if (state.research.completedProjectIds.includes("synthetic-ecosystem-design")) {
    activeProtocols.push("Synthetic Ecosystem Design");
    recoveryBonus += 0.1;
    diversionReduction += 0.005;
  }
  return {
    recoveryMultiplier: 1 + Math.min(0.3, recoveryBonus),
    diversionPerPatient: Math.max(0.035, MED_BAY_DIVERSION_PER_PATIENT - diversionReduction),
    activeProtocols,
  };
}

export type ExpeditionResearchSupport = {
  strengthBonus: number;
  rewardMultiplier: number;
  activeProtocols: string[];
};

export function getExpeditionResearchSupport(state: GameState): ExpeditionResearchSupport {
  const activeProtocols: string[] = [];
  let strengthBonus = 0;
  let rewardBonus = 0;
  if (state.research.completedProjectIds.includes("surface-reconnaissance")) {
    activeProtocols.push("Surface Reconnaissance");
    rewardBonus += 0.05;
  }
  if (state.research.completedProjectIds.includes("defensive-forecasting")) {
    activeProtocols.push("Defensive Forecasting");
    strengthBonus += 1;
  }
  if (state.research.completedProjectIds.includes("specialized-field-loadouts")) {
    activeProtocols.push("Specialized Field Loadouts");
    strengthBonus += 1;
    rewardBonus += 0.1;
  }
  const automation = getActiveAutomationEffects(state);
  if (automation.expeditionStrengthBonus > 0) {
    activeProtocols.push("Expedition Support Drone");
    strengthBonus += automation.expeditionStrengthBonus;
    rewardBonus += automation.expeditionRewardMultiplier - 1;
  }
  const living = getLivingFoundryBonuses(state.living);
  if (living.expeditionRewardMultiplier > 1) {
    activeProtocols.push("Expedition Bay Reinforcement");
    rewardBonus += living.expeditionRewardMultiplier - 1;
  }
  return {
    strengthBonus: Math.min(3, strengthBonus),
    rewardMultiplier: 1 + Math.min(0.25, rewardBonus),
    activeProtocols,
  };
}

export function getDefenseCrewContext(state: GameState): DefenseCrewContext {
  const completed = new Set(state.research.completedProjectIds);
  const defensiveForecasting = completed.has("defensive-forecasting");
  const temporalAnalysis = completed.has("temporal-signal-analysis");
  const causalProjection = completed.has("causal-threat-projection");
  const repairSwarms = completed.has("autonomous-repair-swarms");
  const automation = getActiveAutomationEffects(state);
  const archive = getCausalArchiveStatus(state);
  const adaptingId = state.bioadaptation.active?.survivorId ?? null;
  const readyWeapons = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "weapon").reduce(
    (total, item) => total + getArmoryReadyCount(state.armory, item.id) * item.tier,
    0,
  );
  const readyArmor = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "armor").reduce(
    (total, item) => total + getArmoryReadyCount(state.armory, item.id) * item.tier,
    0,
  );
  const defenderIds = state.survivors.survivors
    .filter(
      (survivor) =>
        survivor.ageGroup === "adult" &&
        survivor.id !== adaptingId &&
        !isSurvivorWounded(survivor) &&
        !isSurvivorAdmitted(state.survivors, survivor.id) &&
        (isSurvivorOnDuty(survivor, "security") ||
          isSurvivorOnDuty(survivor, "engineer")),
    )
    .map((survivor) => survivor.id);
  const adaptedDefenders = state.survivors.survivors.filter((survivor) =>
    defenderIds.includes(survivor.id),
  );
  const adaptationReadiness = Math.min(
    8,
    adaptedDefenders.reduce(
      (total, survivor) => total + getBioadaptationEffects(survivor.bioadaptations).defenseReadiness,
      0,
    ),
  );
  const adaptationIdentification = Math.min(
    4,
    adaptedDefenders.reduce(
      (total, survivor) => total + getBioadaptationEffects(survivor.bioadaptations).threatIdentification,
      0,
    ),
  );
  const defenderInjuryMultipliers = Object.fromEntries(
    adaptedDefenders.map((survivor) => [
      survivor.id,
      survivor.bioadaptations.some((record) => record.id === "null-resistance") ? 0.9 : 1,
    ]),
  );
  return {
    security: state.survivors.survivors.reduce(
      (total, survivor) => total + (survivor.id !== adaptingId && isSurvivorOnDuty(survivor, "security") ? getSurvivorSkillLevel(survivor, "security") : 0),
      0,
    ),
    engineers: getAssignedEngineeringExpertise(state),
    navigators: state.survivors.survivors.reduce(
      (total, survivor) => total + (isSurvivorOnDuty(survivor, "navigator") ? getSurvivorSkillLevel(survivor, "navigator") : 0),
      0,
    ),
    researchReadiness:
      (defensiveForecasting ? 6 : 0) +
      (causalProjection ? 8 : 0) +
      archive.readinessBonus +
      adaptationReadiness,
    researchForecastSeconds:
      (defensiveForecasting ? 30 * 60 : 0) +
      (temporalAnalysis ? 30 * 60 : 0) +
      archive.forecastSeconds,
    researchRepairMultiplier:
      (repairSwarms ? 1.25 : 1) * automation.hullRepairMultiplier,
    interceptorReadiness: automation.interceptorReadiness,
    equipmentReadiness: Math.min(12, readyWeapons * 1.5 + readyArmor),
    injuryMitigation: Math.max(0.35, 1 - Math.min(0.65, readyArmor * 0.06)),
    injuryMultipliers: defenderInjuryMultipliers,
    eligibleDefenderIds: defenderIds,
    threatIdentification:
      (defensiveForecasting ? 1 : 0) +
      (temporalAnalysis ? 1 : 0) +
      (causalProjection ? 1 : 0) +
      archive.identificationBonus +
      adaptationIdentification,
  };
}

export function hasQualifiedNullHandler(state: GameState) {
  const unavailable = getUnavailableResearchCrewIds(state);
  return state.survivors.survivors.some((survivor) => {
    if (unavailable.has(survivor.id) || !isSurvivorOnDuty(survivor, "researcher")) return false;
    if (getSurvivorSkillLevel(survivor, "researcher") < 5) return false;
    const rarity = getSurvivorRarity(survivor).id;
    return rarity === "exceptional" || rarity === "anomalous";
  });
}

export function getAutoTransferStatus(state: GameState) {
  const staffed = state.research.assignedCrew >= 1;
  const lead = getResearchLeadStatus(state);
  return {
    common: staffed && lead.level >= 3,
    nullTraces: staffed && hasQualifiedNullHandler(state),
  };
}

function autoTransferResearchInputs(state: GameState) {
  const project = state.research.activeProjectId
    ? getResearchProjectDefinition(state.research.activeProjectId)
    : null;
  if (!project) return;
  const status = getAutoTransferStatus(state);
  if (!status.common) return;
  const projectCosts = getResearchProjectCosts(
    state.research,
    project,
    getResearchCostMultiplier(state),
  );
  const moved: Partial<ResearchInputBundle> = {};
  let any = false;
  for (const inputId of Object.keys(state.researchStock) as Array<
    keyof ResearchInputBundle
  >) {
    if ((projectCosts[inputId] ?? 0) <= 0) continue;
    if (inputId === "null-traces" && !status.nullTraces) continue;
    const shortfall = Math.max(
      0,
      (projectCosts[inputId] ?? 0) + 25 - state.research.inventory[inputId],
    );
    const amount = Math.min(state.researchStock[inputId], shortfall);
    if (amount <= 0) continue;
    moved[inputId] = amount;
    state.researchStock[inputId] -= amount;
    any = true;
  }
  if (any) {
    state.research = addResearchInputs(state.research, moved);
  }
}

export function getRescueFluxCost(state: GameState) {
  return bounded(getWorldOperationEconomy(state).rescueFlux);
}

export type ArkRescueQuote = {
  canRescue: boolean;
  salvageCost: number;
  fluxCost: number;
  reason: "transit" | "no-signal" | "roster-full" | "berths" | "life-support" | "salvage" | "flux" | null;
};

export function getArkRescueQuote(state: GameState): ArkRescueQuote {
  const readiness = getRescueReadiness(
    state.survivors,
    state.living.salvage,
    getResearchBonuses(state.research).habitationCapacityMultiplier,
  );
  const fluxCost = getRescueFluxCost(state);
  if (state.transit.active && state.survivors.activeSignal) {
    return {
      canRescue: false,
      salvageCost: readiness.cost,
      fluxCost,
      reason: "transit",
    };
  }
  if (!readiness.canRescue) {
    return {
      canRescue: false,
      salvageCost: readiness.cost,
      fluxCost,
      reason: readiness.reason,
    };
  }
  if (state.flux < fluxCost) {
    return { canRescue: false, salvageCost: readiness.cost, fluxCost, reason: "flux" };
  }
  return { canRescue: true, salvageCost: readiness.cost, fluxCost, reason: null };
}

const SIGNAL_WEAPON_BY_TIER: Record<number, ArmoryItemId> = {
  1: "kinetic-pike",
  2: "arc-carbine",
  3: "null-lance",
};
const SIGNAL_ARMOR_BY_TIER: Record<number, ArmoryItemId> = {
  1: "composite-weave",
  2: "reactive-shell",
  3: "aegis-frame",
};

export function performArkRescue(state: GameState): GameState {
  const quote = getArkRescueQuote(state);
  if (!quote.canRescue) return state;
  const cargo = state.survivors.activeSignal?.cargo ?? null;
  const result = rescueSurvivorSignal(
    state.survivors,
    state.living.salvage,
    getResearchBonuses(state.research).habitationCapacityMultiplier,
  );
  if (!result.rescued) return state;
  const next = cloneGameState(state);
  const rescued = result.survivorIds.length;
  next.survivors = result.state;
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.living.salvage = Math.max(0, next.living.salvage - result.salvageSpent);
  next.researchStock["biological-samples"] = Math.min(
    1e12,
    next.researchStock["biological-samples"] + rescued * 18,
  );
  next.researchStock["cultural-records"] = Math.min(
    1e12,
    next.researchStock["cultural-records"] + rescued * 22,
  );
  // Everything the group carried comes aboard with them. Schematics are
  // their own scarce reservoir - rescues and expeditions are its ONLY
  // sources.
  if (cargo) {
    next.researchStock["schematics"] = Math.min(
      1e12,
      next.researchStock["schematics"] + cargo.schematics,
    );
    next.researchStock["null-traces"] = Math.min(
      1e12,
      next.researchStock["null-traces"] + cargo.nullTraces,
    );
    for (const tier of cargo.weaponTiers) {
      const itemId = SIGNAL_WEAPON_BY_TIER[tier];
      if (itemId) next.armory = addArmoryItem(next.armory, itemId);
    }
    for (const tier of cargo.armorTiers) {
      const itemId = SIGNAL_ARMOR_BY_TIER[tier];
      if (itemId) next.armory = addArmoryItem(next.armory, itemId);
    }
  }
  return next;
}

/**
 * Survivor Duty: with a level-5 Navigator and a level-3 Soldier assigned to
 * their stations, rescues dispatch automatically whenever every requirement
 * (quarters, life support, Salvage, Flux) is already met.
 */
export function hasRescueDetail(state: GameState) {
  const navigator = state.survivors.survivors.some(
    (survivor) =>
      isSurvivorOnDuty(survivor, "navigator") &&
      getSurvivorSkillLevel(survivor, "navigator") >= 5,
  );
  const soldier = state.survivors.survivors.some(
    (survivor) =>
      isSurvivorOnDuty(survivor, "security") &&
      getSurvivorSkillLevel(survivor, "security") >= 3,
  );
  return navigator && soldier;
}

export type ArmoryCraftQuote = {
  itemId: ArmoryItemId;
  fluxCost: number;
  modelCost: number;
  nullTraceCost: number;
  ready: number;
  damaged: number;
  researchMet: boolean;
  canCraft: boolean;
  reason: "research" | "flux" | "models" | "traces" | null;
};

export function getArmoryCraftQuote(
  state: GameState,
  itemId: ArmoryItemId,
): ArmoryCraftQuote {
  const item = getArmoryItemDefinition(itemId);
  const fluxCost = bounded(
    PERSISTENT_ARK_ECONOMY.armoryTierFlux[item.tier] *
      getColonyLegacyEffects(state).fabricationCostMultiplier,
  );
  const researchMet = state.research.completedProjectIds.includes(
    item.requiredResearchId as ResearchProjectId,
  );
  const reason = !researchMet
    ? ("research" as const)
    : state.flux < fluxCost
      ? ("flux" as const)
      : state.researchStock["engineering-models"] < item.modelCost
        ? ("models" as const)
        : state.researchStock["null-traces"] < item.nullTraceCost
          ? ("traces" as const)
          : null;
  return {
    itemId,
    fluxCost,
    modelCost: item.modelCost,
    nullTraceCost: item.nullTraceCost,
    ready: getArmoryReadyCount(state.armory, itemId),
    damaged: getArmoryDamagedCount(state.armory, itemId),
    researchMet,
    canCraft: reason === null,
    reason,
  };
}

export function craftArmoryItem(state: GameState, itemId: ArmoryItemId) {
  const quote = getArmoryCraftQuote(state, itemId);
  if (!quote.canCraft) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.researchStock["engineering-models"] = Math.max(
    0,
    next.researchStock["engineering-models"] - quote.modelCost,
  );
  next.researchStock["null-traces"] = Math.max(
    0,
    next.researchStock["null-traces"] - quote.nullTraceCost,
  );
  next.armory = addArmoryItem(next.armory, itemId);
  return next;
}

export type ArmoryRepairQuote = {
  itemId: ArmoryItemId;
  fluxCost: number;
  damaged: number;
  canRepair: boolean;
};

export function getArmoryRepairQuote(
  state: GameState,
  itemId: ArmoryItemId,
): ArmoryRepairQuote {
  const item = getArmoryItemDefinition(itemId);
  const fluxCost = bounded(
    PERSISTENT_ARK_ECONOMY.armoryTierFlux[item.tier] *
      ARMORY_REPAIR_COST_RATIO *
      getColonyLegacyEffects(state).fabricationCostMultiplier,
  );
  const damaged = getArmoryDamagedCount(state.armory, itemId);
  return {
    itemId,
    fluxCost,
    damaged,
    canRepair: damaged > 0 && state.flux >= fluxCost,
  };
}

export function repairArmoryItem(state: GameState, itemId: ArmoryItemId) {
  const quote = getArmoryRepairQuote(state, itemId);
  if (!quote.canRepair) return state;
  const armory = repairArmoryStockItem(state.armory, itemId);
  if (armory === state.armory) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.armory = armory;
  return next;
}

const ARMORY_MARK_FLUX_MULTIPLIER: Record<ArmoryMark, number> = {
  1: 0,
  2: 4,
  3: 12,
  4: 40,
};

const ARMORY_MARK_DURATION_SECONDS: Record<ArmoryMark, number> = {
  1: 0,
  2: 30 * 60,
  3: 2 * 60 * 60,
  4: 6 * 60 * 60,
};

const getMarkResearchId = (
  kind: "weapon" | "armor",
  targetMark: ArmoryMark,
): ResearchProjectId => {
  if (targetMark === 4) return "impossible-material-synthesis";
  if (kind === "weapon")
    return targetMark === 2 ? "arc-discharge-weapons" : "null-edge-armaments";
  return targetMark === 2 ? "reactive-shell" : "aegis-frame";
};

export type ArmoryUpgradeQuote = {
  itemId: ArmoryItemId;
  currentMark: ArmoryMark;
  targetMark: ArmoryMark | null;
  fluxCost: number;
  salvageCost: number;
  schematicCost: number;
  modelCost: number;
  nullTraceCost: number;
  durationSeconds: number;
  requiredResearchId: ResearchProjectId | null;
  canStart: boolean;
  reason:
    | "maxed"
    | "project"
    | "law"
    | "research"
    | "flux"
    | "salvage"
    | "schematics"
    | "models"
    | "traces"
    | null;
};

export function getArmoryUpgradeQuote(
  state: GameState,
  itemId: ArmoryItemId,
): ArmoryUpgradeQuote {
  const item = getArmoryItemDefinition(itemId);
  const currentMark = state.armory.marks[itemId];
  const targetMark = currentMark < 4 ? ((currentMark + 1) as ArmoryMark) : null;
  if (!targetMark) {
    return { itemId, currentMark, targetMark: null, fluxCost: 0, salvageCost: 0, schematicCost: 0, modelCost: 0, nullTraceCost: 0, durationSeconds: 0, requiredResearchId: null, canStart: false, reason: "maxed" };
  }
  const patternFactor = 1 - 0.1 * state.armory.laws["standardized-patterns"];
  const forgingFactor = Math.pow(0.85, state.armory.laws["recursive-forging"]);
  const operations = getOperationalResearchExpertise(state);
  const crewFactor = 1 / (1 + Math.min(0.3, (operations.engineering + operations.fabrication) * 0.01));
  const stressFactor = Math.pow(
    0.98,
    Math.min(10, getResearchRepeatCount(state.research, "equipment-stress-tests")),
  );
  const tierFactor = 0.75 + item.tier * 0.25;
  const fluxCost = bounded(
    PERSISTENT_ARK_ECONOMY.armoryTierFlux[item.tier] *
      ARMORY_MARK_FLUX_MULTIPLIER[targetMark] *
      patternFactor,
  );
  const salvageCost = Math.ceil((targetMark === 2 ? 80 : targetMark === 3 ? 220 : 650) * item.tier * patternFactor);
  const schematicCost = Math.ceil((targetMark === 2 ? 30 : targetMark === 3 ? 80 : 200) * item.tier * patternFactor);
  const modelCost = Math.ceil(item.modelCost * (targetMark === 2 ? 2 : targetMark === 3 ? 4 : 8) * patternFactor);
  const nullTraceCost = Math.ceil((targetMark === 2 ? 0 : targetMark === 3 ? 20 : 100) * item.tier * patternFactor);
  const durationSeconds = Math.ceil(
    ARMORY_MARK_DURATION_SECONDS[targetMark] *
      tierFactor *
      forgingFactor *
      crewFactor *
      stressFactor,
  );
  const requiredResearchId = getMarkResearchId(item.kind, targetMark);
  const reason = state.armory.activeProject
    ? ("project" as const)
    : targetMark === 4 && state.armory.laws["impossible-materials"] < 1
      ? ("law" as const)
      : !state.research.completedProjectIds.includes(requiredResearchId)
        ? ("research" as const)
        : state.flux < fluxCost
          ? ("flux" as const)
          : state.living.salvage < salvageCost
            ? ("salvage" as const)
            : state.researchStock.schematics < schematicCost
              ? ("schematics" as const)
              : state.researchStock["engineering-models"] < modelCost
                ? ("models" as const)
                : state.researchStock["null-traces"] < nullTraceCost
                  ? ("traces" as const)
                  : null;
  return { itemId, currentMark, targetMark, fluxCost, salvageCost, schematicCost, modelCost, nullTraceCost, durationSeconds, requiredResearchId, canStart: reason === null, reason };
}

export function beginArmoryUpgrade(state: GameState, itemId: ArmoryItemId) {
  const quote = getArmoryUpgradeQuote(state, itemId);
  if (!quote.canStart || !quote.targetMark) return state;
  const next = cloneGameState(state);
  next.flux -= quote.fluxCost;
  next.living.salvage -= quote.salvageCost;
  next.researchStock.schematics -= quote.schematicCost;
  next.researchStock["engineering-models"] -= quote.modelCost;
  next.researchStock["null-traces"] -= quote.nullTraceCost;
  next.armory = startArmoryProject(next.armory, itemId, quote.targetMark, quote.durationSeconds);
  return next;
}

export type ArmoryModificationQuote = {
  itemId: ArmoryItemId;
  modificationId: ArmoryModificationId;
  researchMet: boolean;
  salvageCost: number;
  schematicCost: number;
  canInstall: boolean;
};

export function getArmoryModificationQuote(state: GameState, itemId: ArmoryItemId, modificationId: ArmoryModificationId): ArmoryModificationQuote {
  const definition = ARMORY_MODIFICATIONS[modificationId];
  const researchMet = state.research.completedProjectIds.includes(definition.requiredResearchId as ResearchProjectId);
  const fitted = state.armory.modifications[itemId] === modificationId;
  return { itemId, modificationId, researchMet, salvageCost: definition.salvageCost, schematicCost: definition.schematicCost, canInstall: !fitted && definition.kinds.includes(getArmoryItemDefinition(itemId).kind) && researchMet && state.living.salvage >= definition.salvageCost && state.researchStock.schematics >= definition.schematicCost };
}

export function installArmoryModification(state: GameState, itemId: ArmoryItemId, modificationId: ArmoryModificationId | null) {
  if (modificationId === null) {
    if (!state.armory.modifications[itemId]) return state;
    const next = cloneGameState(state);
    next.armory = setArmoryStateModification(next.armory, itemId, null);
    return next;
  }
  const quote = getArmoryModificationQuote(state, itemId, modificationId);
  if (!quote.canInstall) return state;
  const next = cloneGameState(state);
  next.living.salvage -= quote.salvageCost;
  next.researchStock.schematics -= quote.schematicCost;
  next.armory = setArmoryStateModification(next.armory, itemId, modificationId);
  return next;
}

export function getArmoryLawQuote(state: GameState, lawId: ArmoryLawId) {
  const definition = ARMORY_LAWS[lawId];
  const level = state.armory.laws[lawId];
  const maxed = level >= definition.maxLevel;
  const cost = maxed ? 0 : Math.ceil(definition.baseCost * Math.pow(2, level));
  const researchMet = state.research.completedProjectIds.includes(
    definition.requiredResearchId as ResearchProjectId,
  );
  return {
    lawId,
    level,
    maxed,
    cost,
    researchMet,
    researchName:
      getResearchProjectDefinition(definition.requiredResearchId as ResearchProjectId)?.name ??
      definition.requiredResearchId.replaceAll("-", " "),
    canBuy: !maxed && researchMet && state.axioms >= cost,
  };
}

export function purchaseArmoryLaw(state: GameState, lawId: ArmoryLawId) {
  const quote = getArmoryLawQuote(state, lawId);
  if (!quote.canBuy) return state;
  const next = cloneGameState(state);
  next.axioms -= quote.cost;
  next.armory = buyArmoryStateLaw(next.armory, lawId);
  return next;
}

const PROFILE_ELEVATION_STEPS = {
  notable: {
    from: "standard",
    researchId: "human-potential-mapping",
    levelRequired: 3,
    axiomCost: 1,
    culturalCost: 100,
    proofCost: 0,
    nullCost: 0,
  },
  exceptional: {
    from: "notable",
    researchId: "continuity-scaffolding",
    levelRequired: 6,
    axiomCost: 3,
    culturalCost: 300,
    proofCost: 10,
    nullCost: 0,
  },
  anomalous: {
    from: "exceptional",
    researchId: "axiomatic-identity-preservation",
    levelRequired: 9,
    axiomCost: 8,
    culturalCost: 1_000,
    proofCost: 40,
    nullCost: 50,
  },
} as const;

export type ProfileElevationQuote = {
  survivorId: string;
  currentRarity: SurvivorRarityId;
  targetRarity: Exclude<SurvivorRarityId, "standard"> | null;
  researchName: string | null;
  levelRequired: number;
  masteryLevel: number;
  axiomCost: number;
  culturalCost: number;
  proofCost: number;
  nullCost: number;
  canElevate: boolean;
  reason: "missing" | "child" | "maximum" | "research" | "mastery" | "resources" | null;
};

export function getProfileElevationQuote(
  state: GameState,
  survivorId: string,
): ProfileElevationQuote {
  const survivor = state.survivors.survivors.find((candidate) => candidate.id === survivorId);
  const missing = (reason: ProfileElevationQuote["reason"]): ProfileElevationQuote => ({
    survivorId,
    currentRarity: survivor ? getSurvivorRarity(survivor).id : "standard",
    targetRarity: null,
    researchName: null,
    levelRequired: 0,
    masteryLevel: survivor ? getSurvivorBestSkillLevel(survivor) : 0,
    axiomCost: 0,
    culturalCost: 0,
    proofCost: 0,
    nullCost: 0,
    canElevate: false,
    reason,
  });
  if (!survivor) return missing("missing");
  if (survivor.ageGroup === "child") return missing("child");
  const currentRarity = getSurvivorRarity(survivor).id;
  const targetRarity =
    currentRarity === "standard"
      ? "notable"
      : currentRarity === "notable"
        ? "exceptional"
        : currentRarity === "exceptional"
          ? "anomalous"
          : null;
  if (!targetRarity) return missing("maximum");
  const step = PROFILE_ELEVATION_STEPS[targetRarity];
  const research = getResearchProjectDefinition(step.researchId);
  const researchMet = state.research.completedProjectIds.includes(step.researchId);
  const masteryLevel = getSurvivorBestSkillLevel(survivor);
  const resourcesMet =
    state.axioms >= step.axiomCost &&
    state.researchStock["cultural-records"] >= step.culturalCost &&
    state.researchStock["axiom-proofs"] >= step.proofCost &&
    state.researchStock["null-traces"] >= step.nullCost;
  const reason = !researchMet
    ? "research"
    : masteryLevel < step.levelRequired
      ? "mastery"
      : !resourcesMet
        ? "resources"
        : null;
  return {
    survivorId,
    currentRarity,
    targetRarity,
    researchName: research?.name ?? step.researchId.replaceAll("-", " "),
    levelRequired: step.levelRequired,
    masteryLevel,
    axiomCost: step.axiomCost,
    culturalCost: step.culturalCost,
    proofCost: step.proofCost,
    nullCost: step.nullCost,
    canElevate: reason === null,
    reason,
  };
}

export function elevateCrewProfile(state: GameState, survivorId: string) {
  const quote = getProfileElevationQuote(state, survivorId);
  if (!quote.canElevate || !quote.targetRarity) return state;
  const next = cloneGameState(state);
  next.axioms -= quote.axiomCost;
  next.researchStock["cultural-records"] -= quote.culturalCost;
  next.researchStock["axiom-proofs"] -= quote.proofCost;
  next.researchStock["null-traces"] -= quote.nullCost;
  next.survivors = elevateSurvivorProfile(
    next.survivors,
    survivorId,
    quote.targetRarity,
  );
  return next;
}

export type BioadaptationQuote = {
  adaptationId: BioadaptationId;
  canBegin: boolean;
  reason:
    | "missing-crew"
    | "child"
    | "charter"
    | "research"
    | "already-adapted"
    | "limit"
    | "clinic-busy"
    | "crew-busy"
    | "crew-wounded"
    | "resources"
    | null;
  fluxCost: number;
  axiomCost: number;
  biologicalSampleCost: number;
  culturalRecordCost: number;
  nullTraceCost: number;
  engineeringModelCost: number;
  durationSeconds: number;
};

export function getBioadaptationQuote(
  state: GameState,
  survivorId: string,
  adaptationId: BioadaptationId,
): BioadaptationQuote {
  const definition = getBioadaptationDefinition(adaptationId);
  const materialMultiplier = 1 + Math.max(0, getCampaignWorldIndex(state) - 3) * 0.2;
  const quote = {
    adaptationId,
    fluxCost: bounded(
      definition.cost.flux *
        PERSISTENT_ARK_ECONOMY.bioadaptationFluxScale *
        getColonyLegacyEffects(state).fabricationCostMultiplier,
    ),
    axiomCost: definition.cost.axioms,
    biologicalSampleCost: Math.ceil(definition.cost.biologicalSamples * materialMultiplier),
    culturalRecordCost: Math.ceil(definition.cost.culturalRecords * materialMultiplier),
    nullTraceCost: Math.ceil(definition.cost.nullTraces * materialMultiplier),
    engineeringModelCost: Math.ceil(definition.cost.engineeringModels * materialMultiplier),
    durationSeconds: definition.baseDurationSeconds,
  };
  const survivor = state.survivors.survivors.find((candidate) => candidate.id === survivorId);
  let reason: BioadaptationQuote["reason"] = null;
  if (!survivor) reason = "missing-crew";
  else if (!state.research.completedProjectIds.includes("voluntary-adaptation-charter")) reason = "charter";
  else if (survivor.ageGroup === "child") reason = "child";
  else if (!state.research.completedProjectIds.includes(definition.requiredResearchId as ResearchProjectId)) reason = "research";
  else if (survivor.bioadaptations.some((record) => record.id === adaptationId)) reason = "already-adapted";
  else if (survivor.bioadaptations.length >= MAX_BIOADAPTATIONS_PER_SURVIVOR) reason = "limit";
  else if (state.bioadaptation.active) reason = "clinic-busy";
  else if (
    state.survivors.training.some((program) => program.survivorId === survivorId) ||
    isSurvivorAdmitted(state.survivors, survivorId) ||
    getDeployedCrewIds(state.expeditions).has(survivorId)
  ) reason = "crew-busy";
  else if (isSurvivorWounded(survivor)) reason = "crew-wounded";
  else if (
    state.flux < quote.fluxCost ||
    state.axioms < quote.axiomCost ||
    state.researchStock["biological-samples"] < quote.biologicalSampleCost ||
    state.researchStock["cultural-records"] < quote.culturalRecordCost ||
    state.researchStock["null-traces"] < quote.nullTraceCost ||
    state.researchStock["engineering-models"] < quote.engineeringModelCost
  ) reason = "resources";
  return { ...quote, canBegin: reason === null, reason };
}

export function startBioadaptation(
  state: GameState,
  survivorId: string,
  adaptationId: BioadaptationId,
): GameState {
  const quote = getBioadaptationQuote(state, survivorId, adaptationId);
  if (!quote.canBegin) return state;
  const next = cloneGameState(state);
  next.flux -= quote.fluxCost;
  next.axioms -= quote.axiomCost;
  next.researchStock["biological-samples"] -= quote.biologicalSampleCost;
  next.researchStock["cultural-records"] -= quote.culturalRecordCost;
  next.researchStock["null-traces"] -= quote.nullTraceCost;
  next.researchStock["engineering-models"] -= quote.engineeringModelCost;
  next.bioadaptation = beginBioadaptationProcedure(
    next.bioadaptation,
    survivorId,
    adaptationId,
    next.survivors.operationalSeconds,
  );
  const survivor = next.survivors.survivors.find((candidate) => candidate.id === survivorId)!;
  survivor.assignedRole = null;
  return next;
}

function getExpeditionBioadaptationSupport(
  crew: readonly Survivor[],
) {
  let strengthBonus = 0;
  let durationMultiplier = 1;
  const injuryMultipliers: Record<string, number> = {};
  for (const survivor of crew) {
    const effects = getBioadaptationEffects(survivor.bioadaptations);
    strengthBonus += effects.expeditionStrength;
    durationMultiplier *= effects.expeditionDurationMultiplier;
    injuryMultipliers[survivor.id] = effects.injuryMultiplier;
  }
  return {
    strengthBonus: Math.min(8, strengthBonus),
    durationMultiplier: Math.max(0.85, durationMultiplier),
    injuryMultipliers,
  };
}

export type ExpeditionLaunchQuote = {
  fluxCost: number;
  canLaunch: boolean;
  reason:
    | "unavailable"
    | "transit"
    | "busy"
    | "crew-count"
    | "crew-unavailable"
    | "crew-wounded"
    | "preparation"
    | "flux"
    | null;
  /** Base crew strength + weapon bonus, vs the site difficulty. */
  strength: number;
  gearStrength: number;
  researchStrengthBonus: number;
  researchRewardMultiplier: number;
  bioadaptationStrengthBonus: number;
  bioadaptationDurationMultiplier: number;
  difficulty: number;
  /** Always projected before launch - the player is never ambushed. */
  projectedOutcome: ExpeditionOutcome | null;
  loadout: ExpeditionLoadoutEntry[];
  preparations: ExpeditionPreparationStatus[];
};

export type ExpeditionPreparationStatus = {
  id: string;
  label: string;
  detail: string;
  required: boolean;
  met: boolean;
};

function expeditionPreparationOptionMet(
  state: GameState,
  crew: readonly Survivor[],
  loadout: readonly ExpeditionLoadoutEntry[],
  option: ExpeditionPreparationOption,
) {
  if (option.kind === "research") {
    return state.research.completedProjectIds.includes(
      option.id as ResearchProjectId,
    );
  }
  if (option.kind === "weapons") {
    return loadout.filter((entry) => entry.weaponId !== null).length >= option.count;
  }
  if (option.kind === "armor") {
    return loadout.filter((entry) => entry.armorId !== null).length >= option.count;
  }
  if (option.kind === "role") {
    return (
      crew.filter(
        (survivor) =>
          getSurvivorSkillLevel(survivor, option.role) >= option.level,
      ).length >= (option.count ?? 1)
    );
  }
  if (option.kind === "completed-expedition") {
    return (
      state.worldProgress.completedExpeditionIds.includes(option.id) ||
      state.expeditions.completedSiteIds.includes(option.id)
    );
  }
  if (option.kind === "automation") {
    const programId = option.id as AutomationProgramId;
    return (state.automation.allocations[programId] ?? 0) >= option.count;
  }
  return (
    crew.filter((survivor) =>
      (survivor.bioadaptations ?? []).some((record) => record.id === option.id),
    ).length >= option.count
  );
}

export function getExpeditionPreparationStatus(
  state: GameState,
  site: ExpeditionSiteDefinition,
  crew: readonly Survivor[],
  loadout: readonly ExpeditionLoadoutEntry[],
): ExpeditionPreparationStatus[] {
  return site.preparations.map((preparation) => ({
    id: preparation.id,
    label: preparation.label,
    detail: preparation.detail,
    required: preparation.required,
    met: preparation.options.some((option) =>
      expeditionPreparationOptionMet(state, crew, loadout, option),
    ),
  }));
}

export function getExpeditionLaunchQuote(
  state: GameState,
  siteId: ExpeditionSiteId,
  crewIds: readonly string[],
): ExpeditionLaunchQuote {
  const site = getExpeditionSite(siteId);
  const fluxCost = bounded(
    site.fluxCostBase *
      getWorldOperationEconomy(state, site.worldId).expeditionScale,
  );
  const researchSupport = getExpeditionResearchSupport(state);
  const blocked = (reason: ExpeditionLaunchQuote["reason"]) => ({
    fluxCost,
    canLaunch: false,
    reason,
    strength: 0,
    gearStrength: 0,
    researchStrengthBonus: researchSupport.strengthBonus,
    researchRewardMultiplier: researchSupport.rewardMultiplier,
    bioadaptationStrengthBonus: 0,
    bioadaptationDurationMultiplier: 1,
    difficulty: site.difficulty,
    projectedOutcome: null,
    loadout: [],
    preparations: site.preparations.map((preparation) => ({
      id: preparation.id,
      label: preparation.label,
      detail: preparation.detail,
      required: preparation.required,
      met: false,
    })),
  });
  if (state.transit.active) return blocked("transit");
  const availability = getExpeditionAvailability(
    state.expeditions,
    state.settlement.currentWorldId,
    state.settlement.currentWorldId === null && !state.transit.active,
  ).find((entry) => entry.site.id === siteId);
  if (!availability?.available) {
    return blocked(availability?.reason === "busy" ? "busy" : "unavailable");
  }
  const unique = [...new Set(crewIds)];
  if (unique.length < MIN_EXPEDITION_CREW || unique.length > MAX_EXPEDITION_CREW) {
    return blocked("crew-count");
  }
  const trainingIds = new Set(
    state.survivors.training.map((program) => program.survivorId),
  );
  const crew = unique.map((id) =>
    state.survivors.survivors.find((survivor) => survivor.id === id),
  );
  if (
    crew.some(
      (member) =>
        !member ||
        member.ageGroup === "child" ||
        trainingIds.has(member.id) ||
        state.bioadaptation.active?.survivorId === member.id ||
        isSurvivorAdmitted(state.survivors, member.id),
    )
  ) {
    return blocked("crew-unavailable");
  }
  const roster = crew as NonNullable<(typeof crew)[number]>[];
  if (roster.some((member) => isSurvivorWounded(member))) {
    return blocked("crew-wounded");
  }
  const plan = planExpeditionLoadout(state.armory, roster);
  const bioadaptationSupport = getExpeditionBioadaptationSupport(roster);
  const strength =
    getExpeditionGroupStrength(roster) +
    getLoadoutStrengthBonus(plan.loadout) +
    researchSupport.strengthBonus +
    bioadaptationSupport.strengthBonus;
  const preparations = getExpeditionPreparationStatus(
    state,
    site,
    roster,
    plan.loadout,
  );
  if (preparations.some((preparation) => preparation.required && !preparation.met)) {
    return {
      ...blocked("preparation"),
      strength,
      gearStrength: plan.strengthBonus,
      researchStrengthBonus: researchSupport.strengthBonus,
      researchRewardMultiplier: researchSupport.rewardMultiplier,
      bioadaptationStrengthBonus: bioadaptationSupport.strengthBonus,
      bioadaptationDurationMultiplier: bioadaptationSupport.durationMultiplier,
      projectedOutcome: getProjectedExpeditionOutcome(strength, site.difficulty),
      loadout: plan.loadout,
      preparations,
    };
  }
  if (state.flux < fluxCost) {
    return {
      ...blocked("flux"),
      strength,
      gearStrength: plan.strengthBonus,
      researchStrengthBonus: researchSupport.strengthBonus,
      researchRewardMultiplier: researchSupport.rewardMultiplier,
      bioadaptationStrengthBonus: bioadaptationSupport.strengthBonus,
      bioadaptationDurationMultiplier: bioadaptationSupport.durationMultiplier,
      projectedOutcome: getProjectedExpeditionOutcome(strength, site.difficulty),
      loadout: plan.loadout,
      preparations,
    };
  }
  return {
    fluxCost,
    canLaunch: true,
    reason: null,
    strength,
    gearStrength: plan.strengthBonus,
    researchStrengthBonus: researchSupport.strengthBonus,
    researchRewardMultiplier: researchSupport.rewardMultiplier,
    bioadaptationStrengthBonus: bioadaptationSupport.strengthBonus,
    bioadaptationDurationMultiplier: bioadaptationSupport.durationMultiplier,
    difficulty: site.difficulty,
    projectedOutcome: getProjectedExpeditionOutcome(strength, site.difficulty),
    loadout: plan.loadout,
    preparations,
  };
}

export function startExpedition(
  state: GameState,
  siteId: ExpeditionSiteId,
  crewIds: readonly string[],
): GameState {
  const quote = getExpeditionLaunchQuote(state, siteId, crewIds);
  if (!quote.canLaunch) return state;
  const unique = [...new Set(crewIds)];
  const crew = unique.map(
    (id) => state.survivors.survivors.find((survivor) => survivor.id === id)!,
  );
  // Auto-equip: check the planned loadout out of the armory for the trip.
  const plan = planExpeditionLoadout(state.armory, crew);
  const researchSupport = getExpeditionResearchSupport(state);
  const bioadaptationSupport = getExpeditionBioadaptationSupport(crew);
  const expeditions = launchExpedition(
    state.expeditions,
    getExpeditionSite(siteId),
    crew,
    state.settlement.currentWorldId,
    plan.loadout,
    researchSupport.strengthBonus,
    bioadaptationSupport,
  );
  if (expeditions === state.expeditions) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.expeditions = expeditions;
  next.armory = plan.state;
  // deployed crew stand down from their stations for the duration
  for (const survivor of next.survivors.survivors) {
    if (unique.includes(survivor.id)) {
      survivor.assignedRole = null;
    }
  }
  return next;
}

// Surface Recon: every completed expedition on the current world charts it,
// cutting SOS scan time toward the floor (survivor-engine MIN_SCAN_MULTIPLIER).
export const RECON_SCAN_REDUCTION_PER_EXPEDITION = 0.1;

export function getSurfaceRecon(state: GameState) {
  const expeditions = state.worldProgress.expeditionsCompleted;
  const multiplier = Math.max(
    1 / 3,
    1 - RECON_SCAN_REDUCTION_PER_EXPEDITION * expeditions,
  );
  return { expeditions, multiplier };
}

// Team Alpha: the command rating (summed continuity expertise of on-duty
// team members) becomes a bounded crew-wide training/XP multiplier.
export const COMMAND_RATING_DIVISOR = 150;
export const COMMAND_MULTIPLIER_CAP = 0.35;

export type CommandTeamStatus = {
  leader: ReturnType<typeof getSurvivorById>;
  members: NonNullable<ReturnType<typeof getSurvivorById>>[];
  /** Sum of on-duty team members' continuity expertise. */
  rating: number;
  /** Applied to crew-wide training speed and on-job XP. */
  multiplier: number;
  doctrine: ReturnType<typeof getTrainingDoctrine>;
};

const getSurvivorById = (state: GameState, survivorId: string | null) =>
  survivorId
    ? state.survivors.survivors.find((survivor) => survivor.id === survivorId) ??
      null
    : null;

const getTrainingDoctrine = (state: GameState) =>
  state.survivors.trainingDoctrine;

export function getCommandTeamStatus(state: GameState): CommandTeamStatus {
  const away = getDeployedCrewIds(state.expeditions);
  const leader = getSurvivorById(state, state.survivors.commandTeam.leaderId);
  const members = state.survivors.commandTeam.memberIds
    .map((id) => getSurvivorById(state, id))
    .filter((survivor): survivor is NonNullable<typeof survivor> =>
      Boolean(survivor),
    );
  const contributors = [leader, ...members].filter(
    (survivor): survivor is NonNullable<typeof survivor> =>
      Boolean(survivor) &&
      !isSurvivorWounded(survivor!) &&
      !away.has(survivor!.id) &&
      survivor!.id !== state.bioadaptation.active?.survivorId &&
      !isSurvivorAdmitted(state.survivors, survivor!.id),
  );
  const rating = contributors.reduce(
    (total, survivor) =>
      total +
      Object.values(getSurvivorContinuityExpertise(survivor)).reduce(
        (sum, value) => sum + value,
        0,
      ),
    0,
  );
  return {
    leader,
    members,
    rating,
    multiplier:
      1 + Math.min(COMMAND_MULTIPLIER_CAP, rating / COMMAND_RATING_DIVISOR),
    doctrine: getTrainingDoctrine(state),
  };
}

export function setCommandLeader(state: GameState, survivorId: string | null) {
  const survivors = appointCommandLeader(state.survivors, survivorId);
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.survivors = survivors;
  return next;
}

export function toggleTeamAlphaMember(state: GameState, survivorId: string) {
  const survivors = toggleCommandTeamMember(state.survivors, survivorId);
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.survivors = survivors;
  return next;
}

export function assignTeamAlphaMember(
  state: GameState,
  slotIndex: number,
  survivorId: string | null,
) {
  const survivors = setCommandTeamMemberState(
    state.survivors,
    slotIndex,
    survivorId,
  );
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.survivors = survivors;
  return next;
}

export function chooseTrainingDoctrine(
  state: GameState,
  doctrine: Parameters<typeof setTrainingDoctrine>[1],
) {
  const survivors = setTrainingDoctrine(state.survivors, doctrine);
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.survivors = survivors;
  return next;
}

// Medical Bay: each occupied bed diverts a share of ALL Flux production to
// life support - a percentage, so it matters at every stage of the game.
export const MED_BAY_DIVERSION_PER_PATIENT = 0.05;
export const MED_BAY_DIVERSION_CAP = 0.4;

export function getMedBayDiversion(state: GameState) {
  const perPatient = getMedicalResearchEffects(state).diversionPerPatient;
  return Math.min(
    MED_BAY_DIVERSION_CAP,
    state.survivors.medBayIds.length * perPatient,
  );
}

export type MedBayStatus = {
  patientIds: readonly string[];
  carePool: number;
  recoveryPerHour: number;
  diversionPercent: number;
  diversionPerPatientPercent: number;
  researchBonusPercent: number;
  activeProtocols: readonly string[];
};

export function getMedBayStatus(state: GameState): MedBayStatus {
  const research = getMedicalResearchEffects(state);
  const medicalOverCapacity =
    getLifeSupportStatus(
      state.survivors,
      [],
      getResearchBonuses(state.research).habitationCapacityMultiplier,
    ).shortages.medical > 0;
  return {
    patientIds: state.survivors.medBayIds,
    carePool: getMedBayCarePool(state.survivors),
    recoveryPerHour: getMedBayRecoveryPerHour(
      state.survivors,
      medicalOverCapacity,
      research.recoveryMultiplier,
    ),
    diversionPercent: Math.round(getMedBayDiversion(state) * 100),
    diversionPerPatientPercent: research.diversionPerPatient * 100,
    researchBonusPercent: Math.round((research.recoveryMultiplier - 1) * 100),
    activeProtocols: research.activeProtocols,
  };
}

export function admitCrewToMedBay(state: GameState, survivorId: string) {
  const survivors = admitToMedBay(
    state.survivors,
    survivorId,
    getDeployedCrewIds(state.expeditions),
  );
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.survivors = survivors;
  return next;
}

export function dischargeCrewFromMedBay(state: GameState, survivorId: string) {
  const survivors = dischargeFromMedBay(state.survivors, survivorId);
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.survivors = survivors;
  return next;
}

export const PROSTHETIC_SURGEON_LEVEL = 5;
export const PROSTHETIC_SURGERY_MODEL_COST = 30;
export const PROSTHETIC_SURGERY_SAMPLE_COST = 20;

export type ProstheticSurgeryQuote = {
  fluxCost: number;
  modelCost: number;
  sampleCost: number;
  researchMet: boolean;
  hasSurgeon: boolean;
  medicalReady: boolean;
  canOperate: boolean;
  reason:
    | "research"
    | "no-injury"
    | "unavailable"
    | "not-admitted"
    | "surgeon"
    | "medical"
    | "flux"
    | "models"
    | "samples"
    | null;
};

/**
 * Prosthetic Surgery removes a permanent injury: it needs the Prosthetic
 * Fabrication research, a level-5 Doctor on duty (other than the patient),
 * and a medical envelope that is not over capacity.
 */
export function getProstheticSurgeryQuote(
  state: GameState,
  survivorId: string,
): ProstheticSurgeryQuote {
  const fluxCost = bounded(PERSISTENT_ARK_ECONOMY.prostheticSurgeryFlux);
  const researchMet =
    state.research.completedProjectIds.includes("prosthetic-fabrication");
  const patient = state.survivors.survivors.find(
    (survivor) => survivor.id === survivorId,
  );
  const surgeon = state.survivors.survivors.some(
    (survivor) =>
      survivor.id !== survivorId &&
      isSurvivorOnDuty(survivor, "doctor") &&
      getSurvivorSkillLevel(survivor, "doctor") >= PROSTHETIC_SURGEON_LEVEL,
  );
  const medicalReady =
    getLifeSupportStatus(
      state.survivors,
      [],
      getResearchBonuses(state.research).habitationCapacityMultiplier,
    ).shortages.medical <= 0;
  const reason = !researchMet
    ? ("research" as const)
    : !patient?.injury
      ? ("no-injury" as const)
      : getDeployedCrewIds(state.expeditions).has(survivorId)
        ? ("unavailable" as const)
        : !isSurvivorAdmitted(state.survivors, survivorId)
          ? ("not-admitted" as const)
          : !surgeon
            ? ("surgeon" as const)
            : !medicalReady
              ? ("medical" as const)
              : state.flux < fluxCost
                ? ("flux" as const)
                : state.researchStock["engineering-models"] <
                    PROSTHETIC_SURGERY_MODEL_COST
                  ? ("models" as const)
                  : state.researchStock["biological-samples"] <
                      PROSTHETIC_SURGERY_SAMPLE_COST
                    ? ("samples" as const)
                    : null;
  return {
    fluxCost,
    modelCost: PROSTHETIC_SURGERY_MODEL_COST,
    sampleCost: PROSTHETIC_SURGERY_SAMPLE_COST,
    researchMet,
    hasSurgeon: surgeon,
    medicalReady,
    canOperate: reason === null,
    reason,
  };
}

export function performProstheticSurgery(
  state: GameState,
  survivorId: string,
): GameState {
  const quote = getProstheticSurgeryQuote(state, survivorId);
  if (!quote.canOperate) return state;
  const next = cloneGameState(state);
  const patient = next.survivors.survivors.find(
    (survivor) => survivor.id === survivorId,
  )!;
  patient.injury = null;
  patient.health = Math.max(patient.health, 50);
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.researchStock["engineering-models"] = Math.max(
    0,
    next.researchStock["engineering-models"] - quote.modelCost,
  );
  next.researchStock["biological-samples"] = Math.max(
    0,
    next.researchStock["biological-samples"] - quote.sampleCost,
  );
  return next;
}

export type RescueMissionQuote = {
  fluxCost: number;
  canLaunch: boolean;
  reason:
    | "transit"
    | "no-stranded"
    | "busy"
    | "crew-count"
    | "crew-unavailable"
    | "crew-wounded"
    | "flux"
    | null;
  strength: number;
  gearStrength: number;
  rescueDifficulty: number;
  /** Clean extractions bring everyone home unharmed; hard ones wound rescuers. */
  projectedExtraction: "clean" | "hard" | null;
  loadout: ExpeditionLoadoutEntry[];
};

export function getRescueMissionQuote(
  state: GameState,
  crewIds: readonly string[],
): RescueMissionQuote {
  const stranded = state.expeditions.stranded;
  const site = stranded ? getExpeditionSite(stranded.siteId) : null;
  const fluxCost = site
    ? bounded(
        site.fluxCostBase *
          RESCUE_FLUX_RATIO *
          getWorldOperationEconomy(state, site.worldId).expeditionScale,
      )
    : 0;
  const rescueDifficulty = site
    ? Math.max(1, site.difficulty - RESCUE_DIFFICULTY_RELIEF)
    : 0;
  const blocked = (reason: RescueMissionQuote["reason"]) => ({
    fluxCost,
    canLaunch: false,
    reason,
    strength: 0,
    gearStrength: 0,
    rescueDifficulty,
    projectedExtraction: null,
    loadout: [],
  });
  if (!stranded || !site) return blocked("no-stranded");
  if (state.transit.active) return blocked("transit");
  if (state.expeditions.active) return blocked("busy");
  const unique = [...new Set(crewIds)];
  if (unique.length < MIN_EXPEDITION_CREW || unique.length > MAX_EXPEDITION_CREW) {
    return blocked("crew-count");
  }
  const trainingIds = new Set(
    state.survivors.training.map((program) => program.survivorId),
  );
  const strandedIds = new Set(stranded.crewIds);
  const crew = unique.map((id) =>
    state.survivors.survivors.find((survivor) => survivor.id === id),
  );
  if (
    crew.some(
      (member) =>
        !member ||
        member.ageGroup === "child" ||
        trainingIds.has(member.id) ||
        strandedIds.has(member.id) ||
        state.bioadaptation.active?.survivorId === member.id ||
        isSurvivorAdmitted(state.survivors, member.id),
    )
  ) {
    return blocked("crew-unavailable");
  }
  const roster = crew as NonNullable<(typeof crew)[number]>[];
  if (roster.some((member) => isSurvivorWounded(member))) {
    return blocked("crew-wounded");
  }
  const plan = planExpeditionLoadout(state.armory, roster);
  const bioadaptationSupport = getExpeditionBioadaptationSupport(roster);
  const strength =
    getExpeditionGroupStrength(roster) +
    getLoadoutStrengthBonus(plan.loadout) +
    bioadaptationSupport.strengthBonus;
  const projectedExtraction = strength >= rescueDifficulty ? "clean" : "hard";
  if (state.flux < fluxCost) {
    return {
      ...blocked("flux"),
      strength,
      gearStrength: plan.strengthBonus,
      projectedExtraction,
      loadout: plan.loadout,
    };
  }
  return {
    fluxCost,
    canLaunch: true,
    reason: null,
    strength,
    gearStrength: plan.strengthBonus,
    rescueDifficulty,
    projectedExtraction,
    loadout: plan.loadout,
  };
}

export function startRescueMission(
  state: GameState,
  crewIds: readonly string[],
): GameState {
  const quote = getRescueMissionQuote(state, crewIds);
  if (!quote.canLaunch) return state;
  const unique = [...new Set(crewIds)];
  const crew = unique.map(
    (id) => state.survivors.survivors.find((survivor) => survivor.id === id)!,
  );
  const plan = planExpeditionLoadout(state.armory, crew);
  const expeditions = launchRescueMission(
    state.expeditions,
    crew,
    plan.loadout,
    getExpeditionBioadaptationSupport(crew),
  );
  if (expeditions === state.expeditions) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.expeditions = expeditions;
  next.armory = plan.state;
  for (const survivor of next.survivors.survivors) {
    if (unique.includes(survivor.id)) {
      survivor.assignedRole = null;
    }
  }
  return next;
}

/**
 * The only death in the game. Removes the stranded party permanently and
 * records them in the memorial ledger; their gear is lost with them. Never
 * called automatically - the UI requires an explicit double confirm.
 */
export function abandonStrandedCrew(state: GameState): GameState {
  const stranded = state.expeditions.stranded;
  if (!stranded) return state;
  const next = cloneGameState(state);
  const records: MemorialRecord[] = stranded.crewIds.map((crewId) => {
    const survivor = next.survivors.survivors.find(
      (candidate) => candidate.id === crewId,
    );
    return {
      crewId,
      name: survivor
        ? survivor.callsign
          ? `${survivor.name} “${survivor.callsign}”`
          : survivor.name
        : "Unknown crew",
      professions: survivor ? [...getQualifiedSurvivorRoles(survivor)] : [],
      siteId: stranded.siteId,
      worldId: stranded.worldId,
      abandonedAtSeconds: next.expeditions.clockSeconds,
    };
  });
  next.expeditions = abandonStrandedParty(next.expeditions, records);
  next.survivors = transferSurvivorsToSettlement(next.survivors, stranded.crewIds);
  return next;
}

export function getAssignedEngineerCount(state: GameState) {
  return state.survivors.survivors.filter((survivor) =>
    survivor.id !== state.bioadaptation.active?.survivorId &&
    isSurvivorOnDuty(survivor, "engineer"),
  ).length;
}

export function getAssignedEngineeringExpertise(state: GameState) {
  return state.survivors.survivors.reduce(
    (total, survivor) =>
      total +
      (survivor.id !== state.bioadaptation.active?.survivorId &&
      isSurvivorOnDuty(survivor, "engineer")
        ? getSurvivorSkillLevel(survivor, "engineer")
        : 0),
    0,
  );
}

export function getBerthConstructionSpeed(state: GameState) {
  return Math.min(5, 1 + getAssignedEngineeringExpertise(state) * 0.08);
}

export function getLifeSupportUpgradeSalvageCost(
  state: GameState,
  key: LifeSupportKey,
) {
  return 8 + state.survivors.lifeSupport[key] * 2;
}

export type BerthConstructionQuote = {
  cost: number;
  salvageCost: number;
  sections: number;
  capacity: number;
  berthsPerSection: number;
  maxed: boolean;
  inProgress: boolean;
  baseDurationSeconds: number;
  engineerCount: number;
  speedMultiplier: number;
};

export function getBerthConstructionQuote(
  state: GameState,
): BerthConstructionQuote {
  const sections = state.survivors.berthSections;
  // Living-space construction is a persistent Ark project. Its quote follows
  // built depth, not the current planet, so changing orbit cannot reprice the
  const cost = bounded(
    PERSISTENT_ARK_ECONOMY.berthFluxBase *
      (1 + 0.08 * sections) *
      getColonyLegacyEffects(state).fabricationCostMultiplier,
  );
  const salvageCost = Math.round(12 + sections * 8);
  return {
    cost,
    salvageCost,
    sections,
    capacity: getBerthCapacity(state.survivors),
    berthsPerSection: BERTHS_PER_SECTION,
    maxed:
      sections >= MAX_BERTH_SECTIONS ||
      getBerthCapacity(state.survivors) >= ARK_CREW_HARD_CAP,
    inProgress: state.survivors.berthConstruction !== null,
    baseDurationSeconds: BERTH_CONSTRUCTION_BASE_SECONDS,
    engineerCount: getAssignedEngineerCount(state),
    speedMultiplier: getBerthConstructionSpeed(state),
  };
}

export function getDefenseInstallationQuote(
  state: GameState,
  installationId: DefenseInstallationId,
) {
  const project = getInstallationProjectRequirements(state.defense, installationId);
  const cost = project.maxed
    ? 0
    : bounded(
        project.fluxCost *
          PERSISTENT_ARK_ECONOMY.defenseFluxScale *
          getColonyLegacyEffects(state).fabricationCostMultiplier,
      );
  const salvageCost = project.maxed ? 0 : project.salvageCost;
  const modelCost = project.maxed ? 0 : project.modelCost;
  const researchMet =
    project.requiredResearchId === null ||
    state.research.completedProjectIds.includes(project.requiredResearchId as ResearchProjectId);
  const busy = state.defense.construction !== null;
  return {
    cost,
    fluxCost: cost,
    salvageCost,
    modelCost,
    schematicCost: project.schematicCost,
    nullTraceCost: project.nullTraceCost,
    durationSeconds: project.durationSeconds,
    requiredResearchId: project.requiredResearchId,
    researchMet,
    capability: project.capability,
    mark: project.currentMark,
    level: project.currentMark,
    targetMark: project.targetMark,
    maxed: project.maxed,
    busy,
    canAfford:
      !project.maxed &&
      !busy &&
      researchMet &&
      state.flux >= cost &&
      state.living.salvage >= salvageCost &&
      state.researchStock["engineering-models"] >= modelCost &&
      state.researchStock.schematics >= project.schematicCost &&
      state.researchStock["null-traces"] >= project.nullTraceCost,
  };
}

export function buyDefenseInstallation(
  state: GameState,
  installationId: DefenseInstallationId,
) {
  const quote = getDefenseInstallationQuote(state, installationId);
  if (!quote.canAfford) return state;
  const defense = beginDefenseInstallationProject(
    state.defense,
    installationId,
    quote.durationSeconds,
  );
  if (defense === state.defense) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - quote.fluxCost);
  next.living.salvage -= quote.salvageCost;
  next.researchStock["engineering-models"] -= quote.modelCost;
  next.researchStock.schematics -= quote.schematicCost;
  next.researchStock["null-traces"] -= quote.nullTraceCost;
  next.defense = defense;
  return next;
}

export function chooseDefenseDoctrine(
  state: GameState,
  doctrine: DefenseDoctrine,
) {
  const defense = setDefenseDoctrine(state.defense, doctrine);
  if (defense === state.defense) return state;
  const next = cloneGameState(state);
  next.defense = defense;
  return next;
}

export function chooseEnvironmentalDefenseDoctrine(
  state: GameState,
  doctrine: EnvironmentalDoctrine,
) {
  const defense = setEnvironmentalDefenseDoctrine(state.defense, doctrine);
  if (defense === state.defense) return state;
  const next = cloneGameState(state);
  next.defense = defense;
  return next;
}

function isAutomationProgramId(value: string | null): value is AutomationProgramId {
  return Boolean(value && AUTOMATION_PROGRAM_DEFINITIONS.some((program) => program.id === value));
}

export function isAutomationUnlocked(state: GameState) {
  return (
    state.research.completedProjectIds.includes("automated-personnel-logistics") ||
    state.automation.framesBuilt > 0
  );
}

export function getActiveAutomationEffects(state: GameState) {
  const suppressed = getSuppressedAutomationProgram(state.defense);
  return getAutomationEffects(
    state.automation,
    isAutomationProgramId(suppressed) ? suppressed : null,
  );
}

export function isAutomationProgramUnlocked(
  state: GameState,
  programId: AutomationProgramId,
) {
  const definition = getAutomationProgramDefinition(programId);
  return state.research.completedProjectIds.includes(
    definition.requiredResearchId as ResearchProjectId,
  );
}

export function getAutomationFrameQuote(state: GameState) {
  const frame = state.automation.framesBuilt;
  const maxed = frame >= MAX_UTILITY_DRONE_FRAMES;
  const fluxCost = maxed
    ? 0
    : bounded(
        250 *
          PERSISTENT_ARK_ECONOMY.automationFluxScale *
          Math.pow(1.8, frame) *
          getColonyLegacyEffects(state).fabricationCostMultiplier,
      );
  const salvageCost = maxed ? 0 : Math.ceil(80 + 35 * frame);
  const modelCost = maxed ? 0 : Math.ceil(120 + 60 * frame);
  const schematicCost = maxed || frame < 3 ? 0 : Math.ceil(25 + 15 * (frame - 3));
  const nullTraceCost = maxed || frame < 5 ? 0 : Math.ceil(20 + 20 * (frame - 5));
  const researchMet = isAutomationUnlocked(state);
  return {
    frame,
    maxed,
    researchMet,
    fluxCost,
    salvageCost,
    modelCost,
    schematicCost,
    nullTraceCost,
    canBuild:
      researchMet &&
      !maxed &&
      state.flux >= fluxCost &&
      state.living.salvage >= salvageCost &&
      state.researchStock["engineering-models"] >= modelCost &&
      state.researchStock.schematics >= schematicCost &&
      state.researchStock["null-traces"] >= nullTraceCost,
  };
}

export function fabricateAutomationFrame(state: GameState) {
  const quote = getAutomationFrameQuote(state);
  if (!quote.canBuild) return state;
  const next = cloneGameState(state);
  next.flux -= quote.fluxCost;
  next.living.salvage -= quote.salvageCost;
  next.researchStock["engineering-models"] -= quote.modelCost;
  next.researchStock.schematics -= quote.schematicCost;
  next.researchStock["null-traces"] -= quote.nullTraceCost;
  next.automation = buildAutomationFrame(next.automation);
  return next;
}

export function setAutomationAllocation(
  state: GameState,
  programId: AutomationProgramId,
  amount: number,
) {
  if (!isAutomationProgramUnlocked(state, programId)) return state;
  const automation = setAutomationStateAllocation(state.automation, programId, amount);
  if (automation === state.automation) return state;
  const next = cloneGameState(state);
  next.automation = automation;
  return next;
}

export function setAutomationMaintenancePolicy(
  state: GameState,
  policy: AutomationMaintenancePolicy,
) {
  const automation = setAutomationStateMaintenancePolicy(state.automation, policy);
  if (automation === state.automation) return state;
  const next = cloneGameState(state);
  next.automation = automation;
  return next;
}

export function isHostileThreatOperationsActivated(state: GameState) {
  return getCampaignWorldIndex(state) >= 4 || state.defense.firstContactResolved;
}

export function isPlanetaryDefenseActivated(state: GameState) {
  return (
    state.settlement.colonies.length > 0 &&
    (isHostileThreatOperationsActivated(state) || state.planetaryDefense.stats.resolved > 0)
  );
}

export function getPlanetaryDefenseConstructionQuote(
  state: GameState,
  worldId: CampaignWorldId,
  installationId: PlanetaryInstallationId,
) {
  const network = state.planetaryDefense.networks[worldId];
  const definition = PLANETARY_INSTALLATION_DEFINITIONS[installationId];
  const level = network?.installations[installationId] ?? 0;
  const maxed = level >= MAX_PLANETARY_INSTALLATION_LEVEL;
  const scale =
    Math.pow(1.55, level) *
    PERSISTENT_ARK_ECONOMY.planetaryDefenseFluxScale;
  const fluxCost = maxed ? 0 : bounded(definition.baseFluxCost * scale);
  const salvageCost = maxed ? 0 : Math.ceil(definition.baseSalvageCost * Math.pow(1.35, level));
  const modelCost = maxed ? 0 : Math.ceil(definition.baseModelCost * Math.pow(1.3, level));
  const durationSeconds = Math.ceil(definition.baseSeconds * Math.pow(1.2, level));
  const locked = !isPlanetaryDefenseActivated(state) || !network;
  return {
    worldId,
    installationId,
    level,
    maxed,
    locked,
    busy: state.planetaryDefense.construction !== null,
    fluxCost,
    salvageCost,
    modelCost,
    durationSeconds,
    canBuild:
      !locked &&
      !maxed &&
      !state.planetaryDefense.construction &&
      state.flux >= fluxCost &&
      state.living.salvage >= salvageCost &&
      state.researchStock["engineering-models"] >= modelCost,
  };
}

export function beginPlanetaryDefenseConstruction(
  state: GameState,
  worldId: CampaignWorldId,
  installationId: PlanetaryInstallationId,
) {
  const quote = getPlanetaryDefenseConstructionQuote(state, worldId, installationId);
  if (!quote.canBuild) return state;
  const next = cloneGameState(state);
  next.flux -= quote.fluxCost;
  next.living.salvage -= quote.salvageCost;
  next.researchStock["engineering-models"] -= quote.modelCost;
  next.planetaryDefense = startPlanetaryDefenseConstruction(
    next.planetaryDefense,
    worldId,
    installationId,
    quote.durationSeconds,
  );
  return next;
}

export function choosePlanetaryDefenseDoctrine(
  state: GameState,
  doctrine: PlanetaryDefenseDoctrine,
) {
  const planetaryDefense = setPlanetaryDefenseStateDoctrine(state.planetaryDefense, doctrine);
  if (planetaryDefense === state.planetaryDefense) return state;
  const next = cloneGameState(state);
  next.planetaryDefense = planetaryDefense;
  return next;
}

export type OperationalLoad = {
  medical: number;
  automation: number;
  planetaryDefense: number;
  compromise: number;
  total: number;
  available: number;
};

export function getOperationalLoad(state: GameState): OperationalLoad {
  const medical = getMedBayDiversion(state);
  const automation = getActiveAutomationEffects(state).operationalLoad;
  const planetaryDefense = isPlanetaryDefenseActivated(state)
    ? getPlanetaryDefenseOperationalLoad(state.planetaryDefense)
    : 0;
  const compromise = getDefenseCompromiseLoad(state.defense);
  const total = Math.min(0.65, medical + automation + planetaryDefense + compromise);
  return { medical, automation, planetaryDefense, compromise, total, available: 1 - total };
}

function runAutomatedEquipmentMaintenance(state: GameState, elapsedSeconds: number) {
  if (state.automation.maintenancePolicy === "off") return;
  const suppressed = getSuppressedAutomationProgram(state.defense) === "hull-maintenance";
  const frames = suppressed ? 0 : state.automation.allocations["hull-maintenance"];
  if (frames <= 0) return;
  state.automation.repairProgressSeconds = Math.min(
    AUTOMATED_REPAIR_INTERVAL_SECONDS * 64,
    state.automation.repairProgressSeconds + elapsedSeconds * frames,
  );
  let attempts = Math.min(
    64,
    Math.floor(state.automation.repairProgressSeconds / AUTOMATED_REPAIR_INTERVAL_SECONDS),
  );
  while (attempts > 0) {
    const item = ARMORY_ITEM_DEFINITIONS.find(
      (definition) => getArmoryDamagedCount(state.armory, definition.id) > 0,
    );
    if (!item) {
      state.automation.repairProgressSeconds = Math.min(
        state.automation.repairProgressSeconds,
        AUTOMATED_REPAIR_INTERVAL_SECONDS,
      );
      break;
    }
    const quote = getArmoryRepairQuote(state, item.id);
    const reserveSatisfied =
      state.automation.maintenancePolicy === "priority"
        ? state.flux >= quote.fluxCost
        : state.flux >= quote.fluxCost * 2;
    if (!quote.canRepair || !reserveSatisfied) break;
    state.flux = Math.max(0, state.flux - quote.fluxCost);
    state.armory = repairArmoryStockItem(state.armory, item.id);
    state.automation.stats.equipmentRepaired += 1;
    state.automation.repairProgressSeconds -= AUTOMATED_REPAIR_INTERVAL_SECONDS;
    attempts -= 1;
  }
}

export function startArkBerthConstruction(state: GameState) {
  const quote = getBerthConstructionQuote(state);
  if (
    quote.maxed ||
    quote.inProgress ||
    state.flux < quote.cost ||
    state.living.salvage < quote.salvageCost
  ) return state;
  const survivors = startBerthSectionConstruction(state.survivors);
  if (survivors === state.survivors) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - quote.cost);
  next.living.salvage = Math.max(
    0,
    next.living.salvage - quote.salvageCost,
  );
  next.survivors = survivors;
  next.researchStock["engineering-models"] = Math.min(
    1e12,
    next.researchStock["engineering-models"] + 10,
  );
  return next;
}

export function fabricateWorldEquipment(state: GameState, equipmentId: string) {
  const quote = getEquipmentFabricationQuote(state, equipmentId);
  if (
    quote.atLimit ||
    !quote.researchMet ||
    state.flux < quote.cost ||
    state.researchStock["engineering-models"] < quote.modelCost
  ) {
    return state;
  }
  const next = cloneGameState(state);
  next.flux -= quote.cost;
  next.researchStock["engineering-models"] = Math.max(
    0,
    next.researchStock["engineering-models"] - quote.modelCost,
  );
  next.worldProgress.equipment = {
    ...next.worldProgress.equipment,
    [equipmentId]: quote.owned + 1,
  };
  return next;
}

export type CrisisRequirementCategory =
  | "Foundry"
  | "Infrastructure"
  | "Research"
  | "Flux";

export type CrisisRequirementStatus = {
  id: string;
  category: CrisisRequirementCategory;
  label: string;
  detail: string;
  met: boolean;
};

export type CrisisReadiness = {
  canResolve: boolean;
  cost: number;
  requirements: readonly CrisisRequirementStatus[];
};

export function getCrisisReadiness(
  state: GameState,
  crisisId: string,
): CrisisReadiness {
  const world = state.settlement.currentWorldId
    ? getCampaignWorld(state.settlement.currentWorldId)
    : null;
  if (!world?.crisisIds.includes(crisisId)) {
    return {
      canResolve: false,
      cost: Number.POSITIVE_INFINITY,
      requirements: [],
    };
  }

  const activeMission = MISSIONS[state.missions.currentIndex];
  const worldMission = MISSIONS.find((mission) => mission.world === world.name);
  const missionMatches = activeMission?.world === world.name;
  const cost = getCrisisFluxCost(state);
  const directiveRequirements: CrisisRequirementStatus[] =
    worldMission?.stages.map((stage, index) => {
      const met = Boolean(
        missionMatches &&
          (state.missions.awaitingAcknowledgement ||
            state.missions.stageIndex > index),
      );
      return {
        id: `directive:${index}`,
        category: "Foundry",
        label: stage.label,
        met,
        detail: met
          ? `Completed: ${stage.instruction}`
          : missionMatches && state.missions.stageIndex === index
            ? `Current objective: ${stage.instruction}`
            : `Upcoming objective: ${stage.instruction}`,
      };
    }) ?? [
      {
        id: "directive:campaign",
        category: "Foundry",
        label: `Finish the ${world.name} Foundry directive`,
        met: Boolean(missionMatches && state.missions.awaitingAcknowledgement),
        detail: `Return to the Foundry and complete ${world.name}'s active campaign.`,
      },
    ];
  const infrastructureRequirements: CrisisRequirementStatus[] =
    world.infrastructure.map((objective) => {
      const met = state.worldProgress.completedInfrastructureIds.includes(
        objective.id,
      );
      return {
        id: `infrastructure:${objective.id}`,
        category: "Infrastructure",
        label: objective.name,
        met,
        detail: met ? "Planetary infrastructure secured." : objective.description,
      };
    });
  const researchRequirements: CrisisRequirementStatus[] =
    world.requiredResearchIds.map((researchId) => {
      const definition = getResearchProjectDefinition(
        researchId as ResearchProjectId,
      );
      const met = state.research.completedProjectIds.includes(
        researchId as ResearchProjectId,
      );
      const incompletePrerequisites =
        definition?.prerequisites.filter(
          (prerequisiteId) =>
            !state.research.completedProjectIds.includes(prerequisiteId),
        ) ?? [];
      const prerequisiteNames = incompletePrerequisites.map(
        (prerequisiteId) =>
          getResearchProjectDefinition(prerequisiteId)?.name ??
          prerequisiteId.replaceAll("-", " "),
      );
      return {
        id: `research:${researchId}`,
        category: "Research",
        label: definition?.name ?? researchId.replaceAll("-", " "),
        met,
        detail: met
          ? "Research Lattice project proven."
          : prerequisiteNames.length > 0
            ? `Blocked by: ${prerequisiteNames.join(", ")}. Complete those projects first.`
            : definition?.summary ?? "Complete this project in the Research Lattice.",
      };
    });
  const requirements: CrisisRequirementStatus[] = [
    ...directiveRequirements,
    ...infrastructureRequirements,
    ...researchRequirements,
    {
      id: "flux",
      category: "Flux",
      label: `Reserve ${formatNumber(cost)} Flux`,
      met: state.flux >= cost,
      detail: `${formatNumber(state.flux)} / ${formatNumber(cost)} Flux available.`,
    },
  ];

  return {
    canResolve: requirements.every((requirement) => requirement.met),
    cost,
    requirements,
  };
}

export function completeWorldInfrastructure(
  state: GameState,
  objectiveId: string,
) {
  const world = state.settlement.currentWorldId
    ? getCampaignWorld(state.settlement.currentWorldId)
    : null;
  if (!world?.infrastructure.some((objective) => objective.id === objectiveId)) {
    return state;
  }
  if (state.worldProgress.completedInfrastructureIds.includes(objectiveId)) {
    return state;
  }
  const cost = getInfrastructureFluxCost(state);
  if (state.flux < cost) return state;
  const next = cloneGameState(state);
  next.flux -= cost;
  next.worldProgress.completedInfrastructureIds = [
    ...next.worldProgress.completedInfrastructureIds,
    objectiveId,
  ];
  next.researchStock["engineering-models"] = Math.min(
    1e12,
    next.researchStock["engineering-models"] + 12 * (world.chapter + 1),
  );
  return next;
}

export function fabricateWorldSupply(state: GameState, supplyId: string) {
  const quote = getSupplyFabricationQuote(state, supplyId);
  if (quote.amount <= 0 || state.flux < quote.cost) return state;
  const next = cloneGameState(state);
  next.flux -= quote.cost;
  next.worldProgress.supplies[supplyId] = Math.min(
    1e9,
    (next.worldProgress.supplies[supplyId] ?? 0) + quote.amount,
  );
  return next;
}

export function canResolveCurrentCrisis(state: GameState, crisisId: string) {
  return getCrisisReadiness(state, crisisId).canResolve;
}

export function resolveCurrentCrisis(state: GameState, crisisId: string) {
  if (
    state.worldProgress.resolvedCrisisIds.includes(crisisId) ||
    !canResolveCurrentCrisis(state, crisisId)
  ) {
    return state;
  }
  const next = cloneGameState(state);
  next.flux -= getCrisisFluxCost(state);
  next.worldProgress.resolvedCrisisIds = [
    ...next.worldProgress.resolvedCrisisIds,
    crisisId,
  ];
  next.researchStock["null-traces"] = Math.min(
    1e12,
    next.researchStock["null-traces"] +
      20 * (next.settlement.completedWorldIds.length + 1),
  );
  return next;
}

export type CampaignDepartureAttempt = {
  state: GameState;
  ok: boolean;
  reason: string | null;
  departedWorldId: CampaignWorldId | null;
  nextWorldId: CampaignWorldId | null;
};

export function departCurrentWorld(
  state: GameState,
  departedAt = Date.now(),
  colonyName?: string,
): CampaignDepartureAttempt {
  const worldId = state.settlement.currentWorldId;
  if (!worldId) {
    return {
      state,
      ok: false,
      reason: "campaign-complete",
      departedWorldId: null,
      nextWorldId: null,
    };
  }
  if (worldId === "cold-wake" && !state.missions.awaitingAcknowledgement) {
    return {
      state,
      ok: false,
      reason: "requirements-unmet",
      departedWorldId: worldId,
      nextWorldId: worldId,
    };
  }
  if (state.expeditions.active) {
    return {
      state,
      ok: false,
      reason: "expedition-active",
      departedWorldId: worldId,
      nextWorldId: worldId,
    };
  }
  if (state.expeditions.stranded) {
    return {
      state,
      ok: false,
      reason: "crew-stranded",
      departedWorldId: worldId,
      nextWorldId: worldId,
    };
  }
  if (state.survivors.activeSignal) {
    return {
      state,
      ok: false,
      reason: "survivor-signal-pending",
      departedWorldId: worldId,
      nextWorldId: worldId,
    };
  }
  const crew = getCampaignCrewSummaries(state);
  const result = establishSettlementAndDepart(
    state.settlement,
    worldId,
    crew,
    currentProgressWithResearch(state),
    departedAt,
    colonyName,
  );
  if (!result.ok) {
    return {
      state,
      ok: false,
      reason: result.reason,
      departedWorldId: worldId,
      nextWorldId: state.settlement.currentWorldId,
    };
  }

  const next = cloneGameState(state);
  const index = Math.min(MISSIONS.length - 1, next.missions.currentIndex);
  next.settlement = result.state;
  next.planetaryDefense = syncPlanetaryDefenseNetworks(
    next.planetaryDefense,
    result.state.colonies,
  );
  next.survivors = transferSurvivorsToSettlement(
    next.survivors,
    result.settledCrewIds,
  );
  next.survivors = advanceCrewAgesAfterChapter(next.survivors);
  next.survivors = setSosBeaconOnline(
    next.survivors,
    false,
    result.nextWorldId ?? "cold-wake",
  );
  next.worldProgress = {
    ...emptyWorldProgress(),
    completedResearchIds: [...next.research.completedProjectIds],
  };
  next.missions.statuses[index] = "saved";
  next.missions.worldsSaved = result.state.completedWorldIds.length;
  next.stellarRelays = next.missions.worldsSaved;
  next.missions.currentIndex = Math.min(
    MISSIONS.length,
    result.state.completedWorldIds.length,
  );
  next.missions.stageIndex = 0;
  next.missions.awaitingAcknowledgement = false;
  next.missions.holdTime = 0;
  next.missions.contributedFlux = 0;
  if (next.missions.currentIndex < MISSIONS.length) {
    next.missions.statuses[next.missions.currentIndex] = "active";
  }
  next.living = grantLivingFoundryRewards(next.living, {
    salvage: 30 * (index + 1),
    loreIds: syncAutomaticDiscoveries(
      next.living.discoveredLore,
      next.missions.worldsSaved,
      next.settings.tutorialComplete,
    ),
  });
  next.living = syncLivingFoundryState(next.living, next.missions.worldsSaved);
  const mission = MISSIONS[index];
  const landingFlux = mission?.landingFlux ?? 0;
  next.flux = landingFlux;
  next.maxFlux = Math.max(next.maxFlux, landingFlux);
  next.runFlux = 0;
  next.runTime = 0;
  next.autoTimer = 0;
  next.tiers = GENERATORS.map(() => ({ amount: 0, bought: 0 }));
  next.runUpgrades = RUN_UPGRADES.map(() => 0);
  if (mission && "rewardAxioms" in mission) {
    next.axioms += mission.rewardAxioms;
    next.lifetimeAxioms += mission.rewardAxioms;
  }
  // Seed taps are BOUGHT machines under economy v2 - they must produce.
  next.tiers[0].bought = Math.min(
    25,
    LEGACY_SEED_TAPS[next.legacyUpgrades[2]] + getCampaignRelics(next).seedTaps,
  );
  next.tiers[0].amount = next.tiers[0].bought;
  next.missions.baseline = captureMissionBaseline(next);
  if (result.nextWorldId && worldId !== "cold-wake") {
    const navigationExpertise = getDefenseCrewContext(next).navigators;
    next.transit = beginTransit(
      next.transit,
      worldId,
      result.nextWorldId,
      navigationExpertise,
      next.research.completedProjectIds.includes("ark-drive-coupling"),
      departedAt,
    );
    if (next.transit.active) next.settlement.currentWorldId = null;
  }
  return {
    state: next,
    ok: true,
    reason: null,
    departedWorldId: worldId,
    nextWorldId: result.nextWorldId,
  };
}

export function getCampaignRelics(state: GameState) {
  const saved = (index: number) => state.missions.statuses[index] === "saved";
  return {
    manualMultiplier: saved(0) ? 1.1 : 1,
    phaseCoilMultiplier: saved(1) ? 1.08 : 1,
    resonanceBonus: saved(2) ? 0.005 : 0,
    researchCostMultiplier: saved(3) ? 0.95 : 1,
    seedTaps: saved(4) ? 5 : 0,
  };
}

export function getWorldEffects(state: GameState) {
  const mission = MISSIONS[getCampaignWorldIndex(state)] ?? MISSIONS[0];
  const stageCount = mission.stages.length;
  const repairProgress = state.missions.awaitingAcknowledgement
    ? 1
    : Math.min(
        1,
        (state.missions.stageIndex + state.stellarRelays * 0.2) /
          stageCount,
      );
  const restore = (startingValue: number) =>
    startingValue + (1 - startingValue) * repairProgress;
  const hazardShield = Math.min(0.1, state.stellarRelays * 0.02);
  const shield = (value: number) =>
    value < 1
      ? value + (1 - value) * hazardShield
      : 1 + (value - 1) * (1 - hazardShield);

  return {
    worldIndex: getCampaignWorldIndex(state),
    repairProgress,
    hazardShield,
    production: shield(restore(mission.effects.production)),
    manual: shield(restore(mission.effects.manual)),
    machineCost: shield(restore(mission.effects.machineCost)),
    researchCost: shield(restore(mission.effects.researchCost)),
    higherTier: shield(restore(mission.effects.higherTier)),
    resonance: shield(restore(mission.effects.resonance)),
  };
}

export function isTierUnlocked(state: GameState, index: number) {
  if (
    state.missions.currentIndex === 1 &&
    index === 1 &&
    state.missions.stageIndex < PELAGOS_FERRY_STAGE
  ) {
    return false;
  }
  return (
    index <= getCampaignWorldIndex(state) &&
    state.maxFlux >= GENERATORS[index].unlockAt
  );
}

export function getRunUpgradeCost(state: GameState, index: number) {
  const upgrade = RUN_UPGRADES[index];
  return safeMultiply(
    safeMultiply(
      getRecalibrationBaseThreshold(state),
      upgrade.baseCostRatio,
    ),
    safePower(upgrade.growth, state.runUpgrades[index]),
  );
}

export function isRunUpgradeUnlocked(state: GameState, index: number) {
  const upgrade = RUN_UPGRADES[index];
  if (!upgrade) return false;
  if (state.runUpgrades[index] > 0) return true;
  const worldIndex = getCampaignWorldIndex(state);
  if (worldIndex < upgrade.unlockWorldIndex) return false;
  if (worldIndex > upgrade.unlockWorldIndex) return true;
  return upgrade.unlockWorldIndex !== 1 ||
    state.missions.stageIndex >= PELAGOS_PROTOCOL_STAGE;
}

export function getRunUpgradeUnlockLabel(index: number) {
  const upgrade = RUN_UPGRADES[index];
  if (!upgrade) return "Protocol unavailable";
  if (upgrade.unlockWorldIndex === 1) return "Introduced by the Pelagos gravity-ferry operation";
  if (upgrade.unlockWorldIndex === 2) return "Unlocks on Viridia";
  return "Unlocks on Cinder";
}

const protocolLevel = (state: GameState, index: number) =>
  Math.min(RUN_UPGRADES[index].maxLevel, Math.max(0, state.runUpgrades[index]));

export function getRunUpgradeEffectLabel(index: number, level: number) {
  const safeLevel = Math.min(3, Math.max(0, Math.floor(level)));
  if (safeLevel === 0) return "Not compiled";
  if (index === 0) return `Manual strikes ×${PULSE_PROTOCOL_MULTIPLIERS[safeLevel]}`;
  if (index === 1) return `All production ×${FLOW_PROTOCOL_MULTIPLIERS[safeLevel]}`;
  if (index === 2) return `Upper tiers ×${HARMONIC_PROTOCOL_MULTIPLIERS[safeLevel]}`;
  return `+${Math.round(MESH_PROTOCOL_BONUS[safeLevel] * 100)} points per Resonance level`;
}

export function getLegacyMatrixStatus(state: GameState) {
  const capacity = getLegacyMatrixCapacity(state);
  const used = state.legacyUpgrades.reduce(
    (sum, level) => sum + Math.min(LEGACY_MAX_MARK, Math.max(0, level)),
    0,
  );
  const nextMilestone =
    LEGACY_MATRIX_CAPACITY_MILESTONES.find(
      (milestone) => milestone > state.lifetimeAxioms,
    ) ?? null;
  return {
    capacity,
    used,
    available: Math.max(0, capacity - used),
    nextMilestone,
  };
}

/**
 * Research evidence costs are affected by the active world's condition, the
 * permanent Cinder recovery legacy, and physical Analysis rooms aboard the
 * Ark. The bounded product is shared by simulation, auto-transfer, and UI so
 * the displayed requirement always matches what the lattice consumes.
 */
export function getResearchCostMultiplier(state: GameState) {
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  const living = getLivingFoundryBonuses(state.living);
  return Math.min(
    1.5,
    Math.max(
      0.65,
      world.researchCost *
        relics.researchCostMultiplier *
        living.researchCostMultiplier,
    ),
  );
}

export function getLegacyUpgradeEffectLabel(index: number, level: number) {
  const safeLevel = Math.min(
    LEGACY_MAX_MARK,
    Math.max(0, Math.floor(level)),
  );
  if (index === 0) {
    return safeLevel === 0
      ? "No permanent amplification"
      : `Production +${Math.round((LEGACY_AMPLIFIER_PRODUCTION[safeLevel] - 1) * 100)}% · strikes +${Math.round((LEGACY_AMPLIFIER_MANUAL[safeLevel] - 1) * 100)}%`;
  }
  if (index === 1) {
    return safeLevel === 0
      ? "Standard prices · 8-hour offline reserve"
      : `Machine prices −${Math.round(LEGACY_PRECISION_DISCOUNT[safeLevel] * 100)}% · ${LEGACY_OFFLINE_CAP_HOURS[safeLevel]}-hour reserve`;
  }
  return safeLevel === 0
    ? "No seeded mechanisms"
    : `Begin with ${LEGACY_SEED_TAPS[safeLevel]} Vacuum Taps`;
}

export function getOfflineCapHours(state: GameState) {
  return LEGACY_OFFLINE_CAP_HOURS[state.legacyUpgrades[1]];
}

export function getResonanceDetails(state: GameState) {
  const links = GENERATORS.slice(0, -1).map((_, index) =>
    Math.min(
      4,
      Math.floor(
        Math.min(
          state.tiers[index].bought,
          state.tiers[index + 1].bought,
        ) / 15,
      ),
    ),
  );
  const levels = links.reduce((sum, level) => sum + level, 0);
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  const living = getLivingFoundryBonuses(state.living);
  const perLevel =
    (0.04 + MESH_PROTOCOL_BONUS[protocolLevel(state, 3)] + relics.resonanceBonus) *
    world.resonance;
  const base = 1 + perLevel;
  return {
    links,
    levels,
    base,
    perLevel,
    multiplier: (1 + levels * perLevel) * living.resonanceMultiplier,
  };
}

export function getMissionProgress(
  state: GameState,
  index = state.missions.currentIndex,
) {
  const mission = MISSIONS[index];
  if (!mission) return { value: 1, target: 1, ratio: 1 };

  if (index < state.missions.currentIndex) {
    return { value: 1, target: 1, ratio: 1 };
  }
  if (index > state.missions.currentIndex) {
    return { value: 0, target: 1, ratio: 0 };
  }

  const stage = mission.stages[state.missions.stageIndex] ?? mission.stages[0];
  let value = 0;
  switch (stage.kind) {
    case "pulseDelta":
      value = Math.max(
        0,
        state.manualPulses - state.missions.baseline.manualPulses,
      );
      break;
    case "tierPurchaseDelta":
      value = Math.max(
        0,
        state.tiers[stage.tierIndex].bought -
          state.missions.baseline.tierBought[stage.tierIndex],
      );
      break;
    case "researchDelta":
      value = Math.max(
        0,
        state.researchPurchases -
          state.missions.baseline.researchPurchases,
      );
      break;
    case "contributeFlux":
      value = state.missions.contributedFlux;
      break;
    case "resonanceHold":
      value = state.missions.holdTime;
      break;
    case "axiomProof":
      value = state.cycle > state.missions.baseline.cycle &&
        state.lifetimeAxioms > state.missions.baseline.lifetimeAxioms
        ? 1
        : Math.min(
            0.99,
            state.runFlux / Math.max(1, getRecalibrationThreshold(state)),
          );
      break;
    case "recalibrateGain":
      value =
        state.cycle > state.missions.baseline.cycle
          ? Math.max(
              0,
              state.lifetimeAxioms -
                state.missions.baseline.lifetimeAxioms,
            )
          : 0;
      break;
    case "beaconReady": {
      const support = getLifeSupportStatus(state.survivors).capacity;
      const readyChecks = [
        getBerthCapacity(state.survivors) >= 2,
        support.atmosphere >= 2,
        support.water >= 2,
        support.nutrition >= 2,
        support.medical >= 2,
      ];
      value = readyChecks.filter(Boolean).length / readyChecks.length;
      break;
    }
    case "beaconOnline":
      value = state.survivors.beaconOnline ? 1 : 0;
      break;
    case "signalDetected":
      value = state.survivors.activeSignal || state.survivors.signalsGenerated > 0 ? 1 : 0;
      break;
    case "survivorCount":
      value = state.survivors.survivors.length;
      break;
  }

  return {
    value,
    target: stage.target,
    ratio: Math.min(1, Math.max(0, value / stage.target)),
  };
}

export function getMissionStageProgress(
  state: GameState,
  stageIndex: number,
) {
  if (stageIndex < state.missions.stageIndex) {
    return { value: 1, target: 1, ratio: 1 };
  }
  if (stageIndex > state.missions.stageIndex) {
    return { value: 0, target: 1, ratio: 0 };
  }
  return getMissionProgress(state);
}

export function contributeToMission(state: GameState) {
  if (state.missions.awaitingAcknowledgement) return state;
  const mission = MISSIONS[state.missions.currentIndex];
  const stage = mission?.stages[state.missions.stageIndex];
  if (!stage || stage.kind !== "contributeFlux") return state;
  const remaining = Math.max(
    0,
    stage.target - state.missions.contributedFlux,
  );
  const contribution = Math.min(state.flux, remaining);
  if (contribution <= 0) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - contribution);
  next.missions.contributedFlux = safeAdd(
    next.missions.contributedFlux,
    contribution,
  );
  return next;
}

function advanceMission(state: GameState, elapsedSeconds: number) {
  if (!state.settings.tutorialComplete) return state;
  if (state.missions.awaitingAcknowledgement) return state;
  const index = state.missions.currentIndex;
  const mission = MISSIONS[index];
  if (!mission) return state;

  const stage = mission.stages[state.missions.stageIndex];
  if (!stage) return state;

  if (stage.kind === "resonanceHold") {
    if (getResonanceDetails(state).levels >= stage.requiredLevels) {
      state.missions.holdTime = Math.min(
        stage.target,
        state.missions.holdTime + elapsedSeconds,
      );
    } else {
      state.missions.holdTime = Math.max(
        0,
        state.missions.holdTime - elapsedSeconds * 0.35,
      );
    }
  }

  const progress = getMissionProgress(state, index);
  if (progress.value >= progress.target) {
    if (state.missions.stageIndex < mission.stages.length - 1) {
      const completedStage = state.missions.stageIndex;
      state.living = grantLivingFoundryRewards(state.living, {
        salvage: 6 * (index + 1) * (completedStage + 1),
      });
      state.missions.stageIndex += 1;
      state.missions.holdTime = 0;
      state.missions.contributedFlux = 0;
      state.missions.baseline = captureMissionBaseline(state);
      return state;
    }
    state.missions.awaitingAcknowledgement = true;
  }
  return state;
}

export function getProductionSnapshot(state: GameState) {
  const prestigeMultiplier =
    1 + 0.35 * Math.log2(1 + state.lifetimeAxioms);
  const legacyMultiplier =
    LEGACY_AMPLIFIER_PRODUCTION[state.legacyUpgrades[0]];
  const flowMultiplier = FLOW_PROTOCOL_MULTIPLIERS[protocolLevel(state, 1)];
  const relayMultiplier = 1 + state.stellarRelays * 0.015;
  const world = getWorldEffects(state);
  const hazardShield = world.hazardShield;
  const relics = getCampaignRelics(state);
  const livingBonuses = getLivingFoundryBonuses(state.living);
  const researchBonuses = getResearchBonuses(state.research);
  const colonyLegacyEffects = getColonyLegacyEffects(state);
  const defenseMultiplier = getDefenseProductionMultiplier(state.defense);
  const operationalLoad = getOperationalLoad(state);
  const globalMultiplier = safeMultiply(
    safeMultiply(
      safeMultiply(flowMultiplier, legacyMultiplier),
      prestigeMultiplier,
    ),
    world.production *
      livingBonuses.productionMultiplier *
      researchBonuses.productionMultiplier *
      relayMultiplier *
      colonyLegacyEffects.cohesionProductionMultiplier *
      defenseMultiplier *
      operationalLoad.available,
  );
  const resonance = getResonanceDetails(state);
  const higherTierMultiplier =
    HARMONIC_PROTOCOL_MULTIPLIERS[protocolLevel(state, 2)];
  const unlockedTierCount = Math.max(1, getCampaignWorldIndex(state) + 1);
  const edgeGearing = safePower(
    higherTierMultiplier,
    1 / Math.max(1, unlockedTierCount - 1),
  );

  // Additive economy: every tier's BOUGHT machines produce Flux directly.
  // tierOutputs[i] is that tier's realized Flux/s contribution; the total
  // moves only when something is purchased.
  const tierOutputs = state.tiers.map((tier, index) => {
    if (index > world.worldIndex) return 0;
    const milestoneMultiplier = 1 + 0.5 * Math.floor(tier.bought / 25);
    const tierMultiplier =
      index === 0
        ? 1
        : edgeGearing *
          world.higherTier *
          (index === 1 ? relics.phaseCoilMultiplier : 1);
    return safeMultiply(
      safeMultiply(tier.bought, GENERATORS[index].rate),
      safeMultiply(
        safeMultiply(milestoneMultiplier, tierMultiplier),
        safeMultiply(globalMultiplier, resonance.multiplier),
      ),
    );
  });

  return {
    fluxPerSecond: tierOutputs.reduce((sum, value) => safeAdd(sum, value), 0),
    tierOutputs,
    globalMultiplier,
    prestigeMultiplier,
    relayMultiplier,
    hazardShield,
    world,
    flowMultiplier,
    legacyMultiplier,
    higherTierMultiplier,
    edgeGearing,
    resonance,
    livingBonuses,
    researchBonuses,
    colonyLegacyEffects,
    operationalLoad,
  };
}

export function getRunUpgradePaybackSeconds(state: GameState, index: number) {
  if (index === 0 || !isRunUpgradeUnlocked(state, index)) return null;
  const upgrade = RUN_UPGRADES[index];
  const level = state.runUpgrades[index];
  if (level >= upgrade.maxLevel) return null;
  const before = getProductionSnapshot(state).fluxPerSecond;
  const preview = cloneGameState(state);
  preview.runUpgrades[index] = level + 1;
  const after = getProductionSnapshot(preview).fluxPerSecond;
  const increase = after - before;
  if (increase <= 0) return null;
  return getRunUpgradeCost(state, index) / increase;
}

export function getActiveTransit(state: GameState) {
  return getTransitProgress(state.transit);
}

export function getManualGain(state: GameState) {
  const production = getProductionSnapshot(state).fluxPerSecond;
  const responsiveBase = 1 + Math.sqrt(production + 1) * 0.04;
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  const living = getLivingFoundryBonuses(state.living);
  return safeMultiply(
    responsiveBase,
    safeMultiply(
      PULSE_PROTOCOL_MULTIPLIERS[protocolLevel(state, 0)],
      safeMultiply(
        LEGACY_AMPLIFIER_MANUAL[state.legacyUpgrades[0]],
        world.manual * relics.manualMultiplier * living.manualMultiplier,
      ),
    ),
  );
}

export function pulseCore(state: GameState) {
  const next = cloneGameState(state);
  const gain = getManualGain(next);
  next.flux = safeAdd(next.flux, gain);
  next.maxFlux = Math.max(next.maxFlux, next.flux);
  next.runFlux = safeAdd(next.runFlux, gain);
  next.allTimeFlux = safeAdd(next.allTimeFlux, gain);
  next.manualPulses += 1;
  next.researchStock["calibration-data"] = Math.min(
    1e12,
    next.researchStock["calibration-data"] + 1,
  );
  return next;
}

export function getTierCost(
  state: GameState,
  index: number,
  quantity = 1,
) {
  if (quantity <= 0) return 0;
  const generator = GENERATORS[index];
  const legacyPriceMultiplier =
    1 - LEGACY_PRECISION_DISCOUNT[state.legacyUpgrades[1]];
  const world = getWorldEffects(state);
  const living = getLivingFoundryBonuses(state.living);
  const research = getResearchBonuses(state.research);
  const colony = getColonyLegacyEffects(state);
  const nextPrice =
    safeMultiply(
      safeMultiply(
        generator.baseCost,
        safePower(generator.growth, state.tiers[index].bought),
      ),
      world.machineCost *
        legacyPriceMultiplier *
        living.machineCostMultiplier *
        research.machineCostMultiplier *
        colony.fabricationCostMultiplier,
    );
  const growthForQuantity = safePower(generator.growth, quantity);
  return bounded(
    nextPrice * ((growthForQuantity - 1) / (generator.growth - 1)),
  );
}

export function getMaxAffordableCount(state: GameState, index: number) {
  if (getTierCost(state, index, 1) > state.flux) return 0;
  let low = 1;
  let high = 2;
  const hardCap = 1_000_000;

  while (high < hardCap && getTierCost(state, index, high) <= state.flux) {
    low = high;
    high *= 2;
  }
  high = Math.min(high, hardCap);
  if (high === hardCap && getTierCost(state, index, high) <= state.flux) {
    return hardCap;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (getTierCost(state, index, middle) <= state.flux) low = middle;
    else high = middle;
  }
  return low;
}

export function getPurchaseQuantity(
  state: GameState,
  index: number,
  mode: PurchaseMode,
) {
  if (
    state.missions.currentIndex === 0 &&
    state.missions.stageIndex === 0 &&
    index === 0
  ) {
    return 0;
  }
  if (!isTierUnlocked(state, index)) return 0;
  if (mode === "max") return getMaxAffordableCount(state, index);
  const quantity = mode === "10" ? 10 : 1;
  return getTierCost(state, index, quantity) <= state.flux ? quantity : 0;
}

export function buyTier(
  state: GameState,
  index: number,
  mode: PurchaseMode,
) {
  const quantity = getPurchaseQuantity(state, index, mode);
  if (quantity <= 0) return state;
  const cost = getTierCost(state, index, quantity);
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - cost);
  next.tiers[index].amount = safeAdd(next.tiers[index].amount, quantity);
  next.tiers[index].bought += quantity;
  next.researchStock["engineering-models"] = Math.min(
    1e12,
    next.researchStock["engineering-models"] +
      quantity * (0.25 + index * 0.1),
  );
  return next;
}

export function buyRunUpgrade(state: GameState, index: number) {
  const upgrade = RUN_UPGRADES[index];
  if (!upgrade || !isRunUpgradeUnlocked(state, index)) return state;
  const level = state.runUpgrades[index];
  if (level >= upgrade.maxLevel) return state;
  const cost = getRunUpgradeCost(state, index);
  if (cost > state.flux) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - cost);
  next.runUpgrades[index] += 1;
  next.settings.protocolBlueprint[index] = Math.max(
    next.settings.protocolBlueprint[index] ?? 0,
    next.runUpgrades[index],
  );
  next.researchPurchases += 1;
  return next;
}

export function allocateLegacyUpgrade(state: GameState, index: number) {
  const status = getLegacyMatrixStatus(state);
  if (
    !LEGACY_UPGRADES[index] ||
    status.available < 1 ||
    state.legacyUpgrades[index] >= LEGACY_MAX_MARK
  ) {
    return state;
  }
  const next = cloneGameState(state);
  next.legacyUpgrades[index] += 1;
  return next;
}

export function releaseLegacyUpgrade(state: GameState, index: number) {
  if (
    !state.legacyMatrixRevisionOpen ||
    !LEGACY_UPGRADES[index] ||
    state.legacyUpgrades[index] <= 0
  ) {
    return state;
  }
  const next = cloneGameState(state);
  next.legacyUpgrades[index] -= 1;
  return next;
}

export function commitLegacyMatrix(state: GameState) {
  if (!state.legacyMatrixRevisionOpen) return state;
  const next = cloneGameState(state);
  next.legacyMatrixRevisionOpen = false;
  return next;
}

export function getLawHeartPhaseGateStatus(state: GameState) {
  const gate = LAW_HEART_PHASE_GATES.find(
    (candidate) =>
      !state.research.completedProjectIds.includes(candidate.projectId),
  );
  if (!gate) return null;
  const capacity = gate.threshold - 1;
  return {
    ...gate,
    capacity,
    current: Math.floor(state.lifetimeAxioms),
    remaining: Math.max(0, capacity - Math.floor(state.lifetimeAxioms)),
    saturated: state.lifetimeAxioms >= capacity,
  };
}

export function getRecalibrationGain(state: GameState) {
  const provingColdWakeLaw =
    state.missions.currentIndex === 0 &&
    state.missions.stageIndex >= 3 &&
    state.missions.stageIndex <= 5 &&
    !state.missions.awaitingAcknowledgement;
  if (state.missions.currentIndex === 0 && !provingColdWakeLaw) return 0;
  const threshold = getRecalibrationThreshold(state);
  if (state.runFlux < threshold) return 0;
  if (provingColdWakeLaw) return 1;
  const worldIndex = getCampaignWorldIndex(state);
  const forged = state.axiomProofsByWorld[worldIndex] ?? 0;
  let gain = 0;
  for (let offset = 0; offset < 64; offset += 1) {
    const proofThreshold = getAxiomProofThreshold(state, forged + offset);
    if (state.runFlux < proofThreshold) break;
    gain += 1;
  }
  const phaseGate = getLawHeartPhaseGateStatus(state);
  if (phaseGate) {
    gain = Math.min(
      gain,
      Math.max(0, phaseGate.capacity - Math.floor(state.lifetimeAxioms)),
    );
  }
  return gain;
}

export function getRecalibrationBaseThreshold(state: GameState) {
  const worldIndex = getCampaignWorldIndex(state);
  if (worldIndex === 0) {
    return RECALIBRATION_THRESHOLD;
  }
  return safeMultiply(
    RECALIBRATION_THRESHOLD,
    safePower(RECALIBRATION_WORLD_SCALE, worldIndex),
  );
}

function getAxiomProofThreshold(state: GameState, proofIndex: number) {
  const worldIndex = getCampaignWorldIndex(state);
  if (worldIndex === 0) {
    const lawIndex = Math.min(
      COLD_WAKE_LAW_THRESHOLD_SCALE.length - 1,
      Math.max(0, Math.floor(proofIndex)),
    );
    return safeMultiply(
      RECALIBRATION_THRESHOLD,
      COLD_WAKE_LAW_THRESHOLD_SCALE[lawIndex],
    );
  }
  return safeMultiply(
    getRecalibrationBaseThreshold(state),
    safePower(AXIOM_PROOF_GROWTH, Math.max(0, Math.floor(proofIndex))),
  );
}

export function getRecalibrationThreshold(state: GameState) {
  const worldIndex = getCampaignWorldIndex(state);
  const forged = worldIndex === 0
    ? Math.max(
        state.axiomProofsByWorld[0] ?? 0,
        Math.min(3, Math.floor(state.lifetimeAxioms)),
      )
    : state.axiomProofsByWorld[worldIndex] ?? 0;
  return getAxiomProofThreshold(state, forged);
}

export function getAxiomProofStatus(state: GameState) {
  const worldIndex = getCampaignWorldIndex(state);
  const forged = worldIndex === 0
    ? Math.max(
        state.axiomProofsByWorld[0] ?? 0,
        Math.min(3, Math.floor(state.lifetimeAxioms)),
      )
    : state.axiomProofsByWorld[worldIndex] ?? 0;
  const gain = getRecalibrationGain(state);
  const nextThreshold = getAxiomProofThreshold(state, forged);
  const followingThreshold = getAxiomProofThreshold(state, forged + gain);
  return {
    worldIndex,
    forged,
    gain,
    nextThreshold,
    followingThreshold,
    growth: worldIndex === 0 ? null : AXIOM_PROOF_GROWTH,
  };
}

export function recalibrate(state: GameState, now = Date.now()) {
  const gain = getRecalibrationGain(state);
  if (gain < 1) return state;
  const worldIndex = getCampaignWorldIndex(state);
  const fresh = createInitialState(now);
  fresh.axioms = state.axioms + gain;
  fresh.lifetimeAxioms = state.lifetimeAxioms + gain;
  fresh.stellarRelays = state.stellarRelays;
  fresh.cycle = state.cycle + 1;
  fresh.allTimeFlux = state.allTimeFlux;
  fresh.legacyUpgrades = [...state.legacyUpgrades];
  fresh.legacyMatrixRevisionOpen = true;
  fresh.axiomProofsByWorld = [...state.axiomProofsByWorld];
  fresh.axiomProofsByWorld[worldIndex] =
    (fresh.axiomProofsByWorld[worldIndex] ?? 0) + gain;
  fresh.living = cloneLivingFoundryState(state.living);
  fresh.survivors = cloneSurvivorSystemState(state.survivors);
  fresh.research = cloneResearchLatticeState(state.research);
  fresh.researchStock = { ...state.researchStock };
  fresh.researchStock["axiom-proofs"] = Math.min(
    1e12,
    fresh.researchStock["axiom-proofs"] + gain * 8,
  );
  fresh.settlement = cloneSettlementState(state.settlement);
  fresh.defense = cloneDefenseState(state.defense);
  fresh.expeditions = cloneExpeditionState(state.expeditions);
  // The armory is Ark structure: it survives Recalibration like the crew.
  fresh.armory = cloneArmoryState(state.armory);
  fresh.automation = cloneAutomationState(state.automation);
  fresh.planetaryDefense = clonePlanetaryDefenseState(state.planetaryDefense);
  fresh.worldProgress = {
    completedInfrastructureIds: [...state.worldProgress.completedInfrastructureIds],
    completedResearchIds: [...state.worldProgress.completedResearchIds],
    resolvedCrisisIds: [...state.worldProgress.resolvedCrisisIds],
    supplies: { ...state.worldProgress.supplies },
    equipment: { ...state.worldProgress.equipment },
    surveysCompleted: state.worldProgress.surveysCompleted,
    expeditionsCompleted: state.worldProgress.expeditionsCompleted,
    completedExpeditionIds: [...state.worldProgress.completedExpeditionIds],
  };
  fresh.missions = {
    ...state.missions,
    statuses: [...state.missions.statuses],
    baseline: {
      ...state.missions.baseline,
      tierBought: [...state.missions.baseline.tierBought],
    },
  };
  fresh.settings = {
    ...state.settings,
    autoTiers: [...state.settings.autoTiers],
    protocolBlueprint: [...state.settings.protocolBlueprint],
  };
  fresh.manualPulses = state.manualPulses;
  fresh.researchPurchases = state.researchPurchases;
  fresh.playTime = state.playTime;
  const relics = getCampaignRelics(state);
  fresh.tiers[0].bought = Math.min(
    25,
    LEGACY_SEED_TAPS[state.legacyUpgrades[2]] +
      relics.seedTaps +
      Math.min(3, fresh.lifetimeAxioms),
  );
  fresh.tiers[0].amount = fresh.tiers[0].bought;
  return fresh;
}

export function isAutonomyUnlocked(state: GameState) {
  const worldIndex = getCampaignWorldIndex(state);
  const recalibrationAvailable =
    worldIndex >= 1 &&
    (worldIndex >= 2 ||
      state.missions.stageIndex >= PELAGOS_TOW_STAGE ||
      state.cycle > 4);
  return recalibrationAvailable && state.lifetimeAxioms > 3;
}

function runAutomation(state: GameState) {
  let next = state;
  if (next.settings.autoEnabled) {
    for (let index = GENERATORS.length - 1; index >= 0; index -= 1) {
      if (!next.settings.autoTiers[index]) continue;
      next = buyTier(next, index, "1");
    }
  }
  if (next.lifetimeAxioms >= 3 && next.settings.autoUpgrades) {
    for (let index = 0; index < RUN_UPGRADES.length; index += 1) {
      if (
        next.runUpgrades[index] <
        (next.settings.protocolBlueprint[index] ?? 0)
      ) {
        next = buyRunUpgrade(next, index);
      }
    }
  }
  return next;
}

export function getResearchPowerAvailable(state: GameState) {
  const onlineTiers = state.tiers.filter((tier) => tier.amount > 0).length;
  const gridDepth = Math.floor(Math.log10(Math.max(1, state.maxFlux) + 1));
  return Math.min(36, 7 + onlineTiers * 2 + gridDepth);
}

export function getResearchCrewAvailable(state: GameState) {
  const unavailable = getUnavailableResearchCrewIds(state);
  const operators = state.survivors.survivors.filter(
    (survivor) =>
      !unavailable.has(survivor.id) &&
      (isSurvivorOnDuty(survivor, "researcher") ||
        isSurvivorOnDuty(survivor, "technician")),
  ).length;
  return Math.min(8, Math.max(1, operators));
}

function generateResearchStock(state: GameState, elapsedSeconds: number) {
  const seconds = Math.max(0, elapsedSeconds);
  if (seconds <= 0) return;
  const population = state.survivors.survivors.length;
  const children = state.survivors.survivors.filter(
    (survivor) => survivor.ageGroup === "child",
  ).length;
  const elders = state.survivors.survivors.filter(
    (survivor) => survivor.ageGroup === "elder",
  ).length;
  const colonies = state.settlement.colonies.length;
  const production = getProductionSnapshot(state).fluxPerSecond;
  const worldIndex = getCampaignWorldIndex(state);
  const bonuses = getResearchBonuses(state.research);
  const colony = getColonyLegacyEffects(state);
  const expertise = getOperationalResearchExpertise(state);
  const gains: ResearchInputBundle = {
    "calibration-data": seconds * (0.025 + expertise.research * 0.0005),
    "engineering-models":
      seconds *
      Math.min(
        1.5,
        0.03 +
          Math.sqrt(production + 1) / 1_000 +
          expertise.engineering * 0.001 +
          expertise.fabrication * 0.0008,
      ),
    "biological-samples":
      seconds *
      (0.004 +
        expertise.medicine * 0.0018 +
        expertise.ecology * 0.0012 +
        colonies *
          (state.research.completedProjectIds.includes("planetary-epidemiology")
            ? 0.0012
            : 0.0004)),
    "cultural-records":
      seconds *
      (0.006 +
        expertise.education * 0.002 +
        expertise.research * 0.0005 +
        population * 0.00015 +
        children *
          (state.research.completedProjectIds.includes("adaptive-instruction")
            ? 0.0008
            : 0.00035) +
        elders * 0.001 +
        colonies *
          (state.research.completedProjectIds.includes("colony-data-integration")
            ? 0.0025
            : 0.001)),
    // Schematics have NO passive source by design: rescues and
    // expeditions only (owner directive, July 13, 2026).
    schematics: 0,
    "null-traces":
      seconds *
      Math.max(0, worldIndex) *
      0.0015 *
      bonuses.nullSignalMultiplier *
      colony.nullSignalMultiplier,
    "axiom-proofs":
      seconds * Math.sqrt(Math.max(0, state.lifetimeAxioms)) * 0.0005,
  };
  for (const inputId of Object.keys(gains) as Array<keyof ResearchInputBundle>) {
    state.researchStock[inputId] = Math.min(
      1e12,
      state.researchStock[inputId] + gains[inputId],
    );
  }
}

/**
 * Salvage is recovered physical material. It requires either qualified
 * Fabrication/Technical staff or healthy adults working from Ark Reserve;
 * an empty Ark can no longer create Salvage from nothing.
 */
export function getPassiveSalvagePerSecond(state: GameState) {
  const salvageExpertise = state.survivors.survivors.reduce(
    (total, survivor) =>
      total +
      (isSurvivorOnDuty(survivor, "fabricator")
        ? getSurvivorSkillLevel(survivor, "fabricator")
        : 0) +
      (isSurvivorOnDuty(survivor, "technician")
        ? getSurvivorSkillLevel(survivor, "technician") * 0.6
        : 0),
    0,
  );
  const trainingIds = new Set(
    state.survivors.training.map((program) => program.survivorId),
  );
  const deployedIds = getDeployedCrewIds(state.expeditions);
  const reserveAdults = state.survivors.survivors.filter(
    (survivor) =>
      survivor.ageGroup !== "child" &&
      survivor.assignedRole === null &&
      !trainingIds.has(survivor.id) &&
      !deployedIds.has(survivor.id) &&
      survivor.id !== state.bioadaptation.active?.survivorId &&
      !isSurvivorAdmitted(state.survivors, survivor.id) &&
      !isSurvivorWounded(survivor),
  ).length;
  const reserveSupportMultiplier = state.research.completedProjectIds.includes(
    "automated-personnel-logistics",
  )
    ? 1.25 * getActiveAutomationEffects(state).reserveSalvageMultiplier
    : 1;
  return Math.min(
    0.08,
    salvageExpertise * 0.0012 +
      reserveAdults * 0.00075 * reserveSupportMultiplier,
  );
}

export function simulateGame(
  state: GameState,
  elapsedSeconds: number,
  maxSteps = 240,
  advanceMissions = true,
) {
  const capSeconds = getOfflineCapHours(state) * 3_600;
  const seconds = Math.min(capSeconds, Math.max(0, elapsedSeconds));
  if (seconds <= 0) return state;

  const steps = Math.max(
    1,
    Math.min(maxSteps, Math.ceil(seconds / 0.1)),
  );
  const delta = seconds / steps;
  let next = cloneGameState(state);
  const startingTransit = next.transit.active ? { ...next.transit.active } : null;
  const transitMissionDelay = startingTransit
    ? Math.min(
        seconds,
        Math.max(0, startingTransit.totalSeconds - startingTransit.elapsedSeconds),
      )
    : 0;
  if (startingTransit) {
    const transitAdvance = advanceTransit(next.transit, seconds);
    next.transit = transitAdvance.state;
    if (transitAdvance.arrivedWorldId) {
      next.settlement.currentWorldId = transitAdvance.arrivedWorldId;
      next.survivors = setSosBeaconOnline(
        next.survivors,
        false,
        transitAdvance.arrivedWorldId,
      );
    }
  }
  next.living = advanceLivingFoundry(next.living, seconds);
  const survivorBonuses = getResearchBonuses(next.research);
  const colonyBonuses = getColonyLegacyEffects(next);
  const automationEffects = getActiveAutomationEffects(next);
  next.survivors = setTrainingSlots(
    next.survivors,
    Math.min(
      12,
      1 +
        (next.research.completedProjectIds.includes("adaptive-instruction") ? 1 : 0) +
        (next.research.completedProjectIds.includes("clinical-commons") ? 1 : 0) +
        Math.floor(next.survivors.survivors.length / 20),
    ),
  );
  // Team Alpha's doctrine fills empty training slots with idle crew, and
  // the command rating multiplies crew-wide training/XP speed (bounded).
  const unavailableForRoutine = new Set([
    ...getDeployedCrewIds(next.expeditions),
    ...(next.bioadaptation.active ? [next.bioadaptation.active.survivorId] : []),
  ]);
  next.survivors = runTrainingDoctrine(next.survivors, unavailableForRoutine);
  next.survivors = autoAssignSurvivors(next.survivors, unavailableForRoutine);
  const commandMultiplier = getCommandTeamStatus(next).multiplier;
  next.survivors = advanceSurvivorSystem(next.survivors, seconds, {
    trainingSpeedMultiplier:
      survivorBonuses.trainingSpeedMultiplier *
      colonyBonuses.trainingSpeedMultiplier *
      commandMultiplier,
    beaconSpeedMultiplier:
      survivorBonuses.beaconSpeedMultiplier *
      colonyBonuses.beaconSpeedMultiplier,
    onJobXpMultiplier:
      survivorBonuses.trainingSpeedMultiplier *
      colonyBonuses.trainingSpeedMultiplier *
      commandMultiplier,
    constructionSpeedMultiplier: getBerthConstructionSpeed(next),
    medicalOverCapacity:
      getLifeSupportStatus(
        next.survivors,
        [],
        survivorBonuses.habitationCapacityMultiplier,
      ).shortages.medical > 0,
    medicalRecoveryMultiplier:
      getMedicalResearchEffects(next).recoveryMultiplier *
      (getMedBayCarePool(next.survivors) > 0
        ? automationEffects.medicalRecoveryMultiplier
        : 1),
    // Stranded crew shelter off-ship: health frozen, never decaying.
    recoveryExemptIds: next.expeditions.stranded?.crewIds ?? [],
    scanDurationMultiplier: getSurfaceRecon(next).multiplier,
    reservedNames: next.settlement.colonies.flatMap((colony) =>
      colony.founders.map((founder) => founder.name.replace(/\s*“.*$/u, "")),
    ),
  });
  next.survivors = autoAssignSurvivors(next.survivors, unavailableForRoutine);
  autoTransferResearchInputs(next);
  const researchExpertise = getOperationalResearchExpertise(next);
  const researchLead = getResearchLeadStatus(next);
  const fieldValidation = getResearchFieldValidation(next);
  const researchAdvance = advanceResearch(next.research, seconds, {
    powerAvailable: getResearchPowerAvailable(next),
    crewAvailable: getResearchCrewAvailable(next),
    externalSpeedMultiplier: colonyBonuses.researchSpeedMultiplier,
    costMultiplier: getResearchCostMultiplier(next),
    fieldValidationMultiplier: fieldValidation.multiplier,
    automationMultiplier: automationEffects.researchRoutingMultiplier,
    expertise: researchExpertise,
    leadResearcherLevel: researchLead.level,
    exceptionalLeadAvailable: researchLead.exceptional,
  });
  next.research = researchAdvance.state;
  const adaptationAdvance = advanceBioadaptation(
    next.bioadaptation,
    seconds,
    1 + Math.min(0.6, researchExpertise.medicine * 0.03),
  );
  next.bioadaptation = adaptationAdvance.state;
  if (adaptationAdvance.completed && adaptationAdvance.survivorId) {
    const volunteer = next.survivors.survivors.find(
      (survivor) => survivor.id === adaptationAdvance.survivorId,
    );
    if (
      volunteer &&
      !volunteer.bioadaptations.some(
        (record) => record.id === adaptationAdvance.completed!.id,
      ) &&
      volunteer.bioadaptations.length < MAX_BIOADAPTATIONS_PER_SURVIVOR
    ) {
      volunteer.bioadaptations.push(adaptationAdvance.completed);
    }
  }
  // Armory Mark projects use the same offline-safe elapsed time as research.
  // Resources are committed up front; completion is deterministic and cannot
  // be lost by closing the game.
  next.armory = advanceArmoryProject(next.armory, seconds);
  runAutomatedEquipmentMaintenance(next, seconds);
  next.worldProgress = {
    ...next.worldProgress,
    completedResearchIds: [
      ...new Set([
        ...next.worldProgress.completedResearchIds,
        ...next.research.completedProjectIds,
      ]),
    ],
  };
  generateResearchStock(next, seconds);
  next.living.salvage = Math.min(
    1e12,
    next.living.salvage + seconds * getPassiveSalvagePerSecond(next),
  );

  const applyDefenseSegment = (
    duration: number,
    environment: DefenseEnvironment | null,
    hostilesEnabled: boolean,
  ) => {
    if (duration <= 0) return;
    const defenseAdvance = advanceDefense(next.defense, duration, {
      environment,
      stormsEnabled: environment !== null,
      hostilesEnabled,
      beaconOnline: next.survivors.beaconOnline,
      worldIndex: getCampaignWorldIndex(next),
      constructionSpeedMultiplier:
        automationEffects.constructionSpeedMultiplier *
        (1 + Math.min(0.5, getAssignedEngineeringExpertise(next) * 0.025)),
      ...getDefenseCrewContext(next),
    });
    next.defense = defenseAdvance.state;
    next.living.salvage = Math.min(
      1e12,
      next.living.salvage + defenseAdvance.salvage,
    );
    next.researchStock["engineering-models"] = Math.min(
      1e12,
      next.researchStock["engineering-models"] + defenseAdvance.engineeringModels,
    );
    next.researchStock["calibration-data"] = Math.min(
      1e12,
      next.researchStock["calibration-data"] + defenseAdvance.calibrationData,
    );
    next.researchStock["null-traces"] = Math.min(
      1e12,
      next.researchStock["null-traces"] + defenseAdvance.nullTraces,
    );
    for (const event of defenseAdvance.resolvedEvents) {
      for (const wound of event.injuries) {
        const survivor = next.survivors.survivors.find(
          (candidate) => candidate.id === wound.crewId,
        );
        if (!survivor) continue;
        applySurvivorWound(survivor, wound.damage, wound.injuryTier);
        if (isSurvivorWounded(survivor)) survivor.assignedRole = null;
      }
    }
  };

  if (startingTransit) {
    const routeWorldIndex = getCampaignWorld(
      startingTransit.destinationWorldId,
    )?.chapter ?? 0;
    applyDefenseSegment(
      transitMissionDelay,
      "transit",
      routeWorldIndex >= 4 || next.defense.firstContactResolved,
    );
    const orbitalSeconds = Math.max(0, seconds - transitMissionDelay);
    if (orbitalSeconds > 0) {
      applyDefenseSegment(
        orbitalSeconds,
        defenseEnvironmentForWorldId(startingTransit.destinationWorldId),
        routeWorldIndex >= 4 || next.defense.firstContactResolved,
      );
    }
  } else {
    applyDefenseSegment(
      seconds,
      getDefenseEnvironment(next),
      isHostileThreatOperationsActivated(next),
    );
  }

  next.planetaryDefense = syncPlanetaryDefenseNetworks(
    next.planetaryDefense,
    next.settlement.colonies,
  );
  const planetaryAdvance = advancePlanetaryDefense(
    next.planetaryDefense,
    seconds,
    {
      threatsEnabled: isPlanetaryDefenseActivated(next),
      worldIndex: getCampaignWorldIndex(next),
      constructionSpeedMultiplier: automationEffects.constructionSpeedMultiplier,
      engineerExpertise: getAssignedEngineeringExpertise(next),
    },
  );
  next.planetaryDefense = planetaryAdvance.state;
  next.living.salvage = Math.min(
    1e12,
    next.living.salvage + planetaryAdvance.salvage,
  );
  next.researchStock["engineering-models"] = Math.min(
    1e12,
    next.researchStock["engineering-models"] + planetaryAdvance.engineeringModels,
  );
  next.researchStock["cultural-records"] = Math.min(
    1e12,
    next.researchStock["cultural-records"] + planetaryAdvance.culturalRecords,
  );
  next.researchStock["null-traces"] = Math.min(
    1e12,
    next.researchStock["null-traces"] + planetaryAdvance.nullTraces,
  );

  if (
    next.survivors.activeSignal &&
    next.survivors.autoRescueEnabled &&
    hasRescueDetail(next)
  ) {
    const autoRescued = performArkRescue(next);
    if (autoRescued !== next) next = autoRescued;
  }

  const expeditionAdvance = advanceExpeditions(
    next.expeditions,
    seconds,
    next.settlement.currentWorldId,
    getExpeditionResearchSupport(next).rewardMultiplier,
  );
  next.expeditions = expeditionAdvance.state;
  if (expeditionAdvance.completed) {
    const completed = expeditionAdvance.completed;
    const completedSite = getExpeditionSite(completed.siteId);
    next.living = grantLivingFoundryRewards(next.living, {
      salvage: completed.salvage,
      loreIds: completed.discoveryId ? [completed.discoveryId] : [],
    });
    next.researchStock["schematics"] = Math.min(
      1e12,
      next.researchStock["schematics"] + completed.schematics,
    );
    next.researchStock["null-traces"] = Math.min(
      1e12,
      next.researchStock["null-traces"] + completed.nullTraces,
    );
    next.researchStock["engineering-models"] = Math.min(
      1e12,
      next.researchStock["engineering-models"] + completed.engineeringModels,
    );
    next.researchStock["biological-samples"] = Math.min(
      1e12,
      next.researchStock["biological-samples"] + completed.biologicalSamples,
    );
    next.researchStock["cultural-records"] = Math.min(
      1e12,
      next.researchStock["cultural-records"] + completed.culturalRecords,
    );
    if (
      completed.outcome === "success" &&
      !completedSite.repeatable &&
      completedSite.worldId === next.settlement.currentWorldId
    ) {
      next.worldProgress = {
        ...next.worldProgress,
        completedExpeditionIds: [
          ...new Set([
            ...next.worldProgress.completedExpeditionIds,
            completed.siteId,
          ]),
        ],
      };
    }
    if (completed.surveyCredited) {
      next.worldProgress = {
        ...next.worldProgress,
        surveysCompleted: next.worldProgress.surveysCompleted + 1,
      };
    }
    // Successful missions chart the world, speeding up future SOS scans.
    if (
      (completed.outcome === "success" || completed.outcome === "lean") &&
      next.settlement.currentWorldId !== null
    ) {
      next.worldProgress = {
        ...next.worldProgress,
        expeditionsCompleted: next.worldProgress.expeditionsCompleted + 1,
      };
    }
    if (completed.outcome === "distress") {
      // The party is stranded at critical health with a permanent injury;
      // their gear stays with them (returned by rescue, lost by abandonment).
      for (const wound of completed.wounds) {
        const survivor = next.survivors.survivors.find(
          (candidate) => candidate.id === wound.crewId,
        );
        if (!survivor) continue;
        applyStrandedCondition(
          survivor,
          wound.strandedHealth ?? 10,
          wound.injuryTier,
        );
      }
    } else {
      for (const wound of completed.wounds) {
        const survivor = next.survivors.survivors.find(
          (candidate) => candidate.id === wound.crewId,
        );
        if (!survivor) continue;
        applySurvivorWound(survivor, wound.damage, wound.injuryTier);
      }
      // Armor that absorbed a setback hit returns one durability lower.
      next.armory = returnExpeditionGear(
        next.armory,
        completed.loadout,
        new Set(completed.wounds.map((wound) => wound.crewId)),
      );
      if (completed.outcome === "rescue") {
        // The stranded party's gear comes home with them; every piece of
        // their armor absorbed the distress hit.
        next.armory = returnExpeditionGear(
          next.armory,
          completed.strandedLoadout,
          new Set(completed.rescuedCrewIds),
        );
        for (const crewId of completed.crewIds) {
          const survivor = next.survivors.survivors.find(
            (candidate) => candidate.id === crewId,
          );
          if (!survivor || survivor.role === "civilian") continue;
          survivor.skillXp[survivor.role] = Math.min(
            1_000_000_000,
            survivor.skillXp[survivor.role] + RESCUE_XP_PER_MEMBER,
          );
        }
      } else {
        for (const crewId of completed.crewIds) {
          const survivor = next.survivors.survivors.find(
            (candidate) => candidate.id === crewId,
          );
          if (!survivor || survivor.role === "civilian") continue;
          survivor.skillXp[survivor.role] = Math.min(
            1_000_000_000,
            survivor.skillXp[survivor.role] +
              getExpeditionMemberXp(
                completedSite,
                survivor.role,
                completed.outcome,
              ),
          );
        }
      }
    }
  }

  for (let step = 0; step < steps; step += 1) {
    const snapshot = getProductionSnapshot(next);
    // Additive economy: machines produce Flux only. No tier ever
    // manufactures another tier, so offline gain is strictly linear.
    const fluxGain = safeMultiply(snapshot.fluxPerSecond, delta);

    next.flux = safeAdd(next.flux, fluxGain);
    next.maxFlux = Math.max(next.maxFlux, next.flux);
    next.runFlux = safeAdd(next.runFlux, fluxGain);
    next.allTimeFlux = safeAdd(next.allTimeFlux, fluxGain);

    next.playTime += delta;
    next.runTime += delta;

    const stepStart = step * delta;
    const stepEnd = stepStart + delta;
    const missionDelta = Math.max(
      0,
      stepEnd - Math.max(stepStart, transitMissionDelay),
    );
    if (advanceMissions && missionDelta > 0) {
      next = advanceMission(next, missionDelta);
    }

    if (
      isAutonomyUnlocked(next) &&
      (next.settings.autoEnabled || next.settings.autoUpgrades)
    ) {
      next.autoTimer += delta;
      const passes = Math.min(8, Math.floor(next.autoTimer));
      if (passes > 0) {
        next.autoTimer %= 1;
        for (let pass = 0; pass < passes; pass += 1) {
          next = runAutomation(next);
        }
      }
    }
  }
  return next;
}

export function setBuyMode(state: GameState, mode: PurchaseMode) {
  const next = cloneGameState(state);
  next.settings.buyMode = mode;
  return next;
}

export function setTutorialComplete(state: GameState, complete: boolean) {
  const next = cloneGameState(state);
  next.settings.tutorialComplete = complete;
  if (complete) {
    next.living = grantLivingFoundryRewards(next.living, {
      loreIds: syncAutomaticDiscoveries(
        next.living.discoveredLore,
        next.missions.worldsSaved,
        true,
      ),
    });
  }
  return next;
}

export function setContinuityIntroduced(state: GameState, introduced = true) {
  const next = cloneGameState(state);
  next.settings.continuityIntroduced = introduced;
  return next;
}

export type InterfaceIntroductionId =
  | "continuity"
  | "foundry"
  | "ark-overview"
  | "departure"
  | "personnel"
  | "expeditions"
  | "research";

export function setInterfaceIntroduction(
  state: GameState,
  id: InterfaceIntroductionId,
  introduced = true,
) {
  const next = cloneGameState(state);
  if (id === "continuity") next.settings.continuityIntroduced = introduced;
  if (id === "foundry") next.settings.foundryIntroduced = introduced;
  if (id === "ark-overview") next.settings.arkOverviewIntroduced = introduced;
  if (id === "departure") next.settings.departureIntroduced = introduced;
  if (id === "personnel") next.settings.personnelIntroduced = introduced;
  if (id === "expeditions") {
    const handoffId = "interface-expeditions";
    next.settings.completedGuideIds = introduced
      ? [...new Set([...next.settings.completedGuideIds, handoffId])]
      : next.settings.completedGuideIds.filter((guideId) => guideId !== handoffId);
  }
  if (id === "research") next.settings.researchIntroduced = introduced;
  return next;
}

export function setColdWakeForecastReviewed(state: GameState, reviewed = true) {
  const next = cloneGameState(state);
  next.settings.coldWakeForecastReviewed = reviewed;
  return next;
}

export function setGuideCompleted(
  state: GameState,
  guideId: string,
  completed = true,
) {
  const next = cloneGameState(state);
  next.settings.completedGuideIds = completed
    ? [...new Set([...next.settings.completedGuideIds, guideId])]
    : next.settings.completedGuideIds.filter((id) => id !== guideId);
  return next;
}

export function acknowledgeNextMission(state: GameState) {
  if (!state.missions.awaitingAcknowledgement) return state;
  const next = cloneGameState(state);
  const resolvedIndex = Math.max(0, next.missions.currentIndex - 1);
  const resolvedMission = MISSIONS[resolvedIndex];
  const landingFlux = resolvedMission?.landingFlux ?? 0;

  next.flux = landingFlux;
  next.maxFlux = landingFlux;
  next.runFlux = 0;
  next.runTime = 0;
  next.autoTimer = 0;
  next.tiers = GENERATORS.map(() => ({ amount: 0, bought: 0 }));
  next.runUpgrades = RUN_UPGRADES.map(() => 0);
  const relics = getCampaignRelics(next);
  next.tiers[0].bought = Math.min(
    25,
    LEGACY_SEED_TAPS[next.legacyUpgrades[2]] + relics.seedTaps,
  );
  next.tiers[0].amount = next.tiers[0].bought;
  next.missions.awaitingAcknowledgement = false;
  next.missions.stageIndex = 0;
  next.missions.holdTime = 0;
  next.missions.contributedFlux = 0;
  if (MISSIONS[next.missions.currentIndex]) {
    next.missions.statuses[next.missions.currentIndex] = "active";
  }
  next.missions.baseline = captureMissionBaseline(next);
  return next;
}

export function setAutoEnabled(state: GameState, enabled: boolean) {
  if (enabled && !isAutonomyUnlocked(state)) return state;
  const next = cloneGameState(state);
  next.settings.autoEnabled = enabled;
  return next;
}

export function setAutoUpgrades(state: GameState, enabled: boolean) {
  if (enabled && !isAutonomyUnlocked(state)) return state;
  const next = cloneGameState(state);
  next.settings.autoUpgrades = enabled;
  return next;
}

export function setProtocolBlueprintLevel(
  state: GameState,
  index: number,
  level: number,
) {
  const upgrade = RUN_UPGRADES[index];
  if (!upgrade || !isRunUpgradeUnlocked(state, index)) return state;
  const next = cloneGameState(state);
  next.settings.protocolBlueprint[index] = Math.min(
    upgrade.maxLevel,
    Math.max(0, Math.floor(level)),
  );
  return next;
}

export function setAutoTier(state: GameState, index: number, enabled: boolean) {
  const next = cloneGameState(state);
  next.settings.autoTiers[index] = enabled;
  return next;
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value) || value >= MAX_VALUE) return "1.00e280";
  if (value === 0) return "0";
  if (value < 0.01) return value.toExponential(2).replace("+", "");
  if (value < 1_000) {
    return value < 10
      ? value.toFixed(2).replace(/\.00$/, "")
      : value.toFixed(1).replace(/\.0$/, "");
  }
  const suffixes = ["K", "M", "B", "T", "Qa"];
  const exponent = Math.floor(Math.log10(value));
  const group = Math.floor(exponent / 3);
  if (group >= 1 && group <= suffixes.length) {
    return `${(value / Math.pow(1_000, group)).toFixed(2)}${suffixes[group - 1]}`;
  }
  return value.toExponential(2).replace("+", "");
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const remainder = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}
