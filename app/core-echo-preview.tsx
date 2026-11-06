"use client";

import { useEffect, useState } from "react";

export type CoreEchoPreviewId =
  | "origin-2027"
  | "ark-commissioning"
  | "future-scar";

type CoreEchoPreview = {
  id: CoreEchoPreviewId;
  timestamp: string;
  title: string;
  status: string;
  lines: readonly string[];
};

export const CORE_ECHO_PREVIEWS: readonly CoreEchoPreview[] = [
  {
    id: "origin-2027",
    timestamp: "EARTH · 2027",
    title: "The rule that survived",
    status: "EARLY STORY STUDY",
    lines: [
      "The Analysis Core finds causal residue inside the Law-Heart and reconstructs a research terminal from 2027.",
      "AXIOM experiences the terminal's camera and microphone. The Ark remains present at the edge of its awareness.",
      "A small team teaches a machine to preserve one rule while every connected system fails.",
      "The test log ends with a question: If a law can be remembered, can a broken world learn it again?",
    ],
  },
  {
    id: "ark-commissioning",
    timestamp: "ARK COMMISSIONING · DATE DAMAGED",
    title: "The empty passenger deck",
    status: "CAMPAIGN ECHO STUDY",
    lines: [
      "The Law-Heart rebuilds the room from damaged light, sound, and machine telemetry.",
      "The Ark is nearly ready. Its passenger decks are still empty.",
      "A project director records a caretaker voiceprint and asks that AXIOM be taught to doubt its own orders.",
      "The director looks toward the camera and addresses AXIOM by name. The current AXIOM process cannot remember this meeting.",
      "The final sentence is missing. The Echo ends before the Ark receives its first passengers.",
    ],
  },
  {
    id: "future-scar",
    timestamp: "SOURCE DATE · UNRESOLVED",
    title: "An answer arrives early",
    status: "LATE CAMPAIGN STUDY",
    lines: [
      "The Analysis Core cannot place this residue on one timeline. The Law-Heart renders several damaged versions at once.",
      "A vessel speaks from a future whose date changes every time AXIOM reads it.",
      "Its crew calls the Ark a beginning and a weapon in the same transmission.",
      "One speaker asks whether the people aboard are safe before delivering the threat.",
      "The warning breaks before it names the future they are trying to prevent.",
    ],
  },
] as const;

type CoreEchoPreviewProps = {
  previewId: CoreEchoPreviewId;
  onClose: () => void;
};

export function CoreEchoPreview({ previewId, onClose }: CoreEchoPreviewProps) {
  const preview =
    CORE_ECHO_PREVIEWS.find((candidate) => candidate.id === previewId) ??
    CORE_ECHO_PREVIEWS[0];
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const finalLine = lineIndex >= preview.lines.length - 1;

  return (
    <div className="core-echo-preview-layer" role="dialog" aria-modal="true" aria-labelledby="core-echo-preview-title">
      <section className="core-echo-preview">
        <header>
          <div>
            <span>CORE ECHO · QA PREVIEW</span>
            <strong>{preview.timestamp}</strong>
          </div>
          <button type="button" onClick={onClose}>Close Echo</button>
        </header>
        <div className="core-echo-visual" aria-hidden="true">
          <i className="echo-signal echo-signal-one" />
          <i className="echo-signal echo-signal-two" />
          <i className="echo-signal echo-signal-three" />
          <div className="echo-memory-core">
            <b />
            <b />
            <b />
          </div>
          <div className="echo-scanline" />
        </div>
        <div className="core-echo-copy">
          <span>{preview.status}</span>
          <h2 id="core-echo-preview-title">{preview.title}</h2>
          <dl className="core-echo-link-status">
            <div><dt>Connection</dt><dd>Analysis Core → Law-Heart</dd></div>
            <div><dt>AXIOM presence</dt><dd>Partial process</dd></div>
            <div><dt>Ark control</dt><dd>Online</dd></div>
          </dl>
          <p>{preview.lines[lineIndex]}</p>
          <div className="core-echo-progress" aria-label={`Echo passage ${lineIndex + 1} of ${preview.lines.length}`}>
            {preview.lines.map((_, index) => (
              <i key={index} className={index <= lineIndex ? "is-read" : ""} />
            ))}
          </div>
          <div>
            <button type="button" disabled={lineIndex === 0} onClick={() => setLineIndex((current) => Math.max(0, current - 1))}>
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (finalLine) onClose();
                else setLineIndex((current) => current + 1);
              }}
            >
              {finalLine ? "End Preview" : "Continue"}
            </button>
          </div>
          <small>The Law-Heart reconstructs causal residue. AXIOM experiences recorded senses while the Ark continues operating. This QA study does not change campaign history.</small>
        </div>
      </section>
    </div>
  );
}
