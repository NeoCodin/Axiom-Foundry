import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialState,
  getManualGain,
  getProductionSnapshot,
  pulseCore,
} from "../app/game-engine.ts";
import {
  HEART_STAGE_AXIOMS,
  PULSE_WINDOW_MS,
  REFERENCE_BEAT_MS,
  decayCoherence,
  getBeatIntervalMs,
  getHeartStage,
  getPulseProfile,
  getPulseWindows,
  getResonantFlux,
  judgePulseOffset,
  nextCoherence,
} from "../app/law-heart-pulse.ts";
import { createQaCheckpoint } from "../app/qa-sandbox-engine.ts";

const NOW = 1_800_000_000_000;

const STARS = ["Dormant Seed", "Awakening Star", "Proven Law-Star", "Resonant Star", "Axiomatic Star", "Convergent Star", "Transcendent Star"];
const intervals = (profile: ReturnType<typeof getPulseProfile>, count = 400) =>
  Array.from({ length: count }, (_, index) => getBeatIntervalMs(profile, index + 1));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

test("each star beats in its own way: faint, waking, steady, echoing, deep, racing, serene", () => {
  const profiles = HEART_STAGE_AXIOMS.map((axioms) => getPulseProfile(axioms));
  assert.deepEqual(profiles.map((profile) => profile.stage), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(profiles.map((profile) => profile.voice), ["faint", "waking", "steady", "echo", "deep", "racing", "serene"]);
  const [seed, , , , axiomatic, convergent, transcendent] = profiles;
  assert.equal(getHeartStage(23), 4, `${STARS[4]} until the red star`);
  assert.equal(getHeartStage(24), 5);

  // The Dormant Seed is the slowest and skips beats now and then.
  assert.ok(seed.periodMs > Math.max(...profiles.slice(1).map((profile) => profile.periodMs)));
  assert.ok(intervals(seed).some((interval) => interval > seed.periodMs * 1.3), "it skips");
  // The healthy hearts quicken and grow stronger up to the Axiomatic Star.
  for (let stage = 1; stage <= 4; stage += 1) {
    assert.ok(profiles[stage].periodMs < profiles[stage - 1].periodMs, `${STARS[stage]} beats faster than ${STARS[stage - 1]}`);
    assert.ok(profiles[stage].strength > profiles[stage - 1].strength);
  }
  // The red star races, wavers and flutters with quick double beats, and shudders.
  assert.ok(convergent.periodMs < axiomatic.periodMs * 0.7, "it races");
  assert.ok(intervals(convergent).some((interval) => interval < convergent.periodMs * 0.65), "it double-beats");
  assert.ok(convergent.tremor > 0.5 && profiles.every((profile, stage) => stage === 5 || profile.tremor === 0));
  // The Transcendent Star is at peace: slow, strong and perfectly even.
  assert.ok(transcendent.periodMs > axiomatic.periodMs && transcendent.strength >= axiomatic.strength);
  assert.ok(intervals(transcendent).every((interval) => interval === transcendent.periodMs));
  assert.equal(getBeatIntervalMs(convergent, 7), getBeatIntervalMs(convergent, 7), "the schedule is deterministic");
});

test("striking the red star in time calms it; letting it go lets it race again", () => {
  const wild = getPulseProfile(24, 0);
  const half = getPulseProfile(24, 0.5);
  const calm = getPulseProfile(24, 1);
  assert.ok(wild.periodMs < half.periodMs && half.periodMs < calm.periodMs, "it slows");
  assert.ok(wild.jitter > calm.jitter && wild.flutter > calm.flutter && wild.tremor > calm.tremor, "it steadies");
  assert.ok(mean(intervals(calm)) > mean(intervals(wild)) * 1.3);
  // No other star cares how coherent the player is.
  for (const axioms of [0, 3, 12, 72]) assert.deepEqual(getPulseProfile(axioms, 1), getPulseProfile(axioms, 0));
});

test("the timing windows follow the beat: tighter on a racing heart, roomier on a slow one", () => {
  const racing = getPulseWindows(getPulseProfile(24));
  const reference = getPulseWindows({ periodMs: REFERENCE_BEAT_MS });
  const slow = getPulseWindows(getPulseProfile(0));
  assert.deepEqual(reference, PULSE_WINDOW_MS);
  assert.ok(racing.coherent < reference.coherent && racing.inPhase < reference.inPhase);
  assert.ok(slow.inPhase > reference.inPhase);
  assert.equal(judgePulseOffset(PULSE_WINDOW_MS.coherent - 1, racing), "in-phase", "a hit that is coherent at the reference pace is only in phase on the racing heart");
});

test("on-beat play earns the same per minute at every star", () => {
  const perMinute = (axioms: number, coherence: number) => {
    const profile = getPulseProfile(axioms, coherence);
    let elapsed = 0;
    let earned = 0;
    for (let beat = 1; elapsed < 600_000; beat += 1) {
      const beatMs = getBeatIntervalMs(profile, beat);
      elapsed += beatMs;
      earned += getResonantFlux({ judgement: "coherent", coherence: 1, manualGain: 2, fluxPerSecond: 1_000, beatMs });
    }
    return earned / (elapsed / 60_000);
  };
  const reference = getResonantFlux({ judgement: "coherent", coherence: 1, manualGain: 2, fluxPerSecond: 1_000 }) * (60_000 / REFERENCE_BEAT_MS);
  for (const axioms of HEART_STAGE_AXIOMS) {
    for (const coherence of [0, 1]) {
      const rate = perMinute(axioms, coherence);
      assert.ok(Math.abs(rate / reference - 1) < 0.01, `${STARS[getHeartStage(axioms)]} at Coherence ${coherence}: ${Math.round(rate)} vs ${Math.round(reference)}`);
    }
  }
});

test("strike timing is judged symmetrically around the beat", () => {
  assert.equal(judgePulseOffset(0), "coherent");
  assert.equal(judgePulseOffset(-PULSE_WINDOW_MS.coherent), "coherent");
  assert.equal(judgePulseOffset(PULSE_WINDOW_MS.coherent + 1), "in-phase");
  assert.equal(judgePulseOffset(-PULSE_WINDOW_MS.inPhase), "in-phase");
  assert.equal(judgePulseOffset(PULSE_WINDOW_MS.inPhase + 1), "off-phase");
});

test("Coherence builds on the beat, breaks off it, and drains after silence", () => {
  assert.equal(nextCoherence(0, "coherent"), 0.2);
  assert.equal(nextCoherence(0, "in-phase"), 0.1);
  assert.equal(nextCoherence(0.95, "coherent"), 1);
  assert.ok(Math.abs(nextCoherence(0.6, "off-phase") - 0.2) < 1e-9);
  assert.equal(nextCoherence(0.1, "off-phase"), 0);

  assert.equal(decayCoherence(0.8, 2_000, 1_400), 0.8, "two beats of grace");
  assert.ok(decayCoherence(0.8, 4_800, 1_400) < 0.8);
  assert.equal(decayCoherence(0.8, 60_000, 1_400), 0);
});

test("resonant Flux pays nothing off the beat and scales with Coherence and production", () => {
  const base = { manualGain: 2, fluxPerSecond: 1_000 };
  assert.equal(getResonantFlux({ ...base, judgement: "off-phase", coherence: 1 }), 0);

  const inPhase = getResonantFlux({ ...base, judgement: "in-phase", coherence: 0.5 });
  const coherent = getResonantFlux({ ...base, judgement: "coherent", coherence: 0.5 });
  const coherentFull = getResonantFlux({ ...base, judgement: "coherent", coherence: 1 });
  assert.ok(inPhase > 0);
  assert.ok(coherent > inPhase);
  assert.ok(coherentFull > coherent);

  // A fully coherent strike is worth at most two seconds of output plus five manual strikes.
  assert.ok(coherentFull <= base.fluxPerSecond * 2 + base.manualGain * 5 + 1e-9);
  assert.equal(
    getResonantFlux({ judgement: "coherent", coherence: 3, manualGain: Number.NaN, fluxPerSecond: -5 }),
    0,
  );
});

test("pulseCore keeps its old behaviour without timing and adds the resonant bonus with it", () => {
  const state = createQaCheckpoint(2, NOW);
  const production = getProductionSnapshot(state).fluxPerSecond;
  const manual = getManualGain(state);

  const plain = pulseCore(state);
  assert.equal(plain.flux, state.flux + manual);
  assert.equal(plain.manualPulses, state.manualPulses + 1);

  const offBeat = pulseCore(state, { judgement: "off-phase", coherence: 0.7 });
  assert.equal(offBeat.flux, plain.flux);

  const resonance = { judgement: "coherent", coherence: 0.6 } as const;
  const resonant = pulseCore(state, resonance);
  const bonus = getResonantFlux({ ...resonance, manualGain: manual, fluxPerSecond: production });
  assert.ok(bonus > 0);
  assert.ok(Math.abs(resonant.flux - (state.flux + manual + bonus)) < 1e-6);
  assert.ok(Math.abs(resonant.runFlux - (state.runFlux + manual + bonus)) < 1e-6);
  assert.equal(resonant.manualPulses, state.manualPulses + 1, "a resonant strike still counts as one strike");
});

test("the first Cold Wake strikes stay meaningful before any machine exists", () => {
  const state = createInitialState(NOW);
  assert.equal(getProductionSnapshot(state).fluxPerSecond, 0);
  const plain = pulseCore(state).flux;
  const coherent = pulseCore(state, { judgement: "coherent", coherence: 0.2 }).flux;
  assert.ok(coherent >= plain * 3, "an on-beat strike is clearly worth more than an off-beat one");
});
