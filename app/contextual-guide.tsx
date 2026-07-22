"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import type { ContextGuideStep } from "./story-content";

type GuideRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type ContextualGuideProps = {
  label: string;
  steps: readonly ContextGuideStep[];
  stepIndex: number;
  actionRef?: RefObject<HTMLButtonElement | null>;
  finalLabel?: string;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

const TARGET_PADDING = 8;

function measureTarget(target: string): GuideRect | null {
  const element = document.querySelector<HTMLElement>(
    `[data-guide-target="${target}"]`,
  );
  if (!element) return null;
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const top = Math.max(8, bounds.top - TARGET_PADDING);
  const left = Math.max(8, bounds.left - TARGET_PADDING);
  const right = Math.min(window.innerWidth - 8, bounds.right + TARGET_PADDING);
  const bottom = Math.min(window.innerHeight - 8, bounds.bottom + TARGET_PADDING);
  return {
    top,
    right,
    bottom,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function ContextualGuide({
  label,
  steps,
  stepIndex,
  actionRef,
  finalLabel = "Finish guide",
  onBack,
  onNext,
  onSkip,
}: ContextualGuideProps) {
  const step = steps[stepIndex];
  const [targetRect, setTargetRect] = useState<GuideRect | null>(null);

  useEffect(() => {
    if (!step) return;
    const target = document.querySelector<HTMLElement>(
      `[data-guide-target="${step.target}"]`,
    );
    target?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setTargetRect(measureTarget(step.target)));
    };
    update();
    const delayed = window.setTimeout(update, 50);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  useEffect(() => {
    actionRef?.current?.focus();
  }, [actionRef, stepIndex]);

  const scrimStyles = useMemo(() => {
    if (!targetRect) return null;
    return {
      top: { top: 0, right: 0, left: 0, height: targetRect.top },
      left: {
        top: targetRect.top,
        left: 0,
        width: targetRect.left,
        height: targetRect.height,
      },
      right: {
        top: targetRect.top,
        right: 0,
        width: Math.max(0, window.innerWidth - targetRect.right),
        height: targetRect.height,
      },
      bottom: { right: 0, bottom: 0, left: 0, top: targetRect.bottom },
      outline: {
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
      },
    } satisfies Record<string, CSSProperties>;
  }, [targetRect]);

  if (!step) return null;
  const cardAbove = Boolean(targetRect && targetRect.top > window.innerHeight * 0.54);

  return (
    <div className="context-guide-layer" data-guide={label}>
      {scrimStyles ? (
        <>
          <div className="context-guide-scrim-piece" style={scrimStyles.top} />
          <div className="context-guide-scrim-piece" style={scrimStyles.left} />
          <div className="context-guide-scrim-piece" style={scrimStyles.right} />
          <div className="context-guide-scrim-piece" style={scrimStyles.bottom} />
          <div className="context-guide-outline" style={scrimStyles.outline} aria-hidden="true" />
        </>
      ) : (
        <div className="context-guide-full-scrim" />
      )}
      <section
        className={`context-guide-card ${cardAbove ? "is-above" : "is-below"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-guide-title"
        aria-describedby="context-guide-description"
      >
        <div className="context-guide-speaker">
          <span aria-hidden="true">A</span>
          <div><strong>AXIOM // GUIDED HANDOFF</strong><small>{label}</small></div>
        </div>
        <p className="context-guide-eyebrow">{step.eyebrow}</p>
        <h2 id="context-guide-title">{step.title}</h2>
        <p id="context-guide-description">{step.body}</p>
        <div className="context-guide-note">{step.note}</div>
        <div className="context-guide-progress" aria-label={`Guide step ${stepIndex + 1} of ${steps.length}`}>
          {steps.map((candidate, index) => (
            <i className={index === stepIndex ? "is-active" : index < stepIndex ? "is-complete" : ""} key={`${candidate.target}-${index}`} />
          ))}
        </div>
        <div className="context-guide-actions">
          <button className="context-guide-skip" type="button" onClick={onSkip}>Skip this guide</button>
          <div>
            <button type="button" disabled={stepIndex === 0} onClick={onBack}>Back</button>
            <button ref={actionRef} className="context-guide-next" type="button" onClick={onNext}>
              {stepIndex === steps.length - 1 ? finalLabel : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
