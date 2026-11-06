/*
 * The combat simulation's world, drawn with the drone view's renderer: a jungle
 * that never was, under a green dusk and a great pale moon, its edge a glowing
 * grid where the simulation ends. Aliens come out of the trees as voxel things
 * with lit eyes; the Arc Carbine is in AXIOM's hands, its coils glowing hotter as
 * it fires and its loadout fitted (arc-carbine-model), throwing bolts of arc. The
 * training dome over the clearing recharges its cell. The rules are ark-sim-rules;
 * this moves, draws and voices them.
 */

import * as THREE from "three";
import { beastBuilder } from "./ark-sim-beasts";

import { carbineReadout, DEFAULT_LOADOUT, OPTICS, switchLaw, type CarbineForm, type CarbineLoadout } from "./arc-carbine";
import { createArcs, dressCarbine, heatColour } from "./arc-carbine-model";
import { createSimAudio, type SimAudio } from "./ark-sim-audio";
import { conduitCleared, conduitCourse, encounterName, ENCOUNTERS } from "./ark-sim-conduit";
import { buildConduit } from "./ark-sim-conduit-scene";
import type { LyraCue } from "./lyra-voice";
import {
  ARENA_RADIUS,
  SIM_DIFFICULTIES,
  SIM_DOME,
  isPowered,
  createSim,
  dodge,
  fireCarbine,
  punch,
  reloadCarbine,
  slam,
  stepSim,
  tetherAlien,
  type AlienKind,
  type SimDifficulty,
  type SimState,
} from "./ark-sim-rules";

/** The simulation modes: waves of aliens in the jungle, a rescue from a ruined building, or a flight down the Conduit. */
export type SimMode = "swarm" | "extraction" | "conduit";

export type SimInput = {
  forward: number;
  strafe: number;
  sprint: boolean;
  firing: boolean;
  jump: boolean;
  /**
   * The other hands. The right button aims. In Extraction, C and F switch crouching and
   * the light on each press. In Swarm, sprint is the dash, C slides on the ground and
   * slams from the air, E punches and F fires the tether.
   */
  aim?: boolean;
  crouch?: boolean;
  interact?: boolean;
  light?: boolean;
};

/** The Arc Carbine as the heads-up display shows it, and whether its cell is drawing power. */
export type SimCarbine = ReturnType<typeof carbineReadout> & { powered: boolean; /** Fed by a power pack on AXIOM's back rather than a dome. */ pack?: boolean };

export type SimHud = {
  health: number;
  maxHealth: number;
  carbine: SimCarbine;
  /** Swarm only: dash charges (up to three), thruster fuel (0 to 1), and whether the sim-body slides or hangs on its tether. */
  motion?: { dashes: number; fuel: number; sliding: boolean; tethered: boolean };
  /** Swarm only: 1 on the Law-Heart's beat, falling away between; shots on the beat strike harder. */
  beat?: number;
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
  /** Extraction only: the objective, where AXIOM is, what E would do and how far along, and how close it is to being seen. */
  objective?: string;
  location?: string;
  prompt?: string | null;
  progress?: number | null;
  spotted?: number;
  alarm?: boolean;
  /** 0 to 1: a Hollowed close by, corrupting the view. */
  glitch?: number;
  aiming?: boolean;
  stance?: string;
  survivors?: readonly ("held" | "following" | "safe" | "lost")[];
  /** Set once a mission is over, for the results panel. */
  result?: { success: boolean; title: string; lines: string[] } | null;
};

/** What the drone view needs of any simulation, whichever mode is running. */
export type SimWorld = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  state: unknown;
  look(dx: number, dy: number): void;
  reload(): void;
  /** Write a different firing law into the carbine's kernel, mid-fight. */
  law?(form: CarbineForm): void;
  /** What the world noticed since last asked, for Lyra to warn of. */
  cues?(): LyraCue[];
  update(dt: number, input: SimInput, now: number): void;
  resize(aspect: number): void;
  hud(): SimHud;
  dispose(): void;
};

const EYE = 1.6;
const BODY = 0.4;
/** The sim-body is no person: faster than anything it fights, quick to turn on the ground, steerable in the air. */
const MOVE = 9;
const GROUND_ACCEL = 70;
const AIR_ACCEL = 22;
/** A dash: a burst of speed nothing can touch, on three charges that come back one at a time. */
const DASH_SPEED = 27;
const DASH_SECONDS = 0.17;
const DASH_CHARGES = 3;
const DASH_RECHARGE = 1.1;
/** A slide: low and fast, and a jump out of it keeps the speed. */
const SLIDE_SPEED = 14;
const SLIDE_EYE = 0.75;
/** A jump and gravity; a slam drives down hard, and a jump just after its landing goes higher. */
const JUMP = 6.6;
const GRAVITY = 17;
const SLAM_SPEED = 40;
const SLAM_BOUNCE = 1.75;
/** Transit thrusters: hold jump in the air to climb, on a little fuel that refills on the ground. */
const THRUST = 30;
const FUEL_SECONDS = 1.1;
const FUEL_REFILL = 1.4;
/** The Containment tether: how far it reaches, how fast it hauls, how long it holds. */
const TETHER_RANGE = 34;
const TETHER_SPEED = 26;
const TETHER_SECONDS = 1.3;
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
  /** A head that twitches, a jaw that opens too far, a harrier's wings, too many eyes, and glands that swell. */
  head: THREE.Object3D | null;
  jaw: THREE.Object3D | null;
  wings: THREE.Object3D[];
  eyes: THREE.Object3D[];
  glands: THREE.Object3D[];
  /** The Null losing track of it: where it hung for a moment, and the afterimage left there. */
  held: { x: number; y: number; z: number; until: number } | null;
  nextStutter: number;
  ghost: THREE.Object3D;
  ghostUntil: number;
  twitch: number;
  twitchUntil: number;
  blinkUntil: number;
  screamUntil: number;
};

export type SimWorldOptions = {
  reducedMotion?: boolean;
  /**
   * A wave beaten outright, and the Security training it drilled. The caller hands the
   * drill to the trainees and may name what it did, for the banner.
   */
  onCleared?: (wave: number, drill: number) => string | null;
  /** The Arc Carbine's firing law and attachments for the run. */
  loadout?: CarbineLoadout;
  /** The Ark's Law-Heart beat, carried into the simulation: shots on it strike harder. */
  beatPeriodMs?: number;
  /** The open jungle, or the Conduit's tubes and hall (ark-sim-conduit.ts). */
  map?: "jungle" | "conduit";
};

/** How far a bolt fired from the hip can stray, on top of its firing law's own spread. */
const HIP_SPREAD = 0.004;

export function createSimWorld(difficulty: SimDifficulty, { reducedMotion = false, onCleared, loadout = DEFAULT_LOADOUT, beatPeriodMs = 1300, map = "jungle" }: SimWorldOptions = {}) {
  const random = seeded(Math.floor(Math.random() * 1e9));
  const conduit = map === "conduit";
  const state: SimState = createSim(difficulty, random, loadout, conduit ? conduitCourse() : undefined);
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

  const tint = new THREE.Color();
  // The jungle's own sky and ground; the Conduit brings its own (ark-sim-conduit-scene.ts).
  if (!conduit) {
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
  }

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
  for (let attempt = 0; !conduit && attempt < 900 && placed.length < 190; attempt += 1) {
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
  const canopyMesh = instanced(leaves, lambert("#ffffff"));
  // Undergrowth and glowing flowers, which the drone's rounds pass through.
  const brush: { matrix: THREE.Matrix4; color: string }[] = [];
  const blooms: { matrix: THREE.Matrix4; color: string }[] = [];
  for (let plant = 0; !conduit && plant < 520; plant += 1) {
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
  const fireflyCount = conduit ? 0 : 140;
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
  edge.visible = !conduit;
  scene.add(edge);

  // ---- Or the Conduit's tubes and hall instead. ----
  const conduitScene = conduit ? buildConduit(scene, keep) : null;
  /** The Conduit's walls, floors and anchors: what bolts and the tether meet. */
  const surfaces = conduitScene?.surfaces ?? [];
  /** The floor's height: the jungle's rolling ground, or the Conduit's level one. */
  const levelAt = conduit ? () => 0 : groundAt;

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
  const ghostMaterial = glow("#9a6aff", { transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  const toothMaterial = glow("#e8e0d0");
  const mouthMaterial = glow("#ff2a4a");
  /** The simulation's creatures (ark-sim-beasts.ts), each with an afterimage for when the Null loses track of it. */
  const makeBeast = beastBuilder(keep);
  const buildAlien = (id: number, kind: AlienKind): AlienModel => {
    const { group, legs, arms, skin, head, jaw, wings, eyes, glands } = makeBeast(kind);
    group.userData.alienId = id;
    // Its afterimage: the same shape in the Null's violet, left behind where it stuttered.
    const ghost = group.clone(true);
    ghost.traverse((object) => {
      object.userData = {};
      object.raycast = () => {};
      if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).material = ghostMaterial;
    });
    ghost.visible = false;
    scene.add(ghost);
    scene.add(group);
    return {
      group, legs, arms, skin, kind, flash: 0, lunge: 0, step: random() * 10,
      head, jaw, wings, eyes, glands, held: null, nextStutter: performance.now() + 1000 + random() * 3000,
      ghost, ghostUntil: 0, twitch: 0, twitchUntil: 0, blinkUntil: 0, screamUntil: 0,
    };
  };

  // ---- Acid, pickups, and the flashes of a fight. ----
  const spitMeshes = new Map<number, THREE.Mesh>();
  const spitGeometry = keep(new THREE.IcosahedronGeometry(0.18, 0));
  const spitMaterial = glow("#c8f04a");
  const boltMeshes = new Map<number, { head: THREE.Mesh; mark: THREE.Mesh; start: number }>();
  const boltGeometry = keep(new THREE.BoxGeometry(0.16, 0.16, 1.5));
  const boltMaterial = glow("#ff9ae8");
  const boltMarkGeometry = keep(new THREE.RingGeometry(0.72, 1, 18));
  const boltMarkMaterial = glow("#ff9ae8", { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const pickupMeshes = new Map<number, THREE.Group>();
  const buildPickup = (kind: "cell" | "health") => {
    const group = inert(new THREE.Group());
    if (kind === "cell") {
      // A spare cell for the carbine, lit along its window.
      part(group, 0.32, 0.5, 0.32, lambert("#3a3f4e"), 0, 0, 0);
      part(group, 0.34, 0.3, 0.1, glow("#9ac4ff"), 0, 0, 0.13);
    } else {
      part(group, 0.5, 0.5, 0.5, lambert("#e9e4da"), 0, 0, 0);
      const cross = glow("#7cdc5a");
      part(group, 0.12, 0.34, 0.52, cross, 0, 0, 0);
      part(group, 0.12, 0.12, 0.52, cross, 0, 0, 0).scale.set(0.34, 0.12, 0.52);
    }
    const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.5, 0.62, 16)), glow(kind === "cell" ? "#9ac4ff" : "#7cdc5a", { transparent: true, opacity: 0.6 }));
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
  // A status light on the side, out of the way of the sights.
  part(gun, 0.012, 0.03, 0.03, glow("#ff695c"), 0.066, 0.03, 0.02);
  const dressed = keep(dressCarbine(gun, loadout));
  const flash = part(gun, 0.16, 0.16, 0.16, glow("#dce8ff"), 0, 0.02, dressed.muzzle);
  flash.visible = false;
  for (const child of gun.children) child.raycast = () => {};
  gun.position.set(0.3, -0.28, -0.55);
  camera.add(gun);
  // The sim-body's own fist, for the Conservation strike, and the line of its tether.
  const fist = new THREE.Group();
  part(fist, 0.14, 0.14, 0.34, lambert("#3a3f4e"), 0, 0, 0);
  part(fist, 0.16, 0.06, 0.06, glow("#c9b6ff"), 0, 0.02, -0.18);
  for (const child of fist.children) child.raycast = () => {};
  fist.visible = false;
  camera.add(fist);
  const tetherGeometry = keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]));
  const tetherLine = inert(new THREE.Line(tetherGeometry, keep(new THREE.LineBasicMaterial({ color: "#c9b6ff" }))));
  tetherLine.frustumCulled = false;
  tetherLine.visible = false;
  scene.add(tetherLine);
  const tetherEnd = new THREE.Vector3();
  scene.add(camera);
  const muzzleLight = new THREE.PointLight("#bcd8ff", 0, 8, 1.5);
  muzzleLight.position.set(0.3, -0.2, -1.1);
  camera.add(muzzleLight);
  const arcs = keep(createArcs(scene, random));
  const coilColour = new THREE.Color();
  // The training dome over the clearing: inside it the carbine's cell draws power.
  const domeGeometry = keep(new THREE.SphereGeometry(SIM_DOME.radius, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const dome = inert(new THREE.Mesh(domeGeometry, glow("#c9b6ff", { transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })));
  dome.position.set(SIM_DOME.x, groundAt(SIM_DOME.x, SIM_DOME.z) - 0.2, SIM_DOME.z);
  scene.add(dome);
  const domeEdge = inert(new THREE.Mesh(keep(new THREE.RingGeometry(SIM_DOME.radius - 0.12, SIM_DOME.radius, 48)), glow("#c9b6ff", { transparent: true, opacity: 0.55, side: THREE.DoubleSide })));
  domeEdge.rotation.x = -Math.PI / 2;
  domeEdge.position.set(SIM_DOME.x, groundAt(SIM_DOME.x, SIM_DOME.z) + 0.05, SIM_DOME.z);
  scene.add(domeEdge);
  dome.visible = domeEdge.visible = !conduit;
  const spark = inert(new THREE.Mesh(unitBox, glow("#ffe9a8")));
  spark.scale.setScalar(0.25);
  spark.visible = false;
  scene.add(spark);

  // ---- Running the fight. ----
  let yaw = 0;
  let pitch = 0;
  let recoil = 0;
  let flashFor = 0;
  let aimBlend = 0;
  let hurt = 0;
  let marker = 0;
  let shake = 0;
  let bob = 0;
  // The sim-body's feet: how high they are, how fast they rise or fall, and the jolt of landing.
  let feet = levelAt(0, 0);
  let rise = 0;
  let landing = 0;
  // Moving like a machine: momentum, three dash charges, a slide, a slam and its bounce,
  // Transit thrusters on a little fuel, the Containment tether, and the fist.
  let vx = 0;
  let vz = 0;
  let dashes = DASH_CHARGES;
  let dashUntil = 0;
  let sliding = false;
  let slideX = 0;
  let slideZ = 0;
  let slamming = false;
  let slamFrom = 0;
  let bounceUntil = 0;
  let fuel = 1;
  let thrusting = false;
  let tether: { point: THREE.Vector3; until: number; alienId: number | null } | null = null;
  let tetherReady = 0;
  let tetherFlash = 0;
  let punchFor = 0;
  let eyeHeight = EYE;
  let fovKick = 0;
  // The Law-Heart's beat, and whether a shot now would land on it.
  let lastBeat = -1;
  let beatGlow = 0;
  let resonantWindow = false;
  const held = { jump: false, dash: false, crouch: false, punch: false, tether: false };
  // The Conduit is simulated space: lighter, with thrusters that last longer and top up even in
  // the air, and a hall big enough to need a longer tether.
  const gravity = conduit ? 9.5 : GRAVITY;
  const fuelSeconds = conduit ? 2.4 : FUEL_SECONDS;
  const airRefill = conduit ? 0.3 : 0;
  const tetherRange = conduit ? 48 : TETHER_RANGE;
  /** What the feet stand on here: the ground, or the top of a boulder underfoot. */
  const floorAt = (x: number, z: number) => {
    let floor = levelAt(x, z);
    for (const obstacle of obstacles) {
      if (obstacle.top < Infinity && obstacle.top > floor && Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.r) floor = obstacle.top;
    }
    return floor;
  };
  let banner: { text: string; until: number } | null = { text: `${conduit ? "The Conduit" : "Simulation online"} · ${SIM_DIFFICULTIES[difficulty].label}`, until: 2.6 };
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

  /** Fire: each bolt the firing law throws strays a little, less down the sights, and strikes what it meets. */
  const pull = (aiming: boolean) => {
    const targets: THREE.Object3D[] = [trunkMesh, ...surfaces, ...[...models.values()].map((model) => model.group)];
    const ends: THREE.Vector3[] = [];
    let struck = false;
    const shot = fireCarbine(state, (discharge) => Array.from({ length: discharge.bolts }, () => {
      raycaster.setFromCamera(centre, camera);
      const spread = discharge.spread * (aiming ? 0.5 : 1) + (aiming ? 0 : HIP_SPREAD);
      const direction = raycaster.ray.direction;
      direction.set(direction.x + (random() - 0.5) * spread * 2, direction.y + (random() - 0.5) * spread * 2, direction.z + (random() - 0.5) * spread * 2).normalize();
      const hit = raycaster.intersectObjects(targets, true)[0];
      ends.push(hit ? hit.point.clone() : raycaster.ray.at(60, new THREE.Vector3()));
      for (let object: THREE.Object3D | null = hit?.object ?? null; object; object = object.parent) {
        if (typeof object.userData.alienId !== "number") continue;
        struck = true;
        const model = models.get(object.userData.alienId);
        if (model) model.flash = 1;
        return object.userData.alienId as number;
      }
      return null;
    }), random, resonantWindow);
    if (!shot) return;
    recoil = shot.damage > 2 || shot.bolts > 1 ? 1.7 : 1;
    flashFor = 0.05;
    flash.getWorldPosition(muzzle);
    for (const end of ends) arcs.fire(muzzle, end, resonantWindow);
    if (ends[0]) {
      spark.position.copy(ends[0]);
      spark.visible = true;
    }
    if (struck) marker = 1;
  };

  const update = (dt: number, input: SimInput, now: number) => {
    audio ??= createSimAudio();
    const player = state.player;
    const aiming = Boolean(input.aim) && player.alive;
    // The Law-Heart's beat, carried in: a soft pulse, and a moment on it when shots strike harder.
    const sinceBeat = now % beatPeriodMs;
    const beatIndex = Math.floor(now / beatPeriodMs);
    if (beatIndex !== lastBeat) {
      lastBeat = beatIndex;
      if (player.alive) audio?.beat();
    }
    resonantWindow = sinceBeat < 130 || sinceBeat > beatPeriodMs - 90;
    beatGlow = Math.exp(-sinceBeat / 150);
    if (player.alive) {
      const t = state.time;
      const pressed = (down: boolean | undefined, key: keyof typeof held) => Boolean(down) && !held[key];
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      let wishX = input.forward * forwardX + input.strafe * -forwardZ;
      let wishZ = input.forward * forwardZ + input.strafe * forwardX;
      const wish = Math.hypot(wishX, wishZ);
      if (wish > 0) {
        wishX /= wish;
        wishZ /= wish;
      }
      const floor = floorAt(player.x, player.z);
      const grounded = rise === 0 && !tether && feet - floor < STEP;

      // Shift: a dash the way the sim-body is steering (or facing), that blows pass straight through.
      if (pressed(input.sprint, "dash") && dashes >= 1) {
        vx = (wish > 0 ? wishX : forwardX) * DASH_SPEED;
        vz = (wish > 0 ? wishZ : forwardZ) * DASH_SPEED;
        dashUntil = t + DASH_SECONDS;
        dashes -= 1;
        dodge(state, DASH_SECONDS + 0.06);
        sliding = false;
        tether = null;
        if (!grounded) rise = Math.max(rise, 0);
        audio?.dash();
      }
      if (t >= dashUntil) dashes = Math.min(DASH_CHARGES, dashes + dt / DASH_RECHARGE);

      // C: a slide along the ground, or from the air a slam that shakes it.
      if (input.crouch && grounded && !sliding && t >= dashUntil && (wish > 0 || Math.hypot(vx, vz) > 3)) {
        const speed = Math.max(0.001, Math.hypot(vx, vz));
        sliding = true;
        slideX = wish > 0 ? wishX : vx / speed;
        slideZ = wish > 0 ? wishZ : vz / speed;
        audio?.slide();
      }
      if (!input.crouch) sliding = false;
      if (pressed(input.crouch, "crouch") && !grounded && !slamming) {
        slamming = true;
        slamFrom = feet;
        rise = -SLAM_SPEED;
        vx *= 0.15;
        vz *= 0.15;
        tether = null;
        sliding = false;
      }

      // Space: a jump (out of a slide it keeps the speed; just after a slam lands it goes higher), or
      // letting go of the tether, which flings the sim-body on. Held in the air, the thrusters.
      if (pressed(input.jump, "jump") && grounded) {
        rise = JUMP * (t < bounceUntil ? SLAM_BOUNCE : 1);
        sliding = false;
        audio?.jump();
      } else if (pressed(input.jump, "jump") && tether) {
        tether = null;
        rise = Math.max(rise, JUMP * 0.6);
      }
      thrusting = Boolean(input.jump) && !grounded && !slamming && !tether && fuel > 0 && rise < JUMP * 0.5;
      if (thrusting) {
        rise = Math.min(rise + THRUST * dt, 7);
        fuel = Math.max(0, fuel - dt / fuelSeconds);
      }
      if (grounded) fuel = Math.min(1, fuel + dt / FUEL_REFILL);
      else if (!thrusting) fuel = Math.min(1, fuel + airRefill * dt);
      audio?.thrust(thrusting ? 1 : 0);

      // F: the Containment tether, fired at whatever is in the middle of the view.
      if (pressed(input.light, "tether") && t >= tetherReady) {
        tetherReady = t + 0.45;
        raycaster.setFromCamera(centre, camera);
        raycaster.far = tetherRange;
        const hit = raycaster.intersectObjects([trunkMesh, canopyMesh, ...surfaces, ...[...models.values()].map((model) => model.group)], true)[0];
        raycaster.far = 90;
        if (hit) {
          let alienId: number | null = null;
          for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
            if (typeof object.userData.alienId !== "number") continue;
            alienId = object.userData.alienId;
            break;
          }
          const caught = alienId === null ? null : tetherAlien(state, alienId);
          if (caught === "pulled") {
            tetherFlash = 0.18;
            tetherEnd.copy(hit.point);
          } else {
            tether = { point: hit.point.clone(), until: t + TETHER_SECONDS, alienId: caught === "anchored" ? alienId : null };
            sliding = false;
            slamming = false;
          }
          audio?.tether();
        }
      }

      // E: the Conservation strike.
      if (pressed(input.interact, "punch") && punch(state, forwardX, forwardZ, random)) punchFor = 0.18;
      held.jump = Boolean(input.jump);
      held.dash = Boolean(input.sprint);
      held.crouch = Boolean(input.crouch);
      held.punch = Boolean(input.interact);
      held.tether = Boolean(input.light);

      // How it moves this frame: the tether hauls it, a dash carries it, a slide holds its speed;
      // otherwise it runs, stopping and turning at once on the ground, keeping its speed in the air.
      if (tether && tether.alienId !== null) {
        const model = models.get(tether.alienId);
        if (model) tether.point.set(model.group.position.x, model.group.position.y + 1.4, model.group.position.z);
        else tether = null;
      }
      if (tether) {
        const toX = tether.point.x - player.x;
        const toY = tether.point.y - (feet + EYE * 0.6);
        const toZ = tether.point.z - player.z;
        const apart = Math.hypot(toX, toY, toZ);
        if (apart < 2.2 || t > tether.until) {
          tether = null;
          vx *= 0.7;
          vz *= 0.7;
        } else {
          vx = (toX / apart) * TETHER_SPEED;
          vz = (toZ / apart) * TETHER_SPEED;
          rise = (toY / apart) * TETHER_SPEED;
        }
      } else if (t < dashUntil) {
        // The dash carries on as it began.
      } else if (sliding) {
        if (wish > 0) {
          const turn = Math.min(1, dt * 2);
          slideX += (wishX - slideX) * turn;
          slideZ += (wishZ - slideZ) * turn;
          const length = Math.max(0.001, Math.hypot(slideX, slideZ));
          slideX /= length;
          slideZ /= length;
        }
        vx = slideX * SLIDE_SPEED;
        vz = slideZ * SLIDE_SPEED;
      } else {
        if (grounded || wish > 0) {
          const gapX = wishX * MOVE - vx;
          const gapZ = wishZ * MOVE - vz;
          const gap = Math.hypot(gapX, gapZ);
          if (gap > 0) {
            const step = Math.min(gap, (grounded ? GROUND_ACCEL : AIR_ACCEL) * dt);
            vx += (gapX / gap) * step;
            vz += (gapZ / gap) * step;
          }
        }
        if (!grounded) {
          // Above running speed the air bleeds a little off, slowly, so a fling carries.
          const speed = Math.hypot(vx, vz);
          if (speed > MOVE) {
            const kept = Math.max(MOVE, speed - 4 * dt) / speed;
            vx *= kept;
            vz *= kept;
          }
        }
      }
      player.x += vx * dt;
      player.z += vz * dt;
      if (grounded && !sliding && Math.hypot(vx, vz) > 1) bob += dt * 11;
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
      if (state.course) {
        // The Conduit's walls; high in the hall, the wall over a tube's mouth.
        const inside = state.course.confine(player.x, player.z, BODY + 0.2, feet - levelAt(player.x, player.z));
        player.x = inside.x;
        player.z = inside.z;
      } else {
        const reach = Math.hypot(player.x, player.z);
        if (reach > ARENA_RADIUS - 0.6) {
          player.x *= (ARENA_RADIUS - 0.6) / reach;
          player.z *= (ARENA_RADIUS - 0.6) / reach;
        }
      }

      // Up and down: the tether holds it up, a dash in the air holds its height, otherwise gravity;
      // a slam's landing shakes the ground and throws back what is near.
      const below = floorAt(player.x, player.z);
      if (rise === 0 && !tether && feet - below < STEP) feet = below;
      const onGround = rise === 0 && feet === below;
      if (tether) {
        feet = Math.max(below, feet + rise * dt);
      } else if (t < dashUntil && !onGround) {
        rise = 0;
      } else if (!onGround) {
        rise -= gravity * dt;
        feet += rise * dt;
        if (feet <= below) {
          if (slamming) {
            const strength = Math.min(2, 0.7 + (slamFrom - below) / 5);
            slam(state, strength, random);
            bounceUntil = t + 0.3;
            shake = reducedMotion ? 0 : Math.min(1, strength * 0.6);
            landing = 1;
            audio?.slam(strength);
            slamming = false;
          } else if (rise < -4) {
            landing = Math.min(1, -rise / 9);
            audio?.land(landing);
          }
          feet = below;
          rise = 0;
        }
      }
      // Under the Conduit's roofs, the head stops at the ceiling.
      if (state.course) {
        const roof = levelAt(player.x, player.z) + state.course.ceilingAt(player.x, player.z) - EYE - 0.25;
        if (feet > roof) {
          feet = roof;
          rise = Math.min(rise, 0);
        }
      }
      player.lift = Math.max(0, feet - levelAt(player.x, player.z));
      if (input.firing) pull(aiming);
      stepSim(state, dt, random);
    }

    // What happened: sounds, flashes, banners.
    for (const event of state.events) {
      if (event.type === "wave") {
        banner = { text: conduit ? encounterName(state) : `Wave ${event.wave}`, until: state.time + 2 };
        audio?.wave();
      } else if (event.type === "cleared") {
        const done = onCleared?.(event.wave, event.drill) ?? null;
        const named = conduit ? (conduitCleared(state) ? "The Conduit" : ENCOUNTERS[event.wave - 1]?.name ?? "") : `Wave ${event.wave}`;
        banner = { text: done ? `${named} cleared · ${done}` : `${named} cleared`, until: state.time + 2.6 };
      } else if (event.type === "scream" || event.type === "spawn") {
        const at = heard(event.x, 1.5, event.z);
        audio?.scream(event.kind, at.pan, at.gain * (event.type === "spawn" ? 0.7 : 1));
        if (event.type === "spawn" && event.kind === "brute") audio?.arrival(at.pan);
        // The one that screamed opens its mouth: the nearest of its kind to where the sound came from.
        let screamer: AlienModel | null = null;
        for (const candidate of models.values()) {
          if (candidate.kind !== event.kind) continue;
          if (!screamer || Math.hypot(candidate.group.position.x - event.x, candidate.group.position.z - event.z) < Math.hypot(screamer.group.position.x - event.x, screamer.group.position.z - event.z)) screamer = candidate;
        }
        if (screamer) screamer.screamUntil = now + 480;
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
      } else if (event.type === "bolt") {
        const at = heard(event.x, event.y, event.z);
        audio?.bolt(at.pan, at.gain);
      } else if (event.type === "blast") {
        const at = heard(event.x, 0.5, event.z);
        audio?.blast(at.pan, at.gain);
        burst(event.x, levelAt(event.x, event.z) + 0.4, event.z, "#ffb0f0");
      } else if (event.type === "hurt") {
        hurt = 1;
        shake = reducedMotion ? 0 : 1;
        audio?.hurt();
      } else if (event.type === "shot") audio?.gun(loadout.form, loadout.barrel === "suppressor");
      else if (event.type === "vent") audio?.vent();
      else if (event.type === "dry") audio?.dry();
      else if (event.type === "reload") audio?.reload();
      else if (event.type === "pickup") audio?.pickup();
      else if (event.type === "punch") audio?.punch();
      else if (event.type === "parry") {
        audio?.parry();
        marker = 1;
      } else if (event.type === "dodged") audio?.dodged();
      else if (event.type === "flux") audio?.flux();
      else if (event.type === "resonant") audio?.resonant();
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
      burst(model.group.position.x, model.group.position.y + (kind === "brute" ? 2 : kind === "harrier" ? 0 : 1), model.group.position.z, kind === "spitter" ? "#c8f04a" : kind === "brute" ? "#ff8a5a" : kind === "harrier" ? "#8ad0ff" : "#b48cff");
      scene.remove(model.group);
      scene.remove(model.ghost);
      models.delete(id);
    }
    for (const alien of state.aliens) {
      let model = models.get(alien.id);
      if (!model) {
        model = buildAlien(alien.id, alien.kind);
        models.set(alien.id, model);
      }
      const { group } = model;
      const flying = alien.kind === "harrier";
      const faceX = player.x - alien.x;
      const faceZ = player.z - alien.z;
      const facing = Math.atan2(faceX, faceZ);
      model.lunge = Math.max(0, model.lunge - dt * 3);
      const lungeOffset = Math.sin(model.lunge * Math.PI) * 0.6;
      const toX = alien.x + Math.sin(facing) * lungeOffset;
      const toZ = alien.z + Math.cos(facing) * lungeOffset;
      let toY = levelAt(alien.x, alien.z) + (alien.height ?? 0);
      if (flying) toY += Math.sin(now * 0.004 + alien.id) * 0.25;
      if (alien.kind === "spitter") toY += Math.sin(now * 0.006 + alien.id) * 0.08;
      // The Null keeps losing track of them: now and then one hangs where it was for a moment,
      // then is suddenly where it is, leaving an afterimage behind.
      if (!reducedMotion && !model.held && now > model.nextStutter) {
        model.nextStutter = now + 1600 + random() * 3600;
        model.held = { x: group.position.x, y: group.position.y, z: group.position.z, until: now + 130 };
      }
      if (model.held && now >= model.held.until) {
        model.ghost.position.set(model.held.x, model.held.y, model.held.z);
        model.ghost.rotation.copy(group.rotation);
        model.ghost.visible = true;
        model.ghostUntil = now + 160;
        model.held = null;
      }
      if (model.ghost.visible && now > model.ghostUntil) model.ghost.visible = false;
      const moved = Math.hypot(toX - group.position.x, toZ - group.position.z);
      if (!model.held) group.position.set(toX, toY, toZ);
      group.rotation.y = facing;
      group.rotation.x = 0;
      model.step += moved * 3.2;
      model.legs.forEach((leg, index) => { leg.rotation.x = Math.sin(model!.step + index * Math.PI * 0.5) * (moved > 0.0005 ? 0.6 : 0.1); });
      if (flying) model.arms.forEach((tendril, index) => { tendril.rotation.x = Math.sin(now * 0.002 + index * 1.3 + alien.id) * 0.32; });
      else model.arms.forEach((arm, index) => { arm.rotation.x = -model!.lunge * 2.2 + Math.sin(model!.step + index * Math.PI) * 0.3; });
      // Glands fill and empty; a harrier's swells bright with each shot.
      model.glands.forEach((gland, index) => {
        const base = gland.userData.base ?? gland.scale.clone();
        gland.userData.base = base;
        gland.scale.copy(base).multiplyScalar(1 + Math.sin(now * 0.005 + index + alien.id) * 0.07 + (alien.cooldown < 0.5 && flying ? 0.32 : 0));
      });
      // A harrier's wings beat while it holds the air.
      model.wings.forEach((wing, index) => {
        const side = index === 0 ? -1 : 1;
        wing.rotation.z = side * Math.sin(now * 0.013 + alien.id) * 0.65;
      });
      // Mouths open to scream and to strike; heads twitch; the eyes go out and come back.
      if (model.jaw) model.jaw.rotation.x = 0.1 + model.lunge * 0.9 + (now < model.screamUntil ? 0.75 : 0);
      if (model.head && !reducedMotion) {
        if (now > model.twitchUntil && random() < dt * 0.9) {
          model.twitch = (random() - 0.5) * 1.1;
          model.twitchUntil = now + 110;
        }
        model.head.rotation.z = now < model.twitchUntil ? model.twitch : model.head.rotation.z * 0.85;
      }
      if (now > model.blinkUntil && random() < dt * 0.7) model.blinkUntil = now + 90;
      for (const eye of model.eyes) eye.visible = now > model.blinkUntil;
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
      mesh.position.set(blob.x, levelAt(blob.x, blob.z) + 1.2, blob.z);
    }
    // A harrier's bolts, each with a mark on the ground where it will land.
    for (const [id, bolt] of boltMeshes) {
      if (state.bolts.some((candidate) => candidate.id === id)) continue;
      scene.remove(bolt.head, bolt.mark);
      boltMeshes.delete(id);
    }
    for (const bolt of state.bolts) {
      let drawn = boltMeshes.get(bolt.id);
      if (!drawn) {
        drawn = { head: inert(new THREE.Mesh(boltGeometry, boltMaterial)), mark: inert(new THREE.Mesh(boltMarkGeometry, boltMarkMaterial)), start: bolt.y };
        drawn.mark.rotation.x = -Math.PI / 2;
        drawn.mark.position.set(bolt.toX, levelAt(bolt.toX, bolt.toZ) + 0.06, bolt.toZ);
        scene.add(drawn.head, drawn.mark);
        boltMeshes.set(bolt.id, drawn);
      }
      drawn.head.position.set(bolt.x, levelAt(bolt.x, bolt.z) + bolt.y, bolt.z);
      drawn.head.lookAt(bolt.x + bolt.dx, levelAt(bolt.x, bolt.z) + bolt.y + bolt.dy, bolt.z + bolt.dz);
      drawn.mark.scale.setScalar(0.45 + (bolt.y / drawn.start) * 1.1);
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
      group.position.set(pickup.x, levelAt(pickup.x, pickup.z) + 0.6 + Math.sin(now * 0.004 + pickup.id) * 0.1, pickup.z);
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
    flash.visible = flashFor > 0;
    muzzleLight.intensity = flashFor > 0 ? 4 : 0;
    arcs.update(dt);
    if (flashFor <= -0.05) spark.visible = false;
    aimBlend += ((aiming ? 1 : 0) - aimBlend) * Math.min(1, dt * 10);
    const sway = reducedMotion ? 0 : Math.sin(bob) * 0.03;
    const jolt = shake * 0.05;
    // A hard landing dips the view for a moment; a slide brings it down low.
    const sink = reducedMotion ? 0 : landing * 0.22;
    eyeHeight += ((sliding ? SLIDE_EYE : EYE) - eyeHeight) * Math.min(1, dt * 14);
    camera.position.set(player.x, feet + eyeHeight + Math.abs(sway) * 0.5 - sink, player.z);
    camera.rotation.set(pitch + recoil * 0.025 * (1 - aimBlend * 0.5) + (Math.random() - 0.5) * jolt, yaw + (Math.random() - 0.5) * jolt, 0);
    // Down the sights the optic draws the view in; through a scope the carbine is out of sight.
    // Speed widens it a little: a dash, the tether's haul, a slide.
    const kick = reducedMotion ? 0 : state.time < dashUntil ? 12 : tether ? 9 : sliding ? 6 : 0;
    fovKick += (kick - fovKick) * Math.min(1, dt * 12);
    const fov = 72 / (1 + aimBlend * (OPTICS[loadout.optic].zoom - 1)) + fovKick * (1 - aimBlend);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const readout = carbineReadout(player.gun, state.time);
    const reloading = readout.swapping;
    const dip = reloading !== null ? Math.sin(Math.min(1, reloading) * Math.PI) : 0;
    gun.visible = !(loadout.optic === "scope" && aimBlend > 0.85);
    gun.position.set(0.3 * (1 - aimBlend) + sway * (1 - aimBlend * 0.7), -0.28 + aimBlend * 0.165 - dip * 0.18 + Math.abs(sway) * 0.4, -0.55 - aimBlend * 0.07 + recoil * 0.07);
    gun.rotation.set(recoil * 0.12 * (1 - aimBlend * 0.6) + dip * 0.7, dip * 0.4, dip * 0.3);
    heatColour(readout.heat, readout.venting, now, coilColour);
    coils.forEach((coil, index) => {
      coil.visible = reloading === null || Math.floor(now / 120 + index) % 2 === 0;
      (coil.material as THREE.MeshBasicMaterial).color.copy(coilColour);
    });
    dressed.showCharge(readout.charge);
    // The fist drives out and back; the tether's line runs from the carbine to what it holds.
    punchFor = Math.max(0, punchFor - dt);
    fist.visible = punchFor > 0;
    if (fist.visible) {
      const swing = Math.sin((1 - punchFor / 0.18) * Math.PI);
      fist.position.set(-0.22, -0.3 + swing * 0.08, -0.45 - swing * 0.45);
    }
    tetherFlash = Math.max(0, tetherFlash - dt);
    tetherLine.visible = player.alive && (Boolean(tether) || tetherFlash > 0);
    if (tetherLine.visible) {
      flash.getWorldPosition(muzzle);
      const end = tether ? tether.point : tetherEnd;
      const ends = tetherGeometry.attributes.position as THREE.BufferAttribute;
      ends.setXYZ(0, muzzle.x, muzzle.y, muzzle.z);
      ends.setXYZ(1, end.x, end.y, end.z);
      ends.needsUpdate = true;
    }
    for (let index = 0; index < fireflyCount; index += 1) {
      const seed = fireflySeeds[index];
      const x = seed.x + Math.sin(now * 0.0003 + seed.phase) * 2;
      const z = seed.z + Math.cos(now * 0.00025 + seed.phase) * 2;
      fireflyPositions.set([x, groundAt(x, z) + 1 + Math.sin(now * 0.001 + seed.phase) * 0.6 + 0.6, z], index * 3);
    }
    fireflyGeometry.attributes.position.needsUpdate = true;
    conduitScene?.update(now, beatGlow);
    gridTexture.offset.y = (now * 0.00005) % 1;
    if (banner && state.time > banner.until) banner = null;
  };

  /** The Conduit's objective, where AXIOM is, and the results once the run is over. */
  let endedAt: number | null = null;
  const conduitHud = (): Partial<SimHud> => {
    const cleared = conduitCleared(state);
    if ((cleared || !state.player.alive) && endedAt === null) endedAt = performance.now();
    const left = state.aliens.length + state.roster.length;
    const next = ENCOUNTERS[state.wave]?.name ?? "";
    const objective = cleared ? "Cleared" : state.wave === 0 ? "Into the tube" : left > 0 ? `${encounterName(state)} · ${left} left` : `On to ${next}`;
    const seconds = Math.floor(state.time);
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return {
      location: "The Conduit",
      objective: `${objective} · ${state.score} pts`,
      result: endedAt !== null && performance.now() - endedAt > 1400
        ? {
          success: cleared,
          title: cleared ? "The Conduit cleared" : "Simulation ended",
          lines: [
            `${SIM_DIFFICULTIES[difficulty].label} · ${time} · ${state.kills} down`,
            cleared ? "Every stretch of tube, and the hall's last wave" : `Fell in ${encounterName(state) || "the first tube"}`,
          ],
        }
        : null,
    };
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
    law(form: CarbineForm) {
      if (switchLaw(state.player.gun, form, state.time)) audio?.law();
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
        carbine: { ...carbineReadout(player.gun, state.time), powered: isPowered(state), pack: conduit },
        ...(conduit ? conduitHud() : {}),
        motion: { dashes, fuel, sliding, tethered: Boolean(tether) },
        beat: beatGlow,
        aiming: aimBlend > 0.5,
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
export function bestSimScore(difficulty: SimDifficulty, score?: number, mode: SimMode = "swarm") {
  const key = mode === "swarm" ? `axiom-foundry-sim-best-${difficulty}` : `axiom-foundry-sim-best-${mode}-${difficulty}`;
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
