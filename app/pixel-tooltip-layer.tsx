"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "above" | "below";

type TooltipRule = {
  selector: string;
  copy: string | ((element: HTMLElement) => string);
  place?: TooltipPlacement;
};

type ActiveTooltip = {
  target: HTMLElement;
  copy: string;
  place?: TooltipPlacement;
};

type TooltipPosition = {
  left: number;
  top: number;
  arrowLeft: number;
  side: TooltipPlacement;
  ready: boolean;
};

const TOOLTIP_RULES: TooltipRule[] = [
  // Ark command deck
  { selector: ".ark-core-engine", copy: "AXIOM Chamber. Click to force a Core alignment and gain Flux immediately. Repeated tuning wakes the Ark's first systems." },
  { selector: ".ark-target-world", copy: "Current destination. The marker shows this chapter's total Continuity readiness, not physical travel distance." },
  { selector: ".ark-ship", copy: "ARK // ITERATION 44. Lit rooms are operational; dark rooms awaken as the current chapter advances." },
  { selector: ".ark-room-fabrication", copy: "Fabrication Deck. Builds nested mechanisms that turn Flux into stronger, automatic production." },
  { selector: ".ark-room-support", copy: "Life Support. Atmosphere, water, food, and medical capacity determine how many rescued people the Ark can sustain." },
  { selector: ".ark-room-habitation", copy: "Habitation. Living Space sets the Ark's hard population capacity and can be expanded with Salvage." },
  { selector: ".ark-room-research", copy: "Analysis Lattice. Researchers route recovered evidence through processors and convert it into permanent discoveries." },
  { selector: ".ark-room-education", copy: "Education Deck. Adults study professions here; children learn through chapter progress without being assigned to labor." },
  { selector: ".ark-room-bridge", copy: "Planetfall Bridge. Tracks Continuity, travel, restored colonies, and the requirements for leaving a world safely." },
  { selector: ".ark-heading-metrics > div:nth-child(1)", copy: "Population aboard versus current Living Space and Life Support capacity." },
  { selector: ".ark-heading-metrics > div:nth-child(2)", copy: "Cohesion measures social stability aboard the Ark. Shortages and poor outcomes reduce it; healthy systems restore it." },
  { selector: ".ark-heading-metrics > div:nth-child(3)", copy: "Salvage is recovered from survivor signals, expeditions, incidents, and restored-world operations. It pays for physical construction and repairs." },
  { selector: ".ark-heading-metrics > div:nth-child(4)", copy: "Rooms online shows how much of the Ark has awakened during this run." },
  { selector: ".ark-stage-directive", copy: "Active directive. This is AXIOM's clearest recommended next action; its bar tracks only the stated objective." },
  { selector: ".ark-flight-ribbon", copy: "Continuity route. It summarizes the current world, chapter readiness, and the Ark's next destination." },
  { selector: ".ark-support-grid article", copy: "Life-support channel. Demand rises with population; keep its capacity above demand to avoid shortages and lost Cohesion." },
  { selector: ".ark-beacon-card", copy: "SOS Beacon. While broadcasting in planetary orbit it discovers survivor groups, even while the game is closed." },
  { selector: ".ark-signal-card", copy: "Active survivor signal. Inspect its people, support demand, and cargo before choosing whether to bring the group aboard." },
  { selector: ".ark-crew-card", copy: "Crew watch. A quick view of people currently aboard; open Personnel for assignments, profiles, training, and medical status." },
  { selector: ".ark-research-card", copy: "Analysis watch. Shows the current project's progress and whether the research network is actively processing evidence." },
  { selector: ".ark-settlement-card", copy: "Continuity watch. The world can be left only after its population, expertise, infrastructure, and story requirements are all stable." },

  // Foundry and campaign
  { selector: ".foundry-telemetry > div", copy: "Live Foundry diagnostic. These values combine machines, resonance links, crew engineering support, research, and permanent laws." },
  { selector: ".purchase-modes", copy: "Purchase quantity. Choose one machine, ten machines, or the maximum currently affordable amount." },
  { selector: ".machine-row:not(.locked)", copy: "Nested mechanism. Higher tiers produce the resource used by the tier below; Vacuum Taps ultimately turn the chain into Flux." },
  { selector: ".machine-row.locked", copy: "Dormant mechanism. Reach the stated lifetime-Flux threshold to reveal this tier permanently." },
  { selector: ".resonance-link", copy: "Resonance link. Every 25 owned machines strengthens that tier without requiring a separate purchase." },
  { selector: ".milestone-track", copy: "Milestone track. Filled blocks show progress toward the next resonance link at 25 purchases." },
  { selector: ".buy-button", copy: "Fabricate the selected quantity. The displayed price already includes bulk scaling." },
  { selector: ".mission-panel", copy: "Planetfall campaign. Complete its phases in order; each chapter teaches a system needed to restore this world." },
  { selector: ".mission-stages li", copy: "Campaign phase. Completed phases stay checked; the highlighted phase is the operation currently accepting progress." },
  { selector: ".mission-hazard", copy: "Local hazard. Resolve its stated preparation through the linked game system; hazards never use real-time failure deadlines." },
  { selector: ".mission-stakes", copy: "Outcome protocol. Planetary setbacks cost time or resources, but never erase saves, kill colonies, or punish offline play unfairly." },
  { selector: ".upgrade-card", copy: "Run research. This optimization lasts until Recalibration and improves the current Foundry cycle." },
  { selector: ".foundry-recalibration", copy: "Recalibration converts a mature run into permanent Axioms. Machines and temporary research reset; laws and legacy progress survive." },
  { selector: ".automation-panel", copy: "Cycle automation. After its unlocks, AXIOM can purchase selected mechanisms and run optimizations while you are away." },
  { selector: ".legacy-panel", copy: "Legacy Matrix. Spend Axioms on permanent laws that strengthen every future cycle." },

  // Personnel
  { selector: ".continuity-summary-band > div", copy: "Personnel summary. Capacity is a hard limit; reserve and assignment totals explain where everyone aboard currently serves." },
  { selector: ".personnel-console-tabs > button", copy: "Personnel workspace. Systems manages capacity and signals, Roster manages individuals, and Command manages doctrine and Team Alpha." },
  { selector: ".quarters-card", copy: "Living Space. Each completed section raises the Ark's hard population cap; construction continues while offline." },
  { selector: ".survivor-beacon-panel", copy: "Survivor signals. Broadcasting finds one persistent group at a time; you may inspect it without accepting immediately." },
  { selector: ".role-balance-panel", copy: "Assignment doctrine. AXIOM can place adults where their aptitude and current profession levels provide the most value." },
  { selector: ".role-count-grid > div", copy: "Current duty count. People in Ark Reserve automatically cover absences and light maintenance until a station needs them." },
  { selector: ".crew-rarity-key", copy: "Profile rarity marks unusually broad aptitudes and traits. It speeds learning and raises profession capacity; it never measures a person's worth." },
  { selector: ".team-alpha-panel", copy: "Team Alpha. On-duty members contribute command expertise and leadership; wounded, adapting, or deployed members temporarily pause their bonus." },
  { selector: ".team-alpha-slot", copy: "Command slot. Select an eligible adult from the personnel file, then assign or remove them here." },
  { selector: ".crew-roster-list button", copy: (element) => `Open ${element.querySelector("strong")?.textContent?.trim() ?? "this survivor"}'s personnel file. The colored edge shows profile rarity; badges show current status.` },
  { selector: ".crew-rarity-badge", copy: "Rarity affects learning speed and maximum professional breadth. Continuity still counts the person's actual expertise levels, not rarity by itself." },
  { selector: ".crew-career-summary", copy: "Active profession. Work earns job experience; each level takes more experience than the last, up to the profession cap." },
  { selector: ".crew-learning-rate", copy: "Learning multiplier. Rarity, traits, research, and Ark programs can change how quickly this person gains study and job experience." },
  { selector: ".crew-xp-track", copy: "Experience toward the next level in the active profession. Progress is saved and continues through eligible work or study." },
  { selector: ".crew-profile-elevation", copy: "Profile elevation. A costly, voluntary recognition of proven potential that preserves this person's identity, callsign, history, and learned levels." },
  { selector: ".bioadaptation-clinic", copy: "Voluntary Bioadaptation Clinic. It appears after the required research; each adult may freely choose up to two permanent protocols." },
  { selector: ".bioadaptation-grid article", copy: "Permanent voluntary protocol. It can improve field resilience but is never required for Continuity, settlement, rarity, or service." },
  { selector: ".crew-skill-grid > div", copy: "Profession record. The large value is the earned level; the bar shows experience toward the next level." },
  { selector: ".crew-continuity-contribution", copy: "Continuity contribution. One experienced person can supply several points of expertise; highlighted entries are required on the current world." },
  { selector: ".active-training-card", copy: "Active study program. Progress continues offline, but this person is unavailable for duty until study is paused or completed." },
  { selector: ".crew-advanced-record", copy: "Advanced personnel record. Open this only when you want traits, every profession level, profile elevation, or voluntary clinical choices." },

  // Analysis Core and research lattice
  { selector: ".research-command-tabs > button", copy: "Research workspace. Network routes evidence; Projects chooses discoveries; Archive reviews completed work and recovered contradictions." },
  { selector: ".research-lattice-awakening", copy: "Core evolution. Research eras awaken in sequence as the lattice completes major programs and field validations." },
  { selector: ".research-lattice-telemetry > div:nth-child(1)", copy: "Analysis power. Active routes consume power; research and Ark upgrades increase the safe network budget." },
  { selector: ".research-lattice-telemetry > div:nth-child(2)", copy: "Evidence throughput. Researchers, routing, and automation determine how much evidence reaches the Analysis Core each second." },
  { selector: ".research-lattice-telemetry > div:nth-child(3)", copy: "Network efficiency. Stalled inputs, missing expertise, or insufficient power lower effective processing." },
  { selector: ".research-lattice-telemetry > div:nth-child(4)", copy: "Core state. ONLINE means evidence is moving into the selected project; a warning names the exact blocker." },
  { selector: ".research-operations-panel", copy: "Operational expertise. Assigned Researchers provide throughput and help satisfy the lead-expertise requirement for advanced projects." },
  { selector: ".research-lattice-input-bank", copy: "Evidence reservoirs. Expeditions, medical work, engineering, colonies, archives, and threat incidents recover different input types." },
  { selector: ".research-lattice-input", copy: (element) => {
    const name = element.querySelector(".research-lattice-input-title")?.textContent?.replace(/\s+/g, " ").trim();
    const source = element.querySelector(".research-lattice-input-source")?.textContent?.trim();
    return `${name ?? "Research evidence"}. ${source ?? "Recovered by connected Ark systems."} Required inputs are consumed only while the core is processing.`;
  } },
  { selector: ".research-lattice-route", copy: "Evidence route. A lit conduit means this input is flowing through its processor; a stalled route points to a missing reservoir, power, or project requirement." },
  { selector: ".research-lattice-source-node", copy: "Reservoir feed. The amount here is the evidence currently available to this route." },
  { selector: ".research-lattice-processor-node", copy: "Analysis processor. Faster animation means stronger effective throughput from crew, research, and automation support." },
  { selector: ".research-lattice-conduit", copy: "Data conduit. Its pulses visualize evidence moving toward the Analysis Core; dormant lines are not currently required." },
  { selector: ".research-lattice-analysis-core", copy: "Analysis Core. It combines every required evidence stream into the selected project. Its pulse rate and orbit speed rise with real throughput." },
  { selector: ".research-lattice-core-field", copy: "Containment field. Its intensity reflects whether the Analysis Core is powered and receiving valid evidence." },
  { selector: ".research-lattice-core-orbit", copy: "Synthesis orbit. Faster rotation is a visual reward for higher research throughput." },
  { selector: ".research-lattice-core-reactor", copy: "Core reactor. This is the final convergence point for routed evidence before project progress is written." },
  { selector: ".research-lattice-core-readout", copy: "Current analysis readout. Shows the active project, effective processing rate, and progress to the next discovery." },
  { selector: ".research-lattice-core-progress", copy: "Project progress. It advances online and offline whenever every required input, power, crew, and validation condition is satisfied." },
  { selector: ".research-lattice-crew-control", copy: "Research staffing. Assigned Researchers raise throughput, but pulling too many people from Engineering, Medical, or Security can weaken those systems." },
  { selector: ".research-era-tabs > button", copy: "Research era. Later eras contain more expensive programs and deeper connections to defense, automation, biology, and the Null." },
  { selector: ".research-lattice-branch-tabs > button", copy: "Research branch. Branches organize projects by the Ark system they strengthen; prerequisites can cross between branches." },
  { selector: ".research-lattice-project", copy: "Research program. Review its evidence costs, prerequisite, expertise requirement, field validation, and permanent unlock before starting it." },
  { selector: ".research-lattice-project-costs", copy: "Evidence cost. These reservoirs are consumed gradually while analysis runs, not all at once when the project is selected." },
  { selector: ".research-lattice-project-unlocks", copy: "Permanent result. Completed project effects remain active for the rest of the save unless the description explicitly says they are cycle-bound." },
  { selector: ".research-lattice-prerequisite", copy: "Project lock. Complete the named prerequisite or field action first; the Command Briefing should link to the exact missing step." },
  { selector: ".research-lattice-archive", copy: "Completed research archive. Use it to review permanent effects and understand which systems your discoveries now support." },
  { selector: ".research-lattice-echoes", copy: "Null contradictions. These fragments reveal the enemy mystery slowly and may challenge AXIOM's assumptions without immediately explaining the full truth." },
];

function resolveTooltip(start: Element | null): ActiveTooltip | null {
  let element = start;
  while (element && element instanceof HTMLElement && !element.matches("body")) {
    const explicit = element.dataset.pixelTooltip?.trim();
    if (explicit) {
      const place = element.dataset.tooltipPlace;
      return {
        target: element,
        copy: explicit,
        place: place === "above" || place === "below" ? place : undefined,
      };
    }

    const rule = TOOLTIP_RULES.find((candidate) => element.matches(candidate.selector));
    if (rule) {
      return {
        target: element,
        copy: typeof rule.copy === "function" ? rule.copy(element) : rule.copy,
        place: rule.place,
      };
    }

    const nativeTitle = element.getAttribute("title")?.trim();
    if (nativeTitle) return { target: element, copy: nativeTitle };
    element = element.parentElement;
  }
  return null;
}

const hiddenPosition: TooltipPosition = {
  left: -10_000,
  top: -10_000,
  arrowLeft: 20,
  side: "below",
  ready: false,
};

export function PixelTooltipLayer() {
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const [position, setPosition] = useState<TooltipPosition>(hiddenPosition);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<ActiveTooltip | null>(null);
  const nativeTitleRef = useRef<{ target: HTMLElement; title: string } | null>(null);

  const restoreNativeTitle = useCallback(() => {
    const saved = nativeTitleRef.current;
    if (saved && !saved.target.hasAttribute("title")) saved.target.setAttribute("title", saved.title);
    nativeTitleRef.current = null;
  }, []);

  const clearActive = useCallback(() => {
    const current = activeRef.current;
    if (current) delete current.target.dataset.tooltipActive;
    restoreNativeTitle();
    activeRef.current = null;
    setActive(null);
    setPosition(hiddenPosition);
  }, [restoreNativeTitle]);

  const showActive = useCallback((next: ActiveTooltip) => {
    const current = activeRef.current;
    if (current?.target === next.target && current.copy === next.copy) return;
    if (current) delete current.target.dataset.tooltipActive;
    restoreNativeTitle();

    const nativeTitle = next.target.getAttribute("title");
    if (nativeTitle) {
      nativeTitleRef.current = { target: next.target, title: nativeTitle };
      next.target.removeAttribute("title");
    }
    next.target.dataset.tooltipActive = "true";
    activeRef.current = next;
    setPosition(hiddenPosition);
    setActive(next);
  }, [restoreNativeTitle]);

  const updatePosition = useCallback(() => {
    const current = activeRef.current;
    const tooltip = tooltipRef.current;
    if (!current || !tooltip || !current.target.isConnected) return;

    const rect = current.target.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 10;
    const margin = 12;
    const center = rect.left + rect.width / 2;
    const roomBelow = viewportHeight - rect.bottom;
    const requestedAbove = current.place === "above";
    const requestedBelow = current.place === "below";
    const side: TooltipPlacement = requestedAbove || (!requestedBelow && roomBelow < height + gap + margin && rect.top > roomBelow)
      ? "above"
      : "below";
    const left = Math.min(
      Math.max(margin, center - width / 2),
      Math.max(margin, viewportWidth - width - margin),
    );
    const naturalTop = side === "above" ? rect.top - height - gap : rect.bottom + gap;
    const top = Math.min(
      Math.max(margin, naturalTop),
      Math.max(margin, viewportHeight - height - margin),
    );
    const arrowLeft = Math.min(Math.max(12, center - left - 4), Math.max(12, width - 20));

    setPosition({ left, top, arrowLeft, side, ready: true });
  }, []);

  useEffect(() => {
    if (!active) return;
    updatePosition();
  }, [active, updatePosition]);

  useEffect(() => {
    const onPointerOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const next = resolveTooltip(target);
      if (next) showActive(next);
    };
    const onPointerOut = (event: PointerEvent) => {
      const current = activeRef.current;
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (current && related && current.target.contains(related)) return;
      const next = related instanceof Element ? resolveTooltip(related) : null;
      if (next) showActive(next);
      else clearActive();
    };
    const onFocusIn = (event: FocusEvent) => {
      const next = resolveTooltip(event.target instanceof Element ? event.target : null);
      if (next) showActive(next);
    };
    const onFocusOut = (event: FocusEvent) => {
      const related = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      const next = resolveTooltip(related);
      if (next) showActive(next);
      else clearActive();
    };
    const onViewportChange = () => updatePosition();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearActive();
    };

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("keydown", onEscape);
      const current = activeRef.current;
      if (current) delete current.target.dataset.tooltipActive;
      restoreNativeTitle();
      activeRef.current = null;
    };
  }, [clearActive, restoreNativeTitle, showActive, updatePosition]);

  if (typeof document === "undefined" || !active) return null;

  const accent = getComputedStyle(active.target).getPropertyValue("--world-accent").trim() || "#66f2df";
  const tooltipStyle = {
    left: position.left,
    top: position.top,
    visibility: position.ready ? "visible" : "hidden",
    "--tooltip-accent": accent,
    "--tooltip-arrow-left": `${position.arrowLeft}px`,
  } as CSSProperties;

  return createPortal(
    <div
      ref={tooltipRef}
      className={`pixel-tooltip-layer is-${position.side}`}
      style={tooltipStyle}
      role="tooltip"
    >
      <span className="pixel-tooltip-label">AXIOM // CONTEXT</span>
      <span>{active.copy}</span>
    </div>,
    document.body,
  );
}
