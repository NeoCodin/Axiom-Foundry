"use client";

import type { CommandPriority } from "./command-priorities";

type CommandBriefingProps = {
  priorities: readonly CommandPriority[];
  onNavigate: (priority: CommandPriority) => void;
};

export function CommandBriefing({ priorities, onNavigate }: CommandBriefingProps) {
  if (priorities.length === 0) return null;
  const [primary, ...upcoming] = priorities;

  const renderPriority = (priority: CommandPriority, index: number) => (
    <article className={`command-priority ${priority.tone}`} key={priority.id}>
      <div className="command-priority-index" aria-hidden="true"><i />0{index + 1}</div>
      <div className="command-priority-copy">
        <div className="command-priority-summary">
          <span>{priority.eyebrow}</span>
          <h3>{priority.title}</h3>
          <p>{priority.detail}</p>
          <div className={`command-priority-cadence is-${priority.cadence}`}>
            {priority.cadence === "offline"
              ? "SAFE TO WAIT · CONTINUES OFFLINE"
              : priority.cadence === "automatic"
                ? "AUTOMATIC · STANDING ORDERS APPLY"
                : "ACTION REQUIRED"}
          </div>
        </div>
        {(priority.missing || priority.nextAction || priority.progress !== undefined) && (
          <div className="command-priority-resolution">
            {(priority.missing || priority.nextAction) && (
              <dl className="command-priority-guidance">
                {priority.missing && <><dt>Missing</dt><dd>{priority.missing}</dd></>}
                {priority.nextAction && <><dt>Exact action</dt><dd>{priority.nextAction}</dd></>}
              </dl>
            )}
            {priority.progress !== undefined && (
              <div className="command-priority-progress" role="progressbar" aria-label={`${priority.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(priority.progress * 100)}>
                <span style={{ width: `${Math.max(0, Math.min(1, priority.progress)) * 100}%` }} />
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => onNavigate(priority)}>{priority.actionLabel}<span aria-hidden="true">▶</span></button>
      </div>
    </article>
  );

  return (
    <section className="command-briefing" aria-labelledby="command-briefing-title">
      <div className="command-briefing-heading">
        <div>
          <span>ACTIVE QUEST · AXIOM GUIDANCE</span>
          <h2 id="command-briefing-title">Your next move</h2>
        </div>
        <p>Nothing expires. Complete one clear objective at a time.</p>
      </div>
      <div className="command-priority-grid">
        {renderPriority(primary, 0)}
      </div>
      {upcoming.length > 0 && (
        <details className="command-upcoming">
          <summary>Later objectives · {upcoming.length}</summary>
          <div className="command-upcoming-grid">{upcoming.map((priority, index) => renderPriority(priority, index + 1))}</div>
        </details>
      )}
    </section>
  );
}
