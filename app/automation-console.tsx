"use client";

import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  AUTOMATION_PROGRAM_DEFINITIONS,
  MAX_UTILITY_DRONE_FRAMES,
  getAllocatedAutomationFrames,
  getAvailableAutomationFrames,
  type AutomationEffects,
  type AutomationMaintenancePolicy,
  type AutomationProgramId,
  type AutomationState,
} from "./automation-engine";
import type { OperationalLoad } from "./game-engine";

export type AutomationFrameQuoteView = {
  maxed: boolean;
  researchMet: boolean;
  canBuild: boolean;
  costLabel: string;
};

type AutomationConsoleProps = {
  state: AutomationState;
  effects: AutomationEffects;
  operationalLoad: OperationalLoad;
  frameQuote: AutomationFrameQuoteView;
  unlockedPrograms: Readonly<Record<AutomationProgramId, boolean>>;
  suppressedProgram: string | null;
  onBuildFrame: () => void;
  onAllocation: (programId: AutomationProgramId, amount: number) => void;
  onPolicy: (policy: AutomationMaintenancePolicy) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
};

const POLICIES: readonly { id: AutomationMaintenancePolicy; label: string; detail: string }[] = [
  { id: "off", label: "Off", detail: "Never spend Flux on automatic equipment repair." },
  { id: "reserve", label: "Reserve", detail: "Repair only when twice the required Flux is available." },
  { id: "priority", label: "Priority", detail: "Repair whenever the exact cost is available." },
];

export function AutomationConsole({
  state,
  effects,
  operationalLoad,
  frameQuote,
  unlockedPrograms,
  suppressedProgram,
  onBuildFrame,
  onAllocation,
  onPolicy,
  onOpenHelp,
}: AutomationConsoleProps) {
  const allocated = getAllocatedAutomationFrames(state);
  const available = getAvailableAutomationFrames(state);
  return (
    <section className="panel drone-operations-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker brass">Foundry systems</p>
          <h2>Utility Drone Operations</h2>
        </div>
        <div className="continuity-header-help">
          <span className="count-label">{allocated}/{state.framesBuilt} assigned</span>
          <HelpTrigger label="Explain Utility Drone Operations" onClick={() => onOpenHelp("engineering")} />
        </div>
      </div>
      <p className="panel-copy">Eight scarce frames support trained crew. Every active frame diverts 1.25% of production; drones never replace a profession.</p>

      <div className="drone-frame-summary">
        <div><span>Built</span><strong>{state.framesBuilt}/{MAX_UTILITY_DRONE_FRAMES}</strong></div>
        <div><span>Available</span><strong>{available}</strong></div>
        <div><span>Drone load</span><strong>{Math.round(effects.operationalLoad * 10_000) / 100}%</strong></div>
        <button type="button" disabled={!frameQuote.canBuild} onClick={onBuildFrame}>
          {frameQuote.maxed ? "FRAME LIMIT" : frameQuote.researchMet ? frameQuote.costLabel : "Requires Automated Personnel Logistics"}
        </button>
      </div>

      <div className="drone-program-list">
        {AUTOMATION_PROGRAM_DEFINITIONS.map((program) => {
          const amount = state.allocations[program.id];
          const unlocked = unlockedPrograms[program.id];
          const suppressed = suppressedProgram === program.id;
          return (
            <article className={`${unlocked ? "" : "locked"} ${suppressed ? "is-compromised" : ""}`} key={program.id}>
              <div>
                <span>{unlocked ? suppressed ? "TEMPORARILY SEIZED" : `${amount}/${program.maximumFrames} FRAMES` : "RESEARCH LOCKED"}</span>
                <strong>{program.name}</strong>
                <small>{program.description}</small>
              </div>
              <div className="drone-allocation-controls">
                <button type="button" disabled={!unlocked || amount <= 0} onClick={() => onAllocation(program.id, amount - 1)} aria-label={`Remove one frame from ${program.name}`}>−</button>
                <b>{amount}</b>
                <button type="button" disabled={!unlocked || amount >= program.maximumFrames || available <= 0} onClick={() => onAllocation(program.id, amount + 1)} aria-label={`Assign one frame to ${program.name}`}>+</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="drone-maintenance-policy">
        <span>Equipment maintenance</span>
        <div>
          {POLICIES.map((policy) => (
            <button type="button" title={policy.detail} aria-pressed={state.maintenancePolicy === policy.id} className={state.maintenancePolicy === policy.id ? "active" : ""} onClick={() => onPolicy(policy.id)} key={policy.id}>{policy.label}</button>
          ))}
        </div>
        <small>{state.stats.equipmentRepaired} damaged equipment frame{state.stats.equipmentRepaired === 1 ? "" : "s"} restored automatically.</small>
      </div>

      <div className="operational-load-readout">
        <header><span>OPERATIONAL LOAD</span><strong>{Math.round(operationalLoad.total * 10_000) / 100}% diverted</strong></header>
        <div><i style={{ width: `${operationalLoad.total * 100}%` }} /></div>
        <small>
          Medical {Math.round(operationalLoad.medical * 10_000) / 100}% · Drones {Math.round(operationalLoad.automation * 10_000) / 100}% · Worlds {Math.round(operationalLoad.planetaryDefense * 10_000) / 100}% · Compromise {Math.round(operationalLoad.compromise * 10_000) / 100}%
        </small>
      </div>
    </section>
  );
}

export default AutomationConsole;
