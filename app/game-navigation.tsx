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
  guidedView?: PrimaryView | null;
  onNavigate: (view: PrimaryView) => void;
};

// The 5 primary destinations, in fixed left-to-right order. Shared with the
// swipe-navigation hook so both stay in sync without duplicating the list.
export const PRIMARY_DESTINATION_VIEWS: PrimaryView[] = [
  "deck", "engineering", "population", "research", "settlement",
];

type NavigationGroup = "ark" | "foundry" | "personnel" | "research" | "planet";

function groupForView(view: PrimaryView): NavigationGroup {
  if (["expeditions", "defense"].includes(view)) return "ark";
  if (["population", "medical", "armory"].includes(view)) return "personnel";
  if (view === "engineering") return "foundry";
  if (view === "research") return "research";
  if (view === "settlement") return "planet";
  return "ark";
}

export function GameNavigation({ currentView, unlocks, guidedView = null, onNavigate }: GameNavigationProps) {
  const activeGroup = groupForView(currentView);
  const arkFacilities = [unlocks.expeditions, unlocks.defense].filter(Boolean).length;
  const destinations: Array<{
    view: PrimaryView;
    group: NavigationGroup;
    code: string;
    label: string;
    detail: string;
    tooltip: string;
    sprite: string;
    unlocked: boolean;
  }> = [
    { view: "deck", group: "ark", code: "1", label: "Ark", detail: "Command", tooltip: "Inspect the Ark itself: its illuminated rooms, population, SOS array, and physical systems.", sprite: "ark", unlocked: true },
    { view: "engineering", group: "foundry", code: "2", label: "Foundry", detail: "Fabrication", tooltip: "Build nested mechanisms, increase Flux production, manage automation, and prepare planetary materials.", sprite: "foundry", unlocked: unlocks.engineering },
    { view: "population", group: "personnel", code: "3", label: "Personnel", detail: "Crew & care", tooltip: "Rescue, train, assign, heal, and equip the people living aboard the Ark.", sprite: "crew", unlocked: unlocks.population },
    { view: "research", group: "research", code: "4", label: "Research", detail: "Analysis", tooltip: "Route recovered evidence through the Analysis Core to unlock systems, equipment, and deeper Null knowledge.", sprite: "research", unlocked: unlocks.research },
    { view: "settlement", group: "planet", code: "5", label: "Continuity", detail: "Current world", tooltip: "Follow the current world sequence, then review crises, infrastructure, founding requirements, colony history, and departure readiness.", sprite: "planet", unlocked: unlocks.settlement },
  ];
  const unlockedDestinations = destinations.filter((destination) => destination.unlocked);

  if (unlockedDestinations.length === 1 && arkFacilities === 0) return null;

  return (
    <>
      <nav className={`living-foundry-nav primary-destinations ${guidedView ? "has-destination-guide" : ""}`} aria-label="Primary destinations">
        {unlockedDestinations.map((destination) => {
          const guided = destination.view === guidedView;
          return (
          <button
            className={`${activeGroup === destination.group ? "active" : ""} ${guided ? "is-guided-destination" : ""}`}
            type="button"
            aria-current={activeGroup === destination.group ? "page" : undefined}
            aria-label={`${destination.label}: ${destination.tooltip}`}
            data-guided-destination={guided ? destination.view : undefined}
            data-pixel-tooltip={guided ? `New destination: open ${destination.label} now.` : destination.tooltip}
            onClick={() => onNavigate(destination.view)}
            key={destination.view}
          >
            <span className={`nav-sprite sprite-${destination.sprite}`} aria-hidden="true"><i /></span>
            <span className="nav-destination-copy">
              <strong>{destination.label}</strong>
              <small>{destination.code} · {destination.detail}</small>
            </span>
            {guided && <b className="nav-guide-label" aria-hidden="true">NEW · OPEN</b>}
          </button>
          );
        })}
      </nav>

      {(activeGroup === "ark" || guidedView === "expeditions" || guidedView === "defense") && arkFacilities > 0 && (
        <nav className="facility-navigation" aria-label="Ark facilities">
          <div className="facility-navigation-label"><span>Ark facilities</span><small>Operations stay aboard the ship</small></div>
          <button className={currentView === "deck" ? "active" : ""} type="button" aria-current={currentView === "deck" ? "page" : undefined} data-pixel-tooltip="Return to the Ark cutaway, its illuminated rooms, SOS array, and physical systems." onClick={() => onNavigate("deck")}>Command Deck</button>
          {unlocks.expeditions && <button className={`${currentView === "expeditions" ? "active" : ""} ${guidedView === "expeditions" ? "is-guided-destination" : ""}`} type="button" aria-current={currentView === "expeditions" ? "page" : undefined} data-guided-destination={guidedView === "expeditions" ? "expeditions" : undefined} data-pixel-tooltip={guidedView === "expeditions" ? "New facility: open Expedition Bay now." : "Choose a current-world operation, prepare a qualified team, and launch an offline-safe expedition."} onClick={() => onNavigate("expeditions")}>Expedition Bay{guidedView === "expeditions" && <b className="nav-guide-label" aria-hidden="true">NEW · OPEN</b>}</button>}
          {unlocks.defense && <button className={currentView === "defense" ? "active" : ""} type="button" aria-current={currentView === "defense" ? "page" : undefined} data-pixel-tooltip="Set standing doctrines, construct defensive Marks, and review forecasted hazards and incident reports." onClick={() => onNavigate("defense")}>Defense Grid</button>}
        </nav>
      )}

      {activeGroup === "personnel" && (unlocks.medical || unlocks.armory) && (
        <nav className="facility-navigation personnel-navigation" aria-label="Personnel facilities">
          <button className={currentView === "population" ? "active" : ""} type="button" aria-current={currentView === "population" ? "page" : undefined} data-pixel-tooltip="Review every survivor, profession level, rarity, assignment, training plan, and Continuity contribution." onClick={() => onNavigate("population")}>Crew Roster</button>
          {unlocks.medical && <button className={currentView === "medical" ? "active" : ""} type="button" aria-current={currentView === "medical" ? "page" : undefined} data-pixel-tooltip="Treat injured crew, staff doctors, improve medical throughput, and prepare advanced procedures." onClick={() => onNavigate("medical")}>Medical Bay</button>}
          {unlocks.armory && <button className={currentView === "armory" ? "active" : ""} type="button" aria-current={currentView === "armory" ? "page" : undefined} data-pixel-tooltip="Craft, repair, upgrade, specialize, and assign the Ark's limited weapon and armor frames." onClick={() => onNavigate("armory")}>Armory</button>}
        </nav>
      )}
    </>
  );
}
