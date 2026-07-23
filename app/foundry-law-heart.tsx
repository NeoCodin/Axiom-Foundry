"use client";

import { useState } from "react";

import { LawPressCanvas, type LawHeartTier, type LawPressState } from "./law-press-canvas";

type FoundryLawHeartTier = LawHeartTier & {
  name: string;
};

type FoundryLawHeartProps = {
  flux: number;
  fluxLabel: string;
  fluxPerSecond: number;
  fluxPerSecondLabel: string;
  manualGain: number;
  manualGainLabel: string;
  manualPulses: number;
  lifetimeAxioms: number;
  tiers: readonly FoundryLawHeartTier[];
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
  tiers,
  worldProgress,
  onTune,
}: FoundryLawHeartProps) {
  const [pulseSerial, setPulseSerial] = useState(0);
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
    <section className={`foundry-law-heart is-${state}`} data-guide-target="foundry-law-heart" aria-labelledby="foundry-law-heart-title">
      <header>
        <div>
          <span>LAW-HEART // FOUNDRY CORE</span>
          <h3 id="foundry-law-heart-title">A visible history of the fabrication chain</h3>
          <p>Stored Flux forms the particle field. Production drives its speed, every mechanism builds a colored orbit, and permanent Axioms reshape the heart.</p>
        </div>
      </header>
      <div className="foundry-law-heart-body">
        <button
          className="foundry-law-heart-machine"
          type="button"
          onClick={handleTune}
          aria-label={`Strike the Law-Heart for ${manualGainLabel} Flux`}
          data-pixel-tooltip={`Strike for ${manualGainLabel} Flux. Cyan particles show stored Flux; orbit speed follows production; colored structures show the mechanisms you built; gold facets survive Recalibration.`}
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
          <span className="foundry-law-heart-axiom-count"><strong>{lifetimeAxioms}</strong><small> LIFETIME AXIOMS</small></span>
          {pulseSerial > 0 && <span className="foundry-law-heart-gain" key={`foundry-law-gain-${pulseSerial}`} aria-hidden="true">+{manualGainLabel}</span>}
        </button>
        <div className="law-heart-spectrum" aria-label="Active fabrication colors">
          {tiers.map((tier, index) => tier.count > 0 && (
            <span className={`is-tier-${index}`} key={tier.name}><i aria-hidden="true" />{tier.name}<strong>{tier.count}</strong></span>
          ))}
        </div>
      </div>
    </section>
  );
}
