# Planetary Expedition Campaigns

Implemented July 14, 2026.

## Design goal

Expeditions are a planet-specific campaign rather than a global list of resource jobs. The player sees only the world currently below the Ark, prepares a real crew and support package, and uses field work to prove that the Continuity plan survives contact with the planet.

All missions remain idle-first:

- fixed real-time durations advance identically online and offline;
- every outcome is projected before launch;
- no reflex combat or timed input is required;
- failed preparation never deletes campaign progress or a colony;
- stranded signals remain stable indefinitely;
- rescue missions always retrieve the stranded party.

## Operation types

| Type | Repeatable | Purpose |
|---|---|---|
| Survey | Yes | Certifies terrain for Continuity and improves current-world Surface Recon |
| Story | No | Reveals local history, contradictions, and substantial specialist rewards |
| Critical | No | Difficult signature operation required before planetary departure |
| Resource | Yes | Planet-themed source of Salvage and Research evidence |

Future-world operations are not rendered. The post-campaign Palimpsest Origin Run appears only after the authored campaign is complete.

## Campaign table

| World | Surveys | Critical operation | Primary preparation lesson | Repeatable specialty |
|---|---:|---|---|---|
| Pelagos | 1 | Highwater Archive Recovery | Medical planning and route intelligence | Salvage and Engineering Models |
| Viridia | 2 | Seed Vault Descent | Pathogen research plus exposure control | Biological Samples |
| Cinder | 2 | Foundry Nine Recovery | Predictive modeling plus protective equipment | Salvage, Schematics, and Engineering Models |
| Nox | 3 | Kestrel Relay Survey | Signal authentication plus an armed entry team | Null Traces and Cultural Records |
| Vesper | 3 | Causal Wreckage Recovery | Temporal research, armed boarding, and causal-shear protection | Mixed late-game Research evidence |

## Preparation model

Each preparation contains one or more alternative solutions. Any listed option satisfies that check. Supported options are:

- completed Research;
- minimum auto-equipped weapon count;
- minimum auto-equipped armor count;
- a profession at a minimum level;
- a completed current-world operation;
- an allocated Automation program;
- a voluntary crew adaptation.

Required checks block launch. Recommended checks do not block launch; they explain preparation that reduces practical risk or improves confidence. Group strength still determines the projected outcome after all hard preparation checks are met.

This division prevents two bad extremes: a mission that is only a larger strength number, and a rigid checklist with exactly one valid solution.

## Continuity rules

Every inhabited world has one `requiredExpeditionIds` entry. A full-success result records that operation in `worldProgress.completedExpeditionIds`. A Lean, Setback, or Distress result does not certify the operation.

Continuity displays Critical operations as their own forecast kind and routes the player directly to the Expedition Bay. World progress resets on departure while the permanent expedition ledger remains in `ExpeditionState.completedSiteIds`.

## Rewards

Expeditions may return:

- Salvage;
- recovered Schematics;
- Null Traces;
- Engineering Models;
- Biological Samples;
- Cultural Records.

Rewards are scaled by the existing deterministic outcome ladder and bounded Research/gear recovery modifiers. Planet identity governs the mix: Viridia emphasizes biology, Cinder emphasizes engineering, Nox emphasizes records and Null evidence, and Vesper combines advanced evidence types.

## Save migration

- `SAVE_VERSION = 12`
- `EXPEDITION_SCHEMA = 5`
- public save key unchanged

Old expedition logs sanitize missing reward fields to zero. Old one-time site completions are preserved. If a current-world save already completed a matching one-time operation, migration reconstructs `worldProgress.completedExpeditionIds` from the permanent expedition ledger. New Critical operations are additive goals; no survivor, item, colony, Research project, or currency is removed.

## Validation contract

Automated coverage verifies:

- only current-world operations are exposed;
- Critical preparation blocks and alternatives are deterministic;
- successful Critical operations satisfy Continuity;
- planet-specific Research rewards are granted;
- legacy expedition, Armory, save, and offline behavior remains intact.
