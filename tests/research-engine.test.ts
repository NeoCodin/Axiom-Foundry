import assert from "node:assert/strict";
import test from "node:test";

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
  getResearchNetworkStatus,
  getResearchNullEchoes,
  getResearchProjectPresentation,
  getResearchProjectProgress,
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

  assert.equal(state.schema, 1);
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
  assert.equal(state.progress["auxiliary-power-routing"], 90);
  assert.equal(state.progress["closed-loop-atmosphere"], 240);
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
  state = addResearchInputs(state, { "calibration-data": 48 });
  state = setResearchCrew(state, 3, 3);
  state = selectResearchProject(state, "auxiliary-power-routing");
  const result = advanceResearch(state, 1_000, {
    powerAvailable: 100,
    crewAvailable: 3,
  });

  assert.equal(result.completedProjectId, "auxiliary-power-routing");
  assert.equal(result.state.activeProjectId, null);
  assert.equal(getResearchProjectProgress(result.state, "auxiliary-power-routing"), 1);
  assert.ok(Math.abs(result.consumed["calibration-data"] - 48) < 1e-7);
  assert.ok(result.state.inventory["calibration-data"] < 1e-7);
  assert.ok(getResearchCapabilities(result.state).includes("auxiliary-grid"));
  assert.equal(getResearchBonuses(result.state).productionMultiplier, 1.04);
});

test("research stops cleanly when an input is exhausted", () => {
  let state = createResearchLatticeState();
  state = addResearchInputs(state, { "calibration-data": 4.8 });
  state = selectResearchProject(state, "auxiliary-power-routing");
  const result = advanceResearch(state, 50_000, { powerAvailable: 100 });

  assert.ok(Math.abs(result.progressedWork - 9) < 1e-7);
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
