import { ARMORY_ITEM_DEFINITIONS } from "./armory-engine.ts";
import {
  RUN_UPGRADES,
  getCampaignWorldIndex,
  getRecalibrationGain,
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
  const population =
    state.research.completedProjectIds.includes("closed-loop-atmosphere") ||
    state.settlement.currentWorldId !== "cold-wake" ||
    state.survivors.survivors.length > 0 ||
    state.survivors.beaconOnline;
  return {
    engineering:
      state.manualPulses >= 12 || state.missions.stageIndex >= 1 ||
      state.missions.currentIndex > 0 || state.missions.worldsSaved > 0 ||
      state.tiers[0].bought > 0,
    research:
      state.tiers[0].bought > 0 || state.research.activeProjectId !== null ||
      state.research.completedProjectIds.length > 0,
    population,
    medical:
      population &&
      (worldIndex >= 2 || state.survivors.medBayIds.length > 0 ||
        state.survivors.survivors.some((survivor) =>
          survivor.health < getSurvivorHealthCap(survivor) || survivor.injury !== null,
        ) || state.research.completedProjectIds.includes("clinical-commons")),
    expeditions:
      worldIndex >= 3 || state.expeditions.active !== null ||
      state.expeditions.stranded !== null || state.expeditions.stats.completed > 0,
    defense: isThreatOperationsActivated(state),
    armory:
      state.expeditions.stats.completed > 0 ||
      ARMORY_ITEM_DEFINITIONS.some((item) =>
        state.armory.stock[item.id].some((count) => count > 0) ||
        state.research.completedProjectIds.includes(item.requiredResearchId),
      ),
    settlement:
      state.missions.awaitingAcknowledgement || state.missions.worldsSaved > 0 ||
      state.settlement.completedWorldIds.length > 0,
    fabrication:
      state.missions.stageIndex >= 1 || state.missions.currentIndex > 0 ||
      state.tiers[0].bought > 0,
    systems:
      state.missions.stageIndex >= 2 || state.missions.awaitingAcknowledgement ||
      state.missions.worldsSaved > 0,
    protocols: state.maxFlux >= RUN_UPGRADES[0].revealAt || state.lifetimeAxioms > 0,
    recalibration:
      state.maxFlux >= RUN_UPGRADES[RUN_UPGRADES.length - 1].revealAt ||
      state.lifetimeAxioms > 0 || getRecalibrationGain(state) > 0,
  };
}

