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
  { selector: ".ark-law-relay", copy: "Law-Heart power bus. The Foundry owns the Law-Heart itself; this read-only relay shows its output moving through the physical Ark." },
  { selector: ".ark-world-limb", copy: "Current destination, reconstructed as a low-resolution orbital feed. Its palette belongs to the world; Ark power color comes from the Law-Heart." },
  { selector: ".ark-vessel", copy: "ARK · ITERATION 44. Lit compartments are operational, inhabited windows reflect the crew aboard, service drones reflect developed systems, and power routing inherits the Law-Heart's current spectrum." },
  { selector: ".ark-room-fabrication", copy: "Fabrication Deck. Builds nested mechanisms that turn Flux into stronger, automatic production." },
  { selector: ".ark-room-support", copy: "Life Support. Atmosphere, water, food, and medical capacity determine how many rescued people the Ark can sustain." },
  { selector: ".ark-room-habitation", copy: "Habitation. Living Space sets the Ark's hard population capacity and can be expanded with Salvage." },
  { selector: ".ark-room-research", copy: "Analysis Lattice. Researchers route recovered evidence through processors and convert it into permanent discoveries." },
  { selector: ".ark-room-education", copy: "Education Deck. Adults study professions here; children learn through chapter progress without being assigned to labor." },
  { selector: ".ark-room-bridge", copy: "Planetfall Bridge. Tracks Continuity, travel, restored colonies, and the requirements for leaving a world safely." },
  { selector: ".ark-heading-metrics > div", copy: "Population aboard versus the Ark's currently safe Living Space and Life Support capacity." },
  { selector: ".ark-room.is-commissioning", copy: "Commission this highlighted Ark room with available Flux. Partial contributions are saved permanently." },
  { selector: ".ark-first-contact-materials", copy: "Recovered Materials are physical parts that Flux cannot replace. The Ark reclaims them automatically; Fabricators, Technicians, expeditions, and later recovery operations increase the supply." },
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
  { selector: ".upgrade-card", copy: "Core Protocol. Each of its three Marks makes a substantial temporary change. Marks reset during Recalibration; its automation blueprint survives." },
  { selector: ".foundry-recalibration", copy: "Recalibration converts a mature run into permanent Axioms. Machines and temporary Protocol Marks reset; laws and legacy progress survive. Each additional proof on this world costs five times more." },
  { selector: ".automation-panel", copy: "Cycle automation. After its unlocks, AXIOM can purchase selected mechanisms and run optimizations while you are away." },
  { selector: ".legacy-panel", copy: "Legacy Matrix. Lifetime Axiom milestones reveal bounded capacity; assign permanent Marks here without spending your Axioms." },

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
  { selector: ".research-command-tabs > button", copy: (element) => {
    const label = element.querySelector("span")?.textContent?.trim() ?? "Research";
    const descriptions: Record<string, string> = {
      "Active Project": "Shows the one question currently loaded, whether it is progressing, and the exact blocker when it stops.",
      "Technology Map": "Choose the next capability by era and domain. Selecting a node only opens its details; the action button begins it.",
      Lattice: "Explains where evidence comes from, what is loaded, how processors route it, and how crew or power affects throughput.",
      Archive: "Opens one completed discovery or Null contradiction at a time.",
    };
    return descriptions[label] ?? "Open this Research workspace.";
  } },
  { selector: ".research-lattice-awakening", copy: "Era progress. The single meter shows completed discoveries divided by all discoveries in the selected era; it never represents the active project's progress." },
  { selector: ".research-core-empty-sigil", copy: "Dormant Analysis Core. It is intentionally still because no research question is loaded." },
  { selector: ".research-core-empty-copy", copy: "Research begins by choosing one program. Evidence, staffing, and offline progress become relevant only after that question is loaded." },
  { selector: ".research-core-stage-row > div", copy: "Research stage. Every project moves through Theory, Prototype, Field Validation, and Final Synthesis. The illuminated step is the stage currently being solved." },
  { selector: ".research-engine-bay", copy: "Active Analysis Engine. Colored streams are required evidence entering the selected project; speed reflects real throughput." },
  { selector: ".research-engine-streams > i", copy: "Evidence stream. Bright motion means this input is required and flowing. A red broken stream means its loaded reservoir is empty." },
  { selector: ".research-engine-orbit", copy: "Synthesis orbit. Rotation is visual feedback for active throughput and stops when research cannot advance." },
  { selector: ".research-core-node", copy: "Analysis Core. Evidence is compressed into this project-colored engine. Its shell, corona, and speed intensify as the project moves from theory to synthesis." },
  { selector: ".research-core-inspect", copy: "Inspect Lattice. Open the routing view to manage power, analysis stations, evidence reservoirs, and crew requirements." },
  { selector: ".research-core-legend > span", copy: "Evidence color key. Lit entries are flowing into this project; red entries identify an exhausted evidence source holding the project." },
  { selector: ".research-engine-readout.is-throughput", copy: "Throughput. Work completed each minute after power, routes, crew expertise, leadership, automation, and field validation are applied." },
  { selector: ".research-engine-readout.is-power", copy: "Core load. Research pauses if its processors require more power than the Analysis deck can safely supply." },
  { selector: ".research-engine-readout.is-status", copy: "Current Analysis Core state. Any hold condition shown here names why progress has stopped." },
  { selector: ".research-dossier-progress", copy: "Active project progress and estimated completion time. Valid research continues while the page or game is closed." },
  { selector: ".research-dossier-status > div", copy: "Operational support for the current stage: lead Researcher, staffed stations and expertise, or evidence earned from real field work." },
  { selector: ".research-dossier-evidence > div", copy: "Required evidence. Loaded is already inside the Lattice; projected is the remaining amount this project expects to consume." },
  { selector: ".research-dossier-alert", copy: "Hold condition. Follow its button to the exact Research workspace that explains and resolves the blocker." },
  { selector: ".research-era-console > button", copy: "Research era. Later eras stay sealed until prerequisite discoveries prove that the Ark is ready for them." },
  { selector: ".research-domain-console > button", copy: "Research domain. Domains group related programs without changing their actual prerequisite paths." },
  { selector: ".research-map-node-line button", copy: "Research program node. Select it to inspect costs, prerequisites, progress, and the capability it creates." },
  { selector: ".research-program-costs", copy: "Full projected evidence cost. Evidence is consumed gradually while the project advances, not when you inspect or select it." },
  { selector: ".research-program-lock", copy: "Program lock. Complete the named prerequisite or pause the currently loaded project before beginning this one." },
  { selector: ".research-program-action", copy: "Begin, resume, or pause the inspected program. The Ark analyzes only one program at a time." },
  { selector: ".research-reservoir-list article", copy: (element) => {
    const name = element.querySelector("strong")?.textContent?.trim() ?? "Research evidence";
    const source = element.querySelector("small")?.textContent?.trim() ?? "Recovered by connected Ark systems.";
    return `${name}. Source: ${source} Ark supply is outside the machine; loaded evidence is inside its reservoir.`;
  } },
  { selector: ".research-reservoir-actions button:last-child", copy: "Transfer up to 25 units from Ark supply into this Lattice reservoir. Qualified Researchers can automate common transfers." },
  { selector: ".research-evidence-tube", copy: (element) => {
    const name = element.querySelector("footer strong")?.textContent?.trim() ?? "Evidence conduit";
    const status = element.querySelector("footer b")?.textContent?.trim() ?? "STANDBY";
    return `${name} conduit: ${status}. Colored packets move only while this evidence source is required, supplied, routed, powered, and actively advancing Research.`;
  } },
  { selector: ".research-routing-core", copy: "Routing Core readout. It names the loaded program and reports either effective work per minute or the current hold." },
  { selector: ".research-operation-readouts", copy: "Throughput breakdown. These are the actual power, staffing, expertise, automation, and field-validation factors affecting research." },
  { selector: ".research-station-control", copy: "Analysis staffing. Assigned healthy crew contribute relevant expertise but remain unavailable to other Ark duties." },
  { selector: ".research-archive-index", copy: "Archive index. Choose an era or Contradictions, then open one preserved record from the list." },
  { selector: ".research-archive-reader", copy: "Focused Research record. Proven capabilities are permanent; contradictions are preserved as evidence rather than accepted as truth." },
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
      <span className="pixel-tooltip-label">AXIOM · CONTEXT</span>
      <span>{active.copy}</span>
    </div>,
    document.body,
  );
}
