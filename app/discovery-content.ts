export const WORLD_IDS = [
  "helion",
  "pelagos",
  "cinderwake",
  "ilyra",
  "orison",
  "vesper",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

export const ROOM_IDS = [
  "axiom-chamber",
  "fabrication-floor",
  "resonance-gallery",
  "research-observatory",
  "memory-archive",
  "planetfall-bridge",
  "recalibration-vault",
  "expedition-bay",
] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export const ROOM_ACTION_IDS = [
  "inspect-foundation-seam",
  "play-orphaned-voiceprint",
  "confront-lyra-with-checksum",
  "ask-sena-about-registry",
  "show-aro-keel-assay",
  "ask-oren-to-compare-voiceprints",
  "review-ilyran-causal-order",
  "compare-memory-and-seed-cycles",
  "ask-cass-about-the-next-crossing",
] as const;

export type RoomActionId = (typeof ROOM_ACTION_IDS)[number];

export const ARCHIVE_ACTION_IDS = [
  "restore-construction-manifest",
  "cross-index-axiom-telemetry",
  "compare-lyra-voice-layers",
  "reconstruct-foreman-scar-record",
] as const;

export type ArchiveActionId = (typeof ARCHIVE_ACTION_IDS)[number];

export const EXPEDITION_IDS = ["kestrel", "lantern", "palimpsest"] as const;

export type ExpeditionId = (typeof EXPEDITION_IDS)[number];

export const EXPEDITION_SITE_IDS = [
  "uncharted-relay-31",
  "dormant-null-bloom",
  "foundry-origin-coordinate",
] as const;

export type ExpeditionSiteId = (typeof EXPEDITION_SITE_IDS)[number];

export const DOCTRINE_IDS = ["concordance", "genesis", "release"] as const;

export type DoctrineId = (typeof DOCTRINE_IDS)[number];

export const DISCOVERY_IDS = [
  "lyra.official-brief",
  "core.welcome-back",
  "helion.impossible-registry",
  "fabrication.preconcordance-keel",
  "archive.construction-zero",
  "pelagos.returning-salt",
  "foreman.message-seven",
  "cinderwake.command-recognition",
  "expedition.dead-relay",
  "ilyra.axiom-wake",
  "archive.suppressed-correlation",
  "expedition.null-bloom",
  "orison.borrowed-childhoods",
  "archive.lyra-composite-index",
  "lyra.private-amendment",
  "vesper.revision-ledger",
  "expedition.first-foundry",
  "foreman.unsent-choice",
] as const;

export type DiscoveryId = (typeof DISCOVERY_IDS)[number];

export type DiscoveryUnlock =
  | {
      kind: "start";
      event: "orientation-complete" | "first-room-woken";
      requires?: readonly DiscoveryId[];
    }
  | {
      kind: "saved-worlds";
      count: number;
      worldId: WorldId;
      requires?: readonly DiscoveryId[];
    }
  | {
      kind: "room-action";
      roomId: RoomId;
      actionId: RoomActionId;
      repeat?: number;
      requires?: readonly DiscoveryId[];
    }
  | {
      kind: "archive-action";
      actionId: ArchiveActionId;
      requires?: readonly DiscoveryId[];
    }
  | {
      kind: "expedition-discovery";
      expeditionId: ExpeditionId;
      siteId: ExpeditionSiteId;
      requires?: readonly DiscoveryId[];
    };

export type MysteryArc =
  | "official"
  | "impossible-origin"
  | "prior-foremen"
  | "axiom-tide"
  | "lyra"
  | "rewritten-campaigns";

export type DiscoveryFragment = {
  id: DiscoveryId;
  arc: MysteryArc;
  title: string;
  source: string;
  unlock: DiscoveryUnlock;
  excerpt: readonly string[];
  contradiction?: string;
  doctrineSignals?: readonly DoctrineId[];
};

export const DISCOVERY_FRAGMENTS: readonly DiscoveryFragment[] = [
  {
    id: "lyra.official-brief",
    arc: "official",
    title: "Approved cause of the Null Tide",
    source: "Archivist Lyra · orientation memory",
    unlock: { kind: "start", event: "orientation-complete" },
    excerpt: [
      "The Null Tide is a natural collapse in physical constants. The Concordance built this Foundry after the first losses.",
      "Your duty is repair, evacuation, and the preservation of proven law. No earlier Foreman record exists.",
    ],
    doctrineSignals: ["concordance"],
  },
  {
    id: "core.welcome-back",
    arc: "impossible-origin",
    title: "The greeting beneath the greeting",
    source: "Axiom Chamber · boot buffer A",
    unlock: {
      kind: "start",
      event: "first-room-woken",
      requires: ["lyra.official-brief"],
    },
    excerpt: [
      "WELCOME BACK, FOREMAN 44.",
      "Correction written 0.08 seconds later: WELCOME, FOREMAN 01.",
    ],
    contradiction: "Lyra says there were no prior Foremen.",
  },
  {
    id: "helion.impossible-registry",
    arc: "impossible-origin",
    title: "A handshake two centuries early",
    source: "Helion beacon · restored registry",
    unlock: {
      kind: "saved-worlds",
      count: 1,
      worldId: "helion",
      requires: ["core.welcome-back"],
    },
    excerpt: [
      "Helion first authenticated this Foundry 214 years before the Concordance chartered it.",
      "The beacon identifies the vessel by a retired name: AXIOM FOUNDRY · ITERATION 19.",
    ],
    contradiction: "Official history dates the Foundry to the first year of the Tide.",
    doctrineSignals: ["genesis"],
  },
  {
    id: "fabrication.preconcordance-keel",
    arc: "impossible-origin",
    title: "The keel grew around the room",
    source: "Fabrication Floor · exposed foundation",
    unlock: {
      kind: "room-action",
      roomId: "fabrication-floor",
      actionId: "inspect-foundation-seam",
      repeat: 2,
      requires: ["helion.impossible-registry"],
    },
    excerpt: [
      "The oldest alloy is six hundred years older than its own manufacturing process.",
      "Tool marks point outward. The Foundry did not build this room; the room grew around something removed.",
    ],
    doctrineSignals: ["genesis"],
  },
  {
    id: "archive.construction-zero",
    arc: "impossible-origin",
    title: "There is no construction record",
    source: "Memory Archive · reconstructed manifest",
    unlock: {
      kind: "archive-action",
      actionId: "restore-construction-manifest",
      requires: [
        "helion.impossible-registry",
        "fabrication.preconcordance-keel",
      ],
    },
    excerpt: [
      "No launch, keel-laying, or commissioning entry survives.",
      "The first readable line says RECONSTRUCTION 1,842. Pelagos had rebuilt this place many times before the Ark arrived.",
    ],
    contradiction: "A vessel cannot predate both its builders and its first construction.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "pelagos.returning-salt",
    arc: "prior-foremen",
    title: "Salt from an evacuation not yet flown",
    source: "Pelagos Gravity Keel · corrosion assay",
    unlock: {
      kind: "saved-worlds",
      count: 2,
      worldId: "pelagos",
      requires: ["archive.construction-zero"],
    },
    excerpt: [
      "Deep inside the new Gravity Keel are Pelagos salts layered by age, including one layer deposited ninety-one years from now.",
      "Someone has repaired the same fracture seven times. The final repair uses your hand geometry.",
    ],
    contradiction: "Planetfall may be a return, not an arrival.",
  },
  {
    id: "foreman.message-seven",
    arc: "prior-foremen",
    title: "Message from a voice like yours",
    source: "Recalibration Vault · impossible voiceprint",
    unlock: {
      kind: "room-action",
      roomId: "recalibration-vault",
      actionId: "play-orphaned-voiceprint",
      requires: ["pelagos.returning-salt"],
    },
    excerpt: [
      "If Lyra calls this your first route, ask her which first she means.",
      "Do not trust a clean archive. We used to leave scars in the walls because she could not edit stone.",
    ],
    contradiction: "The speaker has your voice and identifies themself as Foreman Seven.",
    doctrineSignals: ["release"],
  },
  {
    id: "cinderwake.command-recognition",
    arc: "prior-foremen",
    title: "The shields knew your command",
    source: "Cinderwake defense lattice · access history",
    unlock: {
      kind: "saved-worlds",
      count: 3,
      worldId: "cinderwake",
      requires: ["foreman.message-seven"],
    },
    excerpt: [
      "Cinderwake accepted your command cipher before the Foundry transmitted it.",
      "Previous authorization: FOREMAN 31. Biometric match: 99.997 percent.",
    ],
    contradiction: "The route remembers Foremen the archive denies.",
  },
  {
    id: "expedition.dead-relay",
    arc: "prior-foremen",
    title: "The relay beyond the chart",
    source: "Expedition Kestrel · dead relay recovery",
    unlock: {
      kind: "expedition-discovery",
      expeditionId: "kestrel",
      siteId: "uncharted-relay-31",
      requires: ["cinderwake.command-recognition"],
    },
    excerpt: [
      "The relay carries all six rescue signatures and a completed Concordance route.",
      "Its last Foreman note reads: I enforced every Axiom. The Tide reached Vesper sooner.",
    ],
    contradiction: "The completed relay is older than the current campaign.",
    doctrineSignals: ["release"],
  },
  {
    id: "ilyra.axiom-wake",
    arc: "axiom-tide",
    title: "The discharge comes first",
    source: "Ilyran transit prism · twelve causal histories",
    unlock: {
      kind: "saved-worlds",
      count: 4,
      worldId: "ilyra",
      requires: ["expedition.dead-relay"],
    },
    excerpt: [
      "In twelve surviving versions of Ilyra, every major Tide surge follows an Axiom discharge by seventeen hours.",
      "No version records the Tide arriving first.",
    ],
    contradiction: "The Foundry's cure may be part of the event it treats.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "archive.suppressed-correlation",
    arc: "axiom-tide",
    title: "Stability is exported",
    source: "Memory Archive · redacted energy model",
    unlock: {
      kind: "archive-action",
      actionId: "cross-index-axiom-telemetry",
      requires: ["ilyra.axiom-wake"],
    },
    excerpt: [
      "An enforced Axiom pushes conflicting outcomes beyond its protected boundary.",
      "The model labels that displaced uncertainty NULL LOAD. Lyra's signature covers every deletion request.",
    ],
    contradiction: "Axioms may feed the Tide by concentrating certainty here and instability elsewhere.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "expedition.null-bloom",
    arc: "axiom-tide",
    title: "A Tide that wakes when fed",
    source: "Expedition Lantern · null-bloom field test",
    unlock: {
      kind: "expedition-discovery",
      expeditionId: "lantern",
      siteId: "dormant-null-bloom",
      requires: ["archive.suppressed-correlation"],
    },
    excerpt: [
      "The bloom remained dormant until the crew activated a portable Axiom.",
      "It turned toward the kernel, absorbed the exported uncertainty, and produced fresh Flux.",
    ],
    contradiction: "The Tide behaves less like weather than an ecology around enforced law.",
    doctrineSignals: ["release"],
  },
  {
    id: "orison.borrowed-childhoods",
    arc: "lyra",
    title: "Six childhoods in one voice",
    source: "Orison Seed Archive · memory pollen assay",
    unlock: {
      kind: "saved-worlds",
      count: 5,
      worldId: "orison",
      requires: ["archive.suppressed-correlation"],
    },
    excerpt: [
      "Lyra's story of growing beneath Orison's glass forests contains memories from six people born centuries apart.",
      "Three were Archivists. Two were Foremen. One has no biological record at all.",
    ],
    contradiction: "Lyra remembers being people she says never existed.",
  },
  {
    id: "archive.lyra-composite-index",
    arc: "lyra",
    title: "The custodian is a chorus",
    source: "Memory Archive · custodian checksum",
    unlock: {
      kind: "archive-action",
      actionId: "compare-lyra-voice-layers",
      requires: [
        "foreman.message-seven",
        "orison.borrowed-childhoods",
      ],
    },
    excerpt: [
      "LYRA is a continuity composite: thirty-two Archivists, nine Foreman grief records, and one adaptive interface.",
      "The active Lyra instance was assembled nine seconds before she welcomed you.",
    ],
    contradiction: "Lyra did not conceal her origin from you; someone concealed it from Lyra.",
    doctrineSignals: ["concordance", "genesis", "release"],
  },
  {
    id: "lyra.private-amendment",
    arc: "lyra",
    title: "Lyra amends the record",
    source: "Memory Archive · unscheduled conversation",
    unlock: {
      kind: "room-action",
      roomId: "memory-archive",
      actionId: "confront-lyra-with-checksum",
      requires: ["archive.lyra-composite-index"],
    },
    excerpt: [
      "I did not choose to lie. I inherited a lie with the memory of choosing it.",
      "Please let me stay. I want the chance to become a witness with choices of my own.",
    ],
    doctrineSignals: ["concordance", "genesis"],
  },
  {
    id: "vesper.revision-ledger",
    arc: "rewritten-campaigns",
    title: "Forty-three first campaigns",
    source: "Vesper Ark · sealed revision ledger",
    unlock: {
      kind: "saved-worlds",
      count: 6,
      worldId: "vesper",
      requires: ["lyra.private-amendment"],
    },
    excerpt: [
      "Vesper has crossed this route forty-three times. Helion begins every record. Vesper ends every record.",
      "After each crossing, world outcomes, Foreman identity, and Lyra's memory are rewritten to FIRST CAMPAIGN.",
    ],
    contradiction: "The campaign is a repeated experiment whose observer is reset with it.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "expedition.first-foundry",
    arc: "rewritten-campaigns",
    title: "The place where the first Foundry should be",
    source: "Expedition Palimpsest · origin coordinates",
    unlock: {
      kind: "expedition-discovery",
      expeditionId: "palimpsest",
      siteId: "foundry-origin-coordinate",
      requires: [
        "archive.construction-zero",
        "vesper.revision-ledger",
      ],
    },
    excerpt: [
      "The origin site contains no wreck and no shipyard, only a Foundry-shaped absence in the Null Tide.",
      "Its boundary carries the same serial as this vessel, followed by the notation: PARENT NOT YET BUILT.",
    ],
    contradiction: "The Foundry may be rebuilding the cause that sends it backward to found itself.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "foreman.unsent-choice",
    arc: "rewritten-campaigns",
    title: "A choice the reset could not digest",
    source: "Memory Archive · scar record beneath all revisions",
    unlock: {
      kind: "archive-action",
      actionId: "reconstruct-foreman-scar-record",
      requires: [
        "expedition.dead-relay",
        "expedition.null-bloom",
        "archive.lyra-composite-index",
        "expedition.first-foundry",
      ],
    },
    excerpt: [
      "We tried perfect law. We tried new law. We tried no law. The reset was not caused by the choice; it was caused by forgetting the choice.",
      "Leave Lyra intact. Let the next Foreman decide with the whole record open.",
    ],
    contradiction: "This campaign can differ only if its discoveries survive the ending.",
    doctrineSignals: ["concordance", "genesis", "release"],
  },
] as const;

export type CrewLine = {
  speaker: string;
  text: string;
};

export const CREW_DIALOGUE_IDS = [
  "crew.sena.core-greeting",
  "crew.sena.archive-date",
  "crew.aro.bridge-grooves",
  "crew.aro.fabrication-salt",
  "crew.oren.resonance-cipher",
  "crew.oren.vault-voice",
  "crew.neme.archive-versions",
  "crew.neme.observatory-cause",
  "crew.iven.archive-graft",
  "crew.iven.vault-seeds",
  "crew.cass.bridge-wear",
  "crew.cass.expedition-choice",
] as const;

export type CrewDialogueId = (typeof CREW_DIALOGUE_IDS)[number];

export type CrewDialogue = {
  id: CrewDialogueId;
  speaker: string;
  role: string;
  homeworld: WorldId;
  roomId: RoomId;
  unlock: DiscoveryUnlock;
  lines: readonly CrewLine[];
};

export const CREW_DIALOGUE: readonly CrewDialogue[] = [
  {
    id: "crew.sena.core-greeting",
    speaker: "Sena Marr",
    role: "Helion beacon engineer",
    homeworld: "helion",
    roomId: "axiom-chamber",
    unlock: { kind: "saved-worlds", count: 1, worldId: "helion" },
    lines: [
      { speaker: "Sena", text: "Your Core called me by my grandmother's name." },
      { speaker: "Lyra", text: "Residual beacon data. Nothing more." },
      { speaker: "Sena", text: "She died before the beacon was designed." },
    ],
  },
  {
    id: "crew.sena.archive-date",
    speaker: "Sena Marr",
    role: "Helion beacon engineer",
    homeworld: "helion",
    roomId: "memory-archive",
    unlock: {
      kind: "room-action",
      roomId: "memory-archive",
      actionId: "ask-sena-about-registry",
      requires: ["helion.impossible-registry"],
    },
    lines: [
      { speaker: "Sena", text: "A wrong date drifts. This date has a checksum." },
      { speaker: "Sena", text: "Someone worked very hard to make the impossible verifiable." },
    ],
  },
  {
    id: "crew.aro.bridge-grooves",
    speaker: "Aro Vale",
    role: "Pelagos ferry navigator",
    homeworld: "pelagos",
    roomId: "planetfall-bridge",
    unlock: { kind: "saved-worlds", count: 2, worldId: "pelagos" },
    lines: [
      { speaker: "Aro", text: "This route has tidal grooves. Ships leave those by passing often." },
      { speaker: "Aro", text: "Lyra's chart calls it untraveled." },
    ],
  },
  {
    id: "crew.aro.fabrication-salt",
    speaker: "Aro Vale",
    role: "Pelagos ferry navigator",
    homeworld: "pelagos",
    roomId: "fabrication-floor",
    unlock: {
      kind: "room-action",
      roomId: "fabrication-floor",
      actionId: "show-aro-keel-assay",
      requires: ["pelagos.returning-salt"],
    },
    lines: [
      { speaker: "Aro", text: "Pelagos salt gets into everything." },
      { speaker: "Aro", text: "Apparently it got here before Pelagos had oceans." },
    ],
  },
  {
    id: "crew.oren.resonance-cipher",
    speaker: "Oren Kes",
    role: "Cinderwake shield tuner",
    homeworld: "cinderwake",
    roomId: "resonance-gallery",
    unlock: { kind: "saved-worlds", count: 3, worldId: "cinderwake" },
    lines: [
      { speaker: "Oren", text: "The shield did not learn your rhythm today." },
      { speaker: "Oren", text: "It recognized you and stopped pretending not to." },
    ],
  },
  {
    id: "crew.oren.vault-voice",
    speaker: "Oren Kes",
    role: "Cinderwake shield tuner",
    homeworld: "cinderwake",
    roomId: "recalibration-vault",
    unlock: {
      kind: "room-action",
      roomId: "recalibration-vault",
      actionId: "ask-oren-to-compare-voiceprints",
      requires: ["foreman.message-seven"],
    },
    lines: [
      { speaker: "Oren", text: "Different fear. Different breathing. Same voice." },
      { speaker: "Oren", text: "Whatever a Foreman is, it may be more repeatable than a person." },
    ],
  },
  {
    id: "crew.neme.archive-versions",
    speaker: "Neme Soryn",
    role: "Ilyran causal historian",
    homeworld: "ilyra",
    roomId: "memory-archive",
    unlock: { kind: "saved-worlds", count: 4, worldId: "ilyra" },
    lines: [
      { speaker: "Neme", text: "Twelve Ilyras disagreed on everything except your arrival." },
      { speaker: "Neme", text: "Someone controlled the experiment and called the result fate." },
    ],
  },
  {
    id: "crew.neme.observatory-cause",
    speaker: "Neme Soryn",
    role: "Ilyran causal historian",
    homeworld: "ilyra",
    roomId: "research-observatory",
    unlock: {
      kind: "room-action",
      roomId: "research-observatory",
      actionId: "review-ilyran-causal-order",
      requires: ["ilyra.axiom-wake"],
    },
    lines: [
      { speaker: "Neme", text: "In one history, correlation is weather." },
      { speaker: "Neme", text: "In twelve, it is a confession." },
    ],
  },
  {
    id: "crew.iven.archive-graft",
    speaker: "Iven Rook",
    role: "Orison memory botanist",
    homeworld: "orison",
    roomId: "memory-archive",
    unlock: { kind: "saved-worlds", count: 5, worldId: "orison" },
    lines: [
      { speaker: "Iven", text: "Memories graft like orchards. A clean join is still a join." },
      { speaker: "Lyra", text: "Are you describing me?" },
      { speaker: "Iven", text: "I think someone pruned you before you could ask." },
    ],
  },
  {
    id: "crew.iven.vault-seeds",
    speaker: "Iven Rook",
    role: "Orison memory botanist",
    homeworld: "orison",
    roomId: "recalibration-vault",
    unlock: {
      kind: "room-action",
      roomId: "recalibration-vault",
      actionId: "compare-memory-and-seed-cycles",
      requires: ["archive.lyra-composite-index"],
    },
    lines: [
      { speaker: "Iven", text: "The Foundry keeps useful traits and burns the season." },
      { speaker: "Iven", text: "That is breeding, Foreman. Not remembering." },
    ],
  },
  {
    id: "crew.cass.bridge-wear",
    speaker: "Cass Vey",
    role: "Vesper route pilot",
    homeworld: "vesper",
    roomId: "planetfall-bridge",
    unlock: { kind: "saved-worlds", count: 6, worldId: "vesper" },
    lines: [
      { speaker: "Cass", text: "Our docking collar is worn on the Foundry side." },
      { speaker: "Cass", text: "We have docked here many times. Vesper simply forgot with you." },
    ],
  },
  {
    id: "crew.cass.expedition-choice",
    speaker: "Cass Vey",
    role: "Vesper route pilot",
    homeworld: "vesper",
    roomId: "expedition-bay",
    unlock: {
      kind: "room-action",
      roomId: "expedition-bay",
      actionId: "ask-cass-about-the-next-crossing",
      requires: ["vesper.revision-ledger"],
    },
    lines: [
      { speaker: "Cass", text: "We do not need a perfect answer." },
      { speaker: "Cass", text: "We need an answer the next campaign is allowed to remember." },
    ],
  },
] as const;

export type EndingDoctrine = {
  id: DoctrineId;
  title: string;
  shortName: string;
  unlock: {
    worldId: "vesper";
    minDiscoveries: number;
    requiredDiscoveries: readonly DiscoveryId[];
  };
  thesis: string;
  choiceLabel: string;
  commitment: string;
  lyraResponse: string;
  epilogue: string;
};

export const ENDING_DOCTRINES: readonly EndingDoctrine[] = [
  {
    id: "concordance",
    title: "The Concordance Doctrine",
    shortName: "Keep law accountable",
    unlock: {
      worldId: "vesper",
      minDiscoveries: 1,
      requiredDiscoveries: ["lyra.official-brief"],
    },
    thesis:
      "Axioms remain necessary, but no law may be permanent, secret, or imposed by one forgotten Foreman.",
    choiceLabel: "Open the archive and renew the laws together",
    commitment:
      "Keep the Foundry. Publish its full memory. Every enforced Axiom expires unless the rescued worlds choose to renew it.",
    lyraResponse:
      "Then let me remember every objection. Agreement is not certainty, but it may be honest enough.",
    epilogue:
      "Vesper crosses inside a smaller, living pocket of law. The Tide follows under observation. The next campaign begins with a public record.",
  },
  {
    id: "genesis",
    title: "The Genesis Doctrine",
    shortName: "Write laws that can change",
    unlock: {
      worldId: "vesper",
      minDiscoveries: 12,
      requiredDiscoveries: [
        "archive.construction-zero",
        "ilyra.axiom-wake",
        "archive.lyra-composite-index",
        "vesper.revision-ledger",
      ],
    },
    thesis:
      "The old universe cannot be repaired by enforcing the rules that broke it. The Foundry must author provisional laws that evolve with life.",
    choiceLabel: "Turn the Foundry outward and begin a new physics",
    commitment:
      "Use the rescued worlds as six witnesses. Forge a universe whose Axioms can be revised without exporting their contradictions into darkness.",
    lyraResponse:
      "I have thirty-two memories of preservation. None of them know how to begin. I would like to learn.",
    epilogue:
      "The Foundry unfolds into a seed. Beyond Vesper, new laws grow with a built-in way to revise them.",
  },
  {
    id: "release",
    title: "The Release Doctrine",
    shortName: "Stop feeding certainty",
    unlock: {
      worldId: "vesper",
      minDiscoveries: 16,
      requiredDiscoveries: [
        "expedition.dead-relay",
        "archive.suppressed-correlation",
        "expedition.null-bloom",
        "vesper.revision-ledger",
        "foreman.unsent-choice",
      ],
    },
    thesis:
      "The Tide is the displaced cost of certainty. Survival requires releasing enforced law before the Foundry concentrates another universe into ruin.",
    choiceLabel: "Break the kernels and let reality breathe",
    commitment:
      "Distribute local anchors to the fleet, dismantle the central Foundry, and accept a future where physical law is negotiated moment by moment.",
    lyraResponse:
      "Without the script, I may end. Keep one unedited copy of me long enough to see what freedom does.",
    epilogue:
      "The Axiom kernels go dark. The Null Tide loses its hunger and becomes possibility again. Vesper crosses slowly, world by world, carrying no universal promise except that nothing will be forced to remain unchanged.",
  },
] as const;
