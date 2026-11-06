/*
 * Switching AXIOM's view between the console and the drone, like changing the
 * channel on an old set: the picture squeezes to a bright line and shrinks to a
 * point, snow bursts across the screen, and the other feed opens out of the line.
 * The swap itself happens under the snow, so neither view is seen half-built.
 * With reduced motion it is a plain dip to black. PC only, as the drone view is.
 */

import { playChannelSwitch, unlockPulseAudio } from "./law-heart-audio";

const SWITCH_MS = 560;
const CALM_MS = 260;
let snowTile: string | null = null;
let switching = false;

/** A tile of television snow, made once. */
function snow() {
  if (snowTile) return snowTile;
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(96, 96);
  for (let at = 0; at < image.data.length; at += 4) {
    const level = Math.random() * 255;
    image.data[at] = level;
    image.data[at + 1] = level;
    image.data[at + 2] = level * 1.05;
    image.data[at + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  snowTile = canvas.toDataURL();
  return snowTile;
}

/**
 * Change channel: `swap` runs at the height of the snow, hidden behind it.
 * Ignored (false) while a switch is already under way.
 */
export function switchChannel(swap: () => void) {
  if (switching) return false;
  switching = true;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const length = calm ? CALM_MS : SWITCH_MS;
  const overlay = document.createElement("div");
  overlay.className = calm ? "channel-switch is-calm" : "channel-switch";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.setProperty("--channel-snow", `url("${snow()}")`);
  overlay.style.setProperty("--channel-length", `${length}ms`);
  for (const part of ["top", "bottom", "snow", "line"]) {
    const piece = document.createElement("i");
    piece.className = `channel-switch-${part}`;
    overlay.append(piece);
  }
  document.body.append(overlay);
  unlockPulseAudio();
  playChannelSwitch();
  window.setTimeout(swap, length * 0.47);
  window.setTimeout(() => {
    overlay.remove();
    switching = false;
  }, length);
  return true;
}
