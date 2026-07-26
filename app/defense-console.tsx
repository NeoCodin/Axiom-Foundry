"use client";

import { useState } from "react";
import type { ArkRoomReinforcement } from "./ark-deck";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  DEFENSE_CAUSAL_FRAGMENTS,
  DEFENSE_DOCTRINE_DEFINITIONS,
  DEFENSE_EVENT_DEFINITIONS,
  DEFENSE_INSTALLATION_DEFINITIONS,
  ENVIRONMENTAL_DOCTRINE_DEFINITIONS,
  MAX_INSTALLATION_MARK,
  getDefenseReadinessBreakdown,
  getDoctrineDefinition,
  getForecastLeadSeconds,
  getIncomingForecast,
  getRepairSpeedMultiplier,
  type DefenseCrewContext,
  type DefenseDoctrine,
  type DefenseInstallationId,
  type DefenseState,
  type EnvironmentalDoctrine,
} from "./defense-engine";
import type { CausalArchiveView } from "./causal-archive-engine";
import type { RoomId } from "./discovery-content";

export type DefenseInstallationQuoteView = {
  mark: number;
  targetMark: number;
  maxed: boolean;
  busy: boolean;
  researchMet: boolean;
  canAfford: boolean;
  capability: string;
  costLabel: string;
  durationLabel: string;
};

export type DefenseConsoleProps = {
  state: DefenseState;
  causalArchive: CausalArchiveView;
  crew: DefenseCrewContext;
  crewNames: Readonly<Record<string, string>>;
  currentLocationName: string;
  stormsEnabled: boolean;
  hostilesEnabled: boolean;
  installationQuotes: Readonly<Record<DefenseInstallationId, DefenseInstallationQuoteView>>;
  roomReinforcements: readonly ArkRoomReinforcement[];
  salvageLabel: string;
  onBuyInstallation: (id: DefenseInstallationId) => void;
  onReinforceRoom: (roomId: RoomId) => void;
  onChooseContactDoctrine: (doctrine: DefenseDoctrine) => void;
  onChooseEnvironmentalDoctrine: (doctrine: EnvironmentalDoctrine) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

type DefenseTab = "monitor" | "orders" | "fortifications" | "archive";

const INSTALLATION_IDS: readonly DefenseInstallationId[] = ["shieldArray", "repairDrones", "pointDefense", "earlyWarningRelay"];
const CONTACT_DOCTRINES: readonly DefenseDoctrine[] = ["defend", "evade", "intercept", "observe"];
const ENVIRONMENT_DOCTRINES: readonly EnvironmentalDoctrine[] = ["brace", "harvest", "outrun"];
const MARKS = ["OFFLINE", "MARK I", "MARK II", "MARK III", "MARK IV"] as const;

const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m ${String(safe % 60).padStart(2, "0")}s`;
};

const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function readinessState(total: number) {
  if (total >= 74) return { id: "prepared", label: "PREPARED", detail: "A clean resolution is likely." };
  if (total >= 48) return { id: "contested", label: "CONTESTED", detail: "Temporary damage is possible." };
  return { id: "exposed", label: "EXPOSED", detail: "Evasion is the safest standing order." };
}

function DefenseConsole({
  state,
  causalArchive,
  crew,
  crewNames,
  currentLocationName,
  stormsEnabled,
  hostilesEnabled,
  installationQuotes,
  roomReinforcements,
  salvageLabel,
  onBuyInstallation,
  onReinforceRoom,
  onChooseContactDoctrine,
  onChooseEnvironmentalDoctrine,
  onOpenHelp,
  onBack,
}: DefenseConsoleProps) {
  const [activeTab, setActiveTab] = useState<DefenseTab>("monitor");
  const [selectedIncident, setSelectedIncident] = useState(0);
  const readiness = getDefenseReadinessBreakdown(state, crew);
  const condition = readinessState(readiness.total);
  const forecast = getIncomingForecast(state, crew.navigators, crew.researchForecastSeconds);
  const leadSeconds = getForecastLeadSeconds(state, crew.navigators, crew.researchForecastSeconds);
  const repairSpeed = getRepairSpeedMultiplier(state, crew.engineers, crew.researchRepairMultiplier);
  const eventDefinition = forecast ? DEFENSE_EVENT_DEFINITIONS[forecast.kind] : null;
  const forecastDoctrine = forecast
    ? getDoctrineDefinition(forecast.hostile ? state.contactDoctrine : state.environmentalDoctrine)
    : null;
  const construction = state.construction;
  const constructionProgress = construction
    ? Math.min(1, construction.progressSeconds / Math.max(1, construction.totalSeconds))
    : 0;
  const reverseLog = [...state.eventLog].reverse();
  const incident = reverseLog[Math.min(selectedIncident, Math.max(0, reverseLog.length - 1))] ?? null;
  const projectedMargin =
    forecast && forecastDoctrine && forecast.severityKnown
      ? readiness.total + forecastDoctrine.marginModifier - (forecast.hostile ? 34 : 30) * forecast.severity
      : null;
  const projectedCondition =
    projectedMargin === null
      ? null
      : projectedMargin >= 8
        ? { id: "prepared", label: "CLEAN RESOLUTION LIKELY" }
        : projectedMargin >= 0
          ? { id: "contested", label: "DAMAGE POSSIBLE" }
          : { id: "exposed", label: "SETBACK LIKELY" };
  const totalRoomMarks = roomReinforcements.reduce((sum, room) => sum + room.level, 0);
  const installationMarks = INSTALLATION_IDS.reduce((sum, id) => sum + installationQuotes[id].mark, 0);

  return (
    <section className="continuity-console defense-console defense-console-v2" data-guide-target="defense-console" aria-labelledby="defense-console-title">
      <header className="continuity-console-header defense-command-header">
        <div>
          <p>THREAT OPERATIONS · {currentLocationName.toUpperCase()}</p>
          <h2 id="defense-console-title">Ark Defense Grid</h2>
          <span>Forecast, doctrine, construction, and incident evidence are separated into dedicated stations.</span>
        </div>
        <div className="defense-header-actions">
          <HelpTrigger label="Explain the Defense Grid" onClick={() => onOpenHelp("defense")} />
          <button type="button" onClick={onBack}>Return to Ark Deck</button>
        </div>
      </header>

      <nav className="defense-workspace-tabs" data-guide-target="defense-tabs" aria-label="Defense Grid stations">
        <button type="button" className={activeTab === "monitor" ? "is-active" : ""} aria-pressed={activeTab === "monitor"} onClick={() => setActiveTab("monitor")}>
          <span>1</span><strong>Threat Monitor</strong><small>{forecast ? "CONTACT TRACKED" : condition.label}</small>
        </button>
        <button type="button" className={activeTab === "orders" ? "is-active" : ""} aria-pressed={activeTab === "orders"} onClick={() => setActiveTab("orders")}>
          <span>2</span><strong>Standing Orders</strong><small>2 DOCTRINES ACTIVE</small>
        </button>
        <button type="button" className={activeTab === "fortifications" ? "is-active" : ""} aria-pressed={activeTab === "fortifications"} onClick={() => setActiveTab("fortifications")}>
          <span>3</span><strong>Fortifications</strong><small>{installationMarks + totalRoomMarks} MARKS BUILT</small>
        </button>
        <button type="button" className={activeTab === "archive" ? "is-active" : ""} aria-pressed={activeTab === "archive"} onClick={() => setActiveTab("archive")}>
          <span>4</span><strong>After Action</strong><small>{state.eventLog.length} REPORTS</small>
        </button>
      </nav>

      {activeTab === "monitor" && (
        <section className="defense-monitor-workspace">
          <div className={`defense-tactical-void is-${condition.id} ${forecast ? "has-forecast" : "is-listening"}`}>
            <div className="defense-scanline" aria-hidden="true" />
            <div className="defense-threat-stars" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} />)}</div>
            <div className="defense-shield-envelope" aria-hidden="true">
              <span className="edge-top" /><span className="edge-right" />
              <span className="edge-bottom" /><span className="edge-left" />
              {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
            </div>
            <div className="defense-ark-silhouette" aria-hidden="true">
              <span className="defense-ark-keel" />
              <span className="defense-ark-hull hull-fore" />
              <span className="defense-ark-hull hull-mid" />
              <span className="defense-ark-hull hull-aft" />
              <span className="defense-ark-bridge" />
              <span className="defense-ark-module module-a" />
              <span className="defense-ark-module module-b" />
              <span className="defense-ark-module module-c" />
              <span className="defense-ark-radiator radiator-top" />
              <span className="defense-ark-radiator radiator-bottom" />
              <span className="defense-ark-drive" />
            </div>
            {forecast && (
              <div className={`defense-contact-cluster ${forecast.hostile ? "is-hostile" : "is-environmental"}`} aria-hidden="true">
                <span />
                {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
                <b /><em /><u />
              </div>
            )}
            <div className="defense-tactical-label label-readiness">
              <span>ARK READINESS</span><strong>{readiness.total}</strong><small>{condition.label}</small>
            </div>
            <div className="defense-tactical-label label-forecast">
              <span>{forecast?.hostile ? "RETROGRADE CONTACT" : forecast ? "ENVIRONMENTAL HAZARD" : "DEEP SCAN"}</span>
              <strong>{forecast && eventDefinition ? eventDefinition.label : "NO TRACK"}</strong>
              <small>{forecast ? `T-${formatCountdown(forecast.secondsUntil)}` : "LISTENING"}</small>
            </div>
            <div className="defense-tactical-label label-doctrine">
              <span>STANDING ORDER</span>
              <strong>{forecastDoctrine?.label ?? (hostilesEnabled ? DEFENSE_DOCTRINE_DEFINITIONS[state.contactDoctrine].label : ENVIRONMENTAL_DOCTRINE_DEFINITIONS[state.environmentalDoctrine].label)}</strong>
              <small>AUTOMATIC ONLINE + OFFLINE</small>
            </div>
          </div>

          <aside className="defense-monitor-brief">
            <div className={`defense-condition-card is-${projectedCondition?.id ?? condition.id}`}>
              <span>{forecast ? "PROJECTED OUTCOME" : "CURRENT POSTURE"}</span>
              <strong>{projectedCondition?.label ?? condition.label}</strong>
              <p>{forecast ? "The Grid will resolve this event automatically using the active standing order." : condition.detail}</p>
            </div>

            {forecast && eventDefinition && forecastDoctrine ? (
              <div className="defense-forecast-brief">
                <span>{eventDefinition.label} · SEVERITY {forecast.severityKnown ? forecast.severity : "UNKNOWN"}</span>
                <h3>{titleCase(forecast.target)} is being targeted</h3>
                <p>{eventDefinition.summary}</p>
                <dl>
                  <div><dt>Arrival</dt><dd>{formatCountdown(forecast.secondsUntil)}</dd></div>
                  <div><dt>Order</dt><dd>{forecastDoctrine.label}</dd></div>
                  <div><dt>Margin</dt><dd>{projectedMargin === null ? "SCANNING" : `${projectedMargin >= 0 ? "+" : ""}${Math.round(projectedMargin)}`}</dd></div>
                </dl>
                <button type="button" onClick={() => setActiveTab("orders")}>Review standing orders</button>
              </div>
            ) : state.damage ? (
              <div className="defense-forecast-brief">
                <span>RECOVERY OPERATION</span>
                <h3>Hull repairs underway</h3>
                <p>Production is reduced by {Math.round(state.damage.productionPenalty * 100)}% until the repair swarms finish.</p>
                <strong>{formatCountdown(state.damage.repairRemainingSeconds / repairSpeed)} REMAINS</strong>
              </div>
            ) : (
              <div className="defense-forecast-brief">
                <span>QUIET WATCH</span>
                <h3>The Ark is listening</h3>
                <p>{hostilesEnabled ? "The Retrograde sweep is active." : stormsEnabled ? "Route hazards are being tracked." : "This region has no active threat table."} Forecast lead is {formatCountdown(leadSeconds)}.</p>
              </div>
            )}

            {state.compromise && (
              <div className="defense-compromise-brief">
                <span>ACTIVE COMPROMISE</span>
                <strong>{titleCase(state.compromise.kind)}</strong>
                <p>{titleCase(state.compromise.target)} is carrying {Math.round(state.compromise.operationalLoad * 100)}% additional load for {formatCountdown(state.compromise.remainingSeconds)}.</p>
              </div>
            )}

            <details className="defense-readiness-breakdown">
              <summary>Show readiness calculation</summary>
              <div>
                <span>Shield Array <strong>+{readiness.installation.shield}</strong></span>
                <span>Repair Swarms <strong>+{readiness.installation.repair}</strong></span>
                <span>Point Defense <strong>+{readiness.installation.pointDefense}</strong></span>
                <span>On-duty crew <strong>+{readiness.personnel}</strong></span>
                <span>Research <strong>+{readiness.research}</strong></span>
                <span>Equipment + interceptors <strong>+{readiness.equipment + readiness.interceptors}</strong></span>
              </div>
            </details>
          </aside>
        </section>
      )}

      {activeTab === "orders" && (
        <section className="defense-orders-workspace">
          <header className="defense-section-heading">
            <div><span>STANDING ORDERS</span><h3>Choose once. AXIOM acts while you are away.</h3></div>
            <small>Every option shows its safety and recovery tradeoff before selection.</small>
          </header>
          <div className="defense-order-columns">
            <section>
              <header><span>ENVIRONMENT</span><strong>Weather and debris</strong><small>Current: {ENVIRONMENTAL_DOCTRINE_DEFINITIONS[state.environmentalDoctrine].label}</small></header>
              {ENVIRONMENT_DOCTRINES.map((id) => {
                const doctrine = ENVIRONMENTAL_DOCTRINE_DEFINITIONS[id];
                const active = state.environmentalDoctrine === id;
                const safety = doctrine.marginModifier >= 6 ? "SAFEST" : doctrine.rewardMultiplier > 1 ? "MORE RECOVERY" : "BALANCED";
                return (
                  <button type="button" className={active ? "is-active" : ""} aria-pressed={active} onClick={() => onChooseEnvironmentalDoctrine(id)} key={id}>
                    <i aria-hidden="true" /><span><b>{safety}</b><strong>{doctrine.label}</strong><small>{doctrine.summary}</small></span><em>{active ? "ACTIVE" : "ADOPT"}</em>
                  </button>
                );
              })}
            </section>
            <section>
              <header><span>CONTACT</span><strong>Unknown and hostile vessels</strong><small>Current: {DEFENSE_DOCTRINE_DEFINITIONS[state.contactDoctrine].label}</small></header>
              {CONTACT_DOCTRINES.map((id) => {
                const doctrine = DEFENSE_DOCTRINE_DEFINITIONS[id];
                const active = state.contactDoctrine === id;
                const safety = id === "evade" ? "NO AUTO-INJURY" : doctrine.marginModifier >= 6 ? "SAFEST FIGHT" : doctrine.rewardMultiplier > 1 ? "MORE RECOVERY" : "MORE INTELLIGENCE";
                return (
                  <button type="button" className={active ? "is-active" : ""} aria-pressed={active} onClick={() => onChooseContactDoctrine(id)} key={id}>
                    <i aria-hidden="true" /><span><b>{safety}</b><strong>{doctrine.label}</strong><small>{doctrine.summary}</small></span><em>{active ? "ACTIVE" : "ADOPT"}</em>
                  </button>
                );
              })}
            </section>
          </div>
          <details className="defense-order-math">
            <summary>Show exact doctrine modifiers</summary>
            <div>
              {[...ENVIRONMENT_DOCTRINES, ...CONTACT_DOCTRINES].map((id) => {
                const doctrine = getDoctrineDefinition(id);
                return <span key={id}><strong>{doctrine.label}</strong> {doctrine.marginModifier >= 0 ? "+" : ""}{doctrine.marginModifier} readiness margin · x{doctrine.rewardMultiplier} recovery</span>;
              })}
            </div>
          </details>
        </section>
      )}

      {activeTab === "fortifications" && (
        <section className="defense-fortifications-workspace">
          <header className="defense-section-heading">
            <div><span>FORTIFICATIONS</span><h3>Permanent architecture for a ship that survives</h3></div>
            <small>{salvageLabel} Salvage available</small>
          </header>

          {construction && (
            <div className="defense-construction-banner">
              <div><span>ACTIVE PROJECT</span><strong>{DEFENSE_INSTALLATION_DEFINITIONS[construction.installationId].name} · {MARKS[construction.targetMark]}</strong><small>{formatCountdown(Math.max(0, construction.totalSeconds - construction.progressSeconds))} base work remaining</small></div>
              <div className="defense-construction-track"><i style={{ width: `${constructionProgress * 100}%` }} /></div>
            </div>
          )}

          <div className="defense-hull-schematic" aria-hidden="true">
            <div className="defense-hull-line" />
            {roomReinforcements.map((room, index) => (
              <i className={`mark-${room.level}`} style={{ left: `${12 + index * (76 / Math.max(1, roomReinforcements.length - 1))}%` }} key={room.id}><span>{room.level}</span></i>
            ))}
            <strong>ARK · STRUCTURAL MARK MAP</strong>
          </div>

          <section className="defense-fortification-group">
            <header><span>GRID INSTALLATIONS</span><strong>Answer incoming events</strong><small>One construction project at a time</small></header>
            <div className="defense-installation-grid defense-installation-grid-v2">
              {INSTALLATION_IDS.map((id) => {
                const definition = DEFENSE_INSTALLATION_DEFINITIONS[id];
                const quote = installationQuotes[id];
                return (
                  <article key={id} className={quote.mark > 0 ? "is-online" : ""}>
                    <header><span>{definition.name}</span><strong>{MARKS[quote.mark]}</strong></header>
                    <div className="defense-mark-pips" aria-label={`${quote.mark} of ${MAX_INSTALLATION_MARK} Marks complete`}>{Array.from({ length: MAX_INSTALLATION_MARK }, (_, index) => <i className={index < quote.mark ? "is-filled" : ""} key={index} />)}</div>
                    <p>{definition.description}</p>
                    <small>{quote.maxed ? "Architecture complete." : `Next: ${quote.capability}`}</small>
                    <button type="button" disabled={quote.maxed || quote.busy || !quote.canAfford} onClick={() => onBuyInstallation(id)}>{quote.maxed ? "MARK IV COMPLETE" : quote.busy ? "PROJECT BAY OCCUPIED" : !quote.researchMet ? "RESEARCH REQUIRED" : `${MARKS[quote.targetMark]} · ${quote.costLabel}`}</button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="defense-fortification-group">
            <header><span>ROOM REINFORCEMENT</span><strong>Strengthen visible Ark systems</strong><small>Immediate · permanent · Salvage-funded</small></header>
            {roomReinforcements.length > 0 ? (
              <div className="defense-room-grid">
                {roomReinforcements.map((room) => {
                  const maximum = room.level >= room.maxLevel;
                  return (
                    <article key={room.id}>
                      <div className="defense-room-glyph" aria-hidden="true"><i className={`mark-${room.level}`} /></div>
                      <div><span>{room.name}</span><strong>MARK {room.level}/{room.maxLevel}</strong><p>{room.effect}</p></div>
                      <button type="button" disabled={maximum || !room.canUpgrade} onClick={() => onReinforceRoom(room.id)}>{maximum ? "FULLY REINFORCED" : `REINFORCE · ${room.costLabel}`}</button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="continuity-empty-state"><strong>No room reinforcement patterns are available yet.</strong><p>Defense research will reveal permanent structural work here.</p></div>
            )}
          </section>
        </section>
      )}

      {activeTab === "archive" && (
        <section className="defense-archive-workspace">
          <header className="defense-section-heading">
            <div><span>AFTER ACTION</span><h3>Read one incident at a time</h3></div>
            <small>{state.eventLog.length} resolutions · {causalArchive.recoveredEvidence.length}/{causalArchive.totalEvidence} evidence entries</small>
          </header>

          <div className="defense-report-reader">
            <nav aria-label="Incident reports">
              {reverseLog.length > 0 ? reverseLog.map((event, index) => (
                <button type="button" className={index === Math.min(selectedIncident, reverseLog.length - 1) ? "is-active" : ""} onClick={() => setSelectedIncident(index)} key={`${event.resolvedAtSeconds}-${index}`}>
                  <span>{index + 1} · {event.outcome.toUpperCase()}</span>
                  <strong>{DEFENSE_EVENT_DEFINITIONS[event.kind].label}</strong>
                  <small>{titleCase(event.target)} · severity {event.severity}</small>
                </button>
              )) : <p>No incidents recorded.</p>}
            </nav>
            <article>
              {incident ? (
                <>
                  <span>{DEFENSE_EVENT_DEFINITIONS[incident.kind].hostile ? "CONTACT REPORT" : "ENVIRONMENT REPORT"}</span>
                  <h3>{DEFENSE_EVENT_DEFINITIONS[incident.kind].label}</h3>
                  <strong className={`defense-report-outcome is-${incident.outcome}`}>{incident.outcome.toUpperCase()}</strong>
                  <p>{DEFENSE_EVENT_DEFINITIONS[incident.kind].summary}</p>
                  <dl>
                    <div><dt>Target</dt><dd>{titleCase(incident.target)}</dd></div>
                    <div><dt>Doctrine</dt><dd>{getDoctrineDefinition(incident.doctrine).label}</dd></div>
                    <div><dt>Resolution margin</dt><dd>{incident.margin >= 0 ? "+" : ""}{Math.round(incident.margin)}</dd></div>
                    <div><dt>Crew</dt><dd>{incident.injuries.length > 0 ? `${incident.injuries.length} injured` : "No injuries"}</dd></div>
                    <div><dt>Hull</dt><dd>{incident.productionPenalty > 0 ? `${Math.round(incident.productionPenalty * 100)}% temporary load` : "Stable"}</dd></div>
                    <div><dt>Recovery</dt><dd>{incident.salvage > 0 ? `${incident.salvage} Salvage` : "No material recovery"}</dd></div>
                  </dl>
                  {incident.injuries.length > 0 && <p>Medical report: {incident.injuries.map((injury) => `${crewNames[injury.crewId] ?? "Crew member"} lost ${injury.damage} health`).join(", ")}.</p>}
                  {incident.compromise && <p>Compromise: {titleCase(incident.compromise.kind)} affected {titleCase(incident.compromise.target)} for {formatCountdown(incident.compromise.remainingSeconds)}.</p>}
                </>
              ) : (
                <div className="continuity-empty-state"><strong>Nothing has tested the Ark yet.</strong><p>The first resolution will create a complete, readable report here.</p></div>
              )}
            </article>
          </div>

          {(state.firstContactResolved || causalArchive.score > 0) && (
            <section className="defense-causal-reader">
              <header><span>CAUSAL ARCHIVE · {causalArchive.activeClassification.code}</span><strong>{causalArchive.activeClassification.label}</strong><small>{causalArchive.activeClassification.summary}</small></header>
              <div className="causal-classification-track">
                {causalArchive.classifications.map((classification) => (
                  <article className={classification.unlocked ? "is-unlocked" : "is-locked"} key={classification.id}>
                    <span>{classification.code}</span>
                    <strong>{classification.unlocked ? classification.label : "CLASSIFIED"}</strong>
                    <small>{classification.unlocked ? classification.operationalBenefit : `${classification.threshold} evidence + Research`}</small>
                  </article>
                ))}
              </div>
            </section>
          )}

          {state.causalFragmentIds.length > 0 && (
            <section className="defense-fragment-reader">
              <header><span>CAUSAL FRAGMENTS</span><strong>Evidence the contacts failed to erase</strong></header>
              <div>{DEFENSE_CAUSAL_FRAGMENTS.filter((fragment) => state.causalFragmentIds.includes(fragment.id)).map((fragment) => <article key={fragment.id}><span>FRAGMENT</span><strong>{fragment.title}</strong><p>{fragment.text}</p></article>)}</div>
            </section>
          )}
        </section>
      )}
    </section>
  );
}

export default DefenseConsole;
