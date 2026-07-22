"use client";

import { useMemo, useState, type FormEvent } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  BeaconReadinessList,
} from "./beacon-readiness";
import type { BeaconReadiness } from "./beacon-readiness-engine";
import { HealthBar, titleCase } from "./crew-view-shared";
import {
  CONTINUITY_EXPERTISE_PRESENTATION,
  getSurvivorContinuityExpertise,
} from "./continuity-expertise";
import type { ExpertiseId } from "./campaign-content";
import {
  BIOADAPTATION_DEFINITIONS,
  MAX_BIOADAPTATIONS_PER_SURVIVOR,
  type BioadaptationId,
  type BioadaptationState,
} from "./bioadaptation-engine";

import {
  BACKGROUND_DEFINITIONS,
  FOUNDER_HEALTH_THRESHOLD,
  MAX_SURVIVOR_HEALTH,
  PROFESSIONAL_ROLES,
  SURVIVOR_RARITY_DEFINITIONS,
  TRAIT_DEFINITIONS,
  WOUNDED_HEALTH_THRESHOLD,
  canSurvivorLearnProfession,
  getLifeSupportStatus,
  getRescueReadiness,
  getPopulationRoleCounts,
  getSurvivorHealthCap,
  getSurvivorProfessionCapacity,
  getSurvivorProfessionCount,
  getSurvivorRarity,
  getSurvivorLearningMultiplier,
  getSurvivorOnJobXpPerHour,
  getSurvivorSkillProgress,
  getSurvivorSkillLevel,
  getTrainingQuote,
  isSurvivorWounded,
  type LifeSupportKey,
  type ProfessionalRole,
  type SurvivorRole,
  type SurvivorSystemState,
} from "./survivor-engine";

export type TeamAlphaView = {
  leaderId: string | null;
  memberIds: readonly string[];
  rating: number;
  bonusPercent: number;
  doctrine: ProfessionalRole | null;
};

export type ProstheticQuoteView = {
  canOperate: boolean;
  reason: string | null;
  researchMet: boolean;
  fluxLabel: string;
  modelCost: number;
  sampleCost: number;
};

export type BerthPanelQuote = {
  canAfford: boolean;
  costLabel: string;
  capacity: number;
  berthsPerSection: number;
  maxed: boolean;
  inProgress: boolean;
  engineerCount: number;
  speedMultiplier: number;
  remainingLabel: string | null;
  progressRatio: number;
};

export type ProfileElevationView = {
  currentRarity: string;
  targetRarity: string | null;
  researchName: string | null;
  levelRequired: number;
  masteryLevel: number;
  axiomCost: number;
  culturalCost: number;
  proofCost: number;
  nullCost: number;
  canElevate: boolean;
  reason: "missing" | "child" | "maximum" | "research" | "mastery" | "resources" | null;
};

export type BioadaptationQuoteView = {
  canBegin: boolean;
  reason: "missing-crew" | "child" | "charter" | "research" | "already-adapted" | "limit" | "clinic-busy" | "crew-busy" | "crew-wounded" | "resources" | null;
  fluxLabel: string;
  axiomCost: number;
  biologicalSampleCost: number;
  culturalRecordCost: number;
  nullTraceCost: number;
  engineeringModelCost: number;
  durationLabel: string;
};

export type PopulationConsoleProps = {
  state: SurvivorSystemState;
  salvage: number;
  currentWorldName: string;
  systemsUnlocked: boolean;
  commandUnlocked: boolean;
  beaconReadiness: BeaconReadiness;
  capacityMultiplier: number;
  crewGrowthMultiplier: number;
  requiredExpertiseIds: readonly ExpertiseId[];
  supportUpgradeCosts: Record<LifeSupportKey, number>;
  scanDurationSeconds: number;
  rescueFlux: { cost: number; label: string; affordable: boolean };
  rescueDetail: { active: boolean; enabled: boolean };
  onToggleAutoRescue: (enabled: boolean) => void;
  onToggleAutoAssignment: (enabled: boolean) => void;
  onOptimizeAssignments: () => void;
  onReturnToAutoAssignment: (survivorId: string) => void;
  onProtectForArk: (survivorId: string, protectedForArk: boolean) => void;
  teamAlpha: TeamAlphaView;
  onAppointLeader: (survivorId: string | null) => void;
  onToggleTeamMember: (survivorId: string) => void;
  onSetDoctrine: (role: ProfessionalRole | null) => void;
  berthQuote: BerthPanelQuote;
  onStartBerthConstruction: () => void;
  onUpgradeSupport: (key: LifeSupportKey) => void;
  onActivateBeacon: () => void;
  onRescueSignal: () => void;
  onStartTraining: (survivorId: string, role: ProfessionalRole) => void;
  onCancelTraining: (survivorId: string) => void;
  onAssignRole: (survivorId: string, role: SurvivorRole | null) => void;
  onRenameCallsign: (survivorId: string, callsign: string) => void;
  getProfileElevation: (survivorId: string) => ProfileElevationView;
  onElevateProfile: (survivorId: string) => void;
  bioadaptationState: BioadaptationState;
  getBioadaptationQuote: (survivorId: string, adaptationId: BioadaptationId) => BioadaptationQuoteView;
  onStartBioadaptation: (survivorId: string, adaptationId: BioadaptationId) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

const SUPPORT_LABELS: Record<LifeSupportKey, string> = {
  atmosphere: "Atmosphere",
  water: "Water",
  nutrition: "Nutrition",
  medical: "Medical care",
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${minutes}m ${String(rest).padStart(2, "0")}s`;
}


function PopulationConsole({
  state,
  salvage,
  currentWorldName,
  systemsUnlocked,
  commandUnlocked,
  beaconReadiness,
  capacityMultiplier,
  crewGrowthMultiplier,
  requiredExpertiseIds,
  supportUpgradeCosts,
  scanDurationSeconds,
  rescueFlux,
  rescueDetail,
  onToggleAutoRescue,
  onToggleAutoAssignment,
  onOptimizeAssignments,
  onReturnToAutoAssignment,
  onProtectForArk,
  teamAlpha,
  onAppointLeader,
  onToggleTeamMember,
  onSetDoctrine,
  berthQuote,
  onStartBerthConstruction,
  onUpgradeSupport,
  onActivateBeacon,
  onRescueSignal,
  onStartTraining,
  onCancelTraining,
  onAssignRole,
  onRenameCallsign,
  getProfileElevation,
  onElevateProfile,
  bioadaptationState,
  getBioadaptationQuote,
  onStartBioadaptation,
  onOpenHelp,
  onBack,
}: PopulationConsoleProps) {
  const beaconAvailable = beaconReadiness.ready;
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [consoleView, setConsoleView] = useState<"systems" | "roster" | "command">(
    state.survivors.length > 0 ? "roster" : "systems",
  );
  const lifeSupport = useMemo(
    () => getLifeSupportStatus(state, [], capacityMultiplier),
    [capacityMultiplier, state],
  );
  const roleCounts = useMemo(() => getPopulationRoleCounts(state), [state]);
  const selectedCrew = state.survivors.find((survivor) => survivor.id === selectedCrewId) ?? state.survivors[0] ?? null;
  const selectedRarity = selectedCrew ? getSurvivorRarity(selectedCrew) : null;
  const selectedTraining = selectedCrew
    ? state.training.find((program) => program.survivorId === selectedCrew.id) ?? null
    : null;
  const selectedProfessionalRole =
    selectedCrew && selectedCrew.role !== "civilian"
      ? selectedCrew.role
      : null;
  const selectedSkillProgress =
    selectedCrew && selectedProfessionalRole
      ? getSurvivorSkillProgress(selectedCrew, selectedProfessionalRole)
      : null;
  const selectedContinuity = selectedCrew
    ? getSurvivorContinuityExpertise(selectedCrew)
    : null;
  const selectedElevation = selectedCrew
    ? getProfileElevation(selectedCrew.id)
    : null;
  const selectedAdapting = selectedCrew?.id === bioadaptationState.active?.survivorId;
  const selectedJobRole =
    selectedCrew?.assignedRole && selectedCrew.assignedRole !== "civilian"
      ? selectedCrew.assignedRole
      : null;
  const activeSignal = state.activeSignal;
  const activeSignalReadiness = getRescueReadiness(
    state,
    salvage,
    capacityMultiplier,
  );
  const ageCounts = {
    children: state.survivors.filter((survivor) => survivor.ageGroup === "child").length,
    adults: state.survivors.filter((survivor) => survivor.ageGroup === "adult").length,
    elders: state.survivors.filter((survivor) => survivor.ageGroup === "elder").length,
  };

  const submitCallsign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCrew) return;
    const form = new FormData(event.currentTarget);
    onRenameCallsign(selectedCrew.id, String(form.get("callsign") ?? ""));
  };

  return (
    <section className={`continuity-console population-console is-view-${consoleView}`} aria-labelledby="population-console-title">
      <header className="continuity-console-header">
        <div>
          <p>HUMAN CONTINUITY // {currentWorldName.toUpperCase()}</p>
          <h2 id="population-console-title">Crew, training, and living systems</h2>
          <span>AXIOM handles routine staffing. Manual assignments remain protected until you release them.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band" data-guide-target="personnel-summary">
        <div><span>Crew capacity</span><strong>{state.survivors.length}/{berthQuote.capacity}</strong></div>
        <div><span>Community</span><strong>{ageCounts.adults} adults / {ageCounts.children} children / {ageCounts.elders} elders</strong></div>
        <div><span>Stable capacity</span><strong>{Math.min(berthQuote.capacity, ...Object.values(lifeSupport.capacity))}</strong></div>
        <div title="Concurrent profession-study programs. Slots grow with population (+1 per 20 people) and the Adaptive Instruction and Clinical Commons research projects, up to 12."><span>Study slots</span><strong>{state.training.length}/{state.trainingSlots}</strong></div>
        <div><span>Signals answered</span><strong>{state.signalsResolved}</strong></div>
        <div className="continuity-summary-help"><span>Available Salvage <HelpTrigger label="How do I get Salvage?" onClick={() => onOpenHelp("salvage")} /></span><strong>{Math.floor(salvage)}</strong></div>
      </div>

      <nav className="personnel-console-tabs" data-guide-target="personnel-tabs" aria-label="Personnel console sections">
        {systemsUnlocked && <button className={consoleView === "systems" ? "is-active" : ""} type="button" aria-pressed={consoleView === "systems"} onClick={() => setConsoleView("systems")}>
          <span className="personnel-tab-sprite sprite-signal" aria-hidden="true"><i /></span>
          <strong>Rescue & Support</strong><small>Beacon, living space, life support</small>
        </button>}
        <button className={consoleView === "roster" ? "is-active" : ""} type="button" aria-pressed={consoleView === "roster"} onClick={() => setConsoleView("roster")}>
          <span className="personnel-tab-sprite sprite-roster" aria-hidden="true"><i /></span>
          <strong>Crew Roster</strong><small>{state.survivors.length} people aboard</small>
        </button>
        {commandUnlocked && <button className={consoleView === "command" ? "is-active" : ""} type="button" aria-pressed={consoleView === "command"} onClick={() => setConsoleView("command")}>
          <span className="personnel-tab-sprite sprite-command" aria-hidden="true"><i /></span>
          <strong>Command</strong><small>Staffing, Team Alpha, doctrine</small>
        </button>}
      </nav>

      {consoleView === "systems" && (
      <section className="continuity-panel support-capacity-panel">
        <header><div><span>ARK CAPACITY</span><h3>Living space and life support</h3></div><small>{berthQuote.inProgress ? "Living-space section under construction" : !lifeSupport.stable ? "Increase capacity before the next rescue" : berthQuote.maxed ? "Ark structural limit reached" : "All current demand covered"}</small></header>
        <div className="support-upgrade-grid">
          <article className="quarters-card">
            <span>Living space</span>
            <strong>{state.survivors.length} / {berthQuote.capacity}</strong>
            {berthQuote.inProgress ? (
              <>
                <div role="progressbar" aria-label="Living-space section construction" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(berthQuote.progressRatio * 100)}><i style={{ width: `${berthQuote.progressRatio * 100}%` }} /></div>
                <small>+{berthQuote.berthsPerSection} building · {berthQuote.remainingLabel ?? "in progress"} · {berthQuote.engineerCount} engineer{berthQuote.engineerCount === 1 ? "" : "s"} ×{berthQuote.speedMultiplier.toFixed(2)} · continues offline</small>
              </>
            ) : (
              <>
                <div role="progressbar" aria-label="Living-space occupancy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, state.survivors.length / Math.max(1, berthQuote.capacity)) * 100)}><i style={{ width: `${Math.min(1, state.survivors.length / Math.max(1, berthQuote.capacity)) * 100}%` }} /></div>
                <button type="button" disabled={berthQuote.maxed || !berthQuote.canAfford} onClick={onStartBerthConstruction}>{berthQuote.maxed ? "Ark capacity reached" : `Expand +${berthQuote.berthsPerSection} · ${berthQuote.costLabel}`}</button>
                <small>Foundry-built structure; assigned engineers speed construction (now {berthQuote.engineerCount}, ×{berthQuote.speedMultiplier.toFixed(2)}).</small>
              </>
            )}
          </article>
          {(Object.keys(SUPPORT_LABELS) as LifeSupportKey[]).map((key) => {
            const capacity = lifeSupport.capacity[key];
            const demand = lifeSupport.demand[key];
            const cost = supportUpgradeCosts[key];
            const ratio = Math.min(1, demand / Math.max(1, capacity));
            return (
              <article key={key}>
                <span>{SUPPORT_LABELS[key]}</span>
                <strong>{demand} / {capacity}</strong>
                <div role="progressbar" aria-label={`${SUPPORT_LABELS[key]} capacity`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}><i style={{ width: `${ratio * 100}%` }} /></div>
                <button type="button" disabled={salvage < cost} onClick={() => onUpgradeSupport(key)}>Expand +4 · {cost} Salvage</button>
              </article>
            );
          })}
        </div>
      </section>
      )}

      <div className="continuity-two-column">
        {consoleView === "systems" && (
        <section className={`continuity-panel survivor-beacon-panel ${state.beaconOnline ? "is-online" : ""}`}>
          <header><div><span>SOS ARRAY</span><h3>{state.beaconOnline ? `${currentWorldName} beacon online` : "Beacon awaiting authorization"}</h3></div><small>{state.beaconOnline ? activeSignal ? "Signal holding" : `${Math.round(state.beaconProgressSeconds / 60)} / ${Math.round(scanDurationSeconds / 60)} min scan` : "No broadcast"}</small></header>
          {!state.beaconOnline ? (
            <div className="continuity-empty-state">
              <strong>Invite the first witnesses aboard.</strong>
              <p>Complete every readiness condition below, then authorize the broadcast. Each life-support expansion adds four capacity.</p>
              <BeaconReadinessList readiness={beaconReadiness} />
              <button type="button" disabled={!beaconAvailable} onClick={onActivateBeacon}>Activate SOS beacon</button>
            </div>
          ) : activeSignal ? (
            <article className="survivor-signal-detail">
              <span>SIGNAL {String(activeSignal.sequence).padStart(2, "0")} · {activeSignal.sourceLabel}</span>
              <h4>{activeSignal.survivors.length} survivors requesting retrieval</h4>
              <ul>
                {activeSignal.survivors.map((survivor) => {
                  const rarity = getSurvivorRarity(survivor);
                  const professionLevel =
                    survivor.role === "civilian"
                      ? 0
                      : getSurvivorSkillLevel(survivor, survivor.role);
                  return (
                    <li className={`crew-rarity-${rarity.id}`} key={survivor.id}>
                      <div className="crew-avatar">{survivor.name.slice(0, 1)}</div>
                      <div>
                        <strong>{survivor.name}</strong>
                        <small>{titleCase(survivor.ageGroup)} · {titleCase(survivor.role)}{professionLevel > 1 ? ` · Level ${professionLevel}` : ""} · {BACKGROUND_DEFINITIONS.find((item) => item.id === survivor.backgroundId)?.name ?? titleCase(survivor.backgroundId)}</small>
                        {(isSurvivorWounded(survivor) || survivor.injury || survivor.health < MAX_SURVIVOR_HEALTH) && <HealthBar survivor={survivor} />}
                      </div>
                      <span className="crew-roster-status">
                        {isSurvivorWounded(survivor) && <em className="crew-wounded-badge" title="Arrives needing care: extra medical demand until healed.">HURT</em>}
                        <em className="crew-rarity-badge" title={rarity.description}>{rarity.label}</em>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {(() => {
                const cargo = activeSignal.cargo;
                const gearNames = [
                  ...cargo.weaponTiers.map((tier) => tier === 1 ? "Kinetic Pike" : tier === 2 ? "Arc Carbine" : "Null Lance"),
                  ...cargo.armorTiers.map((tier) => tier === 1 ? "Composite Weave" : tier === 2 ? "Reactive Shell" : "Aegis Frame"),
                ];
                const parts = [
                  cargo.schematics > 0 ? `${Math.round(cargo.schematics)} recovered schematics` : null,
                  cargo.nullTraces > 0 ? `${Math.round(cargo.nullTraces)} Null Traces` : null,
                  ...gearNames,
                ].filter(Boolean);
                return parts.length > 0 ? (
                  <p className="signal-cargo-manifest"><strong>They carry:</strong> {parts.join(" · ")}</p>
                ) : null;
              })()}
              <div className="signal-readiness">
                <span>{activeSignalReadiness.canRescue
                  ? "Living systems ready"
                  : activeSignalReadiness.reason === "roster-full"
                    ? "Ark limit: 48 people"
                    : activeSignalReadiness.reason === "berths"
                      ? "More living space required"
                      : activeSignalReadiness.reason === "life-support"
                        ? "Expand life support"
                        : activeSignalReadiness.reason === "salvage"
                          ? "More Salvage required"
                          : "Rescue waiting"}</span>
                <span>{activeSignal.rescueCost} Salvage + {rescueFlux.label}</span>
              </div>
              <button type="button" disabled={!activeSignalReadiness.canRescue || !rescueFlux.affordable} onClick={onRescueSignal}>Dispatch rescue shuttle</button>
              {!rescueFlux.affordable && <p>The shuttle launch needs {rescueFlux.label}.</p>}
              <p>This signal never expires. You can leave it here until the Ark is ready.</p>
            </article>
          ) : (
            <div className="continuity-empty-state"><strong>Listening across the drowned world.</strong><p>Each scan takes {Math.round(scanDurationSeconds / 60)} minutes here, and every signal remains until answered. Completed expeditions chart the surface and shorten future scans.</p></div>
          )}
          {state.beaconOnline && (
            <label className="toggle-row">
              <span>
                <strong>Survivor Duty</strong>
                <small>{rescueDetail.active ? "Rescue detail ready: a level-5 Navigator and level-3 Soldier are assigned. Rescues dispatch automatically when every requirement is met." : "Assign a level-5 Navigator and a level-3 Soldier to dispatch rescues automatically."}</small>
              </span>
              <input type="checkbox" disabled={!rescueDetail.active} checked={rescueDetail.enabled && rescueDetail.active} onChange={(event) => onToggleAutoRescue(event.target.checked)} />
            </label>
          )}
        </section>
        )}

        {consoleView === "command" && (
        <section className="continuity-panel role-balance-panel">
          <header><div><span>AXIOM STAFFING</span><h3>Automatic crew placement</h3></div><small>Strongest learned profession by default</small></header>
          <label className="toggle-row">
            <span>
              <strong>Automatic staffing</strong>
              <small>AXIOM refills routine work after study, recovery, expeditions, and rescues. Manual assignments stay locked.</small>
            </span>
            <input type="checkbox" checked={state.autoAssignmentEnabled} onChange={(event) => onToggleAutoAssignment(event.target.checked)} />
          </label>
          <button className="forecast-action" type="button" onClick={onOptimizeAssignments}>Optimize all crew</button>
          <p>Adults default to their highest-level profession. Elders are automatically placed only in medicine, research, navigation, or education. Children attend school and are never assigned to work or missions.</p>
          <header><div><span>ROSTER SHAPE</span><h3>Current professions</h3></div><small>Ark Reserve covers absences and performs light maintenance</small></header>
          <div className="role-count-grid">
            {Object.entries(roleCounts).map(([role, count]) => <div key={role}><span>{titleCase(role)}</span><strong>{count}</strong></div>)}
          </div>
          <p>Every specialist can gain experience while assigned. Civilians train faster and let you shape the population around each world&apos;s needs.</p>
          <div className="crew-rarity-key" aria-label="Survivor rarity colors">
            {SURVIVOR_RARITY_DEFINITIONS.map((rarity) => (
              <span className={`crew-rarity-${rarity.id}`} title={rarity.description} key={rarity.id}>
                <i aria-hidden="true" />
                {rarity.label} · ×{rarity.learningMultiplier.toFixed(2)} learning
              </span>
            ))}
          </div>
          <small className="crew-rarity-note">Color measures how scarce a profile&apos;s aptitudes and traits are—never the worth of a person. Rarity speeds training and job XP and sets profession capacity (Standard 1 · Notable 2 · Exceptional 3 · Anomalous unlimited); it never multiplies Continuity expertise directly.</small>
        </section>
        )}
      </div>

      {consoleView === "command" && state.survivors.length > 0 && (
        <section className="continuity-panel team-alpha-panel">
          <header>
            <div><span>TEAM ALPHA // COMMAND</span><h3>{teamAlpha.leaderId ? "Chain of command established" : "No crew leader appointed"}</h3></div>
            <small>{teamAlpha.rating > 0 ? `Command rating ${teamAlpha.rating} · +${teamAlpha.bonusPercent}% training & job XP for everyone` : "Appoint a leader from any personnel file"}</small>
          </header>
          <div className="team-alpha-slots">
            {(() => {
              const slot = (survivorId: string | null, label: string, key: string) => {
                const survivor = survivorId ? state.survivors.find((candidate) => candidate.id === survivorId) ?? null : null;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`team-alpha-slot ${survivor ? "is-filled" : ""} ${label === "LEADER" ? "is-leader" : ""}`}
                    onClick={() => survivor && setSelectedCrewId(survivor.id)}
                    disabled={!survivor}
                    title={survivor ? "Open personnel file" : "Assign from a personnel file below"}
                  >
                    <span className="team-alpha-slot-label">{label}</span>
                    {survivor ? (
                      <>
                        <strong>{survivor.callsign || survivor.name}</strong>
                        <small>{survivor.role === "civilian" ? "Civilian" : `${titleCase(survivor.role)} · Lv ${getSurvivorSkillLevel(survivor, survivor.role)}`}{isSurvivorWounded(survivor) ? " · recovering (not counting)" : ""}</small>
                      </>
                    ) : (
                      <strong className="is-empty">EMPTY</strong>
                    )}
                  </button>
                );
              };
              return (
                <>
                  {slot(teamAlpha.leaderId, "LEADER", "leader")}
                  {[0, 1, 2].map((index) =>
                    slot(teamAlpha.memberIds[index] ?? null, `OFFICER ${index + 1}`, `member-${index}`),
                  )}
                </>
              );
            })()}
          </div>
          <div className="crew-actions-grid">
            <label>
              Training doctrine (lean)
              <select
                value={teamAlpha.doctrine ?? ""}
                disabled={!teamAlpha.leaderId}
                onChange={(event) => onSetDoctrine(event.target.value ? (event.target.value as ProfessionalRole) : null)}
              >
                <option value="">{teamAlpha.leaderId ? "Off — train manually" : "Requires a crew leader"}</option>
                {PROFESSIONAL_ROLES.map((role) => (
                  <option key={role} value={role}>Lean {titleCase(role)}</option>
                ))}
              </select>
            </label>
          </div>
          <small className="crew-rarity-note">The doctrine fills empty study slots with the best eligible adult in Ark Reserve — it never cancels manual programs or pulls anyone off a station. The command bonus counts on-duty team members only; wounded or deployed officers pause their contribution.</small>
        </section>
      )}

      {consoleView === "roster" && (
      <div className="crew-management-grid">
        <section className="continuity-panel crew-roster-panel" data-guide-target="personnel-roster">
          {(() => {
            const trainingIds = new Set(state.training.map((program) => program.survivorId));
            const reserveCount = state.survivors.filter(
              (survivor) => !survivor.assignedRole && !trainingIds.has(survivor.id) && survivor.id !== bioadaptationState.active?.survivorId,
            ).length;
            return (
              <header><div><span>CREW ROSTER</span><h3>{state.survivors.length > 0 ? `${state.survivors.length} people aboard` : "The Ark is empty"}</h3></div><small>{reserveCount > 0 ? `${reserveCount} in Ark Reserve` : "Everyone has a station"}</small></header>
            );
          })()}
          {state.survivors.length === 0 ? (
            <div className="continuity-empty-state"><strong>No humans aboard.</strong><p>Restore life support, reach Pelagos, and activate the SOS beacon.</p></div>
          ) : (
            <div className="crew-roster-list">
              {state.survivors.map((survivor) => {
                const training = state.training.find((program) => program.survivorId === survivor.id);
                const rarity = getSurvivorRarity(survivor);
                const wounded = isSurvivorWounded(survivor);
                const adapting = bioadaptationState.active?.survivorId === survivor.id;
                const reserve = !training && !survivor.assignedRole && !wounded && !adapting;
                return (
                  <button className={`crew-rarity-${rarity.id} ${selectedCrew?.id === survivor.id ? "is-selected" : ""} ${reserve ? "is-idle" : ""}`} type="button" key={survivor.id} onClick={() => setSelectedCrewId(survivor.id)}>
                    <span className="crew-avatar">{survivor.name.slice(0, 1)}</span>
                    <span><strong>{survivor.callsign ? `“${survivor.callsign}” ${survivor.name}` : survivor.name}</strong><small>{titleCase(survivor.ageGroup)} · {adapting ? "Bioadaptation procedure" : training ? `Studying ${titleCase(training.targetRole)} · ${Math.round((training.progressSeconds / training.durationSeconds) * 100)}%` : survivor.role === "civilian" ? titleCase(survivor.assignedRole ?? "Ark Reserve") : `${titleCase(survivor.role)} · Level ${getSurvivorSkillLevel(survivor, survivor.role)} · ${titleCase(survivor.assignedRole ?? "Ark Reserve")}`}</small>{(wounded || survivor.injury || survivor.health < MAX_SURVIVOR_HEALTH) && <HealthBar survivor={survivor} />}</span>
                    <span className="crew-roster-status">
                      <em className="crew-rarity-badge" title={rarity.description}>{rarity.label}</em>
                      {wounded && <em className="crew-wounded-badge" title={`Health below ${WOUNDED_HEALTH_THRESHOLD}. Recovering aboard the Ark - no work, training, expeditions, or founding until healed.`}>RECOVERING</em>}
                      {survivor.injury && !wounded && <em className="crew-injured-badge" title={`Permanent ${survivor.injury} injury caps health at ${getSurvivorHealthCap(survivor)}. Founding requires ${FOUNDER_HEALTH_THRESHOLD}+.`}>INJURED</em>}
                      {survivor.settlementProtected && <em className="crew-idle-badge" title="Protected for the Ark. This person cannot be selected for planetary departure.">ARK PROTECTED</em>}
                      {adapting && <em className="crew-adapting-badge" title="Voluntary clinical procedure in progress. This person is temporarily off duty.">CLINIC</em>}
                      {reserve && <em className="crew-idle-badge" title="Ark Reserve automatically covers absences and performs light maintenance.">RESERVE</em>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={`continuity-panel crew-detail-panel ${selectedRarity ? `crew-rarity-${selectedRarity.id}` : ""}`}>
          {selectedCrew ? (
            <>
              <header><div><span>PERSONNEL FILE</span><h3>{selectedCrew.name}</h3></div><div className="crew-file-classification"><em className="crew-rarity-badge" title={selectedRarity?.description}>{selectedRarity?.label}</em><small>{titleCase(selectedCrew.ageGroup)} · {selectedCrew.storyHookId ? "Archive discrepancy attached" : `Joined from ${titleCase(selectedCrew.origin)}`}</small></div></header>
              <div className="crew-detail-identity">
                <span className="crew-avatar large">{selectedCrew.name.slice(0, 1)}</span>
                <div>
                  <strong>{selectedCrew.ageGroup === "child" ? "Child · Education program" : selectedProfessionalRole && selectedSkillProgress ? `${titleCase(selectedProfessionalRole)} · Level ${selectedSkillProgress.level}` : "Civilian · Ready to learn"}</strong>
                  <small>{BACKGROUND_DEFINITIONS.find((item) => item.id === selectedCrew.backgroundId)?.summary ?? titleCase(selectedCrew.backgroundId)}</small>
                </div>
              </div>
              <section className="crew-career-summary" aria-label="Profession and experience summary">
                <div className="crew-career-heading">
                  <div>
                    <span>CURRENT PROFESSION</span>
                    <strong>{selectedCrew.ageGroup === "child" ? "EDUCATION · PROTECTED" : selectedProfessionalRole && selectedSkillProgress ? `${titleCase(selectedProfessionalRole)} · LEVEL ${selectedSkillProgress.level}` : "CIVILIAN · READY TO STUDY"}</strong>
                    <small>{selectedCrew.ageGroup === "child" ? `Becomes an adult after ${Math.max(0, 2 - selectedCrew.ageProgress)} more planetary chapter${2 - selectedCrew.ageProgress === 1 ? "" : "s"}.` : selectedJobRole ? `${getSurvivorOnJobXpPerHour(selectedCrew, selectedJobRole, crewGrowthMultiplier).toFixed(1)} XP/hour while assigned as ${titleCase(selectedJobRole)}` : "Ark Reserve covers absences and performs light maintenance."}</small>
                  </div>
                  <div className="crew-learning-rate">
                    <span>PERSONAL LEARNING</span>
                    <strong>×{getSurvivorLearningMultiplier(selectedCrew).toFixed(2)}</strong>
                    <small>Ark instruction ×{crewGrowthMultiplier.toFixed(2)}</small>
                    <small>
                      Profession slots {getSurvivorProfessionCount(selectedCrew)}/
                      {getSurvivorProfessionCapacity(selectedCrew)} · {selectedRarity?.label ?? "Standard"} capacity
                    </small>
                  </div>
                </div>
                {selectedSkillProgress && (
                  <div className="crew-xp-readout">
                    <div><span>PROFESSION XP</span><strong>{selectedSkillProgress.isMaxLevel ? `${Math.floor(selectedSkillProgress.xp).toLocaleString()} · MAX LEVEL` : `${Math.floor(selectedSkillProgress.xp).toLocaleString()} / ${selectedSkillProgress.nextLevelXp?.toLocaleString()} XP`}</strong></div>
                    <div className="crew-xp-track" role="progressbar" aria-label={`${titleCase(selectedProfessionalRole!)} experience`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(selectedSkillProgress.progress * 100)}><i style={{ width: `${selectedSkillProgress.progress * 100}%` }} /></div>
                  </div>
                )}
              </section>
              <section className="crew-xp-readout" aria-label="Biometrics">
                <div>
                  <span>BIOMETRICS</span>
                  <strong>
                    {Math.round(selectedCrew.health)}/{getSurvivorHealthCap(selectedCrew)} HEALTH
                    {isSurvivorWounded(selectedCrew) ? " · RECOVERING" : selectedCrew.injury ? ` · ${selectedCrew.injury.toUpperCase()} INJURY` : ""}
                  </strong>
                </div>
                <HealthBar survivor={selectedCrew} />
                {isSurvivorWounded(selectedCrew) ? (
                  <small className="crew-rarity-note">Recovering: no work, training, expeditions, or founding until health passes {WOUNDED_HEALTH_THRESHOLD}. Recovery runs even while the game is closed; assigned Doctors speed it up.</small>
                ) : selectedCrew.injury ? (
                  <small className="crew-rarity-note">A permanent {selectedCrew.injury} injury caps health at {getSurvivorHealthCap(selectedCrew)}. Founding a colony requires {FOUNDER_HEALTH_THRESHOLD}+ health.</small>
                ) : null}
                {selectedCrew.injury && (
                  <small className="crew-rarity-note">Prosthetic surgery is performed in the Medical Bay — admit them there to repair this injury.</small>
                )}
              </section>
              <div className="team-alpha-actions">
                {teamAlpha.leaderId === selectedCrew.id ? (
                  <button type="button" onClick={() => onAppointLeader(null)}>Stand down as Crew Leader</button>
                ) : (
                  <button type="button" disabled={selectedCrew.ageGroup === "child" || selectedAdapting} onClick={() => onAppointLeader(selectedCrew.id)}>{selectedCrew.ageGroup === "child" ? "Children cannot join command" : selectedAdapting ? "Volunteer is in the clinic" : "Appoint as Crew Leader"}</button>
                )}
                {teamAlpha.leaderId !== selectedCrew.id && (
                  teamAlpha.memberIds.includes(selectedCrew.id) ? (
                    <button type="button" onClick={() => onToggleTeamMember(selectedCrew.id)}>Remove from Team Alpha</button>
                  ) : (
                    <button
                      type="button"
                      disabled={teamAlpha.memberIds.length >= 3 || selectedCrew.ageGroup === "child" || selectedAdapting}
                      onClick={() => onToggleTeamMember(selectedCrew.id)}
                    >
                      {selectedCrew.ageGroup === "child" ? "Children cannot join command" : selectedAdapting ? "Volunteer is in the clinic" : teamAlpha.memberIds.length >= 3 ? "Team Alpha is full (3 officers)" : "Add to Team Alpha"}
                    </button>
                  )
                )}
              </div>
              <form className="crew-callsign-form" onSubmit={submitCallsign}><label htmlFor="crew-callsign">Callsign</label><input id="crew-callsign" name="callsign" maxLength={18} defaultValue={selectedCrew.callsign} placeholder="Optional" /><button type="submit">Save</button></form>
              <details className="crew-advanced-record">
                <summary>
                  <span>ADVANCED PROFILE SYSTEMS</span>
                  <strong>Elevation &amp; voluntary adaptation</strong>
                  <small>Open when you want permanent, late-stage options</small>
                </summary>
                <div className="crew-advanced-record-body">
              {selectedElevation && (
                <section className="crew-profile-elevation" aria-label="Profile elevation">
                  <header>
                    <div>
                      <span>PROFILE ELEVATION</span>
                      <strong>
                        {selectedElevation.targetRarity
                          ? `${titleCase(selectedElevation.currentRarity)} → ${titleCase(selectedElevation.targetRarity)}`
                          : `${titleCase(selectedElevation.currentRarity)} profile complete`}
                      </strong>
                    </div>
                    <small>Permanent · identity and XP preserved</small>
                  </header>
                  {selectedElevation.targetRarity ? (
                    <>
                      <p>
                        Recognize earned mastery as a permanent service profile. Elevation raises
                        learning speed and profession capacity; it never replaces this person,
                        their callsign, history, traits, or learned levels.
                      </p>
                      <div className="profile-elevation-costs">
                        <span>Mastery <b>LV {selectedElevation.masteryLevel}/{selectedElevation.levelRequired}</b></span>
                        <span>Axioms <b>{selectedElevation.axiomCost}</b></span>
                        <span>Culture <b>{selectedElevation.culturalCost}</b></span>
                        {selectedElevation.proofCost > 0 && <span>Proofs <b>{selectedElevation.proofCost}</b></span>}
                        {selectedElevation.nullCost > 0 && <span>Null <b>{selectedElevation.nullCost}</b></span>}
                      </div>
                      <button
                        type="button"
                        disabled={!selectedElevation.canElevate}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Permanently elevate ${selectedCrew.callsign || selectedCrew.name} to ${titleCase(selectedElevation.targetRarity!)}? Their identity and all profession XP will be preserved.`,
                            )
                          ) onElevateProfile(selectedCrew.id);
                        }}
                      >
                        {selectedElevation.canElevate
                          ? `Elevate to ${titleCase(selectedElevation.targetRarity)}`
                          : selectedElevation.reason === "research"
                            ? `Requires ${selectedElevation.researchName}`
                            : selectedElevation.reason === "mastery"
                              ? `Requires profession mastery level ${selectedElevation.levelRequired}`
                              : "Required evidence unavailable"}
                      </button>
                    </>
                  ) : (
                    <p>This service profile has reached the Ark&apos;s highest recognized classification.</p>
                  )}
                  {selectedCrew.profileElevations.length > 0 && (
                    <small>
                      Service record: {selectedCrew.profileElevations.map((record) => `${titleCase(record.from)} → ${titleCase(record.to)}`).join(" · ")}
                    </small>
                  )}
                </section>
              )}
              {getBioadaptationQuote(selectedCrew.id, "atmospheric-adaptation").reason !== "charter" && (
                <section className="bioadaptation-clinic" aria-label="Voluntary bioadaptation">
                  <header>
                    <div><span>BIOADAPTATION CLINIC // VOLUNTARY</span><strong>{selectedCrew.bioadaptations.length}/{MAX_BIOADAPTATIONS_PER_SURVIVOR} permanent choices</strong></div>
                    <small>Never required for rarity, service, settlement, or Continuity</small>
                  </header>
                  <p>Each adult may freely choose up to two permanent protocols. Procedures preserve name, identity, history, profession levels, rarity, and the right to refuse.</p>
                  {selectedAdapting && bioadaptationState.active && (() => {
                    const definition = BIOADAPTATION_DEFINITIONS.find((entry) => entry.id === bioadaptationState.active!.adaptationId)!;
                    const progress = Math.min(1, bioadaptationState.active.progressSeconds / bioadaptationState.active.totalSeconds);
                    return (
                      <div className="active-bioadaptation">
                        <span>CLINICAL PROCEDURE ACTIVE</span>
                        <strong>{definition.name} · {Math.round(progress * 100)}%</strong>
                        <div><i style={{ width: `${progress * 100}%` }} /></div>
                        <small>{formatTime(Math.max(0, bioadaptationState.active.totalSeconds - bioadaptationState.active.progressSeconds))} base work remaining · continues offline · volunteer off duty</small>
                      </div>
                    );
                  })()}
                  <div className="bioadaptation-grid">
                    {BIOADAPTATION_DEFINITIONS.map((definition) => {
                      const completed = selectedCrew.bioadaptations.some((record) => record.id === definition.id);
                      const quote = getBioadaptationQuote(selectedCrew.id, definition.id);
                      const locked = quote.reason === "research" || quote.reason === "charter";
                      return (
                        <article className={completed ? "is-complete" : locked ? "is-locked" : ""} key={definition.id}>
                          <header><span>{definition.code}</span><strong>{definition.name}</strong></header>
                          <p>{definition.summary}</p>
                          <small>{definition.completedSummary}</small>
                          {completed ? (
                            <><em>ADAPTATION RECORDED</em><blockquote>{definition.contradiction}</blockquote></>
                          ) : (
                            <>
                              <div className="bioadaptation-costs">
                                <span>{quote.durationLabel}</span><span>{quote.fluxLabel} Flux</span><span>{quote.axiomCost} Axiom{quote.axiomCost === 1 ? "" : "s"}</span>
                                {quote.biologicalSampleCost > 0 && <span>{quote.biologicalSampleCost} Bio</span>}
                                {quote.culturalRecordCost > 0 && <span>{quote.culturalRecordCost} Culture</span>}
                                {quote.engineeringModelCost > 0 && <span>{quote.engineeringModelCost} Models</span>}
                                {quote.nullTraceCost > 0 && <span>{quote.nullTraceCost} Null</span>}
                              </div>
                              <button
                                type="button"
                                disabled={!quote.canBegin}
                                onClick={() => {
                                  if (window.confirm(`${definition.consent}\n\nAuthorize ${definition.name} for ${selectedCrew.callsign || selectedCrew.name}? This permanent choice cannot be reversed.`)) {
                                    onStartBioadaptation(selectedCrew.id, definition.id);
                                  }
                                }}
                              >
                                {quote.canBegin
                                  ? "Review consent and begin"
                                  : quote.reason === "research"
                                    ? `Requires ${definition.requiredResearchName}`
                                    : quote.reason === "charter"
                                      ? "Requires Voluntary Adaptation Charter"
                                      : quote.reason === "limit"
                                        ? "Personal limit reached"
                                        : quote.reason === "already-adapted"
                                          ? "Adaptation recorded"
                                          : quote.reason === "child"
                                            ? "Adults may volunteer"
                                            : quote.reason === "clinic-busy"
                                              ? "Clinic occupied"
                                              : quote.reason === "crew-busy"
                                                ? "Volunteer unavailable"
                                                : quote.reason === "crew-wounded"
                                                  ? "Recovery required first"
                                                  : "Resources unavailable"}
                              </button>
                            </>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
                </div>
              </details>
              <div className="team-alpha-actions">
                <button type="button" disabled={!selectedCrew.assignmentLocked || selectedCrew.ageGroup === "child"} onClick={() => onReturnToAutoAssignment(selectedCrew.id)}>{selectedCrew.assignmentLocked ? "Return assignment to AXIOM" : "Assignment managed by AXIOM"}</button>
                <button type="button" onClick={() => onProtectForArk(selectedCrew.id, !selectedCrew.settlementProtected)}>{selectedCrew.settlementProtected ? "Allow planetary selection" : "Protect for the Ark"}</button>
              </div>
              <details className="crew-advanced-record crew-qualification-record">
                <summary>
                  <span>QUALIFICATIONS &amp; CONTINUITY</span>
                  <strong>Profession levels, traits, and founding value</strong>
                  <small>Open the complete personnel record</small>
                </summary>
                <div className="crew-advanced-record-body">
              <div className="crew-trait-list">
                {selectedCrew.traits.map((traitId) => {
                  const trait = TRAIT_DEFINITIONS.find((item) => item.id === traitId);
                  return <span key={traitId} title={trait?.description}>{trait?.name ?? titleCase(traitId)}</span>;
                })}
              </div>
              <div className="crew-skill-grid">
                {PROFESSIONAL_ROLES.map((role) => {
                  const progress = getSurvivorSkillProgress(selectedCrew, role);
                  return (
                    <div className={`${progress.level > 0 ? "is-qualified" : ""} ${selectedProfessionalRole === role ? "is-current" : ""}`} key={role}>
                      <span>{titleCase(role)}</span>
                      <strong>{progress.level > 0 ? `LV ${progress.level}` : "UNTRAINED"}</strong>
                      <div className="crew-skill-progress"><i style={{ width: `${progress.progress * 100}%` }} /></div>
                      <small>{progress.level > 0 ? `${Math.floor(progress.xp).toLocaleString()} XP · ` : ""}Aptitude {selectedCrew.aptitudes[role]}/5</small>
                    </div>
                  );
                })}
              </div>

              <section className="crew-continuity-contribution">
                <header><div><span>CONTINUITY CONTRIBUTION</span><strong>What this person adds to a founding roster</strong></div><HelpTrigger label="Explain crew levels and Continuity" onClick={() => onOpenHelp("settlement")} /></header>
                {selectedContinuity && Object.values(selectedContinuity).some((value) => value > 0) ? (
                  <ul>
                    {(Object.entries(selectedContinuity) as [ExpertiseId, number][]).filter(([, value]) => value > 0).map(([expertiseId, value]) => {
                      const presentation = CONTINUITY_EXPERTISE_PRESENTATION[expertiseId];
                      const requiredHere = requiredExpertiseIds.includes(expertiseId);
                      return <li className={requiredHere ? "is-required" : ""} key={expertiseId}><div><strong>{presentation.label} +{value}</strong><small>{presentation.formula}</small></div><em>{requiredHere ? `REQUIRED ON ${currentWorldName.toUpperCase()}` : "FUTURE VALUE"}</em></li>;
                    })}
                  </ul>
                ) : (
                  <p>{selectedCrew.ageGroup === "child" ? "Children contribute to Community Readiness as the settlement's future, but they are never counted as workers or Expertise." : "Study a profession to create measurable Continuity Expertise."}</p>
                )}
              </section>
                </div>
              </details>

              {selectedTraining ? (
                <div className="active-training-card"><span>STUDY IN PROGRESS</span><strong>{titleCase(selectedTraining.targetRole)}</strong><div><i style={{ width: `${Math.min(100, (selectedTraining.progressSeconds / selectedTraining.durationSeconds) * 100)}%` }} /></div><small>{formatTime((selectedTraining.durationSeconds - selectedTraining.progressSeconds) / crewGrowthMultiplier)} remaining · ×{(getSurvivorLearningMultiplier(selectedCrew) * crewGrowthMultiplier).toFixed(2)} total learning · continues offline</small><button type="button" onClick={() => onCancelTraining(selectedCrew.id)}>Pause study</button></div>
              ) : selectedCrew.ageGroup === "child" ? (
                <div className="continuity-empty-state"><strong>Education program active.</strong><p>Children occupy living space and contribute to Community Readiness, but never work, train for a profession, join command, or enter an expedition. Growth advances through planetary chapters, never a real-time deadline.</p></div>
              ) : selectedAdapting ? (
                <div className="crew-actions-grid">
                  <label>Working assignment<select disabled value=""><option value="">Bioadaptation clinic · temporarily off duty</option></select></label>
                  <label>Training program<select disabled value=""><option value="">Clinical procedure continues offline</option></select></label>
                </div>
              ) : isSurvivorWounded(selectedCrew) ? (
                <div className="crew-actions-grid">
                  <label>Working assignment<select disabled value=""><option value="">{`Recovering — available again at ${WOUNDED_HEALTH_THRESHOLD} health`}</option></select></label>
                  <label>Training program<select disabled value=""><option value="">Recovering crew cannot train</option></select></label>
                </div>
              ) : (
                <div className="crew-actions-grid">
                  <label>Working assignment<select value={selectedCrew.assignedRole ?? ""} onChange={(event) => onAssignRole(selectedCrew.id, event.target.value ? event.target.value as SurvivorRole : null)}><option value="">Ark Reserve</option>{selectedCrew.role === "civilian" && <option value="civilian">Civilian support</option>}{PROFESSIONAL_ROLES.filter((role) => selectedCrew.role === role || getSurvivorSkillLevel(selectedCrew, role) > 0).map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
                  <label>Study a profession{getSurvivorProfessionCount(selectedCrew) >= getSurvivorProfessionCapacity(selectedCrew) ? (
                    <select disabled value=""><option value="">{`Profession capacity reached (${getSurvivorProfessionCapacity(selectedCrew)})`}</option></select>
                  ) : state.training.length >= state.trainingSlots ? (
                    <select disabled value=""><option value="">{`All ${state.trainingSlots} training slots busy — more at +20 population or via research`}</option></select>
                  ) : (
                    <select defaultValue="" onChange={(event) => { if (event.target.value) onStartTraining(selectedCrew.id, event.target.value as ProfessionalRole); event.target.value = ""; }}><option value="">Choose profession…</option>{PROFESSIONAL_ROLES.filter((role) => canSurvivorLearnProfession(selectedCrew, role)).map((role) => { const quote = getTrainingQuote(selectedCrew, role); return <option key={role} value={role}>{titleCase(role)} · {formatTime(quote.durationSeconds / crewGrowthMultiplier)}</option>; })}</select>
                  )}</label>
                </div>
              )}
            </>
          ) : (
            <div className="continuity-empty-state"><strong>No personnel file selected.</strong><p>Rescued people retain their name, history, traits, aptitudes, and choices.</p></div>
          )}
        </section>
      </div>
      )}
    </section>
  );
}

export default PopulationConsole;
