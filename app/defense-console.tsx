"use client";

import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  DEFENSE_DOCTRINE_DEFINITIONS,
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

export type DefenseInstallationQuoteView = {
  cost: number;
  level: number;
  maxed: boolean;
  canAfford: boolean;
  costLabel: string;
};

export type DefenseConsoleProps = {
  state: DefenseState;
  crew: DefenseCrewContext;
  currentWorldName: string;
  stormsEnabled: boolean;
  installationQuotes: Readonly<Record<DefenseInstallationId, DefenseInstallationQuoteView>>;
  onBuyInstallation: (id: DefenseInstallationId) => void;
  onChooseDoctrine: (doctrine: DefenseDoctrine) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

const INSTALLATION_IDS: readonly DefenseInstallationId[] = [
  "shieldArray",
  "repairDrones",
  "pointDefense",
  "earlyWarningRelay",
];

const DOCTRINE_IDS: readonly DefenseDoctrine[] = [
  "defend",
  "evade",
  "intercept",
  "observe",
];

function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(safe % 60).padStart(2, "0")}s`;
}

function DefenseConsole({
  state,
  crew,
  currentWorldName,
  stormsEnabled,
  installationQuotes,
  onBuyInstallation,
  onChooseDoctrine,
  onOpenHelp,
  onBack,
}: DefenseConsoleProps) {
  const readiness = getDefenseReadiness(state, crew);
  const forecast = getIncomingForecast(
    state,
    crew.navigators,
    crew.researchForecastSeconds,
  );
  const leadSeconds = getForecastLeadSeconds(
    state,
    crew.navigators,
    crew.researchForecastSeconds,
  );
  const repairSpeed = getRepairSpeedMultiplier(
    state,
    crew.engineers,
    crew.researchRepairMultiplier,
  );

  return (
    <section className="continuity-console defense-console" aria-labelledby="defense-console-title">
      <header className="continuity-console-header">
        <div>
          <p>THREAT OPERATIONS // {currentWorldName.toUpperCase()}</p>
          <h2 id="defense-console-title">Defense readiness and standing doctrine</h2>
          <span>Every event resolves automatically, online or offline. Nothing here can kill crew or erase progress.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band">
        <div title={crew.researchReadiness ? `Threat research contributes +${crew.researchReadiness} readiness.` : "Threat research has not added readiness yet."}><span>Readiness</span><strong>{readiness}/100</strong>{Boolean(crew.researchReadiness) && <small>Research +{crew.researchReadiness}</small>}</div>
        <div><span>Doctrine</span><strong>{DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].label}</strong></div>
        <div><span>Forecast lead</span><strong>{formatCountdown(leadSeconds)}</strong></div>
        <div><span>Repair speed</span><strong>×{repairSpeed.toFixed(2)}</strong></div>
        <div><span>Storms resolved</span><strong>{state.stats.resolved}</strong></div>
        <div className="continuity-summary-help"><span>Manual <HelpTrigger label="Explain the Defense page" onClick={() => onOpenHelp("defense")} /></span><strong>{state.stats.unscathed}/{state.stats.resolved || 0} clean</strong></div>
      </div>

      <section className={`continuity-panel ${forecast ? "is-online" : ""}`}>
        <header><div><span>FORECAST</span><h3>{!stormsEnabled ? "No storm activity in this region" : forecast ? forecast.severityKnown ? `Ash storm · severity ${forecast.severity}` : "Ash storm · magnitude unknown" : state.damage ? "Repairs underway" : "Skies holding"}</h3></div><small>{stormsEnabled ? "Resolution is automatic" : "Storm fronts begin at Cinder"}</small></header>
        {forecast ? (
          <div className="continuity-empty-state">
            <strong>Storm front arrives in {formatCountdown(forecast.secondsUntil)}.</strong>
            {forecast.severityKnown ? (
              <p>
                Projected margin: readiness {readiness}
                {DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].marginModifier >= 0 ? " +" : " "}
                {DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].marginModifier} doctrine − {30 * forecast.severity} storm =
                {" "}
                <strong>{readiness + DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].marginModifier - 30 * forecast.severity}</strong>
                . 10+ rides it out clean; below −20 expect temporary damage.
              </p>
            ) : (
              <p>
                Severity resolves once the front is within your {formatCountdown(leadSeconds)} measurement window — extend it with the Early-Warning Relay and assigned Navigators. Worst case at severity 3 needs margin {90 - DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].marginModifier - readiness > 0 ? `${90 - DEFENSE_DOCTRINE_DEFINITIONS[state.doctrine].marginModifier - readiness} more readiness` : "nothing - you are covered"}.
              </p>
            )}
          </div>
        ) : state.damage ? (
          <div className="continuity-empty-state">
            <strong>Hull recovering: −{Math.round(state.damage.productionPenalty * 100)}% production.</strong>
            <p>{formatCountdown(state.damage.repairRemainingSeconds / repairSpeed)} of repairs remain. Repair Drones and assigned Engineers accelerate this.</p>
          </div>
        ) : (
          <div className="continuity-empty-state">
            <strong>{stormsEnabled ? "No storm front is currently tracked." : "The Ark is safe here."}</strong>
            <p>{stormsEnabled ? "The next front appears here with a full timer the moment it forms." : "Build ahead: installations persist for every world and every Recalibration."}</p>
          </div>
        )}
      </section>

      <section className="continuity-panel">
        <header><div><span>STANDING DOCTRINE</span><h3>How the Ark answers every event</h3></div><small>Applies automatically, even offline</small></header>
        <div className="support-upgrade-grid">
          {DOCTRINE_IDS.map((id) => {
            const doctrine = DEFENSE_DOCTRINE_DEFINITIONS[id];
            const active = state.doctrine === id;
            return (
              <article key={id} className={active ? "quarters-card" : ""}>
                <span>{doctrine.label}</span>
                <strong>{doctrine.marginModifier >= 0 ? `+${doctrine.marginModifier}` : doctrine.marginModifier} margin · ×{doctrine.rewardMultiplier} reward</strong>
                <small>{doctrine.summary}</small>
                <button type="button" disabled={active} onClick={() => onChooseDoctrine(id)}>{active ? "ACTIVE" : "Adopt"}</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="continuity-panel">
        <header><div><span>INSTALLATIONS</span><h3>Defense hardware</h3></div><small>Permanent Ark structure · survives Recalibration</small></header>
        <div className="support-upgrade-grid">
          {INSTALLATION_IDS.map((id) => {
            const definition = DEFENSE_INSTALLATION_DEFINITIONS[id];
            const quote = installationQuotes[id];
            return (
              <article key={id}>
                <span>{definition.name}</span>
                <strong>Level {quote.level}/{MAX_INSTALLATION_LEVEL}</strong>
                <small>{definition.description}</small>
                <button type="button" disabled={quote.maxed || !quote.canAfford} onClick={() => onBuyInstallation(id)}>
                  {quote.maxed ? "MAXED" : quote.costLabel}
                </button>
              </article>
            );
          })}
        </div>
        <p className="crew-rarity-note">Crew contributions use on-duty expertise levels: Soldier levels add readiness (and Intercept margin), Engineer levels add readiness and repair speed, and Navigator levels extend the forecast. Completed threat and robotics research adds its own visible support above.</p>
      </section>

      <section className="continuity-panel">
        <header><div><span>EVENT LOG</span><h3>{state.eventLog.length > 0 ? `${state.eventLog.length} resolutions recorded` : "No events yet"}</h3></div><small>Offline outcomes appear here</small></header>
        {state.eventLog.length === 0 ? (
          <div className="continuity-empty-state"><strong>Nothing has tested the Ark yet.</strong><p>When a storm resolves, its severity, readiness, margin, and outcome are recorded here.</p></div>
        ) : (
          <ul className="deficit-list">
            {[...state.eventLog].reverse().map((event, index) => (
              <li key={`${event.resolvedAtSeconds}-${index}`}>
                <strong>
                  Ash storm · severity {event.severity} · {event.outcome.toUpperCase()} ({DEFENSE_DOCTRINE_DEFINITIONS[event.doctrine].label}, margin {event.margin >= 0 ? "+" : ""}{Math.round(event.margin)})
                </strong>
                <span>
                  {event.salvage > 0 ? `+${event.salvage} Salvage · ` : ""}
                  {event.engineeringModels > 0 ? `+${event.engineeringModels} Engineering Models · ` : ""}
                  {event.calibrationData > 0 ? `+${event.calibrationData} Calibration Data · ` : ""}
                  {event.nullTraces > 0 ? `+${event.nullTraces} Null Traces · ` : ""}
                  {event.productionPenalty > 0 ? `−${Math.round(event.productionPenalty * 100)}% production for ${formatCountdown(event.repairSeconds)}` : "no damage"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default DefenseConsole;
