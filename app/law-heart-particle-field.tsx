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
};

type Point = readonly [number, number];

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

function crystalHalfWidth(radius: number, yOffset: number) {
  const normalized = Math.abs(yOffset) / Math.max(1, radius);
  return Math.max(2, radius * 0.74 * (1 - Math.pow(normalized, 1.22)));
}

function drawCrystal(
  context: CanvasRenderingContext2D,
  radius: number,
  fill: string,
  edge: string,
  step = 2,
) {
  for (let y = -radius; y <= radius; y += step) {
    const halfWidth = crystalHalfWidth(radius, y);
    rect(context, CENTER - halfWidth, CENTER + y, halfWidth * 2, step, fill);
    rect(context, CENTER - halfWidth, CENTER + y, step, step, edge);
    rect(context, CENTER + halfWidth - step, CENTER + y, step, step, edge);
  }
}

function drawCore(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  clickPhase: number,
  recalibrationEvent: RecalibrationEvent | null,
) {
  const axiomDensity = Math.log2(safe(props.lifetimeAxioms) + 1);
  const compression = clickPhase < 0.24
    ? -6 * Math.sin(clickPhase / 0.24 * Math.PI)
    : clickPhase < 1
      ? 2 * Math.sin((clickPhase - 0.24) / 0.76 * Math.PI)
      : 0;
  const recalibrationPhase = recalibrationEvent ? clamp((now - recalibrationEvent.startedAt) / 1350) : 0;
  const recalibrationCompression = recalibrationEvent ? -7 * Math.sin(recalibrationPhase * Math.PI) : 0;
  const radius = clamp(36 - Math.min(14, axiomDensity * 1.75) + compression + recalibrationCompression, 18, 38);
  const lawReady = props.state === "law-ready" || props.preparingRecalibration;
  const active = props.manualPulses > 0 || props.tiers.some((tier) => safe(tier.count) > 0);
  const edge = lawReady ? COLORS.amber : active ? COLORS.cyan : COLORS.inactive;
  const shell = lawReady ? "#513c18" : active ? "#0c3b43" : "#101d21";
  const inner = lawReady ? "#8c6727" : active ? "#15535b" : "#17292e";

  context.save();
  context.globalAlpha = active ? 0.16 : 0.08;
  drawCrystal(context, radius + 13, edge, edge, 3);
  context.globalAlpha = 1;
  drawCrystal(context, radius + 7, COLORS.black, edge, 2);
  drawCrystal(context, radius + 2, shell, edge, 2);
  drawCrystal(context, Math.max(10, radius - 7), inner, lawReady ? "#ffe5a3" : COLORS.metalLight, 2);
  context.restore();

  const facetColor = lawReady ? "#ffe5a3" : active ? "#7deff1" : COLORS.inactive;
  pixelLine(
    context,
    [CENTER, CENTER - radius + 4],
    [CENTER - radius * 0.42, CENTER],
    facetColor,
    2,
  );
  pixelLine(
    context,
    [CENTER - radius * 0.42, CENTER],
    [CENTER, CENTER + radius - 4],
    COLORS.cyanDark,
    2,
  );
  pixelLine(
    context,
    [CENTER, CENTER - radius + 4],
    [CENTER + radius * 0.42, CENTER],
    COLORS.metalLight,
    2,
  );
  pixelLine(
    context,
    [CENTER + radius * 0.42, CENTER],
    [CENTER, CENTER + radius - 4],
    facetColor,
    2,
  );

  const seamCount = Math.min(7, Math.max(props.provenLaws, Math.floor(axiomDensity)));
  for (let index = 0; index < seamCount; index += 1) {
    const offset = (index - (seamCount - 1) / 2) * 5;
    const width = Math.max(5, crystalHalfWidth(Math.max(10, radius - 8), offset) * 0.72);
    rect(
      context,
      CENTER - width,
      CENTER + offset,
      width * 2,
      index % 2 === 0 ? 2 : 1,
      index < props.provenLaws ? COLORS.amber : "#b38842",
    );
  }

  if (active) {
    const pulse = 0.52 + Math.sin(now * 0.004 + axiomDensity) * 0.18;
    context.save();
    context.globalAlpha = pulse;
    rect(context, CENTER - 2, CENTER - radius - 8, 4, 5, edge);
    rect(context, CENTER - 2, CENTER + radius + 3, 4, 5, edge);
    context.restore();
  }
}

function drawClickImpact(
  context: CanvasRenderingContext2D,
  phase: number,
  manualGain: number,
) {
  if (phase >= 1) return;
  const opacity = 1 - phase;
  const sparkCount = Math.min(34, 12 + Math.floor(Math.log10(safe(manualGain) + 1) * 3));
  for (let index = 0; index < sparkCount; index += 1) {
    const angle = index / sparkCount * TWO_PI + hash(index * 13.1) * 0.42;
    const distance = 22 + phase * (70 + hash(index) * 132);
    const length = 4 + phase * (8 + hash(index * 3.2) * 18);
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

function renderLawHeart(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  pulseStartedAt: number,
  purchaseEvent: PurchaseEvent | null,
  expenditureEvent: ExpenditureEvent | null,
  recalibrationEvent: RecalibrationEvent | null,
  reducedMotion: boolean,
) {
  const clickAge = now - pulseStartedAt;
  const clickPhase = Number.isFinite(clickAge) && clickAge >= 0 ? clamp(clickAge / 720) : 1;
  const impulse = clickPhase < 1 ? Math.sin(clickPhase * Math.PI) : 0;

  context.clearRect(0, 0, SIZE, SIZE);
  context.imageSmoothingEnabled = false;
  drawVoid(context);
  drawParticleSoup(context, props, now, impulse, reducedMotion);
  drawPurchaseBloom(context, purchaseEvent, now);
  drawExpenditure(context, expenditureEvent, now);
  drawRecalibrationCollapse(context, recalibrationEvent, now);
  drawCore(context, props, now, clickPhase, recalibrationEvent);
  drawClickImpact(context, clickPhase, safe(props.manualGain));
}

export function LawPressCanvas(props: LawPressCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const pulseStartedAt = useRef(Number.NEGATIVE_INFINITY);
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
    if (props.pulseSerial > 0) pulseStartedAt.current = performance.now();
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
      recalibrationEvent.current = { startedAt: now };
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
          pulseStartedAt.current,
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
