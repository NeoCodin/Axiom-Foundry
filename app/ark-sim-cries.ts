/*
 * What the things in the simulation sound like. Every cry is built from the same parts a real
 * throat has: a rough source, a flutter in it, and resonances that move as the mouth opens, so
 * they read as animals and not as synthesizers. The fear comes from the space round them: a long
 * dark echo, cries from something far off and never seen, and the jungle going quiet first.
 * All synthesized here. Works on any audio context, so a cry can be rendered and measured offline.
 */
import type { AlienKind } from "./ark-sim-rules";

/** Where a cry goes: `dry` is the sound itself, `wet` the echo it leaves. */
export type CryOutput = { context: BaseAudioContext; dry: AudioNode; wet: AudioNode; noise: AudioBuffer };
export type CryMood = "hunt" | "die";

type Vowel = readonly [number, number, number];
const OH: Vowel = [420, 800, 2500];
const AH: Vowel = [760, 1250, 2700];
const EE: Vowel = [320, 2300, 3100];
const UH: Vowel = [520, 1100, 2400];
const OO: Vowel = [300, 700, 2200];

type Throat = {
  at?: number;
  /** Pitch over time: seconds, hertz. */
  pitch: readonly (readonly [number, number])[];
  /** The mouth over time: seconds, vowel. */
  mouth: readonly (readonly [number, Vowel])[];
  length: number;
  peak: number;
  attack?: number;
  /** The flutter that makes it a growl: rate, and how deep. */
  flutter?: readonly [number, number];
  /** How torn the voice is, 1 clean to 8 ragged. */
  tear?: number;
  /** How much breath is in it. */
  breath?: number;
  /** A voice an octave down, for size. */
  under?: number;
  pan?: number;
  wet?: number;
};

function tearCurve(amount: number) {
  const curve = new Float32Array(1024);
  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

/** One voice from a throat. */
function throat(out: CryOutput, options: Throat) {
  const { context } = out;
  const when = context.currentTime + (options.at ?? 0);
  const end = when + options.length;
  const shaper = context.createWaveShaper();
  shaper.curve = tearCurve(options.tear ?? 3);
  const source = context.createGain();
  source.gain.value = 0.4;
  source.connect(shaper);
  const nodes: AudioScheduledSourceNode[] = [];
  const addVoice = (ratio: number, detune: number, type: OscillatorType, level: number) => {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.detune.value = detune;
    oscillator.frequency.setValueAtTime(options.pitch[0][1] * ratio, when);
    for (const [time, hertz] of options.pitch.slice(1)) oscillator.frequency.exponentialRampToValueAtTime(hertz * ratio, when + time);
    const gain = context.createGain();
    gain.gain.value = level;
    oscillator.connect(gain).connect(source);
    nodes.push(oscillator);
    return oscillator;
  };
  addVoice(1, -11, "sawtooth", 0.5);
  addVoice(1, 13, "sawtooth", 0.5);
  addVoice(1.004, 31, "square", 0.22);
  if (options.under) addVoice(0.5, 0, "sawtooth", options.under);

  // The flutter: the vocal cords slapping, chopped at a rate too fast to count.
  const flutter = context.createGain();
  flutter.gain.value = 1;
  shaper.connect(flutter);
  if (options.flutter) {
    const [rate, depth] = options.flutter;
    const lfo = context.createOscillator();
    lfo.type = "square";
    lfo.frequency.setValueAtTime(rate, when);
    lfo.frequency.linearRampToValueAtTime(rate * 0.72, end);
    const amount = context.createGain();
    amount.gain.value = depth;
    flutter.gain.value = 1 - depth * 0.5;
    lfo.connect(amount).connect(flutter.gain);
    nodes.push(lfo);
  }

  // The mouth: three resonances that move together.
  const mix = context.createGain();
  mix.gain.value = 1;
  [1.4, 1, 0.6].forEach((weight, formant) => {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 7 + formant * 3;
    filter.frequency.setValueAtTime(options.mouth[0][1][formant], when);
    for (const [time, vowel] of options.mouth.slice(1)) filter.frequency.linearRampToValueAtTime(vowel[formant], when + time);
    const level = context.createGain();
    level.gain.value = weight;
    flutter.connect(filter).connect(level).connect(mix);
  });
  if (options.breath) {
    const breath = context.createBufferSource();
    breath.buffer = out.noise;
    breath.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(options.mouth[0][1][1], when);
    for (const [time, vowel] of options.mouth.slice(1)) filter.frequency.linearRampToValueAtTime(vowel[1], when + time);
    const level = context.createGain();
    level.gain.value = options.breath;
    breath.connect(filter).connect(level).connect(mix);
    nodes.push(breath);
  }

  const envelope = context.createGain();
  const attack = options.attack ?? 0.03;
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(options.peak, when + attack);
  envelope.gain.setValueAtTime(options.peak, when + Math.max(attack, options.length * 0.5));
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  const panner = context.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, options.pan ?? 0));
  mix.connect(envelope).connect(panner);
  panner.connect(out.dry);
  const send = context.createGain();
  send.gain.value = options.wet ?? 0.6;
  panner.connect(send).connect(out.wet);
  for (const node of nodes) {
    if (node instanceof AudioBufferSourceNode) node.start(when, Math.random() * 0.5);
    else node.start(when);
    node.stop(end + 0.05);
  }
}

/** A thin, wrong, metallic edge on top of a voice. */
function keen(out: CryOutput, at: number, from: number, to: number, length: number, peak: number, pan: number, wet = 0.7) {
  const { context } = out;
  const when = context.currentTime + at;
  const carrier = context.createOscillator();
  const modulator = context.createOscillator();
  const depth = context.createGain();
  carrier.type = "sine";
  modulator.type = "sine";
  carrier.frequency.setValueAtTime(from, when);
  carrier.frequency.exponentialRampToValueAtTime(to, when + length);
  modulator.frequency.setValueAtTime(from * 1.414, when);
  modulator.frequency.exponentialRampToValueAtTime(to * 1.414, when + length);
  depth.gain.setValueAtTime(from * 1.6, when);
  depth.gain.linearRampToValueAtTime(from * 0.4, when + length);
  modulator.connect(depth).connect(carrier.frequency);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(peak, when + length * 0.3);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  carrier.connect(envelope).connect(panner);
  panner.connect(out.dry);
  const send = context.createGain();
  send.gain.value = wet;
  panner.connect(send).connect(out.wet);
  for (const node of [carrier, modulator]) {
    node.start(when);
    node.stop(when + length + 0.05);
  }
}

/** Mandibles: a run of dry clicks. */
function chatter(out: CryOutput, at: number, count: number, gap: number, peak: number, pan: number) {
  const { context } = out;
  for (let index = 0; index < count; index += 1) {
    const when = context.currentTime + at + index * gap * (0.8 + Math.random() * 0.4);
    const click = context.createBufferSource();
    click.buffer = out.noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2600 + Math.random() * 1800;
    filter.Q.value = 5;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(peak, when);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.025);
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    click.connect(filter).connect(envelope).connect(panner);
    panner.connect(out.dry);
    click.start(when, Math.random() * 0.5);
    click.stop(when + 0.04);
  }
}

/** Something wet coming up: quick rising pops. */
function bubbles(out: CryOutput, at: number, count: number, peak: number, pan: number) {
  const { context } = out;
  for (let index = 0; index < count; index += 1) {
    const when = context.currentTime + at + Math.random() * 0.6;
    const pop = context.createOscillator();
    const start = 180 + Math.random() * 300;
    pop.frequency.setValueAtTime(start, when);
    pop.frequency.exponentialRampToValueAtTime(start * 2.4, when + 0.07);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(peak, when + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    pop.connect(envelope).connect(panner);
    panner.connect(out.dry);
    pop.start(when);
    pop.stop(when + 0.1);
  }
}

const vary = (value: number, amount: number) => value * (1 + (Math.random() * 2 - 1) * amount);

/** A creature's cry, close or dying. Each is a little different every time. */
export function cry(out: CryOutput, kind: AlienKind, mood: CryMood, pan: number, gain: number) {
  const dying = mood === "die";
  if (kind === "stalker") {
    // A wail that climbs into a shriek and tears, then its mandibles rattle.
    const high = vary(dying ? 620 : 860, 0.14);
    throat(out, {
      pitch: dying ? [[0, high], [0.7, 150]] : [[0, 210], [0.22, high], [0.62, high * 0.82], [0.95, high * 0.46]],
      mouth: dying ? [[0, EE], [0.7, OH]] : [[0, UH], [0.25, AH], [0.6, EE], [0.95, UH]],
      length: dying ? 0.8 : 1, peak: 0.34 * gain, flutter: [vary(47, 0.2), 0.8], tear: 6, breath: 0.5, pan,
    });
    keen(out, 0.16, vary(2400, 0.12), 1500, 0.72, 0.05 * gain, pan);
    if (!dying) chatter(out, 0.9, 7, 0.042, 0.11 * gain, pan);
  } else if (kind === "spitter") {
    // Something drowning in itself: a low retch, wet and fluttering.
    const low = vary(dying ? 180 : 118, 0.12);
    throat(out, {
      pitch: dying ? [[0, low], [0.8, 60]] : [[0, low], [0.3, low * 1.5], [0.75, low * 0.8]],
      mouth: [[0, OO], [0.3, UH], [0.8, OO]],
      length: 0.85, peak: 0.3 * gain, flutter: [vary(19, 0.2), 0.95], tear: 7, breath: 0.35, under: 0.35, pan,
    });
    bubbles(out, 0.02, 9, 0.09 * gain, pan);
  } else if (kind === "harrier") {
    // A long falling call that carries, like something crying a long way up.
    const high = vary(dying ? 1000 : 640, 0.1);
    throat(out, {
      pitch: [[0, high * 0.7], [0.3, high * 1.32], [1.3, high * 0.52]],
      mouth: [[0, OO], [0.3, EE], [1.3, OH]],
      length: 1.35, attack: 0.1, peak: 0.85 * gain, flutter: [vary(9, 0.2), 0.4], tear: 2.4, breath: 0.2, pan, wet: 1.2,
    });
    keen(out, 0.2, vary(3200, 0.1), 1300, 1.05, 0.1 * gain, pan, 1.2);
    if (dying) chatter(out, 0.1, 5, 0.06, 0.09 * gain, pan);
  } else {
    // The chest of something very large: a roar you feel more than hear.
    const low = vary(dying ? 92 : 74, 0.1);
    throat(out, {
      pitch: dying ? [[0, low], [1.5, 34]] : [[0, low * 0.8], [0.32, low * 1.35], [1.1, low * 1.1], [1.7, low * 0.6]],
      mouth: [[0, OO], [0.34, AH], [1.1, OH], [1.7, OO]],
      length: 1.75, attack: 0.09, peak: 0.52 * gain, flutter: [vary(33, 0.2), 0.85], tear: 7, breath: 0.42, under: 0.9, pan, wet: 0.9,
    });
    throat(out, {
      at: 0.1,
      pitch: [[0, low * 3.02], [0.4, low * 4.2], [1.4, low * 2.2]],
      mouth: [[0, AH], [1.4, UH]],
      length: 1.4, attack: 0.12, peak: 0.09 * gain, flutter: [vary(41, 0.2), 0.7], tear: 5, pan, wet: 1,
    });
  }
}

/**
 * Something far off that is never seen. A long, low call, nearly all echo, that swells and falls
 * and ends on a thin rising note. It gives the player nothing to do except listen.
 */
export function distantCall(out: CryOutput, pan: number, size = 1) {
  const root = vary(46, 0.16);
  const length = vary(5.4, 0.2);
  throat(out, {
    pitch: [[0, root], [length * 0.3, root * 1.68], [length * 0.65, root * 1.3], [length, root * 0.72]],
    mouth: [[0, OO], [length * 0.35, OH], [length * 0.7, UH], [length, OO]],
    length, attack: 1.2, peak: 0.24 * size, flutter: [vary(11, 0.2), 0.32], tear: 4, breath: 0.34, under: 1, pan, wet: 3.4,
  });
  keen(out, length * 0.56, vary(520, 0.2), vary(900, 0.1), length * 0.5, 0.03 * size, -pan, 5);
}

/** What is left of a voice in the Hollowed: low, unsteady, nearly human, trying to shape a word. */
export function hollowMoan(out: CryOutput, pan: number) {
  const root = vary(112, 0.14);
  throat(out, {
    pitch: [[0, root], [0.7, root * 1.2], [1.3, root * 0.86], [2.1, root * 0.66]],
    mouth: [[0, UH], [0.6, OH], [1.1, EE], [1.6, UH], [2.1, OO]],
    length: 2.2, attack: 0.3, peak: 0.34, flutter: [vary(7, 0.2), 0.5], tear: 2.2, breath: 0.6, pan, wet: 1.1,
  });
}

/** A long dark space, made once: the echo everything in the simulation is heard in. */
export function echoSpace(context: BaseAudioContext, seconds = 4.4) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    let low = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / length;
      const fall = Math.pow(1 - t, 3.1);
      // The tail grows darker as it dies, the way a big room swallows its top end.
      const smooth = 0.5 * (1 - t) + 0.035;
      low += (Math.random() * 2 - 1 - low) * smooth;
      data[index] = low * fall;
    }
    // A slap off something distant, a moment after the sound.
    data[Math.floor(context.sampleRate * (0.083 + channel * 0.021))] += 0.6;
  }
  return impulse;
}
