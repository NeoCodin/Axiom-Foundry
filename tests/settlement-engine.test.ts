import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_WORLD_IDS,
  CAMPAIGN_WORLDS,
  getCampaignWorld,
  getNextCampaignWorld,
  type CampaignWorldId,
} from "../app/campaign-content.ts";
import {
  acknowledgeColonyTransmission,
  cloneSettlementState,
  createSettlementState,
  establishSettlementAndDepart,
  getAllPendingColonyTransmissions,
  getColony,
  getCurrentCampaignWorld,
  getLegacySummary,
  getNextColonyTransmission,
  getViabilityForecast,
  isCampaignComplete,
  sanitizeSettlementState,
  sanitizeWorldProgress,
  setSelectedSettlers,
  toggleSettlerSelection,
  type CampaignCrewSummary,
  type SettlementState,
  type WorldProgressSummary,
} from "../app/settlement-engine.ts";

function completeProgress(worldId: CampaignWorldId): WorldProgressSummary {
  const world = getCampaignWorld(worldId);
  assert.ok(world);
  return {
    completedInfrastructureIds: world.infrastructure.map((objective) => objective.id),
    completedResearchIds: [...world.requiredResearchIds],
    resolvedCrisisIds: [...world.crisisIds],
    supplies: Object.fromEntries(
      world.supplyRequirements.map((requirement) => [
        requirement.id,
        requirement.amount,
      ]),
    ),
    equipment: {},
  };
}

function reachPelagos() {
  const state = createSettlementState();
  const departure = establishSettlementAndDepart(
    state,
    "cold-wake",
    [],
    completeProgress("cold-wake"),
    1_000,
  );
  assert.equal(departure.ok, true);
  return departure.state;
}

function pelagosCrew(): CampaignCrewSummary[] {
  return [
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `engineer-${index + 1}`,
      name: `Engineer ${index + 1}`,
      role: index === 0 ? "Software Engineer" : "engineer",
      expertise: { engineering: 4 },
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      id: `doctor-${index + 1}`,
      name: `Doctor ${index + 1}`,
      role: index === 0 ? "doctor" : "medic",
      expertise: { medicine: 4 },
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      id: `grower-${index + 1}`,
      name: `Grower ${index + 1}`,
      role: index === 0 ? "hydroponics" : "ecologist",
      expertise: { ecology: 4 },
    })),
    {
      id: "teacher-1",
      name: "Teacher One",
      role: "teacher",
      expertise: { education: 4 },
    },
    {
      id: "coordinator-1",
      name: "Coordinator One",
      roles: ["civilian", "coordinator"],
      expertise: { leadership: 4 },
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      id: `civilian-${index + 1}`,
      name: `Civilian ${index + 1}`,
      role: "civilian",
      expertise: {},
    })),
  ];
}

test("campaign content moves from a crewless Cold Wake through five distinct worlds", () => {
  assert.deepEqual(CAMPAIGN_WORLDS.map((world) => world.id), CAMPAIGN_WORLD_IDS);
  assert.equal(CAMPAIGN_WORLDS[0].kind, "space");
  assert.equal(CAMPAIGN_WORLDS[0].settlementRequired, false);
  assert.deepEqual(
    CAMPAIGN_WORLDS.slice(1).map((world) => world.name),
    ["Pelagos", "Viridia", "Cinder", "Nox", "Vesper"],
  );
  assert.equal(getNextCampaignWorld("cold-wake")?.id, "pelagos");
  assert.equal(getNextCampaignWorld("vesper"), null);
  assert.equal(
    new Set(CAMPAIGN_WORLDS.map((world) => world.theme.primary)).size,
    CAMPAIGN_WORLDS.length,
  );

  for (const world of CAMPAIGN_WORLDS.slice(1)) {
    assert.equal(world.kind, "planet");
    assert.ok(world.minimumPopulation > 0);
    assert.ok(world.infrastructure.length >= 3);
    assert.ok(world.roleRequirements.length > 0);
    assert.ok(world.expertiseRequirements.length > 0);
    assert.ok(world.requiredResearchIds.length > 0);
    assert.ok(world.crisisIds.length > 0);
    assert.ok(world.transmissions.length >= 3);
    assert.match(world.continuityProtocolExcerpt, /CONTINUITY DIRECTIVE/);
    assert.ok(world.departureQuestion.endsWith("?"));
  }
});

test("Profile Depth is absent early and explicit on every late world", () => {
  assert.deepEqual(getCampaignWorld("pelagos")?.profileRequirements, []);
  assert.deepEqual(getCampaignWorld("viridia")?.profileRequirements, []);
  assert.deepEqual(
    getCampaignWorld("cinder")?.profileRequirements.map((requirement) => [
      requirement.minimumRarity,
      requirement.count,
    ]),
    [["notable", 2]],
  );
  assert.deepEqual(
    getCampaignWorld("nox")?.profileRequirements.map((requirement) => [
      requirement.minimumRarity,
      requirement.count,
    ]),
    [["notable", 4], ["exceptional", 1]],
  );
  assert.deepEqual(
    getCampaignWorld("vesper")?.profileRequirements.map((requirement) => [
      requirement.minimumRarity,
      requirement.count,
    ]),
    [["notable", 6], ["exceptional", 3]],
  );
});

test("late Profile Depth gates count higher rarities without multiplying Expertise", () => {
  let state = sanitizeSettlementState({
    completedWorldIds: ["cold-wake", "pelagos", "viridia", "cinder"],
  });
  const crew: CampaignCrewSummary[] = [
    { id: "standard", name: "Standard", role: "researcher", rarity: "standard", expertise: { research: 4 } },
    { id: "notable-1", name: "Notable One", role: "researcher", rarity: "notable", expertise: { research: 4 } },
    { id: "notable-2", name: "Notable Two", role: "researcher", rarity: "notable", expertise: { research: 4 } },
    { id: "notable-3", name: "Notable Three", role: "researcher", rarity: "notable", expertise: { research: 4 } },
    { id: "exceptional", name: "Exceptional", role: "researcher", rarity: "exceptional", expertise: { research: 4 } },
    { id: "anomalous", name: "Anomalous", role: "researcher", rarity: "anomalous", expertise: { research: 4 } },
  ];
  state = setSelectedSettlers(state, crew, crew.map((member) => member.id));
  const forecast = getViabilityForecast(state, "nox", crew, {});

  assert.equal(
    forecast.lines.find((line) => line.id === "nox-notable-founders")?.baseValue,
    5,
  );
  assert.equal(
    forecast.lines.find((line) => line.id === "nox-exceptional-founders")?.baseValue,
    2,
  );
  assert.equal(
    forecast.lines.find((line) => line.id === "research")?.baseValue,
    24,
    "rarity must not secretly multiply Expertise",
  );

  const onlyStandard = setSelectedSettlers(
    state,
    crew,
    ["standard"],
  );
  const blocked = getViabilityForecast(onlyStandard, "nox", crew, {});
  const profileDeficit = blocked.deficits.find(
    (deficit) => deficit.id === "nox-exceptional-founders",
  );
  assert.match(profileDeficit?.message ?? "", /exceptional-or-better/i);
  assert.match(profileDeficit?.alternatives.join(" ") ?? "", /five quality misses/i);
});

test("Cold Wake requires Ark readiness but never invents a starting population", () => {
  const state = createSettlementState();
  const empty = getViabilityForecast(state, "cold-wake", [], {});
  assert.equal(empty.settlementRequired, false);
  assert.equal(empty.lines.some((line) => line.kind === "population"), false);
  assert.equal(empty.canDepart, false);

  const ready = getViabilityForecast(
    state,
    "cold-wake",
    [],
    completeProgress("cold-wake"),
  );
  assert.equal(ready.canDepart, true);
  assert.equal(ready.score, 100);

  const departure = establishSettlementAndDepart(
    state,
    "cold-wake",
    [],
    completeProgress("cold-wake"),
    123,
  );
  assert.equal(departure.ok, true);
  assert.equal(departure.colony, null);
  assert.deepEqual(departure.settledCrewIds, []);
  assert.equal(departure.state.currentWorldId, "pelagos");
  assert.deepEqual(departure.state.completedWorldIds, ["cold-wake"]);
});

test("settler selection is explicit, immutable, unique, and eligibility-aware", () => {
  const state = reachPelagos();
  const crew: CampaignCrewSummary[] = [
    { id: "ready", name: "Ready", role: "civilian" },
    { id: "away", name: "Away", role: "civilian", available: false },
    { id: "staying-aboard", name: "Staying", canSettle: false },
  ];
  const selected = setSelectedSettlers(state, crew, [
    "ready",
    "ready",
    "away",
    "missing",
    "staying-aboard",
  ]);

  assert.notEqual(selected, state);
  assert.deepEqual(state.selectedSettlerIds, []);
  assert.deepEqual(selected.selectedSettlerIds, ["ready"]);

  const toggledOff = toggleSettlerSelection(selected, crew, "ready");
  assert.deepEqual(toggledOff.selectedSettlerIds, []);
  const toggledOn = toggleSettlerSelection(toggledOff, crew, "ready");
  assert.deepEqual(toggledOn.selectedSettlerIds, ["ready"]);
});

test("Pelagos forecast reports clear population, profession, skill, and project deficits", () => {
  const state = reachPelagos();
  const forecast = getViabilityForecast(state, "pelagos", pelagosCrew(), {});

  assert.equal(forecast.canDepart, false);
  assert.equal(forecast.eligibleSettlerIds.length, 0);
  assert.ok(forecast.score < 100);
  assert.ok(
    forecast.deficits.some(
      (deficit) =>
        deficit.kind === "population" &&
        deficit.message === "Select 18 more eligible settlers.",
    ),
  );
  const medical = forecast.deficits.find(
    (deficit) => deficit.id === "medical-team",
  );
  assert.ok(medical);
  assert.match(medical.alternatives.join(" "), /doctor/);
  assert.match(medical.alternatives.join(" "), /mobile field clinic/i);
  assert.ok(forecast.deficits.some((deficit) => deficit.kind === "research"));
  assert.ok(
    forecast.deficits.some((deficit) => deficit.kind === "infrastructure"),
  );
});

test("profession categories and expertise totals never depend on one lucky character", () => {
  const crew = pelagosCrew();
  let state = reachPelagos();
  state = setSelectedSettlers(
    state,
    crew,
    crew.map((member) => member.id),
  );
  const forecast = getViabilityForecast(
    state,
    "pelagos",
    crew,
    completeProgress("pelagos"),
  );

  assert.equal(forecast.canDepart, true);
  assert.equal(forecast.score, 100);
  assert.equal(forecast.selectedSettlerIds.length, 18);
  assert.equal(
    forecast.lines.find((line) => line.id === "engineering-team")?.baseValue,
    3,
  );
  assert.equal(
    forecast.lines.find((line) => line.id === "engineering")?.baseValue,
    12,
  );
  assert.match(
    forecast.lines.find((line) => line.id === "engineering")?.detail ?? "",
    /Technician level/i,
  );
  assert.equal(
    forecast.lines.find((line) => line.id === "engineering")?.contributors.length,
    3,
  );
});

test("equipment and research can cover bounded specialist gaps", () => {
  const crew = pelagosCrew();
  const secondDoctorIndex = crew.findIndex((member) => member.id === "doctor-2");
  crew[secondDoctorIndex] = {
    id: "doctor-2",
    name: "Cross-training civilian",
    role: "civilian",
    expertise: {},
  };
  let state = reachPelagos();
  state = setSelectedSettlers(
    state,
    crew,
    crew.map((member) => member.id),
  );
  const progress = {
    ...completeProgress("pelagos"),
    completedResearchIds: [
      ...completeProgress("pelagos").completedResearchIds,
      "adaptive-curriculum",
    ],
    equipment: { "mobile-field-clinic": 99 },
  };
  const forecast = getViabilityForecast(state, "pelagos", crew, progress);
  const roleLine = forecast.lines.find((line) => line.id === "medical-team");
  const expertiseLine = forecast.lines.find((line) => line.id === "medicine");

  assert.equal(roleLine?.baseValue, 1);
  assert.equal(roleLine?.substitutionValue, 1);
  assert.equal(expertiseLine?.baseValue, 4);
  assert.equal(expertiseLine?.substitutionValue, 4);
  assert.equal(forecast.canDepart, true);
});

test("an unready departure is safe, untimed, and does not mutate progress", () => {
  const state = reachPelagos();
  const result = establishSettlementAndDepart(
    state,
    "pelagos",
    pelagosCrew(),
    {},
    Number.POSITIVE_INFINITY,
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "requirements-unmet");
  assert.equal(result.state, state);
  assert.equal(state.currentWorldId, "pelagos");
  assert.deepEqual(state.colonies, []);
});

test("departure preserves founders as colony history and returns integration IDs", () => {
  const crew = pelagosCrew();
  let state = reachPelagos();
  state = setSelectedSettlers(
    state,
    crew,
    crew.map((member) => member.id),
  );
  const result = establishSettlementAndDepart(
    state,
    "pelagos",
    crew,
    completeProgress("pelagos"),
    5_000,
    "The Breakwater",
  );

  assert.equal(result.ok, true);
  assert.equal(result.state.currentWorldId, "viridia");
  assert.equal(result.colony?.name, "The Breakwater");
  assert.equal(result.colony?.founders.length, 18);
  assert.deepEqual(result.settledCrewIds, crew.map((member) => member.id));
  assert.equal(result.colony?.viabilityScore, 100);
  assert.deepEqual(result.state.selectedSettlerIds, []);

  crew[0].name = "Changed after departure";
  if (crew[0].expertise) {
    (crew[0].expertise as Record<string, number>).engineering = 99;
  }
  const founder = result.colony?.founders.find(
    (candidate) => candidate.crewId === "engineer-1",
  );
  assert.equal(founder?.name, "Engineer 1");
  assert.equal(founder?.expertise.engineering, 4);
  assert.equal(founder?.rarity, "standard");
});

test("colonies provide persistent transmissions and additive legacy benefits", () => {
  const crew = pelagosCrew();
  let state = reachPelagos();
  state = setSelectedSettlers(
    state,
    crew,
    crew.map((member) => member.id),
  );
  const result = establishSettlementAndDepart(
    state,
    "pelagos",
    crew,
    completeProgress("pelagos"),
    5_000,
  );
  assert.equal(result.ok, true);
  state = result.state;

  assert.match(getNextColonyTransmission(state, "pelagos") ?? "", /clear-water/);
  assert.equal(getAllPendingColonyTransmissions(state).length, 1);
  const acknowledged = acknowledgeColonyTransmission(state, "pelagos");
  assert.notEqual(acknowledged, state);
  assert.equal(getColony(state, "pelagos")?.transmissionsRead, 0);
  assert.equal(getColony(acknowledged, "pelagos")?.transmissionsRead, 1);
  assert.notEqual(
    getNextColonyTransmission(acknowledged, "pelagos"),
    getNextColonyTransmission(state, "pelagos"),
  );

  const legacy = getLegacySummary(state);
  assert.deepEqual(
    legacy.benefits.map((benefit) => benefit.id),
    ["pelagos-signal-net"],
  );
  assert.equal(legacy.totals["beacon-throughput"], 0.05);
});

test("sanitization rejects skipped worlds, duplicate colonies, settled selections, and forged values", () => {
  const state = sanitizeSettlementState({
    schema: 999,
    currentWorldId: "vesper",
    completedWorldIds: ["cold-wake", "pelagos", "nox"],
    selectedSettlerIds: ["founder-one", "new-person", "new-person", 42],
    colonies: [
      {
        worldId: "pelagos",
        name: "  Harbor    Light  ",
        establishedAt: Number.POSITIVE_INFINITY,
        viabilityScore: 900,
        founders: [
          {
            crewId: "founder-one",
            name: " First   Founder ",
            roles: ["Doctor", "Doctor"],
            expertise: { medicine: 4, forged: -10 },
          },
        ],
        legacyBenefitIds: ["pelagos-signal-net", "forged-benefit"],
        transmissionsRead: 999,
      },
      { worldId: "pelagos", founders: [] },
      { worldId: "nox", founders: [] },
    ],
    lastDepartureAt: -100,
  });

  assert.deepEqual(state.completedWorldIds, ["cold-wake", "pelagos"]);
  assert.equal(state.currentWorldId, "viridia");
  assert.equal(state.schema, 1);
  assert.equal(state.colonies.length, 1);
  assert.equal(state.colonies[0].name, "Harbor Light");
  assert.equal(state.colonies[0].viabilityScore, 100);
  assert.equal(state.colonies[0].establishedAt, 0);
  assert.equal(state.colonies[0].transmissionsRead, 3);
  assert.deepEqual(state.colonies[0].legacyBenefitIds, ["pelagos-signal-net"]);
  assert.equal(state.colonies[0].founders[0]?.rarity, "standard");
  assert.deepEqual(state.selectedSettlerIds, ["new-person"]);
  assert.equal(state.lastDepartureAt, 0);
});

test("world progress sanitization bounds malformed external integration data", () => {
  const progress = sanitizeWorldProgress({
    completedInfrastructureIds: [" A System ", "a-system", 42],
    completedResearchIds: ["Proof One", "Proof One"],
    resolvedCrisisIds: "not-an-array",
    supplies: { "Settlement Supplies": 1e30, negative: -3, text: "9" },
    equipment: { Clinic: 2.9 },
  });

  assert.deepEqual(progress.completedInfrastructureIds, ["a-system"]);
  assert.deepEqual(progress.completedResearchIds, ["proof-one"]);
  assert.deepEqual(progress.resolvedCrisisIds, []);
  assert.equal(progress.supplies["settlement-supplies"], 1_000_000_000);
  assert.equal(progress.supplies.negative, undefined);
  assert.equal(progress.equipment.clinic, 2);
});

test("clone and completion helpers do not share mutable colony history", () => {
  const completed = sanitizeSettlementState({
    completedWorldIds: [...CAMPAIGN_WORLD_IDS],
    selectedSettlerIds: ["impossible"],
    colonies: [],
  });
  assert.equal(isCampaignComplete(completed), true);
  assert.equal(completed.currentWorldId, null);
  assert.deepEqual(completed.selectedSettlerIds, []);
  assert.equal(getCurrentCampaignWorld(completed), null);

  const state: SettlementState = {
    ...reachPelagos(),
    selectedSettlerIds: ["crew-one"],
  };
  const cloned = cloneSettlementState(state);
  cloned.selectedSettlerIds.push("crew-two");
  assert.deepEqual(state.selectedSettlerIds, ["crew-one"]);
});

test("the complete campaign can found five colonies without reusing or deleting founders", () => {
  let state = createSettlementState();
  const coldWake = establishSettlementAndDepart(
    state,
    "cold-wake",
    [],
    completeProgress("cold-wake"),
    1,
  );
  assert.equal(coldWake.ok, true);
  state = coldWake.state;

  for (const worldId of CAMPAIGN_WORLD_IDS.slice(1)) {
    const world = getCampaignWorld(worldId);
    assert.ok(world);
    const everyRole = [
      "civilian",
      ...world.roleRequirements.flatMap((requirement) => requirement.acceptedRoles),
    ];
    const everyExpertise = Object.fromEntries(
      world.expertiseRequirements.map((requirement) => [requirement.id, 10]),
    );
    const crew = Array.from({ length: world.minimumPopulation }, (_, index) => ({
      id: `${worldId}-founder-${index + 1}`,
      name: `${world.name} Founder ${index + 1}`,
      roles: everyRole,
      expertise: everyExpertise,
      rarity: "exceptional" as const,
    }));
    state = setSelectedSettlers(
      state,
      crew,
      crew.map((member) => member.id),
    );
    const departure = establishSettlementAndDepart(
      state,
      worldId,
      crew,
      completeProgress(worldId),
      world.chapter + 1,
    );
    assert.equal(departure.ok, true, `Expected ${world.name} to be viable`);
    assert.equal(departure.settledCrewIds.length, world.minimumPopulation);
    state = departure.state;
  }

  assert.equal(isCampaignComplete(state), true);
  assert.equal(state.colonies.length, 5);
  const allFounderIds = state.colonies.flatMap((colony) =>
    colony.founders.map((founder) => founder.crewId),
  );
  assert.equal(new Set(allFounderIds).size, allFounderIds.length);
  assert.equal(
    state.colonies.reduce((total, colony) => total + colony.founders.length, 0),
    CAMPAIGN_WORLDS.slice(1).reduce(
      (total, world) => total + world.minimumPopulation,
      0,
    ),
  );
});
