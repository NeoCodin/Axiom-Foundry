"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";

import {
  RESEARCH_INPUT_DEFINITIONS,
  RESEARCH_PROCESSOR_DEFINITIONS,
  RESEARCH_PROJECT_DEFINITIONS,
  configureResearchRoute,
  getResearchInputDefinition,
  getResearchNetworkStatus,
  getResearchNullEchoes,
  getResearchProcessorDefinition,
  getResearchProjectDefinition,
  getResearchProjectPresentation,
  getResearchProjectProgress,
  getResolvedResearchRoutes,
  selectResearchProject,
  setResearchAutoRoute,
  setResearchCrew,
  setResearchRouteEnabled,
  type ResearchBranch,
  type ResearchInputBundle,
  type ResearchInputId,
  type ResearchLatticeState,
  type ResearchProcessorId,
} from "./research-engine";

import "./research-lattice.css";

export type ResearchLatticeProps = {
  state: ResearchLatticeState;
  resources?: Partial<ResearchInputBundle>;
  availableCrew: number;
  powerAvailable: number;
  externalSpeedMultiplier?: number;
  now?: number;
  onStateChange: (state: ResearchLatticeState) => void;
  onTransferInput: (inputId: ResearchInputId, amount: number) => void;
  onAssignedCrewChange?: (assignedCrew: number) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onClose?: () => void;
};

const BRANCHES: readonly {
  id: ResearchBranch;
  name: string;
  code: string;
  description: string;
}[] = [
  {
    id: "ark-engineering",
    name: "Ark Engineering",
    code: "ARK",
    description: "Power, habitation, fabrication, and departure systems.",
  },
  {
    id: "human-continuity",
    name: "Human Continuity",
    code: "HUM",
    description: "Training, medicine, settlements, and independent survival.",
  },
  {
    id: "null-studies",
    name: "Null Studies",
    code: "NUL",
    description: "Study the absence pursuing the Ark. Do not trust its metadata.",
  },
] as const;

const INPUT_ACCENTS: Record<ResearchInputId, string> = {
  "calibration-data": "72 215 235",
  "engineering-models": "100 157 255",
  "biological-samples": "111 225 153",
  "cultural-records": "236 188 104",
  "null-traces": "188 126 255",
  "axiom-proofs": "255 105 121",
};

const INPUT_SOURCE_COPY: Record<ResearchInputId, string> = {
  "calibration-data": "Core tunes + passive chamber observations",
  "engineering-models": "Machine purchases, Flux production, and infrastructure",
  "biological-samples": "18 per rescued person + 10.8 per person each hour",
  "cultural-records": "22 per rescued person + 14.4 per person each hour",
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
  now = 0,
  onStateChange,
  onTransferInput,
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
      }),
    [availableCrew, externalSpeedMultiplier, powerAvailable, state],
  );
  const echoes = getResearchNullEchoes(state);
  const activeProgress = activeDefinition
    ? getResearchProjectProgress(state, activeDefinition.id)
    : 0;
  const remainingWork = activeDefinition
    ? activeDefinition.workRequired * (1 - activeProgress)
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

  const updateSource = (slot: number, inputId: ResearchInputId | null) => {
    if (!inputId) {
      onStateChange(configureResearchRoute(state, slot, null, null));
      return;
    }
    const route = state.routes[slot];
    const currentProcessor = route.processorId
      ? getResearchProcessorDefinition(route.processorId)
      : undefined;
    const occupied = new Set(
      state.routes
        .filter((candidate) => candidate.slot !== slot)
        .map((candidate) => candidate.processorId)
        .filter(Boolean),
    );
    const processor = currentProcessor?.accepts.includes(inputId)
      ? currentProcessor
      : RESEARCH_PROCESSOR_DEFINITIONS.find(
          (candidate) =>
            candidate.accepts.includes(inputId) && !occupied.has(candidate.id),
        );
    if (processor) {
      onStateChange(configureResearchRoute(state, slot, inputId, processor.id));
    }
  };

  const updateProcessor = (
    slot: number,
    processorId: ResearchProcessorId | null,
  ) => {
    const route = state.routes[slot];
    if (!processorId || !route.sourceId) {
      onStateChange(configureResearchRoute(state, slot, null, null));
      return;
    }
    onStateChange(
      configureResearchRoute(state, slot, route.sourceId, processorId),
    );
  };

  const projectStartedAt = state.lastAdvancedAt ?? now;
  const completedResearch = state.completedProjectIds.length;
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
      className={`research-lattice-shell ${coreOnline ? "is-core-online" : "is-core-idle"} ${
        network.stalledReason ? "is-core-stalled" : ""
      }`}
      style={machineStyle}
      aria-label="Research Lattice"
    >
      <header className="research-lattice-header">
        <div>
          <p className="research-lattice-kicker">ANALYSIS DECK // SYNTHESIS ENGINE</p>
          <h1>Research Lattice</h1>
          <p>
            Feed evidence into a living machine. Every connected line wakes another
            processor; AXIOM keeps a safe route running until you choose to rewire it.
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

      <div
        className="research-lattice-awakening"
        aria-label={`${completedResearch} of 12 discoveries resolved`}
      >
        <span>CORE EVOLUTION</span>
        <div aria-hidden="true">
          {RESEARCH_PROJECT_DEFINITIONS.map((project, index) => (
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
        <strong>{completedResearch.toString().padStart(2, "0")} / 12</strong>
      </div>

      <div className="research-lattice-telemetry" aria-label="Lattice limits">
        <div>
          <span>Patch mode</span>
          <strong>{state.autoRoute ? "AXIOM ASSIST" : "HAND PATCHED"}</strong>
        </div>
        <div>
          <span>Core power</span>
          <strong className={network.powerUsed > powerAvailable ? "is-warning" : ""}>
            {network.powerUsed.toFixed(0)} / {Math.max(0, powerAvailable).toFixed(0)} MW
          </strong>
        </div>
        <div>
          <span>Researchers</span>
          <strong>
            {network.crewOperating} / {network.crewRequired} optimal
          </strong>
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
        <aside className="research-lattice-input-bank">
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

        <main className="research-lattice-network-panel">
          <div className="research-lattice-section-heading">
            <div>
              <span>02</span>
              <h2>Analysis machine</h2>
            </div>
            <div className="research-lattice-mode-switch" role="group" aria-label="Routing mode">
              <button
                type="button"
                className={state.autoRoute ? "is-active" : ""}
                onClick={() => onStateChange(setResearchAutoRoute(state, true))}
              >
                AXIOM assist
              </button>
              <button
                type="button"
                className={!state.autoRoute ? "is-active" : ""}
                onClick={() => onStateChange(setResearchAutoRoute(state, false))}
              >
                Hand patch
              </button>
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
                    {!state.autoRoute && state.routes[resolvedRoute.slot]?.sourceId ? (
                      <button
                        type="button"
                        className="research-lattice-route-toggle"
                        aria-label={`${resolvedRoute.enabled ? "Disable" : "Enable"} route ${
                          resolvedRoute.slot + 1
                        }`}
                        aria-pressed={resolvedRoute.enabled}
                        onClick={() =>
                          onStateChange(
                            setResearchRouteEnabled(
                              state,
                              resolvedRoute.slot,
                              !resolvedRoute.enabled,
                            ),
                          )
                        }
                      >
                        {resolvedRoute.enabled ? "ON" : "OFF"}
                      </button>
                    ) : null}
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

          {!state.autoRoute ? (
            <details className="research-lattice-route-editor">
              <summary>
                <span>Open manual patch panel</span>
                <small>Advanced: pair every required source with one compatible processor</small>
              </summary>
              <div className="research-lattice-route-editor-grid">
                {state.routes.map((route) => {
                  const occupiedProcessors = new Set(
                    state.routes
                      .filter((candidate) => candidate.slot !== route.slot)
                      .map((candidate) => candidate.processorId)
                      .filter(Boolean),
                  );
                  const processors = route.sourceId
                    ? RESEARCH_PROCESSOR_DEFINITIONS.filter(
                        (processor) =>
                          processor.accepts.includes(route.sourceId as ResearchInputId) &&
                          !occupiedProcessors.has(processor.id),
                      )
                    : [];
                  return (
                    <label key={route.slot}>
                      <span>PORT {String.fromCharCode(65 + route.slot)}</span>
                      <select
                        value={route.sourceId ?? ""}
                        onChange={(event) =>
                          updateSource(
                            route.slot,
                            (event.target.value || null) as ResearchInputId | null,
                          )
                        }
                      >
                        <option value="">Open source</option>
                        {RESEARCH_INPUT_DEFINITIONS.map((input) => (
                          <option value={input.id} key={input.id}>
                            {input.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={route.processorId ?? ""}
                        disabled={!route.sourceId}
                        onChange={(event) =>
                          updateProcessor(
                            route.slot,
                            (event.target.value || null) as ResearchProcessorId | null,
                          )
                        }
                      >
                        <option value="">Choose processor</option>
                        {processors.map((processor) => (
                          <option value={processor.id} key={processor.id}>
                            {processor.code} · {processor.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </details>
          ) : (
            <p className="research-lattice-auto-note">
              <b>AXIOM assist is active.</b> Required evidence is being paired with safe
              processors automatically. Hand patching can run faster, but is never required.
            </p>
          )}

          <div className="research-lattice-crew-control">
            <div>
              <span>LABOR ALLOCATION</span>
              <strong>{state.assignedCrew} researchers assigned</strong>
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

      <section className="research-lattice-projects">
        <div className="research-lattice-section-heading">
          <div>
            <span>03</span>
            <h2>Research programs</h2>
          </div>
          <small>Practical capability first. Multipliers remain capped.</small>
        </div>
        <nav className="research-lattice-branch-tabs" aria-label="Research branches">
          {BRANCHES.map((candidate) => {
            const complete = RESEARCH_PROJECT_DEFINITIONS.filter(
              (project) => project.branch === candidate.id,
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
                  style={{ "--branch-progress": `${complete / 4}` } as CSSProperties}
                >
                  {candidate.code}
                </span>
                <b>{candidate.name}</b>
                <small>{complete} / 4 resolved</small>
              </button>
            );
          })}
        </nav>
        <p className="research-lattice-branch-description">
          {BRANCHES.find((candidate) => candidate.id === branch)?.description}
        </p>
        <div className={`research-lattice-project-grid is-${branch}`}>
          {RESEARCH_PROJECT_DEFINITIONS.filter(
            (project) => project.branch === branch,
          ).map((project, index) => {
            const complete = state.completedProjectIds.includes(project.id);
            const active = state.activeProjectId === project.id;
            const locked = !project.prerequisites.every((prerequisite) =>
              state.completedProjectIds.includes(prerequisite),
            );
            const progress = getResearchProjectProgress(state, project.id);
            const presentation = getResearchProjectPresentation(state, project.id);
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
                  <b>{complete ? "RESOLVED" : active ? "ACTIVE" : locked ? "SEALED" : "READY"}</b>
                </div>
                <p>{presentation?.displaySummary ?? project.summary}</p>
                <div className="research-lattice-project-progress">
                  <i style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="research-lattice-project-costs">
                  {RESEARCH_INPUT_DEFINITIONS.filter(
                    (input) => (project.costs[input.id] ?? 0) > 0,
                  ).map((input) => (
                    <span key={input.id} style={getInputStyle(input.id)}>
                      <b>{input.shortName}</b> {formatNumber(project.costs[input.id] ?? 0)}
                    </span>
                  ))}
                </div>
                <div className="research-lattice-project-unlocks">
                  <span>Unlocks</span>
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
                    disabled={complete}
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
                    {complete ? "Research complete" : active ? "Pause program" : progress > 0 ? "Resume program" : "Begin research"}
                  </button>
                )}
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
