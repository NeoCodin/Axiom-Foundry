/** Persistent protection for restored worlds. */

import type { CampaignWorldId } from "./campaign-content.ts";
import type { ColonyRecord } from "./settlement-engine.ts";

export type PlanetaryDefenseDoctrine = "conservation" | "guard" | "fortress";
export type PlanetaryInstallationId =
  | "reality-anchor"
  | "shield-network"
  | "interceptor-station"
  | "evacuation-shelters"
  | "repair-yard";
export type PlanetaryDefenseOutcome = "stable" | "strained" | "breached";

export type PlanetaryNetwork = {
  worldId: CampaignWorldId;
  colonyName: string;
  installations: Record<PlanetaryInstallationId, number>;
  instability: number;
  recoveryRemainingSeconds: number;
  attacksResolved: number;
};

export type PlanetaryConstructionJob = {
  worldId: CampaignWorldId;
  installationId: PlanetaryInstallationId;
  totalSeconds: number;
  remainingSeconds: number;
};

export type IncomingPlanetaryAttack = {
  worldId: CampaignWorldId;
  severity: number;
  arrivesAtSeconds: number;
  signature: "anchor-excision" | "core-interdiction" | "relay-silencing";
};

export type ResolvedPlanetaryAttack = IncomingPlanetaryAttack & {
  colonyName: string;
  readiness: number;
  margin: number;
  outcome: PlanetaryDefenseOutcome;
  resolvedAtSeconds: number;
  repairSeconds: number;
  salvage: number;
  engineeringModels: number;
  culturalRecords: number;
  nullTraces: number;
  causalFragmentId: string | null;
};

export type PlanetaryDefenseState = {
  schema: number;
  rngState: number;
  clockSeconds: number;
  doctrine: PlanetaryDefenseDoctrine;
  networks: Partial<Record<CampaignWorldId, PlanetaryNetwork>>;
  construction: PlanetaryConstructionJob | null;
  incoming: IncomingPlanetaryAttack | null;
  eventLog: ResolvedPlanetaryAttack[];
  causalFragmentIds: string[];
  stats: { resolved: number; stable: number; breaches: number };
};

export type PlanetaryDefenseAdvanceContext = {
  threatsEnabled: boolean;
  worldIndex: number;
  constructionSpeedMultiplier?: number;
  engineerExpertise?: number;
};

export type PlanetaryDefenseAdvanceResult = {
  state: PlanetaryDefenseState;
  salvage: number;
  engineeringModels: number;
  culturalRecords: number;
  nullTraces: number;
  resolvedEvents: ResolvedPlanetaryAttack[];
  completedConstruction: PlanetaryConstructionJob | null;
};

export const PLANETARY_DEFENSE_SCHEMA = 1;
export const MAX_PLANETARY_INSTALLATION_LEVEL = 5;
export const MAX_PLANETARY_EVENT_LOG = 16;
export const FIRST_PLANETARY_ATTACK_DELAY_SECONDS = 3 * 3_600;
export const PLANETARY_ATTACK_BASE_GAP_SECONDS = 8 * 3_600;
export const MAX_PLANETARY_RECOVERY_SECONDS = 12 * 3_600;

export const PLANETARY_DEFENSE_DOCTRINES: Readonly<Record<PlanetaryDefenseDoctrine, {
  label: string;
  upkeepPerColony: number;
  readiness: number;
  summary: string;
}>> = {
  conservation: {
    label: "Conservation",
    upkeepPerColony: 0.015,
    readiness: -4,
    summary: "Preserve Ark output and accept slower planetary recovery.",
  },
  guard: {
    label: "Guard",
    upkeepPerColony: 0.025,
    readiness: 4,
    summary: "A balanced standing network for every restored world.",
  },
  fortress: {
    label: "Fortress",
    upkeepPerColony: 0.035,
    readiness: 12,
    summary: "Divert more Flux to harden every relay and reality anchor.",
  },
};

export const PLANETARY_INSTALLATION_DEFINITIONS: Readonly<Record<PlanetaryInstallationId, {
  name: string;
  description: string;
  baseFluxCost: number;
  baseSalvageCost: number;
  baseModelCost: number;
  baseSeconds: number;
}>> = {
  "reality-anchor": {
    name: "Reality Anchor",
    description: "Keeps the restored world's local laws coherent when a causal interdiction arrives.",
    baseFluxCost: 45_000,
    baseSalvageCost: 70,
    baseModelCost: 100,
    baseSeconds: 5_400,
  },
  "shield-network": {
    name: "Shield Network",
    description: "Distributes orbital and surface protection around population centers.",
    baseFluxCost: 38_000,
    baseSalvageCost: 85,
    baseModelCost: 80,
    baseSeconds: 4_800,
  },
  "interceptor-station": {
    name: "Interceptor Station",
    description: "Lets a colony answer retrograde vessels before they reach its continuity core.",
    baseFluxCost: 55_000,
    baseSalvageCost: 95,
    baseModelCost: 120,
    baseSeconds: 6_600,
  },
  "evacuation-shelters": {
    name: "Evacuation Shelters",
    description: "Protects civilians and turns a breach into recoverable disruption.",
    baseFluxCost: 28_000,
    baseSalvageCost: 60,
    baseModelCost: 45,
    baseSeconds: 4_200,
  },
  "repair-yard": {
    name: "Repair Yard",
    description: "Shortens post-attack instability without replacing local Engineers.",
    baseFluxCost: 34_000,
    baseSalvageCost: 75,
    baseModelCost: 70,
    baseSeconds: 4_800,
  },
};

export const CAUSAL_FRAGMENT_DEFINITIONS = [
  { id: "vector-without-origin", title: "Vector Without Origin", text: "The attacking vessel's route begins after its arrival. Its weapons ignore habitats and track only the world-core anchor." },
  { id: "civilian-exclusion", title: "Civilian Exclusion", text: "A retrograde strike aborts when a refugee shuttle crosses its firing solution. The contact is hostile, but not indiscriminate." },
  { id: "future-authentication", title: "Future Authentication", text: "The vessel answers an Ark cipher that AXIOM has not generated yet. Authentication date: three centuries ahead." },
  { id: "foundry-event-reference", title: "Foundry Event Reference", text: "Recovered telemetry names a multiversal casualty boundary: FOUNDRY EVENT. Origin and perpetrator fields both resolve to this Ark." },
] as const;

const INSTALLATION_IDS = Object.keys(PLANETARY_INSTALLATION_DEFINITIONS) as PlanetaryInstallationId[];
const DEFAULT_SEED = 0x739bf37a;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, parsed)) : fallback;
};
const whole = (value: unknown, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) => Math.floor(finite(value, fallback, maximum));
const isDoctrine = (value: unknown): value is PlanetaryDefenseDoctrine => value === "conservation" || value === "guard" || value === "fortress";
const isInstallation = (value: unknown): value is PlanetaryInstallationId => typeof value === "string" && INSTALLATION_IDS.includes(value as PlanetaryInstallationId);

function emptyInstallations(): Record<PlanetaryInstallationId, number> {
  return Object.fromEntries(INSTALLATION_IDS.map((id) => [id, 0])) as Record<PlanetaryInstallationId, number>;
}

function nextRandom(state: PlanetaryDefenseState) {
  let value = state.rngState >>> 0;
  if (!value) value = DEFAULT_SEED;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = (value >>> 0) || DEFAULT_SEED;
  return state.rngState / 0x1_0000_0000;
}

export function createPlanetaryDefenseState(seed = DEFAULT_SEED): PlanetaryDefenseState {
  return {
    schema: PLANETARY_DEFENSE_SCHEMA,
    rngState: (whole(seed, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: 0,
    doctrine: "guard",
    networks: {},
    construction: null,
    incoming: null,
    eventLog: [],
    causalFragmentIds: [],
    stats: { resolved: 0, stable: 0, breaches: 0 },
  };
}

export function clonePlanetaryDefenseState(state: PlanetaryDefenseState): PlanetaryDefenseState {
  return {
    ...state,
    networks: Object.fromEntries(
      Object.entries(state.networks).map(([id, network]) => [id, network ? { ...network, installations: { ...network.installations } } : network]),
    ),
    construction: state.construction ? { ...state.construction } : null,
    incoming: state.incoming ? { ...state.incoming } : null,
    eventLog: state.eventLog.map((event) => ({ ...event })),
    causalFragmentIds: [...state.causalFragmentIds],
    stats: { ...state.stats },
  };
}

export function syncPlanetaryDefenseNetworks(
  state: PlanetaryDefenseState,
  colonies: readonly ColonyRecord[],
) {
  const next = clonePlanetaryDefenseState(state);
  const valid = new Set(colonies.map((colony) => colony.worldId));
  for (const colony of colonies) {
    const current = next.networks[colony.worldId];
    next.networks[colony.worldId] = current
      ? { ...current, colonyName: colony.name }
      : {
          worldId: colony.worldId,
          colonyName: colony.name,
          installations: emptyInstallations(),
          instability: 0,
          recoveryRemainingSeconds: 0,
          attacksResolved: 0,
        };
  }
  for (const worldId of Object.keys(next.networks) as CampaignWorldId[]) {
    if (!valid.has(worldId)) delete next.networks[worldId];
  }
  if (next.incoming && !valid.has(next.incoming.worldId)) next.incoming = null;
  if (next.construction && !valid.has(next.construction.worldId)) next.construction = null;
  return next;
}

function sanitizeNetwork(worldId: CampaignWorldId, value: unknown): PlanetaryNetwork | null {
  if (!isRecord(value)) return null;
  const rawInstallations = isRecord(value.installations) ? value.installations : {};
  const installations = emptyInstallations();
  for (const id of INSTALLATION_IDS) installations[id] = whole(rawInstallations[id], 0, MAX_PLANETARY_INSTALLATION_LEVEL);
  return {
    worldId,
    colonyName: typeof value.colonyName === "string" ? value.colonyName.slice(0, 64) : worldId,
    installations,
    instability: finite(value.instability, 0, 0.3),
    recoveryRemainingSeconds: finite(value.recoveryRemainingSeconds, 0, MAX_PLANETARY_RECOVERY_SECONDS),
    attacksResolved: whole(value.attacksResolved, 0, 1e9),
  };
}

export function sanitizePlanetaryDefenseState(value: unknown, colonies: readonly ColonyRecord[] = []) {
  const base = createPlanetaryDefenseState();
  if (!isRecord(value)) return syncPlanetaryDefenseNetworks(base, colonies);
  const networks: PlanetaryDefenseState["networks"] = {};
  const rawNetworks = isRecord(value.networks) ? value.networks : {};
  for (const colony of colonies) {
    const network = sanitizeNetwork(colony.worldId, rawNetworks[colony.worldId]);
    if (network) networks[colony.worldId] = { ...network, colonyName: colony.name };
  }
  const stats = isRecord(value.stats) ? value.stats : {};
  const state: PlanetaryDefenseState = {
    ...base,
    rngState: (whole(value.rngState, DEFAULT_SEED, 0xffff_ffff) >>> 0) || DEFAULT_SEED,
    clockSeconds: finite(value.clockSeconds, 0, 1e15),
    doctrine: isDoctrine(value.doctrine) ? value.doctrine : "guard",
    networks,
    causalFragmentIds: Array.isArray(value.causalFragmentIds)
      ? CAUSAL_FRAGMENT_DEFINITIONS.map((entry) => entry.id).filter((id) => (value.causalFragmentIds as unknown[]).includes(id))
      : [],
    stats: {
      resolved: whole(stats.resolved, 0, 1e9),
      stable: whole(stats.stable, 0, 1e9),
      breaches: whole(stats.breaches, 0, 1e9),
    },
  };
  if (isRecord(value.construction) && typeof value.construction.worldId === "string" && isInstallation(value.construction.installationId) && state.networks[value.construction.worldId as CampaignWorldId]) {
    const total = finite(value.construction.totalSeconds, 1, 30 * 24 * 3_600);
    state.construction = {
      worldId: value.construction.worldId as CampaignWorldId,
      installationId: value.construction.installationId,
      totalSeconds: total,
      remainingSeconds: finite(value.construction.remainingSeconds, total, total),
    };
  }
  if (isRecord(value.incoming) && typeof value.incoming.worldId === "string" && state.networks[value.incoming.worldId as CampaignWorldId]) {
    const arrivesAtSeconds = finite(value.incoming.arrivesAtSeconds, 0, 1e15);
    if (arrivesAtSeconds > state.clockSeconds) {
      const signature = value.incoming.signature === "core-interdiction" || value.incoming.signature === "relay-silencing" ? value.incoming.signature : "anchor-excision";
      state.incoming = { worldId: value.incoming.worldId as CampaignWorldId, severity: Math.max(1, whole(value.incoming.severity, 1, 3)), arrivesAtSeconds, signature };
    }
  }
  if (Array.isArray(value.eventLog)) {
    state.eventLog = value.eventLog.filter(isRecord).slice(-MAX_PLANETARY_EVENT_LOG).map((raw) => ({
      worldId: String(raw.worldId ?? "pelagos") as CampaignWorldId,
      colonyName: String(raw.colonyName ?? "Restored world").slice(0, 64),
      severity: Math.max(1, whole(raw.severity, 1, 3)),
      arrivesAtSeconds: finite(raw.arrivesAtSeconds),
      signature: raw.signature === "core-interdiction" || raw.signature === "relay-silencing" ? raw.signature : "anchor-excision",
      readiness: finite(raw.readiness, 0, 100),
      margin: Math.max(-1_000, Math.min(1_000, Number(raw.margin) || 0)),
      outcome: raw.outcome === "strained" || raw.outcome === "breached" ? raw.outcome : "stable",
      resolvedAtSeconds: finite(raw.resolvedAtSeconds),
      repairSeconds: finite(raw.repairSeconds, 0, MAX_PLANETARY_RECOVERY_SECONDS),
      salvage: finite(raw.salvage, 0, 1e9),
      engineeringModels: finite(raw.engineeringModels, 0, 1e9),
      culturalRecords: finite(raw.culturalRecords, 0, 1e9),
      nullTraces: finite(raw.nullTraces, 0, 1e9),
      causalFragmentId: typeof raw.causalFragmentId === "string" ? raw.causalFragmentId : null,
    }));
  }
  return syncPlanetaryDefenseNetworks(state, colonies);
}

export function getPlanetaryNetworkReadiness(network: PlanetaryNetwork, doctrine: PlanetaryDefenseDoctrine) {
  const i = network.installations;
  const value =
    16 +
    i["reality-anchor"] * 13 +
    i["shield-network"] * 9 +
    i["interceptor-station"] * 8 +
    i["evacuation-shelters"] * 5 +
    i["repair-yard"] * 3 +
    PLANETARY_DEFENSE_DOCTRINES[doctrine].readiness;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getPlanetaryDefenseOperationalLoad(state: PlanetaryDefenseState) {
  const networkCount = Object.values(state.networks).filter(Boolean).length;
  if (networkCount <= 0) return 0;
  const standing = PLANETARY_DEFENSE_DOCTRINES[state.doctrine].upkeepPerColony * networkCount;
  const recovery = Object.values(state.networks).reduce((total, network) => total + (network?.instability ?? 0), 0);
  return Math.min(0.28, standing + recovery);
}

export function setPlanetaryDefenseDoctrine(state: PlanetaryDefenseState, doctrine: PlanetaryDefenseDoctrine) {
  if (!isDoctrine(doctrine) || doctrine === state.doctrine) return state;
  return { ...clonePlanetaryDefenseState(state), doctrine };
}

export function startPlanetaryDefenseConstruction(
  state: PlanetaryDefenseState,
  worldId: CampaignWorldId,
  installationId: PlanetaryInstallationId,
  totalSeconds: number,
) {
  const network = state.networks[worldId];
  if (!network || state.construction || network.installations[installationId] >= MAX_PLANETARY_INSTALLATION_LEVEL) return state;
  const next = clonePlanetaryDefenseState(state);
  const duration = Math.max(60, finite(totalSeconds, 60, 30 * 24 * 3_600));
  next.construction = { worldId, installationId, totalSeconds: duration, remainingSeconds: duration };
  return next;
}

function scheduleAttack(state: PlanetaryDefenseState) {
  const networks = Object.values(state.networks).filter((network): network is PlanetaryNetwork => Boolean(network));
  if (networks.length === 0) return;
  const target = networks[Math.floor(nextRandom(state) * networks.length)]!;
  const first = state.stats.resolved === 0;
  const gap = first ? FIRST_PLANETARY_ATTACK_DELAY_SECONDS : PLANETARY_ATTACK_BASE_GAP_SECONDS + nextRandom(state) * 6 * 3_600;
  const signatureRoll = nextRandom(state);
  state.incoming = {
    worldId: target.worldId,
    severity: first ? 1 : nextRandom(state) < 0.5 ? 1 : nextRandom(state) < 0.75 ? 2 : 3,
    arrivesAtSeconds: state.clockSeconds + gap,
    signature: signatureRoll < 0.45 ? "anchor-excision" : signatureRoll < 0.78 ? "core-interdiction" : "relay-silencing",
  };
}

function resolveAttack(state: PlanetaryDefenseState, worldIndex: number, totals: PlanetaryDefenseAdvanceResult) {
  const incoming = state.incoming!;
  const network = state.networks[incoming.worldId]!;
  const readiness = getPlanetaryNetworkReadiness(network, state.doctrine);
  const margin = readiness - incoming.severity * 28;
  const outcome: PlanetaryDefenseOutcome = margin >= 8 ? "stable" : margin >= -18 ? "strained" : "breached";
  const repairSeconds = outcome === "stable" ? 0 : outcome === "strained" ? 2 * 3_600 : 7 * 3_600;
  network.instability = outcome === "stable" ? 0 : outcome === "strained" ? 0.0125 : 0.035;
  network.recoveryRemainingSeconds = Math.min(MAX_PLANETARY_RECOVERY_SECONDS, Math.max(network.recoveryRemainingSeconds, repairSeconds));
  network.attacksResolved += 1;
  const rewardScale = incoming.severity * (outcome === "stable" ? 1 : outcome === "strained" ? 0.6 : 0.25) * (1 + Math.max(0, worldIndex - 4) * 0.35);
  const salvage = Math.round(35 * rewardScale);
  const engineeringModels = Math.round(28 * rewardScale);
  const culturalRecords = Math.round(12 * rewardScale);
  const nullTraces = Math.round(8 * rewardScale);
  const nextFragment = CAUSAL_FRAGMENT_DEFINITIONS.find((fragment) => !state.causalFragmentIds.includes(fragment.id));
  const causalFragmentId = nextFragment && (state.stats.resolved === 0 || outcome === "stable") ? nextFragment.id : null;
  if (causalFragmentId) state.causalFragmentIds.push(causalFragmentId);
  const resolved: ResolvedPlanetaryAttack = {
    ...incoming,
    colonyName: network.colonyName,
    readiness,
    margin,
    outcome,
    resolvedAtSeconds: state.clockSeconds,
    repairSeconds,
    salvage,
    engineeringModels,
    culturalRecords,
    nullTraces,
    causalFragmentId,
  };
  state.eventLog = [...state.eventLog, resolved].slice(-MAX_PLANETARY_EVENT_LOG);
  state.stats.resolved += 1;
  if (outcome === "stable") state.stats.stable += 1;
  if (outcome === "breached") state.stats.breaches += 1;
  state.incoming = null;
  totals.salvage += salvage;
  totals.engineeringModels += engineeringModels;
  totals.culturalRecords += culturalRecords;
  totals.nullTraces += nullTraces;
  totals.resolvedEvents.push(resolved);
}

export function advancePlanetaryDefense(
  state: PlanetaryDefenseState,
  elapsedSeconds: number,
  context: PlanetaryDefenseAdvanceContext,
): PlanetaryDefenseAdvanceResult {
  const totals: PlanetaryDefenseAdvanceResult = {
    state,
    salvage: 0,
    engineeringModels: 0,
    culturalRecords: 0,
    nullTraces: 0,
    resolvedEvents: [],
    completedConstruction: null,
  };
  let remaining = finite(elapsedSeconds, 0, 90 * 24 * 3_600);
  if (remaining <= 0) return totals;
  const next = clonePlanetaryDefenseState(state);
  totals.state = next;
  while (remaining > 0) {
    if (context.threatsEnabled && !next.incoming) scheduleAttack(next);
    const untilAttack = next.incoming ? Math.max(0, next.incoming.arrivesAtSeconds - next.clockSeconds) : Number.POSITIVE_INFINITY;
    const untilConstruction = next.construction
      ? next.construction.remainingSeconds / Math.max(1, context.constructionSpeedMultiplier ?? 1)
      : Number.POSITIVE_INFINITY;
    const boundary = Math.min(remaining, untilAttack, untilConstruction);
    const speed = Math.max(1, context.constructionSpeedMultiplier ?? 1) * (1 + Math.min(0.25, Math.max(0, context.engineerExpertise ?? 0) * 0.01));
    if (next.construction) next.construction.remainingSeconds = Math.max(0, next.construction.remainingSeconds - boundary * speed);
    for (const network of Object.values(next.networks)) {
      if (!network || network.recoveryRemainingSeconds <= 0) continue;
      const repairSpeed = 1 + network.installations["repair-yard"] * 0.25;
      network.recoveryRemainingSeconds = Math.max(0, network.recoveryRemainingSeconds - boundary * repairSpeed);
      if (network.recoveryRemainingSeconds <= 0) network.instability = 0;
    }
    next.clockSeconds += boundary;
    remaining -= boundary;
    if (next.construction && next.construction.remainingSeconds <= 0) {
      const completed = { ...next.construction };
      const network = next.networks[completed.worldId];
      if (network) network.installations[completed.installationId] = Math.min(MAX_PLANETARY_INSTALLATION_LEVEL, network.installations[completed.installationId] + 1);
      next.construction = null;
      totals.completedConstruction = completed;
    }
    if (context.threatsEnabled && next.incoming && next.clockSeconds >= next.incoming.arrivesAtSeconds) resolveAttack(next, context.worldIndex, totals);
    if (boundary === Number.POSITIVE_INFINITY || (!context.threatsEnabled && !next.construction)) {
      next.clockSeconds += remaining;
      remaining = 0;
    }
    if (boundary === 0 && remaining > 0 && !next.incoming && !next.construction) {
      next.clockSeconds += remaining;
      remaining = 0;
    }
  }
  return totals;
}

export function getPlanetaryIncomingForecast(state: PlanetaryDefenseState) {
  if (!state.incoming) return null;
  const network = state.networks[state.incoming.worldId];
  return {
    ...state.incoming,
    colonyName: network?.colonyName ?? state.incoming.worldId,
    secondsUntil: Math.max(0, state.incoming.arrivesAtSeconds - state.clockSeconds),
    readiness: network ? getPlanetaryNetworkReadiness(network, state.doctrine) : 0,
  };
}
