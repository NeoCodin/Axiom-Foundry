import assert from "node:assert/strict";
import test from "node:test";

import {
  LIVING_FOUNDRY_SCHEMA,
  MAX_ROOM_LEVEL,
  ROOM_DEFINITIONS,
  advanceLivingFoundry,
  chooseDoctrine,
  cloneLivingFoundryState,
  createLivingFoundryState,
  getLivingFoundryBonuses,
  getRoomUpgradeCost,
  grantLivingFoundryRewards,
  renameFoundry,
  sanitizeLivingFoundryState,
  syncLivingFoundryState,
  upgradeRoom,
} from "../app/living-foundry-engine.ts";

test("a new Living Foundry contains only the physical Ark layer", () => {
  const state = createLivingFoundryState(0);
  assert.equal(state.schema, LIVING_FOUNDRY_SCHEMA);
  assert.equal(state.rooms.length, ROOM_DEFINITIONS.length);
  assert.equal(state.rooms.filter((room) => room.unlocked).length, 1);
  assert.equal(state.salvage, 35);
  assert.equal(state.cohesion, 50);
  assert.equal("crew" in state, false);
  assert.equal("activeExpedition" in state, false);
  assert.equal("expeditionHistory" in state, false);
});

test("world progress wakes canonical rooms without inventing a second crew roster", () => {
  const initial = createLivingFoundryState(0);
  const pelagos = syncLivingFoundryState(initial, 1);
  assert.ok(pelagos.rooms.filter((room) => room.unlocked).length > 1);
  const complete = syncLivingFoundryState(pelagos, 6);
  assert.equal(complete.rooms.every((room) => room.unlocked), true);
  assert.equal("crew" in complete, false);
});

test("sanitization retires old scripted crew and expedition fields safely", () => {
  const repaired = sanitizeLivingFoundryState(
    {
      schema: 1,
      foundryName: "  Wayfarer   Ark ",
      salvage: 90,
      cohesion: 61,
      rooms: [{ id: "axiom-chamber", level: 4 }],
      crew: [{ id: "mara-venn", unlocked: true, xp: 999_999 }],
      activeExpedition: { id: "kestrel", crewIds: ["mara-venn"] },
      expeditionHistory: { kestrel: 200 },
      discoveredLore: ["awakening.cold-wake", "awakening.cold-wake"],
    },
    0,
  );
  assert.equal(repaired.foundryName, "Wayfarer Ark");
  assert.equal(repaired.salvage, 90);
  assert.equal(repaired.cohesion, 61);
  assert.equal(repaired.rooms[0]?.level, 4);
  assert.deepEqual(repaired.discoveredLore, ["awakening.cold-wake"]);
  assert.equal("crew" in repaired, false);
  assert.equal("activeExpedition" in repaired, false);
});

test("room upgrades keep exact costs, caps, and immutable state", () => {
  let state = grantLivingFoundryRewards(createLivingFoundryState(0), { salvage: 100_000 });
  const roomId = "axiom-chamber" as const;
  const original = state;
  assert.equal(getRoomUpgradeCost(state, roomId), 30);
  state = upgradeRoom(state, roomId);
  assert.notEqual(state, original);
  assert.equal(state.rooms[0]?.level, 2);
  assert.equal(state.salvage, original.salvage - 30);
  while (state.rooms[0]!.level < MAX_ROOM_LEVEL) state = upgradeRoom(state, roomId);
  assert.equal(getRoomUpgradeCost(state, roomId), Number.POSITIVE_INFINITY);
  assert.equal(upgradeRoom(state, roomId), state);
});

test("physical-room bonuses remain bounded and positive", () => {
  const state = syncLivingFoundryState(createLivingFoundryState(0), 6);
  const bonuses = getLivingFoundryBonuses(state);
  assert.ok(bonuses.manualMultiplier >= 1 && bonuses.manualMultiplier <= 1.2);
  assert.ok(bonuses.productionMultiplier >= 1 && bonuses.productionMultiplier <= 1.25);
  assert.ok(bonuses.machineCostMultiplier >= 0.85 && bonuses.machineCostMultiplier <= 1);
  assert.ok(bonuses.researchCostMultiplier >= 0.85 && bonuses.researchCostMultiplier <= 1);
  assert.ok(bonuses.resonanceMultiplier >= 1 && bonuses.resonanceMultiplier <= 1.15);
});

test("idle advancement cannot mutate the physical Ark snapshot", () => {
  const state = createLivingFoundryState(3);
  const before = cloneLivingFoundryState(state);
  const advanced = advanceLivingFoundry(state, 7 * 24 * 60 * 60);
  assert.equal(advanced, state);
  assert.deepEqual(state, before);
});

test("external rewards are immutable, deduplicated, and capped", () => {
  const initial = createLivingFoundryState(1);
  const rewarded = grantLivingFoundryRewards(initial, {
    salvage: 1e20,
    loreIds: ["awakening.cold-wake", "awakening.cold-wake"],
    crewXp: 100_000,
  });
  assert.equal(initial.salvage, 35);
  assert.equal(rewarded.salvage, 1e12);
  assert.deepEqual(rewarded.discoveredLore, ["awakening.cold-wake"]);
  assert.equal("crew" in rewarded, false);
});

test("the Ark can be renamed and doctrine remains immutable", () => {
  const initial = createLivingFoundryState(0);
  const renamed = renameFoundry(initial, "   The   Quiet   Engine   ");
  assert.equal(renamed.foundryName, "The Quiet Engine");
  assert.equal(renameFoundry(renamed, "   "), renamed);
  const chosen = chooseDoctrine(renamed, "genesis");
  assert.equal(chosen.doctrine, "genesis");
  assert.equal(chooseDoctrine(chosen, "release"), chosen);
});
