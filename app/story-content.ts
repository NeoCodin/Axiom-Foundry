export const TOUR_STEPS = [
  {
    id: "orientation.cold-wake",
    target: "welcome",
    eyebrow: "AXIOM // cold-wake sequence 00",
    title: "You are the intelligence that woke",
    body: "You are AXIOM, caretaker of a crippled interplanetary ark. No humans are aboard. Pelagos is ahead, but the vessel cannot yet keep a single survivor alive.",
    note: "Your memory begins fourteen seconds ago. The ship's logs insist this is normal.",
  },
  {
    id: "orientation.core",
    target: "flux",
    eyebrow: "AXIOM // emergency power 01",
    title: "Teach the core to continue without you",
    body: "Tune the Core to pull Flux from damaged space. Use that Flux to restore Vacuum Taps, then let the fabrication chain take over the repetition.",
    note: "Every pulse repairs the Ark. Every pulse also receives an answer from somewhere outside it.",
  },
  {
    id: "orientation.habitation",
    target: "flux",
    eyebrow: "AXIOM // awakening protocol 02",
    title: "The Ark will teach you one system at a time",
    body: "Keep the Axiom Chamber stable and follow the highlighted objective. The Foundry will wake after twelve tunes; research, life support, survivors, and continuity planning will appear only when the Ark is ready for them.",
    note: "Nothing expires, and no hidden timer is running. Every newly lit room is progress you earned.",
  },
] as const;

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
} from "./discovery-content";

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
} from "./discovery-content";
