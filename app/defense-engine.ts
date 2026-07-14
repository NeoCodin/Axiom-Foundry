/**
 * Idle-first Threat Operations.
 *
 * Cinder introduces environmental defense. Nox adds retrograde contacts,
 * injuries, equipment influence, targeted compromises, and causal evidence.
 * Every result is deterministic, automatic, bounded, and recoverable.
 */

export type DefenseDoctrine = "defend" | "evade" | "intercept" | "observe";
export type DefenseInstallationId = "shieldArray" | "pointDefense" | "repairDrones" | "earlyWarningRelay";
export type DefenseEventOutcome = "unscathed" | "grazed" | "battered";
export type DefenseEventKind =
  | "ash-storm"
  | "retrograde-probe"
  | "vessel-approach"
  | "boarding-feint"
  | "archive-intrusion"
  | "core-interdiction"
  | "beacon-trace";
export type DefenseEventTarget = "hull" | "beacon" | "research" | "archive" | "automation" | "axiom-core";
export type DefenseCompromiseKind = "flux-siphon" | "research-quarantine" | "drone-seizure" | "beacon-spoof" | "core-desync" | "archive-contamination";

export type DefenseWound = { crewId: string; damage: number; injuryTier: "minor" | "major" | null };
export type DefenseCompromise = {
  kind: DefenseCompromiseKind;
  target: DefenseEventTarget;
  remainingSeconds: number;
  operationalLoad: number;
  suppressedAutomationProgram: string | null;
};

export type ResolvedDefenseEvent = {
  kind: DefenseEventKind;
  target: DefenseEventTarget;
  severity: number;
  readiness: number;
  margin: number;
  doctrine: DefenseDoctrine;
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

export type DefenseDamage = { productionPenalty: number; repairRemainingSeconds: number };
export type IncomingDefenseEvent = { kind: DefenseEventKind; target: DefenseEventTarget; severity: number; arrivesAtSeconds: number };
export type DefenseState = {
  schema: number;
  rngState: number;
  clockSeconds: number;
  doctrine: DefenseDoctrine;
  installations: Record<DefenseInstallationId, number>;
  incoming: IncomingDefenseEvent | null;
  damage: DefenseDamage | null;
  compromise: DefenseCompromise | null;
  eventLog: ResolvedDefenseEvent[];
  causalFragmentIds: string[];
  firstContactResolved: boolean;
  stats: { resolved: number; unscathed: number; damaged: number; hostileResolved: number; injuries: number; compromises: number };
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
  eligibleDefenderIds?: readonly string[];
  threatIdentification?: number;
};
export type DefenseAdvanceContext = DefenseCrewContext & {
  stormsEnabled: boolean;
  hostilesEnabled?: boolean;
  beaconOnline?: boolean;
  worldIndex: number;
};
export type DefenseAdvanceResult = {
  state: DefenseState;
  salvage: number;
  engineeringModels: number;
  calibrationData: number;
  nullTraces: number;
  resolvedEvents: ResolvedDefenseEvent[];
};

export const DEFENSE_SCHEMA = 2;
export const MAX_INSTALLATION_LEVEL = 5;
export const MAX_EVENT_LOG = 16;
export const MAX_PRODUCTION_PENALTY = 0.25;
export const MAX_REPAIR_SECONDS = 6 * 3_600;
export const MAX_COMPROMISE_SECONDS = 6 * 3_600;
export const FIRST_STORM_DELAY_SECONDS = 2 * 3_600;
export const FIRST_HOSTILE_DELAY_SECONDS = 90 * 60;
export const STORM_BASE_GAP_SECONDS = 4 * 3_600;
export const HOSTILE_BASE_GAP_SECONDS = 5 * 3_600;

export const DEFENSE_EVENT_DEFINITIONS: Readonly<Record<DefenseEventKind, { label: string; hostile: boolean; summary: string }>> = {
  "ash-storm": { label: "Ash Storm", hostile: false, summary: "Cinder weather stresses the Ark's shields and exposed systems." },
  "retrograde-probe": { label: "Retrograde Probe", hostile: true, summary: "A contact measures the Ark from a trajectory that has no visible origin." },
  "vessel-approach": { label: "Unknown Vessel", hostile: true, summary: "A vessel approaches on an impossible intercept and refuses present-day authentication." },
  "boarding-feint": { label: "Boarding Feint", hostile: true, summary: "False docking calls draw defenders away from an attempted systems intrusion." },
  "archive-intrusion": { label: "Archive Intrusion", hostile: true, summary: "The contact attempts to contaminate the Ark's recovered history rather than destroy it." },
  "core-interdiction": { label: "Core Interdiction", hostile: true, summary: "The vessel targets the Axiom Chamber and the futures it keeps coherent." },
  "beacon-trace": { label: "Beacon Trace", hostile: true, summary: "An SOS transmission has been answered by something that already knew its contents." },
};

export const DEFENSE_CAUSAL_FRAGMENTS = [
  { id: "contact-before-cause", title: "Contact Before Cause", text: "The probe's authentication reply was transmitted eleven minutes before AXIOM issued the challenge." },
  { id: "protected-lifeboat", title: "The Protected Lifeboat", text: "A hostile vessel broke its own firing solution to avoid a civilian rescue craft." },
  { id: "returned-navigation", title: "Returned Navigation", text: "Recovered charts mark restored worlds as causal origins, not military targets." },
  { id: "ark-casualty-index", title: "Ark Casualty Index", text: "The enemy's casualty ledger lists entire futures. AXIOM appears in both the survivor and cause fields." },
] as const;

export const DEFENSE_DOCTRINE_DEFINITIONS: Record<DefenseDoctrine, { label: string; marginModifier: number; rewardMultiplier: number; injuryRisk: number; summary: string }> = {
  defend: { label: "Defend", marginModifier: 10, rewardMultiplier: 1, injuryRisk: 0.7, summary: "Hold behind shields. The safest balanced answer." },
  evade: { label: "Evade", marginModifier: 20, rewardMultiplier: 0.4, injuryRisk: 0, summary: "Maneuver clear. No automatic crew injury, minimal evidence." },
  intercept: { label: "Intercept", marginModifier: -10, rewardMultiplier: 1.8, injuryRisk: 1, summary: "Meet the contact outside the hull. Better salvage, greater injury risk." },
  observe: { label: "Observe", marginModifier: -5, rewardMultiplier: 0.8, injuryRisk: 0.85, summary: "Instrument the event. Best Calibration, Null data, and identification." },
};

export const DEFENSE_INSTALLATION_DEFINITIONS: Record<DefenseInstallationId, { name: string; baseCost: number; description: string }> = {
  shieldArray: { name: "Shield Array", baseCost: 1_200, description: "The backbone of readiness. Each level hardens the hull envelope." },
  repairDrones: { name: "Repair Drones", baseCost: 900, description: "Adds readiness and shortens recoverable damage." },
  pointDefense: { name: "Point-Defense Grid", baseCost: 900, description: "Shreds debris and later contests retrograde vessels." },
  earlyWarningRelay: { name: "Early-Warning Relay", baseCost: 700, description: "Extends forecasts and exposes stealthy hostile contacts." },
};

const DEFAULT_SEED = 0x2545f491;
const INSTALLATION_IDS: readonly DefenseInstallationId[] = ["shieldArray", "pointDefense", "repairDrones", "earlyWarningRelay"];
const HOSTILE_KINDS: readonly DefenseEventKind[] = ["retrograde-probe", "vessel-approach", "boarding-feint", "archive-intrusion", "core-interdiction", "beacon-trace"];
const TARGET_FOR_KIND: Record<DefenseEventKind, DefenseEventTarget> = {
  "ash-storm": "hull",
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
const isKind = (value: unknown): value is DefenseEventKind => typeof value === "string" && value in DEFENSE_EVENT_DEFINITIONS;
const isTarget = (value: unknown): value is DefenseEventTarget => value === "hull" || value === "beacon" || value === "research" || value === "archive" || value === "automation" || value === "axiom-core";
const isCompromiseKind = (value: unknown): value is DefenseCompromiseKind => value === "flux-siphon" || value === "research-quarantine" || value === "drone-seizure" || value === "beacon-spoof" || value === "core-desync" || value === "archive-contamination";

function nextRandom(state: DefenseState) { let value = state.rngState >>> 0; if (!value) value = DEFAULT_SEED; value ^= value << 13; value ^= value >>> 17; value ^= value << 5; state.rngState = (value >>> 0) || DEFAULT_SEED; return state.rngState / 0x1_0000_0000; }

export function createDefenseState(seed = DEFAULT_SEED): DefenseState {
  return {
    schema: DEFENSE_SCHEMA,
    rngState: (whole(seed, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: 0,
    doctrine: "defend",
    installations: { shieldArray: 0, pointDefense: 0, repairDrones: 0, earlyWarningRelay: 0 },
    incoming: null,
    damage: null,
    compromise: null,
    eventLog: [],
    causalFragmentIds: [],
    firstContactResolved: false,
    stats: { resolved: 0, unscathed: 0, damaged: 0, hostileResolved: 0, injuries: 0, compromises: 0 },
  };
}

export function cloneDefenseState(state: DefenseState): DefenseState {
  return {
    ...state,
    installations: { ...state.installations },
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
  const stats = isRecord(value.stats) ? value.stats : {};
  const state: DefenseState = {
    ...base,
    rngState: (whole(value.rngState, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: finite(value.clockSeconds, 0, 1e15),
    doctrine: isDoctrine(value.doctrine) ? value.doctrine : "defend",
    firstContactResolved: value.firstContactResolved === true,
    causalFragmentIds: Array.isArray(value.causalFragmentIds)
      ? DEFENSE_CAUSAL_FRAGMENTS.map((entry) => entry.id).filter((id) => (value.causalFragmentIds as unknown[]).includes(id))
      : [],
    stats: {
      resolved: whole(stats.resolved, 0, 1e9),
      unscathed: whole(stats.unscathed, 0, 1e9),
      damaged: whole(stats.damaged, 0, 1e9),
      hostileResolved: whole(stats.hostileResolved, 0, 1e9),
      injuries: whole(stats.injuries, 0, 1e9),
      compromises: whole(stats.compromises, 0, 1e9),
    },
  };
  const rawInstallations = isRecord(value.installations) ? value.installations : {};
  for (const id of INSTALLATION_IDS) state.installations[id] = whole(rawInstallations[id], 0, MAX_INSTALLATION_LEVEL);
  if (isRecord(value.incoming)) {
    const arrivesAtSeconds = finite(value.incoming.arrivesAtSeconds, 0, 1e15);
    if (arrivesAtSeconds > state.clockSeconds) {
      const kind = isKind(value.incoming.kind) ? value.incoming.kind : "ash-storm";
      state.incoming = { kind, target: isTarget(value.incoming.target) ? value.incoming.target : TARGET_FOR_KIND[kind], severity: Math.max(1, whole(value.incoming.severity, 1, 3)), arrivesAtSeconds };
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
      const compromise = sanitizeCompromise(raw.compromise);
      return {
        kind,
        target: isTarget(raw.target) ? raw.target : TARGET_FOR_KIND[kind],
        severity: Math.max(1, whole(raw.severity, 1, 3)),
        readiness: finite(raw.readiness, 0, 100),
        margin: signed(raw.margin),
        doctrine: isDoctrine(raw.doctrine) ? raw.doctrine : "defend",
        outcome: raw.outcome === "grazed" || raw.outcome === "battered" ? raw.outcome : "unscathed",
        resolvedAtSeconds: finite(raw.resolvedAtSeconds, 0, 1e15),
        salvage: finite(raw.salvage, 0, 1e9),
        engineeringModels: finite(raw.engineeringModels, 0, 1e9),
        calibrationData: finite(raw.calibrationData, 0, 1e9),
        nullTraces: finite(raw.nullTraces, 0, 1e9),
        productionPenalty: finite(raw.productionPenalty, 0, MAX_PRODUCTION_PENALTY),
        repairSeconds: finite(raw.repairSeconds, 0, MAX_REPAIR_SECONDS),
        injuries: Array.isArray(raw.injuries) ? raw.injuries.filter(isRecord).slice(0, 3).map((injury) => ({ crewId: String(injury.crewId ?? ""), damage: finite(injury.damage, 0, 80), injuryTier: injury.injuryTier === "major" ? "major" : injury.injuryTier === "minor" ? "minor" : null })) : [],
        compromise,
        causalFragmentId: typeof raw.causalFragmentId === "string" ? raw.causalFragmentId : null,
      };
    });
  }
  return state;
}

export function getDefenseReadiness(state: Pick<DefenseState, "installations">, crew: DefenseCrewContext) {
  const value =
    22 * Math.pow(state.installations.shieldArray, 0.8) +
    10 * Math.sqrt(state.installations.repairDrones) +
    6 * Math.sqrt(state.installations.pointDefense) +
    4 * Math.min(4, Math.max(0, crew.security)) +
    3 * Math.min(4, Math.max(0, crew.engineers)) +
    Math.min(20, Math.max(0, crew.researchReadiness ?? 0)) +
    Math.min(18, Math.max(0, crew.interceptorReadiness ?? 0)) +
    Math.min(12, Math.max(0, crew.equipmentReadiness ?? 0));
  return Math.min(100, Math.round(value));
}

export function getForecastLeadSeconds(state: Pick<DefenseState, "installations">, navigators: number, researchForecastSeconds = 0) {
  return 15 * 60 + 45 * 60 * state.installations.earlyWarningRelay + 10 * 60 * Math.min(3, Math.max(0, navigators)) + Math.min(2 * 3_600, Math.max(0, researchForecastSeconds));
}
export function getRepairSpeedMultiplier(state: Pick<DefenseState, "installations">, engineers: number, researchMultiplier = 1) {
  return (1 + 0.5 * state.installations.repairDrones + 0.25 * Math.min(4, Math.max(0, engineers))) * Math.min(1.75, Math.max(1, researchMultiplier));
}
export function getInstallationCost(state: Pick<DefenseState, "installations">, id: DefenseInstallationId, continuityScale: number) {
  const level = state.installations[id];
  if (level >= MAX_INSTALLATION_LEVEL) return Number.POSITIVE_INFINITY;
  return Math.ceil(DEFENSE_INSTALLATION_DEFINITIONS[id].baseCost * Math.max(1, continuityScale) * Math.pow(1.6, level));
}
export function setDefenseDoctrine(state: DefenseState, doctrine: DefenseDoctrine) { return !isDoctrine(doctrine) || doctrine === state.doctrine ? state : { ...cloneDefenseState(state), doctrine }; }
export function upgradeDefenseInstallation(state: DefenseState, id: DefenseInstallationId) {
  if (!INSTALLATION_IDS.includes(id) || state.installations[id] >= MAX_INSTALLATION_LEVEL) return state;
  const next = cloneDefenseState(state); next.installations[id] += 1; return next;
}

function rollSeverity(state: DefenseState, hostile: boolean) {
  if (hostile && !state.firstContactResolved) return 1;
  if (!hostile && state.stats.resolved === 0) return 1;
  const roll = nextRandom(state); return roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
}
function scheduleNextEvent(state: DefenseState, context: DefenseAdvanceContext) {
  const useHostile = Boolean(context.hostilesEnabled) && (!state.firstContactResolved || nextRandom(state) < 0.78);
  if (useHostile) {
    const kind = !state.firstContactResolved
      ? "retrograde-probe"
      : context.beaconOnline && nextRandom(state) < 0.28
        ? "beacon-trace"
        : HOSTILE_KINDS[Math.floor(nextRandom(state) * (HOSTILE_KINDS.length - 1))]!;
    const gap = !state.firstContactResolved ? FIRST_HOSTILE_DELAY_SECONDS : HOSTILE_BASE_GAP_SECONDS + nextRandom(state) * 5 * 3_600;
    state.incoming = { kind, target: TARGET_FOR_KIND[kind], severity: rollSeverity(state, true), arrivesAtSeconds: state.clockSeconds + gap };
  } else {
    const gap = state.stats.resolved === 0 && state.eventLog.length === 0 ? FIRST_STORM_DELAY_SECONDS : STORM_BASE_GAP_SECONDS + nextRandom(state) * STORM_BASE_GAP_SECONDS;
    state.incoming = { kind: "ash-storm", target: "hull", severity: rollSeverity(state, false), arrivesAtSeconds: state.clockSeconds + gap };
  }
}

function compromiseFor(target: DefenseEventTarget, duration: number): DefenseCompromise {
  const kind: DefenseCompromiseKind = target === "research" ? "research-quarantine" : target === "automation" ? "drone-seizure" : target === "beacon" ? "beacon-spoof" : target === "archive" ? "archive-contamination" : target === "axiom-core" ? "core-desync" : "flux-siphon";
  return { kind, target, remainingSeconds: Math.min(MAX_COMPROMISE_SECONDS, duration), operationalLoad: target === "hull" || target === "axiom-core" ? 0.08 : 0.04, suppressedAutomationProgram: PROGRAM_FOR_TARGET[target] ?? null };
}

function resolveEvent(state: DefenseState, context: DefenseAdvanceContext, totals: DefenseAdvanceResult) {
  const event = state.incoming!;
  const hostile = DEFENSE_EVENT_DEFINITIONS[event.kind].hostile;
  const doctrine = DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine];
  const readiness = getDefenseReadiness(state, context);
  const pointDefenseBonus = hostile ? state.installations.pointDefense * 4 : 0;
  const interceptBonus = state.doctrine === "intercept" ? 2 * Math.min(4, Math.max(0, context.security)) : 0;
  const margin = readiness + doctrine.marginModifier + pointDefenseBonus + interceptBonus - (hostile ? 32 : 30) * event.severity;
  const outcome: DefenseEventOutcome = margin >= 10 ? "unscathed" : margin >= -20 ? "grazed" : "battered";
  const severityMultiplier = event.severity === 1 ? 1 : event.severity === 2 ? 1.5 : 2;
  const rewardScale = (outcome === "unscathed" ? 1 : outcome === "grazed" ? 0.5 : 0.15) * doctrine.rewardMultiplier * severityMultiplier * (1 + Math.max(0, context.worldIndex - 3) * 0.5);
  const salvage = Math.round((hostile ? 35 : 20) * rewardScale);
  const engineeringModels = Math.round((hostile ? 38 : 25) * rewardScale);
  const observeScale = outcome === "battered" ? 0.25 : severityMultiplier;
  const calibrationData = state.doctrine === "observe" ? Math.round((hostile ? 14 : 8) * observeScale) : 0;
  const nullTraces = state.doctrine === "observe" || hostile ? Math.round((hostile ? 8 : 4) * observeScale * (1 + Math.max(0, context.worldIndex - 3))) : 0;
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
  if (hostile && state.doctrine !== "evade" && eligible.length > 0 && (outcome === "battered" || (outcome === "grazed" && nextRandom(state) < 0.3 * doctrine.injuryRisk))) {
    const count = outcome === "battered" && event.severity >= 2 ? Math.min(2, eligible.length) : 1;
    const mitigation = Math.min(1, Math.max(0.2, context.injuryMitigation ?? 1));
    for (let index = 0; index < count; index += 1) {
      const choice = Math.floor(nextRandom(state) * eligible.length);
      const crewId = eligible.splice(choice, 1)[0]!;
      const baseDamage = outcome === "battered" ? 32 + 12 * event.severity : 18 + 5 * event.severity;
      const damage = Math.max(4, Math.round(baseDamage * mitigation));
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
    const identified = !state.firstContactResolved || state.doctrine === "observe" || (context.threatIdentification ?? 0) >= 1;
    if (nextFragment && identified) { causalFragmentId = nextFragment.id; state.causalFragmentIds.push(nextFragment.id); }
    state.firstContactResolved = true;
    state.stats.hostileResolved += 1;
  }
  state.stats.resolved += 1;
  state.stats.injuries += injuries.length;
  const resolved: ResolvedDefenseEvent = { kind: event.kind, target: event.target, severity: event.severity, readiness, margin, doctrine: state.doctrine, outcome, resolvedAtSeconds: state.clockSeconds, salvage, engineeringModels, calibrationData, nullTraces, productionPenalty, repairSeconds, injuries, compromise, causalFragmentId };
  state.eventLog = [...state.eventLog, resolved].slice(-MAX_EVENT_LOG);
  state.incoming = null;
  totals.salvage += salvage; totals.engineeringModels += engineeringModels; totals.calibrationData += calibrationData; totals.nullTraces += nullTraces; totals.resolvedEvents.push(resolved);
}

export function advanceDefense(state: DefenseState, elapsedSeconds: number, context: DefenseAdvanceContext): DefenseAdvanceResult {
  const totals: DefenseAdvanceResult = { state, salvage: 0, engineeringModels: 0, calibrationData: 0, nullTraces: 0, resolvedEvents: [] };
  let remaining = finite(elapsedSeconds, 0, 90 * 24 * 3_600);
  if (remaining <= 0) return totals;
  const next = cloneDefenseState(state); totals.state = next;
  while (remaining > 0) {
    const enabled = context.stormsEnabled || Boolean(context.hostilesEnabled);
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
    next.clockSeconds += boundary; remaining -= boundary;
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
  return { ...state.incoming, secondsUntil, severityKnown: secondsUntil <= lead, hostile: DEFENSE_EVENT_DEFINITIONS[state.incoming.kind].hostile };
}
