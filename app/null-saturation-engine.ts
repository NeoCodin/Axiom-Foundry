export const WORLD_NULL_SATURATION = {
  "cold-wake": 28,
  pelagos: 6,
  viridia: 10,
  cinder: 15,
  nox: 23,
  vesper: 34,
} as const;

export type NullWorldId = keyof typeof WORLD_NULL_SATURATION;

export type NullSaturationOverride = {
  enabled: boolean;
  ambient: number;
  lawHeartResistance: number;
  researchProtection: number;
  infrastructureProtection: number;
  visualIntensity: number | null;
};

export const DEFAULT_NULL_SATURATION_OVERRIDE: NullSaturationOverride = {
  enabled: false,
  ambient: 34,
  lawHeartResistance: 0,
  researchProtection: 0,
  infrastructureProtection: 0,
  visualIntensity: null,
};

export type NullSaturationView = {
  label: "Unknown Interference" | "Law Variance" | "Causal Contamination" | "Null Saturation";
  ambient: number;
  effective: number;
  lawHeartResistance: number;
  researchProtection: number;
  infrastructureProtection: number;
  visualIntensity: number;
  classification: "quiet" | "trace" | "elevated" | "severe";
  medicalRecoveryMultiplier: number;
  researchThroughputMultiplier: number;
  nullEvidenceMultiplier: number;
  expeditionDifficultyBonus: number;
  recalibrationStabilityMultiplier: number;
};

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));

export function getNullDisplayLabel(worldIndex: number): NullSaturationView["label"] {
  if (worldIndex <= 0) return "Unknown Interference";
  if (worldIndex === 1) return "Law Variance";
  if (worldIndex <= 3) return "Causal Contamination";
  return "Null Saturation";
}

export function getLawHeartNullResistance(lifetimeAxioms: number) {
  if (lifetimeAxioms >= 72) return 18;
  if (lifetimeAxioms >= 24) return 11; // powerful, but the red state is not synchronized
  if (lifetimeAxioms >= 12) return 13;
  if (lifetimeAxioms >= 6) return 10;
  if (lifetimeAxioms >= 3) return 7;
  if (lifetimeAxioms >= 1) return 4;
  return 0;
}

export function calculateNullSaturation(input: {
  worldId: string;
  worldIndex: number;
  lifetimeAxioms: number;
  completedResearchIds?: readonly string[];
  completedInfrastructure?: number;
  override?: NullSaturationOverride | null;
}): NullSaturationView {
  const worldId = (input.worldId in WORLD_NULL_SATURATION ? input.worldId : "cold-wake") as NullWorldId;
  const completed = new Set(input.completedResearchIds ?? []);
  const liveLawResistance = getLawHeartNullResistance(input.lifetimeAxioms);
  const liveResearchProtection =
    (completed.has("null-signal-baseline") ? 2 : 0) +
    (completed.has("observer-recursion") ? 3 : 0) +
    (completed.has("null-exposure-conditioning") ? 2 : 0) +
    (completed.has("axiom-origin-proof") ? 3 : 0);
  const liveInfrastructureProtection = Math.min(5, Math.max(0, input.completedInfrastructure ?? 0));
  const override = input.override?.enabled ? input.override : null;
  const ambient = clamp(override?.ambient ?? WORLD_NULL_SATURATION[worldId]);
  const lawHeartResistance = clamp(override?.lawHeartResistance ?? liveLawResistance, 0, 40);
  const researchProtection = clamp(override?.researchProtection ?? liveResearchProtection, 0, 30);
  const infrastructureProtection = clamp(override?.infrastructureProtection ?? liveInfrastructureProtection, 0, 20);
  const effective = clamp(ambient - lawHeartResistance - researchProtection - infrastructureProtection);
  const pressure = clamp((effective - 8) / 32, 0, 1);
  const visualIntensity = clamp(override?.visualIntensity ?? pressure, 0, 1);
  return {
    label: getNullDisplayLabel(input.worldIndex),
    ambient,
    effective,
    lawHeartResistance,
    researchProtection,
    infrastructureProtection,
    visualIntensity,
    classification: effective < 8 ? "quiet" : effective < 18 ? "trace" : effective < 30 ? "elevated" : "severe",
    medicalRecoveryMultiplier: 1 - pressure * 0.12,
    researchThroughputMultiplier: 1 - pressure * 0.1,
    nullEvidenceMultiplier: 1 + pressure * 0.18,
    expeditionDifficultyBonus: Math.round(pressure * 4),
    recalibrationStabilityMultiplier: 1 - pressure * 0.1,
  };
}
