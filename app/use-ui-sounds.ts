"use client";

import { useEffect, useRef } from "react";
import { playBulkhead, playUiConfirm, playUiKey, unlockPulseAudio } from "./law-heart-audio";

/** Buttons that already make their own sound (the Law-Heart and its toggle). */
const SILENT = ".law-heart-core, .foundry-law-heart-machine, .law-pulse-sound";
const CONFIRM = ".buy-button, [data-ui-sound='confirm']";

/**
 * Interface sound: a key blip on every button press in the game shell, a
 * confirm blip for builds, and a bulkhead thud when the destination changes
 * (tap, click or swipe). Everything respects the game's Sound switch.
 */
export function useUiSounds(view: string) {
  const previousView = useRef(view);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest("button");
      if (!button || !button.closest(".game-shell") || button.disabled || button.matches(SILENT)) return;
      unlockPulseAudio();
      if (button.matches(CONFIRM)) playUiConfirm();
      else playUiKey();
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    playBulkhead();
  }, [view]);
}
