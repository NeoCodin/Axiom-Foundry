"use client";

import {
  DEFENSE_EVENT_DEFINITIONS,
  getIncomingForecast,
  type DefenseCrewContext,
  type DefenseState,
} from "./defense-engine";

type TransitConsoleProps = {
  journey: {
    originName: string;
    destinationName: string;
    progress: number;
    remainingSeconds: number;
    totalSeconds: number;
    speedMultiplier: number;
    navigationExpertise: number;
    driveCouplingActive: boolean;
  };
  defense: DefenseState;
  defenseCrew: DefenseCrewContext;
  onOpenDefense: () => void;
  onBack: () => void;
};

const duration = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.ceil((safe % 3_600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
};

export function TransitConsole({
  journey,
  defense,
  defenseCrew,
  onOpenDefense,
  onBack,
}: TransitConsoleProps) {
  const forecast = getIncomingForecast(
    defense,
    defenseCrew.navigators,
    defenseCrew.researchForecastSeconds,
  );
  const event = forecast ? DEFENSE_EVENT_DEFINITIONS[forecast.kind] : null;
  const progressPercent = Math.round(journey.progress * 1000) / 10;

  return (
    <section className="transit-console" aria-labelledby="transit-title">
      <header className="transit-console-header">
        <div>
          <p>CONTINUITY CORRIDOR // FRONTIER TRANSIT</p>
          <h2 id="transit-title">{journey.originName} → {journey.destinationName}</h2>
          <span>The Ark remains operational. Fabrication, Research, training, medicine, and restored-world defense continue online and offline.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <section className="transit-vista" aria-label={`${progressPercent}% of route completed`}>
        <div className="transit-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="transit-route-line" aria-hidden="true">
          <span className="transit-origin"><b>{journey.originName}</b></span>
          <span className="transit-ark" style={{ left: `${Math.max(4, Math.min(96, progressPercent))}%` }}><i /><b>ARK</b></span>
          <span className="transit-destination"><i /><b>{journey.destinationName}</b></span>
        </div>
        <div className="transit-progress-copy">
          <span>ROUTE COMPLETION</span>
          <strong>{progressPercent}%</strong>
          <p>{duration(journey.remainingSeconds)} until automatic orbital arrival</p>
        </div>
      </section>

      <div className="transit-telemetry">
        <article><span>Original route</span><strong>{duration(journey.totalSeconds * journey.speedMultiplier)}</strong><small>Unassisted corridor estimate</small></article>
        <article><span>Current estimate</span><strong>{duration(journey.totalSeconds)}</strong><small>Calculated at departure</small></article>
        <article><span>Drive velocity</span><strong>×{journey.speedMultiplier.toFixed(2)}</strong><small>{journey.driveCouplingActive ? "Ark-Drive Coupling active" : "Standard drive geometry"}</small></article>
        <article><span>Navigation Expertise</span><strong>{Math.round(journey.navigationExpertise)}</strong><small>Locked into this route solution</small></article>
      </div>

      <section className={`transit-hazard-card ${forecast ? "is-tracked" : ""}`}>
        <header>
          <div><span>TRANSIT FORECAST</span><h3>{event ? event.label : "Corridor currently clear"}</h3></div>
          <small>{forecast ? `${duration(forecast.secondsUntil)} to automatic resolution` : "Continuous sweep"}</small>
        </header>
        {forecast && event ? (
          <p>{event.summary} {forecast.hostile ? "This is a hostile contact." : "This is an environmental transit hazard."} The Defense Grid will apply the appropriate standing doctrine.</p>
        ) : (
          <p>Asteroid showers, debris fronts, ion storms, and drive turbulence can form during travel. Retrograde contacts begin on the route to Nox.</p>
        )}
        <button type="button" onClick={onOpenDefense}>Open Defense Grid</button>
      </section>

      <section className="transit-idle-contract">
        <strong>No dead time.</strong>
        <p>Closing the game does not pause travel. Arrival, construction, research, medical recovery, and every forecast use the same offline simulation.</p>
      </section>
    </section>
  );
}

export default TransitConsole;
