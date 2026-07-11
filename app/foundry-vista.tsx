import { memo, type CSSProperties } from "react";

import {
  GENERATORS,
  MISSIONS,
  type GameState,
  type MissionStatus,
} from "./game-engine";

type FoundryVistaProps = {
  game: GameState;
};

type WorldVisual = {
  slug: string;
  accent: string;
  accentRgb: string;
  accentSoft: string;
  secondary: string;
  sky: string;
  ground: string;
  planet: string;
};

export const WORLD_VISUALS: readonly WorldVisual[] = [
  {
    slug: "helion",
    accent: "#55d6e8",
    accentRgb: "85 214 232",
    accentSoft: "rgb(85 214 232 / 0.13)",
    secondary: "#8aa0b5",
    sky: "#04070b",
    ground: "#0b1118",
    planet: "#182735",
  },
  {
    slug: "pelagos",
    accent: "#35c6d8",
    accentRgb: "53 198 216",
    accentSoft: "rgb(53 198 216 / 0.13)",
    secondary: "#4169e1",
    sky: "#020b18",
    ground: "#061525",
    planet: "#0a4160",
  },
  {
    slug: "cinderwake",
    accent: "#ff8a3d",
    accentRgb: "255 138 61",
    accentSoft: "rgb(255 138 61 / 0.13)",
    secondary: "#e44536",
    sky: "#120807",
    ground: "#24100b",
    planet: "#6c281b",
  },
  {
    slug: "ilyra",
    accent: "#c697ff",
    accentRgb: "198 151 255",
    accentSoft: "rgb(198 151 255 / 0.13)",
    secondary: "#f05ad9",
    sky: "#0d0718",
    ground: "#1b0d2b",
    planet: "#45206e",
  },
  {
    slug: "orison",
    accent: "#84e0a0",
    accentRgb: "132 224 160",
    accentSoft: "rgb(132 224 160 / 0.13)",
    secondary: "#e6c45a",
    sky: "#07120d",
    ground: "#10271a",
    planet: "#276847",
  },
  {
    slug: "vesper",
    accent: "#ff5e6d",
    accentRgb: "255 94 109",
    accentSoft: "rgb(255 94 109 / 0.13)",
    secondary: "#d4e3ff",
    sky: "#09070d",
    ground: "#1d0b13",
    planet: "#4b1526",
  },
] as const;

const STATUS_LABELS: Record<MissionStatus, string> = {
  active: "Signal active",
  saved: "World secured",
  locked: "Signal pending",
};

function clampWorldIndex(index: number) {
  const lastIndex = Math.max(0, MISSIONS.length - 1);
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.min(lastIndex, Math.max(0, safeIndex));
}

function getVisualWorldIndex(game: GameState) {
  const missionIndex = game.missions.awaitingAcknowledgement
    ? game.missions.currentIndex - 1
    : game.missions.currentIndex;
  return clampWorldIndex(missionIndex);
}

function getFacilityStage(bought: number) {
  if (!Number.isFinite(bought) || bought < 1) return 0;
  if (bought >= 50) return 5;
  if (bought >= 25) return 4;
  if (bought >= 10) return 3;
  if (bought >= 5) return 2;
  return 1;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getWorldSummary(
  status: MissionStatus,
  mission: (typeof MISSIONS)[number],
) {
  if (status === "saved") {
    return mission.success;
  }
  if (status === "active") return mission.briefing;
  return "The Foundry has not yet accepted this planetary signal.";
}

function FoundryVistaView({ game }: FoundryVistaProps) {
  const visualWorldIndex = getVisualWorldIndex(game);
  const mission = MISSIONS[visualWorldIndex] ?? MISSIONS[0];
  const visual = WORLD_VISUALS[visualWorldIndex] ?? WORLD_VISUALS[0];
  const status = game.missions.statuses[visualWorldIndex] ?? "locked";
  const facilityStages = GENERATORS.map((_, index) =>
    getFacilityStage(game.tiers[index]?.bought ?? 0),
  );
  const onlineSystems = facilityStages.filter((stage) => stage > 0).length;
  const onlineNames = GENERATORS.filter(
    (_, index) => facilityStages[index] > 0,
  ).map((generator) => generator.name);
  const style = {
    "--world-accent": visual.accent,
    "--world-accent-rgb": visual.accentRgb,
    "--world-accent-soft": visual.accentSoft,
    "--world-secondary": visual.secondary,
    "--world-sky": visual.sky,
    "--world-ground": visual.ground,
    "--world-planet": visual.planet,
  } as CSSProperties;

  return (
    <figure
      className={`foundry-vista world-${visual.slug} status-${status}`}
      data-world={visual.slug}
      data-world-index={visualWorldIndex}
      data-world-status={status}
      data-stage={game.missions.stageIndex}
      style={style}
    >
      <header className="foundry-vista-heading">
        <div>
          <p className="foundry-vista-kicker">
            Planetary theater // {String(visualWorldIndex + 1).padStart(2, "0")}
          </p>
          <h3>{mission.world}</h3>
          <span>{mission.epithet}</span>
        </div>
        <strong className={`foundry-world-status status-${status}`}>
          {STATUS_LABELS[status]}
        </strong>
      </header>

      <div className="foundry-scene" aria-hidden="true">
        <div className="foundry-starfield foundry-starfield-far" />
        <div className="foundry-starfield foundry-starfield-near" />

        <div className="foundry-orbit foundry-orbit-outer">
          <span />
          <span />
        </div>
        <div className="foundry-orbit foundry-orbit-inner">
          <span />
        </div>

        <div className="foundry-planet">
          <span className="foundry-planet-atmosphere" />
          <span className="foundry-planet-surface" />
          <span className="foundry-planet-shadow" />
          <span className="foundry-planet-shield" />
        </div>

        <div className="foundry-beacon">
          <span className="foundry-beacon-beam" />
          <span className="foundry-beacon-source" />
        </div>

        <div className="foundry-horizon">
          <span className="foundry-horizon-rim" />
          <span className="foundry-horizon-grid" />
        </div>

        <div className="foundry-facilities">
          {GENERATORS.map((generator, index) => {
            const stage = facilityStages[index];
            const generatorSlug = slugify(generator.name);
            const facilityStyle = {
              "--facility-index": index,
              "--facility-stage": stage,
            } as CSSProperties;

            return (
              <div
                className={`foundry-facility facility-tier-${index + 1} facility-${generatorSlug} ${stage > 0 ? "is-online" : "is-dormant"}`}
                data-generator={generatorSlug}
                data-stage={stage}
                key={generator.name}
                style={facilityStyle}
              >
                <span className="facility-foundation" />
                <span className="facility-structure" />
                <span className="facility-emitter" />
                <span className="facility-units">
                  {Array.from({ length: stage }, (_, unitIndex) => (
                    <i
                      key={unitIndex}
                      style={{ "--unit-index": unitIndex } as CSSProperties}
                    />
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        <div className="foundry-evacuation-lanes">
          <span />
          <span />
          <span />
        </div>
      </div>

      <figcaption className="foundry-vista-caption">
        <strong>{mission.world}</strong>
        <span>{getWorldSummary(status, mission)}</span>
        <small>
          {onlineSystems > 0
            ? `${onlineSystems} of ${GENERATORS.length} systems online: ${onlineNames.join(", ")}.`
            : `0 of ${GENERATORS.length} systems online. The foundry floor is dark.`}
        </small>
      </figcaption>

      <ol className="foundry-world-route" aria-label="Planetary evacuation route">
        {MISSIONS.map((routeMission, index) => {
          const routeStatus = game.missions.statuses[index] ?? "locked";
          return (
            <li
              className={`route-world status-${routeStatus}`}
              aria-current={index === visualWorldIndex ? "step" : undefined}
              data-status={routeStatus}
              key={routeMission.world}
            >
              <span className="route-marker" aria-hidden="true">
                {routeStatus === "saved"
                  ? "\u2713"
                  : routeStatus === "active"
                    ? "\u2022"
                    : "\u25cb"}
              </span>
              <span className="route-copy">
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <small>{routeMission.world}</small>
              </span>
              <span className="sr-only">
                {routeMission.world}: {STATUS_LABELS[routeStatus]}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function foundryVistaPropsAreEqual(
  previous: Readonly<FoundryVistaProps>,
  next: Readonly<FoundryVistaProps>,
) {
  const previousMissions = previous.game.missions;
  const nextMissions = next.game.missions;

  if (
    previousMissions.currentIndex !== nextMissions.currentIndex ||
    previousMissions.stageIndex !== nextMissions.stageIndex ||
    previousMissions.awaitingAcknowledgement !==
      nextMissions.awaitingAcknowledgement
  ) {
    return false;
  }

  for (let index = 0; index < MISSIONS.length; index += 1) {
    if (
      previousMissions.statuses[index] !== nextMissions.statuses[index] ||
      (previous.game.tiers[index]?.bought ?? 0) !==
        (next.game.tiers[index]?.bought ?? 0)
    ) {
      return false;
    }
  }

  return true;
}

export const FoundryVista = memo(
  FoundryVistaView,
  foundryVistaPropsAreEqual,
);

FoundryVista.displayName = "FoundryVista";

export default FoundryVista;
