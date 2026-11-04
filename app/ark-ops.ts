/*
 * The Extraction simulation's world, drawn with the drone view's renderer: the
 * relay station at night. Concrete rooms lit by the Wreckers' campfire and a few
 * lamps, the storeroom left dark, the shuttle idling on its pad in the yard and
 * the simulation's edge glowing beyond it. Wreckers, aliens, the Hollowed and the
 * survivors as blocky figures; AXIOM's Arc Carbine with a light slung under it,
 * its loadout fitted (arc-carbine-model) and its sights to look down. The Wreckers'
 * scavenged rifles fire rounds; the carbine fires bolts of arc, and the shuttle's
 * field recharges its cell. The rules are ark-ops-rules; this moves, draws and
 * voices them.
 */

import * as THREE from "three";

import { createOpsAudio, type OpsAudio, type OpsSound } from "./ark-ops-audio";
import { roomAt, tileAt, wallsBetween } from "./ark-ops-map";
import { carbineReadout, DEFAULT_LOADOUT, OPTICS, switchLaw, type CarbineForm } from "./arc-carbine";
import { createArcs, dressCarbine, heatColour } from "./arc-carbine-model";
import { createOps, fireOps, inShuttleField, opsGlitch, opsObjective, opsPrompt, reloadOps, SHUTTLE_FIELD, stepOps, type OpsHit, type OpsKind } from "./ark-ops-rules";
import type { SimHud, SimInput, SimWorldOptions } from "./ark-sim";
import type { LyraCue } from "./lyra-voice";
import { SIM_DIFFICULTIES, type SimDifficulty } from "./ark-sim-rules";

const STAND_EYE = 1.6;
const CROUCH_EYE = 1.0;
const WALL_HEIGHT = 3;
/** How far a hip-fired round can stray, moving or still, and down the sights. */
const SPREAD = { still: 0.035, moving: 0.06, aimed: 0.006 };

type Ref = { kind: "agent" | "survivor"; id: number };
type Figure = {
  ref: Ref;
  kind: OpsKind | "survivor";
  group: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  gun: THREE.Group | null;
  muzzle: THREE.Object3D | null;
  materials: THREE.MeshLambertMaterial[];
  flash: number;
  phase: number;
  fallen: number;
};

export function createOpsWorld(difficulty: SimDifficulty, { reducedMotion = false, onCleared, loadout = DEFAULT_LOADOUT }: SimWorldOptions = {}) {
  const random = Math.random;
  const state = createOps(difficulty, random, loadout);
  const map = state.map;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 300);
  camera.rotation.order = "YXZ";
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T) => {
    disposables.push(thing);
    return thing;
  };
  const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
    keep(new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
  const glow = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const inert = <T extends THREE.Object3D>(object: T) => {
    object.raycast = () => {};
    return object;
  };
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1));
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---- Night over the station. ----
  scene.background = new THREE.Color("#0b0e1a");
  scene.fog = new THREE.Fog("#0b0e1a", 14, 62);
  scene.add(new THREE.HemisphereLight("#8f9ad0", "#1c1814", 0.62));
  const moon = new THREE.DirectionalLight("#a9b8ff", 0.5);
  moon.position.set(-20, 30, 12);
  scene.add(moon);

  // ---- The ground, the walls, the doors. ----
  const solids: THREE.Object3D[] = [];
  const blocks = (list: { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string }[], material: THREE.Material) => {
    const mesh = new THREE.InstancedMesh(unitBox, material, Math.max(1, list.length));
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    list.forEach((item, index) => {
      matrix.compose(new THREE.Vector3(item.x, item.y, item.z), new THREE.Quaternion(), new THREE.Vector3(item.sx, item.sy, item.sz));
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, tint.set(item.color));
    });
    mesh.count = list.length;
    scene.add(mesh);
    solids.push(mesh);
    return mesh;
  };
  const yard = new THREE.Mesh(keep(new THREE.PlaneGeometry(map.width + 40, map.height + 40)), lambert("#26301f"));
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(map.width / 2, -0.02, map.height / 2);
  scene.add(yard);
  solids.push(yard);
  const floors: Parameters<typeof blocks>[0] = [];
  const wallBlocks: Parameters<typeof blocks>[0] = [];
  const ceilings: Parameters<typeof blocks>[0] = [];
  const crates: Parameters<typeof blocks>[0] = [];
  const shade = (base: string, spread: number) => {
    const color = new THREE.Color(base);
    color.offsetHSL(0, 0, (random() - 0.5) * spread);
    return `#${color.getHexString()}`;
  };
  for (let j = 0; j < map.height; j += 1) {
    for (let i = 0; i < map.width; i += 1) {
      const tile = tileAt(map, i, j);
      const x = i + 0.5;
      const z = j + 0.5;
      if (tile === "ground") continue;
      if (tile !== "wall") floors.push({ x, y: -0.05, z, sx: 1, sy: 0.1, sz: 1, color: shade("#4c4954", 0.08) });
      if (tile === "wall") wallBlocks.push({ x, y: WALL_HEIGHT / 2, z, sx: 1, sy: WALL_HEIGHT, sz: 1, color: shade("#6d6a73", 0.06) });
      if (tile === "window") {
        wallBlocks.push({ x, y: 0.45, z, sx: 1, sy: 0.9, sz: 1, color: shade("#6d6a73", 0.06) });
        wallBlocks.push({ x, y: 2.6, z, sx: 1, sy: 0.8, sz: 1, color: shade("#6d6a73", 0.06) });
      }
      if (tile === "door" || tile === "doorway") wallBlocks.push({ x, y: 2.625, z, sx: 1, sy: 0.75, sz: 1, color: shade("#615e68", 0.04) });
      if (tile !== "wall") ceilings.push({ x, y: WALL_HEIGHT + 0.1, z, sx: 1, sy: 0.2, sz: 1, color: shade("#34313b", 0.05) });
      if (tile === "cover") {
        const counter = roomAt(map, x, z)?.name === "Kitchen";
        crates.push({ x, y: 0.5, z, sx: 0.94, sy: 1, sz: 0.94, color: counter ? shade("#8a8478", 0.05) : shade("#7a5a3a", 0.1) });
      }
    }
  }
  blocks(floors, lambert("#ffffff"));
  blocks(wallBlocks, lambert("#ffffff"));
  blocks(ceilings, lambert("#ffffff"));
  blocks(crates, lambert("#ffffff"));
  // The broken windows: a frame, and a few teeth of glass.
  const glass = glow("#9fb4d8", { transparent: true, opacity: 0.35 });
  const frame = lambert("#2b2833");
  for (let j = 0; j < map.height; j += 1) {
    for (let i = 0; i < map.width; i += 1) {
      if (tileAt(map, i, j) !== "window") continue;
      const alongX = tileAt(map, i - 1, j) === "wall" || tileAt(map, i + 1, j) === "wall";
      const sx = alongX ? 1 : 0.06;
      const sz = alongX ? 0.06 : 1;
      inert(box(scene, sx, 0.06, sz, frame, i + 0.5, 0.93, j + 0.5));
      inert(box(scene, sx, 0.06, sz, frame, i + 0.5, 2.17, j + 0.5));
      inert(box(scene, alongX ? 0.3 : 0.04, 0.35, alongX ? 0.04 : 0.3, glass, i + 0.3, 2.0, j + 0.5));
    }
  }
  // Doors swing on hinges at one edge of their tile.
  const doorMaterial = lambert("#5a4a3c");
  const handleMaterial = lambert("#c8b27a");
  const doorLeaves = map.doors.map((door) => {
    const alongX = tileAt(map, door.i - 1, door.j) === "wall" || tileAt(map, door.i + 1, door.j) === "wall";
    const hinge = new THREE.Group();
    hinge.position.set(alongX ? door.i + 0.04 : door.i + 0.5, 0, alongX ? door.j + 0.5 : door.j + 0.04);
    const leaf = new THREE.Group();
    hinge.add(leaf);
    box(leaf, alongX ? 0.92 : 0.08, 2.22, alongX ? 0.08 : 0.92, doorMaterial, alongX ? 0.46 : 0, 1.11, alongX ? 0 : 0.46);
    inert(box(leaf, 0.08, 0.08, 0.08, handleMaterial, alongX ? 0.8 : 0.07, 1.05, alongX ? 0.07 : 0.8));
    scene.add(hinge);
    solids.push(hinge);
    return { hinge, alongX, swing: 0 };
  });

  // ---- Lights: the campfire, lamps, and the corridor's alarm beacon. ----
  const flickers: { light: THREE.PointLight; base: number; kind: string }[] = [];
  for (const spot of map.lights) {
    const color = spot.kind === "fire" ? "#ff9a4a" : spot.kind === "alarm" ? "#ff4a3a" : "#ffd9a0";
    const light = new THREE.PointLight(color, spot.kind === "alarm" ? 0 : spot.kind === "fire" ? 3.2 : 1.8, spot.kind === "fire" ? 9 : 7, 1.6);
    light.position.set(spot.x, spot.kind === "fire" ? 0.8 : 2.6, spot.z);
    scene.add(light);
    flickers.push({ light, base: light.intensity, kind: spot.kind });
    if (spot.kind === "fire") {
      for (let log = 0; log < 3; log += 1) inert(box(scene, 0.7, 0.12, 0.12, lambert("#4a3220"), spot.x, 0.08, spot.z)).rotation.y = (log / 3) * Math.PI;
      inert(box(scene, 0.3, 0.35, 0.3, glow("#ffb347"), spot.x, 0.25, spot.z));
    } else if (spot.kind === "lamp") {
      inert(box(scene, 0.25, 0.25, 0.25, glow("#ffe9c0"), spot.x, 2.85, spot.z));
    } else {
      inert(box(scene, 0.3, 0.2, 0.3, glow("#7a2a2a"), spot.x, 2.9, spot.z));
    }
  }
  // Props: bedrolls by the fire, the generator, shelves in the dark.
  for (const [x, z] of [[24.2, 6.6], [30.4, 3.8], [22.5, 3.6]]) inert(box(scene, 0.8, 0.12, 1.8, lambert("#4f5a3a"), x, 0.06, z));
  inert(box(scene, 1.6, 1.2, 1, lambert("#5b6172"), 16, 0.6, 21.6));
  for (const z of [13, 15.5, 18, 20.5]) inert(box(scene, 0.5, 2.2, 1.8, lambert("#4a4450"), 23.35, 1.1, z));
  // The survivors' chairs.
  for (const point of map.spawn.survivors) inert(box(scene, 0.5, 0.45, 0.5, lambert("#3f3a46"), point.x, 0.22, point.z - 0.1));

  // ---- The shuttle on its pad, and the simulation's edge. ----
  const pad = map.extraction;
  const padX = (pad.x0 + pad.x1) / 2;
  const padZ = (pad.z0 + pad.z1) / 2;
  const shuttle = new THREE.Group();
  shuttle.position.set(padX - 0.4, 0, padZ);
  const hull = lambert("#8d94a8");
  box(shuttle, 3.4, 1.6, 2.4, hull, 0, 1.4, 0);
  box(shuttle, 1.2, 1.1, 1.8, hull, -2.1, 1.3, 0);
  box(shuttle, 0.5, 0.5, 1.4, glow("#9ac4ff"), -2.6, 1.6, 0);
  box(shuttle, 1, 0.15, 4.6, lambert("#6a7084"), 0.2, 1.1, 0);
  for (const z of [-0.7, 0.7]) box(shuttle, 0.3, 0.6, 0.6, glow("#ffb347"), 1.85, 1.4, z);
  box(shuttle, 1.6, 0.1, 1.6, lambert("#5a6070"), 2.4, 0.35, 0).rotation.z = -0.35;
  for (const [x, z] of [[-1.2, -1], [-1.2, 1], [1.2, -1], [1.2, 1]]) box(shuttle, 0.15, 0.6, 0.15, lambert("#3a3f4e"), x, 0.3, z);
  scene.add(shuttle);
  solids.push(shuttle);
  const padLights: THREE.Mesh[] = [];
  for (const [x, z] of [[pad.x0, pad.z0], [pad.x1, pad.z0], [pad.x0, pad.z1], [pad.x1, pad.z1]]) padLights.push(inert(box(scene, 0.25, 0.12, 0.25, glow("#ffb347"), x, 0.06, z)));
  const shuttleLight = new THREE.PointLight("#ffd9a0", 1.6, 9, 1.6);
  shuttleLight.position.set(padX + 1.5, 1.4, padZ);
  scene.add(shuttleLight);
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = 64;
  gridCanvas.height = 64;
  const gridPaint = gridCanvas.getContext("2d")!;
  gridPaint.strokeStyle = "#d85ac8";
  gridPaint.lineWidth = 3;
  gridPaint.strokeRect(0, 0, 64, 64);
  const gridTexture = keep(new THREE.CanvasTexture(gridCanvas));
  gridTexture.wrapS = THREE.RepeatWrapping;
  gridTexture.wrapT = THREE.RepeatWrapping;
  gridTexture.magFilter = THREE.NearestFilter;
  const edge = (length: number, x: number, z: number, turn: number) => {
    const texture = gridTexture.clone();
    keep(texture);
    texture.repeat.set(length / 2, 3);
    texture.needsUpdate = true;
    const wall = inert(new THREE.Mesh(keep(new THREE.PlaneGeometry(length, 6)), glow("#ffffff", { map: texture, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })));
    wall.position.set(x, 3, z);
    wall.rotation.y = turn;
    scene.add(wall);
  };
  edge(map.width, map.width / 2, 0, 0);
  edge(map.width, map.width / 2, map.height, 0);
  edge(map.height, 0, map.height / 2, Math.PI / 2);
  edge(map.height, map.width, map.height / 2, Math.PI / 2);

  // ---- The people and the things in the station. ----
  const figures = new Map<number, Figure>();
  const tagged = (group: THREE.Group, ref: Ref) => {
    group.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) object.userData.ref = ref;
    });
  };
  const person = (ref: Ref, kind: Figure["kind"], palette: { skin: string; top: string; legs: string; hat?: string; mask?: string; armed?: boolean }) => {
    const group = new THREE.Group();
    const skin = lambert(palette.skin);
    const top = lambert(palette.top);
    const legsMaterial = lambert(palette.legs);
    const materials = [skin, top, legsMaterial];
    const pivot = (x: number, y: number) => {
      const joint = new THREE.Group();
      joint.position.set(x, y, 0);
      group.add(joint);
      return joint;
    };
    const legs = [pivot(-0.13, 0.85), pivot(0.13, 0.85)];
    for (const leg of legs) box(leg, 0.2, 0.85, 0.24, legsMaterial, 0, -0.42, 0);
    box(group, 0.52, 0.66, 0.3, top, 0, 1.18, 0);
    box(group, 0.32, 0.32, 0.32, skin, 0, 1.68, 0).userData.head = true;
    if (palette.hat) {
      const hat = lambert(palette.hat);
      materials.push(hat);
      box(group, 0.35, 0.12, 0.35, hat, 0, 1.87, 0).userData.head = true;
    }
    if (palette.mask) {
      const mask = lambert(palette.mask);
      materials.push(mask);
      box(group, 0.33, 0.13, 0.06, mask, 0, 1.6, 0.16).userData.head = true;
    }
    const arms = [pivot(-0.34, 1.48), pivot(0.34, 1.48)];
    for (const arm of arms) {
      box(arm, 0.16, 0.6, 0.18, top, 0, -0.3, 0);
      box(arm, 0.14, 0.12, 0.14, skin, 0, -0.64, 0);
    }
    let gun: THREE.Group | null = null;
    let muzzle: THREE.Object3D | null = null;
    if (palette.armed) {
      gun = new THREE.Group();
      box(gun, 0.08, 0.11, 0.78, lambert("#26242c"), 0, 0, 0);
      box(gun, 0.07, 0.16, 0.12, lambert("#3a2a20"), 0, -0.1, -0.22);
      muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.02, 0.42);
      gun.add(muzzle);
      gun.position.set(0.14, 1.1, 0.28);
      group.add(gun);
    }
    tagged(group, ref);
    scene.add(group);
    const figure: Figure = { ref, kind, group, arms, legs, gun, muzzle, materials, flash: 0, phase: random() * 10, fallen: 0 };
    figures.set(ref.id, figure);
    return figure;
  };
  const alienFigure = (ref: Ref) => {
    const group = new THREE.Group();
    const skin = lambert("#4a3a5a");
    const dark = lambert("#2e2438");
    const materials = [skin, dark];
    box(group, 0.55, 0.45, 1.05, skin, 0, 0.6, 0);
    box(group, 0.42, 0.38, 0.42, skin, 0, 0.72, 0.66).userData.head = true;
    for (const x of [-0.11, 0.11]) inert(box(group, 0.09, 0.07, 0.04, glow("#ffe34a"), x, 0.78, 0.88));
    const legs: THREE.Group[] = [];
    for (const [x, z] of [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.35], [0.3, -0.35]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.55, z);
      box(leg, 0.12, 0.6, 0.12, dark, x > 0 ? 0.08 : -0.08, -0.28, 0);
      group.add(leg);
      legs.push(leg);
    }
    const arms: THREE.Group[] = [];
    for (const x of [-0.24, 0.24]) {
      const claw = new THREE.Group();
      claw.position.set(x, 0.62, 0.62);
      box(claw, 0.08, 0.08, 0.5, dark, 0, -0.05, 0.25);
      group.add(claw);
      arms.push(claw);
    }
    tagged(group, ref);
    scene.add(group);
    const figure: Figure = { ref, kind: "alien", group, arms, legs, gun: null, muzzle: null, materials, flash: 0, phase: random() * 10, fallen: 0 };
    figures.set(ref.id, figure);
    return figure;
  };
  const CLOTHES = ["#4a6a8a", "#6a7a4a", "#8a6a5a", "#5a5a7a", "#7a6a8a"];
  const SKIN = ["#c8a088", "#9a6e52", "#e0bca0", "#6e4a36", "#b08060"];
  for (const agent of state.agents) {
    const ref: Ref = { kind: "agent", id: agent.id };
    if (agent.kind === "alien") alienFigure(ref);
    else if (agent.kind === "hollowed") person(ref, "hollowed", { skin: "#b9b4c6", top: "#2a2533", legs: "#1f1b27" });
    else person(ref, "wrecker", { skin: SKIN[agent.id % SKIN.length], top: "#7a4a2e", legs: "#3a3530", hat: "#2a2a2a", mask: "#4a4a4a", armed: true });
  }
  for (const survivor of state.survivors) {
    person({ kind: "survivor", id: survivor.id }, "survivor", { skin: SKIN[survivor.id % SKIN.length], top: CLOTHES[survivor.id % CLOTHES.length], legs: "#3a3f4e" });
  }
  // The Hollowed carry the Null on them: patches that flicker violet.
  for (const agent of state.agents) {
    if (agent.kind !== "hollowed") continue;
    const figure = figures.get(agent.id)!;
    const patch = glow("#9a6aff");
    for (const [x, y, z] of [[0.12, 1.3, 0.16], [-0.18, 1.05, 0.16], [0.05, 1.75, 0.17]]) inert(box(figure.group, 0.12, 0.12, 0.02, patch, x, y, z));
  }
  const pickups = new Map<number, THREE.Group>();
  for (const pickup of state.pickups) {
    const group = new THREE.Group();
    if (pickup.kind === "cell") {
      // A spare cell for the carbine, lit along its window.
      box(group, 0.26, 0.4, 0.26, lambert("#3a3f4e"), 0, 0.05, 0);
      box(group, 0.28, 0.24, 0.06, glow("#9ac4ff"), 0, 0.05, 0.11);
    } else {
      box(group, 0.4, 0.3, 0.3, lambert("#e8e4dc"), 0, 0, 0);
      // A green cross: the Ark's own mark for care.
      box(group, 0.06, 0.2, 0.02, glow("#5adc7c"), 0, 0, 0.16);
      box(group, 0.2, 0.06, 0.02, glow("#5adc7c"), 0, 0, 0.16);
    }
    group.position.set(pickup.x, 0.2, pickup.z);
    group.traverse((object) => inert(object));
    scene.add(group);
    pickups.set(pickup.id, group);
  }

  // ---- AXIOM's carbine, its light, and what it throws. ----
  const gun = new THREE.Group();
  const gunBody = lambert("#3a3f4e");
  box(gun, 0.12, 0.14, 0.62, gunBody, 0, 0, 0);
  box(gun, 0.05, 0.05, 0.34, lambert("#5a546e"), 0, 0.02, -0.46);
  const coils = [-0.12, -0.02, 0.08].map((z) => box(gun, 0.15, 0.04, 0.05, glow("#9ac4ff"), 0, 0.02, z));
  box(gun, 0.08, 0.18, 0.1, lambert("#2b2433"), 0, -0.14, 0.12);
  box(gun, 0.1, 0.16, 0.22, gunBody, 0, -0.03, 0.38);
  // The light slung under the barrel; the sights, the barrel piece and the cell come with the loadout.
  box(gun, 0.07, 0.07, 0.12, lambert("#1a1820"), 0, -0.09, -0.3);
  const dressed = keep(dressCarbine(gun, loadout));
  const flash = box(gun, 0.16, 0.16, 0.16, glow("#dce8ff"), 0, 0.02, dressed.muzzle);
  flash.visible = false;
  gun.traverse((object) => inert(object));
  camera.add(gun);
  scene.add(camera);
  const muzzleLight = new THREE.PointLight("#bcd8ff", 0, 8, 1.5);
  muzzleLight.position.set(0.3, -0.2, -1.1);
  camera.add(muzzleLight);
  const torch = new THREE.SpotLight("#f4f0e0", 0, 22, 0.42, 0.55, 1.2);
  torch.position.set(0.25, -0.25, -0.4);
  const torchAim = new THREE.Object3D();
  torchAim.position.set(0, -0.1, -6);
  camera.add(torch, torchAim);
  torch.target = torchAim;
  const enemyFlash = new THREE.PointLight("#ffd27a", 0, 7, 1.6);
  scene.add(enemyFlash);
  type Streak = { mesh: THREE.Mesh; life: number };
  const streaks: Streak[] = [];
  const tracerMaterial = glow("#ffd9a0", { transparent: true, opacity: 0.8 });
  const arcs = keep(createArcs(scene, random));
  const coilColour = new THREE.Color();
  // The shuttle's field over the pad: inside it the carbine's cell draws power.
  {
    const pad = map.extraction;
    const field = inert(new THREE.Mesh(keep(new THREE.SphereGeometry(SHUTTLE_FIELD, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)), glow("#c9b6ff", { transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })));
    field.position.set((pad.x0 + pad.x1) / 2, 0, (pad.z0 + pad.z1) / 2);
    scene.add(field);
  }
  const streak = (from: THREE.Vector3, to: THREE.Vector3, material: THREE.Material) => {
    const mesh = inert(new THREE.Mesh(unitBox, material));
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.scale.set(0.025, 0.025, from.distanceTo(to));
    mesh.lookAt(to);
    scene.add(mesh);
    streaks.push({ mesh, life: 0.06 });
  };
  type Burst = { points: THREE.Points; velocities: Float32Array; age: number; material: THREE.PointsMaterial };
  const bursts: Burst[] = [];
  const burst = (at: THREE.Vector3, color: string, count = 14) => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions.set([at.x, at.y, at.z], index * 3);
      velocities.set([(random() - 0.5) * 3, random() * 2.5, (random() - 0.5) * 3], index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 0.08, transparent: true });
    const points = inert(new THREE.Points(geometry, material));
    scene.add(points);
    bursts.push({ points, velocities, age: 0, material });
  };
  const ghosts: { mesh: THREE.Mesh; life: number }[] = [];
  const ghostMaterial = () => new THREE.MeshBasicMaterial({ color: "#9a6aff", transparent: true, opacity: 0.45, depthWrite: false });

  // ---- Running the mission. ----
  let yaw = state.player.yaw;
  let pitch = -0.05;
  let crouched = false;
  let crouchWas = false;
  let light = true;
  let lightWas = false;
  let aimBlend = 0;
  let eye = STAND_EYE;
  let recoil = 0;
  let flashFor = 0;
  let hurt = 0;
  let marker = 0;
  let shake = 0;
  let bob = 0;
  let glitch = 0;
  let endedAt: number | null = null;
  let banner: { text: string; until: number } | null = { text: `Extraction · ${SIM_DIFFICULTIES[difficulty].label}`, until: 3.5 };
  /** For Lyra: survivors freed, and the shuttle away with them. */
  const cues: LyraCue[] = [];
  let audio: OpsAudio | null = null;
  const raycaster = new THREE.Raycaster();
  raycaster.far = 80;
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  const walls = (x: number, z: number) => wallsBetween(map, state.doors, state.player, { x, z });
  const say = (sound: OpsSound, x: number, y: number, z: number) => audio?.at(sound, x, y, z, walls(x, z));
  const onYard = (x: number, z: number) => tileAt(map, Math.floor(x), Math.floor(z)) === "ground";
  const figureOf = (id: number) => figures.get(id);

  /** Fire: each bolt the firing law throws strays by stance and law (less down the sights) and strikes what it meets. */
  const pull = (aiming: boolean) => {
    camera.updateMatrixWorld();
    camera.getWorldPosition(origin);
    const moving = state.player.speed > 0.5;
    const stance = aiming ? SPREAD.aimed : moving ? SPREAD.moving : SPREAD.still;
    const live = [...figures.values()].filter((figure) => figure.fallen === 0).map((figure) => figure.group);
    const ends: { point: THREE.Vector3; ref: Ref | null; wall: boolean }[] = [];
    const shot = fireOps(state, (discharge) => Array.from({ length: discharge.bolts }, (): OpsHit => {
      camera.getWorldDirection(direction);
      const spread = stance + discharge.spread * (aiming ? 0.5 : 1);
      direction.set(direction.x + (random() - 0.5) * spread * 2, direction.y + (random() - 0.5) * spread * 2, direction.z + (random() - 0.5) * spread * 2).normalize();
      raycaster.set(origin, direction);
      const hit = raycaster.intersectObjects([...solids, ...live], true)[0];
      const ref = (hit?.object.userData.ref as Ref | undefined) ?? null;
      ends.push({ point: hit ? hit.point.clone() : origin.clone().addScaledVector(direction, 60), ref, wall: Boolean(hit) && !ref });
      return ref ? { ...ref, head: Boolean(hit?.object.userData.head) } : null;
    }));
    if (!shot) return;
    recoil = shot.damage > 2 || shot.bolts > 1 ? 1.7 : 1;
    flashFor = 0.05;
    flash.getWorldPosition(muzzle);
    let impact = false;
    for (const end of ends) {
      arcs.fire(muzzle, end.point);
      if (end.ref || end.wall) burst(end.point, end.ref ? (figureOf(end.ref.id)?.kind === "alien" ? "#c8f04a" : "#d8504a") : "#cfe0ff", end.ref ? 12 : 5);
      if (end.wall && !impact) {
        impact = true;
        audio?.at("impact", end.point.x, end.point.y, end.point.z, 0);
      }
      if (end.ref) {
        marker = 1;
        const figure = figureOf(end.ref.id);
        if (figure) figure.flash = 1;
      }
    }
  };

  const update = (dt: number, input: SimInput, now: number) => {
    audio ??= createOpsAudio();
    // C and F switch crouching and the light on each press; the right button aims.
    if (input.crouch && !crouchWas) crouched = !crouched;
    crouchWas = Boolean(input.crouch);
    if (input.light && !lightWas) light = !light;
    lightWas = Boolean(input.light);
    const playing = state.player.alive && !state.outcome;
    const aiming = Boolean(input.aim) && playing;
    if (playing) {
      if (input.firing) pull(aiming);
      stepOps(state, dt, { forward: input.forward, strafe: input.strafe, yaw, sprint: input.sprint, crouched, aiming, light, interact: Boolean(input.interact) }, random);
    }
    const player = state.player;
    if (state.outcome && endedAt === null) endedAt = now;

    // What happened, heard where it happened.
    for (const event of state.events) {
      switch (event.type) {
        case "step": {
          const outside = onYard(event.x, event.z);
          const sound: OpsSound = outside ? "yard"
            : event.who === "alien" ? "skitter"
            : event.who === "hollowed" ? "drag"
            : event.who === "survivor" ? (event.gait === "crouch" ? "creep" : "soft")
            : event.who === "player" ? (event.gait === "run" ? "boot-run" : event.gait === "crouch" ? "creep" : "soft")
            : event.gait === "run" ? "boot-run" : "boot";
          say(sound, event.x, 0.1, event.z);
          break;
        }
        case "shot":
          if (event.who === "player") {
            audio?.gun(loadout.form, loadout.barrel === "suppressor");
            break;
          }
          say("rifle", event.x, 1.4, event.z);
          {
            const figure = figureOf(event.id);
            if (figure?.muzzle) {
              figure.muzzle.getWorldPosition(muzzle);
              enemyFlash.position.copy(muzzle);
              enemyFlash.intensity = 4;
              const aimed = new THREE.Vector3(event.tx, event.hit ? 1.2 : 1.2 + (random() - 0.5) * 1.6, event.tz);
              if (!event.hit) aimed.add(new THREE.Vector3((random() - 0.5) * 1.6, 0, (random() - 0.5) * 1.6));
              streak(muzzle, aimed, tracerMaterial);
            }
          }
          break;
        case "hit":
          if (event.kind === "survivor") say("survivor-hurt", event.x, 1.5, event.z);
          else say("impact", event.x, 1.2, event.z);
          break;
        case "death": {
          const figure = figureOf(event.id);
          if (figure) {
            figure.fallen = 0.001;
            figure.group.traverse((object) => {
              object.userData.ref = undefined;
            });
            burst(new THREE.Vector3(event.x, 1, event.z), event.kind === "alien" ? "#c8f04a" : event.kind === "hollowed" ? "#9a6aff" : "#d8504a", 24);
          }
          say(event.kind === "alien" ? "scream" : event.kind === "hollowed" ? "skip" : "shout", event.x, 1.2, event.z);
          break;
        }
        case "hurt":
          hurt = 1;
          shake = reducedMotion ? 0 : 1;
          audio?.hurt();
          break;
        case "survivor-hurt":
          say("survivor-hurt", event.x, 1.5, event.z);
          break;
        case "survivor-lost":
          banner = { text: `${event.name} is down`, until: state.time + 3 };
          break;
        case "door":
          say(event.open ? "door-open" : "door-shut", event.x, 1.2, event.z);
          break;
        case "bark":
          say(random() < 0.5 ? "radio" : "mutter", event.x, 1.7, event.z);
          break;
        case "shout":
          say("shout", event.x, 1.7, event.z);
          break;
        case "chitter":
        case "scream":
        case "scratch":
        case "whisper":
          say(event.type, event.x, event.type === "whisper" ? 1.7 : 0.8, event.z);
          break;
        case "strike":
          say("strike", event.x, 1, event.z);
          if (figureOf(event.id)) figureOf(event.id)!.phase = -1;
          break;
        case "skip": {
          say("skip", event.x, 1.4, event.z);
          const ghost = inert(new THREE.Mesh(unitBox, ghostMaterial()));
          ghost.scale.set(0.5, 1.8, 0.3);
          ghost.position.set(event.fromX, 0.9, event.fromZ);
          scene.add(ghost);
          ghosts.push({ mesh: ghost, life: 0.5 });
          break;
        }
        case "freed":
          audio?.freed();
          banner = { text: "Survivors freed · get them to the shuttle", until: state.time + 3 };
          cues.push("freed");
          for (const survivor of state.survivors) if (survivor.state === "following") say("survivor-voice", survivor.x, 1.6, survivor.z);
          break;
        case "alarm":
          audio?.alarm();
          banner = { text: "Alarm raised", until: state.time + 2.5 };
          break;
        case "death-player":
          audio?.death();
          break;
        case "pickup":
          audio?.pickup();
          break;
        case "reload":
          audio?.reload();
          break;
        case "dry":
          audio?.dry();
          break;
        case "vent":
          audio?.vent();
          break;
        case "extracted":
          audio?.extracted();
          // The rescue drills the Security trainees; the results panel says by how much.
          if (event.drill > 0) onCleared?.(0, event.drill);
          banner = { text: `Extracted · ${event.saved} saved`, until: Infinity };
          cues.push("extracted");
          break;
        case "failed":
          audio?.failed();
          banner = null;
          break;
        default:
          break;
      }
    }
    state.events.length = 0;

    // The figures follow the rules' bodies.
    for (const agent of state.agents) {
      const figure = figureOf(agent.id);
      if (!figure) continue;
      animate(figure, agent.x, agent.z, agent.facing, agent.moving, dt, now, {
        fighting: agent.kind === "wrecker" && agent.mode === "combat",
        alive: agent.alive,
        hollowed: agent.kind === "hollowed",
      });
    }
    for (const survivor of state.survivors) {
      const figure = figureOf(survivor.id);
      if (!figure) continue;
      figure.group.visible = survivor.state !== "safe";
      animate(figure, survivor.x, survivor.z, survivor.facing, survivor.moving, dt, now, {
        fighting: false,
        alive: survivor.state !== "lost",
        sitting: survivor.state === "held",
        low: survivor.state === "following" && player.crouched,
      });
    }
    for (const [id, group] of pickups) {
      if (!state.pickups.some((pickup) => pickup.id === id)) {
        scene.remove(group);
        pickups.delete(id);
        continue;
      }
      group.rotation.y = now * 0.0015;
    }
    for (const door of doorLeaves) {
      const index = doorLeaves.indexOf(door);
      door.swing += ((state.doors[index] ? 1 : 0) - door.swing) * Math.min(1, dt * 8);
      door.hinge.rotation.y = (door.alongX ? -1 : 1) * door.swing * Math.PI * 0.5;
    }
    for (const flicker of flickers) {
      if (flicker.kind === "fire") flicker.light.intensity = flicker.base * (0.8 + Math.sin(now * 0.017) * 0.1 + random() * 0.15);
      else if (flicker.kind === "alarm") flicker.light.intensity = state.alarm ? (Math.sin(now * 0.008) > 0 ? 3 : 0.3) : 0;
    }
    padLights.forEach((lamp, index) => {
      lamp.visible = Math.floor(now / 600 + index * 0.5) % 2 === 0;
    });
    for (let index = streaks.length - 1; index >= 0; index -= 1) {
      streaks[index].life -= dt;
      if (streaks[index].life > 0) continue;
      scene.remove(streaks[index].mesh);
      streaks.splice(index, 1);
    }
    for (let index = ghosts.length - 1; index >= 0; index -= 1) {
      const ghost = ghosts[index];
      ghost.life -= dt;
      (ghost.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ghost.life);
      if (ghost.life > 0) continue;
      scene.remove(ghost.mesh);
      (ghost.mesh.material as THREE.Material).dispose();
      ghosts.splice(index, 1);
    }
    for (let index = bursts.length - 1; index >= 0; index -= 1) {
      const piece = bursts[index];
      piece.age += dt;
      const positions = piece.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let particle = 0; particle < positions.count; particle += 1) {
        piece.velocities[particle * 3 + 1] -= 9 * dt;
        positions.setXYZ(
          particle,
          positions.getX(particle) + piece.velocities[particle * 3] * dt,
          Math.max(0.02, positions.getY(particle) + piece.velocities[particle * 3 + 1] * dt),
          positions.getZ(particle) + piece.velocities[particle * 3 + 2] * dt,
        );
      }
      positions.needsUpdate = true;
      piece.material.opacity = Math.max(0, 1 - piece.age / 0.8);
      if (piece.age > 0.8) {
        scene.remove(piece.points);
        piece.points.geometry.dispose();
        piece.material.dispose();
        bursts.splice(index, 1);
      }
    }

    // The view: the eye's height, the sights, the light, a stagger when hit, the Null's touch.
    const blend = Math.min(1, dt * 10);
    aimBlend += ((aiming ? 1 : 0) - aimBlend) * blend;
    eye += ((player.crouched ? CROUCH_EYE : STAND_EYE) - eye) * blend;
    glitch += (opsGlitch(state) - glitch) * Math.min(1, dt * 4);
    recoil = Math.max(0, recoil - dt * 9);
    hurt = Math.max(0, hurt - dt * 1.6);
    marker = Math.max(0, marker - dt * 5);
    shake = Math.max(0, shake - dt * 4);
    flashFor -= dt;
    flash.visible = flashFor > 0;
    muzzleLight.intensity = flashFor > 0 ? 4 : 0;
    enemyFlash.intensity = Math.max(0, enemyFlash.intensity - dt * 60);
    torch.intensity = player.light && player.alive ? 9 : 0;
    if (player.speed > 0.4) bob += dt * player.speed * 2.4;
    const sway = reducedMotion ? 0 : Math.sin(bob) * 0.025 * (1 - aimBlend * 0.7);
    const jolt = (reducedMotion ? 0 : shake * 0.05) + glitch * 0.012;
    camera.position.set(player.x, eye + Math.abs(sway), player.z);
    camera.rotation.set(pitch + recoil * 0.02 * (1 - aimBlend * 0.5) + (random() - 0.5) * jolt, yaw + (random() - 0.5) * jolt, 0);
    // Down the sights the optic draws the view in; through a scope the carbine is out of sight.
    const fov = 72 / (1 + aimBlend * (OPTICS[loadout.optic].zoom - 1)) + (reducedMotion ? 0 : glitch * (random() - 0.5) * 6);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const readout = carbineReadout(player.gun, state.time);
    const reloading = readout.swapping;
    const dip = reloading !== null ? Math.sin(Math.min(1, reloading) * Math.PI) : 0;
    gun.visible = !(loadout.optic === "scope" && aimBlend > 0.85);
    arcs.update(dt);
    heatColour(readout.heat, readout.venting, now, coilColour);
    for (const coil of coils) (coil.material as THREE.MeshBasicMaterial).color.copy(coilColour);
    dressed.showCharge(readout.charge);
    // Down the sights the front post sits on the centre of the view, the carbine below it.
    gun.position.set(0.3 * (1 - aimBlend) + sway, -0.28 + aimBlend * 0.165 - dip * 0.18, -0.55 - aimBlend * 0.07 + recoil * 0.06);
    gun.rotation.set(recoil * 0.1 * (1 - aimBlend * 0.6) + dip * 0.7, dip * 0.4, dip * 0.3);
    coils.forEach((coil, index) => { coil.visible = reloading === null || Math.floor(now / 120 + index) % 2 === 0; });
    audio?.listen(player.x, eye, player.z, yaw);
    audio?.shuttle(padX, 1.4, padZ, walls(padX + 2, padZ));
    if (banner && state.time > banner.until) banner = null;
  };

  /** Pose a figure: walking, aiming, sitting bound, crouched, struck down; the Hollowed flicker. */
  const animate = (
    figure: Figure,
    x: number,
    z: number,
    facing: number,
    moving: boolean,
    dt: number,
    now: number,
    how: { fighting: boolean; alive: boolean; hollowed?: boolean; sitting?: boolean; low?: boolean },
  ) => {
    const { group } = figure;
    figure.flash = Math.max(0, figure.flash - dt * 8);
    for (const material of figure.materials) {
      material.emissive.setRGB(figure.flash, figure.flash * 0.3, figure.flash * 0.2);
    }
    if (!how.alive) {
      // Down: fall over, and stay down.
      figure.fallen = Math.min(1, Math.max(figure.fallen, 0.001) + dt * 3);
      group.position.set(x, figure.kind === "alien" ? 0.1 : 0.15 * (1 - figure.fallen), z);
      group.rotation.set(-Math.PI / 2 * figure.fallen * (figure.kind === "alien" ? 0 : 1), facing, figure.kind === "alien" ? Math.PI * figure.fallen : 0);
      return;
    }
    if (how.sitting) {
      // Bound to a chair, hands behind them.
      group.position.set(x, -0.4, z);
      group.rotation.set(0, facing, 0);
      for (const leg of figure.legs) leg.rotation.x = -1.5;
      for (const arm of figure.arms) arm.rotation.x = 0.5;
      return;
    }
    figure.phase += moving ? dt * 9 : 0;
    const swing = moving ? Math.sin(figure.phase) * 0.6 : 0;
    group.position.set(x, how.low ? -0.3 : 0, z);
    group.rotation.set(0, facing, 0);
    if (figure.kind === "alien") {
      figure.legs.forEach((leg, index) => { leg.rotation.x = moving ? Math.sin(figure.phase * 1.6 + index * Math.PI * 0.5) * 0.7 : 0; });
      const lunge = figure.phase < 0 ? 1 : 0;
      figure.arms.forEach((arm) => { arm.rotation.x = -lunge * 0.8 + Math.sin(now * 0.004 + figure.phase) * 0.15; });
      if (figure.phase < 0) figure.phase = Math.min(0, figure.phase + dt * 3);
      return;
    }
    figure.legs[0].rotation.x = swing;
    figure.legs[1].rotation.x = -swing;
    if (how.low) for (const leg of figure.legs) leg.rotation.x += -0.9;
    if (how.fighting && figure.gun) {
      // Rifle up and levelled.
      figure.arms[0].rotation.x = -1.35;
      figure.arms[1].rotation.x = -1.5;
      figure.gun.position.set(0.12, 1.42, 0.36);
    } else {
      figure.arms[0].rotation.x = -swing * 0.7;
      figure.arms[1].rotation.x = figure.gun ? -0.6 : swing * 0.7;
      figure.gun?.position.set(0.14, 1.1, 0.28);
    }
    if (how.hollowed) {
      // A body the Null is rewriting: it jitters, and now and then it drops a frame.
      group.position.x += (random() - 0.5) * 0.06;
      group.position.z += (random() - 0.5) * 0.06;
      group.visible = random() > 0.04;
      group.scale.set(1 + (random() - 0.5) * 0.06, 1 + (random() - 0.5) * 0.04, 1);
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return {
    scene,
    camera,
    state,
    /** Turn and tilt AXIOM's view, from mouse movement; steadier down the sights. */
    look(dx: number, dy: number) {
      const care = 1 - aimBlend * 0.45;
      yaw -= dx * 0.0024 * care;
      pitch = Math.max(-1.3, Math.min(1.3, pitch - dy * 0.0024 * care));
    },
    reload() {
      reloadOps(state);
    },
    law(form: CarbineForm) {
      switchLaw(state.player.gun, form, state.time);
    },
    cues() {
      return cues.splice(0);
    },
    update,
    resize(aspect: number) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    hud(): SimHud {
      const player = state.player;
      const finished = endedAt !== null && performance.now() - endedAt > 1400;
      const saved = state.survivors.filter((survivor) => survivor.state === "safe").length;
      const stars = state.outcome === "extracted" ? 1 + (saved === state.survivors.length ? 1 : 0) + (state.alarm ? 0 : 1) : 0;
      return {
        health: player.health,
        maxHealth: player.maxHealth,
        carbine: { ...carbineReadout(player.gun, state.time), powered: inShuttleField(state) },
        wave: 0,
        score: state.score,
        kills: state.kills,
        cleared: 0,
        alive: player.alive,
        hurt,
        marker,
        banner: banner?.text ?? null,
        objective: opsObjective(state),
        location: roomAt(map, player.x, player.z)?.name ?? "",
        prompt: opsPrompt(state),
        progress: state.freeing > 0 ? state.freeing : state.leaving > 0 ? state.leaving : null,
        spotted: state.spotted,
        alarm: state.alarm,
        glitch,
        aiming: aimBlend > 0.5,
        stance: `${player.crouched ? "Crouched" : "Standing"} · light ${player.light ? "on" : "off"}`,
        survivors: state.survivors.map((survivor) => survivor.state),
        result: finished
          ? {
            success: state.outcome === "extracted",
            title: state.outcome === "extracted" ? "Extraction complete" : "Mission failed",
            lines: [
              state.outcome === "extracted" ? `${saved} of ${state.survivors.length} survivors brought home` : state.failure ?? "",
              `${formatTime(state.time)} · ${state.kills} down · ${state.alarm ? "the alarm was raised" : "never seen"}`,
              ...(state.outcome === "extracted" ? [`${"★".repeat(stars)}${"☆".repeat(3 - stars)}`] : []),
            ],
          }
          : null,
      };
    },
    dispose() {
      audio?.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry && mesh.geometry !== unitBox) mesh.geometry.dispose();
      });
      for (const ghost of ghosts) (ghost.mesh.material as THREE.Material).dispose();
      for (const piece of bursts) piece.material.dispose();
      for (const thing of disposables) thing.dispose();
    },
  };
}

export type OpsWorld = ReturnType<typeof createOpsWorld>;
