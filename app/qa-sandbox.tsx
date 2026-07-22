"use client";

import { useState, type FormEvent } from "react";

import { CAMPAIGN_WORLD_IDS, getCampaignWorld } from "./campaign-content";

type QaSandboxProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onJumpWorld: (worldIndex: number) => void;
  onFreshPlayerOpening: () => void;
  onReplayPlanetIntroduction: () => void;
  onReplayPelagosIntroduction: () => void;
  onReplayResearchIntroduction: () => void;
  onGrantResources: () => void;
  onAddFlux: (amount: number) => void;
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
  onFreshPlayerOpening,
  onReplayPlanetIntroduction,
  onReplayPelagosIntroduction,
  onReplayResearchIntroduction,
  onGrantResources,
  onAddFlux,
  onCompleteResearch,
  onBoostCrew,
  onPrepareContinuity,
  onSimulateOfflineDay,
  onReturnToPlayerSave,
}: QaSandboxProps) {
  const [customFlux, setCustomFlux] = useState("1e12");
  const [customFluxError, setCustomFluxError] = useState("");

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

  return (
    <aside className={`qa-sandbox ${collapsed ? "is-collapsed" : ""}`} aria-label="QA Sandbox controls">
      <button className="qa-sandbox-toggle" type="button" onClick={onToggleCollapsed} aria-expanded={!collapsed}>
        QA // {collapsed ? "OPEN" : "CLOSE"}
      </button>
      {!collapsed && (
        <div className="qa-sandbox-body">
          <header><span>ISOLATED TEST PROFILE</span><strong>AXIOM QA Sandbox</strong><small>These controls never write to your player save.</small></header>
          <section>
            <span>WORLD CHECKPOINTS</span>
            <div className="qa-world-grid">
              {CAMPAIGN_WORLD_IDS.map((worldId, index) => (
                <button type="button" key={worldId} onClick={() => onJumpWorld(index)}>{String(index).padStart(2, "0")} {getCampaignWorld(worldId)?.name}</button>
              ))}
            </div>
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
              <button type="button" onClick={onGrantResources}>Stock resources</button>
              <button type="button" onClick={onCompleteResearch}>Complete research</button>
              <button type="button" onClick={onBoostCrew}>Max trained skills</button>
              <button type="button" onClick={onPrepareContinuity}>Prepare Continuity</button>
              <button type="button" onClick={onSimulateOfflineDay}>Simulate 24h</button>
            </div>
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
