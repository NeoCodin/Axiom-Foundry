"use client";

import { lazy, Suspense, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  BeaconReadinessList,
} from "./beacon-readiness";
import { ArkCutaway, type ArkCutawayRoom, type ArkCutawayRoomKind } from "./ark-cutaway";
import { ArkPixelWorld } from "./ark-pixel-world";

/** The drone view loads three.js, so it is fetched only when someone opens it. */
const ArkWalk = lazy(() => import("./ark-walk"));
import type { BeaconReadiness } from "./beacon-readiness-engine";
import type { RoomId } from "./discovery-content";
import { getLawHeartSpectrum } from "./law-heart-particle-field";
import { getPulseProfile } from "./law-heart-pulse";
import type { LifeSupportKey } from "./survivor-engine";

export type ArkViewId =
  | "engineering"
  | "population"
  | "research"
  | "settlement";

export type ArkSupportReadout = {
  id: LifeSupportKey;
  label: string;
  value: number;
  capacity: number;
  status: string;
};

export type ArkCrewPreview = {
  id: string;
  name: string;
  role: string;
  level: number;
  training?: string | null;
  rarity: string;
  rarityLabel: string;
  rarityDescription: string;
};

export type ArkSignalPreview = {
  id: string;
  label: string;
  location: string;
  groupSize: number;
  roles: readonly string[];
  rescueCost: number;
  canRescue: boolean;
  blockedReason?: string | null;
  rare?: boolean;
};

export type ArkRoomReinforcement = {
  id: RoomId;
  name: string;
  level: number;
  maxLevel: number;
  effect: string;
  costLabel: string;
  canUpgrade: boolean;
};

export type ArkDeckProps = {
  foundryName: string;
  worldName: string;
  worldSubtitle: string;
  worldProgress: number;
  fluxLabel: string;
  fluxPerSecondLabel: string;
  population: number;
  populationCapacity: number;
  berthCapacity: number;
  berthSections: number;
  berthConstructionProgress: number | null;
  salvageLabel: string;
  support: readonly ArkSupportReadout[];
  crew: readonly ArkCrewPreview[];
  beaconReadiness: BeaconReadiness;
  beaconOnline: boolean;
  pendingSignal: ArkSignalPreview | null;
  researchProject: string | null;
  researchProgress: number;
  researchThroughput: string;
  settlementScore: number;
  settlementReady: boolean;
  settlementDeficit: string | null;
  onlineRoomCount: number;
  totalRoomCount: number;
  fabricationDepth: number;
  fabricationIntensity: number;
  lifetimeAxioms: number;
  transit?: {
    active: boolean;
    progress: number;
    originName: string;
    destinationName: string;
  } | null;
  unlockedViews: readonly ArkViewId[];
  coldWakeCommissioning?: {
    active: boolean;
    navigationRestored: boolean;
    lifeSupportRestored: boolean;
    actionLabel: string;
    canAct: boolean;
  } | null;
  roomReinforcements?: readonly ArkRoomReinforcement[];
  supportUpgradeCosts?: Partial<Record<LifeSupportKey, number>>;
  onCommission?: () => void;
  /** Striking the Law-Heart from the drone view. */
  onStrikeLawHeart?: () => void;
  /** The drone view's hangar opens Expeditions once they exist. */
  onOpenExpeditions?: () => void;
  onUpgradeSupport?: (key: LifeSupportKey) => void;
  onOpenView: (view: ArkViewId) => void;
};

type ArkRoom = {
  id: ArkViewId | "core";
  code: string;
  label: string;
  sublabel: string;
  kind: ArkCutawayRoomKind;
  online: boolean;
  reinforcementLevel: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));
}

function numericLabelValue(label: string) {
  const match = label.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const base = Number(match[0]);
  if (!Number.isFinite(base)) return 0;
  const suffix = label.slice((match.index ?? 0) + match[0].length).trim().toLowerCase();
  if (suffix.startsWith("k")) return base * 1_000;
  if (suffix.startsWith("m")) return base * 1_000_000;
  if (suffix.startsWith("b")) return base * 1_000_000_000;
  return base;
}

function ArkDeck({
  foundryName,
  worldName,
  worldSubtitle,
  worldProgress,
  fluxLabel,
  fluxPerSecondLabel,
  population,
  populationCapacity,
  berthCapacity,
  berthSections,
  berthConstructionProgress,
  salvageLabel,
  support,
  crew,
  beaconReadiness,
  beaconOnline,
  pendingSignal,
  researchProject,
  researchProgress,
  researchThroughput,
  settlementScore,
  settlementReady,
  settlementDeficit,
  onlineRoomCount,
  totalRoomCount,
  fabricationDepth,
  fabricationIntensity,
  lifetimeAxioms,
  transit = null,
  unlockedViews,
  coldWakeCommissioning = null,
  roomReinforcements = [],
  supportUpgradeCosts,
  onCommission,
  onStrikeLawHeart,
  onOpenExpeditions,
  onUpgradeSupport,
  onOpenView,
}: ArkDeckProps) {
  const [walkAccent, setWalkAccent] = useState<string | null>(null);
  const beaconAvailable = beaconReadiness.ready;
  const normalizedWorldProgress = clamp(worldProgress);
  const normalizedResearchProgress = clamp(researchProgress);
  const normalizedSettlement = clamp(settlementScore / 100) * 100;
  const fluxValue = numericLabelValue(fluxLabel);
  const recoveredMaterialsValue = numericLabelValue(salvageLabel);
  const researchRate = numericLabelValue(researchThroughput);
  const lawHeartSpectrum = getLawHeartSpectrum(lifetimeAxioms);
  const roomRatio = clamp(onlineRoomCount / Math.max(1, totalRoomCount));
  const worldSlug = worldName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");
  const transitActive = transit?.active === true;
  const transitProgress = clamp(transit?.progress ?? 0);

  const unlockedViewSet = new Set(unlockedViews);
  const isRoomAccessible = (room: ArkRoom) =>
    room.id !== "core" && unlockedViewSet.has(room.id);
  const engineeringUnlocked = unlockedViewSet.has("engineering");
  const populationUnlocked = unlockedViewSet.has("population");
  const researchUnlocked = unlockedViewSet.has("research");
  const settlementUnlocked = unlockedViewSet.has("settlement");

  const fabricationOnline = engineeringUnlocked;
  const earlyPelagosHabitability = worldName === "Pelagos" && population === 0;
  const pelagosFirstContact = worldName === "Pelagos" && population === 0;
  const firstContactSupportMissing = pelagosFirstContact && support.some((system) => system.capacity < 2);
  const supportOnline =
    populationUnlocked ||
    earlyPelagosHabitability ||
    coldWakeCommissioning?.lifeSupportRestored === true;
  const habitationOnline = populationUnlocked;
  const researchOnline = researchUnlocked;
  const educationOnline = populationUnlocked && crew.length > 0;
  const fullBeaconPanel = pelagosFirstContact || pendingSignal !== null;
  const compactBeaconPanel = beaconOnline && !fullBeaconPanel;
  const continuityOnline =
    settlementUnlocked &&
    (!coldWakeCommissioning?.active || coldWakeCommissioning.navigationRestored);
  const coreEnergy = clamp(0.14 + normalizedWorldProgress * 0.34 + roomRatio * 0.38 + Math.min(0.14, fluxValue / 2_000));
  const coreDuration = 3.9 - coreEnergy * 2.85;
  const researchDuration = clamp(7.5 / (1 + researchRate * 0.35 + normalizedResearchProgress * 2.5), 0.65, 7.5);
  const reinforcementLevel = (...ids: RoomId[]) =>
    roomReinforcements
      .filter((room) => ids.includes(room.id))
      .reduce((maximum, room) => Math.max(maximum, room.level), 0);
  const totalReinforcement = roomReinforcements.reduce((total, room) => total + room.level, 0);
  const shipStyle = {
    "--ark-world-progress": normalizedWorldProgress,
    "--ark-occupancy": clamp(population / Math.max(1, populationCapacity)),
    "--ark-core-energy": coreEnergy,
    "--ark-core-duration": `${coreDuration}s`,
    "--ark-research-duration": `${researchDuration}s`,
    "--ark-room-ratio": roomRatio,
    "--ark-transit-progress": transitProgress,
    "--ark-transit-progress-width": `${transitProgress * 100}%`,
    "--ark-reinforcement": clamp(totalReinforcement / 24),
    "--ark-drive-opacity": 0.22 + coreEnergy * 0.76,
    "--ark-drive-width": `${54 + coreEnergy * 46}%`,
    "--ark-drive-duration": `${0.38 + (1 - coreEnergy) * 0.54}s`,
    "--ark-spine-opacity": 0.18 + coreEnergy * 0.52,
    "--ark-transit-world-opacity": 0.18 + transitProgress * 0.58,
    "--ark-transit-world-scale": 0.58 + transitProgress * 0.34,
    "--ark-power-core": lawHeartSpectrum.core,
    "--ark-power-surface": lawHeartSpectrum.surface,
    "--ark-power-bright": lawHeartSpectrum.surfaceBright,
    "--ark-power-limb": lawHeartSpectrum.limb,
    "--ark-power-corona-a": lawHeartSpectrum.corona[0] ?? lawHeartSpectrum.surface,
    "--ark-power-corona-b": lawHeartSpectrum.corona[1] ?? lawHeartSpectrum.limb,
  } as CSSProperties;

  const rooms: ArkRoom[] = [
    {
      id: "engineering",
      code: "02",
      label: "Fabrication",
      sublabel: fabricationOnline ? `${fluxPerSecondLabel}/sec routed` : "No repeating pattern",
      kind: "fabrication",
      online: fabricationOnline,
      reinforcementLevel: reinforcementLevel("fabrication-floor", "axiom-chamber"),
    },
    {
      id: "population",
      code: "03",
      label: "Life Support",
      sublabel: supportOnline ? `${population}/${populationCapacity} safely supported` : "Atmosphere absent",
      kind: "support",
      online: supportOnline,
      reinforcementLevel: reinforcementLevel("axiom-chamber"),
    },
    {
      id: "population",
      code: "04",
      label: "Habitation Ring",
      sublabel: habitationOnline
        ? berthConstructionProgress !== null
          ? `${population}/${berthCapacity} quarters · section ${Math.round(berthConstructionProgress * 100)}% built`
          : `${population}/${berthCapacity} quarters across ${berthSections + 1} sections`
        : "Empty bunks, cold glass",
      kind: "habitation",
      online: habitationOnline,
      reinforcementLevel: reinforcementLevel("axiom-chamber"),
    },
    {
      id: "research",
      code: "05",
      label: "Analysis Core",
      sublabel: researchProject
        ? `${researchProject} · ${Math.round(normalizedResearchProgress * 100)}%`
        : "Lattice unconfigured",
      kind: "research",
      online: researchOnline,
      reinforcementLevel: reinforcementLevel("research-observatory"),
    },
    {
      id: "population",
      code: "06",
      label: "Learning Deck",
      sublabel: crew.some((member) => member.training) ? "Instruction in progress" : "No active curriculum",
      kind: "education",
      online: educationOnline,
      reinforcementLevel: reinforcementLevel("memory-archive"),
    },
    {
      id: "settlement",
      code: "07",
      label: "Continuity Bridge",
      sublabel: settlementReady
        ? "World release authorized"
        : settlementDeficit ?? `${Math.round(normalizedSettlement)}% viability`,
      kind: "bridge",
      online: continuityOnline,
      reinforcementLevel: reinforcementLevel("planetfall-bridge"),
    },
  ];

  const cutawayRooms: ArkCutawayRoom[] = rooms.map((room) => {
    const commissioningRoom = coldWakeCommissioning?.active === true && (
      (!coldWakeCommissioning.navigationRestored && room.kind === "bridge") ||
      (coldWakeCommissioning.navigationRestored && !coldWakeCommissioning.lifeSupportRestored && room.kind === "support")
    );
    const roomAccessible = room.online && isRoomAccessible(room);
    return {
      key: `${room.code}-${room.label}`,
      kind: room.kind,
      label: room.label,
      sublabel: commissioningRoom
        ? coldWakeCommissioning.canAct
          ? coldWakeCommissioning.actionLabel
          : "Produce Flux in the Foundry"
        : room.online ? room.sublabel : "Dormant",
      online: room.online || commissioningRoom,
      commissioning: commissioningRoom,
      interactive: commissioningRoom
        ? Boolean(onCommission) && coldWakeCommissioning.canAct
        : roomAccessible,
      ariaLabel: commissioningRoom
        ? coldWakeCommissioning.canAct
          ? `${coldWakeCommissioning.actionLabel} into ${room.label}`
          : `${room.label} is awaiting available Flux`
        : roomAccessible
          ? `Open ${room.label}`
          : `${room.label} is not yet available`,
      guideTarget: commissioningRoom
        ? "ark-commissioning-room"
        : room.kind === "support"
          ? "ark-room-support"
          : undefined,
      mark: room.reinforcementLevel,
      onActivate: () => {
        if (commissioningRoom) {
          onCommission?.();
          return;
        }
        if (room.id !== "core" && roomAccessible) onOpenView(room.id);
      },
    };
  });
  const cutawaySignal = pendingSignal ? {
    label: pendingSignal.label,
    detail: `${pendingSignal.groupSize} life signs · ${pendingSignal.location}`,
    onOpen: populationUnlocked ? () => onOpenView("population") : undefined,
  } : null;

  const cutawayProps = {
    rooms: cutawayRooms,
    crew,
    heart: {
      name: lawHeartSpectrum.name,
      core: lawHeartSpectrum.core,
      surface: lawHeartSpectrum.surface,
      bright: lawHeartSpectrum.surfaceBright,
      limb: lawHeartSpectrum.limb,
      rateLabel: `${fluxPerSecondLabel}/s`,
    },
    beatPeriodMs: getPulseProfile(lifetimeAxioms).periodMs,
    beaconOnline,
    signal: cutawaySignal,
    worldGlass: "var(--world-accent, #5fd39a)",
    transit: transitActive,
    driveEnergy: coreEnergy,
    onOpenCrew: populationUnlocked ? () => onOpenView("population") : undefined,
  };

  return (
    <section
      className={`ark-command-deck ark-command-deck-v2 ark-command-deck-v3 fabrication-depth-${Math.min(6, fabricationDepth)} ${fabricationIntensity >= 150 ? "core-phase-locked" : ""} ${transitActive ? "is-in-transit" : "is-in-orbit"}`}
      style={shipStyle}
      aria-labelledby="ark-command-title"
    >
      <header className="ark-command-heading">
        <div className="ark-ai-identity">
          <span className="ark-ai-eye" aria-hidden="true"><i /></span>
          <div>
            <p>ARK COMMAND · CARETAKER VIEW</p>
            <h2 id="ark-command-title">{foundryName}</h2>
            <span>{transitActive ? `${transit?.originName} → ${transit?.destinationName}` : `${worldName} orbital watch`}</span>
          </div>
        </div>
        <div className="ark-heading-metrics" aria-label="Ark status">
          <div>
            <span>People aboard</span>
            <strong>{population}/{populationCapacity}</strong>
            <small>{population > 0 ? "life-signs stable" : "biological decks silent"}</small>
          </div>
        </div>
      </header>

      <section
        className="ark-visual-stage"
        data-guide-target="ark-visual"
        data-world={worldSlug}
        aria-label={transitActive
          ? `The Ark crossing deep space from ${transit?.originName} to ${transit?.destinationName}`
          : `The Ark in orbit around ${worldName}`}
      >
        <div className="ark-void" aria-hidden="true">
          <span className="ark-void-nebula" />
          <span className="ark-star-field ark-star-field-near" />
          <span className="ark-star-field ark-star-field-far" />
          <span className="ark-star-field ark-star-field-deep" />
          <span className="ark-flight-wake" />
          <span className={`ark-sos-wave ${beaconOnline ? "is-live" : ""}`}><i /><i /><i /></span>
          <span className="ark-void-particles">
            {Array.from({ length: 64 }, (_, index) => {
              const particleStyle = {
                "--particle-x": `${(index * 47 + 9) % 100}%`,
                "--particle-y": `${(index * 31 + 17) % 100}%`,
                "--particle-delay": `${-((index * 0.37) % 9).toFixed(2)}s`,
                "--particle-duration": `${6 + (index % 7) * 1.15}s`,
                "--particle-transit-duration": `${(6 + (index % 7) * 1.15) * 0.38}s`,
                "--particle-size": `${1 + (index % 4)}px`,
              } as CSSProperties;
              return <i key={index} style={particleStyle} />;
            })}
          </span>
        </div>

        <div className="ark-theater-caption">
          <span>{transitActive ? "NAVIGATION FEED · TRANSIT" : "ORBITAL FEED · LOCKED"}</span>
          <strong>{transitActive ? "DEEP-SPACE CORRIDOR" : worldName}</strong>
          <p>{transitActive
            ? `${transit?.originName} anchor released · ${transit?.destinationName} anchor unresolved`
            : worldSubtitle}</p>
          <small><i aria-hidden="true" /> {transitActive ? `${Math.round(transitProgress * 100)}% OF CROSSING COMPLETE` : `${Math.round(normalizedWorldProgress * 100)}% CONTINUITY READINESS`}</small>
        </div>

        {!transitActive && (
          <div className="ark-world-limb">
            <ArkPixelWorld
              worldName={worldName}
              progress={normalizedWorldProgress}
              transit={false}
            />
            <span className="ark-world-pixel-bracket" aria-hidden="true"><i /><i /><i /><i /></span>
            <em>ORBIT</em>
          </div>
        )}

        <button
          type="button"
          className="ark-walk-launch"
          onClick={() => {
            const shell = document.querySelector(".game-shell");
            setWalkAccent(shell ? getComputedStyle(shell).getPropertyValue("--world-accent").trim() || "#6a6290" : "#6a6290");
          }}
        >
          Walk the Ark
        </button>
        <ArkCutaway {...cutawayProps} />
        {walkAccent && createPortal(
          <Suspense fallback={<div className="ark-walk is-loading">Waking the drone…</div>}>
            <ArkWalk
              worldName={worldName}
              worldAccent={walkAccent}
              rooms={[
                ...cutawayRooms,
                {
                  kind: "hangar",
                  label: "Hangar",
                  online: true,
                  interactive: Boolean(onOpenExpeditions),
                  onActivate: () => onOpenExpeditions?.(),
                },
              ]}
              crew={crew}
              heart={{
                name: lawHeartSpectrum.name,
                core: lawHeartSpectrum.core,
                surface: lawHeartSpectrum.surface,
                bright: lawHeartSpectrum.surfaceBright,
              }}
              beatPeriodMs={getPulseProfile(lifetimeAxioms).periodMs}
              onStrike={onStrikeLawHeart}
              onClose={() => setWalkAccent(null)}
            />
          </Suspense>,
          document.querySelector(".game-shell") ?? document.body,
        )}

        {transitActive && (
          <div className="ark-transit-readout">
            <span>{transit?.originName}</span>
            <div><i /></div>
            <strong>{transit?.destinationName}</strong>
          </div>
        )}

        <p className="ark-screen-reader-status" aria-live="polite" />
      </section>

      {/* Phone-width alternative to the illustrated theater scene above: the
          same rooms, same unlock/commissioning logic, same onOpenView target,
          just presented as a plain tappable list instead of a diorama. Both
          trees render; a CSS media query (ark-deck.css) shows exactly one. */}
      <section className="ark-compartment-list" aria-label={`${onlineRoomCount} of ${totalRoomCount} Ark rooms online`}>
        <div className="ark-compartment-ship">
          <ArkCutaway {...cutawayProps} compact />
        </div>
        {rooms.map((room) => {
          const commissioningRoom = coldWakeCommissioning?.active === true && (
            (!coldWakeCommissioning.navigationRestored && room.kind === "bridge") ||
            (coldWakeCommissioning.navigationRestored && !coldWakeCommissioning.lifeSupportRestored && room.kind === "support")
          );
          const roomAccessible = room.online && isRoomAccessible(room);
          const roomInteractive = commissioningRoom
            ? Boolean(onCommission) && coldWakeCommissioning.canAct
            : roomAccessible;
          const roomState = room.online || commissioningRoom ? "is-online" : "is-dormant";
          const roomProgress =
            room.kind === "fabrication" ? coreEnergy :
            room.kind === "support" ? roomRatio :
            room.kind === "habitation" ? clamp(population / Math.max(1, berthCapacity)) :
            room.kind === "research" ? normalizedResearchProgress :
            room.kind === "education" ? clamp(crew.filter((member) => member.training).length / Math.max(1, crew.length)) :
            normalizedSettlement / 100;
          return (
            <button
              className={`ark-compartment-card ark-room-${room.kind} ${roomState} ${commissioningRoom ? "is-commissioning" : ""}`}
              data-room={room.id}
              data-kind={room.kind}
              key={`list-${room.code}-${room.label}`}
              type="button"
              onClick={() => {
                if (commissioningRoom) {
                  onCommission?.();
                  return;
                }
                if (room.id !== "core" && roomAccessible) onOpenView(room.id);
              }}
              disabled={!roomInteractive}
              aria-label={commissioningRoom
                ? coldWakeCommissioning.canAct
                  ? `${coldWakeCommissioning.actionLabel} into ${room.label}`
                  : `${room.label} is awaiting available Flux`
                : roomAccessible
                  ? `Open ${room.label}`
                  : `${room.label} is not yet available`}
            >
              <span className="ark-compartment-card-status" aria-hidden="true" />
              <span className="ark-compartment-card-code">DECK {room.code}</span>
              <strong>{room.label}</strong>
              <small>{commissioningRoom
                ? coldWakeCommissioning.canAct
                  ? coldWakeCommissioning.actionLabel
                  : "Produce Flux in the Foundry"
                : room.online ? room.sublabel : "Dormant outline"}</small>
              {room.reinforcementLevel > 0 && <em className="ark-room-mark">MARK {room.reinforcementLevel}</em>}
              {commissioningRoom && <em className="ark-room-commissioning-label">COMMISSION</em>}
              <span className="ark-compartment-card-meter" aria-hidden="true" style={{ "--room-progress": roomProgress } as CSSProperties}><i /></span>
            </button>
          );
        })}
      </section>

      {(fullBeaconPanel || compactBeaconPanel) ? (
        <div className="ark-operations-dock">
          {fullBeaconPanel && (
            <section className={`ark-system-bay ark-beacon-card ${beaconOnline ? "is-broadcasting" : ""}`} data-guide-target="ark-sos-array">
              <div className="ark-bay-visual ark-beacon-visual" aria-hidden="true">
                <span /><i /><i /><i />
              </div>
              <div className="ark-bay-content">
                <header><span>{worldName.toUpperCase()} SOS ARRAY</span><strong>{beaconOnline ? "Broadcasting" : "Waiting"}</strong></header>
                {!beaconOnline ? (
                  <>
                    <h3>No one can hear the Ark yet</h3>
                    <p>{pelagosFirstContact
                      ? beaconAvailable
                        ? "The receiver and habitat are ready. Authorize the broadcast from Continuity."
                        : "Restore the receiver through Continuity, then prepare every missing receiving-deck reserve below."
                      : "Ongoing rescue broadcasts are managed beside the people and life-support systems in Personnel."}</p>
                    <BeaconReadinessList
                      readiness={beaconReadiness}
                      renderAction={pelagosFirstContact ? (item) => {
                        if (item.ready || !onUpgradeSupport) return null;
                        const system = support.find((entry) => entry.id === item.id);
                        const cost = system ? supportUpgradeCosts?.[system.id] : undefined;
                        if (!system || cost === undefined || system.capacity >= 2) return null;
                        return (
                          <button
                            type="button"
                            disabled={recoveredMaterialsValue < cost}
                            onClick={() => onUpgradeSupport(system.id)}
                          >
                            Restore reserve · {cost} materials
                          </button>
                        );
                      } : undefined}
                    />
                    {firstContactSupportMissing && (
                      <div
                        className="ark-first-contact-materials"
                        data-pixel-tooltip="Recovered Materials are durable parts, tools, electronics, and structural stock that Flux cannot replace. Ark recovery continues while the game is closed."
                        tabIndex={0}
                      >
                        <span>Recovered materials</span>
                        <strong>{salvageLabel}</strong>
                        <small>Reclaimed automatically · Fabricators and Technicians improve recovery</small>
                      </div>
                    )}
                    <button type="button" onClick={() => onOpenView(pelagosFirstContact ? "settlement" : "population")}>{pelagosFirstContact ? "Open Continuity sequence" : "Open rescue operations"}</button>
                  </>
                ) : pendingSignal ? (
                  <article className="ark-signal-card">
                    <span>{pendingSignal.rare ? "PRIORITY SURVIVOR SIGNAL" : "SURVIVOR SIGNAL"}</span>
                    <h3>{pendingSignal.label}</h3>
                    <p>{pendingSignal.location} · {pendingSignal.groupSize} life signs</p>
                    <div>{pendingSignal.roles.map((role) => <small key={role}>{role}</small>)}</div>
                    <button type="button" onClick={() => onOpenView(populationUnlocked ? "population" : "settlement")}>
                      {populationUnlocked ? "Open rescue operations" : "Return to Continuity"}
                    </button>
                    {!pendingSignal.canRescue && <em>{pendingSignal.blockedReason ?? "Increase safe capacity first."}</em>}
                  </article>
                ) : (
                  <>
                    <h3>The dark is listening back</h3>
                    <p>Survivor signals remain available indefinitely once decoded.</p>
                  </>
                )}
              </div>
            </section>
          )}

          {compactBeaconPanel && (
            <section className="ark-system-bay ark-beacon-card is-broadcasting is-compact" data-guide-target="ark-sos-array">
              <div className="ark-bay-visual ark-beacon-visual" aria-hidden="true">
                <span /><i /><i /><i />
              </div>
              <div className="ark-bay-content">
                <header><span>SOS NETWORK</span><strong>Listening</strong></header>
                <h3>The carrier is running automatically</h3>
                <p>New survivor signals are decoded while the game is open or closed. Only an actionable signal expands this panel.</p>
                <button type="button" onClick={() => onOpenView(populationUnlocked ? "population" : "settlement")}>
                  {populationUnlocked ? "Open rescue operations" : "Open Continuity"}
                </button>
              </div>
            </section>
          )}

        </div>
      ) : (
        <div className="ark-dormant-horizon" aria-label="Dormant Ark systems">
          <span aria-hidden="true"><i /><i /><i /><i /></span>
          <div><strong>The Ark is listening.</strong><small>Operational rooms are shown inside the hull. Future systems illuminate only when their work becomes relevant.</small></div>
        </div>
      )}

    </section>
  );
}

export default ArkDeck;
