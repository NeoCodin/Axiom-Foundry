"use client";

import { useState } from "react";
import type { PurchaseMode } from "./game-engine";
import { LawPressCanvas, type LawPressState } from "./law-press-canvas";

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
  stageIndex: number;
  stageCount: number;
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
const LAW_PURPOSES = [
  "Keeps the hull, its passengers, and their identities intact under pressure.",
  "Keeps air, water, power, and momentum from changing without a cause.",
  "Keeps departure, passage, and arrival inside one continuous history.",
] as const;
const APPROACH_SYSTEMS = [
  { name: "Guidance", detail: "Pelagos orbit solution", threshold: 0.34 },
  { name: "Life support", detail: "Sealed quarters wakeup", threshold: 0.67 },
  { name: "Braking grid", detail: "Orbital insertion control", threshold: 1 },
] as const;

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function AxiomLawHeart({
  fluxLabel,
  fluxPerSecondLabel,
  manualGainLabel,
  manualPulses,
  stageIndex,
  stageCount,
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
  const recalibrationVisible = stageIndex >= 3 || lifetimeAxioms > 0;
  const fabricationAuthorized = stageIndex >= 1;
  const provenLawCount = Math.max(0, Math.min(3, stageIndex - 3));
  const pressState: LawPressState = recalibrationVisible && recalibrationGain > 0
    ? "law-ready"
    : machine.bought >= 25
      ? "synchronized"
    : machine.bought >= 15
      ? "rapid"
      : machine.bought >= 5
        ? "active"
        : machine.bought > 0
          ? "warming"
          : manualPulses > 0
            ? "manual"
            : "dormant";
  const pressStatus = pressState === "law-ready"
    ? "LAW READY"
    : pressState === "synchronized"
      ? "SYNCHRONIZED"
      : pressState.toUpperCase();
  const approachProgress = stageIndex > 2
    ? 1
    : stageIndex === 2
      ? clamp(objectiveProgress)
      : 0;
  const headingCopy = stageIndex === 0
    ? "One damaged law press remains. Strike it by hand and wake the caretaker bus."
    : stageIndex === 1
      ? "The press is awake. Teach the Ark to repeat its smallest stable motion."
      : stageIndex === 2
        ? "Automation is stable. Route its output into the systems required for Pelagos approach."
        : stageIndex <= 5
          ? "The Ark can move, but it cannot survive insertion until three physical laws endure Recalibration."
          : "All three laws are portable. Build the final reserve and authorize Pelagos approach.";
  const objectiveProgressLabel = stageIndex >= 3 && stageIndex <= 5
    ? "proof charged"
    : "synchronized";

  const tune = () => {
    setPulseSerial((value) => value + 1);
    onTune();
  };

  const recalibrate = () => {
    onRecalibrate();
    setConfirmRecalibration(false);
  };

  return (
    <section className={`law-heart-deck is-${pressState}`} aria-labelledby="law-heart-title">
      <header className="law-heart-heading">
        <div>
          <span>CORE DECK // COLD WAKE</span>
          <h2 id="law-heart-title">AXIOM LAW-HEART</h2>
          <p>{headingCopy}</p>
        </div>
        <div className="law-heart-status" aria-label="Core status">
          <span>{pressStatus}</span>
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
          aria-label={`Strike the Axiom Law Press for ${manualGainLabel} Flux`}
          data-pixel-tooltip={`Drive the Law Press clamps inward once. Each strike produces ${manualGainLabel} Flux and teaches AXIOM a motion that Vacuum Taps can repeat.`}
        >
          <LawPressCanvas
            state={pressState}
            machineCount={machine.bought}
            manualPulses={manualPulses}
            pulseSerial={pulseSerial}
            recalibrationProgress={recalibrationProgress}
            provenLaws={provenLawCount}
            preparingRecalibration={confirmRecalibration}
          />
          <span className="law-heart-readout">
            <small>STRIKE LAW</small>
            <strong>{fluxLabel}</strong>
            <em>+{manualGainLabel}</em>
          </span>
          {pulseSerial > 0 && <span className="law-heart-click-gain" key={`gain-${pulseSerial}`} aria-hidden="true">+{manualGainLabel}</span>}
          <span className="law-press-state" aria-hidden="true">
            {machine.bought > 0 ? `${Math.min(16, Math.ceil(machine.bought / 3))} tap banks linked` : manualPulses > 0 ? "manual strike registered" : "press motion: idle"}
          </span>
        </button>

        <aside className="law-heart-directive">
          <span>ACTIVE DIRECTIVE // PHASE {stageIndex + 1} / {stageCount}</span>
          <h3>{objectiveLabel}</h3>
          <p>{objectiveDetail}</p>
          <div className="law-segment-track" role="progressbar" aria-label={objectiveLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamp(objectiveProgress) * 100)}>
            <i style={{ width: `${clamp(objectiveProgress) * 100}%` }} />
          </div>
          <strong>{Math.round(clamp(objectiveProgress) * 100)}% {objectiveProgressLabel}</strong>
          {stageIndex >= 2 && (
            <div className="law-approach-systems" aria-label="Pelagos approach systems">
              {APPROACH_SYSTEMS.map((system) => {
                const online = approachProgress >= system.threshold;
                return (
                  <div className={online ? "is-online" : ""} key={system.name}>
                    <i aria-hidden="true" />
                    <span><strong>{system.name}</strong><small>{system.detail}</small></span>
                    <b>{online ? "ONLINE" : "ROUTING"}</b>
                  </div>
                );
              })}
            </div>
          )}
          {contribution && (
            <div className="law-heart-contribution">
              <p><strong>{contribution.availableLabel} available</strong><span>{contribution.remainingLabel} still required</span></p>
              <small>Every commitment is permanent and counts toward approach, but committed Flux cannot buy more Taps. Keep enough in the Foundry to preserve the production pace you want.</small>
              <button type="button" disabled={!contribution.canContribute} onClick={onContribute}>
                {contribution.canContribute ? `COMMIT ${contribution.divertLabel} FLUX` : "KEEP PRODUCING FLUX"}
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
              <p>A Vacuum Tap repeats the press’s smallest motion. Installed units populate the surrounding hardware banks, route visible Flux packets, and add permanent idle output for this cycle.</p>
              {!fabricationAuthorized && <p className="law-authorization-note">Complete all 12 manual strikes before AXIOM may fabricate the first Tap.</p>}
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
                  {!fabricationAuthorized ? "AWAITING STRIKE 12" : `BUILD ${buyMode === "max" ? machine.quantity > 0 ? `x${machine.quantity}` : "MAX" : buyMode === "10" ? "x10" : "x1"}`}
                </button>
              </div>
            </>
          ) : (
            <p>Tune the chamber a few times. AXIOM will isolate the rhythm that a machine can repeat.</p>
          )}
        </section>

        <section className={`law-heart-axioms ${recalibrationVisible ? "is-revealed" : "is-veiled"}`}>
          <header><div><span>PORTABLE PHYSICS</span><h3>{recalibrationVisible ? "Three laws for Pelagos" : "Signal encrypted"}</h3></div><strong>{provenLawCount}/3</strong></header>
          {recalibrationVisible ? (
            <>
              <div className="law-slot-grid">
                {LAW_NAMES.map((name, index) => (
                  <div className={`${stageIndex > index + 3 ? "is-proven" : ""} ${stageIndex === index + 3 ? "is-active" : ""}`} key={name}>
                    <span>0{index + 1}</span><strong>{name}</strong><small>{stageIndex > index + 3 ? "STABLE" : stageIndex === index + 3 ? "ACTIVE PROOF" : "UNPROVEN"}</small>
                    <p>{LAW_PURPOSES[index]}</p>
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
