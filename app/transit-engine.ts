import {
  CAMPAIGN_WORLD_IDS,
  getCampaignWorld,
  type CampaignWorldId,
} from "./campaign-content.ts";

export type TransitJourney = {
  originWorldId: CampaignWorldId;
  destinationWorldId: CampaignWorldId;
  elapsedSeconds: number;
  totalSeconds: number;
  baseSeconds: number;
  navigationExpertise: number;
  driveCouplingActive: boolean;
  startedAt: number;
};

export type TransitState = {
  schema: number;
  active: TransitJourney | null;
  completedRoutes: string[];
  totalTransitSeconds: number;
};

export const TRANSIT_SCHEMA = 1;

export const TRANSIT_ROUTE_BASE_SECONDS: Readonly<
  Partial<Record<CampaignWorldId, number>>
> = {
  pelagos: 90 * 60,
  viridia: 2.5 * 3_600,
  cinder: 4 * 3_600,
  nox: 6 * 3_600,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isWorldId = (value: unknown): value is CampaignWorldId =>
  typeof value === "string" && CAMPAIGN_WORLD_IDS.includes(value as CampaignWorldId);
const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(0, parsed))
    : fallback;
};
const routeId = (origin: CampaignWorldId, destination: CampaignWorldId) =>
  `${origin}->${destination}`;

export function createTransitState(): TransitState {
  return {
    schema: TRANSIT_SCHEMA,
    active: null,
    completedRoutes: [],
    totalTransitSeconds: 0,
  };
}

export function cloneTransitState(state: TransitState): TransitState {
  return {
    ...state,
    active: state.active ? { ...state.active } : null,
    completedRoutes: [...state.completedRoutes],
  };
}

export function sanitizeTransitState(value: unknown): TransitState {
  const base = createTransitState();
  if (!isRecord(value)) return base;
  const completedRoutes = Array.isArray(value.completedRoutes)
    ? [...new Set(value.completedRoutes.filter((entry): entry is string => typeof entry === "string"))].slice(0, 20)
    : [];
  const state: TransitState = {
    ...base,
    completedRoutes,
    totalTransitSeconds: finite(value.totalTransitSeconds, 0, 1e12),
  };
  if (!isRecord(value.active)) return state;
  const originWorldId = value.active.originWorldId;
  const destinationWorldId = value.active.destinationWorldId;
  if (!isWorldId(originWorldId) || !isWorldId(destinationWorldId)) return state;
  const originIndex = CAMPAIGN_WORLD_IDS.indexOf(originWorldId);
  const destinationIndex = CAMPAIGN_WORLD_IDS.indexOf(destinationWorldId);
  if (destinationIndex !== originIndex + 1) return state;
  const baseSeconds = finite(
    value.active.baseSeconds,
    TRANSIT_ROUTE_BASE_SECONDS[originWorldId] ?? 0,
    30 * 24 * 3_600,
  );
  const totalSeconds = finite(value.active.totalSeconds, baseSeconds, 30 * 24 * 3_600);
  if (totalSeconds <= 0) return state;
  const elapsedSeconds = finite(value.active.elapsedSeconds, 0, totalSeconds);
  if (elapsedSeconds >= totalSeconds) return state;
  state.active = {
    originWorldId,
    destinationWorldId,
    elapsedSeconds,
    totalSeconds,
    baseSeconds,
    navigationExpertise: finite(value.active.navigationExpertise, 0, 100),
    driveCouplingActive: value.active.driveCouplingActive === true,
    startedAt: finite(value.active.startedAt, 0, 1e15),
  };
  return state;
}

export function getTransitSpeedMultiplier(
  navigationExpertise: number,
  driveCouplingActive: boolean,
) {
  const navigationBonus = Math.min(0.35, Math.max(0, navigationExpertise) * 0.02);
  const driveBonus = driveCouplingActive ? 0.2 : 0;
  return 1 + navigationBonus + driveBonus;
}

export function beginTransit(
  state: TransitState,
  originWorldId: CampaignWorldId,
  destinationWorldId: CampaignWorldId,
  navigationExpertise: number,
  driveCouplingActive: boolean,
  startedAt: number,
) {
  if (state.active) return state;
  const baseSeconds = TRANSIT_ROUTE_BASE_SECONDS[originWorldId] ?? 0;
  if (baseSeconds <= 0) return state;
  const multiplier = getTransitSpeedMultiplier(
    navigationExpertise,
    driveCouplingActive,
  );
  const next = cloneTransitState(state);
  next.active = {
    originWorldId,
    destinationWorldId,
    elapsedSeconds: 0,
    totalSeconds: Math.max(60, Math.round(baseSeconds / multiplier)),
    baseSeconds,
    navigationExpertise: Math.max(0, navigationExpertise),
    driveCouplingActive,
    startedAt: Math.max(0, startedAt),
  };
  return next;
}

export function advanceTransit(state: TransitState, elapsedSeconds: number) {
  if (!state.active || elapsedSeconds <= 0) {
    return { state, arrivedWorldId: null as CampaignWorldId | null };
  }
  const next = cloneTransitState(state);
  const active = next.active!;
  const progressed = Math.min(
    Math.max(0, elapsedSeconds),
    active.totalSeconds - active.elapsedSeconds,
  );
  active.elapsedSeconds += progressed;
  next.totalTransitSeconds += progressed;
  if (active.elapsedSeconds < active.totalSeconds) {
    return { state: next, arrivedWorldId: null as CampaignWorldId | null };
  }
  const arrivedWorldId = active.destinationWorldId;
  next.completedRoutes = [
    ...new Set([...next.completedRoutes, routeId(active.originWorldId, arrivedWorldId)]),
  ];
  next.active = null;
  return { state: next, arrivedWorldId };
}

export function getTransitProgress(state: TransitState) {
  const active = state.active;
  if (!active) return null;
  const progress = Math.min(1, active.elapsedSeconds / Math.max(1, active.totalSeconds));
  return {
    ...active,
    progress,
    remainingSeconds: Math.max(0, active.totalSeconds - active.elapsedSeconds),
    originName: getCampaignWorld(active.originWorldId)?.name ?? active.originWorldId,
    destinationName:
      getCampaignWorld(active.destinationWorldId)?.name ?? active.destinationWorldId,
    speedMultiplier: active.baseSeconds / Math.max(1, active.totalSeconds),
  };
}

export function isTransitActive(state: TransitState) {
  return state.active !== null;
}
