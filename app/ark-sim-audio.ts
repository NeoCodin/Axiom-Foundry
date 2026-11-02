/*
 * The combat simulation's sound, synthesized like the rest of the game's: the
 * training carbine's crack and zap, its click when empty and the clack of a
 * reload; each kind of alien's own scream (a stalker's rising shriek, a
 * spitter's gurgle, a brute's roar), their strikes and their dying; a hit taken,
 * a pickup, a new wave, and the jungle itself breathing with insects and far
 * birds. Sounds are placed left or right and fade with distance by the caller.
 */

import { getPulseAudioOutput, getPulseNoise } from "./law-heart-audio";
import type { AlienKind } from "./ark-sim-rules";

export type SimAudio = {
  gun(): void;
  dry(): void;
  reload(): void;
  pickup(): void;
  jump(): void;
  /** Feet back on the ground; strength 0 to 1 by how hard. */
  land(strength: number): void;
  wave(): void;
  hurt(): void;
  death(): void;
  scream(kind: AlienKind, pan: number, gain: number): void;
  strike(kind: AlienKind, pan: number, gain: number): void;
  kill(kind: AlienKind, pan: number, gain: number): void;
  spit(pan: number, gain: number): void;
  dispose(): void;
};

/** The simulation's voice on the game's shared output, or null until a press has started audio. */
export function createSimAudio(): SimAudio | null {
  const output = getPulseAudioOutput();
  if (!output) return null;
  const { context } = output;
  const bus = context.createGain();
  bus.gain.value = 0.9;
  bus.connect(output.master);
  const noise = getPulseNoise(output);
  const timers = new Set<number>();
  let disposed = false;

  const envelope = (when: number, peak: number, attack: number, decay: number) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    return gain;
  };
  const place = (node: AudioNode, pan: number) => {
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(panner).connect(bus);
  };
  /** A pitched voice gliding through up to three points, optionally warbled and filtered. */
  const voice = (options: {
    type: OscillatorType;
    at?: number;
    path: readonly [number, number][];
    peak: number;
    attack: number;
    decay: number;
    pan?: number;
    warble?: [number, number];
    filter?: [BiquadFilterType, number, number];
  }) => {
    const when = context.currentTime + (options.at ?? 0);
    const oscillator = context.createOscillator();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.path[0][1], when);
    for (const [time, frequency] of options.path.slice(1)) oscillator.frequency.exponentialRampToValueAtTime(frequency, when + time);
    let source: AudioNode = oscillator;
    if (options.warble) {
      const lfo = context.createOscillator();
      const depth = context.createGain();
      lfo.frequency.value = options.warble[0];
      depth.gain.value = options.warble[1];
      lfo.connect(depth).connect(oscillator.frequency);
      lfo.start(when);
      lfo.stop(when + options.attack + options.decay + 0.05);
    }
    if (options.filter) {
      const filter = context.createBiquadFilter();
      [filter.type, filter.frequency.value, filter.Q.value] = options.filter;
      source.connect(filter);
      source = filter;
    }
    const gain = envelope(when, options.peak, options.attack, options.decay);
    source.connect(gain);
    place(gain, options.pan ?? 0);
    oscillator.start(when);
    oscillator.stop(when + options.attack + options.decay + 0.05);
  };
  /** A burst of filtered noise. */
  const hiss = (options: { at?: number; filter: [BiquadFilterType, number, number]; peak: number; attack: number; decay: number; pan?: number }) => {
    const when = context.currentTime + (options.at ?? 0);
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    [filter.type, filter.frequency.value, filter.Q.value] = options.filter;
    const gain = envelope(when, options.peak, options.attack, options.decay);
    source.connect(filter).connect(gain);
    place(gain, options.pan ?? 0);
    source.start(when, Math.random() * 0.5);
    source.stop(when + options.attack + options.decay + 0.05);
  };

  const scream = (kind: AlienKind, pan: number, gain: number, dying = false) => {
    if (gain < 0.02) return;
    const scale = dying ? 0.8 : 1;
    if (kind === "stalker") {
      // A shriek that climbs and breaks.
      voice({
        type: "sawtooth", path: dying ? [[0, 1300], [0.4, 260]] : [[0, 520], [0.12, 1350], [0.55, 700]],
        peak: 0.11 * gain, attack: 0.02, decay: dying ? 0.4 : 0.55, pan, warble: [28, 80], filter: ["bandpass", 1400, 3],
      });
      hiss({ filter: ["bandpass", 2200, 2], peak: 0.05 * gain * scale, attack: 0.01, decay: 0.3, pan });
    } else if (kind === "spitter") {
      // A wet, warbling gurgle.
      voice({
        type: "square", path: dying ? [[0, 500], [0.35, 120]] : [[0, 260], [0.15, 520], [0.45, 300]],
        peak: 0.07 * gain, attack: 0.02, decay: 0.45, pan, warble: [14, 120], filter: ["bandpass", 900, 5],
      });
      hiss({ filter: ["bandpass", 700, 3], peak: 0.04 * gain, attack: 0.02, decay: 0.35, pan });
    } else {
      // A roar from deep in the chest.
      voice({
        type: "sawtooth", path: dying ? [[0, 140], [0.8, 40]] : [[0, 110], [0.3, 130], [0.8, 72]],
        peak: 0.16 * gain, attack: 0.05, decay: 0.85, pan, warble: [9, 10], filter: ["lowpass", 700, 1],
      });
      voice({ type: "square", path: [[0, 55], [0.8, 40]], peak: 0.07 * gain, attack: 0.05, decay: 0.8, pan, filter: ["lowpass", 300, 1] });
      hiss({ filter: ["lowpass", 450, 1], peak: 0.07 * gain, attack: 0.05, decay: 0.7, pan });
    }
  };

  // The jungle: wind in the leaves, insects in bursts, now and then a far bird.
  const wind = context.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  const leaves = context.createBiquadFilter();
  leaves.type = "lowpass";
  leaves.frequency.value = 520;
  const windGain = context.createGain();
  windGain.gain.value = 0.035;
  wind.connect(leaves).connect(windGain).connect(bus);
  wind.start();
  const later = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) callback();
    }, delay);
    timers.add(id);
  };
  const chirp = () => {
    const pan = Math.random() * 2 - 1;
    if (Math.random() < 0.7) {
      const pitch = 3200 + Math.random() * 2400;
      for (let pip = 0; pip < 3 + Math.floor(Math.random() * 4); pip += 1) {
        voice({ type: "sine", at: pip * 0.07, path: [[0, pitch], [0.05, pitch * 0.92]], peak: 0.012, attack: 0.005, decay: 0.05, pan });
      }
    } else {
      const pitch = 900 + Math.random() * 500;
      voice({ type: "triangle", path: [[0, pitch], [0.18, pitch * 1.5], [0.4, pitch * 0.8]], peak: 0.02, attack: 0.03, decay: 0.4, pan });
    }
    later(chirp, 1_500 + Math.random() * 3_500);
  };
  later(chirp, 800);

  return {
    gun() {
      // The training carbine: a crack, a thump, and the arc's zap.
      voice({ type: "sine", path: [[0, 150], [0.1, 45]], peak: 0.3, attack: 0.003, decay: 0.12 });
      hiss({ filter: ["highpass", 1_200, 0.7], peak: 0.12, attack: 0.002, decay: 0.07 });
      voice({ type: "sawtooth", path: [[0, 1_800], [0.06, 300]], peak: 0.05, attack: 0.002, decay: 0.07, filter: ["bandpass", 1_500, 2] });
    },
    dry() {
      voice({ type: "square", path: [[0, 900], [0.01, 700]], peak: 0.05, attack: 0.001, decay: 0.02 });
    },
    reload() {
      for (const at of [0.05, 0.45, 1.3]) hiss({ at, filter: ["bandpass", 2_600, 4], peak: 0.09, attack: 0.002, decay: 0.05 });
      voice({ type: "triangle", at: 1.3, path: [[0, 520], [0.08, 760]], peak: 0.05, attack: 0.005, decay: 0.12 });
    },
    pickup() {
      voice({ type: "triangle", path: [[0, 660]], peak: 0.07, attack: 0.005, decay: 0.1 });
      voice({ type: "triangle", at: 0.09, path: [[0, 990]], peak: 0.07, attack: 0.005, decay: 0.18 });
    },
    jump() {
      // The sim-body's push off: a short rising breath of air.
      hiss({ filter: ["bandpass", 1_100, 1.5], peak: 0.035, attack: 0.01, decay: 0.12 });
      voice({ type: "sine", path: [[0, 180], [0.1, 260]], peak: 0.04, attack: 0.005, decay: 0.1 });
    },
    land(strength) {
      voice({ type: "sine", path: [[0, 110], [0.12, 45]], peak: 0.1 + strength * 0.14, attack: 0.003, decay: 0.14 });
      hiss({ filter: ["lowpass", 600, 1], peak: 0.04 + strength * 0.06, attack: 0.003, decay: 0.12 });
    },
    wave() {
      for (const [at, pitch] of [[0, 440], [0.22, 660], [0.44, 440], [0.66, 660]] as const) {
        voice({ type: "triangle", at, path: [[0, pitch]], peak: 0.06, attack: 0.01, decay: 0.18 });
      }
    },
    hurt() {
      // A blow, and the simulation's static where it lands.
      voice({ type: "sine", path: [[0, 95], [0.15, 48]], peak: 0.3, attack: 0.004, decay: 0.2 });
      hiss({ filter: ["lowpass", 800, 1], peak: 0.12, attack: 0.004, decay: 0.18 });
      hiss({ filter: ["highpass", 3_000, 0.7], peak: 0.05, attack: 0.002, decay: 0.12 });
    },
    death() {
      voice({ type: "sawtooth", path: [[0, 420], [1.4, 50]], peak: 0.14, attack: 0.02, decay: 1.4, filter: ["lowpass", 1_400, 1] });
      hiss({ filter: ["highpass", 1_800, 0.7], peak: 0.1, attack: 0.02, decay: 1.2 });
    },
    scream: (kind, pan, gain) => scream(kind, pan, gain),
    strike(kind, pan, gain) {
      hiss({ filter: ["bandpass", kind === "brute" ? 500 : 1_300, 2], peak: 0.1 * gain, attack: 0.004, decay: 0.12, pan });
    },
    kill(kind, pan, gain) {
      scream(kind, pan, gain, true);
      // The simulation takes it apart: a falling arpeggio of squares.
      [880, 587, 440, 294].forEach((pitch, step) => {
        voice({ type: "square", at: step * 0.05, path: [[0, pitch]], peak: 0.03 * gain, attack: 0.003, decay: 0.06, pan });
      });
    },
    spit(pan, gain) {
      voice({ type: "sine", path: [[0, 320], [0.15, 110]], peak: 0.12 * gain, attack: 0.005, decay: 0.16, pan });
      hiss({ filter: ["bandpass", 650, 3], peak: 0.06 * gain, attack: 0.005, decay: 0.15, pan });
    },
    dispose() {
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      try {
        wind.stop();
      } catch {
        // Already stopped.
      }
      bus.disconnect();
    },
  };
}
