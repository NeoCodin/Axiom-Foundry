"use client";

import { useEffect, useState } from "react";
import { HelpTrigger } from "./game-manual";
import type { NullSaturationView } from "./null-saturation-engine";

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
  operationalLoadLabel: string;
  nullSaturation: NullSaturationView;
  showAxioms: boolean;
  showResonance: boolean;
  showOperations: boolean;
  saveStatus: string;
  ready: boolean;
  focusWelcome: boolean;
  focusFlux: boolean;
  objective: HeaderObjective;
  onOpenHelp: () => void;
  onOpenLore: () => void;
  onSave: () => void;
  onOpenDirective: () => void;
  tooltipsEnabled: boolean;
  onToggleTooltips: () => void;
};

export function GameCommandBar({
  worldName, cycle, arrival, fluxLabel, fluxExact, fluxPerSecondLabel,
  axiomsLabel, resonanceLabel, operationalLoadLabel, saveStatus, ready, focusWelcome, focusFlux,
  nullSaturation,
  showAxioms, showResonance, showOperations,
  objective, onOpenHelp, onOpenLore, onSave, onOpenDirective,
  tooltipsEnabled, onToggleTooltips,
}: GameCommandBarProps) {
  // Phone widths hide the desktop metrics/actions cells entirely, so their
  // contents re-home into this sheet behind a compact menu button. Desktop
  // never renders either (both carry the mobile-only class).
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [menuOpen]);
  const closeMenuAnd = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const cycleTooltip = `${worldName} is the Ark's current chapter. Cycle ${cycle} counts this Recalibration run; the line below describes AXIOM's present situation.`;
  const fluxTooltip = `${fluxExact} Local Flux is available. Flux powers fabrication, Ark projects, research support, and planetary work during this cycle.`;
  const objectiveTooltip = "This strip tracks the current planetary objective. Click it to open the relevant destination once that system is awake. It never expires; progress is saved whether the game is open or closed.";
  const metricCount = [showAxioms, showResonance, showOperations, true].filter(Boolean).length;
  const nullTooltip = `${nullSaturation.label} measures how uncertain local physical law has become. Ambient ${nullSaturation.ambient}; the Ark experiences ${nullSaturation.effective} after Lawheart, Research, and local protection. It is a condition, not a resource.`;

  return (
    <header className={`command-bar metric-count-${metricCount} ${focusWelcome || focusFlux ? "tour-focus" : ""}`}>
      <div className="brand-lockup" data-guide-target="command-context" data-pixel-tooltip={cycleTooltip} tabIndex={0} aria-label={cycleTooltip}>
        <span className="brand-mark" aria-hidden="true">◇</span>
        <div><p className="eyebrow">{worldName.toUpperCase()} · CYCLE {cycle}</p><h1>{arrival}</h1></div>
      </div>
      <div className={`resource-readout ${focusFlux ? "tour-focus" : ""}`} data-guide-target="command-flux" data-pixel-tooltip={fluxTooltip} tabIndex={0} aria-label={fluxTooltip}>
        <span className="resource-label">Local Flux</span><strong>{fluxLabel}</strong><span className="rate">+{fluxPerSecondLabel} / sec</span>
      </div>
      <button
        className="mobile-only mobile-menu-button"
        type="button"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close the command menu" : "Open the command menu"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        ☰
      </button>
      {menuOpen && (
        <>
          <button
            className="mobile-only mobile-menu-backdrop"
            type="button"
            aria-label="Close the command menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="mobile-only mobile-menu-sheet" aria-label="Command menu">
            <span className="mobile-menu-save-status">{ready ? saveStatus : "Restoring local cycle…"}</span>
            <div className="mobile-menu-metrics">
              <div className={`null-readout is-${nullSaturation.classification}`}><span>{nullSaturation.label}</span><strong>{nullSaturation.effective}</strong></div>
              {showAxioms && <div><span>Proven Axioms</span><strong>{axiomsLabel}</strong></div>}
              {showResonance && <div><span>Resonance</span><strong>×{resonanceLabel}</strong></div>}
              {showOperations && <div><span>Operations</span><strong>{operationalLoadLabel}</strong></div>}
            </div>
            <div className="mobile-menu-actions">
              <button className="quiet-button" type="button" onClick={closeMenuAnd(onOpenHelp)}>Guide</button>
              <button className={`quiet-button tooltip-toggle ${tooltipsEnabled ? "is-on" : ""}`} type="button" aria-pressed={tooltipsEnabled} onClick={onToggleTooltips}>Hints {tooltipsEnabled ? "ON" : "OFF"}</button>
              <button className="quiet-button" type="button" onClick={closeMenuAnd(onOpenLore)}>Lore archive</button>
              <button className="quiet-button" type="button" onClick={closeMenuAnd(onSave)}>Save now</button>
            </div>
          </div>
        </>
      )}
      {metricCount > 0 && <div className="header-metrics">
        <div className={`null-readout is-${nullSaturation.classification}`} data-pixel-tooltip={nullTooltip} tabIndex={0} aria-label={nullTooltip}><span>{nullSaturation.label}</span><strong>{nullSaturation.effective}</strong></div>
        {showAxioms && <div data-pixel-tooltip="Proven Axioms are portable proofs preserved by Recalibration. They survive new cycles and support lasting upgrades." tabIndex={0} aria-label="Proven Axioms are portable proofs preserved by Recalibration. They survive new cycles and support lasting upgrades."><span>Proven Axioms</span><strong>{axiomsLabel}</strong></div>}
        {showResonance && <div data-pixel-tooltip="Resonance multiplies the whole fabrication chain. Balance adjacent machine tiers in groups of 15 to create stronger links." tabIndex={0} aria-label="Resonance multiplies the whole fabrication chain. Balance adjacent machine tiers in groups of 15 to create stronger links."><span>Resonance</span><strong>×{resonanceLabel}</strong></div>}
        {showOperations && <div data-pixel-tooltip="Operational Load is the share of Foundry output diverted to medical care, automation, restored-world defenses, and temporary hostile interference." tabIndex={0} aria-label="Operational Load is the share of Foundry output diverted to medical care, automation, restored-world defenses, and temporary hostile interference."><span>Operations</span><strong>{operationalLoadLabel}</strong></div>}
      </div>}
      <div className="header-actions">
        <span className="save-status" data-pixel-tooltip="Your progress saves automatically on this device. The timestamp confirms the latest stored state." tabIndex={0} aria-label="Your progress saves automatically on this device. The timestamp confirms the latest stored state.">{ready ? saveStatus : "Restoring local cycle…"}</span>
        <span className="header-tooltip-control" data-pixel-tooltip="Open the Field Manual for this page, resource explanations, and exact next steps."><HelpTrigger label="Open guide for this page" withLabel onClick={onOpenHelp} /></span>
        <button className={`quiet-button tooltip-toggle ${tooltipsEnabled ? "is-on" : ""}`} type="button" aria-pressed={tooltipsEnabled} onClick={onToggleTooltips}>Hints {tooltipsEnabled ? "ON" : "OFF"}</button>
        <button className="quiet-button" type="button" data-pixel-tooltip="Review only the transmissions, contradictions, and historical fragments AXIOM has already discovered." aria-label="Open the discovered Lore Archive" onClick={onOpenLore}>Lore archive</button>
        <button className="quiet-button" type="button" data-pixel-tooltip="Write the current game state to this device immediately. Automatic saving remains active." aria-label="Save progress on this device now" onClick={onSave}>Save now</button>
      </div>
      <div
        className="objective-strip"
        data-guide-target="command-objective"
        data-pixel-tooltip={objectiveTooltip}
        data-tooltip-place="above"
        tabIndex={0}
        role="button"
        aria-label={objectiveTooltip}
        onClick={onOpenDirective}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDirective();
          }
        }}
      >
        <div className="objective-copy">
          <span>{objective.label}</span><span>{objective.currentLabel} / {objective.thresholdLabel} required</span>
          {objective.directiveLabel && <span className="crisis-link">{objective.directiveLabel} · Open directive</span>}
        </div>
        <div className="objective-track" role="progressbar" aria-label={objective.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(objective.progress * 100)}>
          <span style={{ width: `${Math.max(0, Math.min(1, objective.progress)) * 100}%` }} />
        </div>
      </div>
    </header>
  );
}
