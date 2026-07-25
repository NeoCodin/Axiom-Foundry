"use client";

import { useEffect, useRef } from "react";

export type LawPressState =
  | "dormant"
  | "manual"
  | "warming"
  | "active"
  | "rapid"
  | "synchronized"
  | "law-ready";

export type LawHeartTier = {
  count: number;
  output: number;
};

export type LawHeartDroneFrame = {
  id: string;
  color: string;
  compromised?: boolean;
};

type LawPressCanvasProps = {
  state: LawPressState;
  flux: number;
  fluxPerSecond: number;
  manualGain: number;
  lifetimeAxioms: number;
  tiers: readonly LawHeartTier[];
  manualPulses: number;
  pulseSerial: number;
  recalibrationProgress: number;
  provenLaws: number;
  preparingRecalibration: boolean;
  droneFrames?: readonly LawHeartDroneFrame[];
};

type PurchaseEvent = {
  tierIndex: number;
  quantity: number;
  startedAt: number;
};

type ExpenditureEvent = {
  strength: number;
  startedAt: number;
};

type RecalibrationEvent = {
  startedAt: number;
  fromAxioms: number;
  toAxioms: number;
};

type ManualPulseEvent = {
  serial: number;
  startedAt: number;
};

type Point = readonly [number, number];

export type LawHeartSpectrum = {
  threshold: number;
  name: string;
  core: string;
  surface: string;
  surfaceBright: string;
  limb: string;
  corona: readonly string[];
  shard: string;
};

const SIZE = 512;
const CENTER = SIZE / 2;
const TWO_PI = Math.PI * 2;
const MAX_FIELD_PARTICLES = 480;
const MAX_DENSITY_PARTICLES = 160;
const TIER_COLORS = [
  "#55e6e8",
  "#559dff",
  "#b87cff",
  "#f2bc55",
  "#fff0b5",
  "#ff695c",
] as const;
const COLORS = {
  black: "#010304",
  void: "#020507",
  cyanDark: "#0b333a",
  cyan: TIER_COLORS[0],
  white: "#eaffff",
  amber: "#f2bc55",
  metal: "#10242a",
  metalLight: "#31535d",
  inactive: "#20383e",
} as const;

export const LAW_HEART_SPECTRA: readonly LawHeartSpectrum[] = [
  {
    threshold: 0,
    name: "Dormant Seed",
    core: "#16343a",
    surface: "#0a2228",
    surfaceBright: "#27525a",
    limb: "#31545b",
    corona: ["#142d33", "#1d4047"],
    shard: "#5c777c",
  },
  {
    threshold: 1,
    name: "Awakening Star",
    core: "#d9ffff",
    surface: "#34cbd1",
    surfaceBright: "#8cffff",
    limb: "#27a9b0",
    corona: ["#42e6e9", "#168d9a"],
    shard: "#b9ffff",
  },
  {
    threshold: 3,
    name: "Proven Law-Star",
    core: "#f1ffff",
    surface: "#62aaff",
    surfaceBright: "#a9ddff",
    limb: "#3c78d0",
    corona: ["#5cdfff", "#477fff"],
    shard: "#d8f2ff",
  },
  {
    threshold: 6,
    name: "Resonant Star",
    core: "#fff2ff",
    surface: "#a15be2",
    surfaceBright: "#e2a6ff",
    limb: "#6634aa",
    corona: ["#bd6cff", "#4269ee", "#62d9ff"],
    shard: "#f2d8ff",
  },
  {
    threshold: 12,
    name: "Axiomatic Star",
    core: "#fffef0",
    surface: "#f2b84f",
    surfaceBright: "#ffe59a",
    limb: "#b86b25",
    corona: ["#ffd76b", "#ff9a3d", "#fff3bb"],
    shard: "#fff0a8",
  },
  {
    threshold: 24,
    name: "Convergent Star",
    core: "#fff1df",
    surface: "#e84538",
    surfaceBright: "#ff8a52",
    limb: "#8e1320",
    corona: ["#ff6048", "#e12335", "#ffad58", "#7d0d1a"],
    shard: "#ffc09b",
  },
  {
    threshold: 72,
    name: "Transcendent Star",
    core: "#ffffff",
    surface: "#edfaff",
    surfaceBright: "#ffffff",
    limb: "#8adbe2",
    corona: ["#73f5ee", "#a77cff", "#ffd65e", "#ff7c78"],
    shard: "#ffffff",
  },
] as const;

export function getLawHeartSpectrum(lifetimeAxioms: number): LawHeartSpectrum {
  const axioms = Math.floor(safe(lifetimeAxioms));
  for (let index = LAW_HEART_SPECTRA.length - 1; index >= 0; index -= 1) {
    if (axioms >= LAW_HEART_SPECTRA[index].threshold) return LAW_HEART_SPECTRA[index];
  }
  return LAW_HEART_SPECTRA[0];
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

function safe(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function hash(value: number) {
  const result = Math.sin(value * 91.3458 + 17.173) * 47453.5453;
  return result - Math.floor(result);
}

function rect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

function pixelLine(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  color: string,
  pixelSize = 2,
) {
  let x0 = Math.round(start[0] / pixelSize);
  let y0 = Math.round(start[1] / pixelSize);
  const x1 = Math.round(end[0] / pixelSize);
  const y1 = Math.round(end[1] / pixelSize);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    rect(context, x0 * pixelSize, y0 * pixelSize, pixelSize, pixelSize, color);
    if (x0 === x1 && y0 === y1) break;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x0 += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function progressionAngularSpeed(perSecond: number, machineCount: number) {
  const productionOrder = Math.log10(safe(perSecond) + 1);
  const machineDensity = Math.log2(safe(machineCount) + 1);
  const progression = productionOrder + machineDensity * 0.34;
  const turnsPerSecond = clamp(0.012 + Math.pow(progression, 1.24) * 0.0075, 0.012, 0.68);
  return turnsPerSecond * TWO_PI / 1000;
}

function getParticleDemand(props: LawPressCanvasProps) {
  const fluxOrder = Math.log10(safe(props.flux) + 1);
  const storedFluxDemand = Math.pow(fluxOrder, 0.86) * 10;
  const machineDemand = props.tiers.reduce((total, tier, tierIndex) => {
    const count = safe(tier.count);
    const outputOrder = Math.log10(safe(tier.output) + 1);
    const countWeight = tierIndex === 0 ? 11 : Math.max(5.5, 8 - tierIndex * 0.45);
    return total + Math.sqrt(count) * countWeight + outputOrder * (tierIndex === 0 ? 2.2 : 1.25);
  }, 0);
  const manualDemand = Math.min(32, safe(props.manualPulses) * 2);
  return Math.max(manualDemand, Math.round(storedFluxDemand + machineDemand));
}

function getTierWeights(tiers: readonly LawHeartTier[]) {
  return tiers.slice(0, TIER_COLORS.length).map((tier, tierIndex) => {
    const count = safe(tier.count);
    if (count <= 0) return 0;
    const outputOrder = Math.log10(safe(tier.output) + 1);
    const tapBias = tierIndex === 0 ? 1.65 : 1;
    return (Math.sqrt(count) * 2.4 + outputOrder * 0.7 + 1) * tapBias;
  });
}

function chooseTier(index: number, weights: readonly number[]) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return 0;
  let target = hash(index * 7.171 + 4.13) * total;
  for (let tierIndex = 0; tierIndex < weights.length; tierIndex += 1) {
    target -= weights[tierIndex];
    if (target <= 0) return tierIndex;
  }
  return 0;
}

function particlePosition(
  index: number,
  tierIndex: number,
  now: number,
  speed: number,
  impulse: number,
): Point {
  const seedA = hash(index * 4.37 + tierIndex * 71.1);
  const seedB = hash(index * 9.91 + tierIndex * 17.7);
  const seedC = hash(index * 15.13 + tierIndex * 41.3);
  const time = now * speed;
  const direction = (index + tierIndex) % 2 === 0 ? 1 : -1;
  const outerReach = tierIndex === 0
    ? (seedC < 0.74 ? 190 : 234)
    : Math.min(238, 208 + tierIndex * 6);
  const baseRadius = 18 + Math.pow(seedA, 0.68) * (outerReach - 18);
  const radialWave = Math.sin(time * (0.42 + seedB * 0.72) + seedC * 19) * (7 + seedC * 24);
  const breathing = Math.cos(time * (0.19 + seedA * 0.33) + seedB * 31) * (3 + seedA * 11);
  const radius = clamp(baseRadius + radialWave + breathing + impulse * (10 + seedB * 34), 13, 242);
  const angle = seedB * TWO_PI
    + time * direction * (0.58 + seedA * 1.08)
    + Math.sin(time * (0.23 + seedC * 0.28) + seedA * 25) * 0.48;
  const centerDriftX = Math.sin(time * 0.21 + seedC * 13) * (4 + seedB * 17);
  const centerDriftY = Math.cos(time * 0.16 + seedA * 15) * (4 + seedC * 14);
  const flattening = 0.78 + seedA * 0.17;
  return [
    CENTER + Math.cos(angle) * radius + centerDriftX,
    CENTER + Math.sin(angle) * radius * flattening + centerDriftY,
  ];
}

function drawVoid(context: CanvasRenderingContext2D) {
  rect(context, 0, 0, SIZE, SIZE, COLORS.black);
  rect(context, 4, 4, SIZE - 8, 2, "#081014");
  rect(context, 4, SIZE - 6, SIZE - 8, 2, "#081014");
  rect(context, 4, 4, 2, SIZE - 8, "#081014");
  rect(context, SIZE - 6, 4, 2, SIZE - 8, "#081014");
}

function drawDensityField(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  demand: number,
  speed: number,
  weights: readonly number[],
) {
  const overload = Math.max(0, demand - MAX_FIELD_PARTICLES);
  const saturation = Math.log2(1 + overload / MAX_FIELD_PARTICLES);
  const densityCount = Math.min(MAX_DENSITY_PARTICLES, Math.round(saturation * 58));
  for (let index = 0; index < densityCount; index += 1) {
    const tierIndex = chooseTier(index + 2000, weights);
    const seed = hash(index * 33.73 + tierIndex);
    const drift = now * speed * (0.18 + hash(index * 2.4) * 0.26);
    const x = (hash(index * 11.3) * SIZE + Math.sin(drift + seed * 18) * 28 + SIZE) % SIZE;
    const y = (hash(index * 17.9) * SIZE + Math.cos(drift * 0.7 + seed * 23) * 22 + SIZE) % SIZE;
    const color = TIER_COLORS[tierIndex] ?? COLORS.cyan;
    context.save();
    context.globalAlpha = 0.18 + seed * 0.28;
    rect(context, x, y, seed > 0.84 ? 2 : 1, seed > 0.84 ? 2 : 1, color);
    context.restore();
  }

  if (saturation > 0.18) {
    const currentCount = Math.min(18, 4 + Math.floor(saturation * 5));
    for (let index = 0; index < currentCount; index += 1) {
      const tierIndex = chooseTier(index + 4000, weights);
      const seed = hash(index * 19.7);
      const angle = seed * TWO_PI + now * speed * (index % 2 === 0 ? 0.45 : -0.38);
      const distance = 55 + hash(index * 8.1) * 166;
      const length = 8 + Math.min(22, saturation * 7) + hash(index) * 12;
      const start: Point = [
        CENTER + Math.cos(angle) * distance,
        CENTER + Math.sin(angle) * distance * 0.86,
      ];
      const finish: Point = [
        start[0] - Math.sin(angle) * length,
        start[1] + Math.cos(angle) * length * 0.62,
      ];
      context.save();
      context.globalAlpha = Math.min(0.5, 0.16 + saturation * 0.08);
      pixelLine(context, start, finish, TIER_COLORS[tierIndex] ?? COLORS.cyan, 2);
      context.restore();
    }
  }

  if (props.manualPulses <= 0 && props.tiers.every((tier) => safe(tier.count) <= 0)) {
    rect(context, CENTER - 1, CENTER - 1, 2, 2, COLORS.inactive);
  }
}

function drawParticleSoup(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  impulse: number,
  reducedMotion: boolean,
) {
  const demand = getParticleDemand(props);
  if (demand <= 0) return;
  const visibleCount = Math.min(MAX_FIELD_PARTICLES, demand);
  const totalMachineCount = props.tiers.reduce((total, tier) => total + safe(tier.count), 0);
  const speed = reducedMotion ? 0 : progressionAngularSpeed(props.fluxPerSecond, totalMachineCount);
  const weights = getTierWeights(props.tiers);
  const overload = Math.max(0, demand - MAX_FIELD_PARTICLES);
  const saturation = Math.log2(1 + overload / MAX_FIELD_PARTICLES);
  const trailSteps = Math.min(3, Math.floor(saturation * 1.5));

  drawDensityField(context, props, now, demand, speed, weights);

  for (let index = 0; index < visibleCount; index += 1) {
    const tierIndex = chooseTier(index, weights);
    const color = TIER_COLORS[tierIndex] ?? COLORS.cyan;
    const point = particlePosition(index, tierIndex, now, speed, impulse);
    const seed = hash(index * 22.51 + tierIndex * 3.8);
    const baseSize = seed > 0.93 ? 5 : seed > 0.72 ? 3 : 2;
    const size = Math.min(6, baseSize + (saturation > 1.7 && index % 17 === 0 ? 1 : 0));

    context.save();
    context.globalAlpha = 0.34 + seed * 0.64;
    for (let trail = trailSteps; trail > 0; trail -= 1) {
      if ((index + trail) % 3 !== 0) continue;
      const previous = particlePosition(index, tierIndex, now - trail * 22, speed, impulse * 0.6);
      context.globalAlpha *= 0.62;
      rect(context, previous[0], previous[1], Math.max(1, size - trail), Math.max(1, size - trail), color);
    }
    context.globalAlpha = 0.34 + seed * 0.64;
    rect(context, point[0], point[1], size, size, index % 29 === 0 ? COLORS.white : color);
    context.restore();
  }
}

function drawPixelDisk(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  pixelSize = 2,
) {
  const snappedRadius = Math.max(pixelSize, Math.round(radius / pixelSize) * pixelSize);
  for (let y = -snappedRadius; y <= snappedRadius; y += pixelSize) {
    const halfWidth = Math.floor(
      Math.sqrt(Math.max(0, snappedRadius * snappedRadius - y * y)) / pixelSize,
    ) * pixelSize;
    rect(context, CENTER - halfWidth, CENTER + y, halfWidth * 2 + pixelSize, pixelSize, color);
  }
}

function getVisibleAxiomShardCount(lifetimeAxioms: number) {
  const axioms = Math.floor(safe(lifetimeAxioms));
  if (axioms <= 12) return axioms;
  return Math.min(20, 12 + Math.floor(Math.log2(axioms / 12 + 1) * 2.4));
}

function drawAxiomShards(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  spectrum: LawHeartSpectrum,
  starRadius: number,
  reducedMotion: boolean,
) {
  const visibleCount = getVisibleAxiomShardCount(props.lifetimeAxioms);
  if (visibleCount <= 0) return;

  const axiomOrder = Math.log2(safe(props.lifetimeAxioms) + 1);
  const productionOrder = Math.log10(safe(props.fluxPerSecond) + 1);
  const orbitSpeed = reducedMotion ? 0 : 0.00014 + Math.min(0.00072, productionOrder * 0.000055);
  const consolidated = safe(props.lifetimeAxioms) > visibleCount;

  for (let index = 0; index < visibleCount; index += 1) {
    const seedA = hash(index * 17.31 + 4.7);
    const seedB = hash(index * 29.77 + 9.1);
    const track = index % 3;
    const direction = index % 5 === 0 ? -1 : 1;
    const radius = starRadius + 24 + track * 13 + seedA * (10 + axiomOrder * 1.4);
    const angle = seedB * TWO_PI + now * orbitSpeed * direction * (0.72 + seedA * 0.7);
    const flattening = 0.52 + seedB * 0.3;
    const drift = Math.sin(now * orbitSpeed * 0.37 + seedA * 22) * (2 + seedB * 4);
    const x = CENTER + Math.cos(angle) * radius;
    const y = CENTER + Math.sin(angle) * radius * flattening + drift;
    const size = consolidated && index < Math.min(6, Math.floor(axiomOrder)) ? 6 : index % 4 === 0 ? 5 : 3;
    const color = index % 7 === 0
      ? spectrum.core
      : spectrum.corona[index % spectrum.corona.length] ?? spectrum.shard;

    context.save();
    context.globalAlpha = 0.46;
    if (!reducedMotion && productionOrder > 1.5 && (index + track) % 2 === 0) {
      const trailAngle = angle - direction * (0.04 + Math.min(0.12, productionOrder * 0.012));
      const trailX = CENTER + Math.cos(trailAngle) * radius;
      const trailY = CENTER + Math.sin(trailAngle) * radius * flattening + drift;
      pixelLine(context, [trailX, trailY], [x, y], color, 2);
    }
    context.globalAlpha = 0.95;
    rect(context, x - 1, y - size, 2, size * 2 + 1, color);
    rect(context, x - size, y - 1, size * 2 + 1, 2, color);
    rect(context, x - 1, y - 1, 3, 3, spectrum.core);
    context.restore();
  }
}

function drawSolarCorona(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  spectrum: LawHeartSpectrum,
  radius: number,
  intensity: number,
  reducedMotion: boolean,
) {
  const productionOrder = Math.log10(safe(props.fluxPerSecond) + 1);
  const axiomOrder = Math.log2(safe(props.lifetimeAxioms) + 1);
  const rayCount = 16 + Math.min(20, Math.floor(productionOrder * 2 + axiomOrder));
  const time = reducedMotion ? 0 : now;

  context.save();
  context.globalAlpha = 0.08 + intensity * 0.08;
  drawPixelDisk(context, radius + 15 + axiomOrder * 0.7, spectrum.corona[0] ?? spectrum.limb, 3);
  context.globalAlpha = 0.14 + intensity * 0.1;
  drawPixelDisk(context, radius + 8, spectrum.corona[1] ?? spectrum.corona[0] ?? spectrum.limb, 2);
  context.restore();

  for (let index = 0; index < rayCount; index += 1) {
    const seed = hash(index * 18.47 + 2.1);
    const angle = index / rayCount * TWO_PI
      + Math.sin(time * (0.00036 + seed * 0.00018) + seed * 17) * 0.08;
    const flicker = 0.45 + 0.55 * Math.sin(time * (0.002 + seed * 0.0022) + seed * 31);
    const length = 5 + seed * 9 + intensity * (4 + seed * 8) + Math.max(0, flicker) * 5;
    const innerRadius = radius - 1;
    const outerRadius = radius + length;
    const start: Point = [
      CENTER + Math.cos(angle) * innerRadius,
      CENTER + Math.sin(angle) * innerRadius,
    ];
    const finish: Point = [
      CENTER + Math.cos(angle) * outerRadius,
      CENTER + Math.sin(angle) * outerRadius,
    ];
    context.save();
    context.globalAlpha = 0.34 + Math.max(0, flicker) * 0.5;
    pixelLine(
      context,
      start,
      finish,
      spectrum.corona[index % spectrum.corona.length] ?? spectrum.limb,
      index % 5 === 0 ? 3 : 2,
    );
    context.restore();
  }
}

function drawSolarSurface(
  context: CanvasRenderingContext2D,
  now: number,
  spectrum: LawHeartSpectrum,
  radius: number,
  intensity: number,
  reducedMotion: boolean,
) {
  drawPixelDisk(context, radius + 3, spectrum.limb, 2);
  drawPixelDisk(context, radius, spectrum.surface, 2);
  drawPixelDisk(context, Math.max(5, radius * 0.58), spectrum.core, 2);

  const time = reducedMotion ? 0 : now;
  const granuleCount = 24 + Math.floor(intensity * 18);
  for (let index = 0; index < granuleCount; index += 1) {
    const seedA = hash(index * 13.7 + 5.1);
    const seedB = hash(index * 7.9 + 21.3);
    const seedC = hash(index * 31.1 + 2.7);
    const angle = seedA * TWO_PI + time * (seedC > 0.48 ? 0.00012 : -0.0001);
    const radialLimit = Math.max(4, radius - 5);
    const radialWave = Math.sin(time * (0.0007 + seedC * 0.0011) + seedA * 19) * 3;
    const distance = Math.sqrt(seedB) * radialLimit + radialWave;
    const x = CENTER + Math.cos(angle) * distance;
    const y = CENTER + Math.sin(angle) * distance;
    if (Math.hypot(x - CENTER, y - CENTER) > radius - 3) continue;
    const size = seedC > 0.86 ? 4 : 2;
    const color = seedC > 0.74
      ? spectrum.surfaceBright
      : seedC < 0.22
        ? spectrum.limb
        : spectrum.surface;
    context.save();
    context.globalAlpha = 0.46 + seedA * 0.44;
    rect(context, x, y, size, size, color);
    context.restore();
  }

  const bandOffset = Math.sin(time * 0.0008) * radius * 0.3;
  context.save();
  context.globalAlpha = 0.28 + intensity * 0.12;
  const bandHalfWidth = Math.sqrt(Math.max(0, radius * radius - bandOffset * bandOffset)) * 0.72;
  pixelLine(
    context,
    [CENTER - bandHalfWidth, CENTER + bandOffset],
    [CENTER + bandHalfWidth, CENTER + bandOffset],
    spectrum.surfaceBright,
    2,
  );
  context.restore();
}

function drawCore(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  clickIntensity: number,
  recalibrationEvent: RecalibrationEvent | null,
  reducedMotion: boolean,
) {
  const productionOrder = Math.log10(safe(props.fluxPerSecond) + 1);
  const machineCount = props.tiers.reduce((total, tier) => total + safe(tier.count), 0);
  const machineOrder = Math.log2(machineCount + 1);
  const active = props.manualPulses > 0 || machineCount > 0;
  const basePulseSpeed = 0.00125 + Math.min(0.0011, productionOrder * 0.00008);
  const pulse = reducedMotion ? 0 : Math.sin(now * basePulseSpeed);
  const clickFlare = clickIntensity;
  const recalibrationPhase = recalibrationEvent ? clamp((now - recalibrationEvent.startedAt) / 1350) : 0;
  const spectrumAxioms = recalibrationEvent && recalibrationPhase < 0.55
    ? recalibrationEvent.fromAxioms
    : props.lifetimeAxioms;
  const spectrum = getLawHeartSpectrum(spectrumAxioms);

  let transitionScale = 1;
  if (recalibrationEvent && recalibrationPhase < 1) {
    transitionScale = recalibrationPhase < 0.46
      ? 1 - recalibrationPhase / 0.46 * 0.88
      : 0.12 + Math.pow((recalibrationPhase - 0.46) / 0.54, 0.42) * 0.88;
  }
  const idleBreath = active ? pulse * 2.1 : pulse * 1.15;
  const radius = clamp((31 + idleBreath + clickFlare * 4.5) * transitionScale, 4, 38);
  const intensity = clamp(
    0.16 + productionOrder * 0.08 + machineOrder * 0.025 + clickFlare * 0.65,
    0.12,
    1.4,
  );

  drawAxiomShards(context, props, now, spectrum, Math.max(31, radius), reducedMotion);
  drawSolarCorona(context, props, now, spectrum, radius, intensity, reducedMotion);
  drawSolarSurface(context, now, spectrum, radius, intensity, reducedMotion);

  if (recalibrationEvent && recalibrationPhase >= 0.43 && recalibrationPhase <= 0.7) {
    const novaPhase = 1 - Math.abs((recalibrationPhase - 0.565) / 0.135);
    const novaReach = 14 + novaPhase * 106;
    const newSpectrum = getLawHeartSpectrum(recalibrationEvent.toAxioms);
    context.save();
    context.globalAlpha = clamp(novaPhase) * 0.95;
    pixelLine(context, [CENTER - novaReach, CENTER], [CENTER + novaReach, CENTER], newSpectrum.core, 3);
    pixelLine(context, [CENTER, CENTER - novaReach], [CENTER, CENTER + novaReach], newSpectrum.core, 3);
    drawPixelDisk(context, 5 + novaPhase * 11, newSpectrum.core, 2);
    context.restore();
  }
}

function drawClickImpact(
  context: CanvasRenderingContext2D,
  phase: number,
  manualGain: number,
  eventSeed: number,
) {
  if (phase >= 1) return;
  const opacity = 1 - phase;
  const sparkCount = Math.min(34, 12 + Math.floor(Math.log10(safe(manualGain) + 1) * 3));
  for (let index = 0; index < sparkCount; index += 1) {
    const angle =
      index / sparkCount * TWO_PI +
      hash(index * 13.1 + eventSeed * 17.7) * 0.42 +
      hash(eventSeed * 3.9) * 0.5;
    const distance = 22 + phase * (70 + hash(index + eventSeed * 2.1) * 132);
    const length = 4 + phase * (8 + hash(index * 3.2 + eventSeed) * 18);
    const start: Point = [
      CENTER + Math.cos(angle) * distance,
      CENTER + Math.sin(angle) * distance * 0.9,
    ];
    const finish: Point = [
      start[0] + Math.cos(angle) * length,
      start[1] + Math.sin(angle) * length * 0.9,
    ];
    context.save();
    context.globalAlpha = opacity;
    pixelLine(context, start, finish, index % 6 === 0 ? COLORS.amber : COLORS.cyan, index % 5 === 0 ? 3 : 2);
    context.restore();
  }
}

function drawPurchaseBloom(
  context: CanvasRenderingContext2D,
  event: PurchaseEvent | null,
  now: number,
) {
  if (!event) return;
  const phase = clamp((now - event.startedAt) / 920);
  if (phase >= 1) return;
  const color = TIER_COLORS[event.tierIndex] ?? COLORS.cyan;
  const count = Math.min(36, 12 + Math.ceil(Math.sqrt(event.quantity) * 4));
  for (let index = 0; index < count; index += 1) {
    const seed = hash(index * 12.3 + event.tierIndex * 8.8);
    const angle = seed * TWO_PI + phase * (index % 2 === 0 ? 1.2 : -0.9);
    const targetRadius = 38 + hash(index * 4.1) * 180;
    const radius = 246 - (246 - targetRadius) * Math.sin(phase * Math.PI * 0.5);
    const x = CENTER + Math.cos(angle) * radius;
    const y = CENTER + Math.sin(angle) * radius * (0.8 + seed * 0.14);
    context.save();
    context.globalAlpha = 1 - phase * 0.45;
    rect(context, x, y, index % 5 === 0 ? 5 : 3, index % 5 === 0 ? 5 : 3, index % 7 === 0 ? COLORS.white : color);
    context.restore();
  }
}

function drawExpenditure(
  context: CanvasRenderingContext2D,
  event: ExpenditureEvent | null,
  now: number,
) {
  if (!event) return;
  const phase = clamp((now - event.startedAt) / 820);
  if (phase >= 1) return;
  const count = Math.round(8 + event.strength * 20);
  for (let index = 0; index < count; index += 1) {
    const angle = hash(index * 10.7) * TWO_PI;
    const startRadius = 34 + hash(index * 4.9) * 145;
    const radius = startRadius + phase * (70 + hash(index) * 90);
    const x = CENTER + Math.cos(angle) * radius;
    const y = CENTER + Math.sin(angle) * radius * 0.86;
    context.save();
    context.globalAlpha = 1 - phase;
    rect(context, x, y, index % 4 === 0 ? 4 : 2, index % 4 === 0 ? 4 : 2, index % 5 === 0 ? COLORS.amber : COLORS.cyan);
    context.restore();
  }
}

function drawRecalibrationCollapse(
  context: CanvasRenderingContext2D,
  event: RecalibrationEvent | null,
  now: number,
) {
  if (!event) return;
  const phase = clamp((now - event.startedAt) / 1350);
  if (phase >= 1) return;
  const count = 42;
  for (let index = 0; index < count; index += 1) {
    const angle = hash(index * 5.3) * TWO_PI + phase * (index % 2 === 0 ? 0.7 : -0.5);
    const originalRadius = 52 + hash(index * 12.1) * 188;
    const collapse = phase < 0.58
      ? 1 - phase / 0.58
      : (phase - 0.58) / 0.42 * 1.22;
    const radius = 18 + originalRadius * collapse;
    const x = CENTER + Math.cos(angle) * radius;
    const y = CENTER + Math.sin(angle) * radius * 0.86;
    context.save();
    context.globalAlpha = 1 - phase * 0.5;
    rect(context, x, y, index % 4 === 0 ? 5 : 3, index % 4 === 0 ? 5 : 3, index % 3 === 0 ? COLORS.white : COLORS.amber);
    context.restore();
  }
}

function drawUtilityDroneFrames(
  context: CanvasRenderingContext2D,
  frames: readonly LawHeartDroneFrame[],
  now: number,
  reducedMotion: boolean,
) {
  if (frames.length <= 0) return;
  const time = reducedMotion ? 0 : now;
  frames.slice(0, 8).forEach((frame, index) => {
    const seed = hash(index * 29.7 + 4.2);
    const direction = index % 2 === 0 ? 1 : -1;
    const angle = seed * TWO_PI + time * (0.000035 + index * 0.000003) * direction;
    const radius = 166 + (index % 4) * 18 + seed * 8;
    const flattening = 0.76 + (index % 3) * 0.045;
    const x = CENTER + Math.cos(angle) * radius;
    const y = CENTER + Math.sin(angle) * radius * flattening;
    const tangentX = -Math.sin(angle) * direction;
    const tangentY = Math.cos(angle) * direction * flattening;
    const color = frame.compromised ? "#ff695c" : frame.color;
    const trailLength = 8 + (index % 3) * 3;

    context.save();
    context.globalAlpha = frame.compromised ? 0.42 : 0.72;
    pixelLine(
      context,
      [x - tangentX * trailLength, y - tangentY * trailLength],
      [x - tangentX * 3, y - tangentY * 3],
      color,
      2,
    );
    context.globalAlpha = frame.compromised ? 0.58 : 0.96;
    rect(context, x - 4, y - 4, 9, 9, COLORS.void);
    rect(context, x - 3, y - 3, 7, 7, color);
    rect(context, x - 1, y - 1, 3, 3, COLORS.white);
    rect(context, x - 8, y - 2, 4, 4, color);
    rect(context, x + 5, y - 2, 4, 4, color);
    context.restore();
  });
}

function renderLawHeart(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  pulseEvents: readonly ManualPulseEvent[],
  purchaseEvent: PurchaseEvent | null,
  expenditureEvent: ExpenditureEvent | null,
  recalibrationEvent: RecalibrationEvent | null,
  reducedMotion: boolean,
) {
  const activePulses = pulseEvents
    .map((event) => ({
      ...event,
      phase: clamp((now - event.startedAt) / 720),
    }))
    .filter((event) => event.phase < 1);
  const impulse = clamp(
    activePulses.reduce(
      (total, event) => total + Math.sin(event.phase * Math.PI) * 0.72,
      0,
    ),
    0,
    2.2,
  );

  context.clearRect(0, 0, SIZE, SIZE);
  context.imageSmoothingEnabled = false;
  drawVoid(context);
  drawParticleSoup(context, props, now, impulse, reducedMotion);
  drawUtilityDroneFrames(context, props.droneFrames ?? [], now, reducedMotion);
  drawPurchaseBloom(context, purchaseEvent, now);
  drawExpenditure(context, expenditureEvent, now);
  drawRecalibrationCollapse(context, recalibrationEvent, now);
  drawCore(context, props, now, impulse, recalibrationEvent, reducedMotion);
  activePulses.forEach((event) =>
    drawClickImpact(context, event.phase, safe(props.manualGain), event.serial),
  );
}

export function LawPressCanvas(props: LawPressCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const pulseEvents = useRef<ManualPulseEvent[]>([]);
  const purchaseEvent = useRef<PurchaseEvent | null>(null);
  const expenditureEvent = useRef<ExpenditureEvent | null>(null);
  const recalibrationEvent = useRef<RecalibrationEvent | null>(null);
  const redraw = useRef<() => void>(() => undefined);
  const previousEconomy = useRef({
    flux: safe(props.flux),
    axioms: safe(props.lifetimeAxioms),
    counts: props.tiers.map((tier) => safe(tier.count)),
  });

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useEffect(() => {
    if (props.pulseSerial <= 0) return;
    const now = performance.now();
    pulseEvents.current = [
      ...pulseEvents.current.filter((event) => now - event.startedAt < 720),
      { serial: props.pulseSerial, startedAt: now },
    ].slice(-12);
  }, [props.pulseSerial]);

  useEffect(() => {
    const now = performance.now();
    const previous = previousEconomy.current;
    const counts = props.tiers.map((tier) => safe(tier.count));
    const purchasedTier = counts.findIndex((count, index) => count > (previous.counts[index] ?? 0));
    if (purchasedTier >= 0) {
      purchaseEvent.current = {
        tierIndex: purchasedTier,
        quantity: counts[purchasedTier] - (previous.counts[purchasedTier] ?? 0),
        startedAt: now,
      };
    }
    if (safe(props.lifetimeAxioms) > previous.axioms) {
      recalibrationEvent.current = {
        startedAt: now,
        fromAxioms: previous.axioms,
        toAxioms: safe(props.lifetimeAxioms),
      };
    } else if (safe(props.flux) < previous.flux * 0.94 && purchasedTier < 0) {
      expenditureEvent.current = {
        strength: clamp(1 - safe(props.flux) / Math.max(1, previous.flux)),
        startedAt: now,
      };
    }
    previousEconomy.current = {
      flux: safe(props.flux),
      axioms: safe(props.lifetimeAxioms),
      counts,
    };
  }, [props.flux, props.lifetimeAxioms, props.tiers]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) redraw.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame: number | null = null;
    let disposed = false;
    let lastDraw = Number.NEGATIVE_INFINITY;

    const draw = (now: number) => {
      if (disposed) return;
      if (now - lastDraw >= 32 || motionPreference.matches) {
        renderLawHeart(
          context,
          propsRef.current,
          now,
          pulseEvents.current,
          purchaseEvent.current,
          expenditureEvent.current,
          recalibrationEvent.current,
          motionPreference.matches,
        );
        lastDraw = now;
      }
      if (!motionPreference.matches && document.visibilityState === "visible") {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        animationFrame = null;
      }
    };

    const restart = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastDraw = Number.NEGATIVE_INFINITY;
      draw(performance.now());
    };
    redraw.current = restart;

    const handleVisibility = () => restart();
    const handleMotionPreference = () => restart();
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);
    restart();

    return () => {
      disposed = true;
      redraw.current = () => undefined;
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="law-press-canvas pixelated"
      width={SIZE}
      height={SIZE}
      aria-hidden="true"
    />
  );
}
