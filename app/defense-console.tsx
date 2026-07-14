"use client";

import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  DEFENSE_CAUSAL_FRAGMENTS,
  DEFENSE_DOCTRINE_DEFINITIONS,
  DEFENSE_EVENT_DEFINITIONS,
  DEFENSE_INSTALLATION_DEFINITIONS,
  ENVIRONMENTAL_DOCTRINE_DEFINITIONS,
  MAX_INSTALLATION_MARK,
  getDefenseReadinessBreakdown,
  getDoctrineDefinition,
  getForecastLeadSeconds,
  getIncomingForecast,
  getRepairSpeedMultiplier,
  type DefenseCrewContext,
  type DefenseDoctrine,
  type DefenseInstallationId,
  type DefenseState,
  type EnvironmentalDoctrine,
} from "./defense-engine";
import type { CausalArchiveView } from "./causal-archive-engine";

export type DefenseInstallationQuoteView = {
  mark: number;
  targetMark: number;
  maxed: boolean;
  busy: boolean;
  researchMet: boolean;
  canAfford: boolean;
  capability: string;
  costLabel: string;
  durationLabel: string;
};
export type DefenseConsoleProps = {
  state: DefenseState;
  causalArchive: CausalArchiveView;
  crew: DefenseCrewContext;
  crewNames: Readonly<Record<string, string>>;
  currentLocationName: string;
  stormsEnabled: boolean;
  hostilesEnabled: boolean;
  installationQuotes: Readonly<Record<DefenseInstallationId, DefenseInstallationQuoteView>>;
  onBuyInstallation: (id: DefenseInstallationId) => void;
  onChooseContactDoctrine: (doctrine: DefenseDoctrine) => void;
  onChooseEnvironmentalDoctrine: (doctrine: EnvironmentalDoctrine) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

const INSTALLATION_IDS: readonly DefenseInstallationId[] = ["shieldArray", "repairDrones", "pointDefense", "earlyWarningRelay"];
const CONTACT_DOCTRINES: readonly DefenseDoctrine[] = ["defend", "evade", "intercept", "observe"];
const ENVIRONMENT_DOCTRINES: readonly EnvironmentalDoctrine[] = ["brace", "harvest", "outrun"];
const MARKS = ["OFFLINE", "MARK I", "MARK II", "MARK III", "MARK IV"] as const;
const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m ${String(safe % 60).padStart(2, "0")}s`;
};
const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function DefenseConsole({
  state,
  causalArchive,
  crew,
  crewNames,
  currentLocationName,
  stormsEnabled,
  hostilesEnabled,
  installationQuotes,
  onBuyInstallation,
  onChooseContactDoctrine,
  onChooseEnvironmentalDoctrine,
  onOpenHelp,
  onBack,
}: DefenseConsoleProps) {
  const readiness = getDefenseReadinessBreakdown(state, crew);
  const forecast = getIncomingForecast(state, crew.navigators, crew.researchForecastSeconds);
  const leadSeconds = getForecastLeadSeconds(state, crew.navigators, crew.researchForecastSeconds);
  const repairSpeed = getRepairSpeedMultiplier(state, crew.engineers, crew.researchRepairMultiplier);
  const eventDefinition = forecast ? DEFENSE_EVENT_DEFINITIONS[forecast.kind] : null;
  const forecastDoctrine = forecast
    ? getDoctrineDefinition(forecast.hostile ? state.contactDoctrine : state.environmentalDoctrine)
    : null;
  const construction = state.construction;
  const constructionProgress = construction
    ? Math.min(1, construction.progressSeconds / Math.max(1, construction.totalSeconds))
    : 0;

  return (
    <section className="continuity-console defense-console" aria-labelledby="defense-console-title">
      <header className="continuity-console-header defense-command-header">
        <div>
          <p>THREAT OPERATIONS // {currentLocationName.toUpperCase()}</p>
          <h2 id="defense-console-title">Ark Defense Grid</h2>
          <span>Environmental hazards and hostile contacts use separate standing orders. Every resolution remains automatic online and offline.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band defense-summary-band">
        <div><span>Total readiness</span><strong>{readiness.total}/100</strong><small>Bounded preparation</small></div>
        <div><span>Environmental</span><strong>{ENVIRONMENTAL_DOCTRINE_DEFINITIONS[state.environmentalDoctrine].label}</strong><small>Weather standing order</small></div>
        <div><span>Contacts</span><strong>{DEFENSE_DOCTRINE_DEFINITIONS[state.contactDoctrine].label}</strong><small>Vessel standing order</small></div>
        <div><span>Forecast lead</span><strong>{formatCountdown(leadSeconds)}</strong></div>
        <div><span>Repair speed</span><strong>x{repairSpeed.toFixed(2)}</strong></div>
        <div className="continuity-summary-help"><span>Manual <HelpTrigger label="Explain the Defense page" onClick={() => onOpenHelp("defense")} /></span><strong>{state.stats.injuries} injuries</strong></div>
      </div>

      <section className="continuity-panel defense-readiness-ledger">
        <header><div><span>READINESS LEDGER</span><h3>What will actually answer the next threat</h3></div><small>No hidden multipliers</small></header>
        <div className="defense-readiness-sources">
          <article><span>Shield Array</span><strong>+{readiness.installation.shield}</strong></article>
          <article><span>Repair Swarms</span><strong>+{readiness.installation.repair}</strong></article>
          <article><span>Point Defense</span><strong>+{readiness.installation.pointDefense}</strong></article>
          <article><span>On-duty crew</span><strong>+{readiness.personnel}</strong></article>
          <article><span>Research</span><strong>+{readiness.research}</strong></article>
          <article><span>Armory + interceptors</span><strong>+{readiness.equipment + readiness.interceptors}</strong></article>
        </div>
      </section>

      {(state.firstContactResolved || causalArchive.score > 0) && (
        <section className="continuity-panel causal-archive-status">
          <header>
            <div><span>CAUSAL ARCHIVE // {causalArchive.activeClassification.code}</span><h3>{causalArchive.activeClassification.label}</h3></div>
            <small>{causalArchive.recoveredEvidence.length}/{causalArchive.totalEvidence} evidence entries indexed</small>
          </header>
          <p>{causalArchive.activeClassification.summary}</p>
          <div className="causal-classification-track">
            {causalArchive.classifications.map((classification) => (
              <article className={classification.unlocked ? "is-unlocked" : "is-locked"} key={classification.id}>
                <span>{classification.code}</span>
                <strong>{classification.unlocked ? classification.label : "CLASSIFIED"}</strong>
                <small>{classification.unlocked ? classification.operationalBenefit : `${classification.threshold} evidence + supporting analysis`}</small>
              </article>
            ))}
          </div>
          {causalArchive.nextClassification ? (
            <div className="causal-next-stage"><span>Next classification</span><strong>{causalArchive.evidenceToNext} more evidence {causalArchive.evidenceToNext === 1 ? "entry" : "entries"}, plus its Research prerequisites</strong></div>
          ) : (
            <div className="causal-next-stage"><span>Current boundary</span><strong>The archive has a name, not an answer. Motive remains unresolved.</strong></div>
          )}
        </section>
      )}

      {state.compromise && (
        <section className="continuity-panel defense-compromise is-compromised">
          <header><div><span>ACTIVE COMPROMISE</span><h3>{titleCase(state.compromise.kind)}</h3></div><small>Automatic purge in {formatCountdown(state.compromise.remainingSeconds)}</small></header>
          <p>The {titleCase(state.compromise.target)} system diverts {Math.round(state.compromise.operationalLoad * 100)}% production{state.compromise.suppressedAutomationProgram ? ` and suppresses ${titleCase(state.compromise.suppressedAutomationProgram)}` : ""}. Nothing was deleted; closing the game does not pause recovery.</p>
        </section>
      )}

      <section className={`continuity-panel defense-forecast-panel ${forecast ? "is-online" : ""}`}>
        <header>
          <div><span>{forecast?.hostile ? "CONTACT FORECAST" : "ENVIRONMENTAL FORECAST"}</span><h3>{forecast && eventDefinition ? `${eventDefinition.label}${forecast.severityKnown ? ` - severity ${forecast.severity}` : " - signature incomplete"}` : state.damage ? "Repairs underway" : "No threat currently tracked"}</h3></div>
          <small>{forecast ? "Automatic resolution" : hostilesEnabled ? "Retrograde sweep active" : stormsEnabled ? "Hazard sweep active" : "Quiet region"}</small>
        </header>
        {forecast && eventDefinition && forecastDoctrine ? (
          <div className="defense-forecast-body">
            <strong>{eventDefinition.label} reaches the Ark in {formatCountdown(forecast.secondsUntil)}.</strong>
            <p>{eventDefinition.summary} Target: <b>{titleCase(forecast.target)}</b>.</p>
            <div className="defense-outcome-projection">
              <span>Standing order</span><strong>{forecastDoctrine.label}</strong>
              <span>Projected base margin</span><strong>{forecast.severityKnown ? `${readiness.total + forecastDoctrine.marginModifier - (forecast.hostile ? 34 : 30) * forecast.severity}` : "Pending severity lock"}</strong>
            </div>
            {forecast.hostile && <p>Evade guarantees no automatic crew injury. Armor and Shield Marks reduce harm under the other contact doctrines.</p>}
          </div>
        ) : state.damage ? (
          <div className="continuity-empty-state"><strong>Hull recovering: -{Math.round(state.damage.productionPenalty * 100)}% production.</strong><p>{formatCountdown(state.damage.repairRemainingSeconds / repairSpeed)} remains.</p></div>
        ) : (
          <div className="continuity-empty-state"><strong>The Ark is listening.</strong><p>Transit weather is route-specific. Orbital weather cannot follow the Ark after departure.</p></div>
        )}
      </section>

      <div className="defense-doctrine-columns">
        <section className="continuity-panel">
          <header><div><span>ENVIRONMENTAL DOCTRINE</span><h3>Asteroids, debris, storms, and Null shear</h3></div><small>Offline standing order</small></header>
          <div className="defense-doctrine-stack">
            {ENVIRONMENT_DOCTRINES.map((id) => {
              const doctrine = ENVIRONMENTAL_DOCTRINE_DEFINITIONS[id];
              const active = state.environmentalDoctrine === id;
              return <article key={id} className={active ? "is-active" : ""}><div><span>{doctrine.label}</span><strong>{doctrine.marginModifier >= 0 ? `+${doctrine.marginModifier}` : doctrine.marginModifier} margin - x{doctrine.rewardMultiplier} recovery</strong><p>{doctrine.summary}</p></div><button type="button" disabled={active} onClick={() => onChooseEnvironmentalDoctrine(id)}>{active ? "ACTIVE" : "Adopt"}</button></article>;
            })}
          </div>
        </section>

        <section className="continuity-panel">
          <header><div><span>CONTACT DOCTRINE</span><h3>Retrograde probes and unknown vessels</h3></div><small>Activates on the Nox route</small></header>
          <div className="defense-doctrine-stack">
            {CONTACT_DOCTRINES.map((id) => {
              const doctrine = DEFENSE_DOCTRINE_DEFINITIONS[id];
              const active = state.contactDoctrine === id;
              return <article key={id} className={active ? "is-active" : ""}><div><span>{doctrine.label}</span><strong>{doctrine.marginModifier >= 0 ? `+${doctrine.marginModifier}` : doctrine.marginModifier} margin - x{doctrine.rewardMultiplier} recovery</strong><p>{doctrine.summary}</p></div><button type="button" disabled={active} onClick={() => onChooseContactDoctrine(id)}>{active ? "ACTIVE" : "Adopt"}</button></article>;
            })}
          </div>
        </section>
      </div>

      <section className="continuity-panel defense-installation-program">
        <header><div><span>INSTALLATION PROGRAM</span><h3>Permanent Mark architecture</h3></div><small>One offline project at a time</small></header>
        {construction && (
          <div className="defense-construction-banner">
            <div><span>ACTIVE PROJECT</span><strong>{DEFENSE_INSTALLATION_DEFINITIONS[construction.installationId].name} - {MARKS[construction.targetMark]}</strong><small>{formatCountdown(Math.max(0, construction.totalSeconds - construction.progressSeconds))} base work remaining before Expertise and drone acceleration</small></div>
            <div className="defense-construction-track"><i style={{ width: `${constructionProgress * 100}%` }} /></div>
          </div>
        )}
        <div className="defense-installation-grid">
          {INSTALLATION_IDS.map((id) => {
            const definition = DEFENSE_INSTALLATION_DEFINITIONS[id];
            const quote = installationQuotes[id];
            return (
              <article key={id} className={quote.mark > 0 ? "is-online" : ""}>
                <header><span>{definition.name}</span><strong>{MARKS[quote.mark]}</strong></header>
                <p>{definition.description}</p>
                <div className="defense-mark-pips" aria-label={`${quote.mark} of ${MAX_INSTALLATION_MARK} Marks complete`}>{Array.from({ length: MAX_INSTALLATION_MARK }, (_, index) => <i className={index < quote.mark ? "is-filled" : ""} key={index} />)}</div>
                <small>{quote.maxed ? "Architecture complete." : `Next capability: ${quote.capability}`}</small>
                <small>{quote.maxed ? "No further project." : `${quote.durationLabel} construction - ${quote.costLabel}`}</small>
                <button type="button" disabled={quote.maxed || quote.busy || !quote.canAfford} onClick={() => onBuyInstallation(id)}>{quote.maxed ? "MARK IV COMPLETE" : quote.busy ? "PROJECT BAY OCCUPIED" : !quote.researchMet ? "RESEARCH REQUIRED" : `Begin ${MARKS[quote.targetMark]}`}</button>
              </article>
            );
          })}
        </div>
      </section>

      {state.causalFragmentIds.length > 0 && (
        <section className="continuity-panel causal-fragment-panel">
          <header><div><span>CAUSAL FRAGMENTS</span><h3>Evidence the contacts failed to erase</h3></div><small>{state.causalFragmentIds.length}/{DEFENSE_CAUSAL_FRAGMENTS.length} recovered</small></header>
          <div className="causal-fragment-grid">{DEFENSE_CAUSAL_FRAGMENTS.filter((fragment) => state.causalFragmentIds.includes(fragment.id)).map((fragment) => <article key={fragment.id}><span>FRAGMENT</span><strong>{fragment.title}</strong><p>{fragment.text}</p></article>)}</div>
        </section>
      )}

      <section className="continuity-panel">
        <header><div><span>INCIDENT REPORTS</span><h3>{state.eventLog.length > 0 ? `${state.eventLog.length} resolutions recorded` : "No events yet"}</h3></div><small>Newest first</small></header>
        {state.eventLog.length === 0 ? (
          <div className="continuity-empty-state"><strong>Nothing has tested the Ark yet.</strong><p>Reports will name the threat class, target, doctrine, preparation, injuries, compromise, rewards, and recovery.</p></div>
        ) : (
          <ul className="deficit-list defense-event-log">
            {[...state.eventLog].reverse().map((event, index) => (
              <li key={`${event.resolvedAtSeconds}-${index}`}>
                <strong>{DEFENSE_EVENT_DEFINITIONS[event.kind].label} - {DEFENSE_EVENT_DEFINITIONS[event.kind].hostile ? "CONTACT" : "ENVIRONMENT"} - {titleCase(event.target)} - severity {event.severity} - {event.outcome.toUpperCase()} ({getDoctrineDefinition(event.doctrine).label}, margin {event.margin >= 0 ? "+" : ""}{Math.round(event.margin)})</strong>
                <span>{event.injuries.length > 0 ? `Injured: ${event.injuries.map((injury) => `${crewNames[injury.crewId] ?? "Crew member"} (-${injury.damage} health)`).join(", ")} - ` : "No crew injury - "}{event.compromise ? `${titleCase(event.compromise.kind)} for ${formatCountdown(event.compromise.remainingSeconds)} - ` : "No compromise - "}{event.salvage > 0 ? `+${event.salvage} Salvage - ` : ""}{event.engineeringModels > 0 ? `+${event.engineeringModels} Models - ` : ""}{event.calibrationData > 0 ? `+${event.calibrationData} Calibration - ` : ""}{event.nullTraces > 0 ? `+${event.nullTraces} Null Traces - ` : ""}{event.productionPenalty > 0 ? `-${Math.round(event.productionPenalty * 100)}% production while repaired` : "hull stable"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default DefenseConsole;
