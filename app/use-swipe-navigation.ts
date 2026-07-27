"use client";

import { useEffect, useRef, type RefObject } from "react";

const EDGE_GUARD_PX = 24;
const DEADZONE_PX = 10;
const AXIS_RATIO = 1.5;
const MIN_SWIPE_PX = 60;

type SwipeOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  excludeSelector: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

type GestureState = {
  active: boolean;
  startX: number;
  startY: number;
  axis: "horizontal" | "vertical" | null;
};

export function useSwipeNavigation({ containerRef, excludeSelector, onSwipeLeft, onSwipeRight }: SwipeOptions) {
  // Read the latest callbacks without re-attaching listeners on every render.
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const gesture: GestureState = { active: false, startX: 0, startY: 0, axis: null };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(excludeSelector)) return;
      if (event.clientX < EDGE_GUARD_PX || event.clientX > window.innerWidth - EDGE_GUARD_PX) return;
      gesture.active = true;
      gesture.startX = event.clientX;
      gesture.startY = event.clientY;
      gesture.axis = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!gesture.active) return;
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (gesture.axis === null) {
        if (Math.hypot(dx, dy) < DEADZONE_PX) return;
        gesture.axis = Math.abs(dx) > AXIS_RATIO * Math.abs(dy) ? "horizontal" : "vertical";
        if (gesture.axis === "vertical") {
          gesture.active = false;
          return;
        }
      }
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!gesture.active) return;
      const dx = event.clientX - gesture.startX;
      gesture.active = false;
      if (gesture.axis !== "horizontal") return;
      if (Math.abs(dx) < MIN_SWIPE_PX) return;
      if (dx < 0) onSwipeLeftRef.current();
      else onSwipeRightRef.current();
    };

    const onPointerCancel = () => {
      gesture.active = false;
      gesture.axis = null;
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove, { passive: false });
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerCancel);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [containerRef, excludeSelector]);
}
