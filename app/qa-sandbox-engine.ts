import {
  GENERATORS,
  LEGACY_UPGRADES,
  MAX_VALUE,
  MISSIONS,
  COLD_WAKE_FOUNDRY_STAGE,
  RUN_UPGRADES,
  createInitialState,
  sanitizeGameState,
  simulateGame,
  type GameState,
} from "./game-engine.ts";
import {
  CAMPAIGN_WORLD_IDS,
  getCampaignWorld,
  type CampaignWorldId,
} from "./campaign-content.ts";
import {
  RESEARCH_PROJECT_DEFINITIONS,
  createResearchLatticeState,
  getResearchProjectDefinition,
  getResearchProjectEra,
} from "./research-engine.ts";
import {
  advanceSurvivorSystem,
  autoAssignSurvivors,
  createSurvivorSystemState,
  rescueSurvivorSignal,
  setLifeSupportCapacity,
  setSosBeaconOnline,
} from "./survivor-engine.ts";
import { CONTEXT_GUIDES } from "./story-content.ts";

export const QA_SAVE_KEY = "axiom-foundry-qa-sandbox-v1";
export const QA_QUERY_PARAMETER = "qa";
export const QA_RESOURCE_GRANT = 1_000_000_000_000_000;
export const QA_RESEARCH_EVIDENCE_GRANT = 1_000_000_000_000;

const RESEARCH_ERA_ORDER = ["recovery", "integration", "synthesis", "convergence"] as const;
// A world-opening checkpoint carries only work that could have been completed
// before the selected arrival. Viridia introduces Research, so its opening is
// deliberately still empty rather than arriving with the Recovery era solved.
const WORLD_RESEARCH_ERA = [-1, -1, -1, 0, 1, 2] as const;
const WORLD_OPENING_AXIOMS = [0, 3, 5, 8, 12, 17] as const;
const WORLD_OPENING_CREW = [0, 0, 16, 19, 22, 25] as const;
const ALL_CONTEXT_GUIDE_IDS = Object.keys(CONTEXT_GUIDES);
const RESEARCH_INPUT_IDS = [
  "calibration-data",
  "engineering-models",
  "biological-samples",
  "cultural-records",
  "schematics",
  "null-traces",
  "axiom-proofs",
] as const;

const createQaResearchInputs = (amount = QA_RESOURCE_GRANT) =>
  Object.fromEntries(
    RESEARCH_INPUT_IDS.map((id) => [id, amount]),
  ) as GameState["researchStock"];

function createQaCrew(worldIndex: number) {
  if (worldIndex <= 1) return createSurvivorSystemState(0x41_58_49_4f);
  const target = WORLD_OPENING_CREW[worldIndex] ?? WORLD_OPENING_CREW.at(-1)!;
  const worldId = CAMPAIGN_WORLD_IDS[Math.max(1, worldIndex)] as Exclude<CampaignWorldId, "cold-wake">;
  let crew = createSurvivorSystemState(0x41_58_49_4f + worldIndex);
  crew.berthSections = Math.min(6, worldIndex + 1);
  crew.trainingSlots = Math.min(6, worldIndex + 1);
  const supportCapacity = Math.min(48, 20 + worldIndex * 6);
  crew = setLifeSupportCapacity(crew, {
    atmosphere: supportCapacity,
    water: supportCapacity,
    nutrition: supportCapacity,
    medical: supportCapacity,
  });
  crew = setSosBeaconOnline(crew, true, worldId);

  for (let attempt = 0; attempt < 30 && crew.survivors.length < target; attempt += 1) {
    crew = advanceSurvivorSystem(crew, 7 * 24 * 3_600, { beaconSpeedMultiplier: 10 });
    if (!crew.activeSignal) continue;
    crew = rescueSurvivorSignal(crew, QA_RESOURCE_GRANT).state;
  }

  // These are credible returning crew, not a continuity-clearing strike team.
  // The dedicated Max trained skills override remains available for that.
  const level = Math.min(4, Math.max(1, worldIndex - 1));
  const skillXp = Math.pow(Math.max(0, level - 1), 2) * 120;
  crew.survivors = crew.survivors.map((survivor) => ({
    ...survivor,
    health: 100,
    injury: null,
    skillXp: {
      ...survivor.skillXp,
      ...(survivor.role !== "civilian" ? { [survivor.role]: skillXp } : {}),
    },
  }));
  return autoAssignSurvivors(crew, new Set(), true);
}

function completedResearchForWorld(worldIndex: number) {
  const eraIndex = WORLD_RESEARCH_ERA[worldIndex] ?? 3;
  if (eraIndex < 0) return [];
  return RESEARCH_PROJECT_DEFINITIONS
    .filter((project) => RESEARCH_ERA_ORDER.indexOf(getResearchProjectEra(project)) <= eraIndex)
    .map((project) => project.id);
}

function completedColonies(worldIndex: number, now: number) {
  return CAMPAIGN_WORLD_IDS.slice(0, worldIndex)
    .map((worldId, index) => {
      const world = getCampaignWorld(worldId);
      if (!world || world.kind !== "planet") return null;
      return {
        worldId,
        name: `${world.name} QA Settlement`,
        establishedAt: now - (worldIndex - index) * 86_400_000,
        viabilityScore: 100,
        founders: [],
        legacyBenefitIds: world.legacyBenefits.map((benefit) => benefit.id),
        transmissionsRead: world.transmissions.length,
      };
    })
    .filter((colony): colony is NonNullable<typeof colony> => colony !== null);
}

function openingGuideIds(worldIndex: number) {
  if (worldIndex === 1) {
    return ALL_CONTEXT_GUIDE_IDS.filter(
      (id) => !id.startsWith("pelagos-") && id !== "viridia-research",
    );
  }
  if (worldIndex === 2) {
    return ALL_CONTEXT_GUIDE_IDS.filter((id) => id !== "viridia-research");
  }
  return [...ALL_CONTEXT_GUIDE_IDS];
}

function earnedSalvageAtWorldOpening(worldIndex: number) {
  let salvage = 35;
  for (let index = 0; index < worldIndex; index += 1) {
    const stageCount = MISSIONS[index]?.stages.length ?? 0;
    const stageRewards = 6 * (index + 1) * stageCount * (stageCount + 1) / 2;
    salvage += stageRewards + 30 * (index + 1);
  }
  return salvage;
}

export function createQaCheckpoint(worldIndex: number, now = Date.now()): GameState {
  const index = Math.max(0, Math.min(MISSIONS.length - 1, Math.floor(worldIndex)));
  const worldId = CAMPAIGN_WORLD_IDS[index];
  const base = createInitialState(now);
  const researchIds = completedResearchForWorld(index);
  const survivors = createQaCrew(index);
  const openingFlux = index > 0 ? MISSIONS[index - 1]?.landingFlux ?? 0 : 0;
  const seedTaps = index >= 5 ? 5 : 0;
  const startingTiers = GENERATORS.map((_, tierIndex) => {
    const bought = tierIndex === 0 ? seedTaps : 0;
    return { amount: bought, bought };
  });
  const startingAxioms = WORLD_OPENING_AXIOMS[index] ?? WORLD_OPENING_AXIOMS.at(-1)!;
  const startingCycle = startingAxioms + 1;

  return sanitizeGameState({
    ...base,
    flux: openingFlux,
    maxFlux: openingFlux,
    runFlux: 0,
    allTimeFlux: openingFlux,
    axioms: startingAxioms,
    lifetimeAxioms: startingAxioms,
    stellarRelays: index,
    cycle: startingCycle,
    manualPulses: 0,
    researchPurchases: 0,
    tiers: startingTiers,
    runUpgrades: RUN_UPGRADES.map(() => 0),
    legacyUpgrades: LEGACY_UPGRADES.map(() => 0),
    missions: {
      ...base.missions,
      currentIndex: index,
      statuses: MISSIONS.map((_, missionIndex) => missionIndex < index ? "saved" : missionIndex === index ? "active" : "locked"),
      worldsSaved: index,
      baseline: {
        manualPulses: 0,
        tierBought: startingTiers.map((tier) => tier.bought),
        researchLevels: 0,
        researchPurchases: 0,
        cycle: startingCycle,
        lifetimeAxioms: startingAxioms,
      },
    },
    living: {
      ...base.living,
      salvage: earnedSalvageAtWorldOpening(index),
    },
    survivors,
    research: {
      ...base.research,
      assignedCrew: Math.min(6, survivors.survivors.filter((survivor) => survivor.assignedRole === "researcher").length),
      completedProjectIds: researchIds,
    },
    settlement: {
      ...base.settlement,
      currentWorldId: worldId,
      completedWorldIds: CAMPAIGN_WORLD_IDS.slice(0, index),
      colonies: completedColonies(index, now),
    },
    defense: index >= 4 ? {
      ...base.defense,
      installations: { shieldArray: 1, pointDefense: 1, repairDrones: 1, earlyWarningRelay: 1 },
      firstContactResolved: index >= 5,
    } : base.defense,
    settings: {
      ...base.settings,
      tutorialComplete: true,
      continuityIntroduced: index > 0,
      coldWakeForecastReviewed: index > 0,
      foundryIntroduced: index > 0,
      arkOverviewIntroduced: index > 0,
      departureIntroduced: index > 0,
      personnelIntroduced: index >= 2,
      researchIntroduced: index >= 3,
      completedGuideIds: openingGuideIds(index),
      autoEnabled: false,
      autoUpgrades: false,
      buyMode: "1",
    },
  }, now);
}

export function createQaPlanetIntroductionCheckpoint(now = Date.now()): GameState {
  const base = createQaCheckpoint(0, now);
  const tiers = base.tiers.map((tier, index) =>
    index === 0 ? { amount: 50, bought: 50 } : tier,
  );
  return sanitizeGameState({
    ...base,
    axioms: 3,
    lifetimeAxioms: 3,
    cycle: 4,
    manualPulses: 12,
    tiers,
    missions: {
      ...base.missions,
      stageIndex: COLD_WAKE_FOUNDRY_STAGE,
      awaitingAcknowledgement: false,
      baseline: {
        ...base.missions.baseline,
        manualPulses: 12,
        tierBought: tiers.map((tier) => tier.bought),
        cycle: 4,
        lifetimeAxioms: 3,
      },
    },
    settings: {
      ...base.settings,
      tutorialComplete: true,
      continuityIntroduced: false,
      coldWakeForecastReviewed: false,
      foundryIntroduced: false,
      arkOverviewIntroduced: false,
      departureIntroduced: false,
      personnelIntroduced: false,
      researchIntroduced: false,
      completedGuideIds: ["cold-wake-automation", "cold-wake-recalibration"],
    },
  }, now);
}

export function createQaPelagosOnboardingCheckpoint(now = Date.now()): GameState {
  const base = createQaCheckpoint(1, now);
  let survivors = createSurvivorSystemState(0x50_45_4c_41);
  survivors.berthSections = 2;
  survivors = setLifeSupportCapacity(survivors, {
    atmosphere: 12,
    water: 12,
    nutrition: 12,
    medical: 12,
  });
  return sanitizeGameState({
    ...base,
    survivors,
    research: createInitialState(now).research,
    settings: {
      ...base.settings,
      personnelIntroduced: false,
      researchIntroduced: false,
      completedGuideIds: ALL_CONTEXT_GUIDE_IDS.filter(
        (id) => !id.startsWith("pelagos-"),
      ),
    },
  }, now);
}

export function createQaResearchIntroductionCheckpoint(now = Date.now()): GameState {
  const base = createQaCheckpoint(2, now);
  const freshResearch = createInitialState(now).research;
  return sanitizeGameState({
    ...base,
    research: freshResearch,
    settings: {
      ...base.settings,
      researchIntroduced: false,
      completedGuideIds: ALL_CONTEXT_GUIDE_IDS.filter((id) => id !== "viridia-research"),
    },
  }, now);
}

export function grantQaResources(state: GameState): GameState {
  const inventory = createQaResearchInputs();
  return sanitizeGameState({
    ...state,
    flux: QA_RESOURCE_GRANT,
    maxFlux: Math.max(state.maxFlux, QA_RESOURCE_GRANT),
    runFlux: Math.max(state.runFlux, QA_RESOURCE_GRANT),
    allTimeFlux: Math.max(state.allTimeFlux, QA_RESOURCE_GRANT),
    axioms: 10_000,
    lifetimeAxioms: Math.max(state.lifetimeAxioms, 10_000),
    living: { ...state.living, salvage: 1_000_000_000, cohesion: 100 },
    researchStock: inventory,
    research: { ...state.research, inventory },
  });
}

export function resetQaResearch(state: GameState): GameState {
  return sanitizeGameState({
    ...state,
    research: createResearchLatticeState(),
  });
}

export function stockQaResearchEvidence(state: GameState): GameState {
  return sanitizeGameState({
    ...state,
    researchStock: createQaResearchInputs(QA_RESEARCH_EVIDENCE_GRANT),
  });
}

export function fillQaResearchLattice(state: GameState): GameState {
  return sanitizeGameState({
    ...state,
    research: {
      ...state.research,
      inventory: createQaResearchInputs(),
    },
  });
}

export function addQaFlux(state: GameState, requestedAmount: number): GameState {
  const amount = requestedAmount === Number.POSITIVE_INFINITY
    ? MAX_VALUE
    : Math.min(MAX_VALUE, Math.max(0, requestedAmount));
  if (!Number.isFinite(amount) || amount <= 0) return state;
  const add = (current: number) => Math.min(MAX_VALUE, current + amount);
  return sanitizeGameState({
    ...state,
    flux: add(state.flux),
    maxFlux: add(state.maxFlux),
    runFlux: add(state.runFlux),
    allTimeFlux: add(state.allTimeFlux),
  });
}

export function completeQaResearch(state: GameState): GameState {
  const repeatCounts = Object.fromEntries(
    RESEARCH_PROJECT_DEFINITIONS.filter((project) => project.repeatable).map((project) => [
      project.id,
      project.repeatable!.maxCompletions,
    ]),
  );
  const unlockedEchoIds = RESEARCH_PROJECT_DEFINITIONS.flatMap((project) =>
    project.nullEchoId ? [project.nullEchoId] : [],
  );
  return sanitizeGameState({
    ...state,
    research: {
      ...state.research,
      activeProjectId: null,
      completedProjectIds: RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id),
      progress: {},
      repeatCounts,
      unlockedEchoIds,
      lastAdvancedAt: null,
    },
  });
}

export function completeQaActiveResearch(state: GameState): GameState {
  const activeProjectId = state.research.activeProjectId;
  if (!activeProjectId) return state;
  const project = getResearchProjectDefinition(activeProjectId);
  if (!project) return state;
  const completedProjectIds = state.research.completedProjectIds.includes(activeProjectId)
    ? state.research.completedProjectIds
    : [...state.research.completedProjectIds, activeProjectId];
  const repeatCounts = project.repeatable
    ? {
        ...state.research.repeatCounts,
        [activeProjectId]: Math.min(
          project.repeatable.maxCompletions,
          (state.research.repeatCounts[activeProjectId] ?? 0) + 1,
        ),
      }
    : state.research.repeatCounts;
  const unlockedEchoIds =
    project.nullEchoId && !state.research.unlockedEchoIds.includes(project.nullEchoId)
      ? [...state.research.unlockedEchoIds, project.nullEchoId]
      : state.research.unlockedEchoIds;
  return sanitizeGameState({
    ...state,
    research: {
      ...state.research,
      activeProjectId: null,
      completedProjectIds,
      progress: { ...state.research.progress, [activeProjectId]: 1 },
      repeatCounts,
      unlockedEchoIds,
      lastAdvancedAt: null,
    },
  });
}

export function boostQaCrew(state: GameState): GameState {
  const skillXp = Math.pow(9, 2) * 120;
  return sanitizeGameState({
    ...state,
    survivors: {
      ...state.survivors,
      survivors: state.survivors.survivors.map((survivor) => ({
        ...survivor,
        health: 100,
        injury: null,
        skillXp: Object.fromEntries(Object.entries(survivor.skillXp).map(([role, xp]) => [
          role,
          xp > 0 || survivor.role === role ? skillXp : 0,
        ])),
      })),
    },
  });
}

export function prepareQaContinuity(state: GameState): GameState {
  const world = state.settlement.currentWorldId ? getCampaignWorld(state.settlement.currentWorldId) : null;
  if (!world) return state;
  return sanitizeGameState({
    ...state,
    missions: { ...state.missions, awaitingAcknowledgement: true },
    worldProgress: {
      completedInfrastructureIds: world.infrastructure.map((objective) => objective.id),
      completedResearchIds: world.requiredResearchIds,
      resolvedCrisisIds: world.crisisIds,
      supplies: Object.fromEntries(world.supplyRequirements.map((requirement) => [requirement.id, requirement.amount])),
      equipment: Object.fromEntries(world.equipment.map((equipment) => [equipment.id, equipment.maxUnits])),
      surveysCompleted: world.surveysRequired,
      expeditionsCompleted: Math.max(world.surveysRequired, world.requiredExpeditionIds.length),
      completedExpeditionIds: [...world.requiredExpeditionIds],
    },
  });
}

export function simulateQaOfflineDay(state: GameState): GameState {
  const next = simulateGame(state, 24 * 3_600, 720, false);
  next.lastSaved = Date.now();
  return next;
}
