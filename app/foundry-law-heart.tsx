"use client";

import { useState } from "react";

import { formatNumber } from "./game-engine";
import { getResonantFlux, type PulseJudgement } from "./law-heart-pulse";
import { LawHeartCoherenceMeter, LawHeartPulseOverlay, PULSE_JUDGEMENT_LABEL, PulseSoundToggle } from "./law-heart-pulse-overlay";
import {
  getLawHeartSpectrum,
  LawPressCanvas,
  type LawHeartDroneFrame,
  type LawHeartQaOverride,
  type LawHeartTier,
  type LawPressState,
} from "./law-heart-particle-field";
import { useLawHeartPulse, type PulseStrike } from "./use-law-heart-pulse";

type FoundryLawHeartProps = {
  flux: number;
  fluxLabel: string;
  fluxPerSecond: number;
  fluxPerSecondLabel: string;
  manualGain: number;
  manualGainLabel: string;
  manualPulses: number;
  lifetimeAxioms: number;
  lifetimeAxiomsLabel: string;
  tiers: readonly LawHeartTier[];
  droneFrames: readonly LawHeartDroneFrame[];
  worldProgress: number;
  qaOverride?: LawHeartQaOverride;
  onTune: (strike: PulseStrike) => void;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function FoundryLawHeart({
  flux,
  fluxLabel,
  fluxPerSecond,
  fluxPerSecondLabel,
  manualGain,
  manualGainLabel,
  manualPulses,
  lifetimeAxioms,
  lifetimeAxiomsLabel,
  tiers,
  droneFrames,
  worldProgress,
  qaOverride,
  onTune,
}: FoundryLawHeartProps) {
  const [pulseSerial, setPulseSerial] = useState(0);
  const [lastStrike, setLastStrike] = useState<{ judgement: PulseJudgement; amountLabel: string } | null>(null);
  const [resonated, setResonated] = useState(false);
  const spectrumAxioms = qaOverride?.enabled ? qaOverride.spectrumAxioms : lifetimeAxioms;
  const spectrum = getLawHeartSpectrum(spectrumAxioms);
  const pulse = useLawHeartPulse(spectrumAxioms);
  const fabricationIntensity = tiers.reduce((total, tier) => total + tier.count, 0);
  const liveState: LawPressState = fabricationIntensity >= 150
    ? "synchronized"
    : fabricationIntensity >= 50
      ? "rapid"
      : fabricationIntensity >= 15
        ? "active"
        : fabricationIntensity > 0
          ? "warming"
          : "manual";
  const state: LawPressState =
    qaOverride?.enabled && qaOverride.state !== "live"
      ? qaOverride.state
      : liveState;

  const handleTune = () => {
    const strike = pulse.strike();
    const amount = manualGain + getResonantFlux({ ...strike, manualGain, fluxPerSecond });
    setLastStrike({ judgement: strike.judgement, amountLabel: formatNumber(amount) });
    if (strike.judgement !== "off-phase") setResonated(true);
    setPulseSerial((current) => current + 1);
    onTune(strike);
  };

  return (
    <section className={`foundry-law-heart is-${state}`} data-guide-target="foundry-law-heart" aria-label="Law-Heart fabrication reactor">
      <div className="foundry-law-heart-body">
        <button
          className="foundry-law-heart-machine"
          type="button"
          onPointerDown={pulse.press}
          onClick={handleTune}
          aria-label={`Strike the Law-Heart for ${manualGainLabel} Flux. Strikes on the beat release a resonant bonus.`}
          data-pixel-tooltip={`${spectrum.name}. Strike for ${manualGainLabel} Flux. Strike as the ring closes to land on the beat: on-beat strikes release part of current output and build Coherence. Fabrication mechanisms shape the particle field, permanent Axioms alter the stellar spectrum, and assigned utility drones appear as colored service craft in the outer void.`}
        >
          <LawPressCanvas
            state={state}
            flux={flux}
            fluxPerSecond={fluxPerSecond}
            manualGain={manualGain}
            lifetimeAxioms={lifetimeAxioms}
            tiers={tiers}
            manualPulses={manualPulses}
            pulseSerial={pulseSerial}
            recalibrationProgress={clamp(worldProgress)}
            provenLaws={Math.min(3, lifetimeAxioms)}
            preparingRecalibration={false}
            droneFrames={droneFrames}
            qaOverride={qaOverride}
            beat={pulse.beatRef}
          />
          <LawHeartPulseOverlay approachRef={pulse.approachRef} targetRef={pulse.targetRef} coherence={pulse.coherence} />
          <span className="foundry-law-heart-readout">
            <small>LOCAL FLUX</small>
            <strong>{fluxLabel}</strong>
            <em>STRIKE LAW +{manualGainLabel}</em>
            <LawHeartCoherenceMeter coherence={pulse.coherence} showHint={!resonated} />
          </span>
          <span className="foundry-law-heart-rate"><small>FIELD VELOCITY</small><strong>{fluxPerSecondLabel}/sec</strong></span>
          <span className="foundry-law-heart-axiom-count"><strong>{lifetimeAxiomsLabel}</strong><small> PROVEN AXIOMS</small></span>
          {pulseSerial > 0 && lastStrike && (
            <span className={`foundry-law-heart-gain is-${lastStrike.judgement}`} key={`foundry-law-gain-${pulseSerial}`} aria-hidden="true">
              {PULSE_JUDGEMENT_LABEL[lastStrike.judgement] && <b>{PULSE_JUDGEMENT_LABEL[lastStrike.judgement]}</b>}
              +{lastStrike.amountLabel}
            </span>
          )}
        </button>
        <PulseSoundToggle className="is-floating" />
      </div>
    </section>
  );
}
