"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { ArkCutawayRoomKind } from "./ark-cutaway";
import { drawPixelWorldFrame } from "./ark-pixel-world";
import {
  buildWalkLayout,
  compartmentAt,
  dockMoment,
  DOOR_HALF_WIDTH,
  DOOR_HEIGHT,
  isWalkable,
  LIFT_RADIUS,
  liftAt,
  moveWithin,
  towardWalls,
  UPPER_FLOOR,
  wallPieces,
  type Box,
  type DockMoment,
  type DockScene,
  type Rect,
  type WalkCompartment,
  type WalkLayout,
  type WalkRoomKind,
} from "./ark-walk-layout";
import { AxiomEye } from "./axiom-eye";
import { CIVILIAN_COLOR, CREW_ROLE_COLORS, getCrewHead } from "./crew-portrait";
import { playBulkhead, playPulseStrike, schedulePulseBeat, unlockPulseAudio } from "./law-heart-audio";
import "./ark-walk.css";

/*
 * Walk the Ark (proof): AXIOM steers a maintenance drone through the ship in
 * first person. Both decks are built from the same rooms, crew and Law-Heart
 * as the 2D cutaway and rendered at a third of the screen resolution, then
 * scaled up crisp, so it keeps the game's pixel look. Outside the hull is a
 * real sky: stars all round and the world below, seen through real openings.
 * PC only; loaded on demand so the rest of the game never pays for three.js.
 */

export type ArkWalkRoom = {
  kind: ArkCutawayRoomKind | "hangar";
  label: string;
  online: boolean;
  interactive: boolean;
  onActivate: () => void;
};

export type ArkWalkHeart = {
  name: string;
  /** Which Law-Heart this is, 0 (Dormant Seed) to 6 (Transcendent Star); its form grows with it. */
  stage: number;
  core: string;
  surface: string;
  bright: string;
  limb: string;
  corona: readonly string[];
  shard: string;
  /** Axiom shards in orbit. */
  shards: number;
  /** The Foundry machines feeding the heart, each in its tier colour. */
  machines: readonly { name: string; count: number; color: string }[];
  /** Automation drones tending it. */
  drones: readonly { color: string; compromised: boolean }[];
};

/** The recon ship follows the game's expeditions: away while a team is on the surface. */
export type ArkWalkRecon = {
  away: boolean;
  site: string | null;
  crewIds: readonly string[];
  /** Game seconds since the team launched; open the walk soon after and you see it leave. */
  sinceLaunch: number;
  /** Game seconds until the team is due back. */
  remaining: number;
};

export type ArkWalkProps = {
  worldName: string;
  worldAccent: string;
  rooms: readonly ArkWalkRoom[];
  crew: readonly { id: string; name: string; role: string }[];
  heart: ArkWalkHeart;
  recon?: ArkWalkRecon;
  beatPeriodMs: number;
  onStrike?: () => void;
  onClose: () => void;
};

const PIXEL_SCALE = 3;
const EYE_HEIGHT = 1.6;
// A drone, not a person: quick, and quicker still when hurried.
const SPEED = 6;
const SPRINT = 11;
const DRONE_RADIUS = 0.35;
/** How close the drone may come to a person (its radius plus theirs). */
const PERSON_RADIUS = 0.75;
const LIFT_SECONDS = 1.4;
/** The Law-Heart's radius at each stage, from Dormant Seed to Transcendent Star. */
const STAR_RADII = [1, 1.4, 1.7, 1.9, 2.1, 2.3, 2.5];
const HULL = 0.3;
const WINDOW_WIDTH = 2.4;
const WINDOW_LOW = 1.2;
const WINDOW_HIGH = 3.2;
/** A team returning or launching within this many game seconds is shown leaving. */
const FRESH_LAUNCH_SECONDS = 120;

const PALETTE = {
  space: "#07081a",
  floor: "#6e5d4c",
  floorDark: "#4f4338",
  wall: "#262236",
  wallSeam: "#1b1726",
  wallLight: "#3b3548",
  hull: "#5d5468",
  metal: "#3b3548",
  metalLight: "#7c7290",
  dark: "#1b1726",
  light: "#ffd27a",
  amber: "#ffb347",
  copper: "#9a5b3a",
  bunk: "#b5534a",
  linen: "#efe6d2",
  wood: "#8a5a3a",
  culture: "#3f8f4a",
  leaf: "#5fae4e",
  shuttle: "#c9c1d6",
  stripe: "#b5534a",
  board: "#1f3a2e",
  chalk: "#e8f0e0",
  alert: "#ff695c",
  ok: "#5fd39a",
  stars: "#cfd3ff",
};

/** Where each profession works aboard; everyone else lives in Habitation. */
const ROLE_ROOM: Record<string, WalkRoomKind> = {
  engineer: "fabrication",
  technician: "fabrication",
  fabricator: "fabrication",
  doctor: "support",
  farmer: "support",
  researcher: "research",
  teacher: "education",
  navigator: "bridge",
  security: "hangar",
  soldier: "hangar",
};

/** Hull windows, as distances from each room's stern end, on the port (-z) and starboard (+z) walls. */
const WINDOWS: Partial<Record<WalkRoomKind, { port?: readonly number[]; starboard?: readonly number[] }>> = {
  fabrication: { starboard: [6, 9.5, 12.5] },
  habitation: { starboard: [7, 10.5] },
  research: { starboard: [7, 10] },
  bridge: { port: [8.5], starboard: [8.5] },
  support: { starboard: [2.5, 6.7] },
  education: { starboard: [2.5, 6, 9.5, 12.5] },
  hangar: { port: [8, 12, 16] },
  chamber: { port: [2.5, 8, 13.5], starboard: [2.5, 8, 13.5] },
};

function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  paint(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function repeated(texture: THREE.Texture, x: number, y: number) {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  return copy;
}

function hash(value: number) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Shift a palette colour toward the current world's accent, so each planet tints the deck.
 * Mixed in sRGB like the 2D panels' color-mix(in srgb), so the deck matches them.
 */
function tinted(hex: string, accent: string, amount: number) {
  const from = new THREE.Color(hex).getHex();
  const to = new THREE.Color(accent).getHex();
  const channel = (shift: number) => Math.round(((from >> shift) & 255) * (1 - amount) + ((to >> shift) & 255) * amount);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
}

/** A stepped glow: rings of falling opacity rather than a smooth gradient, to stay pixel. */
function haloTexture(color: string) {
  return canvasTexture(32, 32, (context) => {
    context.fillStyle = color;
    for (const [radius, alpha] of [[16, 0.12], [12, 0.18], [9, 0.26]] as const) {
      context.globalAlpha = alpha;
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 32; x += 1) {
          if (Math.hypot(x - 15.5, y - 15.5) < radius) context.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

/** Glass: nearly clear, with a couple of hard glints so it reads as a pane and not a hole. */
function glassTexture(tint: string) {
  return canvasTexture(32, 32, (context) => {
    context.fillStyle = tint;
    context.globalAlpha = 0.07;
    context.fillRect(0, 0, 32, 32);
    context.fillStyle = "#ffffff";
    for (const [start, width, alpha] of [[4, 3, 0.16], [11, 1, 0.1], [22, 2, 0.08]] as const) {
      context.globalAlpha = alpha;
      for (let step = 0; step < 32; step += 1) context.fillRect(start + step, 31 - step, width, 1);
    }
  });
}

/** Black and amber hazard stripes. */
function stripeTexture() {
  return canvasTexture(8, 8, (context) => {
    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 8; y += 1) {
        context.fillStyle = (x + y) % 8 < 4 ? PALETTE.amber : PALETTE.dark;
        context.fillRect(x, y, 1, 1);
      }
    }
  });
}

/** A painted sign. */
function signTexture(text: string, color: string) {
  return canvasTexture(160, 16, (context) => {
    context.fillStyle = PALETTE.dark;
    context.fillRect(0, 0, 160, 16);
    context.fillStyle = color;
    context.fillRect(0, 0, 160, 1);
    context.fillRect(0, 15, 160, 1);
    context.font = "bold 10px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 80, 8.5);
  });
}

/** Decorations the drone's line of sight passes straight through. */
function inert<T extends THREE.Object3D>(object: T) {
  object.raycast = () => {};
  return object;
}

const HEAD_VOXEL = 0.044;
let headMaterial: THREE.MeshLambertMaterial | null = null;

/**
 * A head shaped like the person's portrait: each pixel of the face and hair becomes a
 * column of voxels, deepest down the middle so the head is rounded, with the hair
 * carried round the back. The portrait's own face is on the front.
 */
function voxelHead(id: string, role: string) {
  const head = getCrewHead({ id, role });
  const xs = head.pixels.map((pixel) => pixel.x);
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  const halfWidth = (Math.max(...xs) - Math.min(...xs) + 1) / 2;
  const color = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  const column = (x: number, y: number, zFront: number, depth: number, faces: readonly string[]) => {
    const geometry = new THREE.BoxGeometry(HEAD_VOXEL, HEAD_VOXEL, depth);
    const colors = new Float32Array(24 * 3);
    faces.forEach((hex, face) => {
      color.set(hex);
      for (let vertex = 0; vertex < 4; vertex += 1) color.toArray(colors, (face * 4 + vertex) * 3);
    });
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.translate(x, y, zFront - depth / 2);
    parts.push(geometry);
  };
  for (const pixel of head.pixels) {
    const across = (pixel.x - middle) / (halfWidth + 0.5);
    const hairRow = pixel.y < head.faceTop;
    const depth = 0.42 * Math.sqrt(Math.max(0.2, 1 - across * across)) * (hairRow ? 0.9 : 1);
    const side = hairRow || pixel.color === head.hair ? head.hair : head.skin;
    const x = (pixel.x - middle) * HEAD_VOXEL;
    const y = (head.bottom - pixel.y) * HEAD_VOXEL;
    // Box faces run +x, -x, +y, -y, +z, -z: the portrait pixel looks out of +z.
    column(x, y, 0.21, depth * 0.5, [side, side, side, side, pixel.color, side]);
    const nape = pixel.y >= head.faceTop + 3 ? head.skin : head.hair;
    column(x, y, 0.21 - depth * 0.5, depth * 0.5, [nape, nape, nape, nape, nape, nape]);
  }
  const geometry = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(0.4, 0.4, 0.4);
  for (const part of parts) part.dispose();
  headMaterial ??= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geometry, headMaterial);
  return { mesh, head };
}

type Person = { group: THREE.Group; limbs: THREE.Object3D[] };

/** A person as a blocky figure in their job's uniform, with a head shaped like their portrait. */
function blockyPerson(id: string, role: string): Person {
  const { mesh: headMesh, head } = voxelHead(id, role);
  const solid = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const skinMaterial = solid(head.skin);
  const uniform = CREW_ROLE_COLORS[role] ?? CIVILIAN_COLOR;
  const uniformMaterial = solid(uniform);
  const trimMaterial = solid(new THREE.Color(uniform).multiplyScalar(0.7).getStyle());
  const trouserMaterial = solid("#2b2433");
  const bootMaterial = solid("#14121f");

  const group = new THREE.Group();
  const limb = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number) => {
    // Limbs hang from a pivot at the shoulder or hip so they can swing.
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.y = -h / 2;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  };
  const legs = [-0.12, 0.12].map((x) => {
    const leg = limb(0.2, 0.8, 0.24, trouserMaterial, x, 0.82);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), bootMaterial);
    boot.position.set(0, -0.75, 0.04);
    leg.add(boot);
    return leg;
  });
  const arms = [-0.36, 0.36].map((x) => {
    const arm = limb(0.16, 0.6, 0.2, uniformMaterial, x, 1.42);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.21), trimMaterial);
    cuff.position.y = -0.56;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.18), skinMaterial);
    hand.position.y = -0.66;
    arm.add(cuff, hand);
    return arm;
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.3), uniformMaterial);
  torso.position.y = 1.12;
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.32), trimMaterial);
  collar.position.y = 1.44;
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.02), solid(PALETTE.light));
  badge.position.set(0.14, 1.28, 0.16);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.32), trouserMaterial);
  belt.position.y = 0.83;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), skinMaterial);
  neck.position.y = 1.5;
  headMesh.position.y = 1.52;
  group.add(torso, collar, badge, belt, neck, headMesh);
  if (head.longHair) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.06), solid(head.hair));
    tail.position.set(0, 1.5, -0.22);
    group.add(tail);
  }
  group.scale.setScalar(0.94);
  return { group, limbs: [...arms, ...legs] };
}

/** Swing arms and legs in a walk; amount 0 stands still. */
function stride(person: Person, phase: number, amount: number) {
  const swing = Math.sin(phase) * amount;
  person.limbs[0].rotation.x = swing;
  person.limbs[1].rotation.x = -swing;
  person.limbs[2].rotation.x = -swing;
  person.limbs[3].rotation.x = swing;
}

/** Turn a figure to face along (dx, dz). */
function face(group: THREE.Object3D, dx: number, dz: number) {
  if (Math.hypot(dx, dz) > 0.001) group.rotation.y = Math.atan2(dx, dz);
}

type Interactable =
  | {
      kind: "console";
      object: THREE.Object3D;
      label: string;
      room: ArkWalkRoom | null;
      online: boolean;
      deck: number;
      /** A live prompt in place of the room's name, for consoles that report something. */
      prompt?: () => string;
    }
  | { kind: "heart"; object: THREE.Object3D }
  | { kind: "label"; object: THREE.Object3D; label: string };

type Drone = { x: number; z: number; deck: number; dt: number };
type Updater = (time: number, drone: Drone) => void;
type Obstacle = { deck: number } & ({ x: number; z: number; radius: number } | { box: Box });

function buildShip(scene: THREE.Scene, layout: WalkLayout, props: ArkWalkProps, live: () => ArkWalkProps) {
  const interactables: Interactable[] = [];
  const animated: Updater[] = [];
  const notices: (() => string | null)[] = [];
  const crowd: { person: Person; deck: number }[] = [];
  const dynamicObstacles: (() => Obstacle | null)[] = [];
  const roomsByKind = new Map(props.rooms.map((room) => [room.kind as string, room]));
  const accent = props.worldAccent || "#c9b6ff";
  const wallTone = tinted(PALETTE.wall, accent, 0.16);
  const metal = tinted(PALETTE.metal, accent, 0.12);
  const metalLight = tinted(PALETTE.metalLight, accent, 0.16);
  const screenGlow = tinted(accent, "#ffffff", 0.2);
  const glass = tinted(accent, "#ffffff", 0.5);
  const liftGlow = tinted(accent, "#ffffff", 0.35);
  const spec = props.heart;
  const feeds = spec.machines.length > 0
    ? spec.machines.slice(0, 6)
    : Array.from({ length: 6 }, (_, tier) => ({ name: `Tier ${tier + 1} machine`, count: 0, color: PALETTE.dark }));

  const floorTexture = canvasTexture(16, 16, (context) => {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = PALETTE.floorDark;
    for (let index = 0; index < 16; index += 4) {
      context.fillRect(index, 0, 1, 16);
      context.fillRect(0, index, 16, 1);
    }
    context.fillStyle = "#8a7660";
    context.fillRect(2, 2, 1, 1);
    context.fillRect(10, 10, 1, 1);
  });
  const wallTexture = canvasTexture(16, 16, (context) => {
    context.fillStyle = wallTone;
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = tinted(PALETTE.wallSeam, accent, 0.1);
    context.fillRect(0, 0, 16, 1);
    context.fillRect(0, 0, 1, 16);
    context.fillRect(8, 0, 1, 6);
    context.fillStyle = tinted(PALETTE.wallLight, accent, 0.26);
    context.fillRect(3, 3, 1, 1);
    context.fillRect(12, 3, 1, 1);
    context.fillRect(3, 9, 1, 1);
    context.fillRect(12, 9, 1, 1);
    context.fillRect(1, 12, 14, 2);
  });
  const ceilingTexture = canvasTexture(16, 16, (context) => {
    context.fillStyle = tinted("#1e1b2d", accent, 0.08);
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = tinted("#14121f", accent, 0.05);
    context.fillRect(0, 7, 16, 2);
  });
  const grateTexture = canvasTexture(8, 8, (context) => {
    context.fillStyle = "#16141f";
    context.fillRect(0, 0, 8, 8);
    context.fillStyle = "#2c2838";
    for (let line = 0; line < 8; line += 2) context.fillRect(0, line, 8, 1);
  });
  const stripes = stripeTexture();

  const solidCache = new Map<string, THREE.MeshLambertMaterial>();
  const solid = (color: string) => {
    let material = solidCache.get(color);
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color, flatShading: true });
      solidCache.set(color, material);
    }
    return material;
  };
  const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters) =>
    new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
  const glow = (color: string) => new THREE.MeshBasicMaterial({ color });
  const ghost = (color: string, opacity: number) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const box = (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };
  const cylinder = (top: number, bottom: number, h: number, material: THREE.Material, x: number, y: number, z: number, sides = 12, open = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides, 1, open), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };
  const label = (object: THREE.Object3D, text: string) => interactables.push({ kind: "label", object, label: text });

  const half = layout.halfDepth;
  const bulkheadMaterial = solid(tinted(PALETTE.hull, accent, 0.18));
  const hullSkin = solid(tinted(PALETTE.hull, accent, 0.1));
  const trimMaterial = solid(metalLight);
  const glassMaterial = new THREE.MeshBasicMaterial({ map: glassTexture(glass), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const heart = layout.heart;
  const longest = Math.max(...layout.decks.map((deck) => deck.length));

  // ---- Outside: stars all round, faint nebulae, and the world below, turning. ----
  const sky = new THREE.Group();
  sky.position.set(longest / 2, UPPER_FLOOR / 2, 0);
  scene.add(sky);
  const starField = (count: number, size: number, seed: number) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tint = new THREE.Color();
    for (let star = 0; star < count; star += 1) {
      const up = hash(seed + star * 1.37) * 2 - 1;
      const around = hash(seed * 7 + star * 2.11) * Math.PI * 2;
      const ring = Math.sqrt(1 - up * up);
      positions.set([Math.cos(around) * ring * 420, up * 420, Math.sin(around) * ring * 420], star * 3);
      const warmth = hash(seed * 3 + star * 0.71);
      tint.set(warmth > 0.85 ? "#ffe2b8" : warmth < 0.2 ? "#b8c8ff" : "#ffffff").multiplyScalar(0.45 + hash(star * 4.9 + seed) * 0.55);
      tint.toArray(colors, star * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return inert(new THREE.Points(geometry, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false })));
  };
  sky.add(starField(1800, 1, 3), starField(160, 2, 9));
  const nebulaMaterial = new THREE.SpriteMaterial({ map: haloTexture(tinted(accent, "#6a5acd", 0.5)), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let cloud = 0; cloud < 4; cloud += 1) {
    const nebula = inert(new THREE.Sprite(nebulaMaterial));
    const angle = cloud * 1.9 + 0.4;
    nebula.position.set(Math.cos(angle) * 360, 60 - cloud * 50, Math.sin(angle) * 360);
    nebula.scale.setScalar(260);
    sky.add(nebula);
  }
  const planetCanvas = document.createElement("canvas");
  planetCanvas.width = 128;
  planetCanvas.height = 128;
  const planetContext = planetCanvas.getContext("2d")!;
  const planetTexture = new THREE.CanvasTexture(planetCanvas);
  planetTexture.magFilter = THREE.NearestFilter;
  planetTexture.minFilter = THREE.NearestFilter;
  planetTexture.generateMipmaps = false;
  planetTexture.colorSpace = THREE.SRGBColorSpace;
  // The ship never lands: the world hangs below and ahead, off the starboard bow.
  const planetOffset = new THREE.Vector3(110, -95, 110);
  const planet = inert(new THREE.Sprite(new THREE.SpriteMaterial({ map: planetTexture, fog: false, alphaTest: 0.5 })));
  planet.position.copy(planetOffset);
  planet.scale.setScalar(230);
  const atmosphere = inert(new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(accent), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  atmosphere.position.copy(planetOffset).multiplyScalar(1.04);
  atmosphere.scale.setScalar(310);
  sky.add(atmosphere, planet);
  const planetWorld = planetOffset.clone().add(sky.position);
  let planetFrame = 0;
  let lastPlanetDraw = -Infinity;
  animated.push((time) => {
    if (time - lastPlanetDraw < 240) return;
    lastPlanetDraw = time;
    planetFrame += 1;
    drawPixelWorldFrame(planetContext, props.worldName, 0.5, planetFrame);
    planetTexture.needsUpdate = true;
  });

  /** A hull side: thick panels round its openings, the room's wall inside and the ship's skin out. */
  const hullSide = (x0: number, x1: number, y0: number, height: number, side: number, openings: Rect[]) => {
    for (const piece of wallPieces(x0, x1, height, openings)) {
      const w = piece.a1 - piece.a0;
      const h = piece.y1 - piece.y0;
      const inner = lambert("#ffffff", { map: repeated(wallTexture, w / 2, h / 2) });
      const faces = side > 0
        ? [hullSkin, hullSkin, hullSkin, hullSkin, hullSkin, inner]
        : [hullSkin, hullSkin, hullSkin, hullSkin, inner, hullSkin];
      box(w, h, HULL, faces, (piece.a0 + piece.a1) / 2, y0 + (piece.y0 + piece.y1) / 2, side * (half + HULL / 2));
    }
  };
  /** Glass and a frame in a hull window. */
  const hullWindow = (y0: number, opening: Rect, side: number) => {
    const w = opening.a1 - opening.a0;
    const h = opening.y1 - opening.y0;
    const cx = (opening.a0 + opening.a1) / 2;
    const cy = y0 + (opening.y0 + opening.y1) / 2;
    const pane = inert(new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMaterial));
    pane.position.set(cx, cy, side * (half + HULL / 2));
    if (side === 1) pane.rotation.y = Math.PI;
    scene.add(pane);
    const z = side * (half - 0.05);
    box(w + 0.32, 0.16, 0.16, trimMaterial, cx, y0 + opening.y0 - 0.04, z);
    box(w + 0.32, 0.16, 0.16, trimMaterial, cx, y0 + opening.y1 + 0.04, z);
    box(0.16, h, 0.16, trimMaterial, opening.a0 - 0.04, cy, z);
    box(0.16, h, 0.16, trimMaterial, opening.a1 + 0.04, cy, z);
    box(0.06, h, 0.06, trimMaterial, cx, cy, side * (half + 0.05));
  };

  /** The fittings every compartment gets: ceiling beams, wall ribs, pipe runs, vents, lit skirting. */
  const dress = (room: WalkCompartment, y0: number, openingsBySide: Map<number, Rect[]>, sides: readonly number[]) => {
    const width = room.x1 - room.x0;
    const cx = (room.x0 + room.x1) / 2;
    const dark = !room.online;
    const bays = Math.max(2, Math.round(width / 3.5));
    for (let bay = 1; bay < bays; bay += 1) {
      box(0.3, 0.35, half * 2, solid(metal), room.x0 + (width * bay) / bays, y0 + room.height - 0.175, 0);
    }
    for (const side of sides) {
      const wallZ = side * half;
      const openings = openingsBySide.get(side) ?? [];
      for (let bay = 1; bay < bays; bay += 1) {
        const ribX = room.x0 + (width * bay) / bays;
        if (openings.some((opening) => ribX > opening.a0 - 0.4 && ribX < opening.a1 + 0.4 && opening.y0 < room.height - 0.4)) continue;
        box(0.32, room.height, 0.24, solid(metal), ribX, y0 + room.height / 2, wallZ - side * 0.12);
        box(0.36, 0.1, 0.28, solid(metalLight), ribX, y0 + 0.9, wallZ - side * 0.14);
        if (bay % 2 === 0) {
          const status = box(0.1, 0.1, 0.04, glow(dark ? PALETTE.alert : PALETTE.ok), ribX, y0 + 1.7, wallZ - side * 0.26);
          animated.push((time) => { status.visible = Math.floor(time / 900 + ribX) % 6 !== 0; });
        }
        const vent = box(0.9, 0.36, 0.06, solid(PALETTE.dark), ribX + width / bays / 2, y0 + 0.4, wallZ - side * 0.03);
        if (openings.some((opening) => vent.position.x > opening.a0 - 0.6 && vent.position.x < opening.a1 + 0.6 && opening.y0 < 0.8)) vent.visible = false;
      }
      // Two pipe runs under the ceiling, with brackets at each rib.
      for (const [drop, radius, color] of [[0.5, 0.11, metalLight], [0.85, 0.07, PALETTE.copper]] as const) {
        const pipe = cylinder(radius, radius, width, solid(color), cx, y0 + room.height - drop, wallZ - side * 0.3, 6);
        pipe.rotation.z = Math.PI / 2;
      }
      // Lit skirting along the floor.
      box(width, 0.06, 0.06, glow(dark ? PALETTE.dark : tinted(accent, PALETTE.dark, 0.45)), cx, y0 + 0.06, wallZ - side * 0.04);
    }
    // Walkway lines down the open middle.
    if (room.kind !== "chamber" && room.kind !== "hangar") {
      for (const lane of [-DOOR_HALF_WIDTH, DOOR_HALF_WIDTH]) {
        box(width - 1, 0.02, 0.1, glow(dark ? PALETTE.dark : tinted(PALETTE.amber, PALETTE.dark, 0.55)), cx, y0 + 0.012, lane);
      }
    }
  };

  layout.decks.forEach((deck, deckIndex) => {
    const upper = deck.floorY > 0;
    const y0 = deck.floorY;
    const put = (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) =>
      box(w, h, d, material, x, y0 + y, z);
    /** How tall a bulkhead stands: downstairs it reaches the deck above. */
    const wallHeight = (...rooms: WalkCompartment[]) => (upper ? Math.max(...rooms.map((room) => room.height)) : UPPER_FLOOR);

    deck.compartments.forEach((room, index) => {
      const width = room.x1 - room.x0;
      const cx = (room.x0 + room.x1) / 2;
      const dark = !room.online;
      const screenColor = dark ? PALETTE.dark : screenGlow;
      // The chamber is one tall space drawn from the lower deck; upstairs only adds its gallery floor.
      const coreTop = room.kind === "chamber" && upper;
      const dock = room.kind === "hangar";

      if (!coreTop) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), lambert("#ffffff", { map: repeated(floorTexture, width / 2, half) }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, y0, 0);
        scene.add(floor);
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), lambert("#ffffff", { map: repeated(ceilingTexture, width / 2, half) }));
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(cx, y0 + room.height, 0);
        scene.add(ceiling);

        // The hull either side, with real windows cut through it.
        const bands = room.kind === "chamber"
          ? [[WINDOW_LOW, WINDOW_HIGH], [UPPER_FLOOR + WINDOW_LOW, UPPER_FLOOR + WINDOW_HIGH]]
          : [[WINDOW_LOW, WINDOW_HIGH]];
        const openingsBySide = new Map<number, Rect[]>();
        for (const side of [-1, 1]) {
          const offsets = (side < 0 ? WINDOWS[room.kind]?.port : WINDOWS[room.kind]?.starboard) ?? [];
          const windows: Rect[] = offsets.flatMap((offset) => bands.map(([low, high]) => ({
            a0: room.x0 + offset - WINDOW_WIDTH / 2,
            a1: room.x0 + offset + WINDOW_WIDTH / 2,
            y0: low,
            y1: high,
          })));
          const openings = dock && side === 1
            ? [...windows, { a0: layout.dock.opening.x0, a1: layout.dock.opening.x1, y0: 0.4, y1: 5.2 }]
            : windows;
          hullSide(room.x0, room.x1, y0, room.height, side, openings);
          for (const pane of windows) hullWindow(y0, pane, side);
          openingsBySide.set(side, openings);
        }
        dress(room, y0, openingsBySide, dock ? [-1] : [-1, 1]);

        // Deck lights: strips down the ceiling and warm lamps, or an emergency glow when dormant.
        // The chamber's gallery and the dock light themselves.
        const lampCount = room.kind === "chamber" || dock ? 0 : Math.max(1, Math.round(width / 11));
        for (let lampIndex = 0; lampIndex < lampCount; lampIndex += 1) {
          const lx = room.x0 + (width * (lampIndex + 0.5)) / lampCount;
          if (!dark) {
            put(width / lampCount - 1.6, 0.06, 0.4, glow(PALETTE.light), lx, room.height - 0.05, 0);
            const lamp = new THREE.PointLight(PALETTE.light, 12, 24, 1.1);
            lamp.position.set(lx, y0 + room.height - 0.7, 0);
            scene.add(lamp);
          } else {
            const emergency = new THREE.PointLight("#ff5e3a", 2.6, 12, 1.4);
            emergency.position.set(lx, y0 + room.height - 0.6, 0);
            scene.add(emergency);
            animated.push((time) => { emergency.intensity = 1.6 + Math.round(Math.sin(time * 0.003) + 1) * 0.7; });
          }
        }
      }

      // Bulkhead with a doorway towards the next compartment, and the deck's stern wall.
      const nextRoom = deck.compartments[index + 1];
      if (index === 0) {
        const height = wallHeight(room);
        put(0.4, height, half * 2, bulkheadMaterial, room.x0 - 0.2, height / 2, 0);
      }
      if (nextRoom) {
        const height = wallHeight(room, nextRoom);
        const wx = room.x1 + 0.2;
        const sideDepth = half - DOOR_HALF_WIDTH;
        put(0.4, height, sideDepth, bulkheadMaterial, wx, height / 2, -(DOOR_HALF_WIDTH + sideDepth / 2));
        put(0.4, height, sideDepth, bulkheadMaterial, wx, height / 2, DOOR_HALF_WIDTH + sideDepth / 2);
        put(0.4, height - DOOR_HEIGHT, DOOR_HALF_WIDTH * 2, bulkheadMaterial, wx, DOOR_HEIGHT + (height - DOOR_HEIGHT) / 2, 0);
        put(0.6, 0.18, DOOR_HALF_WIDTH * 2 + 0.4, trimMaterial, wx, DOOR_HEIGHT + 0.09, 0);
        for (const side of [-1, 1]) {
          put(0.6, DOOR_HEIGHT, 0.2, trimMaterial, wx, DOOR_HEIGHT / 2, side * (DOOR_HALF_WIDTH + 0.1));
          put(0.62, 0.3, 0.22, lambert("#ffffff", { map: repeated(stripes, 1, 0.4) }), wx, 0.15, side * (DOOR_HALF_WIDTH + 0.1));
        }
        // A door panel beside the frame shows whether the next room is awake.
        for (const facing of [-1, 1]) {
          put(0.1, 0.5, 0.36, solid(PALETTE.dark), wx - facing * 0.32, 1.5, DOOR_HALF_WIDTH + 0.6);
          put(0.04, 0.2, 0.2, glow(nextRoom.online ? PALETTE.ok : PALETTE.alert), wx - facing * 0.38, 1.6, DOOR_HALF_WIDTH + 0.6);
        }
        put(0.44, 0.14, DOOR_HALF_WIDTH * 2 + 0.4, lambert("#ffffff", { map: repeated(floorTexture, 0.25, DOOR_HALF_WIDTH) }), wx, -0.07, 0);
        put(0.46, 0.02, DOOR_HALF_WIDTH * 2, lambert("#ffffff", { map: repeated(stripes, 0.4, DOOR_HALF_WIDTH * 4) }), wx, 0.005, 0);
        // A painted name over each side of the doorway.
        for (const facing of [-1, 1]) {
          const target = facing > 0 ? nextRoom : room;
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.26), new THREE.MeshBasicMaterial({ map: signTexture(target.label.toUpperCase(), PALETTE.light) }));
          sign.position.set(wx - facing * 0.31, y0 + DOOR_HEIGHT + 0.35, 0);
          sign.rotation.y = -facing * Math.PI / 2;
          scene.add(sign);
        }
      }

      // The room's furniture and its console, set against the walls of the wide ship.
      const fit = (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) =>
        box(w, h, d, material, x, y0 + y, towardWalls(z, half));
      const fitCylinder = (top: number, bottom: number, h: number, material: THREE.Material, x: number, y: number, z: number, sides?: number, open?: boolean) =>
        cylinder(top, bottom, h, material, x, y, towardWalls(z, half), sides, open);
      const consoleRoom = roomsByKind.get(room.kind) ?? null;
      const addConsole = (object: THREE.Object3D, prompt?: () => string) =>
        interactables.push({ kind: "console", object, label: room.label, room: consoleRoom, online: room.online, deck: deckIndex, prompt });

      if (room.kind === "fabrication") {
        // The press, with its console on the front.
        fit(3, 3, 3, solid(metal), room.x0 + 3.5, 1.5, -5.1);
        fit(3.1, 0.2, 3.1, lambert("#ffffff", { map: repeated(stripes, 4, 0.3) }), room.x0 + 3.5, 0.1, -5.1);
        const piston = fit(1, 1.6, 1, solid(metalLight), room.x0 + 3.5, 3.6, -5.1);
        addConsole(fit(1.6, 0.8, 0.06, glow(screenColor), room.x0 + 3.5, 1.8, -3.57));
        // A rack for each Foundry machine tier, lit in its colour once one is built.
        feeds.forEach((machine, tier) => {
          const mx = room.x0 + 6.6 + tier * 1.16;
          const cabinet = fit(1.05, 2.4, 1.3, solid(metal), mx, 1.2, -6.2);
          label(cabinet, machine.count > 0 ? `${machine.name} · ${machine.count} built` : `${machine.name} · not yet built`);
          const lit = machine.count > 0 && !dark;
          fit(0.8, 0.12, 0.05, glow(lit ? machine.color : PALETTE.dark), mx, 2.1, -5.53);
          const bars = lit ? Math.min(5, Math.ceil(Math.log2(machine.count + 1))) : 0;
          for (let bar = 0; bar < 5; bar += 1) {
            fit(0.5, 0.1, 0.05, glow(bar < bars ? machine.color : PALETTE.dark), mx, 0.5 + bar * 0.24, -5.53);
          }
        });
        // The conveyor, crates riding it, a robot arm loading them, and a stack waiting.
        const beltLength = room.x1 - 1 - (room.x0 + 5);
        fit(beltLength, 0.7, 1.2, solid(metal), room.x0 + 5 + beltLength / 2, 0.35, 5);
        fit(beltLength, 0.04, 1, solid(PALETTE.dark), room.x0 + 5 + beltLength / 2, 0.72, 5);
        for (let roller = 0; roller < beltLength; roller += 1) fit(0.1, 0.1, 1.24, solid(metalLight), room.x0 + 5.5 + roller, 0.62, 5);
        const crates = [0, 1, 2, 3].map(() => fit(0.6, 0.6, 0.6, solid(PALETTE.wood), 0, 1.04, 5));
        fitCylinder(0.5, 0.6, 0.6, solid(metal), room.x1 - 3.6, y0 + 0.3, 3);
        const arm = new THREE.Group();
        arm.position.set(room.x1 - 3.6, y0 + 0.6, towardWalls(3, half));
        const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), solid(PALETTE.amber));
        upperArm.position.y = 0.8;
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.4), solid(PALETTE.amber));
        forearm.position.set(0, 1.55, 0.6);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.2), solid(metal));
        grip.position.set(0, 1.4, 1.3);
        arm.add(upperArm, forearm, grip);
        scene.add(arm);
        [[0.8, 0.5, 5.2], [2.2, 0.5, 5.2], [1.5, 0.5, 6.1], [1.5, 1.3, 5.6]].forEach(([dx, dy, dz]) => {
          fit(0.9, 0.8, 0.9, solid(PALETTE.wood), room.x0 + dx, dy, dz);
        });
        animated.push((time) => {
          if (dark) return;
          piston.position.y = y0 + 3.6 - Math.abs(Math.sin(time * 0.0025)) * 0.7;
          crates.forEach((crate, crateIndex) => {
            crate.position.x = room.x0 + 5.3 + (((time * 0.0005) + crateIndex / 4) % 1) * (beltLength - 0.6);
          });
          arm.rotation.y = Math.sin(time * 0.0011) * 0.9;
          grip.position.y = 1.4 - Math.max(0, Math.sin(time * 0.0022)) * 0.4;
        });
      } else if (room.kind === "chamber" && !upper) {
        buildCore(room);
      } else if (coreTop) {
        // The upper gallery floor ringing the core, open at two corners for the grav-lifts.
        const core = layout.core;
        const plate = (x0: number, x1: number, z0: number, z1: number) => {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0),
            lambert("#ffffff", { map: repeated(floorTexture, (x1 - x0) / 2, (z1 - z0) / 2) }),
          );
          mesh.position.set((x0 + x1) / 2, y0 - 0.15, (z0 + z1) / 2);
          scene.add(mesh);
        };
        plate(room.x0, core.x0, core.z0, half);
        plate(core.x1, room.x1, -half, core.z1);
        plate(core.x0, core.x1, core.z1, half);
        plate(core.x0, core.x1, -half, core.z0);
        // Lit lips and a low rail round the two lift wells.
        const rim = glow(liftGlow);
        const rail = solid(metalLight);
        put(core.x0 - room.x0, 0.05, 0.12, rim, (room.x0 + core.x0) / 2, 0.01, core.z0);
        put(0.12, 0.05, half + core.z0, rim, core.x0, 0.01, (core.z0 - half) / 2);
        put(room.x1 - core.x1, 0.05, 0.12, rim, (core.x1 + room.x1) / 2, 0.01, core.z1);
        put(0.12, 0.05, half - core.z1, rim, core.x1, 0.01, (core.z1 + half) / 2);
        put(core.x0 - room.x0 - 1.8, 0.06, 0.06, rail, (room.x0 + core.x0) / 2 + 0.9, 1, core.z0);
        put(room.x1 - core.x1 - 1.8, 0.06, 0.06, rail, (core.x1 + room.x1) / 2 - 0.9, 1, core.z1);
      } else if (room.kind === "habitation") {
        // Two bunk stacks with linen and posts.
        for (const sx of [room.x0 + 3.5, room.x0 + 10]) {
          for (const level of [0.55, 1.75]) {
            fit(4.6, 0.3, 1.8, solid(metal), sx, level, -5.85);
            fit(4.4, 0.18, 1.6, solid(PALETTE.bunk), sx, level + 0.24, -5.85);
            fit(0.7, 0.16, 1.2, solid(PALETTE.linen), sx - 1.8, level + 0.4, -5.85);
            fit(0.1, 0.4, 1.6, solid(metalLight), sx + 2.25, level + 0.35, -5.85);
          }
          for (const px of [-2.3, 2.3]) for (const pz of [-6.75, -4.95]) fit(0.12, 2.4, 0.12, solid(metalLight), sx + px, 1.2, pz);
          for (let rung = 0; rung < 5; rung += 1) fit(0.5, 0.05, 0.05, solid(metalLight), sx - 2.3, 0.4 + rung * 0.4, -4.95);
        }
        // The mess table and chairs; the table is the habitation console.
        const tableX = room.x1 - 3.6;
        addConsole(fit(3.2, 0.14, 1.6, solid(PALETTE.wood), tableX, 0.85, 3.4));
        for (const px of [-1.4, 1.4]) for (const pz of [2.75, 4.05]) fit(0.12, 0.85, 0.12, solid(PALETTE.wood), tableX + px, 0.42, pz);
        for (const px of [-0.8, 0.8]) {
          for (const pz of [2.25, 4.55]) {
            fit(0.6, 0.1, 0.6, solid(metalLight), tableX + px, 0.5, pz);
            fit(0.6, 0.6, 0.1, solid(metalLight), tableX + px, 0.8, pz + (pz < 3.4 ? -0.25 : 0.25));
          }
        }
        for (const [dx, color] of [[-0.6, "#e9e4da"], [0.3, PALETTE.amber], [0.9, "#7fb7ff"]] as const) fit(0.14, 0.18, 0.14, solid(color), tableX + dx, 1.01, 3.3);
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), solid(tinted(PALETTE.bunk, accent, 0.4)));
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(tableX, y0 + 0.01, towardWalls(3.4, half));
        scene.add(rug);
        // Lockers along the starboard wall and a plant in the corner.
        for (let locker = 0; locker < 4; locker += 1) {
          fit(0.95, 2.2, 0.6, solid(tinted(PALETTE.hull, accent, 0.1)), room.x0 + 1.5 + locker, 1.1, 6.4);
          fit(0.4, 0.06, 0.02, solid(PALETTE.dark), room.x0 + 1.5 + locker, 1.8, 6.09);
          fit(0.06, 0.3, 0.02, solid(metalLight), room.x0 + 1.85 + locker, 1.2, 6.09);
        }
        fit(0.6, 0.6, 0.6, solid(PALETTE.wood), room.x1 - 1, 0.3, 6.1);
        for (let leaf = 0; leaf < 5; leaf += 1) fit(0.25, 0.5 + leaf * 0.1, 0.25, solid(PALETTE.leaf), room.x1 - 1.2 + (leaf % 3) * 0.2, 0.85 + leaf * 0.08, 6 + (leaf % 2) * 0.2);
      } else if (room.kind === "research") {
        // A long desk under wall screens, the middle screen being the console.
        fit(width - 2, 1, 1.4, solid(metal), cx, 0.5, -6.15);
        const screens = [-1.5, -0.5, 0.5, 1.5].map((offset) => fit(2.2, 1.2, 0.06, glow(screenColor), cx + offset * 2.5, 2.4, -6.68));
        addConsole(screens[1]);
        for (const offset of [-1.5, -0.5, 0.5, 1.5]) fit(2.4, 1.4, 0.04, solid(PALETTE.dark), cx + offset * 2.5, 2.4, -6.72);
        // The holo-table, projecting the world below as a turning lattice.
        fitCylinder(1.2, 1.3, 1, solid(metal), cx, y0 + 0.5, 3.4, 12);
        fitCylinder(1.05, 1.05, 0.04, glow(dark ? PALETTE.dark : screenGlow), cx, y0 + 1.02, 3.4, 12);
        const hologram = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: screenGlow, wireframe: true, transparent: true, opacity: dark ? 0 : 0.7 })));
        hologram.position.set(cx, y0 + 2.2, towardWalls(3.4, half));
        scene.add(hologram);
        const orbit = inert(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.02, 4, 32), ghost(screenGlow, dark ? 0 : 0.6)));
        orbit.position.copy(hologram.position);
        orbit.rotation.x = 1.2;
        scene.add(orbit);
        // Server racks with blinking lights.
        const leds: THREE.Mesh[] = [];
        for (let rack = 0; rack < 3; rack += 1) {
          fit(1.1, 2.4, 0.9, solid(PALETTE.dark), room.x0 + 1.6 + rack * 1.2, 1.2, 6.25);
          for (let led = 0; led < 6; led += 1) leds.push(fit(0.08, 0.08, 0.02, glow(led % 3 === 0 ? PALETTE.amber : screenGlow), room.x0 + 1.3 + rack * 1.2 + (led % 2) * 0.5, 0.6 + Math.floor(led / 2) * 0.6, 5.79));
        }
        animated.push((time) => {
          screens.forEach((screen, screenIndex) => {
            screen.visible = dark || Math.floor(time / 700 + screenIndex * 1.7) % 9 !== 0;
          });
          hologram.rotation.y = time * 0.0005;
          orbit.rotation.z = time * 0.0008;
          leds.forEach((led, ledIndex) => { led.visible = !dark && hash(Math.floor(time / 300) + ledIndex * 13.1) > 0.35; });
        });
      } else if (room.kind === "bridge") {
        // The helm with its wide screen (the console), the pilot's chair, and two side stations.
        fit(1.6, 1, 5.2, solid(metal), room.x1 - 2.6, 0.5, 0);
        addConsole(fit(0.06, 0.9, 4.4, glow(screenColor), room.x1 - 3.42, 1.45, 0));
        for (let key = 0; key < 8; key += 1) fit(0.3, 0.04, 0.3, glow(key % 3 === 0 ? PALETTE.amber : screenColor), room.x1 - 3.1, 1.02, -1.75 + key * 0.5);
        fit(0.9, 0.12, 0.9, solid(metalLight), room.x1 - 4.7, 0.6, 0);
        fit(0.12, 0.9, 0.9, solid(metalLight), room.x1 - 5.1, 1.05, 0);
        fit(0.3, 0.6, 0.3, solid(metal), room.x1 - 4.7, 0.3, 0);
        for (const side of [-1, 1]) {
          fit(4, 1, 1.3, solid(metal), room.x0 + 4, 0.5, side * 6.25);
          fit(3.4, 0.7, 0.06, glow(screenColor), room.x0 + 4, 1.5, side * 5.62);
        }
      } else if (room.kind === "support") {
        // Four culture tanks keep the air breathable.
        const glassMaterialTank = lambert(glass, { transparent: true, opacity: 0.25, depthWrite: false });
        const cultureMaterial = solid(dark ? "#2a3a2a" : PALETTE.culture);
        const bubbleMaterial = glow(tinted(PALETTE.culture, "#ffffff", 0.6));
        [2.6, 5.6, 8.4, 11.4].forEach((offset, tankIndex) => {
          const tx = room.x0 + offset;
          const level = [2.6, 3, 2.2, 2.8][tankIndex];
          fitCylinder(1.15, 1.15, 0.4, solid(metal), tx, y0 + 0.2, -5.4);
          fitCylinder(1.15, 1.15, 0.4, solid(metal), tx, y0 + 3.9, -5.4);
          fitCylinder(1, 1, 3.3, glassMaterialTank, tx, y0 + 2.05, -5.4, 12, true);
          fitCylinder(0.9, 0.9, level, cultureMaterial, tx, y0 + 0.4 + level / 2, -5.4, 12);
          fit(0.2, room.height - 4.1, 0.2, solid(metalLight), tx, 4.1 + (room.height - 4.1) / 2, -5.4);
          fit(0.4, 0.4, 0.1, glow(dark ? PALETTE.dark : PALETTE.ok), tx, 1.2, -4.38);
          const bubbles = [0, 1, 2, 3].map(() => inert(fit(0.1, 0.1, 0.1, bubbleMaterial, tx, 0.5, -5.4)));
          animated.push((time) => {
            bubbles.forEach((bubble, bubbleIndex) => {
              bubble.visible = !dark;
              const rise = ((time * 0.0003) + bubbleIndex / 4 + tankIndex * 0.21) % 1;
              bubble.position.set(tx + Math.sin(rise * 9 + bubbleIndex) * 0.4, y0 + 0.5 + rise * (level - 0.2), towardWalls(-5.4, half) + Math.cos(bubbleIndex * 2.1) * 0.4);
            });
          });
        });
        // The atmosphere desk, the farmers' hydroponic shelves, and the recycler fan overhead.
        fit(3.4, 1, 1.4, solid(metal), room.x0 + 6.7, 0.5, 5.7);
        addConsole(fit(2.8, 0.8, 0.06, glow(screenColor), room.x0 + 6.7, 1.6, 4.97));
        for (const level of [0.5, 1.3, 2.1]) {
          fit(3.8, 0.08, 0.6, solid(metalLight), room.x0 + 11.3, level, 6.4);
          fit(3.8, 0.04, 0.04, glow(dark ? PALETTE.dark : "#ff9adf"), room.x0 + 11.3, level + 0.7, 6.4);
          if (dark) continue;
          for (let leaf = 0; leaf < 8; leaf += 1) {
            fit(0.26, 0.24 + (leaf % 3) * 0.1, 0.3, solid(PALETTE.leaf), room.x0 + 9.75 + leaf * 0.45, level + 0.18, 6.35);
          }
        }
        const fan = new THREE.Group();
        fan.position.set(room.x0 + 7, y0 + room.height - 0.2, 0);
        fan.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 16), solid(PALETTE.dark)));
        for (let blade = 0; blade < 4; blade += 1) {
          const vane = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.4), solid(metalLight));
          vane.rotation.y = (blade * Math.PI) / 4;
          vane.position.y = -0.1;
          fan.add(vane);
        }
        scene.add(fan);
        animated.push((time) => { if (!dark) fan.rotation.y = time * 0.002; });
      } else if (room.kind === "education") {
        // A chalkboard (the console), a lectern, and three rows of desks with slates.
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(6, 2.4),
          lambert("#ffffff", {
            map: canvasTexture(60, 24, (context) => {
              context.fillStyle = PALETTE.board;
              context.fillRect(0, 0, 60, 24);
              context.fillStyle = PALETTE.chalk;
              for (const [lx, ly, lw] of [[4, 3, 18], [4, 6, 26], [4, 9, 12], [36, 3, 16], [36, 7, 8], [4, 14, 20], [32, 13, 2], [36, 13, 2], [40, 13, 2], [36, 17, 12], [4, 19, 14]]) {
                context.fillRect(lx, ly, lw, 1);
              }
            }),
          }),
        );
        board.position.set(room.x0 + 7, y0 + 2.1, towardWalls(-6.94, half));
        scene.add(board);
        addConsole(board);
        for (const by of [0.84, 3.36]) fit(6.2, 0.14, 0.12, solid(PALETTE.wood), room.x0 + 7, by, -6.9);
        fit(0.8, 1.2, 0.6, solid(PALETTE.wood), room.x0 + 7, 0.6, -5.1);
        for (const rowZ of [2, 3.6, 5.2]) {
          for (const deskX of [3, 5.67, 8.33, 11]) {
            fit(1.6, 0.75, 0.6, solid(PALETTE.wood), room.x0 + deskX, 0.375, rowZ);
            fit(0.5, 0.04, 0.32, glow(screenColor), room.x0 + deskX, 0.77, rowZ);
            fit(0.5, 0.45, 0.4, solid(metalLight), room.x0 + deskX, 0.22, rowZ + 0.55);
          }
        }
        // A globe of the world below, turning on its stand.
        fit(0.12, 1.2, 0.12, solid(metalLight), room.x1 - 1.4, 0.6, -5.8);
        const globe = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), solid(tinted(accent, PALETTE.dark, 0.3))));
        globe.position.set(room.x1 - 1.4, y0 + 1.6, towardWalls(-5.8, half));
        scene.add(globe);
        animated.push((time) => { globe.rotation.y = time * 0.0006; });
      } else if (dock) {
        buildDock(room, y0);
      }
    });

    // The end of each deck: the bridge window upstairs, the hull behind the dock below.
    const last = deck.compartments[deck.compartments.length - 1];
    const endX = last.x1 + 0.2;
    if (!upper) {
      put(0.4, UPPER_FLOOR, half * 2, bulkheadMaterial, endX, UPPER_FLOOR / 2, 0);
      return;
    }
    const windowWidth = 9;
    const windowLow = 1.2;
    const windowHigh = 4.6;
    const sideDepth = (half * 2 - windowWidth) / 2;
    put(0.4, last.height, sideDepth, bulkheadMaterial, endX, last.height / 2, -(windowWidth / 2 + sideDepth / 2));
    put(0.4, last.height, sideDepth, bulkheadMaterial, endX, last.height / 2, windowWidth / 2 + sideDepth / 2);
    put(0.4, windowLow, windowWidth, bulkheadMaterial, endX, windowLow / 2, 0);
    put(0.4, last.height - windowHigh, windowWidth, bulkheadMaterial, endX, windowHigh + (last.height - windowHigh) / 2, 0);
    const bowGlass = inert(new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHigh - windowLow), glassMaterial));
    bowGlass.position.set(endX, y0 + (windowLow + windowHigh) / 2, 0);
    bowGlass.rotation.y = -Math.PI / 2;
    scene.add(bowGlass);
    for (const mullion of [-1.5, 1.5]) put(0.2, windowHigh - windowLow, 0.12, trimMaterial, endX - 0.15, (windowLow + windowHigh) / 2, mullion);
  });

  /**
   * The Law-Heart core: a sealed room two storeys tall. Its walls are glass at both
   * deck levels so the gallery can look in; inside, the star burns in gimbal rings,
   * the machines you build stand round it and pour their particles into it.
   */
  function buildCore(room: WalkCompartment) {
    const core = layout.core;
    const cx = heart.x;
    const height = room.height;
    const wall = 0.4;
    const zWall = core.z1 - wall / 2;
    const xWall = core.x1 - cx - wall / 2;
    const innerZ = core.z1 - wall;
    const innerX = core.x1 - cx - wall;
    const coreMetal = solid(tinted("#2a2638", accent, 0.08));
    const levels: [number, number][] = [[0.9, 4.6], [UPPER_FLOOR + 0.9, UPPER_FLOOR + 4.8]];
    const coreGlass = new THREE.MeshBasicMaterial({ map: glassTexture(tinted(spec.limb, "#ffffff", 0.3)), transparent: true, depthWrite: false, side: THREE.DoubleSide });

    const coreWall = (alongX: boolean, fixed: number, a0: number, a1: number, open0: number, open1: number) => {
      const openings = levels.map(([low, high]) => ({ a0: open0, a1: open1, y0: low, y1: high }));
      const slab = (length: number, tall: number, depth: number, material: THREE.Material, along: number, y: number) => {
        const mesh = new THREE.Mesh(alongX ? new THREE.BoxGeometry(length, tall, depth) : new THREE.BoxGeometry(depth, tall, length), material);
        mesh.position.set(alongX ? along : fixed, y, alongX ? fixed : along);
        scene.add(mesh);
        return mesh;
      };
      for (const piece of wallPieces(a0, a1, height, openings)) {
        slab(piece.a1 - piece.a0, piece.y1 - piece.y0, wall, coreMetal, (piece.a0 + piece.a1) / 2, (piece.y0 + piece.y1) / 2);
      }
      for (const opening of openings) {
        const length = opening.a1 - opening.a0;
        const tall = opening.y1 - opening.y0;
        const middle = (opening.a0 + opening.a1) / 2;
        const y = (opening.y0 + opening.y1) / 2;
        const pane = inert(new THREE.Mesh(new THREE.PlaneGeometry(length, tall), coreGlass));
        pane.position.set(alongX ? middle : fixed, y, alongX ? fixed : middle);
        if (!alongX) pane.rotation.y = Math.PI / 2;
        scene.add(pane);
        slab(length + 0.32, 0.18, wall + 0.24, trimMaterial, middle, opening.y0);
        slab(length + 0.32, 0.18, wall + 0.24, trimMaterial, middle, opening.y1);
        slab(0.18, tall, wall + 0.24, trimMaterial, opening.a0, y);
        slab(0.18, tall, wall + 0.24, trimMaterial, opening.a1, y);
      }
    };
    for (const side of [-1, 1]) coreWall(true, side * zWall, core.x0, core.x1, cx - 4, cx + 4);
    for (const end of [-1, 1]) coreWall(false, cx + end * xWall, -innerZ, innerZ, -(innerZ - 1.2), innerZ - 1.2);

    // Hazard stripes round its foot on both levels, and its name over the end windows.
    const stripeMaterial = (length: number) => new THREE.MeshBasicMaterial({ map: repeated(stripes, length * 2, 1) });
    for (const base of [0, UPPER_FLOOR]) {
      for (const side of [-1, 1]) {
        const band = new THREE.Mesh(new THREE.PlaneGeometry(core.x1 - core.x0, 0.32), stripeMaterial(core.x1 - core.x0));
        band.position.set(cx, base + 0.17, side * (core.z1 + 0.01));
        if (side < 0) band.rotation.y = Math.PI;
        scene.add(band);
      }
      for (const end of [-1, 1]) {
        const band = new THREE.Mesh(new THREE.PlaneGeometry(core.z1 * 2, 0.32), stripeMaterial(core.z1 * 2));
        band.position.set(cx + end * (core.x1 - cx + 0.01), base + 0.17, 0);
        band.rotation.y = (end * Math.PI) / 2;
        scene.add(band);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.4), new THREE.MeshBasicMaterial({ map: signTexture("LAW-HEART CORE · SEALED", PALETTE.amber) }));
        sign.position.set(cx + end * (core.x1 - cx + 0.02), base + (base === 0 ? 5.15 : 5.3), 0);
        sign.rotation.y = (end * Math.PI) / 2;
        scene.add(sign);
      }
    }
    // Inside: a dark grated floor.
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(innerX * 2, innerZ * 2), lambert("#ffffff", { map: repeated(grateTexture, innerX * 2, innerZ * 2) }));
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(cx, 0.012, 0);
    scene.add(grate);

    // The gallery's own lights, down both sides at both levels.
    for (const side of [-1, 1]) {
      for (const lampY of [UPPER_FLOOR - 0.6, height - 0.7]) {
        const walk = side * (core.z1 + half) / 2;
        const lamp = new THREE.PointLight(PALETTE.light, 8, 16, 1.2);
        lamp.position.set(cx, lampY, walk);
        scene.add(lamp);
        box(core.x1 - core.x0 - 1, 0.06, 0.4, glow(PALETTE.light), cx, lampY + 0.55, walk);
      }
    }
  }

  /**
   * The recon dock: a gallery, and behind the pressure wall the sealed launch bay. The
   * recon ship only flies when the game sends a team to the surface: it leaves through
   * the bay (blast doors shut, air out, hull door down) and comes home the same way.
   */
  function buildDock(room: WalkCompartment, y0: number) {
    const { pad, parked, lounge, exit, bay, blastDoor, opening } = layout.dock;
    const put = (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) =>
      box(w, h, d, material, x, y0 + y, z);
    const dark = !room.online;
    const wallZ = (blastDoor.z0 + blastDoor.z1) / 2;
    const gapCx = (blastDoor.x0 + blastDoor.x1) / 2;
    const gapWidth = blastDoor.x1 - blastDoor.x0;
    const leafWidth = gapWidth / 2 + 0.15;

    // The pressure wall: observation windows either side of the blast doors.
    const windows: Rect[] = [
      { a0: room.x0 + 1.5, a1: blastDoor.x0 - leafWidth - 0.3, y0: 1.1, y1: 3.9 },
      { a0: blastDoor.x1 + leafWidth + 0.3, a1: room.x1 - 1.5, y0: 1.1, y1: 3.9 },
    ];
    const doorway: Rect = { a0: blastDoor.x0, a1: blastDoor.x1, y0: 0, y1: 4.2 };
    const pressureWall = solid(tinted(PALETTE.hull, accent, 0.12));
    for (const piece of wallPieces(room.x0, room.x1, room.height, [...windows, doorway])) {
      put(piece.a1 - piece.a0, piece.y1 - piece.y0, 0.4, pressureWall, (piece.a0 + piece.a1) / 2, (piece.y0 + piece.y1) / 2, wallZ);
    }
    for (const view of windows) {
      const w = view.a1 - view.a0;
      const h = view.y1 - view.y0;
      const wx = (view.a0 + view.a1) / 2;
      const pane = inert(new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMaterial));
      pane.position.set(wx, y0 + (view.y0 + view.y1) / 2, wallZ);
      scene.add(pane);
      put(w + 0.3, 0.16, 0.6, trimMaterial, wx, view.y0, wallZ);
      put(w + 0.3, 0.16, 0.6, trimMaterial, wx, view.y1, wallZ);
      for (let mullion = view.a0 + 2.5; mullion < view.a1 - 1; mullion += 2.5) put(0.12, h, 0.2, trimMaterial, mullion, (view.y0 + view.y1) / 2, wallZ);
    }
    put(gapWidth + 0.6, 0.3, 0.7, lambert("#ffffff", { map: repeated(stripes, gapWidth * 2, 0.5) }), gapCx, 4.35, wallZ);
    const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.4), new THREE.MeshBasicMaterial({ map: signTexture("LAUNCH BAY · PRESSURE DOOR", PALETTE.amber) }));
    doorSign.position.set(gapCx, y0 + 4.9, wallZ - 0.21);
    doorSign.rotation.y = Math.PI;
    scene.add(doorSign);

    // The blast doors: two thick leaves that slide out of the wall to seal the bay.
    const leafMaterial = solid(tinted(PALETTE.metal, accent, 0.06));
    const leaves = [-1, 1].map((sideSign) => {
      const leaf = new THREE.Group();
      leaf.add(new THREE.Mesh(new THREE.BoxGeometry(leafWidth, 4.2, 0.3), leafMaterial));
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.34), lambert("#ffffff", { map: repeated(stripes, 0.8, 8) }));
      edge.position.x = -sideSign * (leafWidth / 2 - 0.2);
      leaf.add(edge);
      for (let rib = 0; rib < 3; rib += 1) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(leafWidth - 0.6, 0.16, 0.36), solid(metalLight));
        bar.position.y = -1.2 + rib * 1.2;
        leaf.add(bar);
      }
      leaf.position.set(0, y0 + 2.1, wallZ);
      scene.add(leaf);
      return { leaf, sideSign };
    });

    // The hull door: one great leaf hinged at its foot that swings down and out to let the ship go.
    const openWidth = opening.x1 - opening.x0;
    const hullDoor = new THREE.Group();
    hullDoor.position.set((opening.x0 + opening.x1) / 2, y0 + 0.4, half + HULL / 2);
    const hullLeaf = new THREE.Mesh(new THREE.BoxGeometry(openWidth, 4.8, 0.3), [hullSkin, hullSkin, hullSkin, hullSkin, hullSkin, solid(metal)]);
    hullLeaf.position.y = 2.4;
    hullDoor.add(hullLeaf);
    for (let rib = 0; rib < 6; rib += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.8, 0.2), solid(metalLight));
      bar.position.set(-openWidth / 2 + 1.5 + rib * ((openWidth - 3) / 5), 2.4, -0.22);
      hullDoor.add(bar);
    }
    const seam = new THREE.Mesh(new THREE.BoxGeometry(openWidth, 0.3, 0.34), lambert("#ffffff", { map: repeated(stripes, openWidth * 2, 1) }));
    seam.position.y = 4.65;
    hullDoor.add(seam);
    scene.add(hullDoor);
    put(openWidth + 0.6, 0.4, 0.4, lambert("#ffffff", { map: repeated(stripes, openWidth * 2, 1) }), (opening.x0 + opening.x1) / 2, 0.2, half - 0.2);

    // The bay: pads, overhead gantry, lamps that go red when it is sealed, warning beacons.
    for (const spot of [pad, parked]) {
      const ring = inert(new THREE.Mesh(new THREE.RingGeometry(2.4, 2.65, 24), glow(tinted(PALETTE.amber, PALETTE.dark, 0.35))));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(spot.x, y0 + 0.02, spot.z);
      scene.add(ring);
      put(2.6, 0.02, 0.16, glow(tinted(PALETTE.amber, PALETTE.dark, 0.5)), spot.x, 0.02, spot.z);
      put(0.16, 0.02, 2.6, glow(tinted(PALETTE.amber, PALETTE.dark, 0.5)), spot.x, 0.02, spot.z);
    }
    for (const railZ of [bay.z0 + 0.6, half - 0.6]) put(room.x1 - room.x0, 0.3, 0.3, solid(metal), (room.x0 + room.x1) / 2, room.height - 0.3, railZ);
    put(0.5, 0.4, half - bay.z0, solid(PALETTE.amber), parked.x, room.height - 0.6, (bay.z0 + half) / 2);
    const hook = put(0.6, 0.5, 0.6, solid(metal), parked.x, room.height - 1.6, parked.z);
    const bayLamps = [pad.x, parked.x].map((lx) => {
      const lamp = new THREE.PointLight(PALETTE.light, 9, 18, 1.1);
      lamp.position.set(lx, y0 + room.height - 0.8, (bay.z0 + half) / 2);
      scene.add(lamp);
      return lamp;
    });
    for (const lx of [room.x0 + 6, room.x1 - 6]) {
      const lamp = new THREE.PointLight(PALETTE.light, dark ? 3 : 9, 18, 1.1);
      lamp.position.set(lx, y0 + room.height - 0.7, -2.5);
      scene.add(lamp);
      put(8, 0.06, 0.4, glow(dark ? PALETTE.dark : PALETTE.light), lx, room.height - 0.05, -2.5);
    }
    const beacons = [room.x0 + 2, room.x1 - 2].flatMap((bx) => [bay.z0 + 0.3, half - 0.4].map((bz) => {
      const beacon = put(0.3, 0.3, 0.3, glow(PALETTE.alert), bx, room.height - 1, bz);
      beacon.visible = false;
      return beacon;
    }));
    const alarmLight = new THREE.PointLight(PALETTE.alert, 0, 22, 1.2);
    alarmLight.position.set((room.x0 + room.x1) / 2, y0 + room.height - 1, (bay.z0 + half) / 2);
    scene.add(alarmLight);
    // Air rushing out when the bay is pumped down.
    const mistCount = 90;
    const mistPositions = new Float32Array(mistCount * 3);
    const mistGeometry = new THREE.BufferGeometry();
    mistGeometry.setAttribute("position", new THREE.BufferAttribute(mistPositions, 3));
    const mist = inert(new THREE.Points(mistGeometry, new THREE.PointsMaterial({ color: "#dfe8ff", size: 0.12, transparent: true, opacity: 0.6, depthWrite: false })));
    mist.visible = false;
    scene.add(mist);

    // The gallery: lounge benches, the launch desk at the window, cargo, and the recon board.
    for (const bx of [lounge.x - 1, lounge.x + 1]) {
      put(1.8, 0.45, 0.6, solid(metalLight), bx, 0.225, -half + 0.7);
      put(1.8, 0.6, 0.12, solid(metalLight), bx, 0.75, -half + 0.38);
    }
    put(2, 1, 1, solid(metal), room.x0 + 6, 0.5, blastDoor.z0 - 0.9);
    const deskScreen = put(1.6, 0.6, 0.06, glow(dark ? PALETTE.dark : screenGlow), room.x0 + 6, 1.35, blastDoor.z0 - 1.42);
    deskScreen.rotation.x = -0.4;
    [[1.6, 0.45, 1.4], [2.6, 0.45, 1.4], [2.1, 0.45, 2.6], [2.1, 1.35, 2]].forEach(([dx, dy, back]) => {
      put(0.9, 0.9, 0.9, solid(PALETTE.wood), room.x1 - dx, dy, -half + back);
    });
    const boardCanvas = document.createElement("canvas");
    boardCanvas.width = 160;
    boardCanvas.height = 48;
    const boardContext = boardCanvas.getContext("2d")!;
    const boardTexture = new THREE.CanvasTexture(boardCanvas);
    boardTexture.magFilter = THREE.NearestFilter;
    boardTexture.minFilter = THREE.NearestFilter;
    boardTexture.generateMipmaps = false;
    boardTexture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.5), new THREE.MeshBasicMaterial({ map: boardTexture }));
    board.position.set(room.x0 + 13, y0 + 2.6, -half + 0.06);
    scene.add(board);
    put(5.2, 1.7, 0.08, solid(PALETTE.dark), room.x0 + 13, 2.6, -half + 0.02);

    // Two recon ships: one laid up for repairs with a drone at it, and the one that flies.
    const laidUp = reconShip(false);
    laidUp.group.position.set(parked.x, y0, parked.z);
    laidUp.group.rotation.y = Math.PI / 2;
    laidUp.ramp.rotation.x = 0.42;
    scene.add(laidUp.group);
    label(laidUp.group, "Recon ship two · laid up for repairs");
    const serviceDrone = droneModel(PALETTE.amber);
    scene.add(serviceDrone);
    const flyer = reconShip(true);
    flyer.group.position.set(pad.x, y0, pad.z);
    flyer.group.rotation.y = Math.PI / 2;
    scene.add(flyer.group);
    label(flyer.group, "Recon ship one");

    // Where the team walks: lounge, through the blast doors, up the ramp at the ship's tail.
    const rampFoot = { x: pad.x - 4.1, z: pad.z };
    const hatch = { x: pad.x - 2.6, z: pad.z };
    const gapPoint = (lane: number) => ({ x: gapCx + lane * 0.5, z: wallZ });
    const crewById = new Map(props.crew.map((member) => [member.id, member]));
    let team: Person[] = [];
    const muster = (ids: readonly string[]) => {
      for (const person of team) scene.remove(person.group);
      const members = ids.map((id) => crewById.get(id)).filter((member) => member !== undefined).slice(0, 4);
      const roster = members.length > 0
        ? members.map((member) => ({ id: member.id, role: member.role }))
        : ["security", "navigator", "researcher"].map((role, index) => ({ id: `recon-team-${index}`, role }));
      team = roster.map((member) => {
        const person = blockyPerson(member.id, member.role);
        person.group.visible = false;
        scene.add(person.group);
        return person;
      });
    };
    const along = (points: readonly { x: number; z: number }[], amount: number) => {
      const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.z - points[index].z));
      let distance = amount * lengths.reduce((sum, length) => sum + length, 0);
      for (let leg = 0; leg < lengths.length; leg += 1) {
        if (distance <= lengths[leg] || leg === lengths.length - 1) {
          const t = lengths[leg] > 0 ? Math.min(1, distance / lengths[leg]) : 1;
          const from = points[leg];
          const to = points[leg + 1];
          return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, dx: to.x - from.x, dz: to.z - from.z, leg, last: lengths.length - 1 };
        }
        distance -= lengths[leg];
      }
      return { ...points[0], dx: 0, dz: 1, leg: 0, last: 0 };
    };

    // The scene runs on its own clock; the game decides when it starts.
    const recon = props.recon;
    const state: { scene: DockScene | null; startedAt: number | null; home: boolean; awaitingArrival: boolean } = {
      scene: recon?.away && recon.sinceLaunch < FRESH_LAUNCH_SECONDS ? "departure" : null,
      startedAt: null,
      home: !recon?.away,
      awaitingArrival: false,
    };
    muster(recon?.away ? recon.crewIds : []);
    let previous: DockMoment | null = null;
    let hold = "";
    const droneInBay = (drone: Drone) =>
      drone.deck === 1 && drone.x > bay.x0 && drone.x < bay.x1 && drone.z > blastDoor.z0 - DRONE_RADIUS - 0.2;
    const rest = (home: boolean): DockMoment => ({
      blastDoors: 0,
      hullDoors: 0,
      alarm: false,
      venting: false,
      ship: home ? { lift: 0, turn: 0, out: 0 } : { lift: 1, turn: 1, out: 1 },
      walk: 0,
      done: true,
    });
    const doorwayOut = new THREE.Vector3(pad.x, y0 + 2.4, half + 5);
    const awayDirection = planetWorld.clone().sub(doorwayOut).normalize();
    let current = rest(state.home);

    animated.push((time, drone) => {
      const reconNow = live().recon;
      hold = "";
      if (!state.scene) {
        if (state.home && reconNow?.away) {
          state.scene = "departure";
          state.startedAt = null;
          muster(reconNow.crewIds);
        } else if (!state.home && reconNow && !reconNow.away) {
          state.awaitingArrival = true;
        }
        if (state.awaitingArrival) {
          if (droneInBay(drone)) hold = "The recon ship is coming home · clear the launch bay so it can seal";
          else {
            state.scene = "arrival";
            state.startedAt = time;
            state.awaitingArrival = false;
          }
        }
      }
      if (state.scene) {
        state.startedAt ??= time;
        let elapsed = time - state.startedAt;
        // Never seal the bay with the drone inside: hold the count until it leaves.
        if (state.scene === "departure" && elapsed > 6_500 && elapsed < 7_000 && droneInBay(drone)) {
          state.startedAt += drone.dt * 1000;
          elapsed = time - state.startedAt;
          hold = "The launch bay is about to seal · clear the bay";
        }
        current = dockMoment(state.scene, elapsed);
        if (current.done) {
          state.home = state.scene === "arrival";
          state.scene = null;
          current = rest(state.home);
          for (const person of team) person.group.visible = false;
        }
      } else {
        current = rest(state.home);
      }
      const moment = current;

      // Doors.
      for (const { leaf, sideSign } of leaves) {
        const shut = gapCx + sideSign * (leafWidth / 2 - 0.08);
        const stowed = sideSign < 0 ? blastDoor.x0 - leafWidth / 2 : blastDoor.x1 + leafWidth / 2;
        leaf.position.x = stowed + (shut - stowed) * moment.blastDoors;
      }
      hullDoor.rotation.x = moment.hullDoors * 1.75;
      if (previous) {
        const moved = (now: number, before: number) => (now > 0 && before === 0) || (now < 1 && before === 1 && now !== before);
        if (moved(moment.blastDoors, previous.blastDoors) || moved(moment.hullDoors, previous.hullDoors)) playBulkhead();
      }
      previous = moment;

      // Light: amber when the bay holds air, red with beacons when it is sealed.
      const flash = Math.floor(time / 250) % 2 === 0;
      for (const lamp of bayLamps) {
        lamp.color.set(moment.alarm ? PALETTE.alert : PALETTE.light);
        lamp.intensity = dark ? 3 : moment.alarm ? 5 : 9;
      }
      beacons.forEach((beacon, beaconIndex) => { beacon.visible = moment.alarm && (flash ? beaconIndex % 2 === 0 : beaconIndex % 2 === 1); });
      alarmLight.intensity = moment.alarm ? (flash ? 6 : 2) : 0;
      mist.visible = moment.venting;
      if (moment.venting) {
        for (let speck = 0; speck < mistCount; speck += 1) {
          const drift = ((time * 0.0006) + hash(speck * 3.1)) % 1;
          mistPositions[speck * 3] = room.x0 + 2 + hash(speck * 7.7) * (room.x1 - room.x0 - 4);
          mistPositions[speck * 3 + 1] = y0 + 0.3 + hash(speck * 5.3) * 4;
          mistPositions[speck * 3 + 2] = bay.z0 + 0.5 + drift * (half - bay.z0 - 0.4);
        }
        mistGeometry.attributes.position.needsUpdate = true;
      }

      // The flying ship: on its pad nose to the bow, lifted, turned to the hull door, gone.
      const ship = moment.ship;
      flyer.group.visible = ship.out < 0.999;
      if (ship.out <= 0) {
        flyer.group.position.set(pad.x, y0 + ship.lift * 2.4, pad.z);
      } else if (ship.out < 0.3) {
        const t = ship.out / 0.3;
        flyer.group.position.set(pad.x, y0 + 2.4, pad.z + (doorwayOut.z - pad.z) * t);
      } else {
        const t = ((ship.out - 0.3) / 0.7) ** 1.6;
        flyer.group.position.copy(doorwayOut).addScaledVector(awayDirection, t * 260);
      }
      flyer.group.rotation.set(ship.out > 0.3 ? 0.25 : 0, (Math.PI / 2) * (1 - ship.turn), 0);
      flyer.ramp.rotation.x = ship.lift === 0 && ship.out === 0 ? 0.42 : -1.4;
      for (const leg of flyer.legs) leg.visible = ship.lift < 0.4;
      const burn = ship.lift === 0 && ship.out === 0 ? 0.15 : 0.75 + hash(Math.floor(time / 60)) * 0.25;
      for (const engine of flyer.engines) engine.scale.setScalar(0.5 + burn * 0.8);

      // The team: aboard through the blast doors on the way out, off and away on the way home.
      team.forEach((person, member) => {
        const lane = member - (team.length - 1) / 2;
        const seat = { x: lounge.x - 1.5 + member, z: lounge.z - 0.6 };
        const route = [seat, gapPoint(lane), rampFoot, hatch];
        const progress = Math.min(1, Math.max(0, (moment.walk - member * 0.1) / 0.7));
        if (state.scene === "departure") {
          person.group.visible = progress < 1 && moment.blastDoors === 0;
          const step = along(route, progress);
          person.group.position.set(step.x, y0 + (step.leg === step.last ? Math.min(1, progress * 3 - 2) * 0.6 : 0), step.z);
          face(person.group, progress > 0 ? step.dx : 0, progress > 0 ? step.dz : 1);
          stride(person, time * 0.012, progress > 0 && progress < 1 ? 0.5 : 0);
        } else if (state.scene === "arrival") {
          person.group.visible = progress > 0 && progress < 1;
          const step = along([hatch, rampFoot, gapPoint(lane), exit], progress);
          person.group.position.set(step.x, y0, step.z);
          face(person.group, step.dx, step.dz);
          stride(person, time * 0.012, 0.5);
        }
      });

      serviceDrone.position.set(parked.x + Math.cos(time * 0.0007) * 2.6, y0 + 2.8 + Math.sin(time * 0.0019) * 0.3, parked.z + Math.sin(time * 0.0007) * 1.6);
      serviceDrone.rotation.y = -time * 0.0007;
      hook.position.y = y0 + room.height - 1.6 - Math.max(0, Math.sin(time * 0.0004)) * 1.2;
    });
    dynamicObstacles.push(() => {
      const ship = current.ship;
      return ship.out === 0 && ship.lift < 0.5 ? { deck: 1, x: pad.x, z: pad.z, radius: 2.7 + DRONE_RADIUS } : null;
    });
    dynamicObstacles.push(() => (current.blastDoors > 0.02 ? { deck: 1, box: blastDoor } : null));
    notices.push(() => hold || null);

    // The status board and the launch desk report on the recon ship, and open Expeditions.
    const minutes = (seconds: number) => (seconds >= 90 ? `${Math.round(seconds / 60)} min` : `${Math.max(1, Math.round(seconds))} s`);
    const status = () => {
      const now = live().recon;
      if (state.scene === "departure") return ["LAUNCHING", now?.site ? `TEAM BOUND FOR ${now.site.toUpperCase()}` : "TEAM BOUND FOR THE SURFACE"];
      if (state.scene === "arrival") return ["COMING HOME", "STAND CLEAR OF THE BAY"];
      if (now?.away) return [`ON THE SURFACE`, `${(now.site ?? "SITE").toUpperCase()} · BACK IN ${minutes(now.remaining).toUpperCase()}`];
      return ["IN ITS BAY", "READY FOR AN EXPEDITION"];
    };
    let lastBoard = "";
    animated.push(() => {
      const lines = status();
      const key = lines.join("|");
      if (key === lastBoard) return;
      lastBoard = key;
      boardContext.fillStyle = PALETTE.dark;
      boardContext.fillRect(0, 0, 160, 48);
      boardContext.fillStyle = PALETTE.amber;
      boardContext.font = "bold 11px monospace";
      boardContext.textBaseline = "top";
      boardContext.fillText("RECON SHIP ONE", 6, 5);
      boardContext.fillStyle = PALETTE.light;
      boardContext.fillText(lines[0], 6, 19);
      boardContext.fillStyle = screenGlow;
      boardContext.font = "9px monospace";
      boardContext.fillText(lines[1], 6, 34);
      boardTexture.needsUpdate = true;
    });
    const deskRoom = roomsByKind.get("hangar") ?? null;
    const prompt = () => {
      const now = live().recon;
      const open = deskRoom?.interactive ? " · E · open Expeditions" : " · Expeditions not yet unlocked";
      if (state.scene) return `Recon ship ${state.scene === "departure" ? "launching" : "coming home"}`;
      if (now?.away) return `Recon team at ${now.site ?? "the surface"} · back in ${minutes(now.remaining)}${open}`;
      return `Recon ship ready${deskRoom?.interactive ? " · E · plan an expedition" : " · Expeditions not yet unlocked"}`;
    };
    for (const object of [deskScreen, board]) {
      interactables.push({ kind: "console", object, label: room.label, room: deskRoom, online: room.online, deck: 1, prompt });
    }
  }

  function reconShip(fogless: boolean) {
    const group = new THREE.Group();
    const material = (color: string) => (fogless ? new THREE.MeshLambertMaterial({ color, flatShading: true, fog: false }) : solid(color));
    const hull = material(tinted(PALETTE.shuttle, accent, 0.1));
    const panel = material(tinted(PALETTE.metal, accent, 0.1));
    const part = (w: number, h: number, d: number, partMaterial: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), partMaterial);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    // The nose points +z.
    part(2.2, 1.2, 4.6, hull, 0, 1.3, 0);
    part(1.6, 0.9, 1, hull, 0, 1.25, 2.7);
    part(1.2, 0.6, 0.5, hull, 0, 1.2, 3.35);
    part(1.5, 0.55, 1.3, new THREE.MeshBasicMaterial({ color: glass, fog: !fogless }), 0, 2.05, 1.7);
    part(3.8, 0.14, 1.9, hull, 0, 1.15, -0.5);
    part(2.24, 0.12, 4.64, material(PALETTE.stripe), 0, 1.05, 0);
    for (const side of [-1, 1]) {
      part(0.16, 0.6, 1, material(PALETTE.stripe), side * 1.9, 1.4, -0.8);
      part(0.6, 0.3, 2.4, panel, side * 1.25, 1.5, -0.4);
      part(0.08, 0.08, 0.08, new THREE.MeshBasicMaterial({ color: side < 0 ? PALETTE.alert : PALETTE.ok, fog: !fogless }), side * 1.95, 1.75, -0.8);
    }
    part(0.14, 0.9, 1.2, hull, 0, 2.3, -1.7);
    part(1.6, 0.1, 3.2, panel, 0, 1.92, -0.6);
    const engines = [-0.7, 0.7].map((x) => {
      part(0.7, 0.7, 0.6, panel, x, 1.3, -2.5);
      return part(0.5, 0.5, 0.05, new THREE.MeshBasicMaterial({ color: PALETTE.amber, fog: !fogless }), x, 1.3, -2.83);
    });
    const legs = [[0, 1.6], [-0.9, -1.4], [0.9, -1.4]].map(([x, z]) => part(0.14, 0.7, 0.14, panel, x, 0.35, z));
    // The boarding ramp folds down from the rear hatch.
    const ramp = new THREE.Group();
    ramp.position.set(0, 0.75, -2.3);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.8), material(metalLight));
    plank.position.z = -0.9;
    ramp.add(plank);
    group.add(ramp);
    return { group, engines, legs, ramp };
  }

  function droneModel(eye: string) {
    const drone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), solid(metal));
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.04), glow(eye));
    lens.position.z = 0.22;
    drone.add(body, lens);
    for (const [rx, rz] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.06), solid(metalLight));
      rotor.position.set(rx, 0.14, rz);
      drone.add(rotor);
    }
    return drone;
  }

  // Grav-lifts: a column of light from the gallery floor up through each lift well.
  const chamberHeight = layout.decks[1].compartments.find((room) => room.kind === "chamber")?.height ?? 12;
  for (const lift of layout.lifts) {
    const shaft = inert(new THREE.Mesh(new THREE.CylinderGeometry(LIFT_RADIUS, LIFT_RADIUS, chamberHeight, 12, 1, true), ghost(liftGlow, 0.07)));
    shaft.position.set(lift.x, chamberHeight / 2, lift.z);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(LIFT_RADIUS + 0.05, LIFT_RADIUS + 0.05, 0.05, 16), glow(tinted(liftGlow, "#000000", 0.45)));
    pad.position.set(lift.x, 0.025, lift.z);
    scene.add(shaft, pad);
    const rings = [0, 0.5].map(() => {
      const ring = inert(new THREE.Mesh(new THREE.TorusGeometry(LIFT_RADIUS - 0.05, 0.03, 4, 16), ghost(liftGlow, 0.5)));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lift.x, 0, lift.z);
      scene.add(ring);
      return ring;
    });
    animated.push((time) => {
      rings.forEach((ring, ringIndex) => {
        ring.position.y = (((time * 0.00025) + ringIndex * 0.5) % 1) * chamberHeight;
      });
    });
  }

  // ---- The Law-Heart: a star held in gimbal rings inside the sealed core. ----
  const stage = Math.max(0, Math.min(STAR_RADII.length - 1, Math.round(spec.stage)));
  const radius = STAR_RADII[stage];
  const starAt = new THREE.Vector3(heart.x, heart.y, heart.z);
  const heartGroup = new THREE.Group();
  heartGroup.position.copy(starAt);
  scene.add(heartGroup);
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, stage >= 3 ? 2 : 1),
    new THREE.MeshLambertMaterial({
      color: spec.surface,
      emissive: spec.surface,
      emissiveIntensity: stage === 0 ? 0.08 : 0.5,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const heartTarget: Interactable = { kind: "heart", object: shell };
  interactables.push(heartTarget);
  const core = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 0.55, 1), new THREE.MeshBasicMaterial({ color: spec.core })));
  const innerGlow = inert(new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(spec.bright), blending: THREE.AdditiveBlending, depthWrite: false })));
  innerGlow.scale.setScalar(radius * 3);
  const halo = inert(new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(spec.surface), blending: THREE.AdditiveBlending, depthWrite: false, opacity: stage === 0 ? 0.3 : 1 })));
  halo.scale.setScalar(radius * 5);
  const outerHalo = inert(new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(spec.corona[0] ?? spec.surface), blending: THREE.AdditiveBlending, depthWrite: false, opacity: stage === 0 ? 0.1 : 0.3 })));
  outerHalo.scale.setScalar(radius * 7);
  heartGroup.add(outerHalo, halo, shell, core, innerGlow);
  // Corona shells, one per corona colour: more of them, and brighter, as the heart grows.
  const coronas = spec.corona.map((color, layer) => {
    const mesh = inert(new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * (1.22 + layer * 0.14), 1),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: stage === 0 ? 0.15 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    ));
    heartGroup.add(mesh);
    return mesh;
  });
  // Prominences: arcs of the star's fire looping off its surface.
  const flares = [0, 1, 2, 3].map((flare) => {
    const arc = inert(new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.45, 0.06 * radius, 4, 16, Math.PI),
      ghost(spec.bright, stage === 0 ? 0.1 : 0.7),
    ));
    const pivot = new THREE.Group();
    arc.position.y = radius * 0.8;
    pivot.add(arc);
    pivot.rotation.set(hash(flare * 3.3) * Math.PI * 2, hash(flare * 5.7) * Math.PI * 2, 0);
    heartGroup.add(pivot);
    return pivot;
  });
  // From the Axiomatic Star on, the heart grows spines.
  if (stage >= 4) {
    const spineCount = 8 + (stage - 4) * 6;
    const up = new THREE.Vector3(0, 1, 0);
    for (let spine = 0; spine < spineCount; spine += 1) {
      const y = 1 - (2 * (spine + 0.5)) / spineCount;
      const ring = Math.sqrt(1 - y * y);
      const theta = spine * 2.39996;
      const direction = new THREE.Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring);
      const cone = inert(new THREE.Mesh(new THREE.ConeGeometry(0.12 * radius, 0.7 * radius, 4), new THREE.MeshBasicMaterial({ color: spec.bright })));
      cone.position.copy(direction).multiplyScalar(radius * 1.05);
      cone.quaternion.setFromUnitVectors(up, direction);
      heartGroup.add(cone);
    }
  }
  // Containment: three gimbal rings turning on different axes, flaring on each beat.
  const gimbals = [0, 1, 2].map((ringIndex) => {
    const ringRadius = Math.min(radius + 0.6 + ringIndex * 0.25, 3 + ringIndex * 0.15);
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(ringRadius, 0.11, 6, 48),
      lambert(metalLight, { emissive: new THREE.Color(spec.bright), emissiveIntensity: 0.3 }),
    );
    mesh.position.copy(starAt);
    scene.add(mesh);
    return mesh;
  });
  // Axiom shards: one for each proven Axiom, orbiting the star.
  const shardOrbit = new THREE.Group();
  shardOrbit.position.copy(starAt);
  scene.add(shardOrbit);
  const shardMaterial = new THREE.MeshBasicMaterial({ color: spec.shard });
  for (let shardIndex = 0; shardIndex < spec.shards; shardIndex += 1) {
    const shard = inert(new THREE.Mesh(new THREE.OctahedronGeometry(shardIndex % 4 === 0 ? 0.24 : 0.16, 0), shardMaterial));
    const angle = hash(shardIndex * 17.3) * Math.PI * 2;
    const orbitRadius = radius + 0.7 + (shardIndex % 3) * 0.3;
    shard.position.set(Math.cos(angle) * orbitRadius, (hash(shardIndex * 5.1) - 0.5) * 2.4, Math.sin(angle) * orbitRadius);
    shardOrbit.add(shard);
  }

  // ---- The machines you build, standing round the star in the core. ----
  const coreBox = layout.core;
  const innerX = coreBox.x1 - heart.x - 0.4;
  const innerZ = coreBox.z1 - 0.4;
  const emitters: { at: () => THREE.Vector3; color: THREE.Color; seed: number }[] = [];
  const beams: { mesh: THREE.Mesh; seed: number }[] = [];
  const machineCount = (count: number, cap: number) => (count > 0 ? Math.max(1, Math.min(cap, 1 + Math.floor(Math.log2(count)))) : 0);
  const feedBeam = (from: THREE.Vector3, color: string, seed: number, width = 0.05) => {
    const toward = starAt.clone().sub(from);
    const to = from.clone().add(toward.setLength(Math.max(0.1, toward.length() - radius * 1.05)));
    const beamMesh = inert(new THREE.Mesh(new THREE.BoxGeometry(width, width, from.distanceTo(to)), ghost(color, 0.35)));
    beamMesh.position.copy(from).add(to).multiplyScalar(0.5);
    beamMesh.lookAt(to);
    scene.add(beamMesh);
    beams.push({ mesh: beamMesh, seed });
    emitters.push({ at: () => from, color: new THREE.Color(color), seed });
  };
  const machineGroup = (x: number, y: number, z: number, text: string) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    scene.add(group);
    label(group, text);
    return group;
  };
  const piece = (group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  feeds.forEach((machine, tier) => {
    const lit = machine.count > 0;
    const shown = lit ? machineCount(machine.count, [8, 4, 4, 10, 4, 1][tier]) : 1;
    const energy = lit ? glow(machine.color) : solid(PALETTE.dark);
    const text = lit ? `${machine.name} · ${machine.count} built` : `${machine.name} · not yet built · build it in the Foundry`;
    for (let unit = 0; unit < shown; unit += 1) {
      const seed = tier * 10 + unit;
      if (tier === 0) {
        // Vacuum Tap: a bell on a stem, drawing Flux out of the quiet into the star.
        const angle = ((unit + 0.5) / 8) * Math.PI * 2;
        const tap = machineGroup(heart.x + Math.cos(angle) * 3.9, 0, Math.sin(angle) * Math.min(4.4, innerZ - 0.9), text);
        piece(tap, new THREE.CylinderGeometry(0.42, 0.5, 0.3, 10), solid(metal), 0, 0.15);
        piece(tap, new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8), solid(metalLight), 0, 0.7);
        piece(tap, new THREE.CylinderGeometry(0.62, 0.2, 0.55, 12, 1, true), lambert(metal, { side: THREE.DoubleSide }), 0, 1.35);
        const mouth = piece(tap, new THREE.CircleGeometry(0.52, 12), energy, 0, 1.58);
        mouth.rotation.x = -Math.PI / 2;
        if (lit) {
          feedBeam(new THREE.Vector3(tap.position.x, 1.6, tap.position.z), machine.color, seed);
          animated.push((time) => { mouth.scale.setScalar(0.75 + 0.25 * Math.sin(time * 0.004 + unit)); });
        }
      } else if (tier === 1) {
        // Phase Coil: rings stacked on a rod, bobbing in a standing wave.
        const corner = [[-1, -1], [1, 1], [-1, 1], [1, -1]][unit];
        const coil = machineGroup(heart.x + corner[0] * (innerX - 0.6), 0, corner[1] * (innerZ - 0.65), text);
        piece(coil, new THREE.BoxGeometry(1, 0.3, 1), solid(metal), 0, 0.15);
        piece(coil, new THREE.CylinderGeometry(0.07, 0.07, 4.8, 6), solid(metalLight), 0, 2.7);
        const rings = Array.from({ length: 7 }, (_, ringIndex) => {
          const ring = piece(coil, new THREE.TorusGeometry(0.42, 0.07, 6, 16), energy, 0, 0.8 + ringIndex * 0.62);
          ring.rotation.x = Math.PI / 2;
          return ring;
        });
        piece(coil, new THREE.BoxGeometry(0.34, 0.24, 0.34), energy, 0, 5.2);
        if (lit) {
          feedBeam(new THREE.Vector3(coil.position.x, 5.2, coil.position.z), machine.color, seed);
          animated.push((time) => {
            rings.forEach((ring, ringIndex) => {
              const wave = Math.sin(time * 0.005 - ringIndex * 0.9 + unit);
              ring.position.y = 0.8 + ringIndex * 0.62 + wave * 0.1;
              ring.scale.setScalar(1 + wave * 0.12);
            });
          });
        }
      } else if (tier === 2) {
        // Harmonic Loom: a frame on the end wall strung with threads that shiver.
        const slot = [[-1, -1.5], [1, 1.5], [-1, 1.5], [1, -1.5]][unit];
        const loom = machineGroup(heart.x + slot[0] * (innerX - 0.15), 5.75, slot[1], text);
        for (const post of [-1.25, 1.25]) piece(loom, new THREE.BoxGeometry(0.14, 2, 0.14), solid(metalLight), 0, 0, post);
        for (const bar of [-1, 1]) piece(loom, new THREE.BoxGeometry(0.14, 0.14, 2.64), solid(metalLight), 0, bar, 0);
        const threads = Array.from({ length: 7 }, (_, thread) => piece(loom, new THREE.BoxGeometry(0.03, 1.86, 0.03), energy, 0, 0, -0.9 + thread * 0.3));
        if (lit) {
          feedBeam(new THREE.Vector3(loom.position.x - slot[0] * 0.2, 5.75, slot[1]), machine.color, seed);
          animated.push((time) => {
            threads.forEach((thread, threadIndex) => { thread.position.x = Math.sin(time * 0.03 + threadIndex * 1.3 + unit) * 0.05; });
          });
        }
      } else if (tier === 3) {
        // Orbit Array: collectors riding a track round the star, under the ceiling.
        if (unit === 0) {
          const track = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.06, 4, 48), solid(metalLight));
          track.rotation.x = Math.PI / 2;
          track.position.set(heart.x, 11.3, 0);
          scene.add(track);
          label(track, text);
        }
        if (!lit) continue;
        const collector = machineGroup(heart.x, 11.3, 0, text);
        piece(collector, new THREE.BoxGeometry(0.4, 0.22, 0.4), solid(metal));
        for (const wing of [-1, 1]) piece(collector, new THREE.BoxGeometry(0.9, 0.03, 0.34), energy, wing * 0.62, 0, 0);
        const phase = (unit / shown) * Math.PI * 2;
        const place = (time: number) => phase + time * 0.00035;
        animated.push((time) => {
          const angle = place(time);
          collector.position.set(heart.x + Math.cos(angle) * 3.3, 11.3, Math.sin(angle) * 3.3);
          collector.rotation.y = -angle;
        });
        emitters.push({ at: () => collector.position, color: new THREE.Color(machine.color), seed });
      } else if (tier === 4) {
        // Constraint Engine: a housing on the side wall turning a flywheel without rest.
        const slot = [[-1, -2.2], [1, 2.2], [-1, 2.2], [1, -2.2]][unit];
        const engine = machineGroup(heart.x + slot[1], 5.75, slot[0] * (innerZ - 0.25), text);
        piece(engine, new THREE.BoxGeometry(1.4, 1.1, 0.5), solid(metal));
        const wheel = new THREE.Group();
        wheel.position.z = -slot[0] * 0.35;
        engine.add(wheel);
        piece(wheel, new THREE.TorusGeometry(0.42, 0.11, 6, 16), energy);
        for (const spoke of [0, Math.PI / 2]) piece(wheel, new THREE.BoxGeometry(0.84, 0.06, 0.06), solid(metalLight)).rotation.z = spoke;
        if (lit) {
          feedBeam(new THREE.Vector3(engine.position.x, 5.75, engine.position.z - slot[0] * 0.4), machine.color, seed);
          animated.push((time) => { wheel.rotation.z = time * 0.008 * (unit % 2 === 0 ? 1 : -1); });
        }
      } else {
        // Horizon Forge: a dark portal in the floor under the star, drawing from beyond.
        const size = lit ? Math.min(2, 1 + 0.15 * Math.log2(machine.count + 1)) : 1;
        const forge = machineGroup(heart.x, 0, 0, text);
        piece(forge, new THREE.CylinderGeometry(size + 0.35, size + 0.5, 0.36, 24), solid(metal), 0, 0.18);
        const hole = piece(forge, new THREE.CircleGeometry(size, 24), new THREE.MeshBasicMaterial({ color: "#020205" }), 0, 0.37);
        hole.rotation.x = -Math.PI / 2;
        const rim = piece(forge, new THREE.TorusGeometry(size, 0.09, 6, 32), energy, 0, 0.38);
        rim.rotation.x = Math.PI / 2;
        const swirl = new THREE.Group();
        swirl.position.y = 0.4;
        forge.add(swirl);
        if (lit) {
          for (let arm = 0; arm < 3; arm += 1) {
            const arc = inert(new THREE.Mesh(new THREE.TorusGeometry(size * (0.35 + arm * 0.2), 0.03, 4, 16, Math.PI), ghost(machine.color, 0.6)));
            arc.rotation.set(Math.PI / 2, 0, (arm * Math.PI * 2) / 3);
            swirl.add(arc);
          }
          feedBeam(new THREE.Vector3(heart.x, 0.4, 0), machine.color, seed, 0.14);
          animated.push((time) => { swirl.rotation.y = -time * 0.0012; });
        }
      }
    }
  });

  // Particles: the star's own swirl, in the colours of the machines feeding it, and streams
  // running up every feed into it.
  const weights = feeds.map((machine) => (machine.count > 0 ? Math.sqrt(machine.count) * 2.4 + 1 : 0));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const swirlCount = weightTotal > 0 ? Math.min(900, Math.round(120 + weightTotal * 12)) : 80;
  const streamPer = 6;
  const particleCount = swirlCount + emitters.length * streamPer;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const orbits = Array.from({ length: swirlCount }, (_, particle) => {
    let tier = 0;
    let pick = hash(particle * 7.171 + 4.13) * weightTotal;
    for (; tier < weights.length - 1 && pick > weights[tier]; tier += 1) pick -= weights[tier];
    new THREE.Color(weightTotal > 0 ? feeds[tier].color : spec.shard).toArray(particleColors, particle * 3);
    return {
      radius: radius * 1.15 + hash(particle * 3.7) * (3.9 - radius * 1.15),
      speed: (0.0003 + hash(particle * 9.1) * 0.0008) * (particle % 2 === 0 ? 1 : -1),
      phase: hash(particle * 1.3) * Math.PI * 2,
      height: (hash(particle * 5.9) - 0.5) * 8,
      wobble: hash(particle * 2.2) * 6,
    };
  });
  emitters.forEach((emitter, index) => {
    for (let speck = 0; speck < streamPer; speck += 1) emitter.color.toArray(particleColors, (swirlCount + index * streamPer + speck) * 3);
  });
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
  const particles = inert(new THREE.Points(particleGeometry, new THREE.PointsMaterial({
    size: 0.09,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })));
  scene.add(particles);
  // The automation drones tending the heart circle it inside the core in their programs' colours.
  const tending = spec.drones.slice(0, 8).map((program, droneIndex) => {
    const drone = droneModel(program.compromised ? PALETTE.alert : program.color);
    scene.add(drone);
    label(drone, program.compromised ? "Automation drone · compromised by the Null" : "Automation drone · tending the Law-Heart");
    return { drone, program, droneIndex };
  });
  const heartLight = new THREE.PointLight(spec.surface, stage === 0 ? 2 : 14, 26, 1.1);
  heartLight.position.copy(starAt);
  scene.add(heartLight);
  const scratch = new THREE.Vector3();
  animated.push((time) => {
    core.rotation.set(time * 0.0007, -time * 0.0011, 0);
    coronas.forEach((mesh, layer) => {
      mesh.rotation.set(time * 0.0002 * (layer + 1), time * 0.0003 * (layer % 2 === 0 ? 1 : -1), 0);
    });
    flares.forEach((pivot, flare) => {
      pivot.rotation.z = time * 0.0002 * (flare % 2 === 0 ? 1 : -1) + flare;
      pivot.children[0].scale.setScalar(0.8 + 0.3 * Math.sin(time * 0.0013 + flare * 2));
    });
    gimbals[0].rotation.set(time * 0.0004, 0, 0);
    gimbals[1].rotation.set(Math.PI / 2, time * 0.0003, 0);
    gimbals[2].rotation.set(time * 0.00025, Math.PI / 3, time * 0.00035);
    shardOrbit.rotation.y = -time * 0.0004;
    orbits.forEach((orbit, particle) => {
      const angle = orbit.phase + time * orbit.speed;
      particlePositions.set([
        starAt.x + Math.cos(angle) * orbit.radius,
        starAt.y + orbit.height * (0.6 + 0.4 * Math.cos(angle * 0.5 + orbit.wobble)),
        starAt.z + Math.sin(angle) * orbit.radius * 0.95,
      ], particle * 3);
    });
    emitters.forEach((emitter, index) => {
      const from = emitter.at();
      for (let speck = 0; speck < streamPer; speck += 1) {
        const t = ((time * 0.0005) + speck / streamPer + emitter.seed * 0.137) % 1;
        scratch.copy(from).lerp(starAt, t * (1 - (radius * 0.9) / Math.max(radius, from.distanceTo(starAt))));
        scratch.toArray(particlePositions, (swirlCount + index * streamPer + speck) * 3);
      }
    });
    particleGeometry.attributes.position.needsUpdate = true;
    beams.forEach(({ mesh, seed }) => {
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(time * 0.006 + seed));
    });
    tending.forEach(({ drone, program, droneIndex }) => {
      const direction = droneIndex % 2 === 0 ? 1 : -1;
      const angle = droneIndex * 1.7 + time * 0.00025 * (1 + (droneIndex % 3) * 0.2) * direction;
      drone.position.set(starAt.x + Math.cos(angle) * 3.6, 2.2 + ((droneIndex * 1.3) % 7) + Math.sin(time * 0.002 + droneIndex) * 0.2, starAt.z + Math.sin(angle) * Math.min(3.6, innerZ - 0.4));
      face(drone, -Math.sin(angle) * direction, Math.cos(angle) * direction);
      drone.visible = !program.compromised || Math.floor(time / 140 + droneIndex) % 5 !== 0;
    });
  });

  // ---- Crew at their stations; the first in each room paces a beat. ----
  const away = new Set(props.recon?.away ? props.recon.crewIds : []);
  const used = new Map<WalkRoomKind, number>();
  const laneOf = new Map<WalkRoomKind, number>();
  const find = (kind: WalkRoomKind) => {
    for (let deck = 0; deck < layout.decks.length; deck += 1) {
      const room = layout.decks[deck].compartments.find((compartment) => compartment.kind === kind);
      if (room) return { deck, room };
    }
    return null;
  };
  for (const member of props.crew) {
    // Those on the surface with the recon team are not aboard.
    if (away.has(member.id)) continue;
    let place = find(ROLE_ROOM[member.role] ?? "habitation");
    if (!place?.room.online) place = find("habitation");
    if (!place?.room.online) continue;
    const { room } = place;
    const deckNumber = place.deck;
    const deck = layout.decks[deckNumber];
    const count = used.get(room.kind) ?? 0;
    if (count >= 6) continue;
    used.set(room.kind, count + 1);
    // The pacer walks a side lane clear of furniture; the rest stand further out.
    // The centre line from door to door stays open for the drone.
    let lane = laneOf.get(room.kind);
    if (lane === undefined) {
      const span = Array.from({ length: 16 }, (_, step) => room.x0 + 2.5 + (step / 15) * (room.x1 - room.x0 - 6));
      lane = [-3.2, 3.2, -2.2].find((candidate) => span.every((x) => isWalkable(deck, x, candidate, 0.6))) ?? 0;
      laneOf.set(room.kind, lane);
    }
    const walking = count === 0;
    const spread = (room.x1 - room.x0 - 5) / 5;
    const x = room.x0 + 2.5 + spread * count;
    const awayFromLane = lane > 0 ? -1 : 1;
    const z = walking ? lane : [awayFromLane * 4.4, awayFromLane * 6.2, -awayFromLane * 6.2, -awayFromLane * 4.4].find((candidate) => isWalkable(deck, x, candidate, 0.6));
    if (z === undefined) continue;
    const person = blockyPerson(member.id, member.role);
    person.group.position.set(x, deck.floorY, z);
    scene.add(person.group);
    crowd.push({ person, deck: deckNumber });
    label(person.group, `${member.name} · ${member.role === "security" ? "Soldier" : member.role.charAt(0).toUpperCase() + member.role.slice(1)}`);
    const from = room.x0 + 2.5;
    const to = room.x1 - 3.5;
    const pace = 0.7 + (member.id.length % 3) * 0.12;
    const offset = member.id.length;
    animated.push((time, drone) => {
      if (walking) {
        const span = to - from;
        const t = ((time / 1000) * pace) / span + offset;
        const forward = t % 2 < 1;
        const amount = forward ? t % 1 : 1 - (t % 1);
        person.group.position.x = from + span * amount;
        face(person.group, forward ? 1 : -1, 0);
        stride(person, time * 0.009 * pace, 0.55);
        return;
      }
      // Standing crew turn to watch the drone when it comes close, otherwise face the room.
      const dx = drone.x - person.group.position.x;
      const dz = drone.z - person.group.position.z;
      if (drone.deck === deckNumber && Math.hypot(dx, dz) < 6) face(person.group, dx, dz);
      else face(person.group, 0, -Math.sign(z));
    });
  }

  const obstacles = (): Obstacle[] => [
    ...crowd.map(({ person, deck }) => ({ deck, x: person.group.position.x, z: person.group.position.z, radius: PERSON_RADIUS })),
    ...dynamicObstacles.map((obstacle) => obstacle()).filter((obstacle): obstacle is Obstacle => obstacle !== null),
  ];

  return { interactables, animated, notices, heartGroup, heartTarget, heartLight, gimbals, obstacles, stage };
}

export default function ArkWalk(props: ArkWalkProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const roomRef = useRef<HTMLElement>(null);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const mount = mountRef.current;
    const root = rootRef.current;
    if (!mount || !root) return;
    const initial = propsRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const layout = buildWalkLayout(initial.rooms.map((room) => ({ kind: room.kind, label: room.label, online: room.online })));
    for (const deck of layout.decks) {
      for (const room of deck.compartments) if (room.kind === "chamber") room.label = initial.heart.name;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      if (promptRef.current) promptRef.current.textContent = "This device cannot draw the drone view (WebGL is unavailable).";
      return;
    }
    renderer.setPixelRatio(1);
    renderer.domElement.className = "ark-walk-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const space = new THREE.Color(PALETTE.space).lerp(new THREE.Color(initial.worldAccent || "#6a6290"), 0.04);
    scene.background = space;
    scene.fog = new THREE.Fog(space, 18, 70);
    scene.add(new THREE.AmbientLight("#8a84b8", 0.85));
    scene.add(new THREE.HemisphereLight(tinted("#c9b6ff", initial.worldAccent || "#c9b6ff", 0.3), "#3a2a1a", 0.6));

    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 1000);
    const ship = buildShip(scene, layout, initial, () => propsRef.current);
    const heart = layout.heart;
    const lookup = new Map(ship.interactables.map((item) => [item.object, item]));

    const resize = () => {
      const width = Math.max(1, Math.floor(mount.clientWidth / PIXEL_SCALE));
      const height = Math.max(1, Math.floor(mount.clientHeight / PIXEL_SCALE));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let deckIndex = layout.spawn.deck;
    let x = layout.spawn.x;
    let z = layout.spawn.z;
    let yaw = layout.spawn.yaw;
    let pitch = 0;
    let eyeY = layout.decks[deckIndex].floorY + EYE_HEIGHT;
    let travel: { to: number; fromY: number; start: number } | null = null;
    let standingLift = false;
    const keys = new Set<string>();
    let target: Interactable | null = null;
    let lastPrompt = "";
    let lastRoom = "";
    let strikeFlash = 0;

    const locked = () => document.pointerLockElement === renderer.domElement;
    const setPrompt = (text: string) => {
      if (text === lastPrompt || !promptRef.current) return;
      lastPrompt = text;
      promptRef.current.textContent = text;
    };
    const activate = () => {
      if (travel) return;
      if (standingLift) {
        // Ride the grav-lift to the other deck.
        unlockPulseAudio();
        playBulkhead();
        travel = { to: deckIndex === 0 ? 1 : 0, fromY: eyeY, start: performance.now() };
        return;
      }
      if (!target) return;
      if (target.kind === "heart") {
        unlockPulseAudio();
        playPulseStrike("in-phase", 0.5);
        strikeFlash = 1;
        propsRef.current.onStrike?.();
      } else if (target.kind === "console" && target.room?.interactive) {
        const room = target.room;
        propsRef.current.onClose();
        room.onActivate();
      }
    };

    const onClick = () => {
      unlockPulseAudio();
      if (!locked()) {
        // Some browsers refuse to lock the mouse; dragging still looks around (see onMouseMove).
        Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {});
        return;
      }
      if (target?.kind === "heart" && !standingLift) activate();
    };
    const onPointerLockChange = () => root.classList.toggle("is-piloting", locked());
    const onMouseMove = (event: MouseEvent) => {
      // Look with the locked mouse, or by dragging with the left button held.
      if (!locked() && !(event.buttons & 1 && event.target === renderer.domElement)) return;
      yaw -= event.movementX * 0.0024;
      pitch = Math.max(-1.25, Math.min(1.25, pitch - event.movementY * 0.0024));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "q" || (key === "escape" && !locked())) {
        event.preventDefault();
        propsRef.current.onClose();
        return;
      }
      if (key === "e") {
        if (event.repeat) return; // one strike per press, not an autoclicker
        activate();
        return;
      }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", " "].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();

    renderer.domElement.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const raycaster = new THREE.Raycaster();
    raycaster.far = 14;
    const center = new THREE.Vector2(0, 0);
    const consolePosition = new THREE.Vector3();
    const period = Math.max(600, initial.beatPeriodMs);
    let lastBeat = -1;
    let previous = performance.now();
    let frame = 0;
    /** The interactable a hit belongs to: the object itself or the nearest ancestor that is one. */
    const resolve = (object: THREE.Object3D | null) => {
      for (let current = object; current; current = current.parent) {
        const item = lookup.get(current);
        if (item) return item;
      }
      return null;
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const deck = layout.decks[deckIndex];

      if (travel) {
        // Carried up or down the lift column; no steering until it arrives.
        const progress = Math.min(1, (now - travel.start) / (LIFT_SECONDS * 1000));
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
        const toY = layout.decks[travel.to].floorY + EYE_HEIGHT;
        eyeY = travel.fromY + (toY - travel.fromY) * eased;
        if (progress >= 1) {
          deckIndex = travel.to;
          travel = null;
        }
      } else {
        // Movement relative to where the drone faces, sliding along walls.
        let forward = 0;
        let strafe = 0;
        if (keys.has("w") || keys.has("arrowup")) forward += 1;
        if (keys.has("s") || keys.has("arrowdown")) forward -= 1;
        if (keys.has("d") || keys.has("arrowright")) strafe += 1;
        if (keys.has("a") || keys.has("arrowleft")) strafe -= 1;
        if (forward || strafe) {
          const length = Math.hypot(forward, strafe);
          const speed = (keys.has("shift") ? SPRINT : SPEED) * dt;
          const fx = Math.cos(yaw);
          const fz = -Math.sin(yaw);
          const dx = ((forward * fx) + (strafe * -fz)) / length * speed;
          const dz = ((forward * fz) + (strafe * fx)) / length * speed;
          // People, a docked ship and a shut blast door are solid too: refuse any step into one.
          const nearby = ship.obstacles().filter((obstacle) => obstacle.deck === deckIndex);
          const clear = (next: { x: number; z: number }) => nearby.every((obstacle) => {
            if ("box" in obstacle) {
              const inside = (px: number, pz: number) =>
                px > obstacle.box.x0 - DRONE_RADIUS && px < obstacle.box.x1 + DRONE_RADIUS &&
                pz > obstacle.box.z0 - DRONE_RADIUS && pz < obstacle.box.z1 + DRONE_RADIUS;
              return !inside(next.x, next.z) || inside(x, z);
            }
            const after = Math.hypot(next.x - obstacle.x, next.z - obstacle.z);
            return after >= obstacle.radius || after >= Math.hypot(x - obstacle.x, z - obstacle.z);
          });
          const step = [
            moveWithin(deck, x, z, dx, dz, DRONE_RADIUS),
            moveWithin(deck, x, z, dx, 0, DRONE_RADIUS),
            moveWithin(deck, x, z, 0, dz, DRONE_RADIUS),
          ].find(clear);
          if (step) ({ x, z } = step);
        }
        eyeY = deck.floorY + EYE_HEIGHT;
      }
      const hover = reducedMotion ? 0 : Math.sin(now * 0.002) * 0.03;
      camera.position.set(x, eyeY + hover, z);
      camera.rotation.set(pitch, yaw - Math.PI / 2, 0, "YXZ");

      // The Law-Heart beats; close enough and AXIOM hears it. Its gimbals flare on each beat.
      const sincePeriod = now % period;
      const beatIndex = Math.floor(now / period);
      if (beatIndex !== lastBeat) {
        lastBeat = beatIndex;
        if (Math.hypot(x - heart.x, eyeY - heart.y, z - heart.z) < 14) schedulePulseBeat(now, 0.3);
      }
      const lub = Math.exp(-sincePeriod / 110);
      const dub = sincePeriod > 170 ? 0.45 * Math.exp(-(sincePeriod - 170) / 90) : 0;
      strikeFlash = Math.max(0, strikeFlash - dt * 3);
      const throb = reducedMotion ? 0 : lub + dub;
      ship.heartGroup.scale.setScalar(1 + throb * 0.08 + strikeFlash * 0.15);
      ship.heartGroup.rotation.y += dt * 0.2;
      for (const ring of ship.gimbals) {
        (ring.material as THREE.MeshLambertMaterial).emissiveIntensity = (ship.stage === 0 ? 0.1 : 0.25) + throb * 0.9 + strikeFlash;
      }
      ship.heartLight.intensity = (ship.stage === 0 ? 2 : 14) + throb * 6 + strikeFlash * 8;
      const drone = { x, z, deck: deckIndex, dt };
      for (const update of ship.animated) update(now, drone);

      // What is the drone looking at?
      // The first thing on the line of sight wins, so walls hide what is behind them.
      raycaster.setFromCamera(center, camera);
      const hit = raycaster.intersectObjects(scene.children, true)[0];
      target = null;
      const item = hit ? resolve(hit.object) : null;
      if (item && hit) {
        const reach = item.kind === "heart" ? 14 : item.kind === "console" ? 4.5 : 10;
        if (hit.distance <= reach) target = item;
      }
      const facingTowards = (toX: number, toZ: number) =>
        (toX * Math.cos(yaw) - toZ * Math.sin(yaw)) / Math.max(Math.hypot(toX, toZ), 0.001);
      if (!target) {
        // Desks sit below eye level: standing close and facing one is enough to use it.
        let nearest = 3.4;
        for (const candidate of ship.interactables) {
          if (candidate.kind !== "console" || candidate.deck !== deckIndex) continue;
          candidate.object.getWorldPosition(consolePosition);
          const distance = Math.hypot(consolePosition.x - x, consolePosition.z - z);
          if (distance < nearest && facingTowards(consolePosition.x - x, consolePosition.z - z) > 0.8) {
            nearest = distance;
            target = candidate;
          }
        }
      }
      if (!target && facingTowards(heart.x - x, heart.z - z) > 0.9 && Math.hypot(heart.x - x, heart.y - eyeY, heart.z - z) <= 11) {
        // Looking in at the star through the core's glass is enough to strike it.
        target = ship.heartTarget;
      }
      standingLift = !travel && liftAt(layout, x, z) !== null;
      const notice = ship.notices.map((read) => read()).find((text) => text) ?? null;
      if (travel) setPrompt("");
      else if (standingLift) setPrompt(deckIndex === 0 ? `E · sink to the ${layout.decks[1].label.toLowerCase()}` : `E · rise to the ${layout.decks[0].label.toLowerCase()}`);
      else if (notice) setPrompt(notice);
      else if (!target) setPrompt("");
      else if (target.kind === "heart") setPrompt(`E · strike ${propsRef.current.heart.name}`);
      else if (target.kind === "label") setPrompt(target.label);
      else if (target.prompt) setPrompt(target.prompt());
      else if (!target.online) setPrompt(`${target.label} is dormant`);
      else if (target.room?.interactive) setPrompt(`E · open ${target.label}`);
      else setPrompt(target.label);

      const roomLabel = travel ? "Grav-lift" : `${deck.label} · ${compartmentAt(deck, x)?.label ?? "Bulkhead"}`;
      if (roomLabel !== lastRoom && roomRef.current) {
        lastRoom = roomLabel;
        roomRef.current.textContent = roomLabel;
      }

      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) {
          (material as THREE.MeshBasicMaterial).map?.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={rootRef} className="ark-walk" role="dialog" aria-modal="true" aria-label="Walk the Ark: maintenance drone view">
      <div ref={mountRef} className="ark-walk-viewport" />
      <div className="ark-walk-hud">
        <div className="ark-walk-status">
          <span className="ark-walk-eye" aria-hidden="true"><AxiomEye /></span>
          <div>
            <strong>Maintenance drone 03</strong>
            <small ref={roomRef}>Upper deck · Fabrication</small>
          </div>
        </div>
        <button type="button" className="ark-walk-exit" onClick={() => props.onClose()}>Return to console · Q</button>
        <span className="ark-walk-crosshair" aria-hidden="true" />
        <p ref={promptRef} className="ark-walk-prompt" aria-live="polite" />
        <p className="ark-walk-intro">
          Click to take the drone · WASD to move · mouse to look · E to use and ride lifts · Shift to hurry · Q to return
        </p>
      </div>
    </div>
  );
}
