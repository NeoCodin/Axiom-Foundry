export const SAVE_VERSION = 1;
export const SAVE_KEY = "axiom-foundry-save-v1";
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
};

export type GameState = {
  version: number;
  flux: number;
  maxFlux: number;
  runFlux: number;
  allTimeFlux: number;
  axioms: number;
  lifetimeAxioms: number;
  cycle: number;
  tiers: TierState[];
  runUpgrades: number[];
  legacyUpgrades: number[];
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
    growth: 1.15,
    rate: 1,
    unlockAt: 0,
  },
  {
    name: "Phase Coil",
    shortName: "Coil",
    description: "Winds phase pressure into new Vacuum Taps.",
    produces: "Vacuum Taps",
    baseCost: 150,
    growth: 1.18,
    rate: 0.2,
    unlockAt: 75,
  },
  {
    name: "Harmonic Loom",
    shortName: "Loom",
    description: "Weaves synchronized Phase Coils from standing waves.",
    produces: "Phase Coils",
    baseCost: 4_000,
    growth: 1.22,
    rate: 0.08,
    unlockAt: 2_500,
  },
  {
    name: "Orbit Array",
    shortName: "Array",
    description: "Assembles Harmonic Looms along a stable orbital track.",
    produces: "Harmonic Looms",
    baseCost: 200_000,
    growth: 1.28,
    rate: 0.03,
    unlockAt: 100_000,
  },
  {
    name: "Axiom Engine",
    shortName: "Engine",
    description: "Turns a proven law of motion into an endless assembly line.",
    produces: "Orbit Arrays",
    baseCost: 50_000_000,
    growth: 1.35,
    rate: 0.012,
    unlockAt: 20_000_000,
  },
  {
    name: "Horizon Forge",
    shortName: "Forge",
    description: "Builds Axiom Engines at the edge of measurable space.",
    produces: "Axiom Engines",
    baseCost: 500_000_000_000,
    growth: 1.45,
    rate: 0.005,
    unlockAt: 10_000_000_000,
  },
] as const;

export const RUN_UPGRADES = [
  {
    name: "Pulse Geometry",
    description: "Triple the Flux gained when you tune the core.",
    baseCost: 150,
    growth: 6,
    maxLevel: 6,
    revealAt: 30,
  },
  {
    name: "Flow Compression",
    description: "Multiply all machine output by 1.6.",
    baseCost: 2_500,
    growth: 10,
    maxLevel: 8,
    revealAt: 500,
  },
  {
    name: "Harmonic Gearing",
    description: "Double the output of Phase Coils and every higher tier.",
    baseCost: 100_000,
    growth: 15,
    maxLevel: 6,
    revealAt: 20_000,
  },
  {
    name: "Resonant Mesh",
    description: "Increase the multiplier granted by balanced machine pairs.",
    baseCost: 50_000_000,
    growth: 20,
    maxLevel: 4,
    revealAt: 10_000_000,
  },
] as const;

export const LEGACY_UPGRADES = [
  {
    name: "Axiom Amplifier",
    description: "Multiply all machine output by 1.5 per level.",
  },
  {
    name: "Precision Tooling",
    description: "Divide every machine price by 2 per level.",
  },
  {
    name: "Seed Mechanism",
    description: "Future cycles begin with 5 free Vacuum Taps per level.",
  },
] as const;

export const RECALIBRATION_THRESHOLD = 10_000_000_000;

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

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    flux: 0,
    maxFlux: 0,
    runFlux: 0,
    allTimeFlux: 0,
    axioms: 0,
    lifetimeAxioms: 0,
    cycle: 1,
    tiers: GENERATORS.map(() => ({ amount: 0, bought: 0 })),
    runUpgrades: RUN_UPGRADES.map(() => 0),
    legacyUpgrades: LEGACY_UPGRADES.map(() => 0),
    settings: {
      buyMode: "1",
      autoEnabled: false,
      autoUpgrades: false,
      autoTiers: GENERATORS.map(() => true),
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

  const tiers = GENERATORS.map((_, index) => {
    const raw = isRecord(rawTiers[index]) ? rawTiers[index] : {};
    const bought = Math.floor(readNumber(raw.bought, 0, 1_000_000_000));
    const amount = Math.max(bought, readNumber(raw.amount));
    return { amount, bought };
  });

  const flux = readNumber(value.flux);
  const maxFlux = Math.max(flux, readNumber(value.maxFlux));
  const runFlux = Math.max(maxFlux, readNumber(value.runFlux));
  const allTimeFlux = Math.max(runFlux, readNumber(value.allTimeFlux));
  const savedAt = readNumber(value.lastSaved, now, now);

  return {
    version: SAVE_VERSION,
    flux,
    maxFlux,
    runFlux,
    allTimeFlux,
    axioms: Math.floor(readNumber(value.axioms, 0, 1e15)),
    lifetimeAxioms: Math.floor(
      readNumber(value.lifetimeAxioms, 0, 1e15),
    ),
    cycle: Math.max(1, Math.floor(readNumber(value.cycle, 1, 1e9))),
    tiers,
    runUpgrades: RUN_UPGRADES.map((upgrade, index) =>
      Math.min(
        upgrade.maxLevel,
        Math.floor(readNumber(rawRunUpgrades[index], 0, upgrade.maxLevel)),
      ),
    ),
    legacyUpgrades: LEGACY_UPGRADES.map((_, index) =>
      Math.floor(readNumber(rawLegacy[index], 0, 1_000)),
    ),
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
    },
    manualPulses: Math.floor(readNumber(value.manualPulses, 0, 1e15)),
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
    settings: {
      ...state.settings,
      autoTiers: [...state.settings.autoTiers],
    },
  };
}

export function isTierUnlocked(state: GameState, index: number) {
  return state.maxFlux >= GENERATORS[index].unlockAt;
}

export function getRunUpgradeCost(state: GameState, index: number) {
  const upgrade = RUN_UPGRADES[index];
  return safeMultiply(
    upgrade.baseCost,
    safePower(upgrade.growth, state.runUpgrades[index]),
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
      5,
      Math.floor(
        Math.min(
          state.tiers[index].bought,
          state.tiers[index + 1].bought,
        ) / 10,
      ),
    ),
  );
  const levels = links.reduce((sum, level) => sum + level, 0);
  const base = 1.12 + state.runUpgrades[3] * 0.03;
  return { links, levels, base, multiplier: safePower(base, levels) };
}

export function getProductionSnapshot(state: GameState) {
  const prestigeMultiplier =
    1 + safePower(state.lifetimeAxioms, 0.65) * 0.5;
  const globalMultiplier = safeMultiply(
    safeMultiply(
      safePower(1.6, state.runUpgrades[1]),
      safePower(1.5, state.legacyUpgrades[0]),
    ),
    prestigeMultiplier,
  );
  const resonance = getResonanceDetails(state);
  const higherTierMultiplier = safePower(2, state.runUpgrades[2]);

  const tierOutputs = state.tiers.map((tier, index) => {
    const milestoneMultiplier = safePower(2, Math.floor(tier.bought / 10));
    const upperMultiplier = index === 0 ? 1 : higherTierMultiplier;
    return safeMultiply(
      safeMultiply(tier.amount, GENERATORS[index].rate),
      safeMultiply(
        milestoneMultiplier,
        safeMultiply(
          globalMultiplier,
          safeMultiply(resonance.multiplier, upperMultiplier),
        ),
      ),
    );
  });

  return {
    fluxPerSecond: tierOutputs[0],
    tierOutputs,
    globalMultiplier,
    prestigeMultiplier,
    higherTierMultiplier,
    resonance,
  };
}

export function getManualGain(state: GameState) {
  const production = getProductionSnapshot(state).fluxPerSecond;
  const responsiveBase = 1 + Math.sqrt(production + 1) * 0.08;
  return safeMultiply(
    responsiveBase,
    safeMultiply(
      safePower(3, state.runUpgrades[0]),
      safePower(1.25, state.legacyUpgrades[0]),
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
  const priceDivider = safePower(2, state.legacyUpgrades[1]);
  const nextPrice =
    safeMultiply(
      generator.baseCost,
      safePower(generator.growth, state.tiers[index].bought),
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
      safePower(state.runFlux / RECALIBRATION_THRESHOLD, 0.35),
    ),
  );
}

export function recalibrate(state: GameState, now = Date.now()) {
  const gain = getRecalibrationGain(state);
  if (gain < 1) return state;
  const fresh = createInitialState(now);
  fresh.axioms = state.axioms + gain;
  fresh.lifetimeAxioms = state.lifetimeAxioms + gain;
  fresh.cycle = state.cycle + 1;
  fresh.allTimeFlux = state.allTimeFlux;
  fresh.legacyUpgrades = [...state.legacyUpgrades];
  fresh.settings = {
    ...state.settings,
    autoTiers: [...state.settings.autoTiers],
  };
  fresh.manualPulses = state.manualPulses;
  fresh.playTime = state.playTime;
  fresh.tiers[0].amount = state.legacyUpgrades[2] * 5;
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
