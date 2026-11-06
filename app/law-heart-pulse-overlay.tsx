"use client";

import { useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { isPulseAudioEnabled, setPulseAudioEnabled, subscribePulseAudio } from "./law-heart-audio";
import type { PulseJudgement } from "./law-heart-pulse";

/** Per-device game sound switch (heartbeat and interface); server render assumes on, then the stored choice takes over. */
export function PulseSoundToggle({ className = "" }: { className?: string }) {
  const enabled = useSyncExternalStore(subscribePulseAudio, isPulseAudioEnabled, () => true);
  return (
    <button
      className={`law-pulse-sound ${enabled ? "is-on" : ""} ${className}`}
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Mute game sound" : "Turn on game sound"}
      onClick={() => setPulseAudioEnabled(!enabled)}
    >
      Sound {enabled ? "on" : "off"}
    </button>
  );
}

export const PULSE_JUDGEMENT_LABEL: Record<PulseJudgement, string | null> = {
  coherent: "Coherent",
  "in-phase": "In phase",
  "off-phase": null,
};

type LawHeartPulseOverlayProps = {
  approachRef: RefObject<HTMLSpanElement | null>;
  targetRef: RefObject<HTMLSpanElement | null>;
  coherence: number;
};

/** Target ring on the heart and an approach ring that closes on each beat. */
export function LawHeartPulseOverlay({ approachRef, targetRef, coherence }: LawHeartPulseOverlayProps) {
  return (
    <span
      className="law-pulse-overlay"
      style={{ "--pulse-coherence": coherence.toFixed(2) } as CSSProperties}
      aria-hidden="true"
    >
      <span className="law-pulse-target" ref={targetRef} />
      <span className="law-pulse-approach" ref={approachRef} />
    </span>
  );
}

/** Until the first on-beat strike, the meter's slot teaches the timing instead. */
export function LawHeartCoherenceMeter({ coherence, showHint }: { coherence: number; showHint: boolean }) {
  if (showHint) {
    return <span className="law-pulse-coherence is-hint"><small>Strike as the ring closes</small></span>;
  }
  const percent = Math.round(Math.min(1, Math.max(0, coherence)) * 100);
  return (
    <span className={`law-pulse-coherence ${percent > 0 ? "is-charged" : ""}`}>
      <small>Coherence</small>
      <i><b style={{ width: `${percent}%` }} /></i>
      <strong>{percent}%</strong>
    </span>
  );
}
