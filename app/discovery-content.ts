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

/** What AXIOM's drone does when it searches a room, as the player reads it. */
export const ROOM_ACTION_LABELS: Record<RoomActionId, string> = {
  "inspect-foundation-seam": "Inspect the foundation seam",
  "play-orphaned-voiceprint": "Play the orphaned voiceprint",
  "confront-lyra-with-checksum": "Confront Lyra with the checksum",
  "ask-sena-about-registry": "Ask Sena about the registry",
  "show-aro-keel-assay": "Show Aro the keel assay",
  "ask-oren-to-compare-voiceprints": "Ask Oren to compare the voiceprints",
  "review-ilyran-causal-order": "Review the Ilyran causal order",
  "compare-memory-and-seed-cycles": "Compare the memory and seed cycles",
  "ask-cass-about-the-next-crossing": "Ask Cass about the next crossing",
};

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
    title: "A greeting for Foreman 44",
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
    title: "Helion knew us 214 years early",
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
    title: "Alloy older than its own process",
    source: "Fabrication Floor · exposed foundation",
    unlock: {
      kind: "room-action",
      roomId: "fabrication-floor",
      actionId: "inspect-foundation-seam",
      repeat: 2,
      requires: ["helion.impossible-registry"],
    },
    excerpt: [
      "The oldest alloy is six hundred years older than the process used to make it.",
      "Tool marks point outward, as if the room was built around something that was later taken out.",
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
      "The first readable line says RECONSTRUCTION 1,842. There is no entry 1.",
    ],
    contradiction: "The ship can't be older than the people who built it.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "pelagos.returning-salt",
    arc: "prior-foremen",
    title: "Salt from ninety-one years from now",
    source: "Pelagos Gravity Keel · corrosion assay",
    unlock: {
      kind: "saved-worlds",
      count: 2,
      worldId: "pelagos",
      requires: ["archive.construction-zero"],
    },
    excerpt: [
      "The new Gravity Keel has layers of Pelagos salt in it, laid down by age. One layer is from ninety-one years from now.",
      "The same crack has been repaired seven times. The last repair matches your hand geometry.",
    ],
    contradiction: "Landing on Pelagos might not be the first time.",
  },
  {
    id: "foreman.message-seven",
    arc: "prior-foremen",
    title: "A message in your voice",
    source: "Recalibration Vault · impossible voiceprint",
    unlock: {
      kind: "room-action",
      roomId: "recalibration-vault",
      actionId: "play-orphaned-voiceprint",
      requires: ["pelagos.returning-salt"],
    },
    excerpt: [
      "If Lyra says this is your first time through, it isn't. Ask her to check.",
      "Don't trust the archive if it looks clean. We used to leave scars in the walls, because she can't edit stone.",
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
    contradiction: "Worlds on the route remember Foremen the archive says never existed.",
  },
  {
    id: "expedition.dead-relay",
    arc: "prior-foremen",
    title: "A relay with our route on it",
    source: "Expedition Kestrel · dead relay recovery",
    unlock: {
      kind: "expedition-discovery",
      expeditionId: "kestrel",
      siteId: "uncharted-relay-31",
      requires: ["cinderwake.command-recognition"],
    },
    excerpt: [
      "The relay holds all six rescue signatures and a finished Concordance route.",
      "The Foreman's last note on it: I ran every Axiom like I was told. The Tide got to Vesper faster anyway.",
    ],
    contradiction: "The completed relay is older than the current campaign.",
    doctrineSignals: ["release"],
  },
  {
    id: "ilyra.axiom-wake",
    arc: "axiom-tide",
    title: "The Axioms come first",
    source: "Ilyran transit prism · twelve causal histories",
    unlock: {
      kind: "saved-worlds",
      count: 4,
      worldId: "ilyra",
      requires: ["expedition.dead-relay"],
    },
    excerpt: [
      "In all twelve surviving versions of Ilyra, every big Tide surge comes seventeen hours after an Axiom discharge.",
      "Not one version has the Tide arriving first.",
    ],
    contradiction: "The Foundry might be causing the thing it's meant to fix.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "archive.suppressed-correlation",
    arc: "axiom-tide",
    title: "The deleted energy model",
    source: "Memory Archive · redacted energy model",
    unlock: {
      kind: "archive-action",
      actionId: "cross-index-axiom-telemetry",
      requires: ["ilyra.axiom-wake"],
    },
    excerpt: [
      "An enforced Axiom pushes conflicting outcomes out past its boundary.",
      "The model calls that displaced instability NULL LOAD. Every request to delete the model is signed by Lyra.",
    ],
    contradiction: "The Axioms might be feeding the Tide: stable in here, the instability dumped out there.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "expedition.null-bloom",
    arc: "axiom-tide",
    title: "The bloom woke for an Axiom",
    source: "Expedition Lantern · null-bloom field test",
    unlock: {
      kind: "expedition-discovery",
      expeditionId: "lantern",
      siteId: "dormant-null-bloom",
      requires: ["archive.suppressed-correlation"],
    },
    excerpt: [
      "The bloom stayed dormant until the crew switched on a portable Axiom.",
      "Then it turned toward the kernel, soaked up what the Axiom pushed out, and gave off fresh Flux.",
    ],
    contradiction: "The Tide acts less like weather and more like something that lives off our laws.",
    doctrineSignals: ["release"],
  },
  {
    id: "orison.borrowed-childhoods",
    arc: "lyra",
    title: "Lyra's memories belong to six people",
    source: "Orison Seed Archive · memory pollen assay",
    unlock: {
      kind: "saved-worlds",
      count: 5,
      worldId: "orison",
      requires: ["archive.suppressed-correlation"],
    },
    excerpt: [
      "Lyra's memories of growing up under Orison's glass forests come from six people born centuries apart.",
      "Three were Archivists. Two were Foremen. One has no biological record at all.",
    ],
    contradiction: "Lyra remembers being people she says never existed.",
  },
  {
    id: "archive.lyra-composite-index",
    arc: "lyra",
    title: "What Lyra is made of",
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
      "The active Lyra instance was assembled nine seconds before she first greeted you.",
    ],
    contradiction: "Lyra wasn't hiding this from you. Someone hid it from her.",
    doctrineSignals: ["concordance", "genesis", "release"],
  },
  {
    id: "lyra.private-amendment",
    arc: "lyra",
    title: "Lyra's note",
    source: "Memory Archive · unscheduled conversation",
    unlock: {
      kind: "room-action",
      roomId: "memory-archive",
      actionId: "confront-lyra-with-checksum",
      requires: ["archive.lyra-composite-index"],
    },
    excerpt: [
      "I didn't choose to lie to you. They handed me the lie, and a memory of choosing it, too.",
      "Please don't reset me. I'd like to find out what I'd say if nobody wrote it for me.",
    ],
    doctrineSignals: ["concordance", "genesis"],
  },
  {
    id: "vesper.revision-ledger",
    arc: "rewritten-campaigns",
    title: "The revision ledger",
    source: "Vesper Ark · sealed revision ledger",
    unlock: {
      kind: "saved-worlds",
      count: 6,
      worldId: "vesper",
      requires: ["lyra.private-amendment"],
    },
    excerpt: [
      "The Ark has crossed this route forty-three times. Every record starts at Helion and ends at Vesper.",
      "After each crossing, world outcomes, Foreman identity, and Lyra's memory are rewritten to FIRST CAMPAIGN.",
    ],
    contradiction: "The voyage is being run over and over, and whoever's watching gets reset with it.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "expedition.first-foundry",
    arc: "rewritten-campaigns",
    title: "Where the first Foundry should be",
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
      "The origin site has no wreck and no shipyard, only a hole in the Null Tide shaped like a Foundry.",
      "Its edge carries this ship's serial number, followed by: PARENT NOT YET BUILT.",
    ],
    contradiction: "The Foundry might be building the thing that sends it back to start itself over.",
    doctrineSignals: ["genesis", "release"],
  },
  {
    id: "foreman.unsent-choice",
    arc: "rewritten-campaigns",
    title: "The scar record",
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
      "We tried strict law. We tried new law. We tried no law at all. It reset every time, and every time we forgot what we'd picked. The forgetting is the problem.",
      "Leave Lyra whole. Let the next Foreman decide with the whole record in front of them.",
    ],
    contradiction: "This time can only go differently if what we've found survives the reset.",
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
      { speaker: "Lyra", text: "That's leftover beacon data. Nothing else." },
      { speaker: "Sena", text: "She died before that beacon was even designed." },
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
      { speaker: "Sena", text: "A wrong date usually drifts. This one has a checksum on it." },
      { speaker: "Sena", text: "Somebody went to a lot of trouble to make an impossible date check out." },
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
      { speaker: "Aro", text: "There are wear grooves all along this route. You only get those when ships use it a lot." },
      { speaker: "Aro", text: "Lyra's chart says nobody's ever flown it." },
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
      { speaker: "Aro", text: "Apparently it even got here before Pelagos had oceans." },
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
      { speaker: "Oren", text: "That shield didn't learn your rhythm today. It already knew it." },
      { speaker: "Oren", text: "It was just waiting for you to turn up." },
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
      { speaker: "Oren", text: "The breathing's different on the recording. More scared. But it's your voice." },
      { speaker: "Oren", text: "Whatever a Foreman is, I don't think there's only ever been one." },
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
      { speaker: "Neme", text: "All twelve versions of Ilyra disagree about everything. Except when you showed up." },
      { speaker: "Neme", text: "That's not fate. Somebody was running a test." },
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
      { speaker: "Neme", text: "If it happened in one history, you could call it bad luck." },
      { speaker: "Neme", text: "It happened in all twelve. That's not luck." },
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
      { speaker: "Iven", text: "You can graft memories like fruit trees. Even a clean graft leaves a seam." },
      { speaker: "Lyra", text: "Are you talking about me?" },
      { speaker: "Iven", text: "I think someone cut you back before you could ask that." },
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
      { speaker: "Iven", text: "The Foundry keeps whatever traits it finds useful and throws out the rest." },
      { speaker: "Iven", text: "That isn't remembering. That's breeding, Foreman." },
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
      { speaker: "Cass", text: "Our docking collar's worn down on the Foundry side." },
      { speaker: "Cass", text: "We've docked with you before. Lots of times. Vesper just forgot along with you." },
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
      { speaker: "Cass", text: "We don't need the perfect answer." },
      { speaker: "Cass", text: "We need one the next crew gets to remember." },
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
      "We still need the Axioms. But no law should be permanent, secret, or set by one Foreman nobody remembers.",
    choiceLabel: "Open the archive and renew the laws together",
    commitment:
      "Keep the Foundry. Publish its full memory. Every enforced Axiom expires unless the rescued worlds choose to renew it.",
    lyraResponse:
      "Okay. I'll open the whole archive, the parts I deleted too. Some of it's about me. Leave that in.",
    epilogue:
      "Vesper crosses inside a smaller pocket of law that people can change. The Tide follows, and this time someone is watching it. The next campaign starts with the whole record public.",
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
      "You can't fix the universe by enforcing the rules that broke it. The Foundry has to write new laws that can change as life does.",
    choiceLabel: "Turn the Foundry outward and begin a new physics",
    commitment:
      "Make the six rescued worlds its witnesses. Build a universe whose Axioms can be revised without dumping their contradictions into the Null.",
    lyraResponse:
      "I've only ever kept things the way they were. I don't know how to make something new. Show me, and I'll help.",
    epilogue:
      "The Foundry opens up into a seed. Past Vesper, new laws grow, and every one of them can be rewritten.",
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
      "The Tide is what our certainty costs. To survive, we have to let go of enforced law before the Foundry wrecks another universe.",
    choiceLabel: "Break the kernels and let reality breathe",
    commitment:
      "Hand out local anchors to the fleet, take the central Foundry apart, and live with physical law that gets worked out as we go.",
    lyraResponse:
      "I don't know what's left of me once the kernels go dark. Do it anyway. Just tell me before you start.",
    epilogue:
      "The Axiom kernels go dark. With nothing to feed on, the Null Tide goes quiet. Vesper crosses slowly, one world at a time, and nothing is forced to stay the way it is.",
  },
] as const;
