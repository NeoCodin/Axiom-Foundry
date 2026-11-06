/*
 * The combat simulation's sound, synthesized like the rest of the game's: the
 * training carbine's crack and zap, its click when empty and the clack of a
 * reload; each creature's cries (ark-sim-cries.ts), their strikes and their dying;
 * a hit taken, a pickup, a new wave, and the jungle itself, breathing with insects
 * until something big arrives and it goes quiet, with calls far off from things
 * never seen. Sounds are placed left or right and fade with distance by the caller.
 */

import { getPulseAudioOutput, getPulseNoise } from "./law-heart-audio";
import { cry, distantCall, echoSpace, type CryOutput } from "./ark-sim-cries";
import type { CarbineForm } from "./arc-carbine";
import type { AlienKind } from "./ark-sim-rules";

export type SimAudio = {
  /** A shot from the Arc Carbine: its crack shaped by the firing law, damped by a suppressor. */
  gun(form?: CarbineForm, suppressed?: boolean): void;
  /** The coils venting their heat. */
  vent(): void;
  /** The movement kit: a dash's rush, a slide, a slam (0 to 2 by how far it fell), the fist, a parry, a blow dodged, the tether's snap. */
  dash(): void;
  slide(): void;
  slam(strength: number): void;
  punch(): void;
  parry(): void;
  dodged(): void;
  tether(): void;
  /** Transit thrusters, held: 1 burning, 0 off. */
  thrust(level: number): void;
  /** A kill's Flux soaking into the cell; a shot landing on the beat; the Law-Heart's beat itself; a new firing law. */
  flux(): void;
  resonant(): void;
  beat(): void;
  law(): void;
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
  /** Something very big has come: the jungle goes silent, and it calls. */
  arrival(pan: number): void;
  spit(pan: number, gain: number): void;
  /** A harrier's bolt leaving it, and bursting on the ground. */
  bolt(pan: number, gain: number): void;
  blast(pan: number, gain: number): void;
  dispose(): void;
};

/** The simulation's voice on the game's shared output, or null until a press has started audio. */
export function createSimAudio(): SimAudio | null {
  const output = getPulseAudioOutput();
  if (!output) return null;
  const { context } = output;
  const bus = context.createGain();
  bus.gain.value = 0.9;
  // Cries are loud and stack up; this keeps a crowd of them from clipping.
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.2;
  bus.connect(limiter).connect(output.master);
  const noise = getPulseNoise(output);
  const echo = context.createConvolver();
  echo.buffer = echoSpace(context);
  const echoLevel = context.createGain();
  echoLevel.gain.value = 0.45;
  echo.connect(echoLevel).connect(bus);
  const cries: CryOutput = { context, dry: bus, wet: echo, noise };
  let lastCry = 0;
  let hushUntil = 0;
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

  /** One creature at a time gets to be heard clearly: a crowd would only be a wall of noise. */
  const scream = (kind: AlienKind, pan: number, gain: number, dying = false) => {
    if (gain < 0.02) return;
    const now = context.currentTime;
    if (!dying && now - lastCry < 0.28) return;
    lastCry = now;
    cry(cries, kind, dying ? "die" : "hunt", pan, Math.min(1, gain * 1.1));
  };

  // The jungle: wind in the leaves, insects in bursts, now and then a far bird, until it stops.
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
  // The thrusters' roar, kept running and opened only while they burn.
  const roar = context.createBufferSource();
  roar.buffer = noise;
  roar.loop = true;
  const roarFilter = context.createBiquadFilter();
  roarFilter.type = "bandpass";
  roarFilter.frequency.value = 900;
  roarFilter.Q.value = 0.6;
  const roarGain = context.createGain();
  roarGain.gain.value = 0;
  roar.connect(roarFilter).connect(roarGain).connect(bus);
  roar.start();
  let roaring = 0;
  const later = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) callback();
    }, delay);
    timers.add(id);
  };
  const chirp = () => {
    const pan = Math.random() * 2 - 1;
    if (context.currentTime < hushUntil) {
      later(chirp, 800);
      return;
    }
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
  // Far off, now and then, something is calling. Nothing ever comes of it.
  const farCall = () => {
    distantCall(cries, (Math.random() * 2 - 1) * 0.8, 0.7 + Math.random() * 0.5);
    later(farCall, 24_000 + Math.random() * 30_000);
  };
  later(farCall, 9_000 + Math.random() * 8_000);

  return {
    gun(form = "conservation", suppressed = false) {
      // The Arc Carbine: the discharge's crack and zap, as its firing law shapes it.
      const loud = suppressed ? 0.35 : 1;
      if (form === "containment") {
        voice({ type: "sine", path: [[0, 110], [0.25, 32]], peak: 0.34 * loud, attack: 0.004, decay: 0.3 });
        voice({ type: "sawtooth", path: [[0, 2_600], [0.22, 160]], peak: 0.07 * loud, attack: 0.002, decay: 0.24, filter: ["bandpass", 1_400, 1.4] });
        hiss({ filter: ["highpass", 900, 0.7], peak: 0.14 * loud, attack: 0.002, decay: 0.18 });
      } else if (form === "transit") {
        hiss({ filter: ["bandpass", 1_800, 0.6], peak: 0.2 * loud, attack: 0.002, decay: 0.16 });
        for (const at of [0, 0.02, 0.045]) voice({ type: "sawtooth", at, path: [[0, 1_400 + at * 8_000], [0.05, 240]], peak: 0.035 * loud, attack: 0.002, decay: 0.06, filter: ["bandpass", 1_300, 2] });
        voice({ type: "sine", path: [[0, 130], [0.12, 40]], peak: 0.26 * loud, attack: 0.003, decay: 0.14 });
      } else {
        voice({ type: "sine", path: [[0, 150], [0.1, 45]], peak: 0.3 * loud, attack: 0.003, decay: 0.12 });
        hiss({ filter: ["highpass", 1_200, 0.7], peak: 0.12 * loud, attack: 0.002, decay: 0.07 });
        voice({ type: "sawtooth", path: [[0, 1_800], [0.06, 300]], peak: 0.06 * loud, attack: 0.002, decay: 0.07, filter: ["bandpass", 1_500, 2] });
      }
    },
    dash() {
      hiss({ filter: ["bandpass", 1_200, 1], peak: 0.09, attack: 0.01, decay: 0.18 });
      voice({ type: "sine", path: [[0, 230], [0.15, 110]], peak: 0.05, attack: 0.005, decay: 0.16 });
    },
    slide() {
      hiss({ filter: ["lowpass", 900, 0.7], peak: 0.05, attack: 0.02, decay: 0.4 });
    },
    slam(strength) {
      const hard = Math.min(1, strength / 1.4);
      voice({ type: "sine", path: [[0, 95], [0.35, 30]], peak: 0.32 * hard, attack: 0.004, decay: 0.42 });
      hiss({ filter: ["lowpass", 500, 0.7], peak: 0.16 * hard, attack: 0.005, decay: 0.5 });
    },
    punch() {
      voice({ type: "square", path: [[0, 170], [0.06, 70]], peak: 0.1, attack: 0.002, decay: 0.08, filter: ["lowpass", 900, 1] });
      hiss({ filter: ["highpass", 1_800, 0.7], peak: 0.05, attack: 0.002, decay: 0.05 });
    },
    parry() {
      // Acid sent back the way it came: a bright ring.
      voice({ type: "triangle", path: [[0, 1_400], [0.2, 2_100]], peak: 0.08, attack: 0.003, decay: 0.28 });
      voice({ type: "sine", at: 0.02, path: [[0, 700]], peak: 0.05, attack: 0.005, decay: 0.3 });
    },
    dodged() {
      hiss({ filter: ["highpass", 3_000, 0.7], peak: 0.04, attack: 0.005, decay: 0.12 });
    },
    tether() {
      voice({ type: "sawtooth", path: [[0, 300], [0.12, 1_200]], peak: 0.05, attack: 0.003, decay: 0.15, filter: ["bandpass", 900, 2] });
      hiss({ filter: ["bandpass", 2_400, 2], peak: 0.04, attack: 0.002, decay: 0.1 });
    },
    thrust(level) {
      if (level === roaring) return;
      roaring = level;
      roarGain.gain.setTargetAtTime(level * 0.07, context.currentTime, 0.04);
    },
    flux() {
      voice({ type: "sine", path: [[0, 880], [0.12, 1_320]], peak: 0.03, attack: 0.005, decay: 0.15 });
    },
    resonant() {
      voice({ type: "triangle", path: [[0, 520], [0.18, 780]], peak: 0.05, attack: 0.005, decay: 0.22 });
    },
    beat() {
      // The Law-Heart, faint under the jungle: lub, then dub.
      voice({ type: "sine", path: [[0, 72], [0.1, 58]], peak: 0.06, attack: 0.006, decay: 0.12 });
      voice({ type: "sine", at: 0.19, path: [[0, 60], [0.1, 50]], peak: 0.04, attack: 0.006, decay: 0.12 });
    },
    law() {
      voice({ type: "square", path: [[0, 600]], peak: 0.03, attack: 0.002, decay: 0.05, filter: ["lowpass", 2_000, 1] });
      voice({ type: "square", at: 0.06, path: [[0, 900]], peak: 0.03, attack: 0.002, decay: 0.05, filter: ["lowpass", 2_000, 1] });
    },
    vent() {
      // The coils dump their heat: a long hiss and a falling whine.
      hiss({ filter: ["lowpass", 2_400, 0.7], peak: 0.09, attack: 0.03, decay: 1.4 });
      voice({ type: "triangle", path: [[0, 700], [1.2, 220]], peak: 0.03, attack: 0.02, decay: 1.3 });
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
      // The simulation takes it apart, quietly, under the cry.
      [880, 587, 440, 294].forEach((pitch, step) => {
        voice({ type: "square", at: 0.25 + step * 0.05, path: [[0, pitch]], peak: 0.012 * gain, attack: 0.003, decay: 0.06, pan });
      });
    },
    arrival(pan) {
      hushUntil = context.currentTime + 11;
      windGain.gain.setTargetAtTime(0.012, context.currentTime, 0.4);
      windGain.gain.setTargetAtTime(0.035, context.currentTime + 11, 2);
      distantCall(cries, pan, 2.2);
    },
    spit(pan, gain) {
      voice({ type: "sine", path: [[0, 320], [0.15, 110]], peak: 0.12 * gain, attack: 0.005, decay: 0.16, pan });
      hiss({ filter: ["bandpass", 650, 3], peak: 0.06 * gain, attack: 0.005, decay: 0.15, pan });
    },
    bolt(pan, gain) {
      voice({ type: "sawtooth", path: [[0, 2_400], [0.5, 340]], peak: 0.07 * gain, attack: 0.01, decay: 0.5, pan, filter: ["bandpass", 1_500, 3] });
      hiss({ filter: ["highpass", 2_600, 0.8], peak: 0.05 * gain, attack: 0.005, decay: 0.3, pan });
    },
    blast(pan, gain) {
      voice({ type: "sine", path: [[0, 120], [0.3, 38]], peak: 0.3 * gain, attack: 0.004, decay: 0.34, pan });
      hiss({ filter: ["lowpass", 1_400, 0.8], peak: 0.15 * gain, attack: 0.004, decay: 0.3, pan });
    },
    dispose() {
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      try {
        wind.stop();
        roar.stop();
      } catch {
        // Already stopped.
      }
      bus.disconnect();
    },
  };
}
