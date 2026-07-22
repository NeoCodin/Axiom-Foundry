import { ARMORY_ITEM_DEFINITIONS } from "./armory-engine.ts";
import {
  getCampaignWorldIndex,
  getColdWakeOnboardingStatus,
  isThreatOperationsActivated,
  PELAGOS_PROTOCOL_STAGE,
  PELAGOS_TOW_STAGE,
  type GameState,
} from "./game-engine.ts";

export type ProgressiveDisclosure = {
  engineering: boolean;
  research: boolean;
  population: boolean;
  medical: boolean;
  expeditions: boolean;
  defense: boolean;
  armory: boolean;
  settlement: boolean;
  fabrication: boolean;
  systems: boolean;
  protocols: boolean;
  recalibration: boolean;
};

export function getProgressiveDisclosure(state: GameState): ProgressiveDisclosure {
  const worldIndex = getCampaignWorldIndex(state);
  const hasResearchFootprint =
    state.research.activeProjectId !== null ||
    state.research.completedProjectIds.length > 0;
  const hasExpeditionFootprint =
    state.expeditions.active !== null ||
    state.expeditions.stranded !== null ||
    state.expeditions.stats.completed > 0;
  const coldWake = getColdWakeOnboardingStatus(state);
  const population =
    worldIndex >= 2 || state.survivors.survivors.length > 0;
  const pelagosFieldWorkReady =
    state.survivors.survivors.length >= 3 &&
    state.survivors.signalsResolved >= 2 &&
    state.settings.personnelIntroduced;
  return {
    engineering:
      worldIndex >= 1 ||
      state.missions.worldsSaved > 0 ||
      (coldWake.forecastAvailable && state.settings.coldWakeForecastReviewed),
    research:
      hasResearchFootprint ||
      (state.settings.researchIntroduced && worldIndex >= 1) ||
      (worldIndex >= 2 && state.settlement.currentWorldId !== null),
    population,
    medical:
      population &&
      (worldIndex >= 2 || state.survivors.signalsResolved >= 2 ||
        state.survivors.medBayIds.length > 0 ||
        state.research.completedProjectIds.includes("clinical-commons")),
    expeditions:
      hasExpeditionFootprint || pelagosFieldWorkReady || worldIndex >= 2,
    defense: isThreatOperationsActivated(state),
    armory:
      worldIndex >= 4 ||
      (worldIndex === 3 && state.expeditions.stats.completed >= 1) ||
      state.armory.activeProject !== null ||
      ARMORY_ITEM_DEFINITIONS.some((item) => state.armory.marks[item.id] > 1),
    settlement: worldIndex === 0
      ? coldWake.forecastAvailable
      : worldIndex >= 1,
    fabrication:
      worldIndex >= 1 ||
      state.missions.worldsSaved > 0 ||
      (coldWake.forecastAvailable && state.settings.coldWakeForecastReviewed),
    systems: worldIndex >= 1,
    protocols:
      worldIndex >= 1 &&
      (worldIndex >= 2 || state.missions.stageIndex >= PELAGOS_PROTOCOL_STAGE ||
        state.runUpgrades.some((level) => level > 0)),
    recalibration:
      worldIndex >= 1 &&
      (worldIndex >= 2 || state.missions.stageIndex >= PELAGOS_TOW_STAGE ||
        state.cycle > 4),
  };
}
