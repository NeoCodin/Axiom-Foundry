import type { HeartVoice, PulseJudgement } from "./law-heart-pulse";

/**
 * Synthesized game audio: the Law-Heart and the interface. Every sound is
 * generated with Web Audio, so nothing needs to be downloaded. Browsers only
 * allow audio after a user gesture, so the context is created on the first
 * press; until then the game is silent. One on/off preference per device
 * covers all of it.
 */

const PREFERENCE_KEY = "axiom-foundry-pulse-audio";
const MASTER_VOLUME = 0.5;
/** A major pentatonic run: each step of Coherence lifts strike tones one note. */
const COHERENCE_STEPS = [0, 2, 4, 7, 9, 12] as const;

type PulseAudio = {
  context: AudioContext;
  master: GainNode;
};

let audio: PulseAudio | null = null;
let enabled: boolean | null = null;
const listeners = new Set<() => void>();

function readPreference() {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function isPulseAudioEnabled() {
  if (typeof window === "undefined") return true;
  if (enabled === null) enabled = readPreference();
  return enabled;
}

export function subscribePulseAudio(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setPulseAudioEnabled(next: boolean) {
  enabled = next;
  try {
    window.localStorage.setItem(PREFERENCE_KEY, next ? "on" : "off");
  } catch {
    // The toggle still works for this visit when storage is blocked.
  }
  if (audio) {
    audio.master.gain.setTargetAtTime(next ? MASTER_VOLUME : 0, audio.context.currentTime, 0.02);
  }
  if (next) unlockPulseAudio();
  for (const listener of listeners) listener();
}

/** Call from inside a click or tap handler; browsers refuse audio started anywhere else. */
export function unlockPulseAudio() {
  if (typeof window === "undefined" || !isPulseAudioEnabled()) return;
  if (!audio) {
    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
    audio = { context, master };
  }
  if (audio.context.state === "suspended") void audio.context.resume();
}

function ready() {
  return audio && isPulseAudioEnabled() && audio.context.state === "running" ? audio : null;
}

/** The shared output, once a press has started audio and while sound is on; else null. */
export function getPulseAudioOutput() {
  return ready();
}

/** The shared second of white noise, for anyone building their own hiss. */
export function getPulseNoise(output: PulseAudio) {
  return noise(output);
}

function envelope(context: AudioContext, when: number, peak: number, attack: number, decay: number) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  return gain;
}

function tone(
  { context, master }: PulseAudio,
  when: number,
  options: { type: OscillatorType; from: number; to?: number; glide?: number; peak: number; attack: number; decay: number },
) {
  const oscillator = context.createOscillator();
  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.from, when);
  if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, when + (options.glide ?? 0.12));
  const gain = envelope(context, when, options.peak, options.attack, options.decay);
  oscillator.connect(gain).connect(master);
  oscillator.start(when);
  oscillator.stop(when + options.attack + options.decay + 0.02);
}

/** A short burst of crackling static, for a heart that is coming apart. */
let crackleNoise: AudioBuffer | null = null;
function crackle({ context, master }: PulseAudio, when: number, peak: number) {
  if (!crackleNoise || crackleNoise.sampleRate !== context.sampleRate) {
    crackleNoise = context.createBuffer(1, Math.floor(context.sampleRate * 0.25), context.sampleRate);
    const data = crackleNoise.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() < 0.08 ? Math.random() * 2 - 1 : 0;
  }
  const source = context.createBufferSource();
  source.buffer = crackleNoise;
  const filter = context.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1_500;
  const gain = envelope(context, when, peak, 0.004, 0.12);
  source.connect(filter).connect(gain).connect(master);
  source.start(when);
  source.stop(when + 0.15);
}

/**
 * Schedule the heartbeat for a beat time on the performance.now() clock, so the
 * sound lands with the approach ring rather than a frame late. Output latency
 * is subtracted so speakers and the ring agree. Each star has its own voice
 * (law-heart-pulse): a lone faint thump, a waking lub-dub, a steady one, one
 * with an echo, a deep one over a sub-beat, a racing one that crackles while
 * it is unsettled (unrest 0 to 1), or a serene one with a soft chord.
 */
export function schedulePulseBeat(beatAtMs: number, coherence: number, voice: HeartVoice = "steady", unrest = 0) {
  const output = ready();
  if (!output) return;
  const { context } = output;
  const latency = context.outputLatency || context.baseLatency || 0;
  const when = Math.max(context.currentTime, context.currentTime + (beatAtMs - performance.now()) / 1000 - latency);
  const thump = (offset: number, from: number, to: number, peak: number, decay: number, glide = 0.14) =>
    tone(output, when + offset, { type: "sine", from, to, glide, peak, attack: 0.006, decay });
  if (voice === "faint") {
    thump(0, 80, 38, 0.26, 0.26);
  } else if (voice === "waking") {
    thump(0, 90, 42, 0.42, 0.28);
    thump(0.18, 76, 38, 0.16, 0.22, 0.12);
  } else if (voice === "echo") {
    thump(0, 96, 44, 0.55, 0.3);
    thump(0.17, 80, 40, 0.24, 0.24, 0.12);
    thump(0.36, 72, 38, 0.11, 0.3, 0.12);
  } else if (voice === "deep") {
    thump(0, 74, 34, 0.66, 0.36);
    thump(0, 46, 30, 0.32, 0.5, 0.3);
    thump(0.18, 64, 32, 0.3, 0.3, 0.12);
  } else if (voice === "racing") {
    // Tight and high, the dub crowding the lub, wavering while it is unsettled.
    const waver = 1 + (Math.random() - 0.5) * 0.16 * unrest;
    thump(0, 118 * waver, 56, 0.48, 0.17, 0.08);
    thump(0.1, 100 * waver, 50, 0.3, 0.14, 0.07);
    if (unrest > 0.1) crackle(output, when, 0.035 * unrest);
  } else if (voice === "serene") {
    tone(output, when, { type: "sine", from: 86, to: 40, glide: 0.2, peak: 0.42, attack: 0.03, decay: 0.42 });
    thump(0.22, 70, 36, 0.18, 0.34, 0.12);
    for (const pitch of [220, 277.18, 329.63]) tone(output, when, { type: "sine", from: pitch, peak: 0.03, attack: 0.12, decay: 0.9 });
  } else {
    // Lub, then a softer dub.
    thump(0, 96, 44, 0.55, 0.3);
    thump(0.17, 80, 40, 0.24, 0.24, 0.12);
  }
  // A coherent heart rings cleaner: a faint overtone grows with Coherence.
  if (coherence > 0.05 && voice !== "faint") {
    tone(output, when, { type: "triangle", from: 220, peak: 0.02 + 0.07 * coherence, attack: 0.01, decay: 0.55 });
  }
}

export function playPulseStrike(judgement: PulseJudgement, coherence: number) {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  if (judgement === "off-phase") {
    tone(output, when, { type: "square", from: 150, to: 90, glide: 0.04, peak: 0.05, attack: 0.002, decay: 0.06 });
    return;
  }
  const step = COHERENCE_STEPS[Math.round(Math.min(1, Math.max(0, coherence)) * (COHERENCE_STEPS.length - 1))];
  const pitch = (judgement === "coherent" ? 440 : 220) * 2 ** (step / 12);
  const peak = judgement === "coherent" ? 0.16 : 0.1;
  tone(output, when, { type: "triangle", from: pitch, peak, attack: 0.004, decay: 0.36 });
  if (judgement === "coherent") {
    tone(output, when, { type: "sine", from: pitch * 2, peak: peak * 0.35, attack: 0.004, decay: 0.28 });
  }
}

let noiseBuffer: AudioBuffer | null = null;

/** One second of white noise, made once and reused for every hiss and crackle. */
function noise({ context }: PulseAudio) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== context.sampleRate) {
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function noiseBurst(
  output: PulseAudio,
  when: number,
  options: { filter: BiquadFilterType; frequency: number; q?: number; peak: number; attack: number; decay: number },
) {
  const { context, master } = output;
  const source = context.createBufferSource();
  source.buffer = noise(output);
  const filter = context.createBiquadFilter();
  filter.type = options.filter;
  filter.frequency.value = options.frequency;
  filter.Q.value = options.q ?? 0.8;
  const gain = envelope(context, when, options.peak, options.attack, options.decay);
  source.connect(filter).connect(gain).connect(master);
  source.start(when, Math.random() * 0.5);
  source.stop(when + options.attack + options.decay + 0.02);
  return gain;
}

/** A key press on the Ark's panels: a short, slightly varied blip. */
export function playUiKey() {
  const output = ready();
  if (!output) return;
  const pitch = 620 * (0.94 + Math.random() * 0.12);
  tone(output, output.context.currentTime, { type: "triangle", from: pitch, to: pitch * 0.82, glide: 0.03, peak: 0.035, attack: 0.002, decay: 0.045 });
}

/** A committed action (building a machine): two rising blips. */
export function playUiConfirm() {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  tone(output, when, { type: "square", from: 520, peak: 0.022, attack: 0.002, decay: 0.05 });
  tone(output, when + 0.055, { type: "square", from: 780, peak: 0.022, attack: 0.002, decay: 0.08 });
}

/** Moving between decks: a bulkhead thud with a breath of air. */
export function playBulkhead() {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  tone(output, when, { type: "sine", from: 130, to: 58, glide: 0.12, peak: 0.12, attack: 0.004, decay: 0.2 });
  noiseBurst(output, when, { filter: "bandpass", frequency: 900, q: 0.7, peak: 0.03, attack: 0.01, decay: 0.16 });
}

/** Someone talking, too soft to make out: a few breathy syllables under the subtitle. */
export function playMurmur(loudness = 1) {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  for (let syllable = 0; syllable < 3; syllable += 1) {
    noiseBurst(output, when + syllable * 0.13 + Math.random() * 0.04, {
      filter: "bandpass", frequency: 500 + Math.random() * 900, q: 5, peak: 0.02 * loudness, attack: 0.03, decay: 0.09,
    });
  }
}

/** Changing channel on an old set: the switch's click, a burst of snow, the new picture's hum settling. */
export function playChannelSwitch() {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  tone(output, when, { type: "square", from: 1400, to: 900, glide: 0.01, peak: 0.035, attack: 0.001, decay: 0.03 });
  noiseBurst(output, when + 0.2, { filter: "highpass", frequency: 1800, peak: 0.06, attack: 0.02, decay: 0.18 });
  tone(output, when + 0.32, { type: "sine", from: 62, to: 50, glide: 0.2, peak: 0.05, attack: 0.02, decay: 0.24 });
}

/** A record found aboard: a low struck note, a fifth above it, and a breath of static. */
export function playRecordFound() {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  tone(output, when, { type: "sine", from: 196, to: 196, glide: 0.01, peak: 0.08, attack: 0.01, decay: 1.4 });
  tone(output, when + 0.12, { type: "triangle", from: 294, to: 290, glide: 1, peak: 0.035, attack: 0.02, decay: 1.2 });
  noiseBurst(output, when, { filter: "highpass", frequency: 3200, peak: 0.02, attack: 0.05, decay: 0.6 });
}

/** The drone's dash: a valve's click, the thrusters' rush, a low push under it. */
export function playDash() {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  tone(output, when, { type: "square", from: 2200, to: 1600, glide: 0.01, peak: 0.02, attack: 0.001, decay: 0.02 });
  noiseBurst(output, when + 0.01, { filter: "bandpass", frequency: 1100, q: 0.7, peak: 0.07, attack: 0.02, decay: 0.3 });
  tone(output, when + 0.01, { type: "sine", from: 150, to: 55, glide: 0.28, peak: 0.07, attack: 0.008, decay: 0.32 });
}

/** Null interference: a crackle of static, stepped like a failing signal. */
export function playNullStatic(intensity: number) {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  const strength = Math.min(1, Math.max(0, intensity));
  const gain = noiseBurst(output, when, { filter: "highpass", frequency: 2400, peak: 0.025 + strength * 0.045, attack: 0.004, decay: 0.22 });
  // Chop it into a stutter so it reads as a signal dropping out.
  for (let step = 1; step < 5; step += 1) {
    gain.gain.setValueAtTime(step % 2 === 0 ? 0.0001 : 0.02 + strength * 0.03, when + step * 0.04);
  }
}

/** Vowel shapes, as their first two formants: ah, eh, ee, oh, oo. */
const VOWELS = [[800, 1200], [480, 1900], [300, 2500], [450, 850], [330, 700]] as const;

/**
 * A voice in AXIOM's ear, under its subtitle: not words, only their shape, syllables through a
 * radio. Lyra is warm and close; a voice bleeding through hers is lower, doubled and further off
 * in static; the Continuity Protocol is a flat chirp of data over a hum.
 */
export function playLyraVoice(voice: "lyra" | "bleed" | "continuity", seconds: number) {
  const output = ready();
  if (!output) return;
  const { context, master } = output;
  const when = context.currentTime + 0.02;
  const length = Math.min(3.2, Math.max(0.4, seconds));
  if (voice === "continuity") {
    tone(output, when, { type: "sawtooth", from: 55, to: 54, glide: length, peak: 0.018, attack: 0.04, decay: length });
    for (let chirp = 0; chirp < Math.round(length * 7); chirp += 1) {
      tone(output, when + chirp / 7, { type: "square", from: chirp % 3 === 0 ? 1320 : 990, peak: 0.012, attack: 0.002, decay: 0.045 });
    }
    return;
  }
  const bleed = voice === "bleed";
  // Everything passes a narrow band, like a voice over a link.
  const radio = context.createBiquadFilter();
  radio.type = "bandpass";
  radio.frequency.value = bleed ? 1100 : 1500;
  radio.Q.value = 0.8;
  radio.connect(master);
  const first = context.createBiquadFilter();
  const second = context.createBiquadFilter();
  first.type = second.type = "bandpass";
  first.Q.value = 7;
  second.Q.value = 10;
  const mouth = context.createGain();
  mouth.gain.setValueAtTime(0.0001, when);
  first.connect(mouth);
  second.connect(mouth);
  mouth.connect(radio);
  // The throat: Lyra's a little above speech's middle; the other voices lower, two at once, not quite together.
  const pitch = bleed ? 118 : 212;
  const throats = (bleed ? [1, 1.013] : [1]).map((detune) => {
    const throat = context.createOscillator();
    throat.type = "sawtooth";
    throat.frequency.setValueAtTime(pitch * detune, when);
    // A sentence falls toward its end.
    throat.frequency.linearRampToValueAtTime(pitch * detune * 0.84, when + length);
    throat.connect(first);
    throat.connect(second);
    return throat;
  });
  // Syllables: the mouth opens on each and the vowel changes, with a breath between words.
  const rate = bleed ? 3.4 : 5.2;
  const loud = bleed ? 0.42 : 0.5;
  for (let syllable = 0; syllable * (1 / rate) < length; syllable += 1) {
    if (syllable % 4 === 3 && Math.random() < 0.6) continue;
    const at = when + syllable / rate + Math.random() * 0.025;
    const [low, high] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    first.frequency.setTargetAtTime(low, at, 0.018);
    second.frequency.setTargetAtTime(high, at, 0.018);
    mouth.gain.setTargetAtTime(loud * (0.75 + Math.random() * 0.25), at, 0.014);
    mouth.gain.setTargetAtTime(0.0001, at + 0.55 / rate, 0.028);
  }
  for (const throat of throats) {
    throat.start(when);
    throat.stop(when + length + 0.25);
  }
  // The link opening, a breath of hiss (the shared noise lasts a second), heavier for a voice that isn't meant to be there.
  noiseBurst(output, when, { filter: "highpass", frequency: 2600, peak: bleed ? 0.02 : 0.008, attack: 0.03, decay: 0.4 });
  if (bleed) {
    const crackle = noiseBurst(output, when + length * 0.4, { filter: "highpass", frequency: 2200, peak: 0.03, attack: 0.004, decay: 0.2 });
    for (let step = 1; step < 4; step += 1) crackle.gain.setValueAtTime(step % 2 === 0 ? 0.0001 : 0.025, when + length * 0.4 + step * 0.04);
  }
}

/** The link opening as someone starts speaking in AXIOM's ear: a click and a breath of static, heavier for a voice that isn't meant to be there; two flat chirps for the Continuity Protocol. */
export function playLyraKey(voice: "lyra" | "bleed" | "continuity") {
  const output = ready();
  if (!output) return;
  const when = output.context.currentTime;
  if (voice === "continuity") {
    tone(output, when, { type: "square", from: 990, peak: 0.014, attack: 0.002, decay: 0.05 });
    tone(output, when + 0.07, { type: "square", from: 1320, peak: 0.014, attack: 0.002, decay: 0.06 });
    return;
  }
  const bleed = voice === "bleed";
  tone(output, when, { type: "square", from: 1800, to: 1200, glide: 0.01, peak: 0.02, attack: 0.001, decay: 0.025 });
  noiseBurst(output, when, { filter: "highpass", frequency: bleed ? 1800 : 2800, peak: bleed ? 0.035 : 0.014, attack: 0.01, decay: bleed ? 0.5 : 0.25 });
}
