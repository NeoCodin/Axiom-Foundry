# Expedition E2 — Health, Rescue, Mortality, and Prosthetics (Specification v2)

Status: **owner-directed scope, July 12, 2026**. This version supersedes the
v1 draft and absorbs what was planned as Phase E3: the owner directed that
crew can die on expeditions, that rescue parties can be sent to save
stranded crews, and that permanent injuries exist with a prosthetics
research path. The idle contract survives intact — see §7.

Owner decisions folded in (answers to v1's open questions and more):

- Wounded ("too hurt to work") threshold: health **below 40**.
- Founding a colony requires health **80 or higher** — wounded and
  uninjured-but-capped crew cannot found until healed/repaired.
- Permanent injuries cap max health at **70 or lower depending on
  severity**; prosthetics research + a high-level Doctor + medical capacity
  repair them.
- Expedition parties show **biometric bars** for every member.
- Expeditions reward salvage, schematics, and **profession-dependent XP**.

## 1. Health system

- Every survivor gains `health` (0–100, default 100) and `healthCap`
  (default 100, lowered only by permanent injuries). Save-additive with
  sanitizer fallbacks; nobody's state changes on migration.
- **Damage sources: expedition setbacks and distress events only.** Storms,
  defense events, idling, and offline time never reduce health.
- **Recovery**: +2 health/hour base, +0.5/hour per assigned Doctor (cap 4
  doctors), ×0.5 if medical life-support is over capacity. Runs online and
  offline, never reverses, and stops at `healthCap`.
- **Wounded state** (health < 40): cannot be deployed, trained, selected as
  founders, or assigned/worked (no on-job XP) until health crosses 40.
  Amber RECOVERING badge mirroring UNASSIGNED. Wounded crew aboard the Ark
  add +0.5 medical demand each.
- **Founder gate**: settlement founder selection (including the deficit
  candidate picker) requires health ≥ 80.

## 2. Expedition outcome ladder

Margin `m = group strength (incl. weapons) − site difficulty`:

| Outcome  | Band            | Rewards | Crew effect |
|----------|-----------------|---------|-------------|
| Success  | m ≥ 0           | ×1.0    | none |
| Lean     | −8 < m < 0      | ×0.45   | none |
| Setback  | −16 < m ≤ −8    | ×0.25   | each member takes 30–70 damage (halved by armor), health floor 10 |
| Distress | m ≤ −16         | none    | party is **stranded** at the site (§4) |

- Setback and distress rolls use the deterministic expedition RNG seeded at
  launch — chunk-size independent, identical online/offline.
- The Expedition Bay forecast always shows the projected outcome **before
  launch**: "Projected: SUCCESS (strength 18 vs 12)", "SETBACK RISK — crew
  may return wounded", or "DISTRESS RISK — crew would be stranded".
  Launching into a projected distress requires an explicit confirm (AXIOM
  objects on the record).

## 3. Permanent injuries and prosthetics

- An injury is permanent until surgically repaired; it lowers `healthCap`:
  - **Minor — cap 70**: setback that leaves a member below 15 health.
  - **Major — cap 55**: stranded in a distress event while armored.
  - **Severe — cap 40**: stranded in a distress event without armor.
- Injuries are deterministic (no dice): the tier follows from what
  happened. One injury at a time; a worse event upgrades the tier.
- Injured crew show an INJURED badge with their cap. Caps < 80 block
  founding; caps ≥ 40 still allow normal work once healed above 40.
- **Prosthetic Fabrication** (new research project, human-continuity
  branch, prerequisite Clinical Commons; costs Biological Samples 140,
  Engineering Models 120, Null Traces 40) unlocks **Prosthetic Surgery**:
  - Per-survivor action on the Crew page: requires an assigned level-5
    Doctor, medical life-support not over capacity, and costs Flux
    (1,200 × continuity scale) + 30 Engineering Models + 20 Biological
    Samples.
  - Removes the injury, restores `healthCap` to 100, sets health to
    max(current, 50); the patient finishes recovery normally.

## 4. Distress, rescue missions, and death

- A distress outcome strands the party at the site. Members' health drops
  to a critical band (8–20, armor keeps them at the top of the band), and
  injuries apply per §3. **Stranded crew are stable**: they have sheltered
  in place; health does not decay while stranded, online or offline, and
  the distress signal never expires. They are unavailable for everything
  until retrieved.
- **Rescue mission**: launched from the Expedition Bay at the distress
  signal. 2–4 crew, Flux cost 50% of the original site cost, duration 60%
  of the site duration (Navigator bonus still applies). Rescue difficulty =
  site difficulty − 4.
  - **Clean extraction** (rescue strength ≥ rescue difficulty): everyone
    returns; rescuers unharmed; the stranded return at their stranded
    health and begin recovery.
  - **Hard extraction** (below): everyone still returns, but rescuers take
    setback damage (30–70, armor halves, floor 10). A rescue never strands
    the rescue party — no death spirals, no chained losses.
  - Rescuers earn flat 90 XP to their primary role.
- **Abandonment** — the only death in the game: an explicit "Abandon crew"
  action on the distress signal with a hard confirm. Abandoned crew die
  permanently, are recorded in a persistent **memorial ledger** (name,
  professions, world, date), and their quarters free up. Nothing ever
  abandons crew automatically.

## 5. Armory (weapons and armor)

- Shared Ark stockpile `armory: { weapons: number; armor: number }`,
  crafted at the Foundry: Flux (flat continuity pricing, ~800 × scale) +
  40 Engineering Models per item.
- Research gates: **Expedition Armaments** (weapons) and **Composite
  Plating** (armor). Until the Threat Operations branch ships (Phase 2),
  both live in Ark Engineering with prerequisite Predictive Fabrication and
  migrate to the new branch later.
- Auto-equip at launch, best-effort, no micromanagement: one weapon and one
  armor per member while stock lasts. Weapon: +2 group strength per
  equipped member. Armor: halves setback/distress damage and prevents the
  severe injury tier.
- **Armor breaks when it absorbs a hit**: each setback or distress consumes
  the equipped armor of affected members (it did its job). Weapons never
  break. This makes the armory a recurring Flux sink.
- The armory persists across worlds and Recalibrations.

## 6. Rewards and biometrics

- Rewards stay salvage + Engineering Models + Null Traces; expedition model
  rewards are presented as **"recovered schematics"** in the UI.
- **Profession-dependent XP**: each returning member earns
  `(60 + 6 × difficulty)` XP to their primary role, ×1.5 if that role is in
  the site's focus professions (survey: navigator/researcher; relay:
  technician/researcher; null sites: researcher/navigator; origin run:
  all). Outcome scaling: success ×1, lean ×0.6, setback ×0.4, stranded 0.
  Replaces the flat 90 of E1.
- **Biometric bars**: the Expedition Bay party panel shows a live health
  bar per member (before, during, and after the run); roster cards gain a
  compact health bar; badges: RECOVERING (<40), INJURED (cap shown),
  STRANDED.

## 7. Invariants (restated after the mortality amendment)

- No health loss offline, from idling, or from any non-expedition system.
- Stranded crew never deteriorate or die on their own; distress signals
  never expire. **Death happens only through the explicit Abandon action.**
- Every outcome is projectable before launch; distress launches require an
  explicit confirm.
- Recovery always completes to `healthCap` with zero player input; every
  injury is repairable; a fully wounded roster always returns to
  operational.
- Everything is logged: expedition results explain damage, injuries name
  their cause, memorials are permanent.

## 8. Implementation order

Milestone A — health core and gear:
1. survivor-engine: `health`/`healthCap`/`injury` fields + sanitizer,
   recovery in advance (doctor count via modifiers), wounded gating,
   founder ≥ 80 gate, medical demand contribution.
2. expedition-engine: outcome ladder, per-crew damage, armory
   strength/mitigation inputs, armor breakage, XP/reward changes.
3. game-engine: armory state + craft actions (research-gated), wound
   application + recovery in simulateGame, forecast wiring.
4. Research projects: Expedition Armaments, Composite Plating.
5. UI: biometric bars, badges, Armory panel, forecast line + confirms.

Milestone B — distress and rescue:
6. expedition-engine: stranded state, rescue launch/resolution,
   abandonment + memorial ledger; game-engine + UI wiring (distress
   signal card, rescue crew picker, memorial display).

Milestone C — prosthetics:
7. Prosthetic Fabrication research + Prosthetic Surgery action + INJURED
   repair flow UI.

Validation after each milestone: full test suite; simulator with a
gear-crafting, wounded-aware, rescue-capable bot must finish the campaign
within ±20% of the 16.84-day baseline, and a negligent-bot variant (no
gear, weak crews, never rescues, never abandons) must still complete the
campaign. Manual + AI_HANDOFF updates ship with each milestone.
