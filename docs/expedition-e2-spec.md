# Expedition E2 — Health, Rescue, Mortality, and Prosthetics (Specification v2)

Status: **IMPLEMENTED July 12, 2026** — all three milestones shipped
(A: health + tiered armory, commit d885cd7; B: distress/rescue/abandonment;
C: prosthetics). This version supersedes the v1 draft and absorbs what was
planned as Phase E3: the owner directed that crew can die on expeditions,
that rescue parties can be sent to save stranded crews, and that permanent
injuries exist with a prosthetics research path. The idle contract survives
intact — see §7. Implementation deltas: wounded threshold is 40 (owner);
founders need 80+ health (owner); stranded health band is 8–20; armor is
tiered (see §5) with per-tier durability instead of a single armor type.

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
| Setback  | −16 < m ≤ −8    | ×0.25   | each member takes 30–70 damage (× armor tier multiplier, §5), health floor 10 |
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
  - **Minor — cap 70**: setback that leaves a member below 15 health, or
    stranded while wearing an Aegis Frame (T3 armor).
  - **Major — cap 55**: stranded in a distress event while armored (T1/T2).
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

## 5. Armory — tiered weapons and armor (owner-expanded, July 12, 2026)

An in-depth gear system with its own **Armory tab** (unlocks with
expeditions at Cinder, worldIndex >= 3). Gear ties into research (each
tier is a research project) and survivor level (each item has a wield
requirement checked against the survivor's best professional level,
0-10 scale).

Weapon tiers (+group strength per equipped member):

| Item | Wield req | Strength | Research gate |
|------|-----------|----------|---------------|
| Kinetic Pike (T1) | level 2 | +2 | Expedition Armaments |
| Arc Carbine (T2)  | level 4 | +4 | Arc Discharge Weapons |
| Null Lance (T3)   | level 6 | +6 | Null-Edge Armaments |

Armor tiers (damage multiplier on setback/distress hits; durability =
hits absorbed before the item becomes DAMAGED and needs repair):

| Item | Wear req | Damage taken | Worst injury while worn | Durability |
|------|----------|--------------|-------------------------|------------|
| Composite Weave (T1) | level 1 | x0.5  | major  | 1 |
| Reactive Shell (T2)  | level 3 | x0.35 | major  | 2 |
| Aegis Frame (T3)     | level 5 | x0.2  | minor  | 3 |

(Unarmored distress = severe injury; §3's tier table follows this column.)

- **Threat Operations research branch created now** (its Phase 2 projects
  join later): six gear projects, chained per line — Expedition Armaments →
  Arc Discharge Weapons → Null-Edge Armaments, and Composite Plating →
  Reactive Shell → Aegis Frame. Both roots require Predictive Fabrication.
  T3 projects cost Null Traces. Weapons research draws visible Continuity
  Protocol objections (canon: weaponized Axioms cause the catastrophe).
- Crafted at the Foundry with flat continuity pricing: T1 800 × scale Flux
  + 40 Engineering Models; T2 2,400 × scale + 100 models; T3 6,000 × scale
  + 200 models + 40 Null Traces. Repairing a DAMAGED item costs 40% of its
  Flux price, no models. Weapons never break.
- **Auto-equip at launch**: each member receives the best weapon and armor
  they are leveled to use while stock lasts (highest-level members first).
  The Expedition Bay shows the resulting loadout next to each biometric
  bar before departure. No per-slot micromanagement required; the Armory
  tab is stockpile, fabrication, and repair.
- The armory persists across worlds and Recalibrations. Phase 2 will let
  the stockpile contribute to boarding defense.

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
2. New armory-engine: tiered item definitions, stockpile + durability
   state, craft/repair quotes (flat continuity pricing), auto-equip
   assignment by wield level.
3. expedition-engine: outcome ladder, per-crew damage, gear
   strength/mitigation inputs, armor durability loss, XP/reward changes.
4. game-engine: armory state + craft/repair actions (research-gated),
   wound application + recovery in simulateGame, forecast wiring.
5. Research: Threat Operations branch with the six gear projects (§5).
6. UI: **Armory tab** (stockpile/fabrication/repair), biometric bars,
   badges, loadout preview in the Expedition Bay, forecast line +
   confirms.

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
