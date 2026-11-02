"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { ArkCutawayRoomKind } from "./ark-cutaway";
import { drawPixelWorldSurface, PIXEL_WORLD_DAY_SECONDS } from "./ark-pixel-world";
import {
  buildWalkLayout,
  compartmentAt,
  DOCK_BOARD,
  dockMoment,
  DOOR_HALF_WIDTH,
  DOOR_HEIGHT,
  INNER_WALL,
  LIFT_RADIUS,
  liftAt,
  moveWithin,
  SIDE_DOOR_HEIGHT,
  sideRoomAt,
  towardWalls,
  UPPER_FLOOR,
  wallPieces,
  WINDOW_HIGH,
  WINDOW_LOW,
  WINDOW_WIDTH,
  WINDOWS,
  type Box,
  type DockMoment,
  type DockScene,
  type Rect,
  type SideRoom,
  type WalkCompartment,
  type WalkDeck,
  type WalkLayout,
  type WalkRoomKind,
} from "./ark-walk-layout";
import {
  paintBanner,
  paintChart,
  paintDrawing,
  paintMat,
  paintMural,
  paintPainting,
  paintPortraits,
  paintPoster,
  paintRug,
  type CrewFace,
} from "./ark-walk-art";
import { createSoundscape, type BaySound, type Soundscape, type SoundPlace } from "./ark-walk-audio";
import { demoCrew, LYING, planCrew, SEATED, type Activity, type WalkCrewMember } from "./ark-walk-crew";
import { furnishLayout, planDecor, type DecorPiece, type WallSpot } from "./ark-walk-decor";
import { createNullFeed, misreadLabel, type NullClass, type NullFeed } from "./ark-walk-null";
import { AxiomEye } from "./axiom-eye";
import { CIVILIAN_COLOR, CREW_ROLE_COLORS, getCrewHead } from "./crew-portrait";
import { playBulkhead, playNullStatic, playPulseStrike, schedulePulseBeat, unlockPulseAudio } from "./law-heart-audio";
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
  /** What each member of the team was issued from the Armory. */
  gear?: readonly { crewId: string; weapon: ArkWalkGear | null; armor: ArkWalkGear | null }[];
};

/** A piece of gear: which of the three of its kind (1 to 3), and its Mark (1 to 4). */
export type ArkWalkGear = { tier: number; mark: number };

/** The Armory's stock and work, for the drone view's Armory and the soldiers' kit. */
export type ArkWalkArmory = {
  unlocked: boolean;
  items: readonly { id: string; kind: "weapon" | "armor"; tier: number; name: string; mark: number; ready: number; damaged: number }[];
  project: { name: string; targetMark: number; progress: number } | null;
  onOpen?: () => void;
};

export type ArkWalkProps = {
  worldName: string;
  worldAccent: string;
  rooms: readonly ArkWalkRoom[];
  crew: readonly WalkCrewMember[];
  heart: ArkWalkHeart;
  recon?: ArkWalkRecon;
  /** The world's Null saturation, as the console shows it: it reaches the drone's feed too. */
  nullInterference?: { classification: NullClass; intensity: number };
  armory?: ArkWalkArmory;
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
/** A team returning or launching within this many game seconds is shown leaving. */
const FRESH_LAUNCH_SECONDS = 120;

const PALETTE = {
  space: "#07081a",
  floor: "#6e5d4c",
  wall: "#8d879b",
  wallSeam: "#6c667c",
  wallLight: "#aaa4b8",
  skirting: "#3a3548",
  ceiling: "#5e5970",
  hull: "#7a7390",
  metal: "#5a546e",
  metalLight: "#a49bba",
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

/** The drone's feed: the picture, with the Null's interference drawn over it pixel by pixel. */
const FEED_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const FEED_FRAGMENT = `
  uniform sampler2D frame;
  uniform vec2 resolution;
  uniform float time;
  uniform float seed;
  uniform float ambient;
  uniform float tear;
  uniform float split;
  uniform float snow;
  uniform float drop;
  varying vec2 vUv;
  float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 pixel = floor(vUv * resolution);
    // Tears: bands of rows slide sideways by whole pixels.
    float bandHeight = 2.0 + floor(noise(vec2(seed, 3.1)) * 7.0);
    float band = floor(pixel.y / bandHeight);
    float moved = step(1.0 - tear * 0.55, noise(vec2(band, seed)));
    float shift = moved * floor((noise(vec2(band, seed + 7.0)) - 0.5) * tear * 0.3 * resolution.x);
    // Now and then a single row slips a pixel or two, even between bursts.
    float slip = step(0.996, noise(vec2(pixel.y, floor(time * 12.0)))) * step(0.01, ambient);
    vec2 uv = (pixel + vec2(shift + slip * 2.0, 0.0) + 0.5) / resolution;
    float apart = floor(split * 5.0 + ambient * 0.6) / resolution.x;
    vec3 color = vec3(texture2D(frame, uv + vec2(apart, 0.0)).r, texture2D(frame, uv).g, texture2D(frame, uv - vec2(apart, 0.0)).b);
    // A slow bright bar rolling down the feed, and scanlines.
    float roll = 1.0 - fract(time * 0.06);
    color += (1.0 - smoothstep(0.0, 0.05, abs(vUv.y - roll))) * ambient * 0.08;
    color *= 1.0 - ambient * 0.14 * mod(pixel.y, 2.0);
    // Static: a few grains always, a snowfall in a burst.
    float tick = floor(time * 24.0);
    float speck = step(1.0 - (ambient * 0.012 + snow * 0.45), noise(pixel + vec2(tick * 1.37, seed)));
    color = mix(color, vec3(noise(pixel * 1.7 + tick)) * 0.8, speck);
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(grey), ambient * 0.22 + snow * 0.35);
    // Signal lost: black, but for a little static still getting through.
    color *= 1.0 - drop;
    color += step(1.0 - drop * 0.12, noise(pixel * 0.7 + vec2(tick, 3.0))) * 0.06;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/** The deck lamps: a warm white, not the amber of the trim lights. */
const LAMP = "#ffeccc";

/** The rooms behind the halls: each cabin painted by the people who live in it, the galley warm, the Armory red. */
const SIDE_COLOR: Record<string, string> = {
  "cabin-0": "#e2786a",
  "cabin-1": "#7d8cf0",
  "cabin-2": "#7cc35a",
  galley: "#f2a03a",
  armory: "#d8503e",
  briefing: "#ee7a3c",
  stores: "#c8955a",
  workshop: "#e07a3a",
  lab: "#9a7df0",
  library: "#b07c4f",
  classroom: "#f2c744",
  playroom: "#f08ab0",
  farm: "#7cc35a",
  infirmary: "#8ab4f0",
};
/** Floors the rooms behind the halls share with a hall; the cabins, the library and the playroom are carpeted. */
const SIDE_FLOOR: Record<string, string> = {
  stores: "hangar",
  workshop: "fabrication",
  lab: "research",
  classroom: "education",
  farm: "support",
  infirmary: "support",
  briefing: "bridge",
};

/** Each compartment's own colour: the bands painted round its walls, its door signs, its lit skirting. */
const ROOM_COLOR: Record<WalkRoomKind, string> = {
  fabrication: "#e8963a",
  habitation: "#e2786a",
  research: "#7d8cf0",
  bridge: "#a27ef0",
  support: "#7cc35a",
  education: "#f2c744",
  hangar: "#ee7a3c",
  chamber: "#d9b65e",
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
    for (const [start, width, alpha] of [[4, 2, 0.07], [9, 1, 0.045], [22, 1, 0.04]] as const) {
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
function voxelHead(id: string, role: string, ageGroup?: string | null) {
  const head = getCrewHead({ id, role, ageGroup });
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

type Person = { group: THREE.Group; limbs: THREE.Object3D[]; head: THREE.Object3D; hip: number };

/** A person as a blocky figure in their job's uniform, with a head shaped like their portrait. */
function blockyPerson(id: string, role: string, ageGroup?: string | null): Person {
  const { mesh: headMesh, head } = voxelHead(id, role, ageGroup);
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
  // The head sits on a pivot at the neck so it can nod and turn.
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.52;
  headPivot.add(headMesh);
  group.add(torso, collar, badge, belt, neck, headPivot);
  if (head.longHair) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.06), solid(head.hair));
    tail.position.set(0, -0.02, -0.22);
    headPivot.add(tail);
  }
  // Children are small; elders stoop a little.
  const scale = ageGroup === "child" ? 0.6 : 0.94;
  group.scale.setScalar(scale);
  if (ageGroup === "elder") {
    torso.rotation.x = 0.12;
    headPivot.position.z = 0.06;
  }
  return { group, limbs: [...arms, ...legs], head: headPivot, hip: 0.82 * scale };
}

/** Swing arms and legs in a walk; amount 0 stands still. */
function stride(person: Person, phase: number, amount: number) {
  const swing = Math.sin(phase) * amount;
  person.limbs[0].rotation.x = swing;
  person.limbs[1].rotation.x = -swing;
  person.limbs[2].rotation.x = -swing;
  person.limbs[3].rotation.x = swing;
}

/** A piece of Armory gear as the drone sees it: which of the three of its kind, and its Mark. */
type GearPiece = { tier: number; mark: number };
/** Trim by Mark: none at I, then white, gold, and the pale sheen of impossible materials. */
const MARK_TRIM: readonly (string | null)[] = [null, null, "#e9e4da", "#d9b65e", "#f0e6ff"];
const ROMAN = ["", "I", "II", "III", "IV"];

function gearMaterial(color: string, glowing = false) {
  return glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/** A weapon, standing upright: its long axis is y, its business end up. */
function weaponModel(gear: GearPiece) {
  const group = new THREE.Group();
  const part = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, glowing = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gearMaterial(color, glowing));
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const trim = MARK_TRIM[gear.mark] ?? null;
  if (gear.tier <= 1) {
    // Kinetic Pike: a collapsible impulse staff.
    part(0.05, 1.5, 0.05, "#6a6f80", 0, 0, 0);
    part(0.07, 0.3, 0.07, "#2b2433", 0, -0.2, 0);
    part(0.12, 0.22, 0.12, "#ffb347", 0, 0.82, 0, true);
    if (trim) part(0.07, 0.05, 0.07, trim, 0, 0.66, 0);
  } else if (gear.tier === 2) {
    // Arc Carbine: a directed-discharge rifle with its coils lit.
    part(0.1, 0.62, 0.14, "#3a3f4e", 0, 0, 0);
    part(0.05, 0.3, 0.05, "#5a546e", 0, 0.45, 0);
    for (const y of [0.12, 0.22, 0.32]) part(0.13, 0.04, 0.16, "#9ac4ff", 0, y, 0, true);
    part(0.08, 0.16, 0.1, "#2b2433", 0, -0.12, 0.1);
    part(0.09, 0.2, 0.12, "#3a3f4e", 0, -0.36, 0);
    if (trim) part(0.11, 0.04, 0.15, trim, 0, -0.05, 0);
  } else {
    // Null Lance: a black blade with an edge of enforced absence.
    part(0.07, 1.6, 0.07, "#120f1c", 0, 0, 0);
    part(0.02, 1.2, 0.09, "#b48cff", 0.04, 0.15, 0, true);
    part(0.2, 0.05, 0.12, "#3b3552", 0, -0.3, 0);
    if (trim) part(0.08, 0.05, 0.08, trim, 0, -0.5, 0);
  }
  return group;
}

/**
 * Dress a person in Armory gear: armour on their body and limbs, a weapon slung on
 * their back or, on the range, held levelled in their hands. The face stays visible
 * except under the Aegis Frame's sealed helmet.
 */
function gearUp(person: Person, armor: GearPiece | null, weapon: GearPiece | null, held = false) {
  const [leftArm, rightArm, leftLeg, rightLeg] = person.limbs;
  const add = (parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  if (armor?.tier === 1) {
    // Composite Weave: a padded mesh vest, shoulder and knee pads.
    const weave = gearMaterial("#56604f");
    const quilt = gearMaterial("#434c3e");
    add(person.group, 0.6, 0.5, 0.36, weave, 0, 1.17, 0);
    for (const y of [1.05, 1.17, 1.29]) add(person.group, 0.61, 0.025, 0.37, quilt, 0, y, 0);
    for (const arm of [leftArm, rightArm]) add(arm, 0.2, 0.12, 0.24, weave, 0, -0.04, 0);
    for (const leg of [leftLeg, rightLeg]) add(leg, 0.22, 0.12, 0.06, quilt, 0, -0.42, 0.13);
  } else if (armor?.tier === 2) {
    // Reactive Shell: segmented plate, pauldrons, shin guards, an open-faced helmet.
    const plate = gearMaterial("#8d94a8");
    const seam = gearMaterial("#3a3f4e");
    add(person.group, 0.58, 0.54, 0.34, seam, 0, 1.15, 0);
    [1.33, 1.15, 0.97].forEach((y, index) => add(person.group, 0.62 - index * 0.03, 0.16, 0.38, plate, 0, y, 0));
    for (const arm of [leftArm, rightArm]) add(arm, 0.26, 0.16, 0.3, plate, 0, 0, 0);
    for (const leg of [leftLeg, rightLeg]) add(leg, 0.22, 0.3, 0.08, plate, 0, -0.5, 0.13);
    add(person.head, 0.52, 0.14, 0.5, plate, 0, 0.47, 0);
    for (const side of [-1, 1]) add(person.head, 0.06, 0.34, 0.46, plate, side * 0.25, 0.3, 0);
    add(person.head, 0.5, 0.06, 0.06, seam, 0, 0.41, 0.24);
  } else if (armor?.tier === 3) {
    // Aegis Frame: a powered exoframe, Null-lit at its seams, with a sealed helmet.
    const frame = gearMaterial("#3b3552");
    const lit = gearMaterial("#b48cff", true);
    add(person.group, 0.7, 0.68, 0.44, frame, 0, 1.15, 0);
    for (const x of [-0.18, 0.18]) add(person.group, 0.03, 0.5, 0.01, lit, x, 1.15, 0.225);
    add(person.group, 0.46, 0.52, 0.22, frame, 0, 1.2, -0.32);
    add(person.group, 0.16, 0.16, 0.02, lit, 0, 1.25, -0.435);
    for (const arm of [leftArm, rightArm]) {
      add(arm, 0.26, 0.2, 0.3, frame, 0, 0, 0);
      add(arm, 0.2, 0.36, 0.24, frame, 0, -0.34, 0);
    }
    for (const leg of [leftLeg, rightLeg]) add(leg, 0.26, 0.6, 0.3, frame, 0, -0.42, 0.01);
    add(person.head, 0.54, 0.54, 0.54, frame, 0, 0.24, 0);
    add(person.head, 0.44, 0.08, 0.02, lit, 0, 0.26, 0.275);
  }
  const trim = armor ? MARK_TRIM[armor.mark] ?? null : null;
  if (armor && trim) add(person.group, 0.08, 0.48, 0.02, gearMaterial(trim), 0.16, 1.15, armor.tier === 3 ? 0.225 : 0.195);
  if (weapon) {
    const model = weaponModel(weapon);
    if (held) {
      // Levelled down the range: along the raised arm, past the hand.
      model.rotation.x = Math.PI;
      model.position.set(0, -0.62, 0.06);
      rightArm.add(model);
    } else {
      // Slung across the back.
      model.position.set(0, 1.12, -0.24);
      model.rotation.z = 0.75;
      person.group.add(model);
    }
  }
}

/** A plain dummy for an armour stand, shaped like the crew so the same gear fits it. */
function mannequin(): Person {
  const material = gearMaterial("#7a7490");
  const group = new THREE.Group();
  const limb = (x: number, y: number, length: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, length, 0.2), material);
    mesh.position.y = -length / 2;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  };
  const arms = [-0.36, 0.36].map((x) => limb(x, 1.42, 0.62));
  const legs = [-0.12, 0.12].map((x) => limb(x, 0.82, 0.8));
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.3), material);
  torso.position.y = 1.12;
  const head = new THREE.Group();
  head.position.y = 1.52;
  const dome = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.36), material);
  dome.position.y = 0.22;
  head.add(dome);
  group.add(torso, head);
  group.scale.setScalar(0.94);
  return { group, limbs: [...arms, ...legs], head, hip: 0.82 };
}

/** A stocked Armory for the QA sandbox: ?qa=1&armory=demo. */
function demoArmory(): ArkWalkArmory {
  const item = (id: string, kind: "weapon" | "armor", tier: number, name: string, mark: number, ready: number, damaged: number) =>
    ({ id, kind, tier, name, mark, ready, damaged });
  return {
    unlocked: true,
    items: [
      item("kinetic-pike", "weapon", 1, "Kinetic Pike", 2, 4, 1),
      item("arc-carbine", "weapon", 2, "Arc Carbine", 1, 3, 1),
      item("null-lance", "weapon", 3, "Null Lance", 1, 1, 0),
      item("composite-weave", "armor", 1, "Composite Weave", 3, 5, 0),
      item("reactive-shell", "armor", 2, "Reactive Shell", 2, 2, 1),
      item("aegis-frame", "armor", 3, "Aegis Frame", 1, 1, 0),
    ],
    project: { name: "Arc Carbine", targetMark: 2, progress: 0.64 },
  };
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

function buildShip(scene: THREE.Scene, layout: WalkLayout, props: ArkWalkProps, live: () => ArkWalkProps, decor: readonly DecorPiece[]) {
  const interactables: Interactable[] = [];
  const animated: Updater[] = [];
  const notices: (() => string | null)[] = [];
  const crowd: { person: Person; deck: number }[] = [];
  // Where the ship's sounds come from, and what the launch bay is doing, for ark-walk-audio.
  const soundPlaces: SoundPlace[] = [];
  const baySound: BaySound = { alarm: false, venting: false, engines: 0, ship: null };
  const dynamicObstacles: (() => Obstacle | null)[] = [];
  let hullOpen = 0;
  const roomsByKind = new Map(props.rooms.map((room) => [room.kind as string, room]));
  const accent = props.worldAccent || "#c9b6ff";
  const metal = tinted(PALETTE.metal, accent, 0.12);
  const metalLight = tinted(PALETTE.metalLight, accent, 0.16);
  const screenGlow = tinted(accent, "#ffffff", 0.2);
  const glass = tinted(accent, "#ffffff", 0.5);
  const liftGlow = tinted(accent, "#ffffff", 0.35);
  const spec = props.heart;
  const feeds = spec.machines.length > 0
    ? spec.machines.slice(0, 6)
    : Array.from({ length: 6 }, (_, tier) => ({ name: `Tier ${tier + 1} machine`, count: 0, color: PALETTE.dark }));

  const paintOf = (kind: string) => tinted(ROOM_COLOR[kind as WalkRoomKind] ?? SIDE_COLOR[kind] ?? PALETTE.metalLight, accent, 0.12);
  const floorTextures = new Map<string, THREE.CanvasTexture>();
  /** Each room's floor, four metres to a tile: deck plate, planks, tiles, carpet, lino, concrete. */
  const floorFor = (kind: string) => {
    const cached = floorTextures.get(kind);
    if (cached) return cached;
    const texture = canvasTexture(32, 32, (context) => {
      const px = (x: number, y: number, color: string, w = 1, h = 1) => {
        context.fillStyle = tinted(color, accent, 0.07);
        context.fillRect(x, y, w, h);
      };
      const tiles = (size: number, light: string, dark: string, grout: string) => {
        for (let y = 0; y < 32; y += size) {
          for (let x = 0; x < 32; x += size) {
            px(x, y, (x + y) % (size * 2) === 0 ? light : dark, size, size);
            px(x, y, grout, size, 1);
            px(x, y, grout, 1, size);
          }
        }
      };
      if (kind === "habitation") {
        // Warm planks, stern to bow, their joints staggered.
        for (let row = 0; row < 8; row += 1) {
          const y = row * 4;
          px(0, y, row % 2 === 0 ? "#b07c4f" : "#a07046", 32, 4);
          px(0, y + 3, "#7c5536", 32, 1);
          const joint = (row * 13) % 32;
          px(joint, y, "#7c5536", 1, 3);
          px((joint + 6) % 29, y + 1, "#c08e5e", 3, 1);
          px((joint + 18) % 28, y + 2, "#90613e", 4, 1);
        }
      } else if (kind === "research") {
        tiles(8, "#9da3c6", "#8d93b8", "#767ca2");
        for (const [x, y] of [[3, 3], [19, 11], [11, 27]]) px(x, y, "#c4c9e6", 2, 2);
      } else if (kind === "support") {
        // Clean pale tiles, with now and then a green one.
        tiles(8, "#b4c6a6", "#a5b896", "#8a9e7e");
        for (const [x, y] of [[8, 0], [24, 16]]) px(x + 1, y + 1, "#88b46a", 7, 7);
      } else if (kind === "education") {
        // Lino in a big check, flecked with colour.
        tiles(16, "#d4c088", "#c4ac76", "#ae9662");
        for (const [x, y, color] of [[4, 6, "#e2786a"], [22, 3, "#7d8cf0"], [12, 20, "#7cc35a"], [27, 25, "#e2786a"], [6, 28, "#a27ef0"], [19, 14, "#7d8cf0"]] as const) px(x, y, color);
      } else if (kind === "bridge") {
        // Carpet: a lattice of diamonds.
        px(0, 0, "#62529a", 32, 32);
        for (let y = 0; y < 32; y += 1) {
          for (let x = 0; x < 32; x += 1) {
            const d = Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8);
            if (d === 8) px(x, y, "#7c6bb8");
            else if (d === 2) px(x, y, "#8e7ec8");
          }
        }
      } else if (kind === "hangar") {
        // Poured deck, stained, in big panels.
        px(0, 0, "#8e8a86", 32, 32);
        px(0, 0, "#76726e", 32, 1);
        px(0, 0, "#76726e", 1, 32);
        px(0, 16, "#807c78", 32, 1);
        for (const [x, y, w] of [[5, 7, 4], [20, 22, 6], [13, 12, 2], [26, 4, 3]]) px(x, y, "#83807b", w, 2);
      } else if (kind === "chamber") {
        // The gallery: steel plates with brass studs at their corners.
        px(0, 0, "#77718a", 32, 32);
        for (let y = 0; y < 32; y += 16) {
          px(0, y, "#5e5972", 32, 1);
          px(y, 0, "#5e5972", 1, 32);
          for (const [x, z] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(y + x, z, "#c9a85a");
        }
        px(0, 8, "#857f98", 32, 1);
      } else if (kind === "galley") {
        // Kitchen tiles in a small check.
        tiles(4, "#d8d2c4", "#5e5870", "#9a94a8");
      } else if (kind === "armory") {
        // Ridged rubber matting.
        px(0, 0, "#4c4858", 32, 32);
        for (let y = 1; y < 32; y += 3) px(0, y, "#3e3a4a", 32, 1);
        px(0, 0, "#5e5970", 32, 1);
        px(0, 0, "#5e5970", 1, 32);
      } else if (kind.startsWith("cabin") || kind === "library" || kind === "playroom") {
        // Soft carpet in the room's own colour.
        const pile = tinted(SIDE_COLOR[kind] ?? "#e2786a", "#6a6070", 0.55);
        px(0, 0, pile, 32, 32);
        for (let y = 0; y < 32; y += 4) for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 32; x += 4) px(x, y, tinted(pile, "#ffffff", 0.14));
      } else {
        // Diamond deck plate.
        px(0, 0, "#86838f", 32, 32);
        for (let y = 0; y < 32; y += 4) {
          for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 32; x += 4) {
            px(x, y + 1, "#a19ead", 2, 1);
            px(x + 1, y + 2, "#6c6976");
          }
        }
        px(0, 0, "#62606c", 32, 1);
        px(0, 0, "#62606c", 1, 32);
      }
    });
    floorTextures.set(kind, texture);
    return texture;
  };
  const floorMaterial = (kind: string, w: number, d: number) => lambert("#ffffff", { map: repeated(floorFor(kind), w / 4, d / 4) });
  const wallTextures = new Map<string, THREE.CanvasTexture>();
  /**
   * A compartment's inner wall from the deck to its ceiling, two metres to a tile across:
   * light panels over a dark skirting, a band of the room's own colour at waist height
   * and a stripe of it up near the ceiling, so each room reads as its own place.
   */
  const wallFor = (kind: string, height: number) => {
    const cacheKey = `${kind}:${height}`;
    const cached = wallTextures.get(cacheKey);
    if (cached) return cached;
    const rows = Math.round(height * 8);
    const texture = canvasTexture(16, rows, (context) => {
      const paint = paintOf(kind);
      const at = (y: number) => rows - Math.round(y * 8);
      const band = (from: number, to: number, color: string) => {
        context.fillStyle = color;
        context.fillRect(0, at(to), 16, Math.max(1, at(from) - at(to)));
      };
      band(0, height, tinted(tinted(PALETTE.wall, paint, 0.16), accent, 0.06));
      const seam = tinted(PALETTE.wallSeam, accent, 0.1);
      const bevel = tinted(PALETTE.wallLight, accent, 0.12);
      context.fillStyle = seam;
      context.fillRect(0, 0, 1, rows);
      // The two-storey chamber is painted the same on each of its levels.
      const levels = kind === "chamber" ? [0, UPPER_FLOOR] : [0];
      const top = kind === "chamber" ? UPPER_FLOOR - 0.4 : height;
      for (const base of levels) {
        for (let y = base + 1.5; y < base + top - 0.8; y += 1.5) {
          band(y, y + 0.125, seam);
          context.fillStyle = bevel;
          context.fillRect(1, at(y), 15, 1);
          context.fillRect(3, at(y + 0.5), 1, 1);
          context.fillRect(12, at(y + 0.5), 1, 1);
        }
        band(base, base + 0.28, tinted(PALETTE.skirting, accent, 0.1));
        band(base + 0.28, base + 0.32, tinted(paint, PALETTE.skirting, 0.3));
        band(base + 0.55, base + 1.05, paint);
        band(base + 1.05, base + 1.15, tinted(paint, "#ffffff", 0.45));
      }
      band(height - 1.15, height - 0.95, paint);
      band(height - 0.35, height, tinted(PALETTE.metal, accent, 0.1));
    });
    wallTextures.set(cacheKey, texture);
    return texture;
  };
  /** One piece of a room's wall: w across, from y0 up h, cut from the room's painted wall. */
  const wallCut = (kind: string, height: number, w: number, y0: number, h: number, shift = 0) => {
    const texture = wallFor(kind, height).clone();
    texture.repeat.set(w / 2, h / height);
    texture.offset.set(shift, y0 / height);
    texture.needsUpdate = true;
    return lambert("#ffffff", { map: texture });
  };
  const ceilingTexture = canvasTexture(16, 16, (context) => {
    context.fillStyle = tinted(PALETTE.ceiling, accent, 0.08);
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = tinted("#4c475c", accent, 0.06);
    context.fillRect(0, 7, 16, 1);
    context.fillRect(7, 0, 1, 16);
    context.fillStyle = tinted("#6e6982", accent, 0.06);
    context.fillRect(0, 8, 16, 1);
    context.fillRect(8, 0, 1, 16);
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
  /** A bulkhead's materials: the room behind it (-x) and the room ahead (+x) each see their own paint. */
  const bulkheadFaces = (behind: WalkCompartment | null, ahead: WalkCompartment | null, across: number, y0: number, h: number) => {
    const face = (room: WalkCompartment | null) => (room ? wallCut(room.kind, room.height, across, y0, h) : bulkheadMaterial);
    return [face(ahead), face(behind), bulkheadMaterial, bulkheadMaterial, bulkheadMaterial, bulkheadMaterial];
  };
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
  // The world below: a real globe wrapped in the 2D globe's own surface, turning under a
  // fixed sun, with clouds drifting over it and its air glowing at the rim.
  const surfaceTexture = (paint: (context: CanvasRenderingContext2D) => void) => {
    const texture = canvasTexture(128, 64, paint);
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };
  let look = { shadow: PALETTE.dark, atmosphere: accent, distant: false };
  let cloudContext: CanvasRenderingContext2D | null = null;
  const cloudTexture = surfaceTexture((context) => { cloudContext = context; });
  const groundTexture = surfaceTexture((context) => {
    look = drawPixelWorldSurface(context, cloudContext!, props.worldName, 0.5);
  });
  cloudTexture.needsUpdate = true;
  const sun = new THREE.Vector3(-0.35, 0.7, -0.62).normalize();
  const globeShader = (map: THREE.Texture, clouds: boolean) => new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      sun: { value: sun },
      night: { value: new THREE.Color(look.shadow) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    // Light falls in four steps with an ordered dither between them, like the 2D globe.
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 sun;
      uniform vec3 night;
      varying vec2 vUv;
      varying vec3 vNormal;
      float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      void main() {
        vec4 texel = texture2D(map, vUv);
        ${clouds ? "if (texel.a < 0.5) discard;" : ""}
        float light = clamp(dot(normalize(vNormal), sun) * 1.25 + 0.2, 0.0, 1.0);
        float stepped = floor(light * 4.0 + bayer4(gl_FragCoord.xy)) / 4.0;
        vec3 color = mix(night, texel.rgb, clamp(0.06 + stepped * 0.94, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const planetRadius = look.distant ? 6 : 100;
  const planetOffset = look.distant ? new THREE.Vector3(260, -120, 260) : new THREE.Vector3(110, -95, 110);
  const planet = new THREE.Group();
  planet.position.copy(planetOffset);
  planet.rotation.z = 0.32;
  sky.add(planet);
  const ground = inert(new THREE.Mesh(new THREE.SphereGeometry(planetRadius, 48, 32), globeShader(groundTexture, false)));
  const cloudLayer = inert(new THREE.Mesh(new THREE.SphereGeometry(planetRadius * 1.012, 48, 32), globeShader(cloudTexture, true)));
  const air = inert(new THREE.Mesh(
    new THREE.SphereGeometry(planetRadius * 1.06, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { glow: { value: new THREE.Color(look.atmosphere) }, sun: { value: sun } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vWorldNormal;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-viewPosition.xyz);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glow;
        uniform vec3 sun;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vWorldNormal;
        void main() {
          float rim = pow(1.0 - clamp(dot(vNormal, vView), 0.0, 1.0), 3.5);
          float day = clamp(dot(vWorldNormal, sun) + 0.35, 0.0, 1.0);
          gl_FragColor = vec4(glow * rim * day * 0.9, 1.0);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ));
  planet.add(ground, cloudLayer, air);
  const planetWorld = planetOffset.clone().add(sky.position);
  animated.push((time) => {
    const turn = (time / 1000 / PIXEL_WORLD_DAY_SECONDS) * Math.PI * 2;
    ground.rotation.y = turn;
    cloudLayer.rotation.y = turn * 1.35;
  });

  /** A hull side: thick panels round its openings, the room's wall inside and the ship's skin out. */
  const hullSide = (room: WalkCompartment, y0: number, side: number, openings: Rect[], thick = HULL, tall = room.height) => {
    for (const piece of wallPieces(room.x0, room.x1, tall, openings)) {
      const w = piece.a1 - piece.a0;
      const h = piece.y1 - piece.y0;
      const inner = wallCut(room.kind, room.height, w, piece.y0, h, side < 0 ? piece.a0 / 2 : -piece.a1 / 2);
      const faces = side > 0
        ? [hullSkin, hullSkin, hullSkin, hullSkin, hullSkin, inner]
        : [hullSkin, hullSkin, hullSkin, hullSkin, inner, hullSkin];
      box(w, h, thick, faces, (piece.a0 + piece.a1) / 2, y0 + (piece.y0 + piece.y1) / 2, side * (half + thick / 2));
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
      box(width, 0.06, 0.06, glow(dark ? PALETTE.dark : tinted(paintOf(room.kind), PALETTE.dark, 0.2)), cx, y0 + 0.06, wallZ - side * 0.04);
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
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), floorMaterial(room.kind, width, half * 2));
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
          // Doors to the rooms behind the hall go through its port wall, which is thicker there.
          const sideDoors: Rect[] = side < 0
            ? deck.sideRooms.filter((sideRoom) => sideRoom.section === room.kind).map((sideRoom) => ({ a0: sideRoom.door.x0, a1: sideRoom.door.x1, y0: 0, y1: SIDE_DOOR_HEIGHT }))
            : [];
          const openings = [
            ...(dock && side === 1 ? [...windows, { a0: layout.dock.opening.x0, a1: layout.dock.opening.x1, y0: 0.4, y1: 5.2 }] : windows),
            ...sideDoors,
          ];
          // Downstairs the hull runs on up to the deck above, leaving no gap over the ceiling.
          hullSide(room, y0, side, openings, sideDoors.length > 0 ? INNER_WALL : HULL, upper ? room.height : Math.max(room.height, UPPER_FLOOR));
          for (const pane of windows) hullWindow(y0, pane, side);
          openingsBySide.set(side, openings);
        }
        if (dock) {
          // Keep the wall ribs and pipes clear of the recon board.
          const board = { a0: room.x0 + DOCK_BOARD.at - DOCK_BOARD.width / 2 - 0.4, a1: room.x0 + DOCK_BOARD.at + DOCK_BOARD.width / 2 + 0.4, y0: 1.6, y1: 3.6 };
          openingsBySide.set(-1, [...(openingsBySide.get(-1) ?? []), board]);
        }
        dress(room, y0, openingsBySide, dock ? [-1] : [-1, 1]);

        // Deck lights: strips down the ceiling and warm lamps, or an emergency glow when dormant.
        // The chamber's gallery and the dock light themselves.
        const lampCount = room.kind === "chamber" || dock ? 0 : Math.max(2, Math.round(width / 7));
        for (let lampIndex = 0; lampIndex < lampCount; lampIndex += 1) {
          const lx = room.x0 + (width * (lampIndex + 0.5)) / lampCount;
          if (!dark) {
            for (const row of [-0.55, 0, 0.55]) put(width / lampCount - 1.6, 0.06, 0.45, glow(PALETTE.light), lx, room.height - 0.05, row * half);
            const lamp = new THREE.PointLight(LAMP, 15, 34, 1);
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
        put(0.4, height, half * 2, bulkheadFaces(null, room, half * 2, 0, height), room.x0 - 0.2, height / 2, 0);
      }
      if (nextRoom) {
        const height = wallHeight(room, nextRoom);
        const wx = room.x1 + 0.2;
        const sideDepth = half - DOOR_HALF_WIDTH;
        put(0.4, height, sideDepth, bulkheadFaces(room, nextRoom, sideDepth, 0, height), wx, height / 2, -(DOOR_HALF_WIDTH + sideDepth / 2));
        put(0.4, height, sideDepth, bulkheadFaces(room, nextRoom, sideDepth, 0, height), wx, height / 2, DOOR_HALF_WIDTH + sideDepth / 2);
        put(0.4, height - DOOR_HEIGHT, DOOR_HALF_WIDTH * 2, bulkheadFaces(room, nextRoom, DOOR_HALF_WIDTH * 2, DOOR_HEIGHT, height - DOOR_HEIGHT), wx, DOOR_HEIGHT + (height - DOOR_HEIGHT) / 2, 0);
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
        put(0.44, 0.14, DOOR_HALF_WIDTH * 2 + 0.4, floorMaterial("fabrication", 0.5, DOOR_HALF_WIDTH * 2), wx, -0.07, 0);
        put(0.46, 0.02, DOOR_HALF_WIDTH * 2, lambert("#ffffff", { map: repeated(stripes, 0.4, DOOR_HALF_WIDTH * 4) }), wx, 0.005, 0);
        // A painted name over each side of the doorway.
        for (const facing of [-1, 1]) {
          const target = facing > 0 ? nextRoom : room;
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.26), new THREE.MeshBasicMaterial({ map: signTexture(target.label.toUpperCase(), tinted(paintOf(target.kind), "#ffffff", 0.3)) }));
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

      const hear = (kind: SoundPlace["kind"], x: number, y: number, z: number) =>
        soundPlaces.push({ kind, x, y: y0 + y, z, deck: deckIndex, online: !dark });
      if (room.kind === "fabrication") {
        hear("press", room.x0 + 3.5, 2, towardWalls(-5.1, half));
        hear("conveyor", room.x0 + 9, 0.8, towardWalls(5, half));
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
        fit(beltLength, 0.04, 1, solid(tinted(PALETTE.metal, PALETTE.floor, 0.35)), room.x0 + 5 + beltLength / 2, 0.72, 5);
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
            floorMaterial("chamber", x1 - x0, z1 - z0),
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
        hear("mess", room.x1 - 3.6, 1, towardWalls(3.4, half));
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
        hear("servers", room.x0 + 2.8, 1.2, towardWalls(6.25, half));
        // Two desks under wall screens, the door to the labs between them; the second screen is the console.
        for (const [from, to] of [[1, 6.4], [8.6, width - 1]]) fit(to - from, 1, 1.4, solid(metal), room.x0 + (from + to) / 2, 0.5, -6.15);
        const screenAt = [2.4, 5, 10, 12.6];
        const screens = screenAt.map((at) => fit(2.2, 1.2, 0.06, glow(screenColor), room.x0 + at, 2.4, -6.68));
        addConsole(screens[1]);
        for (const at of screenAt) fit(2.4, 1.4, 0.04, solid(PALETTE.dark), room.x0 + at, 2.4, -6.72);
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
        hear("helm", room.x1 - 2.6, 1, 0);
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
        hear("tanks", room.x0 + 7, 1.5, towardWalls(-5.4, half));
        hear("fan", room.x0 + 7, room.height - 0.3, 0);
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
      put(0.4, UPPER_FLOOR, half * 2, bulkheadFaces(last, null, half * 2, 0, UPPER_FLOOR), endX, UPPER_FLOOR / 2, 0);
      return;
    }
    const windowWidth = 12;
    const windowLow = 1;
    const windowHigh = 5.6;
    const sideDepth = (half * 2 - windowWidth) / 2;
    put(0.4, last.height, sideDepth, bulkheadFaces(last, null, sideDepth, 0, last.height), endX, last.height / 2, -(windowWidth / 2 + sideDepth / 2));
    put(0.4, last.height, sideDepth, bulkheadFaces(last, null, sideDepth, 0, last.height), endX, last.height / 2, windowWidth / 2 + sideDepth / 2);
    put(0.4, windowLow, windowWidth, bulkheadFaces(last, null, windowWidth, 0, windowLow), endX, windowLow / 2, 0);
    put(0.4, last.height - windowHigh, windowWidth, bulkheadFaces(last, null, windowWidth, windowHigh, last.height - windowHigh), endX, windowHigh + (last.height - windowHigh) / 2, 0);
    const bowGlass = inert(new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHigh - windowLow), glassMaterial));
    bowGlass.position.set(endX, y0 + (windowLow + windowHigh) / 2, 0);
    bowGlass.rotation.y = -Math.PI / 2;
    scene.add(bowGlass);
    for (const mullion of [-3, 0, 3]) put(0.2, windowHigh - windowLow, 0.12, trimMaterial, endX - 0.15, (windowLow + windowHigh) / 2, mullion);
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
    const levels: [number, number][] = [[0.9, 5.8], [UPPER_FLOOR + 0.9, UPPER_FLOOR + 5.4]];
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
    for (const side of [-1, 1]) coreWall(true, side * zWall, core.x0, core.x1, cx - 4.8, cx + 4.8);
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
        sign.position.set(cx + end * (core.x1 - cx + 0.02), (base === 0 ? levels[0][1] : levels[1][1]) + 0.45, 0);
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
    const board = new THREE.Mesh(new THREE.PlaneGeometry(DOCK_BOARD.width, 1.5), new THREE.MeshBasicMaterial({ map: boardTexture }));
    board.position.set(room.x0 + DOCK_BOARD.at, y0 + 2.6, -half + 0.12);
    scene.add(board);
    put(DOCK_BOARD.width + 0.3, 1.8, 0.1, trimMaterial, room.x0 + DOCK_BOARD.at, 2.6, -half + 0.03);

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
        const issued = live().recon?.gear?.find((entry) => entry.crewId === member.id);
        if (issued) gearUp(person, issued.armor, issued.weapon);
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
    const awayDistance = Math.max(40, planetWorld.distanceTo(doorwayOut) - planetRadius * 1.02);
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
      hullOpen = moment.hullDoors;
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
        flyer.group.position.copy(doorwayOut).addScaledVector(awayDirection, t * awayDistance);
      }
      flyer.group.rotation.set(ship.out > 0.3 ? 0.25 : 0, (Math.PI / 2) * (1 - ship.turn), 0);
      flyer.ramp.rotation.x = ship.lift === 0 && ship.out === 0 ? 0.42 : -1.4;
      for (const leg of flyer.legs) leg.visible = ship.lift < 0.4;
      const burn = ship.lift === 0 && ship.out === 0 ? 0.15 : 0.75 + hash(Math.floor(time / 60)) * 0.25;
      for (const engine of flyer.engines) engine.scale.setScalar(0.5 + burn * 0.8);
      baySound.alarm = moment.alarm;
      baySound.venting = moment.venting;
      const flying = flyer.group.visible && (ship.lift > 0 || ship.out > 0);
      baySound.engines = flying ? 0.45 + Math.min(1, ship.out * 2) * 0.55 : 0;
      baySound.ship = flying ? flyer.group.position : null;

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
      if (now?.away) return [`AWAY · BACK IN ${minutes(now.remaining).toUpperCase()}`, (now.site ?? "THE SURFACE").toUpperCase()];
      return ["IN ITS BAY", "READY FOR AN EXPEDITION"];
    };
    /** Write a line, shrinking the type until it fits the board. */
    const writeLine = (text: string, y: number, size: number, weight: string, color: string) => {
      let fontSize = size;
      do {
        boardContext.font = `${weight}${fontSize}px monospace`;
        fontSize -= 1;
      } while (boardContext.measureText(text).width > 148 && fontSize > 6);
      boardContext.fillStyle = color;
      boardContext.fillText(text, 6, y);
    };
    let lastBoard = "";
    animated.push(() => {
      const lines = status();
      const key = lines.join("|");
      if (key === lastBoard) return;
      lastBoard = key;
      boardContext.fillStyle = PALETTE.dark;
      boardContext.fillRect(0, 0, 160, 48);
      boardContext.textBaseline = "top";
      writeLine("RECON SHIP ONE", 5, 11, "bold ", PALETTE.amber);
      writeLine(lines[0], 19, 11, "bold ", PALETTE.light);
      writeLine(lines[1], 34, 9, "", screenGlow);
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
        const tap = machineGroup(heart.x + Math.cos(angle) * 4.6, 0, Math.sin(angle) * Math.min(5.4, innerZ - 0.9), text);
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
        const loom = machineGroup(heart.x + slot[0] * (innerX - 0.15), heart.y - 0.45, slot[1], text);
        for (const post of [-1.25, 1.25]) piece(loom, new THREE.BoxGeometry(0.14, 2, 0.14), solid(metalLight), 0, 0, post);
        for (const bar of [-1, 1]) piece(loom, new THREE.BoxGeometry(0.14, 0.14, 2.64), solid(metalLight), 0, bar, 0);
        const threads = Array.from({ length: 7 }, (_, thread) => piece(loom, new THREE.BoxGeometry(0.03, 1.86, 0.03), energy, 0, 0, -0.9 + thread * 0.3));
        if (lit) {
          feedBeam(new THREE.Vector3(loom.position.x - slot[0] * 0.2, heart.y - 0.45, slot[1]), machine.color, seed);
          animated.push((time) => {
            threads.forEach((thread, threadIndex) => { thread.position.x = Math.sin(time * 0.03 + threadIndex * 1.3 + unit) * 0.05; });
          });
        }
      } else if (tier === 3) {
        // Orbit Array: collectors riding a track round the star, under the ceiling.
        if (unit === 0) {
          const track = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.06, 4, 48), solid(metalLight));
          track.rotation.x = Math.PI / 2;
          track.position.set(heart.x, chamberHeight - 1.2, 0);
          scene.add(track);
          label(track, text);
        }
        if (!lit) continue;
        const collector = machineGroup(heart.x, chamberHeight - 1.2, 0, text);
        piece(collector, new THREE.BoxGeometry(0.4, 0.22, 0.4), solid(metal));
        for (const wing of [-1, 1]) piece(collector, new THREE.BoxGeometry(0.9, 0.03, 0.34), energy, wing * 0.62, 0, 0);
        const phase = (unit / shown) * Math.PI * 2;
        const place = (time: number) => phase + time * 0.00035;
        animated.push((time) => {
          const angle = place(time);
          collector.position.set(heart.x + Math.cos(angle) * 3.3, chamberHeight - 1.2, Math.sin(angle) * 3.3);
          collector.rotation.y = -angle;
        });
        emitters.push({ at: () => collector.position, color: new THREE.Color(machine.color), seed });
      } else if (tier === 4) {
        // Constraint Engine: a housing on the side wall turning a flywheel without rest.
        const slot = [[-1, -2.2], [1, 2.2], [-1, 2.2], [1, -2.2]][unit];
        const engine = machineGroup(heart.x + slot[1], heart.y - 0.45, slot[0] * (innerZ - 0.25), text);
        piece(engine, new THREE.BoxGeometry(1.4, 1.1, 0.5), solid(metal));
        const wheel = new THREE.Group();
        wheel.position.z = -slot[0] * 0.35;
        engine.add(wheel);
        piece(wheel, new THREE.TorusGeometry(0.42, 0.11, 6, 16), energy);
        for (const spoke of [0, Math.PI / 2]) piece(wheel, new THREE.BoxGeometry(0.84, 0.06, 0.06), solid(metalLight)).rotation.z = spoke;
        if (lit) {
          feedBeam(new THREE.Vector3(engine.position.x, heart.y - 0.45, engine.position.z - slot[0] * 0.4), machine.color, seed);
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
      radius: radius * 1.15 + hash(particle * 3.7) * (4.8 - radius * 1.15),
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
      drone.position.set(starAt.x + Math.cos(angle) * 4.4, 2.2 + ((droneIndex * 1.3) % 9) + Math.sin(time * 0.002 + droneIndex) * 0.2, starAt.z + Math.sin(angle) * Math.min(4.4, innerZ - 0.4));
      face(drone, -Math.sin(angle) * direction, Math.cos(angle) * direction);
      drone.visible = !program.compromised || Math.floor(time / 140 + droneIndex) % 5 !== 0;
    });
  });

  // ---- What the crew have put up: the more people aboard, the more of it there is (ark-walk-decor). ----
  const crewFaces: CrewFace[] = props.crew.map((member) => getCrewHead({ id: member.id, role: member.role, ageGroup: member.ageGroup }));
  const artTexture = (width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) => {
    const texture = canvasTexture(width, height, paint);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };
  const picture = (w: number, h: number, texture: THREE.Texture, cutout = false) =>
    new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: texture, alphaTest: cutout ? 0.5 : 0 }));
  const block = (w: number, h: number, d: number, material: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  const set = <T extends THREE.Object3D>(parent: THREE.Object3D, object: T, x: number, y: number, z: number) => {
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  /** A frame on a wall: x along it, y up from the art's centre, z out into the room. */
  const onWall = (spot: WallSpot, deckY: number) => {
    const group = new THREE.Group();
    if (spot.normal === "z") {
      group.position.set(spot.along, deckY + spot.y, spot.plane);
      group.rotation.y = spot.facing > 0 ? 0 : Math.PI;
    } else {
      group.position.set(spot.plane, deckY + spot.y, spot.along);
      group.rotation.y = spot.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    scene.add(group);
    return group;
  };
  const ART_DENSITY = 16;
  const pixels = (metres: number) => Math.max(4, Math.round(metres * ART_DENSITY));
  const WOOD = ["#7a4a2a", "#5a3a24", "#9a6a3e"] as const;
  const FABRIC = ["#c8605a", "#d8a03a", "#8a5a9a", "#5a8a4a", "#4f6ad0", "#e2786a"] as const;
  const FLOWERS = ["#f08ab0", "#f2c744", "#c87ae8", "#ffffff", "#ff8a5a", "#e8443a"] as const;
  const BUNTING = ["#e8443a", "#f2c744", "#4f7ad8", "#7cc35a", "#f08ab0", "#a27ef0", "#ee7a3c"] as const;
  const BULBS = ["#fff0c0", "#ffc870", "#ff9ac8", "#c8b0ff", "#fff0c0"] as const;
  const LEAVES = ["#5fae4e", "#4a9440", "#7cc35a", "#3f7f3a"] as const;
  for (const piece of decor) {
    const deckY = layout.decks[piece.deck].floorY;
    const seed = piece.seed;
    const pick = <T,>(list: readonly T[], salt = 0) => list[Math.floor(hash(seed * 1.31 + salt) * list.length)];
    if (piece.wall) {
      const spot = piece.wall;
      const wall = onWall(spot, deckY);
      const pairs = spot.width >= 2.3 ? [-0.62, 0.62] : [0];
      if (piece.kind === "painting") {
        const w = Math.min(spot.width, 2);
        const h = Math.min(spot.height, w * 0.66);
        set(wall, block(w + 0.1, h + 0.1, 0.06, solid(pick(WOOD))), 0, 0, 0.03);
        set(wall, picture(w, h, artTexture(pixels(w), pixels(h), (context) => paintPainting(context, pixels(w), pixels(h), seed, accent))), 0, 0, 0.065);
        label(wall, "A painting by one of the crew");
      } else if (piece.kind === "portraits") {
        const w = Math.min(spot.width, 2.2);
        const h = (w * 30) / 44;
        const start = Math.floor(hash(seed) * Math.max(1, crewFaces.length));
        const chosen = Array.from({ length: Math.min(6, crewFaces.length) }, (_, index) => (start + index) % crewFaces.length);
        set(wall, block(w + 0.1, h + 0.1, 0.05, solid(WOOD[1])), 0, 0, 0.025);
        set(wall, picture(w, h, artTexture(44, 30, (context) => paintPortraits(context, 44, 30, seed, chosen.map((index) => crewFaces[index])))), 0, 0, 0.055);
        const names = chosen.map((index) => props.crew[index].name);
        label(wall, names.length > 0 ? `Photos of the crew · ${names.slice(0, 3).join(", ")}${names.length > 3 ? " and others" : ""}` : "A board for the crew's photos");
      } else if (piece.kind === "poster") {
        pairs.forEach((along, index) => {
          const poster = set(wall, picture(0.9, 1.26, artTexture(40, 56, (context) => paintPoster(context, 40, 56, seed + index * 7, piece.room))), along, 0, 0.02);
          poster.rotation.z = (hash(seed + index) - 0.5) * 0.04;
        });
        label(wall, "A poster the crew put up");
      } else if (piece.kind === "drawings") {
        const spread = Math.min(1, spot.width / 2.1);
        [-0.72, 0, 0.72].forEach((along, index) => {
          const sheet = set(wall, picture(0.62, 0.5, artTexture(16, 13, (context) => paintDrawing(context, 16, 13, seed * 3 + index))), along * spread, (hash(seed + index * 2.1) - 0.5) * 0.3, 0.02 + index * 0.004);
          sheet.rotation.z = (hash(seed * 1.7 + index) - 0.5) * 0.32;
        });
        label(wall, "Drawings by the children aboard");
      } else if (piece.kind === "chart") {
        const w = Math.min(spot.width, 2);
        const h = Math.min(spot.height, w * 0.66);
        set(wall, block(w + 0.08, h + 0.08, 0.04, trimMaterial), 0, 0, 0.02);
        set(wall, picture(w, h, artTexture(pixels(w), pixels(h), (context) => paintChart(context, pixels(w), pixels(h), seed, accent))), 0, 0, 0.045);
        label(wall, "A star chart of the space round the Ark");
      } else if (piece.kind === "banner") {
        pairs.forEach((along, index) => {
          const color = index === 0 ? paintOf(piece.room) : pick(FABRIC, index);
          set(wall, block(0.86, 0.05, 0.05, trimMaterial), along, 0.92, 0.06);
          set(wall, picture(0.7, 1.8, artTexture(12, 30, (context) => paintBanner(context, 12, 30, seed + index * 5, color)), true), along, 0, 0.05);
        });
        label(wall, "A banner the crew made");
      } else if (piece.kind === "mural") {
        set(wall, picture(spot.width, spot.height, artTexture(pixels(spot.width), pixels(spot.height), (context) => paintMural(context, pixels(spot.width), pixels(spot.height), seed, accent, piece.room === "habitation" ? "meadow" : piece.room === "education" ? "hands" : "world"))), 0, 0, 0.015);
        label(wall, "A mural the crew painted together");
      }
    } else if (piece.floor) {
      const foot = piece.floor;
      const sideways = Math.abs(foot.facing.x) > 0.5;
      const across = sideways ? foot.z1 - foot.z0 : foot.x1 - foot.x0;
      const deep = sideways ? foot.x1 - foot.x0 : foot.z1 - foot.z0;
      const item = new THREE.Group();
      item.position.set((foot.x0 + foot.x1) / 2, deckY, (foot.z0 + foot.z1) / 2);
      item.rotation.y = Math.atan2(foot.facing.x, foot.facing.z);
      scene.add(item);
      const fabric = solid(pick(FABRIC));
      const wood = solid(pick(WOOD, 2));
      if (piece.kind === "plant") {
        const pot = solid(pick(["#b9643c", "#d8d2c4", "#4f6ad0", "#e2786a"] as const, 3));
        set(item, new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.44, 8), pot), 0, 0.22, 0);
        set(item, new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 8), solid("#4a3424")), 0, 0.43, 0);
        const variant = Math.floor(hash(seed * 2.9) * 3);
        const leafCount = variant === 1 ? 4 : 7;
        if (variant === 1) set(item, block(0.08, 1.1, 0.08, solid("#6a4a2a")), 0, 0.95, 0);
        for (let leaf = 0; leaf < leafCount; leaf += 1) {
          const angle = (leaf / leafCount) * Math.PI * 2 + hash(seed + leaf);
          const reach = variant === 2 ? 0.34 : 0.18;
          const height = variant === 1 ? 1.45 + hash(seed * 3 + leaf) * 0.35 : 0.6 + hash(seed * 3 + leaf) * 0.5;
          const size = variant === 1 ? 0.42 : variant === 2 ? 0.22 : 0.3;
          set(item, block(size, variant === 2 ? 0.12 : size, size, solid(LEAVES[leaf % LEAVES.length])), Math.cos(angle) * reach, height, Math.sin(angle) * reach);
          if (variant === 0 && leaf % 3 === 0) set(item, block(0.1, 0.1, 0.1, solid(pick(FLOWERS, leaf))), Math.cos(angle) * reach * 1.6, height + 0.12, Math.sin(angle) * reach * 1.6);
        }
        label(item, "A plant someone brought aboard");
      } else if (piece.kind === "rug" || piece.kind === "mat") {
        const w = Math.max(4, Math.round(across * 8));
        const h = Math.max(4, Math.round(deep * 8));
        const rug = set(item, new THREE.Mesh(
          new THREE.PlaneGeometry(across, deep),
          lambert("#ffffff", { map: artTexture(w, h, (context) => (piece.kind === "mat" ? paintMat(context, w, h) : paintRug(context, w, h, seed))) }),
        ), 0, 0.016 + (seed % 3) * 0.002, 0);
        rug.rotation.x = -Math.PI / 2;
        inert(rug);
      } else if (piece.kind === "sofa" || piece.kind === "armchair") {
        set(item, block(across, 0.4, deep, fabric), 0, 0.2, 0);
        const seats = Math.max(1, Math.round((across - 0.44) / 0.9));
        for (let seat = 0; seat < seats; seat += 1) {
          const width = (across - 0.44) / seats;
          set(item, block(width - 0.05, 0.14, deep - 0.32, solid(tinted(pick(FABRIC), "#ffffff", 0.12))), -across / 2 + 0.22 + width * (seat + 0.5), 0.47, 0.1);
        }
        set(item, block(across, 0.56, 0.24, fabric), 0, 0.68, -deep / 2 + 0.12);
        for (const end of [-1, 1]) set(item, block(0.22, 0.64, deep, fabric), end * (across / 2 - 0.11), 0.32, 0);
        if (piece.kind === "sofa") {
          for (const end of [-1, 1]) {
            const pillow = set(item, block(0.38, 0.34, 0.12, solid(pick(FLOWERS, end))), end * (across / 2 - 0.5), 0.68, -deep / 2 + 0.32);
            pillow.rotation.x = -0.25;
          }
        }
        label(item, piece.kind === "sofa" ? "A sofa the crew dragged in here" : "An armchair, worn at the arms");
      } else if (piece.kind === "table") {
        set(item, block(across, 0.07, deep, wood), 0, 0.42, 0);
        for (const lx of [-1, 1]) for (const lz of [-1, 1]) set(item, block(0.06, 0.4, 0.06, wood), lx * (across / 2 - 0.1), 0.2, lz * (deep / 2 - 0.1));
        set(item, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), solid("#e9e4da")), -across * 0.2, 0.51, 0.05);
        set(item, block(0.3, 0.05, 0.22, solid(pick(FABRIC, 4))), across * 0.18, 0.48, -0.05);
        label(item, "A low table, cups left on it");
      } else if (piece.kind === "planter") {
        set(item, block(across, 0.55, deep, wood), 0, 0.275, 0);
        set(item, block(across - 0.1, 0.04, deep - 0.1, solid("#4a3424")), 0, 0.57, 0);
        const columns = Math.max(1, Math.floor((across - 0.2) / 0.3));
        const rows = Math.max(1, Math.floor((deep - 0.2) / 0.3));
        for (let column = 0; column < columns; column += 1) {
          for (let row = 0; row < rows; row += 1) {
            const fx = -across / 2 + 0.1 + (across - 0.2) * ((column + 0.5) / columns);
            const fz = -deep / 2 + 0.1 + (deep - 0.2) * ((row + 0.5) / rows);
            const rise = 0.18 + hash(seed + column * 3.1 + row) * 0.22;
            set(item, block(0.04, rise, 0.04, solid(LEAVES[1])), fx, 0.59 + rise / 2, fz);
            set(item, block(0.13, 0.1, 0.13, solid(pick(FLOWERS, column * 7 + row))), fx, 0.62 + rise, fz);
          }
        }
        label(item, "Flowers someone is growing");
      } else if (piece.kind === "shelf") {
        const dark = solid(WOOD[1]);
        for (const end of [-1, 1]) set(item, block(0.05, 2, deep, dark), end * (across / 2 - 0.025), 1, 0);
        set(item, block(across, 2, 0.03, dark), 0, 1, -deep / 2 + 0.015);
        for (let shelf = 0; shelf < 5; shelf += 1) {
          const y = 0.04 + shelf * 0.48;
          set(item, block(across - 0.1, 0.04, deep, dark), 0, y, 0);
          if (shelf === 4) continue;
          let bx = -across / 2 + 0.1;
          for (let book = 0; bx < across / 2 - 0.15; book += 1) {
            const thick = 0.05 + hash(seed + shelf * 13 + book) * 0.07;
            const tall = 0.22 + hash(seed * 2 + shelf * 7 + book) * 0.14;
            set(item, block(thick, tall, deep - 0.08, solid(pick(FABRIC, shelf * 11 + book))), bx + thick / 2, y + 0.02 + tall / 2, 0.02);
            bx += thick + 0.01;
          }
        }
        label(item, "A shelf of books people have carried aboard");
      } else if (piece.kind === "bench") {
        set(item, block(across, 0.08, deep, wood), 0, 0.45, 0);
        for (const end of [-1, 1]) set(item, block(0.08, 0.42, deep - 0.1, solid(metal)), end * (across / 2 - 0.2), 0.21, 0);
        set(item, block(across - 0.3, 0.07, deep - 0.15, fabric), 0, 0.525, 0);
        label(item, "A bench, a cushion on it");
      } else if (piece.kind === "cushions") {
        for (let bag = 0; bag < 4; bag += 1) {
          const bx = (bag % 2 === 0 ? -1 : 1) * across * 0.25;
          const bz = (bag < 2 ? -1 : 1) * deep * 0.25;
          const cushion = set(item, block(0.62, 0.3, 0.62, solid(BUNTING[(bag + seed) % BUNTING.length])), bx, 0.15, bz);
          cushion.rotation.y = hash(seed + bag) * 0.8;
          set(item, block(0.5, 0.1, 0.5, solid(tinted(BUNTING[(bag + seed) % BUNTING.length], "#ffffff", 0.25))), bx, 0.33, bz).rotation.y = cushion.rotation.y;
        }
        label(item, "Cushions for story time");
      }
    } else if (piece.line) {
      // Strung across the room, wall to wall, sagging in the middle.
      const { x, z0, z1, y } = piece.line;
      const heightAt = (z: number) => deckY + y - 0.9 * (1 - ((2 * (z - z0)) / (z1 - z0) - 1) ** 2);
      const points = Array.from({ length: 41 }, (_, step) => {
        const z = z0 + ((z1 - z0) * step) / 40;
        return new THREE.Vector3(x, heightAt(z), z);
      });
      scene.add(inert(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#4a4050" }))));
      const tint = new THREE.Color();
      if (piece.kind === "bunting") {
        const positions: number[] = [];
        const colors: number[] = [];
        for (let fz = z0 + 0.3, flag = 0; fz < z1 - 0.2; fz += 0.55, flag += 1) {
          const left = heightAt(fz - 0.17);
          const right = heightAt(fz + 0.17);
          positions.push(x, left, fz - 0.17, x, right, fz + 0.17, x, (left + right) / 2 - 0.4, fz);
          tint.set(BUNTING[(flag + seed) % BUNTING.length]);
          for (let corner = 0; corner < 3; corner += 1) colors.push(tint.r, tint.g, tint.b);
        }
        const flags = new THREE.BufferGeometry();
        flags.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        flags.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        flags.computeVertexNormals();
        scene.add(inert(new THREE.Mesh(flags, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))));
      } else {
        const bulbs: THREE.BufferGeometry[] = [];
        for (let bz = z0 + 0.2, bulb = 0; bz < z1 - 0.1; bz += 0.45, bulb += 1) {
          const geometry = new THREE.BoxGeometry(0.09, 0.11, 0.09);
          geometry.translate(x, heightAt(bz) - 0.07, bz);
          tint.set(BULBS[(bulb + seed) % BULBS.length]);
          const rgb = [tint.r, tint.g, tint.b];
          geometry.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: geometry.attributes.position.count * 3 }, (_, index) => rgb[index % 3]), 3));
          bulbs.push(geometry);
        }
        const bulbMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
        scene.add(inert(new THREE.Mesh(mergeGeometries(bulbs), bulbMaterial)));
        animated.push((time) => { bulbMaterial.color.setScalar(0.82 + 0.18 * Math.sin(time * 0.0016 + seed)); });
      }
    }
  }

  // ---- Soldiers in their kit: the best the Armory has ready, as far as it goes (the look only). ----
  const SOLDIER_ROLES = new Set(["security", "soldier"]);
  const armoryStock = props.armory?.unlocked ? props.armory.items : [];
  const left = new Map(armoryStock.map((item) => [item.id, item.ready]));
  const issue = (kind: "weapon" | "armor") => {
    const item = armoryStock
      .filter((candidate) => candidate.kind === kind && (left.get(candidate.id) ?? 0) > 0)
      .sort((a, b) => b.tier - a.tier)[0] ?? null;
    if (item) left.set(item.id, (left.get(item.id) ?? 1) - 1);
    return item;
  };
  const kitOut = (person: Person, role: string, aiming: boolean) => {
    if (!SOLDIER_ROLES.has(role)) return;
    const weapon = issue("weapon");
    // On the range they shoot a carbine or better; a training carbine if that is all there is.
    gearUp(person, issue("armor"), aiming && (!weapon || weapon.tier < 2) ? { tier: 2, mark: 1 } : weapon, aiming);
  };
  /** The firing range's lanes: a bolt down each and a flash on its target, set by whoever shoots there. */
  const range: { z: number; flash: THREE.Mesh; bolt: THREE.Mesh }[] = [];

  // ---- The crew at work: everyone has a place and something to do there (ark-walk-crew). ----
  type Point = { x: number; z: number };
  const awayIds = new Set(props.recon?.away ? props.recon.crewIds : []);
  const roomOnline = (kind: WalkRoomKind) => layout.decks.some((deck) => deck.compartments.some((room) => room.kind === kind && room.online));
  const areaOpen = (area: string) => layout.decks.some((deck) => deck.sideRooms.some((room) => room.id === area && room.open));
  const plan = planCrew(props.crew, roomOnline, awayIds, areaOpen);
  const where = (kind: WalkRoomKind, deckHint?: number) => {
    const decks = deckHint === undefined ? layout.decks.map((_, index) => index) : [deckHint];
    for (const deck of decks) {
      const room = layout.decks[deck].compartments.find((compartment) => compartment.kind === kind);
      if (room) return { deck, room };
    }
    return null;
  };
  const roleName = (role: string) => (role === "security" ? "Soldier" : role.charAt(0).toUpperCase() + role.slice(1));
  const DOING: Record<Activity, string> = {
    type: "at work",
    inspect: "checking the line",
    carry: "hauling crates",
    fix: "repairing the arm",
    tend: "tending the crop",
    point: "talking it through",
    talk: "talking",
    teach: "teaching",
    study: "studying",
    eat: "at the mess table",
    sleep: "asleep",
    patient: "recovering",
    heal: "with the wounded",
    pilot: "at the helm",
    guard: "on watch",
    lounge: "waiting for a flight",
    cook: "cooking for everyone",
    aim: "on the firing range",
  };
  const crateMaterial = solid(PALETTE.wood);
  /** Walking a beat between two points with a stop at each end; where they are now. */
  const beat = (time: number, from: Point, to: Point, speed: number, pause: number, seed: number) => {
    const walk = Math.hypot(to.x - from.x, to.z - from.z) / speed;
    const cycle = 2 * (walk + pause);
    const t = (time / 1000 + seed * 3.7) % cycle;
    const lerp = (a: Point, b: Point, amount: number) => ({ x: a.x + (b.x - a.x) * amount, z: a.z + (b.z - a.z) * amount });
    if (t < walk) return { ...lerp(from, to, t / walk), moving: true, out: true, dx: to.x - from.x, dz: to.z - from.z, rest: 0 };
    if (t < walk + pause) return { ...to, moving: false, out: true, dx: 0, dz: 0, rest: (t - walk) / pause };
    if (t < 2 * walk + pause) return { ...lerp(to, from, (t - walk - pause) / walk), moving: true, out: false, dx: from.x - to.x, dz: from.z - to.z, rest: 0 };
    return { ...from, moving: false, out: false, dx: 0, dz: 0, rest: (t - 2 * walk - pause) / pause };
  };
  const relax = (person: Person) => {
    for (const limb of person.limbs) limb.rotation.set(0, 0, 0);
    person.head.rotation.set(0, 0, 0);
  };
  for (const placement of plan.placed) {
    const { member, spot } = placement;
    const place = where(placement.room, spot.deck);
    if (!place) continue;
    const { deck: deckNumber, room } = place;
    const floor = layout.decks[deckNumber].floorY;
    const person = blockyPerson(member.id, member.role, member.ageGroup);
    kitOut(person, member.role, spot.activity === "aim");
    const group = person.group;
    scene.add(group);
    crowd.push({ person, deck: deckNumber });
    label(group, `${member.name} · ${roleName(member.role)} · ${DOING[spot.activity]}`);
    const from = { x: room.x0 + spot.at.x, z: spot.at.z };
    const to = spot.to ? { x: room.x0 + spot.to.x, z: spot.to.z } : null;
    const seed = hash(member.id.length * 7.1 + placement.index * 3.3) * 10;
    const speaking = placement.index % 2;
    const [leftArm, rightArm, leftLeg, rightLeg] = person.limbs;
    let waveStart = -Infinity;

    if (LYING.has(spot.activity)) {
      // On their back along the bed, head towards the look direction.
      group.rotation.order = "YXZ";
      group.rotation.set(-Math.PI / 2, Math.atan2(-spot.look.x, -spot.look.z), 0);
      const lying = (time: number) => {
        group.position.set(from.x - spot.look.x * 0.85, floor + (spot.y ?? 0) + 0.16 + Math.sin(time * 0.0015 + seed) * 0.015, from.z - spot.look.z * 0.85);
      };
      lying(0);
      animated.push((time) => lying(time));
      continue;
    }
    if (SEATED.has(spot.activity)) {
      leftLeg.rotation.x = -1.5;
      rightLeg.rotation.x = -1.5;
      group.position.set(from.x, floor + (spot.y ?? 0) - person.hip, from.z);
      face(group, spot.look.x, spot.look.z);
      animated.push((time) => {
        const t = time / 1000 + seed;
        if (spot.activity === "study") {
          const lookingUp = t % 9 < 2;
          leftArm.rotation.x = -1.2;
          rightArm.rotation.x = lookingUp ? -1.1 : -1.25 + Math.sin(t * 9) * 0.06;
          person.head.rotation.x = lookingUp ? -0.05 : 0.38;
        } else if (spot.activity === "eat") {
          const bite = t % 4 < 0.9;
          leftArm.rotation.x = -0.9;
          rightArm.rotation.x = bite ? -2.3 : -0.95;
          person.head.rotation.y = Math.sin(t * 0.5) * 0.45;
          person.head.rotation.x = bite ? -0.1 : 0.1;
        } else if (spot.activity === "pilot") {
          leftArm.rotation.x = -1.3 + Math.sin(t * 3) * 0.05;
          rightArm.rotation.x = -1.3 + Math.sin(t * 2.3 + 1) * 0.08;
          person.head.rotation.y = Math.sin(t * 0.3) * 0.25;
        } else {
          // Waiting on the lounge bench, chatting with the one beside them.
          const talking = Math.floor(t / 3.2 + speaking) % 2 === 0;
          leftArm.rotation.x = -0.55;
          rightArm.rotation.x = talking ? -0.9 + Math.sin(t * 5) * 0.25 : -0.55;
          person.head.rotation.y = (speaking ? -1 : 1) * 0.55;
        }
      });
      continue;
    }

    face(group, spot.look.x, spot.look.z);
    group.position.set(from.x, floor, from.z);
    let crate: THREE.Mesh | null = null;
    if (spot.activity === "carry") {
      crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.45), crateMaterial);
      crate.position.set(0, 1.05, 0.42);
      group.add(crate);
    }
    animated.push((time, drone) => {
      const t = time / 1000 + seed;
      relax(person);
      let standing = true;
      let facing = spot.look;
      if (to) {
        const speed = { carry: 1, tend: 0.4, teach: 0.5, guard: 0.8 }[spot.activity as string] ?? 0.9;
        const pause = { carry: 1.2, tend: 4, teach: 4, guard: 3 }[spot.activity as string] ?? 3;
        const step = beat(time, from, to, speed, pause, seed);
        group.position.set(step.x, floor, step.z);
        if (step.moving) {
          standing = false;
          facing = { x: step.dx, z: step.dz };
          stride(person, time * 0.009 * Math.max(0.6, speed), 0.5);
        }
        if (crate) {
          // Crates go from the belt to the stack; the walk back is empty-handed.
          crate.visible = step.out;
          if (step.out) {
            leftArm.rotation.x = -1.25;
            rightArm.rotation.x = -1.25;
          }
        }
        if (!step.moving && spot.activity === "teach" && step.rest > 0.5) {
          // Turn to the board and point at it, then back to the class.
          facing = { x: -spot.look.x, z: -spot.look.z };
          rightArm.rotation.x = -1.7;
        } else if (!step.moving && spot.activity === "teach") {
          rightArm.rotation.x = -0.6 + Math.sin(t * 4) * 0.3;
          leftArm.rotation.x = -0.4;
        } else if (!step.moving && spot.activity === "tend") {
          leftArm.rotation.x = -0.9 + Math.sin(t * 1.3) * 0.25;
          rightArm.rotation.x = -1 + Math.sin(t * 1.1 + 1) * 0.25;
          person.head.rotation.x = 0.25;
        } else if (!step.moving && spot.activity === "inspect") {
          person.head.rotation.x = 0.2;
          person.head.rotation.y = Math.sin(t * 0.8) * 0.4;
          rightArm.rotation.x = step.rest > 0.4 && step.rest < 0.7 ? -1.4 : 0;
        } else if (!step.moving && spot.activity === "guard") {
          leftArm.rotation.x = 0.4;
          rightArm.rotation.x = 0.4;
          person.head.rotation.y = Math.sin(t * 0.6) * 0.6;
        }
      } else if (spot.activity === "type") {
        leftArm.rotation.x = -1.15 + Math.sin(t * 14) * 0.06;
        rightArm.rotation.x = -1.15 + Math.sin(t * 14 + 1.7) * 0.06;
        person.head.rotation.x = 0.15;
      } else if (spot.activity === "fix") {
        leftArm.rotation.x = -0.9;
        rightArm.rotation.x = -1.3 - Math.abs(Math.sin(t * 6)) * 0.9;
        person.head.rotation.x = 0.2;
      } else if (spot.activity === "heal") {
        leftArm.rotation.x = -0.5;
        rightArm.rotation.x = t % 8 < 3 ? -1.2 + Math.sin(t * 12) * 0.05 : -0.5;
        person.head.rotation.x = 0.3;
        group.rotation.x = 0.08;
      } else if (spot.activity === "guard") {
        leftArm.rotation.x = 0.4;
        rightArm.rotation.x = 0.4;
        person.head.rotation.y = Math.sin(t * 0.5) * 0.7;
      } else if (spot.activity === "talk" || spot.activity === "point") {
        // Partners take turns: one talks with their hands while the other nods.
        const talking = Math.floor(t / 3.2 + speaking) % 2 === 0;
        if (talking) {
          leftArm.rotation.x = -0.5 + Math.sin(t * 5) * 0.3;
          rightArm.rotation.x = spot.activity === "point" && t % 6 < 2 ? -1.55 : -0.6 + Math.sin(t * 4 + 1) * 0.35;
          leftArm.rotation.z = -0.15;
          person.head.rotation.x = Math.sin(t * 6) * 0.05;
        } else {
          person.head.rotation.x = 0.08 + Math.max(0, Math.sin(t * 2.4)) * 0.12;
        }
      } else if (spot.activity === "cook") {
        // Stirring a pot, eyes on it.
        leftArm.rotation.x = -0.9;
        rightArm.rotation.x = -1.15 + Math.sin(t * 6) * 0.22;
        rightArm.rotation.z = Math.sin(t * 6 + 1.2) * 0.18;
        person.head.rotation.x = 0.32;
      } else if (spot.activity === "aim") {
        // Levelled down the range, a shot every second or so; the target flashes as it lands.
        const shot = (t * 0.8) % 1;
        rightArm.rotation.x = -1.52 + (shot < 0.08 ? 0.14 : 0);
        leftArm.rotation.x = -1.4;
        leftArm.rotation.z = -0.45;
        const lane = range.find((candidate) => Math.abs(candidate.z - from.z) < 0.6);
        if (lane) {
          lane.bolt.visible = shot < 0.06;
          lane.flash.visible = shot > 0.03 && shot < 0.16;
        }
      }
      if (spot.activity !== "heal") group.rotation.x = 0;

      // Someone not hard at work notices the drone and waves.
      const dx = drone.x - group.position.x;
      const dz = drone.z - group.position.z;
      const near = drone.deck === deckNumber && Math.hypot(dx, dz) < 3.2;
      const free = standing && ["talk", "point", "guard", "inspect", "tend", "teach", "heal"].includes(spot.activity);
      if (near && free && time - waveStart > 25_000) waveStart = time;
      if (time - waveStart < 1_800) {
        facing = { x: dx, z: dz };
        rightArm.rotation.set(0, 0, 2.5 + Math.sin(time * 0.012) * 0.3);
      } else if (drone.deck === deckNumber && Math.hypot(dx, dz) < 5 && free) {
        // Otherwise they glance at it as it goes by.
        const turn = Math.atan2(dx, dz) - group.rotation.y;
        person.head.rotation.y = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(turn), Math.cos(turn))));
      }
      face(group, facing.x, facing.z);
    });
  }

  // ---- Off-duty crew walking the decks; they stop for the drone rather than walk through it. ----
  const routes: { deck: number; points: Point[] }[] = (() => {
    const [upper, lower] = layout.decks;
    const lane = 1.2;
    const core = layout.core;
    const chamberOf = (deck: typeof upper) => deck.compartments.find((room) => room.kind === "chamber")!;
    const upperChamber = chamberOf(upper);
    const lowerChamber = chamberOf(lower);
    const lowerEnd = lower.compartments[lower.compartments.length - 1];
    const upperEnd = upper.compartments[upper.compartments.length - 1];
    const loop = (out: Point[], back: Point[]) => [...out, ...back];
    const side = core.z1 + (layout.halfDepth - core.z1) / 2;
    return [
      // Below, the whole deck: round the core by the starboard walk going out, the port walk coming back.
      {
        deck: 1,
        points: loop(
          [{ x: 2, z: lane }, { x: lowerChamber.x0 + 1.3, z: lane }, { x: lowerChamber.x0 + 1.3, z: side }, { x: lowerChamber.x1 - 1.3, z: side }, { x: lowerChamber.x1 - 1.3, z: lane }, { x: lowerEnd.x0 + 18, z: lane }],
          [{ x: lowerEnd.x0 + 18, z: -lane }, { x: lowerChamber.x1 - 1.3, z: -lane }, { x: lowerChamber.x1 - 1.3, z: -side }, { x: lowerChamber.x0 + 1.3, z: -side }, { x: lowerChamber.x0 + 1.3, z: -lane }, { x: 2, z: -lane }],
        ),
      },
      // Above, the lift wells cut the gallery's corners, so walkers keep to either end of the ship.
      { deck: 0, points: loop([{ x: 2.5, z: lane }, { x: upperChamber.x0 + 1.2, z: lane }], [{ x: upperChamber.x0 + 1.2, z: -lane }, { x: 2.5, z: -lane }]) },
      { deck: 0, points: loop([{ x: upperChamber.x1 - 1.2, z: lane }, { x: upperEnd.x1 - 6.5, z: lane }], [{ x: upperEnd.x1 - 6.5, z: -lane }, { x: upperChamber.x1 - 1.2, z: -lane }]) },
    ];
  })();
  plan.roaming.forEach((member, index) => {
    const route = routes[index % routes.length];
    const deckFloor = layout.decks[route.deck].floorY;
    const person = blockyPerson(member.id, member.role, member.ageGroup);
    kitOut(person, member.role, false);
    scene.add(person.group);
    crowd.push({ person, deck: route.deck });
    label(person.group, `${member.name} · ${roleName(member.role)} · walking the deck`);
    const lengths = route.points.map((point, at) => {
      const next = route.points[(at + 1) % route.points.length];
      return Math.hypot(next.x - point.x, next.z - point.z);
    });
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let travelled = hash(index * 5.3 + 1) * total;
    animated.push((time, drone) => {
      // Find where along the route they are, and stop if the drone is in the way.
      let distance = travelled % total;
      let leg = 0;
      while (distance > lengths[leg]) distance -= lengths[leg++];
      const a = route.points[leg];
      const b = route.points[(leg + 1) % route.points.length];
      const amount = lengths[leg] > 0 ? distance / lengths[leg] : 0;
      const x = a.x + (b.x - a.x) * amount;
      const z = a.z + (b.z - a.z) * amount;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const toDrone = { x: drone.x - x, z: drone.z - z };
      const blocked = drone.deck === route.deck && Math.hypot(toDrone.x, toDrone.z) < 1.4 && toDrone.x * dx + toDrone.z * dz > 0;
      if (!blocked) travelled += drone.dt * 1.25;
      person.group.position.set(x, deckFloor, z);
      face(person.group, blocked ? toDrone.x : dx, blocked ? toDrone.z : dz);
      stride(person, time * 0.0085, blocked ? 0 : 0.5);
    });
  });

  // ---- The rooms behind the halls: the crew's cabins and their galley, the Armory. ----
  const sideLabels = new Map<string, string>();
  layout.decks.forEach((deck, deckIndex) => {
    for (const room of deck.sideRooms) buildSideRoom(room, deck, deckIndex);
  });

  function buildSideRoom(room: SideRoom, deck: WalkDeck, deckIndex: number) {
    const y0 = deck.floorY;
    const put = (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) =>
      box(w, h, d, material, x, y0 + y, z);
    const key = room.kind === "cabin" ? room.id : room.kind;
    const paint = paintOf(key);
    const width = room.x1 - room.x0;
    const depth = room.z1 - room.z0;
    const cx = (room.x0 + room.x1) / 2;
    const cz = (room.z0 + room.z1) / 2;
    const doorX = (room.door.x0 + room.door.x1) / 2;
    const doorWidth = room.door.x1 - room.door.x0;
    const wallZ = -(half + INNER_WALL / 2);
    const keyOf = (other: SideRoom) => (other.kind === "cabin" ? other.id : other.kind);
    const nth = <T,>(list: readonly T[], index: number) => list[((index % list.length) + list.length) % list.length];

    // Who lives in a cabin: whoever is asleep in it, else a household from the crew.
    const cabinIndex = room.kind === "cabin" ? Number(room.id.split("-")[1]) : -1;
    const sleepers = plan.placed.filter((placement) => placement.spot.area === room.id).map((placement) => placement.member);
    const household = sleepers.length > 0 ? sleepers : props.crew.filter((_, index) => index % 3 === cabinIndex).slice(0, 2);
    const names = household.map((member) => member.name.split(" ")[0]);
    const title = room.kind === "cabin"
      ? (room.open ? (names.length > 0 ? `Quarters · ${names.join(" & ")}` : "Quarters") : "Unassigned quarters")
      : room.open ? room.label : `${room.label} · sealed`;
    sideLabels.set(room.id, title);

    // Floor, ceiling, and the floor through the doorway.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMaterial(SIDE_FLOOR[key] ?? key, width, depth));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, y0, cz);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.4, depth), lambert("#ffffff", { map: repeated(ceilingTexture, width / 2, depth / 2) }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, y0 + room.height, cz);
    scene.add(floor, ceiling);
    put(doorWidth, 0.06, INNER_WALL + 0.02, floorMaterial(SIDE_FLOOR[key] ?? key, doorWidth, INNER_WALL), doorX, -0.03, wallZ);
    // Hull plating under the floor and over the ceiling, so from outside, through another
    // room's window, the room is a solid block and not a doll's house seen from below.
    const shellDepth = depth + HULL + INNER_WALL - 0.05;
    const shellZ = room.z0 - HULL + shellDepth / 2;
    put(width + 0.8, 0.3, shellDepth, hullSkin, cx, -0.16, shellZ);
    put(width + 0.8, 0.3, shellDepth, hullSkin, cx, room.height + 0.16, shellZ);

    // Its walls: a partition shared with the room beside it, or a thick end wall.
    const before = deck.sideRooms.find((other) => Math.abs(other.x1 - (room.x0 - 0.2)) < 0.01);
    const after = deck.sideRooms.some((other) => Math.abs(other.x0 - (room.x1 + 0.2)) < 0.01);
    const sternThick = before ? 0.2 : 0.4;
    put(sternThick, room.height, depth, [
      wallCut(key, room.height, depth, 0, room.height),
      before ? wallCut(keyOf(before), before.height, depth, 0, room.height) : hullSkin,
      hullSkin, hullSkin, hullSkin, hullSkin,
    ], room.x0 - sternThick / 2, room.height / 2, cz);
    if (!after) {
      put(0.4, room.height, depth, [hullSkin, wallCut(key, room.height, depth, 0, room.height), hullSkin, hullSkin, hullSkin, hullSkin], room.x1 + 0.2, room.height / 2, cz);
    }
    // The far wall is the hull, with a window where people would want one; the farm's are high, over its beds.
    const windowsAt = room.kind === "cabin" || room.kind === "playroom" || room.kind === "infirmary" ? [cx] : room.kind === "farm" ? [room.x0 + 3.2, room.x0 + 9.4] : [];
    const high = room.kind === "farm";
    const view: Rect[] = windowsAt.map((at) => ({ a0: at - 0.7, a1: at + 0.7, y0: high ? 2.2 : 1.1, y1: high ? 3.4 : 2.3 }));
    for (const piece of wallPieces(room.x0 - (before ? 0.1 : 0.4), room.x1 + (after ? 0.1 : 0.4), room.height, view)) {
      const w = piece.a1 - piece.a0;
      const h = piece.y1 - piece.y0;
      put(w, h, HULL, [hullSkin, hullSkin, hullSkin, hullSkin, wallCut(key, room.height, w, piece.y0, h), hullSkin], (piece.a0 + piece.a1) / 2, (piece.y0 + piece.y1) / 2, room.z0 - HULL / 2);
    }
    for (const pane of view) {
      const at = (pane.a0 + pane.a1) / 2;
      const glassPane = inert(new THREE.Mesh(new THREE.PlaneGeometry(pane.a1 - pane.a0, pane.y1 - pane.y0), glassMaterial));
      glassPane.position.set(at, y0 + (pane.y0 + pane.y1) / 2, room.z0 - HULL / 2);
      scene.add(glassPane);
      for (const y of [pane.y0, pane.y1]) put(pane.a1 - pane.a0 + 0.24, 0.12, 0.12, trimMaterial, at, y, room.z0 + 0.04);
      for (const x of [pane.a0, pane.a1]) put(0.12, pane.y1 - pane.y0, 0.12, trimMaterial, x, (pane.y0 + pane.y1) / 2, room.z0 + 0.04);
    }
    // The hall's wall, seen from inside, in this room's paint.
    for (const piece of wallPieces(room.x0, room.x1, room.height, [{ a0: room.door.x0, a1: room.door.x1, y0: 0, y1: SIDE_DOOR_HEIGHT }])) {
      const w = piece.a1 - piece.a0;
      const h = piece.y1 - piece.y0;
      put(w, h, 0.02, wallCut(key, room.height, w, piece.y0, h), (piece.a0 + piece.a1) / 2, (piece.y0 + piece.y1) / 2, room.z1 - 0.011);
    }

    // The door: framed in the room's colour, sliding open as the drone comes, shut fast if sealed.
    const frame = solid(paint);
    for (const face of [-half + 0.04, room.z1 - 0.04]) {
      for (const edge of [room.door.x0 - 0.07, room.door.x1 + 0.07]) put(0.14, SIDE_DOOR_HEIGHT + 0.14, 0.08, frame, edge, (SIDE_DOOR_HEIGHT + 0.14) / 2, face);
      put(doorWidth + 0.28, 0.14, 0.08, frame, doorX, SIDE_DOOR_HEIGHT + 0.07, face);
    }
    const leafMaterial = solid(tinted(PALETTE.metal, paint, 0.2));
    const leaves = [-1, 1].map((sideSign) => {
      const leaf = new THREE.Group();
      leaf.add(new THREE.Mesh(new THREE.BoxGeometry(doorWidth / 2, SIDE_DOOR_HEIGHT, 0.08), leafMaterial));
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(doorWidth / 2, 0.12, 0.09), frame);
      stripe.position.y = 0.3;
      leaf.add(stripe);
      leaf.position.set(doorX + (sideSign * doorWidth) / 4, y0 + SIDE_DOOR_HEIGHT / 2, wallZ);
      scene.add(leaf);
      return { leaf, sideSign };
    });
    put(0.12, 0.12, 0.04, glow(room.open ? PALETTE.ok : PALETTE.alert), room.door.x1 + 0.35, 1.5, -half + 0.03);
    let opening = 0;
    animated.push((_time, drone) => {
      const near = room.open && drone.deck === deckIndex && Math.hypot(drone.x - doorX, drone.z - wallZ) < 2.6;
      opening += ((near ? 1 : 0) - opening) * Math.min(1, drone.dt * 6);
      for (const { leaf, sideSign } of leaves) leaf.position.x = doorX + sideSign * (doorWidth / 4 + (opening * doorWidth) / 2);
    });
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(2.2, doorWidth + 0.8), 0.24),
      new THREE.MeshBasicMaterial({ map: signTexture(title.toUpperCase(), tinted(paint, "#ffffff", 0.3)) }),
    );
    sign.position.set(doorX, y0 + SIDE_DOOR_HEIGHT + 0.36, -half + 0.03);
    scene.add(sign);
    // Beside a cabin's door, a photo of who lives there.
    if (room.kind === "cabin" && room.open && household.length > 0) {
      const faces = household.map((member) => getCrewHead({ id: member.id, role: member.role, ageGroup: member.ageGroup }));
      const plate = picture(0.5, 0.3, artTexture(24, 14, (context) => {
        context.fillStyle = "#3a2616";
        context.fillRect(0, 0, 24, 14);
        faces.forEach((faceHead, index) => {
          context.fillStyle = ["#f4c8c0", "#c8d4f4"][index % 2];
          context.fillRect(1 + index * 12, 2, 10, 10);
          for (const pixel of faceHead.pixels) {
            if (pixel.x - 2 < 10 && pixel.y - 2 < 10) {
              context.fillStyle = pixel.color;
              context.fillRect(1 + index * 12 + pixel.x - 2, 2 + pixel.y - 2, 1, 1);
            }
          }
        });
      }));
      plate.position.set(room.door.x0 - 0.45, y0 + 1.6, -half + 0.03);
      scene.add(plate);
      label(plate, title);
    }

    if (!room.open) return;
    // Lamps: two in a big room, cool white in the Armory, the pink of grow lights in the farm.
    const big = room.kind === "armory" || width > 8;
    const lamps = room.kind === "armory" ? [room.x0 + 4, room.x0 + 11] : big ? [room.x0 + width * 0.3, room.x0 + width * 0.7] : [cx];
    const lampColor = room.kind === "armory" ? "#e8ecff" : room.kind === "farm" ? "#ffd0f0" : LAMP;
    for (const lx of lamps) {
      const light = new THREE.PointLight(lampColor, room.kind === "armory" ? 9 : big ? 7 : 5, room.kind === "armory" ? 14 : big ? 12 : 8, 1);
      light.position.set(lx, y0 + room.height - 0.5, cz);
      scene.add(light);
      put(big ? 3 : 1.2, 0.05, 0.6, glow(lampColor), lx, room.height - 0.03, cz);
    }

    if (room.kind === "cabin") {
      // A bunk for two along the stern wall, head to the window, blankets in the cabin's colour.
      const bunkX = room.x0 + 0.6;
      const bunkZ = room.z0 + 1.6;
      for (const px of [room.x0 + 0.14, room.x0 + 1.06]) for (const pz of [room.z0 + 0.54, room.z0 + 2.66]) put(0.08, 2.3, 0.08, solid(metalLight), px, 1.15, pz);
      for (const level of [0.5, 1.7]) {
        put(1, 0.12, 2.2, solid(metal), bunkX, level, bunkZ);
        put(0.9, 0.16, 2, solid(PALETTE.linen), bunkX, level + 0.14, bunkZ);
        put(0.92, 0.07, 1.2, solid(tinted(paint, "#000000", 0.15)), bunkX, level + 0.25, bunkZ + 0.4);
        put(0.6, 0.1, 0.32, solid("#ffffff"), bunkX, level + 0.27, room.z0 + 0.8);
      }
      for (let rung = 0; rung < 4; rung += 1) put(0.04, 0.04, 0.42, solid(metalLight), room.x0 + 1.12, 0.45 + rung * 0.4, room.z0 + 2.4);
      // A desk with a lamp, a chair, books on a shelf, a photo of the household over it.
      const deskX = room.x1 - 0.42;
      const deskZ = room.z0 + 1.1;
      put(0.65, 0.06, 1.2, solid(PALETTE.wood), deskX, 0.76, deskZ);
      for (const dz of [-0.5, 0.5]) put(0.6, 0.73, 0.06, solid(PALETTE.wood), deskX, 0.37, deskZ + dz);
      put(0.12, 0.16, 0.12, glow("#ffe2a8"), deskX + 0.1, 0.88, deskZ - 0.4);
      put(0.2, 0.05, 0.28, solid(nth(["#c8605a", "#4f6ad0", "#d8a03a"], cabinIndex)), deskX, 0.81, deskZ + 0.2);
      put(0.45, 0.06, 0.45, solid(metalLight), room.x1 - 1.1, 0.45, deskZ);
      put(0.06, 0.5, 0.45, solid(metalLight), room.x1 - 1.33, 0.7, deskZ);
      put(0.3, 0.04, 1.1, solid(PALETTE.wood), room.x1 - 0.18, 1.7, deskZ);
      for (let book = 0; book < 6; book += 1) put(0.2, 0.22, 0.08, solid(nth(["#c8605a", "#4f6ad0", "#d8a03a", "#5a8a4a", "#8a5a9a"], book + cabinIndex)), room.x1 - 0.2, 1.83, deskZ - 0.4 + book * 0.15);
      if (household.length > 0) {
        const photo = picture(0.66, 0.45, artTexture(44, 30, (context) => paintPortraits(context, 44, 30, 7 + cabinIndex, household.map((member) => getCrewHead({ id: member.id, role: member.role, ageGroup: member.ageGroup })))));
        photo.position.set(room.x1 - 0.42, y0 + 2.3, room.z0 + 0.02);
        scene.add(photo);
      }
      // A wardrobe by the door, and a rug.
      put(0.6, 2.2, 1, solid(tinted(PALETTE.wood, paint, 0.15)), room.x1 - 0.4, 1.1, room.z1 - 1.2);
      put(0.02, 2, 0.02, solid(PALETTE.dark), room.x1 - 0.69, 1.1, room.z1 - 1.2);
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), lambert("#ffffff", { map: artTexture(13, 16, (context) => paintRug(context, 13, 16, 30 + cabinIndex)) }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(room.x0 + 2.1, y0 + 0.015, room.z0 + 3.2);
      scene.add(inert(rug));
    } else if (room.kind === "galley") {
      // Stoves and a sink along the far wall, shelves of jars above.
      put(width - 0.2, 0.88, 0.7, solid(metal), cx, 0.44, room.z0 + 0.4);
      put(width - 0.2, 0.05, 0.72, solid("#d8d2c4"), cx, 0.9, room.z0 + 0.4);
      const burners: THREE.Mesh[] = [];
      for (const bx of [room.x0 + 1.15, room.x0 + 1.75]) {
        for (const bz of [room.z0 + 0.25, room.z0 + 0.55]) {
          const burner = cylinder(0.11, 0.11, 0.02, glow("#ff7a3a"), bx, y0 + 0.93, bz, 10);
          burners.push(burner);
        }
      }
      const lids = [room.x0 + 1.15, room.x0 + 1.75].map((px, index) => {
        cylinder(0.16, 0.15, 0.24, solid(metalLight), px, y0 + 1.05, room.z0 + 0.25 + index * 0.3, 10);
        return cylinder(0.17, 0.17, 0.03, solid(metal), px, y0 + 1.19, room.z0 + 0.25 + index * 0.3, 10);
      });
      const steam = [0, 1, 2, 3, 4, 5].map(() => inert(put(0.08, 0.08, 0.08, ghost("#eef2ff", 0.35), room.x0 + 1.15, 1.3, room.z0 + 0.25)));
      put(0.6, 0.04, 0.45, solid(PALETTE.dark), room.x1 - 1.45, 0.925, room.z0 + 0.4);
      put(0.05, 0.3, 0.05, solid(metalLight), room.x1 - 1.45, 1.07, room.z0 + 0.15);
      put(0.05, 0.05, 0.2, solid(metalLight), room.x1 - 1.45, 1.21, room.z0 + 0.24);
      for (const shelfY of [1.7, 2.2]) {
        put(width - 0.4, 0.05, 0.3, solid(PALETTE.wood), cx, shelfY, room.z0 + 0.17);
        for (let jar = 0; jar < Math.floor((width - 0.6) / 0.3); jar += 1) {
          cylinder(0.07, 0.07, 0.2, solid(nth(["#d8a03a", "#c8605a", "#7cc35a", "#e9e4da", "#8a5a3a"], jar + (shelfY > 2 ? 2 : 0))), room.x0 + 0.45 + jar * 0.3, y0 + shelfY + 0.125, room.z0 + 0.17, 6);
        }
      }
      // The island, with bread and vegetables on it, and pans hanging above.
      put(width - 2.4, 0.88, 0.8, solid(PALETTE.wood), cx, 0.44, room.z0 + 2.7);
      put(width - 2.3, 0.05, 0.85, solid("#e9e4da"), cx, 0.9, room.z0 + 2.7);
      for (const [dx, color, w, h] of [[-0.6, "#c8955a", 0.3, 0.12], [-0.2, "#c8955a", 0.26, 0.1], [0.25, "#7cc35a", 0.1, 0.1], [0.4, "#d8503e", 0.1, 0.1], [0.55, "#f08a2a", 0.1, 0.1]] as const) {
        put(w, h, 0.14, solid(color), cx + dx, 0.92 + h / 2, room.z0 + 2.7);
      }
      put(width - 2.4, 0.04, 0.04, solid(metalLight), cx, 2.4, room.z0 + 2.7);
      for (let pan = 0; pan < 4; pan += 1) {
        const px = cx - 0.6 + pan * 0.4;
        put(0.02, 0.3, 0.02, solid(metalLight), px, 2.25, room.z0 + 2.7);
        cylinder(0.12, 0.1, 0.06, solid(pan % 2 === 0 ? PALETTE.copper : metal), px, y0 + 2.07, room.z0 + 2.7, 8).rotation.x = Math.PI / 2;
      }
      // The cold store by the door.
      put(0.8, 2, 1, solid("#c8d0e0"), room.x0 + 0.45, 1, room.z1 - 1.1);
      put(0.04, 0.5, 0.04, solid(metal), room.x0 + 0.87, 1.2, room.z1 - 0.8);
      soundPlaces.push({ kind: "mess", x: cx, y: y0 + 1, z: cz, deck: deckIndex, online: true });
      animated.push((time) => {
        burners.forEach((burner, index) => { burner.visible = Math.floor(time / 200 + index) % 7 !== 0; });
        lids.forEach((lid, index) => { lid.position.y = y0 + 1.19 + Math.max(0, Math.sin(time * 0.012 + index * 2)) * 0.02; });
        steam.forEach((puff, index) => {
          const rise = ((time * 0.0005) + index / 6) % 1;
          puff.position.set(room.x0 + 1.15 + (index % 2) * 0.6 + Math.sin(rise * 6 + index) * 0.06, y0 + 1.25 + rise * 0.9, room.z0 + 0.25 + (index % 2) * 0.3);
          puff.scale.setScalar(0.6 + rise);
        });
      });
    } else if (room.kind === "armory") {
      buildArmory(room, y0, deckIndex, put, paint);
    } else {
      furnishRoom(room, y0, deckIndex, put, paint);
    }
  }

  /** The other rooms behind the halls, each furnished for what it is for. */
  function furnishRoom(
    room: SideRoom,
    y0: number,
    deckIndex: number,
    put: (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) => THREE.Mesh,
    paint: string,
  ) {
    const { x0, x1, z0, z1 } = room;
    const width = x1 - x0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const hear = (kind: SoundPlace["kind"], x: number, z: number) => soundPlaces.push({ kind, x, y: y0 + 1.2, z, deck: deckIndex, online: true });
    const BRIGHT = ["#c8605a", "#4f6ad0", "#d8a03a", "#5a8a4a", "#8a5a9a", "#e9e4da", "#e2786a"];
    const colorAt = (index: number) => BRIGHT[((index % BRIGHT.length) + BRIGHT.length) % BRIGHT.length];
    type Part = { w: number; h: number; d: number; x: number; y: number; z: number; color: string };
    /** Many small boxes as one mesh, each its own colour: books, crops, toys. y is above the deck. */
    const merged = (parts: readonly Part[], glowing = false) => {
      if (parts.length === 0) return null;
      const tint = new THREE.Color();
      const mesh = new THREE.Mesh(
        mergeGeometries(parts.map((part) => {
          const geometry = new THREE.BoxGeometry(part.w, part.h, part.d);
          geometry.translate(part.x, y0 + part.y, part.z);
          tint.set(part.color);
          const rgb = [tint.r, tint.g, tint.b];
          geometry.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: geometry.attributes.position.count * 3 }, (_, index) => rgb[index % 3]), 3));
          return geometry;
        })),
        glowing ? new THREE.MeshBasicMaterial({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      );
      scene.add(mesh);
      return mesh;
    };
    /** A row of books standing on a shelf that runs along x (or along z), spines out. */
    const books = (from: number, to: number, y: number, at: number, alongX: boolean, seed: number): Part[] => {
      const row: Part[] = [];
      for (let cursor = from, book = 0; cursor < to - 0.12; book += 1) {
        const thick = 0.05 + hash(seed + book * 1.7) * 0.06;
        const tall = 0.22 + hash(seed * 2 + book) * 0.12;
        const color = colorAt(Math.floor(hash(seed + book * 3.3) * 7));
        row.push(alongX
          ? { w: thick, h: tall, d: 0.2, x: cursor + thick / 2, y: y + tall / 2, z: at, color }
          : { w: 0.2, h: tall, d: thick, x: at, y: y + tall / 2, z: cursor + thick / 2, color });
        cursor += thick + 0.012;
      }
      return row;
    };
    /** A picture on a wall: turn 0 faces +z (the far wall), PI/2 faces +x, -PI/2 faces -x. */
    const hang = (mesh: THREE.Mesh, x: number, y: number, z: number, turn = 0, tilt = 0) => {
      mesh.position.set(x, y0 + y, z);
      mesh.rotation.set(0, turn, tilt);
      scene.add(mesh);
      return mesh;
    };
    const drawing = (seed: number) => picture(0.62, 0.5, artTexture(16, 13, (context) => paintDrawing(context, 16, 13, seed)));

    switch (room.kind) {
      case "stores": {
        // Shelving in three rows, stacked with crates and drums, and a cargo drone fetching down the aisle.
        const stock: Part[] = [];
        [{ x: x0 + 0.55, from: z0 + 0.3, to: z1 - 2 }, { x: x0 + 3.25, from: z0 + 0.3, to: z0 + 5.2 }, { x: x1 - 0.55, from: z0 + 0.3, to: z1 - 2 }].forEach((row, rowIndex) => {
          const length = row.to - row.from;
          const mid = (row.from + row.to) / 2;
          for (const level of [0.05, 1.25, 2.45]) stock.push({ w: 0.9, h: 0.06, d: length, x: row.x, y: level, z: mid, color: "#5a546e" });
          for (const end of [row.from + 0.04, row.to - 0.04]) stock.push({ w: 0.9, h: 3.4, d: 0.08, x: row.x, y: 1.7, z: end, color: "#a49bba" });
          for (let slot = 0; slot < Math.floor(length / 0.8); slot += 1) {
            [0.05, 1.25, 2.45].forEach((level, levelIndex) => {
              const roll = hash(rowIndex * 31 + slot * 7.3 + levelIndex * 2.1);
              const z = row.from + 0.45 + slot * 0.8;
              if (roll < 0.2) return;
              stock.push(roll < 0.75
                ? { w: 0.7, h: 0.6, d: 0.6, x: row.x, y: level + 0.33, z, color: roll < 0.5 ? "#8a5a3a" : "#9a6a3e" }
                : { w: 0.5, h: 0.7, d: 0.5, x: row.x, y: level + 0.38, z, color: roll > 0.9 ? "#4f6ad0" : "#c8605a" });
            });
          }
        });
        const shelving = merged(stock);
        if (shelving) label(shelving, "The ship's stores: everything salvaged and made, shelved");
        const fetcher = droneModel(PALETTE.amber);
        scene.add(fetcher);
        label(fetcher, "A cargo drone fetching from the stores");
        animated.push((time) => {
          const t = (time * 0.00008) % 1;
          const leg = t < 0.5 ? t * 2 : 2 - t * 2;
          fetcher.position.set(x0 + 1.9, y0 + 2.4 + Math.sin(time * 0.003) * 0.08, z1 - 1.8 - leg * (z1 - z0 - 3));
          fetcher.rotation.y = t < 0.5 ? Math.PI : 0;
        });
        break;
      }
      case "workshop": {
        // The lathe, its chuck spinning, and the drill press beside it.
        const toned = solid(tinted(PALETTE.metal, paint, 0.3));
        put(2.6, 1, 1, solid(metal), x0 + 2.3, 0.5, z0 + 0.7);
        put(1.8, 0.1, 0.3, solid(metalLight), x0 + 2.6, 1.05, z0 + 0.7);
        put(0.5, 0.5, 0.6, toned, x0 + 1, 1.25, z0 + 0.7);
        const chuckMount = new THREE.Group();
        chuckMount.position.set(x0 + 1.4, y0 + 1.3, z0 + 0.7);
        chuckMount.rotation.z = Math.PI / 2;
        const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8), solid(metalLight));
        chuckMount.add(chuck);
        scene.add(chuckMount);
        put(0.7, 0.2, 0.7, solid(metal), x0 + 4.8, 0.1, z0 + 0.6);
        put(0.14, 1.9, 0.14, solid(metalLight), x0 + 4.8, 1.05, z0 + 0.35);
        put(0.4, 0.4, 0.5, toned, x0 + 4.8, 1.8, z0 + 0.6);
        const bit = put(0.05, 0.3, 0.05, solid(metalLight), x0 + 4.8, 1.45, z0 + 0.7);
        // Parts bins on the stern wall.
        const bins: Part[] = [];
        for (let column = 0; column < 4; column += 1) {
          for (let shelf = 0; shelf < 3; shelf += 1) bins.push({ w: 0.6, h: 0.4, d: 0.65, x: x0 + 0.45, y: 0.25 + shelf * 0.5, z: z0 + 2.9 + column * 0.75, color: colorAt(column + shelf * 2) });
        }
        merged(bins);
        // The workbench along the bow wall, tools laid out, a pegboard over it.
        const benchLength = z1 - 1.6 - (z0 + 1);
        const benchZ = (z1 - 1.6 + z0 + 1) / 2;
        put(0.9, 0.9, benchLength, solid(PALETTE.wood), x1 - 0.55, 0.45, benchZ);
        put(0.92, 0.05, benchLength + 0.02, solid(metalLight), x1 - 0.55, 0.92, benchZ);
        put(0.04, 1, benchLength, solid(tinted("#8a5a3a", paint, 0.2)), x1 - 0.04, 1.7, benchZ);
        merged([0, 1, 2, 3, 4].map((tool) => ({
          w: 0.08 + hash(tool + 0.5) * 0.1, h: 0.05, d: 0.3,
          x: x1 - 0.55 + (hash(tool * 3 + 0.2) - 0.5) * 0.4, y: 0.97, z: benchZ - benchLength / 2 + 0.5 + (tool * (benchLength - 1)) / 4,
          color: tool % 2 ? "#c8605a" : "#a49bba",
        })));
        // A Foundry machine half built on a turntable, its core lit in the colour of the best tier built so far.
        const turntable = new THREE.Group();
        turntable.position.set(x0 + 5.6, y0, z0 + 4);
        scene.add(turntable);
        const core = [...feeds].reverse().find((machine) => machine.count > 0)?.color ?? PALETTE.amber;
        const fit = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
          mesh.position.set(x, y, z);
          turntable.add(mesh);
          return mesh;
        };
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.15, 16), solid(metal));
        base.position.y = 0.075;
        turntable.add(base);
        fit(1.1, 0.2, 1.1, solid(metalLight), 0, 0.25, 0);
        for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) fit(0.1, 1.4, 0.1, solid(metalLight), dx, 1, dz);
        fit(0.06, 1.3, 1, toned, -0.55, 1, 0);
        fit(1, 1.3, 0.06, toned, 0, 1, -0.55);
        const glowCore = fit(0.5, 0.5, 0.5, glow(core), 0, 1, 0);
        label(turntable, "A Foundry machine, half built");
        // The gantry: a rail across the room and a hoist over the turntable.
        put(width - 0.4, 0.2, 0.2, solid(metal), cx, room.height - 0.3, z0 + 4);
        put(0.4, 0.3, 0.4, solid(PALETTE.amber), x0 + 5.6, room.height - 0.55, z0 + 4);
        put(0.03, 1.2, 0.03, solid(PALETTE.dark), x0 + 5.6, room.height - 1.3, z0 + 4);
        put(0.2, 0.12, 0.2, solid(metalLight), x0 + 5.6, room.height - 1.95, z0 + 4);
        // Sparks while someone works on the machine.
        const working = plan.placed.some((placement) => placement.spot.area === room.id && placement.spot.activity === "fix");
        const sparks = [0, 1, 2, 3, 4, 5].map(() => inert(put(0.05, 0.05, 0.05, glow("#ffd27a"), x0 + 5.6, 1, z0 + 5)));
        animated.push((time) => {
          chuck.rotation.y = time * 0.02;
          bit.position.y = y0 + 1.45 - Math.abs(Math.sin(time * 0.002)) * 0.2;
          turntable.rotation.y = time * 0.0003;
          glowCore.scale.setScalar(0.9 + 0.1 * Math.sin(time * 0.004));
          sparks.forEach((spark, index) => {
            const life = ((time * 0.004) + index / 6) % 1;
            spark.visible = working && Math.floor(time / 800) % 3 !== 0;
            spark.position.set(x0 + 5.6 + life * 0.5 * Math.cos(index * 1.9), y0 + 1.1 + life * 0.6 - life * life * 0.9, z0 + 4.9 + life * 0.4 * Math.sin(index * 1.9));
          });
        });
        hear("conveyor", cx, cz);
        break;
      }
      case "lab": {
        // Two benches of experiments, each with glowing flasks and a microscope.
        const flasks: Part[] = [];
        for (const bx of [x0 + 3.75, x0 + 11.25]) {
          put(3.5, 0.9, 1.2, solid(metalLight), bx, 0.45, z0 + 3.4);
          put(3.56, 0.05, 1.26, solid("#e9e4da"), bx, 0.92, z0 + 3.4);
          for (let flask = 0; flask < 6; flask += 1) {
            const tall = 0.2 + hash(bx + flask) * 0.12;
            flasks.push({ w: 0.12, h: tall, d: 0.12, x: bx - 1.4 + flask * 0.5, y: 0.95 + tall / 2, z: z0 + 3.4 + (flask % 2 ? 0.25 : -0.2), color: ["#9ac4ff", "#b48cff", "#7cc35a", "#f2c744", "#f08ab0", "#ff9a6a"][flask] });
          }
          put(0.18, 0.12, 0.26, solid(PALETTE.dark), bx + 1.45, 0.98, z0 + 3.3);
          put(0.08, 0.36, 0.08, solid(PALETTE.dark), bx + 1.45, 1.2, z0 + 3.22);
          put(0.12, 0.08, 0.2, solid(metalLight), bx + 1.45, 1.38, z0 + 3.3);
        }
        merged(flasks, true);
        // The fume hood on the far wall.
        put(3.5, 0.9, 0.7, solid(metal), x0 + 3.75, 0.45, z0 + 0.55);
        put(3.5, 0.06, 0.7, solid("#d8d2c4"), x0 + 3.75, 0.93, z0 + 0.55);
        for (const post of [x0 + 2.03, x0 + 5.47]) put(0.06, 0.9, 0.7, solid(metal), post, 1.45, z0 + 0.55);
        put(3.5, 0.6, 0.7, solid(metal), x0 + 3.75, 2.2, z0 + 0.55);
        hang(inert(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), glassMaterial)), x0 + 3.75, 1.45, z0 + 0.9);
        // Server racks along the stern wall, lights blinking.
        const leds: THREE.Mesh[] = [];
        for (let rack = 0; rack < 4; rack += 1) {
          const rz = z0 + 0.8 + rack;
          put(0.9, 2.4, 0.9, solid(PALETTE.dark), x0 + 0.55, 1.2, rz);
          for (let led = 0; led < 4; led += 1) leds.push(put(0.02, 0.07, 0.07, glow(led % 2 ? PALETTE.amber : screenGlow), x0 + 1.01, 0.6 + led * 0.45, rz - 0.2 + (led % 2) * 0.4));
        }
        // Cases of what the Ark has found, glowing under glass.
        const fragments: THREE.Mesh[] = [];
        for (let display = 0; display < 3; display += 1) {
          const caseX = x0 + 10.75 + display * 1.5;
          const stand = put(1.4, 0.9, 0.7, solid(tinted(PALETTE.metal, paint, 0.2)), caseX, 0.45, z0 + 0.55);
          label(stand, "Fragments the Ark has found, catalogued under glass");
          const lid = inert(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.6), glassMaterial));
          lid.position.set(caseX, y0 + 1.1, z0 + 0.55);
          scene.add(lid);
          for (let shard = 0; shard < 2; shard += 1) {
            const crystal = inert(new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), glow(shard % 2 ? "#b48cff" : tinted(accent, "#ffffff", 0.3))));
            crystal.position.set(caseX - 0.3 + shard * 0.6, y0 + 1.08, z0 + 0.55);
            scene.add(crystal);
            fragments.push(crystal);
          }
        }
        // The archive vault's round door, set into the bow wall.
        const vault = new THREE.Group();
        vault.position.set(x1 - 0.08, y0 + 1.5, cz);
        vault.rotation.z = Math.PI / 2;
        const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.16, 20), solid(tinted(PALETTE.metal, paint, 0.15)));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 6, 24), solid(metalLight));
        rim.rotation.x = Math.PI / 2;
        const wheel = new THREE.Group();
        wheel.position.y = 0.14;
        for (const spoke of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.08), solid(metalLight));
          bar.rotation.y = spoke;
          wheel.add(bar);
        }
        wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), solid(PALETTE.amber)));
        vault.add(slab, rim, wheel);
        scene.add(vault);
        label(vault, "The archive vault: everything the Ark has found");
        animated.push((time) => {
          leds.forEach((led, index) => { led.visible = hash(Math.floor(time / 300) + index * 13.1) > 0.35; });
          fragments.forEach((crystal, index) => {
            crystal.rotation.y = time * 0.001 + index;
            crystal.position.y = y0 + 1.08 + Math.sin(time * 0.002 + index) * 0.03;
          });
        });
        hear("servers", x0 + 0.6, cz);
        break;
      }
      case "library": {
        // Shelves of books, floor to ceiling, along the far wall and the stern wall.
        const shelves: Part[] = [{ w: width - 0.2, h: 2.8, d: 0.04, x: cx, y: 1.4, z: z0 + 0.12, color: "#3a2616" }];
        const sternFrom = z0 + 0.6;
        const sternTo = z1 - 2.8;
        for (let level = 0; level < 5; level += 1) {
          const y = 0.1 + level * 0.55;
          shelves.push({ w: width - 0.2, h: 0.04, d: 0.5, x: cx, y, z: z0 + 0.35, color: "#5a3a24" });
          shelves.push({ w: 0.5, h: 0.04, d: sternTo - sternFrom, x: x0 + 0.35, y, z: (sternFrom + sternTo) / 2, color: "#5a3a24" });
          shelves.push(...books(x0 + 0.15, x1 - 0.15, y + 0.02, z0 + 0.32, true, level * 13 + 1));
          shelves.push(...books(sternFrom + 0.05, sternTo - 0.05, y + 0.02, x0 + 0.32, false, 70 + level * 11));
        }
        const shelving = merged(shelves);
        if (shelving) label(shelving, "The library: books carried aboard, and books written here");
        // The reading table: lamps, open books, two chairs.
        const tableX = x0 + 3.1;
        const tableZ = z0 + 3;
        put(1.8, 0.06, 1.2, solid(PALETTE.wood), tableX, 0.76, tableZ);
        for (const dx of [-0.8, 0.8]) for (const dz of [-0.5, 0.5]) put(0.06, 0.73, 0.06, solid(PALETTE.wood), tableX + dx, 0.37, tableZ + dz);
        for (const lampX of [tableX - 0.5, tableX + 0.5]) {
          put(0.03, 0.3, 0.03, solid(metalLight), lampX, 0.94, tableZ - 0.35);
          put(0.18, 0.12, 0.18, glow("#ffe2a8"), lampX, 1.12, tableZ - 0.35);
        }
        put(0.42, 0.02, 0.3, solid("#efe6d2"), tableX - 0.3, 0.8, tableZ + 0.25);
        put(0.42, 0.02, 0.3, solid("#efe6d2"), tableX + 0.35, 0.8, tableZ - 0.15);
        for (const [seatZ, back] of [[z0 + 4.15, 0.22], [z0 + 1.85, -0.22]]) {
          put(0.45, 0.06, 0.45, solid(colorAt(2)), tableX, 0.45, seatZ);
          put(0.45, 0.5, 0.06, solid(colorAt(2)), tableX, 0.72, seatZ + back);
        }
        // A globe of the world below on its stand, by the door.
        put(0.06, 0.9, 0.06, solid(PALETTE.wood), x1 - 0.6, 0.45, z1 - 0.8);
        const globe = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), solid(tinted(accent, PALETTE.dark, 0.25))));
        globe.position.set(x1 - 0.6, y0 + 1.2, z1 - 0.8);
        scene.add(globe);
        animated.push((time) => { globe.rotation.y = time * 0.0005; });
        break;
      }
      case "classroom": {
        // A lesson screen on the far wall: the worlds in a row, and chalk sums.
        const lesson = picture(2.6, 1.3, artTexture(52, 26, (context) => {
          context.fillStyle = PALETTE.board;
          context.fillRect(0, 0, 52, 26);
          [[5, 6, 3, "#d8a03a"], [13, 5, 4, "#7cc35a"], [23, 4, 5, "#4f6ad0"], [34, 5, 4, "#c8605a"], [43, 6, 3, "#b48cff"]].forEach(([x, y, size, color]) => {
            context.fillStyle = color as string;
            context.fillRect(x as number, y as number, size as number, size as number);
          });
          context.fillStyle = PALETTE.chalk;
          for (const [x, y, w] of [[4, 15, 10], [17, 15, 3], [23, 15, 6], [4, 20, 16], [26, 20, 2], [31, 20, 12]]) context.fillRect(x, y, w, 1);
        }));
        put(2.8, 1.5, 0.06, solid(PALETTE.wood), cx, 1.8, z0 + 0.03);
        hang(lesson, cx, 1.8, z0 + 0.07);
        // Six desks, each with a slate, and a chair in every colour.
        [2.4, 4].forEach((row, rowIndex) => {
          [1.5, 3.3, 5.1].forEach((column, columnIndex) => {
            const dx = x0 + column;
            const dz = z0 + row;
            put(1.2, 0.06, 0.6, solid(PALETTE.wood), dx, 0.62, dz);
            for (const legX of [-0.5, 0.5]) put(0.05, 0.6, 0.5, solid(PALETTE.wood), dx + legX, 0.3, dz);
            put(0.4, 0.02, 0.26, glow(screenGlow), dx, 0.66, dz);
            const color = colorAt(rowIndex * 3 + columnIndex);
            put(0.4, 0.05, 0.4, solid(color), dx, 0.4, dz + 0.55);
            put(0.4, 0.4, 0.05, solid(color), dx, 0.62, dz + 0.77);
          });
        });
        // The children's work pinned to the side walls.
        [0, 1, 2].forEach((sheet) => hang(drawing(room.x0 * 7 + sheet), x0 + 0.02, 1.7 + (sheet % 2) * 0.15, z0 + 1.6 + sheet * 1.2, Math.PI / 2, (hash(sheet + 4) - 0.5) * 0.3));
        [0, 1].forEach((sheet) => hang(drawing(room.x0 * 5 + sheet + 9), x1 - 0.02, 1.75, z0 + 2 + sheet * 1.4, -Math.PI / 2, (hash(sheet + 8) - 0.5) * 0.3));
        break;
      }
      case "playroom": {
        // A soft rug, towers of blocks, a slide, a bear, cushions, and drawings on every wall.
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.6), lambert("#ffffff", { map: artTexture(27, 29, (context) => paintRug(context, 27, 29, 44)) }));
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(cx - 0.3, y0 + 0.015, z0 + 3.4);
        scene.add(inert(rug));
        const toys: Part[] = [];
        [[x0 + 2.4, z0 + 3, 5], [x0 + 3, z0 + 4.2, 3], [x0 + 1.9, z0 + 4.4, 2], [x0 + 3.4, z0 + 2.6, 4]].forEach(([tx, tz, count], tower) => {
          for (let block = 0; block < count; block += 1) toys.push({ w: 0.25, h: 0.25, d: 0.25, x: tx + (hash(tower * 9 + block) - 0.5) * 0.06, y: 0.14 + block * 0.25, z: tz, color: colorAt(tower + block) });
        });
        // Cushions to flop on.
        [[x0 + 1.2, z0 + 2.4], [x0 + 3.9, z0 + 3.8], [x0 + 1.5, z0 + 3.6]].forEach(([px, pz], index) => {
          toys.push({ w: 0.55, h: 0.18, d: 0.55, x: px, y: 0.1, z: pz, color: ["#f08ab0", "#f2c744", "#7d8cf0"][index] });
        });
        // The crayon table and its little stools.
        toys.push({ w: 1, h: 0.05, d: 1, x: x0 + 1.1, y: 0.5, z: z0 + 1.1, color: "#e9e4da" });
        for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) toys.push({ w: 0.05, h: 0.48, d: 0.05, x: x0 + 1.1 + dx, y: 0.24, z: z0 + 1.1 + dz, color: "#e9e4da" });
        for (let crayon = 0; crayon < 5; crayon += 1) toys.push({ w: 0.12, h: 0.03, d: 0.03, x: x0 + 0.9 + crayon * 0.08, y: 0.54, z: z0 + 1.2 + (crayon % 2) * 0.1, color: colorAt(crayon) });
        merged(toys);
        // The slide: up the ladder, down the yellow ramp.
        put(1, 0.1, 0.8, solid("#4f6ad0"), x1 - 0.8, 1, z0 + 0.7);
        for (const legX of [x1 - 1.25, x1 - 0.35]) for (const legZ of [z0 + 0.35, z0 + 1.05]) put(0.06, 1, 0.06, solid(metalLight), legX, 0.5, legZ);
        for (let rung = 0; rung < 3; rung += 1) put(1, 0.05, 0.05, solid(metalLight), x1 - 0.8, 0.25 + rung * 0.3, z0 + 0.32);
        const ramp = put(0.8, 0.06, 1.9, solid("#f2c744"), x1 - 0.8, 0.55, z0 + 1.75);
        ramp.rotation.x = 0.52;
        // A toy bear, well loved.
        const bear = new THREE.Group();
        bear.position.set(x0 + 0.9, y0, z1 - 1.3);
        bear.rotation.y = 0.6;
        const fur = solid("#9a6a3e");
        for (const [w, h, d, x, y, z] of [[0.35, 0.4, 0.3, 0, 0.2, 0], [0.28, 0.26, 0.26, 0, 0.53, 0], [0.08, 0.08, 0.06, -0.1, 0.68, 0], [0.08, 0.08, 0.06, 0.1, 0.68, 0], [0.12, 0.08, 0.06, 0, 0.5, 0.15], [0.1, 0.22, 0.1, -0.22, 0.25, 0.04], [0.1, 0.22, 0.1, 0.22, 0.25, 0.04]]) {
          const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fur);
          part.position.set(x, y, z);
          bear.add(part);
        }
        scene.add(bear);
        label(bear, "A toy bear, well loved");
        // Drawings on the walls.
        [0, 1].forEach((sheet) => hang(drawing(room.x0 * 3 + sheet), x0 + 0.7 + sheet * 0.75, 1.85, z0 + 0.03, 0, (hash(sheet + 2) - 0.5) * 0.3));
        [0, 1].forEach((sheet) => hang(drawing(room.x0 * 11 + sheet + 4), x0 + 0.02, 1.7, z0 + 3 + sheet * 1.1, Math.PI / 2, (hash(sheet + 6) - 0.5) * 0.3));
        break;
      }
      case "farm": {
        // Three raised beds: greens, tomatoes, wheat, under magenta grow lights.
        const crops: Part[] = [];
        const lights: Part[] = [];
        [1.2, 3, 4.8].forEach((bedZ, bedIndex) => {
          const z = z0 + bedZ;
          put(width - 2, 0.6, 0.8, solid(PALETTE.wood), cx, 0.3, z);
          put(width - 2.1, 0.04, 0.7, solid("#4a3424"), cx, 0.61, z);
          put(width - 2, 0.06, 0.06, solid(metalLight), cx, 0.7, z - 0.42);
          for (let plant = 0; plant < Math.floor((width - 2.2) / 0.3); plant += 1) {
            const px = x0 + 1.2 + plant * 0.3;
            for (const dz of [-0.17, 0.17]) {
              const tall = (0.2 + hash(plant * 3.1 + bedIndex * 7 + dz) * 0.3) * (bedIndex === 2 ? 1.6 : 1);
              crops.push({ w: 0.16, h: tall, d: 0.16, x: px, y: 0.63 + tall / 2, z: z + dz, color: bedIndex === 2 ? "#d8b84a" : bedIndex === 1 ? "#4a9440" : "#5fae4e" });
              if (bedIndex === 1 && hash(plant + dz * 9) > 0.55) crops.push({ w: 0.08, h: 0.08, d: 0.08, x: px + 0.05, y: 0.63 + tall * 0.7, z: z + dz + 0.07, color: "#e8443a" });
            }
          }
          lights.push({ w: width - 2.2, h: 0.06, d: 0.3, x: cx, y: 2, z, color: "#ff9adf" });
          for (const end of [x0 + 1.2, x1 - 1.2]) put(0.02, room.height - 2.03, 0.02, solid(PALETTE.dark), end, (room.height + 2.03) / 2, z);
        });
        const field = merged(crops);
        if (field) label(field, "The hydroponic farm: greens, tomatoes and wheat for the galley");
        merged(lights, true);
        hear("fan", cx, cz);
        break;
      }
      case "infirmary": {
        // Four beds, each with a monitor on a pole keeping time.
        [[x0 + 0.65, z0 + 1.25], [x1 - 0.65, z0 + 1.25], [x0 + 0.65, z0 + 4.45], [x1 - 0.65, z0 + 4.45]].forEach(([bx, bz], bedIndex) => {
          put(1, 0.5, 2.1, solid(metalLight), bx, 0.25, bz);
          put(0.9, 0.18, 2, solid(PALETTE.linen), bx, 0.6, bz);
          put(0.92, 0.06, 1.1, solid(tinted(paint, "#ffffff", 0.3)), bx, 0.71, bz + 0.4);
          put(0.6, 0.1, 0.3, solid("#ffffff"), bx, 0.74, bz - 0.8);
          const poleX = bx + (bx < cx ? 0.55 : -0.55);
          put(0.06, 1.6, 0.06, solid(metal), poleX, 0.8, bz - 0.9);
          const monitor = put(0.5, 0.36, 0.06, glow("#0f2a1c"), poleX, 1.55, bz - 0.9);
          const trace = put(0.4, 0.04, 0.07, glow(PALETTE.ok), poleX, 1.55, bz - 0.9);
          animated.push((time) => {
            trace.position.y = monitor.position.y + (Math.floor(time / 120 + bedIndex * 3) % 8 === 0 ? 0.08 : 0);
          });
        });
        // A medicine cabinet between the beds on the bow wall, marked with a green cross.
        const cabinet = put(0.3, 1.2, 1, solid("#e9e4da"), x1 - 0.17, 1.6, z0 + 2.85);
        put(0.02, 0.36, 0.1, glow("#5aba5a"), x1 - 0.33, 1.8, z0 + 2.85);
        put(0.02, 0.1, 0.36, glow("#5aba5a"), x1 - 0.33, 1.8, z0 + 2.85);
        label(cabinet, "Medicine, and what the farm grows for it");
        break;
      }
      case "briefing": {
        // The round map table: the world below turning in light, and the way down to it.
        const tableX = x0 + 2.8;
        const tableZ = z0 + 4.8;
        const table = cylinder(1.2, 1.25, 0.9, solid(metal), tableX, y0 + 0.45, tableZ, 16);
        cylinder(1.1, 1.1, 0.04, glow(tinted(accent, PALETTE.dark, 0.3)), tableX, y0 + 0.92, tableZ, 16);
        label(table, "The briefing table: the world below, and the way down to it");
        const world = new THREE.Group();
        world.position.set(tableX, y0 + 1.75, tableZ);
        scene.add(world);
        world.add(inert(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshBasicMaterial({ color: tinted(accent, "#ffffff", 0.2), wireframe: true, transparent: true, opacity: 0.8 }))));
        const site = inert(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), glow("#ffb347")));
        site.position.set(0.4, 0.25, 0.3);
        world.add(site);
        const course = inert(new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.015, 4, 32, Math.PI * 0.8), ghost("#ffb347", 0.8)));
        course.position.set(tableX, y0 + 1.75, tableZ);
        course.rotation.x = 1.1;
        scene.add(course);
        // Chairs round it, leaving room where people stand to talk it through.
        for (const angle of [Math.PI / 3, (2 * Math.PI) / 3, (4 * Math.PI) / 3, (5 * Math.PI) / 3]) {
          const sx = tableX + Math.cos(angle) * 1.65;
          const sz = tableZ + Math.sin(angle) * 1.65;
          put(0.45, 0.06, 0.45, solid(paint), sx, 0.45, sz);
          put(0.45, 0.5, 0.06, solid(paint), sx, 0.72, sz + Math.sign(Math.sin(angle)) * 0.22);
        }
        // A chart of the space round the Ark on the stern wall.
        hang(picture(2, 1.3, artTexture(32, 21, (context) => paintChart(context, 32, 21, 91, accent))), x0 + 0.02, 2.4, tableZ, Math.PI / 2);
        // The wall screen: where the team is, and who went.
        const screenCanvas = document.createElement("canvas");
        screenCanvas.width = 96;
        screenCanvas.height = 36;
        const screenContext = screenCanvas.getContext("2d")!;
        const screenTexture = new THREE.CanvasTexture(screenCanvas);
        screenTexture.magFilter = THREE.NearestFilter;
        screenTexture.minFilter = THREE.NearestFilter;
        screenTexture.generateMipmaps = false;
        screenTexture.colorSpace = THREE.SRGBColorSpace;
        put(3.4, 1.4, 0.08, solid(PALETTE.dark), cx, 2.6, z0 + 0.04);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({ map: screenTexture }));
        hang(screen, cx, 2.6, z0 + 0.09);
        label(screen, "The briefing screen");
        let lastScreen = "";
        animated.push((time) => {
          world.rotation.y = time * 0.0004;
          const recon = live().recon;
          const lines = recon?.away
            ? [`TEAM AT ${(recon.site ?? "THE SURFACE").toUpperCase()}`, `${recon.crewIds.length} ABOARD THE RECON SHIP`, `BACK IN ${Math.max(1, Math.round(recon.remaining / 60))} MIN`]
            : ["NO TEAM IN THE FIELD", "PLAN THE NEXT LANDING", "AT THE RECON DOCK DESK"];
          const key = lines.join("|");
          if (key === lastScreen) return;
          lastScreen = key;
          screenContext.fillStyle = PALETTE.dark;
          screenContext.fillRect(0, 0, 96, 36);
          screenContext.textBaseline = "top";
          screenContext.font = "bold 8px monospace";
          screenContext.fillStyle = tinted(paint, "#ffffff", 0.3);
          screenContext.fillText("EXPEDITION BRIEFING", 4, 2, 88);
          screenContext.font = "7px monospace";
          screenContext.fillStyle = PALETTE.light;
          lines.forEach((text, index) => screenContext.fillText(text, 4, 12 + index * 8, 88));
          screenTexture.needsUpdate = true;
        });
        break;
      }
    }
  }

  /** The Armory: the range, the racks, the armour stands, the repair bench and the forge. */
  function buildArmory(
    room: SideRoom,
    y0: number,
    deckIndex: number,
    put: (w: number, h: number, d: number, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) => THREE.Mesh,
    paint: string,
  ) {
    // The live Armory once the game has one unlocked; until then what the walk opened with (the QA stock).
    const armoryNow = () => (live().armory?.unlocked ? live().armory : props.armory);
    const stock = props.armory?.items ?? [];
    const find = (kind: "weapon" | "armor", tier: number) => stock.find((item) => item.kind === kind && item.tier === tier) ?? null;
    const describe = (item: (typeof stock)[number] | null, fallback: string) => item
      ? `${item.name} · Mark ${ROMAN[item.mark] ?? item.mark} · ${item.ready} ready${item.damaged ? ` · ${item.damaged} awaiting repair` : ""}`
      : `${fallback} · none made yet`;

    // The firing range: two lanes behind a low wall and glass, targets at the far end.
    const laneFrom = room.x0 + 4.6;
    const laneTo = room.x1 - 0.1;
    const laneLength = laneTo - laneFrom;
    const laneMid = (laneFrom + laneTo) / 2;
    const glassZ = room.z0 + 2.5;
    const laneFloor = new THREE.Mesh(new THREE.PlaneGeometry(laneLength, 2.4), solid("#35313f"));
    laneFloor.rotation.x = -Math.PI / 2;
    laneFloor.position.set(laneMid, y0 + 0.012, room.z0 + 1.3);
    scene.add(laneFloor);
    put(laneLength, 0.9, 0.12, solid(metal), laneMid, 0.45, glassZ);
    const rangeGlass = inert(new THREE.Mesh(new THREE.PlaneGeometry(laneLength, 1.8), glassMaterial));
    rangeGlass.position.set(laneMid, y0 + 1.8, glassZ);
    scene.add(rangeGlass);
    put(laneLength, 0.08, 0.14, trimMaterial, laneMid, 2.7, glassZ);
    put(1.4, 1.1, 0.06, solid(metal), laneFrom + 0.7, 0.55, room.z0 + 1.4);
    put(0.3, 1, 2.3, solid(metal), laneFrom - 0.15, 0.5, room.z0 + 1.3);
    put(0.1, 0.01, 2.3, glow(PALETTE.alert), laneFrom - 0.45, 0.006, room.z0 + 1.3);
    const targetFace = lambert("#ffffff", {
      map: canvasTexture(16, 16, (context) => {
        [[0, "#e9e4da"], [2, "#d8503e"], [4, "#e9e4da"], [6, "#d8503e"]].forEach(([inset, color]) => {
          context.fillStyle = color as string;
          context.fillRect(inset as number, inset as number, 16 - 2 * (inset as number), 16 - 2 * (inset as number));
        });
      }),
    });
    for (const laneZ of [room.z0 + 0.9, room.z0 + 1.9]) {
      put(0.06, 0.8, 0.7, [solid(metal), targetFace, solid(metal), solid(metal), solid(metal), solid(metal)], laneTo - 0.35, 1.35, laneZ);
      put(0.04, 1.6, 0.04, solid(metalLight), laneTo - 0.3, 0.8, laneZ);
      const flash = inert(put(0.02, 0.84, 0.74, glow("#ffe2a8"), laneTo - 0.39, 1.35, laneZ));
      const muzzle = room.x0 + 4.4;
      const bolt = inert(put(laneTo - 0.4 - muzzle, 0.05, 0.05, glow("#9ac4ff"), (muzzle + laneTo - 0.4) / 2, 1.38, laneZ));
      flash.visible = false;
      bolt.visible = false;
      range.push({ z: laneZ, flash, bolt });
    }

    // Weapon racks along the wall by the door, one per weapon, holding what is ready.
    ["Kinetic Pike", "Arc Carbine", "Null Lance"].forEach((fallback, rack) => {
      const tier = rack + 1;
      const item = find("weapon", tier);
      const rx = room.x0 + 4.4 + rack * 3.2;
      const panel = put(2.8, 2.2, 0.1, solid(tinted(PALETTE.metal, paint, 0.15)), rx, 1.3, room.z1 - 0.15);
      put(2.8, 0.06, 0.4, solid(metalLight), rx, 0.25, room.z1 - 0.35);
      const shown = Math.min(6, item?.ready ?? 0);
      for (let slot = 0; slot < 6; slot += 1) {
        const sx = rx - 1.05 + slot * 0.42;
        put(0.06, 0.06, 0.18, solid(metalLight), sx, 1.95, room.z1 - 0.25);
        if (slot >= shown || !item) continue;
        const model = weaponModel({ tier, mark: item.mark });
        model.position.set(sx, y0 + 1.15, room.z1 - 0.34);
        scene.add(model);
      }
      label(panel, describe(item, `${fallback} rack`));
    });

    // Armour stands along the bow wall, each dummy wearing its armour if there is one ready.
    ["Composite Weave", "Reactive Shell", "Aegis Frame"].forEach((fallback, stand) => {
      const tier = stand + 1;
      const item = find("armor", tier);
      const sz = room.z0 + [3.6, 5.4, 7.2][stand];
      const sx = room.x1 - 0.75;
      put(0.9, 0.12, 0.9, solid(metal), sx, 0.06, sz);
      const dummy = mannequin();
      dummy.group.position.set(sx, y0 + 0.12, sz);
      face(dummy.group, -1, 0);
      if (item && item.ready > 0) gearUp(dummy, { tier, mark: item.mark }, null);
      scene.add(dummy.group);
      label(dummy.group, describe(item, `${fallback} stand`));
    });

    // The repair bench: damaged gear laid out, tagged, sparking while someone works at it.
    const benchX = room.x0 + 0.6;
    const benchZ = room.z0 + 4.7;
    const bench = put(1, 0.9, 3, solid(PALETTE.wood), benchX, 0.45, benchZ);
    put(1.04, 0.05, 3.04, solid(metalLight), benchX, 0.92, benchZ);
    const broken = stock.filter((item) => item.damaged > 0);
    const waiting = broken.reduce((sum, item) => sum + item.damaged, 0);
    broken.slice(0, 3).forEach((item, index) => {
      const z = benchZ - 1 + index;
      if (item.kind === "weapon") {
        const model = weaponModel({ tier: item.tier, mark: item.mark });
        model.rotation.x = Math.PI / 2;
        model.position.set(benchX, y0 + 1, z);
        scene.add(model);
      } else {
        put(0.5, 0.12, 0.4, solid(item.tier === 3 ? "#3b3552" : item.tier === 2 ? "#8d94a8" : "#56604f"), benchX, 1, z);
      }
      put(0.3, 0.02, 0.12, solid("#2a2430"), benchX + 0.1, 1.07, z + 0.1);
      put(0.12, 0.02, 0.08, solid("#f2c744"), benchX - 0.3, 0.96, z - 0.15);
    });
    label(bench, waiting > 0 ? `Repair bench · ${waiting} piece${waiting === 1 ? "" : "s"} awaiting repair` : "Repair bench · nothing waiting");
    const fixer = plan.placed.some((placement) => placement.spot.area === room.id && placement.spot.activity === "fix");
    const sparks = [0, 1, 2, 3, 4].map(() => inert(put(0.05, 0.05, 0.05, glow("#ffd27a"), benchX + 0.4, 1, benchZ)));

    // The forge cradle: the Armory's current project turning in its beam, its progress on the console.
    const fx = room.x0 + 7.3;
    const fz = room.z0 + 5;
    put(2.6, 0.3, 2, solid(metal), fx, 0.15, fz);
    for (const [dx, dz] of [[-1.15, -0.85], [1.15, -0.85], [-1.15, 0.85], [1.15, 0.85]]) put(0.12, 2.6, 0.12, solid(metalLight), fx + dx, 1.3, fz + dz);
    for (const dz of [-0.85, 0.85]) put(2.42, 0.1, 0.1, solid(metalLight), fx, 2.6, fz + dz);
    for (const dx of [-1.15, 1.15]) put(0.1, 0.1, 1.8, solid(metalLight), fx + dx, 2.6, fz);
    const beam = inert(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 12, 1, true), ghost("#ffb347", 0.18)));
    beam.position.set(fx, y0 + 1.4, fz);
    scene.add(beam);
    const cradled = new THREE.Group();
    cradled.position.set(fx, y0 + 1.4, fz);
    scene.add(cradled);
    const project = props.armory?.project ?? null;
    const projectItem = project ? stock.find((item) => item.name === project.name) ?? null : null;
    if (project && projectItem?.kind === "weapon") {
      const model = weaponModel({ tier: projectItem.tier, mark: project.targetMark });
      model.rotation.z = Math.PI / 2;
      cradled.add(model);
    } else if (project && projectItem) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.36), solid(projectItem.tier === 3 ? "#3b3552" : projectItem.tier === 2 ? "#8d94a8" : "#56604f"));
      cradled.add(plate);
    }
    put(0.9, 1, 0.3, solid(metal), fx, 0.5, room.z0 + 6.25);
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 64;
    screenCanvas.height = 24;
    const screenContext = screenCanvas.getContext("2d")!;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.magFilter = THREE.NearestFilter;
    screenTexture.minFilter = THREE.NearestFilter;
    screenTexture.generateMipmaps = false;
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.32), new THREE.MeshBasicMaterial({ map: screenTexture }));
    screen.position.set(fx, y0 + 1.12, room.z0 + 6.41);
    screen.rotation.x = -0.35;
    scene.add(screen);
    const armoryRoom: ArkWalkRoom = {
      kind: "hangar",
      label: "Armory",
      online: true,
      interactive: Boolean(props.armory?.onOpen),
      onActivate: () => armoryNow()?.onOpen?.(),
    };
    interactables.push({
      kind: "console",
      object: screen,
      label: "Armory",
      room: armoryRoom,
      online: true,
      deck: deckIndex,
      prompt: () => (armoryNow()?.onOpen ? "E · open the Armory" : "Armory console"),
    });

    // The room's name on the wall, and red trim along the floor.
    const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), new THREE.MeshBasicMaterial({ map: signTexture("ARMORY", tinted(paint, "#ffffff", 0.2)) }));
    nameplate.position.set(room.x0 + 0.02, y0 + 3.6, benchZ);
    nameplate.rotation.y = Math.PI / 2;
    scene.add(nameplate);
    put(room.x1 - room.x0, 0.04, 0.04, glow(tinted(paint, PALETTE.dark, 0.2)), (room.x0 + room.x1) / 2, 0.04, room.z1 - 0.06);

    let lastScreen = "";
    animated.push((time) => {
      cradled.rotation.y = time * 0.0006;
      const now = armoryNow()?.project ?? null;
      beam.visible = now !== null;
      cradled.visible = now !== null;
      sparks.forEach((spark, index) => {
        const life = ((time * 0.004) + index / 5) % 1;
        spark.visible = fixer && waiting > 0 && Math.floor(time / 900) % 3 !== 0;
        spark.position.set(benchX + 0.45 + life * 0.4 * Math.cos(index * 2.1), y0 + 1 + life * 0.5 - life * life * 0.6, benchZ + life * 0.4 * Math.sin(index * 2.1));
      });
      const lines = now ? [`MARK ${ROMAN[now.targetMark] ?? now.targetMark} ${now.name.toUpperCase()}`, `${Math.round(now.progress * 100)}%`] : ["NO PROJECT", "THE FORGE IS IDLE"];
      const key = lines.join("|");
      if (key === lastScreen) return;
      lastScreen = key;
      screenContext.fillStyle = PALETTE.dark;
      screenContext.fillRect(0, 0, 64, 24);
      screenContext.textBaseline = "top";
      screenContext.font = "bold 7px monospace";
      screenContext.fillStyle = tinted(paint, "#ffffff", 0.3);
      screenContext.fillText(lines[0], 3, 3, 58);
      screenContext.fillStyle = PALETTE.light;
      screenContext.fillText(lines[1], 3, 12, 58);
      if (now) {
        screenContext.fillStyle = "#3a3548";
        screenContext.fillRect(26, 13, 34, 5);
        screenContext.fillStyle = "#ffb347";
        screenContext.fillRect(26, 13, Math.round(34 * Math.min(1, Math.max(0, now.progress))), 5);
      }
      screenTexture.needsUpdate = true;
    });
  }

  const obstacles = (): Obstacle[] => [
    ...crowd.map(({ person, deck }) => ({ deck, x: person.group.position.x, z: person.group.position.z, radius: PERSON_RADIUS })),
    ...dynamicObstacles.map((obstacle) => obstacle()).filter((obstacle): obstacle is Obstacle => obstacle !== null),
  ];

  // The core's roar, heard from both decks of the gallery; the bay's alarms and engines.
  soundPlaces.push({ kind: "star", x: heart.x, y: heart.y, z: heart.z, deck: null, online: true });
  const dockRoom = layout.decks[1].compartments.find((compartment) => compartment.kind === "hangar");
  if (dockRoom) {
    const bay = layout.dock.bay;
    soundPlaces.push({ kind: "bay", x: (bay.x0 + bay.x1) / 2, y: 2.5, z: (bay.z0 + bay.z1) / 2, deck: 1, online: true });
  }

  return {
    interactables, animated, notices, heartGroup, heartTarget, heartLight, gimbals, obstacles, stage, soundPlaces, baySound,
    hullOpen: () => hullOpen,
    sideLabel: (id: string) => sideLabels.get(id) ?? id,
  };
}

export default function ArkWalk(props: ArkWalkProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const roomRef = useRef<HTMLElement>(null);
  const signalRef = useRef<HTMLSpanElement>(null);
  const lostRef = useRef<HTMLParagraphElement>(null);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const mount = mountRef.current;
    const root = rootRef.current;
    if (!mount || !root) return;
    // QA sandbox: ?qa=1&crew=demo fills the ship with every kind of crew member to look at.
    const search = new URLSearchParams(window.location.search);
    // ?qa=1&armory=demo stocks the Armory to look at.
    const qaMode = search.has("qa");
    const crewed = qaMode && search.get("crew") === "demo" ? { ...propsRef.current, crew: demoCrew() } : propsRef.current;
    const initial = qaMode && search.get("armory") === "demo" ? { ...crewed, armory: demoArmory() } : crewed;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // People make the ship theirs: the more aboard, the more cabins are lived in and the more is put up.
    // ?qa=1&people=N previews a crew of N.
    const preview = search.has("qa") && search.has("people") ? Number(search.get("people")) : null;
    const layout = buildWalkLayout(initial.rooms.map((room) => ({ kind: room.kind, label: room.label, online: room.online })), {
      residents: preview ?? initial.crew.length,
      armory: Boolean(initial.armory?.unlocked),
    });
    const decor = planDecor(layout, preview ?? initial.crew.length, {
      children: preview !== null || initial.crew.some((member) => member.ageGroup === "child"),
    });
    furnishLayout(layout, decor);
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
    scene.fog = new THREE.Fog(tinted("#3d3852", initial.worldAccent || "#3d3852", 0.08), 45, 170);
    scene.add(new THREE.AmbientLight("#aea8c6", 1));
    scene.add(new THREE.HemisphereLight(tinted("#f4eeff", initial.worldAccent || "#f4eeff", 0.15), "#5a4a40", 0.7));

    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 1000);
    const ship = buildShip(scene, layout, initial, () => propsRef.current, decor);
    let soundscape: Soundscape | null = null;
    const heart = layout.heart;
    const lookup = new Map(ship.interactables.map((item) => [item.object, item]));

    // The Null reaches the drone's feed. ?qa=1&null=trace|elevated|severe previews it.
    const qaNull = search.has("qa") ? search.get("null") : null;
    const nullLevel = qaNull === "trace" || qaNull === "elevated" || qaNull === "severe"
      ? { classification: qaNull as NullClass, intensity: 0.85 }
      : initial.nullInterference ?? { classification: "quiet" as const, intensity: 0 };
    const nullFeed = createNullFeed(nullLevel.classification, nullLevel.intensity, { reducedMotion });
    let signal: NullFeed | null = null;
    const feedTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      colorSpace: THREE.SRGBColorSpace,
    });
    const feedMaterial = new THREE.ShaderMaterial({
      uniforms: {
        frame: { value: feedTarget.texture },
        resolution: { value: new THREE.Vector2(1, 1) },
        time: { value: 0 },
        seed: { value: 0 },
        ambient: { value: 0 },
        tear: { value: 0 },
        split: { value: 0 },
        snow: { value: 0 },
        drop: { value: 0 },
      },
      vertexShader: FEED_VERTEX,
      fragmentShader: FEED_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const feedScene = new THREE.Scene();
    feedScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), feedMaterial));
    const feedCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const resize = () => {
      const width = Math.max(1, Math.floor(mount.clientWidth / PIXEL_SCALE));
      const height = Math.max(1, Math.floor(mount.clientHeight / PIXEL_SCALE));
      renderer.setSize(width, height, false);
      feedTarget.setSize(width, height);
      feedMaterial.uniforms.resolution.value.set(width, height);
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
    let lastX = x;
    let lastZ = z;
    let standingLift = false;
    const keys = new Set<string>();
    let target: Interactable | null = null;
    let lastPrompt = "";
    let lastRoom = "";
    let lastBars = -1;
    let lastLost = false;
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
        soundscape?.lift(travel.to === 0);
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

    // QA sandbox only (?qa=1): place the drone anywhere, to check a view without flying there.
    const qa = new URLSearchParams(window.location.search).has("qa");
    if (qa) {
      (window as unknown as { arkWalkQa?: unknown }).arkWalkQa = {
        layout,
        sounding: () => soundscape !== null,
        signal: () => signal,
        place(deck: number, px: number, pz: number, look = yaw, tilt = 0) {
          deckIndex = deck;
          x = px;
          z = pz;
          yaw = look;
          pitch = tilt;
        },
      };
    }

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
      // The Null on the feed: shielded near the Law-Heart, worse with the launch bay open to space.
      const fromHeart = Math.hypot(x - heart.x, z - heart.z);
      const inBay = !travel && compartmentAt(deck, x)?.kind === "hangar" ? ship.hullOpen() : 0;
      const exposure = (fromHeart < 12 ? 0.45 + (fromHeart / 12) * 0.55 : 1) * (1 + inBay * 0.8);
      signal = nullFeed.update(now, exposure);
      if (signal.began === "tear" || signal.began === "drop") playNullStatic(signal.began === "drop" ? 1 : nullLevel.intensity);
      else if (signal.began === "snow" || signal.began === "split") playNullStatic(nullLevel.intensity * 0.4);

      const hover = reducedMotion ? 0 : Math.sin(now * 0.002) * 0.03;
      camera.position.set(x, eyeY + hover, z);
      camera.rotation.set(pitch + signal.jolt.pitch, yaw - Math.PI / 2 + signal.jolt.yaw, 0, "YXZ");

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
      // Sound starts with the first press (browsers insist), then follows the drone.
      soundscape ??= createSoundscape(ship.soundPlaces, () => ship.baySound);
      soundscape?.update({ x, y: eyeY, z, yaw, deck: deckIndex, speed: dt > 0 ? Math.hypot(x - lastX, z - lastZ) / dt : 0 });
      lastX = x;
      lastZ = z;
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

      const behindHall = travel ? null : sideRoomAt(deck, x, z);
      const roomLabel = travel
        ? "Grav-lift"
        : `${deck.label} · ${behindHall ? ship.sideLabel(behindHall.id) : compartmentAt(deck, x)?.label ?? "Bulkhead"}`;
      const shownRoom = signal.misread ? misreadLabel(roomLabel, signal.seed) : roomLabel;
      if (shownRoom !== lastRoom && roomRef.current) {
        lastRoom = shownRoom;
        roomRef.current.textContent = shownRoom;
      }
      if (signal.bars !== lastBars && signalRef.current) {
        lastBars = signal.bars;
        signalRef.current.dataset.bars = String(signal.bars);
      }
      if (signal.drop > 0 !== lastLost && lostRef.current) {
        lastLost = signal.drop > 0;
        lostRef.current.hidden = !lastLost;
      }

      if (signal.ambient === 0 && !signal.freeze && signal.drop === 0) {
        renderer.render(scene, camera);
      } else {
        // A frozen feed keeps showing the last picture it got.
        if (!signal.freeze) {
          renderer.setRenderTarget(feedTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
        }
        const uniforms = feedMaterial.uniforms;
        uniforms.time.value = now / 1000;
        uniforms.seed.value = signal.seed;
        uniforms.ambient.value = signal.ambient;
        uniforms.tear.value = signal.tear;
        uniforms.split.value = signal.split;
        uniforms.snow.value = signal.snow;
        uniforms.drop.value = signal.drop;
        renderer.render(feedScene, feedCamera);
      }
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
      if (qa) delete (window as unknown as { arkWalkQa?: unknown }).arkWalkQa;
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
      soundscape?.dispose();
      feedTarget.dispose();
      feedMaterial.dispose();
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
          <span ref={signalRef} className="ark-walk-signal" data-bars="4" role="img" aria-label="Drone signal">
            <i /><i /><i /><i />
          </span>
        </div>
        <p ref={lostRef} className="ark-walk-lost" hidden>Signal lost</p>
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
