import {
  GENERATORS,
  LEGACY_UPGRADES,
  MAX_VALUE,
  MISSIONS,
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

export const QA_SAVE_KEY = "axiom-foundry-qa-sandbox-v1";
export const QA_QUERY_PARAMETER = "qa";
export const QA_RESOURCE_GRANT = 1_000_000_000_000_000;

const RESEARCH_ERA_ORDER = ["recovery", "integration", "synthesis", "convergence"] as const;
const WORLD_RESEARCH_ERA = [-1, 0, 0, 1, 2, 3] as const;
const RESEARCH_INPUT_IDS = [
  "calibration-data",
  "engineering-models",
  "biological-samples",
  "cultural-records",
  "schematics",
  "null-traces",
  "axiom-proofs",
] as const;

function createQaCrew(worldIndex: number) {
  if (worldIndex === 0) return createSurvivorSystemState(0x41_58_49_4f);
  const target = Math.min(40, 14 + worldIndex * 5);
  const worldId = CAMPAIGN_WORLD_IDS[Math.max(1, worldIndex)] as Exclude<CampaignWorldId, "cold-wake">;
  let crew = createSurvivorSystemState(0x41_58_49_4f + worldIndex);
  crew.berthSections = 6;
  crew.trainingSlots = 12;
  crew = setLifeSupportCapacity(crew, {
    atmosphere: 48,
    water: 48,
    nutrition: 48,
    medical: 48,
  });
  crew = setSosBeaconOnline(crew, true, worldId);

  for (let attempt = 0; attempt < 30 && crew.survivors.length < target; attempt += 1) {
    crew = advanceSurvivorSystem(crew, 7 * 24 * 3_600, { beaconSpeedMultiplier: 10 });
    if (!crew.activeSignal) continue;
    crew = rescueSurvivorSignal(crew, QA_RESOURCE_GRANT).state;
  }

  const level = Math.min(8, 2 + worldIndex);
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

export function createQaCheckpoint(worldIndex: number, now = Date.now()): GameState {
  const index = Math.max(0, Math.min(MISSIONS.length - 1, Math.floor(worldIndex)));
  const worldId = CAMPAIGN_WORLD_IDS[index];
  const base = createInitialState(now);
  const researchIds = completedResearchForWorld(index);
  const stockedInputs = Object.fromEntries(RESEARCH_INPUT_IDS.map((id) => [id, 250_000])) as GameState["researchStock"];
  const survivors = createQaCrew(index);
  const startingTiers = GENERATORS.map((_, tierIndex) => {
    const bought = index > 0 && tierIndex === 0 ? 25 : 0;
    return { amount: bought, bought };
  });
  const startingAxioms = index === 0 ? 0 : 250;
  const startingCycle = index === 0 ? 1 : 8;

  return sanitizeGameState({
    ...base,
    flux: QA_RESOURCE_GRANT,
    maxFlux: QA_RESOURCE_GRANT,
    runFlux: QA_RESOURCE_GRANT,
    allTimeFlux: QA_RESOURCE_GRANT,
    axioms: startingAxioms,
    lifetimeAxioms: startingAxioms,
    stellarRelays: index,
    cycle: startingCycle,
    manualPulses: 0,
    researchPurchases: 0,
    tiers: startingTiers,
    runUpgrades: RUN_UPGRADES.map(() => 0),
    legacyUpgrades: LEGACY_UPGRADES.map(() => 5),
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
      salvage: 1_000_000,
      cohesion: 100,
      rooms: base.living.rooms.map((room) => ({ ...room, unlocked: true, level: 5 })),
    },
    survivors,
    research: {
      ...base.research,
      assignedCrew: Math.min(6, survivors.survivors.filter((survivor) => survivor.assignedRole === "researcher").length),
      inventory: stockedInputs,
      completedProjectIds: researchIds,
    },
    researchStock: stockedInputs,
    settlement: {
      ...base.settlement,
      currentWorldId: worldId,
      completedWorldIds: CAMPAIGN_WORLD_IDS.slice(0, index),
      colonies: completedColonies(index, now),
    },
    expeditions: {
      ...base.expeditions,
      stats: { ...base.expeditions.stats, launched: index * 2, completed: index * 2 },
    },
    defense: index >= 3 ? {
      ...base.defense,
      installations: { shieldArray: 1, pointDefense: 1, repairDrones: 1, earlyWarningRelay: 1 },
      firstContactResolved: index >= 4,
    } : base.defense,
    settings: {
      ...base.settings,
      tutorialComplete: true,
      continuityIntroduced: index > 0,
      autoEnabled: true,
      autoUpgrades: true,
      buyMode: "max",
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
      stageIndex: MISSIONS[0].stages.length - 1,
      awaitingAcknowledgement: true,
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
    },
  }, now);
}

export function grantQaResources(state: GameState): GameState {
  const inventory = Object.fromEntries(RESEARCH_INPUT_IDS.map((id) => [id, QA_RESOURCE_GRANT])) as GameState["researchStock"];
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
  return sanitizeGameState({
    ...state,
    research: {
      ...state.research,
      activeProjectId: null,
      completedProjectIds: RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id),
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
