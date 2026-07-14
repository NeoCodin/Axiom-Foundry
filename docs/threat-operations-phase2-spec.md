# Robotics, Threat Operations Phase 2, and Planetary Defense

Status: Implemented July 14, 2026

This release connects Automation, Nox hostile contacts, and restored-world defense without changing the game's idle-first contract. All timers progress offline, incidents resolve without reflex input, and existing saves migrate additively to save version 9.

## Safety and failure rules

- Pelagos and Cold Wake remain safe; Cinder remains the environmental-defense tutorial. Hostile contacts begin at Nox.
- Automatic events may injure eligible adult Soldiers and Engineers, but cannot kill crew. Evade guarantees no automatic injury.
- Colonies, founders, completed installations, saved worlds, settings, and research progress are never deleted by an incident.
- Poor preparation creates visible, temporary setbacks: injuries, operational load, missed rewards, instability, and repair work.
- Forecasts identify the likely target and outcome before resolution. Incident reports explain what happened afterward.

## Utility Drone Operations

The Ark can fabricate eight permanent Utility Drone Frames. Frames are allocated independently, so the player can change doctrine without rebuilding them.

| Program | Maximum frames | Effect at maximum |
| --- | ---: | --- |
| Hull maintenance | 3 | +45% hull repair rate |
| Medical assistance | 3 | +15% staffed Medical Bay care |
| Research routing | 3 | +9% Prototype and Validation work |
| Expedition support | 1 | +1 projected strength and +5% recovery |
| Construction machines | 3 | +36% planetary construction speed |
| Interceptor control | 3 | +18 hostile-defense readiness |
| Personnel logistics | 3 | +30% Ark Reserve Salvage support |

Every active frame diverts 1.25% of Flux production. Drones support human Expertise; they never satisfy profession, research-lead, or Continuity requirements.

Automated equipment maintenance has three standing policies:

- **Off:** damaged equipment waits for manual repair.
- **Reserve:** repairs continue offline only while twice the repair's Flux cost remains available.
- **Priority:** repairs continue whenever the normal Flux cost is available.

## Unified Operational Load

The command bar and Foundry show one combined production diversion:

| Source | Rule |
| --- | --- |
| Medical care | 5% per occupied bed before research reductions; existing 40% cap |
| Utility drones | 1.25% per active frame; 10% maximum |
| Colony networks | 1.5%, 2.5%, or 3.5% per protected colony by posture |
| Planetary recovery | Temporary strain or breach load while a world stabilizes |
| Ark compromise | Temporary load from a failed hostile defense |

Combined Operational Load is capped at 65%. It reduces new production and never removes stored Flux.

## Nox hostile contacts

After Nox is reached, the deterministic contact scheduler may generate Retrograde Probes, vessel approaches, boarding feints, archive intrusions, Core interdiction, or beacon traces. Events target the hull, beacon, Research systems, Archive, Automation, or the Axiom Chamber.

Readiness uses the target-appropriate mix of installations, on-duty Expertise, completed Research, ready Armory stock, interceptor frames, and standing doctrine. Security and Navigation improve threat handling and forecasts; Engineers help defend damaged systems; Researchers improve identification; Doctors reduce the consequences of injuries.

Failed defenses can create one temporary compromise for at most six hours:

- Flux siphon
- Research quarantine
- Drone seizure
- Beacon spoof
- Core desynchronization
- Archive contamination

Compromises purge automatically online and offline. They may suppress an Automation program or add Operational Load, but cannot erase data or silently change a standing doctrine.

## Restored-world defense networks

Every founded colony receives a persistent defense ledger. The player chooses one global upkeep posture:

| Posture | Load per colony | Intent |
| --- | ---: | --- |
| Conservation | 1.5% | Minimum reality-anchor watch and slower recovery |
| Guard | 2.5% | Balanced protection and upkeep |
| Fortress | 3.5% | Highest readiness and fastest recovery |

Networks grow through five permanent installation lines: Reality Anchor, Shield Network, Interceptor Station, Evacuation Shelters, and Repair Yard. One deterministic construction project runs at a time. Costs are committed up front and work continues offline; Engineering Expertise and construction drones accelerate it.

Retrograde attacks target reality anchors and world cores. Outcomes are Stable, Strained, or Breached. Strain and breach add temporary recovery load and can reduce rewards, but never remove a colony or completed installation. The Repair Yard shortens recovery.

## Mystery progression

Ark contacts and planetary incidents recover eight Causal Fragments. The fragments remain deliberately incomplete: the vessels appear to originate in damaged futures, sometimes avoid civilian targets, and associate AXIOM with a future Foundry Event. The current five-world campaign does not reveal whether the attackers are enemies, custodians, descendants, or survivors.
