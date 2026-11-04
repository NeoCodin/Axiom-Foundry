import { playLyraVoice } from "./law-heart-audio";
import { createLyraDirector, isUrgent, lineSeconds, type LyraCue, type LyraLine, type LyraStage } from "./lyra-voice";

/**
 * Lyra on screen and in the ear: a plate near the top of the view with who is speaking and
 * what, and her voice's sound under it. Lines queue: each waits its delay with the plate
 * dark, stays up long enough to read, then gives way. An urgent warning clears the queue.
 */
export function createLyra(host: HTMLElement, stage: () => LyraStage) {
  const director = createLyraDirector(stage);
  const plate = document.createElement("div");
  plate.className = "lyra-voice";
  plate.setAttribute("role", "status");
  plate.setAttribute("aria-live", "polite");
  plate.hidden = true;
  const speaker = document.createElement("strong");
  const words = document.createElement("span");
  plate.append(speaker, words);
  host.append(plate);

  const queue: LyraLine[] = [];
  let timer: number | null = null;
  let lastAmbient = performance.now() / 1000;
  const next = () => {
    timer = null;
    const line = queue.shift();
    if (!line) {
      plate.hidden = true;
      return;
    }
    const show = () => {
      plate.hidden = false;
      plate.dataset.voice = line.voice;
      speaker.textContent = line.speaker;
      words.textContent = line.text;
      playLyraVoice(line.voice, line.text.length * 0.055);
      timer = window.setTimeout(next, lineSeconds(line) * 1000);
    };
    if (line.delay) {
      plate.hidden = true;
      timer = window.setTimeout(show, line.delay * 1000);
    } else show();
  };
  const say = (lines: LyraLine[], interrupt: boolean) => {
    if (interrupt) {
      queue.length = 0;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    }
    queue.push(...lines);
    if (timer === null) next();
  };

  return {
    /** A warning, if the director judges it is time for it. */
    cue(cue: LyraCue, n?: number) {
      const lines = director.cue(cue, performance.now() / 1000, n);
      if (lines) say(lines, isUrgent(cue));
    },
    /** Call every frame wherever she could be listening: now and then, late in the story, she hears something. */
    tick() {
      const now = performance.now() / 1000;
      if (now - lastAmbient < 10) return;
      lastAmbient = now;
      const lines = director.ambient(now);
      if (lines) say(lines, false);
    },
    dispose() {
      if (timer !== null) window.clearTimeout(timer);
      plate.remove();
    },
  };
}

export type Lyra = ReturnType<typeof createLyra>;
