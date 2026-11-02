import assert from "node:assert/strict";
import test from "node:test";
import { LYING, ROOM_SPOTS, SEATED } from "../app/ark-walk-crew.ts";
import { crewFootprints, decorBudget, decorSlots, furnishLayout, planDecor, type DecorPiece } from "../app/ark-walk-decor.ts";
import {
  DOOR_HALF_WIDTH,
  LOWER_DECK,
  UPPER_DECK,
  WINDOW_WIDTH,
  WINDOWS,
  buildWalkLayout,
  isWalkable,
  wallRibs,
  type Box,
  type WalkDeck,
} from "../app/ark-walk-layout.ts";

const everyRoom = [...new Set([...UPPER_DECK, ...LOWER_DECK])].map((kind) => ({ kind, label: kind, online: true }));
/** Every cabin lived in and the Armory open, so every room behind a hall is tested. */
const everything = { residents: 99, armory: true };
const key = (piece: DecorPiece) => `${piece.deck}:${piece.room}:${piece.seed}:${piece.kind}`;
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
const grow = (box: Box, by: number): Box => ({ x0: box.x0 - by, x1: box.x1 + by, z0: box.z0 - by, z1: box.z1 + by });
const blocking = (piece: DecorPiece) => piece.floor && !["rug", "cushions", "mat"].includes(piece.kind);

test("an empty ship is bare, and every new arrival only adds to what is up", () => {
  const layout = buildWalkLayout(everyRoom, everything);
  assert.equal(decorBudget(0), 0);
  assert.deepEqual(planDecor(layout, 0), []);
  let before: string[] = [];
  for (let population = 1; population <= 160; population += 1) {
    const now = planDecor(layout, population, { children: true }).map(key);
    assert.ok(now.length >= before.length, `${population} aboard: nothing comes down`);
    assert.deepEqual(now.slice(0, before.length), before, `${population} aboard: the same pieces stay up`);
    before = now;
  }
  assert.ok(planDecor(layout, 1).length >= 4, "the first arrivals make a start");
  assert.ok(planDecor(layout, 160, { children: true }).length > 60, "a full ship is well decorated");
  const early = planDecor(layout, 3);
  assert.ok(early.some((piece) => piece.room === "habitation"), "people decorate where they live first");
  assert.ok(!planDecor(layout, 8).some((piece) => piece.kind === "mural"), "murals come once there are many hands");
  assert.ok(planDecor(layout, 160).some((piece) => piece.kind === "mural"));
});

test("dormant rooms stay bare, and only children draw", () => {
  const layout = buildWalkLayout(everyRoom.map((room) => (room.kind === "education" ? { ...room, online: false } : room)));
  const pieces = planDecor(layout, 160);
  assert.ok(!pieces.some((piece) => piece.room === "education"));
  assert.ok(!pieces.some((piece) => piece.kind === "drawings"), "no children, no drawings");
  assert.ok(planDecor(buildWalkLayout(everyRoom, everything), 160, { children: true }).some((piece) => piece.kind === "drawings"));
});

test("furniture keeps clear of the walkway, the doorways, the crew and what was already there", () => {
  const layout = buildWalkLayout(everyRoom, everything);
  const marks = crewFootprints(layout);
  for (const piece of decorSlots(layout).filter(blocking)) {
    const deck = layout.decks[piece.deck];
    const room = deck.compartments.find((compartment) => compartment.kind === piece.room)!;
    const box = piece.floor!;
    const where = `${piece.room} ${piece.kind} at ${box.x0.toFixed(1)},${box.z0.toFixed(1)}`;
    assert.ok(box.x0 >= room.x0 + 0.05 && box.x1 <= room.x1 - 0.05 && box.z0 >= -layout.halfDepth && box.z1 <= layout.halfDepth, `${where}: inside its room`);
    assert.ok(box.z0 > DOOR_HALF_WIDTH + 0.5 || box.z1 < -(DOOR_HALF_WIDTH + 0.5), `${where}: off the walkway`);
    for (const blocker of deck.blockers) assert.ok(!overlaps(grow(box, 0.4), blocker), `${where}: clear of the room's own furniture`);
    for (const mark of marks.filter((spot) => spot.deck === piece.deck)) {
      const dx = Math.max(box.x0 - mark.x, 0, mark.x - box.x1);
      const dz = Math.max(box.z0 - mark.z, 0, mark.z - box.z1);
      assert.ok(Math.hypot(dx, dz) >= 0.9, `${where}: clear of where crew stand at ${mark.x.toFixed(1)},${mark.z.toFixed(1)}`);
    }
  }
});

test("with everything put up, every room and everywhere the crew stand can still be reached", () => {
  const layout = furnishLayout(buildWalkLayout(everyRoom, everything), decorSlots(layout0()));
  const step = 0.15;
  const radius = 0.35;
  const reach = (deck: WalkDeck, start: { x: number; z: number }) => {
    const cell = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
    const seen = new Set<string>([cell(start.x, start.z)]);
    const queue: [number, number][] = [[Math.round(start.x / step), Math.round(start.z / step)]];
    while (queue.length > 0) {
      const [cx, cz] = queue.pop()!;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (seen.has(`${nx},${nz}`) || !isWalkable(deck, nx * step, nz * step, radius)) continue;
        seen.add(`${nx},${nz}`);
        queue.push([nx, nz]);
      }
    }
    return (x: number, z: number) => {
      for (let ox = -2; ox <= 2; ox += 1) for (let oz = -2; oz <= 2; oz += 1) if (seen.has(`${Math.round(x / step) + ox},${Math.round(z / step) + oz}`)) return true;
      return false;
    };
  };
  layout.decks.forEach((deck, deckIndex) => {
    const reachable = reach(deck, { x: deck.compartments[0].x0 + 1.6, z: 0 });
    for (const room of deck.compartments) {
      assert.ok(reachable(room.x0 + 1, 0), `${room.kind} on deck ${deckIndex} can be reached`);
      for (const spot of ROOM_SPOTS[room.kind]) {
        if (SEATED.has(spot.activity) || LYING.has(spot.activity) || (spot.deck !== undefined && spot.deck !== deckIndex)) continue;
        assert.ok(reachable(room.x0 + spot.at.x, spot.at.z), `${room.kind} ${spot.activity} spot can be reached`);
      }
    }
  });
});

test("art hangs clear of windows, ribs, doorways, furniture tops, pipes and each other", () => {
  const layout = buildWalkLayout(everyRoom, everything);
  const walls = decorSlots(layout).filter((piece) => piece.wall);
  for (const piece of walls) {
    const spot = piece.wall!;
    const room = layout.decks[piece.deck].compartments.find((compartment) => compartment.kind === piece.room)!;
    const where = `${piece.room} ${piece.kind} at ${spot.along.toFixed(1)}`;
    assert.ok(spot.y - spot.height / 2 >= 2.3, `${where}: above the furniture`);
    assert.ok(spot.y + spot.height / 2 <= room.height - 1, `${where}: below the pipes`);
    assert.ok(spot.width > 0.8, `${where}: big enough to see`);
    const from = spot.along - spot.width / 2;
    const to = spot.along + spot.width / 2;
    if (spot.normal === "z") {
      const side = spot.plane > 0 ? "starboard" : "port";
      for (const offset of WINDOWS[room.kind]?.[side] ?? []) {
        const window = { from: room.x0 + offset - WINDOW_WIDTH / 2, to: room.x0 + offset + WINDOW_WIDTH / 2 };
        assert.ok(to <= window.from || from >= window.to, `${where}: clear of the window`);
      }
      for (const rib of wallRibs(room)) assert.ok(to <= rib - 0.2 || from >= rib + 0.2, `${where}: between the ribs`);
      for (const behind of layout.decks[piece.deck].sideRooms.filter((sideRoom) => sideRoom.section === room.kind && spot.plane < 0)) {
        assert.ok(to <= behind.door.x0 - 0.3 || from >= behind.door.x1 + 0.3, `${where}: clear of the door to the ${behind.label}`);
      }
    } else {
      assert.ok(Math.min(Math.abs(from), Math.abs(to)) >= DOOR_HALF_WIDTH + 0.5 && Math.sign(from) === Math.sign(to), `${where}: clear of the doorway`);
      assert.ok(Math.max(Math.abs(from), Math.abs(to)) <= layout.halfDepth - 0.5, `${where}: clear of the hull`);
    }
    for (const other of walls) {
      if (other === piece || other.deck !== piece.deck || other.wall!.normal !== spot.normal || Math.abs(other.wall!.plane - spot.plane) > 0.1) continue;
      const otherFrom = other.wall!.along - other.wall!.width / 2;
      const otherTo = other.wall!.along + other.wall!.width / 2;
      assert.ok(to <= otherFrom || from >= otherTo, `${where}: does not overlap ${other.kind} at ${other.wall!.along.toFixed(1)}`);
    }
  }
  for (const piece of decorSlots(layout).filter((slot) => slot.line)) {
    const room = layout.decks[piece.deck].compartments.find((compartment) => compartment.kind === piece.room)!;
    assert.ok(piece.line!.y <= room.height - 1 && piece.line!.z0 < piece.line!.z1, `${piece.room} ${piece.kind} hangs under the pipes`);
  }
});

function layout0() {
  return buildWalkLayout(everyRoom, everything);
}
