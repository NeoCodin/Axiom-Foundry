"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { PurchaseMode } from "./game-engine";

export type LawHeartMachine = {
  name: string;
  shortName: string;
  bought: number;
  outputLabel: string;
  costLabel: string;
  quantity: number;
  canBuy: boolean;
  unlocked: boolean;
};

type AxiomLawHeartProps = {
  fluxLabel: string;
  fluxPerSecondLabel: string;
  manualGainLabel: string;
  manualPulses: number;
  maxFlux: number;
  stageIndex: number;
  objectiveLabel: string;
  objectiveDetail: string;
  objectiveProgress: number;
  machine: LawHeartMachine;
  buyMode: PurchaseMode;
  lifetimeAxioms: number;
  recalibrationGain: number;
  recalibrationThresholdLabel: string;
  recalibrationProgress: number;
  contribution: {
    availableLabel: string;
    remainingLabel: string;
    divertLabel: string;
    canContribute: boolean;
  } | null;
  onTune: () => void;
  onBuy: () => void;
  onSetBuyMode: (mode: PurchaseMode) => void;
  onRecalibrate: () => void;
  onContribute: () => void;
};

const LAW_NAMES = ["Containment", "Conservation", "Transit"] as const;

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function AxiomLawHeart({
  fluxLabel,
  fluxPerSecondLabel,
  manualGainLabel,
  manualPulses,
  maxFlux,
  stageIndex,
  objectiveLabel,
  objectiveDetail,
  objectiveProgress,
  machine,
  buyMode,
  lifetimeAxioms,
  recalibrationGain,
  recalibrationThresholdLabel,
  recalibrationProgress,
  contribution,
  onTune,
  onBuy,
  onSetBuyMode,
  onRecalibrate,
  onContribute,
}: AxiomLawHeartProps) {
  const [pulseSerial, setPulseSerial] = useState(0);
  const [confirmRecalibration, setConfirmRecalibration] = useState(false);
  const automationVisible = manualPulses >= 6 || machine.bought > 0;
  const recalibrationVisible = maxFlux >= 10_000 || lifetimeAxioms > 0;
  const pulseBand = machine.bought >= 25
    ? "phase-lock"
    : machine.bought >= 15
      ? "rapid"
      : machine.bought >= 5
        ? "active"
        : machine.bought > 0
          ? "warming"
          : manualPulses > 0
            ? "manual"
            : "dormant";
  const particleCount = pulseBand === "phase-lock" ? 48 : pulseBand === "rapid" ? 36 : pulseBand === "active" ? 24 : pulseBand === "warming" ? 12 : 6;
  const chamberStyle = {
    "--law-progress": clamp(objectiveProgress),
    "--law-recalibration": clamp(recalibrationProgress),
    "--law-pulse-duration": `${Math.max(0.34, 3.2 - machine.bought * 0.105)}s`,
  } as CSSProperties;
  const particles = useMemo(
    () => Array.from({ length: 48 }, (_, index) => index),
    [],
  );

  const tune = () => {
    setPulseSerial((value) => value + 1);
    onTune();
  };

  const recalibrate = () => {
    onRecalibrate();
    setConfirmRecalibration(false);
  };

  return (
    <section className={`law-heart-deck is-${pulseBand}`} style={chamberStyle} aria-labelledby="law-heart-title">
      <header className="law-heart-heading">
        <div>
          <span>CORE DECK // COLD WAKE</span>
          <h2 id="law-heart-title">AXIOM LAW-HEART</h2>
          <p>One chamber is awake. Teach it to repeat before the Ark learns anything else.</p>
        </div>
        <div className="law-heart-status" aria-label="Core status">
          <span>{pulseBand === "phase-lock" ? "PHASE LOCK" : pulseBand.toUpperCase()}</span>
          <strong>{fluxPerSecondLabel}<small> Flux / sec</small></strong>
        </div>
      </header>

      <div className="law-heart-stage">
        <div className="law-heart-vessel" aria-hidden="true">
          <span className="law-hull law-hull-left" />
          <span className="law-hull law-hull-right" />
          <span className="law-conduit law-conduit-top" />
          <span className="law-conduit law-conduit-bottom" />
          <span className="law-heart-grid" />
        </div>

        <button
          className="law-heart-core"
          type="button"
          onClick={tune}
          aria-label={`Tune the Axiom Law-Heart for ${manualGainLabel} Flux`}
          data-pixel-tooltip={`Compress the Law-Heart once. Each manual alignment produces ${manualGainLabel} Flux and teaches AXIOM the chamber's rhythm.`}
        >
          <span className="law-heart-ring ring-outer"><i /><i /><i /><i /></span>
          <span className="law-heart-ring ring-middle"><i /><i /><i /><i /></span>
          <span className="law-heart-ring ring-inner"><i /><i /><i /><i /></span>
          <span className="law-heart-aperture"><i /></span>
          <span className="law-heart-readout">
            <small>TUNE LAW</small>
            <strong>{fluxLabel}</strong>
            <em>+{manualGainLabel}</em>
          </span>
          <span className="law-heart-particle-field" aria-hidden="true">
            {particles.map((index) => (
              <i
                className={index < particleCount ? "is-live" : ""}
                key={index}
                style={{ "--particle-index": index } as CSSProperties}
              />
            ))}
          </span>
          {pulseSerial > 0 && <span className="law-heart-click-wave" key={`wave-${pulseSerial}`} aria-hidden="true" />}
          {pulseSerial > 0 && <span className="law-heart-click-gain" key={`gain-${pulseSerial}`} aria-hidden="true">+{manualGainLabel}</span>}
          {pulseBand === "phase-lock" && <span className="law-heart-phase-band" aria-hidden="true"><i /><i /><i /></span>}
        </button>

        <aside className="law-heart-directive">
          <span>ACTIVE DIRECTIVE // PHASE {stageIndex + 1}</span>
          <h3>{objectiveLabel}</h3>
          <p>{objectiveDetail}</p>
          <div className="law-segment-track" role="progressbar" aria-label={objectiveLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(objectiveProgress) * 100)}>
            <i style={{ width: `${clamp(objectiveProgress) * 100}%` }} />
          </div>
          <strong>{Math.round(clamp(objectiveProgress) * 100)}% synchronized</strong>
          {contribution && (
            <div className="law-heart-contribution">
              <p><strong>{contribution.availableLabel} available</strong><span>{contribution.remainingLabel} still required</span></p>
              <small>You do not need all 15,000 Flux at once. Divert what you have now; every payment is saved and counts toward the same total.</small>
              <button type="button" disabled={!contribution.canContribute} onClick={onContribute}>
                {contribution.canContribute ? `DIVERT ${contribution.divertLabel} FLUX NOW` : "KEEP PRODUCING FLUX"}
              </button>
            </div>
          )}
          <small>No timer. The Ark continues producing while this page is closed.</small>
        </aside>
      </div>

      <div className="law-heart-controls">
        <section className={`law-heart-automation ${automationVisible ? "is-revealed" : "is-veiled"}`}>
          <header>
            <div><span>FIRST AUTOMATION</span><h3>{automationVisible ? machine.name : "Signal unresolved"}</h3></div>
            {automationVisible && <strong>{machine.bought}<small> built</small></strong>}
          </header>
          {automationVisible ? (
            <>
              <p>A Vacuum Tap repeats the chamber’s smallest motion. Every unit adds visible pulses and permanent idle output for this cycle.</p>
              <div className="law-machine-telemetry">
                <span>Output <strong>{machine.outputLabel}/sec</strong></span>
                <span>Next unit <strong>{machine.costLabel} Flux</strong></span>
              </div>
              <div className="law-purchase-row">
                <div className="law-buy-modes" role="group" aria-label="Vacuum Tap purchase quantity">
                  <button type="button" className={buyMode === "1" ? "active" : ""} aria-pressed={buyMode === "1"} onClick={() => onSetBuyMode("1")}>x1</button>
                  <button type="button" className={buyMode === "10" ? "active" : ""} aria-pressed={buyMode === "10"} disabled={machine.bought < 10} onClick={() => onSetBuyMode("10")}>x10</button>
                  <button type="button" className={buyMode === "max" ? "active" : ""} aria-pressed={buyMode === "max"} disabled={lifetimeAxioms < 1} onClick={() => onSetBuyMode("max")}>MAX</button>
                </div>
                <button className="law-build-button" type="button" disabled={!machine.canBuy} onClick={onBuy}>
                  BUILD {buyMode === "max" ? machine.quantity > 0 ? `x${machine.quantity}` : "MAX" : buyMode === "10" ? "x10" : "x1"}
                </button>
              </div>
            </>
          ) : (
            <p>Tune the chamber a few times. AXIOM will isolate the rhythm that a machine can repeat.</p>
          )}
        </section>

        <section className={`law-heart-axioms ${recalibrationVisible ? "is-revealed" : "is-veiled"}`}>
          <header><div><span>PORTABLE PHYSICS</span><h3>{recalibrationVisible ? "Three laws for Pelagos" : "Signal encrypted"}</h3></div><strong>{Math.min(3, lifetimeAxioms)}/3</strong></header>
          {recalibrationVisible ? (
            <>
              <div className="law-slot-grid">
                {LAW_NAMES.map((name, index) => (
                  <div className={lifetimeAxioms > index ? "is-proven" : ""} key={name}>
                    <span>0{index + 1}</span><strong>{name}</strong><small>{lifetimeAxioms > index ? "STABLE" : "UNPROVEN"}</small>
                  </div>
                ))}
              </div>
              <div className="law-recalibration-meter">
                <span><strong>{recalibrationGain > 0 ? `${recalibrationGain} Axiom ready` : "Recalibration charging"}</strong><small>Target {recalibrationThresholdLabel} run Flux</small></span>
                <div className="law-segment-track" role="progressbar" aria-label="Recalibration stability" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(recalibrationProgress) * 100)}><i style={{ width: `${clamp(recalibrationProgress) * 100}%` }} /></div>
              </div>
              {!confirmRecalibration ? (
                <button className="law-recalibrate-button" type="button" disabled={recalibrationGain < 1} onClick={() => setConfirmRecalibration(true)}>
                  {recalibrationGain > 0 ? "PREPARE RECALIBRATION" : "LAW NOT YET STABLE"}
                </button>
              ) : (
                <div className="law-confirm-row">
                  <button className="law-recalibrate-button" type="button" onClick={recalibrate}>BEGIN NEXT CYCLE</button>
                  <button type="button" onClick={() => setConfirmRecalibration(false)}>CANCEL</button>
                </div>
              )}
              <p className="law-reset-warning">Recalibration resets this cycle’s Flux and machines. Proven Axioms and completed Cold Wake work survive.</p>
            </>
          ) : (
            <p>Build a repeating fabrication rhythm. The chamber will reveal how to carry a law through a reset.</p>
          )}
        </section>
      </div>
    </section>
  );
}
