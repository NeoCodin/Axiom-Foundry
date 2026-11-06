/*
 * The worlds as you see them from the ground, in richer pixel. Each is built from what the campaign
 * says the place is: Pelagos's drowned towers and hanging continents, Viridia's lit canopy over its
 * swallowed cities, Cinder's basalt and mantle fire, Nox's aurora over broken relays, Vesper's
 * storm bands and white scars. All in code, no outside art. One world is built at a time.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { foliageTexture, rockTile, windowSurface } from "./world-view-textures";

export type WorldView = { x: number; z: number; yaw: number; pitch: number };

const GRID = 320;
const REACH = 2600;
export const WORLD_FAR = 5200;
const TAU = Math.PI * 2;


const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};
const ease = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = ease(x - x0);
  const fy = ease(y - y0);
  const top = hash(x0, y0, seed) * (1 - fx) + hash(x0 + 1, y0, seed) * fx;
  const bottom = hash(x0, y0 + 1, seed) * (1 - fx) + hash(x0 + 1, y0 + 1, seed) * fx;
  return top * (1 - fy) + bottom * fy;
}
function fbm(x: number, y: number, octaves: number, seed: number) {
  let total = 0;
  let weight = 0.5;
  let sum = 0;
  let scale = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += weight * noise(x * scale, y * scale, seed + octave);
    sum += weight;
    weight /= 2;
    scale *= 2.03;
  }
  return total / sum;
}
const ridged = (x: number, y: number, octaves: number, seed: number) => 1 - Math.abs(2 * fbm(x, y, octaves, seed) - 1);
/** 0 at or beyond `from`, 1 at or past `to`, in either direction. */
const blend = (from: number, to: number, value: number) => ease(Math.max(0, Math.min(1, (value - from) / (to - from))));
const hex = (color: string) => {
  const made = new THREE.Color(color);
  return [made.r, made.g, made.b];
};
const mix3 = (a: number[], b: number[], t: number) => a.map((value, index) => value + (b[index] - value) * Math.max(0, Math.min(1, t)));

/** Builders handed to each world. Everything is merged by material when the world is done. */
type Kit = {
  box: (material: string, x: number, y: number, z: number, w: number, h: number, d: number, tilt?: number, turn?: number) => void;
  column: (material: string, x: number, y: number, z: number, top: number, bottom: number, h: number, sides?: number) => void;
  dome: (material: string, x: number, y: number, z: number, radius: number) => void;
  blob: (material: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, seed: number, tint: (up: number, along: number) => number[]) => void;
  /** A plant on crossed cards. */
  fern: (x: number, y: number, z: number, size: number) => void;
  /** A curtain of moving smoke or falling water. */
  plume: (material: string, x: number, y: number, z: number, w: number, h: number) => void;
  /** A three-bladed rotor that turns. */
  rotor: (x: number, y: number, z: number, radius: number, facing: number) => void;
  height: (x: number, z: number) => number;
  random: () => number;
  /** Only what stands far off, for putting behind a place built some other way. */
  backdrop: boolean;
};

export type WorldDef = {
  name: string;
  sky: {
    mode: number;
    zenith: string;
    horizon: string;
    sunDir: [number, number, number];
    sunColor: string;
    sunSize: number;
    cover: number;
    cloudDark: string;
    cloudLight: string;
  };
  fog: { color: string; density: number };
  sun: { color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  surface?: { y: number; lava: boolean; deep: string; shallow: string };
  weather: { color: string; count: number; velocity: [number, number, number]; length: number; glow: boolean };
  plumes: Record<string, { color: string; speed: number; soft: number; lean: number; aspect: number }>;
  glow: string;
  views: WorldView[];
  height: (x: number, z: number) => number;
  paint: (height: number, slope: number, x: number, z: number) => number[];
  walk: (height: number) => boolean;
  build: (kit: Kit) => void;
};

function tower(kit: Kit, x: number, z: number, w: number, d: number, tall: number, base: number, ruined: boolean) {
  kit.box("windows", x, base + tall / 2, z, w, tall, d, ruined ? (kit.random() - 0.5) * 0.1 : 0);
  kit.box("windows", x + w * 0.14, base + tall * 1.12, z - d * 0.1, w * 0.56, tall * 0.26, d * 0.6);
  if (ruined) {
    kit.box("concrete", x + (kit.random() - 0.5) * w * 0.4, base + tall + 3, z, w * 0.55, 6 + kit.random() * 8, d * 0.5, (kit.random() - 0.5) * 0.3);
  } else {
    kit.box("concrete", x, base + tall + 1, z, w + 1.4, 2, d + 1.4);
    kit.column("metal", x, base + tall + 8, z, 0.15, 0.5, 14, 6);
  }
}

/** Continents hanging in the sky like broken moons, shedding their seas. */
function hangingContinents(kit: Kit) {
  const land = (up: number, along: number) => {
    const strata = Math.sin(up * 34 + along * 8) * 0.5 + 0.5;
    if (up > 0.3) return mix3(hex("#3f7a4e"), hex("#8fae68"), along);
    return mix3(mix3(hex("#4a4c58"), hex("#7c7468"), strata), hex("#b0a48e"), Math.max(0, up + 0.3));
  };
  const hanging: [number, number, number, number][] = [[-720, 640, -1680, 460], [720, 820, -1900, 560], [130, 470, -1240, 210], [1320, 540, -1020, 270], [-1420, 560, -640, 320]];
  hanging.forEach(([x, y, z, size], index) => {
    kit.blob("landV", x, y, z, size, size * 0.34, size * 0.72, 40 + index, land);
    kit.plume("fall", x + size * 0.3, y - size * 0.1 - 230, z + size * 0.5, size * 0.1, 480);
    kit.plume("fall", x - size * 0.36, y - size * 0.1 - 170, z + size * 0.42, size * 0.06, 360);
  });
}

const PELAGOS: WorldDef = {
  name: "Pelagos",
  sky: { mode: 1, zenith: "#3f5a78", horizon: "#b8c6c4", sunDir: [0.42, 0.2, -0.88], sunColor: "#ffe2b0", sunSize: 0, cover: 0.42, cloudDark: "#2c3a4c", cloudLight: "#d8dee0" },
  fog: { color: "#8fa4ac", density: 0.00042 },
  sun: { color: "#ffe6c4", intensity: 2.6 },
  hemi: { sky: "#a9c4dc", ground: "#2c4048", intensity: 0.75 },
  surface: { y: 0, lava: false, deep: "#07202c", shallow: "#14505a" },
  weather: { color: "#b9d4e4", count: 900, velocity: [6, -34, 2], length: 1.3, glow: false },
  plumes: { fall: { color: "#eef6fa", speed: 1.6, soft: 0.85, lean: 0, aspect: 1.1 } },
  glow: "#ffdf9a",
  views: [
    { x: 0, z: -37, yaw: 0.08, pitch: 0.04 },
    { x: 34, z: -22, yaw: -1.05, pitch: 0.08 },
    { x: -34, z: -22, yaw: 0.95, pitch: 0.17 },
  ],
  height: (x, z) => {
    const d = Math.hypot(x, z * 1.2);
    const head = 19 * blend(62, 47, d) + (fbm(x / 22, z / 22, 3, 3) - 0.5) * 5 * blend(64, 46, d);
    const islands = Math.max(0, fbm(x / 210, z / 210, 3, 5) - 0.62) * 130;
    return Math.max(head - 3, islands - 14 + (fbm(x / 40, z / 40, 3, 7) - 0.5) * 6);
  },
  paint: (height, slope, x, z) => {
    const speck = fbm(x / 6, z / 6, 3, 9);
    if (height < 1.2) return mix3(hex("#4a5650"), hex("#6a7264"), speck);
    if (slope > 0.75) return mix3(hex("#3e4650"), hex("#5e6670"), speck);
    return mix3(hex("#46603f"), hex("#6f7f52"), speck);
  },
  walk: (height) => height > 0.8,
  build: (kit) => {
    for (let index = 0; index < 90; index += 1) {
      const angle = kit.random() * TAU;
      const distance = 230 + Math.pow(kit.random(), 1.1) * 1450;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const w = 14 + kit.random() * 22;
      tower(kit, x, z, w, w * (0.7 + kit.random() * 0.6), 20 + kit.random() * 90, -8, kit.random() > 0.3);
    }
    for (let index = 0; index < 9; index += 1) {
      const x = -520 + index * 150 + kit.random() * 30;
      const z = -420 - kit.random() * 90 + Math.sin(index) * 40;
      kit.column("white", x, 36, z, 1.6, 2.6, 76, 12);
      kit.rotor(x, 74, z + 3, 34, 0);
    }
    hangingContinents(kit);
    if (kit.backdrop) return;
    // The headland's seawall, its lamps, and the municipal shelter on the last dry ground.
    for (let index = -16; index <= 16; index += 1) {
      const angle = (index / 16) * 1.25 - Math.PI / 2;
      const x = Math.cos(angle) * 60;
      const z = Math.sin(angle) * 50;
      kit.box("concrete", x, kit.height(x, z) + 0.2, z, 8.6, 3, 1.6, 0, -angle + Math.PI / 2);
      if (index % 4 === 0) {
        kit.column("metal", x, kit.height(x, z) + 3.8, z, 0.07, 0.1, 5, 6);
        kit.box("glow", x, kit.height(x, z) + 6.3, z, 0.7, 0.2, 0.3);
      }
    }
    const shelterY = kit.height(-16, 16);
    kit.box("windows", -16, shelterY + 5, 16, 26, 11, 14);
    kit.box("concrete", -16, shelterY + 11, 16, 27.5, 1.2, 15.5);
    for (let index = 0; index < 900; index += 1) {
      const x = (kit.random() - 0.5) * 100;
      const z = (kit.random() - 0.5) * 90;
      const y = kit.height(x, z);
      if (y > 5) kit.fern(x, y - 0.1, z, 0.7 + kit.random() * 1.1);
    }
    for (let index = 0; index < 60; index += 1) {
      const x = (kit.random() - 0.5) * 120;
      const z = (kit.random() - 0.5) * 100;
      const size = 0.5 + kit.random() * 1.8;
      const seed = kit.random();
      kit.blob("noxRock", x, kit.height(x, z) + size * 0.2, z, size * 1.5, size, size * 1.2, seed * 40, (up, along) => mix3(hex("#3a3e46"), hex("#858a8c"), up * 0.5 + along * 0.5));
    }
  },
};

const VIRIDIA: WorldDef = {
  name: "Viridia",
  sky: { mode: 2, zenith: "#27486a", horizon: "#f2b47c", sunDir: [-0.62, 0.13, -0.77], sunColor: "#ffc890", sunSize: 0.9994, cover: 0.56, cloudDark: "#6a5a6e", cloudLight: "#ffd8b0" },
  fog: { color: "#c8a888", density: 0.00078 },
  sun: { color: "#ffcf9a", intensity: 3.4 },
  hemi: { sky: "#a8c8d0", ground: "#2a4a2c", intensity: 0.9 },
  surface: { y: -3, lava: false, deep: "#123a34", shallow: "#3f8a70" },
  weather: { color: "#d8ff8a", count: 420, velocity: [0.5, 0.35, 0.2], length: 0.06, glow: true },
  plumes: {},
  glow: "#7dffc4",
  views: [
    { x: 6, z: -58.5, yaw: -0.1, pitch: -0.2 },
    { x: 42, z: -41, yaw: -0.82, pitch: -0.18 },
    { x: -42, z: -41, yaw: 0.72, pitch: -0.2 },
  ],
  height: (x, z) => {
    const d = Math.hypot(x, z);
    const ridge = 165 * blend(118, 58, d);
    const hills = 34 * fbm(x / 300, z / 300, 4, 13) - 14 + 7 * fbm(x / 60, z / 60, 3, 15);
    const far = blend(800, 2100, d) * 330 * ridged(x / 900, z / 900, 4, 17);
    return ridge + hills + far;
  },
  paint: (height, slope, x, z) => {
    const speck = fbm(x / 9, z / 9, 3, 19);
    if (slope > 0.72) return mix3(hex("#3e3a34"), hex("#5e5848"), speck);
    if (height > 180) return mix3(hex("#35503e"), hex("#6e7a5e"), blend(180, 340, height));
    return mix3(hex("#1f4a2c"), hex("#4f8238"), speck);
  },
  walk: (height) => height > -2,
  build: (kit) => {
    const crowns: [string, string][] = [["#123f2a", "#3a9a54"], ["#17503a", "#4fb878"], ["#2a4a22", "#a8a848"], ["#163c44", "#3f9c8c"], ["#123f2a", "#6ab84c"]];
    const leaf = (kind: number) => (up: number, along: number) => {
      const [shade, sun] = crowns[kind];
      return mix3(hex(shade), hex(sun), Math.pow(Math.max(0, along * 1.5 - 0.26), 1.5) + Math.max(0, up) * 0.34);
    };
    const tree = (x: number, z: number, tall: number) => {
      const y = kit.height(x, z);
      const spread = tall * 0.34;
      kit.column("trunk", x, y + tall * 0.42, z, tall * 0.03, tall * 0.06, tall * 0.84, 6);
      const kind = Math.floor(kit.random() * crowns.length);
      const seed = kit.random();
      kit.blob("canopyV", x, y + tall * 0.9, z, spread, spread * 0.62, spread, seed * 90, leaf(kind));
      for (let lobe = 0; lobe < 2; lobe += 1) {
        const angle = (lobe / 2) * TAU + seed * 6;
        const out = spread * 0.7;
        const size = spread * (0.5 + kit.random() * 0.26);
        kit.blob("canopyV", x + Math.cos(angle) * out, y + tall * (0.82 + kit.random() * 0.12), z + Math.sin(angle) * out, size, size * 0.66, size, seed * 70 + lobe, leaf(kind));
      }
      // Its light: pods hung under the crown, and points showing through the top.
      for (let pod = 0; pod < 4; pod += 1) {
        const angle = kit.random() * TAU;
        const reach = spread * (0.3 + kit.random() * 1.1);
        kit.box("glow", x + Math.cos(angle) * reach, y + tall * (0.9 + kit.random() * 0.34), z + Math.sin(angle) * reach, 1.5, 1.5, 1.5);
      }
    };
    for (let index = 0; index < 2200; index += 1) {
      const angle = kit.random() * TAU;
      const distance = 122 + Math.pow(kit.random(), 0.62) * 1150;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      if (kit.height(x, z) < -1) continue;
      tree(x, z, 36 + kit.random() * 30);
    }
    // The old city under it, rooftops up through the leaves and held by roots.
    for (let index = 0; index < 34; index += 1) {
      const x = -520 + kit.random() * 980;
      const z = -300 - kit.random() * 620;
      const w = 22 + kit.random() * 26;
      const tall = 66 + kit.random() * 70;
      const base = kit.height(x, z) - 4;
      tower(kit, x, z, w, w, tall, base, true);
      const seed = kit.random();
      kit.blob("canopyV", x, base + tall + 2, z, w * 0.8, w * 0.32, w * 0.8, seed * 30, leaf(Math.floor(seed * crowns.length)));
      for (let vine = 0; vine < 5; vine += 1) kit.box("canopyLeaf", x + (kit.random() - 0.5) * w, base + tall * 0.62, z + w * 0.51, 2 + kit.random() * 4, tall * (0.5 + kit.random() * 0.4), 0.6);
    }
    // Lit fungus along the ridge, close enough to walk among.
    for (let index = 0; index < 60; index += 1) {
      const angle = kit.random() * TAU;
      const reach = Math.sqrt(kit.random()) * 48;
      const x = Math.cos(angle) * reach;
      const z = Math.sin(angle) * reach;
      const y = kit.height(x, z);
      const size = 0.25 + kit.random() * 0.75;
      kit.column("trunk", x, y + size, z, size * 0.12, size * 0.2, size * 2, 6);
      kit.column("glow", x, y + size * 2.1, z, 0.02, size, size * 0.6, 10);
    }
    for (let index = 0; index < 1100; index += 1) {
      const angle = kit.random() * TAU;
      const reach = Math.sqrt(kit.random()) * 54;
      const x = Math.cos(angle) * reach;
      const z = Math.sin(angle) * reach;
      kit.fern(x, kit.height(x, z) - 0.1, z, 0.7 + kit.random() * 1.2);
    }
  },
};

const CINDER: WorldDef = {
  name: "Cinder",
  sky: { mode: 3, zenith: "#2a1c20", horizon: "#b8552c", sunDir: [0.5, 0.1, -0.86], sunColor: "#ff8a48", sunSize: 0, cover: 0.2, cloudDark: "#1c1416", cloudLight: "#7a3e2a" },
  fog: { color: "#6e3626", density: 0.00085 },
  sun: { color: "#ff9a5a", intensity: 1.15 },
  hemi: { sky: "#c08468", ground: "#ff6a2a", intensity: 1.35 },
  surface: { y: -2.2, lava: true, deep: "#ff3c10", shallow: "#ffd25a" },
  weather: { color: "#ffa95a", count: 620, velocity: [2.4, 2.6, -1.4], length: 0.5, glow: true },
  plumes: { smoke: { color: "#1e1416", speed: -0.7, soft: 0.8, lean: 0.9, aspect: 5 } },
  glow: "#ffb45a",
  views: [
    { x: 0, z: -56, yaw: 0.04, pitch: -0.12 },
    { x: 40, z: -39, yaw: -0.72, pitch: -0.1 },
    { x: -40, z: -39, yaw: 0.72, pitch: -0.1 },
  ],
  height: (x, z) => {
    const d = Math.hypot(x, z);
    const crack = Math.abs(fbm(x / 210, z / 210, 3, 23) - 0.5);
    const plain = 9 * fbm(x / 120, z / 120, 4, 25) + 3 * fbm(x / 24, z / 24, 2, 27);
    const rise = 44 * blend(92, 54, d);
    const far = blend(700, 2000, d) * 300 * ridged(x / 700, z / 700, 4, 29);
    return plain + rise + far - 17 * blend(0.085, 0.02, crack) * blend(70, 120, d);
  },
  paint: (height, slope, x, z) => {
    const speck = fbm(x / 7, z / 7, 3, 31);
    const rock = mix3(hex("#332c2e"), hex("#5e5252"), speck);
    if (height < 0.8) return mix3(hex("#ff5a1c"), rock, blend(-2, 0.8, height));
    if (slope > 0.7) return mix3(rock, hex("#141216"), 0.5);
    return mix3(rock, hex("#6a4a3e"), blend(0.4, 0.8, fbm(x / 60, z / 60, 3, 33)) * 0.5);
  },
  walk: (height) => height > 0.5,
  build: (kit) => {
    // Basalt, stood on end.
    for (let index = 0; index < 520; index += 1) {
      const angle = kit.random() * TAU;
      const distance = 104 + Math.pow(kit.random(), 0.8) * 640;
      const groupX = Math.cos(angle) * distance;
      const groupZ = Math.sin(angle) * distance;
      const y = kit.height(groupX, groupZ);
      if (y < 1) continue;
      const tall = 3 + kit.random() * 11;
      const radius = 1.6 + kit.random() * 2.2;
      kit.column("rock", groupX, y + tall / 2 - 1, groupZ, radius, radius * 1.08, tall + 2, 6);
    }
    // Stumps of the same columns underfoot on the ledge.
    for (let index = 0; index < 150; index += 1) {
      const angle = kit.random() * TAU;
      const reach = Math.sqrt(kit.random()) * 50;
      const x = Math.cos(angle) * reach;
      const z = Math.sin(angle) * reach;
      const tall = 0.3 + kit.random() * 1.8;
      kit.column("rock", x, kit.height(x, z) + tall / 2 - 0.2, z, 0.7 + kit.random(), 0.8 + kit.random(), tall + 0.4, 6);
    }
    // Foundry Nine: the works, its stacks and the glow in its windows.
    const fx = -60;
    const fz = -520;
    const base = kit.height(fx, fz);
    for (let index = 0; index < 11; index += 1) {
      const x = fx - 230 + index * 46 + kit.random() * 12;
      const z = fz + (kit.random() - 0.5) * 120;
      tower(kit, x, z, 30 + kit.random() * 18, 36 + kit.random() * 24, 26 + kit.random() * 44, base - 2, false);
    }
    for (let index = 0; index < 7; index += 1) {
      const x = fx - 190 + index * 62;
      const z = fz - 40 - kit.random() * 40;
      const tall = 110 + kit.random() * 70;
      kit.column("rust", x, base + tall / 2, z, 5, 8.5, tall, 14);
      kit.box("glow", x, base + tall - 6, z + 5.2, 4, 1.4, 0.4);
      kit.plume("smoke", x, base + tall + 170, z, 110, 340);
    }
    // Pylons marching out across the plain.
    for (let index = 0; index < 12; index += 1) {
      const x = 90 + index * 48;
      const z = -40 - index * 44;
      const y = kit.height(x, z);
      kit.column("rust", x, y + 15, z, 0.5, 1.1, 30, 6);
      kit.box("rust", x, y + 28, z, 16, 0.8, 0.8);
      kit.box("glow", x, y + 29, z, 0.7, 0.7, 0.7);
    }
  },
};

const NOX: WorldDef = {
  name: "Nox",
  sky: { mode: 4, zenith: "#070616", horizon: "#231a4a", sunDir: [-0.3, 0.42, -0.86], sunColor: "#000000", sunSize: 0, cover: 2, cloudDark: "#000000", cloudLight: "#000000" },
  fog: { color: "#1a1438", density: 0.0007 },
  sun: { color: "#9a7cff", intensity: 1 },
  hemi: { sky: "#8a80d8", ground: "#1a1838", intensity: 0.72 },
  weather: { color: "#c8c0ff", count: 460, velocity: [1.4, -1.2, 0.5], length: 0.05, glow: true },
  plumes: {},
  glow: "#ffc27a",
  views: [
    { x: 0, z: -55, yaw: 0.06, pitch: 0.12 },
    { x: 39, z: -38, yaw: -0.75, pitch: 0.1 },
    { x: -39, z: -38, yaw: 0.78, pitch: 0.18 },
  ],
  height: (x, z) => {
    const d = Math.hypot(x, z);
    const rolling = 26 * fbm(x / 280, z / 280, 4, 37) + 5 * fbm(x / 50, z / 50, 3, 39);
    const rise = 34 * blend(92, 54, d);
    const far = blend(600, 2000, d) * 300 * ridged(x / 800, z / 800, 4, 41);
    return rolling + rise + far;
  },
  paint: (height, slope, x, z) => {
    const speck = fbm(x / 8, z / 8, 3, 43);
    const dark = mix3(hex("#1e1e38"), hex("#34345a"), speck);
    if (slope > 0.62) return mix3(dark, hex("#14142a"), 0.6);
    return mix3(dark, hex("#a8aad0"), blend(0.44, 0.6, fbm(x / 34, z / 34, 3, 45)) * 0.8);
  },
  walk: () => true,
  build: (kit) => {
    const relay = (x: number, z: number, tall: number, snapped: boolean) => {
      const y = kit.height(x, z);
      const standing = snapped ? tall * 0.62 : tall;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box("metal", x + dx * 3, y + standing / 2, z + dz * 3, 0.5, standing, 0.5, dx * 0.04);
      for (let level = 6; level < standing; level += 7) {
        kit.box("metal", x, y + level, z - 3, 6.5, 0.3, 0.3);
        kit.box("metal", x, y + level, z + 3, 6.5, 0.3, 0.3);
        kit.box("metal", x - 3, y + level, z, 0.3, 0.3, 6.5);
        kit.box("metal", x + 3, y + level, z, 0.3, 0.3, 6.5);
        kit.box("metal", x, y + level + 3.5, z + 3, 8.6, 0.2, 0.2, 0.9);
      }
      if (snapped) kit.box("metal", x + 12, y + standing - 7, z, 3, tall * 0.42, 3, 1.1);
      else kit.column("metal", x, y + tall + 7, z, 0.2, 0.6, 14, 6);
      kit.box("red", x, y + standing + (snapped ? 0 : 14), z, 1, 1, 1);
    };
    const spots: [number, number, number, boolean][] = [[-90, -230, 110, false], [160, -330, 90, true], [-320, -420, 120, true], [380, -520, 130, false], [-60, -640, 100, false], [640, -340, 120, true], [-640, -560, 130, false], [120, -900, 140, true], [-880, -220, 110, false], [860, -780, 130, false]];
    for (const [x, z, tall, snapped] of spots) relay(x, z, tall, snapped);
    // Shelter doors in the hillsides: each its own small warm light, and no one trusts the next.
    for (let index = 0; index < 70; index += 1) {
      const angle = -Math.PI / 2 + (kit.random() - 0.5) * 2.6;
      const distance = 100 + kit.random() * 1100;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = kit.height(x, z);
      kit.box("concrete", x, y + 1.6, z, 7, 4, 4);
      kit.box("glow", x, y + 1.4, z + 2.05, 3, 2.3, 0.3);
    }
    const nearY = kit.height(26, 10);
    kit.box("concrete", 26, nearY + 2, 10, 12, 6, 7);
    kit.box("glow", 26, nearY + 1.7, 6.4, 3.4, 2.8, 0.3);
    kit.column("metal", 18, nearY + 5, 10, 0.1, 0.16, 10, 6);
    kit.box("red", 18, nearY + 10.2, 10, 0.5, 0.5, 0.5);
    // Dead rock, close by.
    for (let index = 0; index < 80; index += 1) {
      const x = (kit.random() - 0.5) * 260;
      const z = (kit.random() - 0.5) * 260;
      if (z < -30 && z > -58) continue;
      const size = 1 + kit.random() * 3.4;
      const seed = kit.random();
      kit.blob("noxRock", x, kit.height(x, z) + size * 0.2, z, size * 1.5, size, size * 1.2, seed * 40, (up, along) => mix3(hex("#262644"), hex("#6a6a9a"), up * 0.5 + along * 0.4));
    }
  },
};

const VESPER: WorldDef = {
  name: "Vesper",
  sky: { mode: 5, zenith: "#5a1616", horizon: "#e87a44", sunDir: [0.3, 0.46, -0.84], sunColor: "#fff0d8", sunSize: 0.9997, cover: 2, cloudDark: "#000000", cloudLight: "#000000" },
  fog: { color: "#d0704a", density: 0.00075 },
  sun: { color: "#ffd8b8", intensity: 2.5 },
  hemi: { sky: "#e8805a", ground: "#7a3a30", intensity: 0.85 },
  weather: { color: "#ffc8a0", count: 500, velocity: [13, 0.4, 3], length: 0.7, glow: false },
  plumes: {},
  glow: "#fff4dc",
  views: [
    { x: 0, z: -55, yaw: 0.02, pitch: 0.05 },
    { x: 39, z: -38, yaw: -0.3, pitch: 0.2 },
    { x: -39, z: -38, yaw: 0.68, pitch: 0.08 },
  ],
  height: (x, z) => {
    const d = Math.hypot(x, z);
    const flat = 2 * fbm(x / 90, z / 90, 3, 47);
    const mesa = 92 * blend(0.56, 0.6, fbm(x / 380, z / 380, 3, 49)) * blend(240, 420, d);
    const rise = 36 * blend(92, 54, d) + 3 * fbm(x / 30, z / 30, 3, 51) * blend(150, 60, d);
    const far = blend(900, 2200, d) * 240 * ridged(x / 900, z / 900, 3, 53);
    return flat + mesa + rise + far;
  },
  paint: (height, slope, x, z) => {
    const speck = fbm(x / 10, z / 10, 3, 55);
    if (slope > 0.5) {
      const strata = Math.sin(height * 0.42 + fbm(x / 80, z / 80, 2, 57) * 5) * 0.5 + 0.5;
      return mix3(hex("#6e2a22"), hex("#c46a48"), strata);
    }
    return mix3(hex("#a07e72"), hex("#ccb8ac"), speck);
  },
  walk: () => true,
  build: (kit) => {
    const observatory = (x: number, z: number, size: number) => {
      const y = kit.height(x, z);
      kit.column("concrete", x, y + size * 0.4, z, size, size * 1.06, size * 0.8, 24);
      kit.dome("white", x, y + size * 0.8, z, size);
      kit.box("dark", x, y + size * 1.32, z + size * 0.72, size * 0.2, size * 0.86, size * 0.4, -0.7);
      kit.box("glow", x, y + size * 0.3, z + size, size * 0.3, size * 0.24, 0.4);
    };
    const dish = (x: number, z: number, size: number, turn: number) => {
      const y = kit.height(x, z);
      kit.column("metal", x, y + size * 0.5, z, 0.4, 1, size, 8);
      kit.column("white", x + Math.sin(turn) * 0.8, y + size * 1.05, z + Math.cos(turn) * 0.8, size * 0.62, 0.3, size * 0.26, 18);
    };
    const city: [number, number, number][] = [[0, -420, 56], [-150, -480, 38], [140, -500, 44], [-290, -400, 30], [300, -420, 34], [60, -620, 62], [-220, -640, 42], [320, -680, 46], [-480, -560, 36], [520, -560, 40]];
    for (const [x, z, size] of city) observatory(x, z, size);
    for (let index = 0; index < 60; index += 1) {
      const x = -520 + kit.random() * 1040;
      const z = -300 - kit.random() * 480;
      if (index % 3 === 0) dish(x, z, 12 + kit.random() * 16, kit.random() * TAU);
      else tower(kit, x, z, 12 + kit.random() * 18, 12 + kit.random() * 18, 14 + kit.random() * 40, kit.height(x, z) - 1, false);
    }
    // Where the laws broke: white scars run through the ground as well as the sky, jagged blades
    // of light that stand out of the rock, tall in the middle and thinning away at both ends.
    const scar = (startX: number, startZ: number, heading: number, steps: number, scale: number) => {
      let x = startX;
      let z = startZ;
      let turn = heading;
      for (let step = 0; step < steps; step += 1) {
        turn += (kit.random() - 0.5) * 1.5;
        const length = (5 + kit.random() * 15) * scale;
        const nextX = x + Math.cos(turn) * length;
        const nextZ = z + Math.sin(turn) * length;
        const swell = Math.sin(((step + 0.5) / steps) * Math.PI);
        const tall = (0.8 + swell * (3 + kit.random() * 5)) * scale;
        const middleX = (x + nextX) / 2;
        const middleZ = (z + nextZ) / 2;
        kit.box("glow", middleX, kit.height(middleX, middleZ) + tall * 0.3, middleZ, length + 0.4, tall, (0.22 + swell * 0.7) * scale, (kit.random() - 0.5) * 0.18, -turn);
        if (step === Math.floor(steps / 2) && scale > 0.6) scar(nextX, nextZ, turn + (kit.random() > 0.5 ? 1 : -1) * (0.7 + kit.random() * 0.5), Math.ceil(steps / 2), scale * 0.55);
        x = nextX;
        z = nextZ;
      }
    };
    for (let index = 0; index < 26; index += 1) {
      const angle = kit.random() * TAU;
      const distance = 130 + kit.random() * 300;
      scar(Math.cos(angle) * distance, -230 + Math.sin(angle) * distance * 0.4, kit.random() * TAU, 5 + Math.floor(kit.random() * 5), 0.8 + kit.random() * 0.6);
    }
    for (let index = 0; index < 40; index += 1) {
      const x = (kit.random() - 0.5) * 240;
      const z = (kit.random() - 0.5) * 240;
      if (z < -30 && z > -58) continue;
      const size = 0.8 + kit.random() * 3;
      const seed = kit.random();
      kit.blob("noxRock", x, kit.height(x, z) + size * 0.2, z, size * 1.6, size, size * 1.2, seed * 40, (up, along) => mix3(hex("#7a3a30"), hex("#d8a488"), up * 0.5 + along * 0.4));
    }
  },
};

export const WORLDS = [PELAGOS, VIRIDIA, CINDER, NOX, VESPER];
export const WORLD_NAMES = WORLDS.map((world) => world.name);

const NOISE = /* glsl */ `
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3. - 2. * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1., 0., 0.)), f.x), mix(hash31(i + vec3(0., 1., 0.)), hash31(i + vec3(1., 1., 0.)), f.x), f.y),
      mix(mix(hash31(i + vec3(0., 0., 1.)), hash31(i + vec3(1., 0., 1.)), f.x), mix(hash31(i + vec3(0., 1., 1.)), hash31(i + vec3(1., 1., 1.)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float amount = 0.5;
    float total = 0.;
    for (int octave = 0; octave < 5; octave++) {
      total += amount * vnoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      amount *= 0.5;
    }
    return total / 0.96875;
  }
`;

const skyMaterial = () => new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    time: { value: 0 },
    flash: { value: 0 },
    mode: { value: 1 },
    zenith: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color() },
    sunSize: { value: 0 },
    cover: { value: 0.5 },
    cloudDark: { value: new THREE.Color() },
    cloudLight: { value: new THREE.Color() },
  },
  vertexShader: "varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.); gl_Position = p.xyww; }",
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float flash;
    uniform float mode;
    uniform vec3 zenith;
    uniform vec3 horizon;
    uniform vec3 sunDir;
    uniform vec3 sunColor;
    uniform float sunSize;
    uniform float cover;
    uniform vec3 cloudDark;
    uniform vec3 cloudLight;
    varying vec3 vDir;
    ${NOISE}
    void main() {
      vec3 d = normalize(vDir);
      float up = max(d.y, 0.);
      vec3 color = mix(horizon, zenith, pow(up, 0.52));
      float towardSun = max(dot(d, sunDir), 0.);
      color += sunColor * (pow(towardSun, 7.) * 0.28 + pow(towardSun, 90.) * 0.55);
      if (sunSize > 0.) color += sunColor * smoothstep(sunSize, sunSize + 0.00012, towardSun) * 6.;
      if (mode > 3.5 && mode < 4.5) {
        // Nox: stars, and violet curtains that never quite hold still.
        vec3 cell = floor(d * 170.);
        float star = hash31(cell);
        if (star > 0.982) color += vec3(0.8, 0.85, 1.) * (star - 0.982) * 75. * smoothstep(0.02, 0.18, d.y);
        float around = atan(d.x, d.z);
        for (int layer = 0; layer < 4; layer++) {
          float index = float(layer);
          float fold = fbm(vec3(cos(around) * 1.6 + index * 3.1, sin(around) * 1.6 + time * 0.05, index * 1.7));
          float at = 0.2 + index * 0.1 + (fold - 0.5) * 0.46;
          float offset = d.y - at;
          float curtain = offset > 0. ? exp(-offset * offset * 26.) : exp(-offset * offset * 620.);
          float rays = 0.5 + 0.5 * sin(around * 74. + fold * 42. + time * 0.34 + index);
          rays = 0.45 + 0.55 * rays * rays;
          vec3 tint = mix(vec3(0.46, 0.22, 1.), vec3(0.95, 0.3, 0.86), index / 3.);
          tint = mix(tint, vec3(0.3, 0.86, 0.62), smoothstep(0.025, 0., abs(offset)) * 0.8);
          color += tint * curtain * rays * 0.46;
        }
      }
      if (mode > 4.5) {
        // Vesper: bands of storm across the whole sky, torn by white scars.
        vec3 warp = vec3(d.x * 2.2, d.y * 1.4, d.z * 2.2);
        float flow = fbm(warp + vec3(time * 0.012, 0., 0.));
        float lat = d.y * 8.5 + d.x * 1.6 + flow * 3.4;
        float bands = 0.5 + 0.5 * sin(lat * 2.6);
        vec3 storm = mix(vec3(0.36, 0.05, 0.05), vec3(0.95, 0.34, 0.12), bands);
        storm = mix(storm, vec3(1., 0.68, 0.42), smoothstep(0.62, 0.86, fbm(warp * 3. + vec3(time * 0.02, 3., 0.))) * 0.7);
        color = mix(color, storm, smoothstep(0.02, 0.26, d.y));
        float scar = abs(fbm(d * vec3(1.7, 4.6, 1.7) + 7.3) - 0.5);
        float scarB = abs(fbm(d * vec3(4.2, 1.9, 4.2) + 2.1) - 0.5);
        float mask = smoothstep(0.5, 0.66, fbm(d * 1.25 + 4.1));
        float maskB = smoothstep(0.54, 0.68, fbm(d * 1.6 + 9.7));
        float line = smoothstep(0.012, 0.002, scar) * mask + smoothstep(0.008, 0.0015, scarB) * maskB * 0.8;
        float halo = exp(-scar * 34.) * 0.42 * mask + exp(-scarB * 50.) * 0.26 * maskB;
        color += vec3(1., 0.97, 0.92) * (line * 1.7 + halo) * smoothstep(0.03, 0.2, d.y) * (0.86 + 0.14 * sin(time * 2.7));
      }
      float grain = 0.;
      if (cover < 1.5) {
        vec2 plane = d.xz / (d.y + 0.14);
        float wind = time * 0.012;
        grain = fbm(vec3(plane * 1.35 + vec2(wind, wind * 0.4), time * 0.008));
        float cloud = smoothstep(cover, cover + 0.26, grain) * smoothstep(-0.01, 0.1, d.y);
        float lit = clamp(0.52 + (fbm(vec3(plane * 1.35 + sunDir.xz * 0.34 + vec2(wind, wind * 0.4), time * 0.008)) - grain) * -3.4 + towardSun * 0.3, 0., 1.);
        vec3 shade = mix(cloudDark, cloudLight, lit);
        shade += sunColor * pow(towardSun, 5.) * 0.42;
        if (mode > 2.5 && mode < 3.5) shade += vec3(1., 0.3, 0.08) * (0.05 + 0.26 * pow(1. - up, 7.)) * (0.7 + grain);
        color = mix(color, shade, cloud);
      }
      color = mix(color, horizon, smoothstep(0.015, -0.05, d.y));
      color += vec3(0.62, 0.72, 1.) * flash * (0.25 + grain * 1.6);
      gl_FragColor = vec4(color, 1.);
    }
  `,
});

/** Open water or open mantle: all in the shader, the same plane either way. */
const surfaceMaterial = () => new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    lava: { value: 0 },
    deep: { value: new THREE.Color() },
    shallow: { value: new THREE.Color() },
    zenith: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color() },
    fogColor2: { value: new THREE.Color() },
    fogDensity2: { value: 0.001 },
    flash: { value: 0 },
  },
  vertexShader: "varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float lava;
    uniform vec3 deep;
    uniform vec3 shallow;
    uniform vec3 zenith;
    uniform vec3 horizon;
    uniform vec3 sunDir;
    uniform vec3 sunColor;
    uniform vec3 fogColor2;
    uniform float fogDensity2;
    uniform float flash;
    varying vec3 vWorld;
    ${NOISE}
    float waves(vec2 p) {
      return fbm(vec3(p * 0.06 + vec2(time * 0.09, time * 0.05), time * 0.1)) * 1.4 + fbm(vec3(p * 0.21 - vec2(time * 0.14, 0.), time * 0.17)) * 0.5;
    }
    void main() {
      vec3 toEye = cameraPosition - vWorld;
      float far = length(toEye);
      vec3 view = toEye / far;
      vec3 color;
      if (lava > 0.5) {
        float slow = fbm(vec3(vWorld.xz * 0.018, time * 0.05));
        float crust = fbm(vec3(vWorld.xz * 0.075 + slow * 3., time * 0.09));
        float hot = smoothstep(0.34, 0.72, crust + slow * 0.25);
        hot = floor(hot * 5.) / 5.;
        color = mix(vec3(0.06, 0.02, 0.02), deep * 1.8, smoothstep(0.1, 0.55, hot));
        color = mix(color, shallow * 3.2, smoothstep(0.55, 1., hot));
      } else {
        float eps = 0.6 + far * 0.012;
        float h0 = waves(vWorld.xz);
        float hx = waves(vWorld.xz + vec2(eps, 0.));
        float hz = waves(vWorld.xz + vec2(0., eps));
        float roughen = 1.6 * smoothstep(1400., 60., far) + 0.25;
        vec3 n = normalize(vec3((h0 - hx) * roughen * 3.4 / eps * 0.6, 1., (h0 - hz) * roughen * 3.4 / eps * 0.6));
        float fresnel = 0.03 + 0.5 * pow(1. - clamp(dot(n, view), 0., 1.), 5.);
        vec3 bounce = reflect(-view, n);
        vec3 sky = mix(horizon * 0.62, zenith, pow(max(bounce.y, 0.), 0.42));
        float glint = pow(max(dot(bounce, sunDir), 0.), 220.);
        float crest = h0 / 1.9;
        color = mix(mix(deep, shallow, smoothstep(0.42, 0.62, crest)), sky, fresnel);
        color += sunColor * glint * 3.;
        float foam = smoothstep(0.76, 0.86, crest + fbm(vec3(vWorld.xz * 0.5, time * 0.3)) * 0.24);
        color = mix(color, vec3(0.86, 0.92, 0.94), foam * smoothstep(900., 120., far) * 0.75);
        color += vec3(0.62, 0.72, 1.) * flash * 0.3;
        color = floor(color * 9. + 0.5) / 9.;
      }
      float fog = 1. - exp(-fogDensity2 * fogDensity2 * far * far);
      gl_FragColor = vec4(mix(color, fogColor2, fog), 1.);
    }
  `,
});


function worldUvs(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < position.count; index += 1) {
    const nx = Math.abs(normal.getX(index));
    const ny = Math.abs(normal.getY(index));
    const nz = Math.abs(normal.getZ(index));
    if (ny >= nx && ny >= nz) uv.setXY(index, position.getX(index), position.getZ(index));
    else if (nx >= nz) uv.setXY(index, position.getZ(index), position.getY(index));
    else uv.setXY(index, position.getX(index), position.getY(index));
  }
}

/** A world in its own group, with its sky, weather and light. A backdrop has no ground of its own. */
export function buildWorldView(parent: THREE.Object3D, name: string, { backdrop = false, seaLevel = 0 } = {}) {
  const spec = WORLDS.find((world) => world.name === name) ?? WORLDS[0];
  const group = new THREE.Group();
  parent.add(group);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 32), skyMaterial());
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms;
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(REACH * 2, REACH * 2), surfaceMaterial());
  surface.rotation.x = -Math.PI / 2;
  const surfaceUniforms = (surface.material as THREE.ShaderMaterial).uniforms;
  group.add(sky, surface);

  const sunLight = new THREE.DirectionalLight("#ffffff", 1);
  if (!backdrop) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    const shadowReach = 180;
    Object.assign(sunLight.shadow.camera, { left: -shadowReach, right: shadowReach, top: shadowReach, bottom: -shadowReach, near: 10, far: 1100 });
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.5;
  }
  const hemi = new THREE.HemisphereLight("#ffffff", "#000000", 1);
  group.add(sunLight, sunLight.target, hemi);

  const tile = rockTile();
  const panes = windowSurface();
  const glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.glow).multiplyScalar(1.7) });
  const redMaterial = new THREE.MeshBasicMaterial({ color: "#ff3a24" });
  const solid = (color: string) => new THREE.MeshLambertMaterial({ color, map: tile, flatShading: true });
  const painted = () => new THREE.MeshLambertMaterial({ vertexColors: true, map: tile, flatShading: true });
  const materials: Record<string, THREE.Material> = {
    terrain: painted(),
    landV: painted(),
    canopyV: painted(),
    noxRock: painted(),
    concrete: solid("#8a8a88"),
    rock: solid("#26222a"),
    metal: solid("#50525e"),
    rust: solid("#6a3c28"),
    white: solid("#ebe7df"),
    dark: solid("#22222a"),
    trunk: solid("#4a3a2c"),
    canopyLeaf: solid("#2f7a44"),
    fern: new THREE.MeshLambertMaterial({ map: foliageTexture(), alphaTest: 0.5, side: THREE.DoubleSide }),
    windows: new THREE.MeshLambertMaterial({ map: panes.map, emissiveMap: panes.glow, emissive: "#ffffff", emissiveIntensity: 1.1 }),
    glow: glowMaterial,
    red: redMaterial,
  };
  const plumeMaterials = new Map<string, THREE.ShaderMaterial>();
  const makePlume = (color: string, speed: number, soft: number, aspect: number) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) }, speed: { value: speed }, soft: { value: soft }, aspect: { value: aspect } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color;
      uniform float speed;
      uniform float soft;
      uniform float aspect;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float flow = fbm(vec3(vUv.x * 3.2, vUv.y * aspect + time * speed * 0.2, time * 0.05));
        float edge = smoothstep(0., 0.3, vUv.x) * smoothstep(1., 0.7, vUv.x) * smoothstep(1., 0.45, vUv.y) * smoothstep(0., 0.14, vUv.y);
        float alpha = floor(smoothstep(0.3, 0.6, flow) * edge * soft * 4. + 0.5) / 4.;
        if (alpha < 0.2) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  // Fine weather that follows the camera round.
  const weatherSize = new THREE.Vector3(70, 40, 70);
  const weatherGeometry = new THREE.BufferGeometry();
  const weatherCount = 1000;
  const seeds = new Float32Array(weatherCount * 2 * 3);
  const tails = new Float32Array(weatherCount * 2);
  for (let index = 0; index < weatherCount; index += 1) {
    const seed = [hash(index, 1, 3), hash(index, 2, 3), hash(index, 3, 3)];
    seeds.set(seed, index * 2 * 3);
    seeds.set(seed, (index * 2 + 1) * 3);
    tails[index * 2 + 1] = 1;
  }
  weatherGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(weatherCount * 2 * 3), 3));
  weatherGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  weatherGeometry.setAttribute("aTail", new THREE.BufferAttribute(tails, 1));
  const weatherMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: spec.weather.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      time: { value: 0 },
      eye: { value: new THREE.Vector3() },
      velocity: { value: new THREE.Vector3(...spec.weather.velocity) },
      box: { value: weatherSize },
      stretch: { value: (spec.weather.length / 0.03) * 0.05 },
      color: { value: new THREE.Color(spec.weather.color) },
      gain: { value: spec.weather.glow ? 2 : 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      attribute float aTail;
      uniform float time;
      uniform vec3 eye;
      uniform vec3 velocity;
      uniform vec3 box;
      uniform float stretch;
      varying float vFade;
      void main() {
        vec3 p = mod(aSeed * box * 3. + velocity * time - eye + box * 0.5, box) - box * 0.5 + eye;
        p -= velocity * stretch * 0.03 * aTail;
        p.x += sin(time * 0.7 + aSeed.y * 40.) * length(velocity) * 0.02;
        vFade = 1. - aTail * 0.8;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float gain;
      varying float vFade;
      void main() { gl_FragColor = vec4(color * gain, 0.55 * vFade); }
    `,
  });
  const weather = new THREE.LineSegments(weatherGeometry, weatherMaterial);
  weather.frustumCulled = false;
  weatherGeometry.setDrawRange(0, Math.min(weatherCount, spec.weather.count) * 2);
  group.add(weather);

  const rotors: THREE.Group[] = [];

  const buildGround = () => {
    const size = GRID + 1;
    const positions = new Float32Array(size * size * 3);
    const uvs = new Float32Array(size * size * 2);
    const colors = new Float32Array(size * size * 3);
    const indices = new Uint32Array(GRID * GRID * 6);
    const warp = (value: number) => Math.sign(value) * Math.pow(Math.abs(value), 2.4) * REACH;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const x = warp((col / GRID) * 2 - 1);
        const z = warp((row / GRID) * 2 - 1);
        const at = row * size + col;
        const height = spec.height(x, z);
        positions.set([x, height, z], at * 3);
        uvs.set([x, z], at * 2);
        const reach = 1.2;
        const slope = Math.min(1, Math.hypot(spec.height(x + reach, z) - height, spec.height(x, z + reach) - height) / reach);
        colors.set(spec.paint(height, slope, x, z), at * 3);
      }
    }
    let cursor = 0;
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const a = row * size + col;
        indices.set([a, a + size, a + 1, a + 1, a + size, a + size + 1], cursor);
        cursor += 6;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, materials.terrain);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  };

  const buildProps = () => {
    const parts = new Map<string, THREE.BufferGeometry[]>();
    const add = (key: string, geometry: THREE.BufferGeometry) => {
      const list = parts.get(key) ?? [];
      list.push(geometry.index ? geometry.toNonIndexed() : geometry);
      parts.set(key, list);
    };
    let seed = 2411 + WORLDS.indexOf(spec) * 977;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const kit: Kit = {
      height: (x, z) => spec.height(x, z),
      random,
      backdrop,
      box: (material, x, y, z, w, h, d, tilt = 0, turn = 0) => {
        const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
        geometry.rotateZ(tilt);
        geometry.rotateY(turn);
        geometry.translate(x, y, z);
        worldUvs(geometry);
        add(material, geometry);
      },
      column: (material, x, y, z, top, bottom, h, sides = 12) => {
        const geometry = new THREE.CylinderGeometry(top, bottom, h, sides).toNonIndexed();
        geometry.translate(x, y, z);
        worldUvs(geometry);
        add(material, geometry);
      },
      dome: (material, x, y, z, radius) => {
        const geometry = new THREE.SphereGeometry(radius, 32, 14, 0, TAU, 0, Math.PI / 2).toNonIndexed();
        geometry.translate(x, y, z);
        worldUvs(geometry);
        add(material, geometry);
      },
      blob: (material, x, y, z, sx, sy, sz, blobSeed, tint) => {
        const largest = Math.max(sx, sz);
        const geometry = new THREE.IcosahedronGeometry(1, largest > 120 ? 28 : largest > 24 ? 3 : 2);
        const position = geometry.attributes.position;
        const colors = new Float32Array(position.count * 3);
        for (let vertex = 0; vertex < position.count; vertex += 1) {
          const nx = position.getX(vertex);
          const ny = position.getY(vertex);
          const nz = position.getZ(vertex);
          const lumps = fbm(nx * 2.4 + blobSeed, nz * 2.4 + ny * 2.4, largest > 120 ? 6 : 4, 61);
          // Big masses tear away underneath into hanging crags, with a flat top like broken ground.
          const crags = largest > 120 && ny < 0 ? 1 + Math.pow(ridged(nx * 5 + blobSeed, nz * 5, 5, 63), 2.4) * 2.1 : 1;
          const scale = 0.72 + lumps * 0.56;
          const flat = largest > 120 && ny > 0 ? 0.3 : 1;
          position.setXYZ(vertex, nx * scale * sx + x, ny * scale * crags * flat * sy + y, nz * scale * sz + z);
          colors.set(tint(ny, lumps), vertex * 3);
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        worldUvs(geometry);
        add(material, geometry);
      },
      fern: (x, y, z, size) => {
        const spin = random() * Math.PI;
        for (const turn of [0, Math.PI / 2]) {
          const geometry = new THREE.PlaneGeometry(size, size).toNonIndexed();
          geometry.rotateY(spin + turn);
          geometry.translate(x, y + size * 0.46, z);
          add("fern", geometry);
        }
      },
      plume: (material, x, y, z, w, h) => {
        for (const turn of [0, Math.PI / 2]) {
          const geometry = new THREE.PlaneGeometry(w, h, 1, 8).toNonIndexed();
          const position = geometry.attributes.position;
          const lean = spec.plumes[material].lean;
          for (let vertex = 0; vertex < position.count; vertex += 1) {
            const rise = position.getY(vertex) / h + 0.5;
            position.setX(vertex, position.getX(vertex) * (1 + rise * lean) + rise * rise * lean * h * 0.5);
          }
          geometry.rotateY(turn);
          geometry.translate(x, y, z);
          add(`plume:${material}`, geometry);
        }
      },
      rotor: (x, y, z, radius, facing) => {
        const hub = new THREE.Group();
        hub.position.set(x, y, z);
        hub.rotation.y = facing;
        for (let blade = 0; blade < 3; blade += 1) {
          const geometry = new THREE.BoxGeometry(radius * 0.09, radius, 0.5);
          geometry.translate(0, radius / 2, 0);
          geometry.rotateZ((blade / 3) * TAU);
          const mesh = new THREE.Mesh(geometry, materials.white);
          mesh.castShadow = true;
          hub.add(mesh);
        }
        rotors.push(hub);
        group.add(hub);
      },
    };
    spec.build(kit);
    parts.forEach((geometries, key) => {
      const merged = mergeGeometries(geometries);
      for (const part of geometries) part.dispose();
      if (key.startsWith("plume:")) {
        const plume = key.slice(6);
        const settings = spec.plumes[plume];
        const material = makePlume(settings.color, settings.speed, settings.soft, settings.aspect);
        plumeMaterials.set(plume, material);
        group.add(new THREE.Mesh(merged, material));
        return;
      }
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.castShadow = key !== "glow" && key !== "red";
      mesh.receiveShadow = key !== "glow" && key !== "red";
      group.add(mesh);
    });
  };

  if (!backdrop) buildGround();
  buildProps();

  const { sky: skyDef, fog, sun, hemi: hemiDef, surface: surfaceDef } = spec;
  skyUniforms.mode.value = skyDef.mode;
  skyUniforms.zenith.value.set(skyDef.zenith);
  skyUniforms.horizon.value.set(skyDef.horizon);
  skyUniforms.sunDir.value.set(...skyDef.sunDir).normalize();
  skyUniforms.sunColor.value.set(skyDef.sunColor);
  skyUniforms.sunSize.value = skyDef.sunSize;
  skyUniforms.cover.value = skyDef.cover;
  skyUniforms.cloudDark.value.set(skyDef.cloudDark);
  skyUniforms.cloudLight.value.set(skyDef.cloudLight);
  sunLight.color.set(sun.color);
  sunLight.intensity = sun.intensity * 1.35;
  sunLight.position.copy(skyUniforms.sunDir.value).multiplyScalar(500);
  sunLight.target.position.set(0, 0, 0);
  hemi.color.set(hemiDef.sky);
  hemi.groundColor.set(hemiDef.ground);
  // A place built some other way has no land of its own to bounce the light back.
  const fill = backdrop ? 3 : 1.8;
  hemi.intensity = hemiDef.intensity * fill;
  surface.visible = surfaceDef !== undefined;
  if (surfaceDef) {
    surface.position.y = surfaceDef.y + seaLevel;
    surfaceUniforms.lava.value = surfaceDef.lava ? 1 : 0;
    surfaceUniforms.deep.value.set(surfaceDef.deep);
    surfaceUniforms.shallow.value.set(surfaceDef.shallow);
    surfaceUniforms.zenith.value.set(skyDef.zenith);
    surfaceUniforms.horizon.value.set(skyDef.horizon);
    surfaceUniforms.sunDir.value.copy(skyUniforms.sunDir.value);
    surfaceUniforms.sunColor.value.set(skyDef.sunColor);
    surfaceUniforms.fogColor2.value.set(fog.color);
    surfaceUniforms.fogDensity2.value = fog.density;
  }

  let flash = 0;
  let nextFlash = 3;
  return {
    spec,
    fog: new THREE.FogExp2(fog.color, fog.density),
    height: (x: number, z: number) => spec.height(x, z),
    blocked: (x: number, z: number) => Math.hypot(x, z) > 210 || !spec.walk(spec.height(x, z)),
    update(time: number, camera: THREE.Camera, dt: number) {
      skyUniforms.time.value = time;
      surfaceUniforms.time.value = time;
      weatherMaterial.uniforms.time.value = time % 400;
      weatherMaterial.uniforms.eye.value.copy(camera.position);
      plumeMaterials.forEach((material) => { material.uniforms.time.value = time; });
      for (const rotor of rotors) rotor.rotation.z = time * 0.6;
      // Lightning out at sea on Pelagos; a slow blink on Nox's relays.
      if (spec.sky.mode === 1) {
        if (time > nextFlash) {
          flash = 1;
          nextFlash = time + 4 + Math.random() * 7;
        }
        flash = Math.max(0, flash - dt * (flash > 0.5 ? 7 : 3));
      }
      skyUniforms.flash.value = flash;
      surfaceUniforms.flash.value = flash;
      hemi.intensity = hemiDef.intensity * fill * (1 + flash * 0.9);
      redMaterial.color.set("#ff3a24").multiplyScalar(1.7 * (Math.sin(time * 2.2) > 0.2 ? 1 : 0.12));
    },
    dispose() {
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
      Object.values(materials).forEach((material) => material.dispose());
      tile.dispose();
      panes.map.dispose();
      panes.glow.dispose();
      group.removeFromParent();
    },
  };
}
