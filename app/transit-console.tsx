"use client";

import { type CSSProperties } from "react";
import type { CampaignWorldId } from "./campaign-content";
import {
  DEFENSE_EVENT_DEFINITIONS,
  getIncomingForecast,
  type DefenseCrewContext,
  type DefenseState,
} from "./defense-engine";
import { WORLD_VISUALS } from "./world-visuals";

type TransitConsoleProps = {
  journey: {
    originWorldId: CampaignWorldId;
    destinationWorldId: CampaignWorldId;
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
  const originVisual =
    WORLD_VISUALS.find((visual) => visual.slug === journey.originWorldId) ??
    WORLD_VISUALS[0];
  const destinationVisual =
    WORLD_VISUALS.find((visual) => visual.slug === journey.destinationWorldId) ??
    WORLD_VISUALS.at(-1)!;
  const routeAngle = journey.progress * Math.PI;
  const arkPosition = {
    left: `${9 + journey.progress * 82}%`,
    top: `${72 - Math.sin(routeAngle) * 43}%`,
  };
  const transitStyle = {
    "--transit-origin-accent": originVisual.accent,
    "--transit-origin-sky": originVisual.sky,
    "--transit-origin-ground": originVisual.ground,
    "--transit-origin-planet": originVisual.planet,
    "--transit-destination-accent": destinationVisual.accent,
    "--transit-destination-sky": destinationVisual.sky,
    "--transit-destination-ground": destinationVisual.ground,
    "--transit-destination-planet": destinationVisual.planet,
    "--transit-progress-width": `${progressPercent}%`,
  } as CSSProperties;

  return (
    <section
      className="transit-console"
      style={transitStyle}
      aria-labelledby="transit-title"
    >
      <header className="transit-console-header">
        <div>
          <p>CONTINUITY CORRIDOR · FRONTIER TRANSIT</p>
          <h2 id="transit-title">{journey.originName} → {journey.destinationName}</h2>
          <span>
            These worlds orbit different stars. The Ark is crossing a folded
            Axiom corridor between their anchor systems while every onboard
            operation continues online and offline.
          </span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <section className="transit-vista" aria-label={`${progressPercent}% of route completed`}>
        <div className="transit-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="transit-fold-field" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
        </div>
        <div className="transit-corridor-arc" aria-hidden="true">
          <i className="transit-corridor-progress" />
        </div>
        <div className="transit-origin-anchor" aria-hidden="true">
          <i /><span>ORIGIN ANCHOR</span><b>{journey.originName}</b>
        </div>
        <div className="transit-destination-anchor" aria-hidden="true">
          <i /><span>DESTINATION ANCHOR</span><b>{journey.destinationName}</b>
        </div>
        <div className="transit-ark" style={arkPosition} aria-hidden="true">
          <i /><b>ARK</b>
        </div>
        <div className="transit-progress-copy">
          <span>FOLDED CORRIDOR · NOT TO SCALE</span>
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
