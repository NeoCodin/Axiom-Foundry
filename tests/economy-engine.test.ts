import assert from "node:assert/strict";
import test from "node:test";

import {
  PERSISTENT_ARK_ECONOMY,
  WORLD_OPERATION_ECONOMY,
  createInitialState,
  getArmoryCraftQuote,
  getArmoryRepairQuote,
  getArmoryUpgradeQuote,
  getAutomationFrameQuote,
  getBerthConstructionQuote,
  getBioadaptationQuote,
  getCrisisFluxCost,
  getDefenseInstallationQuote,
  getExpeditionLaunchQuote,
  getInfrastructureFluxCost,
  getLifeSupportUpgradeSalvageCost,
  getPassiveSalvagePerSecond,
  getPlanetaryDefenseConstructionQuote,
  getProstheticSurgeryQuote,
  getWorldOperationEconomy,
  simulateGame,
} from "../app/game-engine.ts";
import {
  CAMPAIGN_WORLD_IDS,
  type CampaignWorldId,
} from "../app/campaign-content.ts";
import {
  getExpeditionSite,
  type ExpeditionSiteId,
} from "../app/expedition-engine.ts";

function stateAtWorld(worldId: CampaignWorldId) {
  const index = CAMPAIGN_WORLD_IDS.indexOf(worldId);
  const state = createInitialState(0);
  state.missions.currentIndex = index;
  state.settlement.currentWorldId = worldId;
  state.settlement.completedWorldIds = CAMPAIGN_WORLD_IDS.slice(0, index);
  return state;
}

test("world operations use explicit authored budgets", () => {
  for (const worldId of CAMPAIGN_WORLD_IDS) {
    const state = stateAtWorld(worldId);
    const budget = WORLD_OPERATION_ECONOMY[worldId];
    assert.deepEqual(getWorldOperationEconomy(state), budget);
    assert.equal(getInfrastructureFluxCost(state), budget.infrastructureFlux);
    assert.equal(getCrisisFluxCost(state), budget.crisisFlux);
  }

  const vesper = stateAtWorld("vesper");
  assert.equal(
    getExpeditionLaunchQuote(vesper, "pelagos-survey", []).fluxCost,
    70 * WORLD_OPERATION_ECONOMY.pelagos.expeditionScale,
    "returning to Pelagos uses Pelagos operation costs instead of Vesper inflation",
  );
});

test("persistent Ark assets keep the same recipe after changing worlds", () => {
  const cinder = stateAtWorld("cinder");
  const nox = stateAtWorld("nox");
  const vesper = stateAtWorld("vesper");

  const quotes = [cinder, nox, vesper].map((state) => ({
    craft: getArmoryCraftQuote(state, "kinetic-pike").fluxCost,
    repair: getArmoryRepairQuote(state, "kinetic-pike").fluxCost,
    mark: getArmoryUpgradeQuote(state, "kinetic-pike").fluxCost,
    berthFlux: getBerthConstructionQuote(state).cost,
    berthSalvage: getBerthConstructionQuote(state).salvageCost,
    supportSalvage: getLifeSupportUpgradeSalvageCost(state, "atmosphere"),
    defenseFlux: getDefenseInstallationQuote(state, "shieldArray").fluxCost,
    defenseSalvage: getDefenseInstallationQuote(state, "shieldArray").salvageCost,
    droneFlux: getAutomationFrameQuote(state).fluxCost,
    droneSalvage: getAutomationFrameQuote(state).salvageCost,
    prosthetic: getProstheticSurgeryQuote(state, "missing-crew").fluxCost,
    adaptation: getBioadaptationQuote(
      state,
      "missing-crew",
      "atmospheric-adaptation",
    ).fluxCost,
    colonyDefense: getPlanetaryDefenseConstructionQuote(
      state,
      "pelagos",
      "reality-anchor",
    ).fluxCost,
  }));

  assert.deepEqual(quotes[1], quotes[0]);
  assert.deepEqual(quotes[2], quotes[0]);
  assert.equal(
    quotes[0].craft,
    PERSISTENT_ARK_ECONOMY.armoryTierFlux[1],
  );
});

test("an empty Ark cannot recover passive Salvage", () => {
  const emptyArk = stateAtWorld("vesper");
  assert.equal(emptyArk.survivors.survivors.length, 0);
  assert.equal(getPassiveSalvagePerSecond(emptyArk), 0);

  const salvageBefore = emptyArk.living.salvage;
  const afterHour = simulateGame(emptyArk, 3_600, 1, false);
  assert.equal(afterHour.living.salvage, salvageBefore);
});

test("resource expeditions are meaningful Salvage recovery operations", () => {
  const resourceSites: readonly ExpeditionSiteId[] = [
    "pelagos-tidal-salvage",
    "viridia-spore-sampler",
    "cinder-mantle-salvage",
    "null-sounding",
    "vesper-red-scar-sounding",
  ];
  for (const siteId of resourceSites) {
    const site = getExpeditionSite(siteId);
    assert.ok(
      site.rewards.salvage / site.durationSeconds >= 1 / 30,
      `${site.name} should recover at least 120 Salvage per hour on a full success`,
    );
  }
});
