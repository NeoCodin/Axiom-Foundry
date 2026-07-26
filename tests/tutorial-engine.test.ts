import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  COLD_WAKE_DEPARTURE_STAGE,
  COLD_WAKE_NAVIGATION_STAGE,
  PELAGOS_TOW_STAGE,
  type GameState,
} from "../app/game-engine.ts";
import {
  createQaCheckpoint,
  createQaPelagosOnboardingCheckpoint,
  createQaPlanetIntroductionCheckpoint,
  createQaTransitCheckpoint,
} from "../app/qa-sandbox-engine.ts";
import { CONTEXT_GUIDES, TOUR_STEPS, type ContextGuideId } from "../app/story-content.ts";
import {
  getDestinationIntroduction,
  getPendingContextGuideId,
} from "../app/tutorial-engine.ts";

function withCompleted(
  state: GameState,
  ...ids: ContextGuideId[]
): GameState {
  return {
    ...state,
    settings: {
      ...state.settings,
      completedGuideIds: [
        ...new Set([...state.settings.completedGuideIds, ...ids]),
      ],
    },
  };
}

test("Cold Wake destination handoffs and contextual lessons stay chronological", () => {
  let state = createQaPlanetIntroductionCheckpoint(1_000_000);
  assert.equal(getDestinationIntroduction(state)?.id, "continuity");

  state = {
    ...state,
    settings: { ...state.settings, continuityIntroduced: true },
  };
  assert.equal(getPendingContextGuideId(state, "settlement"), "cold-wake-continuity");
  assert.equal(getPendingContextGuideId(state, "engineering"), null);

  state = withCompleted(state, "cold-wake-continuity");
  state = {
    ...state,
    settings: { ...state.settings, coldWakeForecastReviewed: true },
  };
  assert.equal(getDestinationIntroduction(state)?.id, "foundry");

  state = {
    ...state,
    settings: { ...state.settings, foundryIntroduced: true },
  };
  assert.equal(getPendingContextGuideId(state, "engineering"), "cold-wake-foundry");

  state = withCompleted(state, "cold-wake-foundry");
  state = {
    ...state,
    missions: { ...state.missions, stageIndex: COLD_WAKE_NAVIGATION_STAGE },
  };
  assert.equal(getDestinationIntroduction(state)?.id, "ark-overview");

  state = {
    ...state,
    settings: { ...state.settings, arkOverviewIntroduced: true },
  };
  assert.equal(getPendingContextGuideId(state, "deck"), "cold-wake-ark");

  state = withCompleted(state, "cold-wake-ark");
  state = {
    ...state,
    missions: { ...state.missions, stageIndex: COLD_WAKE_DEPARTURE_STAGE },
  };
  assert.equal(getDestinationIntroduction(state)?.id, "departure");

  state = {
    ...state,
    settings: { ...state.settings, departureIntroduced: true },
  };
  assert.equal(getPendingContextGuideId(state, "settlement"), "cold-wake-departure");
});

test("Pelagos teaches arrival, first contact, Foundry, people, and advanced systems in order", () => {
  let state = createQaPelagosOnboardingCheckpoint(1_000_000);
  assert.equal(getPendingContextGuideId(state, "settlement"), null);
  assert.equal(getPendingContextGuideId(state, "deck"), "pelagos-arrival");

  state = withCompleted(state, "pelagos-arrival");
  assert.equal(
    getPendingContextGuideId(state, "engineering"),
    "pelagos-foundry-expansion",
  );
  assert.equal(getPendingContextGuideId(state, "settlement"), "pelagos-sos");

  state = withCompleted(state, "pelagos-sos", "pelagos-foundry-expansion");
  state = {
    ...state,
    settings: { ...state.settings, personnelIntroduced: true },
  };
  assert.equal(getPendingContextGuideId(state, "population"), "pelagos-personnel");

  state = withCompleted(state, "pelagos-personnel");
  assert.equal(getPendingContextGuideId(state, "population"), "pelagos-support");

  state = withCompleted(state, "pelagos-support");
  assert.equal(getPendingContextGuideId(state, "medical"), "pelagos-medical");

  state = {
    ...state,
    lifetimeAxioms: 4,
    missions: { ...state.missions, stageIndex: PELAGOS_TOW_STAGE },
  };
  assert.equal(
    getPendingContextGuideId(state, "engineering"),
    "pelagos-gravity-ferry",
  );
  state = withCompleted(state, "pelagos-gravity-ferry");
  assert.equal(getPendingContextGuideId(state, "engineering"), "pelagos-protocols");
  state = withCompleted(state, "pelagos-protocols");
  assert.equal(
    getPendingContextGuideId(state, "engineering"),
    "pelagos-recalibration",
  );
  state = withCompleted(state, "pelagos-recalibration");
  assert.equal(getPendingContextGuideId(state, "engineering"), "pelagos-automation");
});

test("later first-use guides wait until their actual facilities are unlocked", () => {
  const transit = createQaTransitCheckpoint(1, 1_000_000);
  assert.equal(getPendingContextGuideId(transit, "defense"), "transit-defense");

  const nox = createQaCheckpoint(4, 1_000_000);
  assert.equal(getPendingContextGuideId(nox, "armory"), "frontier-armory");

  const vesper = createQaCheckpoint(5, 1_000_000);
  const withoutDroneGuide = {
    ...vesper,
    settings: {
      ...vesper.settings,
      completedGuideIds: vesper.settings.completedGuideIds.filter(
        (id) => id !== "synthesis-drones",
      ),
    },
  };
  assert.equal(
    getPendingContextGuideId(withoutDroneGuide, "engineering"),
    "synthesis-drones",
  );
});

test("every tutorial step points to a rendered guide target", () => {
  const appDirectory = join(process.cwd(), "app");
  const source = [
    "ark-deck.tsx",
    "armory-console.tsx",
    "axiom-law-heart.tsx",
    "defense-console.tsx",
    "expedition-console.tsx",
    "foundry-law-heart.tsx",
    "game-command-bar.tsx",
    "medical-console.tsx",
    "page.tsx",
    "population-console.tsx",
    "research-lattice.tsx",
    "settlement-console.tsx",
  ]
    .map((file) => readFileSync(join(appDirectory, file), "utf8"))
    .join("\n");
  const targets = [
    ...TOUR_STEPS.map((step) => step.target),
    ...Object.values(CONTEXT_GUIDES).flatMap((steps) =>
      steps.map((step) => step.target),
    ),
  ];

  for (const target of new Set(targets)) {
    assert.ok(
      source.includes(`data-guide-target="${target}"`) ||
        source.includes(`? "${target}"`) ||
        source.includes(`: "${target}"`),
      `missing rendered tutorial target: ${target}`,
    );
  }
});
