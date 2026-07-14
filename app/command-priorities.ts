import {
  getArkRescueQuote,
  getCampaignWorldIndex,
  getCurrentViabilityForecast,
  getMissionProgress,
  getRecalibrationGain,
  MISSIONS,
  type GameState,
} from "./game-engine.ts";
import {
  getResearchProjectDefinition,
  getResearchProjectProgress,
} from "./research-engine.ts";
import type { PrimaryView } from "./game-navigation.tsx";
import type { ViabilityDeficit } from "./settlement-engine.ts";

export type CommandPriorityTone = "critical" | "active" | "opportunity";

export type CommandPriority = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: string;
  target: PrimaryView;
  tone: CommandPriorityTone;
  progress?: number;
};

function deficitTarget(deficit: ViabilityDeficit): PrimaryView {
  if (["community", "expertise", "profile"].includes(deficit.kind)) return "population";
  if (deficit.kind === "research") return "research";
  if (deficit.kind === "survey") return "expeditions";
  return "settlement";
}

function missionTarget(kind: string): PrimaryView {
  return kind === "pulseDelta" ? "deck" : "engineering";
}

function rescueBlockCopy(reason: ReturnType<typeof getArkRescueQuote>["reason"]) {
  if (reason === "roster-full") return { detail: "The Ark has reached its 48-person structural limit. Establish a founding community before accepting another signal.", target: "settlement" as const };
  if (reason === "berths") return { detail: "The group is safe on signal. Expand the Ark's living space before dispatch.", target: "population" as const };
  if (reason === "life-support") return { detail: "The group is safe on signal. Expand the highlighted life-support reserve first.", target: "population" as const };
  if (reason === "salvage") return { detail: "The rescue shuttle needs more Salvage. Assign Fabricators or Technicians and let the Ark recover it.", target: "population" as const };
  if (reason === "flux") return { detail: "The shuttle is ready but its launch reserve needs more Flux.", target: "engineering" as const };
  return { detail: "Review the persistent survivor signal and prepare the Ark for arrival.", target: "population" as const };
}

export function getCommandPriorities(state: GameState): CommandPriority[] {
  const priorities: CommandPriority[] = [];
  const add = (priority: CommandPriority) => {
    if (!priorities.some((entry) => entry.id === priority.id)) priorities.push(priority);
  };

  if (!state.settings.tutorialComplete) {
    add({
      id: "orientation",
      eyebrow: "Immediate",
      title: "Complete AXIOM orientation",
      detail: "Learn the Core, the Ark, and the first directive before the remaining systems wake.",
      actionLabel: "Return to the Core",
      target: "deck",
      tone: "critical",
    });
    return priorities;
  }

  if (state.expeditions.stranded) {
    add({
      id: "stranded-crew",
      eyebrow: "Crew signal",
      title: "A crew is sheltered off-ship",
      detail: "Their distress shelter is stable and never expires. Assemble a rescue party when you are ready.",
      actionLabel: "Open Expedition Bay",
      target: "expeditions",
      tone: "critical",
    });
  }

  const mission = MISSIONS[state.missions.currentIndex];
  if (mission && !state.missions.awaitingAcknowledgement) {
    const stage = mission.stages[state.missions.stageIndex] ?? mission.stages[0];
    const progress = getMissionProgress(state);
    add({
      id: "active-directive",
      eyebrow: "Planetfall directive",
      title: `${mission.world}: ${stage.label}`,
      detail: stage.instruction,
      actionLabel: stage.kind === "pulseDelta" ? "Tune the Core" : "Open Foundry directive",
      target: missionTarget(stage.kind),
      tone: priorities.length === 0 ? "active" : "opportunity",
      progress: progress.ratio,
    });
  }

  if (state.survivors.activeSignal) {
    const rescue = getArkRescueQuote(state);
    const blocked = rescueBlockCopy(rescue.reason);
    add({
      id: "survivor-signal",
      eyebrow: rescue.canRescue ? "Rescue ready" : "Persistent signal",
      title: `${state.survivors.activeSignal.survivors.length} survivors are waiting`,
      detail: rescue.canRescue
        ? "Quarters, life support, Salvage, and the shuttle reserve are ready. The signal never expires."
        : blocked.detail,
      actionLabel: rescue.canRescue ? "Dispatch rescue" : "Resolve rescue block",
      target: rescue.canRescue ? "population" : blocked.target,
      tone: rescue.canRescue ? "active" : "opportunity",
    });
  }

  const forecast = getCurrentViabilityForecast(state);
  const firstDeficit = forecast?.deficits[0];
  if (firstDeficit && (state.missions.awaitingAcknowledgement || state.missions.worldsSaved > 0)) {
    add({
      id: `continuity-${firstDeficit.kind}`,
      eyebrow: `${forecast?.score ?? 0}% continuity`,
      title: firstDeficit.label,
      detail: [firstDeficit.message, firstDeficit.alternatives[0]].filter(Boolean).join(" "),
      actionLabel: `Resolve in ${deficitTarget(firstDeficit) === "population" ? "Personnel" : deficitTarget(firstDeficit) === "settlement" ? "Planet" : deficitTarget(firstDeficit) === "expeditions" ? "Expedition Bay" : "Research"}`,
      target: deficitTarget(firstDeficit),
      tone: state.missions.awaitingAcknowledgement ? "critical" : "active",
      progress: (forecast?.score ?? 0) / 100,
    });
  }

  if (state.defense.damage) {
    add({
      id: "defense-repair",
      eyebrow: "Automatic repair",
      title: "The Ark is repairing storm damage",
      detail: `Production is temporarily reduced by ${Math.round(state.defense.damage.productionPenalty * 100)}%. Repair Drones and assigned Engineers shorten recovery.`,
      actionLabel: "Review Defense Grid",
      target: "defense",
      tone: "active",
    });
  } else if (state.defense.incoming) {
    add({
      id: "defense-forecast",
      eyebrow: "Threat forecast",
      title: `Severity ${state.defense.incoming.severity} ash storm detected`,
      detail: "Your standing doctrine resolves it automatically, online or offline. Review readiness if you want a different outcome.",
      actionLabel: "Review readiness",
      target: "defense",
      tone: "opportunity",
    });
  }

  if (state.research.activeProjectId) {
    const project = getResearchProjectDefinition(state.research.activeProjectId);
    if (project) {
      add({
        id: "active-research",
        eyebrow: "Analysis Core",
        title: project.name,
        detail: "Research continues while routed evidence, power, and crew remain available.",
        actionLabel: "Inspect research route",
        target: "research",
        tone: "opportunity",
        progress: getResearchProjectProgress(state.research, project.id),
      });
    }
  } else if (state.tiers[0].bought > 0 && getCampaignWorldIndex(state) <= 2) {
    add({
      id: "select-research",
      eyebrow: "Unassigned system",
      title: "The Analysis Core is idle",
      detail: "Select an available project and let AXIOM Assist build the first safe route.",
      actionLabel: "Choose research",
      target: "research",
      tone: "opportunity",
    });
  }

  const recalibrationGain = getRecalibrationGain(state);
  if (recalibrationGain > 0) {
    add({
      id: "recalibration",
      eyebrow: "Permanent opportunity",
      title: `${recalibrationGain} Axiom${recalibrationGain === 1 ? "" : "s"} ready to prove`,
      detail: "Recalibration is optional. Spend temporary Flux on current Ark and planetary work before resetting the machine assembly.",
      actionLabel: "Review Recalibration",
      target: "engineering",
      tone: "opportunity",
    });
  }

  return priorities.slice(0, 3);
}
