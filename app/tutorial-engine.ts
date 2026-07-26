import {
  COLD_WAKE_DEPARTURE_STAGE,
  PELAGOS_FERRY_STAGE,
  PELAGOS_PROTOCOL_STAGE,
  PELAGOS_TOW_STAGE,
  getAutomationFrameQuote,
  getCampaignWorldIndex,
  getColdWakeOnboardingStatus,
  isAutonomyUnlocked,
  type GameState,
  type InterfaceIntroductionId,
} from "./game-engine.ts";
import type { PrimaryView } from "./game-navigation.tsx";
import { getProgressiveDisclosure } from "./progressive-disclosure.ts";
import type { ContextGuideId } from "./story-content.ts";

export type DestinationIntroduction = {
  id: InterfaceIntroductionId;
  view: PrimaryView;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  buttonLabel: string;
};

/**
 * Major destinations are introduced in one global queue. This prevents a newly
 * unlocked page from covering the handoff for the system that unlocked first.
 */
export function getDestinationIntroduction(
  state: GameState,
): DestinationIntroduction | null {
  const disclosure = getProgressiveDisclosure(state);
  const coldWakeStatus = getColdWakeOnboardingStatus(state);
  const campaignWorldIndex = getCampaignWorldIndex(state);

  if (disclosure.settlement && !state.settings.continuityIntroduced) {
    return {
      id: "continuity",
      view: "settlement",
      eyebrow: "NEW DESTINATION · CONTINUITY",
      title: "The Planet forecast is online",
      description:
        "Continuity does not mean the Ark can leave yet. This forecast shows what the ship must restore before Pelagos approach is safe.",
      note:
        "Review the forecast first. It will introduce the Foundry only after you authorize the next restoration step.",
      buttonLabel: "OPEN PLANET · FORECAST",
    };
  }
  if (disclosure.engineering && !state.settings.foundryIntroduced) {
    return {
      id: "foundry",
      view: "engineering",
      eyebrow: "NEW DESTINATION · FOUNDRY",
      title: "The Foundry Deck is awake",
      description:
        "The Law-Heart proved repetition. This separate deck now turns that law into ship-wide fabrication.",
      note:
        "Only one mechanism is available. Build the highlighted Vacuum Taps before any larger system appears.",
      buttonLabel: "ENTER THE FOUNDRY",
    };
  }
  if (
    coldWakeStatus.arkOverviewAvailable &&
    !state.settings.arkOverviewIntroduced
  ) {
    return {
      id: "ark-overview",
      view: "deck",
      eyebrow: "ARK VIEW · COMMAND",
      title: "AXIOM can see the whole Ark",
      description:
        "The Law-Heart is no longer the entire interface. Navigation, life support, and the Continuity Bridge are visible as physical rooms aboard the ship.",
      note:
        "Dormant rooms are previews, not new chores. Follow the single active directive on Ark Command.",
      buttonLabel: "OPEN ARK COMMAND",
    };
  }
  if (
    coldWakeStatus.active &&
    state.missions.stageIndex >= COLD_WAKE_DEPARTURE_STAGE &&
    !state.settings.departureIntroduced
  ) {
    return {
      id: "departure",
      view: "settlement",
      eyebrow: "FINAL COLD WAKE STEP · APPROACH",
      title: "Pelagos approach is ready to fund",
      description:
        "Navigation and the empty life-support reserve are stable. The remaining task is a saved, partial Flux commitment for orbital insertion.",
      note:
        "Open Planet again. Commit what you have over time; no timer is running and no partial payment is lost.",
      buttonLabel: "OPEN PELAGOS APPROACH",
    };
  }
  if (disclosure.population && !state.settings.personnelIntroduced) {
    return {
      id: "personnel",
      view: "population",
      eyebrow: "NEW DESTINATION · PERSONNEL",
      title: "The Ark has people, not statistics",
      description:
        "Personnel opens only now because the first rescued witnesses are aboard. This is where you learn their names, professions, levels, and assignments.",
      note:
        "Start with the roster. Medical, training, equipment, and advanced management reveal only when they become relevant.",
      buttonLabel: "MEET THE CREW",
    };
  }
  if (
    campaignWorldIndex === 1 &&
    disclosure.expeditions &&
    !state.settings.completedGuideIds.includes("interface-expeditions")
  ) {
    return {
      id: "expeditions",
      view: "expeditions",
      eyebrow: "NEW ARK FACILITY · EXPEDITION BAY",
      title: "Pelagos field work is finally authorized",
      description:
        "The first crew is established and the gravity operation has reached its final phase. Continuity can now request a deliberate planetary survey.",
      note:
        "The Bay did not open when the first witnesses arrived. It opens now because the current world has created a specific field assignment.",
      buttonLabel: "OPEN EXPEDITION BAY",
    };
  }
  if (disclosure.research && !state.settings.researchIntroduced) {
    return {
      id: "research",
      view: "research",
      eyebrow: "VIRIDIA DESTINATION · RESEARCH",
      title: "The Analysis Core can finally open",
      description:
        "Pelagos supplied witnesses and settlement records. Viridia presents a living problem fabrication cannot solve, so AXIOM can now turn those records into deliberate Research.",
      note:
        "You already know crew and expeditions. Research will now connect their expertise and field evidence one program at a time.",
      buttonLabel: "OPEN RESEARCH",
    };
  }
  return null;
}

/**
 * Returns at most one first-use guide for the page the player is currently
 * viewing. Prerequisites inside each chapter keep later explanations from
 * appearing before the system that gives them meaning.
 */
export function getPendingContextGuideId(
  state: GameState,
  primaryView: PrimaryView,
): ContextGuideId | null {
  const completed = new Set(state.settings.completedGuideIds);
  const worldId = state.settlement.currentWorldId;
  const coldWake = worldId === "cold-wake";
  const disclosure = getProgressiveDisclosure(state);
  const missing = (id: ContextGuideId) => !completed.has(id);
  const learned = (id: ContextGuideId) => completed.has(id);

  if (
    coldWake &&
    primaryView === "deck" &&
    state.manualPulses >= 6 &&
    missing("cold-wake-automation")
  ) {
    return "cold-wake-automation";
  }
  if (
    coldWake &&
    primaryView === "deck" &&
    learned("cold-wake-automation") &&
    state.missions.stageIndex >= 3 &&
    missing("cold-wake-recalibration")
  ) {
    return "cold-wake-recalibration";
  }
  if (
    coldWake &&
    primaryView === "settlement" &&
    learned("cold-wake-recalibration") &&
    state.settings.continuityIntroduced &&
    missing("cold-wake-continuity")
  ) {
    return "cold-wake-continuity";
  }
  if (
    coldWake &&
    primaryView === "engineering" &&
    learned("cold-wake-continuity") &&
    state.settings.foundryIntroduced &&
    missing("cold-wake-foundry")
  ) {
    return "cold-wake-foundry";
  }
  if (
    coldWake &&
    primaryView === "deck" &&
    learned("cold-wake-foundry") &&
    state.settings.arkOverviewIntroduced &&
    missing("cold-wake-ark")
  ) {
    return "cold-wake-ark";
  }
  if (
    coldWake &&
    primaryView === "settlement" &&
    learned("cold-wake-ark") &&
    state.settings.departureIntroduced &&
    missing("cold-wake-departure")
  ) {
    return "cold-wake-departure";
  }

  if (worldId === "pelagos") {
    if (missing("pelagos-arrival")) {
      return primaryView === "deck" ? "pelagos-arrival" : null;
    }
    if (
      primaryView === "settlement" &&
      state.missions.stageIndex < PELAGOS_FERRY_STAGE &&
      missing("pelagos-sos")
    ) {
      return "pelagos-sos";
    }
    if (
      primaryView === "engineering" &&
      state.missions.stageIndex < PELAGOS_PROTOCOL_STAGE &&
      missing("pelagos-foundry-expansion")
    ) {
      return "pelagos-foundry-expansion";
    }
    if (
      primaryView === "population" &&
      state.settings.personnelIntroduced &&
      missing("pelagos-personnel")
    ) {
      return "pelagos-personnel";
    }
    if (
      primaryView === "population" &&
      learned("pelagos-personnel") &&
      missing("pelagos-support")
    ) {
      return "pelagos-support";
    }
    if (
      primaryView === "medical" &&
      learned("pelagos-support") &&
      missing("pelagos-medical")
    ) {
      return "pelagos-medical";
    }
    if (
      primaryView === "population" &&
      learned("pelagos-support") &&
      state.survivors.completedTrainings > 0 &&
      state.survivors.signalsResolved >= 3 &&
      missing("pelagos-command")
    ) {
      return "pelagos-command";
    }
    if (
      primaryView === "engineering" &&
      learned("pelagos-foundry-expansion") &&
      state.missions.stageIndex >= PELAGOS_FERRY_STAGE &&
      missing("pelagos-gravity-ferry")
    ) {
      return "pelagos-gravity-ferry";
    }
    if (
      primaryView === "engineering" &&
      learned("pelagos-gravity-ferry") &&
      state.missions.stageIndex >= PELAGOS_PROTOCOL_STAGE &&
      missing("pelagos-protocols")
    ) {
      return "pelagos-protocols";
    }
    if (
      primaryView === "expeditions" &&
      learned("pelagos-support") &&
      learned("pelagos-protocols") &&
      missing("pelagos-expeditions")
    ) {
      return "pelagos-expeditions";
    }
    if (
      primaryView === "engineering" &&
      learned("pelagos-protocols") &&
      state.missions.stageIndex >= PELAGOS_TOW_STAGE &&
      missing("pelagos-recalibration")
    ) {
      return "pelagos-recalibration";
    }
    if (
      primaryView === "engineering" &&
      learned("pelagos-recalibration") &&
      isAutonomyUnlocked(state) &&
      missing("pelagos-automation")
    ) {
      return "pelagos-automation";
    }
  }

  if (
    worldId === "viridia" &&
    primaryView === "research" &&
    state.settings.researchIntroduced &&
    missing("viridia-research")
  ) {
    return "viridia-research";
  }
  if (
    primaryView === "defense" &&
    disclosure.defense &&
    missing("transit-defense")
  ) {
    return "transit-defense";
  }
  if (
    primaryView === "armory" &&
    disclosure.armory &&
    missing("frontier-armory")
  ) {
    return "frontier-armory";
  }
  if (
    primaryView === "engineering" &&
    (getAutomationFrameQuote(state).researchMet ||
      state.automation.framesBuilt > 0) &&
    missing("synthesis-drones")
  ) {
    return "synthesis-drones";
  }
  return null;
}
