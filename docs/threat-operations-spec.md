# Threat Operations — Phase 1 Specification (Cinder Environmental Tier)

Status: **draft for owner approval**. No engine code is written until this
spec is signed off, per `AI_HANDOFF.md` §21.

Scope of this document: the defense framework and Cinder's environmental
events only. Nox enemy vessels, beacon exposure, Causal Fragments, and
planetary defense networks are Phase 2+ and are noted only where the Phase 1
data model must leave room for them.

## 1. Design goals

1. Give the Foundry economy a permanent job: defense hardware is a recurring,
   scale-proof Flux sink alongside berths and equipment.
2. Introduce threats without breaking a single idle-safety invariant: no crew
   death, no permanent loss, no deadline, no unexplained punishment, safe
   offline resolution.
3. Teach the full defense loop (build → assign → choose doctrine → watch
   resolution) on Cinder against weather, so Nox's enemies arrive into a
   system the player already understands.
4. Make the Ark page visibly more fortified as defenses grow (pillar #2).

## 2. Player-facing summary

From Cinder arrival onward, ash storms periodically sweep the Ark's orbit.
A Defense tab (new nav entry, progressive disclosure) shows:

- **Incoming event forecast** — what is coming and roughly when. Warning
  time grows with the Early-Warning Relay and assigned Navigators.
- **Readiness** — one number (0–100%) computed from installations and crew.
- **Standing doctrine** — Defend / Evade / Intercept / Observe. Set once,
  applies automatically to every resolution, online or offline.
- **Installations** — four buildables with per-world flat Flux pricing.
- **Event log** — the last 12 resolutions with their outcomes, so offline
  results are always inspectable after the fact.

The Ark page gains: a shield arc over the hull whose brightness tracks
readiness, a storm-front indicator during countdowns, and repair drones
visibly working while damage is being repaired.

## 3. Data model

New top-level `GameState.defense` (additive; sanitizer defaults; no save-key
change, no `SAVE_VERSION` bump):

```ts
type DefenseDoctrine = "defend" | "evade" | "intercept" | "observe";

type DefenseState = {
  schema: 1;
  rngState: number;              // xorshift32, same pattern as survivors
  doctrine: DefenseDoctrine;     // default "defend"
  installations: {
    shieldArray: number;         // 0–5
    pointDefense: number;        // 0–5 (Phase 1: minor vs storms; main use Phase 2)
    repairDrones: number;        // 0–5
    earlyWarningRelay: number;   // 0–5
  };
  nextEventAtOperationalSeconds: number | null;  // deterministic schedule
  incomingEvent: {
    kind: "ash-storm";           // Phase 2 adds enemy kinds
    severity: number;            // 1–3, rolled at forecast time
    arrivesAtOperationalSeconds: number;
  } | null;
  damage: {
    productionPenalty: number;   // 0–0.25, multiplies global production
    repairRemainingSeconds: number;
  } | null;
  eventLog: ResolvedEvent[];     // capped at 12
  stats: { resolved: number; unscathed: number; damaged: number };
};
```

Scheduling uses the survivor system's `operationalSeconds` clock so events
advance identically online and offline and never depend on wall-clock reads
inside the engine.

## 4. Event math

**Cadence.** While on Cinder (and later worlds), the next storm is scheduled
`4h + rng × 4h` after the previous resolution (first storm: 2h after Cinder
arrival, severity 1, guaranteed — the tutorial event). Nothing is scheduled
before Cinder (worlds 0–2 are storm-free, matching the approved arc).

**Forecast.** The event becomes visible `15min + 45min × earlyWarningRelay
level + 10min × assigned Navigators (cap 3)` before arrival. A fully blind
player still gets 15 minutes; a built-out player sees storms ~4h out.

**Readiness (0–100).**

```
readiness = 22 × shieldArray^0.8
          + 10 × repairDrones^0.5
          + 6  × pointDefense^0.5
          + 4  × assignedSecurity (cap 4)
          + 3  × assignedEngineers (cap 4)
```

Capped at 100. A mid-Cinder player with Shield 2, Drones 1, 2 Security and
2 Engineers sits near 65 — comfortable against severity 1–2, stretched by 3.

**Resolution.** At arrival: `margin = readiness − 30 × severity` (severity
1–3), modified by doctrine (below).

- `margin ≥ 10` — **unscathed**: rewards paid in full.
- `−20 ≤ margin < 10` — **grazed**: half rewards, minor damage
  (production penalty `5–10%`, repair `30–60min`).
- `margin < −20` — **battered**: no rewards, damage capped at
  production penalty `25%`, repair `≤ 6h`. This is the worst possible
  outcome in Phase 1, full stop.

Repair time is divided by `1 + 0.5 × repairDrones + 0.25 × assignedEngineers`
and ticks down online and offline. Damage never stacks: a new storm hitting
during repairs refreshes duration, never deepens the penalty past 25%.

**Rewards (unscathed baseline, Cinder):** 20 Salvage + 25 Engineering
Models + small crew XP for assigned defenders. Severity multiplies ×1/×1.5/×2.

## 5. Doctrine table

| Doctrine | Margin mod | Rewards | Notes |
|---|---|---|---|
| Defend | +10 | ×1.0 | The safe default; tutorial recommends it |
| Evade | +20 | ×0.4 | Near-immunity, minimal gain |
| Intercept | −10 | ×1.8 | Risk for Salvage/Models; Security count adds +2 margin each (cap 4) |
| Observe | −5 | ×0.8 + research inputs | Cinder: +8 Calibration Data, +4 Null Traces per resolution. Phase 2 (Nox+): becomes the primary active Null Trace source |

Doctrine is a standing setting — no reflex gameplay, no timing windows.

## 6. Installation pricing (flat per-world continuity pricing)

Same pricing family as berths/equipment — never production-pegged (see
`AI_HANDOFF.md` §9 for why production-relative pricing is rejected).

| Installation | Cost per level | Max | Effect per level |
|---|---|---|---|
| Shield Array | 1,200 × continuityScale × 1.6^level | 5 | readiness (dominant term) |
| Repair Drones | 900 × continuityScale × 1.6^level | 5 | readiness + repair speed |
| Point-Defense | 900 × continuityScale × 1.6^level | 5 | readiness minor (Phase 2: anti-vessel) |
| Early-Warning Relay | 700 × continuityScale × 1.6^level | 5 | forecast lead time |

Installations persist across worlds and Recalibrations (they are Ark
structure, like berths). Levels never decay.

## 7. Crew integration

Assigned roles contribute passively, exactly like research/salvage/berth
crews: Security → interception margin and readiness, Engineers → readiness
and repair speed, Navigators → forecast lead. Defenders earn on-job XP from
resolved events. No new assignment UI is needed — the existing working
assignment dropdown already covers it.

## 8. Failure-safety invariants (restating the non-negotiables)

- Worst outcome: temporary ≤25% production penalty and a bounded repair
  timer. No crew harm, no berth/equipment/colony loss, no signal loss.
- Offline resolution uses identical math to online; a player away for a week
  returns to a log of outcomes, never a compounding disaster (damage cap and
  no-stacking rule guarantee recovery is always ≤6h of repairs).
- Every resolution is logged with its inputs (severity, readiness, doctrine,
  margin) so no outcome is ever unexplained.
- Storms do not occur before Cinder. The first storm is severity 1 and
  arrives with a guided callout on the Defense tab.
- Reduced-motion disables the storm/shield animations.

## 9. UI plan

- **Defense tab**: nav entry between Crew and Continuity, unlocked at Cinder
  arrival (or for any save already at/past Cinder). Panels: Forecast,
  Readiness breakdown (shows the formula contributions), Doctrine selector
  with plain-language trade-offs, Installations (build buttons + costs),
  Event log.
- **Ark page**: shield arc (opacity = readiness), storm-front chip with
  countdown when an event is forecast, drone activity during repairs.
- **Manual**: new Field Manual page for Defense; deficits and blocked states
  all name their cause and remedy, consistent with the rest of the game.

## 10. Simulator validation criteria (must pass before merge)

1. Full campaign remains completable; Cinder/Nox/Vesper pacing stays within
   ±20% of the current baseline (2.1d / 3.2d / 3.6d bot-days) with the bot
   playing Defend doctrine and building Shield 2 + Drones 1.
2. A "negligent bot" variant that builds nothing and never changes doctrine
   still completes the campaign (slower, never deadlocked) — proves the
   failure-safety invariant mechanically.
3. An "Observe bot" variant accumulates measurably more Null Traces on
   Cinder+, confirming the doctrine's value proposition.

## 11. Test plan

- defense-engine unit tests: scheduling determinism, forecast lead math,
  resolution outcomes at margin boundaries, damage cap and no-stacking,
  repair acceleration, doctrine modifiers, sanitizer repair of malformed
  saves, offline == online resolution equivalence.
- game-engine integration: production penalty application, installation
  purchase costs, crew contribution counts, Cinder unlock gating.
- rendered-HTML test additions for the Defense tab.

## 12. Explicitly out of scope for Phase 1

- Enemy vessels, boarding, interceptors as units (Nox, Phase 2)
- SOS beacon signal-exposure mechanics (Phase 2, with visible exposure UI)
- Causal Fragments / enemy lore discoveries (Phase 2)
- Planetary defense networks around restored worlds (Phase 3)
- Flux upkeep costs on installations (considered for Phase 2 so the Phase 1
  tutorial stays gentle)
