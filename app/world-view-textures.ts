/*
 * The surfaces of the worlds, painted here in code: hand-pixelled stone, plants on cards, and rows
 * of windows. Everything is seeded, so it comes out the same on every load.
 */
import * as THREE from "three";

const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise that wraps every `period` cells, so textures tile without a seam. */
function noise(x: number, y: number, period: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const wrap = (value: number) => ((value % period) + period) % period;
  const corner = (cx: number, cy: number) => hash(wrap(cx), wrap(cy), seed);
  const top = corner(x0, y0) * (1 - fx) + corner(x0 + 1, y0) * fx;
  const bottom = corner(x0, y0 + 1) * (1 - fx) + corner(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

function fbm(u: number, v: number, period: number, octaves: number, seed: number) {
  let total = 0;
  let weight = 0.5;
  let scale = period;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += weight * noise(u * scale, v * scale, scale, seed + octave);
    weight /= 2;
    scale *= 2;
  }
  return total / (1 - 0.5 ** octaves);
}


function pixelTile(size: number, metres: number, shade: (x: number, y: number) => string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      context.fillStyle = shade(x, y);
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(1 / metres, 1 / metres);
  return texture;
}

const pick = (ramp: readonly string[], value: number) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(value * ramp.length)))];

/** A plant to stand on crossed cards. */
export function foliageTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  const leaf = (x: number, y: number, angle: number, length: number, color: string) => {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(length * 0.5, -length * 0.22, length, 0);
    context.quadraticCurveTo(length * 0.5, length * 0.22, 0, 0);
    context.fill();
    context.restore();
  };
  const greens = ["#2f6b3f", "#3f8a4c", "#58a95c"];
  for (let index = 0; index < 34; index += 1) {
    const angle = -Math.PI / 2 + (hash(index, 1, 91) - 0.5) * 2.5;
    const length = 15 + hash(index, 2, 91) * 19;
    leaf(32, 62, angle, length, greens[index % greens.length]);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Stone: a few grey steps with hard speckle. */
export function rockTile() {
  const ramp = ["#a8a8a8", "#c4c4c4", "#dcdcdc", "#f2f2f2"];
  return pixelTile(32, 6, (x, y) => pick(ramp, 0.15 + fbm(x / 32, y / 32, 5, 2, 107) * 0.55 + hash(x, y, 109) * 0.3));
}

/** Rows of windows, a few lit, for any building. Returns the wall and the lit panes. */
export function windowSurface() {
  const cells = 16;
  const cell = 4;
  const size = cells * cell;
  const wall = document.createElement("canvas");
  const lit = document.createElement("canvas");
  wall.width = wall.height = lit.width = lit.height = size;
  const paint = wall.getContext("2d")!;
  const glow = lit.getContext("2d")!;
  paint.fillStyle = "#54565c";
  paint.fillRect(0, 0, size, size);
  glow.fillStyle = "#000000";
  glow.fillRect(0, 0, size, size);
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const x = col * cell + cell * 0.2;
      const y = row * cell + cell * 0.25;
      const on = hash(col, row, 111) > 0.93;
      paint.fillStyle = on ? "#ffd89a" : "#20262e";
      paint.fillRect(x, y, cell * 0.6, cell * 0.5);
      if (on) {
        glow.fillStyle = hash(col, row, 113) > 0.5 ? "#ffcf8a" : "#ffe6c0";
        glow.fillRect(x, y, cell * 0.6, cell * 0.5);
      }
    }
  }
  const finish = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(1 / 32, 1 / 32);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    return texture;
  };
  return { map: finish(wall), glow: finish(lit) };
}
