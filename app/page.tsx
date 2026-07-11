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
  acknowledgeNextMission,
  buyLegacyUpgrade,
  buyRunUpgrade,
  buyTier,
  contributeToMission,
  createInitialState,
  formatDuration,
  formatNumber,
  getCampaignWorldIndex,
  getLegacyUpgradeCost,
  getManualGain,
  getMissionProgress,
  getMissionStageProgress,
  getOfflineCapHours,
  getProductionSnapshot,
  getPurchaseQuantity,
  getRecalibrationGain,
  getRunUpgradeCost,
  getTierCost,
  getWorldEffects,
  isTierUnlocked,
  pulseCore,
  recalibrate,
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
import FoundryDeck from "./foundry-deck";
import {
  addDiscovery,
  getChosenDoctrine,
  getCrewTransmission,
  getDiscoveredFragments,
  getDoctrineAvailability,
  getNextArchiveDiscovery,
  getNextRoomDiscovery,
  syncAutomaticDiscoveries,
} from "./discovery-engine";
import {
  DISCOVERY_FRAGMENTS,
  type DoctrineId,
  type ExpeditionId,
  type RoomId,
} from "./discovery-content";
import {
  assignCrew,
  chooseDoctrine,
  claimExpedition,
  getCrewDefinition,
  grantLivingFoundryRewards,
  launchExpedition,
  renameCrew,
  renameFoundry,
  upgradeRoom,
} from "./living-foundry-engine";
import { LORE_ENTRIES, TOUR_STEPS } from "./story-content";

type MobileTab = "core" | "machines" | "systems" | "recalibrate";
type PrimaryView = "deck" | "engineering";

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
      label: "Planetfall route ready",
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
            "New planetary charts loaded. Your permanent progress survived, and the expanded Helion campaign is ready.",
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
    } else if (target === "fabrication") {
      setPrimaryView("engineering");
      setMobileTab("machines");
    }
    else if (target === "research" || target === "missions") {
      setPrimaryView("engineering");
      setMobileTab("systems");
    } else if (target === "recalibration") {
      setPrimaryView("engineering");
      setMobileTab("recalibrate");
    } else {
      setPrimaryView("engineering");
      setMobileTab("core");
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
  const investigableRoomIds = useMemo(
    () =>
      game.living.rooms
        .filter(
          (room) =>
            room.unlocked &&
            Boolean(
              getNextRoomDiscovery(
                game.living.discoveredLore,
                room.id,
                room.level,
              ),
            ),
        )
        .map((room) => room.id),
    [game.living.discoveredLore, game.living.rooms],
  );
  const crewTransmission = useMemo(
    () =>
      getCrewTransmission(
        game.living.discoveredLore,
        game.missions.worldsSaved,
        game.living.crew
          .filter((crew) => crew.unlocked)
          .map((crew) => ({
            homeworld: getCrewDefinition(crew.id)?.homeworld ?? "foundry",
            assignedRoomId: crew.assignedRoomId,
          })),
        Math.floor(game.playTime / 30),
      ),
    [
      game.living.crew,
      game.living.discoveredLore,
      game.missions.worldsSaved,
      game.playTime,
    ],
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
  const lastResolvedMission =
    game.missions.currentIndex > 0
      ? MISSIONS[game.missions.currentIndex - 1]
      : null;
  const firstLockedGenerator = GENERATORS.findIndex(
    (_, index) => !isTierUnlocked(game, index),
  );
  const visibleGeneratorCount =
    firstLockedGenerator === -1
      ? GENERATORS.length
      : Math.min(GENERATORS.length, firstLockedGenerator + 1);

  useEffect(() => {
    if (!ready) return;
    const signature = `${game.missions.currentIndex}:${game.missions.awaitingAcknowledgement}:${game.missions.worldsSaved}`;
    if (
      missionSignatureRef.current &&
      signature !== missionSignatureRef.current &&
      lastResolvedMission
    ) {
      setAnnouncement(
        `${lastResolvedMission.world} secured. Its relic is online, and a Stellar Relay now shields future planetfalls.`,
      );
    }
    missionSignatureRef.current = signature;
  }, [
    game.missions.awaitingAcknowledgement,
    game.missions.currentIndex,
    game.missions.worldsSaved,
    lastResolvedMission,
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
    setConfirmReset(false);
    setAnnouncement("The Foundry has been reset to Cycle 1.");
    setSaveStatus("Fresh local save started");
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

  const handleRenameFoundry = (name: string) => {
    commitLivingChange(
      (living) => renameFoundry(living, name),
      `Foundry registry updated to ${name.trim()}.`,
    );
  };

  const handleAssignCrew = (crewId: string, roomId: RoomId | null) => {
    const crewName = getCrewDefinition(crewId)?.canonicalName ?? "Crew member";
    commitLivingChange(
      (living) => assignCrew(living, crewId, roomId),
      roomId
        ? `${crewName} assigned to ${roomId.replaceAll("-", " ")}.`
        : `${crewName} released from room duty.`,
    );
  };

  const handleRenameCallsign = (crewId: string, callsign: string) => {
    const crewName = getCrewDefinition(crewId)?.canonicalName ?? "Crew member";
    commitLivingChange(
      (living) => renameCrew(living, crewId, callsign),
      `${crewName} now answers to ${callsign.trim()}.`,
    );
  };

  const handleUpgradeRoom = (roomId: RoomId) => {
    commitLivingChange(
      (living) => upgradeRoom(living, roomId),
      `${roomId.replaceAll("-", " ")} awakened one level.`,
    );
  };

  const handleLaunchExpedition = (
    expeditionId: ExpeditionId,
    crewIds: readonly string[],
  ) => {
    commitLivingChange(
      (living, current) =>
        launchExpedition(
          living,
          expeditionId,
          crewIds,
          current.missions.worldsSaved,
          Date.now(),
        ),
      `Expedition ${expeditionId} launched. Its return can be claimed whenever you come back.`,
    );
  };

  const handleClaimExpedition = () => {
    const expedition = gameRef.current.living.activeExpedition;
    if (!expedition) return;
    commitLivingChange(
      (living) => claimExpedition(living, Date.now()),
      `Expedition returned with ${formatNumber(expedition.rewardSalvage)} Salvage and a recovered record.`,
    );
  };

  const handleInvestigateRoom = (roomId: RoomId) => {
    const current = gameRef.current;
    const room = current.living.rooms.find((candidate) => candidate.id === roomId);
    const fragment = room
      ? getNextRoomDiscovery(
          current.living.discoveredLore,
          roomId,
          room.level,
        )
      : null;
    if (!fragment) {
      setAnnouncement("This room has no readable contradiction yet.");
      return;
    }
    commitLivingChange(
      (living) =>
        grantLivingFoundryRewards(living, {
          salvage: 5,
          loreIds: addDiscovery(living.discoveredLore, fragment.id),
        }),
      `Recovered record: ${fragment.title}.`,
    );
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
      "Orientation complete. Helion's rescue operation is ready whenever you are.",
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

  const acknowledgeMission = () => {
    const next = acknowledgeNextMission(gameRef.current);
    gameRef.current = next;
    setGame(next);
    setAnnouncement(
      MISSIONS[next.missions.currentIndex]
        ? `Planetfall at ${MISSIONS[next.missions.currentIndex].world}. Temporary machinery was translated into a landing cache; continue whenever you are ready.`
        : "The Sixfold Evacuation is complete.",
    );
    window.setTimeout(() => persistGame("Directive saved"), 0);
  };

  const updateMode = (mode: PurchaseMode) => {
    setGame((current) => setBuyMode(current, mode));
  };

  const currentTour = tourStep === null ? null : TOUR_STEPS[tourStep];

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
          <span aria-hidden="true">▦</span>
          Foundry Deck
        </button>
        <button
          className={primaryView === "engineering" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={primaryView === "engineering"}
          onClick={() => setPrimaryView("engineering")}
        >
          <span aria-hidden="true">◇</span>
          Engineering
        </button>
        <button
          type="button"
          onClick={() => {
            setPrimaryView("engineering");
            setMobileTab("systems");
            window.setTimeout(
              () =>
                document
                  .getElementById("planetary-directives")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              0,
            );
          }}
        >
          <span aria-hidden="true">◎</span>
          Directives
        </button>
        <button type="button" onClick={() => setLoreOpen(true)}>
          <span aria-hidden="true">≡</span>
          Archive {discoveredFragments.length}/{DISCOVERY_FRAGMENTS.length}
        </button>
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
        <FoundryDeck
          state={game.living}
          worldsSaved={game.missions.worldsSaved}
          currentWorld={campaignWorldIndex}
          now={clockNow || game.lastSaved}
          onRenameFoundry={handleRenameFoundry}
          onAssignCrew={handleAssignCrew}
          onRenameCallsign={handleRenameCallsign}
          onUpgradeRoom={handleUpgradeRoom}
          onLaunchExpedition={handleLaunchExpedition}
          onClaimExpedition={handleClaimExpedition}
          investigationLabel={
            investigableRoomIds.length > 0
              ? "Investigate contradictory room records"
              : null
          }
          investigableRoomIds={investigableRoomIds}
          onInvestigateRoom={handleInvestigateRoom}
          transmission={crewTransmission}
          onOpenEngineeringConsole={() => setPrimaryView("engineering")}
          onOpenArchive={() => setLoreOpen(true)}
        />
      ) : (
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

            <div className="core-stage">
              <div className="core-orbit core-orbit-outer" aria-hidden="true">
                <span className="orbit-node node-one" />
                <span className="orbit-node node-two" />
              </div>
              <div className="core-orbit core-orbit-inner" aria-hidden="true" />
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

          <section className={`panel recalibration-panel mobile-section ${mobileTab === "recalibrate" ? "is-mobile-active" : ""} ${currentTour?.target === "recalibration" ? "tour-focus" : ""}`}>
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
        </div>

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

          <FoundryVista game={game} />

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

        <aside className={`systems-column mobile-section ${mobileTab === "systems" ? "is-mobile-active" : ""}`}>
          <section id="planetary-directives" className={`panel mission-panel ${currentTour?.target === "missions" ? "tour-focus" : ""}`}>
            <div className="panel-heading mission-heading">
              <div>
                <p className="section-kicker danger-text">Planetfall campaign</p>
                <h2>Planetary Directives</h2>
              </div>
              <button className="archive-button" type="button" onClick={() => setLoreOpen(true)}>Archive</button>
            </div>

            {game.missions.awaitingAcknowledgement && lastResolvedMission ? (
              <div className="mission-outcome saved">
                <p>World secured</p>
                <h3>{lastResolvedMission.world}</h3>
                <span>{lastResolvedMission.success} {lastResolvedMission.rewardLabel}.</span>
                {activeMission && (
                  <button type="button" onClick={acknowledgeMission}>
                    Travel to {activeMission.world}
                  </button>
                )}
                {activeMission && (
                  <small>Planetfall converts temporary machines and Run Research into a landing cache. Axioms, relics, relays, and blueprints survive.</small>
                )}
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
                    <p>The rescue is complete, but the recovered record does not support Lyra&apos;s original story. Choose what the Foundry carries into the next reality.</p>
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

          <section className={`panel upgrades-panel ${currentTour?.target === "research" ? "tour-focus" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-kicker brass">Current cycle</p>
                <h2>Run Research</h2>
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

          <section className="panel automation-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Cycle control</p>
                <h2>Foreman</h2>
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
                  <span><strong>Master Foreman</strong><small>Buys one affordable unit from each enabled tier every second.</small></span>
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
        </aside>
      </div>
      )}

      {currentTour && (
        <div className="tour-layer">
          <div className="tour-scrim" aria-hidden="true" />
          <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description">
            <div className="tour-speaker">
              <span aria-hidden="true">L</span>
              <div>
                <strong>Archivist Lyra</strong>
                <small>Foundry memory custodian</small>
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
                <button ref={tourActionRef} className="tour-next" type="button" onClick={advanceTour}>{tourStep === TOUR_STEPS.length - 1 ? "Begin rescues" : "Next"}</button>
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
                <p className="section-kicker violet">Concordance memory vault</p>
                <h2 id="archive-title">The Axiom Archive</h2>
                <span>A field guide to the Null Tide, Planetfall protocol, recovered relics, and every world changed by your decisions.</span>
              </div>
              <button className="archive-close" type="button" aria-label="Close lore archive" onClick={() => setLoreOpen(false)}>Close</button>
            </header>
            <div className="archive-scroll">
              <section className="archive-prologue">
                <p>The universe is not dying. It is forgetting how to exist.</p>
                <span>A wave called the Null Tide is stripping gravity, light, and time from one star system after another. The Axiom Foundry is the last machine capable of forging stable laws and carrying them between worlds.</span>
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
                  These records were not part of Lyra&apos;s approved briefing. New fragments appear through rescued worlds, staffed rooms, Archive cross-indexing, and expeditions.
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
                  <div><p className="section-kicker">Rescue record</p><h3>Planetary Ledger</h3></div>
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
        {([
          ["machines", "Machines"],
          ["core", "Core"],
          ["systems", "Systems"],
          ["recalibrate", "Recalibrate"],
        ] as Array<[MobileTab, string]>).map(([value, label]) => (
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
