"use client";

import { useState } from "react";

import { getCampaignWorld, type CampaignWorldDefinition } from "./campaign-content";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import type {
  CampaignCrewSummary,
  ColonyRecord,
  ViabilityForecast,
  WorldProgressSummary,
} from "./settlement-engine";

export type ContinuityActionQuote = {
  canAfford: boolean;
  costLabel: string;
  rewardLabel?: string;
  requirements?: readonly {
    id: string;
    category: string;
    label: string;
    detail: string;
    met: boolean;
  }[];
};

export type SettlementConsoleProps = {
  world: CampaignWorldDefinition;
  forecast: ViabilityForecast;
  progress: WorldProgressSummary;
  crew: readonly CampaignCrewSummary[];
  colonies: readonly ColonyRecord[];
  infrastructureQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  supplyQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  crisisQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  pendingTransmission: { colonyName: string; transmission: string } | null;
  onToggleSettler: (crewId: string) => void;
  onCompleteInfrastructure: (objectiveId: string) => void;
  onFabricateSupply: (supplyId: string) => void;
  onResolveCrisis: (crisisId: string) => void;
  onDepart: (colonyName: string) => void;
  onAcknowledgeTransmission: () => void;
  onOpenPopulation: () => void;
  onOpenResearch: () => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SettlementConsole({
  world,
  forecast,
  progress,
  crew,
  colonies,
  infrastructureQuotes,
  supplyQuotes,
  crisisQuotes,
  pendingTransmission,
  onToggleSettler,
  onCompleteInfrastructure,
  onFabricateSupply,
  onResolveCrisis,
  onDepart,
  onAcknowledgeTransmission,
  onOpenPopulation,
  onOpenResearch,
  onOpenHelp,
  onBack,
}: SettlementConsoleProps) {
  const [colonyName, setColonyName] = useState(`${world.name} Continuity Settlement`);
  const selected = new Set(forecast.selectedSettlerIds);

  return (
    <section className="continuity-console settlement-console" aria-labelledby="settlement-console-title">
      <header className="continuity-console-header">
        <div>
          <p>PLANETARY CONTINUITY // CHAPTER {String(world.chapter).padStart(2, "0")}</p>
          <h2 id="settlement-console-title">{world.name} stabilization forecast</h2>
          <span>Departure is a choice made after a society can continue without the Ark.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <section className="settlement-hero">
        <div className="settlement-kicker">{world.subtitle.toUpperCase()}</div>
        <h3>{world.name}</h3>
        <p>{world.arrivalBrief}</p>
        <div className="settlement-score"><strong>{forecast.score}%</strong><span>projected viability</span></div>
        <div className="forecast-meter" role="progressbar" aria-label={`${world.name} viability`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={forecast.score}><i style={{ width: `${forecast.score}%` }} /></div>
      </section>

      {pendingTransmission && (
        <section className="continuity-panel departure-panel">
          <header><div><span>COLONY TRANSMISSION</span><h3>{pendingTransmission.colonyName}</h3></div><small>Legacy settlements remain alive</small></header>
          <blockquote>{pendingTransmission.transmission}</blockquote>
          <button className="forecast-action" type="button" onClick={onAcknowledgeTransmission}>Archive transmission</button>
        </section>
      )}

      <div className="settlement-layout">
        <section className="continuity-panel">
          <header><div><span>CONTINUITY REQUIREMENTS</span><h3>{forecast.deficits.length === 0 ? "Every requirement is met" : `${forecast.deficits.length} deficits remain`}</h3></div><div className="continuity-header-help"><small>Nothing expires</small><HelpTrigger label="Explain Continuity requirements" onClick={() => onOpenHelp("settlement")} /></div></header>
          <div className="forecast-list">
            {forecast.lines.map((line) => {
              const ratio = Math.min(1, line.currentValue / Math.max(1, line.requiredValue));
              return (
                <article className={`forecast-line ${line.met ? "is-met" : ""}`} key={`${line.kind}-${line.id}`}>
                  <header><span>{line.label}</span><strong>{line.currentValue}/{line.requiredValue}</strong></header>
                  <div className="forecast-line-meter"><i style={{ width: `${ratio * 100}%` }} /></div>
                  <small>{line.met ? "Requirement secured" : line.substitutionValue > 0 ? `${line.substitutionValue} supplied by research or equipment` : titleCase(line.kind)}</small>
                  {(line.detail || line.contributors.length > 0) && (
                    <details className="forecast-line-detail">
                      <summary>How this is counted</summary>
                      {line.detail && <p>{line.detail}</p>}
                      {line.contributors.length > 0 && <div>{line.contributors.map((contributor) => <span key={`${line.id}-${contributor.id}`}>{contributor.label} <strong>+{contributor.value}</strong></span>)}</div>}
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="continuity-panel">
          <header><div><span>EXPLICIT DEFICITS</span><h3>What this world still needs</h3></div><small>Profile gates are visible · quality safety net active</small></header>
          {forecast.deficits.length > 0 ? (
            <ul className="deficit-list">
              {forecast.deficits.map((deficit) => <li key={`${deficit.kind}-${deficit.id}`}><strong>{deficit.message}</strong>{deficit.alternatives.map((alternative) => <span key={alternative}>{alternative}</span>)}</li>)}
            </ul>
          ) : (
            <div className="continuity-empty-state"><strong>{world.name} can continue independently.</strong><p>Review the founders and make the departure decision when you are ready.</p></div>
          )}
          <div className="crew-actions-grid">
            <button className="forecast-action" type="button" onClick={onOpenPopulation}>Recruit or train crew</button>
            <button className="forecast-action" type="button" onClick={onOpenResearch}>Open Research Lattice</button>
          </div>
        </section>
      </div>

      <div className="settlement-layout">
        <section className="continuity-panel">
          <header><div><span>WORLD WORKS</span><h3>Infrastructure, supplies, and crisis response</h3></div><small>Permanent planetary work</small></header>
          <div className="world-progress-actions">
            {world.infrastructure.map((objective) => {
              const complete = progress.completedInfrastructureIds.includes(objective.id);
              const quote = infrastructureQuotes[objective.id];
              return <article className={`world-progress-action ${complete ? "is-complete" : ""}`} key={objective.id}><div><strong>{objective.name}</strong><small>{objective.description}</small></div>{complete ? <span>SECURED</span> : <button type="button" disabled={!quote?.canAfford} onClick={() => onCompleteInfrastructure(objective.id)}>{quote?.costLabel ?? "Unavailable"}</button>}</article>;
            })}
            {world.supplyRequirements.map((requirement) => {
              const current = progress.supplies[requirement.id] ?? 0;
              const complete = current >= requirement.amount;
              const quote = supplyQuotes[requirement.id];
              return <article className={`world-progress-action ${complete ? "is-complete" : ""}`} key={requirement.id}><div><strong>{requirement.label}</strong><small>{current}/{requirement.amount} stored · batches remain through departure</small></div>{complete ? <span>STOCKED</span> : <button type="button" disabled={!quote?.canAfford} onClick={() => onFabricateSupply(requirement.id)}>{quote?.costLabel ?? "Unavailable"}</button>}</article>;
            })}
            {world.crisisIds.map((crisisId) => {
              const complete = progress.resolvedCrisisIds.includes(crisisId);
              const quote = crisisQuotes[crisisId];
              const requirements = quote?.requirements ?? [];
              const readyCount = requirements.filter((requirement) => requirement.met).length;
              return (
                <article className={`world-progress-action crisis-action ${complete ? "is-complete" : ""}`} key={crisisId}>
                  <div className="crisis-action-heading">
                    <div>
                      <strong>{titleCase(crisisId)}</strong>
                      <small>The crisis has no deadline. Complete every item below when you are ready.</small>
                    </div>
                    {complete ? (
                      <span className="crisis-resolved">RESOLVED</span>
                    ) : (
                      <button type="button" disabled={!quote?.canAfford} onClick={() => onResolveCrisis(crisisId)}>{quote?.costLabel ?? "Unavailable"}</button>
                    )}
                  </div>
                  {!complete && requirements.length > 0 && (
                    <section className="crisis-requirements" aria-label={`${titleCase(crisisId)} resolution requirements`}>
                      <header>
                        <span>Resolution checklist</span>
                        <strong>{readyCount} / {requirements.length} ready</strong>
                      </header>
                      <ul>
                        {requirements.map((requirement) => (
                          <li className={requirement.met ? "is-met" : ""} key={requirement.id}>
                            <i aria-hidden="true">{requirement.met ? "✓" : "·"}</i>
                            <div><span className="crisis-requirement-category">{requirement.category}</span><strong>{requirement.label}</strong><small>{requirement.detail}</small></div>
                            <em>{requirement.met ? "READY" : "PENDING"}</em>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </article>
              );
            })}
            {world.requiredResearchIds.map((researchId) => {
              const complete = progress.completedResearchIds.includes(researchId);
              return <article className={`world-progress-action ${complete ? "is-complete" : ""}`} key={researchId}><div><strong>{titleCase(researchId)}</strong><small>Research Lattice project</small></div>{complete ? <span>PROVEN</span> : <button type="button" onClick={onOpenResearch}>Research</button>}</article>;
            })}
          </div>
        </section>

        <section className="continuity-panel">
          <header><div><span>{world.settlementRequired ? "FOUNDING POPULATION" : "ORBITAL TRANSITION"}</span><h3>{world.settlementRequired ? `${forecast.selectedSettlerIds.length} founders selected` : "No founders required in deep space"}</h3></div><small>People left behind remain in colony records</small></header>
          {world.settlementRequired ? (
            <div className="settler-selection-list">
              {crew.map((member) => (
                <label className={`${member.rarity ? `crew-rarity-${member.rarity}` : ""} ${selected.has(member.id) ? "is-selected" : ""}`} key={member.id}>
                  <input type="checkbox" checked={selected.has(member.id)} onChange={() => onToggleSettler(member.id)} />
                  <span className="crew-avatar">{member.name.slice(0, 1)}</span>
                  <span><strong>{member.name}</strong><small>{titleCase(member.role ?? "civilian")}{(member.level ?? 0) > 0 ? ` · Level ${member.level}` : ""} · {Object.entries(member.expertise ?? {}).filter(([, value]) => (value ?? 0) > 0).slice(0, 3).map(([id, value]) => `${titleCase(id)} ${value}`).join(" · ") || "Adaptable civilian"}</small></span>
                  <span className="settler-row-status"><em className="crew-rarity-badge" title={member.rarityDescription}>{member.rarityLabel ?? "Standard"}</em><b>{selected.has(member.id) ? "FOUNDER" : "ARK"}</b></span>
                </label>
              ))}
            </div>
          ) : (
            <div className="continuity-empty-state"><strong>Cold Wake is an Ark restoration chapter.</strong><p>Complete the works, prove closed-loop atmosphere, resolve the reactor desynchronization, and commit the Pelagos orbital insertion.</p></div>
          )}
        </section>
      </div>

      <section className="continuity-panel departure-panel">
        <header><div><span>DEPARTURE AUTHORITY</span><h3>{forecast.canDepart ? `AXIOM may leave ${world.name}` : `The Ark is still needed at ${world.name}`}</h3></div><small>{world.continuityProtocolExcerpt}</small></header>
        <blockquote>{world.departureQuestion}</blockquote>
        {world.settlementRequired && <input className="colony-name-input" value={colonyName} maxLength={64} onChange={(event) => setColonyName(event.target.value)} aria-label="Settlement name" />}
        <button className="settlement-action" type="button" disabled={!forecast.canDepart} onClick={() => onDepart(colonyName)}>{world.settlementRequired ? `Establish settlement and depart ${world.name}` : "Commit Pelagos orbital insertion"}</button>
      </section>

      {colonies.length > 0 && (
        <section className="continuity-panel">
          <header><div><span>RESTORED WORLDS</span><h3>Colonies that continue without the Ark</h3></div><small>{colonies.length} active relays</small></header>
          <div className="colony-list">{colonies.map((colony) => { const restoredWorld = getCampaignWorld(colony.worldId); return <article key={colony.worldId}><h4>{colony.name}</h4><p>{colony.founders.length} founders · {colony.viabilityScore}% departure viability</p><small>{restoredWorld?.legacyBenefits.map((benefit) => `${benefit.label}: +${Math.round(benefit.value * 100)}% ${benefit.metric.replaceAll("-", " ")}`).join(" · ") || `${titleCase(colony.worldId)} relay online`}</small></article>; })}</div>
        </section>
      )}
    </section>
  );
}

export default SettlementConsole;
