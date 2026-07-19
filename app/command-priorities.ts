import {
  getArkRescueQuote,
  getCampaignWorldIndex,
  getCurrentViabilityForecast,
  getMissionProgress,
  getOperationalResearchExpertise,
  getRecalibrationGain,
  getResearchCrewAvailable,
  getResearchFieldValidation,
  getResearchLeadStatus,
  getResearchPowerAvailable,
  getActiveAutomationEffects,
  MISSIONS,
  type GameState,
} from "./game-engine.ts";
import {
  getResearchInputDefinition,
  getResearchNetworkStatus,
  getResearchProjectDefinition,
  getResearchProjectProgress,
  type ResearchInputId,
} from "./research-engine.ts";
import { getProgressiveDisclosure } from "./progressive-disclosure.ts";
import type { PrimaryView } from "./game-navigation.tsx";
import type { ViabilityDeficit } from "./settlement-engine.ts";
import { getCampaignWorld } from "./campaign-content.ts";
import { DEFENSE_EVENT_DEFINITIONS } from "./defense-engine.ts";
import { getPlanetaryIncomingForecast } from "./planetary-defense-engine.ts";
import { isSurvivorWounded } from "./survivor-engine.ts";

export type CommandPriorityTone = "critical" | "active" | "opportunity";
export type CommandPriorityCadence = "action" | "offline" | "automatic";
export type CommandPriorityPanel =
  | "machines"
  | "systems"
  | "research-core"
  | "research-technology"
  | "research-lattice";

export type CommandPriority = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: string;
  target: PrimaryView;
  tone: CommandPriorityTone;
  cadence: CommandPriorityCadence;
  panel?: CommandPriorityPanel;
  missing?: string;
  nextAction?: string;
  progress?: number;
};

function deficitTarget(deficit: ViabilityDeficit): PrimaryView {
  if (["community", "expertise", "profile"].includes(deficit.kind)) return "population";
  if (deficit.kind === "research") return "research";
  if (deficit.kind === "survey" || deficit.kind === "operation") return "expeditions";
  return "settlement";
}

function missionRoute(kind: string): { target: PrimaryView; panel?: CommandPriorityPanel } {
  if (kind === "pulseDelta" || kind === "axiomProof") return { target: "deck" };
  if (kind === "tierPurchaseDelta") return { target: "engineering", panel: "machines" };
  return { target: "engineering", panel: "systems" };
}

type RescueBlockGuidance = {
  detail: string;
  missing: string;
  nextAction: string;
  actionLabel: string;
  target: PrimaryView;
  panel?: CommandPriorityPanel;
};

function rescueBlockCopy(
  reason: ReturnType<typeof getArkRescueQuote>["reason"],
): RescueBlockGuidance {
  if (reason === "transit") return { detail: "The survivor signal remains locked in the Ark's receiver during transit. No launch can cross an unfinished corridor.", missing: "Orbital arrival", nextAction: "Wait for automatic orbital arrival; the signal will remain available", actionLabel: "Open Navigation", target: "settlement" as const };
  if (reason === "roster-full") return { detail: "The Ark has reached its 48-person structural limit. The waiting signal never expires.", missing: "Open space below the 48-person Ark limit", nextAction: "Establish the prepared founding community", actionLabel: "Open Continuity forecast", target: "settlement" as const };
  if (reason === "berths") return { detail: "The group is safe on signal, but there is not enough completed living space.", missing: "Living-space capacity", nextAction: "Start one habitation-ring section", actionLabel: "Expand living space", target: "population" as const };
  if (reason === "life-support") return { detail: "The group is safe on signal. One highlighted atmosphere, water, nutrition, or medical reserve is below projected demand.", missing: "Safe life-support capacity", nextAction: "Upgrade the highlighted reserve", actionLabel: "Open life support", target: "population" as const };
  if (reason === "salvage") return { detail: "The rescue shuttle is ready, but its structural stores are short. Base recovery continues offline and assigned Fabricators or Technicians make it faster.", missing: "Rescue Salvage", nextAction: "Wait for automatic Salvage recovery", actionLabel: "Review Salvage recovery", target: "population" as const };
  if (reason === "flux") return { detail: "Every physical system is ready; only the shuttle's launch reserve is short. Foundry production continues offline.", missing: "Shuttle-launch Flux", nextAction: "Wait for Foundry production to reach the launch cost", actionLabel: "Review Foundry production", target: "engineering" as const, panel: "machines" as const };
  return { detail: "Review the persistent survivor signal and prepare the Ark for arrival.", missing: "Rescue readiness", nextAction: "Inspect the survivor signal", actionLabel: "Open survivor signal", target: "population" as const };
}

function researchInputGuidance(state: GameState, inputId: ResearchInputId) {
  const input = getResearchInputDefinition(inputId);
  const name = input?.name ?? inputId.replaceAll("-", " ");
  if (state.researchStock[inputId] > 0) {
    return {
      detail: `${name} exists in Ark Supply but has not reached the active Lattice reservoir.`,
      missing: `${name} in Lattice inventory`,
      nextAction: `Transfer ${name} from Ark Supply`,
      actionLabel: `Transfer ${name}`,
      target: "research" as const,
      panel: "research-lattice" as const,
      cadence: "action" as const,
    };
  }
  if (inputId === "calibration-data") return { detail: "The active program has exhausted Calibration Data.", missing: "Calibration Data", nextAction: "Tune the Axiom Chamber to record another calibration", actionLabel: "Tune the Core", target: "deck" as const, cadence: "action" as const };
  if (inputId === "engineering-models") return { detail: "The active program has exhausted Engineering Models. Foundry purchases and planetary construction create more.", missing: "Engineering Models", nextAction: "Buy the next useful Foundry machine", actionLabel: "Build a Foundry machine", target: "engineering" as const, panel: "machines" as const, cadence: "action" as const };
  if (inputId === "biological-samples") return { detail: "The active program has exhausted Biological Samples. On-duty Doctors and Farmers replenish them offline; rescues and colony health reports add more.", missing: "Biological Samples", nextAction: "Assign your strongest available Doctor or Farmer, then let clinical evidence accumulate", actionLabel: "Open Personnel", target: "population" as const, cadence: "offline" as const };
  if (inputId === "cultural-records") return { detail: "The active program has exhausted Cultural Records. On-duty Teachers and Researchers replenish them offline; elders, children, and colony reports add more.", missing: "Cultural Records", nextAction: "Assign your strongest available Teacher or Researcher, then let archive work continue", actionLabel: "Open Personnel", target: "population" as const, cadence: "offline" as const };
  if (inputId === "schematics") {
    const expeditions = getProgressiveDisclosure(state).expeditions;
    return expeditions
      ? { detail: "Recovered Schematics cannot be manufactured aboard. Only survivor cargo and expedition returns contain them.", missing: "Recovered Schematics", nextAction: "Launch a safe repeatable expedition", actionLabel: "Open Expedition Bay", target: "expeditions" as const, cadence: "action" as const }
      : { detail: "Recovered Schematics cannot be manufactured aboard. The next survivor signal can carry them.", missing: "Recovered Schematics", nextAction: "Prepare for and answer the next survivor signal", actionLabel: "Open survivor signals", target: "population" as const, cadence: "offline" as const };
  }
  if (inputId === "null-traces") {
    const disclosure = getProgressiveDisclosure(state);
    if (disclosure.defense) {
      return state.defense.contactDoctrine === "observe"
        ? { detail: "The active program has exhausted Null Traces. Observe doctrine is already gathering evidence from automatically resolved defense events.", missing: "Null Traces from the next observed event", nextAction: "No intervention is required; leave Observe doctrine active", actionLabel: "Review Defense forecast", target: "defense" as const, cadence: "automatic" as const }
        : { detail: "The active program has exhausted Null Traces. Observed defense events produce active evidence.", missing: "An active observation doctrine", nextAction: "Adopt Observe doctrine before the next forecast", actionLabel: "Open Defense doctrine", target: "defense" as const, cadence: "action" as const };
    }
    if (disclosure.expeditions) return { detail: "The active program has exhausted Null Traces. Deep-field expeditions and planetary crises expose more.", missing: "Null Traces", nextAction: "Launch a Null-bearing expedition", actionLabel: "Open Expedition Bay", target: "expeditions" as const, cadence: "action" as const };
    return { detail: "The active program has exhausted Null Traces. The current world produces a slow passive signal and its crisis awards a larger cache.", missing: "Null Traces", nextAction: "Continue planetary recovery while the signal accumulates", actionLabel: "Open Planet recovery", target: "settlement" as const, cadence: "offline" as const };
  }
  return { detail: "The active program has exhausted Axiom Proofs. Only Recalibration proves laws that survive a rebuilt assembly.", missing: "Axiom Proofs", nextAction: "Reach a positive Recalibration yield and forge an Axiom", actionLabel: "Open Recalibration", target: "engineering" as const, panel: "systems" as const, cadence: "action" as const };
}

export function getCommandPriorities(state: GameState): CommandPriority[] {
  const priorities: CommandPriority[] = [];
  const add = (priority: Omit<CommandPriority, "cadence"> & { cadence?: CommandPriorityCadence }) => {
    if (!priorities.some((entry) => entry.id === priority.id)) {
      priorities.push({ cadence: "action", ...priority });
    }
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
      missing: "A prepared 2-4 person rescue party and launch Flux",
      nextAction: "Open the distress dossier and select the projected rescue crew",
      tone: "critical",
    });
  }

  if (state.defense.compromise) {
    const compromise = state.defense.compromise;
    add({
      id: "hostile-compromise",
      eyebrow: "Automatic quarantine",
      title: `${compromise.kind.replaceAll("-", " ")} is being purged`,
      detail: `The ${compromise.target.replaceAll("-", " ")} system is temporarily isolated. Nothing was deleted. ${Math.ceil(compromise.remainingSeconds / 60)} minutes of automatic offline recovery remain.`,
      actionLabel: "Open incident report",
      target: "defense",
      missing: "Automatic purge completion",
      nextAction: "No action is required; review the report or wait for offline recovery",
      cadence: "automatic",
      tone: "critical",
    });
  }

  const injuredDefender = state.survivors.survivors.find((survivor) => isSurvivorWounded(survivor));
  if (injuredDefender) {
    add({
      id: "injured-crew",
      eyebrow: "Medical attention",
      title: `${injuredDefender.callsign || injuredDefender.name} is off duty`,
      detail: `Health ${Math.round(injuredDefender.health)}. They were automatically removed from duty and will not be exposed to another defense event while wounded.`,
      actionLabel: "Open Medical Bay",
      target: "medical",
      missing: "Recovery above the on-duty threshold",
      nextAction: "Admit the injured crew member and keep at least one Doctor on duty",
      cadence: "action",
      tone: "critical",
    });
  }

  const activeTransit = state.transit.active;
  if (activeTransit) {
    const destination = getCampaignWorld(activeTransit.destinationWorldId);
    const remainingSeconds = Math.max(
      0,
      activeTransit.durationSeconds - activeTransit.elapsedSeconds,
    );
    add({
      id: "active-transit",
      eyebrow: "Offline navigation",
      title: `Ark en route to ${destination?.name ?? "the next world"}`,
      detail: `The corridor closes in ${Math.ceil(remainingSeconds / 60)} minutes. Foundry production, Research, training, repair, and Defense all continue while the game is closed.`,
      actionLabel: "Open Navigation",
      target: "settlement",
      missing: "Orbital arrival",
      nextAction: "No intervention is required; review the route or leave the Ark running offline",
      cadence: "automatic",
      tone: priorities.length === 0 ? "active" : "opportunity",
      progress: Math.min(
        1,
        activeTransit.elapsedSeconds / Math.max(1, activeTransit.durationSeconds),
      ),
    });
  }

  const mission = MISSIONS[state.missions.currentIndex];
  if (mission && !state.missions.awaitingAcknowledgement && !activeTransit) {
    const stage = mission.stages[state.missions.stageIndex] ?? mission.stages[0];
    const progress = getMissionProgress(state);
    const coldWakeCoreDeck = state.missions.currentIndex === 0;
    const route = coldWakeCoreDeck ? { target: "deck" as const } : missionRoute(stage.kind);
    add({
      id: "active-directive",
      eyebrow: "Planetfall directive",
      title: `${mission.world}: ${stage.label}`,
      detail: stage.instruction,
      actionLabel:
        stage.kind === "axiomProof"
          ? "Charge the Law Press"
          : stage.kind === "pulseDelta"
          ? "Tune the Core"
          : stage.kind === "tierPurchaseDelta"
            ? coldWakeCoreDeck ? "Build Vacuum Taps" : "Open required machine"
            : "Open exact directive control",
      target: route.target,
      panel: route.panel,
      missing: stage.label,
      nextAction: stage.instruction,
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
      actionLabel: rescue.canRescue ? "Dispatch rescue" : blocked.actionLabel,
      target: rescue.canRescue ? "population" : blocked.target,
      panel: rescue.canRescue ? undefined : blocked.panel,
      missing: rescue.canRescue ? undefined : blocked.missing,
      nextAction: rescue.canRescue ? "Dispatch the prepared rescue shuttle" : blocked.nextAction,
      cadence:
        !rescue.canRescue && ["salvage", "flux"].includes(rescue.reason ?? "")
          ? "offline"
          : "action",
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
      missing: `${firstDeficit.missing} more ${firstDeficit.label}`,
      nextAction: firstDeficit.alternatives[0] ?? firstDeficit.message,
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
      nextAction: "No intervention is required; Engineers and Repair Drones shorten the offline repair",
      cadence: "automatic",
      tone: "active",
    });
  } else if (state.defense.incoming) {
    const definition = DEFENSE_EVENT_DEFINITIONS[state.defense.incoming.kind];
    add({
      id: "defense-forecast",
      eyebrow: "Threat forecast",
      title: `Severity ${state.defense.incoming.severity} ${definition.label} detected`,
      detail: `${definition.summary} Target: ${state.defense.incoming.target.replaceAll("-", " ")}. Your standing doctrine resolves it automatically online or offline.`,
      actionLabel: "Review readiness",
      target: "defense",
      nextAction: "Review the projected margin or leave the standing doctrine to resolve it",
      cadence: "automatic",
      tone: "opportunity",
    });
  }

  const planetaryForecast = getPlanetaryIncomingForecast(state.planetaryDefense);
  if (planetaryForecast) {
    add({
      id: "planetary-defense-forecast",
      eyebrow: "Restored-world forecast",
      title: `${planetaryForecast.colonyName} is under ${planetaryForecast.signature.replaceAll("-", " ")}`,
      detail: `Severity ${planetaryForecast.severity}; network readiness ${planetaryForecast.readiness}/100. The standing planetary doctrine resolves it automatically and the colony cannot be deleted.`,
      actionLabel: "Open planetary network",
      target: "settlement",
      nextAction: "Review the target network or let the standing doctrine resolve it offline",
      cadence: "automatic",
      tone: "active",
    });
  }

  const disclosure = getProgressiveDisclosure(state);
  if (getCampaignWorldIndex(state) >= 3 && !disclosure.armory) {
    add({
      id: "armory-locked",
      eyebrow: "Facility lock explained",
      title: "Armory awaits field telemetry",
      detail: "The Armory remains hidden until one completed expedition proves what its equipment must survive.",
      missing: "1 completed expedition",
      nextAction: "Launch and complete the first safe Cinder expedition",
      actionLabel: "Open Expedition Bay",
      target: "expeditions",
      tone: "opportunity",
    });
  } else if (getCampaignWorldIndex(state) >= 3 && !disclosure.defense) {
    add({
      id: "defense-locked",
      eyebrow: "Facility lock explained",
      title: "Defense Grid awaits a second field model",
      detail: `The Defense Grid stays dormant until two expeditions establish the local hazard model. ${state.expeditions.stats.completed}/2 are complete.`,
      missing: `${Math.max(0, 2 - state.expeditions.stats.completed)} completed expedition`,
      nextAction: "Complete one more safe expedition",
      actionLabel: "Open Expedition Bay",
      target: "expeditions",
      tone: "opportunity",
      progress: Math.min(1, state.expeditions.stats.completed / 2),
    });
  }

  if (state.research.activeProjectId) {
    const project = getResearchProjectDefinition(state.research.activeProjectId);
    if (project) {
      const lead = getResearchLeadStatus(state);
      const fieldValidation = getResearchFieldValidation(state);
      const network = getResearchNetworkStatus(state.research, {
        powerAvailable: getResearchPowerAvailable(state),
        crewAvailable: getResearchCrewAvailable(state),
        expertise: getOperationalResearchExpertise(state),
        leadResearcherLevel: lead.level,
        exceptionalLeadAvailable: lead.exceptional,
        fieldValidationMultiplier: fieldValidation.multiplier,
        automationMultiplier: getActiveAutomationEffects(state).researchRoutingMultiplier,
      });
      let guidance: {
        detail: string;
        missing?: string;
        nextAction: string;
        actionLabel: string;
        target: PrimaryView;
        panel?: CommandPriorityPanel;
        cadence: CommandPriorityCadence;
      };
      if (network.stalledReason?.startsWith("Requires an on-duty")) {
        guidance = {
          detail: `${network.stageLabel} cannot begin because this ${getResearchProjectDefinition(project.id)?.era ?? "advanced"} program needs qualified biological oversight.`,
          missing: network.stalledReason.replace("Requires ", ""),
          nextAction: `Assign or train the named Researcher level before returning to ${project.name}`,
          actionLabel: "Open Researcher assignments",
          target: "population",
          cadence: "action",
        };
      } else if (network.stalledReason === "No lattice power") {
        guidance = {
          detail: `${network.stageLabel} has no operating power. Foundry machines expand the Analysis Deck's power envelope.`,
          missing: "Analysis Core power",
          nextAction: "Buy the next affordable Foundry machine",
          actionLabel: "Open Foundry machines",
          target: "engineering",
          panel: "machines",
          cadence: "action",
        };
      } else if (network.stalledReason === "Awaiting research inputs") {
        const depleted = network.requiredInputs.find(
          (inputId) => state.research.inventory[inputId] <= 0,
        ) ?? network.requiredInputs[0]!;
        guidance = researchInputGuidance(state, depleted);
      } else if (network.stalledReason) {
        guidance = {
          detail: `${network.stageLabel} is stopped: ${network.stalledReason}.`,
          missing: network.stalledReason,
          nextAction: "Inspect the active Core and its Analysis stations",
          actionLabel: "Inspect Analysis Core",
          target: "research",
          panel: "research-core",
          cadence: "action",
        };
      } else {
        const fieldCopy =
          network.stage === "validation"
            ? ` Live Ark evidence contributes x${network.fieldValidationMultiplier.toFixed(2)} from ${fieldValidation.sources.map((source) => source.label).join(", ") || "base validation"}.`
            : ` Field evidence is banked for the Validation stage at x${fieldValidation.multiplier.toFixed(2)}.`;
        guidance = {
          detail: `${network.stageLabel} is progressing at ${(network.progressPerSecond * 60).toFixed(1)} work per minute.${fieldCopy} It continues while the game is closed.`,
          nextAction: "No intervention is required; inspect the Core only if you want to change staffing or routing",
          actionLabel: "Watch active research",
          target: "research",
          panel: "research-core",
          cadence: "offline",
        };
      }
      add({
        id: "active-research",
        eyebrow: `${network.stageLabel} // ${guidance.cadence === "offline" ? "offline safe" : "attention"}`,
        title: project.name,
        detail: guidance.detail,
        actionLabel: guidance.actionLabel,
        target: guidance.target,
        panel: guidance.panel,
        missing: guidance.missing,
        nextAction: guidance.nextAction,
        cadence: guidance.cadence,
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
      panel: "research-technology",
      missing: "An active research program",
      nextAction: "Choose one available program from the Technology Map",
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
      panel: "systems",
      nextAction: "Choose whether to spend temporary Flux first, then confirm Recalibration when ready",
      tone: "opportunity",
    });
  }

  return priorities.slice(0, 3);
}
