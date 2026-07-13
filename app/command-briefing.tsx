"use client";

import type { CommandPriority } from "./command-priorities";
import type { PrimaryView } from "./game-navigation";

type CommandBriefingProps = {
  priorities: readonly CommandPriority[];
  onNavigate: (target: PrimaryView) => void;
};

export function CommandBriefing({ priorities, onNavigate }: CommandBriefingProps) {
  if (priorities.length === 0) return null;

  return (
    <section className="command-briefing" aria-labelledby="command-briefing-title">
      <div className="command-briefing-heading">
        <div>
          <span>AXIOM command intelligence</span>
          <h2 id="command-briefing-title">What matters now</h2>
        </div>
        <p>Every recommendation is safe to postpone. Nothing here expires.</p>
      </div>
      <div className="command-priority-grid">
        {priorities.map((priority, index) => (
          <article className={`command-priority ${priority.tone}`} key={priority.id}>
            <div className="command-priority-index">0{index + 1}</div>
            <div className="command-priority-copy">
              <span>{priority.eyebrow}</span>
              <h3>{priority.title}</h3>
              <p>{priority.detail}</p>
              {priority.progress !== undefined && (
                <div className="command-priority-progress" role="progressbar" aria-label={`${priority.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(priority.progress * 100)}>
                  <span style={{ width: `${Math.max(0, Math.min(1, priority.progress)) * 100}%` }} />
                </div>
              )}
              <button type="button" onClick={() => onNavigate(priority.target)}>{priority.actionLabel}<span aria-hidden="true">→</span></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

