"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playPulseStrike, schedulePulseBeat, unlockPulseAudio } from "./law-heart-audio";
import type { LawHeartBeat } from "./law-heart-particle-field";
import {
  decayCoherence,
  getBeatIntervalMs,
  getPulseProfile,
  getPulseWindows,
  judgePulseOffset,
  nextCoherence,
  type PulseJudgement,
} from "./law-heart-pulse";

export type PulseStrike = {
  judgement: PulseJudgement;
  coherence: number;
  /** The length of the beat that was struck: the bonus scales with it. */
  beatMs: number;
};

type PulseClock = {
  lastBeatIndex: number;
  lastBeatAt: number;
  /** How long the beat that just landed took to come. */
  lastSpan: number;
  nextBeatAt: number;
  judgedBeat: number;
  soundedBeat: number;
  lastStrikeAt: number;
  coherenceAtStrike: number;
};

/** A tap is timed from the moment the finger or button lands, not from release. */
const PRESS_MEMORY_MS = 600;
/** Heartbeat audio is scheduled this far ahead so it lands on the beat, not a frame late. */
const AUDIO_LOOKAHEAD_MS = 120;

/**
 * The Law-Heart's beat. Each star beats its own way (law-heart-pulse); the rhythm is
 * read afresh at every beat, so a racing red heart slows as Coherence builds and
 * speeds up again as it drains.
 */
export function useLawHeartPulse(lifetimeAxioms: number) {
  const axiomsRef = useRef(lifetimeAxioms);
  const approachRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const beatRef = useRef<LawHeartBeat | null>(null);
  const clockRef = useRef<PulseClock | null>(null);
  const pressedAtRef = useRef<number | null>(null);
  const [coherence, setCoherence] = useState(0);

  useEffect(() => {
    axiomsRef.current = lifetimeAxioms;
  }, [lifetimeAxioms]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      let clock = clockRef.current;
      const calm = clock ? decayCoherence(clock.coherenceAtStrike, now - clock.lastStrikeAt, clock.lastSpan) : 0;
      const profile = getPulseProfile(axiomsRef.current, calm);
      // First frame, or the tab was hidden long enough that frames stopped:
      // restart the rhythm instead of replaying every missed beat.
      if (!clock || now - clock.nextBeatAt > profile.periodMs * 2) {
        const first = getBeatIntervalMs(profile, 1);
        clock = {
          lastBeatIndex: 0,
          lastBeatAt: now,
          lastSpan: first,
          nextBeatAt: now + first,
          judgedBeat: -1,
          soundedBeat: 0,
          lastStrikeAt: clock?.lastStrikeAt ?? 0,
          coherenceAtStrike: clock?.coherenceAtStrike ?? 0,
        };
        clockRef.current = clock;
      }
      while (now >= clock.nextBeatAt) {
        clock.lastBeatIndex += 1;
        clock.lastSpan = clock.nextBeatAt - clock.lastBeatAt;
        clock.lastBeatAt = clock.nextBeatAt;
        clock.nextBeatAt += getBeatIntervalMs(profile, clock.lastBeatIndex + 1);
        targetRef.current?.animate?.(
          [{ opacity: 1, filter: "brightness(1.9)" }, { opacity: 0.55, filter: "brightness(1)" }],
          { duration: 240, easing: "steps(4, end)" },
        );
      }
      const span = clock.nextBeatAt - clock.lastBeatAt;
      const approach = Math.min(1, Math.max(0, (now - clock.lastBeatAt) / span));
      approachRef.current?.style.setProperty("--pulse-approach", approach.toFixed(3));

      const decayed = decayCoherence(clock.coherenceAtStrike, now - clock.lastStrikeAt, profile.periodMs);
      const upcomingBeat = clock.lastBeatIndex + 1;
      if (clock.soundedBeat < upcomingBeat && clock.nextBeatAt - now <= AUDIO_LOOKAHEAD_MS) {
        clock.soundedBeat = upcomingBeat;
        schedulePulseBeat(clock.nextBeatAt, decayed, profile.voice, profile.tremor);
      }

      const beat = beatRef.current ?? { lastBeatAt: 0, nextBeatAt: 0, coherence: 0 };
      beat.lastBeatAt = clock.lastBeatAt;
      beat.nextBeatAt = clock.nextBeatAt;
      beat.coherence = decayed;
      beat.strength = profile.strength;
      beat.tremor = profile.tremor;
      beat.voice = profile.voice;
      beatRef.current = beat;

      setCoherence((shown) => (Math.abs(shown - decayed) >= 0.02 || (decayed === 0 && shown !== 0) ? decayed : shown));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      beatRef.current = null;
    };
  }, []);

  const press = useCallback(() => {
    pressedAtRef.current = performance.now();
    unlockPulseAudio();
  }, []);

  const strike = useCallback((): PulseStrike => {
    unlockPulseAudio();
    const now = performance.now();
    const pressedAt = pressedAtRef.current;
    pressedAtRef.current = null;
    const at = pressedAt !== null && now - pressedAt <= PRESS_MEMORY_MS ? pressedAt : now;
    const clock = clockRef.current;
    if (!clock) return { judgement: "off-phase", coherence: 0, beatMs: 0 };

    const current = decayCoherence(clock.coherenceAtStrike, at - clock.lastStrikeAt, clock.lastSpan);
    const profile = getPulseProfile(axiomsRef.current, current);
    const sinceLast = at - clock.lastBeatAt;
    const untilNext = clock.nextBeatAt - at;
    const struckNext = untilNext < sinceLast;
    const beat = struckNext ? clock.lastBeatIndex + 1 : clock.lastBeatIndex;
    const beatMs = struckNext ? clock.nextBeatAt - clock.lastBeatAt : clock.lastSpan;
    clock.lastStrikeAt = at;

    // A second strike on a beat that already landed pays the plain manual
    // gain without costing Coherence; excited double-taps are not punished.
    if (beat === clock.judgedBeat) {
      clock.coherenceAtStrike = current;
      playPulseStrike("off-phase", current);
      return { judgement: "off-phase", coherence: current, beatMs };
    }

    // The windows follow the beat: a racing heart gives less room either side.
    const judgement = judgePulseOffset(Math.min(sinceLast, untilNext), getPulseWindows(profile));
    if (judgement !== "off-phase") clock.judgedBeat = beat;
    const updated = nextCoherence(current, judgement);
    clock.coherenceAtStrike = updated;
    setCoherence(updated);
    playPulseStrike(judgement, updated);
    return { judgement, coherence: updated, beatMs };
  }, []);

  return { approachRef, targetRef, beatRef, coherence, press, strike };
}
