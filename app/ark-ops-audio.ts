/*
 * The Extraction simulation's sound. Every footstep, shot, door and voice comes
 * from where it happened, placed around AXIOM's head, and through a wall it
 * arrives quieter and duller: you hear the room next door before you see it. Each
 * kind of thing has its own voice, so you can tell them apart in the dark:
 * Wreckers are boots, radio crackle and muttering; aliens click, breathe and
 * scream; the Hollowed hiss static and whisper as if the words ran backwards.
 */

import type { CarbineForm } from "./arc-carbine";
import { getPulseAudioOutput, getPulseNoise } from "./law-heart-audio";
import { cry, distantCall, echoSpace, hollowMoan, type CryOutput } from "./ark-sim-cries";

export type OpsSound =
  | "boot" | "boot-run" | "creep" | "soft" | "yard" | "skitter" | "drag"
  | "rifle" | "door-open" | "door-shut" | "radio" | "mutter" | "shout"
  | "chitter" | "scream" | "scratch" | "strike" | "whisper" | "skip"
  | "survivor-hurt" | "survivor-voice" | "impact";

export type OpsAudio = {
  /** Where AXIOM's ears are, and which way it faces (forward is (-sin yaw, -cos yaw)). */
  listen(x: number, y: number, z: number, yaw: number): void;
  /** A sound at a place in the building, through this many walls' worth of damping. */
  at(sound: OpsSound, x: number, y: number, z: number, walls: number): void;
  /** A shot from the Arc Carbine: its crack shaped by the firing law, damped by a suppressor. */
  gun(form?: CarbineForm, suppressed?: boolean): void;
  /** The coils venting their heat. */
  vent(): void;
  dry(): void;
  reload(): void;
  pickup(): void;
  hurt(): void;
  death(): void;
  freed(): void;
  alarm(): void;
  extracted(): void;
  failed(): void;
  /** The shuttle idling on its pad, heard from wherever AXIOM is. */
  shuttle(x: number, y: number, z: number, walls: number): void;
  dispose(): void;
};

/** The building's voice on the game's shared output, or null until a press has started audio. */
export function createOpsAudio(): OpsAudio | null {
  const output = getPulseAudioOutput();
  if (!output) return null;
  const { context } = output;
  const bus = context.createGain();
  bus.gain.value = 0.95;
  // Cries are loud and stack up; this keeps a crowd of them from clipping.
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.2;
  bus.connect(limiter).connect(output.master);
  const noise = getPulseNoise(output);
  // The station's corridors: shorter than the jungle's dark, and harder.
  const echo = context.createConvolver();
  echo.buffer = echoSpace(context, 2.4);
  const echoLevel = context.createGain();
  echoLevel.gain.value = 0.42;
  echo.connect(echoLevel).connect(bus);
  /** A creature's voice placed in the building, heard through its walls. */
  const voiceAt = (place: Place, length: number): CryOutput => ({ context, dry: destination(place, context.currentTime, length), wet: echo, noise });
  const timers = new Set<number>();
  let disposed = false;

  /** Where a sound goes: straight to the ears, or placed in the room through its walls. */
  type Place = { x: number; y: number; z: number; walls: number } | null;
  const destination = (place: Place, when: number, length: number): AudioNode => {
    if (!place) return bus;
    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1.6;
    panner.rolloffFactor = 1.1;
    panner.maxDistance = 80;
    panner.positionX.value = place.x;
    panner.positionY.value = place.y;
    panner.positionZ.value = place.z;
    // Through a wall a sound loses its edge first, then its strength.
    const muffle = context.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 16_000 / (1 + place.walls * 6);
    const damp = context.createGain();
    damp.gain.value = Math.pow(0.42, place.walls);
    muffle.connect(damp).connect(panner).connect(bus);
    window.setTimeout(() => muffle.disconnect(), (when - context.currentTime + length + 0.3) * 1000);
    return muffle;
  };
  const envelope = (when: number, peak: number, attack: number, decay: number) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    return gain;
  };
  const voice = (place: Place, options: {
    type: OscillatorType;
    at?: number;
    path: readonly [number, number][];
    peak: number;
    attack: number;
    decay: number;
    warble?: [number, number];
    filter?: [BiquadFilterType, number, number];
  }) => {
    const when = context.currentTime + (options.at ?? 0);
    const length = options.attack + options.decay;
    const oscillator = context.createOscillator();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.path[0][1], when);
    for (const [time, frequency] of options.path.slice(1)) oscillator.frequency.exponentialRampToValueAtTime(frequency, when + time);
    if (options.warble) {
      const lfo = context.createOscillator();
      const depth = context.createGain();
      lfo.frequency.value = options.warble[0];
      depth.gain.value = options.warble[1];
      lfo.connect(depth).connect(oscillator.frequency);
      lfo.start(when);
      lfo.stop(when + length + 0.05);
    }
    let source: AudioNode = oscillator;
    if (options.filter) {
      const filter = context.createBiquadFilter();
      [filter.type, filter.frequency.value, filter.Q.value] = options.filter;
      source.connect(filter);
      source = filter;
    }
    source.connect(envelope(when, options.peak, options.attack, options.decay)).connect(destination(place, when, length));
    oscillator.start(when);
    oscillator.stop(when + length + 0.05);
  };
  const hiss = (place: Place, options: { at?: number; filter: [BiquadFilterType, number, number]; peak: number; attack: number; decay: number }) => {
    const when = context.currentTime + (options.at ?? 0);
    const length = options.attack + options.decay;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    [filter.type, filter.frequency.value, filter.Q.value] = options.filter;
    source.connect(filter).connect(envelope(when, options.peak, options.attack, options.decay)).connect(destination(place, when, length));
    source.start(when, Math.random() * 0.5);
    source.stop(when + length + 0.05);
  };
  /** Syllables of speech with no words: a buzzing voice through two mouth shapes. */
  const speech = (place: Place, pitch: number, syllables: number, loud: number, pace = 0.17) => {
    let at = 0;
    for (let syllable = 0; syllable < syllables; syllable += 1) {
      const length = pace * (0.6 + Math.random() * 0.8);
      const lift = pitch * (0.9 + Math.random() * 0.3);
      const vowel = 500 + Math.random() * 700;
      voice(place, { type: "sawtooth", at, path: [[0, lift], [length, lift * 0.92]], peak: loud, attack: 0.02, decay: length, filter: ["bandpass", vowel, 4] });
      voice(place, { type: "sawtooth", at, path: [[0, lift], [length, lift * 0.92]], peak: loud * 0.6, attack: 0.02, decay: length, filter: ["bandpass", vowel * 2.3, 6] });
      at += length + 0.03 + Math.random() * 0.06;
    }
  };

  const sounds: Record<OpsSound, (place: Place) => void> = {
    boot: (place) => {
      voice(place, { type: "sine", path: [[0, 90], [0.06, 55]], peak: 0.16, attack: 0.003, decay: 0.07 });
      hiss(place, { filter: ["bandpass", 750, 1.2], peak: 0.14, attack: 0.002, decay: 0.06 });
    },
    "boot-run": (place) => {
      voice(place, { type: "sine", path: [[0, 100], [0.06, 55]], peak: 0.24, attack: 0.002, decay: 0.07 });
      hiss(place, { filter: ["bandpass", 900, 1], peak: 0.2, attack: 0.002, decay: 0.07 });
    },
    creep: (place) => hiss(place, { filter: ["bandpass", 1_300, 1.5], peak: 0.035, attack: 0.01, decay: 0.08 }),
    soft: (place) => hiss(place, { filter: ["bandpass", 1_000, 1.2], peak: 0.06, attack: 0.006, decay: 0.07 }),
    yard: (place) => hiss(place, { filter: ["lowpass", 1_600, 0.8], peak: 0.09, attack: 0.004, decay: 0.09 }),
    skitter: (place) => {
      for (let click = 0; click < 3; click += 1) {
        const pitch = 1_900 + Math.random() * 1_400;
        voice(place, { type: "square", at: click * 0.03, path: [[0, pitch], [0.012, pitch * 0.7]], peak: 0.045, attack: 0.001, decay: 0.014 });
      }
      hiss(place, { filter: ["highpass", 3_000, 0.8], peak: 0.03, attack: 0.004, decay: 0.05 });
    },
    drag: (place) => {
      hiss(place, { filter: ["lowpass", 420, 1], peak: 0.09, attack: 0.05, decay: 0.28 });
      hiss(place, { at: 0.12, filter: ["highpass", 4_000, 0.7], peak: 0.02, attack: 0.002, decay: 0.05 });
    },
    rifle: (place) => {
      voice(place, { type: "sine", path: [[0, 130], [0.12, 42]], peak: 0.45, attack: 0.002, decay: 0.16 });
      hiss(place, { filter: ["highpass", 900, 0.7], peak: 0.32, attack: 0.002, decay: 0.1 });
      // The building throws the shot back.
      hiss(place, { at: 0.05, filter: ["lowpass", 1_100, 0.7], peak: 0.07, attack: 0.03, decay: 0.45 });
    },
    "door-open": (place) => {
      voice(place, { type: "sawtooth", path: [[0, 170], [0.45, 330]], peak: 0.05, attack: 0.05, decay: 0.45, filter: ["bandpass", 650, 7] });
      voice(place, { type: "sine", at: 0.4, path: [[0, 95], [0.1, 60]], peak: 0.12, attack: 0.004, decay: 0.12 });
    },
    "door-shut": (place) => {
      voice(place, { type: "sine", path: [[0, 110], [0.1, 50]], peak: 0.22, attack: 0.003, decay: 0.16 });
      voice(place, { type: "square", at: 0.06, path: [[0, 1_400]], peak: 0.03, attack: 0.001, decay: 0.03 });
    },
    radio: (place) => {
      for (let burst = 0; burst < 5; burst += 1) {
        hiss(place, { at: burst * 0.13, filter: ["bandpass", 2_000 + Math.random() * 800, 2], peak: 0.06, attack: 0.01, decay: 0.08 + Math.random() * 0.05 });
      }
      speech(place, 160, 3, 0.02);
      voice(place, { type: "square", at: 0.72, path: [[0, 1_350]], peak: 0.035, attack: 0.002, decay: 0.07 });
    },
    mutter: (place) => speech(place, 105 + Math.random() * 30, 3 + Math.floor(Math.random() * 4), 0.05),
    shout: (place) => speech(place, 175 + Math.random() * 30, 3, 0.11, 0.13),
    chitter: (place) => {
      const count = 6 + Math.floor(Math.random() * 5);
      for (let click = 0; click < count; click += 1) {
        const pitch = 1_700 + Math.random() * 1_500;
        voice(place, { type: "square", at: click * (0.025 + Math.random() * 0.02), path: [[0, pitch], [0.015, pitch * 0.6]], peak: 0.05, attack: 0.001, decay: 0.018 });
      }
      // A wet breath under the clicking.
      hiss(place, { filter: ["bandpass", 380, 2], peak: 0.05, attack: 0.25, decay: 0.45 });
    },
    scream: (place) => cry(voiceAt(place, 3), "stalker", "hunt", 0, 1),
    scratch: (place) => {
      for (let pass = 0; pass < 3; pass += 1) hiss(place, { at: pass * 0.09, filter: ["highpass", 2_600, 1], peak: 0.1, attack: 0.005, decay: 0.06 });
      voice(place, { type: "triangle", path: [[0, 1_900], [0.4, 1_850]], peak: 0.03, attack: 0.003, decay: 0.4 });
    },
    strike: (place) => {
      hiss(place, { filter: ["bandpass", 1_300, 2], peak: 0.12, attack: 0.004, decay: 0.1 });
      voice(place, { type: "sine", at: 0.04, path: [[0, 90], [0.1, 50]], peak: 0.16, attack: 0.003, decay: 0.1 });
    },
    whisper: (place) => {
      // A groan that was a voice once, under breath through changing mouth shapes run backwards.
      hollowMoan(voiceAt(place, 3.4), 0);
      let at = 0;
      for (let syllable = 0; syllable < 4; syllable += 1) {
        const length = 0.18 + Math.random() * 0.2;
        hiss(place, { at, filter: ["bandpass", 900 + Math.random() * 1_600, 5], peak: 0.07, attack: length, decay: 0.03 });
        at += length + 0.04;
      }
      hiss(place, { at: at * 0.5, filter: ["highpass", 3_500, 0.7], peak: 0.025, attack: 0.002, decay: at * 0.6 });
    },
    skip: (place) => {
      for (let blip = 0; blip < 3; blip += 1) {
        voice(place, { type: "square", at: blip * 0.035, path: [[0, 200 + Math.random() * 1_800]], peak: 0.05, attack: 0.001, decay: 0.022 });
      }
      hiss(place, { filter: ["highpass", 2_500, 0.7], peak: 0.07, attack: 0.002, decay: 0.12 });
    },
    "survivor-hurt": (place) => voice(place, { type: "sawtooth", path: [[0, 300], [0.25, 190]], peak: 0.08, attack: 0.01, decay: 0.25, filter: ["bandpass", 850, 3] }),
    "survivor-voice": (place) => speech(place, 210 + Math.random() * 40, 2, 0.05, 0.15),
    impact: (place) => hiss(place, { filter: ["bandpass", 2_400, 1.5], peak: 0.08, attack: 0.002, decay: 0.05 }),
  };

  // The building breathing: wind through the broken windows, and water dripping somewhere.
  const wind = context.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  const windFilter = context.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 380;
  const windGain = context.createGain();
  windGain.gain.value = 0.03;
  wind.connect(windFilter).connect(windGain).connect(bus);
  wind.start();
  const later = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) callback();
    }, delay);
    timers.add(id);
  };
  // Somewhere below, something that is not in this building at all.
  const farCall = () => {
    distantCall({ context, dry: bus, wet: echo, noise }, (Math.random() * 2 - 1) * 0.7, 0.45 + Math.random() * 0.3);
    later(farCall, 34_000 + Math.random() * 40_000);
  };
  later(farCall, 14_000 + Math.random() * 12_000);
  const drip = () => {
    const pitch = 1_500 + Math.random() * 900;
    voice(null, { type: "sine", path: [[0, pitch], [0.06, pitch * 0.55]], peak: 0.012, attack: 0.002, decay: 0.08 });
    later(drip, 1_800 + Math.random() * 4_000);
  };
  later(drip, 1_200);

  // The shuttle's engines idle on the pad: a loop the listener walks towards and away from.
  const engine = context.createBufferSource();
  engine.buffer = noise;
  engine.loop = true;
  const engineFilter = context.createBiquadFilter();
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = 260;
  const engineGain = context.createGain();
  engineGain.gain.value = 0.18;
  const enginePanner = context.createPanner();
  enginePanner.panningModel = "HRTF";
  enginePanner.distanceModel = "inverse";
  enginePanner.refDistance = 3;
  enginePanner.rolloffFactor = 1.2;
  engine.connect(engineFilter).connect(engineGain).connect(enginePanner).connect(bus);
  engine.start();

  return {
    listen(x, y, z, yaw) {
      const listener = context.listener;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      if (listener.positionX) {
        listener.positionX.value = x;
        listener.positionY.value = y;
        listener.positionZ.value = z;
        listener.forwardX.value = forwardX;
        listener.forwardY.value = 0;
        listener.forwardZ.value = forwardZ;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
      } else {
        listener.setPosition(x, y, z);
        listener.setOrientation(forwardX, 0, forwardZ, 0, 1, 0);
      }
    },
    at(sound, x, y, z, walls) {
      sounds[sound]({ x, y, z, walls });
    },
    gun(form = "conservation", suppressed = false) {
      // The Arc Carbine: the discharge's crack and zap as its firing law shapes it, and the room ringing after.
      const loud = suppressed ? 0.35 : 1;
      if (form === "containment") {
        voice(null, { type: "sine", path: [[0, 110], [0.25, 32]], peak: 0.34 * loud, attack: 0.004, decay: 0.3 });
        voice(null, { type: "sawtooth", path: [[0, 2_600], [0.22, 160]], peak: 0.07 * loud, attack: 0.002, decay: 0.24, filter: ["bandpass", 1_400, 1.4] });
        hiss(null, { filter: ["highpass", 900, 0.7], peak: 0.14 * loud, attack: 0.002, decay: 0.18 });
      } else if (form === "transit") {
        hiss(null, { filter: ["bandpass", 1_800, 0.6], peak: 0.2 * loud, attack: 0.002, decay: 0.16 });
        for (const at of [0, 0.02, 0.045]) voice(null, { type: "sawtooth", at, path: [[0, 1_400 + at * 8_000], [0.05, 240]], peak: 0.035 * loud, attack: 0.002, decay: 0.06, filter: ["bandpass", 1_300, 2] });
        voice(null, { type: "sine", path: [[0, 130], [0.12, 40]], peak: 0.26 * loud, attack: 0.003, decay: 0.14 });
      } else {
        voice(null, { type: "sine", path: [[0, 150], [0.1, 45]], peak: 0.3 * loud, attack: 0.003, decay: 0.12 });
        hiss(null, { filter: ["highpass", 1_200, 0.7], peak: 0.12 * loud, attack: 0.002, decay: 0.07 });
        voice(null, { type: "sawtooth", path: [[0, 1_800], [0.06, 300]], peak: 0.06 * loud, attack: 0.002, decay: 0.07, filter: ["bandpass", 1_500, 2] });
      }
      hiss(null, { at: 0.04, filter: ["lowpass", 1_000, 0.7], peak: 0.05 * loud, attack: 0.03, decay: 0.4 });
    },
    vent() {
      hiss(null, { filter: ["lowpass", 2_400, 0.7], peak: 0.09, attack: 0.03, decay: 1.4 });
      voice(null, { type: "triangle", path: [[0, 700], [1.2, 220]], peak: 0.03, attack: 0.02, decay: 1.3 });
    },
    dry() {
      voice(null, { type: "square", path: [[0, 900], [0.01, 700]], peak: 0.05, attack: 0.001, decay: 0.02 });
    },
    reload() {
      for (const at of [0.05, 0.45, 1.3]) hiss(null, { at, filter: ["bandpass", 2_600, 4], peak: 0.09, attack: 0.002, decay: 0.05 });
      voice(null, { type: "triangle", at: 1.3, path: [[0, 520], [0.08, 760]], peak: 0.05, attack: 0.005, decay: 0.12 });
    },
    pickup() {
      voice(null, { type: "triangle", path: [[0, 660]], peak: 0.07, attack: 0.005, decay: 0.1 });
      voice(null, { type: "triangle", at: 0.09, path: [[0, 990]], peak: 0.07, attack: 0.005, decay: 0.18 });
    },
    hurt() {
      voice(null, { type: "sine", path: [[0, 95], [0.15, 48]], peak: 0.3, attack: 0.004, decay: 0.2 });
      hiss(null, { filter: ["lowpass", 800, 1], peak: 0.12, attack: 0.004, decay: 0.18 });
      hiss(null, { filter: ["highpass", 3_000, 0.7], peak: 0.05, attack: 0.002, decay: 0.12 });
    },
    death() {
      voice(null, { type: "sawtooth", path: [[0, 420], [1.4, 50]], peak: 0.14, attack: 0.02, decay: 1.4, filter: ["lowpass", 1_400, 1] });
      hiss(null, { filter: ["highpass", 1_800, 0.7], peak: 0.1, attack: 0.02, decay: 1.2 });
    },
    freed() {
      for (const [at, pitch] of [[0, 523], [0.12, 659], [0.24, 784]] as const) voice(null, { type: "triangle", at, path: [[0, pitch]], peak: 0.05, attack: 0.01, decay: 0.3 });
    },
    alarm() {
      // A low stab under the shouting: they know you are here.
      for (const [at, pitch] of [[0, 147], [0.18, 139]] as const) {
        voice(null, { type: "sawtooth", at, path: [[0, pitch]], peak: 0.08, attack: 0.01, decay: 0.5, filter: ["lowpass", 700, 1] });
      }
    },
    extracted() {
      for (const [at, pitch] of [[0, 392], [0.16, 523], [0.32, 659], [0.48, 784]] as const) voice(null, { type: "triangle", at, path: [[0, pitch]], peak: 0.06, attack: 0.01, decay: 0.45 });
    },
    failed() {
      for (const [at, pitch] of [[0, 330], [0.25, 262], [0.5, 196]] as const) voice(null, { type: "triangle", at, path: [[0, pitch]], peak: 0.06, attack: 0.01, decay: 0.5 });
    },
    shuttle(x, y, z, walls) {
      enginePanner.positionX.value = x;
      enginePanner.positionY.value = y;
      enginePanner.positionZ.value = z;
      engineFilter.frequency.value = 260 / (1 + walls * 2);
      engineGain.gain.value = 0.18 * Math.pow(0.5, walls);
    },
    dispose() {
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      for (const loop of [wind, engine]) {
        try {
          loop.stop();
        } catch {
          // Already stopped.
        }
      }
      bus.disconnect();
    },
  };
}
