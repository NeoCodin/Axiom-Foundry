/*
 * The combat simulation's world, drawn with the drone view's renderer: a jungle
 * that never was, under a green dusk and a great pale moon, its edge a glowing
 * grid where the simulation ends. Aliens come out of the trees as voxel things
 * with lit eyes; the training carbine is in AXIOM's hands, an Arc Carbine with
 * its coils glowing. The rules are ark-sim-rules; this moves, draws and voices them.
 */

import * as THREE from "three";

import { createSimAudio, type SimAudio } from "./ark-sim-audio";
import {
  ARENA_RADIUS,
  CARBINE,
  SIM_DIFFICULTIES,
  createSim,
  fireCarbine,
  reloadCarbine,
  stepSim,
  type AlienKind,
  type SimDifficulty,
  type SimState,
} from "./ark-sim-rules";

export type SimInput = { forward: number; strafe: number; sprint: boolean; firing: boolean; jump: boolean };

export type SimHud = {
  health: number;
  maxHealth: number;
  magazine: number;
  reserve: number;
  /** Reload progress 0 to 1, or null when not reloading. */
  reloading: number | null;
  wave: number;
  score: number;
  kills: number;
  /** Waves beaten outright this run. */
  cleared: number;
  alive: boolean;
  /** A hit taken, fading from 1. */
  hurt: number;
  /** A hit landed, fading from 1. */
  marker: number;
  banner: string | null;
};

const EYE = 1.6;
const WALK = 5;
const RUN = 8.5;
const BODY = 0.4;
/** A jump's lift-off speed and the simulation's gravity: about a metre of air at the top. */
const JUMP = 5.4;
const GRAVITY = 14;
/** How far the feet follow the ground up or down without leaving it: slopes, and a rock's edge. */
const STEP = 0.3;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/** The ground's rise and fall: rolling, flattening out in the clearing where a run begins. */
export function groundAt(x: number, z: number) {
  const roll = Math.sin(x * 0.08) * 0.9 + Math.cos(z * 0.07) * 0.8 + Math.sin((x + z) * 0.05) * 0.6;
  const clearing = Math.min(1, Math.hypot(x, z) / 10);
  return roll * clearing * clearing;
}

function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type AlienModel = {
  group: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  skin: THREE.MeshLambertMaterial[];
  kind: AlienKind;
  flash: number;
  lunge: number;
  step: number;
};

export type SimWorldOptions = {
  reducedMotion?: boolean;
  /**
   * A wave beaten outright, and the Security training it drilled. The caller hands the
   * drill to the trainees and may name what it did, for the banner.
   */
  onCleared?: (wave: number, drill: number) => string | null;
};

export function createSimWorld(difficulty: SimDifficulty, { reducedMotion = false, onCleared }: SimWorldOptions = {}) {
  const random = seeded(Math.floor(Math.random() * 1e9));
  const state: SimState = createSim(difficulty, random);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
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

  // ---- The sky, the light, the haze. ----
  scene.background = new THREE.Color("#3f6a4c");
  scene.fog = new THREE.Fog("#557f5a", 16, 74);
  scene.add(new THREE.HemisphereLight("#e8f5d0", "#2a3a1e", 1.25));
  scene.add(new THREE.AmbientLight("#9ab88a", 0.35));
  const sunlight = new THREE.DirectionalLight("#fff2c8", 1.3);
  sunlight.position.set(-40, 80, 30);
  scene.add(sunlight);
  const moon = inert(new THREE.Mesh(new THREE.CircleGeometry(26, 24), glow("#f2ecd8", { fog: false })));
  moon.position.set(-90, 95, -220);
  moon.lookAt(0, 0, 0);
  const halo = inert(new THREE.Mesh(new THREE.RingGeometry(27, 40, 24), glow("#f2ecd8", { fog: false, transparent: true, opacity: 0.12 })));
  halo.position.copy(moon.position);
  halo.lookAt(0, 0, 0);
  scene.add(moon, halo);

  // ---- The ground: rolling, mossy, darker in the hollows. ----
  const groundGeometry = keep(new THREE.PlaneGeometry(150, 150, 75, 75));
  groundGeometry.rotateX(-Math.PI / 2);
  const groundPositions = groundGeometry.attributes.position;
  const groundColors: number[] = [];
  const tint = new THREE.Color();
  for (let index = 0; index < groundPositions.count; index += 1) {
    const x = groundPositions.getX(index);
    const z = groundPositions.getZ(index);
    const y = groundAt(x, z);
    groundPositions.setY(index, y);
    const patch = Math.sin(x * 0.31) * Math.cos(z * 0.27);
    tint.set(patch > 0.45 ? "#6a7a3a" : y < -0.6 ? "#2f4a26" : patch < -0.5 ? "#3f6a2e" : "#4a7a34");
    groundColors.push(tint.r, tint.g, tint.b);
  }
  groundGeometry.setAttribute("color", new THREE.Float32BufferAttribute(groundColors, 3));
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, lambert("#ffffff", { vertexColors: true }));
  scene.add(ground);

  // ---- The jungle: trees with canopies, palms, boulders, undergrowth and glowing flowers. ----
  /** Something in the way: a trunk reaches the canopy, a boulder only as high as its top. */
  type Obstacle = { x: number; z: number; r: number; top: number };
  const obstacles: Obstacle[] = [];
  const trunks: { matrix: THREE.Matrix4; color: string }[] = [];
  const leaves: { matrix: THREE.Matrix4; color: string }[] = [];
  const matrix = (x: number, y: number, z: number, sx: number, sy: number, sz: number, turn = 0, tilt = 0) =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, turn, 0)),
      new THREE.Vector3(sx, sy, sz),
    );
  const LEAF = ["#2f6a2a", "#3a7a30", "#4f8a34", "#5a9a3a", "#2a5a2a"];
  const placed: { x: number; z: number }[] = [];
  for (let attempt = 0; attempt < 900 && placed.length < 190; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const reach = 9 + Math.sqrt(random()) * 58;
    const x = Math.cos(angle) * reach;
    const z = Math.sin(angle) * reach;
    if (placed.some((other) => Math.hypot(other.x - x, other.z - z) < 3.2)) continue;
    placed.push({ x, z });
    const y = groundAt(x, z);
    const kind = random();
    if (kind < 0.25) {
      // A palm: a leaning trunk and a crown of fronds.
      const height = 6 + random() * 4;
      const lean = (random() - 0.5) * 0.3;
      trunks.push({ matrix: matrix(x, y + height / 2, z, 0.35, height, 0.35, 0, lean), color: "#7a5a3a" });
      const topX = x + Math.sin(lean) * -height * 0.5;
      for (let frond = 0; frond < 6; frond += 1) {
        const turn = (frond / 6) * Math.PI * 2;
        leaves.push({ matrix: matrix(topX + Math.sin(turn) * 1.3, y + height - 0.2, z + Math.cos(turn) * 1.3, 0.7, 0.12, 2.8, turn, 0.35), color: LEAF[frond % LEAF.length] });
      }
      if (reach < ARENA_RADIUS) obstacles.push({ x, z, r: 0.45, top: Infinity });
    } else if (kind < 0.85) {
      // A broadleaf: a thick trunk and a canopy of blocks.
      const height = 4 + random() * 5;
      const thick = 0.5 + random() * 0.5;
      trunks.push({ matrix: matrix(x, y + height / 2, z, thick, height, thick, random() * Math.PI), color: random() < 0.5 ? "#5a3f2a" : "#6a4a30" });
      for (let block = 0; block < 4 + Math.floor(random() * 3); block += 1) {
        const size = 2 + random() * 2.4;
        leaves.push({
          matrix: matrix(x + (random() - 0.5) * 3, y + height + (random() - 0.2) * 1.6, z + (random() - 0.5) * 3, size, size * 0.7, size, random() * Math.PI),
          color: LEAF[Math.floor(random() * LEAF.length)],
        });
      }
      // Vines hanging from the canopy.
      for (let vine = 0; vine < 2; vine += 1) {
        const length = 1.5 + random() * 2.5;
        leaves.push({ matrix: matrix(x + (random() - 0.5) * 2.4, y + height - length / 2, z + (random() - 0.5) * 2.4, 0.08, length, 0.08), color: "#3f7a2a" });
      }
      if (reach < ARENA_RADIUS) obstacles.push({ x, z, r: thick / 2 + 0.2, top: Infinity });
    } else {
      // A boulder, mossed over.
      const size = 1 + random() * 1.8;
      trunks.push({ matrix: matrix(x, y + size * 0.35, z, size * 1.3, size * 0.9, size, random() * Math.PI), color: "#6a6a5a" });
      leaves.push({ matrix: matrix(x, y + size * 0.82, z, size * 1.1, 0.2, size * 0.8, random() * Math.PI), color: "#4f7a34" });
      // Small enough ones can be jumped onto and stood on.
      if (reach < ARENA_RADIUS) obstacles.push({ x, z, r: size * 0.65, top: y + size * 0.82 + 0.1 });
    }
  }
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1));
  const instanced = (list: { matrix: THREE.Matrix4; color: string }[], material: THREE.Material) => {
    const mesh = new THREE.InstancedMesh(unitBox, material, list.length);
    list.forEach((item, index) => {
      mesh.setMatrixAt(index, item.matrix);
      mesh.setColorAt(index, tint.set(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  };
  const trunkMesh = instanced(trunks, lambert("#ffffff"));
  instanced(leaves, lambert("#ffffff"));
  // Undergrowth and glowing flowers, which the drone's rounds pass through.
  const brush: { matrix: THREE.Matrix4; color: string }[] = [];
  const blooms: { matrix: THREE.Matrix4; color: string }[] = [];
  for (let plant = 0; plant < 520; plant += 1) {
    const angle = random() * Math.PI * 2;
    const reach = 4 + Math.sqrt(random()) * 64;
    const x = Math.cos(angle) * reach;
    const z = Math.sin(angle) * reach;
    const y = groundAt(x, z);
    const size = 0.4 + random() * 0.9;
    brush.push({ matrix: matrix(x, y + size * 0.3, z, size, size * 0.6, size, random() * Math.PI), color: LEAF[Math.floor(random() * LEAF.length)] });
    if (random() < 0.12) blooms.push({ matrix: matrix(x, y + size * 0.65, z, 0.18, 0.18, 0.18), color: ["#ff5ad8", "#ffe34a", "#b48cff"][Math.floor(random() * 3)] });
  }
  inert(instanced(brush, lambert("#ffffff")));
  inert(instanced(blooms, glow("#ffffff")));
  // Fireflies drifting in the dusk.
  const fireflyCount = 140;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflySeeds = Array.from({ length: fireflyCount }, () => ({ x: (random() - 0.5) * 100, z: (random() - 0.5) * 100, phase: random() * 10 }));
  const fireflyGeometry = keep(new THREE.BufferGeometry());
  fireflyGeometry.setAttribute("position", new THREE.BufferAttribute(fireflyPositions, 3));
  scene.add(inert(new THREE.Points(fireflyGeometry, keep(new THREE.PointsMaterial({ color: "#fff27a", size: 0.12, sizeAttenuation: true })))));

  // ---- The simulation's edge: a grid of light, and the ground ring at its foot. ----
  const gridTexture = canvasTexture(16, 16, (context) => {
    context.clearRect(0, 0, 16, 16);
    context.fillStyle = "#ff8ae0";
    context.fillRect(0, 0, 16, 1);
    context.fillRect(0, 0, 1, 16);
  });
  gridTexture.repeat.set(96, 6);
  const edge = inert(new THREE.Mesh(
    keep(new THREE.CylinderGeometry(ARENA_RADIUS + 0.5, ARENA_RADIUS + 0.5, 24, 96, 1, true)),
    keep(new THREE.MeshBasicMaterial({ map: gridTexture, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })),
  ));
  edge.position.y = 10;
  scene.add(edge);

  // ---- The aliens. ----
  const models = new Map<number, AlienModel>();
  const part = (parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const pivot = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const joint = new THREE.Group();
    joint.position.set(x, y, z);
    parent.add(joint);
    return joint;
  };
  const buildAlien = (id: number, kind: AlienKind): AlienModel => {
    const group = new THREE.Group();
    group.userData.alienId = id;
    const skinColor = { stalker: "#3b1f4f", spitter: "#5a2a5a", brute: "#4a1f1a" }[kind];
    const skin = lambert(skinColor, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 });
    const plate = lambert({ stalker: "#6a3a8a", spitter: "#8a4a7a", brute: "#8a7a6a" }[kind]);
    const eye = glow(kind === "brute" ? "#ff4a3a" : "#ffe34a");
    const legs: THREE.Object3D[] = [];
    const arms: THREE.Object3D[] = [];
    if (kind === "stalker") {
      part(group, 0.8, 0.55, 1.5, skin, 0, 0.8, 0);
      for (let spine = 0; spine < 4; spine += 1) part(group, 0.12, 0.25, 0.18, plate, 0, 1.15, -0.5 + spine * 0.32);
      part(group, 0.6, 0.45, 0.6, skin, 0, 0.9, 0.95);
      for (const side of [-1, 1]) {
        part(group, 0.1, 0.1, 0.06, eye, side * 0.16, 1.0, 1.26);
        const jaw = part(group, 0.08, 0.08, 0.4, plate, side * 0.18, 0.72, 1.32);
        jaw.rotation.y = side * 0.4;
        for (const end of [-0.5, 0.5]) {
          const leg = pivot(group, side * 0.45, 0.75, end);
          part(leg, 0.14, 0.8, 0.14, skin, 0, -0.4, 0);
          part(leg, 0.2, 0.08, 0.26, plate, 0, -0.78, 0.06);
          legs.push(leg);
        }
      }
      const tail = part(group, 0.2, 0.2, 0.9, skin, 0, 0.9, -1.1);
      tail.rotation.x = -0.4;
    } else if (kind === "spitter") {
      const sac = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(0.65, 0)), skin);
      sac.position.y = 1.25;
      group.add(sac);
      const acid = glow("#c8f04a");
      for (const [x, y, z] of [[0.4, 1.4, 0.3], [-0.35, 1.1, 0.4], [0.1, 1.7, -0.2]]) part(group, 0.16, 0.16, 0.16, acid, x, y, z);
      part(group, 0.3, 0.22, 0.3, acid, 0, 1.05, 0.62);
      for (const x of [-0.18, 0, 0.18]) part(group, 0.08, 0.08, 0.06, eye, x, 1.45, 0.6);
      for (let index = 0; index < 3; index += 1) {
        const angle = (index / 3) * Math.PI * 2;
        const leg = pivot(group, Math.sin(angle) * 0.45, 0.8, Math.cos(angle) * 0.45);
        leg.rotation.y = angle;
        part(leg, 0.12, 0.85, 0.12, plate, 0, -0.42, 0.1);
        legs.push(leg);
      }
    } else {
      for (const side of [-1, 1]) {
        const leg = pivot(group, side * 0.4, 1.2, 0);
        part(leg, 0.45, 1.15, 0.5, skin, 0, -0.58, 0);
        part(leg, 0.5, 0.15, 0.65, plate, 0, -1.12, 0.08);
        legs.push(leg);
        const arm = pivot(group, side * 0.95, 2.4, 0.1);
        part(arm, 0.42, 1.5, 0.42, skin, 0, -0.75, 0);
        for (const claw of [-0.12, 0.12]) part(arm, 0.08, 0.35, 0.08, plate, claw, -1.6, 0.12);
        arms.push(arm);
        part(group, 0.55, 0.3, 0.7, plate, side * 0.75, 2.6, 0);
      }
      part(group, 1.5, 1.3, 0.95, skin, 0, 1.95, 0);
      part(group, 0.55, 0.5, 0.6, skin, 0, 2.75, 0.3);
      for (const x of [-0.15, 0, 0.15]) part(group, 0.08, 0.08, 0.06, eye, x, 2.82, 0.61);
    }
    scene.add(group);
    return { group, legs, arms, skin: [skin], kind, flash: 0, lunge: 0, step: random() * 10 };
  };

  // ---- Acid, pickups, and the flashes of a fight. ----
  const spitMeshes = new Map<number, THREE.Mesh>();
  const spitGeometry = keep(new THREE.IcosahedronGeometry(0.18, 0));
  const spitMaterial = glow("#c8f04a");
  const pickupMeshes = new Map<number, THREE.Group>();
  const buildPickup = (kind: "ammo" | "health") => {
    const group = inert(new THREE.Group());
    if (kind === "ammo") {
      part(group, 0.6, 0.38, 0.4, lambert("#5a6a3a"), 0, 0, 0);
      part(group, 0.62, 0.08, 0.42, glow("#ffe34a"), 0, 0.05, 0);
    } else {
      part(group, 0.5, 0.5, 0.5, lambert("#e9e4da"), 0, 0, 0);
      const cross = glow("#7cdc5a");
      part(group, 0.12, 0.34, 0.52, cross, 0, 0, 0);
      part(group, 0.12, 0.12, 0.52, cross, 0, 0, 0).scale.set(0.34, 0.12, 0.52);
    }
    const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.5, 0.62, 16)), glow(kind === "ammo" ? "#ffe34a" : "#7cdc5a", { transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.55;
    group.add(ring);
    scene.add(group);
    return group;
  };
  type Burst = { points: THREE.Points; velocities: Float32Array; age: number; material: THREE.PointsMaterial };
  const bursts: Burst[] = [];
  const burst = (x: number, y: number, z: number, color: string) => {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions.set([x, y, z], index * 3);
      velocities.set([(random() - 0.5) * 6, random() * 5, (random() - 0.5) * 6], index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 1 });
    const points = inert(new THREE.Points(geometry, material));
    scene.add(points);
    bursts.push({ points, velocities, age: 0, material });
  };

  // ---- The carbine in AXIOM's hands. ----
  const gun = new THREE.Group();
  const gunBody = lambert("#3a3f4e");
  part(gun, 0.12, 0.14, 0.62, gunBody, 0, 0, 0);
  part(gun, 0.05, 0.05, 0.34, lambert("#5a546e"), 0, 0.02, -0.46);
  const coils = [-0.12, -0.02, 0.08].map((z) => part(gun, 0.15, 0.04, 0.05, glow("#9ac4ff"), 0, 0.02, z));
  part(gun, 0.08, 0.18, 0.1, lambert("#2b2433"), 0, -0.14, 0.12);
  part(gun, 0.1, 0.16, 0.22, gunBody, 0, -0.03, 0.38);
  part(gun, 0.03, 0.05, 0.03, glow("#ff695c"), 0, 0.1, -0.1);
  const flash = part(gun, 0.16, 0.16, 0.16, glow("#ffe9a8"), 0, 0.02, -0.68);
  flash.visible = false;
  for (const child of gun.children) child.raycast = () => {};
  gun.position.set(0.3, -0.28, -0.55);
  camera.add(gun);
  scene.add(camera);
  const muzzleLight = new THREE.PointLight("#bcd8ff", 0, 8, 1.5);
  muzzleLight.position.set(0.3, -0.2, -1.1);
  camera.add(muzzleLight);
  const tracer = inert(new THREE.Mesh(unitBox, glow("#bcd8ff", { transparent: true, opacity: 0.85 })));
  tracer.visible = false;
  scene.add(tracer);
  const spark = inert(new THREE.Mesh(unitBox, glow("#ffe9a8")));
  spark.scale.setScalar(0.25);
  spark.visible = false;
  scene.add(spark);

  // ---- Running the fight. ----
  let yaw = 0;
  let pitch = 0;
  let recoil = 0;
  let flashFor = 0;
  let tracerFor = 0;
  let hurt = 0;
  let marker = 0;
  let shake = 0;
  let bob = 0;
  // The sim-body's feet: how high they are, how fast they rise or fall, and the jolt of landing.
  let feet = groundAt(0, 0);
  let rise = 0;
  let landing = 0;
  /** What the feet stand on here: the ground, or the top of a boulder underfoot. */
  const floorAt = (x: number, z: number) => {
    let floor = groundAt(x, z);
    for (const obstacle of obstacles) {
      if (obstacle.top < Infinity && obstacle.top > floor && Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.r) floor = obstacle.top;
    }
    return floor;
  };
  let banner: { text: string; until: number } | null = { text: `Simulation online · ${SIM_DIFFICULTIES[difficulty].label}`, until: 2.6 };
  let audio: SimAudio | null = null;
  const raycaster = new THREE.Raycaster();
  raycaster.far = 90;
  const centre = new THREE.Vector2(0, 0);
  const right = new THREE.Vector3();
  const relative = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  const heard = (x: number, y: number, z: number) => {
    relative.set(x - camera.position.x, y - camera.position.y, z - camera.position.z);
    const distance = relative.length();
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    return { pan: distance > 0.01 ? relative.normalize().dot(right) : 0, gain: Math.max(0, 1 - distance / 45) ** 1.2 };
  };

  const pull = () => {
    raycaster.setFromCamera(centre, camera);
    const targets: THREE.Object3D[] = [trunkMesh, ...[...models.values()].map((model) => model.group)];
    const hit = raycaster.intersectObjects(targets, true)[0];
    let alienId: number | null = null;
    for (let object: THREE.Object3D | null = hit?.object ?? null; object; object = object.parent) {
      if (typeof object.userData.alienId === "number") {
        alienId = object.userData.alienId;
        break;
      }
    }
    if (!fireCarbine(state, alienId, random)) return;
    recoil = 1;
    flashFor = 0.05;
    tracerFor = 0.05;
    const end = hit ? hit.point : raycaster.ray.at(60, new THREE.Vector3());
    flash.getWorldPosition(muzzle);
    tracer.position.copy(muzzle).add(end).multiplyScalar(0.5);
    tracer.scale.set(0.03, 0.03, muzzle.distanceTo(end));
    tracer.lookAt(end);
    if (hit) {
      spark.position.copy(hit.point);
      spark.visible = true;
    }
    if (alienId !== null) {
      marker = 1;
      const model = models.get(alienId);
      if (model) model.flash = 1;
    }
  };

  const update = (dt: number, input: SimInput, now: number) => {
    audio ??= createSimAudio();
    const player = state.player;
    if (player.alive) {
      // Walk or run.
      const speed = input.sprint ? RUN : WALK;
      const length = Math.hypot(input.forward, input.strafe);
      if (length > 0) {
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        player.x += ((input.forward * forwardX + input.strafe * -forwardZ) / length) * speed * dt;
        player.z += ((input.forward * forwardZ + input.strafe * forwardX) / length) * speed * dt;
        if (rise === 0) bob += dt * (input.sprint ? 13 : 9);
      }
      // Every frame, moving or falling: kept out of trunks and of any boulder not below the
      // feet, and held inside the simulation.
      for (const obstacle of obstacles) {
        if (feet >= obstacle.top - STEP) continue;
        const apart = Math.hypot(player.x - obstacle.x, player.z - obstacle.z);
        const room = obstacle.r + BODY;
        if (apart < room && apart > 0.0001) {
          player.x = obstacle.x + ((player.x - obstacle.x) / apart) * room;
          player.z = obstacle.z + ((player.z - obstacle.z) / apart) * room;
        }
      }
      const reach = Math.hypot(player.x, player.z);
      if (reach > ARENA_RADIUS - 0.6) {
        player.x *= (ARENA_RADIUS - 0.6) / reach;
        player.z *= (ARENA_RADIUS - 0.6) / reach;
      }

      // Jumping: up about a metre, onto a rock if one is low enough, and down again.
      const floor = floorAt(player.x, player.z);
      // On the ground, the feet follow it up and down slopes and over a step; off a ledge, they fall.
      if (rise === 0 && feet - floor < STEP) feet = floor;
      const standing = rise === 0 && feet === floor;
      if (standing && input.jump) {
        rise = JUMP;
        audio?.jump();
      }
      if (!standing || rise !== 0) {
        rise -= GRAVITY * dt;
        feet += rise * dt;
        if (feet <= floor) {
          if (rise < -4) {
            landing = Math.min(1, -rise / 9);
            audio?.land(landing);
          }
          feet = floor;
          rise = 0;
        }
      }
      if (input.firing) pull();
      stepSim(state, dt, random);
    }

    // What happened: sounds, flashes, banners.
    for (const event of state.events) {
      if (event.type === "wave") {
        banner = { text: `Wave ${event.wave}`, until: state.time + 2 };
        audio?.wave();
      } else if (event.type === "cleared") {
        const done = onCleared?.(event.wave, event.drill) ?? null;
        banner = { text: done ? `Wave ${event.wave} cleared · ${done}` : `Wave ${event.wave} cleared`, until: state.time + 2.6 };
      } else if (event.type === "scream" || event.type === "spawn") {
        const at = heard(event.x, 1.5, event.z);
        audio?.scream(event.kind, at.pan, at.gain * (event.type === "spawn" ? 0.7 : 1));
      } else if (event.type === "strike") {
        const at = heard(event.x, 1, event.z);
        audio?.strike(event.kind, at.pan, at.gain);
        // The one that struck lunges: the nearest of its kind to where the blow came from.
        let nearest: AlienModel | null = null;
        for (const candidate of models.values()) {
          if (candidate.kind !== event.kind) continue;
          if (!nearest || Math.hypot(candidate.group.position.x - event.x, candidate.group.position.z - event.z) < Math.hypot(nearest.group.position.x - event.x, nearest.group.position.z - event.z)) nearest = candidate;
        }
        if (nearest) nearest.lunge = 1;
      } else if (event.type === "kill") {
        const at = heard(event.x, 1, event.z);
        audio?.kill(event.kind, at.pan, at.gain);
      } else if (event.type === "spit") {
        const at = heard(event.x, 1.2, event.z);
        audio?.spit(at.pan, at.gain);
      } else if (event.type === "hurt") {
        hurt = 1;
        shake = reducedMotion ? 0 : 1;
        audio?.hurt();
      } else if (event.type === "shot") audio?.gun();
      else if (event.type === "dry") audio?.dry();
      else if (event.type === "reload") audio?.reload();
      else if (event.type === "pickup") audio?.pickup();
      else if (event.type === "death") {
        // The results panel says it; the banner would only repeat it.
        audio?.death();
        banner = null;
      }
    }
    state.events.length = 0;

    // The aliens' bodies follow the rules' aliens; the fallen come apart.
    const alive = new Set(state.aliens.map((alien) => alien.id));
    for (const [id, model] of models) {
      if (alive.has(id)) continue;
      const kind = model.kind;
      burst(model.group.position.x, model.group.position.y + (kind === "brute" ? 2 : 1), model.group.position.z, kind === "spitter" ? "#c8f04a" : kind === "brute" ? "#ff8a5a" : "#b48cff");
      scene.remove(model.group);
      models.delete(id);
    }
    for (const alien of state.aliens) {
      let model = models.get(alien.id);
      if (!model) {
        model = buildAlien(alien.id, alien.kind);
        models.set(alien.id, model);
      }
      const { group } = model;
      const moved = Math.hypot(alien.x - group.position.x, alien.z - group.position.z);
      const faceX = player.x - alien.x;
      const faceZ = player.z - alien.z;
      group.rotation.y = Math.atan2(faceX, faceZ);
      model.lunge = Math.max(0, model.lunge - dt * 3);
      const lungeOffset = Math.sin(model.lunge * Math.PI) * 0.6;
      group.position.set(alien.x + Math.sin(group.rotation.y) * lungeOffset, groundAt(alien.x, alien.z), alien.z + Math.cos(group.rotation.y) * lungeOffset);
      model.step += moved * 3.2;
      model.legs.forEach((leg, index) => { leg.rotation.x = Math.sin(model!.step + index * Math.PI * 0.5) * (moved > 0.0005 ? 0.6 : 0.1); });
      model.arms.forEach((arm, index) => { arm.rotation.x = -model!.lunge * 2.2 + Math.sin(model!.step + index * Math.PI) * 0.3; });
      if (alien.kind === "spitter") group.position.y += Math.sin(now * 0.006 + alien.id) * 0.08;
      model.flash = Math.max(0, model.flash - dt * 8);
      for (const material of model.skin) material.emissiveIntensity = model.flash * 0.9;
    }
    for (const [id, mesh] of spitMeshes) {
      if (state.spit.some((blob) => blob.id === id)) continue;
      scene.remove(mesh);
      spitMeshes.delete(id);
    }
    for (const blob of state.spit) {
      let mesh = spitMeshes.get(blob.id);
      if (!mesh) {
        mesh = inert(new THREE.Mesh(spitGeometry, spitMaterial));
        scene.add(mesh);
        spitMeshes.set(blob.id, mesh);
      }
      mesh.position.set(blob.x, groundAt(blob.x, blob.z) + 1.2, blob.z);
    }
    for (const [id, group] of pickupMeshes) {
      if (state.pickups.some((pickup) => pickup.id === id)) continue;
      scene.remove(group);
      pickupMeshes.delete(id);
    }
    for (const pickup of state.pickups) {
      let group = pickupMeshes.get(pickup.id);
      if (!group) {
        group = buildPickup(pickup.kind);
        pickupMeshes.set(pickup.id, group);
      }
      group.position.set(pickup.x, groundAt(pickup.x, pickup.z) + 0.6 + Math.sin(now * 0.004 + pickup.id) * 0.1, pickup.z);
      group.rotation.y = now * 0.0015;
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
          positions.getY(particle) + piece.velocities[particle * 3 + 1] * dt,
          positions.getZ(particle) + piece.velocities[particle * 3 + 2] * dt,
        );
      }
      positions.needsUpdate = true;
      piece.material.opacity = Math.max(0, 1 - piece.age / 0.9);
      if (piece.age > 0.9) {
        scene.remove(piece.points);
        piece.points.geometry.dispose();
        piece.material.dispose();
        bursts.splice(index, 1);
      }
    }

    // The camera, the carbine, and the flashes.
    recoil = Math.max(0, recoil - dt * 9);
    hurt = Math.max(0, hurt - dt * 1.6);
    marker = Math.max(0, marker - dt * 5);
    shake = Math.max(0, shake - dt * 4);
    landing = Math.max(0, landing - dt * 4);
    flashFor -= dt;
    tracerFor -= dt;
    flash.visible = flashFor > 0;
    muzzleLight.intensity = flashFor > 0 ? 4 : 0;
    tracer.visible = tracerFor > 0;
    if (tracerFor <= -0.05) spark.visible = false;
    const sway = reducedMotion ? 0 : Math.sin(bob) * 0.03;
    const jolt = shake * 0.05;
    // A hard landing dips the view for a moment.
    const sink = reducedMotion ? 0 : landing * 0.22;
    camera.position.set(player.x, feet + EYE + Math.abs(sway) * 0.5 - sink, player.z);
    camera.rotation.set(pitch + recoil * 0.025 + (Math.random() - 0.5) * jolt, yaw + (Math.random() - 0.5) * jolt, 0);
    const reloading = player.reloadDone !== null ? 1 - (player.reloadDone - state.time) / CARBINE.reload : null;
    const dip = reloading !== null ? Math.sin(Math.min(1, reloading) * Math.PI) : 0;
    gun.position.set(0.3 + sway, -0.28 - dip * 0.18 + Math.abs(sway) * 0.4, -0.55 + recoil * 0.07);
    gun.rotation.set(recoil * 0.12 + dip * 0.7, dip * 0.4, dip * 0.3);
    coils.forEach((coil, index) => { coil.visible = reloading === null || Math.floor(now / 120 + index) % 2 === 0; });
    for (let index = 0; index < fireflyCount; index += 1) {
      const seed = fireflySeeds[index];
      const x = seed.x + Math.sin(now * 0.0003 + seed.phase) * 2;
      const z = seed.z + Math.cos(now * 0.00025 + seed.phase) * 2;
      fireflyPositions.set([x, groundAt(x, z) + 1 + Math.sin(now * 0.001 + seed.phase) * 0.6 + 0.6, z], index * 3);
    }
    fireflyGeometry.attributes.position.needsUpdate = true;
    gridTexture.offset.y = (now * 0.00005) % 1;
    if (banner && state.time > banner.until) banner = null;
  };

  return {
    scene,
    camera,
    state,
    /** Turn and tilt AXIOM's view, from mouse movement. */
    look(dx: number, dy: number) {
      yaw -= dx * 0.0024;
      pitch = Math.max(-1.3, Math.min(1.3, pitch - dy * 0.0024));
    },
    reload() {
      reloadCarbine(state);
    },
    update,
    resize(aspect: number) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    hud(): SimHud {
      const player = state.player;
      return {
        health: player.health,
        maxHealth: player.maxHealth,
        magazine: player.magazine,
        reserve: player.reserve,
        reloading: player.reloadDone !== null ? Math.min(1, 1 - (player.reloadDone - state.time) / CARBINE.reload) : null,
        wave: state.wave,
        score: state.score,
        kills: state.kills,
        cleared: state.cleared,
        alive: player.alive,
        hurt,
        marker,
        banner: banner?.text ?? null,
      };
    },
    dispose() {
      audio?.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry && mesh.geometry !== unitBox && mesh.geometry !== spitGeometry) mesh.geometry.dispose();
      });
      for (const thing of disposables) thing.dispose();
      gridTexture.dispose();
    },
  };
}

/** The best score on this device, per difficulty; the simulation keeps nothing in the game's save. */
export function bestSimScore(difficulty: SimDifficulty, score?: number) {
  const key = `axiom-foundry-sim-best-${difficulty}`;
  let best = 0;
  try {
    best = Number(window.localStorage.getItem(key)) || 0;
    if (score !== undefined && score > best) {
      best = score;
      window.localStorage.setItem(key, String(score));
    }
  } catch {
    // Storage blocked: the best only lasts this visit.
    if (score !== undefined) best = Math.max(best, score);
  }
  return best;
}
