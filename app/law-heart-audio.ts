import type { HeartVoice, PulseJudgement } from "./law-heart-pulse";

/**
 * Synthesized Law-Heart audio (prototype). Every sound is generated with Web
 * Audio, so nothing needs to be downloaded. Browsers only allow audio after a
 * user gesture, so the context is created on the first strike; until then the
 * heart is silent. The on/off preference is per device.
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
