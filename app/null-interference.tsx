"use client";

import { useEffect, useRef } from "react";

import { playNullStatic } from "./law-heart-audio";
import { corruptReading } from "./null-misread";

/*
 * Null interference: the interface itself is touched by the Null. As the
 * world's effective Null saturation rises, AXIOM's display tears, misreads a
 * number for a moment, splits its colours, or drops a plate - and as the
 * player shields the Ark (Law-Heart resistance, research, infrastructure) the
 * noise recedes. Purely presentational: nothing about the simulation, saves
 * or real values changes, and every effect clears itself within half a
 * second. Off under prefers-reduced-motion and when the tab is hidden.
 */

type Classification = "quiet" | "trace" | "elevated" | "severe";
type Effect = "tear" | "misread" | "split" | "flicker" | "slip";

/** Milliseconds between bursts at each saturation band; quiet is silent. */
const CADENCE: Record<Classification, readonly [number, number] | null> = {
  quiet: null,
  trace: [40_000, 75_000],
  elevated: [18_000, 34_000],
  severe: [8_000, 16_000],
};

const WEIGHTS: Record<Exclude<Classification, "quiet">, readonly [Effect, number][]> = {
  trace: [["misread", 4], ["split", 3], ["flicker", 3]],
  elevated: [["tear", 3], ["misread", 3], ["split", 2], ["flicker", 2], ["slip", 2]],
  severe: [["tear", 4], ["misread", 3], ["split", 2], ["flicker", 2], ["slip", 3]],
};

/** Numbers AXIOM can misread. Display only; the real value is untouched. */
const READOUTS = [
  ".resource-readout strong",
  ".header-metrics strong",
  ".ark-heading-metrics strong",
  ".continuity-summary-band strong",
  ".settlement-score strong",
];

const PLATES = [
  ".ark-cutaway-tag",
  ".panel",
  ".continuity-panel",
  ".machine-row",
  ".ark-compartment-card",
];

function pickWeighted(weights: readonly [Effect, number][]) {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [effect, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return effect;
  }
  return weights[0][0];
}

function visible(element: Element) {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight;
}

function pickVisible(selectors: readonly string[]) {
  const candidates = selectors
    .flatMap((selector) => [...document.querySelectorAll(`.game-shell ${selector}`)])
    .filter(visible);
  return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

export function NullInterference({
  classification,
  intensity,
}: {
  classification: Classification;
  intensity: number;
}) {
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    const cadence = CADENCE[classification];
    if (!cadence || classification === "quiet") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const weights = WEIGHTS[classification];
    const shell = document.querySelector<HTMLElement>(".game-shell");
    if (!shell) return;
    const timers = new Set<number>();
    const later = (callback: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, delay);
      timers.add(id);
    };
    const strength = Math.max(0, Math.min(1, intensity));

    const run = (effect: Effect) => {
      switch (effect) {
        case "tear": {
          turbulenceRef.current?.setAttribute("seed", String(Math.floor(Math.random() * 999)));
          turbulenceRef.current?.setAttribute("baseFrequency", `0 ${(0.04 + Math.random() * 0.08).toFixed(3)}`);
          displacementRef.current?.setAttribute("scale", String(Math.round(10 + strength * 28)));
          shell.classList.add("null-tearing");
          playNullStatic(strength);
          later(() => shell.classList.remove("null-tearing"), 90);
          later(() => shell.classList.add("null-tearing"), 160);
          later(() => shell.classList.remove("null-tearing"), 240);
          break;
        }
        case "misread": {
          const readout = pickVisible(READOUTS);
          if (!(readout instanceof HTMLElement)) break;
          readout.style.setProperty("--null-font-size", window.getComputedStyle(readout).fontSize);
          readout.dataset.nullMisread = corruptReading(readout.textContent?.trim() ?? "");
          later(() => {
            delete readout.dataset.nullMisread;
            readout.style.removeProperty("--null-font-size");
          }, 260 + Math.random() * 220);
          break;
        }
        case "split": {
          shell.classList.add("null-split");
          later(() => shell.classList.remove("null-split"), 150);
          break;
        }
        case "flicker": {
          const plate = pickVisible(PLATES);
          if (!(plate instanceof HTMLElement)) break;
          plate.dataset.nullFlicker = "";
          later(() => {
            delete plate.dataset.nullFlicker;
          }, 320);
          break;
        }
        case "slip": {
          shell.classList.add("null-slip");
          playNullStatic(strength * 0.5);
          later(() => shell.classList.remove("null-slip"), 220);
          break;
        }
      }
    };

    const schedule = () => {
      const [minimum, maximum] = cadence;
      later(() => {
        if (!document.hidden) {
          run(pickWeighted(weights));
          if (classification === "severe" && Math.random() < 0.3) {
            later(() => run(pickWeighted(weights)), 120);
          }
        }
        schedule();
      }, minimum + Math.random() * (maximum - minimum));
    };
    schedule();

    return () => {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      shell.classList.remove("null-tearing", "null-split", "null-slip");
      document.querySelectorAll<HTMLElement>("[data-null-misread]").forEach((element) => {
        delete element.dataset.nullMisread;
      });
      document.querySelectorAll<HTMLElement>("[data-null-flicker]").forEach((element) => {
        delete element.dataset.nullFlicker;
      });
    };
  }, [classification, intensity]);

  return (
    <svg className="null-interference-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="null-tear" x="-5%" y="0" width="110%" height="100%" colorInterpolationFilters="sRGB">
          {/* Noise that varies only down the screen: horizontal bands. */}
          <feTurbulence ref={turbulenceRef} type="fractalNoise" baseFrequency="0 0.08" numOctaves={1} seed={7} result="noise" />
          {/* Quantise into hard bands: most stay put (0.5), a few jump. G is
              pinned at 0.5 so nothing moves vertically. */}
          <feComponentTransfer in="noise" result="bands">
            <feFuncR type="discrete" tableValues="0.5 0.5 0.15 0.5 0.5 0.85 0.5 0.5 0.3 0.5" />
            <feFuncG type="discrete" tableValues="0.5" />
          </feComponentTransfer>
          <feDisplacementMap ref={displacementRef} in="SourceGraphic" in2="bands" scale={18} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
