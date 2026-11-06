/*
 * The crew's bodies in the richer pixel look. Everyone is cut from tapered shapes rather than
 * plain boxes, and each job has clothes of its own painted pixel by pixel into one small sheet:
 * an engineer's reflective bands, a doctor's open coat with the green cross, a farmer's overalls
 * and hat, a soldier's vest and pouches. One sheet per job and skin means a person costs a handful
 * of draws, however busy their clothes. Heads stay as they are, built from the portraits.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CIVILIAN_COLOR, CREW_ROLE_COLORS } from "./crew-portrait";

const SHEET = 64;
type Region = readonly [x: number, y: number, w: number, h: number];
const CLOTH: Region = [0, 0, 16, 16];
const TRIM: Region = [16, 0, 16, 16];
const TROUSER: Region = [32, 0, 16, 16];
const BOOT: Region = [48, 0, 16, 16];
const SKIN: Region = [0, 16, 8, 8];
const STRAP: Region = [8, 16, 8, 8];
const ACCENT: Region = [16, 16, 8, 8];
const FRONT: Region = [0, 24, 24, 24];
const BACK: Region = [24, 24, 24, 24];
const COAT: Region = [48, 16, 16, 16];
const HAT: Region = [48, 32, 16, 16];

const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};

const shaded = (color: string, amount: number) => `#${new THREE.Color(color).multiplyScalar(1 + amount).getHexString()}`;

type Clothes = { trousers: string; accent: string; strap: string; hat: boolean; coat: boolean };
const DEFAULT_CLOTHES: Clothes = { trousers: "#2b2433", accent: "#e9e4da", strap: "#1b1726", hat: false, coat: false };
const CLOTHES: Record<string, Partial<Clothes>> = {
  engineer: { trousers: "#33303e", accent: "#d9c67e", strap: "#4a3626" },
  technician: { trousers: "#3a3a48", accent: "#f4f1e6", hat: true },
  fabricator: { trousers: "#2e2a30", accent: "#5c3a24", strap: "#3c2618" },
  doctor: { trousers: "#40506a", accent: "#3fbf6f", coat: true },
  farmer: { trousers: "#3d5a78", accent: "#d9b65e", strap: "#3d5a78", hat: true },
  researcher: { trousers: "#2c3550", accent: "#e9e4da", coat: true },
  teacher: { trousers: "#3a2c3e", accent: "#f7d7a8" },
  navigator: { trousers: "#2a2540", accent: "#ffd27a" },
  security: { trousers: "#2a2630", accent: "#34303c", strap: "#14121a" },
  soldier: { trousers: "#2a2630", accent: "#34303c", strap: "#14121a" },
};
const clothesFor = (role: string): Clothes => ({ ...DEFAULT_CLOTHES, ...CLOTHES[role] });

function paintSheet(role: string, skin: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SHEET;
  const context = canvas.getContext("2d")!;
  const uniform = CREW_ROLE_COLORS[role] ?? CIVILIAN_COLOR;
  const clothes = clothesFor(role);
  const trim = shaded(uniform, -0.3);
  const seam = shaded(uniform, -0.52);
  const lit = shaded(uniform, 0.16);
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  };
  /** Cloth: a colour broken up by a faint weave and a few scuffs. */
  const weave = ([x0, y0, w, h]: Region, color: string, depth = 0.07) => {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const fold = (hash(Math.floor(x / 3), Math.floor(y / 4), 2) - 0.5) * depth * 2;
        const fleck = hash(x + x0, y + y0, 4);
        rect(x0 + x, y0 + y, 1, 1, shaded(color, fold + ((x + y) % 2 === 0 ? depth * 0.3 : 0) + (fleck > 0.95 ? depth : fleck < 0.04 ? -depth * 1.4 : 0)));
      }
    }
  };
  weave(CLOTH, uniform);
  // The lit side of a sleeve, and a seam down the other.
  for (let y = 0; y < 16; y += 1) {
    rect(4, y, 1, 1, lit);
    rect(12, y, 1, 1, seam);
  }
  weave(TRIM, trim);
  weave(TROUSER, clothes.trousers);
  rect(32, 6, 16, 1, shaded(clothes.trousers, -0.35));
  rect(32, 9, 16, 1, shaded(clothes.trousers, -0.35));
  rect(32, 7, 16, 2, shaded(clothes.trousers, 0.14));
  for (let y = 0; y < 16; y += 1) rect(39, y, 1, 1, shaded(clothes.trousers, -0.25));
  weave(BOOT, "#1c1924", 0.12);
  rect(48, 13, 16, 3, "#0d0b12");
  rect(48, 12, 16, 1, "#4a3f55");
  weave(SKIN, skin, 0.04);
  weave(STRAP, clothes.strap, 0.1);
  weave(ACCENT, clothes.accent, 0.05);
  weave(COAT, uniform, 0.05);
  rect(48, 28, 16, 1, seam);
  weave(HAT, role === "farmer" ? "#c9a558" : uniform, 0.09);
  rect(48, 42, 16, 2, role === "farmer" ? "#6a4a24" : seam);

  // The chest and back are painted as whole pieces of clothing.
  for (const panel of [FRONT, BACK]) weave(panel, uniform);
  const [fx, fy] = FRONT;
  const [bx, by] = BACK;
  const front = (x: number, y: number, w: number, h: number, color: string) => rect(fx + x, fy + y, w, h, color);
  const yoke = (color: string) => {
    front(0, 0, 24, 3, color);
    rect(bx, by, 24, 5, color);
    rect(bx, by + 5, 24, 1, seam);
    rect(bx + 11, by + 6, 2, 18, seam);
  };
  const pocket = (x: number, y: number, w = 6, h = 5) => {
    front(x, y, w, h, shaded(uniform, -0.08));
    front(x, y, w, 1, seam);
    front(x, y + h, w, 1, seam);
    front(x, y, 1, h, seam);
    front(x + w - 1, y, 1, h, seam);
    front(x, y + 1, w, 1, lit);
  };
  const belt = (color: string) => {
    front(0, 21, 24, 3, color);
    rect(bx, by + 21, 24, 3, color);
    front(10, 21, 4, 3, "#c79a4a");
  };
  yoke(trim);
  switch (role) {
    case "engineer":
    case "technician":
      front(11, 3, 2, 18, seam);
      front(0, 11, 24, 2, clothes.accent);
      front(0, 16, 24, 2, clothes.accent);
      rect(bx, by + 11, 24, 2, clothes.accent);
      rect(bx, by + 16, 24, 2, clothes.accent);
      pocket(3, 5, 6, 4);
      belt(clothes.strap);
      break;
    case "fabricator":
      // A heavy leather apron over the work shirt.
      front(5, 3, 2, 6, clothes.strap);
      front(17, 3, 2, 6, clothes.strap);
      weave([fx + 4, fy + 8, 16, 16], clothes.accent, 0.1);
      front(4, 8, 16, 1, clothes.strap);
      front(8, 15, 8, 5, shaded(clothes.accent, -0.2));
      rect(bx + 2, by + 8, 20, 2, clothes.strap);
      break;
    case "doctor":
      // An open coat, a dark shirt, and the green cross on the chest.
      front(9, 0, 6, 24, "#2c3550");
      front(10, 2, 4, 3, "#e9e4da");
      front(8, 3, 1, 21, seam);
      front(15, 3, 1, 21, seam);
      front(3, 4, 2, 6, clothes.accent);
      front(1, 6, 6, 2, clothes.accent);
      pocket(1, 14, 6, 5);
      pocket(17, 14, 6, 5);
      break;
    case "farmer":
      // Overalls with a bib and straps.
      front(4, 0, 3, 11, clothes.strap);
      front(17, 0, 3, 11, clothes.strap);
      front(4, 10, 16, 14, clothes.strap);
      front(4, 10, 16, 1, shaded(clothes.strap, 0.3));
      front(8, 13, 8, 5, shaded(clothes.strap, -0.2));
      front(5, 10, 2, 2, clothes.accent);
      front(17, 10, 2, 2, clothes.accent);
      rect(bx + 4, by, 3, 24, clothes.strap);
      rect(bx + 17, by, 3, 24, clothes.strap);
      break;
    case "researcher":
      // A lab coat, a tie, and pens in the pocket.
      front(9, 0, 6, 12, "#dfe4ee");
      front(11, 2, 2, 10, trim);
      front(8, 0, 1, 24, seam);
      front(15, 0, 1, 24, seam);
      pocket(17, 6, 5, 5);
      front(18, 4, 1, 3, "#d9654f");
      front(20, 4, 1, 3, "#2c3550");
      pocket(1, 15, 6, 5);
      pocket(17, 15, 6, 5);
      break;
    case "teacher":
      // A buttoned cardigan over a pale shirt.
      front(10, 0, 4, 9, clothes.accent);
      front(10, 9, 4, 15, shaded(uniform, -0.16));
      for (let y = 6; y < 22; y += 4) front(11, y, 2, 2, "#fff0e0");
      pocket(2, 15, 6, 5);
      pocket(16, 15, 6, 5);
      break;
    case "navigator":
      // A flight jacket: the zip runs across, with a patch on the shoulder.
      for (let y = 0; y < 16; y += 1) front(16 - Math.floor(y / 2), 3 + y, 2, 1, seam);
      front(3, 5, 5, 5, trim);
      front(4, 6, 3, 3, clothes.accent);
      belt(trim);
      break;
    case "security":
    case "soldier":
      // A plate vest with pouches.
      front(3, 3, 18, 21, clothes.accent);
      front(3, 3, 18, 1, shaded(clothes.accent, 0.5));
      front(11, 3, 2, 21, clothes.strap);
      front(3, 15, 18, 1, clothes.strap);
      for (const x of [4, 9, 14]) {
        front(x, 17, 5, 5, shaded(clothes.accent, 0.3));
        front(x, 17, 5, 1, shaded(clothes.accent, 0.8));
      }
      rect(bx + 3, by + 3, 18, 21, clothes.accent);
      rect(bx + 3, by + 12, 18, 1, clothes.strap);
      belt(clothes.strap);
      break;
    default:
      // A plain striped shirt.
      for (let y = 5; y < 22; y += 4) front(0, y, 24, 2, shaded(uniform, -0.2));
      front(9, 0, 6, 3, skin);
      for (let y = 5; y < 22; y += 4) rect(bx, by + y, 24, 2, shaded(uniform, -0.2));
      belt("#3a2c2a");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  return texture;
}

/** Points a face of a shape at a region of the sheet. */
function mapRegion(geometry: THREE.BufferGeometry, region: Region, first = 0, count = geometry.attributes.uv.count) {
  const uv = geometry.attributes.uv;
  const [x, y, w, h] = region;
  for (let index = first; index < first + count; index += 1) {
    uv.setXY(index, (x + uv.getX(index) * w) / SHEET, 1 - (y + (1 - uv.getY(index)) * h) / SHEET);
  }
  return geometry;
}

/** A box narrower at one end, with its six faces (+x, -x, +y, -y, +z, -z) on regions of the sheet. */
function block(w: number, h: number, d: number, x: number, y: number, z: number, faces: Region | readonly Region[], top = 1, bottom = 1) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const scale = position.getY(index) > 0 ? top : bottom;
    position.setX(index, position.getX(index) * scale);
    position.setZ(index, position.getZ(index) * (1 + (scale - 1) * 0.5));
  }
  const each = typeof faces[0] === "number";
  for (let face = 0; face < 6; face += 1) mapRegion(geometry, (each ? faces : faces[face]) as Region, face * 4, 4);
  geometry.translate(x, y, z);
  return geometry.toNonIndexed();
}

/** A limb: a six-sided taper hanging down from y. */
function taper(topRadius: number, bottomRadius: number, h: number, y: number, region: Region, x = 0, z = 0) {
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, h, 6, 1);
  mapRegion(geometry, region);
  geometry.scale(1, 1, 1.12);
  geometry.translate(x, y - h / 2, z);
  return geometry.toNonIndexed();
}

const merged = (parts: THREE.BufferGeometry[]) => {
  const geometry = mergeGeometries(parts, false)!;
  for (const part of parts) part.dispose();
  return geometry;
};

const sheets = new Map<string, THREE.MeshLambertMaterial>();
const sheetFor = (role: string, skin: string) => {
  const key = `${role in CLOTHES ? role : "civilian"}:${skin}`;
  let material = sheets.get(key);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ map: paintSheet(role, skin), flatShading: true });
    sheets.set(key, material);
  }
  return material;
};

// Shapes are the same for everyone in a job, so each is only built once.
const shapes = new Map<string, THREE.BufferGeometry>();
const shape = (key: string, build: () => THREE.BufferGeometry) => {
  let geometry = shapes.get(key);
  if (!geometry) {
    geometry = build();
    shapes.set(key, geometry);
  }
  return geometry;
};

/** Everything above the legs that doesn't swing, built around the waist so an elder can stoop. */
function torsoShape(role: string) {
  const clothes = clothesFor(role);
  const armoured = role === "security" || role === "soldier";
  const parts = [
    block(0.56, 0.6, 0.3, 0, 0.27, 0, [CLOTH, CLOTH, TRIM, TRIM, FRONT, BACK], 1.05, 0.84),
    block(0.26, 0.1, 0.24, 0, 0.6, 0, TRIM, 0.7, 1),
    block(0.14, 0.08, 0.14, 0, 0.66, 0, SKIN),
    block(0.5, 0.2, 0.28, 0, -0.04, 0, TROUSER, 0.94, 1.02),
  ];
  for (const side of [-1, 1]) parts.push(block(armoured ? 0.2 : 0.16, 0.12, armoured ? 0.28 : 0.22, side * 0.3, 0.55, 0, armoured ? [STRAP, STRAP, ACCENT, STRAP, STRAP, STRAP] : TRIM, 0.8, 1));
  if (clothes.coat) {
    // The tails of a long coat, split up the back.
    parts.push(block(0.25, 0.48, 0.3, -0.14, -0.26, 0, COAT, 1, 1.1), block(0.25, 0.48, 0.3, 0.14, -0.26, 0, COAT, 1, 1.1));
  }
  if (role === "engineer") {
    // A tool belt with pouches.
    parts.push(block(0.12, 0.17, 0.12, -0.28, -0.03, 0.08, STRAP), block(0.1, 0.14, 0.1, 0.28, -0.03, 0.09, STRAP));
  }
  if (role === "teacher") parts.push(block(0.36, 0.1, 0.3, 0, 0.58, 0.01, ACCENT, 0.8, 1), block(0.1, 0.32, 0.03, 0.08, 0.38, 0.17, ACCENT));
  if (role === "navigator") parts.push(block(0.38, 0.14, 0.32, 0, 0.6, -0.02, TRIM, 1.05, 0.9));
  if (armoured) parts.push(block(0.1, 0.17, 0.1, -0.29, -0.02, 0, STRAP));
  return merged(parts);
}

const armShape = () => merged([
  taper(0.09, 0.065, 0.54, 0, CLOTH),
  taper(0.078, 0.074, 0.07, -0.51, TRIM),
  block(0.13, 0.12, 0.15, 0, -0.64, 0, SKIN, 1, 0.8),
]);

const legShape = () => merged([
  taper(0.125, 0.085, 0.72, 0, TROUSER),
  block(0.2, 0.17, 0.32, 0, -0.74, 0.04, [BOOT, BOOT, STRAP, BOOT, BOOT, BOOT], 0.82, 1.04),
]);

/** A hat of the job's own, worn on the head so it nods with them. */
const hatShape = (role: string) => merged(role === "farmer"
  ? [block(0.68, 0.04, 0.68, 0, 0.42, 0, HAT), block(0.42, 0.16, 0.42, 0, 0.5, 0, HAT, 0.86, 1)]
  : [block(0.44, 0.12, 0.44, 0, 0.45, 0, HAT, 0.92, 1), block(0.3, 0.04, 0.2, 0, 0.41, 0.28, HAT)]);

export type PersonBody = {
  group: THREE.Group;
  arms: THREE.Object3D[];
  legs: THREE.Object3D[];
  torso: THREE.Object3D;
  head: THREE.Group;
};

/** A body in its job's clothes, ready to have a head put on it. */
export function personBody(role: string, skin: string): PersonBody {
  const material = sheetFor(role, skin);
  const known = role in CLOTHES ? role : "civilian";
  const group = new THREE.Group();
  const limb = (geometry: THREE.BufferGeometry, x: number, y: number) => {
    // Limbs hang from a pivot at the shoulder or hip so they can swing.
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(new THREE.Mesh(geometry, material));
    group.add(pivot);
    return pivot;
  };
  const legs = [-0.13, 0.13].map((x) => limb(shape("leg", legShape), x, 0.82));
  const arms = [-0.36, 0.36].map((x) => limb(shape("arm", armShape), x, 1.42));
  const torso = new THREE.Mesh(shape(`torso:${known}`, () => torsoShape(known)), material);
  torso.position.y = 0.85;
  // The head sits on a pivot at the neck so it can nod and turn.
  const head = new THREE.Group();
  head.position.y = 1.52;
  group.add(torso, head);
  if (clothesFor(known).hat) head.add(new THREE.Mesh(shape(`hat:${known}`, () => hatShape(known)), material));
  return { group, arms, legs, torso, head };
}
