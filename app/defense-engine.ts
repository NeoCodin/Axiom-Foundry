/**
 * Idle-first Ark defense, travel hazards, and retrograde contacts.
 *
 * Installations are long-form Mark projects. Environmental and contact
 * doctrines are independent standing orders. Every event resolves
 * deterministically online or offline and every setback remains recoverable.
 */

export type DefenseDoctrine = "defend" | "evade" | "intercept" | "observe";
export type EnvironmentalDoctrine = "brace" | "harvest" | "outrun";
export type AppliedDefenseDoctrine = DefenseDoctrine | EnvironmentalDoctrine;
export type DefenseInstallationId =
  | "shieldArray"
  | "pointDefense"
  | "repairDrones"
  | "earlyWarningRelay";
export type DefenseEnvironment =
  | "cinder-orbit"
  | "nox-orbit"
  | "vesper-orbit"
  | "transit";
export type DefenseEventOutcome = "unscathed" | "grazed" | "battered";
export type DefenseEventKind =
  | "ash-storm"
  | "asteroid-shower"
  | "debris-front"
  | "ion-storm"
  | "drive-turbulence"
  | "null-shear"
  | "retrograde-probe"
  | "vessel-approach"
  | "boarding-feint"
  | "archive-intrusion"
  | "core-interdiction"
  | "beacon-trace";
export type DefenseEventTarget =
  | "hull"
  | "beacon"
  | "research"
  | "archive"
  | "automation"
  | "axiom-core";
export type DefenseCompromiseKind =
  | "flux-siphon"
  | "research-quarantine"
  | "drone-seizure"
  | "beacon-spoof"
  | "core-desync"
  | "archive-contamination";

export type DefenseWound = {
  crewId: string;
  damage: number;
  injuryTier: "minor" | "major" | null;
};
export type DefenseCompromise = {
  kind: DefenseCompromiseKind;
  target: DefenseEventTarget;
  remainingSeconds: number;
  operationalLoad: number;
  suppressedAutomationProgram: string | null;
};
export type DefenseConstructionProject = {
  installationId: DefenseInstallationId;
  targetMark: number;
  progressSeconds: number;
  totalSeconds: number;
};
export type IncomingDefenseEvent = {
  kind: DefenseEventKind;
  target: DefenseEventTarget;
  severity: number;
  arrivesAtSeconds: number;
  environment: DefenseEnvironment | null;
};
export type ResolvedDefenseEvent = {
  kind: DefenseEventKind;
  target: DefenseEventTarget;
  severity: number;
  readiness: number;
  margin: number;
  doctrine: AppliedDefenseDoctrine;
  outcome: DefenseEventOutcome;
  resolvedAtSeconds: number;
  salvage: number;
  engineeringModels: number;
  calibrationData: number;
  nullTraces: number;
  productionPenalty: number;
  repairSeconds: number;
  injuries: DefenseWound[];
  compromise: DefenseCompromise | null;
  causalFragmentId: string | null;
};
export type DefenseDamage = {
  productionPenalty: number;
  repairRemainingSeconds: number;
};
export type DefenseState = {
  schema: number;
  rngState: number;
  clockSeconds: number;
  contactDoctrine: DefenseDoctrine;
  environmentalDoctrine: EnvironmentalDoctrine;
  installations: Record<DefenseInstallationId, number>;
  construction: DefenseConstructionProject | null;
  incoming: IncomingDefenseEvent | null;
  damage: DefenseDamage | null;
  compromise: DefenseCompromise | null;
  eventLog: ResolvedDefenseEvent[];
  causalFragmentIds: string[];
  firstContactResolved: boolean;
  stats: {
    resolved: number;
    unscathed: number;
    damaged: number;
    hostileResolved: number;
    environmentalResolved: number;
    injuries: number;
    compromises: number;
    installationMarksCompleted: number;
  };
};

export type DefenseCrewContext = {
  security: number;
  engineers: number;
  navigators: number;
  researchReadiness?: number;
  researchForecastSeconds?: number;
  researchRepairMultiplier?: number;
  interceptorReadiness?: number;
  equipmentReadiness?: number;
  injuryMitigation?: number;
  /** Per-person clinical resistance, applied after global armor/shield mitigation. */
  injuryMultipliers?: Readonly<Record<string, number>>;
  eligibleDefenderIds?: readonly string[];
  threatIdentification?: number;
};
export type DefenseAdvanceContext = DefenseCrewContext & {
  environment: DefenseEnvironment | null;
  stormsEnabled: boolean;
  hostilesEnabled?: boolean;
  beaconOnline?: boolean;
  worldIndex: number;
  constructionSpeedMultiplier?: number;
};
export type DefenseAdvanceResult = {
  state: DefenseState;
  salvage: number;
  engineeringModels: number;
  calibrationData: number;
  nullTraces: number;
  resolvedEvents: ResolvedDefenseEvent[];
  completedInstallation: DefenseConstructionProject | null;
};

export const DEFENSE_SCHEMA = 3;
export const MAX_INSTALLATION_MARK = 4;
export const MAX_INSTALLATION_LEVEL = MAX_INSTALLATION_MARK;
export const MAX_EVENT_LOG = 20;
export const MAX_PRODUCTION_PENALTY = 0.25;
export const MAX_REPAIR_SECONDS = 6 * 3_600;
export const MAX_COMPROMISE_SECONDS = 6 * 3_600;
export const FIRST_STORM_DELAY_SECONDS = 2 * 3_600;
export const FIRST_TRANSIT_HAZARD_DELAY_SECONDS = 45 * 60;
export const FIRST_HOSTILE_DELAY_SECONDS = 90 * 60;
export const STORM_BASE_GAP_SECONDS = 4 * 3_600;
export const HOSTILE_BASE_GAP_SECONDS = 5 * 3_600;

export const DEFENSE_EVENT_DEFINITIONS: Readonly<
  Record<DefenseEventKind, { label: string; hostile: boolean; summary: string }>
> = {
  "ash-storm": {
    label: "Charged Ash Front",
    hostile: false,
    summary: "Cinder's orbital ash belt stresses shields and exposed radiators.",
  },
  "asteroid-shower": {
    label: "Asteroid Shower",
    hostile: false,
    summary: "A fast debris stream crosses the Ark's interplanetary corridor.",
  },
  "debris-front": {
    label: "Debris Front",
    hostile: false,
    summary: "Pre-fall wreckage has spread across the projected transit lane.",
  },
  "ion-storm": {
    label: "Ion Storm",
    hostile: false,
    summary: "Charged particles blind sensors and load the shield grid.",
  },
  "drive-turbulence": {
    label: "Drive Turbulence",
    hostile: false,
    summary: "The Ark's drive is crossing a warped gravitational seam.",
  },
  "null-shear": {
    label: "Null Shear",
    hostile: false,
    summary: "A region of missing telemetry pulls against the Ark's causal envelope.",
  },
  "retrograde-probe": {
    label: "Retrograde Probe",
    hostile: true,
    summary: "A contact measures the Ark from a trajectory with no visible origin.",
  },
  "vessel-approach": {
    label: "Unknown Vessel",
    hostile: true,
    summary: "A vessel approaches on an impossible intercept and refuses present-day authentication.",
  },
  "boarding-feint": {
    label: "Boarding Feint",
    hostile: true,
    summary: "False docking calls draw defenders away from a systems intrusion.",
  },
  "archive-intrusion": {
    label: "Archive Intrusion",
    hostile: true,
    summary: "The contact attempts to contaminate recovered history rather than destroy it.",
  },
  "core-interdiction": {
    label: "Core Interdiction",
    hostile: true,
    summary: "The vessel targets the Axiom Chamber and the futures it keeps coherent.",
  },
  "beacon-trace": {
    label: "Beacon Trace",
    hostile: true,
    summary: "An SOS transmission is answered by something that already knew its contents.",
  },
};

export const DEFENSE_CAUSAL_FRAGMENTS = [
  { id: "contact-before-cause", title: "Contact Before Cause", text: "The probe's authentication reply was transmitted eleven minutes before AXIOM issued the challenge." },
  { id: "protected-lifeboat", title: "The Protected Lifeboat", text: "A hostile vessel broke its own firing solution to avoid a civilian rescue craft." },
  { id: "returned-navigation", title: "Returned Navigation", text: "Recovered charts mark restored worlds as causal origins, not military targets." },
  { id: "ark-casualty-index", title: "Ark Casualty Index", text: "The enemy's casualty ledger lists entire futures. AXIOM appears in both the survivor and cause fields." },
  { id: "chronology-wound", title: "Chronology Wound", text: "A section of hull reports impact damage four seconds before the hostile weapon discharges." },
  { id: "preserved-archive", title: "Preserved Archive", text: "A boarding probe erases targeting data, then copies every civilian testimony without altering a word." },
  { id: "unfired-salvo", title: "The Unfired Salvo", text: "A contact aborts a strike after predicting casualties AXIOM has not rescued yet." },
  { id: "voiceprint-descendant", title: "Inherited Voiceprint", text: "The command voice shares familial markers with three Ark crew, but the relationship points forward." },
] as const;

export const DEFENSE_DOCTRINE_DEFINITIONS: Record<
  DefenseDoctrine,
  { label: string; marginModifier: number; rewardMultiplier: number; injuryRisk: number; summary: string }
> = {
  defend: { label: "Defend", marginModifier: 10, rewardMultiplier: 1, injuryRisk: 0.7, summary: "Hold behind shields. The safest balanced contact response." },
  evade: { label: "Evade", marginModifier: 20, rewardMultiplier: 0.4, injuryRisk: 0, summary: "Maneuver clear. No automatic crew injury and minimal evidence." },
  intercept: { label: "Intercept", marginModifier: -10, rewardMultiplier: 1.8, injuryRisk: 1, summary: "Meet the contact outside the hull. Better recovery, greater injury risk." },
  observe: { label: "Observe", marginModifier: -5, rewardMultiplier: 0.8, injuryRisk: 0.85, summary: "Instrument the contact. Best Calibration, Null data, and identification." },
};

export const ENVIRONMENTAL_DOCTRINE_DEFINITIONS: Record<
  EnvironmentalDoctrine,
  { label: string; marginModifier: number; rewardMultiplier: number; summary: string }
> = {
  brace: { label: "Brace", marginModifier: 14, rewardMultiplier: 0.75, summary: "Seal the Ark and absorb the front. Safest environmental posture." },
  harvest: { label: "Harvest", marginModifier: -6, rewardMultiplier: 1.65, summary: "Open collection vanes for Salvage and telemetry at greater hull risk." },
  outrun: { label: "Outrun", marginModifier: 10, rewardMultiplier: 0.35, summary: "Stress the drive to clear the hazard. Strong margin, little recovery." },
};

export const DEFENSE_INSTALLATION_DEFINITIONS: Record<
  DefenseInstallationId,
  {
    name: string;
    description: string;
    baseFluxCost: number;
    baseSalvageCost: number;
    baseModelCost: number;
    baseSeconds: number;
    markCapabilities: readonly string[];
  }
> = {
  shieldArray: {
    name: "Shield Array",
    description: "Hardens the Ark against weather, projectiles, and causal pressure.",
    baseFluxCost: 12_000,
    baseSalvageCost: 80,
    baseModelCost: 120,
    baseSeconds: 45 * 60,
    markCapabilities: ["Hull envelope online", "Redundant shield sectors", "Crew-impact damping", "Causal boundary reinforcement"],
  },
  repairDrones: {
    name: "Repair Swarms",
    description: "Restores damaged systems and shortens every recoverable setback.",
    baseFluxCost: 9_000,
    baseSalvageCost: 65,
    baseModelCost: 105,
    baseSeconds: 40 * 60,
    markCapabilities: ["Routine hull response", "Distributed patch teams", "Equipment recovery coordination", "Predictive reconstruction"],
  },
  pointDefense: {
    name: "Point-Defense Grid",
    description: "Contests debris, probes, missiles, and boarding craft before hull contact.",
    baseFluxCost: 11_000,
    baseSalvageCost: 75,
    baseModelCost: 115,
    baseSeconds: 50 * 60,
    markCapabilities: ["Debris interception", "Probe denial", "Retrograde targeting", "Causal interceptor mesh"],
  },
  earlyWarningRelay: {
    name: "Early-Warning Relay",
    description: "Extends forecasts and identifies targets, severity, and impossible trajectories.",
    baseFluxCost: 8_000,
    baseSalvageCost: 55,
    baseModelCost: 90,
    baseSeconds: 35 * 60,
    markCapabilities: ["Long-range weather track", "Target classification", "Intent projection", "Pre-causal warning"],
  },
};

const MARK_FLUX_FACTORS = [0, 1, 6, 30, 150] as const;
const MARK_MATERIAL_FACTORS = [0, 1, 3, 7, 15] as const;
const MARK_RESEARCH: Readonly<Record<number, string | null>> = {
  1: null,
  2: "defensive-forecasting",
  3: "autonomous-repair-swarms",
  4: "causal-threat-projection",
};
const DEFAULT_SEED = 0x2545f491;
const INSTALLATION_IDS: readonly DefenseInstallationId[] = ["shieldArray", "pointDefense", "repairDrones", "earlyWarningRelay"];
const HOSTILE_KINDS: readonly DefenseEventKind[] = ["retrograde-probe", "vessel-approach", "boarding-feint", "archive-intrusion", "core-interdiction", "beacon-trace"];
const TRANSIT_HAZARDS: readonly DefenseEventKind[] = ["asteroid-shower", "debris-front", "ion-storm", "drive-turbulence"];
const TARGET_FOR_KIND: Record<DefenseEventKind, DefenseEventTarget> = {
  "ash-storm": "hull",
  "asteroid-shower": "hull",
  "debris-front": "hull",
  "ion-storm": "automation",
  "drive-turbulence": "axiom-core",
  "null-shear": "research",
  "retrograde-probe": "research",
  "vessel-approach": "hull",
  "boarding-feint": "automation",
  "archive-intrusion": "archive",
  "core-interdiction": "axiom-core",
  "beacon-trace": "beacon",
};
const PROGRAM_FOR_TARGET: Partial<Record<DefenseEventTarget, string>> = {
  automation: "hull-maintenance",
  research: "research-routing",
  beacon: "personnel-logistics",
  hull: "interceptor-control",
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, parsed)) : fallback; };
const signed = (value: unknown, fallback = 0, maximum = 1_000) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(maximum, Math.max(-maximum, parsed)) : fallback; };
const whole = (value: unknown, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) => Math.floor(finite(value, fallback, maximum));
const isDoctrine = (value: unknown): value is DefenseDoctrine => value === "defend" || value === "evade" || value === "intercept" || value === "observe";
const isEnvironmentalDoctrine = (value: unknown): value is EnvironmentalDoctrine => value === "brace" || value === "harvest" || value === "outrun";
const isAppliedDoctrine = (value: unknown): value is AppliedDefenseDoctrine => isDoctrine(value) || isEnvironmentalDoctrine(value);
const isInstallation = (value: unknown): value is DefenseInstallationId => typeof value === "string" && INSTALLATION_IDS.includes(value as DefenseInstallationId);
const isEnvironment = (value: unknown): value is DefenseEnvironment => value === "cinder-orbit" || value === "nox-orbit" || value === "vesper-orbit" || value === "transit";
const isKind = (value: unknown): value is DefenseEventKind => typeof value === "string" && value in DEFENSE_EVENT_DEFINITIONS;
const isTarget = (value: unknown): value is DefenseEventTarget => value === "hull" || value === "beacon" || value === "research" || value === "archive" || value === "automation" || value === "axiom-core";
const isCompromiseKind = (value: unknown): value is DefenseCompromiseKind => value === "flux-siphon" || value === "research-quarantine" || value === "drone-seizure" || value === "beacon-spoof" || value === "core-desync" || value === "archive-contamination";
const isHostileKind = (kind: DefenseEventKind) => DEFENSE_EVENT_DEFINITIONS[kind].hostile;
const markPower = (mark: number, base: number) => mark <= 0 ? 0 : Math.round(base * Math.pow(mark, 1.28));

function nextRandom(state: DefenseState) { let value = state.rngState >>> 0; if (!value) value = DEFAULT_SEED; value ^= value << 13; value ^= value >>> 17; value ^= value << 5; state.rngState = (value >>> 0) || DEFAULT_SEED; return state.rngState / 0x1_0000_0000; }

export function createDefenseState(seed = DEFAULT_SEED): DefenseState {
  return {
    schema: DEFENSE_SCHEMA,
    rngState: (whole(seed, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: 0,
    contactDoctrine: "defend",
    environmentalDoctrine: "brace",
    installations: { shieldArray: 0, pointDefense: 0, repairDrones: 0, earlyWarningRelay: 0 },
    construction: null,
    incoming: null,
    damage: null,
    compromise: null,
    eventLog: [],
    causalFragmentIds: [],
    firstContactResolved: false,
    stats: { resolved: 0, unscathed: 0, damaged: 0, hostileResolved: 0, environmentalResolved: 0, injuries: 0, compromises: 0, installationMarksCompleted: 0 },
  };
}

export function cloneDefenseState(state: DefenseState): DefenseState {
  return {
    ...state,
    installations: { ...state.installations },
    construction: state.construction ? { ...state.construction } : null,
    incoming: state.incoming ? { ...state.incoming } : null,
    damage: state.damage ? { ...state.damage } : null,
    compromise: state.compromise ? { ...state.compromise } : null,
    eventLog: state.eventLog.map((event) => ({ ...event, injuries: event.injuries.map((injury) => ({ ...injury })), compromise: event.compromise ? { ...event.compromise } : null })),
    causalFragmentIds: [...state.causalFragmentIds],
    stats: { ...state.stats },
  };
}

function sanitizeCompromise(value: unknown): DefenseCompromise | null {
  if (!isRecord(value) || !isCompromiseKind(value.kind) || !isTarget(value.target)) return null;
  const remainingSeconds = finite(value.remainingSeconds, 0, MAX_COMPROMISE_SECONDS);
  if (remainingSeconds <= 0) return null;
  return {
    kind: value.kind,
    target: value.target,
    remainingSeconds,
    operationalLoad: finite(value.operationalLoad, 0, 0.12),
    suppressedAutomationProgram: typeof value.suppressedAutomationProgram === "string" ? value.suppressedAutomationProgram : null,
  };
}

export function sanitizeDefenseState(value: unknown): DefenseState {
  const base = createDefenseState();
  if (!isRecord(value)) return base;
  const rawSchema = whole(value.schema, 1, DEFENSE_SCHEMA);
  const stats = isRecord(value.stats) ? value.stats : {};
  const legacyDoctrine = isDoctrine(value.doctrine) ? value.doctrine : "defend";
  const state: DefenseState = {
    ...base,
    rngState: (whole(value.rngState, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: finite(value.clockSeconds, 0, 1e15),
    contactDoctrine: isDoctrine(value.contactDoctrine) ? value.contactDoctrine : legacyDoctrine,
    environmentalDoctrine: isEnvironmentalDoctrine(value.environmentalDoctrine) ? value.environmentalDoctrine : "brace",
    firstContactResolved: value.firstContactResolved === true,
    causalFragmentIds: Array.isArray(value.causalFragmentIds)
      ? DEFENSE_CAUSAL_FRAGMENTS.map((entry) => entry.id).filter((id) => (value.causalFragmentIds as unknown[]).includes(id))
      : [],
    stats: {
      resolved: whole(stats.resolved, 0, 1e9),
      unscathed: whole(stats.unscathed, 0, 1e9),
      damaged: whole(stats.damaged, 0, 1e9),
      hostileResolved: whole(stats.hostileResolved, 0, 1e9),
      environmentalResolved: whole(stats.environmentalResolved, whole(stats.resolved, 0, 1e9) - whole(stats.hostileResolved, 0, 1e9), 1e9),
      injuries: whole(stats.injuries, 0, 1e9),
      compromises: whole(stats.compromises, 0, 1e9),
      installationMarksCompleted: whole(stats.installationMarksCompleted, 0, 1e9),
    },
  };
  const rawInstallations = isRecord(value.installations) ? value.installations : {};
  for (const id of INSTALLATION_IDS) {
    const rawLevel = whole(rawInstallations[id], 0, rawSchema < DEFENSE_SCHEMA ? 5 : MAX_INSTALLATION_MARK);
    state.installations[id] = rawSchema < DEFENSE_SCHEMA ? (rawLevel > 0 ? 1 : 0) : Math.min(MAX_INSTALLATION_MARK, rawLevel);
  }
  if (isRecord(value.construction) && isInstallation(value.construction.installationId)) {
    const currentMark = state.installations[value.construction.installationId];
    const targetMark = whole(value.construction.targetMark, currentMark + 1, MAX_INSTALLATION_MARK);
    const totalSeconds = finite(value.construction.totalSeconds, 60, 30 * 24 * 3_600);
    if (targetMark === currentMark + 1 && totalSeconds > 0) {
      state.construction = {
        installationId: value.construction.installationId,
        targetMark,
        progressSeconds: finite(value.construction.progressSeconds, 0, totalSeconds),
        totalSeconds,
      };
    }
  }
  if (isRecord(value.incoming)) {
    const arrivesAtSeconds = finite(value.incoming.arrivesAtSeconds, 0, 1e15);
    if (arrivesAtSeconds > state.clockSeconds) {
      const kind = isKind(value.incoming.kind) ? value.incoming.kind : "ash-storm";
      state.incoming = {
        kind,
        target: isTarget(value.incoming.target) ? value.incoming.target : TARGET_FOR_KIND[kind],
        severity: Math.max(1, whole(value.incoming.severity, 1, 3)),
        arrivesAtSeconds,
        environment: isHostileKind(kind) ? null : isEnvironment(value.incoming.environment) ? value.incoming.environment : kind === "ash-storm" ? "cinder-orbit" : null,
      };
    }
  }
  if (isRecord(value.damage)) {
    const productionPenalty = finite(value.damage.productionPenalty, 0, MAX_PRODUCTION_PENALTY);
    const repairRemainingSeconds = finite(value.damage.repairRemainingSeconds, 0, MAX_REPAIR_SECONDS);
    if (productionPenalty > 0 && repairRemainingSeconds > 0) state.damage = { productionPenalty, repairRemainingSeconds };
  }
  state.compromise = sanitizeCompromise(value.compromise);
  if (Array.isArray(value.eventLog)) {
    state.eventLog = value.eventLog.filter(isRecord).slice(-MAX_EVENT_LOG).map((raw) => {
      const kind = isKind(raw.kind) ? raw.kind : "ash-storm";
      return {
        kind,
        target: isTarget(raw.target) ? raw.target : TARGET_FOR_KIND[kind],
        severity: Math.max(1, whole(raw.severity, 1, 3)),
        readiness: finite(raw.readiness, 0, 100),
        margin: signed(raw.margin),
        doctrine: isAppliedDoctrine(raw.doctrine) ? raw.doctrine : isHostileKind(kind) ? "defend" : "brace",
        outcome: raw.outcome === "grazed" || raw.outcome === "battered" ? raw.outcome : "unscathed",
        resolvedAtSeconds: finite(raw.resolvedAtSeconds, 0, 1e15),
        salvage: finite(raw.salvage, 0, 1e9),
        engineeringModels: finite(raw.engineeringModels, 0, 1e9),
        calibrationData: finite(raw.calibrationData, 0, 1e9),
        nullTraces: finite(raw.nullTraces, 0, 1e9),
        productionPenalty: finite(raw.productionPenalty, 0, MAX_PRODUCTION_PENALTY),
        repairSeconds: finite(raw.repairSeconds, 0, MAX_REPAIR_SECONDS),
        injuries: Array.isArray(raw.injuries) ? raw.injuries.filter(isRecord).slice(0, 3).map((injury) => ({ crewId: String(injury.crewId ?? ""), damage: finite(injury.damage, 0, 80), injuryTier: injury.injuryTier === "major" ? "major" as const : injury.injuryTier === "minor" ? "minor" as const : null })) : [],
        compromise: sanitizeCompromise(raw.compromise),
        causalFragmentId: typeof raw.causalFragmentId === "string" ? raw.causalFragmentId : null,
      };
    });
  }
  return state;
}

export function getDefenseReadinessBreakdown(
  state: Pick<DefenseState, "installations">,
  crew: DefenseCrewContext,
) {
  const installation = {
    shield: markPower(state.installations.shieldArray, 14),
    repair: markPower(state.installations.repairDrones, 7),
    pointDefense: markPower(state.installations.pointDefense, 9),
  };
  const personnel = Math.min(28, 4 * Math.max(0, crew.security) + 3 * Math.max(0, crew.engineers));
  const research = Math.min(20, Math.max(0, crew.researchReadiness ?? 0));
  const interceptors = Math.min(18, Math.max(0, crew.interceptorReadiness ?? 0));
  const equipment = Math.min(12, Math.max(0, crew.equipmentReadiness ?? 0));
  const total = Math.min(100, Math.round(installation.shield + installation.repair + installation.pointDefense + personnel + research + interceptors + equipment));
  return { total, installation, personnel: Math.round(personnel), research: Math.round(research), interceptors: Math.round(interceptors), equipment: Math.round(equipment) };
}

export function getDefenseReadiness(state: Pick<DefenseState, "installations">, crew: DefenseCrewContext) {
  return getDefenseReadinessBreakdown(state, crew).total;
}

export function getForecastLeadSeconds(state: Pick<DefenseState, "installations">, navigators: number, researchForecastSeconds = 0) {
  const mark = state.installations.earlyWarningRelay;
  const markLead = [0, 45, 105, 180, 300][mark] ?? 300;
  return 15 * 60 + markLead * 60 + 10 * 60 * Math.min(3, Math.max(0, navigators)) + Math.min(2 * 3_600, Math.max(0, researchForecastSeconds));
}
export function getRepairSpeedMultiplier(state: Pick<DefenseState, "installations">, engineers: number, researchMultiplier = 1) {
  return (1 + 0.65 * state.installations.repairDrones + 0.25 * Math.min(4, Math.max(0, engineers))) * Math.min(1.75, Math.max(1, researchMultiplier));
}

export function getInstallationProjectRequirements(state: Pick<DefenseState, "installations">, id: DefenseInstallationId) {
  const currentMark = state.installations[id];
  const targetMark = Math.min(MAX_INSTALLATION_MARK, currentMark + 1);
  const definition = DEFENSE_INSTALLATION_DEFINITIONS[id];
  const fluxFactor = MARK_FLUX_FACTORS[targetMark] ?? 0;
  const materialFactor = MARK_MATERIAL_FACTORS[targetMark] ?? 0;
  return {
    currentMark,
    targetMark,
    maxed: currentMark >= MAX_INSTALLATION_MARK,
    fluxCost: Math.ceil(definition.baseFluxCost * fluxFactor),
    salvageCost: Math.ceil(definition.baseSalvageCost * materialFactor),
    modelCost: Math.ceil(definition.baseModelCost * materialFactor),
    schematicCost: targetMark >= 2 ? Math.ceil(40 * Math.pow(3, targetMark - 2)) : 0,
    nullTraceCost: targetMark >= 3 ? Math.ceil(80 * Math.pow(3, targetMark - 3)) : 0,
    durationSeconds: Math.ceil(definition.baseSeconds * Math.pow(3.2, Math.max(0, targetMark - 1))),
    requiredResearchId: MARK_RESEARCH[targetMark] ?? null,
    capability: definition.markCapabilities[targetMark - 1] ?? "Maximum architecture",
  };
}

export function beginDefenseInstallationProject(state: DefenseState, id: DefenseInstallationId, totalSeconds: number) {
  if (state.construction || !INSTALLATION_IDS.includes(id)) return state;
  const quote = getInstallationProjectRequirements(state, id);
  if (quote.maxed) return state;
  const next = cloneDefenseState(state);
  next.construction = {
    installationId: id,
    targetMark: quote.targetMark,
    progressSeconds: 0,
    totalSeconds: Math.max(60, totalSeconds),
  };
  return next;
}

export function setDefenseDoctrine(state: DefenseState, doctrine: DefenseDoctrine) {
  return !isDoctrine(doctrine) || doctrine === state.contactDoctrine ? state : { ...cloneDefenseState(state), contactDoctrine: doctrine };
}
export function setEnvironmentalDefenseDoctrine(state: DefenseState, doctrine: EnvironmentalDoctrine) {
  return !isEnvironmentalDoctrine(doctrine) || doctrine === state.environmentalDoctrine ? state : { ...cloneDefenseState(state), environmentalDoctrine: doctrine };
}

function rollSeverity(state: DefenseState, hostile: boolean) {
  if (hostile && !state.firstContactResolved) return 1;
  if (!hostile && state.stats.environmentalResolved === 0) return 1;
  const roll = nextRandom(state);
  return roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
}

function chooseEnvironmentalKind(state: DefenseState, environment: DefenseEnvironment, worldIndex: number) {
  if (environment === "cinder-orbit") return "ash-storm" as const;
  if (environment === "nox-orbit") return nextRandom(state) < 0.7 ? "null-shear" as const : "ion-storm" as const;
  if (environment === "vesper-orbit") return nextRandom(state) < 0.65 ? "null-shear" as const : "debris-front" as const;
  const pool = worldIndex >= 4 ? [...TRANSIT_HAZARDS, "null-shear" as const] : [...TRANSIT_HAZARDS];
  return pool[Math.floor(nextRandom(state) * pool.length)]!;
}

function scheduleNextEvent(state: DefenseState, context: DefenseAdvanceContext) {
  const environmentAvailable = context.stormsEnabled && context.environment !== null;
  const hostilesAvailable = Boolean(context.hostilesEnabled);
  const useHostile = hostilesAvailable && (!state.firstContactResolved || !environmentAvailable || nextRandom(state) < 0.72);
  if (useHostile) {
    const kind = !state.firstContactResolved
      ? "retrograde-probe"
      : context.beaconOnline && nextRandom(state) < 0.28
        ? "beacon-trace"
        : HOSTILE_KINDS[Math.floor(nextRandom(state) * (HOSTILE_KINDS.length - 1))]!;
    const gap = !state.firstContactResolved ? FIRST_HOSTILE_DELAY_SECONDS : HOSTILE_BASE_GAP_SECONDS + nextRandom(state) * 5 * 3_600;
    state.incoming = { kind, target: TARGET_FOR_KIND[kind], severity: rollSeverity(state, true), arrivesAtSeconds: state.clockSeconds + gap, environment: null };
    return;
  }
  if (!environmentAvailable) return;
  const first = state.stats.environmentalResolved === 0;
  const gap = first
    ? context.environment === "transit" ? FIRST_TRANSIT_HAZARD_DELAY_SECONDS : FIRST_STORM_DELAY_SECONDS
    : STORM_BASE_GAP_SECONDS + nextRandom(state) * STORM_BASE_GAP_SECONDS;
  const kind = chooseEnvironmentalKind(state, context.environment!, context.worldIndex);
  state.incoming = { kind, target: TARGET_FOR_KIND[kind], severity: rollSeverity(state, false), arrivesAtSeconds: state.clockSeconds + gap, environment: context.environment };
}

function compromiseFor(target: DefenseEventTarget, duration: number): DefenseCompromise {
  const kind: DefenseCompromiseKind = target === "research" ? "research-quarantine" : target === "automation" ? "drone-seizure" : target === "beacon" ? "beacon-spoof" : target === "archive" ? "archive-contamination" : target === "axiom-core" ? "core-desync" : "flux-siphon";
  return { kind, target, remainingSeconds: Math.min(MAX_COMPROMISE_SECONDS, duration), operationalLoad: target === "hull" || target === "axiom-core" ? 0.08 : 0.04, suppressedAutomationProgram: PROGRAM_FOR_TARGET[target] ?? null };
}

function resolveEvent(state: DefenseState, context: DefenseAdvanceContext, totals: DefenseAdvanceResult) {
  const event = state.incoming!;
  const hostile = isHostileKind(event.kind);
  const contactDoctrine = DEFENSE_DOCTRINE_DEFINITIONS[state.contactDoctrine];
  const environmentDoctrine = ENVIRONMENTAL_DOCTRINE_DEFINITIONS[state.environmentalDoctrine];
  const doctrine = hostile ? contactDoctrine : environmentDoctrine;
  const appliedDoctrine: AppliedDefenseDoctrine = hostile ? state.contactDoctrine : state.environmentalDoctrine;
  const readiness = getDefenseReadiness(state, context);
  const pointDefenseBonus = state.installations.pointDefense * (hostile ? 5 : 4);
  const interceptBonus = hostile && state.contactDoctrine === "intercept" ? 2 * Math.min(4, Math.max(0, context.security)) : 0;
  const margin = readiness + doctrine.marginModifier + pointDefenseBonus + interceptBonus - (hostile ? 34 : 30) * event.severity;
  const outcome: DefenseEventOutcome = margin >= 10 ? "unscathed" : margin >= -20 ? "grazed" : "battered";
  const severityMultiplier = event.severity === 1 ? 1 : event.severity === 2 ? 1.5 : 2;
  const rewardScale = (outcome === "unscathed" ? 1 : outcome === "grazed" ? 0.5 : 0.15) * doctrine.rewardMultiplier * severityMultiplier * (1 + Math.max(0, context.worldIndex - 3) * 0.5);
  const salvage = Math.round((hostile ? 35 : state.environmentalDoctrine === "harvest" ? 38 : 20) * rewardScale);
  const engineeringModels = Math.round((hostile ? 38 : 25) * rewardScale);
  const observeScale = outcome === "battered" ? 0.25 : severityMultiplier;
  const calibrationData = hostile
    ? state.contactDoctrine === "observe" ? Math.round(14 * observeScale) : 0
    : state.environmentalDoctrine === "harvest" ? Math.round(10 * observeScale) : 0;
  const nullTraces = (hostile || event.kind === "null-shear") && (state.contactDoctrine === "observe" || hostile)
    ? Math.round((hostile ? 8 : 4) * observeScale * (1 + Math.max(0, context.worldIndex - 3)))
    : 0;
  let productionPenalty = 0;
  let repairSeconds = 0;
  if (outcome === "grazed") { productionPenalty = 0.05 + 0.05 * nextRandom(state); repairSeconds = 1_800 + 1_800 * nextRandom(state); }
  else if (outcome === "battered") { productionPenalty = MAX_PRODUCTION_PENALTY; repairSeconds = MAX_REPAIR_SECONDS * (0.6 + 0.4 * nextRandom(state)); }
  if (productionPenalty > 0) {
    state.damage = { productionPenalty: Math.min(MAX_PRODUCTION_PENALTY, Math.max(state.damage?.productionPenalty ?? 0, productionPenalty)), repairRemainingSeconds: Math.min(MAX_REPAIR_SECONDS, Math.max(state.damage?.repairRemainingSeconds ?? 0, repairSeconds)) };
    state.stats.damaged += 1;
  } else state.stats.unscathed += 1;

  const injuries: DefenseWound[] = [];
  const eligible = [...(context.eligibleDefenderIds ?? [])];
  if (hostile && state.contactDoctrine !== "evade" && eligible.length > 0 && (outcome === "battered" || (outcome === "grazed" && nextRandom(state) < 0.3 * contactDoctrine.injuryRisk))) {
    const count = outcome === "battered" && event.severity >= 2 ? Math.min(2, eligible.length) : 1;
    const shieldMitigation = 1 - state.installations.shieldArray * 0.07;
    const mitigation = Math.min(1, Math.max(0.2, (context.injuryMitigation ?? 1) * shieldMitigation));
    for (let index = 0; index < count; index += 1) {
      const choice = Math.floor(nextRandom(state) * eligible.length);
      const crewId = eligible.splice(choice, 1)[0]!;
      const baseDamage = outcome === "battered" ? 32 + 12 * event.severity : 18 + 5 * event.severity;
      const personalMitigation = Math.max(
        0.7,
        Math.min(1, context.injuryMultipliers?.[crewId] ?? 1),
      );
      const damage = Math.max(4, Math.round(baseDamage * mitigation * personalMitigation));
      injuries.push({ crewId, damage, injuryTier: damage >= 45 ? "major" : damage >= 25 ? "minor" : null });
    }
  }

  let compromise: DefenseCompromise | null = null;
  if (hostile && (outcome === "battered" || (outcome === "grazed" && nextRandom(state) < 0.25))) {
    compromise = compromiseFor(event.target, (outcome === "battered" ? 4 : 1.5) * 3_600);
    state.compromise = compromise;
    state.stats.compromises += 1;
  }

  let causalFragmentId: string | null = null;
  if (hostile) {
    const nextFragment = DEFENSE_CAUSAL_FRAGMENTS.find((fragment) => !state.causalFragmentIds.includes(fragment.id));
    const identified = !state.firstContactResolved || state.contactDoctrine === "observe" || (context.threatIdentification ?? 0) >= 1;
    if (nextFragment && identified) { causalFragmentId = nextFragment.id; state.causalFragmentIds.push(nextFragment.id); }
    state.firstContactResolved = true;
    state.stats.hostileResolved += 1;
  } else state.stats.environmentalResolved += 1;
  state.stats.resolved += 1;
  state.stats.injuries += injuries.length;
  const resolved: ResolvedDefenseEvent = { kind: event.kind, target: event.target, severity: event.severity, readiness, margin, doctrine: appliedDoctrine, outcome, resolvedAtSeconds: state.clockSeconds, salvage, engineeringModels, calibrationData, nullTraces, productionPenalty, repairSeconds, injuries, compromise, causalFragmentId };
  state.eventLog = [...state.eventLog, resolved].slice(-MAX_EVENT_LOG);
  state.incoming = null;
  totals.salvage += salvage;
  totals.engineeringModels += engineeringModels;
  totals.calibrationData += calibrationData;
  totals.nullTraces += nullTraces;
  totals.resolvedEvents.push(resolved);
}

function advanceConstruction(state: DefenseState, elapsedSeconds: number, speedMultiplier: number) {
  if (!state.construction) return null;
  state.construction.progressSeconds += Math.max(0, elapsedSeconds) * Math.max(0.25, speedMultiplier);
  if (state.construction.progressSeconds < state.construction.totalSeconds) return null;
  const completed = { ...state.construction };
  state.installations[completed.installationId] = completed.targetMark;
  state.construction = null;
  state.stats.installationMarksCompleted += 1;
  return completed;
}

export function advanceDefense(state: DefenseState, elapsedSeconds: number, context: DefenseAdvanceContext): DefenseAdvanceResult {
  const totals: DefenseAdvanceResult = { state, salvage: 0, engineeringModels: 0, calibrationData: 0, nullTraces: 0, resolvedEvents: [], completedInstallation: null };
  let remaining = finite(elapsedSeconds, 0, 90 * 24 * 3_600);
  if (remaining <= 0) return totals;
  const next = cloneDefenseState(state);
  totals.state = next;
  totals.completedInstallation = advanceConstruction(next, remaining, context.constructionSpeedMultiplier ?? 1);

  if (next.incoming && !isHostileKind(next.incoming.kind) && next.incoming.environment !== context.environment) {
    next.incoming = null;
  }
  while (remaining > 0) {
    const enabled = Boolean(context.hostilesEnabled) || (context.stormsEnabled && context.environment !== null);
    if (enabled && !next.incoming) scheduleNextEvent(next, context);
    const boundary = enabled && next.incoming ? Math.min(remaining, Math.max(0, next.incoming.arrivesAtSeconds - next.clockSeconds)) : remaining;
    if (next.damage) {
      const repairSpeed = getRepairSpeedMultiplier(next, context.engineers, context.researchRepairMultiplier);
      next.damage.repairRemainingSeconds -= boundary * repairSpeed;
      if (next.damage.repairRemainingSeconds <= 0) next.damage = null;
    }
    if (next.compromise) {
      next.compromise.remainingSeconds -= boundary;
      if (next.compromise.remainingSeconds <= 0) next.compromise = null;
    }
    next.clockSeconds += boundary;
    remaining -= boundary;
    if (enabled && next.incoming && next.clockSeconds >= next.incoming.arrivesAtSeconds) resolveEvent(next, context, totals);
    if (!enabled) break;
    if (boundary === 0 && remaining > 0 && !next.incoming) { next.clockSeconds += remaining; remaining = 0; }
  }
  return totals;
}

export function getDefenseProductionMultiplier(state: Pick<DefenseState, "damage">) { return 1 - (state.damage?.productionPenalty ?? 0); }
export function getDefenseCompromiseLoad(state: Pick<DefenseState, "compromise">) { return state.compromise?.operationalLoad ?? 0; }
export function getSuppressedAutomationProgram(state: Pick<DefenseState, "compromise">) { return state.compromise?.suppressedAutomationProgram ?? null; }
export function getIncomingForecast(state: DefenseState, navigators: number, researchForecastSeconds = 0) {
  if (!state.incoming) return null;
  const lead = getForecastLeadSeconds(state, navigators, researchForecastSeconds);
  const secondsUntil = state.incoming.arrivesAtSeconds - state.clockSeconds;
  return { ...state.incoming, secondsUntil, severityKnown: secondsUntil <= lead, hostile: isHostileKind(state.incoming.kind) };
}

export function getDoctrineDefinition(doctrine: AppliedDefenseDoctrine) {
  return isDoctrine(doctrine)
    ? DEFENSE_DOCTRINE_DEFINITIONS[doctrine]
    : ENVIRONMENTAL_DOCTRINE_DEFINITIONS[doctrine];
}
