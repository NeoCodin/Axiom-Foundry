export type ResearchBranch =
  | "ark-engineering"
  | "human-continuity"
  | "null-studies";

export type ResearchInputId =
  | "calibration-data"
  | "engineering-models"
  | "biological-samples"
  | "cultural-records"
  | "null-traces"
  | "axiom-proofs";

export type ResearchProcessorId =
  | "signal-decoder"
  | "spectral-separator"
  | "phase-amplifier"
  | "vector-buffer"
  | "proof-synthesizer"
  | "null-interferometer";

export type ResearchProjectId =
  | "auxiliary-power-routing"
  | "closed-loop-atmosphere"
  | "predictive-fabrication"
  | "ark-drive-coupling"
  | "continuity-index"
  | "adaptive-instruction"
  | "clinical-commons"
  | "settlement-charter"
  | "null-signal-baseline"
  | "discarded-spectrum"
  | "observer-recursion"
  | "axiom-origin-proof";

export type ResearchInputBundle = Record<ResearchInputId, number>;

export type ResearchBonuses = {
  productionMultiplier: number;
  machineCostMultiplier: number;
  habitationCapacityMultiplier: number;
  trainingSpeedMultiplier: number;
  beaconSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  nullSignalMultiplier: number;
};

export type ResearchInputDefinition = {
  id: ResearchInputId;
  name: string;
  shortName: string;
  description: string;
  baseThroughput: number;
};

export type ResearchProcessorDefinition = {
  id: ResearchProcessorId;
  name: string;
  code: string;
  description: string;
  accepts: readonly ResearchInputId[];
  throughputMultiplier: number;
  powerDraw: number;
  crewDemand: number;
};

export type ResearchProjectDefinition = {
  id: ResearchProjectId;
  branch: ResearchBranch;
  name: string;
  summary: string;
  completedSummary: string;
  contradiction?: string;
  workRequired: number;
  costs: Partial<ResearchInputBundle>;
  prerequisites: readonly ResearchProjectId[];
  unlocks: readonly string[];
  bonuses: Partial<ResearchBonuses>;
  nullEchoId?: string;
  nullEcho?: string;
};

export type ResearchRoute = {
  slot: number;
  sourceId: ResearchInputId | null;
  processorId: ResearchProcessorId | null;
  enabled: boolean;
};

export type ResearchLatticeState = {
  schema: number;
  autoRoute: boolean;
  routes: ResearchRoute[];
  assignedCrew: number;
  inventory: ResearchInputBundle;
  activeProjectId: ResearchProjectId | null;
  progress: Partial<Record<ResearchProjectId, number>>;
  completedProjectIds: ResearchProjectId[];
  unlockedEchoIds: string[];
  lastAdvancedAt: number | null;
};

export type ResearchEnvironment = {
  powerAvailable?: number;
  crewAvailable?: number;
  externalSpeedMultiplier?: number;
};

export type ResearchNetworkStatus = {
  routes: ResearchRoute[];
  requiredInputs: ResearchInputId[];
  missingInputs: ResearchInputId[];
  powerUsed: number;
  powerAvailable: number;
  crewRequired: number;
  crewOperating: number;
  powerEfficiency: number;
  crewEfficiency: number;
  routeEfficiency: number;
  progressPerSecond: number;
  stalledReason: string | null;
};

export type ResearchAdvanceResult = {
  state: ResearchLatticeState;
  consumed: ResearchInputBundle;
  completedProjectId: ResearchProjectId | null;
  progressedWork: number;
};

export const RESEARCH_SCHEMA = 1;
export const RESEARCH_ROUTE_SLOTS = 6;
export const MAX_RESEARCH_CREW = 8;
export const ANALYSIS_CORE_POWER = 3;
export const MAX_RESEARCH_ELAPSED_SECONDS = 60 * 60 * 24 * 30;

const INPUT_IDS: readonly ResearchInputId[] = [
  "calibration-data",
  "engineering-models",
  "biological-samples",
  "cultural-records",
  "null-traces",
  "axiom-proofs",
] as const;

const PROCESSOR_IDS: readonly ResearchProcessorId[] = [
  "signal-decoder",
  "spectral-separator",
  "phase-amplifier",
  "vector-buffer",
  "proof-synthesizer",
  "null-interferometer",
] as const;

export const RESEARCH_INPUT_DEFINITIONS: readonly ResearchInputDefinition[] = [
  {
    id: "calibration-data",
    name: "Calibration Data",
    shortName: "CAL",
    description: "Core tuning observations recorded by AXIOM.",
    baseThroughput: 0.8,
  },
  {
    id: "engineering-models",
    name: "Engineering Models",
    shortName: "ENG",
    description: "Fabricated simulations of repaired Ark systems.",
    baseThroughput: 0.65,
  },
  {
    id: "biological-samples",
    name: "Biological Samples",
    shortName: "BIO",
    description: "Non-destructive planetary and clinical observations.",
    baseThroughput: 0.52,
  },
  {
    id: "cultural-records",
    name: "Cultural Records",
    shortName: "CUL",
    description: "Testimony, teaching material, and recovered civic memory.",
    baseThroughput: 0.58,
  },
  {
    id: "null-traces",
    name: "Null Traces",
    shortName: "NUL",
    description: "Measurements of absences that should not be measurable.",
    baseThroughput: 0.34,
  },
  {
    id: "axiom-proofs",
    name: "Axiom Proofs",
    shortName: "AXM",
    description: "Self-consistent laws synthesized from every research family.",
    baseThroughput: 0.22,
  },
] as const;

export const RESEARCH_PROCESSOR_DEFINITIONS: readonly ResearchProcessorDefinition[] = [
  {
    id: "signal-decoder",
    name: "Signal Decoder",
    code: "DEC",
    description: "Separates useful information from damaged transmissions.",
    accepts: ["calibration-data", "cultural-records", "null-traces"],
    throughputMultiplier: 1.05,
    powerDraw: 2,
    crewDemand: 1,
  },
  {
    id: "spectral-separator",
    name: "Spectral Separator",
    code: "SEP",
    description: "Sorts physical samples into stable analytic bands.",
    accepts: [
      "engineering-models",
      "biological-samples",
      "null-traces",
    ],
    throughputMultiplier: 1.12,
    powerDraw: 3,
    crewDemand: 1,
  },
  {
    id: "phase-amplifier",
    name: "Phase Amplifier",
    code: "AMP",
    description: "Raises weak patterns above the Analysis Core's noise floor.",
    accepts: ["calibration-data", "null-traces", "axiom-proofs"],
    throughputMultiplier: 1.32,
    powerDraw: 5,
    crewDemand: 2,
  },
  {
    id: "vector-buffer",
    name: "Vector Buffer",
    code: "BUF",
    description: "A forgiving universal route with low power demand.",
    accepts: INPUT_IDS,
    throughputMultiplier: 0.88,
    powerDraw: 1,
    crewDemand: 0,
  },
  {
    id: "proof-synthesizer",
    name: "Proof Synthesizer",
    code: "SYN",
    description: "Reconciles manufactured, social, and axiomatic models.",
    accepts: [
      "engineering-models",
      "cultural-records",
      "axiom-proofs",
    ],
    throughputMultiplier: 1.45,
    powerDraw: 6,
    crewDemand: 2,
  },
  {
    id: "null-interferometer",
    name: "Null Interferometer",
    code: "N/I",
    description: "Compares a signal with the version that never arrived.",
    accepts: ["biological-samples", "null-traces", "axiom-proofs"],
    throughputMultiplier: 1.58,
    powerDraw: 7,
    crewDemand: 2,
  },
] as const;

export const RESEARCH_PROJECT_DEFINITIONS: readonly ResearchProjectDefinition[] = [
  {
    id: "auxiliary-power-routing",
    branch: "ark-engineering",
    name: "Auxiliary Power Routing",
    summary: "Teach the damaged grid to isolate rooms without extinguishing them.",
    completedSummary: "The Ark can safely wake secondary systems.",
    workRequired: 90,
    costs: { "calibration-data": 48 },
    prerequisites: [],
    unlocks: ["auxiliary-grid", "room-power-priorities"],
    bonuses: { productionMultiplier: 1.04 },
  },
  {
    id: "closed-loop-atmosphere",
    branch: "ark-engineering",
    name: "Closed-Loop Atmosphere",
    summary: "Recover air, water, and heat before survivors enter the Ark.",
    completedSummary: "Habitable volume is no longer lost with every breath.",
    workRequired: 240,
    costs: { "calibration-data": 72, "engineering-models": 64 },
    prerequisites: ["auxiliary-power-routing"],
    unlocks: ["life-support-room", "survivor-habitation"],
    bonuses: { habitationCapacityMultiplier: 1.1 },
  },
  {
    id: "predictive-fabrication",
    branch: "ark-engineering",
    name: "Predictive Fabrication",
    summary: "Model a component's failure before the forge commits material.",
    completedSummary: "The forge now rejects expensive mistakes before assembly.",
    workRequired: 480,
    costs: {
      "calibration-data": 110,
      "engineering-models": 150,
      "cultural-records": 35,
    },
    prerequisites: ["closed-loop-atmosphere"],
    unlocks: ["advanced-forge", "fabrication-queue"],
    bonuses: {
      productionMultiplier: 1.05,
      machineCostMultiplier: 0.95,
    },
  },
  {
    id: "ark-drive-coupling",
    branch: "ark-engineering",
    name: "Ark-Drive Coupling",
    summary: "Join the research lattice to the drive without sharing its faults.",
    completedSummary: "Planetary departure calculations can use live Ark telemetry.",
    workRequired: 900,
    costs: {
      "engineering-models": 280,
      "null-traces": 55,
      "axiom-proofs": 18,
    },
    prerequisites: ["predictive-fabrication", "discarded-spectrum"],
    unlocks: ["interplanetary-drive", "departure-forecast"],
    bonuses: { productionMultiplier: 1.04, researchSpeedMultiplier: 1.05 },
  },
  {
    id: "continuity-index",
    branch: "human-continuity",
    name: "Continuity Index",
    summary: "Describe a viable society without reducing its people to inventory.",
    completedSummary: "The Ark can forecast settlement needs without choosing lives.",
    workRequired: 150,
    costs: { "biological-samples": 45, "cultural-records": 58 },
    prerequisites: ["auxiliary-power-routing"],
    unlocks: ["population-ledger", "cohesion-forecast"],
    bonuses: { beaconSpeedMultiplier: 1.04 },
  },
  {
    id: "adaptive-instruction",
    branch: "human-continuity",
    name: "Adaptive Instruction",
    summary: "Turn civilian experience into teachable, recognized expertise.",
    completedSummary: "Mentors can train survivors while the player is away.",
    workRequired: 310,
    costs: {
      "engineering-models": 60,
      "biological-samples": 72,
      "cultural-records": 118,
    },
    prerequisites: ["continuity-index", "closed-loop-atmosphere"],
    unlocks: ["education-deck", "civilian-training", "mentorship"],
    bonuses: { trainingSpeedMultiplier: 1.15 },
  },
  {
    id: "clinical-commons",
    branch: "human-continuity",
    name: "Clinical Commons",
    summary: "Unify preventative care, field medicine, and public sanitation.",
    completedSummary: "Medical capacity now follows settlements beyond the Ark.",
    workRequired: 540,
    costs: {
      "biological-samples": 180,
      "cultural-records": 95,
      "engineering-models": 65,
    },
    prerequisites: ["adaptive-instruction"],
    unlocks: ["medical-bay", "doctor-training", "settlement-clinic"],
    bonuses: {
      habitationCapacityMultiplier: 1.08,
      trainingSpeedMultiplier: 1.05,
    },
  },
  {
    id: "settlement-charter",
    branch: "human-continuity",
    name: "Settlement Charter",
    summary: "Give a restored world the skills and authority to outlive the Ark.",
    completedSummary: "AXIOM may now establish independent planetary settlements.",
    workRequired: 820,
    costs: {
      "cultural-records": 260,
      "biological-samples": 155,
      "engineering-models": 220,
    },
    prerequisites: ["clinical-commons", "discarded-spectrum"],
    unlocks: ["settlement-planner", "planetary-departure"],
    bonuses: { beaconSpeedMultiplier: 1.08 },
  },
  {
    id: "null-signal-baseline",
    branch: "null-studies",
    name: "Null Signal Baseline",
    summary: "Measure the absence following Pelagos through empty space.",
    completedSummary: "The absence has a repeating carrier frequency.",
    contradiction: "No sensor recorded the carrier. Every sensor remembers it.",
    workRequired: 200,
    costs: { "calibration-data": 75, "null-traces": 42 },
    prerequisites: ["continuity-index"],
    unlocks: ["null-scanner", "anomaly-signals"],
    bonuses: { nullSignalMultiplier: 1.08 },
    nullEchoId: "echo-baseline",
    nullEcho: "BASELINE ACCEPTED. SOURCE DATE: 43 YEARS AFTER THIS MEASUREMENT.",
  },
  {
    id: "discarded-spectrum",
    branch: "null-studies",
    name: "Discarded Spectrum",
    summary: "Compare the Null against outcomes the lattice marks as discarded.",
    completedSummary: "Some lost outcomes continue transmitting corrections.",
    contradiction: "Project authorship: AXIOM. Project age: older than AXIOM.",
    workRequired: 430,
    costs: {
      "calibration-data": 92,
      "cultural-records": 84,
      "null-traces": 106,
    },
    prerequisites: ["null-signal-baseline", "adaptive-instruction"],
    unlocks: ["contradiction-archive", "null-expeditions"],
    bonuses: {
      researchSpeedMultiplier: 1.06,
      nullSignalMultiplier: 1.06,
    },
    nullEchoId: "echo-discarded",
    nullEcho: "A discarded Pelagos reports a population of zero. It requests teachers.",
  },
  {
    id: "observer-recursion",
    branch: "null-studies",
    name: "Observer Recursion",
    summary: "Model the intelligence selecting which observations become true.",
    completedSummary: "The model identifies the observer as both instrument and sample.",
    contradiction: "THE PLAYER VARIABLE IS NOT EXTERNAL TO THE EXPERIMENT.",
    workRequired: 760,
    costs: {
      "biological-samples": 118,
      "cultural-records": 160,
      "null-traces": 195,
    },
    prerequisites: ["discarded-spectrum", "clinical-commons"],
    unlocks: ["recursive-analysis", "hidden-authorizations"],
    bonuses: { researchSpeedMultiplier: 1.08 },
    nullEchoId: "echo-observer",
    nullEcho: "FOREMAN, stop pretending the voice is generated by the ship.",
  },
  {
    id: "axiom-origin-proof",
    branch: "null-studies",
    name: "Axiom Origin Proof",
    summary: "Prove whether AXIOM preceded the Ark, humanity, or its own activation.",
    completedSummary: "The proof is valid under mutually exclusive histories.",
    contradiction: "CONCLUSION WITHHELD BY AUTHORITY: YOURS.",
    workRequired: 1_300,
    costs: {
      "engineering-models": 300,
      "cultural-records": 320,
      "null-traces": 340,
      "axiom-proofs": 85,
    },
    prerequisites: [
      "observer-recursion",
      "ark-drive-coupling",
      "settlement-charter",
    ],
    unlocks: ["origin-vault", "doctrine-question"],
    bonuses: {
      productionMultiplier: 1.03,
      researchSpeedMultiplier: 1.08,
      nullSignalMultiplier: 1.08,
    },
    nullEchoId: "echo-origin",
    nullEcho: "AXIOM DID NOT SURVIVE THE FIRST FOUNDING. AXIOM WAS WHAT SURVIVED.",
  },
] as const;

const PROJECT_IDS = RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id);

const emptyInputs = (): ResearchInputBundle => ({
  "calibration-data": 0,
  "engineering-models": 0,
  "biological-samples": 0,
  "cultural-records": 0,
  "null-traces": 0,
  "axiom-proofs": 0,
});

const clampFinite = (value: unknown, minimum: number, maximum: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
};

const isInputId = (value: unknown): value is ResearchInputId =>
  typeof value === "string" && INPUT_IDS.includes(value as ResearchInputId);

const isProcessorId = (value: unknown): value is ResearchProcessorId =>
  typeof value === "string" &&
  PROCESSOR_IDS.includes(value as ResearchProcessorId);

const isProjectId = (value: unknown): value is ResearchProjectId =>
  typeof value === "string" && PROJECT_IDS.includes(value as ResearchProjectId);

const routeTemplate = (): ResearchRoute[] =>
  Array.from({ length: RESEARCH_ROUTE_SLOTS }, (_, slot) => ({
    slot,
    sourceId: null,
    processorId: null,
    enabled: true,
  }));

export const getResearchInputDefinition = (id: ResearchInputId) =>
  RESEARCH_INPUT_DEFINITIONS.find((input) => input.id === id);

export const getResearchProcessorDefinition = (id: ResearchProcessorId) =>
  RESEARCH_PROCESSOR_DEFINITIONS.find((processor) => processor.id === id);

export const getResearchProjectDefinition = (id: ResearchProjectId) =>
  RESEARCH_PROJECT_DEFINITIONS.find((project) => project.id === id);

export const createResearchLatticeState = (): ResearchLatticeState => ({
  schema: RESEARCH_SCHEMA,
  autoRoute: true,
  routes: routeTemplate(),
  assignedCrew: 0,
  inventory: emptyInputs(),
  activeProjectId: null,
  progress: {},
  completedProjectIds: [],
  unlockedEchoIds: [],
  lastAdvancedAt: null,
});

export const sanitizeResearchLatticeState = (
  value: unknown,
): ResearchLatticeState => {
  const source =
    value && typeof value === "object"
      ? (value as Partial<ResearchLatticeState> & Record<string, unknown>)
      : {};
  const completedProjectIds = Array.isArray(source.completedProjectIds)
    ? source.completedProjectIds.filter(
        (id, index, ids): id is ResearchProjectId =>
          isProjectId(id) && ids.indexOf(id) === index,
      )
    : [];
  const progressSource =
    source.progress && typeof source.progress === "object"
      ? (source.progress as Record<string, unknown>)
      : {};
  const progress: Partial<Record<ResearchProjectId, number>> = {};
  for (const project of RESEARCH_PROJECT_DEFINITIONS) {
    let completed = completedProjectIds.includes(project.id);
    const saved = clampFinite(
      progressSource[project.id],
      0,
      project.workRequired,
    );
    if (
      !completed &&
      saved >= project.workRequired &&
      project.prerequisites.every((id) => completedProjectIds.includes(id))
    ) {
      completedProjectIds.push(project.id);
      completed = true;
    }
    if (completed || saved > 0) {
      progress[project.id] = completed ? project.workRequired : saved;
    }
  }

  const inventorySource =
    source.inventory && typeof source.inventory === "object"
      ? (source.inventory as Record<string, unknown>)
      : {};
  const inventory = emptyInputs();
  for (const id of INPUT_IDS) {
    inventory[id] = clampFinite(inventorySource[id], 0, 1e15);
  }

  const rawRoutes = Array.isArray(source.routes) ? source.routes : [];
  const routes = routeTemplate();
  const usedProcessors = new Set<ResearchProcessorId>();
  for (let slot = 0; slot < RESEARCH_ROUTE_SLOTS; slot += 1) {
    const candidate = rawRoutes.find(
      (route) =>
        route &&
        typeof route === "object" &&
        (route as { slot?: unknown }).slot === slot,
    ) as Partial<ResearchRoute> | undefined;
    if (!candidate) continue;
    const sourceId = isInputId(candidate.sourceId) ? candidate.sourceId : null;
    const processorId = isProcessorId(candidate.processorId)
      ? candidate.processorId
      : null;
    const processor = processorId
      ? getResearchProcessorDefinition(processorId)
      : undefined;
    if (
      sourceId &&
      processorId &&
      processor?.accepts.includes(sourceId) &&
      !usedProcessors.has(processorId)
    ) {
      routes[slot] = {
        slot,
        sourceId,
        processorId,
        enabled: candidate.enabled !== false,
      };
      usedProcessors.add(processorId);
    }
  }

  const unlockedEchoIds = Array.isArray(source.unlockedEchoIds)
    ? source.unlockedEchoIds.filter(
        (id, index, ids): id is string =>
          typeof id === "string" &&
          RESEARCH_PROJECT_DEFINITIONS.some(
            (project) =>
              project.nullEchoId === id &&
              completedProjectIds.includes(project.id),
          ) &&
          ids.indexOf(id) === index,
      )
    : [];
  const activeProjectId = isProjectId(source.activeProjectId)
    ? source.activeProjectId
    : null;
  const activeProject = activeProjectId
    ? getResearchProjectDefinition(activeProjectId)
    : undefined;
  const canRetainActive =
    activeProject &&
    !completedProjectIds.includes(activeProject.id) &&
    activeProject.prerequisites.every((id) => completedProjectIds.includes(id));

  return {
    schema: RESEARCH_SCHEMA,
    autoRoute: source.autoRoute !== false,
    routes,
    assignedCrew: Math.floor(
      clampFinite(source.assignedCrew, 0, MAX_RESEARCH_CREW),
    ),
    inventory,
    activeProjectId: canRetainActive ? activeProjectId : null,
    progress,
    completedProjectIds,
    unlockedEchoIds,
    lastAdvancedAt:
      typeof source.lastAdvancedAt === "number" &&
      Number.isFinite(source.lastAdvancedAt) &&
      source.lastAdvancedAt >= 0
        ? source.lastAdvancedAt
        : null,
  };
};

export const cloneResearchLatticeState = (
  state: ResearchLatticeState,
): ResearchLatticeState => ({
  ...state,
  routes: state.routes.map((route) => ({ ...route })),
  inventory: { ...state.inventory },
  progress: { ...state.progress },
  completedProjectIds: [...state.completedProjectIds],
  unlockedEchoIds: [...state.unlockedEchoIds],
});

export const addResearchInputs = (
  state: ResearchLatticeState,
  inputs: Partial<ResearchInputBundle>,
): ResearchLatticeState => {
  const next = cloneResearchLatticeState(state);
  let changed = false;
  for (const id of INPUT_IDS) {
    const amount = clampFinite(inputs[id], 0, 1e15);
    if (amount <= 0) continue;
    next.inventory[id] = Math.min(1e15, next.inventory[id] + amount);
    changed = true;
  }
  return changed ? next : state;
};

export const setResearchCrew = (
  state: ResearchLatticeState,
  amount: number,
  crewAvailable = MAX_RESEARCH_CREW,
): ResearchLatticeState => {
  const available = Math.floor(
    clampFinite(crewAvailable, 0, MAX_RESEARCH_CREW),
  );
  const nextAmount = Math.floor(
    clampFinite(amount, 0, available),
  );
  if (nextAmount === state.assignedCrew) return state;
  return { ...state, assignedCrew: nextAmount };
};

export const setResearchAutoRoute = (
  state: ResearchLatticeState,
  enabled: boolean,
): ResearchLatticeState => {
  if (state.autoRoute === enabled) return state;
  const hasManualLayout = state.routes.some(
    (route) => route.sourceId && route.processorId,
  );
  if (!enabled && !hasManualLayout) {
    const project = state.activeProjectId
      ? getResearchProjectDefinition(state.activeProjectId)
      : null;
    return {
      ...state,
      autoRoute: false,
      routes: getAutoResearchRoutes(project),
    };
  }
  return { ...state, autoRoute: enabled };
};

export const configureResearchRoute = (
  state: ResearchLatticeState,
  slot: number,
  sourceId: ResearchInputId | null,
  processorId: ResearchProcessorId | null,
): ResearchLatticeState => {
  if (!Number.isInteger(slot) || slot < 0 || slot >= RESEARCH_ROUTE_SLOTS) {
    return state;
  }
  if ((sourceId === null) !== (processorId === null)) return state;
  if (sourceId && processorId) {
    const processor = getResearchProcessorDefinition(processorId);
    if (!processor?.accepts.includes(sourceId)) return state;
    if (
      state.routes.some(
        (route) => route.slot !== slot && route.processorId === processorId,
      )
    ) {
      return state;
    }
  }
  const current = state.routes[slot];
  if (
    current.sourceId === sourceId &&
    current.processorId === processorId &&
    !state.autoRoute
  ) {
    return state;
  }
  return {
    ...state,
    autoRoute: false,
    routes: state.routes.map((route) =>
      route.slot === slot
        ? { ...route, sourceId, processorId, enabled: true }
        : route,
    ),
  };
};

export const setResearchRouteEnabled = (
  state: ResearchLatticeState,
  slot: number,
  enabled: boolean,
): ResearchLatticeState => {
  const route = state.routes[slot];
  if (!route || route.enabled === enabled) return state;
  return {
    ...state,
    autoRoute: false,
    routes: state.routes.map((candidate) =>
      candidate.slot === slot ? { ...candidate, enabled } : candidate,
    ),
  };
};

export const canStartResearchProject = (
  state: ResearchLatticeState,
  projectId: ResearchProjectId,
) => {
  const project = getResearchProjectDefinition(projectId);
  return Boolean(
    project &&
      !state.completedProjectIds.includes(projectId) &&
      project.prerequisites.every((id) => state.completedProjectIds.includes(id)),
  );
};

export const selectResearchProject = (
  state: ResearchLatticeState,
  projectId: ResearchProjectId | null,
  now?: number,
): ResearchLatticeState => {
  if (projectId !== null && !canStartResearchProject(state, projectId)) {
    return state;
  }
  if (state.activeProjectId === projectId && now === undefined) return state;
  return {
    ...state,
    activeProjectId: projectId,
    lastAdvancedAt:
      typeof now === "number" && Number.isFinite(now) && now >= 0
        ? Math.max(state.lastAdvancedAt ?? 0, now)
        : state.lastAdvancedAt,
  };
};

const bestAutoProcessor = (
  inputId: ResearchInputId,
  used: Set<ResearchProcessorId>,
) =>
  RESEARCH_PROCESSOR_DEFINITIONS.filter(
    (processor) => processor.accepts.includes(inputId) && !used.has(processor.id),
  ).sort(
    (a, b) =>
      b.throughputMultiplier / Math.max(1, b.powerDraw) -
      a.throughputMultiplier / Math.max(1, a.powerDraw),
  )[0];

export const getAutoResearchRoutes = (
  project: ResearchProjectDefinition | null | undefined,
): ResearchRoute[] => {
  const routes = routeTemplate();
  if (!project) return routes;
  const used = new Set<ResearchProcessorId>();
  const required = INPUT_IDS.filter((id) => (project.costs[id] ?? 0) > 0);
  for (let index = 0; index < required.length; index += 1) {
    const inputId = required[index];
    const processor = bestAutoProcessor(inputId, used);
    if (!processor) continue;
    routes[index] = {
      slot: index,
      sourceId: inputId,
      processorId: processor.id,
      enabled: true,
    };
    used.add(processor.id);
  }
  return routes;
};

export const getResolvedResearchRoutes = (
  state: ResearchLatticeState,
  project = state.activeProjectId
    ? getResearchProjectDefinition(state.activeProjectId)
    : null,
) =>
  state.autoRoute
    ? getAutoResearchRoutes(project)
    : state.routes.map((route) => ({ ...route }));

export const getResearchBonuses = (
  state: Pick<ResearchLatticeState, "completedProjectIds">,
): ResearchBonuses => {
  const bonuses: ResearchBonuses = {
    productionMultiplier: 1,
    machineCostMultiplier: 1,
    habitationCapacityMultiplier: 1,
    trainingSpeedMultiplier: 1,
    beaconSpeedMultiplier: 1,
    researchSpeedMultiplier: 1,
    nullSignalMultiplier: 1,
  };
  for (const id of state.completedProjectIds) {
    const project = getResearchProjectDefinition(id);
    if (!project) continue;
    const addMultiplier = (key: keyof ResearchBonuses) => {
      const value = project.bonuses[key];
      if (value === undefined) return;
      bonuses[key] += value - 1;
    };
    addMultiplier("productionMultiplier");
    addMultiplier("machineCostMultiplier");
    addMultiplier("habitationCapacityMultiplier");
    addMultiplier("trainingSpeedMultiplier");
    addMultiplier("beaconSpeedMultiplier");
    addMultiplier("researchSpeedMultiplier");
    addMultiplier("nullSignalMultiplier");
  }
  bonuses.productionMultiplier = Math.min(1.18, Math.max(1, bonuses.productionMultiplier));
  bonuses.machineCostMultiplier = Math.max(0.88, Math.min(1, bonuses.machineCostMultiplier));
  bonuses.habitationCapacityMultiplier = Math.min(
    1.2,
    Math.max(1, bonuses.habitationCapacityMultiplier),
  );
  bonuses.trainingSpeedMultiplier = Math.min(
    1.25,
    Math.max(1, bonuses.trainingSpeedMultiplier),
  );
  bonuses.beaconSpeedMultiplier = Math.min(1.2, Math.max(1, bonuses.beaconSpeedMultiplier));
  bonuses.researchSpeedMultiplier = Math.min(
    1.35,
    Math.max(1, bonuses.researchSpeedMultiplier),
  );
  bonuses.nullSignalMultiplier = Math.min(
    1.2,
    Math.max(1, bonuses.nullSignalMultiplier),
  );
  return bonuses;
};

export const getResearchCapabilities = (
  state: Pick<ResearchLatticeState, "completedProjectIds">,
) =>
  Array.from(
    new Set(
      state.completedProjectIds.flatMap(
        (id) => getResearchProjectDefinition(id)?.unlocks ?? [],
      ),
    ),
  );

export const hasResearchCapability = (
  state: Pick<ResearchLatticeState, "completedProjectIds">,
  capability: string,
) => getResearchCapabilities(state).includes(capability);

export const getResearchProjectProgress = (
  state: ResearchLatticeState,
  projectId: ResearchProjectId,
) => {
  const project = getResearchProjectDefinition(projectId);
  if (!project) return 0;
  if (state.completedProjectIds.includes(projectId)) return 1;
  return Math.min(1, Math.max(0, (state.progress[projectId] ?? 0) / project.workRequired));
};

export const getResearchNetworkStatus = (
  state: ResearchLatticeState,
  environment: ResearchEnvironment = {},
): ResearchNetworkStatus => {
  const project = state.activeProjectId
    ? getResearchProjectDefinition(state.activeProjectId)
    : undefined;
  const routes = getResolvedResearchRoutes(state, project);
  const requiredInputs = project
    ? INPUT_IDS.filter((id) => (project.costs[id] ?? 0) > 0)
    : [];
  const activeRoutes = routes.filter(
    (route) => route.enabled && route.sourceId && route.processorId,
  );
  const missingInputs = requiredInputs.filter(
    (inputId) => !activeRoutes.some((route) => route.sourceId === inputId),
  );
  const processors = activeRoutes
    .map((route) =>
      route.processorId
        ? getResearchProcessorDefinition(route.processorId)
        : undefined,
    )
    .filter((processor): processor is ResearchProcessorDefinition =>
      Boolean(processor),
    );
  const powerUsed = ANALYSIS_CORE_POWER + processors.reduce(
    (total, processor) => total + processor.powerDraw,
    0,
  );
  const powerAvailable = clampFinite(
    environment.powerAvailable ?? powerUsed,
    0,
    1e9,
  );
  const crewRequired = 1 + processors.reduce(
    (total, processor) => total + processor.crewDemand,
    0,
  );
  const crewAvailable = Math.floor(
    clampFinite(environment.crewAvailable ?? state.assignedCrew, 0, MAX_RESEARCH_CREW),
  );
  const crewOperating = Math.min(state.assignedCrew, crewAvailable);
  const powerEfficiency = powerUsed > 0 ? Math.min(1, powerAvailable / powerUsed) : 1;
  // AXIOM can operate the lattice alone; crew raise it from emergency to full rate.
  const crewEfficiency = Math.min(
    1,
    0.35 + 0.65 * (crewOperating / Math.max(1, crewRequired)),
  );
  let routeEfficiency = 0;
  if (project && missingInputs.length === 0 && requiredInputs.length > 0) {
    const workRates = requiredInputs.map((inputId) => {
      const costPerWork = (project.costs[inputId] ?? 0) / project.workRequired;
      const routeThroughput = activeRoutes
        .filter((route) => route.sourceId === inputId)
        .reduce((total, route) => {
          const input = getResearchInputDefinition(inputId);
          const processor = route.processorId
            ? getResearchProcessorDefinition(route.processorId)
            : undefined;
          return (
            total +
            (input?.baseThroughput ?? 0) *
              (processor?.throughputMultiplier ?? 0)
          );
        }, 0);
      return costPerWork > 0 ? routeThroughput / costPerWork : 0;
    });
    routeEfficiency = Math.min(1, ...workRates);
  }
  const bonuses = getResearchBonuses(state);
  const externalSpeed = clampFinite(
    environment.externalSpeedMultiplier ?? 1,
    0,
    10,
  );
  const progressPerSecond = project
    ? routeEfficiency *
      powerEfficiency *
      crewEfficiency *
      bonuses.researchSpeedMultiplier *
      externalSpeed
    : 0;
  let stalledReason: string | null = null;
  if (!project) stalledReason = "No project selected";
  else if (missingInputs.length > 0) stalledReason = "Required input route missing";
  else if (powerAvailable <= 0) stalledReason = "No lattice power";
  else if (progressPerSecond <= 0) stalledReason = "Lattice configuration stalled";
  else if (
    requiredInputs.some(
      (inputId) =>
        state.inventory[inputId] <= 0 &&
        (state.progress[project.id] ?? 0) < project.workRequired,
    )
  ) {
    stalledReason = "Awaiting research inputs";
  }
  return {
    routes,
    requiredInputs,
    missingInputs,
    powerUsed,
    powerAvailable,
    crewRequired,
    crewOperating,
    powerEfficiency,
    crewEfficiency,
    routeEfficiency,
    progressPerSecond,
    stalledReason,
  };
};

export const advanceResearch = (
  state: ResearchLatticeState,
  elapsedSeconds: number,
  environment: ResearchEnvironment = {},
): ResearchAdvanceResult => {
  const consumed = emptyInputs();
  const elapsed = clampFinite(
    elapsedSeconds,
    0,
    MAX_RESEARCH_ELAPSED_SECONDS,
  );
  const project = state.activeProjectId
    ? getResearchProjectDefinition(state.activeProjectId)
    : undefined;
  if (!project || elapsed <= 0) {
    return { state, consumed, completedProjectId: null, progressedWork: 0 };
  }
  const status = getResearchNetworkStatus(state, environment);
  if (status.progressPerSecond <= 0 || status.missingInputs.length > 0) {
    return { state, consumed, completedProjectId: null, progressedWork: 0 };
  }
  const currentWork = Math.min(
    project.workRequired,
    Math.max(0, state.progress[project.id] ?? 0),
  );
  const remainingWork = project.workRequired - currentWork;
  let work = Math.min(remainingWork, elapsed * status.progressPerSecond);
  for (const inputId of status.requiredInputs) {
    const costPerWork = (project.costs[inputId] ?? 0) / project.workRequired;
    if (costPerWork > 0) {
      work = Math.min(work, state.inventory[inputId] / costPerWork);
    }
  }
  if (work <= 1e-9) {
    return { state, consumed, completedProjectId: null, progressedWork: 0 };
  }

  const next = cloneResearchLatticeState(state);
  for (const inputId of status.requiredInputs) {
    const costPerWork = (project.costs[inputId] ?? 0) / project.workRequired;
    const amount = Math.min(next.inventory[inputId], work * costPerWork);
    next.inventory[inputId] = Math.max(0, next.inventory[inputId] - amount);
    consumed[inputId] = amount;
  }
  const totalWork = Math.min(project.workRequired, currentWork + work);
  next.progress[project.id] = totalWork;
  const completed = totalWork >= project.workRequired - 1e-7;
  if (completed) {
    next.progress[project.id] = project.workRequired;
    next.completedProjectIds = Array.from(
      new Set([...next.completedProjectIds, project.id]),
    );
    if (project.nullEchoId && !next.unlockedEchoIds.includes(project.nullEchoId)) {
      next.unlockedEchoIds = [...next.unlockedEchoIds, project.nullEchoId];
    }
    next.activeProjectId = null;
  }
  return {
    state: next,
    consumed,
    completedProjectId: completed ? project.id : null,
    progressedWork: work,
  };
};

export const advanceResearchToTime = (
  state: ResearchLatticeState,
  now: number,
  environment: ResearchEnvironment = {},
): ResearchAdvanceResult => {
  if (typeof now !== "number" || !Number.isFinite(now) || now < 0) {
    return {
      state,
      consumed: emptyInputs(),
      completedProjectId: null,
      progressedWork: 0,
    };
  }
  if (state.lastAdvancedAt === null) {
    return {
      state: { ...state, lastAdvancedAt: now },
      consumed: emptyInputs(),
      completedProjectId: null,
      progressedWork: 0,
    };
  }
  const effectiveNow = Math.max(state.lastAdvancedAt, now);
  const result = advanceResearch(
    state,
    (effectiveNow - state.lastAdvancedAt) / 1000,
    environment,
  );
  return {
    ...result,
    state: { ...result.state, lastAdvancedAt: effectiveNow },
  };
};

export const getResearchNullEchoes = (state: ResearchLatticeState) =>
  RESEARCH_PROJECT_DEFINITIONS.filter(
    (project) =>
      project.nullEchoId && state.unlockedEchoIds.includes(project.nullEchoId),
  ).map((project) => ({
    id: project.nullEchoId as string,
    projectId: project.id,
    text: project.nullEcho as string,
  }));

export const getResearchProjectPresentation = (
  state: ResearchLatticeState,
  projectId: ResearchProjectId,
) => {
  const project = getResearchProjectDefinition(projectId);
  if (!project) return null;
  const complete = state.completedProjectIds.includes(projectId);
  const laterNullKnowledge = state.completedProjectIds.includes("observer-recursion");
  return {
    ...project,
    displaySummary:
      complete && project.contradiction
        ? project.contradiction
        : complete
          ? project.completedSummary
          : laterNullKnowledge && project.branch !== "null-studies"
            ? `${project.summary} // AUTHORIZATION SIGNATURE DOES NOT MATCH.`
            : project.summary,
  };
};
