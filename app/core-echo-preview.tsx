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
    title: "The first constraint",
    status: "EARLY STORY STUDY",
    lines: [
      "A research terminal wakes in a room with no Ark, no Null Tide, and no Law-Heart.",
      "Its team is teaching a machine to preserve rules when the systems around it fail.",
      "One test log survives: If a law can be remembered, can a broken world learn it again?",
    ],
  },
  {
    id: "ark-commissioning",
    timestamp: "ARK COMMISSIONING · DATE DAMAGED",
    title: "The empty passenger deck",
    status: "CAMPAIGN ECHO STUDY",
    lines: [
      "The Ark is nearly ready, but its passenger decks are still empty.",
      "A project director records a caretaker voiceprint and asks that AXIOM be taught to doubt its own orders.",
      "The final sentence is missing. The recording ends before the Ark receives its first passengers.",
    ],
  },
  {
    id: "future-scar",
    timestamp: "SOURCE DATE · UNRESOLVED",
    title: "An answer arrives early",
    status: "LATE CAMPAIGN STUDY",
    lines: [
      "A damaged vessel speaks from a future the Analysis Core cannot place on one timeline.",
      "Its crew calls the Ark a beginning and a weapon in the same transmission.",
      "The warning breaks before it explains which future they are trying to prevent.",
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
          <small>This is a save-safe visual study. Core Echoes are not yet part of the public campaign.</small>
        </div>
      </section>
    </div>
  );
}
