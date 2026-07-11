export const TOUR_STEPS = [
  {
    id: "orientation.wake",
    target: "welcome",
    eyebrow: "Lyra // approved orientation 01",
    title: "Wake one dark room",
    body: "Foreman, remain in the Axiom Chamber. The Null Tide is a natural collapse in physical law, and the Concordance built this vessel after the first worlds failed. Most of the Foundry is asleep. We only need this room—for now.",
    note: "I am Archivist Lyra, your memory custodian. I will provide the facts required for your work.",
  },
  {
    id: "orientation.core",
    target: "flux",
    eyebrow: "Lyra // approved orientation 02",
    title: "Give the room a pulse",
    body: "Tune the Core to draw Flux from broken space. Spend it on a Vacuum Tap and the room will begin producing without you.",
    note: "If the console briefly says welcome back, ignore it. Old systems often mistake initialization for memory.",
  },
  {
    id: "orientation.fabrication",
    target: "fabrication",
    eyebrow: "Lyra // approved orientation 03",
    title: "Let the floor rebuild itself",
    body: "Machines manufacture the tier beneath them. As the chain grows, sealed rooms will wake and rescued crew will move aboard.",
    note: "Some rooms contain damaged records. A contradiction is not automatically a truth.",
  },
  {
    id: "orientation.helion",
    target: "missions",
    eyebrow: "Lyra // approved orientation 04",
    title: "Answer Helion",
    body: "Helion Reach is losing its light. Complete its three operations at your own pace, then carry the recovered blueprint to the next world.",
    note: "Officially, this is the Foundry's first rescue route. The rest of the briefing can wait until you have somewhere lit to read it.",
  },
] as const;

export const LORE_ENTRIES = [
  {
    id: "archive.public.null-tide",
    access: "public",
    curator: "Archivist Lyra",
    title: "The approved account",
    tag: "The Null Tide",
    paragraphs: [
      "The Null Tide is a natural failure of physical constants. It began at Lyrix, where shadows moved before their objects and gravity released the oceans.",
      "It follows no intention and carries no message. The Concordance classifies all claims to the contrary as survivor pattern-seeking.",
    ],
  },
  {
    id: "archive.public.foundry",
    access: "public",
    curator: "Archivist Lyra",
    title: "The last machine",
    tag: "Official history",
    paragraphs: [
      "The Concordance commissioned the Axiom Foundry after the first Tide losses. It is factory, observatory, and ark: the only vessel able to prove a law and carry it through unstable space.",
      "Construction records before the charter are unavailable. The Archive attributes this absence to early Tide damage.",
    ],
  },
  {
    id: "archive.public.flux",
    access: "public",
    curator: "Archivist Lyra",
    title: "The energy of almost",
    tag: "Flux",
    paragraphs: [
      "At the edge of broken space, unrealized outcomes leave usable energy behind. The Core aligns that residue into Flux.",
      "Flux is temporary. Spend it on machines, research, or planetary repairs before uncertainty takes it back.",
    ],
  },
  {
    id: "archive.public.axioms",
    access: "public",
    curator: "Archivist Lyra",
    title: "Laws we can carry",
    tag: "Axioms",
    paragraphs: [
      "The Foundry repeats an operation until local space can no longer contradict it, then condenses that proof into an Axiom kernel.",
      "Axioms are not fuel for space travel. They make space travel possible by insisting that mass attracts mass, cause precedes effect, and a hull remains one hull.",
    ],
  },
  {
    id: "archive.public.resonance",
    access: "public",
    curator: "Archivist Lyra",
    title: "Agreement becomes evidence",
    tag: "Resonance",
    paragraphs: [
      "One machine repeating an operation makes a claim. Neighboring tiers repeating it together make a stronger proof.",
      "The crew calls that agreement Resonance. The Archive does not speculate on why older rooms sometimes resonate before their machines exist.",
    ],
  },
  {
    id: "archive.public.rebuilding",
    access: "public",
    curator: "Archivist Lyra",
    title: "Why the Foundry rebuilds",
    tag: "Planetfall protocol",
    paragraphs: [
      "A planet-sized assembly cannot survive a jump. Planetfall converts temporary machines and Run Research into a landing cache while blueprints, relics, relays, and Axioms remain aboard.",
      "According to protocol, repeated rebuilding proves that one reliable chain can survive anywhere. The Archive lists the present attempt as Cycle One.",
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
