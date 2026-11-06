/**
 * Law-Heart pulse timing (prototype).
 *
 * The Law-Heart beats. A strike landed on the beat rides the heart's causal
 * pulse and releases a resonant bonus; consecutive on-beat strikes build
 * Coherence, which deepens that bonus. Off-beat strikes still pay the normal
 * manual gain, so timing is an optional skill, never a gate.
 *
 * Lore tie-in: each star the heart grows into has a heartbeat of its own. The
 * Dormant Seed is barely alive, slow and faint, skipping beats; it wakes and
 * steadies, hums at the Resonant Star and beats deep and strong at the
 * Axiomatic Star. The red Convergent Star is unstable: its heart races,
 * flutters and double-beats, and only coherent strikes calm it. At the
 * Transcendent Star it is at peace, slow, deep and perfectly even.
 *
 * Faster hearts are harder, not richer: the timing windows follow the beat,
 * and the resonant bonus scales with each beat's length, so on-beat play
 * earns about the same per minute at every star.
 */

export type PulseJudgement = "coherent" | "in-phase" | "off-phase";

/** Timing windows for a heart beating at the reference pace; faster hearts narrow them. */
export const PULSE_WINDOW_MS = {
  coherent: 80,
  inPhase: 180,
} as const;

/** The pace the bonus and the windows are measured against: one beat every 1.15 s. */
export const REFERENCE_BEAT_MS = 1_150;

/**
 * Proven Axioms at which the heart becomes each star: the same thresholds as its
 * spectrum (LAW_HEART_SPECTRA in law-heart-particle-field), kept here so the
 * engine and its tests need no drawing code.
 */
export const HEART_STAGE_AXIOMS = [0, 1, 3, 6, 12, 24, 72] as const;

/** How each star's heartbeat sounds. */
export type HeartVoice = "faint" | "waking" | "steady" | "echo" | "deep" | "racing" | "serene";

export type PulseProfile = {
  /** Which star, 0 (Dormant Seed) to 6 (Transcendent Star). */
  stage: number;
  voice: HeartVoice;
  /** The time between beats before any variation. */
  periodMs: number;
  /** How far each interval may stray either way, as a fraction of the period. */
  jitter: number;
  /** Chance a beat is skipped: its interval runs half again as long. */
  skip: number;
  /** Chance a beat flutters in early, a quick double beat at half the interval. */
  flutter: number;
  /** How hard each beat swells the star. */
  strength: number;
  /** How much an unstable heart shudders, 0 to 1. */
  tremor: number;
};

type Rhythm = Omit<PulseProfile, "stage">;

const RHYTHMS: readonly Rhythm[] = [
  { voice: "faint", periodMs: 1_800, jitter: 0.18, skip: 0.15, flutter: 0, strength: 0.45, tremor: 0 },
  { voice: "waking", periodMs: 1_550, jitter: 0.12, skip: 0.05, flutter: 0, strength: 0.7, tremor: 0 },
  { voice: "steady", periodMs: 1_300, jitter: 0.03, skip: 0, flutter: 0, strength: 0.9, tremor: 0 },
  { voice: "echo", periodMs: 1_200, jitter: 0.02, skip: 0, flutter: 0, strength: 1, tremor: 0 },
  { voice: "deep", periodMs: 1_050, jitter: 0.02, skip: 0, flutter: 0, strength: 1.25, tremor: 0 },
  { voice: "racing", periodMs: 640, jitter: 0.22, skip: 0, flutter: 0.18, strength: 1.1, tremor: 1 },
  { voice: "serene", periodMs: 1_350, jitter: 0, skip: 0, flutter: 0, strength: 1.4, tremor: 0 },
];

/** How the red star's racing heart looks once Coherence has fully calmed it. */
const CALMED: Pick<Rhythm, "periodMs" | "jitter" | "flutter" | "tremor"> = { periodMs: 980, jitter: 0.04, flutter: 0.02, tremor: 0.15 };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function getHeartStage(lifetimeAxioms: number) {
  const axioms = Number.isFinite(lifetimeAxioms) ? lifetimeAxioms : 0;
  let stage = 0;
  HEART_STAGE_AXIOMS.forEach((threshold, index) => {
    if (axioms >= threshold) stage = index;
  });
  return stage;
}

/**
 * The heartbeat for a heart with this many proven Axioms. Coherence only matters to
 * the red Convergent Star, whose racing heart slows and steadies as it builds.
 */
export function getPulseProfile(lifetimeAxioms: number, coherence = 0): PulseProfile {
  const stage = getHeartStage(lifetimeAxioms);
  const rhythm = RHYTHMS[stage];
  if (rhythm.voice !== "racing") return { stage, ...rhythm };
  const calm = clamp(Number.isFinite(coherence) ? coherence : 0, 0, 1);
  const toward = (from: number, to: number) => from + (to - from) * calm;
  return {
    stage,
    ...rhythm,
    periodMs: Math.round(toward(rhythm.periodMs, CALMED.periodMs)),
    jitter: toward(rhythm.jitter, CALMED.jitter),
    flutter: toward(rhythm.flutter, CALMED.flutter),
    tremor: toward(rhythm.tremor, CALMED.tremor),
  };
}

/** The timing windows for this heart: narrower as it beats faster, a little wider when slow. */
export function getPulseWindows(profile: Pick<PulseProfile, "periodMs">) {
  const scale = clamp(0.5 + (0.5 * profile.periodMs) / REFERENCE_BEAT_MS, 0.75, 1.25);
  return { coherent: PULSE_WINDOW_MS.coherent * scale, inPhase: PULSE_WINDOW_MS.inPhase * scale };
}

function hashBeat(index: number) {
  let value = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}

/**
 * Length of the interval that ends on beat `index`: the period, varied by the heart's
 * jitter, now and then skipped (half again as long) or fluttering in early (half as
 * long). Deterministic, so the approach ring can show it in advance.
 */
export function getBeatIntervalMs(profile: Pick<PulseProfile, "periodMs" | "jitter" | "skip" | "flutter">, index: number) {
  const vary = 1 + profile.jitter * (hashBeat(index * 2) * 2 - 1);
  const roll = hashBeat(index * 2 + 1);
  if (roll < profile.flutter) return profile.periodMs * 0.5 * vary;
  if (roll > 1 - profile.skip) return profile.periodMs * 1.5 * vary;
  return profile.periodMs * vary;
}

export function judgePulseOffset(offsetMs: number, windows: { coherent: number; inPhase: number } = PULSE_WINDOW_MS): PulseJudgement {
  const offset = Math.abs(offsetMs);
  if (offset <= windows.coherent) return "coherent";
  if (offset <= windows.inPhase) return "in-phase";
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
 * doubles effective output while the player is actively striking. Each beat
 * pays in proportion to its length, so a racing heart's many short beats
 * earn no more per minute than a calm heart's long ones.
 */
export function getResonantFlux(input: {
  judgement: PulseJudgement;
  coherence: number;
  manualGain: number;
  fluxPerSecond: number;
  /** The length of the beat that was struck; without it, a beat at the reference pace. */
  beatMs?: number;
}) {
  if (input.judgement === "off-phase") return 0;
  const tempo = input.beatMs !== undefined && Number.isFinite(input.beatMs) ? clamp(input.beatMs / REFERENCE_BEAT_MS, 0.25, 3) : 1;
  const coherence = Math.min(1, Math.max(0, input.coherence));
  const manualGain = Math.max(0, Number.isFinite(input.manualGain) ? input.manualGain : 0);
  const fluxPerSecond = Math.max(0, Number.isFinite(input.fluxPerSecond) ? input.fluxPerSecond : 0);
  const coherent = input.judgement === "coherent";
  const manualMultiple = coherent ? 2 + 3 * coherence : 1 + coherence;
  const productionSeconds = coherent ? 0.75 + 1.25 * coherence : 0.4 + 0.6 * coherence;
  return (manualGain * manualMultiple + fluxPerSecond * productionSeconds) * tempo;
}
