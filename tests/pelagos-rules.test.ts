import assert from "node:assert/strict";
import test from "node:test";
import {
  answerSignal,
  BREACHES,
  createPelagos,
  derive,
  embankmentClosed,
  index,
  inReach,
  LAWHEART,
  linkAt,
  objective,
  place,
  reclaimed,
  restore,
  serialize,
  step,
  viability,
  type PelagosState,
} from "../app/pelagos-rules.ts";

const run = (state: PelagosState, seconds: number) => {
  for (let at = 0; at < seconds * 10; at += 1) step(state, 0.1);
};
const rich = () => {
  const state = createPelagos();
  state.salvage = 1000;
  return state;
};

test("the district: sea to the east, the shelter's hill dry and inside the dome, the lowland drowned", () => {
  const state = createPelagos();
  const derived = derive(state);
  assert.equal(state.tiles[index(36, 20)].ground, "sea");
  assert.equal(state.flooded[index(LAWHEART.x, LAWHEART.y)], false, "the hill stands above the water");
  assert.ok(state.flooded[index(4, 15)], "the marsh inside the embankment is under water");
  assert.ok(derived.openSea[index(4, 15)], "and the sea reaches it through the breaches");
  for (const breach of BREACHES) assert.ok(inReach(derived, breach.x, breach.y), `breach ${breach.x},${breach.y} can be walled from the start`);
});

test("walls close the breaches; a pump then drains the lowland, and the sea stays out", () => {
  const state = rich();
  assert.equal(place(state, "pump", 5, 16), null);
  run(state, 5);
  assert.equal(reclaimed(state), 0, "with the breaches open the sea refills whatever the pump takes");
  for (const breach of BREACHES) assert.equal(place(state, "seawall", breach.x, breach.y), null);
  assert.ok(embankmentClosed(state, derive(state)));
  run(state, 60);
  assert.ok(reclaimed(state) > 60, `the lowland drains (${reclaimed(state)} tiles)`);
  assert.equal(state.flooded[index(4, 15)], false);
});

test("pushing the Lawheart doubles its power, but the dome shrinks and far walls let the sea back in", () => {
  const state = rich();
  for (const breach of BREACHES) place(state, "seawall", breach.x, breach.y);
  place(state, "pump", 5, 16);
  run(state, 60);
  const dry = reclaimed(state);
  assert.equal(derive(state).supply, 4);
  state.pushed = true;
  const pushed = derive(state);
  assert.equal(pushed.supply, 8);
  assert.ok(!inReach(pushed, 11, 12), "the north breach is outside the smaller dome");
  assert.ok(!embankmentClosed(state, pushed), "and its wall no longer holds");
  run(state, 20);
  assert.ok(reclaimed(state) < dry, "the sea comes back in");
});

test("the link fades past the dome's edge; relays carry it out over the rooftops", () => {
  const state = rich();
  const derived = derive(state);
  assert.equal(linkAt(derived, LAWHEART.x + 3, LAWHEART.y), 1, "whole inside the dome");
  const north = linkAt(derived, 17.5, 9.5);
  assert.ok(north > 0.25 && north < 1, `the first rooftop is reachable on a thin link (${north.toFixed(2)})`);
  assert.equal(linkAt(derived, 29.5, 15.5), 0, "the second is beyond it");
  assert.equal(place(state, "relay", 17, 16), null, "a relay on a rooftop at the dome's edge");
  assert.equal(place(state, "relay", 23, 16), null, "and another the first one reaches");
  assert.ok(linkAt(derive(state), 29.5, 15.5) > 0.9, "now the link reaches the far rooftop");
  assert.match(place(state, "relay", 35, 10) ?? "", /open sea/);
});

test("survivors are answered only by the drone, close by, on a link that holds; they arrive if there's room and supplies", () => {
  const state = rich();
  const [north, far] = state.signals;
  assert.equal(answerSignal(state, derive(state), north), "far", "the drone has to go there");
  state.drone = { x: 17.5, y: 10 };
  assert.equal(answerSignal(state, derive(state), north), "answered");
  state.drone = { x: 29.5, y: 16 };
  assert.equal(answerSignal(state, derive(state), far), "weak", "no link out here yet");
  run(state, 11);
  assert.equal(state.survivors, 5, "the first two reach the shelter");
});

test("nobody dies of a dry shelter; it just takes nobody in until it is supplied", () => {
  const state = createPelagos();
  run(state, 400);
  assert.equal(state.water, 0);
  assert.equal(state.survivors, 3, "still three");
  state.signals[0].answered = true;
  state.signals[0].arriveAt = state.time;
  run(state, 2);
  assert.equal(state.survivors, 3, "no one is brought into a dry shelter");
});

test("the objectives walk through the first hour, and a save comes back as it was", () => {
  const state = rich();
  assert.match(objective(state, derive(state)), /purifier/);
  place(state, "purifier", 12, 21);
  assert.match(objective(state, derive(state)), /kelp/);
  place(state, "kelp", 4, 15);
  assert.match(objective(state, derive(state)), /breaches/);
  for (const breach of BREACHES) place(state, "seawall", breach.x, breach.y);
  assert.match(objective(state, derive(state)), /pump/);
  const back = restore(serialize(state));
  assert.ok(back);
  assert.equal(back.structures.length, state.structures.length);
  assert.deepEqual(back.flooded, state.flooded);
  assert.equal(restore("not json"), null);
});

test("viability counts what the district makes, not what is left in store", () => {
  const state = rich();
  assert.equal(viability(state), 5, "three people and failing filters: barely started");
  place(state, "purifier", 12, 21);
  place(state, "kelp", 4, 15);
  assert.equal(viability(state), 55, "water and food made as fast as they're used");
});
