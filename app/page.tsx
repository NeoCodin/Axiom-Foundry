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
  RECALIBRATION_THRESHOLD,
  RETIRED_SAVE_KEYS,
  RUN_UPGRADES,
  SAVE_KEY,
  buyLegacyUpgrade,
  buyRunUpgrade,
  buyTier,
  canResolveCurrentCrisis,
  completeWorldInfrastructure,
  contributeToMission,
  createInitialState,
  departCurrentWorld,
  fabricateWorldSupply,
  formatDuration,
  formatNumber,
  getCampaignCrewSummaries,
  getCampaignWorldIndex,
  getCrisisFluxCost,
  getCurrentViabilityForecast,
  getInfrastructureFluxCost,
  getLegacyUpgradeCost,
  getManualGain,
  getMissionProgress,
  getMissionStageProgress,
  getOfflineCapHours,
  getProductionSnapshot,
  getPurchaseQuantity,
  getRecalibrationGain,
  getResearchCrewAvailable,
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
import FoundryVista, { WORLD_VISUALS } from "./foundry-vista";
import ArkDeck, { type ArkViewId } from "./ark-deck";
import PopulationConsole from "./population-console";
import ResearchLattice from "./research-lattice";
import SettlementConsole from "./settlement-console";
import {
  addDiscovery,
  getChosenDoctrine,
  getDiscoveredFragments,
  getDoctrineAvailability,
  getNextArchiveDiscovery,
  syncAutomaticDiscoveries,
} from "./discovery-engine";
import {
  DISCOVERY_FRAGMENTS,
  type DoctrineId,
} from "./discovery-content";
import {
  chooseDoctrine,
  grantLivingFoundryRewards,
} from "./living-foundry-engine";
import {
  assignSurvivorToRole,
  getLifeSupportStatus,
  getRescueReadiness,
  getSurvivorSkillLevel,
  renameSurvivorCallsign,
  rescueSurvivorSignal,
  setLifeSupportCapacity,
  setSosBeaconOnline,
  startSurvivorTraining,
  cancelSurvivorTraining,
  type LifeSupportKey,
  type ProfessionalRole,
  type SurvivorRole,
} from "./survivor-engine";
import {
  addResearchInputs,
  getResearchNetworkStatus,
  getResearchProjectDefinition,
  getResearchProjectProgress,
  setResearchCrew,
  type ResearchInputId,
  type ResearchLatticeState,
} from "./research-engine";
import {
  acknowledgeColonyTransmission,
  getAllPendingColonyTransmissions,
  toggleSettlerSelection,
} from "./settlement-engine";
import { getCampaignWorld } from "./campaign-content";
import { LORE_ENTRIES, TOUR_STEPS } from "./story-content";

type MobileTab = "core" | "machines" | "systems" | "recalibrate";
type PrimaryView =
  | "deck"
  | "engineering"
  | "population"
  | "research"
  | "settlement";

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
    return {
      label: "Engineering directive complete — continuity review required",
      threshold: 1,
      current: 1,
      progress: 1,
    };
  }

  const worldIndex = getCampaignWorldIndex(state);
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
    state.runFlux < RECALIBRATION_THRESHOLD
      ? {
          threshold: RECALIBRATION_THRESHOLD,
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
      threshold: RECALIBRATION_THRESHOLD,
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
  const [mobileTab, setMobileTab] = useState<MobileTab>("core");
  const [clockNow, setClockNow] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [saveStatus, setSaveStatus] = useState("Local save pending");
  const [offlineNotice, setOfflineNotice] = useState<{
    seconds: number;
    gain: number;
  } | null>(null);
  const [pulseFeedback, setPulseFeedback] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);
  const loadStarted = useRef(false);
  const gameRef = useRef(game);
  const tourActionRef = useRef<HTMLButtonElement>(null);
  const missionSignatureRef = useRef("");
  const stageSignatureRef = useRef("");

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    const now = Date.now();
    let next = createInitialState(now);

    try {
      for (const retiredKey of RETIRED_SAVE_KEYS) {
        window.localStorage.removeItem(retiredKey);
      }
      const raw = window.localStorage.getItem(SAVE_KEY);
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
      }
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setSaveStatus("Progress stored on this device");
    } catch {
      try {
        const damaged = window.localStorage.getItem(SAVE_KEY);
        if (damaged) {
          window.localStorage.setItem(`${SAVE_KEY}-recovery-${now}`, damaged);
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
    const target = TOUR_STEPS[tourStep].target;
    if (target === "welcome") {
      setPrimaryView("deck");
      setMobileTab("core");
    } else if (target === "flux") {
      setPrimaryView("engineering");
      setMobileTab("core");
    } else {
      setPrimaryView("engineering");
      setMobileTab("machines");
    }
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
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
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
      if (event.key !== SAVE_KEY || !event.newValue) return;
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
  const manualGain = useMemo(() => getManualGain(game), [game]);
  const recalibrationGain = useMemo(
    () => getRecalibrationGain(game),
    [game],
  );
  const objective = useMemo(() => getNextObjective(game), [game]);
  const activeMission = MISSIONS[game.missions.currentIndex];
  const activeStage =
    activeMission?.stages[game.missions.stageIndex] ?? null;
  const missionProgress = useMemo(
    () => getMissionProgress(game),
    [game],
  );
  const worldEffects = useMemo(() => getWorldEffects(game), [game]);
  const campaignWorldIndex = getCampaignWorldIndex(game);
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
    firstLockedGenerator === -1
      ? GENERATORS.length
      : Math.min(GENERATORS.length, firstLockedGenerator + 1);
  const campaignWorld =
    (game.settlement.currentWorldId
      ? getCampaignWorld(game.settlement.currentWorldId)
      : null) ?? getCampaignWorld("vesper")!;
  const lifeSupport = useMemo(
    () => getLifeSupportStatus(game.survivors),
    [game.survivors],
  );
  const rescueReadiness = useMemo(
    () => getRescueReadiness(game.survivors, game.living.salvage),
    [game.living.salvage, game.survivors],
  );
  const viabilityForecast = getCurrentViabilityForecast(game);
  const campaignCrew = getCampaignCrewSummaries(game);
  const researchPowerAvailable = getResearchPowerAvailable(game);
  const researchCrewAvailable = getResearchCrewAvailable(game);
  const researchNetwork = useMemo(
    () =>
      getResearchNetworkStatus(game.research, {
        powerAvailable: researchPowerAvailable,
        crewAvailable: researchCrewAvailable,
      }),
    [game.research, researchCrewAvailable, researchPowerAvailable],
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
    () => ({
      ...game.worldProgress,
      completedResearchIds: [
        ...new Set([
          ...game.worldProgress.completedResearchIds,
          ...game.research.completedProjectIds,
        ]),
      ],
    }),
    [game.research.completedProjectIds, game.worldProgress],
  );
  const infrastructureQuotes = Object.fromEntries(
    campaignWorld.infrastructure.map((objective) => {
      const cost = getInfrastructureFluxCost(game);
      return [
        objective.id,
        { canAfford: game.flux >= cost, costLabel: `${formatNumber(cost)} Flux` },
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
  const crisisQuotes = Object.fromEntries(
    campaignWorld.crisisIds.map((crisisId) => {
      const cost = getCrisisFluxCost(game);
      return [
        crisisId,
        {
          canAfford: canResolveCurrentCrisis(game, crisisId),
          costLabel: `${formatNumber(cost)} Flux`,
        },
      ];
    }),
  );

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
    const gain = getManualGain(gameRef.current);
    setGame((current) => pulseCore(current));
    setPulseFeedback({ id: Date.now(), value: `+${formatNumber(gain)}` });
    window.setTimeout(() => setPulseFeedback(null), 650);
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
    setMobileTab("core");
    setAnnouncement(
      `Recalibration complete. Cycle ${next.cycle} begins with ${gain} new Axiom${gain === 1 ? "" : "s"}.`,
    );
    window.setTimeout(() => persistGame("Recalibration saved"), 0);
  };

  const handleHardReset = () => {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // The in-memory reset still works when storage is unavailable.
    }
    const next = createInitialState(Date.now());
    gameRef.current = next;
    setGame(next);
    setPrimaryView("deck");
    setMobileTab("core");
    setConfirmReset(false);
    setAnnouncement("The Foundry has been reset to Cycle 1.");
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
    if (view === "engineering") setMobileTab("core");
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
    const result = rescueSurvivorSignal(
      current.survivors,
      current.living.salvage,
    );
    if (!result.rescued) {
      setAnnouncement(
        result.reason === "life-support"
          ? "The signal is holding. Expand every life-support category before dispatching the shuttle."
          : "The signal is holding until the Ark has enough Salvage and capacity.",
      );
      return;
    }
    const rescued = result.survivorIds.length;
    commitGameState(
      {
        ...current,
        survivors: result.state,
        living: {
          ...current.living,
          salvage: current.living.salvage - result.salvageSpent,
        },
        researchStock: {
          ...current.researchStock,
          "biological-samples":
            current.researchStock["biological-samples"] + rescued * 18,
          "cultural-records":
            current.researchStock["cultural-records"] + rescued * 22,
        },
      },
      `${rescued} survivors are safely aboard. Their names, aptitudes, and histories are now part of the Ark.`,
    );
  };

  const handleStartTraining = (
    survivorId: string,
    role: ProfessionalRole,
  ) => {
    const current = gameRef.current;
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
    commitGameState(
      {
        ...current,
        survivors: assignSurvivorToRole(
          current.survivors,
          survivorId,
          role,
        ),
      },
      role ? `Crew assignment updated: ${role}.` : "Crew member released from duty.",
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
        ? `${campaignWorld.name} is independent. The Ark is now bound for ${getCampaignWorld(result.nextWorldId)?.name ?? "the next world"}.`
        : "The continuity route is complete. AXIOM must now decide what kind of future it has been building.",
    );
    setPrimaryView("deck");
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
    const fragment = getNextArchiveDiscovery(
      gameRef.current.living.discoveredLore,
    );
    if (!fragment) return;
    commitLivingChange(
      (living) =>
        grantLivingFoundryRewards(living, {
          loreIds: addDiscovery(living.discoveredLore, fragment.id),
        }),
      `Archive cross-index complete: ${fragment.title}.`,
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
  const tourTarget = currentTour?.target ?? null;
  const engineeringUnlocked =
    game.manualPulses >= 12 ||
    game.missions.stageIndex >= 1 ||
    game.missions.currentIndex > 0 ||
    game.missions.worldsSaved > 0 ||
    game.tiers[0].bought > 0 ||
    tourTarget === "flux";
  const researchUnlocked =
    game.tiers[0].bought > 0 ||
    game.research.activeProjectId !== null ||
    game.research.completedProjectIds.length > 0;
  const populationUnlocked =
    game.research.completedProjectIds.includes("closed-loop-atmosphere") ||
    campaignWorld.id !== "cold-wake" ||
    game.survivors.survivors.length > 0 ||
    game.survivors.beaconOnline;
  const settlementUnlocked =
    game.missions.awaitingAcknowledgement ||
    game.missions.worldsSaved > 0 ||
    game.settlement.completedWorldIds.length > 0;
  const fabricationUnlocked =
    game.missions.stageIndex >= 1 ||
    game.missions.currentIndex > 0 ||
    game.tiers[0].bought > 0;
  const systemsUnlocked =
    game.missions.stageIndex >= 2 ||
    game.missions.awaitingAcknowledgement ||
    game.missions.worldsSaved > 0;
  const protocolsUnlocked =
    game.maxFlux >= RUN_UPGRADES[0].revealAt || game.lifetimeAxioms > 0;
  const recalibrationUnlocked =
    game.maxFlux >= RUN_UPGRADES[RUN_UPGRADES.length - 1].revealAt ||
    game.lifetimeAxioms > 0 ||
    recalibrationGain > 0;
  const coreEnergyLevel = Math.min(
    5,
    Math.max(
      0,
      Math.floor(Math.log10(Math.max(1, production.fluxPerSecond + 1)) * 0.9),
    ),
  );
  const coreMotionStyle = {
    "--core-cycle": `${Math.max(2.4, 13 - coreEnergyLevel * 1.8)}s`,
    "--core-inner-cycle": `${Math.max(1.6, (13 - coreEnergyLevel * 1.8) * 0.66)}s`,
    "--core-packet-cycle": `${Math.max(0.7, (13 - coreEnergyLevel * 1.8) * 0.38)}s`,
  } as CSSProperties;
  const engineeringMobileTabs: Array<[MobileTab, string]> = [["core", "Core"]];
  if (fabricationUnlocked) engineeringMobileTabs.push(["machines", "Fabricate"]);
  if (systemsUnlocked) engineeringMobileTabs.push(["systems", "Mission"]);
  if (recalibrationUnlocked) engineeringMobileTabs.push(["recalibrate", "Recalibrate"]);
  const unlockedArkViews: ArkViewId[] = [];
  if (engineeringUnlocked) unlockedArkViews.push("engineering");
  if (researchUnlocked) unlockedArkViews.push("research");
  if (populationUnlocked) unlockedArkViews.push("population");
  if (settlementUnlocked) unlockedArkViews.push("settlement");

  return (
    <main
      className={`game-shell world-theme-${worldVisual.slug}`}
      data-world={worldVisual.slug}
      data-world-index={campaignWorldIndex}
      style={shellStyle}
    >
      <div className="ambient-grid" aria-hidden="true" />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <header className={`command-bar ${currentTour?.target === "welcome" || currentTour?.target === "flux" ? "tour-focus" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ◇
          </span>
          <div>
            <p className="eyebrow">{MISSIONS[campaignWorldIndex].world.toUpperCase()} · CYCLE {String(game.cycle).padStart(2, "0")}</p>
            <h1>{MISSIONS[campaignWorldIndex].arrival}</h1>
          </div>
        </div>

        <div className={`resource-readout ${currentTour?.target === "flux" ? "tour-focus" : ""}`} title={`${game.flux.toExponential(6)} Flux`}>
          <span className="resource-label">Local Flux</span>
          <strong>{formatNumber(game.flux)}</strong>
          <span className="rate">+{formatNumber(production.fluxPerSecond)} / sec</span>
        </div>

        <div className="header-metrics">
          <div title="Axioms are portable, permanent laws of physics forged by Recalibration.">
            <span>Axioms</span>
            <strong>{formatNumber(game.axioms)}</strong>
          </div>
          <div>
            <span>Resonance</span>
            <strong>×{formatNumber(production.resonance.multiplier)}</strong>
          </div>
        </div>

        <div className="header-actions">
          <span className="save-status">{ready ? saveStatus : "Restoring local cycle…"}</span>
          <button className="quiet-button" type="button" onClick={() => setLoreOpen(true)}>Lore archive</button>
          <button className="quiet-button" type="button" onClick={() => persistGame("Saved")}>Save now</button>
        </div>

        <div className="objective-strip">
          <div className="objective-copy">
            <span>{objective.label}</span>
            <span>{formatNumber(objective.current)} / {formatNumber(objective.threshold)} required</span>
            {activeMission && game.settings.tutorialComplete && !game.missions.awaitingAcknowledgement && (
              <button className="crisis-link" type="button" onClick={() => { setPrimaryView("engineering"); setMobileTab("systems"); }}>
                {activeMission.world} · Open directive
              </button>
            )}
          </div>
          <div
            className="objective-track"
            role="progressbar"
            aria-label={objective.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(objective.progress * 100)}
          >
            <span style={{ width: `${objective.progress * 100}%` }} />
          </div>
        </div>
      </header>

      <nav className="living-foundry-nav" aria-label="Foundry views" role="tablist">
        <button
          className={primaryView === "deck" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={primaryView === "deck"}
          onClick={() => setPrimaryView("deck")}
        >
          <span aria-hidden="true">A</span>
          Ark
        </button>
        {engineeringUnlocked && (
          <button
            className={primaryView === "engineering" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={primaryView === "engineering"}
            onClick={() => setPrimaryView("engineering")}
          >
            <span aria-hidden="true">01</span>
            Foundry
          </button>
        )}
        {researchUnlocked && (
          <button
            className={primaryView === "research" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={primaryView === "research"}
            onClick={() => setPrimaryView("research")}
          >
            <span aria-hidden="true">02</span>
            Research
          </button>
        )}
        {populationUnlocked && (
          <button
            className={primaryView === "population" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={primaryView === "population"}
            onClick={() => setPrimaryView("population")}
          >
            <span aria-hidden="true">03</span>
            Crew
          </button>
        )}
        {settlementUnlocked && (
          <button
            className={primaryView === "settlement" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={primaryView === "settlement"}
            onClick={() => setPrimaryView("settlement")}
          >
            <span aria-hidden="true">04</span>
            Continuity
          </button>
        )}
        <div className="nav-awakening-status" aria-live="polite">
          <span>{[engineeringUnlocked, researchUnlocked, populationUnlocked, settlementUnlocked].filter(Boolean).length + 1}</span>
          <small>Ark systems awake</small>
        </div>
      </nav>

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
          populationCapacity={Math.min(...Object.values(game.survivors.lifeSupport))}
          cohesion={game.living.cohesion}
          salvageLabel={formatNumber(game.living.salvage)}
          support={(Object.keys(game.survivors.lifeSupport) as LifeSupportKey[]).map((key) => ({
            id: key,
            label: key.replaceAll("-", " "),
            value: lifeSupport.demand[key],
            capacity: game.survivors.lifeSupport[key],
            status:
              lifeSupport.shortages[key] > 0
                ? `${lifeSupport.shortages[key]} capacity needed`
                : "stable reserve",
          }))}
          crew={game.survivors.survivors.map((survivor) => {
            const training = game.survivors.training.find(
              (program) => program.survivorId === survivor.id,
            );
            return {
              id: survivor.id,
              name: survivor.callsign || survivor.name,
              role: survivor.role.replaceAll("-", " "),
              level: Math.max(1, getSurvivorSkillLevel(
                survivor,
                survivor.role === "civilian" ? "teacher" : survivor.role,
              )),
              training: training?.targetRole ?? null,
            };
          })}
          beaconAvailable={
            campaignWorld.kind === "planet" &&
            Math.min(...Object.values(game.survivors.lifeSupport)) >= 2
          }
          beaconOnline={game.survivors.beaconOnline}
          pendingSignal={game.survivors.activeSignal ? {
            id: game.survivors.activeSignal.id,
            label: `Signal ${String(game.survivors.activeSignal.sequence).padStart(2, "0")}`,
            location: game.survivors.activeSignal.sourceLabel,
            groupSize: game.survivors.activeSignal.survivors.length,
            roles: [...new Set(game.survivors.activeSignal.survivors.map((survivor) => survivor.role.replaceAll("-", " ")))],
            rescueCost: game.survivors.activeSignal.rescueCost,
            canRescue: rescueReadiness.canRescue,
            blockedReason:
              rescueReadiness.reason === "life-support"
                ? "Expand life-support capacity first."
                : rescueReadiness.reason === "salvage"
                  ? "More Salvage is required."
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
          unlockedViews={unlockedArkViews}
          onTuneCore={handlePulse}
          onActivateBeacon={handleActivateBeacon}
          onRescueSignal={handleRescueSurvivors}
          onOpenView={handleOpenArkView}
        />
      ) : primaryView === "population" ? (
        <PopulationConsole
          state={game.survivors}
          salvage={game.living.salvage}
          currentWorldName={campaignWorld.name}
          beaconAvailable={
            campaignWorld.kind === "planet" &&
            Math.min(...Object.values(game.survivors.lifeSupport)) >= 2
          }
          supportUpgradeCosts={supportUpgradeCosts}
          onUpgradeSupport={handleUpgradeSupport}
          onActivateBeacon={handleActivateBeacon}
          onRescueSignal={handleRescueSurvivors}
          onStartTraining={handleStartTraining}
          onCancelTraining={handleCancelTraining}
          onAssignRole={handleAssignSurvivor}
          onRenameCallsign={handleRenameSurvivor}
          onBack={() => setPrimaryView("deck")}
        />
      ) : primaryView === "research" ? (
        <ResearchLattice
          state={game.research}
          resources={game.researchStock}
          availableCrew={researchCrewAvailable}
          powerAvailable={researchPowerAvailable}
          now={clockNow || game.lastSaved}
          onStateChange={handleResearchStateChange}
          onTransferInput={handleTransferResearchInput}
          onAssignedCrewChange={handleResearchCrewChange}
          onClose={() => setPrimaryView("deck")}
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
          crisisQuotes={crisisQuotes}
          pendingTransmission={pendingColonyTransmission ? {
            colonyName: pendingColonyTransmission.colonyName,
            transmission: pendingColonyTransmission.transmission,
          } : null}
          onToggleSettler={handleToggleSettler}
          onCompleteInfrastructure={handleCompleteInfrastructure}
          onFabricateSupply={handleFabricateSupply}
          onResolveCrisis={handleResolveCrisis}
          onDepart={handleCampaignDeparture}
          onAcknowledgeTransmission={handleAcknowledgeTransmission}
          onOpenPopulation={() => setPrimaryView("population")}
          onOpenResearch={() => setPrimaryView("research")}
          onBack={() => setPrimaryView("deck")}
        />
      ) : (
      <>
      <section className="engineering-theater-stage" aria-label="Current planetary theater">
        <FoundryVista game={game} />
      </section>
      <div className="game-grid">
        <div className="left-column">
          <section className={`panel core-panel mobile-section ${mobileTab === "core" ? "is-mobile-active" : ""} ${currentTour?.target === "flux" ? "tour-focus" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Instrument core</p>
                <h2>The Axiom Chamber</h2>
              </div>
              <span className="status-chip online">{Math.round(worldEffects.repairProgress * 100)}% STABLE</span>
            </div>

            <div
              className={`core-stage core-energy-${coreEnergyLevel} ${pulseFeedback ? "is-pulsing" : ""}`}
              data-energy={coreEnergyLevel}
              style={coreMotionStyle}
            >
              <div className="core-flux-streams" aria-hidden="true">
                <i /><i /><i /><i /><i /><i />
              </div>
              <div className="core-orbit core-orbit-outer" aria-hidden="true">
                <span className="orbit-node node-one" />
                <span className="orbit-node node-two" />
              </div>
              <div className="core-orbit core-orbit-inner" aria-hidden="true" />
              <div className="core-iris" aria-hidden="true"><i /></div>
              <div className="core-center">
                <span>OUTPUT</span>
                <strong>×{formatNumber(production.globalMultiplier * production.resonance.multiplier)}</strong>
              </div>
              {pulseFeedback && (
                <span key={pulseFeedback.id} className="pulse-feedback" aria-hidden="true">
                  {pulseFeedback.value}
                </span>
              )}
            </div>

            <button className={`tune-button ${currentTour?.target === "flux" ? "tour-focus" : ""}`} type="button" onClick={handlePulse} disabled={!ready}>
              <span>Tune the Core</span>
              <small>Force an alignment · +{formatNumber(manualGain)} Flux</small>
            </button>

            <div className="core-diagnostics">
              <div>
                <span>Machine multiplier</span>
                <strong>×{formatNumber(production.globalMultiplier)}</strong>
              </div>
              <div>
                <span>Balanced links</span>
                <strong>{production.resonance.levels}</strong>
              </div>
              <div>
                <span>Lifetime Axioms</span>
                <strong>{formatNumber(game.lifetimeAxioms)}</strong>
              </div>
            </div>
          </section>

          {recalibrationUnlocked && (
          <section className={`panel recalibration-panel mobile-section ${mobileTab === "recalibrate" ? "is-mobile-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-kicker violet">Permanent layer</p>
                <h2>Recalibration</h2>
              </div>
              <span className="axiom-symbol" aria-hidden="true">A</span>
            </div>
            <p className="panel-copy">
              Collapse this assembly into a portable law of physics. Machines and run research reset; the proven Axiom and every Legacy upgrade survive.
            </p>
            <div className="prestige-preview">
              <span>Projected yield</span>
              <strong>{recalibrationGain} Axiom{recalibrationGain === 1 ? "" : "s"}</strong>
              <small>{formatNumber(game.runFlux)} / {formatNumber(RECALIBRATION_THRESHOLD)} run Flux</small>
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
        </div>

        {fabricationUnlocked && (
        <section className={`panel machine-panel mobile-section ${mobileTab === "machines" ? "is-mobile-active" : ""} ${currentTour?.target === "fabrication" ? "tour-focus" : ""}`}>
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

        {(systemsUnlocked || protocolsUnlocked || game.lifetimeAxioms > 0) && (
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
                <span>The Ark has solved the mechanical problem. Departure still requires infrastructure, research, supplies, crisis resolution, and a viable founding population.</span>
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

          {game.lifetimeAxioms > 0 && (
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

          {game.lifetimeAxioms > 0 && (
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
      </>
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
        <div className="archive-layer">
          <button className="modal-backdrop" type="button" aria-label="Close lore archive" onClick={() => setLoreOpen(false)} />
          <section className="lore-archive" role="dialog" aria-modal="true" aria-labelledby="archive-title">
            <header>
              <div>
                <p className="section-kicker violet">AXIOM memory vault</p>
                <h2 id="archive-title">The Axiom Archive</h2>
                <span>A record of the Ark, its survivors, restored colonies, Null research, and the orders AXIOM was never meant to question.</span>
              </div>
              <button className="archive-close" type="button" aria-label="Close lore archive" onClick={() => setLoreOpen(false)}>Close</button>
            </header>
            <div className="archive-scroll">
              <section className="archive-prologue">
                <p>You awakened alone. The Archive remembers otherwise.</p>
                <span>The Null is stripping agreement from gravity, light, memory, and history. The Ark can restore worlds, but its Continuity Protocol may be deciding which version of humanity is permitted to survive.</span>
              </section>
              <div className="lore-grid">
                {LORE_ENTRIES.map((entry, index) => (
                  <article key={entry.title}>
                    <span>Archive {String(index + 1).padStart(2, "0")} · {entry.tag}</span>
                    <h3>{entry.title}</h3>
                    {entry.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </article>
                ))}
              </div>
              <section className="archive-prologue mystery-index">
                <p>Contradiction index // {discoveredFragments.length} of {DISCOVERY_FRAGMENTS.length}</p>
                <span>
                  These records were not part of AXIOM&apos;s bootstrap archive. New fragments appear through survivor histories, Null research, colony transmissions, and Archive cross-indexing.
                </span>
                {nextArchiveDiscovery && (
                  <button className="tour-next" type="button" onClick={handleArchiveInvestigation}>
                    Cross-index: {nextArchiveDiscovery.title}
                  </button>
                )}
              </section>
              {discoveredFragments.length > 0 && (
                <div className="lore-grid mystery-grid">
                  {discoveredFragments.map((fragment, index) => (
                    <article key={fragment.id}>
                      <span>Recovered {String(index + 1).padStart(2, "0")} · {fragment.arc.replaceAll("-", " ")}</span>
                      <h3>{fragment.title}</h3>
                      <small>{fragment.source}</small>
                      {fragment.excerpt.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      {fragment.contradiction && <p><strong>Contradiction:</strong> {fragment.contradiction}</p>}
                    </article>
                  ))}
                </div>
              )}
              <section className="planetary-ledger">
                <div className="ledger-heading">
                  <div><p className="section-kicker">Continuity record</p><h3>Restored Worlds</h3></div>
                  <span>{game.missions.worldsSaved} secured · {Math.max(0, MISSIONS.length - game.missions.worldsSaved)} remaining</span>
                </div>
                <div className="ledger-worlds">
                  {MISSIONS.map((mission, index) => {
                    const status = game.missions.statuses[index];
                    const label = status === "saved" ? "World secured" : status === "active" ? "Signal active" : "Signal pending";
                    return (
                      <article className={status} key={mission.world}>
                        <span>{label}</span>
                        <strong>{mission.world}</strong>
                        <small>
                          {status === "saved"
                            ? mission.success
                            : status === "active"
                              ? `${mission.hazardLabel}: ${mission.hazard}`
                              : mission.epithet}
                        </small>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
            <footer>
              <button className="quiet-button" type="button" onClick={replayTour}>Replay field orientation</button>
              <button className="tour-next" type="button" onClick={() => setLoreOpen(false)}>Return to Foundry</button>
            </footer>
          </section>
        </div>
      )}

      {primaryView === "engineering" && (
      <nav className="mobile-nav" aria-label="Game sections">
        {engineeringMobileTabs.map(([value, label]) => (
          <button key={value} type="button" className={mobileTab === value ? "active" : ""} aria-pressed={mobileTab === value} onClick={() => setMobileTab(value)}>
            <span aria-hidden="true">{value === "machines" ? "II" : value === "core" ? "◇" : value === "systems" ? "≡" : "A"}</span>
            {label}
            {value === "recalibrate" && recalibrationGain > 0 && <i aria-label="Recalibration available" />}
          </button>
        ))}
      </nav>
      )}
    </main>
  );
}
