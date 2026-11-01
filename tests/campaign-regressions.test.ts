import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneGameState,
  createInitialState,
  departCurrentWorld,
  getArkRescueQuote,
  getRecalibrationGain,
  getResearchLeadStatus,
  recalibrate,
  releaseSurvivorSignal,
  simulateGame,
  type GameState,
} from "../app/game-engine.ts";
import { createQaCheckpoint } from "../app/qa-sandbox-engine.ts";
import {
  ARK_CREW_HARD_CAP,
  advanceSurvivorSystem,
  getSurvivorRarity,
  getSurvivorSkillLevel,
  type Survivor,
} from "../app/survivor-engine.ts";
import { beginTransit } from "../app/transit-engine.ts";

const NOW = 1_800_000_000_000;

function withDecodedSignal(state: GameState) {
  const next = cloneGameState(state);
  for (let step = 0; step < 200 && !next.survivors.activeSignal; step += 1) {
    next.survivors = advanceSurvivorSystem(next.survivors, 600);
  }
  assert.ok(next.survivors.activeSignal, "the beacon should decode a signal");
  return next;
}

function fillArkPastSignal(state: GameState) {
  const next = cloneGameState(state);
  const groupSize = next.survivors.activeSignal!.survivors.length;
  const template = next.survivors.survivors[0]!;
  // One more person than the group can fit beside: the rescue is impossible.
  const crewSize = ARK_CREW_HARD_CAP - groupSize + 1;
  while (next.survivors.survivors.length < crewSize) {
    const index = next.survivors.survivors.length;
    next.survivors.survivors.push({
      ...structuredClone(template),
      id: `full-ark-${index}`,
      name: `Full Ark ${index}`,
      callsign: "",
    });
  }
  return next;
}

test("a signal that cannot fit the 48-person Ark can be released so departure is never locked", () => {
  const full = fillArkPastSignal(withDecodedSignal(createQaCheckpoint(2, NOW)));
  const crew = full.survivors.survivors.length;
  assert.equal(getArkRescueQuote(full).reason, "roster-full");
  assert.equal(departCurrentWorld(full, NOW).reason, "survivor-signal-pending");

  const released = releaseSurvivorSignal(full);
  assert.equal(released.survivors.activeSignal, null);
  assert.equal(released.survivors.survivors.length, crew);
  assert.ok(full.survivors.activeSignal, "the original state is not mutated");
  assert.notEqual(departCurrentWorld(released, NOW).reason, "survivor-signal-pending");
  assert.strictEqual(releaseSurvivorSignal(released), released);
});

function inViridiaCorridor() {
  const state = createInitialState(0);
  state.missions.currentIndex = 2;
  state.missions.statuses = ["saved", "saved", "active", "locked", "locked", "locked"];
  state.missions.worldsSaved = 2;
  state.settlement.completedWorldIds = ["cold-wake", "pelagos"];
  state.settlement.currentWorldId = null;
  state.transit = beginTransit(state.transit, "pelagos", "viridia", 0, false, 1_000);
  state.lifetimeAxioms = 3;
  state.axioms = 3;
  state.runFlux = 1e15;
  state.maxFlux = 1e15;
  return state;
}

test("Recalibrating mid-corridor keeps the journey, and the Ark still arrives", () => {
  const state = inViridiaCorridor();
  state.bioadaptation.completedProcedures = 2;
  assert.ok(getRecalibrationGain(state) >= 1, "precondition: Recalibration is available in transit");

  const recalibrated = recalibrate(state, 2_000);
  assert.notStrictEqual(recalibrated, state);
  assert.deepEqual(recalibrated.transit, state.transit);
  assert.notStrictEqual(recalibrated.transit, state.transit);
  assert.equal(recalibrated.bioadaptation.completedProcedures, 2);
  assert.equal(recalibrated.settlement.currentWorldId, null);

  const total = recalibrated.transit.active!.totalSeconds;
  const arrived = simulateGame(recalibrated, total + 1, 10);
  assert.equal(arrived.transit.active, null);
  assert.equal(arrived.settlement.currentWorldId, "viridia");
  assert.equal(departCurrentWorld(arrived, 3_000).reason === "campaign-complete", false);
});

function makeStandard(survivor: Survivor) {
  survivor.rarityFloor = null;
  survivor.storyHookId = null;
  for (const role of Object.keys(survivor.aptitudes) as (keyof Survivor["aptitudes"])[]) {
    survivor.aptitudes[role] = 1;
  }
  survivor.traits = survivor.traits.slice(0, 1);
  survivor.adaptability = 1;
}

function researchPair() {
  const state = cloneGameState(createQaCheckpoint(5, NOW));
  const researchers = state.survivors.survivors.filter(
    (survivor) => survivor.ageGroup !== "child",
  );
  const [veteran, prodigy] = researchers;
  assert.ok(veteran && prodigy);
  for (const survivor of [veteran, prodigy]) {
    survivor.assignedRole = "researcher";
    survivor.health = 100;
    survivor.injury = null;
  }
  veteran.skillXp.researcher = 120 * 81; // level 10
  makeStandard(veteran);
  prodigy.skillXp.researcher = 120 * 64; // level 9
  makeStandard(prodigy);
  prodigy.rarityFloor = "exceptional";
  state.survivors.survivors = [veteran, prodigy];
  return { state, veteran, prodigy };
}

test("a higher-level Standard researcher never hides the on-duty Exceptional Convergence lead", () => {
  const { state, veteran, prodigy } = researchPair();
  assert.equal(getSurvivorSkillLevel(veteran, "researcher"), 10);
  assert.equal(getSurvivorRarity(veteran).id, "standard");
  assert.equal(getSurvivorSkillLevel(prodigy, "researcher"), 9);
  assert.equal(getSurvivorRarity(prodigy).id, "exceptional");

  const lead = getResearchLeadStatus(state);
  assert.equal(lead.level, 9);
  assert.equal(lead.exceptional, true);
  assert.equal(lead.name, prodigy.callsign || prodigy.name);
});

test("without a Convergence-qualified researcher the highest level still leads", () => {
  const { state, veteran, prodigy } = researchPair();
  prodigy.skillXp.researcher = 120 * 25; // level 6: Exceptional, but not yet a Convergence lead
  const lead = getResearchLeadStatus(state);
  assert.equal(lead.level, 10);
  assert.equal(lead.exceptional, false);
  assert.equal(lead.name, veteran.callsign || veteran.name);
});
