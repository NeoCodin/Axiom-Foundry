export const SAVE_VERSION = 4;
export const SAVE_KEY = "axiom-foundry-save-v2";
export const RETIRED_SAVE_KEYS = ["axiom-foundry-save-v1"] as const;
export const MAX_VALUE = 1e280;

export type PurchaseMode = "1" | "10" | "max";

export type TierState = {
  amount: number;
  bought: number;
};

export type GameSettings = {
  buyMode: PurchaseMode;
  autoEnabled: boolean;
  autoUpgrades: boolean;
  autoTiers: boolean[];
  tutorialComplete: boolean;
};

export type MissionStatus = "locked" | "active" | "saved";

export type MissionStageKind =
  | "pulseDelta"
  | "tierPurchaseDelta"
  | "researchDelta"
  | "contributeFlux"
  | "resonanceHold"
  | "recalibrateGain";

export type MissionBaseline = {
  manualPulses: number;
  tierBought: number[];
  researchLevels: number;
  cycle: number;
  lifetimeAxioms: number;
};

export type MissionState = {
  schema: number;
  currentIndex: number;
  stageIndex: number;
  statuses: MissionStatus[];
  worldsSaved: number;
  awaitingAcknowledgement: boolean;
  holdTime: number;
  contributedFlux: number;
  baseline: MissionBaseline;
};

export type GameState = {
  version: number;
  flux: number;
  maxFlux: number;
  runFlux: number;
  allTimeFlux: number;
  axioms: number;
  lifetimeAxioms: number;
  stellarRelays: number;
  cycle: number;
  tiers: TierState[];
  runUpgrades: number[];
  legacyUpgrades: number[];
  missions: MissionState;
  settings: GameSettings;
  manualPulses: number;
  playTime: number;
  runTime: number;
  autoTimer: number;
  startedAt: number;
  lastSaved: number;
};

export const GENERATORS = [
  {
    name: "Vacuum Tap",
    shortName: "Tap",
    description: "Pulls usable Flux from the quiet between particles.",
    produces: "Flux",
    baseCost: 10,
    growth: 1.17,
    rate: 1,
    unlockAt: 0,
  },
  {
    name: "Phase Coil",
    shortName: "Coil",
    description: "Winds phase pressure into new Vacuum Taps.",
    produces: "Vacuum Taps",
    baseCost: 500,
    growth: 1.2,
    rate: 0.08,
    unlockAt: 250,
  },
  {
    name: "Harmonic Loom",
    shortName: "Loom",
    description: "Weaves synchronized Phase Coils from standing waves.",
    produces: "Phase Coils",
    baseCost: 50_000,
    growth: 1.23,
    rate: 0.015,
    unlockAt: 10_000,
  },
  {
    name: "Orbit Array",
    shortName: "Array",
    description: "Assembles Harmonic Looms along a stable orbital track.",
    produces: "Harmonic Looms",
    baseCost: 5_000_000,
    growth: 1.27,
    rate: 0.003,
    unlockAt: 1_000_000,
  },
  {
    name: "Axiom Engine",
    shortName: "Engine",
    description: "Turns a proven law of motion into an endless assembly line.",
    produces: "Orbit Arrays",
    baseCost: 200_000_000,
    growth: 1.32,
    rate: 0.0006,
    unlockAt: 50_000_000,
  },
  {
    name: "Horizon Forge",
    shortName: "Forge",
    description: "Builds Axiom Engines at the edge of measurable space.",
    produces: "Axiom Engines",
    baseCost: 50_000_000_000,
    growth: 1.38,
    rate: 0.00012,
    unlockAt: 5_000_000_000,
  },
] as const;

export const RUN_UPGRADES = [
  {
    name: "Pulse Geometry",
    description: "Multiply Flux gained when you tune the Core by 1.65.",
    baseCost: 250,
    growth: 8,
    maxLevel: 5,
    revealAt: 100,
  },
  {
    name: "Flow Compression",
    description: "Add 25% to final Flux output without accelerating the whole chain.",
    baseCost: 3_000,
    growth: 12,
    maxLevel: 8,
    revealAt: 10_000,
  },
  {
    name: "Harmonic Gearing",
    description: "Add 30% total output across the upper fabrication chain.",
    baseCost: 100_000,
    growth: 20,
    maxLevel: 6,
    revealAt: 1_000_000,
  },
  {
    name: "Resonant Mesh",
    description: "Strengthen each balanced Resonance link without compounding every tier.",
    baseCost: 10_000_000,
    growth: 25,
    maxLevel: 4,
    revealAt: 100_000_000,
  },
] as const;

export const LEGACY_UPGRADES = [
  {
    name: "Axiom Amplifier",
    description: "Strengthen final Flux output with diminishing returns.",
  },
  {
    name: "Precision Tooling",
    description: "Reduce machine prices with a stable, diminishing curve.",
  },
  {
    name: "Seed Mechanism",
    description: "Future cycles and planetary landings begin with 2 Vacuum Taps per level.",
  },
] as const;

export const RECALIBRATION_THRESHOLD = 1_000_000_000_000;

export const MISSIONS = [
  {
    world: "Helion Reach",
    epithet: "The Beacon Colony",
    title: "Restore the stolen light",
    briefing:
      "The Null Tide is erasing photons before Helion's beacon can emit them. Rebuild the Foundry in darkness and force one signal to remain real.",
    arrival:
      "Helion appears as a black disc against a failing star. Every surviving settlement is listening for the Foundry's first pulse.",
    hazardLabel: "Photonic blackout",
    hazard:
      "Automatic output begins weakened. Each restored beacon phase returns part of the missing light.",
    effects: {
      production: 0.82,
      manual: 1,
      machineCost: 1,
      researchCost: 1,
      higherTier: 1,
      resonance: 1,
    },
    stages: [
      {
        kind: "pulseDelta",
        target: 12,
        label: "Find a stable frequency",
        instruction: "Tune the Core 12 times after accepting Helion's signal.",
        lore: "Each manual alignment gives Helion one instant of light the Tide cannot cancel.",
      },
      {
        kind: "tierPurchaseDelta",
        tierIndex: 0,
        target: 25,
        label: "Raise the beacon lattice",
        instruction: "Build 25 new Vacuum Taps.",
        lore: "The lattice repeats the same photon law until local space begins to believe it.",
      },
      {
        kind: "contributeFlux",
        target: 5_000,
        label: "Ignite the jump beacon",
        instruction: "Divert 5,000 Flux from the Foundry into Helion's beacon.",
        lore: "This Flux leaves your reserves permanently. What it buys is a route for millions of people.",
      },
    ],
    landingFlux: 100,
    rewardLabel: "Beacon Lens relic + Stellar Relay + 100-Flux landing cache",
    success:
      "Helion's first sunrise in eleven days reveals evacuation craft already climbing toward the Foundry's route.",
  },
  {
    world: "Pelagos",
    epithet: "The Ocean Habitats",
    title: "Return the oceans to the world",
    briefing:
      "Gravity is releasing Pelagos's seas into orbit. Build coils strong enough to tow the water home and hold an evacuation corridor open.",
    arrival:
      "Blue continents hang above Pelagos like broken moons. Habitat rings are disappearing beneath airborne tides.",
    hazardLabel: "Tidal shear",
    hazard:
      "Upper machines lose force against unstable gravity. Repair phases restore their mechanical leverage.",
    effects: {
      production: 1,
      manual: 0.95,
      machineCost: 1.04,
      researchCost: 1,
      higherTier: 0.72,
      resonance: 1,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 1,
        target: 10,
        label: "Assemble the gravity ferry",
        instruction: "Build 10 new Phase Coils.",
        lore: "Each coil gives the ferry a direction in a sky where down no longer exists.",
      },
      {
        kind: "researchDelta",
        target: 2,
        label: "Model the returning tide",
        instruction: "Purchase 2 new levels of Run Research.",
        lore: "The ferry cannot push an ocean. It must persuade gravity to remember the shore.",
      },
      {
        kind: "contributeFlux",
        target: 50_000,
        label: "Tow the oceans home",
        instruction: "Divert 50,000 Flux into the gravity corridor.",
        lore: "The corridor becomes a temporary law: water falls toward Pelagos, and nowhere else.",
      },
    ],
    landingFlux: 2_500,
    rewardLabel: "Gravity Keel relic + Stellar Relay + 2,500-Flux landing cache",
    success:
      "Pelagos receives rain from every direction for nine minutes. When it ends, the seas are home and the ferries are full.",
  },
  {
    world: "Cinderwake",
    epithet: "The Shielded Moon",
    title: "Synchronize the shields",
    briefing:
      "Phase-noise is desynchronizing Cinderwake's shield stations. The moon survives only if the fabrication chain can make separate machines agree.",
    arrival:
      "Cinderwake turns beneath a stuttering shield. Every missed beat lets another line of fire reach the surface.",
    hazardLabel: "Ash interference",
    hazard:
      "Resonance begins muffled by phase ash. Rebuilding the shield clears the signal one stage at a time.",
    effects: {
      production: 0.93,
      manual: 1,
      machineCost: 1,
      researchCost: 1,
      higherTier: 1,
      resonance: 0.55,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 2,
        target: 5,
        label: "Weave replacement shields",
        instruction: "Build 5 new Harmonic Looms.",
        lore: "The Looms turn shield timing into a physical fabric the Tide cannot desynchronize.",
      },
      {
        kind: "resonanceHold",
        requiredLevels: 2,
        target: 30,
        label: "Hold the harmonic chord",
        instruction: "Maintain 2 Resonance levels for 30 active seconds.",
        lore: "Agreement must last. A brief proof protects nothing from a patient universe.",
      },
      {
        kind: "contributeFlux",
        target: 2_500_000,
        label: "Seal the moon-wide grid",
        instruction: "Divert 2.5 million Flux into Cinderwake's shield network.",
        lore: "The final charge joins every station into one claim: this moon remains whole.",
      },
    ],
    landingFlux: 50_000,
    rewardLabel: "Shield Harmonic relic + Stellar Relay + 50,000-Flux landing cache",
    success:
      "The stations strike one impossible chord. Cinderwake's shield closes, and falling fire bends harmlessly around the moon.",
  },
  {
    world: "Ilyra",
    epithet: "The Crystal Cities",
    title: "Choose one city to become real",
    briefing:
      "Ilyra's crystal cities are splitting into mutually exclusive versions. Anchor one history before every version becomes equally unreal.",
    arrival:
      "A dozen Ilyras occupy the same orbit. Their distress calls disagree about which one transmitted first.",
    hazardLabel: "Refraction loss",
    hazard:
      "Higher fabrication tiers scatter across competing realities. Each repair phase brings more of the chain into one history.",
    effects: {
      production: 1,
      manual: 1,
      machineCost: 1,
      researchCost: 1.2,
      higherTier: 0.7,
      resonance: 1,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 3,
        target: 1,
        label: "Map the true orbit",
        instruction: "Build 1 new Orbit Array.",
        lore: "The Array finds the single Ilyra whose orbit still agrees with the rest of the system.",
      },
      {
        kind: "researchDelta",
        target: 3,
        label: "Collapse the false histories",
        instruction: "Purchase 3 new levels of Run Research.",
        lore: "The Foundry compares every city until only one causal history remains self-consistent.",
      },
      {
        kind: "contributeFlux",
        target: 100_000_000,
        label: "Power the transit prism",
        instruction: "Divert 100 million Flux into Ilyra's transit prism.",
        lore: "The prism does not move the population. It moves the definition of where they are.",
      },
    ],
    landingFlux: 2_000_000,
    rewardLabel: "Prismatic Index relic + Stellar Relay + 2-million-Flux landing cache",
    success:
      "The duplicate worlds fold into light. One Ilyra remains, carrying the memories of every city that might have been.",
  },
  {
    world: "Orison Prime",
    epithet: "The Last Garden",
    title: "Hold the final orbit",
    briefing:
      "Orison's orbital constant is changing. Anchor the last living seed archive before the garden world spirals into its sun.",
    arrival:
      "Orison is visibly falling. Forests bloom out of season as the star grows larger over every horizon.",
    hazardLabel: "Orbital drag",
    hazard:
      "The collapsing orbit drains output and raises construction strain. Every anchor phase buys the Foundry leverage.",
    effects: {
      production: 0.78,
      manual: 1,
      machineCost: 1.12,
      researchCost: 1,
      higherTier: 0.9,
      resonance: 1,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 4,
        target: 1,
        label: "Build the orbital anchor",
        instruction: "Build 1 new Axiom Engine.",
        lore: "The Engine asserts a value for distance and refuses to let the planet contradict it.",
      },
      {
        kind: "resonanceHold",
        requiredLevels: 5,
        target: 60,
        label: "Hold the garden in resonance",
        instruction: "Maintain 5 total Resonance levels for 60 active seconds.",
        lore: "A living planet is too complex for one machine. The entire chain must hold it together.",
      },
      {
        kind: "contributeFlux",
        target: 10_000_000_000,
        label: "Lift the seed archive",
        instruction: "Divert 10 billion Flux into Orison's orbital anchor.",
        lore: "The archive rises first. The Foundry is measured by what it chooses to carry.",
      },
    ],
    landingFlux: 100_000_000,
    rewardLabel: "Seed Archive relic + Stellar Relay + 100-million-Flux landing cache",
    success:
      "Orison climbs into a new orbit. Its seed vault joins the fleet carrying forests for worlds that do not exist yet.",
  },
  {
    world: "Vesper Ark",
    epithet: "The Exodus Fleet",
    title: "Prove a portable law",
    briefing:
      "Vesper must carry a proven law through a region where cause no longer reliably precedes effect. Build the full Foundry, then prove and seal reality.",
    arrival:
      "Vesper is a planet-sized ship facing a wall with no stars behind it. Billions wait inside an engine that cannot trust time.",
    hazardLabel: "Null drag",
    hazard:
      "The Tide attacks every layer of the economy. Completed launch phases and surviving relays steadily restore certainty.",
    effects: {
      production: 0.6,
      manual: 0.9,
      machineCost: 1.15,
      researchCost: 1.2,
      higherTier: 0.8,
      resonance: 0.8,
    },
    stages: [
      {
        kind: "tierPurchaseDelta",
        tierIndex: 5,
        target: 1,
        label: "Complete the Horizon Forge",
        instruction: "Build 1 new Horizon Forge.",
        lore: "For the first time, every layer of the Foundry is physically present in one place.",
      },
      {
        kind: "contributeFlux",
        target: 1_000_000_000_000,
        label: "Charge the ark's law chamber",
        instruction: "Divert 1 trillion Flux into Vesper's law chamber.",
        lore: "Vesper stores the work of an entire fabrication cycle as a question waiting for an answer.",
      },
      {
        kind: "recalibrateGain",
        target: 1,
        label: "Prove a portable reality",
        instruction: "Forge 1 new Axiom through Recalibration after this phase begins.",
        lore: "The forged Axiom opens the route. Vesper's rescue grant seals a second copy inside the ark so cause still follows effect after it crosses.",
      },
    ],
    landingFlux: 0,
    rewardAxioms: 1,
    rewardLabel: "1 bonus Axiom + final Stellar Relay + Concordance ending",
    success:
      "Vesper crosses the Null Tide carrying a pocket of reality large enough for every surviving world to follow.",
  },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const bounded = (value: number, fallback = 0, max = MAX_VALUE) => {
  if (Number.isNaN(value)) return fallback;
  if (!Number.isFinite(value)) return value > 0 ? max : fallback;
  return Math.min(max, Math.max(0, value));
};

const readNumber = (value: unknown, fallback = 0, max = MAX_VALUE) =>
  bounded(typeof value === "number" ? value : fallback, fallback, max);

const safeAdd = (left: number, right: number) =>
  bounded(left + right, 0, MAX_VALUE);

const safeMultiply = (left: number, right: number) =>
  bounded(left * right, 0, MAX_VALUE);

const safePower = (base: number, exponent: number) =>
  bounded(Math.pow(base, exponent), 0, MAX_VALUE);

const emptyMissionBaseline = (cycle = 1): MissionBaseline => ({
  manualPulses: 0,
  tierBought: GENERATORS.map(() => 0),
  researchLevels: 0,
  cycle,
  lifetimeAxioms: 0,
});

const getResearchLevelTotal = (state: GameState) =>
  state.runUpgrades.reduce((sum, level) => sum + level, 0);

const captureMissionBaseline = (state: GameState): MissionBaseline => ({
  manualPulses: state.manualPulses,
  tierBought: state.tiers.map((tier) => tier.bought),
  researchLevels: getResearchLevelTotal(state),
  cycle: state.cycle,
  lifetimeAxioms: state.lifetimeAxioms,
});

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    flux: 0,
    maxFlux: 0,
    runFlux: 0,
    allTimeFlux: 0,
    axioms: 0,
    lifetimeAxioms: 0,
    stellarRelays: 0,
    cycle: 1,
    tiers: GENERATORS.map(() => ({ amount: 0, bought: 0 })),
    runUpgrades: RUN_UPGRADES.map(() => 0),
    legacyUpgrades: LEGACY_UPGRADES.map(() => 0),
    missions: {
      schema: 3,
      currentIndex: 0,
      stageIndex: 0,
      statuses: MISSIONS.map((_, index) =>
        index === 0 ? "active" : "locked",
      ),
      worldsSaved: 0,
      awaitingAcknowledgement: false,
      holdTime: 0,
      contributedFlux: 0,
      baseline: emptyMissionBaseline(),
    },
    settings: {
      buyMode: "1",
      autoEnabled: false,
      autoUpgrades: false,
      autoTiers: GENERATORS.map(() => true),
      tutorialComplete: false,
    },
    manualPulses: 0,
    playTime: 0,
    runTime: 0,
    autoTimer: 0,
    startedAt: now,
    lastSaved: now,
  };
}

export function sanitizeGameState(value: unknown, now = Date.now()): GameState {
  const base = createInitialState(now);
  if (!isRecord(value)) return base;

  const rawTiers = Array.isArray(value.tiers) ? value.tiers : [];
  const rawRunUpgrades = Array.isArray(value.runUpgrades)
    ? value.runUpgrades
    : [];
  const rawLegacy = Array.isArray(value.legacyUpgrades)
    ? value.legacyUpgrades
    : [];
  const rawSettings = isRecord(value.settings) ? value.settings : {};
  const rawAutoTiers = Array.isArray(rawSettings.autoTiers)
    ? rawSettings.autoTiers
    : [];
  const rawMissions = isRecord(value.missions) ? value.missions : {};
  const rawMissionStatuses = Array.isArray(rawMissions.statuses)
    ? rawMissions.statuses
    : [];
  const rawBaseline = isRecord(rawMissions.baseline)
    ? rawMissions.baseline
    : {};
  const rawBaselineTiers = Array.isArray(rawBaseline.tierBought)
    ? rawBaseline.tierBought
    : [];
  const sourceVersion = Math.floor(readNumber(value.version, 1, SAVE_VERSION));
  const missionSchema = Math.floor(readNumber(rawMissions.schema, 0, 3));
  const hasExpandedCampaign = sourceVersion >= 3 && missionSchema >= 2;
  const expandedCampaignIndex = Math.min(
    MISSIONS.length,
    Math.floor(readNumber(rawMissions.currentIndex, 0, MISSIONS.length)),
  );
  const recoveredFinalAxiom =
    sourceVersion === 3 &&
    hasExpandedCampaign &&
    expandedCampaignIndex === MISSIONS.length &&
    rawMissionStatuses[MISSIONS.length - 1] === "lost"
      ? 1
      : 0;

  const tiers = GENERATORS.map((_, index) => {
    const raw = isRecord(rawTiers[index]) ? rawTiers[index] : {};
    const bought = Math.floor(readNumber(raw.bought, 0, 1_000_000_000));
    const amount = Math.max(bought, readNumber(raw.amount));
    return { amount, bought };
  });

  const runUpgrades = RUN_UPGRADES.map((upgrade, index) =>
    Math.min(
      upgrade.maxLevel,
      Math.floor(readNumber(rawRunUpgrades[index], 0, upgrade.maxLevel)),
    ),
  );
  const legacyUpgrades = LEGACY_UPGRADES.map((_, index) =>
    Math.floor(readNumber(rawLegacy[index], 0, 1_000)),
  );
  const flux = readNumber(value.flux);
  const maxFlux = Math.max(flux, readNumber(value.maxFlux));
  const runFlux = readNumber(value.runFlux);
  const allTimeFlux = Math.max(runFlux, readNumber(value.allTimeFlux));
  const savedAt = readNumber(value.lastSaved, now, now);
  const cycle = Math.max(1, Math.floor(readNumber(value.cycle, 1, 1e9)));
  const axioms =
    Math.floor(readNumber(value.axioms, 0, 1e15)) + recoveredFinalAxiom;
  const lifetimeAxioms =
    Math.floor(readNumber(value.lifetimeAxioms, 0, 1e15)) +
    recoveredFinalAxiom;
  const manualPulses = Math.floor(readNumber(value.manualPulses, 0, 1e15));
  const currentMissionIndex = hasExpandedCampaign
    ? expandedCampaignIndex
    : 0;
  const awaitingAcknowledgement =
    hasExpandedCampaign &&
    rawMissions.awaitingAcknowledgement === true &&
    currentMissionIndex < MISSIONS.length;
  const missionStatuses: MissionStatus[] = MISSIONS.map((_, index) => {
    if (index < currentMissionIndex) {
      return "saved";
    }
    if (index === currentMissionIndex) {
      return awaitingAcknowledgement ? "locked" : "active";
    }
    return "locked";
  });
  const savedWorlds = missionStatuses.filter(
    (status) => status === "saved",
  ).length;
  const activeStageCount =
    MISSIONS[currentMissionIndex]?.stages.length ?? 1;
  const stageIndex = hasExpandedCampaign
    ? Math.min(
        activeStageCount - 1,
        Math.floor(readNumber(rawMissions.stageIndex, 0, activeStageCount - 1)),
      )
    : 0;
  const baseline: MissionBaseline = hasExpandedCampaign
    ? {
        manualPulses: Math.floor(
          readNumber(rawBaseline.manualPulses, manualPulses, 1e15),
        ),
        tierBought: GENERATORS.map((_, index) =>
          Math.floor(
            readNumber(
              rawBaselineTiers[index],
              tiers[index].bought,
              1_000_000_000,
            ),
          ),
        ),
        researchLevels: Math.floor(
          readNumber(
            rawBaseline.researchLevels,
            runUpgrades.reduce((sum, level) => sum + level, 0),
            1_000,
          ),
        ),
        cycle: Math.max(
          1,
          Math.floor(readNumber(rawBaseline.cycle, cycle, 1e9)),
        ),
        lifetimeAxioms: Math.floor(
          readNumber(rawBaseline.lifetimeAxioms, lifetimeAxioms, 1e15),
        ),
      }
    : {
        manualPulses,
        tierBought: tiers.map((tier) => tier.bought),
        researchLevels: runUpgrades.reduce((sum, level) => sum + level, 0),
        cycle,
        lifetimeAxioms,
      };

  return {
    version: SAVE_VERSION,
    flux,
    maxFlux,
    runFlux,
    allTimeFlux,
    axioms,
    lifetimeAxioms,
    stellarRelays: savedWorlds,
    cycle,
    tiers,
    runUpgrades,
    legacyUpgrades,
    missions: {
      schema: 3,
      currentIndex: currentMissionIndex,
      stageIndex,
      statuses: missionStatuses,
      worldsSaved: savedWorlds,
      awaitingAcknowledgement,
      holdTime: hasExpandedCampaign
        ? readNumber(rawMissions.holdTime, 0, 1e9)
        : 0,
      contributedFlux: hasExpandedCampaign
        ? readNumber(rawMissions.contributedFlux)
        : 0,
      baseline,
    },
    settings: {
      buyMode:
        rawSettings.buyMode === "10" || rawSettings.buyMode === "max"
          ? rawSettings.buyMode
          : "1",
      autoEnabled: rawSettings.autoEnabled === true,
      autoUpgrades: rawSettings.autoUpgrades === true,
      autoTiers: GENERATORS.map(
        (_, index) => rawAutoTiers[index] !== false,
      ),
      tutorialComplete: rawSettings.tutorialComplete === true,
    },
    manualPulses,
    playTime: readNumber(value.playTime, 0, 1e12),
    runTime: readNumber(value.runTime, 0, 1e12),
    autoTimer: readNumber(value.autoTimer, 0, 60),
    startedAt: readNumber(value.startedAt, now, now),
    lastSaved: savedAt,
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    tiers: state.tiers.map((tier) => ({ ...tier })),
    runUpgrades: [...state.runUpgrades],
    legacyUpgrades: [...state.legacyUpgrades],
    missions: {
      ...state.missions,
      statuses: [...state.missions.statuses],
      baseline: {
        ...state.missions.baseline,
        tierBought: [...state.missions.baseline.tierBought],
      },
    },
    settings: {
      ...state.settings,
      autoTiers: [...state.settings.autoTiers],
    },
  };
}

export function getCampaignWorldIndex(state: GameState) {
  const rawIndex = state.missions.awaitingAcknowledgement
    ? state.missions.currentIndex - 1
    : state.missions.currentIndex;
  return Math.min(
    MISSIONS.length - 1,
    Math.max(0, Number.isFinite(rawIndex) ? Math.floor(rawIndex) : 0),
  );
}

export function getCampaignRelics(state: GameState) {
  const saved = (index: number) => state.missions.statuses[index] === "saved";
  return {
    manualMultiplier: saved(0) ? 1.1 : 1,
    phaseCoilMultiplier: saved(1) ? 1.08 : 1,
    resonanceBonus: saved(2) ? 0.005 : 0,
    researchCostMultiplier: saved(3) ? 0.95 : 1,
    seedTaps: saved(4) ? 5 : 0,
  };
}

export function getWorldEffects(state: GameState) {
  const mission = MISSIONS[getCampaignWorldIndex(state)] ?? MISSIONS[0];
  const stageCount = mission.stages.length;
  const repairProgress = state.missions.awaitingAcknowledgement
    ? 1
    : Math.min(
        1,
        (state.missions.stageIndex + state.stellarRelays * 0.2) /
          stageCount,
      );
  const restore = (startingValue: number) =>
    startingValue + (1 - startingValue) * repairProgress;

  return {
    worldIndex: getCampaignWorldIndex(state),
    repairProgress,
    production: restore(mission.effects.production),
    manual: restore(mission.effects.manual),
    machineCost: restore(mission.effects.machineCost),
    researchCost: restore(mission.effects.researchCost),
    higherTier: restore(mission.effects.higherTier),
    resonance: restore(mission.effects.resonance),
  };
}

export function isTierUnlocked(state: GameState, index: number) {
  return (
    index <= getCampaignWorldIndex(state) &&
    state.maxFlux >= GENERATORS[index].unlockAt
  );
}

export function getRunUpgradeCost(state: GameState, index: number) {
  const upgrade = RUN_UPGRADES[index];
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  return safeMultiply(
    safeMultiply(
      upgrade.baseCost,
      safePower(upgrade.growth, state.runUpgrades[index]),
    ),
    world.researchCost * relics.researchCostMultiplier,
  );
}

export function getLegacyUpgradeCost(state: GameState, index: number) {
  const level = state.legacyUpgrades[index];
  if (index === 0) return Math.ceil(safePower(2, level));
  if (index === 1) return Math.ceil(2 * safePower(3, level));
  return Math.ceil(3 * safePower(4, level));
}

export function getOfflineCapHours(state: GameState) {
  return Math.min(24, 8 + state.legacyUpgrades[1] * 2);
}

export function getResonanceDetails(state: GameState) {
  const links = GENERATORS.slice(0, -1).map((_, index) =>
    Math.min(
      4,
      Math.floor(
        Math.min(
          state.tiers[index].bought,
          state.tiers[index + 1].bought,
        ) / 15,
      ),
    ),
  );
  const levels = links.reduce((sum, level) => sum + level, 0);
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  const perLevel =
    (0.04 + state.runUpgrades[3] * 0.01 + relics.resonanceBonus) *
    world.resonance;
  const base = 1 + perLevel;
  return {
    links,
    levels,
    base,
    perLevel,
    multiplier: 1 + levels * perLevel,
  };
}

export function getMissionProgress(
  state: GameState,
  index = state.missions.currentIndex,
) {
  const mission = MISSIONS[index];
  if (!mission) return { value: 1, target: 1, ratio: 1 };

  if (index < state.missions.currentIndex) {
    return { value: 1, target: 1, ratio: 1 };
  }
  if (index > state.missions.currentIndex) {
    return { value: 0, target: 1, ratio: 0 };
  }

  const stage = mission.stages[state.missions.stageIndex] ?? mission.stages[0];
  let value = 0;
  switch (stage.kind) {
    case "pulseDelta":
      value = Math.max(
        0,
        state.manualPulses - state.missions.baseline.manualPulses,
      );
      break;
    case "tierPurchaseDelta":
      value = Math.max(
        0,
        state.tiers[stage.tierIndex].bought -
          state.missions.baseline.tierBought[stage.tierIndex],
      );
      break;
    case "researchDelta":
      value = Math.max(
        0,
        getResearchLevelTotal(state) -
          state.missions.baseline.researchLevels,
      );
      break;
    case "contributeFlux":
      value = state.missions.contributedFlux;
      break;
    case "resonanceHold":
      value = state.missions.holdTime;
      break;
    case "recalibrateGain":
      value =
        state.cycle > state.missions.baseline.cycle
          ? Math.max(
              0,
              state.lifetimeAxioms -
                state.missions.baseline.lifetimeAxioms,
            )
          : 0;
      break;
  }

  return {
    value,
    target: stage.target,
    ratio: Math.min(1, Math.max(0, value / stage.target)),
  };
}

export function getMissionStageProgress(
  state: GameState,
  stageIndex: number,
) {
  if (stageIndex < state.missions.stageIndex) {
    return { value: 1, target: 1, ratio: 1 };
  }
  if (stageIndex > state.missions.stageIndex) {
    return { value: 0, target: 1, ratio: 0 };
  }
  return getMissionProgress(state);
}

export function contributeToMission(state: GameState) {
  if (state.missions.awaitingAcknowledgement) return state;
  const mission = MISSIONS[state.missions.currentIndex];
  const stage = mission?.stages[state.missions.stageIndex];
  if (!stage || stage.kind !== "contributeFlux") return state;
  const remaining = Math.max(
    0,
    stage.target - state.missions.contributedFlux,
  );
  const contribution = Math.min(state.flux, remaining);
  if (contribution <= 0) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - contribution);
  next.missions.contributedFlux = safeAdd(
    next.missions.contributedFlux,
    contribution,
  );
  return next;
}

function advanceMission(state: GameState, elapsedSeconds: number) {
  if (!state.settings.tutorialComplete) return state;
  if (state.missions.awaitingAcknowledgement) return state;
  const index = state.missions.currentIndex;
  const mission = MISSIONS[index];
  if (!mission) return state;

  const stage = mission.stages[state.missions.stageIndex];
  if (!stage) return state;

  if (stage.kind === "resonanceHold") {
    if (getResonanceDetails(state).levels >= stage.requiredLevels) {
      state.missions.holdTime = Math.min(
        stage.target,
        state.missions.holdTime + elapsedSeconds,
      );
    } else {
      state.missions.holdTime = Math.max(
        0,
        state.missions.holdTime - elapsedSeconds * 0.35,
      );
    }
  }

  const progress = getMissionProgress(state, index);
  let outcome: "saved" | null = null;
  if (progress.value >= progress.target) {
    if (state.missions.stageIndex < mission.stages.length - 1) {
      state.missions.stageIndex += 1;
      state.missions.holdTime = 0;
      state.missions.contributedFlux = 0;
      state.missions.baseline = captureMissionBaseline(state);
      return state;
    }
    outcome = "saved";
    state.stellarRelays = Math.min(
      MISSIONS.length,
      state.stellarRelays + 1,
    );
    state.missions.worldsSaved += 1;
    if ("rewardAxioms" in mission) {
      state.axioms += mission.rewardAxioms;
      state.lifetimeAxioms += mission.rewardAxioms;
    }
  }

  if (outcome) {
    state.missions.statuses[index] = outcome;
    state.missions.currentIndex += 1;
    const nextMission = MISSIONS[state.missions.currentIndex];
    state.missions.stageIndex = 0;
    state.missions.awaitingAcknowledgement = Boolean(nextMission);
    state.missions.holdTime = 0;
    state.missions.contributedFlux = 0;
  }
  return state;
}

export function getProductionSnapshot(state: GameState) {
  const prestigeMultiplier =
    1 + 0.35 * Math.log2(1 + state.lifetimeAxioms);
  const legacyMultiplier =
    1 + 0.2 * Math.sqrt(state.legacyUpgrades[0]);
  const flowMultiplier = 1 + 0.25 * state.runUpgrades[1];
  const relayMultiplier = 1;
  const hazardShield = Math.min(0.1, state.stellarRelays * 0.02);
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  const globalMultiplier = safeMultiply(
    safeMultiply(
      safeMultiply(flowMultiplier, legacyMultiplier),
      prestigeMultiplier,
    ),
    world.production,
  );
  const resonance = getResonanceDetails(state);
  const higherTierMultiplier = 1 + 0.3 * state.runUpgrades[2];
  const unlockedTierCount = Math.max(1, getCampaignWorldIndex(state) + 1);
  const edgeGearing = safePower(
    higherTierMultiplier,
    1 / Math.max(1, unlockedTierCount - 1),
  );

  const tierOutputs = state.tiers.map((tier, index) => {
    if (index > world.worldIndex) return 0;
    const milestoneMultiplier = 1 + 0.5 * Math.floor(tier.bought / 25);
    const upperMultiplier =
      index === 0
        ? 1
        : edgeGearing *
          world.higherTier *
          (index === 1 ? relics.phaseCoilMultiplier : 1);
    const machineOutput = safeMultiply(
      safeMultiply(tier.amount, GENERATORS[index].rate),
      safeMultiply(milestoneMultiplier, upperMultiplier),
    );
    return index === 0
      ? safeMultiply(
          machineOutput,
          safeMultiply(globalMultiplier, resonance.multiplier),
        )
      : machineOutput;
  });

  return {
    fluxPerSecond: tierOutputs[0],
    tierOutputs,
    globalMultiplier,
    prestigeMultiplier,
    relayMultiplier,
    hazardShield,
    world,
    flowMultiplier,
    legacyMultiplier,
    higherTierMultiplier,
    edgeGearing,
    resonance,
  };
}

export function getManualGain(state: GameState) {
  const production = getProductionSnapshot(state).fluxPerSecond;
  const responsiveBase = 1 + Math.sqrt(production + 1) * 0.04;
  const world = getWorldEffects(state);
  const relics = getCampaignRelics(state);
  return safeMultiply(
    responsiveBase,
    safeMultiply(
      safePower(1.65, state.runUpgrades[0]),
      safeMultiply(
        1 + 0.12 * Math.sqrt(state.legacyUpgrades[0]),
        world.manual * relics.manualMultiplier,
      ),
    ),
  );
}

export function pulseCore(state: GameState) {
  const next = cloneGameState(state);
  const gain = getManualGain(next);
  next.flux = safeAdd(next.flux, gain);
  next.maxFlux = Math.max(next.maxFlux, next.flux);
  next.runFlux = safeAdd(next.runFlux, gain);
  next.allTimeFlux = safeAdd(next.allTimeFlux, gain);
  next.manualPulses += 1;
  return next;
}

export function getTierCost(
  state: GameState,
  index: number,
  quantity = 1,
) {
  if (quantity <= 0) return 0;
  const generator = GENERATORS[index];
  const priceDivider = 1 + 0.15 * Math.sqrt(state.legacyUpgrades[1]);
  const world = getWorldEffects(state);
  const nextPrice =
    safeMultiply(
      safeMultiply(
        generator.baseCost,
        safePower(generator.growth, state.tiers[index].bought),
      ),
      world.machineCost,
    ) / Math.max(1, priceDivider);
  const growthForQuantity = safePower(generator.growth, quantity);
  return bounded(
    nextPrice * ((growthForQuantity - 1) / (generator.growth - 1)),
  );
}

export function getMaxAffordableCount(state: GameState, index: number) {
  if (getTierCost(state, index, 1) > state.flux) return 0;
  let low = 1;
  let high = 2;
  const hardCap = 1_000_000;

  while (high < hardCap && getTierCost(state, index, high) <= state.flux) {
    low = high;
    high *= 2;
  }
  high = Math.min(high, hardCap);
  if (high === hardCap && getTierCost(state, index, high) <= state.flux) {
    return hardCap;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (getTierCost(state, index, middle) <= state.flux) low = middle;
    else high = middle;
  }
  return low;
}

export function getPurchaseQuantity(
  state: GameState,
  index: number,
  mode: PurchaseMode,
) {
  if (!isTierUnlocked(state, index)) return 0;
  if (mode === "max") return getMaxAffordableCount(state, index);
  const quantity = mode === "10" ? 10 : 1;
  return getTierCost(state, index, quantity) <= state.flux ? quantity : 0;
}

export function buyTier(
  state: GameState,
  index: number,
  mode: PurchaseMode,
) {
  const quantity = getPurchaseQuantity(state, index, mode);
  if (quantity <= 0) return state;
  const cost = getTierCost(state, index, quantity);
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - cost);
  next.tiers[index].amount = safeAdd(next.tiers[index].amount, quantity);
  next.tiers[index].bought += quantity;
  return next;
}

export function buyRunUpgrade(state: GameState, index: number) {
  const upgrade = RUN_UPGRADES[index];
  const level = state.runUpgrades[index];
  if (state.maxFlux < upgrade.revealAt) return state;
  if (level >= upgrade.maxLevel) return state;
  const cost = getRunUpgradeCost(state, index);
  if (cost > state.flux) return state;
  const next = cloneGameState(state);
  next.flux = Math.max(0, next.flux - cost);
  next.runUpgrades[index] += 1;
  return next;
}

export function buyLegacyUpgrade(state: GameState, index: number) {
  const cost = getLegacyUpgradeCost(state, index);
  if (cost > state.axioms) return state;
  const next = cloneGameState(state);
  next.axioms -= cost;
  next.legacyUpgrades[index] += 1;
  return next;
}

export function getRecalibrationGain(state: GameState) {
  if (state.runFlux < RECALIBRATION_THRESHOLD) return 0;
  return Math.max(
    1,
    Math.floor(
      safePower(state.runFlux / RECALIBRATION_THRESHOLD, 0.28),
    ),
  );
}

export function recalibrate(state: GameState, now = Date.now()) {
  const gain = getRecalibrationGain(state);
  if (gain < 1) return state;
  const fresh = createInitialState(now);
  fresh.axioms = state.axioms + gain;
  fresh.lifetimeAxioms = state.lifetimeAxioms + gain;
  fresh.stellarRelays = state.stellarRelays;
  fresh.cycle = state.cycle + 1;
  fresh.allTimeFlux = state.allTimeFlux;
  fresh.legacyUpgrades = [...state.legacyUpgrades];
  fresh.missions = {
    ...state.missions,
    statuses: [...state.missions.statuses],
    baseline: {
      ...state.missions.baseline,
      tierBought: [...state.missions.baseline.tierBought],
    },
  };
  fresh.settings = {
    ...state.settings,
    autoTiers: [...state.settings.autoTiers],
  };
  fresh.manualPulses = state.manualPulses;
  fresh.playTime = state.playTime;
  const relics = getCampaignRelics(state);
  fresh.tiers[0].amount = Math.min(
    25,
    state.legacyUpgrades[2] * 2 + relics.seedTaps,
  );
  return fresh;
}

function runAutomation(state: GameState) {
  let next = state;
  for (let index = GENERATORS.length - 1; index >= 0; index -= 1) {
    if (!next.settings.autoTiers[index]) continue;
    next = buyTier(next, index, "1");
  }
  if (next.lifetimeAxioms >= 3 && next.settings.autoUpgrades) {
    for (let index = 0; index < RUN_UPGRADES.length; index += 1) {
      next = buyRunUpgrade(next, index);
    }
  }
  return next;
}

export function simulateGame(
  state: GameState,
  elapsedSeconds: number,
  maxSteps = 240,
  advanceMissions = true,
) {
  const capSeconds = getOfflineCapHours(state) * 3_600;
  const seconds = Math.min(capSeconds, Math.max(0, elapsedSeconds));
  if (seconds <= 0) return state;

  const steps = Math.max(
    1,
    Math.min(maxSteps, Math.ceil(seconds / 0.1)),
  );
  const delta = seconds / steps;
  let next = cloneGameState(state);

  for (let step = 0; step < steps; step += 1) {
    const snapshot = getProductionSnapshot(next);
    const previousAmounts = next.tiers.map((tier) => tier.amount);
    const fluxGain = safeMultiply(snapshot.tierOutputs[0], delta);

    next.flux = safeAdd(next.flux, fluxGain);
    next.maxFlux = Math.max(next.maxFlux, next.flux);
    next.runFlux = safeAdd(next.runFlux, fluxGain);
    next.allTimeFlux = safeAdd(next.allTimeFlux, fluxGain);

    for (let index = 1; index < GENERATORS.length; index += 1) {
      const produced = safeMultiply(
        safeMultiply(
          previousAmounts[index],
          GENERATORS[index].rate,
        ),
        safeMultiply(
          snapshot.tierOutputs[index] /
            Math.max(
              1e-300,
              previousAmounts[index] * GENERATORS[index].rate,
            ),
          delta,
        ),
      );
      next.tiers[index - 1].amount = safeAdd(
        next.tiers[index - 1].amount,
        produced,
      );
    }

    next.playTime += delta;
    next.runTime += delta;

    if (advanceMissions) next = advanceMission(next, delta);

    if (next.lifetimeAxioms >= 1 && next.settings.autoEnabled) {
      next.autoTimer += delta;
      const passes = Math.min(8, Math.floor(next.autoTimer));
      if (passes > 0) {
        next.autoTimer %= 1;
        for (let pass = 0; pass < passes; pass += 1) {
          next = runAutomation(next);
        }
      }
    }
  }
  return next;
}

export function setBuyMode(state: GameState, mode: PurchaseMode) {
  const next = cloneGameState(state);
  next.settings.buyMode = mode;
  return next;
}

export function setTutorialComplete(state: GameState, complete: boolean) {
  const next = cloneGameState(state);
  next.settings.tutorialComplete = complete;
  return next;
}

export function acknowledgeNextMission(state: GameState) {
  if (!state.missions.awaitingAcknowledgement) return state;
  const next = cloneGameState(state);
  const resolvedIndex = Math.max(0, next.missions.currentIndex - 1);
  const resolvedMission = MISSIONS[resolvedIndex];
  const landingFlux = resolvedMission?.landingFlux ?? 0;

  next.flux = landingFlux;
  next.maxFlux = landingFlux;
  next.runFlux = 0;
  next.runTime = 0;
  next.autoTimer = 0;
  next.tiers = GENERATORS.map(() => ({ amount: 0, bought: 0 }));
  next.runUpgrades = RUN_UPGRADES.map(() => 0);
  const relics = getCampaignRelics(next);
  next.tiers[0].amount = Math.min(
    25,
    next.legacyUpgrades[2] * 2 + relics.seedTaps,
  );
  next.missions.awaitingAcknowledgement = false;
  next.missions.stageIndex = 0;
  next.missions.holdTime = 0;
  next.missions.contributedFlux = 0;
  if (MISSIONS[next.missions.currentIndex]) {
    next.missions.statuses[next.missions.currentIndex] = "active";
  }
  next.missions.baseline = captureMissionBaseline(next);
  return next;
}

export function setAutoEnabled(state: GameState, enabled: boolean) {
  const next = cloneGameState(state);
  next.settings.autoEnabled = enabled;
  return next;
}

export function setAutoUpgrades(state: GameState, enabled: boolean) {
  const next = cloneGameState(state);
  next.settings.autoUpgrades = enabled;
  return next;
}

export function setAutoTier(state: GameState, index: number, enabled: boolean) {
  const next = cloneGameState(state);
  next.settings.autoTiers[index] = enabled;
  return next;
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value) || value >= MAX_VALUE) return "1.00e280";
  if (value === 0) return "0";
  if (value < 0.01) return value.toExponential(2).replace("+", "");
  if (value < 1_000) {
    return value < 10
      ? value.toFixed(2).replace(/\.00$/, "")
      : value.toFixed(1).replace(/\.0$/, "");
  }
  const suffixes = ["K", "M", "B", "T", "Qa"];
  const exponent = Math.floor(Math.log10(value));
  const group = Math.floor(exponent / 3);
  if (group >= 1 && group <= suffixes.length) {
    return `${(value / Math.pow(1_000, group)).toFixed(2)}${suffixes[group - 1]}`;
  }
  return value.toExponential(2).replace("+", "");
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const remainder = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}
