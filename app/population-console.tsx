"use client";

import { useMemo, useState, type FormEvent } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  CONTINUITY_EXPERTISE_PRESENTATION,
  getSurvivorContinuityExpertise,
} from "./continuity-expertise";
import type { ExpertiseId } from "./campaign-content";

import {
  BACKGROUND_DEFINITIONS,
  PROFESSIONAL_ROLES,
  SURVIVOR_RARITY_DEFINITIONS,
  TRAIT_DEFINITIONS,
  canSurvivorLearnProfession,
  getLifeSupportStatus,
  getPopulationRoleCounts,
  getSurvivorProfessionCapacity,
  getSurvivorProfessionCount,
  getSurvivorRarity,
  getSurvivorLearningMultiplier,
  getSurvivorOnJobXpPerHour,
  getSurvivorSkillProgress,
  getSurvivorSkillLevel,
  getTrainingQuote,
  type LifeSupportKey,
  type ProfessionalRole,
  type SurvivorRole,
  type SurvivorSystemState,
} from "./survivor-engine";

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

export type PopulationConsoleProps = {
  state: SurvivorSystemState;
  salvage: number;
  currentWorldName: string;
  beaconAvailable: boolean;
  capacityMultiplier: number;
  crewGrowthMultiplier: number;
  requiredExpertiseIds: readonly ExpertiseId[];
  supportUpgradeCosts: Record<LifeSupportKey, number>;
  berthQuote: BerthPanelQuote;
  onStartBerthConstruction: () => void;
  onUpgradeSupport: (key: LifeSupportKey) => void;
  onActivateBeacon: () => void;
  onRescueSignal: () => void;
  onStartTraining: (survivorId: string, role: ProfessionalRole) => void;
  onCancelTraining: (survivorId: string) => void;
  onAssignRole: (survivorId: string, role: SurvivorRole | null) => void;
  onRenameCallsign: (survivorId: string, callsign: string) => void;
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

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PopulationConsole({
  state,
  salvage,
  currentWorldName,
  beaconAvailable,
  capacityMultiplier,
  crewGrowthMultiplier,
  requiredExpertiseIds,
  supportUpgradeCosts,
  berthQuote,
  onStartBerthConstruction,
  onUpgradeSupport,
  onActivateBeacon,
  onRescueSignal,
  onStartTraining,
  onCancelTraining,
  onAssignRole,
  onRenameCallsign,
  onOpenHelp,
  onBack,
}: PopulationConsoleProps) {
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
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
  const selectedJobRole =
    selectedCrew?.assignedRole && selectedCrew.assignedRole !== "civilian"
      ? selectedCrew.assignedRole
      : null;
  const activeSignal = state.activeSignal;
  const activeSignalLifeSupport = activeSignal
    ? getLifeSupportStatus(state, activeSignal.survivors, capacityMultiplier)
    : null;

  const submitCallsign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCrew) return;
    const form = new FormData(event.currentTarget);
    onRenameCallsign(selectedCrew.id, String(form.get("callsign") ?? ""));
  };

  return (
    <section className="continuity-console population-console" aria-labelledby="population-console-title">
      <header className="continuity-console-header">
        <div>
          <p>HUMAN CONTINUITY // {currentWorldName.toUpperCase()}</p>
          <h2 id="population-console-title">Population, training, and life support</h2>
          <span>The Ark never harms people while you are away. Capacity only limits new rescues.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band">
        <div><span>People aboard</span><strong>{state.survivors.length}</strong></div>
        <div><span>Crew berths</span><strong>{state.survivors.length}/{berthQuote.capacity}</strong></div>
        <div><span>Stable capacity</span><strong>{Math.min(berthQuote.capacity, ...Object.values(lifeSupport.capacity))}</strong></div>
        <div><span>Training</span><strong>{state.training.length}/{state.trainingSlots}</strong></div>
        <div><span>Signals answered</span><strong>{state.signalsResolved}</strong></div>
        <div className="continuity-summary-help"><span>Available Salvage <HelpTrigger label="How do I get Salvage?" onClick={() => onOpenHelp("salvage")} /></span><strong>{Math.floor(salvage)}</strong></div>
      </div>

      <section className="continuity-panel support-capacity-panel">
        <header><div><span>ARK STRUCTURE</span><h3>Habitation ring</h3></div><small>{berthQuote.inProgress ? "Section under construction" : berthQuote.capacity <= state.survivors.length ? "Every berth is occupied" : "Berths available"}</small></header>
        <div className="support-upgrade-grid">
          <article>
            <span>Crew berths</span>
            <strong>{state.survivors.length} / {berthQuote.capacity}</strong>
            <div role="progressbar" aria-label="Berth occupancy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, state.survivors.length / Math.max(1, berthQuote.capacity)) * 100)}><i style={{ width: `${Math.min(1, state.survivors.length / Math.max(1, berthQuote.capacity)) * 100}%` }} /></div>
            <small>Structural capacity built by the Foundry. Life support sustains the people berths house.</small>
          </article>
          <article>
            {berthQuote.inProgress ? (
              <>
                <span>Section under construction</span>
                <strong>+{berthQuote.berthsPerSection} berths</strong>
                <div role="progressbar" aria-label="Berth section construction" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(berthQuote.progressRatio * 100)}><i style={{ width: `${berthQuote.progressRatio * 100}%` }} /></div>
                <small>{berthQuote.remainingLabel ?? "Under construction"} · {berthQuote.engineerCount} assigned engineer{berthQuote.engineerCount === 1 ? "" : "s"} · ×{berthQuote.speedMultiplier.toFixed(2)} build speed · continues offline</small>
              </>
            ) : (
              <>
                <span>Extend the habitation ring</span>
                <strong>+{berthQuote.berthsPerSection} berths</strong>
                <button type="button" disabled={berthQuote.maxed || !berthQuote.canAfford} onClick={onStartBerthConstruction}>{berthQuote.maxed ? "Ring complete" : `Begin section · ${berthQuote.costLabel}`}</button>
                <small>Assigned engineers accelerate construction (currently {berthQuote.engineerCount}, ×{berthQuote.speedMultiplier.toFixed(2)} speed).</small>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="continuity-panel support-capacity-panel">
        <header><div><span>STABLE CAPACITY</span><h3>Life-support envelope</h3></div><small>{lifeSupport.stable ? "All current demand covered" : "Increase capacity before the next rescue"}</small></header>
        <div className="support-upgrade-grid">
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

      <div className="continuity-two-column">
        <section className={`continuity-panel survivor-beacon-panel ${state.beaconOnline ? "is-online" : ""}`}>
          <header><div><span>SOS ARRAY</span><h3>{state.beaconOnline ? `${currentWorldName} beacon online` : "Beacon awaiting authorization"}</h3></div><small>{state.beaconOnline ? activeSignal ? "Signal holding" : `${Math.round(state.beaconProgressSeconds)} / 90 sec scan` : "No broadcast"}</small></header>
          {!state.beaconOnline ? (
            <div className="continuity-empty-state">
              <strong>Invite the first witnesses aboard.</strong>
              <p>The beacon can be activated from a planetary orbit. It discovers a new group while the game is open or closed.</p>
              <button type="button" disabled={!beaconAvailable} onClick={onActivateBeacon}>Activate SOS beacon</button>
            </div>
          ) : activeSignal ? (
            <article className="survivor-signal-detail">
              <span>SIGNAL {String(activeSignal.sequence).padStart(2, "0")} · {activeSignal.sourceLabel}</span>
              <h4>{activeSignal.survivors.length} survivors requesting retrieval</h4>
              <ul>
                {activeSignal.survivors.map((survivor) => {
                  const rarity = getSurvivorRarity(survivor);
                  return (
                    <li className={`crew-rarity-${rarity.id}`} key={survivor.id}>
                      <div className="crew-avatar">{survivor.name.slice(0, 1)}</div>
                      <div><strong>{survivor.name}</strong><small>{titleCase(survivor.role)} · {BACKGROUND_DEFINITIONS.find((item) => item.id === survivor.backgroundId)?.name ?? titleCase(survivor.backgroundId)}</small></div>
                      <em className="crew-rarity-badge" title={rarity.description}>{rarity.label}</em>
                    </li>
                  );
                })}
              </ul>
              <div className="signal-readiness">
                <span>{activeSignalLifeSupport?.stable ? "Life support ready" : "Insufficient safe capacity"}</span>
                <span>{activeSignal.rescueCost} Salvage</span>
              </div>
              <button type="button" disabled={!activeSignalLifeSupport?.stable || salvage < activeSignal.rescueCost} onClick={onRescueSignal}>Dispatch rescue shuttle</button>
              <p>This signal never expires. You can leave it here until the Ark is ready.</p>
            </article>
          ) : (
            <div className="continuity-empty-state"><strong>Listening across the drowned world.</strong><p>The next signal appears after 90 seconds of Ark time and remains until answered.</p></div>
          )}
        </section>

        <section className="continuity-panel role-balance-panel">
          <header><div><span>ROSTER SHAPE</span><h3>Current professions</h3></div><small>Civilians are adaptable, not inferior</small></header>
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
      </div>

      <div className="crew-management-grid">
        <section className="continuity-panel crew-roster-panel">
          <header><div><span>CREW ROSTER</span><h3>{state.survivors.length > 0 ? `${state.survivors.length} people aboard` : "The Ark is empty"}</h3></div><small>Canonical identity is never rerolled</small></header>
          {state.survivors.length === 0 ? (
            <div className="continuity-empty-state"><strong>No humans aboard.</strong><p>Restore life support, reach Pelagos, and activate the SOS beacon.</p></div>
          ) : (
            <div className="crew-roster-list">
              {state.survivors.map((survivor) => {
                const training = state.training.find((program) => program.survivorId === survivor.id);
                const rarity = getSurvivorRarity(survivor);
                return (
                  <button className={`crew-rarity-${rarity.id} ${selectedCrew?.id === survivor.id ? "is-selected" : ""}`} type="button" key={survivor.id} onClick={() => setSelectedCrewId(survivor.id)}>
                    <span className="crew-avatar">{survivor.name.slice(0, 1)}</span>
                    <span><strong>{survivor.callsign ? `“${survivor.callsign}” ${survivor.name}` : survivor.name}</strong><small>{training ? `Training ${titleCase(training.targetRole)} · ${Math.round((training.progressSeconds / training.durationSeconds) * 100)}%` : survivor.role === "civilian" ? `Civilian · ${titleCase(survivor.assignedRole ?? "untrained")}` : `${titleCase(survivor.role)} · Level ${getSurvivorSkillLevel(survivor, survivor.role)} · ${titleCase(survivor.assignedRole ?? "unassigned")}`}</small></span>
                    <em className="crew-rarity-badge" title={rarity.description}>{rarity.label}</em>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={`continuity-panel crew-detail-panel ${selectedRarity ? `crew-rarity-${selectedRarity.id}` : ""}`}>
          {selectedCrew ? (
            <>
              <header><div><span>PERSONNEL FILE</span><h3>{selectedCrew.name}</h3></div><div className="crew-file-classification"><em className="crew-rarity-badge" title={selectedRarity?.description}>{selectedRarity?.label}</em><small>{selectedCrew.storyHookId ? "Archive discrepancy attached" : `Joined from ${titleCase(selectedCrew.origin)}`}</small></div></header>
              <div className="crew-detail-identity">
                <span className="crew-avatar large">{selectedCrew.name.slice(0, 1)}</span>
                <div>
                  <strong>{selectedProfessionalRole && selectedSkillProgress ? `${titleCase(selectedProfessionalRole)} · Level ${selectedSkillProgress.level}` : "Civilian · Untrained"}</strong>
                  <small>{BACKGROUND_DEFINITIONS.find((item) => item.id === selectedCrew.backgroundId)?.summary ?? titleCase(selectedCrew.backgroundId)}</small>
                </div>
              </div>
              <section className="crew-career-summary" aria-label="Profession and experience summary">
                <div className="crew-career-heading">
                  <div>
                    <span>CURRENT PROFESSION</span>
                    <strong>{selectedProfessionalRole && selectedSkillProgress ? `${titleCase(selectedProfessionalRole)} · LEVEL ${selectedSkillProgress.level}` : "CIVILIAN · READY TO TRAIN"}</strong>
                    <small>{selectedJobRole ? `${getSurvivorOnJobXpPerHour(selectedCrew, selectedJobRole, crewGrowthMultiplier).toFixed(1)} XP/hour while assigned as ${titleCase(selectedJobRole)}` : "Assign qualified work to earn profession XP offline."}</small>
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
              <form className="crew-callsign-form" onSubmit={submitCallsign}><label htmlFor="crew-callsign">Callsign</label><input id="crew-callsign" name="callsign" maxLength={18} defaultValue={selectedCrew.callsign} placeholder="Optional" /><button type="submit">Save</button></form>
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
                  <p>Train a profession to create measurable Continuity expertise.</p>
                )}
              </section>

              {selectedTraining ? (
                <div className="active-training-card"><span>TRAINING IN PROGRESS</span><strong>{titleCase(selectedTraining.targetRole)}</strong><div><i style={{ width: `${Math.min(100, (selectedTraining.progressSeconds / selectedTraining.durationSeconds) * 100)}%` }} /></div><small>{formatTime((selectedTraining.durationSeconds - selectedTraining.progressSeconds) / crewGrowthMultiplier)} remaining · ×{(getSurvivorLearningMultiplier(selectedCrew) * crewGrowthMultiplier).toFixed(2)} total learning · continues offline</small><button type="button" onClick={() => onCancelTraining(selectedCrew.id)}>Cancel training</button></div>
              ) : (
                <div className="crew-actions-grid">
                  <label>Working assignment<select value={selectedCrew.assignedRole ?? ""} onChange={(event) => onAssignRole(selectedCrew.id, event.target.value ? event.target.value as SurvivorRole : null)}><option value="">Unassigned</option>{selectedCrew.role === "civilian" && <option value="civilian">Civilian support</option>}{PROFESSIONAL_ROLES.filter((role) => selectedCrew.role === role || getSurvivorSkillLevel(selectedCrew, role) > 0).map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
                  <label>Training program{getSurvivorProfessionCount(selectedCrew) >= getSurvivorProfessionCapacity(selectedCrew) ? (
                    <select disabled value=""><option value="">{`Profession capacity reached (${getSurvivorProfessionCapacity(selectedCrew)})`}</option></select>
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
    </section>
  );
}

export default PopulationConsole;
