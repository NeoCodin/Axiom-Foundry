/*
 * The Null on the drone's feed. AXIOM sees the ship through a maintenance drone's
 * camera, and the camera is a signal. As the world's Null saturation rises the feed
 * carries grain, scanlines and a slow rolling bar, then bursts of interference: rows
 * tear sideways, the colours split, static snows across it, the picture freezes, the
 * view jolts, a label misreads, and at worst the signal drops out for a moment. Near
 * the Law-Heart the feed is shielded; with the launch bay open to space it is worse.
 * Pure timing; ark-walk.tsx draws it. Every burst clears itself within a second, and
 * under reduced motion the feed stays clean.
 */

export type NullClass = "quiet" | "trace" | "elevated" | "severe";
export type NullEffect = "tear" | "split" | "snow" | "freeze" | "jolt" | "misread" | "drop";

export type NullFeed = {
  /** The interference that is always there: grain, scanlines, a rolling bar. 0 to 1. */
  ambient: number;
  /** Rows sliding sideways, 0 to 1. */
  tear: number;
  /** Colour channels pulled apart, 0 to 1. */
  split: number;
  /** Static over the picture, 0 to 1. */
  snow: number;
  /** The picture gone, 0 to 1. */
  drop: number;
  /** Hold the last picture instead of a new one. */
  freeze: boolean;
  /** A shake of the drone's view, in radians. */
  jolt: { yaw: number; pitch: number };
  /** Show the room label garbled. */
  misread: boolean;
  /** Changes with each flicker, so a tear lands somewhere new. */
  seed: number;
  /** Signal strength, 0 to 4 bars. */
  bars: number;
  /** The burst that began since the last update, for its sound. */
  began: NullEffect | null;
};

/** Milliseconds between bursts at each level; the drone's feed is touched more often than the console. */
const CADENCE: Record<NullClass, readonly [number, number] | null> = {
  quiet: null,
  trace: [14_000, 26_000],
  elevated: [7_000, 14_000],
  severe: [3_500, 7_500],
};
const AMBIENT: Record<NullClass, number> = { quiet: 0, trace: 0.18, elevated: 0.42, severe: 0.72 };
const BARS: Record<NullClass, number> = { quiet: 4, trace: 3, elevated: 2, severe: 1 };
const WEIGHTS: Record<Exclude<NullClass, "quiet">, readonly [NullEffect, number][]> = {
  trace: [["split", 3], ["snow", 3], ["misread", 2], ["jolt", 1]],
  elevated: [["tear", 3], ["split", 2], ["snow", 2], ["jolt", 2], ["misread", 2], ["freeze", 1]],
  severe: [["tear", 4], ["snow", 2], ["jolt", 2], ["freeze", 2], ["drop", 2], ["misread", 2], ["split", 2]],
};
/** How long each burst lasts, in milliseconds. */
export const NULL_BURST_LENGTH: Record<NullEffect, number> = {
  tear: 320,
  split: 220,
  snow: 420,
  freeze: 260,
  jolt: 320,
  misread: 700,
  drop: 200,
};

type Burst = { effect: NullEffect; start: number; strength: number; seed: number };

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

function pick(weights: readonly [NullEffect, number][], random: () => number) {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [effect, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return effect;
  }
  return weights[0][0];
}

/** How strongly a burst touches the feed this far into it: tears flicker twice, the rest swell and fade. */
function envelope(burst: Burst, t: number) {
  const length = NULL_BURST_LENGTH[burst.effect];
  if (t < 0 || t >= length) return 0;
  if (burst.effect === "tear") return (t < 90 || (t >= 160 && t < 240) || (t >= 280 && burst.strength > 0.7)) ? 1 : 0;
  if (burst.effect === "drop" || burst.effect === "freeze" || burst.effect === "misread") return 1;
  const rise = Math.min(1, t / 50);
  return rise * (1 - t / length);
}

/**
 * The feed for one world's Null. Call update every frame with the time and how exposed
 * the drone is: below 1 near the Law-Heart, above 1 by an open bay.
 */
export function createNullFeed(
  classification: NullClass,
  intensity: number,
  { random = Math.random, reducedMotion = false }: { random?: () => number; reducedMotion?: boolean } = {},
) {
  const strength = clamp(intensity);
  const cadence = reducedMotion ? null : CADENCE[classification];
  const bursts: Burst[] = [];
  let next: number | null = null;
  let previous: number | null = null;

  return {
    update(now: number, exposure = 1): NullFeed {
      const open = clamp(exposure, 0.2, 2);
      if (cadence && classification !== "quiet") {
        const wait = () => (cadence[0] + random() * (cadence[1] - cadence[0])) / open;
        next ??= now + wait() * 0.5;
        if (now >= next) {
          const fire = (start: number, follow = false) => bursts.push({
            // A burst that follows another never blacks the feed out again.
            effect: pick(WEIGHTS[classification].filter(([effect]) => !follow || effect !== "drop"), random),
            start,
            strength: clamp(strength * (0.6 + random() * 0.4) * Math.min(1.3, open)),
            seed: Math.floor(random() * 997),
          });
          fire(now);
          // A bad Null sometimes lands two at once.
          if (classification === "severe" && random() < 0.3) fire(now + 120, true);
          next = now + wait();
        }
      }
      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        if (now - bursts[index].start >= NULL_BURST_LENGTH[bursts[index].effect]) bursts.splice(index, 1);
      }

      const feed: NullFeed = {
        ambient: reducedMotion ? 0 : AMBIENT[classification] * (0.5 + 0.5 * strength) * clamp(open, 0.35, 1.3),
        tear: 0,
        split: 0,
        snow: 0,
        drop: 0,
        freeze: false,
        jolt: { yaw: 0, pitch: 0 },
        misread: false,
        seed: 0,
        bars: BARS[classification],
        began: null,
      };
      for (const burst of bursts) {
        const t = now - burst.start;
        if (t < 0) continue;
        if (previous === null || burst.start > previous) feed.began = burst.effect;
        const amount = envelope(burst, t) * burst.strength;
        feed.bars = Math.max(0, BARS[classification] - 1);
        if (burst.effect === "tear") {
          feed.tear = Math.max(feed.tear, amount);
          feed.seed = burst.seed + (t < 160 ? 0 : t < 280 ? 1 : 2);
        } else if (burst.effect === "split") feed.split = Math.max(feed.split, amount);
        else if (burst.effect === "snow") feed.snow = Math.max(feed.snow, amount);
        else if (burst.effect === "drop") feed.drop = 1;
        else if (burst.effect === "freeze") feed.freeze = true;
        else if (burst.effect === "misread") {
          feed.misread = true;
          feed.seed ||= burst.seed;
        }
        else if (burst.effect === "jolt") {
          const settle = Math.exp(-t / 110);
          feed.jolt = { yaw: Math.sin(t * 0.07 + burst.seed) * 0.03 * burst.strength * settle, pitch: Math.sin(t * 0.09) * 0.015 * burst.strength * settle };
        }
      }
      if (feed.drop > 0) feed.bars = 0;
      previous = now;
      return feed;
    },
  };
}

/** A label as the drone misreads it: some of its letters lost to noise. */
export function misreadLabel(text: string, seed: number) {
  const noise = "▒#%/\\_";
  return [...text].map((character, index) => {
    const roll = Math.abs(Math.sin((seed + 1) * 12.9898 + index * 78.233) * 43758.5453) % 1;
    return character !== " " && roll < 0.3 ? noise[Math.floor(roll * 20) % noise.length] : character;
  }).join("");
}
