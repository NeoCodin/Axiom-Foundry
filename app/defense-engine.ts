/**
 * Threat Operations Phase 1: environmental defense (Cinder ash storms).
 * See docs/threat-operations-spec.md. Idle-first: preparation plus automatic
 * resolution, identical online and offline, with hard-capped temporary
 * consequences and no permanent loss of any kind.
 */

export type DefenseDoctrine = "defend" | "evade" | "intercept" | "observe";

export type DefenseInstallationId =
  | "shieldArray"
  | "pointDefense"
  | "repairDrones"
  | "earlyWarningRelay";

export type DefenseEventOutcome = "unscathed" | "grazed" | "battered";

export type ResolvedDefenseEvent = {
  kind: "ash-storm";
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
};

export type DefenseDamage = {
  productionPenalty: number;
  repairRemainingSeconds: number;
};

export type IncomingDefenseEvent = {
  kind: "ash-storm";
  severity: number;
  arrivesAtSeconds: number;
};

export type DefenseState = {
  schema: number;
  rngState: number;
  clockSeconds: number;
  doctrine: DefenseDoctrine;
  installations: Record<DefenseInstallationId, number>;
  incoming: IncomingDefenseEvent | null;
  damage: DefenseDamage | null;
  eventLog: ResolvedDefenseEvent[];
  stats: { resolved: number; unscathed: number; damaged: number };
};

export type DefenseCrewContext = {
  security: number;
  engineers: number;
  navigators: number;
};

export type DefenseAdvanceContext = DefenseCrewContext & {
  stormsEnabled: boolean;
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

export const DEFENSE_SCHEMA = 1;
export const MAX_INSTALLATION_LEVEL = 5;
export const MAX_EVENT_LOG = 12;
export const MAX_PRODUCTION_PENALTY = 0.25;
export const MAX_REPAIR_SECONDS = 6 * 3_600;
export const FIRST_STORM_DELAY_SECONDS = 2 * 3_600;
export const STORM_BASE_GAP_SECONDS = 4 * 3_600;

export const DEFENSE_DOCTRINE_DEFINITIONS: Record<
  DefenseDoctrine,
  { label: string; marginModifier: number; rewardMultiplier: number; summary: string }
> = {
  defend: {
    label: "Defend",
    marginModifier: 10,
    rewardMultiplier: 1,
    summary: "Hold position behind the shields. The safe default.",
  },
  evade: {
    label: "Evade",
    marginModifier: 20,
    rewardMultiplier: 0.4,
    summary: "Maneuver clear of the worst bands. Near-immune, minimal gain.",
  },
  intercept: {
    label: "Intercept",
    marginModifier: -10,
    rewardMultiplier: 1.8,
    summary: "Fly into the front to harvest it. Security crews add margin.",
  },
  observe: {
    label: "Observe",
    marginModifier: -5,
    rewardMultiplier: 0.8,
    summary: "Instrument the storm. Yields Calibration Data and Null Traces.",
  },
};

export const DEFENSE_INSTALLATION_DEFINITIONS: Record<
  DefenseInstallationId,
  { name: string; baseCost: number; description: string }
> = {
  shieldArray: {
    name: "Shield Array",
    baseCost: 1_200,
    description: "The backbone of readiness. Each level hardens the hull envelope.",
  },
  repairDrones: {
    name: "Repair Drones",
    baseCost: 900,
    description: "Adds readiness and halves repair time per level.",
  },
  pointDefense: {
    name: "Point-Defense Grid",
    baseCost: 900,
    description: "Shreds debris before impact. Minor now; vital against vessels.",
  },
  earlyWarningRelay: {
    name: "Early-Warning Relay",
    baseCost: 700,
    description: "Extends storm forecasts by 45 minutes per level.",
  },
};

const DEFAULT_SEED = 0x2545f491;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(0, parsed));
};

const whole = (value: unknown, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  Math.floor(finite(value, fallback, maximum));

function nextRandom(state: DefenseState) {
  let value = state.rngState >>> 0;
  if (value === 0) value = DEFAULT_SEED;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = (value >>> 0) || DEFAULT_SEED;
  return state.rngState / 0x1_0000_0000;
}

const isDoctrine = (value: unknown): value is DefenseDoctrine =>
  value === "defend" || value === "evade" || value === "intercept" || value === "observe";

const INSTALLATION_IDS: readonly DefenseInstallationId[] = [
  "shieldArray",
  "pointDefense",
  "repairDrones",
  "earlyWarningRelay",
];

export function createDefenseState(seed = DEFAULT_SEED): DefenseState {
  return {
    schema: DEFENSE_SCHEMA,
    rngState: (whole(seed, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: 0,
    doctrine: "defend",
    installations: {
      shieldArray: 0,
      pointDefense: 0,
      repairDrones: 0,
      earlyWarningRelay: 0,
    },
    incoming: null,
    damage: null,
    eventLog: [],
    stats: { resolved: 0, unscathed: 0, damaged: 0 },
  };
}

export function cloneDefenseState(state: DefenseState): DefenseState {
  return {
    ...state,
    installations: { ...state.installations },
    incoming: state.incoming ? { ...state.incoming } : null,
    damage: state.damage ? { ...state.damage } : null,
    eventLog: state.eventLog.map((event) => ({ ...event })),
    stats: { ...state.stats },
  };
}

export function sanitizeDefenseState(value: unknown): DefenseState {
  const base = createDefenseState();
  if (!isRecord(value)) return base;
  const state: DefenseState = {
    ...base,
    rngState: (whole(value.rngState, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: finite(value.clockSeconds, 0, 1e15),
    doctrine: isDoctrine(value.doctrine) ? value.doctrine : "defend",
    installations: { ...base.installations },
    stats: {
      resolved: whole(isRecord(value.stats) ? value.stats.resolved : 0, 0, 1e9),
      unscathed: whole(isRecord(value.stats) ? value.stats.unscathed : 0, 0, 1e9),
      damaged: whole(isRecord(value.stats) ? value.stats.damaged : 0, 0, 1e9),
    },
  };
  const rawInstallations = isRecord(value.installations) ? value.installations : {};
  for (const id of INSTALLATION_IDS) {
    state.installations[id] = whole(rawInstallations[id], 0, MAX_INSTALLATION_LEVEL);
  }
  if (isRecord(value.incoming)) {
    const arrives = finite(value.incoming.arrivesAtSeconds, 0, 1e15);
    if (arrives > state.clockSeconds) {
      state.incoming = {
        kind: "ash-storm",
        severity: Math.max(1, whole(value.incoming.severity, 1, 3)),
        arrivesAtSeconds: arrives,
      };
    }
  }
  if (isRecord(value.damage)) {
    const penalty = finite(value.damage.productionPenalty, 0, MAX_PRODUCTION_PENALTY);
    const repair = finite(value.damage.repairRemainingSeconds, 0, MAX_REPAIR_SECONDS);
    if (penalty > 0 && repair > 0) {
      state.damage = { productionPenalty: penalty, repairRemainingSeconds: repair };
    }
  }
  if (Array.isArray(value.eventLog)) {
    state.eventLog = value.eventLog
      .filter(isRecord)
      .slice(-MAX_EVENT_LOG)
      .map((raw) => ({
        kind: "ash-storm" as const,
        severity: Math.max(1, whole(raw.severity, 1, 3)),
        readiness: finite(raw.readiness, 0, 100),
        margin: Math.max(-1_000, Math.min(1_000, finite(raw.margin, 0, 1_000) - Math.max(0, -Number(raw.margin) || 0))),
        doctrine: isDoctrine(raw.doctrine) ? raw.doctrine : "defend",
        outcome:
          raw.outcome === "grazed" || raw.outcome === "battered"
            ? raw.outcome
            : ("unscathed" as const),
        resolvedAtSeconds: finite(raw.resolvedAtSeconds, 0, 1e15),
        salvage: finite(raw.salvage, 0, 1e9),
        engineeringModels: finite(raw.engineeringModels, 0, 1e9),
        calibrationData: finite(raw.calibrationData, 0, 1e9),
        nullTraces: finite(raw.nullTraces, 0, 1e9),
        productionPenalty: finite(raw.productionPenalty, 0, MAX_PRODUCTION_PENALTY),
        repairSeconds: finite(raw.repairSeconds, 0, MAX_REPAIR_SECONDS),
      }));
  }
  return state;
}

export function getDefenseReadiness(
  state: Pick<DefenseState, "installations">,
  crew: DefenseCrewContext,
) {
  const value =
    22 * Math.pow(state.installations.shieldArray, 0.8) +
    10 * Math.sqrt(state.installations.repairDrones) +
    6 * Math.sqrt(state.installations.pointDefense) +
    4 * Math.min(4, Math.max(0, crew.security)) +
    3 * Math.min(4, Math.max(0, crew.engineers));
  return Math.min(100, Math.round(value));
}

export function getForecastLeadSeconds(
  state: Pick<DefenseState, "installations">,
  navigators: number,
) {
  return (
    15 * 60 +
    45 * 60 * state.installations.earlyWarningRelay +
    10 * 60 * Math.min(3, Math.max(0, navigators))
  );
}

export function getRepairSpeedMultiplier(
  state: Pick<DefenseState, "installations">,
  engineers: number,
) {
  return 1 + 0.5 * state.installations.repairDrones + 0.25 * Math.min(4, Math.max(0, engineers));
}

export function getInstallationCost(
  state: Pick<DefenseState, "installations">,
  id: DefenseInstallationId,
  continuityScale: number,
) {
  const level = state.installations[id];
  if (level >= MAX_INSTALLATION_LEVEL) return Number.POSITIVE_INFINITY;
  return Math.ceil(
    DEFENSE_INSTALLATION_DEFINITIONS[id].baseCost *
      Math.max(1, continuityScale) *
      Math.pow(1.6, level),
  );
}

export function setDefenseDoctrine(state: DefenseState, doctrine: DefenseDoctrine) {
  if (!isDoctrine(doctrine) || state.doctrine === doctrine) return state;
  return { ...cloneDefenseState(state), doctrine };
}

export function upgradeDefenseInstallation(
  state: DefenseState,
  id: DefenseInstallationId,
) {
  if (!INSTALLATION_IDS.includes(id)) return state;
  if (state.installations[id] >= MAX_INSTALLATION_LEVEL) return state;
  const next = cloneDefenseState(state);
  next.installations[id] += 1;
  return next;
}

function rollSeverity(state: DefenseState) {
  if (state.stats.resolved === 0) return 1;
  const roll = nextRandom(state);
  return roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
}

function scheduleNextStorm(state: DefenseState) {
  const gap =
    state.stats.resolved === 0 && state.eventLog.length === 0
      ? FIRST_STORM_DELAY_SECONDS
      : STORM_BASE_GAP_SECONDS + nextRandom(state) * STORM_BASE_GAP_SECONDS;
  state.incoming = {
    kind: "ash-storm",
    severity: rollSeverity(state),
    arrivesAtSeconds: state.clockSeconds + gap,
  };
}

function resolveStorm(
  state: DefenseState,
  crew: DefenseCrewContext,
  worldIndex: number,
  totals: DefenseAdvanceResult,
) {
  const event = state.incoming!;
  const doctrine = DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine];
  const readiness = getDefenseReadiness(state, crew);
  const interceptBonus =
    state.doctrine === "intercept" ? 2 * Math.min(4, Math.max(0, crew.security)) : 0;
  const margin = readiness + doctrine.marginModifier + interceptBonus - 30 * event.severity;
  const outcome: DefenseEventOutcome =
    margin >= 10 ? "unscathed" : margin >= -20 ? "grazed" : "battered";

  const severityMultiplier = event.severity === 1 ? 1 : event.severity === 2 ? 1.5 : 2;
  const rewardScale =
    (outcome === "unscathed" ? 1 : outcome === "grazed" ? 0.5 : 0) *
    doctrine.rewardMultiplier *
    severityMultiplier *
    (1 + Math.max(0, worldIndex - 3) * 0.5);
  const salvage = Math.round(20 * rewardScale);
  const engineeringModels = Math.round(25 * rewardScale);
  const observeScale = outcome === "battered" ? 0 : severityMultiplier;
  const calibrationData =
    state.doctrine === "observe" ? Math.round(8 * observeScale) : 0;
  const nullTraces =
    state.doctrine === "observe" ? Math.round(4 * observeScale * (1 + Math.max(0, worldIndex - 3))) : 0;

  let productionPenalty = 0;
  let repairSeconds = 0;
  if (outcome === "grazed") {
    productionPenalty = 0.05 + 0.05 * nextRandom(state);
    repairSeconds = 1_800 + 1_800 * nextRandom(state);
  } else if (outcome === "battered") {
    productionPenalty = MAX_PRODUCTION_PENALTY;
    repairSeconds = MAX_REPAIR_SECONDS * (0.6 + 0.4 * nextRandom(state));
  }
  if (productionPenalty > 0) {
    // Damage refreshes, never deepens past the cap or stacks.
    state.damage = {
      productionPenalty: Math.min(
        MAX_PRODUCTION_PENALTY,
        Math.max(state.damage?.productionPenalty ?? 0, productionPenalty),
      ),
      repairRemainingSeconds: Math.min(
        MAX_REPAIR_SECONDS,
        Math.max(state.damage?.repairRemainingSeconds ?? 0, repairSeconds),
      ),
    };
    state.stats.damaged += 1;
  } else {
    state.stats.unscathed += 1;
  }
  state.stats.resolved += 1;

  const resolved: ResolvedDefenseEvent = {
    kind: "ash-storm",
    severity: event.severity,
    readiness,
    margin,
    doctrine: state.doctrine,
    outcome,
    resolvedAtSeconds: state.clockSeconds,
    salvage,
    engineeringModels,
    calibrationData,
    nullTraces,
    productionPenalty,
    repairSeconds,
  };
  state.eventLog = [...state.eventLog, resolved].slice(-MAX_EVENT_LOG);
  state.incoming = null;
  totals.salvage += salvage;
  totals.engineeringModels += engineeringModels;
  totals.calibrationData += calibrationData;
  totals.nullTraces += nullTraces;
  totals.resolvedEvents.push(resolved);
}

/**
 * Advance the defense clock. Deterministic and chunk-size independent: the
 * loop steps exactly to each storm arrival, so one 8-hour call resolves the
 * same events as 480 one-minute calls.
 */
export function advanceDefense(
  state: DefenseState,
  elapsedSeconds: number,
  context: DefenseAdvanceContext,
): DefenseAdvanceResult {
  const totals: DefenseAdvanceResult = {
    state,
    salvage: 0,
    engineeringModels: 0,
    calibrationData: 0,
    nullTraces: 0,
    resolvedEvents: [],
  };
  let remaining = finite(elapsedSeconds, 0, 90 * 24 * 3_600);
  if (remaining <= 0) return totals;
  const next = cloneDefenseState(state);
  totals.state = next;

  while (remaining > 0) {
    if (context.stormsEnabled && !next.incoming) scheduleNextStorm(next);
    const boundary =
      context.stormsEnabled && next.incoming
        ? Math.min(remaining, Math.max(0, next.incoming.arrivesAtSeconds - next.clockSeconds))
        : remaining;
    // advance repairs across the step
    if (next.damage) {
      const repairSpeed = getRepairSpeedMultiplier(next, context.engineers);
      next.damage.repairRemainingSeconds -= boundary * repairSpeed;
      if (next.damage.repairRemainingSeconds <= 0) next.damage = null;
    }
    next.clockSeconds += boundary;
    remaining -= boundary;
    if (
      context.stormsEnabled &&
      next.incoming &&
      next.clockSeconds >= next.incoming.arrivesAtSeconds
    ) {
      resolveStorm(next, context, context.worldIndex, totals);
    }
    if (!context.stormsEnabled) break;
    if (boundary === 0 && remaining > 0 && !next.incoming) {
      // safety: never loop without progress
      next.clockSeconds += remaining;
      remaining = 0;
    }
  }
  return totals;
}

export function getDefenseProductionMultiplier(state: Pick<DefenseState, "damage">) {
  return 1 - (state.damage?.productionPenalty ?? 0);
}

/**
 * Environmental events are weather: their timers are always projectable.
 * The Early-Warning window instead controls how soon severity is measured
 * (and, in Phase 2, whether stealthy hostile contacts are detected at all).
 */
export function getIncomingForecast(
  state: DefenseState,
  navigators: number,
) {
  if (!state.incoming) return null;
  const lead = getForecastLeadSeconds(state, navigators);
  const secondsUntil = state.incoming.arrivesAtSeconds - state.clockSeconds;
  return {
    ...state.incoming,
    secondsUntil,
    severityKnown: secondsUntil <= lead,
  };
}
