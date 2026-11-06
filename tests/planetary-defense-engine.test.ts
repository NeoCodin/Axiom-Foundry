import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_PLANETARY_ATTACK_DELAY_SECONDS,
  advancePlanetaryDefense,
  createPlanetaryDefenseState,
  getPlanetaryDefenseOperationalLoad,
  sanitizePlanetaryDefenseState,
  setPlanetaryDefenseDoctrine,
  startPlanetaryDefenseConstruction,
  syncPlanetaryDefenseNetworks,
} from "../app/planetary-defense-engine.ts";
import type { ColonyRecord } from "../app/settlement-engine.ts";

const colony: ColonyRecord = {
  worldId: "pelagos",
  name: "Pelagos Harbor",
  establishedAt: 1,
  viabilityScore: 100,
  founders: [],
  legacyBenefitIds: [],
  transmissionsRead: 0,
};

test("restored worlds receive persistent networks and exact doctrine upkeep", () => {
  let state = syncPlanetaryDefenseNetworks(createPlanetaryDefenseState(10), [colony]);
  assert.ok(state.networks.pelagos);
  assert.equal(getPlanetaryDefenseOperationalLoad(state), 0.025);
  state = setPlanetaryDefenseDoctrine(state, "fortress");
  assert.equal(getPlanetaryDefenseOperationalLoad(state), 0.035);
  state = startPlanetaryDefenseConstruction(state, "pelagos", "reality-anchor", 600);
  const advanced = advancePlanetaryDefense(state, 300, {
    threatsEnabled: false,
    worldIndex: 4,
    constructionSpeedMultiplier: 2,
  });
  assert.equal(advanced.state.networks.pelagos!.installations["reality-anchor"], 1);
  assert.equal(advanced.state.construction, null);
});

test("planetary attacks are deterministic and never delete a colony or installation", () => {
  const state = syncPlanetaryDefenseNetworks(createPlanetaryDefenseState(33), [colony]);
  state.networks.pelagos!.installations["reality-anchor"] = 1;
  const context = { threatsEnabled: true, worldIndex: 4 };
  const before = advancePlanetaryDefense(state, FIRST_PLANETARY_ATTACK_DELAY_SECONDS - 60, context);
  assert.ok(before.state.incoming);
  const first = advancePlanetaryDefense(before.state, 120, context);
  const replay = advancePlanetaryDefense(before.state, 120, context);
  assert.deepEqual(first.state, replay.state);
  assert.equal(first.resolvedEvents.length, 1);
  assert.ok(first.state.networks.pelagos);
  assert.equal(first.state.networks.pelagos!.installations["reality-anchor"], 1);
  assert.ok(first.state.networks.pelagos!.recoveryRemainingSeconds >= 0);
});

test("malformed planetary ledgers cannot forge levels or retain missing worlds", () => {
  const state = sanitizePlanetaryDefenseState({
    doctrine: "erase",
    networks: {
      pelagos: { installations: { "reality-anchor": 99 }, instability: 99 },
      cinder: { installations: { "shield-network": 5 } },
    },
  }, [colony]);
  assert.equal(state.doctrine, "guard");
  assert.equal(state.networks.pelagos!.installations["reality-anchor"], 5);
  assert.equal(state.networks.pelagos!.instability, 0.3);
  assert.equal(state.networks.cinder, undefined);
});
