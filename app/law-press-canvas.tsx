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

const SIZE = 512;
const CENTER = SIZE / 2;
const TWO_PI = Math.PI * 2;
const TIER_COLORS = [
  "#55e6e8", // Vacuum Tap
  "#559dff", // Phase Coil
  "#b87cff", // Harmonic Loom
  "#f2bc55", // Orbit Array
  "#fff0b5", // Axiom Engine
  "#ff695c", // Horizon Forge
] as const;
const COLORS = {
  black: "#010405",
  void: "#02080a",
  grid: "#07161b",
  gridBright: "#0c242b",
  deepMetal: "#0a171c",
  metal: "#183039",
  metalLight: "#365d68",
  inactive: "#244048",
  cyanDark: "#17606a",
  cyan: TIER_COLORS[0],
  white: "#e5ffff",
  amber: "#e8b75d",
  red: "#a94d4b",
  green: "#66d39a",
} as const;

type Point = readonly [number, number];

const LAW_GLYPHS: readonly (readonly Point[])[] = [
  [[-18, -18], [18, -18], [18, 18], [-18, 18], [-18, -18]],
  [[0, -23], [23, 0], [0, 23], [-23, 0], [0, -23]],
  [[-24, 0], [16, 0], [4, -12], [16, 0], [4, 12]],
];

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
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function frame(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  thickness = 2,
) {
  rect(context, x, y, width, thickness, color);
  rect(context, x, y + height - thickness, width, thickness, color);
  rect(context, x, y, thickness, height, color);
  rect(context, x + width - thickness, y, thickness, height, color);
}

function pixelLine(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  color: string,
  pixelSize = 3,
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

function orbitPoint(radius: number, angle: number, flattening = 0.86): Point {
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius * flattening];
}

function drawPixelOrbit(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  opacity: number,
  dash = 3,
  offset = 0,
  thickness = 2,
) {
  context.save();
  context.globalAlpha = clamp(opacity);
  const samples = Math.max(48, Math.round(radius * 0.8));
  for (let index = 0; index < samples; index += 1) {
    if ((index + offset) % (dash + 2) >= dash) continue;
    const angle = index / samples * TWO_PI;
    const [x, y] = orbitPoint(radius, angle);
    rect(context, x, y, thickness, thickness, color);
  }
  context.restore();
}

function drawChamber(context: CanvasRenderingContext2D, active: boolean) {
  rect(context, 0, 0, SIZE, SIZE, COLORS.black);
  for (let position = 8; position < SIZE; position += 16) {
    rect(context, position, 0, 1, SIZE, COLORS.grid);
    rect(context, 0, position, SIZE, 1, COLORS.grid);
  }

  frame(context, 8, 8, SIZE - 16, SIZE - 16, COLORS.metalLight, 3);
  frame(context, 18, 18, SIZE - 36, SIZE - 36, COLORS.inactive, 2);
  frame(context, 30, 30, SIZE - 60, SIZE - 60, COLORS.gridBright, 2);

  const cornerBlocks: readonly Point[] = [[28, 28], [464, 28], [28, 464], [464, 464]];
  cornerBlocks.forEach(([x, y]) => {
    rect(context, x, y, 20, 20, COLORS.black);
    frame(context, x, y, 20, 20, COLORS.metalLight, 3);
    rect(context, x + 7, y + 7, 6, 6, active ? COLORS.cyanDark : COLORS.inactive);
  });

  for (let index = 0; index < 4; index += 1) {
    const x = 82 + index * 116;
    rect(context, x, 35, 54, 9, COLORS.black);
    frame(context, x, 35, 54, 9, active ? COLORS.cyanDark : COLORS.inactive, 2);
    rect(context, x, 468, 54, 9, COLORS.black);
    frame(context, x, 468, 54, 9, active ? COLORS.cyanDark : COLORS.inactive, 2);
  }

  rect(context, 42, CENTER - 5, 68, 10, COLORS.deepMetal);
  rect(context, SIZE - 110, CENTER - 5, 68, 10, COLORS.deepMetal);
  rect(context, CENTER - 5, 42, 10, 68, COLORS.deepMetal);
  rect(context, CENTER - 5, SIZE - 110, 10, 68, COLORS.deepMetal);
}

function chooseTier(index: number, tiers: readonly LawHeartTier[]) {
  const active = tiers
    .map((tier, tierIndex) => ({ tierIndex, weight: Math.max(1, Math.log10(safe(tier.output) + 10)) }))
    .filter(({ tierIndex }) => safe(tiers[tierIndex]?.count) > 0);
  if (active.length === 0) return 0;
  const total = active.reduce((sum, item) => sum + item.weight, 0);
  let target = hash(index * 7.17) * total;
  for (const item of active) {
    target -= item.weight;
    if (target <= 0) return item.tierIndex;
  }
  return active[active.length - 1].tierIndex;
}

function drawStoredFlux(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  impulse: number,
  reducedMotion: boolean,
) {
  const flux = safe(props.flux);
  if (flux <= 0) return;
  const order = Math.log10(flux + 1);
  const count = Math.round(clamp(5 + order * 7, 5, 96));
  const speedOrder = Math.log10(safe(props.fluxPerSecond) + 1);
  const speed = reducedMotion ? 0 : 0.00008 + clamp(speedOrder / 10, 0, 1) * 0.00055;

  for (let index = 0; index < count; index += 1) {
    const lane = index % 5;
    const baseRadius = 58 + hash(index * 3.31) * 154 + lane * 2;
    const direction = index % 2 === 0 ? 1 : -1;
    const angle = hash(index * 11.73) * TWO_PI + now * speed * direction * (0.65 + hash(index * 5.7));
    const radius = baseRadius + impulse * (8 + hash(index) * 30);
    const [x, y] = orbitPoint(radius, angle, 0.82 + hash(index * 2.3) * 0.12);
    const tierIndex = chooseTier(index, props.tiers);
    const size = index % 11 === 0 ? 5 : index % 4 === 0 ? 3 : 2;
    context.save();
    context.globalAlpha = 0.42 + hash(index * 9.2) * 0.58;
    rect(context, x, y, size, size, TIER_COLORS[tierIndex] ?? COLORS.cyan);
    context.restore();
  }

  const continuousRings = Math.min(4, Math.floor(Math.max(0, speedOrder - 1) / 2));
  for (let index = 0; index < continuousRings; index += 1) {
    drawPixelOrbit(
      context,
      72 + index * 38,
      TIER_COLORS[Math.min(index, TIER_COLORS.length - 1)],
      0.18 + index * 0.05,
      7,
      Math.floor(now / (130 - index * 12)),
      index >= 2 ? 3 : 2,
    );
  }
}

function drawTierNode(
  context: CanvasRenderingContext2D,
  tierIndex: number,
  x: number,
  y: number,
  active: boolean,
  intensity: number,
) {
  const color = TIER_COLORS[tierIndex] ?? COLORS.cyan;
  const size = tierIndex >= 4 ? 10 : tierIndex >= 2 ? 8 : 7;
  rect(context, x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4, COLORS.black);
  frame(context, x - size / 2, y - size / 2, size, size, active ? COLORS.white : color, 2);
  if (intensity > 0.62) rect(context, x - 1, y - 1, 3, 3, color);
}

function drawFabricationOrbits(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  reducedMotion: boolean,
  purchaseEvent: PurchaseEvent | null,
) {
  props.tiers.slice(0, TIER_COLORS.length).forEach((tier, tierIndex) => {
    const count = safe(tier.count);
    if (count <= 0) return;
    const radius = 78 + tierIndex * 31;
    const color = TIER_COLORS[tierIndex];
    const outputOrder = Math.log10(safe(tier.output) + 1);
    const intensity = clamp((Math.log2(count + 1) + outputOrder * 0.35) / 11);
    const direction = tierIndex % 2 === 0 ? 1 : -1;
    const speed = reducedMotion ? 0 : (0.00014 + clamp(outputOrder / 11) * 0.00072) * direction;
    const offset = Math.floor(now / Math.max(45, 170 - outputOrder * 10));
    drawPixelOrbit(context, radius, color, 0.13 + intensity * 0.25, count >= 25 ? 8 : 3, offset, count >= 75 ? 3 : 2);

    const nodeCount = Math.min(12, Math.max(1, Math.ceil(Math.log2(count + 1) * 1.8)));
    const activeNode = reducedMotion ? -1 : Math.floor(now / Math.max(90, 470 - outputOrder * 30)) % nodeCount;
    for (let node = 0; node < nodeCount; node += 1) {
      const angle = node / nodeCount * TWO_PI + now * speed;
      const [x, y] = orbitPoint(radius, angle);
      drawTierNode(context, tierIndex, x, y, node === activeNode, intensity);
    }

    const packets = Math.min(18, Math.max(2, Math.ceil(Math.log2(count + 1) * 1.7)));
    for (let packet = 0; packet < packets; packet += 1) {
      const angle = hash(packet * 8.7 + tierIndex * 31) * TWO_PI + now * speed * (1.4 + hash(packet));
      const [x, y] = orbitPoint(radius + (packet % 3 - 1) * 5, angle);
      rect(context, x, y, packet % 5 === 0 ? 4 : 2, packet % 5 === 0 ? 4 : 2, color);
    }

    if (purchaseEvent?.tierIndex === tierIndex && now - purchaseEvent.startedAt < 950) {
      const phase = clamp((now - purchaseEvent.startedAt) / 950);
      const flare = Math.sin(phase * Math.PI);
      drawPixelOrbit(context, radius + flare * 24, color, (1 - phase) * 0.9, 10, offset, 4);
      const deliveryCount = Math.min(14, 5 + Math.ceil(Math.log2(purchaseEvent.quantity + 1) * 2));
      for (let particle = 0; particle < deliveryCount; particle += 1) {
        const angle = particle / deliveryCount * TWO_PI + hash(particle + tierIndex) * 0.25;
        const deliveryRadius = 235 - (235 - radius) * clamp(phase * 1.35);
        const [x, y] = orbitPoint(deliveryRadius, angle);
        rect(context, x, y, 5, 5, particle % 3 === 0 ? COLORS.white : color);
      }
    }
  });
}

function drawGlyph(
  context: CanvasRenderingContext2D,
  lawIndex: number,
  progress: number,
  radius: number,
  color: string,
) {
  const points = LAW_GLYPHS[Math.max(0, Math.min(LAW_GLYPHS.length - 1, lawIndex))];
  const segmentProgress = clamp(progress) * (points.length - 1);
  const scale = Math.max(0.75, radius / 27);
  for (let index = 0; index < points.length - 1; index += 1) {
    const amount = clamp(segmentProgress - index);
    if (amount <= 0) break;
    const start: Point = [CENTER + points[index][0] * scale, CENTER + points[index][1] * scale];
    const finish: Point = [CENTER + points[index + 1][0] * scale, CENTER + points[index + 1][1] * scale];
    const partial: Point = [
      start[0] + (finish[0] - start[0]) * amount,
      start[1] + (finish[1] - start[1]) * amount,
    ];
    pixelLine(context, start, partial, color, 3);
  }
}

function drawCore(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  clickPhase: number,
  recalibrationEvent: RecalibrationEvent | null,
) {
  const axiomGrowth = Math.log2(safe(props.lifetimeAxioms) + 1);
  const baseRadius = 19 + Math.min(30, axiomGrowth * 4.2) + Math.min(3, props.provenLaws) * 2;
  const compression = clickPhase < 0.22
    ? -7 * Math.sin(clickPhase / 0.22 * Math.PI)
    : clickPhase < 1
      ? 4 * Math.sin((clickPhase - 0.22) / 0.78 * Math.PI)
      : 0;
  const recalibrationPhase = recalibrationEvent ? clamp((now - recalibrationEvent.startedAt) / 1450) : 0;
  const prestigeFlare = recalibrationEvent ? Math.sin(recalibrationPhase * Math.PI) * 14 : 0;
  const radius = Math.max(14, baseRadius + compression + prestigeFlare);
  const lawReady = props.state === "law-ready" || props.preparingRecalibration;
  const outerColor = lawReady ? COLORS.amber : props.manualPulses > 0 ? COLORS.cyan : COLORS.inactive;

  rect(context, CENTER - radius - 8, CENTER - radius - 8, radius * 2 + 16, radius * 2 + 16, COLORS.black);
  pixelLine(context, [CENTER, CENTER - radius - 8], [CENTER + radius + 8, CENTER], outerColor, 4);
  pixelLine(context, [CENTER + radius + 8, CENTER], [CENTER, CENTER + radius + 8], outerColor, 4);
  pixelLine(context, [CENTER, CENTER + radius + 8], [CENTER - radius - 8, CENTER], outerColor, 4);
  pixelLine(context, [CENTER - radius - 8, CENTER], [CENTER, CENTER - radius - 8], outerColor, 4);

  rect(context, CENTER - radius, CENTER - radius, radius * 2, radius * 2, COLORS.deepMetal);
  frame(context, CENTER - radius, CENTER - radius, radius * 2, radius * 2, outerColor, 4);
  rect(context, CENTER - radius * 0.58, CENTER - radius * 0.58, radius * 1.16, radius * 1.16, lawReady ? "#4a3514" : COLORS.cyanDark);
  rect(context, CENTER - 6, CENTER - 6, 12, 12, props.manualPulses > 0 ? COLORS.white : COLORS.inactive);

  const axiomOrbiters = Math.min(12, Math.floor(axiomGrowth * 1.6));
  for (let index = 0; index < axiomOrbiters; index += 1) {
    const angle = index / Math.max(1, axiomOrbiters) * TWO_PI + now * 0.00018 * (index % 2 === 0 ? 1 : -1);
    const [x, y] = orbitPoint(radius + 22, angle, 1);
    rect(context, x - 2, y - 2, 5, 5, index % 3 === 0 ? COLORS.white : COLORS.amber);
  }

  const nextLaw = Math.min(2, Math.max(0, props.provenLaws));
  const glyphProgress = lawReady ? 1 : clamp(props.recalibrationProgress);
  if (glyphProgress > 0.015) {
    drawGlyph(context, nextLaw, glyphProgress, Math.max(18, radius * 0.72), lawReady ? COLORS.amber : COLORS.cyan);
  }
}

function drawClickImpact(
  context: CanvasRenderingContext2D,
  phase: number,
  manualGain: number,
) {
  if (phase >= 1) return;
  const opacity = 1 - phase;
  const shockRadius = 35 + phase * 178;
  drawPixelOrbit(context, shockRadius, phase < 0.35 ? COLORS.white : COLORS.cyan, opacity * 0.85, 6, Math.floor(phase * 20), phase < 0.28 ? 5 : 3);
  const sparkCount = Math.min(24, 10 + Math.floor(Math.log10(safe(manualGain) + 1) * 2));
  for (let index = 0; index < sparkCount; index += 1) {
    const angle = index / sparkCount * TWO_PI + hash(index * 13.1) * 0.2;
    const distance = 28 + phase * (54 + hash(index) * 90);
    const [x, y] = orbitPoint(distance, angle, 0.96);
    rect(context, x, y, index % 4 === 0 ? 6 : 3, index % 4 === 0 ? 6 : 3, index % 5 === 0 ? COLORS.amber : COLORS.cyan);
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
  const count = Math.round(6 + event.strength * 16);
  for (let index = 0; index < count; index += 1) {
    const lane = (index - count / 2) * 7;
    const x = CENTER + 42 + phase * 215 + hash(index) * 18;
    const y = CENTER + lane * (0.3 + phase * 0.7);
    rect(context, x, y, index % 3 === 0 ? 5 : 3, index % 3 === 0 ? 5 : 3, index % 4 === 0 ? COLORS.amber : COLORS.cyan);
  }
}

function drawRecalibrationCollapse(
  context: CanvasRenderingContext2D,
  event: RecalibrationEvent | null,
  now: number,
) {
  if (!event) return;
  const phase = clamp((now - event.startedAt) / 1450);
  if (phase >= 1) return;
  const count = 32;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * TWO_PI + hash(index * 5.3) * 0.18;
    const radius = 224 * (1 - phase) + 28;
    const [x, y] = orbitPoint(radius, angle);
    rect(context, x, y, index % 4 === 0 ? 6 : 3, index % 4 === 0 ? 6 : 3, index % 3 === 0 ? COLORS.white : COLORS.amber);
  }
  drawPixelOrbit(context, 30 + phase * 190, COLORS.amber, (1 - phase) * 0.9, 8, Math.floor(phase * 24), 4);
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
  const clickPhase = Number.isFinite(clickAge) && clickAge >= 0 ? clamp(clickAge / 760) : 1;
  const impulse = clickPhase < 1 ? Math.sin(clickPhase * Math.PI) : 0;
  const active = props.manualPulses > 0 || props.tiers.some((tier) => safe(tier.count) > 0);

  context.clearRect(0, 0, SIZE, SIZE);
  context.imageSmoothingEnabled = false;
  drawChamber(context, active);
  drawFabricationOrbits(context, props, now, reducedMotion, purchaseEvent);
  drawStoredFlux(context, props, now, impulse, reducedMotion);
  drawExpenditure(context, expenditureEvent, now);
  drawRecalibrationCollapse(context, recalibrationEvent, now);
  drawCore(context, props, now, clickPhase, recalibrationEvent);
  drawClickImpact(context, clickPhase, safe(props.manualGain));

  if (!active) {
    rect(context, CENTER - 2, CENTER - 2, 4, 4, COLORS.cyanDark);
  }
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
