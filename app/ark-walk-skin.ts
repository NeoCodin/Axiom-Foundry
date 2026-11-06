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

export const WORKING = new Set(["fabrication", "hangar", "chamber", "bridge", "stores", "workshop", "armory", "simulator", "lab", "briefing"]);

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
      const patch = hash(Math.floor(x / 6), Math.floor(y / 6), 3);
      const streak = hash(x, Math.floor(y / 9), 8);
      const fleck = hash(x, y, 5);
      const step = Math.floor((patch * 0.55 + streak * 0.45) * 4) / 3;
      const light = 0.74 + step * 0.24 + (fleck > 0.94 ? 0.08 : fleck < 0.06 ? -0.14 : 0);
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

const pick = (ramp: readonly string[], value: number) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(value * ramp.length)))];

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

const blotch = (x: number, y: number, size: number, seed: number) => {
  const cell = (cx: number, cy: number) => hash(((cx % size) + size) % size, ((cy % size) + size) % size, seed);
  const fx = x / 16 - Math.floor(x / 16);
  const fy = y / 16 - Math.floor(y / 16);
  const cx = Math.floor(x / 16);
  const cy = Math.floor(y / 16);
  const top = cell(cx, cy) * (1 - fx) + cell(cx + 1, cy) * fx;
  return top * (1 - fy) + (cell(cx, cy + 1) * (1 - fx) + cell(cx + 1, cy + 1) * fx) * fy;
};

/** Slabs of stone with a dark joint, a lit top edge and a scatter of flecks, in any colour of stone. */
export function stoneFloor(ramp: readonly string[], joint: string, lit: string, fleck: string) {
  return pixelTile(64, 2.4, (x, y) => {
    const tx = x % 32;
    const ty = y % 32;
    if (tx === 31 || ty === 31) return joint;
    if (tx === 0 || ty === 0) return lit;
    const spot = hash(x, y, 1);
    if (spot > 0.93) return fleck;
    if (spot > 0.88) return lit;
    return pick(ramp, 0.35 + blotch(x, y, 4, 3) * 0.6);
  });
}

/** Long boards, staggered, with the grain running down them. */
export function plankFloor() {
  const oak = ["#7d5233", "#94633e", "#a97549", "#bc8656"];
  return pixelTile(64, 2.4, (x, y) => {
    const row = Math.floor(y / 8);
    const offset = (row * 23) % 64;
    if (y % 8 === 7) return "#4e3220";
    if ((x + offset) % 40 === 0) return "#4e3220";
    const board = hash(Math.floor((x + offset) / 40), row, 21) * 0.32;
    return pick(oak, 0.12 + board + Math.sin(x * 0.5 + y) * 0.06 + hash(x, Math.floor(y / 2), 22) * 0.3);
  });
}

/** A door leaf as you see it from the front, with its handle at the right. */
export function paintDoorLeaf(context: CanvasRenderingContext2D, width: number, height: number, paint: string, open: boolean) {
  const navy = ["#3b4266", "#454c74", "#505883"];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      context.fillStyle = shade(new THREE.Color(pick(navy, 0.2 + hash(x, y, 14) * 0.7)).lerp(new THREE.Color(paint), 0.14).getStyle(), 0);
      context.fillRect(x, y, 1, 1);
    }
  }
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  };
  rect(0, 0, width, 1, "#6a72a0");
  rect(0, 0, 1, height, "#2e3350");
  rect(width - 1, 0, 1, height, "#2e3350");
  // The kick plate.
  const kick = Math.round(height * 0.84);
  for (let y = kick; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      rect(x, y, 1, 1, pick(["#7e8399", "#979cb1", "#b2b7ca"], 0.2 + hash(Math.floor(x / 4), y, 8) * 0.7));
    }
  }
  rect(2, kick - 1, width - 4, 1, "#2e3350");
  // The colour bar, and the vision panel over it.
  const bar = Math.round(height * 0.6);
  rect(2, bar, width - 4, 2, paint);
  const paneW = Math.round(width * 0.46);
  const paneX = Math.round((width - paneW) / 2);
  const paneY = Math.round(height * 0.14);
  const paneH = Math.round(height * 0.36);
  rect(paneX - 2, paneY - 2, paneW + 4, paneH + 4, "#22243a");
  rect(paneX, paneY, paneW, paneH, open ? "#7fb1e0" : "#14162a");
  if (open) {
    rect(paneX, paneY, paneW, 2, "#b8d8f4");
    rect(paneX + 2, paneY + 3, 2, paneH - 6, "#a4cbec");
  }
  // The handle.
  rect(width - 5, Math.round(height * 0.48), 2, Math.round(height * 0.2), "#f0cc72");
  rect(width - 4, Math.round(height * 0.48), 1, Math.round(height * 0.2), "#94672c");
}

/** The ship's own materials, each sized in metres. */
export function shipSurfaces() {
  const frame = ["#3f3f54", "#4d4e66", "#5f6079", "#74758e"];
  const metal = ["#7e8399", "#979cb1", "#b2b7ca", "#d1d5e2"];
  const dark = ["#33344a", "#3f4058", "#4c4d66", "#5c5d78"];
  const brass = ["#94672c", "#b7863a", "#d6a84d", "#f0cc72"];
  const walnut = ["#4b2a1c", "#62392a", "#7a4a31", "#93603f"];
  const slat = ["#2b2838", "#37334a", "#433e58"];
  const cork = ["#8c6239", "#a87a48", "#c0935d"];
  return {
    // Riveted plate: a seam every half tile, rivets at the corners, worn lighter at the edges.
    frame: pixelTile(32, 1.6, (x, y) => {
      const tx = x % 16;
      const ty = y % 16;
      if (ty === 15) return frame[0];
      if (ty === 0) return frame[3];
      if ((tx === 2 || tx === 13) && (ty === 2 || ty === 13)) return frame[3];
      return pick(frame, 0.3 + hash(x, y, 7) * 0.4);
    }),
    steel: pixelTile(32, 1.2, (x, y) => pick(metal, 0.2 + hash(Math.floor(x / 8), y, 8) * 0.7)),
    darkSteel: pixelTile(32, 1.2, (x, y) => pick(dark, 0.15 + hash(Math.floor(x / 8), y, 9) * 0.75)),
    brass: pixelTile(16, 0.6, (x, y) => pick(brass, 0.25 + hash(Math.floor(x / 4), Math.floor(y / 2), 10) * 0.75)),
    walnut: pixelTile(32, 1.6, (x, y) => {
      if (x % 16 === 15) return walnut[0];
      return pick(walnut, 0.4 + Math.sin((x + Math.sin(y / 9) * 0.7) * 1.2) * 0.13 + hash(x, Math.floor(y / 4), 3) * 0.2);
    }),
    slats: pixelTile(32, 1.2, (x, y) => (y % 8 === 7 ? slat[0] : pick(slat, 0.4 + hash(x, y, 11) * 0.5))),
    cork: pixelTile(32, 1.2, (x, y) => pick(cork, hash(x, y, 12))),
    locker: pixelTile(32, 1.2, (x, y) => (y % 16 === 15 ? "#3c4560" : pick(["#5b6a8c", "#667699", "#7283a7"], 0.2 + hash(x, y, 13) * 0.7))),
    hazard: pixelTile(32, 0.9, (x, y) => (((x + y) / 32) % 1 < 0.5 ? "#e0b13a" : "#1b1b20")),
    cloth: pixelTile(32, 0.8, (x, y) => pick(["#c4c4c4", "#dcdcdc", "#f2f2f2"], ((x + y) % 2 === 0 ? 0.55 : 0.2) + hash(x, y, 16) * 0.35)),
  };
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
      // Darker plate to head height, as a working wall has, then a rail and paler plate above.
      mottle(base, base + 3.4, shade(colors.plaster, -0.42), 0.1);
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
          context.fillStyle = shade(colors.plaster, y < base + 3.4 ? -0.2 : 0.14);
          for (const rx of [3, 28]) for (const ry of [0.2, 1]) context.fillRect(x + rx, at(y + ry), 1, 1);
        }
      }
      band(base, base + 0.3, colors.skirting);
      band(base + 0.3, base + 0.34, shade(colors.paint, -0.3));
      band(base + 3.4, base + 3.5, "#3a3a4c");
      band(base + 3.5, base + 3.58, colors.paint);
      band(base + 3.58, base + 3.62, shade(colors.paint, 0.4));
    }
  } else {
    // Timber below the rail, plaster above with a moulded panel.
    const rail = height > 6 ? 3.2 : 1.1;
    const timber = "#5e3626";
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
