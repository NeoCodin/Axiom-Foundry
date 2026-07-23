"use client";

import { type CSSProperties } from "react";
import {
  BeaconReadinessList,
} from "./beacon-readiness";
import type { BeaconReadiness } from "./beacon-readiness-engine";
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
  unlockedViews: readonly ArkViewId[];
  coldWakeCommissioning?: {
    active: boolean;
    navigationRestored: boolean;
    lifeSupportRestored: boolean;
    actionLabel: string;
    canAct: boolean;
  } | null;
  supportUpgradeCosts?: Partial<Record<LifeSupportKey, number>>;
  onCommission?: () => void;
  onUpgradeSupport?: (key: LifeSupportKey) => void;
  onOpenView: (view: ArkViewId) => void;
};

type ArkRoom = {
  id: ArkViewId | "core";
  code: string;
  label: string;
  sublabel: string;
  kind: string;
  online: boolean;
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
  unlockedViews,
  coldWakeCommissioning = null,
  supportUpgradeCosts,
  onCommission,
  onUpgradeSupport,
  onOpenView,
}: ArkDeckProps) {
  const beaconAvailable = beaconReadiness.ready;
  const normalizedWorldProgress = clamp(worldProgress);
  const normalizedResearchProgress = clamp(researchProgress);
  const normalizedSettlement = clamp(settlementScore / 100) * 100;
  const occupiedDots = Math.min(8, Math.max(0, population));
  const fluxValue = numericLabelValue(fluxLabel);
  const recoveredMaterialsValue = numericLabelValue(salvageLabel);
  const researchRate = numericLabelValue(researchThroughput);
  const roomRatio = clamp(onlineRoomCount / Math.max(1, totalRoomCount));
  const worldSlug = worldName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");

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
  const berthPodCount = Math.min(10, 1 + berthSections);
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
  const shipStyle = {
    "--ark-world-progress": normalizedWorldProgress,
    "--ark-occupancy": clamp(population / Math.max(1, populationCapacity)),
    "--ark-core-energy": coreEnergy,
    "--ark-core-duration": `${coreDuration}s`,
    "--ark-research-duration": `${researchDuration}s`,
    "--ark-room-ratio": roomRatio,
  } as CSSProperties;

  const rooms: ArkRoom[] = [
    {
      id: "engineering",
      code: "02",
      label: "Fabrication",
      sublabel: fabricationOnline ? `${fluxPerSecondLabel}/sec routed` : "No repeating pattern",
      kind: "fabrication",
      online: fabricationOnline,
    },
    {
      id: "population",
      code: "03",
      label: "Life Support",
      sublabel: supportOnline ? `${population}/${populationCapacity} safely supported` : "Atmosphere absent",
      kind: "support",
      online: supportOnline,
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
    },
    {
      id: "research",
      code: "05",
      label: "Analysis Core",
      sublabel: researchProject ?? "Lattice unconfigured",
      kind: "research",
      online: researchOnline,
    },
    {
      id: "population",
      code: "06",
      label: "Learning Deck",
      sublabel: crew.some((member) => member.training) ? "Instruction in progress" : "No active curriculum",
      kind: "education",
      online: educationOnline,
    },
    {
      id: "settlement",
      code: "07",
      label: "Continuity Bridge",
      sublabel: settlementReady ? "World release authorized" : "Forecast in progress",
      kind: "bridge",
      online: continuityOnline,
    },
  ];

  return (
    <section className={`ark-command-deck fabrication-depth-${Math.min(6, fabricationDepth)} ${fabricationIntensity >= 150 ? "core-phase-locked" : ""}`} style={shipStyle} aria-labelledby="ark-command-title">
      <header className="ark-command-heading">
        <div className="ark-ai-identity">
          <span className="ark-ai-eye" aria-hidden="true"><i /></span>
          <div>
            <p>AXIOM // CARETAKER INTELLIGENCE</p>
            <h2 id="ark-command-title">{foundryName}</h2>
            <span>Biological command authority: {population > 0 ? "advisory" : "absent"}</span>
          </div>
        </div>
        <div className="ark-heading-metrics" aria-label="Ark status">
          <div><span>Population aboard</span><strong>{population}/{populationCapacity}</strong></div>
        </div>
      </header>

      <section className="ark-visual-stage" data-guide-target="ark-visual" data-world={worldSlug} aria-label={`The Ark approaching ${worldName}`}>
        <div className="ark-space" aria-hidden="true">
          <span className="ark-star-field ark-star-field-near" />
          <span className="ark-star-field ark-star-field-far" />
          <span className="ark-route-line" />
          <span className={`ark-sos-wave ${beaconOnline ? "is-live" : ""}`}><i /><i /><i /></span>
        </div>

        <div className="ark-theater-caption">
          <span>PLANETARY THEATER // LIVE</span>
          <strong>{worldName}</strong>
          <p>{worldSubtitle}</p>
          <small><i aria-hidden="true" /> ORBITAL FEED LOCKED</small>
        </div>

        <div className="ark-target-world" aria-hidden="true">
          <span className="ark-world-atmosphere" />
          <span className="ark-world-surface" />
          <span className="ark-world-clouds" />
          <span className="ark-world-night" />
          <span className="ark-world-pixels"><i /><i /><i /><i /><i /></span>
          <span className="ark-world-orbit ark-world-orbit-one" />
          <span className="ark-world-orbit ark-world-orbit-two" />
          <span className="ark-world-marker">{Math.round(normalizedWorldProgress * 100)}%</span>
        </div>

        <div className="ark-ship" aria-label={`${onlineRoomCount} of ${totalRoomCount} Ark rooms online`}>
          <span className="ark-engine-plume" aria-hidden="true"><i /><i /><i /></span>
          <span className="ark-hull-top" aria-hidden="true" />
          <span className="ark-hull-keel" aria-hidden="true" />
          <span className="ark-bow" aria-hidden="true" />
          <span className="ark-dorsal-fin" aria-hidden="true" />
          <span className="ark-ship-nameplate">ARK // ITERATION 44</span>

          <div className="ark-core-bay">
            <div
              className="ark-core-engine is-readonly"
              aria-label={`Axiom Chamber monitor: ${fluxLabel} Flux stored and ${fluxPerSecondLabel} Flux per second routed through the Foundry`}
            >
              <span className="ark-core-orbit ark-core-orbit-one" aria-hidden="true"><i /><i /><i /></span>
              <span className="ark-core-orbit ark-core-orbit-two" aria-hidden="true"><i /><i /><i /><i /></span>
              <span className="ark-core-aperture" aria-hidden="true"><i /></span>
              <span className="ark-core-evolution" aria-hidden="true">
                {Array.from({ length: 24 }, (_, index) => <i className={index < Math.min(24, fabricationIntensity) ? "is-live" : ""} key={index} />)}
              </span>
              {fabricationDepth >= 2 && <span className="ark-core-phase-arc" aria-hidden="true"><i /><i /></span>}
              {fabricationDepth >= 3 && <span className="ark-core-lattice" aria-hidden="true"><i /><i /><i /></span>}
              <span className="ark-core-copy">
                <small>AXIOM CHAMBER</small>
                <strong>{fluxLabel}</strong>
                <em>{fluxPerSecondLabel}/sec</em>
              </span>
            </div>
            <span className="ark-core-instruction">Foundry output monitor</span>
          </div>

          <div className="ark-hull-frame">
            <div className="ark-room-grid">
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
                return (
                <button
                  className={`ark-room ark-room-${room.kind} ${roomState} ${commissioningRoom ? "is-commissioning" : ""}`}
                  data-room={room.id}
                  data-kind={room.kind}
                  data-guide-target={commissioningRoom ? "ark-commissioning-room" : undefined}
                  key={`${room.code}-${room.label}`}
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
                  <span className="ark-room-status" aria-hidden="true" />
                  <span className="ark-room-code">DECK {room.code}</span>
                  <strong>{room.label}</strong>
                  <small>{commissioningRoom
                    ? coldWakeCommissioning.canAct
                      ? coldWakeCommissioning.actionLabel
                      : "Produce Flux in the Foundry"
                    : room.online ? room.sublabel : "Awakens later"}</small>
                  {commissioningRoom && <em className="ark-room-commissioning-label">COMMISSION</em>}

                  <span className="ark-room-scene" aria-hidden="true">
                    <i /><i /><i /><i /><i /><i />
                  </span>

                  {room.kind === "research" && (
                    <span className="ark-mini-lattice" aria-hidden="true">
                      <i /><i /><i /><i /><i />
                      <b /><b /><b />
                    </span>
                  )}

                  {(room.kind === "habitation" || room.kind === "education") && room.online && (
                    <span className="ark-room-people" aria-hidden="true">
                      {Array.from({ length: Math.min(6, occupiedDots) }, (_, index) => <i key={index} />)}
                    </span>
                  )}

                  {room.kind === "habitation" && room.online && (
                    <span className="ark-berth-pods" aria-hidden="true">
                      {Array.from({ length: berthPodCount }, (_, index) => <i key={index} />)}
                      {berthConstructionProgress !== null && berthPodCount < 10 && (
                        <i className="is-under-construction" style={{ "--berth-progress": berthConstructionProgress } as CSSProperties} />
                      )}
                    </span>
                  )}
                </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="ark-screen-reader-status" aria-live="polite" />
      </section>

      {(fullBeaconPanel || compactBeaconPanel || researchUnlocked || settlementUnlocked) ? (
        <div className="ark-awakened-systems">
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

          {researchUnlocked && (
            <section className="ark-system-bay ark-research-card">
              <div className="ark-bay-visual ark-lattice-visual" aria-hidden="true">
                <span className="ark-lattice-core"><i /></span>
                <span className="ark-lattice-node ark-node-one" />
                <span className="ark-lattice-node ark-node-two" />
                <span className="ark-lattice-node ark-node-three" />
                <span className="ark-lattice-node ark-node-four" />
                <b className="ark-lattice-path ark-path-one"><i /></b>
                <b className="ark-lattice-path ark-path-two"><i /></b>
                <b className="ark-lattice-path ark-path-three"><i /></b>
                <b className="ark-lattice-path ark-path-four"><i /></b>
              </div>
              <div className="ark-bay-content">
                <header><span>RESEARCH LATTICE</span><strong>{researchThroughput}</strong></header>
                <h3>{researchProject ?? "Analysis Core awaiting a project"}</h3>
                <div className="ark-inline-progress" role="progressbar" aria-label="Research progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedResearchProgress * 100)}>
                  <i style={{ width: `${normalizedResearchProgress * 100}%` }} />
                </div>
                <p>Every routed input accelerates the machine you can see.</p>
                <button type="button" onClick={() => onOpenView("research")}>Enter the Analysis Core</button>
              </div>
            </section>
          )}

          {settlementUnlocked && (
            <section className={`ark-system-bay ark-settlement-card ${settlementReady ? "is-ready" : ""}`}>
              <div className="ark-bay-visual ark-settlement-visual" aria-hidden="true">
                <span /><i /><i /><i /><b />
              </div>
              <div className="ark-bay-content">
                <header><span>PLANETARY CONTINUITY</span><strong>{Math.round(normalizedSettlement)}%</strong></header>
                <h3>{settlementReady ? "A world can continue without you" : "The Ark is still needed"}</h3>
                <div className="ark-inline-progress" role="progressbar" aria-label="Settlement viability" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedSettlement)}>
                  <i style={{ width: `${normalizedSettlement}%` }} />
                </div>
                <p>{settlementReady ? "Choose the founders who will remain and carry this world forward." : settlementDeficit ?? "Rescue, train, research, and supply the population."}</p>
                <button type="button" onClick={() => onOpenView("settlement")}>Open continuity forecast</button>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="ark-dormant-horizon" aria-label="Dormant Ark systems">
          <span aria-hidden="true"><i /><i /><i /><i /></span>
          <div><strong>The rest of the Ark is silent.</strong><small>Wake the chamber. The ship will reveal itself as it remembers.</small></div>
        </div>
      )}
    </section>
  );
}

export default ArkDeck;
