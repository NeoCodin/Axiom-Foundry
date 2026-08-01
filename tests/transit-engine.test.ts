import assert from "node:assert/strict";
import test from "node:test";

import {
  TRANSIT_ROUTE_BASE_SECONDS,
  advanceTransit,
  beginTransit,
  createTransitState,
  getTransitProgress,
  sanitizeTransitState,
} from "../app/transit-engine.ts";

test("frontier routes take real time and navigation produces a bounded departure solution", () => {
  const base = createTransitState();
  const standard = beginTransit(base, "cinder", "nox", 0, false, 100);
  const skilled = beginTransit(base, "cinder", "nox", 10, true, 100);
  assert.equal(standard.active?.baseSeconds, TRANSIT_ROUTE_BASE_SECONDS.cinder);
  assert.ok((skilled.active?.totalSeconds ?? Infinity) < (standard.active?.totalSeconds ?? 0));
  assert.ok((skilled.active?.totalSeconds ?? 0) >= (standard.active?.totalSeconds ?? 0) / 1.55 - 1);
});

test("travel advances identically offline and arrival clears only the journey", () => {
  const started = beginTransit(createTransitState(), "pelagos", "viridia", 4, false, 1_000);
  const total = started.active!.totalSeconds;
  const oneShot = advanceTransit(started, total);
  let chunked = started;
  for (let elapsed = 0; elapsed < total; elapsed += 60) {
    chunked = advanceTransit(chunked, Math.min(60, total - elapsed)).state;
  }
  assert.equal(oneShot.arrivedWorldId, "viridia");
  assert.equal(oneShot.state.active, null);
  assert.deepEqual(oneShot.state, chunked);
  assert.ok(oneShot.state.completedRoutes.includes("pelagos->viridia"));
});

test("transit progress is readable and malformed routes cannot skip worlds", () => {
  const state = beginTransit(createTransitState(), "viridia", "cinder", 2, true, 50);
  const progressed = advanceTransit(state, state.active!.totalSeconds / 2).state;
  const status = getTransitProgress(progressed)!;
  assert.ok(status.progress > 0.49 && status.progress < 0.51);
  assert.equal(status.originName, "Viridia");
  assert.equal(status.destinationName, "Cinder");

  const malformed = sanitizeTransitState({
    active: {
      originWorldId: "pelagos",
      destinationWorldId: "nox",
      elapsedSeconds: -4,
      totalSeconds: 1,
    },
    completedRoutes: ["pelagos->viridia", 7, "pelagos->viridia"],
  });
  assert.equal(malformed.active, null);
  assert.deepEqual(malformed.completedRoutes, ["pelagos->viridia"]);
});
