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

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function getProgramEffectLabel(programId: AutomationProgramId, frames: number) {
  if (frames <= 0) return "No frame assigned · no operational effect";
  switch (programId) {
    case "hull-maintenance":
      return `+${frames * 15}% temporary hull repair · one automatic equipment cycle every ${Math.round(60 / frames)} minutes`;
    case "medical-assistance":
      return `+${frames * 5}% recovery beside an on-duty Doctor`;
    case "research-routing":
      return `+${frames * 3}% Prototype and Field Validation throughput`;
    case "expedition-support":
      return "+1 expedition strength · +5% recovered rewards";
    case "construction-machines":
      return `+${frames * 12}% planetary construction speed`;
    case "interceptor-control":
      return `+${frames * 6} hostile-vessel defense readiness`;
    case "personnel-logistics":
      return `+${frames * 10}% reserve-crew Salvage recovery`;
  }
}

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
        <div data-pixel-tooltip="Permanent utility frames fabricated aboard the Ark. Only eight can exist, and Recalibration never removes them." tabIndex={0}><span>Built</span><strong>{state.framesBuilt}/{MAX_UTILITY_DRONE_FRAMES}</strong></div>
        <div data-pixel-tooltip="Built frames not currently assigned to a support program. Available frames create no bonus and divert no Flux." tabIndex={0}><span>Available</span><strong>{available}</strong></div>
        <div data-pixel-tooltip="Every assigned frame diverts 1.25% of Foundry output. Eight active frames therefore reserve 10% of production for Ark support work." tabIndex={0}><span>Flux diverted</span><strong>{Math.round(effects.operationalLoad * 10_000) / 100}%</strong></div>
        <button
          type="button"
          disabled={!frameQuote.canBuild}
          onClick={onBuildFrame}
          data-pixel-tooltip={frameQuote.maxed
            ? "All eight permanent utility frames have been fabricated."
            : frameQuote.researchMet
              ? `Fabricate one unassigned permanent utility frame. Cost: ${frameQuote.costLabel}.`
              : "Complete Automated Personnel Logistics in Research before fabricating the first utility frame."}
        >
          {frameQuote.maxed ? "FRAME LIMIT" : frameQuote.researchMet ? frameQuote.costLabel : "Requires Automated Personnel Logistics"}
        </button>
      </div>

      <div className="drone-program-list">
        {AUTOMATION_PROGRAM_DEFINITIONS.map((program) => {
          const amount = state.allocations[program.id];
          const unlocked = unlockedPrograms[program.id];
          const suppressed = suppressedProgram === program.id;
          const currentEffect = getProgramEffectLabel(program.id, suppressed ? 0 : amount);
          const nextEffect = amount < program.maximumFrames
            ? getProgramEffectLabel(program.id, amount + 1)
            : null;
          return (
            <article
              className={`${unlocked ? "" : "locked"} ${suppressed ? "is-compromised" : ""}`}
              key={program.id}
              data-pixel-tooltip={unlocked
                ? `${program.description} ${currentEffect}.${nextEffect ? ` One more frame: ${nextEffect}.` : " This program is fully staffed."} Every assigned frame diverts 1.25% of Foundry production.`
                : `Research locked. Complete ${titleCase(program.requiredResearchId)} to authorize this drone program.`}
              tabIndex={0}
            >
              <div>
                <span>{unlocked ? suppressed ? "TEMPORARILY SEIZED" : `${amount}/${program.maximumFrames} FRAMES` : "RESEARCH LOCKED"}</span>
                <strong>{program.name}</strong>
                <small>{program.description}</small>
                <small className="drone-current-effect">{suppressed ? `SUPPRESSED · ${getProgramEffectLabel(program.id, amount)}` : currentEffect}</small>
                {unlocked && nextEffect && <small className="drone-next-effect">NEXT FRAME · {nextEffect} · +1.25% load</small>}
                {!unlocked && <small className="drone-next-effect">RESEARCH · {titleCase(program.requiredResearchId)}</small>}
              </div>
              <div className="drone-allocation-controls" data-pixel-tooltip={nextEffect ? `The minus control frees one frame. The plus control assigns one frame: ${nextEffect}, with another 1.25% production diverted.` : "This program is fully staffed. Remove a frame to return it to the available pool."}>
                <button type="button" disabled={!unlocked || amount <= 0} onClick={() => onAllocation(program.id, amount - 1)} aria-label={`Remove one frame from ${program.name}`}>−</button>
                <b>{amount}</b>
                <button type="button" disabled={!unlocked || amount >= program.maximumFrames || available <= 0} onClick={() => onAllocation(program.id, amount + 1)} aria-label={`Assign one frame to ${program.name}`}>+</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="drone-maintenance-policy">
        <span data-pixel-tooltip="Hull Maintenance frames can automatically restore damaged Armory equipment. This doctrine controls when AXIOM is allowed to spend the required Flux." tabIndex={0}>Equipment maintenance</span>
        <div>
          {POLICIES.map((policy) => (
            <button type="button" title={policy.detail} data-pixel-tooltip={policy.detail} aria-pressed={state.maintenancePolicy === policy.id} className={state.maintenancePolicy === policy.id ? "active" : ""} onClick={() => onPolicy(policy.id)} key={policy.id}>{policy.label}</button>
          ))}
        </div>
        <small>{state.stats.equipmentRepaired} damaged equipment frame{state.stats.equipmentRepaired === 1 ? "" : "s"} restored automatically.</small>
      </div>

      <div className="operational-load-readout" data-pixel-tooltip="Operational Load is the total share of Foundry production currently routed away from fabrication. Medical care, utility drones, planetary defenses, and hostile compromises all contribute." tabIndex={0}>
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
