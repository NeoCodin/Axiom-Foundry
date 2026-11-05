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
  HALF_DEPTH,
  hallFills,
  sealedSideRooms,
  INNER_WALL,
  sideRoomAt,
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

/** Every hall awake, so every room behind one can be opened. */
const awake = rooms.map((room) => ({ ...room, online: true }));

test("rooms behind the halls open through their doors, and sealed ones stay shut", () => {
  const open = buildWalkLayout(awake, { residents: 99, armory: true });
  const shut = buildWalkLayout(rooms, { residents: 0, armory: false });
  assert.ok(open.decks.every((deck) => deck.sideRooms.every((room) => room.open)), "with everyone aboard every room is open");
  for (const [deckIndex, deck] of open.decks.entries()) {
    for (const room of deck.sideRooms) {
      const doorX = (room.door.x0 + room.door.x1) / 2;
      // Straight in from the hall, through the door, to the middle of the room.
      for (let z = -HALF_DEPTH + 1; z >= room.z1 - 1.2; z -= 0.1) {
        assert.ok(isWalkable(deck, doorX, z, 0.35), `${room.id} on deck ${deckIndex}: open at ${z.toFixed(1)}`);
      }
      assert.equal(sideRoomAt(deck, doorX, room.z1 - 1)?.id, room.id);
      assert.ok(!isWalkable(deck, room.door.x0 - 0.6, room.z1 + INNER_WALL / 2, 0.3), `${room.id}: the wall beside its door is solid`);
      const sealed = shut.decks[deckIndex].sideRooms.find((candidate) => candidate.id === room.id)!;
      if (!sealed.open) {
        assert.ok(!isWalkable(shut.decks[deckIndex], doorX, room.z1 + INNER_WALL / 2, 0.3), `${room.id}: a sealed door stays shut`);
        assert.ok(!isWalkable(shut.decks[deckIndex], doorX, room.z1 - 1.5, 0.3), `${room.id}: a sealed room can't be entered`);
      }
    }
  }
});

test("cabins are lived in as people come aboard; the Armory opens once unlocked", () => {
  const open = (residents: number, armory = false) =>
    buildWalkLayout(awake, { residents, armory }).decks.flatMap((deck) => deck.sideRooms).filter((room) => room.open).map((room) => room.id);
  const cabins = (residents: number) => open(residents).filter((id) => id.startsWith("cabin"));
  assert.deepEqual(cabins(0), []);
  assert.deepEqual(cabins(1), ["cabin-0"]);
  assert.deepEqual(cabins(6), ["cabin-0", "cabin-1"]);
  assert.deepEqual(cabins(14), ["cabin-0", "cabin-1", "cabin-2"]);
  assert.ok(!open(99).includes("armory") && open(0, true).includes("armory"));
  for (const id of ["stores", "workshop", "lab", "galley", "library", "classroom", "playroom", "farm", "infirmary", "briefing"]) {
    assert.ok(open(0).includes(id), `${id} is open whenever its hall is`);
  }
  const dormant = buildWalkLayout(rooms, { residents: 99 }).decks.flatMap((deck) => deck.sideRooms);
  for (const room of dormant.filter((sideRoom) => sideRoom.section === "research" || sideRoom.section === "education")) {
    assert.ok(!room.open, `${room.id}: a dormant hall's rooms are dark`);
  }
});

test("the rooms behind a hall sit behind its wall, inside its length, and never overlap", () => {
  const layout = buildWalkLayout(awake, { residents: 99, armory: true });
  for (const deck of layout.decks) {
    for (const room of deck.sideRooms) {
      const hall = deck.compartments.find((compartment) => compartment.kind === room.section)!;
      assert.ok(room.x0 >= hall.x0 && room.x1 <= hall.x1, `${room.id} stays within its hall's length`);
      assert.ok(room.z1 <= -HALF_DEPTH - INNER_WALL + 1e-9 && room.z0 < room.z1, `${room.id} is behind the wall`);
      assert.ok(room.door.x0 >= room.x0 && room.door.x1 <= room.x1, `${room.id}'s door opens into it`);
      for (const other of deck.sideRooms) {
        if (other !== room) assert.ok(room.x1 <= other.x0 || room.x0 >= other.x1, `${room.id} and ${other.id} do not overlap`);
      }
    }
  }
});

test("rooms wait for someone to need them, and halls fill with the crew", () => {
  const nobody: { role: string; ageGroup?: string | null }[] = [];
  assert.deepEqual(sealedSideRooms(nobody, false), ["farm", "classroom", "playroom", "simulator", "briefing"]);
  assert.deepEqual(sealedSideRooms([{ role: "farmer" }, { role: "teacher" }, { role: "civilian", ageGroup: "child" }], true), []);
  assert.deepEqual(hallFills(nobody), { education: 0, support: 0 }, "no desks before a teacher, nothing growing before a farmer");
  const crew = (count: number) => Array.from({ length: count }, (_, index) => ({ role: index === 0 ? "teacher" : "farmer" }));
  assert.deepEqual([crew(5), crew(12), crew(30)].map((members) => hallFills(members).education), [1, 2, 3], "more desks as more people come aboard");
  const rooms = [...new Set<WalkRoomKind>([...UPPER_DECK, ...LOWER_DECK])].map((kind) => ({ kind, label: kind, online: true }));
  const bare = buildWalkLayout(rooms, { residents: 2, sealed: ["farm"], fills: { education: 0 } });
  assert.equal(bare.decks[1].sideRooms.find((room) => room.kind === "farm")?.open, false);
  assert.equal(bare.decks[1].compartments.find((room) => room.kind === "education")?.fill, 0);
  const full = buildWalkLayout(rooms, { residents: 40, fills: { education: 3 } });
  assert.ok(full.decks[1].blockers.length > bare.decks[1].blockers.length, "desks people have to walk round");
});

test("the Ark is big: about 150 metres long, 40 across, and the core takes up its middle", () => {
  const rooms = [...new Set<WalkRoomKind>([...UPPER_DECK, ...LOWER_DECK])].map((kind) => ({ kind, label: kind, online: true }));
  const layout = buildWalkLayout(rooms, { residents: 30 });
  const [upper, lower] = layout.decks;
  assert.ok(upper.compartments.at(-1)!.x1 > 150);
  assert.equal(upper.compartments.at(-1)!.x1, lower.compartments.at(-1)!.x1, "both decks end together");
  assert.ok(layout.core.x1 - layout.core.x0 >= 20 && layout.core.z1 - layout.core.z0 >= 26);
});
