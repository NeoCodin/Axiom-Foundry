"use client";

import { useRef, useState } from "react";

import { DEFAULT_FX, FX_KEYS, fxFor, readVoiceLab, RECORDINGS, VOICE_LAB_KEY, writeVoiceLab, type VoiceFx, type VoiceLab } from "./lyra-voice-fx";
import { audioReady, playRecorded } from "./lyra-voice-sound";
import type { LyraStage } from "./lyra-voice";

const FX_LABELS: Record<keyof VoiceFx, string> = { radio: "Radio", metal: "Metal", doubling: "Doubling", crunch: "Crunch" };
const STAGES = ["Grateful", "Uneasy", "Guarded", "Haunted"] as const;

function stored(): VoiceLab {
  try {
    return readVoiceLab(window.localStorage.getItem(VOICE_LAB_KEY));
  } catch {
    return readVoiceLab(null);
  }
}

/**
 * QA panel: hear Lyra's recorded test lines through her colouring and set it by ear. What
 * is set here is what she sounds like in the game on this device.
 */
export function LyraVoiceLab() {
  const [lab, setLab] = useState<VoiceLab>(stored);
  const [stage, setStage] = useState<LyraStage>(0);
  const [raw, setRaw] = useState(false);
  const [note, setNote] = useState("");
  const playing = useRef<{ stop(): void } | null>(null);

  const save = (next: VoiceLab) => {
    setLab(next);
    try {
      window.localStorage.setItem(VOICE_LAB_KEY, writeVoiceLab(next));
    } catch {
      // Storage blocked: the settings last this visit.
    }
  };
  const play = async (said: string, voice: "lyra" | "bleed", take: number) => {
    const file = RECORDINGS.find((recording) => recording.said === said)?.files[take];
    if (!file) return;
    playing.current?.stop();
    if (!(await audioReady())) {
      setNote("Sound is off. Turn it on with the speaker button at the top.");
      return;
    }
    setNote("");
    save({ ...lab, takes: { ...lab.takes, [said]: take } });
    const fx = raw ? { radio: 0, metal: 0, doubling: 0, crunch: 0 } : fxFor(lab.fx, stage, voice);
    playing.current = playRecorded(file, fx, () => {}, () => setNote("That recording didn't load."));
  };

  return (
    <section className="qa-null-lab">
      <span>LYRA VOICE LAB</span>
      <div className="qa-law-heart-controls">
        {FX_KEYS.map((key) => (
          <label key={key}>
            <span>{FX_LABELS[key]} · {lab.fx[key].toFixed(2)}</span>
            <input type="range" min={0} max={1} step={0.01} value={lab.fx[key]} onChange={(event) => save({ ...lab, fx: { ...lab.fx, [key]: Number(event.target.value) } })} />
          </label>
        ))}
      </div>
      <div className="qa-law-heart-presets" aria-label="Story stage">
        {STAGES.map((name, index) => (
          <button key={name} type="button" className={stage === index ? "is-active" : ""} onClick={() => setStage(index as LyraStage)}>{name}</button>
        ))}
      </div>
      <div className="qa-law-heart-master">
        <button type="button" className={raw ? "is-active" : ""} onClick={() => setRaw(!raw)}>Raw recording {raw ? "ON" : "OFF"}</button>
        <button type="button" onClick={() => save({ ...lab, fx: { ...DEFAULT_FX } })}>Reset colouring</button>
      </div>
      <div className="qa-action-grid">
        {RECORDINGS.filter((recording) => recording.files.length > 1).map((recording) => recording.files.map((_, take) => (
          <button key={`${recording.said}-${take}`} type="button" className={(lab.takes[recording.said] ?? 0) === take ? "is-active" : ""} onClick={() => void play(recording.said, recording.voice, take)}>
            {recording.voice === "bleed" ? "Other voice" : "Lyra"} · take {take === 0 ? "A" : "B"}: {recording.said.slice(0, 34)}{recording.said.length > 34 ? "…" : ""}
          </button>
        )))}
      </div>
      {note ? <small className="qa-section-help">{note}</small> : null}
      <small className="qa-section-help">
        The story stage adds more metal and doubling as she slips; other voices are always further gone. The take you play last is the one the game uses. When she sounds right, send Claude these numbers: radio {lab.fx.radio.toFixed(2)}, metal {lab.fx.metal.toFixed(2)}, doubling {lab.fx.doubling.toFixed(2)}, crunch {lab.fx.crunch.toFixed(2)}.
      </small>
    </section>
  );
}
