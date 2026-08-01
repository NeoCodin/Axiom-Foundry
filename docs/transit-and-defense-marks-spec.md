# Offline Transit and Ark Defense Marks

Status: Implemented July 14, 2026

This release turns planetary departure into an idle travel phase and rebuilds the Ark Defense Grid as a long-form late-game economy. It preserves every existing save and every idle-safety rule.

## Transit routes

Cold Wake-to-Pelagos remains the opening approach and resolves immediately when its Continuity work is complete. Later routes use real elapsed time:

| Route | Base duration |
| --- | ---: |
| Pelagos to Viridia | 90 minutes |
| Viridia to Cinder | 2.5 hours |
| Cinder to Nox | 4 hours |
| Nox to Vesper | 6 hours |

On-duty Navigation Expertise and Ark-Drive Coupling reduce route duration, but their combined solution is capped at x1.55. Travel cannot be skipped by malformed save data and advances identically online and offline.

During transit:

- The Planet page becomes the Navigation console and displays route progress, ETA, current environment, speed sources, and Defense forecast.
- Foundry production, Research, training, construction, Medical recovery, repairs, active expeditions, Automation, and colony systems continue offline.
- The destination Planetfall directive does not progress before orbital arrival.
- New expedition launches are secured until arrival; an expedition already in flight continues normally.
- Arrival is automatic and restores the normal Planet page for the destination.

## Environmental progression

| Environment | Events |
| --- | --- |
| First interplanetary corridors | Asteroid showers, debris fronts, ion storms, drive turbulence |
| Cinder orbit | Ash storms |
| Nox orbit | Null shear and ion storms |
| Vesper orbit | Null shear and debris fronts |
| Late corridors | Transit pool plus Null shear |

The first transit hazard waits 45 minutes. A fresh Defense ledger's first orbital hazard waits two hours; after any environmental resolution, later gaps are four to eight hours. An environmental forecast belongs to one environment; when the Ark leaves, the obsolete forecast is discarded instead of becoming Cinder weather at Nox.

## Two standing orders

Environmental response is independent from hostile-contact response.

| Environmental order | Margin | Recovery | Intent |
| --- | ---: | ---: | --- |
| Brace | +14 | x0.75 | Safest default |
| Harvest | -6 | x1.65 | Salvage and telemetry at greater hull risk |
| Outrun | +10 | x0.35 | Strong margin, minimal recovery |

| Contact order | Margin | Recovery | Intent |
| --- | ---: | ---: | --- |
| Defend | +10 | x1.0 | Safe balanced response |
| Evade | +20 | x0.4 | No automatic crew injury |
| Intercept | -10 | x1.8 | Higher recovery and injury exposure |
| Observe | -5 | x0.8 | Best evidence and identification |

All orders resolve events automatically. No reflex input or online timing advantage exists.

## Ark installation Marks

The Defense Grid has four permanent installation lines:

- Shield Array: readiness, redundancy, crew-impact damping, causal reinforcement.
- Repair Swarms: repair speed and increasingly predictive reconstruction.
- Point-Defense Grid: debris interception through causal interceptor targeting.
- Early-Warning Relay: longer forecasts and deeper identification.

Each line advances from Mark 0 to Mark IV. One project runs at a time, commits its resources at launch, and continues offline. Base costs differ by installation; Mark multipliers are:

| Target Mark | Flux factor | Material factor | Additional gate |
| --- | ---: | ---: | --- |
| I | x1 | x1 | None |
| II | x6 | x3 | Defensive Forecasting + 40 Schematics |
| III | x30 | x7 | Autonomous Repair Swarms + 120 Schematics + 80 Null Traces |
| IV | x150 | x15 | Causal Threat Projection + 360 Schematics + 240 Null Traces |

Base project durations scale by x3.2 per Mark. On-duty Engineering Expertise and construction Automation accelerate work without replacing its resource cost.

## Failure and save rules

- Environmental and hostile events are deterministic and offline-identical.
- Poor outcomes can cause bounded production damage, temporary system compromises, missed rewards, and visible crew injuries from risky hostile-contact orders.
- Automatic events never kill crew, delete a colony, erase an installation, change a doctrine, or remove saved progress.
- Damage remains capped at 25% production and six base repair-hours; repairs continue offline.
- `SAVE_VERSION = 10`, `TRANSIT_SCHEMA = 1`, and `DEFENSE_SCHEMA = 3`.
- The public save key remains `axiom-foundry-save-v5`.
- Legacy Defense installation levels 1-5 migrate to Mark I. This preserves prior investment without granting the new multi-resource Mark ladder for free.

## Verification

Regression coverage includes deterministic scheduling, route sanitization, chunked/offline equivalence, environment changes, separate orders, Mark construction, old-save migration, recoverable injuries/compromises, delayed destination missions, Command Briefing routing, and automatic orbital arrival.
