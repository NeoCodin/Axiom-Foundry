/*
 * The ship's surfaces in the richer pixel look. Lived-in halls and rooms get timber below a rail
 * and painted plaster above; working halls get riveted plate. Everything solid carries a scuffed
 * grain, measured in metres, so no surface is ever one flat colour. Pure painting: ark-walk.tsx
 * supplies the colours, which change with each room and world.
 */
import * as THREE from "three";

/** Pixels to a metre on a wall, and metres across one wall tile. */
export const WALL_PIXELS = 20;
export const WALL_SPAN = 3.2;
/** Metres across one repeat of the grain. */
const GRAIN_SPAN = 1.6;

const WORKING = new Set(["fabrication", "hangar", "chamber", "bridge", "stores", "workshop", "armory", "simulator", "lab", "briefing"]);

const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};

const shade = (color: string, amount: number) => {
  const made = new THREE.Color(color).convertLinearToSRGB();
  const scale = 1 + amount;
  return `rgb(${Math.min(255, Math.round(made.r * 255 * scale))},${Math.min(255, Math.round(made.g * 255 * scale))},${Math.min(255, Math.round(made.b * 255 * scale))})`;
};

/** Grey scuffs and flecks to lay over any solid colour. */
export function grainTexture() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const patch = hash(Math.floor(x / 6), Math.floor(y / 6), 3) * 0.06;
      const fleck = hash(x, y, 5);
      const light = 0.9 + patch + (fleck > 0.94 ? 0.05 : fleck < 0.05 ? -0.07 : 0);
      const value = Math.round(Math.min(1, light) * 255);
      context.fillStyle = `rgb(${value},${value},${value})`;
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(1 / GRAIN_SPAN, 1 / GRAIN_SPAN);
  return texture;
}

/** Gives a box texture coordinates in metres, so the grain is the same size on every piece. */
export function tileBox(geometry: THREE.BufferGeometry, w: number, h: number, d: number, x: number, y: number, z: number) {
  const uv = geometry.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let index = 0; index < uv.count; index += 1) {
    const [across, up] = sizes[Math.floor(index / 4)] ?? [1, 1];
    uv.setXY(index, uv.getX(index) * across + x + z, uv.getY(index) * up + y);
  }
}

/** The same for a round piece: around its girth and up its height. */
export function tileColumn(geometry: THREE.BufferGeometry, radius: number, h: number) {
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, uv.getX(index) * radius * 6.28, uv.getY(index) * h);
}

export type WallColors = { plaster: string; seam: string; bevel: string; skirting: string; paint: string; metal: string };

/** One tile of wall, WALL_SPAN wide and the room's full height, floor at the bottom. */
export function paintWall(context: CanvasRenderingContext2D, kind: string, height: number, levels: readonly number[], top: number, colors: WallColors) {
  const width = Math.round(WALL_SPAN * WALL_PIXELS);
  const rows = Math.round(height * WALL_PIXELS);
  const at = (y: number) => rows - Math.round(y * WALL_PIXELS);
  const band = (from: number, to: number, color: string) => {
    context.fillStyle = color;
    context.fillRect(0, at(to), width, Math.max(1, at(from) - at(to)));
  };
  /** A base colour broken up pixel by pixel, the way a painted surface wears. */
  const mottle = (from: number, to: number, color: string, depth: number) => {
    const y0 = at(to);
    const y1 = at(from);
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const blotch = hash(Math.floor(x / 5), Math.floor(y / 5), 9);
        const fleck = hash(x, y, 7);
        context.fillStyle = shade(color, (blotch - 0.5) * depth + (fleck > 0.93 ? depth * 0.6 : fleck < 0.05 ? -depth * 0.7 : 0));
        context.fillRect(x, y, 1, 1);
      }
    }
  };
  const working = WORKING.has(kind);
  mottle(0, height, colors.plaster, 0.1);
  if (working) {
    // Riveted plate, each sheet a little different.
    for (const base of levels) {
      const tall = base + top;
      for (let y = base; y < tall; y += 1.2) {
        band(y, y + 0.06, colors.seam);
        band(y + 0.06, y + 0.1, colors.bevel);
        for (let sheet = 0; sheet < 2; sheet += 1) {
          const x = sheet * 32;
          context.fillStyle = colors.seam;
          context.fillRect(x, at(y + 1.2), 1, 24);
          context.fillStyle = shade(colors.plaster, (hash(sheet, Math.round(y * 3), 13) - 0.5) * 0.12);
          context.globalAlpha = 0.35;
          context.fillRect(x + 1, at(y + 1.14), 31, 21);
          context.globalAlpha = 1;
          context.fillStyle = colors.bevel;
          for (const rx of [3, 28]) for (const ry of [0.2, 1]) context.fillRect(x + rx, at(y + ry), 2, 2);
        }
      }
      band(base, base + 0.3, colors.skirting);
      band(base + 0.3, base + 0.34, shade(colors.paint, -0.3));
      band(base + 0.6, base + 1.1, colors.paint);
      band(base + 1.1, base + 1.18, shade(colors.paint, 0.4));
    }
  } else {
    // Timber below the rail, plaster above with a moulded panel.
    const rail = height > 6 ? 3.2 : 1.1;
    const timber = "#6e4730";
    for (const base of levels) {
      for (let board = 0; board < 4; board += 1) {
        const x0 = board * 16;
        for (let x = x0; x < x0 + 16; x += 1) {
          for (let y = at(base + rail); y < at(base + 0.2); y += 1) {
            const line = Math.sin((x + Math.sin(y * 0.1 + board) * 1.3) * 1.1);
            const stain = hash(board, 2, 15) * 0.14 - 0.07;
            context.fillStyle = shade(timber, stain + line * 0.1 + (hash(x, Math.floor(y / 5), 17) - 0.5) * 0.12);
            context.fillRect(x, y, 1, 1);
          }
        }
        context.fillStyle = "#2c1a12";
        context.fillRect(x0 + 15, at(base + rail), 1, Math.round((rail - 0.2) * WALL_PIXELS));
      }
      band(base, base + 0.2, colors.skirting);
      band(base + rail, base + rail + 0.14, "#2c1a12");
      band(base + rail + 0.14, base + rail + 0.17, "#c79a4a");
      band(base + rail + 0.17, base + rail + 0.3, colors.paint);
    }
    if (height > 6) {
      const low = 4.6;
      const high = height - 2.4;
      context.fillStyle = colors.seam;
      context.fillRect(8, at(high), 48, 2);
      context.fillRect(8, at(low), 48, 2);
      context.fillRect(8, at(high), 2, at(low) - at(high));
      context.fillRect(54, at(high), 2, at(low) - at(high));
      context.fillStyle = colors.bevel;
      context.fillRect(10, at(high) + 2, 44, 1);
    }
  }
  band(height - 0.35, height, colors.metal);
}
