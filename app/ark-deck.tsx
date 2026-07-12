"use client";

import { useState, type CSSProperties } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";

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
  objectiveLabel: string;
  objectiveDetail: string;
  fluxLabel: string;
  fluxPerSecondLabel: string;
  manualGainLabel: string;
  population: number;
  populationCapacity: number;
  berthCapacity: number;
  berthSections: number;
  berthConstructionProgress: number | null;
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
  unlockedViews: readonly ArkViewId[];
  onTuneCore: () => void;
  onActivateBeacon: () => void;
  onRescueSignal: (signalId: string) => void;
  onOpenView: (view: ArkViewId) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
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
  objectiveLabel,
  objectiveDetail,
  fluxLabel,
  fluxPerSecondLabel,
  manualGainLabel,
  population,
  populationCapacity,
  berthCapacity,
  berthSections,
  berthConstructionProgress,
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
  unlockedViews,
  onTuneCore,
  onActivateBeacon,
  onRescueSignal,
  onOpenView,
  onOpenHelp,
}: ArkDeckProps) {
  const [corePulse, setCorePulse] = useState(0);
  const normalizedWorldProgress = clamp(worldProgress);
  const normalizedResearchProgress = clamp(researchProgress);
  const normalizedCohesion = clamp(cohesion / 100) * 100;
  const normalizedSettlement = clamp(settlementScore / 100) * 100;
  const occupiedDots = Math.min(8, Math.max(0, population));
  const fluxValue = numericLabelValue(fluxLabel);
  const researchRate = numericLabelValue(researchThroughput);
  const roomRatio = clamp(onlineRoomCount / Math.max(1, totalRoomCount));

  const unlockedViewSet = new Set(unlockedViews);
  const engineeringUnlocked = unlockedViewSet.has("engineering");
  const populationUnlocked = unlockedViewSet.has("population");
  const researchUnlocked = unlockedViewSet.has("research");
  const settlementUnlocked = unlockedViewSet.has("settlement");

  const fabricationOnline = engineeringUnlocked;
  const supportOnline = populationUnlocked;
  const habitationOnline = populationUnlocked;
  const berthPodCount = Math.min(10, 1 + berthSections);
  const researchOnline = researchUnlocked;
  const educationOnline = populationUnlocked && crew.length > 0;
  const beaconRelevant = populationUnlocked && (beaconAvailable || beaconOnline || Boolean(pendingSignal));
  const continuityOnline = settlementUnlocked;
  const peopleSystemsVisible = populationUnlocked;

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
      sublabel: supportOnline ? `${population}/${populationCapacity} safe berths` : "Atmosphere absent",
      kind: "support",
      online: supportOnline,
    },
    {
      id: "population",
      code: "04",
      label: "Habitation Ring",
      sublabel: habitationOnline
        ? berthConstructionProgress !== null
          ? `${population}/${berthCapacity} berths · section ${Math.round(berthConstructionProgress * 100)}% built`
          : `${population}/${berthCapacity} berths across ${berthSections + 1} sections`
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

  const handleCoreTune = () => {
    setCorePulse((value) => value + 1);
    onTuneCore();
  };

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
          <div className="ark-metric-with-help"><span>Salvage <HelpTrigger label="How do I get Salvage?" onClick={() => onOpenHelp("salvage")} /></span><strong>{salvageLabel}</strong></div>
          <div><span>Ark awake</span><strong>{onlineRoomCount}/{totalRoomCount}</strong></div>
        </div>
      </header>

      <section className="ark-visual-stage" aria-label={`The Ark approaching ${worldName}`}>
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
        </div>

        <div className="ark-target-world" aria-hidden="true">
          <span className="ark-world-atmosphere" />
          <span className="ark-world-surface" />
          <span className="ark-world-clouds" />
          <span className="ark-world-night" />
          <span className="ark-world-orbit ark-world-orbit-one" />
          <span className="ark-world-orbit ark-world-orbit-two" />
        </div>

        <div className="ark-ship" aria-label={`${onlineRoomCount} of ${totalRoomCount} Ark rooms online`}>
          <span className="ark-engine-plume" aria-hidden="true"><i /><i /><i /></span>
          <span className="ark-hull-top" aria-hidden="true" />
          <span className="ark-hull-keel" aria-hidden="true" />

          <div className="ark-core-bay">
            <button
              className="ark-core-engine"
              type="button"
              onClick={handleCoreTune}
              aria-label={`Tune the Core for ${manualGainLabel} Flux`}
            >
              <span className="ark-core-orbit ark-core-orbit-one" aria-hidden="true"><i /><i /><i /></span>
              <span className="ark-core-orbit ark-core-orbit-two" aria-hidden="true"><i /><i /><i /><i /></span>
              <span className="ark-core-aperture" aria-hidden="true"><i /></span>
              <span className="ark-core-copy">
                <small>AXIOM CHAMBER</small>
                <strong>{fluxLabel}</strong>
                <em>{fluxPerSecondLabel}/sec</em>
              </span>
              {corePulse > 0 && <span className="ark-core-shockwave" key={`wave-${corePulse}`} aria-hidden="true" />}
              {corePulse > 0 && <span className="ark-core-gain" key={`gain-${corePulse}`} aria-hidden="true">+{manualGainLabel}</span>}
            </button>
            <span className="ark-core-instruction">Tune the Core</span>
          </div>

          <div className="ark-hull-frame">
            <div className="ark-room-grid">
              {rooms.map((room) => (
                <button
                  className={`ark-room ark-room-${room.kind} ${room.online ? "is-online" : "is-dormant"}`}
                  data-room={room.id}
                  data-kind={room.kind}
                  key={`${room.code}-${room.label}`}
                  type="button"
                  onClick={() => room.id !== "core" && onOpenView(room.id)}
                  disabled={!room.online || room.id === "core"}
                  aria-label={room.online ? `Open ${room.label}` : `${room.label} is dormant`}
                >
                  <span className="ark-room-status" aria-hidden="true" />
                  <span className="ark-room-code">DECK {room.code}</span>
                  <strong>{room.label}</strong>
                  <small>{room.online ? room.sublabel : "Awakens later"}</small>

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
              ))}
            </div>
          </div>
        </div>

        <aside className="ark-stage-directive" aria-labelledby="ark-objective-title">
          <div>
            <span>ACTIVE DIRECTIVE</span>
            <h3 id="ark-objective-title">{objectiveLabel}</h3>
            <p>{objectiveDetail}</p>
          </div>
          <div className="ark-directive-progress">
            <strong>{Math.round(normalizedWorldProgress * 100)}%</strong>
            <div role="progressbar" aria-label={objectiveLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedWorldProgress * 100)}>
              <i style={{ width: `${normalizedWorldProgress * 100}%` }} />
            </div>
            {engineeringUnlocked ? (
              <button type="button" onClick={() => onOpenView("engineering")}>Open engineering</button>
            ) : (
              <span className="ark-directive-hint">Keep tuning the Core. Fabrication will awaken next.</span>
            )}
          </div>
        </aside>

        <p className="ark-screen-reader-status" aria-live="polite">
          {corePulse > 0 ? `Core tuned. ${manualGainLabel} Flux added.` : ""}
        </p>
      </section>

      <section className="ark-flight-ribbon" aria-label="Current voyage">
        <div>
          <span>CONTINUITY ROUTE</span>
          <strong>{worldName}</strong>
        </div>
        <div className="ark-flight-track" role="progressbar" aria-label={`${worldName} chapter readiness`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalizedWorldProgress * 100)}>
          <i style={{ width: `${normalizedWorldProgress * 100}%` }}><b /></i>
        </div>
        <strong>{Math.round(normalizedWorldProgress * 100)}%</strong>
      </section>

      {supportOnline && (
        <section className="ark-life-support" aria-labelledby="ark-life-support-title">
          <header>
            <div>
              <span>HABITABILITY ENVELOPE</span>
              <h3 id="ark-life-support-title">The Ark can begin holding life</h3>
              <p>Capacity expands safely. Nothing here expires while you are away.</p>
            </div>
            <button type="button" onClick={() => onOpenView("population")}>Enter life support</button>
          </header>
          <div className="ark-support-grid">
            {support.map((system) => {
              const ratio = clamp(system.value / Math.max(1, system.capacity));
              return (
                <article key={system.id}>
                  <span className="ark-support-icon" aria-hidden="true"><i /></span>
                  <div>
                    <span>{system.label}</span>
                    <strong>{system.value}<small> / {system.capacity}</small></strong>
                    <div role="progressbar" aria-label={`${system.label} use`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
                      <i style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <small>{system.status}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {(peopleSystemsVisible || researchUnlocked || settlementUnlocked) ? (
        <div className="ark-awakened-systems">
          {populationUnlocked && (beaconRelevant || beaconOnline) && (
            <section className={`ark-system-bay ark-beacon-card ${beaconOnline ? "is-broadcasting" : ""}`}>
              <div className="ark-bay-visual ark-beacon-visual" aria-hidden="true">
                <span /><i /><i /><i />
              </div>
              <div className="ark-bay-content">
                <header><span>PELAGOS SOS ARRAY</span><strong>{beaconOnline ? "Broadcasting" : "Waiting"}</strong></header>
                {!beaconOnline ? (
                  <>
                    <h3>No one can hear the Ark yet</h3>
                    <p>{beaconAvailable ? "Habitation is stable enough to invite the first survivors aboard." : "Reach orbit and restore safe berths before asking anyone to trust the Ark."}</p>
                    <button type="button" disabled={!beaconAvailable} onClick={onActivateBeacon}>Activate SOS beacon</button>
                  </>
                ) : pendingSignal ? (
                  <article className="ark-signal-card">
                    <span>{pendingSignal.rare ? "PRIORITY SURVIVOR SIGNAL" : "SURVIVOR SIGNAL"}</span>
                    <h3>{pendingSignal.label}</h3>
                    <p>{pendingSignal.location} · {pendingSignal.groupSize} life signs</p>
                    <div>{pendingSignal.roles.map((role) => <small key={role}>{role}</small>)}</div>
                    <button type="button" disabled={!pendingSignal.canRescue} onClick={() => onRescueSignal(pendingSignal.id)}>
                      Dispatch rescue shuttle · {pendingSignal.rescueCost} Salvage
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

          {populationUnlocked && (
            <section className="ark-system-bay ark-crew-card">
              <div className="ark-bay-visual ark-habitat-visual" aria-hidden="true">
                {Array.from({ length: Math.max(1, Math.min(8, occupiedDots)) }, (_, index) => <i key={index} />)}
              </div>
              <div className="ark-bay-content">
                <header><span>HUMAN CONTINUITY</span><strong>{crew.length} aboard</strong></header>
                {crew.length === 0 ? (
                  <>
                    <h3>Rooms waiting for names</h3>
                    <p>No biological life aboard. AXIOM is keeping empty rooms warm for people it has not met.</p>
                  </>
                ) : (
                  <ul>
                    {crew.slice(0, 4).map((member) => (
                      <li className={`crew-rarity-${member.rarity}`} key={member.id}>
                        <span className="ark-crew-avatar">{member.name.slice(0, 1)}</span>
                        <div><strong>{member.name}</strong><small>{member.training ? `${member.role} · training ${member.training}` : member.level > 0 ? `${member.role} · level ${member.level}` : `${member.role} · untrained`}</small></div>
                        <em className="crew-rarity-badge" title={member.rarityDescription}>{member.rarityLabel}</em>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => onOpenView("population")}>Open crew and training</button>
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
