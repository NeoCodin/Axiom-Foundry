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
import { getCommunityReadinessContribution } from "./settlement-engine";
import { MAX_FOUNDING_COMMUNITY_SIZE } from "./settlement-engine";
import {
  CAUSAL_FRAGMENT_DEFINITIONS,
  MAX_PLANETARY_INSTALLATION_LEVEL,
  PLANETARY_DEFENSE_DOCTRINES,
  PLANETARY_INSTALLATION_DEFINITIONS,
  getPlanetaryIncomingForecast,
  getPlanetaryNetworkReadiness,
  type PlanetaryDefenseDoctrine,
  type PlanetaryDefenseState,
  type PlanetaryInstallationId,
} from "./planetary-defense-engine";
import type { CampaignWorldId } from "./campaign-content";
import type { DoctrineId } from "./discovery-content";

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

export type PlanetaryConstructionQuoteView = {
  level: number;
  maxed: boolean;
  busy: boolean;
  canBuild: boolean;
  costLabel: string;
};

export type SettlementConsoleProps = {
  world: CampaignWorldDefinition;
  forecast: ViabilityForecast;
  progress: WorldProgressSummary;
  crew: readonly CampaignCrewSummary[];
  colonies: readonly ColonyRecord[];
  infrastructureQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  supplyQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  equipmentQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  crisisQuotes: Readonly<Record<string, ContinuityActionQuote>>;
  departureHold: string | null;
  pendingTransmission: { colonyName: string; transmission: string } | null;
  planetaryDefense: PlanetaryDefenseState;
  planetaryDefenseActive: boolean;
  planetaryDefenseLoad: number;
  planetaryDefenseQuotes: Partial<Record<CampaignWorldId, Record<PlanetaryInstallationId, PlanetaryConstructionQuoteView>>>;
  coldWakeSequence?: {
    stepNumber: number;
    stepCount: number;
    label: string;
    detail: string;
    progress: number;
    actionLabel?: string;
    actionDisabled?: boolean;
  } | null;
  pelagosSequence?: {
    stepNumber: number;
    stepCount: number;
    label: string;
    detail: string;
    progress: number;
    status: string;
    actionLabel?: string;
    actionDisabled?: boolean;
  } | null;
  finalDoctrine?: {
    chosen: {
      title: string;
      commitment: string;
      lyraResponse: string;
      epilogue: string;
    } | null;
    options: readonly {
      id: DoctrineId;
      shortName: string;
      thesis: string;
      choiceLabel: string;
      available: boolean;
      recordsRequired: number;
    }[];
  } | null;
  onToggleSettler: (crewId: string) => void;
  onCompleteInfrastructure: (objectiveId: string) => void;
  onFabricateSupply: (supplyId: string) => void;
  onFabricateEquipment: (equipmentId: string) => void;
  onResolveCrisis: (crisisId: string) => void;
  onDepart: (colonyName: string) => void;
  onAcknowledgeTransmission: () => void;
  onPlanetaryDoctrine: (doctrine: PlanetaryDefenseDoctrine) => void;
  onPlanetaryConstruction: (worldId: CampaignWorldId, installationId: PlanetaryInstallationId) => void;
  onColdWakeAction?: () => void;
  onPelagosAction?: () => void;
  onChooseFinalDoctrine?: (doctrineId: DoctrineId) => void;
  onOpenPopulation?: () => void;
  onOpenResearch?: () => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

function titleCase(value: string) {
  const display = value === "security" ? "soldier" : value;
  return display.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const RARITY_RANKS: Record<string, number> = {
  standard: 0,
  notable: 1,
  exceptional: 2,
  anomalous: 3,
};

type DeficitCandidate = {
  id: string;
  name: string;
  value: number;
  rarity: string;
};

function candidatesForDeficit(
  deficit: ViabilityForecast["deficits"][number],
  world: CampaignWorldDefinition,
  crew: readonly CampaignCrewSummary[],
  selected: ReadonlySet<string>,
): DeficitCandidate[] | null {
  if (
    deficit.kind !== "community" &&
    deficit.kind !== "expertise" &&
    deficit.kind !== "profile"
  ) {
    return null;
  }
  const available = crew.filter(
    (member) =>
      member.available !== false &&
      member.canSettle !== false &&
      !selected.has(member.id),
  );
  const scored = available
    .map((member) => {
      let value = 0;
      if (deficit.kind === "community") {
        value = getCommunityReadinessContribution(member);
      } else if (deficit.kind === "expertise") {
        value = member.expertise?.[deficit.id] ?? 0;
      } else if (deficit.kind === "profile") {
        const requirement = world.profileRequirements.find(
          (candidate) => candidate.id === deficit.id,
        );
        const needed = RARITY_RANKS[requirement?.minimumRarity ?? "notable"] ?? 1;
        value = (RARITY_RANKS[member.rarity ?? "standard"] ?? 0) >= needed ? 1 : 0;
      }
      return { id: member.id, name: member.name, value, rarity: member.rarity ?? "standard" };
    })
    .filter((candidate) => candidate.value > 0)
    .sort((left, right) => right.value - left.value);
  return scored.slice(0, 6);
}

function SettlementConsole({
  world,
  forecast,
  progress,
  crew,
  colonies,
  infrastructureQuotes,
  supplyQuotes,
  equipmentQuotes,
  crisisQuotes,
  departureHold,
  pendingTransmission,
  planetaryDefense,
  planetaryDefenseActive,
  planetaryDefenseLoad,
  planetaryDefenseQuotes,
  coldWakeSequence = null,
  pelagosSequence = null,
  onToggleSettler,
  onCompleteInfrastructure,
  onFabricateSupply,
  onFabricateEquipment,
  onResolveCrisis,
  onDepart,
  onAcknowledgeTransmission,
  onPlanetaryDoctrine,
  onPlanetaryConstruction,
  onColdWakeAction,
  onPelagosAction,
  finalDoctrine = null,
  onChooseFinalDoctrine,
  onOpenPopulation,
  onOpenResearch,
  onOpenHelp,
  onBack,
}: SettlementConsoleProps) {
  const [colonyName, setColonyName] = useState(`${world.name} Continuity Settlement`);
  const selected = new Set(forecast.selectedSettlerIds);
  const planetaryForecast = getPlanetaryIncomingForecast(planetaryDefense);
  const planetaryInstallationIds = Object.keys(PLANETARY_INSTALLATION_DEFINITIONS) as PlanetaryInstallationId[];
  const securedRequirementCount = forecast.lines.filter((line) => line.met).length;

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

      <section className="settlement-hero" data-guide-target="planet-world">
        <div className="settlement-kicker">{world.subtitle.toUpperCase()}</div>
        <h3>{world.name}</h3>
        <p>{world.arrivalBrief}</p>
        <div className="settlement-score"><strong>{forecast.score}%</strong><span>projected viability</span></div>
        <div className="forecast-meter" role="progressbar" aria-label={`${world.name} viability`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={forecast.score}><i style={{ width: `${forecast.score}%` }} /></div>
      </section>

      {coldWakeSequence && (
        <section className="continuity-panel cold-wake-commissioning" data-guide-target="planet-current-step" aria-labelledby="cold-wake-commissioning-title">
          <header>
            <div>
              <span>COLD WAKE // STAGED COMMISSIONING</span>
              <h3 id="cold-wake-commissioning-title">One restoration step at a time</h3>
            </div>
            <small>Step {coldWakeSequence.stepNumber} / {coldWakeSequence.stepCount}</small>
          </header>
          <div className="cold-wake-active-step">
            <span>ACTIVE STEP</span>
            <strong>{coldWakeSequence.label}</strong>
            <p>{coldWakeSequence.detail}</p>
            <div className="forecast-line-meter" role="progressbar" aria-label={coldWakeSequence.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(coldWakeSequence.progress * 100)}>
              <i style={{ width: `${Math.min(1, Math.max(0, coldWakeSequence.progress)) * 100}%` }} />
            </div>
            {coldWakeSequence.actionLabel && onColdWakeAction && (
              <button className="forecast-action" type="button" disabled={coldWakeSequence.actionDisabled} onClick={onColdWakeAction}>{coldWakeSequence.actionLabel}</button>
            )}
          </div>
          <p className="crew-rarity-note">Nothing else on this page needs attention yet. Finished systems collapse into the requirement ledger; the next destination appears only when this step is secure.</p>
        </section>
      )}

      {pelagosSequence && (
        <section className="continuity-panel pelagos-signal-sequence" data-guide-target="pelagos-signal-sequence" aria-labelledby="pelagos-signal-sequence-title">
          <header>
            <div>
              <span>PELAGOS ORBIT // FIRST CONTACT</span>
              <h3 id="pelagos-signal-sequence-title">Restore contact one system at a time</h3>
            </div>
            <small>Step {pelagosSequence.stepNumber} / {pelagosSequence.stepCount}</small>
          </header>
          <div className="pelagos-signal-step">
            <span>ACTIVE OPERATION</span>
            <strong>{pelagosSequence.label}</strong>
            <p>{pelagosSequence.detail}</p>
            <div className="forecast-line-meter" role="progressbar" aria-label={pelagosSequence.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pelagosSequence.progress * 100)}>
              <i style={{ width: `${Math.min(1, Math.max(0, pelagosSequence.progress)) * 100}%` }} />
            </div>
            <small>{pelagosSequence.status}</small>
            {pelagosSequence.actionLabel && onPelagosAction && (
              <button className="forecast-action" type="button" disabled={pelagosSequence.actionDisabled} onClick={onPelagosAction}>{pelagosSequence.actionLabel}</button>
            )}
          </div>
          <div className="pelagos-sequence-preview">
            <span className={pelagosSequence.stepNumber > 1 ? "is-complete" : "is-active"}>01 Receiver</span>
            <span className={pelagosSequence.stepNumber > 2 ? "is-complete" : pelagosSequence.stepNumber === 2 ? "is-active" : ""}>02 Habitat</span>
            <span className={pelagosSequence.stepNumber > 3 ? "is-complete" : pelagosSequence.stepNumber === 3 ? "is-active" : ""}>03 Broadcast</span>
            <span className={pelagosSequence.stepNumber > 4 ? "is-complete" : pelagosSequence.stepNumber === 4 ? "is-active" : ""}>04 Listen</span>
            <span className={pelagosSequence.stepNumber === 5 ? "is-active" : ""}>05 Rescue</span>
          </div>
          <p className="crew-rarity-note">Later settlement requirements remain folded away until witnesses are safely aboard. Nothing here expires, and listening continues while the game is closed.</p>
        </section>
      )}

      {pendingTransmission && (
        <section className="continuity-panel departure-panel">
          <header><div><span>COLONY TRANSMISSION</span><h3>{pendingTransmission.colonyName}</h3></div><small>Legacy settlements remain alive</small></header>
          <blockquote>{pendingTransmission.transmission}</blockquote>
          <button className="forecast-action" type="button" onClick={onAcknowledgeTransmission}>Archive transmission</button>
        </section>
      )}

      {finalDoctrine && (
        <section className="continuity-panel campaign-complete" aria-labelledby="continuity-final-doctrine-title">
          {finalDoctrine.chosen ? (
            <>
              <span>CONTINUITY DOCTRINE // RECORDED</span>
              <h3 id="continuity-final-doctrine-title">{finalDoctrine.chosen.title}</h3>
              <p>{finalDoctrine.chosen.commitment}</p>
              <blockquote>{finalDoctrine.chosen.lyraResponse}</blockquote>
              <p>{finalDoctrine.chosen.epilogue}</p>
              <small>The choice is written beneath the reset layer. This campaign will remember.</small>
            </>
          ) : (
            <>
              <span>CONTINUITY DOCTRINE // FINAL AUTHORITY</span>
              <h3 id="continuity-final-doctrine-title">The Vesper Choice</h3>
              <p>The recovered record does not support AXIOM&apos;s bootstrap history. Choose what the Foundry carries into the next reality.</p>
              <div className="doctrine-grid">
                {finalDoctrine.options.map((doctrine) => (
                  <article className={doctrine.available ? "available" : "locked"} key={doctrine.id}>
                    <span>{doctrine.available ? "Doctrine available" : "Evidence incomplete"}</span>
                    <strong>{doctrine.shortName}</strong>
                    <p>{doctrine.thesis}</p>
                    <button type="button" disabled={!doctrine.available || !onChooseFinalDoctrine} onClick={() => onChooseFinalDoctrine?.(doctrine.id)}>
                      {doctrine.available ? doctrine.choiceLabel : `${doctrine.recordsRequired} records required`}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {!pelagosSequence && (
      <div className="settlement-flow-region">
      <div className="settlement-layout">
        <section className="continuity-panel" data-guide-target="planet-requirements">
          <header><div><span>CONTINUITY REQUIREMENTS</span><h3>{forecast.deficits.length === 0 ? "Every requirement is met" : `${forecast.deficits.length} deficits remain`}</h3></div><div className="continuity-header-help"><small>Nothing expires</small><HelpTrigger label="Explain Continuity requirements" onClick={() => onOpenHelp("settlement")} /></div></header>
          <div className="continuity-readiness-overview">
            <div><span>SECURED</span><strong>{securedRequirementCount}</strong></div>
            <div><span>REMAINING</span><strong>{forecast.deficits.length}</strong></div>
            <p>The action board beside this readout shows only what still needs attention.</p>
          </div>
          <details className="continuity-requirement-ledger">
            <summary><span>FULL REQUIREMENT TELEMETRY</span><strong>Review all {forecast.lines.length} calculations</strong></summary>
            <div className="forecast-list">
              {forecast.lines.map((line) => {
                const ratio = Math.min(1, line.currentValue / Math.max(1, line.requiredValue));
                return (
                  <article className={`forecast-line ${line.met ? "is-met" : ""}`} key={`${line.kind}-${line.id}`}>
                    <header><span>{line.label}</span><strong>{line.currentValue}/{line.requiredValue}</strong></header>
                    <div className="forecast-line-meter"><i style={{ width: `${ratio * 100}%` }} /></div>
                    <small>{line.met ? "Requirement secured" : line.kind === "community" && line.substitutionValue > 0 ? `${line.substitutionValue} from profession diversity and planetary works` : line.substitutionValue > 0 ? `${line.substitutionValue} supplied by research or equipment` : titleCase(line.kind)}</small>
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
          </details>
        </section>

        <section className="continuity-panel" data-guide-target="planet-deficits">
          <header><div><span>EXPLICIT DEFICITS</span><h3>What this world still needs</h3></div><small>Profile gates are visible · quality safety net active</small></header>
          {forecast.deficits.length > 0 ? (
            <ul className="deficit-list">
              {forecast.deficits.map((deficit) => {
                const candidates = candidatesForDeficit(deficit, world, crew, selected);
                return (
                  <li key={`${deficit.kind}-${deficit.id}`}>
                    <strong>{deficit.message}</strong>
                    {deficit.alternatives.map((alternative) => <span key={alternative}>{alternative}</span>)}
                    {candidates !== null && (
                      candidates.length > 0 ? (
                        <div className="deficit-candidates" aria-label={`Available crew for ${deficit.label}`}>
                          <small>Add to founders:</small>
                          {candidates.map((candidate) => (
                            <button
                              className={`deficit-candidate crew-rarity-${candidate.rarity}`}
                              type="button"
                              key={candidate.id}
                              onClick={() => onToggleSettler(candidate.id)}
                            >
                              {candidate.name}
                              <b>+{candidate.value}</b>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="deficit-candidates-empty">No unselected crew can cover this yet — rescue, train, or fabricate equipment.</span>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="continuity-empty-state"><strong>{world.name} can continue independently.</strong><p>Review the founders and make the departure decision when you are ready.</p></div>
          )}
          {(onOpenPopulation || onOpenResearch) && (
            <div className="crew-actions-grid">
              {onOpenPopulation && <button className="forecast-action" type="button" onClick={onOpenPopulation}>Recruit or train crew</button>}
              {onOpenResearch && <button className="forecast-action" type="button" onClick={onOpenResearch}>Open Research Lattice</button>}
            </div>
          )}
        </section>
      </div>

      {(!coldWakeSequence || coldWakeSequence.stepNumber >= 3) && (
      <div className="settlement-layout">
        <section className="continuity-panel" data-guide-target="planet-world-works">
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
            {world.equipment.map((definition) => {
              const owned = progress.equipment[definition.id] ?? 0;
              const complete = owned >= definition.maxUnits;
              const quote = equipmentQuotes[definition.id];
              return (
                <article className={`world-progress-action ${complete ? "is-complete" : ""}`} key={definition.id}>
                  <div>
                    <strong>{definition.name}</strong>
                    <small>{owned}/{definition.maxUnits} built · {definition.description}</small>
                  </div>
                  {complete ? (
                    <span>DEPLOYED</span>
                  ) : (
                    <button type="button" disabled={!quote?.canAfford} onClick={() => onFabricateEquipment(definition.id)}>{quote?.costLabel ?? "Unavailable"}</button>
                  )}
                </article>
              );
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

        <div className="settlement-side-column">
        {world.settlementRequired && (
        <section className="continuity-panel" data-guide-target="planet-founding">
          <header><div><span>{world.settlementRequired ? "FOUNDING COMMUNITY" : "ORBITAL TRANSITION"}</span><h3>{world.settlementRequired ? `${forecast.selectedSettlerIds.length}/${MAX_FOUNDING_COMMUNITY_SIZE} people selected` : "No founders required in deep space"}</h3></div><small>The Ark never releases more than half its full crew capacity</small></header>
          <div className="settler-selection-list">
              {crew.map((member) => (
                <label className={`${member.rarity ? `crew-rarity-${member.rarity}` : ""} ${selected.has(member.id) ? "is-selected" : ""}`} key={member.id}>
                  <input type="checkbox" disabled={member.available === false || member.canSettle === false || (!selected.has(member.id) && selected.size >= MAX_FOUNDING_COMMUNITY_SIZE)} checked={selected.has(member.id)} onChange={() => onToggleSettler(member.id)} />
                  <span className="crew-avatar">{member.name.slice(0, 1)}</span>
                  <span><strong>{member.name}</strong><small>{titleCase(member.ageGroup ?? "adult")} · {titleCase(member.role ?? "civilian")}{(member.level ?? 0) > 0 ? ` · Level ${member.level}` : ""} · Readiness +{getCommunityReadinessContribution(member)} · {Object.entries(member.expertise ?? {}).filter(([, value]) => (value ?? 0) > 0).slice(0, 3).map(([id, value]) => `${titleCase(id)} ${value}`).join(" · ") || "Community member"}</small></span>
                  <span className="settler-row-status"><em className="crew-rarity-badge" title={member.rarityDescription}>{member.rarityLabel ?? "Standard"}</em><b>{member.protectedForArk ? "ARK PROTECTED" : member.available === false || member.canSettle === false ? "UNAVAILABLE" : selected.has(member.id) ? "FOUNDER" : selected.size >= MAX_FOUNDING_COMMUNITY_SIZE ? "LIMIT" : "ARK"}</b></span>
                </label>
              ))}
          </div>
        </section>
        )}

        <section className="continuity-panel departure-panel" data-guide-target="planet-departure">
          <header><div><span>DEPARTURE AUTHORITY</span><h3>{forecast.canDepart && !departureHold ? `AXIOM may leave ${world.name}` : `The Ark is still needed at ${world.name}`}</h3></div><small>{world.continuityProtocolExcerpt}</small></header>
          <blockquote>{world.departureQuestion}</blockquote>
          {departureHold && <p className="crew-rarity-note"><strong>DEPARTURE HOLD:</strong> {departureHold}</p>}
          {world.settlementRequired && <input className="colony-name-input" value={colonyName} maxLength={64} onChange={(event) => setColonyName(event.target.value)} aria-label="Settlement name" />}
          <button className="settlement-action" type="button" disabled={!forecast.canDepart || Boolean(departureHold)} onClick={() => onDepart(colonyName)}>{world.settlementRequired ? `Establish settlement and depart ${world.name}` : "Commit Pelagos orbital insertion"}</button>
        </section>
        </div>
      </div>
      )}
      </div>
      )}

      {planetaryDefenseActive && colonies.length > 0 && (
        <section className="continuity-panel planetary-defense-panel">
          <header>
            <div><span>RESTORED-WORLD DEFENSE</span><h3>Planetary reality-anchor network</h3></div>
            <small>{Math.round(planetaryDefenseLoad * 10_000) / 100}% Foundry output diverted</small>
          </header>
          <p className="crew-rarity-note">The contacts have recognized that restored worlds create new futures. They target reality anchors and continuity cores, not territory. Every attack resolves automatically; a breach causes temporary instability, never colony deletion.</p>

          <div className="planetary-doctrine-grid">
            {(Object.keys(PLANETARY_DEFENSE_DOCTRINES) as PlanetaryDefenseDoctrine[]).map((id) => {
              const definition = PLANETARY_DEFENSE_DOCTRINES[id];
              const active = planetaryDefense.doctrine === id;
              return <button type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => onPlanetaryDoctrine(id)} key={id}><span>{definition.label}</span><strong>{definition.upkeepPerColony * 100}% per world</strong><small>{definition.summary}</small></button>;
            })}
          </div>

          {planetaryForecast ? (
            <div className="planetary-attack-forecast">
              <span>INCOMING // {titleCase(planetaryForecast.signature)}</span>
              <strong>{planetaryForecast.colonyName} · severity {planetaryForecast.severity}</strong>
              <p>Readiness {planetaryForecast.readiness}/100. Arrival in {Math.ceil(planetaryForecast.secondsUntil / 60)} minutes. The standing network resolves it automatically.</p>
            </div>
          ) : (
            <div className="continuity-empty-state"><strong>No restored world is under active interdiction.</strong><p>The network remains powered and attacks will be forecast here before they resolve.</p></div>
          )}

          {planetaryDefense.construction && (
            <div className="planetary-construction-status">
              <span>CONSTRUCTION IN PROGRESS</span>
              <strong>{PLANETARY_INSTALLATION_DEFINITIONS[planetaryDefense.construction.installationId].name} · {getCampaignWorld(planetaryDefense.construction.worldId)?.name}</strong>
              <small>{Math.ceil(planetaryDefense.construction.remainingSeconds / 60)} minutes of base work remain; Engineers and construction drones accelerate it offline.</small>
            </div>
          )}

          <div className="planetary-network-list">
            {colonies.map((colony) => {
              const network = planetaryDefense.networks[colony.worldId];
              if (!network) return null;
              const quotes = planetaryDefenseQuotes[colony.worldId];
              return (
                <article key={colony.worldId}>
                  <header><div><span>{getCampaignWorld(colony.worldId)?.name.toUpperCase()}</span><strong>{colony.name}</strong></div><b>{getPlanetaryNetworkReadiness(network, planetaryDefense.doctrine)}/100</b></header>
                  {network.recoveryRemainingSeconds > 0 && <p className="network-instability">Temporary instability: +{Math.round(network.instability * 1000) / 10}% operational load for {Math.ceil(network.recoveryRemainingSeconds / 60)} more minutes.</p>}
                  <div className="planetary-installation-grid">
                    {planetaryInstallationIds.map((installationId) => {
                      const definition = PLANETARY_INSTALLATION_DEFINITIONS[installationId];
                      const quote = quotes?.[installationId];
                      return <div key={installationId}><span>{definition.name}</span><strong>Level {network.installations[installationId]}/{MAX_PLANETARY_INSTALLATION_LEVEL}</strong><small>{definition.description}</small><button type="button" disabled={!quote?.canBuild} onClick={() => onPlanetaryConstruction(colony.worldId, installationId)}>{quote?.maxed ? "MAXED" : quote?.busy ? "Another project active" : quote?.costLabel ?? "Unavailable"}</button></div>;
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          {planetaryDefense.causalFragmentIds.length > 0 && (
            <div className="planetary-fragment-list">
              {CAUSAL_FRAGMENT_DEFINITIONS.filter((fragment) => planetaryDefense.causalFragmentIds.includes(fragment.id)).map((fragment) => <article key={fragment.id}><span>CAUSAL FRAGMENT</span><strong>{fragment.title}</strong><p>{fragment.text}</p></article>)}
            </div>
          )}

          {planetaryDefense.eventLog.length > 0 && (
            <details className="forecast-line-detail planetary-incident-log">
              <summary>{planetaryDefense.eventLog.length} restored-world incident reports</summary>
              {[...planetaryDefense.eventLog].reverse().map((event, index) => <p key={`${event.resolvedAtSeconds}-${index}`}><strong>{event.colonyName}: {event.outcome.toUpperCase()}</strong> · {titleCase(event.signature)} · margin {event.margin >= 0 ? "+" : ""}{Math.round(event.margin)} · {event.repairSeconds > 0 ? `${Math.ceil(event.repairSeconds / 3600)}h temporary recovery` : "network stable"} · +{event.salvage} Salvage</p>)}
            </details>
          )}
        </section>
      )}

      {colonies.length > 0 && (
        <section className="continuity-panel">
          <header><div><span>RESTORED WORLDS</span><h3>Colonies that continue without the Ark</h3></div><small>{colonies.length} active relays</small></header>
          <div className="colony-list">{colonies.map((colony) => { const restoredWorld = getCampaignWorld(colony.worldId); const adaptationCount = colony.founders.reduce((total, founder) => total + (founder.adaptationIds ?? []).length, 0); return <article key={colony.worldId}><h4>{colony.name}</h4><p>{colony.founders.length} founders · {colony.viabilityScore}% departure viability{adaptationCount > 0 ? ` · ${adaptationCount} voluntary adaptation record${adaptationCount === 1 ? "" : "s"} preserved` : ""}</p><small>{restoredWorld?.legacyBenefits.map((benefit) => `${benefit.label}: +${Math.round(benefit.value * 100)}% ${benefit.metric.replaceAll("-", " ")}`).join(" · ") || `${titleCase(colony.worldId)} relay online`}</small></article>; })}</div>
        </section>
      )}
    </section>
  );
}

export default SettlementConsole;
