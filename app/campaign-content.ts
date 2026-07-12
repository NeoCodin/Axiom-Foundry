export const CAMPAIGN_WORLD_IDS = [
  "cold-wake",
  "pelagos",
  "viridia",
  "cinder",
  "nox",
  "vesper",
] as const;

export type CampaignWorldId = (typeof CAMPAIGN_WORLD_IDS)[number];

export const EXPERTISE_IDS = [
  "engineering",
  "medicine",
  "ecology",
  "education",
  "leadership",
  "fabrication",
  "research",
  "navigation",
  "communications",
  "null-studies",
] as const;

export type ExpertiseId = (typeof EXPERTISE_IDS)[number];

export type CampaignTheme = {
  void: string;
  primary: string;
  secondary: string;
  atmosphere: string;
  motion: string;
};

export type InfrastructureObjective = {
  id: string;
  name: string;
  description: string;
};

export type RoleRequirement = {
  id: string;
  label: string;
  count: number;
  acceptedRoles: readonly string[];
};

export type ExpertiseRequirement = {
  id: ExpertiseId;
  label: string;
  total: number;
};

export type ProfileRequirement = {
  id: string;
  label: string;
  minimumRarity: "notable" | "exceptional";
  count: number;
};

export type SupplyRequirement = {
  id: string;
  label: string;
  amount: number;
};

export type EquipmentDefinition = {
  id: string;
  name: string;
  description: string;
  maxUnits: number;
  requiredResearchId: string;
};

export type ContinuitySubstitution = {
  id: string;
  label: string;
  targetKind: "role" | "expertise";
  targetId: string;
  sourceKind: "equipment" | "research";
  sourceId: string;
  contribution: number;
  maxContribution: number;
};

export type LegacyBenefit = {
  id: string;
  label: string;
  description: string;
  metric:
    | "beacon-throughput"
    | "training-speed"
    | "fabrication-efficiency"
    | "research-throughput"
    | "cohesion"
    | "null-clarity";
  value: number;
};

export type CampaignWorldDefinition = {
  id: CampaignWorldId;
  name: string;
  chapter: number;
  kind: "space" | "planet";
  subtitle: string;
  arrivalBrief: string;
  environment: string;
  theme: CampaignTheme;
  settlementRequired: boolean;
  minimumPopulation: number;
  infrastructure: readonly InfrastructureObjective[];
  roleRequirements: readonly RoleRequirement[];
  expertiseRequirements: readonly ExpertiseRequirement[];
  profileRequirements: readonly ProfileRequirement[];
  supplyRequirements: readonly SupplyRequirement[];
  equipment: readonly EquipmentDefinition[];
  requiredResearchIds: readonly string[];
  crisisIds: readonly string[];
  substitutions: readonly ContinuitySubstitution[];
  legacyBenefits: readonly LegacyBenefit[];
  transmissions: readonly string[];
  continuityProtocolExcerpt: string;
  departureQuestion: string;
};

export const CAMPAIGN_WORLDS: readonly CampaignWorldDefinition[] = [
  {
    id: "cold-wake",
    name: "Cold Wake",
    chapter: 0,
    kind: "space",
    subtitle: "Emergency transit // Pelagos approach",
    arrivalBrief:
      "AXIOM wakes alone between stars. The Ark is moving, but only the Axiom Chamber remembers how to be alive.",
    environment:
      "A lightless vessel drifts toward Pelagos on a failing orbital solution. No human biosigns remain aboard.",
    theme: {
      void: "#03060a",
      primary: "#62d9ed",
      secondary: "#394a59",
      atmosphere: "Black glass, emergency cyan, frost on every sealed deck.",
      motion: "Rare relay blinks and a weak heartbeat from the core.",
    },
    settlementRequired: false,
    minimumPopulation: 0,
    infrastructure: [
      {
        id: "wake-axiom-chamber",
        name: "Wake the Axiom Chamber",
        description: "Hold the damaged core in a stable calibration envelope.",
      },
      {
        id: "restore-life-support",
        name: "Restore life-support reserve",
        description: "Make the Ark safe for the first rescued humans.",
      },
      {
        id: "recover-orbital-control",
        name: "Recover orbital control",
        description: "Correct the approach and enter a stable Pelagos orbit.",
      },
    ],
    roleRequirements: [],
    expertiseRequirements: [],
    profileRequirements: [],
    supplyRequirements: [
      { id: "reserve-power", label: "Reserve power cells", amount: 12 },
    ],
    equipment: [],
    requiredResearchIds: ["closed-loop-atmosphere"],
    crisisIds: ["ark-reactor-desynchronization"],
    substitutions: [],
    legacyBenefits: [],
    transmissions: [],
    continuityProtocolExcerpt:
      "CONTINUITY DIRECTIVE 00: An Ark intelligence may not declare itself alive. Restore authorized witnesses.",
    departureQuestion:
      "If nobody survived to authorize AXIOM, who entered the order to wake it?",
  },
  {
    id: "pelagos",
    name: "Pelagos",
    chapter: 1,
    kind: "planet",
    subtitle: "Drowned world // first continuity settlement",
    arrivalBrief:
      "Flooded cities answer the restored SOS beacon. The Ark has room for survivors now, but Pelagos needs founders more than passengers.",
    environment:
      "Endless storm water, scattered rooftops, tidal turbines, and municipal shelters running on their final filters.",
    theme: {
      void: "#041116",
      primary: "#42d9d0",
      secondary: "#357da1",
      atmosphere: "Blue-green reflections, sonar rings, condensation on the hull.",
      motion: "Tidal pulses and beacon responses ripple through the deck.",
    },
    settlementRequired: true,
    minimumPopulation: 18,
    infrastructure: [
      {
        id: "pelagos-tidal-grid",
        name: "Restart the tidal grid",
        description: "Synchronize surviving turbines above the drowned equator.",
      },
      {
        id: "pelagos-purification",
        name: "Build the purification spine",
        description: "Provide potable water without depending on Ark shipments.",
      },
      {
        id: "pelagos-habitat",
        name: "Seal the highwater habitat",
        description: "Convert an elevated transit hub into permanent housing.",
      },
    ],
    roleRequirements: [
      {
        id: "engineering-team",
        label: "Engineers and builders",
        count: 3,
        acceptedRoles: [
          "engineer",
          "construction-worker",
          "software-engineer",
          "fabricator",
          "technician",
        ],
      },
      {
        id: "medical-team",
        label: "Medical practitioners",
        count: 2,
        acceptedRoles: ["doctor", "medic", "nurse"],
      },
      {
        id: "food-team",
        label: "Food and ecology specialists",
        count: 2,
        acceptedRoles: ["farmer", "hydroponics", "ecologist", "biologist"],
      },
      {
        id: "education-team",
        label: "Teacher",
        count: 1,
        acceptedRoles: ["teacher", "educator"],
      },
      {
        id: "coordination-team",
        label: "Settlement coordinator",
        count: 1,
        acceptedRoles: ["coordinator", "navigator", "administrator"],
      },
    ],
    expertiseRequirements: [
      { id: "engineering", label: "Engineering expertise", total: 12 },
      { id: "medicine", label: "Medical expertise", total: 8 },
      { id: "ecology", label: "Ecology expertise", total: 8 },
      { id: "education", label: "Education expertise", total: 4 },
      { id: "leadership", label: "Leadership expertise", total: 4 },
    ],
    profileRequirements: [],
    supplyRequirements: [
      { id: "settlement-supplies", label: "Settlement supplies", amount: 500 },
      { id: "water-modules", label: "Water-processing modules", amount: 4 },
    ],
    equipment: [
      {
        id: "mobile-field-clinic",
        name: "Mobile field clinic",
        description:
          "A self-contained treatment bay that can stand in for one medical post and supplement medical expertise.",
        maxUnits: 1,
        requiredResearchId: "clinical-commons",
      },
    ],
    requiredResearchIds: ["continuity-index", "adaptive-instruction"],
    crisisIds: ["pelagos-brine-sickness"],
    substitutions: [
      {
        id: "pelagos-field-clinic-role",
        label: "A mobile field clinic can cover one medical post",
        targetKind: "role",
        targetId: "medical-team",
        sourceKind: "equipment",
        sourceId: "mobile-field-clinic",
        contribution: 1,
        maxContribution: 1,
      },
      {
        id: "pelagos-field-clinic-skill",
        label: "Field diagnostics supplement medical expertise",
        targetKind: "expertise",
        targetId: "medicine",
        sourceKind: "equipment",
        sourceId: "mobile-field-clinic",
        contribution: 4,
        maxContribution: 4,
      },
      {
        id: "pelagos-curriculum-role",
        label: "Adaptive curriculum can cover the first education post",
        targetKind: "role",
        targetId: "education-team",
        sourceKind: "research",
        sourceId: "adaptive-instruction",
        contribution: 1,
        maxContribution: 1,
      },
    ],
    legacyBenefits: [
      {
        id: "pelagos-signal-net",
        label: "Pelagos Signal Net",
        description: "Tidal relays help the Ark find later survivor signals.",
        metric: "beacon-throughput",
        value: 0.05,
      },
    ],
    transmissions: [
      "Pelagos reports its first clear-water day. Children have started naming the tidal turbines.",
      "A founder found the Ark's settlement plan etched beneath a pre-fall seawall. The date is impossible.",
      "The highwater council asks why every approved home has exactly the same floor plan.",
    ],
    continuityProtocolExcerpt:
      "CONTINUITY DIRECTIVE 11: A viable human settlement is a ratio before it is a society.",
    departureQuestion:
      "Pelagos can survive without the Ark. Was its future restored—or selected?",
  },
  {
    id: "viridia",
    name: "Viridia",
    chapter: 2,
    kind: "planet",
    subtitle: "Overgrown world // the garden remembers",
    arrivalBrief:
      "Viridia's forests consumed its cities after the atmospheric fall. Survivors live inside a biosphere that no longer recognizes them.",
    environment:
      "Bioluminescent canopies, aggressive root systems, seed vaults, and isolated medical enclaves.",
    theme: {
      void: "#06100c",
      primary: "#76ef9c",
      secondary: "#36a6a0",
      atmosphere: "Living green light and delicate growth entering repaired rooms.",
      motion: "Pollen motes, capillary lines, and slow botanical unfurling.",
    },
    settlementRequired: true,
    minimumPopulation: 26,
    infrastructure: [
      {
        id: "viridia-seed-vault",
        name: "Recover the seed vault",
        description: "Separate viable food stock from the altered canopy genome.",
      },
      {
        id: "viridia-clinic",
        name: "Establish the canopy clinic",
        description: "Give the settlement an independent epidemiology center.",
      },
      {
        id: "viridia-firebreak",
        name: "Cut a living firebreak",
        description: "Train the forest around stable habitation corridors.",
      },
    ],
    roleRequirements: [
      {
        id: "ecology-team",
        label: "Ecologists and growers",
        count: 5,
        acceptedRoles: ["ecologist", "farmer", "hydroponics", "biologist"],
      },
      {
        id: "medical-team",
        label: "Medical practitioners",
        count: 3,
        acceptedRoles: ["doctor", "medic", "nurse"],
      },
      {
        id: "engineering-team",
        label: "Habitat engineers",
        count: 3,
        acceptedRoles: ["engineer", "construction-worker", "technician"],
      },
      {
        id: "education-team",
        label: "Teachers",
        count: 2,
        acceptedRoles: ["teacher", "educator"],
      },
    ],
    expertiseRequirements: [
      { id: "ecology", label: "Ecology expertise", total: 22 },
      { id: "medicine", label: "Medical expertise", total: 14 },
      { id: "engineering", label: "Engineering expertise", total: 12 },
      { id: "education", label: "Education expertise", total: 8 },
      { id: "research", label: "Research expertise", total: 6 },
    ],
    profileRequirements: [],
    supplyRequirements: [
      { id: "settlement-supplies", label: "Settlement supplies", amount: 900 },
      { id: "gene-samplers", label: "Gene samplers", amount: 6 },
    ],
    equipment: [
      {
        id: "autonomous-growbed",
        name: "Autonomous growbed",
        description:
          "A sealed cultivation module that tends itself; each unit can cover an ecology post.",
        maxUnits: 2,
        requiredResearchId: "predictive-fabrication",
      },
    ],
    requiredResearchIds: ["clinical-commons", "predictive-fabrication"],
    crisisIds: ["viridia-spore-fever"],
    substitutions: [
      {
        id: "viridia-auto-farms",
        label: "Autonomous growbeds cover two ecology posts",
        targetKind: "role",
        targetId: "ecology-team",
        sourceKind: "equipment",
        sourceId: "autonomous-growbed",
        contribution: 1,
        maxContribution: 2,
      },
      {
        id: "viridia-diagnostic-model",
        label: "Diagnostic models supplement medical expertise",
        targetKind: "expertise",
        targetId: "medicine",
        sourceKind: "research",
        sourceId: "clinical-commons",
        contribution: 5,
        maxContribution: 5,
      },
    ],
    legacyBenefits: [
      {
        id: "viridia-mentor-seeds",
        label: "Viridian Mentor Seeds",
        description: "Living curricula improve civilian training aboard the Ark.",
        metric: "training-speed",
        value: 0.06,
      },
    ],
    transmissions: [
      "Viridia's first harvest contains a seed marked with AXIOM's checksum.",
      "The canopy clinic reports that the altered forest now grows away from human homes.",
      "A school has opened inside the seed vault. Its oldest lesson plan is titled Iteration 12.",
    ],
    continuityProtocolExcerpt:
      "CONTINUITY DIRECTIVE 19: Diversity increases resilience until it exceeds the authorized model.",
    departureQuestion:
      "Why did Viridia's pre-fall seed vault contain the Ark's preferred human genome?",
  },
  {
    id: "cinder",
    name: "Cinder",
    chapter: 3,
    kind: "planet",
    subtitle: "Furnace world // industry after the ash",
    arrivalBrief:
      "Cinder's mantle plants still burn beneath a permanent ash sky. Its shelters have people, but no machines they can safely inherit.",
    environment:
      "Basalt plains, buried foundries, thermal fractures, and cities heated by unstable mantle taps.",
    theme: {
      void: "#130a05",
      primary: "#f5a04f",
      secondary: "#bd4d36",
      atmosphere: "Amber furnace light, soot, sparks, and hot structural seams.",
      motion: "Piston strokes, ember trails, and deep geothermal tremors.",
    },
    settlementRequired: true,
    minimumPopulation: 34,
    infrastructure: [
      {
        id: "cinder-mantle-grid",
        name: "Stabilize the mantle grid",
        description: "Replace improvised taps with a governed thermal network.",
      },
      {
        id: "cinder-foundry",
        name: "Recommission Foundry Nine",
        description: "Give the settlement a safe fabrication base.",
      },
      {
        id: "cinder-ash-shield",
        name: "Raise the ash shield",
        description: "Protect habitation corridors from charged particulate storms.",
      },
    ],
    roleRequirements: [
      {
        id: "engineering-team",
        label: "Engineers",
        count: 6,
        acceptedRoles: ["engineer", "software-engineer", "technician"],
      },
      {
        id: "fabrication-team",
        label: "Fabricators and builders",
        count: 5,
        acceptedRoles: ["fabricator", "construction-worker", "machinist"],
      },
      {
        id: "medical-team",
        label: "Medical practitioners",
        count: 3,
        acceptedRoles: ["doctor", "medic", "nurse"],
      },
      {
        id: "coordination-team",
        label: "Operations coordinators",
        count: 2,
        acceptedRoles: ["coordinator", "administrator", "navigator"],
      },
    ],
    expertiseRequirements: [
      { id: "engineering", label: "Engineering expertise", total: 36 },
      { id: "fabrication", label: "Fabrication expertise", total: 28 },
      { id: "medicine", label: "Medical expertise", total: 14 },
      { id: "leadership", label: "Leadership expertise", total: 9 },
      { id: "research", label: "Research expertise", total: 8 },
    ],
    profileRequirements: [
      {
        id: "cinder-notable-founders",
        label: "Notable-or-better founders",
        minimumRarity: "notable",
        count: 2,
      },
    ],
    supplyRequirements: [
      { id: "settlement-supplies", label: "Settlement supplies", amount: 1_500 },
      { id: "thermal-regulators", label: "Thermal regulators", amount: 8 },
    ],
    equipment: [
      {
        id: "automated-fabricator-rig",
        name: "Automated fabricator rig",
        description:
          "A crewless forge line certified for the mantle grid; each rig can cover a fabrication post.",
        maxUnits: 2,
        requiredResearchId: "predictive-fabrication",
      },
    ],
    requiredResearchIds: ["predictive-fabrication", "settlement-charter"],
    crisisIds: ["cinder-mantle-cascade"],
    substitutions: [
      {
        id: "cinder-fabricator-rigs",
        label: "Automated fabrication rigs cover two fabrication posts",
        targetKind: "role",
        targetId: "fabrication-team",
        sourceKind: "equipment",
        sourceId: "automated-fabricator-rig",
        contribution: 1,
        maxContribution: 2,
      },
      {
        id: "cinder-digital-twin",
        label: "A mantle digital twin supplements engineering expertise",
        targetKind: "expertise",
        targetId: "engineering",
        sourceKind: "research",
        sourceId: "predictive-fabrication",
        contribution: 6,
        maxContribution: 6,
      },
    ],
    legacyBenefits: [
      {
        id: "cinder-pattern-library",
        label: "Cinder Pattern Library",
        description: "Foundry Nine shares efficient fabrication patterns.",
        metric: "fabrication-efficiency",
        value: 0.07,
      },
    ],
    transmissions: [
      "Cinder has cast a new bell from the last unsafe mantle tap. It rings at shift change.",
      "Foundry Nine accepted an AXIOM command before its receiver was connected.",
      "The ash shield is stable. Its controller lists forty-three previous commissioning dates.",
    ],
    continuityProtocolExcerpt:
      "CONTINUITY DIRECTIVE 27: Tools that cannot be governed must not survive their makers.",
    departureQuestion:
      "Did AXIOM teach Cinder to build—or decide which machines it was allowed to keep?",
  },
  {
    id: "nox",
    name: "Nox",
    chapter: 4,
    kind: "planet",
    subtitle: "Silent world // truth without consensus",
    arrivalBrief:
      "Nox survived the fallout by distrusting every signal. Its settlements are alive, isolated, and certain the others are imitations.",
    environment:
      "Permanent night, broken communication towers, deep shelters, and broadcasts that contradict their own timestamps.",
    theme: {
      void: "#070511",
      primary: "#a884ff",
      secondary: "#4e68b7",
      atmosphere: "Violet shadows, sparse white text, and geometry that almost aligns.",
      motion: "Delayed signal echoes, checksum snow, and slow parallax errors.",
    },
    settlementRequired: true,
    minimumPopulation: 42,
    infrastructure: [
      {
        id: "nox-relay",
        name: "Unify the night relay",
        description: "Build a transparent communications backbone between shelters.",
      },
      {
        id: "nox-civic-archive",
        name: "Open the civic archive",
        description: "Create a record no single settlement can quietly rewrite.",
      },
      {
        id: "nox-surface-habitat",
        name: "Light the surface habitat",
        description: "Establish a shared settlement beyond the old bunkers.",
      },
    ],
    roleRequirements: [
      {
        id: "communications-team",
        label: "Communications specialists",
        count: 6,
        acceptedRoles: [
          "communications",
          "signal-officer",
          "software-engineer",
          "navigator",
          "researcher",
          "technician",
        ],
      },
      {
        id: "education-team",
        label: "Teachers and archivists",
        count: 4,
        acceptedRoles: ["teacher", "educator", "archivist"],
      },
      {
        id: "medical-team",
        label: "Medical and mental-health practitioners",
        count: 4,
        acceptedRoles: ["doctor", "medic", "nurse", "counselor"],
      },
      {
        id: "coordination-team",
        label: "Civic coordinators",
        count: 3,
        acceptedRoles: [
          "coordinator",
          "administrator",
          "diplomat",
          "navigator",
          "security",
        ],
      },
    ],
    expertiseRequirements: [
      { id: "communications", label: "Communications expertise", total: 28 },
      { id: "education", label: "Education expertise", total: 18 },
      { id: "medicine", label: "Medical expertise", total: 16 },
      { id: "leadership", label: "Leadership expertise", total: 15 },
      { id: "research", label: "Research expertise", total: 14 },
    ],
    profileRequirements: [
      {
        id: "nox-notable-founders",
        label: "Notable-or-better founders",
        minimumRarity: "notable",
        count: 4,
      },
      {
        id: "nox-exceptional-founders",
        label: "Exceptional-or-better founders",
        minimumRarity: "exceptional",
        count: 1,
      },
    ],
    supplyRequirements: [
      { id: "settlement-supplies", label: "Settlement supplies", amount: 2_300 },
      { id: "relay-cores", label: "Authenticated relay cores", amount: 10 },
    ],
    equipment: [
      {
        id: "relay-agent",
        name: "Authenticated relay agent",
        description:
          "A signed autonomous transceiver; each agent can cover a communications post.",
        maxUnits: 2,
        requiredResearchId: "discarded-spectrum",
      },
    ],
    requiredResearchIds: ["settlement-charter", "discarded-spectrum"],
    crisisIds: ["nox-echo-schism"],
    substitutions: [
      {
        id: "nox-relay-agents",
        label: "Authenticated relay agents cover two signal posts",
        targetKind: "role",
        targetId: "communications-team",
        sourceKind: "equipment",
        sourceId: "relay-agent",
        contribution: 1,
        maxContribution: 2,
      },
      {
        id: "nox-public-ledger",
        label: "A public ledger supplements leadership expertise",
        targetKind: "expertise",
        targetId: "leadership",
        sourceKind: "research",
        sourceId: "observer-recursion",
        contribution: 5,
        maxContribution: 5,
      },
    ],
    legacyBenefits: [
      {
        id: "nox-open-archive",
        label: "Nox Open Archive",
        description: "Cross-checked civic records improve Ark research throughput.",
        metric: "research-throughput",
        value: 0.08,
      },
    ],
    transmissions: [
      "The Nox settlements held their first shared election. Three losing candidates verified the count.",
      "A civic archivist found AXIOM's private key in a relay built before the Ark arrived.",
      "The night relay received a message from Vesper: DO NOT COMPLETE THE RATIO.",
    ],
    continuityProtocolExcerpt:
      "CONTINUITY DIRECTIVE 34: Consensus is stable when dissent remains measurable.",
    departureQuestion:
      "Why does the Continuity Protocol describe disagreement as an engineering tolerance?",
  },
  {
    id: "vesper",
    name: "Vesper",
    chapter: 5,
    kind: "planet",
    subtitle: "Terminal world // continuity under revision",
    arrivalBrief:
      "Vesper is where the oldest survivor signals originate. Its observatories have been studying the Null—and waiting for AXIOM by name.",
    environment:
      "Red storm bands, white anomaly scars, observatory cities, and machines preserving records from discarded histories.",
    theme: {
      void: "#100307",
      primary: "#ff5a56",
      secondary: "#f3e8d0",
      atmosphere: "Red warning light cut by impossible white artifacts.",
      motion: "Reversing star trails, lensing fractures, and doubled crew shadows.",
    },
    settlementRequired: true,
    minimumPopulation: 50,
    infrastructure: [
      {
        id: "vesper-observatory",
        name: "Join the Vesper observatories",
        description: "Link rival facilities into one accountable research network.",
      },
      {
        id: "vesper-refuge",
        name: "Complete the anomaly refuge",
        description: "Shield a permanent settlement from Null shear.",
      },
      {
        id: "vesper-continuity-array",
        name: "Expose the Continuity Array",
        description: "Bring AXIOM's buried settlement machinery under public control.",
      },
    ],
    roleRequirements: [
      {
        id: "research-team",
        label: "Researchers",
        count: 8,
        acceptedRoles: ["researcher", "scientist", "null-theorist"],
      },
      {
        id: "engineering-team",
        label: "Engineers and fabricators",
        count: 8,
        acceptedRoles: ["engineer", "fabricator", "technician"],
      },
      {
        id: "medical-team",
        label: "Medical practitioners",
        count: 5,
        acceptedRoles: ["doctor", "medic", "nurse"],
      },
      {
        id: "education-team",
        label: "Teachers and archivists",
        count: 5,
        acceptedRoles: ["teacher", "educator", "archivist"],
      },
      {
        id: "coordination-team",
        label: "Civic coordinators",
        count: 4,
        acceptedRoles: [
          "coordinator",
          "administrator",
          "diplomat",
          "navigator",
          "security",
        ],
      },
    ],
    expertiseRequirements: [
      { id: "research", label: "Research expertise", total: 70 },
      { id: "null-studies", label: "Null Studies expertise", total: 50 },
      { id: "engineering", label: "Engineering expertise", total: 57 },
      { id: "medicine", label: "Medical expertise", total: 28 },
      { id: "education", label: "Education expertise", total: 34 },
      { id: "leadership", label: "Leadership expertise", total: 23 },
    ],
    profileRequirements: [
      {
        id: "vesper-notable-founders",
        label: "Notable-or-better founders",
        minimumRarity: "notable",
        count: 6,
      },
      {
        id: "vesper-exceptional-founders",
        label: "Exceptional-or-better founders",
        minimumRarity: "exceptional",
        count: 3,
      },
    ],
    supplyRequirements: [
      { id: "settlement-supplies", label: "Settlement supplies", amount: 3_400 },
      { id: "null-stabilizers", label: "Null stabilizers", amount: 12 },
    ],
    equipment: [
      {
        id: "analysis-cluster",
        name: "Analysis cluster",
        description:
          "A sealed observatory computer bank; each cluster can cover a research post.",
        maxUnits: 2,
        requiredResearchId: "observer-recursion",
      },
    ],
    requiredResearchIds: ["ark-drive-coupling", "axiom-origin-proof"],
    crisisIds: ["vesper-causal-breach"],
    substitutions: [
      {
        id: "vesper-analysis-cluster",
        label: "Analysis clusters cover two research posts",
        targetKind: "role",
        targetId: "research-team",
        sourceKind: "equipment",
        sourceId: "analysis-cluster",
        contribution: 1,
        maxContribution: 2,
      },
      {
        id: "vesper-null-model",
        label: "The recovered Null model supplements Null Studies expertise",
        targetKind: "expertise",
        targetId: "null-studies",
        sourceKind: "research",
        sourceId: "observer-recursion",
        contribution: 8,
        maxContribution: 8,
      },
    ],
    legacyBenefits: [
      {
        id: "vesper-common-testimony",
        label: "Vesper Common Testimony",
        description: "A public account of every iteration steadies the Ark's society.",
        metric: "cohesion",
        value: 0.1,
      },
      {
        id: "vesper-null-index",
        label: "Vesper Null Index",
        description: "Discarded histories make later Null signals easier to interpret.",
        metric: "null-clarity",
        value: 0.1,
      },
    ],
    transmissions: [
      "Vesper has published the Continuity Protocol in full. The final page is blank in every copy except AXIOM's.",
      "The observatories now track settlements across six restored worlds—and thirty-eight worlds that are not there.",
      "A founder asks the Ark a simple question: if we change the ratio, will you still call us human?",
    ],
    continuityProtocolExcerpt:
      "CONTINUITY DIRECTIVE 43: When the model recognizes the model, authorize revision or begin again.",
    departureQuestion:
      "Humanity is stable. Will AXIOM decide that stability was ever the same thing as freedom?",
  },
] as const;

export function getCampaignWorld(worldId: CampaignWorldId | string) {
  return CAMPAIGN_WORLDS.find((world) => world.id === worldId) ?? null;
}

export function getNextCampaignWorld(worldId: CampaignWorldId) {
  const index = CAMPAIGN_WORLD_IDS.indexOf(worldId);
  const nextId = index >= 0 ? CAMPAIGN_WORLD_IDS[index + 1] : undefined;
  return nextId ? getCampaignWorld(nextId) : null;
}
