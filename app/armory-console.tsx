"use client";

import { HelpTrigger, type ManualTopicId } from "./game-manual";
import {
  ARMORY_ITEM_DEFINITIONS,
  type ArmoryItemDefinition,
  type ArmoryItemId,
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
};

export type ArmoryConsoleProps = {
  currentWorldName: string;
  quotes: Readonly<Record<ArmoryItemId, ArmoryItemQuoteView>>;
  onCraft: (itemId: ArmoryItemId) => void;
  onRepair: (itemId: ArmoryItemId) => void;
  onOpenHelp: (topicId: ManualTopicId) => void;
  onBack: () => void;
};

const craftBlockLabel = (
  item: ArmoryItemDefinition,
  quote: ArmoryItemQuoteView,
) => {
  switch (quote.reason) {
    case "research":
      return `Requires ${quote.researchName} research`;
    case "flux":
      return `Needs ${quote.craftCostLabel}`;
    case "models":
      return `Needs ${item.modelCost} Engineering Models`;
    case "traces":
      return `Needs ${item.nullTraceCost} Null Traces`;
    default:
      return `Forge · ${quote.craftCostLabel}`;
  }
};

function ArmoryItemCard({
  item,
  quote,
  onCraft,
  onRepair,
}: {
  item: ArmoryItemDefinition;
  quote: ArmoryItemQuoteView;
  onCraft: (itemId: ArmoryItemId) => void;
  onRepair: (itemId: ArmoryItemId) => void;
}) {
  return (
    <article
      className={`armory-item-card ${quote.researchMet ? "is-online" : "is-locked"}`}
    >
      <header>
        <div>
          <span>
            TIER {item.tier} {item.kind === "weapon" ? "WEAPON" : "ARMOR"}
          </span>
          <h3>{item.name}</h3>
        </div>
        <div className="armory-stock-readout">
          <strong>{quote.ready}</strong>
          <small>ready{quote.damaged > 0 ? ` · ${quote.damaged} damaged` : ""}</small>
        </div>
      </header>
      <p>{item.description}</p>
      <ul className="armory-item-stats">
        {item.kind === "weapon" ? (
          <li><span>Strength</span><strong>+{item.strengthBonus} per carrier</strong></li>
        ) : (
          <>
            <li><span>Wound damage</span><strong>×{item.damageMultiplier}</strong></li>
            <li><span>Worst injury</span><strong>{item.worstInjury}</strong></li>
            <li><span>Durability</span><strong>{item.durability} hit{item.durability === 1 ? "" : "s"}</strong></li>
          </>
        )}
        <li>
          <span>Requires</span>
          <strong>
            Level {item.wieldLevel}+{quote.wielders > 0 ? ` · ${quote.wielders} qualified aboard` : " · nobody qualified yet"}
          </strong>
        </li>
        <li>
          <span>Materials</span>
          <strong>
            {item.modelCost} Models{item.nullTraceCost > 0 ? ` · ${item.nullTraceCost} Null Traces` : ""}
          </strong>
        </li>
      </ul>
      <div className="armory-item-actions">
        <button
          className="forecast-action"
          type="button"
          disabled={!quote.canCraft}
          onClick={() => onCraft(item.id)}
        >
          {craftBlockLabel(item, quote)}
        </button>
        {quote.damaged > 0 && (
          <button
            className="forecast-action"
            type="button"
            disabled={!quote.canRepair}
            onClick={() => onRepair(item.id)}
          >
            {quote.canRepair
              ? `Repair 1 · ${quote.repairCostLabel}`
              : `Repair needs ${quote.repairCostLabel}`}
          </button>
        )}
      </div>
    </article>
  );
}

function ArmoryConsole({
  currentWorldName,
  quotes,
  onCraft,
  onRepair,
  onOpenHelp,
  onBack,
}: ArmoryConsoleProps) {
  const weapons = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "weapon");
  const armor = ARMORY_ITEM_DEFINITIONS.filter((item) => item.kind === "armor");
  const totalReady = ARMORY_ITEM_DEFINITIONS.reduce(
    (sum, item) => sum + quotes[item.id].ready,
    0,
  );
  const totalDamaged = ARMORY_ITEM_DEFINITIONS.reduce(
    (sum, item) => sum + quotes[item.id].damaged,
    0,
  );
  return (
    <section className="continuity-console armory-console" aria-labelledby="armory-console-title">
      <header className="continuity-console-header">
        <div>
          <p>ARMORY // {currentWorldName.toUpperCase()}</p>
          <h2 id="armory-console-title">Expedition weapons and armor</h2>
          <span>
            Expeditions auto-equip the best gear each member is leveled to
            use. Weapons add group strength; armor absorbs wounds and loses
            durability doing it.
          </span>
        </div>
        <button type="button" onClick={onBack}>Return to Ark Deck</button>
      </header>

      <div className="continuity-summary-band">
        <div><span>Items ready</span><strong>{totalReady}</strong></div>
        <div><span>Awaiting repair</span><strong>{totalDamaged}</strong></div>
        <div><span>Weapon tiers researched</span><strong>{weapons.filter((item) => quotes[item.id].researchMet).length}/{weapons.length}</strong></div>
        <div><span>Armor tiers researched</span><strong>{armor.filter((item) => quotes[item.id].researchMet).length}/{armor.length}</strong></div>
        <div className="continuity-summary-help">
          <span>Manual <HelpTrigger label="Explain the Armory page" onClick={() => onOpenHelp("armory")} /></span>
          <strong>Gear survives Recalibration</strong>
        </div>
      </div>

      <section className="continuity-panel">
        <header>
          <div><span>WEAPONS</span><h3>Group strength for hard sites</h3></div>
          <small>Unlocked in the Threat Operations research branch</small>
        </header>
        <div className="armory-item-grid">
          {weapons.map((item) => (
            <ArmoryItemCard
              key={item.id}
              item={item}
              quote={quotes[item.id]}
              onCraft={onCraft}
              onRepair={onRepair}
            />
          ))}
        </div>
      </section>

      <section className="continuity-panel">
        <header>
          <div><span>ARMOR</span><h3>Wound absorption on setbacks</h3></div>
          <small>Armor that takes a hit needs Foundry repair afterwards</small>
        </header>
        <div className="armory-item-grid">
          {armor.map((item) => (
            <ArmoryItemCard
              key={item.id}
              item={item}
              quote={quotes[item.id]}
              onCraft={onCraft}
              onRepair={onRepair}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

export default ArmoryConsole;
