/**
 * Armory (Expedition E2): tiered weapons and armor stocked as shared Ark
 * inventory. Every item is double-gated - a research project unlocks
 * fabrication, and a wield level (the survivor's best professional level)
 * decides who can carry it. Weapons add group strength; armor absorbs
 * expedition damage and loses durability doing it. Damaged armor is
 * repaired at the Foundry for a fraction of its price. Weapons never break.
 */

import type { Survivor } from "./survivor-engine.ts";
import {
  getSurvivorBestSkillLevel,
  type SurvivorInjuryTier,
} from "./survivor-engine.ts";

export type ArmoryWeaponId = "kinetic-pike" | "arc-carbine" | "null-lance";
export type ArmoryArmorId = "composite-weave" | "reactive-shell" | "aegis-frame";
export type ArmoryItemId = ArmoryWeaponId | ArmoryArmorId;

export type ArmoryItemDefinition = {
  id: ArmoryItemId;
  kind: "weapon" | "armor";
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  /** Minimum best-profession level required to carry the item. */
  wieldLevel: number;
  /** Weapons: group strength added per equipped member. */
  strengthBonus: number;
  /** Armor: multiplier applied to expedition damage taken while worn. */
  damageMultiplier: number;
  /** Armor: the worst permanent injury tier possible while worn. */
  worstInjury: SurvivorInjuryTier;
  /** Armor: hits absorbed before the piece is DAMAGED. Weapons never break. */
  durability: number;
  fluxCostBase: number; // x continuityScale at purchase
  modelCost: number;
  nullTraceCost: number;
  requiredResearchId: string;
};

export const ARMORY_ITEM_DEFINITIONS: readonly ArmoryItemDefinition[] = [
  {
    id: "kinetic-pike",
    kind: "weapon",
    tier: 1,
    name: "Kinetic Pike",
    description:
      "A collapsible impulse staff forged from salvage-grade alloy. Reliable in any hands past basic field training.",
    wieldLevel: 2,
    strengthBonus: 2,
    damageMultiplier: 1,
    worstInjury: "severe",
    durability: 1,
    fluxCostBase: 800,
    modelCost: 40,
    nullTraceCost: 0,
    requiredResearchId: "expedition-armaments",
  },
  {
    id: "arc-carbine",
    kind: "weapon",
    tier: 2,
    name: "Arc Carbine",
    description:
      "A directed-discharge rifle tuned to the Ark's power signature. Demands a practiced professional.",
    wieldLevel: 4,
    strengthBonus: 4,
    damageMultiplier: 1,
    worstInjury: "severe",
    durability: 1,
    fluxCostBase: 2_400,
    modelCost: 100,
    nullTraceCost: 0,
    requiredResearchId: "arc-discharge-weapons",
  },
  {
    id: "null-lance",
    kind: "weapon",
    tier: 3,
    name: "Null Lance",
    description:
      "Projects a blade of enforced absence. Only the Ark's most senior specialists keep their grip on it.",
    wieldLevel: 6,
    strengthBonus: 6,
    damageMultiplier: 1,
    worstInjury: "severe",
    durability: 1,
    fluxCostBase: 6_000,
    modelCost: 200,
    nullTraceCost: 40,
    requiredResearchId: "null-edge-armaments",
  },
  {
    id: "composite-weave",
    kind: "armor",
    tier: 1,
    name: "Composite Weave",
    description:
      "Layered fabrication mesh anyone can wear. Halves expedition wounds and gives out after one bad day.",
    wieldLevel: 1,
    strengthBonus: 0,
    damageMultiplier: 0.5,
    worstInjury: "major",
    durability: 1,
    fluxCostBase: 800,
    modelCost: 40,
    nullTraceCost: 0,
    requiredResearchId: "composite-plating",
  },
  {
    id: "reactive-shell",
    kind: "armor",
    tier: 2,
    name: "Reactive Shell",
    description:
      "Segmented plate that stiffens on impact. Sheds most of a hit and survives two before failing.",
    wieldLevel: 3,
    strengthBonus: 0,
    damageMultiplier: 0.35,
    worstInjury: "major",
    durability: 2,
    fluxCostBase: 2_400,
    modelCost: 100,
    nullTraceCost: 0,
    requiredResearchId: "reactive-shell",
  },
  {
    id: "aegis-frame",
    kind: "armor",
    tier: 3,
    name: "Aegis Frame",
    description:
      "A powered exoframe that takes the hit so its wearer barely notices. The worst it allows is a minor injury.",
    wieldLevel: 5,
    strengthBonus: 0,
    damageMultiplier: 0.2,
    worstInjury: "minor",
    durability: 3,
    fluxCostBase: 6_000,
    modelCost: 200,
    nullTraceCost: 40,
    requiredResearchId: "aegis-frame",
  },
] as const;

export const ARMORY_ITEM_IDS = ARMORY_ITEM_DEFINITIONS.map(
  (item) => item.id,
) as readonly ArmoryItemId[];

export const ARMORY_REPAIR_COST_RATIO = 0.4;
export const MAX_ARMORY_STOCK = 200;

/**
 * Per item: counts[0] is DAMAGED pieces awaiting repair; counts[d] for d >= 1
 * is pieces with d hits of durability remaining. A freshly crafted piece sits
 * at its definition durability.
 */
export type ArmoryStock = Record<ArmoryItemId, number[]>;

export type ArmoryState = {
  schema: number;
  stock: ArmoryStock;
};

export const ARMORY_SCHEMA = 1;

export const getArmoryItemDefinition = (itemId: ArmoryItemId) =>
  ARMORY_ITEM_DEFINITIONS.find((item) => item.id === itemId)!;

const emptyStock = (): ArmoryStock =>
  Object.fromEntries(
    ARMORY_ITEM_DEFINITIONS.map((item) => [
      item.id,
      Array.from({ length: item.durability + 1 }, () => 0),
    ]),
  ) as ArmoryStock;

const wholeCount = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(MAX_ARMORY_STOCK, Math.max(0, Math.floor(parsed)));
};

export function createArmoryState(): ArmoryState {
  return { schema: ARMORY_SCHEMA, stock: emptyStock() };
}

export function cloneArmoryState(state: ArmoryState): ArmoryState {
  return {
    ...state,
    stock: Object.fromEntries(
      ARMORY_ITEM_IDS.map((id) => [id, [...state.stock[id]]]),
    ) as ArmoryStock,
  };
}

export function sanitizeArmoryState(value: unknown): ArmoryState {
  const state = createArmoryState();
  if (typeof value !== "object" || value === null) return state;
  const rawStock = (value as { stock?: unknown }).stock;
  if (typeof rawStock !== "object" || rawStock === null) return state;
  for (const item of ARMORY_ITEM_DEFINITIONS) {
    const raw = (rawStock as Record<string, unknown>)[item.id];
    if (!Array.isArray(raw)) continue;
    for (let slot = 0; slot <= item.durability; slot += 1) {
      state.stock[item.id][slot] = wholeCount(raw[slot]);
    }
  }
  return state;
}

export const getArmoryReadyCount = (state: ArmoryState, itemId: ArmoryItemId) =>
  state.stock[itemId].reduce(
    (total, count, slot) => (slot >= 1 ? total + count : total),
    0,
  );

export const getArmoryDamagedCount = (
  state: ArmoryState,
  itemId: ArmoryItemId,
) => state.stock[itemId][0];

export function addArmoryItem(state: ArmoryState, itemId: ArmoryItemId) {
  const item = getArmoryItemDefinition(itemId);
  const next = cloneArmoryState(state);
  next.stock[itemId][item.durability] = Math.min(
    MAX_ARMORY_STOCK,
    next.stock[itemId][item.durability] + 1,
  );
  return next;
}

/** Repairs one DAMAGED piece back to full durability. */
export function repairArmoryItem(state: ArmoryState, itemId: ArmoryItemId) {
  if (state.stock[itemId][0] <= 0) return state;
  const item = getArmoryItemDefinition(itemId);
  const next = cloneArmoryState(state);
  next.stock[itemId][0] -= 1;
  next.stock[itemId][item.durability] = Math.min(
    MAX_ARMORY_STOCK,
    next.stock[itemId][item.durability] + 1,
  );
  return next;
}

export type ExpeditionLoadoutEntry = {
  crewId: string;
  weaponId: ArmoryWeaponId | null;
  armorId: ArmoryArmorId | null;
  /** Durability remaining on the checked-out armor piece. */
  armorDurability: number;
};

export type LoadoutPlan = {
  state: ArmoryState;
  loadout: ExpeditionLoadoutEntry[];
  strengthBonus: number;
};

const weaponDefinitionsByStrength = ARMORY_ITEM_DEFINITIONS.filter(
  (item) => item.kind === "weapon",
).sort((left, right) => right.strengthBonus - left.strengthBonus);

const armorDefinitionsByTier = ARMORY_ITEM_DEFINITIONS.filter(
  (item) => item.kind === "armor",
).sort((left, right) => right.tier - left.tier);

/** Checks out the toughest available piece, preferring intact durability. */
function checkOutBest(
  stock: ArmoryStock,
  definitions: readonly ArmoryItemDefinition[],
  level: number,
): { itemId: ArmoryItemId; durability: number } | null {
  for (const item of definitions) {
    if (level < item.wieldLevel) continue;
    for (let slot = item.durability; slot >= 1; slot -= 1) {
      if (stock[item.id][slot] > 0) {
        stock[item.id][slot] -= 1;
        return { itemId: item.id, durability: slot };
      }
    }
  }
  return null;
}

/**
 * Auto-equip: highest-level members outfit first, each taking the best
 * weapon and armor they are leveled to use. No micromanagement by design.
 */
export function planExpeditionLoadout(
  state: ArmoryState,
  crew: readonly Survivor[],
): LoadoutPlan {
  const next = cloneArmoryState(state);
  const ordered = [...crew].sort(
    (left, right) =>
      getSurvivorBestSkillLevel(right) - getSurvivorBestSkillLevel(left),
  );
  const entries = new Map<string, ExpeditionLoadoutEntry>();
  let strengthBonus = 0;
  for (const member of ordered) {
    const level = getSurvivorBestSkillLevel(member);
    const weapon = checkOutBest(next.stock, weaponDefinitionsByStrength, level);
    const armor = checkOutBest(next.stock, armorDefinitionsByTier, level);
    if (weapon) {
      strengthBonus += getArmoryItemDefinition(weapon.itemId).strengthBonus;
    }
    entries.set(member.id, {
      crewId: member.id,
      weaponId: (weapon?.itemId as ArmoryWeaponId | undefined) ?? null,
      armorId: (armor?.itemId as ArmoryArmorId | undefined) ?? null,
      armorDurability: armor?.durability ?? 0,
    });
  }
  // Preserve the caller's crew order in the returned loadout.
  const loadout = crew.map((member) => entries.get(member.id)!);
  return { state: next, loadout, strengthBonus };
}

export const getLoadoutStrengthBonus = (
  loadout: readonly ExpeditionLoadoutEntry[],
) =>
  loadout.reduce(
    (total, entry) =>
      total +
      (entry.weaponId
        ? getArmoryItemDefinition(entry.weaponId).strengthBonus
        : 0),
    0,
  );

/**
 * Returns checked-out gear to stock. Armor that absorbed a hit comes back
 * one durability lower (DAMAGED at zero); weapons always return intact.
 */
export function returnExpeditionGear(
  state: ArmoryState,
  loadout: readonly ExpeditionLoadoutEntry[],
  hitCrewIds: ReadonlySet<string>,
): ArmoryState {
  if (loadout.length === 0) return state;
  const next = cloneArmoryState(state);
  for (const entry of loadout) {
    if (entry.weaponId) {
      const weapon = getArmoryItemDefinition(entry.weaponId);
      next.stock[entry.weaponId][weapon.durability] = Math.min(
        MAX_ARMORY_STOCK,
        next.stock[entry.weaponId][weapon.durability] + 1,
      );
    }
    if (entry.armorId) {
      const item = getArmoryItemDefinition(entry.armorId);
      const checkedOut = Math.min(
        item.durability,
        Math.max(1, Math.floor(entry.armorDurability) || item.durability),
      );
      const remaining = hitCrewIds.has(entry.crewId)
        ? checkedOut - 1
        : checkedOut;
      next.stock[entry.armorId][Math.max(0, remaining)] = Math.min(
        MAX_ARMORY_STOCK,
        next.stock[entry.armorId][Math.max(0, remaining)] + 1,
      );
    }
  }
  return next;
}

/** Damage multiplier for a crew member given their loadout entry. */
export const getEntryDamageMultiplier = (
  entry: ExpeditionLoadoutEntry | undefined,
) =>
  entry?.armorId ? getArmoryItemDefinition(entry.armorId).damageMultiplier : 1;

/** Worst permanent-injury tier possible for a member given their armor. */
export const getEntryWorstInjury = (
  entry: ExpeditionLoadoutEntry | undefined,
): SurvivorInjuryTier =>
  entry?.armorId ? getArmoryItemDefinition(entry.armorId).worstInjury : "severe";
