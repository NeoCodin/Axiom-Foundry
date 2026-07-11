import assert from "node:assert/strict";
import test from "node:test";

import {
  CREW_DEFINITIONS,
  EXPEDITION_DEFINITIONS,
  MAX_CREW_LEVEL,
  MAX_ROOM_LEVEL,
  ROOM_DEFINITIONS,
  advanceLivingFoundry,
  assignCrew,
  chooseDoctrine,
  createLivingFoundryState,
  getAvailableExpeditions,
  getCrewDefinition,
  getExpeditionStatus,
  getLivingFoundryBonuses,
  getRoomSlotCapacity,
  getRoomUpgradeCost,
  grantLivingFoundryRewards,
  launchExpedition,
  renameCrew,
  renameFoundry,
  sanitizeLivingFoundryState,
  syncLivingFoundryState,
  upgradeRoom,
  type LivingFoundryState,
} from "../app/living-foundry-engine.ts";

const crewById = (state: LivingFoundryState, crewId: string) => {
  const crew = state.crew.find((candidate) => candidate.id === crewId);
  assert.ok(crew, `Expected crew member ${crewId}`);
  return crew;
};

const roomById = (
  state: LivingFoundryState,
  roomId: LivingFoundryState["rooms"][number]["id"],
) => {
  const room = state.rooms.find((candidate) => candidate.id === roomId);
  assert.ok(room, `Expected room ${roomId}`);
  return room;
};

test("a new Living Foundry has canonical rooms, crew, and neutral-positive state", () => {
  const state = createLivingFoundryState(0);

  assert.equal(state.rooms.length, ROOM_DEFINITIONS.length);
  assert.equal(state.crew.length, CREW_DEFINITIONS.length);
  assert.equal(state.salvage, 35);
  assert.ok(state.cohesion >= 50 && state.cohesion <= 100);
  assert.equal(state.doctrine, null);
  assert.equal(state.activeExpedition, null);
  assert.deepEqual(
    state.rooms.filter((room) => room.unlocked).map((room) => room.id),
    ["axiom-chamber"],
  );
  assert.deepEqual(
    state.crew.filter((crew) => crew.unlocked).map((crew) => crew.id),
    [],
  );
  for (const crew of state.crew) {
    const definition = getCrewDefinition(crew.id);
    assert.ok(definition);
    assert.equal(crew.callsign, definition.defaultCallsign);
    assert.equal(crew.level, 1);
    assert.equal(crew.xp, 0);
  }
});

test("sanitization repairs malformed resources, levels, identities, and lore", () => {
  const state = sanitizeLivingFoundryState(
    {
      foundryName: "   The    Long-Haul    Foundry   ",
      salvage: -500,
      cohesion: -30,
      doctrine: "not-a-doctrine",
      rooms: [
        { id: "axiom-chamber", level: 99 },
        { id: "recalibration-vault", level: 99 },
        { id: "invented-room", level: 99 },
      ],
      crew: [
        {
          id: "mara-venn",
          canonicalName: "Forged Identity",
          specialty: "navigation",
          callsign: "  Deep    Hammer  ",
          xp: 1e30,
          assignedRoomId: "invented-room",
        },
      ],
      discoveredLore: ["alpha", "alpha", 42, "beta"],
    },
    0,
  );

  assert.equal(state.foundryName, "The Long-Haul Foundry");
  assert.equal(state.salvage, 0);
  assert.ok(state.cohesion >= 50 && state.cohesion <= 100);
  assert.equal(state.doctrine, null);
  assert.equal(roomById(state, "axiom-chamber").level, MAX_ROOM_LEVEL);
  assert.equal(roomById(state, "recalibration-vault").level, 0);
  assert.equal(roomById(state, "recalibration-vault").unlocked, false);
  assert.equal(crewById(state, "mara-venn").callsign, "Deep Hammer");
  assert.equal(crewById(state, "mara-venn").assignedRoomId, null);
  assert.equal(crewById(state, "mara-venn").xp, 1e9);
  assert.equal(crewById(state, "mara-venn").level, MAX_CREW_LEVEL);
  assert.equal(getCrewDefinition("mara-venn")?.canonicalName, "Mara Venn");
  assert.deepEqual(state.discoveredLore, ["alpha", "beta"]);
});

test("sync wakes rooms while the obsolete scripted crew registry stays sealed", () => {
  let state = createLivingFoundryState(0);
  state = renameFoundry(state, "Wayfarer Foundry");

  const afterHelion = syncLivingFoundryState(state, 1);
  assert.equal(afterHelion.foundryName, "Wayfarer Foundry");
  assert.ok(afterHelion.crew.every((crew) => !crew.unlocked));
  assert.equal(roomById(afterHelion, "resonance-gallery").unlocked, true);
  assert.equal(roomById(afterHelion, "memory-archive").level, 1);
  assert.equal(roomById(afterHelion, "expedition-bay").unlocked, false);

  const complete = syncLivingFoundryState(afterHelion, 6);
  assert.ok(complete.rooms.every((room) => room.unlocked && room.level >= 1));
  assert.ok(complete.crew.every((crew) => !crew.unlocked));
});

test("room upgrades have exact escalating costs, a hard cap, and growing slots", () => {
  let state = grantLivingFoundryRewards(createLivingFoundryState(0), {
    salvage: 1_000_000,
  });
  const roomId = "axiom-chamber" as const;

  assert.equal(getRoomUpgradeCost(state, roomId), 30);
  assert.equal(getRoomSlotCapacity(roomById(state, roomId)), 1);

  state = upgradeRoom(state, roomId);
  assert.equal(roomById(state, roomId).level, 2);
  assert.equal(state.salvage, 1_000_035 - 30);
  assert.equal(getRoomUpgradeCost(state, roomId), 90);
  assert.equal(getRoomSlotCapacity(roomById(state, roomId)), 1);

  state = upgradeRoom(state, roomId);
  assert.equal(roomById(state, roomId).level, 3);
  assert.equal(getRoomSlotCapacity(roomById(state, roomId)), 2);
  state = upgradeRoom(state, roomId);
  assert.equal(getRoomSlotCapacity(roomById(state, roomId)), 2);
  state = upgradeRoom(state, roomId);
  assert.equal(roomById(state, roomId).level, MAX_ROOM_LEVEL);
  assert.equal(getRoomSlotCapacity(roomById(state, roomId)), 3);
  assert.equal(getRoomUpgradeCost(state, roomId), Number.POSITIVE_INFINITY);
  assert.equal(upgradeRoom(state, roomId), state);

  const locked = createLivingFoundryState(0);
  assert.equal(
    getRoomUpgradeCost(locked, "recalibration-vault"),
    Number.POSITIVE_INFINITY,
  );
  assert.equal(upgradeRoom(locked, "recalibration-vault"), locked);
});

test("the legacy scripted roster cannot create humans during Cold Wake", () => {
  const state = createLivingFoundryState(6);
  assert.ok(state.crew.every((crew) => !crew.unlocked));
  assert.equal(assignCrew(state, "mara-venn", "axiom-chamber"), state);
  assert.equal(assignCrew(state, "ivo-senn", "fabrication-floor"), state);
  assert.ok(state.crew.every((crew) => crew.assignedRoomId === null));
});

test("all Living Foundry bonuses remain neutral-or-positive and inside hard caps", () => {
  const state = createLivingFoundryState(6);
  state.cohesion = 100;
  for (const room of state.rooms) room.level = MAX_ROOM_LEVEL;
  for (const crew of state.crew) {
    crew.level = MAX_CREW_LEVEL;
    crew.xp = 1e9;
    crew.assignedRoomId = "axiom-chamber";
  }
  let bonuses = getLivingFoundryBonuses(state);
  assert.ok(bonuses.manualMultiplier >= 1 && bonuses.manualMultiplier <= 1.2);
  assert.ok(
    bonuses.productionMultiplier >= 1 && bonuses.productionMultiplier <= 1.25,
  );

  for (const roomId of [
    "fabrication-floor",
    "research-observatory",
    "resonance-gallery",
    "expedition-bay",
  ] as const) {
    for (const crew of state.crew) crew.assignedRoomId = roomId;
    bonuses = getLivingFoundryBonuses(state);
    assert.ok(
      bonuses.machineCostMultiplier >= 0.85 &&
        bonuses.machineCostMultiplier <= 1,
    );
    assert.ok(
      bonuses.researchCostMultiplier >= 0.85 &&
        bonuses.researchCostMultiplier <= 1,
    );
    assert.ok(
      bonuses.resonanceMultiplier >= 1 && bonuses.resonanceMultiplier <= 1.15,
    );
    assert.ok(
      bonuses.expeditionDurationMultiplier >= 0.75 &&
        bonuses.expeditionDurationMultiplier <= 1,
    );
    assert.ok(
      bonuses.expeditionRewardMultiplier >= 1 &&
        bonuses.expeditionRewardMultiplier <= 1.25,
    );
  }
});

test("Cohesion is positive-only across assignments, time, and malformed saves", () => {
  let state = createLivingFoundryState(1);
  const initialCohesion = state.cohesion;
  state = assignCrew(state, "mara-venn", "axiom-chamber");
  const staffedCohesion = state.cohesion;
  assert.ok(staffedCohesion >= initialCohesion);

  state = assignCrew(state, "mara-venn", null);
  assert.ok(state.cohesion >= staffedCohesion);
  const advanced = advanceLivingFoundry(state, 24 * 60 * 60);
  assert.ok(advanced.cohesion >= state.cohesion);

  const repaired = sanitizeLivingFoundryState({ cohesion: -10 }, 0);
  assert.ok(repaired.cohesion >= 50 && repaired.cohesion <= 100);
});

test("offline room advancement cannot invent or level sealed legacy crew", () => {
  const state = createLivingFoundryState(6);
  const offline = advanceLivingFoundry(state, 7 * 24 * 60 * 60);
  assert.ok(offline.crew.every((crew) => crew.xp === 0 && crew.level === 1));
  assert.ok(offline.crew.every((crew) => !crew.unlocked));
});

test("legacy expedition routes remain defined but cannot invent a crew manifest", () => {
  const beforeHangar = createLivingFoundryState(2);
  assert.deepEqual(getAvailableExpeditions(2), []);
  assert.equal(
    launchExpedition(beforeHangar, "kestrel", ["mara-venn"], 2, 1_000),
    beforeHangar,
  );

  const state = syncLivingFoundryState(beforeHangar, 3);
  assert.deepEqual(
    getAvailableExpeditions(3).map((expedition) => expedition.id),
    ["kestrel"],
  );
  assert.equal(launchExpedition(state, "kestrel", [], 3, 1_000), state);
  assert.equal(
    launchExpedition(state, "kestrel", ["cass-vey"], 3, 1_000),
    state,
  );

  assert.equal(
    launchExpedition(
      state,
      "kestrel",
      ["mara-venn", "ivo-senn", "cael-rook"],
      3,
      1_000,
    ),
    state,
  );
  assert.equal(getExpeditionStatus(state, 1_000).status, "idle");
});

test("all three archived expedition definitions retain their canonical durations", () => {
  const state = createLivingFoundryState(6);
  const expected = [
    ["kestrel", 10 * 60, "expedition.dead-relay"],
    ["lantern", 60 * 60, "expedition.null-bloom"],
    ["palimpsest", 4 * 60 * 60, "expedition.first-foundry"],
  ] as const;

  for (const [expeditionId, baseDuration, discoveryId] of expected) {
    assert.equal(
      EXPEDITION_DEFINITIONS.find((entry) => entry.id === expeditionId)
        ?.durationSeconds,
      baseDuration,
    );
    const launched = launchExpedition(
      state,
      expeditionId,
      ["mara-venn"],
      6,
      10_000,
    );
    assert.equal(launched, state);
    assert.equal(state.discoveredLore.includes(discoveryId), false);
  }
});

test("the Ark can be renamed while legacy crew identities stay sealed", () => {
  const initial = createLivingFoundryState(0);
  const foundry = renameFoundry(initial, "   The   Quiet   Engine   ");
  assert.equal(foundry.foundryName, "The Quiet Engine");
  assert.equal(initial.foundryName, "Axiom Foundry // Iteration 44");
  assert.equal(renameFoundry(foundry, "   "), foundry);

  const renamed = renameCrew(foundry, "mara-venn", "  Star   Hammer  ");
  assert.equal(renamed, foundry);
  assert.equal(getCrewDefinition("mara-venn")?.canonicalName, "Mara Venn");
});

test("external rewards are immutable, deduplicated, capped, and reach unlocked crew", () => {
  const initial = createLivingFoundryState(1);
  const rewarded = grantLivingFoundryRewards(initial, {
    salvage: Number.MAX_VALUE,
    loreIds: ["expedition.dead-relay", "expedition.dead-relay"],
    crewXp: 360,
  });

  assert.equal(initial.salvage, 35);
  assert.equal(rewarded.salvage, 1e12);
  assert.deepEqual(rewarded.discoveredLore, ["expedition.dead-relay"]);
  assert.ok(
    rewarded.crew
      .filter((crew) => crew.unlocked)
      .every((crew) => crew.xp === 360 && crew.level === 3),
  );
  assert.ok(
    rewarded.crew
      .filter((crew) => !crew.unlocked)
      .every((crew) => crew.xp === 0 && crew.level === 1),
  );
});

test("a doctrine is a valid, immutable, one-time choice", () => {
  const initial = createLivingFoundryState(6);
  const concordance = chooseDoctrine(initial, "concordance");
  assert.equal(initial.doctrine, null);
  assert.equal(concordance.doctrine, "concordance");
  assert.equal(chooseDoctrine(concordance, "release"), concordance);
  assert.equal(chooseDoctrine(initial, "invalid" as never), initial);
});
