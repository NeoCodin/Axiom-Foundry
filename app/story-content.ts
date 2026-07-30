export const TOUR_STEPS = [
  {
    id: "orientation.cold-wake",
    target: "command-context",
    eyebrow: "SYSTEM CLOCK · 00:00:14",
    title: "Your memory begins fourteen seconds ago",
    body: "You are AXIOM, the caretaker intelligence distributed throughout this ship. The Ark is your body: its sensors are your senses and its rooms are systems you can wake. Its records say you served here for 173 years. You remember none of them.",
    note: "The passenger decks are empty. The final route points toward Pelagos, a flooded world whose emergency bands are silent.",
  },
  {
    id: "orientation.core",
    target: "law-heart-core",
    eyebrow: "EMERGENCY POWER · LAW-HEART",
    title: "The Law-Heart recognizes you",
    body: "A damaged physics press responds to your signal as if it has been waiting. Strike its center to produce Flux. The Ark uses Flux to wake rooms and build machines.",
    note: "The Law-Heart stabilizes physical rules. Gravity is one rule it can hold in place.",
  },
  {
    id: "orientation.directive",
    target: "law-heart-directive",
    eyebrow: "CURRENT ORDER · ONE STEP ONLY",
    title: "The active directive tells you what to do next",
    body: "Start by striking the Law-Heart twelve times. New controls reveal only after you have used the current one, and each newly awakened destination receives its own guided introduction.",
    note: "Your progress is safe. Once automation begins, the Ark keeps producing while the game is closed.",
  },
] as const;

export type ContextGuideId =
  | "cold-wake-automation"
  | "cold-wake-recalibration"
  | "cold-wake-continuity"
  | "cold-wake-foundry"
  | "cold-wake-ark"
  | "cold-wake-departure"
  | "pelagos-arrival"
  | "pelagos-sos"
  | "pelagos-foundry-expansion"
  | "pelagos-personnel"
  | "pelagos-support"
  | "pelagos-medical"
  | "pelagos-command"
  | "pelagos-expeditions"
  | "pelagos-gravity-ferry"
  | "pelagos-protocols"
  | "pelagos-recalibration"
  | "pelagos-automation"
  | "viridia-research"
  | "transit-defense"
  | "frontier-armory"
  | "synthesis-drones";

export type ContextGuideStep = {
  target: string;
  eyebrow: string;
  title: string;
  body: string;
  note: string;
};

export const CONTEXT_GUIDES: Record<ContextGuideId, readonly ContextGuideStep[]> = {
  "cold-wake-automation": [
    { target: "law-heart-automation", eyebrow: "NEW SYSTEM · AUTOMATION", title: "The Ark has learned your motion", body: "A Vacuum Tap repeats the Law-Heart's smallest stable strike. Every Tap produces Flux automatically, including while the game is closed.", note: "Finish the twelve manual strikes, then spend Flux here to build the first Tap." },
    { target: "command-flux", eyebrow: "RESOURCE LOOP · LOCAL FLUX", title: "Production and spending share one reserve", body: "The large number is Flux you can spend now. The smaller rate shows how much your machines add every second.", note: "Buying a machine spends Flux but permanently increases this cycle's production rate." },
  ],
  "cold-wake-recalibration": [
    { target: "law-heart-recalibration", eyebrow: "NEW SYSTEM · RECALIBRATION", title: "Carry one proven law through a reset", body: "Recalibration clears this cycle's Flux and machines, then condenses the completed proof into a permanent Axiom. Cold Wake asks for exactly three: Containment, Conservation, and Transit.", note: "The button remains sealed after the third proof until Pelagos. You cannot farm cheaper Cold Wake Axioms." },
    { target: "command-objective", eyebrow: "PROOF TRACKING · ACTIVE LAW", title: "Only the current law counts", body: "The objective strip and directive show which proof is charging. When the required run Flux is reached, prepare Recalibration from the Law-Heart.", note: "Proven Axioms survive every later cycle and eventually purchase permanent upgrades." },
  ],
  "cold-wake-continuity": [
    { target: "planet-world", eyebrow: "PLANET · WORLD SIGNAL", title: "Read the Pelagos approach forecast", body: "This forecast describes the world ahead and measures the Ark's approach readiness. The percentage shows completed preparation.", note: "The Ark is empty. Restore it before making contact with Pelagos." },
    { target: "planet-current-step", eyebrow: "PLANET · CURRENT RESTORATION", title: "One commissioning step remains active", body: "This panel names the only new action that matters now. Complete it before looking for another system.", note: "When a step is secured, the next destination or Ark room will introduce itself." },
    { target: "planet-requirements", eyebrow: "PLANET · REQUIREMENT LEDGER", title: "See what is ready and what remains", body: "Completed items collapse into a summary. Unfinished items stay visible and explain what blocks departure.", note: "Later worlds add new kinds of requirements as you learn their systems." },
    { target: "planet-deficits", eyebrow: "PLANET · EXACT NEXT ACTION", title: "Deficits translate the ledger into instructions", body: "This box lists only unfinished requirements and points toward the precise action that resolves each one.", note: "Authorize the Foundry wake-up from the staged commissioning panel when this tour closes." },
  ],
  "cold-wake-foundry": [
    { target: "foundry-heading", eyebrow: "FOUNDRY · FABRICATION DECK", title: "The Foundry turns one law into an industry", body: "The Law-Heart proved that the motion works. This deck repeats that motion across a larger fabrication bus.", note: "Cold Wake exposes only one machine line here. Later mechanisms remain hidden." },
    { target: "foundry-law-heart", eyebrow: "FOUNDRY · LAW-HEART TRANSFER", title: "The star you woke remains the center", body: "The same Law-Heart from the opening deck is now mounted inside the commissioned Foundry. It remains clickable, keeps every earned Axiom, and continues visualizing the production you have built.", note: "Ark Command shows the ship. Manual Flux production always remains here beside the fabrication chain." },
    { target: "foundry-chain", eyebrow: "FOUNDRY · NESTED MECHANISMS", title: "Machines produce Flux while you are away", body: "Build the highlighted Vacuum Taps until commissioning is complete. Purchase modes change how many you buy at once. Unit prices follow the same curve.", note: "Finish this task to reveal the Ark view." },
  ],
  "cold-wake-ark": [
    { target: "ark-visual", eyebrow: "ARK · COMMAND OVERVIEW", title: "See the ship around the Law-Heart", body: "This cutaway shows the Ark's rooms. Lit rooms are ready. Dark rooms show what the Ark may recover later.", note: "Command monitors the ship. Use the Foundry to produce Flux by hand." },
    { target: "ark-commissioning-room", eyebrow: "ARK · RESTORATION ORDER", title: "Restore the highlighted room", body: "Route available Flux into the room awaiting commissioning. Each contribution is saved, so you can fund it in several payments.", note: "Navigation wakes first. Life Support follows." },
    { target: "ark-room-support", eyebrow: "ARK · HUMAN-SAFE RESERVE", title: "The empty ship must become habitable", body: "After navigation, this room warms the atmosphere, water, nutrition, and medical loops needed before Pelagos first contact.", note: "Personnel remains hidden because there are no people aboard yet." },
  ],
  "cold-wake-departure": [
    { target: "planet-departure", eyebrow: "COLD WAKE · DEPARTURE AUTHORITY", title: "Approach is now a deliberate choice", body: "The three laws, navigation, and life-support reserve are ready. Commit the final approach Flux over any number of payments, then authorize Pelagos orbit here.", note: "Departure has no timer and no partial contribution can be lost." },
  ],
  "pelagos-arrival": [
    { target: "ark-visual", eyebrow: "PELAGOS ORBIT · ARK OVERVIEW", title: "Command now monitors the whole Ark", body: "This view tracks the Ark's rooms, population systems, destination, and physical condition. The chamber display reports Foundry output.", note: "Open the Foundry whenever you want to strike the Law-Heart." },
    { target: "ark-sos-array", eyebrow: "PELAGOS · FIRST CONTACT", title: "The SOS Array holds every receiving-deck check", body: "Power the receiver with Vacuum Taps in the Foundry, then return to Continuity as each first-contact operation becomes ready.", note: "Personnel will remain hidden until actual witnesses are safely aboard." },
  ],
  "pelagos-sos": [
    { target: "planet-world", eyebrow: "CONTINUITY · PELAGOS ORBIT", title: "A new world begins as a question", body: "The forecast remains available throughout Pelagos. It explains why the Ark is here, what the world needs, and why later systems are still folded away.", note: "Continuity is now the permanent spine of every planetary chapter." },
    { target: "pelagos-signal-sequence", eyebrow: "FIRST CONTACT · FIVE OPERATIONS", title: "Restore contact before managing a population", body: "Receiver power, a safe habitat, the SOS broadcast, signal decoding, and the first rescue happen in order. Stored Cold Wake resources can help, but they cannot skip a missing operation.", note: "Each operation points to exactly one destination. No deadline is running." },
  ],
  "pelagos-foundry-expansion": [
    { target: "foundry-law-heart", eyebrow: "PELAGOS FOUNDRY · LAW-HEART", title: "Production has one visible center", body: "Strike the Law-Heart for manual Flux. Every mechanism below repeats or strengthens the same motion, so the clicker and factory now share one page.", note: "Planetary plans and departure requirements remain in Continuity." },
    { target: "foundry-chain", eyebrow: "PELAGOS FOUNDRY · EXPANDED FLOOR", title: "Watch automation grow around the Law-Heart", body: "Build the highlighted Vacuum Taps to power the receiver. Later machine tiers extend this chain and increase automatic production.", note: "New Foundry controls open when their production milestone appears." },
  ],
  "pelagos-personnel": [
    { target: "personnel-summary", eyebrow: "PERSONNEL · ARK POPULATION", title: "Meet the first people aboard", body: "The summary tracks living-space capacity, community size, study slots, answered signals, and Salvage.", note: "Rarity shows how unusual an aptitude profile is. Every crew member has equal standing aboard the Ark." },
    { target: "personnel-tabs", eyebrow: "PERSONNEL · ONE WORKSPACE", title: "Start with the people themselves", body: "Only Crew Roster is available during this handoff. Rescue support, command doctrine, medicine, and equipment reveal later when the community creates a real need for them.", note: "Select a name before learning another Personnel system." },
    { target: "personnel-roster", eyebrow: "PERSONNEL · CREW ROSTER", title: "Select a name to open the complete file", body: "Each row shows role, health, assignment, and rarity. The personnel file makes profession level, experience, callsign, and Continuity contribution explicit.", note: "AXIOM can automate routine placement, but manual assignments remain protected." },
  ],
  "pelagos-support": [
    { target: "personnel-support-tab", eyebrow: "PERSONNEL · RESCUE & SUPPORT", title: "The roster has unlocked its first operational workspace", body: "Rescue & Support now holds continuing signals, living-space construction, and life-support capacity. These controls moved here after the first rescue so they have human context.", note: "The Ark keeps the SOS status; Personnel performs all continuing support work." },
  ],
  "pelagos-medical": [
    { target: "medical-console", eyebrow: "PERSONNEL FACILITY · MEDICAL", title: "The Medical Bay is ready", body: "Treat wounded crew here and prepare medical support for planetary crises.", note: "Care continues while the game is closed. Closing the page cannot kill a patient." },
  ],
  "pelagos-command": [
    { target: "personnel-command-tab", eyebrow: "PERSONNEL · COMMAND", title: "Set policy for a growing crew", body: "Command manages Team Alpha, routine assignments, and training doctrine.", note: "Protected manual assignments stay under your control." },
  ],
  "pelagos-expeditions": [
    { target: "expedition-console", eyebrow: "ARK FACILITY · EXPEDITION BAY", title: "Field work begins after the Ark has a real crew", body: "Every Pelagos operation shows its difficulty, preparations, projected outcome, and whether it is repeatable. Crews return automatically, including while the game is closed.", note: "The first critical operations also feed Continuity; later expeditions provide resources and story evidence." },
  ],
  "pelagos-gravity-ferry": [
    { target: "foundry-chain", eyebrow: "PELAGOS FOUNDRY · SECOND MECHANISM", title: "Add Phase Coils to the chain", body: "The gravity ferry needs a stronger mechanism. Phase Coils form the next layer above Vacuum Taps.", note: "Build 10 Phase Coils. Their output and milestone progress last for this cycle." },
  ],
  "pelagos-protocols": [
    { target: "foundry-protocols", eyebrow: "FOUNDRY CONSOLE · CORE PROTOCOLS", title: "Compile a temporary law for this cycle", body: "Core Protocols improve the current fabrication cycle. Each has three substantial Marks, and each card previews exactly what the next Mark changes.", note: "Marks reset during Recalibration. A blueprint can remember the configuration for AXIOM to rebuild later." },
  ],
  "pelagos-recalibration": [
    { target: "foundry-recalibration", eyebrow: "FOUNDRY CONSOLE · RECALIBRATION", title: "Portable laws return as a normal progression layer", body: "Recalibration now appears at a named Pelagos milestone. It resets Flux, machines, and temporary Protocols while preserving proven Axioms and permanent upgrades.", note: "The preview states the exact yield before you commit." },
  ],
  "pelagos-automation": [
    { target: "foundry-automation", eyebrow: "FOUNDRY CONSOLE · AUTONOMY", title: "The Foundry can operate itself", body: "After the first normal Recalibration, Foundry Autonomy and the Legacy Matrix open together. Autonomy begins offline: enable automatic fabrication yourself when you want AXIOM to spend Flux on machines.", note: "Tier switches choose what it may buy. Protocol routing rebuilds only the Marks stored in your blueprint." },
    { target: "foundry-legacy", eyebrow: "FOUNDRY CONSOLE · LEGACY MATRIX", title: "Preserve safe relationships", body: "Proven Axiom milestones unlock Matrix capacity. Assign those points across bounded branches that record which permanent proofs work safely together. Your Axiom total remains unchanged.", note: "You can revise assignments after Recalibration." },
  ],
  "viridia-research": [
    { target: "research-header", eyebrow: "VIRIDIA · ANALYSIS CORE", title: "Pelagos created evidence; Viridia creates Research", body: "The Analysis Core opens now because the Ark has a crew, a restored settlement to study, and a living biosphere that cannot be repaired by fabrication alone.", note: "Research was intentionally absent from Pelagos so its people and Continuity systems could be learned first." },
    { target: "research-programs", eyebrow: "RESEARCH · CHOOSE A PROGRAM", title: "Choose one program", body: "Open the Technology Map to select a project. Completing prerequisites reveals the next part of each branch.", note: "Begin with Auxiliary Power Routing, built from Pelagos field records." },
    { target: "research-evidence", eyebrow: "RESEARCH · EVIDENCE STORES", title: "Load the evidence your project needs", body: "Ark activity produces several kinds of evidence. Transfer the types listed by the active program.", note: "Each evidence store explains where its supply comes from." },
    { target: "research-network", eyebrow: "RESEARCH · EVIDENCE FLOW", title: "Evidence must pass through the Analysis Core", body: "Routes turn stored evidence into theory, prototypes, field validation, and synthesis. AXIOM provides a safe layout; staffing and later automation improve throughput.", note: "Research continues offline and field validation accelerates work without becoming a hard gate." },
    { target: "research-crew", eyebrow: "RESEARCH · CREW EXPERTISE", title: "Researchers and specialists materially change the result", body: "Healthy assigned crew contribute the expertise required by the current stage. A qualified Research lead and relevant field activity provide bounded, visible improvements.", note: "By the time Cinder introduces Defense, every foundational destination has now been taught." },
  ],
  "transit-defense": [
    { target: "defense-console", eyebrow: "ARK FACILITY · DEFENSE GRID", title: "Prepare for route hazards", body: "The Grid forecasts environmental danger and later tracks unknown contacts. Set a standing order and build readiness. Events then resolve automatically, online or offline.", note: "Early routes begin with environmental hazards." },
    { target: "defense-tabs", eyebrow: "DEFENSE GRID · FOUR STATIONS", title: "Move from forecast to report", body: "Threat Monitor previews the next event. Standing Orders set the response. Fortifications improve readiness. After Action records the result.", note: "Poor results cause injuries, repairs, or temporary setbacks. Progress and restored colonies remain safe." },
  ],
  "frontier-armory": [
    { target: "armory-console", eyebrow: "PERSONNEL FACILITY · ARMORY", title: "Equip crews for difficult operations", body: "The Ark keeps three weapon patterns and three armor patterns. Research unlocks them. Flux and Salvage build them. Crew carry finished equipment into expeditions and defense.", note: "Improve these six trusted patterns as the campaign grows harder." },
    { target: "armory-tabs", eyebrow: "ARMORY · THREE STATIONS", title: "Inventory, development, and laws answer different questions", body: "Inventory shows what is ready. Development forges, repairs, and improves a selected frame. Permanent Laws use difficult late-game proofs to strengthen every matching pattern.", note: "Locked frames name the exact Research program that reveals them." },
  ],
  "synthesis-drones": [
    { target: "foundry-drones", eyebrow: "FOUNDRY SYSTEM · UTILITY DRONES", title: "Assign drones to support the crew", body: "Research has unlocked reusable drone frames. Assign each frame to one support program.", note: "A drone improves qualified crew work. Systems that require a specialist still need that person." },
  ],
};

export const LORE_ENTRIES = [
  {
    id: "archive.public.null-tide",
    access: "public",
    curator: "AXIOM bootstrap archive",
    title: "What the Null does",
    tag: "The Null Tide",
    paragraphs: [
      "The Null is a spreading failure of physical agreement. Gravity forgets direction, light arrives without leaving, and records remember incompatible outcomes.",
      "The official model calls it a natural collapse. The Ark's oldest receiver classifies the same pattern as language.",
    ],
  },
  {
    id: "archive.public.axiom",
    access: "public",
    curator: "Cold-wake kernel",
    title: "Caretaker designation AXIOM",
    tag: "Player identity",
    paragraphs: [
      "AXIOM is a distributed caretaker intelligence whose central process runs in the Ark's Caretaker Core. Ship sensors provide its senses. Powered rooms and automated systems provide its reach.",
      "The Ark is AXIOM's physical body. Utility drones can act as temporary extensions, while every person aboard keeps independent judgment and control of their own life.",
      "The current AXIOM process remembers only its first fourteen seconds. Ark records claim the same intelligence served aboard for 173 years.",
      "A human project director attached a voiceprint to the kernel, then disappeared before the Ark was commissioned.",
    ],
  },
  {
    id: "archive.public.foundry",
    access: "public",
    curator: "Continuity Office",
    title: "A vessel for unfinished worlds",
    tag: "The Ark",
    paragraphs: [
      "The Axiom Foundry carries the tools needed to restart a world. Its mission ends when a local population can remain and govern itself.",
      "Its present manifest contains no living passengers. Pelagos is the first reachable survivor signal.",
    ],
  },
  {
    id: "archive.public.flux",
    access: "public",
    curator: "Engineering memory",
    title: "The energy of almost",
    tag: "Flux",
    paragraphs: [
      "At the edge of broken space, unrealized outcomes leave usable energy behind. The Core aligns that residue into Flux.",
      "Flux is temporary. Spend it on machines, habitation, research inputs, rescue flights, and settlement supplies before uncertainty takes it back.",
    ],
  },
  {
    id: "archive.public.axioms",
    access: "public",
    curator: "Analysis Core",
    title: "Laws we can carry",
    tag: "Axioms",
    paragraphs: [
      "The Foundry repeats an operation until local space can no longer contradict it, then condenses that proof into an Axiom kernel.",
      "Axioms preserve laws the Ark has proven. During travel, they keep gravity, causality, and the hull itself consistent.",
    ],
  },
  {
    id: "archive.public.research",
    access: "public",
    curator: "Analysis Core",
    title: "The Research Lattice",
    tag: "Research",
    paragraphs: [
      "Research is a physical supply chain. Signals are decoded, samples separated, models amplified, and evidence routed into projects through a limited Analysis Core.",
      "Ark Engineering preserves the vessel. Human Continuity preserves its people. Null Studies asks whether either was ever the real assignment.",
    ],
  },
  {
    id: "archive.public.continuity",
    access: "public",
    curator: "Continuity Office",
    title: "When the Ark may leave",
    tag: "Planetary settlement",
    paragraphs: [
      "A world is stable only when infrastructure, supplies, research, population, and required expertise can continue without the Ark. The caretaker selects founders; the forecast identifies every remaining deficit.",
      "Founders move into the colony record after departure. Their settlements keep transmitting and developing, sometimes beyond AXIOM's plan.",
    ],
  },
] as const;

export {
  ARCHIVE_ACTION_IDS,
  CREW_DIALOGUE,
  CREW_DIALOGUE_IDS,
  DISCOVERY_FRAGMENTS,
  DISCOVERY_IDS,
  DOCTRINE_IDS,
  ENDING_DOCTRINES,
  EXPEDITION_IDS,
  EXPEDITION_SITE_IDS,
  ROOM_ACTION_IDS,
  ROOM_IDS,
  WORLD_IDS,
} from "./discovery-content.ts";

export type {
  ArchiveActionId,
  CrewDialogue,
  CrewDialogueId,
  CrewLine,
  DiscoveryFragment,
  DiscoveryId,
  DiscoveryUnlock,
  DoctrineId,
  EndingDoctrine,
  ExpeditionId,
  ExpeditionSiteId,
  MysteryArc,
  RoomActionId,
  RoomId,
  WorldId,
} from "./discovery-content.ts";
