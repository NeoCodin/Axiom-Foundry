"use client";

import { HelpTrigger } from "./game-manual";

type HeaderObjective = {
  label: string;
  currentLabel: string;
  thresholdLabel: string;
  progress: number;
  directiveLabel: string | null;
};

type GameCommandBarProps = {
  worldName: string;
  cycle: number;
  arrival: string;
  fluxLabel: string;
  fluxExact: string;
  fluxPerSecondLabel: string;
  axiomsLabel: string;
  resonanceLabel: string;
  saveStatus: string;
  ready: boolean;
  focusWelcome: boolean;
  focusFlux: boolean;
  objective: HeaderObjective;
  onOpenHelp: () => void;
  onOpenLore: () => void;
  onSave: () => void;
  onOpenDirective: () => void;
};

export function GameCommandBar({
  worldName, cycle, arrival, fluxLabel, fluxExact, fluxPerSecondLabel,
  axiomsLabel, resonanceLabel, saveStatus, ready, focusWelcome, focusFlux,
  objective, onOpenHelp, onOpenLore, onSave, onOpenDirective,
}: GameCommandBarProps) {
  return (
    <header className={`command-bar ${focusWelcome || focusFlux ? "tour-focus" : ""}`}>
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">◇</span>
        <div><p className="eyebrow">{worldName.toUpperCase()} · CYCLE {String(cycle).padStart(2, "0")}</p><h1>{arrival}</h1></div>
      </div>
      <div className={`resource-readout ${focusFlux ? "tour-focus" : ""}`} title={`${fluxExact} Flux`}>
        <span className="resource-label">Local Flux</span><strong>{fluxLabel}</strong><span className="rate">+{fluxPerSecondLabel} / sec</span>
      </div>
      <div className="header-metrics">
        <div title="Axioms are portable, permanent laws of physics forged by Recalibration."><span>Axioms</span><strong>{axiomsLabel}</strong></div>
        <div><span>Resonance</span><strong>×{resonanceLabel}</strong></div>
      </div>
      <div className="header-actions">
        <span className="save-status">{ready ? saveStatus : "Restoring local cycle…"}</span>
        <HelpTrigger label="Open guide for this page" withLabel onClick={onOpenHelp} />
        <button className="quiet-button" type="button" onClick={onOpenLore}>Lore archive</button>
        <button className="quiet-button" type="button" onClick={onSave}>Save now</button>
      </div>
      <div className="objective-strip">
        <div className="objective-copy">
          <span>{objective.label}</span><span>{objective.currentLabel} / {objective.thresholdLabel} required</span>
          {objective.directiveLabel && <button className="crisis-link" type="button" onClick={onOpenDirective}>{objective.directiveLabel} · Open directive</button>}
        </div>
        <div className="objective-track" role="progressbar" aria-label={objective.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(objective.progress * 100)}>
          <span style={{ width: `${Math.max(0, Math.min(1, objective.progress)) * 100}%` }} />
        </div>
      </div>
    </header>
  );
}
