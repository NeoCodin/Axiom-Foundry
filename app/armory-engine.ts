/**
 * The Ark Armory owns six standardized equipment frames. Stock is shared and
 * auto-issued; depth comes from global Mark projects, one fitted modification
 * per frame, and permanent Axiom laws rather than inventory micromanagement.
 */

import type { Survivor } from "./survivor-engine.ts";
import {
  getSurvivorBestSkillLevel,
  type SurvivorInjuryTier,
} from "./survivor-engine.ts";

export type ArmoryWeaponId = "kinetic-pike" | "arc-carbine" | "null-lance";
export type ArmoryArmorId = "composite-weave" | "reactive-shell" | "aegis-frame";
export type ArmoryItemId = ArmoryWeaponId | ArmoryArmorId;
export type ArmoryMark = 1 | 2 | 3 | 4;
export type ArmoryModificationId =
  | "stabilizer"
  | "overcharger"
  | "sensor-link"
  | "field-medic-kit";
export type ArmoryLawId =
  | "standardized-patterns"
  | "recursive-forging"
  | "resonant-munitions"
  | "impossible-materials";

export type ArmoryItemDefinition = {
  id: ArmoryItemId;
  kind: "weapon" | "armor";
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  wieldLevel: number;
  strengthBonus: number;
  damageMultiplier: number;
  worstInjury: SurvivorInjuryTier;
  durability: number;
  fluxCostBase: number;
  modelCost: number;
  nullTraceCost: number;
  requiredResearchId: string;
};

export const ARMORY_ITEM_DEFINITIONS: readonly ArmoryItemDefinition[] = [
  { id: "kinetic-pike", kind: "weapon", tier: 1, name: "Kinetic Pike", description: "A collapsible impulse staff: simple, dependable, and increasingly precise as its pattern matures.", wieldLevel: 2, strengthBonus: 2, damageMultiplier: 1, worstInjury: "severe", durability: 1, fluxCostBase: 800, modelCost: 40, nullTraceCost: 0, requiredResearchId: "expedition-armaments" },
  { id: "arc-carbine", kind: "weapon", tier: 2, name: "Arc Carbine", description: "A directed-discharge rifle tuned to the Ark's power signature and hostile machinery.", wieldLevel: 4, strengthBonus: 4, damageMultiplier: 1, worstInjury: "severe", durability: 1, fluxCostBase: 2_400, modelCost: 100, nullTraceCost: 0, requiredResearchId: "arc-discharge-weapons" },
  { id: "null-lance", kind: "weapon", tier: 3, name: "Null Lance", description: "A controlled edge of enforced absence. Powerful, scarce, and dangerous to misunderstand.", wieldLevel: 6, strengthBonus: 6, damageMultiplier: 1, worstInjury: "severe", durability: 1, fluxCostBase: 6_000, modelCost: 200, nullTraceCost: 40, requiredResearchId: "null-edge-armaments" },
  { id: "composite-weave", kind: "armor", tier: 1, name: "Composite Weave", description: "Flexible fabrication mesh for survey work, mobility, and survivable field mistakes.", wieldLevel: 1, strengthBonus: 0, damageMultiplier: 0.5, worstInjury: "major", durability: 1, fluxCostBase: 800, modelCost: 40, nullTraceCost: 0, requiredResearchId: "composite-plating" },
  { id: "reactive-shell", kind: "armor", tier: 2, name: "Reactive Shell", description: "Segmented plate that stiffens on impact and anchors difficult rescue operations.", wieldLevel: 3, strengthBonus: 0, damageMultiplier: 0.35, worstInjury: "major", durability: 2, fluxCostBase: 2_400, modelCost: 100, nullTraceCost: 0, requiredResearchId: "reactive-shell" },
  { id: "aegis-frame", kind: "armor", tier: 3, name: "Aegis Frame", description: "A powered exoframe built for Null exposure and the Ark's most dangerous deployments.", wieldLevel: 5, strengthBonus: 0, damageMultiplier: 0.2, worstInjury: "minor", durability: 3, fluxCostBase: 6_000, modelCost: 200, nullTraceCost: 40, requiredResearchId: "aegis-frame" },
] as const;

export const ARMORY_ITEM_IDS = ARMORY_ITEM_DEFINITIONS.map((item) => item.id) as readonly ArmoryItemId[];
export const ARMORY_REPAIR_COST_RATIO = 0.4;
export const MAX_ARMORY_STOCK = 200;

export const ARMORY_MODIFICATIONS: Readonly<Record<ArmoryModificationId, {
  name: string;
  description: string;
  kinds: readonly ("weapon" | "armor")[];
  requiredResearchId: string;
  salvageCost: number;
  schematicCost: number;
}>> = {
  stabilizer: { name: "Vector Stabilizer", description: "+1 weapon strength through repeatable accuracy.", kinds: ["weapon"], requiredResearchId: "arc-discharge-weapons", salvageCost: 45, schematicCost: 12 },
  overcharger: { name: "Unsafe Overcharger", description: "+2 weapon strength, but its carrier takes 15% more wound damage.", kinds: ["weapon"], requiredResearchId: "null-edge-armaments", salvageCost: 90, schematicCost: 28 },
  "sensor-link": { name: "Sensor Link", description: "Mission telemetry increases Salvage and Schematics recovered by 15%.", kinds: ["weapon", "armor"], requiredResearchId: "observer-recursion", salvageCost: 70, schematicCost: 20 },
  "field-medic-kit": { name: "Field Medic Kit", description: "Armor reduces a further 15% of expedition wound damage.", kinds: ["armor"], requiredResearchId: "clinical-commons", salvageCost: 55, schematicCost: 16 },
};

export const ARMORY_LAWS: Readonly<Record<ArmoryLawId, {
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  requiredResearchId: string;
}>> = {
  "standardized-patterns": { name: "Standardized Patterns", description: "Each level cuts Mark-project material costs by 10%.", maxLevel: 2, baseCost: 3, requiredResearchId: "pattern-architecture" },
  "recursive-forging": { name: "Recursive Forging", description: "Each level shortens Armory projects by 15%.", maxLevel: 3, baseCost: 3, requiredResearchId: "recursive-manufacturing" },
  "resonant-munitions": { name: "Resonant Munitions", description: "Veterans gain +1 weapon strength per law level.", maxLevel: 3, baseCost: 5, requiredResearchId: "resonant-weapon-dynamics" },
  "impossible-materials": { name: "Impossible Materials", description: "Authorizes extremely expensive Mark IV projects.", maxLevel: 1, baseCost: 8, requiredResearchId: "impossible-material-synthesis" },
};

export type ArmoryStock = Record<ArmoryItemId, number[]>;
export type ArmoryProject = { itemId: ArmoryItemId; targetMark: ArmoryMark; totalSeconds: number; remainingSeconds: number };
export type ArmoryState = {
  schema: number;
  stock: ArmoryStock;
  marks: Record<ArmoryItemId, ArmoryMark>;
  modifications: Record<ArmoryItemId, ArmoryModificationId | null>;
  laws: Record<ArmoryLawId, number>;
  activeProject: ArmoryProject | null;
};

export const ARMORY_SCHEMA = 2;
export const getArmoryItemDefinition = (itemId: ArmoryItemId) => ARMORY_ITEM_DEFINITIONS.find((item) => item.id === itemId)!;
const wholeCount = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(MAX_ARMORY_STOCK, Math.max(0, Math.floor(parsed))) : 0; };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const markValue = (value: unknown): ArmoryMark => Math.min(4, Math.max(1, Math.floor(Number(value) || 1))) as ArmoryMark;

const emptyStock = (): ArmoryStock => Object.fromEntries(ARMORY_ITEM_DEFINITIONS.map((item) => [item.id, Array.from({ length: item.durability + 4 }, () => 0)])) as ArmoryStock;
const baseMarks = () => Object.fromEntries(ARMORY_ITEM_IDS.map((id) => [id, 1])) as Record<ArmoryItemId, ArmoryMark>;
const baseMods = () => Object.fromEntries(ARMORY_ITEM_IDS.map((id) => [id, null])) as Record<ArmoryItemId, ArmoryModificationId | null>;
const baseLaws = (): Record<ArmoryLawId, number> => ({ "standardized-patterns": 0, "recursive-forging": 0, "resonant-munitions": 0, "impossible-materials": 0 });

export function createArmoryState(): ArmoryState { return { schema: ARMORY_SCHEMA, stock: emptyStock(), marks: baseMarks(), modifications: baseMods(), laws: baseLaws(), activeProject: null }; }
export function cloneArmoryState(state: ArmoryState): ArmoryState { return { ...state, stock: Object.fromEntries(ARMORY_ITEM_IDS.map((id) => [id, [...state.stock[id]]])) as ArmoryStock, marks: { ...state.marks }, modifications: { ...state.modifications }, laws: { ...state.laws }, activeProject: state.activeProject ? { ...state.activeProject } : null }; }

export function getEffectiveArmoryDurability(state: ArmoryState, itemId: ArmoryItemId) {
  const item = getArmoryItemDefinition(itemId);
  return item.kind === "armor" ? item.durability + state.marks[itemId] - 1 : 1;
}
export function getEffectiveWeaponStrength(state: ArmoryState, itemId: ArmoryWeaponId, carrierLevel = 0) {
  const item = getArmoryItemDefinition(itemId);
  const mod = state.modifications[itemId];
  const modificationBonus = mod === "stabilizer" ? 1 : mod === "overcharger" ? 2 : 0;
  const resonance = carrierLevel >= 4 ? state.laws["resonant-munitions"] : 0;
  return item.strengthBonus + state.marks[itemId] - 1 + modificationBonus + resonance;
}
export function getEffectiveArmorMultiplier(state: ArmoryState, itemId: ArmoryArmorId, weaponModification: ArmoryModificationId | null = null) {
  const item = getArmoryItemDefinition(itemId);
  const markFactor = 1 - (state.marks[itemId] - 1) * 0.1;
  const medicFactor = state.modifications[itemId] === "field-medic-kit" ? 0.85 : 1;
  const overchargeRisk = weaponModification === "overcharger" ? 1.15 : 1;
  return Math.max(0.1, item.damageMultiplier * markFactor * medicFactor * overchargeRisk);
}

export function sanitizeArmoryState(value: unknown): ArmoryState {
  const state = createArmoryState();
  if (!isRecord(value)) return state;
  if (isRecord(value.marks)) for (const id of ARMORY_ITEM_IDS) state.marks[id] = markValue(value.marks[id]);
  if (isRecord(value.modifications)) for (const id of ARMORY_ITEM_IDS) { const mod = value.modifications[id]; if (typeof mod === "string" && mod in ARMORY_MODIFICATIONS && ARMORY_MODIFICATIONS[mod as ArmoryModificationId].kinds.includes(getArmoryItemDefinition(id).kind)) state.modifications[id] = mod as ArmoryModificationId; }
  if (isRecord(value.laws)) for (const id of Object.keys(ARMORY_LAWS) as ArmoryLawId[]) state.laws[id] = Math.min(ARMORY_LAWS[id].maxLevel, Math.max(0, Math.floor(Number(value.laws[id]) || 0)));
  if (isRecord(value.stock)) for (const item of ARMORY_ITEM_DEFINITIONS) { const raw = value.stock[item.id]; if (!Array.isArray(raw)) continue; const limit = getEffectiveArmoryDurability(state, item.id); state.stock[item.id] = Array.from({ length: limit + 1 }, (_, slot) => wholeCount(raw[slot])); const overflow = raw.slice(limit + 1).reduce((sum, count) => sum + wholeCount(count), 0); state.stock[item.id][limit] = Math.min(MAX_ARMORY_STOCK, state.stock[item.id][limit] + overflow); }
  if (isRecord(value.activeProject) && ARMORY_ITEM_IDS.includes(value.activeProject.itemId as ArmoryItemId)) { const itemId = value.activeProject.itemId as ArmoryItemId; const targetMark = markValue(value.activeProject.targetMark); const totalSeconds = Math.max(60, Math.min(30 * 86_400, Number(value.activeProject.totalSeconds) || 60)); const remainingSeconds = Math.max(0, Math.min(totalSeconds, Number(value.activeProject.remainingSeconds) || 0)); if (targetMark === state.marks[itemId] + 1 && remainingSeconds > 0) state.activeProject = { itemId, targetMark, totalSeconds, remainingSeconds }; }
  return state;
}

export const getArmoryReadyCount = (state: ArmoryState, itemId: ArmoryItemId) => state.stock[itemId].reduce((total, count, slot) => slot >= 1 ? total + count : total, 0);
export const getArmoryDamagedCount = (state: ArmoryState, itemId: ArmoryItemId) => state.stock[itemId][0] ?? 0;
export function addArmoryItem(state: ArmoryState, itemId: ArmoryItemId) { const next = cloneArmoryState(state); const durability = getEffectiveArmoryDurability(next, itemId); while (next.stock[itemId].length <= durability) next.stock[itemId].push(0); next.stock[itemId][durability] = Math.min(MAX_ARMORY_STOCK, next.stock[itemId][durability] + 1); return next; }
export function repairArmoryItem(state: ArmoryState, itemId: ArmoryItemId) { if (getArmoryDamagedCount(state, itemId) <= 0) return state; const next = cloneArmoryState(state); const durability = getEffectiveArmoryDurability(next, itemId); next.stock[itemId][0] -= 1; next.stock[itemId][durability] = Math.min(MAX_ARMORY_STOCK, (next.stock[itemId][durability] ?? 0) + 1); return next; }

export function startArmoryProject(state: ArmoryState, itemId: ArmoryItemId, targetMark: ArmoryMark, totalSeconds: number) { if (state.activeProject || targetMark !== state.marks[itemId] + 1) return state; const next = cloneArmoryState(state); next.activeProject = { itemId, targetMark, totalSeconds, remainingSeconds: totalSeconds }; return next; }
export function advanceArmoryProject(state: ArmoryState, seconds: number) { if (!state.activeProject || seconds <= 0) return state; const next = cloneArmoryState(state); next.activeProject!.remainingSeconds = Math.max(0, next.activeProject!.remainingSeconds - seconds); if (next.activeProject!.remainingSeconds > 0) return next; const { itemId, targetMark } = next.activeProject!; const ready = getArmoryReadyCount(next, itemId); const damaged = getArmoryDamagedCount(next, itemId); next.marks[itemId] = targetMark; const durability = getEffectiveArmoryDurability(next, itemId); next.stock[itemId] = Array.from({ length: durability + 1 }, () => 0); next.stock[itemId][0] = damaged; next.stock[itemId][durability] = ready; next.activeProject = null; return next; }
export function setArmoryModification(state: ArmoryState, itemId: ArmoryItemId, modification: ArmoryModificationId | null) { if (modification && !ARMORY_MODIFICATIONS[modification].kinds.includes(getArmoryItemDefinition(itemId).kind)) return state; const next = cloneArmoryState(state); next.modifications[itemId] = modification; return next; }
export function buyArmoryLaw(state: ArmoryState, lawId: ArmoryLawId) { if (state.laws[lawId] >= ARMORY_LAWS[lawId].maxLevel) return state; const next = cloneArmoryState(state); next.laws[lawId] += 1; return next; }

export type ExpeditionLoadoutEntry = { crewId: string; weaponId: ArmoryWeaponId | null; armorId: ArmoryArmorId | null; armorDurability: number; weaponStrength: number; weaponModification: ArmoryModificationId | null; armorModification: ArmoryModificationId | null; armorDamageMultiplier: number };
export type LoadoutPlan = { state: ArmoryState; loadout: ExpeditionLoadoutEntry[]; strengthBonus: number };
const weaponDefinitions = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "weapon").sort((a, b) => b.strengthBonus - a.strengthBonus);
const armorDefinitions = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "armor").sort((a, b) => b.tier - a.tier);
function checkOutBest(state: ArmoryState, definitions: readonly ArmoryItemDefinition[], level: number): { itemId: ArmoryItemId; durability: number } | null { for (const item of definitions) { if (level < item.wieldLevel) continue; for (let slot = state.stock[item.id].length - 1; slot >= 1; slot -= 1) if (state.stock[item.id][slot] > 0) { state.stock[item.id][slot] -= 1; return { itemId: item.id, durability: slot }; } } return null; }
export function planExpeditionLoadout(state: ArmoryState, crew: readonly Survivor[]): LoadoutPlan { const next = cloneArmoryState(state); const ordered = [...crew].sort((a, b) => getSurvivorBestSkillLevel(b) - getSurvivorBestSkillLevel(a)); const entries = new Map<string, ExpeditionLoadoutEntry>(); let strengthBonus = 0; for (const member of ordered) { const level = getSurvivorBestSkillLevel(member); const weapon = checkOutBest(next, weaponDefinitions, level); const armor = checkOutBest(next, armorDefinitions, level); const weaponId = weapon?.itemId as ArmoryWeaponId | undefined; const armorId = armor?.itemId as ArmoryArmorId | undefined; const weaponModification = weaponId ? next.modifications[weaponId] : null; const armorModification = armorId ? next.modifications[armorId] : null; const weaponStrength = weaponId ? getEffectiveWeaponStrength(next, weaponId, level) : 0; strengthBonus += weaponStrength; entries.set(member.id, { crewId: member.id, weaponId: weaponId ?? null, armorId: armorId ?? null, armorDurability: armor?.durability ?? 0, weaponStrength, weaponModification, armorModification, armorDamageMultiplier: armorId ? getEffectiveArmorMultiplier(next, armorId, weaponModification) : (weaponModification === "overcharger" ? 1.15 : 1) }); } return { state: next, loadout: crew.map((member) => entries.get(member.id)!), strengthBonus }; }
export const getLoadoutStrengthBonus = (loadout: readonly ExpeditionLoadoutEntry[]) => loadout.reduce((total, entry) => total + entry.weaponStrength, 0);
export const getLoadoutRecoveryMultiplier = (loadout: readonly ExpeditionLoadoutEntry[]) => loadout.some((entry) => entry.weaponModification === "sensor-link" || entry.armorModification === "sensor-link") ? 1.15 : 1;
export function returnExpeditionGear(state: ArmoryState, loadout: readonly ExpeditionLoadoutEntry[], hitCrewIds: ReadonlySet<string>): ArmoryState { if (!loadout.length) return state; const next = cloneArmoryState(state); for (const entry of loadout) { if (entry.weaponId) { const slot = getEffectiveArmoryDurability(next, entry.weaponId); next.stock[entry.weaponId][slot] = Math.min(MAX_ARMORY_STOCK, (next.stock[entry.weaponId][slot] ?? 0) + 1); } if (entry.armorId) { const max = getEffectiveArmoryDurability(next, entry.armorId); const checkedOut = Math.min(max, Math.max(1, Math.floor(entry.armorDurability) || max)); const remaining = hitCrewIds.has(entry.crewId) ? checkedOut - 1 : checkedOut; next.stock[entry.armorId][Math.max(0, remaining)] = Math.min(MAX_ARMORY_STOCK, (next.stock[entry.armorId][Math.max(0, remaining)] ?? 0) + 1); } } return next; }
export const getEntryDamageMultiplier = (entry: ExpeditionLoadoutEntry | undefined) => entry?.armorDamageMultiplier ?? (entry?.weaponModification === "overcharger" ? 1.15 : 1);
export const getEntryWorstInjury = (entry: ExpeditionLoadoutEntry | undefined): SurvivorInjuryTier => entry?.armorId ? getArmoryItemDefinition(entry.armorId).worstInjury : "severe";
