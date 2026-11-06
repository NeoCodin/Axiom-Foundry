import assert from "node:assert/strict";
import test from "node:test";
import { LOWER_DECK, UPPER_DECK, buildWalkLayout, isWalkable, sideRoomAt } from "../app/ark-walk-layout.ts";
import { cellParts, type CellTemplate } from "../app/ark-walk-cells.ts";

const TEMPLATES: CellTemplate[] = ["lecture", "seminar", "office", "computer", "lounge", "washroom", "laundry", "gym", "ward", "store", "plant", "cleanroom"];
const rooms = [...new Set([...UPPER_DECK, ...LOWER_DECK])].map((kind) => ({ kind, label: kind, online: true }));

test("nothing in a room pokes through its walls", () => {
  for (const template of TEMPLATES) {
    for (const [width, depth] of [[6, 12], [8, 12], [10, 12], [12, 12], [14, 12]]) {
      for (const part of cellParts(template, width, depth)) {
        assert.ok(part.u - part.w / 2 >= -0.01 && part.u + part.w / 2 <= width + 0.01, `${template} at ${width}: across, ${part.u} wide ${part.w}`);
        assert.ok(part.v - part.d / 2 >= -0.01 && part.v + part.d / 2 <= depth + 0.01, `${template} at ${width}: in, ${part.v} deep ${part.d}`);
      }
    }
  }
});

test("you can walk in from the door and get round every room on the ship", () => {
  const layout = buildWalkLayout(rooms, { residents: 99, armory: true });
  const STEP = 0.4;
  layout.decks.forEach((deck) => {
    for (const room of deck.sideRooms.filter((candidate) => candidate.cell)) {
      const inRoom = (x: number, z: number) => sideRoomAt(deck, x, z)?.id === room.id && isWalkable(deck, x, z, 0.3);
      const doorX = (room.door.x0 + room.door.x1) / 2;
      const start = { x: doorX, z: room.starboard ? room.z0 + 0.6 : room.z1 - 0.6 };
      assert.ok(inRoom(start.x, start.z), `${room.id}: the way in is clear`);
      const seen = new Set(["0:0"]);
      const queue = [[0, 0]];
      let reachedBack = false;
      const far = room.starboard ? room.z1 - 2 : room.z0 + 2;
      while (queue.length > 0) {
        const [across, along] = queue.pop()!;
        if (Math.abs(start.z + along * STEP - far) < STEP) reachedBack = true;
        for (const [stepAcross, stepAlong] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const next = [across + stepAcross, along + stepAlong];
          if (seen.has(next.join(":")) || !inRoom(start.x + next[0] * STEP, start.z + next[1] * STEP)) continue;
          seen.add(next.join(":"));
          queue.push(next);
        }
      }
      assert.ok(reachedBack, `${room.id}: you can get to the back of it`);
    }
  });
});
