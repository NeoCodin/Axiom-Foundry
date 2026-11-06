import assert from "node:assert/strict";
import test from "node:test";
import {
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  getCrewHead,
  getCrewLook,
  getCrewPortrait,
} from "../app/crew-portrait.ts";

const ids = Array.from({ length: 60 }, (_, index) => `survivor-${index}`);
const key = (runs: ReturnType<typeof getCrewPortrait>) =>
  runs.map((run) => `${run.x},${run.y},${run.w},${run.fill}`).join("|");

test("a crew portrait is the same face every time for the same person", () => {
  const first = getCrewPortrait({ id: "bela-vale", role: "doctor", ageGroup: "adult" });
  const second = getCrewPortrait({ id: "bela-vale", role: "doctor", ageGroup: "adult" });
  assert.equal(key(first), key(second));
});

test("portraits stay inside the frame and give most people a distinct face", () => {
  const faces = new Set<string>();
  for (const id of ids) {
    const runs = getCrewPortrait({ id, role: "engineer" });
    for (const run of runs) {
      assert.ok(run.x >= 0 && run.w > 0 && run.x + run.w <= PORTRAIT_WIDTH, `${id} run inside width`);
      assert.ok(run.y >= 0 && run.y < PORTRAIT_HEIGHT, `${id} run inside height`);
    }
    faces.add(key(runs));
  }
  assert.ok(faces.size >= 55, `expected near-unique faces, got ${faces.size} of ${ids.length}`);
});

test("job, rarity and status show on the portrait", () => {
  const engineer = key(getCrewPortrait({ id: "same", role: "engineer" }));
  const doctor = key(getCrewPortrait({ id: "same", role: "doctor" }));
  assert.notEqual(engineer, doctor, "the uniform follows the job");
  const standard = key(getCrewPortrait({ id: "same", rarity: "standard" }));
  const anomalous = key(getCrewPortrait({ id: "same", rarity: "anomalous" }));
  assert.notEqual(standard, anomalous, "the frame follows rarity");
  const wounded = getCrewPortrait({ id: "same", status: "wounded" });
  assert.ok(wounded.some((run) => run.fill === "#ff707b"), "a wound mark is drawn");
});

test("children are drawn smaller than adults", () => {
  const topRow = (runs: ReturnType<typeof getCrewPortrait>) =>
    Math.min(...runs.filter((run) => run.y > 1 && run.y < PORTRAIT_HEIGHT - 2 && run.fill !== "#15131f" && run.x > 1 && run.x + run.w < PORTRAIT_WIDTH - 1).map((run) => run.y));
  const adult = getCrewPortrait({ id: "kin", role: "teacher", ageGroup: "adult" });
  const child = getCrewPortrait({ id: "kin", role: "teacher", ageGroup: "child" });
  assert.ok(topRow(child) > topRow(adult));
});

test("a 3D head takes the portrait's face shape, not a square", () => {
  for (const id of ids.slice(0, 20)) {
    const head = getCrewHead({ id, role: "engineer" });
    const xs = head.pixels.map((pixel) => pixel.x);
    const ys = head.pixels.map((pixel) => pixel.y);
    const width = Math.max(...xs) - Math.min(...xs) + 1;
    const height = Math.max(...ys) - Math.min(...ys) + 1;
    assert.ok(width <= 10 && height <= 10, `${id}: fits the head`);
    assert.ok(head.pixels.length < width * height, `${id}: the silhouette has corners cut, not a full block`);
    assert.ok(head.pixels.some((pixel) => pixel.color === "#1a1420"), `${id}: has eyes`);
    assert.ok(head.pixels.some((pixel) => pixel.color === head.skin), `${id}: has skin`);
    assert.ok(!head.pixels.some((pixel) => pixel.color === "#15131f"), `${id}: no portrait background`);
  }
});

test("a person's 3D figure takes the same skin and hair as their portrait", () => {
  for (const id of ids.slice(0, 20)) {
    const fills = new Set(getCrewPortrait({ id, role: "farmer" }).map((run) => run.fill));
    const look = getCrewLook({ id });
    assert.ok(fills.has(look.skin), `${id}: skin`);
    assert.ok(fills.has(look.hair), `${id}: hair`);
  }
});
