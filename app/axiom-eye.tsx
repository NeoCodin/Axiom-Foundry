"use client";

import { useEffect, useId, useRef } from "react";

/*
 * AXIOM's eye: the caretaker made visible. A pixel eye in the world's colour
 * that follows the pointer (or glances around on touch screens), blinks now
 * and then, and twitches when Null interference hits the display. Movement
 * is written to CSS variables on the SVG, so it never re-renders React.
 */

type Row = { x: number; y: number; w: number };

const SIZE = 24;
const CX = 12;
const CY = 12;

function almond(halfWidth: number, halfHeight: number): Row[] {
  const rows: Row[] = [];
  for (let y = Math.floor(CY - halfHeight); y < Math.ceil(CY + halfHeight); y += 1) {
    const t = (y + 0.5 - CY) / halfHeight;
    if (Math.abs(t) >= 1) continue;
    const half = halfWidth * Math.pow(1 - t * t, 0.8);
    const x0 = Math.round(CX - half);
    const x1 = Math.round(CX + half);
    if (x1 > x0) rows.push({ x: x0, y, w: x1 - x0 });
  }
  return rows;
}

function disc(radius: number): Row[] {
  const rows: Row[] = [];
  for (let y = Math.floor(CY - radius); y < Math.ceil(CY + radius); y += 1) {
    const dy = y + 0.5 - CY;
    if (Math.abs(dy) >= radius) continue;
    const half = Math.sqrt(radius * radius - dy * dy);
    const x0 = Math.round(CX - half);
    const x1 = Math.round(CX + half);
    if (x1 > x0) rows.push({ x: x0, y, w: x1 - x0 });
  }
  return rows;
}

const OUTER = almond(11, 6.5);
const INNER = almond(9.6, 5.2);
const IRIS = disc(4.2);
const PUPIL = disc(1.9);

function Rows({ rows, fill, className }: { rows: readonly Row[]; fill: string; className?: string }) {
  return (
    <g className={className}>
      {rows.map((row, index) => (
        <rect key={index} x={row.x} y={row.y} width={row.w} height={1} fill={fill} />
      ))}
    </g>
  );
}

export function AxiomEye() {
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = `axiom-eye-${useId().replaceAll(":", "")}`;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers = new Set<number>();
    const later = (callback: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, delay);
      timers.add(id);
    };
    const look = (x: number, y: number) => {
      svg.style.setProperty("--eye-look-x", x.toFixed(2));
      svg.style.setProperty("--eye-look-y", y.toFixed(2));
    };

    // Blink every few seconds; sometimes twice.
    const blink = () => {
      svg.classList.add("is-blinking");
      later(() => svg.classList.remove("is-blinking"), 130);
      if (Math.random() < 0.2) {
        later(() => svg.classList.add("is-blinking"), 260);
        later(() => svg.classList.remove("is-blinking"), 390);
      }
      later(blink, 3500 + Math.random() * 5500);
    };
    later(blink, 2500);

    // Fine pointers are watched; touch screens get idle glances instead.
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!pointer) return;
        const box = svg.getBoundingClientRect();
        const dx = pointer.x - (box.left + box.width / 2);
        const dy = pointer.y - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 260);
        look(Math.round((dx / distance) * 3 * reach), Math.round((dy / distance) * 1.6 * reach));
      });
    };
    const glance = () => {
      const roll = Math.random();
      if (roll < 0.35) look(0, 0);
      else look(Math.round((Math.random() * 2 - 1) * 3), Math.round((Math.random() * 2 - 1) * 1.5));
      later(glance, 1800 + Math.random() * 3200);
    };
    if (finePointer) window.addEventListener("pointermove", onPointerMove, { passive: true });
    else later(glance, 1500);

    return () => {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      svg.classList.remove("is-blinking");
    };
  }, []);

  return (
    <svg ref={svgRef} className="axiom-eye" viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          {INNER.map((row, index) => (
            <rect key={index} x={row.x} y={row.y} width={row.w} height={1} />
          ))}
        </clipPath>
      </defs>
      <g className="axiom-eye-lid">
        <Rows rows={OUTER} fill="currentColor" />
        <Rows rows={INNER} fill="#0b0c1d" />
        <g clipPath={`url(#${clipId})`}>
          <g className="axiom-eye-iris">
            <Rows rows={IRIS} fill="currentColor" className="axiom-eye-iris-ring" />
            <Rows rows={PUPIL} fill="#07081a" />
            <rect x={10} y={9} width={1} height={1} fill="#fff4e0" />
          </g>
        </g>
      </g>
    </svg>
  );
}
