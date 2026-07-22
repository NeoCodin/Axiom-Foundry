"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";

import {
  RESEARCH_INPUT_DEFINITIONS,
  RESEARCH_BRANCHES,
  RESEARCH_ERAS,
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
} from "./research-engine";

import "./research-lattice.css";

export type ResearchLatticeProps = {
  state: ResearchLatticeState;
  resources?: Partial<ResearchInputBundle>;
  availableCrew: number;
  powerAvailable: number;
  externalSpeedMultiplier?: number;
  automationMultiplier?: number;
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
  "axiom-proofs": "Recalibration + passive generation from lifetime Axioms",
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
  const [branch, setBranch] = useState<ResearchBranch>(
    activeDefinition?.branch ?? "ark-engineering",
  );
  const [view, setView] = useState<ResearchView>(
    initialView ?? (state.activeProjectId || state.completedProjectIds.length > 0 ? "core" : "technology"),
  );
  const [era, setEra] = useState<ResearchEra>(
    activeDefinition ? getResearchProjectEra(activeDefinition) : getCurrentResearchEra(state),
  );
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
        fieldValidationMultiplier: fieldValidation.multiplier,
        automationMultiplier,
        expertise,
        leadResearcherLevel: leadResearcher.level,
        exceptionalLeadAvailable: leadResearcher.exceptional,
      }),
    [automationMultiplier, availableCrew, expertise, externalSpeedMultiplier, fieldValidation.multiplier, leadResearcher, powerAvailable, state],
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

  return (
    <section
      className={`research-lattice-shell is-view-${view} ${coreOnline ? "is-core-online" : "is-core-idle"} ${
        network.stalledReason ? "is-core-stalled" : ""
      }`}
      style={machineStyle}
      aria-label="Research Lattice"
    >
      <header className="research-lattice-header" data-guide-target="research-header">
        <div>
          <p className="research-lattice-kicker">ANALYSIS DECK // {RESEARCH_ERAS.find((item) => item.id === era)?.code}</p>
          <h1>{view === "core" ? "Analysis Core" : view === "technology" ? "Technology Map" : view === "lattice" ? "Research Lattice" : "Research Archive"}</h1>
          <p>
            {view === "core"
              ? "Watch the active program move from theory through prototype, field validation, and final synthesis."
              : view === "technology"
                ? "Choose one deliberate capability at a time. Later eras reveal only after earlier discoveries create a path to them."
                : view === "lattice"
                  ? "Route evidence into the living machine. AXIOM can keep a safe layout running; mastery makes it faster."
                  : "Review completed capabilities, repeatable mastery, and contradictions the lattice insists arrived from later."}
          </p>
        </div>
        <div className="research-lattice-header-actions">
          <HelpTrigger label="Open the Research page guide" withLabel onClick={() => onOpenHelp("research")} />
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
          ["core", "Core", "Active synthesis and crew contribution"],
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
        <span>{RESEARCH_ERAS.find((item) => item.id === era)?.name.toUpperCase()} ERA</span>
        <div aria-hidden="true">
          {RESEARCH_PROJECT_DEFINITIONS.filter((project) => getResearchProjectEra(project) === era && !project.repeatable).map((project, index) => (
            <i
              className={
                state.completedProjectIds.includes(project.id)
                  ? "is-lit"
                  : state.activeProjectId === project.id
                    ? "is-current"
                    : ""
              }
              key={project.id}
              style={{ "--evolution-index": index } as CSSProperties}
            />
          ))}
        </div>
        <strong>{eraProgress.complete.toString().padStart(2, "0")} / {eraProgress.total}</strong>
      </div>

      <div className="research-lattice-telemetry" aria-label="Lattice limits">
        <div>
          <span>Core power</span>
          <strong className={network.powerUsed > powerAvailable ? "is-warning" : ""}>
            {network.powerUsed.toFixed(0)} / {Math.max(0, powerAvailable).toFixed(0)} MW
          </strong>
        </div>
        <div>
          <span>Analysis stations</span>
          <strong>
            {network.crewOperating} / {network.crewRequired} optimal
          </strong>
        </div>
        <div>
          <span>{network.stageLabel}</span>
          <strong>Uses {network.expertiseId.replaceAll("-", " ")} expertise</strong>
        </div>
        <div>
          <span>Throughput</span>
          <strong>{(network.progressPerSecond * 60).toFixed(1)} work/min</strong>
        </div>
        <div>
          <span>Analysis core</span>
          <strong className={network.stalledReason ? "is-warning" : "is-online"}>
            {network.stalledReason ?? (activeDefinition ? "RESONATING" : "DORMANT")}
          </strong>
        </div>
      </div>

      <section className="research-operations-panel" data-guide-target="research-crew" aria-label="Operational expertise">
        <div>
          <span>ACTIVE STAGE</span>
          <strong>{activeDefinition ? network.stageLabel : "Awaiting a program"}</strong>
          <small>{activeDefinition ? `${network.expertiseId.replaceAll("-", " ")} expertise ×${network.expertiseMultiplier.toFixed(2)}${network.automationMultiplier > 1 ? ` · routing drones ×${network.automationMultiplier.toFixed(2)}` : ""}` : "Choose work from the Technology Map."}</small>
        </div>
        <div>
          <span>RESEARCH LEAD</span>
          <strong>{leadResearcher.name ?? "AXIOM alone"}</strong>
          <small>Level {leadResearcher.level} · Integration 3 · Synthesis 5 · Convergence 9 Exceptional</small>
        </div>
        <div>
          <span>ON-DUTY CONTRIBUTION</span>
          <strong>{Math.round(network.expertiseTotal)} {network.expertiseId.replaceAll("-", " ")}</strong>
          <small>Only healthy, assigned, aboard personnel contribute. Team Alpha&apos;s lean trains the workforce; it is not a free multiplier.</small>
        </div>
        <div>
          <span>FIELD VALIDATION</span>
          <strong>{fieldValidation.points > 0 ? `x${fieldValidation.multiplier.toFixed(2)} live evidence` : "No live evidence yet"}</strong>
          <small>
            {network.stage === "validation"
              ? fieldValidation.sources.map((source) => source.label).join(" / ") || "Research continues at base speed; field work is helpful, never mandatory."
              : `Applies only during Field Validation. ${fieldValidation.sources[0]?.detail ?? "Expeditions, planetary work, defense, medicine, and colonies can contribute."}`}
          </small>
        </div>
      </section>

      {network.stalledReason === "Awaiting research inputs" && activeDefinition && (
        <p className="research-lattice-input-guidance" role="status">
          {RESEARCH_INPUT_DEFINITIONS.filter(
            (input) =>
              (activeDefinition.costs[input.id] ?? 0) > 0 &&
              state.inventory[input.id] <= 0 &&
              (resources[input.id] ?? 0) <= 0,
          )
            .map((input) => `${input.name} exhausted — source: ${INPUT_SOURCE_COPY[input.id]}.`)
            .join(" ") || "Transfer the required evidence from the Ark supply reservoirs."}
        </p>
      )}

      <div className="research-lattice-workspace">
        <aside className="research-lattice-input-bank" data-guide-target="research-evidence">
          <div className="research-lattice-section-heading">
            <div>
              <span>01</span>
              <h2>Evidence reservoirs</h2>
            </div>
            <small>Transfer only what the machine needs</small>
          </div>
          <p className="research-lattice-input-guidance">
            Glowing reservoirs feed the selected program. Dim stores are safe to leave untouched.
          </p>
          <p className="research-lattice-input-guidance" role="status">
            {autoTransfer.common
              ? autoTransfer.nullTraces
                ? "AXIOM auto-transfer active for every required input, including Null Traces."
                : "Common evidence transfer is automated. Null Traces require an on-duty level-5 Exceptional (or better) Researcher."
              : "Common transfer unlocks with an on-duty level-3 Researcher and at least one occupied Analysis station."}
          </p>
          <div className="research-lattice-input-list">
            {RESEARCH_INPUT_DEFINITIONS.map((input) => {
              const required = Boolean(
                activeDefinition && (activeDefinition.costs[input.id] ?? 0) > 0,
              );
              const external = Math.max(0, resources[input.id] ?? 0);
              return (
                <article
                  className={`research-lattice-input ${required ? "is-required" : ""}`}
                  key={input.id}
                  style={getInputStyle(input.id)}
                >
                  <span className="research-lattice-input-vessel" aria-hidden="true">
                    <i
                      style={{
                        height: `${Math.min(100, Math.max(8, state.inventory[input.id]))}%`,
                      }}
                    />
                  </span>
                  <span className="research-lattice-input-code">{input.shortName}</span>
                  <div>
                    <div className="research-lattice-input-title">
                      <h3>{input.name}</h3>
                      <HelpTrigger label={`How do I get ${input.name}?`} onClick={() => onOpenHelp(input.id)} />
                    </div>
                    <p>{input.description}</p>
                    <small className="research-lattice-input-source">Source: {INPUT_SOURCE_COPY[input.id]}</small>
                    <div className="research-lattice-input-counts">
                      <span>
                        Lattice <b>{formatNumber(state.inventory[input.id])}</b>
                      </span>
                      <span>
                        Ark supply <b>{formatNumber(external)}</b>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={external <= 0}
                    onClick={() => transferInput(input.id, Math.min(25, external))}
                    aria-label={`Transfer ${input.name} into the lattice`}
                  >
                    +{formatNumber(Math.min(25, external))}
                  </button>
                </article>
              );
            })}
          </div>
        </aside>

        <main className="research-lattice-network-panel" data-guide-target="research-network">
          <div className="research-lattice-section-heading">
            <div>
              <span>02</span>
              <h2>Analysis machine</h2>
            </div>
          </div>

          <div
            className={`research-lattice-network ${
              activeDefinition?.branch === "null-studies" ? "is-null-project" : ""
            }`}
          >
            <div className="research-lattice-machine-rails" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="research-lattice-route-stack">
              {resolvedRoutes.map((resolvedRoute) => {
                const input = resolvedRoute.sourceId
                  ? getResearchInputDefinition(resolvedRoute.sourceId)
                  : undefined;
                const processor = resolvedRoute.processorId
                  ? getResearchProcessorDefinition(resolvedRoute.processorId)
                  : undefined;
                const isMissing = Boolean(
                  resolvedRoute.sourceId &&
                    network.missingInputs.includes(resolvedRoute.sourceId),
                );
                const routeStyle = {
                  ...(resolvedRoute.sourceId
                    ? getInputStyle(resolvedRoute.sourceId)
                    : {}),
                  "--route-delay": `${resolvedRoute.slot * -0.31}s`,
                  "--processor-rate": `${Math.max(
                    0.7,
                    3.6 - (processor?.throughputMultiplier ?? 0.75) * 1.3 - activity,
                  )}s`,
                } as CSSProperties;
                return (
                  <div
                    className={`research-lattice-route ${
                      resolvedRoute.sourceId ? "is-connected" : "is-empty"
                    } ${resolvedRoute.enabled ? "" : "is-disabled"} ${
                      isMissing ? "is-missing" : ""
                    }`}
                    key={resolvedRoute.slot}
                    style={routeStyle}
                  >
                    <span className="research-lattice-route-index">
                      {String.fromCharCode(65 + resolvedRoute.slot)}
                    </span>
                    <div className="research-lattice-source-node">
                      <span>{input?.shortName ?? "OPEN"}</span>
                      <b>{input?.name ?? "Unrouted port"}</b>
                    </div>
                    <span className="research-lattice-conduit" aria-hidden="true">
                      <i />
                    </span>
                    <div className="research-lattice-processor-node">
                      <span className="research-lattice-processor-rotor" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>{processor?.code ?? "---"}</span>
                      <b>{processor?.name ?? "No processor"}</b>
                      {processor ? (
                        <small>
                          ×{processor.throughputMultiplier.toFixed(2)} · {processor.powerDraw} MW
                        </small>
                      ) : null}
                    </div>
                    <span className="research-lattice-conduit is-output" aria-hidden="true">
                      <i />
                    </span>
                  </div>
                );
              })}
            </div>

            <article className="research-lattice-analysis-core">
              <div className="research-lattice-core-field" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="research-lattice-core-orbit" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="research-lattice-core-reactor" aria-hidden="true">
                <i />
                <i />
                <i />
                <b />
              </div>
              <div className="research-lattice-core-readout">
                <span>{coreOnline ? "LIVE SYNTHESIS" : "CORE DORMANT"}</span>
                <h3>Analysis Core</h3>
                <strong>{activeDefinition?.name ?? "Choose a program below"}</strong>
                <div className="research-lattice-core-progress" aria-hidden="true">
                  <i style={{ width: `${activeProgress * 100}%` }} />
                </div>
                <p>
                  {activeDefinition
                    ? `${(activeProgress * 100).toFixed(1)}% resolved · ETA ${formatDuration(eta)}`
                    : "Evidence will stream here when research begins."}
                </p>
              </div>
            </article>
          </div>

          <div className="research-lattice-crew-control">
            <div>
              <span>LABOR ALLOCATION</span>
              <strong>{state.assignedCrew} Analysis stations active</strong>
              <small>{Math.max(0, availableCrew - state.assignedCrew)} crew available elsewhere</small>
            </div>
            <div>
              <button
                type="button"
                disabled={state.assignedCrew <= 0}
                onClick={() => changeCrew(-1)}
                aria-label="Remove one researcher"
              >
                −
              </button>
              <output>{state.assignedCrew}</output>
              <button
                type="button"
                disabled={state.assignedCrew >= availableCrew}
                onClick={() => changeCrew(1)}
                aria-label="Assign one researcher"
              >
                +
              </button>
            </div>
          </div>
        </main>
      </div>

      <section className="research-lattice-projects" data-guide-target="research-programs">
        <div className="research-lattice-section-heading">
          <div>
            <span>03</span>
            <h2>Research programs</h2>
          </div>
          <small>Practical capability first. Multipliers remain capped.</small>
        </div>
        <nav className="research-era-tabs" aria-label="Research eras">
          {RESEARCH_ERAS.map((candidate) => {
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
                  const firstBranch = BRANCHES.find((branchCandidate) =>
                    RESEARCH_PROJECT_DEFINITIONS.some(
                      (project) =>
                        project.branch === branchCandidate.id &&
                        getResearchProjectEra(project) === candidate.id,
                    ),
                  );
                  if (firstBranch) setBranch(firstBranch.id);
                }}
              >
                <span>{candidate.code}</span>
                <strong>{candidate.name}</strong>
                <small>{available ? `${progress.complete}/${progress.total} resolved` : "SEALED"}</small>
              </button>
            );
          })}
        </nav>
        <p className="research-era-thesis">
          {RESEARCH_ERAS.find((candidate) => candidate.id === era)?.thesis}
        </p>
        <nav className="research-lattice-branch-tabs" aria-label="Research branches">
          {BRANCHES.filter((candidate) =>
            RESEARCH_PROJECT_DEFINITIONS.some(
              (project) =>
                project.branch === candidate.id &&
                getResearchProjectEra(project) === era,
            ),
          ).map((candidate) => {
            const branchProjects = RESEARCH_PROJECT_DEFINITIONS.filter(
              (project) =>
                project.branch === candidate.id &&
                getResearchProjectEra(project) === era,
            );
            const complete = RESEARCH_PROJECT_DEFINITIONS.filter(
              (project) =>
                project.branch === candidate.id &&
                getResearchProjectEra(project) === era,
            ).filter((project) => state.completedProjectIds.includes(project.id)).length;
            return (
              <button
                key={candidate.id}
                type="button"
                className={branch === candidate.id ? "is-active" : ""}
                onClick={() => setBranch(candidate.id)}
              >
                <span
                  className="research-lattice-branch-dial"
                  style={{ "--branch-progress": `${complete / Math.max(1, branchProjects.length)}` } as CSSProperties}
                >
                  {candidate.code}
                </span>
                <b>{candidate.name}</b>
                <small>{complete} / {branchProjects.length} resolved</small>
              </button>
            );
          })}
        </nav>
        <p className="research-lattice-branch-description">
          {BRANCHES.find((candidate) => candidate.id === branch)?.description}
        </p>
        <div className={`research-lattice-project-grid is-${branch}`}>
          {RESEARCH_PROJECT_DEFINITIONS.filter(
            (project) =>
              project.branch === branch && getResearchProjectEra(project) === era,
          ).map((project, index) => {
            const repeatCount = getResearchRepeatCount(state, project.id);
            const complete = project.repeatable
              ? repeatCount >= project.repeatable.maxCompletions
              : state.completedProjectIds.includes(project.id);
            const resolvedOnce = state.completedProjectIds.includes(project.id);
            const active = state.activeProjectId === project.id;
            const locked = !project.prerequisites.every((prerequisite) =>
              state.completedProjectIds.includes(prerequisite),
            );
            const progress = getResearchProjectProgress(state, project.id);
            const presentation = getResearchProjectPresentation(state, project.id);
            const projectCosts = getResearchProjectCosts(state, project);
            const canStart = canStartResearchProject(state, project.id);
            return (
              <article
                key={project.id}
                className={`research-lattice-project ${complete ? "is-complete" : ""} ${
                  active ? "is-active" : ""
                } ${locked ? "is-locked" : ""}`}
              >
                <span className="research-lattice-project-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="research-lattice-project-emblem" aria-hidden="true">
                  <i />
                  <i />
                  <b />
                </span>
                <div className="research-lattice-project-heading">
                  <div>
                    <span>{project.branch.replace("-", " ")}</span>
                    <h3>{project.name}</h3>
                  </div>
                  <b>{complete ? "MASTERED" : active ? "ACTIVE" : locked ? "SEALED" : project.repeatable && resolvedOnce ? `CYCLE ${repeatCount + 1}` : "READY"}</b>
                </div>
                <p>{presentation?.displaySummary ?? project.summary}</p>
                <div className="research-lattice-project-progress">
                  <i style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="research-lattice-project-costs">
                  <span><b>WORK</b> {formatNumber(getResearchProjectWorkRequired(state, project))}</span>
                  {RESEARCH_INPUT_DEFINITIONS.filter(
                    (input) => (projectCosts[input.id] ?? 0) > 0,
                  ).map((input) => (
                    <span key={input.id} style={getInputStyle(input.id)}>
                      <b>{input.shortName}</b> {formatNumber(projectCosts[input.id] ?? 0)}
                    </span>
                  ))}
                </div>
                <div className="research-lattice-project-unlocks">
                  <span>{project.repeatable ? `Mastery ${repeatCount}/${project.repeatable.maxCompletions}` : "Unlocks"}</span>
                  <p>{project.unlocks.map((unlock) => unlock.replaceAll("-", " ")).join(" · ")}</p>
                </div>
                {locked ? (
                  <small className="research-lattice-prerequisite">
                    Requires {project.prerequisites
                      .filter((id) => !state.completedProjectIds.includes(id))
                      .map((id) => getResearchProjectDefinition(id)?.name ?? id)
                      .join(" + ")}
                  </small>
                ) : (
                  <button
                    type="button"
                    disabled={complete || !canStart}
                    onClick={() =>
                      onStateChange(
                        selectResearchProject(
                          state,
                          active ? null : project.id,
                          now,
                        ),
                      )
                    }
                  >
                    {complete ? "Research mastered" : active ? "Pause program" : progress > 0 ? "Resume program" : project.repeatable && repeatCount > 0 ? `Begin cycle ${repeatCount + 1}` : "Begin research"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="research-lattice-archive" aria-label="Completed research archive">
        <div className="research-lattice-section-heading">
          <div><span>04</span><h2>Proven capabilities</h2></div>
          <small>{completedResearch} discoveries preserved across recalibrations</small>
        </div>
        <div className="research-archive-grid">
          {state.completedProjectIds.map((projectId) => {
            const project = getResearchProjectDefinition(projectId);
            if (!project) return null;
            const repeatCount = getResearchRepeatCount(state, project.id);
            return (
              <article key={project.id}>
                <span>{getResearchProjectEra(project).toUpperCase()} · {BRANCHES.find((item) => item.id === project.branch)?.code}</span>
                <strong>{project.name}</strong>
                <p>{project.contradiction ?? project.completedSummary}</p>
                {project.repeatable && <small>Mastery cycles {repeatCount}/{project.repeatable.maxCompletions}</small>}
              </article>
            );
          })}
        </div>
      </section>

      {echoes.length > 0 ? (
        <aside className="research-lattice-echoes" aria-label="Recovered Null contradictions">
          <header>
            <span>UNSOLICITED OUTPUT // {echoes.length.toString().padStart(2, "0")}</span>
            <h2>The lattice remembers results it has not produced.</h2>
          </header>
          <div>
            {echoes.map((echo) => (
              <blockquote key={echo.id}>
                <span>{echo.projectId.replaceAll("-", " ")}</span>
                <p>{echo.text}</p>
              </blockquote>
            ))}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

export default ResearchLattice;
