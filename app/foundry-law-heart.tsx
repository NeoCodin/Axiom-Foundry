"use client";

import { useState } from "react";

import { getLawHeartSpectrum, LawPressCanvas, type LawHeartTier, type LawPressState } from "./law-heart-particle-field";

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
  worldProgress: number;
  onTune: () => void;
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
  worldProgress,
  onTune,
}: FoundryLawHeartProps) {
  const [pulseSerial, setPulseSerial] = useState(0);
  const spectrum = getLawHeartSpectrum(lifetimeAxioms);
  const fabricationIntensity = tiers.reduce((total, tier) => total + tier.count, 0);
  const state: LawPressState = fabricationIntensity >= 150
    ? "synchronized"
    : fabricationIntensity >= 50
      ? "rapid"
      : fabricationIntensity >= 15
        ? "active"
        : fabricationIntensity > 0
          ? "warming"
          : "manual";

  const handleTune = () => {
    setPulseSerial((current) => current + 1);
    onTune();
  };

  return (
    <section className={`foundry-law-heart is-${state}`} data-guide-target="foundry-law-heart" aria-label="Law-Heart fabrication reactor">
      <div className="foundry-law-heart-body">
        <button
          className="foundry-law-heart-machine"
          type="button"
          onClick={handleTune}
          aria-label={`Strike the Law-Heart for ${manualGainLabel} Flux`}
          data-pixel-tooltip={`${spectrum.name}. Strike for ${manualGainLabel} Flux. Vacuum Taps add cyan motes, stored Flux thickens the field, production drives its turbulence, and permanent Axioms alter the star's spectrum.`}
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
          />
          <span className="foundry-law-heart-readout">
            <small>LOCAL FLUX</small>
            <strong>{fluxLabel}</strong>
            <em>STRIKE LAW +{manualGainLabel}</em>
          </span>
          <span className="foundry-law-heart-rate"><small>FIELD VELOCITY</small><strong>{fluxPerSecondLabel}/sec</strong></span>
          <span className="foundry-law-heart-axiom-count"><strong>{lifetimeAxiomsLabel}</strong><small> LIFETIME AXIOMS</small></span>
          {pulseSerial > 0 && <span className="foundry-law-heart-gain" key={`foundry-law-gain-${pulseSerial}`} aria-hidden="true">+{manualGainLabel}</span>}
        </button>
      </div>
    </section>
  );
}
