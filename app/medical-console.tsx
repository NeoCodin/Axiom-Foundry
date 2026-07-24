"use client";

import { HelpTrigger, type ManualTopicId } from "./game-manual";
import { CrewToken, HealthBar, titleCase } from "./crew-view-shared";
import {
  BASE_HEALTH_RECOVERY_PER_HOUR,
  getSurvivorRarity,
  getSurvivorHealthCap,
  getSurvivorSkillLevel,
  isSurvivorWounded,
  type SurvivorSystemState,
} from "./survivor-engine";
import type { ProstheticQuoteView } from "./population-console";

export type MedicalConsoleProps = {
  survivors: SurvivorSystemState;
  currentWorldName: string;
  medBay: {
    carePool: number;
    recoveryPerHour: number;
    diversionPercent: number;
    diversionPerPatientPercent: number;
    researchBonusPercent: number;
    activeProtocols: readonly string[];
    medicalOverCapacity: boolean;
  };
  /** Deployed or stranded crew - cannot be admitted until home. */
  unavailableIds: readonly string[];
  getProstheticQuote: (survivorId: string) => ProstheticQuoteView;
  onProstheticSurgery: (survivorId: string) => void;
  onAdmit: (survivorId: string) => void;
  onDischarge: (survivorId: string) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

const formatEta = (deficit: number, ratePerHour: number) => {
  if (deficit <= 0) return "recovered";
  if (ratePerHour <= 0) return "—";
  const hours = deficit / ratePerHour;
  if (hours < 1) return `${Math.ceil(hours * 60)} min`;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
};

function MedicalConsole({
  survivors: state,
  currentWorldName,
  medBay,
  unavailableIds,
  getProstheticQuote,
  onProstheticSurgery,
  onAdmit,
  onDischarge,
  onOpenHelp,
  onBack,
}: MedicalConsoleProps) {
  const away = new Set(unavailableIds);
  const trainingIds = new Set(state.training.map((program) => program.survivorId));
  const admitted = state.medBayIds
    .map((id) => state.survivors.find((survivor) => survivor.id === id))
    .filter((survivor): survivor is NonNullable<typeof survivor> => Boolean(survivor));
  const ward = state.survivors.filter(
    (survivor) =>
      !state.medBayIds.includes(survivor.id) &&
      (survivor.health < getSurvivorHealthCap(survivor) || survivor.injury),
  );
  const baseRate = medBay.medicalOverCapacity
    ? BASE_HEALTH_RECOVERY_PER_HOUR * 0.5
    : BASE_HEALTH_RECOVERY_PER_HOUR;

  return (
    <section className="continuity-console medical-console" data-guide-target="medical-console" aria-labelledby="medical-console-title">
      <header className="continuity-console-header">
        <div>
          <p>MEDICAL BAY // {currentWorldName.toUpperCase()}</p>
          <h2 id="medical-console-title">Admissions, recovery, and prosthetic surgery</h2>
          <span>
            Admitted patients do nothing but heal — no work, no training, no
            missions — and can be discharged at any moment. Everyone still
            heals slowly on their own; the bay is the fast lane.
          </span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band">
        <div><span>Patients admitted</span><strong>{admitted.length}</strong></div>
        <div title="Summed doctor levels of on-duty Doctors. One level-6 doctor tends like six level-1s.">
          <span>Care pool</span><strong>{medBay.carePool} doctor levels</strong>
        </div>
        <div title={medBay.activeProtocols.length > 0 ? `Research protocols: ${medBay.activeProtocols.join(", ")}` : "No Medical research protocol is active yet."}>
          <span>Bay recovery</span>
          <strong>+{medBay.recoveryPerHour.toFixed(1)}/h per patient</strong>
          {medBay.researchBonusPercent > 0 && <small>Research +{medBay.researchBonusPercent}%</small>}
        </div>
        <div title={`Each occupied bed diverts ${medBay.diversionPerPatientPercent.toFixed(1)}% of ALL Flux production, capped at 40%. Medical research can lower the per-bed draw.`}>
          <span>Flux diversion</span><strong>−{medBay.diversionPercent}% production</strong>
          <small>{medBay.diversionPerPatientPercent.toFixed(1)}% per patient</small>
        </div>
        <div className="continuity-summary-help">
          <span>Manual <HelpTrigger label="Explain the Medical Bay" onClick={() => onOpenHelp("medical")} /></span>
          <strong>{medBay.medicalOverCapacity ? "MEDICAL OVERLOADED — rates halved" : "Medical envelope stable"}</strong>
        </div>
      </div>

      <section className={`continuity-panel ${admitted.length > 0 ? "is-online" : ""}`}>
        <header>
          <div><span>ADMITTED</span><h3>{admitted.length > 0 ? `${admitted.length} under care` : "No patients admitted"}</h3></div>
          <small>Beds divert Flux while occupied</small>
        </header>
        {admitted.length === 0 ? (
          <div className="continuity-empty-state">
            <strong>The bay is empty.</strong>
            <p>Admit hurt crew from the ward below. Prosthetic surgery is performed here, on admitted patients only.</p>
          </div>
        ) : (
          <div className="medbay-rows">
            {admitted.map((survivor) => {
              const cap = getSurvivorHealthCap(survivor);
              const surgery = survivor.injury ? getProstheticQuote(survivor.id) : null;
              return (
                <div className="medbay-row" key={survivor.id}>
                  <CrewToken id={survivor.id} name={survivor.name} role={survivor.role} rarity={getSurvivorRarity(survivor).id} status="wounded" />
                  <span className="medbay-row-name">
                    <strong>{survivor.callsign || survivor.name}</strong>
                    <small>{survivor.role === "civilian" ? "Civilian" : `${titleCase(survivor.role)} · Lv ${getSurvivorSkillLevel(survivor, survivor.role)}`}{survivor.injury ? ` · ${survivor.injury} injury (cap ${cap})` : ""}</small>
                  </span>
                  <span className="crew-health-chip"><HealthBar survivor={survivor} /><small>{Math.round(survivor.health)}</small></span>
                  <span className="medbay-row-eta"><small>{cap - survivor.health <= 0 ? "awaiting surgery" : `full in ${formatEta(cap - survivor.health, medBay.recoveryPerHour)}`}</small></span>
                  <span className="medbay-row-actions">
                    {surgery && (
                      <button
                        type="button"
                        className="forecast-action"
                        disabled={!surgery.canOperate}
                        title={surgery.canOperate ? undefined : surgery.reason ?? undefined}
                        onClick={() => onProstheticSurgery(survivor.id)}
                      >
                        {surgery.canOperate
                          ? `Prosthetic surgery · ${surgery.fluxLabel} + ${surgery.modelCost} Models + ${surgery.sampleCost} Bio`
                          : surgery.reason === "research"
                            ? "Needs Prosthetic Fabrication research"
                            : surgery.reason === "surgeon"
                              ? "Needs a level-5 Doctor on duty"
                              : surgery.reason === "medical"
                                ? "Needs spare medical capacity"
                                : surgery.reason === "flux"
                                  ? `Needs ${surgery.fluxLabel}`
                                  : surgery.reason === "models"
                                    ? `Needs ${surgery.modelCost} Engineering Models`
                                    : `Needs ${surgery.sampleCost} Biological Samples`}
                      </button>
                    )}
                    <button type="button" onClick={() => onDischarge(survivor.id)}>Discharge</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="continuity-panel">
        <header>
          <div><span>WARD</span><h3>{ward.length > 0 ? `${ward.length} recovering on their own` : "Everyone is at full health"}</h3></div>
          <small>Base recovery +{baseRate.toFixed(1)}/h needs no input</small>
        </header>
        {ward.length === 0 ? (
          <div className="continuity-empty-state">
            <strong>No one needs care.</strong>
            <p>Crew hurt on expeditions or arriving wounded from rescues will appear here.</p>
          </div>
        ) : (
          <div className="medbay-rows">
            {ward.map((survivor) => {
              const cap = getSurvivorHealthCap(survivor);
              const blockedReason = away.has(survivor.id)
                ? "deployed"
                : trainingIds.has(survivor.id)
                  ? "in training"
                  : null;
              return (
                <div className="medbay-row" key={survivor.id}>
                  <CrewToken id={survivor.id} name={survivor.name} role={survivor.role} rarity={getSurvivorRarity(survivor).id} status={isSurvivorWounded(survivor) ? "wounded" : "ready"} />
                  <span className="medbay-row-name">
                    <strong>{survivor.callsign || survivor.name}</strong>
                    <small>{survivor.role === "civilian" ? "Civilian" : `${titleCase(survivor.role)} · Lv ${getSurvivorSkillLevel(survivor, survivor.role)}`}{isSurvivorWounded(survivor) ? " · RECOVERING" : ""}{survivor.injury ? ` · ${survivor.injury} injury (cap ${cap})` : ""}</small>
                  </span>
                  <span className="crew-health-chip"><HealthBar survivor={survivor} /><small>{Math.round(survivor.health)}</small></span>
                  <span className="medbay-row-eta"><small>{cap - survivor.health <= 0 ? "awaiting surgery" : `full in ${formatEta(cap - survivor.health, baseRate)}`}</small></span>
                  <span className="medbay-row-actions">
                    <button
                      type="button"
                      disabled={Boolean(blockedReason)}
                      title={blockedReason ? `Cannot admit while ${blockedReason}` : `Admitting speeds recovery to +${medBay.recoveryPerHour.toFixed(1)}/h and diverts ${medBay.diversionPerPatientPercent.toFixed(1)}% production`}
                      onClick={() => onAdmit(survivor.id)}
                    >
                      {blockedReason ? `Away (${blockedReason})` : "Admit to bay"}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export default MedicalConsole;
