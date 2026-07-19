import { ARMORY_ITEM_DEFINITIONS } from "./armory-engine.ts";
import {
  getCampaignWorldIndex,
  getRecalibrationGain,
  getRecalibrationThreshold,
  isThreatOperationsActivated,
  type GameState,
} from "./game-engine.ts";
import { getSurvivorHealthCap } from "./survivor-engine.ts";

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
  const population =
    worldIndex >= 1 ||
    state.survivors.beaconOnline ||
    state.survivors.survivors.length > 0;
  const pelagosFieldWorkReady =
    state.survivors.survivors.length >= 3 &&
    state.research.completedProjectIds.includes("closed-loop-atmosphere");
  return {
    engineering:
      worldIndex >= 1 || state.missions.worldsSaved > 0,
    research:
      hasResearchFootprint || state.survivors.survivors.length >= 2,
    population,
    medical:
      population &&
      (worldIndex >= 2 || state.survivors.medBayIds.length > 0 ||
        state.survivors.survivors.some((survivor) =>
          survivor.health < getSurvivorHealthCap(survivor) || survivor.injury !== null,
        ) || state.research.completedProjectIds.includes("clinical-commons")),
    expeditions:
      hasExpeditionFootprint || pelagosFieldWorkReady || worldIndex >= 2,
    defense: isThreatOperationsActivated(state),
    armory:
      state.expeditions.stats.completed > 0 ||
      ARMORY_ITEM_DEFINITIONS.some((item) =>
        state.armory.stock[item.id].some((count) => count > 0) ||
        state.research.completedProjectIds.includes(item.requiredResearchId),
      ),
    settlement: worldIndex === 0
      ? state.missions.awaitingAcknowledgement && state.lifetimeAxioms >= 3
      : state.missions.awaitingAcknowledgement || state.missions.worldsSaved > 1 ||
        state.settlement.completedWorldIds.some((worldId) => worldId !== "cold-wake"),
    fabrication:
      worldIndex >= 1 || state.missions.worldsSaved > 0,
    systems:
      worldIndex >= 1 &&
      (state.missions.stageIndex >= 1 || state.missions.awaitingAcknowledgement ||
        state.missions.worldsSaved > 1),
    protocols:
      worldIndex >= 1 &&
      (state.maxFlux >= 1_000 || state.runUpgrades.some((level) => level > 0)),
    recalibration:
      worldIndex >= 1 &&
      (state.runFlux >= getRecalibrationThreshold(state) * 0.1 ||
        getRecalibrationGain(state) > 0),
  };
}
