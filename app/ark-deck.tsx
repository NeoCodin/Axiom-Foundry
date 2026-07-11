"use client";

import type { CSSProperties } from "react";

export type ArkViewId =
  | "engineering"
  | "population"
  | "research"
  | "settlement";

export type ArkSupportReadout = {
  id: string;
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
  objectiveLabel: string;
  objectiveDetail: string;
  fluxLabel: string;
  fluxPerSecondLabel: string;
  manualGainLabel: string;
  population: number;
  populationCapacity: number;
  cohesion: number;
  salvageLabel: string;
  support: readonly ArkSupportReadout[];
  crew: readonly ArkCrewPreview[];
  beaconAvailable: boolean;
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
  onTuneCore: () => void;
  onActivateBeacon: () => void;
  onRescueSignal: (signalId: string) => void;
  onOpenView: (view: ArkViewId) => void;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));
}

function ArkDeck({
  foundryName,
  worldName,
  worldSubtitle,
  worldProgress,
  objectiveLabel,
  objectiveDetail,
  fluxLabel,
  fluxPerSecondLabel,
  manualGainLabel,
  population,
  populationCapacity,
  cohesion,
  salvageLabel,
  support,
  crew,
  beaconAvailable,
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
  onTuneCore,
  onActivateBeacon,
  onRescueSignal,
  onOpenView,
}: ArkDeckProps) {
  const normalizedWorldProgress = clamp(worldProgress);
  const normalizedResearchProgress = clamp(researchProgress);
  const normalizedCohesion = clamp(cohesion / 100) * 100;
  const normalizedSettlement = clamp(settlementScore / 100) * 100;
  const occupiedDots = Math.min(18, Math.max(0, population));
  const shipStyle = {
    "--ark-world-progress": normalizedWorldProgress,
    "--ark-occupancy": clamp(population / Math.max(1, populationCapacity)),
  } as CSSProperties;

  const roomCards: Array<{
    id: ArkViewId | "core";
    code: string;
    label: string;
    sublabel: string;
    online: boolean;
  }> = [
    {
      id: "core",
      code: "01",
      label: "Axiom Chamber",
      sublabel: "Emergency law-heart",
      online: true,
    },
    {
      id: "population",
      code: "02",
      label: "Life Support",
      sublabel: `${population}/${populationCapacity} safe berths`,
      online: populationCapacity > 0,
    },
    {
      id: "population",
      code: "03",
      label: "Habitation",
      sublabel: population > 0 ? `${population} lives aboard` : "Awaiting first survivor",
      online: population > 0,
    },
    {
      id: "research",
      code: "04",
      label: "Analysis Lattice",
      sublabel: researchProject ?? "No active project",
      online: Boolean(researchProject),
    },
    {
      id: "population",
      code: "05",
      label: "Education Deck",
      sublabel: crew.some((member) => member.training) ? "Training active" : "Curriculum idle",
      online: crew.length > 0,
    },
    {
      id: "settlement",
      code: "06",
      label: "Planetfall Bridge",
      sublabel: beaconOnline ? "SOS carrier broadcasting" : "Beacon cold",
      online: beaconOnline,
    },
  ];

  return (
    <section className="ark-command-deck" style={shipStyle} aria-labelledby="ark-command-title">
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
          <div><span>Population</span><strong>{population}/{populationCapacity}</strong></div>
          <div><span>Cohesion</span><strong>{Math.round(normalizedCohesion)}%</strong></div>
          <div><span>Salvage</span><strong>{salvageLabel}</strong></div>
          <div><span>Rooms online</span><strong>{onlineRoomCount}/{totalRoomCount}</strong></div>
        </div>
      </header>

      <div className="ark-orbit-card">
        <div className="ark-orbit-copy">
          <span>CONTINUITY ROUTE // CURRENT</span>
          <h3>{worldName}</h3>
          <p>{worldSubtitle}</p>
        </div>
        <div className="ark-orbit-progress">
          <strong>{Math.round(normalizedWorldProgress * 100)}%</strong>
          <span>chapter readiness</span>
          <div role="progressbar" aria-label={`${worldName} chapter readiness`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedWorldProgress * 100)}>
            <i style={{ width: `${normalizedWorldProgress * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="ark-visual-stage" aria-label="Cutaway view of the Ark">
        <div className="ark-space" aria-hidden="true">
          <span className="ark-star ark-star-a" />
          <span className="ark-star ark-star-b" />
          <span className="ark-star ark-star-c" />
          <span className="ark-target-planet"><i /></span>
          <span className="ark-orbit-line" />
        </div>

        <div className="ark-hull">
          <span className="ark-hull-spine" aria-hidden="true" />
          <span className="ark-engine-plume" aria-hidden="true" />
          <div className="ark-room-grid">
            {roomCards.map((room) => (
              <button
                className={`ark-room ${room.online ? "is-online" : "is-dark"}`}
                data-room={room.id}
                key={`${room.code}-${room.label}`}
                type="button"
                onClick={() => room.id !== "core" && onOpenView(room.id)}
                disabled={room.id === "core"}
              >
                <span className="ark-room-code">DECK {room.code}</span>
                <strong>{room.label}</strong>
                <small>{room.sublabel}</small>
                <span className="ark-room-machinery" aria-hidden="true"><i /><i /><i /></span>
                {room.id === "population" && room.online && (
                  <span className="ark-room-people" aria-hidden="true">
                    {Array.from({ length: Math.min(6, occupiedDots) }, (_, index) => <i key={index} />)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ark-primary-grid">
        <section className="ark-action-card ark-core-action">
          <header><span>MANUAL OVERRIDE</span><strong>Core pulse</strong></header>
          <div className="ark-core-readout"><span>{fluxLabel}</span><small>{fluxPerSecondLabel}/sec autonomous</small></div>
          <button type="button" onClick={onTuneCore}><span>Tune the Core</span><small>Emergency alignment · +{manualGainLabel} Flux</small></button>
          <p>Manual tuning matters most during Cold Wake. Later it becomes an optional burst and anomaly probe.</p>
        </section>

        <section className="ark-action-card ark-current-order">
          <header><span>ACTIVE DIRECTIVE</span><strong>{objectiveLabel}</strong></header>
          <p>{objectiveDetail}</p>
          <div className="ark-inline-progress" role="progressbar" aria-label={objectiveLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedWorldProgress * 100)}>
            <i style={{ width: `${normalizedWorldProgress * 100}%` }} />
          </div>
          <button type="button" onClick={() => onOpenView("engineering")}>Open engineering detail</button>
        </section>
      </div>

      <section className="ark-life-support" aria-labelledby="ark-life-support-title">
        <header>
          <div><span>HABITABILITY ENVELOPE</span><h3 id="ark-life-support-title">Life support is capacity, not a punishment meter</h3></div>
          <button type="button" onClick={() => onOpenView("population")}>Manage population</button>
        </header>
        <div className="ark-support-grid">
          {support.map((system) => {
            const ratio = clamp(system.value / Math.max(1, system.capacity));
            return (
              <article key={system.id}>
                <span>{system.label}</span>
                <strong>{system.value}/{system.capacity}</strong>
                <div role="progressbar" aria-label={`${system.label} use`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}><i style={{ width: `${ratio * 100}%` }} /></div>
                <small>{system.status}</small>
              </article>
            );
          })}
        </div>
      </section>

      <div className="ark-secondary-grid">
        <section className={`ark-system-card ark-beacon-card ${beaconOnline ? "is-broadcasting" : ""}`}>
          <header><span>PELAGOS SOS ARRAY</span><strong>{beaconOnline ? "Broadcasting" : "Offline"}</strong></header>
          <div className="ark-beacon-visual" aria-hidden="true"><i /><i /><i /></div>
          {!beaconOnline ? (
            <>
              <p>{beaconAvailable ? "Habitation is stable enough to invite the first survivors aboard." : "Reach Pelagos orbit and restore safe berths before asking anyone to trust the Ark."}</p>
              <button type="button" disabled={!beaconAvailable} onClick={onActivateBeacon}>Activate SOS beacon</button>
            </>
          ) : pendingSignal ? (
            <article className="ark-signal-card">
              <span>{pendingSignal.rare ? "PRIORITY SURVIVOR SIGNAL" : "SURVIVOR SIGNAL"}</span>
              <h4>{pendingSignal.label}</h4>
              <p>{pendingSignal.location} · {pendingSignal.groupSize} life signs</p>
              <div>{pendingSignal.roles.map((role) => <small key={role}>{role}</small>)}</div>
              <button type="button" disabled={!pendingSignal.canRescue} onClick={() => onRescueSignal(pendingSignal.id)}>Dispatch rescue shuttle · {pendingSignal.rescueCost} Salvage</button>
              {!pendingSignal.canRescue && <em>{pendingSignal.blockedReason ?? "Increase safe capacity first."}</em>}
            </article>
          ) : (
            <p>The beacon is listening. Survivor signals remain available indefinitely once decoded.</p>
          )}
        </section>

        <section className="ark-system-card ark-crew-card">
          <header><span>HUMAN CONTINUITY</span><strong>{crew.length} aboard</strong></header>
          {crew.length === 0 ? (
            <p>No biological life aboard. AXIOM is keeping empty rooms warm for people it has not met.</p>
          ) : (
            <ul>
              {crew.slice(0, 4).map((member) => (
                <li key={member.id}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.training ? `${member.role} · training ${member.training}` : `${member.role} · level ${member.level}`}</small></div></li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => onOpenView("population")}>Open crew, training, and assignments</button>
        </section>

        <section className="ark-system-card ark-research-card">
          <header><span>RESEARCH LATTICE</span><strong>{researchThroughput}</strong></header>
          <h4>{researchProject ?? "Analysis Core awaiting a project"}</h4>
          <div className="ark-inline-progress" role="progressbar" aria-label="Research progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedResearchProgress * 100)}><i style={{ width: `${normalizedResearchProgress * 100}%` }} /></div>
          <p>Route manufactured evidence through decoders, separators, buffers, and amplifiers.</p>
          <button type="button" onClick={() => onOpenView("research")}>Configure the lattice</button>
        </section>

        <section className={`ark-system-card ark-settlement-card ${settlementReady ? "is-ready" : ""}`}>
          <header><span>PLANETARY CONTINUITY</span><strong>{Math.round(normalizedSettlement)}%</strong></header>
          <h4>{settlementReady ? "Independent settlement ready" : "The Ark is still needed"}</h4>
          <div className="ark-inline-progress" role="progressbar" aria-label="Settlement viability" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedSettlement)}><i style={{ width: `${normalizedSettlement}%` }} /></div>
          <p>{settlementReady ? "Choose the founders who will remain and carry this world forward." : settlementDeficit ?? "Rescue, train, research, and supply the population."}</p>
          <button type="button" onClick={() => onOpenView("settlement")}>Open continuity forecast</button>
        </section>
      </div>
    </section>
  );
}

export default ArkDeck;
