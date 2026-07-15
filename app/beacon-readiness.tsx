import "./beacon-readiness.css";
import type { BeaconReadiness } from "./beacon-readiness-engine";

export function BeaconReadinessList({ readiness }: { readiness: BeaconReadiness }) {
  return (
    <ul className="beacon-readiness-list" aria-label="SOS beacon readiness requirements">
      {readiness.items.map((item) => (
        <li className={item.ready ? "is-ready" : "is-missing"} key={item.id}>
          <span aria-hidden="true">{item.ready ? "✓" : "!"}</span>
          <div>
            <strong>{item.label}</strong>
            <small>{item.status}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}
