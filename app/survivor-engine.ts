export const PROFESSIONAL_ROLES = [
  "engineer",
  "doctor",
  "researcher",
  "navigator",
  "technician",
  "fabricator",
  "farmer",
  "teacher",
  "security",
] as const;

export type ProfessionalRole = (typeof PROFESSIONAL_ROLES)[number];
export type SurvivorRole = ProfessionalRole | "civilian";
export type SurvivorOrigin =
  | "pelagos"
  | "viridia"
  | "cinder"
  | "nox"
  | "vesper"
  | "ark"
  | "unknown";

export const SURVIVOR_ROLES = [
  ...PROFESSIONAL_ROLES,
  "civilian",
] as const satisfies readonly SurvivorRole[];

export type SkillMap = Record<ProfessionalRole, number>;

export type LifeSupportCapacity = {
  atmosphere: number;
  water: number;
  nutrition: number;
  medical: number;
};

export type BerthConstruction = {
  progressSeconds: number;
  durationSeconds: number;
};

export type LifeSupportKey = keyof LifeSupportCapacity;

export type Survivor = {
  id: string;
  name: string;
  callsign: string;
  origin: SurvivorOrigin;
  originSignalId: string;
  backgroundId: string;
  role: SurvivorRole;
  aptitudes: SkillMap;
  adaptability: number;
  traits: SurvivorTraitId[];
  skillXp: SkillMap;
  assignedRole: SurvivorRole | null;
  serviceSeconds: number;
  joinedAt: number;
  storyHookId: RareSurvivorHookId | null;
};

export const SURVIVOR_RARITY_DEFINITIONS = [
  {
    id: "standard",
    label: "Standard",
    description: "A dependable profile with broadly useful potential.",
    learningMultiplier: 1,
  },
  {
    id: "notable",
    label: "Notable",
    description: "A scarce mix of strong aptitudes or unusual adaptability.",
    learningMultiplier: 1.25,
  },
  {
    id: "exceptional",
    label: "Exceptional",
    description: "Exceptional natural potential across multiple disciplines.",
    learningMultiplier: 1.6,
  },
  {
    id: "anomalous",
    label: "Anomalous",
    description: "A singular survivor whose record is tied to the Ark's deeper mystery.",
    learningMultiplier: 2,
  },
] as const;

export type SurvivorRarityId =
  (typeof SURVIVOR_RARITY_DEFINITIONS)[number]["id"];

export type SurvivorRarity = {
  id: SurvivorRarityId;
  label: string;
  description: string;
  score: number;
  learningMultiplier: number;
};

export function getSurvivorRarityScore(survivor: Survivor) {
  const aptitudes = PROFESSIONAL_ROLES
    .map((role) => Math.max(1, Math.min(5, survivor.aptitudes[role] ?? 1)))
    .sort((left, right) => right - left);
  const [highest = 1, second = 1, third = 1] = aptitudes;
  return (
    highest * 3 +
    second * 2 +
    third +
    Math.max(0, survivor.traits.length - 1) * 2 +
    (survivor.adaptability >= 5 ? 2 : survivor.adaptability >= 4 ? 1 : 0)
  );
}

export function getSurvivorRarity(survivor: Survivor): SurvivorRarity {
  const score = getSurvivorRarityScore(survivor);
  const rarityId: SurvivorRarityId = survivor.storyHookId
    ? "anomalous"
    : score >= 28
      ? "exceptional"
      : score >= 25
        ? "notable"
        : "standard";
  const definition = SURVIVOR_RARITY_DEFINITIONS.find(
    (candidate) => candidate.id === rarityId,
  )!;
  return { ...definition, score };
}

export function getSurvivorLearningMultiplier(survivor: Survivor) {
  return getSurvivorRarity(survivor).learningMultiplier;
}

export type SurvivorSignal = {
  id: string;
  sequence: number;
  sourceLabel: string;
  detectedAt: number;
  survivors: Survivor[];
  rescueCost: number;
};

export type TrainingProgram = {
  survivorId: string;
  targetRole: ProfessionalRole;
  progressSeconds: number;
  durationSeconds: number;
};

export type SurvivorAdvanceModifiers = {
  trainingSpeedMultiplier?: number;
  beaconSpeedMultiplier?: number;
  onJobXpMultiplier?: number;
  constructionSpeedMultiplier?: number;
  reservedNames?: readonly string[];
};

export type SurvivorSystemState = {
  schema: number;
  rngState: number;
  nextSurvivorSerial: number;
  operationalSeconds: number;
  beaconOnline: boolean;
  beaconWorldId: Exclude<SurvivorOrigin, "ark" | "unknown"> | null;
  beaconProgressSeconds: number;
  activeSignal: SurvivorSignal | null;
  survivors: Survivor[];
  lifeSupport: LifeSupportCapacity;
  trainingSlots: number;
  training: TrainingProgram[];
  completedTrainings: number;
  signalsGenerated: number;
  signalsResolved: number;
  rarePity: number;
  qualityPity: number;
  rolePity: Record<ProfessionalRole, number>;
  rescuedHookIds: RareSurvivorHookId[];
  berthSections: number;
  berthConstruction: BerthConstruction | null;
};

export type BackgroundDefinition = {
  id: string;
  name: string;
  summary: string;
  preferredRoles: readonly SurvivorRole[];
  aptitudeBoosts: Partial<Record<ProfessionalRole, number>>;
};

export const TRAIT_DEFINITIONS = [
  {
    id: "adaptable",
    name: "Adaptable",
    description: "Learns unfamiliar Ark work unusually quickly.",
  },
  {
    id: "steady-hands",
    name: "Steady Hands",
    description: "Keeps delicate systems aligned under pressure.",
  },
  {
    id: "systems-thinker",
    name: "Systems Thinker",
    description: "Sees relationships between rooms, crews, and machines.",
  },
  {
    id: "patient-mentor",
    name: "Patient Mentor",
    description: "Makes a future Education Deck more effective.",
  },
  {
    id: "community-anchor",
    name: "Community Anchor",
    description: "Helps a frightened group become a settlement.",
  },
  {
    id: "tidal-memory",
    name: "Tidal Memory",
    description: "Remembers Pelagos before its seas began to rise.",
  },
  {
    id: "signal-ear",
    name: "Signal Ear",
    description: "Notices patterns hidden inside damaged transmissions.",
  },
  {
    id: "resourceful",
    name: "Resourceful",
    description: "Finds a useful second life for almost any component.",
  },
  {
    id: "calm-presence",
    name: "Calm Presence",
    description: "Makes cramped rooms feel safer and more deliberate.",
  },
  {
    id: "null-dreamer",
    name: "Null Dreamer",
    description: "Describes places the Ark has not admitted exist.",
  },
] as const;

export type SurvivorTraitId = (typeof TRAIT_DEFINITIONS)[number]["id"];

export const BACKGROUND_DEFINITIONS: readonly BackgroundDefinition[] = [
  {
    id: "tidal-grid",
    name: "Tidal-grid maintainer",
    summary: "Kept Pelagos's drowned power relays speaking to one another.",
    preferredRoles: ["engineer", "technician"],
    aptitudeBoosts: { engineer: 2, technician: 2 },
  },
  {
    id: "flood-ward",
    name: "Flood-ward medic",
    summary: "Ran a clinic while its lower decks disappeared beneath the sea.",
    preferredRoles: ["doctor"],
    aptitudeBoosts: { doctor: 3, researcher: 1 },
  },
  {
    id: "reef-archive",
    name: "Reef archivist",
    summary: "Recovered civic records from pressure-sealed memory stacks.",
    preferredRoles: ["researcher", "teacher"],
    aptitudeBoosts: { researcher: 2, teacher: 2 },
  },
  {
    id: "storm-pilot",
    name: "Storm-skiff pilot",
    summary: "Flew evacuation routes through debris and inverted rain.",
    preferredRoles: ["navigator", "security"],
    aptitudeBoosts: { navigator: 3, security: 1 },
  },
  {
    id: "pressure-forge",
    name: "Pressure-forge worker",
    summary: "Built habitat shells meant to survive below a rising ocean.",
    preferredRoles: ["fabricator", "technician"],
    aptitudeBoosts: { fabricator: 3, technician: 1 },
  },
  {
    id: "kelp-cooperative",
    name: "Kelp cooperative grower",
    summary: "Fed a neighborhood from gardens suspended beneath the waves.",
    preferredRoles: ["farmer", "civilian"],
    aptitudeBoosts: { farmer: 3, doctor: 1 },
  },
  {
    id: "shelter-teacher",
    name: "Shelter teacher",
    summary: "Kept lessons running long after the schools became lifeboats.",
    preferredRoles: ["teacher", "civilian"],
    aptitudeBoosts: { teacher: 3, researcher: 1 },
  },
  {
    id: "breakwater-watch",
    name: "Breakwater watch",
    summary: "Coordinated rescues and kept panic from becoming another hazard.",
    preferredRoles: ["security", "navigator"],
    aptitudeBoosts: { security: 3, navigator: 1 },
  },
  {
    id: "habitat-coder",
    name: "Habitat systems programmer",
    summary: "Patched municipal automation from a battery-backed terminal.",
    preferredRoles: ["engineer", "researcher", "technician"],
    aptitudeBoosts: { engineer: 2, researcher: 1, technician: 2 },
  },
  {
    id: "salvage-diver",
    name: "Salvage diver",
    summary: "Recovered tools from districts already claimed by the ocean.",
    preferredRoles: ["technician", "fabricator", "civilian"],
    aptitudeBoosts: { technician: 2, fabricator: 2 },
  },
  {
    id: "civic-volunteer",
    name: "Civic shelter volunteer",
    summary: "Learned whatever the shelter needed, usually before being asked.",
    preferredRoles: ["civilian", "teacher", "doctor"],
    aptitudeBoosts: { teacher: 1, doctor: 1, farmer: 1 },
  },
  {
    id: "ferry-crew",
    name: "Gravity-ferry crew",
    summary: "Moved families between the last stable islands.",
    preferredRoles: ["navigator", "engineer", "civilian"],
    aptitudeBoosts: { navigator: 2, engineer: 1, technician: 1 },
  },
] as const;

export type RareSurvivorHook = {
  id: string;
  name: string;
  title: string;
  teaser: string;
  role: ProfessionalRole;
  backgroundId: string;
  trait: SurvivorTraitId;
};

export const RARE_SURVIVOR_HOOKS = [
  {
    id: "pelagos-cartographer",
    name: "Sera Quill",
    title: "The Cartographer of Dry Pelagos",
    teaser: "Her maps show coastlines that predate every public archive.",
    role: "navigator",
    backgroundId: "storm-pilot",
    trait: "tidal-memory",
  },
  {
    id: "axiom-voiceprint",
    name: "Dr. Elian Voss",
    title: "The Familiar Voice",
    teaser: "The Ark flags his voiceprint as an obsolete AXIOM credential.",
    role: "researcher",
    backgroundId: "reef-archive",
    trait: "signal-ear",
  },
  {
    id: "impossible-forgemark",
    name: "Miri Kade",
    title: "The Impossible Forgemark",
    teaser: "Her hand-built tools carry the seal of a room still locked aboard.",
    role: "fabricator",
    backgroundId: "pressure-forge",
    trait: "resourceful",
  },
  {
    id: "forty-third-foreman",
    name: "Tovan Rees",
    title: "The Forty-Third Foreman",
    teaser: "He calls the player Foreman before the Ark introduces itself.",
    role: "engineer",
    backgroundId: "tidal-grid",
    trait: "systems-thinker",
  },
  {
    id: "null-lullaby",
    name: "Anja Pell",
    title: "The Child of the Quiet Frequency",
    teaser: "She hums the same interval buried under every SOS transmission.",
    role: "teacher",
    backgroundId: "shelter-teacher",
    trait: "null-dreamer",
  },
] as const satisfies readonly RareSurvivorHook[];

export type RareSurvivorHookId = (typeof RARE_SURVIVOR_HOOKS)[number]["id"];

export const TRAINING_DURATIONS_SECONDS: Record<ProfessionalRole, number> = {
  engineer: 32 * 60,
  doctor: 45 * 60,
  researcher: 40 * 60,
  navigator: 35 * 60,
  technician: 25 * 60,
  fabricator: 30 * 60,
  farmer: 22 * 60,
  teacher: 30 * 60,
  security: 25 * 60,
};

export const SURVIVOR_SCHEMA = 2;
export const SOS_WORLD_ID = "pelagos";
export const SOS_WORLD_IDS = [
  "pelagos",
  "viridia",
  "cinder",
  "nox",
  "vesper",
] as const;
export const SOS_SCAN_SECONDS = 90;
export const MAX_OFFLINE_SURVIVOR_SECONDS = 30 * 24 * 60 * 60;
export const MAX_SURVIVORS = 500;
export const MAX_SIGNAL_SURVIVORS = 8;
export const MAX_TRAINING_SLOTS = 12;
export const RARE_PITY_LIMIT = 11;
export const QUALITY_PITY_LIMIT = 5;
export const BASE_BERTHS = 4;
export const BERTHS_PER_SECTION = 8;
export const MAX_BERTH_SECTIONS = 62;
export const BERTH_CONSTRUCTION_BASE_SECONDS = 3 * 60 * 60;

const DEFAULT_RNG_SEED = 0x41c6ce57;
const MAX_COUNTER = 1_000_000_000;
const MAX_OPERATIONAL_SECONDS = 1_000_000_000_000;
const MAX_SKILL_XP = 1_000_000_000;
const BASE_RESCUE_COST = 18;
const RESCUE_COST_PER_PERSON = 8;
const STARTING_PROFESSIONAL_XP = 25;
const ON_JOB_XP_PER_HOUR = 12;

const ZERO_LIFE_SUPPORT: LifeSupportCapacity = {
  atmosphere: 0,
  water: 0,
  nutrition: 0,
  medical: 0,
};

const FIRST_NAMES = [
  "Ari",
  "Bela",
  "Cato",
  "Dena",
  "Eli",
  "Fara",
  "Galen",
  "Hana",
  "Iris",
  "Jori",
  "Kian",
  "Lio",
  "Mara",
  "Nia",
  "Oren",
  "Pavi",
  "Rhea",
  "Soren",
  "Tali",
  "Uma",
  "Venn",
  "Wren",
  "Yara",
  "Zev",
  "Anouk",
  "Bram",
  "Coral",
  "Davi",
  "Esk",
  "Fenna",
  "Gil",
  "Halla",
  "Imre",
  "Jesse",
  "Kova",
  "Lumen",
  "Marlo",
  "Noor",
  "Osha",
  "Petra",
] as const;

const LAST_NAMES = [
  "Aven",
  "Bex",
  "Cairn",
  "Daro",
  "Eris",
  "Fenn",
  "Gale",
  "Hollis",
  "Ilyan",
  "Juno",
  "Kes",
  "Lark",
  "Morrow",
  "Neris",
  "Orra",
  "Pell",
  "Quill",
  "Rook",
  "Senn",
  "Tern",
  "Vale",
  "Ward",
  "Yarrow",
  "Zoryn",
  "Ashfall",
  "Brine",
  "Calder",
  "Deep",
  "Ellum",
  "Frost",
  "Greel",
  "Harrow",
  "Isle",
  "Krace",
  "Loess",
  "Mire",
  "Naut",
  "Osprey",
  "Pike",
  "Reef",
] as const;

const SIGNAL_SOURCES = [
  "Flooded municipal shelter",
  "Drifting gravity ferry",
  "Breakwater maintenance spine",
  "Submerged civic archive",
  "Kelp cooperative habitat",
  "Storm-skiff emergency buoy",
  "Pressure-forge refuge",
  "Tidal-grid service vault",
] as const;

const ROLE_ROTATION: readonly ProfessionalRole[] = [
  "engineer",
  "doctor",
  "farmer",
  "teacher",
  "technician",
  "researcher",
  "navigator",
  "fabricator",
  "security",
];

const RANDOM_ROLE_POOL: readonly SurvivorRole[] = [
  "civilian",
  "civilian",
  "civilian",
  "civilian",
  "engineer",
  "doctor",
  "researcher",
  "navigator",
  "technician",
  "fabricator",
  "farmer",
  "teacher",
  "security",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown, fallback = 0, maximum = Number.MAX_VALUE) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(0, parsed));
};

const whole = (value: unknown, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  Math.floor(finite(value, fallback, maximum));

const textValue = (value: unknown, fallback: string, maximum: number) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, maximum);
  return normalized || fallback;
};

const optionalText = (value: unknown, maximum: number) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maximum);
};

const isProfessionalRole = (value: unknown): value is ProfessionalRole =>
  PROFESSIONAL_ROLES.includes(value as ProfessionalRole);

const isSurvivorRole = (value: unknown): value is SurvivorRole =>
  SURVIVOR_ROLES.includes(value as SurvivorRole);

const isTraitId = (value: unknown): value is SurvivorTraitId =>
  TRAIT_DEFINITIONS.some((trait) => trait.id === value);

const isRareHookId = (value: unknown): value is RareSurvivorHookId =>
  RARE_SURVIVOR_HOOKS.some((hook) => hook.id === value);

const backgroundDefinition = (backgroundId: string) =>
  BACKGROUND_DEFINITIONS.find((background) => background.id === backgroundId);

const rareHookDefinition = (hookId: RareSurvivorHookId) =>
  RARE_SURVIVOR_HOOKS.find((hook) => hook.id === hookId);

const makeSkillMap = (value = 0): SkillMap =>
  Object.fromEntries(PROFESSIONAL_ROLES.map((role) => [role, value])) as SkillMap;

const sanitizeSkillMap = (
  value: unknown,
  fallback: number,
  maximum: number,
  integer: boolean,
): SkillMap => {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    PROFESSIONAL_ROLES.map((role) => {
      const parsed = finite(source[role], fallback, maximum);
      return [role, integer ? Math.floor(parsed) : parsed];
    }),
  ) as SkillMap;
};

const makeRolePity = (value = 0): Record<ProfessionalRole, number> =>
  Object.fromEntries(PROFESSIONAL_ROLES.map((role) => [role, value])) as Record<
    ProfessionalRole,
    number
  >;

const sanitizeLifeSupport = (value: unknown): LifeSupportCapacity => {
  const source = isRecord(value) ? value : {};
  return {
    atmosphere: finite(source.atmosphere, 0, 100_000),
    water: finite(source.water, 0, 100_000),
    nutrition: finite(source.nutrition, 0, 100_000),
    medical: finite(source.medical, 0, 100_000),
  };
};

const supportDemandForSurvivors = (
  survivors: readonly Survivor[],
): LifeSupportCapacity => {
  const population = survivors.length;
  const medical = survivors.reduce((sum, survivor) => {
    const doctorRelief = survivor.role === "doctor" ? 0.04 : 0;
    return sum + Math.max(0.16, 0.25 - doctorRelief);
  }, 0);
  return {
    atmosphere: population,
    water: population,
    nutrition: population,
    medical: Math.round(medical * 100) / 100,
  };
};

const rescueCostFor = (survivors: readonly Survivor[]) =>
  Math.ceil(
    BASE_RESCUE_COST +
      survivors.length * RESCUE_COST_PER_PERSON +
      supportDemandForSurvivors(survivors).medical * 4,
  );

function nextRandom(state: SurvivorSystemState) {
  let value = state.rngState >>> 0;
  if (value === 0) value = DEFAULT_RNG_SEED;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = (value >>> 0) || DEFAULT_RNG_SEED;
  return state.rngState / 0x1_0000_0000;
}

const randomInt = (state: SurvivorSystemState, maximum: number) =>
  Math.floor(nextRandom(state) * Math.max(1, maximum));

const randomFrom = <T>(state: SurvivorSystemState, values: readonly T[]) =>
  values[randomInt(state, values.length)]!;

function cloneSurvivor(survivor: Survivor): Survivor {
  return {
    ...survivor,
    aptitudes: { ...survivor.aptitudes },
    traits: [...survivor.traits],
    skillXp: { ...survivor.skillXp },
  };
}

export function cloneSurvivorSystemState(
  state: SurvivorSystemState,
): SurvivorSystemState {
  return {
    ...state,
    activeSignal: state.activeSignal
      ? {
          ...state.activeSignal,
          survivors: state.activeSignal.survivors.map(cloneSurvivor),
        }
      : null,
    survivors: state.survivors.map(cloneSurvivor),
    lifeSupport: { ...state.lifeSupport },
    training: state.training.map((program) => ({ ...program })),
    rolePity: { ...state.rolePity },
    rescuedHookIds: [...state.rescuedHookIds],
    berthConstruction: state.berthConstruction
      ? { ...state.berthConstruction }
      : null,
  };
}

export function createSurvivorSystemState(
  seed = DEFAULT_RNG_SEED,
): SurvivorSystemState {
  const normalizedSeed = whole(seed, DEFAULT_RNG_SEED, 0xffff_ffff) >>> 0;
  return {
    schema: SURVIVOR_SCHEMA,
    rngState: normalizedSeed || DEFAULT_RNG_SEED,
    nextSurvivorSerial: 1,
    operationalSeconds: 0,
    beaconOnline: false,
    beaconWorldId: null,
    beaconProgressSeconds: 0,
    activeSignal: null,
    survivors: [],
    lifeSupport: { ...ZERO_LIFE_SUPPORT },
    trainingSlots: 1,
    training: [],
    completedTrainings: 0,
    signalsGenerated: 0,
    signalsResolved: 0,
    rarePity: 0,
    qualityPity: 0,
    rolePity: makeRolePity(),
    rescuedHookIds: [],
    berthSections: 0,
    berthConstruction: null,
  };
}

export function getBerthCapacity(
  state: Pick<SurvivorSystemState, "berthSections">,
  capacityMultiplier = 1,
) {
  const multiplier = Math.min(10, Math.max(1, finite(capacityMultiplier, 1, 10)));
  return Math.floor(
    (BASE_BERTHS + state.berthSections * BERTHS_PER_SECTION) * multiplier,
  );
}

export function startBerthSectionConstruction(
  state: SurvivorSystemState,
  durationSeconds = BERTH_CONSTRUCTION_BASE_SECONDS,
) {
  if (state.berthConstruction || state.berthSections >= MAX_BERTH_SECTIONS) {
    return state;
  }
  const next = cloneSurvivorSystemState(state);
  next.berthConstruction = {
    progressSeconds: 0,
    durationSeconds: Math.max(60, finite(durationSeconds, BERTH_CONSTRUCTION_BASE_SECONDS, 48 * 3_600)),
  };
  return next;
}

const NAME_REROLL_ATTEMPTS = 24;

function generateUniqueName(
  state: SurvivorSystemState,
  usedNames: ReadonlySet<string>,
) {
  let name = "";
  for (let attempt = 0; attempt < NAME_REROLL_ATTEMPTS; attempt += 1) {
    name = `${randomFrom(state, FIRST_NAMES)} ${randomFrom(state, LAST_NAMES)}`;
    if (!usedNames.has(name)) return name;
  }
  return name;
}

function createProceduralSurvivor(
  state: SurvivorSystemState,
  role: SurvivorRole,
  signalId: string,
  usedNames: ReadonlySet<string> = new Set(),
): Survivor {
  const matchingBackgrounds = BACKGROUND_DEFINITIONS.filter((background) =>
    background.preferredRoles.includes(role),
  );
  const background = randomFrom(
    state,
    matchingBackgrounds.length > 0 ? matchingBackgrounds : BACKGROUND_DEFINITIONS,
  );
  const aptitudes = makeSkillMap();
  for (const professionalRole of PROFESSIONAL_ROLES) {
    aptitudes[professionalRole] = 1 + randomInt(state, 3);
    aptitudes[professionalRole] = Math.min(
      5,
      aptitudes[professionalRole] +
        (background.aptitudeBoosts[professionalRole] ?? 0),
    );
  }
  if (role !== "civilian") {
    aptitudes[role] = Math.max(3, aptitudes[role]);
  }

  const adaptability =
    role === "civilian" ? 4 + randomInt(state, 2) : 1 + randomInt(state, 4);
  if (role === "civilian") {
    const strongest = randomFrom(state, PROFESSIONAL_ROLES);
    aptitudes[strongest] = Math.max(4, aptitudes[strongest]);
  }

  const traitIds = TRAIT_DEFINITIONS.map((trait) => trait.id);
  const traits = [randomFrom(state, traitIds)];
  if (nextRandom(state) < 0.32) {
    const second = randomFrom(state, traitIds);
    if (!traits.includes(second)) traits.push(second);
  }
  if (role === "civilian" && !traits.includes("adaptable")) {
    traits[0] = "adaptable";
  }

  const skillXp = makeSkillMap();
  if (role !== "civilian") skillXp[role] = STARTING_PROFESSIONAL_XP;
  const serial = state.nextSurvivorSerial++;
  return {
    id: `survivor-${serial}`,
    name: generateUniqueName(state, usedNames),
    callsign: "",
    origin: state.beaconWorldId ?? "unknown",
    originSignalId: signalId,
    backgroundId: background.id,
    role,
    aptitudes,
    adaptability,
    traits,
    skillXp,
    assignedRole: null,
    serviceSeconds: 0,
    joinedAt: 0,
    storyHookId: null,
  };
}

function createRareSurvivor(
  state: SurvivorSystemState,
  hook: (typeof RARE_SURVIVOR_HOOKS)[number],
  signalId: string,
  usedNames: ReadonlySet<string> = new Set(),
): Survivor {
  const survivor = createProceduralSurvivor(state, hook.role, signalId, usedNames);
  survivor.name = hook.name;
  survivor.backgroundId = hook.backgroundId;
  survivor.storyHookId = hook.id;
  survivor.traits = [
    hook.trait,
    ...survivor.traits.filter((trait) => trait !== hook.trait),
  ].slice(0, 2);
  survivor.aptitudes[hook.role] = 5;
  return survivor;
}

const SOS_GROUP_SIZES: Record<
  (typeof SOS_WORLD_IDS)[number],
  readonly [minimum: number, maximum: number]
> = {
  pelagos: [2, 4],
  viridia: [3, 5],
  cinder: [4, 6],
  nox: [5, 7],
  vesper: [6, 8],
};

function elevateSurvivorToExceptional(survivor: Survivor) {
  const rankedRoles = [...PROFESSIONAL_ROLES].sort(
    (left, right) => survivor.aptitudes[right] - survivor.aptitudes[left],
  );
  const primary =
    survivor.role !== "civilian" ? survivor.role : rankedRoles[0]!;
  const secondary = rankedRoles.find((role) => role !== primary)!;
  const tertiary = rankedRoles.find(
    (role) => role !== primary && role !== secondary,
  )!;
  survivor.aptitudes[primary] = 5;
  survivor.aptitudes[secondary] = 5;
  survivor.aptitudes[tertiary] = Math.max(3, survivor.aptitudes[tertiary]);
}

function generateSurvivorSignalMutable(
  state: SurvivorSystemState,
  reservedNames: readonly string[] = [],
) {
  if (!state.beaconOnline || state.activeSignal) return;
  const sequence = state.signalsGenerated + 1;
  const beaconWorldId = state.beaconWorldId ?? SOS_WORLD_ID;
  const signalId = `${beaconWorldId}-signal-${sequence}`;
  const [minimumGroupSize, maximumGroupSize] = SOS_GROUP_SIZES[beaconWorldId];
  const groupSize =
    minimumGroupSize + randomInt(state, maximumGroupSize - minimumGroupSize + 1);
  const scheduledRole = ROLE_ROTATION[(sequence - 1) % ROLE_ROTATION.length]!;
  const pityRole = PROFESSIONAL_ROLES.find(
    (role) => role !== scheduledRole && state.rolePity[role] >= 4,
  );
  const roles: SurvivorRole[] = [scheduledRole];
  if (pityRole && roles.length < groupSize) roles.push(pityRole);
  while (roles.length < groupSize) roles.push(randomFrom(state, RANDOM_ROLE_POOL));

  const usedNames = new Set<string>([
    ...state.survivors.map((survivor) => survivor.name),
    ...reservedNames,
  ]);
  const foundHookIds = new Set<RareSurvivorHookId>([
    ...state.rescuedHookIds,
    ...state.survivors
      .map((survivor) => survivor.storyHookId)
      .filter((hookId): hookId is RareSurvivorHookId => hookId !== null),
  ]);
  const remainingHooks = RARE_SURVIVOR_HOOKS.filter(
    (hook) => !foundHookIds.has(hook.id),
  );

  const rareChance = Math.min(0.2, 0.035 + state.rarePity * 0.015);
  const includesRare =
    remainingHooks.length > 0 &&
    (state.rarePity >= RARE_PITY_LIMIT || nextRandom(state) < rareChance);
  const survivors = roles.map((role) => {
    const survivor = createProceduralSurvivor(state, role, signalId, usedNames);
    usedNames.add(survivor.name);
    return survivor;
  });
  if (includesRare) {
    const hook = randomFrom(state, remainingHooks);
    survivors[survivors.length - 1] = createRareSurvivor(
      state,
      hook,
      signalId,
      usedNames,
    );
  }

  let includesExceptional = survivors.some((survivor) => {
    const rarity = getSurvivorRarity(survivor).id;
    return rarity === "exceptional" || rarity === "anomalous";
  });
  const qualityBoostChance = Math.min(0.48, 0.08 + state.qualityPity * 0.1);
  if (
    !includesExceptional &&
    (state.qualityPity >= QUALITY_PITY_LIMIT - 1 ||
      nextRandom(state) < qualityBoostChance)
  ) {
    elevateSurvivorToExceptional(survivors[survivors.length - 1]!);
    includesExceptional = true;
  }

  for (const role of PROFESSIONAL_ROLES) {
    state.rolePity[role] = survivors.some((survivor) => survivor.role === role)
      ? 0
      : Math.min(100, state.rolePity[role] + 1);
  }
  state.rarePity = includesRare ? 0 : Math.min(100, state.rarePity + 1);
  state.qualityPity = includesExceptional
    ? 0
    : Math.min(100, state.qualityPity + 1);
  state.signalsGenerated = sequence;
  state.beaconProgressSeconds = 0;
  state.activeSignal = {
    id: signalId,
    sequence,
    sourceLabel: `${beaconWorldId.toUpperCase()} / ${randomFrom(state, SIGNAL_SOURCES)}`,
    detectedAt: state.operationalSeconds,
    survivors,
    rescueCost: rescueCostFor(survivors),
  };
}

export function setSosBeaconOnline(
  state: SurvivorSystemState,
  online: boolean,
  currentWorldId: string,
) {
  const worldId = SOS_WORLD_IDS.includes(
    currentWorldId as (typeof SOS_WORLD_IDS)[number],
  )
    ? (currentWorldId as (typeof SOS_WORLD_IDS)[number])
    : null;
  if (online && !worldId) return state;
  if (
    state.beaconOnline === online &&
    (!online || state.beaconWorldId === worldId)
  ) {
    return state;
  }
  return {
    ...state,
    beaconOnline: online,
    beaconWorldId: online ? worldId : null,
    beaconProgressSeconds: online ? state.beaconProgressSeconds : 0,
  };
}

export function setLifeSupportCapacity(
  state: SurvivorSystemState,
  capacity: Partial<LifeSupportCapacity>,
) {
  const nextCapacity = sanitizeLifeSupport({ ...state.lifeSupport, ...capacity });
  if (
    (Object.keys(nextCapacity) as LifeSupportKey[]).every(
      (key) => nextCapacity[key] === state.lifeSupport[key],
    )
  ) {
    return state;
  }
  return { ...state, lifeSupport: nextCapacity };
}

export function setTrainingSlots(state: SurvivorSystemState, slots: number) {
  const requested = whole(slots, state.trainingSlots, MAX_TRAINING_SLOTS);
  const safeSlots = Math.max(requested, state.training.length);
  if (safeSlots === state.trainingSlots) return state;
  return { ...state, trainingSlots: safeSlots };
}

export type LifeSupportStatus = {
  stable: boolean;
  population: number;
  populationAfter: number;
  capacity: LifeSupportCapacity;
  demand: LifeSupportCapacity;
  remaining: LifeSupportCapacity;
  shortages: LifeSupportCapacity;
};

export function getLifeSupportStatus(
  state: SurvivorSystemState,
  incoming: readonly Survivor[] = [],
  capacityMultiplier = 1,
): LifeSupportStatus {
  const population = [...state.survivors, ...incoming];
  const demand = supportDemandForSurvivors(population);
  const keys = Object.keys(state.lifeSupport) as LifeSupportKey[];
  const multiplier = Math.min(10, Math.max(1, finite(capacityMultiplier, 1, 10)));
  const capacity = Object.fromEntries(
    keys.map((key) => [key, Math.floor(state.lifeSupport[key] * multiplier)]),
  ) as LifeSupportCapacity;
  const remaining = { ...ZERO_LIFE_SUPPORT };
  const shortages = { ...ZERO_LIFE_SUPPORT };
  for (const key of keys) {
    remaining[key] = Math.max(0, capacity[key] - demand[key]);
    shortages[key] = Math.max(0, demand[key] - capacity[key]);
  }
  return {
    stable: keys.every((key) => shortages[key] <= 0.000_001),
    population: state.survivors.length,
    populationAfter: population.length,
    capacity,
    demand,
    remaining,
    shortages,
  };
}

export type RescueFailureReason =
  | "no-signal"
  | "roster-full"
  | "berths"
  | "life-support"
  | "salvage";

export type RescueReadiness = {
  canRescue: boolean;
  cost: number;
  reason: RescueFailureReason | null;
  lifeSupport: LifeSupportStatus;
};

export function getRescueReadiness(
  state: SurvivorSystemState,
  availableSalvage: number,
  capacityMultiplier = 1,
): RescueReadiness {
  const signal = state.activeSignal;
  const lifeSupport = getLifeSupportStatus(
    state,
    signal?.survivors ?? [],
    capacityMultiplier,
  );
  if (!signal) {
    return { canRescue: false, cost: 0, reason: "no-signal", lifeSupport };
  }
  if (state.survivors.length + signal.survivors.length > MAX_SURVIVORS) {
    return {
      canRescue: false,
      cost: signal.rescueCost,
      reason: "roster-full",
      lifeSupport,
    };
  }
  if (
    state.survivors.length + signal.survivors.length >
    getBerthCapacity(state, capacityMultiplier)
  ) {
    return {
      canRescue: false,
      cost: signal.rescueCost,
      reason: "berths",
      lifeSupport,
    };
  }
  if (!lifeSupport.stable) {
    return {
      canRescue: false,
      cost: signal.rescueCost,
      reason: "life-support",
      lifeSupport,
    };
  }
  if (finite(availableSalvage, 0) < signal.rescueCost) {
    return {
      canRescue: false,
      cost: signal.rescueCost,
      reason: "salvage",
      lifeSupport,
    };
  }
  return {
    canRescue: true,
    cost: signal.rescueCost,
    reason: null,
    lifeSupport,
  };
}

export type RescueResult = {
  state: SurvivorSystemState;
  rescued: boolean;
  salvageSpent: number;
  survivorIds: string[];
  reason: RescueFailureReason | null;
};

export function rescueSurvivorSignal(
  state: SurvivorSystemState,
  availableSalvage: number,
  capacityMultiplier = 1,
): RescueResult {
  const readiness = getRescueReadiness(
    state,
    availableSalvage,
    capacityMultiplier,
  );
  if (!readiness.canRescue || !state.activeSignal) {
    return {
      state,
      rescued: false,
      salvageSpent: 0,
      survivorIds: [],
      reason: readiness.reason,
    };
  }
  const next = cloneSurvivorSystemState(state);
  const signal = next.activeSignal!;
  const arrivals = signal.survivors.map((survivor) => ({
    ...cloneSurvivor(survivor),
    joinedAt: next.operationalSeconds,
  }));
  next.survivors.push(...arrivals);
  next.rescuedHookIds = [
    ...new Set([
      ...next.rescuedHookIds,
      ...arrivals
        .map((survivor) => survivor.storyHookId)
        .filter((hookId): hookId is RareSurvivorHookId => hookId !== null),
    ]),
  ];
  next.activeSignal = null;
  next.beaconProgressSeconds = 0;
  next.signalsResolved += 1;
  return {
    state: next,
    rescued: true,
    salvageSpent: readiness.cost,
    survivorIds: arrivals.map((survivor) => survivor.id),
    reason: null,
  };
}

export function declineSurvivorSignal(state: SurvivorSystemState) {
  if (!state.activeSignal) return state;
  const next = cloneSurvivorSystemState(state);
  const declinedRare = next.activeSignal!.survivors.some(
    (survivor) => survivor.storyHookId !== null,
  );
  next.activeSignal = null;
  next.beaconProgressSeconds = 0;
  next.signalsResolved += 1;
  if (declinedRare) {
    next.rarePity = Math.max(next.rarePity, RARE_PITY_LIMIT - 2);
  }
  return next;
}

export function getSurvivorSkillLevel(
  survivor: Survivor,
  role: ProfessionalRole,
) {
  const xp = finite(survivor.skillXp[role], 0, MAX_SKILL_XP);
  if (xp <= 0 && survivor.role !== role) return 0;
  return Math.min(10, 1 + Math.floor(Math.sqrt(xp / 120)));
}

export type SurvivorSkillProgress = {
  level: number;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  progress: number;
  isMaxLevel: boolean;
};

export function getSurvivorSkillProgress(
  survivor: Survivor,
  role: ProfessionalRole,
): SurvivorSkillProgress {
  const level = getSurvivorSkillLevel(survivor, role);
  const xp = finite(survivor.skillXp[role], 0, MAX_SKILL_XP);
  if (level <= 0) {
    return {
      level: 0,
      xp,
      levelStartXp: 0,
      nextLevelXp: null,
      progress: 0,
      isMaxLevel: false,
    };
  }
  if (level >= 10) {
    return {
      level,
      xp,
      levelStartXp: 120 * 9 ** 2,
      nextLevelXp: null,
      progress: 1,
      isMaxLevel: true,
    };
  }
  const levelStartXp = level === 1 ? 0 : 120 * (level - 1) ** 2;
  const nextLevelXp = 120 * level ** 2;
  return {
    level,
    xp,
    levelStartXp,
    nextLevelXp,
    progress: Math.min(
      1,
      Math.max(0, (xp - levelStartXp) / (nextLevelXp - levelStartXp)),
    ),
    isMaxLevel: false,
  };
}

export function getSurvivorOnJobXpPerHour(
  survivor: Survivor,
  role: ProfessionalRole,
  externalMultiplier = 1,
) {
  const aptitudeMultiplier = 0.8 + survivor.aptitudes[role] * 0.1;
  return (
    ON_JOB_XP_PER_HOUR *
    aptitudeMultiplier *
    getSurvivorLearningMultiplier(survivor) *
    Math.max(1, finite(externalMultiplier, 1, 10))
  );
}

export function isSurvivorQualified(
  survivor: Survivor,
  role: ProfessionalRole,
) {
  return survivor.role === role || survivor.skillXp[role] > 0;
}

export const PROFESSION_CAPACITY: Record<SurvivorRarityId, number> = {
  standard: 1,
  notable: 2,
  exceptional: 3,
  anomalous: PROFESSIONAL_ROLES.length,
};

export function getSurvivorProfessionCount(survivor: Survivor) {
  return PROFESSIONAL_ROLES.filter((role) =>
    isSurvivorQualified(survivor, role),
  ).length;
}

export function getSurvivorProfessionCapacity(survivor: Survivor) {
  return PROFESSION_CAPACITY[getSurvivorRarity(survivor).id];
}

export function canSurvivorLearnProfession(
  survivor: Survivor,
  role: ProfessionalRole,
) {
  if (isSurvivorQualified(survivor, role)) return false;
  // Crew already over capacity (from earlier releases) keep everything they
  // know; the capacity only limits additional professions.
  return getSurvivorProfessionCount(survivor) < getSurvivorProfessionCapacity(survivor);
}

export type TrainingQuote = {
  survivorId: string;
  targetRole: ProfessionalRole;
  durationSeconds: number;
  aptitude: number;
  civilianAcceleration: number;
  learningMultiplier: number;
};

export function getTrainingQuote(
  survivor: Survivor,
  targetRole: ProfessionalRole,
): TrainingQuote {
  const aptitude = Math.max(1, Math.min(5, survivor.aptitudes[targetRole]));
  const aptitudeMultiplier = 1 - (aptitude - 1) * 0.07;
  const civilianAcceleration =
    survivor.role === "civilian"
      ? Math.max(0.72, 0.88 - survivor.adaptability * 0.025)
      : 1;
  const learningMultiplier = getSurvivorLearningMultiplier(survivor);
  return {
    survivorId: survivor.id,
    targetRole,
    durationSeconds: Math.max(
      5 * 60,
      Math.ceil(
        TRAINING_DURATIONS_SECONDS[targetRole] *
          aptitudeMultiplier *
          civilianAcceleration /
          learningMultiplier,
      ),
    ),
    aptitude,
    civilianAcceleration,
    learningMultiplier,
  };
}

export function startSurvivorTraining(
  state: SurvivorSystemState,
  survivorId: string,
  targetRole: ProfessionalRole,
) {
  if (!isProfessionalRole(targetRole)) return state;
  if (state.training.length >= state.trainingSlots) return state;
  if (state.training.some((program) => program.survivorId === survivorId)) {
    return state;
  }
  const survivor = state.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor || !canSurvivorLearnProfession(survivor, targetRole)) return state;
  const quote = getTrainingQuote(survivor, targetRole);
  const next = cloneSurvivorSystemState(state);
  next.survivors.find((candidate) => candidate.id === survivorId)!.assignedRole =
    null;
  next.training.push({
    survivorId,
    targetRole,
    progressSeconds: 0,
    durationSeconds: quote.durationSeconds,
  });
  return next;
}

export function cancelSurvivorTraining(
  state: SurvivorSystemState,
  survivorId: string,
) {
  if (!state.training.some((program) => program.survivorId === survivorId)) {
    return state;
  }
  return {
    ...state,
    training: state.training
      .filter((program) => program.survivorId !== survivorId)
      .map((program) => ({ ...program })),
  };
}

export function assignSurvivorToRole(
  state: SurvivorSystemState,
  survivorId: string,
  role: SurvivorRole | null,
) {
  const survivor = state.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor) return state;
  if (state.training.some((program) => program.survivorId === survivorId)) {
    return state;
  }
  if (role === "civilian" && survivor.role !== "civilian") return state;
  if (
    role !== null &&
    role !== "civilian" &&
    !isSurvivorQualified(survivor, role)
  ) {
    return state;
  }
  if (survivor.assignedRole === role) return state;
  const next = cloneSurvivorSystemState(state);
  next.survivors.find((candidate) => candidate.id === survivorId)!.assignedRole =
    role;
  return next;
}

export function renameSurvivorCallsign(
  state: SurvivorSystemState,
  survivorId: string,
  callsign: string,
) {
  const normalized = optionalText(callsign, 18);
  const survivor = state.survivors.find((candidate) => candidate.id === survivorId);
  if (!survivor || survivor.callsign === normalized) return state;
  const next = cloneSurvivorSystemState(state);
  next.survivors.find((candidate) => candidate.id === survivorId)!.callsign =
    normalized;
  return next;
}

export function transferSurvivorsToSettlement(
  state: SurvivorSystemState,
  survivorIds: readonly string[],
) {
  const requested = new Set(survivorIds);
  const transferred = state.survivors.filter((survivor) =>
    requested.has(survivor.id),
  );
  if (transferred.length === 0) return state;
  const transferredIds = new Set(transferred.map((survivor) => survivor.id));
  const next = cloneSurvivorSystemState(state);
  next.rescuedHookIds = [
    ...new Set([
      ...next.rescuedHookIds,
      ...transferred
        .map((survivor) => survivor.storyHookId)
        .filter((hookId): hookId is RareSurvivorHookId => hookId !== null),
    ]),
  ];
  next.survivors = next.survivors.filter(
    (survivor) => !transferredIds.has(survivor.id),
  );
  next.training = next.training.filter(
    (program) => !transferredIds.has(program.survivorId),
  );
  return next;
}

function advanceTrainingMutable(state: SurvivorSystemState, elapsedSeconds: number) {
  const completed = new Set<string>();
  for (const program of state.training) {
    program.progressSeconds = Math.min(
      program.durationSeconds,
      program.progressSeconds + elapsedSeconds,
    );
    if (program.progressSeconds < program.durationSeconds) continue;
    const survivor = state.survivors.find(
      (candidate) => candidate.id === program.survivorId,
    );
    if (survivor) {
      survivor.role = program.targetRole;
      survivor.skillXp[program.targetRole] = Math.max(
        STARTING_PROFESSIONAL_XP,
        survivor.skillXp[program.targetRole],
      );
      survivor.assignedRole = null;
      state.completedTrainings += 1;
    }
    completed.add(program.survivorId);
  }
  state.training = state.training.filter(
    (program) => !completed.has(program.survivorId),
  );
}

function advanceOnJobExperienceMutable(
  state: SurvivorSystemState,
  elapsedSeconds: number,
  traineeIds: ReadonlySet<string>,
  xpMultiplier: number,
) {
  for (const survivor of state.survivors) {
    if (!survivor.assignedRole || traineeIds.has(survivor.id)) continue;
    survivor.serviceSeconds = Math.min(
      MAX_OPERATIONAL_SECONDS,
      survivor.serviceSeconds + elapsedSeconds,
    );
    if (survivor.assignedRole === "civilian") continue;
    const role = survivor.assignedRole;
    survivor.skillXp[role] = Math.min(
      MAX_SKILL_XP,
      survivor.skillXp[role] +
        (elapsedSeconds / 3_600) *
          getSurvivorOnJobXpPerHour(survivor, role, xpMultiplier),
    );
  }
}

export function advanceSurvivorSystem(
  state: SurvivorSystemState,
  elapsedSeconds: number,
  modifiers: SurvivorAdvanceModifiers = {},
) {
  const elapsed = finite(
    elapsedSeconds,
    0,
    MAX_OFFLINE_SURVIVOR_SECONDS,
  );
  if (elapsed <= 0) return state;
  const trainingSpeed = Math.min(
    10,
    Math.max(1, finite(modifiers.trainingSpeedMultiplier, 1, 10)),
  );
  const beaconSpeed = Math.min(
    10,
    Math.max(1, finite(modifiers.beaconSpeedMultiplier, 1, 10)),
  );
  const onJobXpMultiplier = Math.min(
    10,
    Math.max(1, finite(modifiers.onJobXpMultiplier, 1, 10)),
  );
  const next = cloneSurvivorSystemState(state);
  next.operationalSeconds = Math.min(
    MAX_OPERATIONAL_SECONDS,
    next.operationalSeconds + elapsed,
  );
  const traineeIds = new Set(next.training.map((program) => program.survivorId));
  advanceTrainingMutable(next, elapsed * trainingSpeed);
  advanceOnJobExperienceMutable(
    next,
    elapsed,
    traineeIds,
    onJobXpMultiplier,
  );
  if (next.berthConstruction) {
    const constructionSpeed = Math.min(
      10,
      Math.max(1, finite(modifiers.constructionSpeedMultiplier, 1, 10)),
    );
    next.berthConstruction.progressSeconds = Math.min(
      next.berthConstruction.durationSeconds,
      next.berthConstruction.progressSeconds + elapsed * constructionSpeed,
    );
    if (
      next.berthConstruction.progressSeconds >=
      next.berthConstruction.durationSeconds
    ) {
      next.berthSections = Math.min(
        MAX_BERTH_SECTIONS,
        next.berthSections + 1,
      );
      next.berthConstruction = null;
    }
  }
  if (next.beaconOnline && !next.activeSignal) {
    next.beaconProgressSeconds = Math.min(
      SOS_SCAN_SECONDS,
      next.beaconProgressSeconds + elapsed * beaconSpeed,
    );
    if (next.beaconProgressSeconds >= SOS_SCAN_SECONDS) {
      generateSurvivorSignalMutable(next, modifiers.reservedNames ?? []);
    }
  }
  return next;
}

export function getPopulationRoleCounts(state: SurvivorSystemState) {
  return Object.fromEntries(
    SURVIVOR_ROLES.map((role) => [
      role,
      state.survivors.filter((survivor) => survivor.role === role).length,
    ]),
  ) as Record<SurvivorRole, number>;
}

export function getPopulationExpertiseTotals(state: SurvivorSystemState) {
  return Object.fromEntries(
    PROFESSIONAL_ROLES.map((role) => [
      role,
      state.survivors.reduce(
        (sum, survivor) => sum + getSurvivorSkillLevel(survivor, role),
        0,
      ),
    ]),
  ) as Record<ProfessionalRole, number>;
}

function sanitizeSurvivor(
  value: unknown,
  fallbackId: string,
  joinedFallback: number,
): Survivor | null {
  if (!isRecord(value)) return null;
  const id = textValue(value.id, fallbackId, 48).replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!id) return null;
  let role: SurvivorRole = isSurvivorRole(value.role) ? value.role : "civilian";
  const storyHookId = isRareHookId(value.storyHookId) ? value.storyHookId : null;
  const hook = storyHookId ? rareHookDefinition(storyHookId) : null;
  if (hook) role = hook.role;
  const fallbackBackground =
    role === "civilian" ? "civic-volunteer" : "ferry-crew";
  const rawBackgroundId = textValue(
    value.backgroundId,
    fallbackBackground,
    48,
  );
  const backgroundId = hook
    ? hook.backgroundId
    : backgroundDefinition(rawBackgroundId)
      ? rawBackgroundId
      : fallbackBackground;
  const aptitudes = sanitizeSkillMap(value.aptitudes, 1, 5, true);
  if (role !== "civilian") aptitudes[role] = Math.max(1, aptitudes[role]);
  const skillXp = sanitizeSkillMap(value.skillXp, 0, MAX_SKILL_XP, false);
  if (role !== "civilian") skillXp[role] = Math.max(STARTING_PROFESSIONAL_XP, skillXp[role]);
  const rawTraits = Array.isArray(value.traits) ? value.traits : [];
  const traits = [...new Set(rawTraits.filter(isTraitId))].slice(0, 3);
  if (hook && !traits.includes(hook.trait)) traits.unshift(hook.trait);
  if (traits.length === 0) traits.push(role === "civilian" ? "adaptable" : "calm-presence");
  const rawAssignedRole = isSurvivorRole(value.assignedRole)
    ? value.assignedRole
    : null;
  const assignedRole =
    rawAssignedRole === "civilian"
      ? role === "civilian"
        ? rawAssignedRole
        : null
      : rawAssignedRole &&
          (rawAssignedRole === role || skillXp[rawAssignedRole] > 0)
        ? rawAssignedRole
        : null;
  const origin: SurvivorOrigin =
    value.origin === "ark" ||
    SOS_WORLD_IDS.includes(value.origin as (typeof SOS_WORLD_IDS)[number])
      ? (value.origin as SurvivorOrigin)
      : "unknown";
  return {
    id,
    name: hook ? hook.name : textValue(value.name, "Unknown Survivor", 36),
    callsign: optionalText(value.callsign, 18),
    origin,
    originSignalId: optionalText(value.originSignalId, 48),
    backgroundId,
    role,
    aptitudes,
    adaptability: Math.max(1, whole(value.adaptability, role === "civilian" ? 4 : 2, 5)),
    traits: traits.slice(0, 3),
    skillXp,
    assignedRole,
    serviceSeconds: finite(value.serviceSeconds, 0, MAX_OPERATIONAL_SECONDS),
    joinedAt: finite(value.joinedAt, joinedFallback, MAX_OPERATIONAL_SECONDS),
    storyHookId,
  };
}

export function sanitizeSurvivorSystemState(value: unknown): SurvivorSystemState {
  const base = createSurvivorSystemState();
  if (!isRecord(value)) return base;
  const seed = whole(value.rngState, DEFAULT_RNG_SEED, 0xffff_ffff) >>> 0;
  const beaconWorldId = SOS_WORLD_IDS.includes(
    value.beaconWorldId as (typeof SOS_WORLD_IDS)[number],
  )
    ? (value.beaconWorldId as (typeof SOS_WORLD_IDS)[number])
    : value.beaconOnline === true
      ? SOS_WORLD_ID
      : null;
  const state: SurvivorSystemState = {
    ...base,
    rngState: seed || DEFAULT_RNG_SEED,
    nextSurvivorSerial: Math.max(1, whole(value.nextSurvivorSerial, 1, MAX_COUNTER)),
    operationalSeconds: finite(
      value.operationalSeconds,
      0,
      MAX_OPERATIONAL_SECONDS,
    ),
    beaconOnline: value.beaconOnline === true && beaconWorldId !== null,
    beaconWorldId,
    beaconProgressSeconds: finite(
      value.beaconProgressSeconds,
      0,
      SOS_SCAN_SECONDS,
    ),
    activeSignal: null,
    survivors: [],
    lifeSupport: sanitizeLifeSupport(value.lifeSupport),
    trainingSlots: whole(value.trainingSlots, 1, MAX_TRAINING_SLOTS),
    training: [],
    completedTrainings: whole(value.completedTrainings, 0, MAX_COUNTER),
    signalsGenerated: whole(value.signalsGenerated, 0, MAX_COUNTER),
    signalsResolved: whole(value.signalsResolved, 0, MAX_COUNTER),
    rarePity: whole(value.rarePity, 0, 100),
    qualityPity: whole(value.qualityPity, 0, 100),
    rolePity: makeRolePity(),
    rescuedHookIds: [],
  };

  const rawRolePity = isRecord(value.rolePity) ? value.rolePity : {};
  for (const role of PROFESSIONAL_ROLES) {
    state.rolePity[role] = whole(rawRolePity[role], 0, 100);
  }

  const rawHookIds = Array.isArray(value.rescuedHookIds)
    ? value.rescuedHookIds
    : [];
  state.rescuedHookIds = [...new Set(rawHookIds.filter(isRareHookId))];

  // Berth migration: saves recorded before the structural berth system kept
  // crew capacity inside lifeSupport.habitation. Convert that capacity into
  // completed berth sections so nobody loses room they already built.
  const legacyHabitation = isRecord(value.lifeSupport)
    ? finite((value.lifeSupport as Record<string, unknown>).habitation, 0, 100_000)
    : 0;
  const savedSections = whole(value.berthSections, -1, MAX_BERTH_SECTIONS);
  state.berthSections =
    savedSections >= 0
      ? savedSections
      : Math.min(
          MAX_BERTH_SECTIONS,
          Math.ceil(
            Math.max(0, legacyHabitation - BASE_BERTHS) / BERTHS_PER_SECTION,
          ),
        );
  if (isRecord(value.berthConstruction)) {
    const duration = finite(
      value.berthConstruction.durationSeconds,
      BERTH_CONSTRUCTION_BASE_SECONDS,
      48 * 3_600,
    );
    state.berthConstruction = {
      durationSeconds: Math.max(60, duration),
      progressSeconds: finite(
        value.berthConstruction.progressSeconds,
        0,
        Math.max(60, duration),
      ),
    };
  }

  const survivorIds = new Set<string>();
  const rawSurvivors = Array.isArray(value.survivors) ? value.survivors : [];
  for (const [index, raw] of rawSurvivors.slice(0, MAX_SURVIVORS).entries()) {
    const survivor = sanitizeSurvivor(raw, `survivor-recovered-${index + 1}`, 0);
    if (!survivor || survivorIds.has(survivor.id)) continue;
    survivorIds.add(survivor.id);
    state.survivors.push(survivor);
  }
  state.rescuedHookIds = [
    ...new Set([
      ...state.rescuedHookIds,
      ...state.survivors
        .map((survivor) => survivor.storyHookId)
        .filter((hookId): hookId is RareSurvivorHookId => hookId !== null),
    ]),
  ];

  if (isRecord(value.activeSignal)) {
    const rawSignal = value.activeSignal;
    const sequence = Math.max(
      1,
      whole(rawSignal.sequence, state.signalsGenerated + 1, MAX_COUNTER),
    );
    const signalWorldId = state.beaconWorldId ?? SOS_WORLD_ID;
    const signalId = `${signalWorldId}-signal-${sequence}`;
    const pendingIds = new Set<string>();
    const pending: Survivor[] = [];
    const rawPending = Array.isArray(rawSignal.survivors)
      ? rawSignal.survivors
      : [];
    for (const [index, raw] of rawPending
      .slice(0, MAX_SIGNAL_SURVIVORS)
      .entries()) {
      const survivor = sanitizeSurvivor(
        raw,
        `signal-${sequence}-survivor-${index + 1}`,
        0,
      );
      if (
        !survivor ||
        survivorIds.has(survivor.id) ||
        pendingIds.has(survivor.id)
      ) {
        continue;
      }
      survivor.origin = signalWorldId;
      survivor.originSignalId = signalId;
      survivor.joinedAt = 0;
      survivor.assignedRole = null;
      pendingIds.add(survivor.id);
      pending.push(survivor);
    }
    if (pending.length > 0) {
      state.signalsGenerated = Math.max(state.signalsGenerated, sequence);
      state.activeSignal = {
        id: signalId,
        sequence,
        sourceLabel: textValue(
          rawSignal.sourceLabel,
          `Unresolved ${signalWorldId} shelter`,
          64,
        ),
        detectedAt: finite(
          rawSignal.detectedAt,
          state.operationalSeconds,
          state.operationalSeconds,
        ),
        survivors: pending,
        rescueCost: rescueCostFor(pending),
      };
      state.beaconProgressSeconds = 0;
    }
  }

  const rawTraining = Array.isArray(value.training) ? value.training : [];
  const trainees = new Set<string>();
  for (const raw of rawTraining.slice(0, MAX_TRAINING_SLOTS)) {
    if (!isRecord(raw) || !isProfessionalRole(raw.targetRole)) continue;
    const survivorId = textValue(raw.survivorId, "", 48);
    const survivor = state.survivors.find(
      (candidate) => candidate.id === survivorId,
    );
    if (
      !survivor ||
      trainees.has(survivorId) ||
      isSurvivorQualified(survivor, raw.targetRole)
    ) {
      continue;
    }
    const quote = getTrainingQuote(survivor, raw.targetRole);
    const progress = finite(raw.progressSeconds, 0, quote.durationSeconds);
    survivor.assignedRole = null;
    if (progress >= quote.durationSeconds) {
      survivor.role = raw.targetRole;
      survivor.skillXp[raw.targetRole] = Math.max(
        STARTING_PROFESSIONAL_XP,
        survivor.skillXp[raw.targetRole],
      );
      state.completedTrainings += 1;
      continue;
    }
    trainees.add(survivorId);
    state.training.push({
      survivorId,
      targetRole: raw.targetRole,
      progressSeconds: progress,
      durationSeconds: quote.durationSeconds,
    });
  }
  state.trainingSlots = Math.max(state.trainingSlots, state.training.length);
  const inferredSerial = [
    ...state.survivors,
    ...(state.activeSignal?.survivors ?? []),
  ].reduce((maximum, survivor) => {
    const match = /^survivor-(\d+)$/.exec(survivor.id);
    return match ? Math.max(maximum, Number(match[1]) + 1) : maximum;
  }, 1);
  state.nextSurvivorSerial = Math.max(
    state.nextSurvivorSerial,
    inferredSerial,
    state.survivors.length +
      (state.activeSignal?.survivors.length ?? 0) +
      1,
  );
  // Nobody already aboard ever loses their berth.
  while (
    getBerthCapacity(state) < state.survivors.length &&
    state.berthSections < MAX_BERTH_SECTIONS
  ) {
    state.berthSections += 1;
  }
  return state;
}
