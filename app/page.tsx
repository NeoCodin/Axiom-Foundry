"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  GENERATORS,
  LEGACY_UPGRADES,
  MISSIONS,
  COLD_WAKE_FOUNDRY_STAGE,
  COLD_WAKE_NAVIGATION_STAGE,
  COLD_WAKE_LIFE_SUPPORT_STAGE,
  COLD_WAKE_DEPARTURE_STAGE,
  PELAGOS_RECEIVER_STAGE,
  PELAGOS_HABITABILITY_STAGE,
  PELAGOS_BEACON_STAGE,
  PELAGOS_SIGNAL_STAGE,
  PELAGOS_FIRST_RESCUE_STAGE,
  PELAGOS_FERRY_STAGE,
  PROTOCOL_MARK_LABELS,
  RETIRED_SAVE_KEYS,
  RUN_UPGRADES,
  SAVE_KEY,
  allocateLegacyUpgrade,
  buyRunUpgrade,
  buyTier,
  completeWorldInfrastructure,
  contributeToMission,
  createInitialState,
  departCurrentWorld,
  fabricateWorldEquipment,
  fabricateWorldSupply,
  formatDuration,
  formatNumber,
  getCampaignCrewSummaries,
  getCampaignWorldIndex,
  getColdWakeOnboardingStatus,
  getColonyLegacyEffects,
  buyDefenseInstallation,
  chooseDefenseDoctrine,
  chooseEnvironmentalDefenseDoctrine,
  craftArmoryItem,
  repairArmoryItem,
  beginArmoryUpgrade,
  getArmoryUpgradeQuote,
  getArmoryModificationQuote,
  installArmoryModification,
  getArmoryLawQuote,
  purchaseArmoryLaw,
  abandonStrandedCrew,
  admitCrewToMedBay,
  chooseTrainingDoctrine,
  dischargeCrewFromMedBay,
  getCommandTeamStatus,
  getMedBayStatus,
  getProstheticSurgeryQuote,
  getSurfaceRecon,
  assignTeamAlphaMember,
  setCommandLeader,
  toggleTeamAlphaMember,
  performProstheticSurgery,
  getArkRescueQuote,
  getArmoryCraftQuote,
  getArmoryRepairQuote,
  getAutoTransferStatus,
  getExpeditionLaunchQuote,
  getRescueMissionQuote,
  startExpedition,
  startRescueMission,
  getBerthConstructionQuote,
  getLifeSupportUpgradeSalvageCost,
  hasRescueDetail,
  performArkRescue,
  getDefenseInstallationQuote,
  getCrisisReadiness,
  getCurrentViabilityForecast,
  getEquipmentFabricationQuote,
  getInfrastructureFluxCost,
  startArkBerthConstruction,
  getLegacyMatrixStatus,
  getLegacyUpgradeEffectLabel,
  getManualGain,
  getMissionProgress,
  getOfflineCapHours,
  getProductionSnapshot,
  getPurchaseQuantity,
  getRecalibrationGain,
  getRecalibrationThreshold,
  getAxiomProofStatus,
  getLawHeartPhaseGateStatus,
  releaseLegacyUpgrade,
  commitLegacyMatrix,
  getResearchCrewAvailable,
  getResearchCostMultiplier,
  getResearchFieldValidation,
  getOperationalResearchExpertise,
  getResearchLeadStatus,
  getDefenseCrewContext,
  getCausalArchiveStatus,
  getBioadaptationQuote,
  startBioadaptation,
  getActiveAutomationEffects,
  getActiveTransit,
  getDefenseEnvironment,
  getAutomationFrameQuote,
  getOperationalLoad,
  isAutomationProgramUnlocked,
  isAutonomyUnlocked,
  fabricateAutomationFrame,
  setAutomationAllocation,
  setAutomationMaintenancePolicy,
  isHostileThreatOperationsActivated,
  isPlanetaryDefenseActivated,
  getPlanetaryDefenseConstructionQuote,
  beginPlanetaryDefenseConstruction,
  choosePlanetaryDefenseDoctrine,
  getProfileElevationQuote,
  elevateCrewProfile,
  getResearchPowerAvailable,
  getRunUpgradeCost,
  getRunUpgradeEffectLabel,
  getRunUpgradePaybackSeconds,
  getRunUpgradeUnlockLabel,
  getSupplyFabricationQuote,
  getTierCost,
  isTierUnlocked,
  isRunUpgradeUnlocked,
  pulseCore,
  recalibrate,
  resolveCurrentCrisis,
  sanitizeGameState,
  setAutoEnabled,
  setAutoTier,
  setAutoUpgrades,
  setProtocolBlueprintLevel,
  setBuyMode,
  setColdWakeForecastReviewed,
  setGuideCompleted,
  setInterfaceIntroduction,
  setTutorialComplete,
  simulateGame,
  type GameState,
  type PurchaseMode,
} from "./game-engine";
import { WORLD_VISUALS } from "./world-visuals";
import ArkDeck, { type ArkViewId } from "./ark-deck";
import { AxiomLawHeart } from "./axiom-law-heart";
import { FoundryLawHeart } from "./foundry-law-heart";
import {
  DEFAULT_LAW_HEART_QA_OVERRIDE,
  type LawHeartQaOverride,
} from "./law-heart-particle-field";
import { getBeaconReadiness } from "./beacon-readiness-engine";
import {
  GameManualDialog,
  type ManualPageId,
  type ManualTopicId,
} from "./game-manual";
import {
  GameNavigation,
  type NavigationUnlocks,
  type PrimaryView,
} from "./game-navigation";
import { CommandBriefing } from "./command-briefing";
import { getCommandPriorities, type CommandPriority } from "./command-priorities";
import { GameCommandBar } from "./game-command-bar";
import {
  PUBLIC_COLD_WAKE_RECOVERY_KEY,
  createColdWakeStepFiveRecoveryState,
} from "./public-recovery";
import PopulationConsole from "./population-console";
import DefenseConsole from "./defense-console";
import ArmoryConsole, { type ArmoryItemQuoteView } from "./armory-console";
import ExpeditionConsole from "./expedition-console";
import MedicalConsole from "./medical-console";
import ResearchLattice, { type ResearchView } from "./research-lattice";
import SettlementConsole from "./settlement-console";
import TransitConsole from "./transit-console";
import AutomationConsole from "./automation-console";
import {
  BIOADAPTATION_DEFINITIONS,
  type BioadaptationId,
} from "./bioadaptation-engine";
import {
  addDiscovery,
  getChosenDoctrine,
  getDiscoveredFragments,
  getDoctrineAvailability,
  getNextArchiveDiscovery,
  syncAutomaticDiscoveries,
} from "./discovery-engine";
import { type DoctrineId, type RoomId } from "./discovery-content";
import {
  chooseDoctrine,
  getRoomUpgradeCost,
  grantLivingFoundryRewards,
  ROOM_DEFINITIONS,
  upgradeRoom,
} from "./living-foundry-engine";
import {
  assignSurvivorToRole,
  autoAssignSurvivors,
  getBerthCapacity,
  getScanDurationSeconds,
  getSurvivorBestSkillLevel,
  setAutoRescueEnabled,
  setAutoAssignmentEnabled,
  getLifeSupportStatus,
  getSurvivorRarity,
  getSurvivorSkillLevel,
  renameSurvivorCallsign,
  returnSurvivorToAutoAssignment,
  setSurvivorSettlementProtected,
  setLifeSupportCapacity,
  setSosBeaconOnline,
  startSurvivorTraining,
  cancelSurvivorTraining,
  type LifeSupportKey,
  type ProfessionalRole,
  type SurvivorRole,
} from "./survivor-engine";
import {
  AUTOMATION_PROGRAM_DEFINITIONS,
  type AutomationMaintenancePolicy,
  type AutomationProgramId,
} from "./automation-engine";
import {
  PLANETARY_INSTALLATION_DEFINITIONS,
  type PlanetaryDefenseDoctrine,
  type PlanetaryInstallationId,
} from "./planetary-defense-engine";
import {
  ARMORY_LAWS,
  ARMORY_MODIFICATIONS,
  ARMORY_ITEM_DEFINITIONS,
  getEffectiveArmorMultiplier,
  getEffectiveArmoryDurability,
  getEffectiveWeaponStrength,
  type ArmoryItemId,
  type ArmoryArmorId,
  type ArmoryLawId,
  type ArmoryModificationId,
  type ArmoryWeaponId,
} from "./armory-engine";
import {
  addResearchInputs,
  getResearchBonuses,
  getResearchNetworkStatus,
  getResearchProjectDefinition,
  getResearchProjectProgress,
  setResearchCrew,
  type ResearchInputId,
  type ResearchLatticeState,
  type ResearchProjectId,
} from "./research-engine";
import {
  acknowledgeColonyTransmission,
  getAllPendingColonyTransmissions,
  toggleSettlerSelection,
} from "./settlement-engine";
import { getCampaignWorld, type CampaignWorldId } from "./campaign-content";
import {
  EXPEDITION_SITE_DEFINITIONS,
  getExpeditionAvailability,
  getExpeditionSitesForWorld,
  type ExpeditionSiteId,
} from "./expedition-engine";
import {
  DEFENSE_INSTALLATION_DEFINITIONS,
  type DefenseDoctrine,
  type DefenseInstallationId,
  type EnvironmentalDoctrine,
} from "./defense-engine";
import {
  CONTEXT_GUIDES,
  LORE_ENTRIES,
  TOUR_STEPS,
  type ContextGuideId,
} from "./story-content";
import {
  LoreArchive,
  type ArchiveLawEntry,
  type ArchiveWorldEntry,
} from "./lore-archive";
import { getProgressiveDisclosure } from "./progressive-disclosure";
import {
  getDestinationIntroduction,
  getPendingContextGuideId,
  type DestinationIntroduction,
} from "./tutorial-engine";
import { PixelTooltipLayer } from "./pixel-tooltip-layer";
import {
  calculateNullSaturation,
  DEFAULT_NULL_SATURATION_OVERRIDE,
  type NullSaturationOverride,
} from "./null-saturation-engine";
import { ContextualGuide } from "./contextual-guide";
import { QaSandbox, type QaGuidePreviewId } from "./qa-sandbox";
import {
  CoreEchoPreview,
  type CoreEchoPreviewId,
} from "./core-echo-preview";
import {
  QA_QUERY_PARAMETER,
  QA_SAVE_KEY,
  addQaFlux,
  boostQaCrew,
  completeQaActiveResearch,
  completeQaResearch,
  createQaCheckpoint,
  createQaPelagosOnboardingCheckpoint,
  createQaPlanetIntroductionCheckpoint,
  createQaResearchIntroductionCheckpoint,
  createQaTransitCheckpoint,
  fillQaResearchLattice,
  grantQaResources,
  prepareQaContinuity,
  resetQaResearch,
  setQaAxioms,
  simulateQaOfflineDay,
  stockQaResearchEvidence,
} from "./qa-sandbox-engine";

type FoundryConsoleTab =
  | "chain"
  | "drones"
  | "protocols"
  | "recalibration"
  | "autonomy"
  | "legacy";

const AUTOMATION_PROGRAM_COLORS: Record<AutomationProgramId, string> = {
  "hull-maintenance": "#55e6e8",
  "medical-assistance": "#79e39b",
  "research-routing": "#b87cff",
  "expedition-support": "#f2bc55",
  "construction-machines": "#ff8c58",
  "interceptor-control": "#86baff",
  "personnel-logistics": "#fff0b5",
};

const TOOLTIP_PREFERENCE_KEY = "axiom-foundry-context-hints";

const purchaseModes: Array<{ value: PurchaseMode; label: string }> = [
  { value: "1", label: "×1" },
  { value: "10", label: "×10" },
  { value: "max", label: "MAX" },
];

function thresholdProgress(current: number, previous: number, next: number) {
  if (current >= next) return 1;
  const start = Math.log10(Math.max(1, previous) + 1);
  const end = Math.log10(next + 1);
  const position = Math.log10(Math.max(0, current) + 1);
  return Math.min(1, Math.max(0, (position - start) / (end - start)));
}

function getNextObjective(state: GameState) {
  const activeMission = MISSIONS[state.missions.currentIndex];
  if (activeMission && !state.missions.awaitingAcknowledgement) {
    const stage =
      activeMission.stages[state.missions.stageIndex] ?? activeMission.stages[0];
    const progress = getMissionProgress(state);
    return {
      label: `${activeMission.world}: ${stage.label}`,
      threshold: progress.target,
      current: progress.value,
      progress: progress.ratio,
    };
  }

  if (state.missions.awaitingAcknowledgement) {
    if (getCampaignWorldIndex(state) === 0) {
      return {
        label: "Cold Wake: authorize Pelagos departure",
        threshold: 1,
        current: 1,
        progress: 1,
      };
    }
    return {
      label: "Engineering directive complete. Continuity review required.",
      threshold: 1,
      current: 1,
      progress: 1,
    };
  }

  const worldIndex = getCampaignWorldIndex(state);
  const recalibrationThreshold = getRecalibrationThreshold(state);
  const generatorUnlock = GENERATORS.find(
    (generator, index) =>
      index <= worldIndex && state.maxFlux < generator.unlockAt,
  );
  const candidates = [
    generatorUnlock
      ? {
          threshold: generatorUnlock.unlockAt,
          label: `Discover ${generatorUnlock.name}`,
        }
      : null,
    state.runFlux < recalibrationThreshold
      ? {
          threshold: recalibrationThreshold,
          label: "Stabilize the next Axiom proof",
        }
      : null,
  ]
    .filter((candidate): candidate is { threshold: number; label: string } =>
      Boolean(candidate),
    )
    .sort((left, right) => left.threshold - right.threshold);

  const next = candidates[0];
  if (!next) {
    return {
      label: "The Foundry is ready to Recalibrate",
      threshold: recalibrationThreshold,
      current: state.runFlux,
      progress: 1,
    };
  }

  const previousThreshold = [
    0,
    ...GENERATORS.map((generator) => generator.unlockAt),
  ]
    .filter((threshold) => threshold <= state.maxFlux)
    .sort((left, right) => right - left)[0];

  return {
    ...next,
    current: state.maxFlux,
    progress: thresholdProgress(
      state.maxFlux,
      previousThreshold,
      next.threshold,
    ),
  };
}

const ROOM_REINFORCEMENT_EFFECTS = {
  "axiom-chamber": "Improves manual Law-Heart strikes and total Foundry output.",
  "fabrication-floor": "Reduces the Flux price of every nested mechanism.",
  "planetfall-bridge": "Improves total Foundry output under planetary load.",
  "resonance-gallery": "Strengthens every balanced Resonance link.",
  "memory-archive": "Reduces the evidence consumed by Research programs.",
  "research-observatory": "Reduces the evidence consumed by Research programs.",
  "expedition-bay": "Improves Salvage, Schematics, and evidence recovered by expeditions.",
  "recalibration-vault": "Improves total Foundry output after later-world recovery.",
} satisfies Partial<Record<RoomId, string>>;

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createInitialState(0));
  const [ready, setReady] = useState(false);
  const [primaryView, setPrimaryView] = useState<PrimaryView>("deck");
  const [foundryConsoleTab, setFoundryConsoleTab] =
    useState<FoundryConsoleTab>("chain");
  const [researchEntry, setResearchEntry] = useState<{
    view: ResearchView;
    projectId?: ResearchProjectId;
    nonce: number;
  } | null>(null);
  const [expeditionEntry, setExpeditionEntry] = useState<{
    siteId: ExpeditionSiteId;
    nonce: number;
  } | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [saveStatus, setSaveStatus] = useState("Local save pending");
  const [offlineNotice, setOfflineNotice] = useState<{
    seconds: number;
    gain: number;
  } | null>(null);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [contextGuide, setContextGuide] = useState<{
    id: ContextGuideId;
    step: number;
  } | null>(null);
  const [qaGuidePreview, setQaGuidePreview] = useState<{
    id: QaGuidePreviewId;
    step: number;
  } | null>(null);
  const [qaCoreEchoPreview, setQaCoreEchoPreview] =
    useState<CoreEchoPreviewId | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);
  const [manualTopic, setManualTopic] = useState<ManualTopicId | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [qaMode, setQaMode] = useState(false);
  const [publicRecoveryHandled, setPublicRecoveryHandled] = useState(true);
  const [qaCollapsed, setQaCollapsed] = useState(false);
  const [qaLawHeartOverride, setQaLawHeartOverride] =
    useState<LawHeartQaOverride>(DEFAULT_LAW_HEART_QA_OVERRIDE);
  const [qaNullOverride, setQaNullOverride] =
    useState<NullSaturationOverride>(DEFAULT_NULL_SATURATION_OVERRIDE);
  const loadStarted = useRef(false);
  const activeSaveKeyRef = useRef(SAVE_KEY);
  const gameRef = useRef(game);
  const tourActionRef = useRef<HTMLButtonElement>(null);
  const contextGuideActionRef = useRef<HTMLButtonElement>(null);
  const destinationGuideActionRef = useRef<HTMLButtonElement>(null);
  const missionSignatureRef = useRef("");
  const stageSignatureRef = useRef("");

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const openManual = useCallback((topic: ManualTopicId) => {
    setManualTopic(topic);
  }, []);

  const closeManual = useCallback(() => {
    setManualTopic(null);
  }, []);

  useEffect(() => {
    if (!manualTopic) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeManual();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeManual, manualTopic]);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    const now = Date.now();
    let next = createInitialState(now);
    const qaEnabled = new URLSearchParams(window.location.search).get(QA_QUERY_PARAMETER) === "1";
    const activeSaveKey = qaEnabled ? QA_SAVE_KEY : SAVE_KEY;
    activeSaveKeyRef.current = activeSaveKey;
    setQaMode(qaEnabled);

    try {
      setTooltipsEnabled(window.localStorage.getItem(TOOLTIP_PREFERENCE_KEY) !== "off");
      setPublicRecoveryHandled(
        qaEnabled ||
          window.localStorage.getItem(PUBLIC_COLD_WAKE_RECOVERY_KEY) !== null,
      );
      if (!qaEnabled) {
        for (const retiredKey of RETIRED_SAVE_KEYS) {
          window.localStorage.removeItem(retiredKey);
        }
      }
      const raw = window.localStorage.getItem(activeSaveKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { version?: number };
        const expandedCampaignWasNew = (parsed.version ?? 1) < 3;
        const untimedDirectivesWereNew = (parsed.version ?? 1) < 4;
        const loaded = sanitizeGameState(parsed, now);
        const absence = Math.max(0, (now - loaded.lastSaved) / 1_000);
        const credited = Math.min(
          absence,
          getOfflineCapHours(loaded) * 3_600,
        );
        const before = loaded.flux;
        next = simulateGame(loaded, credited, 720, false);
        next.lastSaved = now;
        if (credited >= 2) {
          setOfflineNotice({ seconds: credited, gain: next.flux - before });
          setAnnouncement(
            `Welcome back. The Foundry produced ${formatNumber(next.flux - before)} Flux while you were away.`,
          );
        } else if (expandedCampaignWasNew) {
          setAnnouncement(
            "Cold-wake charts loaded. AXIOM is alone, and Pelagos is the only destination currently disclosed.",
          );
        } else if (untimedDirectivesWereNew) {
          setAnnouncement(
            "Planetary deadlines have been retired. Every world now waits for you, and any earlier loss has been restored.",
          );
        }
      } else if (qaEnabled) {
        next = createQaCheckpoint(0, now);
      }
      window.localStorage.setItem(activeSaveKey, JSON.stringify(next));
      setSaveStatus(qaEnabled ? "QA Sandbox stored separately" : "Progress stored on this device");
    } catch {
      try {
        const damaged = window.localStorage.getItem(activeSaveKey);
        if (damaged) {
          window.localStorage.setItem(`${activeSaveKey}-recovery-${now}`, damaged);
        }
      } catch {
        // Storage can be unavailable in private or restricted browser modes.
      }
      next = createInitialState(now);
      setSaveStatus("Save storage is unavailable; this session still works");
    }

    gameRef.current = next;
    setGame(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !game.settings.tutorialComplete && tourStep === null) {
      setTourStep(0);
    }
  }, [game.settings.tutorialComplete, ready, tourStep]);

  useEffect(() => {
    if (tourStep !== null) tourActionRef.current?.focus();
  }, [tourStep]);

  useEffect(() => {
    if (tourStep === null) return;
    setPrimaryView("deck");
    setFoundryConsoleTab("chain");
  }, [tourStep]);

  useEffect(() => {
    if (!ready) return;
    setClockNow(Date.now());
    const clock = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(clock);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let previous = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - previous) / 1_000);
      previous = now;
      setGame((current) =>
        simulateGame(
          current,
          elapsed,
          Math.min(720, Math.max(1, Math.ceil(elapsed * 4))),
          document.visibilityState === "visible" && tourStep === null && contextGuide === null,
        ),
      );
    }, 100);
    const settleVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") {
        const elapsed = Math.max(0, (now - previous) / 1_000);
        setGame((current) =>
          simulateGame(
            current,
            elapsed,
            Math.min(720, Math.max(1, Math.ceil(elapsed * 4))),
            false,
          ),
        );
      }
      previous = now;
    };
    document.addEventListener("visibilitychange", settleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", settleVisibility);
    };
  }, [contextGuide, ready, tourStep]);

  const persistGame = useCallback((message = "Progress saved") => {
    try {
      const snapshot = { ...gameRef.current, lastSaved: Date.now() };
      window.localStorage.setItem(activeSaveKeyRef.current, JSON.stringify(snapshot));
      setSaveStatus(`${message} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      setSaveStatus("Unable to save in this browser");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => persistGame(), 5_000);
    const saveOnPageExit = () => persistGame();
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") persistGame();
    };
    const noticeNewerTab = (event: StorageEvent) => {
      if (event.key !== activeSaveKeyRef.current || !event.newValue) return;
      try {
        const incoming = sanitizeGameState(JSON.parse(event.newValue));
        if (incoming.lastSaved > gameRef.current.lastSaved + 2_000) {
          setSaveStatus("A newer save exists in another tab");
        }
      } catch {
        // Ignore malformed writes from another tab.
      }
    };

    window.addEventListener("pagehide", saveOnPageExit);
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("storage", noticeNewerTab);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", saveOnPageExit);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("storage", noticeNewerTab);
    };
  }, [persistGame, ready]);

  const production = useMemo(() => getProductionSnapshot(game), [game]);
  const automationEffects = useMemo(() => getActiveAutomationEffects(game), [game]);
  const operationalLoad = useMemo(() => getOperationalLoad(game), [game]);
  const manualGain = useMemo(() => getManualGain(game), [game]);
  const recalibrationGain = useMemo(
    () => getRecalibrationGain(game),
    [game],
  );
  const recalibrationThreshold = useMemo(
    () => getRecalibrationThreshold(game),
    [game],
  );
  const lawHeartPhaseGate = useMemo(
    () => getLawHeartPhaseGateStatus(game),
    [game],
  );
  const axiomProofStatus = useMemo(
    () => getAxiomProofStatus(game),
    [game],
  );
  const objective = useMemo(() => getNextObjective(game), [game]);
  const commandPriorities = useMemo(() => getCommandPriorities(game), [game]);
  const activeMission = MISSIONS[game.missions.currentIndex];
  const activeStage =
    activeMission?.stages[game.missions.stageIndex] ?? null;
  const missionProgress = useMemo(
    () => getMissionProgress(game),
    [game],
  );
  const campaignWorldIndex = getCampaignWorldIndex(game);
  const coldWakeStatus = getColdWakeOnboardingStatus(game);
  const disclosure = useMemo(() => getProgressiveDisclosure(game), [game]);
  const destinationIntroduction: DestinationIntroduction | null =
    !ready || !game.settings.tutorialComplete || tourStep !== null || contextGuide !== null
      ? null
      : getDestinationIntroduction(game);
  const pendingContextGuideId: ContextGuideId | null =
    !ready ||
    !game.settings.tutorialComplete ||
    destinationIntroduction !== null ||
    contextGuide !== null
      ? null
      : getPendingContextGuideId(game, primaryView);

  useEffect(() => {
    if (!pendingContextGuideId) return;
    if (
      pendingContextGuideId === "cold-wake-foundry" ||
      pendingContextGuideId === "pelagos-foundry-expansion" ||
      pendingContextGuideId === "pelagos-gravity-ferry"
    ) {
      setFoundryConsoleTab("chain");
    } else if (pendingContextGuideId === "pelagos-protocols") {
      setFoundryConsoleTab("protocols");
    } else if (pendingContextGuideId === "pelagos-recalibration") {
      setFoundryConsoleTab("recalibration");
    } else if (pendingContextGuideId === "pelagos-automation") {
      setFoundryConsoleTab("autonomy");
    } else if (pendingContextGuideId === "synthesis-drones") {
      setFoundryConsoleTab("drones");
    }
    if (pendingContextGuideId === "viridia-research") {
      setResearchEntry((current) => ({
        view: "core",
        nonce: (current?.nonce ?? 0) + 1,
      }));
    }
    setContextGuide({ id: pendingContextGuideId, step: 0 });
  }, [pendingContextGuideId]);
  const guidedDestinationView = destinationIntroduction?.view ?? null;
  useEffect(() => {
    if (!guidedDestinationView) return;
    document
      .querySelector(`[data-guided-destination="${guidedDestinationView}"]`)
      ?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    destinationGuideActionRef.current?.focus();
  }, [guidedDestinationView]);
  useEffect(() => {
    if (!ready || primaryView === "deck") return;
    const viewIsUnlocked: Record<PrimaryView, boolean> = {
      deck: true,
      engineering: disclosure.engineering,
      research: disclosure.research,
      population: disclosure.population,
      medical: disclosure.medical,
      expeditions: disclosure.expeditions,
      defense: disclosure.defense,
      armory: disclosure.armory,
      settlement: disclosure.settlement,
    };
    if (!viewIsUnlocked[primaryView]) {
      setPrimaryView("deck");
      setAnnouncement("That system has not awakened yet. Continue the active Core Deck directive.");
    }
  }, [disclosure, primaryView, ready]);
  const activeTransit = getActiveTransit(game);
  const worldVisual = activeTransit
    ? {
        slug: "transit",
        accent: "#9fb3ba",
        accentRgb: "159 179 186",
        accentSoft: "rgb(159 179 186 / 0.13)",
        secondary: "#71819a",
        sky: "#010305",
        ground: "#071016",
        planet: "#17242b",
      }
    : WORLD_VISUALS[campaignWorldIndex] ?? WORLD_VISUALS[0];
  const shellStyle = {
    "--flux": worldVisual.accent,
    "--flux-soft": worldVisual.accentSoft,
    "--world-accent": worldVisual.accent,
    "--world-accent-rgb": worldVisual.accentRgb,
    "--world-secondary": worldVisual.secondary,
    "--world-sky": worldVisual.sky,
    "--world-ground": worldVisual.ground,
    "--world-planet": worldVisual.planet,
  } as CSSProperties;
  const discoveredFragments = useMemo(
    () => getDiscoveredFragments(game.living.discoveredLore),
    [game.living.discoveredLore],
  );
  const nextArchiveDiscovery = useMemo(
    () => getNextArchiveDiscovery(game.living.discoveredLore),
    [game.living.discoveredLore],
  );
  const vacuumTapsBought = game.tiers[0].bought;
  const unlockedLoreIds = useMemo(() => {
    const ids = new Set<string>([
      "archive.public.null-tide",
      "archive.public.axiom",
    ]);
    if (game.manualPulses >= 12) ids.add("archive.public.flux");
    if (vacuumTapsBought >= 25 || game.missions.worldsSaved > 0) {
      ids.add("archive.public.foundry");
    }
    if (game.maxFlux >= 10_000 || game.lifetimeAxioms > 0) {
      ids.add("archive.public.axioms");
    }
    if (disclosure.research) ids.add("archive.public.research");
    if (disclosure.settlement) ids.add("archive.public.continuity");
    return ids;
  }, [
    disclosure.research,
    disclosure.settlement,
    game.lifetimeAxioms,
    game.manualPulses,
    game.maxFlux,
    game.missions.worldsSaved,
    vacuumTapsBought,
  ]);
  const availableLoreEntries = useMemo(
    () => LORE_ENTRIES.filter((entry) => unlockedLoreIds.has(entry.id)),
    [unlockedLoreIds],
  );
  const archiveWorlds = useMemo<ArchiveWorldEntry[]>(
    () => MISSIONS.flatMap((mission, index) => {
      const status = game.missions.statuses[index];
      const isCurrent = index === game.missions.currentIndex;
      if (status !== "saved" && status !== "active" && !isCurrent) return [];
      const visibleStatus: ArchiveWorldEntry["status"] =
        status === "saved" ? "saved" : "active";
      return [{
        id: `${index}-${mission.world.toLowerCase().replaceAll(" ", "-")}`,
        name: mission.world,
        status: visibleStatus,
        subtitle: mission.epithet,
        record: visibleStatus === "saved"
          ? mission.success
          : `${mission.hazardLabel}: ${mission.hazard}`,
      }];
    }),
    [game.missions.currentIndex, game.missions.statuses],
  );
  const archiveLaws = useMemo<ArchiveLawEntry[]>(() => {
    const laws: ArchiveLawEntry[] = [];
    if (game.lifetimeAxioms >= 1) laws.push({
      id: "containment",
      name: "The Law of Containment",
      shortName: "Containment",
      meaning: "A sealed hull, a living body, and a remembered name remain themselves under pressure.",
      consequence: "Containment lets the Ark hold a stable interior even when the space around it is losing coherence.",
      source: "Proven during Cold Wake",
    });
    if (game.lifetimeAxioms >= 2) laws.push({
      id: "conservation",
      name: "The Law of Conservation",
      shortName: "Conservation",
      meaning: "What enters a closed system must still be accounted for when nobody is watching.",
      consequence: "Conservation prevents the Null from quietly rewriting the Ark's stores, energy, and physical records.",
      source: "Proven during Cold Wake",
    });
    if (game.lifetimeAxioms >= 3) laws.push({
      id: "transit",
      name: "The Law of Transit",
      shortName: "Transit",
      meaning: "Departure, passage, and arrival belong to one continuous history.",
      consequence: "Transit allows the Ark to carry people and matter through unstable corridors without losing their connection to where they began.",
      source: "Proven during Cold Wake",
    });
    const completed = new Set(game.research.completedProjectIds);
    if (completed.has("resonance-stabilization")) laws.push({
      id: "resonance",
      name: "Resonant Coexistence",
      shortName: "Resonance",
      meaning: "Several portable laws can remain true inside one shared core without erasing each other.",
      consequence: "This proof expands the Law-Heart beyond Cold Wake's three basic laws and begins its stellar evolution.",
      source: "Research: Resonance Stabilization",
    });
    if (completed.has("axiomatic-stellarization")) laws.push({
      id: "stellarization",
      name: "Axiomatic Stellarization",
      shortName: "Stellarization",
      meaning: "A dense network of portable laws can sustain a luminous, self-reinforcing physical core.",
      consequence: "The Law-Heart becomes a small artificial law-star capable of supporting a much wider stable field.",
      source: "Research: Axiomatic Stellarization",
    });
    if (completed.has("convergence-envelope")) laws.push({
      id: "convergence",
      name: "The Convergence Envelope",
      shortName: "Convergence",
      meaning: "Physical laws that disagree can remain locally valid when their boundaries are deliberately maintained.",
      consequence: "The Ark can carry contradictory environments without forcing one reality to overwrite the other.",
      source: "Research: Convergence Envelope",
    });
    return laws;
  }, [game.lifetimeAxioms, game.research.completedProjectIds]);
  const doctrineAvailability = useMemo(
    () =>
      getDoctrineAvailability(
        game.living.discoveredLore,
        game.missions.worldsSaved,
      ),
    [game.living.discoveredLore, game.missions.worldsSaved],
  );
  const chosenDoctrine = getChosenDoctrine(game.living.doctrine);
  const firstLockedGenerator = GENERATORS.findIndex(
    (_, index) => !isTierUnlocked(game, index),
  );
  const visibleGeneratorCount =
    game.missions.currentIndex === 1 && game.missions.stageIndex < PELAGOS_FERRY_STAGE
      ? 1
      : firstLockedGenerator === -1
        ? GENERATORS.length
        : Math.min(GENERATORS.length, firstLockedGenerator + 1);
  const campaignWorld =
    (game.settlement.currentWorldId
      ? getCampaignWorld(game.settlement.currentWorldId)
      : activeTransit
        ? getCampaignWorld(activeTransit.destinationWorldId)
        : null) ?? getCampaignWorld("vesper")!;
  const researchBonuses = useMemo(
    () => getResearchBonuses(game.research),
    [game.research],
  );
  const colonyLegacyEffects = getColonyLegacyEffects(game);
  const lifeSupportCapacityMultiplier =
    researchBonuses.habitationCapacityMultiplier;
  const lifeSupport = useMemo(
    () =>
      getLifeSupportStatus(
        game.survivors,
        [],
        lifeSupportCapacityMultiplier,
      ),
    [game.survivors, lifeSupportCapacityMultiplier],
  );
  const berthCapacity = getBerthCapacity(
    game.survivors,
    lifeSupportCapacityMultiplier,
  );
  const beaconReadiness = getBeaconReadiness({
    planetaryOrbit: campaignWorld.kind === "planet",
    worldName: campaignWorld.name,
    livingSpaces: berthCapacity,
    lifeSupport: lifeSupport.capacity,
  });
  const berthConstructionQuote = useMemo(
    () => getBerthConstructionQuote(game),
    [game],
  );
  const berthConstruction = game.survivors.berthConstruction;
  const berthPanelQuote = {
    canAfford:
      game.flux >= berthConstructionQuote.cost &&
      game.living.salvage >= berthConstructionQuote.salvageCost,
    costLabel: `${formatNumber(berthConstructionQuote.cost)} Flux + ${berthConstructionQuote.salvageCost} Salvage`,
    capacity: berthCapacity,
    berthsPerSection: berthConstructionQuote.berthsPerSection,
    maxed: berthConstructionQuote.maxed,
    inProgress: berthConstructionQuote.inProgress,
    engineerCount: berthConstructionQuote.engineerCount,
    speedMultiplier: berthConstructionQuote.speedMultiplier,
    remainingLabel: berthConstruction
      ? `${formatDuration(
          Math.max(
            0,
            (berthConstruction.durationSeconds -
              berthConstruction.progressSeconds) /
              berthConstructionQuote.speedMultiplier,
          ),
        )} remaining`
      : null,
    progressRatio: berthConstruction
      ? Math.min(
          1,
          berthConstruction.progressSeconds /
            Math.max(1, berthConstruction.durationSeconds),
        )
      : 0,
  };

  const rescueQuote = getArkRescueQuote(game);
  const campaignComplete =
    game.settlement.currentWorldId === null && !activeTransit;
  const expeditionSites = getExpeditionSitesForWorld(
    game.settlement.currentWorldId,
    campaignComplete,
  );
  const expeditionAccess = Object.fromEntries(
    getExpeditionAvailability(
      game.expeditions,
      game.settlement.currentWorldId,
      campaignComplete,
    ).map((entry) => {
      const quote = getExpeditionLaunchQuote(game, entry.site.id, [
        "placeholder-a",
        "placeholder-b",
      ]);
      return [
        entry.site.id,
        {
          available: entry.available && !activeTransit,
          reason: activeTransit ? "in-transit" : entry.reason,
          fluxLabel: `${formatNumber(quote.fluxCost)} Flux`,
          canAffordFlux: game.flux >= quote.fluxCost,
        },
      ];
    }),
  ) as Partial<Record<ExpeditionSiteId, { available: boolean; reason: string | null; fluxLabel: string; canAffordFlux: boolean }>>;
  const rescueDetailActive = hasRescueDetail(game);
  const surfaceRecon = getSurfaceRecon(game);
  const scanDurationSeconds = getScanDurationSeconds(
    game.survivors,
    surfaceRecon.multiplier,
  );
  const viabilityForecast = getCurrentViabilityForecast(game);
  const departureHold = game.settlement.currentWorldId === "cold-wake" &&
    !game.missions.awaitingAcknowledgement
    ? "Cold Wake commissioning is still active. Complete the one highlighted restoration step before orbital insertion."
    : game.expeditions.active
      ? "An expedition is still away. Wait for its automatic return."
    : game.expeditions.stranded
      ? "A stranded party is waiting. Launch a rescue or make the explicit abandonment decision."
      : game.survivors.activeSignal
        ? "A persistent survivor signal is waiting in this orbit. Rescue or decline it before departure."
        : null;
  const campaignCrew = getCampaignCrewSummaries(game);
  const researchPowerAvailable = getResearchPowerAvailable(game);
  const researchCrewAvailable = getResearchCrewAvailable(game);
  const researchCostMultiplier = getResearchCostMultiplier(game);
  const researchExpertise = getOperationalResearchExpertise(game);
  const researchLead = getResearchLeadStatus(game);
  const researchFieldValidation = getResearchFieldValidation(game);
  const researchNetwork = useMemo(
    () =>
      getResearchNetworkStatus(game.research, {
        powerAvailable: researchPowerAvailable,
        crewAvailable: researchCrewAvailable,
        costMultiplier: researchCostMultiplier,
        externalSpeedMultiplier:
          colonyLegacyEffects.researchSpeedMultiplier,
        expertise: researchExpertise,
        leadResearcherLevel: researchLead.level,
        exceptionalLeadAvailable: researchLead.exceptional,
        fieldValidationMultiplier: researchFieldValidation.multiplier,
        automationMultiplier: automationEffects.researchRoutingMultiplier,
      }),
    [
      colonyLegacyEffects.researchSpeedMultiplier,
      game.research,
      researchCostMultiplier,
      researchExpertise,
      researchLead,
      researchFieldValidation.multiplier,
      automationEffects.researchRoutingMultiplier,
      researchCrewAvailable,
      researchPowerAvailable,
    ],
  );
  const activeResearchDefinition = game.research.activeProjectId
    ? getResearchProjectDefinition(game.research.activeProjectId)
    : null;
  const activeResearchProgress = activeResearchDefinition
    ? getResearchProjectProgress(game.research, activeResearchDefinition.id)
    : 0;
  const pendingColonyTransmission = useMemo(
    () => getAllPendingColonyTransmissions(game.settlement)[0] ?? null,
    [game.settlement],
  );
  const supportUpgradeCosts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(game.survivors.lifeSupport) as LifeSupportKey[]).map(
          (key) => [key, getLifeSupportUpgradeSalvageCost(game, key)],
        ),
      ) as Record<LifeSupportKey, number>,
    [game],
  );
  const roomReinforcements = campaignWorldIndex >= 2
    ? ROOM_DEFINITIONS.flatMap((definition) => {
        const room = game.living.rooms.find((candidate) => candidate.id === definition.id);
        const effect = ROOM_REINFORCEMENT_EFFECTS[definition.id];
        if (!room?.unlocked || !effect) return [];
        const cost = getRoomUpgradeCost(game.living, definition.id);
        return [{
          id: definition.id,
          name: definition.name,
          level: room.level,
          maxLevel: definition.maxLevel,
          effect,
          costLabel: Number.isFinite(cost) ? `${formatNumber(cost)} Salvage` : "MAXIMUM MARK",
          canUpgrade: Number.isFinite(cost) && game.living.salvage >= cost,
        }];
      })
    : [];
  const currentWorldProgress = useMemo(
    () => {
      const coldWakeLawIds = [
        "stabilize-containment-law",
        "stabilize-conservation-law",
        "stabilize-transit-law",
      ];
      return {
        ...game.worldProgress,
        completedInfrastructureIds: [
          ...new Set([
            ...game.worldProgress.completedInfrastructureIds,
            ...(game.settlement.currentWorldId === "cold-wake"
              ? coldWakeLawIds.slice(0, Math.min(3, game.lifetimeAxioms))
              : []),
          ]),
        ],
        completedResearchIds: [
          ...new Set([
            ...game.worldProgress.completedResearchIds,
            ...game.research.completedProjectIds,
          ]),
        ],
      };
    },
    [game.lifetimeAxioms, game.research.completedProjectIds, game.settlement.currentWorldId, game.worldProgress],
  );
  const nullSaturation = useMemo(
    () => calculateNullSaturation({
      worldId: campaignWorld.id,
      worldIndex: campaignWorldIndex,
      lifetimeAxioms: game.lifetimeAxioms,
      completedResearchIds: game.research.completedProjectIds,
      completedInfrastructure: currentWorldProgress.completedInfrastructureIds.length,
      override: qaMode ? qaNullOverride : null,
    }),
    [campaignWorld.id, campaignWorldIndex, currentWorldProgress.completedInfrastructureIds.length, game.lifetimeAxioms, game.research.completedProjectIds, qaMode, qaNullOverride],
  );
  const infrastructureQuotes = Object.fromEntries(
    campaignWorld.infrastructure.map((objective, index) => {
      const cost = getInfrastructureFluxCost(game);
      return [
        objective.id,
        campaignWorld.id === "cold-wake"
          ? {
              canAfford: false,
              costLabel: game.lifetimeAxioms > index
                ? "Proven by Recalibration"
                : `Forge Axiom ${index + 1} in the Core Deck`,
            }
          : { canAfford: game.flux >= cost, costLabel: `${formatNumber(cost)} Flux` },
      ];
    }),
  );
  const supplyQuotes = Object.fromEntries(
    campaignWorld.supplyRequirements.map((requirement) => {
      const quote = getSupplyFabricationQuote(game, requirement.id);
      return [
        requirement.id,
        {
          canAfford: game.flux >= quote.cost,
          costLabel: `${formatNumber(quote.cost)} Flux`,
          rewardLabel: `+${quote.amount}`,
        },
      ];
    }),
  );
  const equipmentQuotes = Object.fromEntries(
    campaignWorld.equipment.map((definition) => {
      const quote = getEquipmentFabricationQuote(game, definition.id);
      return [
        definition.id,
        {
          canAfford:
            !quote.atLimit &&
            quote.researchMet &&
            game.flux >= quote.cost &&
            game.researchStock["engineering-models"] >= quote.modelCost,
          costLabel: quote.atLimit
            ? "Fully deployed"
            : !quote.researchMet
              ? `Requires ${quote.researchName ?? "research"}`
              : `${formatNumber(quote.cost)} Flux + ${formatNumber(quote.modelCost)} Engineering Models`,
        },
      ];
    }),
  );
  const crisisQuotes = Object.fromEntries(
    campaignWorld.crisisIds.map((crisisId) => {
      const readiness = getCrisisReadiness(game, crisisId);
      return [
        crisisId,
        {
          canAfford: readiness.canResolve,
          costLabel: `${formatNumber(readiness.cost)} Flux`,
          requirements: readiness.requirements,
        },
      ];
    }),
  );

  const defenseUnlocked = disclosure.defense;
  const defenseCrew = getDefenseCrewContext(game);
  const causalArchive = getCausalArchiveStatus(game);
  const defenseInstallationQuotes = Object.fromEntries(
    (Object.keys(DEFENSE_INSTALLATION_DEFINITIONS) as DefenseInstallationId[]).map((id) => {
      const quote = getDefenseInstallationQuote(game, id);
      const requiredResearch = quote.requiredResearchId
        ? getResearchProjectDefinition(quote.requiredResearchId as ResearchProjectId)
        : null;
      return [
        id,
        {
          mark: quote.mark,
          targetMark: quote.targetMark,
          maxed: quote.maxed,
          busy: quote.busy,
          researchMet: quote.researchMet,
          canAfford: quote.canAfford,
          capability: quote.capability,
          durationLabel: formatDuration(quote.durationSeconds),
          costLabel: quote.maxed
            ? "Architecture complete"
            : !quote.researchMet
              ? `Requires ${requiredResearch?.name ?? quote.requiredResearchId}`
              : `${formatNumber(quote.fluxCost)} Flux + ${quote.salvageCost} Salvage + ${quote.modelCost} Models${quote.schematicCost > 0 ? ` + ${quote.schematicCost} Schematics` : ""}${quote.nullTraceCost > 0 ? ` + ${quote.nullTraceCost} Null Traces` : ""}`,
        },
      ];
    }),
  ) as Record<DefenseInstallationId, {
    mark: number;
    targetMark: number;
    maxed: boolean;
    busy: boolean;
    researchMet: boolean;
    canAfford: boolean;
    capability: string;
    durationLabel: string;
    costLabel: string;
  }>;

  const automationFrameQuote = getAutomationFrameQuote(game);
  const automationFrameQuoteView = {
    maxed: automationFrameQuote.maxed,
    researchMet: automationFrameQuote.researchMet,
    canBuild: automationFrameQuote.canBuild,
    costLabel: `${formatNumber(automationFrameQuote.fluxCost)} Flux · ${automationFrameQuote.salvageCost} Salvage · ${automationFrameQuote.modelCost} Models${automationFrameQuote.schematicCost > 0 ? ` · ${automationFrameQuote.schematicCost} Schematics` : ""}${automationFrameQuote.nullTraceCost > 0 ? ` · ${automationFrameQuote.nullTraceCost} Null Traces` : ""}`,
  };
  const automationProgramUnlocks = Object.fromEntries(
    AUTOMATION_PROGRAM_DEFINITIONS.map((program) => [
      program.id,
      isAutomationProgramUnlocked(game, program.id),
    ]),
  ) as Record<AutomationProgramId, boolean>;
  const lawHeartDroneFrames = AUTOMATION_PROGRAM_DEFINITIONS.flatMap((program) =>
    Array.from(
      { length: game.automation.allocations[program.id] },
      (_, index) => ({
        id: `${program.id}-${index}`,
        color: AUTOMATION_PROGRAM_COLORS[program.id],
        compromised:
          game.defense.compromise?.suppressedAutomationProgram === program.id,
      }),
    ),
  );
  const planetaryDefenseActive = isPlanetaryDefenseActivated(game);
  const planetaryDefenseQuotes = Object.fromEntries(
    game.settlement.colonies.map((colony) => [
      colony.worldId,
      Object.fromEntries(
        (Object.keys(PLANETARY_INSTALLATION_DEFINITIONS) as PlanetaryInstallationId[]).map((installationId) => {
          const quote = getPlanetaryDefenseConstructionQuote(game, colony.worldId, installationId);
          return [
            installationId,
            {
              level: quote.level,
              maxed: quote.maxed,
              busy: quote.busy,
              canBuild: quote.canBuild,
              costLabel: `${formatNumber(quote.fluxCost)} Flux · ${quote.salvageCost} Salvage · ${quote.modelCost} Models`,
            },
          ];
        }),
      ),
    ]),
  ) as Partial<Record<CampaignWorldId, Record<PlanetaryInstallationId, {
    level: number;
    maxed: boolean;
    busy: boolean;
    canBuild: boolean;
    costLabel: string;
  }>>>;

  const expeditionsUnlocked = disclosure.expeditions;
  const armoryUnlocked = disclosure.armory;
  const armoryQuotes = Object.fromEntries(
    ARMORY_ITEM_DEFINITIONS.map((item) => {
      const craft = getArmoryCraftQuote(game, item.id);
      const repair = getArmoryRepairQuote(game, item.id);
      const upgrade = getArmoryUpgradeQuote(game, item.id);
      const upgradeResearch = upgrade.requiredResearchId
        ? getResearchProjectDefinition(upgrade.requiredResearchId)
        : null;
      const upgradeReason =
        upgrade.reason === "maxed"
          ? "Maximum known Mark"
          : upgrade.reason === "project"
            ? "Another Armory project is active"
            : upgrade.reason === "law"
              ? "Requires Impossible Materials law"
              : upgrade.reason === "research"
                ? `Requires ${upgradeResearch?.name ?? "advanced research"}`
                : upgrade.reason
                  ? `Needs more ${upgrade.reason}`
                  : null;
      return [
        item.id,
        {
          ready: craft.ready,
          damaged: craft.damaged,
          researchMet: craft.researchMet,
          canCraft: craft.canCraft,
          reason: craft.reason,
          craftCostLabel: `${formatNumber(craft.fluxCost)} Flux`,
          repairCostLabel: `${formatNumber(repair.fluxCost)} Flux`,
          canRepair: repair.canRepair,
          researchName:
            getResearchProjectDefinition(
              item.requiredResearchId as Parameters<typeof getResearchProjectDefinition>[0],
            )?.name ?? item.requiredResearchId,
          wielders: game.survivors.survivors.filter(
            (survivor) => getSurvivorBestSkillLevel(survivor) >= item.wieldLevel,
          ).length,
          mark: game.armory.marks[item.id],
          effectivePrimary:
            item.kind === "weapon"
              ? `+${getEffectiveWeaponStrength(game.armory, item.id as ArmoryWeaponId)} per carrier`
              : `×${getEffectiveArmorMultiplier(game.armory, item.id as ArmoryArmorId).toFixed(2)}`,
          effectiveDurability: getEffectiveArmoryDurability(game.armory, item.id),
          modification: game.armory.modifications[item.id],
          upgrade: {
            targetMark: upgrade.targetMark,
            canStart: upgrade.canStart,
            reason: upgradeReason,
            costLabel: `${formatNumber(upgrade.fluxCost)} Flux · ${upgrade.salvageCost} Salvage · ${upgrade.schematicCost} SCH · ${upgrade.modelCost} Models${upgrade.nullTraceCost ? ` · ${upgrade.nullTraceCost} Null` : ""}`,
            durationLabel: formatDuration(upgrade.durationSeconds),
            researchName: upgradeResearch?.name ?? null,
          },
          modifications: (Object.keys(ARMORY_MODIFICATIONS) as ArmoryModificationId[])
            .filter((id) => ARMORY_MODIFICATIONS[id].kinds.includes(item.kind))
            .map((id) => {
              const modification = getArmoryModificationQuote(game, item.id, id);
              return {
                id,
                available: modification.researchMet,
                canInstall: modification.canInstall,
                costLabel: `${modification.salvageCost} Salvage · ${modification.schematicCost} SCH`,
                researchName:
                  getResearchProjectDefinition(
                    ARMORY_MODIFICATIONS[id]
                      .requiredResearchId as Parameters<
                      typeof getResearchProjectDefinition
                    >[0],
                  )?.name ?? ARMORY_MODIFICATIONS[id].requiredResearchId,
              };
            }),
        },
      ];
    }),
  ) as unknown as Record<ArmoryItemId, ArmoryItemQuoteView>;
  const armoryLaws = Object.fromEntries(
    (Object.keys(ARMORY_LAWS) as ArmoryLawId[]).map((lawId) => [
      lawId,
      getArmoryLawQuote(game, lawId),
    ]),
  ) as Record<ArmoryLawId, ReturnType<typeof getArmoryLawQuote>>;
  const activeArmoryProject = game.armory.activeProject
    ? {
        itemName: ARMORY_ITEM_DEFINITIONS.find(
          (item) => item.id === game.armory.activeProject!.itemId,
        )!.name,
        targetMark: game.armory.activeProject.targetMark,
        progress:
          1 -
          game.armory.activeProject.remainingSeconds /
            game.armory.activeProject.totalSeconds,
        remainingLabel: formatDuration(game.armory.activeProject.remainingSeconds),
      }
    : null;

  useEffect(() => {
    if (!ready) return;
    const signature = `${game.missions.currentIndex}:${game.missions.awaitingAcknowledgement}:${game.missions.worldsSaved}`;
    if (
      missionSignatureRef.current &&
      signature !== missionSignatureRef.current &&
      activeMission
    ) {
      setAnnouncement(
        `${activeMission.world} engineering complete. Open the continuity forecast to finish the world responsibly.`,
      );
    }
    missionSignatureRef.current = signature;
  }, [
    game.missions.awaitingAcknowledgement,
    game.missions.currentIndex,
    game.missions.worldsSaved,
    activeMission,
    ready,
  ]);

  useEffect(() => {
    if (!ready) return;
    const signature = `${game.missions.currentIndex}:${game.missions.stageIndex}`;
    if (
      stageSignatureRef.current &&
      signature !== stageSignatureRef.current &&
      !game.missions.awaitingAcknowledgement &&
      activeMission &&
      activeStage
    ) {
      setAnnouncement(
        `${activeMission.world} phase ${game.missions.stageIndex + 1}: ${activeStage.label}.`,
      );
    }
    stageSignatureRef.current = signature;
  }, [
    activeMission,
    activeStage,
    game.missions.awaitingAcknowledgement,
    game.missions.currentIndex,
    game.missions.stageIndex,
    ready,
  ]);

  const handlePulse = () => {
    setGame((current) => pulseCore(current));
  };

  const handleBuyTier = (index: number) => {
    const quantity = getPurchaseQuantity(
      gameRef.current,
      index,
      gameRef.current.settings.buyMode,
    );
    if (quantity <= 0) return;
    setGame((current) =>
      buyTier(current, index, current.settings.buyMode),
    );
    setAnnouncement(`Built ${quantity} ${GENERATORS[index].name}${quantity === 1 ? "" : "s"}.`);
  };

  const handleRunUpgrade = (index: number) => {
    if (getRunUpgradeCost(gameRef.current, index) > gameRef.current.flux) {
      return;
    }
    setGame((current) => buyRunUpgrade(current, index));
    setAnnouncement(`${RUN_UPGRADES[index].name} advanced one level.`);
  };

  const handleLegacyUpgrade = (index: number) => {
    const before = gameRef.current;
    const next = allocateLegacyUpgrade(before, index);
    if (next === before) return;
    setGame(next);
    setAnnouncement(`${LEGACY_UPGRADES[index].name} received one permanent Mark.`);
  };

  const handleReleaseLegacyUpgrade = (index: number) => {
    const before = gameRef.current;
    const next = releaseLegacyUpgrade(before, index);
    if (next === before) return;
    setGame(next);
    setAnnouncement(`${LEGACY_UPGRADES[index].name} released one Mark for reassignment.`);
  };

  const handleCommitLegacyMatrix = () => {
    setGame((current) => commitLegacyMatrix(current));
    setAnnouncement("Legacy Matrix allocation committed for this cycle.");
  };

  const handleMissionContribution = () => {
    const current = gameRef.current;
    const mission = MISSIONS[current.missions.currentIndex];
    const stage = mission?.stages[current.missions.stageIndex];
    if (!stage || stage.kind !== "contributeFlux") return;
    const amount = Math.min(
      current.flux,
      Math.max(0, stage.target - current.missions.contributedFlux),
    );
    if (amount <= 0) return;
    setGame((state) => contributeToMission(state));
    setAnnouncement(
      `${formatNumber(amount)} Flux diverted to ${mission.world}.`,
    );
  };

  const handleRecalibrate = () => {
    const current = gameRef.current;
    const gain = getRecalibrationGain(current);
    if (gain < 1) return;
    const next = recalibrate(current, Date.now());
    gameRef.current = next;
    setGame(next);
    setConfirmPrestige(false);
    setFoundryConsoleTab("legacy");
    setAnnouncement(
      `Recalibration complete. Cycle ${next.cycle} begins with ${gain} new Axiom${gain === 1 ? "" : "s"}.`,
    );
    window.setTimeout(() => persistGame("Recalibration saved"), 0);
  };

  const handleHardReset = () => {
    try {
      window.localStorage.removeItem(activeSaveKeyRef.current);
    } catch {
      // The in-memory reset still works when storage is unavailable.
    }
    const next = qaMode ? createQaCheckpoint(0, Date.now()) : createInitialState(Date.now());
    gameRef.current = next;
    setGame(next);
    setPrimaryView("deck");
    setFoundryConsoleTab("chain");
    setConfirmReset(false);
    setAnnouncement(qaMode ? "The QA Sandbox has been reset to Cold Wake." : "The Foundry has been reset to Cycle 1.");
    setSaveStatus("Fresh local save started");
  };

  const commitGameState = (next: GameState, message: string) => {
    if (next === gameRef.current) return false;
    gameRef.current = next;
    setGame(next);
    setAnnouncement(message);
    window.setTimeout(() => persistGame("Ark state saved"), 0);
    return true;
  };

  const handleOpenArkView = (view: ArkViewId) => {
    if (!unlockedArkViews.includes(view)) {
      setAnnouncement("That deck is still dormant. Follow the active directive to wake it.");
      return;
    }
    setPrimaryView(view);
    if (view === "engineering") setFoundryConsoleTab("chain");
  };

  const handleAuthorizeFoundryWake = () => {
    const next = setColdWakeForecastReviewed(gameRef.current);
    commitGameState(
      next,
      "Foundry wake-up authorized. One new destination is ready; build only the highlighted Vacuum Taps.",
    );
  };

  const handleColdWakeSequenceAction = () => {
    const current = gameRef.current;
    if (current.missions.stageIndex === COLD_WAKE_FOUNDRY_STAGE) {
      if (!current.settings.coldWakeForecastReviewed) handleAuthorizeFoundryWake();
      else {
        setFoundryConsoleTab("chain");
        setPrimaryView("engineering");
      }
      return;
    }
    if (
      current.missions.stageIndex === COLD_WAKE_NAVIGATION_STAGE ||
      current.missions.stageIndex === COLD_WAKE_LIFE_SUPPORT_STAGE
    ) {
      setPrimaryView("deck");
      return;
    }
    if (current.missions.stageIndex === COLD_WAKE_DEPARTURE_STAGE) {
      handleMissionContribution();
    }
  };

  const handleToggleTooltips = () => {
    setTooltipsEnabled((enabled) => {
      const next = !enabled;
      try {
        window.localStorage.setItem(TOOLTIP_PREFERENCE_KEY, next ? "on" : "off");
      } catch {
        // Preference remains active for this session when storage is unavailable.
      }
      return next;
    });
  };

  const applyQaState = (next: GameState, message: string) => {
    gameRef.current = next;
    setGame(next);
    setAnnouncement(message);
    window.setTimeout(() => persistGame("QA checkpoint saved"), 0);
  };

  const handleQaJumpWorld = (worldIndex: number) => {
    const next = createQaCheckpoint(worldIndex, Date.now());
    setPrimaryView("deck");
    setFoundryConsoleTab("chain");
    applyQaState(next, `Fresh ${MISSIONS[worldIndex]?.world ?? "Cold Wake"} opening loaded with its normal arrival resources.`);
    setQaCollapsed(true);
    setContextGuide(null);
    setTourStep(null);
  };

  const handleQaJumpTransit = (originWorldIndex: number) => {
    const next = createQaTransitCheckpoint(originWorldIndex, Date.now());
    const journey = next.transit.active;
    setPrimaryView("settlement");
    applyQaState(
      next,
      journey
        ? `${getCampaignWorld(journey.originWorldId)?.name ?? "Origin"} to ${getCampaignWorld(journey.destinationWorldId)?.name ?? "destination"} transit loaded at departure.`
        : "Transit preview could not be loaded.",
    );
    setQaCollapsed(true);
    setContextGuide(null);
    setTourStep(null);
  };

  const handleReturnToPlayerSave = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(QA_QUERY_PARAMETER);
    window.location.assign(url.toString());
  };

  const handleCommandPriorityNavigate = (priority: CommandPriority) => {
    setPrimaryView(priority.target);
    if (priority.target === "engineering") {
      setFoundryConsoleTab(
        priority.panel === "systems"
          ? recalibrationUnlocked
            ? "recalibration"
            : protocolsUnlocked
              ? "protocols"
              : "chain"
          : "chain",
      );
    }
    if (priority.target === "research") {
      const view: ResearchView =
        priority.panel === "research-lattice"
          ? "lattice"
          : priority.panel === "research-technology"
            ? "technology"
            : "core";
      setResearchEntry((current) => ({
        view,
        nonce: (current?.nonce ?? 0) + 1,
      }));
    }
  };

  const handleStartBerthConstruction = () => {
    const current = gameRef.current;
    const next = startArkBerthConstruction(current);
    if (next === current) {
      setAnnouncement("Living-space construction needs more Flux and Salvage, or a section is already underway.");
      return;
    }
    commitGameState(
      next,
      "Habitation ring section under construction. Assigned engineers will accelerate it, even while you are away.",
    );
  };

  const handleBuyDefenseInstallation = (id: DefenseInstallationId) => {
    const current = gameRef.current;
    const quote = getDefenseInstallationQuote(current, id);
    const next = buyDefenseInstallation(current, id);
    if (next === current) {
      setAnnouncement("That Mark project still needs its listed research or committed resources, or another installation is already under construction.");
      return;
    }
    commitGameState(next, `${DEFENSE_INSTALLATION_DEFINITIONS[id].name} Mark ${quote.targetMark} construction started. Work continues offline.`);
  };

  const handleLaunchRescue = (crewIds: readonly string[]) => {
    const current = gameRef.current;
    const next = startRescueMission(current, crewIds);
    if (next === current) {
      setAnnouncement("The rescue cannot launch yet - check crew availability and the Flux cost.");
      return;
    }
    commitGameState(next, "Rescue mission away. It always brings everyone home - even while the game is closed.");
  };

  const handleAbandonStranded = () => {
    const current = gameRef.current;
    const count = current.expeditions.stranded?.crewIds.length ?? 0;
    const next = abandonStrandedCrew(current);
    if (next === current) return;
    commitGameState(next, `${count} crew abandoned. Their names are recorded on the memorial wall.`);
  };

  const handleAdmitToMedBay = (survivorId: string) => {
    const current = gameRef.current;
    const next = admitCrewToMedBay(current, survivorId);
    if (next === current) return;
    const patient = next.survivors.survivors.find((survivor) => survivor.id === survivorId);
    commitGameState(next, `${patient?.callsign || patient?.name || "Crew"} admitted to the Medical Bay. They will do nothing but heal until discharged.`);
  };

  const handleDischargeFromMedBay = (survivorId: string) => {
    const current = gameRef.current;
    const next = dischargeCrewFromMedBay(current, survivorId);
    if (next === current) return;
    const patient = next.survivors.survivors.find((survivor) => survivor.id === survivorId);
    commitGameState(next, `${patient?.callsign || patient?.name || "Crew"} discharged from the Medical Bay.`);
  };

  const handleAppointLeader = (survivorId: string | null) => {
    const current = gameRef.current;
    const next = setCommandLeader(current, survivorId);
    if (next === current) return;
    const leader = survivorId
      ? next.survivors.survivors.find((survivor) => survivor.id === survivorId)
      : null;
    commitGameState(
      next,
      leader
        ? `${leader.callsign || leader.name} now leads the crew. AXIOM notes the transfer of biological command authority.`
        : "The crew leader stood down. Team Alpha awaits a new appointment.",
    );
  };

  const handleToggleTeamMember = (survivorId: string) => {
    const current = gameRef.current;
    const next = toggleTeamAlphaMember(current, survivorId);
    if (next === current) return;
    const joined = next.survivors.commandTeam.memberIds.includes(survivorId);
    const member = next.survivors.survivors.find((survivor) => survivor.id === survivorId);
    commitGameState(next, `${member?.callsign || member?.name || "Crew"} ${joined ? "joined" : "left"} Team Alpha.`);
  };

  const handleAssignTeamMember = (
    slotIndex: number,
    survivorId: string | null,
  ) => {
    const current = gameRef.current;
    const previousId =
      current.survivors.commandTeam.memberIds[slotIndex] ?? null;
    const next = assignTeamAlphaMember(current, slotIndex, survivorId);
    if (next === current) return;
    const member = survivorId
      ? next.survivors.survivors.find(
          (survivor) => survivor.id === survivorId,
        )
      : null;
    const previous = previousId
      ? current.survivors.survivors.find(
          (survivor) => survivor.id === previousId,
        )
      : null;
    commitGameState(
      next,
      member
        ? `${member.callsign || member.name} assigned to Team Alpha officer slot ${slotIndex + 1}.`
        : `${previous?.callsign || previous?.name || `Officer slot ${slotIndex + 1}`} released from Team Alpha.`,
    );
  };

  const handleSetDoctrine = (role: Parameters<typeof chooseTrainingDoctrine>[1]) => {
    const current = gameRef.current;
    const next = chooseTrainingDoctrine(current, role);
    if (next === current) return;
    commitGameState(next, role ? `Training doctrine set: the crew leans ${role === "security" ? "Soldier" : role}. Idle crew will enroll automatically.` : "Training doctrine cleared. Training is fully manual again.");
  };

  const handleProstheticSurgery = (survivorId: string) => {
    const current = gameRef.current;
    const next = performProstheticSurgery(current, survivorId);
    if (next === current) return;
    const patient = next.survivors.survivors.find((survivor) => survivor.id === survivorId);
    commitGameState(next, `${patient?.callsign || patient?.name || "The patient"} received a prosthetic. Their injury is repaired and full recovery is underway.`);
  };

  const handleCraftArmoryItem = (itemId: ArmoryItemId) => {
    const current = gameRef.current;
    const next = craftArmoryItem(current, itemId);
    if (next === current) return;
    const item = ARMORY_ITEM_DEFINITIONS.find((entry) => entry.id === itemId)!;
    commitGameState(next, `${item.name} forged and stocked in the armory.`);
  };

  const handleRepairArmoryItem = (itemId: ArmoryItemId) => {
    const current = gameRef.current;
    const next = repairArmoryItem(current, itemId);
    if (next === current) return;
    const item = ARMORY_ITEM_DEFINITIONS.find((entry) => entry.id === itemId)!;
    commitGameState(next, `${item.name} repaired to full durability.`);
  };

  const handleUpgradeArmoryItem = (itemId: ArmoryItemId) => {
    const current = gameRef.current;
    const quote = getArmoryUpgradeQuote(current, itemId);
    const next = beginArmoryUpgrade(current, itemId);
    if (next === current || !quote.targetMark) return;
    const item = ARMORY_ITEM_DEFINITIONS.find((entry) => entry.id === itemId)!;
    commitGameState(
      next,
      `${item.name} Mark ${quote.targetMark} development started. The Armory will continue while you are away.`,
    );
  };

  const handleArmoryModification = (
    itemId: ArmoryItemId,
    modificationId: ArmoryModificationId | null,
  ) => {
    const current = gameRef.current;
    const next = installArmoryModification(current, itemId, modificationId);
    if (next === current) return;
    const item = ARMORY_ITEM_DEFINITIONS.find((entry) => entry.id === itemId)!;
    commitGameState(
      next,
      modificationId
        ? `${ARMORY_MODIFICATIONS[modificationId].name} fitted to every ${item.name} pattern.`
        : `${item.name} returned to its standard pattern.`,
    );
  };

  const handleBuyArmoryLaw = (lawId: ArmoryLawId) => {
    const current = gameRef.current;
    const next = purchaseArmoryLaw(current, lawId);
    if (next === current) return;
    commitGameState(next, `${ARMORY_LAWS[lawId].name} has become a permanent Armory law.`);
  };

  const handleChooseDefenseDoctrine = (doctrine: DefenseDoctrine) => {
    const current = gameRef.current;
    const next = chooseDefenseDoctrine(current, doctrine);
    if (next === current) return;
    commitGameState(next, `Contact doctrine set: ${doctrine}. It applies to every hostile contact, even offline.`);
  };

  const handleChooseEnvironmentalDefenseDoctrine = (
    doctrine: EnvironmentalDoctrine,
  ) => {
    const current = gameRef.current;
    const next = chooseEnvironmentalDefenseDoctrine(current, doctrine);
    if (next === current) return;
    commitGameState(next, `Environmental doctrine set: ${doctrine}. Transit and orbital hazards will use it automatically.`);
  };

  const handleBuildAutomationFrame = () => {
    const current = gameRef.current;
    const next = fabricateAutomationFrame(current);
    if (next === current) return;
    commitGameState(next, "Utility drone frame fabricated. Assign it to a support program on the Foundry floor.");
  };

  const handleAutomationAllocation = (
    programId: AutomationProgramId,
    amount: number,
  ) => {
    const current = gameRef.current;
    const next = setAutomationAllocation(current, programId, amount);
    if (next === current) return;
    commitGameState(next, `${programId.replaceAll("-", " ")} allocation updated. Operational load recalculated.`);
  };

  const handleAutomationPolicy = (policy: AutomationMaintenancePolicy) => {
    const current = gameRef.current;
    const next = setAutomationMaintenancePolicy(current, policy);
    if (next === current) return;
    commitGameState(next, `Automated equipment maintenance set to ${policy}.`);
  };

  const handlePlanetaryDefenseDoctrine = (doctrine: PlanetaryDefenseDoctrine) => {
    const current = gameRef.current;
    const next = choosePlanetaryDefenseDoctrine(current, doctrine);
    if (next === current) return;
    commitGameState(next, `Planetary network posture set to ${doctrine}. Flux diversion updated across every restored world.`);
  };

  const handlePlanetaryDefenseConstruction = (
    worldId: Parameters<typeof beginPlanetaryDefenseConstruction>[1],
    installationId: PlanetaryInstallationId,
  ) => {
    const current = gameRef.current;
    const next = beginPlanetaryDefenseConstruction(current, worldId, installationId);
    if (next === current) return;
    commitGameState(next, `${PLANETARY_INSTALLATION_DEFINITIONS[installationId].name} construction started. Work continues offline.`);
  };

  const handleUpgradeSupport = (key: LifeSupportKey) => {
    const current = gameRef.current;
    const cost = getLifeSupportUpgradeSalvageCost(current, key);
    if (current.living.salvage < cost) return;
    const survivors = setLifeSupportCapacity(current.survivors, {
      [key]: current.survivors.lifeSupport[key] + 4,
    });
    commitGameState(
      {
        ...current,
        survivors,
        living: {
          ...current.living,
          salvage: current.living.salvage - cost,
        },
      },
      `${key.replaceAll("-", " ")} capacity expanded. The Ark can safely support more people.`,
    );
  };

  const handleActivateBeacon = () => {
    const current = gameRef.current;
    const worldId = current.settlement.currentWorldId;
    if (!worldId || worldId === "cold-wake") {
      setAnnouncement("The SOS array cannot transmit until the Ark reaches a planetary orbit.");
      return;
    }
    if (
      worldId === "pelagos" &&
      !current.survivors.beaconOnline &&
      current.missions.stageIndex !== PELAGOS_BEACON_STAGE
    ) {
      setAnnouncement("Continuity has not completed the receiver and habitability sequence yet.");
      return;
    }
    const survivors = setSosBeaconOnline(current.survivors, true, worldId);
    if (survivors === current.survivors) return;
    commitGameState(
      { ...current, survivors },
      `${campaignWorld.name} SOS carrier online. The first decoded signal will never expire.`,
    );
  };

  const handleRescueSurvivors = () => {
    const current = gameRef.current;
    const quote = getArkRescueQuote(current);
    const next = performArkRescue(current);
    if (next === current) {
      setAnnouncement(
        quote.reason === "roster-full"
          ? "The signal is holding. The Ark has reached its 48-person limit; establish a founding community before accepting more people."
          : quote.reason === "berths"
          ? "The signal is holding. Expand the Ark's living space before dispatching the shuttle."
          : quote.reason === "life-support"
            ? "The signal is holding. Expand every life-support category before dispatching the shuttle."
            : quote.reason === "flux"
              ? "The signal is holding. The shuttle launch needs more Flux."
              : "The signal is holding until the Ark has enough Salvage and capacity.",
      );
      return;
    }
    const rescued =
      next.survivors.survivors.length - current.survivors.survivors.length;
    commitGameState(
      next,
      `${rescued} survivors are safely aboard. Their names, aptitudes, and histories are now part of the Ark.`,
    );
  };

  const handlePelagosSequenceAction = () => {
    const current = gameRef.current;
    if (current.missions.currentIndex !== 1) return;
    if (current.missions.stageIndex === PELAGOS_RECEIVER_STAGE) {
      setPrimaryView("engineering");
      setFoundryConsoleTab("chain");
      return;
    }
    if (current.missions.stageIndex === PELAGOS_HABITABILITY_STAGE) {
      setPrimaryView("deck");
      return;
    }
    if (current.missions.stageIndex === PELAGOS_BEACON_STAGE) {
      handleActivateBeacon();
      return;
    }
    if (current.missions.stageIndex === PELAGOS_FIRST_RESCUE_STAGE) {
      handleRescueSurvivors();
    }
  };

  const handleLaunchExpedition = (
    siteId: ExpeditionSiteId,
    crewIds: readonly string[],
  ) => {
    const current = gameRef.current;
    const next = startExpedition(current, siteId, crewIds);
    if (next === current) {
      setAnnouncement(
        current.transit.active
          ? "The launch bay is secured for transit. Expeditions resume automatically when the Ark reaches orbit."
          : "The expedition cannot launch yet - check crew availability and the Flux cost.",
      );
      return;
    }
    commitGameState(
      next,
      `${EXPEDITION_SITE_DEFINITIONS.find((site) => site.id === siteId)?.name ?? "Expedition"} away. The crew returns automatically - even while the game is closed.`,
    );
  };

  const handleToggleAutoRescue = (enabled: boolean) => {
    const current = gameRef.current;
    commitGameState(
      { ...current, survivors: setAutoRescueEnabled(current.survivors, enabled) },
      enabled
        ? "Survivor Duty active: the rescue detail dispatches automatically when every requirement is met."
        : "Survivor Duty paused. Rescues wait for your manual order.",
    );
  };

  const handleStartTraining = (
    survivorId: string,
    role: ProfessionalRole,
  ) => {
    const current = gameRef.current;
    if (current.bioadaptation.active?.survivorId === survivorId) {
      setAnnouncement("That volunteer is in the Bioadaptation Clinic. Training resumes after the procedure finishes.");
      return;
    }
    const survivors = startSurvivorTraining(
      current.survivors,
      survivorId,
      role,
    );
    commitGameState(
      { ...current, survivors },
      `${role.replaceAll("-", " ")} training started. It continues while you are away.`,
    );
  };

  const handleCancelTraining = (survivorId: string) => {
    const current = gameRef.current;
    commitGameState(
      {
        ...current,
        survivors: cancelSurvivorTraining(current.survivors, survivorId),
      },
      "Training paused without penalty.",
    );
  };

  const handleAssignSurvivor = (
    survivorId: string,
    role: SurvivorRole | null,
  ) => {
    const current = gameRef.current;
    if (current.bioadaptation.active?.survivorId === survivorId) {
      setAnnouncement("That volunteer is in the Bioadaptation Clinic and cannot take a station yet.");
      return;
    }
    commitGameState(
      {
        ...current,
        survivors: assignSurvivorToRole(
          current.survivors,
          survivorId,
          role,
        ),
      },
      role ? `Crew assignment updated: ${role === "security" ? "soldier" : role}.` : "Crew member released from duty.",
    );
  };

  const handleRenameSurvivor = (survivorId: string, callsign: string) => {
    const current = gameRef.current;
    commitGameState(
      {
        ...current,
        survivors: renameSurvivorCallsign(
          current.survivors,
          survivorId,
          callsign,
        ),
      },
      "Crew callsign updated.",
    );
  };

  const handleResearchStateChange = (research: ResearchLatticeState) => {
    const current = gameRef.current;
    commitGameState(
      { ...current, research },
      research.activeProjectId
        ? `Research routing updated: ${getResearchProjectDefinition(research.activeProjectId)?.name ?? "active project"}.`
        : "Research lattice configuration updated.",
    );
  };

  const handleResearchCrewChange = (assignedCrew: number) => {
    const current = gameRef.current;
    commitGameState(
      {
        ...current,
        research: setResearchCrew(
          current.research,
          assignedCrew,
          getResearchCrewAvailable(current),
        ),
      },
      "Analysis Core staffing updated.",
    );
  };

  const handleTransferResearchInput = (
    inputId: ResearchInputId,
    amount: number,
  ) => {
    const current = gameRef.current;
    const available = current.researchStock[inputId];
    const transferred = Math.min(available, Math.max(0, amount));
    if (transferred <= 0) return;
    commitGameState(
      {
        ...current,
        research: addResearchInputs(current.research, {
          [inputId]: transferred,
        }),
        researchStock: {
          ...current.researchStock,
          [inputId]: available - transferred,
        },
      },
      `${formatNumber(transferred)} ${inputId.replaceAll("-", " ")} routed into the Analysis Core.`,
    );
  };

  const handleToggleSettler = (crewId: string) => {
    const current = gameRef.current;
    commitGameState(
      {
        ...current,
        settlement: toggleSettlerSelection(
          current.settlement,
          getCampaignCrewSummaries(current),
          crewId,
        ),
      },
      "Founding roster recalculated.",
    );
  };

  const handleCompleteInfrastructure = (objectiveId: string) => {
    const current = gameRef.current;
    const next = completeWorldInfrastructure(current, objectiveId);
    commitGameState(next, "Planetary infrastructure objective secured.");
  };

  const handleFabricateSupply = (supplyId: string) => {
    const current = gameRef.current;
    const next = fabricateWorldSupply(current, supplyId);
    commitGameState(next, "Settlement supply batch moved into the departure reserve.");
  };

  const handleFabricateEquipment = (equipmentId: string) => {
    const current = gameRef.current;
    const next = fabricateWorldEquipment(current, equipmentId);
    if (next === current) return;
    commitGameState(
      next,
      `${equipmentId.replaceAll("-", " ")} fabricated. It now counts toward this world's continuity forecast.`,
    );
  };

  const handleResolveCrisis = (crisisId: string) => {
    const current = gameRef.current;
    const next = resolveCurrentCrisis(current, crisisId);
    if (next === current) {
      setAnnouncement(
        "Finish every item in this crisis's visible checklist before resolving it.",
      );
      return;
    }
    commitGameState(next, `${crisisId.replaceAll("-", " ")} resolved without a deadline or loss state.`);
  };

  const handleCampaignDeparture = (colonyName: string) => {
    const current = gameRef.current;
    const result = departCurrentWorld(current, Date.now(), colonyName);
    if (!result.ok) {
      setAnnouncement(
        result.reason === "expedition-active"
          ? "Departure paused. An expedition is still away from the Ark; wait for its automatic return."
          : result.reason === "crew-stranded"
            ? "Departure paused. A stranded party is still waiting for rescue or an explicit abandonment decision."
            : result.reason === "survivor-signal-pending"
              ? "Departure paused. Resolve the persistent survivor signal before leaving this orbit."
              : "Departure denied. The continuity forecast still lists required work or founders.",
      );
      return;
    }
    commitGameState(
      result.state,
      result.nextWorldId
        ? result.state.transit.active
          ? `${campaignWorld.name} is independent. The Ark is in transit to ${getCampaignWorld(result.nextWorldId)?.name ?? "the next world"}; arrival in ${formatDuration(result.state.transit.active.totalSeconds)}.`
          : `${campaignWorld.name} is independent. The Ark has reached ${getCampaignWorld(result.nextWorldId)?.name ?? "the next world"}.`
        : "The continuity route is complete. AXIOM must now decide what kind of future it has been building.",
    );
    setPrimaryView(result.state.transit.active ? "settlement" : "deck");
  };

  const handleAcknowledgeTransmission = () => {
    const pending = getAllPendingColonyTransmissions(gameRef.current.settlement)[0];
    if (!pending) return;
    const current = gameRef.current;
    commitGameState(
      {
        ...current,
        settlement: acknowledgeColonyTransmission(
          current.settlement,
          pending.worldId,
        ),
      },
      `Transmission from ${pending.colonyName} archived.`,
    );
  };

  const commitLivingChange = (
    transform: (state: GameState["living"], game: GameState) => GameState["living"],
    message: string,
  ) => {
    const current = gameRef.current;
    let living = transform(current.living, current);
    if (living === current.living) return false;
    living = grantLivingFoundryRewards(living, {
      loreIds: syncAutomaticDiscoveries(
        living.discoveredLore,
        current.missions.worldsSaved,
        current.settings.tutorialComplete,
      ),
    });
    const next = { ...current, living };
    gameRef.current = next;
    setGame(next);
    setAnnouncement(message);
    window.setTimeout(() => persistGame("Living Foundry saved"), 0);
    return true;
  };

  const finishPublicRecoveryPrompt = (result: "recovered" | "dismissed") => {
    try {
      window.localStorage.setItem(PUBLIC_COLD_WAKE_RECOVERY_KEY, result);
    } catch {
      // The prompt can still close for this session when storage is unavailable.
    }
    setPublicRecoveryHandled(true);
  };

  const handleColdWakeRecovery = () => {
    if (qaMode) return;
    const next = createColdWakeStepFiveRecoveryState(Date.now());
    gameRef.current = next;
    setGame(next);
    setPrimaryView("settlement");
    setFoundryConsoleTab("chain");
    setContextGuide(null);
    setTourStep(null);
    setAnnouncement(
      "Cold Wake commissioning recovered. Authorize Pelagos orbital insertion when ready.",
    );
    finishPublicRecoveryPrompt("recovered");
    window.setTimeout(() => persistGame("Recovered progress saved"), 0);
  };

  const handleUpgradeLivingRoom = (roomId: RoomId) => {
    const definition = ROOM_DEFINITIONS.find((candidate) => candidate.id === roomId);
    if (!definition) return;
    commitLivingChange(
      (living) => upgradeRoom(living, roomId),
      `${definition.name} reinforcement completed.`,
    );
  };

  const handleArchiveInvestigation = () => {
    const current = gameRef.current;
    const fragment = getNextArchiveDiscovery(current.living.discoveredLore);
    if (!fragment) return;
    // Cross-indexing contradictions exposes measurable absences: the one
    // active Null Trace source outside crisis resolution.
    const traceReward = 15 + 10 * getCampaignWorldIndex(current);
    commitGameState(
      {
        ...current,
        living: grantLivingFoundryRewards(current.living, {
          loreIds: addDiscovery(current.living.discoveredLore, fragment.id),
        }),
        researchStock: {
          ...current.researchStock,
          "null-traces": Math.min(
            1e12,
            current.researchStock["null-traces"] + traceReward,
          ),
        },
      },
      `Archive cross-index complete: ${fragment.title}. The comparison exposed ${traceReward} Null Traces.`,
    );
  };

  const handleDoctrineChoice = (doctrineId: DoctrineId) => {
    const available = doctrineAvailability.find(
      ({ doctrine }) => doctrine.id === doctrineId,
    )?.available;
    if (!available) return;
    commitLivingChange(
      (living) => chooseDoctrine(living, doctrineId),
      `Final doctrine recorded: ${doctrineId}. This campaign will remember the choice.`,
    );
  };

  const finishTour = () => {
    const next = setTutorialComplete(gameRef.current, true);
    gameRef.current = next;
    setGame(next);
    setTourStep(null);
    setPrimaryView("deck");
    setAnnouncement(
      "Cold-wake orientation complete. Restore the Ark, prove closed-loop habitation, and enter Pelagos orbit at your own pace.",
    );
    window.setTimeout(() => persistGame("Orientation saved"), 0);
  };

  const advanceTour = () => {
    if (tourStep === null) return;
    if (tourStep >= TOUR_STEPS.length - 1) finishTour();
    else setTourStep(tourStep + 1);
  };

  const finishContextGuide = () => {
    if (!contextGuide) return;
    const next = setGuideCompleted(gameRef.current, contextGuide.id);
    gameRef.current = next;
    setGame(next);
    setContextGuide(null);
    setAnnouncement("Guide complete. Only the current directive requires attention.");
    window.setTimeout(() => persistGame("Guide saved"), 0);
  };

  const advanceContextGuide = () => {
    if (!contextGuide) return;
    const steps = CONTEXT_GUIDES[contextGuide.id];
    if (contextGuide.step >= steps.length - 1) finishContextGuide();
    else {
      const nextStep = contextGuide.step + 1;
      if (contextGuide.id === "viridia-research") {
        const view = nextStep === 1
          ? "technology"
          : nextStep === 2 || nextStep === 3
            ? "lattice"
            : "core";
        setResearchEntry((current) => ({
          view,
          nonce: (current?.nonce ?? 0) + 1,
        }));
      } else if (contextGuide.id === "pelagos-automation" && nextStep === 1) {
        setFoundryConsoleTab("legacy");
      }
      setContextGuide({ ...contextGuide, step: nextStep });
    }
  };

  const retreatContextGuide = () => {
    if (!contextGuide) return;
    const nextStep = Math.max(0, contextGuide.step - 1);
    if (contextGuide.id === "viridia-research") {
      const view = nextStep === 1
        ? "technology"
        : nextStep === 2 || nextStep === 3
          ? "lattice"
          : "core";
      setResearchEntry((current) => ({
        view,
        nonce: (current?.nonce ?? 0) + 1,
      }));
    } else if (contextGuide.id === "pelagos-automation") {
      setFoundryConsoleTab("autonomy");
    }
    setContextGuide({ ...contextGuide, step: nextStep });
  };

  const replayTour = () => {
    const next = setTutorialComplete(gameRef.current, false);
    gameRef.current = next;
    setGame(next);
    setLoreOpen(false);
    setPrimaryView("deck");
    setContextGuide(null);
    setTourStep(0);
  };

  const openDestinationIntroduction = () => {
    if (!destinationIntroduction) return;
    const next = setInterfaceIntroduction(
      gameRef.current,
      destinationIntroduction.id,
    );
    gameRef.current = next;
    setGame(next);
    setPrimaryView(destinationIntroduction.view);
    setContextGuide(null);
    if (destinationIntroduction.view === "engineering") setFoundryConsoleTab("chain");
    setAnnouncement(
      `${destinationIntroduction.title}. The interface will reveal another destination only when it becomes relevant.`,
    );
    window.setTimeout(() => persistGame("Destination introduction saved"), 0);
  };

  const handlePrimaryNavigation = (view: PrimaryView) => {
    if (destinationIntroduction) {
      if (view === destinationIntroduction.view) openDestinationIntroduction();
      else {
        setAnnouncement(
          `New destination waiting: open ${destinationIntroduction.title.replace(/^The /, "")}.`,
        );
      }
      return;
    }
    setPrimaryView(view);
  };

  const updateMode = (mode: PurchaseMode) => {
    setGame((current) => setBuyMode(current, mode));
  };

  const currentTour = tourStep === null ? null : TOUR_STEPS[tourStep];
  const currentContextGuide = contextGuide ? CONTEXT_GUIDES[contextGuide.id] : null;
  const engineeringUnlocked = disclosure.engineering;
  const researchUnlocked = disclosure.research;
  const populationUnlocked = disclosure.population;
  const medicalUnlocked = disclosure.medical;
  const settlementUnlocked = disclosure.settlement;
  const fabricationUnlocked = disclosure.fabrication;
  const protocolsUnlocked = disclosure.protocols;
  const recalibrationUnlocked = disclosure.recalibration;
  const autonomyUnlocked = isAutonomyUnlocked(game);
  const dronesUnlocked =
    automationFrameQuote.researchMet || game.automation.framesBuilt > 0;
  const legacyUnlocked = recalibrationUnlocked && game.lifetimeAxioms > 3;
  const legacyMatrixStatus = getLegacyMatrixStatus(game);
  const foundryConsoleTabs: Array<{
    id: FoundryConsoleTab;
    label: string;
    shortLabel: string;
  }> = [{ id: "chain", label: "Fabrication Chain", shortLabel: "Chain" }];
  if (dronesUnlocked) {
    foundryConsoleTabs.push({
      id: "drones",
      label: "Utility Drones",
      shortLabel: "Drones",
    });
  }
  if (protocolsUnlocked) {
    foundryConsoleTabs.push({
      id: "protocols",
      label: "Core Protocols",
      shortLabel: "Protocols",
    });
  }
  if (recalibrationUnlocked) {
    foundryConsoleTabs.push({
      id: "recalibration",
      label: "Recalibration",
      shortLabel: "Recalibrate",
    });
  }
  if (autonomyUnlocked) {
    foundryConsoleTabs.push({
      id: "autonomy",
      label: "Foundry Autonomy",
      shortLabel: "Autonomy",
    });
  }
  if (legacyUnlocked) {
    foundryConsoleTabs.push({
      id: "legacy",
      label: "Legacy Matrix",
      shortLabel: "Legacy",
    });
  }
  const foundryConsoleTabIds = foundryConsoleTabs
    .map((tab) => tab.id)
    .join("|");
  const autonomyTiers = GENERATORS.map((generator, index) => {
    const unlocked = isTierUnlocked(game, index);
    const authorized = unlocked && Boolean(game.settings.autoTiers[index]);
    const cost = getTierCost(game, index, 1);
    return {
      generator,
      index,
      unlocked,
      authorized,
      affordable: authorized && game.flux >= cost,
      cost,
      owned: game.tiers[index]?.amount ?? 0,
    };
  });
  const autonomyAuthorized = autonomyTiers.filter((tier) => tier.authorized);
  const autonomyAffordable = autonomyAuthorized.filter((tier) => tier.affordable);
  const autonomyCycleSpend = autonomyAffordable.reduce(
    (total, tier) => total + tier.cost,
    0,
  );
  const autonomyNextTier =
    autonomyAffordable[0] ??
    autonomyAuthorized.slice().sort((left, right) => left.cost - right.cost)[0] ??
    null;
  const compiledProtocolMarks = game.runUpgrades.reduce(
    (total, level) => total + level,
    0,
  );
  const blueprintProtocolMarks = game.settings.protocolBlueprint.reduce(
    (total, level) => total + level,
    0,
  );
  useEffect(() => {
    if (foundryConsoleTabIds.split("|").includes(foundryConsoleTab)) return;
    setFoundryConsoleTab("chain");
  }, [foundryConsoleTab, foundryConsoleTabIds]);
  const unlockedArkViews: ArkViewId[] = [];
  if (engineeringUnlocked) unlockedArkViews.push("engineering");
  if (researchUnlocked) unlockedArkViews.push("research");
  if (populationUnlocked) unlockedArkViews.push("population");
  if (settlementUnlocked) unlockedArkViews.push("settlement");
  const availableManualPages: ManualPageId[] = ["deck"];
  if (engineeringUnlocked) availableManualPages.push("engineering");
  if (researchUnlocked) availableManualPages.push("research");
  if (populationUnlocked) availableManualPages.push("population");
  if (medicalUnlocked) availableManualPages.push("medical");
  if (expeditionsUnlocked) availableManualPages.push("expeditions");
  if (defenseUnlocked) availableManualPages.push("defense");
  if (armoryUnlocked) availableManualPages.push("armory");
  if (settlementUnlocked) availableManualPages.push("settlement");
  const navigationUnlocks: NavigationUnlocks = {
    engineering: engineeringUnlocked,
    research: researchUnlocked,
    population: populationUnlocked,
    medical: medicalUnlocked,
    expeditions: expeditionsUnlocked,
    defense: defenseUnlocked,
    armory: armoryUnlocked,
    settlement: settlementUnlocked,
  };
  const coldWakePurchaseQuantity = getPurchaseQuantity(
    game,
    0,
    game.settings.buyMode,
  );
  const coldWakeDisplayQuantity = game.settings.buyMode === "max"
    ? Math.max(1, coldWakePurchaseQuantity)
    : game.settings.buyMode === "10"
      ? 10
      : 1;
  const coldWakeTierCost = getTierCost(game, 0, coldWakeDisplayQuantity);

  const handleElevateProfile = (survivorId: string) => {
    const current = gameRef.current;
    const quote = getProfileElevationQuote(current, survivorId);
    if (!quote.canElevate || !quote.targetRarity) return;
    commitGameState(
      elevateCrewProfile(current, survivorId),
      `Personnel profile elevated to ${quote.targetRarity}. Identity and profession XP preserved.`,
    );
  };

  const handleStartBioadaptation = (
    survivorId: string,
    adaptationId: BioadaptationId,
  ) => {
    const current = gameRef.current;
    const quote = getBioadaptationQuote(current, survivorId, adaptationId);
    if (!quote.canBegin) {
      setAnnouncement("The elective procedure cannot begin yet. Review its research, health, availability, and resource requirements.");
      return;
    }
    const definition = BIOADAPTATION_DEFINITIONS.find((entry) => entry.id === adaptationId)!;
    commitGameState(
      startBioadaptation(current, survivorId, adaptationId),
      `${definition.name} started. The volunteer is off duty; clinical work continues while the game is closed.`,
    );
  };

  const handleToggleAutoAssignment = (enabled: boolean) => {
    const current = gameRef.current;
    let survivors = setAutoAssignmentEnabled(current.survivors, enabled);
    if (enabled) {
      survivors = autoAssignSurvivors(
        survivors,
        new Set([
          ...(current.expeditions.active?.crewIds ?? []),
          ...(current.expeditions.stranded?.crewIds ?? []),
        ]),
      );
    }
    commitGameState(
      { ...current, survivors },
      enabled
        ? "AXIOM staffing active. Available crew return to their strongest learned work automatically."
        : "Automatic staffing paused. Current assignments remain in place.",
    );
  };

  const handleOptimizeAssignments = () => {
    const current = gameRef.current;
    const enabled = setAutoAssignmentEnabled(current.survivors, true);
    const survivors = autoAssignSurvivors(
      enabled,
      new Set([
        ...(current.expeditions.active?.crewIds ?? []),
        ...(current.expeditions.stranded?.crewIds ?? []),
      ]),
      true,
    );
    commitGameState(
      { ...current, survivors },
      "AXIOM optimized the roster. Every available adult now serves in their strongest suitable profession.",
    );
  };

  const handleReturnToAutoAssignment = (survivorId: string) => {
    const current = gameRef.current;
    const unavailableCrewIds = new Set([
      ...(current.expeditions.active?.crewIds ?? []),
      ...(current.expeditions.stranded?.crewIds ?? []),
    ]);
    const survivors = autoAssignSurvivors(
      returnSurvivorToAutoAssignment(
        setAutoAssignmentEnabled(current.survivors, true),
        survivorId,
      ),
      unavailableCrewIds,
    );
    commitGameState(
      {
        ...current,
        survivors,
      },
      "Manual lock removed. AXIOM now manages this assignment.",
    );
  };

  const handleProtectForArk = (survivorId: string, protectedForArk: boolean) => {
    const current = gameRef.current;
    commitGameState(
      {
        ...current,
        survivors: setSurvivorSettlementProtected(
          current.survivors,
          survivorId,
          protectedForArk,
        ),
      },
      protectedForArk
        ? "Personnel file protected. This person cannot be selected for planetary departure."
        : "Ark protection removed. This person is eligible for a founding community again.",
    );
  };

  return (
    <main
      className={`game-shell world-theme-${worldVisual.slug} null-${nullSaturation.classification}`}
      data-world={worldVisual.slug}
      data-world-index={campaignWorldIndex}
      data-view={primaryView}
      data-null-intensity={nullSaturation.visualIntensity.toFixed(2)}
      style={shellStyle}
    >
      {tooltipsEnabled && <PixelTooltipLayer />}
      <div className="ambient-grid" aria-hidden="true" />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <GameCommandBar
        worldName={activeTransit ? `Transit to ${activeTransit.destinationName}` : MISSIONS[campaignWorldIndex].world}
        cycle={game.cycle}
        arrival={activeTransit ? `${activeTransit.originName} corridor · ${formatDuration(activeTransit.remainingSeconds)} to arrival` : MISSIONS[campaignWorldIndex].arrival}
        fluxLabel={formatNumber(game.flux)}
        fluxExact={formatNumber(game.flux)}
        fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
        axiomsLabel={formatNumber(game.axioms)}
        resonanceLabel={formatNumber(production.resonance.multiplier)}
        operationalLoadLabel={`${Math.round(operationalLoad.total * 10_000) / 100}%`}
        nullSaturation={nullSaturation}
        showAxioms={game.lifetimeAxioms > 0 || game.maxFlux >= 10_000}
        showResonance={campaignWorldIndex >= 1 && game.tiers[1].bought > 0}
        showOperations={campaignWorldIndex >= 2 || operationalLoad.total > 0.001}
        saveStatus={saveStatus}
        ready={ready}
        focusWelcome={currentTour?.target === "command-context"}
        focusFlux={currentTour?.target === "command-flux"}
        objective={activeTransit ? {
          label: `Navigate to ${activeTransit.destinationName}`,
          currentLabel: `${Math.round(activeTransit.progress * 1000) / 10}%`,
          thresholdLabel: "100%",
          progress: activeTransit.progress,
          directiveLabel: null,
        } : {
          label: objective.label,
          currentLabel: formatNumber(objective.current),
          thresholdLabel: formatNumber(objective.threshold),
          progress: objective.progress,
          directiveLabel: activeMission && game.settings.tutorialComplete && !game.missions.awaitingAcknowledgement ? activeMission.world : null,
        }}
        onOpenHelp={() => openManual(primaryView)}
        onOpenLore={() => setLoreOpen(true)}
        onSave={() => persistGame("Saved")}
        onOpenDirective={() => {
          if (navigationUnlocks.settlement) handlePrimaryNavigation("settlement");
          else setPrimaryView("deck");
        }}
        tooltipsEnabled={tooltipsEnabled}
        onToggleTooltips={handleToggleTooltips}
      />

      {!qaMode &&
        ready &&
        !publicRecoveryHandled &&
        game.missions.currentIndex === 0 &&
        !game.missions.awaitingAcknowledgement && (
          <section
            className="public-save-recovery"
            aria-label="Cold Wake save recovery"
          >
            <div>
              <span>ONE-TIME SAVE RECOVERY</span>
              <strong>Did the public reset erase your Cold Wake run?</strong>
              <small>
                Restore completed commissioning and stop at Step 5, immediately
                before Pelagos departure. No later-world progress or bonus
                resources are granted.
              </small>
            </div>
            <div className="public-save-recovery-actions">
              <button type="button" onClick={handleColdWakeRecovery}>
                Recover Cold Wake Step 5
              </button>
              <button
                type="button"
                className="quiet-button"
                onClick={() => finishPublicRecoveryPrompt("dismissed")}
              >
                Dismiss
              </button>
            </div>
          </section>
        )}

      {qaMode && (
        <QaSandbox
          collapsed={qaCollapsed}
          onToggleCollapsed={() => setQaCollapsed((collapsed) => !collapsed)}
          onJumpWorld={handleQaJumpWorld}
          onJumpTransit={handleQaJumpTransit}
          onFreshPlayerOpening={() => {
            const next = createInitialState(Date.now());
            applyQaState(next, "Fresh public-player opening loaded in the isolated QA profile.");
            setPrimaryView("deck");
            setFoundryConsoleTab("chain");
            setQaCollapsed(true);
            setContextGuide(null);
            setTourStep(0);
          }}
          onReplayPlanetIntroduction={() => {
            const next = createQaPlanetIntroductionCheckpoint(Date.now());
            applyQaState(next, "Cold Wake laws loaded. The full public Continuity → Foundry → Ark handoff is ready to replay.");
            setPrimaryView("deck");
            setFoundryConsoleTab("chain");
            setQaCollapsed(true);
            setContextGuide(null);
            setTourStep(null);
          }}
          onReplayPelagosIntroduction={() => {
            const next = createQaPelagosOnboardingCheckpoint(Date.now());
            applyQaState(next, "Pelagos arrival loaded. The public arrival guide, beacon sequence, and Personnel handoff are ready to test.");
            setPrimaryView("deck");
            setFoundryConsoleTab("chain");
            setQaCollapsed(true);
            setTourStep(null);
            setContextGuide(null);
          }}
          onReplayResearchIntroduction={() => {
            const next = createQaResearchIntroductionCheckpoint(Date.now());
            applyQaState(next, "Viridia loaded before Research. Open the guided destination to test the complete Analysis Core introduction.");
            setPrimaryView("deck");
            setFoundryConsoleTab("chain");
            setQaCollapsed(true);
            setTourStep(null);
            setContextGuide(null);
          }}
          onPreviewGuide={(guideId) => {
            setLoreOpen(false);
            closeManual();
            setQaCoreEchoPreview(null);
            setQaCollapsed(true);
            setQaGuidePreview({ id: guideId, step: 0 });
          }}
          onPreviewCoreEcho={(previewId) => {
            setLoreOpen(false);
            closeManual();
            setQaGuidePreview(null);
            setQaCollapsed(true);
            setQaCoreEchoPreview(previewId);
          }}
          onGrantResources={() => applyQaState(grantQaResources(gameRef.current), "QA resources stocked.")}
          onAddFlux={(amount) => {
            const next = addQaFlux(gameRef.current, amount);
            applyQaState(next, `${formatNumber(Math.min(amount, 1e280))} custom Flux added to the QA profile.`);
          }}
          onSetAxioms={(amount) =>
            applyQaState(
              setQaAxioms(gameRef.current, amount),
              `QA profile set to ${formatNumber(amount)} spendable and proven Axioms.`,
            )
          }
          lawHeartOverride={qaLawHeartOverride}
          onLawHeartOverrideChange={setQaLawHeartOverride}
          nullOverride={qaNullOverride}
          onNullOverrideChange={setQaNullOverride}
          onTriggerLawHeartEvent={(kind) =>
            setQaLawHeartOverride((current) => ({
              ...current,
              enabled: true,
              event: {
                kind,
                serial: (current.event?.serial ?? 0) + 1,
              },
            }))
          }
          onOpenLawHeart={() => {
            setPrimaryView(engineeringUnlocked ? "engineering" : "deck");
            setFoundryConsoleTab("chain");
            setQaCollapsed(true);
          }}
          onResetResearch={() =>
            applyQaState(
              resetQaResearch(gameRef.current),
              "Research projects, progress, repeat counts, echoes, and loaded reservoirs reset. The current world and crew were preserved.",
            )
          }
          onStockResearchEvidence={() =>
            applyQaState(
              stockQaResearchEvidence(gameRef.current),
              "Every Ark Research evidence stock raised to the QA maximum.",
            )
          }
          onFillResearchLattice={() =>
            applyQaState(
              fillQaResearchLattice(gameRef.current),
              "Every internal Lattice reservoir raised to the QA maximum.",
            )
          }
          onCompleteActiveResearch={() =>
            applyQaState(
              completeQaActiveResearch(gameRef.current),
              gameRef.current.research.activeProjectId
                ? "The active Research project was completed."
                : "No active Research project was loaded.",
            )
          }
          onCompleteResearch={() =>
            applyQaState(
              completeQaResearch(gameRef.current),
              "Every Research program, mastery cycle, and recovered contradiction marked complete for endgame testing.",
            )
          }
          onBoostCrew={() => applyQaState(boostQaCrew(gameRef.current), "QA crew advanced to maximum professional skill.")}
          onPrepareContinuity={() => {
            const next = prepareQaContinuity(gameRef.current);
            applyQaState(next, "Current-world engineering and field requirements prepared for Continuity testing.");
            setPrimaryView("settlement");
          }}
          onSimulateOfflineDay={() => applyQaState(simulateQaOfflineDay(gameRef.current), "Simulated 24 hours of offline operation.")}
          onReturnToPlayerSave={handleReturnToPlayerSave}
        />
      )}

      <GameNavigation
        currentView={primaryView}
        unlocks={navigationUnlocks}
        guidedView={guidedDestinationView}
        onNavigate={handlePrimaryNavigation}
      />

      {destinationIntroduction && (
        <>
          <div className="destination-guide-scrim" aria-hidden="true" />
          <section className="destination-guide-card" role="dialog" aria-modal="true" aria-labelledby="destination-guide-title" aria-describedby="destination-guide-description">
            <div className="destination-guide-speaker">
              <span aria-hidden="true">A</span>
              <div><strong>AXIOM · INTERFACE HANDOFF</strong><small>New destination detected</small></div>
            </div>
            <p className="destination-guide-eyebrow">{destinationIntroduction.eyebrow}</p>
            <h2 id="destination-guide-title">{destinationIntroduction.title}</h2>
            <p id="destination-guide-description">{destinationIntroduction.description}</p>
            <div className="destination-guide-note">{destinationIntroduction.note}</div>
            <button ref={destinationGuideActionRef} type="button" onClick={openDestinationIntroduction}>{destinationIntroduction.buttonLabel}</button>
          </section>
        </>
      )}

      {offlineNotice && (
        <section className="offline-banner" aria-label="Offline production summary">
          <div>
            <span className="status-dot" aria-hidden="true" />
            <strong>The Foundry kept turning.</strong>
            <span>
              {formatDuration(offlineNotice.seconds)} credited · +{formatNumber(offlineNotice.gain)} Flux
            </span>
          </div>
          <button type="button" onClick={() => setOfflineNotice(null)} aria-label="Dismiss offline summary">Dismiss</button>
        </section>
      )}

      {primaryView === "deck" ? (
        campaignWorldIndex === 0 && !coldWakeStatus.arkOverviewAvailable ? (
          <AxiomLawHeart
            flux={game.flux}
            fluxLabel={formatNumber(game.flux)}
            fluxPerSecond={production.fluxPerSecond}
            fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
            manualGain={manualGain}
            manualGainLabel={formatNumber(manualGain)}
            manualPulses={game.manualPulses}
            stageIndex={game.missions.stageIndex}
            stageCount={activeMission?.stages.length ?? 1}
            objectiveLabel={objective.label}
            objectiveDetail={game.missions.awaitingAcknowledgement
              ? "The approach reserve is secured and all three laws are stable. Authorize departure from Continuity when you are ready."
              : activeStage?.instruction ?? campaignWorld.arrivalBrief}
            objectiveProgress={objective.progress}
            machine={{
              name: GENERATORS[0].name,
              shortName: GENERATORS[0].shortName,
              bought: game.tiers[0].bought,
              outputLabel: formatNumber(production.tierOutputs[0]),
              output: production.tierOutputs[0],
              costLabel: formatNumber(coldWakeTierCost),
              quantity: coldWakePurchaseQuantity,
              canBuy:
                game.missions.stageIndex < COLD_WAKE_FOUNDRY_STAGE &&
                coldWakePurchaseQuantity > 0,
              unlocked:
                game.missions.stageIndex < COLD_WAKE_FOUNDRY_STAGE &&
                isTierUnlocked(game, 0),
            }}
            buyMode={game.settings.buyMode}
            lifetimeAxioms={game.lifetimeAxioms}
            recalibrationGain={recalibrationGain}
            recalibrationThresholdLabel={formatNumber(recalibrationThreshold)}
            recalibrationProgress={game.runFlux / Math.max(1, recalibrationThreshold)}
            contribution={!game.missions.awaitingAcknowledgement &&
              activeStage?.kind === "contributeFlux" &&
              game.missions.contributedFlux < activeStage.target ? {
              availableLabel: formatNumber(game.flux),
              remainingLabel: formatNumber(Math.max(0, activeStage.target - game.missions.contributedFlux)),
              divertLabel: formatNumber(Math.min(game.flux, Math.max(0, activeStage.target - game.missions.contributedFlux))),
              canContribute: game.flux > 0 && game.missions.contributedFlux < activeStage.target,
            } : null}
            qaOverride={qaMode ? qaLawHeartOverride : undefined}
            onTune={handlePulse}
            onBuy={() => handleBuyTier(0)}
            onSetBuyMode={updateMode}
            onRecalibrate={handleRecalibrate}
            onContribute={handleMissionContribution}
          />
        ) : (
        <ArkDeck
          foundryName={game.living.foundryName}
          worldName={campaignWorld.name}
          worldSubtitle={campaignWorld.subtitle}
          worldProgress={(viabilityForecast?.score ?? objective.progress * 100) / 100}
          fluxLabel={formatNumber(game.flux)}
          fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
          population={game.survivors.survivors.length}
          populationCapacity={Math.min(berthCapacity, ...Object.values(lifeSupport.capacity))}
          berthCapacity={berthCapacity}
          berthSections={game.survivors.berthSections}
          berthConstructionProgress={berthConstruction ? berthPanelQuote.progressRatio : null}
          salvageLabel={formatNumber(game.living.salvage)}
          support={(Object.keys(game.survivors.lifeSupport) as LifeSupportKey[]).map((key) => ({
            id: key,
            label: key.replaceAll("-", " "),
            value: lifeSupport.demand[key],
            capacity: lifeSupport.capacity[key],
            status:
              lifeSupport.shortages[key] > 0
                ? `${lifeSupport.shortages[key]} capacity needed`
                : "stable reserve",
          }))}
          crew={game.survivors.survivors.map((survivor) => {
            const training = game.survivors.training.find(
              (program) => program.survivorId === survivor.id,
            );
            const rarity = getSurvivorRarity(survivor);
            return {
              id: survivor.id,
              name: survivor.callsign || survivor.name,
              role: (survivor.role === "security" ? "soldier" : survivor.role).replaceAll("-", " "),
              level:
                survivor.role === "civilian"
                  ? 0
                  : getSurvivorSkillLevel(survivor, survivor.role),
              training: training?.targetRole ?? null,
              rarity: rarity.id,
              rarityLabel: rarity.label,
              rarityDescription: rarity.description,
            };
          })}
          beaconReadiness={beaconReadiness}
          beaconOnline={game.survivors.beaconOnline}
          pendingSignal={game.survivors.activeSignal ? {
            id: game.survivors.activeSignal.id,
            label: `Signal ${game.survivors.activeSignal.sequence}`,
            location: game.survivors.activeSignal.sourceLabel,
            groupSize: game.survivors.activeSignal.survivors.length,
            roles: [...new Set(game.survivors.activeSignal.survivors.map((survivor) => survivor.role.replaceAll("-", " ")))],
            rescueCost: game.survivors.activeSignal.rescueCost,
            canRescue: rescueQuote.canRescue,
            blockedReason:
              rescueQuote.reason === "transit"
                ? "Rescue launches resume after orbital arrival."
                : rescueQuote.reason === "berths"
                ? "Build another quarters section first."
                : rescueQuote.reason === "life-support"
                  ? "Expand life-support capacity first."
                  : rescueQuote.reason === "salvage"
                    ? "More Salvage is required."
                    : rescueQuote.reason === "flux"
                      ? "The shuttle launch needs more Flux."
                      : null,
            rare: game.survivors.activeSignal.survivors.some((survivor) => survivor.storyHookId),
          } : null}
          researchProject={activeResearchDefinition?.name ?? null}
          researchProgress={activeResearchProgress}
          researchThroughput={`${researchNetwork.progressPerSecond.toFixed(2)} work/sec`}
          settlementScore={viabilityForecast?.score ?? 0}
          settlementReady={viabilityForecast?.canDepart ?? false}
          settlementDeficit={viabilityForecast?.deficits[0]?.message ?? null}
          onlineRoomCount={game.living.rooms.filter((room) => room.unlocked).length}
          totalRoomCount={game.living.rooms.length}
          fabricationDepth={game.tiers.filter((tier) => tier.bought > 0).length}
          fabricationIntensity={game.tiers.reduce((total, tier) => total + tier.bought, 0)}
          lifetimeAxioms={game.lifetimeAxioms}
          transit={activeTransit ? {
            active: true,
            progress: activeTransit.progress,
            originName: activeTransit.originName,
            destinationName: activeTransit.destinationName,
          } : null}
          unlockedViews={unlockedArkViews}
          coldWakeCommissioning={campaignWorldIndex === 0
            ? {
                active: !game.missions.awaitingAcknowledgement &&
                  (game.missions.stageIndex === COLD_WAKE_NAVIGATION_STAGE ||
                    game.missions.stageIndex === COLD_WAKE_LIFE_SUPPORT_STAGE),
                navigationRestored: coldWakeStatus.navigationRestored,
                lifeSupportRestored: coldWakeStatus.lifeSupportRestored,
                actionLabel: activeStage?.kind === "contributeFlux"
                  ? `Route ${formatNumber(Math.min(game.flux, Math.max(0, activeStage.target - game.missions.contributedFlux)))} Flux`
                  : "Route Flux",
                canAct: game.flux > 0,
              }
            : null}
          roomReinforcements={roomReinforcements}
          supportUpgradeCosts={supportUpgradeCosts}
          onCommission={handleMissionContribution}
          onUpgradeSupport={handleUpgradeSupport}
          onOpenView={handleOpenArkView}
        />
        )
      ) : primaryView === "population" ? (
        <PopulationConsole
          state={game.survivors}
          salvage={game.living.salvage}
          currentWorldName={campaignWorld.name}
          systemsUnlocked={campaignWorldIndex >= 2 || game.settings.completedGuideIds.includes("pelagos-personnel")}
          commandUnlocked={campaignWorldIndex >= 2 || (game.survivors.signalsResolved >= 3 && game.survivors.completedTrainings > 0)}
          beaconReadiness={beaconReadiness}
          capacityMultiplier={lifeSupportCapacityMultiplier}
          crewGrowthMultiplier={
            researchBonuses.trainingSpeedMultiplier *
            colonyLegacyEffects.trainingSpeedMultiplier
          }
          requiredExpertiseIds={campaignWorld.expertiseRequirements.map(
            (requirement) => requirement.id,
          )}
          supportUpgradeCosts={supportUpgradeCosts}
          scanDurationSeconds={scanDurationSeconds}
          rescueFlux={{
            cost: rescueQuote.fluxCost,
            label: `${formatNumber(rescueQuote.fluxCost)} Flux`,
            affordable: game.flux >= rescueQuote.fluxCost,
          }}
          rescueDetail={{
            active: rescueDetailActive,
            enabled: game.survivors.autoRescueEnabled,
          }}
          onToggleAutoRescue={handleToggleAutoRescue}
          onToggleAutoAssignment={handleToggleAutoAssignment}
          onOptimizeAssignments={handleOptimizeAssignments}
          onReturnToAutoAssignment={handleReturnToAutoAssignment}
          onProtectForArk={handleProtectForArk}
          teamAlpha={(() => {
            const status = getCommandTeamStatus(game);
            return {
              leaderId: game.survivors.commandTeam.leaderId,
              memberIds: game.survivors.commandTeam.memberIds,
              rating: Math.round(status.rating),
              bonusPercent: Math.round((status.multiplier - 1) * 100),
              doctrine: status.doctrine,
            };
          })()}
          onAppointLeader={handleAppointLeader}
          onToggleTeamMember={handleToggleTeamMember}
          onAssignTeamMember={handleAssignTeamMember}
          onSetDoctrine={handleSetDoctrine}
          berthQuote={berthPanelQuote}
          onStartBerthConstruction={handleStartBerthConstruction}
          onUpgradeSupport={handleUpgradeSupport}
          onActivateBeacon={handleActivateBeacon}
          onRescueSignal={handleRescueSurvivors}
          onStartTraining={handleStartTraining}
          onCancelTraining={handleCancelTraining}
          onAssignRole={handleAssignSurvivor}
          onRenameCallsign={handleRenameSurvivor}
          getProfileElevation={(survivorId) =>
            getProfileElevationQuote(game, survivorId)
          }
          onElevateProfile={handleElevateProfile}
          bioadaptationState={game.bioadaptation}
          getBioadaptationQuote={(survivorId, adaptationId) => {
            const quote = getBioadaptationQuote(game, survivorId, adaptationId);
            return {
              ...quote,
              fluxLabel: formatNumber(quote.fluxCost),
              durationLabel: formatDuration(quote.durationSeconds),
            };
          }}
          onStartBioadaptation={handleStartBioadaptation}
          onOpenHelp={openManual}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "medical" ? (
        <MedicalConsole
          survivors={game.survivors}
          currentWorldName={campaignWorld.name}
          medBay={(() => {
            const status = getMedBayStatus(game);
            return {
              carePool: status.carePool,
              recoveryPerHour: status.recoveryPerHour,
              diversionPercent: status.diversionPercent,
              diversionPerPatientPercent: status.diversionPerPatientPercent,
              researchBonusPercent: status.researchBonusPercent,
              activeProtocols: status.activeProtocols,
              medicalOverCapacity: lifeSupport.shortages.medical > 0,
            };
          })()}
          unavailableIds={[
            ...(game.expeditions.active?.crewIds ?? []),
            ...(game.expeditions.stranded?.crewIds ?? []),
            ...(game.bioadaptation.active ? [game.bioadaptation.active.survivorId] : []),
          ]}
          getProstheticQuote={(survivorId) => {
            const quote = getProstheticSurgeryQuote(game, survivorId);
            return {
              canOperate: quote.canOperate,
              reason: quote.reason,
              researchMet: quote.researchMet,
              fluxLabel: `${formatNumber(quote.fluxCost)} Flux`,
              modelCost: quote.modelCost,
              sampleCost: quote.sampleCost,
            };
          }}
          onProstheticSurgery={handleProstheticSurgery}
          onAdmit={handleAdmitToMedBay}
          onDischarge={handleDischargeFromMedBay}
          onOpenHelp={openManual}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "research" ? (
        <ResearchLattice
          key={`research-${researchEntry?.view ?? "default"}-${researchEntry?.projectId ?? "none"}-${researchEntry?.nonce ?? 0}`}
          state={game.research}
          resources={game.researchStock}
          availableCrew={researchCrewAvailable}
          powerAvailable={researchPowerAvailable}
          costMultiplier={researchCostMultiplier}
          externalSpeedMultiplier={
            colonyLegacyEffects.researchSpeedMultiplier
          }
          automationMultiplier={automationEffects.researchRoutingMultiplier}
          expertise={researchExpertise}
          leadResearcher={researchLead}
          fieldValidation={researchFieldValidation}
          initialView={researchEntry?.view}
          initialProjectId={researchEntry?.projectId}
          now={clockNow || game.lastSaved}
          autoTransfer={getAutoTransferStatus(game)}
          onStateChange={handleResearchStateChange}
          onTransferInput={handleTransferResearchInput}
          onAssignedCrewChange={handleResearchCrewChange}
          onOpenHelp={openManual}
          onClose={() => setPrimaryView("deck")}
        />
      ) : primaryView === "defense" ? (
        <DefenseConsole
          state={game.defense}
          causalArchive={causalArchive}
          crew={defenseCrew}
          crewNames={Object.fromEntries(game.survivors.survivors.map((survivor) => [survivor.id, survivor.callsign || survivor.name]))}
          currentLocationName={activeTransit ? `${activeTransit.originName} to ${activeTransit.destinationName}` : campaignWorld.name}
          stormsEnabled={getDefenseEnvironment(game) !== null}
          hostilesEnabled={isHostileThreatOperationsActivated(game)}
          installationQuotes={defenseInstallationQuotes}
          roomReinforcements={roomReinforcements}
          salvageLabel={formatNumber(game.living.salvage)}
          onBuyInstallation={handleBuyDefenseInstallation}
          onReinforceRoom={handleUpgradeLivingRoom}
          onChooseContactDoctrine={handleChooseDefenseDoctrine}
          onChooseEnvironmentalDoctrine={handleChooseEnvironmentalDefenseDoctrine}
          onOpenHelp={openManual}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "armory" ? (
        <ArmoryConsole
          currentWorldName={campaignWorld.name}
          quotes={armoryQuotes}
          activeProject={activeArmoryProject}
          laws={armoryLaws}
          onCraft={handleCraftArmoryItem}
          onRepair={handleRepairArmoryItem}
          onUpgrade={handleUpgradeArmoryItem}
          onModification={handleArmoryModification}
          onBuyLaw={handleBuyArmoryLaw}
          onOpenHelp={openManual}
          onBack={() => setPrimaryView("population")}
        />
      ) : primaryView === "expeditions" ? (
        <ExpeditionConsole
          key={`expeditions-${expeditionEntry?.siteId ?? "default"}-${expeditionEntry?.nonce ?? 0}`}
          survivors={game.survivors}
          expeditions={game.expeditions}
          currentWorldName={campaignWorld.name}
          sites={expeditionSites}
          recon={{
            expeditions: surfaceRecon.expeditions,
            multiplier: surfaceRecon.multiplier,
            scanLabel: `${Math.round(scanDurationSeconds / 60)} min`,
          }}
          expeditionAccess={expeditionAccess}
          surveyStatus={{
            completed: game.worldProgress.surveysCompleted,
            required: campaignWorld.surveysRequired,
          }}
          initialSiteId={expeditionEntry?.siteId}
          getExpeditionPreview={(siteId, crewIds) => {
            const quote = getExpeditionLaunchQuote(game, siteId, crewIds);
            return {
              strength: quote.strength,
              gearStrength: quote.gearStrength,
              researchStrengthBonus: quote.researchStrengthBonus,
              researchRewardMultiplier: quote.researchRewardMultiplier,
              bioadaptationStrengthBonus: quote.bioadaptationStrengthBonus,
              bioadaptationDurationMultiplier: quote.bioadaptationDurationMultiplier,
              difficulty: quote.difficulty,
              projectedOutcome: quote.projectedOutcome === "rescue" ? null : quote.projectedOutcome,
              canLaunch: quote.canLaunch,
              reason: quote.reason,
              weapons: quote.loadout.filter((entry) => entry.weaponId).length,
              armor: quote.loadout.filter((entry) => entry.armorId).length,
              loadout: quote.loadout,
              preparations: quote.preparations,
            };
          }}
          onLaunchExpedition={handleLaunchExpedition}
          getRescuePreview={(crewIds) => {
            const quote = getRescueMissionQuote(game, crewIds);
            return {
              canLaunch: quote.canLaunch,
              reason: quote.reason,
              strength: quote.strength,
              rescueDifficulty: quote.rescueDifficulty,
              projectedExtraction: quote.projectedExtraction,
              fluxLabel: `${formatNumber(quote.fluxCost)} Flux`,
            };
          }}
          onLaunchRescue={handleLaunchRescue}
          onAbandonStranded={handleAbandonStranded}
          onOpenHelp={openManual}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "settlement" && activeTransit ? (
        <TransitConsole
          journey={activeTransit}
          defense={game.defense}
          defenseCrew={defenseCrew}
          onOpenDefense={() => setPrimaryView("defense")}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "settlement" && viabilityForecast ? (
        <>
        {campaignWorldIndex > 0 && <CommandBriefing priorities={commandPriorities} onNavigate={handleCommandPriorityNavigate} />}
        <SettlementConsole
          world={campaignWorld}
          forecast={viabilityForecast}
          progress={currentWorldProgress}
          crew={campaignCrew}
          colonies={game.settlement.colonies}
          infrastructureQuotes={infrastructureQuotes}
          supplyQuotes={supplyQuotes}
          equipmentQuotes={equipmentQuotes}
          crisisQuotes={crisisQuotes}
          departureHold={departureHold}
          pendingTransmission={pendingColonyTransmission ? {
            colonyName: pendingColonyTransmission.colonyName,
            transmission: pendingColonyTransmission.transmission,
          } : null}
          planetaryDefense={game.planetaryDefense}
          planetaryDefenseActive={planetaryDefenseActive}
          planetaryDefenseLoad={operationalLoad.planetaryDefense}
          planetaryDefenseQuotes={planetaryDefenseQuotes}
          coldWakeSequence={campaignWorldIndex === 0 ? {
            stepNumber: game.missions.stageIndex <= COLD_WAKE_FOUNDRY_STAGE
              ? 2
              : game.missions.stageIndex === COLD_WAKE_NAVIGATION_STAGE
                ? 3
                : game.missions.stageIndex === COLD_WAKE_LIFE_SUPPORT_STAGE
                  ? 4
                  : 5,
            stepCount: 5,
            label: game.missions.stageIndex === COLD_WAKE_FOUNDRY_STAGE &&
              !game.settings.coldWakeForecastReviewed
              ? "Review the Ark restoration forecast"
              : game.missions.awaitingAcknowledgement
                ? "Authorize Pelagos orbital insertion"
                : activeStage?.label ?? "Continue Cold Wake commissioning",
            detail: game.missions.stageIndex === COLD_WAKE_FOUNDRY_STAGE &&
              !game.settings.coldWakeForecastReviewed
              ? "The three portable laws are proven. Confirm the forecast before AXIOM wakes another deck."
              : game.missions.awaitingAcknowledgement
                ? "Every staged restoration is secure. Use the illuminated control below to enter Pelagos orbit."
                : activeStage?.instruction ?? campaignWorld.arrivalBrief,
            progress: game.missions.stageIndex === COLD_WAKE_FOUNDRY_STAGE &&
              !game.settings.coldWakeForecastReviewed
              ? 0
              : game.missions.awaitingAcknowledgement
                ? 1
                : missionProgress.ratio,
            actionLabel: game.missions.awaitingAcknowledgement
              ? undefined
              : game.missions.stageIndex === COLD_WAKE_FOUNDRY_STAGE
                ? game.settings.coldWakeForecastReviewed
                  ? "Open Foundry Deck"
                  : "Authorize Foundry wake-up"
                : game.missions.stageIndex === COLD_WAKE_NAVIGATION_STAGE ||
                    game.missions.stageIndex === COLD_WAKE_LIFE_SUPPORT_STAGE
                  ? "Return to Ark Command"
                  : game.missions.stageIndex === COLD_WAKE_DEPARTURE_STAGE
                    ? game.flux > 0
                      ? `Commit ${formatNumber(Math.min(game.flux, Math.max(0, (activeStage?.target ?? 0) - game.missions.contributedFlux)))} Flux`
                      : "Keep producing Flux"
                    : undefined,
            actionDisabled:
              game.missions.stageIndex === COLD_WAKE_DEPARTURE_STAGE && game.flux <= 0,
          } : null}
          pelagosSequence={game.missions.currentIndex === 1 &&
            game.missions.stageIndex < PELAGOS_FERRY_STAGE &&
            !game.missions.awaitingAcknowledgement ? {
              stepNumber: game.missions.stageIndex + 1,
              stepCount: PELAGOS_FERRY_STAGE,
              label: activeStage?.label ?? "Restore contact with Pelagos",
              detail: activeStage?.instruction ?? campaignWorld.arrivalBrief,
              progress: missionProgress.ratio,
              status: game.missions.stageIndex === PELAGOS_RECEIVER_STAGE
                ? `${formatNumber(missionProgress.value)} / ${formatNumber(missionProgress.target)} new Vacuum Taps`
                : game.missions.stageIndex === PELAGOS_HABITABILITY_STAGE
                  ? `${Math.round(missionProgress.ratio * 5)} / 5 receiving-deck safety checks ready`
                  : game.missions.stageIndex === PELAGOS_BEACON_STAGE
                    ? beaconReadiness.ready ? "Receiver and habitat checks are ready" : "Complete the highlighted habitability checks first"
                    : game.missions.stageIndex === PELAGOS_SIGNAL_STAGE
                      ? `${Math.round(game.survivors.beaconProgressSeconds)} / ${Math.round(scanDurationSeconds)} seconds decoded`
                      : game.survivors.activeSignal
                        ? `${game.survivors.activeSignal.survivors.length} people waiting · the signal never expires`
                        : "The first human signal is still being decoded",
              actionLabel: game.missions.stageIndex === PELAGOS_RECEIVER_STAGE
                ? "Open the Foundry receiver project"
                : game.missions.stageIndex === PELAGOS_HABITABILITY_STAGE
                  ? "Open the SOS receiving deck"
                  : game.missions.stageIndex === PELAGOS_BEACON_STAGE
                    ? "Authorize the SOS carrier"
                    : game.missions.stageIndex === PELAGOS_FIRST_RESCUE_STAGE
                      ? rescueQuote.canRescue ? "Dispatch the first rescue shuttle" : "Rescue shuttle not ready"
                      : undefined,
              actionDisabled: game.missions.stageIndex === PELAGOS_BEACON_STAGE
                ? !beaconReadiness.ready
                : game.missions.stageIndex === PELAGOS_FIRST_RESCUE_STAGE
                  ? !rescueQuote.canRescue
                  : false,
            } : null}
          finalDoctrine={game.missions.currentIndex >= MISSIONS.length ? {
            chosen: chosenDoctrine ? {
              title: chosenDoctrine.title,
              commitment: chosenDoctrine.commitment,
              lyraResponse: chosenDoctrine.lyraResponse,
              epilogue: chosenDoctrine.epilogue,
            } : null,
            options: doctrineAvailability.map(({ doctrine, available }) => ({
              id: doctrine.id,
              shortName: doctrine.shortName,
              thesis: doctrine.thesis,
              choiceLabel: doctrine.choiceLabel,
              available,
              recordsRequired: doctrine.unlock.minDiscoveries,
            })),
          } : null}
          onToggleSettler={handleToggleSettler}
          onCompleteInfrastructure={handleCompleteInfrastructure}
          onFabricateSupply={handleFabricateSupply}
          onFabricateEquipment={handleFabricateEquipment}
          onResolveCrisis={handleResolveCrisis}
          onDepart={handleCampaignDeparture}
          onAcknowledgeTransmission={handleAcknowledgeTransmission}
          onPlanetaryDoctrine={handlePlanetaryDefenseDoctrine}
          onPlanetaryConstruction={handlePlanetaryDefenseConstruction}
          onColdWakeAction={handleColdWakeSequenceAction}
          onPelagosAction={handlePelagosSequenceAction}
          onChooseFinalDoctrine={handleDoctrineChoice}
          onOpenPopulation={populationUnlocked ? () => setPrimaryView("population") : undefined}
          onOpenResearch={researchUnlocked ? () => setPrimaryView("research") : undefined}
          onOpenDeficit={(deficit) => {
            if (deficit.kind === "research") {
              setResearchEntry((current) => ({
                view: "technology",
                projectId: deficit.id as ResearchProjectId,
                nonce: (current?.nonce ?? 0) + 1,
              }));
              setPrimaryView("research");
              return;
            }
            if (deficit.kind === "survey" || deficit.kind === "operation") {
              const siteId = deficit.kind === "survey"
                ? expeditionSites.find((site) => site.countsAsSurvey)?.id
                : expeditionSites.find((site) => site.id === deficit.id)?.id;
              if (siteId) {
                setExpeditionEntry((current) => ({
                  siteId,
                  nonce: (current?.nonce ?? 0) + 1,
                }));
              }
              setPrimaryView("expeditions");
            }
          }}
          onOpenHelp={openManual}
          onBack={() => setPrimaryView("deck")}
        />
        </>
      ) : (
      <section className="foundry-workspace has-reactor-workspace" aria-labelledby="foundry-workspace-title">
        <header className="foundry-workspace-header" data-guide-target="foundry-heading">
          <div>
            <p className="section-kicker">{campaignWorldIndex === 0 ? "First restored deck · Cold Wake" : "Fabrication deck · systems online"}</p>
            <h2 id="foundry-workspace-title">{campaignWorldIndex === 0 ? "Commission the Foundry Deck" : "The Foundry Floor"}</h2>
            <span>{campaignWorldIndex === 0 ? "One machine line is awake. Build the highlighted Vacuum Taps; the rest of Engineering stays hidden until Pelagos." : "Strike the Law-Heart, build nested mechanisms, and expand automation. Planetary planning remains in Continuity."}</span>
          </div>
          <button className="quiet-button" type="button" onClick={() => setPrimaryView("deck")}>
            {campaignWorldIndex === 0 && !coldWakeStatus.arkOverviewAvailable
              ? "Return to Core Deck"
              : "Return to Ark Overview"}
          </button>
        </header>

        <FoundryLawHeart
          flux={game.flux}
          fluxLabel={formatNumber(game.flux)}
          fluxPerSecond={production.fluxPerSecond}
          fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
          manualGain={manualGain}
          manualGainLabel={formatNumber(manualGain)}
          manualPulses={game.manualPulses}
          lifetimeAxioms={game.lifetimeAxioms}
          lifetimeAxiomsLabel={formatNumber(game.lifetimeAxioms)}
          tiers={game.tiers.map((tier, index) => ({
            count: tier.bought,
            output: production.tierOutputs[index],
          }))}
          droneFrames={lawHeartDroneFrames}
          worldProgress={missionProgress.ratio}
          qaOverride={qaMode ? qaLawHeartOverride : undefined}
          onTune={handlePulse}
        />

      <div className="game-grid foundry-grid">
        {fabricationUnlocked && (
        <section className="panel machine-panel foundry-chain-sidebar foundry-system-console">
          <nav className="foundry-console-tabs" aria-label="Foundry systems">
            {foundryConsoleTabs.map((tab) => {
              const needsAttention =
                (tab.id === "protocols" &&
                  !game.settings.completedGuideIds.includes("pelagos-protocols")) ||
                (tab.id === "recalibration" && recalibrationGain > 0) ||
                (tab.id === "autonomy" &&
                  !game.settings.completedGuideIds.includes("pelagos-automation")) ||
                (tab.id === "legacy" && legacyMatrixStatus.available > 0);
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${foundryConsoleTab === tab.id ? "active" : ""} ${needsAttention ? "has-attention" : ""}`}
                  aria-pressed={foundryConsoleTab === tab.id}
                  aria-label={tab.label}
                  onClick={() => setFoundryConsoleTab(tab.id)}
                >
                  <span>{tab.shortLabel}</span>
                  <small>{tab.label}</small>
                </button>
              );
            })}
          </nav>
          <div className="foundry-console-scroll">
          {foundryConsoleTab === "chain" && (
          <div className="foundry-console-panel foundry-chain-panel" data-guide-target="foundry-chain">
          <div className="panel-heading machine-heading">
            <div>
              <p className="section-kicker">Nested mechanisms</p>
              <h2>Fabrication Chain</h2>
            </div>
            <div className="purchase-modes" role="group" aria-label="Purchase quantity">
              {purchaseModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={game.settings.buyMode === mode.value}
                  className={game.settings.buyMode === mode.value ? "active" : ""}
                  onClick={() => updateMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`machine-list ${campaignWorldIndex > 0 && visibleGeneratorCount >= 4 ? "is-density-filled" : ""}`}>
            {GENERATORS.slice(0, campaignWorldIndex === 0 ? 1 : visibleGeneratorCount).map((generator, index) => {
              const unlocked = isTierUnlocked(game, index);
              const tier = game.tiers[index];
              const quantity = getPurchaseQuantity(game, index, game.settings.buyMode);
              const displayQuantity = game.settings.buyMode === "max" ? Math.max(1, quantity) : game.settings.buyMode === "10" ? 10 : 1;
              const cost = getTierCost(game, index, displayQuantity);
              const milestoneProgress = tier.bought % 25;
              const resonanceLevel = index > 0 ? production.resonance.links[index - 1] : 0;
              const blueprintLocked = index > campaignWorldIndex;

              if (!unlocked) {
                return (
                  <article className="machine-row locked" key={generator.name}>
                    <div className="locked-signal" aria-hidden="true">?</div>
                    <div>
                      <p className="machine-index">NEXT DISCOVERY</p>
                      <h3>Unresolved mechanism</h3>
                      <p>
                        {blueprintLocked
                          ? `Recover this blueprint at ${MISSIONS[index].world}.`
                          : `Reach ${formatNumber(generator.unlockAt)} local Flux to stabilize this signal.`}
                      </p>
                    </div>
                  </article>
                );
              }

              return (
                <div className="machine-block" key={generator.name}>
                  {index > 0 && (
                    <div className={`resonance-link ${resonanceLevel > 0 ? "active" : ""}`}>
                      <span aria-hidden="true" />
                      <p>Resonance link {resonanceLevel}/4 · balance both tiers in groups of 15</p>
                    </div>
                  )}
                  <article className="machine-row">
                    <div className="machine-id" aria-hidden="true">0{index + 1}</div>
                    <div className="machine-primary">
                      <div className="machine-title-line">
                        <div>
                          <p className="machine-index">TIER {index + 1} · PRODUCES {generator.produces.toUpperCase()}</p>
                          <h3>{generator.name}</h3>
                        </div>
                        <span className="owned-count" title={`${formatNumber(tier.amount)} total`}>
                          {formatNumber(tier.amount)} <small>owned</small>
                        </span>
                      </div>
                      <p className="machine-description">{generator.description}</p>
                      <div className="machine-output">
                        <span>Output <strong>{formatNumber(production.tierOutputs[index])}/s</strong></span>
                        <span>Bought <strong>{formatNumber(tier.bought)}</strong></span>
                        <span>Milestone <strong>×{formatNumber(1 + 0.5 * Math.floor(tier.bought / 25))}</strong></span>
                      </div>
                      <div className="milestone-track" aria-label={`${milestoneProgress} of 25 purchases toward the next efficiency step`}>
                        <span style={{ width: `${milestoneProgress * 4}%` }} />
                      </div>
                    </div>
                    <button
                      className={`buy-button ${quantity > 0 ? "is-affordable" : "is-unaffordable"}`}
                      type="button"
                      disabled={quantity <= 0}
                      onClick={() => handleBuyTier(index)}
                      aria-label={quantity > 0
                        ? `Buy ${game.settings.buyMode === "max" ? quantity : displayQuantity} ${generator.name} for ${formatNumber(cost)} Flux`
                        : `Cannot buy ${generator.name} yet. Need ${formatNumber(cost)} Flux.`}
                    >
                      <span>{quantity > 0 ? (game.settings.buyMode === "max" ? `Build ×${quantity}` : `Build ×${displayQuantity}`) : "Not enough Flux"}</span>
                      <small>{quantity > 0 ? `${formatNumber(cost)} Flux` : `Need ${formatNumber(cost)} Flux`}</small>
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
          </div>
          )}

          {dronesUnlocked && foundryConsoleTab === "drones" && (
            <div className="foundry-console-panel" data-guide-target="foundry-drones">
            <AutomationConsole
              state={game.automation}
              effects={automationEffects}
              operationalLoad={operationalLoad}
              frameQuote={automationFrameQuoteView}
              unlockedPrograms={automationProgramUnlocks}
              suppressedProgram={game.defense.compromise?.suppressedAutomationProgram ?? null}
              onBuildFrame={handleBuildAutomationFrame}
              onAllocation={handleAutomationAllocation}
              onPolicy={handleAutomationPolicy}
              onOpenHelp={openManual}
            />
            </div>
          )}

          {protocolsUnlocked && foundryConsoleTab === "protocols" && (
          <section className="panel upgrades-panel" data-guide-target="foundry-protocols">
            <div className="panel-heading">
              <div>
                <p className="section-kicker brass">Temporary cycle configurations</p>
                <h2>Core Protocols</h2>
              </div>
              <span className="count-label">{game.runUpgrades.reduce((sum, level) => sum + level, 0)} Marks</span>
            </div>
            <p className="panel-copy protocol-intro">
              Each Protocol has three substantial Marks, priced against this world&apos;s proof scale. Compiled Marks reset during Recalibration; the saved blueprint tells AXIOM which ones it may rebuild after you enable Protocol routing.
            </p>
            <div className="upgrade-list">
              {RUN_UPGRADES.map((upgrade, index) => {
                const level = game.runUpgrades[index];
                const maxed = level >= upgrade.maxLevel;
                const unlocked = isRunUpgradeUnlocked(game, index);
                const firstLockedIndex = RUN_UPGRADES.findIndex(
                  (_, candidateIndex) => !isRunUpgradeUnlocked(game, candidateIndex),
                );
                if (!unlocked && index !== firstLockedIndex) return null;
                if (!unlocked) {
                  return (
                    <article className="upgrade-card locked" key={upgrade.name}>
                      <div><span>Future configuration</span><strong>{getRunUpgradeUnlockLabel(index)}</strong></div>
                    </article>
                  );
                }
                const cost = getRunUpgradeCost(game, index);
                const payback = getRunUpgradePaybackSeconds(game, index);
                const blueprint = game.settings.protocolBlueprint[index] ?? 0;
                return (
                  <article className={`upgrade-card ${maxed ? "installed" : ""}`} key={upgrade.name}>
                    <div className="upgrade-copy">
                      <span>MARK {PROTOCOL_MARK_LABELS[level]} / III</span>
                      <strong>{upgrade.name}</strong>
                      <p>{upgrade.description}</p>
                      <small className="protocol-effect">
                        {getRunUpgradeEffectLabel(index, level)}
                        {!maxed && <> → {getRunUpgradeEffectLabel(index, level + 1)}</>}
                      </small>
                      <small className="protocol-payback">
                        {index === 0
                          ? "Active-play configuration"
                          : payback === null
                            ? "Requires an operating affected system"
                            : `Estimated payback ${formatDuration(payback)}`}
                      </small>
                      <button
                        className="protocol-blueprint-button"
                        type="button"
                        onClick={() =>
                          setGame((current) =>
                            setProtocolBlueprintLevel(
                              current,
                              index,
                              blueprint >= upgrade.maxLevel ? 0 : blueprint + 1,
                            ),
                          )
                        }
                      >
                        AUTO BLUEPRINT: {PROTOCOL_MARK_LABELS[blueprint]}
                      </button>
                    </div>
                    <button className="protocol-compile-button" type="button" disabled={maxed || game.flux < cost} onClick={() => handleRunUpgrade(index)}>
                      {maxed ? "MARK III STABLE" : <>COMPILE MARK {PROTOCOL_MARK_LABELS[level + 1]}<small>{formatNumber(cost)} Flux</small></>}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
          )}

          {recalibrationUnlocked && foundryConsoleTab === "recalibration" && (
          <section className="panel recalibration-panel foundry-recalibration" data-guide-target="foundry-recalibration">
            <div className="panel-heading">
              <div>
                <p className="section-kicker violet">Permanent layer</p>
                <h2>Recalibration</h2>
              </div>
              <span className="axiom-symbol" aria-hidden="true">A</span>
            </div>
            <p className="panel-copy">
              Collapse the fabrication chain into a portable law of physics. Machines, run protocols, and <strong>all unspent Flux</strong> reset; proven Axioms and Legacy upgrades survive. Spend Flux on quarters, equipment, and supplies before you begin.
            </p>
            <div className="prestige-preview">
              <span>Projected yield</span>
              <strong>
                {lawHeartPhaseGate?.saturated
                  ? "PHASE SATURATED"
                  : `${recalibrationGain} Axiom${recalibrationGain === 1 ? "" : "s"}`}
              </strong>
              <small>
                {lawHeartPhaseGate?.saturated
                  ? `${lawHeartPhaseGate.current}/${lawHeartPhaseGate.capacity} Axioms stable in this spectrum`
                  : `${formatNumber(game.runFlux)} / ${formatNumber(recalibrationThreshold)} run Flux for the next proof`}
              </small>
              {campaignWorldIndex > 0 && (
                <div className="axiom-proof-ladder">
                  <span>{axiomProofStatus.forged} forged on {activeMission?.world ?? "this world"}</span>
                  <span>Each additional proof requires ×{axiomProofStatus.growth} the previous threshold</span>
                  {recalibrationGain > 0 && (
                    <span>After this Recalibration: next proof at {formatNumber(axiomProofStatus.followingThreshold)} run Flux</span>
                  )}
                  {lawHeartPhaseGate && !lawHeartPhaseGate.saturated && (
                    <span>
                      {lawHeartPhaseGate.current}/{lawHeartPhaseGate.capacity} Axioms in the current stellar spectrum · {lawHeartPhaseGate.projectName} stabilizes Axiom {lawHeartPhaseGate.threshold}
                    </span>
                  )}
                </div>
              )}
            </div>
            {lawHeartPhaseGate?.saturated && (
              <div
                className="law-heart-phase-gate"
                data-pixel-tooltip={`The ${lawHeartPhaseGate.phaseName} cannot contain another portable law until Research completes ${lawHeartPhaseGate.projectName}. Your Flux, machines, and current cycle remain available while the Analysis Core works.`}
                tabIndex={0}
              >
                <span>NEXT STELLAR PHASE · RESEARCH GATE</span>
                <strong>{lawHeartPhaseGate.phaseName}</strong>
                <p>
                  The Law-Heart has reached this spectrum&apos;s safe capacity.
                  Complete <b>{lawHeartPhaseGate.projectName}</b> in Research to
                  stabilize Axiom {lawHeartPhaseGate.threshold}.
                </p>
                <button
                  type="button"
                  disabled={!researchUnlocked}
                  onClick={() => {
                    setResearchEntry((current) => ({
                      view: "technology",
                      nonce: (current?.nonce ?? 0) + 1,
                    }));
                    setPrimaryView("research");
                  }}
                >
                  {researchUnlocked ? `OPEN ${lawHeartPhaseGate.projectName.toUpperCase()}` : "ANALYSIS CORE NOT YET AVAILABLE"}
                </button>
              </div>
            )}
            <p className="axiom-definition">An Axiom is a portable proof that one compatible law can survive the collapse and rebuilding of its Foundry configuration.</p>
            {!confirmPrestige ? (
              <button
                className="prestige-button"
                type="button"
                disabled={recalibrationGain < 1}
                onClick={() => setConfirmPrestige(true)}
              >
                {lawHeartPhaseGate?.saturated
                  ? `Research ${lawHeartPhaseGate.projectName}`
                  : recalibrationGain < 1
                    ? "Recalibration not yet stable"
                    : "Prepare Recalibration"}
              </button>
            ) : (
              <div className="confirm-row" role="group" aria-label="Confirm Recalibration">
                <button className="prestige-button" type="button" onClick={handleRecalibrate}>Begin Cycle {game.cycle + 1}</button>
                <button className="quiet-button" type="button" onClick={() => setConfirmPrestige(false)}>Cancel</button>
              </div>
            )}
          </section>
          )}

          {autonomyUnlocked && foundryConsoleTab === "autonomy" && (
          <section className="panel automation-panel autonomy-console" data-guide-target="foundry-automation">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Cycle control</p>
                <h2>Foundry Autonomy</h2>
              </div>
              <span className={`status-chip ${game.settings.autoEnabled ? "online" : ""}`}>{game.settings.autoEnabled ? "ACTIVE" : "OFF"}</span>
            </div>
            {game.lifetimeAxioms < 1 ? (
              <div className="locked-copy">
                <span className="lock-glyph" aria-hidden="true">◇</span>
                <p>Complete one Recalibration to unlock automatic machine purchasing.</p>
              </div>
            ) : (
              <>
                <div className="autonomy-status-grid" aria-label="Autonomy status">
                  <article>
                    <span>Fabrication order</span>
                    <strong>{game.settings.autoEnabled ? "AUTONOMY ONLINE" : "AUTONOMY OFF"}</strong>
                    <small>{game.settings.autoEnabled ? "One purchase pass each second" : "No Flux will be spent automatically"}</small>
                  </article>
                  <article>
                    <span>Authorized tiers</span>
                    <strong>{autonomyAuthorized.length} / {autonomyTiers.filter((tier) => tier.unlocked).length}</strong>
                    <small>{autonomyAffordable.length} affordable on the next pass</small>
                  </article>
                  <article>
                    <span>Next pass</span>
                    <strong>{autonomyNextTier ? autonomyNextTier.generator.name : "NO ORDER"}</strong>
                    <small>{autonomyNextTier
                      ? autonomyNextTier.affordable
                        ? `${formatNumber(autonomyCycleSpend)} Flux scheduled this pass`
                        : `Needs ${formatNumber(autonomyNextTier.cost)} Flux`
                      : "Authorize at least one unlocked tier"}</small>
                  </article>
                </div>
                <label className="toggle-row">
                  <span><strong>Autonomous fabrication</strong><small>Off by default. When enabled, AXIOM buys one affordable unit from each selected tier every second.</small></span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Autonomous fabrication"
                    checked={game.settings.autoEnabled}
                    onChange={(event) => setGame((current) => setAutoEnabled(current, event.target.checked))}
                  />
                </label>
                <div className="autonomy-tier-grid" aria-label="Automatic machine tiers">
                  {autonomyTiers.map((tier) => (
                    <label className={`${tier.authorized ? "is-authorized" : ""} ${!tier.unlocked ? "is-locked" : ""}`} key={tier.generator.name}>
                      <input type="checkbox" disabled={!tier.unlocked} checked={tier.authorized} onChange={(event) => setGame((current) => setAutoTier(current, tier.index, event.target.checked))} />
                      <span className="autonomy-tier-switch" aria-hidden="true" />
                      <span>
                        <small>TIER {tier.index + 1}</small>
                        <strong>{tier.generator.name}</strong>
                        <em>{tier.unlocked ? `${formatNumber(tier.owned)} owned · ${formatNumber(tier.cost)} Flux next` : "Blueprint unavailable"}</em>
                      </span>
                    </label>
                  ))}
                </div>
                <section className="autonomy-protocol-console">
                  <div>
                    <span>Protocol blueprint</span>
                    <strong>{compiledProtocolMarks} compiled / {blueprintProtocolMarks} saved Marks</strong>
                    <small>The blueprint survives Recalibration. Routing rebuilds only those saved Marks when their Flux costs become affordable.</small>
                  </div>
                  <label className={`${game.lifetimeAxioms < 3 ? "disabled" : ""}`}>
                    <span>{game.settings.autoUpgrades ? "ROUTING ONLINE" : "ROUTING OFF"}</span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="Protocol routing"
                      disabled={game.lifetimeAxioms < 3}
                      checked={game.settings.autoUpgrades}
                      onChange={(event) => setGame((current) => setAutoUpgrades(current, event.target.checked))}
                    />
                  </label>
                  {game.lifetimeAxioms < 3 && <p>Protocol routing unlocks at 3 proven Axioms.</p>}
                </section>
              </>
            )}
          </section>
          )}

          {legacyUnlocked && foundryConsoleTab === "legacy" && (
          <section className="panel legacy-panel" data-guide-target="foundry-legacy">
            <div className="panel-heading">
              <div>
                <p className="section-kicker violet">Across all cycles</p>
                <h2>Legacy Matrix</h2>
              </div>
              <span className="count-label violet-text">
                {legacyMatrixStatus.used}/{legacyMatrixStatus.capacity} CAPACITY
              </span>
            </div>
            <p className="panel-copy legacy-intro">
              Proven Axiom milestones reveal permanent Matrix Capacity. The Matrix records safe relationships among those proofs; assigning capacity never consumes spendable Axioms.
            </p>
            <div className="legacy-capacity-readout">
              <div>
                <span>Available capacity</span>
                <strong>{legacyMatrixStatus.available}</strong>
              </div>
              <div>
                <span>Next capacity</span>
                <strong>
                  {legacyMatrixStatus.nextMilestone === null
                    ? "MATRIX COMPLETE"
                    : `${legacyMatrixStatus.nextMilestone} PROVEN AXIOMS`}
                </strong>
              </div>
              <div>
                <span>Reallocation</span>
                <strong>
                  {game.legacyMatrixRevisionOpen
                    ? "OPEN THIS CYCLE"
                    : "OPENS AFTER RECALIBRATION"}
                </strong>
              </div>
            </div>
            <div className="legacy-list">
              {LEGACY_UPGRADES.map((upgrade, index) => {
                const level = game.legacyUpgrades[index];
                return (
                  <article className={level >= 3 ? "installed" : ""} key={upgrade.name}>
                    <div>
                      <span>MARK {PROTOCOL_MARK_LABELS[level]} / III</span>
                      <strong>{upgrade.name}</strong>
                      <p>{upgrade.description}</p>
                      <small>
                        {getLegacyUpgradeEffectLabel(index, level)}
                        {level < 3 && (
                          <> → {getLegacyUpgradeEffectLabel(index, level + 1)}</>
                        )}
                      </small>
                    </div>
                    <div className="legacy-mark-controls">
                      <button
                        type="button"
                        disabled={!game.legacyMatrixRevisionOpen || level <= 0}
                        onClick={() => handleReleaseLegacyUpgrade(index)}
                        aria-label={`Release one ${upgrade.name} Mark`}
                      >
                        −
                      </button>
                      <b>{level}</b>
                      <button
                        type="button"
                        disabled={legacyMatrixStatus.available < 1 || level >= 3}
                        onClick={() => handleLegacyUpgrade(index)}
                        aria-label={`Assign one ${upgrade.name} Mark`}
                      >
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {game.legacyMatrixRevisionOpen && (
              <button
                className="prestige-button legacy-commit-button"
                type="button"
                onClick={handleCommitLegacyMatrix}
              >
                Commit Matrix for this cycle
              </button>
            )}
          </section>
          )}

          </div>
        </section>
        )}

          <details className="panel statistics-panel foundry-statistics">
            <summary>Foundry statistics</summary>
            <dl>
              <div><dt>This cycle</dt><dd>{formatDuration(game.runTime)}</dd></div>
              <div><dt>Total play</dt><dd>{formatDuration(game.playTime)}</dd></div>
              <div><dt>Run Flux</dt><dd>{formatNumber(game.runFlux)}</dd></div>
              <div><dt>All-time Flux</dt><dd>{formatNumber(game.allTimeFlux)}</dd></div>
              <div><dt>Law-Heart strikes</dt><dd>{formatNumber(game.manualPulses)}</dd></div>
              <div><dt>Offline cap</dt><dd>{getOfflineCapHours(game)} hours</dd></div>
            </dl>
            <div className="help-actions">
              <button className="quiet-button" type="button" onClick={replayTour}>Replay orientation</button>
              <button className="quiet-button" type="button" onClick={() => setLoreOpen(true)}>Open lore archive</button>
            </div>
            {!confirmReset ? (
              <button className="danger-link" type="button" onClick={() => setConfirmReset(true)}>Reset all local progress</button>
            ) : (
              <div className="reset-confirm">
                <p>This permanently erases the local Foundry save.</p>
                <button type="button" onClick={handleHardReset}>Erase progress</button>
                <button className="quiet-button" type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
              </div>
            )}
          </details>
      </div>
      </section>
      )}

      {currentTour && tourStep !== null && (
        <ContextualGuide
          label="Cold Wake orientation"
          steps={TOUR_STEPS}
          stepIndex={tourStep}
          actionRef={tourActionRef}
          finalLabel="Begin Cold Wake"
          onBack={() => setTourStep((current) => current === null ? 0 : Math.max(0, current - 1))}
          onNext={advanceTour}
          onSkip={finishTour}
        />
      )}

      {contextGuide && currentContextGuide && (
        <ContextualGuide
          label={contextGuide.id.replaceAll("-", " ")}
          steps={currentContextGuide}
          stepIndex={contextGuide.step}
          actionRef={contextGuideActionRef}
          finalLabel="Continue"
          onBack={retreatContextGuide}
          onNext={advanceContextGuide}
          onSkip={finishContextGuide}
        />
      )}

      {qaMode && qaGuidePreview && (
        <ContextualGuide
          label={
            qaGuidePreview.id === "orientation"
              ? "QA preview · Cold Wake orientation"
              : `QA preview · ${qaGuidePreview.id.replaceAll("-", " ")}`
          }
          steps={
            qaGuidePreview.id === "orientation"
              ? TOUR_STEPS
              : CONTEXT_GUIDES[qaGuidePreview.id]
          }
          stepIndex={qaGuidePreview.step}
          finalLabel="Close preview"
          onBack={() =>
            setQaGuidePreview((current) =>
              current
                ? { ...current, step: Math.max(0, current.step - 1) }
                : null,
            )
          }
          onNext={() =>
            setQaGuidePreview((current) => {
              if (!current) return null;
              const steps =
                current.id === "orientation"
                  ? TOUR_STEPS
                  : CONTEXT_GUIDES[current.id];
              return current.step >= steps.length - 1
                ? null
                : { ...current, step: current.step + 1 };
            })
          }
          onSkip={() => setQaGuidePreview(null)}
        />
      )}

      {qaMode && qaCoreEchoPreview && (
        <CoreEchoPreview
          previewId={qaCoreEchoPreview}
          onClose={() => setQaCoreEchoPreview(null)}
        />
      )}

      {loreOpen && (
        <LoreArchive
          memoryEntries={availableLoreEntries}
          encryptedMemoryCount={Math.max(0, LORE_ENTRIES.length - availableLoreEntries.length)}
          fragments={discoveredFragments}
          nextFragment={nextArchiveDiscovery}
          causalArchive={causalArchive}
          worlds={archiveWorlds}
          laws={archiveLaws}
          worldsSaved={game.missions.worldsSaved}
          onCrossIndex={handleArchiveInvestigation}
          onReplayOrientation={replayTour}
          onClose={() => setLoreOpen(false)}
        />
      )}

      {manualTopic && (
        <GameManualDialog
          currentTopicId={manualTopic}
          availablePages={availableManualPages}
          priorities={commandPriorities}
          onNavigate={handleCommandPriorityNavigate}
          onClose={closeManual}
        />
      )}

    </main>
  );
}
