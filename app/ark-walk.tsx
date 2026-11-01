"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { ArkCutawayRoomKind } from "./ark-cutaway";
import { drawPixelWorldFrame } from "./ark-pixel-world";
import {
  buildWalkLayout,
  compartmentAt,
  DOOR_HALF_WIDTH,
  DOOR_HEIGHT,
  isWalkable,
  LIFT_RADIUS,
  liftAt,
  moveWithin,
  UPPER_FLOOR,
  type WalkCompartment,
  type WalkLayout,
  type WalkRoomKind,
} from "./ark-walk-layout";
import { AxiomEye } from "./axiom-eye";
import { CIVILIAN_COLOR, CREW_ROLE_COLORS, getCrewPortrait } from "./crew-portrait";
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

export type ArkWalkProps = {
  worldName: string;
  worldAccent: string;
  rooms: readonly ArkWalkRoom[];
  crew: readonly { id: string; name: string; role: string }[];
  heart: { name: string; core: string; surface: string; bright: string };
  beatPeriodMs: number;
  onStrike?: () => void;
  onClose: () => void;
};

const PIXEL_SCALE = 3;
const EYE_HEIGHT = 1.5;
const SPEED = 3.2;
const SPRINT = 5.6;
/** How close the drone may come to a crew member (its radius plus theirs). */
const CREW_RADIUS = 0.75;
const LIFT_SECONDS = 1.4;

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
  light: "#ffd27a",
  bunk: "#b5534a",
  wood: "#8a5a3a",
  culture: "#3f8f4a",
  leaf: "#5fae4e",
  shuttle: "#c9c1d6",
  stripe: "#b5534a",
  flame: "#ffb347",
  board: "#1f3a2e",
  chalk: "#e8f0e0",
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

/** A crew member as a standing pixel figure: their generated face on a body in their uniform. */
function crewFigure(id: string, role: string) {
  return canvasTexture(14, 28, (context) => {
    for (const run of getCrewPortrait({ id, role, rarity: "standard" })) {
      if (run.fill === "#4b4566" || run.fill === "#15131f") continue; // the portrait's frame
      context.fillStyle = run.fill;
      context.fillRect(run.x, run.y, run.w, 1);
    }
    context.fillStyle = CREW_ROLE_COLORS[role] ?? CIVILIAN_COLOR;
    context.fillRect(2, 17, 10, 4);
    context.fillStyle = "#1b1726";
    context.fillRect(2, 21, 10, 1);
    context.fillStyle = "#2b2433";
    context.fillRect(4, 22, 2, 5);
    context.fillRect(8, 22, 2, 5);
    context.fillStyle = "#14121f";
    context.fillRect(3, 27, 3, 1);
    context.fillRect(8, 27, 3, 1);
  });
}

function titleCase(role: string) {
  const display = role === "security" ? "soldier" : role;
  return display.charAt(0).toUpperCase() + display.slice(1);
}

type Interactable =
  | { kind: "console"; object: THREE.Object3D; label: string; room: ArkWalkRoom | null; online: boolean; deck: number }
  | { kind: "heart"; object: THREE.Object3D }
  | { kind: "crew"; object: THREE.Object3D; label: string };

type Walker = { sprite: THREE.Sprite; from: number; to: number; baseY: number; speed: number; phase: number };

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

/** Decorations the drone's line of sight passes straight through. */
function inert<T extends THREE.Object3D>(object: T) {
  object.raycast = () => {};
  return object;
}

function buildShip(scene: THREE.Scene, layout: WalkLayout, props: ArkWalkProps) {
  const interactables: Interactable[] = [];
  const animated: { update: (time: number) => void }[] = [];
  const roomsByKind = new Map(props.rooms.map((room) => [room.kind as string, room]));
  const accent = props.worldAccent || "#c9b6ff";
  const wallTone = tinted(PALETTE.wall, accent, 0.16);
  const metal = tinted(PALETTE.metal, accent, 0.12);
  const metalLight = tinted(PALETTE.metalLight, accent, 0.16);
  const screenGlow = tinted(accent, "#ffffff", 0.2);
  const glass = tinted(accent, "#ffffff", 0.5);
  const liftGlow = tinted(accent, "#ffffff", 0.35);

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

  const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
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
  /** A bar from one point to another, for struts and clamps. */
  const beam = (from: THREE.Vector3, to: THREE.Vector3, thickness: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, from.distanceTo(to)), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.lookAt(to);
    scene.add(mesh);
    return mesh;
  };

  const half = layout.halfDepth;
  const bulkheadMaterial = lambert(tinted(PALETTE.hull, accent, 0.18));
  const trimMaterial = lambert(metalLight);
  const heart = layout.heart;

  // What the windows look out on: stars and the current world turning. One picture
  // serves the bridge window and the hangar's bay field.
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
  animated.push({
    update: (time) => {
      if (time - lastPlanetDraw < 240) return;
      lastPlanetDraw = time;
      planetFrame += 1;
      drawPixelWorldFrame(planetContext, props.worldName, 0.5, planetFrame);
      viewContext.fillStyle = PALETTE.space;
      viewContext.fillRect(0, 0, 256, 110);
      viewContext.fillStyle = "#cfd3ff";
      for (const [x, y, size] of stars) viewContext.fillRect(x, y, size, size);
      viewContext.imageSmoothingEnabled = false;
      viewContext.drawImage(planetCanvas, 64, 20, 128 * 1.4, 128 * 1.4);
      viewTexture.needsUpdate = true;
    },
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
      // The chamber is one atrium drawn from the lower deck; upstairs only adds its catwalk.
      const atriumTop = room.kind === "chamber" && upper;

      if (!atriumTop) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), lambert("#ffffff", { map: repeated(floorTexture, width / 2, half) }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, y0, 0);
        scene.add(floor);
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, half * 2), lambert("#ffffff", { map: repeated(ceilingTexture, width / 2, half) }));
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(cx, y0 + room.height, 0);
        scene.add(ceiling);
        for (const side of [-1, 1]) {
          const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, room.height), lambert("#ffffff", { map: repeated(wallTexture, width / 2, room.height / 2) }));
          wall.position.set(cx, y0 + room.height / 2, side * half);
          if (side === 1) wall.rotation.y = Math.PI;
          scene.add(wall);
        }

        // Deck light: a strip down the ceiling and a warm lamp, or an emergency glow when dormant.
        if (!dark) {
          put(width - 1.2, 0.06, 0.3, glow(PALETTE.light), cx, room.height - 0.05, 0);
          const lamp = new THREE.PointLight(PALETTE.light, room.kind === "chamber" ? 10 : 9, room.kind === "chamber" ? 22 : 16, 1.2);
          lamp.position.set(cx, y0 + room.height - 0.6, 0);
          scene.add(lamp);
        } else {
          const emergency = new THREE.PointLight("#ff5e3a", 2.2, 10, 1.4);
          emergency.position.set(cx, y0 + room.height - 0.5, 0);
          scene.add(emergency);
          animated.push({ update: (time) => { emergency.intensity = 1.4 + Math.round(Math.sin(time * 0.003) + 1) * 0.6; } });
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
        put(0.5, 0.12, DOOR_HALF_WIDTH * 2 + 0.3, trimMaterial, wx, DOOR_HEIGHT + 0.06, 0);
        const sign = nextRoom.online ? "#5fd39a" : "#ff5e3a";
        put(0.52, 0.18, 0.18, glow(sign), wx, DOOR_HEIGHT + 0.35, 0);
      }

      // The room's furniture and its console.
      const consoleRoom = roomsByKind.get(room.kind) ?? null;
      const screenColor = dark ? "#1b1726" : screenGlow;
      const addConsole = (object: THREE.Object3D) =>
        interactables.push({ kind: "console", object, label: room.label, room: consoleRoom, online: room.online, deck: deckIndex });

      if (room.kind === "fabrication") {
        put(2.2, 2.2, 2.2, lambert(metal), room.x0 + 2.5, 1.1, -2.7);
        const piston = put(0.6, 1.2, 0.6, lambert(metalLight), room.x0 + 2.5, 2.8, -2.7);
        addConsole(put(1.2, 0.6, 0.06, glow(screenColor), room.x0 + 2.5, 1.4, -1.56));
        const belt = put(room.x1 - room.x0 - 5.4, 0.5, 1, lambert(metal), (room.x0 + 4.6 + room.x1 - 0.8) / 2, 0.5, 2.8);
        const crates = [0, 1, 2].map(() => put(0.5, 0.5, 0.5, lambert(PALETTE.wood), 0, 1, 2.8));
        const beltStart = room.x0 + 4.9;
        const beltLength = belt.geometry.parameters.width - 0.6;
        animated.push({
          update: (time) => {
            if (dark) return;
            piston.position.y = y0 + 2.8 - Math.abs(Math.sin(time * 0.0025)) * 0.5;
            crates.forEach((crate, crateIndex) => {
              crate.position.x = beltStart + (((time * 0.0006) + crateIndex / 3) % 1) * beltLength;
            });
          },
        });
      } else if (room.kind === "chamber" && !upper) {
        // The pedestal, four pillars the full height of the atrium, and clamps reaching to the heart.
        put(3, 0.4, 3, lambert(metalLight), cx, 0.2, 0);
        const clampMaterial = lambert(metalLight);
        const centre = new THREE.Vector3(heart.x, heart.y, heart.z);
        for (const px of [-4, 4]) {
          for (const pz of [-2.2, 2.2]) {
            put(0.4, room.height, 0.4, lambert(metal), cx + px, room.height / 2, pz);
            const from = new THREE.Vector3(cx + px, heart.y, pz);
            const to = centre.clone().add(from.clone().sub(centre).setLength(1.15));
            beam(from, to, 0.12, clampMaterial);
          }
        }
        const column = inert(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, heart.y - 1.4, 10, 1, true), ghost(props.heart.surface, 0.12)));
        column.position.set(heart.x, 0.4 + (heart.y - 1.4) / 2, heart.z);
        scene.add(column);
      } else if (atriumTop) {
        // The catwalk ringing the atrium, open at two corners for the grav-lifts.
        const atrium = layout.atrium;
        const plate = (x0: number, x1: number, z0: number, z1: number) => {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(x1 - x0, 0.25, z1 - z0),
            lambert("#ffffff", { map: repeated(floorTexture, (x1 - x0) / 2, (z1 - z0) / 2) }),
          );
          mesh.position.set((x0 + x1) / 2, y0 - 0.125, (z0 + z1) / 2);
          scene.add(mesh);
        };
        plate(room.x0, atrium.x0, atrium.z0, half);
        plate(atrium.x1, room.x1, -half, atrium.z1);
        plate(atrium.x0, atrium.x1, atrium.z1, half);
        plate(atrium.x0, atrium.x1, -half, atrium.z0);
        const rail = lambert(metalLight);
        for (const rz of [atrium.z0, atrium.z1]) {
          put(atrium.x1 - atrium.x0, 0.06, 0.06, rail, (atrium.x0 + atrium.x1) / 2, 1, rz);
          for (let px = atrium.x0 + 2; px < atrium.x1 - 1; px += 2) put(0.06, 1, 0.06, rail, px, 0.5, rz);
        }
        for (const rx of [atrium.x0, atrium.x1]) put(0.06, 0.06, atrium.z1 - atrium.z0, rail, rx, 1, 0);
        // Light the lips of the two lift wells.
        const rim = glow(liftGlow);
        put(atrium.x0 - room.x0, 0.05, 0.1, rim, (room.x0 + atrium.x0) / 2, 0.01, atrium.z0);
        put(0.1, 0.05, half + atrium.z0, rim, atrium.x0, 0.01, (atrium.z0 - half) / 2);
        put(room.x1 - atrium.x1, 0.05, 0.1, rim, (atrium.x1 + room.x1) / 2, 0.01, atrium.z1);
        put(0.1, 0.05, half - atrium.z1, rim, atrium.x1, 0.01, (atrium.z1 + half) / 2);
      } else if (room.kind === "habitation") {
        for (const level of [0.5, 1.4]) {
          put(4.2, 0.35, 1.3, lambert(PALETTE.bunk), room.x0 + 3, level, -3.2);
          put(0.6, 0.15, 1.1, lambert("#efe6d2"), room.x0 + 1.4, level + 0.25, -3.2);
        }
        put(0.15, 2, 1.3, lambert(metal), room.x0 + 0.9, 1, -3.2);
        addConsole(put(2.4, 0.15, 1.2, lambert(PALETTE.wood), room.x1 - 3, 0.8, 1.9));
        put(0.12, 0.8, 0.12, lambert(PALETTE.wood), room.x1 - 4, 0.4, 1.9);
        put(0.12, 0.8, 0.12, lambert(PALETTE.wood), room.x1 - 2, 0.4, 1.9);
      } else if (room.kind === "research") {
        put(room.x1 - room.x0 - 2.4, 1, 0.9, lambert(metal), cx, 0.5, -3.45);
        const screens = [-1, 0, 1].map((offset) => put(1.6, 0.9, 0.06, glow(screenColor), cx + offset * 2, 1.9, -3.9));
        addConsole(screens[1]);
        animated.push({
          update: (time) => {
            if (dark) return;
            screens.forEach((screen, screenIndex) => {
              screen.visible = Math.floor(time / 700 + screenIndex * 1.7) % 9 !== 0;
            });
          },
        });
      } else if (room.kind === "bridge") {
        put(1.2, 0.9, 2.8, lambert(metal), room.x1 - 2, 0.45, 0);
        addConsole(put(0.06, 0.5, 2.2, glow(screenColor), room.x1 - 2.62, 1.1, 0));
        put(0.8, 0.5, 0.8, lambert(metalLight), room.x1 - 3.4, 0.25, 0);
      } else if (room.kind === "support") {
        // Three culture tanks keep the air breathable; the atmosphere desk faces them.
        const glassMaterial = lambert(glass, { transparent: true, opacity: 0.28, depthWrite: false });
        const cultureMaterial = lambert(dark ? "#2a3a2a" : PALETTE.culture);
        const bubbleMaterial = glow(tinted(PALETTE.culture, "#ffffff", 0.6));
        [2.5, 5, 7.5].forEach((offset, tankIndex) => {
          const tx = room.x0 + offset;
          const level = [2.1, 2.4, 1.8][tankIndex];
          const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 10), lambert(metal));
          base.position.set(tx, y0 + 0.15, -2.95);
          const cap = base.clone();
          cap.position.y = y0 + 3.05;
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.6, 10, 1, true), glassMaterial);
          tank.position.set(tx, y0 + 1.6, -2.95);
          const culture = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, level, 10), cultureMaterial);
          culture.position.set(tx, y0 + 0.3 + level / 2, -2.95);
          scene.add(base, cap, tank, culture);
          put(0.15, room.height - 3.2, 0.15, lambert(metalLight), tx, 3.2 + (room.height - 3.2) / 2, -2.95);
          const bubbles = [0, 1, 2].map(() => inert(put(0.09, 0.09, 0.09, bubbleMaterial, tx, 0.4, -2.95)));
          animated.push({
            update: (time) => {
              bubbles.forEach((bubble, bubbleIndex) => {
                bubble.visible = !dark;
                const rise = ((time * 0.00035) + bubbleIndex / 3 + tankIndex * 0.21) % 1;
                bubble.position.set(tx + Math.sin(rise * 9 + bubbleIndex) * 0.3, y0 + 0.4 + rise * (level - 0.2), -2.95 + Math.cos(bubbleIndex * 2.1) * 0.3);
              });
            },
          });
        });
        put(2, 0.9, 0.9, lambert(metal), room.x0 + 5, 0.45, 3.45);
        addConsole(put(1.6, 0.6, 0.06, glow(screenColor), room.x0 + 5, 1.3, 3.05));
        // Hydroponic shelves along the far wall: the farmers' crop.
        for (const level of [0.6, 1.5]) {
          put(2.6, 0.08, 0.3, lambert(metalLight), room.x0 + 2, level, 3.8);
          if (dark) continue;
          for (let leaf = 0; leaf < 6; leaf += 1) {
            put(0.22, 0.25 + (leaf % 3) * 0.08, 0.2, lambert(PALETTE.leaf), room.x0 + 0.95 + leaf * 0.42, level + 0.17, 3.8);
          }
        }
      } else if (room.kind === "education") {
        // A chalkboard, a lectern and two rows of desks.
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(4.4, 2),
          lambert("#ffffff", {
            map: canvasTexture(44, 20, (context) => {
              context.fillStyle = PALETTE.board;
              context.fillRect(0, 0, 44, 20);
              context.fillStyle = PALETTE.chalk;
              for (const [lx, ly, lw] of [[3, 3, 14], [3, 6, 20], [3, 9, 9], [26, 3, 12], [26, 7, 6], [3, 13, 16], [24, 12, 2], [27, 12, 2], [30, 12, 2], [27, 15, 9]]) {
                context.fillRect(lx, ly, lw, 1);
              }
            }),
          }),
        );
        board.position.set(room.x0 + 5, y0 + 1.7, -3.95);
        scene.add(board);
        addConsole(board);
        for (const by of [0.66, 2.74]) put(4.6, 0.12, 0.1, lambert(PALETTE.wood), room.x0 + 5, by, -3.92);
        put(0.6, 1.1, 0.5, lambert(PALETTE.wood), room.x0 + 5, 0.55, -2.65);
        for (const rowZ of [1.65, 2.95]) {
          for (const deskX of [3.2, 5, 6.8]) {
            put(1.2, 0.72, 0.5, lambert(PALETTE.wood), room.x0 + deskX, 0.36, rowZ);
            put(0.4, 0.04, 0.28, glow(dark ? "#1b1726" : screenGlow), room.x0 + deskX, 0.74, rowZ);
          }
        }
      } else if (room.kind === "hangar") {
        // The shuttle, a launch desk, and a bay field holding back space.
        const hull = lambert(tinted(PALETTE.shuttle, accent, 0.1));
        const sz = -2.2;
        put(4.2, 1.1, 2, hull, room.x0 + 4.2, 1.05, sz);
        put(0.8, 0.8, 1.5, hull, room.x0 + 6.6, 0.95, sz);
        put(1, 0.4, 1.2, glow(glass), room.x0 + 5.6, 1.75, sz);
        put(1.2, 0.08, 2.4, hull, room.x0 + 3.6, 1, sz);
        put(4.2, 0.08, 2.02, lambert(PALETTE.stripe), room.x0 + 4.2, 0.8, sz);
        put(0.1, 0.6, 1, glow(PALETTE.flame), room.x0 + 2.05, 1.05, sz);
        for (const strutX of [3, 5.4]) put(0.15, 0.5, 0.15, lambert(metal), room.x0 + strutX, 0.25, sz);
        put(1.2, 0.9, 0.8, lambert(metal), room.x1 - 1.8, 0.45, 2.4);
        addConsole(put(1, 0.5, 0.06, glow(screenColor), room.x1 - 1.8, 1.2, 2.0));
        const bay = new THREE.Mesh(new THREE.PlaneGeometry(width - 2, 3), viewMaterial);
        bay.position.set(cx, y0 + 1.8, half - 0.04);
        bay.rotation.y = Math.PI;
        scene.add(bay);
        const field = inert(new THREE.Mesh(new THREE.PlaneGeometry(width - 2, 3), ghost(liftGlow, 0.1)));
        field.position.set(cx, y0 + 1.8, half - 0.1);
        scene.add(field);
        animated.push({ update: (time) => { (field.material as THREE.MeshBasicMaterial).opacity = 0.06 + (Math.floor(time / 160) % 3) * 0.025; } });
        put(width - 1.8, 0.15, 0.15, glow(PALETTE.light), cx, 0.25, half - 0.12);
        put(width - 1.8, 0.15, 0.15, lambert(metalLight), cx, 3.35, half - 0.12);
      }
    });

    // The end of each deck: the bridge window upstairs, the hull behind the hangar below.
    const last = deck.compartments[deck.compartments.length - 1];
    const endX = last.x1 + 0.2;
    if (!upper) {
      put(0.4, UPPER_FLOOR, half * 2, bulkheadMaterial, endX, UPPER_FLOOR / 2, 0);
      return;
    }
    const windowWidth = 5.6;
    const windowLow = 1;
    const windowHigh = 3.4;
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

  // Grav-lifts: a column of light from the atrium floor up through each catwalk well.
  const liftHeight = UPPER_FLOOR + 4.6;
  for (const lift of layout.lifts) {
    const shaft = inert(new THREE.Mesh(new THREE.CylinderGeometry(LIFT_RADIUS, LIFT_RADIUS, liftHeight, 12, 1, true), ghost(liftGlow, 0.07)));
    shaft.position.set(lift.x, liftHeight / 2, lift.z);
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
    animated.push({
      update: (time) => {
        rings.forEach((ring, ringIndex) => {
          ring.position.y = (((time * 0.00025) + ringIndex * 0.5) % 1) * liftHeight;
        });
      },
    });
  }

  // The Law-Heart, beating in the middle of the atrium at the pulse tempo.
  const heartGroup = new THREE.Group();
  heartGroup.position.set(heart.x, heart.y, heart.z);
  // A faceted crystal lit by the chamber, its bright core showing through, shards in orbit.
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({
      color: props.heart.surface,
      emissive: props.heart.surface,
      emissiveIntensity: 0.3,
      flatShading: true,
      transparent: true,
      opacity: 0.86,
    }),
  );
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: props.heart.bright }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.05, 6, 32), new THREE.MeshBasicMaterial({ color: props.heart.bright, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(props.heart.surface), blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(4, 4, 1);
  const shards = new THREE.Group();
  const shardMaterial = new THREE.MeshBasicMaterial({ color: props.heart.bright });
  for (let index = 0; index < 4; index += 1) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), shardMaterial);
    const angle = (index / 4) * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 1.45, (index % 2 ? 0.35 : -0.3), Math.sin(angle) * 1.45);
    shards.add(shard);
  }
  for (const decoration of [halo, ...shards.children]) inert(decoration);
  heartGroup.add(halo, shell, core, ring, shards);
  scene.add(heartGroup);
  animated.push({
    update: (time) => {
      core.rotation.set(time * 0.0007, -time * 0.0011, 0);
      shards.rotation.y = -time * 0.0009;
    },
  });
  const heartLight = new THREE.PointLight(props.heart.surface, 3, 8, 1.4);
  heartLight.position.copy(heartGroup.position);
  scene.add(heartLight);
  const heartTarget: Interactable = { kind: "heart", object: shell };
  interactables.push(heartTarget);

  // Crew at their stations; one per room paces a short beat.
  const crew: { sprite: THREE.Sprite; deck: number }[] = [];
  const walkers: Walker[] = [];
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
    const deck = layout.decks[place.deck];
    const count = used.get(room.kind) ?? 0;
    if (count >= 5) continue;
    used.set(room.kind, count + 1);
    // The first in each room paces a side lane clear of furniture; the rest stand further out.
    // The centre line from door to door stays open for the drone.
    let lane = laneOf.get(room.kind);
    if (lane === undefined) {
      const span = Array.from({ length: 12 }, (_, step) => room.x0 + 2 + (step / 11) * (room.x1 - room.x0 - 5.2));
      lane = [1.2, -1.2].find((candidate) => span.every((x) => isWalkable(deck, x, candidate, 0.5))) ?? 0;
      laneOf.set(room.kind, lane);
    }
    const walking = count === 0;
    const spread = (room.x1 - room.x0 - 4.5) / 4;
    const x = room.x0 + 2.5 + spread * count;
    const away = lane > 0 ? -1 : 1;
    const z = walking ? lane : [away * 1.8, away * 2.6, -away * 2.6].find((candidate) => isWalkable(deck, x, candidate, 0.5));
    if (z === undefined) continue;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: crewFigure(member.id, member.role), alphaTest: 0.5 }));
    const baseY = deck.floorY + 0.86;
    sprite.scale.set(0.86, 1.72, 1);
    sprite.position.set(x, baseY, z);
    scene.add(sprite);
    crew.push({ sprite, deck: place.deck });
    interactables.push({ kind: "crew", object: sprite, label: `${member.name} · ${titleCase(member.role)}` });
    if (walking) {
      walkers.push({ sprite, from: room.x0 + 2, to: room.x1 - 3.2, baseY, speed: 0.55 + (member.id.length % 3) * 0.1, phase: member.id.length });
    }
  }
  animated.push({
    update: (time) => {
      for (const walker of walkers) {
        const span = walker.to - walker.from;
        const t = ((time / 1000) * walker.speed) / span + walker.phase;
        const along = t % 2 < 1 ? t % 1 : 1 - (t % 1);
        walker.sprite.position.x = walker.from + span * along;
        walker.sprite.position.y = walker.baseY + (Math.floor(time / 180) % 2) * 0.03;
      }
    },
  });

  return { interactables, animated, heartGroup, heartTarget, ring, crew };
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
    scene.fog = new THREE.Fog(space, 7, 30);
    scene.add(new THREE.AmbientLight("#8a84b8", 0.9));
    scene.add(new THREE.HemisphereLight(tinted("#c9b6ff", initial.worldAccent || "#c9b6ff", 0.3), "#3a2a1a", 0.6));

    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
    const ship = buildShip(scene, layout, initial);
    const heart = layout.heart;

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
    raycaster.far = 8;
    const center = new THREE.Vector2(0, 0);
    const interactObjects = ship.interactables.map((item) => item.object);
    const consolePosition = new THREE.Vector3();
    const period = Math.max(600, initial.beatPeriodMs);
    let lastBeat = -1;
    let previous = performance.now();
    let frame = 0;

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
          // Crew are solid too: refuse any step that closes in on someone, sliding past if possible.
          const clearOfCrew = (next: { x: number; z: number }) => ship.crew.every(({ sprite, deck: crewDeck }) => {
            if (crewDeck !== deckIndex) return true;
            const after = Math.hypot(next.x - sprite.position.x, next.z - sprite.position.z);
            return after >= CREW_RADIUS || after >= Math.hypot(x - sprite.position.x, z - sprite.position.z);
          });
          const step = [moveWithin(deck, x, z, dx, dz, 0.35), moveWithin(deck, x, z, dx, 0, 0.35), moveWithin(deck, x, z, 0, dz, 0.35)]
            .find(clearOfCrew);
          if (step) ({ x, z } = step);
        }
        eyeY = deck.floorY + EYE_HEIGHT;
      }
      const hover = reducedMotion ? 0 : Math.sin(now * 0.002) * 0.03;
      camera.position.set(x, eyeY + hover, z);
      camera.rotation.set(pitch, yaw - Math.PI / 2, 0, "YXZ");

      // The Law-Heart beats; close enough and AXIOM hears it.
      const sincePeriod = now % period;
      const beatIndex = Math.floor(now / period);
      if (beatIndex !== lastBeat) {
        lastBeat = beatIndex;
        if (Math.hypot(x - heart.x, eyeY - heart.y, z - heart.z) < 10) schedulePulseBeat(now, 0.3);
      }
      const lub = Math.exp(-sincePeriod / 110);
      const dub = sincePeriod > 170 ? 0.45 * Math.exp(-(sincePeriod - 170) / 90) : 0;
      strikeFlash = Math.max(0, strikeFlash - dt * 3);
      const throb = reducedMotion ? 0 : lub + dub;
      ship.heartGroup.scale.setScalar(1 + throb * 0.12 + strikeFlash * 0.25);
      ship.heartGroup.rotation.y += dt * 0.25;
      ship.ring.scale.setScalar(reducedMotion ? 1 : 1.8 - 0.8 * (sincePeriod / period));
      (ship.ring.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * (sincePeriod / period);
      for (const item of ship.animated) item.update(now);

      // What is the drone looking at?
      // The first thing on the line of sight wins, so walls hide what is behind them.
      raycaster.setFromCamera(center, camera);
      const hit = raycaster.intersectObjects(scene.children, true).find((candidate) => candidate.object !== ship.ring);
      target = null;
      if (hit && interactObjects.includes(hit.object)) {
        const item = ship.interactables.find((candidate) => candidate.object === hit.object) ?? null;
        const reach = item?.kind === "heart" ? 6 : 3.4;
        if (item && hit.distance <= reach) target = item;
      }
      const facingTowards = (toX: number, toZ: number) =>
        (toX * Math.cos(yaw) - toZ * Math.sin(yaw)) / Math.max(Math.hypot(toX, toZ), 0.001);
      if (!target) {
        // Desks sit below eye level: standing close and facing one is enough to use it.
        let nearest = 2.8;
        for (const item of ship.interactables) {
          if (item.kind !== "console" || item.deck !== deckIndex) continue;
          item.object.getWorldPosition(consolePosition);
          const distance = Math.hypot(consolePosition.x - x, consolePosition.z - z);
          if (distance < nearest && facingTowards(consolePosition.x - x, consolePosition.z - z) > 0.8) {
            nearest = distance;
            target = item;
          }
        }
      }
      if (!target && facingTowards(heart.x - x, heart.z - z) > 0.9 && Math.hypot(heart.x - x, heart.y - eyeY, heart.z - z) <= 6.5) {
        // The heart floats above or below the drone; facing it is enough to strike.
        target = ship.heartTarget;
      }
      standingLift = !travel && liftAt(layout, x, z) !== null;
      if (travel) setPrompt("");
      else if (standingLift) setPrompt(deckIndex === 0 ? `E · sink to the ${layout.decks[1].label.toLowerCase()}` : `E · rise to the ${layout.decks[0].label.toLowerCase()}`);
      else if (!target) setPrompt("");
      else if (target.kind === "heart") setPrompt(`E · strike ${propsRef.current.heart.name}`);
      else if (target.kind === "crew") setPrompt(target.label);
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
