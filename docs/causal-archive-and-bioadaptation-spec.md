# Causal Archive and Bioadaptation

Implemented July 14, 2026. This release completes roadmap items 8 and 9 without resetting the public save key.

## Causal Archive

The Archive is derived from evidence already stored by other systems. It has no separate collectible currency and old saves receive credit retroactively.

| Stage | Minimum indexed evidence | Additional proof | Operational effect |
| --- | ---: | --- | --- |
| Unknown Contacts | first contact | none | none |
| Retrograde Vessels | 4 | a resolved contact | +2 readiness, +1 identification |
| Causal Interdictors | 9 | Temporal Signal Analysis and Causal Threat Projection | +4 readiness, +2 identification, +120 seconds forecast analysis |
| The Returned | 15 | Returned Origin Hypothesis and Causal Wreckage Recovery | +6 readiness, +3 identification, +180 seconds forecast analysis |

Evidence comes from Ark contact fragments, planetary attack fragments, Research, expeditions, and founded colonies. The current campaign establishes only a provisional model:

- contacts violate cause and effect;
- restored life changes their target selection;
- they prioritize world-core/reality anchors while sometimes protecting civilians;
- they possess Ark-adjacent authentication, language, ancestry, and casualty records;
- a future Foundry Event is associated with multiversal damage;
- The Returned is a classification, not proof of identity, motive, inevitability, or guilt.

New research programs are Retrograde Material Analysis, Causal Cartography, and Returned Origin Hypothesis. Causal Wreckage Recovery becomes available at Vesper. Eight Ark fragments and eight planetary fragments can be recovered across repeated incidents.

## Voluntary Bioadaptation

Bioadaptation unlocks only after Voluntary Adaptation Charter Research. It is managed in a survivor's Personnel File so the decision remains attached to a person rather than a generic upgrade screen.

Hard rules:

- adults opt in individually;
- one clinical procedure runs at a time and continues offline;
- its volunteer is unavailable for work, Research, training, defense, expeditions, command, and colony founding until completion;
- resources are committed at the start;
- each survivor may choose at most two distinct protocols;
- protocols never change rarity, profession level, Profile Elevation, or Continuity Expertise;
- protocols never become a settlement, campaign, or Continuity requirement;
- a refusal has no mechanical penalty;
- founder snapshots preserve protocol history without using it in colony viability math.

| Protocol | Base time | Research | Bounded operational effect |
| --- | ---: | --- | --- |
| Atmospheric Symbiosis | 4h | Atmospheric Symbiosis | +1 expedition strength |
| Radiation Memory Therapy | 5h | Radiation Memory Therapy | -15% expedition injury damage |
| Null Exposure Conditioning | 8h | Null Exposure Conditioning | +2 defense readiness, -10% hostile/expedition injury damage |
| Prosthetic Neural Bridge | 6h | Prosthetic Neural Bridge | +1 expedition strength, -5% expedition injury damage |
| Cognitive Assistance Interface | 7h | Cognitive Assistance Interface | +1 on-duty Research expertise for Researchers, +1 defender identification |
| Extended Field Endurance | 6h | Field Endurance Remodeling | -5% expedition duration, -10% expedition injury damage |

Per-person expedition injury resistance is capped at 30%. Party duration reduction is capped at 15%. Adaptation expedition strength is capped at +8 per party; adaptation defense readiness at +8; adaptation identification at +4. These bonuses support learned expertise and equipment rather than replace them.

Every protocol contains an explicit consent statement and a contradiction record. The contradictions support the damaged-future mystery without treating crew as disposable statistics.

## Save migration

`SAVE_VERSION = 11`. The public key remains `axiom-foundry-save-v5`.

- Survivor schema 7 adds a sanitized `bioadaptations` record, defaulting to an empty list.
- Game state adds one sanitized Bioadaptation Clinic queue.
- Expedition schema 4 records per-member injury resistance and adaptation support at launch so online and offline resolution stay identical.
- Founder history adds adaptation IDs; they are historical only.
- Causal Archive classifications are derived, so no migration or progress replay is required.
