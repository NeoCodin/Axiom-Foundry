import assert from "node:assert/strict";
import test from "node:test";
import {
  drillTrainees,
  enrolCiviliansInTraining,
  getIdleCivilianRecruits,
  sanitizeSurvivorSystemState,
  startSurvivorTraining,
} from "../app/survivor-engine.ts";

/** A ship with every kind of person the combat simulator's intake must sort through. */
function shipOfCandidates(trainingSlots = 2) {
  const person = (id: string, extra: Record<string, unknown>) => ({
    id,
    name: id,
    callsign: "",
    origin: "pelagos",
    backgroundId: "civic-volunteer",
    role: "civilian",
    aptitudes: { security: 2 },
    adaptability: 3,
    traits: ["adaptable"],
    skillXp: {},
    assignedRole: null,
    ageGroup: "adult",
    ...extra,
  });
  return sanitizeSurvivorSystemState({
    rngState: 1,
    trainingSlots,
    survivors: [
      person("willing", {}),
      person("keen", { aptitudes: { security: 5 } }),
      person("elder", { ageGroup: "elder", aptitudes: { security: 5 } }),
      person("child", { ageGroup: "child", aptitudes: { security: 5 } }),
      person("hurt", { health: 20, aptitudes: { security: 5 } }),
      person("away", { aptitudes: { security: 5 } }),
      person("working", { assignedRole: "civilian", aptitudes: { security: 5 } }),
      person("engineer", { role: "engineer", skillXp: { engineer: 200 }, aptitudes: { security: 5 } }),
    ],
  });
}

test("the simulator's intake is idle adult civilians, best suited first", () => {
  const state = shipOfCandidates();
  const recruits = getIdleCivilianRecruits(state, "security", new Set(["away"]));
  assert.deepEqual(recruits.map((survivor) => survivor.id), ["keen", "willing"]);
});

test("sending civilians in fills the free training slots with Security trainees, no more", () => {
  const two = enrolCiviliansInTraining(shipOfCandidates(2), "security", new Set(["away"]));
  assert.deepEqual(two.training.map((program) => [program.survivorId, program.targetRole]), [["keen", "security"], ["willing", "security"]]);
  const one = enrolCiviliansInTraining(shipOfCandidates(1), "security", new Set(["away"]));
  assert.deepEqual(one.training.map((program) => program.survivorId), ["keen"]);
  const full = enrolCiviliansInTraining(one, "security", new Set(["away"]));
  assert.equal(full, one, "nothing changes with every slot in use");
});

test("a drill advances Security trainees only, and finishes them as soldiers", () => {
  let state = startSurvivorTraining(shipOfCandidates(2), "keen", "security");
  state = startSurvivorTraining(state, "willing", "doctor");
  const drilled = drillTrainees(state, "security", 120);
  const progress = (of: typeof state, id: string) => of.training.find((program) => program.survivorId === id)?.progressSeconds;
  assert.equal(progress(drilled, "keen"), 120);
  assert.equal(progress(drilled, "willing"), 0, "a doctor in training is not drilled");
  assert.equal(progress(state, "keen"), 0, "the state it was given is untouched");

  let finished = drilled;
  while (finished.training.some((program) => program.survivorId === "keen")) finished = drillTrainees(finished, "security", 900);
  const keen = finished.survivors.find((survivor) => survivor.id === "keen")!;
  assert.equal(keen.role, "security");
  assert.ok(keen.skillXp.security > 0);
  assert.equal(finished.completedTrainings, state.completedTrainings + 1);
});

test("a drill is bounded, and does nothing with nobody to drill", () => {
  const state = startSurvivorTraining(shipOfCandidates(2), "willing", "security");
  assert.ok(state.training[0]!.durationSeconds > 15 * 60, "a long enough programme to see the bound");
  const huge = drillTrainees(state, "security", 1e9);
  assert.equal(huge.training[0]?.progressSeconds, 15 * 60);
  const empty = shipOfCandidates();
  assert.equal(drillTrainees(empty, "security", 120), empty);
  assert.equal(drillTrainees(state, "security", -5), state);
  assert.equal(drillTrainees(state, "security", Number.NaN), state);
});
