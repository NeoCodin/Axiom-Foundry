# Economy v2 — Additive Production ("machines make Flux, not machines")

Status: **draft for owner approval**. No engine code until sign-off.
Direction set by the owner July 13, 2026: per-second Flux should change
ONLY when you buy something; nothing adds to it passively except the
Recalibration-earned auto-buyer; overnight gains should be a pleasant pile,
not the whole planet. This retires the Conduit soft-cap idea — additive
production removes the cause instead of throttling the symptom.

## 1. The change in one line

Today every tier manufactures the tier below it for free, so flux/sec
compounds on its own (super-exponential; one night ≈ e20 flux/s). In v2
**every machine produces Flux directly and only Flux**. Your rate is the
sum of what you bought. The only self-growth left in the game is the AXIOM
auto-buyer (earned at 1 lifetime Axiom), and it must *pay full price* from
your Flux — so exponential costs govern it: overnight it ratchets a
handful of purchases, then stalls until you return. Cookie Clicker's
curve, exactly.

## 2. Production model

```
flux/s = Σ over unlocked tiers i of:
  bought_i × baseRate_i × milestone_i × tierMult_i
  × globalMultiplier × resonanceMultiplier
```

- `bought_i` — machines the player (or auto-buyer) purchased. The produced
  `amount` stockpiles are retired (see §6 migration).
- `milestone_i` — unchanged: ×1.5 per 25 bought of that tier.
- `tierMult_i` — the old "higher-tier production" multipliers repurposed:
  Core Protocol #3 (×1.3/level), the world `higherTier` effect, and the
  Phase Coil relic now multiply the *Flux output* of tier-2+ machines.
- `globalMultiplier` (upgrades, Axiom prestige, relays, world effects,
  research, colony legacies, cohesion, defense) and Resonance are
  unchanged — they are bought/earned, which is exactly what the new rule
  allows. Resonance and milestones already key off `bought`.
- Tiers still unlock one per world (Tap at Cold Wake … Horizon Forge at
  Vesper): each world's new machine is a big, *bought* rate jump — that
  replaces hypergrowth as the source of per-world scale.

## 3. The six machines (initial numbers)

Base costs and unlock thresholds are unchanged; growth flattens to the
proven 1.15; rates become direct Flux. Payback time of the first unit
lengthens tier over tier — that is the long-game curve.

| Tier | Machine | Cost (unchanged) | Growth | Flux/s each | First-unit payback |
|---|---|---|---|---|---|
| 1 | Vacuum Tap | 10 | 1.15 (was 1.17) | 1 | 10 s |
| 2 | Phase Coil | 500 | 1.15 (was 1.20) | 15 | 33 s |
| 3 | Harmonic Loom | 50K | 1.15 (was 1.23) | 350 | ~2.4 min |
| 4 | Orbit Array | 5M | 1.15 (was 1.27) | 9K | ~9 min |
| 5 | Axiom Engine | 200M | 1.15 (was 1.32) | 150K | ~22 min |
| 6 | Horizon Forge | 50B | 1.15 (was 1.38) | 15M | ~56 min |

1.15^25 ≈ ×33 price per 25 bought, offset by the ×1.5 milestone — the
buy cadence stays lively without ever running away. Descriptions get a
lore pass: each tier reaches a deeper stratum of the substrate ("Phase
Coil — holds a standing wave of phase pressure and bleeds it as Flux"),
keeping the ladder fantasy without machines minting machines.

## 4. Retuned sinks (initial values, simulator locks them)

| Knob | Today (hypergrowth) | v2 initial | Rationale |
|---|---|---|---|
| Contribution gates | 15K / 500K / 250M / 50B / 25T / 2Qa | 15K / 500K / 250M / 50B / **10T / 500T** | First four already sit at minutes-to-~1h under v2 rates; the last two come down to match linear accumulation |
| Recalibration threshold | runFlux 1e12 | **runFlux 25M** | First recal ~1-3 h into Pelagos, preserving today's cadence feel |
| Recalibration gain | (runFlux/1e12)^0.28 | (runFlux/25M)^**0.30** | Keeps lifetime Axioms in today's magnitude (~tens by Vesper) |
| Structural pricing scale | 100 × 60^(worlds−1) | unchanged to start | Per-world rates jump ~×20-60 from the new tier + multipliers; ×60 still tracks. Factor becomes tunable if the sim walls |

Everything else (berths, armory, equipment, crises, rescue Flux, conduit
none) keeps its formula — they all price off the structural scale.

## 5. Rules the simulator must prove before ship

1. Campaign completable start to finish by the standard bot AND a patient
   low-attention bot.
2. **No wall**: no required gate/purchase demanding more than ~8 hours of
   accumulation at the rate a player plausibly has when they reach it
   (final-world exceptions require owner sign-off).
3. Recal cadence lands 2–6 per world; Axiom totals within ~2× of today's.
4. Offline is linear: for any state, N hours offline == N hours online to
   within rounding (no compounding anywhere).
5. Report the full pacing table. There is NO upper time target anymore —
   long is the point (owner, July 13, 2026). The old 16.8-day baseline is
   retired.

## 6. Migration (live saves, incl. the owner's Cinder run)

- SAVE_VERSION 7 → 8. On load, `tiers[i].amount` (produced stockpiles) is
  set equal to `bought` — the free machines dissolve, production rebases
  to what was purchased. Owner-acknowledged: flux/s drops to a sane figure
  on update day; Axioms, crew, research, worlds, armory, colonies are
  untouched, and the next Recalibration lands the run fully on the new
  curve.
- No other save fields change. The offline loop simplifies (no inter-tier
  production step) but stays chunk-size independent.

## 7. Implementation order

1. game-engine: production snapshot rewrite (additive), remove inter-tier
   production from simulateGame, repurpose tierMult knobs, constants
   table (§3, §4), SAVE_VERSION 8 migration.
2. Lore/description pass on GENERATORS + Foundry UI copy (each tier row
   shows "+X Flux/s each" instead of "produces N Coils/s").
3. Tests: additivity (buying = exact rate delta), offline==online
   linearity, migration (amount := bought), milestone/resonance on bought,
   recal gain curve, gate reachability smoke test.
4. Simulator: retarget the bot's recal/gate policy, iterate §4 constants
   until §5 passes; publish the pacing table.
5. Manual + AI_HANDOFF economy sections; pacing philosophy updated to
   "long game, no walls".

## 8. Open questions for the owner

1. Gate initial values (§4) — happy to start there and let the sim tune?
2. After migration your current run's flux/s drops to your *bought*
   machines. OK to ship that directly to the live branch, or do you want
   it held until you next Recalibrate anyway?
3. Any tier you want to *feel* different from the table in §3 (e.g.
   Horizon Forge hitting harder)?
