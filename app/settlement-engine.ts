import {
  CAMPAIGN_WORLD_IDS,
  CAMPAIGN_WORLDS,
  EXPERTISE_IDS,
  getCampaignWorld,
  type CampaignWorldDefinition,
  type CampaignWorldId,
  type ContinuitySubstitution,
  type ExpertiseId,
  type LegacyBenefit,
} from "./campaign-content.ts";

export type CampaignCrewSummary = {
  id: string;
  name: string;
  role?: string | null;
  roles?: readonly string[];
  expertise?: Readonly<Partial<Record<ExpertiseId | string, number>>>;
  available?: boolean;
  canSettle?: boolean;
};

export type WorldProgressSummary = {
  completedInfrastructureIds: readonly string[];
  completedResearchIds: readonly string[];
  resolvedCrisisIds: readonly string[];
  supplies: Readonly<Record<string, number>>;
  equipment: Readonly<Record<string, number>>;
};

export type FounderSnapshot = {
  crewId: string;
  name: string;
  roles: string[];
  expertise: Record<string, number>;
};

export type ColonyRecord = {
  worldId: CampaignWorldId;
  name: string;
  establishedAt: number;
  viabilityScore: number;
  founders: FounderSnapshot[];
  legacyBenefitIds: string[];
  transmissionsRead: number;
};

export type SettlementState = {
  schema: number;
  currentWorldId: CampaignWorldId | null;
  completedWorldIds: CampaignWorldId[];
  selectedSettlerIds: string[];
  colonies: ColonyRecord[];
  lastDepartureAt: number | null;
};

export type ForecastLine = {
  kind:
    | "population"
    | "role"
    | "expertise"
    | "infrastructure"
    | "supplies"
    | "research"
    | "crisis";
  id: string;
  label: string;
  baseValue: number;
  substitutionValue: number;
  currentValue: number;
  requiredValue: number;
  met: boolean;
};

export type ViabilityDeficit = {
  kind: ForecastLine["kind"];
  id: string;
  label: string;
  missing: number;
  message: string;
  alternatives: string[];
};

export type ViabilityForecast = {
  worldId: CampaignWorldId;
  settlementRequired: boolean;
  selectedSettlerIds: string[];
  eligibleSettlerIds: string[];
  ignoredSettlerIds: string[];
  lines: ForecastLine[];
  deficits: ViabilityDeficit[];
  score: number;
  canDepart: boolean;
};

export type LegacySummary = {
  benefits: LegacyBenefit[];
  totals: Partial<Record<LegacyBenefit["metric"], number>>;
};

export type DepartureResult =
  | {
      ok: false;
      reason: "campaign-complete" | "wrong-world" | "requirements-unmet";
      state: SettlementState;
      forecast: ViabilityForecast | null;
    }
  | {
      ok: true;
      state: SettlementState;
      forecast: ViabilityForecast;
      colony: ColonyRecord | null;
      settledCrewIds: string[];
      nextWorldId: CampaignWorldId | null;
    };

export const SETTLEMENT_SCHEMA = 1;
const MAX_SETTLERS = 500;
const MAX_TEXT_LENGTH = 64;
const MAX_RESOURCE_VALUE = 1_000_000_000;
const MAX_TIMESTAMP = 10_000_000_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteInteger(value: unknown, fallback = 0, maximum = MAX_RESOURCE_VALUE) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.floor(value), 0, maximum)
    : fallback;
}

function cleanText(value: unknown, fallback: string, maximum = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maximum);
  return cleaned || fallback;
}

function normalizeId(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TEXT_LENGTH);
}

function uniqueIds(value: unknown, maximum = MAX_SETTLERS) {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    const id = normalizeId(candidate);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= maximum) break;
  }
  return ids;
}

function cleanValueRecord(value: unknown) {
  const cleaned: Record<string, number> = {};
  if (!isRecord(value)) return cleaned;
  for (const [rawId, rawValue] of Object.entries(value).slice(0, 100)) {
    const id = normalizeId(rawId);
    if (!id) continue;
    const amount = finiteInteger(rawValue);
    if (amount > 0) cleaned[id] = amount;
  }
  return cleaned;
}

function normalizeCrew(member: CampaignCrewSummary): FounderSnapshot | null {
  const crewId = normalizeId(member.id);
  if (!crewId) return null;
  const roles = uniqueIds([member.role, ...(member.roles ?? [])], 20);
  return {
    crewId,
    name: cleanText(member.name, "Unnamed survivor"),
    roles,
    expertise: cleanValueRecord(member.expertise),
  };
}

function sanitizeFounder(value: unknown): FounderSnapshot | null {
  if (!isRecord(value)) return null;
  const crewId = normalizeId(value.crewId);
  if (!crewId) return null;
  return {
    crewId,
    name: cleanText(value.name, "Unnamed founder"),
    roles: uniqueIds(value.roles, 20),
    expertise: cleanValueRecord(value.expertise),
  };
}

function sanitizeColony(
  value: unknown,
  completed: ReadonlySet<CampaignWorldId>,
): ColonyRecord | null {
  if (!isRecord(value) || typeof value.worldId !== "string") return null;
  const world = getCampaignWorld(value.worldId);
  if (!world || world.kind !== "planet" || !completed.has(world.id)) return null;

  const founders: FounderSnapshot[] = [];
  const founderIds = new Set<string>();
  if (Array.isArray(value.founders)) {
    for (const rawFounder of value.founders.slice(0, MAX_SETTLERS)) {
      const founder = sanitizeFounder(rawFounder);
      if (!founder || founderIds.has(founder.crewId)) continue;
      founders.push(founder);
      founderIds.add(founder.crewId);
    }
  }

  const validBenefits = new Set(world.legacyBenefits.map((benefit) => benefit.id));
  return {
    worldId: world.id,
    name: cleanText(value.name, `${world.name} Continuity Settlement`),
    establishedAt: finiteInteger(value.establishedAt, 0, MAX_TIMESTAMP),
    viabilityScore: finiteInteger(value.viabilityScore, 0, 100),
    founders,
    legacyBenefitIds: uniqueIds(value.legacyBenefitIds, 20).filter((id) =>
      validBenefits.has(id),
    ),
    transmissionsRead: finiteInteger(
      value.transmissionsRead,
      0,
      world.transmissions.length,
    ),
  };
}

function getCompletedPrefix(value: unknown) {
  const requested = new Set(uniqueIds(value, CAMPAIGN_WORLD_IDS.length));
  const completed: CampaignWorldId[] = [];
  for (const worldId of CAMPAIGN_WORLD_IDS) {
    if (!requested.has(worldId)) break;
    completed.push(worldId);
  }
  return completed;
}

export function createSettlementState(): SettlementState {
  return {
    schema: SETTLEMENT_SCHEMA,
    currentWorldId: "cold-wake",
    completedWorldIds: [],
    selectedSettlerIds: [],
    colonies: [],
    lastDepartureAt: null,
  };
}

export function cloneSettlementState(state: SettlementState): SettlementState {
  return {
    ...state,
    completedWorldIds: [...state.completedWorldIds],
    selectedSettlerIds: [...state.selectedSettlerIds],
    colonies: state.colonies.map((colony) => ({
      ...colony,
      founders: colony.founders.map((founder) => ({
        ...founder,
        roles: [...founder.roles],
        expertise: { ...founder.expertise },
      })),
      legacyBenefitIds: [...colony.legacyBenefitIds],
    })),
  };
}

export function sanitizeSettlementState(value: unknown): SettlementState {
  if (!isRecord(value)) return createSettlementState();

  const completedWorldIds = getCompletedPrefix(value.completedWorldIds);
  const completed = new Set(completedWorldIds);
  const currentWorldId =
    completedWorldIds.length >= CAMPAIGN_WORLD_IDS.length
      ? null
      : CAMPAIGN_WORLD_IDS[completedWorldIds.length];
  const colonies: ColonyRecord[] = [];
  const colonyWorlds = new Set<CampaignWorldId>();

  if (Array.isArray(value.colonies)) {
    for (const rawColony of value.colonies) {
      const colony = sanitizeColony(rawColony, completed);
      if (!colony || colonyWorlds.has(colony.worldId)) continue;
      colonies.push(colony);
      colonyWorlds.add(colony.worldId);
    }
  }

  const settledIds = new Set(
    colonies.flatMap((colony) => colony.founders.map((founder) => founder.crewId)),
  );
  const selectedSettlerIds =
    currentWorldId && getCampaignWorld(currentWorldId)?.settlementRequired
    ? uniqueIds(value.selectedSettlerIds).filter((id) => !settledIds.has(id))
    : [];

  return {
    schema: SETTLEMENT_SCHEMA,
    currentWorldId,
    completedWorldIds,
    selectedSettlerIds,
    colonies,
    lastDepartureAt:
      value.lastDepartureAt === null
        ? null
        : finiteInteger(value.lastDepartureAt, 0, MAX_TIMESTAMP),
  };
}

export function sanitizeWorldProgress(value: unknown): WorldProgressSummary {
  if (!isRecord(value)) {
    return {
      completedInfrastructureIds: [],
      completedResearchIds: [],
      resolvedCrisisIds: [],
      supplies: {},
      equipment: {},
    };
  }
  return {
    completedInfrastructureIds: uniqueIds(value.completedInfrastructureIds, 100),
    completedResearchIds: uniqueIds(value.completedResearchIds, 200),
    resolvedCrisisIds: uniqueIds(value.resolvedCrisisIds, 100),
    supplies: cleanValueRecord(value.supplies),
    equipment: cleanValueRecord(value.equipment),
  };
}

function settledCrewIds(state: SettlementState) {
  return new Set(
    state.colonies.flatMap((colony) =>
      colony.founders.map((founder) => founder.crewId),
    ),
  );
}

function availableCrew(
  state: SettlementState,
  crew: readonly CampaignCrewSummary[],
) {
  const alreadySettled = settledCrewIds(state);
  const available = new Map<string, FounderSnapshot>();
  for (const member of crew) {
    if (member.available === false || member.canSettle === false) continue;
    const normalized = normalizeCrew(member);
    if (!normalized || alreadySettled.has(normalized.crewId)) continue;
    available.set(normalized.crewId, normalized);
  }
  return available;
}

export function setSelectedSettlers(
  state: SettlementState,
  crew: readonly CampaignCrewSummary[],
  crewIds: readonly string[],
) {
  if (!state.currentWorldId) return state;
  const world = getCampaignWorld(state.currentWorldId);
  if (!world?.settlementRequired) {
    return state.selectedSettlerIds.length === 0
      ? state
      : { ...state, selectedSettlerIds: [] };
  }

  const available = availableCrew(state, crew);
  const selectedSettlerIds = uniqueIds(crewIds).filter((id) => available.has(id));
  if (
    selectedSettlerIds.length === state.selectedSettlerIds.length &&
    selectedSettlerIds.every((id, index) => id === state.selectedSettlerIds[index])
  ) {
    return state;
  }
  return { ...state, selectedSettlerIds };
}

export function toggleSettlerSelection(
  state: SettlementState,
  crew: readonly CampaignCrewSummary[],
  crewId: string,
) {
  const id = normalizeId(crewId);
  if (!id) return state;
  const selected = new Set(state.selectedSettlerIds);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return setSelectedSettlers(state, crew, [...selected]);
}

function substitutionAmount(
  substitution: ContinuitySubstitution,
  progress: WorldProgressSummary,
) {
  const sourceCount =
    substitution.sourceKind === "equipment"
      ? (progress.equipment[substitution.sourceId] ?? 0)
      : progress.completedResearchIds.includes(substitution.sourceId)
        ? 1
        : 0;
  return Math.min(
    substitution.maxContribution,
    sourceCount * substitution.contribution,
  );
}

function substitutionsFor(
  world: CampaignWorldDefinition,
  targetKind: ContinuitySubstitution["targetKind"],
  targetId: string,
  progress: WorldProgressSummary,
) {
  return world.substitutions
    .filter(
      (substitution) =>
        substitution.targetKind === targetKind &&
        substitution.targetId === targetId,
    )
    .reduce(
      (total, substitution) => total + substitutionAmount(substitution, progress),
      0,
    );
}

function matchingSubstitutions(
  world: CampaignWorldDefinition,
  targetKind: ContinuitySubstitution["targetKind"],
  targetId: string,
) {
  return world.substitutions
    .filter(
      (substitution) =>
        substitution.targetKind === targetKind &&
        substitution.targetId === targetId,
    )
    .map((substitution) => substitution.label);
}

function line(
  kind: ForecastLine["kind"],
  id: string,
  label: string,
  baseValue: number,
  substitutionValue: number,
  requiredValue: number,
): ForecastLine {
  const currentValue = baseValue + substitutionValue;
  return {
    kind,
    id,
    label,
    baseValue,
    substitutionValue,
    currentValue,
    requiredValue,
    met: currentValue >= requiredValue,
  };
}

function deficitFor(
  requirement: ForecastLine,
  world: CampaignWorldDefinition,
): ViabilityDeficit | null {
  if (requirement.met) return null;
  const missing = Math.max(0, requirement.requiredValue - requirement.currentValue);
  let message = `${requirement.label}: ${missing} more required.`;
  let alternatives: string[] = [];

  if (requirement.kind === "population") {
    message = `Select ${missing} more eligible settler${missing === 1 ? "" : "s"}.`;
  } else if (requirement.kind === "role") {
    const role = world.roleRequirements.find((candidate) => candidate.id === requirement.id);
    alternatives = [
      ...(role
        ? [`Train or recruit: ${role.acceptedRoles.join(", ")}.`]
        : []),
      ...matchingSubstitutions(world, "role", requirement.id),
    ];
  } else if (requirement.kind === "expertise") {
    alternatives = [
      `Train selected civilians in ${requirement.label.toLocaleLowerCase("en-US")}.`,
      ...matchingSubstitutions(world, "expertise", requirement.id),
    ];
  } else if (requirement.kind === "infrastructure") {
    const objective = world.infrastructure.find(
      (candidate) => candidate.id === requirement.id,
    );
    message = objective?.description ?? message;
  } else if (requirement.kind === "supplies") {
    message = `Reserve ${missing} more ${requirement.label.toLocaleLowerCase("en-US")}.`;
  } else if (requirement.kind === "research") {
    message = `Complete research: ${requirement.label}.`;
  } else if (requirement.kind === "crisis") {
    message = `Resolve ${requirement.label} before choosing departure.`;
  }

  return {
    kind: requirement.kind,
    id: requirement.id,
    label: requirement.label,
    missing,
    message,
    alternatives,
  };
}

function averageRatio(lines: readonly ForecastLine[]) {
  if (lines.length === 0) return null;
  return (
    lines.reduce(
      (total, requirement) =>
        total +
        (requirement.requiredValue <= 0
          ? 1
          : Math.min(1, requirement.currentValue / requirement.requiredValue)),
      0,
    ) / lines.length
  );
}

function viabilityScore(lines: readonly ForecastLine[]) {
  const weights: Record<ForecastLine["kind"], number> = {
    population: 25,
    role: 20,
    expertise: 20,
    infrastructure: 15,
    supplies: 8,
    research: 7,
    crisis: 5,
  };
  let weightedTotal = 0;
  let includedWeight = 0;

  for (const kind of Object.keys(weights) as ForecastLine["kind"][]) {
    const ratio = averageRatio(lines.filter((entry) => entry.kind === kind));
    if (ratio === null) continue;
    weightedTotal += ratio * weights[kind];
    includedWeight += weights[kind];
  }
  return includedWeight > 0
    ? Math.round((weightedTotal / includedWeight) * 100)
    : 100;
}

export function getViabilityForecast(
  state: SettlementState,
  worldId: CampaignWorldId,
  crew: readonly CampaignCrewSummary[],
  rawProgress: WorldProgressSummary | unknown,
): ViabilityForecast {
  const world = getCampaignWorld(worldId) ?? CAMPAIGN_WORLDS[0];
  const progress = sanitizeWorldProgress(rawProgress);
  const available = availableCrew(state, crew);
  const selectedSettlerIds = [...state.selectedSettlerIds];
  const settlers = selectedSettlerIds
    .map((crewId) => available.get(crewId))
    .filter((member): member is FounderSnapshot => Boolean(member));
  const eligibleSettlerIds = settlers.map((settler) => settler.crewId);
  const eligible = new Set(eligibleSettlerIds);
  const ignoredSettlerIds = selectedSettlerIds.filter((id) => !eligible.has(id));
  const lines: ForecastLine[] = [];

  if (world.settlementRequired) {
    lines.push(
      line(
        "population",
        "stable-population",
        "Stable founding population",
        settlers.length,
        0,
        world.minimumPopulation,
      ),
    );
  }

  for (const requirement of world.roleRequirements) {
    const accepted = new Set(requirement.acceptedRoles.map(normalizeId));
    const matchingCrew = settlers.filter((settler) =>
      settler.roles.some((role) => accepted.has(role)),
    ).length;
    const assisted = substitutionsFor(world, "role", requirement.id, progress);
    lines.push(
      line(
        "role",
        requirement.id,
        requirement.label,
        matchingCrew,
        assisted,
        requirement.count,
      ),
    );
  }

  for (const requirement of world.expertiseRequirements) {
    const skillTotal = settlers.reduce(
      (total, settler) => total + (settler.expertise[requirement.id] ?? 0),
      0,
    );
    const assisted = substitutionsFor(
      world,
      "expertise",
      requirement.id,
      progress,
    );
    lines.push(
      line(
        "expertise",
        requirement.id,
        requirement.label,
        skillTotal,
        assisted,
        requirement.total,
      ),
    );
  }

  for (const objective of world.infrastructure) {
    lines.push(
      line(
        "infrastructure",
        objective.id,
        objective.name,
        progress.completedInfrastructureIds.includes(objective.id) ? 1 : 0,
        0,
        1,
      ),
    );
  }

  for (const requirement of world.supplyRequirements) {
    lines.push(
      line(
        "supplies",
        requirement.id,
        requirement.label,
        progress.supplies[requirement.id] ?? 0,
        0,
        requirement.amount,
      ),
    );
  }

  for (const researchId of world.requiredResearchIds) {
    lines.push(
      line(
        "research",
        researchId,
        researchId.replace(/-/g, " "),
        progress.completedResearchIds.includes(researchId) ? 1 : 0,
        0,
        1,
      ),
    );
  }

  for (const crisisId of world.crisisIds) {
    lines.push(
      line(
        "crisis",
        crisisId,
        crisisId.replace(/-/g, " "),
        progress.resolvedCrisisIds.includes(crisisId) ? 1 : 0,
        0,
        1,
      ),
    );
  }

  const deficits = lines
    .map((requirement) => deficitFor(requirement, world))
    .filter((deficit): deficit is ViabilityDeficit => Boolean(deficit));

  return {
    worldId: world.id,
    settlementRequired: world.settlementRequired,
    selectedSettlerIds,
    eligibleSettlerIds,
    ignoredSettlerIds,
    lines,
    deficits,
    score: viabilityScore(lines),
    canDepart: deficits.length === 0,
  };
}

function snapshotSelectedCrew(
  state: SettlementState,
  crew: readonly CampaignCrewSummary[],
) {
  const available = availableCrew(state, crew);
  return state.selectedSettlerIds
    .map((crewId) => available.get(crewId))
    .filter((member): member is FounderSnapshot => Boolean(member))
    .map((member) => ({
      ...member,
      roles: [...member.roles],
      expertise: { ...member.expertise },
    }));
}

export function establishSettlementAndDepart(
  state: SettlementState,
  worldId: CampaignWorldId,
  crew: readonly CampaignCrewSummary[],
  progress: WorldProgressSummary | unknown,
  departedAt: number,
  colonyName?: string,
): DepartureResult {
  if (!state.currentWorldId) {
    return { ok: false, reason: "campaign-complete", state, forecast: null };
  }
  if (state.currentWorldId !== worldId) {
    return { ok: false, reason: "wrong-world", state, forecast: null };
  }

  const world = getCampaignWorld(worldId);
  if (!world) {
    return { ok: false, reason: "wrong-world", state, forecast: null };
  }
  const forecast = getViabilityForecast(state, worldId, crew, progress);
  if (!forecast.canDepart) {
    return {
      ok: false,
      reason: "requirements-unmet",
      state,
      forecast,
    };
  }

  const founders = world.settlementRequired
    ? snapshotSelectedCrew(state, crew)
    : [];
  const establishedAt = finiteInteger(departedAt, 0, MAX_TIMESTAMP);
  const colony: ColonyRecord | null = world.settlementRequired
    ? {
        worldId,
        name: cleanText(colonyName, `${world.name} Continuity Settlement`),
        establishedAt,
        viabilityScore: forecast.score,
        founders,
        legacyBenefitIds: world.legacyBenefits.map((benefit) => benefit.id),
        transmissionsRead: 0,
      }
    : null;
  const completedWorldIds = [...state.completedWorldIds, worldId];
  const nextWorldId =
    CAMPAIGN_WORLD_IDS[completedWorldIds.length] ?? null;
  const nextState: SettlementState = {
    schema: SETTLEMENT_SCHEMA,
    currentWorldId: nextWorldId,
    completedWorldIds,
    selectedSettlerIds: [],
    colonies: colony ? [...state.colonies, colony] : [...state.colonies],
    lastDepartureAt: establishedAt,
  };

  return {
    ok: true,
    state: nextState,
    forecast,
    colony,
    settledCrewIds: founders.map((founder) => founder.crewId),
    nextWorldId,
  };
}

export function getCurrentCampaignWorld(state: SettlementState) {
  return state.currentWorldId ? getCampaignWorld(state.currentWorldId) : null;
}

export function isCampaignComplete(state: SettlementState) {
  return state.currentWorldId === null;
}

export function getColony(
  state: SettlementState,
  worldId: CampaignWorldId,
) {
  return state.colonies.find((colony) => colony.worldId === worldId) ?? null;
}

export function getNextColonyTransmission(
  state: SettlementState,
  worldId: CampaignWorldId,
) {
  const colony = getColony(state, worldId);
  const world = getCampaignWorld(worldId);
  if (!colony || !world) return null;
  return world.transmissions[colony.transmissionsRead] ?? null;
}

export function acknowledgeColonyTransmission(
  state: SettlementState,
  worldId: CampaignWorldId,
) {
  const world = getCampaignWorld(worldId);
  if (!world) return state;
  const index = state.colonies.findIndex((colony) => colony.worldId === worldId);
  if (index < 0) return state;
  const colony = state.colonies[index];
  if (colony.transmissionsRead >= world.transmissions.length) return state;

  const colonies = state.colonies.map((candidate, colonyIndex) =>
    colonyIndex === index
      ? { ...candidate, transmissionsRead: candidate.transmissionsRead + 1 }
      : candidate,
  );
  return { ...state, colonies };
}

export function getLegacySummary(state: SettlementState): LegacySummary {
  const benefits: LegacyBenefit[] = [];
  const totals: LegacySummary["totals"] = {};

  for (const colony of state.colonies) {
    const world = getCampaignWorld(colony.worldId);
    if (!world) continue;
    for (const benefitId of colony.legacyBenefitIds) {
      const benefit = world.legacyBenefits.find(
        (candidate) => candidate.id === benefitId,
      );
      if (!benefit) continue;
      benefits.push(benefit);
      totals[benefit.metric] = (totals[benefit.metric] ?? 0) + benefit.value;
    }
  }

  return { benefits, totals };
}

export function getAllPendingColonyTransmissions(state: SettlementState) {
  return state.colonies.flatMap((colony) => {
    const transmission = getNextColonyTransmission(state, colony.worldId);
    return transmission
      ? [{ worldId: colony.worldId, colonyName: colony.name, transmission }]
      : [];
  });
}

export function getExpertiseIds() {
  return [...EXPERTISE_IDS];
}
