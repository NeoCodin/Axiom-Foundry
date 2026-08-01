export type BioadaptationId =
  | "atmospheric-adaptation"
  | "radiation-resistance"
  | "null-resistance"
  | "prosthetic-integration"
  | "cognitive-assistance"
  | "extended-field-endurance";

export type BioadaptationRecord = {
  id: BioadaptationId;
  atOperationalSeconds: number;
  consentVersion: number;
};

export type BioadaptationProcedure = {
  survivorId: string;
  adaptationId: BioadaptationId;
  progressSeconds: number;
  totalSeconds: number;
  startedAtOperationalSeconds: number;
};

export type BioadaptationState = {
  schema: number;
  active: BioadaptationProcedure | null;
  completedProcedures: number;
};

export type BioadaptationEffects = {
  expeditionStrength: number;
  expeditionDurationMultiplier: number;
  injuryMultiplier: number;
  defenseReadiness: number;
  threatIdentification: number;
  researchExpertise: number;
};

export type BioadaptationDefinition = {
  id: BioadaptationId;
  name: string;
  code: string;
  summary: string;
  completedSummary: string;
  requiredResearchId: string;
  requiredResearchName: string;
  baseDurationSeconds: number;
  cost: {
    flux: number;
    axioms: number;
    biologicalSamples: number;
    culturalRecords: number;
    nullTraces: number;
    engineeringModels: number;
  };
  consent: string;
  contradiction: string;
  effects: Partial<BioadaptationEffects>;
};

export const BIOADAPTATION_SCHEMA = 1;
export const BIOADAPTATION_CONSENT_VERSION = 1;
export const MAX_BIOADAPTATIONS_PER_SURVIVOR = 2;

export const BIOADAPTATION_DEFINITIONS: readonly BioadaptationDefinition[] = [
  {
    id: "atmospheric-adaptation",
    name: "Atmospheric Symbiosis",
    code: "ATM",
    summary: "Teach the respiratory system to tolerate unstable pressure, oxygen, and spore profiles.",
    completedSummary: "+1 expedition strength on every field operation.",
    requiredResearchId: "atmospheric-symbiosis",
    requiredResearchName: "Atmospheric Symbiosis",
    baseDurationSeconds: 4 * 3_600,
    cost: { flux: 12_000, axioms: 1, biologicalSamples: 900, culturalRecords: 260, nullTraces: 0, engineeringModels: 240 },
    consent: "I understand this is a permanent, elective adaptation and that declining it will never disqualify me from Continuity.",
    contradiction: "The volunteer's lungs remember an atmosphere from a world the Ark has not visited.",
    effects: { expeditionStrength: 1 },
  },
  {
    id: "radiation-resistance",
    name: "Radiation Memory Therapy",
    code: "RAD",
    summary: "Prime cellular repair pathways to recognize ionizing damage before it accumulates.",
    completedSummary: "15% less expedition injury damage.",
    requiredResearchId: "radiation-memory-therapy",
    requiredResearchName: "Radiation Memory Therapy",
    baseDurationSeconds: 5 * 3_600,
    cost: { flux: 16_000, axioms: 1, biologicalSamples: 1_100, culturalRecords: 220, nullTraces: 0, engineeringModels: 320 },
    consent: "I understand that the treatment permanently changes cellular repair behavior and is not required for service or settlement.",
    contradiction: "Treated cells repair damage from an exposure logged thirty-seven years in the future.",
    effects: { injuryMultiplier: 0.85 },
  },
  {
    id: "null-resistance",
    name: "Null Exposure Conditioning",
    code: "NUL",
    summary: "Build a stable sense of self under controlled absence, contradiction, and Null shear.",
    completedSummary: "+2 defense readiness and 10% less hostile-event injury damage.",
    requiredResearchId: "null-exposure-conditioning",
    requiredResearchName: "Null Exposure Conditioning",
    baseDurationSeconds: 8 * 3_600,
    cost: { flux: 28_000, axioms: 2, biologicalSamples: 1_400, culturalRecords: 900, nullTraces: 700, engineeringModels: 500 },
    consent: "I understand that this elective procedure may change how I perceive contradictory memories, without changing who the Ark records me to be.",
    contradiction: "The volunteer recalls refusing the procedure with equal neurological certainty.",
    effects: { defenseReadiness: 2, injuryMultiplier: 0.9 },
  },
  {
    id: "prosthetic-integration",
    name: "Prosthetic Neural Bridge",
    code: "PNB",
    summary: "Integrate tools and prostheses without treating the person as a replaceable component.",
    completedSummary: "+1 expedition strength and 5% less expedition injury damage.",
    requiredResearchId: "prosthetic-neural-bridge",
    requiredResearchName: "Prosthetic Neural Bridge",
    baseDurationSeconds: 6 * 3_600,
    cost: { flux: 22_000, axioms: 1, biologicalSamples: 850, culturalRecords: 650, nullTraces: 180, engineeringModels: 900 },
    consent: "I understand that integration is permanent, elective, and does not transfer ownership of any part of my body or service record to the Ark.",
    contradiction: "The bridge recognizes a prosthetic serial number that has never been fabricated.",
    effects: { expeditionStrength: 1, injuryMultiplier: 0.95 },
  },
  {
    id: "cognitive-assistance",
    name: "Cognitive Assistance Interface",
    code: "CAI",
    summary: "Add a voluntary memory and pattern interface whose recommendations remain visibly separate from the person.",
    completedSummary: "Researchers add +1 operational Research expertise; defenders add +1 threat identification.",
    requiredResearchId: "cognitive-assistance-interface",
    requiredResearchName: "Cognitive Assistance Interface",
    baseDurationSeconds: 7 * 3_600,
    cost: { flux: 24_000, axioms: 2, biologicalSamples: 760, culturalRecords: 1_200, nullTraces: 360, engineeringModels: 720 },
    consent: "I understand that the interface is advisory, permanent, and may be ignored; my decisions remain my own.",
    contradiction: "The interface finishes one private memory in a voice that identifies itself as a descendant.",
    effects: { researchExpertise: 1, threatIdentification: 1 },
  },
  {
    id: "extended-field-endurance",
    name: "Extended Field Endurance",
    code: "EFE",
    summary: "Coordinate metabolism, sleep, and recovery for long operations without suppressing fatigue warnings.",
    completedSummary: "5% shorter expeditions and 10% less expedition injury damage.",
    requiredResearchId: "field-endurance-remodeling",
    requiredResearchName: "Field Endurance Remodeling",
    baseDurationSeconds: 6 * 3_600,
    cost: { flux: 20_000, axioms: 1, biologicalSamples: 1_000, culturalRecords: 480, nullTraces: 140, engineeringModels: 460 },
    consent: "I understand this elective adaptation changes recovery rhythms permanently and does not obligate me to field service.",
    contradiction: "Sleep telemetry contains dreams recorded while the volunteer was awake.",
    effects: { expeditionDurationMultiplier: 0.95, injuryMultiplier: 0.9 },
  },
] as const;

export const getBioadaptationDefinition = (id: BioadaptationId) =>
  BIOADAPTATION_DEFINITIONS.find((definition) => definition.id === id)!;

export const isBioadaptationId = (value: unknown): value is BioadaptationId =>
  BIOADAPTATION_DEFINITIONS.some((definition) => definition.id === value);

export function sanitizeBioadaptationRecords(value: unknown): BioadaptationRecord[] {
  if (!Array.isArray(value)) return [];
  const records: BioadaptationRecord[] = [];
  const seen = new Set<BioadaptationId>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const source = raw as Record<string, unknown>;
    if (!isBioadaptationId(source.id) || seen.has(source.id)) continue;
    seen.add(source.id);
    records.push({
      id: source.id,
      atOperationalSeconds: typeof source.atOperationalSeconds === "number" && Number.isFinite(source.atOperationalSeconds) ? Math.max(0, source.atOperationalSeconds) : 0,
      consentVersion: typeof source.consentVersion === "number" && Number.isFinite(source.consentVersion) ? Math.max(1, Math.floor(source.consentVersion)) : BIOADAPTATION_CONSENT_VERSION,
    });
    if (records.length >= MAX_BIOADAPTATIONS_PER_SURVIVOR) break;
  }
  return records;
}

export function createBioadaptationState(): BioadaptationState {
  return { schema: BIOADAPTATION_SCHEMA, active: null, completedProcedures: 0 };
}

export function cloneBioadaptationState(state: BioadaptationState): BioadaptationState {
  return { ...state, active: state.active ? { ...state.active } : null };
}

export function sanitizeBioadaptationState(value: unknown, survivorIds: ReadonlySet<string>): BioadaptationState {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const activeSource = source.active && typeof source.active === "object" ? source.active as Record<string, unknown> : null;
  let active: BioadaptationProcedure | null = null;
  if (activeSource && typeof activeSource.survivorId === "string" && survivorIds.has(activeSource.survivorId) && isBioadaptationId(activeSource.adaptationId)) {
    const definition = getBioadaptationDefinition(activeSource.adaptationId);
    const totalSeconds = typeof activeSource.totalSeconds === "number" && Number.isFinite(activeSource.totalSeconds) ? Math.max(60, activeSource.totalSeconds) : definition.baseDurationSeconds;
    active = {
      survivorId: activeSource.survivorId,
      adaptationId: activeSource.adaptationId,
      progressSeconds: typeof activeSource.progressSeconds === "number" && Number.isFinite(activeSource.progressSeconds) ? Math.min(totalSeconds, Math.max(0, activeSource.progressSeconds)) : 0,
      totalSeconds,
      startedAtOperationalSeconds: typeof activeSource.startedAtOperationalSeconds === "number" && Number.isFinite(activeSource.startedAtOperationalSeconds) ? Math.max(0, activeSource.startedAtOperationalSeconds) : 0,
    };
  }
  return {
    schema: BIOADAPTATION_SCHEMA,
    active,
    completedProcedures: typeof source.completedProcedures === "number" && Number.isFinite(source.completedProcedures) ? Math.max(0, Math.floor(source.completedProcedures)) : 0,
  };
}

export function beginBioadaptationProcedure(state: BioadaptationState, survivorId: string, adaptationId: BioadaptationId, operationalSeconds: number): BioadaptationState {
  if (state.active) return state;
  const definition = getBioadaptationDefinition(adaptationId);
  return {
    ...state,
    active: {
      survivorId,
      adaptationId,
      progressSeconds: 0,
      totalSeconds: definition.baseDurationSeconds,
      startedAtOperationalSeconds: Math.max(0, operationalSeconds),
    },
  };
}

export function advanceBioadaptation(state: BioadaptationState, elapsedSeconds: number, speedMultiplier = 1) {
  if (!state.active || elapsedSeconds <= 0) return { state, completed: null as BioadaptationRecord | null, survivorId: null as string | null };
  const next = cloneBioadaptationState(state);
  const active = next.active!;
  active.progressSeconds = Math.min(active.totalSeconds, active.progressSeconds + Math.max(0, elapsedSeconds) * Math.max(0.25, Math.min(4, speedMultiplier)));
  if (active.progressSeconds < active.totalSeconds) return { state: next, completed: null as BioadaptationRecord | null, survivorId: null as string | null };
  const completed: BioadaptationRecord = {
    id: active.adaptationId,
    atOperationalSeconds: active.startedAtOperationalSeconds + active.totalSeconds,
    consentVersion: BIOADAPTATION_CONSENT_VERSION,
  };
  const survivorId = active.survivorId;
  next.active = null;
  next.completedProcedures += 1;
  return { state: next, completed, survivorId };
}

export function getBioadaptationEffects(records: readonly BioadaptationRecord[] | undefined): BioadaptationEffects {
  const result: BioadaptationEffects = { expeditionStrength: 0, expeditionDurationMultiplier: 1, injuryMultiplier: 1, defenseReadiness: 0, threatIdentification: 0, researchExpertise: 0 };
  for (const record of records ?? []) {
    const effects = getBioadaptationDefinition(record.id).effects;
    result.expeditionStrength += effects.expeditionStrength ?? 0;
    result.expeditionDurationMultiplier *= effects.expeditionDurationMultiplier ?? 1;
    result.injuryMultiplier *= effects.injuryMultiplier ?? 1;
    result.defenseReadiness += effects.defenseReadiness ?? 0;
    result.threatIdentification += effects.threatIdentification ?? 0;
    result.researchExpertise += effects.researchExpertise ?? 0;
  }
  result.expeditionDurationMultiplier = Math.max(0.85, result.expeditionDurationMultiplier);
  result.injuryMultiplier = Math.max(0.7, result.injuryMultiplier);
  return result;
}
