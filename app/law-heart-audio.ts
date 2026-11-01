import type { PulseJudgement } from "./law-heart-pulse";

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

/**
 * Schedule the heartbeat for a beat time on the performance.now() clock, so the
 * sound lands with the approach ring rather than a frame late. Output latency
 * is subtracted so speakers and the ring agree.
 */
export function schedulePulseBeat(beatAtMs: number, coherence: number) {
  const output = ready();
  if (!output) return;
  const { context } = output;
  const latency = context.outputLatency || context.baseLatency || 0;
  const when = Math.max(context.currentTime, context.currentTime + (beatAtMs - performance.now()) / 1000 - latency);
  // Lub, then a softer dub.
  tone(output, when, { type: "sine", from: 96, to: 44, glide: 0.14, peak: 0.55, attack: 0.006, decay: 0.3 });
  tone(output, when + 0.17, { type: "sine", from: 80, to: 40, glide: 0.12, peak: 0.24, attack: 0.006, decay: 0.24 });
  // A coherent heart rings cleaner: a faint overtone grows with Coherence.
  if (coherence > 0.05) {
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
