import assert from "node:assert/strict";
import test from "node:test";
import {
  DOOR_HALF_WIDTH,
  DOCK_SCENES,
  LOWER_DECK,
  UPPER_DECK,
  buildWalkLayout,
  compartmentAt,
  isWalkable,
  liftAt,
  moveWithin,
  dockMoment,
  wallPieces,
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

test("the chamber lines up on both decks and holds the heart between them", () => {
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
  for (const deck of [upper, lower]) {
    assert.ok(!isWalkable(deck, layout.heart.x + 2, layout.heart.z + 2), "the sealed core room keeps the drone off the Law-Heart");
    assert.ok(isWalkable(deck, layout.heart.x, layout.core.z1 + 1.2), "the gallery beside the core is open");
  }
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

test("the launch bay is never open to space and to the ship at once", () => {
  const layout = buildWalkLayout(rooms);
  const lower = layout.decks[1];
  assert.ok(isWalkable(lower, layout.dock.exit.x, layout.dock.exit.z), "the team walks out of the dock by an open door");
  const gap = layout.dock.blastDoor;
  const gapZ = (gap.z0 + gap.z1) / 2;
  assert.ok(isWalkable(lower, (gap.x0 + gap.x1) / 2, gapZ), "the blast-door gap is the way into the bay");
  assert.ok(!isWalkable(lower, gap.x0 - 2, gapZ), "the pressure wall beside it is solid");
  for (const scene of ["departure", "arrival"] as const) {
    for (let elapsed = 0; elapsed <= DOCK_SCENES[scene] + 500; elapsed += 100) {
      const moment = dockMoment(scene, elapsed);
      if (moment.hullDoors > 0) assert.equal(moment.blastDoors, 1, scene + " at " + elapsed + " ms: open to space only while sealed");
      if (moment.ship.out > 0 && moment.ship.out < 1) assert.ok(moment.hullDoors > 0.99, scene + " at " + elapsed + " ms: the ship only passes open doors");
    }
    const end = dockMoment(scene, DOCK_SCENES[scene]);
    assert.equal(end.done, true);
    assert.equal(end.blastDoors, 0, scene + " ends with the bay open to the ship again");
    assert.equal(end.hullDoors, 0, scene + " ends with the hull doors shut");
  }
  assert.equal(dockMoment("departure", DOCK_SCENES.departure).ship.out, 1, "after departure the ship is gone");
  assert.equal(dockMoment("arrival", DOCK_SCENES.arrival).ship.out, 0, "after arrival it is home on its pad");
  assert.equal(dockMoment("arrival", DOCK_SCENES.arrival).ship.lift, 0);
});

test("the core room cannot be crossed: the gallery round it is the only way from door to door", () => {
  const layout = buildWalkLayout(rooms);
  for (const deck of layout.decks) {
    const chamber = deck.compartments.find((room) => room.kind === "chamber")!;
    const straightThrough = Array.from({ length: 40 }, (_, step) => chamber.x0 + 0.5 + (step / 39) * (chamber.x1 - chamber.x0 - 1));
    assert.ok(straightThrough.some((x) => !isWalkable(deck, x, 0, 0.35)), "the middle line is blocked");
  }
});

test("a wall is split round its windows with nothing missing and nothing doubled", () => {
  const holes = [
    { a0: 2, a1: 4, y0: 1, y1: 3 },
    { a0: 6, a1: 8, y0: 1, y1: 3 },
    { a0: 2, a1: 8, y0: 6, y1: 8 },
  ];
  const pieces = wallPieces(0, 10, 10, holes);
  const area = (rects: { a0: number; a1: number; y0: number; y1: number }[]) =>
    rects.reduce((sum, rect) => sum + (rect.a1 - rect.a0) * (rect.y1 - rect.y0), 0);
  assert.equal(area(pieces) + area(holes), 100);
  for (const piece of pieces) {
    assert.ok(piece.a1 > piece.a0 && piece.y1 > piece.y0);
    for (const hole of holes) {
      const overlaps = piece.a0 < hole.a1 && piece.a1 > hole.a0 && piece.y0 < hole.y1 && piece.y1 > hole.y0;
      assert.ok(!overlaps, "no wall across a window");
    }
  }
  assert.deepEqual(wallPieces(0, 5, 3, []), [{ a0: 0, a1: 5, y0: 0, y1: 3 }]);
});
