import {
  COLD_WAKE_DEPARTURE_STAGE,
  COLD_WAKE_FOUNDRY_STAGE,
  COLD_WAKE_LIFE_SUPPORT_STAGE,
  COLD_WAKE_NAVIGATION_STAGE,
  MISSIONS,
  contributeToMission,
  createInitialState,
  getRecalibrationThreshold,
  recalibrate,
  sanitizeGameState,
  setColdWakeForecastReviewed,
  setGuideCompleted,
  setInterfaceIntroduction,
  setTutorialComplete,
  simulateGame,
  type GameState,
} from "./game-engine.ts";

export const PUBLIC_COLD_WAKE_RECOVERY_KEY =
  "axiom-foundry-public-recovery-step5-v1";

const COLD_WAKE_GUIDES = [
  "cold-wake-automation",
  "cold-wake-recalibration",
  "cold-wake-continuity",
  "cold-wake-foundry",
  "cold-wake-ark",
  "cold-wake-departure",
] as const;

function advance(state: GameState) {
  return simulateGame(state, 0.1, 1);
}

function fundAndCompleteFluxStage(state: GameState) {
  const stage = MISSIONS[0].stages[state.missions.stageIndex];
  if (!stage || stage.kind !== "contributeFlux") {
    throw new Error("Cold Wake recovery encountered an unexpected stage.");
  }

  const funded: GameState = {
    ...state,
    flux: stage.target,
    maxFlux: Math.max(state.maxFlux, stage.target),
    runFlux: Math.max(state.runFlux, stage.target),
    allTimeFlux: Math.max(state.allTimeFlux, stage.target),
  };
  return advance(contributeToMission(funded));
}

/**
 * Replays Cold Wake through the real progression rules, then stops immediately
 * before Pelagos departure. This intentionally grants no later-world systems,
 * people, research, or spendable recovery resources.
 */
export function createColdWakeStepFiveRecoveryState(
  now = Date.now(),
): GameState {
  let state = setTutorialComplete(createInitialState(now), true);

  state.manualPulses = 12;
  state = advance(state);

  state.tiers[0] = { amount: 25, bought: 25 };
  state = advance(state);

  state.tiers[0] = { amount: 50, bought: 50 };
  state = advance(state);

  for (let lawIndex = 0; lawIndex < 3; lawIndex += 1) {
    const threshold = getRecalibrationThreshold(state);
    state = {
      ...state,
      runFlux: threshold,
      maxFlux: Math.max(state.maxFlux, threshold),
      allTimeFlux: Math.max(state.allTimeFlux, threshold),
    };
    state = recalibrate(state, now + lawIndex + 1);
    state = advance(state);
  }

  if (state.missions.stageIndex !== COLD_WAKE_FOUNDRY_STAGE) {
    throw new Error("Cold Wake recovery could not prove all three laws.");
  }

  state = setColdWakeForecastReviewed(state, true);
  state = setInterfaceIntroduction(state, "continuity");
  state = setInterfaceIntroduction(state, "foundry");

  const targetTaps = state.missions.baseline.tierBought[0]! + 25;
  state.tiers[0] = { amount: targetTaps, bought: targetTaps };
  state = advance(state);

  if (state.missions.stageIndex !== COLD_WAKE_NAVIGATION_STAGE) {
    throw new Error("Cold Wake recovery could not restore navigation.");
  }

  state = setInterfaceIntroduction(state, "ark-overview");
  state = fundAndCompleteFluxStage(state);
  if (state.missions.stageIndex !== COLD_WAKE_LIFE_SUPPORT_STAGE) {
    throw new Error("Cold Wake recovery could not restore life support.");
  }

  state = fundAndCompleteFluxStage(state);
  if (state.missions.stageIndex !== COLD_WAKE_DEPARTURE_STAGE) {
    throw new Error("Cold Wake recovery could not reach the departure reserve.");
  }

  state = fundAndCompleteFluxStage(state);
  state = setInterfaceIntroduction(state, "departure");
  for (const guideId of COLD_WAKE_GUIDES) {
    state = setGuideCompleted(state, guideId);
  }

  return sanitizeGameState(
    {
      ...state,
      flux: 0,
      lastSaved: now,
    },
    now,
  );
}
