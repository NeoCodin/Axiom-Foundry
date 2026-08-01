import "./beacon-readiness.css";
import type { ReactNode } from "react";
import type { BeaconReadiness } from "./beacon-readiness-engine";

export function BeaconReadinessList({
  readiness,
  renderAction,
}: {
  readiness: BeaconReadiness;
  renderAction?: (item: BeaconReadiness["items"][number]) => ReactNode;
}) {
  return (
    <ul className="beacon-readiness-list" aria-label="SOS beacon readiness requirements">
      {readiness.items.map((item) => {
        const action = renderAction?.(item);
        return (
          <li className={`${item.ready ? "is-ready" : "is-missing"} ${action ? "has-action" : ""}`} key={item.id}>
            <span aria-hidden="true">{item.ready ? "✓" : "!"}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.status}</small>
            </div>
            {action && <div className="beacon-readiness-action">{action}</div>}
          </li>
        );
      })}
    </ul>
  );
}
