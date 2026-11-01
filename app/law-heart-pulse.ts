/**
 * Law-Heart pulse timing (prototype).
 *
 * The Law-Heart beats. A strike landed on the beat rides the heart's causal
 * pulse and releases a resonant bonus; consecutive on-beat strikes build
 * Coherence, which deepens that bonus. Off-beat strikes still pay the normal
 * manual gain, so timing is an optional skill, never a gate.
 *
 * Lore tie-in: Recalibration teaches a heart the shape and timing of its own
 * pulse. A young heart's rhythm carries timing noise; each proven Axiom
 * steadies it, and a mature heart beats faster and almost perfectly evenly.
 */

export type PulseJudgement = "coherent" | "in-phase" | "off-phase";

export const PULSE_WINDOW_MS = {
  coherent: 80,
  inPhase: 180,
} as const;

/** Axioms at which a heart's pulse counts as fully mature (the Vesper opening total). */
const MATURE_AXIOMS = 17;

export type PulseProfile = {
  periodMs: number;
  jitter: number;
};

export function getPulseProfile(lifetimeAxioms: number): PulseProfile {
  const maturity = Math.min(1, Math.max(0, Number.isFinite(lifetimeAxioms) ? lifetimeAxioms : 0) / MATURE_AXIOMS);
  return {
    periodMs: Math.round(1_400 - 250 * maturity),
    jitter: 0.2 * (1 - maturity),
  };
}

function hashBeat(index: number) {
  let value = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}

/** Length of the interval that ends on beat `index`. Deterministic, so the approach ring can show it in advance. */
export function getBeatIntervalMs(profile: PulseProfile, index: number) {
  return profile.periodMs * (1 + profile.jitter * (hashBeat(index) * 2 - 1));
}

export function judgePulseOffset(offsetMs: number): PulseJudgement {
  const offset = Math.abs(offsetMs);
  if (offset <= PULSE_WINDOW_MS.coherent) return "coherent";
  if (offset <= PULSE_WINDOW_MS.inPhase) return "in-phase";
  return "off-phase";
}

export function nextCoherence(current: number, judgement: PulseJudgement) {
  if (judgement === "coherent") return Math.min(1, current + 0.2);
  if (judgement === "in-phase") return Math.min(1, current + 0.1);
  return Math.max(0, current - 0.4);
}

/** Coherence holds for two beats of silence, then drains over four seconds. */
export function decayCoherence(current: number, msSinceLastStrike: number, periodMs: number) {
  const grace = periodMs * 2;
  if (msSinceLastStrike <= grace) return current;
  return Math.max(0, current - (msSinceLastStrike - grace) / 4_000);
}

/**
 * Bonus Flux on top of the normal manual gain. On-beat strikes are worth a
 * slice of current production, so the reward keeps pace with the Foundry
 * instead of fading into rounding error. Sustained coherent play roughly
 * doubles effective output while the player is actively striking.
 */
export function getResonantFlux(input: {
  judgement: PulseJudgement;
  coherence: number;
  manualGain: number;
  fluxPerSecond: number;
}) {
  if (input.judgement === "off-phase") return 0;
  const coherence = Math.min(1, Math.max(0, input.coherence));
  const manualGain = Math.max(0, Number.isFinite(input.manualGain) ? input.manualGain : 0);
  const fluxPerSecond = Math.max(0, Number.isFinite(input.fluxPerSecond) ? input.fluxPerSecond : 0);
  const coherent = input.judgement === "coherent";
  const manualMultiple = coherent ? 2 + 3 * coherence : 1 + coherence;
  const productionSeconds = coherent ? 0.75 + 1.25 * coherence : 0.4 + 0.6 * coherence;
  return manualGain * manualMultiple + fluxPerSecond * productionSeconds;
}
