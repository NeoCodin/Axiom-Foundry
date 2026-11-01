import assert from "node:assert/strict";
import test from "node:test";
import {
  DECK_ORDER,
  DOOR_HALF_WIDTH,
  buildWalkLayout,
  compartmentAt,
  isWalkable,
  moveWithin,
} from "../app/ark-walk-layout.ts";

const rooms = [
  { kind: "fabrication", label: "Fabrication", online: true },
  { kind: "habitation", label: "Habitation Ring", online: true },
  { kind: "research", label: "Analysis Core", online: false },
  { kind: "bridge", label: "Continuity Bridge", online: true },
] as const;

test("the deck runs stern to bow with a doorway between every compartment", () => {
  const layout = buildWalkLayout(rooms);
  assert.deepEqual(layout.compartments.map((room) => room.kind), DECK_ORDER);
  assert.equal(layout.doorways.length, DECK_ORDER.length - 1);
  for (let index = 1; index < layout.compartments.length; index += 1) {
    assert.ok(layout.compartments[index].x0 > layout.compartments[index - 1].x1, "a bulkhead separates rooms");
  }
  assert.equal(layout.compartments.find((room) => room.kind === "research")?.online, false);
  assert.equal(layout.compartments.find((room) => room.kind === "chamber")?.online, true, "the Law-Heart chamber is always lit");
});

test("the drone starts somewhere it can stand", () => {
  const layout = buildWalkLayout(rooms);
  assert.ok(isWalkable(layout, layout.spawn.x, layout.spawn.z));
  assert.equal(compartmentAt(layout, layout.spawn.x)?.kind, "fabrication");
});

test("walls, bulkheads and furniture stop the drone; doorways let it through", () => {
  const layout = buildWalkLayout(rooms);
  const door = layout.doorways[0];
  const doorX = (door.x0 + door.x1) / 2;
  assert.ok(isWalkable(layout, doorX, 0), "the doorway is open");
  assert.ok(!isWalkable(layout, doorX, DOOR_HALF_WIDTH + 0.5), "the bulkhead beside it is solid");
  assert.ok(!isWalkable(layout, 3, layout.halfDepth + 0.1), "the hull wall is solid");
  assert.ok(!isWalkable(layout, layout.heart.x, layout.heart.z), "the Law-Heart pedestal is solid");
  assert.ok(!isWalkable(layout, layout.heart.x + 2.8, 2.8), "the chamber pillars are solid");
  assert.ok(!isWalkable(layout, -1, 0), "nothing behind the stern");
  assert.ok(!isWalkable(layout, layout.length + 1, 0), "nothing beyond the bow");
});

test("moving into a wall slides along it instead of sticking", () => {
  const layout = buildWalkLayout(rooms);
  const start = { x: 4, z: layout.halfDepth - 0.35 };
  const moved = moveWithin(layout, start.x, start.z, 0.2, 0.2);
  assert.equal(moved.z, start.z, "blocked across the wall");
  assert.ok(moved.x > start.x, "still slides along it");
});

test("the whole deck can be walked end to end through the doorways", () => {
  const layout = buildWalkLayout(rooms);
  let position = { x: layout.spawn.x, z: 0 };
  for (let step = 0; step < 2_000 && position.x < layout.length - 2; step += 1) {
    const next = moveWithin(layout, position.x, position.z, 0.05, -position.z * 0.2);
    if (next.x === position.x) {
      // Blocked by furniture: sidestep and try again, as a player would.
      position = moveWithin(layout, position.x, position.z, 0, 0.05);
      continue;
    }
    position = next;
  }
  assert.equal(compartmentAt(layout, position.x)?.kind, "bridge");
});
