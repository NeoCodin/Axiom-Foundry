import { getPulseAudioOutput, unlockPulseAudio } from "./law-heart-audio";
import type { VoiceFx } from "./lyra-voice-fx";

/**
 * Lyra's recorded lines, played through her colouring (lyra-voice-fx.ts) on the game's own
 * audio output, so the sound toggle covers her too. Clips load once and stay in memory.
 */

const clips = new Map<string, Promise<AudioBuffer | null>>();

/** Next to the page, so it works on the dev server and under the Pages base path alike. */
const clipUrl = (file: string) => new URL(`audio/lyra/${file}`, document.baseURI).href;

function load(context: AudioContext, file: string) {
  let clip = clips.get(file);
  if (!clip) {
    clip = fetch(clipUrl(file))
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
      .then((data) => context.decodeAudioData(data))
      .catch(() => {
        clips.delete(file);
        return null;
      });
    clips.set(file, clip);
  }
  return clip;
}

/** Call from a click: starts audio if it isn't yet, and waits a moment for it to run. */
export async function audioReady() {
  unlockPulseAudio();
  for (let tries = 0; tries < 10 && !getPulseAudioOutput(); tries += 1) await new Promise((resolve) => window.setTimeout(resolve, 30));
  return getPulseAudioOutput();
}

/** A wave shaper's curve that rounds the wave to fewer steps: an old digital link. */
function steps(bits: number) {
  const levels = 2 ** (bits - 1);
  const curve = new Float32Array(4096);
  for (let at = 0; at < curve.length; at += 1) {
    const x = (at / (curve.length - 1)) * 2 - 1;
    curve[at] = Math.round(x * levels) / levels;
  }
  return curve;
}

/** Where the voice stops in a clip, in seconds, ignoring the quiet a recording trails off with. */
function voiceEnds(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0);
  let end = samples.length;
  while (end > 0 && Math.abs(samples[end - 1]) < 0.02) end -= 1;
  return end / buffer.sampleRate;
}

/** A line that breaks: how many times its last sliver repeats, how long each is, and how far apart. */
const STUTTER = { repeats: 4, sliver: 0.055, gap: 0.075 };

/**
 * Play a recorded line. onEnd when it has been said; onFail when it can't be (no audio yet,
 * or the file won't load), so the caller can fall back to the browser's voice. A glitched
 * line stops where the voice does and stutters on its last sliver of sound.
 */
export function playRecorded(file: string, fx: VoiceFx, onEnd: () => void, onFail: () => void, glitch = false) {
  let stopped = false;
  let stopNodes = () => {};
  void (async () => {
    const output = getPulseAudioOutput();
    const buffer = output ? await load(output.context, file) : null;
    if (stopped) return;
    if (!output || !buffer) {
      onFail();
      return;
    }
    const { context, master } = output;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = buffer;
    // The radio band: the deep and the very high parts cut away, a little nasal lift between.
    const low = context.createBiquadFilter();
    low.type = "highpass";
    low.frequency.value = 90 + fx.radio * 520;
    const high = context.createBiquadFilter();
    high.type = "lowpass";
    high.frequency.value = 15_000 - fx.radio * 11_500;
    const nasal = context.createBiquadFilter();
    nasal.type = "peaking";
    nasal.frequency.value = 1_700;
    nasal.Q.value = 1.2;
    nasal.gain.value = fx.radio * 6;
    source.connect(low).connect(high).connect(nasal);
    const mix = context.createGain();
    mix.gain.value = 1.4;
    const dry = context.createGain();
    dry.gain.value = 1 - fx.metal * 0.5;
    nasal.connect(dry).connect(mix);
    // The metallic ring: her voice multiplied by a steady tone.
    const ring = context.createGain();
    ring.gain.value = 0;
    const carrier = context.createOscillator();
    carrier.frequency.value = 180;
    carrier.connect(ring.gain);
    const ringLevel = context.createGain();
    ringLevel.gain.value = fx.metal * 0.9;
    nasal.connect(ring).connect(ringLevel).connect(mix);
    // A second copy of her a breath behind, drifting in pitch: more than one voice.
    const behind = context.createDelay(0.1);
    behind.delayTime.value = 0.018;
    const drift = context.createOscillator();
    drift.frequency.value = 0.7;
    const driftDepth = context.createGain();
    driftDepth.gain.value = 0.004;
    drift.connect(driftDepth).connect(behind.delayTime);
    const doubleLevel = context.createGain();
    doubleLevel.gain.value = fx.doubling * 0.8;
    nasal.connect(behind).connect(doubleLevel).connect(mix);
    // Crunch, blended in.
    const crush = context.createWaveShaper();
    crush.curve = steps(Math.round(16 - fx.crunch * 11));
    const crushed = context.createGain();
    crushed.gain.value = fx.crunch;
    const clean = context.createGain();
    clean.gain.value = 1 - fx.crunch * 0.7;
    mix.connect(crush).connect(crushed).connect(master);
    mix.connect(clean).connect(master);
    const ends = voiceEnds(buffer);
    const slivers = glitch
      ? Array.from({ length: STUTTER.repeats }, (_, index) => {
        const sliver = context.createBufferSource();
        sliver.buffer = buffer;
        sliver.connect(low);
        sliver.start(now + ends + index * STUTTER.gap, Math.max(0, ends - STUTTER.sliver), STUTTER.sliver);
        return sliver;
      })
      : [];
    const last = slivers.at(-1) ?? source;
    const nodes = [source, ...slivers, low, high, nasal, mix, dry, ring, carrier, ringLevel, behind, drift, driftDepth, doubleLevel, crush, crushed, clean];
    const silence = () => {
      last.onended = null;
      for (const oscillator of [source, ...slivers, carrier, drift]) {
        try {
          oscillator.stop();
        } catch {
          // Already stopped.
        }
      }
      for (const node of nodes) node.disconnect();
    };
    stopNodes = silence;
    last.onended = () => {
      silence();
      onEnd();
    };
    carrier.start(now);
    drift.start(now);
    source.start(now, 0, glitch ? ends : undefined);
  })();
  return {
    stop() {
      stopped = true;
      stopNodes();
    },
  };
}
