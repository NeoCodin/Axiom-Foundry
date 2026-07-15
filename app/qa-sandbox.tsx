"use client";

import { CAMPAIGN_WORLD_IDS, getCampaignWorld } from "./campaign-content";

type QaSandboxProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onJumpWorld: (worldIndex: number) => void;
  onGrantResources: () => void;
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
  onGrantResources,
  onCompleteResearch,
  onBoostCrew,
  onPrepareContinuity,
  onSimulateOfflineDay,
  onReturnToPlayerSave,
}: QaSandboxProps) {
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
            <span>TEST OVERRIDES</span>
            <div className="qa-action-grid">
              <button type="button" onClick={onGrantResources}>Stock resources</button>
              <button type="button" onClick={onCompleteResearch}>Complete research</button>
              <button type="button" onClick={onBoostCrew}>Max trained skills</button>
              <button type="button" onClick={onPrepareContinuity}>Prepare Continuity</button>
              <button type="button" onClick={onSimulateOfflineDay}>Simulate 24h</button>
            </div>
          </section>
          <button className="qa-return-button" type="button" onClick={onReturnToPlayerSave}>Return to player save</button>
        </div>
      )}
    </aside>
  );
}
