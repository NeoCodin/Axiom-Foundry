export type ResearchBranch =
  | "ark-engineering"
  | "human-continuity"
  | "medicine-biology"
  | "planetary-sciences"
  | "robotics-automation"
  | "null-studies"
  | "threat-operations"
  | "axiom-theory";

export type ResearchEra =
  | "recovery"
  | "integration"
  | "synthesis"
  | "convergence";

export type ResearchStageId =
  | "theory"
  | "prototype"
  | "validation"
  | "synthesis";

export type ResearchExpertiseId =
  | "research"
  | "engineering"
  | "fabrication"
  | "medicine"
  | "education"
  | "field"
  | "navigation"
  | "ecology";

export type ResearchExpertise = Record<ResearchExpertiseId, number>;

export type ResearchInputId =
  | "calibration-data"
  | "engineering-models"
  | "biological-samples"
  | "cultural-records"
  | "schematics"
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
  | "axiom-origin-proof"
  | "expedition-armaments"
  | "arc-discharge-weapons"
  | "null-edge-armaments"
  | "composite-plating"
  | "reactive-shell"
  | "aegis-frame"
  | "prosthetic-fabrication"
  | "surface-reconnaissance"
  | "planetary-epidemiology"
  | "automated-personnel-logistics"
  | "medical-assistance-drones"
  | "defensive-forecasting"
  | "human-potential-mapping"
  | "pattern-architecture"
  | "recursive-manufacturing"
  | "specialized-field-loadouts"
  | "autonomous-repair-swarms"
  | "lattice-routing-automata"
  | "expedition-support-drones"
  | "planetary-construction-machines"
  | "continuity-scaffolding"
  | "synthetic-ecosystem-design"
  | "resonant-weapon-dynamics"
  | "impossible-material-synthesis"
  | "temporal-signal-analysis"
  | "causal-threat-projection"
  | "interceptor-control-systems"
  | "axiomatic-identity-preservation"
  | "retrograde-material-analysis"
  | "causal-cartography"
  | "returned-origin-hypothesis"
  | "voluntary-adaptation-charter"
  | "atmospheric-symbiosis"
  | "radiation-memory-therapy"
  | "null-exposure-conditioning"
  | "prosthetic-neural-bridge"
  | "cognitive-assistance-interface"
  | "field-endurance-remodeling"
  | "equipment-stress-tests"
  | "colony-data-integration"
  | "null-signal-triangulation"
  | "resonance-stabilization"
  | "axiomatic-stellarization"
  | "convergence-envelope";

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
  /** Older saves predate eras; legacy projects are classified by helper. */
  era?: ResearchEra;
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
  /** A completed repeatable may be run again up to this many times. */
  repeatable?: {
    maxCompletions: number;
    workGrowth: number;
    costGrowth: number;
  };
};

export type ResearchRoute = {
  slot: number;
  sourceId: ResearchInputId | null;
  processorId: ResearchProcessorId | null;
  enabled: boolean;
};

export type ResearchLatticeState = {
  schema: number;
  assignedCrew: number;
  inventory: ResearchInputBundle;
  activeProjectId: ResearchProjectId | null;
  progress: Partial<Record<ResearchProjectId, number>>;
  repeatCounts: Partial<Record<ResearchProjectId, number>>;
  completedProjectIds: ResearchProjectId[];
  unlockedEchoIds: string[];
  lastAdvancedAt: number | null;
};

export type ResearchEnvironment = {
  powerAvailable?: number;
  crewAvailable?: number;
  externalSpeedMultiplier?: number;
  /**
   * Visible campaign, Ark-room, and colony effects that alter the amount of
   * evidence consumed per unit of completed research. Work time is unchanged.
   */
  costMultiplier?: number;
  /**
   * Evidence produced by real Ark, expedition, defense, and colony work.
   * Applied only during Field Validation so other systems support research
   * without becoming a hidden prerequisite.
   */
  fieldValidationMultiplier?: number;
  /** Utility drones support Prototype and Field Validation work only. */
  automationMultiplier?: number;
  expertise?: Partial<ResearchExpertise>;
  leadResearcherLevel?: number;
  exceptionalLeadAvailable?: boolean;
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
  stage: ResearchStageId;
  stageLabel: string;
  expertiseId: ResearchExpertiseId;
  expertiseTotal: number;
  expertiseMultiplier: number;
  fieldValidationMultiplier: number;
  automationMultiplier: number;
  leadRequirementLevel: number;
  leadRequirementMet: boolean;
  progressPerSecond: number;
  stalledReason: string | null;
};

export type ResearchAdvanceResult = {
  state: ResearchLatticeState;
  consumed: ResearchInputBundle;
  completedProjectId: ResearchProjectId | null;
  progressedWork: number;
};

export const RESEARCH_SCHEMA = 2;
export const RESEARCH_ROUTE_SLOTS = 6;
export const MAX_RESEARCH_CREW = 8;
export const ANALYSIS_CORE_POWER = 3;
export const MAX_RESEARCH_ELAPSED_SECONDS = 60 * 60 * 24 * 30;

export const RESEARCH_ERAS: readonly {
  id: ResearchEra;
  name: string;
  code: string;
  thesis: string;
}[] = [
  {
    id: "recovery",
    name: "Recovery",
    code: "ERA I",
    thesis: "Make the Ark survivable, measurable, and capable of receiving witnesses.",
  },
  {
    id: "integration",
    name: "Integration",
    code: "ERA II",
    thesis: "Join people, machines, medicine, and planetary evidence into one working system.",
  },
  {
    id: "synthesis",
    name: "Synthesis",
    code: "ERA III",
    thesis: "Create capabilities no recovered archive contained on its own.",
  },
  {
    id: "convergence",
    name: "Convergence",
    code: "ERA IV",
    thesis: "Test whether the laws preserving life are also teaching the Null how to follow it.",
  },
] as const;

export const RESEARCH_BRANCHES: readonly {
  id: ResearchBranch;
  name: string;
  code: string;
  description: string;
}[] = [
  { id: "ark-engineering", name: "Ark Engineering", code: "ARK", description: "Power, habitation, fabrication, and the systems that keep the Ark moving." },
  { id: "human-continuity", name: "Human Continuity", code: "HUM", description: "Education, civic memory, settlement design, and individual potential." },
  { id: "medicine-biology", name: "Medicine & Biology", code: "BIO", description: "Clinical practice, ecology, adaptation, and living systems." },
  { id: "planetary-sciences", name: "Planetary Sciences", code: "PLN", description: "Surface reconnaissance, world restoration, and colony evidence." },
  { id: "robotics-automation", name: "Robotics & Automation", code: "ROB", description: "Bounded automation that repairs work without replacing human judgment." },
  { id: "threat-operations", name: "Threat Operations", code: "THR", description: "Expedition equipment, defensive forecasting, and field survival." },
  { id: "null-studies", name: "Null Studies", code: "NUL", description: "Study the absence pursuing the Ark. Do not trust its metadata." },
  { id: "axiom-theory", name: "Axiom Theory", code: "AXM", description: "The laws behind recalibration, identity, and impossible material behavior." },
] as const;

export const RESEARCH_STAGES: readonly {
  id: ResearchStageId;
  name: string;
  start: number;
  end: number;
}[] = [
  { id: "theory", name: "Theoretical Analysis", start: 0, end: 0.25 },
  { id: "prototype", name: "Prototype", start: 0.25, end: 0.55 },
  { id: "validation", name: "Field Validation", start: 0.55, end: 0.8 },
  { id: "synthesis", name: "Final Synthesis", start: 0.8, end: 1 },
] as const;

export const EMPTY_RESEARCH_EXPERTISE: ResearchExpertise = {
  research: 0,
  engineering: 0,
  fabrication: 0,
  medicine: 0,
  education: 0,
  field: 0,
  navigation: 0,
  ecology: 0,
};

const INPUT_IDS: readonly ResearchInputId[] = [
  "calibration-data",
  "engineering-models",
  "biological-samples",
  "cultural-records",
  "schematics",
  "null-traces",
  "axiom-proofs",
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
    id: "schematics",
    name: "Recovered Schematics",
    shortName: "SCH",
    description:
      "Working designs carried home by rescued survivors and expedition crews. No machine aboard can generate them.",
    baseThroughput: 0.3,
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
      "schematics",
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
      "schematics",
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
    id: "resonance-stabilization",
    branch: "axiom-theory",
    era: "recovery",
    name: "Resonance Stabilization",
    summary: "Prove that the three portable laws can share one stellar core without erasing one another.",
    completedSummary: "The Law-Heart may stabilize its sixth Axiom and enter the Resonant spectrum.",
    workRequired: 520,
    costs: { "calibration-data": 110, "engineering-models": 80 },
    prerequisites: [],
    unlocks: ["law-heart-resonant-spectrum", "axiom-capacity-6"],
    bonuses: { researchSpeedMultiplier: 1.02 },
  },
  {
    id: "auxiliary-power-routing",
    branch: "ark-engineering",
    name: "Auxiliary Power Routing",
    summary: "Turn Pelagos field logs into a safe method for isolating damaged settlement grids.",
    completedSummary: "The Ark can reproduce Pelagos-style emergency routing on later worlds.",
    workRequired: 180,
    costs: { "calibration-data": 60 },
    prerequisites: [],
    unlocks: ["auxiliary-grid", "room-power-priorities"],
    bonuses: { productionMultiplier: 1.04 },
  },
  {
    id: "closed-loop-atmosphere",
    branch: "ark-engineering",
    name: "Closed-Loop Atmosphere",
    summary: "Generalize Pelagos habitat records into sealed air, water, and heat standards for future settlements.",
    completedSummary: "Pelagos survival practice is now a repeatable closed-loop habitation model.",
    workRequired: 500,
    costs: { "calibration-data": 100, "engineering-models": 90 },
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
    workRequired: 1_400,
    costs: {
      "calibration-data": 220,
      "engineering-models": 300,
      "cultural-records": 70,
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
    workRequired: 8_000,
    costs: {
      "engineering-models": 900,
      "null-traces": 240,
      "axiom-proofs": 50,
    },
    prerequisites: ["predictive-fabrication", "discarded-spectrum"],
    unlocks: ["interplanetary-drive", "departure-forecast"],
    bonuses: { productionMultiplier: 1.04, researchSpeedMultiplier: 1.05 },
  },
  {
    id: "continuity-index",
    branch: "human-continuity",
    name: "Continuity Index",
    summary: "Study Pelagos's first founders and describe viability without reducing people to inventory.",
    completedSummary: "Pelagos becomes the first evidence behind an ethical Continuity forecast.",
    workRequired: 360,
    costs: { "biological-samples": 75, "cultural-records": 90 },
    prerequisites: ["auxiliary-power-routing"],
    unlocks: ["population-ledger", "cohesion-forecast"],
    bonuses: { beaconSpeedMultiplier: 1.04 },
  },
  {
    id: "adaptive-instruction",
    branch: "human-continuity",
    name: "Adaptive Instruction",
    summary: "Translate the knowledge carried by Pelagos's founders into teachable, recognized expertise.",
    completedSummary: "Pelagos's lived experience becomes an Ark-wide mentorship curriculum.",
    workRequired: 900,
    costs: {
      "engineering-models": 100,
      "biological-samples": 110,
      "cultural-records": 170,
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
    workRequired: 2_400,
    costs: {
      "biological-samples": 360,
      "cultural-records": 200,
      "engineering-models": 120,
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
    workRequired: 4_800,
    costs: {
      "cultural-records": 520,
      "biological-samples": 300,
      "engineering-models": 440,
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
    workRequired: 650,
    costs: { "calibration-data": 120, "null-traces": 60 },
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
    workRequired: 2_600,
    costs: {
      "calibration-data": 180,
      "cultural-records": 180,
      "null-traces": 220,
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
    workRequired: 7_200,
    costs: {
      "biological-samples": 320,
      "cultural-records": 500,
      "null-traces": 560,
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
    workRequired: 24_000,
    costs: {
      "engineering-models": 1_600,
      "cultural-records": 1_400,
      "null-traces": 1_500,
      "axiom-proofs": 160,
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
  {
    id: "prosthetic-fabrication",
    branch: "human-continuity",
    name: "Prosthetic Fabrication",
    summary:
      "Print load-bearing prosthetics tuned to each patient's own clinical record.",
    completedSummary:
      "The medical bay can now repair permanent injuries. Nobody stays broken.",
    workRequired: 2_800,
    costs: {
      "biological-samples": 300,
      schematics: 160,
      "null-traces": 80,
    },
    prerequisites: ["clinical-commons"],
    unlocks: ["prosthetic-surgery"],
    bonuses: {},
  },
  {
    id: "expedition-armaments",
    branch: "threat-operations",
    name: "Expedition Armaments",
    summary:
      "Forge kinetic pikes so expedition crews stop improvising with salvage tools.",
    completedSummary: "The Foundry can produce Kinetic Pikes.",
    contradiction:
      "CONTINUITY PROTOCOL OBJECTION 01: THE ARK PRESERVES. THE ARK DOES NOT ARM. OBJECTION LOGGED, NOT ENFORCED.",
    workRequired: 1_500,
    costs: { "calibration-data": 120, schematics: 90 },
    prerequisites: ["predictive-fabrication"],
    unlocks: ["armory-weapons-t1"],
    bonuses: {},
  },
  {
    id: "arc-discharge-weapons",
    branch: "threat-operations",
    name: "Arc Discharge Weapons",
    summary:
      "Tune directed-discharge carbines to the Ark's own power signature.",
    completedSummary: "The Foundry can produce Arc Carbines.",
    contradiction:
      "CONTINUITY PROTOCOL OBJECTION 02: A WEAPONIZED AXIOM HAS ALREADY COST YOU EVERYTHING ONCE. DATE OF INCIDENT: WITHHELD.",
    workRequired: 3_400,
    costs: { "calibration-data": 220, schematics: 180 },
    prerequisites: ["expedition-armaments"],
    unlocks: ["armory-weapons-t2"],
    bonuses: {},
  },
  {
    id: "null-edge-armaments",
    branch: "threat-operations",
    name: "Null-Edge Armaments",
    summary: "Shape enforced absence into a blade only masters can hold.",
    completedSummary: "The Foundry can produce Null Lances.",
    contradiction:
      "CONTINUITY PROTOCOL OBJECTION 03: THE NULL DID NOT TEACH YOU THIS. YOU TAUGHT IT TO THE NULL.",
    workRequired: 8_000,
    costs: { schematics: 320, "null-traces": 320 },
    prerequisites: ["arc-discharge-weapons"],
    unlocks: ["armory-weapons-t3"],
    bonuses: {},
  },
  {
    id: "composite-plating",
    branch: "threat-operations",
    name: "Composite Plating",
    summary: "Weave fabrication mesh that keeps expedition wounds survivable.",
    completedSummary: "The Foundry can produce Composite Weave armor.",
    workRequired: 1_400,
    costs: { schematics: 100 },
    prerequisites: ["predictive-fabrication"],
    unlocks: ["armory-armor-t1"],
    bonuses: {},
  },
  {
    id: "reactive-shell",
    branch: "threat-operations",
    name: "Reactive Shell",
    summary: "Segmented plate absorbs an impact by stiffening around the wearer.",
    completedSummary: "The Foundry can produce Reactive Shell armor.",
    workRequired: 3_200,
    costs: { schematics: 220, "biological-samples": 120 },
    prerequisites: ["composite-plating"],
    unlocks: ["armory-armor-t2"],
    bonuses: {},
  },
  {
    id: "aegis-frame",
    branch: "threat-operations",
    name: "Aegis Frame",
    summary: "A powered exoframe that takes the hit so its wearer barely notices.",
    completedSummary: "The Foundry can produce Aegis Frames.",
    workRequired: 7_800,
    costs: {
      schematics: 340,
      "biological-samples": 200,
      "null-traces": 220,
    },
    prerequisites: ["reactive-shell"],
    unlocks: ["armory-armor-t3"],
    bonuses: {},
  },
  {
    id: "surface-reconnaissance",
    branch: "planetary-sciences",
    era: "integration",
    name: "Surface Reconnaissance",
    summary: "Turn expedition telemetry into a persistent model of each recovering world.",
    completedSummary: "Every landing now updates the Ark's shared planetary map.",
    workRequired: 2_400,
    costs: { "calibration-data": 180, "engineering-models": 220, "cultural-records": 120 },
    prerequisites: ["continuity-index", "predictive-fabrication"],
    unlocks: ["planetary-field-model", "survey-data-integration"],
    bonuses: { beaconSpeedMultiplier: 1.03 },
  },
  {
    id: "planetary-epidemiology",
    branch: "medicine-biology",
    era: "integration",
    name: "Planetary Epidemiology",
    summary: "Model illness as an interaction between people, settlements, and damaged worlds.",
    completedSummary: "The Medical Bay can anticipate planetary outbreaks before they become evacuation orders.",
    workRequired: 3_200,
    costs: { "biological-samples": 420, "cultural-records": 210, "engineering-models": 160 },
    prerequisites: ["clinical-commons", "surface-reconnaissance"],
    unlocks: ["epidemic-forecasting", "planetary-clinical-protocols"],
    bonuses: { habitationCapacityMultiplier: 1.03 },
  },
  {
    id: "automated-personnel-logistics",
    branch: "robotics-automation",
    era: "integration",
    name: "Automated Personnel Logistics",
    summary: "Let AXIOM restore routine stations after recovery, study, rescue, and deployment.",
    completedSummary: "The Ark can refill routine work without overriding protected assignments.",
    workRequired: 2_800,
    costs: { "engineering-models": 360, "cultural-records": 260, schematics: 60 },
    prerequisites: ["adaptive-instruction", "predictive-fabrication"],
    unlocks: ["staffing-doctrine-v2", "crew-contribution-telemetry"],
    bonuses: { trainingSpeedMultiplier: 1.03 },
  },
  {
    id: "medical-assistance-drones",
    branch: "robotics-automation",
    era: "integration",
    name: "Medical Assistance Drones",
    summary: "Teach sterile utility frames to hold instruments, monitor patients, and follow a Doctor's orders.",
    completedSummary: "Allocated medical drones multiply staffed care without diagnosing or treating anyone alone.",
    workRequired: 4_200,
    costs: { "engineering-models": 480, "biological-samples": 320, schematics: 100 },
    prerequisites: ["automated-personnel-logistics", "clinical-commons"],
    unlocks: ["drone-program-medical-assistance"],
    bonuses: {},
  },
  {
    id: "defensive-forecasting",
    branch: "threat-operations",
    era: "integration",
    name: "Defensive Forecasting",
    summary: "Project dangerous approaches before an expedition or hostile contact begins.",
    completedSummary: "Threat previews now compare crew mastery, equipment, and environmental risk.",
    workRequired: 3_600,
    costs: { "calibration-data": 220, "engineering-models": 300, schematics: 90 },
    prerequisites: ["surface-reconnaissance", "expedition-armaments"],
    unlocks: ["threat-projection", "defense-analysis"],
    bonuses: {},
  },
  {
    id: "human-potential-mapping",
    branch: "human-continuity",
    era: "integration",
    name: "Human Potential Mapping",
    summary: "Build an ethical method for recognizing mastered potential without rewriting a person's identity.",
    completedSummary: "Mastered Standard personnel may be elevated to a Notable service profile.",
    workRequired: 3_400,
    costs: { "cultural-records": 420, "biological-samples": 180, "axiom-proofs": 6 },
    prerequisites: ["adaptive-instruction", "continuity-index"],
    unlocks: ["profile-elevation-notable"],
    bonuses: {},
  },
  {
    id: "pattern-architecture",
    branch: "ark-engineering",
    era: "integration",
    name: "Pattern Architecture",
    summary: "Standardize equipment frames using measured failure data.",
    completedSummary: "The Armory may establish the Standardized Patterns law.",
    workRequired: 3_800,
    costs: { "engineering-models": 440, schematics: 120, "calibration-data": 160 },
    prerequisites: ["predictive-fabrication", "expedition-armaments"],
    unlocks: ["armory-law-standardized-patterns"],
    bonuses: { machineCostMultiplier: 0.98 },
  },
  {
    id: "axiomatic-stellarization",
    branch: "axiom-theory",
    era: "integration",
    name: "Axiomatic Stellarization",
    summary: "Bind a dozen proven laws into one luminous core without allowing any law to dominate the others.",
    completedSummary: "The Law-Heart may stabilize its twelfth Axiom and enter the Axiomatic spectrum.",
    workRequired: 5_200,
    costs: {
      "calibration-data": 520,
      "engineering-models": 440,
      "null-traces": 160,
      "axiom-proofs": 16,
    },
    prerequisites: ["resonance-stabilization", "discarded-spectrum"],
    unlocks: ["law-heart-axiomatic-spectrum", "axiom-capacity-12"],
    bonuses: { productionMultiplier: 1.02 },
  },
  {
    id: "recursive-manufacturing",
    branch: "robotics-automation",
    era: "synthesis",
    name: "Recursive Manufacturing",
    summary: "Make every completed Armory project improve the fixture that built it.",
    completedSummary: "The Armory may establish the Recursive Forging law.",
    workRequired: 8_500,
    costs: { "engineering-models": 850, schematics: 220, "null-traces": 120 },
    prerequisites: ["pattern-architecture", "ark-drive-coupling"],
    unlocks: ["armory-law-recursive-forging", "self-correcting-fixtures"],
    bonuses: { productionMultiplier: 1.02 },
  },
  {
    id: "specialized-field-loadouts",
    branch: "threat-operations",
    era: "synthesis",
    name: "Specialized Field Loadouts",
    summary: "Save equipment modifications as reusable mission doctrine.",
    completedSummary: "Expedition planners can fit role-specific equipment modifications.",
    workRequired: 7_200,
    costs: { schematics: 260, "engineering-models": 620, "biological-samples": 240 },
    prerequisites: ["arc-discharge-weapons", "reactive-shell", "defensive-forecasting"],
    unlocks: ["advanced-armory-modifications"],
    bonuses: {},
  },
  {
    id: "autonomous-repair-swarms",
    branch: "robotics-automation",
    era: "synthesis",
    name: "Autonomous Repair Swarms",
    summary: "Coordinate small repair units that stabilize damage while skilled crew decide what must be rebuilt.",
    completedSummary: "Routine damage control can continue while engineers sleep or deploy.",
    workRequired: 10_500,
    costs: { "engineering-models": 1_050, schematics: 280, "calibration-data": 420 },
    prerequisites: ["recursive-manufacturing", "defensive-forecasting"],
    unlocks: ["repair-swarms", "automated-damage-control"],
    bonuses: { habitationCapacityMultiplier: 1.02 },
  },
  {
    id: "lattice-routing-automata",
    branch: "robotics-automation",
    era: "synthesis",
    name: "Lattice Routing Automata",
    summary: "Let utility frames reconfigure physical evidence routes while Researchers interpret the result.",
    completedSummary: "Allocated routing drones accelerate Prototype and Field Validation stages beside active researchers.",
    workRequired: 11_800,
    costs: { "engineering-models": 1_100, schematics: 310, "calibration-data": 520 },
    prerequisites: ["automated-personnel-logistics", "recursive-manufacturing"],
    unlocks: ["drone-program-research-routing"],
    bonuses: {},
  },
  {
    id: "expedition-support-drones",
    branch: "robotics-automation",
    era: "synthesis",
    name: "Expedition Support Drones",
    summary: "Package recovery line, instruments, and emergency material into a field-safe utility frame.",
    completedSummary: "One allocated drone can support an expedition without taking a crew position.",
    workRequired: 12_600,
    costs: { "engineering-models": 1_020, schematics: 360, "biological-samples": 260 },
    prerequisites: ["specialized-field-loadouts", "autonomous-repair-swarms"],
    unlocks: ["drone-program-expedition-support"],
    bonuses: {},
  },
  {
    id: "planetary-construction-machines",
    branch: "robotics-automation",
    era: "synthesis",
    name: "Planetary Construction Machines",
    summary: "Rebuild utility frames for anchor foundations, orbital shield relays, and local repair yards.",
    completedSummary: "Allocated construction frames shorten planetary defense projects directed by Engineers.",
    workRequired: 14_500,
    costs: { "engineering-models": 1_350, schematics: 420, "cultural-records": 420 },
    prerequisites: ["autonomous-repair-swarms", "synthetic-ecosystem-design"],
    unlocks: ["drone-program-planetary-construction"],
    bonuses: {},
  },
  {
    id: "continuity-scaffolding",
    branch: "human-continuity",
    era: "synthesis",
    name: "Continuity Scaffolding",
    summary: "Preserve a person's learned identity while expanding the range of work they can master.",
    completedSummary: "Mastered Notable personnel may be elevated to an Exceptional service profile.",
    workRequired: 11_000,
    costs: { "cultural-records": 1_000, "biological-samples": 440, "axiom-proofs": 24 },
    prerequisites: ["human-potential-mapping", "settlement-charter"],
    unlocks: ["profile-elevation-exceptional"],
    bonuses: { trainingSpeedMultiplier: 1.03 },
  },
  {
    id: "synthetic-ecosystem-design",
    branch: "medicine-biology",
    era: "synthesis",
    name: "Synthetic Ecosystem Design",
    summary: "Rebuild food, medicine, and atmosphere as one planetary living system.",
    completedSummary: "Restored settlements can establish resilient local ecologies.",
    workRequired: 12_500,
    costs: { "biological-samples": 1_250, "cultural-records": 560, "engineering-models": 520 },
    prerequisites: ["planetary-epidemiology", "settlement-charter"],
    unlocks: ["restoration-ecologies", "biosphere-validation"],
    bonuses: { habitationCapacityMultiplier: 1.04 },
  },
  {
    id: "resonant-weapon-dynamics",
    branch: "axiom-theory",
    era: "synthesis",
    name: "Resonant Weapon Dynamics",
    summary: "Measure why experienced carriers make standardized weapons behave as if they remember them.",
    completedSummary: "The Armory may establish the Resonant Munitions law.",
    contradiction: "THE WEAPON RECOGNIZES A VERSION OF ITS CARRIER WHO HAS NOT ARRIVED.",
    workRequired: 13_500,
    costs: { "engineering-models": 900, "null-traces": 520, "axiom-proofs": 36 },
    prerequisites: ["null-edge-armaments", "observer-recursion"],
    unlocks: ["armory-law-resonant-munitions"],
    bonuses: {},
  },
  {
    id: "temporal-signal-analysis",
    branch: "null-studies",
    era: "convergence",
    name: "Temporal Signal Analysis",
    summary: "Compare Null transmissions against the moments in which they claim to have been sent.",
    completedSummary: "The lattice can distinguish an echo from a correction arriving before its cause.",
    contradiction: "HOSTILE SIGNAL AGE: 312 YEARS. LOCAL UNIVERSE AGE AT TRANSMISSION: 311 YEARS.",
    workRequired: 18_000,
    costs: { "null-traces": 1_000, "calibration-data": 700, "axiom-proofs": 70 },
    prerequisites: ["observer-recursion", "ark-drive-coupling"],
    unlocks: ["temporal-signature", "future-origin-hypothesis"],
    bonuses: { nullSignalMultiplier: 1.04 },
    nullEchoId: "echo-temporal",
    nullEcho: "THE FLEET NAVIGATES FROM A MEMORY OF THIS ROUTE.",
  },
  {
    id: "causal-threat-projection",
    branch: "threat-operations",
    era: "convergence",
    name: "Causal Threat Projection",
    summary: "Model attacks aimed not at the Ark, but at the future each restored world makes possible.",
    completedSummary: "Planetary defenses can be designed around the continuity core an enemy would target.",
    contradiction: "ENEMY OBJECTIVE: PREVENT MULTIVERSAL CASCADE. FRIEND-OR-FOE RESULT: INDETERMINATE.",
    workRequired: 26_000,
    costs: { "engineering-models": 1_500, "null-traces": 1_200, schematics: 420, "axiom-proofs": 90 },
    prerequisites: ["temporal-signal-analysis", "defensive-forecasting"],
    unlocks: ["planetary-defense-doctrine", "causal-threat-model"],
    bonuses: {},
  },
  {
    id: "interceptor-control-systems",
    branch: "robotics-automation",
    era: "convergence",
    name: "Interceptor Control Systems",
    summary: "Coordinate drone wingmates against vessels whose trajectories begin after their arrival.",
    completedSummary: "Allocated interceptor frames add bounded readiness to hostile-vessel operations.",
    contradiction: "TARGET-PREDICTION MODEL SOURCE: RETURNED VESSEL TELEMETRY. MODEL CREATION DATE: TOMORROW.",
    workRequired: 28_000,
    costs: { "engineering-models": 1_650, schematics: 480, "null-traces": 1_100, "axiom-proofs": 80 },
    prerequisites: ["causal-threat-projection", "planetary-construction-machines"],
    unlocks: ["drone-program-interceptor-control"],
    bonuses: {},
  },
  {
    id: "impossible-material-synthesis",
    branch: "axiom-theory",
    era: "convergence",
    name: "Impossible Material Synthesis",
    summary: "Stabilize matter whose useful properties exist only under mutually exclusive physical laws.",
    completedSummary: "The Armory may establish Impossible Materials and attempt Mark IV frames.",
    contradiction: "MATERIAL SAMPLE MASS: PRESENT. MATERIAL SAMPLE HISTORY: ABSENT.",
    workRequired: 30_000,
    costs: { "engineering-models": 1_800, schematics: 520, "null-traces": 1_400, "axiom-proofs": 120 },
    prerequisites: ["resonant-weapon-dynamics", "axiom-origin-proof", "autonomous-repair-swarms"],
    unlocks: ["armory-law-impossible-materials", "mark-iv-materials"],
    bonuses: { productionMultiplier: 1.02 },
  },
  {
    id: "convergence-envelope",
    branch: "axiom-theory",
    era: "convergence",
    name: "Convergence Envelope",
    summary: "Construct a boundary in which mutually incompatible stellar laws can remain true at the same time.",
    completedSummary: "The Law-Heart may stabilize its twenty-fourth Axiom and enter the Convergent spectrum.",
    contradiction: "THE ENVELOPE IS NOT CONTAINING THE STAR. THE STAR IS CONTAINING THE ARK.",
    workRequired: 28_000,
    costs: {
      "calibration-data": 1_200,
      "engineering-models": 1_400,
      "null-traces": 1_000,
      "axiom-proofs": 100,
    },
    prerequisites: ["axiomatic-stellarization", "temporal-signal-analysis"],
    unlocks: ["law-heart-convergent-spectrum", "axiom-capacity-24"],
    bonuses: { productionMultiplier: 1.02, researchSpeedMultiplier: 1.03 },
    nullEchoId: "echo-convergence-envelope",
    nullEcho: "THE FIRST SUCCESSFUL ENVELOPE WAS RECORDED AFTER THE MULTIVERSE FAILED.",
  },
  {
    id: "axiomatic-identity-preservation",
    branch: "axiom-theory",
    era: "convergence",
    name: "Axiomatic Identity Preservation",
    summary: "Prove that growth can change a service profile without replacing the person who earned it.",
    completedSummary: "Mastered Exceptional personnel may be elevated to an Anomalous service profile.",
    contradiction: "IDENTITY CHECK PASSED. SUBJECT ALSO PASSED THE CHECK IN THREE HISTORIES THAT DO NOT EXIST.",
    workRequired: 32_000,
    costs: { "cultural-records": 2_200, "null-traces": 1_200, "axiom-proofs": 160 },
    prerequisites: ["continuity-scaffolding", "axiom-origin-proof", "temporal-signal-analysis"],
    unlocks: ["profile-elevation-anomalous"],
    bonuses: {},
  },
  {
    id: "retrograde-material-analysis",
    branch: "null-studies",
    era: "synthesis",
    name: "Retrograde Material Analysis",
    summary: "Compare recovered contact fragments with the manufacturing histories matter should possess.",
    completedSummary: "Defense evidence can distinguish ordinary wreckage from matter whose cause is still ahead of it.",
    contradiction: "SAMPLE COMPOSITION: VALID. MANUFACTURING HISTORY: NOT YET OCCURRED.",
    workRequired: 15_500,
    costs: { "engineering-models": 1_100, "null-traces": 620, schematics: 300, "axiom-proofs": 30 },
    prerequisites: ["observer-recursion", "pattern-architecture"],
    unlocks: ["causal-evidence-material"],
    bonuses: {},
  },
  {
    id: "causal-cartography",
    branch: "planetary-sciences",
    era: "convergence",
    name: "Causal Cartography",
    summary: "Map hostile routes through the possible futures they connect.",
    completedSummary: "The Causal Archive can compare Ark, colony, and expedition evidence on one chronology map.",
    contradiction: "SHORTEST ROUTE TO VESPER: THROUGH A COLONY THAT WILL BE FOUNDED AFTER ARRIVAL.",
    workRequired: 27_500,
    costs: { "calibration-data": 1_600, "cultural-records": 1_200, "null-traces": 1_300, "axiom-proofs": 100 },
    prerequisites: ["temporal-signal-analysis", "surface-reconnaissance", "retrograde-material-analysis"],
    unlocks: ["causal-evidence-cartography"],
    bonuses: {},
  },
  {
    id: "returned-origin-hypothesis",
    branch: "axiom-theory",
    era: "convergence",
    name: "Returned Origin Hypothesis",
    summary: "Test whether the contacts originate downstream of the life the Ark is restoring without declaring the model true.",
    completedSummary: "The Archive may use The Returned as a provisional classification. Motive and identity remain unresolved.",
    contradiction: "ANCESTRY MATCH: PLAUSIBLE. DESCENDANT UNIVERSE: NOT THIS ONE.",
    workRequired: 42_000,
    costs: { "cultural-records": 2_800, "null-traces": 2_100, "axiom-proofs": 220, schematics: 650 },
    prerequisites: ["causal-cartography", "causal-threat-projection", "axiomatic-identity-preservation"],
    unlocks: ["provisional-returned-classification"],
    bonuses: {},
    nullEchoId: "echo-returned",
    nullEcho: "THEY CALL THIS AN INTERVENTION. THE WORD FOR INVASION WAS REMOVED FROM THEIR LANGUAGE.",
  },
  {
    id: "voluntary-adaptation-charter",
    branch: "medicine-biology",
    era: "synthesis",
    name: "Voluntary Adaptation Charter",
    summary: "Define consent, personhood, clinical limits, and a permanent right to refuse before changing any survivor.",
    completedSummary: "Adult volunteers may choose up to two permanent adaptations. Refusal never affects service, rarity, settlement, or Continuity.",
    contradiction: "THE FIRST CONSENT FORM IS SIGNED BY A PATIENT WHO HAS NOT BEEN BORN.",
    workRequired: 13_000,
    costs: { "biological-samples": 1_000, "cultural-records": 1_200, "axiom-proofs": 36 },
    prerequisites: ["clinical-commons", "continuity-scaffolding"],
    unlocks: ["bioadaptation-clinic"],
    bonuses: {},
  },
  {
    id: "atmospheric-symbiosis",
    branch: "medicine-biology",
    era: "synthesis",
    name: "Atmospheric Symbiosis",
    summary: "Adapt respiration to unstable pressure, oxygen, and spore profiles without making settlement dependent on treatment.",
    completedSummary: "Volunteers may select Atmospheric Symbiosis for stronger field performance.",
    contradiction: "RESPIRATORY MEMORY SOURCE: UNVISITED WORLD.",
    workRequired: 16_000,
    costs: { "biological-samples": 1_500, "cultural-records": 600, "engineering-models": 520 },
    prerequisites: ["voluntary-adaptation-charter", "synthetic-ecosystem-design"],
    unlocks: ["bioadaptation-atmospheric"],
    bonuses: {},
  },
  {
    id: "radiation-memory-therapy",
    branch: "medicine-biology",
    era: "synthesis",
    name: "Radiation Memory Therapy",
    summary: "Train cellular repair to recognize ionizing damage before that damage accumulates.",
    completedSummary: "Volunteers may select Radiation Memory Therapy to reduce expedition injuries.",
    contradiction: "CELLULAR REPAIR TARGET DATE: +37 YEARS.",
    workRequired: 18_000,
    costs: { "biological-samples": 1_800, "engineering-models": 720, "cultural-records": 520 },
    prerequisites: ["voluntary-adaptation-charter", "planetary-epidemiology"],
    unlocks: ["bioadaptation-radiation"],
    bonuses: {},
  },
  {
    id: "prosthetic-neural-bridge",
    branch: "medicine-biology",
    era: "synthesis",
    name: "Prosthetic Neural Bridge",
    summary: "Integrate prostheses and tools while preserving control, identity, and ownership with the volunteer.",
    completedSummary: "Volunteers may select Prosthetic Neural Integration for field strength and resilience.",
    contradiction: "BRIDGE SERIAL: VALID. FABRICATION RECORD: ABSENT.",
    workRequired: 19_500,
    costs: { "biological-samples": 1_300, "engineering-models": 1_200, schematics: 320, "cultural-records": 700 },
    prerequisites: ["voluntary-adaptation-charter", "prosthetic-fabrication"],
    unlocks: ["bioadaptation-prosthetic"],
    bonuses: {},
  },
  {
    id: "field-endurance-remodeling",
    branch: "medicine-biology",
    era: "synthesis",
    name: "Field Endurance Remodeling",
    summary: "Coordinate metabolism, sleep, and recovery for long field operations without hiding fatigue warnings.",
    completedSummary: "Volunteers may select Extended Field Endurance for shorter, safer expeditions.",
    contradiction: "SLEEP RECORD CONTAINS DREAMS CAPTURED WHILE SUBJECT WAS AWAKE.",
    workRequired: 20_500,
    costs: { "biological-samples": 1_650, "cultural-records": 900, schematics: 280, "engineering-models": 650 },
    prerequisites: ["voluntary-adaptation-charter", "specialized-field-loadouts"],
    unlocks: ["bioadaptation-endurance"],
    bonuses: {},
  },
  {
    id: "null-exposure-conditioning",
    branch: "medicine-biology",
    era: "convergence",
    name: "Null Exposure Conditioning",
    summary: "Stabilize identity under controlled absence, contradiction, and Null shear.",
    completedSummary: "Volunteers may select Null Exposure Conditioning for defense resilience.",
    contradiction: "SUBJECT REMEMBERS DECLINING THE PROCEDURE. CONSENT RECORD REMAINS VALID.",
    workRequired: 31_000,
    costs: { "biological-samples": 2_200, "cultural-records": 1_600, "null-traces": 1_300, "axiom-proofs": 120 },
    prerequisites: ["voluntary-adaptation-charter", "temporal-signal-analysis"],
    unlocks: ["bioadaptation-null"],
    bonuses: {},
  },
  {
    id: "cognitive-assistance-interface",
    branch: "human-continuity",
    era: "convergence",
    name: "Cognitive Assistance Interface",
    summary: "Build a voluntary advisory memory interface whose voice remains separate from the person using it.",
    completedSummary: "Volunteers may select Cognitive Assistance for Research and threat analysis support.",
    contradiction: "INTERFACE VOICEPRINT CLAIMS DESCENDANT RELATIONSHIP TO SUBJECT.",
    workRequired: 34_000,
    costs: { "cultural-records": 2_400, "engineering-models": 1_400, "null-traces": 900, "axiom-proofs": 140 },
    prerequisites: ["voluntary-adaptation-charter", "axiomatic-identity-preservation", "pattern-architecture"],
    unlocks: ["bioadaptation-cognitive"],
    bonuses: {},
  },
  {
    id: "equipment-stress-tests",
    branch: "ark-engineering",
    era: "synthesis",
    name: "Equipment Stress Tests",
    summary: "Cycle standardized frames through controlled failure and feed the results back into the Armory.",
    completedSummary: "Every completed cycle shortens future Armory projects by 2%, up to ten cycles.",
    workRequired: 5_000,
    costs: { "engineering-models": 500, schematics: 120 },
    prerequisites: ["pattern-architecture", "defensive-forecasting"],
    unlocks: ["repeatable-equipment-stress-tests"],
    bonuses: {},
    repeatable: { maxCompletions: 10, workGrowth: 1.18, costGrowth: 1.16 },
  },
  {
    id: "colony-data-integration",
    branch: "planetary-sciences",
    era: "synthesis",
    name: "Colony Data Integration",
    summary: "Return long-term settlement results to the Ark after departure.",
    completedSummary: "Every completed cycle raises Lattice speed by 1%, up to ten cycles.",
    workRequired: 6_000,
    costs: { "cultural-records": 540, "biological-samples": 360, "engineering-models": 300 },
    prerequisites: ["settlement-charter", "surface-reconnaissance"],
    unlocks: ["repeatable-colony-data-integration"],
    bonuses: {},
    repeatable: { maxCompletions: 10, workGrowth: 1.2, costGrowth: 1.18 },
  },
  {
    id: "null-signal-triangulation",
    branch: "null-studies",
    era: "convergence",
    name: "Null Signal Triangulation",
    summary: "Compare hostile absences across restored worlds and failed timelines.",
    completedSummary: "Every completed cycle improves Null evidence yield by 1%, up to ten cycles.",
    workRequired: 12_000,
    costs: { "null-traces": 700, "calibration-data": 420, "axiom-proofs": 35 },
    prerequisites: ["temporal-signal-analysis"],
    unlocks: ["repeatable-null-triangulation"],
    bonuses: {},
    repeatable: { maxCompletions: 10, workGrowth: 1.22, costGrowth: 1.2 },
  },
] as const;

const PROJECT_IDS = RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id);

const LEGACY_PROJECT_ERAS: Partial<Record<ResearchProjectId, ResearchEra>> = {
  "auxiliary-power-routing": "recovery",
  "closed-loop-atmosphere": "recovery",
  "predictive-fabrication": "recovery",
  "continuity-index": "recovery",
  "adaptive-instruction": "recovery",
  "null-signal-baseline": "recovery",
  "clinical-commons": "integration",
  "settlement-charter": "integration",
  "discarded-spectrum": "integration",
  "prosthetic-fabrication": "integration",
  "expedition-armaments": "integration",
  "arc-discharge-weapons": "integration",
  "composite-plating": "integration",
  "reactive-shell": "integration",
  "ark-drive-coupling": "synthesis",
  "observer-recursion": "synthesis",
  "null-edge-armaments": "synthesis",
  "aegis-frame": "synthesis",
  "axiom-origin-proof": "convergence",
};

export const getResearchProjectEra = (
  project: ResearchProjectDefinition | ResearchProjectId,
): ResearchEra => {
  const definition =
    typeof project === "string" ? getResearchProjectDefinition(project) : project;
  return definition?.era ?? LEGACY_PROJECT_ERAS[definition?.id ?? "auxiliary-power-routing"] ?? "recovery";
};

export const getResearchRepeatCount = (
  state: Pick<ResearchLatticeState, "repeatCounts">,
  projectId: ResearchProjectId,
) => Math.max(0, Math.floor(state.repeatCounts[projectId] ?? 0));

export const getResearchProjectWorkRequired = (
  state: Pick<ResearchLatticeState, "repeatCounts">,
  project: ResearchProjectDefinition,
) =>
  project.workRequired *
  Math.pow(project.repeatable?.workGrowth ?? 1, getResearchRepeatCount(state, project.id));

export const getResearchProjectCosts = (
  state: Pick<ResearchLatticeState, "repeatCounts">,
  project: ResearchProjectDefinition,
  costMultiplier = 1,
): Partial<ResearchInputBundle> => {
  const externalMultiplier = Number.isFinite(costMultiplier)
    ? Math.min(2, Math.max(0.5, costMultiplier))
    : 1;
  const multiplier =
    externalMultiplier *
    Math.pow(
      project.repeatable?.costGrowth ?? 1,
      getResearchRepeatCount(state, project.id),
    );
  return Object.fromEntries(
    Object.entries(project.costs).map(([id, cost]) => [id, (cost ?? 0) * multiplier]),
  ) as Partial<ResearchInputBundle>;
};

export const getResearchStage = (
  state: ResearchLatticeState,
  project: ResearchProjectDefinition,
) => {
  const workRequired = getResearchProjectWorkRequired(state, project);
  const ratio = Math.min(1, Math.max(0, (state.progress[project.id] ?? 0) / workRequired));
  return RESEARCH_STAGES.find((stage) => ratio < stage.end) ?? RESEARCH_STAGES.at(-1)!;
};

export const getResearchStageExpertiseId = (
  project: ResearchProjectDefinition,
  stage: ResearchStageId,
): ResearchExpertiseId => {
  if (stage === "theory" || stage === "synthesis") return "research";
  if (stage === "prototype") {
    if (project.branch === "medicine-biology") return "medicine";
    if (project.branch === "human-continuity") return "education";
    if (project.branch === "planetary-sciences") return "ecology";
    if (project.branch === "threat-operations") return "fabrication";
    return "engineering";
  }
  if (project.branch === "medicine-biology") return "medicine";
  if (project.branch === "human-continuity") return "education";
  if (project.branch === "planetary-sciences") return "ecology";
  if (project.branch === "threat-operations") return "field";
  if (project.branch === "ark-engineering" || project.branch === "robotics-automation") return "engineering";
  if (project.branch === "null-studies" || project.branch === "axiom-theory") return "research";
  return "navigation";
};

export const getResearchEraProgress = (
  state: Pick<ResearchLatticeState, "completedProjectIds" | "repeatCounts">,
  era: ResearchEra,
) => {
  const projects = RESEARCH_PROJECT_DEFINITIONS.filter(
    (project) => getResearchProjectEra(project) === era && !project.repeatable,
  );
  const complete = projects.filter((project) => state.completedProjectIds.includes(project.id)).length;
  return { complete, total: projects.length, ratio: projects.length > 0 ? complete / projects.length : 0 };
};

export const getCurrentResearchEra = (
  state: Pick<ResearchLatticeState, "completedProjectIds" | "repeatCounts" | "activeProjectId">,
): ResearchEra => {
  const active = state.activeProjectId ? getResearchProjectDefinition(state.activeProjectId) : null;
  if (active) return getResearchProjectEra(active);
  const progressed = (["convergence", "synthesis", "integration", "recovery"] as const).find(
    (era) =>
      RESEARCH_PROJECT_DEFINITIONS.some(
        (project) =>
          getResearchProjectEra(project) === era &&
          state.completedProjectIds.includes(project.id),
      ),
  );
  return progressed ?? "recovery";
};

export const getAvailableResearchEras = (
  state: Pick<ResearchLatticeState, "completedProjectIds" | "repeatCounts" | "activeProjectId">,
) => {
  return RESEARCH_ERAS.filter(
    (era) =>
      era.id === "recovery" ||
      RESEARCH_PROJECT_DEFINITIONS.some(
        (project) =>
          getResearchProjectEra(project) === era.id &&
          (state.completedProjectIds.includes(project.id) ||
            project.prerequisites.every((id) => state.completedProjectIds.includes(id))),
      ),
  );
};

const emptyInputs = (): ResearchInputBundle => ({
  "calibration-data": 0,
  "engineering-models": 0,
  "biological-samples": 0,
  "cultural-records": 0,
  schematics: 0,
  "null-traces": 0,
  "axiom-proofs": 0,
});

const clampFinite = (value: unknown, minimum: number, maximum: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
};

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
  assignedCrew: 0,
  inventory: emptyInputs(),
  activeProjectId: null,
  progress: {},
  repeatCounts: {},
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
  const repeatSource =
    source.repeatCounts && typeof source.repeatCounts === "object"
      ? (source.repeatCounts as Record<string, unknown>)
      : {};
  const repeatCounts: Partial<Record<ResearchProjectId, number>> = {};
  for (const project of RESEARCH_PROJECT_DEFINITIONS) {
    if (!project.repeatable) continue;
    const savedCount = Math.floor(
      clampFinite(repeatSource[project.id], 0, project.repeatable.maxCompletions),
    );
    const migratedCount = completedProjectIds.includes(project.id)
      ? Math.max(1, savedCount)
      : savedCount;
    if (migratedCount > 0) repeatCounts[project.id] = migratedCount;
  }
  const progress: Partial<Record<ResearchProjectId, number>> = {};
  for (const project of RESEARCH_PROJECT_DEFINITIONS) {
    const workRequired = getResearchProjectWorkRequired({ repeatCounts }, project);
    let completed = completedProjectIds.includes(project.id);
    const saved = clampFinite(
      progressSource[project.id],
      0,
      workRequired,
    );
    if (
      !completed &&
      saved >= workRequired &&
      project.prerequisites.every((id) => completedProjectIds.includes(id))
    ) {
      completedProjectIds.push(project.id);
      completed = true;
    }
    if (project.repeatable) {
      if (saved > 0 && getResearchRepeatCount({ repeatCounts }, project.id) < project.repeatable.maxCompletions) {
        progress[project.id] = saved;
      }
    } else if (completed || saved > 0) {
      progress[project.id] = completed ? workRequired : saved;
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
    canStartResearchProject(
      { ...createResearchLatticeState(), completedProjectIds, repeatCounts } as ResearchLatticeState,
      activeProject.id,
    ) &&
    activeProject.prerequisites.every((id) => completedProjectIds.includes(id));

  return {
    schema: RESEARCH_SCHEMA,
    assignedCrew: Math.floor(
      clampFinite(source.assignedCrew, 0, MAX_RESEARCH_CREW),
    ),
    inventory,
    activeProjectId: canRetainActive ? activeProjectId : null,
    progress,
    repeatCounts,
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
  inventory: { ...state.inventory },
  progress: { ...state.progress },
  repeatCounts: { ...state.repeatCounts },
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

export const canStartResearchProject = (
  state: ResearchLatticeState,
  projectId: ResearchProjectId,
) => {
  const project = getResearchProjectDefinition(projectId);
  return Boolean(
    project &&
      (project.repeatable
        ? getResearchRepeatCount(state, projectId) < project.repeatable.maxCompletions
        : !state.completedProjectIds.includes(projectId)) &&
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
) => getAutoResearchRoutes(project);

export const getResearchBonuses = (
  state: Pick<ResearchLatticeState, "completedProjectIds"> &
    Partial<Pick<ResearchLatticeState, "repeatCounts">>,
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
  const repeatCounts = state.repeatCounts ?? {};
  bonuses.researchSpeedMultiplier +=
    Math.min(10, repeatCounts["colony-data-integration"] ?? 0) * 0.01;
  bonuses.nullSignalMultiplier +=
    Math.min(10, repeatCounts["null-signal-triangulation"] ?? 0) * 0.01;
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
  if (!project.repeatable && state.completedProjectIds.includes(projectId)) return 1;
  if (
    project.repeatable &&
    getResearchRepeatCount(state, projectId) >= project.repeatable.maxCompletions
  ) return 1;
  const required = getResearchProjectWorkRequired(state, project);
  return Math.min(1, Math.max(0, (state.progress[projectId] ?? 0) / required));
};

export const getResearchNetworkStatus = (
  state: ResearchLatticeState,
  environment: ResearchEnvironment = {},
): ResearchNetworkStatus => {
  const project = state.activeProjectId
    ? getResearchProjectDefinition(state.activeProjectId)
    : undefined;
  const costs = project
    ? getResearchProjectCosts(state, project, environment.costMultiplier)
    : {};
  const workRequired = project
    ? getResearchProjectWorkRequired(state, project)
    : 1;
  const routes = getResolvedResearchRoutes(state, project);
  const requiredInputs = project
    ? INPUT_IDS.filter((id) => (costs[id] ?? 0) > 0)
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
      const costPerWork = (costs[inputId] ?? 0) / workRequired;
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
  const stage = project
    ? getResearchStage(state, project)
    : RESEARCH_STAGES[0];
  const expertiseId = project
    ? getResearchStageExpertiseId(project, stage.id)
    : "research";
  const expertiseTotal = clampFinite(
    environment.expertise?.[expertiseId] ?? 0,
    0,
    1_000,
  );
  // Operational mastery matters, but never becomes the dominant exponential.
  const expertiseMultiplier = 1 + Math.min(0.35, expertiseTotal * 0.015);
  const era = project ? getResearchProjectEra(project) : "recovery";
  const leadRequirementLevel =
    era === "convergence" ? 9 : era === "synthesis" ? 5 : era === "integration" ? 3 : 0;
  const leadRequirementMet =
    !project ||
    leadRequirementLevel === 0 ||
    ((environment.leadResearcherLevel ?? 0) >= leadRequirementLevel &&
      (era !== "convergence" || environment.exceptionalLeadAvailable === true));
  const externalSpeed = clampFinite(
    environment.externalSpeedMultiplier ?? 1,
    0,
    10,
  );
  const fieldValidationMultiplier =
    stage.id === "validation"
      ? clampFinite(environment.fieldValidationMultiplier ?? 1, 1, 1.25)
      : 1;
  const automationMultiplier =
    stage.id === "prototype" || stage.id === "validation"
      ? clampFinite(environment.automationMultiplier ?? 1, 1, 1.09)
      : 1;
  const progressPerSecond = project
    ? (leadRequirementMet ? 1 : 0) *
      routeEfficiency *
      powerEfficiency *
      crewEfficiency *
      expertiseMultiplier *
      fieldValidationMultiplier *
      automationMultiplier *
      bonuses.researchSpeedMultiplier *
      externalSpeed
    : 0;
  let stalledReason: string | null = null;
  if (!project) stalledReason = "No project selected";
  else if (!leadRequirementMet) {
    stalledReason =
      era === "convergence"
        ? "Requires an on-duty level-9 Exceptional Researcher"
        : `Requires an on-duty level-${leadRequirementLevel} Researcher`;
  }
  else if (missingInputs.length > 0) stalledReason = "Required input route missing";
  else if (powerAvailable <= 0) stalledReason = "No lattice power";
  else if (progressPerSecond <= 0) stalledReason = "Lattice configuration stalled";
  else if (
    requiredInputs.some(
      (inputId) =>
        state.inventory[inputId] <= 0 &&
        (state.progress[project.id] ?? 0) < workRequired,
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
    stage: stage.id,
    stageLabel: stage.name,
    expertiseId,
    expertiseTotal,
    expertiseMultiplier,
    fieldValidationMultiplier,
    automationMultiplier,
    leadRequirementLevel,
    leadRequirementMet,
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
  const workRequired = getResearchProjectWorkRequired(state, project);
  const costs = getResearchProjectCosts(
    state,
    project,
    environment.costMultiplier,
  );
  const currentWork = Math.min(
    workRequired,
    Math.max(0, state.progress[project.id] ?? 0),
  );
  const remainingWork = workRequired - currentWork;
  let work = Math.min(remainingWork, elapsed * status.progressPerSecond);
  for (const inputId of status.requiredInputs) {
    const costPerWork = (costs[inputId] ?? 0) / workRequired;
    if (costPerWork > 0) {
      work = Math.min(work, state.inventory[inputId] / costPerWork);
    }
  }
  if (work <= 1e-9) {
    return { state, consumed, completedProjectId: null, progressedWork: 0 };
  }

  const next = cloneResearchLatticeState(state);
  for (const inputId of status.requiredInputs) {
    const costPerWork = (costs[inputId] ?? 0) / workRequired;
    const amount = Math.min(next.inventory[inputId], work * costPerWork);
    next.inventory[inputId] = Math.max(0, next.inventory[inputId] - amount);
    consumed[inputId] = amount;
  }
  const totalWork = Math.min(workRequired, currentWork + work);
  next.progress[project.id] = totalWork;
  const completed = totalWork >= workRequired - 1e-7;
  if (completed) {
    const nextRepeatCount = project.repeatable
      ? Math.min(
          project.repeatable.maxCompletions,
          getResearchRepeatCount(next, project.id) + 1,
        )
      : 0;
    next.progress[project.id] = project.repeatable ? 0 : workRequired;
    if (project.repeatable) next.repeatCounts[project.id] = nextRepeatCount;
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
            ? `${project.summary} · AUTHORIZATION SIGNATURE DOES NOT MATCH.`
            : project.summary,
  };
};
