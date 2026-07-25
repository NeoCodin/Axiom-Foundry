"use client";

import { useState, type FormEvent } from "react";

import { CAMPAIGN_WORLD_IDS, getCampaignWorld } from "./campaign-content";
import {
  DEFAULT_LAW_HEART_QA_OVERRIDE,
  LAW_HEART_SPECTRA,
  type LawHeartQaEventKind,
  type LawHeartQaOverride,
  type LawPressState,
} from "./law-heart-particle-field";

type QaSandboxProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onJumpWorld: (worldIndex: number) => void;
  onJumpTransit: (originWorldIndex: number) => void;
  onFreshPlayerOpening: () => void;
  onReplayPlanetIntroduction: () => void;
  onReplayPelagosIntroduction: () => void;
  onReplayResearchIntroduction: () => void;
  onGrantResources: () => void;
  onAddFlux: (amount: number) => void;
  onSetAxioms: (amount: number) => void;
  lawHeartOverride: LawHeartQaOverride;
  onLawHeartOverrideChange: (override: LawHeartQaOverride) => void;
  onTriggerLawHeartEvent: (kind: LawHeartQaEventKind) => void;
  onOpenLawHeart: () => void;
  onResetResearch: () => void;
  onStockResearchEvidence: () => void;
  onFillResearchLattice: () => void;
  onCompleteActiveResearch: () => void;
  onCompleteResearch: () => void;
  onBoostCrew: () => void;
  onPrepareContinuity: () => void;
  onSimulateOfflineDay: () => void;
  onReturnToPlayerSave: () => void;
};

export function QaSandbox({
  collapsed,
  onToggleCollapsed,
  onJumpWorld,
  onJumpTransit,
  onFreshPlayerOpening,
  onReplayPlanetIntroduction,
  onReplayPelagosIntroduction,
  onReplayResearchIntroduction,
  onGrantResources,
  onAddFlux,
  onSetAxioms,
  lawHeartOverride,
  onLawHeartOverrideChange,
  onTriggerLawHeartEvent,
  onOpenLawHeart,
  onResetResearch,
  onStockResearchEvidence,
  onFillResearchLattice,
  onCompleteActiveResearch,
  onCompleteResearch,
  onBoostCrew,
  onPrepareContinuity,
  onSimulateOfflineDay,
  onReturnToPlayerSave,
}: QaSandboxProps) {
  const [customFlux, setCustomFlux] = useState("1e12");
  const [customFluxError, setCustomFluxError] = useState("");
  const [customAxioms, setCustomAxioms] = useState("24");
  const [customAxiomError, setCustomAxiomError] = useState("");

  const updateLawHeart = (patch: Partial<LawHeartQaOverride>) => {
    onLawHeartOverrideChange({ ...lawHeartOverride, ...patch });
  };

  const updateTierCount = (index: number, amount: number) => {
    const tierCounts = [...lawHeartOverride.tierCounts];
    tierCounts[index] = Math.max(0, Math.min(100_000, Math.floor(amount || 0)));
    updateLawHeart({ tierCounts });
  };

  const submitCustomFlux = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = customFlux.trim().replaceAll(",", "");
    const amount = Number(normalized);
    if (!normalized || Number.isNaN(amount) || amount <= 0) {
      setCustomFluxError("Enter a positive number, such as 500000 or 1e50.");
      return;
    }
    setCustomFluxError("");
    onAddFlux(amount);
  };

  const submitCustomAxioms = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = customAxioms.trim().replaceAll(",", "");
    const amount = Number(normalized);
    if (!normalized || Number.isNaN(amount) || amount < 0) {
      setCustomAxiomError("Enter zero or a positive whole number.");
      return;
    }
    setCustomAxiomError("");
    onSetAxioms(Math.floor(amount));
  };

  return (
    <aside className={`qa-sandbox ${collapsed ? "is-collapsed" : ""}`} aria-label="QA Sandbox controls">
      <button className="qa-sandbox-toggle" type="button" onClick={onToggleCollapsed} aria-expanded={!collapsed}>
        QA PANEL · {collapsed ? "OPEN" : "CLOSE"}
      </button>
      {!collapsed && (
        <div className="qa-sandbox-body">
          <header><span>ISOLATED TEST PROFILE</span><strong>AXIOM QA Sandbox</strong><small>These controls never write to your player save.</small></header>
          <section>
            <span>FRESH WORLD OPENINGS</span>
            <div className="qa-world-grid">
              {CAMPAIGN_WORLD_IDS.map((worldId, index) => (
                <button type="button" key={worldId} onClick={() => onJumpWorld(index)}>
                  {index === 0 ? "WAKE" : "ARRIVE"}{" · "}{getCampaignWorld(worldId)?.name}
                </button>
              ))}
            </div>
            <small className="qa-section-help">Each opening completes only earlier worlds, resets the active chapter to its first phase, and grants only its normal arrival cache. Use Test Overrides when you want to accelerate.</small>
          </section>
          <section>
            <span>TRAVEL PREVIEWS</span>
            <div className="qa-world-grid">
              {CAMPAIGN_WORLD_IDS.slice(1, -1).map((worldId, index) => {
                const originIndex = index + 1;
                const destinationId = CAMPAIGN_WORLD_IDS[originIndex + 1];
                return (
                  <button type="button" key={`${worldId}-${destinationId}`} onClick={() => onJumpTransit(originIndex)}>
                    {getCampaignWorld(worldId)?.name} → {getCampaignWorld(destinationId)?.name}
                  </button>
                );
              })}
            </div>
            <small className="qa-section-help">Open a live corridor at its beginning with normal travel timing, route hazards, and offline progress enabled.</small>
          </section>
          <section>
            <span>PLAYER EXPERIENCE</span>
            <div className="qa-action-grid">
              <button type="button" onClick={onFreshPlayerOpening}>Fresh player opening</button>
              <button type="button" onClick={onReplayPlanetIntroduction}>Cold Wake tab handoff</button>
              <button type="button" onClick={onReplayPelagosIntroduction}>Pelagos first-contact sequence</button>
              <button type="button" onClick={onReplayResearchIntroduction}>Viridia Research handoff</button>
            </div>
            <small className="qa-section-help">These run the same blocking guides and unlock presentation as the public game.</small>
          </section>
          <section>
            <span>TEST OVERRIDES</span>
            <div className="qa-action-grid">
              <button type="button" onClick={onGrantResources}>Stock all resources</button>
              <button type="button" onClick={onBoostCrew}>Max trained skills</button>
              <button type="button" onClick={onPrepareContinuity}>Prepare Continuity</button>
              <button type="button" onClick={onSimulateOfflineDay}>Simulate 24h</button>
            </div>
          </section>
          <section className="qa-law-heart-lab">
            <span>LAW-HEART VISUAL LAB</span>
            <div className="qa-law-heart-master">
              <button
                type="button"
                className={lawHeartOverride.enabled ? "is-active" : ""}
                aria-pressed={lawHeartOverride.enabled}
                onClick={() => updateLawHeart({ enabled: !lawHeartOverride.enabled })}
              >
                Visual override {lawHeartOverride.enabled ? "ON" : "OFF"}
              </button>
              <button type="button" onClick={onOpenLawHeart}>Open Law-Heart</button>
              <button
                type="button"
                onClick={() => onLawHeartOverrideChange(DEFAULT_LAW_HEART_QA_OVERRIDE)}
              >
                Reset to live values
              </button>
            </div>
            <small className="qa-section-help">
              Display-only controls. They do not change production, prices, or the public save.
            </small>
            <div className={`qa-law-heart-controls ${lawHeartOverride.enabled ? "" : "is-disabled"}`}>
              <label>
                <span>Axiom spectrum</span>
                <select
                  value={lawHeartOverride.spectrumAxioms}
                  onChange={(event) => {
                    const axioms = Number(event.target.value);
                    updateLawHeart({
                      spectrumAxioms: axioms,
                      shardAxioms: axioms,
                    });
                  }}
                >
                  {LAW_HEART_SPECTRA.map((spectrum) => (
                    <option key={spectrum.name} value={spectrum.threshold}>
                      {spectrum.threshold} · {spectrum.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Operational glow</span>
                <select
                  value={lawHeartOverride.state}
                  onChange={(event) => updateLawHeart({
                    state: event.target.value as LawPressState | "live",
                  })}
                >
                  <option value="live">Live game state</option>
                  <option value="dormant">Dormant</option>
                  <option value="manual">Manual</option>
                  <option value="warming">Warming</option>
                  <option value="active">Active</option>
                  <option value="rapid">Rapid</option>
                  <option value="synchronized">Synchronized</option>
                  <option value="law-ready">Law ready</option>
                </select>
              </label>
              <label>
                <span>Visible Axiom shards</span>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={lawHeartOverride.shardAxioms}
                  onChange={(event) => updateLawHeart({
                    shardAxioms: Math.max(0, Number(event.target.value) || 0),
                  })}
                />
              </label>
              <label>
                <span>Animation speed · {lawHeartOverride.speedMultiplier.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.25}
                  value={lawHeartOverride.speedMultiplier}
                  onChange={(event) => updateLawHeart({
                    speedMultiplier: Number(event.target.value),
                  })}
                />
              </label>
              <label>
                <span>Particle density · {lawHeartOverride.particleMultiplier.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.25}
                  value={lawHeartOverride.particleMultiplier}
                  onChange={(event) => updateLawHeart({
                    particleMultiplier: Number(event.target.value),
                  })}
                />
              </label>
              <label>
                <span>Star intensity · {lawHeartOverride.intensityMultiplier.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.25}
                  value={lawHeartOverride.intensityMultiplier}
                  onChange={(event) => updateLawHeart({
                    intensityMultiplier: Number(event.target.value),
                  })}
                />
              </label>
              <label>
                <span>Star scale · {lawHeartOverride.coreScale.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={lawHeartOverride.coreScale}
                  onChange={(event) => updateLawHeart({
                    coreScale: Number(event.target.value),
                  })}
                />
              </label>
              <label>
                <span>Utility drones · {lawHeartOverride.droneCount}</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={lawHeartOverride.droneCount}
                  onChange={(event) => updateLawHeart({
                    droneCount: Number(event.target.value),
                  })}
                />
              </label>
            </div>
            <div className="qa-law-heart-presets" aria-label="Law-Heart visual presets">
              <button
                type="button"
                onClick={() => updateLawHeart({
                  enabled: true,
                  tierCounts: [0, 0, 0, 0, 0, 0],
                  particleMultiplier: 0,
                  speedMultiplier: 0,
                  droneCount: 0,
                  state: "dormant",
                })}
              >
                Bare core
              </button>
              <button
                type="button"
                onClick={() => updateLawHeart({
                  enabled: true,
                  tierCounts: [25, 0, 0, 0, 0, 0],
                  particleMultiplier: 1,
                  speedMultiplier: 1,
                  droneCount: 0,
                  state: "active",
                })}
              >
                Early cycle
              </button>
              <button
                type="button"
                onClick={() => updateLawHeart({
                  enabled: true,
                  tierCounts: [100, 80, 60, 40, 20, 10],
                  particleMultiplier: 2.5,
                  speedMultiplier: 2.5,
                  intensityMultiplier: 1.5,
                  droneCount: 4,
                  state: "rapid",
                })}
              >
                Full chain
              </button>
              <button
                type="button"
                onClick={() => updateLawHeart({
                  enabled: true,
                  tierCounts: [500, 400, 300, 200, 150, 100],
                  particleMultiplier: 6,
                  speedMultiplier: 6,
                  intensityMultiplier: 2.5,
                  coreScale: 1.25,
                  droneCount: 8,
                  state: "synchronized",
                })}
              >
                Saturated field
              </button>
            </div>
            <div className="qa-law-heart-tiers">
              {["TAP", "COIL", "LOOM", "ARRAY", "ENGINE", "FORGE"].map((label, index) => (
                <label key={label}>
                  <span>{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={lawHeartOverride.tierCounts[index] ?? 0}
                    onChange={(event) => updateTierCount(index, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
            <div className="qa-action-grid qa-law-heart-effects">
              <button type="button" onClick={() => onTriggerLawHeartEvent("pulse")}>Click burst</button>
              <button type="button" onClick={() => onTriggerLawHeartEvent("purchase")}>Purchase bloom</button>
              <button type="button" onClick={() => onTriggerLawHeartEvent("expenditure")}>Flux discharge</button>
              <button type="button" onClick={() => onTriggerLawHeartEvent("recalibration")}>Recalibration nova</button>
            </div>
            <form className="qa-axiom-form" onSubmit={submitCustomAxioms}>
              <label htmlFor="qa-custom-axiom-input">Set real profile Axioms</label>
              <div>
                <input
                  id="qa-custom-axiom-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={customAxioms}
                  aria-invalid={customAxiomError ? true : undefined}
                  onChange={(event) => setCustomAxioms(event.target.value)}
                />
                <button type="submit">Set Axioms</button>
              </div>
              {customAxiomError && <strong role="alert">{customAxiomError}</strong>}
            </form>
          </section>
          <section>
            <span>RESEARCH LAB</span>
            <div className="qa-action-grid">
              <button className="qa-danger-button" type="button" onClick={onResetResearch}>Reset Research tree</button>
              <button type="button" onClick={onStockResearchEvidence}>Max Ark evidence</button>
              <button type="button" onClick={onFillResearchLattice}>Max lattice reservoirs</button>
              <button type="button" onClick={onCompleteActiveResearch}>Complete active project</button>
              <button type="button" onClick={onCompleteResearch}>Complete all Research</button>
            </div>
            <small className="qa-section-help">
              Reset clears only Research progress inside this isolated QA profile. Ark evidence and loaded
              Lattice reservoirs are separate so you can test transfers, blockers, and project stages.
            </small>
          </section>
          <section className="qa-custom-flux">
            <span>CUSTOM FLUX GRANT</span>
            <form onSubmit={submitCustomFlux}>
              <label htmlFor="qa-custom-flux-input">Amount to add</label>
              <div>
                <input
                  id="qa-custom-flux-input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  value={customFlux}
                  aria-invalid={customFluxError ? true : undefined}
                  aria-describedby="qa-custom-flux-help"
                  onChange={(event) => setCustomFlux(event.target.value)}
                />
                <button type="submit">Add Flux</button>
              </div>
              <small id="qa-custom-flux-help">
                Commas and scientific notation work. Example: 1e100. Safe maximum: 1e280.
              </small>
              {customFluxError && <strong role="alert">{customFluxError}</strong>}
            </form>
          </section>
          <button className="qa-return-button" type="button" onClick={onReturnToPlayerSave}>Return to player save</button>
        </div>
      )}
    </aside>
  );
}
