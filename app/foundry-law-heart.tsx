"use client";

import { useState } from "react";

import { LawPressCanvas, type LawPressState } from "./law-press-canvas";

type FoundryLawHeartProps = {
  fluxLabel: string;
  manualGainLabel: string;
  manualPulses: number;
  fabricationDepth: number;
  fabricationIntensity: number;
  worldProgress: number;
  onTune: () => void;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function FoundryLawHeart({
  fluxLabel,
  manualGainLabel,
  manualPulses,
  fabricationDepth,
  fabricationIntensity,
  worldProgress,
  onTune,
}: FoundryLawHeartProps) {
  const [pulseSerial, setPulseSerial] = useState(0);
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
          <h3 id="foundry-law-heart-title">The motion that drives the fabrication chain</h3>
          <p>Strike the center for a manual pulse. Vacuum Taps and later mechanisms repeat that motion automatically, including while the game is closed.</p>
        </div>
      </header>
      <div className="foundry-law-heart-body">
        <button
          className="foundry-law-heart-machine"
          type="button"
          onClick={handleTune}
          aria-label={`Strike the Law-Heart for ${manualGainLabel} Flux`}
          data-pixel-tooltip={`Strike the Law-Heart for ${manualGainLabel} Flux. Built mechanisms automate the same motion.`}
        >
          <LawPressCanvas
            state={state}
            machineCount={fabricationIntensity}
            manualPulses={manualPulses}
            pulseSerial={pulseSerial}
            recalibrationProgress={clamp(worldProgress)}
            provenLaws={Math.min(3, fabricationDepth)}
            preparingRecalibration={false}
          />
          <span className="foundry-law-heart-readout">
            <small>STRIKE LAW</small>
            <strong>{fluxLabel}</strong>
            <em>+{manualGainLabel}</em>
          </span>
          {pulseSerial > 0 && <span className="foundry-law-heart-gain" key={`foundry-law-gain-${pulseSerial}`} aria-hidden="true">+{manualGainLabel}</span>}
        </button>
      </div>
    </section>
  );
}
