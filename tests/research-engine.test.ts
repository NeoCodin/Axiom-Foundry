import assert from "node:assert/strict";
import test from "node:test";
import { CAMPAIGN_WORLDS } from "../app/campaign-content.ts";

import {
  MAX_RESEARCH_CREW,
  RESEARCH_INPUT_DEFINITIONS,
  RESEARCH_PROJECT_DEFINITIONS,
  RESEARCH_ROUTE_SLOTS,
  addResearchInputs,
  advanceResearch,
  advanceResearchToTime,
  canStartResearchProject,
  configureResearchRoute,
  createResearchLatticeState,
  getResearchBonuses,
  getResearchCapabilities,
  getAvailableResearchEras,
  getResearchNetworkStatus,
  getResearchNullEchoes,
  getResearchProjectPresentation,
  getResearchProjectProgress,
  getResearchProjectCosts,
  getResearchProjectEra,
  getResearchProjectWorkRequired,
  getResearchRepeatCount,
  getResolvedResearchRoutes,
  sanitizeResearchLatticeState,
  selectResearchProject,
  setResearchAutoRoute,
  setResearchCrew,
  type ResearchLatticeState,
} from "../app/research-engine.ts";

test("a new Research Lattice is safe, empty, and auto-routed by default", () => {
  const state = createResearchLatticeState();

  assert.equal(state.autoRoute, true);
  assert.equal(state.routes.length, RESEARCH_ROUTE_SLOTS);
  assert.equal(state.assignedCrew, 0);
  assert.equal(state.activeProjectId, null);
  assert.deepEqual(state.completedProjectIds, []);
  assert.ok(
    RESEARCH_INPUT_DEFINITIONS.every((input) => state.inventory[input.id] === 0),
  );
});

test("sanitization repairs malformed inventory, routes, progress, and identifiers", () => {
  const state = sanitizeResearchLatticeState({
    schema: 900,
    autoRoute: "absolutely",
    assignedCrew: 999,
    inventory: {
      "calibration-data": -100,
      "engineering-models": Number.POSITIVE_INFINITY,
      "biological-samples": 77.5,
      invented: 1e20,
    },
    routes: [
      {
        slot: 0,
        sourceId: "calibration-data",
        processorId: "signal-decoder",
      },
      {
        slot: 1,
        sourceId: "null-traces",
        processorId: "signal-decoder",
      },
      {
        slot: 2,
        sourceId: "biological-samples",
        processorId: "phase-amplifier",
      },
      { slot: 99, sourceId: "made-up", processorId: "vector-buffer" },
    ],
    completedProjectIds: [
      "auxiliary-power-routing",
      "auxiliary-power-routing",
      "fabricated-project",
    ],
    progress: {
      "auxiliary-power-routing": -5,
      "closed-loop-atmosphere": 1e12,
    },
    activeProjectId: "closed-loop-atmosphere",
    unlockedEchoIds: ["echo-baseline", "echo-baseline", "invented-echo"],
    lastAdvancedAt: -1,
  });

  assert.equal(state.schema, 2);
  assert.equal(state.assignedCrew, MAX_RESEARCH_CREW);
  assert.equal(state.inventory["calibration-data"], 0);
  assert.equal(state.inventory["engineering-models"], 0);
  assert.equal(state.inventory["biological-samples"], 77.5);
  assert.equal(state.routes[0].processorId, "signal-decoder");
  assert.equal(state.routes[1].processorId, null, "processors are physical and unique");
  assert.equal(state.routes[2].processorId, null, "incompatible pair is discarded");
  assert.deepEqual(state.completedProjectIds, [
    "auxiliary-power-routing",
    "closed-loop-atmosphere",
  ]);
  assert.equal(state.progress["auxiliary-power-routing"], 180);
  assert.equal(state.progress["closed-loop-atmosphere"], 500);
  assert.equal(state.activeProjectId, null);
  assert.deepEqual(state.unlockedEchoIds, []);
  assert.equal(state.lastAdvancedAt, null);
});

test("auto-route creates a complete forgiving route for every project input", () => {
  let state = createResearchLatticeState();
  state = selectResearchProject(state, "auxiliary-power-routing");
  let routes = getResolvedResearchRoutes(state);
  assert.equal(routes.filter((route) => route.sourceId).length, 1);
  assert.equal(routes[0].sourceId, "calibration-data");

  state = {
    ...state,
    activeProjectId: "axiom-origin-proof",
    completedProjectIds: RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id).filter(
      (id) => id !== "axiom-origin-proof",
    ),
  };
  routes = getResolvedResearchRoutes(state);
  const required = [
    "engineering-models",
    "cultural-records",
    "null-traces",
    "axiom-proofs",
  ];
  assert.deepEqual(
    routes.filter((route) => route.sourceId).map((route) => route.sourceId),
    required,
  );
  assert.equal(
    new Set(routes.map((route) => route.processorId).filter(Boolean)).size,
    required.length,
  );
});

test("manual routing is immutable and rejects incompatible or duplicate processors", () => {
  const original = createResearchLatticeState();
  const configured = configureResearchRoute(
    original,
    0,
    "calibration-data",
    "signal-decoder",
  );

  assert.notEqual(configured, original);
  assert.equal(original.routes[0].sourceId, null);
  assert.equal(configured.autoRoute, false);
  assert.equal(configured.routes[0].sourceId, "calibration-data");

  assert.equal(
    configureResearchRoute(
      configured,
      1,
      "biological-samples",
      "signal-decoder",
    ),
    configured,
  );
  assert.equal(
    configureResearchRoute(
      configured,
      1,
      "cultural-records",
      "signal-decoder",
    ),
    configured,
  );
});

test("power, crew, route throughput, and inventory all govern progress", () => {
  let state = createResearchLatticeState();
  state = addResearchInputs(state, { "calibration-data": 100 });
  state = setResearchCrew(state, 2, 4);
  state = selectResearchProject(state, "auxiliary-power-routing");

  const noPower = getResearchNetworkStatus(state, {
    powerAvailable: 0,
    crewAvailable: 4,
  });
  assert.equal(noPower.progressPerSecond, 0);
  assert.match(noPower.stalledReason ?? "", /power/i);

  const active = getResearchNetworkStatus(state, {
    powerAvailable: 20,
    crewAvailable: 4,
  });
  assert.ok(active.progressPerSecond > 0 && active.progressPerSecond <= 1);
  assert.equal(active.missingInputs.length, 0);

  const result = advanceResearch(state, 10, {
    powerAvailable: 20,
    crewAvailable: 4,
  });
  assert.notEqual(result.state, state);
  assert.equal(state.progress["auxiliary-power-routing"], undefined);
  assert.ok(result.progressedWork > 0);
  assert.ok(result.consumed["calibration-data"] > 0);
  assert.ok(result.state.inventory["calibration-data"] < 100);
});

test("completed projects consume their exact science cost and unlock physical systems", () => {
  let state = createResearchLatticeState();
  state = addResearchInputs(state, { "calibration-data": 60 });
  state = setResearchCrew(state, 3, 3);
  state = selectResearchProject(state, "auxiliary-power-routing");
  const result = advanceResearch(state, 1_000, {
    powerAvailable: 100,
    crewAvailable: 3,
  });

  assert.equal(result.completedProjectId, "auxiliary-power-routing");
  assert.equal(result.state.activeProjectId, null);
  assert.equal(getResearchProjectProgress(result.state, "auxiliary-power-routing"), 1);
  assert.ok(Math.abs(result.consumed["calibration-data"] - 60) < 1e-7);
  assert.ok(result.state.inventory["calibration-data"] < 1e-7);
  assert.ok(getResearchCapabilities(result.state).includes("auxiliary-grid"));
  assert.equal(getResearchBonuses(result.state).productionMultiplier, 1.04);
});

test("research stops cleanly when an input is exhausted", () => {
  let state = createResearchLatticeState();
  state = addResearchInputs(state, { "calibration-data": 6 });
  state = selectResearchProject(state, "auxiliary-power-routing");
  const result = advanceResearch(state, 50_000, { powerAvailable: 100 });

  assert.ok(Math.abs(result.progressedWork - 18) < 1e-7);
  assert.equal(result.completedProjectId, null);
  assert.ok(result.state.inventory["calibration-data"] < 1e-7);
  assert.equal(getResearchProjectProgress(result.state, "auxiliary-power-routing"), 0.1);
});

test("offline timestamps progress research and never mutate the saved snapshot", () => {
  let state = createResearchLatticeState();
  state = addResearchInputs(state, { "calibration-data": 100 });
  state = selectResearchProject(state, "auxiliary-power-routing", 1_000);
  const snapshot = structuredClone(state);
  const result = advanceResearchToTime(state, 31_000, {
    powerAvailable: 20,
    crewAvailable: 0,
  });

  assert.deepEqual(state, snapshot);
  assert.equal(result.state.lastAdvancedAt, 31_000);
  assert.ok(result.progressedWork > 0);
  assert.ok(result.progressedWork < 30, "AXIOM-only operation is intentionally slower");

  const backwardClock = advanceResearchToTime(result.state, 20_000, {
    powerAvailable: 20,
  });
  assert.equal(backwardClock.progressedWork, 0);
  assert.equal(backwardClock.state.lastAdvancedAt, 31_000);
  assert.equal(setResearchCrew(state, 3, Number.NaN).assignedCrew, 0);
});

test("project prerequisites connect the three branches", () => {
  const fresh = createResearchLatticeState();
  assert.equal(canStartResearchProject(fresh, "auxiliary-power-routing"), true);
  assert.equal(canStartResearchProject(fresh, "continuity-index"), false);
  assert.equal(canStartResearchProject(fresh, "null-signal-baseline"), false);
  assert.equal(selectResearchProject(fresh, "null-signal-baseline"), fresh);

  const established = {
    ...fresh,
    completedProjectIds: [
      "auxiliary-power-routing",
      "closed-loop-atmosphere",
      "continuity-index",
      "adaptive-instruction",
    ] as typeof fresh.completedProjectIds,
  };
  assert.equal(canStartResearchProject(established, "null-signal-baseline"), true);
  assert.equal(canStartResearchProject(established, "discarded-spectrum"), false);
});

test("Settlement Charter uses attainable materials without changing its prerequisites", () => {
  const charter = RESEARCH_PROJECT_DEFINITIONS.find(
    (project) => project.id === "settlement-charter",
  );

  assert.ok(charter);
  assert.deepEqual(charter.costs, {
    "cultural-records": 520,
    "biological-samples": 300,
    "engineering-models": 440,
  });
  assert.equal("axiom-proofs" in charter.costs, false);
  assert.deepEqual(charter.prerequisites, [
    "clinical-commons",
    "discarded-spectrum",
  ]);
});

test("research speed applies its internal bonus once and external speed separately", () => {
  let base = createResearchLatticeState();
  base = addResearchInputs(base, { "calibration-data": 100 });
  base = setResearchCrew(base, MAX_RESEARCH_CREW, MAX_RESEARCH_CREW);
  base = selectResearchProject(base, "auxiliary-power-routing");
  const internallyBoosted: ResearchLatticeState = {
    ...base,
    completedProjectIds: ["ark-drive-coupling"],
  };
  const environment = {
    powerAvailable: 100,
    crewAvailable: MAX_RESEARCH_CREW,
  };

  const baseStatus = getResearchNetworkStatus(base, environment);
  const internalStatus = getResearchNetworkStatus(internallyBoosted, environment);
  const externalStatus = getResearchNetworkStatus(base, {
    ...environment,
    externalSpeedMultiplier: 2,
  });
  const combinedStatus = getResearchNetworkStatus(internallyBoosted, {
    ...environment,
    externalSpeedMultiplier: 2,
  });

  assert.equal(getResearchBonuses(internallyBoosted).researchSpeedMultiplier, 1.05);
  assert.equal(baseStatus.stalledReason, null);
  assert.equal(internalStatus.stalledReason, null);
  assert.equal(baseStatus.progressPerSecond, 1);
  assert.equal(internalStatus.progressPerSecond, 1.05);
  assert.equal(externalStatus.progressPerSecond, 2);
  assert.equal(combinedStatus.progressPerSecond, 2.1);
});

test("research bonuses remain modest and inside their hard caps", () => {
  const state = {
    ...createResearchLatticeState(),
    completedProjectIds: RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id),
  };
  const bonuses = getResearchBonuses(state);

  assert.ok(bonuses.productionMultiplier >= 1 && bonuses.productionMultiplier <= 1.18);
  assert.ok(bonuses.machineCostMultiplier >= 0.88 && bonuses.machineCostMultiplier <= 1);
  assert.ok(
    bonuses.habitationCapacityMultiplier >= 1 &&
      bonuses.habitationCapacityMultiplier <= 1.2,
  );
  assert.ok(
    bonuses.trainingSpeedMultiplier >= 1 && bonuses.trainingSpeedMultiplier <= 1.25,
  );
  assert.ok(bonuses.beaconSpeedMultiplier >= 1 && bonuses.beaconSpeedMultiplier <= 1.2);
  assert.ok(
    bonuses.researchSpeedMultiplier >= 1 && bonuses.researchSpeedMultiplier <= 1.35,
  );
  assert.ok(bonuses.nullSignalMultiplier >= 1 && bonuses.nullSignalMultiplier <= 1.2);
});

test("Null completions unlock contradictions without changing canonical definitions", () => {
  const project = RESEARCH_PROJECT_DEFINITIONS.find(
    (candidate) => candidate.id === "null-signal-baseline",
  );
  assert.ok(project);
  const state: ResearchLatticeState = {
    ...createResearchLatticeState(),
    completedProjectIds: ["null-signal-baseline"],
    unlockedEchoIds: ["echo-baseline"],
  };
  const presentation = getResearchProjectPresentation(
    state,
    "null-signal-baseline",
  );
  const echoes = getResearchNullEchoes(state);

  assert.equal(presentation?.displaySummary, project.contradiction);
  assert.equal(echoes.length, 1);
  assert.match(echoes[0].text, /43 YEARS AFTER/i);
  assert.match(project.summary, /Pelagos/i);
});

test("manual layouts visibly report missing required routes", () => {
  let state = createResearchLatticeState();
  state = selectResearchProject(state, "auxiliary-power-routing");
  state = setResearchAutoRoute(state, false);
  assert.equal(
    state.routes[0].sourceId,
    "calibration-data",
    "manual mode begins from the safe auto layout",
  );
  state = configureResearchRoute(state, 0, null, null);
  const status = getResearchNetworkStatus(state, { powerAvailable: 99 });

  assert.deepEqual(status.missingInputs, ["calibration-data"]);
  assert.equal(status.progressPerSecond, 0);
  assert.match(status.stalledReason ?? "", /route/i);
});

test("research eras reveal through prerequisites instead of exposing the whole tree", () => {
  const fresh = createResearchLatticeState();
  assert.deepEqual(getAvailableResearchEras(fresh).map((era) => era.id), ["recovery"]);
  const progressing = {
    ...fresh,
    completedProjectIds: [
      "auxiliary-power-routing",
      "closed-loop-atmosphere",
      "continuity-index",
      "adaptive-instruction",
    ] as typeof fresh.completedProjectIds,
  };
  assert.ok(getAvailableResearchEras(progressing).some((era) => era.id === "integration"));
  assert.equal(getAvailableResearchEras(progressing).some((era) => era.id === "convergence"), false);
});

test("on-duty stage expertise is meaningful but bounded", () => {
  let state = createResearchLatticeState();
  state = addResearchInputs(state, { "calibration-data": 100 });
  state = setResearchCrew(state, MAX_RESEARCH_CREW, MAX_RESEARCH_CREW);
  state = selectResearchProject(state, "auxiliary-power-routing");
  const base = getResearchNetworkStatus(state, {
    powerAvailable: 100,
    crewAvailable: MAX_RESEARCH_CREW,
  });
  const mastered = getResearchNetworkStatus(state, {
    powerAvailable: 100,
    crewAvailable: MAX_RESEARCH_CREW,
    expertise: { research: 100 },
  });
  assert.equal(mastered.stage, "theory");
  assert.equal(mastered.expertiseMultiplier, 1.35);
  assert.ok(mastered.progressPerSecond > base.progressPerSecond);
  assert.ok(mastered.progressPerSecond <= base.progressPerSecond * 1.35 + 1e-8);
});

test("advanced eras require an actual research lead", () => {
  let state = createResearchLatticeState();
  state = {
    ...state,
    completedProjectIds: RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id).filter(
      (id) => id !== "recursive-manufacturing",
    ),
  };
  state = addResearchInputs(state, {
    "engineering-models": 2_000,
    schematics: 500,
    "null-traces": 500,
  });
  state = setResearchCrew(state, MAX_RESEARCH_CREW, MAX_RESEARCH_CREW);
  state = selectResearchProject(state, "recursive-manufacturing");
  const unstaffed = getResearchNetworkStatus(state, {
    powerAvailable: 100,
    crewAvailable: MAX_RESEARCH_CREW,
  });
  const staffed = getResearchNetworkStatus(state, {
    powerAvailable: 100,
    crewAvailable: MAX_RESEARCH_CREW,
    leadResearcherLevel: 5,
  });
  assert.match(unstaffed.stalledReason ?? "", /level-5/i);
  assert.ok(staffed.progressPerSecond > 0);
});

test("repeatable field studies scale, cap, and retain their first unlock", () => {
  let state = createResearchLatticeState();
  state = {
    ...state,
    completedProjectIds: RESEARCH_PROJECT_DEFINITIONS.map((project) => project.id).filter(
      (id) => id !== "equipment-stress-tests",
    ),
  };
  state = addResearchInputs(state, {
    "engineering-models": 1_000,
    schematics: 500,
  });
  state = setResearchCrew(state, MAX_RESEARCH_CREW, MAX_RESEARCH_CREW);
  state = selectResearchProject(state, "equipment-stress-tests");
  const firstWork = getResearchProjectWorkRequired(
    state,
    RESEARCH_PROJECT_DEFINITIONS.find((project) => project.id === "equipment-stress-tests")!,
  );
  const result = advanceResearch(state, 20_000, {
    powerAvailable: 100,
    crewAvailable: MAX_RESEARCH_CREW,
    leadResearcherLevel: 5,
  });
  assert.equal(result.completedProjectId, "equipment-stress-tests");
  assert.equal(getResearchRepeatCount(result.state, "equipment-stress-tests"), 1);
  assert.equal(canStartResearchProject(result.state, "equipment-stress-tests"), true);
  const project = RESEARCH_PROJECT_DEFINITIONS.find((candidate) => candidate.id === "equipment-stress-tests")!;
  assert.ok(getResearchProjectWorkRequired(result.state, project) > firstWork);
  assert.ok((getResearchProjectCosts(result.state, project).schematics ?? 0) > 120);
});

test("fresh Cold Wake through Cinder has a bounded, obtainable research chain", () => {
  const required = new Set<string>();
  const collect = (projectId: string) => {
    if (required.has(projectId)) return;
    const project = RESEARCH_PROJECT_DEFINITIONS.find((candidate) => candidate.id === projectId);
    assert.ok(project, `missing campaign research ${projectId}`);
    required.add(projectId);
    project.prerequisites.forEach(collect);
  };
  CAMPAIGN_WORLDS.filter((world) => world.chapter <= 3).forEach((world) =>
    world.requiredResearchIds.forEach(collect),
  );
  const chain = [...required].map((id) =>
    RESEARCH_PROJECT_DEFINITIONS.find((project) => project.id === id)!,
  );
  assert.ok(chain.length >= 8, "the route is no longer a tiny research checklist");
  assert.ok(chain.every((project) => {
    const era = getResearchProjectEra(project);
    return era !== "synthesis" && era !== "convergence";
  }));
  assert.ok(
    chain.every((project) => !project.costs.schematics && !project.costs["axiom-proofs"]),
    "required pre-Cinder research cannot depend on expedition-only or recalibration-only evidence",
  );
  for (const project of chain) {
    const conservativeThroughput = getResearchProjectEra(project) === "integration" ? 0.8 : 0.35;
    assert.ok(
      project.workRequired / conservativeThroughput <= 2 * 3_600,
      `${project.name} exceeds the two-hour active-work ceiling`,
    );
  }
  const baseline = RESEARCH_PROJECT_DEFINITIONS.find(
    (project) => project.id === "null-signal-baseline",
  )!;
  const firstCrisisCache = 20;
  const pelagosNullPerHour = 0.0015 * 3_600;
  assert.ok(
    ((baseline.costs["null-traces"] ?? 0) - firstCrisisCache) / pelagosNullPerHour <= 8,
    "the first Null gate must remain below one offline session after Cold Wake's cache",
  );
});
