"use client";

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

const ROMAN: Record<ArmoryMark, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

function ArmoryItemCard({ item, quote, onCraft, onRepair, onUpgrade, onModification }: {
  item: ArmoryItemDefinition;
  quote: ArmoryItemQuoteView;
  onCraft: (itemId: ArmoryItemId) => void;
  onRepair: (itemId: ArmoryItemId) => void;
  onUpgrade: (itemId: ArmoryItemId) => void;
  onModification: (itemId: ArmoryItemId, modificationId: ArmoryModificationId | null) => void;
}) {
  return (
    <article className={`armory-item-card ${quote.researchMet ? "is-online" : "is-locked"}`}>
      <header>
        <div><span>{item.kind.toUpperCase()} FRAME · MARK {ROMAN[quote.mark]}</span><h3>{item.name}</h3></div>
        <div className="armory-stock-readout"><strong>{quote.ready}</strong><small>ready{quote.damaged ? ` · ${quote.damaged} damaged` : ""}</small></div>
      </header>
      <p>{item.description}</p>
      <ul className="armory-item-stats">
        <li><span>{item.kind === "weapon" ? "Expedition strength" : "Wound damage"}</span><strong>{quote.effectivePrimary}</strong></li>
        {item.kind === "armor" && <li><span>Frame durability</span><strong>{quote.effectiveDurability} hits</strong></li>}
        <li><span>Carrier qualification</span><strong>Level {item.wieldLevel}+ · {quote.wielders} aboard</strong></li>
        <li><span>Active fit</span><strong>{quote.modification ? ARMORY_MODIFICATIONS[quote.modification].name : "Standard pattern"}</strong></li>
      </ul>

      <div className="armory-mark-project">
        <div><span>FRAME DEVELOPMENT</span><strong>{quote.upgrade.targetMark ? `Mark ${ROMAN[quote.upgrade.targetMark]}` : "Pattern complete"}</strong></div>
        <small>{quote.upgrade.targetMark ? `${quote.upgrade.costLabel} · ${quote.upgrade.durationLabel}` : "Maximum known refinement reached."}</small>
        {quote.upgrade.researchName && <small>Design gate: {quote.upgrade.researchName}</small>}
        <button className="forecast-action" type="button" disabled={!quote.upgrade.canStart} onClick={() => onUpgrade(item.id)}>
          {quote.upgrade.canStart ? `Begin Mark ${quote.upgrade.targetMark ? ROMAN[quote.upgrade.targetMark] : ""} project` : quote.upgrade.reason ?? "Unavailable"}
        </button>
      </div>

      <div className="armory-modification-list">
        <span>ONE SPECIALIZATION SLOT</span>
        {quote.modifications.map((mod) => (
          <button key={mod.id} type="button" className={quote.modification === mod.id ? "active" : ""} disabled={!mod.available || (!mod.canInstall && quote.modification !== mod.id)} onClick={() => onModification(item.id, quote.modification === mod.id ? null : mod.id)} title={ARMORY_MODIFICATIONS[mod.id].description}>
            <strong>{ARMORY_MODIFICATIONS[mod.id].name}</strong><small>{quote.modification === mod.id ? "FITTED · remove" : mod.available ? mod.costLabel : `REQUIRES ${mod.researchName}`}</small>
          </button>
        ))}
      </div>

      <div className="armory-item-actions">
        <button className="forecast-action" type="button" disabled={!quote.canCraft} onClick={() => onCraft(item.id)}>{quote.canCraft ? `Forge current pattern · ${quote.craftCostLabel}` : quote.reason === "research" ? `Requires ${quote.researchName}` : `Forge needs ${quote.craftCostLabel}`}</button>
        {quote.damaged > 0 && <button className="forecast-action" type="button" disabled={!quote.canRepair} onClick={() => onRepair(item.id)}>{quote.canRepair ? `Repair 1 · ${quote.repairCostLabel}` : `Repair needs ${quote.repairCostLabel}`}</button>}
      </div>
    </article>
  );
}

export default function ArmoryConsole({ currentWorldName, quotes, activeProject, laws, onCraft, onRepair, onUpgrade, onModification, onBuyLaw, onOpenHelp, onBack }: ArmoryConsoleProps) {
  const weapons = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "weapon");
  const armor = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "armor");
  const totalReady = ARMORY_ITEM_DEFINITIONS.reduce((sum, item) => sum + quotes[item.id].ready, 0);
  return (
    <section className="continuity-console armory-console" aria-labelledby="armory-console-title">
      <header className="continuity-console-header"><div><p>PERSONNEL // ARMORY // {currentWorldName.toUpperCase()}</p><h2 id="armory-console-title">Six frames. One evolving doctrine.</h2><span>The Ark improves trusted patterns instead of collecting disposable loot. Expeditions still auto-equip the strongest qualified crew.</span></div><button type="button" onClick={onBack}>Return to Personnel</button></header>
      <div className="continuity-summary-band"><div><span>Frames</span><strong>3 weapon · 3 armor</strong></div><div><span>Items ready</span><strong>{totalReady}</strong></div><div><span>Active project</span><strong>{activeProject ? `${activeProject.itemName} Mk ${ROMAN[activeProject.targetMark]}` : "Forge idle"}</strong></div><div className="continuity-summary-help"><span>Manual <HelpTrigger label="Explain Armory progression" onClick={() => onOpenHelp("armory")} /></span><strong>Marks survive Recalibration</strong></div></div>

      {activeProject && <section className="armory-active-project" aria-live="polite"><div><span>ARMORY PROJECT IN PROGRESS</span><strong>{activeProject.itemName} · Mark {ROMAN[activeProject.targetMark]}</strong><small>{activeProject.remainingLabel} remaining · continues while offline</small></div><div className="continuity-progress"><span style={{ width: `${Math.max(1, activeProject.progress * 100)}%` }} /></div></section>}

      <section className="continuity-panel armory-law-panel"><header><div><span>RECALIBRATION LAWS</span><h3>Change how every future pattern is forged</h3></div><small>Research proves each law; Axioms then make it permanent across recalibrations.</small></header><div className="armory-law-grid">{(Object.keys(ARMORY_LAWS) as ArmoryLawId[]).map((id) => { const law = ARMORY_LAWS[id]; const quote = laws[id]; return <article key={id}><span>LAW LEVEL {quote.level}/{law.maxLevel}</span><strong>{law.name}</strong><p>{law.description}</p><small>{quote.researchMet ? `PROVEN · ${quote.researchName}` : `RESEARCH · ${quote.researchName}`}</small><button type="button" disabled={!quote.canBuy} onClick={() => onBuyLaw(id)}>{quote.maxed ? "LAW COMPLETE" : !quote.researchMet ? `Requires ${quote.researchName}` : `${quote.cost} Axioms`}</button></article>; })}</div></section>

      <section className="continuity-panel"><header><div><span>WEAPON FRAMES</span><h3>Controlled force for difficult operations</h3></div><small>Marks add bounded strength; specializations change the mission tradeoff.</small></header><div className="armory-item-grid">{weapons.map((item) => <ArmoryItemCard key={item.id} item={item} quote={quotes[item.id]} onCraft={onCraft} onRepair={onRepair} onUpgrade={onUpgrade} onModification={onModification} />)}</div></section>
      <section className="continuity-panel"><header><div><span>ARMOR FRAMES</span><h3>Protection that grows with the crew</h3></div><small>Higher Marks improve mitigation and durability without eliminating risk.</small></header><div className="armory-item-grid">{armor.map((item) => <ArmoryItemCard key={item.id} item={item} quote={quotes[item.id]} onCraft={onCraft} onRepair={onRepair} onUpgrade={onUpgrade} onModification={onModification} />)}</div></section>
    </section>
  );
}
