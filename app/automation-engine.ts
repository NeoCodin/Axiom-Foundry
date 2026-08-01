/**
 * Utility Drone Operations.
 *
 * Frames are scarce permanent Ark hardware. They support trained people rather
 * than replacing them: medical and research bonuses are applied by the game
 * engine only when the corresponding crew are actually working.
 */

export type AutomationProgramId =
  | "hull-maintenance"
  | "medical-assistance"
  | "research-routing"
  | "expedition-support"
  | "construction-machines"
  | "interceptor-control"
  | "personnel-logistics";

export type AutomationMaintenancePolicy = "off" | "reserve" | "priority";

export type AutomationProgramDefinition = {
  id: AutomationProgramId;
  name: string;
  description: string;
  requiredResearchId: string;
  maximumFrames: number;
  loadPerFrame: number;
};

export const MAX_UTILITY_DRONE_FRAMES = 8;
export const AUTOMATION_SCHEMA = 1;
export const AUTOMATED_REPAIR_INTERVAL_SECONDS = 3_600;

export const AUTOMATION_PROGRAM_DEFINITIONS: readonly AutomationProgramDefinition[] = [
  {
    id: "hull-maintenance",
    name: "Hull Maintenance",
    description: "Repair swarms shorten temporary hull damage and restore damaged Armory frames.",
    requiredResearchId: "autonomous-repair-swarms",
    maximumFrames: 3,
    loadPerFrame: 0.0125,
  },
  {
    id: "medical-assistance",
    name: "Medical Assistance",
    description: "Clinical drones multiply an on-duty Doctor's care; they cannot diagnose alone.",
    requiredResearchId: "medical-assistance-drones",
    maximumFrames: 3,
    loadPerFrame: 0.0125,
  },
  {
    id: "research-routing",
    name: "Research Routing",
    description: "Routing automata accelerate Prototype and Field Validation work beside Researchers.",
    requiredResearchId: "lattice-routing-automata",
    maximumFrames: 3,
    loadPerFrame: 0.0125,
  },
  {
    id: "expedition-support",
    name: "Expedition Support",
    description: "One field drone carries instruments, recovery line, and emergency fabrication stock.",
    requiredResearchId: "expedition-support-drones",
    maximumFrames: 1,
    loadPerFrame: 0.0125,
  },
  {
    id: "construction-machines",
    name: "Planetary Construction",
    description: "Heavy frames shorten planetary defense construction while Engineers direct the work.",
    requiredResearchId: "planetary-construction-machines",
    maximumFrames: 3,
    loadPerFrame: 0.0125,
  },
  {
    id: "interceptor-control",
    name: "Interceptor Control",
    description: "Autonomous wingmates add bounded readiness to hostile-vessel defense.",
    requiredResearchId: "interceptor-control-systems",
    maximumFrames: 3,
    loadPerFrame: 0.0125,
  },
  {
    id: "personnel-logistics",
    name: "Personnel Logistics",
    description: "Cargo drones help reserve crew recover Salvage without automating professions.",
    requiredResearchId: "automated-personnel-logistics",
    maximumFrames: 3,
    loadPerFrame: 0.0125,
  },
] as const;

export type AutomationState = {
  schema: number;
  framesBuilt: number;
  allocations: Record<AutomationProgramId, number>;
  maintenancePolicy: AutomationMaintenancePolicy;
  repairProgressSeconds: number;
  stats: { equipmentRepaired: number; framesBuilt: number };
};

export type AutomationEffects = {
  operationalLoad: number;
  hullRepairMultiplier: number;
  medicalRecoveryMultiplier: number;
  researchRoutingMultiplier: number;
  expeditionStrengthBonus: number;
  expeditionRewardMultiplier: number;
  constructionSpeedMultiplier: number;
  interceptorReadiness: number;
  reserveSalvageMultiplier: number;
  activeFrames: number;
};

const PROGRAM_IDS = AUTOMATION_PROGRAM_DEFINITIONS.map((program) => program.id);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const whole = (value: unknown, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(0, Math.floor(parsed)))
    : fallback;
};

const emptyAllocations = (): Record<AutomationProgramId, number> =>
  Object.fromEntries(PROGRAM_IDS.map((id) => [id, 0])) as Record<AutomationProgramId, number>;

export function createAutomationState(): AutomationState {
  return {
    schema: AUTOMATION_SCHEMA,
    framesBuilt: 0,
    allocations: emptyAllocations(),
    maintenancePolicy: "reserve",
    repairProgressSeconds: 0,
    stats: { equipmentRepaired: 0, framesBuilt: 0 },
  };
}

export function cloneAutomationState(state: AutomationState): AutomationState {
  return {
    ...state,
    allocations: { ...state.allocations },
    stats: { ...state.stats },
  };
}

export function sanitizeAutomationState(value: unknown): AutomationState {
  const base = createAutomationState();
  if (!isRecord(value)) return base;
  const framesBuilt = whole(value.framesBuilt, 0, MAX_UTILITY_DRONE_FRAMES);
  const allocations = emptyAllocations();
  const raw = isRecord(value.allocations) ? value.allocations : {};
  let remaining = framesBuilt;
  for (const definition of AUTOMATION_PROGRAM_DEFINITIONS) {
    const allocated = Math.min(
      remaining,
      whole(raw[definition.id], 0, definition.maximumFrames),
    );
    allocations[definition.id] = allocated;
    remaining -= allocated;
  }
  const policy: AutomationMaintenancePolicy =
    value.maintenancePolicy === "off" || value.maintenancePolicy === "priority"
      ? value.maintenancePolicy
      : "reserve";
  const stats = isRecord(value.stats) ? value.stats : {};
  return {
    schema: AUTOMATION_SCHEMA,
    framesBuilt,
    allocations,
    maintenancePolicy: policy,
    repairProgressSeconds: Math.min(
      AUTOMATED_REPAIR_INTERVAL_SECONDS,
      Math.max(0, Number(value.repairProgressSeconds) || 0),
    ),
    stats: {
      equipmentRepaired: whole(stats.equipmentRepaired, 0, 1e9),
      framesBuilt: Math.max(framesBuilt, whole(stats.framesBuilt, framesBuilt, 1e9)),
    },
  };
}

export function getAllocatedAutomationFrames(state: AutomationState) {
  return PROGRAM_IDS.reduce((total, id) => total + state.allocations[id], 0);
}

export function getAvailableAutomationFrames(state: AutomationState) {
  return Math.max(0, state.framesBuilt - getAllocatedAutomationFrames(state));
}

export function buildAutomationFrame(state: AutomationState) {
  if (state.framesBuilt >= MAX_UTILITY_DRONE_FRAMES) return state;
  const next = cloneAutomationState(state);
  next.framesBuilt += 1;
  next.stats.framesBuilt = Math.max(next.stats.framesBuilt, next.framesBuilt);
  return next;
}

export function setAutomationAllocation(
  state: AutomationState,
  programId: AutomationProgramId,
  amount: number,
) {
  const definition = AUTOMATION_PROGRAM_DEFINITIONS.find((program) => program.id === programId);
  if (!definition) return state;
  const nextAmount = whole(amount, 0, definition.maximumFrames);
  const usedWithoutProgram = getAllocatedAutomationFrames(state) - state.allocations[programId];
  if (usedWithoutProgram + nextAmount > state.framesBuilt) return state;
  if (state.allocations[programId] === nextAmount) return state;
  const next = cloneAutomationState(state);
  next.allocations[programId] = nextAmount;
  return next;
}

export function setAutomationMaintenancePolicy(
  state: AutomationState,
  policy: AutomationMaintenancePolicy,
) {
  if (policy !== "off" && policy !== "reserve" && policy !== "priority") return state;
  return policy === state.maintenancePolicy ? state : { ...state, maintenancePolicy: policy };
}

export function getAutomationEffects(
  state: AutomationState,
  suppressedProgram: AutomationProgramId | null = null,
): AutomationEffects {
  const count = (id: AutomationProgramId) =>
    suppressedProgram === id ? 0 : state.allocations[id];
  const activeFrames = PROGRAM_IDS.reduce((total, id) => total + count(id), 0);
  return {
    operationalLoad: Math.min(0.1, activeFrames * 0.0125),
    hullRepairMultiplier: 1 + Math.min(0.45, count("hull-maintenance") * 0.15),
    medicalRecoveryMultiplier: 1 + Math.min(0.15, count("medical-assistance") * 0.05),
    researchRoutingMultiplier: 1 + Math.min(0.09, count("research-routing") * 0.03),
    expeditionStrengthBonus: count("expedition-support") > 0 ? 1 : 0,
    expeditionRewardMultiplier: count("expedition-support") > 0 ? 1.05 : 1,
    constructionSpeedMultiplier: 1 + Math.min(0.36, count("construction-machines") * 0.12),
    interceptorReadiness: Math.min(18, count("interceptor-control") * 6),
    reserveSalvageMultiplier: 1 + Math.min(0.3, count("personnel-logistics") * 0.1),
    activeFrames,
  };
}

export function getAutomationProgramDefinition(id: AutomationProgramId) {
  return AUTOMATION_PROGRAM_DEFINITIONS.find((program) => program.id === id)!;
}
