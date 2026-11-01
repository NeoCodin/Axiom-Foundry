"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  decayCoherence,
  getBeatIntervalMs,
  getPulseProfile,
  judgePulseOffset,
  nextCoherence,
  type PulseJudgement,
} from "./law-heart-pulse";

export type PulseStrike = {
  judgement: PulseJudgement;
  coherence: number;
};

type PulseClock = {
  lastBeatIndex: number;
  lastBeatAt: number;
  nextBeatAt: number;
  judgedBeat: number;
  lastStrikeAt: number;
  coherenceAtStrike: number;
};

/** A tap is timed from the moment the finger or button lands, not from release. */
const PRESS_MEMORY_MS = 600;

export function useLawHeartPulse(lifetimeAxioms: number) {
  const profile = useMemo(() => getPulseProfile(lifetimeAxioms), [lifetimeAxioms]);
  const approachRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<PulseClock | null>(null);
  const pressedAtRef = useRef<number | null>(null);
  const [coherence, setCoherence] = useState(0);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      let clock = clockRef.current;
      // First frame, or the tab was hidden long enough that frames stopped:
      // restart the rhythm instead of replaying every missed beat.
      if (!clock || now - clock.nextBeatAt > profile.periodMs * 2) {
        clock = {
          lastBeatIndex: 0,
          lastBeatAt: now,
          nextBeatAt: now + getBeatIntervalMs(profile, 1),
          judgedBeat: -1,
          lastStrikeAt: clock?.lastStrikeAt ?? 0,
          coherenceAtStrike: clock?.coherenceAtStrike ?? 0,
        };
        clockRef.current = clock;
      }
      while (now >= clock.nextBeatAt) {
        clock.lastBeatIndex += 1;
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
      setCoherence((shown) => (Math.abs(shown - decayed) >= 0.02 || (decayed === 0 && shown !== 0) ? decayed : shown));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [profile]);

  const press = useCallback(() => {
    pressedAtRef.current = performance.now();
  }, []);

  const strike = useCallback((): PulseStrike => {
    const now = performance.now();
    const pressedAt = pressedAtRef.current;
    pressedAtRef.current = null;
    const at = pressedAt !== null && now - pressedAt <= PRESS_MEMORY_MS ? pressedAt : now;
    const clock = clockRef.current;
    if (!clock) return { judgement: "off-phase", coherence: 0 };

    const current = decayCoherence(clock.coherenceAtStrike, at - clock.lastStrikeAt, profile.periodMs);
    const sinceLast = at - clock.lastBeatAt;
    const untilNext = clock.nextBeatAt - at;
    const beat = untilNext < sinceLast ? clock.lastBeatIndex + 1 : clock.lastBeatIndex;
    clock.lastStrikeAt = at;

    // A second strike on a beat that already landed pays the plain manual
    // gain without costing Coherence; excited double-taps are not punished.
    if (beat === clock.judgedBeat) {
      clock.coherenceAtStrike = current;
      return { judgement: "off-phase", coherence: current };
    }

    const judgement = judgePulseOffset(Math.min(sinceLast, untilNext));
    if (judgement !== "off-phase") clock.judgedBeat = beat;
    const updated = nextCoherence(current, judgement);
    clock.coherenceAtStrike = updated;
    setCoherence(updated);
    return { judgement, coherence: updated };
  }, [profile]);

  return { approachRef, targetRef, coherence, press, strike };
}
