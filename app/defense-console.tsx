"use client";

import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  DEFENSE_CAUSAL_FRAGMENTS,
  DEFENSE_DOCTRINE_DEFINITIONS,
  DEFENSE_EVENT_DEFINITIONS,
  DEFENSE_INSTALLATION_DEFINITIONS,
  MAX_INSTALLATION_LEVEL,
  getDefenseReadiness,
  getForecastLeadSeconds,
  getIncomingForecast,
  getRepairSpeedMultiplier,
  type DefenseCrewContext,
  type DefenseDoctrine,
  type DefenseInstallationId,
  type DefenseState,
} from "./defense-engine";

export type DefenseInstallationQuoteView = { cost: number; level: number; maxed: boolean; canAfford: boolean; costLabel: string };
export type DefenseConsoleProps = {
  state: DefenseState;
  crew: DefenseCrewContext;
  crewNames: Readonly<Record<string, string>>;
  currentWorldName: string;
  stormsEnabled: boolean;
  hostilesEnabled: boolean;
  installationQuotes: Readonly<Record<DefenseInstallationId, DefenseInstallationQuoteView>>;
  onBuyInstallation: (id: DefenseInstallationId) => void;
  onChooseDoctrine: (doctrine: DefenseDoctrine) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

const INSTALLATION_IDS: readonly DefenseInstallationId[] = ["shieldArray", "repairDrones", "pointDefense", "earlyWarningRelay"];
const DOCTRINE_IDS: readonly DefenseDoctrine[] = ["defend", "evade", "intercept", "observe"];
const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m ${String(safe % 60).padStart(2, "0")}s`;
};
const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function DefenseConsole({
  state,
  crew,
  crewNames,
  currentWorldName,
  stormsEnabled,
  hostilesEnabled,
  installationQuotes,
  onBuyInstallation,
  onChooseDoctrine,
  onOpenHelp,
  onBack,
}: DefenseConsoleProps) {
  const readiness = getDefenseReadiness(state, crew);
  const forecast = getIncomingForecast(state, crew.navigators, crew.researchForecastSeconds);
  const leadSeconds = getForecastLeadSeconds(state, crew.navigators, crew.researchForecastSeconds);
  const repairSpeed = getRepairSpeedMultiplier(state, crew.engineers, crew.researchRepairMultiplier);
  const eventDefinition = forecast ? DEFENSE_EVENT_DEFINITIONS[forecast.kind] : null;

  return (
    <section className="continuity-console defense-console" aria-labelledby="defense-console-title">
      <header className="continuity-console-header">
        <div>
          <p>THREAT OPERATIONS // {currentWorldName.toUpperCase()}</p>
          <h2 id="defense-console-title">Defense readiness and standing doctrine</h2>
          <span>Events resolve automatically online and offline. Crew can be injured after Nox, but automatic events never kill them or erase progress.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band">
        <div title={`Research +${crew.researchReadiness ?? 0} · Equipment +${crew.equipmentReadiness ?? 0} · Interceptors +${crew.interceptorReadiness ?? 0}`}><span>Readiness</span><strong>{readiness}/100</strong><small>Every source is included</small></div>
        <div><span>Doctrine</span><strong>{DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].label}</strong></div>
        <div><span>Forecast lead</span><strong>{formatCountdown(leadSeconds)}</strong></div>
        <div><span>Repair speed</span><strong>×{repairSpeed.toFixed(2)}</strong></div>
        <div><span>Hostile contacts</span><strong>{state.stats.hostileResolved}</strong></div>
        <div className="continuity-summary-help"><span>Manual <HelpTrigger label="Explain the Defense page" onClick={() => onOpenHelp("defense")} /></span><strong>{state.stats.injuries} injuries</strong></div>
      </div>

      {state.compromise && (
        <section className="continuity-panel defense-compromise is-compromised">
          <header><div><span>ACTIVE COMPROMISE</span><h3>{titleCase(state.compromise.kind)}</h3></div><small>Automatic purge in {formatCountdown(state.compromise.remainingSeconds)}</small></header>
          <p>The {titleCase(state.compromise.target)} system is quarantined. It diverts {Math.round(state.compromise.operationalLoad * 100)}% production{state.compromise.suppressedAutomationProgram ? ` and suppresses ${titleCase(state.compromise.suppressedAutomationProgram)}` : ""}. Nothing was deleted; closing the game does not pause recovery.</p>
        </section>
      )}

      <section className={`continuity-panel ${forecast ? "is-online" : ""}`}>
        <header>
          <div><span>FORECAST</span><h3>{forecast && eventDefinition ? `${eventDefinition.label}${forecast.severityKnown ? ` · severity ${forecast.severity}` : " · signature incomplete"}` : state.damage ? "Repairs underway" : hostilesEnabled ? "No contact currently tracked" : stormsEnabled ? "Weather corridor holding" : "No threat activity in this region"}</h3></div>
          <small>{forecast ? "Resolution is automatic" : hostilesEnabled ? "Retrograde contacts active" : stormsEnabled ? "Environmental tier" : "Safe transit"}</small>
        </header>
        {forecast && eventDefinition ? (
          <div className="continuity-empty-state">
            <strong>{eventDefinition.label} reaches the Ark in {formatCountdown(forecast.secondsUntil)}.</strong>
            <p>{eventDefinition.summary} Target: <b>{titleCase(forecast.target)}</b>. {forecast.severityKnown ? `Projected base margin: ${readiness + DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].marginModifier - (forecast.hostile ? 32 : 30) * forecast.severity}.` : `Severity resolves inside the ${formatCountdown(leadSeconds)} measurement window.`}</p>
            {forecast.hostile && <p>Evade guarantees no crew injury. Defend is the safe default. Intercept improves recovery rewards but exposes defenders; equipment and medical preparation reduce the harm.</p>}
          </div>
        ) : state.damage ? (
          <div className="continuity-empty-state"><strong>Hull recovering: −{Math.round(state.damage.productionPenalty * 100)}% production.</strong><p>{formatCountdown(state.damage.repairRemainingSeconds / repairSpeed)} remains. Repair Drones, Engineers, research, and allocated maintenance frames accelerate recovery.</p></div>
        ) : (
          <div className="continuity-empty-state"><strong>{hostilesEnabled ? "The Ark is listening for impossible trajectories." : stormsEnabled ? "The next front will appear with a full forecast." : "The Ark is safe here."}</strong><p>{hostilesEnabled ? "Nox-class contacts may target the hull, beacon, Research Lattice, Archive, Automation, or Axiom Core. All setbacks are temporary." : "Installations are permanent and survive Recalibration."}</p></div>
        )}
      </section>

      <section className="continuity-panel">
        <header><div><span>STANDING DOCTRINE</span><h3>How the Ark answers every event</h3></div><small>Applies automatically, even offline</small></header>
        <div className="support-upgrade-grid">
          {DOCTRINE_IDS.map((id) => {
            const doctrine = DEFENSE_DOCTRINE_DEFINITIONS[id];
            const active = state.doctrine === id;
            return <article key={id} className={active ? "quarters-card" : ""}><span>{doctrine.label}</span><strong>{doctrine.marginModifier >= 0 ? `+${doctrine.marginModifier}` : doctrine.marginModifier} margin · ×{doctrine.rewardMultiplier} reward</strong><small>{doctrine.summary}</small><button type="button" disabled={active} onClick={() => onChooseDoctrine(id)}>{active ? "ACTIVE" : "Adopt"}</button></article>;
          })}
        </div>
      </section>

      <section className="continuity-panel">
        <header><div><span>INSTALLATIONS</span><h3>Permanent Ark defense hardware</h3></div><small>Survives Recalibration</small></header>
        <div className="support-upgrade-grid">
          {INSTALLATION_IDS.map((id) => {
            const definition = DEFENSE_INSTALLATION_DEFINITIONS[id];
            const quote = installationQuotes[id];
            return <article key={id}><span>{definition.name}</span><strong>Level {quote.level}/{MAX_INSTALLATION_LEVEL}</strong><small>{definition.description}</small><button type="button" disabled={quote.maxed || !quote.canAfford} onClick={() => onBuyInstallation(id)}>{quote.maxed ? "MAXED" : quote.costLabel}</button></article>;
          })}
        </div>
        <p className="crew-rarity-note">On-duty Soldier, Engineer, Navigator, and Researcher levels contribute directly. Ready Armory stock reduces injury risk; Interceptor drones add bounded vessel readiness.</p>
      </section>

      {state.causalFragmentIds.length > 0 && (
        <section className="continuity-panel causal-fragment-panel">
          <header><div><span>CAUSAL FRAGMENTS</span><h3>Evidence the contacts failed to erase</h3></div><small>{state.causalFragmentIds.length}/{DEFENSE_CAUSAL_FRAGMENTS.length} recovered</small></header>
          <div className="causal-fragment-grid">{DEFENSE_CAUSAL_FRAGMENTS.filter((fragment) => state.causalFragmentIds.includes(fragment.id)).map((fragment) => <article key={fragment.id}><span>FRAGMENT</span><strong>{fragment.title}</strong><p>{fragment.text}</p></article>)}</div>
        </section>
      )}

      <section className="continuity-panel">
        <header><div><span>INCIDENT REPORTS</span><h3>{state.eventLog.length > 0 ? `${state.eventLog.length} resolutions recorded` : "No events yet"}</h3></div><small>Offline outcomes appear here</small></header>
        {state.eventLog.length === 0 ? (
          <div className="continuity-empty-state"><strong>Nothing has tested the Ark yet.</strong><p>Every future report will name the target, preparation, injuries, compromise, rewards, and recovery time.</p></div>
        ) : (
          <ul className="deficit-list defense-event-log">
            {[...state.eventLog].reverse().map((event, index) => (
              <li key={`${event.resolvedAtSeconds}-${index}`}>
                <strong>{DEFENSE_EVENT_DEFINITIONS[event.kind].label} · {titleCase(event.target)} · severity {event.severity} · {event.outcome.toUpperCase()} ({DEFENSE_DOCTRINE_DEFINITIONS[event.doctrine].label}, margin {event.margin >= 0 ? "+" : ""}{Math.round(event.margin)})</strong>
                <span>{event.injuries.length > 0 ? `Injured: ${event.injuries.map((injury) => `${crewNames[injury.crewId] ?? "Crew member"} (−${injury.damage} health)`).join(", ")} · ` : "No crew injury · "}{event.compromise ? `${titleCase(event.compromise.kind)} for ${formatCountdown(event.compromise.remainingSeconds)} · ` : "No compromise · "}{event.salvage > 0 ? `+${event.salvage} Salvage · ` : ""}{event.engineeringModels > 0 ? `+${event.engineeringModels} Models · ` : ""}{event.calibrationData > 0 ? `+${event.calibrationData} Calibration · ` : ""}{event.nullTraces > 0 ? `+${event.nullTraces} Null Traces · ` : ""}{event.productionPenalty > 0 ? `−${Math.round(event.productionPenalty * 100)}% production while repaired` : "hull stable"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default DefenseConsole;
