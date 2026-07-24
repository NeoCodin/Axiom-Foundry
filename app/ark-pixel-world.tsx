"use client";

import { useEffect, useRef } from "react";

type ArkPixelWorldProps = {
  worldName: string;
  progress: number;
  transit: boolean;
};

type WorldPalette = {
  seed: number;
  void: string;
  atmosphere: string;
  shadow: string;
  low: string;
  middle: string;
  high: string;
  cloud: string;
  feature: string;
};

const WORLD_PALETTES: Record<string, WorldPalette> = {
  pelagos: {
    seed: 17,
    void: "#020609",
    atmosphere: "#54ebff",
    shadow: "#04101d",
    low: "#073b66",
    middle: "#087ca4",
    high: "#22c6d5",
    cloud: "#b8f7ef",
    feature: "#0e556f",
  },
  viridia: {
    seed: 31,
    void: "#020705",
    atmosphere: "#76f7aa",
    shadow: "#07150d",
    low: "#123b22",
    middle: "#26733e",
    high: "#62b85e",
    cloud: "#c5f2b2",
    feature: "#174e32",
  },
  cinder: {
    seed: 47,
    void: "#080302",
    atmosphere: "#ffb44d",
    shadow: "#1b0804",
    low: "#5b1b0f",
    middle: "#a83e18",
    high: "#e47722",
    cloud: "#ffc35d",
    feature: "#38120b",
  },
  nox: {
    seed: 73,
    void: "#040207",
    atmosphere: "#b17cff",
    shadow: "#0b0618",
    low: "#26134a",
    middle: "#523084",
    high: "#8d5ac2",
    cloud: "#d4afff",
    feature: "#150d2b",
  },
  vesper: {
    seed: 101,
    void: "#080204",
    atmosphere: "#ff5b68",
    shadow: "#180409",
    low: "#4b0d1a",
    middle: "#8f1f2f",
    high: "#d94845",
    cloud: "#ff8d70",
    feature: "#2b0710",
  },
  "cold-wake": {
    seed: 7,
    void: "#010305",
    atmosphere: "#55dce8",
    shadow: "#071218",
    low: "#10313a",
    middle: "#1a5c67",
    high: "#4caeb5",
    cloud: "#9ee8e7",
    feature: "#0c242c",
  },
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

function slugify(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");
}

function hash(x: number, y: number, seed: number) {
  const result = Math.sin(x * 127.1 + y * 311.7 + seed * 71.9) * 43758.5453;
  return result - Math.floor(result);
}

function paintPixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha = 1,
) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(x, y, size, size);
  context.globalAlpha = 1;
}

function drawDistantPelagos(
  context: CanvasRenderingContext2D,
  palette: WorldPalette,
  frame: number,
) {
  const pulse = frame % 8 < 4 ? 1 : 0.7;
  paintPixel(context, 59, 59, 10, 10, palette.shadow, 0.88);
  context.globalAlpha = 0.72;
  context.fillStyle = palette.low;
  context.fillRect(61, 57, 6, 14);
  context.fillStyle = palette.middle;
  context.fillRect(57, 61, 14, 6);
  context.globalAlpha = 1;
  paintPixel(context, 61, 61, 6, 6, palette.atmosphere, pulse);
  paintPixel(context, 63, 63, 2, 2, "#eaffff", pulse);

  for (let index = 0; index < 8; index += 1) {
    const x = 20 + ((index * 37 + 11) % 92);
    const y = 19 + ((index * 23 + 7) % 78);
    paintPixel(context, x, y, 2, 2, index % 3 === 0 ? palette.atmosphere : "#6b858b", 0.35);
  }
}

function drawWorld(
  context: CanvasRenderingContext2D,
  palette: WorldPalette,
  worldSlug: string,
  progress: number,
  frame: number,
) {
  const size = context.canvas.width;
  context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = false;

  if (worldSlug === "cold-wake") {
    drawDistantPelagos(context, palette, frame);
    return;
  }

  const center = size / 2;
  const radius = 53;
  const pixel = 2;
  const cloudShift = Math.floor(frame / 2);
  const readiness = clamp(progress);

  for (let y = 0; y < size; y += pixel) {
    for (let x = 0; x < size; x += pixel) {
      const nx = (x + pixel / 2 - center) / radius;
      const ny = (y + pixel / 2 - center) / radius;
      const distanceSquared = nx * nx + ny * ny;
      if (distanceSquared > 1.13) continue;

      const distance = Math.sqrt(distanceSquared);
      if (distance > 1) {
        const atmosphereNoise = hash(x / pixel, y / pixel, palette.seed + frame % 3);
        if (distance < 1.075 && atmosphereNoise > 0.27) {
          paintPixel(
            context,
            x,
            y,
            pixel,
            palette.atmosphere,
            distance < 1.035 ? 0.72 : 0.28,
          );
        }
        continue;
      }

      const sphereDepth = Math.sqrt(Math.max(0, 1 - distanceSquared));
      const light = clamp(nx * -0.48 + ny * -0.42 + sphereDepth * 0.82);
      const terrain =
        hash(Math.floor(x / 5), Math.floor(y / 5), palette.seed) * 0.54 +
        hash(Math.floor(x / 11), Math.floor(y / 9), palette.seed + 19) * 0.3 +
        (Math.sin((ny * 8 + nx * 3.5) + palette.seed) + 1) * 0.08;
      const dither = BAYER[(y / pixel) % 4][(x / pixel) % 4] / 16;
      const terminator = clamp((light - 0.08) * 1.45);
      const shade = terminator * 0.62 + terrain * 0.38 + readiness * 0.035;

      let color = palette.shadow;
      if (shade > 0.69 + dither * 0.12) color = palette.high;
      else if (shade > 0.38 + dither * 0.09) color = palette.middle;
      else if (shade > 0.18 + dither * 0.05) color = palette.low;

      const featureNoise = hash(Math.floor(x / 7), Math.floor(y / 7), palette.seed + 43);
      if (featureNoise > 0.81 && light > 0.18 && distance < 0.94) color = palette.feature;
      paintPixel(context, x, y, pixel, pixel, color);

      const cloudNoise =
        hash(Math.floor((x + cloudShift) / 8), Math.floor(y / 4), palette.seed + 89) +
        Math.sin(y * 0.29 + x * 0.07 + palette.seed) * 0.2;
      const cloudBand = Math.abs(Math.sin(ny * 11 + nx * 2.8 + palette.seed * 0.1));
      if (
        cloudNoise > 0.88 &&
        cloudBand > 0.56 &&
        light > 0.32 &&
        distance < 0.92
      ) {
        paintPixel(context, x, y, pixel, pixel, palette.cloud, 0.62);
      }

      if (distance > 0.955 && light > 0.16 && (x + y) % 4 === 0) {
        paintPixel(context, x, y, pixel, pixel, palette.atmosphere, 0.82);
      }
    }
  }

  const glintX = 37 + (frame % 3) * 2;
  paintPixel(context, glintX, 31, 4, 2, palette.cloud, 0.68);
  paintPixel(context, glintX + 2, 29, 2, 2, "#f4ffff", 0.72);
}

export function ArkPixelWorld({
  worldName,
  progress,
  transit,
}: ArkPixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldSlug = slugify(worldName);
  const palette = WORLD_PALETTES[worldSlug] ?? WORLD_PALETTES.pelagos;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    drawWorld(context, palette, worldSlug, progress, frame);
    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      frame += transit ? 2 : 1;
      drawWorld(context, palette, worldSlug, progress, frame);
    }, transit ? 120 : 240);
    return () => window.clearInterval(interval);
  }, [palette, progress, transit, worldSlug]);

  return (
    <canvas
      ref={canvasRef}
      className="ark-pixel-world-canvas"
      width={128}
      height={128}
      role="img"
      aria-label={worldSlug === "cold-wake" ? "Pelagos, still distant" : `${worldName}, rendered from the Ark's orbital feed`}
    />
  );
}
