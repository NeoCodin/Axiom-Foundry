import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_OFFLINE_SURVIVOR_SECONDS,
  PROFESSIONAL_ROLES,
  QUALITY_PITY_LIMIT,
  RARE_PITY_LIMIT,
  RARE_SURVIVOR_HOOKS,
  SOS_SCAN_SECONDS,
  advanceSurvivorSystem,
  assignSurvivorToRole,
  cancelSurvivorTraining,
  cloneSurvivorSystemState,
  createSurvivorSystemState,
  declineSurvivorSignal,
  getLifeSupportStatus,
  getPopulationExpertiseTotals,
  getPopulationRoleCounts,
  getRescueReadiness,
  getSurvivorLearningMultiplier,
  getSurvivorOnJobXpPerHour,
  getSurvivorRarity,
  getSurvivorRarityScore,
  getSurvivorSkillLevel,
  getSurvivorSkillProgress,
  getTrainingQuote,
  renameSurvivorCallsign,
  rescueSurvivorSignal,
  sanitizeSurvivorSystemState,
  setLifeSupportCapacity,
  setSosBeaconOnline,
  setTrainingSlots,
  startSurvivorTraining,
  transferSurvivorsToSettlement,
  type SurvivorSystemState,
} from "../app/survivor-engine.ts";

function detectSignal(seed = 123_456) {
  let state = createSurvivorSystemState(seed);
  state = setSosBeaconOnline(state, true, "pelagos");
  state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
  assert.ok(state.activeSignal);
  return state;
}

function supportPopulation(state: SurvivorSystemState, population = 100) {
  return setLifeSupportCapacity(state, {
    habitation: population,
    atmosphere: population,
    water: population,
    nutrition: population,
    medical: population,
  });
}

function stateWithCivilian() {
  return sanitizeSurvivorSystemState({
    rngState: 98_765,
    trainingSlots: 1,
    lifeSupport: {
      habitation: 4,
      atmosphere: 4,
      water: 4,
      nutrition: 4,
      medical: 4,
    },
    survivors: [
      {
        id: "pelagos-civilian",
        name: "Nia Vale",
        callsign: "",
        origin: "pelagos",
        backgroundId: "civic-volunteer",
        role: "civilian",
        aptitudes: { engineer: 5, teacher: 3 },
        adaptability: 5,
        traits: ["adaptable", "community-anchor"],
        skillXp: {},
        assignedRole: "civilian",
      },
    ],
  });
}

function survivorWithRarity(
  rarity: "standard" | "notable" | "exceptional" | "anomalous",
) {
  const survivor = structuredClone(stateWithCivilian().survivors[0]!);
  for (const role of PROFESSIONAL_ROLES) survivor.aptitudes[role] = 1;
  survivor.aptitudes.engineer = 5;
  survivor.adaptability = 1;
  survivor.traits = ["adaptable"];
  survivor.storyHookId = null;

  if (rarity === "notable") {
    survivor.aptitudes.doctor = 4;
    survivor.aptitudes.researcher = 2;
  } else if (rarity === "exceptional") {
    survivor.aptitudes.doctor = 5;
    survivor.aptitudes.researcher = 3;
  } else if (rarity === "anomalous") {
    survivor.storyHookId = "pelagos-cartographer";
  }

  assert.equal(getSurvivorRarity(survivor).id, rarity);
  return survivor;
}

test("a new Ark contains no humans and its persisted seed is deterministic", () => {
  const first = createSurvivorSystemState(42);
  const second = createSurvivorSystemState(42);

  assert.equal(first.survivors.length, 0);
  assert.equal(first.activeSignal, null);
  assert.equal(first.beaconOnline, false);
  assert.deepEqual(first.lifeSupport, {
    habitation: 0,
    atmosphere: 0,
    water: 0,
    nutrition: 0,
    medical: 0,
  });
  assert.deepEqual(first, second);
});

test("the SOS beacon requires a planetary orbit and scans before signaling", () => {
  const initial = createSurvivorSystemState(7);
  assert.equal(setSosBeaconOnline(initial, true, "cold-wake"), initial);
  assert.equal(
    setSosBeaconOnline(initial, true, "viridia").beaconWorldId,
    "viridia",
  );

  let state = setSosBeaconOnline(initial, true, "pelagos");
  assert.notEqual(state, initial);
  state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS - 1);
  assert.equal(state.activeSignal, null);
  assert.equal(state.beaconProgressSeconds, SOS_SCAN_SECONDS - 1);

  state = advanceSurvivorSystem(state, 1);
  assert.ok(state.activeSignal);
  assert.equal(state.beaconProgressSeconds, 0);
  assert.equal(state.signalsGenerated, 1);
});

test("procedural groups are reproducible and contain readable survivor detail", () => {
  const first = detectSignal(543_210);
  const second = detectSignal(543_210);
  const signal = first.activeSignal!;

  assert.deepEqual(first.activeSignal, second.activeSignal);
  assert.ok(signal.survivors.length >= 2 && signal.survivors.length <= 4);
  assert.ok(signal.rescueCost > 0);
  assert.match(signal.sourceLabel, /\S/);
  assert.equal(signal.survivors[0]?.role, "engineer");
  for (const survivor of signal.survivors) {
    assert.match(survivor.name, /^\S.+\s\S/);
    assert.ok(survivor.backgroundId);
    assert.ok(survivor.traits.length >= 1);
    assert.ok(
      PROFESSIONAL_ROLES.every(
        (role) =>
          survivor.aptitudes[role] >= 1 && survivor.aptitudes[role] <= 5,
      ),
    );
  }
});

test("each campaign world uses its exact SOS group-size range", () => {
  const worlds = [
    ["pelagos", [2, 3, 4]],
    ["viridia", [3, 4, 5]],
    ["cinder", [4, 5, 6]],
    ["nox", [5, 6, 7]],
    ["vesper", [6, 7, 8]],
  ] as const;
  const seeds = [2_654_435_761, 1_013_904_226, 3_668_339_987] as const;

  for (const [worldId, expectedSizes] of worlds) {
    const sizes = seeds.map((seed) => {
      let state = createSurvivorSystemState(seed);
      state = setSosBeaconOnline(state, true, worldId);
      state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
      assert.ok(state.activeSignal);
      return state.activeSignal.survivors.length;
    });
    assert.deepEqual(sizes, expectedSizes, worldId);
  }
});

test("profile rarity is deterministic, readable, and independent of training progress", () => {
  const survivor = structuredClone(stateWithCivilian().survivors[0]!);
  for (const role of PROFESSIONAL_ROLES) survivor.aptitudes[role] = 1;
  survivor.adaptability = 1;
  survivor.traits = ["adaptable"];
  survivor.storyHookId = null;

  assert.equal(getSurvivorRarityScore(survivor), 6);
  assert.equal(getSurvivorRarity(survivor).id, "standard");

  survivor.aptitudes.engineer = 5;
  survivor.aptitudes.doctor = 4;
  survivor.aptitudes.researcher = 2;
  assert.equal(getSurvivorRarityScore(survivor), 25);
  assert.equal(getSurvivorRarity(survivor).id, "notable");

  survivor.aptitudes.doctor = 5;
  survivor.aptitudes.researcher = 3;
  assert.equal(getSurvivorRarityScore(survivor), 28);
  assert.equal(getSurvivorRarity(survivor).id, "exceptional");

  const beforeTraining = getSurvivorRarity(survivor);
  survivor.role = "engineer";
  survivor.skillXp.engineer = 1_000_000;
  survivor.assignedRole = "engineer";
  assert.deepEqual(getSurvivorRarity(survivor), beforeTraining);

  survivor.storyHookId = "pelagos-cartographer";
  assert.equal(getSurvivorRarity(survivor).id, "anomalous");
});

test("rarity grants the exact advertised learning multipliers", () => {
  assert.equal(getSurvivorLearningMultiplier(survivorWithRarity("standard")), 1);
  assert.equal(getSurvivorLearningMultiplier(survivorWithRarity("notable")), 1.25);
  assert.equal(
    getSurvivorLearningMultiplier(survivorWithRarity("exceptional")),
    1.6,
  );
  assert.equal(getSurvivorLearningMultiplier(survivorWithRarity("anomalous")), 2);
});

test("higher rarity shortens equal-aptitude training and accelerates job XP", () => {
  const standard = survivorWithRarity("standard");
  const exceptional = survivorWithRarity("exceptional");
  assert.equal(standard.aptitudes.engineer, exceptional.aptitudes.engineer);

  const standardTraining = getTrainingQuote(standard, "engineer");
  const exceptionalTraining = getTrainingQuote(exceptional, "engineer");
  assert.ok(exceptionalTraining.durationSeconds < standardTraining.durationSeconds);

  const standardJobXp = getSurvivorOnJobXpPerHour(standard, "engineer");
  const exceptionalJobXp = getSurvivorOnJobXpPerHour(
    exceptional,
    "engineer",
  );
  assert.ok(exceptionalJobXp > standardJobXp);
  assert.ok(Math.abs(exceptionalJobXp / standardJobXp - 1.6) < 1e-12);
});

test("a detected survivor signal waits indefinitely without failure or replacement", () => {
  const state = detectSignal(8_008);
  const waitingSignal = structuredClone(state.activeSignal);
  const afterMonth = advanceSurvivorSystem(
    state,
    MAX_OFFLINE_SURVIVOR_SECONDS * 20,
  );

  assert.deepEqual(afterMonth.activeSignal, waitingSignal);
  assert.equal(afterMonth.signalsGenerated, 1);
  assert.equal(afterMonth.signalsResolved, 0);
  assert.equal(state.operationalSeconds, SOS_SCAN_SECONDS);
});

test("rescue requires both stable Ark capacity and enough external Salvage", () => {
  let state = detectSignal(2_024);
  const groupSize = state.activeSignal!.survivors.length;
  let readiness = getRescueReadiness(state, Number.MAX_SAFE_INTEGER);
  assert.equal(readiness.canRescue, false);
  assert.equal(readiness.reason, "life-support");
  assert.ok(readiness.lifeSupport.shortages.habitation >= groupSize);

  state = supportPopulation(state, groupSize);
  readiness = getRescueReadiness(state, 0);
  assert.equal(readiness.canRescue, false);
  assert.equal(readiness.reason, "salvage");

  readiness = getRescueReadiness(state, state.activeSignal!.rescueCost);
  assert.equal(readiness.canRescue, true);
  assert.equal(readiness.reason, null);
  assert.equal(readiness.lifeSupport.stable, true);
});

test("capacity multipliers agree between rescue readiness and the rescue action", () => {
  const detected = detectSignal(3_030);
  const groupSize = detected.activeSignal!.survivors.length;
  const state = supportPopulation(detected, Math.ceil(groupSize / 2));
  const salvage = state.activeSignal!.rescueCost;

  assert.equal(getRescueReadiness(state, salvage).reason, "life-support");
  const boostedReadiness = getRescueReadiness(state, salvage, 2);
  assert.equal(boostedReadiness.canRescue, true);
  assert.equal(boostedReadiness.lifeSupport.stable, true);

  const unboostedRescue = rescueSurvivorSignal(state, salvage);
  assert.equal(unboostedRescue.rescued, false);
  assert.equal(unboostedRescue.reason, "life-support");
  const boostedRescue = rescueSurvivorSignal(state, salvage, 2);
  assert.equal(boostedRescue.rescued, true);
  assert.equal(boostedRescue.state.survivors.length, groupSize);
  assert.equal(boostedRescue.salvageSpent, salvage);
});

test("rescue is immutable, charges its exact quote, and moves the whole group aboard", () => {
  const state = supportPopulation(detectSignal(4_040), 20);
  const original = cloneSurvivorSystemState(state);
  const expectedIds = state.activeSignal!.survivors.map((survivor) => survivor.id);
  const expectedCost = state.activeSignal!.rescueCost;
  const result = rescueSurvivorSignal(state, expectedCost + 500);

  assert.equal(result.rescued, true);
  assert.equal(result.salvageSpent, expectedCost);
  assert.deepEqual(result.survivorIds, expectedIds);
  assert.equal(result.state.survivors.length, expectedIds.length);
  assert.equal(result.state.activeSignal, null);
  assert.equal(result.state.signalsResolved, 1);
  assert.deepEqual(state, original);

  const noSecondReward = rescueSurvivorSignal(result.state, 1_000_000);
  assert.equal(noSecondReward.rescued, false);
  assert.equal(noSecondReward.salvageSpent, 0);
  assert.equal(noSecondReward.state, result.state);
});

test("insufficient support pauses recruitment but never harms an existing population", () => {
  let state = supportPopulation(detectSignal(1_515), 20);
  state = rescueSurvivorSignal(state, 1_000_000).state;
  const populationBefore = structuredClone(state.survivors);

  state = setLifeSupportCapacity(state, {
    habitation: 0,
    atmosphere: 0,
    water: 0,
    nutrition: 0,
    medical: 0,
  });
  assert.equal(getLifeSupportStatus(state).stable, false);
  const afterOffline = advanceSurvivorSystem(state, 365 * 24 * 60 * 60);

  assert.deepEqual(afterOffline.survivors, populationBefore);
  assert.equal(afterOffline.survivors.length, populationBefore.length);
});

test("the specialist rotation guarantees every profession within nine signals", () => {
  let state = setSosBeaconOnline(
    createSurvivorSystemState(707_707),
    true,
    "pelagos",
  );
  const seen = new Set<string>();
  for (let index = 0; index < PROFESSIONAL_ROLES.length; index += 1) {
    state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
    assert.ok(state.activeSignal);
    for (const survivor of state.activeSignal.survivors) seen.add(survivor.role);
    state = declineSurvivorSignal(state);
  }

  assert.ok(PROFESSIONAL_ROLES.every((role) => seen.has(role)));
  assert.equal(state.survivors.length, 0);
  assert.equal(state.signalsResolved, PROFESSIONAL_ROLES.length);
});

test("rare authored story hooks have a hard pity guarantee", () => {
  let state = setSosBeaconOnline(
    createSurvivorSystemState(909_909),
    true,
    "pelagos",
  );
  let discoveredHook: string | null = null;
  for (let index = 0; index <= RARE_PITY_LIMIT; index += 1) {
    state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
    discoveredHook =
      state.activeSignal!.survivors.find(
        (survivor) => survivor.storyHookId !== null,
      )?.storyHookId ?? null;
    if (discoveredHook) break;
    state = declineSurvivorSignal(state);
  }

  assert.ok(discoveredHook);
  assert.ok(RARE_SURVIVOR_HOOKS.some((hook) => hook.id === discoveredHook));
});

test("an Exceptional-or-better profile appears within the quality pity limit", () => {
  let state = setSosBeaconOnline(
    createSurvivorSystemState(3_668_339_987),
    true,
    "pelagos",
  );
  let qualitySignal = 0;
  for (let signalNumber = 1; signalNumber <= QUALITY_PITY_LIMIT; signalNumber += 1) {
    state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
    assert.ok(state.activeSignal);
    const includesQualityProfile = state.activeSignal.survivors.some(
      (survivor) => {
        const rarity = getSurvivorRarity(survivor).id;
        return rarity === "exceptional" || rarity === "anomalous";
      },
    );
    if (includesQualityProfile) {
      qualitySignal = signalNumber;
      break;
    }
    state = declineSurvivorSignal(state);
  }

  assert.ok(qualitySignal > 0 && qualitySignal <= QUALITY_PITY_LIMIT);

  let brink = createSurvivorSystemState(17_171);
  brink.qualityPity = QUALITY_PITY_LIMIT - 1;
  brink = setSosBeaconOnline(brink, true, "pelagos");
  brink = advanceSurvivorSystem(brink, SOS_SCAN_SECONDS);
  assert.ok(
    brink.activeSignal?.survivors.some((survivor) => {
      const rarity = getSurvivorRarity(survivor).id;
      return rarity === "exceptional" || rarity === "anomalous";
    }),
  );
});

test("civilians are flexible recruits whose adaptability shortens training", () => {
  const state = stateWithCivilian();
  const civilian = state.survivors[0]!;
  const civilianQuote = getTrainingQuote(civilian, "engineer");
  const professionalVersion = {
    ...civilian,
    role: "teacher" as const,
  };
  const professionalQuote = getTrainingQuote(professionalVersion, "engineer");

  assert.equal(civilian.role, "civilian");
  assert.equal(civilian.adaptability, 5);
  assert.ok(civilianQuote.civilianAcceleration < 1);
  assert.ok(civilianQuote.durationSeconds < professionalQuote.durationSeconds);
});

test("training advances offline, completes a profession, and preserves prior state", () => {
  const initial = stateWithCivilian();
  const civilian = initial.survivors[0]!;
  const quote = getTrainingQuote(civilian, "engineer");
  let state = startSurvivorTraining(initial, civilian.id, "engineer");

  assert.notEqual(state, initial);
  assert.equal(initial.training.length, 0);
  assert.equal(state.training.length, 1);
  assert.equal(state.survivors[0]?.assignedRole, null);

  state = advanceSurvivorSystem(state, quote.durationSeconds - 1);
  assert.equal(state.training.length, 1);
  assert.equal(state.survivors[0]?.role, "civilian");
  state = advanceSurvivorSystem(state, 1);
  assert.equal(state.training.length, 0);
  assert.equal(state.survivors[0]?.role, "engineer");
  assert.equal(state.completedTrainings, 1);
  assert.ok(getSurvivorSkillLevel(state.survivors[0]!, "engineer") >= 1);
});

test("skill progress reports exact level thresholds and max-level state", () => {
  const survivor = survivorWithRarity("standard");
  survivor.role = "civilian";
  survivor.skillXp.engineer = 0;
  assert.deepEqual(getSurvivorSkillProgress(survivor, "engineer"), {
    level: 0,
    xp: 0,
    levelStartXp: 0,
    nextLevelXp: null,
    progress: 0,
    isMaxLevel: false,
  });

  survivor.role = "engineer";
  let progress = getSurvivorSkillProgress(survivor, "engineer");
  assert.equal(progress.level, 1);
  assert.equal(progress.levelStartXp, 0);
  assert.equal(progress.nextLevelXp, 120);
  assert.equal(progress.progress, 0);

  survivor.skillXp.engineer = 119;
  progress = getSurvivorSkillProgress(survivor, "engineer");
  assert.equal(progress.level, 1);
  assert.equal(progress.progress, 119 / 120);

  survivor.skillXp.engineer = 120;
  progress = getSurvivorSkillProgress(survivor, "engineer");
  assert.equal(progress.level, 2);
  assert.equal(progress.levelStartXp, 120);
  assert.equal(progress.nextLevelXp, 480);
  assert.equal(progress.progress, 0);

  survivor.skillXp.engineer = 9_720;
  progress = getSurvivorSkillProgress(survivor, "engineer");
  assert.equal(progress.level, 10);
  assert.equal(progress.levelStartXp, 9_720);
  assert.equal(progress.nextLevelXp, null);
  assert.equal(progress.progress, 1);
  assert.equal(progress.isMaxLevel, true);
});

test("training slots, cancellation, and duplicate qualifications are enforced", () => {
  const initial = stateWithCivilian();
  const survivorId = initial.survivors[0]!.id;
  let state = startSurvivorTraining(initial, survivorId, "doctor");
  assert.equal(state.training.length, 1);
  assert.equal(startSurvivorTraining(state, survivorId, "farmer"), state);
  assert.equal(setTrainingSlots(state, 0).trainingSlots, 1);

  state = cancelSurvivorTraining(state, survivorId);
  assert.equal(state.training.length, 0);
  assert.equal(cancelSurvivorTraining(state, survivorId), state);

  state = startSurvivorTraining(state, survivorId, "engineer");
  state = advanceSurvivorSystem(
    state,
    state.training[0]!.durationSeconds,
  );
  assert.equal(startSurvivorTraining(state, survivorId, "engineer"), state);
});

test("qualified assignments earn aptitude-scaled on-the-job XP offline", () => {
  let state = stateWithCivilian();
  const survivorId = state.survivors[0]!.id;
  state = startSurvivorTraining(state, survivorId, "engineer");
  state = advanceSurvivorSystem(state, state.training[0]!.durationSeconds);
  state = assignSurvivorToRole(state, survivorId, "engineer");
  const beforeXp = state.survivors[0]!.skillXp.engineer;
  const original = state;

  const afterHour = advanceSurvivorSystem(state, 60 * 60);
  assert.ok(afterHour.survivors[0]!.skillXp.engineer > beforeXp);
  assert.equal(afterHour.survivors[0]!.serviceSeconds, 60 * 60);
  assert.equal(original.survivors[0]!.serviceSeconds, 0);
  assert.ok(
    getPopulationExpertiseTotals(afterHour).engineer >=
      getPopulationExpertiseTotals(original).engineer,
  );
});

test("research-style modifiers accelerate beacon scans, training, and work XP only positively", () => {
  let beacon = setSosBeaconOnline(
    createSurvivorSystemState(313_313),
    true,
    "pelagos",
  );
  beacon = advanceSurvivorSystem(beacon, SOS_SCAN_SECONDS / 2, {
    beaconSpeedMultiplier: 2,
  });
  assert.ok(beacon.activeSignal);

  let trainee = stateWithCivilian();
  const survivorId = trainee.survivors[0]!.id;
  trainee = startSurvivorTraining(trainee, survivorId, "engineer");
  const duration = trainee.training[0]!.durationSeconds;
  trainee = advanceSurvivorSystem(trainee, duration / 2, {
    trainingSpeedMultiplier: 2,
  });
  assert.equal(trainee.training.length, 0);
  trainee = assignSurvivorToRole(trainee, survivorId, "engineer");

  const normal = advanceSurvivorSystem(trainee, 60 * 60);
  const boosted = advanceSurvivorSystem(trainee, 60 * 60, {
    onJobXpMultiplier: 2,
  });
  assert.ok(
    boosted.survivors[0]!.skillXp.engineer >
      normal.survivors[0]!.skillXp.engineer,
  );
  const cannotSlow = advanceSurvivorSystem(trainee, 60 * 60, {
    onJobXpMultiplier: -50,
  });
  assert.equal(
    cannotSlow.survivors[0]!.skillXp.engineer,
    normal.survivors[0]!.skillXp.engineer,
  );
});

test("callsigns are editable while canonical generated names stay intact", () => {
  let state = supportPopulation(detectSignal(6_262), 20);
  state = rescueSurvivorSignal(state, 1_000_000).state;
  const survivor = state.survivors[0]!;
  const canonicalName = survivor.name;
  const renamed = renameSurvivorCallsign(
    state,
    survivor.id,
    "  Harbor    Light  ",
  );

  assert.equal(renamed.survivors[0]?.callsign, "Harbor Light");
  assert.equal(renamed.survivors[0]?.name, canonicalName);
  assert.equal(state.survivors[0]?.callsign, "");
});

test("declining a signal is optional, safe, and begins no hidden countdown", () => {
  const state = detectSignal(5_555);
  const declined = declineSurvivorSignal(state);

  assert.equal(declined.activeSignal, null);
  assert.equal(declined.survivors.length, 0);
  assert.equal(declined.signalsResolved, 1);
  assert.equal(state.activeSignal !== null, true);
  assert.equal(declineSurvivorSignal(declined), declined);
});

test("sanitization repairs malformed population, support, assignments, and counters", () => {
  const state = sanitizeSurvivorSystemState({
    rngState: 0,
    nextSurvivorSerial: -900,
    operationalSeconds: Number.POSITIVE_INFINITY,
    beaconProgressSeconds: 999_999,
    trainingSlots: -10,
    rarePity: 99_999,
    qualityPity: 99_999,
    rolePity: { engineer: -5, doctor: 99_999 },
    lifeSupport: {
      habitation: -8,
      atmosphere: Number.NaN,
      water: "12",
      nutrition: Number.POSITIVE_INFINITY,
      medical: 4,
    },
    survivors: [
      {
        id: "same-person",
        name: "  Tovan    Maybe  ",
        storyHookId: "forty-third-foreman",
        role: "wizard",
        backgroundId: "invented",
        aptitudes: { engineer: 999, doctor: -9 },
        skillXp: { engineer: Number.POSITIVE_INFINITY, doctor: -2 },
        traits: ["systems-thinker", "systems-thinker", "invented"],
        assignedRole: "doctor",
        adaptability: 900,
      },
      { id: "same-person", name: "Duplicate", role: "civilian" },
      "not a survivor",
    ],
  });

  assert.notEqual(state.rngState, 0);
  assert.equal(state.nextSurvivorSerial >= 2, true);
  assert.equal(state.operationalSeconds, 0);
  assert.equal(state.beaconProgressSeconds, SOS_SCAN_SECONDS);
  assert.equal(state.trainingSlots, 0);
  assert.equal(state.rarePity, 100);
  assert.equal(state.qualityPity, 100);
  assert.equal(state.rolePity.engineer, 0);
  assert.equal(state.rolePity.doctor, 100);
  assert.deepEqual(state.lifeSupport, {
    habitation: 0,
    atmosphere: 0,
    water: 12,
    nutrition: 0,
    medical: 4,
  });
  assert.equal(state.survivors.length, 1);
  assert.equal(state.survivors[0]?.name, "Tovan Rees");
  assert.equal(state.survivors[0]?.role, "engineer");
  assert.equal(state.survivors[0]?.backgroundId, "tidal-grid");
  assert.equal(state.survivors[0]?.assignedRole, null);
  assert.equal(state.survivors[0]?.aptitudes.engineer, 5);
  assert.equal(state.survivors[0]?.adaptability, 5);
});

test("malformed pending signals are deduplicated and their rescue price is rebuilt", () => {
  const state = sanitizeSurvivorSystemState({
    signalsGenerated: 2,
    activeSignal: {
      id: "forged-id",
      sequence: 3,
      sourceLabel: "  Deep    Shelter  ",
      rescueCost: -10,
      survivors: [
        {
          id: "waiting-one",
          name: "Ari Senn",
          role: "doctor",
          backgroundId: "flood-ward",
          aptitudes: {},
          skillXp: {},
        },
        {
          id: "waiting-one",
          name: "Forged Duplicate",
          role: "civilian",
        },
      ],
    },
  });

  assert.equal(state.activeSignal?.id, "pelagos-signal-3");
  assert.equal(state.activeSignal?.survivors.length, 1);
  assert.ok((state.activeSignal?.rescueCost ?? 0) > 0);
  assert.equal(state.activeSignal?.survivors[0]?.origin, "pelagos");
  assert.equal(
    state.activeSignal?.survivors[0]?.originSignalId,
    "pelagos-signal-3",
  );
});

test("sanitization preserves as many as eight valid pending survivors", () => {
  const state = sanitizeSurvivorSystemState({
    beaconOnline: true,
    beaconWorldId: "vesper",
    activeSignal: {
      sequence: 9,
      survivors: Array.from({ length: 8 }, (_, index) => ({
        id: `vesper-pending-${index + 1}`,
        name: `Pending Founder ${index + 1}`,
        role: "civilian",
        backgroundId: "civic-volunteer",
        aptitudes: {},
        skillXp: {},
      })),
    },
  });

  assert.equal(state.activeSignal?.survivors.length, 8);
  assert.deepEqual(
    state.activeSignal?.survivors.map((survivor) => survivor.id),
    Array.from({ length: 8 }, (_, index) => `vesper-pending-${index + 1}`),
  );
  assert.ok(
    state.activeSignal?.survivors.every(
      (survivor) =>
        survivor.origin === "vesper" &&
        survivor.originSignalId === "vesper-signal-9",
    ),
  );
});

test("sanitization infers future IDs and a full roster blocks rescue without deletion", () => {
  const survivors = Array.from({ length: 500 }, (_, index) => ({
    id: index === 0 ? "survivor-900" : `resident-${index}`,
    name: `Resident ${index}`,
    role: "civilian",
    backgroundId: "civic-volunteer",
    aptitudes: {},
    skillXp: {},
  }));
  const state = sanitizeSurvivorSystemState({
    survivors,
    lifeSupport: {
      habitation: 1_000,
      atmosphere: 1_000,
      water: 1_000,
      nutrition: 1_000,
      medical: 1_000,
    },
    activeSignal: {
      sequence: 1,
      survivors: [
        {
          id: "survivor-901",
          name: "Waiting Resident",
          role: "civilian",
          backgroundId: "civic-volunteer",
          aptitudes: {},
          skillXp: {},
        },
      ],
    },
  });

  assert.equal(state.nextSurvivorSerial, 902);
  assert.equal(state.survivors.length, 500);
  assert.equal(getRescueReadiness(state, 1_000_000).reason, "roster-full");
  const result = rescueSurvivorSignal(state, 1_000_000);
  assert.equal(result.rescued, false);
  assert.equal(result.state, state);
  assert.equal(result.state.survivors.length, 500);
});

test("serialized RNG state continues with exactly the same future survivor group", () => {
  let live = detectSignal(73_737);
  live = declineSurvivorSignal(live);
  const restored = sanitizeSurvivorSystemState(
    JSON.parse(JSON.stringify(live)) as unknown,
  );

  const liveNext = advanceSurvivorSystem(live, SOS_SCAN_SECONDS);
  const restoredNext = advanceSurvivorSystem(restored, SOS_SCAN_SECONDS);
  assert.deepEqual(restoredNext.activeSignal, liveNext.activeSignal);
  assert.equal(restoredNext.rngState, liveNext.rngState);
  assert.equal(restoredNext.nextSurvivorSerial, liveNext.nextSurvivorSerial);
});

test("population summaries expose civilians separately and total all expertise", () => {
  let state = stateWithCivilian();
  let counts = getPopulationRoleCounts(state);
  assert.equal(counts.civilian, 1);
  assert.equal(counts.engineer, 0);

  state = startSurvivorTraining(state, state.survivors[0]!.id, "engineer");
  state = advanceSurvivorSystem(state, state.training[0]!.durationSeconds);
  counts = getPopulationRoleCounts(state);
  assert.equal(counts.civilian, 0);
  assert.equal(counts.engineer, 1);
  assert.ok(getPopulationExpertiseTotals(state).engineer >= 1);
});

test("planetary founders transfer out of the Ark roster without mutating its record", () => {
  let state = sanitizeSurvivorSystemState({
    trainingSlots: 2,
    survivors: [
      {
        id: "founder-one",
        name: "Founder One",
        role: "civilian",
        backgroundId: "civic-volunteer",
        aptitudes: { engineer: 5 },
        skillXp: {},
      },
      {
        id: "traveler-two",
        name: "Traveler Two",
        role: "navigator",
        backgroundId: "storm-pilot",
        aptitudes: { navigator: 4 },
        skillXp: { navigator: 25 },
      },
    ],
  });
  state = startSurvivorTraining(state, "founder-one", "engineer");
  const original = cloneSurvivorSystemState(state);
  const transferred = transferSurvivorsToSettlement(state, [
    "founder-one",
    "founder-one",
    "missing-person",
  ]);

  assert.deepEqual(state, original);
  assert.deepEqual(
    transferred.survivors.map((survivor) => survivor.id),
    ["traveler-two"],
  );
  assert.equal(transferred.training.length, 0);
  assert.equal(
    transferSurvivorsToSettlement(transferred, ["missing-person"]),
    transferred,
  );
});

test("survivor names never duplicate people aboard or reserved colony founders", () => {
  let state = setSosBeaconOnline(
    supportPopulation(createSurvivorSystemState(31_337), 200),
    true,
    "pelagos",
  );
  const reservedNames = ["Wren Vale", "Cato Rook"];
  for (let signal = 0; signal < 14; signal += 1) {
    state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS, {
      reservedNames,
    });
    assert.ok(state.activeSignal);
    const result = rescueSurvivorSignal(state, 1_000_000);
    assert.ok(result.rescued);
    state = result.state;
  }

  const names = state.survivors
    .filter((survivor) => survivor.storyHookId === null)
    .map((survivor) => survivor.name);
  assert.equal(new Set(names).size, names.length);
  for (const reserved of reservedNames) {
    assert.ok(!names.includes(reserved));
  }
});

test("authored story-hook characters are rescued at most once per campaign", () => {
  let state = setSosBeaconOnline(
    supportPopulation(createSurvivorSystemState(555_777), 400),
    true,
    "pelagos",
  );
  const foundHooks: string[] = [];
  for (let signal = 0; signal < 90; signal += 1) {
    state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
    assert.ok(state.activeSignal);
    const hooked = state.activeSignal!.survivors.find(
      (survivor) => survivor.storyHookId !== null,
    );
    if (hooked) foundHooks.push(hooked.storyHookId!);
    const result = rescueSurvivorSignal(state, 1_000_000);
    assert.ok(result.rescued);
    state = result.state;
  }

  assert.equal(new Set(foundHooks).size, foundHooks.length);
  assert.equal(foundHooks.length, RARE_SURVIVOR_HOOKS.length);
  assert.deepEqual(
    [...state.rescuedHookIds].sort(),
    RARE_SURVIVOR_HOOKS.map((hook) => hook.id).sort(),
  );
});

test("settled story-hook characters stay excluded after transfer and reload", () => {
  let state = setSosBeaconOnline(
    supportPopulation(createSurvivorSystemState(42_424), 400),
    true,
    "pelagos",
  );
  let hookedId: string | null = null;
  while (!hookedId) {
    state = advanceSurvivorSystem(state, SOS_SCAN_SECONDS);
    const result = rescueSurvivorSignal(state, 1_000_000);
    assert.ok(result.rescued);
    state = result.state;
    hookedId =
      state.survivors.find((survivor) => survivor.storyHookId !== null)?.id ??
      null;
  }
  const hook = state.survivors.find((survivor) => survivor.id === hookedId)!;
  const transferred = transferSurvivorsToSettlement(state, [hookedId]);
  assert.ok(transferred.rescuedHookIds.includes(hook.storyHookId!));

  const reloaded = sanitizeSurvivorSystemState(
    JSON.parse(JSON.stringify(transferred)),
  );
  assert.ok(reloaded.rescuedHookIds.includes(hook.storyHookId!));
});

test("profession capacity follows rarity and blocks training past the limit", () => {
  const capacityByRarity = {
    standard: 1,
    notable: 2,
    exceptional: 3,
  } as const;

  for (const [rarity, capacity] of Object.entries(capacityByRarity)) {
    const specialist = survivorWithRarity(rarity as keyof typeof capacityByRarity);
    specialist.id = `${rarity}-specialist`;
    specialist.role = "engineer";
    specialist.skillXp = { engineer: 25 };
    let state = sanitizeSurvivorSystemState({
      rngState: 1,
      trainingSlots: 12,
      survivors: [specialist],
    });

    const roles = ["doctor", "farmer", "teacher", "navigator"] as const;
    let learned = 1;
    for (const role of roles) {
      const before = state;
      state = startSurvivorTraining(state, specialist.id, role);
      if (state !== before) {
        state = advanceSurvivorSystem(state, 100 * 3_600);
        learned += 1;
      }
    }
    assert.equal(learned, capacity, `${rarity} should cap at ${capacity}`);
  }
});

test("anomalous crew may learn every profession", () => {
  const anomalous = survivorWithRarity("anomalous");
  anomalous.id = "anomalous-crew";
  let state = sanitizeSurvivorSystemState({
    rngState: 1,
    trainingSlots: 12,
    survivors: [anomalous],
  });

  for (const role of PROFESSIONAL_ROLES) {
    const before = state;
    state = startSurvivorTraining(state, anomalous.id, role);
    if (state !== before) {
      state = advanceSurvivorSystem(state, 200 * 3_600);
    }
  }
  const survivor = state.survivors[0]!;
  const qualified = PROFESSIONAL_ROLES.filter(
    (role) => survivor.role === role || survivor.skillXp[role] > 0,
  );
  assert.equal(qualified.length, PROFESSIONAL_ROLES.length);
});

test("crew already beyond the new capacity keep every profession they learned", () => {
  const veteran = survivorWithRarity("standard");
  veteran.id = "grandfathered-veteran";
  veteran.role = "engineer";
  veteran.skillXp = { engineer: 500, doctor: 400, farmer: 300 };
  const state = sanitizeSurvivorSystemState({
    rngState: 1,
    trainingSlots: 12,
    survivors: [veteran],
  });

  const reloaded = state.survivors[0]!;
  assert.ok(reloaded.skillXp.doctor >= 400);
  assert.ok(reloaded.skillXp.farmer >= 300);
  assert.equal(getSurvivorSkillLevel(reloaded, "doctor") > 0, true);
  assert.equal(
    startSurvivorTraining(state, veteran.id, "teacher"),
    state,
  );
});
