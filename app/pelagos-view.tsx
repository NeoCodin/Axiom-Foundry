"use client";

/*
 * Pelagos on the ground, for the prototype: the drowned district drawn from
 * pelagos-rules, seen two ways. Overhead, AXIOM plans: pan and zoom over the
 * district, pick a structure and click a tile to build it. On the ground, a
 * maintenance drone flies the streets in first person to strip wrecks and answer
 * survivors' signals, and its link to AXIOM thins the further it gets from the
 * Lawheart's dome: the bar drains, snow climbs over the picture, and at nothing the
 * drone flies itself home. Tab switches between the two; Q goes back to the Ark.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { playBulkhead, playNullStatic, playRecordFound, unlockPulseAudio } from "./law-heart-audio";
import { pelagosCues, type LyraCue, type PelagosReading } from "./lyra-voice";
import {
  answerSignal,
  BREACHES,
  createPelagos,
  demolish,
  derive,
  floodable,
  index,
  inReach,
  LAWHEART,
  linkAt,
  objective,
  place,
  placementProblem,
  reclaimed,
  restore,
  room,
  salvageByHand,
  serialize,
  SHELTER,
  SIZE,
  step,
  STRUCTURE_ORDER,
  STRUCTURES,
  structureAt,
  TILE,
  viability,
  type Derived,
  type Ground,
  type PelagosState,
  type StructureKind,
} from "./pelagos-rules";
import "./pelagos.css";

const SAVE_KEY = "axiom-foundry-pelagos-prototype-v1";
const PIXEL_SCALE = 3;
/** The drone hovers this far above whatever is under it, and flies this fast. */
const HOVER = 1.8;
const FLY = 7;
const HURRY = 11;
/** How long the picture holds on snow before a drone with no link flies itself home. */
const RECALL_SECONDS = 1.8;
/** How deep the ground's columns go under the sea. */
const BASE = -4;

type Mode = "overhead" | "drone";

const GROUND: Record<Ground, string> = {
  sea: "#2f3d44",
  street: "#4a4e55",
  marsh: "#56553f",
  block: "#7d8287",
  ruin: "#5e5952",
  plaza: "#4c4852",
  hill: "#66744c",
  cliff: "#5c5f58",
  embankment: "#8a8476",
};
/** Low ground once the sea has given it back: mud. */
const RECLAIMED = "#6f5f43";
const GROUND_NAMES: Record<Ground, string> = {
  sea: "Open sea",
  street: "Drowned street",
  marsh: "Marsh",
  block: "Rooftop",
  ruin: "Fallen block",
  plaza: "The old plaza",
  hill: "The shelter's hill",
  cliff: "Cliff",
  embankment: "Old embankment",
};

function hash(value: number) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** The middle of a tile, in metres. */
const middle = (x: number, y: number) => ({ x: (x + 0.5) * TILE, z: (y + 0.5) * TILE });

export type PelagosViewProps = {
  /** Back to the Ark. */
  onLeave: () => void;
  /** Lyra, in AXIOM's ear: told what changes, she decides what to warn of. */
  lyra?: { cue(cue: LyraCue, n?: number): void };
};

export default function PelagosView({ onLeave, lyra }: PelagosViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const staticRef = useRef<HTMLCanvasElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);
  const linkTextRef = useRef<HTMLSpanElement>(null);
  const objectiveRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDListElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const lostRef = useRef<HTMLDivElement>(null);
  const leaveRef = useRef(onLeave);
  leaveRef.current = onLeave;
  const lyraRef = useRef(lyra);
  lyraRef.current = lyra;
  const [mode, setMode] = useState<Mode>("overhead");
  const [tool, setTool] = useState<StructureKind | null>(null);
  const controlRef = useRef<{ tool: (kind: StructureKind | null) => void } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const root = rootRef.current;
    const noise = staticRef.current?.getContext("2d") ?? null;
    if (!mount || !root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const load = () => {
      try {
        return restore(window.localStorage.getItem(SAVE_KEY));
      } catch {
        return null;
      }
    };
    const saved = load();
    let state: PelagosState = saved ?? createPelagos();
    let derived: Derived = derive(state);
    const save = () => {
      try {
        window.localStorage.setItem(SAVE_KEY, serialize(state));
      } catch {
        // Storage blocked: the district starts over next time.
      }
    };

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const sky = new THREE.Color("#56646f");
    scene.background = sky;
    scene.fog = new THREE.Fog(sky, 45, 135);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
    scene.add(new THREE.HemisphereLight("#c3ccd4", "#2b3035", 1.25));
    const sun = new THREE.DirectionalLight("#e6ecf2", 0.7);
    sun.position.set(-30, 60, 25);
    scene.add(sun);
    const resize = () => {
      const width = Math.max(1, Math.floor(mount.clientWidth / PIXEL_SCALE));
      const height = Math.max(1, Math.floor(mount.clientHeight / PIXEL_SCALE));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const solidCache = new Map<string, THREE.MeshLambertMaterial>();
    const solid = (color: string) => {
      let material = solidCache.get(color);
      if (!material) {
        material = new THREE.MeshLambertMaterial({ color, flatShading: true });
        solidCache.set(color, material);
      }
      return material;
    };
    const glow = (color: string) => new THREE.MeshBasicMaterial({ color });
    const ghost = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    const surface = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return 0;
      const at = index(x, y);
      return state.flooded[at] ? 0 : Math.max(0, state.tiles[at].height);
    };

    // ---- The ground: columns for low ground, buildings for the drowned blocks. ----
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const lowTiles = state.tiles.flatMap((tile, at) => (tile.ground === "block" ? [] : [at]));
    const terrain = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 1, TILE), new THREE.MeshLambertMaterial({ flatShading: true }), lowTiles.length);
    const terrainOf = new Map<number, number>();
    const groundColor = (at: number) => {
      const tile = state.tiles[at];
      const base = floodable(tile) && tile.ground !== "sea" && !state.flooded[at] ? RECLAIMED : GROUND[tile.ground];
      return color.set(base).offsetHSL(0, 0, (hash(at) - 0.5) * 0.05);
    };
    lowTiles.forEach((at, instance) => {
      const tile = state.tiles[at];
      const { x, z } = middle(at % SIZE, Math.floor(at / SIZE));
      matrix.makeScale(1, tile.height - BASE, 1);
      matrix.setPosition(x, (tile.height + BASE) / 2, z);
      terrain.setMatrixAt(instance, matrix);
      terrain.setColorAt(instance, groundColor(at));
      terrainOf.set(at, instance);
    });
    scene.add(terrain);
    const windows = (() => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#7b8085";
      context.fillRect(0, 0, 16, 16);
      context.fillStyle = "#30353b";
      for (const wy of [3, 10]) for (const wx of [2, 9]) context.fillRect(wx, wy, 5, 4);
      context.fillStyle = "#6c7176";
      context.fillRect(0, 15, 16, 1);
      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const pickables: THREE.Object3D[] = [terrain];
    for (let column = 0; column < 3; column += 1) {
      for (let row = 0; row < 6; row += 1) {
        const x0 = 16 + column * 6;
        const y0 = 2 + row * 6;
        const tile = state.tiles[index(x0, y0)];
        if (tile.ground !== "block") continue;
        const tall = tile.height - BASE;
        const side = windows.clone();
        side.repeat.set(4, tall / 2);
        side.needsUpdate = true;
        const wall = new THREE.MeshLambertMaterial({ map: side, flatShading: true, color: new THREE.Color().setHSL(0.58, 0.04, 0.62 + hash(column * 9 + row) * 0.18) });
        const roof = solid(hash(column + row * 5) > 0.5 ? "#6f7478" : "#787268");
        const block = new THREE.Mesh(new THREE.BoxGeometry(4 * TILE, tall, 4 * TILE), [wall, wall, roof, roof, wall, wall]);
        block.position.set((x0 + 2) * TILE, (tile.height + BASE) / 2, (y0 + 2) * TILE);
        scene.add(block);
        pickables.push(block);
        // Roof clutter: tanks and plant left where the water could not reach.
        for (let piece = 0; piece < 3; piece += 1) {
          const seed = column * 31 + row * 7 + piece;
          const px = (x0 + 0.8 + hash(seed) * 2.4) * TILE;
          const pz = (y0 + 0.8 + hash(seed + 3) * 2.4) * TILE;
          if (piece === 0) add(scene, new THREE.CylinderGeometry(0.7, 0.7, 1.4, 8), solid("#5d6267"), px, tile.height + 0.7, pz);
          else add(scene, new THREE.BoxGeometry(1.2, 0.8, 0.9), solid("#686d70"), px, tile.height + 0.4, pz);
        }
      }
    }
    // Beyond the district: the open sea to the east, the land the cliffs hold up everywhere else.
    const farSea = add(scene, new THREE.PlaneGeometry(400, 600), solid("#3a5866"), SIZE * TILE + 200, -0.2, SIZE);
    farSea.rotation.x = -Math.PI / 2;
    for (const [w, d, x, z] of [[400, 200, SIZE - 120, -100], [400, 200, SIZE - 120, SIZE * TILE + 100], [200, SIZE * TILE, -100, SIZE]] as const) {
      const land = add(scene, new THREE.PlaneGeometry(w, d), solid("#4d5149"), x, 2, z);
      land.rotation.x = -Math.PI / 2;
    }

    // ---- The water: one slab per low tile, shown while it is under water. ----
    const waterTiles = state.tiles.flatMap((tile, at) => (floodable(tile) ? [at] : []));
    const waterMaterial = new THREE.MeshLambertMaterial({ color: "#3d5c69", transparent: true, opacity: 0.86, flatShading: true });
    const water = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 0.3, TILE), waterMaterial, waterTiles.length);
    const waterOf = new Map(waterTiles.map((at, instance) => [at, instance]));
    const shownWet: boolean[] = [];
    const drawWater = () => {
      let changed = false;
      for (const at of waterTiles) {
        const wet = state.flooded[at];
        if (shownWet[at] === wet) continue;
        shownWet[at] = wet;
        changed = true;
        const { x, z } = middle(at % SIZE, Math.floor(at / SIZE));
        matrix.makeScale(wet ? 1 : 0, wet ? 1 : 0, wet ? 1 : 0);
        matrix.setPosition(x, -0.15, z);
        water.setMatrixAt(waterOf.get(at)!, matrix);
        const instance = terrainOf.get(at);
        if (instance !== undefined) terrain.setColorAt(instance, groundColor(at));
      }
      if (changed) {
        water.instanceMatrix.needsUpdate = true;
        if (terrain.instanceColor) terrain.instanceColor.needsUpdate = true;
      }
    };
    drawWater();
    scene.add(water);

    // ---- The Null over everything outside the reach, and the dome where the laws hold. ----
    const nullMaterial = new THREE.MeshBasicMaterial({ color: "#26142f", transparent: true, opacity: 0.42, depthWrite: false });
    const nullGeometry = new THREE.PlaneGeometry(TILE, TILE);
    nullGeometry.rotateX(-Math.PI / 2);
    const nullCover = new THREE.InstancedMesh(nullGeometry, nullMaterial, SIZE * SIZE);
    scene.add(nullCover);
    const domes = new THREE.Group();
    scene.add(domes);
    const domeColor = "#cbbdff";
    let reachKey = "";
    const drawReach = () => {
      const key = derived.reach.map((source) => `${source.x},${source.y},${source.r}`).join("|") + `:${state.flooded.filter(Boolean).length}`;
      if (key === reachKey) return;
      const domesChanged = !reachKey.startsWith(key.split(":")[0] + ":");
      reachKey = key;
      for (let at = 0; at < SIZE * SIZE; at += 1) {
        const x = at % SIZE;
        const y = Math.floor(at / SIZE);
        const outside = !inReach(derived, x, y);
        const { x: mx, z: mz } = middle(x, y);
        matrix.makeScale(outside ? 1 : 0, 1, outside ? 1 : 0);
        matrix.setPosition(mx, surface(x, y) + 0.08, mz);
        nullCover.setMatrixAt(at, matrix);
      }
      nullCover.instanceMatrix.needsUpdate = true;
      if (!domesChanged) return;
      domes.traverse((object) => (object as THREE.Mesh).geometry?.dispose());
      domes.clear();
      for (const source of derived.reach) {
        const { x, z } = middle(source.x, source.y);
        const radius = (source.r + 0.5) * TILE;
        add(domes, new THREE.SphereGeometry(radius, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), ghost(domeColor, 0.06), x, 0, z);
        const edge = add(domes, new THREE.TorusGeometry(radius, 0.12, 4, 64), ghost(domeColor, 0.7), x, 0.35, z);
        edge.rotation.x = Math.PI / 2;
      }
    };

    // ---- What stood here before: the shelter, the Lawheart the drone brought down, the old city's heart. ----
    const shelterMiddle = { x: ((SHELTER.x0 + SHELTER.x1 + 1) / 2) * TILE, z: ((SHELTER.y0 + SHELTER.y1 + 1) / 2) * TILE };
    add(scene, new THREE.BoxGeometry(4.2, 3.2, 6.2), solid("#8a8e90"), shelterMiddle.x, 2 + 1.6, shelterMiddle.z);
    add(scene, new THREE.BoxGeometry(4.6, 0.3, 6.6), solid("#6a6e70"), shelterMiddle.x, 2 + 3.35, shelterMiddle.z);
    add(scene, new THREE.BoxGeometry(0.1, 1.6, 1.2), glow("#ffd9a0"), shelterMiddle.x + 2.12, 2 + 0.8, shelterMiddle.z);
    const heartAt = middle(LAWHEART.x, LAWHEART.y);
    add(scene, new THREE.CylinderGeometry(0.9, 1.2, 1.4, 8), solid("#3a3a48"), heartAt.x, 2 + 0.7, heartAt.z);
    const star = add(scene, new THREE.SphereGeometry(0.75, 16, 12), glow("#fff1c9"), heartAt.x, 2 + 2.6, heartAt.z);
    const corona = add(scene, new THREE.SphereGeometry(1.15, 16, 12), ghost("#ffd27a", 0.3), heartAt.x, 2 + 2.6, heartAt.z);
    const gimbal = add(scene, new THREE.TorusGeometry(1.5, 0.08, 6, 32), solid("#7f77dd"), heartAt.x, 2 + 2.6, heartAt.z);
    const gimbalTwo = add(scene, new THREE.TorusGeometry(1.5, 0.08, 6, 32), solid("#7f77dd"), heartAt.x, 2 + 2.6, heartAt.z);
    const wellAt = { x: 24 * TILE, z: 22 * TILE };
    add(scene, new THREE.CylinderGeometry(2.6, 3.4, 16, 12, 1, true), ghost("#120818", 0.75), wellAt.x, 7, wellAt.z);
    const shards = new THREE.Group();
    shards.position.set(wellAt.x, 0, wellAt.z);
    scene.add(shards);
    for (let shard = 0; shard < 9; shard += 1) {
      const piece = add(shards, new THREE.BoxGeometry(0.5, 1.6, 0.2), ghost("#7a4fb0", 0.55), Math.cos(shard * 0.7) * 4.4, 2 + shard * 1.3, Math.sin(shard * 0.7) * 4.4);
      piece.rotation.set(shard, shard * 2, 0);
    }
    // The breaches, marked until they are walled.
    const breachMarks = BREACHES.map(({ x, y }) => {
      const { x: mx, z: mz } = middle(x, y);
      const mark = add(scene, new THREE.RingGeometry(0.55, 0.85, 4), ghost("#f0b45a", 0.8), mx, 0.12, mz);
      mark.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
      return { x, y, mark };
    });

    // ---- What AXIOM builds. ----
    type Built = { group: THREE.Group; run: (on: boolean, time: number) => void };
    const builds = new Map<string, Built>();
    const keyOf = (kind: StructureKind, x: number, y: number) => `${kind}@${x},${y}`;
    const build = (kind: StructureKind, x: number, y: number): Built => {
      const group = new THREE.Group();
      const { x: mx, z: mz } = middle(x, y);
      const wet = floodable(state.tiles[index(x, y)]);
      group.position.set(mx, wet ? 0 : Math.max(0, state.tiles[index(x, y)].height), mz);
      scene.add(group);
      let run: Built["run"] = () => {};
      switch (kind) {
        case "seawall": {
          const stone = add(group, new THREE.BoxGeometry(TILE, 2.4, TILE), solid("#8c897f"), 0, 0.1, 0);
          add(group, new THREE.BoxGeometry(TILE, 0.12, 0.3), glow("#d9a14a"), 0, 1.33, 0);
          run = (on) => { stone.material = solid(on ? "#8c897f" : "#5a4f5e"); };
          break;
        }
        case "pump": {
          add(group, new THREE.BoxGeometry(1.3, 1.1, 1.3), solid("#6b7177"), 0, 0.55, 0);
          add(group, new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6), solid("#8a9096"), 0.5, 1.4, 0);
          const wheel = add(group, new THREE.CylinderGeometry(0.5, 0.5, 0.12, 8), solid("#d9a14a"), 0, 1.16, 0);
          run = (on, time) => { if (on) wheel.rotation.y = time * 0.006; };
          break;
        }
        case "turbine": {
          add(group, new THREE.CylinderGeometry(0.16, 0.22, 4.4, 6), solid("#9aa0a6"), 0, 2.2, 0);
          add(group, new THREE.BoxGeometry(0.9, 0.5, 0.5), solid("#c6c9cc"), 0, 4.4, 0);
          const rotor = new THREE.Group();
          rotor.position.set(0.5, 4.4, 0);
          group.add(rotor);
          for (let blade = 0; blade < 3; blade += 1) {
            const arm = add(rotor, new THREE.BoxGeometry(0.08, 2, 0.22), solid("#e2e4e6"), 0, 0, 0);
            arm.geometry.translate(0, 1, 0);
            arm.rotation.x = (blade * Math.PI * 2) / 3;
          }
          run = (on, time) => { if (on) rotor.rotation.x = time * 0.002; };
          break;
        }
        case "rig": {
          for (const side of [-0.8, 0.8]) add(group, new THREE.BoxGeometry(0.18, 3, 0.18), solid("#b08a3e"), side, 1.5, 0);
          add(group, new THREE.BoxGeometry(1.9, 0.2, 0.25), solid("#b08a3e"), 0, 3, 0);
          const hook = add(group, new THREE.BoxGeometry(0.3, 0.3, 0.3), solid("#5d6166"), 0, 1.8, 0);
          run = (on, time) => { hook.position.y = on ? 1.6 + Math.sin(time * 0.003) * 0.6 : 2.6; };
          break;
        }
        case "purifier": {
          add(group, new THREE.CylinderGeometry(0.75, 0.75, 1.7, 10), solid("#a7adb2"), 0, 0.85, 0);
          const band = add(group, new THREE.CylinderGeometry(0.78, 0.78, 0.16, 10), glow("#a9c8ff"), 0, 1.2, 0);
          run = (on) => { band.visible = on; };
          break;
        }
        case "kelp": {
          for (let strip = 0; strip < 3; strip += 1) add(group, new THREE.BoxGeometry(1.6, 0.06, 0.32), solid("#4f7a3a"), 0, 0.05, -0.6 + strip * 0.6);
          for (const corner of [-0.8, 0.8]) add(group, new THREE.SphereGeometry(0.14, 6, 4), solid("#e07a3a"), corner, 0.12, 0.8);
          break;
        }
        case "relay": {
          add(group, new THREE.CylinderGeometry(0.08, 0.12, 4.6, 6), solid("#9aa0a6"), 0, 2.3, 0);
          add(group, new THREE.BoxGeometry(1.2, 0.08, 0.08), solid("#9aa0a6"), 0, 3.8, 0);
          const lamp = add(group, new THREE.SphereGeometry(0.16, 6, 4), glow(domeColor), 0, 4.7, 0);
          run = (on, time) => { lamp.visible = on && Math.floor(time / 700) % 2 === 0; };
          break;
        }
        case "habitat": {
          add(group, new THREE.BoxGeometry(1.8, 1.5, 1.8), solid("#a59d8c"), 0, 0.75, 0);
          const roof = add(group, new THREE.ConeGeometry(1.45, 0.8, 4), solid("#7b5e48"), 0, 1.9, 0);
          roof.rotation.y = Math.PI / 4;
          const lit = add(group, new THREE.BoxGeometry(0.5, 0.4, 0.05), glow("#ffd9a0"), 0, 0.9, 0.93);
          run = (on) => { lit.visible = on; };
          break;
        }
      }
      return { group, run };
    };
    const disposeGroup = (group: THREE.Object3D) => {
      const shared = new Set<THREE.Material>(solidCache.values());
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) if (!shared.has(material)) material.dispose();
      });
      group.removeFromParent();
    };
    const drawBuilds = (time: number) => {
      const live = new Set<string>();
      state.structures.forEach((structure, at) => {
        const key = keyOf(structure.kind, structure.x, structure.y);
        live.add(key);
        let built = builds.get(key);
        if (!built) {
          built = build(structure.kind, structure.x, structure.y);
          builds.set(key, built);
        }
        built.run(derived.running.has(at), time);
      });
      for (const [key, built] of builds) {
        if (live.has(key)) continue;
        disposeGroup(built.group);
        builds.delete(key);
      }
      for (const { x, y, mark } of breachMarks) mark.visible = !state.structures.some((structure) => structure.kind === "seawall" && structure.x === x && structure.y === y);
    };

    // ---- Wrecks to strip, and the survivors' lights on the rooftops. ----
    const wrecks = state.deposits.map((deposit, at) => {
      const group = new THREE.Group();
      const { x, z } = middle(deposit.x, deposit.y);
      group.position.set(x, 0, z);
      scene.add(group);
      for (let piece = 0; piece < 3; piece += 1) {
        const hull = add(group, new THREE.BoxGeometry(1.1 + hash(at + piece) * 0.6, 0.6, 0.7), solid(piece === 1 ? "#59524b" : "#6e4a36"), (piece - 1) * 0.5, 0.15 + piece * 0.12, (hash(at * 3 + piece) - 0.5) * 0.6);
        hull.rotation.set(hash(piece) * 0.4, hash(at + piece * 2) * 3, hash(at) * 0.3);
      }
      const glint = add(group, new THREE.BoxGeometry(0.18, 0.18, 0.18), glow("#ffc25a"), 0, 0.8, 0);
      return { group, glint };
    });
    const flares = state.signals.map((signal) => {
      const group = new THREE.Group();
      const { x, z } = middle(signal.x, signal.y);
      group.position.set(x, Math.max(0, state.tiles[index(signal.x, signal.y)].height), z);
      scene.add(group);
      add(group, new THREE.BoxGeometry(0.42, 0.8, 0.3), solid("#d0682e"), 0, 0.4, 0);
      add(group, new THREE.BoxGeometry(0.3, 0.3, 0.3), solid("#e2b48c"), 0, 0.95, 0);
      const light = add(group, new THREE.BoxGeometry(0.2, 0.2, 0.2), glow("#ff7a50"), 0.35, 1.3, 0);
      const beam = add(group, new THREE.CylinderGeometry(0.18, 0.18, 34, 6, 1, true), ghost("#ffb080", 0.22), 0, 17, 0);
      return { group, light, beam };
    });

    // ---- The drone, the rain, and the hover mark. ----
    const drone = new THREE.Group();
    add(drone, new THREE.BoxGeometry(0.7, 0.28, 0.7), solid("#c8cbd0"), 0, 0, 0);
    add(drone, new THREE.BoxGeometry(0.2, 0.12, 0.2), glow("#c9b6ff"), 0, 0.05, 0.38);
    for (const [rx, rz] of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) add(drone, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), ghost("#e6e8ea", 0.5), rx, 0.16, rz);
    scene.add(drone);
    const drops = reducedMotion ? 0 : 520;
    const rainPositions = new Float32Array(drops * 6);
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: "#c2ccd4", transparent: true, opacity: 0.35 }));
    rain.frustumCulled = false;
    scene.add(rain);
    const rainSeed = Array.from({ length: drops }, (_, drop) => ({ x: hash(drop) * 80 - 40, y: hash(drop + 0.5) * 40, z: hash(drop + 0.25) * 80 - 40 }));
    const hover = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 0, -1), new THREE.Vector3(1, 0, 1), new THREE.Vector3(-1, 0, 1)]),
      new THREE.LineBasicMaterial({ color: "#f2e6b0" }),
    );
    hover.visible = false;
    scene.add(hover);

    // ---- Control. ----
    let modeNow: Mode = "overhead";
    let toolNow: StructureKind | null = null;
    const keys = new Set<string>();
    const target = { x: heartAt.x + 8, z: heartAt.z };
    let height = 46;
    let yaw = 0;
    let pitch = -0.1;
    let droneY = surface(Math.floor(state.drone.x), Math.floor(state.drone.y)) + HOVER;
    let lostSince: number | null = null;
    let pointer: { x: number; y: number } | null = null;
    let hovered: { x: number; y: number } | null = null;
    let messageUntil = 0;
    const raycaster = new THREE.Raycaster();
    const locked = () => document.pointerLockElement === renderer.domElement;
    const say = (text: string, seconds = 3.2) => {
      if (!messageRef.current) return;
      messageRef.current.textContent = text;
      messageRef.current.hidden = false;
      messageUntil = performance.now() + seconds * 1000;
    };
    const chooseTool = (kind: StructureKind | null) => {
      toolNow = kind;
      setTool(kind);
    };
    controlRef.current = { tool: chooseTool };
    const switchMode = (next: Mode) => {
      modeNow = next;
      setMode(next);
      keys.clear();
      hover.visible = false;
      if (next === "overhead") {
        if (locked()) document.exitPointerLock();
        target.x = state.drone.x * TILE;
        target.z = state.drone.y * TILE;
      } else {
        chooseTool(null);
        droneY = surface(Math.floor(state.drone.x), Math.floor(state.drone.y)) + HOVER;
        Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {});
      }
    };
    const recall = () => {
      state.drone = { x: LAWHEART.x + 2.5, y: LAWHEART.y + 0.5 };
      yaw = 0;
      pitch = -0.1;
      droneY = surface(LAWHEART.x + 2, LAWHEART.y) + HOVER;
      say("Link lost. The drone flew itself back to the dome.", 4);
    };
    /** What the drone can reach from where it is: a wreck to strip, or a signal to answer. */
    const nearby = () => {
      const close = (x: number, y: number, range: number) => Math.hypot(state.drone.x - (x + 0.5), state.drone.y - (y + 0.5)) <= range;
      const signal = state.signals.find((candidate) => !candidate.arrived && close(candidate.x, candidate.y, 3)) ?? null;
      const deposit = state.deposits.find((candidate) => candidate.left > 0 && close(candidate.x, candidate.y, 2.5)) ?? null;
      return { signal, deposit };
    };
    const use = () => {
      const { signal, deposit } = nearby();
      if (signal) {
        const answer = answerSignal(state, derived, signal);
        if (answer === "answered") {
          playRecordFound();
          say(`Signal answered. ${signal.people} people will follow the light to the shelter.`, 4);
        } else if (answer === "weak") {
          playNullStatic(0.6);
          say("The link is too weak to answer from here. Carry the reach closer with a relay.", 4);
        }
        return;
      }
      if (deposit) {
        const taken = salvageByHand(state, deposit);
        if (taken > 0) {
          playBulkhead();
          say(`Stripped ${Math.round(taken)} salvage from the wreck.`);
        }
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
      const key = event.key.toLowerCase();
      unlockPulseAudio();
      if (key === "tab") {
        event.preventDefault();
        switchMode(modeNow === "overhead" ? "drone" : "overhead");
        return;
      }
      if (key === "q") {
        event.preventDefault();
        save();
        if (locked()) document.exitPointerLock();
        leaveRef.current();
        return;
      }
      if (key === "h") {
        state.pushed = !state.pushed;
        playBulkhead();
        say(state.pushed ? "The Lawheart is pushed: twice the power, and the Null presses in. Walls at the edge may fail." : "The Lawheart is steady again. The dome opens back out.", 4.5);
        return;
      }
      if (modeNow === "overhead") {
        if (/^[1-8]$/.test(key)) {
          const kind = STRUCTURE_ORDER[Number(key) - 1];
          chooseTool(toolNow === kind ? null : kind);
          return;
        }
        if (key === "escape") chooseTool(null);
      } else if (key === "e" && !event.repeat) {
        use();
        return;
      }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();
    const tileAtPointer = () => {
      if (!pointer) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1), camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (!hit) return null;
      const point = hit.point.clone().addScaledVector(raycaster.ray.direction, 0.01);
      const x = Math.floor(point.x / TILE);
      const y = Math.floor(point.z / TILE);
      return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? { x, y } : null;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (modeNow === "drone") {
        if (!locked()) return;
        yaw -= event.movementX * 0.0025;
        pitch = Math.max(-1.25, Math.min(1.1, pitch - event.movementY * 0.0025));
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
    };
    const onMouseDown = (event: MouseEvent) => {
      unlockPulseAudio();
      if (modeNow === "drone") {
        if (!locked()) Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {});
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      const tile = tileAtPointer();
      if (!tile) return;
      if (event.button === 2) {
        if (demolish(state, tile.x, tile.y)) {
          playBulkhead();
          say("Taken down. Half its salvage came back.");
        }
        return;
      }
      if (event.button !== 0) return;
      if (!toolNow) {
        say(describe(tile.x, tile.y), 3.5);
        return;
      }
      const problem = place(state, toolNow, tile.x, tile.y);
      if (problem) {
        say(problem);
        return;
      }
      playBulkhead();
      say(`${STRUCTURES[toolNow].label} built.`);
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onWheel = (event: WheelEvent) => {
      if (modeNow !== "overhead") return;
      event.preventDefault();
      height = Math.max(20, Math.min(85, height * (event.deltaY > 0 ? 1.1 : 1 / 1.1)));
    };
    /** A tile, as AXIOM would describe it. */
    const describe = (x: number, y: number) => {
      const at = index(x, y);
      const tile = state.tiles[at];
      const built = structureAt(state, x, y);
      const parts = [GROUND_NAMES[tile.ground]];
      if (floodable(tile) && tile.ground !== "sea") parts.push(state.flooded[at] ? "under water" : "reclaimed");
      if (built) {
        const running = derived.running.has(state.structures.indexOf(built));
        const stranded = built.kind === "kelp" && !state.flooded[at];
        parts.push(`${STRUCTURES[built.kind].label}${!running ? (built.kind === "seawall" ? " (not holding)" : " (offline)") : stranded ? " (stranded on dry ground)" : ""}`);
      }
      parts.push(inReach(derived, x, y) ? "inside the reach" : "in the Null");
      return parts.join(" · ");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // ---- The heads-up display, written straight to the page a few times a second. ----
    let hudAt = 0;
    const drawHud = (link: number) => {
      const bar = linkRef.current;
      if (bar) {
        bar.style.setProperty("--link", link.toFixed(3));
        bar.dataset.state = link > 0.6 ? "good" : link > 0.25 ? "weak" : "critical";
      }
      if (linkTextRef.current) linkTextRef.current.textContent = modeNow === "drone" ? `${Math.round(link * 100)}%` : "Overhead";
      if (objectiveRef.current) objectiveRef.current.textContent = objective(state, derived);
      const stats = statsRef.current;
      if (stats) {
        const rows: [string, string][] = [
          ["Salvage", `${Math.floor(state.salvage)}`],
          ["Power", `${derived.demand} / ${derived.supply}`],
          ["Water", state.water <= 0 ? "None" : state.water.toFixed(1)],
          ["Food", state.food <= 0 ? "None" : state.food.toFixed(1)],
          ["People", `${state.survivors} / ${room(state, derived)}`],
          ["Ground reclaimed", `${reclaimed(state)}`],
          ["Viable", `${viability(state, derived)}%`],
          ["Lawheart", state.pushed ? "Pushed (H)" : "Steady (H)"],
        ];
        stats.replaceChildren(...rows.flatMap(([name, value]) => {
          const term = document.createElement("dt");
          term.textContent = name;
          const detail = document.createElement("dd");
          detail.textContent = value;
          if ((name === "Water" && state.water <= 0) || (name === "Food" && state.food <= 0) || (name === "Lawheart" && state.pushed)) detail.dataset.alert = "true";
          return [term, detail];
        }));
      }
    };
    const drawPrompt = (link: number) => {
      const prompt = promptRef.current;
      if (!prompt) return;
      let text = "";
      if (modeNow === "overhead") {
        if (hovered) {
          if (toolNow) {
            const problem = placementProblem(state, derived, toolNow, hovered.x, hovered.y);
            text = `${STRUCTURES[toolNow].label} · ${STRUCTURES[toolNow].cost} salvage · ${problem ?? "click to build"}`;
          } else {
            text = describe(hovered.x, hovered.y);
          }
        }
      } else {
        const { signal, deposit } = nearby();
        if (signal) text = signal.answered ? "They've seen the light. They're on their way." : link >= 0.25 ? "E · answer the signal" : "The link's too weak to answer from here.";
        else if (deposit) text = `E · strip the wreck (${Math.round(deposit.left)} salvage left)`;
        else if (link < 1) text = link > 0.25 ? "Outside the dome: the link fades the further out you go." : "Link failing. Turn back.";
      }
      prompt.textContent = text;
    };
    const drawStatic = (amount: number) => {
      const canvas = staticRef.current;
      if (!canvas || !noise) return;
      canvas.style.opacity = amount.toFixed(3);
      if (amount < 0.02) return;
      const image = noise.createImageData(canvas.width, canvas.height);
      for (let at = 0; at < image.data.length; at += 4) {
        const level = Math.random() * 255;
        image.data[at] = level;
        image.data[at + 1] = level * 0.94;
        image.data[at + 2] = level * 1.08;
        image.data[at + 3] = 255;
      }
      noise.putImageData(image, 0, 0);
    };

    // QA sandbox only (?qa=1): drive the district from the console.
    const qa = new URLSearchParams(window.location.search).has("qa");
    if (qa) {
      (window as unknown as { pelagosQa?: unknown }).pelagosQa = {
        state: () => state,
        derived: () => derived,
        place: (kind: StructureKind, x: number, y: number) => place(state, kind, x, y),
        mode: (next: Mode) => switchMode(next),
        drone: (x: number, y: number, look = yaw, tilt = pitch) => {
          state.drone = { x, y };
          yaw = look;
          pitch = tilt;
          droneY = surface(Math.floor(x), Math.floor(y)) + HOVER;
        },
        overhead: (x: number, z: number, high = height) => {
          target.x = x;
          target.z = z;
          height = high;
        },
        run: (seconds: number) => {
          for (let at = 0; at < seconds * 10; at += 1) derived = step(state, 0.1);
        },
        reset: () => {
          state = createPelagos();
          derived = derive(state);
        },
        use,
      };
    }

    let frame = 0;
    let previous = performance.now();
    let savedAt = previous;
    lyraRef.current?.cue(saved ? "return-pelagos" : "arrive-pelagos");
    /** The district as Lyra last saw it, so she speaks only of what changed. */
    let lyraReading: PelagosReading | null = null;
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      derived = step(state, dt);
      if (now - savedAt > 10_000) {
        savedAt = now;
        save();
      }
      const forward = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      const strafe = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      let link = 1;
      if (modeNow === "overhead") {
        // AXIOM's own view: pan over the district, looking down at it.
        const pan = height * 0.9 * dt;
        target.x = Math.max(0, Math.min(SIZE * TILE + 10, target.x + strafe * pan));
        target.z = Math.max(0, Math.min(SIZE * TILE, target.z - forward * pan));
        camera.position.set(target.x, height, target.z + height * 0.62);
        camera.lookAt(target.x, 0, target.z);
        drone.visible = true;
        drone.position.set(state.drone.x * TILE, droneY, state.drone.y * TILE);
        hovered = tileAtPointer();
        hover.visible = hovered !== null;
        if (hovered) {
          const { x, z } = middle(hovered.x, hovered.y);
          hover.position.set(x, surface(hovered.x, hovered.y) + 0.2, z);
          (hover.material as THREE.LineBasicMaterial).color.set(toolNow && placementProblem(state, derived, toolNow, hovered.x, hovered.y) ? "#e46a5a" : "#f2e6b0");
        }
      } else {
        // The drone on the ground: it flies the streets and rises over whatever is under it.
        drone.visible = false;
        if (forward || strafe) {
          const length = Math.hypot(forward, strafe);
          const speed = (keys.has("shift") ? HURRY : FLY) * dt / TILE;
          const fx = Math.cos(yaw);
          const fz = -Math.sin(yaw);
          state.drone.x = Math.max(0.5, Math.min(SIZE + 4, state.drone.x + ((forward * fx) + (strafe * -fz)) / length * speed));
          state.drone.y = Math.max(0.5, Math.min(SIZE - 0.5, state.drone.y + ((forward * fz) + (strafe * fx)) / length * speed));
        }
        const ahead = { x: Math.floor(state.drone.x + Math.cos(yaw) * 0.7), y: Math.floor(state.drone.y - Math.sin(yaw) * 0.7) };
        const below = Math.max(surface(Math.floor(state.drone.x), Math.floor(state.drone.y)), surface(ahead.x, ahead.y));
        droneY += (below + HOVER - droneY) * Math.min(1, dt * 6);
        link = linkAt(derived, state.drone.x, state.drone.y);
        const shake = reducedMotion ? 0 : (1 - link) * 0.02;
        camera.position.set(state.drone.x * TILE, droneY + Math.sin(now * 0.002) * 0.04, state.drone.y * TILE);
        camera.rotation.set(pitch + (Math.random() - 0.5) * shake, yaw - Math.PI / 2 + (Math.random() - 0.5) * shake, 0, "YXZ");
        if (link <= 0) {
          if (lostSince === null) {
            lostSince = now;
            playNullStatic(1);
          }
          if (now - lostSince > RECALL_SECONDS * 1000) {
            lostSince = null;
            recall();
          }
        } else {
          lostSince = null;
        }
      }
      if (lostRef.current) lostRef.current.hidden = lostSince === null;
      // Lyra watches the link and the shelter.
      const { signal } = modeNow === "drone" ? nearby() : { signal: null };
      const reading: PelagosReading = {
        link: modeNow === "drone" ? link : null,
        inDome: modeNow !== "drone" || link >= 1,
        lost: lostSince !== null,
        pushed: state.pushed,
        failingWalls: state.structures.filter((structure, at) => structure.kind === "seawall" && !derived.running.has(at)).length,
        water: state.water,
        food: state.food,
        survivors: state.survivors,
        signalNear: Boolean(signal && !signal.answered),
      };
      for (const said of pelagosCues(lyraReading, reading)) lyraRef.current?.cue(said.cue, said.n);
      lyraReading = reading;
      // Light snow at first, thick only as the link nears nothing.
      drawStatic(modeNow === "drone" ? (lostSince !== null ? 0.92 : Math.min(0.9, (1 - link) ** 1.6 * 0.95)) : 0);
      drawWater();
      drawReach();
      drawBuilds(now);
      // The district's own motion: the Lawheart beats, wrecks glint, signals flare, the Null breathes.
      const beat = now % 1300;
      const throb = reducedMotion ? 0 : Math.exp(-beat / 120) + (beat > 190 ? 0.5 * Math.exp(-(beat - 190) / 100) : 0);
      star.scale.setScalar(1 + throb * 0.12 * (state.pushed ? 1.6 : 1));
      corona.scale.setScalar(1 + throb * 0.2);
      gimbal.rotation.set(now * 0.0007, now * 0.0011, 0);
      gimbalTwo.rotation.set(-now * 0.0009, 0, now * 0.0006);
      shards.rotation.y = now * 0.0003;
      nullMaterial.opacity = 0.38 + Math.sin(now * 0.0016) * 0.06 + (state.pushed ? 0.08 : 0);
      state.deposits.forEach((deposit, at) => {
        const wreck = wrecks[at];
        wreck.group.visible = deposit.left > 0;
        wreck.group.scale.setScalar(0.45 + 0.55 * (deposit.left / deposit.full));
        wreck.glint.visible = Math.floor(now / 600 + at) % 3 !== 0;
      });
      state.signals.forEach((signal, at) => {
        const flare = flares[at];
        flare.group.visible = !signal.arrived;
        flare.light.visible = Math.floor(now / 450) % 2 === 0;
        (flare.beam.material as THREE.MeshBasicMaterial).color.set(signal.answered ? "#fff1c9" : "#ffb080");
      });
      if (drops > 0) {
        const around = modeNow === "drone" ? camera.position : new THREE.Vector3(target.x, 0, target.z);
        rainSeed.forEach((drop, at) => {
          drop.y -= dt * 24;
          if (drop.y < -2) drop.y += 42;
          const x = around.x + drop.x;
          const z = around.z + drop.z;
          const base = at * 6;
          rainPositions[base] = x;
          rainPositions[base + 1] = drop.y;
          rainPositions[base + 2] = z;
          rainPositions[base + 3] = x + 0.12;
          rainPositions[base + 4] = drop.y + 0.9;
          rainPositions[base + 5] = z;
        });
        rainGeometry.attributes.position.needsUpdate = true;
      }
      if (now - hudAt > 200) {
        hudAt = now;
        drawHud(link);
      }
      drawPrompt(link);
      if (messageRef.current && !messageRef.current.hidden && now > messageUntil) messageRef.current.hidden = true;
      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      save();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("wheel", onWheel);
      if (locked()) document.exitPointerLock();
      if (qa) delete (window as unknown as { pelagosQa?: unknown }).pelagosQa;
      controlRef.current = null;
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) {
          (material as THREE.MeshLambertMaterial).map?.dispose();
          material.dispose();
        }
      });
      windows.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={rootRef} className="pelagos" data-mode={mode} role="dialog" aria-modal="true" aria-label="Pelagos: reclaiming the drowned district">
      <div ref={mountRef} className="pelagos-view" />
      <canvas ref={staticRef} className="pelagos-static" width={160} height={90} aria-hidden="true" />
      <div className="pelagos-left">
        <section className="pelagos-card pelagos-drone">
          <strong>Maintenance drone 03 · Pelagos</strong>
          <small>{mode === "drone" ? "On the ground" : "Overhead, planning"}</small>
          <div ref={linkRef} className="pelagos-link" data-state="good">
            <span>Link</span>
            <span className="pelagos-link-bar"><i /></span>
            <span ref={linkTextRef}>Overhead</span>
          </div>
        </section>
        <p ref={objectiveRef} className="pelagos-card pelagos-objective" />
      </div>
      <dl ref={statsRef} className="pelagos-card pelagos-stats" />
      <div ref={lostRef} className="pelagos-lost" hidden>
        <strong>Link lost</strong>
        <span>The drone is flying itself back to the dome</span>
      </div>
      <p ref={messageRef} className="pelagos-message" aria-live="polite" hidden />
      <div className="pelagos-bottom">
        <p ref={promptRef} className="pelagos-prompt" aria-live="polite" />
        {mode === "overhead" && (
          <ol className="pelagos-hotbar" aria-label="Build">
            {STRUCTURE_ORDER.map((kind, at) => (
              <li key={kind}>
                <button type="button" data-selected={tool === kind ? "true" : "false"} title={STRUCTURES[kind].blurb} onClick={() => controlRef.current?.tool(tool === kind ? null : kind)}>
                  <span className="pelagos-key">{at + 1}</span>
                  <span>{STRUCTURES[kind].label}</span>
                  <small>{STRUCTURES[kind].cost}</small>
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="pelagos-help">
          {mode === "overhead"
            ? "Click to build · right-click to clear · WASD pan · wheel zoom · Tab fly the drone · H push the Lawheart · Q back to the Ark"
            : "Click to take the drone · WASD fly · mouse look · E use · Shift hurry · Tab overhead · Q back to the Ark"}
        </p>
      </div>
    </div>
  );
}
