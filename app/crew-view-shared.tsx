"use client";

import type { CSSProperties } from "react";
import {
  MAX_SURVIVOR_HEALTH,
  getSurvivorHealthCap,
  isSurvivorWounded,
  type Survivor,
} from "./survivor-engine";

export function titleCase(value: string) {
  // "security" is displayed as "Soldier"; the internal id is unchanged.
  const display = value === "security" ? "soldier" : value;
  return display.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMissionTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

export function HealthBar({ survivor }: { survivor: Survivor }) {
  const cap = getSurvivorHealthCap(survivor);
  const wounded = isSurvivorWounded(survivor);
  const capLoss = ((MAX_SURVIVOR_HEALTH - cap) / MAX_SURVIVOR_HEALTH) * 100;
  return (
    <div
      className={`crew-health-track ${wounded ? "is-wounded" : ""} ${cap < MAX_SURVIVOR_HEALTH ? "is-capped" : ""}`}
      role="progressbar"
      aria-label={`Health ${Math.round(survivor.health)} of ${cap}`}
      aria-valuemin={0}
      aria-valuemax={MAX_SURVIVOR_HEALTH}
      aria-valuenow={Math.round(survivor.health)}
      style={{ "--health-cap-loss": `${capLoss}%` } as CSSProperties}
      title={`Health ${Math.round(survivor.health)}/${cap}${survivor.injury ? ` · permanent ${survivor.injury} injury caps health at ${cap} until prosthetic repair` : ""}`}
    >
      <i style={{ width: `${(Math.max(0, survivor.health) / MAX_SURVIVOR_HEALTH) * 100}%` }} />
    </div>
  );
}

export function CrewToken({
  id,
  name,
  role = "civilian",
  rarity = "standard",
  status = "ready",
  large = false,
}: {
  id: string;
  name: string;
  role?: string | null;
  rarity?: string | null;
  status?: "ready" | "wounded" | "training" | "deployed" | "protected";
  large?: boolean;
}) {
  const seed = [...`${id}:${name}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  return (
    <span
      className={`crew-pixel-token role-${role ?? "civilian"} rarity-${rarity ?? "standard"} status-${status} variant-${seed % 6} ${large ? "is-large" : ""}`}
      role="img"
      aria-label={`${name}, ${titleCase(role ?? "civilian")}`}
      title={`${name} · ${titleCase(role ?? "civilian")}`}
    >
      <i className="crew-token-head" />
      <i className="crew-token-body" />
      <i className="crew-token-arm arm-left" />
      <i className="crew-token-arm arm-right" />
      <i className="crew-token-leg leg-left" />
      <i className="crew-token-leg leg-right" />
      <em aria-hidden="true" />
    </span>
  );
}
