"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";

import {
  RESEARCH_INPUT_DEFINITIONS,
  RESEARCH_BRANCHES,
  RESEARCH_ERAS,
  RESEARCH_STAGES,
  RESEARCH_PROJECT_DEFINITIONS,
  canStartResearchProject,
  getAvailableResearchEras,
  getCurrentResearchEra,
  getResearchEraProgress,
  getResearchInputDefinition,
  getResearchNetworkStatus,
  getResearchNullEchoes,
  getResearchProcessorDefinition,
  getResearchProjectDefinition,
  getResearchProjectCosts,
  getResearchProjectEra,
  getResearchProjectWorkRequired,
  getResearchProjectPresentation,
  getResearchProjectProgress,
  getResolvedResearchRoutes,
  getResearchRepeatCount,
  selectResearchProject,
  setResearchCrew,
  type ResearchBranch,
  type ResearchEra,
  type ResearchExpertise,
  type ResearchInputBundle,
  type ResearchInputId,
  type ResearchLatticeState,
  type ResearchProjectId,
} from "./research-engine";

import "./research-lattice.css";

export type ResearchLatticeProps = {
  state: ResearchLatticeState;
  resources?: Partial<ResearchInputBundle>;
  availableCrew: number;
  powerAvailable: number;
  externalSpeedMultiplier?: number;
  automationMultiplier?: number;
  costMultiplier?: number;
  expertise: ResearchExpertise;
  leadResearcher: { level: number; exceptional: boolean; name: string | null };
  fieldValidation: {
    points: number;
    multiplier: number;
    sources: readonly { id: string; label: string; detail: string; points: number }[];
  };
  initialView?: ResearchView;
  now?: number;
  onStateChange: (state: ResearchLatticeState) => void;
  onTransferInput: (inputId: ResearchInputId, amount: number) => void;
  autoTransfer: { common: boolean; nullTraces: boolean };
  onAssignedCrewChange?: (assignedCrew: number) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onClose?: () => void;
};

const BRANCHES = RESEARCH_BRANCHES;

export type ResearchView = "core" | "technology" | "lattice" | "archive";

type ResearchDomainId = "systems" | "humanity" | "worlds" | "causal";

const RESEARCH_DOMAINS: readonly {
  id: ResearchDomainId;
  code: string;
  name: string;
  description: string;
  branches: readonly ResearchBranch[];
}[] = [
  {
    id: "systems",
    code: "SYS",
    name: "Ark Systems",
    description: "Keep the Ark powered, fabricated, repaired, and responsibly automated.",
    branches: ["ark-engineering", "robotics-automation"],
  },
  {
    id: "humanity",
    code: "LIFE",
    name: "Human Continuity",
    description: "Protect bodies, memory, education, and the right to choose a future.",
    branches: ["human-continuity", "medicine-biology"],
  },
  {
    id: "worlds",
    code: "WRLD",
    name: "World Recovery",
    description: "Understand damaged planets and survive the forces contesting them.",
    branches: ["planetary-sciences", "threat-operations"],
  },
  {
    id: "causal",
    code: "NULL",
    name: "Causal Physics",
    description: "Study Axioms, impossible materials, and signals arriving from futures that should not exist.",
    branches: ["axiom-theory", "null-studies"],
  },
] as const;

const getDomainForBranch = (branch: ResearchBranch) =>
  RESEARCH_DOMAINS.find((domain) => domain.branches.includes(branch)) ?? RESEARCH_DOMAINS[0];

const INPUT_ACCENTS: Record<ResearchInputId, string> = {
  "calibration-data": "72 215 235",
  "engineering-models": "100 157 255",
  "biological-samples": "111 225 153",
  "cultural-records": "236 188 104",
  schematics: "255 176 92",
  "null-traces": "188 126 255",
  "axiom-proofs": "255 105 121",
};

const INPUT_SOURCE_COPY: Record<ResearchInputId, string> = {
  "calibration-data": "Core tunes + passive chamber observations",
  "engineering-models": "Machine purchases, Flux production, and infrastructure",
  "biological-samples": "Rescues, clinical work, Doctors, Farmers, and planetary crises",
  "cultural-records": "Rescues, Teachers, Researchers, community testimony, and settlements",
  schematics: "ONLY from rescued survivors' cargo and expedition returns — nothing aboard generates them",
  "null-traces": "Later worlds, passive Null signals, and resolved crises",
  "axiom-proofs": "Recalibration + diminishing passive generation from lifetime Axioms",
};

const formatNumber = (value: number) =>
  value >= 1_000_000
    ? value.toExponential(2)
    : value >= 1_000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)} sec`;
  if (seconds < 3_600) return `${Math.ceil(seconds / 60)} min`;
  return `${(seconds / 3_600).toFixed(seconds < 36_000 ? 1 : 0)} hr`;
};

const getInputStyle = (inputId: ResearchInputId) =>
  ({ "--research-input-rgb": INPUT_ACCENTS[inputId] }) as CSSProperties;

export function ResearchLattice({
  state,
  resources = {},
  availableCrew,
  powerAvailable,
  externalSpeedMultiplier = 1,
  automationMultiplier = 1,
  costMultiplier = 1,
  expertise,
  leadResearcher,
  fieldValidation,
  initialView,
  now = 0,
  onStateChange,
  onTransferInput,
  autoTransfer,
  onAssignedCrewChange,
  onOpenHelp,
  onClose,
}: ResearchLatticeProps) {
  const activeDefinition = state.activeProjectId
    ? getResearchProjectDefinition(state.activeProjectId)
    : undefined;
  const lastCompletedDefinition =
    state.completedProjectIds.length > 0
      ? getResearchProjectDefinition(state.completedProjectIds[state.completedProjectIds.length - 1])
      : undefined;
  const [view, setView] = useState<ResearchView>(
    initialView ?? (state.activeProjectId || state.completedProjectIds.length > 0 ? "core" : "technology"),
  );
  const [era, setEra] = useState<ResearchEra>(
    activeDefinition ? getResearchProjectEra(activeDefinition) : getCurrentResearchEra(state),
  );
  const [domain, setDomain] = useState<ResearchDomainId>(
    getDomainForBranch(activeDefinition?.branch ?? "ark-engineering").id,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<ResearchProjectId | null>(
    activeDefinition?.id ?? null,
  );
  const [archiveMode, setArchiveMode] = useState<ResearchEra | "contradictions">(
    lastCompletedDefinition ? getResearchProjectEra(lastCompletedDefinition) : getCurrentResearchEra(state),
  );
  const [archiveEntryId, setArchiveEntryId] = useState<string | null>(null);
  const resolvedRoutes = useMemo(
    () => getResolvedResearchRoutes(state),
    [state],
  );
  const network = useMemo(
    () =>
      getResearchNetworkStatus(state, {
        powerAvailable,
        crewAvailable: availableCrew,
        externalSpeedMultiplier,
        costMultiplier,
        fieldValidationMultiplier: fieldValidation.multiplier,
        automationMultiplier,
        expertise,
        leadResearcherLevel: leadResearcher.level,
        exceptionalLeadAvailable: leadResearcher.exceptional,
      }),
    [automationMultiplier, availableCrew, costMultiplier, expertise, externalSpeedMultiplier, fieldValidation.multiplier, leadResearcher, powerAvailable, state],
  );
  const echoes = getResearchNullEchoes(state);
  const activeProgress = activeDefinition
    ? getResearchProjectProgress(state, activeDefinition.id)
    : 0;
  const remainingWork = activeDefinition
    ? getResearchProjectWorkRequired(state, activeDefinition) * (1 - activeProgress)
    : 0;
  const eta =
    activeDefinition && network.progressPerSecond > 0
      ? remainingWork / network.progressPerSecond
      : Number.POSITIVE_INFINITY;
  const activeCosts = activeDefinition
    ? getResearchProjectCosts(state, activeDefinition, costMultiplier)
    : {};

  const changeCrew = (amount: number) => {
    const nextAmount = Math.max(
      0,
      Math.min(availableCrew, state.assignedCrew + amount),
    );
    if (onAssignedCrewChange) {
      onAssignedCrewChange(nextAmount);
    } else {
      onStateChange(setResearchCrew(state, nextAmount, availableCrew));
    }
  };

  const transferInput = (inputId: ResearchInputId, amount: number) => {
    const available = Math.max(0, resources[inputId] ?? 0);
    const transferred = Math.min(available, amount);
    if (transferred <= 0) return;
    onTransferInput(inputId, transferred);
  };

  const projectStartedAt = state.lastAdvancedAt ?? now;
  const completedResearch = state.completedProjectIds.length;
  const availableEras = getAvailableResearchEras(state);
  const eraProgress = getResearchEraProgress(state, era);
  const eraPercent =
    eraProgress.total > 0
      ? Math.min(100, Math.max(0, (eraProgress.complete / eraProgress.total) * 100))
      : 0;
  const connectedRoutes = resolvedRoutes.filter(
    (route) => route.sourceId && route.processorId && route.enabled,
  ).length;
  const coreOnline = Boolean(activeDefinition && !network.stalledReason);
  const activity = Math.min(
    1,
    Math.max(
      completedResearch / RESEARCH_PROJECT_DEFINITIONS.length,
      Math.min(1, network.progressPerSecond / 2.8),
    ),
  );
  const machineStyle = {
    "--research-activity": activity.toFixed(3),
    "--research-core-speed": `${Math.max(2.6, 16 - activity * 11.5 - connectedRoutes * 0.45)}s`,
    "--research-packet-speed": `${Math.max(0.58, 2.8 - activity * 1.55 - connectedRoutes * 0.12)}s`,
    "--research-completion": `${completedResearch / RESEARCH_PROJECT_DEFINITIONS.length}`,
  } as CSSProperties;
  const visibleProjects = RESEARCH_PROJECT_DEFINITIONS.filter(
    (project) =>
      getResearchProjectEra(project) === era &&
      RESEARCH_DOMAINS.find((candidate) => candidate.id === domain)?.branches.includes(project.branch),
  );
  const selectedProject =
    visibleProjects.find((project) => project.id === selectedProjectId) ??
    visibleProjects[0] ??
    null;
  const selectedProjectPresentation = selectedProject
    ? getResearchProjectPresentation(state, selectedProject.id)
    : null;
  const selectedProjectCosts = selectedProject
    ? getResearchProjectCosts(state, selectedProject, costMultiplier)
    : {};
  const activeStageIndex = Math.max(
    0,
    RESEARCH_STAGES.findIndex((stage) => stage.id === network.stage),
  );
  const activeStagePosition = 13 + activeStageIndex * 24.5;
  const activeInputs = RESEARCH_INPUT_DEFINITIONS.filter(
    (input) => (activeCosts[input.id] ?? 0) > 0,
  );
  const firstMissingInput = network.missingInputs[0]
    ? getResearchInputDefinition(network.missingInputs[0])
    : undefined;
  const archiveProjects = state.completedProjectIds
    .map((projectId) => getResearchProjectDefinition(projectId))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));
  const archiveProjectsInMode =
    archiveMode === "contradictions"
      ? []
      : archiveProjects.filter((project) => getResearchProjectEra(project) === archiveMode);
  const selectedArchiveProject =
    archiveProjectsInMode.find((project) => project.id === archiveEntryId) ??
    archiveProjectsInMode[0] ??
    null;
  const selectedEcho =
    echoes.find((echo) => echo.id === archiveEntryId) ?? echoes[0] ?? null;

  return (
    <section
      className={`research-lattice-shell research-workbench-v2 is-view-${view} research-era-${era} ${
        coreOnline ? "is-core-online" : "is-core-idle"
      } ${network.stalledReason ? "is-core-stalled" : ""} ${
        activeDefinition?.branch === "null-studies" ? "is-null-project" : ""
      }`}
      style={machineStyle}
      aria-label="Research Lattice"
    >
      <header className="research-lattice-header" data-guide-target="research-header">
        <div>
          <p className="research-lattice-kicker">ANALYSIS DECK // {RESEARCH_ERAS.find((item) => item.id === era)?.code}</p>
          <h1>{view === "core" ? "Active Project" : view === "technology" ? "Technology Map" : view === "lattice" ? "Research Lattice" : "Research Archive"}</h1>
          <p>
            {view === "core"
              ? "One discovery at a time. Watch evidence become theory, hardware, field proof, and finally a capability."
              : view === "technology"
                ? "Choose the Ark's next question by era and domain. Inspect one program before committing the machine."
                : view === "lattice"
                  ? "See where every piece of evidence travels, why throughput changes, and what is holding the machine back."
                  : "Open one preserved discovery at a time. Contradictions are filed separately from proven capabilities."}
          </p>
        </div>
        <div className="research-lattice-header-actions">
          <HelpTrigger label="Open the Research page guide" withLabel onClick={() => onOpenHelp("research")} />
          <span
            className="research-lattice-clock"
            title="The actual evidence requirement after planetary conditions, restored-world legacies, and physical Analysis rooms are applied."
          >
            EVIDENCE COST ×{costMultiplier.toFixed(2)}
          </span>
          <span className="research-lattice-clock" title="Local lattice time">
            T+{Math.max(0, Math.floor((now - projectStartedAt) / 1000))}s
          </span>
          {onClose ? (
            <button type="button" onClick={onClose}>
              Close lattice
            </button>
          ) : null}
        </div>
      </header>

      <nav className="research-command-tabs" aria-label="Research sections">
        {([
          ["core", "Active Project", "Current question, progress, and blockers"],
          ["technology", "Technology Map", "Eras, branches, and programs"],
          ["lattice", "Lattice", "Evidence routing and Analysis stations"],
          ["archive", "Archive", "Completed work and contradictions"],
        ] as const).map(([id, label, description]) => (
          <button
            key={id}
            type="button"
            className={view === id ? "is-active" : ""}
            disabled={id === "archive" && completedResearch === 0}
            onClick={() => setView(id)}
          >
            <span>{label}</span>
            <small>{id === "archive" && completedResearch === 0 ? "Reveals after the first discovery" : description}</small>
          </button>
        ))}
      </nav>

      <div
        className="research-lattice-awakening"
        aria-label={`${eraProgress.complete} of ${eraProgress.total} ${era} discoveries resolved`}
      >
        <span>{`${RESEARCH_ERAS.find((item) => item.id === era)?.code} // ${
          RESEARCH_ERAS.find((item) => item.id === era)?.name.toUpperCase()
        }`}</span>
        <div
          className="research-era-meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={eraProgress.total}
          aria-valuenow={eraProgress.complete}
        >
          <i style={{ width: `${eraPercent}%` }} />
        </div>
        <strong>
          {eraProgress.complete} / {eraProgress.total}
          <small>{eraPercent >= 100 ? "ERA MASTERED" : `${Math.round(eraPercent)}% PROVEN`}</small>
        </strong>
      </div>

      {view === "core" && activeDefinition ? (
        <section className="research-core-workspace" aria-label="Active research synthesis">
          <div className="research-engine-bay" data-guide-target="research-network">
            <div
              className="research-analysis-field"
              style={{
                "--active-stage-x": `${activeStagePosition}%`,
                "--project-progress": activeProgress.toFixed(4),
              } as CSSProperties}
            >
              <div className="research-field-depth" aria-hidden="true" />
              <div className="research-field-scan" aria-hidden="true" />

              <div className="research-stage-thresholds" aria-label="Research stages">
                {RESEARCH_STAGES.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={`${index < activeStageIndex ? "is-complete" : ""} ${
                      index === activeStageIndex ? "is-active" : ""
                    }`}
                    style={{
                      "--stage-index": index,
                      "--stage-x": `${13 + index * 24.5}%`,
                    } as CSSProperties}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i><b /></i>
                    <strong>{stage.name}</strong>
                    <small>
                      {index < activeStageIndex
                        ? "PROVEN"
                        : index === activeStageIndex
                          ? `${Math.round(activeProgress * 100)}% TOTAL`
                          : "UNRESOLVED"}
                    </small>
                  </div>
                ))}
              </div>

              <div className="research-synthesis-spine" aria-hidden="true">
                <i style={{ width: `${Math.max(1.5, activeProgress * 100)}%` }} />
              </div>

              <div className="research-evidence-swarm" aria-hidden="true">
                {activeInputs.flatMap((input, inputIndex) =>
                  Array.from({ length: 9 }, (_, packetIndex) => {
                    const missing = network.missingInputs.includes(input.id);
                    const duration = Math.max(
                      1.4,
                      5.4 - activity * 2.7 + inputIndex * 0.16 + (packetIndex % 3) * 0.22,
                    );
                    return (
                      <i
                        key={`${input.id}-${packetIndex}`}
                        className={missing ? "is-missing" : ""}
                        style={{
                          ...getInputStyle(input.id),
                          "--packet-y": `${11 + ((inputIndex * 17 + packetIndex * 9) % 72)}%`,
                          "--packet-delay": `${-(packetIndex * 0.61 + inputIndex * 0.24)}s`,
                          "--packet-duration": `${duration}s`,
                          "--packet-size": `${packetIndex % 4 === 0 ? 7 : packetIndex % 2 === 0 ? 5 : 3}px`,
                          "--packet-drift": `${((packetIndex % 5) - 2) * 12}px`,
                        } as CSSProperties}
                      >
                        <b />
                      </i>
                    );
                  }),
                )}
              </div>

              <div className="research-analysis-wake" aria-hidden="true"><i /><i /><i /></div>
              <button
                type="button"
                className="research-analysis-head"
                onClick={() => setView("lattice")}
                aria-label="Inspect the active evidence lattice"
              >
                <span className="research-head-frame"><i /><i /><i /><i /></span>
                <span className="research-head-glyph">
                  {BRANCHES.find((item) => item.id === activeDefinition.branch)?.code ?? "AXM"}
                </span>
              </button>

              <div className="research-field-readout is-throughput">
                <span>THROUGHPUT</span>
                <strong>{(network.progressPerSecond * 60).toFixed(1)}</strong>
                <small>work / min</small>
              </div>
              <div className="research-field-readout is-power">
                <span>CORE LOAD</span>
                <strong>{network.powerUsed.toFixed(0)} / {Math.max(0, powerAvailable).toFixed(0)}</strong>
                <small>megawatts</small>
              </div>
              <div className="research-field-readout is-status">
                <span>CURRENT THRESHOLD</span>
                <strong>{network.stalledReason ?? (activeDefinition ? "SYNTHESIZING" : "DORMANT")}</strong>
              </div>

              <div className="research-field-legend" aria-label="Evidence in motion">
                {activeInputs.map((input) => (
                  <span
                    key={input.id}
                    className={network.missingInputs.includes(input.id) ? "is-missing" : ""}
                    style={getInputStyle(input.id)}
                  >
                    <i /> {input.shortName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="research-active-dossier" data-guide-target="research-crew">
            <>
                <header>
                  <span>ACTIVE DISCOVERY // {BRANCHES.find((item) => item.id === activeDefinition.branch)?.code}</span>
                  <h2>{activeDefinition.name}</h2>
                  <p>{getResearchProjectPresentation(state, activeDefinition.id)?.displaySummary}</p>
                </header>
                <div className="research-dossier-progress">
                  <span><b>{network.stageLabel}</b><strong>{(activeProgress * 100).toFixed(1)}%</strong></span>
                  <div><i style={{ width: `${activeProgress * 100}%` }} /></div>
                  <small>{network.progressPerSecond > 0 ? `${formatDuration(eta)} estimated` : "Progress paused"}</small>
                </div>
                <div className="research-dossier-status">
                  <div>
                    <span>RESEARCH LEAD</span>
                    <strong>{leadResearcher.name ?? "AXIOM alone"}</strong>
                    <small>Level {leadResearcher.level} researcher</small>
                  </div>
                  <div>
                    <span>ON DUTY</span>
                    <strong>{network.crewOperating} / {network.crewRequired} stations</strong>
                    <small>{Math.round(network.expertiseTotal)} {network.expertiseId.replaceAll("-", " ")} expertise</small>
                  </div>
                  <div>
                    <span>FIELD EVIDENCE</span>
                    <strong>{network.stage === "validation" ? `x${fieldValidation.multiplier.toFixed(2)}` : "STANDBY"}</strong>
                    <small>{fieldValidation.sources[0]?.label ?? "No live field source yet"}</small>
                  </div>
                </div>
                <div className="research-dossier-evidence">
                  <span>EVIDENCE FEED</span>
                  {RESEARCH_INPUT_DEFINITIONS.filter((input) => (activeCosts[input.id] ?? 0) > 0).map((input) => {
                    const total = activeCosts[input.id] ?? 0;
                    const remaining = total * Math.max(0, 1 - activeProgress);
                    return (
                      <div key={input.id} style={getInputStyle(input.id)}>
                        <i />
                        <b>{input.name}</b>
                        <small>{formatNumber(state.inventory[input.id])} loaded / {formatNumber(remaining)} projected</small>
                      </div>
                    );
                  })}
                </div>
                {network.stalledReason ? (
                  <div className="research-dossier-alert">
                    <span>HOLD CONDITION</span>
                    <strong>{network.stalledReason}</strong>
                    <p>
                      {network.stalledReason === "Awaiting research inputs"
                        ? `${firstMissingInput?.name ?? "A required evidence reservoir"} is empty. Source: ${
                            firstMissingInput
                              ? INPUT_SOURCE_COPY[firstMissingInput.id]
                              : "open the Lattice for the exact recovery path"
                          }.`
                        : "Open the Lattice to inspect power, stations, and routing."}
                    </p>
                    <button type="button" onClick={() => setView("lattice")}>Inspect lattice</button>
                  </div>
                ) : null}
                <button
                  className="research-dossier-action"
                  type="button"
                  onClick={() => onStateChange(selectResearchProject(state, null, now))}
                >
                  Pause research
                </button>
            </>
          </aside>
        </section>
      ) : view === "core" ? (
        <section className="research-core-empty-workspace" aria-label="No active research project">
          <div className="research-core-empty-sigil" aria-hidden="true">
            <span><i /><i /><i /><i /></span>
            <b>?</b>
          </div>
          <div className="research-core-empty-copy" data-guide-target="research-network">
            <span>ACTIVE PROJECT // NONE LOADED</span>
            <h2>The Analysis Core needs a question.</h2>
            <p>
              Research is not a passive currency. The Ark studies one practical problem at a time, and every
              problem names the evidence and expertise it needs before work begins.
            </p>
            <ol>
              <li><b>1</b><span><strong>Choose a program</strong><small>Open Technology Map and inspect one capability.</small></span></li>
              <li><b>2</b><span><strong>Load evidence</strong><small>The Lattice identifies each resource and where it comes from.</small></span></li>
              <li><b>3</b><span><strong>Assign researchers</strong><small>Crew expertise and Analysis stations set throughput.</small></span></li>
              <li><b>4</b><span><strong>Let analysis continue</strong><small>Valid research progresses online and offline.</small></span></li>
            </ol>
            <button type="button" onClick={() => setView("technology")}>Choose a Research Program</button>
          </div>
          <aside className="research-core-purpose" data-guide-target="research-crew">
            <span>WHAT THIS SCREEN ANSWERS</span>
            <div><b>01</b><strong>What are we researching?</strong></div>
            <div><b>02</b><strong>Is evidence moving?</strong></div>
            <div><b>03</b><strong>If not, what is blocking it?</strong></div>
            <p>The animated Analysis Engine appears only after a program is loaded.</p>
          </aside>
        </section>
      ) : null}

      {view === "technology" ? (
        <section className="research-technology-workspace" data-guide-target="research-programs">
          <nav className="research-era-console" aria-label="Research eras">
            {RESEARCH_ERAS.map((candidate, index) => {
              const available = availableEras.some((item) => item.id === candidate.id);
              const progress = getResearchEraProgress(state, candidate.id);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={era === candidate.id ? "is-active" : ""}
                  disabled={!available}
                  onClick={() => {
                    setEra(candidate.id);
                    const nextDomain =
                      RESEARCH_DOMAINS.find((candidateDomain) =>
                        RESEARCH_PROJECT_DEFINITIONS.some(
                          (project) =>
                            getResearchProjectEra(project) === candidate.id &&
                            candidateDomain.branches.includes(project.branch),
                        ),
                      ) ?? RESEARCH_DOMAINS[0];
                    const retainedDomainHasProjects = RESEARCH_PROJECT_DEFINITIONS.some(
                      (project) =>
                        getResearchProjectEra(project) === candidate.id &&
                        RESEARCH_DOMAINS.find((item) => item.id === domain)?.branches.includes(project.branch),
                    );
                    const resolvedDomain = retainedDomainHasProjects
                      ? RESEARCH_DOMAINS.find((item) => item.id === domain) ?? nextDomain
                      : nextDomain;
                    setDomain(resolvedDomain.id);
                    setSelectedProjectId(
                      RESEARCH_PROJECT_DEFINITIONS.find(
                        (project) =>
                          getResearchProjectEra(project) === candidate.id &&
                          resolvedDomain.branches.includes(project.branch),
                      )?.id ?? null,
                    );
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{candidate.name}</strong>
                  <small>{available ? `${progress.complete}/${progress.total} resolved` : "SEALED"}</small>
                </button>
              );
            })}
          </nav>

          <div className="research-era-brief">
            <span>{RESEARCH_ERAS.find((candidate) => candidate.id === era)?.code} THESIS</span>
            <p>{RESEARCH_ERAS.find((candidate) => candidate.id === era)?.thesis}</p>
          </div>

          <nav className="research-domain-console" aria-label="Research domains">
            {RESEARCH_DOMAINS.map((candidate) => {
              const projects = RESEARCH_PROJECT_DEFINITIONS.filter(
                (project) =>
                  getResearchProjectEra(project) === era &&
                  candidate.branches.includes(project.branch),
              );
              const complete = projects.filter((project) =>
                state.completedProjectIds.includes(project.id),
              ).length;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={domain === candidate.id ? "is-active" : ""}
                  disabled={projects.length === 0}
                  onClick={() => {
                    setDomain(candidate.id);
                    setSelectedProjectId(projects[0]?.id ?? null);
                  }}
                >
                  <span>{candidate.code}</span>
                  <strong>{candidate.name}</strong>
                  <small>{projects.length > 0 ? `${complete}/${projects.length} proven` : "No programs this era"}</small>
                </button>
              );
            })}
          </nav>

          <div className="research-map-layout">
            <main className="research-domain-map" aria-label={`${RESEARCH_DOMAINS.find((item) => item.id === domain)?.name} programs`}>
              <header>
                <span>DOMAIN // {RESEARCH_DOMAINS.find((item) => item.id === domain)?.code}</span>
                <h2>{RESEARCH_DOMAINS.find((item) => item.id === domain)?.name}</h2>
                <p>{RESEARCH_DOMAINS.find((item) => item.id === domain)?.description}</p>
              </header>
              <div className="research-map-lanes">
                {(RESEARCH_DOMAINS.find((item) => item.id === domain)?.branches ?? []).map((branchId) => {
                  const branchDefinition = BRANCHES.find((candidate) => candidate.id === branchId);
                  const projects = visibleProjects.filter((project) => project.branch === branchId);
                  if (projects.length === 0) return null;
                  return (
                    <section className="research-map-lane" key={branchId}>
                      <div className="research-map-lane-label">
                        <span>{branchDefinition?.code}</span>
                        <strong>{branchDefinition?.name}</strong>
                      </div>
                      <div className="research-map-node-line">
                        {projects.map((project, index) => {
                          const repeatCount = getResearchRepeatCount(state, project.id);
                          const complete = project.repeatable
                            ? repeatCount >= project.repeatable.maxCompletions
                            : state.completedProjectIds.includes(project.id);
                          const active = state.activeProjectId === project.id;
                          const locked = !project.prerequisites.every((prerequisite) =>
                            state.completedProjectIds.includes(prerequisite),
                          );
                          const progress = getResearchProjectProgress(state, project.id);
                          return (
                            <button
                              key={project.id}
                              type="button"
                              className={`${selectedProject?.id === project.id ? "is-selected" : ""} ${
                                complete ? "is-complete" : ""
                              } ${active ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
                              onClick={() => setSelectedProjectId(project.id)}
                              aria-label={`Inspect ${project.name}`}
                            >
                              <span>{String(index + 1).padStart(2, "0")}</span>
                              <i aria-hidden="true"><b /></i>
                              <strong>{project.name}</strong>
                              <small>
                                {complete
                                  ? "PROVEN"
                                  : active
                                    ? `${Math.round(progress * 100)}% ACTIVE`
                                    : locked
                                      ? "SEALED"
                                      : "AVAILABLE"}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </main>

            <aside className="research-program-inspector">
              {selectedProject ? (() => {
                const repeatCount = getResearchRepeatCount(state, selectedProject.id);
                const complete = selectedProject.repeatable
                  ? repeatCount >= selectedProject.repeatable.maxCompletions
                  : state.completedProjectIds.includes(selectedProject.id);
                const active = state.activeProjectId === selectedProject.id;
                const lockedPrerequisites = selectedProject.prerequisites.filter(
                  (prerequisite) => !state.completedProjectIds.includes(prerequisite),
                );
                const canStart = canStartResearchProject(state, selectedProject.id);
                const progress = getResearchProjectProgress(state, selectedProject.id);
                return (
                  <>
                    <header>
                      <span>
                        PROGRAM // {BRANCHES.find((item) => item.id === selectedProject.branch)?.code}
                      </span>
                      <h2>{selectedProject.name}</h2>
                      <b>{complete ? "PROVEN" : active ? "IN ANALYSIS" : lockedPrerequisites.length > 0 ? "SEALED" : "READY"}</b>
                    </header>
                    <p className="research-program-summary">
                      {selectedProjectPresentation?.displaySummary ?? selectedProject.summary}
                    </p>
                    <div className="research-program-meter">
                      <span><b>WORK RESOLVED</b><strong>{Math.round(progress * 100)}%</strong></span>
                      <div><i style={{ width: `${progress * 100}%` }} /></div>
                    </div>
                    <section>
                      <span>REQUIRED EVIDENCE</span>
                      <div className="research-program-costs">
                        <div><b>WORK</b><strong>{formatNumber(getResearchProjectWorkRequired(state, selectedProject))}</strong></div>
                        {RESEARCH_INPUT_DEFINITIONS.filter(
                          (input) => (selectedProjectCosts[input.id] ?? 0) > 0,
                        ).map((input) => (
                          <div key={input.id} style={getInputStyle(input.id)}>
                            <i />
                            <b>{input.shortName}</b>
                            <strong>{formatNumber(selectedProjectCosts[input.id] ?? 0)}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section>
                      <span>CAPABILITY CREATED</span>
                      <p>{selectedProject.unlocks.map((unlock) => unlock.replaceAll("-", " ")).join(" / ")}</p>
                    </section>
                    {lockedPrerequisites.length > 0 ? (
                      <div className="research-program-lock">
                        <span>PATH INCOMPLETE</span>
                        <p>
                          First prove {lockedPrerequisites
                            .map((id) => getResearchProjectDefinition(id)?.name ?? id)
                            .join(" and ")}.
                        </p>
                      </div>
                    ) : null}
                    {state.activeProjectId && !active ? (
                      <div className="research-program-lock">
                        <span>ANALYSIS CORE OCCUPIED</span>
                        <p>
                          {getResearchProjectDefinition(state.activeProjectId)?.name ?? "Another program"} is
                          still loaded. Pause it from Core before changing the Ark&apos;s question.
                        </p>
                      </div>
                    ) : null}
                    <button
                      className="research-program-action"
                      type="button"
                      disabled={complete || (!active && !canStart)}
                      onClick={() =>
                        onStateChange(
                          selectResearchProject(state, active ? null : selectedProject.id, now),
                        )
                      }
                    >
                      {complete
                        ? "Program mastered"
                        : active
                          ? "Pause active program"
                          : progress > 0
                            ? "Resume this program"
                            : "Begin this program"}
                    </button>
                  </>
                );
              })() : (
                <div className="research-program-empty">
                  <span>NO PROGRAMS</span>
                  <p>This domain has no recoverable work in the selected era.</p>
                </div>
              )}
            </aside>
          </div>
        </section>
      ) : null}

      {view === "lattice" ? (
        <section className="research-routing-workspace" aria-label="Evidence routing machine">
          <aside className="research-reservoir-console" data-guide-target="research-evidence">
            <header>
              <span>EVIDENCE BAY // 01</span>
              <h2>Reservoirs</h2>
              <p>Ark supply is outside the machine. Loaded evidence is inside it and survives recalibration.</p>
            </header>
            <div className="research-auto-transfer-status">
              <i className={autoTransfer.common ? "is-online" : ""} />
              <div>
                <strong>{autoTransfer.common ? "COMMON EVIDENCE AUTO-LOAD" : "MANUAL TRANSFER"}</strong>
                <small>
                  {autoTransfer.common
                    ? autoTransfer.nullTraces
                      ? "All required reservoirs refill automatically."
                      : "Null Traces remain protected until an Exceptional level-5 Researcher is on duty."
                    : "Assign a level-3 Researcher and occupy one Analysis station to automate common evidence."}
                </small>
              </div>
            </div>
            <div className="research-reservoir-list">
              {RESEARCH_INPUT_DEFINITIONS.map((input) => {
                const required = Boolean((activeCosts[input.id] ?? 0) > 0);
                const external = Math.max(0, resources[input.id] ?? 0);
                const missing = network.missingInputs.includes(input.id);
                return (
                  <article
                    key={input.id}
                    className={`${required ? "is-required" : ""} ${missing ? "is-missing" : ""}`}
                    style={getInputStyle(input.id)}
                  >
                    <span className="research-reservoir-tank" aria-hidden="true">
                      <i style={{ height: `${Math.min(100, Math.max(6, state.inventory[input.id]))}%` }} />
                    </span>
                    <div>
                      <span>{input.shortName} {required ? "// REQUIRED" : ""}</span>
                      <strong>{input.name}</strong>
                      <small>{INPUT_SOURCE_COPY[input.id]}</small>
                      <p>
                        <b>{formatNumber(state.inventory[input.id])}</b> loaded
                        <span>{formatNumber(external)} in Ark supply</span>
                      </p>
                    </div>
                    <div className="research-reservoir-actions">
                      <HelpTrigger label={`How do I get ${input.name}?`} onClick={() => onOpenHelp(input.id)} />
                      <button
                        type="button"
                        disabled={external <= 0}
                        onClick={() => transferInput(input.id, Math.min(25, external))}
                      >
                        LOAD {formatNumber(Math.min(25, external))}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>

          <main className="research-routing-rig" data-guide-target="research-network">
            <header>
              <span>ROUTING FLOOR // 02</span>
              <h2>Evidence conduits</h2>
              <p>
                AXIOM assigns safe processors automatically. Bright packets are evidence moving toward the
                Analysis Core; a broken line identifies the exact hold.
              </p>
            </header>
            <div className="research-conduit-rack">
              {resolvedRoutes.map((resolvedRoute) => {
                const input = resolvedRoute.sourceId
                  ? getResearchInputDefinition(resolvedRoute.sourceId)
                  : undefined;
                const processor = resolvedRoute.processorId
                  ? getResearchProcessorDefinition(resolvedRoute.processorId)
                  : undefined;
                const missing = Boolean(
                  resolvedRoute.sourceId && network.missingInputs.includes(resolvedRoute.sourceId),
                );
                return (
                  <div
                    key={resolvedRoute.slot}
                    className={`${resolvedRoute.sourceId ? "is-connected" : "is-empty"} ${
                      resolvedRoute.enabled ? "" : "is-disabled"
                    } ${missing ? "is-missing" : ""}`}
                    style={{
                      ...(resolvedRoute.sourceId ? getInputStyle(resolvedRoute.sourceId) : {}),
                      "--route-delay": `${resolvedRoute.slot * -0.31}s`,
                    } as CSSProperties}
                  >
                    <span className="research-conduit-index">
                      {String(resolvedRoute.slot + 1).padStart(2, "0")}
                    </span>
                    <div className="research-conduit-source">
                      <span>{input?.shortName ?? "OPEN"}</span>
                      <strong>{input?.name ?? "Unrouted port"}</strong>
                      <small>{missing ? "RESERVOIR EMPTY" : input ? "SOURCE READY" : "NOT REQUIRED"}</small>
                    </div>
                    <span className="research-conduit-line" aria-hidden="true"><i /><i /></span>
                    <div className="research-conduit-processor">
                      <span className="research-conduit-rotor" aria-hidden="true"><i /><i /><i /></span>
                      <span>{processor?.code ?? "---"}</span>
                      <strong>{processor?.name ?? "No processor"}</strong>
                      <small>{processor ? `x${processor.throughputMultiplier.toFixed(2)} / ${processor.powerDraw} MW` : "STANDBY"}</small>
                    </div>
                    <span className="research-conduit-line is-output" aria-hidden="true"><i /><i /></span>
                  </div>
                );
              })}
              <div className={`research-routing-core ${coreOnline ? "is-online" : ""}`}>
                <span className="research-routing-core-rings" aria-hidden="true"><i /><i /><i /></span>
                <span>ANALYSIS CORE</span>
                <strong>{activeDefinition?.name ?? "NO PROGRAM"}</strong>
                <small>{network.stalledReason ?? `${(network.progressPerSecond * 60).toFixed(1)} work/min`}</small>
              </div>
            </div>
          </main>

          <aside className="research-operations-console" data-guide-target="research-crew">
            <header>
              <span>OPERATIONS // 03</span>
              <h2>Why it moves</h2>
            </header>
            <div className={`research-operation-state ${network.stalledReason ? "is-warning" : "is-online"}`}>
              <span>{network.stalledReason ? "HOLD CONDITION" : "SYNTHESIS NOMINAL"}</span>
              <strong>{network.stalledReason ?? network.stageLabel}</strong>
              <p>
                {network.stalledReason === "Awaiting research inputs"
                  ? "One or more required reservoirs are empty. The red reservoir on the left names what to recover."
                  : network.stalledReason
                    ? "Power, staffing, leadership, or routing is below the active stage's requirement."
                    : `${network.expertiseId.replaceAll("-", " ")} expertise is advancing this stage.`}
              </p>
            </div>
            <dl className="research-operation-readouts">
              <div><dt>Core power</dt><dd>{network.powerUsed.toFixed(0)} / {Math.max(0, powerAvailable).toFixed(0)} MW</dd></div>
              <div><dt>Stations</dt><dd>{network.crewOperating} / {network.crewRequired} optimal</dd></div>
              <div><dt>Expertise</dt><dd>x{network.expertiseMultiplier.toFixed(2)}</dd></div>
              <div><dt>Automation</dt><dd>x{network.automationMultiplier.toFixed(2)}</dd></div>
              <div><dt>Field validation</dt><dd>x{network.fieldValidationMultiplier.toFixed(2)}</dd></div>
              <div><dt>Total throughput</dt><dd>{(network.progressPerSecond * 60).toFixed(1)} / min</dd></div>
            </dl>
            <div className="research-station-control">
              <span>ANALYSIS STATIONS</span>
              <p>Only assigned, healthy, aboard personnel contribute their relevant expertise.</p>
              <div>
                <button type="button" disabled={state.assignedCrew <= 0} onClick={() => changeCrew(-1)}>-</button>
                <output>{state.assignedCrew}</output>
                <button type="button" disabled={state.assignedCrew >= availableCrew} onClick={() => changeCrew(1)}>+</button>
              </div>
              <small>{Math.max(0, availableCrew - state.assignedCrew)} crew remain available elsewhere</small>
            </div>
            <div className="research-lead-readout">
              <span>RESEARCH LEAD</span>
              <strong>{leadResearcher.name ?? "AXIOM alone"}</strong>
              <small>
                Level {leadResearcher.level}. Later eras require stronger leadership; exceptional judgment
                becomes necessary at Convergence.
              </small>
            </div>
          </aside>
        </section>
      ) : null}

      {view === "archive" ? (
        <section className="research-archive-workspace" aria-label="Research archive">
          <aside className="research-archive-index">
            <header>
              <span>ARCHIVE INDEX</span>
              <h2>{completedResearch} preserved discoveries</h2>
              <p>Select an era, then open one record. The archive no longer presents every document at once.</p>
            </header>
            <nav aria-label="Archive shelves">
              {RESEARCH_ERAS.map((candidate) => {
                const count = archiveProjects.filter(
                  (project) => getResearchProjectEra(project) === candidate.id,
                ).length;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={archiveMode === candidate.id ? "is-active" : ""}
                    disabled={count === 0}
                    onClick={() => {
                      setArchiveMode(candidate.id);
                      setArchiveEntryId(null);
                    }}
                  >
                    <span>{candidate.code}</span>
                    <strong>{candidate.name}</strong>
                    <small>{count.toString().padStart(2, "0")} records</small>
                  </button>
                );
              })}
              <button
                type="button"
                className={archiveMode === "contradictions" ? "is-active is-contradiction" : "is-contradiction"}
                disabled={echoes.length === 0}
                onClick={() => {
                  setArchiveMode("contradictions");
                  setArchiveEntryId(null);
                }}
              >
                <span>ERR</span>
                <strong>Contradictions</strong>
                <small>{echoes.length.toString().padStart(2, "0")} unsolicited</small>
              </button>
            </nav>
            <div className="research-archive-record-list">
              {archiveMode === "contradictions"
                ? echoes.map((echo, index) => (
                    <button
                      key={echo.id}
                      type="button"
                      className={(selectedEcho?.id ?? null) === echo.id ? "is-active is-contradiction" : "is-contradiction"}
                      onClick={() => setArchiveEntryId(echo.id)}
                    >
                      <span>{`${String(index + 1).padStart(2, "0")} // CAUSAL ERROR`}</span>
                      <strong>{getResearchProjectDefinition(echo.projectId)?.name ?? echo.projectId}</strong>
                    </button>
                  ))
                : archiveProjectsInMode.map((project, index) => (
                    <button
                      key={project.id}
                      type="button"
                      className={selectedArchiveProject?.id === project.id ? "is-active" : ""}
                      onClick={() => setArchiveEntryId(project.id)}
                    >
                      <span>{`${String(index + 1).padStart(2, "0")} // ${
                        BRANCHES.find((item) => item.id === project.branch)?.code
                      }`}</span>
                      <strong>{project.name}</strong>
                    </button>
                  ))}
              {archiveMode !== "contradictions" && archiveProjectsInMode.length === 0 ? (
                <p>No discoveries from this era have been preserved yet.</p>
              ) : null}
            </div>
          </aside>

          <main className={`research-archive-reader ${archiveMode === "contradictions" ? "is-contradiction" : ""}`}>
            <div className="research-archive-tablet-frame" aria-hidden="true"><i /><i /><i /><i /></div>
            {archiveMode === "contradictions" && selectedEcho ? (
              <article>
                <header>
                  <span>UNSOLICITED OUTPUT // {selectedEcho.id}</span>
                  <h2>{getResearchProjectDefinition(selectedEcho.projectId)?.name ?? "Unknown program"}</h2>
                  <b>AUTHORIZATION SIGNATURE DOES NOT MATCH</b>
                </header>
                <blockquote>{selectedEcho.text}</blockquote>
                <section>
                  <span>AXIOM NOTE</span>
                  <p>
                    This result was not part of the authorized program. It is preserved because deleting it
                    would conceal evidence; it is not treated as proven truth.
                  </p>
                </section>
                <section>
                  <span>ORIGINATING PROGRAM</span>
                  <p>{getResearchProjectDefinition(selectedEcho.projectId)?.completedSummary}</p>
                </section>
              </article>
            ) : selectedArchiveProject ? (
              <article>
                <header>
                  <span>
                    {getResearchProjectEra(selectedArchiveProject).toUpperCase()} ARCHIVE //{" "}
                    {BRANCHES.find((item) => item.id === selectedArchiveProject.branch)?.code}
                  </span>
                  <h2>{selectedArchiveProject.name}</h2>
                  <b>CAPABILITY PROVEN</b>
                </header>
                <p className="research-archive-abstract">
                  {selectedArchiveProject.contradiction ??
                    selectedArchiveProject.completedSummary}
                </p>
                <section>
                  <span>WHAT CHANGED</span>
                  <ul>
                    {selectedArchiveProject.unlocks.map((unlock) => (
                      <li key={unlock}>{unlock.replaceAll("-", " ")}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <span>WHY THE ARK KEEPS IT</span>
                  <p>{selectedArchiveProject.summary}</p>
                </section>
                {selectedArchiveProject.repeatable ? (
                  <section>
                    <span>MASTERY CYCLES</span>
                    <p>
                      {getResearchRepeatCount(state, selectedArchiveProject.id)} of{" "}
                      {selectedArchiveProject.repeatable.maxCompletions} resolved. Repeating this program
                      strengthens its bounded effect without opening a new branch.
                    </p>
                  </section>
                ) : null}
              </article>
            ) : (
              <div className="research-archive-empty">
                <span>NO RECORD SELECTED</span>
                <h2>The tablet is waiting.</h2>
                <p>Complete a program to preserve its capability here.</p>
              </div>
            )}
            <footer>
              <span>AXIOM FOUNDRY // ANALYSIS ARCHIVE</span>
              <strong>{archiveMode === "contradictions" ? "EVIDENCE, NOT VERDICT" : "PERSISTENT ACROSS RECALIBRATION"}</strong>
            </footer>
          </main>
        </section>
      ) : null}

    </section>
  );
}

export default ResearchLattice;
