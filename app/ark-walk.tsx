"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { ArkCutawayRoomKind } from "./ark-cutaway";
import { drawPixelWorldFrame } from "./ark-pixel-world";
import {
  buildWalkLayout,
  compartmentAt,
  DOCK_CYCLE_MS,
  DOCK_PHASES,
  DOOR_HALF_WIDTH,
  DOOR_HEIGHT,
  isWalkable,
  LIFT_RADIUS,
  liftAt,
  moveWithin,
  PLINTH_HALF,
  reconShipAt,
  UPPER_FLOOR,
  type WalkCompartment,
  type WalkLayout,
  type WalkRoomKind,
} from "./ark-walk-layout";
import { AxiomEye } from "./axiom-eye";
import { CIVILIAN_COLOR, CREW_ROLE_COLORS, getCrewLook, getCrewPortrait } from "./crew-portrait";
import { playBulkhead, playPulseStrike, schedulePulseBeat, unlockPulseAudio } from "./law-heart-audio";
import "./ark-walk.css";

/*
 * Walk the Ark (proof): AXIOM steers a maintenance drone through the ship in
 * first person. Both decks are built from the same rooms, crew and Law-Heart
 * as the 2D cutaway and rendered at a third of the screen resolution, then
 * scaled up crisp, so it keeps the game's pixel look. PC only; loaded on
 * demand so the rest of the game never pays for three.js.
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

export type ArkWalkProps = {
  worldName: string;
  worldAccent: string;
  rooms: readonly ArkWalkRoom[];
  crew: readonly { id: string; name: string; role: string }[];
  heart: ArkWalkHeart;
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
const VESSEL_RADIUS = 2.6;
const HEART_RADII = [0.55, 0.85, 1, 1.1, 1.2, 1.3, 1.4];

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

/** Which hull walls have windows to space (-1 is the port side, 1 starboard). */
const WINDOW_SIDES: Partial<Record<WalkRoomKind, readonly number[]>> = {
  fabrication: [1],
  habitation: [-1, 1],
  research: [1],
  bridge: [-1, 1],
  support: [1],
  education: [1],
  hangar: [-1],
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

/** A patch of stars for a hull window; each seed gives a different patch. */
function starTexture(seed: number, tint: string) {
  return canvasTexture(32, 24, (context) => {
    context.fillStyle = tint;
    context.fillRect(0, 0, 32, 24);
    for (let index = 0; index < 22; index += 1) {
      const bright = hash(seed * 31 + index * 7.3) > 0.82;
      context.fillStyle = bright ? "#ffffff" : PALETTE.stars;
      context.globalAlpha = bright ? 1 : 0.55;
      context.fillRect(Math.floor(hash(seed + index * 1.7) * 32), Math.floor(hash(seed * 3 + index * 2.9) * 24), 1, 1);
    }
  });
}

/** Decorations the drone's line of sight passes straight through. */
function inert<T extends THREE.Object3D>(object: T) {
  object.raycast = () => {};
  return object;
}

type Person = { group: THREE.Group; limbs: THREE.Object3D[] };

/** A person as a blocky figure: their portrait's face on the front of the head, their job's uniform. */
function blockyPerson(id: string, role: string): Person {
  const { skin, hair, longHair } = getCrewLook({ id });
  const solid = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const skinMaterial = solid(skin);
  const hairMaterial = solid(hair);
  const uniformMaterial = solid(CREW_ROLE_COLORS[role] ?? CIVILIAN_COLOR);
  const trouserMaterial = solid("#2b2433");
  const faceMaterial = new THREE.MeshLambertMaterial({
    map: canvasTexture(10, 10, (context) => {
      context.fillStyle = skin;
      context.fillRect(0, 0, 10, 10);
      for (const run of getCrewPortrait({ id, role })) {
        if (run.y < 1 || run.y > 10 || run.fill === "#4b4566" || run.fill === "#15131f") continue;
        context.fillStyle = run.fill;
        context.fillRect(run.x - 2, run.y - 1, run.w, 1);
      }
    }),
  });

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
  const legs = [-0.12, 0.12].map((x) => limb(0.2, 0.8, 0.24, trouserMaterial, x, 0.82));
  const arms = [-0.36, 0.36].map((x) => {
    const arm = limb(0.16, 0.6, 0.2, uniformMaterial, x, 1.44);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.18), skinMaterial);
    hand.position.y = -0.66;
    arm.add(hand);
    return arm;
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.64, 0.3), uniformMaterial);
  torso.position.y = 1.14;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.32), trouserMaterial);
  belt.position.y = 0.85;
  // Box faces run +x, -x, +y, -y, +z, -z; the face looks out of +z.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), [skinMaterial, skinMaterial, hairMaterial, skinMaterial, faceMaterial, hairMaterial]);
  head.position.y = 1.67;
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), hairMaterial);
  crown.position.y = 1.89;
  group.add(torso, belt, head, crown);
  if (longHair) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), hairMaterial);
    tail.position.set(0, 1.58, -0.23);
    group.add(tail);
  }
  group.scale.setScalar(0.92);
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
  | { kind: "console"; object: THREE.Object3D; label: string; room: ArkWalkRoom | null; online: boolean; deck: number }
  | { kind: "heart"; object: THREE.Object3D }
  | { kind: "label"; object: THREE.Object3D; label: string };

type Drone = { x: number; z: number; deck: number };
type Updater = (time: number, drone: Drone) => void;
type Obstacle = { x: number; z: number; radius: number; deck: number };

function buildShip(scene: THREE.Scene, layout: WalkLayout, props: ArkWalkProps) {
  const interactables: Interactable[] = [];
  const animated: Updater[] = [];
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
  const spaceTint = tinted(PALETTE.space, accent, 0.06);
  const machines = props.heart.machines;

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
    context.fillStyle = tinted(PALETTE.wallLight, accent, 0.26);
    context.fillRect(3, 3, 1, 1);
    context.fillRect(12, 3, 1, 1);
    context.fillRect(1, 12, 14, 2);
  });
  const ceilingTexture = canvasTexture(16, 16, (context) => {
    context.fillStyle = tinted("#1e1b2d", accent, 0.08);
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = tinted("#14121f", accent, 0.05);
    context.fillRect(0, 7, 16, 2);
  });
  const starTextures = [1, 2, 3].map((seed) => starTexture(seed, spaceTint));

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
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
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
  const trimMaterial = solid(metalLight);
  const heart = layout.heart;

  // What the big windows look out on: stars and the current world turning. One picture
  // serves the bridge window and the view beyond the recon dock's bay.
  const viewCanvas = document.createElement("canvas");
  viewCanvas.width = 256;
  viewCanvas.height = 110;
  const viewContext = viewCanvas.getContext("2d")!;
  const planetCanvas = document.createElement("canvas");
  planetCanvas.width = 128;
  planetCanvas.height = 128;
  const planetContext = planetCanvas.getContext("2d")!;
  const stars = Array.from({ length: 40 }, (_, index) => [(index * 67) % 256, (index * 29) % 110, index % 5 === 0 ? 2 : 1]);
  const viewTexture = new THREE.CanvasTexture(viewCanvas);
  viewTexture.magFilter = THREE.NearestFilter;
  viewTexture.minFilter = THREE.NearestFilter;
  viewTexture.generateMipmaps = false;
  viewTexture.colorSpace = THREE.SRGBColorSpace;
  const viewMaterial = new THREE.MeshBasicMaterial({ map: viewTexture, fog: false });
  let planetFrame = 0;
  let lastPlanetDraw = -Infinity;
  animated.push((time) => {
    if (time - lastPlanetDraw < 240) return;
    lastPlanetDraw = time;
    planetFrame += 1;
    drawPixelWorldFrame(planetContext, props.worldName, 0.5, planetFrame);
    viewContext.fillStyle = PALETTE.space;
    viewContext.fillRect(0, 0, 256, 110);
    viewContext.fillStyle = PALETTE.stars;
    for (const [x, y, size] of stars) viewContext.fillRect(x, y, size, size);
    viewContext.imageSmoothingEnabled = false;
    viewContext.drawImage(planetCanvas, 64, 20, 128 * 1.4, 128 * 1.4);
    viewTexture.needsUpdate = true;
  });

  layout.decks.forEach((deck, deckIndex) => {
    const upper = deck.floorY > 0;
    const y0 = deck.floorY;
    const put = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) =>
      box(w, h, d, material, x, y0 + y, z);
    /** How tall a bulkhead stands: downstairs it reaches the deck above. */
    const wallHeight = (...rooms: WalkCompartment[]) => (upper ? Math.max(...rooms.map((room) => room.height)) : UPPER_FLOOR);

    deck.compartments.forEach((room, index) => {
      const width = room.x1 - room.x0;
      const cx = (room.x0 + room.x1) / 2;
      const dark = !room.online;
      const screenColor = dark ? PALETTE.dark : screenGlow;
      // The chamber is one atrium drawn from the lower deck; upstairs only adds its catwalk.
      const atriumTop = room.kind === "chamber" && upper;
      const dock = room.kind === "hangar";

      if (!atriumTop) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), lambert("#ffffff", { map: repeated(floorTexture, width / 2, half) }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, y0, 0);
        scene.add(floor);
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), lambert("#ffffff", { map: repeated(ceilingTexture, width / 2, half) }));
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(cx, y0 + room.height, 0);
        scene.add(ceiling);
        const wallMaterial = (w: number, h: number) => lambert("#ffffff", { map: repeated(wallTexture, w / 2, h / 2) });
        const wallPanel = (x0: number, x1: number, yLow: number, yHigh: number, side: number) => {
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, yHigh - yLow), wallMaterial(x1 - x0, yHigh - yLow));
          panel.position.set((x0 + x1) / 2, y0 + (yLow + yHigh) / 2, side * half);
          if (side === 1) panel.rotation.y = Math.PI;
          scene.add(panel);
        };
        wallPanel(room.x0, room.x1, 0, room.height, -1);
        if (dock) {
          // The bay: the starboard wall stands open to space behind a force field.
          const { x0: openX0, x1: openX1 } = layout.dock.opening;
          wallPanel(room.x0, openX0, 0, room.height, 1);
          wallPanel(openX1, room.x1, 0, room.height, 1);
          wallPanel(openX0, openX1, 5, room.height, 1);
          wallPanel(openX0, openX1, 0, 0.3, 1);
        } else {
          wallPanel(room.x0, room.x1, 0, room.height, 1);
        }

        // Hull windows onto the stars.
        for (const side of WINDOW_SIDES[room.kind] ?? []) {
          for (let wx = room.x0 + 2.5, pane = 0; wx < room.x1 - 1.5; wx += 3.5, pane += 1) {
            const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.4), new THREE.MeshBasicMaterial({ map: starTextures[(pane + index) % 3], fog: false }));
            glassPane.position.set(wx, y0 + 2.9, side * (half - 0.03));
            if (side === 1) glassPane.rotation.y = Math.PI;
            scene.add(glassPane);
            const frameZ = side * (half - 0.08);
            put(2.2, 0.12, 0.12, trimMaterial, wx, 2.2, frameZ);
            put(2.2, 0.12, 0.12, trimMaterial, wx, 3.6, frameZ);
            put(0.12, 1.4, 0.12, trimMaterial, wx - 1.05, 2.9, frameZ);
            put(0.12, 1.4, 0.12, trimMaterial, wx + 1.05, 2.9, frameZ);
          }
        }

        // Deck lights: strips down the ceiling and warm lamps, or an emergency glow when dormant.
        const lampCount = room.kind === "chamber" ? 2 : Math.max(1, Math.round(width / 11));
        for (let lampIndex = 0; lampIndex < lampCount; lampIndex += 1) {
          const lx = room.x0 + (width * (lampIndex + 0.5)) / lampCount;
          if (!dark) {
            put(width / lampCount - 1.6, 0.06, 0.4, glow(PALETTE.light), lx, room.height - 0.05, 0);
            const lamp = new THREE.PointLight(PALETTE.light, room.kind === "chamber" ? 14 : 9, room.kind === "chamber" ? 28 : 18, 1.1);
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
        put(0.5, 0.14, DOOR_HALF_WIDTH * 2 + 0.3, trimMaterial, wx, DOOR_HEIGHT + 0.07, 0);
        for (const side of [-1, 1]) put(0.5, DOOR_HEIGHT, 0.14, trimMaterial, wx, DOOR_HEIGHT / 2, side * (DOOR_HALF_WIDTH + 0.07));
        put(0.52, 0.22, 0.6, glow(nextRoom.online ? PALETTE.ok : PALETTE.alert), wx, DOOR_HEIGHT + 0.4, 0);
      }

      // The room's furniture and its console.
      const consoleRoom = roomsByKind.get(room.kind) ?? null;
      const addConsole = (object: THREE.Object3D) =>
        interactables.push({ kind: "console", object, label: room.label, room: consoleRoom, online: room.online, deck: deckIndex });

      if (room.kind === "fabrication") {
        // The press, with its console on the front.
        put(3, 3, 3, solid(metal), room.x0 + 3.5, 1.5, -5.1);
        const piston = put(1, 1.6, 1, solid(metalLight), room.x0 + 3.5, 3.6, -5.1);
        addConsole(put(1.6, 0.8, 0.06, glow(screenColor), room.x0 + 3.5, 1.8, -3.57));
        // A rack for each Foundry machine tier, lit in its colour once one is built.
        const tiers = machines.length > 0 ? machines : Array.from({ length: 6 }, (_, tier) => ({ name: `Tier ${tier + 1}`, count: 0, color: PALETTE.dark }));
        tiers.slice(0, 6).forEach((machine, tier) => {
          const mx = room.x0 + 6.6 + tier * 1.16;
          const cabinet = put(1.05, 2.4, 1.3, solid(metal), mx, 1.2, -6.2);
          label(cabinet, machine.count > 0 ? `${machine.name} · ${machine.count} built` : `${machine.name} · not yet built`);
          const lit = machine.count > 0 && !dark;
          put(0.8, 0.12, 0.05, glow(lit ? machine.color : PALETTE.dark), mx, 2.1, -5.53);
          const bars = lit ? Math.min(5, Math.ceil(Math.log2(machine.count + 1))) : 0;
          for (let bar = 0; bar < 5; bar += 1) {
            put(0.5, 0.1, 0.05, glow(bar < bars ? machine.color : PALETTE.dark), mx, 0.5 + bar * 0.24, -5.53);
          }
        });
        // The conveyor, crates riding it, a robot arm loading them, and a stack waiting.
        const beltLength = room.x1 - 1 - (room.x0 + 5);
        put(beltLength, 0.7, 1.2, solid(metal), room.x0 + 5 + beltLength / 2, 0.35, 5);
        put(beltLength, 0.04, 1, solid(PALETTE.dark), room.x0 + 5 + beltLength / 2, 0.72, 5);
        const crates = [0, 1, 2, 3].map(() => put(0.6, 0.6, 0.6, solid(PALETTE.wood), 0, 1.04, 5));
        cylinder(0.5, 0.6, 0.6, solid(metal), room.x1 - 3.6, y0 + 0.3, 3);
        const arm = new THREE.Group();
        arm.position.set(room.x1 - 3.6, y0 + 0.6, 3);
        const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), solid(PALETTE.amber));
        upperArm.position.y = 0.8;
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.4), solid(PALETTE.amber));
        forearm.position.set(0, 1.55, 0.6);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.2), solid(metal));
        grip.position.set(0, 1.4, 1.3);
        arm.add(upperArm, forearm, grip);
        scene.add(arm);
        [[0.8, 0.5, 5.2], [2.2, 0.5, 5.2], [1.5, 0.5, 6.1], [1.5, 1.3, 5.6]].forEach(([dx, dy, dz]) => {
          put(0.9, 0.8, 0.9, solid(PALETTE.wood), room.x0 + dx, dy, dz);
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
        // Four pillars run the full height of the atrium; the vessel is built below.
        for (const px of [-5, 5]) {
          for (const pz of [-4.6, 4.6]) put(0.5, room.height, 0.5, solid(metal), cx + px, room.height / 2, pz);
        }
      } else if (atriumTop) {
        // The catwalk ringing the atrium, open at two corners for the grav-lifts.
        const atrium = layout.atrium;
        const plate = (x0: number, x1: number, z0: number, z1: number) => {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0),
            lambert("#ffffff", { map: repeated(floorTexture, (x1 - x0) / 2, (z1 - z0) / 2) }),
          );
          mesh.position.set((x0 + x1) / 2, y0 - 0.15, (z0 + z1) / 2);
          scene.add(mesh);
        };
        plate(room.x0, atrium.x0, atrium.z0, half);
        plate(atrium.x1, room.x1, -half, atrium.z1);
        plate(atrium.x0, atrium.x1, atrium.z1, half);
        plate(atrium.x0, atrium.x1, -half, atrium.z0);
        const rail = solid(metalLight);
        for (const rz of [atrium.z0, atrium.z1]) {
          put(atrium.x1 - atrium.x0, 0.08, 0.08, rail, (atrium.x0 + atrium.x1) / 2, 1.1, rz);
          put(atrium.x1 - atrium.x0, 0.06, 0.06, rail, (atrium.x0 + atrium.x1) / 2, 0.6, rz);
          for (let px = atrium.x0 + 2; px < atrium.x1 - 1; px += 2) put(0.08, 1.1, 0.08, rail, px, 0.55, rz);
        }
        for (const rx of [atrium.x0, atrium.x1]) {
          put(0.08, 0.08, atrium.z1 - atrium.z0, rail, rx, 1.1, 0);
          put(0.06, 0.06, atrium.z1 - atrium.z0, rail, rx, 0.6, 0);
        }
        // Light the lips of the two lift wells.
        const rim = glow(liftGlow);
        put(atrium.x0 - room.x0, 0.05, 0.12, rim, (room.x0 + atrium.x0) / 2, 0.01, atrium.z0);
        put(0.12, 0.05, half + atrium.z0, rim, atrium.x0, 0.01, (atrium.z0 - half) / 2);
        put(room.x1 - atrium.x1, 0.05, 0.12, rim, (atrium.x1 + room.x1) / 2, 0.01, atrium.z1);
        put(0.12, 0.05, half - atrium.z1, rim, atrium.x1, 0.01, (atrium.z1 + half) / 2);
        // Warning lights at the four corners of the void.
        for (const px of [atrium.x0, atrium.x1]) {
          for (const pz of [atrium.z0, atrium.z1]) {
            const beacon = put(0.2, 0.2, 0.2, glow(PALETTE.amber), px, 1.3, pz);
            animated.push((time) => { beacon.visible = Math.floor(time / 600 + px + pz) % 2 === 0; });
          }
        }
      } else if (room.kind === "habitation") {
        // Two bunk stacks with linen and posts.
        for (const sx of [room.x0 + 3.5, room.x0 + 10]) {
          for (const level of [0.55, 1.75]) {
            put(4.6, 0.3, 1.8, solid(metal), sx, level, -5.85);
            put(4.4, 0.18, 1.6, solid(PALETTE.bunk), sx, level + 0.24, -5.85);
            put(0.7, 0.16, 1.2, solid(PALETTE.linen), sx - 1.8, level + 0.4, -5.85);
          }
          for (const px of [-2.3, 2.3]) for (const pz of [-6.75, -4.95]) put(0.12, 2.4, 0.12, solid(metalLight), sx + px, 1.2, pz);
        }
        // The mess table and chairs; the table is the habitation console.
        const tableX = room.x1 - 3.6;
        addConsole(put(3.2, 0.14, 1.6, solid(PALETTE.wood), tableX, 0.85, 3.4));
        for (const px of [-1.4, 1.4]) for (const pz of [2.75, 4.05]) put(0.12, 0.85, 0.12, solid(PALETTE.wood), tableX + px, 0.42, pz);
        for (const px of [-0.8, 0.8]) {
          for (const pz of [2.25, 4.55]) {
            put(0.6, 0.1, 0.6, solid(metalLight), tableX + px, 0.5, pz);
            put(0.6, 0.6, 0.1, solid(metalLight), tableX + px, 0.8, pz + (pz < 3.4 ? -0.25 : 0.25));
          }
        }
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), solid(tinted(PALETTE.bunk, accent, 0.4)));
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(tableX, y0 + 0.01, 3.4);
        scene.add(rug);
        // Lockers along the starboard wall and a plant in the corner.
        for (let locker = 0; locker < 4; locker += 1) {
          put(0.95, 2.2, 0.6, solid(tinted(PALETTE.hull, accent, 0.1)), room.x0 + 1.5 + locker, 1.1, 6.55);
          put(0.4, 0.06, 0.02, solid(PALETTE.dark), room.x0 + 1.5 + locker, 1.8, 6.24);
        }
        put(0.6, 0.6, 0.6, solid(PALETTE.wood), room.x1 - 1, 0.3, 6.3);
        for (let leaf = 0; leaf < 5; leaf += 1) put(0.25, 0.5 + leaf * 0.1, 0.25, solid(PALETTE.leaf), room.x1 - 1.2 + (leaf % 3) * 0.2, 0.85 + leaf * 0.08, 6.2 + (leaf % 2) * 0.2);
      } else if (room.kind === "research") {
        // A long desk under wall screens, the middle screen being the console.
        put(width - 2, 1, 1.4, solid(metal), cx, 0.5, -6.15);
        const screens = [-1.5, -0.5, 0.5, 1.5].map((offset) => put(2.2, 1.2, 0.06, glow(screenColor), cx + offset * 2.5, 2.4, -6.95));
        addConsole(screens[1]);
        // The holo-table, projecting the world below as a turning lattice.
        cylinder(1.2, 1.3, 1, solid(metal), cx, y0 + 0.5, 3.4, 12);
        const hologram = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: screenGlow, wireframe: true, transparent: true, opacity: dark ? 0 : 0.7 })));
        hologram.position.set(cx, y0 + 2.2, 3.4);
        scene.add(hologram);
        const orbit = inert(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.02, 4, 32), ghost(screenGlow, dark ? 0 : 0.6)));
        orbit.position.copy(hologram.position);
        orbit.rotation.x = 1.2;
        scene.add(orbit);
        // Server racks with blinking lights.
        const leds: THREE.Mesh[] = [];
        for (let rack = 0; rack < 3; rack += 1) {
          put(1.1, 2.4, 0.9, solid(PALETTE.dark), room.x0 + 1.6 + rack * 1.2, 1.2, 6.45);
          for (let led = 0; led < 6; led += 1) leds.push(put(0.08, 0.08, 0.02, glow(led % 3 === 0 ? PALETTE.amber : screenGlow), room.x0 + 1.3 + rack * 1.2 + (led % 2) * 0.5, 0.6 + Math.floor(led / 2) * 0.6, 5.99));
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
        put(1.6, 1, 5.2, solid(metal), room.x1 - 2.6, 0.5, 0);
        addConsole(put(0.06, 0.9, 4.4, glow(screenColor), room.x1 - 3.42, 1.45, 0));
        put(0.9, 0.12, 0.9, solid(metalLight), room.x1 - 4.7, 0.6, 0);
        put(0.12, 0.9, 0.9, solid(metalLight), room.x1 - 5.1, 1.05, 0);
        put(0.3, 0.6, 0.3, solid(metal), room.x1 - 4.7, 0.3, 0);
        for (const side of [-1, 1]) {
          put(4, 1, 1.3, solid(metal), room.x0 + 4, 0.5, side * 6.25);
          put(3.4, 0.7, 0.06, glow(screenColor), room.x0 + 4, 1.5, side * 5.62);
        }
      } else if (room.kind === "support") {
        // Four culture tanks keep the air breathable.
        const glassMaterial = lambert(glass, { transparent: true, opacity: 0.25, depthWrite: false });
        const cultureMaterial = solid(dark ? "#2a3a2a" : PALETTE.culture);
        const bubbleMaterial = glow(tinted(PALETTE.culture, "#ffffff", 0.6));
        [2.6, 5.6, 8.4, 11.4].forEach((offset, tankIndex) => {
          const tx = room.x0 + offset;
          const level = [2.6, 3.0, 2.2, 2.8][tankIndex];
          cylinder(1.15, 1.15, 0.4, solid(metal), tx, y0 + 0.2, -5.4);
          cylinder(1.15, 1.15, 0.4, solid(metal), tx, y0 + 3.9, -5.4);
          cylinder(1, 1, 3.3, glassMaterial, tx, y0 + 2.05, -5.4, 12, true);
          cylinder(0.9, 0.9, level, cultureMaterial, tx, y0 + 0.4 + level / 2, -5.4, 12);
          put(0.2, room.height - 4.1, 0.2, solid(metalLight), tx, 4.1 + (room.height - 4.1) / 2, -5.4);
          const bubbles = [0, 1, 2, 3].map(() => inert(put(0.1, 0.1, 0.1, bubbleMaterial, tx, 0.5, -5.4)));
          animated.push((time) => {
            bubbles.forEach((bubble, bubbleIndex) => {
              bubble.visible = !dark;
              const rise = ((time * 0.0003) + bubbleIndex / 4 + tankIndex * 0.21) % 1;
              bubble.position.set(tx + Math.sin(rise * 9 + bubbleIndex) * 0.4, y0 + 0.5 + rise * (level - 0.2), -5.4 + Math.cos(bubbleIndex * 2.1) * 0.4);
            });
          });
        });
        // The atmosphere desk, the farmers' hydroponic shelves, and the recycler fan overhead.
        put(3.4, 1, 1.4, solid(metal), room.x0 + 6.7, 0.5, 5.7);
        addConsole(put(2.8, 0.8, 0.06, glow(screenColor), room.x0 + 6.7, 1.6, 4.97));
        for (const level of [0.5, 1.3, 2.1]) {
          put(3.8, 0.08, 0.6, solid(metalLight), room.x0 + 11.3, level, 6.55);
          if (dark) continue;
          for (let leaf = 0; leaf < 8; leaf += 1) {
            put(0.26, 0.24 + (leaf % 3) * 0.1, 0.3, solid(PALETTE.leaf), room.x0 + 9.75 + leaf * 0.45, level + 0.18, 6.5);
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
        board.position.set(room.x0 + 7, y0 + 2.1, -6.95);
        scene.add(board);
        addConsole(board);
        for (const by of [0.84, 3.36]) put(6.2, 0.14, 0.12, solid(PALETTE.wood), room.x0 + 7, by, -6.92);
        put(0.8, 1.2, 0.6, solid(PALETTE.wood), room.x0 + 7, 0.6, -5.1);
        for (const rowZ of [2, 3.6, 5.2]) {
          for (const deskX of [3, 5.67, 8.33, 11]) {
            put(1.6, 0.75, 0.6, solid(PALETTE.wood), room.x0 + deskX, 0.375, rowZ);
            put(0.5, 0.04, 0.32, glow(screenColor), room.x0 + deskX, 0.77, rowZ);
          }
        }
        // A globe of the world below, turning on its stand.
        put(0.12, 1.2, 0.12, solid(metalLight), room.x1 - 1.4, 0.6, -5.8);
        const globe = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), solid(tinted(accent, PALETTE.dark, 0.3))));
        globe.position.set(room.x1 - 1.4, y0 + 1.6, -5.8);
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
    const view = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHigh - windowLow), viewMaterial);
    view.position.set(endX + 0.1, y0 + (windowLow + windowHigh) / 2, 0);
    view.rotation.y = -Math.PI / 2;
    scene.add(view);
  });

  /** The recon dock: two pads, the ship that comes and goes, the people it carries, and the bay. */
  function buildDock(room: WalkCompartment, y0: number) {
    const { pad, parked, lounge, door, opening } = layout.dock;
    const put = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) =>
      box(w, h, d, material, x, y0 + y, z);
    const dark = !room.online;

    // Landing pads: a ring, a cross, and a dashed run-out towards the bay.
    for (const spot of [pad, parked]) {
      const ring = inert(new THREE.Mesh(new THREE.RingGeometry(2.7, 3, 24), glow(tinted(PALETTE.amber, PALETTE.dark, 0.35))));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(spot.x, y0 + 0.02, spot.z);
      scene.add(ring);
      put(3, 0.02, 0.16, glow(tinted(PALETTE.amber, PALETTE.dark, 0.5)), spot.x, 0.02, spot.z);
      put(0.16, 0.02, 3, glow(tinted(PALETTE.amber, PALETTE.dark, 0.5)), spot.x, 0.02, spot.z);
      for (let dash = 0; dash < 4; dash += 1) put(0.16, 0.02, 0.6, glow(tinted(PALETTE.amber, PALETTE.dark, 0.5)), spot.x, 0.02, spot.z + 3.6 + dash * 1);
    }

    // The bay: open to space behind a shimmering field, a lit sill, and the hull around it.
    const openWidth = opening.x1 - opening.x0;
    const openCx = (opening.x0 + opening.x1) / 2;
    const field = inert(new THREE.Mesh(new THREE.PlaneGeometry(openWidth, 4.7), ghost(liftGlow, 0.08)));
    field.position.set(openCx, y0 + 2.65, half - 0.05);
    scene.add(field);
    animated.push((time) => { (field.material as THREE.MeshBasicMaterial).opacity = 0.05 + (Math.floor(time / 160) % 3) * 0.02; });
    put(openWidth, 0.16, 0.3, glow(PALETTE.light), openCx, 0.3, half - 0.1);
    put(openWidth, 0.3, 0.3, solid(metalLight), openCx, 5, half - 0.1);
    const hullMaterial = bulkheadMaterial;
    const shipEnd = Math.max(...layout.decks.map((deck) => deck.length)) + 1;
    const hullZ = half + 0.25;
    box(opening.x0 + 1, 15, 0.4, hullMaterial, (opening.x0 - 1) / 2, 6, hullZ);
    box(shipEnd - opening.x1, 15, 0.4, hullMaterial, (opening.x1 + shipEnd) / 2, 6, hullZ);
    box(openWidth, 8.5, 0.4, hullMaterial, openCx, y0 + 5 + 4.25, hullZ);
    box(openWidth, 1.3, 0.4, hullMaterial, openCx, y0 - 0.35, hullZ);
    // Far outside: the world below, under the ship.
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(260, 112), viewMaterial);
    backdrop.position.set(openCx, y0 - 16, half + 80);
    backdrop.rotation.y = Math.PI;
    scene.add(backdrop);

    // The departure lounge, the launch desk (the console), and cargo waiting to go down.
    for (const bx of [lounge.x - 1, lounge.x + 1]) {
      put(1.8, 0.45, 0.6, solid(metalLight), bx, 0.225, -6.3);
      put(1.8, 0.6, 0.12, solid(metalLight), bx, 0.75, -6.62);
    }
    put(1.8, 1, 1.4, solid(metal), room.x1 - 3.3, 0.5, -6.15);
    const launchScreen = put(1.5, 0.7, 0.06, glow(dark ? PALETTE.dark : screenGlow), room.x1 - 3.3, 1.5, -5.42);
    interactables.push({ kind: "console", object: launchScreen, label: room.label, room: roomsByKind.get("hangar") ?? null, online: room.online, deck: 1 });
    [[1.6, 0.45, 3], [2.6, 0.45, 3], [2.1, 0.45, 4.2], [2.1, 1.35, 3.6]].forEach(([dx, dy, dz]) => {
      put(0.9, 0.9, 0.9, solid(PALETTE.wood), room.x1 - dx, dy, dz);
    });

    // Two recon ships: one parked for service, one that flies the round trip to the planet.
    const parkedShip = reconShip();
    parkedShip.group.position.set(parked.x, y0, parked.z);
    scene.add(parkedShip.group);
    label(parkedShip.group, "Recon ship · in for service");
    const serviceDrone = droneModel(PALETTE.amber);
    scene.add(serviceDrone);
    const flyer = reconShip();
    scene.add(flyer.group);
    label(flyer.group, "Recon ship · runs to the surface and back");
    animated.push((time) => {
      serviceDrone.position.set(parked.x + Math.cos(time * 0.0007) * 2.2, y0 + 2.6 + Math.sin(time * 0.0019) * 0.3, parked.z + Math.sin(time * 0.0007) * 2.2);
      serviceDrone.rotation.y = -time * 0.0007;
      const state = reconShipAt(time);
      flyer.group.visible = !state.away;
      flyer.group.position.set(pad.x, y0 + state.lift * 2.6 - state.out * 9, pad.z + state.out * 90);
      flyer.group.rotation.x = state.out * 0.25;
      flyer.ramp.rotation.x = state.docked ? 0.42 : -1.4;
      for (const leg of flyer.legs) leg.visible = state.lift < 0.4;
      const burn = state.docked ? 0.15 : 0.7 + hash(Math.floor(time / 60)) * 0.3;
      for (const engine of flyer.engines) engine.scale.setScalar(0.5 + burn * 0.7);
    });
    dynamicObstacles.push(() => {
      const state = reconShipAt(performance.now());
      return state.lift < 0.5 && state.out === 0 ? { x: pad.x, z: pad.z, radius: 2.6 + DRONE_RADIUS, deck: 1 } : null;
    });

    // The people it carries: a recon team boards from the lounge; survivors walk off when it returns.
    const rampFoot = { x: pad.x, z: pad.z - 3.6 };
    const hatch = { x: pad.x, z: pad.z - 2 };
    const travellers = ["security", "navigator", "researcher", "doctor"].map((role, index) => {
      const person = blockyPerson(`recon-team-${index}`, role);
      scene.add(person.group);
      label(person.group, "Recon team · boarding for the surface");
      return person;
    });
    const arrivals = ["farmer", "", "teacher", ""].map((role, index) => {
      const person = blockyPerson(`survivor-arrival-${index}`, role);
      scene.add(person.group);
      label(person.group, "Survivors · coming aboard");
      return person;
    });
    const along = (from: { x: number; z: number }, to: { x: number; z: number }, amount: number) => ({
      x: from.x + (to.x - from.x) * amount,
      z: from.z + (to.z - from.z) * amount,
    });
    animated.push((time) => {
      const t = ((time % DOCK_CYCLE_MS) + DOCK_CYCLE_MS) % DOCK_CYCLE_MS;
      travellers.forEach((person, index) => {
        const seat = { x: lounge.x - 1.5 + index, z: lounge.z - 0.6 };
        const start = 1200 + index * 1600;
        const progress = (t - start) / 3600;
        person.group.visible = progress < 1 && t < DOCK_PHASES.boardingEnds;
        if (progress <= 0) {
          person.group.position.set(seat.x, y0, seat.z);
          face(person.group, 0, 1);
          stride(person, 0, 0);
          return;
        }
        const leg = progress < 0.8 ? along(seat, rampFoot, progress / 0.8) : along(rampFoot, hatch, (progress - 0.8) / 0.2);
        const target = progress < 0.8 ? rampFoot : hatch;
        person.group.position.set(leg.x, y0 + (progress < 0.8 ? 0 : (progress - 0.8) * 2.5), leg.z);
        face(person.group, target.x - leg.x, target.z - leg.z);
        stride(person, time * 0.012, 0.5);
      });
      arrivals.forEach((person, index) => {
        const start = DOCK_PHASES.landEnds + 400 + index * 1100;
        const progress = (t - start) / 4200;
        person.group.visible = progress > 0 && progress < 1;
        if (!person.group.visible) return;
        const exit = { x: door.x + 0.4, z: door.z + (index - 1.5) * 0.6 };
        const leg = progress < 0.2 ? along(hatch, rampFoot, progress / 0.2) : along(rampFoot, exit, (progress - 0.2) / 0.8);
        const target = progress < 0.2 ? rampFoot : exit;
        person.group.position.set(leg.x, y0 + (progress < 0.2 ? (0.2 - progress) * 2.5 : 0), leg.z);
        face(person.group, target.x - leg.x, target.z - leg.z);
        stride(person, time * 0.012, 0.5);
      });
    });
  }

  function reconShip() {
    const group = new THREE.Group();
    const hull = solid(tinted(PALETTE.shuttle, accent, 0.1));
    const part = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    // The nose points +z, at the bay.
    part(2.2, 1.2, 4.6, hull, 0, 1.3, 0);
    part(1.6, 0.9, 1, hull, 0, 1.25, 2.7);
    part(1.5, 0.55, 1.3, glow(glass), 0, 2.05, 1.7);
    part(5.2, 0.14, 1.9, hull, 0, 1.15, -0.5);
    part(2.24, 0.12, 4.64, solid(PALETTE.stripe), 0, 1.05, 0);
    for (const side of [-1, 1]) part(0.16, 0.6, 1, solid(PALETTE.stripe), side * 2.6, 1.4, -0.8);
    part(0.14, 0.9, 1.2, hull, 0, 2.3, -1.7);
    const engines = [-0.7, 0.7].map((x) => {
      part(0.7, 0.7, 0.6, solid(metal), x, 1.3, -2.5);
      return part(0.5, 0.5, 0.05, glow(PALETTE.amber), x, 1.3, -2.83);
    });
    const legs = [[0, 1.6], [-0.9, -1.4], [0.9, -1.4]].map(([x, z]) => part(0.14, 0.7, 0.14, solid(metal), x, 0.35, z));
    // The boarding ramp folds down from the rear hatch.
    const ramp = new THREE.Group();
    ramp.position.set(0, 0.75, -2.3);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.8), solid(metalLight));
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

  // Grav-lifts: a column of light from the atrium floor up through each catwalk well.
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

  // ---- The Law-Heart, held in a containment vessel in the middle of the atrium. ----
  const spec = props.heart;
  const stage = Math.max(0, Math.min(HEART_RADII.length - 1, Math.round(spec.stage)));
  const heartRadius = HEART_RADII[stage];
  const vessel = new THREE.Group();
  vessel.position.set(heart.x, 0, heart.z);
  scene.add(vessel);
  interactables.push({ kind: "heart", object: vessel });
  const vesselPart = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    vessel.add(mesh);
    return mesh;
  };
  // Plinth, base, a glass wall between eight ribs, three magnetic bands, the cap and its conduit.
  vesselPart(new THREE.CylinderGeometry(PLINTH_HALF - 0.3, PLINTH_HALF, 0.8, 12), solid(metal), 0.4);
  vesselPart(new THREE.CylinderGeometry(3, 3.1, 0.6, 16), solid(metalLight), 1.1);
  vesselPart(
    new THREE.CylinderGeometry(VESSEL_RADIUS, VESSEL_RADIUS, 8.2, 20, 1, true),
    lambert(spec.limb, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    5.5,
  );
  for (let rib = 0; rib < 8; rib += 1) {
    // Offset half a step so no rib stands dead centre in the view from either doorway.
    const angle = ((rib + 0.5) / 8) * Math.PI * 2;
    const mesh = vesselPart(new THREE.BoxGeometry(0.24, 8.2, 0.34), solid(metal), 5.5);
    mesh.position.x = Math.cos(angle) * (VESSEL_RADIUS + 0.1);
    mesh.position.z = Math.sin(angle) * (VESSEL_RADIUS + 0.1);
    mesh.rotation.y = -angle;
  }
  const bands = [3, 5.5, 8].map((y) => {
    const band = vesselPart(
      new THREE.TorusGeometry(VESSEL_RADIUS + 0.18, 0.2, 6, 24),
      lambert(metalLight, { emissive: new THREE.Color(spec.bright), emissiveIntensity: 0.3 }),
      y,
    );
    band.rotation.x = Math.PI / 2;
    return band;
  });
  vesselPart(new THREE.CylinderGeometry(3, 3, 0.6, 16), solid(metalLight), 9.9);
  vesselPart(new THREE.CylinderGeometry(1, 1.4, chamberHeight - 10.2, 12), solid(metal), 10.2 + (chamberHeight - 10.2) / 2);
  // A striped hazard line on the floor around the plinth, and blinking warning lights.
  for (let sector = 0; sector < 16; sector += 1) {
    const stripe = inert(new THREE.Mesh(
      new THREE.RingGeometry(PLINTH_HALF + 0.25, PLINTH_HALF + 0.6, 2, 1, (sector / 16) * Math.PI * 2, Math.PI / 8),
      glow(sector % 2 === 0 ? PALETTE.amber : PALETTE.dark),
    ));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(heart.x, 0.02, heart.z);
    scene.add(stripe);
  }
  // The machines you build feed the heart: an injector for each Foundry tier, lit in its colour,
  // pouring a beam of its particles into the vessel.
  const feeds = machines.length > 0 ? machines : Array.from({ length: 6 }, () => ({ name: "Machine", count: 0, color: PALETTE.dark }));
  feeds.slice(0, 6).forEach((machine, tier) => {
    const angle = (tier / 6) * Math.PI * 2 + Math.PI / 6;
    const ix = Math.cos(angle);
    const iz = Math.sin(angle);
    const lit = machine.count > 0;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), solid(metal));
    housing.position.set(ix * 3.25, 1.3, iz * 3.25);
    housing.rotation.y = -angle;
    vessel.add(housing);
    label(housing, lit ? `${machine.name} feed · ${machine.count} built` : `${machine.name} feed · nothing built yet`);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.5), glow(lit ? machine.color : PALETTE.dark));
    lens.position.set(ix * 3.67, 1.3, iz * 3.67);
    lens.rotation.y = -angle;
    vessel.add(lens);
    if (!lit) return;
    const from = new THREE.Vector3(ix * VESSEL_RADIUS * 0.95, 1.6, iz * VESSEL_RADIUS * 0.95);
    const to = new THREE.Vector3(ix * heartRadius, 5.5 - heartRadius * 0.6, iz * heartRadius);
    const stream = inert(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, from.distanceTo(to)), ghost(machine.color, Math.min(0.8, 0.25 + Math.log2(machine.count + 1) * 0.08))));
    stream.position.copy(from).add(to).multiplyScalar(0.5);
    stream.lookAt(to);
    vessel.add(stream);
  });

  // The heart itself: its size and form follow the Law-Heart you have reached.
  const heartGroup = new THREE.Group();
  heartGroup.position.set(heart.x, heart.y, heart.z);
  scene.add(heartGroup);
  const shell = inert(new THREE.Mesh(
    new THREE.IcosahedronGeometry(heartRadius, stage >= 5 ? 1 : 0),
    new THREE.MeshLambertMaterial({
      color: spec.surface,
      emissive: spec.surface,
      emissiveIntensity: stage === 0 ? 0.05 : 0.3,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    }),
  ));
  const core = inert(new THREE.Mesh(new THREE.IcosahedronGeometry(heartRadius * 0.5, 0), new THREE.MeshBasicMaterial({ color: spec.core })));
  const halo = inert(new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(spec.surface), blending: THREE.AdditiveBlending, depthWrite: false, opacity: stage === 0 ? 0.3 : 1 })));
  halo.scale.setScalar(heartRadius * 4);
  heartGroup.add(halo, shell, core);
  // Corona shells, one per corona colour: more of them, and brighter, as the heart grows.
  const coronas = spec.corona.map((color, layer) => {
    const mesh = inert(new THREE.Mesh(
      new THREE.IcosahedronGeometry(heartRadius * (1.3 + layer * 0.16), 0),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: stage === 0 ? 0.15 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    ));
    heartGroup.add(mesh);
    return mesh;
  });
  // From the Axiomatic Star on, the heart grows spines.
  if (stage >= 4) {
    const spineCount = 6 + (stage - 4) * 4;
    const up = new THREE.Vector3(0, 1, 0);
    for (let spine = 0; spine < spineCount; spine += 1) {
      const y = 1 - (2 * (spine + 0.5)) / spineCount;
      const ring = Math.sqrt(1 - y * y);
      const theta = spine * 2.39996;
      const direction = new THREE.Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring);
      const cone = inert(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 4), new THREE.MeshBasicMaterial({ color: spec.bright })));
      cone.position.copy(direction).multiplyScalar(heartRadius * 1.05);
      cone.quaternion.setFromUnitVectors(up, direction);
      heartGroup.add(cone);
    }
  }
  // Axiom shards: one for each proven Axiom, orbiting inside the glass.
  const shardOrbit = new THREE.Group();
  shardOrbit.position.copy(heartGroup.position);
  scene.add(shardOrbit);
  const shardMaterial = new THREE.MeshBasicMaterial({ color: spec.shard });
  for (let shardIndex = 0; shardIndex < spec.shards; shardIndex += 1) {
    const shard = inert(new THREE.Mesh(new THREE.OctahedronGeometry(shardIndex % 4 === 0 ? 0.16 : 0.11, 0), shardMaterial));
    const angle = hash(shardIndex * 17.3) * Math.PI * 2;
    const radius = heartRadius + 0.5 + (shardIndex % 3) * 0.25;
    shard.position.set(Math.cos(angle) * radius, (hash(shardIndex * 5.1) - 0.5) * 1.6, Math.sin(angle) * radius);
    shardOrbit.add(shard);
  }
  // Particles from every machine you have built, each in its tier's colour, swirling round the heart.
  const weights = feeds.map((machine) => (machine.count > 0 ? Math.sqrt(machine.count) * 2.4 + 1 : 0));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const particleCount = weightTotal > 0 ? Math.min(380, Math.round(40 + weightTotal * 8)) : 24;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const orbits = Array.from({ length: particleCount }, (_, particle) => {
    let tier = 0;
    let pick = hash(particle * 7.171 + 4.13) * weightTotal;
    for (; tier < weights.length - 1 && pick > weights[tier]; tier += 1) pick -= weights[tier];
    const color = new THREE.Color(weightTotal > 0 ? feeds[tier].color : spec.shard);
    color.toArray(particleColors, particle * 3);
    return {
      radius: heartRadius * 1.15 + hash(particle * 3.7) * (VESSEL_RADIUS - 0.3 - heartRadius * 1.15),
      speed: (0.0004 + hash(particle * 9.1) * 0.0009) * (particle % 2 === 0 ? 1 : -1),
      phase: hash(particle * 1.3) * Math.PI * 2,
      height: (hash(particle * 5.9) - 0.5) * 3.6,
      wobble: hash(particle * 2.2) * 6,
    };
  });
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
  const particles = inert(new THREE.Points(particleGeometry, new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })));
  particles.position.copy(heartGroup.position);
  scene.add(particles);
  // The automation drones tending the heart circle the vessel in their programs' colours.
  const tending = spec.drones.slice(0, 8).map((program, droneIndex) => {
    const drone = droneModel(program.compromised ? PALETTE.alert : program.color);
    scene.add(drone);
    label(drone, program.compromised ? "Automation drone · compromised by the Null" : "Automation drone · tending the Law-Heart");
    return { drone, program, droneIndex };
  });
  const heartLight = new THREE.PointLight(spec.surface, stage === 0 ? 1 : 4, 16, 1.3);
  heartLight.position.copy(heartGroup.position);
  scene.add(heartLight);
  animated.push((time) => {
    core.rotation.set(time * 0.0007, -time * 0.0011, 0);
    coronas.forEach((mesh, layer) => {
      mesh.rotation.set(time * 0.0002 * (layer + 1), time * 0.0003 * (layer % 2 === 0 ? 1 : -1), 0);
    });
    shardOrbit.rotation.y = -time * 0.0004;
    orbits.forEach((orbit, particle) => {
      const angle = orbit.phase + time * orbit.speed;
      particlePositions[particle * 3] = Math.cos(angle) * orbit.radius;
      particlePositions[particle * 3 + 1] = orbit.height + Math.sin(angle * 2 + orbit.wobble) * 0.5;
      particlePositions[particle * 3 + 2] = Math.sin(angle) * orbit.radius;
    });
    particleGeometry.attributes.position.needsUpdate = true;
    tending.forEach(({ drone, program, droneIndex }) => {
      const direction = droneIndex % 2 === 0 ? 1 : -1;
      const angle = droneIndex * 1.7 + time * 0.00025 * (1 + (droneIndex % 3) * 0.2) * direction;
      const radius = 3.5 + (droneIndex % 3) * 0.35;
      drone.position.set(heart.x + Math.cos(angle) * radius, 2.6 + ((droneIndex * 1.3) % 6) + Math.sin(time * 0.002 + droneIndex) * 0.2, heart.z + Math.sin(angle) * radius);
      face(drone, -Math.sin(angle) * direction, Math.cos(angle) * direction);
      drone.visible = !program.compromised || Math.floor(time / 140 + droneIndex) % 5 !== 0;
    });
  });

  // ---- Crew at their stations; the first in each room paces a beat. ----
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
      lane = [2.2, -2.2].find((candidate) => span.every((x) => isWalkable(deck, x, candidate, 0.6))) ?? 0;
      laneOf.set(room.kind, lane);
    }
    const walking = count === 0;
    const spread = (room.x1 - room.x0 - 5) / 5;
    const x = room.x0 + 2.5 + spread * count;
    const away = lane > 0 ? -1 : 1;
    const z = walking ? lane : [away * 3.4, away * 4.6, -away * 4.6].find((candidate) => isWalkable(deck, x, candidate, 0.6));
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
        const along = forward ? t % 1 : 1 - (t % 1);
        person.group.position.x = from + span * along;
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
    ...crowd.map(({ person, deck }) => ({ x: person.group.position.x, z: person.group.position.z, radius: PERSON_RADIUS, deck })),
    ...dynamicObstacles.map((obstacle) => obstacle()).filter((obstacle): obstacle is Obstacle => obstacle !== null),
  ];

  return { interactables, animated, heartGroup, heartLight, bands, obstacles, stage };
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
    const space = new THREE.Color(PALETTE.space).lerp(new THREE.Color(initial.worldAccent || "#6a6290"), 0.05);
    scene.background = space;
    scene.fog = new THREE.Fog(space, 16, 60);
    scene.add(new THREE.AmbientLight("#8a84b8", 0.9));
    scene.add(new THREE.HemisphereLight(tinted("#c9b6ff", initial.worldAccent || "#c9b6ff", 0.3), "#3a2a1a", 0.6));

    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 220);
    const ship = buildShip(scene, layout, initial);
    const heart = layout.heart;
    const lookup = new Map(ship.interactables.map((item) => [item.object, item]));
    const heartTarget = ship.interactables.find((item) => item.kind === "heart") ?? null;

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
          // People and a docked ship are solid too: refuse any step that closes in on one.
          const nearby = ship.obstacles().filter((obstacle) => obstacle.deck === deckIndex);
          const clear = (next: { x: number; z: number }) => nearby.every((obstacle) => {
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

      // The Law-Heart beats; close enough and AXIOM hears it. Its bands flare on each beat.
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
      ship.heartGroup.scale.setScalar(1 + throb * 0.1 + strikeFlash * 0.2);
      ship.heartGroup.rotation.y += dt * 0.25;
      for (const band of ship.bands) {
        (band.material as THREE.MeshLambertMaterial).emissiveIntensity = (ship.stage === 0 ? 0.1 : 0.25) + throb * 0.9 + strikeFlash;
      }
      ship.heartLight.intensity = (ship.stage === 0 ? 1 : 4) + throb * 3 + strikeFlash * 4;
      const drone = { x, z, deck: deckIndex };
      for (const update of ship.animated) update(now, drone);

      // What is the drone looking at?
      // The first thing on the line of sight wins, so walls hide what is behind them.
      raycaster.setFromCamera(center, camera);
      const hit = raycaster.intersectObjects(scene.children, true)[0];
      target = null;
      const item = hit ? resolve(hit.object) : null;
      if (item && hit) {
        const reach = item.kind === "heart" ? 14 : item.kind === "console" ? 4.5 : 9;
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
      if (!target && heartTarget && facingTowards(heart.x - x, heart.z - z) > 0.9 && Math.hypot(heart.x - x, heart.y - eyeY, heart.z - z) <= 11) {
        // The heart sits above or below the drone; facing its vessel is enough to strike it.
        target = heartTarget;
      }
      standingLift = !travel && liftAt(layout, x, z) !== null;
      if (travel) setPrompt("");
      else if (standingLift) setPrompt(deckIndex === 0 ? `E · sink to the ${layout.decks[1].label.toLowerCase()}` : `E · rise to the ${layout.decks[0].label.toLowerCase()}`);
      else if (!target) setPrompt("");
      else if (target.kind === "heart") setPrompt(`E · strike ${propsRef.current.heart.name}`);
      else if (target.kind === "label") setPrompt(target.label);
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
