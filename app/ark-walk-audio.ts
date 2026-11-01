import { getPulseAudioOutput, getPulseNoise } from "./law-heart-audio.ts";

/*
 * The drone view's soundscape. Every room has its own sound, placed where it comes
 * from: louder as the drone nears it, panned left or right as it turns, muffled
 * from the other deck. All of it is synthesized on the game's shared audio output,
 * so the one Sound toggle covers it and nothing is downloaded.
 */

export type SoundKind = "press" | "conveyor" | "star" | "tanks" | "fan" | "servers" | "helm" | "mess" | "bay";

export type SoundPlace = {
  kind: SoundKind;
  x: number;
  y: number;
  z: number;
  /** The deck it is on; null for the core, which spans both. */
  deck: number | null;
  /** A dormant room is quiet. */
  online: boolean;
};

/** What the launch bay is doing, read every frame. */
export type BaySound = {
  alarm: boolean;
  venting: boolean;
  /** 0 idle to 1 full burn. */
  engines: number;
  ship: { x: number; y: number; z: number } | null;
};

export type SoundListener = { x: number; y: number; z: number; yaw: number; deck: number; speed: number };

type Voice = {
  /** Where it is heard from right now. */
  at: () => { x: number; y: number; z: number } | null;
  deck: number | null;
  radius: number;
  input: GainNode;
  gain: GainNode;
  pan: StereoPannerNode;
  level: number;
  /** Called every frame with the audio clock, to schedule one-off sounds or follow state. */
  tick?: (now: number) => void;
};

/** How far each kind carries, in metres, and how loud it is at its source. */
const REACH: Record<SoundKind, { radius: number; level: number }> = {
  press: { radius: 16, level: 0.9 },
  conveyor: { radius: 10, level: 0.6 },
  star: { radius: 24, level: 1 },
  tanks: { radius: 12, level: 0.8 },
  fan: { radius: 12, level: 0.7 },
  servers: { radius: 11, level: 0.8 },
  helm: { radius: 12, level: 0.8 },
  mess: { radius: 12, level: 0.9 },
  bay: { radius: 26, level: 1 },
};

/**
 * How a sound at `at` reaches the drone: loudness falling to nothing at `radius`, much
 * quieter through a deck's floor, and panned toward the side it is on.
 */
export function hearing(
  listener: SoundListener,
  at: { x: number; y: number; z: number },
  deck: number | null,
  radius: number,
  sourceLevel: number,
) {
  const dx = at.x - listener.x;
  const dz = at.z - listener.z;
  const near = Math.max(0, 1 - Math.hypot(dx, at.y - listener.y, dz) / radius);
  const muffled = deck !== null && deck !== listener.deck ? 0.15 : 1;
  const flat = Math.hypot(dx, dz);
  // The drone's right hand points along (sin yaw, cos yaw), matching how it strafes.
  const across = flat > 0.5 ? (dx * Math.sin(listener.yaw) + dz * Math.cos(listener.yaw)) / flat : 0;
  return { gain: near * near * sourceLevel * muffled, pan: Math.max(-0.85, Math.min(0.85, across * 0.85)) };
}

export type Soundscape = {
  update: (listener: SoundListener) => void;
  /** Riding a grav-lift: a rising or falling rush of air. */
  lift: (up: boolean) => void;
  dispose: () => void;
};

/** Build the soundscape once audio is running; returns null until then. */
export function createSoundscape(places: readonly SoundPlace[], bay: () => BaySound): Soundscape | null {
  const output = getPulseAudioOutput();
  if (!output) return null;
  const { context } = output;
  const bus = context.createGain();
  bus.gain.value = 0;
  bus.gain.setTargetAtTime(1, context.currentTime, 0.6);
  bus.connect(output.master);
  const stoppers: (() => void)[] = [];
  const voices: Voice[] = [];

  const loopNoise = () => {
    const source = context.createBufferSource();
    source.buffer = getPulseNoise(output);
    source.loop = true;
    source.start(context.currentTime, Math.random());
    stoppers.push(() => source.stop());
    return source;
  };
  const oscillator = (type: OscillatorType, frequency: number) => {
    const node = context.createOscillator();
    node.type = type;
    node.frequency.value = frequency;
    node.start();
    stoppers.push(() => node.stop());
    return node;
  };
  const filter = (type: BiquadFilterType, frequency: number, q = 0.8) => {
    const node = context.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    return node;
  };
  const level = (value: number) => {
    const node = context.createGain();
    node.gain.value = value;
    return node;
  };
  /** A slow wobble on a gain: base plus depth times a sine at rate Hz. */
  const wobble = (target: GainNode, rate: number, depth: number) => {
    const lfo = oscillator("sine", rate);
    const amount = level(depth);
    lfo.connect(amount).connect(target.gain);
  };
  /** A short pitched blip into a voice, at an audio-clock time. */
  const blip = (into: AudioNode, when: number, type: OscillatorType, from: number, to: number, peak: number, decay: number) => {
    const node = context.createOscillator();
    node.type = type;
    node.frequency.setValueAtTime(from, when);
    node.frequency.exponentialRampToValueAtTime(to, when + decay * 0.6);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(peak, when + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    node.connect(envelope).connect(into);
    node.start(when);
    node.stop(when + decay + 0.02);
  };
  const voice = (at: Voice["at"], deck: number | null, radius: number, sourceLevel: number) => {
    const input = level(1);
    const gain = level(0);
    const pan = context.createStereoPanner();
    input.connect(gain).connect(pan).connect(bus);
    const made: Voice = { at, deck, radius, input, gain, pan, level: sourceLevel };
    voices.push(made);
    return made;
  };
  /** Random one-off sounds every so often: next fires between min and max seconds apart. */
  const every = (min: number, max: number, fire: (when: number) => void) => {
    let next = context.currentTime + min + Math.random() * (max - min);
    return (now: number) => {
      if (now < next) return;
      fire(Math.max(now, next));
      next = now + min + Math.random() * (max - min);
    };
  };

  // The ship itself: a deep engine hum everywhere, and the drone's own hover whine.
  const hum = level(0.035);
  oscillator("sine", 44).connect(hum);
  oscillator("sine", 88).connect(level(0.4)).connect(hum);
  hum.connect(bus);
  const hover = level(0.008);
  const hoverA = oscillator("sine", 196);
  const hoverB = oscillator("sine", 199.5);
  hoverA.connect(hover);
  hoverB.connect(hover);
  hover.connect(bus);

  for (const place of places) {
    const reach = REACH[place.kind];
    const where = () => place;
    if (place.kind === "bay") {
      // The launch bay: a klaxon while it is sealed, air roaring out when it vents.
      const room = voice(where, place.deck, reach.radius, reach.level);
      const klaxonGain = level(0);
      const klaxon = oscillator("square", 520);
      klaxon.connect(filter("bandpass", 900, 1.2)).connect(klaxonGain).connect(room.input);
      const ventGain = level(0);
      loopNoise().connect(filter("highpass", 1200)).connect(ventGain).connect(room.input);
      room.tick = (now) => {
        const state = bay();
        klaxon.frequency.setValueAtTime(Math.floor(now / 0.45) % 2 === 0 ? 520 : 390, now);
        klaxonGain.gain.setTargetAtTime(state.alarm ? 0.05 : 0, now, 0.05);
        ventGain.gain.setTargetAtTime(state.venting ? 0.22 : 0, now, 0.15);
      };
      // The recon ship's engines, heard from wherever the ship is.
      const engineGain = level(0);
      const engines = voice(() => bay().ship, place.deck, 40, 1);
      loopNoise().connect(filter("lowpass", 420)).connect(engineGain).connect(engines.input);
      oscillator("sawtooth", 62).connect(filter("lowpass", 240)).connect(level(0.4)).connect(engineGain);
      engines.tick = (now) => engineGain.gain.setTargetAtTime(bay().engines * 0.35, now, 0.2);
      continue;
    }
    if (!place.online) continue;
    const room = voice(where, place.deck, reach.radius, reach.level);
    const into = room.input;
    if (place.kind === "press") {
      // A heavy hum, and the press landing in time with the piston on screen.
      const drone = level(0.05);
      oscillator("sawtooth", 55).connect(drone);
      oscillator("sawtooth", 55.6).connect(drone);
      drone.connect(filter("lowpass", 220)).connect(into);
      const strokeMs = Math.PI / 0.0025;
      let lastStroke = -1;
      room.tick = (now) => {
        const stroke = Math.floor((performance.now() - strokeMs / 2) / strokeMs);
        if (stroke === lastStroke) return;
        lastStroke = stroke;
        blip(into, now, "sine", 90, 38, 0.32, 0.28);
      };
    } else if (place.kind === "conveyor") {
      const rattle = level(0.02);
      loopNoise().connect(filter("bandpass", 1400, 2.5)).connect(rattle).connect(into);
      wobble(rattle, 8, 0.012);
    } else if (place.kind === "star") {
      // The Law-Heart: a rumble you feel more than hear, a deep tone, and a high shimmer.
      loopNoise().connect(filter("lowpass", 130)).connect(level(0.45)).connect(into);
      oscillator("sine", 55).connect(level(0.07)).connect(into);
      const shimmer = level(0.012);
      oscillator("sine", 660).connect(shimmer);
      oscillator("sine", 989).connect(level(0.6)).connect(shimmer);
      wobble(shimmer, 0.25, 0.01);
      shimmer.connect(into);
    } else if (place.kind === "tanks") {
      loopNoise().connect(filter("lowpass", 300)).connect(level(0.03)).connect(into);
      room.tick = every(0.12, 0.45, (when) => blip(into, when, "sine", 260 + Math.random() * 120, 700 + Math.random() * 300, 0.045, 0.07));
    } else if (place.kind === "fan") {
      const whoosh = level(0.05);
      loopNoise().connect(filter("bandpass", 260, 0.9)).connect(whoosh).connect(into);
      wobble(whoosh, 1.3, 0.035);
    } else if (place.kind === "servers") {
      loopNoise().connect(filter("highpass", 2800)).connect(level(0.016)).connect(into);
      room.tick = every(0.7, 2.2, (when) => {
        const pitch = 1500 + Math.random() * 1100;
        blip(into, when, "square", pitch, pitch, 0.018, 0.04);
        if (Math.random() < 0.5) blip(into, when + 0.07, "square", pitch * 1.25, pitch * 1.25, 0.015, 0.04);
      });
    } else if (place.kind === "helm") {
      oscillator("sine", 120).connect(level(0.015)).connect(into);
      room.tick = every(2.5, 5, (when) => {
        blip(into, when, "sine", 880, 880, 0.035, 0.12);
        blip(into, when + 0.14, "sine", 1175, 1175, 0.03, 0.16);
      });
    } else if (place.kind === "mess") {
      // Voices you cannot make out, and the odd clink of a cup.
      const murmur = level(0.03);
      loopNoise().connect(filter("bandpass", 360, 1.4)).connect(murmur).connect(into);
      wobble(murmur, 0.6, 0.02);
      wobble(murmur, 1.7, 0.012);
      room.tick = every(2, 6, (when) => blip(into, when, "triangle", 2400, 2300, 0.025, 0.09));
    }
  }

  let disposed = false;
  return {
    update(listener) {
      if (disposed) return;
      const now = context.currentTime;
      for (const item of voices) {
        const at = item.at();
        item.tick?.(now);
        if (!at) {
          item.gain.gain.setTargetAtTime(0, now, 0.1);
          continue;
        }
        const heard = hearing(listener, at, item.deck, item.radius, item.level);
        item.gain.gain.setTargetAtTime(heard.gain, now, 0.12);
        item.pan.pan.setTargetAtTime(heard.pan, now, 0.08);
      }
      const pitch = 1 + Math.min(1, listener.speed / 11) * 0.12;
      hoverA.frequency.setTargetAtTime(196 * pitch, now, 0.2);
      hoverB.frequency.setTargetAtTime(199.5 * pitch, now, 0.2);
      hover.gain.setTargetAtTime(0.008 + Math.min(1, listener.speed / 11) * 0.01, now, 0.2);
    },
    lift(up) {
      if (disposed) return;
      const now = context.currentTime;
      const source = context.createBufferSource();
      source.buffer = getPulseNoise(output);
      source.loop = true;
      const sweep = filter("bandpass", up ? 220 : 1500, 1.2);
      sweep.frequency.exponentialRampToValueAtTime(up ? 1500 : 220, now + 1.4);
      const envelope = level(0.0001);
      envelope.gain.exponentialRampToValueAtTime(0.09, now + 0.3);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      source.connect(sweep).connect(envelope).connect(bus);
      source.start(now);
      source.stop(now + 1.6);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const now = context.currentTime;
      bus.gain.setTargetAtTime(0, now, 0.05);
      window.setTimeout(() => {
        for (const stop of stoppers) {
          try {
            stop();
          } catch {
            // Already stopped.
          }
        }
        bus.disconnect();
      }, 300);
    },
  };
}
