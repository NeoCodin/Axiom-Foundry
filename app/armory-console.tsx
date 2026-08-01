"use client";

import { useState } from "react";
import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  ARMORY_ITEM_DEFINITIONS,
  ARMORY_LAWS,
  ARMORY_MODIFICATIONS,
  type ArmoryItemDefinition,
  type ArmoryItemId,
  type ArmoryLawId,
  type ArmoryMark,
  type ArmoryModificationId,
} from "./armory-engine";

export type ArmoryItemQuoteView = {
  ready: number;
  damaged: number;
  researchMet: boolean;
  canCraft: boolean;
  reason: "research" | "flux" | "models" | "traces" | null;
  craftCostLabel: string;
  repairCostLabel: string;
  canRepair: boolean;
  researchName: string;
  wielders: number;
  mark: ArmoryMark;
  effectivePrimary: string;
  effectiveDurability: number;
  modification: ArmoryModificationId | null;
  upgrade: {
    targetMark: ArmoryMark | null;
    canStart: boolean;
    reason: string | null;
    costLabel: string;
    durationLabel: string;
    researchName: string | null;
  };
  modifications: readonly {
    id: ArmoryModificationId;
    available: boolean;
    canInstall: boolean;
    costLabel: string;
    researchName: string;
  }[];
};

export type ArmoryConsoleProps = {
  currentWorldName: string;
  quotes: Readonly<Record<ArmoryItemId, ArmoryItemQuoteView>>;
  activeProject: { itemName: string; targetMark: ArmoryMark; progress: number; remainingLabel: string } | null;
  laws: Readonly<Record<ArmoryLawId, { level: number; maxed: boolean; cost: number; canBuy: boolean; researchMet: boolean; researchName: string }>>;
  onCraft: (itemId: ArmoryItemId) => void;
  onRepair: (itemId: ArmoryItemId) => void;
  onUpgrade: (itemId: ArmoryItemId) => void;
  onModification: (itemId: ArmoryItemId, modificationId: ArmoryModificationId | null) => void;
  onBuyLaw: (lawId: ArmoryLawId) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

type ArmoryTab = "inventory" | "development" | "laws";
const ROMAN: Record<ArmoryMark, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

function frameStatus(item: ArmoryItemDefinition, quote: ArmoryItemQuoteView) {
  if (!quote.researchMet) return `LOCKED · ${quote.researchName}`;
  if (quote.damaged > 0) return `${quote.ready} READY · ${quote.damaged} DAMAGED`;
  return `${quote.ready} READY · MARK ${ROMAN[quote.mark]}`;
}

export default function ArmoryConsole({
  currentWorldName,
  quotes,
  activeProject,
  laws,
  onCraft,
  onRepair,
  onUpgrade,
  onModification,
  onBuyLaw,
  onOpenHelp,
  onBack,
}: ArmoryConsoleProps) {
  const [activeTab, setActiveTab] = useState<ArmoryTab>("inventory");
  const [selectedItemId, setSelectedItemId] = useState<ArmoryItemId>(ARMORY_ITEM_DEFINITIONS[0].id);
  const selectedItem = ARMORY_ITEM_DEFINITIONS.find((item) => item.id === selectedItemId) ?? ARMORY_ITEM_DEFINITIONS[0];
  const selectedQuote = quotes[selectedItem.id];
  const weapons = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "weapon");
  const armor = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "armor");
  const totalReady = ARMORY_ITEM_DEFINITIONS.reduce((sum, item) => sum + quotes[item.id].ready, 0);
  const completedLaws = (Object.keys(ARMORY_LAWS) as ArmoryLawId[]).reduce((sum, id) => sum + laws[id].level, 0);

  const chooseItem = (itemId: ArmoryItemId, nextTab: ArmoryTab = activeTab) => {
    setSelectedItemId(itemId);
    setActiveTab(nextTab);
  };

  return (
    <section className="continuity-console armory-console armory-console-v2" data-guide-target="armory-console" aria-labelledby="armory-console-title">
      <header className="continuity-console-header">
        <div>
          <p>PERSONNEL · ARMORY · {currentWorldName.toUpperCase()}</p>
          <h2 id="armory-console-title">Ark Armory</h2>
          <span>Six trusted frames. Select one pattern, then decide whether to forge, repair, or develop it.</span>
        </div>
        <div className="armory-header-actions">
          <HelpTrigger label="Explain Armory progression" onClick={() => onOpenHelp("armory")} />
          <button type="button" onClick={onBack}>Return to Personnel</button>
        </div>
      </header>

      <nav className="armory-workspace-tabs" data-guide-target="armory-tabs" aria-label="Armory stations">
        <button type="button" className={activeTab === "inventory" ? "is-active" : ""} aria-pressed={activeTab === "inventory"} onClick={() => setActiveTab("inventory")}><span>1</span><strong>Inventory</strong><small>{totalReady} FRAMES READY</small></button>
        <button type="button" className={activeTab === "development" ? "is-active" : ""} aria-pressed={activeTab === "development"} onClick={() => setActiveTab("development")}><span>2</span><strong>Development</strong><small>{activeProject ? "PROJECT ACTIVE" : "FORGE IDLE"}</small></button>
        <button type="button" className={activeTab === "laws" ? "is-active" : ""} aria-pressed={activeTab === "laws"} onClick={() => setActiveTab("laws")}><span>3</span><strong>Permanent Laws</strong><small>{completedLaws} LEVELS PROVEN</small></button>
      </nav>

      {activeProject && (
        <section className="armory-project-ribbon" aria-live="polite">
          <div><span>ACTIVE DEVELOPMENT</span><strong>{activeProject.itemName} · MARK {ROMAN[activeProject.targetMark]}</strong><small>{activeProject.remainingLabel} remains · continues offline</small></div>
          <div><i style={{ width: `${Math.max(1, activeProject.progress * 100)}%` }} /></div>
        </section>
      )}

      {activeTab === "inventory" && (
        <section className="armory-inventory-workspace">
          <div className="armory-frame-racks">
            <section>
              <header><span>WEAPON RACK</span><strong>Controlled force</strong></header>
              <div>{weapons.map((item) => {
                const quote = quotes[item.id];
                return (
                  <button type="button" className={`${selectedItem.id === item.id ? "is-selected" : ""} ${quote.researchMet ? "is-online" : "is-locked"}`} aria-pressed={selectedItem.id === item.id} onClick={() => chooseItem(item.id)} key={item.id}>
                    <span className={`armory-frame-sprite is-${item.kind} item-${item.id}`} aria-hidden="true"><i /><i /><i /></span>
                    <span><b>MARK {ROMAN[quote.mark]}</b><strong>{item.name}</strong><small>{frameStatus(item, quote)}</small></span>
                  </button>
                );
              })}</div>
            </section>
            <section>
              <header><span>ARMOR RACK</span><strong>Survival architecture</strong></header>
              <div>{armor.map((item) => {
                const quote = quotes[item.id];
                return (
                  <button type="button" className={`${selectedItem.id === item.id ? "is-selected" : ""} ${quote.researchMet ? "is-online" : "is-locked"}`} aria-pressed={selectedItem.id === item.id} onClick={() => chooseItem(item.id)} key={item.id}>
                    <span className={`armory-frame-sprite is-${item.kind} item-${item.id}`} aria-hidden="true"><i /><i /><i /></span>
                    <span><b>MARK {ROMAN[quote.mark]}</b><strong>{item.name}</strong><small>{frameStatus(item, quote)}</small></span>
                  </button>
                );
              })}</div>
            </section>
          </div>

          <aside className="armory-selected-pattern">
            <span>SELECTED PATTERN · {selectedItem.kind.toUpperCase()}</span>
            <h3>{selectedItem.name}</h3>
            <p>{selectedItem.description}</p>
            <div className="armory-selected-visual" aria-hidden="true">
              <span className={`armory-frame-sprite is-${selectedItem.kind} item-${selectedItem.id}`}><i /><i /><i /></span>
              <i className="scan-a" /><i className="scan-b" />
            </div>
            <dl>
              <div><dt>{selectedItem.kind === "weapon" ? "Expedition strength" : "Wound damage"}</dt><dd>{selectedQuote.effectivePrimary}</dd></div>
              {selectedItem.kind === "armor" && <div><dt>Durability</dt><dd>{selectedQuote.effectiveDurability} hits</dd></div>}
              <div><dt>Qualified crew</dt><dd>{selectedQuote.wielders}</dd></div>
              <div><dt>Active fit</dt><dd>{selectedQuote.modification ? ARMORY_MODIFICATIONS[selectedQuote.modification].name : "Standard"}</dd></div>
            </dl>
            <div className="armory-inventory-actions">
              <button type="button" disabled={!selectedQuote.canCraft} onClick={() => onCraft(selectedItem.id)}>{selectedQuote.canCraft ? `FORGE · ${selectedQuote.craftCostLabel}` : selectedQuote.reason === "research" ? `REQUIRES ${selectedQuote.researchName}` : `NEEDS ${selectedQuote.craftCostLabel}`}</button>
              {selectedQuote.damaged > 0 && <button type="button" disabled={!selectedQuote.canRepair} onClick={() => onRepair(selectedItem.id)}>{selectedQuote.canRepair ? `REPAIR ONE · ${selectedQuote.repairCostLabel}` : `NEEDS ${selectedQuote.repairCostLabel}`}</button>}
              <button type="button" onClick={() => setActiveTab("development")}>OPEN DEVELOPMENT</button>
            </div>
          </aside>
        </section>
      )}

      {activeTab === "development" && (
        <section className="armory-development-workspace">
          <nav aria-label="Select frame to develop">
            {ARMORY_ITEM_DEFINITIONS.map((item) => <button type="button" className={item.id === selectedItem.id ? "is-active" : ""} onClick={() => chooseItem(item.id, "development")} key={item.id}><span>{item.kind.toUpperCase()}</span><strong>{item.name}</strong><small>MARK {ROMAN[quotes[item.id].mark]}</small></button>)}
          </nav>
          <article className="armory-development-bench">
            <header>
              <div><span>FRAME DEVELOPMENT</span><h3>{selectedItem.name}</h3></div>
              <strong>MARK {ROMAN[selectedQuote.mark]}</strong>
            </header>
            <div className="armory-development-track" aria-label={`Mark ${selectedQuote.mark} of 4`}>
              {([1, 2, 3, 4] as ArmoryMark[]).map((mark) => <i className={mark <= selectedQuote.mark ? "is-complete" : mark === selectedQuote.upgrade.targetMark ? "is-next" : ""} key={mark}><b>{ROMAN[mark]}</b></i>)}
            </div>
            <section>
              <span>NEXT MARK</span>
              <strong>{selectedQuote.upgrade.targetMark ? `MARK ${ROMAN[selectedQuote.upgrade.targetMark]}` : "PATTERN COMPLETE"}</strong>
              <p>{selectedQuote.upgrade.targetMark ? `${selectedQuote.upgrade.costLabel} · ${selectedQuote.upgrade.durationLabel}` : "Maximum known refinement reached."}</p>
              {selectedQuote.upgrade.researchName && <small>Design gate: {selectedQuote.upgrade.researchName}</small>}
              <button type="button" disabled={!selectedQuote.upgrade.canStart} onClick={() => onUpgrade(selectedItem.id)}>{selectedQuote.upgrade.canStart ? `BEGIN MARK ${selectedQuote.upgrade.targetMark ? ROMAN[selectedQuote.upgrade.targetMark] : ""}` : selectedQuote.upgrade.reason ?? "UNAVAILABLE"}</button>
            </section>
            <section>
              <span>SPECIALIZATION SLOT</span>
              <strong>{selectedQuote.modification ? ARMORY_MODIFICATIONS[selectedQuote.modification].name : "STANDARD PATTERN"}</strong>
              <div className="armory-specialization-options">
                {selectedQuote.modifications.map((mod) => (
                  <button type="button" className={selectedQuote.modification === mod.id ? "is-active" : ""} disabled={!mod.available || (!mod.canInstall && selectedQuote.modification !== mod.id)} onClick={() => onModification(selectedItem.id, selectedQuote.modification === mod.id ? null : mod.id)} key={mod.id}>
                    <strong>{ARMORY_MODIFICATIONS[mod.id].name}</strong>
                    <small>{ARMORY_MODIFICATIONS[mod.id].description}</small>
                    <em>{selectedQuote.modification === mod.id ? "FITTED · SELECT TO REMOVE" : mod.available ? mod.costLabel : `REQUIRES ${mod.researchName}`}</em>
                  </button>
                ))}
              </div>
            </section>
          </article>
        </section>
      )}

      {activeTab === "laws" && (
        <section className="armory-laws-workspace">
          <header><div><span>RECALIBRATION LAWS</span><h3>Permanent doctrine, proven through Research</h3></div><small>Axioms make each law survive every future Recalibration.</small></header>
          <div>
            {(Object.keys(ARMORY_LAWS) as ArmoryLawId[]).map((id, index) => {
              const law = ARMORY_LAWS[id];
              const quote = laws[id];
              return (
                <article key={id}>
                  <span>{index + 1} · LAW LEVEL {quote.level}/{law.maxLevel}</span>
                  <div className="armory-law-glyph" aria-hidden="true"><i /><i /><i /></div>
                  <h3>{law.name}</h3>
                  <p>{law.description}</p>
                  <small>{quote.researchMet ? `PROVEN · ${quote.researchName}` : `RESEARCH REQUIRED · ${quote.researchName}`}</small>
                  <button type="button" disabled={!quote.canBuy} onClick={() => onBuyLaw(id)}>{quote.maxed ? "LAW COMPLETE" : !quote.researchMet ? `REQUIRES ${quote.researchName}` : `MAKE PERMANENT · ${quote.cost} AXIOMS`}</button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
