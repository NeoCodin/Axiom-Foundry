import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialState,
  getManualGain,
  getProductionSnapshot,
  pulseCore,
} from "../app/game-engine.ts";
import {
  PULSE_WINDOW_MS,
  decayCoherence,
  getBeatIntervalMs,
  getPulseProfile,
  getResonantFlux,
  judgePulseOffset,
  nextCoherence,
} from "../app/law-heart-pulse.ts";
import { createQaCheckpoint } from "../app/qa-sandbox-engine.ts";

const NOW = 1_800_000_000_000;

test("a young Law-Heart beats slowly with timing noise; Axioms steady and quicken it", () => {
  const young = getPulseProfile(0);
  const mature = getPulseProfile(17);
  assert.equal(young.periodMs, 1_400);
  assert.ok(young.jitter > 0);
  assert.equal(mature.jitter, 0);
  assert.ok(mature.periodMs < young.periodMs);

  const intervals = Array.from({ length: 40 }, (_, index) => getBeatIntervalMs(young, index + 1));
  assert.ok(new Set(intervals.map((value) => Math.round(value))).size > 10, "young beats should vary");
  for (const interval of intervals) {
    assert.ok(interval >= young.periodMs * (1 - young.jitter) - 1e-9);
    assert.ok(interval <= young.periodMs * (1 + young.jitter) + 1e-9);
  }
  assert.equal(getBeatIntervalMs(young, 7), getBeatIntervalMs(young, 7), "the schedule is deterministic");
  assert.equal(getBeatIntervalMs(mature, 7), mature.periodMs);
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
