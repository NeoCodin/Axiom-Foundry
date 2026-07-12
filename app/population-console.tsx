"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { ExpeditionSiteId, ExpeditionState } from "./expedition-engine";
import {
  EXPEDITION_SITE_DEFINITIONS,
  MAX_EXPEDITION_CREW,
  MIN_EXPEDITION_CREW,
  getExpeditionSite,
} from "./expedition-engine";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  CONTINUITY_EXPERTISE_PRESENTATION,
  getSurvivorContinuityExpertise,
} from "./continuity-expertise";
import type { ExpertiseId } from "./campaign-content";

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
  type Survivor,
  type SurvivorRole,
  type SurvivorSystemState,
} from "./survivor-engine";

export type ExpeditionPreview = {
  strength: number;
  gearStrength: number;
  difficulty: number;
  projectedOutcome: "success" | "lean" | "setback" | "distress" | null;
  weapons: number;
  armor: number;
};

export type RescuePreview = {
  canLaunch: boolean;
  reason: string | null;
  strength: number;
  rescueDifficulty: number;
  projectedExtraction: "clean" | "hard" | null;
  fluxLabel: string;
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

export type PopulationConsoleProps = {
  state: SurvivorSystemState;
  salvage: number;
  currentWorldName: string;
  beaconAvailable: boolean;
  capacityMultiplier: number;
  crewGrowthMultiplier: number;
  requiredExpertiseIds: readonly ExpertiseId[];
  supportUpgradeCosts: Record<LifeSupportKey, number>;
  scanDurationSeconds: number;
  rescueFlux: { cost: number; label: string; affordable: boolean };
  rescueDetail: { active: boolean; enabled: boolean };
  onToggleAutoRescue: (enabled: boolean) => void;
  expeditions: ExpeditionState;
  expeditionAccess: Readonly<Record<ExpeditionSiteId, { available: boolean; reason: string | null; fluxLabel: string; canAffordFlux: boolean }>>;
  surveyStatus: { completed: number; required: number };
  getExpeditionPreview: (
    siteId: ExpeditionSiteId,
    crewIds: readonly string[],
  ) => ExpeditionPreview;
  onLaunchExpedition: (siteId: ExpeditionSiteId, crewIds: readonly string[]) => void;
  getRescuePreview: (crewIds: readonly string[]) => RescuePreview;
  onLaunchRescue: (crewIds: readonly string[]) => void;
  onAbandonStranded: () => void;
  getProstheticQuote: (survivorId: string) => ProstheticQuoteView;
  onProstheticSurgery: (survivorId: string) => void;
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
  // "security" is displayed as "Soldier"; the internal id is unchanged.
  const display = value === "security" ? "soldier" : value;
  return display.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function HealthBar({ survivor }: { survivor: Survivor }) {
  const cap = getSurvivorHealthCap(survivor);
  const wounded = isSurvivorWounded(survivor);
  const capLoss = ((MAX_SURVIVOR_HEALTH - cap) / MAX_SURVIVOR_HEALTH) * 100;
  return (
    <div
      className={`crew-health-track ${wounded ? "is-wounded" : ""} ${cap < MAX_SURVIVOR_HEALTH ? "is-capped" : ""}`}
      role="progressbar"
      aria-label={`Health ${Math.round(survivor.health)} of ${cap}`}
      aria-valuemin={0}
      aria-valuemax={MAX_SURVIVOR_HEALTH}
      aria-valuenow={Math.round(survivor.health)}
      style={{ "--health-cap-loss": `${capLoss}%` } as CSSProperties}
      title={`Health ${Math.round(survivor.health)}/${cap}${survivor.injury ? ` · permanent ${survivor.injury} injury caps health at ${cap} until prosthetic repair` : ""}`}
    >
      <i style={{ width: `${(Math.max(0, survivor.health) / MAX_SURVIVOR_HEALTH) * 100}%` }} />
    </div>
  );
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
  scanDurationSeconds,
  rescueFlux,
  rescueDetail,
  onToggleAutoRescue,
  expeditions,
  expeditionAccess,
  surveyStatus,
  getExpeditionPreview,
  onLaunchExpedition,
  getRescuePreview,
  onLaunchRescue,
  onAbandonStranded,
  getProstheticQuote,
  onProstheticSurgery,
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
  const [expeditionSiteId, setExpeditionSiteId] = useState<ExpeditionSiteId>("planetary-survey");
  const [expeditionCrewIds, setExpeditionCrewIds] = useState<string[]>([]);
  const [confirmingSetback, setConfirmingSetback] = useState(false);
  const [rescueCrewIds, setRescueCrewIds] = useState<string[]>([]);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
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
        <div><span>Crew quarters</span><strong>{state.survivors.length}/{berthQuote.capacity}</strong></div>
        <div><span>Stable capacity</span><strong>{Math.min(berthQuote.capacity, ...Object.values(lifeSupport.capacity))}</strong></div>
        <div title="Concurrent training programs. Slots grow with population (+1 per 20 people) and the Adaptive Instruction and Clinical Commons research projects, up to 12."><span>Training slots</span><strong>{state.training.length}/{state.trainingSlots}</strong></div>
        <div><span>Signals answered</span><strong>{state.signalsResolved}</strong></div>
        <div className="continuity-summary-help"><span>Available Salvage <HelpTrigger label="How do I get Salvage?" onClick={() => onOpenHelp("salvage")} /></span><strong>{Math.floor(salvage)}</strong></div>
      </div>

      <section className="continuity-panel support-capacity-panel">
        <header><div><span>ARK CAPACITY</span><h3>Quarters and life support</h3></div><small>{berthQuote.inProgress ? "Quarters section under construction" : !lifeSupport.stable ? "Increase capacity before the next rescue" : "All current demand covered"}</small></header>
        <div className="support-upgrade-grid">
          <article className="quarters-card">
            <span>Crew quarters</span>
            <strong>{state.survivors.length} / {berthQuote.capacity}</strong>
            {berthQuote.inProgress ? (
              <>
                <div role="progressbar" aria-label="Quarters section construction" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(berthQuote.progressRatio * 100)}><i style={{ width: `${berthQuote.progressRatio * 100}%` }} /></div>
                <small>+{berthQuote.berthsPerSection} building · {berthQuote.remainingLabel ?? "in progress"} · {berthQuote.engineerCount} engineer{berthQuote.engineerCount === 1 ? "" : "s"} ×{berthQuote.speedMultiplier.toFixed(2)} · continues offline</small>
              </>
            ) : (
              <>
                <div role="progressbar" aria-label="Quarters occupancy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, state.survivors.length / Math.max(1, berthQuote.capacity)) * 100)}><i style={{ width: `${Math.min(1, state.survivors.length / Math.max(1, berthQuote.capacity)) * 100}%` }} /></div>
                <button type="button" disabled={berthQuote.maxed || !berthQuote.canAfford} onClick={onStartBerthConstruction}>{berthQuote.maxed ? "Ring complete" : `Build +${berthQuote.berthsPerSection} · ${berthQuote.costLabel}`}</button>
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

      <div className="continuity-two-column">
        <section className={`continuity-panel survivor-beacon-panel ${state.beaconOnline ? "is-online" : ""}`}>
          <header><div><span>SOS ARRAY</span><h3>{state.beaconOnline ? `${currentWorldName} beacon online` : "Beacon awaiting authorization"}</h3></div><small>{state.beaconOnline ? activeSignal ? "Signal holding" : `${Math.round(state.beaconProgressSeconds / 60)} / ${Math.round(scanDurationSeconds / 60)} min scan` : "No broadcast"}</small></header>
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
                <span>{activeSignal.rescueCost} Salvage + {rescueFlux.label}</span>
              </div>
              <button type="button" disabled={!activeSignalLifeSupport?.stable || salvage < activeSignal.rescueCost || !rescueFlux.affordable} onClick={onRescueSignal}>Dispatch rescue shuttle</button>
              {!rescueFlux.affordable && <p>The shuttle launch needs {rescueFlux.label}.</p>}
              <p>This signal never expires. You can leave it here until the Ark is ready.</p>
            </article>
          ) : (
            <div className="continuity-empty-state"><strong>Listening across the drowned world.</strong><p>Each scan takes {Math.round(scanDurationSeconds / 60)} minutes here, and every signal remains until answered.</p></div>
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

      {(Object.values(expeditionAccess).some((entry) => entry.available || entry.reason === "busy") || expeditions.active || expeditions.stranded) && (
        <section className="continuity-panel expedition-bay-panel">
          <header><div><span>EXPEDITION BAY</span><h3>{expeditions.stranded ? "DISTRESS SIGNAL ACTIVE" : expeditions.active ? (expeditions.active.kind === "rescue" ? "Rescue underway" : "Expedition underway") : "Ready to launch"}</h3></div><small>{surveyStatus.required > 0 ? `Planetary surveys ${Math.min(surveyStatus.completed, surveyStatus.required)}/${surveyStatus.required} certified` : "Signals never expire"}</small></header>
          {expeditions.stranded && (() => {
            const stranded = expeditions.stranded!;
            const site = getExpeditionSite(stranded.siteId);
            const members = stranded.crewIds.map((id, index) => ({
              survivor: state.survivors.find((candidate) => candidate.id === id) ?? null,
              gear: stranded.loadout.find((entry) => entry.crewId === id) ?? null,
              fallbackLabel: `Crew ${index + 1}`,
            }));
            const rescueBusy = Boolean(expeditions.active);
            const trainingIds = new Set(state.training.map((program) => program.survivorId));
            const strandedIds = new Set(stranded.crewIds);
            const rescuers = state.survivors.filter(
              (survivor) =>
                !trainingIds.has(survivor.id) &&
                !strandedIds.has(survivor.id) &&
                !isSurvivorWounded(survivor) &&
                !(expeditions.active?.crewIds.includes(survivor.id) ?? false),
            );
            const chosen = rescueCrewIds.filter((id) => rescuers.some((survivor) => survivor.id === id));
            const toggleRescuer = (id: string) =>
              setRescueCrewIds((current) => current.includes(id) ? current.filter((existing) => existing !== id) : current.length >= MAX_EXPEDITION_CREW ? current : [...current, id]);
            const preview = chosen.length >= MIN_EXPEDITION_CREW ? getRescuePreview(chosen) : null;
            return (
              <div className="expedition-distress-panel">
                <strong>Party stranded at {site.name}. They have sheltered in place: stable, alive, and waiting. This signal never expires.</strong>
                <div className="expedition-biometrics" aria-label="Stranded party biometrics">
                  {members.map(({ survivor, gear, fallbackLabel }, index) => (
                    <div key={survivor?.id ?? index}>
                      <span>
                        <strong>{survivor ? survivor.callsign || survivor.name : fallbackLabel}</strong>
                        {survivor && <HealthBar survivor={survivor} />}
                      </span>
                      <small>{gear?.armorId ? "armored" : "no armor"}{survivor?.injury ? ` · ${survivor.injury} injury` : ""}</small>
                    </div>
                  ))}
                </div>
                {rescueBusy ? (
                  <p className="crew-rarity-note">A mission is already underway. The rescue option reopens when the bay clears.</p>
                ) : (
                  <>
                    <p className="crew-rarity-note">Send {MIN_EXPEDITION_CREW}-{MAX_EXPEDITION_CREW} rescuers. Strength {Math.max(1, site.difficulty - 4)}+ extracts everyone cleanly; a weaker party still brings everyone home but takes wounds doing it. A rescue can never strand itself.</p>
                    <div className="settler-selection-list expedition-crew-list">
                      {rescuers.map((survivor) => {
                        const rarity = getSurvivorRarity(survivor);
                        const picked = chosen.includes(survivor.id);
                        return (
                          <label className={`crew-rarity-${rarity.id} ${picked ? "is-selected" : ""}`} key={survivor.id}>
                            <input type="checkbox" checked={picked} onChange={() => toggleRescuer(survivor.id)} />
                            <span className="crew-avatar">{survivor.name.slice(0, 1)}</span>
                            <span><strong>{survivor.callsign || survivor.name}</strong><small>{survivor.role === "civilian" ? "Civilian" : `${titleCase(survivor.role)} · Level ${getSurvivorSkillLevel(survivor, survivor.role)}`}</small></span>
                            <span className="settler-row-status"><b>{picked ? "RESCUE" : ""}</b></span>
                          </label>
                        );
                      })}
                    </div>
                    {preview && (
                      <div className={`expedition-projection ${preview.projectedExtraction === "hard" ? "is-warning" : ""}`} aria-live="polite">
                        <strong>
                          {preview.projectedExtraction === "clean"
                            ? `Projected: CLEAN EXTRACTION (strength ${preview.strength} vs ${preview.rescueDifficulty}) — everyone comes home unharmed`
                            : `Projected: HARD EXTRACTION (strength ${preview.strength} vs ${preview.rescueDifficulty}) — everyone still comes home, but the rescuers will take wounds`}
                        </strong>
                      </div>
                    )}
                    <button
                      className="forecast-action"
                      type="button"
                      disabled={!preview?.canLaunch}
                      onClick={() => { onLaunchRescue(chosen); setRescueCrewIds([]); }}
                    >
                      {chosen.length < MIN_EXPEDITION_CREW
                        ? `Select ${MIN_EXPEDITION_CREW}-${MAX_EXPEDITION_CREW} rescuers`
                        : preview && !preview.canLaunch && preview.reason === "flux"
                          ? `Needs ${preview.fluxLabel}`
                          : `Launch rescue · ${preview?.fluxLabel ?? ""}`}
                    </button>
                    <button
                      className="forecast-action expedition-abandon-action"
                      type="button"
                      onClick={() => {
                        if (!confirmingAbandon) {
                          setConfirmingAbandon(true);
                          return;
                        }
                        setConfirmingAbandon(false);
                        onAbandonStranded();
                      }}
                      onBlur={() => setConfirmingAbandon(false)}
                    >
                      {confirmingAbandon
                        ? `CONFIRM: abandon ${stranded.crewIds.length} people. They will die. This is permanent.`
                        : "Abandon the crew (they are in no danger while you decide)"}
                    </button>
                  </>
                )}
              </div>
            );
          })()}
          {expeditions.active ? (() => {
            const site = getExpeditionSite(expeditions.active!.siteId);
            const progress = Math.min(1, (expeditions.clockSeconds - expeditions.active!.startedAtSeconds) / Math.max(1, expeditions.active!.durationSeconds));
            const remaining = Math.max(0, expeditions.active!.startedAtSeconds + expeditions.active!.durationSeconds - expeditions.clockSeconds);
            const members = expeditions.active!.crewIds.map((id, index) => ({
              survivor: state.survivors.find((candidate) => candidate.id === id) ?? null,
              gear: expeditions.active!.loadout.find((entry) => entry.crewId === id) ?? null,
              fallbackLabel: `Crew ${index + 1}`,
            }));
            return (
              <div className="continuity-empty-state">
                <strong>{site.name} · {Math.round(progress * 100)}% · {formatTime(remaining)} remaining</strong>
                <div role="progressbar" aria-label={`${site.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="crew-xp-track"><i style={{ width: `${progress * 100}%` }} /></div>
                <div className="expedition-biometrics" aria-label="Party biometrics">
                  {members.map(({ survivor, gear, fallbackLabel }, index) => (
                    <div key={survivor?.id ?? index}>
                      <span>
                        <strong>{survivor ? survivor.callsign || survivor.name : fallbackLabel}</strong>
                        {survivor && <HealthBar survivor={survivor} />}
                      </span>
                      <small>{gear?.weaponId ? "armed" : "unarmed"} · {gear?.armorId ? "armored" : "no armor"}</small>
                    </div>
                  ))}
                </div>
                <p>Group strength {expeditions.active!.strength} vs difficulty {site.difficulty}. The crew always returns; wounds heal back aboard the Ark.</p>
              </div>
            );
          })() : (
            <>
              <div className="crew-actions-grid">
                <label>Destination<select value={expeditionSiteId} onChange={(event) => { setConfirmingSetback(false); setExpeditionSiteId(event.target.value as ExpeditionSiteId); }}>
                  {EXPEDITION_SITE_DEFINITIONS.map((site) => {
                    const access = expeditionAccess[site.id];
                    return <option key={site.id} value={site.id} disabled={!access.available}>{site.name}{access.available ? ` · ${access.fluxLabel}` : access.reason === "locked-world" ? " · later worlds" : access.reason === "already-completed" ? " · completed" : access.reason === "campaign-incomplete" ? " · after the campaign" : ""}</option>;
                  })}
                </select></label>
              </div>
              {(() => {
                const site = getExpeditionSite(expeditionSiteId);
                const access = expeditionAccess[expeditionSiteId];
                const trainingIds = new Set(state.training.map((program) => program.survivorId));
                const woundedCount = state.survivors.filter(isSurvivorWounded).length;
                const eligible = state.survivors.filter(
                  (survivor) => !trainingIds.has(survivor.id) && !isSurvivorWounded(survivor),
                );
                const chosen = expeditionCrewIds.filter((id) => eligible.some((survivor) => survivor.id === id));
                const toggle = (id: string) => {
                  setConfirmingSetback(false);
                  setExpeditionCrewIds((current) => current.includes(id) ? current.filter((existing) => existing !== id) : current.length >= MAX_EXPEDITION_CREW ? current : [...current, id]);
                };
                const preview = chosen.length >= MIN_EXPEDITION_CREW ? getExpeditionPreview(expeditionSiteId, chosen) : null;
                const needsConfirm =
                  preview?.projectedOutcome === "setback" ||
                  preview?.projectedOutcome === "distress";
                return (
                  <>
                    <p className="crew-rarity-note">{site.description} Difficulty {site.difficulty} · {formatTime(site.durationSeconds)} base (Navigators level 3+ shorten it) · {access.fluxLabel}{site.countsAsSurvey ? " · counts toward planetary certification" : ""}{woundedCount > 0 ? ` · ${woundedCount} recovering crew unavailable` : ""}</p>
                    <div className="settler-selection-list expedition-crew-list">
                      {eligible.map((survivor) => {
                        const rarity = getSurvivorRarity(survivor);
                        const picked = chosen.includes(survivor.id);
                        return (
                          <label className={`crew-rarity-${rarity.id} ${picked ? "is-selected" : ""}`} key={survivor.id}>
                            <input type="checkbox" checked={picked} onChange={() => toggle(survivor.id)} />
                            <span className="crew-avatar">{survivor.name.slice(0, 1)}</span>
                            <span><strong>{survivor.callsign || survivor.name}</strong><small>{survivor.role === "civilian" ? "Civilian" : `${titleCase(survivor.role)} · Level ${getSurvivorSkillLevel(survivor, survivor.role)}`}</small><HealthBar survivor={survivor} /></span>
                            <span className="settler-row-status"><b>{picked ? "CREW" : ""}</b></span>
                          </label>
                        );
                      })}
                    </div>
                    {preview && (
                      <div className={`expedition-projection ${preview.projectedOutcome === "setback" || preview.projectedOutcome === "distress" ? "is-warning" : ""}`} aria-live="polite">
                        <strong>
                          {preview.projectedOutcome === "success"
                            ? `Projected: SUCCESS (strength ${preview.strength} vs ${preview.difficulty})`
                            : preview.projectedOutcome === "lean"
                              ? `Projected: LEAN RETURN (strength ${preview.strength} vs ${preview.difficulty}) — reduced rewards, nobody hurt`
                              : preview.projectedOutcome === "setback"
                                ? `Projected: SETBACK RISK (strength ${preview.strength} vs ${preview.difficulty}) — the crew will come home wounded`
                                : `Projected: DISTRESS (strength ${preview.strength} vs ${preview.difficulty}) — the crew would be STRANDED and need a rescue mission`}
                        </strong>
                        <br />
                        Auto-equip: {preview.weapons > 0 ? `${preview.weapons} weapon${preview.weapons === 1 ? "" : "s"} (+${preview.gearStrength} strength)` : "no weapons"} · {preview.armor > 0 ? `${preview.armor} armor` : "no armor"}. Forge more in the Armory.
                      </div>
                    )}
                    <button
                      className="forecast-action"
                      type="button"
                      disabled={!access.available || !access.canAffordFlux || chosen.length < MIN_EXPEDITION_CREW}
                      onClick={() => {
                        if (needsConfirm && !confirmingSetback) {
                          setConfirmingSetback(true);
                          return;
                        }
                        setConfirmingSetback(false);
                        onLaunchExpedition(expeditionSiteId, chosen);
                        setExpeditionCrewIds([]);
                      }}
                    >
                      {chosen.length < MIN_EXPEDITION_CREW
                        ? `Select ${MIN_EXPEDITION_CREW}-${MAX_EXPEDITION_CREW} crew`
                        : !access.canAffordFlux
                          ? `Needs ${access.fluxLabel}`
                          : needsConfirm
                            ? confirmingSetback
                              ? "AXIOM objection logged — confirm launch"
                              : `Launch anyway? Crew will be wounded · ${access.fluxLabel}`
                            : `Launch ${site.name} · ${access.fluxLabel}`}
                    </button>
                  </>
                );
              })()}
            </>
          )}
          {expeditions.log.length > 0 && (
            <ul className="deficit-list">
              {[...expeditions.log].slice(-3).reverse().map((entry, index) => {
                const site = getExpeditionSite(entry.siteId);
                const outcomeLabel =
                  entry.outcome === "success" ? "SUCCESS"
                    : entry.outcome === "lean" ? "LEAN RETURN"
                      : entry.outcome === "setback" ? "SETBACK"
                        : entry.outcome === "distress" ? "DISTRESS — CREW STRANDED"
                          : "RESCUE MISSION";
                const crewNote =
                  entry.outcome === "setback"
                    ? `crew returned wounded (${entry.wounds.filter((wound) => wound.armorId).length}/${entry.wounds.length} hits absorbed by armor)`
                    : entry.outcome === "distress"
                      ? "the party sheltered in place and awaits rescue"
                      : entry.outcome === "rescue"
                        ? `${entry.rescuedCrewIds.length} people brought home${entry.wounds.length > 0 ? " · rescuers took wounds" : " · clean extraction"}`
                        : "crew returned safely";
                return (
                  <li key={`${entry.resolvedAtSeconds}-${index}`}>
                    <strong>{site.name} · {outcomeLabel} (strength {Math.round(entry.strength)} vs {entry.difficulty})</strong>
                    <span>{entry.salvage > 0 ? `+${entry.salvage} Salvage · ` : ""}{entry.engineeringModels > 0 ? `+${entry.engineeringModels} recovered schematics · ` : ""}{entry.nullTraces > 0 ? `+${entry.nullTraces} Null Traces · ` : ""}{entry.surveyCredited ? "survey certified · " : ""}{crewNote}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {expeditions.memorials.length > 0 && (
            <div className="expedition-memorial-wall">
              <strong>MEMORIAL WALL</strong>
              <ul>
                {[...expeditions.memorials].reverse().map((record, index) => (
                  <li key={`${record.crewId}-${index}`}>
                    <span>{record.name}</span>
                    <small>
                      {record.professions.length > 0 ? record.professions.map(titleCase).join(", ") : "Civilian"} · lost at {getExpeditionSite(record.siteId).name}. The Ark remembers.
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="crew-management-grid">
        <section className="continuity-panel crew-roster-panel">
          {(() => {
            const trainingIds = new Set(state.training.map((program) => program.survivorId));
            const idleCount = state.survivors.filter(
              (survivor) => !survivor.assignedRole && !trainingIds.has(survivor.id),
            ).length;
            return (
              <header><div><span>CREW ROSTER</span><h3>{state.survivors.length > 0 ? `${state.survivors.length} people aboard` : "The Ark is empty"}</h3></div><small className={idleCount > 0 ? "crew-idle-alert" : ""}>{idleCount > 0 ? `${idleCount} awaiting assignment` : "Everyone has a station"}</small></header>
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
                const idle = !training && !survivor.assignedRole && !wounded;
                return (
                  <button className={`crew-rarity-${rarity.id} ${selectedCrew?.id === survivor.id ? "is-selected" : ""} ${idle ? "is-idle" : ""}`} type="button" key={survivor.id} onClick={() => setSelectedCrewId(survivor.id)}>
                    <span className="crew-avatar">{survivor.name.slice(0, 1)}</span>
                    <span><strong>{survivor.callsign ? `“${survivor.callsign}” ${survivor.name}` : survivor.name}</strong><small>{training ? `Training ${titleCase(training.targetRole)} · ${Math.round((training.progressSeconds / training.durationSeconds) * 100)}%` : survivor.role === "civilian" ? `Civilian · ${titleCase(survivor.assignedRole ?? "untrained")}` : `${titleCase(survivor.role)} · Level ${getSurvivorSkillLevel(survivor, survivor.role)} · ${titleCase(survivor.assignedRole ?? "unassigned")}`}</small>{(wounded || survivor.injury || survivor.health < MAX_SURVIVOR_HEALTH) && <HealthBar survivor={survivor} />}</span>
                    <span className="crew-roster-status">
                      <em className="crew-rarity-badge" title={rarity.description}>{rarity.label}</em>
                      {wounded && <em className="crew-wounded-badge" title={`Health below ${WOUNDED_HEALTH_THRESHOLD}. Recovering aboard the Ark - no work, training, expeditions, or founding until healed.`}>RECOVERING</em>}
                      {survivor.injury && !wounded && <em className="crew-injured-badge" title={`Permanent ${survivor.injury} injury caps health at ${getSurvivorHealthCap(survivor)}. Founding requires ${FOUNDER_HEALTH_THRESHOLD}+.`}>INJURED</em>}
                      {idle && <em className="crew-idle-badge" title="No working assignment. Assign a station to earn profession XP.">UNASSIGNED</em>}
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
                {selectedCrew.injury && (() => {
                  const surgery = getProstheticQuote(selectedCrew.id);
                  return (
                    <button
                      className="forecast-action"
                      type="button"
                      disabled={!surgery.canOperate}
                      onClick={() => onProstheticSurgery(selectedCrew.id)}
                    >
                      {surgery.canOperate
                        ? `Prosthetic Surgery · ${surgery.fluxLabel} + ${surgery.modelCost} Models + ${surgery.sampleCost} Bio Samples`
                        : surgery.reason === "research"
                          ? "Prosthetic Surgery requires the Prosthetic Fabrication research"
                          : surgery.reason === "surgeon"
                            ? "Prosthetic Surgery needs a level-5 Doctor on duty"
                            : surgery.reason === "medical"
                              ? "Prosthetic Surgery needs spare medical capacity"
                              : surgery.reason === "flux"
                                ? `Prosthetic Surgery needs ${surgery.fluxLabel}`
                                : surgery.reason === "models"
                                  ? `Prosthetic Surgery needs ${surgery.modelCost} Engineering Models`
                                  : surgery.reason === "samples"
                                    ? `Prosthetic Surgery needs ${surgery.sampleCost} Biological Samples`
                                    : "Prosthetic Surgery unavailable while deployed"}
                    </button>
                  );
                })()}
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
              ) : isSurvivorWounded(selectedCrew) ? (
                <div className="crew-actions-grid">
                  <label>Working assignment<select disabled value=""><option value="">{`Recovering — available again at ${WOUNDED_HEALTH_THRESHOLD} health`}</option></select></label>
                  <label>Training program<select disabled value=""><option value="">Recovering crew cannot train</option></select></label>
                </div>
              ) : (
                <div className="crew-actions-grid">
                  <label>Working assignment<select value={selectedCrew.assignedRole ?? ""} onChange={(event) => onAssignRole(selectedCrew.id, event.target.value ? event.target.value as SurvivorRole : null)}><option value="">Unassigned</option>{selectedCrew.role === "civilian" && <option value="civilian">Civilian support</option>}{PROFESSIONAL_ROLES.filter((role) => selectedCrew.role === role || getSurvivorSkillLevel(selectedCrew, role) > 0).map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
                  <label>Training program{getSurvivorProfessionCount(selectedCrew) >= getSurvivorProfessionCapacity(selectedCrew) ? (
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
    </section>
  );
}

export default PopulationConsole;
