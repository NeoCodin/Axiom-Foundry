# Expedition Phase E2 — Health, Armor, and Weapons (Specification Draft)

Status: **draft for owner approval**. No engine code until sign-off, per
`AI_HANDOFF.md` process. E1 (groups, difficulty, surveys) shipped July 12,
2026. E3 (mortality) is a separate later spec.

## 1. Sequencing recommendation

Build **Threat Operations Phase 2 (Nox) first or together with E2**: the
weapons/armor research projects belong to the Threat Operations research
branch that Phase 2 introduces, and the owner's live campaign reaches Nox
soon. If E2 ships first, its two research projects slot temporarily into
Ark Engineering and migrate when the branch exists.

## 2. Health system

- Every survivor gains `health: number` (0–100, default and sanitize
  fallback 100). Save-additive; nobody's state changes on migration.
- **Damage sources in E2: expedition setbacks only.** Storms and all
  defense events remain crew-safe. Idle time NEVER reduces health.
- New third expedition outcome: `setback` when `strength < difficulty − 8`.
  Outcomes become: success (≥ difficulty) / lean (within 8) / setback.
  Setback: rewards ×0.25, and each crew member takes health damage
  `30–70 × armorMitigation`, floored so health never drops below 5.
  **Crews always come home alive in E2.**
- **Recovery**: +2 health/hour base, +0.5/hour per assigned Doctor (cap 4
  doctors), ×0.5 if medical life-support is over capacity. Recovery runs
  online and offline; health never decays.
- **Wounded state** (health < 50): cannot be deployed, trained, or selected
  as founders; working assignment is suspended (no on-job XP) until they
  cross 50. Roster shows an amber RECOVERING badge mirroring UNASSIGNED.
- Wounded crew add +0.5 medical demand each, making the medical envelope a
  real capacity decision for expedition-heavy players.

## 3. Armory (armor and weapons)

- A shared Ark armory, not per-survivor inventory: `armory: { weapons:
  number; armor: number }` with tiered quality later (E2 ships quantity
  only). Crafted at the Foundry: Flux (flat continuity pricing, ~800 ×
  scale) + 40 Engineering Models per item, capped at MAX_EXPEDITION_CREW
  useful units each.
- Research gates: **Expedition Armaments** (weapons) and **Composite
  Plating** (armor) — Threat Operations branch projects (see §1).
- Expeditions **auto-equip**: each deployed member carries one weapon and
  one armor if stock allows (no micromanagement). Effects:
  - Weapon: +2 group strength per equipped member.
  - Armor: halves setback health damage per equipped member.
- The armory is Ark structure: persists across worlds and Recalibrations.
  Phase 2 may let the armory contribute to boarding defense.

## 4. Difficulty and forecast

- Site difficulty rises on later worlds (survey difficulty +2 per world
  index past Cinder). The Expedition Bay forecast gains a projected
  outcome line: "Projected: SUCCESS (strength 18 vs 12)" or "SETBACK RISK —
  crew may return wounded", always visible before launch.

## 5. Invariants (restated)

- No health loss offline, from idling, or from any non-expedition system.
- Setback is the worst E2 outcome: bounded wounds, guaranteed survival,
  guaranteed return. Recovery always completes; a fully wounded roster can
  always heal back to operational with zero player input.
- Wounded founders are excluded from selection rather than penalized.
- Everything logged in the expedition result log with damage explained.

## 6. Implementation order

1. survivor-engine: health field, sanitizer, recovery in advance
   (doctor count via modifiers), wounded gating (deploy/train/settle/assign),
   medical demand contribution.
2. expedition-engine: setback tier, per-crew damage output, armory
   strength/mitigation inputs.
3. game-engine: armory state + craft actions (research-gated), doctor count
   wiring, wound application + recovery integration in simulateGame.
4. Research projects (branch per §1).
5. UI: health bars (roster + personnel file), RECOVERING badges, Armory
   panel on Crew page, Expedition Bay outcome forecast.
6. Tests: recovery math and caps, wounded gating, armor mitigation,
   never-below-5, offline==online equivalence, sanitizer repair, armory
   craft gating.
7. Simulator: bot crafts gear, avoids deploying wounded, and the full
   campaign must stay within ±20% of the 16.8-day baseline; a
   negligent-bot variant (no gear, constant setbacks) must still complete.
8. Manual + handoff updates.

## 7. Open questions for the owner

1. Approve the outcome band (setback at strength ≥8 below difficulty)?
2. Wounded threshold at health 50 — stricter (75) or looser (25)?
3. Should wounded crew still be selectable as founders with a warning,
   instead of excluded?
