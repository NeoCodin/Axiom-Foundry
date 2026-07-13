"use client";

import type { ManualPageId } from "./game-manual";

export type PrimaryView = ManualPageId;

export type NavigationUnlocks = {
  engineering: boolean;
  research: boolean;
  population: boolean;
  medical: boolean;
  expeditions: boolean;
  defense: boolean;
  armory: boolean;
  settlement: boolean;
};

type GameNavigationProps = {
  currentView: PrimaryView;
  unlocks: NavigationUnlocks;
  onNavigate: (view: PrimaryView) => void;
};

type NavigationGroup = "ark" | "foundry" | "personnel" | "research" | "planet";

function groupForView(view: PrimaryView): NavigationGroup {
  if (["expeditions", "defense", "armory"].includes(view)) return "ark";
  if (["population", "medical"].includes(view)) return "personnel";
  if (view === "engineering") return "foundry";
  if (view === "research") return "research";
  if (view === "settlement") return "planet";
  return "ark";
}

export function GameNavigation({ currentView, unlocks, onNavigate }: GameNavigationProps) {
  const activeGroup = groupForView(currentView);
  const mainSystemsAwake =
    1 +
    [unlocks.engineering, unlocks.population, unlocks.research, unlocks.settlement].filter(Boolean).length;
  const arkFacilities = [unlocks.expeditions, unlocks.defense, unlocks.armory].filter(Boolean).length;

  return (
    <>
      <nav className="living-foundry-nav primary-destinations" aria-label="Primary destinations">
        <button className={activeGroup === "ark" ? "active" : ""} type="button" aria-current={activeGroup === "ark" ? "page" : undefined} onClick={() => onNavigate("deck")}>
          <span aria-hidden="true">A</span>
          Ark
          <small>Command</small>
        </button>
        {unlocks.engineering && (
          <button className={activeGroup === "foundry" ? "active" : ""} type="button" aria-current={activeGroup === "foundry" ? "page" : undefined} onClick={() => onNavigate("engineering")}>
            <span aria-hidden="true">01</span>
            Foundry
            <small>Fabrication</small>
          </button>
        )}
        {unlocks.population && (
          <button className={activeGroup === "personnel" ? "active" : ""} type="button" aria-current={activeGroup === "personnel" ? "page" : undefined} onClick={() => onNavigate("population")}>
            <span aria-hidden="true">02</span>
            Personnel
            <small>Crew & care</small>
          </button>
        )}
        {unlocks.research && (
          <button className={activeGroup === "research" ? "active" : ""} type="button" aria-current={activeGroup === "research" ? "page" : undefined} onClick={() => onNavigate("research")}>
            <span aria-hidden="true">03</span>
            Research
            <small>Analysis</small>
          </button>
        )}
        {unlocks.settlement && (
          <button className={activeGroup === "planet" ? "active" : ""} type="button" aria-current={activeGroup === "planet" ? "page" : undefined} onClick={() => onNavigate("settlement")}>
            <span aria-hidden="true">04</span>
            Planet
            <small>Continuity</small>
          </button>
        )}
        <div className="nav-awakening-status" aria-live="polite">
          <span>{mainSystemsAwake}</span>
          <small>destinations awake</small>
        </div>
      </nav>

      {activeGroup === "ark" && arkFacilities > 0 && (
        <nav className="facility-navigation" aria-label="Ark facilities">
          <div className="facility-navigation-label"><span>Ark facilities</span><small>Operations stay aboard the ship</small></div>
          <button className={currentView === "deck" ? "active" : ""} type="button" aria-current={currentView === "deck" ? "page" : undefined} onClick={() => onNavigate("deck")}>Command Deck</button>
          {unlocks.expeditions && <button className={currentView === "expeditions" ? "active" : ""} type="button" aria-current={currentView === "expeditions" ? "page" : undefined} onClick={() => onNavigate("expeditions")}>Expedition Bay</button>}
          {unlocks.defense && <button className={currentView === "defense" ? "active" : ""} type="button" aria-current={currentView === "defense" ? "page" : undefined} onClick={() => onNavigate("defense")}>Defense Grid</button>}
          {unlocks.armory && <button className={currentView === "armory" ? "active" : ""} type="button" aria-current={currentView === "armory" ? "page" : undefined} onClick={() => onNavigate("armory")}>Armory</button>}
        </nav>
      )}

      {activeGroup === "personnel" && unlocks.medical && (
        <nav className="facility-navigation personnel-navigation" aria-label="Personnel facilities">
          <div className="facility-navigation-label"><span>Personnel</span><small>People before inventory</small></div>
          <button className={currentView === "population" ? "active" : ""} type="button" aria-current={currentView === "population" ? "page" : undefined} onClick={() => onNavigate("population")}>Crew Roster</button>
          <button className={currentView === "medical" ? "active" : ""} type="button" aria-current={currentView === "medical" ? "page" : undefined} onClick={() => onNavigate("medical")}>Medical Bay</button>
        </nav>
      )}
    </>
  );
}

