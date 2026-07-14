"use client";

import { useState } from "react";
import type { ExpeditionSiteId, ExpeditionState } from "./expedition-engine";
import {
  EXPEDITION_SITE_DEFINITIONS,
  MAX_EXPEDITION_CREW,
  MIN_EXPEDITION_CREW,
  getExpeditionSite,
} from "./expedition-engine";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import { HealthBar, formatMissionTime, titleCase } from "./crew-view-shared";
import {
  getSurvivorRarity,
  getSurvivorSkillLevel,
  isSurvivorWounded,
  type SurvivorSystemState,
} from "./survivor-engine";

export type ExpeditionAccessView = {
  available: boolean;
  reason: string | null;
  fluxLabel: string;
  canAffordFlux: boolean;
};

export type ExpeditionPreview = {
  strength: number;
  gearStrength: number;
  researchStrengthBonus: number;
  researchRewardMultiplier: number;
  difficulty: number;
  projectedOutcome: "success" | "lean" | "setback" | "distress" | null;
  weapons: number;
  armor: number;
  loadout: readonly {
    crewId: string;
    weaponId: string | null;
    armorId: string | null;
  }[];
};

const GEAR_SHORT_NAMES: Record<string, string> = {
  "kinetic-pike": "Pike",
  "arc-carbine": "Carbine",
  "null-lance": "Lance",
  "composite-weave": "Weave",
  "reactive-shell": "Shell",
  "aegis-frame": "Frame",
};

export type RescuePreview = {
  canLaunch: boolean;
  reason: string | null;
  strength: number;
  rescueDifficulty: number;
  projectedExtraction: "clean" | "hard" | null;
  fluxLabel: string;
};

export type SurfaceReconView = {
  expeditions: number;
  multiplier: number;
  scanLabel: string;
};

export type ExpeditionConsoleProps = {
  survivors: SurvivorSystemState;
  expeditions: ExpeditionState;
  currentWorldName: string;
  recon: SurfaceReconView;
  expeditionAccess: Readonly<Record<ExpeditionSiteId, ExpeditionAccessView>>;
  surveyStatus: { completed: number; required: number };
  getExpeditionPreview: (
    siteId: ExpeditionSiteId,
    crewIds: readonly string[],
  ) => ExpeditionPreview;
  onLaunchExpedition: (siteId: ExpeditionSiteId, crewIds: readonly string[]) => void;
  getRescuePreview: (crewIds: readonly string[]) => RescuePreview;
  onLaunchRescue: (crewIds: readonly string[]) => void;
  onAbandonStranded: () => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

function ExpeditionConsole({
  survivors: state,
  expeditions,
  currentWorldName,
  recon,
  expeditionAccess,
  surveyStatus,
  getExpeditionPreview,
  onLaunchExpedition,
  getRescuePreview,
  onLaunchRescue,
  onAbandonStranded,
  onOpenHelp,
  onBack,
}: ExpeditionConsoleProps) {
  const [expeditionSiteId, setExpeditionSiteId] = useState<ExpeditionSiteId>("planetary-survey");
  const [expeditionCrewIds, setExpeditionCrewIds] = useState<string[]>([]);
  const [confirmingSetback, setConfirmingSetback] = useState(false);
  const [rescueCrewIds, setRescueCrewIds] = useState<string[]>([]);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  return (
    <section className="continuity-console expedition-console" aria-labelledby="expedition-console-title">
      <header className="continuity-console-header">
        <div>
          <p>EXPEDITION COMMAND // {currentWorldName.toUpperCase()}</p>
          <h2 id="expedition-console-title">Surface missions and crew retrieval</h2>
          <span>Every launch shows its projected outcome first. Missions resolve automatically, online or offline, and no one is ever lost without your explicit order.</span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band">
        <div><span>Status</span><strong>{expeditions.stranded ? "DISTRESS" : expeditions.active ? (expeditions.active.kind === "rescue" ? "Rescue underway" : "Mission underway") : "Bay ready"}</strong></div>
        <div><span>Surveys certified</span><strong>{surveyStatus.required > 0 ? `${Math.min(surveyStatus.completed, surveyStatus.required)}/${surveyStatus.required}` : "—"}</strong></div>
        <div><span>Missions completed</span><strong>{expeditions.stats.completed}</strong></div>
        <div title={`Every successful mission charts this world. SOS scans currently take ${recon.scanLabel}; recon can cut them to a third of the uncharted rate.`}>
          <span>Surface Recon</span>
          <strong>{recon.multiplier >= 1 ? "Uncharted" : `−${Math.round((1 - recon.multiplier) * 100)}% scan time`}</strong>
        </div>
        <div><span>Crew lost</span><strong>{expeditions.stats.abandoned}</strong></div>
        <div className="continuity-summary-help"><span>Manual <HelpTrigger label="Explain the Expeditions page" onClick={() => onOpenHelp("expeditions")} /></span><strong>Signals never expire</strong></div>
      </div>

      {expeditions.stranded && (
        <section className="continuity-panel is-online">
          <header><div><span>DISTRESS</span><h3>Party stranded — awaiting your decision</h3></div><small>They are stable indefinitely</small></header>
          {(() => {
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
                survivor.ageGroup !== "child" &&
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
        </section>
      )}

      <section className="continuity-panel expedition-bay-panel">
        <header><div><span>MISSION BAY</span><h3>{expeditions.active ? (expeditions.active.kind === "rescue" ? "Rescue in flight" : "Expedition in flight") : "Plan the next launch"}</h3></div><small>Navigators level 3+ shorten every trip</small></header>
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
            <div className="expedition-planning-grid">
              <div className="expedition-dossier">
                <span className="expedition-box-label">MISSION</span>
                <h4>{site.name}</h4>
                <strong className="expedition-flight-readout">{Math.round(progress * 100)}% · {formatMissionTime(remaining)} remaining</strong>
                <div role="progressbar" aria-label={`${site.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="crew-xp-track"><i style={{ width: `${progress * 100}%` }} /></div>
                <p>{site.description}</p>
                <ul className="expedition-stat-list">
                  <li><span>Group strength</span><strong>{expeditions.active!.strength} vs {site.difficulty}</strong></li>
                  <li><span>Guarantee</span><strong>The crew always returns</strong></li>
                </ul>
              </div>
              <div className="expedition-manifest">
                <span className="expedition-box-label">PARTY BIOMETRICS</span>
                <div className="expedition-manifest-rows" aria-label="Party biometrics">
                  {members.map(({ survivor, gear, fallbackLabel }, index) => (
                    <div className="expedition-manifest-row" key={survivor?.id ?? index}>
                      <span className="crew-avatar">{(survivor?.name ?? fallbackLabel).slice(0, 1)}</span>
                      <span className="expedition-manifest-name"><strong>{survivor ? survivor.callsign || survivor.name : fallbackLabel}</strong></span>
                      {survivor && <span className="crew-health-chip"><HealthBar survivor={survivor} /><small>{Math.round(survivor.health)}</small></span>}
                      <span className="expedition-gear-tags">
                        {gear?.weaponId && <em title={gear.weaponId}>⚔ {GEAR_SHORT_NAMES[gear.weaponId] ?? "Armed"}</em>}
                        {gear?.armorId && <em title={gear.armorId}>🛡 {GEAR_SHORT_NAMES[gear.armorId] ?? "Armored"}</em>}
                        {!gear?.weaponId && !gear?.armorId && <em className="is-empty">no gear</em>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : (() => {
          const site = getExpeditionSite(expeditionSiteId);
          const access = expeditionAccess[expeditionSiteId];
          const trainingIds = new Set(state.training.map((program) => program.survivorId));
          const woundedCount = state.survivors.filter(isSurvivorWounded).length;
          const eligible = state.survivors.filter(
            (survivor) =>
              survivor.ageGroup !== "child" &&
              !trainingIds.has(survivor.id) &&
              !isSurvivorWounded(survivor),
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
              <div className="expedition-planning-grid">
                <div className="expedition-dossier">
                  <span className="expedition-box-label">DESTINATION DOSSIER</span>
                  <select aria-label="Destination" value={expeditionSiteId} onChange={(event) => { setConfirmingSetback(false); setExpeditionSiteId(event.target.value as ExpeditionSiteId); }}>
                    {EXPEDITION_SITE_DEFINITIONS.map((candidate) => {
                      const candidateAccess = expeditionAccess[candidate.id];
                      return <option key={candidate.id} value={candidate.id} disabled={!candidateAccess.available}>{candidate.name}{candidateAccess.available ? "" : candidateAccess.reason === "locked-world" ? " · later worlds" : candidateAccess.reason === "already-completed" ? " · completed" : candidateAccess.reason === "campaign-incomplete" ? " · after the campaign" : ""}</option>;
                    })}
                  </select>
                  <p className="expedition-lore">{site.description}</p>
                  <ul className="expedition-stat-list">
                    <li><span>Difficulty</span><strong>{site.difficulty}</strong></li>
                    <li><span>Duration</span><strong>{formatMissionTime(site.durationSeconds)} base</strong></li>
                    <li><span>Launch cost</span><strong>{access.fluxLabel}</strong></li>
                    <li><span>Favors</span><strong>{site.focusRoles.length >= 9 ? "Every profession" : site.focusRoles.map(titleCase).join(", ")} · +50% XP</strong></li>
                    {site.countsAsSurvey && <li><span>Certification</span><strong>Counts toward planetary surveys</strong></li>}
                  </ul>
                  <div className="expedition-request">
                    <span>MISSION PROFILE</span>
                    Requests strength {site.difficulty}+ for full success. {Math.max(1, site.difficulty - 7)}+ still returns unharmed with lean rewards; below that the crew comes home wounded{site.difficulty > 16 ? ", and far below it they would be stranded" : ""}. Weapons add strength; Navigators level 3+ fly faster.
                  </div>
                </div>
                <div className="expedition-manifest">
                  <span className="expedition-box-label">CREW MANIFEST · {chosen.length}/{MAX_EXPEDITION_CREW}{woundedCount > 0 ? ` · ${woundedCount} recovering unavailable` : ""}</span>
                  <div className="expedition-manifest-rows expedition-manifest-picker">
                    {eligible.map((survivor) => {
                      const rarity = getSurvivorRarity(survivor);
                      const picked = chosen.includes(survivor.id);
                      const gear = preview?.loadout.find((entry) => entry.crewId === survivor.id) ?? null;
                      return (
                        <label className={`expedition-manifest-row crew-rarity-${rarity.id} ${picked ? "is-selected" : ""}`} key={survivor.id}>
                          <input type="checkbox" checked={picked} onChange={() => toggle(survivor.id)} />
                          <span className="crew-avatar">{survivor.name.slice(0, 1)}</span>
                          <span className="expedition-manifest-name">
                            <strong>{survivor.callsign || survivor.name}</strong>
                            <small>{survivor.role === "civilian" ? "Civilian" : `${titleCase(survivor.role)} · Lv ${getSurvivorSkillLevel(survivor, survivor.role)}`}</small>
                          </span>
                          <span className="crew-health-chip"><HealthBar survivor={survivor} /><small>{Math.round(survivor.health)}</small></span>
                          <span className="expedition-gear-tags">
                            {picked && gear?.weaponId && <em title={gear.weaponId}>⚔ {GEAR_SHORT_NAMES[gear.weaponId] ?? "Armed"}</em>}
                            {picked && gear?.armorId && <em title={gear.armorId}>🛡 {GEAR_SHORT_NAMES[gear.armorId] ?? "Armored"}</em>}
                            {picked && preview && !gear?.weaponId && !gear?.armorId && <em className="is-empty">no gear</em>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
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
                  {(preview.researchStrengthBonus > 0 || preview.researchRewardMultiplier > 1) && (
                    <><br />Research support: +{preview.researchStrengthBonus} strength · +{Math.round((preview.researchRewardMultiplier - 1) * 100)}% recovered resources.</>
                  )}
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
      </section>

      {expeditions.log.length > 0 && (
        <section className="continuity-panel">
          <header><div><span>MISSION LOG</span><h3>Recent results</h3></div><small>Every outcome is explainable</small></header>
          <ul className="deficit-list">
            {[...expeditions.log].reverse().map((entry, index) => {
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
                  <span>{entry.salvage > 0 ? `+${entry.salvage} Salvage · ` : ""}{entry.schematics > 0 ? `+${entry.schematics} Schematics · ` : ""}{entry.nullTraces > 0 ? `+${entry.nullTraces} Null Traces · ` : ""}{entry.surveyCredited ? "survey certified · " : ""}{crewNote}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {expeditions.memorials.length > 0 && (
        <section className="continuity-panel">
          <header><div><span>MEMORIAL WALL</span><h3>The Ark remembers</h3></div><small>Permanent record</small></header>
          <div className="expedition-memorial-wall">
            <ul>
              {[...expeditions.memorials].reverse().map((record, index) => (
                <li key={`${record.crewId}-${index}`}>
                  <span>{record.name}</span>
                  <small>
                    {record.professions.length > 0 ? record.professions.map(titleCase).join(", ") : "Civilian"} · lost at {getExpeditionSite(record.siteId).name}.
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </section>
  );
}

export default ExpeditionConsole;
