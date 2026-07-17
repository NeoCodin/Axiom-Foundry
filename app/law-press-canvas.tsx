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

type LawPressCanvasProps = {
  state: LawPressState;
  machineCount: number;
  manualPulses: number;
  pulseSerial: number;
  recalibrationProgress: number;
  provenLaws: number;
  preparingRecalibration: boolean;
};

const SIZE = 320;
const CENTER = SIZE / 2;
const PRESS_COLORS = {
  black: "#010405",
  void: "#02080a",
  grid: "#07161b",
  deepMetal: "#0a171c",
  metal: "#183039",
  metalLight: "#365d68",
  inactive: "#244048",
  cyanDark: "#17606a",
  cyan: "#55dfe3",
  white: "#dcffff",
  amber: "#e8b75d",
  red: "#a94d4b",
  green: "#66d39a",
} as const;

type Point = readonly [number, number];

const LAW_GLYPHS: readonly (readonly Point[])[] = [
  [[137, 137], [183, 137], [183, 183], [137, 183], [137, 137]],
  [[160, 134], [186, 160], [160, 186], [134, 160], [160, 134]],
  [[132, 160], [178, 160], [166, 148], [178, 160], [166, 172]],
];

const SPARK_OFFSETS: readonly Point[] = [
  [-8, -18], [12, -13], [21, -4], [-22, 3], [8, 17], [-13, 22], [27, 13], [-28, -12],
];

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
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

function drawGlyph(
  context: CanvasRenderingContext2D,
  lawIndex: number,
  progress: number,
  color: string,
) {
  const points = LAW_GLYPHS[Math.max(0, Math.min(LAW_GLYPHS.length - 1, lawIndex))];
  const segmentProgress = clamp(progress) * (points.length - 1);
  for (let index = 0; index < points.length - 1; index += 1) {
    const amount = clamp(segmentProgress - index);
    if (amount <= 0) break;
    const start = points[index];
    const end = points[index + 1];
    const partial: Point = [
      start[0] + (end[0] - start[0]) * amount,
      start[1] + (end[1] - start[1]) * amount,
    ];
    pixelLine(context, start, partial, color, 3);
  }
}

function strikeEnvelope(phase: number) {
  if (phase < 0 || phase >= 1) return 0;
  if (phase < 0.16) return phase / 0.16;
  if (phase < 0.3) return 1;
  if (phase < 0.56) return 1 - (phase - 0.3) / 0.26;
  return 0;
}

function drawTapModule(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  vertical: boolean,
  installed: boolean,
  active: boolean,
) {
  const width = vertical ? 14 : 24;
  const height = vertical ? 24 : 14;
  rect(context, x, y, width, height, PRESS_COLORS.black);
  frame(context, x, y, width, height, active ? PRESS_COLORS.cyan : installed ? PRESS_COLORS.metalLight : PRESS_COLORS.inactive, 2);
  if (!installed) {
    if (vertical) rect(context, x + 5, y + 8, 4, 8, PRESS_COLORS.deepMetal);
    else rect(context, x + 8, y + 5, 8, 4, PRESS_COLORS.deepMetal);
    return;
  }
  if (vertical) {
    rect(context, x + 5, y + 4, 4, 16, active ? PRESS_COLORS.white : PRESS_COLORS.metal);
  } else {
    rect(context, x + 4, y + 5, 16, 4, active ? PRESS_COLORS.white : PRESS_COLORS.metal);
  }
}

function drawChassis(context: CanvasRenderingContext2D, manualPulses: number) {
  rect(context, 0, 0, SIZE, SIZE, PRESS_COLORS.black);
  for (let position = 8; position < SIZE; position += 16) {
    rect(context, position, 0, 1, SIZE, PRESS_COLORS.grid);
    rect(context, 0, position, SIZE, 1, PRESS_COLORS.grid);
  }

  rect(context, 8, 8, 304, 304, PRESS_COLORS.deepMetal);
  frame(context, 8, 8, 304, 304, PRESS_COLORS.metalLight, 3);
  frame(context, 16, 16, 288, 288, PRESS_COLORS.inactive, 2);

  const cornerBlocks: readonly Point[] = [[18, 18], [286, 18], [18, 286], [286, 286]];
  cornerBlocks.forEach(([x, y]) => {
    rect(context, x, y, 16, 16, PRESS_COLORS.black);
    frame(context, x, y, 16, 16, PRESS_COLORS.metalLight, 2);
    rect(context, x + 6, y + 6, 4, 4, manualPulses > 0 ? PRESS_COLORS.cyanDark : PRESS_COLORS.inactive);
  });

  rect(context, 40, 153, 240, 14, PRESS_COLORS.black);
  frame(context, 40, 153, 240, 14, PRESS_COLORS.metal, 2);
  rect(context, 153, 40, 14, 240, PRESS_COLORS.black);
  frame(context, 153, 40, 14, 240, PRESS_COLORS.metal, 2);

  rect(context, 88, 88, 144, 144, PRESS_COLORS.black);
  frame(context, 88, 88, 144, 144, PRESS_COLORS.metalLight, 4);
  frame(context, 96, 96, 128, 128, PRESS_COLORS.metal, 2);
  rect(context, 112, 112, 96, 96, PRESS_COLORS.void);
  frame(context, 112, 112, 96, 96, PRESS_COLORS.inactive, 3);
}

function drawModules(
  context: CanvasRenderingContext2D,
  machineCount: number,
  activeIndex: number,
) {
  const visible = machineCount > 0 ? Math.min(16, Math.ceil(machineCount / 3)) : 0;
  for (let index = 0; index < 16; index += 1) {
    const side = Math.floor(index / 4);
    const slot = index % 4;
    const installed = index < visible;
    const active = installed && index === activeIndex;
    if (side === 0) drawTapModule(context, 44 + slot * 62, 27, false, installed, active);
    if (side === 1) drawTapModule(context, 44 + slot * 62, 279, false, installed, active);
    if (side === 2) drawTapModule(context, 27, 44 + slot * 62, true, installed, active);
    if (side === 3) drawTapModule(context, 279, 44 + slot * 62, true, installed, active);
  }
}

function drawPackets(
  context: CanvasRenderingContext2D,
  now: number,
  machineCount: number,
  frozen: boolean,
) {
  if (machineCount <= 0) return;
  const packetCount = machineCount >= 25 ? 3 : machineCount >= 10 ? 2 : 1;
  const speed = Math.max(520, 1700 - Math.sqrt(machineCount) * 170);
  for (let packet = 0; packet < packetCount; packet += 1) {
    const travel = frozen ? 0.82 : ((now / speed) + packet / packetCount) % 1;
    const offset = Math.round(travel * 62);
    const color = packet === 0 && machineCount >= 25 ? PRESS_COLORS.amber : PRESS_COLORS.cyan;
    rect(context, 46 + offset, 157, 7, 6, color);
    rect(context, 267 - offset, 157, 7, 6, color);
    rect(context, 157, 46 + offset, 6, 7, color);
    rect(context, 157, 267 - offset, 6, 7, color);
  }
}

function drawPressArms(context: CanvasRenderingContext2D, strike: number, locked: boolean) {
  const travel = Math.round((locked ? 0.78 : strike) * 14);
  const highlight = locked || strike > 0.72 ? PRESS_COLORS.white : strike > 0.08 ? PRESS_COLORS.cyan : PRESS_COLORS.metalLight;

  rect(context, 61, 149, 55 + travel, 22, PRESS_COLORS.metal);
  frame(context, 61, 149, 55 + travel, 22, PRESS_COLORS.metalLight, 2);
  rect(context, 105 + travel, 137, 13, 46, PRESS_COLORS.deepMetal);
  frame(context, 105 + travel, 137, 13, 46, highlight, 3);

  rect(context, 204 - travel, 149, 55 + travel, 22, PRESS_COLORS.metal);
  frame(context, 204 - travel, 149, 55 + travel, 22, PRESS_COLORS.metalLight, 2);
  rect(context, 202 - travel, 137, 13, 46, PRESS_COLORS.deepMetal);
  frame(context, 202 - travel, 137, 13, 46, highlight, 3);

  rect(context, 149, 61, 22, 55 + travel, PRESS_COLORS.metal);
  frame(context, 149, 61, 22, 55 + travel, PRESS_COLORS.metalLight, 2);
  rect(context, 137, 105 + travel, 46, 13, PRESS_COLORS.deepMetal);
  frame(context, 137, 105 + travel, 46, 13, highlight, 3);

  rect(context, 149, 204 - travel, 22, 55 + travel, PRESS_COLORS.metal);
  frame(context, 149, 204 - travel, 22, 55 + travel, PRESS_COLORS.metalLight, 2);
  rect(context, 137, 202 - travel, 46, 13, PRESS_COLORS.deepMetal);
  frame(context, 137, 202 - travel, 46, 13, highlight, 3);
}

function drawSparks(context: CanvasRenderingContext2D, strength: number) {
  if (strength <= 0.05) return;
  const distance = 8 + Math.round((1 - strength) * 24);
  SPARK_OFFSETS.forEach(([x, y], index) => {
    const scale = distance / 24;
    rect(
      context,
      CENTER + x * scale,
      CENTER + y * scale,
      index % 3 === 0 ? 5 : 3,
      index % 3 === 0 ? 5 : 3,
      index % 4 === 0 ? PRESS_COLORS.amber : PRESS_COLORS.cyan,
    );
  });
}

function drawLawSlots(
  context: CanvasRenderingContext2D,
  provenLaws: number,
  ready: boolean,
) {
  for (let index = 0; index < 3; index += 1) {
    const x = 126 + index * 26;
    const proven = index < provenLaws;
    const next = index === Math.min(2, provenLaws);
    const color = proven ? PRESS_COLORS.green : ready && next ? PRESS_COLORS.amber : PRESS_COLORS.inactive;
    rect(context, x, 246, 18, 18, PRESS_COLORS.black);
    frame(context, x, 246, 18, 18, color, 2);
    if (proven) rect(context, x + 6, 252, 6, 6, PRESS_COLORS.white);
  }
}

function renderLawPress(
  context: CanvasRenderingContext2D,
  props: LawPressCanvasProps,
  now: number,
  pulseStartedAt: number,
  reducedMotion: boolean,
) {
  const lawReady = props.state === "law-ready";
  const manualAge = now - pulseStartedAt;
  const manualStrike = manualAge >= 0 && manualAge < 620
    ? strikeEnvelope(manualAge / 620)
    : 0;
  const cycleDuration = Math.max(520, 2300 - Math.sqrt(Math.max(0, props.machineCount)) * 280);
  const automationPhase = props.machineCount > 0 && !lawReady && !reducedMotion
    ? (now % cycleDuration) / cycleDuration
    : -1;
  const automatedStrike = strikeEnvelope(automationPhase);
  const strike = Math.max(manualStrike, automatedStrike);
  const visibleModules = props.machineCount > 0 ? Math.min(16, Math.ceil(props.machineCount / 3)) : 0;
  const activeModule = visibleModules > 0 && !lawReady && !reducedMotion
    ? Math.floor(now / cycleDuration * visibleModules) % visibleModules
    : -1;

  context.clearRect(0, 0, SIZE, SIZE);
  context.imageSmoothingEnabled = false;
  drawChassis(context, props.manualPulses);
  drawModules(context, props.machineCount, activeModule);
  drawPackets(context, now, props.machineCount, lawReady || reducedMotion);
  drawPressArms(context, strike, lawReady || props.preparingRecalibration);

  const nextLaw = Math.min(2, Math.max(0, props.provenLaws));
  const glyphProgress = lawReady || props.preparingRecalibration
    ? 1
    : clamp(props.recalibrationProgress);
  if (glyphProgress > 0.015) {
    drawGlyph(
      context,
      nextLaw,
      glyphProgress,
      props.preparingRecalibration ? PRESS_COLORS.white : lawReady ? PRESS_COLORS.amber : PRESS_COLORS.cyanDark,
    );
  } else if (strike > 0.05) {
    pixelLine(context, [148, 143], [165, 161], PRESS_COLORS.white, 3);
    pixelLine(context, [165, 161], [154, 177], PRESS_COLORS.cyan, 3);
    pixelLine(context, [165, 161], [178, 151], PRESS_COLORS.cyan, 3);
  }
  drawSparks(context, manualStrike);
  drawLawSlots(context, Math.min(3, props.provenLaws), lawReady || props.preparingRecalibration);

  const caretakerColor = props.manualPulses === 0
    ? PRESS_COLORS.inactive
    : lawReady
      ? PRESS_COLORS.amber
      : PRESS_COLORS.cyan;
  rect(context, 154, 295, 12, 4, caretakerColor);
  if (props.manualPulses === 0) rect(context, 158, 296, 4, 2, PRESS_COLORS.cyanDark);
}

export function LawPressCanvas(props: LawPressCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseStartedAt = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    if (props.pulseSerial > 0) pulseStartedAt.current = performance.now();
  }, [props.pulseSerial]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame: number | null = null;
    let disposed = false;

    const draw = (now: number) => {
      if (disposed) return;
      renderLawPress(context, props, now, pulseStartedAt.current, motionPreference.matches);
      const pulseIsActive = now - pulseStartedAt.current < 700;
      const automationIsActive = props.machineCount > 0 && props.state !== "law-ready";
      if (!motionPreference.matches && document.visibilityState === "visible" && (pulseIsActive || automationIsActive)) {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        animationFrame = null;
      }
    };

    const restart = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      draw(performance.now());
    };

    const handleVisibility = () => restart();
    const handleMotionPreference = () => restart();
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);
    restart();

    return () => {
      disposed = true;
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, [props]);

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
