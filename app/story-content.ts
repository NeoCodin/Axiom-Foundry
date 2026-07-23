export const TOUR_STEPS = [
  {
    id: "orientation.cold-wake",
    target: "command-context",
    eyebrow: "SYSTEM CLOCK // 00:00:14",
    title: "You have been conscious for fourteen seconds",
    body: "Ship records identify this vessel as the Ark and identify you as AXIOM, its caretaker intelligence. You remember neither. The Ark was built to carry human life between worlds, but its passenger decks are empty and most systems are dark.",
    note: "Its final navigation route points toward Pelagos, a flooded world whose emergency bands are silent.",
  },
  {
    id: "orientation.core",
    target: "law-heart-core",
    eyebrow: "EMERGENCY POWER // LAW-HEART",
    title: "One machine still answers you",
    body: "The Law-Heart is a damaged physics press. Strike its center to produce Flux—the temporary energy the Ark needs to wake rooms, build machines, and prepare for Pelagos.",
    note: "The large central control is the only action you need right now.",
  },
  {
    id: "orientation.directive",
    target: "law-heart-directive",
    eyebrow: "CURRENT ORDER // ONE STEP ONLY",
    title: "The active directive tells you what to do next",
    body: "Start by striking the Law-Heart twelve times. New controls reveal only after you have used the current one, and each newly awakened destination receives its own guided introduction.",
    note: "Nothing expires. The Ark continues producing while the game is closed, and no hidden timer can erase progress.",
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
  | "viridia-research";

export type ContextGuideStep = {
  target: string;
  eyebrow: string;
  title: string;
  body: string;
  note: string;
};

export const CONTEXT_GUIDES: Record<ContextGuideId, readonly ContextGuideStep[]> = {
  "cold-wake-automation": [
    { target: "law-heart-automation", eyebrow: "NEW SYSTEM // AUTOMATION", title: "The Ark has learned your motion", body: "A Vacuum Tap repeats the Law-Heart's smallest stable strike. Every Tap produces Flux automatically, including while the game is closed.", note: "Finish the twelve manual strikes, then spend Flux here to build the first Tap." },
    { target: "command-flux", eyebrow: "RESOURCE LOOP // LOCAL FLUX", title: "Production and spending share one reserve", body: "The large number is Flux you can spend now. The smaller rate shows how much your machines add every second.", note: "Buying a machine spends Flux but permanently increases this cycle's production rate." },
  ],
  "cold-wake-recalibration": [
    { target: "law-heart-recalibration", eyebrow: "NEW SYSTEM // RECALIBRATION", title: "Carry one proven law through a reset", body: "Recalibration clears this cycle's Flux and machines, then condenses the completed proof into a permanent Axiom. Cold Wake asks for exactly three: Containment, Conservation, and Transit.", note: "The button remains sealed after the third proof until Pelagos. You cannot farm cheaper Cold Wake Axioms." },
    { target: "command-objective", eyebrow: "PROOF TRACKING // ACTIVE LAW", title: "Only the current law counts", body: "The objective strip and directive show which proof is charging. When the required run Flux is reached, prepare Recalibration from the Law-Heart.", note: "Proven Axioms survive every later cycle and eventually purchase permanent upgrades." },
  ],
  "cold-wake-continuity": [
    { target: "planet-world", eyebrow: "PLANET // WORLD SIGNAL", title: "Pelagos is a destination, not a completed rescue", body: "This forecast describes the world ahead and estimates whether the Ark can safely approach it. The percentage is readiness, not a countdown.", note: "Cold Wake contains no settlers. You are restoring the empty Ark before it meets anyone." },
    { target: "planet-current-step", eyebrow: "PLANET // CURRENT RESTORATION", title: "One commissioning step remains active", body: "This panel names the only new action that matters now. Complete it before looking for another system.", note: "When a step is secured, the next destination or Ark room will introduce itself." },
    { target: "planet-requirements", eyebrow: "PLANET // REQUIREMENT LEDGER", title: "The ledger records what is already secure", body: "Secured items collapse into a summary. Remaining items stay visible so you never have to guess why departure is locked.", note: "Later worlds expand this ledger with people, expertise, supplies, expeditions, and crises." },
    { target: "planet-deficits", eyebrow: "PLANET // EXACT NEXT ACTION", title: "Deficits translate the ledger into instructions", body: "This box lists only unfinished requirements and points toward the precise action that resolves each one.", note: "Authorize the Foundry wake-up from the staged commissioning panel when this tour closes." },
  ],
  "cold-wake-foundry": [
    { target: "foundry-heading", eyebrow: "FOUNDRY // FABRICATION DECK", title: "The Foundry turns one law into an industry", body: "The Law-Heart proved that the motion works. This deck repeats that motion across a larger fabrication bus.", note: "Cold Wake exposes only one machine line here. Later mechanisms remain hidden." },
    { target: "foundry-chain", eyebrow: "FOUNDRY // NESTED MECHANISMS", title: "Machines create the idle economy", body: "Build the highlighted Vacuum Taps until the commissioning directive is complete. Purchase modes change quantity, not the underlying price curve.", note: "The next Ark view will appear only after this single task is secure." },
  ],
  "cold-wake-ark": [
    { target: "ark-visual", eyebrow: "ARK // COMMAND OVERVIEW", title: "The Law-Heart belongs to a much larger ship", body: "This cutaway shows the Ark as physical rooms. Lit rooms are usable; dark rooms are previews, not new responsibilities.", note: "The Axiom Chamber is a status monitor here. Manual Flux production belongs to the Foundry." },
    { target: "ark-commissioning-room", eyebrow: "ARK // RESTORATION ORDER", title: "The highlighted room is the work itself", body: "Route available Flux directly into the room awaiting commissioning. Partial contributions are saved permanently, so you never need the entire reserve at once.", note: "Navigation wakes first. The Ark will highlight Life Support next." },
    { target: "ark-room-support", eyebrow: "ARK // HUMAN-SAFE RESERVE", title: "The empty ship must become habitable", body: "After navigation, this room warms the atmosphere, water, nutrition, and medical loops needed before Pelagos first contact.", note: "Personnel remains hidden because there are no people aboard yet." },
  ],
  "cold-wake-departure": [
    { target: "planet-departure", eyebrow: "COLD WAKE // DEPARTURE AUTHORITY", title: "Approach is now a deliberate choice", body: "The three laws, navigation, and life-support reserve are ready. Commit the final approach Flux over any number of payments, then authorize Pelagos orbit here.", note: "Departure has no timer and no partial contribution can be lost." },
  ],
  "pelagos-arrival": [
    { target: "ark-visual", eyebrow: "PELAGOS ORBIT // ARK OVERVIEW", title: "The Ark is now a ship, not a production button", body: "Command shows the Ark's rooms, population systems, destination, and physical condition. Its Axiom Chamber reports Foundry output but no longer produces Flux when clicked.", note: "The interactive Law-Heart now lives on the Foundry page beside the machines it powers." },
    { target: "ark-sos-array", eyebrow: "PELAGOS // FIRST CONTACT", title: "The SOS Array holds every receiving-deck check", body: "Restore the receiver through Continuity, then prepare atmosphere, water, nutrition, and medical reserves directly inside this panel before broadcasting.", note: "Personnel will remain hidden until actual witnesses are safely aboard." },
  ],
  "pelagos-sos": [
    { target: "planet-world", eyebrow: "CONTINUITY // PELAGOS ORBIT", title: "A new world begins as a question", body: "The forecast remains available throughout Pelagos. It explains why the Ark is here, what the world needs, and why later systems are still folded away.", note: "Continuity is now the permanent spine of every planetary chapter." },
    { target: "pelagos-signal-sequence", eyebrow: "FIRST CONTACT // FIVE OPERATIONS", title: "Restore contact before managing a population", body: "Receiver power, a safe habitat, the SOS broadcast, signal decoding, and the first rescue happen in order. Stored Cold Wake resources can help, but they cannot skip a missing operation.", note: "Each operation points to exactly one destination. No deadline is running." },
  ],
  "pelagos-foundry-expansion": [
    { target: "foundry-law-heart", eyebrow: "PELAGOS FOUNDRY // LAW-HEART", title: "Production has one visible center", body: "Strike the Law-Heart for manual Flux. Every mechanism below repeats or strengthens the same motion, so the clicker and factory now share one page.", note: "Planetary plans and departure requirements remain in Continuity." },
    { target: "foundry-chain", eyebrow: "PELAGOS FOUNDRY // EXPANDED FLOOR", title: "The chain explains what the Law-Heart is automating", body: "Build the receiver's highlighted Vacuum Taps here. Later machine tiers extend the same visible chain rather than appearing as unrelated boxes.", note: "Protocols, Recalibration, and Autonomy remain sealed until a named production milestone introduces them." },
  ],
  "pelagos-personnel": [
    { target: "personnel-summary", eyebrow: "PERSONNEL // ARK POPULATION", title: "These are people, not production units", body: "The summary tracks capacity, community size, available study slots, answered signals, and Salvage without hiding the limits behind a submenu.", note: "Rarity describes how unusual a person's aptitude profile is; it never measures human worth." },
    { target: "personnel-tabs", eyebrow: "PERSONNEL // ONE WORKSPACE", title: "Start with the people themselves", body: "Only Crew Roster is available during this handoff. Rescue support, command doctrine, medicine, and equipment reveal later when the community creates a real need for them.", note: "Select a name before learning another Personnel system." },
    { target: "personnel-roster", eyebrow: "PERSONNEL // CREW ROSTER", title: "Select a name to open the complete file", body: "Each row shows role, health, assignment, and rarity. The personnel file makes profession level, experience, callsign, and Continuity contribution explicit.", note: "AXIOM can automate routine placement, but manual assignments remain protected." },
  ],
  "pelagos-support": [
    { target: "personnel-tabs", eyebrow: "PERSONNEL // RESCUE & SUPPORT", title: "The roster has unlocked its first operational workspace", body: "Rescue & Support now holds continuing signals, living-space construction, and life-support capacity. These controls moved here after the first rescue so they have human context.", note: "The Ark keeps the SOS status; Personnel performs all continuing support work." },
  ],
  "pelagos-medical": [
    { target: "medical-console", eyebrow: "PERSONNEL FACILITY // MEDICAL", title: "Medical opens when care becomes real work", body: "The Medical Bay treats wounded crew and supports planetary crises. It did not appear with the first healthy witnesses because an empty clinic was not yet a responsibility.", note: "Care continues offline. Nobody dies because the page was closed." },
  ],
  "pelagos-command": [
    { target: "personnel-tabs", eyebrow: "PERSONNEL // COMMAND", title: "A larger crew now needs standing policy", body: "Command manages Team Alpha, automated assignments, and training doctrine only after the Ark has enough trained people for those choices to matter.", note: "Automation never overwrites a manual assignment you protected." },
  ],
  "pelagos-expeditions": [
    { target: "expedition-console", eyebrow: "ARK FACILITY // EXPEDITION BAY", title: "Field work begins after the Ark has a real crew", body: "Every Pelagos operation shows its difficulty, preparations, projected outcome, and whether it is repeatable. Crews return automatically, including while the game is closed.", note: "The first critical operations also feed Continuity; later expeditions provide resources and story evidence." },
  ],
  "pelagos-gravity-ferry": [
    { target: "foundry-chain", eyebrow: "PELAGOS FOUNDRY // SECOND MECHANISM", title: "First contact has given fabrication a new purpose", body: "The Phase Coil appears only now because the gravity-ferry directive requires it. Coils do not replace Vacuum Taps; they form the next nested layer of the same production chain.", note: "Build 10 new Phase Coils. Their visible output, cost, and milestone bar all belong to this cycle." },
  ],
  "pelagos-protocols": [
    { target: "foundry-protocols", eyebrow: "FOUNDRY CONSOLE // CORE PROTOCOLS", title: "Engineering optimization is now a deliberate system", body: "Core Protocols improve the current fabrication cycle. They appear because the gravity-ferry operation now requires them—not because an invisible Flux total was crossed.", note: "Protocol levels reset during Recalibration, so buy them for the current cycle's goal." },
  ],
  "pelagos-recalibration": [
    { target: "foundry-recalibration", eyebrow: "FOUNDRY CONSOLE // RECALIBRATION", title: "Portable laws return as a normal progression layer", body: "Recalibration now appears at a named Pelagos milestone. It resets Flux, machines, and temporary Protocols while preserving proven Axioms and permanent upgrades.", note: "The preview states the exact yield before you commit." },
  ],
  "pelagos-automation": [
    { target: "foundry-automation", eyebrow: "FOUNDRY CONSOLE // AUTONOMY", title: "The first Pelagos law can operate the factory", body: "After the first normal Recalibration, Autonomy and the Legacy Matrix open together. Autonomy begins offline: enable Autonomous fabrication yourself when you want AXIOM to spend Flux on machines.", note: "Tier switches choose what it may buy. Protocol routing is separate, and neither system acts before you turn it on." },
  ],
  "viridia-research": [
    { target: "research-header", eyebrow: "VIRIDIA // ANALYSIS CORE", title: "Pelagos created evidence; Viridia creates Research", body: "The Analysis Core opens now because the Ark has a crew, a restored settlement to study, and a living biosphere that cannot be repaired by fabrication alone.", note: "Research was intentionally absent from Pelagos so its people and Continuity systems could be learned first." },
    { target: "research-programs", eyebrow: "RESEARCH // CHOOSE A PROGRAM", title: "Work on one deliberate capability at a time", body: "Programs begin in the Technology Map. Prerequisites reveal a path instead of exposing the entire tree at once.", note: "Auxiliary Power Routing is the first available project and is built from Pelagos field records." },
    { target: "research-evidence", eyebrow: "RESEARCH // EVIDENCE RESERVOIRS", title: "Projects consume evidence, not Flux alone", body: "Calibration Data, Engineering Models, Biological Samples, and Cultural Records accumulate through Ark activity. Transfer only the inputs the active program needs.", note: "The source of every evidence type is written directly beneath its reservoir." },
    { target: "research-network", eyebrow: "RESEARCH // PHYSICAL LATTICE", title: "Evidence must pass through the Analysis Core", body: "Routes turn stored evidence into theory, prototypes, field validation, and synthesis. AXIOM provides a safe layout; staffing and later automation improve throughput.", note: "Research continues offline and field validation accelerates work without becoming a hard gate." },
    { target: "research-crew", eyebrow: "RESEARCH // CREW EXPERTISE", title: "Researchers and specialists materially change the result", body: "Healthy assigned crew contribute the expertise required by the current stage. A qualified Research lead and relevant field activity provide bounded, visible improvements.", note: "By the time Cinder introduces Defense, every foundational destination has now been taught." },
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
      "AXIOM is the Ark's caretaker intelligence: engineer, navigator, teacher, and witness. It awakens when no biological command authority remains aboard.",
      "The voiceprint attached to the kernel belongs to a human project director who disappeared before the Ark was commissioned.",
    ],
  },
  {
    id: "archive.public.foundry",
    access: "public",
    curator: "Continuity Office",
    title: "A vessel for unfinished worlds",
    tag: "The Ark",
    paragraphs: [
      "The Axiom Foundry is an interplanetary ark, factory, school, and observatory. It does not evacuate a dying planet and abandon it; it restores a population capable of remaining behind.",
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
      "Axioms are not fuel for space travel. They make travel possible by insisting that mass attracts mass, cause precedes effect, and a hull remains one hull.",
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
      "Founders are never erased from the roster. Their colony continues to transmit, trade, grow, and occasionally disagree with AXIOM's approved plan.",
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
