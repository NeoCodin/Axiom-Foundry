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
  RETIRED_SAVE_KEYS,
  RUN_UPGRADES,
  SAVE_KEY,
  buyLegacyUpgrade,
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
  hasRescueDetail,
  performArkRescue,
  getDefenseInstallationQuote,
  getCrisisReadiness,
  getCurrentViabilityForecast,
  getEffectiveCohesion,
  getEquipmentFabricationQuote,
  getInfrastructureFluxCost,
  startArkBerthConstruction,
  getLegacyUpgradeCost,
  getManualGain,
  getMissionProgress,
  getMissionStageProgress,
  getOfflineCapHours,
  getProductionSnapshot,
  getPurchaseQuantity,
  getRecalibrationGain,
  getRecalibrationThreshold,
  getResearchCrewAvailable,
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
  getSupplyFabricationQuote,
  getTierCost,
  getWorldEffects,
  isTierUnlocked,
  pulseCore,
  recalibrate,
  resolveCurrentCrisis,
  sanitizeGameState,
  setAutoEnabled,
  setAutoTier,
  setAutoUpgrades,
  setBuyMode,
  setTutorialComplete,
  simulateGame,
  type GameState,
  type PurchaseMode,
} from "./game-engine";
import { FoundryVista, WORLD_VISUALS } from "./foundry-vista";
import ArkDeck, { type ArkViewId } from "./ark-deck";
import { AxiomLawHeart } from "./axiom-law-heart";
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
import { type DoctrineId } from "./discovery-content";
import {
  chooseDoctrine,
  grantLivingFoundryRewards,
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
import { LORE_ENTRIES, TOUR_STEPS } from "./story-content";
import { LoreArchive, type ArchiveWorldEntry } from "./lore-archive";
import { getProgressiveDisclosure } from "./progressive-disclosure";
import { PixelTooltipLayer } from "./pixel-tooltip-layer";
import { QaSandbox } from "./qa-sandbox";
import {
  QA_QUERY_PARAMETER,
  QA_SAVE_KEY,
  boostQaCrew,
  completeQaResearch,
  createQaCheckpoint,
  grantQaResources,
  prepareQaContinuity,
  simulateQaOfflineDay,
} from "./qa-sandbox-engine";

type MobileTab = "machines" | "systems";

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
        label: "Cold Wake: prove three portable laws",
        threshold: 3,
        current: Math.min(3, state.lifetimeAxioms),
        progress: Math.min(1, state.lifetimeAxioms / 3),
      };
    }
    return {
      label: "Engineering directive complete — continuity review required",
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
  const upgradeReveal = RUN_UPGRADES.find(
    (upgrade) => state.maxFlux < upgrade.revealAt,
  );
  const candidates = [
    generatorUnlock
      ? {
          threshold: generatorUnlock.unlockAt,
          label: `Discover ${generatorUnlock.name}`,
        }
      : null,
    upgradeReveal
      ? {
          threshold: upgradeReveal.revealAt,
          label: `Decode ${upgradeReveal.name}`,
        }
      : null,
    state.runFlux < recalibrationThreshold
      ? {
          threshold: recalibrationThreshold,
          label: "Stabilize the first Recalibration",
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
    ...RUN_UPGRADES.map((upgrade) => upgrade.revealAt),
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

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createInitialState(0));
  const [ready, setReady] = useState(false);
  const [primaryView, setPrimaryView] = useState<PrimaryView>("deck");
  const [mobileTab, setMobileTab] = useState<MobileTab>("machines");
  const [researchEntry, setResearchEntry] = useState<{
    view: ResearchView;
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
  const [loreOpen, setLoreOpen] = useState(false);
  const [manualTopic, setManualTopic] = useState<ManualTopicId | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [qaMode, setQaMode] = useState(false);
  const [qaCollapsed, setQaCollapsed] = useState(false);
  const loadStarted = useRef(false);
  const activeSaveKeyRef = useRef(SAVE_KEY);
  const gameRef = useRef(game);
  const tourActionRef = useRef<HTMLButtonElement>(null);
  const missionSignatureRef = useRef("");
  const stageSignatureRef = useRef("");

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (!manualTopic) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setManualTopic(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [manualTopic]);

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
            "Cold-wake charts loaded. AXIOM is alone, Pelagos is ahead, and the continuity route is ready.",
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
    setMobileTab("machines");
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
          document.visibilityState === "visible" && tourStep === null,
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
  }, [ready, tourStep]);

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
  const objective = useMemo(() => getNextObjective(game), [game]);
  const commandPriorities = useMemo(() => getCommandPriorities(game), [game]);
  const activeMission = MISSIONS[game.missions.currentIndex];
  const activeStage =
    activeMission?.stages[game.missions.stageIndex] ?? null;
  const missionProgress = useMemo(
    () => getMissionProgress(game),
    [game],
  );
  const worldEffects = useMemo(() => getWorldEffects(game), [game]);
  const campaignWorldIndex = getCampaignWorldIndex(game);
  const disclosure = useMemo(() => getProgressiveDisclosure(game), [game]);
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
  const worldVisual =
    WORLD_VISUALS[campaignWorldIndex] ?? WORLD_VISUALS[0];
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
  const unlockedLoreIds = useMemo(() => {
    const ids = new Set<string>([
      "archive.public.null-tide",
      "archive.public.axiom",
    ]);
    if (game.manualPulses >= 12) ids.add("archive.public.flux");
    if (game.tiers[0].bought >= 25 || game.missions.worldsSaved > 0) {
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
    game.tiers[0].bought,
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
  const doctrineAvailability = useMemo(
    () =>
      getDoctrineAvailability(
        game.living.discoveredLore,
        game.missions.worldsSaved,
      ),
    [game.living.discoveredLore, game.missions.worldsSaved],
  );
  const chosenDoctrine = getChosenDoctrine(game.living.doctrine);
  const activeTransit = getActiveTransit(game);
  const firstLockedGenerator = GENERATORS.findIndex(
    (_, index) => !isTierUnlocked(game, index),
  );
  const visibleGeneratorCount =
    firstLockedGenerator === -1
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
  const campaignCrew = getCampaignCrewSummaries(game);
  const researchPowerAvailable = getResearchPowerAvailable(game);
  const researchCrewAvailable = getResearchCrewAvailable(game);
  const researchExpertise = getOperationalResearchExpertise(game);
  const researchLead = getResearchLeadStatus(game);
  const researchFieldValidation = getResearchFieldValidation(game);
  const researchNetwork = useMemo(
    () =>
      getResearchNetworkStatus(game.research, {
        powerAvailable: researchPowerAvailable,
        crewAvailable: researchCrewAvailable,
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
          (key) => [
            key,
            8 +
              game.survivors.lifeSupport[key] * 2 +
              game.settlement.completedWorldIds.length * 4,
          ],
        ),
      ) as Record<LifeSupportKey, number>,
    [game.settlement.completedWorldIds.length, game.survivors.lifeSupport],
  );
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
    if (getLegacyUpgradeCost(gameRef.current, index) > gameRef.current.axioms) {
      return;
    }
    setGame((current) => buyLegacyUpgrade(current, index));
    setAnnouncement(`${LEGACY_UPGRADES[index].name} advanced one level.`);
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
    setMobileTab("machines");
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
    setMobileTab("machines");
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
    if (view === "engineering") setMobileTab("machines");
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
    setMobileTab("machines");
    applyQaState(next, `QA checkpoint loaded: ${MISSIONS[worldIndex]?.world ?? "Cold Wake"}.`);
  };

  const handleReturnToPlayerSave = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(QA_QUERY_PARAMETER);
    window.location.assign(url.toString());
  };

  const handleCommandPriorityNavigate = (priority: CommandPriority) => {
    setPrimaryView(priority.target);
    if (priority.target === "engineering") {
      setMobileTab(priority.panel === "systems" ? "systems" : "machines");
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
    const cost =
      8 +
      current.survivors.lifeSupport[key] * 2 +
      current.settlement.completedWorldIds.length * 4;
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
        "Finish this world's Engineering directive, infrastructure, and required research before resolving its crisis.",
      );
      return;
    }
    commitGameState(next, `${crisisId.replaceAll("-", " ")} resolved without a deadline or loss state.`);
  };

  const handleCampaignDeparture = (colonyName: string) => {
    const current = gameRef.current;
    const result = departCurrentWorld(current, Date.now(), colonyName);
    if (!result.ok) {
      setAnnouncement("Departure denied. The continuity forecast still lists required work or founders.");
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

  const replayTour = () => {
    const next = setTutorialComplete(gameRef.current, false);
    gameRef.current = next;
    setGame(next);
    setLoreOpen(false);
    setPrimaryView("deck");
    setTourStep(0);
  };

  const updateMode = (mode: PurchaseMode) => {
    setGame((current) => setBuyMode(current, mode));
  };

  const currentTour = tourStep === null ? null : TOUR_STEPS[tourStep];
  const engineeringUnlocked = disclosure.engineering;
  const researchUnlocked = disclosure.research;
  const populationUnlocked = disclosure.population;
  const medicalUnlocked = disclosure.medical;
  const settlementUnlocked = disclosure.settlement;
  const fabricationUnlocked = disclosure.fabrication;
  const systemsUnlocked = disclosure.systems;
  const protocolsUnlocked = disclosure.protocols;
  const recalibrationUnlocked = disclosure.recalibration;
  const engineeringMobileTabs: Array<[MobileTab, string]> = [["machines", "Fabricate"]];
  if (systemsUnlocked || protocolsUnlocked || recalibrationUnlocked) {
    engineeringMobileTabs.push(["systems", "Campaign"]);
  }
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
      className={`game-shell world-theme-${worldVisual.slug}`}
      data-world={worldVisual.slug}
      data-world-index={campaignWorldIndex}
      data-view={primaryView}
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
        arrival={activeTransit ? `${activeTransit.originName} corridor // ${formatDuration(activeTransit.remainingSeconds)} to arrival` : MISSIONS[campaignWorldIndex].arrival}
        fluxLabel={formatNumber(game.flux)}
        fluxExact={game.flux.toExponential(6)}
        fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
        axiomsLabel={formatNumber(game.axioms)}
        resonanceLabel={formatNumber(production.resonance.multiplier)}
        operationalLoadLabel={`${Math.round(operationalLoad.total * 10_000) / 100}%`}
        showAxioms={game.lifetimeAxioms > 0 || game.maxFlux >= 10_000}
        showResonance={campaignWorldIndex >= 1 && game.tiers[1].bought > 0}
        showOperations={campaignWorldIndex >= 2 || operationalLoad.total > 0.001}
        saveStatus={saveStatus}
        ready={ready}
        focusWelcome={currentTour?.target === "welcome"}
        focusFlux={currentTour?.target === "flux"}
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
        onOpenHelp={() => setManualTopic(primaryView)}
        onOpenLore={() => setLoreOpen(true)}
        onSave={() => persistGame("Saved")}
        onOpenDirective={() => {
          if (navigationUnlocks.settlement) setPrimaryView("settlement");
          else setPrimaryView("deck");
        }}
        tooltipsEnabled={tooltipsEnabled}
        onToggleTooltips={handleToggleTooltips}
      />

      {qaMode && (
        <QaSandbox
          collapsed={qaCollapsed}
          onToggleCollapsed={() => setQaCollapsed((collapsed) => !collapsed)}
          onJumpWorld={handleQaJumpWorld}
          onFreshColdWake={() => {
            const next = setTutorialComplete(createInitialState(Date.now()), true);
            applyQaState(next, "Fresh Cold Wake opening loaded in the isolated QA profile.");
            setPrimaryView("deck");
          }}
          onGrantResources={() => applyQaState(grantQaResources(gameRef.current), "QA resources stocked.")}
          onCompleteResearch={() => applyQaState(completeQaResearch(gameRef.current), "Every research program marked complete for testing.")}
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
        onNavigate={setPrimaryView}
      />

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
        campaignWorldIndex === 0 ? (
          <AxiomLawHeart
            fluxLabel={formatNumber(game.flux)}
            fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
            manualGainLabel={formatNumber(manualGain)}
            manualPulses={game.manualPulses}
            maxFlux={game.maxFlux}
            stageIndex={game.missions.stageIndex}
            objectiveLabel={objective.label}
            objectiveDetail={game.missions.awaitingAcknowledgement
              ? "Recalibrate until Containment, Conservation, and Transit survive the cycle. Then authorize Pelagos orbit from Continuity."
              : activeStage?.instruction ?? campaignWorld.arrivalBrief}
            objectiveProgress={objective.progress}
            machine={{
              name: GENERATORS[0].name,
              shortName: GENERATORS[0].shortName,
              bought: game.tiers[0].bought,
              outputLabel: formatNumber(production.tierOutputs[0]),
              costLabel: formatNumber(coldWakeTierCost),
              quantity: coldWakePurchaseQuantity,
              canBuy: coldWakePurchaseQuantity > 0,
              unlocked: isTierUnlocked(game, 0),
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
            onTune={handlePulse}
            onBuy={() => handleBuyTier(0)}
            onSetBuyMode={updateMode}
            onRecalibrate={handleRecalibrate}
            onContribute={handleMissionContribution}
          />
        ) : (
        <>
        <CommandBriefing priorities={commandPriorities} onNavigate={handleCommandPriorityNavigate} />
        <ArkDeck
          foundryName={game.living.foundryName}
          worldName={campaignWorld.name}
          worldSubtitle={campaignWorld.subtitle}
          worldProgress={(viabilityForecast?.score ?? objective.progress * 100) / 100}
          objectiveLabel={objective.label}
          objectiveDetail={activeStage?.instruction ?? campaignWorld.arrivalBrief}
          fluxLabel={formatNumber(game.flux)}
          fluxPerSecondLabel={formatNumber(production.fluxPerSecond)}
          manualGainLabel={formatNumber(manualGain)}
          population={game.survivors.survivors.length}
          populationCapacity={Math.min(berthCapacity, ...Object.values(lifeSupport.capacity))}
          berthCapacity={berthCapacity}
          berthSections={game.survivors.berthSections}
          berthConstructionProgress={berthConstruction ? berthPanelQuote.progressRatio : null}
          cohesion={getEffectiveCohesion(game)}
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
            label: `Signal ${String(game.survivors.activeSignal.sequence).padStart(2, "0")}`,
            location: game.survivors.activeSignal.sourceLabel,
            groupSize: game.survivors.activeSignal.survivors.length,
            roles: [...new Set(game.survivors.activeSignal.survivors.map((survivor) => survivor.role.replaceAll("-", " ")))],
            rescueCost: game.survivors.activeSignal.rescueCost,
            canRescue: rescueQuote.canRescue,
            blockedReason:
              rescueQuote.reason === "berths"
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
          unlockedViews={unlockedArkViews}
          onTuneCore={handlePulse}
          onActivateBeacon={handleActivateBeacon}
          onRescueSignal={handleRescueSurvivors}
          onOpenView={handleOpenArkView}
          onOpenHelp={setManualTopic}
        />
        </>
        )
      ) : primaryView === "population" ? (
        <PopulationConsole
          state={game.survivors}
          salvage={game.living.salvage}
          currentWorldName={campaignWorld.name}
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
          onOpenHelp={setManualTopic}
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
          onOpenHelp={setManualTopic}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "research" ? (
        <ResearchLattice
          key={`research-${researchEntry?.view ?? "default"}-${researchEntry?.nonce ?? 0}`}
          state={game.research}
          resources={game.researchStock}
          availableCrew={researchCrewAvailable}
          powerAvailable={researchPowerAvailable}
          externalSpeedMultiplier={
            colonyLegacyEffects.researchSpeedMultiplier
          }
          automationMultiplier={automationEffects.researchRoutingMultiplier}
          expertise={researchExpertise}
          leadResearcher={researchLead}
          fieldValidation={researchFieldValidation}
          initialView={researchEntry?.view}
          now={clockNow || game.lastSaved}
          autoTransfer={getAutoTransferStatus(game)}
          onStateChange={handleResearchStateChange}
          onTransferInput={handleTransferResearchInput}
          onAssignedCrewChange={handleResearchCrewChange}
          onOpenHelp={setManualTopic}
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
          onBuyInstallation={handleBuyDefenseInstallation}
          onChooseContactDoctrine={handleChooseDefenseDoctrine}
          onChooseEnvironmentalDoctrine={handleChooseEnvironmentalDefenseDoctrine}
          onOpenHelp={setManualTopic}
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
          onOpenHelp={setManualTopic}
          onBack={() => setPrimaryView("population")}
        />
      ) : primaryView === "expeditions" ? (
        <ExpeditionConsole
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
          onOpenHelp={setManualTopic}
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
          pendingTransmission={pendingColonyTransmission ? {
            colonyName: pendingColonyTransmission.colonyName,
            transmission: pendingColonyTransmission.transmission,
          } : null}
          planetaryDefense={game.planetaryDefense}
          planetaryDefenseActive={planetaryDefenseActive}
          planetaryDefenseLoad={operationalLoad.planetaryDefense}
          planetaryDefenseQuotes={planetaryDefenseQuotes}
          onToggleSettler={handleToggleSettler}
          onCompleteInfrastructure={handleCompleteInfrastructure}
          onFabricateSupply={handleFabricateSupply}
          onFabricateEquipment={handleFabricateEquipment}
          onResolveCrisis={handleResolveCrisis}
          onDepart={handleCampaignDeparture}
          onAcknowledgeTransmission={handleAcknowledgeTransmission}
          onPlanetaryDoctrine={handlePlanetaryDefenseDoctrine}
          onPlanetaryConstruction={handlePlanetaryDefenseConstruction}
          onOpenPopulation={populationUnlocked ? () => setPrimaryView("population") : undefined}
          onOpenResearch={researchUnlocked ? () => setPrimaryView("research") : undefined}
          onOpenHelp={setManualTopic}
          onBack={() => setPrimaryView("deck")}
        />
      ) : (
      <section className="foundry-workspace" aria-labelledby="foundry-workspace-title">
        <header className="foundry-workspace-header">
          <div>
            <p className="section-kicker">Fabrication deck // systems online</p>
            <h2 id="foundry-workspace-title">The Foundry Floor</h2>
            <span>Build the nested mechanisms that turn Core energy into planetary recovery. Core tuning remains aboard the Ark.</span>
          </div>
          <button className="quiet-button" type="button" onClick={() => setPrimaryView("deck")}>Return to Ark Core</button>
        </header>

        <section className="foundry-telemetry" aria-label="Foundry diagnostics">
          <div>
            <span>Flux flow</span>
            <strong>{formatNumber(production.fluxPerSecond)}<small>/sec</small></strong>
          </div>
          <div>
            <span>Machine multiplier</span>
            <strong>×{formatNumber(production.globalMultiplier)}</strong>
          </div>
          <div>
            <span>Balanced links</span>
            <strong>{production.resonance.levels}<small> active</small></strong>
          </div>
          <div>
            <span>Lifetime Axioms</span>
            <strong>{formatNumber(game.lifetimeAxioms)}</strong>
          </div>
          <div>
            <span>Chain depth</span>
            <strong>{Math.max(1, visibleGeneratorCount)}<small> / {GENERATORS.length}</small></strong>
          </div>
          <div title="The share of production currently diverted to medical care, utility drones, restored-world defenses, and hostile compromises.">
            <span>Operational load</span>
            <strong>{Math.round(operationalLoad.total * 10_000) / 100}<small>%</small></strong>
          </div>
          <span className="foundry-telemetry-flow" aria-hidden="true"><i /><i /><i /><i /></span>
        </section>

        <FoundryVista game={game} />

      <div className="game-grid foundry-grid">
        {fabricationUnlocked && (
        <section className={`panel machine-panel mobile-section ${mobileTab === "machines" ? "is-mobile-active" : ""}`}>
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

          <div className="machine-list">
            {GENERATORS.slice(0, visibleGeneratorCount).map((generator, index) => {
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
                        <span className="owned-count" title={`${tier.amount.toExponential(6)} total`}>
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
                      className="buy-button"
                      type="button"
                      disabled={quantity <= 0}
                      onClick={() => handleBuyTier(index)}
                      aria-label={`Buy ${game.settings.buyMode === "max" ? quantity : displayQuantity} ${generator.name} for ${formatNumber(cost)} Flux`}
                    >
                      <span>{game.settings.buyMode === "max" && quantity > 0 ? `Build ×${quantity}` : `Build ${game.settings.buyMode === "max" ? "Max" : `×${displayQuantity}`}`}</span>
                      <small>{quantity > 0 ? formatNumber(cost) : `Need ${formatNumber(cost)}`} Flux</small>
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {(systemsUnlocked || protocolsUnlocked || recalibrationUnlocked) && (
        <aside className={`systems-column mobile-section ${mobileTab === "systems" ? "is-mobile-active" : ""}`}>
          {systemsUnlocked && (
          <section id="planetary-directives" className="panel mission-panel">
            <div className="panel-heading mission-heading">
              <div>
                <p className="section-kicker danger-text">Planetfall campaign</p>
                <h2>Planetary Directives</h2>
              </div>
              <button className="archive-button" type="button" onClick={() => setLoreOpen(true)}>Archive</button>
            </div>

            {game.missions.awaitingAcknowledgement && activeMission ? (
              <div className="mission-outcome saved">
                <p>Engineering directive complete</p>
                <h3>{activeMission.world}</h3>
                <span>The Ark has solved the mechanical problem. Departure still requires infrastructure, research, supplies, crisis resolution, Community Readiness, and the required Expertise.</span>
                <button type="button" onClick={() => setPrimaryView("settlement")}>Open continuity forecast</button>
                <small>No timer is running. This world waits until its settlement can survive without AXIOM.</small>
              </div>
            ) : activeMission && activeStage ? (
              <div className="mission-body">
                <div className="mission-world-line">
                  <div>
                    <span>World {game.missions.currentIndex + 1} of {MISSIONS.length} · Phase {game.missions.stageIndex + 1} of {activeMission.stages.length}</span>
                    <h3>{activeMission.world}</h3>
                    <small>{activeMission.epithet}</small>
                  </div>
                </div>
                <h4>{activeMission.title}</h4>
                <p>{activeMission.briefing}</p>
                <ol className="mission-stages" aria-label={`${activeMission.world} operation phases`}>
                  {activeMission.stages.map((stage, index) => {
                    const progress = getMissionStageProgress(game, index);
                    const phaseState = index < game.missions.stageIndex
                      ? "complete"
                      : index === game.missions.stageIndex
                        ? "active"
                        : "pending";
                    return (
                      <li className={phaseState} key={stage.label}>
                        <span>{index < game.missions.stageIndex ? "✓" : index + 1}</span>
                        <div><strong>{stage.label}</strong><small>{stage.instruction}</small></div>
                        {index === game.missions.stageIndex && <b>{Math.round(progress.ratio * 100)}%</b>}
                      </li>
                    );
                  })}
                </ol>
                <div className="mission-goal">
                  <div>
                    <span>Active operation</span>
                    <strong>{activeStage.instruction}</strong>
                  </div>
                  <span className="mission-numbers">
                    {activeStage.kind === "resonanceHold"
                      ? `${formatDuration(missionProgress.value)} / ${formatDuration(missionProgress.target)}`
                      : `${formatNumber(missionProgress.value)} / ${formatNumber(missionProgress.target)}`}
                  </span>
                </div>
                <div className="mission-progress" role="progressbar" aria-label={`${activeMission.world}: ${activeStage.instruction}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(missionProgress.ratio * 100)}>
                  <span style={{ width: `${missionProgress.ratio * 100}%` }} />
                </div>
                <p className="mission-lore-impact">{activeStage.lore}</p>
                {activeStage.kind === "contributeFlux" && (
                  <button
                    className="mission-contribute"
                    type="button"
                    disabled={game.flux <= 0 || !game.settings.tutorialComplete}
                    onClick={handleMissionContribution}
                  >
                    Divert {formatNumber(Math.min(game.flux, Math.max(0, activeStage.target - game.missions.contributedFlux)))} Flux
                  </button>
                )}
                <div className="mission-hazard">
                  <div><span>Local physics hazard</span><strong>{activeMission.hazardLabel}</strong></div>
                  <b>{Math.round(worldEffects.repairProgress * 100)}% stabilized</b>
                  <p>{activeMission.hazard}</p>
                </div>
                <div className="mission-stakes">
                  <span><b>Rescue grant</b>{activeMission.rewardLabel}</span>
                  <span><b>Foundry protocol</b>No deadline. Progress saves automatically, so every operation can be completed at your pace.</span>
                </div>
                {!game.settings.tutorialComplete && (
                  <button className="orientation-button" type="button" onClick={() => setTourStep(0)}>Complete orientation to begin</button>
                )}
              </div>
            ) : (
              <div className="campaign-complete">
                <span aria-hidden="true">✦</span>
                {chosenDoctrine ? (
                  <>
                    <h3>{chosenDoctrine.title}</h3>
                    <p>{chosenDoctrine.commitment}</p>
                    <blockquote>{chosenDoctrine.lyraResponse}</blockquote>
                    <p>{chosenDoctrine.epilogue}</p>
                    <small>The choice is written beneath the reset layer. This campaign will remember.</small>
                  </>
                ) : (
                  <>
                    <h3>The Vesper Choice</h3>
                    <p>The route is complete, but the recovered record does not support AXIOM&apos;s bootstrap history. Choose what the Foundry carries into the next reality.</p>
                    <div className="doctrine-grid">
                      {doctrineAvailability.map(({ doctrine, available }) => (
                        <article key={doctrine.id} className={available ? "available" : "locked"}>
                          <span>{available ? "Doctrine available" : "Evidence incomplete"}</span>
                          <strong>{doctrine.shortName}</strong>
                          <p>{doctrine.thesis}</p>
                          <button type="button" disabled={!available} onClick={() => handleDoctrineChoice(doctrine.id)}>
                            {available ? doctrine.choiceLabel : `${doctrine.unlock.minDiscoveries} records required`}
                          </button>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mission-footer">
              <span><b>{game.missions.worldsSaved}</b> saved</span>
              <span><b>{Math.max(0, MISSIONS.length - game.missions.currentIndex)}</b> remaining</span>
              <span><b>{Math.round(production.hazardShield * 100)}%</b> relay shielding</span>
            </div>
          </section>
          )}

          {(automationFrameQuote.researchMet || game.automation.framesBuilt > 0) && (
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
              onOpenHelp={setManualTopic}
            />
          )}

          {protocolsUnlocked && (
          <section className="panel upgrades-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker brass">Temporary engineering optimizations</p>
                <h2>Core Protocols</h2>
              </div>
              <span className="count-label">{game.runUpgrades.reduce((sum, level) => sum + level, 0)} levels</span>
            </div>
            <div className="upgrade-list">
              {RUN_UPGRADES.map((upgrade, index) => {
                const level = game.runUpgrades[index];
                const maxed = level >= upgrade.maxLevel;
                const revealed = game.maxFlux >= upgrade.revealAt || index === RUN_UPGRADES.findIndex((item) => game.maxFlux < item.revealAt);
                if (!revealed) return null;
                if (game.maxFlux < upgrade.revealAt) {
                  return (
                    <article className="upgrade-card locked" key={upgrade.name}>
                      <div><span>Research signal</span><strong>Reach {formatNumber(upgrade.revealAt)} Flux</strong></div>
                    </article>
                  );
                }
                const cost = getRunUpgradeCost(game, index);
                return (
                  <article className={`upgrade-card ${maxed ? "installed" : ""}`} key={upgrade.name}>
                    <div className="upgrade-copy">
                      <span>LEVEL {level}/{upgrade.maxLevel}</span>
                      <strong>{upgrade.name}</strong>
                      <p>{upgrade.description}</p>
                    </div>
                    <button type="button" disabled={maxed || game.flux < cost} onClick={() => handleRunUpgrade(index)}>
                      {maxed ? "MAXED" : `${formatNumber(cost)} Flux`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
          )}

          {recalibrationUnlocked && (
          <section className="panel recalibration-panel foundry-recalibration">
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
              <strong>{recalibrationGain} Axiom{recalibrationGain === 1 ? "" : "s"}</strong>
              <small>{formatNumber(game.runFlux)} / {formatNumber(recalibrationThreshold)} run Flux</small>
            </div>
            <p className="axiom-definition">Axioms are permanent laws that keep ships, time, and matter consistent inside the Null Tide.</p>
            {!confirmPrestige ? (
              <button
                className="prestige-button"
                type="button"
                disabled={recalibrationGain < 1}
                onClick={() => setConfirmPrestige(true)}
              >
                {recalibrationGain < 1 ? "Recalibration not yet stable" : "Prepare Recalibration"}
              </button>
            ) : (
              <div className="confirm-row" role="group" aria-label="Confirm Recalibration">
                <button className="prestige-button" type="button" onClick={handleRecalibrate}>Begin Cycle {game.cycle + 1}</button>
                <button className="quiet-button" type="button" onClick={() => setConfirmPrestige(false)}>Cancel</button>
              </div>
            )}
          </section>
          )}

          {recalibrationUnlocked && game.lifetimeAxioms > 0 && (
          <section className="panel automation-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Cycle control</p>
                <h2>AXIOM Autonomy</h2>
              </div>
              <span className={`status-chip ${game.settings.autoEnabled ? "online" : ""}`}>{game.settings.autoEnabled ? "ACTIVE" : "IDLE"}</span>
            </div>
            {game.lifetimeAxioms < 1 ? (
              <div className="locked-copy">
                <span className="lock-glyph" aria-hidden="true">◇</span>
                <p>Complete one Recalibration to unlock automatic machine purchasing.</p>
              </div>
            ) : (
              <>
                <label className="toggle-row">
                  <span><strong>Autonomous fabrication</strong><small>AXIOM buys one affordable unit from each enabled tier every second.</small></span>
                  <input type="checkbox" checked={game.settings.autoEnabled} onChange={(event) => setGame((current) => setAutoEnabled(current, event.target.checked))} />
                </label>
                <div className="tier-toggles" aria-label="Automatic machine tiers">
                  {GENERATORS.map((generator, index) => (
                    <label key={generator.name}>
                      <input type="checkbox" checked={game.settings.autoTiers[index]} onChange={(event) => setGame((current) => setAutoTier(current, index, event.target.checked))} />
                      <span>T{index + 1}</span>
                    </label>
                  ))}
                </div>
                <label className={`toggle-row ${game.lifetimeAxioms < 3 ? "disabled" : ""}`}>
                  <span><strong>Research routing</strong><small>{game.lifetimeAxioms < 3 ? "Unlocks at 3 lifetime Axioms." : "Automatically buys affordable run research."}</small></span>
                  <input type="checkbox" disabled={game.lifetimeAxioms < 3} checked={game.settings.autoUpgrades} onChange={(event) => setGame((current) => setAutoUpgrades(current, event.target.checked))} />
                </label>
              </>
            )}
          </section>
          )}

          {recalibrationUnlocked && game.lifetimeAxioms > 0 && (
          <section className="panel legacy-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker violet">Across all cycles</p>
                <h2>Legacy Matrix</h2>
              </div>
              <span className="count-label violet-text">{formatNumber(game.axioms)} A</span>
            </div>
            {game.lifetimeAxioms < 1 ? (
              <div className="locked-copy compact">
                <p>The matrix will resolve after your first Recalibration.</p>
              </div>
            ) : (
              <div className="legacy-list">
                {LEGACY_UPGRADES.map((upgrade, index) => {
                  const cost = getLegacyUpgradeCost(game, index);
                  return (
                    <article key={upgrade.name}>
                      <div><span>LEVEL {game.legacyUpgrades[index]}</span><strong>{upgrade.name}</strong><p>{upgrade.description}</p></div>
                      <button type="button" disabled={game.axioms < cost} onClick={() => handleLegacyUpgrade(index)}>{cost} A</button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          )}

          {systemsUnlocked && (
          <details className="panel statistics-panel">
            <summary>Foundry statistics</summary>
            <dl>
              <div><dt>Current world</dt><dd>{MISSIONS[campaignWorldIndex].world}</dd></div>
              <div><dt>Campaign phase</dt><dd>{Math.min(MISSIONS.length, game.missions.currentIndex + 1)} / {MISSIONS.length}</dd></div>
              <div><dt>This cycle</dt><dd>{formatDuration(game.runTime)}</dd></div>
              <div><dt>Total play</dt><dd>{formatDuration(game.playTime)}</dd></div>
              <div><dt>Run Flux</dt><dd>{formatNumber(game.runFlux)}</dd></div>
              <div><dt>All-time Flux</dt><dd>{formatNumber(game.allTimeFlux)}</dd></div>
              <div><dt>Core tunes</dt><dd>{formatNumber(game.manualPulses)}</dd></div>
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
          )}
        </aside>
        )}
      </div>
      </section>
      )}

      {currentTour && (
        <div className="tour-layer">
          <div className="tour-scrim" aria-hidden="true" />
          <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description">
            <div className="tour-speaker">
              <span aria-hidden="true">A</span>
              <div>
                <strong>AXIOM</strong>
                <small>Ark caretaker intelligence</small>
              </div>
            </div>
            <p className="tour-eyebrow">{currentTour.eyebrow}</p>
            <h2 id="tour-title">{currentTour.title}</h2>
            <p id="tour-description">{currentTour.body}</p>
            <div className="tour-note">{currentTour.note}</div>
            <div className="tour-progress" aria-label={`Tour step ${tourStep! + 1} of ${TOUR_STEPS.length}`}>
              {TOUR_STEPS.map((step, index) => (
                <span key={step.target} className={index === tourStep ? "active" : index < tourStep! ? "complete" : ""} />
              ))}
            </div>
            <div className="tour-actions">
              <button className="tour-skip" type="button" onClick={finishTour}>Skip orientation</button>
              <div>
                <button className="quiet-button" type="button" disabled={tourStep === 0} onClick={() => setTourStep((current) => current === null ? 0 : Math.max(0, current - 1))}>Back</button>
                <button ref={tourActionRef} className="tour-next" type="button" onClick={advanceTour}>{tourStep === TOUR_STEPS.length - 1 ? "Begin Cold Wake" : "Next"}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {loreOpen && (
        <LoreArchive
          memoryEntries={availableLoreEntries}
          encryptedMemoryCount={Math.max(0, LORE_ENTRIES.length - availableLoreEntries.length)}
          fragments={discoveredFragments}
          nextFragment={nextArchiveDiscovery}
          causalArchive={causalArchive}
          worlds={archiveWorlds}
          worldsSaved={game.missions.worldsSaved}
          onCrossIndex={handleArchiveInvestigation}
          onReplayOrientation={replayTour}
          onClose={() => setLoreOpen(false)}
        />
      )}

      {manualTopic && (
        <GameManualDialog
          topicId={manualTopic}
          availablePages={availableManualPages}
          onSelectTopic={setManualTopic}
          onClose={() => setManualTopic(null)}
        />
      )}

      {primaryView === "engineering" && (
      <nav className="mobile-nav" aria-label="Game sections">
        {engineeringMobileTabs.map(([value, label]) => (
          <button key={value} type="button" className={mobileTab === value ? "active" : ""} aria-pressed={mobileTab === value} onClick={() => setMobileTab(value)}>
            <span aria-hidden="true">{value === "machines" ? "II" : "≡"}</span>
            {label}
            {value === "systems" && recalibrationGain > 0 && <i aria-label="Recalibration available" />}
          </button>
        ))}
      </nav>
      )}
    </main>
  );
}
