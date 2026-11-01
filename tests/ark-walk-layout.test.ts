import assert from "node:assert/strict";
import test from "node:test";
import {
  DOOR_HALF_WIDTH,
  DOCK_CYCLE_MS,
  LOWER_DECK,
  UPPER_DECK,
  buildWalkLayout,
  compartmentAt,
  isWalkable,
  liftAt,
  moveWithin,
  reconShipAt,
  type WalkDeck,
} from "../app/ark-walk-layout.ts";

const rooms = [
  { kind: "fabrication", label: "Fabrication", online: true },
  { kind: "support", label: "Life Support", online: true },
  { kind: "habitation", label: "Habitation Ring", online: true },
  { kind: "education", label: "Learning Deck", online: false },
  { kind: "research", label: "Analysis Core", online: false },
  { kind: "hangar", label: "Recon Dock", online: true },
  { kind: "bridge", label: "Continuity Bridge", online: true },
] as const;

test("two decks run stern to bow with a doorway between every compartment", () => {
  const layout = buildWalkLayout(rooms);
  const [upper, lower] = layout.decks;
  assert.deepEqual(upper.compartments.map((room) => room.kind), UPPER_DECK);
  assert.deepEqual(lower.compartments.map((room) => room.kind), LOWER_DECK);
  for (const deck of layout.decks) {
    assert.equal(deck.doorways.length, deck.compartments.length - 1);
    for (let index = 1; index < deck.compartments.length; index += 1) {
      assert.ok(deck.compartments[index].x0 > deck.compartments[index - 1].x1, "a bulkhead separates rooms");
    }
  }
  assert.ok(upper.floorY > lower.floorY, "the upper deck is above the lower");
  assert.equal(lower.compartments.find((room) => room.kind === "education")?.online, false);
  assert.equal(lower.compartments.find((room) => room.kind === "chamber")?.online, true, "the Law-Heart chamber is always lit");
});

test("the chamber is one atrium: it lines up on both decks and holds the heart between them", () => {
  const layout = buildWalkLayout(rooms);
  const [upperChamber, lowerChamber] = layout.decks.map((deck) => deck.compartments.find((room) => room.kind === "chamber")!);
  assert.equal(upperChamber.x0, lowerChamber.x0);
  assert.equal(upperChamber.x1, lowerChamber.x1);
  assert.equal(layout.decks[0].floorY + upperChamber.height, lowerChamber.height, "one shared ceiling");
  assert.ok(layout.heart.y > 0 && layout.heart.y < layout.decks[0].floorY + 1.5, "the heart floats where both decks can see it");
});

test("the drone starts somewhere it can stand", () => {
  const layout = buildWalkLayout(rooms);
  const deck = layout.decks[layout.spawn.deck];
  assert.ok(isWalkable(deck, layout.spawn.x, layout.spawn.z));
  assert.equal(compartmentAt(deck, layout.spawn.x)?.kind, "fabrication");
});

test("walls, bulkheads and furniture stop the drone; doorways let it through", () => {
  const layout = buildWalkLayout(rooms);
  const [upper, lower] = layout.decks;
  const door = upper.doorways[0];
  const doorX = (door.x0 + door.x1) / 2;
  assert.ok(isWalkable(upper, doorX, 0), "the doorway is open");
  assert.ok(!isWalkable(upper, doorX, DOOR_HALF_WIDTH + 0.5), "the bulkhead beside it is solid");
  assert.ok(!isWalkable(upper, 3, layout.halfDepth + 0.1), "the hull wall is solid");
  assert.ok(!isWalkable(lower, layout.heart.x, layout.heart.z), "the Law-Heart pedestal is solid");
  assert.ok(!isWalkable(upper, layout.heart.x, layout.heart.z), "no stepping off the catwalk into the atrium");
  assert.ok(isWalkable(upper, layout.heart.x, layout.atrium.z1 + 1.2), "the catwalk beside the atrium is open");
  assert.ok(!isWalkable(lower, layout.atrium.x1, layout.atrium.z1), "the chamber pillars are solid");
  assert.ok(!isWalkable(lower, layout.heart.x + 2, layout.heart.z + 2), "the containment vessel keeps the drone off the Law-Heart");
  assert.ok(!isWalkable(upper, -1, 0), "nothing behind the stern");
  assert.ok(!isWalkable(lower, lower.length + 1, 0), "nothing beyond the hangar");
});

test("every grav-lift stands somewhere the drone can reach on both decks", () => {
  const layout = buildWalkLayout(rooms);
  assert.ok(layout.lifts.length >= 1);
  for (const lift of layout.lifts) {
    for (const deck of layout.decks) assert.ok(isWalkable(deck, lift.x, lift.z, 0.35));
    assert.equal(liftAt(layout, lift.x + 0.2, lift.z), lift);
  }
  assert.equal(liftAt(layout, layout.spawn.x, layout.spawn.z), null);
});

test("moving into a wall slides along it instead of sticking", () => {
  const layout = buildWalkLayout(rooms);
  const start = { x: 4, z: layout.halfDepth - 0.35 };
  const moved = moveWithin(layout.decks[0], start.x, start.z, 0.2, 0.2);
  assert.equal(moved.z, start.z, "blocked across the wall");
  assert.ok(moved.x > start.x, "still slides along it");
});

/** Every room a drone can reach from (x, z), by flood fill over a 10 cm grid. */
function reachableRooms(deck: WalkDeck, x: number, z: number) {
  const step = 0.1;
  const key = (gx: number, gz: number) => `${gx},${gz}`;
  const start = [Math.round(x / step), Math.round(z / step)] as const;
  const seen = new Set([key(...start)]);
  const queue: (readonly [number, number])[] = [start];
  const kinds = new Set<string>();
  while (queue.length > 0) {
    const [gx, gz] = queue.pop()!;
    const kind = compartmentAt(deck, gx * step)?.kind;
    if (kind) kinds.add(kind);
    for (const [nx, nz] of [[gx + 1, gz], [gx - 1, gz], [gx, gz + 1], [gx, gz - 1]] as const) {
      if (seen.has(key(nx, nz)) || !isWalkable(deck, nx * step, nz * step, 0.35)) continue;
      seen.add(key(nx, nz));
      queue.push([nx, nz]);
    }
  }
  return kinds;
}

test("every room on each deck can be reached through its doorways", () => {
  const layout = buildWalkLayout(rooms);
  const [upper, lower] = layout.decks;
  assert.deepEqual([...reachableRooms(upper, layout.spawn.x, layout.spawn.z)].sort(), [...UPPER_DECK].sort());
  const lift = layout.lifts[0];
  assert.deepEqual([...reachableRooms(lower, lift.x, lift.z)].sort(), [...LOWER_DECK].sort());
});

test("the recon ship leaves the dock, stays away a while, and comes back to its pad", () => {
  const layout = buildWalkLayout(rooms);
  assert.ok(isWalkable(layout.decks[1], layout.dock.door.x, layout.dock.door.z), "the arrivals walk out by an open door");
  const samples = Array.from({ length: 104 }, (_, index) => reconShipAt(index * (DOCK_CYCLE_MS / 104)));
  assert.equal(samples[0].docked, true, "the cycle starts with the ship on its pad");
  assert.ok(samples.some((sample) => sample.away), "the ship spends time away at the planet");
  assert.equal(samples.at(-1)?.docked, true, "and ends back on its pad");
  for (const sample of samples) {
    assert.ok(sample.lift >= 0 && sample.lift <= 1 && sample.out >= 0 && sample.out <= 1);
    if (sample.docked) assert.equal(sample.lift + sample.out, 0, "a docked ship sits on the pad");
  }
  assert.deepEqual(reconShipAt(DOCK_CYCLE_MS * 3 + 5), reconShipAt(5), "the round trip repeats");
});
