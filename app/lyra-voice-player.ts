import { getPulseAudioOutput, isPulseAudioEnabled, playLyraKey, playLyraVoice } from "./law-heart-audio";
import { chooseVoice, createLyraDirector, isUrgent, lineSeconds, SPOKEN, spokenText, type LyraCue, type LyraLine, type LyraStage } from "./lyra-voice";
import { fxFor, readVoiceLab, recordingOf, VOICE_LAB_KEY } from "./lyra-voice-fx";
import { playRecorded } from "./lyra-voice-sound";

/**
 * Lyra on screen and in the ear: a plate near the top of the view with who is speaking and
 * what, with the link's click and static as each line starts. A line that has been recorded
 * plays in her own voice through her colouring (lyra-voice-fx.ts); anything else is spoken
 * by the browser's own voices (see SPOKEN). Where there are neither, a radio murmur stands in.
 * Lines queue: each waits its delay with the plate dark, stays up until it has been both
 * read and said, then gives way. An urgent warning cuts off whatever she is saying.
 */
export function createLyra(host: HTMLElement, stage: () => LyraStage) {
  const director = createLyraDirector(stage);
  const speech = "speechSynthesis" in window ? window.speechSynthesis : null;
  const plate = document.createElement("div");
  plate.className = "lyra-voice";
  plate.setAttribute("role", "status");
  plate.setAttribute("aria-live", "polite");
  plate.hidden = true;
  const speaker = document.createElement("strong");
  const words = document.createElement("span");
  plate.append(speaker, words);
  host.append(plate);

  /** The browser's voice; false when it has none to say the line with. */
  const speakAloud = (line: LyraLine, done: () => void) => {
    if (!speech || !isPulseAudioEnabled()) return false;
    const voice = chooseVoice(speech.getVoices(), line.voice);
    if (!voice) return false;
    const utterance = new SpeechSynthesisUtterance(spokenText(line));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = SPOKEN[line.voice].rate;
    utterance.pitch = SPOKEN[line.voice].pitch;
    let over = false;
    // Some browsers never say a line has ended; don't wait on them forever.
    const guard = window.setTimeout(() => end(), 2500 + line.text.length * 140);
    const end = () => {
      if (over) return;
      over = true;
      window.clearTimeout(guard);
      done();
    };
    utterance.onend = end;
    utterance.onerror = end;
    speech.speak(utterance);
    return true;
  };

  let clip: { stop(): void } | null = null;
  /** Say a line aloud; false when there is no voice to say it with (or sound is off), so it is only shown. */
  const speak = (line: LyraLine, done: () => void) => {
    if (!isPulseAudioEnabled()) return false;
    let lab = readVoiceLab(null);
    try {
      lab = readVoiceLab(window.localStorage.getItem(VOICE_LAB_KEY));
    } catch {
      // Storage blocked: her default colouring.
    }
    const file = recordingOf(spokenText(line), lab.takes);
    if (!file || !getPulseAudioOutput()) return speakAloud(line, done);
    clip = playRecorded(file, fxFor(lab.fx, stage(), line.voice), done, () => {
      if (!speakAloud(line, done)) done();
    });
    return true;
  };

  const queue: LyraLine[] = [];
  let busy = false;
  /** Which line is current; callbacks from a line that was cut off see a stale number and do nothing. */
  let current = 0;
  let timer: number | null = null;
  const next = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    const line = queue.shift();
    if (!line) {
      busy = false;
      plate.hidden = true;
      return;
    }
    busy = true;
    const mine = ++current;
    const show = () => {
      if (mine !== current) return;
      plate.hidden = false;
      plate.dataset.voice = line.voice;
      speaker.textContent = line.speaker;
      words.textContent = line.text;
      let read = false;
      let said = false;
      const both = () => {
        if (read && said && mine === current) next();
      };
      if (speak(line, () => {
        said = true;
        both();
      })) playLyraKey(line.voice);
      else {
        said = true;
        playLyraVoice(line.voice, line.text.length * 0.055);
      }
      timer = window.setTimeout(() => {
        read = true;
        both();
      }, lineSeconds(line) * 1000);
    };
    if (line.delay) {
      plate.hidden = true;
      timer = window.setTimeout(show, line.delay * 1000);
    } else show();
  };
  const say = (lines: LyraLine[], interrupt: boolean) => {
    if (interrupt && busy) {
      queue.length = 0;
      current += 1;
      busy = false;
      speech?.cancel();
      clip?.stop();
    }
    queue.push(...lines);
    if (!busy) next();
  };

  return {
    /** A warning, if the director judges it is time for it. */
    cue(cue: LyraCue, n?: number) {
      const lines = director.cue(cue, performance.now() / 1000, n);
      if (lines) say(lines, isUrgent(cue));
    },
    /** Something she says of her own accord, aboard: queued behind whatever she is saying. */
    remark(lines: LyraLine[]) {
      say(lines, false);
    },
    /** Whether she is speaking, or about to. */
    busy: () => busy,
    dispose() {
      current += 1;
      if (timer !== null) window.clearTimeout(timer);
      speech?.cancel();
      clip?.stop();
      plate.remove();
    },
  };
}

export type Lyra = ReturnType<typeof createLyra>;
